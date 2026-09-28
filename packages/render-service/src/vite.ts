/**
 * Mounts the shared render service on the Vite dev server and on `vite preview`.
 *
 * Two mount points on purpose: `pnpm dev` is how the editor is worked on, and
 * `pnpm preview` serves the built `dist` — both need the same endpoint, or the
 * canvas would fall back to rendering in the browser and stop matching the
 * Renderer. Keeping it in the Vite config means no second process to start.
 */

import type { IncomingMessage, ServerResponse } from "node:http";
import {
  RENDER_SERVICE_PATH,
  type RenderDocumentLoader,
  type RenderServiceRequest,
  readJsonBody,
  renderRequest,
} from "@airp/render-service";
import {
  type Connect,
  createServer,
  type Plugin,
  type ViteDevServer,
} from "vite";

type Middleware = Connect.NextHandleFunction;

/**
 * Load the Renderer through the dev server's SSR module runner.
 *
 * A plain `import()` cannot reach it: the package's Node entry is TypeScript
 * source, and only a bundler (or this runner) can resolve what it imports.
 */
function ssrLoader(server: ViteDevServer): RenderDocumentLoader {
  return async () => {
    const module = await server.ssrLoadModule("@airp/renderer/node/render");
    return module.renderDocument as Awaited<ReturnType<RenderDocumentLoader>>;
  };
}

/** Read the request, render it, and answer — whatever the outcome. */
async function answerRenderRequest(
  request: IncomingMessage,
  response: ServerResponse,
  load: RenderDocumentLoader
): Promise<void> {
  try {
    const body = (await readJsonBody(request)) as RenderServiceRequest;
    const result = await renderRequest(body, load);
    response.setHeader("content-type", "application/json; charset=utf-8");
    // A render the Renderer rejects is a normal answer, not a transport error:
    // the canvas shows the reason instead of a failure page.
    response.end(
      JSON.stringify(
        result.ok
          ? { body: result.body, diagnostics: result.diagnostics, ok: true }
          : { message: result.message, ok: false }
      )
    );
  } catch (error) {
    response.statusCode = 400;
    response.end(
      JSON.stringify({
        message: error instanceof Error ? error.message : String(error),
        ok: false,
      })
    );
  }
}

/** Answer one request with the given loader. */
function handlerWith(load: RenderDocumentLoader): Middleware {
  return (request, response, next) => {
    if (!request.url?.startsWith(RENDER_SERVICE_PATH)) {
      next();
      return;
    }
    if (request.method !== "POST") {
      response.statusCode = 405;
      response.end("Use POST");
      return;
    }
    answerRenderRequest(request, response, load).catch((error: unknown) => {
      response.statusCode = 500;
      response.end(
        JSON.stringify({
          message: error instanceof Error ? error.message : String(error),
          ok: false,
        })
      );
    });
  };
}

/**
 * Add the render endpoint to the dev server and to `vite preview`.
 *
 * A preview server serves the built files but has no SSR module runner, and the
 * Renderer's Node entry is TypeScript source that needs one. So preview gets a
 * middleware-mode Vite server of its own — created on the first request and kept
 * for the life of the process — whose only job is that module runner.
 */
export function renderServicePlugin(): Plugin {
  return {
    configurePreviewServer(server) {
      let runner: Promise<ViteDevServer> | undefined;
      server.middlewares.use(
        handlerWith(async () => {
          runner ??= createServer({
            appType: "custom",
            root: server.config.root,
            server: { middlewareMode: true },
          });
          const vite = await runner;
          const module = await vite.ssrLoadModule("@airp/renderer/node/render");
          return module.renderDocument as Awaited<
            ReturnType<RenderDocumentLoader>
          >;
        })
      );
    },
    configureServer(server) {
      server.middlewares.use(handlerWith(ssrLoader(server)));
    },
    name: "airp-render-service",
  };
}
