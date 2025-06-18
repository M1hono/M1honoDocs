package dev.latvian.mods.kubejs.integration.rei;

import dev.latvian.mods.kubejs.event.EventJS;
import dev.latvian.mods.kubejs.fluid.FluidStackJS;
import dev.latvian.mods.kubejs.util.Tags;
import dev.latvian.mods.kubejs.util.UtilsJS;
import me.shedaniel.rei.api.client.registry.entry.CollapsibleEntryRegistry;
import me.shedaniel.rei.api.common.entry.EntryStack;
import me.shedaniel.rei.api.common.entry.type.VanillaEntryTypes;
import me.shedaniel.rei.api.common.util.CollectionUtils;
import me.shedaniel.rei.api.common.util.EntryIngredients;
import net.minecraft.network.chat.Component;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.item.crafting.Ingredient;

import java.util.List;
import java.util.function.Predicate;

@SuppressWarnings("UnstableApiUsage")
public class GroupREIEntriesEventJS extends EventJS {
	private final REIEntryWrappers entryWrappers;
	public final CollapsibleEntryRegistry registry;

	public GroupREIEntriesEventJS(REIEntryWrappers entryWrappers, CollapsibleEntryRegistry registry) {
		this.entryWrappers = entryWrappers;
		this.registry = registry;
	}

	// shortcut impl for the two builtin entry types
	public void groupItems(ResourceLocation groupId, Component description, Ingredient entries) {
		group(groupId, description, EntryIngredients.ofIngredient(entries));
	}

	public void groupFluids(ResourceLocation groupId, Component description, FluidStackJS... entries) {
		group(groupId, description, EntryIngredients.of(VanillaEntryTypes.FLUID, CollectionUtils.map(entries, FluidStackJS::getFluidStack)));
	}

	public void groupEntries(ResourceLocation groupId, Component description, ResourceLocation entryTypeId, Object entries) {
		var entryType = KubeJSREIPlugin.getTypeOrThrow(entryTypeId);
		var wrapper = entryWrappers.getWrapper(entryType);
		var list = wrapper.entryList(entries);
		group(groupId, description, UtilsJS.cast(list));
	}

	public void groupSameItem(ResourceLocation group, Component description, ItemStack item) {
		groupItemsIf(group, description, item.getItem().kjs$asIngredient());
	}

	public void groupSameFluid(ResourceLocation group, Component description, FluidStackJS fluid) {
		groupFluidsIf(group, description, stack -> stack.getFluid().equals(fluid.getFluid()));
	}

	// tag grouping, only for builtin entry types
	public void groupItemsByTag(ResourceLocation groupId, Component description, ResourceLocation tags) {
		group(groupId, description, EntryIngredients.ofItemTag(Tags.item(tags)));
	}

	public void groupFluidsByTag(ResourceLocation groupId, Component description, ResourceLocation tags) {
		group(groupId, description, EntryIngredients.ofFluidTag(Tags.fluid(tags)));
	}

	// predicate-based grouping, again with shortcuts for builtin entry types
	public void groupItemsIf(ResourceLocation groupId, Component description, Predicate<ItemStack> predicate) {
		registry.group(groupId, description, VanillaEntryTypes.ITEM, (item) -> predicate.test(item.getValue()));
	}

	public void groupFluidsIf(ResourceLocation groupId, Component description, Predicate<FluidStackJS> predicate) {
		registry.group(groupId, description, VanillaEntryTypes.FLUID, (fluid) -> predicate.test(FluidStackJS.of(fluid.getValue())));
	}

	// the difference between these next two methods:
	// the first method only groups entries of a single type, and uses a value-based predicate,
	// while the second method uses an EntryStack-based predicate
	// (which is more flexible and can be spanned across multiple entry types)
	@SuppressWarnings({"rawtypes", "unchecked"})
	public void groupEntriesIf(ResourceLocation groupId, Component description, ResourceLocation entryTypeId, Predicate predicate) {
		var entryType = KubeJSREIPlugin.getTypeOrThrow(entryTypeId);
		registry.group(groupId, description, entryType, (entry) -> predicate.test(entry.getValue()));
	}

	public void groupAnyIf(ResourceLocation groupId, Component description, Predicate<EntryStack<?>> predicate) {
		registry.group(groupId, description, predicate);
	}

	private void group(ResourceLocation groupId, Component description, List<EntryStack<?>> entries) {
		registry.group(groupId, description, entries);
	}

}
