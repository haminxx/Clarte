/** Bindings for both Workers. Mirrors wrangler.api.toml / wrangler.mcp.toml. */
export interface Env {
  /** D1 `paber` — document metadata, edges, sessions, mentions (plan 6.4). */
  DB: D1Database;
  /** Vectorize `paber-docs`, 768 dims, cosine. Vector id === documents.id. */
  VECTORS: VectorizeIndex;
  /** Workers AI, used for `@cf/baai/bge-base-en-v1.5` query embeddings. */
  AI: Ai;

  /** Secrets — `wrangler secret put` in production, `.dev.vars` locally. */
  XAI_API_KEY?: string;
  GEMINI_API_KEY?: string;

  GEMMA_MODEL: string;
  GROK_VOICE_MODEL: string;
  GROK_VOICE_NAME: string;
  TOKEN_TTL_SECONDS: string;
  ALLOWED_ORIGINS: string;

  /** Only bound in the MCP Worker. */
  PABER_MCP?: DurableObjectNamespace;
}
