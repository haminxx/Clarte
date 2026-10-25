# Clarte

**A technology library for engineers and researchers, plus a voice brainstorming partner that trains how they think.**

If 21st.dev is a library of design components, Clarte is a library of papers, patents, and technical
reports. Every document is a node in a knowledge graph that looks like a constellation. You talk to a
voice coach, it runs a three-stage critical-thinking flow — 5 Whys, Why-How-What, then a cited debate —
and the technology that matters to your problem lights up as you speak. After you confirm the final
idea, Grok Imagine renders it.

Built at **SpaceXAI Hack Day, UC San Diego (2026-10-25)** with Cursor. Today's library is space
technology: NASA patents, NASA technical reports, NASA spinoffs and software, and arXiv space papers.

**Site:** https://clarte.io · **API:** https://api.clarte.io · **MCP:** https://mcp.clarte.io

Until the `clarte.io` zone is live on Cloudflare DNS, use the free `*.pages.dev` site and
`*.workers.dev` Worker URLs. Point Vapi and Google sign-in at the clarte.io hostnames once DNS answers.

```
readme/     project docs — start at readme/README.md
product/    Cloudflare Workers: MCP tools, Vapi webhook, D1 + Vectorize, ingest
website/    Next.js frontend: 3D graph, Vapi mic, sources, idea card, visuals
```

```bash
git clone https://github.com/haminxx/Clarte.git
```

## Start here

| Doc | What it covers |
|---|---|
| [readme/overview.md](readme/overview.md) | What Clarte is, who it's for, and the conversation |
| [readme/architecture.md](readme/architecture.md) | Layers, API paths, data model, and tools |
| [readme/setup.md](readme/setup.md) | Commands: D1, Vectorize, secrets, Vapi, ingest, deploy |
| [readme/demo-script.md](readme/demo-script.md) | The 90-second demo, line by line |
| [readme/hackathon-requirements.md](readme/hackathon-requirements.md) | How each requirement is met, with file links |
| [readme/PLAN.md](readme/PLAN.md) | Startup plan and system design, v3 (2026-10-25) |

## Stack

Vapi for voice (transcription, dialogue, speech, and tool calling) · Gemma 4
`gemma-4-26b-a4b-it` through the Gemini API (summaries, tags, debate, Imagine prompts) · Grok Imagine
for the final idea image, and only after the idea is confirmed, behind Google sign-in and an encrypted
user xAI key · Cloudflare Workers, D1, Vectorize, and Workers AI `@cf/baai/bge-base-en-v1.5` · Next.js
on Cloudflare Pages · MIT licensed.

No keys are committed. See [.env.example](.env.example) and
[product/.dev.vars.example](product/.dev.vars.example).

The Cloudflare D1 database stays `paber` and the Vectorize index stays `paber-docs`. Those names are
resource identities from before the product was renamed to Clarte. Bindings in code are `DB`,
`VECTORS`, and `AI`. The Google Cloud project that holds the OAuth client is still named "PABER".
