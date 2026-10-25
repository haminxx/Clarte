"use client";

import type { Stage } from "@/lib/types";

/** The 3-stage flow from plan section 5, shown as the current position in it. */
const STAGES: { id: Stage; label: string; hint: string }[] = [
  { id: "five_whys", label: "5 Whys", hint: "Find the root problem" },
  { id: "why_how_what", label: "Why · How · What", hint: "Structure the idea" },
  { id: "debate", label: "Debate", hint: "Defend it against prior art" },
];

export default function StageBar({ stage }: { stage: Stage }) {
  const activeIndex = STAGES.findIndex((entry) => entry.id === stage);

  return (
    <ol className="stage-bar" aria-label="Conversation stage">
      {STAGES.map((entry, index) => {
        const state = index === activeIndex ? "active" : index < activeIndex ? "done" : "upcoming";
        return (
          <li key={entry.id} className={`stage ${state}`} aria-current={state === "active"}>
            <span className="stage-index">{index + 1}</span>
            <span className="stage-text">
              <strong>{entry.label}</strong>
              <em>{entry.hint}</em>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
