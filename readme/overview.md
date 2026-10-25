# Overview

## One line

Clarte is a technology library for engineers and researchers, plus a voice brainstorming partner that
trains how they think.

## The problem

Technical knowledge sits in separate silos — NASA reports, patent databases, arXiv, PubMed — and
almost every tool returns a keyword list. Two things follow from that:

1. **Search only works if you already know the words.** A drone battery that overheats is answered by
   a satellite *thermal control* patent, but nobody searching "drone battery" types that.
2. **At the idea stage you don't yet know what to look for.** Before search, you need something that
   organizes your thinking by asking questions.

Elicit, Consensus, Connected Papers, and ResearchRabbit find and summarize papers, or link them by
citation. They do not argue with you, and they do not put patents, NASA technology, and papers in one
semantic space.

## What Clarte does differently

- **It does not hand out answers.** It asks questions until you can state your own root problem.
- **It connects across domains.** Documents are embedded and linked by meaning, so satellite thermal
  control shows up next to battery cooling.
- **It pushes back with evidence.** Gemma 4 turns retrieved patents and papers into concrete
  objections, and every objection names a real document with a URL.
- **It draws the idea only at the end.** After you confirm the idea card, Grok Imagine renders a
  concept image, a system-structure diagram, and a paper-style figure. That step stays off until you
  are signed in with Google and have connected your own xAI key.

Voice is Vapi. Gemma 4 is the reasoning model behind the tools. Grok Imagine is the image API, used
only for that final visualization.

## The conversation

The flow lives in [`product/prompts/coach.md`](../product/prompts/coach.md) and is pasted into the
Vapi assistant system prompt. The stage is also server state (`five_whys`, `why_how_what`, `debate`,
`visualize`) so the UI can show it. The coach asks one question at a time.

### 1. Five Whys — find the root problem

The coach asks "why" up to five times and does not propose solutions. When a root-cause keyword
appears it calls `search_tech`, so the graph starts highlighting early. The stage ends when you state
the root cause in one sentence.

### 2. Why, How, What — structure the idea

Why it matters and who is hurting, how it will be solved, what will be built. `find_related` brings
in technology from another domain, and the coach asks how you would apply it.

### 3. Market research and debate — defend it

`market_evidence` retrieves patents and papers. Gemma 4 writes the opposing argument. The coach
pushes back — for example, that a NASA patent already covers the mechanism — and you defend the
difference. The stage ends with an idea card: problem, root cause, solution, three evidence
documents, and the remaining risks.

### 4. Visualize — Grok Imagine, after you confirm

This runs only after the voice conversation has produced an idea card **and** you confirm it. Nothing
in stages 1–3 calls Imagine. The "Visualize" button (or the `visualize_idea` tool) is enabled only
when both of these are true:

- you are signed in with Google
- an xAI API key is stored for your account, encrypted in D1, and never sent back to the browser

Otherwise the idea card says to sign in and connect an xAI key. When the step runs, Gemma 4 turns the
card into image prompts and the API Worker calls Grok Imagine. The images sit on the card next to the
cited sources.

## Sources

Whenever the coach mentions a paper, patent, or report, it says the title and source out loud, and
the UI shows the same item as a clickable URL. Tool results carry `url`, `source`, and `type`, so the
coach does not invent links. The Sources panel lists each citation; the final report repeats them as
a numbered reference list.

## Who it's for

1. University researchers and grad students validating an idea.
2. Deep-tech founders and engineers doing prior-art checks and looking for licensable technology.
3. Hackathon participants and students who need to think an idea through fast.

## Today's library

About 700 documents of space technology, pulled from official APIs only:

| Source | Type | Why it's here |
|---|---|---|
| NASA T2 patents | `patent` | Licensable NASA technology — the strongest "this already exists" evidence |
| NASA T2 spinoffs | `spinoff` | Space technology already applied on Earth, which is the cross-domain story |
| NASA T2 software | `software` | Public NASA software you can actually use |
| NASA NTRS | `report` | Technical reports behind the patents |
| arXiv (astro-ph.IM, physics.space-ph) | `paper` | Current space instrumentation and physics research |
| Europe PMC | `paper` | The optional "space tech meets biology" slice |

The vision is every field. Space is the starting library because it is the hackathon theme, and
because NASA publishes unusually good, openly licensed technology metadata.

Quotas, source status, and later patent hubs are in [PLAN.md](PLAN.md) section 7 and Appendix A.
The startup-stage business sketch in PLAN.md section 12 uses example prices and targets. Those
figures were not researched; the pitch should not treat them as facts.
