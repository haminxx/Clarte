# Clarte

**A technology library for engineers and researchers, plus a voice brainstorming partner that trains how they think.**

If 21st.dev is a library of design components, PABER is a library of papers, patents and technical
reports. Every document is a node in a knowledge graph that looks like a constellation. You talk to a
voice coach, it runs a three-stage critical-thinking flow — 5 Whys, Why-How-What, then a cited debate —
and the technology that matters to your problem lights up as you speak.

Built at **SpaceXAI Hack Day, UC San Diego (2026-10-25)** with Cursor. Today's library is space
technology: NASA patents, NASA technical reports, NASA spinoffs and software, and arXiv space papers.

```
readme/     project docs — start at readme/README.md
product/    Cloudflare Workers: MCP tool server, Grok Voice bridge, D1 + Vectorize, ingest
website/    Next.js frontend: 3D graph, mic, stage indicator, idea card
```

## Start here

| Doc | What it covers |
|---|---|
| [readme/overview.md](readme/overview.md) | What PABER is, who it's for, and the three stages |
| [readme/architecture.md](readme/architecture.md) | Layers, data model, tools, and a diagram |
| [readme/setup.md](readme/setup.md) | Exact commands: D1, Vectorize, secrets, ingest, deploy |
| [readme/demo-script.md](readme/demo-script.md) | The 90-second demo, line by line |
| [readme/hackathon-requirements.md](readme/hackathon-requirements.md) | How each requirement is met, with file links |
| [readme/PLAN.md](readme/PLAN.md) | The full startup plan and system design (source of truth) |

## Stack

Grok Voice realtime API (conversation and tool calling) · Gemma 4 `gemma-4-26b-a4b-it` through the
Gemini API (summaries, tags, debate) · Cloudflare Workers, D1, Vectorize and Workers AI
`@cf/baai/bge-base-en-v1.5` · Next.js on Cloudflare Pages · MIT licensed.

No keys are committed. See [.env.example](.env.example) and
[product/.dev.vars.example](product/.dev.vars.example).
