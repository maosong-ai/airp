---
name: airp-dashboard
description: Start a local dashboard server to view or upload `*.airp.json`. Use when the user asks for /airp-dashboard, AIRP dashboard, view airp.json, or local web preview.
license: MIT
disable-model-invocation: true
---

# /airp-dashboard

Starts a local dashboard web server and opens it in the default browser.

## Scope

- **Does**: start a local HTTP server for the vendored dashboard UI (`renderer-dist/`) and open it in the default browser
- **Does not**: require `pnpm` or any project `renderer/` directory
- **Does not**: generate `.airp.json` (use `/airp` first)

## Workflow

```
- [ ] Ensure dashboard assets exist under this skill (renderer-dist/index.html)
- [ ] Run the server from the skill root
- [ ] Open the printed URL in the default browser
```

**Step 1 — Start server**

From the **skill root** (directory containing this `SKILL.md`; when installed globally, e.g. `~/.cursor/skills/airp-dashboard/` or `~/.agents/skills/airp-dashboard/`):

```bash
node scripts/serve-dashboard.mjs
```

The server prints the actual URL (port is auto-assigned):

```
http://127.0.0.1:<port>/
```

If you run from the project root, resolve `scripts/serve-dashboard.mjs` to an absolute path under this skill, or `cd` to the skill root first.

**Step 2 — Open**

`scripts/serve-dashboard.mjs` will try to open the URL automatically via `scripts/open-url.mjs`. If it fails, open it manually (from the skill root):

```bash
node -e "import('./scripts/open-url.mjs').then(m=>m.openUrl(process.argv[1]))" http://127.0.0.1:<port>/
```

## Input and output

**Input**: none (you interact with the dashboard UI in the browser).

**Output**: a local URL printed to stdout (and opened in the default browser when possible).

## Asset bundling requirements

Dashboard static assets must be vendored with this skill:

- `renderer-dist/index.html` (and accompanying assets)

This skill must not depend on any project `renderer/` directory or `pnpm`.

## Port strategy (required)

- Bind to `127.0.0.1` and let the OS choose an available port: `server.listen(0, "127.0.0.1")`
- After listening, read the actual port from `server.address().port`

## CLI (`serve-dashboard.mjs`)

### Options

| Flag | Description |
|------|-------------|
| `-h`, `--help` | Show help (not implemented; treat as unsupported) |

### Examples

```bash
# Start the dashboard server
node scripts/serve-dashboard.mjs
```

## CLI (`open-url.mjs`)

### Options

| Flag | Description |
|------|-------------|
| _(none)_ | Opens the first positional argument (`<url-or-path>`) using the OS default opener |

### Examples

```bash
# Open the local dashboard URL
node -e "import('./scripts/open-url.mjs').then(m=>m.openUrl(process.argv[1]))" http://127.0.0.1:<port>/
```

