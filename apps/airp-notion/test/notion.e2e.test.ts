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
  await page.waitForSelector(".operation-line");
  const preview = page.frameLocator("#preview");
  await preview.locator("body").waitFor({ timeout: 60_000 });
  return { page, preview };
}

/** Add one block through the operation line's content menu. */
async function addParagraph(page: Page): Promise<void> {
  await page.locator(".operation-line .gutter-action").click();
  await page.locator(".type-menu button", { hasText: "段落" }).click();
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
    // Notion's answer to an empty page: one line is always there to work on.
    expect(await page.locator(".operation-line").count()).toBe(1);
    expect(await preview.locator("[data-block-type]").count()).toBe(0);

    // It says what can be done on it — the only place `/` is discoverable.
    expect(
      await page
        .locator(".operation-line .field-input")
        .getAttribute("placeholder")
    ).toContain("/");

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

    const menu = page.locator(".type-menu");
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

    const menu = page.locator(".type-menu");
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

  it("adds a line from that line's own + handle", async () => {
    const { page } = await openPage();
    await addParagraph(page);
    await page.locator(".field-input").first().fill("第一行");

    const line = page.locator(".block").first();
    await line.hover();
    // The handle only exists on the line under the pointer — that is the design.
    await line.locator('.gutter-action[data-gutter="add"]').click();

    const menu = page.locator(".type-menu");
    await menu.waitFor();
    expect(await menu.locator("button").count()).toBe(BLOCK_TYPES);
    // The menu the `+` opens is filterable too, so a type is reachable by name
    // without a memorised order.
    await page.keyboard.type("blockq");
    expect(await menu.locator("button").count()).toBe(1);
    await menu.locator("button").first().click();

    // It lands below the line it was asked from, and the caret is in it.
    const types = await page
      .locator(".block")
      .evaluateAll((rows) => rows.map((row) => row.dataset.blockType));
    expect(types).toEqual(["paragraph", "blockquote"]);
    await page.keyboard.type("引用来源");
    const source = await readSource(page);
    expect(JSON.stringify(source.blocks)).toContain("引用来源");

    await page.close();
  });

  it("keeps a line to work on without writing it into the document", async () => {
    const { page, preview } = await openPage();

    // Zero blocks, yet there is still somewhere to type and a `+` to hover.
    expect(await page.locator(".block").count()).toBe(0);
    expect(await page.locator(".operation-line").count()).toBe(1);
    // And it is *not* content: the pane renders the document, which is empty.
    await expect
      .poll(async () => await preview.locator("[data-block-type]").count(), {
        timeout: 60_000,
      })
      .toBe(0);

    // Typing on it makes a real block — typed one key at a time, because the
    // first keystroke replaces the line under the caret and has to put it back.
    await page.locator(".operation-line .field-input").click();
    await page.keyboard.type("逐字输入");
    await page.waitForSelector('.block[data-block-type="paragraph"]');

    expect(await page.locator(".block").count()).toBe(1);
    // A fresh operation line takes the old one's place, so there is always one.
    expect(await page.locator(".operation-line").count()).toBe(1);
    expect((await readSource(page)).blocks[0]?.text).toBe("逐字输入");

    // Now that it is content, the pane renders it.
    await expect
      .poll(async () => await preview.locator("body").innerText(), {
        timeout: 60_000,
      })
      .toContain("逐字输入");

    await page.close();
  });

  it("waits for an IME composition before the operation line becomes a block", async () => {
    const { page } = await openPage();
    const field = page.locator(".operation-line .field-input");

    // Half-composed input: this is what a Chinese IME sends while the author is
    // still choosing characters. Acting on it would commit "zhong" and replace the
    // element being composed in, so the composition could never be finished.
    await field.click();
    await field.evaluate((element) => {
      const input = element as HTMLInputElement;
      input.value = "zhong";
      input.dispatchEvent(
        new CompositionEvent("compositionstart", { bubbles: true })
      );
      input.dispatchEvent(
        new InputEvent("input", { bubbles: true, isComposing: true })
      );
    });
    expect(await page.locator(".block").count()).toBe(0);

    // Composition finished: now the text is text.
    await field.evaluate((element) => {
      const input = element as HTMLInputElement;
      input.value = "中文";
      input.dispatchEvent(
        new CompositionEvent("compositionend", { bubbles: true, data: "中文" })
      );
    });
    await page.waitForSelector('.block[data-block-type="paragraph"]');
    expect((await readSource(page)).blocks[0]?.text).toBe("中文");

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

    // Deleting goes through the line's own handle now, the way it does in Notion.
    const block = page.locator(".block").first();
    await block.hover();
    await block.locator('.gutter-action[data-gutter="menu"]').click();
    await page.locator(".block-menu button", { hasText: "删除" }).click();

    expect(await page.locator(".block").count()).toBe(0);
    expect(await page.locator("#editor > *").count()).toBe(1);
    expect(await page.locator(".operation-line").count()).toBe(1);
    await expect
      .poll(async () => await preview.locator("[data-block-type]").count(), {
        timeout: 60_000,
      })
      .toBe(0);

    await page.close();
  });

  it("renames the document in place, and saves the file under that name", async () => {
    const { page } = await openPage();

    await page.locator("#title").dblclick();
    const input = page.locator(".bar-title-input");
    await input.waitFor();
    await input.fill("季度评审");
    await page.keyboard.press("Enter");

    // Enter committed it, and into the document rather than only the bar.
    expect(await page.locator("#title").textContent()).toBe("季度评审");
    expect(await page.locator(".bar-title-input").count()).toBe(0);
    expect((await readSource(page)).meta?.title).toBe("季度评审");

    // Clicking away commits too.
    await page.locator("#title").dblclick();
    await page.locator(".bar-title-input").fill("季度评审 2026");
    await page.locator(".preview-head").click();
    expect(await page.locator("#title").textContent()).toBe("季度评审 2026");

    // Escape abandons the edit.
    await page.locator("#title").dblclick();
    await page.locator(".bar-title-input").fill("不要这个");
    await page.keyboard.press("Escape");
    expect(await page.locator("#title").textContent()).toBe("季度评审 2026");

    // An empty name is refused: the schema requires at least one character, so
    // accepting it would break the document the moment someone cleared the field.
    await page.locator("#title").dblclick();
    await page.locator(".bar-title-input").fill("   ");
    await page.keyboard.press("Enter");
    expect(await page.locator("#title").textContent()).toBe("季度评审 2026");

    // …and the saved file carries the document's own name.
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      (async () => {
        await page.click("#menu-button");
        await page.click('[data-action="export"]');
      })(),
    ]);
    expect(download.suggestedFilename()).toBe("季度评审 2026.airp.json");

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

    expect(download.suggestedFilename()).toBe("未命名报告.airp.json");
    // The save writes the document's timestamp, which is what the head shows — so
    // the time is when the author saved, not when a pane happened to refresh.
    const saved = await readSource(page);
    expect(typeof saved.meta?.updatedAt).toBe("string");
    expect(Number.isNaN(Date.parse(String(saved.meta?.updatedAt)))).toBe(false);
    expect(await page.locator("#state").textContent()).toContain("已同步");

    await page.close();
  });
});
