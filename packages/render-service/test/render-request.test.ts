/**
 * What the service has to be true to: the thing a host shows is the Renderer's
 * own output, not a lookalike.
 *
 * The comparisons are made against `@airp/renderer/node/render` — the function
 * behind `airp-render` and the VS Code worker — so a host asking this service for
 * a preview cannot end up displaying something the export would not produce.
 */

import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { renderDocument } from "@airp/renderer/node/render";
import { documentPath, resolveRepoRoot } from "@airp/test-kit";
import { describe, expect, it } from "vitest";
import {
  type RenderDocumentLoader,
  readJsonBody,
  renderRequest,
} from "../src/index.js";

const load: RenderDocumentLoader = async () => renderDocument;
const GALLERY = path.join(
  resolveRepoRoot(),
  ".docs/samples/airp-block-gallery-1-1-0.airp.json"
);

function readDocument(file: string): unknown {
  return JSON.parse(readFileSync(file, "utf8"));
}

/** Every valid fixture in the repository, whatever its schema version. */
function fixturePaths(): string[] {
  return readdirSync(documentPath("valid"))
    .filter((name) => name.endsWith(".airp.json"))
    .sort()
    .map((name) => path.join(documentPath("valid"), name));
}

/** The fixtures plus the gallery, for "everything renders". */
function documentPaths(): string[] {
  return [...fixturePaths(), GALLERY];
}

function bodyOf(rendered: {
  value: { files: { body: string | Uint8Array }[] };
}): string {
  return String(rendered.value.files[0]?.body ?? "");
}

describe("renderRequest", () => {
  it("renders every document, including the ones only the Node pipeline can", async () => {
    const failures: string[] = [];
    for (const file of documentPaths()) {
      const result = await renderRequest(
        { document: readDocument(file), target: "html" },
        load
      );
      if (!result.ok) {
        failures.push(`${path.basename(file)}: ${result.message}`);
      }
    }
    // A browser-only renderer cannot open the documents that carry a diagram:
    // Mermaid is laid out in jsdom, and the measurement is stubbed there.
    expect(failures).toEqual([]);
  }, 300_000);

  /**
   * The gallery is left out on purpose. It carries a diagram, and this branch's
   * Renderer is not byte-deterministic for Mermaid: rendering the same document
   * twice in one process gives two different SVGs. That is a property of the
   * Renderer, not of this service, and comparing two renders through it would
   * only measure the difference it already has.
   */
  it("returns exactly the bytes the Renderer writes", async () => {
    const mismatched: string[] = [];
    for (const file of fixturePaths()) {
      const document_ = readDocument(file);
      const ours = await renderRequest({ document: document_ }, load);
      const theirs = await renderDocument(document_ as never, "html", {});
      if (!(ours.ok && theirs.ok)) {
        mismatched.push(`${path.basename(file)}: render failed`);
        continue;
      }
      if (ours.body !== bodyOf(theirs)) {
        mismatched.push(
          `${path.basename(file)}: ${ours.body.length} bytes vs ${bodyOf(theirs).length}`
        );
      }
    }
    expect(mismatched).toEqual([]);
  }, 300_000);

  it("renders all 46 block types in the gallery, diagrams and code included", async () => {
    const rendered = await renderRequest(
      { document: readDocument(GALLERY), target: "html" },
      load
    );

    expect(rendered.ok).toBe(true);
    if (rendered.ok) {
      // The gallery carries every block type, so a step that only the Node
      // pipeline can do has to be present rather than quietly missing.
      expect(rendered.body).toContain("svg-viewer");
      expect(rendered.body).toContain("shiki-themes");
      expect(rendered.body).not.toContain("node-required");
    }
  }, 300_000);

  it("forwards target options, so a host can inject its own chrome", async () => {
    const document_ = readDocument(
      documentPath("valid", "minimal-1.1.0.airp.json")
    );
    const injected = await renderRequest(
      {
        document: document_,
        targetOptions: { extraHead: "<style>/* host */</style>" },
      },
      load
    );
    const plain = await renderRequest({ document: document_ }, load);

    expect(injected.ok && plain.ok).toBe(true);
    if (injected.ok && plain.ok) {
      expect(injected.body).toContain("/* host */");
      expect(plain.body).not.toContain("/* host */");
    }
  }, 120_000);

  it("ignores a target option the Renderer does not know", async () => {
    const document_ = readDocument(
      documentPath("valid", "minimal-1.1.0.airp.json")
    );
    const odd = await renderRequest(
      { document: document_, targetOptions: { notAKnob: 42 } },
      load
    );
    const plain = await renderRequest({ document: document_ }, load);

    expect(odd.ok && plain.ok).toBe(true);
    if (odd.ok && plain.ok) {
      expect(odd.body).toBe(plain.body);
    }
  }, 120_000);

  it("answers a document the Renderer rejects instead of throwing", async () => {
    const result = await renderRequest(
      {
        document: {
          blocks: [],
          i18n: { locale: "en" },
          meta: { title: "t" },
          schemaVersion: "9.9.9",
        },
      },
      load
    );

    // The Renderer throws for an unsupported version rather than answering with
    // `ok: false`, so the service has to carry the diagnostic through — a host
    // shows this string, and a bare "failed" would leave the author stuck.
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain(
        "protocol.schema.types.schema-version-unsupported"
      );
      expect(result.message).toContain("9.9.9");
    }
  }, 120_000);

  it("says what to build when the Renderer's Node entry cannot load", async () => {
    const result = await renderRequest(
      { document: { blocks: [], schemaVersion: "1.1.0" } },
      () => Promise.reject(new Error("no such module"))
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain("no such module");
      expect(result.message).toContain(
        "pnpm --filter @airp/renderer-target-html build"
      );
    }
  });
});

/**
 * The whole of what this service depends on, pinned in one place.
 *
 * Everything else about the Renderer can change without touching this package —
 * block types, layout, `targetOptions`, schema versions all flow through. These
 * few reads are the exception, so when the Renderer reshapes its result the
 * failure lands here, naming the contract, instead of surfacing in a browser as a
 * canvas that quietly shows nothing.
 */
describe("the contract this service consumes", () => {
  it("is still the shape the Renderer answers with", async () => {
    const rendered = await renderDocument(
      readDocument(documentPath("valid", "minimal-1.1.0.airp.json")) as never,
      "html",
      { targetOptions: {} }
    );

    expect(typeof rendered.ok).toBe("boolean");
    expect(Array.isArray(rendered.diagnostics)).toBe(true);
    if (!rendered.ok) {
      throw new Error("a minimal document has to render");
    }
    expect(Array.isArray(rendered.value.files)).toBe(true);
    expect(typeof rendered.value.files[0]?.body).toBe("string");
  }, 120_000);
});

describe("readJsonBody", () => {
  async function* chunks(...parts: Uint8Array[]): AsyncIterable<Uint8Array> {
    yield* parts;
  }

  it("parses a body and treats an empty one as an empty object", async () => {
    const encoded = new TextEncoder().encode('{"target":"markdown"}');
    await expect(readJsonBody(chunks(encoded))).resolves.toEqual({
      target: "markdown",
    });
    await expect(readJsonBody(chunks())).resolves.toEqual({});
  });

  it("refuses a body large enough to exhaust memory", async () => {
    const huge = new Uint8Array(33 * 1024 * 1024);
    await expect(readJsonBody(chunks(huge))).rejects.toThrow("请求体过大");
  });
});
