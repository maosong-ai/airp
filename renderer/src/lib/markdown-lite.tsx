import type { ReactNode } from "react";

/** Minimal inline markdown for AIRP RichText strings */
export function renderMarkdownLite(text: string): ReactNode[] {
  const parts: ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = re.exec(text)) !== null) {
    if (match.index > last) {
      parts.push(text.slice(last, match.index));
    }
    const token = match[0]!;
    if (token.startsWith("**")) {
      parts.push(
        <strong key={key++}>{token.slice(2, -2)}</strong>
      );
    } else if (token.startsWith("`")) {
      parts.push(
        <code key={key++} className="rounded bg-muted px-1 py-0.5 font-mono text-xs">
          {token.slice(1, -1)}
        </code>
      );
    } else if (token.startsWith("[")) {
      const m = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(token);
      if (m) {
        parts.push(
          <a
            className="text-primary underline underline-offset-2"
            href={m[2]}
            key={key++}
            rel="noreferrer"
            target="_blank"
          >
            {m[1]}
          </a>
        );
      }
    }
    last = match.index + token.length;
  }
  if (last < text.length) {
    parts.push(text.slice(last));
  }
  return parts.length ? parts : [text];
}
