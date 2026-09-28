# Workspace 布局与数据流

包路径、platform 与一句话职责；主调用链与 Ctx。准入见 [package-roles](./package-roles.md)；依赖见 [dependency-dag](./dependency-dag.md)；失败通道见 `registry://rules.failure-channels`。

## platform 三类

| platform | 定义 |
|----------|------|
| `isomorphic` | 同构专用。默认入口禁止 `node:*`，禁止依赖任何包的 Node 入口。 |
| `node` | Node 专用。不考虑浏览器闭包。 |
| `dual` | 同构 + Node。`.` 最大化浏览器可用能力；无法同构的进 `./node`（或等价）。浏览器与同构调用方只 import `.`。 |

分类看 **exports 面**，不看未导出的构建脚本。新增包先定 platform；改 dual 时能同构的符号进 `.`。

## 包清单

| 路径 | 包名 | platform | 职责 |
|------|------|----------|------|
| `packages/diagnostics` | `@airp/diagnostics` | isomorphic† | 诊断原子、`AirpResult`、`formatDiagnostic`；print* 若需则经 utils Logger |
| `packages/utils` | `@airp/utils` | dual | 跨平台工具与 Ctx/Payload；`./node` 提供 CLI Logger、FS helpers |
| `packages/protocol` | `@airp/protocol` | isomorphic | `*.airp.json` schema、`schemaVersion` registry、`getSchemaSet` |
| `packages/loader` | `@airp/loader` | dual | 读单个 `*.airp.json` → `{ document, schemaVersion, … }` |
| `packages/writer` | `@airp/writer` | dual | `putOutputFile`；disk / memory / noop |
| `packages/validate` | `@airp/validate` | dual | `.`：Ajv + i18n + id 唯一；`./node`：+ Mermaid `parse` |
| `packages/renderer-contract` | `@airp/renderer-contract` | isomorphic | `RenderTarget` 联合与 target 模块/上下文契约；无 Registry |
| `packages/renderer-shared` | `@airp/renderer-shared` | isomorphic | 跨 target 领域逻辑（locale 敲定、块遍历等）；无 markup |
| `packages/renderer-target-html` | `@airp/renderer-target-html` | dual | `.`：AIRP 积木块 HTML + 阅读器壳；`./node`：Mermaid→SVG |
| `packages/renderer-target-markdown` | `@airp/renderer-target-markdown` | isomorphic | Markdown 降级可读输出 |
| `packages/renderer` | `@airp/renderer` | dual | 封闭 `rendererTargetCatalog`（`html` \| `markdown`）、编排入口 |
| `packages/render-service` | `@airp/render-service` | node | 共享渲染服务：宿主经 loader 调 Renderer 的 Node 管线；`./vite` 挂到 dev / preview |
| `packages/test-kit` | `@airp/test-kit` | node | 测试共享 case、fixture 路径与 runner |
| `packages/repo-guard` | `@airp/repo-guard` | node | 仓库门禁脚本 |
| `packages/typescript-config` | `@airp/typescript-config` | node | 共享 TypeScript preset |
| `apps/validate-cli` | `@airp/validate-cli` | node | CLI：读路径 → validate/node → 人话/JSON；bin `airp-validate` |
| `apps/renderer-cli` | `@airp/renderer-cli` | node | CLI：`export` / `watch` / `worker`；bin `airp-render` |
| `apps/renderer-vscode` | `airp-renderer-vscode` | node | VS Code：Custom Editor 渲染单个 `*.airp.json` |
| `apps/airp-notion` | `airp-notion` | web | 浏览器宿主：无侧栏的 Notion 式客户端（`/` 调起 46 块 + 就地编辑 + 右侧渲染预览） |

† diagnostics 主面同构；类型级可依赖 utils。

## 数据流

```
apps/* | test-kit
  → loader   → { document, schemaVersion, … }
  → validate(document)              # 含 Mermaid parse（Node）
  → renderer(document, target, options)     # HTML：含 Mermaid→SVG；validate-cli 止于 validate
  → writer.putOutputFile                    # disk | memory | noop
```

- `renderer` 内建封闭 target catalog（`html` | `markdown`）。宿主选 target 与选项，不注入实现名单。
- 失败一律 `AirpResult` / `AirpDiagnostic`；错误码每包 `diagnostic-codes.ts`，禁止裸字符串码。

## Ctx / Payload

宿主持有 `AirpCtx`；元数据在 `ctx.payload`。各包用自有 namespaced key 经 payload helpers 更新。类型与 helper 在 `utils`；见 `registry://rules.failure-channels.rules.ctx-payload`。
