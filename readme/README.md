# Clarte docs

Plan v3 (2026-10-25) is the source of truth: [PLAN.md](PLAN.md). Voice is Vapi. Grok Imagine runs only
after the idea is confirmed, for a Google-signed-in user who has stored an encrypted xAI key.

| Doc | What it covers |
|---|---|
| [overview.md](overview.md) | What Clarte is, the problem, and the conversation |
| [architecture.md](architecture.md) | Layers, diagram, API paths, data model, tool specs |
| [setup.md](setup.md) | Install, D1 and Vectorize, secrets, Vapi, ingest, deploy |
| [demo-script.md](demo-script.md) | The 90-second demo and the backup plan |
| [hackathon-requirements.md](hackathon-requirements.md) | Requirement-by-requirement evidence |
| [PLAN.md](PLAN.md) | Startup plan and system design, v3 |

## Repo map

```
readme/                      these docs
product/
  workers/api/               Vapi tool webhook, Google sign-in, BYOK, graph API
  workers/mcp/               MCP server (search, document, related, evidence, visualize)
  workers/shared/            tool implementations, D1 access, Gemma client, embeddings
  prompts/coach.md           Vapi assistant system prompt (3 stages + citation rule)
  prompts/debate.md          Gemma 4 debate prompt
  prompts/enrich.md          Gemma 4 ingest summary + tag prompt
  prompts/imagine.md         (v3) Gemma 4 prompts for Grok Imagine
  scripts/vapi-setup.ts      (v3) create or update the Vapi assistant and tools
  ingest/                    local fetch → Gemma → embed → edges → D1/Vectorize loader
  db/migrations/             D1 schema
  wrangler.api.toml          API Worker config (Worker name clarte-api)
  wrangler.mcp.toml          MCP Worker config (Worker name clarte-mcp)
website/
  app/                       Next.js page, layout, styles
  components/                Graph3D, VoiceButton, StageBar, IdeaCard, transcript
                             (v3) Sources panel, visuals, sign-in
  lib/                       API client and the Vapi call helper
```

Lines marked `(v3)` are the files and UI named in PLAN.md section 9 for this version. The D1 database
name stays `paber`. The Vectorize index name stays `paber-docs`.

Clone URL: https://github.com/haminxx/Clarte

Site targets: https://clarte.io and https://api.clarte.io, with `*.pages.dev` and `*.workers.dev`
until DNS is live. MCP target: https://mcp.clarte.io.
