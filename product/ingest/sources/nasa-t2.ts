import type { DocType, RawDocument } from "../../workers/shared/types";
import { fetchJson, stripHtml } from "./http";

/**
 * NASA Technology Transfer (T2) — patents, open-source software and spinoffs.
 * `https://technology.nasa.gov/api/api/<kind>/<term>`, no key (plan section 7).
 *
 * The API answers with positional arrays, not objects:
 *   0 id, 1 case number, 2 title, 3 description, 4 reference, 5 category,
 *   6 release/licence note, 9 NASA center, 10 image, 12 relevance score
 * Titles and descriptions come back with <span class="highlight"> markup.
 */
export type T2Kind = "patent" | "software" | "spinoff";

const T2_TYPE: Record<T2Kind, DocType> = {
  patent: "patent",
  software: "software",
  spinoff: "spinoff",
};

const T2_LICENCE: Record<T2Kind, string> = {
  patent: "Licensable (NASA T2 patent)",
  software: "NASA open-source software catalog",
  spinoff: "NASA spinoff case study",
};

function itemUrl(kind: T2Kind, caseNumber: string): string {
  if (kind === "software") return `https://software.nasa.gov/software/${encodeURIComponent(caseNumber)}`;
  if (kind === "spinoff") return `https://technology.nasa.gov/spinoff/${encodeURIComponent(caseNumber)}`;
  return `https://technology.nasa.gov/patent/${encodeURIComponent(caseNumber)}`;
}

export async function fetchNasaT2(kind: T2Kind, term: string, limit: number): Promise<RawDocument[]> {
  const url = `https://technology.nasa.gov/api/api/${kind}/${encodeURIComponent(term)}`;
  const payload = await fetchJson<{ results?: unknown[][] }>(url);
  const rows = payload.results ?? [];

  const documents: RawDocument[] = [];
  for (const row of rows.slice(0, limit)) {
    const field = (index: number): string => stripHtml(String(row[index] ?? ""));
    const caseNumber = field(1) || field(0);
    const title = field(2);
    if (!caseNumber || !title) continue;

    documents.push({
      id: `nasa_t2:${caseNumber}`,
      source: "nasa_t2",
      sourceId: caseNumber,
      type: T2_TYPE[kind],
      title,
      abstract: field(3),
      url: itemUrl(kind, caseNumber),
      published: null,
      center: field(9) || "NASA",
      licenseStatus: [T2_LICENCE[kind], field(6)].filter(Boolean).join(" — "),
    });
  }
  return documents;
}
