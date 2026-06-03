## Mermaid authoring (AIRP)

Agent-generated `mermaid` and `architectureOverview.overview` blocks must use **valid Mermaid syntax**. `validate-airp.mjs` checks **JSON Schema only** — it does not run `mermaid.parse()`. Follow the rules below when writing diagrams; invalid syntax usually appears only when rendering with `/airp-html`.

### Official references

- [Syntax reference (overview)](https://mermaid.js.org/intro/syntax-reference.html)
- [Flowchart syntax](https://mermaid.js.org/syntax/flowchart.html) — node shapes, edge labels, special characters
- [Sequence diagram syntax](https://mermaid.js.org/syntax/sequenceDiagram.html)
- [mermaid.parse() API](https://mermaid.js.org/config/setup/modules/mermaidAPI.html#parse) — optional manual check in browser/Node tooling

### Hard rules (flowchart)

1. **Labels containing `/`, `#`, commas, or unmatched brackets**  
   Use a **quoted rectangle**: `id["/airp Skill"]`  
   Do **not** use trapezoid/subroutine delimiters with extra slashes inside, e.g. `id[/airp Skill]` (the `/` in `/airp` breaks the lexer).

2. **Stadium (terminal) shape**  
   Official v10 form: `id([Label text])` — parentheses + brackets, **no** slash inside the label delimiters.  
   v11+ preferred for complex labels: `id@{ shape: stadium, label: "Label text" }`  
   See [Flowchart node shapes](https://mermaid.js.org/syntax/flowchart.html).

3. **Paths and file names in nodes** (e.g. `skills/airp/schemas/`)  
   Always quote: `D1["skills/airp/schemas/"]`.

4. **Edge labels with special characters**  
   Use quoted edge syntax per docs, e.g. `A -->|"O(1) lookup"| B`.  
   See flowchart **Special characters / entity codes** on [flowchart.md](https://mermaid.js.org/syntax/flowchart.html).

5. **Subgraph titles**  
   Avoid raw `]` / `[` in titles; prefer simple ASCII titles or quoted forms where supported.

6. **Reserved words as node IDs**  
   Do not use `end`, `subgraph`, `graph` as bare node IDs; use `endNode["end"]` etc.

### Sequence diagrams

- Participant aliases with `/` or parentheses are usually fine: `participant A as Agent (/airp)`.
- Message text with colons/slashes: prefer quoted descriptions if parse fails.

### Validation workflow

1. **Schema** — after writing or editing any `.airp.json`:

   ```bash
   node scripts/validate-airp.mjs <path/to/file.airp.json>
   ```

   Must print `OK` (structure only).

2. **Mermaid** — before delivery, self-check every `mermaid` / `architectureOverview.overview` `source` against the hard rules above. If unsure, render with `/airp-html` and fix any diagram errors shown in the HTML.

### What this guarantees

- **Schema CLI**: document structure and block fields match AIRP v1.0.0.
- **Authoring rules + optional HTML render**: diagrams are likely to parse in the renderer (Mermaid v11 in the HTML bundle).
- **Does not guarantee**: ELK/layout success, visual polish, or identical appearance in static HTML export (layout runs at render time).

### Examples

| Bad | Good |
|-----|------|
| `SK1[/airp Skill]` | `SK1["/airp Skill"]` |
| `D1[skills/airp/foo]` | `D1["skills/airp/foo"]` |
| `id([/cmd])` | `id@{ shape: stadium, label: "/cmd" }` |
