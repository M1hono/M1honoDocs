package net.minecraft.world.damagesource;

import com.mojang.serialization.Codec;
import net.minecraft.util.StringRepresentable;

public enum DamageScaling implements StringRepresentable, net.minecraftforge.common.IExtensibleEnum {
   NEVER("never"),
   WHEN_CAUSED_BY_LIVING_NON_PLAYER("when_caused_by_living_non_player"),
   ALWAYS("always");

   public static final Codec<DamageScaling> CODEC = net.minecraft.util.ExtraCodecs.lazyInitializedCodec(() -> StringRepresentable.fromEnum(DamageScaling::values));
   private final String id;

   private DamageScaling(String pId) {
      this(pId, net.minecraftforge.common.damagesource.IScalingFunction.DEFAULT);
   }

   public String getSerializedName() {
      return this.id;
   }

   private final net.minecraftforge.common.damagesource.IScalingFunction scaling;

   private DamageScaling(String id, net.minecraftforge.common.damagesource.IScalingFunction scaling) {
      this.id = id;
      this.scaling = scaling;
   }

   /**
    * The scaling function is used when a player is hurt by a damage type with this type of scaling.
    * @return The {@link net.minecraftforge.common.damagesource.IScalingFunction} associated with this damage scaling.
    */
   public net.minecraftforge.common.damagesource.IScalingFunction getScalingFunction() {
      return this.scaling;
   }

   /**
    * Creates a new DamageScaling with the specified ID and scaling function.<br>
    * Example usage:
    * <code><pre>
    * public static final DamageScaling CUSTOM_SCALING = DamageEffects.create("MYMOD_CUSTOM", "mymod:custom", MyMod.CUSTOM_SCALING_FUNCTION);
    * </pre></code>
    * @param name The {@linkplain Enum#name() true enum name}. Prefix this with your modid.
    * @param id The {@linkplain StringRepresentable#getSerializedName() serialized name}. Prefix this with your modid and `:`
    * @param scaling The scaling function that will be used when a player is hurt by a damage type with this type of scaling.
    * @return A newly created DamageScaling. Store this result in a static final field.
    * @apiNote This method must be called as early as possible, as if {@link #CODEC} is resolved before this is called, it will be unusable.
    */
   public static DamageScaling create(String name, String id, net.minecraftforge.common.damagesource.IScalingFunction scaling) {
      throw new IllegalStateException("Enum not extended");
   }
}
