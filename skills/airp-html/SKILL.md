---
name: airp-html
description: Renders an existing `*.airp.json` to a single static `*.html` and opens it in the default browser. Use when the user asks for /airp-html, AIRP HTML export, static HTML, or converting airp.json to html.
license: MIT
disable-model-invocation: true
---

# /airp-html

Renders an existing `*.airp.json` to a single `*.html` file (ready to share or archive).

## Scope

- **Does**: render `.airp.json` → `.html`, then open the HTML in the default browser
- **Does not**: generate `.airp.json` (use `/airp` first)
- **Recommended chain**: `/airp` → `/airp-html` (pass the `.airp.json` path explicitly in the prompt)

## Workflow

```
- [ ] Confirm <input.airp.json> exists
- [ ] Run render-static from this skill root
- [ ] Open the output HTML in the default browser
```

**Step 1 — Render**

From the **skill root** (directory containing this `SKILL.md`; when installed globally, e.g. `~/.cursor/skills/airp-html/` or `~/.agents/skills/airp-html/`):

```bash
node scripts/render-static.mjs <input.airp.json> [options]
```

If you run from the project root, resolve `scripts/render-static.mjs` to an absolute path under this skill, or `cd` to the skill root first.

**Step 2 — Open**

From the skill root. Use the actual output path (default: same basename as input with `.html`, or the path from `--output`):

```bash
node -e "import('./scripts/open-url.mjs').then(m=>m.openUrl(process.argv[1]))" <output.html>
```

## Input and output

**Input**: path to an existing `.airp.json` file.

- Example: `.docs/airp/foo.airp.json`

**Output**: a single `.html` file.

- **Default**: same directory as the input, same basename with a new extension  
  - `foo.airp.json` → `foo.html`
- **Custom path**: pass `-o` / `--output`  
  - Example: `--output .docs/airp/foo.html`

## CLI (`render-static.mjs`)

### Options

| Flag | Description |
|------|-------------|
| `-h`, `--help` | Show help |
| `-o`, `--output <file.html>` | Output path (default: input basename → `.html`) |

### Examples

```bash
# Minimal (writes foo.html next to foo.airp.json)
node scripts/render-static.mjs .docs/airp/foo.airp.json

# Custom output path
node scripts/render-static.mjs .docs/airp/foo.airp.json --output .docs/airp/foo.html
```

## CLI (`open-url.mjs`)

### Options

| Flag | Description |
|------|-------------|
| _(none)_ | Opens the first positional argument (`<url-or-path>`) using the OS default opener |

### Examples

```bash
# Open the generated HTML file
node -e "import('./scripts/open-url.mjs').then(m=>m.openUrl(process.argv[1]))" .docs/airp/foo.html

# Open a web URL
node -e "import('./scripts/open-url.mjs').then(m=>m.openUrl(process.argv[1]))" https://example.com
```
