package com.mojang.authlib.yggdrasil.request;

import com.google.gson.JsonObject;

import java.time.Instant;
import java.util.List;

public class TelemetryEventsRequest {
    public final List<Event> events;

    public TelemetryEventsRequest(final List<Event> events) {
        this.events = events;
    }

    public static class Event {
        public final String source;
        public final String name;
        public final long timestamp;
        public final JsonObject data;

        public Event(final String source, final String name, final Instant timestamp, final JsonObject data) {
            this.source = source;
            this.name = name;
            this.timestamp = timestamp.getEpochSecond();
            this.data = data;
        }
    }
}
