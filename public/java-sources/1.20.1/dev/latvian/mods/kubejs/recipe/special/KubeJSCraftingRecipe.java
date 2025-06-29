package dev.latvian.mods.kubejs.recipe.special;

import dev.architectury.utils.GameInstance;
import dev.latvian.mods.kubejs.core.CraftingContainerKJS;
import dev.latvian.mods.kubejs.recipe.ModifyRecipeCraftingGrid;
import dev.latvian.mods.kubejs.recipe.ModifyRecipeResultCallback;
import dev.latvian.mods.kubejs.recipe.ingredientaction.IngredientAction;
import net.minecraft.core.NonNullList;
import net.minecraft.core.RegistryAccess;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.inventory.AbstractContainerMenu;
import net.minecraft.world.inventory.CraftingContainer;
import net.minecraft.world.inventory.CraftingMenu;
import net.minecraft.world.inventory.InventoryMenu;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.item.crafting.CraftingRecipe;
import org.jetbrains.annotations.Nullable;

import java.util.List;

public interface KubeJSCraftingRecipe extends CraftingRecipe {
	List<IngredientAction> kjs$getIngredientActions();

	@Nullable
	ModifyRecipeResultCallback kjs$getModifyResult();

	String kjs$getStage();

	default NonNullList<ItemStack> kjs$getRemainingItems(CraftingContainer container) {
		var list = NonNullList.withSize(container.getContainerSize(), ItemStack.EMPTY);

		for (var i = 0; i < list.size(); i++) {
			list.set(i, IngredientAction.getRemaining(container, i, kjs$getIngredientActions()));
		}

		return list;
	}

	default ItemStack kjs$assemble(CraftingContainer container, RegistryAccess registryAccess) {
		if (!kjs$getStage().isEmpty()) {
			var player = getPlayer(((CraftingContainerKJS) container).kjs$getMenu());

			if (player == null || !player.kjs$getStages().has(kjs$getStage())) {
				return ItemStack.EMPTY;
			}
		}

		var modifyResult = kjs$getModifyResult();
		var result = getResultItem(registryAccess);
		//noinspection ConstantValue
		result = (result == null || result.isEmpty()) ? ItemStack.EMPTY : result.copy();
		if (modifyResult != null) {
			return modifyResult.modify(new ModifyRecipeCraftingGrid(container), result);
		}

		return result;
	}

	@Nullable
	private static Player getPlayer(AbstractContainerMenu menu) {
		if (menu instanceof CraftingMenu craft) {
			return craft.player;
		} else if (menu instanceof InventoryMenu inv) {
			return inv.owner;
		} else {
			var server = GameInstance.getServer();
			if (server != null) {
				for (var player : server.getPlayerList().getPlayers()) {
					// assume that a single menu instance can only be used by a single player
					// (should hold true because menus contain remote state as well)
					if (player.containerMenu == menu && menu.stillValid(player)) {
						return player;
					}
				}
			}
		}

		return null;
	}
}
