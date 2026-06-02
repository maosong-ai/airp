import { copyFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const assetsDir = path.join(root, "dist/assets");
const files = (await readdir(assetsDir)).filter((f) => f.endsWith(".css")).sort();
if (!files.length) {
  console.error("stamp-export-css: no CSS in dist/assets — run vite build first");
  process.exit(1);
}
const latest = files[files.length - 1];
const source = path.join(assetsDir, latest);
const targets = [
  path.join(root, "dist/airp-export.css"),
  path.join(root, "public/airp-export.css"),
];
for (const target of targets) {
  await copyFile(source, target);
  console.log(`stamp-export-css: ${path.relative(root, target)} ← assets/${latest}`);
}
