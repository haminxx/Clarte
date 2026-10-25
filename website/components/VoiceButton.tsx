"use client";

import type { VoiceStatus } from "@/lib/voice-client";

const LABEL: Record<VoiceStatus, string> = {
  idle: "Talk with Clarte Coach",
  connecting: "Connecting…",
  live: "Listening — tap to stop",
  closed: "Start talking",
  error: "Retry",
};

interface Props {
  status: VoiceStatus;
  detail?: string;
  onStart: () => void;
  onStop: () => void;
}

export default function VoiceButton({ status, detail, onStart, onStop }: Props) {
  const live = status === "live" || status === "connecting";

  return (
    <div className="voice">
      <button
        type="button"
        className={`mic ${status}`}
        onClick={live ? onStop : onStart}
        aria-pressed={live}
        aria-label={LABEL[status]}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 15a3.5 3.5 0 0 0 3.5-3.5v-5a3.5 3.5 0 1 0-7 0v5A3.5 3.5 0 0 0 12 15Z" />
          <path d="M18.5 11.5a6.5 6.5 0 0 1-13 0M12 18v3" />
        </svg>
      </button>
      <p className="voice-label">{LABEL[status]}</p>
      {detail ? <p className="voice-detail">{detail}</p> : null}
    </div>
  );
}
