## Get current datetime for AIRP meta

AIRP `meta.createdAt` / `meta.updatedAt` must use the **real current time**. Never guess or infer from context.

### Command (UTC, ISO 8601 with milliseconds)

Run:

```bash
node scripts/get-current-datetime.mjs
```

Example output:

`2026-06-16T09:13:12.345Z`

### Rules

- Use the command output **verbatim** for `meta.createdAt`.
- Set `meta.updatedAt` to the **same value** for a freshly generated report.
- If the command fails or returns an unexpected format, **stop** and do not generate a best-effort timestamp.

