"use client";

import type { Citation } from "@/lib/types";

interface Props {
  citations: Citation[];
  onFocus: (docId: string) => void;
}

/** Cited sources beside the graph. Each row opens the original page and focuses its node. */
export default function SourcesPanel({ citations, onFocus }: Props) {
  return (
    <aside className="sources" aria-label="Sources">
      <h2>Sources</h2>
      {citations.length === 0 ? (
        <p className="muted">Papers, patents, and reports Clarte cites will show up here with their links.</p>
      ) : (
        <ul>
          {citations.map((citation) => (
            <li key={citation.docId}>
              <a
                href={citation.url || undefined}
                target="_blank"
                rel="noreferrer"
                onClick={() => onFocus(citation.docId)}
              >
                {citation.title}
              </a>
              <span className="meta">
                {[citation.type, citation.source].filter(Boolean).join(" · ") || "source"}
              </span>
              {citation.url ? (
                <a
                  className="source-url"
                  href={citation.url}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => onFocus(citation.docId)}
                >
                  {citation.url}
                </a>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}
