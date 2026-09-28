/**
 * The head's timestamp is the document's, not the pane's — and saving is the only
 * thing that moves it.
 */

import { describe, expect, it } from "vitest";
import { formatStamp, lastUpdatedOf, withUpdatedAt } from "../src/stamp.js";

const DOCUMENT = {
  i18n: { locale: "zh-CN" },
  meta: {
    createdAt: "2026-01-01T00:00:00.000Z",
    kind: "generic",
    title: "t",
  },
  schemaVersion: "1.1.0",
};

describe("lastUpdatedOf", () => {
  it("prefers updatedAt and falls back to createdAt", () => {
    expect(lastUpdatedOf(DOCUMENT)).toBe("2026-01-01T00:00:00.000Z");
    expect(
      lastUpdatedOf(withUpdatedAt(DOCUMENT, "2026-09-28T14:58:00.000Z"))
    ).toBe("2026-09-28T14:58:00.000Z");
  });

  it("says nothing when the document has neither", () => {
    expect(lastUpdatedOf({ meta: { title: "t" } })).toBeUndefined();
    expect(lastUpdatedOf({ meta: { updatedAt: "" } })).toBeUndefined();
    expect(lastUpdatedOf(undefined)).toBeUndefined();
  });
});

describe("formatStamp", () => {
  it("writes a local date down to the second", () => {
    // Built from local parts so the assertion does not depend on the test's zone.
    // Seconds matter: two saves in one minute have to look different.
    const local = new Date(2026, 8, 28, 22, 58, 7);
    expect(formatStamp(local.toISOString())).toBe("2026/09/28 22:58:07");
  });

  it("passes an unusable value through rather than showing NaN", () => {
    expect(formatStamp("not a date")).toBe("not a date");
  });
});

describe("withUpdatedAt", () => {
  it("stamps the document without touching anything else", () => {
    const stamped = withUpdatedAt(DOCUMENT, "2026-09-28T14:58:00.000Z") as {
      meta: Record<string, unknown>;
    };

    expect(stamped.meta.updatedAt).toBe("2026-09-28T14:58:00.000Z");
    expect(stamped.meta.createdAt).toBe("2026-01-01T00:00:00.000Z");
    expect(stamped.meta.title).toBe("t");
    // The input is left alone.
    expect(
      (DOCUMENT.meta as Record<string, unknown>).updatedAt
    ).toBeUndefined();
  });

  it("leaves a non-document alone", () => {
    expect(withUpdatedAt("nope", "2026-01-01T00:00:00.000Z")).toBe("nope");
  });
});
