package com.mojang.authlib.minecraft.report;

import java.nio.ByteBuffer;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public class ReportChatMessage {
    public int index;
    public UUID profileId;
    public UUID sessionId;
    public Instant timestamp;
    public long salt;
    public List<ByteBuffer> lastSeen;
    public String message;
    public ByteBuffer signature;
    public boolean messageReported;

    public ReportChatMessage(final int index, final UUID profileId, final UUID sessionId, final Instant timestamp, final long salt, final List<ByteBuffer> lastSeen, final String message, final ByteBuffer signature, final boolean messageReported) {
        this.index = index;
        this.profileId = profileId;
        this.sessionId = sessionId;
        this.timestamp = timestamp;
        this.salt = salt;
        this.lastSeen = lastSeen;
        this.message = message;
        this.signature = signature;
        this.messageReported = messageReported;
    }
}
