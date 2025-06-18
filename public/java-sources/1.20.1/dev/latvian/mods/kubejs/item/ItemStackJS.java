package dev.latvian.mods.kubejs.item;

import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import dev.latvian.mods.kubejs.platform.IngredientPlatformHelper;
import dev.latvian.mods.kubejs.recipe.RecipeExceptionJS;
import dev.latvian.mods.kubejs.recipe.RecipeJS;
import dev.latvian.mods.kubejs.registry.RegistryInfo;
import dev.latvian.mods.kubejs.util.Lazy;
import dev.latvian.mods.kubejs.util.MapJS;
import dev.latvian.mods.kubejs.util.UtilsJS;
import dev.latvian.mods.rhino.Context;
import dev.latvian.mods.rhino.Wrapper;
import dev.latvian.mods.rhino.mod.util.NBTUtils;
import dev.latvian.mods.rhino.regexp.NativeRegExp;
import net.minecraft.nbt.StringTag;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.world.item.CreativeModeTabs;
import net.minecraft.world.item.Item;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.item.ItemStackLinkedSet;
import net.minecraft.world.item.Items;
import net.minecraft.world.item.crafting.Ingredient;
import net.minecraft.world.level.ItemLike;
import org.jetbrains.annotations.Nullable;

import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;

public interface ItemStackJS {
	Map<String, ItemStack> PARSE_CACHE = new HashMap<>();
	ItemStack[] EMPTY_ARRAY = new ItemStack[0];

	Lazy<List<String>> CACHED_ITEM_TYPE_LIST = Lazy.of(() -> {
		var cachedItemTypeList = new ArrayList<String>();

		for (var entry : RegistryInfo.ITEM.entrySet()) {
			cachedItemTypeList.add(entry.getKey().location().toString());
		}

		return cachedItemTypeList;
	});

	Lazy<Map<ResourceLocation, Collection<ItemStack>>> CACHED_ITEM_MAP = Lazy.of(() -> {
		var map = new HashMap<ResourceLocation, Collection<ItemStack>>();
		var stackList = ItemStackLinkedSet.createTypeAndTagSet();

		stackList.addAll(CreativeModeTabs.searchTab().getDisplayItems());

		for (var stack : stackList) {
			if (!stack.isEmpty()) {
				map.computeIfAbsent(
					stack.getItem().kjs$getIdLocation(),
					_rl -> ItemStackLinkedSet.createTypeAndTagSet()
				).add(stack.kjs$withCount(1));
			}
		}

		for (var itemId : CACHED_ITEM_TYPE_LIST.get()) {
			var itemRl = new ResourceLocation(itemId);
			map.computeIfAbsent(itemRl, id -> Set.of(RegistryInfo.ITEM.getValue(id).getDefaultInstance()));
		}

		return map;
	});

	Lazy<List<ItemStack>> CACHED_ITEM_LIST = Lazy.of(() -> CACHED_ITEM_MAP.get().values().stream().flatMap(Collection::stream).toList());

	static ItemStack of(@Nullable Object o) {
		if (o instanceof Wrapper w) {
			o = w.unwrap();
		}

		if (o == null || o == ItemStack.EMPTY || o == Items.AIR) {
			return ItemStack.EMPTY;
		} else if (o instanceof ItemStack stack) {
			return stack.isEmpty() ? ItemStack.EMPTY : stack;
		} else if (o instanceof OutputItem out) {
			return out.item;
		} else if (o instanceof Ingredient ingr) {
			return ingr.kjs$getFirst();
		} else if (o instanceof ResourceLocation id) {
			var item = RegistryInfo.ITEM.getValue(id);

			if (item == null || item == Items.AIR) {
				if (RecipeJS.itemErrors) {
					throw new RecipeExceptionJS("Item '" + id + "' not found!").error();
				}

				return ItemStack.EMPTY;
			}

			return item.getDefaultInstance();
		} else if (o instanceof ItemLike itemLike) {
			return new ItemStack(itemLike.asItem());
		} else if (o instanceof JsonElement json) {
			return resultFromRecipeJson(json);
		} else if (o instanceof StringTag tag) {
			return of(tag.getAsString());
		} else if (o instanceof Pattern || o instanceof NativeRegExp) {
			var reg = UtilsJS.parseRegex(o);

			if (reg != null) {
				return IngredientPlatformHelper.get().regex(reg).kjs$getFirst();
			}

			return ItemStack.EMPTY;
		} else if (o instanceof CharSequence) {
			var os = o.toString().trim();
			var s = os;

			var cached = PARSE_CACHE.get(os);

			if (cached != null) {
				return cached.isEmpty() ? ItemStack.EMPTY : cached.copy();
			}

			var count = 1;
			var spaceIndex = s.indexOf(' ');

			if (spaceIndex >= 2 && s.indexOf('x') == spaceIndex - 1) {
				count = Integer.parseInt(s.substring(0, spaceIndex - 1));
				s = s.substring(spaceIndex + 1);
			}

			cached = parse(s);
			cached.setCount(count);
			PARSE_CACHE.put(os, cached);
			return cached.copy();
		}

		var map = MapJS.of(o);

		if (map != null) {
			if (map.containsKey("item")) {
				var id = UtilsJS.getMCID(null, map.get("item").toString());
				var item = RegistryInfo.ITEM.getValue(id);

				if (item == Items.AIR) {
					if (RecipeJS.itemErrors) {
						throw new RecipeExceptionJS("Item '" + id + "' not found!").error();
					}

					return ItemStack.EMPTY;
				}

				var stack = new ItemStack(item);

				if (map.get("count") instanceof Number number) {
					stack.setCount(number.intValue());
				}

				if (map.containsKey("nbt")) {
					stack.setTag(NBTUtils.toTagCompound(map.get("nbt")));
				}

				return stack;
			} else if (map.get("tag") instanceof CharSequence s) {
				var stack = IngredientPlatformHelper.get().tag(s.toString()).kjs$getFirst();

				if (map.containsKey("count")) {
					stack.setCount(UtilsJS.parseInt(map.get("count"), 1));
				}

				return stack;
			}
		}

		return ItemStack.EMPTY;
	}

	static ItemStack parse(String s) {
		if (s.isEmpty() || s.equals("-") || s.equals("air") || s.equals("minecraft:air")) {
			return ItemStack.EMPTY;
		} else if (s.startsWith("#")) {
			return IngredientPlatformHelper.get().tag(s.substring(1)).kjs$getFirst();
		} else if (s.startsWith("@")) {
			return IngredientPlatformHelper.get().mod(s.substring(1)).kjs$getFirst();
		} else if (s.startsWith("%")) {
			var group = UtilsJS.findCreativeTab(new ResourceLocation(s.substring(1)));

			if (group == null) {
				if (RecipeJS.itemErrors) {
					throw new RecipeExceptionJS("Item group '" + s.substring(1) + "' not found!").error();
				}

				return ItemStack.EMPTY;
			}

			return IngredientPlatformHelper.get().creativeTab(group).kjs$getFirst();
		}

		var reg = UtilsJS.parseRegex(s);

		if (reg != null) {
			return IngredientPlatformHelper.get().regex(reg).kjs$getFirst();
		}

		var spaceIndex = s.indexOf(' ');
		var id = spaceIndex == -1 ? s : s.substring(0, spaceIndex);

		var item = RegistryInfo.ITEM.getValue(new ResourceLocation(id));

		if (item == Items.AIR) {
			if (RecipeJS.itemErrors) {
				throw new RecipeExceptionJS("Item '" + id + "' not found!").error();
			}

			return ItemStack.EMPTY;
		}

		var stack = new ItemStack(item);

		if (spaceIndex != -1) {
			var tagStr = s.substring(spaceIndex + 1);

			if (tagStr.length() >= 2 && tagStr.charAt(0) == '{') {
				stack.setTag(NBTUtils.toTagCompound(tagStr));
			}
		}

		return stack;
	}

	static Item getRawItem(Context cx, @Nullable Object o) {
		if (o == null) {
			return Items.AIR;
		} else if (o instanceof ItemLike item) {
			return item.asItem();
		} else if (o instanceof CharSequence) {
			var s = o.toString();
			if (s.isEmpty()) {
				return Items.AIR;
			} else if (s.charAt(0) != '#') {
				return RegistryInfo.ITEM.getValue(UtilsJS.getMCID(cx, s));
			}
		}

		return of(o).getItem();
	}

	// Use ItemStackJS.of(object)
	static ItemStack resultFromRecipeJson(@Nullable JsonElement json) {
		if (json == null || json.isJsonNull()) {
			return ItemStack.EMPTY;
		} else if (json.isJsonPrimitive()) {
			return of(json.getAsString());
		} else if (json instanceof JsonObject jsonObj) {
			ItemStack stack = null;
			if (jsonObj.has("item")) {
				stack = of(jsonObj.get("item").getAsString());
			} else if (jsonObj.has("tag")) {
				stack = IngredientPlatformHelper.get().tag(jsonObj.get("tag").getAsString()).kjs$getFirst();
			}

			if (stack != null) {
				if (jsonObj.has("count")) {
					stack.setCount(jsonObj.get("count").getAsInt());
				} else if (jsonObj.has("amount")) {
					stack.setCount(jsonObj.get("amount").getAsInt());
				}

				if (jsonObj.has("nbt")) {
					var element = jsonObj.get("nbt");

					if (element.isJsonObject()) {
						stack.setTag(NBTUtils.toTagCompound(element));
					} else {
						stack.setTag(NBTUtils.toTagCompound(element.getAsString()));
					}
				}

				return stack;
			}
		}

		return ItemStack.EMPTY;
	}

	static String toItemString(Object object) {
		return ItemStackJS.of(object).kjs$toItemString();
	}

	static List<ItemStack> getList() {
		return CACHED_ITEM_LIST.get();
	}

	static List<String> getTypeList() {
		return CACHED_ITEM_TYPE_LIST.get();
	}

	static Map<ResourceLocation, Collection<ItemStack>> getTypeToStacks() {
		return CACHED_ITEM_MAP.get();
	}

	static void clearAllCaches() {
		CACHED_ITEM_LIST.forget();
		CACHED_ITEM_TYPE_LIST.forget();
		PARSE_CACHE.clear();
		InputItem.PARSE_CACHE.clear();
	}

	/*
	@Override
	public JsonElement toJson() {
		var c = getCount();

		if (c == 1) {
			return new DummyItemStackJSIngredient(this).toJson();
		} else {
			return new IngredientStackJS(new DummyItemStackJSIngredient(this), c).toJson();
		}
	}

	public JsonElement toResultJson() {
		if (RecipeJS.currentRecipe != null) {
			var e = RecipeJS.currentRecipe.serializeItemStack(this);

			if (e != null) {
				return e;
			}
		}

		return toRawResultJson();
	}

	public JsonElement toRawResultJson() {
		var json = new JsonObject();
		json.addProperty("item", getId());
		json.addProperty("count", getCount());

		var nbt = getNbt();

		if (nbt != null) {
			if (RecipeJS.currentRecipe != null && RecipeJS.currentRecipe.serializeNBTAsJson()) {
				json.add("nbt", TagUtils.toJson(nbt));
			} else {
				json.addProperty("nbt", nbt.toString());
			}
		}

		if (hasChance()) {
			json.addProperty("chance", getChance());
		}

		return json;
	}

	 */
}