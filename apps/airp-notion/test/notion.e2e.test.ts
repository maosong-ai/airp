/**
 * The loop, in a real browser: `/` → pick a block → it appears in the editor and
 * is editable → the preview pane shows the Renderer's own output for it.
 *
 * This needs a browser for all three claims: the `/` menu lives at the caret, the
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
const STARTER_BLOCKS = 4;

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

async function openPage(): Promise<{
  page: Page;
  preview: FrameLocator;
}> {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
  });
  await page.goto(url);
  await page.waitForSelector(".block[data-block-type]");
  const preview = page.frameLocator("#preview");
  // The preview is written by the render service, so wait for the document.
  await preview
    .locator("[data-block-type]")
    .first()
    .waitFor({ timeout: 60_000 });
  return { page, preview };
}

async function readSource(page: Page): Promise<{
  blocks: Record<string, unknown>[];
}> {
  await page.click("#menu-button");
  await page.click('[data-action="source"]');
  return JSON.parse(await page.locator("#source").inputValue()) as {
    blocks: Record<string, unknown>[];
  };
}

describe("airp-notion", () => {
  it("shows the editable document and the Renderer's output side by side", async () => {
    const { page, preview } = await openPage();

    expect(await page.locator(".block[data-block-type]").count()).toBe(
      STARTER_BLOCKS
    );
    // Not a lookalike: the pane is the Renderer's own markup.
    expect(await preview.locator('[data-block-type="lead"]').count()).toBe(1);
    expect(
      await preview.locator("[data-block-type]").count()
    ).toBeGreaterThanOrEqual(STARTER_BLOCKS);
    // The export's own chrome is hidden in a pane, by CSS the host injected.
    expect(await preview.locator("header.sticky").isVisible()).toBe(false);

    await page.close();
  });

  it("inserts any block type through the / menu and lands the caret in it", async () => {
    const { page } = await openPage();

    await page
      .locator(".block")
      .first()
      .locator(".field-input")
      .first()
      .click();
    await page.keyboard.type("/blockquote");

    const menu = page.locator(".slash-menu");
    await menu.waitFor();
    // The filter is what makes 46 types usable without a memorised order.
    expect(await menu.locator("button").count()).toBe(1);
    expect(await menu.locator("button").first().textContent()).toContain(
      "引用"
    );

    await page.keyboard.press("Enter");

    // It appears in the editor…
    expect(
      await page.locator('.block[data-block-type="blockquote"]').count()
    ).toBe(1);
    expect(await page.locator(".block").count()).toBe(STARTER_BLOCKS + 1);

    // The menu closed on the choice: `hidden` has to actually hide, and both
    // menus here set `display`, which would otherwise override it.
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

    const field = page
      .locator(".block")
      .first()
      .locator(".field-input")
      .first();
    await field.click();
    await field.fill("季度回顾");
    // A block-level text edit reaches the document…
    await page.waitForFunction(() => {
      const state = document.getElementById("state");
      return (state?.textContent ?? "").includes("未保存");
    });

    // …and the pane re-renders it, rather than showing the old bytes.
    await expect
      .poll(async () => await preview.locator("body").innerText(), {
        timeout: 60_000,
      })
      .toContain("季度回顾");

    await page.close();
  });
});
