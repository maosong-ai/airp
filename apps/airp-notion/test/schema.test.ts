/**
 * The schema reader is what makes the editor generic, so what it reports has to
 * be true, and a block the palette hands the author has to be one the validator
 * accepts. The second half of that is the promise the whole editor rests on: an
 * insert that lands red teaches the author to ignore validation.
 */

import { type SchemaVersion, supportedSchemaVersions } from "@airp/protocol";
import { validateDocument } from "@airp/validate";
import { describe, expect, it } from "vitest";

/** The schema's `AtId` pattern. */
const AT_ID = /^[a-z0-9]{10}$/;

import { createBlock, listBlockTypes, readBlockSpec } from "../src/schema.js";

const VERSION = (supportedSchemaVersions.at(-1) ?? "1.1.0") as SchemaVersion;

function minimalDocument(): Record<string, unknown> {
  return {
    blocks: [] as unknown[],
    i18n: { locale: "zh-CN" },
    meta: {
      createdAt: "2026-01-01T00:00:00.000Z",
      kind: "generic",
      title: "t",
    },
    schemaVersion: VERSION,
  };
}

describe("listBlockTypes", () => {
  it("finds every block type the schema declares", () => {
    expect(listBlockTypes(VERSION)).toHaveLength(46);
  });

  it("gives every type a spec that knows its own name", () => {
    const wrong = listBlockTypes(VERSION).filter(
      (type) => readBlockSpec(type, VERSION)?.type !== type
    );
    expect(wrong).toEqual([]);
  });
});

describe("readBlockSpec", () => {
  it("carries a number's bounds, so a seed can land inside them", () => {
    const level = readBlockSpec("heading", VERSION)?.fields.find(
      (field) => field.key === "level"
    );

    // `heading.level` is `minimum: 1`. Seeding 0 makes every new heading invalid,
    // which is exactly the bug this reader exists to not repeat.
    expect(level?.required).toBe(true);
    expect(level?.shape).toMatchObject({ kind: "number", minimum: 1 });
  });

  it("tells prose apart from structure", () => {
    const fields = readBlockSpec("callout", VERSION)?.fields ?? [];
    const byKey = new Map(fields.map((field) => [field.key, field.shape]));

    expect(byKey.get("body")).toEqual({ kind: "markdown" });
    expect(byKey.get("title")).toEqual({ kind: "plain" });
    expect(byKey.get("variant")).toMatchObject({ kind: "enum" });
  });

  it("reports list items as an array of strings, not as prose", () => {
    const items = readBlockSpec("bulletList", VERSION)?.fields.find(
      (field) => field.key === "items"
    );

    expect(items?.shape).toEqual({ kind: "stringArray" });
  });
});

describe("createBlock", () => {
  it("seeds a block the validator accepts, for every type", async () => {
    const failures: string[] = [];
    for (const type of listBlockTypes(VERSION)) {
      const document_ = minimalDocument();
      (document_.blocks as unknown[]).push(
        createBlock(type, VERSION, document_)
      );
      const result = await validateDocument(document_);
      if (!result.ok) {
        failures.push(
          `${type}: ${result.diagnostics
            .slice(0, 1)
            .map((diagnostic) => diagnostic.message)
            .join("")}`
        );
      }
    }
    expect(failures).toEqual([]);
  });

  it("gives the block a handle when the schema requires one", () => {
    const block = createBlock("paragraph", VERSION, minimalDocument());
    expect(block["@id"]).toMatch(AT_ID);
  });

  it("refuses a type the schema does not declare", () => {
    expect(() =>
      createBlock("notABlock", VERSION, minimalDocument())
    ).toThrow();
  });
});
