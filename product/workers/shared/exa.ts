import type { Env } from "./env";
import type { DocType, TechDocument } from "./types";

/** Exa Search API. https://api.exa.ai/search — header `x-api-key`. */
const EXA_SEARCH_URL = "https://api.exa.ai/search";

/** One day. Papers and patents do not move fast enough to refetch every turn. */
const CACHE_TTL_SQL = "-1 day";

export const EXA_NUM_RESULTS = 5;

/** Domains the voice agent can cite: papers, patents, NASA reports. */
export const EXA_SOURCE_DOMAINS = ["arxiv.org", "patents.google.com", "ntrs.nasa.gov"] as const;

export const EXA_PAPER_CATEGORY = "research paper";

export interface ExaQuery {
  query: string;
  numResults?: number;
  /** Exa category, for example "research paper". Omit for a mixed search. */
  category?: string;
  /** Hosts such as arxiv.org. Omit to search the open web. */
  includeDomains?: readonly string[];
}

interface CachedHit {
  id: string;
  title: string;
  url: string;
  highlight: string;
  published: string | null;
  source: string;
  type: DocType;
}

/**
 * Live web search. Returns [] when EXA_API_KEY is unset or Exa fails, so the
 * D1/Vectorize path keeps working. Successful responses are cached in D1.
 * The key is sent only as `x-api-key` and is never logged or stored.
 */
export async function exaSearch(env: Env, options: ExaQuery): Promise<TechDocument[]> {
  const apiKey = env.EXA_API_KEY?.trim();
  if (!apiKey) return [];

  const query = options.query.trim();
  if (!query) return [];

  const numResults = clamp(options.numResults ?? EXA_NUM_RESULTS);
  const category = options.category?.trim() || "";
  const includeDomains = [...(options.includeDomains ?? [])]
    .map((domain) => domain.trim().toLowerCase())
    .filter(Boolean)
    .sort();

  const cacheKey = await sha256(
    JSON.stringify({ query: query.toLowerCase(), numResults, category, includeDomains }),
  );
  const cached = await readCache(env, cacheKey);
  if (cached) return cached;

  const body: Record<string, unknown> = {
    query,
    numResults,
    contents: { highlights: { maxCharacters: 400 } },
  };
  if (category) body.category = category;
  if (includeDomains.length) body.includeDomains = includeDomains;

  try {
    const response = await fetch(EXA_SEARCH_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) {
      console.warn("Exa search failed", { status: response.status });
      return [];
    }
    const data = (await response.json()) as { results?: unknown[] };
    const hits = await Promise.all((data.results ?? []).slice(0, numResults).map((result) => toHit(result, category)));
    const documents = hits.filter((hit): hit is CachedHit => hit !== null).map(hitToDocument);
    await writeCache(env, cacheKey, query, documents.map(documentToHit)).catch((error) => {
      console.warn("Exa cache write failed", { error: error instanceof Error ? error.message.slice(0, 120) : "failed" });
    });
    return documents;
  } catch (error) {
    console.warn("Exa search failed", { error: error instanceof Error ? error.message.slice(0, 120) : "failed" });
    return [];
  }
}

function clamp(value: number): number {
  if (!Number.isFinite(value)) return EXA_NUM_RESULTS;
  return Math.min(10, Math.max(1, Math.trunc(value)));
}

async function readCache(env: Env, cacheKey: string): Promise<TechDocument[] | null> {
  try {
    const row = await env.DB.prepare(
      `SELECT payload FROM exa_cache WHERE cache_key = ? AND fetched_at > datetime('now', '${CACHE_TTL_SQL}')`,
    )
      .bind(cacheKey)
      .first<{ payload: string }>();
    if (!row?.payload) return null;
    const parsed = JSON.parse(row.payload) as CachedHit[];
    if (!Array.isArray(parsed)) return null;
    return parsed.map(hitToDocument);
  } catch {
    return null;
  }
}

async function writeCache(env: Env, cacheKey: string, query: string, hits: CachedHit[]): Promise<void> {
  await env.DB.prepare(
    `INSERT INTO exa_cache (cache_key, query, payload, fetched_at)
     VALUES (?, ?, ?, datetime('now'))
     ON CONFLICT(cache_key) DO UPDATE SET
       query = excluded.query,
       payload = excluded.payload,
       fetched_at = datetime('now')`,
  )
    .bind(cacheKey, query.slice(0, 500), JSON.stringify(hits))
    .run();
}

async function toHit(value: unknown, category: string): Promise<CachedHit | null> {
  if (!value || typeof value !== "object") return null;
  const row = value as {
    title?: unknown;
    url?: unknown;
    publishedDate?: unknown;
    highlights?: unknown;
    text?: unknown;
  };
  const url = typeof row.url === "string" ? row.url.trim() : "";
  const title = typeof row.title === "string" ? row.title.trim() : "";
  if (!url || !title) return null;
  const kind = classify(url, category);
  return {
    id: `exa:${(await sha256(url)).slice(0, 16)}`,
    title,
    url,
    highlight: highlightText(row).slice(0, 500),
    published: typeof row.publishedDate === "string" && row.publishedDate ? row.publishedDate.slice(0, 10) : null,
    source: kind.source,
    type: kind.type,
  };
}

function hitToDocument(hit: CachedHit): TechDocument {
  return {
    id: hit.id,
    source: hit.source,
    type: hit.type,
    title: hit.title,
    summary: hit.highlight,
    domains: [],
    url: hit.url,
    published: hit.published,
    center: null,
    licenseStatus: null,
  };
}

function documentToHit(document: TechDocument): CachedHit {
  return {
    id: document.id,
    title: document.title,
    url: document.url,
    highlight: document.summary,
    published: document.published,
    source: document.source,
    type: document.type,
  };
}

function highlightText(row: { highlights?: unknown; text?: unknown }): string {
  if (Array.isArray(row.highlights)) {
    const parts = row.highlights
      .map((item) => {
        if (typeof item === "string") return item.trim();
        if (item && typeof item === "object" && "text" in item && typeof item.text === "string") return item.text.trim();
        return "";
      })
      .filter(Boolean);
    if (parts.length) return parts.join(" ");
  }
  return typeof row.text === "string" ? row.text.trim() : "";
}

function classify(url: string, category: string): { source: string; type: DocType } {
  let host = "";
  try {
    host = new URL(url).hostname.replace(/^www\./, "");
  } catch {
    host = "";
  }
  if (host === "arxiv.org" || host.endsWith(".arxiv.org")) return { source: "arxiv", type: "paper" };
  if (host === "patents.google.com" || host.endsWith(".patents.google.com")) {
    return { source: "google_patents", type: "patent" };
  }
  if (host === "ntrs.nasa.gov" || host.endsWith(".ntrs.nasa.gov")) return { source: "ntrs", type: "report" };
  if (category === EXA_PAPER_CATEGORY) return { source: "exa", type: "paper" };
  return { source: "exa", type: "report" };
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
