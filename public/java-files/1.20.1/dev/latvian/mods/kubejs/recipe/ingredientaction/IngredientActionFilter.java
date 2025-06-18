package dev.latvian.mods.kubejs.recipe.ingredientaction;

import dev.latvian.mods.kubejs.item.ingredient.IngredientJS;
import dev.latvian.mods.kubejs.util.MapJS;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.item.crafting.Ingredient;

public class IngredientActionFilter {
	public static IngredientActionFilter filterOf(Object o) {
		var filter = new IngredientActionFilter();

		if (o instanceof Number num) {
			filter.filterIndex = num.intValue();
		} else if (o instanceof String || o instanceof Ingredient) {
			filter.filterIngredient = IngredientJS.of(o);
		} else {
			var map = MapJS.of(o);

			if (map != null && !map.isEmpty()) {
				if (map.containsKey("item")) {
					filter.filterIngredient = IngredientJS.of(map.get("item"));
				}

				if (map.containsKey("index")) {
					filter.filterIndex = ((Number) map.get("index")).intValue();
				}
			}
		}

		return filter;
	}

	public int filterIndex = -1;
	public Ingredient filterIngredient = null;

	public void copyFrom(IngredientActionFilter filter) {
		filterIndex = filter.filterIndex;
		filterIngredient = filter.filterIngredient;
	}

	public boolean checkFilter(int index, ItemStack stack) {
		return (filterIndex == -1 || filterIndex == index) && (filterIngredient == null || filterIngredient.test(stack));
	}
}
