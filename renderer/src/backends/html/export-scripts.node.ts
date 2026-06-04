import { readFile } from "node:fs/promises";
import path from "node:path";

export type StaticExportScripts = {
  chromeJs: string;
  mermaidInitJs: string;
};

export async function readStaticExportScripts(
  rendererRoot: string
): Promise<StaticExportScripts> {
  const [chromeJs, mermaidInitJs] = await Promise.all([
    readFile(path.join(rendererRoot, "public/airp-chrome.js"), "utf-8"),
    readFile(path.join(rendererRoot, "public/mermaid-init.js"), "utf-8"),
  ]);
  return { chromeJs, mermaidInitJs };
}
