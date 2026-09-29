import { describe, expect, it } from "vitest";
import { highlightCodeHtml } from "../src/node/highlight-code.js";
import { renderMermaidSvg } from "../src/node/render-mermaid-svg.js";
import { warmUpHtmlRenderer } from "../src/node/warm-up.js";

describe("warmUpHtmlRenderer", () => {
  it("leaves highlighting and Mermaid rendering ready to use", async () => {
    await warmUpHtmlRenderer();

    const html = await highlightCodeHtml({
      code: "print('hi')",
      language: "python",
    });
    expect(html).toContain("print");

    const svg = await renderMermaidSvg(
      "flowchart LR\n  A-->B",
      "airp-mmd-warm"
    );
    expect(svg).toContain("<svg");
  });
});
