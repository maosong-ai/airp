/**
 * First HTML assigned to a new panel. Completing this inner frame lets the
 * next `webview.html` assignment skip Cursor's ~1s empty-iframe wait, so the
 * worker render can overlap that wait instead of preceding it.
 */
export const PLACEHOLDER_READY_TIMEOUT_MS = 1500;

export function buildLoadingShellHtml(): string {
  const csp = [
    "default-src 'none'",
    "style-src 'unsafe-inline'",
    "script-src 'unsafe-inline'",
  ].join("; ");
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta http-equiv="Content-Security-Policy" content="${csp}" />
<style>
html,body{margin:0;height:100%;background:var(--vscode-editor-background);color:var(--vscode-foreground);font:13px/1.4 var(--vscode-font-family,system-ui,sans-serif)}
body{display:flex;align-items:center;justify-content:center}
</style>
</head>
<body data-airp-loading-shell>
<p>Rendering…</p>
<script>
(function () {
  const api = acquireVsCodeApi();
  let posted = false;
  const postReady = () => {
    if (posted) {
      return;
    }
    posted = true;
    api.postMessage({ type: "placeholderReady" });
  };
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      postReady();
    });
  });
  window.addEventListener("load", postReady);
})();
</script>
</body>
</html>`;
}
