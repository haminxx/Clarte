export type Stage = "five_whys" | "why_how_what" | "debate" | "visualize";

export type DocType = "paper" | "patent" | "report" | "software" | "spinoff";

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

export interface TechDocument {
  id: string;
  source: string;
  type: DocType;
  title: string;
  summary: string;
  domains: string[];
  url: string;
  center: string | null;
  licenseStatus: string | null;
  score?: number;
  reason?: string;
}

export interface Objection {
  claim: string;
  evidence_ids: string[];
  question: string;
}

export interface IdeaCardData {
  problem: string;
  rootCause: string;
  solution: string;
  evidence: { id: string; title: string; url: string }[];
  risk: string;
}

export interface TranscriptEntry {
  id: string;
  role: "user" | "clarte" | "system";
  text: string;
}

export interface VoiceSession {
  sessionId: string;
  url: string;
  model: string;
  token: string;
  expiresAt: number;
  stubbed: boolean;
  sessionConfig: {
    type: "session.update";
    session: Record<string, unknown>;
  };
}
