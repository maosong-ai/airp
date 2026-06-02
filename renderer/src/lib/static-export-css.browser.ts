/** Heuristic: reject SPA fallback HTML mistaken for CSS. */
function isExportCss(text: string): boolean {
  const t = text.trimStart();
  return (
    t.length > 500 &&
    !t.startsWith("<!") &&
    !t.startsWith("<html") &&
    (t.includes("--background") || t.includes("@layer"))
  );
}

/** Browser export: production CSS from public/ (stamped on `pnpm build`). */
export async function fetchExportCss(): Promise<string> {
  const base = new URL(import.meta.env.BASE_URL, window.location.href);
  const url = new URL("airp-export.css", base);
  const res = await fetch(url);
  if (res.ok) {
    const text = await res.text();
    if (isExportCss(text)) {
      return text;
    }
  }

  if (import.meta.env.DEV) {
    const { default: devCss } = await import("../index.css?inline");
    if (typeof devCss === "string" && devCss.length > 0) {
      return devCss;
    }
  }

  throw new Error(
    "airp-export.css not found or invalid — run `pnpm build` in renderer/ before exporting HTML"
  );
}
