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
- [ ] Read and follow the schema (single source of truth)
- [ ] Write <output.airp.json> under the workspace
- [ ] Validate the output (must print "OK")
```

**Step 1 — Choose blocks**

Use the "content → block" selection rules:

- `references/block-selection.md`

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

**Step 4 — Validate**

From the **skill root** (directory containing this `SKILL.md`; when installed globally, e.g. `~/.cursor/skills/airp/` or `~/.agents/skills/airp/`):

```bash
node scripts/validate-airp.mjs <path/to/file.airp.json>
```

If you run from the project root, resolve `scripts/validate-airp.mjs` to an absolute path under this skill, or `cd` to the skill root first.

If validation fails, do not produce a "best-effort" file. Fix the JSON until validation prints `OK`.

## Input and output

**Input**: the user's request plus any relevant workspace context (docs, code, logs, etc.).

**Output**: a single `.airp.json` file in the workspace.

- **Default dir**: `.docs/airp/` (relative to the project root / workspace root)
- **Override**: `--out <dir>`

## CLI (`validate-airp.mjs`)

### Options

| Flag | Description |
|------|-------------|
| `-h`, `--help` | Show help |

### Examples

```bash
# Validate an existing report
node scripts/validate-airp.mjs .docs/airp/foo.airp.json
```

