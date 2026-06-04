import path from "node:path";
import { copyFile, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
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

describe("compiled CLI integration (compile-first)", () => {
  beforeAll(async () => {
    const buildValidate = await runCommand(
      "node",
      ["scripts/build-validate-airp.mjs"],
      repoRoot
    );
    expect(buildValidate.code).toBe(0);

    const buildMarkdown = await runCommand(
      "node",
      ["scripts/build-render-markdown.mjs"],
      repoRoot
    );
    expect(buildMarkdown.code).toBe(0);

    const buildHtml = await runCommand(
      "node",
      ["scripts/build-render-html.mjs"],
      repoRoot
    );
    expect(buildHtml.code).toBe(0);
  });

  it("runs compiled validate CLI", async () => {
    const { inputPath } = await prepareFixture("single-locale.airp.json");
    const result = await runCommand(
      "node",
      ["skills/airp/scripts/validate-airp.mjs", inputPath],
      repoRoot
    );
    expect(result.code).toBe(0);
    expect(result.stdout).toContain("OK");
  });

  it("runs compiled markdown CLI and writes localized output", async () => {
    const { tempDir, inputPath } = await prepareFixture("single-locale.airp.json");
    const outputPath = path.join(tempDir, "compiled.md");

    const result = await runCommand(
      "node",
      [
        "skills/airp-markdown/scripts/render-markdown.mjs",
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

  it("runs compiled html CLI in all locale mode", async () => {
    const { tempDir, inputPath } = await prepareFixture("multi-locale.airp.json");
    const outputPath = path.join(tempDir, "compiled.html");

    const result = await runCommand(
      "node",
      [
        "skills/airp-html/scripts/render-html.mjs",
        inputPath,
        "--locale-mode",
        "all",
        "-o",
        outputPath,
      ],
      repoRoot
    );

    expect(result.code).toBe(0);
    const html = await readFile(outputPath, "utf-8");
    expect(html).toContain('data-airp-locale="zh-CN"');
    expect(html).toContain('data-airp-locale="en"');
    expect(html).toContain('data-airp-locale="ja"');
  });

  it("runs compiled html CLI in single mode without locale menu", async () => {
    const { tempDir, inputPath } = await prepareFixture("multi-locale.airp.json");
    const outputPath = path.join(tempDir, "compiled-single.html");

    const result = await runCommand(
      "node",
      [
        "skills/airp-html/scripts/render-html.mjs",
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

  it("fails compiled html for invalid parameter combination", async () => {
    const { tempDir, inputPath } = await prepareFixture("multi-locale.airp.json");
    const outputPath = path.join(tempDir, "compiled.html");

    const result = await runCommand(
      "node",
      [
        "skills/airp-html/scripts/render-html.mjs",
        inputPath,
        "--locale-mode",
        "all",
        "--single-locale",
        "en",
        "-o",
        outputPath,
      ],
      repoRoot
    );

    expect(result.code).toBe(1);
    expect(result.stderr).toContain("cannot be used with locale-mode=all");
  });
});