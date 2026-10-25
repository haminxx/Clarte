"use client";

import type { Visual } from "@/lib/types";

const KIND_LABEL: Record<string, string> = {
  concept: "Concept",
  system_diagram: "System diagram",
  paper_figure: "Paper figure",
  video: "Concept video",
};

export function visualLabel(kind: string): string {
  return KIND_LABEL[kind] ?? "Visual";
}

/** Grok Imagine results for the confirmed idea. Image URLs may be temporary, so the browser caches them. */
export default function Visuals({ visuals }: { visuals: Visual[] }) {
  if (!visuals.length) return null;

  return (
    <section className="visuals" aria-label="Idea visuals">
      <h3>Visuals</h3>
      <ul>
        {visuals.map((visual) => (
          <li key={visual.id}>
            <figure>
              {visual.imageUrl ? (
                // Grok Imagine returns arbitrary remote URLs; a plain img keeps the static export free of a remote image allowlist.
                // eslint-disable-next-line @next/next/no-img-element
                <img src={visual.imageUrl} alt={visualLabel(visual.kind)} />
              ) : null}
              <figcaption>
                <strong>{visualLabel(visual.kind)}</strong>
                {visual.prompt ? <p>{visual.prompt}</p> : null}
              </figcaption>
            </figure>
          </li>
        ))}
      </ul>
    </section>
  );
}
