import type { RenderTarget } from "@airp/renderer";
import type { RunRenderJobResult } from "./run-render-job";

/** Host → render-worker: the only message a worker receives (one per worker). */
export interface RenderJobRecipe {
  input: string;
  target: RenderTarget;
  targetOptions?: Readonly<Record<string, unknown>>;
}

/** Render-worker → host. */
export type RenderWorkerMessage =
  | { type: "ready" }
  | { type: "result"; result: RunRenderJobResult };
