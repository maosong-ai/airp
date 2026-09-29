/**
 * The render service every editing host shares.
 *
 * A host that wants to *show* a document does not render it: it asks this
 * service, and the service calls the very implementation the AIRP Renderer uses
 * — `@airp/renderer/node/render`, the same function behind `airp-render` and the
 * VS Code worker. That is the only way a preview and an export can be the same
 * bytes rather than merely similar: Mermaid is laid out in jsdom with stubbed
 * text measurement, so a browser rendering the same source would produce a
 * different diagram.
 *
 * There is one copy on purpose. A preview pane in one host and a canvas in
 * another would be two chances for what is on screen to drift from the file
 * `airp-render` writes.
 *
 * The Renderer's Node entry is TypeScript *source*, which plain Node cannot
 * import, so the caller supplies a loader — Vite's SSR module runner, which
 * transpiles workspace TypeScript. `./vite.ts` mounts this on a dev server.
 *
 * ## Keeping in step with the Renderer
 *
 * Most Renderer changes need nothing here, because this module does not know what
 * a block is. A new block type, a different layout, another `targetOptions` key,
 * a new schema version — all of it flows through untouched. That is the point of
 * forwarding `targetOptions` verbatim instead of modelling them.
 *
 * Three things can still need attention, and each one announces itself:
 *
 * - **A new render target** breaks the build. `RenderServiceTarget` is the
 *   Renderer's own `RenderTarget`, so a target added upstream is a compile error
 *   here rather than a target no host can ask for.
 * - **A changed result shape** fails *the contract this service consumes*, which
 *   pins the `value.files[].body` and `diagnostics` this module reads.
 * - **A changed byte** fails conformance, which renders every fixture through
 *   both this service and `renderDocument` and compares the output.
 *
 * The one manual step is the build. The service loads the Renderer's *compiled*
 * Node entry, so a change that was never rebuilt renders yesterday's bytes with
 * nothing on screen to show for it. Keep
 * `pnpm --filter @airp/renderer-target-html dev` running, or rebuild once — and
 * `renderServicePlugin({ rendererRoot })` says so out loud when you forget.
 */

import type { RenderTarget } from "@airp/renderer";

/**
 * The targets this service forwards to.
 *
 * Derived rather than restated: the Renderer owns the list, and a transport that
 * listed its own copy would be quietly wrong the day a target is added.
 */
export type RenderServiceTarget = RenderTarget;

export interface RenderServiceRequest {
  document: unknown;
  /** Defaults to `html`. */
  target?: RenderServiceTarget;
  /**
   * Renderer target options, forwarded verbatim.
   *
   * The service deliberately does not model them: the HTML target owns its own
   * key set (`extraHead`, `extraBody`, `extraAppHeader`, `extraHeadPre`) and
   * ignores anything it does not recognise, so a host can inject its own chrome
   * without this package needing a release when the Renderer grows a knob.
   */
  targetOptions?: Readonly<Record<string, unknown>>;
}

export interface RenderServiceSuccess {
  body: string;
  diagnostics: { code: string; severity: string }[];
  ok: true;
}

export interface RenderServiceFailure {
  message: string;
  ok: false;
}

export type RenderServiceResult = RenderServiceFailure | RenderServiceSuccess;

/** The Renderer function this service calls; resolved by the host's loader. */
export type RenderDocumentFn =
  typeof import("@airp/renderer/node/render").renderDocument;

/** Resolve the Renderer's Node entry, in whatever way the host can. */
export type RenderDocumentLoader = () => Promise<RenderDocumentFn>;

/**
 * Render one document with the Renderer's own Node pipeline.
 *
 * The load is lazy and the module is cached by the host's runner, so a dev
 * server does not pay for Mermaid, jsdom and Shiki until a document needs
 * rendering, and only pays once.
 */
export async function renderRequest(
  request: RenderServiceRequest,
  load: RenderDocumentLoader
): Promise<RenderServiceResult> {
  const target = request.target ?? "html";
  let renderDocument: RenderDocumentFn;
  try {
    renderDocument = await load();
  } catch (error) {
    return {
      // The first run on a clean checkout is the common way to get here: the
      // HTML target's Node entry is a build artifact, so say what to build.
      message: `本地渲染服务无法加载 Renderer：${
        error instanceof Error ? error.message : String(error)
      }（若刚克隆仓库，先执行 pnpm --filter @airp/renderer-target-html build）`,
      ok: false,
    };
  }

  try {
    const rendered = await renderDocument(request.document as never, target, {
      targetOptions: request.targetOptions ?? {},
    });
    if (!rendered.ok) {
      return {
        message: `渲染失败：${rendered.diagnostics
          .map((diagnostic) => diagnostic.code)
          .join("、")}`,
        ok: false,
      };
    }
    return {
      body: String(rendered.value.files[0]?.body ?? ""),
      diagnostics: (rendered.diagnostics ?? []).map((diagnostic) => ({
        code: diagnostic.code,
        severity: String(diagnostic.severity),
      })),
      ok: true,
    };
  } catch (error) {
    return {
      message: error instanceof Error ? error.message : String(error),
      ok: false,
    };
  }
}

/** Where a browser reaches the service. */
export const RENDER_SERVICE_PATH = "/__airp/render";

/** Read a request body, capped so a runaway client cannot exhaust memory. */
export async function readJsonBody(
  stream: AsyncIterable<Uint8Array>
): Promise<unknown> {
  const chunks: Uint8Array[] = [];
  let size = 0;
  for await (const chunk of stream) {
    size += chunk.byteLength;
    if (size > MAX_BODY_BYTES) {
      throw new Error("请求体过大");
    }
    chunks.push(chunk);
  }
  const text = Buffer.concat(chunks).toString("utf8");
  return text.length === 0 ? {} : JSON.parse(text);
}

const MAX_BODY_BYTES = 32 * 1024 * 1024;
