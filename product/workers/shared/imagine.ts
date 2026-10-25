import imaginePrompt from "../../prompts/imagine.md";
import type { Env } from "./env";
import { gemmaConfig, gemmaJson, hasGemma } from "./gemma";
import type { IdeaCard, VisualView } from "./types";

/** Grok Imagine image model. Video is not called; see `videoStub`. */
export const IMAGINE_MODEL = "grok-imagine-image-2.0";

const IMAGINE_URL = "https://api.x.ai/v1/images/generations";

export const IMAGE_KINDS = ["concept", "system_diagram", "paper_figure"] as const;

export type ImageKind = (typeof IMAGE_KINDS)[number];

export function parseVisualKinds(value: unknown): { images: ImageKind[]; video: boolean } {
  const raw = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(/[,\s]+/)
      : [];
  const images: ImageKind[] = [];
  let video = false;
  for (const item of raw) {
    const kind = String(item);
    if (kind === "video") video = true;
    else if ((IMAGE_KINDS as readonly string[]).includes(kind) && !images.includes(kind as ImageKind)) {
      images.push(kind as ImageKind);
    }
  }
  if (!images.length && !video) return { images: [...IMAGE_KINDS], video: false };
  return { images, video };
}

function fallbackPrompt(kind: ImageKind, card: IdeaCard): string {
  const subject = [card.solution, card.problem, card.rootCause].filter(Boolean).join(". ").slice(0, 800);
  switch (kind) {
    case "concept":
      return `Product concept render of this engineering idea, neutral studio background, no text, no logos, no faces: ${subject}`;
    case "system_diagram":
      return `Clean technical system diagram on a white background, labelled blocks and arrows for energy and data flow, no photorealism: ${subject}`;
    case "paper_figure":
      return `Black-and-white journal schematic with numbered labels, academic figure style: ${subject}`;
  }
}

/** Gemma writes one prompt per requested kind. Falls back to the idea card text with no key. */
export async function imaginePrompts(
  env: Env,
  card: IdeaCard,
  kinds: ImageKind[],
): Promise<{ kind: ImageKind; prompt: string }[]> {
  const fallback = kinds.map((kind) => ({ kind, prompt: fallbackPrompt(kind, card) }));
  const config = gemmaConfig(env);
  if (!hasGemma(config) || !kinds.length) return fallback;

  try {
    const parsed = await gemmaJson<{ prompts?: { kind?: string; prompt?: string }[] }>(config, {
      instruction: imaginePrompt,
      input: `KINDS: ${kinds.join(", ")}\nIDEA CARD:\n${JSON.stringify({
        problem: card.problem,
        rootCause: card.rootCause,
        solution: card.solution,
        risk: card.risk,
      })}`,
      maxOutputTokens: 900,
    });
    const prompts = parsed?.prompts ?? [];
    return kinds.map((kind) => {
      const found = prompts.find((item) => item.kind === kind && item.prompt?.trim());
      return { kind, prompt: (found?.prompt ?? fallbackPrompt(kind, card)).slice(0, 2000) };
    });
  } catch (error) {
    console.warn("Imagine prompt fallback", {
      error: error instanceof Error ? error.message.slice(0, 180) : "failed",
    });
    return fallback;
  }
}

/**
 * Server-side Grok Imagine. Callers must pass the user's decrypted key.
 * The key is not logged. Response URLs are temporary; we store them as returned.
 */
export async function generateImage(apiKey: string, prompt: string): Promise<string> {
  const response = await fetch(IMAGINE_URL, {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: IMAGINE_MODEL,
      prompt,
      n: 1,
      response_format: "url",
    }),
  });
  if (!response.ok) {
    throw new Error(`Grok Imagine failed (${response.status})`);
  }
  const data = (await response.json()) as { data?: { url?: string | null }[] };
  const url = data.data?.find((item) => item.url)?.url;
  if (!url) throw new Error("Grok Imagine returned no image url");
  return url;
}

export function videoStub(): VisualView {
  return {
    id: crypto.randomUUID(),
    kind: "video",
    prompt: "Video generation is a stub in this build and was not sent to xAI.",
    imageUrl: null,
    model: "stub",
  };
}
