import { describe, expect, it } from "vitest";
import { highlightCodeHtml } from "../src/node/highlight-code.js";

const TOKEN_COLOR_RE = /<span style="color:(#[0-9a-f]{3,8})/gi;

function distinctTokenColors(html: string): Set<string> {
  return new Set(
    [...html.matchAll(TOKEN_COLOR_RE)].map((match) => match[1].toLowerCase())
  );
}

describe("highlightCodeHtml", () => {
  it("colors tokens of a whitelisted language", async () => {
    const html = await highlightCodeHtml({
      code: "const answer: number = 42;",
      language: "typescript",
    });
    expect(distinctTokenColors(html).size).toBeGreaterThan(1);
  });

  it("treats aliases as their canonical language", async () => {
    const code = "export const x = 1;";
    const [aliased, canonical] = await Promise.all([
      highlightCodeHtml({ code, language: "ts" }),
      highlightCodeHtml({ code, language: "typescript" }),
    ]);
    expect(aliased).toBe(canonical);
  });

  it("falls back to plain text for unknown languages", async () => {
    const code = "const x = 1;";
    const [unknown, text] = await Promise.all([
      highlightCodeHtml({ code, language: "no-such-language" }),
      highlightCodeHtml({ code, language: "text" }),
    ]);
    expect(unknown).toBe(text);
    expect(distinctTokenColors(text).size).toBeLessThanOrEqual(1);
  });

  it("highlights several languages concurrently", async () => {
    const samples = [
      { language: "python", code: "def f(x):\n    return x + 1" },
      { language: "rust", code: "fn main() { let x: i32 = 1; }" },
      { language: "vue", code: "<template><div>{{ a }}</div></template>" },
      { language: "sql", code: "SELECT id FROM users WHERE id = 1;" },
      { language: "yaml", code: "key: value\nlist:\n  - 1" },
    ];
    const results = await Promise.all(samples.map(highlightCodeHtml));
    for (const html of results) {
      expect(distinctTokenColors(html).size).toBeGreaterThan(1);
    }
  });
});
