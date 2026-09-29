import { getHighlighter } from "./highlight-code.js";
import { loadMermaid } from "./load-mermaid.js";

/**
 * Pay HTML render cold-start costs up front: Shiki highlighter, JSDOM window and Mermaid.
 * Rejects on failure; the caller decides whether that matters.
 */
export async function warmUpHtmlRenderer(): Promise<void> {
  await Promise.all([getHighlighter(), loadMermaid()]);
}
