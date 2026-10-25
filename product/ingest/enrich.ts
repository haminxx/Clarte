import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { gemmaConfig, gemmaJson, hasGemma, type GemmaConfig } from "../workers/shared/gemma";
import type { EnrichedDocument, RawDocument } from "../workers/shared/types";
import {
  EMBEDDING_DIMENSIONS,
  EMBEDDING_MODEL,
  normalize,
  stubEmbedding,
  truncateForEmbedding,
} from "../workers/shared/vector-math";
import { sleep } from "./sources/http";

/**
 * Enrichment step of the local ingest run (plan Appendix B4): Gemma 4 writes the
 * summary and domain tags, Workers AI embeds the text. Both are called over HTTP
 * from Node, because free Workers get 10 ms CPU and 50 subrequests per request.
 */

export interface EnrichOptions {
  gemini?: string;
  gemmaModel?: string;
  accountId?: string;
  cloudflareToken?: string;
  /** Skip every network model call and use deterministic local fallbacks. */
  offline?: boolean;
  concurrency?: number;
  onProgress?: (done: number, total: number) => void;
}

const ENRICH_PROMPT_PATH = fileURLToPath(new URL("../prompts/enrich.md", import.meta.url));

let cachedPrompt: string | null = null;

async function enrichPrompt(): Promise<string> {
  cachedPrompt ??= await readFile(ENRICH_PROMPT_PATH, "utf8");
  return cachedPrompt;
}

/** Deterministic fallback so ingest still produces a usable library without keys. */
function fallbackEnrichment(document: RawDocument): { summary: string; domains: string[] } {
  const sentences = document.abstract.split(/(?<=[.!?])\s+/).filter(Boolean);
  const summary = sentences.slice(0, 2).join(" ") || document.title;

  const haystack = `${document.title} ${document.abstract}`.toLowerCase();
  const rules: [string, RegExp][] = [
    ["thermal-management", /thermal|heat|cryogen|radiator|cooling/],
    ["energy-storage", /batter|fuel cell|supercapacitor|energy storage/],
    ["propulsion", /propuls|thruster|engine|rocket/],
    ["materials", /composite|alloy|coating|ceramic|material/],
    ["sensing", /sensor|detector|spectromet|measurement/],
    ["robotics", /robot|manipulator|autonom|rover/],
    ["communications", /antenna|communicat|telemetry|radio/],
    ["life-support", /life support|habitat|oxygen|water recovery/],
    ["imaging", /imaging|camera|telescope|optical/],
    ["power-systems", /solar|power system|photovoltaic|generator/],
  ];
  const domains = rules.filter(([, pattern]) => pattern.test(haystack)).map(([domain]) => domain);

  return { summary, domains: domains.length ? domains.slice(0, 4) : ["space-technology"] };
}

async function gemmaEnrich(
  config: GemmaConfig,
  document: RawDocument,
): Promise<{ summary: string; domains: string[] }> {
  const result = await gemmaJson<{ summary?: string; domains?: string[] }>(config, {
    instruction: await enrichPrompt(),
    input: `TITLE: ${document.title}\nTYPE: ${document.type}\nSOURCE: ${document.source}\nORGANISATION: ${
      document.center ?? "unknown"
    }\nABSTRACT: ${document.abstract || "(none)"}`,
    maxOutputTokens: 400,
  });

  const fallback = fallbackEnrichment(document);
  return {
    summary: result?.summary?.trim() || fallback.summary,
    domains: (result?.domains ?? []).filter(Boolean).slice(0, 5).length
      ? result!.domains!.filter(Boolean).slice(0, 5)
      : fallback.domains,
  };
}

/**
 * Workers AI embeddings over REST. The Worker uses the `AI` binding at query time;
 * ingest runs in Node, so it calls the same model through the account endpoint.
 */
async function embedViaRest(
  options: { accountId: string; token: string },
  texts: string[],
): Promise<number[][]> {
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${options.accountId}/ai/run/${EMBEDDING_MODEL}`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${options.token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ text: texts }),
      signal: AbortSignal.timeout(60_000),
    },
  );

  if (!response.ok) {
    throw new Error(`Workers AI embedding failed: ${response.status} ${await response.text()}`);
  }

  const payload = (await response.json()) as { result?: { data?: number[][] } };
  const vectors = payload.result?.data;
  if (!vectors?.length) throw new Error("Workers AI embedding returned no vectors");
  return vectors.map(normalize);
}

export async function enrichDocuments(
  documents: RawDocument[],
  options: EnrichOptions,
): Promise<EnrichedDocument[]> {
  const config = gemmaConfig({
    GEMINI_API_KEY: options.gemini,
    GEMMA_MODEL: options.gemmaModel,
  });
  const useGemma = !options.offline && hasGemma(config);
  const canEmbed = !options.offline && Boolean(options.accountId && options.cloudflareToken);
  const concurrency = Math.max(1, Math.min(6, options.concurrency ?? 4));

  // Stage 1: summaries and tags, a few documents at a time so the free Gemini
  // tier is not hammered (plan Appendix B4 flags the rate limit as unverified).
  const enriched: EnrichedDocument[] = [];
  for (let offset = 0; offset < documents.length; offset += concurrency) {
    const batch = documents.slice(offset, offset + concurrency);
    const results = await Promise.all(
      batch.map(async (document) => {
        let enrichment = fallbackEnrichment(document);
        if (useGemma) {
          try {
            enrichment = await gemmaEnrich(config, document);
          } catch (error) {
            console.warn(`  Gemma failed for ${document.id}: ${String(error)}`);
          }
        }
        return { ...document, ...enrichment, embedding: [] as number[] };
      }),
    );
    enriched.push(...results);
    options.onProgress?.(enriched.length, documents.length);
    if (useGemma && offset + concurrency < documents.length) await sleep(400);
  }

  // Stage 2: embeddings, batched. bge-base-en-v1.5 accepts an array of texts.
  const batchSize = 25;
  for (let offset = 0; offset < enriched.length; offset += batchSize) {
    const batch = enriched.slice(offset, offset + batchSize);
    const texts = batch.map((document) =>
      truncateForEmbedding(`${document.title}. ${document.summary} ${document.abstract}`),
    );

    let vectors: number[][] | null = null;
    if (canEmbed) {
      try {
        vectors = await embedViaRest(
          { accountId: options.accountId!, token: options.cloudflareToken! },
          texts,
        );
      } catch (error) {
        console.warn(`  Workers AI embedding failed; using stub vectors: ${String(error)}`);
      }
    }

    batch.forEach((document, index) => {
      const vector = vectors?.[index];
      document.embedding =
        vector?.length === EMBEDDING_DIMENSIONS ? vector : stubEmbedding(texts[index]);
    });
  }

  return enriched;
}
