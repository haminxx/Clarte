import { AudioPlayer, MicrophoneStream } from "./audio";
import type { VoiceSession } from "./types";

/**
 * Grok Voice realtime client (plan section 6.1, layer 2).
 *
 * The browser never holds XAI_API_KEY: the API Worker mints an ephemeral client
 * secret, and this client passes it as the WebSocket subprotocol
 * `xai-client-secret.<token>`, which is the documented browser auth path.
 *
 * Tool calls arrive as `response.function_call_arguments.done`. Each one is
 * forwarded to the Worker's tool bridge, the result goes back as a
 * `function_call_output` item, and only once every outstanding call has answered
 * does the client send a single `response.create`.
 */

export type VoiceStatus = "idle" | "connecting" | "live" | "closed" | "error";

export interface VoiceClientHandlers {
  onStatus: (status: VoiceStatus, detail?: string) => void;
  onUserTranscript: (text: string, final: boolean) => void;
  onAssistantTranscript: (text: string, final: boolean) => void;
  onToolCall: (name: string, args: Record<string, unknown>) => Promise<unknown>;
  onError: (message: string) => void;
}

interface RealtimeEvent {
  type: string;
  delta?: string;
  transcript?: string;
  name?: string;
  call_id?: string;
  arguments?: string;
  error?: { message?: string };
}

export class VoiceClient {
  private socket: WebSocket | null = null;
  private readonly microphone = new MicrophoneStream();
  private readonly player = new AudioPlayer();
  private pendingToolCalls = 0;
  private assistantBuffer = "";

  constructor(private readonly handlers: VoiceClientHandlers) {}

  async connect(session: VoiceSession): Promise<void> {
    if (!session.token) {
      this.handlers.onStatus("error", "No Grok Voice token: set XAI_API_KEY on the API Worker.");
      return;
    }

    this.handlers.onStatus("connecting");

    const socket = new WebSocket(session.url, [`xai-client-secret.${session.token}`]);
    this.socket = socket;

    socket.onopen = async () => {
      socket.send(JSON.stringify(session.sessionConfig));
      try {
        await this.microphone.start((base64) => {
          if (socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ type: "input_audio_buffer.append", audio: base64 }));
          }
        });
        this.handlers.onStatus("live");
        // Server VAD handles turn-taking, but Clarte speaks first.
        socket.send(JSON.stringify({ type: "response.create" }));
      } catch (error) {
        this.handlers.onStatus("error", `Microphone blocked: ${String(error)}`);
      }
    };

    socket.onmessage = (message) => {
      if (typeof message.data !== "string") return;
      let event: RealtimeEvent;
      try {
        event = JSON.parse(message.data) as RealtimeEvent;
      } catch {
        return;
      }
      void this.handleEvent(event);
    };

    socket.onerror = () => this.handlers.onError("Voice socket error");

    socket.onclose = (event) => {
      this.microphone.stop();
      this.handlers.onStatus("closed", event.reason || undefined);
    };
  }

  private async handleEvent(event: RealtimeEvent): Promise<void> {
    switch (event.type) {
      case "response.output_audio.delta":
      case "response.audio.delta":
        if (event.delta) this.player.enqueue(event.delta);
        return;

      case "response.output_audio_transcript.delta":
        this.assistantBuffer += event.delta ?? "";
        this.handlers.onAssistantTranscript(this.assistantBuffer, false);
        return;

      case "response.output_audio_transcript.done":
        this.handlers.onAssistantTranscript(event.transcript ?? this.assistantBuffer, true);
        this.assistantBuffer = "";
        return;

      case "conversation.item.input_audio_transcription.updated":
        this.handlers.onUserTranscript(event.transcript ?? event.delta ?? "", false);
        return;

      case "conversation.item.input_audio_transcription.completed":
        this.handlers.onUserTranscript(event.transcript ?? "", true);
        return;

      case "input_audio_buffer.speech_started":
        // The user interrupted: drop whatever assistant audio is still queued.
        this.player.reset();
        return;

      case "response.function_call_arguments.done":
        await this.runToolCall(event);
        return;

      case "error":
        this.handlers.onError(event.error?.message ?? "Unknown realtime error");
        return;

      default:
        return;
    }
  }

  private async runToolCall(event: RealtimeEvent): Promise<void> {
    if (!event.name || !event.call_id || !this.socket) return;
    this.pendingToolCalls += 1;

    let output: unknown;
    try {
      const args = event.arguments ? (JSON.parse(event.arguments) as Record<string, unknown>) : {};
      output = await this.handlers.onToolCall(event.name, args);
    } catch (error) {
      output = { error: String(error) };
    }

    this.socket.send(
      JSON.stringify({
        type: "conversation.item.create",
        item: {
          type: "function_call_output",
          call_id: event.call_id,
          output: JSON.stringify(output),
        },
      }),
    );

    this.pendingToolCalls -= 1;
    // Parallel calls: only ask for the next turn once every result is in.
    if (this.pendingToolCalls === 0) {
      this.socket.send(JSON.stringify({ type: "response.create" }));
    }
  }

  disconnect(): void {
    this.microphone.stop();
    this.player.reset();
    this.socket?.close();
    this.socket = null;
  }
}
