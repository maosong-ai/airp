## AIRP Block selection (core)

This guide maps **content shape** to AIRP `blocks` while **schema remains SSOT**.

### SSOT (required)

- Read before generating: `../schemas/airp-document.schema.json`
- This file only answers **which block fits best** — it does **not** replace schema structure:
  - Allowed `type` values, per-block fields/required keys, and `additionalProperties: false` objects are defined by the schema
  - If block names here ever diverge from the schema, follow the schema (and update this file)

### Inputs

- **currentLocale**: chat language (default output language)
- **multiLocale**: generate multiple locales (default false)
- **evidence**: optional evidence (paths/files/diff summaries); write into `meta.sourceRefs` when needed

### Hard defaults

- **tablePreferThreshold**:
  - Prefer `table` when rows ≥ 4 or columns ≥ 3 and alignment/comparison matters
- **codeMaxLines**: beyond this line count, wrap in `collapsible` (explain in summary)
- **mermaidComplexityThreshold**:
  - Simple (≤10 nodes): prefer a single `mermaid`
  - Medium complexity: split into multiple `mermaid` blocks under `section`
  - Complex topology: prefer `architectureOverview` (overview + module cards)

### Block routing rules

#### 1) Document top (always)

- **`hero`**: only the 3–8 most critical metrics (optional)
- **`lead`**: one-sentence context/goal (strongly recommended)

#### 2) Sections

Wrap each major topic in `section` with a stable `id` (TOC/refs):

- `section` (Diagnosis / Findings / Plan / Risks / Appendix …)
  - `lead` (optional): one-sentence purpose for the section
  - children: choose per routing below

#### 3) Structured content

- **Strong alignment / comparison / matrix**: `table`
- **Before/After two-column**: `comparison`
- **Status board (pass/fail/partial, etc.)**: `statusBoard`
- **Execution checklist**: `checklist`
- **Definitions / terms**: `definitionList` or `glossary`
- **Key-value metadata**: `keyValueList`

#### 4) Code

- **Short snippet**: `code` (optional filename/language)
- **Clear diff**: `codeDiff`
- **Very long**: outer `collapsible`, inner `code` or `codeDiff`

#### 5) Diagrams

- **Flow / sequence / ER / state / class**: `mermaid` (diagramKind + source)
- **Complex system overview + modules**: `architectureOverview`
  - `overview`: simplified relationship diagram (mermaid source)
  - `modules`: one card per module (`collectionItem`)
- **Mermaid authoring**: read `mermaid-authoring.md` before generating (special chars, quoted nodes, official syntax links)
- **Validation**: `validate-airp.mjs` checks schema only; self-check Mermaid per `mermaid-authoring.md`, use `/airp-html` to confirm rendering when needed

#### 6) Governance

- Decisions: `decision`
- Risks: `risk`
- Assumptions: `assumption`
- Constraints: `constraint` (emphasize when `nonNegotiable`)
- Open questions: `openQuestion`

#### 7) Density control

- **Secondary / long**: `collapsible`
- **Multiple perspectives**: `tabs`
- **Citations / external links**: `citation` / `linkList`

#### 8) Hidden agent metadata

- `agentNote` (`visible:false`) only for: coverage gaps, unpresented detail, key generation assumptions — not main content.

### Minimal schema-safety checklist (generation-time)

- Top-level object: only schema-defined fields (`additionalProperties: false` at root)
- `schemaVersion` must be `"1.0.0"`
- `i18n.defaultLocale` must appear in `i18n.locales`
- Every block needs `type` from the schema discriminator union
- Blocks with `additionalProperties: false`: no extra fields beyond schema
- All Mermaid `source` must follow `mermaid-authoring.md` (schema CLI does not parse Mermaid)
