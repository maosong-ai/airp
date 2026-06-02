/** Safe for `<script>` / `<script type="module">` inline bodies. */
export function escapeInlineScript(js: string): string {
  return js.replace(/<\/script/gi, "<\\/script");
}
