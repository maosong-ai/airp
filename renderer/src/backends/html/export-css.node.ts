import { readFile } from "node:fs/promises";
import path from "node:path";

export async function readExportCss(rendererRoot: string): Promise<string> {
  const cssPath = path.join(rendererRoot, "public/airp-export.css");
  return await readFile(cssPath, "utf-8");
}
