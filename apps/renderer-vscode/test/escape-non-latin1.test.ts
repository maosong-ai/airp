import { describe, expect, it } from "vitest";
import { escapeNonLatin1 } from "../scripts/escape-non-latin1.mjs";

const NON_LATIN1 = /[\u0100-\uffff]/;

function evaluate(source: string): unknown {
  return new Function(`return (${source});`)();
}

describe("airp-renderer-vscode unit escape non-Latin-1", () => {
  it("keeps Latin-1 source unchanged", () => {
    const source = 'const s = "café ©";';
    expect(escapeNonLatin1(source)).toBe(source);
  });

  it("escapes every char above U+00FF", () => {
    const escaped = escapeNonLatin1('"1、2．₊ﬂ😀"');
    expect(NON_LATIN1.test(escaped)).toBe(false);
    expect(evaluate(escaped)).toBe("1、2．₊ﬂ😀");
  });

  it("preserves regex literal behavior with and without the u flag", () => {
    const plain = "/^\\d+[.．、]?\\s*/";
    const unicode = "/^(\\d+)([.．、])?\\s+(.+)$/u";
    const astral = "/^[😀]$/u";
    for (const source of [plain, unicode, astral]) {
      const original = evaluate(source) as RegExp;
      const escaped = evaluate(escapeNonLatin1(source)) as RegExp;
      for (const input of ["1、 标题", "2． x", "3. y", "😀", "z"]) {
        expect(escaped.exec(input)).toEqual(original.exec(input));
      }
    }
  });
});
