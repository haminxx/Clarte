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
   organises your thinking by asking questions.

Elicit, Consensus, Connected Papers and ResearchRabbit find and summarise papers, or link them by
citation. None of them argue with you, and none of them put patents, NASA technology and papers in one
semantic space.

## What Clarte does differently

- **It does not hand out answers.** It asks questions until you can state your own root problem.
- **It connects across domains.** Documents are embedded and linked by meaning, so satellite thermal
  control shows up next to battery cooling.
- **It pushes back with evidence.** Gemma 4 turns retrieved patents and papers into concrete
  objections: "there is already a NASA patent on this — what is your edge?"

## The three stages

The flow lives in [`product/prompts/coach.md`](../product/prompts/coach.md) and the stage is also
tracked as server state so the UI can show it.

### 1. Five Whys — find the root problem

The coach asks "why" up to five times, one question per turn, and refuses to propose solutions. When a
root-cause keyword appears it quietly calls `search_tech` so the graph starts pre-highlighting. The
stage ends when the user states a root cause as a problem, not as a missing feature.

### 2. Why, How, What — structure the idea

Why it matters, how they would solve it, what they would build — one at a time. Each answer triggers
`search_tech`, and the best hit is expanded with `find_related` using `cross_domain`, so technology
from another field appears. Then the coach asks the question that makes the demo: "how could you apply
this to your problem?"

### 3. Market research and debate — defend it

`market_evidence` retrieves the closest prior art and Gemma 4 writes three cited objections. The coach
argues the side the user is not on, one objection per turn, conceding specific points when they are
answered. The session ends with an idea card: problem, root cause, solution, three evidence documents,
and the biggest open risk.

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
| NASA T2 software | `software` | Open-source NASA code you can actually use |
| NASA NTRS | `report` | Technical reports behind the patents |
| arXiv (astro-ph.IM, physics.space-ph) | `paper` | Current space instrumentation and physics research |
| Europe PMC | `paper` | The optional "space tech meets biology" slice |

The vision is every field. Space is the starting library because it is the hackathon theme, and
because NASA publishes unusually good, openly licensed technology metadata.
