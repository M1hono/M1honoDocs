package com.mojang.authlib.yggdrasil;

import com.mojang.authlib.Agent;
import com.mojang.authlib.Environment;
import com.mojang.authlib.EnvironmentParser;
import com.mojang.authlib.GameProfileRepository;
import com.mojang.authlib.HttpAuthenticationService;
import com.mojang.authlib.UserAuthentication;
import com.mojang.authlib.exceptions.AuthenticationException;
import com.mojang.authlib.exceptions.AuthenticationUnavailableException;
import com.mojang.authlib.exceptions.InsufficientPrivilegesException;
import com.mojang.authlib.exceptions.InvalidCredentialsException;
import com.mojang.authlib.exceptions.MinecraftClientException;
import com.mojang.authlib.exceptions.UserBannedException;
import com.mojang.authlib.exceptions.UserMigratedException;
import com.mojang.authlib.minecraft.MinecraftSessionService;
import com.mojang.authlib.minecraft.UserApiService;
import com.mojang.authlib.minecraft.client.ObjectMapper;
import com.mojang.authlib.yggdrasil.response.Response;
import org.apache.commons.lang3.StringUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.annotation.Nullable;
import java.io.IOException;
import java.net.Proxy;
import java.net.URL;
import java.util.concurrent.CompletableFuture;

public class YggdrasilAuthenticationService extends HttpAuthenticationService {

    private static final Logger LOGGER = LoggerFactory.getLogger(YggdrasilAuthenticationService.class);

    @Nullable
    private final String clientToken;
    private final ObjectMapper objectMapper = ObjectMapper.create();
    private final Environment environment;
    private final ServicesKeySet servicesKeySet;

    public YggdrasilAuthenticationService(final Proxy proxy) {
        this(proxy, determineEnvironment());
    }

    public YggdrasilAuthenticationService(final Proxy proxy, final Environment environment) {
        this(proxy, null, environment);
    }

    public YggdrasilAuthenticationService(final Proxy proxy, @Nullable final String clientToken) {
        this(proxy, clientToken, determineEnvironment());
    }

    public YggdrasilAuthenticationService(final Proxy proxy, @Nullable final String clientToken, final Environment environment) {
        super(proxy);
        this.clientToken = clientToken;
        this.environment = environment;
        LOGGER.info("Environment: " + environment.asString());

        final URL publicKeySetUrl = HttpAuthenticationService.constantURL(environment.getServicesHost() + "/publickeys");
        servicesKeySet = YggdrasilServicesKeyInfo.get(publicKeySetUrl, this);
    }

    private static Environment determineEnvironment() {
        return EnvironmentParser
                   .getEnvironmentFromProperties()
                   .orElse(YggdrasilEnvironment.PROD.getEnvironment());
    }

    @Override
    public UserAuthentication createUserAuthentication(final Agent agent) {
        if (clientToken == null) {
            throw new IllegalStateException("Missing client token");
        }
        return new YggdrasilUserAuthentication(this, clientToken, agent, environment);
    }

    @Override
    public MinecraftSessionService createMinecraftSessionService() {
        return new YggdrasilMinecraftSessionService(this, environment);
    }

    @Override
    public GameProfileRepository createProfileRepository() {
        return new YggdrasilGameProfileRepository(this, environment);
    }

    public ServicesKeySet getServicesKeySet() {
        return servicesKeySet;
    }

    protected <T extends Response> T makeRequest(final URL url, final Object input, final Class<T> classOfT) throws AuthenticationException {
        return makeRequest(url, input, classOfT, null);
    }

    protected <T extends Response> T makeRequest(final URL url, final Object input, final Class<T> classOfT, @Nullable final String authentication) throws AuthenticationException {
        try {
            final String jsonResult = input == null ? performGetRequest(url, authentication) : performPostRequest(url, objectMapper.writeValueAsString(input), "application/json");
            final T result = objectMapper.readValue(jsonResult, classOfT);

            if (result == null) {
                return null;
            }

            if (StringUtils.isNotBlank(result.getError())) {
                if ("UserMigratedException".equals(result.getCause())) {
                    throw new UserMigratedException(result.getErrorMessage());
                } else if ("ForbiddenOperationException".equals(result.getError())) {
                    throw new InvalidCredentialsException(result.getErrorMessage());
                } else if ("InsufficientPrivilegesException".equals(result.getError())) {
                    throw new InsufficientPrivilegesException(result.getErrorMessage());
                } else if ("multiplayer.access.banned".equals(result.getError())) {
                    throw new UserBannedException();
                } else {
                    throw new AuthenticationException(result.getErrorMessage());
                }
            }

            return result;
        } catch (final IOException | IllegalStateException | MinecraftClientException e) {
            throw new AuthenticationUnavailableException("Cannot contact authentication server", e);
        }
    }

    public UserApiService createUserApiService(final String accessToken) throws AuthenticationException {
        return new YggdrasilUserApiService(accessToken, getProxy(), environment);
    }
}
