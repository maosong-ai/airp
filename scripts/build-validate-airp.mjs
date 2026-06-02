import { spawn } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function resolveEsbuildBin(repoRoot) {
  const rendererRoot = path.join(repoRoot, "renderer");
  const binFromLinks = path.join(rendererRoot, "node_modules", ".bin", "esbuild");
  if (existsSync(binFromLinks)) return binFromLinks;

  const pnpmRoot = path.join(rendererRoot, "node_modules", ".pnpm");
  const candidates = readdirSync(pnpmRoot, { withFileTypes: true })
    .filter((d) => d.isDirectory() && d.name.startsWith("esbuild@"))
    .map((d) => d.name)
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  const best = candidates.at(-1);
  if (!best) {
    throw new Error(
      `Could not find esbuild under ${pnpmRoot}. ` +
        `Hint: run renderer install first, and if pnpm warns about ignored build scripts, run "pnpm approve-builds".`
    );
  }
  return path.join(pnpmRoot, best, "node_modules", "esbuild", "bin", "esbuild");
}

async function main() {
  const repoRoot = path.resolve(__dirname, "..");
  const entry = path.join(repoRoot, "renderer", "scripts", "validate-airp.ts");
  const outFile = path.join(repoRoot, "skills", "airp", "scripts", "validate-airp.mjs");

  const esbuildBin = resolveEsbuildBin(repoRoot);

  const args = [
    entry,
    "--bundle",
    "--platform=node",
    "--format=esm",
    "--target=node20",
    `--outfile=${outFile}`,
    `--tsconfig=${path.join(repoRoot, "renderer", "tsconfig.json")}`,
  ];

  const proc = spawn(esbuildBin, args, { stdio: "inherit" });
  const code = await new Promise((resolve) => proc.once("exit", resolve));
  if (code !== 0) process.exit(code ?? 1);
  console.log(outFile);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.stack : err);
  process.exit(1);
});

