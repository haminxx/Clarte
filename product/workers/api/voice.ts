import coachPrompt from "../../prompts/coach.md";
import type { Env } from "../shared/env";
import { grokVoiceTools } from "../shared/tools-spec";

/**
 * Grok Voice session plumbing — plan section 6.1, layer 2/3.
 * The browser never sees XAI_API_KEY: it gets a short-lived client secret minted
 * here and opens the socket itself with the `xai-client-secret.` subprotocol.
 */

const CLIENT_SECRET_URL = "https://api.x.ai/v1/realtime/client_secrets";

export const REALTIME_WSS = "wss://api.x.ai/v1/realtime";

export interface EphemeralToken {
  value: string;
  expiresAt: number;
  stubbed: boolean;
}

export async function mintEphemeralToken(env: Env): Promise<EphemeralToken> {
  const ttl = Number(env.TOKEN_TTL_SECONDS ?? "600") || 600;

  if (!env.XAI_API_KEY) {
    // No key on this deployment: hand back an obviously fake token so the UI can
    // still render and say why the microphone is disabled.
    return { value: "", expiresAt: Math.floor(Date.now() / 1000) + ttl, stubbed: true };
  }

  const response = await fetch(CLIENT_SECRET_URL, {
    method: "POST",
    headers: {
      authorization: `Bearer ${env.XAI_API_KEY}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ expires_after: { seconds: ttl } }),
  });

  if (!response.ok) {
    throw new Error(`xAI client secret failed: ${response.status} ${await response.text()}`);
  }

  const data = (await response.json()) as { value?: string; expires_at?: number };
  if (!data.value) throw new Error("xAI client secret response had no value");

  return {
    value: data.value,
    expiresAt: data.expires_at ?? Math.floor(Date.now() / 1000) + ttl,
    stubbed: false,
  };
}

/** The `session.update` payload the browser sends once the socket is open. */
export function sessionConfig(env: Env) {
  return {
    type: "session.update" as const,
    session: {
      voice: env.GROK_VOICE_NAME || "eve",
      instructions: coachPrompt,
      turn_detection: { type: "server_vad" as const },
      tools: grokVoiceTools(),
      audio: {
        input: { format: { type: "audio/pcm", rate: 24000 } },
        output: { format: { type: "audio/pcm", rate: 24000 } },
      },
    },
  };
}

export function realtimeUrl(env: Env): string {
  return `${REALTIME_WSS}?model=${encodeURIComponent(env.GROK_VOICE_MODEL || "grok-voice-latest")}`;
}
