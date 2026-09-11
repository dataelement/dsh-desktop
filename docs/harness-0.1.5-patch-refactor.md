# Harness 0.1.5 适配与 patch 层整体重构方案

调研日期：2026-09-09。基线：仓库当前 `@deepseek-ai/dsh@0.1.2-rc.1`（20 个 patch，
合计 `+2014 / -414` 行），目标：`0.1.5-alpha.2`。

## 一、现状盘点

### 1.1 版本落差

npm dist-tags（registry.npmmirror.com）：

| tag | 版本 |
| --- | --- |
| `latest` | `0.1.2-rc.1`（= 我们当前基线） |
| `next` | `0.1.2-rc.1` |
| `alpha` | `0.1.5-alpha.2` |

中间还有 `0.1.3-alpha.2`、`0.1.5-alpha.1`。也就是说：**稳定通道我们没有落后**，落后的是
alpha 通道（3 个版本）。预发布渠道要跟的是 `0.1.5-alpha.2`。

### 1.2 结构性发现：上游已经发布到 npm registry

`docs/harness-0.1.2-rc.1-upgrade.md` 里写的「上游尚未发布 npm registry 包」已经**不成立**。
实测：仓库 `packages/harness-0.1.2-rc.1/` 里 251 个 tarball 对应的包名，**242 个 dsh 包全部**
能在 registry 上取到 `0.1.5-alpha.2`；9 个 vendor 包（cordis 系 / cosmokit / schemastery）
也都有各自的正式版本。

而且 registry 上的是**上游 CI 的官方产物**，不是我们本机重打的包。对比
`dsh-client-ui-workspace@0.1.2-rc.1`：

```
npm     : //#region \0dsh-css:/home/runner/work/deepseek-harness/...  → .YDXeBa_projectRow
vendored: //#region \0dsh-css:/private/tmp/dsh-harness-v0.1.2-rc.1/... → .A5jQHq_projectRow
```

这直接解决 `harness-tarball-bridge-workflow` 记录的两个长期痛点：

- 「4 个 CSS patch 带着构建机绝对路径，换机器就要重新生成」→ 路径变成上游 CI 的固定路径，
  对所有人一致。
- 「每次升级要在本地 clone 上游、`pnpm build:official` + 两次 `release/pack.ts`」→ 整个
  本地构建 + 251 个 tarball 提交（每版本 8.1 MB）可以删掉，换成语义化版本 + lockfile。

**这是本次重构收益最大的一项，建议先做，且独立于 patch 重构。**

### 1.3 patch 对 0.1.5-alpha.2 的存活情况

把 `0.1.5-alpha.2` 的包铺成 `node_modules` 后逐个 `git apply --check`：

| 结果 | 数量 | patch |
| --- | --- | --- |
| 干净套用 | 8 | `dsh`(manifest)、`dsh-client-modules`、`dsh-client-ui-chat`、`dsh-client-ui-directory-picker-native`、`dsh-client-ui-sidebar`、`dsh-client-ui-trajectory`、`dsh-llm-deepseek`、`dsh-llm-pi-ai`、`dsh-workspace` |
| 模糊套用（-C1） | 1 | `dsh-api-session-controller` |
| 失效需重做 | 10 | `dsh-client-ui-agent-preset`、`-conversation`、`-deliverables`、`-layout`、`-model-selection`、`-settings-models`、`-workspace`、`dsh-session-persistence`、`-jsonl` |
| 未测（版本未变） | 1 | `cordis-plugin-loader@1.0.3`（上游 `latest` 仍是 1.0.3，预期不受影响） |

### 1.4 上游 0.1.5 的破坏性变化

**（a）session persistence seam 被整体重写。** 0.1.2 的
`SessionPersistence`（`append/prepare/inspect/ensureMaterialized/...`，coordinator 在
`dsh-session-persistence` 里，66 KB）在 0.1.5 变成 handle 所有权模型：

```ts
abstract create(header, options): Promise<SessionHandle>   // 拿写所有权
abstract open(id, access: 'read' | 'write', options): Promise<SessionHandle>
abstract flush(): Promise<void>
abstract stat(id, options): Promise<SessionPersistenceSnapshot | undefined>
abstract list(options): Promise<readonly SessionPersistenceSnapshot[]>
```

`dsh-session-persistence` 缩到 12 KB，coordinator 搬进 `dsh-session-persistence-jsonl`
（61 KB → 135 KB）。**我们整条「删除会话」补丁链（persistence → jsonl → workspace →
api-session-controller → ui-workspace）必须按新 API 重写。**上游到 0.1.5 仍然没有
`session/delete` 这个 RPC，功能依旧是我们自己的。

**（b）slot 名录变化**（只比对我们下载的这 19 个包）：

- 新增：`sidebar.panellist`、`conversation.session.header.corner`、`tool.title.readImage`
- 移除：`conversation.details.tool`（仓库里没有使用，无影响）
- 我们 patch 出来的 `conversation.input.accessory`、`conversation.hero.modeActions`
  上游依然没有

**（c）客户端 bundle 普遍重打**，CSS module hash 全变——这也是 10 个 patch 失效的直接原因。

## 二、patch 层重构方案

现在 20 个 patch 混着五类东西：上游 bug 修复、平台外观适配、纯 UI 新功能、跨层新功能、
manifest 注入。它们的可维护性差异极大，应该按「离 patch 有多远」分层处理。

### L0 — 上游化：修完提 PR，长期删掉（4 个，共 36 行）

| patch | 内容 | 处理 |
| --- | --- | --- |
| `cordis-plugin-loader@1.0.3` | 打包态下裸包名 `import()` 失败时用 `createRequire(ctx.baseUrl)` 兜底 | **仍然必需**，见 §2.1；同时向上游提 PR |
| `dsh-client-modules` | 同一问题在 client module 解析侧的兜底 | 同上 |
| `dsh-llm-deepseek` | 401/403 不再一律归为 `AUTH`，且 quota 判定优先于状态码 | 同上 |
| `dsh-llm-pi-ai` | 同上 | 同上 |

这四个都干净套用到 0.1.5，短期零成本；价值在于推动上游合并后彻底消失。

#### 2.1 为什么 `cordis-plugin-loader` 补丁不能删

上游 `EntryTree.import()` 的两条分支并不等价：

```js
if (this.ctx.loader.internal) return await this.ctx.loader.internal.import(name, this.ctx.baseUrl, {})
else if (name.startsWith(".")) return await import(new URL(name, this.ctx.baseUrl).href)
else return await import(name)              // ← 裸包名，baseUrl 被丢掉
```

`ctx.loader.internal` 来自 `ModuleLoader.fromInternal()`，只有拿得到 Node 内部 ESM loader
才有值。而 #146 已经用四组合复现把边界钉在**打包**上（与 TCC disclaim 无关）：

| build | disclaim | internal loader |
| --- | --- | --- |
| dev run | false | available |
| dev run | true | available |
| signed | false | MODULE_NOT_FOUND |
| signed | true | MODULE_NOT_FOUND |

本次复测在 Electron 43.4.0 / Node 24.18.1 的 utility process（`disclaim: true`、ESM 入口）
上确认 dev run 一侧结论不变：`internal` 拿得到并分类为 `v2`；`node-addon-require-builtin`
在 Electron 下报 `Unsupported/no-realm`，与 #146 记录一致。

所以在**签名后的 macOS 包**里 `internal` 恒为 undefined，走的就是第三条分支——
用户装在 profile 下的社区插件（裸包名）会解析不到。`dsh-desktop-hmr-fallback` 与这个补丁
是同一个根因的两个出口。Windows / Linux 用自带的真 Node，`internal` 可达，补丁属于死代码。

结论：**保留**。它打在 `@deepseek-ai/cordis-plugin-loader@1.0.3` 上，与 dsh 版本解耦，
0.1.5 升级不受影响，维护成本接近零。值得做的是把它作为上游 bug 提 PR——让第三条分支
也用 `ctx.baseUrl` 解析，与第一条分支保持一致，合并后补丁自然消失。

（也可以改成在 `build/harness-node-entry.mjs` 里用 `module.registerHooks()` 注册 resolve
钩子——该文件已有 monkey-patch `child_process` 的先例，Electron 43 的 Node 24.18.1 也支持
这个 API。但那是用一个 stability-1.1 的实验 API 去解一个 20 行补丁已经解好的问题，不划算。）

### L1 — 移出 patch：改用 Electron / locale 插件（5 个，共 27 行）

| patch | 现在的做法 | 建议做法 |
| --- | --- | --- |
| `dsh-client-ui-layout` | 改折叠侧栏宽度 56→80（macOS） | `webContents.insertCSS()`；在 `<html>` 上打 `data-dsh-platform="darwin"`，用属性选择器覆写，不依赖 CSS module hash |
| `dsh-client-ui-sidebar` | 追加 CSS 串 + 打 3 个 data 属性（红绿灯留白） | 同上；用结构 / `:has()` 选择器定位，就不需要那 3 个 data 属性 |
| `dsh-client-ui-directory-picker-native` | 把 `ctx.uiWorkspace.pickDirectory()` 换成 `window.dshDesktopDirectoryPicker` | 上游本来就有 `sidebar.workspaces.directoryFlow` / `conversation.hero.workspace.directoryFlow` 两个 slot；由桌面插件抢先注册即可（需先验证 slot 覆盖优先级） |
| `dsh-client-ui-chat` | 加 `message.failure.quota/forbidden` 两条中英文案 | locale 可由插件补（`@deepseek-ai/dsh-client-locale`，`dshmarket` 已在 inject 它）；前提是 L0 的错误码 patch 生效 |
| `dsh-client-ui-trajectory` | 同上，`details.failure.*` | 同上 |

做完这一层，**至少 9 个 patch 文件可以消失**，且它们全部是每次升级都要重新对齐 bundle 的类型。

`src/main` 目前完全没有用 `insertCSS`——这是现成但没用起来的手段。

### L2 — 收敛为「只开缝」的最小 patch，逻辑搬进桌面插件（4 个，共 1442 行 → 目标 <100 行）

这是当前技术债最集中的地方。仓库里已经有可用的载体：`packages/dsh-desktop-client-ui`
（client 半，注册 slot + 注入样式）、`packages/dshmarket`（host 半直接起 HTTP 路由，
不走 typert）。

| patch | 体量 | 内容 | 重构目标 |
| --- | --- | --- | --- |
| `dsh-client-ui-agent-preset` | +516 | `.dshpreset` 导入 / 导出、预设搜索、最近使用 | 上游有 `settings.agentPreset` / `conversation.hero.agentPreset` slot，整包搬进 `dsh-desktop-preset-transfer` 的 client 半；patch 力争归零 |
| `dsh-client-ui-settings-models` | +467 | 模型目录搜索、reasoning effort 配置、图像输入开关、provider 卡片改版 | 上游有 `settings.models` / `settings.models.footer`；搜索与新增字段用插件注入；只有「改造已有列表行」这部分保留 patch，预计能砍掉一半以上 |
| `dsh-client-ui-workspace` | +326 / -141（50 hunks，最脏） | 删除会话、未读标记、在 Finder 中打开、重命名 | 缩成「给 session row 菜单加一个 slot + 给 row 加 data 属性」，其余全部搬进 `dsh-desktop-client-ui`。上游 session 行菜单只有 `archiveSession` / `fork`，没有任何 slot——这个 slot 值得同时向上游提 PR |
| `dsh-api-session-controller` | +342（含 typert schema、client、host 三处） | `session/delete` RPC | **不再 patch typert**。改由桌面插件自己起 HTTP 路由（`dshmarket` 已证明可行），host 侧直接调 `ctx.sessionPersistence` / `ctx.workspaceRegistry`。patch 可归零 |

`dsh-client-ui-conversation`（+58）同属此类：它实际只做两件事——新增
`conversation.input.accessory` 与 `conversation.hero.modeActions` 两个 slot（PPT 模式 UI
已经在桌面插件里）。应该缩到只剩 slot 注册的十来行，并向上游提 PR。

### L3 — 必须继续适配，且要按新 API 重写（3 个）

| patch | 状态 |
| --- | --- |
| `dsh-session-persistence` | 旧 patch 全废（`coordinator.d.ts` 都不存在了）。新方案：`open(id,'write')` 拿独占所有权 → 后端删除 → 释放；比旧的 `assertDeletable` + phase 检查更干净，因为所有权在新 API 里是一等概念 |
| `dsh-session-persistence-jsonl` | 同上，`deleteStored` 要重挂到搬过来的 coordinator 上 |
| `dsh-workspace` | `forgetSession` 干净套用，但语义依赖上面两个 |

### L4 — 保持原样（1 个）

`@deepseek-ai/dsh` 的 `package.json` 注入 5 个 desktop 包进依赖闭包。这是 Harness 把
`@deepseek-ai/dsh` 依赖闭包镜像到 `$DSH_HOME/profiles/node_modules` 的必要条件，
`test/desktop-plugin-closure.test.ts` 已锁死三方不变量。干净套用，无需改动。

## 三、建议执行顺序

1. **切 registry 依赖**（独立于 patch）：`package.json` 的 251 条 `file:` 换成
   `^0.1.5-alpha.2` / cordis 系正式版本，删除 `packages/harness-0.1.2-rc.1/`，重生成
   lockfile。同时更新 `docs/development.md`、`harness-tarball-bridge-workflow` 的说明。
2. **L0 + L1**：这 9 个 patch 要么原样带过去（4 个），要么直接删掉换 `insertCSS` /
   locale 插件（5 个）。做完 patch 数从 20 降到 ~11。
3. **L3**：按新 persistence API 重写删除链的 host 侧，先让 `session-delete-patch.test.ts`
   的 marker 换成对新 API 的断言。
4. **L2**：逐个把 UI 逻辑搬进插件，patch 只留 slot。建议顺序
   `conversation` → `workspace` → `api-session-controller` → `agent-preset` →
   `settings-models`，因为前两个决定后面的落点。
5. **向上游提 PR**：L0 的 4 个 bug 修复 + `conversation` / `workspace` 的 slot 缺口。

## 四、验证清单（沿用并补充既有流程）

- `npm ci`（patch-package 全绿，数量与 `patches/` 一致）
- `npx vitest run`（`patch-path.ts` 要求每个包恰好一个 patch 文件——重命名务必彻底）
- `tsc --noEmit` → `npm run build`
- `node scripts/verify-harness-auth.mjs`
- 真机 Electron 启动：harness web 43127/43128 返回 200、4 个 desktop 插件被镜像、
  无 plugin-recovery UI
- 新增：`scripts/install-brand-assets.mjs` 对 0.1.5 重打的前端 `index.html` /
  `manifest.webmanifest` 是否仍能命中

## 五、风险与未决问题

- **`latest` 仍是 `0.1.2-rc.1`。** 0.1.5 只在 alpha 通道。稳定版安装包是否要跟到 0.1.5，
  还是只发预发布通道，需要产品决策（`README` 已经区分 stable / preview 两个通道）。
- **slot 覆盖优先级未验证**：L1 里「插件抢先注册 directoryFlow」这条依赖上游 slot 的
  覆盖语义，落地前要先写一个最小验证。
- **`0.1.3-alpha.2` / `0.1.5-alpha.1` 未逐版对比**：本文档只对比了 `0.1.2-rc.1` 与
  `0.1.5-alpha.2` 两端。如果中间版本有需要单独处理的迁移步骤（尤其是 persistence 的
  磁盘格式），需要补查上游 release note。
- 上游 0.1.5 移除了 `conversation.details.tool` slot。仓库内无使用，但第三方插件可能受影响，
  插件市场兼容性检查要留意。
