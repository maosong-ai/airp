import path from "node:path";
import { copyFile, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { assertSingleLocaleHtml } from "../helpers/assert-single-locale-html";
import { cleanupTempDir, makeTempDir } from "../helpers/tmp-dir";
import { runCommand } from "../helpers/run-command";

const moduleDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(moduleDir, "../../..");
const fixturesDir = path.join(repoRoot, "tests", "src", "fixtures");
const tempDirs: string[] = [];

async function prepareFixture(fileName: string) {
  const tempDir = await makeTempDir();
  tempDirs.push(tempDir);
  const inputPath = path.join(tempDir, fileName);
  await copyFile(path.join(fixturesDir, fileName), inputPath);
  return { tempDir, inputPath };
}

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) {
      await cleanupTempDir(dir);
    }
  }
});

describe("source CLI integration", () => {
  it("validates a legal AIRP document", async () => {
    const { inputPath } = await prepareFixture("single-locale.airp.json");
    const result = await runCommand(
      "pnpm",
      ["-C", "renderer", "run", "validate", inputPath],
      repoRoot
    );

    expect(result.code).toBe(0);
    expect(result.stdout).toContain("OK");
  });

  it("fails validate for invalid schema", async () => {
    const { inputPath } = await prepareFixture("invalid-schema.airp.json");
    const result = await runCommand(
      "pnpm",
      ["-C", "renderer", "run", "validate", inputPath],
      repoRoot
    );

    expect(result.code).toBe(1);
    expect(result.stderr).toContain("blocks");
  });

  it("renders markdown with locale and writes output", async () => {
    const { tempDir, inputPath } = await prepareFixture("single-locale.airp.json");
    const outputPath = path.join(tempDir, "out.md");

    const result = await runCommand(
      "pnpm",
      [
        "-C",
        "renderer",
        "run",
        "render:markdown",
        inputPath,
        "--locale",
        "zh-CN",
        "-o",
        outputPath,
      ],
      repoRoot
    );

    expect(result.code).toBe(0);
    const content = await readFile(outputPath, "utf-8");
    expect(content).toContain("# 单语言报告");
  });

  it("fails markdown rendering when locale is out of range", async () => {
    const { tempDir, inputPath } = await prepareFixture("single-locale.airp.json");
    const outputPath = path.join(tempDir, "out.md");

    const result = await runCommand(
      "pnpm",
      [
        "-C",
        "renderer",
        "run",
        "render:markdown",
        inputPath,
        "--locale",
        "en",
        "-o",
        outputPath,
      ],
      repoRoot
    );

    expect(result.code).toBe(1);
    expect(result.stderr).toContain("not in document locales");
  });

  it("renders html in single mode for a specific locale", async () => {
    const { tempDir, inputPath } = await prepareFixture("multi-locale.airp.json");
    const outputPath = path.join(tempDir, "out.html");

    const result = await runCommand(
      "pnpm",
      [
        "-C",
        "renderer",
        "run",
        "render:html",
        inputPath,
        "--locale-mode",
        "single",
        "--single-locale",
        "en",
        "-o",
        outputPath,
      ],
      repoRoot
    );

    expect(result.code).toBe(0);
    const html = await readFile(outputPath, "utf-8");
    assertSingleLocaleHtml(html, {
      locale: "en",
      title: "Multilingual Report",
    });
  });

  it("fails html rendering for invalid locale-mode", async () => {
    const { tempDir, inputPath } = await prepareFixture("multi-locale.airp.json");
    const outputPath = path.join(tempDir, "out.html");

    const result = await runCommand(
      "pnpm",
      [
        "-C",
        "renderer",
        "run",
        "render:html",
        inputPath,
        "--locale-mode",
        "bad",
        "-o",
        outputPath,
      ],
      repoRoot
    );

    expect(result.code).toBe(1);
    expect(result.stderr).toContain('locale-mode must be "all" or "single"');
  });
});