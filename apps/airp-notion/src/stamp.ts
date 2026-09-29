/**
 * The document's own identity: what the chrome calls it, when it was last saved,
 * and what a saved file is named.
 *
 * All three are read out of `meta`, and all three are pure functions of the
 * document so the rules can be tested without a browser.
 *
 * The head used to say when the pane last repainted, which is not something an
 * author cares about — and it sat beside the document's own "last updated" line,
 * so the same fact was on screen twice. What it shows now is the document's
 * timestamp, and saving is what moves it: the time the author sees is when they
 * last saved, not when a pane happened to refresh.
 */

import { isRecord } from "@airp/utils";

function metaOf(document_: unknown): Record<string, unknown> {
  if (!isRecord(document_)) {
    return {};
  }
  const meta = document_.meta;
  return isRecord(meta) ? meta : {};
}

/** `updatedAt` when the document has one, else `createdAt`. */
export function lastUpdatedOf(document_: unknown): string | undefined {
  const meta = metaOf(document_);
  for (const key of ["updatedAt", "createdAt"] as const) {
    const value = meta[key];
    if (typeof value === "string" && value.length > 0) {
      return value;
    }
  }
  return undefined;
}

/**
 * `2026/09/28 22:58:07` in the reader's own timezone; the input when unusable.
 *
 * Seconds are not decoration: the head's whole job is to say "this save went
 * through", and a minute-precision stamp looks frozen when someone saves twice in
 * the same minute.
 */
export function formatStamp(iso: string): string {
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) {
    return iso;
  }
  const pad = (value: number): string => String(value).padStart(2, "0");
  return [
    `${at.getFullYear()}/${pad(at.getMonth() + 1)}/${pad(at.getDate())}`,
    `${pad(at.getHours())}:${pad(at.getMinutes())}:${pad(at.getSeconds())}`,
  ].join(" ");
}

/** The document with its timestamp moved to `now`. */
export function withUpdatedAt(document_: unknown, now: string): unknown {
  if (!isRecord(document_)) {
    return document_;
  }
  return { ...document_, meta: { ...metaOf(document_), updatedAt: now } };
}

/** What the document calls itself. */
export function titleOf(document_: unknown): string {
  const title = metaOf(document_).title;
  return typeof title === "string" && title.trim().length > 0
    ? title
    : FALLBACK_TITLE;
}

/**
 * The file name a save writes, derived from the document's own name.
 *
 * Path separators and control characters are dropped rather than escaped: a name
 * is a label, and a label that tries to contain `../` is a mistake, not a path.
 * The length is capped so a pasted paragraph cannot become a file name.
 */
export function fileNameOf(document_: unknown): string {
  const safe = withoutControls(
    titleOf(document_).replace(FORBIDDEN_IN_FILE_NAME, "")
  )
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_NAME_LENGTH);
  return `${safe === "" ? FALLBACK_TITLE : safe}.airp.json`;
}

/** Shown when a document has no name of its own. */
export const FALLBACK_TITLE = "未命名报告";

/** Characters a file name cannot carry. */
const FORBIDDEN_IN_FILE_NAME = /[/\\:*?"<>|]/g;

/** Drop the control range: a file name is a label, not a byte string. */
function withoutControls(value: string): string {
  return [...value]
    .filter((character) => (character.codePointAt(0) ?? 0) > 0x1f)
    .join("");
}

const MAX_NAME_LENGTH = 60;
