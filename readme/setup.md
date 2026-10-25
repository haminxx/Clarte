# Setup and deploy

Everything below is copy-pasteable. Commands that need Christian's keys are marked **[needs key]**.

## 0. Prerequisites

- Node 20 or newer (Node 22 is what this was built on)
- A Cloudflare account with Workers, D1, Vectorize and Workers AI enabled
- `npx wrangler login`, or `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID` in the environment

```bash
git clone https://github.com/haminxx/PABER.git
cd PABER
cp .env.example .env                       # fill in keys here for the ingest script
cp product/.dev.vars.example product/.dev.vars
cp website/.env.example website/.env.local
(cd product && npm install)
(cd website && npm install)
```

Real `.env`, `.dev.vars` and `.env.local` files are gitignored. Never commit a key.

## 1. Cloudflare resources

These already exist for this project (D1 `paber` = `38e1c167-dea2-44ab-9f18-0251c864357c`, Vectorize
`paber-docs`), and both wrangler configs point at them. To recreate them from scratch:

```bash
cd product

npx wrangler d1 create paber
# Copy the printed database_id into wrangler.api.toml and wrangler.mcp.toml.

npx wrangler vectorize create paber-docs --dimensions=768 --metric=cosine
# 768 dimensions matches Workers AI @cf/baai/bge-base-en-v1.5.
```

Apply the schema:

```bash
npx wrangler d1 migrations apply paber --local   --config wrangler.api.toml   # local dev copy
npx wrangler d1 migrations apply paber --remote  --config wrangler.api.toml   # the real database
```

## 2. Secrets **[needs key]**

Non-secret settings live in the `[vars]` block of each wrangler config. Secrets are set per Worker:

```bash
cd product
npx wrangler secret put XAI_API_KEY    --config wrangler.api.toml
npx wrangler secret put GEMINI_API_KEY --config wrangler.api.toml
npx wrangler secret put GEMINI_API_KEY --config wrangler.mcp.toml
```

The MCP Worker needs `GEMINI_API_KEY` (Gemma writes link reasons and objections) but not
`XAI_API_KEY`; only the API Worker mints voice tokens.

## 3. Ingest the library

The ingest script runs locally, not in a Worker (see
[architecture.md](architecture.md#why-ingest-runs-locally)). It reads `GEMINI_API_KEY`,
`CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN` from the environment.

```bash
cd product

# No keys needed: 40 documents from the live APIs, local summaries and stub vectors.
npm run ingest:dry

# [needs key] Full run: ~710 documents, Gemma 4 summaries and tags, Workers AI embeddings.
set -a && source ../.env && set +a
npm run ingest

# Push to D1 + Vectorize (reads product/data/manifest.json).
npm run load            # remote
npm run load:local      # local D1 only — Vectorize has no local emulation
```

Useful flags: `--limit 200` caps the run and scales every per-source quota;
`--sources nasa_t2,ntrs` restricts which APIs are called; `--dry-run` skips all model calls.

Check what landed:

```bash
npx wrangler d1 execute paber --remote --config wrangler.api.toml \
  --command "select type, count(*) from documents group by type" --json
```

## 4. Run locally

```bash
# Terminal 1 — API Worker on :8787
cd product && npm run dev

# Terminal 2 — MCP Worker on :8788 (optional; also connectable from Cursor)
cd product && npm run dev:mcp

# Terminal 3 — website on :3000
cd website && npm run dev
```

Local `wrangler dev` reports Vectorize and Workers AI as "not supported" locally. That is expected:
`search_tech` falls back to D1 keyword search and the site still works. Use `--remote` on
`wrangler dev` if you want the real index.

Smoke test without a browser:

```bash
curl localhost:8787/health
curl -X POST localhost:8787/api/tools/search_tech \
  -H 'content-type: application/json' \
  -d '{"sessionId":"demo","args":{"query":"satellite thermal control","limit":3}}'
curl 'localhost:8787/api/graph?limit=20'
```

## 5. Deploy

```bash
cd product
npm run build            # typecheck + dry-run bundle both Workers
npm run deploy:api       # → https://paber-api.<subdomain>.workers.dev
npm run deploy:mcp       # → https://paber-mcp.<subdomain>.workers.dev/mcp

cd ../website
# Point the frontend at the deployed API before building.
echo 'NEXT_PUBLIC_PABER_API=https://paber-api.<subdomain>.workers.dev' > .env.local
npm run build
npx wrangler pages deploy out --project-name paber
```

Then allow the Pages origin through CORS by editing `ALLOWED_ORIGINS` in `wrangler.api.toml` and
redeploying the API Worker:

```toml
ALLOWED_ORIGINS = "http://localhost:3000,https://paber.pages.dev"
```

Smoke test the MCP server (Streamable HTTP, so `initialize` first, then reuse the session id):

```bash
curl -sD /tmp/h -X POST localhost:8788/mcp \
  -H 'content-type: application/json' -H 'accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"curl","version":"1"}}}'

SID=$(grep -i '^mcp-session-id' /tmp/h | tr -d '\r' | awk '{print $2}')
curl -s -X POST localhost:8788/mcp \
  -H 'content-type: application/json' -H 'accept: application/json, text/event-stream' \
  -H "mcp-session-id: $SID" -d '{"jsonrpc":"2.0","id":2,"method":"tools/list"}'
```

## 6. Connect the MCP server to Cursor

```json
{
  "mcpServers": {
    "paber": { "url": "https://paber-mcp.<subdomain>.workers.dev/mcp" }
  }
}
```

Locally, use `http://localhost:8788/mcp`.

## What still needs Christian's keys

| Step | Blocked on | Without it |
|---|---|---|
| Voice conversation | `XAI_API_KEY` **with credits** | `/api/session` returns `stubbed: true`; mic disabled, text mode works |
| Gemma summaries, tags, objections | `GEMINI_API_KEY` | Deterministic fallback summaries and retrieval-only objections |
| Real semantic search | `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID` during ingest | Stub vectors; keyword search still answers |
| Remote D1 / Vectorize load, deploys | `wrangler login` or a Cloudflare API token | Local D1 only |
