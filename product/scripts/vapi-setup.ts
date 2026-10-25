/**
 * Attach the five Clarte Function tools to the live Vapi assistant.
 *
 * Does not create an assistant or a phone number. Does not change the
 * assistant's name, voice, transcriber, model, or system prompt.
 *
 *   cd product
 *   # VAPI_PRIVATE_KEY in the environment, product/.dev.vars, or ../.env
 *   npm run vapi:setup
 *   npm run vapi:setup -- --server-url https://clarte-api.<subdomain>.workers.dev
 *
 * Tool server URL: --server-url, else the URL already on one of the five tools,
 * else API_URL/vapi/tools, else the clarte-api workers.dev host.
 * VAPI_SERVER_SECRET is sent as the x-vapi-secret header. The private key is never printed.
 */
import { fileURLToPath } from "node:url";
import { readFile } from "node:fs/promises";
import { TOOL_DEFINITIONS } from "../workers/shared/tools-spec";

const VAPI = "https://api.vapi.ai";
const LIVE_ASSISTANT_ID = "f7cef3eb-dd90-4b34-8a21-690c27e99393";

/** Model fields copied back unchanged so a nested PATCH cannot drop the prompt. */
const MODEL_FIELDS = [
  "provider",
  "model",
  "messages",
  "temperature",
  "emotionRecognitionEnabled",
  "maxTokens",
  "numFastTurns",
  "knowledgeBase",
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function asRecord(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
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

function serverUrlOf(tool: Record<string, unknown>): string {
  const server = asRecord(tool.server);
  return typeof server.url === "string" ? server.url : "";
}

async function resolveServerUrl(existingTools: Record<string, unknown>[]): Promise<string> {
  const flag = process.argv.indexOf("--server-url");
  const fromFlag = flag >= 0 ? process.argv[flag + 1] : "";
  if (fromFlag) return fromFlag.replace(/\/$/, "").replace(/\/vapi\/tools$/, "") + "/vapi/tools";

  const names = new Set<string>(TOOL_DEFINITIONS.map((tool) => tool.name));
  for (const tool of existingTools) {
    if (!names.has(toolNameOf(tool))) continue;
    const url = serverUrlOf(tool);
    if (url) return url;
  }

  const base = (process.env.API_URL || "").replace(/\/$/, "").replace(/\/vapi\/tools$/, "");
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
  throw new Error(
    "No existing tool server URL. Set API_URL or pass --server-url https://clarte-api.<subdomain>.workers.dev",
  );
}

async function main(): Promise<void> {
  const productDir = fileURLToPath(new URL("../", import.meta.url));
  await loadEnvFile(new URL(".dev.vars", `file://${productDir}`));
  await loadEnvFile(new URL("../.env", `file://${productDir}`));

  if (!process.env.VAPI_PRIVATE_KEY) {
    throw new Error("VAPI_PRIVATE_KEY is not set. Put it in the environment, product/.dev.vars, or ../.env.");
  }

  const fromEnv = process.env.VAPI_ASSISTANT_ID?.trim();
  if (fromEnv && fromEnv !== LIVE_ASSISTANT_ID) {
    throw new Error(
      `Refusing to patch ${fromEnv}. This script only updates the live assistant ${LIVE_ASSISTANT_ID}.`,
    );
  }

  const secret = process.env.VAPI_SERVER_SECRET ?? "";
  if (!secret) {
    console.warn(
      "VAPI_SERVER_SECRET is unset. Tools will not send x-vapi-secret. The Worker accepts that only for local dev.",
    );
  }

  const existingTools = asArray(await vapi("/tool"));
  const serverUrl = await resolveServerUrl(existingTools);
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

  const current = asRecord(await vapi(`/assistant/${LIVE_ASSISTANT_ID}`));
  if (current.id !== LIVE_ASSISTANT_ID) {
    throw new Error(`Assistant ${LIVE_ASSISTANT_ID} was not found. This script does not create assistants.`);
  }
  const model = asRecord(current.model);
  if (typeof model.provider !== "string" || typeof model.model !== "string" || !Array.isArray(model.messages)) {
    throw new Error("Refusing to PATCH: the live model, provider, or system prompt could not be read.");
  }

  const nextModel: Record<string, unknown> = { toolIds };
  for (const field of MODEL_FIELDS) {
    if (model[field] !== undefined) nextModel[field] = model[field];
  }
  const promptBefore = JSON.stringify(model.messages);

  const saved = asRecord(
    await vapi(`/assistant/${LIVE_ASSISTANT_ID}`, {
      method: "PATCH",
      body: JSON.stringify({ model: nextModel }),
    }),
  );
  const savedModel = asRecord(saved.model);
  if (JSON.stringify(savedModel.messages) !== promptBefore) {
    throw new Error("PATCH changed the assistant system prompt.");
  }
  if (saved.name !== undefined && saved.name !== current.name) {
    throw new Error("PATCH changed the assistant name.");
  }

  console.log(`attached ${toolIds.length} tools to assistant ${LIVE_ASSISTANT_ID}`);
  console.log(`server ${serverUrl}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
