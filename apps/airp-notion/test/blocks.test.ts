/**
 * The catalog must not drift from the repository, in either direction.
 *
 * The names come from `README.cn.md` — the table the author wrote for readers —
 * so the assertion parses that file rather than restating it. A hand-kept copy of
 * 46 names is a copy that can be quietly wrong.
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { resolveRepoRoot } from "@airp/test-kit";
import { describe, expect, it } from "vitest";
import {
  BLOCK_GROUPS,
  blockMeta,
  menuGroups,
  NAMED_TYPES,
} from "../src/blocks.js";
import { listBlockTypes } from "../src/schema.js";

const TYPES = listBlockTypes();

/** `**中文名**(`type`)` — the shape the README's block table uses. */
const DECLARED_NAME = /\*\*([^*]+)\*\*\(`([A-Za-z][A-Za-z0-9]*)`\)/g;

/** Every block name the repository declares, by type. */
function declaredNames(): Map<string, string> {
  const readme = readFileSync(
    path.join(resolveRepoRoot(), "README.cn.md"),
    "utf8"
  );
  const found = new Map<string, string>();
  for (const match of readme.matchAll(DECLARED_NAME)) {
    const [, name, type] = match;
    if (name !== undefined && type !== undefined) {
      found.set(type, name);
    }
  }
  return found;
}

describe("block catalog", () => {
  it("uses exactly the names the repository declares in README.cn.md", () => {
    const declared = declaredNames();
    const wrong = TYPES.filter(
      (type) => blockMeta(type).label !== declared.get(type)
    ).map(
      (type) =>
        `${type}: 本目录「${blockMeta(type).label}」≠ README「${declared.get(type)}」`
    );

    expect(wrong).toEqual([]);
  });

  it("covers every type the README names, and names no type it does not", () => {
    const declared = declaredNames();
    expect(declared.size).toBe(46);
    expect([...declared.keys()].sort()).toEqual(TYPES.slice().sort());
  });

  it("names only types the schema declares", () => {
    const declared = new Set(TYPES);
    expect(NAMED_TYPES.filter((type) => !declared.has(type))).toEqual([]);
  });

  it("names every type the schema declares", () => {
    expect(TYPES.filter((type) => !NAMED_TYPES.includes(type))).toEqual([]);
  });

  it("offers every type in the menu, in exactly one group", () => {
    const listed = menuGroups(TYPES).flatMap((group) =>
      group.items.map((item) => item.type)
    );
    // A menu that lists only some of the blocks makes the rest reachable only by
    // guessing at a query.
    expect(listed.slice().sort()).toEqual(TYPES.slice().sort());
    expect(new Set(listed).size).toBe(listed.length);
    expect(menuGroups(TYPES)).toHaveLength(BLOCK_GROUPS.length);
  });

  it("falls back to the raw name for a type it does not know", () => {
    expect(blockMeta("somethingNew").label).toBe("somethingNew");
    expect(blockMeta("paragraph").label).toBe("段落");
  });
});
