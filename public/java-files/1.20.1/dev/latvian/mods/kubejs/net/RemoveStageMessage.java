package dev.latvian.mods.kubejs.net;

import dev.architectury.networking.NetworkManager.PacketContext;
import dev.architectury.networking.simple.BaseS2CMessage;
import dev.architectury.networking.simple.MessageType;
import dev.latvian.mods.kubejs.KubeJS;
import net.minecraft.network.FriendlyByteBuf;

import java.util.UUID;

public class RemoveStageMessage extends BaseS2CMessage {
	private final UUID player;
	private final String stage;

	public RemoveStageMessage(UUID p, String s) {
		player = p;
		stage = s;
	}

	RemoveStageMessage(FriendlyByteBuf buf) {
		player = buf.readUUID();
		stage = buf.readUtf();
	}

	@Override
	public MessageType getType() {
		return KubeJSNet.REMOVE_STAGE;
	}

	@Override
	public void write(FriendlyByteBuf buf) {
		buf.writeUUID(player);
		buf.writeUtf(stage);
	}

	@Override
	public void handle(PacketContext context) {
		var p0 = KubeJS.PROXY.getClientPlayer();

		if (p0 == null) {
			return;
		}

		var p = player.equals(p0.getUUID()) ? p0 : p0.level().getPlayerByUUID(player);

		if (p != null) {
			p.kjs$getStages().remove(stage);
		}
	}
}