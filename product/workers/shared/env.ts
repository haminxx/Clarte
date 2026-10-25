/** Bindings for both Workers. Mirrors wrangler.api.toml / wrangler.mcp.toml. */
export interface Env {
  /** D1 `paber` — documents, edges, sessions, citations, users (plan 6.4 / 6.6). */
  DB: D1Database;
  /** Vectorize `paber-docs`, 768 dims, cosine. Vector id === documents.id. */
  VECTORS: VectorizeIndex;
  /** Workers AI, used for `@cf/baai/bge-base-en-v1.5` query embeddings. */
  AI: Ai;

  /**
   * Secrets and overrides — `wrangler secret put` or `[vars]` in production,
   * `.dev.vars` locally. Never commit real values.
   */
  XAI_API_KEY?: string;
  GEMINI_API_KEY?: string;
  /** Exa Search API. Unset skips live search and keeps D1/Vectorize. */
  EXA_API_KEY?: string;
  VAPI_PUBLIC_KEY?: string;
  VAPI_PRIVATE_KEY?: string;
  VAPI_ASSISTANT_ID?: string;
  VAPI_SERVER_SECRET?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  GOOGLE_REDIRECT_URI?: string;
  SESSION_SECRET?: string;
  KEY_ENCRYPTION_KEY?: string;

  GEMMA_MODEL: string;
  ALLOWED_ORIGINS: string;
  /** "true" enables Grok Imagine. Anything else leaves visualize_idea off. */
  IMAGINE_ENABLED?: string;
  APP_URL?: string;
  API_URL?: string;

  /** Only bound in the MCP Worker. */
  CLARTE_MCP?: DurableObjectNamespace;
}

export function imagineEnabled(env: { IMAGINE_ENABLED?: string }): boolean {
  return (env.IMAGINE_ENABLED ?? "").trim().toLowerCase() === "true";
}

export function vapiConfigured(env: { VAPI_SERVER_SECRET?: string }): boolean {
  return Boolean(env.VAPI_SERVER_SECRET);
}
