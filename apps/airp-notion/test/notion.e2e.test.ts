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

/**
 * Stand in for the browser's save picker.
 *
 * Chromium's real one opens an operating-system dialog no test can answer, so the
 * logic worth testing — bound to a file after the first save, no dialog after
 * that, 另存为 always asking — is tested against a stand-in that records what it
 * was asked for and what it was told to write.
 */
async function stubPicker(page: Page, fileName: string): Promise<void> {
  await page.addInitScript((name: string) => {
    const log = { names: [] as string[], writes: [] as string[] };
    (window as unknown as { __picker: typeof log }).__picker = log;
    (
      window as unknown as {
        showSaveFilePicker: (options: {
          suggestedName?: string;
        }) => Promise<unknown>;
      }
    ).showSaveFilePicker = (options) => {
      log.names.push(options.suggestedName ?? "");
      return Promise.resolve({
        createWritable: () =>
          Promise.resolve({
            close: () => Promise.resolve(),
            write: (text: string) => {
              log.writes.push(text);
              return Promise.resolve();
            },
          }),
        name,
      });
    };
  }, fileName);
}

/** The picker's log, as the page recorded it. */
async function pickerLog(
  page: Page
): Promise<{ names: string[]; writes: string[] }> {
  return (await page.evaluate(
    () => (window as unknown as { __picker: unknown }).__picker
  )) as { names: string[]; writes: string[] };
}

async function openPage(options?: { picker?: string }): Promise<{
  page: Page;
  preview: FrameLocator;
}> {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
  });
  if (options?.picker !== undefined) {
    await stubPicker(page, options.picker);
  }
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

/** The document as it is in memory — what a save would write. */
async function documentOf(page: Page): Promise<{
  blocks: Record<string, unknown>[];
  meta?: Record<string, unknown>;
}> {
  return (await page.evaluate(() =>
    (
      window as unknown as { __airp: { document: () => unknown } }
    ).__airp.document()
  )) as { blocks: Record<string, unknown>[]; meta?: Record<string, unknown> };
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
    // The operation line is the one place `/` opens the menu.
    await page.locator(".operation-line .field-input").click();
    await page.keyboard.type("/");

    const menu = page.locator(".type-menu");
    await menu.waitFor();
    // Typing a query used to be the only way to reach the types past the cap.
    expect(await menu.locator("button").count()).toBe(BLOCK_TYPES);

    await page.close();
  });

  it("inserts a block through the / menu and lands the caret in it", async () => {
    const { page } = await openPage();
    await page.locator(".operation-line .field-input").click();
    await page.keyboard.type("/blockquote");

    const menu = page.locator(".type-menu");
    await menu.waitFor();
    expect(await menu.locator("button").count()).toBe(1);
    expect(await menu.locator("button").first().textContent()).toContain(
      "引用"
    );

    await page.keyboard.press("Enter");

    // Nothing else did either: the operation line is not a block, so choosing a
    // type adds one block, not two.
    expect(await page.locator(".block").count()).toBe(1);
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

    // The hint belongs to the affordance, not to the block. An empty paragraph
    // carrying the same sentence would both look like the operation line and tell
    // the author to press `/` somewhere `/` does nothing.
    expect(
      await page
        .locator(".block .field-input")
        .first()
        .getAttribute("placeholder")
    ).toBeNull();
    expect(
      await page
        .locator(".operation-line .field-input")
        .getAttribute("placeholder")
    ).toContain("/");
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

  it("reorders within a parent by dragging the handle", async () => {
    const { page } = await openPage();
    for (const text of ["甲", "乙", "丙"]) {
      await page.locator(".operation-line .field-input").click();
      await page.keyboard.type(text);
      await page.waitForSelector('.block[data-block-type="paragraph"]');
    }
    const order = async (): Promise<unknown[]> =>
      (await documentOf(page)).blocks.map((block) => block.text);
    expect(await order()).toEqual(["甲", "乙", "丙"]);

    // Driven with explicit pointer events rather than the mouse: the browser's
    // real input pipeline and the page's handlers are not ordered against each
    // other, so a move can be observed before it has been processed.
    const third = page.locator('.block[data-path="blocks/2"]');
    await third.hover();
    const grip = third.locator('.gutter-action[data-gutter="menu"]');
    const gripBox = await grip.boundingBox();
    const firstBox = await page
      .locator('.block[data-path="blocks/0"]')
      .boundingBox();
    if (gripBox === null || firstBox === null) {
      throw new Error("rows have no box to drag");
    }
    const x = gripBox.x + gripBox.width / 2;
    await grip.dispatchEvent("pointerdown", {
      bubbles: true,
      clientX: x,
      clientY: gripBox.y + gripBox.height / 2,
      pointerId: 1,
    });
    await grip.dispatchEvent("pointermove", {
      bubbles: true,
      clientX: x,
      clientY: firstBox.y + 2,
      pointerId: 1,
    });

    // Mid-drag: the row is lifted and its siblings have slid aside. This is the
    // part that makes it feel like reordering a table view rather than a jump.
    expect(await page.locator('.block[data-dragging="true"]').count()).toBe(1);
    const transforms = await page
      .locator(".block")
      .evaluateAll((rows) => rows.map((row) => row.style.transform));
    expect(transforms.filter((value) => value !== "").length).toBeGreaterThan(
      0
    );

    await grip.dispatchEvent("pointerup", {
      bubbles: true,
      clientX: x,
      clientY: firstBox.y + 2,
      pointerId: 1,
    });

    // The document really changed, not just the DOM.
    expect(await order()).toEqual(["丙", "甲", "乙"]);
    // A plain click on the grip still opens the block menu.
    await page.locator('.block[data-path="blocks/0"]').hover();
    await page
      .locator(
        '.block[data-path="blocks/0"] .gutter-action[data-gutter="menu"]'
      )
      .click();
    expect(await page.locator(".block-menu button").count()).toBeGreaterThan(0);

    await page.close();
  });

  it("leaves a slash alone in a block that already exists", async () => {
    const { page } = await openPage();
    await addParagraph(page);

    await page.locator(".field-input").first().click();
    await page.keyboard.type("a/b 与 /check");
    await page.waitForTimeout(300);

    // No menu: on an existing block a `/` is a slash. Its type is changed
    // deliberately, through the handle's 转为.
    expect(await page.locator(".type-menu").isHidden()).toBe(true);
    expect((await documentOf(page)).blocks[0]?.text).toBe("a/b 与 /check");

    await page.close();
  });

  it("converts a block in place, keeping what it says", async () => {
    const { page } = await openPage();
    await addParagraph(page);

    await page.locator(".field-input").first().fill("这句话要留下来");
    await page.waitForTimeout(200);

    const line = page.locator(".block").first();
    await line.hover();
    await line.locator('.gutter-action[data-gutter="menu"]').click();
    await page.locator(".block-menu button", { hasText: "转为" }).click();
    await page.locator(".type-menu button", { hasText: "引用" }).click();

    // A different type, the same words: a rebuild must not throw away content.
    const blocks = (await documentOf(page)).blocks;
    expect(blocks).toHaveLength(1);
    expect(blocks[0]?.type).toBe("blockquote");
    expect(blocks[0]?.text).toBe("这句话要留下来");

    await page.close();
  });

  it("saves into the file it is bound to, and dialogs only when asked", async () => {
    const { page } = await openPage({ picker: "季度评审.airp.json" });
    await addParagraph(page);

    // The first save has no file yet, so it asks — suggesting the document's name.
    await page.click("#menu-button");
    await page.click('[data-action="save"]');
    await expect
      .poll(async () => (await pickerLog(page)).writes.length, {
        timeout: 5000,
      })
      .toBe(1);
    expect((await pickerLog(page)).names).toEqual(["未命名报告.airp.json"]);
    expect(await page.locator("#state").textContent()).toContain(
      "已保存到 季度评审.airp.json"
    );

    // Editing and saving again edits *that file*: no dialog, same file, one more
    // write. A second save on a document that already lives somewhere is not a
    // question.
    await page.locator(".field-input").first().fill("改一下");
    await page.waitForTimeout(400);
    await page.click("#menu-button");
    await page.click('[data-action="save"]');
    await expect
      .poll(async () => (await pickerLog(page)).writes.length, {
        timeout: 5000,
      })
      .toBe(2);
    expect((await pickerLog(page)).names).toHaveLength(1);

    // 另存为 always asks.
    await page.click("#menu-button");
    await page.click('[data-action="save-as"]');
    await expect
      .poll(async () => (await pickerLog(page)).names.length, { timeout: 5000 })
      .toBe(2);
    expect((await pickerLog(page)).writes).toHaveLength(3);

    await page.close();
  });

  it("keeps a field one line tall until its text needs more", async () => {
    const { page } = await openPage();
    await addParagraph(page);
    const field = page.locator(".block .field-input").first();

    const oneLine = (await field.boundingBox())?.height ?? 0;
    // One line of prose, not the two rows it used to reserve — and not a
    // collapsed box either. Measuring before the field is attached yields a
    // `scrollHeight` of zero, and `< 40` alone would happily accept that.
    expect(oneLine).toBeGreaterThan(20);
    expect(oneLine).toBeLessThan(40);

    await field.fill("短");
    await page.waitForTimeout(200);
    const filled = (await field.boundingBox())?.height ?? 0;
    expect(filled).toBeGreaterThan(20);
    expect(filled).toBeLessThan(40);

    // Long enough to wrap: it grows rather than scrolling inside itself, which is
    // the only thing that makes a one-row field worse than a two-row one.
    await field.fill("很长的一段文字，".repeat(12));
    await page.waitForTimeout(300);
    expect((await field.boundingBox())?.height ?? 0).toBeGreaterThan(
      oneLine + 10
    );

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
    const { page } = await openPage({ picker: "季度评审 2026.airp.json" });

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

    // …and the file it offers to write carries the document's own name.
    await page.click("#menu-button");
    await page.click('[data-action="save-as"]');
    await expect
      .poll(async () => (await pickerLog(page)).names.length, { timeout: 5000 })
      .toBe(1);
    expect((await pickerLog(page)).names[0]).toBe("季度评审 2026.airp.json");

    await page.close();
  });

  it("stamps the document's own time when saving", async () => {
    const { page } = await openPage({ picker: "报告.airp.json" });
    await addParagraph(page);

    expect(await page.locator("#preview-state").textContent()).toContain(
      "最后更新"
    );

    await page.click("#menu-button");
    await page.click('[data-action="save"]');

    // The save writes the document's timestamp, which is what the head shows — so
    // the time is when the author saved, not when a pane happened to refresh.
    await expect
      .poll(async () => (await pickerLog(page)).writes.length, {
        timeout: 5000,
      })
      .toBe(1);
    const written = JSON.parse((await pickerLog(page)).writes[0] ?? "{}") as {
      meta?: { updatedAt?: string };
    };
    expect(typeof written.meta?.updatedAt).toBe("string");
    expect(Number.isNaN(Date.parse(String(written.meta?.updatedAt)))).toBe(
      false
    );
    expect(await page.locator("#state").textContent()).toContain("已保存到");

    await page.close();
  });
});
