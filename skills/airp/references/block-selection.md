## AIRP Block selection (core)

这份规则的目标是：在 **先遵循 AIRP schema（SSOT）** 的前提下，把“内容形态”稳定映射为 AIRP 的 `blocks`。

### SSOT（必须）

- 生成前必须先读：`../schemas/airp-document.schema.json`
- 本文件只解决 “选择什么 block 更合适”，**不替代 schema 的结构约束**：
  - schema 允许什么 `type`、每个 block 的字段/必选项、哪些对象 `additionalProperties: false`，都以 schema 为准
  - 本文件给出的 block 名称如果未来与 schema 不一致，以 schema 为准（并应更新本文件）

### Inputs

- **currentLocale**：当前聊天语言（默认输出语言）
- **multiLocale**：是否生成多语言（默认 false）
- **evidence**：可选证据（路径/文件/diff 摘要）；需要写入 `meta.sourceRefs`

### Hard defaults

- **tablePreferThreshold**：
  - 行数 ≥ 4 或列数 ≥ 3 且需要对齐/对比时，优先 `table`
- **codeMaxLines**：超过该行数应放入 `collapsible`（并在 summary 中说明）
- **mermaidComplexityThreshold**：
  - 简单（≤10 nodes）优先单个 `mermaid`
  - 中等复杂度优先拆成多个 `section` 的 `mermaid`
  - 复杂拓扑优先 `architectureOverview`（overview + modules cards）

### Block routing rules

#### 1) Document top (always)

- **`hero`**：只放 3–8 个最关键 metrics（可缺省）
- **`lead`**：一句话背景/目标（强烈建议）

#### 2) Sections

每个主要主题使用 `section` 包住子块，并提供稳定 `id`（便于 TOC/引用）：

- `section`（Diagnosis / Findings / Plan / Risks / Appendix ...）
  - `lead`（可选）：该 section 的一句话目的
  - children：按下列路由选择

#### 3) Structured content

- **对齐强 / 对比强 / 矩阵**：`table`
- **Before/After 双栏**：`comparison`
- **状态板（pass/fail/partial 等）**：`statusBoard`
- **执行清单**：`checklist`
- **定义/术语**：`definitionList` 或 `glossary`
- **Key-Value 元信息**：`keyValueList`

#### 4) Code

- **短片段**：`code`（可带 filename/language）
- **明确差异**：`codeDiff`
- **很长**：外层包 `collapsible`，内部用 `code` 或 `codeDiff`

#### 5) Diagrams

- **流程/序列/ER/状态机/类图**：`mermaid`（diagramKind + source）
- **复杂系统概览 + 模块说明**：`architectureOverview`
  - `overview`：简化关系图（mermaid source）
  - `modules`：每个模块一张 card（collectionItem）

#### 6) Governance

- 决策：`decision`
- 风险：`risk`
- 假设：`assumption`
- 约束：`constraint`（nonNegotiable 时强调）
- 未决问题：`openQuestion`

#### 7) Density control

- **次要/很长**：`collapsible`
- **多视角**：`tabs`
- **引用/外链**：`citation` / `linkList`

#### 8) Hidden agent metadata

- `agentNote`（`visible:false`）仅用于记录：覆盖率、未呈现的细节、生成时的关键假设；不要把它当做主要内容承载。

### Minimal schema-safety checklist (generation-time)

- 顶层对象只包含 schema 定义的字段（schema 顶层 `additionalProperties: false`）
- `schemaVersion` 必须是 `"1.0.0"`
- `i18n.defaultLocale` 必须包含在 `i18n.locales`
- 每个 block 必须有 `type`，且该 `type` 必须存在于 schema 的 discriminator union
- 对于标注 `additionalProperties: false` 的 block，不得输出 schema 未定义的字段

