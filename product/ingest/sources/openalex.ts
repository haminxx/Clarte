import type { RawDocument } from "../../workers/shared/types";
import { clampText, fetchJson, stripHtml } from "./http";

/**
 * OpenAlex — optional expansion source (plan section 7, Appendix A4).
 * The keyless daily budget was exhausted during planning, so this source only
 * runs when OPENALEX_API_KEY (or OPENALEX_MAILTO) is set. Skipped otherwise.
 */
interface OpenAlexWork {
  id?: string;
  doi?: string;
  display_name?: string;
  publication_date?: string;
  abstract_inverted_index?: Record<string, number[]>;
  primary_location?: { source?: { display_name?: string } };
  open_access?: { is_oa?: boolean };
}

/** OpenAlex ships abstracts as an inverted index; rebuild the text from it. */
function rebuildAbstract(index: Record<string, number[]> | undefined): string {
  if (!index) return "";
  const words: string[] = [];
  for (const [word, positions] of Object.entries(index)) {
    for (const position of positions) words[position] = word;
  }
  return words.filter(Boolean).join(" ");
}

export async function fetchOpenAlex(
  term: string,
  limit: number,
  credentials: { apiKey?: string; mailto?: string },
): Promise<RawDocument[]> {
  if (!credentials.apiKey && !credentials.mailto) return [];

  const params = new URLSearchParams({
    search: term,
    per_page: String(Math.min(50, limit)),
    filter: "type:article",
  });
  if (credentials.apiKey) params.set("api_key", credentials.apiKey);
  if (credentials.mailto) params.set("mailto", credentials.mailto);

  const payload = await fetchJson<{ results?: OpenAlexWork[] }>(
    `https://api.openalex.org/works?${params.toString()}`,
  );

  const documents: RawDocument[] = [];
  for (const work of payload.results ?? []) {
    const openAlexId = (work.id ?? "").replace("https://openalex.org/", "");
    const title = stripHtml(work.display_name ?? "");
    if (!openAlexId || !title) continue;

    documents.push({
      id: `openalex:${openAlexId}`,
      source: "openalex",
      sourceId: openAlexId,
      type: "paper",
      title,
      abstract: clampText(rebuildAbstract(work.abstract_inverted_index)),
      url: work.doi ?? `https://openalex.org/${openAlexId}`,
      published: work.publication_date ?? null,
      center: work.primary_location?.source?.display_name ?? null,
      licenseStatus: work.open_access?.is_oa ? "Open access (OpenAlex)" : "Metadata only (OpenAlex)",
    });
    if (documents.length >= limit) break;
  }
  return documents;
}
