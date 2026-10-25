# Demo script (about 90 seconds)

## Before you start

- API Worker is up. Library is loaded in D1 `paber` and Vectorize `paber-docs`.
- `GEMINI_API_KEY` is set if you want Gemma 4 to write the objections. **[needs key]**
- Voice: Vapi public key and assistant id in `website/.env.local`, server secret on the Worker, and credit on the Vapi account. **[needs key]**
- Imagine: sign in with Google on the demo machine and connect an xAI key in settings before you record, with `IMAGINE_ENABLED=true`. Imagine runs only after the idea is confirmed. **[needs key]**
- Website full screen, graph loaded, node count visible. Headphones on, so the microphone does not hear the speaker.
- Have a NASA satellite thermal-control patent in the library (the drone-battery story lands on it). `nasa_t2:GSC-TOPS-40`, "CubeSat Form Factor Thermal Control Louvers", is the one this script names when it is in the index.

## The run

**0:00 — The constellation.** Full-screen graph, slowly rotating, roughly 700 dim nodes. Say:
"Every node here is a real paper, patent, or NASA technology. Watch what happens when I describe a problem."

**0:10 — Stage 1, Five Whys.** Tap the mic. Say: *"My drone battery dies way too fast."*
Clarte asks why, and keeps asking. Answer for three or four turns until the conversation reaches heat.
The stage pill stays on **5 Whys**. The coach is still asking, not pitching a design.

**0:35 — The root cause.** Clarte says the root cause back: thermal management at high temperature.
It has already called `search_tech`, so nodes light up before it reads a title. The Sources panel
gains a row with a clickable URL.

**0:45 — Stage 2, Why-How-What.** The pill moves to **Why · How · What**. Clarte asks why it matters
and how you would solve it, calls `find_related` with `cross_domain`, and the NASA CubeSat thermal
louvre patent and an NTRS thermal-control report light up. It asks: *"How could you apply this
satellite technology to your pack?"* Answer with something concrete, such as passive louvres over the
cell stack.

**1:05 — Stage 3, Debate.** The pill moves to **Debate**. Clarte calls `market_evidence`. Gemma 4
turns the retrieved patents into objections and pushes: *"There is already a NASA patent on
deployable thermal louvres. What is your edge?"* Defend it once. Clarte concedes that point and
names the next objection, with the source URL on screen.

**1:20 — Confirm the idea.** An idea card appears: problem, root cause, solution, three evidence
documents, each a clickable URL in the Sources panel. Confirm the card out loud.

**1:30 — Visualize.** Because you are signed in and an xAI key is connected, Grok Imagine renders a
concept image and a system-structure diagram next to the card. Close on the reference list:
"Every claim on that card is a real document with a URL, and the whole library is one MCP server."

## Lines worth saying out loud

- "21st.dev is a library of components for designers. This is a library of papers and patents for engineers."
- "It asked me to find the answer, then it argued with me about it."
- "The objections come from Gemma 4 reading real NASA patents, and each one is a link."
- "Vapi is the voice. Grok Imagine draws the idea only after I confirm it."

## If voice is unavailable

Text mode uses the same tools. Type under the mic:

1. Type the problem. `search_tech` runs, nodes light up, and the Sources panel fills in.
2. Click the stage pill to move through the three stages. The pill is clickable so the presenter is not waiting on the coach.
3. In Debate, the same box feeds `market_evidence`, so the cited objections still appear.
4. Build the idea card and confirm it.

That path does not need a Vapi key. Gemma's objections need `GEMINI_API_KEY`; retrieval still returns the documents when that key is empty.

## If Imagine is unavailable

The idea card and its source URLs are the close. Imagine stays off until Google sign-in, an encrypted
user xAI key, and `IMAGINE_ENABLED=true` are all in place, and the xAI key has API credits. The card
then reads that you need to sign in and connect an xAI key, or the visualize call returns
`disabled`, `sign_in_required`, or `key_required`. Say that the image step is built and gated, and
end on the references.

Plan section 12's prices are examples. Leave them out of the demo.

## Recording checklist

- Under 2 minutes.
- Show the stage pill moving, at least one node lighting up, and one source URL on screen.
- Show the idea card and the reference list.
- Show the Grok Imagine image after you confirm the idea, or the sign-in gate if the key or credits are not on the account.
- Mention Cursor, Vapi, Gemma 4, and Grok Imagine once each.
