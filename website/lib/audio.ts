/**
 * Microphone capture and playback for the Grok Voice socket.
 * Both directions are 24 kHz mono PCM16, which is the realtime API default.
 */

export const SAMPLE_RATE = 24000;

export function encodeBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let index = 0; index < bytes.length; index++) binary += String.fromCharCode(bytes[index]);
  return btoa(binary);
}

export function decodeBase64(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index++) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

function floatToPcm16(input: Float32Array): Uint8Array {
  const output = new DataView(new ArrayBuffer(input.length * 2));
  for (let index = 0; index < input.length; index++) {
    const clamped = Math.max(-1, Math.min(1, input[index]));
    output.setInt16(index * 2, clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff, true);
  }
  return new Uint8Array(output.buffer);
}

export class MicrophoneStream {
  private context: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private processor: ScriptProcessorNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;

  /** Resolves once the mic is live; `onChunk` then receives base64 PCM16 frames. */
  async start(onChunk: (base64: string) => void): Promise<void> {
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true },
    });

    this.context = new AudioContext({ sampleRate: SAMPLE_RATE });
    await this.context.resume();
    this.source = this.context.createMediaStreamSource(this.stream);

    // ScriptProcessorNode is deprecated but needs no separate worklet file, which
    // keeps the statically exported site to a single bundle. 4096 frames ≈ 170 ms.
    this.processor = this.context.createScriptProcessor(4096, 1, 1);
    this.processor.onaudioprocess = (event) => {
      onChunk(encodeBase64(floatToPcm16(event.inputBuffer.getChannelData(0))));
    };

    this.source.connect(this.processor);
    this.processor.connect(this.context.destination);
  }

  stop(): void {
    this.processor?.disconnect();
    this.source?.disconnect();
    this.stream?.getTracks().forEach((track) => track.stop());
    void this.context?.close();
    this.processor = null;
    this.source = null;
    this.stream = null;
    this.context = null;
  }
}

/** Sequential playback queue for `response.output_audio.delta` frames. */
export class AudioPlayer {
  private context: AudioContext | null = null;
  private playheadAt = 0;

  private ensureContext(): AudioContext {
    this.context ??= new AudioContext({ sampleRate: SAMPLE_RATE });
    void this.context.resume();
    return this.context;
  }

  enqueue(base64: string): void {
    const context = this.ensureContext();
    const bytes = decodeBase64(base64);
    const samples = new Int16Array(bytes.buffer, bytes.byteOffset, Math.floor(bytes.byteLength / 2));

    const buffer = context.createBuffer(1, samples.length, SAMPLE_RATE);
    const channel = buffer.getChannelData(0);
    for (let index = 0; index < samples.length; index++) channel[index] = samples[index] / 0x8000;

    const node = context.createBufferSource();
    node.buffer = buffer;
    node.connect(context.destination);

    const startAt = Math.max(context.currentTime, this.playheadAt);
    node.start(startAt);
    this.playheadAt = startAt + buffer.duration;
  }

  /** Called when the user interrupts, so queued assistant audio stops. */
  reset(): void {
    this.playheadAt = 0;
    void this.context?.close();
    this.context = null;
  }
}
