export type StaticExportScripts = {
  chromeJs: string;
  mermaidInitJs: string;
};

function publicAssetUrl(file: string): string {
  const base = new URL(import.meta.env.BASE_URL, window.location.href);
  return new URL(file, base).href;
}

export async function fetchStaticExportScripts(): Promise<StaticExportScripts> {
  const [chromeRes, mermaidRes] = await Promise.all([
    fetch(publicAssetUrl("airp-chrome.js")),
    fetch(publicAssetUrl("mermaid-init.js")),
  ]);
  if (!mermaidRes.ok) {
    throw new Error("Failed to load mermaid-init.js for export");
  }
  if (!chromeRes.ok) {
    throw new Error("Failed to load airp-chrome.js for export");
  }
  return {
    chromeJs: await chromeRes.text(),
    mermaidInitJs: await mermaidRes.text(),
  };
}
