import { fork } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { documentPath } from "@airp/test-kit";
import { describe, expect, it } from "vitest";
import type { RenderWorkerMessage } from "../src/workers/ipc";
import type { RunRenderJobResult } from "../src/workers/run-render-job";

const packageDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
);
const workerPath = path.join(packageDir, "dist", "render-worker.cjs");
const BOOT_TEST_TIMEOUT_MS = 30_000;
const NON_LATIN1 = /[\u0100-\uffff]/;

/** Fork the real bundle, wait for `ready`, run one html job, return its result. */
function renderInFreshWorker(input: string): Promise<RunRenderJobResult> {
  const child = fork(workerPath, [], {
    env: { ...process.env, ELECTRON_RUN_AS_NODE: "1" },
    stdio: ["ignore", "pipe", "pipe", "ipc"],
  });
  const stderrChunks: Buffer[] = [];
  child.stderr?.on("data", (chunk: Buffer) => {
    stderrChunks.push(chunk);
  });

  return new Promise<RunRenderJobResult>((resolve, reject) => {
    child.on("message", (message: RenderWorkerMessage) => {
      if (message.type === "ready") {
        child.send({ input, target: "html" });
        return;
      }
      resolve(message.result);
    });
    child.once("exit", (code, signal) => {
      reject(
        new Error(
          `worker exited early code=${code} signal=${signal}\n${Buffer.concat(stderrChunks).toString("utf8")}`
        )
      );
    });
    child.once("error", reject);
  }).finally(() => {
    child.removeAllListeners("exit");
    child.kill("SIGKILL");
  });
}

describe("airp-renderer-vscode unit render worker boot", () => {
  it("ships a Latin-1-only bundle", () => {
    const source = readFileSync(workerPath, "utf8");
    expect(NON_LATIN1.test(source)).toBe(false);
  });

  it.each(["valid/html-blocks.airp.json", "valid/mermaid-ok-1.1.0.airp.json"])(
    "warms up, reports ready and renders %s",
    async (fixture) => {
      const result = await renderInFreshWorker(documentPath(fixture));
      expect(result).toMatchObject({ ok: true });
      if (result.ok) {
        expect(result.value.body).toContain("<!DOCTYPE html>");
      }
    },
    BOOT_TEST_TIMEOUT_MS
  );
});
