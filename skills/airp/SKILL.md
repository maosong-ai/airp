---
name: airp
description: Generate AIRP `*.airp.json` reports. Use when the user asks for /airp, AIRP, airp.json, or block-based technical reports.
license: MIT
disable-model-invocation: true
---

# /airp

Generates an AIRP `*.airp.json` report (AIRP v1.0.0).

## Scope

- **Does**: generate an `.airp.json` file in the workspace
- **Does not**: render HTML (use `/airp-html`)
- **Recommended chain**: `/airp` → `/airp-html` (pass the generated `.airp.json` path explicitly)

## Workflow

```
- [ ] Determine report intent and target audience
- [ ] Choose blocks (follow references/block-selection.md)
- [ ] For diagrams: follow references/mermaid-authoring.md
- [ ] Read and follow the schema (single source of truth)
- [ ] Write <output.airp.json> under the workspace
- [ ] Validate the output (must print "OK" — schema)
- [ ] Self-check Mermaid sources per mermaid-authoring.md (not covered by validate CLI)
```

**Step 1 — Choose blocks**

Use the "content → block" selection rules:

- `references/block-selection.md`

**Step 1b — Mermaid (when using `mermaid` or `architectureOverview`)**

Read and apply:

- `references/mermaid-authoring.md` (special characters, quoted nodes, official docs)

**Step 2 — Follow the schema (source of truth)**

The schema shipped with this skill is the single source of truth:

- `schemas/airp-document.schema.json`

Before generating, read and follow at minimum:

- top-level `required` and `additionalProperties: false`
- `blocks` discriminator (`type`) and each block's field constraints

**Step 3 — Write output**

Default output directory (relative to the **project root** / workspace root, not the skill directory):

- `.docs/airp/`

Allow overrides:

- `/airp --out <dir>`

**Locale (command flags)**

How to pass language intent on `/airp` (generation rules: `references/block-selection.md`):

| Case | Example |
|---|---|
| Not specified — use chat language, single locale | `/airp` |
| Multiple locales | `/airp --locales zh-CN,en` |
| Multiple locales + explicit default | `/airp --locales zh-CN,en --default-locale zh-CN` |

Same intent in plain language in the prompt (e.g. "中日英三语") counts as `--locales`

**Step 4 — Validate**

From the **skill root** (directory containing this `SKILL.md`; when installed globally, e.g. `~/.cursor/skills/airp/` or `~/.agents/skills/airp/`):

```bash
node scripts/validate-airp.mjs <path/to/file.airp.json>
```

If you run from the project root, resolve `scripts/validate-airp.mjs` to an absolute path under this skill, or `cd` to the skill root first.

`OK` means the file passes **AIRP JSON Schema** (structure, block types, required fields).

**Mermaid** is not validated by this CLI. Before delivery, apply `mermaid-authoring.md` to every `mermaid` / `architectureOverview.overview` `source`. Use `/airp-html` when you need to confirm diagrams render.

On schema failure: fix JSON per Zod/schema message. Do not produce a "best-effort" file — fix until validation prints `OK`.

## Input and output

**Input**: the user's request plus any relevant workspace context (docs, code, logs, etc.).

**Output**: a single `.airp.json` file in the workspace.

- **Default dir**: `.docs/airp/` (relative to the project root / workspace root)
- **Override**: `--out <dir>`
- **Locale**: omit flags for single chat language; `--locales` / `--default-locale` as above

## CLI (`validate-airp.mjs`)

Validates **schema only** (Zod / `airp-document.schema.json`). Diagram syntax is governed by `references/mermaid-authoring.md`.

### Examples

```bash
node scripts/validate-airp.mjs .docs/airp/foo.airp.json
```
