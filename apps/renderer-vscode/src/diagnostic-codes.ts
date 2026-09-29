import { defineDiagnosticCode } from "@airp/diagnostics";

/** return: src/render-worker-pool.ts */
export const RENDERER_VSCODE_WORKERS_TIMEOUT = defineDiagnosticCode(
  "renderer.vscode.workers.timeout",
  "error"
);

/** return: src/render-worker-pool.ts / src/workers/render-worker-main.ts */
export const RENDERER_VSCODE_WORKERS_FAILED = defineDiagnosticCode(
  "renderer.vscode.workers.failed",
  "error"
);

export const RENDERER_VSCODE_DIAGNOSTIC_ENTRIES = [
  RENDERER_VSCODE_WORKERS_TIMEOUT,
  RENDERER_VSCODE_WORKERS_FAILED,
] as const;

export const RENDERER_VSCODE_DIAGNOSTIC_CODES = [
  RENDERER_VSCODE_WORKERS_TIMEOUT.code,
  RENDERER_VSCODE_WORKERS_FAILED.code,
] as const;

export type RendererVscodeDiagnosticCode =
  (typeof RENDERER_VSCODE_DIAGNOSTIC_CODES)[number];

export const UNIT_COVERED_RENDERER_VSCODE_DIAGNOSTIC_CODES = [
  RENDERER_VSCODE_WORKERS_TIMEOUT.code,
  RENDERER_VSCODE_WORKERS_FAILED.code,
] as const satisfies readonly RendererVscodeDiagnosticCode[];
