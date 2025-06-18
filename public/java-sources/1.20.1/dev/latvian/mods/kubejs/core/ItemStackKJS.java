package dev.latvian.mods.kubejs.core;

import com.google.gson.JsonObject;
import dev.latvian.mods.kubejs.item.ItemStackJS;
import dev.latvian.mods.kubejs.item.OutputItem;
import dev.latvian.mods.kubejs.level.BlockContainerJS;
import dev.latvian.mods.kubejs.platform.IngredientPlatformHelper;
import dev.latvian.mods.kubejs.registry.RegistryInfo;
import dev.latvian.mods.kubejs.util.ConsoleJS;
import dev.latvian.mods.kubejs.util.Tags;
import dev.latvian.mods.kubejs.util.UtilsJS;
import dev.latvian.mods.rhino.mod.util.JsonSerializable;
import dev.latvian.mods.rhino.mod.util.NBTSerializable;
import dev.latvian.mods.rhino.mod.util.NBTUtils;
import dev.latvian.mods.rhino.mod.util.NbtType;
import dev.latvian.mods.rhino.util.RemapForJS;
import dev.latvian.mods.rhino.util.RemapPrefixForJS;
import dev.latvian.mods.rhino.util.SpecialEquality;
import net.minecraft.nbt.CompoundTag;
import net.minecraft.nbt.StringTag;
import net.minecraft.network.chat.Component;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.tags.TagKey;
import net.minecraft.world.item.BlockItem;
import net.minecraft.world.item.EnchantedBookItem;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.item.Items;
import net.minecraft.world.item.crafting.Ingredient;
import net.minecraft.world.item.enchantment.Enchantment;
import net.minecraft.world.item.enchantment.EnchantmentHelper;
import net.minecraft.world.item.enchantment.EnchantmentInstance;
import net.minecraft.world.level.block.Blocks;
import org.apache.commons.lang3.tuple.Pair;
import org.jetbrains.annotations.Nullable;

import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

@SuppressWarnings("unused")
@RemapPrefixForJS("kjs$")
public interface ItemStackKJS extends SpecialEquality, NBTSerializable, JsonSerializable, IngredientSupplierKJS {
	default ItemStack kjs$self() {
		return (ItemStack) this;
	}

	@Override
	default boolean specialEquals(Object o, boolean shallow) {
		if (o instanceof CharSequence) {
			return kjs$getId().equals(UtilsJS.getID(o.toString()));
		} else if (o instanceof ItemStack s) {
			return kjs$equalsIgnoringCount(s);
		}

		return kjs$equalsIgnoringCount(ItemStackJS.of(o));
	}

	default boolean kjs$equalsIgnoringCount(ItemStack stack) {
		var self = kjs$self();

		if (self == stack) {
			return true;
		} else if (self.isEmpty()) {
			return stack.isEmpty();
		}

		return ItemStack.isSameItemSameTags(self, stack);
	}

	default ResourceLocation kjs$getIdLocation() {
		return kjs$self().getItem().kjs$getIdLocation();
	}

	default String kjs$getId() {
		return kjs$self().getItem().kjs$getId();
	}

	default Collection<ResourceLocation> kjs$getTags() {
		return Tags.byItem(kjs$self().getItem()).map(TagKey::location).collect(Collectors.toSet());
	}

	default boolean kjs$hasTag(ResourceLocation tag) {
		return kjs$self().is(Tags.item(tag));
	}

	default boolean kjs$isBlock() {
		return kjs$self().getItem() instanceof BlockItem;
	}

	default ItemStack kjs$withCount(int c) {
		if (c <= 0 || kjs$self().isEmpty()) {
			return ItemStack.EMPTY;
		}

		var is = kjs$self().copy();
		is.setCount(c);
		return is;
	}

	default void kjs$removeTag() {
		kjs$self().setTag(null);
	}

	default String kjs$getNbtString() {
		return String.valueOf(kjs$self().getTag());
	}

	default ItemStack kjs$withNBT(CompoundTag nbt) {
		var is = kjs$self().copy();
		var tag0 = is.getTag();

		if (tag0 == null) {
			is.setTag(nbt);
		} else {
			is.setTag(tag0.merge(nbt));
		}

		return is;
	}

	default ItemStack kjs$withName(@Nullable Component displayName) {
		var is = kjs$self().copy();

		if (displayName != null) {
			is.setHoverName(displayName);
		} else {
			is.resetHoverName();
		}

		return is;
	}

	default Map<String, Integer> kjs$getEnchantments() {
		var map = new HashMap<String, Integer>();

		for (var entry : EnchantmentHelper.getEnchantments(kjs$self()).entrySet()) {
			var id = RegistryInfo.ENCHANTMENT.getId(entry.getKey());

			if (id != null) {
				map.put(id.toString(), entry.getValue());
			}
		}

		return map;
	}

	default boolean kjs$hasEnchantment(Enchantment enchantment, int level) {
		return EnchantmentHelper.getItemEnchantmentLevel(enchantment, kjs$self()) >= level;
	}

	@RemapForJS("enchant")
	default ItemStack kjs$enchantCopy(Map<?, ?> enchantments) {
		var is = kjs$self();

		for (var entry : enchantments.entrySet()) {
			var enchantment = RegistryInfo.ENCHANTMENT.getValue(UtilsJS.getMCID(null, entry.getKey()));

			if (enchantment != null && entry.getValue() instanceof Number number) {
				is = is.kjs$enchantCopy(enchantment, number.intValue());
			}
		}

		return is;
	}

	@RemapForJS("enchant")
	default ItemStack kjs$enchantCopy(Enchantment enchantment, int level) {
		var is = kjs$self().copy();

		if (is.getItem() == Items.ENCHANTED_BOOK) {
			EnchantedBookItem.addEnchantment(is, new EnchantmentInstance(enchantment, level));
		} else {
			is.enchant(enchantment, level);
		}

		return is;
	}

	default String kjs$getMod() {
		return kjs$self().getItem().kjs$getMod();
	}

	@Deprecated
	default Ingredient kjs$ignoreNBT() {
		var console = ConsoleJS.getCurrent(ConsoleJS.SERVER);
		console.warn("You don't need to call .ignoreNBT() anymore, all item ingredients ignore NBT by default!");
		return kjs$self().getItem().kjs$asIngredient();
	}

	default Ingredient kjs$weakNBT() {
		return IngredientPlatformHelper.get().weakNBT(kjs$self());
	}

	default Ingredient kjs$strongNBT() {
		return IngredientPlatformHelper.get().strongNBT(kjs$self());
	}

	default boolean kjs$areItemsEqual(ItemStack other) {
		return kjs$self().getItem() == other.getItem();
	}

	default boolean kjs$isNBTEqual(ItemStack other) {
		if (kjs$self().hasTag() == other.hasTag()) {
			var nbt = kjs$self().getTag();
			var nbt2 = other.getTag();
			return Objects.equals(nbt, nbt2);
		}

		return false;
	}

	default float kjs$getHarvestSpeed(@Nullable BlockContainerJS block) {
		return kjs$self().getDestroySpeed(block == null ? Blocks.AIR.defaultBlockState() : block.getBlockState());
	}

	default float kjs$getHarvestSpeed() {
		return kjs$getHarvestSpeed(null);
	}

	@Override
	@RemapForJS("toNBT")
	default CompoundTag toNBTJS() {
		return kjs$self().save(new CompoundTag());
	}

	/* default String kjs$getCreativeTab() {
		var cat = kjs$self().getItem().getItemCategory();
		return cat == null ? "" : cat.getRecipeFolderName();
	}*/

	default CompoundTag kjs$getTypeData() {
		return kjs$self().getItem().kjs$getTypeData();
	}

	default String kjs$toItemString() {
		var is = kjs$self();

		var builder = new StringBuilder();

		var count = is.getCount();
		var hasNbt = is.hasTag();

		if (count > 1 && !hasNbt) {
			builder.append('\'');
			builder.append(count);
			builder.append("x ");
			builder.append(kjs$getId());
			builder.append('\'');
		} else if (hasNbt) {
			builder.append("Item.of('");
			builder.append(is.kjs$getId());
			builder.append('\'');
			List<Pair<String, Integer>> enchants = null;

			if (count > 1) {
				builder.append(", ");
				builder.append(count);
			}

			var t = is.getTag();

			if (t != null && !t.isEmpty()) {
				var key = is.getItem() == Items.ENCHANTED_BOOK ? "StoredEnchantments" : "Enchantments";

				if (t.contains(key, NbtType.LIST)) {
					var l = t.getList(key, NbtType.COMPOUND);
					enchants = new ArrayList<>(l.size());

					for (var i = 0; i < l.size(); i++) {
						var t1 = l.getCompound(i);
						enchants.add(Pair.of(t1.getString("id"), t1.getInt("lvl")));
					}

					t = t.copy();
					t.remove(key);

					if (t.isEmpty()) {
						t = null;
					}
				}
			}

			if (t != null) {
				builder.append(", ");
				NBTUtils.quoteAndEscapeForJS(builder, t.toString());
			}

			builder.append(')');

			if (enchants != null) {
				for (var e : enchants) {
					builder.append(".enchant('");
					builder.append(e.getKey());
					builder.append("', ");
					builder.append(e.getValue());
					builder.append(')');
				}
			}
		} else {
			builder.append('\'');
			builder.append(kjs$getId());
			builder.append('\'');
		}

		return builder.toString();
	}

	@Override
	default Ingredient kjs$asIngredient() {
		return kjs$self().getItem().kjs$asIngredient();
	}

	@Override
	default JsonObject toJsonJS() {
		var json = new JsonObject();
		json.addProperty("item", kjs$getId());
		json.addProperty("count", kjs$self().getCount());
		var tag = kjs$self().getTag();

		if (tag != null) {
			json.addProperty("nbt", tag.toString());
		}

		return json;
	}

	default OutputItem kjs$withChance(double chance) {
		return OutputItem.of(kjs$self(), chance);
	}

	default ItemStack kjs$withLore(Component[] text) {
		var is = kjs$self().copy();

		if (text.length > 0) {
			var tag = is.getOrCreateTag();
			var display = tag.getCompound("display");
			var lore = display.getList("Lore", NbtType.STRING);

			for (var t : text) {
				lore.add(StringTag.valueOf(Component.Serializer.toJson(t)));
			}

			display.put("Lore", lore);
			tag.put("display", display);
		}

		return is;
	}
}
