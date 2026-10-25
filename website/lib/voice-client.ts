/**
 * Vapi Web SDK client (plan section 6.1).
 *
 * The browser only receives the public key and assistant id. The private key
 * is never read here and must not be added as a NEXT_PUBLIC variable.
 * PCM capture stays inside @vapi-ai/web; this module does not touch audio.
 *
 * `start(assistantId, { metadata, variableValues })` carries the Clarte session
 * id so the tool webhook can read `call.metadata.sessionId` or the assistant
 * variable `sessionId`.
 */

export type VoiceStatus = "idle" | "connecting" | "live" | "closed" | "error";

export interface VoiceClientHandlers {
  onStatus: (status: VoiceStatus, detail?: string) => void;
  onUserTranscript: (text: string, final: boolean) => void;
  onAssistantTranscript: (text: string, final: boolean) => void;
  onError: (message: string) => void;
}

interface VapiLike {
  on(event: string, listener: (payload?: unknown) => void): void;
  removeAllListeners(): void;
  start(
    assistantId: string,
    overrides: {
      metadata: { sessionId: string };
      variableValues: { sessionId: string };
    },
  ): Promise<{ id?: string } | null>;
  stop(): Promise<void>;
}

function publicVoiceConfig(): { publicKey: string; assistantId: string } | null {
  const publicKey = process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY?.trim() ?? "";
  const assistantId = process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID?.trim() ?? "";
  if (!publicKey || !assistantId) return null;
  return { publicKey, assistantId };
}

function errorText(error: unknown): string {
  if (typeof error === "string" && error.trim()) return error;
  if (error && typeof error === "object") {
    const row = error as Record<string, unknown>;
    if (typeof row.message === "string" && row.message.trim()) return row.message;
    const nested = row.error;
    if (typeof nested === "string" && nested.trim()) return nested;
    if (nested && typeof nested === "object") {
      const message = (nested as { message?: unknown }).message;
      if (typeof message === "string" && message.trim()) return message;
    }
  }
  return "Voice error";
}

async function loadVapi(publicKey: string): Promise<VapiLike> {
  const loaded = (await import("@vapi-ai/web")) as { default?: new (apiToken: string) => VapiLike };
  const VapiClient = loaded.default;
  if (!VapiClient) throw new Error("The Vapi Web SDK did not load.");
  return new VapiClient(publicKey);
}

export class VoiceClient {
  private vapi: VapiLike | null = null;

  constructor(private readonly handlers: VoiceClientHandlers) {}

  async connect(sessionId: string): Promise<void> {
    this.disconnect();

    const config = publicVoiceConfig();
    if (!config) {
      this.handlers.onStatus(
        "error",
        "Add NEXT_PUBLIC_VAPI_PUBLIC_KEY and NEXT_PUBLIC_VAPI_ASSISTANT_ID to talk with Clarte. Text chat still works.",
      );
      return;
    }

    this.handlers.onStatus("connecting");

    try {
      const vapi = await loadVapi(config.publicKey);
      this.vapi = vapi;

      vapi.on("call-start", () => this.handlers.onStatus("live"));
      vapi.on("call-end", () => this.handlers.onStatus("closed"));
      vapi.on("call-start-failed", (payload) => {
        const detail =
          payload && typeof payload === "object" && typeof (payload as { error?: unknown }).error === "string"
            ? (payload as { error: string }).error
            : "Voice did not start.";
        this.handlers.onStatus("error", detail);
      });
      vapi.on("message", (message) => this.handleMessage(message));
      vapi.on("error", (error) => {
        const detail = errorText(error);
        this.handlers.onError(detail);
        this.handlers.onStatus("error", detail);
      });

      const call = await vapi.start(config.assistantId, {
        metadata: { sessionId },
        variableValues: { sessionId },
      });

      if (!call) {
        this.handlers.onStatus("error", "Voice did not start. Try again.");
        return;
      }
      this.handlers.onStatus("live");
    } catch (error) {
      this.handlers.onStatus("error", errorText(error));
    }
  }

  private handleMessage(message: unknown): void {
    if (!message || typeof message !== "object") return;
    const row = message as Record<string, unknown>;
    if (row.type !== "transcript") return;

    const text = typeof row.transcript === "string" ? row.transcript : "";
    if (!text.trim()) return;
    const final = row.transcriptType !== "partial";
    if (row.role === "user") this.handlers.onUserTranscript(text, final);
    if (row.role === "assistant" || row.role === "bot") {
      this.handlers.onAssistantTranscript(text, final);
    }
  }

  disconnect(): void {
    const vapi = this.vapi;
    this.vapi = null;
    if (!vapi) return;
    vapi.removeAllListeners();
    void vapi.stop().catch(() => undefined);
  }
}
