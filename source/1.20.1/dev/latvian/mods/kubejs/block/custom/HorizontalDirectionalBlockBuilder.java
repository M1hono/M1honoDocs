package dev.latvian.mods.kubejs.block.custom;

import dev.latvian.mods.kubejs.block.BlockBuilder;
import dev.latvian.mods.kubejs.client.ModelGenerator;
import dev.latvian.mods.kubejs.client.VariantBlockStateGenerator;
import dev.latvian.mods.kubejs.generator.AssetJsonGenerator;
import net.minecraft.core.BlockPos;
import net.minecraft.core.Direction;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.world.item.context.BlockPlaceContext;
import net.minecraft.world.level.BlockGetter;
import net.minecraft.world.level.Level;
import net.minecraft.world.level.block.Block;
import net.minecraft.world.level.block.EntityBlock;
import net.minecraft.world.level.block.entity.BlockEntity;
import net.minecraft.world.level.block.entity.BlockEntityTicker;
import net.minecraft.world.level.block.entity.BlockEntityType;
import net.minecraft.world.level.block.state.BlockState;
import net.minecraft.world.level.block.state.StateDefinition;
import net.minecraft.world.level.block.state.properties.BlockStateProperties;
import net.minecraft.world.level.block.state.properties.DirectionProperty;
import net.minecraft.world.level.material.Fluids;
import net.minecraft.world.phys.AABB;
import net.minecraft.world.phys.shapes.CollisionContext;
import net.minecraft.world.phys.shapes.Shapes;
import net.minecraft.world.phys.shapes.VoxelShape;
import org.jetbrains.annotations.NotNull;
import org.jetbrains.annotations.Nullable;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class HorizontalDirectionalBlockBuilder extends BlockBuilder {

	// Cardinal blocks that can face any horizontal direction (NSEW).

	public HorizontalDirectionalBlockBuilder(ResourceLocation i) {
		super(i);
	}

	@Override
	protected void generateBlockStateJson(VariantBlockStateGenerator bs) {
		var modelLocation = model.isEmpty() ? newID("block/", "").toString() : model;
		bs.variant("facing=north", v -> v.model(modelLocation));
		bs.variant("facing=east", v -> v.model(modelLocation).y(90));
		bs.variant("facing=south", v -> v.model(modelLocation).y(180));
		bs.variant("facing=west", v -> v.model(modelLocation).y(270));
	}

	@Override
	protected void generateBlockModelJsons(AssetJsonGenerator gen) {
		gen.blockModel(id, mg -> {
			var side = getTextureOrDefault("side", newID("block/", "").toString());

			mg.texture("side", side);
			mg.texture("front", getTextureOrDefault("front", newID("block/", "_front").toString()));
			mg.texture("particle", getTextureOrDefault("particle", side));
			mg.texture("top", getTextureOrDefault("top", side));

			if (textures.has("bottom")) {
				mg.parent("block/orientable_with_bottom");
				mg.texture("bottom", textures.get("bottom").getAsString());
			} else {
				mg.parent("minecraft:block/orientable");
			}
		});
	}

	@Override
	protected void generateItemModelJson(ModelGenerator m) {
		m.parent(model.isEmpty() ? newID("block/", "").toString() : model);
	}

	@Override
	public HorizontalDirectionalBlockBuilder textureAll(String tex) {
		super.textureAll(tex);
		texture("side", tex);
		return this;
	}

	private String getTextureOrDefault(String name, String defaultTexture) {
		return textures.has(name) ? textures.get(name).getAsString() : defaultTexture;
	}

	@Override
	public Block createObject() {
		return blockEntityInfo != null ? new WithEntity(this) : new HorizontalDirectionalBlockJS(this);
	}

	public static class HorizontalDirectionalBlockJS extends BasicBlockJS {
		public static final DirectionProperty FACING = BlockStateProperties.HORIZONTAL_FACING;
		public final Map<Direction, VoxelShape> shapes = new HashMap<>();

		public HorizontalDirectionalBlockJS(BlockBuilder p) {
			super(p);
			if (hasCustomShape()) {
				Direction.Plane.HORIZONTAL.forEach(direction -> shapes.put(direction, rotateShape(shape, direction)));
			}
		}

		private static VoxelShape rotateShape(VoxelShape shape, Direction direction) {
			List<AABB> newShapes = new ArrayList<>();

			switch (direction) {
				case NORTH -> {
					return shape;
				}
				case SOUTH -> shape.forAllBoxes((x1, y1, z1, x2, y2, z2) -> newShapes.add(new AABB(1D - x2, y1, 1D - z2, 1D - x1, y2, 1D - z1)));
				case WEST -> shape.forAllBoxes((x1, y1, z1, x2, y2, z2) -> newShapes.add(new AABB(z1, y1, 1D - x2, z2, y2, 1D - x1)));
				case EAST -> shape.forAllBoxes((x1, y1, z1, x2, y2, z2) -> newShapes.add(new AABB(1D - z2, y1, x1, 1D - z1, y2, x2)));
				default -> throw new IllegalArgumentException("Cannot rotate around direction " + direction.getName());
			}
			return createShape(newShapes);
		}

		@Override
		protected void createBlockStateDefinition(@NotNull StateDefinition.Builder<Block, BlockState> builder) {
			builder.add(FACING);
			super.createBlockStateDefinition(builder);
		}

		@Override
		public BlockState getStateForPlacement(@NotNull BlockPlaceContext context) {
			var state = defaultBlockState().setValue(FACING, context.getHorizontalDirection().getOpposite());

			if (blockBuilder.canBeWaterlogged()) {
				state = state.setValue(BlockStateProperties.WATERLOGGED, context.getLevel().getFluidState(context.getClickedPos()).getType() == Fluids.WATER);
			}

			return state;
		}

		private boolean hasCustomShape() {
			return shape != Shapes.block();
		}

		@Override
		@Deprecated
		public VoxelShape getShape(BlockState state, BlockGetter level, BlockPos pos, CollisionContext context) {
			return hasCustomShape() ? shapes.get(state.getValue(FACING)) : shape;
		}
	}

	public static class WithEntity extends HorizontalDirectionalBlockJS implements EntityBlock {
		public WithEntity(BlockBuilder p) {
			super(p);
		}

		@Nullable
		@Override
		public BlockEntity newBlockEntity(BlockPos blockPos, BlockState blockState) {
			return blockBuilder.blockEntityInfo.createBlockEntity(blockPos, blockState);
		}

		@Nullable
		@Override
		public <T extends BlockEntity> BlockEntityTicker<T> getTicker(Level level, BlockState blockState, BlockEntityType<T> blockEntityType) {
			return blockBuilder.blockEntityInfo.getTicker(level);
		}
	}
}
