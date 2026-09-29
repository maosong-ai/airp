/**
 * The kernel is where the editing promises are kept: mutations are pure, handles
 * stay unique, and a write-back leaves untouched bytes untouched.
 */

import { describe, expect, it } from "vitest";

/** The schema's `AtId` pattern. */
const AT_ID = /^[a-z0-9]{10}$/;

import {
  generateAtId,
  indexAtIds,
  insertAt,
  moveAt,
  readAt,
  removeAt,
  serialize,
  setAt,
  usedAtIds,
  withFreshAtIds,
} from "../src/kernel.js";

const DOCUMENT = {
  blocks: [
    { "@id": "aaaaaaaaaa", text: "one", type: "paragraph" },
    { "@id": "bbbbbbbbbb", text: "two", type: "paragraph" },
    { "@id": "cccccccccc", text: "three", type: "paragraph" },
  ],
  schemaVersion: "1.1.0",
};

describe("addressing", () => {
  it("reads a node by path", () => {
    expect(readAt(DOCUMENT, ["blocks", 1, "text"])).toBe("two");
    expect(readAt(DOCUMENT, ["schemaVersion"])).toBe("1.1.0");
  });

  it("replaces a node without touching the input", () => {
    const next = setAt(DOCUMENT, ["blocks", 1, "text"], "changed");

    expect(readAt(next, ["blocks", 1, "text"])).toBe("changed");
    // The input is untouched, and untouched subtrees are shared rather than copied.
    expect(readAt(DOCUMENT, ["blocks", 1, "text"])).toBe("two");
    expect(readAt(next, ["blocks", 0])).toBe(readAt(DOCUMENT, ["blocks", 0]));
  });

  it("inserts, removes and moves inside an array", () => {
    const inserted = insertAt(DOCUMENT, ["blocks"], 1, { type: "divider" });
    expect((readAt(inserted, ["blocks"]) as unknown[]).length).toBe(4);
    expect(readAt(inserted, ["blocks", 1])).toEqual({ type: "divider" });

    const removed = removeAt(DOCUMENT, ["blocks", 0]);
    expect(
      (readAt(removed, ["blocks"]) as { text: string }[]).map((b) => b.text)
    ).toEqual(["two", "three"]);

    const moved = moveAt(DOCUMENT, ["blocks", 0], 2);
    expect(
      (readAt(moved, ["blocks"]) as { text: string }[]).map((b) => b.text)
    ).toEqual(["two", "three", "one"]);
  });

  it("refuses a move that would leave the array", () => {
    expect(() => moveAt(DOCUMENT, ["blocks", 0], 9)).toThrow();
  });

  it("refuses to remove the document root", () => {
    expect(() => removeAt(DOCUMENT, [])).toThrow();
  });
});

describe("write-back", () => {
  it("keeps key order and ends with a newline", () => {
    const text = serialize(DOCUMENT);
    expect(text.endsWith("}\n")).toBe(true);
    expect(text.split("\n")[1]).toBe('  "blocks": [');
    expect(JSON.parse(text)).toEqual(DOCUMENT);
  });

  it("changes only the edited line", () => {
    const before = serialize(DOCUMENT).split("\n");
    const after = serialize(setAt(DOCUMENT, ["blocks", 1, "text"], "x")).split(
      "\n"
    );

    expect(after).toHaveLength(before.length);
    expect(after.filter((line, index) => line !== before[index])).toHaveLength(
      1
    );
  });
});

describe("handles", () => {
  it("issues handles the schema's pattern accepts", () => {
    expect(generateAtId()).toMatch(AT_ID);
    expect(new Set(Array.from({ length: 50 }, generateAtId)).size).toBe(50);
  });

  it("indexes every handle, nested ones included", () => {
    const document_ = {
      blocks: [
        {
          "@id": "aaaaaaaaaa",
          children: [{ "@id": "bbbbbbbbbb" }],
          type: "section",
        },
      ],
    };
    const index = indexAtIds(document_);

    expect([...index.keys()].sort()).toEqual(["aaaaaaaaaa", "bbbbbbbbbb"]);
    expect(index.get("bbbbbbbbbb")).toEqual(["blocks", 0, "children", 0]);
    expect(usedAtIds(document_).size).toBe(2);
  });

  it("re-issues handles in a copy, and only in the copy", () => {
    const original = { "@id": "aaaaaaaaaa", text: "x", type: "paragraph" };
    const copy = withFreshAtIds(original, usedAtIds(DOCUMENT)) as Record<
      string,
      unknown
    >;

    expect(copy.text).toBe("x");
    expect(copy["@id"]).toMatch(AT_ID);
    expect(copy["@id"]).not.toBe("aaaaaaaaaa");
    expect(original["@id"]).toBe("aaaaaaaaaa");
  });
});
