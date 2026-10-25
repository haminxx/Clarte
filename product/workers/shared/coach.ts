import {
  appendTranscript,
  ensureSession,
  getCitations,
  getSession,
  recordCitations,
  recordMentions,
  setIdeaCard,
  setRootCause,
  setStage,
} from "./db";
import type { Env } from "./env";
import { draftIdeaCard, runTool, type ToolResult } from "./tools";
import type { CitationView, IdeaCard, Stage, TechDocument, TranscriptTurn } from "./types";
import { sourceLabel } from "./types";

/**
 * One text-mode coach turn. No Vapi and no API keys required: search falls back
 * to D1 LIKE, and the stage machine still asks one question at a time.
 * Gemma runs only inside the tools, when GEMINI_API_KEY is set.
 */
export interface CoachTurn {
  reply: string;
  stage: Stage;
  citations: CitationView[];
  highlight: string[];
}

const CONFIRM =
  /\b(yes|yeah|yep|yup|correct|right|exactly|confirm|that(?:'s| is) (?:it|right)|sounds right|looks good)\b/i;
const VISUAL = /\b(visuali[sz]e|draw (?:it|this)|render|make (?:an|the) image)\b/i;

function clip(value: string, max = 220): string {
  const trimmed = value.replace(/\s+/g, " ").trim();
  return trimmed.length <= max ? trimmed : `${trimmed.slice(0, max - 1).trim()}…`;
}

function previousUserText(history: TranscriptTurn[], current: string): string {
  const users = history.filter((turn) => turn.role === "user");
  return users.length >= 2 ? users[users.length - 2].text : current;
}

export async function coachTurn(
  env: Env,
  sessionId: string,
  message: string,
  userId: string | null,
): Promise<CoachTurn> {
  const text = message.trim().slice(0, 4000);
  await ensureSession(env, sessionId);
  const before = await getSession(env, sessionId);
  const citedStage: Stage = before?.stage ?? "five_whys";
  let stage = citedStage;
  const history = await appendTranscript(env, sessionId, { role: "user", text, stage: citedStage });
  const turnsHere = history.filter((turn) => turn.role === "user" && turn.stage === citedStage).length;

  const collected: TechDocument[] = [];
  const seen = new Set<string>();
  const collect = (result: ToolResult) => {
    for (const document of result.documents) {
      if (!document.id || seen.has(document.id)) continue;
      seen.add(document.id);
      collected.push(document);
    }
  };

  let reply = "";

  const wantsImages = VISUAL.test(text) || (citedStage === "visualize" && CONFIRM.test(text));
  if (wantsImages && (citedStage === "visualize" || citedStage === "debate")) {
    stage = "visualize";
    if (citedStage !== "visualize") await setStage(env, sessionId, stage);
    const prior = await getCitations(env, sessionId).catch(() => []);
    await ensureIdea(
      env,
      sessionId,
      history,
      prior.map((citation) => citation.docId),
    );
    const result = await runTool(
      env,
      "visualize_idea",
      { session_id: sessionId },
      { sessionId, userId, userSource: "request" },
    );
    reply = result.speakError ?? "The images are on the idea card. Want to change anything about the idea?";
    collect(result);
  } else if (citedStage === "visualize") {
    reply = "Say visualize when you want images of the confirmed idea, or tell me what to change.";
  } else if (citedStage === "five_whys") {
    collect(await runTool(env, "search_tech", { query: text, limit: 4 }));
    const ready = turnsHere >= 4 || (turnsHere >= 3 && CONFIRM.test(text));
    if (ready) {
      const rootCause = clip(CONFIRM.test(text) ? previousUserText(history, text) : text);
      stage = "why_how_what";
      await setRootCause(env, sessionId, rootCause);
      await setStage(env, sessionId, stage);
      reply = `The root cause is ${rootCause.replace(/[.?!]+$/g, "")}. Why does that matter, and who is hurting?`;
    } else if (turnsHere <= 1) {
      reply = "Why do you think that happens?";
    } else {
      reply = "Why is that the part that actually fails?";
    }
  } else if (citedStage === "why_how_what") {
    const found = await runTool(env, "search_tech", { query: text, limit: 4 });
    collect(found);
    const top = found.documents[0];
    if (turnsHere >= 4 || (turnsHere >= 3 && CONFIRM.test(text))) {
      stage = "debate";
      await setStage(env, sessionId, stage);
      const evidence = await runTool(env, "market_evidence", { idea: text, limit: 6 });
      collect(evidence);
      reply = objectionQuestion(evidence, 0);
    } else if (turnsHere === 2 && top) {
      const related = await runTool(env, "find_related", { id: top.id, cross_domain: true, limit: 3 });
      collect(related);
      const other = related.documents.find((document) => document.id !== top.id);
      const picked = other ?? top;
      reply = `${sourceLabel(picked.source)} has "${picked.title}". How could you apply that?`;
    } else if (turnsHere === 1) {
      reply = "How would you solve that?";
    } else if (top) {
      reply = `${sourceLabel(top.source)} has "${top.title}". What would you actually build?`;
    } else {
      reply = "What would you actually build?";
    }
  } else {
    const evidence = await runTool(env, "market_evidence", { idea: text, limit: 6 });
    collect(evidence);
    if (CONFIRM.test(text) || turnsHere >= 3) {
      stage = "visualize";
      await setStage(env, sessionId, stage);
      const card = await ensureIdea(env, sessionId, history, [...seen]);
      reply = `The idea: ${clip(card.solution || card.problem)} The open risk is ${clip(card.risk)} Say visualize when you want images, or tell me what to change.`;
    } else {
      reply = objectionQuestion(evidence, turnsHere - 1);
    }
  }

  const highlight = collected.map((document) => document.id);
  await recordMentions(env, sessionId, highlight).catch((error) =>
    console.warn("recordMentions failed", { error: String(error).slice(0, 180) }),
  );
  await recordCitations(env, sessionId, collected, citedStage).catch((error) =>
    console.warn("recordCitations failed", { error: String(error).slice(0, 180) }),
  );
  await appendTranscript(env, sessionId, { role: "clarte", text: reply, stage });
  const citations = await getCitations(env, sessionId).catch(() => []);
  return { reply, stage, citations, highlight };
}

function objectionQuestion(result: ToolResult, index: number): string {
  const objections = (result.data.objections as { question?: string }[] | undefined) ?? [];
  const question = objections[Math.max(0, Math.min(index, objections.length - 1))]?.question;
  return question || "What can you do that the closest existing work cannot?";
}

async function ensureIdea(
  env: Env,
  sessionId: string,
  history: TranscriptTurn[],
  evidenceIds: string[],
): Promise<IdeaCard> {
  const existing = await getSession(env, sessionId);
  if (existing?.idea) return existing.idea;
  const usable = history.filter((turn) => turn.role !== "user" || (!VISUAL.test(turn.text) && !CONFIRM.test(turn.text)));
  const card = await draftIdeaCard(env, {
    transcript: usable.map((turn) => ({ role: turn.role, text: turn.text })),
    evidenceIds: evidenceIds.slice(0, 3),
  });
  if (existing?.rootCause) card.rootCause = existing.rootCause;
  const lastUser = [...usable].reverse().find((turn) => turn.role === "user");
  if (lastUser && (card.solution.endsWith("?") || card.solution === lastUser.text)) {
    card.solution = lastUser.text;
  }
  await setIdeaCard(env, sessionId, card);
  return card;
}
