package dev.latvian.mods.kubejs.bindings;

import com.google.gson.JsonElement;
import com.mojang.brigadier.StringReader;
import dev.latvian.mods.kubejs.registry.RegistryInfo;
import dev.latvian.mods.kubejs.typings.Info;
import dev.latvian.mods.kubejs.util.Lazy;
import dev.latvian.mods.kubejs.util.UtilsJS;
import dev.latvian.mods.kubejs.util.WrappedJS;
import dev.latvian.mods.rhino.mod.util.CountingMap;
import net.minecraft.Util;
import net.minecraft.core.particles.DustParticleOptions;
import net.minecraft.core.particles.ParticleOptions;
import net.minecraft.resources.ResourceKey;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.server.MinecraftServer;
import net.minecraft.sounds.SoundEvent;
import net.minecraft.stats.Stat;
import net.minecraft.stats.Stats;
import net.minecraft.world.entity.Entity;
import net.minecraft.world.item.CreativeModeTab;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.level.block.Blocks;
import net.minecraft.world.level.block.state.BlockState;
import org.jetbrains.annotations.Nullable;
import org.joml.Vector3f;

import java.util.ArrayList;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.concurrent.CompletableFuture;
import java.util.function.Supplier;
import java.util.regex.Pattern;

@Info("A collection of utilities")
public interface UtilsWrapper {
	DustParticleOptions ERROR_PARTICLE = new DustParticleOptions(new Vector3f(0F, 0F, 0F), 1F);

	@Info("Get the server. Null if there is no server (startup or client)")
	static MinecraftServer getServer() {
		return UtilsJS.staticServer;
	}

	@Info("Immediately run the passed runnable function in a try-catch block, and log the exception if it throws")
	static void queueIO(Runnable runnable) {
		UtilsJS.queueIO(runnable);
	}

	@Info("Get a Random, for generating random numbers. Note this will always return the same Random instance")
	static Random getRandom() {
		return UtilsJS.RANDOM;
	}

	@Info("Get a new random with the specified seed")
	static Random newRandom(long seed) {
		return new Random(seed);
	}

	@Info("Get an immutable empty list")
	static <T> List<T> emptyList() {
		return List.of();
	}

	@Info("Get an immutable empty map")
	static <K, V> Map<K, V> emptyMap() {
		return Map.of();
	}

	@Info("Returns a new mutable list")
	static List<?> newList() {
		return new ArrayList<>();
	}

	@Info("Returns a new mutable map")
	static Map<?, ?> newMap() {
		return new LinkedHashMap<>();
	}

	@Info("Returns a new counting map")
	static CountingMap newCountingMap() {
		return new CountingMap();
	}

	@Info("Returns a ResourceLocation with the specified namepsace and path")
	static ResourceLocation id(String namespace, String path) {
		return new ResourceLocation(namespace, path);
	}

	@Info("Typewraps the input string to a ResourceLocation. Format should be namespace:path")
	static ResourceLocation id(ResourceLocation id) {
		// TypeWrapper will convert any object into RL
		return id;
	}

	@Info("Returns a regex pattern of the input")
	static Pattern regex(Object s) {
		var pattern = UtilsJS.parseRegex(s);
		return pattern == null ? Pattern.compile(s.toString()) : pattern;
	}

	@Info("Returns a regex pattern of the input with the specified flags")
	static Pattern regex(String pattern, int flags) {
		return Pattern.compile(pattern, flags);
	}

	@Info("Tries to parse the first parameter as an integer, and returns that. The second parameter is returned if parsing fails")
	static int parseInt(@Nullable Object object, int def) {
		return UtilsJS.parseInt(object, def);
	}

	@Info("Tries to parse the first parameter as a double and returns that. The second parameter is returned if parsing fails")
	static double parseDouble(@Nullable Object object, double def) {
		return UtilsJS.parseDouble(object, def);
	}

	@Info("""
		Returns a Stat of the passed in ResourceLocation.
		Note that this requires the same ResourceLocation to get the same stat, so should not be used unless you want to make your own stat, and are storing an actual ResourceLocation somewhere to access it.
		""")
	static Stat<ResourceLocation> getStat(ResourceLocation id) {
		return Stats.CUSTOM.get(id);
	}

	@Nullable
	@Info("Gets a SoundEvent from the id")
	static SoundEvent getSound(ResourceLocation id) {
		return RegistryInfo.SOUND_EVENT.getValue(id);
	}

	@Info("Gets a random object from the list using the passed in random")
	static Object randomOf(Random random, Collection<Object> objects) {
		if (objects.isEmpty()) {
			return null;
		}

		if (objects instanceof List<?> list) {
			return list.get(random.nextInt(objects.size()));
		} else {
			return new ArrayList<>(objects).get(random.nextInt(objects.size()));
		}
	}

	@Info("Gets the current system time, in milliseconds")
	static long getSystemTime() {
		return System.currentTimeMillis();
	}

	@Info("Returns the results of rolling the specified loot table (it does not have to be a chest loot table)")
	static List<ItemStack> rollChestLoot(ResourceLocation id) {
		return rollChestLoot(id, null);
	}

	@Info("Returns the results of rolling the specified loot table with the entity as a parameter (it does not have to be a chest loot table)")
	static List<ItemStack> rollChestLoot(ResourceLocation id, @Nullable Entity entity) {
		return UtilsJS.rollChestLoot(id, entity);
	}

	@Nullable
	@Info("Returns a copy the object if possible, or the object itself if not")
	static Object copy(@Nullable Object o) {
		return UtilsJS.copy(o);
	}

	@Info("Checks if the passed in object is an instance of WrappedJS")
	static boolean isWrapped(@Nullable Object o) {
		return o instanceof WrappedJS;
	}

	@Info("Capitalises the first letter of the string unless it is \"a\", \"an\", \"the\", \"of\", \"on\", \"in\", \"and\", \"or\", \"but\" or \"for\"")
	static String toTitleCase(String s) {
		return UtilsJS.toTitleCase(s);
	}

	@Info("Capitalises the first letter of the string. If ignoreSpecial is true, it will also capitalise articles and prepositions")
	static String toTitleCase(String s, boolean ignoreSpecial) {
		return UtilsJS.toTitleCase(s, ignoreSpecial);
	}

	@Info("Gets the specified registry")
	static RegistryInfo<?> getRegistry(ResourceLocation id) {
		return RegistryInfo.of(ResourceKey.createRegistryKey(id));
	}

	@Info("Gets all ids from the registry with the specified id")
	static List<ResourceLocation> getRegistryIds(ResourceLocation id) {
		var entries = getRegistry(id).entrySet();
		var list = new ArrayList<ResourceLocation>(entries.size());

		for (var entry : entries) {
			list.add(entry.getKey().location());
		}

		return list;
	}

	@Info("Returns a lazy value with the supplier function as its value factory")
	static <T> Lazy<T> lazy(Supplier<T> supplier) {
		return Lazy.of(supplier);
	}

	@Info("Returns a lazy value with the supplier function as its value factory, that will expire after the specified number of milliseconds")
	static <T> Lazy<T> expiringLazy(Supplier<T> supplier, long time) {
		return Lazy.of(supplier, time);
	}

	@Nullable
	@Info("Returns the creative tab associated with the id")
	static CreativeModeTab findCreativeTab(ResourceLocation id) {
		return UtilsJS.findCreativeTab(id);
	}

	@Info("Runs the provided runnable function in KubeJS' background thread and returns its CompletableFuture")
	static CompletableFuture<Void> runAsync(Runnable task) {
		return CompletableFuture.runAsync(task, Util.backgroundExecutor());
	}

	@Info("Runs the provided supplier function in KubeJS' background thread and returns its CompletableFuture")
	static CompletableFuture<Object> supplyAsync(Supplier<Object> task) {
		return CompletableFuture.supplyAsync(task, Util.backgroundExecutor());
	}

	@Info("Returns the provided snake_case_string in camelCase")
	static String snakeCaseToCamelCase(String string) {
		return UtilsJS.snakeCaseToCamelCase(string);
	}

	@Info("Returns the provided snake_case_string in Title Case")
	static String snakeCaseToTitleCase(String string) {
		return UtilsJS.snakeCaseToTitleCase(string);
	}

	static ParticleOptions particleOptions(Object o) {
		if (o instanceof ParticleOptions po) {
			return po;
		} else if (o != null) {
			try {
				var reader = new StringReader(o instanceof JsonElement j ? j.getAsString() : o.toString());
				var particle = RegistryInfo.PARTICLE_TYPE.getValue(ResourceLocation.read(reader));
				return particle.getDeserializer().fromCommand(particle, reader);
			} catch (Exception ignored) {
			}
		}

		return ERROR_PARTICLE;
	}

	@Info("Parses a block state from the input string. May throw for invalid inputs!")
	static BlockState parseBlockState(Object o) {
		if (o instanceof BlockState bs) {
			return bs;
		}
		return o == null ? Blocks.AIR.defaultBlockState() : UtilsJS.parseBlockState(o.toString());
	}
}