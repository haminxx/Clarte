/**
 * PABER ingest — plan section 7 and Appendix A3/B4.
 *
 * Runs locally (Node), never inside a Worker: free Workers get 10 ms CPU and 50
 * subrequests per request, which cannot cover hundreds of API calls plus Gemma 4
 * and embeddings. This script fetches from the official APIs, has Gemma 4
 * summarise and tag, embeds with Workers AI, builds the graph edges, and writes
 * loadable artifacts into product/data/. `ingest/load.ts` pushes them to D1 and
 * Vectorize with wrangler.
 *
 *   npm run ingest:dry          # 40 documents, no API keys needed, local fallbacks
 *   npm run ingest              # full run, about 710 documents
 *   npm run ingest -- --limit 200 --sources nasa_t2,ntrs
 */
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import type { EnrichedDocument, RawDocument } from "../workers/shared/types";
import { EMBEDDING_DIMENSIONS } from "../workers/shared/vector-math";
import { buildEdges, type Edge } from "./edges";
import { enrichDocuments } from "./enrich";
import { ARXIV_CATEGORIES, EUROPEPMC_SEEDS, QUOTAS, SEEDS } from "./seeds";
import { fetchArxiv } from "./sources/arxiv";
import { fetchEuropePmc } from "./sources/europepmc";
import { fetchNasaT2 } from "./sources/nasa-t2";
import { fetchNtrs } from "./sources/ntrs";
import { fetchOpenAlex } from "./sources/openalex";

const DATA_DIR = fileURLToPath(new URL("../data/", import.meta.url));
const SQL_CHUNK_SIZE = 40;

interface Args {
  limit: number | null;
  dryRun: boolean;
  sources: Set<string> | null;
}

function parseArgs(argv: string[]): Args {
  const args: Args = { limit: null, dryRun: false, sources: null };
  for (let index = 0; index < argv.length; index++) {
    const flag = argv[index];
    if (flag === "--dry-run") args.dryRun = true;
    else if (flag === "--limit") args.limit = Number(argv[++index]) || null;
    else if (flag === "--sources") args.sources = new Set(argv[++index].split(",").map((s) => s.trim()));
  }
  return args;
}

function wanted(args: Args, source: string): boolean {
  return !args.sources || args.sources.has(source);
}

/** Round-robin the seed list so a quota spreads across topics, not just the first. */
async function collect(
  label: string,
  quota: number,
  seeds: readonly string[],
  fetcher: (seed: string, perSeed: number) => Promise<RawDocument[]>,
): Promise<RawDocument[]> {
  const perSeed = Math.max(4, Math.ceil(quota / seeds.length));
  const collected: RawDocument[] = [];

  for (const seed of seeds) {
    if (collected.length >= quota) break;
    try {
      const documents = await fetcher(seed, perSeed);
      collected.push(...documents);
      console.log(`  ${label} "${seed}": ${documents.length} (total ${collected.length})`);
    } catch (error) {
      console.warn(`  ${label} "${seed}" failed: ${String(error)}`);
    }
  }

  return collected.slice(0, quota);
}

function dedupe(documents: RawDocument[]): RawDocument[] {
  const seen = new Set<string>();
  const unique: RawDocument[] = [];
  for (const document of documents) {
    const key = document.id.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(document);
  }
  return unique;
}

function sqlString(value: string | null): string {
  if (value === null) return "NULL";
  return `'${value.replace(/'/g, "''")}'`;
}

function documentInsert(document: EnrichedDocument): string {
  return (
    "INSERT OR REPLACE INTO documents " +
    "(id, source, source_id, type, title, abstract, summary, domains, url, published, center, license_status) VALUES (" +
    [
      sqlString(document.id),
      sqlString(document.source),
      sqlString(document.sourceId),
      sqlString(document.type),
      sqlString(document.title),
      sqlString(document.abstract),
      sqlString(document.summary),
      sqlString(JSON.stringify(document.domains)),
      sqlString(document.url),
      sqlString(document.published),
      sqlString(document.center),
      sqlString(document.licenseStatus),
    ].join(", ") +
    ");"
  );
}

function edgeInsert(edge: Edge): string {
  return (
    "INSERT OR REPLACE INTO edges (src, dst, weight, reason, cross_domain) VALUES (" +
    [
      sqlString(edge.src),
      sqlString(edge.dst),
      String(edge.weight),
      sqlString(edge.reason),
      edge.crossDomain ? "1" : "0",
    ].join(", ") +
    ");"
  );
}

async function writeSqlChunks(name: string, statements: string[]): Promise<string[]> {
  const files: string[] = [];
  for (let index = 0; index < statements.length; index += SQL_CHUNK_SIZE) {
    const part = String(files.length + 1).padStart(3, "0");
    const file = `sql/${name}-${part}.sql`;
    await writeFile(
      new URL(file, `file://${DATA_DIR}`),
      `${statements.slice(index, index + SQL_CHUNK_SIZE).join("\n")}\n`,
      "utf8",
    );
    files.push(file);
  }
  return files;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const scale = args.limit ? args.limit / 710 : 1;
  const quota = (key: keyof typeof QUOTAS): number =>
    Math.max(4, Math.round(QUOTAS[key] * Math.min(1, scale)));

  console.log(
    `PABER ingest — ${args.dryRun ? "dry run (no model calls)" : "live"}${
      args.limit ? `, capped at ${args.limit} documents` : ""
    }`,
  );

  const raw: RawDocument[] = [];

  if (wanted(args, "nasa_t2")) {
    console.log("\nNASA T2 patents");
    raw.push(
      ...(await collect("patent", quota("nasa_t2_patent"), SEEDS, (seed, perSeed) =>
        fetchNasaT2("patent", seed, perSeed),
      )),
    );
    console.log("NASA T2 spinoffs");
    raw.push(
      ...(await collect("spinoff", quota("nasa_t2_spinoff"), SEEDS, (seed, perSeed) =>
        fetchNasaT2("spinoff", seed, perSeed),
      )),
    );
    console.log("NASA T2 software");
    raw.push(
      ...(await collect("software", quota("nasa_t2_software"), SEEDS, (seed, perSeed) =>
        fetchNasaT2("software", seed, perSeed),
      )),
    );
  }

  if (wanted(args, "ntrs")) {
    console.log("\nNASA NTRS reports");
    raw.push(...(await collect("ntrs", quota("ntrs"), SEEDS, (seed, perSeed) => fetchNtrs(seed, perSeed))));
  }

  if (wanted(args, "arxiv")) {
    console.log("\narXiv space categories (1 request / 3 s)");
    for (const category of ARXIV_CATEGORIES) {
      raw.push(
        ...(await collect(
          `arxiv ${category}`,
          Math.ceil(quota("arxiv") / ARXIV_CATEGORIES.length),
          SEEDS.slice(0, 6),
          (seed, perSeed) => fetchArxiv(seed, category, perSeed),
        )),
      );
    }
  }

  if (wanted(args, "europepmc")) {
    console.log("\nEurope PMC (space tech meets biology)");
    raw.push(
      ...(await collect("europepmc", quota("europepmc"), EUROPEPMC_SEEDS, (seed, perSeed) =>
        fetchEuropePmc(seed, perSeed),
      )),
    );
  }

  // Optional expansion source: only runs when a key or contact email is present.
  if (wanted(args, "openalex") && (process.env.OPENALEX_API_KEY || process.env.OPENALEX_MAILTO)) {
    console.log("\nOpenAlex (optional)");
    raw.push(
      ...(await collect("openalex", 60, SEEDS.slice(0, 6), (seed, perSeed) =>
        fetchOpenAlex(seed, perSeed, {
          apiKey: process.env.OPENALEX_API_KEY,
          mailto: process.env.OPENALEX_MAILTO,
        }),
      )),
    );
  }

  let documents = dedupe(raw);
  if (args.limit) documents = documents.slice(0, args.limit);
  console.log(`\nFetched ${raw.length} records, ${documents.length} unique after dedupe.`);
  if (!documents.length) throw new Error("No documents fetched — check network access.");

  console.log("\nEnriching with Gemma 4 and embedding with Workers AI...");
  const enriched = await enrichDocuments(documents, {
    gemini: process.env.GEMINI_API_KEY,
    gemmaModel: process.env.GEMMA_MODEL,
    accountId: process.env.CLOUDFLARE_ACCOUNT_ID,
    cloudflareToken: process.env.CLOUDFLARE_API_TOKEN,
    offline: args.dryRun,
    onProgress: (done, total) => {
      if (done % 40 === 0 || done === total) console.log(`  summarised ${done}/${total}`);
    },
  });

  console.log("\nBuilding graph edges (top 5 neighbours per document)...");
  const edges = buildEdges(enriched);
  const crossDomain = edges.filter((edge) => edge.crossDomain).length;
  console.log(`  ${edges.length} edges, ${crossDomain} cross-domain.`);

  await mkdir(new URL("sql/", `file://${DATA_DIR}`), { recursive: true });

  await writeFile(
    new URL("documents.json", `file://${DATA_DIR}`),
    JSON.stringify(
      enriched.map(({ embedding, ...document }) => ({ ...document, dimensions: embedding.length })),
      null,
      2,
    ),
    "utf8",
  );

  const vectors = enriched
    .map((document) =>
      JSON.stringify({
        id: document.id,
        values: document.embedding,
        metadata: { type: document.type, source: document.source, domains: document.domains },
      }),
    )
    .join("\n");
  await writeFile(new URL("vectors.ndjson", `file://${DATA_DIR}`), `${vectors}\n`, "utf8");

  const documentFiles = await writeSqlChunks("documents", enriched.map(documentInsert));
  const edgeFiles = await writeSqlChunks("edges", edges.map(edgeInsert));

  await writeFile(
    new URL("manifest.json", `file://${DATA_DIR}`),
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        dryRun: args.dryRun,
        documents: enriched.length,
        edges: edges.length,
        crossDomainEdges: crossDomain,
        dimensions: EMBEDDING_DIMENSIONS,
        bySource: enriched.reduce<Record<string, number>>((counts, document) => {
          counts[document.source] = (counts[document.source] ?? 0) + 1;
          return counts;
        }, {}),
        byType: enriched.reduce<Record<string, number>>((counts, document) => {
          counts[document.type] = (counts[document.type] ?? 0) + 1;
          return counts;
        }, {}),
        sqlFiles: [...documentFiles, ...edgeFiles],
        vectorFile: "vectors.ndjson",
      },
      null,
      2,
    ),
    "utf8",
  );

  console.log(
    `\nWrote product/data/: ${enriched.length} documents, ${edges.length} edges, ` +
      `${documentFiles.length + edgeFiles.length} SQL chunks, vectors.ndjson.`,
  );
  console.log("Next: npm run load   (pushes to D1 + Vectorize via wrangler)");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
