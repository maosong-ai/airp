import { diagnostic } from "@airp/diagnostics";
import { warmUpRenderer } from "@airp/renderer/node/render";
import { RENDERER_VSCODE_WORKERS_FAILED } from "../diagnostic-codes";
import type { RenderJobRecipe, RenderWorkerMessage } from "./ipc";
import { type RunRenderJobResult, runRenderJob } from "./run-render-job";
import { warmUpPipeline } from "./warm-up-pipeline";

function send(message: RenderWorkerMessage): void {
  process.send?.(message);
}

async function run(recipe: RenderJobRecipe): Promise<RunRenderJobResult> {
  try {
    return await runRenderJob(recipe);
  } catch (error: unknown) {
    const text = error instanceof Error ? error.message : String(error);
    return {
      ok: false,
      diagnostics: [
        diagnostic(
          RENDERER_VSCODE_WORKERS_FAILED,
          `Render worker failed: ${text}`
        ),
      ],
    };
  }
}

// Host death closes the IPC channel; nothing here is worth finishing.
process.on("disconnect", () => {
  process.exit();
});

process.on("message", (recipe: RenderJobRecipe) => {
  run(recipe).then((result) => {
    send({ type: "result", result });
  });
});

// Warm-up failures resurface through normal diagnostics when a job runs.
warmUpRenderer()
  .catch(() => undefined)
  .then(() => warmUpPipeline())
  .catch(() => undefined)
  .then(() => {
    send({ type: "ready" });
  });
