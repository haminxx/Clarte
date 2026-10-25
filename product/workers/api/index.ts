import {
  countDocuments,
  ensureSession,
  getGraph,
  getMentions,
  getSession,
  recordMentions,
  setIdeaCard,
  setRootCause,
  setStage,
} from "../shared/db";
import type { Env } from "../shared/env";
import { fail, json, preflight, readJson } from "../shared/http";
import { draftIdeaCard, runTool } from "../shared/tools";
import { isToolName } from "../shared/tools-spec";
import { STAGES, type IdeaCard, type Stage } from "../shared/types";
import { mintEphemeralToken, realtimeUrl, sessionConfig } from "./voice";

/**
 * Clarte API / tool bridge — plan section 6.1, layer 3.
 *
 *   POST /api/session                  mint a Grok Voice token + session config
 *   POST /api/tools/:name              run one tool call coming off the voice socket
 *   POST /api/session/:id/stage        move the stage pill (five_whys|why_how_what|debate)
 *   POST /api/session/:id/root-cause   record the stage 1 outcome
 *   POST /api/session/:id/idea         store the final idea card
 *   POST /api/session/:id/idea-draft   have Gemma 4 write the card from the transcript
 *   GET  /api/session/:id              stage + root cause + idea card
 *   GET  /api/session/:id/mentions     highlight stream for the graph (?since=seq)
 *   GET  /api/graph                    nodes + links for the 3D constellation
 *   GET  /health
 */
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === "OPTIONS") return preflight(env, request);

    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, "") || "/";

    try {
      if (path === "/health" || path === "/") {
        return json(env, request, {
          service: "clarte-api",
          documents: await countDocuments(env).catch(() => null),
          voiceConfigured: Boolean(env.XAI_API_KEY),
          gemmaConfigured: Boolean(env.GEMINI_API_KEY),
        });
      }

      if (path === "/api/session" && request.method === "POST") {
        const body = await readJson<{ sessionId?: string }>(request);
        const sessionId = body.sessionId?.trim() || crypto.randomUUID();
        await ensureSession(env, sessionId);
        const token = await mintEphemeralToken(env);
        return json(env, request, {
          sessionId,
          url: realtimeUrl(env),
          model: env.GROK_VOICE_MODEL || "grok-voice-latest",
          token: token.value,
          expiresAt: token.expiresAt,
          stubbed: token.stubbed,
          sessionConfig: sessionConfig(env),
        });
      }

      const toolMatch = path.match(/^\/api\/tools\/([a-z_]+)$/);
      if (toolMatch && request.method === "POST") {
        const name = toolMatch[1];
        if (!isToolName(name)) return fail(env, request, `Unknown tool: ${name}`, 404);

        const body = await readJson<{ sessionId?: string; args?: Record<string, unknown> }>(request);
        const args = body.args ?? {};
        const result = await runTool(env, name, args);

        if (body.sessionId) {
          await recordMentions(env, body.sessionId, result.mentionedIds).catch((error) =>
            console.warn("recordMentions failed", { error: String(error) }),
          );
        }

        return json(env, request, {
          tool: name,
          summary: result.summary,
          highlight: result.mentionedIds,
          ...result.data,
        });
      }

      const sessionMatch = path.match(/^\/api\/session\/([^/]+)(\/[a-z-]+)?$/);
      if (sessionMatch) {
        const sessionId = decodeURIComponent(sessionMatch[1]);
        const action = sessionMatch[2] ?? "";

        if (action === "/mentions" && request.method === "GET") {
          const since = Number(url.searchParams.get("since") ?? "0") || 0;
          const [session, mentions] = await Promise.all([
            getSession(env, sessionId),
            getMentions(env, sessionId, since),
          ]);
          return json(env, request, {
            sessionId,
            stage: session?.stage ?? "five_whys",
            mentions,
            cursor: mentions.length ? mentions[mentions.length - 1].seq : since,
          });
        }

        if (action === "/stage" && request.method === "POST") {
          const body = await readJson<{ stage?: string }>(request);
          const stage = body.stage as Stage;
          if (!STAGES.includes(stage)) return fail(env, request, `stage must be one of ${STAGES.join(", ")}`);
          await setStage(env, sessionId, stage);
          return json(env, request, { sessionId, stage });
        }

        if (action === "/root-cause" && request.method === "POST") {
          const body = await readJson<{ rootCause?: string }>(request);
          if (!body.rootCause) return fail(env, request, "rootCause is required");
          await setRootCause(env, sessionId, body.rootCause);
          return json(env, request, { sessionId, rootCause: body.rootCause });
        }

        if (action === "/idea" && request.method === "POST") {
          const body = await readJson<{ card?: IdeaCard }>(request);
          if (!body.card) return fail(env, request, "card is required");
          await setIdeaCard(env, sessionId, body.card);
          return json(env, request, { sessionId, card: body.card });
        }

        // Gemma 4 writes the closing card from the transcript, then it is stored.
        if (action === "/idea-draft" && request.method === "POST") {
          const body = await readJson<{
            transcript?: { role: string; text: string }[];
            evidenceIds?: string[];
          }>(request);
          const card = await draftIdeaCard(env, {
            transcript: body.transcript ?? [],
            evidenceIds: body.evidenceIds ?? [],
          });
          await setIdeaCard(env, sessionId, card);
          return json(env, request, { sessionId, card });
        }

        if (!action && request.method === "GET") {
          const session = await getSession(env, sessionId);
          if (!session) return fail(env, request, "No such session", 404);
          return json(env, request, session);
        }
      }

      if (path === "/api/graph" && request.method === "GET") {
        const limit = Math.min(1500, Math.max(1, Number(url.searchParams.get("limit") ?? "400") || 400));
        return json(env, request, await getGraph(env, limit));
      }

      return fail(env, request, "Not found", 404);
    } catch (error) {
      console.error("api error", { path, error: String(error) });
      return fail(env, request, error instanceof Error ? error.message : "Unexpected error", 500);
    }
  },
} satisfies ExportedHandler<Env>;
