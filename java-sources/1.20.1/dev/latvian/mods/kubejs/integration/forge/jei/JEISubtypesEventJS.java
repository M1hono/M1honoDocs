package dev.latvian.mods.kubejs.integration.forge.jei;

import dev.latvian.mods.kubejs.event.EventJS;
import mezz.jei.api.constants.VanillaTypes;
import mezz.jei.api.ingredients.subtypes.IIngredientSubtypeInterpreter;
import mezz.jei.api.ingredients.subtypes.UidContext;
import mezz.jei.api.registration.ISubtypeRegistration;
import net.minecraft.world.item.Item;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.item.crafting.Ingredient;

import java.util.function.Function;

public class JEISubtypesEventJS extends EventJS {
	@FunctionalInterface
	public interface Interpreter extends Function<ItemStack, Object> {
	}

	private static class NBTKeyInterpreter implements IIngredientSubtypeInterpreter<ItemStack> {
		private final String key;

		private NBTKeyInterpreter(String k) {
			key = k;
		}

		@Override
		public String apply(ItemStack stack, UidContext context) {
			var nbt = stack.getTag();

			if (nbt == null || !nbt.contains(key)) {
				return "";
			}

			return String.valueOf(nbt.get(key));
		}
	}

	private final ISubtypeRegistration registration;

	public JEISubtypesEventJS(ISubtypeRegistration r) {
		registration = r;
	}

	public void registerInterpreter(Item item, Interpreter interpreter) {
		registration.registerSubtypeInterpreter(VanillaTypes.ITEM_STACK, item, (stack, context) -> {
			var o = interpreter.apply(stack);
			return o == null ? "" : o.toString();
		});
	}

	public void useNBT(Ingredient items) {
		registration.useNbtForSubtypes(items.kjs$getItemTypes().toArray(new Item[0]));
	}

	public void useNBTKey(Ingredient items, String key) {
		var in = new NBTKeyInterpreter(key);

		for (var item : items.kjs$getItemTypes()) {
			registration.registerSubtypeInterpreter(VanillaTypes.ITEM_STACK, item, in);
		}
	}
}