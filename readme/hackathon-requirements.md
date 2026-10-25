# Hackathon requirements — how Clarte meets each one

Hacktoberfest Hack Day San Diego x SpaceXSI, UC San Diego, 2026-10-25. Submission deadline 6:30 PM PT on the
[MLH event page](https://www.mlh.com/events/hacktoberfest-x-spacexai-hack-day-uc-san-diego).

The track accepts the Grok Voice API or the Grok Imagine API. Clarte meets it with **Grok Imagine**.
Voice runs on Vapi.

| Requirement | How Clarte meets it | Where to look |
|---|---|---|
| **SpaceXSI: Make it Legendary** — use real space data | About 700 documents from NASA T2 patents, spinoffs, and software, NASA NTRS reports, and arXiv space categories. Official APIs only, with source URL and license status stored on each document. | [`product/ingest/sources/`](../product/ingest/sources/), [`db/migrations/0001_init.sql`](../product/db/migrations/0001_init.sql) |
| **Required: built with Cursor** | The repo is written with Cursor and Cursor cloud agents. The MCP server is connectable from Cursor, so the library can be queried from the editor. | `git log`, [architecture.md](architecture.md#the-five-tools) |
| **Required: Grok Imagine API** | After the user confirms the idea card, the Worker calls `POST https://api.x.ai/v1/images/generations`. The call is off until that person is signed in with Google and has an xAI key encrypted in D1. Stages 1–3 do not call Imagine. | [PLAN.md](PLAN.md) sections 5 and 6.6, [architecture.md](architecture.md#http-api) |
| **Best Use of Gemma 4** — through the Gemini API | `gemma-4-26b-a4b-it` writes document summaries and domain tags at ingest, the one-line connection reason in `find_related`, the cited objections in `market_evidence`, and the prompts Grok Imagine receives. | [`workers/shared/gemma.ts`](../product/workers/shared/gemma.ts), [`prompts/enrich.md`](../product/prompts/enrich.md), [`prompts/debate.md`](../product/prompts/debate.md) |
| **Best Open-Source AI** | Public MIT license. Gemma 4 is open-weight. Embeddings are the open-weight BGE model `@cf/baai/bge-base-en-v1.5` on Workers AI. | [`LICENSE`](../LICENSE), [`workers/shared/embeddings.ts`](../product/workers/shared/embeddings.ts) |
| **Bonus: Grok Bot for planning** | [PLAN.md](PLAN.md) was produced with Grok Bot in the hackathon group chat. Include those screenshots in the submission. | [PLAN.md](PLAN.md) |
| **Submission** | Public repo https://github.com/haminxx/Clarte, MIT license, demo video under 2 minutes, README with setup and deploy. | [demo-script.md](demo-script.md), [setup.md](setup.md) |

Prizes named by the event: 6 months of Cursor Pro+ for the main prize, and a DEV badge plus MLH
swag for Best Use of Gemma and Best Open-Source AI. PLAN.md section 12 is a later business sketch.
Its prices and targets are examples, and this submission does not treat them as researched figures.

## Security: no committed keys

- `.gitignore` excludes `.env`, `.dev.vars`, `.env.local`, and the generated `product/data/` artifacts.
- Templates only: [`.env.example`](../.env.example), [`product/.dev.vars.example`](../product/.dev.vars.example), [`website/.env.example`](../website/.env.example). The root template lists names and empty values.
- `CLOUDFLARE_ACCOUNT_ID` comes from the environment. The D1 `database_id` in the wrangler configs is the database identifier Wrangler requires, and it is not an API credential.
- The browser receives `NEXT_PUBLIC_VAPI_PUBLIC_KEY` and `NEXT_PUBLIC_VAPI_ASSISTANT_ID`. `VAPI_PRIVATE_KEY`, `VAPI_SERVER_SECRET`, `GEMINI_API_KEY`, `GOOGLE_CLIENT_SECRET`, `SESSION_SECRET`, and `KEY_ENCRYPTION_KEY` stay on the server.
- A user's xAI key is accepted once at `POST /me/xai-key`, encrypted with AES-GCM, stored as ciphertext plus `last4`, and decrypted only inside the Worker for the Imagine call. `GET /me` returns `connected` and `last4`.

D1 stays database `paber`. Vectorize stays index `paber-docs`. The Google Cloud OAuth project is still named "PABER".

## Hosts

| Target | Until `clarte.io` DNS is live |
|---|---|
| https://clarte.io | Cloudflare Pages `*.pages.dev` |
| https://api.clarte.io | Worker `clarte-api` on `*.workers.dev` |
| https://mcp.clarte.io | Worker `clarte-mcp` on `*.workers.dev` |

Switch the Vapi tool URL and `GOOGLE_REDIRECT_URI` to the clarte.io hostnames when the zone is active. Steps are in [setup.md](setup.md).

## Verification status

Recorded against the scaffold already on `main`, with no provider keys in the environment:

| Check | Result |
|---|---|
| `product`: typecheck and bundle both Workers | passes (`npm run build`) |
| `website`: typecheck and static export | passes (`npm run build`) |
| Ingest against the live public APIs | 46 records fetched, 40 unique, 200 edges, 43 cross-domain (`npm run ingest:dry`) |
| D1 schema applied and loaded locally | 40 documents in local D1 |
| `search_tech`, `find_related`, `market_evidence`, `/api/graph`, `/api/session`, mentions polling, idea card | answers against local D1 |
| MCP over Streamable HTTP | `initialize`, `tools/list`, and `tools/call` on `search_tech` succeed |
| Website against the local API in a browser | searched the library, lit nodes, reached Debate, showed cited objections and an idea card |

This doc update did not re-run that table. A live Vapi call, Google sign-in, encrypted BYOK storage, and a Grok Imagine image still need the keys in [setup.md](setup.md#what-still-needs-a-key). Text mode covers the graph and the citations when those keys are empty.
