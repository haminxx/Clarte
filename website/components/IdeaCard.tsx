"use client";

import Visuals from "@/components/Visuals";
import type { ReferenceItem, IdeaCardData, Visual } from "@/lib/types";
import { VISUALIZE_AUTH_COPY } from "@/lib/types";

interface Props {
  card: IdeaCardData;
  references: ReferenceItem[];
  visuals: Visual[];
  showAuthCopy: boolean;
  disabledNote: string | null;
  visualizing: boolean;
  onVisualize: () => void;
  onFocus: (docId: string) => void;
  onDownload: () => void;
  onPrint: () => void;
  onClose: () => void;
}

/** Closing artifact: the idea, numbered references, and Grok Imagine visuals. */
export default function IdeaCard({
  card,
  references,
  visuals,
  showAuthCopy,
  disabledNote,
  visualizing,
  onVisualize,
  onFocus,
  onDownload,
  onPrint,
  onClose,
}: Props) {
  return (
    <article className="idea-card" aria-label="Idea card" onClick={(event) => event.stopPropagation()}>
      <header>
        <span className="badge">Idea card</span>
        <button type="button" className="ghost close-card" onClick={onClose}>
          Close
        </button>
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

      <section className="references" aria-label="References">
        <h3>References</h3>
        {references.length === 0 ? (
          <p className="muted">No sources cited yet.</p>
        ) : (
          <ol>
            {references.map((item, index) => (
              <li key={`${item.id}-${index}`}>
                <a
                  href={item.url || undefined}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => onFocus(item.id)}
                >
                  {item.title}
                </a>
                <span className="meta">
                  {[item.type, item.source].filter(Boolean).join(" · ")}
                  {item.url ? (
                    <>
                      {" "}
                      <a href={item.url} target="_blank" rel="noreferrer" onClick={() => onFocus(item.id)}>
                        {item.url}
                      </a>
                    </>
                  ) : null}
                </span>
              </li>
            ))}
          </ol>
        )}
      </section>

      {showAuthCopy ? <p className="visualize-note">{VISUALIZE_AUTH_COPY}</p> : null}
      {disabledNote ? <p className="visualize-note">{disabledNote}</p> : null}

      <Visuals visuals={visuals} />

      <div className="card-actions">
        <button type="button" className="primary" disabled={visualizing} onClick={onVisualize}>
          {visualizing ? "Visualizing…" : "Visualize"}
        </button>
        <button type="button" className="ghost" onClick={onDownload}>
          Download report
        </button>
        <button type="button" className="ghost" onClick={onPrint}>
          Print / PDF
        </button>
      </div>
    </article>
  );
}
