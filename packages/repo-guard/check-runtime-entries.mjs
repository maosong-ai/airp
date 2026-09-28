/**
 * Cross-platform entry guard (`registry://rules.package-boundaries` → dependency-dag).
 *
 * Usage: pnpm check-runtime-entries
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { ROOT } from "./repo-root.mjs";

/** `import … from "@airp/…/node"` */
const PACKAGE_NODE_ENTRY_RE = /from\s+["']@airp\/[^"']+\/node["']/;

/** `import … from "node:…"` */
const NODE_BUILTIN_RE = /from\s+["']node:/;

/**
 * Cross-platform trees: no `node:` builtins, no `…/node` package entries.
 * Dual packages are listed at their `src/` root; walk skips `node/` dirs.
 */
const CROSS_PLATFORM_SRC = [
  "apps/airp-notion/src",
  "packages/protocol/src",
  "packages/validate/src",
  "packages/renderer/src",
  "packages/renderer-contract/src",
  "packages/renderer-shared/src",
  "packages/renderer-target-html/src",
  "packages/renderer-target-markdown/src",
  "packages/loader/src",
  "packages/writer/src",
  "packages/utils/src",
  "packages/diagnostics/src",
];

const errors = [];

function walkTsFiles(dir, out = []) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const name of entries) {
    if (name === "node_modules" || name === "dist") {
      continue;
    }
    const full = path.join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) {
      // Node entry trees are out of scope
      if (name === "node") {
        continue;
      }
      walkTsFiles(full, out);
      continue;
    }
    if (name.endsWith(".ts") || name.endsWith(".tsx")) {
      out.push(full);
    }
  }
  return out;
}

function rel(file) {
  return path.relative(ROOT, file).split(path.sep).join("/");
}

for (const glob of CROSS_PLATFORM_SRC) {
  const dir = path.join(ROOT, glob);
  for (const file of walkTsFiles(dir)) {
    const text = readFileSync(file, "utf8");
    if (NODE_BUILTIN_RE.test(text)) {
      errors.push(`${rel(file)}: cross-platform source must not import node:`);
    }
    if (PACKAGE_NODE_ENTRY_RE.test(text)) {
      errors.push(
        `${rel(file)}: cross-platform source must not import @airp/*/node`
      );
    }
  }
}

for (const barrel of [
  "packages/utils/src/index.ts",
  "packages/diagnostics/src/index.ts",
  "packages/validate/src/index.ts",
  "packages/loader/src/index.ts",
  "packages/renderer/src/index.ts",
  "packages/renderer-target-html/src/index.ts",
]) {
  const text = readFileSync(path.join(ROOT, barrel), "utf8");
  if (
    /from\s+["']\.\/node/.test(text) ||
    /export\s+\*\s+from\s+["']\.\/node/.test(text)
  ) {
    errors.push(`${barrel}: default entry must not re-export ./node`);
  }
}

if (errors.length > 0) {
  console.error(`[check-runtime-entries] ${errors.length} error(s):\n`);
  for (const e of errors) {
    console.error(`  - ${e}`);
  }
  process.exit(1);
}

console.log("[check-runtime-entries] OK");
