/** Types shared by the Workers runtime and the Node ingest scripts. Plan section 6.4. */

/** `documents.type` */
export type DocType = "paper" | "patent" | "report" | "software" | "spinoff";

/**
 * `documents.source`. PatentsView is intentionally absent: it was discontinued
 * during the USPTO ODP migration (plan Appendix A1), so US-patent expansion goes
 * through ODP later instead.
 */
export type SourceName = "nasa_t2" | "ntrs" | "arxiv" | "europepmc" | "openalex";

export type Stage = "five_whys" | "why_how_what" | "debate" | "visualize";

export const STAGES: Stage[] = ["five_whys", "why_how_what", "debate", "visualize"];

/** A record as returned by a public API, before Gemma 4 enrichment. */
export interface RawDocument {
  id: string;
  source: SourceName;
  sourceId: string;
  type: DocType;
  title: string;
  abstract: string;
  url: string;
  published: string | null;
  center: string | null;
  licenseStatus: string | null;
}

/** Raw record plus Gemma 4 summary and domain tags, ready for D1 + Vectorize. */
export interface EnrichedDocument extends RawDocument {
  summary: string;
  domains: string[];
  embedding: number[];
}

/** Row shape of `documents` as read back from D1. */
export interface DocumentRow {
  id: string;
  source: string;
  source_id: string;
  type: string;
  title: string;
  abstract: string | null;
  summary: string | null;
  domains: string | null;
  url: string | null;
  published: string | null;
  center: string | null;
  license_status: string | null;
}

/** A document as handed to the voice model and the website. */
export interface TechDocument {
  id: string;
  source: string;
  type: DocType;
  title: string;
  summary: string;
  abstract?: string;
  domains: string[];
  url: string;
  published: string | null;
  center: string | null;
  licenseStatus: string | null;
  score?: number;
  reason?: string;
}

export interface GraphNode {
  id: string;
  title: string;
  type: DocType;
  source: string;
  domains: string[];
  url: string;
  center: string | null;
}

export interface GraphLink {
  source: string;
  target: string;
  weight: number;
  reason: string | null;
  crossDomain: boolean;
}

export interface GraphPayload {
  nodes: GraphNode[];
  links: GraphLink[];
}

export interface Mention {
  seq: number;
  docId: string;
  ts: string;
}

export interface Objection {
  claim: string;
  evidence_ids: string[];
  question: string;
}

export interface DebateResult {
  objections: Objection[];
  edge_test: string;
  gaps: string;
}

export interface IdeaCard {
  problem: string;
  rootCause: string;
  solution: string;
  evidence: { id: string; title: string; url: string }[];
  risk: string;
}

/** One row of the Sources panel and the final report. */
export interface CitationView {
  docId: string;
  url: string;
  title: string;
  source: string;
  type: string;
  stage: string;
}

/** One generated (or stubbed) idea visual. */
export interface VisualView {
  id: string;
  kind: string;
  prompt: string;
  imageUrl: string | null;
  model: string | null;
}

export interface TranscriptTurn {
  role: "user" | "clarte";
  text: string;
  stage: Stage;
}

export interface AuthUser {
  id: string;
  email: string | null;
  name: string | null;
}

/** Spoken source name. `source` in JSON stays the stored code (`nasa_t2`, …). */
export function sourceLabel(source: string): string {
  switch (source) {
    case "nasa_t2":
      return "NASA T2";
    case "ntrs":
      return "NASA NTRS";
    case "arxiv":
      return "arXiv";
    case "europepmc":
      return "Europe PMC";
    case "openalex":
      return "OpenAlex";
    case "google_patents":
      return "Google Patents";
    case "exa":
      return "Exa";
    default:
      return source;
  }
}
