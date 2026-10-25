"use client";

import { useEffect, useRef } from "react";
import { citationsForLine } from "@/lib/citations";
import type { Citation, TranscriptEntry } from "@/lib/types";

interface Props {
  transcript: TranscriptEntry[];
  citations: Citation[];
  onFocus: (docId: string) => void;
}

/** Live conversation. Lines that name a source get an inline link chip. */
export default function TranscriptPanel({ transcript, citations, onFocus }: Props) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [transcript.length, citations.length]);

  return (
    <aside className="panel">
      <section className="transcript" aria-label="Conversation">
        {transcript.length === 0 ? (
          <p className="muted">
            Clarte opens with a question. Say the problem you are stuck on, in one sentence.
          </p>
        ) : (
          transcript.map((entry) => {
            const chips = citationsForLine(entry, citations);
            return (
              <p key={entry.id} className={`line ${entry.role}`}>
                <span className="who">
                  {entry.role === "clarte" ? "Clarte Coach" : entry.role === "user" ? "You" : ""}
                </span>
                {entry.text}
                {chips.length > 0 ? (
                  <span className="chips">
                    {chips.map((citation) => (
                      <a
                        key={citation.docId}
                        className="chip"
                        href={citation.url || undefined}
                        target="_blank"
                        rel="noreferrer"
                        onClick={() => onFocus(citation.docId)}
                      >
                        {citation.title}
                      </a>
                    ))}
                  </span>
                ) : null}
              </p>
            );
          })
        )}
        <div ref={endRef} />
      </section>
    </aside>
  );
}
