#!/usr/bin/env npx tsx
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadDocumentFromPath } from "../src/pipeline/load-document.ts";
import { resolveThemePreset } from "../src/lib/preferences.ts";
import { renderStaticHtml } from "../src/backends/html/static-html.tsx";
import { readExportCss } from "../src/backends/html/export-css.node.ts";
import { readStaticExportScripts } from "../src/backends/html/export-scripts.node.ts";

const moduleDir =
  typeof __dirname !== "undefined"
    ? __dirname
    : path.dirname(fileURLToPath(import.meta.url));

function resolveRendererRoot(): string {
  const skillAssets = path.resolve(moduleDir, "..", "assets", "renderer");
  if (existsSync(path.join(skillAssets, "public"))) {
    return skillAssets;
  }
  return path.resolve(moduleDir, "..");
}

function printUsage() {
  console.log(`Usage: render-html <input.airp.json> [options]

Options:
  --locale-mode <mode>     Export mode: "all" (multi-locale switcher) or "single" (single locale only)
                          Default: "all"
  --single-locale <code>   Required when locale-mode=single; must be in doc.i18n.locales
  -o, --output <file.html> Output HTML path (default: title-based .html next to input)

Writes a single self-contained HTML file (CSS + airp-chrome + mermaid-init inlined).
Mermaid runtime still loads from jsDelivr via mermaid-init.

Run \`pnpm build\` in renderer/ first (or vendor assets into the skill).
`);
}

function parseArgs(argv: string[]) {
  const positional: string[] = [];
  let output: string | undefined;
  let localeMode: string | undefined;
  let singleLocale: string | undefined;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!;
    if (arg === "-h" || arg === "--help") {
      return { help: true as const };
    }
    if (arg === "--locale-mode") {
      localeMode = argv[++i];
      continue;
    }
    if (arg === "--single-locale") {
      singleLocale = argv[++i];
      continue;
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
    localeMode,
    singleLocale,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || !("input" in args) || !args.input) {
    printUsage();
    process.exit(args.help ? 0 : 1);
  }

  const inputPath = path.resolve(args.input);
  const doc = await loadDocumentFromPath(inputPath);

  // fail-closed: validate locale-mode parameter
  const localeMode = args.localeMode ?? "all"; // default to "all"

  // Rule 1: Invalid locale-mode value
  if (!["all", "single"].includes(localeMode)) {
    console.error(
      `Error: locale-mode must be "all" or "single", got "${localeMode}"`
    );
    process.exit(1);
  }

  // Rule 2: locale-mode=all + single-locale passed → error
  if (localeMode === "all" && args.singleLocale) {
    console.error(
      `Error: single-locale cannot be used with locale-mode=all`
    );
    process.exit(1);
  }

  // Rule 3 & 4: locale-mode=single validation
  let singleLocale: string | undefined;
  if (localeMode === "single") {
    // Rule 3: missing single-locale
    if (!args.singleLocale) {
      console.error(
        `Error: single-locale is required when locale-mode=single`
      );
      process.exit(1);
    }

    // Rule 4: invalid single-locale
    if (!doc.i18n.locales.includes(args.singleLocale)) {
      console.error(
        `Error: single-locale "${args.singleLocale}" not in document locales: ${doc.i18n.locales.join(
          ", "
        )}`
      );
      process.exit(1);
    }

    singleLocale = args.singleLocale;
  }

  // Determine export locale:
  // - all mode: use doc.defaultLocale for SSR initial state
  // - single mode: use singleLocale for SSR
  const exportLocale =
    localeMode === "single" ? singleLocale! : doc.i18n.defaultLocale;

  const rendererRoot = resolveRendererRoot();
  const preset = resolveThemePreset();

  // Read CSS and scripts
  const [css, scripts] = await Promise.all([
    readExportCss(rendererRoot),
    readStaticExportScripts(rendererRoot),
  ]);

  // Render SSR HTML
  const htmlBody = renderStaticHtml({
    doc,
    locale: exportLocale,
    css,
    mermaidInitJs: scripts.mermaidInitJs,
    chromeJs: scripts.chromeJs,
    themePreset: preset,
    colorMode: "system",
    localeMode: localeMode as "all" | "single",
  });

  const outputPath =
    args.output ??
    inputPath.replace(/\.airp\.json$/i, ".html").replace(/\.json$/i, ".html");

  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, htmlBody, "utf-8");

  console.log(`Wrote ${outputPath}`);
  console.log(`  locale-mode: ${localeMode}`);
  if (localeMode === "single") {
    console.log(`  single-locale: ${singleLocale}`);
  }
  console.log(`  theme: ${preset}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
