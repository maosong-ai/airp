# 依赖 DAG

改 `package.json` 的 `dependencies` / `peerDependencies`，或新增跨包 / 跨入口 import 时按本文核对。包职责见 [package-roles](./package-roles.md)；platform 三类见 [workspace-layout](./workspace-layout.md)。

## 业务包

只允许下列边（箭头 =「可依赖」）：

```
apps/*  → loader | writer | validate | validate/node | renderer | renderer/node | protocol | utils | diagnostics | render-service

renderer（`.`）     → renderer-target-* | renderer-contract | renderer-shared | protocol | utils | diagnostics
renderer/node       → renderer（`.`）| html-dist / FromUrl 热更新助手（无静态 html 包 import）
renderer/node/render → Mermaid 静态 catalog（`renderer-target-html/node`）
renderer-target-html（`.`）  → renderer-contract | renderer-shared | protocol | utils | diagnostics
renderer-target-html/node    → 同包 `.` + Mermaid→SVG（仅导出机；mermaid 版本 = validate/node）
renderer-target-*   → renderer-contract | renderer-shared | protocol | utils | diagnostics
renderer-shared     → renderer-contract | protocol | utils | diagnostics
renderer-contract   → diagnostics | protocol

validate（`.`）      → protocol | utils | diagnostics
validate/node       → validate（`.`）+ Mermaid parse
loader              → protocol | utils | diagnostics
writer              → utils
protocol            → utils | diagnostics
diagnostics         → utils（类型级）
render-service      → renderer/node/render（经宿主注入的 loader 懒加载；测试直接调用）| renderer（仅类型：复用 RenderTarget 与诊断形状）| vite（peer）
airp-notion（web）  → loader | validate | protocol | utils | diagnostics（浏览器面，仅 `.` 入口）
airp-notion 渲染预览 → render-service/vite（Node 侧 harness，不在浏览器面内）

test-kit / repo-guard → 旁路；不被业务包依赖
```

禁止逆层（如 protocol → validate）。

| platform | 包 |
|----------|-----|
| isomorphic | protocol, renderer-contract, renderer-shared, renderer-target-markdown, diagnostics（主面）；validate（`.`，无 Mermaid） |
| dual | utils, loader, writer, validate, renderer, renderer-target-html（`.` 同构壳；`./node` 含 Mermaid） |
| node | validate-cli, renderer-cli, renderer-vscode, render-service, test-kit, repo-guard, typescript-config |
| web | airp-notion（静态站点；浏览器面只依赖各包 `.` 入口，另有一个 Node 侧渲染服务） |

## 运行时 API 与入口

### 规矩

1. **引用 Node 内置模块必须写 `node:` 前缀**（如 `node:fs`）。禁止 `from "fs"`、`from "path"` 等无前缀写法。
2. **同构入口不得使用仅 Node 可用的 API**（如 `node:*`、`process.*`、`__dirname`、`require`）。需要这些能力时，放到该包的 Node 入口，或放到本就面向 Node 的包（如 loader from-disk、writer to-disk、apps/*）。
3. **isomorphic 与 dual 的 `.` → 仅 isomorphic 或其它 dual 的 `.`**。禁止静态拉到 `./node` 或 platform=`node` 的业务包。Node 宿主可依赖 `/node`。

### 自动检查

`pnpm check-runtime-entries` 在同构范围内强制：不得 `import "node:…"`；不得 `import "…/node"`。

## 禁止

- ❌ 循环依赖
- ❌ 逆层依赖（例如 `protocol` → `validate` / `loader` / `writer` / `renderer`；`validate` → `loader` / `writer`；`renderer-contract` → `renderer` / `renderer-shared` / `renderer-target-*`；`utils` → `diagnostics`）
- ❌ 同构入口依赖 `*/node` 或 platform=`node` 的业务包
- ❌ 独立组装包 `renderer-targets`（名单与编排在 `renderer`）
- ❌ `packages/*` 依赖 `apps/*`（与 `registry://rules.code-styles` → module-placement 一致）

## 旁路包

`test-kit`、`repo-guard`、`typescript-config` 为 platform=`node` 旁路；不进入业务 DAG；可依赖业务包作测试/门禁，不得被业务包依赖。
