#!/usr/bin/env npx tsx
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseAirpDocument } from "../src/lib/airp-schema.ts";
import {
  resolveDocumentLocale,
  resolveRendererLocale,
  resolveThemePreset,
} from "../src/lib/preferences.ts";
import { readExportCss } from "../src/lib/static-export-css.node.ts";
import { readStaticExportScripts } from "../src/lib/static-export-scripts.node.ts";
import { renderStaticHtml } from "../src/lib/static-html.tsx";

const moduleDir =
  typeof __dirname !== "undefined"
    ? __dirname
    : path.dirname(fileURLToPath(import.meta.url));

function resolveRendererRoot(): string {
  if (process.env.AIRP_RENDERER_ROOT) {
    return path.resolve(process.env.AIRP_RENDERER_ROOT);
  }
  const skillAssets = path.resolve(moduleDir, "..", "assets", "renderer");
  if (existsSync(path.join(skillAssets, "dist"))) {
    return skillAssets;
  }
  return path.resolve(moduleDir, "..");
}

function printUsage() {
  console.log(`Usage: render-static <input.airp.json> [options]

Options:
  -o, --output <file.html>   Output HTML path (default: same name as input)

Writes a single self-contained HTML file (CSS + airp-chrome + mermaid-init inlined).
Mermaid runtime still loads from jsDelivr via mermaid-init.

Run \`pnpm build\` in renderer/ first (or vendor assets into the skill).
`);
}

function parseArgs(argv: string[]) {
  const positional: string[] = [];
  let output: string | undefined;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!;
    if (arg === "-h" || arg === "--help") {
      return { help: true as const };
    }
    if (arg === "-o" || arg === "--output") {
      output = argv[++i];
      continue;
    }
    if (!arg.startsWith("-")) {
      positional.push(arg);
    }
  }

  return {
    help: false as const,
    input: positional[0],
    output,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || !("input" in args) || !args.input) {
    printUsage();
    process.exit(args.help ? 0 : 1);
  }

  const rendererRoot = resolveRendererRoot();
  const inputPath = path.resolve(args.input);
  const outputPath =
    args.output ??
    inputPath.replace(/\.airp\.json$/i, ".html").replace(/\.json$/i, ".html");

  const raw = await readFile(inputPath, "utf-8");
  const doc = parseAirpDocument(JSON.parse(raw) as unknown);
  const locale = resolveDocumentLocale(doc, resolveRendererLocale());
  const css = await readExportCss(rendererRoot);

  const preset = resolveThemePreset();
  const { chromeJs, mermaidInitJs } = await readStaticExportScripts(rendererRoot);

  const html = renderStaticHtml({
    doc,
    locale,
    css,
    mermaidInitJs,
    chromeJs,
    themePreset: preset,
    interactive: true,
  });

  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, html, "utf-8");

  console.log(`Wrote ${outputPath}`);
  console.log(`  locale: ${locale}`);
  console.log(`  theme: ${preset}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
