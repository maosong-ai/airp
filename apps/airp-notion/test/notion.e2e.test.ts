/**
 * The loop, in a real browser: the page opens empty, `/` offers all 46 block
 * types, choosing one puts it on the canvas where it can be typed into, and the
 * preview pane shows the Renderer's own output for it.
 *
 * This needs a browser for all of it: the `/` menu lives at the caret, the
 * preview is a frame the Node render service wrote, and "the block appeared" can
 * only be judged from the DOM.
 */

import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  type Browser,
  chromium,
  type FrameLocator,
  type Page,
} from "playwright";
import { createServer, type ViteDevServer } from "vite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const APP_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
);
/** Every block type the schema declares. */
const BLOCK_TYPES = 46;
/** Rendered whitespace, for comparing text the browser laid out. */
const RUN_OF_SPACE = /\s+/g;

function collapse(text: string): string {
  return text.replace(RUN_OF_SPACE, " ").trim();
}

let browser: Browser;
let server: ViteDevServer;
let url: string;

beforeAll(async () => {
  server = await createServer({ root: APP_ROOT, server: { port: 0 } });
  await server.listen();
  const [local] = server.resolvedUrls?.local ?? [];
  if (local === undefined) {
    throw new Error("Vite dev server exposed no local URL");
  }
  url = local;
  browser = await chromium.launch();
}, 90_000);

afterAll(async () => {
  await browser?.close();
  await server?.close();
});

async function openPage(): Promise<{ page: Page; preview: FrameLocator }> {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
  });
  await page.goto(url);
  // The page opens empty, so the way in is what says it is ready.
  await page.waitForSelector(".add-block");
  const preview = page.frameLocator("#preview");
  await preview.locator("body").waitFor({ timeout: 60_000 });
  return { page, preview };
}

/** Add one block the way a pointer would, and wait for it to exist. */
async function addParagraph(page: Page): Promise<void> {
  await page.locator(".add-block").click();
  await page.waitForSelector('.block[data-block-type="paragraph"]');
}

async function readSource(page: Page): Promise<{
  blocks: Record<string, unknown>[];
  meta?: Record<string, unknown>;
}> {
  await page.click("#menu-button");
  await page.click('[data-action="source"]');
  return JSON.parse(await page.locator("#source").inputValue()) as {
    blocks: Record<string, unknown>[];
    meta?: Record<string, unknown>;
  };
}

describe("airp-notion", () => {
  it("opens empty, with nothing on the canvas but the way in", async () => {
    const { page, preview } = await openPage();

    expect(await page.locator(".block").count()).toBe(0);
    expect(await page.locator("#editor > *").count()).toBe(1);
    expect(await page.locator(".add-block").isVisible()).toBe(true);
    expect(await preview.locator("[data-block-type]").count()).toBe(0);

    // The pane's head names the protocol and the document's own timestamp; the
    // rendered document header (badge, title, meta row) stays hidden, because
    // those are the page's furniture and this pane sits inside the page.
    expect(await page.locator("#preview-version").textContent()).toBe("v1.1.0");
    // Titled `AIRP` and the version, separated by a half-width space — which is
    // why the two parts share one inline box instead of being flex items.
    expect(collapse(await page.locator(".preview-title").innerText())).toBe(
      "AIRP v1.1.0"
    );
    expect(await page.locator("#preview-state").textContent()).toContain(
      "最后更新"
    );
    expect(
      await preview.locator('header[data-doc-header="true"]').isVisible()
    ).toBe(false);

    await page.close();
  });

  it("offers every block type in the / menu, not a shortlist", async () => {
    const { page } = await openPage();
    await addParagraph(page);

    await page.locator(".field-input").first().click();
    await page.keyboard.type("/");

    const menu = page.locator(".slash-menu");
    await menu.waitFor();
    // Typing a query used to be the only way to reach the types past the cap.
    expect(await menu.locator("button").count()).toBe(BLOCK_TYPES);

    await page.close();
  });

  it("inserts a block through the / menu and lands the caret in it", async () => {
    const { page } = await openPage();
    await addParagraph(page);

    await page.locator(".field-input").first().click();
    await page.keyboard.type("/blockquote");

    const menu = page.locator(".slash-menu");
    await menu.waitFor();
    expect(await menu.locator("button").count()).toBe(1);
    expect(await menu.locator("button").first().textContent()).toContain(
      "引用"
    );

    await page.keyboard.press("Enter");

    // It appears in the editor…
    expect(
      await page.locator('.block[data-block-type="blockquote"]').count()
    ).toBe(1);
    // The menu closed on the choice: `hidden` has to actually hide.
    expect(await menu.isHidden()).toBe(true);

    // …and the caret is already in its first control, so typing just works.
    await page.keyboard.type("引用来源");
    const source = await readSource(page);
    const inserted = source.blocks.find((block) => block.type === "blockquote");
    expect(inserted?.text).toBe("引用来源");
    // The `/blockquote` scaffolding must not survive as content.
    expect(JSON.stringify(source.blocks)).not.toContain("/blockquote");

    await page.close();
  });

  it("renders the edit in the preview pane", async () => {
    const { page, preview } = await openPage();
    await addParagraph(page);

    const field = page.locator(".field-input").first();
    await field.click();
    await field.fill("季度回顾");
    await page.waitForFunction(() =>
      (document.getElementById("state")?.textContent ?? "").includes("未保存")
    );

    // The pane re-renders rather than showing the old bytes.
    await expect
      .poll(async () => await preview.locator("body").innerText(), {
        timeout: 60_000,
      })
      .toContain("季度回顾");

    await page.close();
  });

  it("can be emptied back to the one way in", async () => {
    const { page, preview } = await openPage();
    await addParagraph(page);

    const block = page.locator(".block").first();
    await block.hover();
    await block.locator('.row-action[title="删除"]').click();

    expect(await page.locator(".block").count()).toBe(0);
    expect(await page.locator("#editor > *").count()).toBe(1);
    expect(await page.locator(".add-block").isVisible()).toBe(true);
    await expect
      .poll(async () => await preview.locator("[data-block-type]").count(), {
        timeout: 60_000,
      })
      .toBe(0);

    await page.close();
  });

  it("stamps the document's own time when saving", async () => {
    const { page } = await openPage();
    await addParagraph(page);

    expect(await page.locator("#preview-state").textContent()).toContain(
      "最后更新"
    );

    const [download] = await Promise.all([
      page.waitForEvent("download"),
      (async () => {
        await page.click("#menu-button");
        await page.click('[data-action="export"]');
      })(),
    ]);

    expect(download.suggestedFilename()).toBe("report.airp.json");
    // The save writes the document's timestamp, which is what the head shows — so
    // the time is when the author saved, not when a pane happened to refresh.
    const saved = await readSource(page);
    expect(typeof saved.meta?.updatedAt).toBe("string");
    expect(Number.isNaN(Date.parse(String(saved.meta?.updatedAt)))).toBe(false);
    expect(await page.locator("#state").textContent()).toContain("已同步");

    await page.close();
  });
});
