import type { ChildProcess } from "node:child_process";
import { type DiagnosticCodeEntry, diagnostic } from "@airp/diagnostics";
import {
  RENDERER_VSCODE_WORKERS_FAILED,
  RENDERER_VSCODE_WORKERS_TIMEOUT,
} from "./diagnostic-codes";
import type { RenderJobRecipe, RenderWorkerMessage } from "./workers/ipc";
import type { RunRenderJobResult } from "./workers/run-render-job";

export const MAX_WORKERS = 5;
export const WORKER_READY_TIMEOUT_MS = 5000;
export const JOB_TIMEOUT_MS = 5000;

export type RenderJobOutcome =
  | { kind: "done"; result: RunRenderJobResult }
  | { kind: "cancelled" };

export interface RenderJobHandle {
  cancel(): void;
  outcome: Promise<RenderJobOutcome>;
}

export interface RenderWorkerPoolOptions {
  spawnWorker: () => ChildProcess;
}

interface PoolJob {
  readonly recipe: RenderJobRecipe;
  readonly resolve: (outcome: RenderJobOutcome) => void;
  settled: boolean;
}

interface PoolWorker {
  readonly child: ChildProcess;
  job: PoolJob | undefined;
  state: "starting" | "idle" | "busy";
  timer: ReturnType<typeof setTimeout> | undefined;
}

const CANCELLED: RenderJobOutcome = { kind: "cancelled" };

function failure(
  entry: DiagnosticCodeEntry,
  message: string
): RenderJobOutcome {
  return {
    kind: "done",
    result: { ok: false, diagnostics: [diagnostic(entry, message)] },
  };
}

function finish(job: PoolJob, outcome: RenderJobOutcome): void {
  if (job.settled) {
    return;
  }
  job.settled = true;
  job.resolve(outcome);
}

function describeExit(
  code: number | null,
  signal: NodeJS.Signals | null
): string {
  return signal == null ? `code ${code ?? 1}` : `signal ${signal}`;
}

/**
 * One pool per extension host (VS Code window). Each worker warms up, sends
 * `ready`, runs exactly one job and is then killed. One warmed idle worker is
 * kept at all times; starting + idle + busy never exceeds `MAX_WORKERS`.
 */
export class RenderWorkerPool {
  private readonly spawnWorker: () => ChildProcess;
  private readonly workers = new Set<PoolWorker>();
  private readonly queue: PoolJob[] = [];
  private disposed = false;

  constructor(options: RenderWorkerPoolOptions) {
    this.spawnWorker = options.spawnWorker;
    this.schedule();
  }

  submit(recipe: RenderJobRecipe): RenderJobHandle {
    if (this.disposed) {
      return {
        cancel: () => undefined,
        outcome: Promise.resolve(CANCELLED),
      };
    }
    let resolve!: (outcome: RenderJobOutcome) => void;
    const outcome = new Promise<RenderJobOutcome>((settle) => {
      resolve = settle;
    });
    const job: PoolJob = { recipe, resolve, settled: false };
    this.queue.push(job);
    this.schedule();
    return {
      cancel: () => {
        this.cancel(job);
      },
      outcome,
    };
  }

  dispose(): void {
    this.disposed = true;
    for (const worker of [...this.workers]) {
      if (worker.job) {
        finish(worker.job, CANCELLED);
      }
      this.kill(worker);
    }
    for (const job of this.queue.splice(0)) {
      finish(job, CANCELLED);
    }
  }

  private cancel(job: PoolJob): void {
    if (job.settled) {
      return;
    }
    const queued = this.queue.indexOf(job);
    if (queued >= 0) {
      this.queue.splice(queued, 1);
      finish(job, CANCELLED);
      return;
    }
    for (const worker of this.workers) {
      if (worker.job === job) {
        this.kill(worker);
      }
    }
    finish(job, CANCELLED);
    this.schedule();
  }

  /** Assign queued jobs to idle workers (FIFO), then top up the pool. */
  private schedule(): void {
    if (this.disposed) {
      return;
    }
    for (const worker of this.workers) {
      const job = this.queue[0];
      if (!job) {
        break;
      }
      if (worker.state === "idle") {
        this.queue.shift();
        this.startJob(worker, job);
      }
    }
    while (
      this.availableCount() < this.queue.length + 1 &&
      this.workers.size < MAX_WORKERS
    ) {
      this.fork();
    }
  }

  private availableCount(): number {
    let count = 0;
    for (const worker of this.workers) {
      if (worker.state !== "busy") {
        count += 1;
      }
    }
    return count;
  }

  private fork(): void {
    const worker: PoolWorker = {
      child: this.spawnWorker(),
      job: undefined,
      state: "starting",
      timer: undefined,
    };
    worker.timer = setTimeout(() => {
      this.onStartFailed(
        worker,
        `Render worker did not become ready within ${WORKER_READY_TIMEOUT_MS} ms`
      );
    }, WORKER_READY_TIMEOUT_MS);
    this.workers.add(worker);
    worker.child.on("message", (message: RenderWorkerMessage) => {
      this.onMessage(worker, message);
    });
    worker.child.on("exit", (code, signal) => {
      this.onExit(worker, describeExit(code, signal));
    });
    worker.child.on("error", (error) => {
      this.onExit(worker, `error ${error.message}`);
    });
  }

  private startJob(worker: PoolWorker, job: PoolJob): void {
    worker.state = "busy";
    worker.job = job;
    worker.timer = setTimeout(() => {
      this.kill(worker);
      finish(
        job,
        failure(
          RENDERER_VSCODE_WORKERS_TIMEOUT,
          `Render job did not finish within ${JOB_TIMEOUT_MS} ms`
        )
      );
      this.schedule();
    }, JOB_TIMEOUT_MS);
    worker.child.send(job.recipe);
  }

  private onMessage(worker: PoolWorker, message: RenderWorkerMessage): void {
    if (!this.workers.has(worker)) {
      return;
    }
    if (message.type === "ready" && worker.state === "starting") {
      clearTimeout(worker.timer);
      worker.timer = undefined;
      worker.state = "idle";
      this.schedule();
      return;
    }
    if (message.type === "result" && worker.job) {
      const job = worker.job;
      this.kill(worker);
      finish(job, { kind: "done", result: message.result });
      this.schedule();
    }
  }

  private onExit(worker: PoolWorker, reason: string): void {
    if (!this.workers.has(worker)) {
      return;
    }
    if (worker.state === "starting") {
      this.onStartFailed(worker, `Render worker exited with ${reason}`);
      return;
    }
    const job = worker.job;
    this.kill(worker);
    if (job) {
      finish(
        job,
        failure(
          RENDERER_VSCODE_WORKERS_FAILED,
          `Render worker exited with ${reason} before returning a result`
        )
      );
    }
    this.schedule();
  }

  /** Fail every queued job and do not top up, so a broken worker cannot fork-loop. */
  private onStartFailed(worker: PoolWorker, message: string): void {
    this.kill(worker);
    for (const job of this.queue.splice(0)) {
      finish(job, failure(RENDERER_VSCODE_WORKERS_FAILED, message));
    }
  }

  private kill(worker: PoolWorker): void {
    clearTimeout(worker.timer);
    this.workers.delete(worker);
    worker.child.kill("SIGKILL");
  }
}
