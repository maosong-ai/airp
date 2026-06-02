import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

export async function readExportCss(rendererRoot: string): Promise<string> {
  const stamped = path.join(rendererRoot, "dist/airp-export.css");
  try {
    return await readFile(stamped, "utf-8");
  } catch {
    const assetsDir = path.join(rendererRoot, "dist/assets");
    const files = (await readdir(assetsDir))
      .filter((f) => f.endsWith(".css"))
      .sort();
    if (!files.length) {
      throw new Error(
        "No export CSS found. Run `pnpm build` in renderer/ (produces dist/airp-export.css)."
      );
    }
    return readFile(path.join(assetsDir, files[files.length - 1]!), "utf-8");
  }
}
