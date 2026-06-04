import { describe, expect, it } from "vitest";
import { parseAirpDocument } from "@/lib/airp-schema";

describe("parseAirpDocument", () => {
  it("accepts a minimal valid document", () => {
    const doc = parseAirpDocument({
      schemaVersion: "1.0.0",
      meta: {
        title: "Minimal",
        kind: "generic",
        createdAt: "2026-01-01T00:00:00.000Z",
      },
      i18n: {
        defaultLocale: "en",
        locales: ["en"],
      },
      blocks: [{ type: "paragraph", text: "hello" }],
    });

    expect(doc.meta.title).toBe("Minimal");
    expect(doc.blocks).toHaveLength(1);
  });

  it("rejects invalid schemaVersion", () => {
    expect(() =>
      parseAirpDocument({
        schemaVersion: "2.0.0",
        meta: {
          title: "Bad",
          kind: "generic",
          createdAt: "2026-01-01T00:00:00.000Z",
        },
        i18n: {
          defaultLocale: "en",
          locales: ["en"],
        },
        blocks: [{ type: "paragraph", text: "hello" }],
      })
    ).toThrow();
  });
});
