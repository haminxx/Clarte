import type { Env } from "./env";
import type {
  DocType,
  DocumentRow,
  GraphLink,
  GraphNode,
  GraphPayload,
  IdeaCard,
  Mention,
  Stage,
  TechDocument,
} from "./types";

const DOCUMENT_COLUMNS =
  "id, source, source_id, type, title, abstract, summary, domains, url, published, center, license_status";

export function parseJsonArray(value: string | null): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return value
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);
  }
}

export function rowToDocument(row: DocumentRow, score?: number): TechDocument {
  return {
    id: row.id,
    source: row.source,
    type: row.type as DocType,
    title: row.title,
    summary: row.summary ?? row.abstract ?? "",
    domains: parseJsonArray(row.domains),
    url: row.url ?? "",
    published: row.published,
    center: row.center,
    licenseStatus: row.license_status,
    ...(score === undefined ? {} : { score: Math.round(score * 1000) / 1000 }),
  };
}

export async function getDocumentById(env: Env, id: string): Promise<TechDocument | null> {
  const row = await env.DB.prepare(`SELECT ${DOCUMENT_COLUMNS} FROM documents WHERE id = ?`)
    .bind(id)
    .first<DocumentRow>();
  if (!row) return null;
  const document = rowToDocument(row);
  return { ...document, abstract: row.abstract ?? "" };
}

export async function getDocumentsByIds(env: Env, ids: string[]): Promise<Map<string, DocumentRow>> {
  if (!ids.length) return new Map();
  const placeholders = ids.map(() => "?").join(", ");
  const { results } = await env.DB.prepare(
    `SELECT ${DOCUMENT_COLUMNS} FROM documents WHERE id IN (${placeholders})`,
  )
    .bind(...ids)
    .all<DocumentRow>();
  return new Map((results ?? []).map((row) => [row.id, row]));
}

/**
 * Keyword fallback for when Vectorize is empty or unreachable. D1 has no FTS here
 * on purpose (plan 6.4 keeps the schema small), so this is a scored LIKE match.
 */
export async function keywordSearch(env: Env, query: string, limit: number): Promise<TechDocument[]> {
  const terms = query
    .toLowerCase()
    .match(/[a-z0-9]{3,}/g)
    ?.slice(0, 6) ?? [];
  if (!terms.length) return [];

  const clauses = terms.map(() => "(lower(title) LIKE ? OR lower(abstract) LIKE ? OR lower(summary) LIKE ?)");
  const bindings: string[] = [];
  for (const term of terms) {
    const needle = `%${term}%`;
    bindings.push(needle, needle, needle);
  }

  const { results } = await env.DB.prepare(
    `SELECT ${DOCUMENT_COLUMNS} FROM documents WHERE ${clauses.join(" OR ")} LIMIT ?`,
  )
    .bind(...bindings, limit)
    .all<DocumentRow>();

  return (results ?? []).map((row) => rowToDocument(row, 0.3));
}

export interface Neighbour {
  row: DocumentRow;
  weight: number;
  reason: string | null;
  crossDomain: boolean;
}

export async function getNeighbours(
  env: Env,
  id: string,
  { crossDomain, limit }: { crossDomain: boolean; limit: number },
): Promise<Neighbour[]> {
  const { results } = await env.DB.prepare(
    `SELECT e.weight AS weight, e.reason AS reason, e.cross_domain AS cross_domain,
            ${DOCUMENT_COLUMNS.split(", ").map((column) => `d.${column} AS ${column}`).join(", ")}
     FROM edges e
     JOIN documents d ON d.id = e.dst
     WHERE e.src = ? ${crossDomain ? "AND e.cross_domain = 1" : ""}
     ORDER BY e.weight DESC
     LIMIT ?`,
  )
    .bind(id, limit)
    .all<DocumentRow & { weight: number; reason: string | null; cross_domain: number }>();

  return (results ?? []).map((row) => ({
    row,
    weight: row.weight,
    reason: row.reason,
    crossDomain: Boolean(row.cross_domain),
  }));
}

export async function getGraph(env: Env, limit: number): Promise<GraphPayload> {
  const { results: documents } = await env.DB.prepare(
    `SELECT ${DOCUMENT_COLUMNS} FROM documents ORDER BY rowid LIMIT ?`,
  )
    .bind(limit)
    .all<DocumentRow>();

  const nodes: GraphNode[] = (documents ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    type: row.type as DocType,
    source: row.source,
    domains: parseJsonArray(row.domains),
    url: row.url ?? "",
    center: row.center,
  }));

  const nodeIds = new Set(nodes.map((node) => node.id));

  const { results: edges } = await env.DB.prepare(
    `SELECT src, dst, weight, reason, cross_domain FROM edges LIMIT ?`,
  )
    .bind(limit * 6)
    .all<{ src: string; dst: string; weight: number; reason: string | null; cross_domain: number }>();

  const links: GraphLink[] = (edges ?? [])
    .filter((edge) => nodeIds.has(edge.src) && nodeIds.has(edge.dst))
    .map((edge) => ({
      source: edge.src,
      target: edge.dst,
      weight: edge.weight,
      reason: edge.reason,
      crossDomain: Boolean(edge.cross_domain),
    }));

  return { nodes, links };
}

export async function ensureSession(env: Env, sessionId: string): Promise<void> {
  await env.DB.prepare("INSERT OR IGNORE INTO sessions (id, stage) VALUES (?, 'five_whys')")
    .bind(sessionId)
    .run();
}

export async function setStage(env: Env, sessionId: string, stage: Stage): Promise<void> {
  await ensureSession(env, sessionId);
  await env.DB.prepare("UPDATE sessions SET stage = ? WHERE id = ?").bind(stage, sessionId).run();
}

export async function setRootCause(env: Env, sessionId: string, rootCause: string): Promise<void> {
  await ensureSession(env, sessionId);
  await env.DB.prepare("UPDATE sessions SET root_cause = ? WHERE id = ?").bind(rootCause, sessionId).run();
}

export async function setIdeaCard(env: Env, sessionId: string, card: IdeaCard): Promise<void> {
  await ensureSession(env, sessionId);
  await env.DB.prepare("UPDATE sessions SET idea_json = ? WHERE id = ?")
    .bind(JSON.stringify(card), sessionId)
    .run();
}

export interface SessionState {
  id: string;
  stage: Stage;
  rootCause: string | null;
  ideaCard: IdeaCard | null;
}

export async function getSession(env: Env, sessionId: string): Promise<SessionState | null> {
  const row = await env.DB.prepare("SELECT id, stage, root_cause, idea_json FROM sessions WHERE id = ?")
    .bind(sessionId)
    .first<{ id: string; stage: string; root_cause: string | null; idea_json: string | null }>();
  if (!row) return null;
  let ideaCard: IdeaCard | null = null;
  if (row.idea_json) {
    try {
      ideaCard = JSON.parse(row.idea_json) as IdeaCard;
    } catch {
      ideaCard = null;
    }
  }
  return { id: row.id, stage: row.stage as Stage, rootCause: row.root_cause, ideaCard };
}

/** Highlight stream: the website polls `mentions` to light nodes up in order. */
export async function recordMentions(env: Env, sessionId: string, docIds: string[]): Promise<void> {
  if (!sessionId || !docIds.length) return;
  await ensureSession(env, sessionId);
  const statement = env.DB.prepare("INSERT INTO mentions (session_id, doc_id) VALUES (?, ?)");
  await env.DB.batch(docIds.slice(0, 12).map((docId) => statement.bind(sessionId, docId)));
}

export async function getMentions(env: Env, sessionId: string, since: number): Promise<Mention[]> {
  const { results } = await env.DB.prepare(
    "SELECT seq, doc_id, ts FROM mentions WHERE session_id = ? AND seq > ? ORDER BY seq LIMIT 200",
  )
    .bind(sessionId, since)
    .all<{ seq: number; doc_id: string; ts: string }>();
  return (results ?? []).map((row) => ({ seq: row.seq, docId: row.doc_id, ts: row.ts }));
}

export async function countDocuments(env: Env): Promise<number> {
  const row = await env.DB.prepare("SELECT count(*) AS total FROM documents").first<{ total: number }>();
  return row?.total ?? 0;
}
