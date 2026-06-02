#!/usr/bin/env npx tsx
import { readFile } from "node:fs/promises";
import path from "node:path";
import { parseAirpDocument } from "../src/lib/airp-schema.ts";

function printUsage() {
  console.log(`Usage: pnpm validate <input.airp.json>

Validates the input JSON using the renderer's Zod parser (AIRP v1.0.0).`);
}

async function main() {
  const input = process.argv.slice(2).find((a) => !a.startsWith("-"));
  if (!input || input === "-h" || input === "--help") {
    printUsage();
    process.exit(input ? 0 : 1);
  }
  const p = path.resolve(input);
  const raw = await readFile(p, "utf-8");
  const json = JSON.parse(raw) as unknown;
  parseAirpDocument(json);
  console.log("OK");
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});

