import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { countDocuments } from "../shared/db";
import type { Env } from "../shared/env";
import { findRelated, getDocument, marketEvidence, searchTech } from "../shared/tools";
import { TOOL_BY_NAME } from "../shared/tools-spec";

/**
 * PABER MCP server — plan section 6.1, layer 4 and 6.3.
 * Same four tools the voice bridge calls, exposed over MCP so Cursor (or any MCP
 * client) can query the library directly. The tool bodies live in shared/tools.ts
 * so voice and MCP can never drift apart.
 */
export class PaberMcpAgent extends McpAgent<Env> {
  server = new McpServer({ name: "paber", version: "0.1.0" });

  async init(): Promise<void> {
    const env = this.env;

    this.server.tool(
      "search_tech",
      TOOL_BY_NAME.search_tech.description,
      {
        query: z.string().describe("Problem or technology to look for."),
        limit: z.number().int().min(1).max(12).optional(),
      },
      async ({ query, limit }) => textResult(await searchTech(env, { query, limit })),
    );

    this.server.tool(
      "get_document",
      TOOL_BY_NAME.get_document.description,
      { id: z.string().describe("PABER document id, e.g. arxiv:2403.01234") },
      async ({ id }) => textResult(await getDocument(env, { id })),
    );

    this.server.tool(
      "find_related",
      TOOL_BY_NAME.find_related.description,
      {
        id: z.string(),
        cross_domain: z.boolean().optional(),
        limit: z.number().int().min(1).max(12).optional(),
      },
      async ({ id, cross_domain, limit }) => textResult(await findRelated(env, { id, cross_domain, limit })),
    );

    this.server.tool(
      "market_evidence",
      TOOL_BY_NAME.market_evidence.description,
      {
        idea: z.string().describe("The user's idea in one or two sentences."),
        limit: z.number().int().min(1).max(12).optional(),
      },
      async ({ idea, limit }) => textResult(await marketEvidence(env, { idea, limit })),
    );
  }
}

function textResult(result: { summary: string; data: Record<string, unknown> }) {
  return {
    content: [
      { type: "text" as const, text: result.summary },
      { type: "text" as const, text: JSON.stringify(result.data) },
    ],
  };
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // `binding` must name the Durable Object binding in wrangler.mcp.toml; the
    // Agents SDK otherwise looks for its default, MCP_OBJECT.
    if (url.pathname === "/mcp") {
      return PaberMcpAgent.serve("/mcp", { binding: "PABER_MCP" }).fetch(request, env, ctx);
    }

    // Legacy SSE transport, for MCP clients that do not speak Streamable HTTP yet.
    if (url.pathname === "/sse" || url.pathname === "/sse/message") {
      return PaberMcpAgent.serveSSE("/sse", { binding: "PABER_MCP" }).fetch(request, env, ctx);
    }

    if (url.pathname === "/health" || url.pathname === "/") {
      return Response.json({
        service: "paber-mcp",
        endpoints: ["/mcp", "/sse"],
        tools: Object.keys(TOOL_BY_NAME),
        documents: await countDocuments(env).catch(() => null),
      });
    }

    return new Response("Not found", { status: 404 });
  },
} satisfies ExportedHandler<Env>;
