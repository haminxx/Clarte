# Hackathon requirements — how Clarte meets each one

SpaceXAI Hack Day, UC San Diego, 2026-10-25. Submission deadline 6:30 PM PT on the
[MLH event page](https://www.mlh.com/events/hacktoberfest-x-spacexai-hack-day-uc-san-diego).

| Requirement | How Clarte meets it | Where to look |
|---|---|---|
| **SpaceXAI: Make it Legendary** — use real space data | ~700 documents from NASA T2 patents, spinoffs and software, NASA NTRS reports, and arXiv space categories. Official APIs only, no scraping, with source URL and licence status stored per document. | [`product/ingest/sources/`](../product/ingest/sources/), [`db/migrations/0001_init.sql`](../product/db/migrations/0001_init.sql) |
| **Required: built with Cursor** | The whole repo was written with Cursor and Cursor cloud agents; the commit history is the record. The MCP server is also connectable to Cursor as a tool, so the library was queried from the editor during the build. | `git log`, [architecture.md](architecture.md#the-four-tools) |
| **Required: Grok Voice API** | `grok-voice-latest` over `wss://api.x.ai/v1/realtime` runs the entire conversation with server VAD and function calling. The browser connects with a server-minted ephemeral client secret; `XAI_API_KEY` stays in the Worker. | [`workers/api/voice.ts`](../product/workers/api/voice.ts), [`website/lib/voice-client.ts`](../website/lib/voice-client.ts) |
| **Best Use of Gemma 4** — through the Gemini API | `gemma-4-26b-a4b-it` does real work in three places: every document summary and domain tag at ingest, the one-line connection reason in `find_related`, and the three cited objections in `market_evidence`. Grok cannot do this work — its model is fixed — so the split is genuine, not decorative. | [`workers/shared/gemma.ts`](../product/workers/shared/gemma.ts), [`prompts/enrich.md`](../product/prompts/enrich.md), [`prompts/debate.md`](../product/prompts/debate.md) |
| **Best Open-Source AI** | MIT licensed and public. Gemma 4 is open-weight, and the embedding model is the open-weight BGE family (`@cf/baai/bge-base-en-v1.5`) running on Workers AI — so the two models at the core of the product can both be self-hosted. | [`LICENSE`](../LICENSE), [`workers/shared/vector-math.ts`](../product/workers/shared/vector-math.ts) |
| **Bonus: Grok Bot for planning** | The plan in [PLAN.md](PLAN.md) was produced in the hackathon group chat with Grok Bot; include the chat screenshots in the submission. | [PLAN.md](PLAN.md) |
| **Submission** | Public repo, MIT licence, demo video under 2 minutes, README that explains setup and deploy. | [demo-script.md](demo-script.md), [setup.md](setup.md) |

## Security requirement: no committed keys

- `.gitignore` excludes `.env`, `.dev.vars`, `.env.local` and the generated `product/data/` artifacts.
- Templates only: [`.env.example`](../.env.example), [`product/.dev.vars.example`](../product/.dev.vars.example),
  [`website/.env.example`](../website/.env.example).
- The Cloudflare account id is read from `CLOUDFLARE_ACCOUNT_ID`, never hardcoded. The only identifier
  in the repo is the D1 `database_id`, which is not a credential and is required by wrangler.
- The browser receives a Grok ephemeral client secret with a 10-minute TTL, never the API key.

## Verification status

Verified on this machine, with no API keys:

| Check | Result |
|---|---|
| `product`: typecheck + bundle both Workers | passes (`npm run build`) |
| `website`: typecheck + static export | passes (`npm run build`) |
| Ingest against the live public APIs | 46 records fetched, 40 unique, 200 edges, 43 cross-domain (`npm run ingest:dry`) |
| D1 schema applied and loaded locally | 40 documents in local D1 |
| `search_tech`, `find_related`, `market_evidence`, `/api/graph`, `/api/session`, mentions polling, idea draft | all answer correctly against local D1 |
| MCP server over Streamable HTTP | `initialize`, `tools/list` (all four tools with correct schemas) and `tools/call` on `search_tech` all succeed |
| Website against the local API in a real browser | searched the library, lit up 9 nodes, moved through to the Debate stage, produced cited objections and an idea card |

Not verifiable without keys: a live Grok Voice call, Gemma 4 output quality, real semantic (as opposed
to keyword) search, and remote deploys. See [setup.md](setup.md#what-still-needs-christians-keys).
