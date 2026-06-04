#!/usr/bin/env npx tsx
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { markdownBackend } from "../src/backends/markdown/markdown-backend.ts";
import { loadDocumentFromPath } from "../src/pipeline/load-document.ts";
import {
  registerBackend,
  renderDocument,
} from "../src/pipeline/render-document.ts";

function printUsage() {
  console.log(`Usage: render-markdown <input.airp.json> [options]

Options:
  --locale <code>          Language code (required, must be in doc.i18n.locales)
  -o, --output <file.md>   Output Markdown path (default: title-based .md next to input)

Writes a Markdown file from an AIRP document.
`);
}

function parseArgs(argv: string[]) {
  const positional: string[] = [];
  let output: string | undefined;
  let locale: string | undefined;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!;
    if (arg === "-h" || arg === "--help") {
      return { help: true as const };
    }
    if (arg === "--locale") {
      locale = argv[++i];
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
    locale,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || !("input" in args) || !args.input) {
    printUsage();
    process.exit(args.help ? 0 : 1);
  }

  // fail-closed: --locale is required
  if (!args.locale) {
    console.error("Error: --locale parameter is required");
    printUsage();
    process.exit(1);
  }

  registerBackend(markdownBackend);

  const inputPath = path.resolve(args.input);
  const doc = await loadDocumentFromPath(inputPath);
  
  // fail-closed: validate locale is in doc.i18n.locales
  if (!doc.i18n.locales.includes(args.locale)) {
    console.error(
      `Error: locale "${args.locale}" not in document locales: ${doc.i18n.locales.join(", ")}`
    );
    process.exit(1);
  }

  const artifact = await renderDocument(doc, "markdown", { locale: args.locale });

  const outputPath =
    args.output ??
    inputPath.replace(/\.airp\.json$/i, ".md").replace(/\.json$/i, ".md");

  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, artifact.body, "utf-8");

  console.log(`Wrote ${outputPath}`);
  console.log(`  locale: ${args.locale}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
