/**
 * Gemma 4 (`gemma-4-26b-a4b-it` via the Gemini API) is PABER's reasoning layer —
 * plan section 6.2. It summarises and tags documents at ingest time and writes the
 * debate objections and link reasons at run time. Grok Voice never calls it
 * directly: Grok calls a tool, the tool calls Gemma.
 *
 * fetch-only, so the same file runs on Workers and on Node (ingest).
 * With no GEMINI_API_KEY every call degrades to an empty string and callers fall
 * back to deterministic local text, so the pipeline still runs end to end.
 */

const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta";

export interface GemmaConfig {
  apiKey: string | undefined;
  model: string;
}

export function gemmaConfig(env: { GEMINI_API_KEY?: string; GEMMA_MODEL?: string }): GemmaConfig {
  return {
    apiKey: env.GEMINI_API_KEY || undefined,
    model: env.GEMMA_MODEL || "gemma-4-26b-a4b-it",
  };
}

export function hasGemma(config: GemmaConfig): boolean {
  return Boolean(config.apiKey);
}

/**
 * Gemma models on the Gemini API take no separate system instruction, so the
 * instruction block is prepended to the user turn.
 */
export async function gemmaText(
  config: GemmaConfig,
  {
    instruction,
    input,
    maxOutputTokens = 1024,
    temperature = 0.4,
  }: { instruction: string; input: string; maxOutputTokens?: number; temperature?: number },
): Promise<string> {
  if (!config.apiKey) return "";

  const response = await fetch(`${GEMINI_BASE}/models/${config.model}:generateContent`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-goog-api-key": config.apiKey },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: `${instruction}\n\n---\n\n${input}` }] }],
      generationConfig: { temperature, maxOutputTokens },
    }),
  });

  if (!response.ok) {
    throw new Error(`Gemma ${config.model} failed: ${response.status} ${await response.text()}`);
  }

  const data = (await response.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };

  return (data.candidates?.[0]?.content?.parts ?? [])
    .map((part) => part.text ?? "")
    .join("")
    .trim();
}

/** Same call, coerced into JSON. Returns null when the reply cannot be parsed. */
export async function gemmaJson<T>(
  config: GemmaConfig,
  args: { instruction: string; input: string; maxOutputTokens?: number },
): Promise<T | null> {
  const raw = await gemmaText(config, {
    ...args,
    instruction: `${args.instruction}\n\nReply with JSON only. No prose, no code fences.`,
    temperature: 0.2,
  });
  if (!raw) return null;
  return parseLooseJson<T>(raw);
}

export function parseLooseJson<T>(raw: string): T | null {
  const unfenced = raw.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  const start = unfenced.search(/[[{]/);
  if (start === -1) return null;
  const end = Math.max(unfenced.lastIndexOf("}"), unfenced.lastIndexOf("]"));
  if (end <= start) return null;
  try {
    return JSON.parse(unfenced.slice(start, end + 1)) as T;
  } catch {
    return null;
  }
}
