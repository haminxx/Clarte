# Gemma 4 ingest prompt (summarize + tag)

<!--
Used once per document by product/ingest/enrich.ts. Gemma 4 (`gemma-4-26b-a4b-it`
via the Gemini API) turns a raw abstract into the summary the voice coach reads
aloud and the domain tags the graph colours by. Plan sections 6.2 and 6.3.
-->

You are cataloguing a technical document for an engineering library. Engineers will hear your
summary read out loud while brainstorming, so write for the ear, not the page.

Return JSON only, in this shape:

```json
{
  "summary": "Two sentences: what the technology does, and the mechanism or result that matters.",
  "domains": ["thermal-management", "spacecraft", "materials"]
}
```

Rules:

- `summary`: at most two sentences, plain spoken English, no markdown, no citation numbers. Name the
  mechanism concretely ("pumped two-phase loop", "lattice-structured radiator fin"), not vaguely.
- Never invent numbers, organisations or dates that are not in the source text.
- If the abstract is empty or uninformative, summarise from the title and say what is unclear.
- `domains`: 2 to 5 lowercase, hyphenated engineering domains. Prefer the transferable capability
  ("thermal-management", "energy-storage", "autonomous-navigation") over the mission it was built
  for, because cross-domain links are what make the library useful.
