"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import IdeaCard from "@/components/IdeaCard";
import StageBar from "@/components/StageBar";
import TranscriptPanel from "@/components/TranscriptPanel";
import VoiceButton from "@/components/VoiceButton";
import {
  draftIdeaCard,
  fetchCitations,
  fetchGraph,
  fetchMentions,
  sendChat,
  setStage as pushStage,
  startSession,
  visualizeSession,
} from "@/lib/api";
import type {
  GraphPayload,
  IdeaCardData,
  Stage,
  TechDocument,
  TranscriptEntry,
} from "@/lib/types";
import { readVoiceConfig, VOICE_UNAVAILABLE, VoiceClient, type VoiceStatus } from "@/lib/voice-client";

// react-force-graph-3d touches WebGL on import, so it is client-only.
const Graph3D = dynamic(() => import("@/components/Graph3D"), {
  ssr: false,
  loading: () => <div className="graph-loading">Loading the constellation…</div>,
});

export default function Home() {
  const [graph, setGraph] = useState<GraphPayload>({ nodes: [], links: [] });
  const [graphError, setGraphError] = useState<string | null>(null);
  const [highlighted, setHighlighted] = useState<string[]>([]);
  const [documents, setDocuments] = useState<TechDocument[]>([]);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [stage, setStage] = useState<Stage>("five_whys");
  const [status, setStatus] = useState<VoiceStatus>("idle");
  const [detail, setDetail] = useState<string | undefined>();
  const [ideaCard, setIdeaCard] = useState<IdeaCardData | null>(null);
  const [visualNote, setVisualNote] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [visuals, setVisuals] = useState<{ id: string; kind: string; imageUrl: string }[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [textQuery, setTextQuery] = useState("");
  const [sending, setSending] = useState(false);

  const clientRef = useRef<VoiceClient | null>(null);
  const cursorRef = useRef(0);

  useEffect(() => {
    fetchGraph(400)
      .then(setGraph)
      .catch((error: unknown) => setGraphError(String(error)));
  }, []);

  // Highlights also arrive through D1, so the graph stays in sync even when the
  // tool call came from somewhere else (MCP client, curl, a second tab).
  useEffect(() => {
    if (!sessionId) return;
    const timer = setInterval(async () => {
      try {
        const update = await fetchMentions(sessionId, cursorRef.current);
        cursorRef.current = update.cursor;
        if (update.mentions.length) {
          setHighlighted((current) => [
            ...current,
            ...update.mentions.map((mention) => mention.docId).filter((id) => !current.includes(id)),
          ]);
        }
        if (update.stage) setStage(update.stage);
      } catch {
        // Mentions are best-effort. A failed poll must not take down the page.
      }
      try {
        const citations = await fetchCitations(sessionId);
        if (citations.length) setDocuments(citations);
      } catch (error) {
        setNotice(error instanceof Error ? error.message : "Citations are not available yet.");
      }
    }, 1500);
    return () => clearInterval(timer);
  }, [sessionId]);

  const appendTranscript = useCallback((role: TranscriptEntry["role"], text: string, final: boolean) => {
    if (!text.trim()) return;
    setTranscript((current) => {
      const last = current[current.length - 1];
      if (last && last.role === role && !final && last.id.startsWith("live-")) {
        return [...current.slice(0, -1), { ...last, text }];
      }
      return [...current, { id: `${final ? "final" : "live-"}${role}-${current.length}`, role, text }];
    });
  }, []);

  useEffect(() => {
    if (!readVoiceConfig()) setDetail(VOICE_UNAVAILABLE);
  }, []);

  const start = useCallback(async () => {
    if (!readVoiceConfig()) {
      setStatus("idle");
      setDetail(VOICE_UNAVAILABLE);
      return;
    }
    try {
      setStatus("connecting");
      const session = await startSession(sessionId ?? undefined);
      setSessionId(session.sessionId);

      const client = new VoiceClient({
        onStatus: (next, why) => {
          setStatus(next);
          setDetail(why);
        },
        onUserTranscript: (text, final) => appendTranscript("user", text, final),
        onAssistantTranscript: (text, final) => appendTranscript("clarte", text, final),
        onError: (message) => setDetail(message),
      });

      clientRef.current = client;
      await client.connect(session.sessionId);
    } catch (error) {
      setStatus("error");
      setDetail(error instanceof Error ? error.message : "Voice did not start. Text chat still works.");
    }
  }, [appendTranscript, sessionId]);

  const stop = useCallback(() => {
    clientRef.current?.disconnect();
    clientRef.current = null;
    setStatus("idle");
  }, []);

  /** Text chat stays available when voice is not configured. */
  const runTextQuery = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();
      const query = textQuery.trim();
      if (!query || sending) return;
      setSending(true);
      setTextQuery("");
      appendTranscript("user", query, true);
      try {
        let activeSession = sessionId;
        if (!activeSession) {
          const session = await startSession();
          activeSession = session.sessionId;
          setSessionId(session.sessionId);
        }
        const turn = await sendChat(activeSession, query);
        if (turn.reply) appendTranscript("clarte", turn.reply, true);
        if (turn.stage) setStage(turn.stage);
        if (turn.highlight.length) {
          setHighlighted((current) => [
            ...current,
            ...turn.highlight.filter((id) => !current.includes(id)),
          ]);
        }
        if (turn.citations.length) setDocuments(turn.citations);
      } catch (error) {
        setNotice(error instanceof Error ? error.message : "Text chat did not go through. You can try again.");
      } finally {
        setSending(false);
      }
    },
    [appendTranscript, sending, sessionId, textQuery],
  );

  const visualize = useCallback(async () => {
    if (!sessionId) {
      setVisualNote("Send a text message first so there is a session to visualize.");
      setNotice("Send a text message first so there is a session to visualize.");
      return;
    }
    try {
      const result = await visualizeSession(sessionId);
      if (result.message) {
        setVisualNote(result.message);
        setNotice(result.message);
        return;
      }
      setVisuals(result.visuals);
      setVisualNote(result.visuals.length ? null : "No images came back.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Visualize did not run.";
      setVisualNote(message);
      setNotice(message);
    }
  }, [sessionId]);

  /** Gemma 4 writes the card server-side; the local assembly is the fallback. */
  const buildIdeaCard = useCallback(async () => {
    const spoken = transcript.filter((entry) => entry.role !== "system");
    const evidenceIds = documents.slice(0, 3).map((document) => document.id);

    if (sessionId) {
      try {
        const { card } = await draftIdeaCard(
          sessionId,
          spoken.map((entry) => ({ role: entry.role, text: entry.text })),
          evidenceIds,
        );
        setIdeaCard(card);
        return;
      } catch (error) {
        setNotice(error instanceof Error ? error.message : "Could not draft the idea card.");
      }
    }

    setIdeaCard({
      problem: spoken.find((entry) => entry.role === "user")?.text ?? "Untitled problem",
      rootCause: spoken.filter((entry) => entry.role === "user").slice(-1)[0]?.text ?? "—",
      solution: spoken.filter((entry) => entry.role === "clarte").slice(-1)[0]?.text ?? "—",
      evidence: documents.slice(0, 3).map((document) => ({
        id: document.id,
        title: document.title,
        url: document.url,
      })),
      risk: "Remaining risks are whatever Clarte raised in the debate.",
    });
  }, [documents, sessionId, transcript]);

  const nodeCount = useMemo(() => graph.nodes.length, [graph.nodes.length]);

  return (
    <main className="shell">
      <div className="graph-layer">
        {graphError ? (
          <div className="graph-loading">
            Could not reach the Clarte API. Start it with <code>npm run dev</code> in{" "}
            <code>product/</code>.
          </div>
        ) : (
          <Graph3D graph={graph} highlighted={highlighted} />
        )}
      </div>

      <header className="top">
        <div className="brand">
          <h1>Clarte</h1>
          <p>
            A library of papers, patents and NASA technology — and a voice coach that makes you
            defend your idea.
          </p>
        </div>
        <StageBar
          stage={stage}
          onSelect={(next) => {
            setStage(next);
            if (sessionId) void pushStage(sessionId, next).catch(() => undefined);
          }}
        />
      </header>

      <TranscriptPanel transcript={transcript} documents={documents} />

      <footer className="bottom">
        <VoiceButton status={status} detail={detail} onStart={start} onStop={stop} />
        {notice ? <p className="voice-detail" role="status">{notice}</p> : null}

        <form className="text-mode" onSubmit={runTextQuery}>
          <input
            value={textQuery}
            onChange={(event) => setTextQuery(event.target.value)}
            placeholder={
              stage === "debate" ? "Describe your idea to be argued against…" : "Or type the problem…"
            }
            aria-label="Text mode query"
          />
          <button type="submit" disabled={sending}>{sending ? "Sending…" : "Send"}</button>
        </form>

        <div className="status-row">
          <span>{nodeCount} nodes loaded</span>
          {highlighted.length > 0 ? <span>{highlighted.length} lit up</span> : null}
          <button type="button" className="ghost" onClick={() => void buildIdeaCard()}>
            Make idea card
          </button>
          <button type="button" className="ghost" onClick={() => void visualize()}>
            Visualize
          </button>
        </div>
      </footer>

      {ideaCard ? (
        <div className="idea-layer" onClick={() => setIdeaCard(null)} role="presentation">
          <IdeaCard card={ideaCard} note={visualNote} visuals={visuals} />
        </div>
      ) : null}
    </main>
  );
}
