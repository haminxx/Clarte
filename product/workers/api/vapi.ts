import { safeEqual } from "../shared/crypto";
import { ensureSession, getSession, recordCitations, recordMentions, setVapiCallId } from "../shared/db";
import type { Env } from "../shared/env";
import { compactToolResult, runTool } from "../shared/tools";
import { isToolName } from "../shared/tools-spec";

/**
 * Vapi tool webhook. The only non-200 is a bad secret. Tool failures come back
 * as `{ toolCallId, error }` with HTTP 200, and `result` is one JSON string.
 */

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function parseArgs(value: unknown): Record<string, unknown> {
  if (typeof value === "string") {
    try {
      return asRecord(JSON.parse(value)) ?? {};
    } catch {
      return {};
    }
  }
  return asRecord(value) ?? {};
}

interface ToolCall {
  id: string;
  name: string;
  args: Record<string, unknown>;
}

function normalizeCall(value: unknown): ToolCall | null {
  const record = asRecord(value);
  if (!record) return null;
  const nested = asRecord(record.toolCall) ?? record;
  const fn = asRecord(nested.function);
  const name = text(fn?.name) || text(nested.name);
  const id = text(nested.id) || text(record.id);
  if (!name || !id) return null;
  return { id, name, args: parseArgs(fn?.arguments ?? nested.arguments ?? record.arguments) };
}

function toolCallsFrom(message: Record<string, unknown>): ToolCall[] {
  const primary = message.toolCallList ?? message.toolCalls;
  const fromPrimary = (Array.isArray(primary) ? primary : []).map(normalizeCall).filter((call): call is ToolCall => call !== null);
  if (fromPrimary.length) return fromPrimary;
  const extra = message.toolWithToolCallList;
  if (!Array.isArray(extra)) return [];
  return extra.map(normalizeCall).filter((call): call is ToolCall => call !== null);
}

function readSessionId(message: Record<string, unknown>): string {
  const call = asRecord(message.call);
  const overrides = asRecord(call?.assistantOverrides);
  const bags = [
    asRecord(call?.metadata),
    asRecord(overrides?.metadata),
    asRecord(overrides?.variableValues),
    asRecord(asRecord(message.assistant)?.variableValues),
    asRecord(asRecord(call?.assistant)?.variableValues),
  ];
  for (const bag of bags) {
    const id = text(bag?.sessionId) || text(bag?.session_id);
    if (id) return id;
  }
  return "";
}

function authorized(request: Request, env: Env): boolean {
  const expected = env.VAPI_SERVER_SECRET?.trim();
  if (!expected) {
    console.warn("VAPI_SERVER_SECRET is unset; accepting /vapi/tools without a secret");
    return true;
  }
  return safeEqual(request.headers.get("x-vapi-secret") ?? "", expected);
}

function ok(results: unknown[]): Response {
  return new Response(JSON.stringify({ results }), {
    status: 200,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

export async function handleVapiTools(request: Request, env: Env): Promise<Response> {
  if (!authorized(request, env)) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { "content-type": "application/json; charset=utf-8" },
    });
  }

  let calls: ToolCall[] = [];
  try {
    const body = asRecord(await request.json().catch(() => null));
    const message = asRecord(body?.message) ?? {};
    if (text(message.type) !== "tool-calls") return ok([]);

    calls = toolCallsFrom(message);
    const sessionId = readSessionId(message) || crypto.randomUUID();
    await ensureSession(env, sessionId);
    const callId = text(asRecord(message.call)?.id);
    if (callId) await setVapiCallId(env, sessionId, callId).catch(() => undefined);
    const stage = (await getSession(env, sessionId))?.stage ?? "five_whys";

    const results: { toolCallId: string; result?: string; error?: string }[] = [];
    for (const call of calls) {
      if (!isToolName(call.name)) {
        results.push({ toolCallId: call.id, error: `Unknown tool: ${call.name}` });
        continue;
      }
      try {
        const args = { ...call.args };
        if (call.name === "visualize_idea" && !text(args.session_id) && !text(args.sessionId)) {
          args.session_id = sessionId;
        }
        const result = await runTool(env, call.name, args, { sessionId, userSource: "session" });
        if (result.speakError) {
          results.push({ toolCallId: call.id, error: result.speakError });
          continue;
        }
        await recordMentions(env, sessionId, result.mentionedIds).catch((error) =>
          console.warn("recordMentions failed", { error: String(error).slice(0, 180) }),
        );
        await recordCitations(env, sessionId, result.documents, stage).catch((error) =>
          console.warn("recordCitations failed", { error: String(error).slice(0, 180) }),
        );
        results.push({ toolCallId: call.id, result: compactToolResult(call.name, result) });
      } catch (error) {
        console.error("vapi tool failed", {
          tool: call.name,
          error: error instanceof Error ? error.message.slice(0, 180) : "failed",
        });
        results.push({ toolCallId: call.id, error: "The library could not complete that lookup." });
      }
    }
    return ok(results);
  } catch (error) {
    console.error("vapi webhook failed", {
      error: error instanceof Error ? error.message.slice(0, 180) : "failed",
    });
    if (!calls.length) return ok([]);
    return ok(calls.map((call) => ({ toolCallId: call.id, error: "The library could not complete that lookup." })));
  }
}
