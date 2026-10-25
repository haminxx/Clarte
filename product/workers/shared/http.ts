import type { Env } from "./env";

function allowedOrigin(env: Env, request: Request): string | null {
  const origin = request.headers.get("origin");
  if (!origin) return null;
  const allowed = new Set(
    `${env.ALLOWED_ORIGINS ?? ""},https://clarte.io,http://localhost:3000`
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
  );
  if (allowed.has("*") || allowed.has(origin)) return origin;
  try {
    const url = new URL(origin);
    if (url.protocol === "https:" && url.hostname.endsWith(".pages.dev")) return origin;
  } catch {
    return null;
  }
  return null;
}

export function corsHeaders(env: Env, request: Request): Record<string, string> {
  const headers: Record<string, string> = {
    "access-control-allow-methods": "GET, POST, DELETE, OPTIONS",
    "access-control-allow-headers": "content-type",
    "access-control-allow-credentials": "true",
    "access-control-max-age": "86400",
    vary: "origin",
  };
  const origin = allowedOrigin(env, request);
  if (origin) headers["access-control-allow-origin"] = origin;
  return headers;
}

export function json(
  env: Env,
  request: Request,
  body: unknown,
  status = 200,
  extra?: HeadersInit,
): Response {
  const headers = new Headers({
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    ...corsHeaders(env, request),
  });
  if (extra) {
    new Headers(extra).forEach((value, key) => headers.append(key, value));
  }
  return new Response(JSON.stringify(body, null, 2), { status, headers });
}

export function markdown(env: Env, request: Request, body: string, status = 200): Response {
  return new Response(body, {
    status,
    headers: {
      "content-type": "text/markdown; charset=utf-8",
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
