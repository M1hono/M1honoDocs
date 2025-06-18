package dev.latvian.mods.kubejs.level.gen;

import com.google.common.collect.Iterables;
import dev.architectury.registry.level.biome.BiomeModifications;
import dev.latvian.mods.kubejs.event.StartupEventJS;
import dev.latvian.mods.kubejs.level.gen.filter.biome.BiomeFilter;
import dev.latvian.mods.kubejs.level.gen.properties.AddLakeProperties;
import dev.latvian.mods.kubejs.level.gen.properties.AddOreProperties;
import dev.latvian.mods.kubejs.level.gen.properties.AddSpawnProperties;
import dev.latvian.mods.kubejs.registry.RegistryInfo;
import dev.latvian.mods.kubejs.util.ClassWrapper;
import dev.latvian.mods.kubejs.util.ConsoleJS;
import dev.latvian.mods.kubejs.util.UtilsJS;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.world.entity.EntityType;
import net.minecraft.world.entity.MobCategory;
import net.minecraft.world.level.biome.MobSpawnSettings;
import net.minecraft.world.level.block.Blocks;
import net.minecraft.world.level.levelgen.GenerationStep;
import net.minecraft.world.level.levelgen.VerticalAnchor;
import net.minecraft.world.level.levelgen.feature.ConfiguredFeature;
import net.minecraft.world.level.levelgen.feature.Feature;
import net.minecraft.world.level.levelgen.feature.LakeFeature;
import net.minecraft.world.level.levelgen.feature.configurations.OreConfiguration;
import net.minecraft.world.level.levelgen.feature.stateproviders.BlockStateProvider;
import net.minecraft.world.level.levelgen.placement.CountPlacement;
import net.minecraft.world.level.levelgen.placement.InSquarePlacement;
import net.minecraft.world.level.levelgen.placement.PlacedFeature;
import net.minecraft.world.level.levelgen.placement.PlacementModifier;
import net.minecraft.world.level.levelgen.placement.RarityFilter;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Objects;
import java.util.function.Consumer;
import java.util.regex.Pattern;

public class AddWorldgenEventJS extends StartupEventJS {
	private static final Pattern SPAWN_PATTERN = Pattern.compile("(\\w+:\\w+)\\*\\((\\d+)-(\\d+)\\):(\\d+)");

	public final ClassWrapper<VerticalAnchor> anchors = new ClassWrapper<>(VerticalAnchor.class);

	// TODO: we should probably not be registering to BuiltinRegistries directly,
	//  but rather to the synced registry directly by using the RegistryAccess.
	// FIXME: oh really, we shouldn't?! ... (just use JSON at this point, there's no way we'll
	//  have access to a writable RegistryAccess anytime soon)
	/*
	private static <T> Holder<T> registerFeature(Registry<T> registry, ResourceLocation id, T object) {
		var key = ResourceKey.create(registry.key(), id);
		return ((WritableRegistry<T>) registry).registerOrOverride(OptionalInt.empty(), key, object, Lifecycle.experimental());
	}
	 */

	private void addFeature(ResourceLocation id, BiomeFilter filter, GenerationStep.Decoration step,
							ConfiguredFeature<?, ?> feature, List<PlacementModifier> modifiers) {
		if (id == null) {
			id = new ResourceLocation("kubejs:features/" + UtilsJS.getUniqueId(feature, ConfiguredFeature.DIRECT_CODEC));
		}

		ConsoleJS.STARTUP.error("WorldgenEvents.add() is currently not supported in 1.20 yet! This will be fixed soon, but for now we recommend you comment out worldgen code. Sorry for inconvenience!");

		/*
		var holder = registerFeature(BuiltinRegistries.CONFIGURED_FEATURE, id, feature);
		var placed = new PlacedFeature(holder, modifiers);

		addFeature(id, filter, step, placed);
		 */
	}

	private void addFeature(ResourceLocation id, BiomeFilter filter, GenerationStep.Decoration step, PlacedFeature feature) {
		if (id == null) {
			id = new ResourceLocation("kubejs:features/" + UtilsJS.getUniqueId(feature, PlacedFeature.DIRECT_CODEC));
		}

		/*
		var holder = registerFeature(BuiltinRegistries.PLACED_FEATURE, id, feature);

		BiomeModifications.postProcessProperties(filter, (ctx, props) -> props.getGenerationProperties().addFeature(step, holder));
		 */
	}

	private void addEntitySpawn(BiomeFilter filter, MobCategory category, MobSpawnSettings.SpawnerData spawnerData) {
		BiomeModifications.postProcessProperties(filter, (ctx, props) -> props.getSpawnProperties().addSpawn(category, spawnerData));
	}

	public void addOre(Consumer<AddOreProperties> p) {
		if (true) {
			ConsoleJS.STARTUP.error("WorldgenEvents.add() is currently not supported in 1.20 yet! This will be fixed soon, but for now we recommend you comment out worldgen code. Sorry for inconvenience!");
			return;
		}

		var properties = new AddOreProperties();
		p.accept(properties);

		if (properties.targets.isEmpty()) {
			return;
		}

		var oreFeature = new ConfiguredFeature<>(Feature.ORE, new OreConfiguration(properties.targets, properties.size, properties.noSurface));

		var modifiers = new ArrayList<PlacementModifier>();

		if (properties.count.getMaxValue() > 1) {
			modifiers.add(CountPlacement.of(properties.count));
		}

		if (properties.chance > 0) {
			modifiers.add(RarityFilter.onAverageOnceEvery(properties.chance));
		}

		if (properties.squared) {
			modifiers.add(InSquarePlacement.spread());
		}

		modifiers.add(properties.height);

		addFeature(properties.id, properties.biomes, properties.worldgenLayer, oreFeature, modifiers);
	}

	public void addLake(Consumer<AddLakeProperties> p) {
		if (true) {
			ConsoleJS.STARTUP.error("WorldgenEvents.add() is currently not supported in 1.20 yet! This will be fixed soon, but for now we recommend you comment out worldgen code. Sorry for inconvenience!");
			return;
		}

		var properties = new AddLakeProperties();
		p.accept(properties);

		var fluid = Iterables.getFirst(properties.fluid.getBlockStates(), Blocks.AIR.defaultBlockState());
		if (fluid == null || fluid.isAir()) {
			return;
		}

		var barrier = Iterables.getFirst(properties.barrier.getBlockStates(), Blocks.AIR.defaultBlockState());
		if (barrier == null || barrier.isAir()) {
			return;
		}

		addFeature(properties.id, properties.biomes, properties.worldgenLayer,
			new ConfiguredFeature<>(Feature.LAKE, new LakeFeature.Configuration(BlockStateProvider.simple(fluid), BlockStateProvider.simple(barrier))),
			properties.chance > 0 ? Collections.singletonList(RarityFilter.onAverageOnceEvery(properties.chance)) : List.of());
	}

	public void addSpawn(Consumer<AddSpawnProperties> p) {
		var properties = new AddSpawnProperties();
		p.accept(properties);

		if (properties._entity == null || properties._category == null) {
			return;
		}

		addEntitySpawn(properties.biomes, properties._category, new MobSpawnSettings.SpawnerData(properties._entity, properties.weight, properties.minCount, properties.maxCount));
	}

	public void addSpawn(BiomeFilter filter, MobCategory category, String spawn) {
		var matcher = SPAWN_PATTERN.matcher(spawn);

		if (matcher.matches()) {
			try {
				var entity = Objects.requireNonNull(RegistryInfo.ENTITY_TYPE.getValue(new ResourceLocation(matcher.group(1))));
				var weight = Integer.parseInt(matcher.group(4));
				var min = Integer.parseInt(matcher.group(2));
				var max = Integer.parseInt(matcher.group(3));
				addEntitySpawn(filter, category, new MobSpawnSettings.SpawnerData((EntityType<?>) entity, weight, min, max));
			} catch (Exception ex) {
				ConsoleJS.STARTUP.info("Failed to add spawn: " + ex);
			}
		} else {
			ConsoleJS.STARTUP.info("Invalid spawn syntax! Must be mod:entity_type*(minCount-maxCount):weight");
		}

		//minecraft:ghast*(4-4):50
	}

	public void addSpawn(MobCategory category, String spawn) {
		addSpawn(BiomeFilter.ALWAYS_TRUE, category, spawn);
	}
}