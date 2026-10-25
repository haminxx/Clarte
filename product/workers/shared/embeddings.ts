import type { Env } from "./env";
import {
  EMBEDDING_DIMENSIONS,
  EMBEDDING_MODEL,
  normalize,
  stubEmbedding,
  truncateForEmbedding,
} from "./vector-math";

export { EMBEDDING_DIMENSIONS, EMBEDDING_MODEL };

/**
 * Query-side embedding. Documents are embedded once by the ingest script
 * (Workers AI REST), queries are embedded here through the `AI` binding.
 *
 * Falls back to the deterministic stub vector when Workers AI is unavailable, so
 * `wrangler dev` without credentials still answers searches instead of 500-ing.
 */
export async function embedQuery(env: Env, text: string): Promise<number[]> {
  const input = truncateForEmbedding(text);
  if (!input) return stubEmbedding("");

  try {
    const result = (await env.AI.run(EMBEDDING_MODEL as keyof AiModels, { text: [input] } as never)) as {
      data?: number[][];
    };
    const values = result?.data?.[0];
    if (values?.length === EMBEDDING_DIMENSIONS) return normalize(values);
    console.warn("Unexpected embedding shape from Workers AI; using stub vector");
  } catch (error) {
    console.warn("Workers AI embedding failed; using stub vector", { error: String(error) });
  }
  return stubEmbedding(input);
}
