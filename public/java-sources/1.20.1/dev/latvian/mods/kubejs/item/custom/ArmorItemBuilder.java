package dev.latvian.mods.kubejs.item.custom;

import com.google.common.collect.ArrayListMultimap;
import com.google.common.collect.Multimap;
import dev.latvian.mods.kubejs.item.ItemBuilder;
import dev.latvian.mods.kubejs.item.MutableArmorTier;
import dev.latvian.mods.kubejs.registry.RegistryInfo;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.world.entity.EquipmentSlot;
import net.minecraft.world.entity.ai.attributes.Attribute;
import net.minecraft.world.entity.ai.attributes.AttributeModifier;
import net.minecraft.world.item.ArmorItem;
import net.minecraft.world.item.ArmorMaterial;
import net.minecraft.world.item.ArmorMaterials;
import net.minecraft.world.item.Item;

import java.util.function.Consumer;

public class ArmorItemBuilder extends ItemBuilder {
	public static class Helmet extends ArmorItemBuilder {
		public Helmet(ResourceLocation i) {
			super(i, ArmorItem.Type.HELMET);
		}
	}

	public static class Chestplate extends ArmorItemBuilder {
		public Chestplate(ResourceLocation i) {
			super(i, ArmorItem.Type.CHESTPLATE);
		}

	}

	public static class Leggings extends ArmorItemBuilder {

		public Leggings(ResourceLocation i) {
			super(i, ArmorItem.Type.LEGGINGS);
		}
	}

	public static class Boots extends ArmorItemBuilder {
		public Boots(ResourceLocation i) {
			super(i, ArmorItem.Type.BOOTS);
		}

	}

	public final ArmorItem.Type armorType;
	public MutableArmorTier armorTier;

	protected ArmorItemBuilder(ResourceLocation i, ArmorItem.Type t) {
		super(i);
		armorType = t;
		armorTier = new MutableArmorTier(id.toString(), ArmorMaterials.IRON);
		unstackable();
	}

	@Override
	public Item createObject() {
		return new ArmorItem(armorTier, armorType, createItemProperties()) {
			private boolean modified = false;

			{
				defaultModifiers = ArrayListMultimap.create(defaultModifiers);
			}

			@Override
			public Multimap<Attribute, AttributeModifier> getDefaultAttributeModifiers(EquipmentSlot equipmentSlot) {
				if (!modified) {
					modified = true;
					attributes.forEach((r, m) -> defaultModifiers.put(RegistryInfo.ATTRIBUTE.getValue(r), m));
				}
				return super.getDefaultAttributeModifiers(equipmentSlot);
			}
		};
	}

	public ArmorItemBuilder tier(ArmorMaterial t) {
		armorTier = new MutableArmorTier(t.getName(), t);
		return this;
	}

	public ArmorItemBuilder modifyTier(Consumer<MutableArmorTier> callback) {
		callback.accept(armorTier);
		return this;
	}
}
