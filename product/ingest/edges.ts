import type { EnrichedDocument } from "../workers/shared/types";
import { cosine } from "../workers/shared/vector-math";

/**
 * Graph edges: each document's top 5 most similar documents, with `cross_domain`
 * set when the two have no domain tag in common (plan section 6.4).
 *
 * O(n²) over ~700 documents is about 250k cosine products — a second or two in
 * Node, and it keeps the whole edge build offline and reproducible.
 */
export interface Edge {
  src: string;
  dst: string;
  weight: number;
  reason: string | null;
  crossDomain: boolean;
}

const NEIGHBOURS_PER_DOCUMENT = 5;

export function buildEdges(documents: EnrichedDocument[]): Edge[] {
  const edges = new Map<string, Edge>();

  documents.forEach((source, sourceIndex) => {
    const scored: { document: EnrichedDocument; score: number }[] = [];

    documents.forEach((target, targetIndex) => {
      if (sourceIndex === targetIndex) return;
      scored.push({ document: target, score: cosine(source.embedding, target.embedding) });
    });

    scored.sort((a, b) => b.score - a.score);

    for (const { document: target, score } of scored.slice(0, NEIGHBOURS_PER_DOCUMENT)) {
      if (score <= 0) continue;
      const key = `${source.id}\u0000${target.id}`;
      if (edges.has(key)) continue;

      const shared = source.domains.filter((domain) => target.domains.includes(domain));
      edges.set(key, {
        src: source.id,
        dst: target.id,
        weight: Math.round(score * 1000) / 1000,
        // Gemma fills the real reason lazily in find_related; this is the cheap
        // structural explanation so the graph has something to show immediately.
        reason: shared.length
          ? `Shared domain: ${shared.slice(0, 2).join(", ")}`
          : `Cross-domain link: ${source.domains[0] ?? "space"} → ${target.domains[0] ?? "space"}`,
        crossDomain: shared.length === 0,
      });
    }
  });

  return [...edges.values()];
}
