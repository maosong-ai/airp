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
  say(`${blockCount()} 个块 · ${dirty ? "未保存" : "已同步"}`);
}

/* ── preview ────────────────────────────────────────────────────────────── */

let previewTimer: number | undefined;
let previewSeq = 0;

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
type TypeMode = "insert-after" | "turn-into";

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

  if (mode === "turn-into") {
    // The line becomes the chosen type — how `/` behaves on a fresh line, and
    // what the block menu's 「转为」 means anywhere.
    commit(setAt(cleared, blockPath, born));
    focusFirstControl(blockPath);
    return;
  }
  commit(insertAt(cleared, parent, index + 1, born));
  focusFirstControl([...parent, index + 1]);
}

/** `/` on an untouched line turns it into something; anywhere else it adds a line. */
function typeModeFor(blockPath: NodePath): TypeMode {
  const block = readAt(airpDocument, blockPath);
  const spec = isRecord(block)
    ? readBlockSpec(String(block.type), VERSION)
    : undefined;
  return isRecord(block) && isBlankBlock(block, spec?.fields ?? [])
    ? "turn-into"
    : "insert-after";
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

/** A block whose editable text is still untouched. */
function isBlankBlock(
  block: Record<string, unknown>,
  fields: readonly FieldSpec[]
): boolean {
  const text = fields
    .filter((field) => isTextShape(field.shape))
    .map((field) => block[field.key])
    .filter((value): value is string => typeof value === "string")
    .join("")
    .trim();
  return block.type === "paragraph" && text === "";
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
  onSlash: (query: string, anchor: HTMLElement) => void,
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
    (field as HTMLTextAreaElement).rows = 2;
  }
  field.addEventListener("input", () => {
    const text = field.value;
    const slash = SLASH_QUERY.exec(text);
    if (slash === null) {
      closeSlashMenu();
    } else {
      onSlash(slash[1] ?? "", field);
    }
    onInput(text);
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
        (query, anchor) => {
          // The field is where the query is being typed; the line is what gets
          // turned into something or inserted after.
          const blockPath = path.slice(0, -1);
          openSlashMenu(query, anchor, {
            blockPath,
            fieldPath: path,
            mode: typeModeFor(blockPath),
          });
        },
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

/** One gutter button: quiet until the line is under the pointer. */
function gutterAction(
  glyph: string,
  title: string,
  open: (button: HTMLElement) => void
): HTMLElement {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "gutter-action";
  button.textContent = glyph;
  button.title = title;
  button.addEventListener("click", () => {
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
    gutterAction("＋", "点击添加内容块", (button) => {
      openSlashMenu("", button, { blockPath: path, mode: "insert-after" });
    }),
    gutterAction("⋮⋮", "拖拽移动、打开菜单", (button) => {
      openBlockMenu(button, path);
    })
  );

  const head = document.createElement("div");
  head.className = "block-head";
  const label = document.createElement("span");
  label.className = "block-label";
  label.textContent = blockMeta(type).label;
  head.append(label);
  row.append(gutter, head);

  const spec = readBlockSpec(type, VERSION);
  // A fresh line says what can be done on it — the same hint Notion shows, and
  // the only place the author learns that `/` exists.
  const hint =
    isRecord(node) && isBlankBlock(node, spec?.fields ?? [])
      ? "输入“/”唤起命令，或直接开始写"
      : undefined;
  for (const field of spec?.fields ?? []) {
    const value = node[field.key];
    if (!(field.required || value !== undefined)) {
      continue;
    }
    const isBlocks = holdsBlocks(value);
    const wrap = document.createElement("div");
    wrap.className = "field";
    const caption = document.createElement("span");
    caption.className = "field-caption";
    caption.textContent = `${field.key}${field.required ? " *" : ""}`;
    wrap.append(caption);

    if (isBlocks && Array.isArray(value)) {
      const list = document.createElement("div");
      list.className = "nested";
      value.forEach((child, at) => {
        list.append(renderBlock(child, [...path, field.key, at], depth + 1));
      });
      wrap.append(list);
    } else {
      wrap.append(
        controlFor(field, value, [...path, field.key], hint) as HTMLElement
      );
    }
    row.append(wrap);
  }
  return row;
}

function renderEditor(): void {
  // Before any early return: an empty document still has a name.
  titleEl.textContent = titleOf(airpDocument);
  const blocks = readAt(airpDocument, blocksPath());
  if (!Array.isArray(blocks)) {
    editorEl.replaceChildren();
    return;
  }
  const add = document.createElement("button");
  add.type = "button";
  add.className = "add-block";
  add.textContent = "＋ 添加块";
  add.addEventListener("click", () => {
    const index = blockCount();
    commit(
      insertAt(
        airpDocument,
        blocksPath(),
        index,
        createBlock("paragraph", VERSION, airpDocument)
      )
    );
    focusFirstControl(["blocks", index]);
  });

  if (blocks.length === 0) {
    // An empty page is allowed. With nothing to edit there is nothing for `/` to
    // be typed on, so the only thing left on screen is the way back in.
    editorEl.replaceChildren(add);
    return;
  }

  editorEl.replaceChildren(
    ...blocks.map((block, index) => renderBlock(block, ["blocks", index], 0)),
    add
  );
}

/** Put the caret in a block's first text control, after a structural change. */
function focusFirstControl(path: NodePath): void {
  const target = editorEl.querySelector<HTMLElement>(
    `[data-path="${path.join("/")}"] .field-input`
  );
  target?.focus();
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
 * Saving stamps the document's own timestamp, which is the time the preview head
 * shows — so it says when the author last saved, not when a pane last repainted.
 * In a browser the save is a download; a desktop shell would write the same bytes
 * to a file.
 */
function saveDocument(): void {
  airpDocument = withUpdatedAt(airpDocument, new Date().toISOString());
  dirty = false;
  const blob = new Blob([serialize(airpDocument)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.download = fileNameOf(airpDocument);
  anchor.href = url;
  anchor.click();
  URL.revokeObjectURL(url);
  renderStamps();
  statusLine();
  schedulePreview();
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
    case "export": {
      saveDocument();
      return;
    }
    case "source": {
      sourceArea.hidden = !sourceArea.hidden;
      if (!sourceArea.hidden) {
        sourceArea.value = serialize(airpDocument);
      }
      return;
    }
    case "import": {
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

renderEditor();
// The pane's head is filled before the first render, or the version and the
// timestamp would stay blank until the first edit.
renderStamps();
statusLine();
refreshPreview();
