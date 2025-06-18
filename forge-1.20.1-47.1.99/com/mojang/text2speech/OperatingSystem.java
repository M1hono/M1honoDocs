package com.mojang.text2speech;

import javax.annotation.Nullable;
import java.util.Locale;

public enum OperatingSystem {
    LINUX("linux"),
    WINDOWS("win"),
    MAC_OS("mac"),
    UNSUPPORTED(null),
    ;

    @Nullable
    private final String detectWith;

    OperatingSystem(@Nullable final String detectWith) {
        this.detectWith = detectWith;
    }

    public static OperatingSystem get() {
        final String test = System.getProperty("os.name").toLowerCase(Locale.ROOT);
        for (OperatingSystem value : values()) {
            if (value.detectWith == null) {
                continue;
            }

            if (test.contains(value.detectWith)) {
                return value;
            }
        }
        return UNSUPPORTED;
    }
}
