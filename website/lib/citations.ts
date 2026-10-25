import type { Citation, IdeaCardData, ReferenceItem, TranscriptEntry } from "./types";

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

/** A transcript line cites a source when it says the title or includes the URL. */
export function textCites(text: string, citation: Citation): boolean {
  const hay = text.toLowerCase();
  const url = citation.url.trim().toLowerCase();
  if (url && hay.includes(url)) return true;

  const title = normalize(citation.title);
  if (title.length < 6) return false;
  return normalize(text).includes(title);
}

export function citationsForLine(
  entry: TranscriptEntry,
  citations: Citation[],
): Citation[] {
  const seen = new Set<string>();
  const matched: Citation[] = [];
  for (const citation of citations) {
    if (!citation.docId || seen.has(citation.docId)) continue;
    if (!textCites(entry.text, citation)) continue;
    seen.add(citation.docId);
    matched.push(citation);
  }
  return matched;
}

/**
 * Numbered references for the idea card: the card's evidence first, then any
 * cited source that was not already listed. Source and type come from citations.
 */
export function buildReferences(card: IdeaCardData, citations: Citation[]): ReferenceItem[] {
  const byId = new Map(citations.map((citation) => [citation.docId, citation]));
  const references: ReferenceItem[] = [];
  const seen = new Set<string>();

  const push = (item: ReferenceItem) => {
    const key = item.id || item.url;
    if (!key || seen.has(key)) return;
    seen.add(key);
    references.push(item);
  };

  for (const item of card.evidence) {
    const citation = byId.get(item.id);
    push({
      id: item.id,
      title: item.title || citation?.title || item.url,
      url: item.url || citation?.url || "",
      source: item.source || citation?.source || "",
      type: item.type || citation?.type || "",
    });
  }

  for (const citation of citations) {
    push({
      id: citation.docId,
      title: citation.title,
      url: citation.url,
      source: citation.source,
      type: citation.type,
    });
  }

  return references;
}
