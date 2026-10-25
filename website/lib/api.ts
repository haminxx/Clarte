import { GOOGLE_URL } from "./links";
import type { GraphPayload, IdeaCardData, Stage, TechDocument, VoiceSession } from "./types";

/** Base URL of the Clarte API Worker (product/workers/api). */
export const API_BASE = (process.env.NEXT_PUBLIC_CLARTE_API ?? "http://localhost:8787").replace(
  /\/$/,
  "",
);

/** Turn API failure codes and missing-secret errors into a sentence the page can show. */
export function explainApiMessage(raw: string): string {
  const text = raw.trim();
  if (text === "sign_in_required") return "Sign in and connect an xAI key to visualize this idea.";
  if (text === "key_required") return "Connect an xAI key to visualize this idea.";
  if (text === "disabled") return "Idea visualization is turned off right now.";
  if (/google sign-in is not configured/i.test(text)) {
    return "Google sign-in is not configured on the server yet. You can still use text chat.";
  }
  if (/secret|not configured|key_encryption/i.test(text)) {
    return `${text}. Text chat still works.`;
  }
  return text || "The request did not succeed. Text chat still works.";
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...init,
      credentials: "include",
      headers: {
        ...(init?.body ? { "content-type": "application/json" } : {}),
        ...(init?.headers ?? {}),
      },
    });
  } catch {
    throw new Error("Could not reach the Clarte API. Text chat can be tried again in a moment.");
  }

  const text = await response.text();
  let body: unknown = null;
  if (text) {
    try {
      body = JSON.parse(text) as unknown;
    } catch {
      body = null;
    }
  }
  if (!response.ok) {
    const raw =
      body && typeof body === "object" && "error" in body && typeof (body as { error?: unknown }).error === "string"
        ? (body as { error: string }).error
        : "";
    throw new Error(explainApiMessage(raw || `Request failed (${response.status})`));
  }
  return body as T;
}

/** Follow the Google redirect when sign-in is configured. Otherwise return a message. */
export async function startGoogleSignIn(): Promise<string | null> {
  try {
    const response = await fetch(GOOGLE_URL, { credentials: "include", redirect: "manual" });
    if (response.type === "opaqueredirect" || response.status === 0 || (response.status >= 300 && response.status < 400)) {
      window.location.assign(GOOGLE_URL);
      return null;
    }
    if (!response.ok) {
      let message = "Google sign-in is not available right now. You can still use text chat.";
      try {
        const body = (await response.json()) as { error?: unknown };
        if (typeof body.error === "string") message = explainApiMessage(body.error);
      } catch {
        // The status was already not OK; keep the fallback sentence.
      }
      return message;
    }
  } catch {
    return "Could not reach Google sign-in. You can still use text chat.";
  }
  window.location.assign(GOOGLE_URL);
  return null;
}

export function fetchGraph(limit = 400): Promise<GraphPayload> {
  return request<GraphPayload>(`/api/graph?limit=${limit}`);
}

export function startSession(sessionId?: string): Promise<VoiceSession> {
  return request<VoiceSession>("/api/session", {
    method: "POST",
    body: JSON.stringify({ sessionId }),
  });
}

export interface ToolResponse {
  tool: string;
  summary: string;
  highlight: string[];
  [key: string]: unknown;
}

/**
 * Tool bridge. Grok Voice emits a function call, the browser forwards it here,
 * and the Worker runs the MCP tool against D1 + Vectorize + Gemma 4.
 */
export function callTool(
  sessionId: string,
  tool: string,
  args: Record<string, unknown>,
): Promise<ToolResponse> {
  return request<ToolResponse>(`/api/tools/${tool}`, {
    method: "POST",
    body: JSON.stringify({ sessionId, args }),
  });
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

/** Ask Gemma 4 to write the closing card from the transcript and store it. */
export function draftIdeaCard(
  sessionId: string,
  transcript: { role: string; text: string }[],
  evidenceIds: string[],
): Promise<{ card: IdeaCardData }> {
  return request<{ card: IdeaCardData }>(
    `/api/session/${encodeURIComponent(sessionId)}/idea-draft`,
    { method: "POST", body: JSON.stringify({ transcript, evidenceIds }) },
  );
}

export interface MentionsResponse {
  sessionId: string;
  stage: Stage;
  mentions: { seq: number; docId: string; ts: string }[];
  cursor: number;
}

export function fetchMentions(sessionId: string, since: number): Promise<MentionsResponse> {
  return request<MentionsResponse>(
    `/api/session/${encodeURIComponent(sessionId)}/mentions?since=${since}`,
  );
}

export interface ChatTurn {
  reply: string;
  stage: Stage | null;
  highlight: string[];
  citations: TechDocument[];
}

function asStage(value: unknown): Stage | null {
  return value === "five_whys" || value === "why_how_what" || value === "debate" || value === "visualize"
    ? value
    : null;
}

function asDocuments(value: unknown): TechDocument[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const row = item as Record<string, unknown>;
    const id = typeof row.id === "string" ? row.id : typeof row.docId === "string" ? row.docId : "";
    const title = typeof row.title === "string" ? row.title : "";
    if (!id && !title) return [];
    return [
      {
        id: id || title,
        title: title || "Untitled source",
        url: typeof row.url === "string" ? row.url : "",
        source: typeof row.source === "string" ? row.source : "",
        type: (typeof row.type === "string" ? row.type : "report") as TechDocument["type"],
        summary: typeof row.summary === "string" ? row.summary : "",
        domains: [],
        center: null,
        licenseStatus: null,
      },
    ];
  });
}

/** Text-mode coach turn. This stays available when voice is not configured. */
export async function sendChat(sessionId: string, message: string): Promise<ChatTurn> {
  const raw = await request<Record<string, unknown>>("/api/chat", {
    method: "POST",
    body: JSON.stringify({ sessionId, message }),
  });
  return {
    reply: typeof raw.reply === "string" ? raw.reply : "",
    stage: asStage(raw.stage),
    highlight: Array.isArray(raw.highlight)
      ? raw.highlight.filter((id): id is string => typeof id === "string")
      : [],
    citations: asDocuments(raw.citations),
  };
}

export async function fetchCitations(sessionId: string): Promise<TechDocument[]> {
  const raw = await request<{ citations?: unknown }>(
    `/api/session/${encodeURIComponent(sessionId)}/citations`,
  );
  return asDocuments(raw?.citations);
}

export interface VisualResult {
  message: string | null;
  visuals: { id: string; kind: string; prompt: string; imageUrl: string }[];
}

export async function visualizeSession(sessionId: string): Promise<VisualResult> {
  const raw = await request<Record<string, unknown>>(
    `/api/session/${encodeURIComponent(sessionId)}/visualize`,
    { method: "POST", body: JSON.stringify({ kinds: ["concept", "system_diagram", "paper_figure"] }) },
  );
  const message = typeof raw.error === "string" ? explainApiMessage(raw.error) : null;
  const visuals = Array.isArray(raw.visuals)
    ? raw.visuals.flatMap((item) => {
        if (!item || typeof item !== "object") return [];
        const row = item as Record<string, unknown>;
        const imageUrl = typeof row.imageUrl === "string" ? row.imageUrl : "";
        if (!imageUrl) return [];
        return [
          {
            id: typeof row.id === "string" ? row.id : imageUrl,
            kind: typeof row.kind === "string" ? row.kind : "concept",
            prompt: typeof row.prompt === "string" ? row.prompt : "",
            imageUrl,
          },
        ];
      })
    : [];
  return { message, visuals };
}
