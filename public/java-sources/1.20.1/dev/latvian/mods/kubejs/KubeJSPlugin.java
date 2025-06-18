package dev.latvian.mods.kubejs;

import dev.latvian.mods.kubejs.block.entity.BlockEntityAttachmentType;
import dev.latvian.mods.kubejs.client.ClientProperties;
import dev.latvian.mods.kubejs.client.LangEventJS;
import dev.latvian.mods.kubejs.event.EventGroup;
import dev.latvian.mods.kubejs.generator.AssetJsonGenerator;
import dev.latvian.mods.kubejs.generator.DataJsonGenerator;
import dev.latvian.mods.kubejs.recipe.RecipesEventJS;
import dev.latvian.mods.kubejs.recipe.schema.RecipeComponentFactoryRegistryEvent;
import dev.latvian.mods.kubejs.recipe.schema.RegisterRecipeSchemasEvent;
import dev.latvian.mods.kubejs.script.BindingsEvent;
import dev.latvian.mods.kubejs.script.CustomJavaToJsWrappersEvent;
import dev.latvian.mods.kubejs.script.ScriptType;
import dev.latvian.mods.kubejs.server.DataExport;
import dev.latvian.mods.kubejs.util.AttachedData;
import dev.latvian.mods.kubejs.util.ClassFilter;
import dev.latvian.mods.rhino.util.wrap.TypeWrappers;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.server.MinecraftServer;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.item.crafting.Recipe;
import net.minecraft.world.item.crafting.RecipeManager;
import net.minecraft.world.level.Level;

import java.util.List;
import java.util.Map;

public class KubeJSPlugin {
	public void init() {
	}

	public void initStartup() {
	}

	public void clientInit() {
	}

	public void afterInit() {
	}

	public void onServerReload() {
	}

	/**
	 * Call {@link EventGroup#register()} of events your mod adds
	 */
	public void registerEvents() {
	}

	public void registerClasses(ScriptType type, ClassFilter filter) {
	}

	public void registerBindings(BindingsEvent event) {
	}

	public void registerTypeWrappers(ScriptType type, TypeWrappers typeWrappers) {
	}

	public void registerCustomJavaToJsWrappers(CustomJavaToJsWrappersEvent event) {
	}

	public void registerRecipeSchemas(RegisterRecipeSchemasEvent event) {
	}

	public void registerRecipeComponents(RecipeComponentFactoryRegistryEvent event) {
	}

	public void registerBlockEntityAttachments(List<BlockEntityAttachmentType> types) {
	}

	public void attachServerData(AttachedData<MinecraftServer> event) {
	}

	public void attachLevelData(AttachedData<Level> event) {
	}

	public void attachPlayerData(AttachedData<Player> event) {
	}

	public void generateDataJsons(DataJsonGenerator generator) {
	}

	public void generateAssetJsons(AssetJsonGenerator generator) {
	}

	public void generateLang(LangEventJS event) {
	}

	public void loadCommonProperties(CommonProperties properties) {
	}

	public void loadClientProperties(ClientProperties properties) {
	}

	public void loadDevProperties(DevProperties properties) {
	}

	public void clearCaches() {
	}

	public void exportServerData(DataExport export) {
	}

	@Override
	public String toString() {
		return getClass().getName();
	}

	/**
	 * Only use this method if your mod adds runtime recipes and is conflicting with KubeJS recipe manager. Disable your other hook if "kubejs" mod is loaded!
	 */
	public void injectRuntimeRecipes(RecipesEventJS event, RecipeManager manager, Map<ResourceLocation, Recipe<?>> recipesByName) {
	}
}
