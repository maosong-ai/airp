/**
 * The app: a column of editable blocks on the left, the Renderer's own output on
 * the right.
 *
 * The two panes have different jobs and that is the point. The left is an editor
 * built from the schema — every block's controls are derived from
 * `document.schema.json`, so a block type the schema gains is editable here
 * without a change in this file. The right is not an editor at all: it is what
 * `airp-render` would write, asked for through the shared render service, so what
 * the author sees beside the form is the file, not an impression of it.
 *
 * There is no sidebar: the document is the whole surface, and everything else
 * appears at the caret (the `/` menu) or behind the page's own `•••`.
 */

import { loadDocumentJson } from "@airp/loader";
import {
  hasSchemaVersion,
  type SchemaVersion,
  supportedSchemaVersions,
} from "@airp/protocol";
import { isRecord } from "@airp/utils";
import "./styles.css";
import { blockMeta, menuGroups } from "./blocks.js";
import {
  insertAt,
  moveAt,
  type NodePath,
  readAt,
  removeAt,
  serialize,
  setAt,
  usedAtIds,
  withFreshAtIds,
} from "./kernel.js";
import { renderPreview } from "./preview.js";
import {
  createBlock,
  type FieldShape,
  type FieldSpec,
  listBlockTypes,
  readBlockSpec,
} from "./schema.js";
import {
  fileNameOf,
  formatStamp,
  lastUpdatedOf,
  titleOf,
  withUpdatedAt,
} from "./stamp.js";

const VERSION = (supportedSchemaVersions.at(-1) ?? "1.1.0") as SchemaVersion;
const DEBOUNCE_MS = 300;
/** A field whose whole text is a slash command. */
const SLASH_QUERY = /^\/(\S*)$/;

function byId<T extends HTMLElement>(id: string): T {
  const found = document.getElementById(id);
  if (found === null) {
    throw new Error(`Missing element #${id}`);
  }
  return found as T;
}

const editorEl = byId<HTMLElement>("editor");
const previewFrame = byId<HTMLIFrameElement>("preview");
const previewState = byId<HTMLElement>("preview-state");
const previewVersion = byId<HTMLElement>("preview-version");
const stateEl = byId<HTMLElement>("state");
const titleEl = byId<HTMLElement>("title");
const sourceArea = byId<HTMLTextAreaElement>("source");
const pageMenu = byId<HTMLElement>("page-menu");
const menuButton = byId<HTMLButtonElement>("menu-button");
const fileInput = byId<HTMLInputElement>("file");

/* ── state ──────────────────────────────────────────────────────────────── */

/**
 * A new page is empty, with no content of any kind.
 *
 * The author adds the first block themselves — which is also why the empty state
 * has to offer a way in (see `renderEditor`).
 */
function emptyDocument(): Record<string, unknown> {
  return {
    blocks: [],
    i18n: { locale: "zh-CN" },
    meta: {
      createdAt: new Date().toISOString(),
      kind: "generic",
      title: "未命名报告",
    },
    schemaVersion: VERSION,
  };
}

let airpDocument: unknown = emptyDocument();
/**
 * The file this document lives in, once it has one.
 *
 * Deliberately outside the document: where a file sits is the host's business,
 * and writing a handle into the JSON would make the document depend on the
 * machine that saved it. It is also why a refresh starts empty — that is not a
 * bug, it is what "not saved yet" means.
 */
let fileHandle: FileSystemFileHandle | undefined;

/** The picker is not in the DOM typings; it is Chromium's, and it is optional. */
interface FilePickerWindow {
  showSaveFilePicker?: (options: {
    suggestedName?: string;
    types?: { accept: Record<string, string[]>; description: string }[];
  }) => Promise<FileSystemFileHandle>;
}

const SAVE_TYPES = [
  {
    accept: { "application/json": [".airp.json", ".json"] },
    description: "AIRP 文档",
  },
];
let dirty = false;
let undoStack: unknown[] = [];
let redoStack: unknown[] = [];

function blocksPath(): NodePath {
  return ["blocks"];
}

function blockCount(): number {
  const blocks = readAt(airpDocument, blocksPath());
  return Array.isArray(blocks) ? blocks.length : 0;
}

/**
 * Every change goes through here, so undo and the preview cannot drift.
 *
 * `rerender` is false for a keystroke: repainting the editor would replace the
 * control the author is typing into and take the caret with it. Structural
 * changes — insert, delete, move, turn into — do repaint, because the shape of
 * the column changed.
 */
function commit(next: unknown, rerender = true): void {
  undoStack = [...undoStack, airpDocument].slice(-100);
  redoStack = [];
  airpDocument = next;
  dirty = true;
  if (rerender) {
    renderEditor();
  }
  schedulePreview();
}

function undo(): void {
  const previous = undoStack.at(-1);
  if (previous === undefined) {
    return;
  }
  undoStack = undoStack.slice(0, -1);
  redoStack = [...redoStack, airpDocument];
  airpDocument = previous;
  dirty = true;
  renderEditor();
  schedulePreview();
}

function redo(): void {
  const next = redoStack.at(-1);
  if (next === undefined) {
    return;
  }
  redoStack = redoStack.slice(0, -1);
  undoStack = [...undoStack, airpDocument];
  airpDocument = next;
  dirty = true;
  renderEditor();
  schedulePreview();
}

function say(text: string, isError = false): void {
  stateEl.textContent = text;
  stateEl.classList.toggle("is-error", isError);
}

function statusLine(): void {
  const where = fileHandle?.name;
  const state = dirty || where === undefined ? "未保存" : `已保存到 ${where}`;
  say(`${blockCount()} 个块 · ${state}`);
}

/* ── preview ────────────────────────────────────────────────────────────── */

let previewTimer: number | undefined;
let previewSeq = 0;

/**
 * The width the Renderer's layout is designed around.
 *
 * Its content column is `max-w-4xl` (896px) inside `sm:px-6` padding, so at 960px
 * the column has reached its maximum and the layout stops changing — wider only
 * adds margin. That makes 960 the document as designed, and the number worth
 * previewing at.
 */
const PREVIEW_WIDTH = 960;

/**
 * Lay the frame out at the design width, then scale it into the pane.
 *
 * The bytes were never the problem: the pane receives exactly what `airp-render`
 * writes. The *composition* was — the Renderer's markup is responsive, so a pane
 * of another width is a preview of another document.
 */
function fitPreview(): void {
  const body = previewFrame.parentElement;
  if (body === null || body.clientWidth === 0) {
    return;
  }
  const scale = body.clientWidth / PREVIEW_WIDTH;
  previewFrame.style.transform = `scale(${scale})`;
  // The frame lays out at the design width, so it must be taller than the pane by
  // the same factor to fill it once scaled.
  previewFrame.style.height = `${body.clientHeight / scale}px`;
}

window.addEventListener("resize", fitPreview);

/**
 * What the pane's own head says: which protocol the document is, and when it was
 * last saved. Both come from the document, not from the render.
 */
function renderStamps(): void {
  previewVersion.textContent = `v${VERSION}`;
  const stamp = lastUpdatedOf(airpDocument);
  previewState.textContent =
    stamp === undefined ? "" : `最后更新 ${formatStamp(stamp)}`;
}

function schedulePreview(): void {
  statusLine();
  renderStamps();
  window.clearTimeout(previewTimer);
  previewTimer = window.setTimeout(refreshPreview, DEBOUNCE_MS);
}

/** Render, and put a failure where the author can see it. */
function refreshPreview(): void {
  runPreview().catch((error: unknown) => {
    say(error instanceof Error ? error.message : String(error), true);
  });
}

async function runPreview(): Promise<void> {
  previewSeq += 1;
  const seq = previewSeq;
  const result = await renderPreview(airpDocument);
  // A slower render must not overwrite a newer one.
  if (seq !== previewSeq) {
    return;
  }
  if (!result.ok) {
    say("渲染失败", true);
    previewFrame.srcdoc = `<pre style="padding:16px;font:12px ui-monospace">${escapeHtml(result.message)}</pre>`;
    return;
  }
  renderStamps();
  previewFrame.srcdoc = result.body;
  if (!sourceArea.hidden) {
    sourceArea.value = serialize(airpDocument);
  }
}

function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

/* ── the slash menu ─────────────────────────────────────────────────────── */

interface MenuEntry {
  label: string;
  type: string;
}

const slashMenu = document.createElement("div");
slashMenu.className = "menu type-menu";
slashMenu.hidden = true;
document.body.append(slashMenu);

let slashEntries: MenuEntry[] = [];
let slashIndex = 0;
let slashQuery = "";
let slashAnchor: HTMLElement | undefined;
/** What choosing a type does to the document. */
type TypeMode = "append" | "insert-after" | "turn-into";

interface TypeTarget {
  /** The line the choice is relative to. */
  blockPath: NodePath;
  /** Where a `/query` is being typed, when the menu came from a field. */
  fieldPath?: NodePath;
  mode: TypeMode;
}

let slashTarget: TypeTarget | undefined;

function closeSlashMenu(): void {
  slashMenu.hidden = true;
  slashTarget = undefined;
  slashAnchor = undefined;
  slashQuery = "";
}

function chooseSlashEntry(entry: MenuEntry): void {
  const target = slashTarget;
  closeSlashMenu();
  if (target === undefined) {
    return;
  }
  const { blockPath, fieldPath, mode } = target;

  // The `/query` the author typed to open the menu is scaffolding, not content:
  // it is cleared before anything else happens, or it ends up in the document.
  const cleared =
    fieldPath === undefined ? airpDocument : setAt(airpDocument, fieldPath, "");
  const parent = blockPath.slice(0, -1);
  const index = Number(blockPath.at(-1));
  const born = createBlock(entry.type, VERSION, cleared);

  if (mode === "append") {
    // The operation line asked for this: it is not a block, so there is nothing
    // to clear and nothing to replace — the block simply joins the end.
    const blocks = readAt(cleared, blocksPath());
    const at = Array.isArray(blocks) ? blocks.length : 0;
    commit(insertAt(cleared, blocksPath(), at, born));
    focusFirstControl(["blocks", at]);
    return;
  }

  if (mode === "turn-into") {
    // 转为 rebuilds the block, so the author's words have to come with it —
    // otherwise being told to use 转为 instead of `/` would mean losing text.
    commit(
      setAt(cleared, blockPath, carryText(born, readAt(cleared, blockPath)))
    );
    focusFirstControl(blockPath);
    return;
  }
  commit(insertAt(cleared, parent, index + 1, born));
  focusFirstControl([...parent, index + 1]);
}

/* ── the block menu behind the ⋮⋮ handle ─────────────────────────────────── */

const blockMenu = document.createElement("div");
blockMenu.className = "menu block-menu";
blockMenu.hidden = true;
document.body.append(blockMenu);

function closeBlockMenu(): void {
  blockMenu.hidden = true;
}

/**
 * What Notion puts behind the handle: reorder, duplicate, convert, delete.
 *
 * The handle is also the drag grip. Reordering by dragging is separate work, so
 * the moves live here as commands and the handle is useful today.
 */
function openBlockMenu(anchor: HTMLElement, blockPath: NodePath): void {
  const parent = blockPath.slice(0, -1);
  const index = Number(blockPath.at(-1));
  const siblings = readAt(airpDocument, parent);
  const last = Array.isArray(siblings) ? siblings.length - 1 : index;

  const items: { label: string; run: () => void }[] = [];
  if (index > 0) {
    items.push({
      label: "上移",
      run: () => {
        commit(moveAt(airpDocument, blockPath, index - 1));
      },
    });
  }
  if (index < last) {
    items.push({
      label: "下移",
      run: () => {
        commit(moveAt(airpDocument, blockPath, index + 1));
      },
    });
  }
  items.push(
    {
      label: "复制",
      run: () => {
        commit(
          insertAt(
            airpDocument,
            parent,
            index + 1,
            withFreshAtIds(
              readAt(airpDocument, blockPath),
              usedAtIds(airpDocument)
            )
          )
        );
      },
    },
    {
      label: "转为…",
      run: () => {
        openSlashMenu("", anchor, { blockPath, mode: "turn-into" });
      },
    },
    {
      label: "删除",
      run: () => {
        commit(removeAt(airpDocument, blockPath));
      },
    }
  );

  blockMenu.replaceChildren(
    ...items.map((item) => {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = item.label;
      button.addEventListener("mousedown", (event) => {
        event.preventDefault();
        closeBlockMenu();
        item.run();
      });
      return button;
    })
  );
  blockMenu.hidden = false;
  positionMenu(blockMenu, anchor);
}

/** The first field of a type that the author types text into. */
function firstTextKey(block: Record<string, unknown>): string | undefined {
  const fields = readBlockSpec(String(block.type), VERSION)?.fields ?? [];
  return (
    fields.find((field) => isTextShape(field.shape) && field.required)?.key ??
    fields.find((field) => isTextShape(field.shape))?.key
  );
}

/**
 * Move a converted block's text onto the block that replaces it.
 *
 * 转为 rebuilds the block from the schema, and a rebuild throws its content away.
 * Types do not share field names — a callout's prose is `body`, a paragraph's is
 * `text` — so the value is carried by *position in the type's own shape*, which is
 * the only thing the two have in common.
 */
function carryText(
  born: Record<string, unknown>,
  previous: unknown
): Record<string, unknown> {
  if (!isRecord(previous)) {
    return born;
  }
  const from = firstTextKey(previous);
  const to = firstTextKey(born);
  const value = from === undefined ? undefined : previous[from];
  if (
    to !== undefined &&
    typeof value === "string" &&
    value.length > 0 &&
    born[to] === ""
  ) {
    born[to] = value;
  }
  return born;
}

function openSlashMenu(
  query: string,
  anchor: HTMLElement,
  target: TypeTarget
): void {
  slashTarget = target;
  slashAnchor = anchor;
  slashQuery = query;
  if (!refreshSlashEntries()) {
    return;
  }
  slashMenu.hidden = false;
  positionMenu(slashMenu, anchor);
}

/**
 * Recompute the list from the query.
 *
 * The menu is filterable whether it was opened by `/` (where the field owns the
 * query) or by a line's `+` (where the menu owns it) — Notion's content menu can
 * be typed into either way.
 */
function refreshSlashEntries(): boolean {
  const needle = slashQuery.toLowerCase();
  // Every type the schema declares, not a shortlist: a menu that shows only some
  // of them makes the rest discoverable only by guessing at a query.
  slashEntries = menuGroups(listBlockTypes(VERSION))
    .flatMap((group) => group.items)
    .filter(
      (entry) =>
        needle === "" ||
        entry.type.toLowerCase().includes(needle) ||
        entry.label.includes(slashQuery)
    );
  if (slashEntries.length === 0) {
    closeSlashMenu();
    return false;
  }
  slashIndex = 0;
  renderSlashMenu();
  return true;
}

/** Put a menu under the control that opened it. */
function positionMenu(menu: HTMLElement, anchor: HTMLElement): void {
  const box = anchor.getBoundingClientRect();
  menu.style.top = `${box.bottom + 4}px`;
  menu.style.left = `${box.left}px`;
}

/**
 * Let a prose field take the height its text needs.
 *
 * Only meaningful once the field is in the document: a detached element has no
 * `scrollHeight`, so measuring one would collapse it to its padding. That is why
 * the first measurement happens in `growAllFields`, after the rows are attached.
 */
function growField(field: Element): void {
  if (!(field instanceof HTMLTextAreaElement)) {
    return;
  }
  field.style.height = "auto";
  field.style.height = `${field.scrollHeight}px`;
}

/** Every prose field in the editor, at the height its own text needs. */
function growAllFields(): void {
  for (const field of editorEl.querySelectorAll("textarea.field-input")) {
    growField(field);
  }
}

/** Whether the keystroke is going into something the author is typing in. */
function isTextEntry(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement
  );
}

/**
 * Let the menu own the keyboard when the query is not coming from a field.
 *
 * Opened by `/`, the field is what the author types into and it feeds the query.
 * Opened by a line's `+`, nothing is focused but a button — so without this not
 * one letter would reach the menu. Answers whether it consumed the keystroke.
 */
function typeIntoMenu(event: KeyboardEvent): boolean {
  if (isTextEntry(event.target) || event.metaKey || event.ctrlKey) {
    return false;
  }
  if (event.key === "Backspace") {
    event.preventDefault();
    slashQuery = slashQuery.slice(0, -1);
    refreshSlashEntries();
    return true;
  }
  if (event.key.length !== 1) {
    return false;
  }
  event.preventDefault();
  slashQuery += event.key;
  refreshSlashEntries();
  if (slashAnchor !== undefined) {
    positionMenu(slashMenu, slashAnchor);
  }
  return true;
}

function renderSlashMenu(): void {
  slashMenu.replaceChildren(
    ...slashEntries.map((entry, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = index === slashIndex ? "is-active" : "";
      button.textContent = entry.label;
      button.addEventListener("mousedown", (event) => {
        event.preventDefault();
        chooseSlashEntry(entry);
      });
      return button;
    })
  );
}

document.addEventListener("keydown", (event) => {
  const accelerator = event.metaKey || event.ctrlKey;
  if (handleSaveShortcut(event)) {
    return;
  }
  if (accelerator && event.key.toLowerCase() === "z") {
    event.preventDefault();
    if (event.shiftKey) {
      redo();
    } else {
      undo();
    }
    return;
  }
  if (slashMenu.hidden) {
    return;
  }
  if (typeIntoMenu(event)) {
    return;
  }
  if (event.key === "ArrowDown" || event.key === "ArrowUp") {
    event.preventDefault();
    const step = event.key === "ArrowDown" ? 1 : -1;
    slashIndex =
      (slashIndex + step + slashEntries.length) %
      Math.max(slashEntries.length, 1);
    renderSlashMenu();
    return;
  }
  if (event.key === "Enter" || event.key === "Tab") {
    event.preventDefault();
    const entry = slashEntries[slashIndex];
    if (entry !== undefined) {
      chooseSlashEntry(entry);
    }
    return;
  }
  if (event.key === "Escape") {
    closeSlashMenu();
  }
});

document.addEventListener("mousedown", (event) => {
  const target = event.target as Node;
  // A click inside either menu is a command, not a dismissal — and 「转为…」 opens
  // the type menu from inside the block menu, so dismissing on it would close the
  // menu that was just opened.
  if (slashMenu.contains(target) || blockMenu.contains(target)) {
    return;
  }
  closeSlashMenu();
  closeBlockMenu();
});

/* ── the editor ─────────────────────────────────────────────────────────── */

function isTextShape(shape: FieldShape): boolean {
  return (
    shape.kind === "plain" ||
    shape.kind === "markdown" ||
    shape.kind === "string"
  );
}

/** Blocks hold blocks when their items look like blocks. */
function holdsBlocks(value: unknown): boolean {
  if (!Array.isArray(value)) {
    return false;
  }
  return value.every(
    (item) =>
      isRecord(item) &&
      typeof item.type === "string" &&
      readBlockSpec(item.type, VERSION) !== undefined
  );
}

function textControl(
  value: unknown,
  multi: boolean,
  onInput: (next: string) => void,
  onSlash?: (query: string, anchor: HTMLElement) => void,
  placeholder?: string
): HTMLElement {
  const field = multi
    ? document.createElement("textarea")
    : document.createElement("input");
  if (field instanceof HTMLInputElement) {
    field.type = "text";
  }
  field.className = multi ? "field-input is-multiline" : "field-input";
  field.value = typeof value === "string" ? value : "";
  if (placeholder !== undefined) {
    field.placeholder = placeholder;
  }
  if (multi) {
    // One line by default, not two: a line of prose is one line of prose, and it
    // grows with what is written into it.
    (field as HTMLTextAreaElement).rows = 1;
  }

  const grow = (): void => {
    growField(field);
  };
  const handleInput = (): void => {
    const text = field.value;
    // Only a field that offers the command menu looks for a command. Elsewhere a
    // `/` is a slash, and typing one must not pop anything up.
    if (onSlash !== undefined) {
      const slash = SLASH_QUERY.exec(text);
      if (slash === null) {
        closeSlashMenu();
      } else {
        onSlash(slash[1] ?? "", field);
      }
    }
    onInput(text);
    grow();
  };
  field.addEventListener("input", (event) => {
    // An unfinished IME composition is not text yet. Acting on it would commit
    // half a character — and on the operation line it would replace the very
    // element being composed in, so typing Chinese would be impossible.
    if ((event as InputEvent).isComposing) {
      return;
    }
    handleInput();
  });
  field.addEventListener("compositionend", () => {
    handleInput();
    grow();
  });
  field.addEventListener("blur", () => {
    closeSlashMenu();
  });
  return field;
}

function controlFor(
  field: FieldSpec,
  value: unknown,
  path: NodePath,
  placeholder?: string
): HTMLElement {
  // `path` already points at this field: `renderBlock` hands over
  // `[...blockPath, field.key]`, so appending the key again would address
  // `.../text/text` and throw.
  const set = (next: unknown, rerender = false): void => {
    commit(setAt(airpDocument, path, next), rerender);
  };
  const shape = field.shape;

  switch (shape.kind) {
    case "plain":
    case "markdown":
    case "string":
      return textControl(
        value,
        shape.kind === "markdown",
        (text) => {
          set(text);
        },
        // `/` belongs to the operation line. On a block that already exists, its
        // type is changed deliberately — `⋮⋮` → 转为 — so a stray slash stays a
        // slash and pops up nothing.
        undefined,
        placeholder
      );
    case "boolean": {
      const input = document.createElement("input");
      input.type = "checkbox";
      input.checked = value === true;
      input.addEventListener("change", () => {
        set(input.checked);
      });
      return input;
    }
    case "enum": {
      const select = document.createElement("select");
      select.className = "field-input";
      if (!field.required) {
        const empty = document.createElement("option");
        empty.value = "";
        empty.textContent = "（未设置）";
        select.append(empty);
      }
      for (const option of shape.values) {
        const node = document.createElement("option");
        node.value = option;
        node.textContent = option;
        select.append(node);
      }
      select.value = typeof value === "string" ? value : "";
      select.addEventListener("change", () => {
        set(select.value === "" ? undefined : select.value);
      });
      return select;
    }
    case "number": {
      const input = document.createElement("input");
      input.type = "number";
      input.className = "field-input";
      input.value = typeof value === "number" ? String(value) : "";
      input.addEventListener("input", () => {
        set(input.value === "" ? undefined : Number(input.value));
      });
      return input;
    }
    case "stringArray": {
      const list = document.createElement("div");
      list.className = "item-list";
      const items = Array.isArray(value) ? value : [];
      items.forEach((item, index) => {
        const row = document.createElement("div");
        row.className = "item-row";
        const input = textControl(
          item,
          false,
          (text) => {
            set(items.map((each, at) => (at === index ? text : each)));
          },
          () => {
            /* a list item is not a place a block is born */
          }
        );
        const remove = document.createElement("button");
        remove.type = "button";
        remove.className = "row-action";
        remove.textContent = "−";
        remove.title = "删除这一项";
        remove.addEventListener("click", () => {
          set(
            items.filter((_, at) => at !== index),
            true
          );
        });
        row.append(input, remove);
        list.append(row);
      });
      const add = document.createElement("button");
      add.type = "button";
      add.className = "row-action";
      add.textContent = "+";
      add.title = "增加一项";
      add.addEventListener("click", () => {
        set([...items, ""], true);
      });
      list.append(add);
      return list;
    }
    default: {
      // Structured fields the schema declares but this pass does not edit.
      return summaryFor(value);
    }
  }
}

function summaryFor(value: unknown): HTMLElement {
  const summary = document.createElement("div");
  summary.className = "field-summary";
  const count = Array.isArray(value) ? `${value.length} 项` : "结构化";
  summary.textContent = `${count} · 暂不可在此编辑`;
  return summary;
}

/* ── reordering by dragging the handle ───────────────────────────────────── */

/** How far the pointer moves before a press becomes a drag rather than a click. */
const DRAG_THRESHOLD = 4;

/** Digits only, for reading an index back out of a `data-path`. */
const DIGITS = /^\d+$/;

function pathFromDataset(value: string): NodePath {
  return value
    .split("/")
    .map((segment) => (DIGITS.test(segment) ? Number(segment) : segment));
}

interface DragState {
  /** Rects captured before anything moved: every measurement is off these. */
  boxes: DOMRect[];
  from: number;
  row: HTMLElement;
  siblings: HTMLElement[];
  startY: number;
  to: number;
}

let drag: DragState | undefined;

/** True once the pointer has moved far enough that this is a drag, not a click. */
let dragging = false;
/** Set when a drag ends, so the click that follows it opens nothing. */
let justDragged = false;

/**
 * Start a drag from the handle.
 *
 * Only rows that share a parent take part, and the drop lands in that same parent
 * — dragging a block into a `section` is deliberately not supported, so the
 * target is always one of these siblings.
 */
function beginDrag(
  event: PointerEvent,
  row: HTMLElement,
  handle: HTMLElement
): void {
  // A new press is a new interaction: the click that ended the *previous* drag is
  // long gone by now, so the flag has to be cleared here. Waiting for a click to
  // clear it swallowed the next honest click on the handle.
  justDragged = false;
  const parent = row.parentElement;
  if (parent === null) {
    return;
  }
  const siblings = [...parent.children].filter(
    (child): child is HTMLElement =>
      child instanceof HTMLElement && child.dataset.path !== undefined
  );
  const from = siblings.indexOf(row);
  if (from < 0) {
    return;
  }
  drag = {
    boxes: siblings.map((sibling) => sibling.getBoundingClientRect()),
    from,
    row,
    siblings,
    startY: event.clientY,
    to: from,
  };
  try {
    handle.setPointerCapture(event.pointerId);
  } catch {
    // The pointer can already be gone by the time this runs. Capture is a
    // convenience — the handlers are on the handle either way.
  }
  event.preventDefault();
}

/** Move the row under the pointer and let its siblings slide out of the way. */
function updateDrag(event: PointerEvent): void {
  const state = drag;
  if (state === undefined) {
    return;
  }
  const dy = event.clientY - state.startY;
  if (!dragging && Math.abs(dy) < DRAG_THRESHOLD) {
    return;
  }
  if (!dragging) {
    dragging = true;
    state.row.dataset.dragging = "true";
    document.body.classList.add("is-dragging");
  }

  const startBox = state.boxes[state.from];
  const centre =
    (startBox === undefined ? 0 : startBox.top + startBox.height / 2) + dy;

  // Which slot the dragged row's centre now sits in. A slot is claimed once its
  // own midpoint is passed, which is what makes the row swap feel immediate.
  let to = state.from;
  state.boxes.forEach((box, index) => {
    if (index === state.from) {
      return;
    }
    const middle = box.top + box.height / 2;
    if (index < state.from && centre < middle) {
      to = Math.min(to, index);
    }
    if (index > state.from && centre > middle) {
      to = Math.max(to, index);
    }
  });
  state.to = to;

  const shift = startBox?.height ?? 0;
  state.siblings.forEach((sibling, index) => {
    if (index === state.from) {
      return;
    }
    const makesRoom =
      state.from < to
        ? index > state.from && index <= to
        : index >= to && index < state.from;
    sibling.style.transform = makesRoom
      ? `translateY(${state.from < to ? -shift : shift}px)`
      : "";
  });
  // The lifted row follows the pointer exactly, so it carries no transition.
  state.row.style.transform = `translateY(${dy}px)`;
}

/** Drop the row: clear the animation state, then change the document for real. */
function endDrag(): void {
  const state = drag;
  drag = undefined;
  if (state === undefined) {
    dragging = false;
    return;
  }
  for (const sibling of state.siblings) {
    sibling.style.transform = "";
  }
  state.row.style.transform = "";
  delete state.row.dataset.dragging;
  document.body.classList.remove("is-dragging");
  if (!dragging) {
    return;
  }
  dragging = false;
  justDragged = true;
  if (state.to === state.from) {
    return;
  }
  const path = state.row.dataset.path;
  if (path !== undefined) {
    commit(moveAt(airpDocument, pathFromDataset(path), state.to));
  }
}

/** The grip: press and it drags, click and it opens the block menu. */
function draggingHandle(
  type: string,
  row: HTMLElement,
  open: (button: HTMLElement) => void
): HTMLElement {
  const handle = gutterAction(
    "⋮⋮",
    `${blockMeta(type).label} · 拖拽移动、打开菜单`,
    open,
    "menu"
  );
  handle.addEventListener("pointerdown", (event) => {
    beginDrag(event, row, handle);
  });
  handle.addEventListener("pointermove", updateDrag);
  handle.addEventListener("pointerup", endDrag);
  handle.addEventListener("pointercancel", endDrag);
  return handle;
}

/** One gutter button: quiet until the line is under the pointer. */
function gutterAction(
  glyph: string,
  title: string,
  open: (button: HTMLElement) => void,
  kind: "add" | "menu"
): HTMLElement {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "gutter-action";
  // A stable name for the two handles: their tooltips carry prose (and the block
  // type), so matching on those would break the moment the wording changes.
  button.dataset.gutter = kind;
  button.textContent = glyph;
  button.title = title;
  button.addEventListener("click", () => {
    // A press that turned into a drag ends with a click event too. It is not a
    // request to open the menu.
    if (justDragged) {
      justDragged = false;
      return;
    }
    open(button);
  });
  return button;
}

/** Render one block: its chrome, its fields, and any blocks it contains. */
function renderBlock(
  block: unknown,
  path: NodePath,
  depth: number
): HTMLElement {
  const node = isRecord(block) ? block : {};
  const type = typeof node.type === "string" ? node.type : "unknown";
  const row = document.createElement("article");
  row.className = "block";
  row.dataset.blockType = type;
  row.dataset.path = path.join("/");
  row.style.marginLeft = `${depth * 22}px`;

  // The gutter is Notion's way in: `+` opens the content menu, `⋮⋮` the block
  // menu. Both appear together under the pointer, so a line is added where the
  // author is looking rather than only at the end of the document.
  const gutter = document.createElement("div");
  gutter.className = "block-gutter";
  gutter.append(
    gutterAction(
      "＋",
      "点击添加内容块",
      (button) => {
        openSlashMenu("", button, { blockPath: path, mode: "insert-after" });
      },
      "add"
    ),
    draggingHandle(type, row, (button) => {
      openBlockMenu(button, path);
    })
  );

  // No label above the field. It used to sit there, which pushed the field down
  // by its own height and left the gutter handles floating above the line they
  // belong to. The type now rides on the handle's tooltip instead.
  row.append(gutter);

  const spec = readBlockSpec(type, VERSION);
  // No hint. It used to say `输入“/”唤起命令` on an empty paragraph too, which is
  // a lie now that `/` only works on the operation line — and two lines showing
  // the same sentence makes a real block look like the affordance.
  for (const field of spec?.fields ?? []) {
    const value = node[field.key];
    if (!(field.required || value !== undefined)) {
      continue;
    }
    const isBlocks = holdsBlocks(value);
    const wrap = document.createElement("div");
    wrap.className = "field";
    // No caption above the control. `text *` read as a form field, pushed the
    // control down out of line with the hover handles, and told the author
    // nothing they could not see: whether a document is complete is validation's
    // business, not an asterisk's.

    if (isBlocks && Array.isArray(value)) {
      const list = document.createElement("div");
      list.className = "nested";
      value.forEach((child, at) => {
        list.append(renderBlock(child, [...path, field.key, at], depth + 1));
      });
      wrap.append(list);
    } else {
      wrap.append(
        controlFor(field, value, [...path, field.key]) as HTMLElement
      );
    }
    row.append(wrap);
  }
  return row;
}

function renderEditor(): void {
  titleEl.textContent = titleOf(airpDocument);
  const blocks = readAt(airpDocument, blocksPath());
  editorEl.replaceChildren(
    ...(Array.isArray(blocks)
      ? blocks.map((block, index) => renderBlock(block, ["blocks", index], 0))
      : []),
    // Always last and always present — see `operationLine`.
    operationLine()
  );
  // Now that the rows are attached, a field that arrived holding text can be
  // measured — and every field starts at the height its content needs.
  growAllFields();
}

/** Put the caret in a block's first text control, after a structural change. */
function focusFirstControl(path: NodePath, toEnd = false): void {
  const target = editorEl.querySelector<HTMLElement>(
    `[data-path="${path.join("/")}"] .field-input`
  );
  target?.focus();
  if (
    toEnd &&
    (target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement)
  ) {
    const end = target.value.length;
    target.setSelectionRange(end, end);
  }
}

/** What an empty line says, whether it is a block or the operation line. */
const OPERATION_HINT = "输入“/”唤起命令，或直接开始写";

/**
 * The trailing line that is always there and is **not** part of the document.
 *
 * Notion never shows a page with nothing to type on. This is how: a line exists
 * whether or not the document has content, so there is always a `+` to hover and
 * a `/` to type even at zero blocks.
 *
 * It is an affordance, not a block. It is in no document, the preview does not
 * render it, and it becomes a real paragraph the moment it is typed on or used to
 * add something — which is why an empty document stays genuinely empty.
 */
function operationLine(): HTMLElement {
  const row = document.createElement("article");
  row.className = "operation-line";
  row.dataset.operationLine = "true";

  const gutter = document.createElement("div");
  gutter.className = "block-gutter";
  gutter.append(
    gutterAction(
      "＋",
      "点击添加内容块",
      (button) => {
        openSlashMenu("", button, { blockPath: blocksPath(), mode: "append" });
      },
      "add"
    ),
    gutterAction(
      "⋮⋮",
      "拖拽移动、打开菜单",
      () => {
        // The handle acts on the line, so the line becomes real first — and then
        // it is the paragraph it just became, with the same menu behind the same
        // handle.
        const index = blockCount();
        materializeParagraph("");
        const fresh = editorEl.querySelector(`[data-path="blocks/${index}"]`);
        const handle = fresh?.querySelector(
          '.gutter-action[data-gutter="menu"]'
        );
        if (handle instanceof HTMLElement) {
          openBlockMenu(handle, ["blocks", index]);
        }
      },
      "menu"
    )
  );

  // A textarea, not an input: this line *is* the paragraph it becomes, so it wraps
  // and grows the same way. Anything less shows up as a change on the first
  // keystroke, which is the one thing this line exists to avoid.
  const field = textControl(
    "",
    true,
    (text) => {
      // A slash command is scaffolding for the menu, not text to keep.
      if (!SLASH_QUERY.test(text)) {
        materializeParagraph(text);
      }
    },
    (query, anchor) => {
      openSlashMenu(query, anchor, { blockPath: blocksPath(), mode: "append" });
    },
    OPERATION_HINT
  );

  const wrap = document.createElement("div");
  wrap.className = "field";
  wrap.append(field);
  row.append(gutter, wrap);
  return row;
}

/** The operation line stops being an affordance and becomes a real paragraph. */
function materializeParagraph(text: string): void {
  const index = blockCount();
  const born = createBlock("paragraph", VERSION, airpDocument);
  const spec = readBlockSpec("paragraph", VERSION);
  const key =
    spec?.fields.find((field) => isTextShape(field.shape) && field.required)
      ?.key ?? "text";
  born[key] = text;
  commit(insertAt(airpDocument, blocksPath(), index, born));
  // The line the author was typing on was just replaced by a real one, so the
  // caret has to be put back where it was.
  focusFirstControl(["blocks", index], true);
}

/* ── the document's name ────────────────────────────────────────────────── */

/**
 * Rename in place: double-click the name in the bar, type, then Enter or click
 * away.
 *
 * There is no confirm step and nothing to persist by hand — the name is part of
 * the document, so committing it here is what "saved" means. `meta.updatedAt` is
 * deliberately left alone: that stamp says when the document was last *written
 * out*, and renaming has not written anything yet.
 *
 * An empty name is refused rather than accepted, because the schema requires a
 * `PlainString` of at least one character: allowing it would make the document
 * invalid the moment someone cleared the field.
 */
function beginRename(): void {
  if (titleEl.dataset.editing === "true") {
    return;
  }
  const previous = titleEl.textContent ?? "";
  const input = document.createElement("input");
  input.type = "text";
  input.className = "bar-title-input";
  input.value = previous;
  input.setAttribute("aria-label", "文档名称");

  let settled = false;
  const finish = (keep: boolean): void => {
    if (settled) {
      return;
    }
    settled = true;
    const next = input.value.trim();
    input.replaceWith(titleEl);
    delete titleEl.dataset.editing;
    if (keep && next !== "" && next !== previous) {
      renameDocument(next);
      return;
    }
    // Nothing to change — or a name that would have broken the document.
    titleEl.textContent = previous;
  };

  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      finish(true);
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      finish(false);
    }
  });
  input.addEventListener("blur", () => {
    finish(true);
  });

  titleEl.dataset.editing = "true";
  titleEl.replaceWith(input);
  input.focus();
  input.select();
}

function renameDocument(name: string): void {
  // `rerender` is false: the column does not depend on the name, and repainting
  // it would throw away the caret the author came back to.
  commit(setAt(airpDocument, ["meta", "title"], name), false);
  titleEl.textContent = name;
}

titleEl.addEventListener("dblclick", beginRename);

/* ── the page's own options ─────────────────────────────────────────────── */

/**
 * Save stamps the document's own timestamp, which is the time the preview head
 * shows — so it says when the author last saved, not when a pane last repainted.
 *
 * Once a document has a file, saving writes that file and asks nothing: the second
 * ⌘S on a document that already lives somewhere must not be a dialog. `saveAs`
 * forces the picker, which is the only difference between the two commands.
 *
 * With no File System Access API — Firefox, Safari — the browser's one other way
 * to write is a download, and the state line says so rather than pretending a
 * file was updated.
 */
async function saveDocument(saveAs = false): Promise<void> {
  airpDocument = withUpdatedAt(airpDocument, new Date().toISOString());
  renderStamps();

  if (!saveAs && fileHandle !== undefined) {
    await writeDocument(fileHandle);
    return;
  }

  const pick = (window as unknown as FilePickerWindow).showSaveFilePicker;
  if (pick === undefined) {
    downloadDocument();
    return;
  }
  let picked: FileSystemFileHandle;
  try {
    picked = await pick({
      suggestedName: fileNameOf(airpDocument),
      types: SAVE_TYPES,
    });
  } catch {
    // The author closed the dialog. Nothing happened, and nothing should.
    statusLine();
    return;
  }
  await writeDocument(picked);
}

/**
 * ⌘S saves, ⇧⌘S saves elsewhere. Answers whether it consumed the keystroke.
 *
 * A file-based app has to answer ⌘S — and answer it without a dialog when the
 * document already has a file.
 */
function handleSaveShortcut(event: KeyboardEvent): boolean {
  if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== "s") {
    return false;
  }
  event.preventDefault();
  if (event.shiftKey) {
    saveAs();
  } else {
    save();
  }
  return true;
}

/** Save, and put a failure where the author can see it. */
function save(): void {
  saveDocument().catch((error: unknown) => {
    say(error instanceof Error ? error.message : String(error), true);
  });
}

/** 另存为, likewise. */
function saveAs(): void {
  saveDocument(true).catch((error: unknown) => {
    say(error instanceof Error ? error.message : String(error), true);
  });
}

/** Write the document into a file, and remember it as this document's file. */
async function writeDocument(handle: FileSystemFileHandle): Promise<void> {
  try {
    const writable = await handle.createWritable();
    await writable.write(serialize(airpDocument));
    await writable.close();
  } catch (error) {
    say(
      `写入失败：${error instanceof Error ? error.message : String(error)}`,
      true
    );
    return;
  }
  fileHandle = handle;
  dirty = false;
  say(`已保存到 ${handle.name}`);
}

/** The fallback for browsers without the picker: hand the bytes to the author. */
function downloadDocument(): void {
  const blob = new Blob([serialize(airpDocument)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.download = fileNameOf(airpDocument);
  anchor.href = url;
  anchor.click();
  URL.revokeObjectURL(url);
  dirty = false;
  say("此浏览器不支持写入文件，已改为下载");
  statusLine();
}

menuButton.addEventListener("click", () => {
  pageMenu.hidden = !pageMenu.hidden;
});

document.addEventListener("mousedown", (event) => {
  const target = event.target as Node;
  if (
    !(pageMenu.hidden || pageMenu.contains(target)) &&
    target !== menuButton
  ) {
    pageMenu.hidden = true;
  }
});

pageMenu.addEventListener("click", (event) => {
  const action = (event.target as HTMLElement).dataset.action;
  pageMenu.hidden = true;
  switch (action) {
    case "save": {
      save();
      return;
    }
    case "save-as": {
      saveAs();
      return;
    }
    case "source": {
      sourceArea.hidden = !sourceArea.hidden;
      if (!sourceArea.hidden) {
        sourceArea.value = serialize(airpDocument);
      }
      return;
    }
    case "open": {
      fileInput.click();
      return;
    }
    default: {
      return;
    }
  }
});

fileInput.addEventListener("change", () => {
  const file = fileInput.files?.item(0);
  if (file === null || file === undefined) {
    return;
  }
  file
    .text()
    .then((text) => {
      const loaded = loadDocumentJson(text);
      if (!loaded.ok) {
        say(loaded.diagnostics.at(0)?.message ?? "导入失败", true);
        return;
      }
      if (!hasSchemaVersion(loaded.value.schemaVersion)) {
        say(`不支持的 schemaVersion：${loaded.value.schemaVersion}`, true);
        return;
      }
      airpDocument = loaded.value.document;
      // The name came from the file, so the next save writes that same file back.
      fileHandle = undefined;
      undoStack = [];
      redoStack = [];
      dirty = false;
      renderEditor();
      refreshPreview();
    })
    .catch((error: unknown) => {
      say(error instanceof Error ? error.message : String(error), true);
    })
    .finally(() => {
      fileInput.value = "";
    });
});

/* ── boot ───────────────────────────────────────────────────────────────── */

/**
 * A read-only hook for the browser tests.
 *
 * They need to assert what the *document* holds. The alternatives are worse: the
 * source panel is a debounced mirror of it, and the rendered pane is the renderer's
 * opinion of it. This exposes neither a setter nor an event — nothing here can
 * change the document.
 */
(window as unknown as { __airp: unknown }).__airp = {
  document: () => airpDocument,
};

renderEditor();
fitPreview();
// The pane's head is filled before the first render, or the version and the
// timestamp would stay blank until the first edit.
renderStamps();
statusLine();
refreshPreview();
