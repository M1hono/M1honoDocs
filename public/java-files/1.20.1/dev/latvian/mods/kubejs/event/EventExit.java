package dev.latvian.mods.kubejs.event;

public class EventExit extends Exception {
	public final EventResult result;

	public EventExit(EventResult result) {
		super("result", null, false, false);
		this.result = result;
	}
}
