import type { RawDocument } from "../../workers/shared/types";
import { clampText, fetchJson, stripHtml } from "./http";

/**
 * Europe PMC — the "space technology meets biology" slice (plan section 7).
 * `https://www.ebi.ac.uk/europepmc/webservices/rest/search`, no key.
 */
interface EuropePmcResult {
  id?: string;
  source?: string;
  title?: string;
  abstractText?: string;
  authorString?: string;
  firstPublicationDate?: string;
  pubYear?: string;
  journalInfo?: { journal?: { title?: string } };
  isOpenAccess?: string;
}

export async function fetchEuropePmc(term: string, limit: number): Promise<RawDocument[]> {
  const url =
    `https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=${encodeURIComponent(term)}` +
    `&format=json&resultType=core&pageSize=${Math.min(100, limit)}`;
  const payload = await fetchJson<{ resultList?: { result?: EuropePmcResult[] } }>(url);

  const documents: RawDocument[] = [];
  for (const result of payload.resultList?.result ?? []) {
    const id = result.id;
    const source = result.source ?? "MED";
    const title = stripHtml(result.title ?? "");
    if (!id || !title) continue;

    documents.push({
      id: `europepmc:${source}-${id}`,
      source: "europepmc",
      sourceId: `${source}-${id}`,
      type: "paper",
      title,
      abstract: clampText(result.abstractText ?? ""),
      url: `https://europepmc.org/article/${source}/${id}`,
      published: result.firstPublicationDate ?? (result.pubYear ? `${result.pubYear}-01-01` : null),
      center: result.journalInfo?.journal?.title ?? stripHtml(result.authorString ?? "") ?? null,
      licenseStatus:
        result.isOpenAccess === "Y" ? "Open access (Europe PMC)" : "Abstract only (Europe PMC)",
    });
    if (documents.length >= limit) break;
  }
  return documents;
}
