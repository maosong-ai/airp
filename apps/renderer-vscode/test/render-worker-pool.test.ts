import type { ChildProcess } from "node:child_process";
import { EventEmitter } from "node:events";
import type { DiagnosticCodeEntry } from "@airp/diagnostics";
import { assertDiagnosticsMatchCatalog } from "@airp/test-kit";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  RENDERER_VSCODE_DIAGNOSTIC_ENTRIES,
  RENDERER_VSCODE_WORKERS_FAILED,
  RENDERER_VSCODE_WORKERS_TIMEOUT,
} from "../src/diagnostic-codes";
import {
  JOB_TIMEOUT_MS,
  MAX_WORKERS,
  type RenderJobHandle,
  type RenderJobOutcome,
  RenderWorkerPool,
  WORKER_READY_TIMEOUT_MS,
} from "../src/render-worker-pool";
import type { RenderJobRecipe } from "../src/workers/ipc";
import type { RunRenderJobResult } from "../src/workers/run-render-job";

const OK_RESULT: RunRenderJobResult = {
  ok: true,
  value: { body: "<html></html>", documentTitle: "Doc" },
  diagnostics: [],
};

class FakeWorker extends EventEmitter {
  readonly sent: RenderJobRecipe[] = [];
  killed = false;

  send(recipe: RenderJobRecipe): boolean {
    this.sent.push(recipe);
    return true;
  }

  kill(): boolean {
    this.killed = true;
    return true;
  }

  ready(): void {
    this.emit("message", { type: "ready" });
  }

  result(result: RunRenderJobResult = OK_RESULT): void {
    this.emit("message", { type: "result", result });
  }

  exit(code: number | null, signal: NodeJS.Signals | null = null): void {
    this.emit("exit", code, signal);
  }
}

function recipe(input: string): RenderJobRecipe {
  return { input, target: "html" };
}

function createPool() {
  const workers: FakeWorker[] = [];
  const pool = new RenderWorkerPool({
    spawnWorker: () => {
      const worker = new FakeWorker();
      workers.push(worker);
      return worker as unknown as ChildProcess;
    },
  });
  const alive = () => workers.filter((worker) => !worker.killed);
  return { alive, pool, workers };
}

/** Resolves to the outcome, or `undefined` while the job is still pending. */
async function peek(
  handle: RenderJobHandle
): Promise<RenderJobOutcome | undefined> {
  return await Promise.race([
    handle.outcome,
    new Promise<undefined>((resolve) => {
      queueMicrotask(() => {
        resolve(undefined);
      });
    }),
  ]);
}

function expectFailure(
  outcome: RenderJobOutcome | undefined,
  entry: DiagnosticCodeEntry,
  messagePart: string
): void {
  if (outcome?.kind !== "done" || outcome.result.ok) {
    throw new Error(`expected failed outcome, got ${JSON.stringify(outcome)}`);
  }
  const { diagnostics } = outcome.result;
  assertDiagnosticsMatchCatalog(
    diagnostics,
    RENDERER_VSCODE_DIAGNOSTIC_ENTRIES
  );
  expect(diagnostics).toEqual([
    expect.objectContaining({
      code: entry.code,
      message: expect.stringContaining(messagePart),
    }),
  ]);
}

describe("RenderWorkerPool", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("forks one standby worker on construction", () => {
    const { workers } = createPool();
    expect(workers).toHaveLength(1);
  });

  it("queues jobs until a worker is ready, then sends the recipe", async () => {
    const { pool, workers } = createPool();
    const job = pool.submit(recipe("a"));
    expect(workers[0].sent).toEqual([]);

    workers[0].ready();
    expect(workers[0].sent).toEqual([recipe("a")]);

    workers[0].result();
    expect(await job.outcome).toEqual({ kind: "done", result: OK_RESULT });
    expect(workers[0].killed).toBe(true);
  });

  it("counts starting workers as capacity so one job forks only the standby", () => {
    const { pool, workers } = createPool();
    pool.submit(recipe("a"));
    expect(workers).toHaveLength(2);

    workers[0].ready();
    expect(workers).toHaveLength(2);
    expect(workers[0].sent).toEqual([recipe("a")]);
  });

  it("forks for several jobs in parallel without exceeding the cap", () => {
    const { pool, workers } = createPool();
    for (const input of ["a", "b", "c", "d", "e", "f", "g"]) {
      pool.submit(recipe(input));
    }
    expect(workers).toHaveLength(MAX_WORKERS);
  });

  it("keeps jobs queued at the cap and dequeues them FIFO as workers free up", async () => {
    const { alive, pool, workers } = createPool();
    const inputs = ["a", "b", "c", "d", "e", "f", "g"];
    const jobs = inputs.map((input) => pool.submit(recipe(input)));
    for (const worker of [...workers]) {
      worker.ready();
    }
    expect(workers.flatMap((worker) => worker.sent)).toEqual(
      inputs.slice(0, MAX_WORKERS).map(recipe)
    );

    workers[0].result();
    expect(await jobs[0].outcome).toMatchObject({ kind: "done" });
    expect(alive()).toHaveLength(MAX_WORKERS);

    const replacement = workers.at(-1) as FakeWorker;
    replacement.ready();
    expect(replacement.sent).toEqual([recipe("f")]);
    expect(await peek(jobs[6])).toBeUndefined();
  });

  it("cancels a queued job without sending it", async () => {
    const { pool, workers } = createPool();
    const job = pool.submit(recipe("a"));
    job.cancel();
    expect(await job.outcome).toEqual({ kind: "cancelled" });

    workers[0].ready();
    expect(workers[0].sent).toEqual([]);
  });

  it("cancels a running job by killing its worker and tops up", async () => {
    const { alive, pool, workers } = createPool();
    workers[0].ready();
    const job = pool.submit(recipe("a"));
    expect(workers[0].sent).toEqual([recipe("a")]);

    job.cancel();
    expect(await job.outcome).toEqual({ kind: "cancelled" });
    expect(workers[0].killed).toBe(true);
    expect(alive().length).toBeGreaterThanOrEqual(1);

    job.cancel();
    workers[0].result();
    expect(await job.outcome).toEqual({ kind: "cancelled" });
  });

  it("fails a job that exceeds the job timeout", async () => {
    const { pool, workers } = createPool();
    workers[0].ready();
    const job = pool.submit(recipe("a"));

    vi.advanceTimersByTime(JOB_TIMEOUT_MS - 1);
    expect(await peek(job)).toBeUndefined();

    vi.advanceTimersByTime(1);
    expectFailure(await job.outcome, RENDERER_VSCODE_WORKERS_TIMEOUT, "within");
    expect(workers[0].killed).toBe(true);
  });

  it("fails queued jobs and does not top up when startup times out", async () => {
    const { pool, workers } = createPool();
    const job = pool.submit(recipe("a"));
    expect(workers).toHaveLength(2);

    vi.advanceTimersByTime(WORKER_READY_TIMEOUT_MS);
    expectFailure(
      await job.outcome,
      RENDERER_VSCODE_WORKERS_FAILED,
      "did not become ready"
    );
    expect(workers).toHaveLength(2);
    expect(workers.every((worker) => worker.killed)).toBe(true);
  });

  it("fails queued jobs and does not top up when a worker exits before ready", async () => {
    const { pool, workers } = createPool();
    const job = pool.submit(recipe("a"));

    workers[0].exit(1);
    expectFailure(await job.outcome, RENDERER_VSCODE_WORKERS_FAILED, "code 1");
    expect(workers).toHaveLength(2);
  });

  it("fails the job when a busy worker exits without a result", async () => {
    const { pool, workers } = createPool();
    workers[0].ready();
    const job = pool.submit(recipe("a"));

    workers[0].exit(null, "SIGSEGV");
    expectFailure(
      await job.outcome,
      RENDERER_VSCODE_WORKERS_FAILED,
      "signal SIGSEGV"
    );
  });

  it("replaces an idle worker that exits", () => {
    const { alive, workers } = createPool();
    workers[0].ready();

    workers[0].exit(0);
    expect(workers).toHaveLength(2);
    expect(alive()).toEqual([workers[1]]);
  });

  it("dispose kills every worker, cancels jobs and rejects later submits", async () => {
    const { alive, pool, workers } = createPool();
    workers[0].ready();
    const running = pool.submit(recipe("a"));
    const queued = pool.submit(recipe("b"));

    pool.dispose();
    expect(alive()).toEqual([]);
    expect(await running.outcome).toEqual({ kind: "cancelled" });
    expect(await queued.outcome).toEqual({ kind: "cancelled" });

    const forks = workers.length;
    const late = pool.submit(recipe("c"));
    expect(await late.outcome).toEqual({ kind: "cancelled" });
    expect(workers).toHaveLength(forks);
  });
});
