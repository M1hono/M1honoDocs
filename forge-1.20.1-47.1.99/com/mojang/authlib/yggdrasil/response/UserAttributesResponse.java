package com.mojang.authlib.yggdrasil.response;

import javax.annotation.Nullable;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;

public class UserAttributesResponse extends Response {
    @Nullable
    private Privileges privileges;

    @Nullable
    private ProfanityFilterPreferences profanityFilterPreferences;

    @Nullable
    private BanStatus banStatus;

    @Nullable
    public Privileges getPrivileges() {
        return privileges;
    }

    @Nullable
    public ProfanityFilterPreferences getProfanityFilterPreferences() {
        return profanityFilterPreferences;
    }

    @Nullable
    public BanStatus getBanStatus() {
        return banStatus;
    }

    public static class Privileges {
        @Nullable
        private Privilege onlineChat;
        @Nullable
        private Privilege multiplayerServer;
        @Nullable
        private Privilege multiplayerRealms;
        @Nullable
        private Privilege telemetry;
        @Nullable
        private Privilege optionalTelemetry;

        public boolean getOnlineChat() {
            return onlineChat != null && onlineChat.enabled;
        }

        public boolean getMultiplayerServer() {
            return multiplayerServer != null && multiplayerServer.enabled;
        }

        public boolean getMultiplayerRealms() {
            return multiplayerRealms != null && multiplayerRealms.enabled;
        }

        public boolean getTelemetry() {
            return telemetry != null && telemetry.enabled;
        }

        public boolean getOptionalTelemetry() {
            return optionalTelemetry != null && optionalTelemetry.enabled;
        }

        public class Privilege {
            private boolean enabled;
        }
    }

    public static class ProfanityFilterPreferences {
        private boolean profanityFilterOn;

        public boolean isEnabled() {
            return profanityFilterOn;
        }
    }

    public static class BanStatus {
        private Map<String, BannedScope> bannedScopes;

        public Map<String, BannedScope> getBannedScopes() {
            return bannedScopes;
        }

        public static class BannedScope {
            private UUID banId;
            @Nullable
            private Instant expires;
            private String reason;
            @Nullable
            private String reasonMessage;

            public UUID getBanId() {
                return banId;
            }

            @Nullable
            public Instant getExpires() {
                return expires;
            }

            public String getReason() {
                return reason;
            }

            @Nullable
            public String getReasonMessage() {
                return reasonMessage;
            }
        }
    }
}
