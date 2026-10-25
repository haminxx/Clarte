/**
 * The four PABER tools — plan section 6.3. One definition feeds three consumers:
 * the MCP server, the Grok Voice `session.update` tools array, and the HTTP bridge
 * that executes a tool call arriving back over the voice socket.
 */

export type JsonSchema = {
  type: "object";
  properties: Record<string, unknown>;
  required?: string[];
};

export interface ToolDefinition {
  name: ToolName;
  description: string;
  parameters: JsonSchema;
}

export const TOOL_NAMES = ["search_tech", "get_document", "find_related", "market_evidence"] as const;

export type ToolName = (typeof TOOL_NAMES)[number];

export const TOOL_DEFINITIONS: ToolDefinition[] = [
  {
    name: "search_tech",
    description:
      "Search the PABER library of papers, patents, NASA reports, open-source software and spinoffs for work related to a problem or idea. Call it whenever the user names a problem, a mechanism or a component. The nodes it returns light up in the user's graph.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Natural-language description of the problem or technology to look for.",
        },
        limit: { type: "number", description: "How many documents to return (1-12, default 6)." },
      },
      required: ["query"],
    },
  },
  {
    name: "get_document",
    description:
      "Fetch one document in full by its PABER id, with summary, domain tags, source link and licence status. Call it before quoting a specific paper or patent out loud.",
    parameters: {
      type: "object",
      properties: {
        id: { type: "string", description: "PABER document id returned by search_tech." },
      },
      required: ["id"],
    },
  },
  {
    name: "find_related",
    description:
      "Given a document id, return its neighbours in the knowledge graph with a one-line reason for each link. Set cross_domain to true to jump to technology from a different field, which is what makes the user say 'I could apply that'.",
    parameters: {
      type: "object",
      properties: {
        id: { type: "string", description: "PABER document id to expand from." },
        cross_domain: {
          type: "boolean",
          description: "Only return neighbours from a different domain. Default false.",
        },
        limit: { type: "number", description: "How many neighbours to return (1-12, default 6)." },
      },
      required: ["id"],
    },
  },
  {
    name: "market_evidence",
    description:
      "Stage 3 only. Pull the strongest existing patents and papers for the user's idea and have Gemma 4 turn them into three cited objections. Use it to push back, never to agree.",
    parameters: {
      type: "object",
      properties: {
        idea: {
          type: "string",
          description: "The user's idea in one or two sentences, in their own words where possible.",
        },
        limit: { type: "number", description: "How much prior art to weigh (1-12, default 8)." },
      },
      required: ["idea"],
    },
  },
];

export const TOOL_BY_NAME: Record<ToolName, ToolDefinition> = Object.fromEntries(
  TOOL_DEFINITIONS.map((tool) => [tool.name, tool]),
) as Record<ToolName, ToolDefinition>;

/** Shape Grok Voice expects in `session.update` → `session.tools`. */
export function grokVoiceTools(): Array<{
  type: "function";
  name: string;
  description: string;
  parameters: JsonSchema;
}> {
  return TOOL_DEFINITIONS.map((tool) => ({
    type: "function" as const,
    name: tool.name,
    description: tool.description,
    parameters: tool.parameters,
  }));
}

export function isToolName(value: string): value is ToolName {
  return (TOOL_NAMES as readonly string[]).includes(value);
}
