/**
 * The preview pane: ask the dev server to render the document, then show it.
 *
 * The endpoint is a literal rather than an import on purpose — the dependency DAG
 * keeps a web host's browser surface out of the platform=`node` packages, so the
 * URL is the contract between the two halves.
 */

const ENDPOINT = "/__airp/render";

interface RenderOk {
  body: string;
  ok: true;
}

interface RenderFailed {
  message: string;
  ok: false;
}

export type PreviewResult = RenderFailed | RenderOk;

/**
 * What the pane does not show, injected through the Renderer's own host hook
 * rather than by changing the Renderer.
 *
 * Two kinds of thing are hidden, for different reasons:
 *
 * - The app shell's header and footer name the product and belong to an export.
 * - The document's own header — protocol badge, title, and the "last updated" row.
 *   That is the *page's* furniture, and this pane sits inside the page that
 *   already shows it: the version is in this pane's own head, and the timestamp is
 *   beside it. Leaving it rendered said the same thing twice, in two formats.
 *
 * What remains is the document's content, which is what the author is editing.
 */
const HIDE_CHROME = `
  header.sticky, footer.w-full { display: none !important; }
  header[data-doc-header="true"] { display: none !important; }
  html, body { background: #ffffff; }
`;

/** Render the document as the Renderer would write it. */
export async function renderPreview(
  document_: unknown
): Promise<PreviewResult> {
  let response: Response;
  try {
    response = await fetch(ENDPOINT, {
      body: JSON.stringify({
        document: document_,
        target: "html",
        targetOptions: { extraHead: `<style>${HIDE_CHROME}</style>` },
      }),
      headers: { "content-type": "application/json" },
      method: "POST",
    });
  } catch (error) {
    return {
      message: `无法连接本地渲染服务：${
        error instanceof Error ? error.message : String(error)
      }`,
      ok: false,
    };
  }
  return (await response.json()) as PreviewResult;
}
