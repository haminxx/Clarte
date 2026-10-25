# Clarte docs

| Doc | What it covers |
|---|---|
| [overview.md](overview.md) | What Clarte is, the problem, and the three-stage conversation |
| [architecture.md](architecture.md) | Layers, diagram, data model, tool specs, what's stubbed |
| [setup.md](setup.md) | Install, D1 and Vectorize commands, secrets, ingest, deploy |
| [demo-script.md](demo-script.md) | The 90-second demo and the backup plan |
| [hackathon-requirements.md](hackathon-requirements.md) | Requirement-by-requirement evidence |
| [PLAN.md](PLAN.md) | Full startup plan and system design — kept verbatim from before the rename, so it still says "PABER" |

## Repo map

```
readme/                      these docs
product/
  workers/api/               ephemeral token minting, tool bridge, graph + mention APIs
  workers/mcp/               MCP server exposing the four tools
  workers/shared/            tool implementations, D1 access, Gemma client, embeddings
  prompts/coach.md           Grok Voice three-stage system prompt
  prompts/debate.md          Gemma 4 debate prompt
  prompts/enrich.md          Gemma 4 ingest summarise + tag prompt
  ingest/                    local fetch → Gemma → embed → edges → D1/Vectorize loader
  db/migrations/             D1 schema
  wrangler.api.toml          API Worker config
  wrangler.mcp.toml          MCP Worker config
website/
  app/                       Next.js page, layout, styles
  components/                Graph3D, VoiceButton, StageBar, IdeaCard, TranscriptPanel
  lib/                       API client, Grok Voice realtime client, audio plumbing
```
