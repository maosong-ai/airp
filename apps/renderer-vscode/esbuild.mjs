import { build, context } from "esbuild";
import { escapeNonLatin1Plugin } from "./scripts/escape-non-latin1.mjs";
import { stubXhrSyncWorkerPlugin } from "./scripts/stub-xhr-sync-worker.mjs";
import { waitHtmlDistPlugin } from "./scripts/wait-html-dist.mjs";

const watch = process.argv.includes("--watch");

/** @type {import("esbuild").BuildOptions} */
const extension = {
  bundle: true,
  entryPoints: ["src/extension.ts"],
  external: ["vscode"],
  format: "cjs",
  legalComments: "external",
  logLevel: "info",
  minify: true,
  outfile: "dist/extension.cjs",
  platform: "node",
  plugins: [waitHtmlDistPlugin()],
  sourcemap: true,
  target: "node20",
};

/** @type {import("esbuild").BuildOptions} */
const renderWorker = {
  bundle: true,
  entryPoints: ["src/workers/render-worker-main.ts"],
  format: "cjs",
  legalComments: "external",
  logLevel: "info",
  minify: true,
  outfile: "dist/render-worker.cjs",
  platform: "node",
  plugins: [
    waitHtmlDistPlugin(),
    stubXhrSyncWorkerPlugin(),
    escapeNonLatin1Plugin(),
  ],
  sourcemap: true,
  target: "node20",
};

/** @type {import("esbuild").BuildOptions} */
const webview = {
  bundle: true,
  entryPoints: ["src/webview/main.ts"],
  format: "iife",
  legalComments: "external",
  logLevel: "info",
  minify: true,
  outfile: "dist/webview.js",
  platform: "browser",
  // No sourcemap: webview CSP is default-src 'none' and blocks *.map fetches.
  sourcemap: false,
  target: "es2022",
};

if (watch) {
  const [extensionCtx, renderWorkerCtx, webviewCtx] = await Promise.all([
    context(extension),
    context(renderWorker),
    context(webview),
  ]);
  await Promise.all([
    extensionCtx.watch(),
    renderWorkerCtx.watch(),
    webviewCtx.watch(),
  ]);
} else {
  await Promise.all([build(extension), build(renderWorker), build(webview)]);
}
