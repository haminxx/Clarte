# Setup and deploy

Commands below are copy-pasteable. **[needs key]** means that command reads a credential or an
authenticated Cloudflare, Vapi, Google, Gemini, or xAI account. Everything else runs from a fresh
clone with empty env files.

Stay on the Cloudflare free plan. Do not enable Workers Paid, R2, or any other paid add-on.

Targets once DNS is live: https://clarte.io and https://api.clarte.io (MCP at https://mcp.clarte.io).
Until the Porkbun nameservers point at Cloudflare and the zone is active, deploy to `*.workers.dev`
and `*.pages.dev` and point Vapi and OAuth at those hosts.

## 0. Prerequisites

- Node 20 or newer (Node 22 is what this was built on)
- A Cloudflare account with Workers, D1, Vectorize, and Workers AI on the free plan
- The Vapi account that will host the "Clarte Coach" assistant, when you want voice
- A Google Cloud OAuth client in the project named "PABER", when you want sign-in
- A Gemini API key, when you want Gemma 4 instead of the local fallbacks

```bash
git clone https://github.com/haminxx/Clarte.git
cd Clarte
cp .env.example .env
cp product/.dev.vars.example product/.dev.vars
cp website/.env.example website/.env.local
(cd product && npm install)
(cd website && npm install)
```

`.env.example` lists every name from plan Appendix B2, plus `NEXT_PUBLIC_CLARTE_API`,
`NEXT_PUBLIC_VAPI_PUBLIC_KEY`, and `NEXT_PUBLIC_VAPI_ASSISTANT_ID`. Values in the example are empty.
Fill `.env`, `product/.dev.vars`, and `website/.env.local` locally. All three are gitignored.

```bash
# [needs key] Cloudflare account. Skip when CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID are already exported.
npx wrangler login
```

## 1. Cloudflare resources

These already exist. Both wrangler configs point at them. The names stay `paber` and `paber-docs`.

| Resource | Name | Binding |
|---|---|---|
| D1 | `paber` (`38e1c167-dea2-44ab-9f18-0251c864357c`) | `DB` |
| Vectorize | `paber-docs`, 768 dims, cosine | `VECTORS` |
| Workers AI | `@cf/baai/bge-base-en-v1.5` | `AI` |

The database id is not a secret. Renaming either resource would create a new store and drop the
loaded documents. To recreate them from scratch, keep these names:

```bash
cd product

# [needs key] Cloudflare auth
npx wrangler d1 create paber
# Copy the printed database_id into wrangler.api.toml and wrangler.mcp.toml.

# [needs key] Cloudflare auth
npx wrangler vectorize create paber-docs --dimensions=768 --metric=cosine
```

Apply the schema. `--local` uses Wrangler's local SQLite and does not call the API.

```bash
npx wrangler d1 migrations apply paber --local  --config wrangler.api.toml

# [needs key] Cloudflare auth
npx wrangler d1 migrations apply paber --remote --config wrangler.api.toml
```

## 2. Secrets and public env

Non-secret settings can live in the `[vars]` block of each wrangler config (`GEMMA_MODEL`,
`IMAGINE_ENABLED`, `APP_URL`, `API_URL`, `GOOGLE_REDIRECT_URI`, `ALLOWED_ORIGINS`). Secrets are set
per Worker. Paste each value at the prompt. Do not put it in the shell command or in a committed file.

API Worker (`product/wrangler.api.toml`):

```bash
cd product

# [needs key] VAPI_SERVER_SECRET — Vapi tool webhook
npx wrangler secret put VAPI_SERVER_SECRET --config wrangler.api.toml

# [needs key] XAI_API_KEY — dev/test Imagine key; session visuals use the signed-in user's key
npx wrangler secret put XAI_API_KEY --config wrangler.api.toml

# [needs key] GOOGLE_CLIENT_SECRET
npx wrangler secret put GOOGLE_CLIENT_SECRET --config wrangler.api.toml

# Print a value, then paste it at the secret prompt. Do not commit the output.
openssl rand -base64 32

# [needs key] SESSION_SECRET — use the value you just generated
npx wrangler secret put SESSION_SECRET --config wrangler.api.toml

# [needs key] KEY_ENCRYPTION_KEY — AES-GCM key for user xAI keys; generate a second value the same way
npx wrangler secret put KEY_ENCRYPTION_KEY --config wrangler.api.toml

# [needs key] GEMINI_API_KEY
npx wrangler secret put GEMINI_API_KEY --config wrangler.api.toml

# [needs key] EXA_API_KEY — live search (https://api.exa.ai/search). This is the only paid call.
# Leave it unset to keep search on D1 and Vectorize. Do not commit the value.
npx wrangler secret put EXA_API_KEY --config wrangler.api.toml
npx wrangler secret put EXA_API_KEY --config wrangler.mcp.toml
```

`EXA_API_KEY` lets `market_evidence` pull papers and patents from arXiv, Google Patents, and NASA NTRS, and lets `search_tech` fill in when Vectorize is thin or misses. Hits are cached in D1 (`exa_cache`, migration `0003_exa_cache.sql`) for one day. Apply migrations before relying on the cache.

The MCP Worker needs `GEMINI_API_KEY`:

```bash
# [needs key] GEMINI_API_KEY
npx wrangler secret put GEMINI_API_KEY --config wrangler.mcp.toml
```

`GOOGLE_CLIENT_ID` is an OAuth identifier. Put it in `[vars]` or:

```bash
# [needs key] GOOGLE_CLIENT_ID
npx wrangler secret put GOOGLE_CLIENT_ID --config wrangler.api.toml
```

`VAPI_PRIVATE_KEY` stays in the root `.env` for `product/scripts/vapi-setup.ts`. The script command in section 3 is marked **[needs key]**. The website bundle does not receive it.

Optional ingest keys live in `.env` only. Filling `NASA_API_KEY` or `OPENALEX_API_KEY` **[needs key]**. The current ingest script also reads `OPENALEX_MAILTO` when it is set; that name is not in the Appendix B2 template. The full ingest command below is what loads them.

Website public values go in `website/.env.local`, which is gitignored:

```bash
cd website

# NEXT_PUBLIC_CLARTE_API is a URL, not a secret.
# Production: https://api.clarte.io
# Until DNS is live: https://clarte-api.<account>.workers.dev
# Local: http://localhost:8787

cat > .env.local <<'EOF'
NEXT_PUBLIC_CLARTE_API=http://localhost:8787
NEXT_PUBLIC_VAPI_PUBLIC_KEY=
NEXT_PUBLIC_VAPI_ASSISTANT_ID=
EOF
```

The `cat` above writes empty Vapi values, so the site runs in text mode. To turn voice on, edit
`website/.env.local` and set `NEXT_PUBLIC_VAPI_PUBLIC_KEY` and `NEXT_PUBLIC_VAPI_ASSISTANT_ID`.
That edit **[needs key]**. Do not commit `.env.local`.

### Google OAuth client

In Google Cloud project "PABER", create a Web application OAuth client.

- Authorized redirect URIs: `https://clarte.io/auth/callback/google` and `http://localhost:8787/auth/callback/google`
- Authorized JavaScript origin: `https://clarte.io`
- Until DNS is live, also add the `*.workers.dev` callback you are actually calling, then switch `GOOGLE_REDIRECT_URI` to `https://clarte.io/auth/callback/google` when the zone is active

The client secret from that page is the value for the `GOOGLE_CLIENT_SECRET` command above.

## 3. Vapi assistant

Create one assistant named "Clarte Coach". System prompt: `product/prompts/coach.md`. Attach five
Function tools (`search_tech`, `get_document`, `find_related`, `market_evidence`, `visualize_idea`)
with `server.url` set to `https://api.clarte.io/vapi/tools`, or to
`https://<clarte-api>.workers.dev/vapi/tools` until DNS is live. Set the same server secret the
Worker stores as `VAPI_SERVER_SECRET`. Enable `transcript` and `tool-calls` client messages. Store
the assistant id as `VAPI_ASSISTANT_ID`.

PLAN.md section 9 names `product/scripts/vapi-setup.ts` for this. From `product/`, once that file is
in the tree, it calls `https://api.vapi.ai` with the private key:

```bash
cd product

# [needs key] VAPI_PRIVATE_KEY, plus VAPI_SERVER_SECRET and the public tool URL in the environment
npx tsx scripts/vapi-setup.ts
```

Local webhook forwarding, while `npm run dev` is on port 8787:

```bash
# [needs key] Vapi CLI authentication
vapi listen --forward-to localhost:8787/vapi/tools
```

Pass `sessionId` when the browser starts the call so tool rows land on `sessions.id`.

## 4. Ingest the library

Ingest runs locally, not inside a Worker. See
[architecture.md](architecture.md#why-ingest-runs-locally). Endpoints, limits, terms, and
today's live check for each source are in [data_sources.md](data_sources.md) (Appendix A of
[PLAN.md](PLAN.md)). The full run reads `GEMINI_API_KEY`,
`CLOUDFLARE_ACCOUNT_ID`, and `CLOUDFLARE_API_TOKEN`. `NASA_API_KEY` and `OPENALEX_API_KEY` are
optional. Without Gemini or Cloudflare the script still writes files, using fallback summaries and
stub vectors.

```bash
cd product

# No key. About 40 documents from the live public APIs, local summaries, stub vectors.
npm run ingest:dry

# [needs key] GEMINI_API_KEY, CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_API_TOKEN from ../.env
set -a && source ../.env && set +a
npm run ingest

# [needs key] Cloudflare auth. Reads product/data/manifest.json and writes remote D1 + Vectorize.
npm run load

# No remote key. Local D1 only. Vectorize has no local emulation.
npm run load:local
```

Useful flags on `ingest/run.ts`: `--limit 200` caps the run and scales every per-source quota;
`--sources nasa_t2,ntrs` restricts which APIs are called; `--dry-run` skips model calls.

```bash
# [needs key] Cloudflare auth
npx wrangler d1 execute paber --remote --config wrangler.api.toml \
  --command "select type, count(*) from documents group by type" --json
```

## 5. Run locally

```bash
# Terminal 1 — API Worker on :8787. Voice and Imagine need the secrets from section 2.
cd product && npm run dev

# Terminal 2 — MCP Worker on :8788. Optional.
cd product && npm run dev:mcp

# Terminal 3 — website on :3000. Voice needs the two NEXT_PUBLIC_VAPI_* values from section 2.
cd website && npm run dev
```

`wrangler dev` reports Vectorize and Workers AI as not supported locally. `search_tech` then uses
D1 keyword search. Pass `--remote` to `wrangler dev` when you want the real index:

```bash
# [needs key] Cloudflare auth, because --remote uses the deployed D1 and Vectorize
cd product && npx wrangler dev --config wrangler.api.toml --port 8787 --remote
```

Smoke test without a browser. These hit the local Worker and do not send provider keys:

```bash
curl localhost:8787/health
curl -X POST localhost:8787/api/tools/search_tech \
  -H 'content-type: application/json' \
  -d '{"sessionId":"demo","args":{"query":"satellite thermal control","limit":3}}'
curl 'localhost:8787/api/graph?limit=20'
```

`GET /health` on the v3 Worker returns
`service`, `documents`, `vapiConfigured`, `gemmaConfigured`, and `imagineEnabled`.

Text mode, no Vapi key:

```bash
curl -X POST localhost:8787/api/chat \
  -H 'content-type: application/json' \
  -d '{"sessionId":"demo","message":"My drone battery dies too fast."}'
```

Imagine stays off until `IMAGINE_ENABLED` is true, the cookie from Google sign-in is present, and
`POST /me/xai-key` has stored a key. Do not put that key in the repo or in this curl as a committed
example. A refused visualize call is HTTP 200 with `sign_in_required`, `key_required`, or `disabled`.

## 6. Deploy

Workers first, then the site. The first deploy prints a `*.workers.dev` URL. Use it as
`NEXT_PUBLIC_CLARTE_API` and as the Vapi `server.url` until `api.clarte.io` resolves.

```bash
cd product
npm run build

# [needs key] Cloudflare auth
npm run deploy:api

# [needs key] Cloudflare auth
npm run deploy:mcp
```

`npm run deploy:api` publishes `clarte-api`. `npm run deploy:mcp` publishes `clarte-mcp` at
`/mcp` on its workers.dev host.

```bash
cd ../website

# Set NEXT_PUBLIC_CLARTE_API in website/.env.local first.
# Production target: https://api.clarte.io
# Until DNS is live: https://clarte-api.<account>.workers.dev
# [needs key] only when that file also contains NEXT_PUBLIC_VAPI_PUBLIC_KEY and NEXT_PUBLIC_VAPI_ASSISTANT_ID
npm run build

# [needs key] Cloudflare auth
npx wrangler pages deploy out --project-name clarte-web
```

The API allows credentialed browser calls from `https://clarte.io`, `https://www.clarte.io`,
`https://clarte-web.pages.dev`, Pages preview hosts `https://<hash>.clarte-web.pages.dev`, and
`http://localhost:3000`. Other `*.pages.dev` sites are refused. Preview hashes do not need a new
`ALLOWED_ORIGINS` entry. `www.clarte.io` redirects to the apex once DNS is live.

```toml
ALLOWED_ORIGINS = "http://localhost:3000,https://clarte.io,https://www.clarte.io,https://clarte-web.pages.dev"
```

### Custom domains, after the zone is active

| Hostname | Serves | How |
|---|---|---|
| `clarte.io` | the website | Pages project `clarte-web`, custom domains `clarte.io` and `www.clarte.io` |
| `api.clarte.io` | Worker `clarte-api` | uncomment `[[routes]]` in `wrangler.api.toml`, then `npm run deploy:api` **[needs key]** |
| `mcp.clarte.io` | Worker `clarte-mcp` | uncomment `[[routes]]` in `wrangler.mcp.toml`, then `npm run deploy:mcp` **[needs key]** |
| `clarte.io/auth/*` | the same API Worker | Worker route so the Google callback and `clarte.io` share the session cookie |

Both `[[routes]]` blocks are committed commented out. `custom_domain = true` fails while the zone is
not on the account. After they succeed, set `NEXT_PUBLIC_CLARTE_API=https://api.clarte.io`, set the
Vapi tool URL to `https://api.clarte.io/vapi/tools`, set `GOOGLE_REDIRECT_URI` to
`https://clarte.io/auth/callback/google`, rebuild the site, and redeploy Pages.

Wrangler creates the Worker DNS records. Do not pre-create CNAMEs for `api` and `mcp`.

MCP smoke test (Streamable HTTP). Local port shown; the same body works against the deployed `/mcp`:

```bash
curl -sD /tmp/h -X POST localhost:8788/mcp \
  -H 'content-type: application/json' -H 'accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"curl","version":"1"}}}'

SID=$(grep -i '^mcp-session-id' /tmp/h | tr -d '\r' | awk '{print $2}')
curl -s -X POST localhost:8788/mcp \
  -H 'content-type: application/json' -H 'accept: application/json, text/event-stream' \
  -H "mcp-session-id: $SID" -d '{"jsonrpc":"2.0","id":2,"method":"tools/list"}'
```

## 7. Connect the MCP server to Cursor

```json
{
  "mcpServers": {
    "clarte": { "url": "https://mcp.clarte.io/mcp" }
  }
}
```

Until DNS is live, use the `clarte-mcp` `*.workers.dev` URL with path `/mcp`. Locally, use
`http://localhost:8788/mcp`.

## What still needs a key

| Step | Blocked on | Without it |
|---|---|---|
| Voice conversation | `VAPI_PUBLIC_KEY`, `VAPI_ASSISTANT_ID`, `VAPI_SERVER_SECRET`, and Vapi credit on the assistant | Mic stays off. `POST /api/chat` runs the same tools. |
| Create the assistant from the script | `VAPI_PRIVATE_KEY` **[needs key]** on `npx tsx scripts/vapi-setup.ts` | Create the assistant in the Vapi dashboard instead. |
| Gemma summaries, tags, objections, Imagine prompts | `GEMINI_API_KEY` | Deterministic summaries. Retrieval still returns real documents. |
| Real semantic search | `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` during ingest | Stub vectors. Keyword search still answers. |
| Live Exa research | `EXA_API_KEY` on `clarte-api` (and `clarte-mcp` if Cursor should search live) | D1 and Vectorize only. No Exa request is sent. |
| Remote D1, Vectorize, deploys | `wrangler login` or a Cloudflare API token | Local D1 only. |
| Google sign-in | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `SESSION_SECRET` | Anonymous graph, voice, and citations still work. |
| Grok Imagine | `IMAGINE_ENABLED=true`, a Google session, and a user xAI key encrypted with `KEY_ENCRYPTION_KEY` | Idea card shows sign-in / connect-a-key. Tool error is spoken, HTTP stays 200. |
| xAI dev calls | `XAI_API_KEY` plus API credits on that key | Imagine for a signed-in user uses their key, not this one. |
