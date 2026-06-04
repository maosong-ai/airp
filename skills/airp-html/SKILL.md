---
name: airp-html
description: Renders an existing `*.airp.json` to static `*.html`. Supports multi-locale with switcher (all locales, default) or single-locale only. Use when the user asks for /airp-html, HTML export, static HTML, convert airp.json to html, single-language HTML, multi-language HTML, or export with language selection.
license: MIT
disable-model-invocation: true
---

# /airp-html

Renders an existing `*.airp.json` to a single `*.html` file (ready to share or archive).

## Scope

- **Does**: render `.airp.json` → `.html`, then open the HTML in the default browser
- **Does not**: generate `.airp.json` (use `/airp` first)
- **Recommended chain**: `/airp` → `/airp-html` (pass the `.airp.json` path explicitly in the prompt)

## Locale handling

The skill supports optional language selection, which determines the HTML export mode:

- **Without language**: 
  - Mapped to: `--locale-mode all`
  - Exports all supported locales with a locale switcher
  - Initial page load uses browser language detection (falling back to `doc.i18n.defaultLocale`)

- **With language**: User provides a locale code (e.g. `zh-CN`, `en`, `ja-JP`)
  - Mapped to: `--locale-mode single --single-locale <code>`
  - Validation: If locale is not in `doc.i18n.locales`, rendering fails
  - Exports only the specified locale without a locale switcher

## Pre-flight Checks

- [ ] Confirm `<input.airp.json>` exists and is valid
- [ ] Verify document has `i18n.locales` defined
- [ ] If specifying single locale: confirm it's in `doc.i18n.locales`

## Workflow

```
- [ ] Decide: all locales (with switcher) or single locale only?
- [ ] Map user choice to CLI parameters
- [ ] Run render-html.mjs with validated parameters
- [ ] Open the generated HTML in browser
```

**Execute from skill root** (directory containing this `SKILL.md`):

```bash
# All locales mode (default: with switcher, runtime detection)
node scripts/render-html.mjs <input.airp.json> [--output <file.html>]

# Single locale mode (no switcher, locked language)
node scripts/render-html.mjs <input.airp.json> --locale-mode single --single-locale <code> [--output <file.html>]
```

**Then open in browser:**

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

## CLI (`render-html.mjs`)

### Options

| Flag | Description |
|------|-------------|
| `-h`, `--help` | Show help |
| `--locale-mode <all\|single>` | Export mode (default: `all`). `all` exports all locales with switcher; `single` exports one locale only |
| `--single-locale <code>` | Required when `--locale-mode single`. Target locale code (e.g. `zh-CN`, `en`, `ja-JP`); must be in `doc.i18n.locales` |
| `-o`, `--output <file.html>` | Output path (default: input basename → `.html`) |

### Parameter Validation Rules (fail-closed)

| Scenario | Expected Result |
|----------|----------------|
| `--locale-mode` omitted | Treat as `all` (no error) |
| `--locale-mode=all` AND `--single-locale` provided | ❌ Error: conflicting parameters |
| `--locale-mode=single` AND `--single-locale` omitted | ❌ Error: `--single-locale` required |
| `--locale-mode=single --single-locale <code>` where code ∉ `doc.i18n.locales` | ❌ Error: unsupported locale |
| `--locale-mode` value ∉ {`all`, `single`} | ❌ Error: invalid mode |

### Examples

```bash
# Export all locales (default mode)
node scripts/render-html.mjs .docs/airp/foo.airp.json

# Explicitly request all locales
node scripts/render-html.mjs .docs/airp/foo.airp.json --locale-mode all

# Export only one locale
node scripts/render-html.mjs .docs/airp/foo.airp.json --locale-mode single --single-locale zh-CN
node scripts/render-html.mjs .docs/airp/foo.airp.json --locale-mode single --single-locale en --output .docs/airp/foo-en.html

# When called from the skill:
# - User doesn't provide language: calls --locale-mode all
# - User provides language: calls --locale-mode single --single-locale <code>
```

## Anti-patterns

❌ **"I want to modify the document content"** → ✅ Use `/airp` first to create/edit the `.airp.json`

❌ **"I need the page to start in Japanese even though defaultLocale is Chinese"** → This is not `--locale-mode` responsibility. That's post-export runtime behavior (browser language detection). Use `all` mode; runtime will match `navigator.languages` against `doc.i18n.locales`.

❌ **"I want a single-locale export but with locale switcher"** → Not supported. `single` means locked language, no switcher. Use `all` mode if users must switch languages.

❌ **Passing both `--locale-mode all` and `--single-locale`** → Parameters are mutually exclusive; CLI will fail. Choose one export mode.

## Delivery Checklist

- [ ] Input document exists and `i18n.locales` is defined
- [ ] Chosen locale (if single mode) exists in `doc.i18n.locales`
- [ ] Confirm `render-html.mjs` exited with code 0 and produced a non-empty output file (runtime JS errors cannot be verified from CLI output alone — flag this as a manual check)
- [ ] In `all` mode: locale switcher UI is visible and functional
- [ ] In `single` mode: locale switcher UI is hidden; locale is locked
- [ ] HTML can be opened as `file://` or served via HTTP
- [ ] For archival/sharing: output is self-contained (no external asset dependencies)

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
