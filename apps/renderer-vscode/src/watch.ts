/** Quiet window — aligned with SSP renderer-vscode default. */
export const WATCH_DEBOUNCE_MS = 1000;

export type WatchEventKind = "change" | "create" | "delete" | "save";

export type WatchLogKind = "change" | "create" | "delete";

export interface WatchChange {
  kind: WatchLogKind;
  path: string;
}

/** `Watch [kind]path, …` — last kind per path, then sorted by path. */
export function formatWatchLogLine(
  changes: readonly { kind: string; path: string }[]
): string {
  return `Watch ${changes.map((entry) => `[${entry.kind}]${entry.path}`).join(", ")}`;
}

function toWatchLogKind(kind: WatchEventKind): WatchLogKind {
  return kind === "save" ? "change" : kind;
}

/** Accumulates watch events between debounced fires. */
export class WatchEventBuffer {
  private readonly byPath = new Map<string, WatchLogKind>();

  note(fsPath: string, kind: WatchEventKind): void {
    this.byPath.set(fsPath, toWatchLogKind(kind));
  }

  drain(): WatchChange[] {
    const entries = [...this.byPath.entries()]
      .map(([path, kind]) => ({ kind, path }))
      .sort((left, right) => left.path.localeCompare(right.path));
    this.byPath.clear();
    return entries;
  }

  clear(): void {
    this.byPath.clear();
  }
}

export type DebouncedRun = () => void | Promise<void>;

/**
 * Quiet-window debounce: kicks within the window collapse into one trailing
 * run. Runs are not serialized; callers cancel superseded work themselves.
 */
export class DebouncedRunner {
  private readonly debounceMs: number;
  private readonly run: DebouncedRun;
  private debounceTimer: ReturnType<typeof setTimeout> | undefined;

  constructor(run: DebouncedRun, debounceMs = WATCH_DEBOUNCE_MS) {
    this.run = run;
    this.debounceMs = debounceMs;
  }

  /** Schedule a trailing run after quiet. */
  kick(debounceMs = this.debounceMs): void {
    this.clear();
    this.debounceTimer = setTimeout(() => {
      this.debounceTimer = undefined;
      Promise.resolve()
        .then(() => this.run())
        .catch(() => undefined);
    }, debounceMs);
  }

  /** Cancel the pending run, if any. */
  clear(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = undefined;
    }
  }
}
