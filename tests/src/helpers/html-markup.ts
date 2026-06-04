/** Remove inline scripts so selector strings in JS do not affect markup assertions. */
export function stripScripts(html: string): string {
  return html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "");
}

export function extractAirpChrome(html: string): string {
  const match = html.match(/<header\b[^>]*\bid="airp-chrome"[\s\S]*?<\/header>/i);
  return match?.[0] ?? "";
}

export function parseChromeConfig(html: string): Record<string, unknown> {
  const match = html.match(
    /<script id="airp-chrome-config" type="application\/json">([\s\S]*?)<\/script>/
  );
  if (!match) {
    throw new Error("missing #airp-chrome-config");
  }
  return JSON.parse(match[1]) as Record<string, unknown>;
}
