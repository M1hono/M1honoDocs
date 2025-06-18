package dev.latvian.mods.kubejs.registry;

import dev.latvian.mods.kubejs.KubeJS;
import dev.latvian.mods.kubejs.event.StartupEventJS;
import dev.latvian.mods.kubejs.script.ScriptType;
import dev.latvian.mods.kubejs.util.UtilsJS;

import java.util.LinkedList;
import java.util.List;
import java.util.function.Supplier;

public class RegistryEventJS<T> extends StartupEventJS {
	private final RegistryInfo<T> registry;
	public final List<BuilderBase<? extends T>> created;

	public RegistryEventJS(RegistryInfo<T> r) {
		this.registry = r;
		this.created = new LinkedList<>();
	}

	public BuilderBase<? extends T> create(String id, String type) {
		var t = registry.types.get(type);

		if (t == null) {
			throw new IllegalArgumentException("Unknown type '" + type + "' for object '" + id + "'!");
		}

		var b = t.factory().createBuilder(UtilsJS.getMCID(ScriptType.STARTUP.manager.get().context, KubeJS.appendModId(id)));

		if (b == null) {
			throw new IllegalArgumentException("Unknown type '" + type + "' for object '" + id + "'!");
		} else {
			registry.addBuilder(b);
			created.add(b);
		}

		return b;
	}

	public BuilderBase<? extends T> create(String id) {
		var t = registry.getDefaultType();

		if (t == null) {
			throw new IllegalArgumentException("Registry for type '" + registry.key.location() + "' doesn't have any builders registered!");
		}

		var b = t.factory().createBuilder(UtilsJS.getMCID(ScriptType.STARTUP.manager.get().context, KubeJS.appendModId(id)));

		if (b == null) {
			throw new IllegalArgumentException("Unknown type '" + t.type() + "' for object '" + id + "'!");
		} else {
			registry.addBuilder(b);
			created.add(b);
		}

		return b;
	}

	@Deprecated
	public CustomBuilderObject custom(String id, Object object) {
		return createCustom(id, () -> object);
	}

	public CustomBuilderObject createCustom(String id, Supplier<Object> object) {
		if (object == null) {
			throw new IllegalArgumentException("Tried to register a null object with id: " + id);
		}
		var rl = UtilsJS.getMCID(ScriptType.STARTUP.manager.get().context, KubeJS.appendModId(id));

		var b = new CustomBuilderObject(rl, object, registry);
		registry.addBuilder(b);
		created.add(b);
		return b;
	}
}