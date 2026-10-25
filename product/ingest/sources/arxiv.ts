import type { RawDocument } from "../../workers/shared/types";
import { clampText, fetchText, sleep, stripHtml } from "./http";

/**
 * arXiv Atom API — `https://export.arxiv.org/api/query` (https is required).
 * Appendix A3: at most one request every 3 seconds, space categories only.
 *
 * The response is Atom XML. The feed is small and regular, so a dependency-free
 * extraction is enough here and keeps the ingest script free of an XML parser.
 */

const REQUEST_SPACING_MS = 3000;
let lastRequestAt = 0;

function tagText(entry: string, tag: string): string {
  const match = entry.match(new RegExp(`<${tag}(?:[^>]*)>([\\s\\S]*?)</${tag}>`));
  return match ? stripHtml(match[1]) : "";
}

export async function fetchArxiv(
  term: string,
  category: string,
  limit: number,
): Promise<RawDocument[]> {
  const elapsed = Date.now() - lastRequestAt;
  if (elapsed < REQUEST_SPACING_MS) await sleep(REQUEST_SPACING_MS - elapsed);
  lastRequestAt = Date.now();

  const searchQuery = `all:"${term}" AND cat:${category}`;
  const url =
    `https://export.arxiv.org/api/query?search_query=${encodeURIComponent(searchQuery)}` +
    `&start=0&max_results=${limit}&sortBy=relevance`;
  const xml = await fetchText(url);

  const documents: RawDocument[] = [];
  for (const entry of xml.split("<entry>").slice(1)) {
    const absUrl = tagText(entry, "id");
    const arxivId = absUrl.replace(/^https?:\/\/arxiv\.org\/abs\//, "").trim();
    const title = tagText(entry, "title");
    if (!arxivId || !title) continue;

    const authors = [...entry.matchAll(/<name>([\s\S]*?)<\/name>/g)].map((match) =>
      stripHtml(match[1]),
    );

    documents.push({
      id: `arxiv:${arxivId}`,
      source: "arxiv",
      sourceId: arxivId,
      type: "paper",
      title,
      abstract: clampText(tagText(entry, "summary")),
      url: `https://arxiv.org/abs/${arxivId}`,
      published: tagText(entry, "published").slice(0, 10) || null,
      center: authors.slice(0, 3).join(", ") || "arXiv",
      licenseStatus: "arXiv preprint (see arXiv license terms)",
    });
  }
  return documents;
}
