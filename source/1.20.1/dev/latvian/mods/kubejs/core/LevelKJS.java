package dev.latvian.mods.kubejs.core;

import dev.latvian.mods.kubejs.level.BlockContainerJS;
import dev.latvian.mods.kubejs.level.ExplosionJS;
import dev.latvian.mods.kubejs.level.FireworksJS;
import dev.latvian.mods.kubejs.player.EntityArrayList;
import dev.latvian.mods.kubejs.script.ScriptType;
import dev.latvian.mods.kubejs.script.ScriptTypeHolder;
import dev.latvian.mods.rhino.util.RemapForJS;
import dev.latvian.mods.rhino.util.RemapPrefixForJS;
import net.minecraft.core.BlockPos;
import net.minecraft.core.particles.ParticleOptions;
import net.minecraft.network.chat.Component;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.world.entity.Entity;
import net.minecraft.world.entity.EntityType;
import net.minecraft.world.level.Level;
import net.minecraft.world.level.block.entity.BlockEntity;
import net.minecraft.world.phys.AABB;
import org.jetbrains.annotations.Nullable;

import java.util.Collection;

@RemapPrefixForJS("kjs$")
public interface LevelKJS extends WithAttachedData<Level>, ScriptTypeHolder {
	default Level kjs$self() {
		return (Level) this;
	}

	@Override
	@RemapForJS("getSide")
	default ScriptType kjs$getScriptType() {
		throw new NoMixinException();
	}

	@Override
	default Component kjs$getName() {
		return Component.literal(kjs$getDimension().toString());
	}

	@Override
	default void kjs$tell(Component message) {
		for (var entity : kjs$self().players()) {
			entity.kjs$tell(message);
		}
	}

	@Override
	default void kjs$setStatusMessage(Component message) {
		for (var entity : kjs$self().players()) {
			entity.kjs$setStatusMessage(message);
		}
	}

	@Override
	default int kjs$runCommand(String command) {
		var m = 0;

		for (var entity : kjs$self().players()) {
			m = Math.max(m, entity.kjs$runCommand(command));
		}

		return m;
	}

	@Override
	default int kjs$runCommandSilent(String command) {
		var m = 0;

		for (var entity : kjs$self().players()) {
			m = Math.max(m, entity.kjs$runCommandSilent(command));
		}

		return m;
	}

	default ResourceLocation kjs$getDimension() {
		return kjs$self().dimension().location();
	}

	default boolean kjs$isOverworld() {
		return kjs$self().dimension() == Level.OVERWORLD;
	}

	default BlockContainerJS kjs$getBlock(int x, int y, int z) {
		return kjs$getBlock(new BlockPos(x, y, z));
	}

	default BlockContainerJS kjs$getBlock(BlockPos pos) {
		return new BlockContainerJS(kjs$self(), pos);
	}

	default BlockContainerJS kjs$getBlock(BlockEntity blockEntity) {
		return new BlockContainerJS(blockEntity);
	}

	default EntityArrayList kjs$createEntityList(Collection<? extends Entity> entities) {
		return new EntityArrayList(kjs$self(), entities);
	}

	default EntityArrayList kjs$getPlayers() {
		return kjs$createEntityList(kjs$self().players());
	}

	default EntityArrayList kjs$getEntities() {
		return new EntityArrayList(kjs$self(), 0);
	}

	default ExplosionJS kjs$createExplosion(double x, double y, double z) {
		return new ExplosionJS(kjs$self(), x, y, z);
	}

	@Nullable
	default Entity kjs$createEntity(EntityType<?> type) {
		return type.create(kjs$self());
	}

	default void kjs$spawnFireworks(double x, double y, double z, FireworksJS f) {
		kjs$self().addFreshEntity(f.createFireworkRocket(kjs$self(), x, y, z));
	}

	default EntityArrayList kjs$getEntitiesWithin(AABB aabb) {
		return new EntityArrayList(kjs$self(), kjs$self().getEntities(null, aabb));
	}

	default void kjs$spawnParticles(ParticleOptions options, boolean overrideLimiter, double x, double y, double z, double vx, double vy, double vz, int count, double speed) {
	}
}
