import path from "node:path";
import { copyFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { markdownBackend } from "../../../renderer/src/backends/markdown/markdown-backend.ts";
import { loadDocumentFromPath } from "../../../renderer/src/pipeline/load-document.ts";
import {
  registerBackend,
  renderDocument,
} from "../../../renderer/src/pipeline/render-document.ts";
import { cleanupTempDir, makeTempDir } from "../helpers/tmp-dir";

const moduleDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(moduleDir, "../../..");
const fixturesDir = path.join(repoRoot, "tests", "src", "fixtures");
const tempDirs: string[] = [];

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) {
      await cleanupTempDir(dir);
    }
  }
});

describe("pipeline flow", () => {
  it("returns coherent markdown artifact", async () => {
    const tempDir = await makeTempDir();
    tempDirs.push(tempDir);
    const inputPath = path.join(tempDir, "single-locale.airp.json");
    await copyFile(path.join(fixturesDir, "single-locale.airp.json"), inputPath);

    registerBackend(markdownBackend);
    const doc = await loadDocumentFromPath(inputPath);
    const artifact = await renderDocument(doc, "markdown", { locale: "zh-CN" });

    expect(artifact.format).toBe("markdown");
    expect(artifact.mimeType).toBe("text/markdown");
    expect(artifact.filename.endsWith(".md")).toBe(true);
    expect(artifact.body).toContain("# 单语言报告");
  });
});