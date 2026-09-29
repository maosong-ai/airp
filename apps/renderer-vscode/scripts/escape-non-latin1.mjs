import { readFile, writeFile } from "node:fs/promises";

const NON_LATIN1 = /[\u0100-\uffff]/g;

/**
 * Rewrite every UTF-16 code unit above U+00FF as `\uXXXX`.
 * Equivalent inside strings, regex literals, identifiers and comments; only a
 * template literal's `.raw` text would differ.
 */
export function escapeNonLatin1(source) {
  return source.replace(
    NON_LATIN1,
    (char) => `\\u${char.charCodeAt(0).toString(16).padStart(4, "0")}`
  );
}

/**
 * esbuild escapes non-ASCII in strings but leaves regex literals untouched.
 * One such char makes V8 keep the whole script source as two-byte UTF-16,
 * doubling its resident size in every worker process.
 */
export function escapeNonLatin1Plugin() {
  return {
    name: "escape-non-latin1",
    setup(build) {
      const { outfile } = build.initialOptions;
      build.onEnd(async (result) => {
        if (result.errors.length > 0 || !outfile) {
          return;
        }
        const source = await readFile(outfile, "utf8");
        const escaped = escapeNonLatin1(source);
        if (escaped !== source) {
          await writeFile(outfile, escaped, "utf8");
        }
      });
    },
  };
}
