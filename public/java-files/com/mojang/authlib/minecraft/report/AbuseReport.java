package com.mojang.authlib.minecraft.report;

import java.time.Instant;

public class AbuseReport {
    public String opinionComments;
    public String reason;
    public ReportEvidence evidence;
    public ReportedEntity reportedEntity;
    public Instant createdTime;

    public AbuseReport(final String opinionComments, final String reason, final ReportEvidence evidence, final ReportedEntity reportedEntity, final Instant createdTime) {
        this.opinionComments = opinionComments;
        this.reason = reason;
        this.evidence = evidence;
        this.reportedEntity = reportedEntity;
        this.createdTime = createdTime;
    }
}
