import type {
  Citation,
  GraphPayload,
  IdeaCardData,
  IdeaEvidence,
  Me,
  Stage,
  Visual,
  VisualKind,
} from "./types";
import { VISUAL_KINDS, isStage } from "./types";

/** Base URL of the Clarte API Worker. The browser never receives a private key. */
export const API_BASE = (process.env.NEXT_PUBLIC_CLARTE_API ?? "http://localhost:8787").replace(
  /\/$/,
  "",
);

export const GOOGLE_AUTH_URL = `${API_BASE}/auth/google`;

function safeDetail(value: string): string {
  return value.replace(/xai-[A-Za-z0-9_-]+/gi, "xai-…").replace(/sk-[A-Za-z0-9_-]+/g, "sk-…");
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      ...(init?.body ? { "content-type": "application/json" } : {}),
      ...(init?.headers ?? {}),
    },
  });

  const text = await response.text();
  let body: unknown = null;
  if (text) {
    try {
      body = JSON.parse(text) as unknown;
    } catch {
      body = text;
    }
  }

  if (!response.ok) {
    const raw =
      body && typeof body === "object" && "error" in body && typeof body.error === "string"
        ? body.error
        : "";
    const detail = raw ? `: ${safeDetail(raw)}` : "";
    throw new Error(`${init?.method ?? "GET"} ${path} failed: ${response.status}${detail}`);
  }

  return body as T;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

export function normalizeCitation(value: unknown): Citation | null {
  const row = asRecord(value);
  if (!row) return null;
  const docId = asString(row.docId ?? row.id);
  const url = asString(row.url);
  const title = asString(row.title);
  if (!docId && !url && !title) return null;
  return {
    docId: docId || url || title,
    url,
    title: title || url || "Untitled source",
    source: asString(row.source),
    type: asString(row.type),
    stage: asString(row.stage),
  };
}

export function normalizeCitations(value: unknown): Citation[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const citations: Citation[] = [];
  for (const item of value) {
    const citation = normalizeCitation(item);
    if (!citation || seen.has(citation.docId)) continue;
    seen.add(citation.docId);
    citations.push(citation);
  }
  return citations;
}

function parseEvidence(value: unknown): IdeaEvidence | null {
  const row = asRecord(value);
  if (!row) return null;
  const id = asString(row.id ?? row.docId);
  const url = asString(row.url);
  const title = asString(row.title);
  if (!id && !url && !title) return null;
  return {
    id: id || url || title,
    title: title || url || "Untitled source",
    url,
    source: asString(row.source) || undefined,
    type: asString(row.type) || undefined,
  };
}

export function parseIdea(value: unknown): IdeaCardData | null {
  const row = asRecord(value);
  if (!row) return null;
  if (typeof row.problem !== "string" && typeof row.solution !== "string") return null;
  const evidence = Array.isArray(row.evidence)
    ? row.evidence.flatMap((item) => {
        const parsed = parseEvidence(item);
        return parsed ? [parsed] : [];
      })
    : [];
  return {
    problem: asString(row.problem, "Untitled problem"),
    rootCause: asString(row.rootCause, "—"),
    solution: asString(row.solution, "—"),
    evidence,
    risk: asString(row.risk, "—"),
  };
}

export function fetchGraph(limit = 400): Promise<GraphPayload> {
  return request<GraphPayload>(`/api/graph?limit=${limit}`);
}

export interface SessionStart {
  sessionId: string;
  stage: Stage | null;
}

export async function startSession(sessionId?: string): Promise<SessionStart> {
  const raw = await request<unknown>("/api/session", {
    method: "POST",
    body: JSON.stringify(sessionId ? { sessionId } : {}),
  });
  const row = asRecord(raw);
  const id = asString(row?.sessionId);
  if (!id) throw new Error("POST /api/session did not return a sessionId");
  return { sessionId: id, stage: isStage(row?.stage) ? row.stage : null };
}

export interface SessionView {
  stage: Stage | null;
  rootCause: string | null;
  idea: IdeaCardData | null;
  vapiCallId: string | null;
}

export async function fetchSession(sessionId: string): Promise<SessionView> {
  const raw = await request<unknown>(`/api/session/${encodeURIComponent(sessionId)}`);
  const row = asRecord(raw);
  return {
    stage: isStage(row?.stage) ? row.stage : null,
    rootCause: typeof row?.rootCause === "string" ? row.rootCause : null,
    idea: parseIdea(row?.idea ?? row?.ideaCard),
    vapiCallId: typeof row?.vapiCallId === "string" ? row.vapiCallId : null,
  };
}

export function setStage(sessionId: string, stage: Stage): Promise<{ stage: Stage }> {
  return request(`/api/session/${encodeURIComponent(sessionId)}/stage`, {
    method: "POST",
    body: JSON.stringify({ stage }),
  });
}

export function saveIdeaCard(sessionId: string, card: IdeaCardData): Promise<unknown> {
  return request(`/api/session/${encodeURIComponent(sessionId)}/idea`, {
    method: "POST",
    body: JSON.stringify({ card }),
  });
}

export interface MentionsResponse {
  sessionId: string;
  stage: Stage | null;
  mentions: { seq: number; docId: string; ts: string }[];
  cursor: number;
}

export async function fetchMentions(sessionId: string, since: number): Promise<MentionsResponse> {
  const raw = await request<unknown>(
    `/api/session/${encodeURIComponent(sessionId)}/mentions?since=${since}`,
  );
  const row = asRecord(raw);
  const mentions = Array.isArray(row?.mentions)
    ? row.mentions.flatMap((item) => {
        const mention = asRecord(item);
        if (!mention || typeof mention.docId !== "string") return [];
        return [
          {
            seq: typeof mention.seq === "number" ? mention.seq : since,
            docId: mention.docId,
            ts: asString(mention.ts),
          },
        ];
      })
    : [];
  return {
    sessionId: asString(row?.sessionId, sessionId),
    stage: isStage(row?.stage) ? row.stage : null,
    mentions,
    cursor: typeof row?.cursor === "number" ? row.cursor : since,
  };
}

export async function fetchCitations(sessionId: string): Promise<Citation[]> {
  const raw = await request<unknown>(`/api/session/${encodeURIComponent(sessionId)}/citations`);
  const row = asRecord(raw);
  return normalizeCitations(row?.citations ?? raw);
}

export function parseVisual(value: unknown): Visual | null {
  const row = asRecord(value);
  if (!row) return null;
  const imageUrl = asString(row.imageUrl ?? row.image_url);
  const id = asString(row.id, imageUrl);
  if (!id && !imageUrl) return null;
  return {
    id: id || imageUrl,
    kind: asString(row.kind),
    prompt: asString(row.prompt),
    imageUrl,
    model: asString(row.model),
  };
}

export async function fetchVisuals(sessionId: string): Promise<Visual[]> {
  const raw = await request<unknown>(`/api/session/${encodeURIComponent(sessionId)}/visuals`);
  const row = asRecord(raw);
  const list = Array.isArray(row?.visuals) ? row.visuals : [];
  return list.flatMap((item) => {
    const visual = parseVisual(item);
    return visual ? [visual] : [];
  });
}

export interface VisualizeResponse {
  visuals: Visual[];
  error: "sign_in_required" | "key_required" | "disabled" | null;
}

export async function visualizeIdea(
  sessionId: string,
  kinds: readonly VisualKind[] = VISUAL_KINDS,
): Promise<VisualizeResponse> {
  const raw = await request<unknown>(`/api/session/${encodeURIComponent(sessionId)}/visualize`, {
    method: "POST",
    body: JSON.stringify({ kinds }),
  });
  const row = asRecord(raw);
  const error = row?.error;
  const known =
    error === "sign_in_required" || error === "key_required" || error === "disabled" ? error : null;
  const visuals = Array.isArray(row?.visuals)
    ? row.visuals.flatMap((item) => {
        const visual = parseVisual(item);
        return visual ? [visual] : [];
      })
    : [];
  return { visuals, error: known };
}

export interface ChatTurn {
  reply: string;
  stage: Stage | null;
  citations: Citation[];
  highlight: string[];
}

export interface ToolResult {
  summary: string;
  highlight: string[];
  citations: Citation[];
}

/** Kept so text mode still searches the library if `/api/chat` is not deployed yet. */
export async function callTool(
  sessionId: string,
  tool: string,
  args: Record<string, unknown>,
): Promise<ToolResult> {
  const raw = await request<unknown>(`/api/tools/${encodeURIComponent(tool)}`, {
    method: "POST",
    body: JSON.stringify({ sessionId, args }),
  });
  const row = asRecord(raw);
  const citations = normalizeCitations(row?.documents ?? row?.evidence ?? row?.citations);
  const highlight = Array.isArray(row?.highlight)
    ? row.highlight.filter((id): id is string => typeof id === "string")
    : citations.map((citation) => citation.docId);
  return { summary: asString(row?.summary), highlight, citations };
}

/** Text-mode coach turn. Voice tools stay on the Vapi webhook, not in the browser. */
export async function sendChat(sessionId: string, message: string): Promise<ChatTurn> {
  const raw = await request<unknown>("/api/chat", {
    method: "POST",
    body: JSON.stringify({ sessionId, message }),
  });
  const row = asRecord(raw);
  return {
    reply: asString(row?.reply),
    stage: isStage(row?.stage) ? row.stage : null,
    citations: normalizeCitations(row?.citations),
    highlight: Array.isArray(row?.highlight)
      ? row.highlight.filter((id): id is string => typeof id === "string")
      : [],
  };
}

export async function fetchMe(): Promise<Me> {
  const raw = await request<unknown>("/me");
  const row = asRecord(raw);
  const user = asRecord(row?.user);
  const xaiKey = asRecord(row?.xaiKey);
  return {
    user:
      user && typeof user.id === "string"
        ? {
            id: user.id,
            email: asString(user.email),
            name: asString(user.name),
          }
        : null,
    xaiKey: {
      connected: Boolean(xaiKey?.connected),
      last4: typeof xaiKey?.last4 === "string" && xaiKey.last4 ? xaiKey.last4 : null,
    },
  };
}

export function saveXaiKey(apiKey: string): Promise<{ connected: boolean; last4: string | null }> {
  return request<unknown>("/me/xai-key", {
    method: "POST",
    body: JSON.stringify({ apiKey }),
  }).then((raw) => {
    const row = asRecord(raw);
    return {
      connected: row?.connected !== false,
      last4: typeof row?.last4 === "string" ? row.last4 : null,
    };
  });
}

export function deleteXaiKey(): Promise<void> {
  return request<void>("/me/xai-key", { method: "DELETE" });
}

export function logout(): Promise<void> {
  return request<void>("/auth/logout", { method: "POST" });
}

export async function downloadReport(sessionId: string): Promise<void> {
  const response = await fetch(`${API_BASE}/api/session/${encodeURIComponent(sessionId)}/report`, {
    credentials: "include",
  });
  if (!response.ok) {
    throw new Error(`GET /api/session/${sessionId}/report failed: ${response.status}`);
  }
  const markdown = await response.text();
  const blob = new Blob([markdown], { type: "text/markdown" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "clarte-report.md";
  link.click();
  URL.revokeObjectURL(url);
}
