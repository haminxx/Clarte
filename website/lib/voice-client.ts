/**
 * Vapi Web SDK for the /app session.
 * The browser only receives the public key and assistant id. The private key is never read.
 * PCM audio stays inside @vapi-ai/web. This module does not open a socket until a call starts.
 */

export type VoiceStatus = "idle" | "connecting" | "live" | "closed" | "error";

export const VOICE_UNAVAILABLE =
  "Voice is not configured. Set NEXT_PUBLIC_VAPI_PUBLIC_KEY to talk. Text chat below still works.";

export interface VoiceClientHandlers {
  onStatus: (status: VoiceStatus, detail?: string) => void;
  onUserTranscript: (text: string, final: boolean) => void;
  onAssistantTranscript: (text: string, final: boolean) => void;
  /** Document ids, and an optional spoken-source line, from a tool-calls message. */
  onHighlights: (ids: string[], note?: string) => void;
  onError: (message: string) => void;
}

interface VapiLike {
  on(event: string, listener: (payload?: unknown) => void): void;
  removeAllListeners(): void;
  start(
    assistantId: string,
    overrides: { metadata: { sessionId: string }; variableValues: { sessionId: string } },
  ): Promise<{ id?: string } | null>;
  stop(): Promise<void> | void;
}

export function readVoiceConfig(): { publicKey: string; assistantId: string } | null {
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
  return "Voice did not start. Text chat still works.";
}

export class VoiceClient {
  private vapi: VapiLike | null = null;

  constructor(private readonly handlers: VoiceClientHandlers) {}

  async connect(sessionId: string): Promise<void> {
    this.disconnect();
    const config = readVoiceConfig();
    if (!config) {
      this.handlers.onStatus("error", VOICE_UNAVAILABLE);
      return;
    }

    this.handlers.onStatus("connecting");
    try {
      const loaded = (await import("@vapi-ai/web")) as { default?: new (apiToken: string) => VapiLike };
      const VapiClient = loaded.default;
      if (!VapiClient) throw new Error("The Vapi Web SDK did not load.");
      const vapi = new VapiClient(config.publicKey);
      this.vapi = vapi;

      vapi.on("call-start", () => this.handlers.onStatus("live"));
      vapi.on("call-end", () => this.handlers.onStatus("closed"));
      vapi.on("call-start-failed", (payload) => {
        const detail =
          payload && typeof payload === "object" && typeof (payload as { error?: unknown }).error === "string"
            ? (payload as { error: string }).error
            : "Voice did not start. Text chat still works.";
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
        this.handlers.onStatus("error", "Voice did not start. Text chat still works.");
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
    if (row.type === "transcript") {
      const text = typeof row.transcript === "string" ? row.transcript : "";
      if (!text.trim()) return;
      const final = row.transcriptType !== "partial";
      if (row.role === "user") this.handlers.onUserTranscript(text, final);
      if (row.role === "assistant" || row.role === "bot") this.handlers.onAssistantTranscript(text, final);
      return;
    }

    const ids = new Set<string>();
    const titles: string[] = [];
    collectDocIds(row, ids, titles);
    if (ids.size) this.handlers.onHighlights([...ids], titles.length ? titles.join(" · ") : undefined);
  }

  disconnect(): void {
    const vapi = this.vapi;
    this.vapi = null;
    if (!vapi) return;
    vapi.removeAllListeners();
    void Promise.resolve(vapi.stop()).catch(() => undefined);
  }
}

function collectDocIds(value: unknown, ids: Set<string>, titles: string[], key?: string): void {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if ((trimmed.startsWith("{") || trimmed.startsWith("[")) && trimmed.length < 20000) {
      try {
        collectDocIds(JSON.parse(trimmed) as unknown, ids, titles);
      } catch {
        // Tool results are often JSON strings. Anything else is ignored.
      }
    }
    return;
  }
  if (Array.isArray(value)) {
    if (key === "highlight" || key === "mentionedIds") {
      for (const item of value) if (typeof item === "string" && item) ids.add(item);
    }
    for (const item of value) collectDocIds(item, ids, titles);
    return;
  }
  if (!value || typeof value !== "object") return;
  const row = value as Record<string, unknown>;
  const id = typeof row.docId === "string" ? row.docId : typeof row.id === "string" ? row.id : "";
  const title = typeof row.title === "string" ? row.title : "";
  const looksLikeDoc = title.length > 0 || typeof row.url === "string" || typeof row.type === "string";
  if (id && looksLikeDoc) {
    ids.add(id);
    if (title && !titles.includes(title)) titles.push(title);
  }
  for (const [childKey, child] of Object.entries(row)) collectDocIds(child, ids, titles, childKey);
}
