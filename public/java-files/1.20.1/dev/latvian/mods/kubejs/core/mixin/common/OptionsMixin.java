package dev.latvian.mods.kubejs.core.mixin.common;

import dev.latvian.mods.kubejs.client.KubeJSClient;
import net.minecraft.client.Options;
import org.spongepowered.asm.mixin.Final;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.Shadow;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

import java.io.File;

@Mixin(Options.class)
public class OptionsMixin {
	@Shadow
	@Final
	private File optionsFile;

	@Inject(method = "load", at = @At("HEAD"))
	private void loadKJS(CallbackInfo ci) {
		KubeJSClient.copyDefaultOptionsFile(optionsFile);
	}
}
