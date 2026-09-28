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
import { formatStamp, lastUpdatedOf, withUpdatedAt } from "./stamp.js";

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
slashMenu.className = "slash-menu";
slashMenu.hidden = true;
document.body.append(slashMenu);

let slashEntries: MenuEntry[] = [];
let slashIndex = 0;
let slashTarget: { blockPath: NodePath; fieldPath: NodePath } | undefined;

function closeSlashMenu(): void {
  slashMenu.hidden = true;
  slashTarget = undefined;
}

function chooseSlashEntry(entry: MenuEntry): void {
  const target = slashTarget;
  closeSlashMenu();
  if (target === undefined) {
    return;
  }
  const { blockPath, fieldPath } = target;

  // The `/query` the author typed to open the menu is scaffolding, not content:
  // it is cleared before anything is inserted, or it ends up in the document.
  const cleared = setAt(airpDocument, fieldPath, "");
  const block = readAt(cleared, blockPath);
  const spec = isRecord(block)
    ? readBlockSpec(String(block.type), VERSION)
    : undefined;
  const blank = isRecord(block) && isBlankBlock(block, spec?.fields ?? []);

  if (blank) {
    // An empty paragraph is a line the author is about to turn into something,
    // which is how `/` behaves on a fresh line.
    commit(
      setAt(cleared, blockPath, createBlock(entry.type, VERSION, cleared))
    );
    focusFirstControl(blockPath);
    return;
  }
  const index = Number(blockPath.at(-1));
  const parent = blockPath.slice(0, -1);
  commit(
    insertAt(
      cleared,
      parent,
      index + 1,
      createBlock(entry.type, VERSION, cleared)
    )
  );
  focusFirstControl([...parent, index + 1]);
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
  fieldPath: NodePath
): void {
  const needle = query.toLowerCase();
  // Every type the schema declares, not a shortlist: a menu that shows only some
  // of them makes the rest discoverable only by guessing at a query.
  slashEntries = menuGroups(listBlockTypes(VERSION))
    .flatMap((group) => group.items)
    .filter(
      (entry) =>
        needle === "" ||
        entry.type.toLowerCase().includes(needle) ||
        entry.label.includes(query)
    );
  if (slashEntries.length === 0) {
    closeSlashMenu();
    return;
  }
  slashTarget = { blockPath: fieldPath.slice(0, -1), fieldPath };
  slashIndex = 0;
  renderSlashMenu();
  slashMenu.hidden = false;
  const box = anchor.getBoundingClientRect();
  slashMenu.style.top = `${box.bottom + 4}px`;
  slashMenu.style.left = `${box.left}px`;
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
  if (!(slashMenu.hidden || slashMenu.contains(event.target as Node))) {
    closeSlashMenu();
  }
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
          // The field is where the query is being typed; the block is what gets
          // turned into something or inserted after.
          openSlashMenu(query, anchor, path);
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

function rowActions(path: NodePath, index: number): HTMLElement {
  const actions = document.createElement("div");
  actions.className = "row-actions";
  const make = (label: string, title: string, run: () => void): void => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "row-action";
    button.textContent = label;
    button.title = title;
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      run();
    });
    actions.append(button);
  };
  const parent = path.slice(0, -1);
  make("↑", "上移", () => {
    if (index > 0) {
      commit(moveAt(airpDocument, path, index - 1));
    }
  });
  make("↓", "下移", () => {
    commit(moveAt(airpDocument, path, index + 1));
  });
  make("⧉", "复制", () => {
    const block = readAt(airpDocument, path);
    const copy = withFreshAtIds(block, usedAtIds(airpDocument));
    commit(insertAt(airpDocument, parent, index + 1, copy));
  });
  make("✕", "删除", () => {
    commit(removeAt(airpDocument, path));
  });
  return actions;
}

/** Render one block: its chrome, its fields, and any blocks it contains. */
function renderBlock(
  block: unknown,
  path: NodePath,
  depth: number
): HTMLElement {
  const node = isRecord(block) ? block : {};
  const type = typeof node.type === "string" ? node.type : "unknown";
  const index = Number(path.at(-1));
  const row = document.createElement("article");
  row.className = "block";
  row.dataset.blockType = type;
  row.dataset.path = path.join("/");
  row.style.marginLeft = `${depth * 22}px`;

  const head = document.createElement("div");
  head.className = "block-head";
  const label = document.createElement("span");
  label.className = "block-label";
  label.textContent = blockMeta(type).label;
  head.append(label, rowActions(path, index));
  row.append(head);

  const spec = readBlockSpec(type, VERSION);
  // A fresh line says what can be done on it — the same hint Notion shows, and
  // the only place the author learns that `/` exists.
  const hint =
    isRecord(node) && isBlankBlock(node, spec?.fields ?? [])
      ? "输入 / 唤起命令，或直接开始写"
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
  const meta = readAt(airpDocument, ["meta"]);
  if (isRecord(meta) && typeof meta.title === "string") {
    titleEl.textContent = meta.title;
  }
}

/** Put the caret in a block's first text control, after a structural change. */
function focusFirstControl(path: NodePath): void {
  const target = editorEl.querySelector<HTMLElement>(
    `[data-path="${path.join("/")}"] .field-input`
  );
  target?.focus();
}

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
  anchor.download = "report.airp.json";
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
