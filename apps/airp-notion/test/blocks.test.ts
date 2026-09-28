/**
 * The catalog must not drift from the schema: a label for a type that no longer
 * exists is a lie, and a missing one shows the author `someNewBlock` in the menu.
 */

import { describe, expect, it } from "vitest";
import {
  BLOCK_GROUPS,
  blockMeta,
  menuGroups,
  NAMED_TYPES,
} from "../src/blocks.js";
import { listBlockTypes } from "../src/schema.js";

const TYPES = listBlockTypes();

describe("block catalog", () => {
  it("names only types the schema declares", () => {
    const declared = new Set(TYPES);
    expect(NAMED_TYPES.filter((type) => !declared.has(type))).toEqual([]);
  });

  it("names every type the schema declares", () => {
    expect(TYPES.filter((type) => !NAMED_TYPES.includes(type))).toEqual([]);
  });

  it("puts every type in exactly one menu group", () => {
    const listed = menuGroups(TYPES).flatMap((group) =>
      group.items.map((item) => item.type)
    );
    expect(listed.slice().sort()).toEqual(TYPES.slice().sort());
    expect(new Set(listed).size).toBe(listed.length);
    expect(menuGroups(TYPES)).toHaveLength(BLOCK_GROUPS.length);
  });

  it("falls back to the raw name for a type it does not know", () => {
    expect(blockMeta("somethingNew").label).toBe("somethingNew");
    expect(blockMeta("paragraph").label).toBe("段落");
  });
});
