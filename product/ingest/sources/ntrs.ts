import type { RawDocument } from "../../workers/shared/types";
import { clampText, fetchJson, stripHtml } from "./http";

/**
 * NASA Technical Reports Server — `https://ntrs.nasa.gov/api/citations/search?q=`,
 * no key (plan section 7). Public distribution only, per Appendix A3.
 */
interface NtrsResult {
  id?: number | string;
  title?: string;
  abstract?: string;
  created?: string;
  distribution?: string;
  stiType?: string;
  center?: { code?: string; name?: string };
  authorAffiliations?: { meta?: { author?: { name?: string } } }[];
}

export async function fetchNtrs(term: string, limit: number): Promise<RawDocument[]> {
  const url =
    `https://ntrs.nasa.gov/api/citations/search?q=${encodeURIComponent(term)}` +
    `&page.size=${Math.min(100, limit)}&distribution=PUBLIC`;
  const payload = await fetchJson<{ results?: NtrsResult[] }>(url);

  const documents: RawDocument[] = [];
  for (const result of payload.results ?? []) {
    const id = String(result.id ?? "");
    const title = stripHtml(result.title ?? "");
    if (!id || !title) continue;
    if (result.distribution && result.distribution !== "PUBLIC") continue;

    documents.push({
      id: `ntrs:${id}`,
      source: "ntrs",
      sourceId: id,
      type: "report",
      title,
      abstract: clampText(result.abstract ?? ""),
      url: `https://ntrs.nasa.gov/citations/${id}`,
      published: result.created ? result.created.slice(0, 10) : null,
      center: result.center?.name ?? result.center?.code ?? "NASA",
      licenseStatus: "NASA technical report (US government purpose rights)",
    });
    if (documents.length >= limit) break;
  }
  return documents;
}
