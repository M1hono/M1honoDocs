package com.mojang.authlib.minecraft.report;

import java.util.List;

public class ReportEvidence {
    public List<ReportChatMessage> messages;

    public ReportEvidence(final List<ReportChatMessage> messages) {
        this.messages = messages;
    }
}
