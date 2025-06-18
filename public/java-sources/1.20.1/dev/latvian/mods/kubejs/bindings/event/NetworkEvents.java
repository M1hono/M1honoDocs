package dev.latvian.mods.kubejs.bindings.event;

import dev.latvian.mods.kubejs.event.EventGroup;
import dev.latvian.mods.kubejs.event.EventHandler;
import dev.latvian.mods.kubejs.event.Extra;
import dev.latvian.mods.kubejs.net.NetworkEventJS;

public interface NetworkEvents {
	EventGroup GROUP = EventGroup.of("NetworkEvents");
	EventHandler DATA_RECEIVED = GROUP.common("dataReceived", () -> NetworkEventJS.class).extra(Extra.REQUIRES_STRING).hasResult();
}
