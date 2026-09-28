/**
 * What each block type is made of, read from the document schema.
 *
 * This is the app's own reader rather than a package: the editor needs exactly
 * two answers — which fields does this block have, and what kind of control does
 * each one want — and a schema is the right place to get them from, because a
 * block type added to `document.schema.json` then gains an editor without a
 * change here.
 *
 * Two things this reader is careful about, both learned the hard way:
 *
 * - **Bounds travel with a number.** `heading.level` is `minimum: 1`, so seeding
 *   `0` produces a block the schema rejects the instant it is created.
 * - **A required `PlainString` cannot be seeded empty.** It is `minLength: 1`, so
 *   a required plain string starts at an editable placeholder instead.
 */

import {
  getSchema,
  type SchemaVersion,
  supportedSchemaVersions,
} from "@airp/protocol";
import { generateAtId, usedAtIds } from "./kernel.js";

export type FieldShape =
  | { kind: "markdown" }
  | { kind: "plain" }
  | { kind: "string"; format?: string }
  | { kind: "number"; maximum?: number; minimum?: number }
  | { kind: "boolean" }
  | { kind: "enum"; values: readonly string[] }
  | { kind: "stringArray" }
  | {
      kind: "complex";
      array: boolean;
      itemFields?: readonly FieldSpec[];
      itemRequiresHandle?: boolean;
      minItems?: number;
    };

export interface FieldSpec {
  key: string;
  required: boolean;
  shape: FieldShape;
}

export interface BlockSpec {
  fields: readonly FieldSpec[];
  /** Whether the schema requires a machine handle on this block. */
  requiresHandle: boolean;
  type: string;
}

interface SchemaNode {
  $ref?: string;
  allOf?: readonly SchemaNode[];
  const?: unknown;
  enum?: readonly string[];
  format?: string;
  items?: SchemaNode;
  maximum?: number;
  minItems?: number;
  minimum?: number;
  oneOf?: readonly SchemaNode[];
  properties?: Readonly<Record<string, SchemaNode>>;
  required?: readonly string[];
  type?: string | readonly string[];
}

type Defs = Readonly<Record<string, SchemaNode>>;

const NON_CONTENT_KEYS = new Set(["@id", "type"]);

/**
 * How deep a shape is described.
 *
 * One level is enough to seed a structured item (its own required scalars and
 * handle) and it is also what keeps a self-recursive type finite: `FileTreeNode`
 * contains `FileTreeNode`, so a reader without a limit never returns.
 */
const MAX_SHAPE_DEPTH = 1;
const PLACEHOLDER = "待填写";
/** A required string the schema pins to a URI cannot be satisfied by prose. */
const PLACEHOLDER_URI = "https://example.com/";

const catalogs = new Map<SchemaVersion, Map<string, BlockSpec>>();

function defNameOf(ref: string): string {
  return ref.slice(ref.lastIndexOf("/") + 1);
}

function deref(
  node: SchemaNode,
  defs: Defs
): { def?: string; node: SchemaNode } {
  const ref = node.$ref;
  if (ref === undefined) {
    return { node };
  }
  const def = defNameOf(ref);
  const target = defs[def];
  return target === undefined ? { node } : { def, node: target };
}

/** The node plus everything it inherits through `allOf`. */
function membersOf(node: SchemaNode, defs: Defs): SchemaNode[] {
  const { node: resolved } = deref(node, defs);
  const members = [resolved];
  for (const member of resolved.allOf ?? []) {
    members.push(...membersOf(member, defs));
  }
  return members;
}

function typesOf(node: SchemaNode): readonly (string | undefined)[] {
  const declared = node.type;
  if (typeof declared === "string" || declared === undefined) {
    return [declared];
  }
  return declared;
}

function readScalarShape(
  def: string | undefined,
  node: SchemaNode
): FieldShape | undefined {
  const types = typesOf(node);
  if (node.enum !== undefined) {
    return { kind: "enum", values: node.enum };
  }
  if (types.includes("boolean")) {
    return { kind: "boolean" };
  }
  if (types.includes("number") || types.includes("integer")) {
    return {
      kind: "number",
      ...(node.maximum === undefined ? {} : { maximum: node.maximum }),
      ...(node.minimum === undefined ? {} : { minimum: node.minimum }),
    };
  }
  if (!types.includes("string")) {
    return undefined;
  }
  if (def === "MarkdownString") {
    return { kind: "markdown" };
  }
  if (def === "PlainString") {
    return { kind: "plain" };
  }
  // A `format` is a constraint the seed has to honour: `embed.url` is a URI, and
  // an empty string is not one.
  return {
    kind: "string",
    ...(node.format === undefined ? {} : { format: node.format }),
  };
}

/**
 * The editable fields of an object node — whether that node is a `$ref` or an
 * object written inline. Arrays of items are inline in this schema
 * (`ChecklistBlock.items.items`), so a reader that only followed `$ref` seeded
 * those items as `{}` and produced blocks the validator rejected.
 */
function readFieldsOf(node: SchemaNode, defs: Defs, depth = 0): FieldSpec[] {
  const declared = new Map<string, SchemaNode>();
  const required = new Set<string>();
  const members = membersOf(node, defs);

  for (const member of members) {
    for (const [key, child] of Object.entries(member.properties ?? {})) {
      if (!NON_CONTENT_KEYS.has(key)) {
        declared.set(key, child);
      }
    }
    for (const key of member.required ?? []) {
      required.add(key);
    }
  }

  // A block may state its required content as *alternatives* rather than as a
  // required list — `codeDiff` is either `unified`, or `before` + `after`. Without
  // taking the first alternative the block is born unsatisfiable.
  for (const member of members) {
    const alternative = (member.oneOf ?? [])
      .map((branch) => branch.required ?? [])
      .find((keys) => keys.length > 0);
    for (const key of alternative ?? []) {
      required.add(key);
    }
    if (alternative !== undefined) {
      break;
    }
  }

  return [...declared].map(([key, child]) => {
    const { def: fieldDef, node: fieldNode } = deref(child, defs);
    return {
      key,
      required: required.has(key),
      shape: readShape(fieldDef, fieldNode, defs, depth),
    };
  });
}

/** Whether the schema requires a machine handle on this node. */
function nodeRequiresHandle(node: SchemaNode, defs: Defs): boolean {
  return membersOf(node, defs).some(
    (member) => member.required?.includes("@id") === true
  );
}

function readShape(
  def: string | undefined,
  node: SchemaNode,
  defs: Defs,
  depth = 0
): FieldShape {
  const scalar = readScalarShape(def, node);
  if (scalar !== undefined) {
    return scalar;
  }
  const types = typesOf(node);
  if (types.includes("array")) {
    const items = deref(node.items ?? {}, defs);
    const itemTypes = typesOf(items.node);
    if (itemTypes.includes("string") && items.node.enum === undefined) {
      return { kind: "stringArray" };
    }
    const bounds =
      node.minItems === undefined ? {} : { minItems: node.minItems };
    if (depth >= MAX_SHAPE_DEPTH) {
      return { kind: "complex", array: true, ...bounds };
    }
    return {
      kind: "complex",
      array: true,
      itemFields: readFieldsOf(items.node, defs, depth + 1),
      ...(nodeRequiresHandle(items.node, defs)
        ? { itemRequiresHandle: true }
        : {}),
      ...bounds,
    };
  }
  if (depth >= MAX_SHAPE_DEPTH) {
    return { kind: "complex", array: false };
  }
  return {
    kind: "complex",
    array: false,
    itemFields: readFieldsOf(node, defs, depth + 1),
    ...(nodeRequiresHandle(node, defs) ? { itemRequiresHandle: true } : {}),
  };
}

function readCatalog(version: SchemaVersion): Map<string, BlockSpec> {
  const schema = getSchema(version, "document.schema.json") as {
    $defs?: Defs;
  };
  const defs = schema.$defs ?? {};
  const catalog = new Map<string, BlockSpec>();

  // `Block` is a `oneOf` of the block definitions; each declares its own `type`.
  const branches = (defs.Block as { oneOf?: readonly SchemaNode[] } | undefined)
    ?.oneOf;
  for (const branch of branches ?? []) {
    if (branch.$ref === undefined) {
      continue;
    }
    const def = defNameOf(branch.$ref);
    const target = defs[def];
    if (target === undefined) {
      continue;
    }
    let type: string | undefined;
    let requiresHandle = false;
    for (const member of membersOf(target, defs)) {
      const declared = member.properties?.type?.const;
      if (typeof declared === "string") {
        type = declared;
      }
      if (member.required?.includes("@id") === true) {
        requiresHandle = true;
      }
    }
    if (type === undefined) {
      continue;
    }
    catalog.set(type, {
      fields: readFieldsOf(target, defs),
      requiresHandle,
      type,
    });
  }
  return catalog;
}

function catalogFor(version: SchemaVersion): Map<string, BlockSpec> {
  const cached = catalogs.get(version);
  if (cached !== undefined) {
    return cached;
  }
  const catalog = readCatalog(version);
  catalogs.set(version, catalog);
  return catalog;
}

/** Every block type the schema declares, in schema order. */
export function listBlockTypes(
  version: SchemaVersion = supportedSchemaVersions[1] as SchemaVersion
): readonly string[] {
  return [...catalogFor(version).keys()];
}

/** The fields of one block type, or `undefined` when it is not declared. */
export function readBlockSpec(
  type: string,
  version: SchemaVersion = supportedSchemaVersions[1] as SchemaVersion
): BlockSpec | undefined {
  return catalogFor(version).get(type);
}

type Mint = () => string;

function seedValue(shape: FieldShape, mint: Mint): unknown {
  switch (shape.kind) {
    case "plain":
      // Required, and `minLength: 1`: the author types over this.
      return PLACEHOLDER;
    case "markdown":
      return "";
    case "string":
      return shape.format === "uri" ? PLACEHOLDER_URI : "";
    case "number": {
      const floor = shape.minimum ?? 0;
      return shape.maximum === undefined
        ? floor
        : Math.min(floor, shape.maximum);
    }
    case "boolean":
      return false;
    case "enum":
      return shape.values[0] ?? "";
    case "stringArray":
      return [""];
    default: {
      const fields = shape.itemFields ?? [];
      const one = (): Record<string, unknown> => {
        const value = seedFields(fields, mint);
        // A structured object usually carries its own handle, and the schema
        // requires it: without one the block is born invalid.
        if (shape.itemRequiresHandle === true) {
          value["@id"] = mint();
        }
        return value;
      };
      if (!shape.array) {
        return one();
      }
      return Array.from({ length: shape.minItems ?? 0 }, one);
    }
  }
}

function seedFields(
  fields: readonly FieldSpec[],
  mint: Mint
): Record<string, unknown> {
  const value: Record<string, unknown> = {};
  for (const field of fields) {
    if (field.required) {
      value[field.key] = seedValue(field.shape, mint);
    }
  }
  return value;
}

/**
 * A new block of `type`, seeded so that it already satisfies the schema.
 *
 * Structure comes from the schema; the content floors a `PlainString` imposes are
 * filled with a placeholder, because a palette entry that lands as an invalid
 * block teaches the author to ignore validation.
 */
export function createBlock(
  type: string,
  version: SchemaVersion,
  document: unknown
): Record<string, unknown> {
  const spec = readBlockSpec(type, version);
  if (spec === undefined) {
    throw new Error(`schema 里没有这个块类型：${type}`);
  }
  const mint = handleMinter(usedAtIds(document));
  const block: Record<string, unknown> = { type };
  Object.assign(block, seedFields(spec.fields, mint));
  if (spec.requiresHandle) {
    block["@id"] = mint();
  }
  return block;
}

/** A handle source that never repeats one it has already issued. */
function handleMinter(used: Set<string>): Mint {
  return () => {
    let handle = generateAtId();
    while (used.has(handle)) {
      handle = generateAtId();
    }
    used.add(handle);
    return handle;
  };
}
