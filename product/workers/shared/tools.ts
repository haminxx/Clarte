import debatePrompt from "../../prompts/debate.md";
import {
  getDocumentById,
  getDocumentsByIds,
  getNeighbours,
  getSession,
  getUserKey,
  insertVisual,
  keywordSearch,
  rowToDocument,
} from "./db";
import { decryptString } from "./crypto";
import { embedQuery } from "./embeddings";
import type { Env } from "./env";
import { imagineEnabled } from "./env";
import { gemmaConfig, gemmaJson, hasGemma } from "./gemma";
import { generateImage, IMAGINE_MODEL, imaginePrompts, parseVisualKinds, videoStub } from "./imagine";
import type { DebateResult, IdeaCard, TechDocument, VisualView } from "./types";
import { sourceLabel } from "./types";
import type { ToolName } from "./tools-spec";

/**
 * The five Clarte tools (plan 6.3). The MCP server, Vapi webhook, and text coach
 * all call these functions, so tool behaviour cannot drift between entry points.
 *
 * `documents` is the citation list. Every document includes `url`, `source`, and `type`.
 * `mentionedIds` is what the API writes to `mentions` so the graph lights up.
 */
export type ImagineError = "disabled" | "sign_in_required" | "key_required" | "imagine_failed";

export interface ToolRunContext {
  sessionId?: string;
  /** Signed-in user on this HTTP request, when the caller has a session cookie. */
  userId?: string | null;
  /**
   * `request` uses only `userId` (anonymous if the cookie is missing).
   * `session` falls back to the user stored on the brainstorm session (Vapi).
   */
  userSource?: "request" | "session";
}

export interface ToolResult {
  summary: string;
  mentionedIds: string[];
  documents: TechDocument[];
  data: Record<string, unknown>;
  /** When set, Vapi receives `error` instead of `result`. */
  speakError?: string;
  imagineError?: ImagineError;
}

const IMAGINE_MESSAGES: Record<ImagineError, string> = {
  sign_in_required: "Sign in and connect an xAI key to visualize this idea.",
  key_required: "Connect an xAI key in Settings to visualize this idea.",
  disabled: "Idea visualization is turned off right now.",
  imagine_failed: "The image service did not return a picture. Try again in a moment.",
};

/** Compact document for Vapi and MCP. `source` stays the stored code. */
export function publicDocument(document: TechDocument) {
  return {
    id: document.id,
    title: document.title,
    type: document.type,
    source: document.source,
    sourceLabel: sourceLabel(document.source),
    url: document.url ?? "",
    summary: (document.summary ?? "").slice(0, 360),
    ...(document.score !== undefined ? { score: document.score } : {}),
    ...(document.reason ? { reason: document.reason } : {}),
  };
}

export function compactToolResult(name: ToolName, result: ToolResult): string {
  const docs = result.documents.map(publicDocument);
  switch (name) {
    case "search_tech":
      return JSON.stringify({ docs });
    case "get_document":
      return JSON.stringify({ doc: docs[0] ?? null, docs });
    case "find_related":
      return JSON.stringify({ origin: docs[0] ?? null, docs: docs.slice(1) });
    case "market_evidence":
      return JSON.stringify({
        docs,
        objections: result.data.objections ?? [],
        edge_test: result.data.edge_test ?? "",
        gaps: result.data.gaps ?? "",
      });
    case "visualize_idea":
      return JSON.stringify({ visuals: result.data.visuals ?? [], docs });
  }
}

function clampLimit(value: unknown, fallback: number): number {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(12, Math.max(1, Math.trunc(parsed)));
}

function describe(document: TechDocument): string {
  const parts = [document.title];
  if (document.center) parts.push(document.center);
  if (document.published) parts.push(document.published.slice(0, 4));
  return parts.join(" — ");
}

export async function searchTech(
  env: Env,
  args: { query: string; limit?: number },
): Promise<ToolResult> {
  const limit = clampLimit(args.limit, 6);
  const query = (args.query ?? "").trim();
  if (!query) {
    return { summary: "No query given.", mentionedIds: [], documents: [], data: { documents: [] } };
  }

  let documents: TechDocument[] = [];

  try {
    const vector = await embedQuery(env, query);
    const matches = await env.VECTORS.query(vector, { topK: limit });
    const ids = (matches.matches ?? []).map((match) => match.id);
    const rows = await getDocumentsByIds(env, ids);
    documents = (matches.matches ?? [])
      .map((match) => {
        const row = rows.get(match.id);
        return row ? rowToDocument(row, match.score) : null;
      })
      .filter((document): document is TechDocument => document !== null);
  } catch (error) {
    console.warn("Vector search failed; falling back to keyword search", { error: String(error) });
  }

  if (!documents.length) {
    documents = await keywordSearch(env, query, limit);
  }

  return {
    summary: documents.length
      ? `${documents.length} documents for "${query}": ${documents.slice(0, 3).map(describe).join("; ")}`
      : `The library has nothing on "${query}".`,
    mentionedIds: documents.map((document) => document.id),
    documents,
    data: { query, documents },
  };
}

export async function getDocument(env: Env, args: { id: string }): Promise<ToolResult> {
  const document = await getDocumentById(env, (args.id ?? "").trim());
  if (!document) {
    return {
      summary: `No document with id ${args.id}.`,
      mentionedIds: [],
      documents: [],
      data: { document: null },
    };
  }
  return {
    summary: `${describe(document)} (${document.licenseStatus ?? sourceLabel(document.source)}): ${document.summary}`,
    mentionedIds: [document.id],
    documents: [document],
    data: { document },
  };
}

export async function findRelated(
  env: Env,
  args: { id: string; cross_domain?: boolean; limit?: number },
): Promise<ToolResult> {
  const id = (args.id ?? "").trim();
  const limit = clampLimit(args.limit, 6);
  const crossDomain = Boolean(args.cross_domain);

  const origin = await getDocumentById(env, id);
  if (!origin) {
    return { summary: `No document with id ${id}.`, mentionedIds: [], documents: [], data: { documents: [] } };
  }

  let documents: TechDocument[] = (await getNeighbours(env, id, { crossDomain, limit })).map(
    (neighbour) => ({
      ...rowToDocument(neighbour.row, neighbour.weight),
      reason: neighbour.reason ?? undefined,
    }),
  );

  // Edges are written at ingest time; if this node has none yet, fall back to a
  // live nearest-neighbour query so the tool still returns something useful.
  if (!documents.length) {
    const neighbours = await searchTech(env, {
      query: `${origin.title}. ${origin.summary}`,
      limit: limit + 1,
    });
    documents = ((neighbours.data.documents as TechDocument[]) ?? []).filter(
      (document) => document.id !== id,
    );
    if (crossDomain && origin.domains.length) {
      const originDomains = new Set(origin.domains);
      const filtered = documents.filter((document) =>
        document.domains.some((domain) => !originDomains.has(domain)),
      );
      if (filtered.length) documents = filtered;
    }
    documents = documents.slice(0, limit);
  }

  await explainLinks(env, origin, documents);

  return {
    summary: documents.length
      ? `Neighbours of ${origin.title}: ${documents.slice(0, 3).map(describe).join("; ")}`
      : `${origin.title} has no neighbours in the graph yet.`,
    mentionedIds: [origin.id, ...documents.map((document) => document.id)],
    documents: [origin, ...documents],
    data: { origin, documents, crossDomain },
  };
}

/** Gemma 4 writes the one-line "why these connect" reason when an edge has none. */
async function explainLinks(env: Env, origin: TechDocument, documents: TechDocument[]): Promise<void> {
  const missing = documents.filter((document) => !document.reason).slice(0, 6);
  if (!missing.length) return;

  const config = gemmaConfig(env);
  if (!hasGemma(config)) {
    for (const document of missing) {
      const shared = document.domains.filter((domain) => origin.domains.includes(domain));
      document.reason = shared.length
        ? `Both work on ${shared.slice(0, 2).join(" and ")}.`
        : `Adjacent technology from ${document.center ?? document.source}.`;
    }
    return;
  }

  try {
    const reply = await gemmaJson<{ reasons: { id: string; reason: string }[] }>(config, {
      instruction:
        "For each candidate document, write one sentence explaining how its technology could transfer to the origin problem. Be concrete and mechanical, not generic. Return {\"reasons\":[{\"id\":\"...\",\"reason\":\"...\"}]}.",
      input: [
        `ORIGIN: ${origin.title}\n${origin.summary}`,
        "CANDIDATES:",
        ...missing.map((document) => `[${document.id}] ${document.title}\n${document.summary}`),
      ].join("\n"),
      maxOutputTokens: 700,
    });

    const byId = new Map((reply?.reasons ?? []).map((entry) => [entry.id, entry.reason]));
    for (const document of missing) {
      document.reason = byId.get(document.id) ?? `Adjacent technology from ${document.center ?? document.source}.`;
    }
  } catch (error) {
    console.warn("Gemma link reasons failed", { error: String(error) });
  }
}

export async function marketEvidence(
  env: Env,
  args: { idea: string; limit?: number },
): Promise<ToolResult> {
  const idea = (args.idea ?? "").trim();
  const limit = clampLimit(args.limit, 8);
  if (!idea) {
    return { summary: "No idea given.", mentionedIds: [], documents: [], data: { objections: [] } };
  }

  const retrieved = await searchTech(env, { query: idea, limit });
  const documents = (retrieved.data.documents as TechDocument[]) ?? [];

  const debate = await runDebate(env, idea, documents);

  return {
    summary: debate.objections.length
      ? `${debate.objections.length} objections, strongest first: ${debate.objections[0].claim}`
      : `No prior art strong enough to argue against this yet.`,
    mentionedIds: documents.map((document) => document.id),
    documents,
    data: { idea, evidence: documents, ...debate },
  };
}

/** Gemma 4 debate pass — prompts/debate.md, plan stage 3. */
async function runDebate(env: Env, idea: string, documents: TechDocument[]): Promise<DebateResult> {
  const config = gemmaConfig(env);

  if (!documents.length) {
    return {
      objections: [],
      edge_test: "What would have to be true for this to beat the obvious approach?",
      gaps: "The library has no prior art close to this idea.",
    };
  }

  const evidence = documents
    .map(
      (document, index) =>
        `[${index + 1}] ${document.id} | ${document.type} | ${document.source} | ${document.url} | ${document.title}\n    ${document.summary}`,
    )
    .join("\n");

  if (hasGemma(config)) {
    try {
      const result = await gemmaJson<DebateResult>(config, {
        instruction: debatePrompt,
        input: `IDEA: ${idea}\nSTANCE: against\nEVIDENCE:\n${evidence}`,
        maxOutputTokens: 1200,
      });
      if (result?.objections?.length) {
        return {
          objections: result.objections.slice(0, 3),
          edge_test: result.edge_test ?? "What is your edge over the closest prior art?",
          gaps: result.gaps ?? "",
        };
      }
    } catch (error) {
      console.warn("Gemma debate failed; using evidence-only objections", { error: String(error) });
    }
  }

  // No Gemini key (or Gemma failed): still hand the coach real, cited pushback.
  return {
    objections: documents.slice(0, 3).map((document) => ({
      claim: `${document.center ?? document.source} already published "${document.title}", which covers part of this.`,
      evidence_ids: [document.id],
      question: `There is already work on ${document.title.toLowerCase()} — what is your edge over it?`,
    })),
    edge_test: "What can you do that the closest existing work cannot?",
    gaps: "Objections built from retrieval only; Gemma 4 was unavailable.",
  };
}

/**
 * The closing artifact of a session (plan section 5, stage 3): Gemma 4 reads the
 * transcript and writes the idea card. Falls back to the first and last user turns
 * when Gemma is unavailable, so the demo always ends with a card.
 */
export async function draftIdeaCard(
  env: Env,
  input: { transcript: { role: string; text: string }[]; evidenceIds: string[] },
): Promise<IdeaCard> {
  const evidenceRows = await getDocumentsByIds(env, input.evidenceIds.slice(0, 3));
  const evidence = [...evidenceRows.values()].map((row) => {
    const document = rowToDocument(row);
    return { id: document.id, title: document.title, url: document.url };
  });

  const userTurns = input.transcript.filter((entry) => entry.role === "user");
  const fallback: IdeaCard = {
    problem: userTurns[0]?.text ?? "Untitled problem",
    rootCause: userTurns[userTurns.length - 1]?.text ?? "Not reached yet.",
    solution:
      input.transcript.filter((entry) => entry.role === "clarte").slice(-1)[0]?.text ?? "Not stated yet.",
    evidence,
    risk: "Gemma 4 was unavailable, so this card is assembled from the transcript only.",
  };

  const config = gemmaConfig(env);
  if (!hasGemma(config) || !input.transcript.length) return fallback;

  try {
    const result = await gemmaJson<Omit<IdeaCard, "evidence">>(config, {
      instruction:
        "You are writing the closing idea card for a brainstorming session. Return " +
        '{"problem":"","rootCause":"","solution":"","risk":""}. One or two sentences per field, in the ' +
        "user's own framing where possible. `risk` is the single biggest unresolved objection. " +
        "Never invent evidence or numbers that are not in the transcript.",
      input: `TRANSCRIPT:\n${input.transcript
        .map((entry) => `${entry.role}: ${entry.text}`)
        .join("\n")}\n\nEVIDENCE:\n${evidence.map((item) => `${item.id} ${item.title}`).join("\n")}`,
      maxOutputTokens: 700,
    });

    if (!result?.problem) return fallback;
    return {
      problem: result.problem,
      rootCause: result.rootCause || fallback.rootCause,
      solution: result.solution || fallback.solution,
      risk: result.risk || fallback.risk,
      evidence,
    };
  } catch (error) {
    console.warn("Gemma idea card failed", { error: String(error) });
    return fallback;
  }
}

function stringArg(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function imagineRefusal(code: ImagineError): ToolResult {
  return {
    summary: IMAGINE_MESSAGES[code],
    mentionedIds: [],
    documents: [],
    data: { visuals: [] },
    speakError: IMAGINE_MESSAGES[code],
    imagineError: code,
  };
}

/**
 * End-of-session visuals. Off unless IMAGINE_ENABLED is true, the user is signed
 * in, and `user_keys` has an AES-GCM xAI key. The env XAI_API_KEY is not used.
 * Video does not call xAI.
 */
export async function visualizeIdea(
  env: Env,
  args: { session_id?: string; sessionId?: string; kinds?: unknown },
  ctx: ToolRunContext = {},
): Promise<ToolResult> {
  const sessionId = stringArg(args.session_id) || stringArg(args.sessionId) || ctx.sessionId || "";
  const session = sessionId ? await getSession(env, sessionId) : null;
  const userId = ctx.userSource === "request" ? (ctx.userId ?? null) : (ctx.userId ?? session?.userId ?? null);

  if (!userId) return imagineRefusal("sign_in_required");

  const stored = await getUserKey(env, userId, "xai");
  if (!stored) return imagineRefusal("key_required");
  if (!imagineEnabled(env)) return imagineRefusal("disabled");
  if (!env.KEY_ENCRYPTION_KEY) return imagineRefusal("key_required");

  let apiKey = "";
  try {
    apiKey = await decryptString(env.KEY_ENCRYPTION_KEY, stored.ciphertext, stored.iv);
  } catch (error) {
    console.warn("xAI key decrypt failed", { userId });
    return imagineRefusal("key_required");
  }
  if (!apiKey) return imagineRefusal("key_required");

  const { images, video } = parseVisualKinds(args.kinds);
  const card: IdeaCard = session?.idea ?? {
    problem: session?.rootCause || "Untitled idea",
    rootCause: session?.rootCause || "",
    solution: session?.rootCause || "Untitled idea",
    evidence: [],
    risk: "",
  };
  const evidence = await getDocumentsByIds(
    env,
    card.evidence.map((item) => item.id).filter(Boolean).slice(0, 6),
  );
  const documents = [...evidence.values()].map((row) => rowToDocument(row));
  const prompts = await imaginePrompts(env, card, images);
  const visuals: VisualView[] = [];

  if (sessionId && images.length) {
    const generated = await Promise.all(
      prompts.map(async (item) => {
        try {
          const imageUrl = await generateImage(apiKey, item.prompt);
          return { ...item, imageUrl };
        } catch (error) {
          console.warn("Imagine image failed", {
            kind: item.kind,
            error: error instanceof Error ? error.message.slice(0, 180) : "failed",
          });
          return { ...item, imageUrl: null as string | null };
        }
      }),
    );
    for (const item of generated) {
      if (!item.imageUrl) continue;
      const visual: VisualView = {
        id: crypto.randomUUID(),
        kind: item.kind,
        prompt: item.prompt,
        imageUrl: item.imageUrl,
        model: IMAGINE_MODEL,
      };
      await insertVisual(env, { ...visual, sessionId });
      visuals.push(visual);
    }
  }

  if (video && sessionId) {
    const stub = videoStub();
    await insertVisual(env, { ...stub, sessionId });
    visuals.push(stub);
  }

  if (!visuals.length) return imagineRefusal("imagine_failed");

  return {
    summary: `Rendered ${visuals.length} visual${visuals.length === 1 ? "" : "s"} for the idea.`,
    mentionedIds: documents.map((document) => document.id),
    documents,
    data: { visuals },
  };
}

export async function runTool(
  env: Env,
  name: ToolName,
  args: Record<string, unknown>,
  ctx: ToolRunContext = {},
): Promise<ToolResult> {
  switch (name) {
    case "search_tech":
      return searchTech(env, args as { query: string; limit?: number });
    case "get_document":
      return getDocument(env, args as { id: string });
    case "find_related":
      return findRelated(env, args as { id: string; cross_domain?: boolean; limit?: number });
    case "market_evidence":
      return marketEvidence(env, args as { idea: string; limit?: number });
    case "visualize_idea":
      return visualizeIdea(env, args, { ...ctx, sessionId: ctx.sessionId });
  }
}
