export type Stage = "five_whys" | "why_how_what" | "debate" | "visualize";

export const STAGES: Stage[] = ["five_whys", "why_how_what", "debate", "visualize"];

export function isStage(value: unknown): value is Stage {
  return typeof value === "string" && (STAGES as string[]).includes(value);
}

export type DocType = "paper" | "patent" | "report" | "software" | "spinoff";

export type VisualKind = "concept" | "system_diagram" | "paper_figure" | "video";

export const VISUAL_KINDS = ["concept", "system_diagram", "paper_figure"] as const;

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

export interface Citation {
  docId: string;
  url: string;
  title: string;
  source: string;
  type: string;
  stage: string;
}

export interface IdeaEvidence {
  id: string;
  title: string;
  url: string;
  source?: string;
  type?: string;
}

export interface IdeaCardData {
  problem: string;
  rootCause: string;
  solution: string;
  evidence: IdeaEvidence[];
  risk: string;
}

export interface ReferenceItem {
  id: string;
  title: string;
  url: string;
  source: string;
  type: string;
}

export interface TranscriptEntry {
  id: string;
  role: "user" | "clarte" | "system";
  text: string;
}

export interface Visual {
  id: string;
  kind: string;
  prompt: string;
  imageUrl: string;
  model: string;
}

export interface Me {
  user: { id: string; email: string; name: string } | null;
  xaiKey: { connected: boolean; last4: string | null };
}

/** Shown on the idea card until the signed-in user has connected an xAI key. */
export const VISUALIZE_AUTH_COPY = "Sign in and connect an xAI key to visualize this idea.";
