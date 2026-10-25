# Clarte: Startup Plan and System Design

**Version:** v3, English (2026-10-25 3:20 PM PT, SpaceXAI Hack Day, UC San Diego). **v3 change:** the voice agent moved from the Grok Voice realtime API to **Vapi**; **Grok Imagine** is now the xAI API used, only for the final idea visualization; every referenced source is cited with its URL.

**Purpose of this doc:** the single source of truth to hand to Cursor AI to start and guide the build.

**Repo:** https://github.com/haminxx/Clarte (three top-level folders: `readme/`, `product/`, `website/`)

**Website:** https://clarte.io (API at https://api.clarte.io)

**Name:** the product and repo were renamed to **Clarte** on 2026-10-25 (commit `daf3474` is still valid after the repo rename). **Legacy resource names stay as they are** (D1 `paber` and its id, Vectorize `paber-docs`, Google Cloud project "PABER"); renaming them would break bindings and credentials.

---

## 1. One-line definition

**Clarte is a technology library for engineers and researchers, plus a voice brainstorming partner that trains how they think.**
If 21st.dev is a library of design components, Clarte is a library of papers, patents, and technical reports. Every document is a node in a knowledge graph. The user talks with a voice AI, defines their own idea through that conversation, and discovers existing technology they can apply along the way.

## 2. Purpose

- **Problem:** Technical knowledge is scattered across NASA reports, patent databases, arXiv, PubMed and more, and most tools return keyword search lists. There is no good way to explore "what existing technology could solve my problem?" Existing tools (Elicit, Consensus, Connected Papers, ResearchRabbit) find and summarize papers or link them only by citations.
- **Differentiator:** Clarte does not hand out answers first. A 3-stage conversation (5 Whys, Why-How-What, Market research and Debate) draws out the user's critical thinking, and along the way it connects technologies across domains (for example, satellite thermal control applied to drone battery cooling).
- **Target users:** (1) university researchers and grad students, (2) founders and engineers at deep-tech startups, (3) hackathon participants and students.

## 3. Goals

**Today's hackathon (deadline 6:30 PM PT)**

1. Build a knowledge graph from 500 to 800 space-technology documents (NASA NTRS, NASA T2 patents, arXiv space categories).
2. The 3-stage conversation actually works over a **Vapi** voice agent, and nodes mentioned in the conversation light up in the graph with clickable source URLs.
3. When the final idea is decided, **Grok Imagine** renders it (concept image, system-structure diagram, paper-style figure).
4. Gemma 4 generates summaries, tags, and debate counter-arguments.
5. Submit with a demo video under 2 minutes, a README, and a public MIT-licensed repo.

**Later (startup stage)**

- Expand to every field (engineering, bio, materials, energy) and connect global patent and academic databases.
- Team and institution workspaces, shared idea boards, and a public MCP server for external AI tools (Cursor, Claude, and others).

## 4. Hackathon requirements checklist

| Item | Requirement | How Clarte meets it |
|---|---|---|
| SpaceXAI: Make it Legendary | Use real space data | NASA NTRS, NASA T2 patents and Spinoff, arXiv space categories |
| Required | Build with Cursor; more Cursor use is better | All code written with Cursor and Cursor cloud agents; keep the history |
| Required | Grok Voice API or Grok Imagine API | **Grok Imagine API** (`POST https://api.x.ai/v1/images/generations`) visualizes the final idea at the end of every session (section 5, Stage 4). This is how Clarte meets the rule. Voice runs on Vapi, not Grok Voice (decision 2026-10-25, because the xAI team has $0 API credits and Christian has $100 of Vapi credit). |
| Bonus | Use Grok Bot for planning and team collaboration | Include screenshots of the Hackathon group chat in the submission |
| Best Use of Gemma 4 | Use Gemma 4 through the Gemini API | Reasoning LLM behind the tools (summaries, tags, debate) |
| Best Open-Source AI | Open-source or open-weight AI at the core | Gemma 4 (open weights) + open-weight BGE embeddings + public MIT repo |
| Submission | 6:30 PM PT on the MLH event page (Register, Check In, Submit) | https://www.mlh.com/events/hacktoberfest-x-spacexai-hack-day-uc-san-diego |

**Prizes:** the main prize is 6 months of Cursor Pro+. Side prizes are Best Use of Gemma and Best Open-Source AI (DEV badge and MLH swag).

## 5. Core logic: 3-stage voice conversation + final visualization

Put these rules in the Vapi assistant system prompt (`product/prompts/coach.md`, pasted into the assistant's `model.messages` system message). Also track the stage as server state (`stage`) and show it in the UI.

**Stage 1. 5 Whys (dig into the problem)**

- Don't give answers. Ask "why?" up to 5 times. Move on once the user states the root cause in one sentence.
- When a root-cause keyword appears, call `search_tech` so the graph starts highlighting early.

**Stage 2. Why, How, What (structure the idea)**

- Why: why it matters and who is hurting. How: how it will be solved. What: what will be built.
- Use `find_related` to show technology from other domains, then ask back: "How do you think you could apply this technology?"

**Stage 3. Market research and Debate (validate)**

- Use `market_evidence` to pull existing patents and papers as evidence, and have Gemma 4 build the opposing argument.
- Push back, for example "There's already a NASA patent for this. What's your differentiator?", and let the user defend.
- At the end, produce an idea card: problem, root cause, solution, 3 evidence documents, remaining risks.

**Stage 4. Visualize the final idea (Grok Imagine, end of session only)**

- Runs only after the voice conversation ends **and** the user confirms the final idea card. Never call Imagine during Stages 1–3.
- The agent (or the UI "Visualize" button) calls `visualize_idea`. The Worker has Gemma 4 turn the idea card into 1–3 image prompts, then calls Grok Imagine server-side:
    - **Form / concept image:** what the product looks like.
    - **System-structure diagram:** blocks and data/energy flows, clean technical-diagram style.
    - **Paper-level figure:** a figure in the style of a journal paper (labelled schematic).
    - Optional: a short concept video with `grok-imagine-video` (async; start the request, poll until done). Stretch goal only.
- Results are shown on the idea card and saved in D1 (`visuals`). The final report lists the images next to the cited sources.

**Conversation rules:** ask one question at a time. If you don't know, say so.

**Source citation rule (required):** whenever the agent mentions a paper, patent, report or other source, it says the title and source out loud and the UI shows the same item as a clickable URL. Every tool result carries `url` (and `source`, `type`), so the agent never invents a link. The final summary and idea card list every cited source with its URL.

- **UI:** a "Sources" panel next to the 3D graph and the live transcript. Each cited source is a row (title, type, source, clickable `url`); clicking it opens the original page and focuses its node in the graph. Transcript lines that cite a source show an inline link chip.
- **Final report:** idea card + Imagine visuals + numbered "References" list (title, source, URL), exportable as Markdown/PDF.

## 6. System design

### 6.1 Layers

```
[User voice / browser]
        |
(1) Website  - Next.js on Cloudflare Pages, https://clarte.io
        |     mic button, 3D knowledge graph, live transcript, Sources panel (URLs),
        |     stage indicator, idea card + visuals
        |  Vapi Web SDK (@vapi-ai/web): new Vapi(VAPI_PUBLIC_KEY).start(VAPI_ASSISTANT_ID)
(2) Voice    - Vapi assistant (hosted: transcriber + LLM + voice, tool calling)
        |     runs the 3-stage conversation; system prompt = prompts/coach.md
        |  tool calls: Vapi POSTs {message:{type:"tool-calls", toolCallList}} to server URL
(3) API / Tool Bridge - Cloudflare Worker clarte-api, https://api.clarte.io  (POST /vapi/tools)
        |     verifies Vapi secret header, runs tools via MCP, returns {results:[{toolCallId,result}]},
        |     emits highlight + citation events to the website
(4) MCP Server - Cloudflare Worker clarte-mcp, https://mcp.clarte.io (Agents SDK, McpAgent)
        |     search_tech / get_document / find_related / market_evidence / visualize_idea
        +--> (5) Reasoning - Gemma 4 (Gemini API): summaries, tags, debate, Imagine prompts
        +--> (6) Data - D1 (metadata, URLs, sessions) + Vectorize (embeddings) + Workers AI (embedding model)
        +--> (8) Visualize - Grok Imagine API (xAI), server-side only, end of session
                   ^
(7) Ingest   - run-once local script: fetch from official APIs, Gemma tagging, embed, load
```

**Data flow per turn:** user speaks → Vapi transcribes and its LLM decides to call a tool → Vapi sends a `tool-calls` webhook to the Worker → the Worker runs the MCP tool (Vectorize search + D1 join, Gemma reasoning) → the Worker returns `results[].result` as a **single JSON string** (Vapi requires a flat string, HTTP 200 even on errors, with `error` instead of `result` on failure) → Vapi speaks the answer. In parallel the Worker writes `mentions`/`citations` to D1, and the website receives highlight + citation events (poll `GET /sessions/:id/events` or the Vapi client `message` events) to light up nodes and add rows to the Sources panel.

**Vapi setup (dashboard or API, using Christian's existing Vapi credit):**

- Create one assistant "Clarte Coach": system prompt from `prompts/coach.md`, a first message, a voice and transcriber of your choice. Store its id as `VAPI_ASSISTANT_ID`.
- Create five **Function tools** (`type: "function"`) with JSON-schema parameters matching section 6.3, each with `server.url = https://api.clarte.io/vapi/tools` (one endpoint, dispatch by `function.name`). Attach them to the assistant (`model.toolIds`).
- Set a server secret / credential on the tools and verify it in the Worker; reject requests without it.
- Enable `transcript` and `tool-calls` in client messages so the website can render the live transcript.
- The browser only gets `VAPI_PUBLIC_KEY` and `VAPI_ASSISTANT_ID` (public by design). `VAPI_PRIVATE_KEY` is only used by setup scripts (`product/scripts/vapi-setup.ts`) to create/update the assistant and tools via `https://api.vapi.ai`.
- Pass the Clarte session id when starting the call (assistant variable values / metadata) so tool calls can be tied to `sessions.id`.
- Local testing: `vapi listen --forward-to localhost:8787/vapi/tools` plus a tunnel, or deploy the Worker to `*.workers.dev` (free).

### 6.2 Role split (important)

**Vapi is the voice layer and conversational brain** (speech-to-text, the dialogue LLM, text-to-speech, tool calling). **Gemma 4 is the reasoning LLM behind the tools** (summaries, tags, cross-domain reasons, debate counter-arguments, Imagine prompts), so the Gemma prize requirement is genuinely met. **Grok Imagine** is the xAI API that satisfies the SpaceXAI rule: it turns the final idea into visuals at the end of the session. Grok Voice is no longer used.


### 6.3 MCP tool spec

| Tool | Input | Output | Internals |
|---|---|---|---|
| `search_tech` | `query`, `limit` | list of nodes (id, title, source, summary, score) | embed the query, Vectorize search, join with D1 |
| `get_document` | `id` | summary, domain tags, source URL, license info | D1 lookup |
| `find_related` | `id`, `cross_domain` | neighbor nodes and why they connect | graph edges + other-domain filter; Gemma writes a one-line connection reason |
| `market_evidence` | `idea`, `limit` | existing patents and papers (each with `url`), 3 counter-arguments | `search_tech` + Gemma 4 debate prompt |
| `visualize_idea` | `session_id`, `kinds` (`concept`, `system_diagram`, `paper_figure`) | image URLs + the prompts used | Gemma 4 writes prompts from the idea card; Worker calls Grok Imagine; saves to `visuals` |

**Every tool result includes `url`, `source`, and `type` for each document**, so the agent can cite it and the UI can render a link. Format results returned to Vapi as a compact JSON string, for example `{"docs":[{"id":"...","title":"...","type":"patent","source":"NASA T2","url":"https://technology.nasa.gov/patent/..."}]}`.


Connect the same MCP server to Cursor during development too. That doubles as evidence of heavy Cursor use.

### 6.4 Data model (D1)

```
documents(id TEXT PK, source TEXT, source_id TEXT, type TEXT  -- paper|patent|report|software|spinoff
          title TEXT, abstract TEXT, summary TEXT, domains TEXT  -- JSON array
          url TEXT, published TEXT, center TEXT, license_status TEXT, created_at TEXT)
edges(src TEXT, dst TEXT, weight REAL, reason TEXT, cross_domain INTEGER, PRIMARY KEY(src,dst))
sessions(id TEXT PK, stage TEXT, root_cause TEXT, idea_json TEXT, created_at TEXT)
mentions(session_id TEXT, doc_id TEXT, ts TEXT)   -- for graph highlighting
citations(session_id TEXT, doc_id TEXT, url TEXT, title TEXT, stage TEXT, ts TEXT,
          PRIMARY KEY(session_id, doc_id))           -- sources the agent cited, with URL, for the Sources panel and report
visuals(id TEXT PK, session_id TEXT, kind TEXT, prompt TEXT, image_url TEXT, model TEXT, created_at TEXT)
                                                     -- kind: concept|system_diagram|paper_figure|video
```

`documents.url` is required (non-null) and holds the canonical source page (NASA T2 patent page, NTRS citation, arXiv abs page, DOI link). `sessions` also stores `vapi_call_id`. Grok Imagine image URLs may be temporary (⚠️ lifetime not checked): for the demo, keep `image_url` and cache the image in the browser, or regenerate. Do not enable R2 or any other paid add-on for this.


The Vectorize index is `paber-docs` (768 dimensions, cosine), and each vector id equals `documents.id`. Build edges from each document's top 5 most similar documents, and set `cross_domain` when the domains differ.

### 6.5 DB choice: Cloudflare vs Supabase (decided)

| | Cloudflare D1 + Vectorize (chosen) | Supabase Postgres + pgvector (revisit later) |
|---|---|---|
| Cost | Free plan | Free plan (pauses after a week of inactivity) |
| Pros | Same platform as Workers, one place to configure, bindings need no extra keys, low latency | Powerful SQL, dashboard, built-in auth |
| Cons | Vectors and metadata live in two stores (search in Vectorize, then fetch details from D1) | Separate platform and extra keys |

**Decision (Christian, 2026-10-25 2:41 PM PT):** the backend is already Cloudflare Workers, so today we use D1 + Vectorize. Revisit Supabase at the startup stage when user accounts and team features are needed. **Do not add Supabase clients or env vars to the hackathon build.**

**Created resources** (paste this block into `product/wrangler.toml`; the D1 ID is not a secret):

```toml
[[d1_databases]]
binding = "DB"
database_name = "paber"
database_id = "38e1c167-dea2-44ab-9f18-0251c864357c"

[[vectorize]]
binding = "VECTORS"
index_name = "paber-docs"   # 768 dims, cosine

[ai]
binding = "AI"              # embeddings: @cf/baai/bge-base-en-v1.5 (768 dims)
```

### 6.6 Google login and Grok Imagine BYOK (decided)

- **Login:** Google OAuth 2.0 (authorization code flow) implemented directly in the API Worker, with users and sessions in D1. **No Supabase, no paid auth service.** The OAuth client is created in the Google Cloud project "PABER". Routes: `GET /auth/google` → Google consent → `GET /auth/callback/google` → set an HttpOnly, Secure, SameSite=Lax session cookie with `Domain=.clarte.io` (so both clarte.io and api.clarte.io see it). The `/auth/*` paths on clarte.io are served by the clarte-api Worker through a Worker route (`clarte.io/auth/*`). **Authorized redirect URIs:** `https://clarte.io/auth/callback/google` and, for local dev, `http://localhost:8787/auth/callback/google`. **Authorized JavaScript origin:** `https://clarte.io`.
- **Anonymous use stays possible:** voice brainstorming, graph, and sources work without login.
- **Grok Imagine is built but off by default.** The `visualize_idea` tool and the "Visualize" button are enabled only when the user is signed in with Google **and** has connected their own xAI API key (BYOK) in Settings. Otherwise the idea card shows "Sign in and connect an xAI key to visualize this idea."
- **Key storage:** the user's xAI key is sent once over HTTPS to `POST /me/xai-key`, encrypted with AES-GCM (WebCrypto) using `KEY_ENCRYPTION_KEY` (Worker secret), and stored in D1. It is never returned to the browser (show only "connected, ends with …abcd"), never logged, and decrypted only inside the Worker for the Imagine call. Users can delete it.
- **Hackathon demo:** Christian signs in and connects the team key, which makes Imagine work once xAI API credits are on that team (see 8.1).

```
users(id TEXT PK, google_sub TEXT UNIQUE, email TEXT, name TEXT, created_at TEXT)
auth_sessions(id TEXT PK, user_id TEXT, expires_at TEXT)
user_keys(user_id TEXT, provider TEXT, ciphertext TEXT, iv TEXT, last4 TEXT, created_at TEXT,
          PRIMARY KEY(user_id, provider))   -- provider = 'xai'
```

### 6.7 Domain, hosting and deploy (clarte.io)

- **Domain:** `clarte.io` is owned by Christian at **Porkbun**. Move DNS to **Cloudflare (free plan)**: add the site in the Cloudflare dashboard on the Free plan, then switch the nameservers at Porkbun to the two Cloudflare assigns. Registration stays at Porkbun (no paid transfer, no paid Cloudflare add-ons).
- **Website:** Cloudflare Pages project `clarte-web` (built from `website/`), custom domains `clarte.io` and `www.clarte.io` (redirect www → apex).
- **API:** Worker `clarte-api` on custom domain `api.clarte.io` (Vapi tool webhook, OAuth, BYOK, Imagine, graph data), plus the route `clarte.io/auth/*` for Google login.
- **MCP:** Worker `clarte-mcp` on `mcp.clarte.io` (optional; `*.workers.dev` also works).
- **CORS:** the API allows origin `https://clarte.io` (and `http://localhost:3000` in dev) with credentials.
- Until DNS is live, use the free `*.pages.dev` and `*.workers.dev` URLs; switch Vapi `server.url` and OAuth redirect URIs to clarte.io when the zone is active.

## 7. Data sources (patent-focused, checked live 2026-10-25)


| Source | Content | Key | Status today |
|---|---|---|---|
| NASA T2 Patents `technology.nasa.gov/api/api/patent/<term>` | Licensable NASA patents | none | OK (200) |
| NASA T2 Software `.../api/api/software/<term>` | NASA public software | none | OK (200) |
| NASA T2 Spinoff `.../api/api/spinoff/<term>` | Space tech applied on Earth | none | OK (200) |
| NASA NTRS `ntrs.nasa.gov/api/citations/search?q=` | NASA technical reports and papers | none | OK (200) |
| arXiv `https://export.arxiv.org/api/query` | Astrophysics and aerospace papers (https required) | none | OK (200) |
| Europe PMC `ebi.ac.uk/europepmc/webservices/rest/search` | Bio and medical papers (extended demo) | none | OK (200) |
| Crossref `api.crossref.org/works` | Paper metadata across all fields | none | OK (200) |
| NASA Images `images-api.nasa.gov` | Mission imagery (UI decoration) | none | OK (200) |
| OpenAlex `api.openalex.org` | Papers across all fields | free key recommended | keyless budget used up today (429); resets 00:00 UTC (5 PM PT) |
| USPTO PatentsView | US patents | n/a | Discontinued (moving to USPTO ODP); see Appendix A |
| EPO OPS `ops.epo.org` | European patents | free registration (OAuth) | 403 without a key |
| Google Patents Public Data (BigQuery) | Global patents | Google Cloud account | not checked |

**Today's ingest scope:** NASA T2 (patents, software, Spinoff) + NTRS + arXiv space categories, roughly 700 documents. Seed topics: thermal control, battery, propulsion, materials, sensors, robotics, communications, life support, imaging, power. Exact quotas are in Appendix A3.

**Expansion order:** USPTO ODP (US patents) → EPO OPS (Europe) → OpenAlex (all-field papers) → Europe PMC (bio) → Google Patents (global).

**Rule:** use official APIs only, never scraping. Store each document's source URL and license status.

## 8. Platforms and required keys

| Platform | Use | What's needed | Env var |
|---|---|---|---|
| Vapi (vapi.ai) | Voice agent: transcriber + dialogue LLM + voice + tool calling | Christian's existing Vapi account ($100 credit); public key, private key, assistant id | `VAPI_PUBLIC_KEY`, `VAPI_PRIVATE_KEY`, `VAPI_ASSISTANT_ID`, `VAPI_SERVER_SECRET` |
| xAI Console | Grok Imagine API (final idea visuals, BYOK per user) | API key + API credits (Grok Premium on grok.com does not give API credits) | `XAI_API_KEY` (dev/test only; users bring their own key) |
| Google Cloud (project "PABER") | Google OAuth login | OAuth client ID and secret (free) | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `SESSION_SECRET`, `KEY_ENCRYPTION_KEY` |
| Google AI Studio | Gemma 4 (`gemma-4-26b-a4b-it`) | Gemini API key (free tier) | `GEMINI_API_KEY`, `GEMMA_MODEL` |
| Cloudflare | Workers, D1, Vectorize, Workers AI, Pages hosting, DNS for clarte.io (free plan) | account, API token, account ID | `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` |
| Porkbun | Registrar for `clarte.io` (already owned) | change nameservers to Cloudflare | none |
| GitHub | Code repo | access to haminxx/Clarte | none |
| Cursor | Dev environment (required) | Cursor account | none |
| MLH | Submission | confirm Register and Check In are done | none |
| (optional) NASA api.nasa.gov | Higher NASA limits (DEMO_KEY is 50/day) | free key | `NASA_API_KEY` |
| (optional) OpenAlex | All-field papers | free key | `OPENALEX_API_KEY` |

**Security rules:** keys go only in `.dev.vars` or `wrangler secret put` and are never committed. The browser only receives `VAPI_PUBLIC_KEY` and `VAPI_ASSISTANT_ID` (public by design); `VAPI_PRIVATE_KEY`, `VAPI_SERVER_SECRET`, `GEMINI_API_KEY`, `GOOGLE_CLIENT_SECRET`, `SESSION_SECRET`, `KEY_ENCRYPTION_KEY` and every xAI key stay server-side. Grok Imagine is called only from the Worker. The Cloudflare account ID goes in an env var, not hardcoded. **Cloudflare stays on the free plan: do not enable Workers Paid, R2, or any paid feature.**

### 8.1 Current setup status (2026-10-25 3:20 PM PT)

- **Cloudflare:** D1 `paber` and Vectorize `paber-docs` (768 dims, cosine) are created on the **free plan**; Workers AI embeddings use `@cf/baai/bge-base-en-v1.5`.
- **Vapi:** using Christian's existing Vapi account and credit ($100). The "Clarte Coach" assistant and its 5 Function tools still need to be created (section 6.1); then add `VAPI_PUBLIC_KEY`, `VAPI_PRIVATE_KEY`, `VAPI_ASSISTANT_ID`, `VAPI_SERVER_SECRET`.
- **xAI (Grok Imagine):** API key is created, but the xAI team has **$0 API credits**, so Grok Imagine calls are blocked until a staff/promo API credit code is redeemed in the xAI console. **This is the top open risk for SpaceXAI eligibility** (the track requires Grok Imagine or Grok Voice). Grok Premium on grok.com is a consumer plan and does not add API credits.
- **Google login:** OAuth client in Google Cloud project "PABER" still to be created (redirect URI `https://clarte.io/auth/callback/google`).
- **clarte.io:** owned (Porkbun), Cloudflare zone and DNS setup in progress.
- **Gemini API key:** issued and verified (free tier; `gemma-4-26b-a4b-it` and `gemma-4-31b-it` are listed and calls work).
- **GitHub:** the scaffold is on `main` of `haminxx/Clarte` (commit `daf3474`): ingest script, MCP server with 4 tools, API Worker, and website all build and run end to end with keyless fallbacks (text mode instead of voice, simple summaries instead of Gemma, D1 `LIKE` search if Vectorize is unreachable). Deploy steps are in `readme/setup.md`.

## 9. Repo structure

```
Clarte/
  README.md                 # short intro, links into readme/
  LICENSE                   # MIT
  readme/                   # overview, architecture, setup, demo script, hackathon requirements table, PLAN.md (this doc)
  product/
    workers/api/            # Vapi tool webhook (/vapi/tools), Google OAuth, BYOK key store, Imagine calls, graph data API
    workers/mcp/            # MCP server (5 tools incl. visualize_idea)
    prompts/coach.md        # Vapi assistant 3-stage system prompt (+ citation rule)
    prompts/imagine.md      # Gemma 4 prompt that turns an idea card into Grok Imagine prompts
    scripts/vapi-setup.ts   # create/update the Vapi assistant and tools (uses VAPI_PRIVATE_KEY)
    prompts/debate.md       # Gemma 4 debate prompt
    ingest/                 # fetch, tag, embed, load scripts (run locally)
    db/migrations/          # D1 schema
    wrangler.toml / .dev.vars.example
  website/
    app/                    # Next.js pages
    components/Graph3D.tsx  # react-force-graph-3d
    components/VoiceButton.tsx (Vapi Web SDK), StageBar.tsx, IdeaCard.tsx, SourcesPanel.tsx, Transcript.tsx, Visuals.tsx, SignIn.tsx
```

## 10. Today's schedule (PT)

1. **2:40–3:10:** create D1 and Vectorize (done), apply schema, register keys
2. **3:10–3:40:** run the ingest script (NASA T2, NTRS, arXiv), then Gemma tagging and embeddings
3. **3:40–4:20:** MCP server tools (scaffold has 4; add `visualize_idea` and `url` in every result), connect Gemma 4
4. **4:20–5:00:** create the Vapi assistant + tools, point them at `/vapi/tools`, 3-stage prompt (make one test call first; Vapi credit allows lots of testing)
5. **5:00–5:40:** 3D graph UI, highlight wiring, Sources panel with URLs, idea card, Google login + BYOK, `visualize_idea` with Grok Imagine
6. **5:40–6:10:** demo video (under 2 minutes), README, group chat screenshots
7. **6:10–6:30:** MLH submission

**Biggest risk:** Grok Imagine needs xAI API credits (team balance is $0). Without them Clarte is not eligible for the SpaceXAI track. Keep asking staff for an API credit code; the Imagine path stays behind its flag and the demo shows the rest. Second risk: Vapi tool webhook wiring; test one tool call early. Text-chat fallback stays available.

## 11. Demo scenario (about 1 min 30 s)

1. A constellation-like knowledge graph fills the screen. The user says, "My drone battery dies too fast."
2. Clarte asks 5 Whys: "Why do you think it drains so fast?" The conversation narrows the root cause to "thermal management at high temperature."
3. The NASA satellite thermal control patent and NTRS report nodes light up. Clarte asks, "How could you apply this satellite technology?"
4. In the Debate stage Clarte pushes back: "There's already a NASA patent. What's your differentiator?"
5. The user confirms the idea. An idea card appears with 3 evidence documents, each a clickable URL in the Sources panel.
6. Grok Imagine renders a concept image and a system-structure diagram of the idea next to the card, and the final report lists all references with URLs.

## 12. Business plan (startup stage)

> All prices and targets in this section are **examples**. We have not researched market size or revenue figures, so don't present them as facts in the pitch. The only verified numbers are the free-tier limits in Appendix B. Vapi and Grok Imagine prices are not verified here (⚠️ check their pricing pages).

### 12.1 Problem

- Engineers, researchers, and founders re-solve problems someone already solved. Usable technology such as NASA patents, papers, and public software is scattered and hard to find.
- Existing search (Google Scholar, Google Patents) only works if you **already know the keywords**. Solutions written in another field's vocabulary never show up. Example: the answer to drone battery overheating may sit in a "satellite thermal control" patent.
- At the idea stage, people often haven't even figured out what to look for. Before search, they need **a partner that organizes their thinking through questions**.

### 12.2 Solution

- **Voice brainstorming partner:** the user describes the problem out loud, and Clarte asks questions using the Clarity 3-stage logic (5 Whys → Why-How-What → market research and debate) so the user defines the idea themselves.
- **Semantic technology map:** papers and patents are embedded and linked by meaning. Technologies that connect across domains are shown as a 3D graph.
- **Evidence-based pushback:** Gemma 4 uses related patents, papers, and existing products to say "this already exists" or "this part is open."
- One-line positioning: **if 21st.dev is the component hub for designers, Clarte is the paper and patent brainstorming hub for engineers.**

### 12.3 Target customers (in order)

1. **College students, hackathon participants, grad students:** validate ideas and find related research. Acquire as free users and grow by word of mouth.
2. **Early-stage hardware and deep-tech founders:** prior-art checks, avoiding existing patents, finding licensable NASA technology.
3. **Labs and R&D teams:** shared brainstorming and faster literature review.
4. **University tech transfer offices (TTOs) and corporate R&D:** connect owned patents with people who could use them. Needs internal document connectors and an API.

### 12.4 Competition and differentiation

| Category | Examples | How Clarte differs |
|---|---|---|
| Paper search | Google Scholar, Semantic Scholar | conversation and semantic search instead of keywords; covers patents too |
| Patent search | Google Patents, Lens.org | shows cross-domain links as a graph, with an idea-validation conversation on top |
| AI research assistants | general chatbots, paper summarizers | **trains thinking through questions** instead of answering, and every answer carries a source node |
| NASA tech transfer | NASA T2 portal | lets you search the same data alongside papers and patents from other fields |

We did not verify competitors' features today. In the pitch, present these only as "how we see the difference."

### 12.5 Revenue model (example prices)

| Plan | For | Includes | Example price |
|---|---|---|---|
| Free | students, individuals | 10 min of voice per day, public data search, graph view | $0 |
| Pro | individual researchers, founders | generous voice time, saved idea boards, PDF report export | e.g. $15/month |
| Team / Lab | labs, startups | shared workspace, joint brainstorming sessions, team graph | e.g. $30/user/month |
| Enterprise / University | TTOs, corporate R&D | internal document and patent connectors, SSO, dedicated MCP API, usage billing | custom contract |

An additional revenue stream is **usage-based MCP API billing**: other AI agents (Cursor, Claude, Grok, and others) call Clarte's technology map as a tool.

### 12.6 Unit costs (verified values only)

- **Vapi voice:** billed per minute from Vapi credit (platform fee plus transcriber, LLM and voice provider costs; ⚠️ exact rate not checked, read it in the Vapi dashboard). The Free plan's 10 min/day cap exists to contain this cost.
- **Grok Imagine:** flat fee per generated image, video billed per second (⚠️ exact price not checked). Users bring their own xAI key, so this cost sits with the user.
- **Gemma 4 (Gemini API):** currently offered only on the free tier, where data is used to improve Google products. At commercialization, move to a paid LLM or self-hosted Gemma (open weights).
- **Cloudflare:** today's scale (about 700 documents) fits in the free plan. At hundreds of thousands of documents, Workers paid plan and Vectorize usage charges apply.
- **Takeaway:** most cost is voice time, so the core value of paid plans is "longer voice conversations."

### 12.7 Go-to-market

1. **Hackathons and campus:** introduce Clarte as an idea-validation tool at UCSD, SDx, DEVx, and MLH hackathons. Today's demo is the first case.
2. **Content:** short videos and X posts like "how a NASA patent solved my project's problem." The graph view itself is very shareable.
3. **Lab pilots:** run a free Team plan pilot with one or two UCSD labs and collect testimonials.
4. **TTO partnerships:** pitch university TTOs on "we find people who can use your patents."
5. **Public MCP:** developers plugging Clarte into their own AI tools brings organic inflow.

### 12.8 Moat

- **Connection data:** the documents are public, but cross-domain edges and the links users mark as useful become our own data as they accumulate.
- **Conversation logic:** the 3-stage question flow refined in Clarity is an experience plain search tools can't easily copy.
- **Session history:** accumulated idea boards and conversation history make switching costly.

### 12.9 Risks and mitigations

| Risk | Mitigation |
|---|---|
| Data licensing (full-text papers, full patents) | use only official APIs and open data; show summaries and source links, not full text; track with the `license_status` field |
| Some APIs need keys or are blocked (ADS, USPTO ODP, Lens 401; EPO 403) | start today with keyless sources (NASA T2, NTRS, arXiv, Europe PMC, Crossref); apply for keys later |
| AI makes unsupported claims | attach a source node to every answer; say "not found" when there's no evidence |
| Rising voice cost | Free plan time cap, text mode |
| Unsupported or invented links | the agent only cites `url` values returned by tools; Sources panel shows exactly what tools returned |
| Users' xAI keys leaking | AES-GCM encryption in D1, Worker-only decryption, never returned or logged, user can delete |
| Dependence on Gemma 4 free tier | open weights, so we can self-host if needed |

### 12.10 Growth roadmap

| Phase | Scope | Goal (example) |
|---|---|---|
| 0. Today (hackathon) | space tech, about 700 docs, voice demo | working demo and submission |
| 1. Months 1–3 | all engineering and bio, more US patents, sign-up | campus users, feedback |
| 2. Months 3–6 | Pro and Team plans, idea boards, PDF reports | first paying users, lab pilots |
| 3. Months 6–12 | global patents (EPO etc.), public MCP API, university partnerships | first TTO contract |

### 12.11 Key metrics

- Weekly active users, voice minutes per user
- Nodes marked "useful" per session (whether search actually helped)
- Share of sessions using cross-domain links
- Free-to-paid conversion, users per Team plan

### 12.12 Team and asks

- **Founder:** Christian Lee (UCSD). Won 1st place at a UCSD MLH hackathon and is building Clarity, a voice-based thinking project.
- **What we want from the hackathon:** judge feedback, xAI API credits, and introductions to researchers and students who could be early users.

## 13. First prompt for Cursor

> The repo https://github.com/haminxx/Clarte is already scaffolded on `main` (commit `daf3474`); read `readme/PLAN.md` and `readme/setup.md` first and continue from that code rather than starting over. Keep building it based on this document (Clarte Startup Plan and System Design, v3). **The product is now named Clarte**: rename all remaining old-name user-facing branding in the code (UI copy, page titles, README, assistant name "Clarte Coach", package and Worker names to `clarte-*`), but keep the binding and resource names exactly as they are (`DB`, `VECTORS`, `AI`, D1 `paber` and its id, Vectorize `paber-docs`; update the git remote to `haminxx/Clarte`). Deploy the website to Cloudflare Pages at https://clarte.io and the API Worker at https://api.clarte.io (section 6.7), with the Google OAuth callback at `https://clarte.io/auth/callback/google`. Use three folders: `readme/`, `product/`, `website/`. Backend is Cloudflare Workers (TypeScript, free plan only); the database is D1 + Vectorize with the bindings in section 6.5 (`DB`, `VECTORS`, `AI`); embeddings are Workers AI `@cf/baai/bge-base-en-v1.5` (768 dims). **Voice is Vapi, not Grok Voice:** replace any Grok Voice / ephemeral-token code with the Vapi Web SDK (`@vapi-ai/web`, `new Vapi(VAPI_PUBLIC_KEY).start(VAPI_ASSISTANT_ID)`) in the browser and a `POST /vapi/tools` endpoint in the API Worker that handles Vapi `tool-calls` messages and returns `{results:[{toolCallId, result}]}` (result is a JSON string, always HTTP 200, verify the Vapi secret header); add `product/scripts/vapi-setup.ts` that creates the assistant and the 5 Function tools from section 6.3. The reasoning LLM is Gemma 4 via the Gemini API. **Every tool result must carry `url`, `source`, `type`**, store cited sources in the D1 `citations` table, and show them as clickable links in a Sources panel next to the 3D graph and transcript and in the final report (section 5). **Grok Imagine** (`POST https://api.x.ai/v1/images/generations`, server-side only) runs only after the conversation ends and the idea is confirmed, through `visualize_idea`; it is built but off by default and enabled only for users signed in with **Google OAuth (implemented in the Worker with D1, no Supabase)** who connected their own xAI key (BYOK, AES-GCM encrypted in D1, never returned to the browser); see section 6.6. Follow the layers in section 6, the conversation logic in section 5, the data sources in section 7 and Appendix A (official APIs only), and the order in section 10. Read keys only from env vars (Appendix B2). Run ingestion as a local script, not inside a Worker. Next steps: run the real ingest into D1 + Vectorize, wire Gemma 4 into the MCP tools, add the Vapi webhook and setup script, add citations, Google login and BYOK, add `visualize_idea`, deploy the API and MCP Workers and the website, and get one Vapi test call with a working tool call (keep the text-mode fallback).

---

## Appendix A: Data and patent hub (research by Prob & Sol, 2026-10-25 2:45 PM PT)

The full inventory (endpoints, limits, terms, and source links per source) is in [data_sources.md](data_sources.md). This appendix summarizes only what the build needs. **The DB is Cloudflare D1 + Vectorize**, with embeddings of **768 dimensions** (Workers AI `@cf/baai/bge-base-en-v1.5`). Ingest only through official APIs, never scraping. Store `source`, `source_url`, and `license_note` on every record.

### A1. Live check results today

| Status | Sources |
|---|---|
| OK (200) | NASA T2 (patent, software, spinoff), NASA NTRS, arXiv, Europe PMC, PubMed, Crossref, DOAJ, Launch Library 2, CelesTrak, NASA Image Library, NASA NeoWs, Spaceflight News API |
| Key required (401) | NASA ADS, USPTO Open Data Portal, Lens.org, ESA DISCOS |
| Rate-limited (429 etc.) | Semantic Scholar (429), OpenAlex (keyless daily budget used up; resets 5 PM PT), CORE (over limit in a teammate's check; my recheck returned 200, but the keyless limit is 100 tokens/day) |
| Refused (403) | EPO OPS (keyless calls are refused under Fair Use; free OAuth registration required) |
| Unavailable | USPTO PatentsView PatentSearch API (discontinued during the move to ODP, no restart date), WIPO PATENTSCOPE API (paid, and the free web UI forbids automated queries), NASA APOD (500) and DONKI (503) are down today; keep them out of the demo |

### A2. Patent sources summary

| Source | Key | Free limit | Verdict |
|---|---|---|---|
| NASA T2 Patents / Software / Spinoff | none | not stated | **Main source today.** e.g. 361 "space" patents, 132 "thermal" |
| USPTO ODP | USPTO.gov account + ID.me verification | 5M metadata calls/week, 1 concurrent request | expansion phase |
| EPO OPS | free registration + OAuth | 4 GB/week | expansion phase |
| Lens.org | manually approved trial (14 days, non-commercial) | not stated | not recommended |
| Google Patents (BigQuery) | Google Cloud project | BigQuery free tier, 1 TiB queries/month | bulk expansion phase |
| WIPO PATENTSCOPE | paid API (CHF 600–2,000/year) | free web forbids automated queries | excluded |

### A3. Ingest priority (about 3 hours, about 710 docs, 70%+ patents)

Shared seeds: thermal control, battery, propulsion, composite materials, sensors, robotics, communications, life support, imaging, power systems, cryogenics, water purification.

1. NASA T2 Patents, about 300 (dedupe by case number; strip highlight tags from titles and abstracts)
2. NASA T2 Spinoff, about 100
3. NASA T2 Software, about 80
4. NASA NTRS, about 150 (`distribution=PUBLIC` only; "thermal control" alone returns 5,987)
5. arXiv, about 80 (astro-ph.IM, physics.space-ph; at most 1 request every 3 seconds)
6. Launch Library 2 and CelesTrak: fetch once for demo context and cache (LL2 allows 15 calls/hour; CelesTrak blocks IPs on repeated downloads)
7. If time allows: 50 from Europe PMC and PubMed (a "space tech → bio" example), and enrich DOIs via Crossref

### A4. Extra data keys (build-critical keys are in section 8 and Appendix B)

- **Nice to get today (free, instant):** `NASA_API_KEY` (api.nasa.gov), `OPENALEX_API_KEY` (email verification), `ADS_API_TOKEN` (ADS account settings), `NCBI_API_KEY` (NCBI account)
- **Later (approval or identity verification needed):** `CORE_API_KEY`, `S2_API_KEY`, EPO OPS key/secret, `USPTO_ODP_API_KEY` (ID.me), Lens token, Google Cloud (BigQuery)

## Appendix B: Platforms, API keys, free-tier limits (research by Web 해결사, 2026-10-25 2:40 PM PT)

**Legend:** ✅ = confirmed in official docs today; ⚠️ = not confirmed, re-check before relying on it. No sign-ups or keys were created during this research. (Data hubs and patents are in Appendix A.)

**DB decision:** Christian chose Cloudflare D1 + Vectorize at 2:41 PM PT. Resources: D1 `paber` (binding `DB`) and Vectorize `paber-docs` (768 dims, cosine, binding `VECTORS`); embeddings use Workers AI `@cf/baai/bge-base-en-v1.5` (768 dims). Bindings and IDs are in the `wrangler.toml` block in section 6.5. Supabase is revisited only when user accounts and team features are needed.

### B1. Platforms

| Platform | Role in Clarte | Free-tier limits that matter | Where to create the key | Env var(s) | Cost |
|---|---|---|---|---|---|
| **Vapi** (voice agent) | Hosted voice agent: transcription, dialogue LLM, speech, and tool calling for the 3-stage brainstorm. Browser connects with the Web SDK; tools call the Worker. | Uses Christian's existing Vapi credit ($100). Web SDK `@vapi-ai/web` with the **public key**; private key for server/setup only. Tool calls arrive as `tool-calls` webhooks; respond with `results[]` (string `result` or `error`, HTTP 200). ⚠️ Per-minute price not checked here. | https://dashboard.vapi.ai (API Keys, Assistants, Tools) | `VAPI_PUBLIC_KEY`, `VAPI_PRIVATE_KEY`, `VAPI_ASSISTANT_ID`, `VAPI_SERVER_SECRET` | **Paid from existing credit** (no new purchase) |
| **xAI API (Grok Imagine)** | Final idea visuals: concept image, system-structure diagram, paper-style figure (optional short video). Satisfies the SpaceXAI "Grok Imagine or Grok Voice" rule. | ✅ Image: `POST https://api.x.ai/v1/images/generations` (OpenAI-compatible; models `grok-imagine-image` family, docs currently show `grok-imagine-image-2.0`), up to 10 images per request, flat per-image fee. ✅ Video: `POST /v1/videos/generations`, async, poll `GET /v1/videos/{request_id}` (`grok-imagine-video-1.5`). Needs API credits; team balance is $0 today. Server-side only. | https://console.x.ai (API Keys; billing → Redeem promo code) | `XAI_API_KEY` (dev), per-user BYOK keys in D1 | **Paid** (blocked until API credits are redeemed) |
| **Google OAuth** (Cloud project "PABER") | Sign-in with Google, required to enable Imagine BYOK. | OAuth client creation is free. | https://console.cloud.google.com/apis/credentials | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Free |
| **Google AI Studio (Gemini API → Gemma 4)** | LLM behind the tools: summarize, tag, write debate counter-evidence. Satisfies **Best Use of Gemma 4**. | ✅ Gemma 4 input, output and caching are **"Free of charge" on the Free Tier**; a **Paid Tier is "Not available"**. ✅ Free-tier data is "used to improve our products". ⚠️ Per-model RPM/RPD is shown only in AI Studio's rate-limit view; check it and add backoff/retry. Model IDs: `gemma-4-26b-a4b-it`, `gemma-4-31b-it`. | https://aistudio.google.com/apikey | `GEMINI_API_KEY`, `GEMMA_MODEL` | **Free** |
| **Cloudflare Workers** | MCP server, Vapi tool webhook, Google OAuth, Imagine calls, API. | ✅ Free plan: **100,000 requests/day**, **10 ms CPU per request**, 128 MB memory, **50 subrequests per request**, 5 cron triggers, 100 Workers. | https://dash.cloudflare.com/profile/api-tokens (token); account ID is on the dashboard sidebar | `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN` | Free |
| **Cloudflare Pages** | Hosts the `website/` UI (3D graph, mic button) at https://clarte.io (custom domain). | ✅ Free: **500 builds/month**, 1 concurrent build, 20-minute build timeout. | Same account (GitHub connect needs the user's own login) | n/a | Free |
| **Cloudflare D1** (SQLite) | Document/node metadata, summaries, tags, graph edges. | ✅ Free: **500 MB per DB**, 10 DBs, 5 GB total. **5M rows read/day**, **100k rows written/day**. 50 queries per Worker invocation. 7-day Time Travel. Resets 00:00 UTC (5 PM PT). | `wrangler d1 create` (done: `paber`) | binding `DB` | Free |
| **Cloudflare Vectorize** | Embeddings for semantic search and similarity edges. | ✅ Free: **5M stored vector dimensions** and **30M queried dimensions/month**. 100 indexes, max 1536 dims, 10 KiB metadata per vector. ⚠️ V2 topK limit not checked. At 768 dims that's about **6,500 vectors** free. | `wrangler vectorize create` (done: `paber-docs`) | binding `VECTORS` | Free |
| **Cloudflare Workers AI** | Embeddings inside Cloudflare (open-weight BGE models, which help the Open-Source AI prize). | ✅ **10,000 Neurons/day free**. `bge-base-en-v1.5` costs about 6k neurons per 1M tokens, so about 1.6M tokens/day, plenty for 500–1,000 abstracts. | Same account | binding `AI` | Free |
| **Supabase** (Postgres + pgvector) | Not used in the hackathon build; future option. | ✅ Free: **500 MB DB per project**, **2 active projects**, 5 GB egress, 1 GB storage, 50k MAU, no backups. **Pauses after 1 week of inactivity.** | https://supabase.com/dashboard | (none today) | Free |
| **GitHub** | Repo `haminxx/Clarte`, MIT license for the Open-Source prize, Pages Git deploys. | Public repos are free. ⚠️ Limits not checked. | https://github.com/settings/tokens (only if CI needs a token) | `GITHUB_TOKEN` (optional) | Free |
| **Cursor** | Required build tool ("the more you use Cursor, the better"). Prize is 6 months of Cursor Pro+. | ⚠️ Plan limits not checked. Use the team's existing plan. | https://cursor.com | n/a | Existing plan |

### B2. `.dev.vars` / `.env` template (names only)

```env
# Vapi – voice agent (public key + assistant id go to the browser; private key and secret stay server-side)
VAPI_PUBLIC_KEY=
VAPI_ASSISTANT_ID=
VAPI_PRIVATE_KEY=
VAPI_SERVER_SECRET=

# xAI – Grok Imagine (server only; dev/test key, users bring their own key via BYOK)
XAI_API_KEY=
IMAGINE_ENABLED=false

# Google OAuth login (Cloud project "PABER") + session and BYOK encryption
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=https://clarte.io/auth/callback/google
SESSION_SECRET=
KEY_ENCRYPTION_KEY=

# Google AI Studio – Gemma 4 via Gemini API
GEMINI_API_KEY=
GEMMA_MODEL=gemma-4-26b-a4b-it

# Public URLs
APP_URL=https://clarte.io
API_URL=https://api.clarte.io

# Cloudflare (wrangler deploys, D1, Vectorize, Workers AI)
CLOUDFLARE_ACCOUNT_ID=
CLOUDFLARE_API_TOKEN=

# Optional data keys
NASA_API_KEY=
OPENALEX_API_KEY=
```

### B3. Why Cloudflare D1 + Vectorize (not Supabase)

- **One platform, one deploy.** The MCP server and the Vapi tool-webhook Workers reach D1, Vectorize and Workers AI through **bindings**: no extra client, no extra keys, no network hop.
- **Free limits fit the scope.** About 700 nodes at 768 dims stays well under Vectorize's 5M stored dimensions, and D1's 500 MB is far more than the metadata needs.
- **No documented pause risk.** Supabase free projects pause after a week idle, which could break a demo link judges open later.
- **Open-weight embeddings** (`bge-base-en-v1.5`, 768 dims) match the index and strengthen the Open-Source AI story.

### B4. Do we need AWS? (No, not today.)

- **Real gap: bulk ingestion.** Free Workers get **10 ms CPU** and **50 subrequests per request**, so fetching from NTRS, NASA T2, arXiv and Europe PMC and then calling Gemma 4 and embeddings per document cannot run in one free Worker invocation.
  - **Free fix (recommended):** run ingestion **once as a local Node script**. Write rows with `wrangler d1 execute` or the D1 HTTP API, and upload vectors with `wrangler vectorize insert` (NDJSON).
- **Embedding volume:** not a gap at this scale. Workers AI's free quota resets at 00:00 UTC (5 PM PT).
- **Gemma 4 rate limits:** possible bottleneck (⚠️ unverified). Batch requests and cache summaries in D1 during ingestion.
- **Only if a hosted long-running job is truly needed:** one AWS Lambda (15-minute max, covered by the $10k credits), triggered once for ingestion.
