import { existsSync } from "node:fs";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function run(cmd, cmdArgs, opts) {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, cmdArgs, { stdio: "inherit", ...opts });
    proc.once("error", reject);
    proc.once("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${cmd} ${cmdArgs.join(" ")} exited with ${code ?? "null"}`));
    });
  });
}

async function main() {
  const repoRoot = path.resolve(__dirname, "..");
  const distDir = path.join(repoRoot, "renderer", "dist");

  if (!existsSync(distDir)) {
    console.error(
      `Error: renderer/dist not found.\n` +
      `Run \`pnpm run build:renderer\` first.`
    );
    process.exit(1);
  }

  await run(process.execPath, [path.join(repoRoot, "scripts", "vendor-airp-assets.mjs")], { env: process.env });
  await run(process.execPath, [path.join(repoRoot, "scripts", "build-validate-airp.mjs")], { env: process.env });
  await run(process.execPath, [path.join(repoRoot, "scripts", "build-render-html.mjs")], { env: process.env });
  await run(process.execPath, [path.join(repoRoot, "scripts", "build-render-markdown.mjs")], { env: process.env });

  console.log("\nOK: AIRP skills assets are ready to publish.");
}

main().catch((err) => {
  console.error(err instanceof Error ? err.stack : err);
  process.exit(1);
});

