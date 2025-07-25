package net.minecraft.world.damagesource;

import com.mojang.serialization.Codec;
import net.minecraft.util.StringRepresentable;

public enum DeathMessageType implements StringRepresentable, net.minecraftforge.common.IExtensibleEnum {
   DEFAULT("default"),
   FALL_VARIANTS("fall_variants"),
   INTENTIONAL_GAME_DESIGN("intentional_game_design");

   public static final Codec<DeathMessageType> CODEC = net.minecraft.util.ExtraCodecs.lazyInitializedCodec(() -> StringRepresentable.fromEnum(DeathMessageType::values));
   private final String id;

   private DeathMessageType(String pId) {
      this(pId, net.minecraftforge.common.damagesource.IDeathMessageProvider.DEFAULT);
   }

   public String getSerializedName() {
      return this.id;
   }

   private final net.minecraftforge.common.damagesource.IDeathMessageProvider msgFunction;

   private DeathMessageType(String id, net.minecraftforge.common.damagesource.IDeathMessageProvider msgFunction) {
      this.id = id;
      this.msgFunction = msgFunction;
   }

   /**
    * The death message function is used when an entity dies to a damage type with this death message type.
    * @return The {@link net.minecraftforge.common.damagesource.IDeathMessageProvider} associated with this death message type.
    */
   public net.minecraftforge.common.damagesource.IDeathMessageProvider getMessageFunction() {
      return this.msgFunction;
   }

   /**
    * Creates a new DeathMessageType with the specified ID and death message provider.<br>
    * Example usage:
    * <code><pre>
    * public static final DeathMessageType CUSTOM_FUNCTION = DeathMessageType.create("MYMOD_CUSTOM", "mymod:custom", MyMod.CUSTOM_MESSAGE_PROVIDER);
    * </pre></code>
    * @param name The {@linkplain Enum#name() true enum name}. Prefix this with your modid.
    * @param id The {@linkplain StringRepresentable#getSerializedName() serialized name}. Prefix this with your modid and `:`
    * @param scaling The scaling function that will be used when a player is hurt by a damage type with this type of scaling.
    * @return A newly created DamageScaling. Store this result in a static final field.
    * @apiNote This method must be called as early as possible, as if {@link #CODEC} is resolved before this is called, it will be unusable.
    */
   public static DeathMessageType create(String name, String id, net.minecraftforge.common.damagesource.IDeathMessageProvider msgFunction) {
      throw new IllegalStateException("Enum not extended");
   }
}
