import {
  createHighlighterCore,
  type HighlighterCore,
  type LanguageInput,
} from "shiki/core";
import { createOnigurumaEngine } from "shiki/engine/oniguruma";

/**
 * Reader-side language whitelist (protocol language stays free-form).
 * Only these grammars are bundled; `text` is Shiki core's built-in plain language.
 */
const SHIKI_LANGUAGE_LOADERS = {
  diff: () => import("shiki/langs/diff.mjs"),
  typescript: () => import("shiki/langs/typescript.mjs"),
  javascript: () => import("shiki/langs/javascript.mjs"),
  tsx: () => import("shiki/langs/tsx.mjs"),
  jsx: () => import("shiki/langs/jsx.mjs"),
  html: () => import("shiki/langs/html.mjs"),
  css: () => import("shiki/langs/css.mjs"),
  scss: () => import("shiki/langs/scss.mjs"),
  json: () => import("shiki/langs/json.mjs"),
  jsonc: () => import("shiki/langs/jsonc.mjs"),
  go: () => import("shiki/langs/go.mjs"),
  rust: () => import("shiki/langs/rust.mjs"),
  c: () => import("shiki/langs/c.mjs"),
  cpp: () => import("shiki/langs/cpp.mjs"),
  csharp: () => import("shiki/langs/csharp.mjs"),
  java: () => import("shiki/langs/java.mjs"),
  kotlin: () => import("shiki/langs/kotlin.mjs"),
  python: () => import("shiki/langs/python.mjs"),
  ruby: () => import("shiki/langs/ruby.mjs"),
  php: () => import("shiki/langs/php.mjs"),
  lua: () => import("shiki/langs/lua.mjs"),
  shellscript: () => import("shiki/langs/shellscript.mjs"),
  powershell: () => import("shiki/langs/powershell.mjs"),
  yaml: () => import("shiki/langs/yaml.mjs"),
  toml: () => import("shiki/langs/toml.mjs"),
  xml: () => import("shiki/langs/xml.mjs"),
  graphql: () => import("shiki/langs/graphql.mjs"),
  sql: () => import("shiki/langs/sql.mjs"),
  protobuf: () => import("shiki/langs/protobuf.mjs"),
  markdown: () => import("shiki/langs/markdown.mjs"),
  mdx: () => import("shiki/langs/mdx.mjs"),
  vue: () => import("shiki/langs/vue.mjs"),
  svelte: () => import("shiki/langs/svelte.mjs"),
  dockerfile: () => import("shiki/langs/dockerfile.mjs"),
  terraform: () => import("shiki/langs/terraform.mjs"),
  nginx: () => import("shiki/langs/nginx.mjs"),
  makefile: () => import("shiki/langs/makefile.mjs"),
  swift: () => import("shiki/langs/swift.mjs"),
  scala: () => import("shiki/langs/scala.mjs"),
  dart: () => import("shiki/langs/dart.mjs"),
  ini: () => import("shiki/langs/ini.mjs"),
} satisfies Record<string, LanguageInput>;

export type ShikiLanguage = "text" | keyof typeof SHIKI_LANGUAGE_LOADERS;

const LANGUAGE_ALIASES: Record<string, ShikiLanguage> = {
  ts: "typescript",
  tsx: "tsx",
  js: "javascript",
  jsx: "jsx",
  mjs: "javascript",
  cjs: "javascript",
  cts: "typescript",
  mts: "typescript",
  py: "python",
  rb: "ruby",
  rs: "rust",
  sh: "shellscript",
  bash: "shellscript",
  zsh: "shellscript",
  shell: "shellscript",
  yml: "yaml",
  md: "markdown",
  plaintext: "text",
  plain: "text",
  txt: "text",
  "c++": "cpp",
  "c#": "csharp",
  cs: "csharp",
  ps1: "powershell",
  dockerfile: "dockerfile",
  docker: "dockerfile",
  tf: "terraform",
  hcl: "terraform",
  make: "makefile",
  mk: "makefile",
};

let highlighterPromise: Promise<HighlighterCore> | undefined;

/** Process-wide highlighter with every whitelisted language and both themes loaded. */
export function getHighlighter(): Promise<HighlighterCore> {
  highlighterPromise ??= createHighlighterCore({
    themes: [
      import("shiki/themes/one-light.mjs"),
      import("shiki/themes/one-dark-pro.mjs"),
    ],
    langs: Object.values(SHIKI_LANGUAGE_LOADERS),
    engine: createOnigurumaEngine(import("shiki/wasm")),
  });
  return highlighterPromise;
}

/** Normalize protocol language strings onto the whitelist; unknown → text. */
export function resolveShikiLanguage(
  language: string | undefined
): ShikiLanguage {
  if (!language || language.trim().length === 0) {
    return "text";
  }
  const key = language.trim().toLowerCase();
  const aliased = LANGUAGE_ALIASES[key];
  if (aliased) {
    return aliased;
  }
  if (Object.hasOwn(SHIKI_LANGUAGE_LOADERS, key)) {
    return key as ShikiLanguage;
  }
  return "text";
}

function decorateDiffLines(html: string): string {
  return html.replace(
    /<span class="line">([\s\S]*?)<\/span>/g,
    (full, inner: string) => {
      const text = inner.replace(/<[^>]+>/g, "");
      if (text.startsWith("+")) {
        return `<span class="line airp-diff-add">${inner}</span>`;
      }
      if (text.startsWith("-")) {
        return `<span class="line airp-diff-del">${inner}</span>`;
      }
      return full;
    }
  );
}

export interface HighlightCodeOptions {
  code: string;
  /** When true, tint +/- lines after Shiki. */
  diff?: boolean;
  language?: string;
}

/**
 * Highlight code with Shiki SSR (dual theme CSS variables for html.dark).
 * Failures and unknown languages degrade to plain text highlighting.
 */
export async function highlightCodeHtml(
  options: HighlightCodeOptions
): Promise<string> {
  const lang = resolveShikiLanguage(options.language);
  try {
    const highlighter = await getHighlighter();
    const html = highlighter.codeToHtml(options.code, {
      lang,
      themes: {
        light: "one-light",
        dark: "one-dark-pro",
      },
    });
    return options.diff ? decorateDiffLines(html) : html;
  } catch {
    try {
      const highlighter = await getHighlighter();
      const html = highlighter.codeToHtml(options.code, {
        lang: "text",
        themes: {
          light: "one-light",
          dark: "one-dark-pro",
        },
      });
      return options.diff ? decorateDiffLines(html) : html;
    } catch {
      return "";
    }
  }
}
