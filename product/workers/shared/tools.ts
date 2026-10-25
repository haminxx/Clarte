import debatePrompt from "../../prompts/debate.md";
import { getDocumentById, getDocumentsByIds, getNeighbours, keywordSearch, rowToDocument } from "./db";
import { embedQuery } from "./embeddings";
import type { Env } from "./env";
import { gemmaJson, gemmaText, gemmaConfig, hasGemma } from "./gemma";
import type { DebateResult, TechDocument } from "./types";
import type { ToolName } from "./tools-spec";

/**
 * The four PABER tools (plan 6.3). The MCP server and the voice bridge both call
 * these functions, so tool behaviour cannot drift between the two entry points.
 *
 * Every result carries `mentionedIds`: the documents the coach just touched, which
 * the API records in `mentions` so the website lights up the matching nodes.
 */
export interface ToolResult {
  summary: string;
  mentionedIds: string[];
  data: Record<string, unknown>;
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
    return { summary: "No query given.", mentionedIds: [], data: { documents: [] } };
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
    data: { query, documents },
  };
}

export async function getDocument(env: Env, args: { id: string }): Promise<ToolResult> {
  const document = await getDocumentById(env, (args.id ?? "").trim());
  if (!document) {
    return { summary: `No document with id ${args.id}.`, mentionedIds: [], data: { document: null } };
  }
  return {
    summary: `${describe(document)} (${document.licenseStatus ?? document.source}): ${document.summary}`,
    mentionedIds: [document.id],
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
    return { summary: `No document with id ${id}.`, mentionedIds: [], data: { documents: [] } };
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
    return { summary: "No idea given.", mentionedIds: [], data: { objections: [] } };
  }

  const retrieved = await searchTech(env, { query: idea, limit });
  const documents = (retrieved.data.documents as TechDocument[]) ?? [];

  const debate = await runDebate(env, idea, documents);

  return {
    summary: debate.objections.length
      ? `${debate.objections.length} objections, strongest first: ${debate.objections[0].claim}`
      : `No prior art strong enough to argue against this yet.`,
    mentionedIds: documents.map((document) => document.id),
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
        `[${index + 1}] ${document.id} | ${document.type} | ${document.center ?? document.source} | ${document.title}\n    ${document.summary}`,
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

  // No Gemini key (or Gemma failed): still hand Grok real, cited pushback.
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

/** Optional: Gemma writes the closing idea card from the transcript so far. */
export async function summariseIdea(
  env: Env,
  input: { transcript: string; evidence: TechDocument[] },
): Promise<string> {
  const config = gemmaConfig(env);
  if (!hasGemma(config)) return "";
  return gemmaText(config, {
    instruction:
      "Summarise this brainstorming session as an idea card: problem, root cause, solution, and the single biggest remaining risk. Two sentences maximum per field.",
    input: `TRANSCRIPT:\n${input.transcript}\n\nEVIDENCE:\n${input.evidence
      .map((document) => `${document.id} ${document.title}`)
      .join("\n")}`,
    maxOutputTokens: 600,
  });
}

export async function runTool(env: Env, name: ToolName, args: Record<string, unknown>): Promise<ToolResult> {
  switch (name) {
    case "search_tech":
      return searchTech(env, args as { query: string; limit?: number });
    case "get_document":
      return getDocument(env, args as { id: string });
    case "find_related":
      return findRelated(env, args as { id: string; cross_domain?: boolean; limit?: number });
    case "market_evidence":
      return marketEvidence(env, args as { idea: string; limit?: number });
  }
}
