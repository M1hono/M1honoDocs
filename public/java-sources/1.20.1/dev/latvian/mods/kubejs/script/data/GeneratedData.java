package dev.latvian.mods.kubejs.script.data;

import com.google.gson.JsonObject;
import dev.architectury.platform.Platform;
import dev.latvian.mods.kubejs.KubeJS;
import dev.latvian.mods.kubejs.util.Lazy;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.server.packs.resources.IoSupplier;
import org.jetbrains.annotations.NotNull;

import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;

public record GeneratedData(ResourceLocation id, Lazy<byte[]> data, boolean alwaysForget) implements IoSupplier<InputStream> {
	public static final GeneratedData INTERNAL_RELOAD = new GeneratedData(KubeJS.id("__internal.reload"), Lazy.of(() -> new byte[0]), false);

	public static final GeneratedData PACK_META = new GeneratedData(KubeJS.id("pack.mcmeta"), Lazy.of(() -> {
		var json = new JsonObject();
		var pack = new JsonObject();
		pack.addProperty("description", "KubeJS Pack");
		pack.addProperty("pack_format", 15);
		json.add("pack", pack);
		return json.toString().getBytes(StandardCharsets.UTF_8);
	}), false);

	public static final GeneratedData PACK_ICON = new GeneratedData(KubeJS.id("textures/kubejs_logo.png"), Lazy.of(() -> {
		try {
			return Files.readAllBytes(Platform.getMod(KubeJS.MOD_ID).findResource("assets", "kubejs", "textures", "kubejs_logo.png").get());
		} catch (Exception ex) {
			ex.printStackTrace();
			return new byte[0];
		}
	}), true);

	@Override
	@NotNull
	public InputStream get() {
		var in = new ByteArrayInputStream(data.get());

		if (alwaysForget) {
			data.forget();
		}

		return in;
	}

	@Override
	public int hashCode() {
		return id.hashCode();
	}

	@Override
	public boolean equals(Object obj) {
		return obj instanceof GeneratedData g && id.equals(g.id);
	}

	@Override
	public String toString() {
		return id.toString();
	}
}
