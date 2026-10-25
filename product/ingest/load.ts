/**
 * Push the ingest artifacts into D1 and Vectorize with wrangler — plan Appendix B4.
 *
 *   npm run load          # remote: D1 `paber` + Vectorize `paber-docs`
 *   npm run load:local    # local D1 only (Vectorize has no local emulation)
 *
 * Needs CLOUDFLARE_ACCOUNT_ID and a wrangler login (or CLOUDFLARE_API_TOKEN).
 */
import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const PRODUCT_DIR = fileURLToPath(new URL("../", import.meta.url));

interface Manifest {
  documents: number;
  edges: number;
  sqlFiles: string[];
  vectorFile: string;
}

function wrangler(args: string[]): void {
  console.log(`\n$ wrangler ${args.join(" ")}`);
  const result = spawnSync("npx", ["wrangler", ...args], {
    cwd: PRODUCT_DIR,
    stdio: "inherit",
    env: process.env,
  });
  if (result.status !== 0) {
    throw new Error(`wrangler ${args[0]} failed with status ${result.status}`);
  }
}

async function main(): Promise<void> {
  const local = process.argv.includes("--local");
  const target = local ? "--local" : "--remote";

  const manifest = JSON.parse(
    await readFile(new URL("data/manifest.json", `file://${PRODUCT_DIR}`), "utf8"),
  ) as Manifest;

  console.log(
    `Loading ${manifest.documents} documents and ${manifest.edges} edges into D1 (${target})...`,
  );

  wrangler(["d1", "migrations", "apply", "paber", target, "--config", "wrangler.api.toml"]);

  for (const file of manifest.sqlFiles) {
    wrangler(["d1", "execute", "paber", target, "--config", "wrangler.api.toml", `--file=data/${file}`]);
  }

  if (local) {
    console.log(
      "\nSkipping Vectorize: there is no local Vectorize emulation. " +
        "Run `npm run load` against the remote index when you have credentials.",
    );
    return;
  }

  wrangler([
    "vectorize",
    "insert",
    "paber-docs",
    `--file=data/${manifest.vectorFile}`,
    "--config",
    "wrangler.api.toml",
  ]);

  console.log("\nDone. Check with: curl https://clarte-api.<subdomain>.workers.dev/health");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
