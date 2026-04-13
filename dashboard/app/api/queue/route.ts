import { NextResponse } from 'next/server';
import { roomService, agentDispatchClient } from '@/lib/server-utils';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { numbers, prompt, modelProvider, voice, agentConfigId } = body;

        if (!numbers || !Array.isArray(numbers) || numbers.length === 0) {
            return NextResponse.json({ error: "List of phone numbers is required" }, { status: 400 });
        }

        const trunkId = process.env.VOBIZ_SIP_TRUNK_ID;
        if (!trunkId) {
            return NextResponse.json({ error: "SIP Trunk not configured" }, { status: 500 });
        }

        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // When agentConfigId is provided, that config is the source of truth
        // for voice + model. The form values are only honoured when no config
        // is selected (legacy dispatcher widget).
        let provider = (modelProvider || 'openai').toLowerCase();
        let voiceId = (voice || 'anushka').toLowerCase();

        if (agentConfigId) {
            const { data: cfg } = await supabase
                .from('agent_configs')
                .select('voice_id, model_provider')
                .eq('id', agentConfigId)
                .eq('user_id', user.id)
                .maybeSingle();
            if (!cfg) {
                return NextResponse.json({ error: "Agent config not found" }, { status: 404 });
            }
            if (cfg.voice_id) voiceId = cfg.voice_id.toLowerCase();
            if (cfg.model_provider) provider = cfg.model_provider.toLowerCase();
        }

        const results = [];

        // Process casually to avoid rate limits (simple queue)
        // In a real production environment, push these to a Redis queue like BullMQ
        for (const phoneNumber of numbers) {
            try {
                const roomName = `call-${phoneNumber.replace(/\+/g, '')}-${Math.floor(Math.random() * 10000)}`;

                const metadata = JSON.stringify({
                    phone_number: phoneNumber,
                    user_prompt: prompt || "",
                    model_provider: provider,
                    voice_id: voiceId,
                    user_id: user.id,
                    agent_config_id: agentConfigId || null,
                });

                await roomService.createRoom({
                    name: roomName,
                    metadata: metadata,
                    emptyTimeout: 60 * 5,
                });

                const dispatch = await agentDispatchClient.createDispatch(
                    roomName,
                    "outbound-caller",
                    { metadata }
                );

                results.push({ phoneNumber, status: 'dispatched', id: dispatch.id });

                // Artificial delay to prevent API flooding (200ms)
                await new Promise(r => setTimeout(r, 200));

            } catch (e: any) {
                console.error(`Failed to dispatch ${phoneNumber}:`, e);
                results.push({ phoneNumber, status: 'failed', error: e.message });
            }
        }

        return NextResponse.json({
            success: true,
            message: `Processed ${numbers.length} numbers`,
            results
        });

    } catch (error: any) {
        console.error("Queue error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
