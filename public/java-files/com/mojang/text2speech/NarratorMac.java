package com.mojang.text2speech;

import ca.weblite.objc.Client;
import ca.weblite.objc.NSObject;
import ca.weblite.objc.Proxy;
import ca.weblite.objc.annotations.Msg;
import com.google.common.collect.Queues;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.Queue;

public class NarratorMac extends NSObject implements Narrator {
    private static final Logger LOGGER = LoggerFactory.getLogger(NarratorMac.class);

    private final Proxy synth = Client.getInstance().sendProxy("NSSpeechSynthesizer", "alloc");
    private boolean speaking;
    private boolean crashed;

    private final Queue<String> queue = Queues.newConcurrentLinkedQueue();

    public NarratorMac() {
        super("NSObject");
        synth.send("init");
        synth.send("setDelegate:", this);
    }

    private void startSpeaking(final String message) {
        synth.send("startSpeakingString:", message);
    }

    @Msg(selector = "speechSynthesizer:didFinishSpeaking:", signature = "v@:B")
    public void didFinishSpeaking(final boolean naturally) {
        if (queue.isEmpty()) {
            speaking = false;
        } else {
            startSpeaking(queue.poll());
        }
    }

    @Override
    public void say(final String msg, final boolean interrupt) {
        if (crashed) {
            return;
        }

        try {
            if (interrupt) {
                synth.send("stopSpeaking");
            }
            if (speaking) {
                queue.offer(msg);
            } else {
                speaking = true;
                startSpeaking(msg);
            }
        } catch (Throwable e) {
            crashed = true;
            LOGGER.error("Narrator crashed", e);
        }
    }

    @Override
    public void clear() {
        queue.clear();
        synth.send("stopSpeaking");
    }

    @Override
    public void destroy() {
    }
}
