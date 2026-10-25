"use client";

import { useEffect, useRef } from "react";
import type { TechDocument, TranscriptEntry } from "@/lib/types";

interface Props {
  transcript: TranscriptEntry[];
  documents: TechDocument[];
}

/** Conversation on top, the documents the coach pulled underneath. */
export default function TranscriptPanel({ transcript, documents }: Props) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [transcript.length]);

  return (
    <aside className="panel">
      <section className="transcript" aria-label="Conversation">
        {transcript.length === 0 ? (
          <p className="muted">
            PABER opens with a question. Say the problem you are stuck on, in one sentence.
          </p>
        ) : (
          transcript.map((entry) => (
            <p key={entry.id} className={`line ${entry.role}`}>
              <span className="who">{entry.role === "paber" ? "PABER" : entry.role === "user" ? "You" : ""}</span>
              {entry.text}
            </p>
          ))
        )}
        <div ref={endRef} />
      </section>

      {documents.length > 0 ? (
        <section className="evidence" aria-label="Retrieved documents">
          <h3>From the library</h3>
          <ul>
            {documents.slice(0, 8).map((document) => (
              <li key={document.id}>
                <a href={document.url} target="_blank" rel="noreferrer">
                  {document.title}
                </a>
                <span className="meta">
                  {document.center ?? document.source} · {document.type}
                </span>
                {document.reason ? <span className="reason">{document.reason}</span> : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </aside>
  );
}
