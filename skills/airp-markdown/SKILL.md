---
name: airp-markdown
description: Renders an existing `*.airp.json` to a Markdown `.md` file. Supports language selection (optional in skill, required in CLI). Use when the user asks for /airp-markdown, Markdown export, convert airp.json to markdown, markdown export, or export to specific language markdown.
license: MIT
disable-model-invocation: true
---

# /airp-markdown

Renders an existing `*.airp.json` to a single `.md` file.

## Scope

- **Does**: render `.airp.json` → `.md` with explicit language selection
- **Does not**: generate `.airp.json` (use `/airp` first)
- **Recommended chain**: `/airp` → `/airp-markdown` (pass the `.airp.json` path explicitly in the prompt)

## Locale Handling

The skill requires language selection at render time:

- **With language**: User provides a locale code (e.g. `zh-CN`, `en`, `ja-JP`)
  - Mapped to: `--locale <code>`
  - Validation: If locale is not in `doc.i18n.locales`, rendering fails
  - Example: `/airp-markdown path --locale zh-CN`

- **Without language**: User omits language parameter
  - Skill reads `doc.i18n.defaultLocale` from the document
  - Mapped to: `--locale <defaultLocale>`
  - Skill resolves the default locale before invoking CLI
  - Example: `/airp-markdown path` → uses document's default locale

In both cases, `render-markdown.mjs` CLI requires explicit `--locale`—the skill determines it when not provided.

## Pre-flight Checks

- [ ] Confirm `<input.airp.json>` exists and is valid
- [ ] Verify document has `i18n.locales` defined
- [ ] If specifying locale: confirm it's in `doc.i18n.locales`

## Workflow

```
- [ ] Decide: render with provided locale, or use doc's default?
- [ ] Map user choice to CLI parameters
- [ ] Run render-markdown.mjs with explicit --locale
- [ ] Verify output .md file created successfully
```

**Execute from skill root** (directory containing this `SKILL.md`):

```bash
# With explicit locale
node scripts/render-markdown.mjs <input.airp.json> --locale <code> [--output <file.md>]

# Without language parameter: Skill resolves doc.i18n.defaultLocale
node scripts/render-markdown.mjs <input.airp.json> --locale <resolved-locale> [--output <file.md>]
```

## CLI (`render-markdown.mjs`)

### Options

| Flag | Description |
|------|-------------|
| `-h`, `--help` | Show help |
| `--locale <code>` | **Required**. Target locale code (e.g. `zh-CN`, `en`, `ja-JP`); must be in `doc.i18n.locales` |
| `-o`, `--output <file.md>` | Output path (default: input basename → `.md`) |

### Parameter Validation Rules (fail-closed)

| Scenario | Expected Result |
|----------|----------------|
| `--locale` omitted | ❌ Error: parameter required |
| `--locale <code>` where code ∉ `doc.i18n.locales` | ❌ Error: unsupported locale |
| `--locale <code>` where code ∈ `doc.i18n.locales` | ✅ Success: render markdown in specified language |
| Invalid flag or malformed argument | ❌ Error: parse failure |

### Examples

```bash
# Render with explicit locale
node scripts/render-markdown.mjs .docs/airp/foo.airp.json --locale zh-CN

# Custom output path
node scripts/render-markdown.mjs .docs/airp/foo.airp.json --locale en --output .docs/airp/foo-en.md

# When called from the skill:
# - User provides language: calls --locale <user-code>
# - User omits language: Skill reads doc.i18n.defaultLocale, calls --locale <default>
```

## Anti-patterns

❌ **"I want to modify the document content"** → ✅ Use `/airp` first to create/edit the `.airp.json`

❌ **"Export Markdown but let me choose the language after"** → Language must be decided at export time. Use skill with explicit language parameter.

❌ **"I want Markdown in all languages in one file"** → Not supported. Markdown is single-language per export. Run skill multiple times with different `--locale` values.

❌ **Passing unsupported locale without checking `doc.i18n.locales`** → CLI will fail. Verify locale is in document's locale list first.

## Delivery Checklist

- [ ] Input document exists and `i18n.locales` is defined
- [ ] Target locale exists in `doc.i18n.locales`
- [ ] Confirm `render-markdown.mjs` exited with code 0 and produced a non-empty `.md` file (if CLI exits with non-zero code: capture stderr and surface the full error message to user; do not retry automatically)
- [ ] Output markdown is readable and has valid structure (frontmatter/body)
- [ ] All content blocks in target locale rendered (no placeholder or empty sections)
- [ ] For multi-run exports: naming convention distinguishes locale variants (e.g. `foo-en.md`, `foo-zh-CN.md`)
- [ ] Output file is portable and contains no absolute file references
