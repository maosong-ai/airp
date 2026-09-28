/**
 * The document kernel: address a node, change it, write it back.
 *
 * Deliberately small, and deliberately in this app rather than in a package: the
 * only things here are the ones the editor needs — paths into the JSON tree,
 * pure mutations that share untouched subtrees (so undo is a pointer swap),
 * machine handles, and a write-back that leaves untouched bytes untouched.
 *
 * Paths are plain `(string | number)[]`. They are not JSON Pointers: a block row
 * in the editor knows the array it lives in and its index, and converting to a
 * string and back would only add a place to get it wrong.
 */

import { isRecord } from "@airp/utils";

export type NodePath = readonly (string | number)[];

/** Machine handle alphabet and width, matching the schema's `AtId` pattern. */
const AT_ID_ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";
const AT_ID_LENGTH = 10;

/** A new handle. Collisions are resolved by the caller against the document. */
export function generateAtId(): string {
  const bytes = new Uint8Array(AT_ID_LENGTH);
  crypto.getRandomValues(bytes);
  let handle = "";
  for (const byte of bytes) {
    handle += AT_ID_ALPHABET[byte % AT_ID_ALPHABET.length];
  }
  return handle;
}

function readChild(container: unknown, key: string | number): unknown {
  if (Array.isArray(container)) {
    return container[key as number];
  }
  return isRecord(container) ? container[key as string] : undefined;
}

function writeChild(
  container: unknown,
  key: string | number,
  value: unknown
): unknown {
  if (Array.isArray(container)) {
    const next = [...container];
    next[key as number] = value;
    return next;
  }
  if (isRecord(container)) {
    return { ...container, [key]: value };
  }
  throw new Error("该路径的父节点既不是数组也不是对象");
}

/** Rebuild the tree down to `path`, replacing whatever it holds. */
function updateAt(
  document: unknown,
  path: NodePath,
  replace: (current: unknown) => unknown,
  offset = 0
): unknown {
  const key = path[offset];
  if (key === undefined) {
    return replace(document);
  }
  return writeChild(
    document,
    key,
    updateAt(readChild(document, key), path, replace, offset + 1)
  );
}

export function readAt(document: unknown, path: NodePath): unknown {
  let current = document;
  for (const key of path) {
    current = readChild(current, key);
  }
  return current;
}

export function setAt(
  document: unknown,
  path: NodePath,
  value: unknown
): unknown {
  return updateAt(document, path, () => value);
}

export function insertAt(
  document: unknown,
  path: NodePath,
  index: number,
  value: unknown
): unknown {
  return updateAt(document, path, (current) => {
    if (!Array.isArray(current)) {
      throw new Error("插入目标不是数组");
    }
    return [...current.slice(0, index), value, ...current.slice(index)];
  });
}

export function removeAt(document: unknown, path: NodePath): unknown {
  const key = path.at(-1);
  if (key === undefined) {
    throw new Error("不能删除文档根");
  }
  return updateAt(document, path.slice(0, -1), (parent) => {
    if (Array.isArray(parent) && typeof key === "number") {
      return parent.filter((_, index) => index !== key);
    }
    if (isRecord(parent) && typeof key === "string") {
      const { [key]: _removed, ...rest } = parent;
      return rest;
    }
    throw new Error("被删除节点的父节点既不是数组也不是对象");
  });
}

export function moveAt(document: unknown, path: NodePath, to: number): unknown {
  const from = path.at(-1);
  if (typeof from !== "number") {
    throw new Error("只能在数组内移动");
  }
  return updateAt(document, path.slice(0, -1), (parent) => {
    if (!Array.isArray(parent) || to < 0 || to >= parent.length) {
      throw new Error("移动目标越界");
    }
    const next = [...parent];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    return next;
  });
}

/** Write-back format: two-space indent and a trailing newline, key order kept. */
export function serialize(document: unknown): string {
  return `${JSON.stringify(document, null, 2)}\n`;
}

/** Every `@id` in the document, mapped to the path that carries it. */
export function indexAtIds(
  value: unknown,
  path: NodePath = [],
  found = new Map<string, NodePath>(),
  seen = new Set<object>()
): Map<string, NodePath> {
  if (typeof value !== "object" || value === null || seen.has(value)) {
    return found;
  }
  seen.add(value);
  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      indexAtIds(item, [...path, index], found, seen);
    });
    return found;
  }
  const record = value as Record<string, unknown>;
  const atId = record["@id"];
  if (typeof atId === "string" && !found.has(atId)) {
    found.set(atId, path);
  }
  for (const [key, child] of Object.entries(record)) {
    indexAtIds(child, [...path, key], found, seen);
  }
  return found;
}

/**
 * Copy `value`, re-issuing every handle inside it so none collides with the
 * document or with another one in the copy. Content that carries no handle keeps
 * none — which nodes need one is the schema's call, not this function's.
 */
export function withFreshAtIds(value: unknown, used: Set<string>): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => withFreshAtIds(item, used));
  }
  if (!isRecord(value)) {
    return value;
  }
  const copy: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value)) {
    copy[key] = withFreshAtIds(child, used);
  }
  if (typeof value["@id"] === "string") {
    let handle = generateAtId();
    while (used.has(handle)) {
      handle = generateAtId();
    }
    used.add(handle);
    copy["@id"] = handle;
  }
  return copy;
}

/** Handles already taken, for issuing fresh ones. */
export function usedAtIds(document: unknown): Set<string> {
  return new Set(indexAtIds(document).keys());
}
