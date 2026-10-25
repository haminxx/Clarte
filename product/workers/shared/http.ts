import type { Env } from "./env";

function allowedOrigin(env: Env, request: Request): string {
  const origin = request.headers.get("origin") ?? "";
  const allowed = (env.ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  if (allowed.includes("*")) return "*";
  if (origin && allowed.includes(origin)) return origin;
  return allowed[0] ?? "";
}

export function corsHeaders(env: Env, request: Request): Record<string, string> {
  return {
    "access-control-allow-origin": allowedOrigin(env, request),
    "access-control-allow-methods": "GET, POST, OPTIONS",
    "access-control-allow-headers": "content-type",
    "access-control-max-age": "86400",
    vary: "origin",
  };
}

export function json(env: Env, request: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...corsHeaders(env, request),
    },
  });
}

export function fail(env: Env, request: Request, message: string, status = 400): Response {
  return json(env, request, { error: message }, status);
}

export function preflight(env: Env, request: Request): Response {
  return new Response(null, { status: 204, headers: corsHeaders(env, request) });
}

export async function readJson<T>(request: Request): Promise<T> {
  try {
    return (await request.json()) as T;
  } catch {
    return {} as T;
  }
}
