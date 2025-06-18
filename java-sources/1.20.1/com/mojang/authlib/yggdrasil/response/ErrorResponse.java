package com.mojang.authlib.yggdrasil.response;

import java.util.Map;
import java.util.StringJoiner;

/**
 * Error entity returned by all Minecraft.net services (As well as Yggdrasil services)
 *
 */
public class ErrorResponse {

    private final String path;
    private final String error;
    private final String errorMessage;
    private final Map<String, Object> details;

    public ErrorResponse(
        final String path,
        final String error,
        final String errorMessage,
        final Map<String, Object> details
    ) {
        this.path = path;
        this.error = error;
        this.errorMessage = errorMessage;
        this.details = details;
    }

    public String getPath() {
        return path;
    }

    public String getError() {
        return error;
    }

    public Map<String, Object> getDetails() {
        return details;
    }

    public String getErrorMessage() {
        return errorMessage;
    }

    @Override
    public String toString() {
        return new StringJoiner(", ", ErrorResponse.class.getSimpleName() + "[", "]")
                   .add("path='" + path + "'")
                   .add("error='" + error + "'")
                   .add("details=" + details)
                   .add("errorMessage='" + errorMessage + "'")
                   .toString();
    }
}
