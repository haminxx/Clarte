/**
 * Create or update the Vapi assistant "Clarte Coach" and its five Function tools.
 *
 *   cd product
 *   # VAPI_PRIVATE_KEY in the environment, product/.dev.vars, or ../.env
 *   npm run vapi:setup
 *   npm run vapi:setup -- --server-url https://clarte-api.<subdomain>.workers.dev
 *
 * The tool server URL is API_URL/vapi/tools, else the clarte-api workers.dev host.
 * VAPI_SERVER_SECRET is sent as the x-vapi-secret header. The private key is never printed.
 */
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { TOOL_DEFINITIONS } from "../workers/shared/tools-spec";

const VAPI = "https://api.vapi.ai";
const ASSISTANT_NAME = "Clarte Coach";
const FIRST_MESSAGE = "I'm Clarte. Tell me the problem you're stuck on, in one sentence.";

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

async function loadEnvFile(path: URL): Promise<void> {
  let text = "";
  try {
    text = await readFile(path, "utf8");
  } catch {
    return;
  }
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

async function vapi(path: string, init?: RequestInit): Promise<unknown> {
  const key = process.env.VAPI_PRIVATE_KEY;
  if (!key) throw new Error("VAPI_PRIVATE_KEY is not set");
  const response = await fetch(`${VAPI}${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${key}`,
      "content-type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Vapi ${init?.method ?? "GET"} ${path} failed: ${response.status} ${text.slice(0, 400)}`);
  }
  return text ? (JSON.parse(text) as unknown) : null;
}

function asArray(value: unknown): Record<string, unknown>[] {
  if (Array.isArray(value)) return value.filter(isRecord);
  if (isRecord(value) && Array.isArray(value.results)) return value.results.filter(isRecord);
  if (isRecord(value) && Array.isArray(value.data)) return value.data.filter(isRecord);
  return [];
}

function toolNameOf(tool: Record<string, unknown>): string {
  const fn = isRecord(tool.function) ? tool.function : null;
  return typeof fn?.name === "string" ? fn.name : "";
}

async function resolveServerUrl(): Promise<string> {
  const flag = process.argv.indexOf("--server-url");
  const fromFlag = flag >= 0 ? process.argv[flag + 1] : "";
  const base = (fromFlag || process.env.API_URL || "").replace(/\/$/, "").replace(/\/vapi\/tools$/, "");
  if (base) return `${base}/vapi/tools`;

  const account = process.env.CLOUDFLARE_ACCOUNT_ID;
  const token = process.env.CLOUDFLARE_API_TOKEN;
  if (account && token) {
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${account}/workers/subdomain`,
      { headers: { authorization: `Bearer ${token}` } },
    );
    if (response.ok) {
      const data = (await response.json()) as { result?: { subdomain?: string } };
      const subdomain = data.result?.subdomain;
      if (subdomain) return `https://clarte-api.${subdomain}.workers.dev/vapi/tools`;
    }
  }
  throw new Error("Set API_URL or pass --server-url https://clarte-api.<subdomain>.workers.dev");
}

function visiblePrompt(markdown: string): string {
  return markdown.replace(/<!--[\s\S]*?-->/g, "").trim();
}

async function main(): Promise<void> {
  const productDir = fileURLToPath(new URL("../", import.meta.url));
  await loadEnvFile(new URL(".dev.vars", `file://${productDir}`));
  await loadEnvFile(new URL("../.env", `file://${productDir}`));

  if (!process.env.VAPI_PRIVATE_KEY) {
    throw new Error("VAPI_PRIVATE_KEY is not set. Put it in the environment, product/.dev.vars, or ../.env.");
  }

  const serverUrl = await resolveServerUrl();
  const secret = process.env.VAPI_SERVER_SECRET ?? "";
  if (!secret) {
    console.warn("VAPI_SERVER_SECRET is unset. Tools will not send x-vapi-secret. The Worker accepts that only for local dev.");
  }

  const prompt = visiblePrompt(await readFile(new URL("prompts/coach.md", `file://${productDir}`), "utf8"));
  const existingTools = asArray(await vapi("/tool"));
  const toolIds: string[] = [];

  for (const definition of TOOL_DEFINITIONS) {
    const body = {
      type: "function",
      async: false,
      function: {
        name: definition.name,
        description: definition.description,
        parameters: definition.parameters,
      },
      server: {
        url: serverUrl,
        timeoutSeconds: definition.name === "visualize_idea" ? 60 : 30,
        ...(secret ? { headers: { "x-vapi-secret": secret } } : {}),
      },
    };
    const found = existingTools.find((tool) => toolNameOf(tool) === definition.name);
    const id = typeof found?.id === "string" ? found.id : "";
    const saved = asRecord(
      id
        ? await vapi(`/tool/${id}`, { method: "PATCH", body: JSON.stringify(body) })
        : await vapi("/tool", { method: "POST", body: JSON.stringify(body) }),
    );
    const savedId = typeof saved.id === "string" ? saved.id : id;
    if (!savedId) throw new Error(`Vapi did not return an id for ${definition.name}`);
    toolIds.push(savedId);
    console.log(`${id ? "updated" : "created"} tool ${definition.name} ${savedId}`);
  }

  const assistantBody = {
    name: ASSISTANT_NAME,
    firstMessage: FIRST_MESSAGE,
    model: {
      provider: process.env.VAPI_MODEL_PROVIDER || "openai",
      model: process.env.VAPI_MODEL || "gpt-4o-mini",
      messages: [{ role: "system", content: prompt }],
      toolIds,
    },
    voice: { provider: "vapi", voiceId: process.env.VAPI_VOICE_ID || "Elliot" },
    transcriber: { provider: "deepgram", model: "nova-2", language: "en" },
    clientMessages: ["transcript", "tool-calls"],
    metadata: { product: "clarte" },
  };

  const assistants = asArray(await vapi("/assistant"));
  const preferred = process.env.VAPI_ASSISTANT_ID;
  const match =
    assistants.find((assistant) => preferred && assistant.id === preferred) ??
    assistants.find((assistant) => assistant.name === ASSISTANT_NAME);
  const assistantId = typeof match?.id === "string" ? match.id : "";
  const saved = asRecord(
    assistantId
      ? await vapi(`/assistant/${assistantId}`, { method: "PATCH", body: JSON.stringify(assistantBody) })
      : await vapi("/assistant", { method: "POST", body: JSON.stringify(assistantBody) }),
  );
  const id = typeof saved.id === "string" ? saved.id : assistantId;
  if (!id) throw new Error("Vapi did not return an assistant id");

  console.log(`${assistantId ? "updated" : "created"} assistant ${ASSISTANT_NAME} ${id}`);
  console.log(`server ${serverUrl}`);
  console.log(`Set VAPI_ASSISTANT_ID=${id}`);
}

function asRecord(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
