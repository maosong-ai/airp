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
 * The Renderer's page chrome names the product and belongs to an export. The
 * preview is a pane inside an editor, so it is hidden here — as CSS injected
 * through the Renderer's own host hook, not by changing the Renderer.
 */
const HIDE_EXPORT_CHROME = `
  header.sticky, footer.w-full { display: none !important; }
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
        targetOptions: { extraHead: `<style>${HIDE_EXPORT_CHROME}</style>` },
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
