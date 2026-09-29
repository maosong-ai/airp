import { documentPath } from "@airp/test-kit";
import { describe, expect, it } from "vitest";
import { runRenderJob } from "../src/workers/run-render-job";

describe("render worker pipeline (E2E)", () => {
  it("loads, validates, and renders html for a fixture document", async () => {
    const input = documentPath("valid/minimal.airp.json");
    const result = await runRenderJob({
      input,
      target: "html",
      targetOptions: {
        extraAppHeader: '<span data-test-export="true">Export</span>',
      },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.value.body).toContain("<!DOCTYPE html>");
    expect(result.value.body).toContain("Hello AIRP.");
    expect(result.value.body).toContain('data-test-export="true"');
    expect(result.value.documentTitle).toBe("Minimal report");
  });

  it("loads, validates, and renders markdown for a fixture document", async () => {
    const input = documentPath("valid/minimal.airp.json");
    const result = await runRenderJob({
      input,
      target: "markdown",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.value.body.length).toBeGreaterThan(0);
    expect(result.value.body).toContain("Hello AIRP.");
  });
});
