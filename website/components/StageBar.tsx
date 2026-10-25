"use client";

import type { Stage } from "@/lib/types";

/** The conversation stages from plan section 5, including the final visualize step. */
const STAGES: { id: Stage; label: string; hint: string }[] = [
  { id: "five_whys", label: "5 Whys", hint: "Find the root problem" },
  { id: "why_how_what", label: "Why · How · What", hint: "Structure the idea" },
  { id: "debate", label: "Debate", hint: "Defend it against prior art" },
  { id: "visualize", label: "Visualize", hint: "Render the final idea" },
];

interface Props {
  stage: Stage;
  /** The coach normally advances the stage; this lets a presenter jump stages. */
  onSelect?: (stage: Stage) => void;
}

export default function StageBar({ stage, onSelect }: Props) {
  const activeIndex = STAGES.findIndex((entry) => entry.id === stage);

  return (
    <ol className="stage-bar" aria-label="Conversation stage">
      {STAGES.map((entry, index) => {
        const state = index === activeIndex ? "active" : index < activeIndex ? "done" : "upcoming";
        return (
          <li key={entry.id}>
            <button
              type="button"
              className={`stage ${state}`}
              aria-current={state === "active"}
              onClick={() => onSelect?.(entry.id)}
            >
              <span className="stage-index">{index + 1}</span>
              <span className="stage-text">
                <strong>{entry.label}</strong>
                <em>{entry.hint}</em>
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
