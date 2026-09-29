import { Window } from "happy-dom";
import { describe, expect, it } from "vitest";
import {
  buildLoadingShellHtml,
  PLACEHOLDER_READY_TIMEOUT_MS,
} from "../src/loading-shell";

describe("loading-shell", () => {
  it("shows a loading state", () => {
    expect(PLACEHOLDER_READY_TIMEOUT_MS).toBe(1500);
    const window = new Window();
    window.document.write(buildLoadingShellHtml());
    const shell = window.document.querySelector("[data-airp-loading-shell]");
    expect(shell?.textContent).toContain("Rendering…");
  });

  it("posts placeholderReady once after first frame or load", () => {
    const window = new Window();
    window.document.write(buildLoadingShellHtml());
    const script = window.document.querySelector("script")?.textContent;
    expect(script).toBeTruthy();

    const posted: unknown[] = [];
    const rafQueue: FrameRequestCallback[] = [];
    const loadListeners: Array<() => void> = [];
    const run = new Function(
      "acquireVsCodeApi",
      "requestAnimationFrame",
      "window",
      script ?? ""
    );
    run(
      () => ({
        postMessage: (message: unknown) => {
          posted.push(message);
        },
      }),
      (callback: FrameRequestCallback) => {
        rafQueue.push(callback);
        return 1;
      },
      {
        addEventListener: (type: string, listener: () => void) => {
          if (type === "load") {
            loadListeners.push(listener);
          }
        },
      }
    );

    rafQueue.shift()?.(0);
    rafQueue.shift()?.(0);
    expect(posted).toEqual([{ type: "placeholderReady" }]);

    for (const listener of loadListeners) {
      listener();
    }
    expect(posted).toEqual([{ type: "placeholderReady" }]);
  });
});
