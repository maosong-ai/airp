import { assertDiagnosticCodeCoverage } from "@airp/test-kit";
import { describe, expect, it } from "vitest";
import {
  RENDERER_VSCODE_DIAGNOSTIC_CODES,
  UNIT_COVERED_RENDERER_VSCODE_DIAGNOSTIC_CODES,
} from "../src/diagnostic-codes";

describe("diagnostic code coverage", () => {
  it("covers every registered renderer-vscode diagnostic code", () => {
    expect(() =>
      assertDiagnosticCodeCoverage(
        RENDERER_VSCODE_DIAGNOSTIC_CODES,
        {},
        UNIT_COVERED_RENDERER_VSCODE_DIAGNOSTIC_CODES
      )
    ).not.toThrow();
  });
});
