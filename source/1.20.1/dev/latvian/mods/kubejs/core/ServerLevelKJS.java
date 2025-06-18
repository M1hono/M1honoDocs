package dev.latvian.mods.kubejs.core;

import dev.latvian.mods.kubejs.player.EntityArrayList;
import dev.latvian.mods.kubejs.script.ScriptType;
import dev.latvian.mods.rhino.util.RemapPrefixForJS;
import net.minecraft.core.particles.ParticleOptions;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.world.entity.EntityType;
import net.minecraft.world.level.storage.ServerLevelData;
import org.jetbrains.annotations.Nullable;

@RemapPrefixForJS("kjs$")
public interface ServerLevelKJS extends LevelKJS, WithPersistentData {
	@Override
	default ServerLevel kjs$self() {
		return (ServerLevel) this;
	}

	@Override
	default ScriptType kjs$getScriptType() {
		return ScriptType.SERVER;
	}

	@Override
	default EntityArrayList kjs$getEntities() {
		return new EntityArrayList(kjs$self(), kjs$self().getAllEntities());
	}

	default void kjs$spawnLightning(double x, double y, double z, boolean effectOnly, @Nullable ServerPlayer player) {
		var e = EntityType.LIGHTNING_BOLT.create(kjs$self());
		e.moveTo(x, y, z);
		e.setCause(player);
		e.setVisualOnly(effectOnly);
		kjs$self().addFreshEntity(e);
	}

	default void kjs$spawnLightning(double x, double y, double z, boolean effectOnly) {
		kjs$spawnLightning(x, y, z, effectOnly, null);
	}

	default void kjs$setTime(long time) {
		((ServerLevelData) kjs$self().getLevelData()).setGameTime(time);
	}

	@Override
	default void kjs$spawnParticles(ParticleOptions options, boolean overrideLimiter, double x, double y, double z, double vx, double vy, double vz, int count, double speed) {
		for (var player : kjs$self().players()) {
			kjs$self().sendParticles(player, options, overrideLimiter, x, y, z, count, vx, vy, vz, speed);
		}
	}
}
