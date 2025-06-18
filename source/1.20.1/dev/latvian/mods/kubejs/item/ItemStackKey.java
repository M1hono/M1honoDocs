package dev.latvian.mods.kubejs.item;

import net.minecraft.nbt.CompoundTag;
import net.minecraft.world.item.Item;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.item.Items;
import org.jetbrains.annotations.Nullable;

import java.util.Objects;

public class ItemStackKey {
	public static ItemStackKey EMPTY = new ItemStackKey(Items.AIR, null);

	public static ItemStackKey of(ItemStack stack) {
		if (stack.isEmpty()) {
			return EMPTY;
		} else if (stack.getTag() == null) {
			return stack.getItem().kjs$getTypeItemStackKey();
		}

		return new ItemStackKey(stack);
	}

	private final Item item;
	private final CompoundTag tag;
	private int hashCode = 0;

	public ItemStackKey(Item item, @Nullable CompoundTag tag) {
		this.item = item;
		this.tag = tag;
	}

	private ItemStackKey(ItemStack is) {
		this(is.getItem(), is.getTag());
	}

	@Override
	public int hashCode() {
		if (hashCode == 0) {
			hashCode = item == Items.AIR ? 0 : tag == null ? item.hashCode() : (item.hashCode() * 31 + tag.hashCode());

			if (hashCode == 0) {
				hashCode = 1;
			}
		}

		return hashCode;
	}

	@Override
	public boolean equals(Object obj) {
		if (obj instanceof ItemStackKey k) {
			return item == k.item && hashCode() == k.hashCode() && Objects.equals(tag, k.tag);
		}

		return false;
	}

}