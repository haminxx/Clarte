/**
 * Pure vector helpers shared by the Workers runtime and the Node ingest script.
 * No platform globals here — both runtimes import this file.
 *
 * Embeddings come from Workers AI `@cf/baai/bge-base-en-v1.5`, which matches the
 * live Vectorize index `paber-docs`: 768 dimensions, cosine distance.
 */

export const EMBEDDING_MODEL = "@cf/baai/bge-base-en-v1.5";

export const EMBEDDING_DIMENSIONS = 768;

export function normalize(values: number[]): number[] {
  const magnitude = Math.sqrt(values.reduce((sum, value) => sum + value * value, 0));
  if (!magnitude) return values;
  return values.map((value) => value / magnitude);
}

export function cosine(a: number[], b: number[]): number {
  let dot = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i++) dot += a[i] * b[i];
  return dot;
}

/**
 * Deterministic hashed bag-of-words vector, used when no Cloudflare credentials
 * are available. Not semantic, but stable and in the right space, so ingest,
 * Vectorize round-trips and the demo all still run without keys.
 */
export function stubEmbedding(text: string): number[] {
  const vector = new Array<number>(EMBEDDING_DIMENSIONS).fill(0);
  const tokens = text.toLowerCase().match(/[a-z0-9]+/g) ?? [];
  for (const token of tokens) {
    let hash = 2166136261;
    for (let i = 0; i < token.length; i++) {
      hash ^= token.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    vector[Math.abs(hash) % EMBEDDING_DIMENSIONS] += 1;
  }
  return normalize(vector);
}

export function truncateForEmbedding(text: string): string {
  return text.replace(/\s+/g, " ").trim().slice(0, 2000);
}
