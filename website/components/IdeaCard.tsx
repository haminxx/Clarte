"use client";

import type { IdeaCardData } from "@/lib/types";

/** The closing artifact of a session: problem, root cause, solution, evidence, risk. */
export default function IdeaCard({
  card,
  note,
  visuals = [],
}: {
  card: IdeaCardData;
  note?: string | null;
  visuals?: { id: string; kind: string; imageUrl: string }[];
}) {
  return (
    <article className="idea-card" aria-label="Idea card">
      <header>
        <span className="badge">Idea card</span>
        <h2>{card.problem}</h2>
      </header>

      <dl>
        <div>
          <dt>Root cause</dt>
          <dd>{card.rootCause}</dd>
        </div>
        <div>
          <dt>Solution</dt>
          <dd>{card.solution}</dd>
        </div>
        <div>
          <dt>Biggest open risk</dt>
          <dd>{card.risk}</dd>
        </div>
      </dl>

      <footer>
        <h3>Evidence</h3>
        <ul>
          {card.evidence.map((item) => (
            <li key={item.id}>
              <a href={item.url} target="_blank" rel="noreferrer">
                {item.title}
              </a>
            </li>
          ))}
        </ul>
        {note ? <p className="voice-detail">{note}</p> : null}
        {visuals.length > 0 ? (
          <ul>
            {visuals.map((visual) => (
              <li key={visual.id}>
                <img src={visual.imageUrl} alt={visual.kind} />
              </li>
            ))}
          </ul>
        ) : null}
      </footer>
    </article>
  );
}
