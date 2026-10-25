import type { Env } from "./env";
import type {
  AuthUser,
  CitationView,
  DocType,
  DocumentRow,
  GraphLink,
  GraphNode,
  GraphPayload,
  IdeaCard,
  Mention,
  Stage,
  TechDocument,
  TranscriptTurn,
  VisualView,
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
  /** Same object as `idea`. Kept so existing callers keep working. */
  ideaCard: IdeaCard | null;
  idea: IdeaCard | null;
  vapiCallId: string | null;
  userId: string | null;
}

export async function getSession(env: Env, sessionId: string): Promise<SessionState | null> {
  const row = await env.DB.prepare(
    "SELECT id, stage, root_cause, idea_json, vapi_call_id, user_id FROM sessions WHERE id = ?",
  )
    .bind(sessionId)
    .first<{
      id: string;
      stage: string;
      root_cause: string | null;
      idea_json: string | null;
      vapi_call_id: string | null;
      user_id: string | null;
    }>();
  if (!row) return null;
  let ideaCard: IdeaCard | null = null;
  if (row.idea_json) {
    try {
      ideaCard = JSON.parse(row.idea_json) as IdeaCard;
    } catch {
      ideaCard = null;
    }
  }
  return {
    id: row.id,
    stage: row.stage as Stage,
    rootCause: row.root_cause,
    ideaCard,
    idea: ideaCard,
    vapiCallId: row.vapi_call_id,
    userId: row.user_id,
  };
}

/** UTC timestamp in the same `YYYY-MM-DD HH:MM:SS` form as SQLite `datetime('now')`. */
export function sqliteUtc(date = new Date()): string {
  return date.toISOString().slice(0, 19).replace("T", " ");
}

export async function setVapiCallId(env: Env, sessionId: string, callId: string): Promise<void> {
  if (!sessionId || !callId) return;
  await ensureSession(env, sessionId);
  await env.DB.prepare("UPDATE sessions SET vapi_call_id = ? WHERE id = ?").bind(callId, sessionId).run();
}

/** Bind a brainstorm session to a signed-in user. Does not steal another user's session. */
export async function attachUser(env: Env, sessionId: string, userId: string): Promise<void> {
  if (!sessionId || !userId) return;
  await ensureSession(env, sessionId);
  await env.DB.prepare("UPDATE sessions SET user_id = ? WHERE id = ? AND (user_id IS NULL OR user_id = ?)")
    .bind(userId, sessionId, userId)
    .run();
}

export async function getTranscript(env: Env, sessionId: string): Promise<TranscriptTurn[]> {
  const row = await env.DB.prepare("SELECT transcript_json FROM sessions WHERE id = ?")
    .bind(sessionId)
    .first<{ transcript_json: string | null }>();
  if (!row?.transcript_json) return [];
  try {
    const parsed = JSON.parse(row.transcript_json) as TranscriptTurn[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function appendTranscript(
  env: Env,
  sessionId: string,
  turn: TranscriptTurn,
): Promise<TranscriptTurn[]> {
  await ensureSession(env, sessionId);
  const history = await getTranscript(env, sessionId);
  history.push({ ...turn, text: turn.text.slice(0, 2000) });
  const capped = history.slice(-30);
  await env.DB.prepare("UPDATE sessions SET transcript_json = ? WHERE id = ?")
    .bind(JSON.stringify(capped), sessionId)
    .run();
  return capped;
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

export async function recordCitations(
  env: Env,
  sessionId: string,
  documents: TechDocument[],
  stage: string,
): Promise<CitationView[]> {
  const unique = new Map<string, TechDocument>();
  for (const document of documents) {
    if (document?.id) unique.set(document.id, document);
  }
  const docs = [...unique.values()].slice(0, 12);
  if (!sessionId || !docs.length) return [];
  await ensureSession(env, sessionId);
  const statement = env.DB.prepare(
    `INSERT INTO citations (session_id, doc_id, url, title, stage, source, type)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(session_id, doc_id) DO UPDATE SET
       url = excluded.url,
       title = excluded.title,
       stage = excluded.stage,
       source = excluded.source,
       type = excluded.type,
       ts = datetime('now')`,
  );
  await env.DB.batch(
    docs.map((document) =>
      statement.bind(
        sessionId,
        document.id,
        document.url ?? "",
        document.title,
        stage,
        document.source,
        document.type,
      ),
    ),
  );
  return docs.map((document) => ({
    docId: document.id,
    url: document.url ?? "",
    title: document.title,
    source: document.source,
    type: document.type,
    stage,
  }));
}

export async function getCitations(env: Env, sessionId: string): Promise<CitationView[]> {
  const { results } = await env.DB.prepare(
    `SELECT c.doc_id AS doc_id,
            COALESCE(NULLIF(c.url, ''), d.url, '') AS url,
            COALESCE(NULLIF(c.title, ''), d.title, '') AS title,
            COALESCE(NULLIF(d.source, ''), NULLIF(c.source, ''), '') AS source,
            COALESCE(NULLIF(d.type, ''), NULLIF(c.type, ''), '') AS type,
            COALESCE(c.stage, '') AS stage
     FROM citations c
     LEFT JOIN documents d ON d.id = c.doc_id
     WHERE c.session_id = ?
     ORDER BY c.ts`,
  )
    .bind(sessionId)
    .all<{ doc_id: string; url: string; title: string; source: string; type: string; stage: string }>();
  return (results ?? []).map((row) => ({
    docId: row.doc_id,
    url: row.url ?? "",
    title: row.title ?? "",
    source: row.source ?? "",
    type: row.type ?? "",
    stage: row.stage ?? "",
  }));
}

export async function insertVisual(
  env: Env,
  visual: VisualView & { sessionId: string },
): Promise<void> {
  await ensureSession(env, visual.sessionId);
  await env.DB.prepare(
    "INSERT INTO visuals (id, session_id, kind, prompt, image_url, model) VALUES (?, ?, ?, ?, ?, ?)",
  )
    .bind(visual.id, visual.sessionId, visual.kind, visual.prompt, visual.imageUrl, visual.model)
    .run();
}

export async function listVisuals(env: Env, sessionId: string): Promise<VisualView[]> {
  const { results } = await env.DB.prepare(
    "SELECT id, kind, prompt, image_url, model FROM visuals WHERE session_id = ? ORDER BY created_at",
  )
    .bind(sessionId)
    .all<{ id: string; kind: string; prompt: string | null; image_url: string | null; model: string | null }>();
  return (results ?? []).map((row) => ({
    id: row.id,
    kind: row.kind,
    prompt: row.prompt ?? "",
    imageUrl: row.image_url,
    model: row.model,
  }));
}

export async function upsertGoogleUser(
  env: Env,
  profile: { sub: string; email: string | null; name: string | null },
): Promise<AuthUser> {
  const existing = await env.DB.prepare("SELECT id FROM users WHERE google_sub = ?")
    .bind(profile.sub)
    .first<{ id: string }>();
  if (existing) {
    await env.DB.prepare("UPDATE users SET email = ?, name = ? WHERE id = ?")
      .bind(profile.email, profile.name, existing.id)
      .run();
    return { id: existing.id, email: profile.email, name: profile.name };
  }
  const id = crypto.randomUUID();
  await env.DB.prepare("INSERT INTO users (id, google_sub, email, name) VALUES (?, ?, ?, ?)")
    .bind(id, profile.sub, profile.email, profile.name)
    .run();
  return { id, email: profile.email, name: profile.name };
}

export async function createAuthSession(env: Env, userId: string, expiresAt: string): Promise<string> {
  const id = crypto.randomUUID();
  await env.DB.prepare("INSERT INTO auth_sessions (id, user_id, expires_at) VALUES (?, ?, ?)")
    .bind(id, userId, expiresAt)
    .run();
  return id;
}

export async function getUserByAuthSession(env: Env, sessionId: string): Promise<AuthUser | null> {
  const row = await env.DB.prepare(
    `SELECT u.id AS id, u.email AS email, u.name AS name, s.expires_at AS expires_at
     FROM auth_sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.id = ?`,
  )
    .bind(sessionId)
    .first<{ id: string; email: string | null; name: string | null; expires_at: string }>();
  if (!row) return null;
  if (row.expires_at <= sqliteUtc()) {
    await env.DB.prepare("DELETE FROM auth_sessions WHERE id = ?").bind(sessionId).run();
    return null;
  }
  return { id: row.id, email: row.email, name: row.name };
}

export async function deleteAuthSession(env: Env, sessionId: string): Promise<void> {
  await env.DB.prepare("DELETE FROM auth_sessions WHERE id = ?").bind(sessionId).run();
}

export interface StoredKey {
  ciphertext: string;
  iv: string;
  last4: string | null;
}

export async function getUserKey(env: Env, userId: string, provider: string): Promise<StoredKey | null> {
  return env.DB.prepare(
    "SELECT ciphertext, iv, last4 FROM user_keys WHERE user_id = ? AND provider = ?",
  )
    .bind(userId, provider)
    .first<StoredKey>();
}

export async function upsertUserKey(
  env: Env,
  userId: string,
  provider: string,
  key: { ciphertext: string; iv: string; last4: string },
): Promise<void> {
  await env.DB.prepare(
    `INSERT INTO user_keys (user_id, provider, ciphertext, iv, last4)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(user_id, provider) DO UPDATE SET
       ciphertext = excluded.ciphertext,
       iv = excluded.iv,
       last4 = excluded.last4,
       created_at = datetime('now')`,
  )
    .bind(userId, provider, key.ciphertext, key.iv, key.last4)
    .run();
}

export async function deleteUserKey(env: Env, userId: string, provider: string): Promise<void> {
  await env.DB.prepare("DELETE FROM user_keys WHERE user_id = ? AND provider = ?")
    .bind(userId, provider)
    .run();
}
