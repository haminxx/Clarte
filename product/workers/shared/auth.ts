import { decryptString, encryptString, readSignedPayload, signPayload } from "./crypto";
import {
  attachUser,
  createAuthSession,
  deleteAuthSession,
  deleteUserKey,
  getUserByAuthSession,
  getUserKey,
  sqliteUtc,
  upsertGoogleUser,
  upsertUserKey,
} from "./db";
import type { Env } from "./env";
import { fail, json } from "./http";
import type { AuthUser } from "./types";

const SESSION_SECONDS = 60 * 60 * 24 * 14;
const STATE_MS = 10 * 60 * 1000;

export function googleRedirectUri(env: Env): string {
  if (env.GOOGLE_REDIRECT_URI?.trim()) return env.GOOGLE_REDIRECT_URI.trim();
  const api = (env.API_URL || "https://api.clarte.io").replace(/\/$/, "");
  return `${api}/auth/callback/google`;
}

export function appUrl(env: Env): string {
  return (env.APP_URL || "https://clarte.io").replace(/\/$/, "");
}

export function readCookie(request: Request, name: string): string | null {
  const header = request.headers.get("cookie") ?? "";
  for (const part of header.split(";")) {
    const trimmed = part.trim();
    if (!trimmed.startsWith(`${name}=`)) continue;
    const value = trimmed.slice(name.length + 1);
    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  }
  return null;
}

/** HttpOnly session cookie. Domain=.clarte.io only on the production hosts. */
export function sessionCookie(request: Request, value: string, maxAge: number): string {
  const host = new URL(request.url).hostname;
  const parts = [`clarte_session=${encodeURIComponent(value)}`, "HttpOnly", "Path=/", "SameSite=Lax", `Max-Age=${maxAge}`];
  if (host !== "localhost" && host !== "127.0.0.1") parts.push("Secure");
  if (host === "clarte.io" || host === "api.clarte.io") parts.push("Domain=.clarte.io");
  return parts.join("; ");
}

export async function currentUser(env: Env, request: Request): Promise<AuthUser | null> {
  const id = readCookie(request, "clarte_session");
  if (!id) return null;
  return getUserByAuthSession(env, id);
}

function configured(env: Env): boolean {
  return Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET && env.SESSION_SECRET);
}

export async function beginGoogle(env: Env, request: Request): Promise<Response> {
  if (!configured(env)) return fail(env, request, "Google sign-in is not configured", 500);
  const state = await signPayload(env.SESSION_SECRET!, { exp: Date.now() + STATE_MS, nonce: crypto.randomUUID() });
  const params = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID!,
    redirect_uri: googleRedirectUri(env),
    response_type: "code",
    scope: "openid email profile",
    state,
    prompt: "select_account",
  });
  return Response.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`, 302);
}

export async function finishGoogle(env: Env, request: Request): Promise<Response> {
  const url = new URL(request.url);
  const back = (reason: string) => Response.redirect(`${appUrl(env)}/?auth=${encodeURIComponent(reason)}`, 302);
  if (!configured(env)) return back("not_configured");
  if (url.searchParams.get("error") || !url.searchParams.get("code")) return back("failed");

  const state = url.searchParams.get("state") ?? "";
  const payload = await readSignedPayload<{ exp?: number }>(env.SESSION_SECRET!, state);
  if (!payload?.exp || payload.exp < Date.now()) return back("failed");

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code: url.searchParams.get("code")!,
      client_id: env.GOOGLE_CLIENT_ID!,
      client_secret: env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: googleRedirectUri(env),
      grant_type: "authorization_code",
    }),
  });
  if (!tokenResponse.ok) {
    console.warn("Google token exchange failed", { status: tokenResponse.status });
    return back("failed");
  }
  const token = (await tokenResponse.json()) as { access_token?: string };
  if (!token.access_token) return back("failed");

  const profileResponse = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: { authorization: `Bearer ${token.access_token}` },
  });
  if (!profileResponse.ok) {
    console.warn("Google userinfo failed", { status: profileResponse.status });
    return back("failed");
  }
  const profile = (await profileResponse.json()) as {
    sub?: string;
    email?: string;
    name?: string;
    given_name?: string;
    family_name?: string;
  };
  if (!profile.sub) return back("failed");
  const name = profile.name || [profile.given_name, profile.family_name].filter(Boolean).join(" ") || null;
  const user = await upsertGoogleUser(env, { sub: profile.sub, email: profile.email ?? null, name });
  const expiresAt = sqliteUtc(new Date(Date.now() + SESSION_SECONDS * 1000));
  const sessionId = await createAuthSession(env, user.id, expiresAt);

  const headers = new Headers({ location: `${appUrl(env)}/?auth=ok` });
  headers.append("set-cookie", sessionCookie(request, sessionId, SESSION_SECONDS));
  return new Response(null, { status: 302, headers });
}

export async function logout(env: Env, request: Request): Promise<Response> {
  const id = readCookie(request, "clarte_session");
  if (id) await deleteAuthSession(env, id).catch(() => undefined);
  return json(env, request, { ok: true }, 200, { "set-cookie": sessionCookie(request, "", 0) });
}

export async function me(env: Env, request: Request): Promise<Response> {
  const user = await currentUser(env, request);
  if (!user) return json(env, request, { user: null, xaiKey: { connected: false, last4: null } });
  const key = await getUserKey(env, user.id, "xai");
  return json(env, request, {
    user: { id: user.id, email: user.email, name: user.name },
    xaiKey: { connected: Boolean(key), last4: key?.last4 ?? null },
  });
}

export async function saveXaiKey(env: Env, request: Request): Promise<Response> {
  const user = await currentUser(env, request);
  if (!user) return fail(env, request, "Sign in required", 401);
  if (!env.KEY_ENCRYPTION_KEY) return fail(env, request, "KEY_ENCRYPTION_KEY is not configured", 500);

  let body: { apiKey?: string } = {};
  try {
    body = (await request.json()) as { apiKey?: string };
  } catch {
    body = {};
  }
  const apiKey = body.apiKey?.trim() ?? "";
  if (!/^\S{12,300}$/.test(apiKey)) return fail(env, request, "apiKey is required");

  const encrypted = await encryptString(env.KEY_ENCRYPTION_KEY, apiKey);
  const last4 = apiKey.slice(-4);
  await upsertUserKey(env, user.id, "xai", { ...encrypted, last4 });
  return json(env, request, { connected: true, last4 });
}

export async function clearXaiKey(env: Env, request: Request): Promise<Response> {
  const user = await currentUser(env, request);
  if (!user) return fail(env, request, "Sign in required", 401);
  await deleteUserKey(env, user.id, "xai");
  return json(env, request, { connected: false, last4: null });
}

/** Used by session routes that should remember who is signed in. */
export async function bindSessionUser(env: Env, request: Request, sessionId: string): Promise<AuthUser | null> {
  const user = await currentUser(env, request);
  if (user) await attachUser(env, sessionId, user.id);
  return user;
}
