/** Fetch helpers for the ingest script: retries, polite delays, HTML stripping. */

export async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchText(url: string, init?: RequestInit, attempts = 3): Promise<string> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const response = await fetch(url, {
        ...init,
        headers: {
          // Several of these APIs ask for a contactable user agent.
          "user-agent": "PABER/0.1 (hackathon project; https://github.com/haminxx/PABER)",
          accept: "application/json, application/atom+xml, text/xml;q=0.9, */*;q=0.8",
          ...(init?.headers ?? {}),
        },
        signal: AbortSignal.timeout(30_000),
      });
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
      return await response.text();
    } catch (error) {
      lastError = error;
      if (attempt < attempts) await sleep(attempt * 1500);
    }
  }
  throw new Error(`GET ${url} failed after ${attempts} attempts: ${String(lastError)}`);
}

export async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  return JSON.parse(await fetchText(url, init)) as T;
}

/** NASA T2 wraps matched terms in <span class="highlight">; NTRS abstracts carry entities. */
export function stripHtml(value: string): string {
  return value
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function clampText(value: string, max = 1400): string {
  const clean = stripHtml(value);
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
}
