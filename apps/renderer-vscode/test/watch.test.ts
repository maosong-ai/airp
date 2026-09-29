import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DebouncedRunner,
  formatWatchLogLine,
  WATCH_DEBOUNCE_MS,
  WatchEventBuffer,
} from "../src/watch";

describe("watch", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("exposes the 1s debounce default", () => {
    expect(WATCH_DEBOUNCE_MS).toBe(1000);
  });

  it("formats watch log lines", () => {
    expect(
      formatWatchLogLine([
        { kind: "change", path: "/a.airp.json" },
        { kind: "delete", path: "/b.airp.json" },
      ])
    ).toBe("Watch [change]/a.airp.json, [delete]/b.airp.json");
  });

  it("coalesces events per path and drains sorted", () => {
    const buffer = new WatchEventBuffer();
    buffer.note("/b.airp.json", "change");
    buffer.note("/a.airp.json", "save");
    buffer.note("/b.airp.json", "delete");
    expect(buffer.drain()).toEqual([
      { kind: "change", path: "/a.airp.json" },
      { kind: "delete", path: "/b.airp.json" },
    ]);
    expect(buffer.drain()).toEqual([]);
  });

  it("debounces kicks into a single run after quiet", async () => {
    vi.useFakeTimers();
    const run = vi.fn();
    const runner = new DebouncedRunner(run, 100);
    runner.kick();
    runner.kick();
    expect(run).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(100);
    expect(run).toHaveBeenCalledTimes(1);
  });

  it("accepts a per-kick debounce override", async () => {
    vi.useFakeTimers();
    const run = vi.fn();
    const runner = new DebouncedRunner(run, 100);
    runner.kick(25);
    await vi.advanceTimersByTimeAsync(24);
    expect(run).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(run).toHaveBeenCalledTimes(1);
  });

  it("drops the pending run on clear", async () => {
    vi.useFakeTimers();
    const run = vi.fn();
    const runner = new DebouncedRunner(run, 100);
    runner.kick();
    runner.clear();
    await vi.advanceTimersByTimeAsync(100);
    expect(run).not.toHaveBeenCalled();
  });
});
