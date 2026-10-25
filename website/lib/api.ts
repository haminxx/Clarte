import type { GraphPayload, IdeaCardData, Stage, VoiceSession } from "./types";

/** Base URL of the PABER API Worker (product/workers/api). */
export const API_BASE = (process.env.NEXT_PUBLIC_PABER_API ?? "http://localhost:8787").replace(
  /\/$/,
  "",
);

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!response.ok) {
    throw new Error(`${init?.method ?? "GET"} ${path} failed: ${response.status}`);
  }
  return (await response.json()) as T;
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
