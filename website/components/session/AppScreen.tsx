"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import IdeaCard from "@/components/IdeaCard";
import StageBar from "@/components/StageBar";
import TranscriptPanel from "@/components/TranscriptPanel";
import VoiceButton from "@/components/VoiceButton";
import {
  callTool,
  draftIdeaCard,
  fetchGraph,
  fetchMentions,
  setStage as pushStage,
  startSession,
} from "@/lib/api";
import type {
  GraphPayload,
  IdeaCardData,
  Objection,
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

const STAGE_ORDER: Stage[] = ["five_whys", "why_how_what", "debate"];

/**
 * Which stage a tool call implies. `search_tech` is used in every stage, so the
 * pill only ever moves forward — a stage-2 search must not drag it back to 1.
 */
const STAGE_FOR_TOOL: Record<string, Stage> = {
  find_related: "why_how_what",
  market_evidence: "debate",
};

export default function Home() {
  const [graph, setGraph] = useState<GraphPayload>({ nodes: [], links: [] });
  const [graphError, setGraphError] = useState<string | null>(null);
  const [highlighted, setHighlighted] = useState<string[]>([]);
  const [documents, setDocuments] = useState<TechDocument[]>([]);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [stage, setStage] = useState<Stage>("five_whys");
  const [status, setStatus] = useState<VoiceStatus>("idle");
  const [detail, setDetail] = useState<string | undefined>();
  const [objections, setObjections] = useState<Objection[]>([]);
  const [ideaCard, setIdeaCard] = useState<IdeaCardData | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [textQuery, setTextQuery] = useState("");

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
        setStage(update.stage);
      } catch {
        // Polling is best-effort; the voice path already sets highlights directly.
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

  const handleToolCall = useCallback(
    async (name: string, args: Record<string, unknown>) => {
      const activeSession = sessionId ?? "local";
      const response = await callTool(activeSession, name, args);

      setHighlighted((current) => [
        ...current,
        ...response.highlight.filter((id) => !current.includes(id)),
      ]);

      const returned = (response.documents ?? response.evidence) as TechDocument[] | undefined;
      if (returned?.length) setDocuments(returned);
      if (Array.isArray(response.objections)) setObjections(response.objections as Objection[]);

      const implied = STAGE_FOR_TOOL[name];
      if (implied && STAGE_ORDER.indexOf(implied) > STAGE_ORDER.indexOf(stage)) {
        setStage(implied);
        void pushStage(activeSession, implied).catch(() => undefined);
      }

      appendTranscript("system", response.summary, true);
      return response;
    },
    [appendTranscript, sessionId, stage],
  );

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

  /** Backup path from plan section 10: same tools, typed instead of spoken. */
  const runTextQuery = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();
      const query = textQuery.trim();
      if (!query) return;

      let activeSession = sessionId;
      if (!activeSession) {
        const session = await startSession();
        activeSession = session.sessionId;
        setSessionId(session.sessionId);
      }

      appendTranscript("user", query, true);
      setTextQuery("");
      await handleToolCall(stage === "debate" ? "market_evidence" : "search_tech", {
        [stage === "debate" ? "idea" : "query"]: query,
      }).catch((error: unknown) => setDetail(String(error)));
    },
    [appendTranscript, handleToolCall, sessionId, stage, textQuery],
  );

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
        setDetail(`Could not draft the card with Gemma: ${String(error)}`);
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
      risk: objections[0]?.claim ?? "No prior art strong enough to object yet.",
    });
  }, [documents, objections, sessionId, transcript]);

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

        <form className="text-mode" onSubmit={runTextQuery}>
          <input
            value={textQuery}
            onChange={(event) => setTextQuery(event.target.value)}
            placeholder={
              stage === "debate" ? "Describe your idea to be argued against…" : "Or type the problem…"
            }
            aria-label="Text mode query"
          />
          <button type="submit">Search the library</button>
        </form>

        <div className="status-row">
          <span>{nodeCount} nodes loaded</span>
          {highlighted.length > 0 ? <span>{highlighted.length} lit up</span> : null}
          <button type="button" className="ghost" onClick={() => void buildIdeaCard()}>
            Make idea card
          </button>
        </div>
      </footer>

      {ideaCard ? (
        <div className="idea-layer" onClick={() => setIdeaCard(null)} role="presentation">
          <IdeaCard card={ideaCard} />
        </div>
      ) : null}
    </main>
  );
}
