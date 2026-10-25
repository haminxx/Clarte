"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import IdeaCard from "@/components/IdeaCard";
import SignIn from "@/components/SignIn";
import SourcesPanel from "@/components/SourcesPanel";
import StageBar from "@/components/StageBar";
import TranscriptPanel from "@/components/TranscriptPanel";
import VoiceButton from "@/components/VoiceButton";
import {
  callTool,
  downloadReport,
  fetchCitations,
  fetchGraph,
  fetchMe,
  fetchMentions,
  fetchSession,
  fetchVisuals,
  saveIdeaCard,
  sendChat,
  setStage as pushStage,
  startSession,
  visualizeIdea,
} from "@/lib/api";
import { buildReferences } from "@/lib/citations";
import type { Citation, GraphPayload, IdeaCardData, Me, Stage, TranscriptEntry, Visual } from "@/lib/types";
import { VISUALIZE_AUTH_COPY, isStage } from "@/lib/types";
import { VoiceClient, type VoiceStatus } from "@/lib/voice-client";

const Graph3D = dynamic(() => import("@/components/Graph3D"), {
  ssr: false,
  loading: () => <div className="graph-loading">Loading the constellation…</div>,
});

const EMPTY_ME: Me = { user: null, xaiKey: { connected: false, last4: null } };

export default function SessionScreen() {
  const [graph, setGraph] = useState<GraphPayload>({ nodes: [], links: [] });
  const [graphError, setGraphError] = useState<string | null>(null);
  const [highlighted, setHighlighted] = useState<string[]>([]);
  const [focus, setFocus] = useState<{ id: string; token: number } | null>(null);
  const [citations, setCitations] = useState<Citation[]>([]);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [stage, setStage] = useState<Stage>("five_whys");
  const [status, setStatus] = useState<VoiceStatus>("idle");
  const [detail, setDetail] = useState<string | undefined>();
  const [ideaCard, setIdeaCard] = useState<IdeaCardData | null>(null);
  const [cardOpen, setCardOpen] = useState(false);
  const [visuals, setVisuals] = useState<Visual[]>([]);
  const [visualizing, setVisualizing] = useState(false);
  const [visualizeError, setVisualizeError] = useState<"auth" | "disabled" | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [textQuery, setTextQuery] = useState("");
  const [sending, setSending] = useState(false);
  const [me, setMe] = useState<Me | null>(null);
  const [authLoaded, setAuthLoaded] = useState(false);

  const clientRef = useRef<VoiceClient | null>(null);
  const cursorRef = useRef(0);
  const seenIdea = useRef("");

  const refreshMe = useCallback(async () => {
    try {
      setMe(await fetchMe());
    } catch {
      setMe(EMPTY_ME);
    } finally {
      setAuthLoaded(true);
    }
  }, []);

  useEffect(() => {
    void refreshMe();
    const onFocus = () => void refreshMe();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refreshMe]);

  useEffect(() => {
    fetchGraph(400)
      .then(setGraph)
      .catch((error: unknown) => setGraphError(String(error)));
  }, []);

  useEffect(() => {
    if (!sessionId) return;
    const timer = window.setInterval(async () => {
      const [mentions, nextCitations, session, nextVisuals] = await Promise.allSettled([
        fetchMentions(sessionId, cursorRef.current),
        fetchCitations(sessionId),
        fetchSession(sessionId),
        fetchVisuals(sessionId),
      ]);

      if (mentions.status === "fulfilled") {
        cursorRef.current = mentions.value.cursor;
        if (mentions.value.mentions.length) {
          setHighlighted((current) => mergeIds(current, mentions.value.mentions.map((mention) => mention.docId)));
        }
        if (mentions.value.stage) setStage(mentions.value.stage);
      }
      if (nextCitations.status === "fulfilled") setCitations((current) => mergeCitations(current, nextCitations.value));
      if (session.status === "fulfilled") {
        if (session.value.stage) setStage(session.value.stage);
        if (session.value.idea) {
          const key = JSON.stringify(session.value.idea);
          setIdeaCard(session.value.idea);
          if (key !== seenIdea.current) {
            seenIdea.current = key;
            setCardOpen(true);
          }
        }
      }
      if (nextVisuals.status === "fulfilled" && nextVisuals.value.length) setVisuals(nextVisuals.value);
    }, 1500);
    return () => window.clearInterval(timer);
  }, [sessionId]);

  const appendTranscript = useCallback((role: TranscriptEntry["role"], text: string, final: boolean) => {
    if (!text.trim()) return;
    setTranscript((current) => {
      const last = current[current.length - 1];
      if (last && last.role === role && last.id.startsWith("live-")) {
        return [...current.slice(0, -1), { ...last, id: final ? `final-${role}-${current.length}` : last.id, text }];
      }
      return [...current, { id: `${final ? "final" : "live-"}${role}-${current.length}`, role, text }];
    });
  }, []);

  const ensureSession = useCallback(async () => {
    if (sessionId) return sessionId;
    const session = await startSession();
    setSessionId(session.sessionId);
    if (session.stage) setStage(session.stage);
    return session.sessionId;
  }, [sessionId]);

  const start = useCallback(async () => {
    try {
      setStatus("connecting");
      const active = await ensureSession();
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
      await client.connect(active);
    } catch (error) {
      setStatus("error");
      setDetail(error instanceof Error ? error.message : "Voice did not start.");
    }
  }, [appendTranscript, ensureSession]);

  const stop = useCallback(() => {
    clientRef.current?.disconnect();
    clientRef.current = null;
    setStatus("idle");
  }, []);

  const applyHits = useCallback((ids: string[], nextCitations: Citation[]) => {
    if (ids.length) setHighlighted((current) => mergeIds(current, ids));
    if (nextCitations.length) setCitations((current) => mergeCitations(current, nextCitations));
  }, []);

  const runTextQuery = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();
      const query = textQuery.trim();
      if (!query || sending) return;
      setSending(true);
      setTextQuery("");
      appendTranscript("user", query, true);
      try {
        const active = await ensureSession();
        try {
          const turn = await sendChat(active, query);
          if (turn.reply) appendTranscript("clarte", turn.reply, true);
          if (turn.stage && isStage(turn.stage)) setStage(turn.stage);
          applyHits(turn.highlight, turn.citations);
        } catch (error) {
          const missing = error instanceof Error && error.message.includes("404");
          if (!missing) throw error;
          const tool = stage === "debate" || stage === "visualize" ? "market_evidence" : "search_tech";
          const result = await callTool(active, tool, {
            [tool === "market_evidence" ? "idea" : "query"]: query,
          });
          if (result.summary) appendTranscript("clarte", result.summary, true);
          applyHits(result.highlight, result.citations);
        }
      } catch (error) {
        setDetail(error instanceof Error ? error.message : "Text chat failed.");
      } finally {
        setSending(false);
      }
    },
    [appendTranscript, applyHits, ensureSession, sending, stage, textQuery],
  );

  const openIdeaCard = useCallback(async () => {
    const spoken = transcript.filter((entry) => entry.role !== "system");
    let active = sessionId;
    if (!active) {
      try {
        active = await ensureSession();
      } catch (error) {
        setDetail(error instanceof Error ? error.message : "Could not start a session.");
      }
    }

    if (active) {
      try {
        const state = await fetchSession(active);
        if (state.idea) {
          setIdeaCard(state.idea);
          setCardOpen(true);
          return;
        }
      } catch {
        // Assemble a local card when the API has not stored one yet.
      }
    }

    const evidence = citations.slice(0, 3).map((citation) => ({
      id: citation.docId,
      title: citation.title,
      url: citation.url,
      source: citation.source,
      type: citation.type,
    }));
    const card: IdeaCardData = {
      problem: spoken.find((entry) => entry.role === "user")?.text ?? "Untitled problem",
      rootCause: spoken.filter((entry) => entry.role === "user").at(-1)?.text ?? "—",
      solution: spoken.filter((entry) => entry.role === "clarte").at(-1)?.text ?? "—",
      evidence,
      risk: "Remaining risks are whatever Clarte Coach raised in the debate.",
    };
    if (active) {
      try {
        await saveIdeaCard(active, card);
      } catch (error) {
        setDetail(error instanceof Error ? error.message : "Could not save the idea card.");
      }
    }
    setIdeaCard(card);
    setCardOpen(true);
  }, [citations, ensureSession, sessionId, transcript]);

  const onVisualize = useCallback(async () => {
    if (!sessionId) return;
    setVisualizing(true);
    setVisualizeError(null);
    try {
      const result = await visualizeIdea(sessionId);
      if (result.error === "sign_in_required" || result.error === "key_required") setVisualizeError("auth");
      else if (result.error === "disabled") setVisualizeError("disabled");
      if (result.visuals.length) setVisuals(result.visuals);
    } catch (error) {
      setDetail(error instanceof Error ? error.message : "Visualize failed.");
    } finally {
      setVisualizing(false);
    }
  }, [sessionId]);

  const focusSource = useCallback((docId: string) => {
    setFocus({ id: docId, token: Date.now() });
    setHighlighted((current) => mergeIds(current, [docId]));
  }, []);

  const canVisualize = Boolean(me?.user && me.xaiKey.connected);
  const showAuthCopy = authLoaded && !canVisualize;
  const nodeCount = useMemo(() => graph.nodes.length, [graph.nodes.length]);
  const references = ideaCard ? buildReferences(ideaCard, citations) : [];

  return (
    <main className="shell">
      <div className="graph-layer">
        {graphError ? (
          <div className="graph-loading">
            Could not reach the Clarte API at the configured <code>NEXT_PUBLIC_CLARTE_API</code>. Text chat needs that
            Worker. The graph will fill in once it answers.
          </div>
        ) : (
          <Graph3D graph={graph} highlighted={highlighted} focusId={focus?.id} focusToken={focus?.token} />
        )}
      </div>

      <header className="top">
        <div className="brand">
          <h1>
            <Link href="/">Clarte</Link>
          </h1>
          <p>Clarte Coach. Talk through the problem. Every source stays clickable.</p>
        </div>
        <div className="top-actions">
          <SignIn me={me} loaded={authLoaded} onRefresh={refreshMe} onError={setDetail} />
          <StageBar
            stage={stage}
            onSelect={(next) => {
              setStage(next);
              if (sessionId) void pushStage(sessionId, next).catch(() => undefined);
            }}
          />
        </div>
      </header>

      <SourcesPanel citations={citations} onFocus={focusSource} />
      <TranscriptPanel transcript={transcript} citations={citations} onFocus={focusSource} />

      <footer className="bottom">
        <VoiceButton status={status} detail={detail} onStart={() => void start()} onStop={stop} />
        <form className="text-mode" onSubmit={(event) => void runTextQuery(event)}>
          <input
            value={textQuery}
            onChange={(event) => setTextQuery(event.target.value)}
            placeholder={stage === "debate" ? "Type a defense for Clarte Coach…" : "Or type the problem…"}
            aria-label="Text mode message"
            disabled={sending}
          />
          <button type="submit" disabled={sending}>
            {sending ? "Sending…" : "Send"}
          </button>
        </form>
        <div className="status-row">
          <span>{nodeCount} nodes loaded</span>
          {highlighted.length > 0 ? <span>{highlighted.length} lit up</span> : null}
          <button type="button" className="ghost" onClick={() => void openIdeaCard()}>
            Make idea card
          </button>
        </div>
      </footer>

      {cardOpen && ideaCard ? (
        <div className="idea-layer" onClick={() => setCardOpen(false)} role="presentation">
          <IdeaCard
            card={ideaCard}
            references={references}
            visuals={visuals}
            showAuthCopy={showAuthCopy || visualizeError === "auth"}
            disabledNote={
              visualizeError === "disabled" && canVisualize
                ? "Visualization is turned off on this server."
                : null
            }
            visualizing={visualizing}
            onVisualize={() => void onVisualize()}
            onFocus={focusSource}
            onDownload={() => {
              if (!sessionId) return;
              void downloadReport(sessionId).catch((error: unknown) =>
                setDetail(error instanceof Error ? error.message : "Could not download the report."),
              );
            }}
            onPrint={() => window.print()}
            onClose={() => setCardOpen(false)}
          />
        </div>
      ) : null}
      {showAuthCopy && cardOpen ? <span className="sr-only">{VISUALIZE_AUTH_COPY}</span> : null}
    </main>
  );
}

function mergeIds(current: string[], incoming: string[]): string[] {
  const next = [...current];
  let changed = false;
  for (const id of incoming) {
    if (!id || next.includes(id)) continue;
    next.push(id);
    changed = true;
  }
  return changed ? next : current;
}

function mergeCitations(current: Citation[], incoming: Citation[]): Citation[] {
  const map = new Map(current.map((citation) => [citation.docId, citation]));
  let changed = false;
  for (const citation of incoming) {
    const previous = map.get(citation.docId);
    if (
      !previous ||
      previous.url !== citation.url ||
      previous.title !== citation.title ||
      previous.stage !== citation.stage
    ) {
      map.set(citation.docId, citation);
      changed = true;
    }
  }
  return changed ? [...map.values()] : current;
}
