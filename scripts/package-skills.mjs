import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function parseArgs(argv) {
  const args = {
    skipInstall: false,
    skipRendererBuild: false,
    skipVendor: false,
    skipCliBuild: false,
    packageManager: "pnpm",
  };

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--skip-install") args.skipInstall = true;
    else if (a === "--skip-renderer-build") args.skipRendererBuild = true;
    else if (a === "--skip-vendor") args.skipVendor = true;
    else if (a === "--skip-cli-build") args.skipCliBuild = true;
    else if (a === "--pm") args.packageManager = argv[++i] || "pnpm";
    else if (a === "-h" || a === "--help") return { help: true, args };
  }
  return { help: false, args };
}

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
  const parsed = parseArgs(process.argv.slice(2));
  if (parsed.help) {
    console.log(`Usage: node scripts/package-airp-skills.mjs [options]

Options:
  --pm <pnpm|npm|yarn>      Package manager used for renderer (default: pnpm)
  --skip-install            Skip installing renderer deps
  --skip-renderer-build     Skip building renderer (requires existing renderer/dist)
  --skip-vendor             Skip vendoring renderer assets + schema into skills
  --skip-cli-build          Skip building precompiled CLI entries (validate/render-static)
`);
    process.exit(0);
  }

  const { args } = parsed;
  const repoRoot = path.resolve(__dirname, "..");
  const rendererDir = path.join(repoRoot, "renderer");

  if (!args.skipRendererBuild) {
    if (!args.skipInstall) {
      await run(args.packageManager, ["-C", rendererDir, "install"], {
        env: process.env,
      }).catch((err) => {
        throw new Error(
          `${err instanceof Error ? err.message : String(err)}\n` +
            `Hint: install ${args.packageManager} or pass --pm npm / --skip-install.`
        );
      });
    }
    await run(args.packageManager, ["-C", rendererDir, "build"], { env: process.env }).catch((err) => {
      throw new Error(
        `${err instanceof Error ? err.message : String(err)}\n` +
          `Hint: run renderer build first, or pass --skip-renderer-build if renderer/dist is already up to date.`
      );
    });
  }

  if (!args.skipVendor) {
    await run(process.execPath, [path.join(repoRoot, "scripts", "vendor-airp-assets.mjs")], {
      env: process.env,
    });
  }

  if (!args.skipCliBuild) {
    await run(process.execPath, [path.join(repoRoot, "scripts", "build-validate-airp.mjs")], {
      env: process.env,
    });
    await run(process.execPath, [path.join(repoRoot, "scripts", "build-render-static.mjs")], {
      env: process.env,
    });
  }

  console.log("\nOK: AIRP skills assets are ready to publish.");
}

main().catch((err) => {
  console.error(err instanceof Error ? err.stack : err);
  process.exit(1);
});

