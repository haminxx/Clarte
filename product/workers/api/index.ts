import { beginGoogle, bindSessionUser, clearXaiKey, finishGoogle, logout, me, saveXaiKey } from "../shared/auth";
import { coachTurn } from "../shared/coach";
import {
  countDocuments,
  ensureSession,
  getCitations,
  getDocumentsByIds,
  getGraph,
  getMentions,
  getSession,
  listVisuals,
  recordCitations,
  recordMentions,
  rowToDocument,
  setIdeaCard,
  setRootCause,
  setStage,
} from "../shared/db";
import type { Env } from "../shared/env";
import { imagineEnabled, vapiConfigured } from "../shared/env";
import { fail, json, markdown, preflight, readJson } from "../shared/http";
import { renderReport } from "../shared/report";
import { draftIdeaCard, runTool, visualizeIdea } from "../shared/tools";
import { isToolName } from "../shared/tools-spec";
import { STAGES, type IdeaCard, type Stage } from "../shared/types";
import { handleVapiTools } from "./vapi";

/**
 * Clarte API — plan section 6.1 layer 3.
 *
 *   POST /vapi/tools
 *   POST /api/session
 *   POST /api/chat
 *   POST /api/tools/:name
 *   GET  /api/session/:id
 *   POST /api/session/:id/stage|root-cause|idea|idea-draft|visualize
 *   GET  /api/session/:id/mentions|citations|visuals|report
 *   GET  /api/graph
 *   GET  /auth/google
 *   GET  /auth/callback/google
 *   POST /auth/logout
 *   GET  /me
 *   POST /me/xai-key
 *   DELETE /me/xai-key
 *   GET  /health
 */
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === "OPTIONS") return preflight(env, request);

    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, "") || "/";

    try {
      if (path === "/health" || path === "/") return health(env, request);

      if (path === "/vapi/tools" && request.method === "POST") {
        try {
          return await handleVapiTools(request, env);
        } catch (error) {
          console.error("vapi webhook failed", {
            error: error instanceof Error ? error.message.slice(0, 180) : "failed",
          });
          return new Response(JSON.stringify({ results: [] }), {
            status: 200,
            headers: { "content-type": "application/json; charset=utf-8" },
          });
        }
      }

      if (path === "/auth/google" && request.method === "GET") return beginGoogle(env, request);
      if (path === "/auth/callback/google" && request.method === "GET") return finishGoogle(env, request);
      if (path === "/auth/logout" && request.method === "POST") return logout(env, request);
      if (path === "/me" && request.method === "GET") return me(env, request);
      if (path === "/me/xai-key" && request.method === "POST") return saveXaiKey(env, request);
      if (path === "/me/xai-key" && request.method === "DELETE") return clearXaiKey(env, request);

      if (path === "/api/session" && request.method === "POST") {
        const body = await readJson<{ sessionId?: string }>(request);
        const sessionId = body.sessionId?.trim() || crypto.randomUUID();
        await ensureSession(env, sessionId);
        await bindSessionUser(env, request, sessionId);
        const session = await getSession(env, sessionId);
        return json(env, request, { sessionId, stage: session?.stage ?? "five_whys" });
      }

      if (path === "/api/chat" && request.method === "POST") {
        const body = await readJson<{ sessionId?: string; message?: string }>(request);
        const sessionId = body.sessionId?.trim() ?? "";
        const message = body.message?.trim() ?? "";
        if (!sessionId || !message) return fail(env, request, "sessionId and message are required");
        const user = await bindSessionUser(env, request, sessionId);
        try {
          return json(env, request, await coachTurn(env, sessionId, message, user?.id ?? null));
        } catch (error) {
          console.error("chat failed", {
            error: error instanceof Error ? error.message.slice(0, 180) : "failed",
          });
          return json(env, request, {
            reply: "I could not look that up just now. Say the problem again in one sentence.",
            stage: "five_whys",
            citations: [],
            highlight: [],
          });
        }
      }

      const toolMatch = path.match(/^\/api\/tools\/([a-z_]+)$/);
      if (toolMatch && request.method === "POST") {
        const name = toolMatch[1];
        if (!isToolName(name)) return fail(env, request, `Unknown tool: ${name}`, 404);
        const body = await readJson<{ sessionId?: string; args?: Record<string, unknown> }>(request);
        const user = body.sessionId ? await bindSessionUser(env, request, body.sessionId) : null;
        const result = await runTool(env, name, body.args ?? {}, {
          sessionId: body.sessionId,
          userId: user?.id ?? null,
          userSource: "request",
        });
        let citations: Awaited<ReturnType<typeof recordCitations>> = [];
        if (body.sessionId && !result.speakError) {
          const session = await getSession(env, body.sessionId).catch(() => null);
          await recordMentions(env, body.sessionId, result.mentionedIds).catch((error) =>
            console.warn("recordMentions failed", { error: String(error).slice(0, 180) }),
          );
          citations = await recordCitations(
            env,
            body.sessionId,
            result.documents,
            session?.stage ?? "five_whys",
          ).catch((error) => {
            console.warn("recordCitations failed", { error: String(error).slice(0, 180) });
            return [];
          });
        }
        return json(env, request, {
          tool: name,
          summary: result.summary,
          highlight: result.mentionedIds,
          citations,
          ...result.data,
          ...(result.imagineError ? { error: result.imagineError } : {}),
        });
      }

      const sessionMatch = path.match(/^\/api\/session\/([^/]+)(\/[a-z-]+)?$/);
      if (sessionMatch) {
        const sessionId = decodeURIComponent(sessionMatch[1]);
        const action = sessionMatch[2] ?? "";
        const response = await sessionRoute(env, request, url, sessionId, action);
        if (response) return response;
      }

      if (path === "/api/graph" && request.method === "GET") {
        const limit = Math.min(1500, Math.max(1, Number(url.searchParams.get("limit") ?? "400") || 400));
        return json(env, request, await getGraph(env, limit));
      }

      return fail(env, request, "Not found", 404);
    } catch (error) {
      console.error("api error", { path, error: error instanceof Error ? error.message.slice(0, 180) : "failed" });
      return fail(env, request, error instanceof Error ? error.message : "Unexpected error", 500);
    }
  },
} satisfies ExportedHandler<Env>;

async function health(env: Env, request: Request): Promise<Response> {
  return json(env, request, {
    service: "clarte-api",
    documents: await countDocuments(env).catch(() => null),
    vapiConfigured: vapiConfigured(env),
    gemmaConfigured: Boolean(env.GEMINI_API_KEY),
    imagineEnabled: imagineEnabled(env),
  });
}

async function sessionRoute(
  env: Env,
  request: Request,
  url: URL,
  sessionId: string,
  action: string,
): Promise<Response | null> {
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

  if (action === "/citations" && request.method === "GET") {
    return json(env, request, { citations: await getCitations(env, sessionId) });
  }

  if (action === "/visuals" && request.method === "GET") {
    return json(env, request, { visuals: await listVisuals(env, sessionId) });
  }

  if (action === "/report" && request.method === "GET") {
    const session = await getSession(env, sessionId);
    if (!session) return fail(env, request, "No such session", 404);
    const [citations, visuals] = await Promise.all([
      getCitations(env, sessionId),
      listVisuals(env, sessionId),
    ]);
    return markdown(
      env,
      request,
      renderReport({
        stage: session.stage,
        rootCause: session.rootCause,
        idea: session.idea,
        citations,
        visuals,
      }),
    );
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
    await citeIds(env, sessionId, body.card.evidence.map((item) => item.id), "visualize");
    return json(env, request, { sessionId, card: body.card });
  }

  if (action === "/idea-draft" && request.method === "POST") {
    const body = await readJson<{ transcript?: { role: string; text: string }[]; evidenceIds?: string[] }>(request);
    const card = await draftIdeaCard(env, {
      transcript: body.transcript ?? [],
      evidenceIds: body.evidenceIds ?? [],
    });
    await setIdeaCard(env, sessionId, card);
    await citeIds(env, sessionId, card.evidence.map((item) => item.id), "debate");
    return json(env, request, { sessionId, card });
  }

  if (action === "/visualize" && request.method === "POST") {
    const user = await bindSessionUser(env, request, sessionId);
    const body = await readJson<{ kinds?: unknown }>(request);
    const result = await visualizeIdea(
      env,
      { session_id: sessionId, kinds: body.kinds },
      { sessionId, userId: user?.id ?? null, userSource: "request" },
    );
    if (!result.speakError) {
      const session = await getSession(env, sessionId);
      await recordMentions(env, sessionId, result.mentionedIds).catch(() => undefined);
      await recordCitations(env, sessionId, result.documents, session?.stage ?? "visualize").catch(() => undefined);
    }
    if (result.imagineError) return json(env, request, { error: result.imagineError });
    return json(env, request, { visuals: result.data.visuals ?? [] });
  }

  if (!action && request.method === "GET") {
    const session = await getSession(env, sessionId);
    if (!session) return fail(env, request, "No such session", 404);
    return json(env, request, {
      stage: session.stage,
      rootCause: session.rootCause,
      idea: session.idea,
      vapiCallId: session.vapiCallId,
    });
  }

  return null;
}

async function citeIds(env: Env, sessionId: string, ids: string[], stage: string): Promise<void> {
  const rows = await getDocumentsByIds(env, ids.filter(Boolean).slice(0, 12));
  const documents = [...rows.values()].map((row) => rowToDocument(row));
  await recordMentions(env, sessionId, documents.map((document) => document.id)).catch(() => undefined);
  await recordCitations(env, sessionId, documents, stage).catch(() => undefined);
}
