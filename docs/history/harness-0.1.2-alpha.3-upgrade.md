# 升级到 Harness 0.1.2-alpha.3

对照上游 [`dsh-v0.1.2-alpha.3`](https://github.com/deepseek-ai/deepseek-harness/releases/tag/dsh-v0.1.2-alpha.3)
（commit `dd6322d604e00eec1ba5e0c8541159906a21094a`）从 `0.1.2-alpha.1` 升级。
上游的 alpha.2 未在本仓落地，本次直接对比 alpha.1 → alpha.3。

前一段升级（`0.1.1-rc.2` → `0.1.2-alpha.1`）见
[harness-0.1.2-upgrade.md](./harness-0.1.2-upgrade.md)。

## 状态

升级已完成并验证：

```
npm ci（含 postinstall）  → 0；16 个补丁全部 ✔
npm run build             → ok
npx vitest run            → 75 files / 560 tests 全绿，exit 0
tsc --noEmit（typecheck） → 0 错误
verify-harness-auth.mjs   → 捕获令牌 → 401(无 cookie) → 303(令牌换 cookie) → 200(带 cookie) 全通过
实际启动 Electron          → 正常运行；dev harness web (http://127.0.0.1:43128/) 返回 200；
                            profiles/node_modules 4 个桌面插件（client-ui / preset-transfer /
                            hmr-fallback / market-installer）全部镜像挂载；无 plugin-recovery UI
```

**唯一未完成的一步**（同 alpha.1）：上游尚未发布到 npm，依赖暂时指向仓库内本地打包的 tarball。
包发布后需要把 `package.json` 换回语义化版本并重新生成 lockfile。

> 验证时务必用完整的 `npm ci`。带 `--ignore-scripts` 会跳过 `postinstall`，
> 而 `postinstall` 既装 Electron 二进制也改前端品牌资源——跳过它，测试和 typecheck
> 依然全绿，应用却根本起不来。

## 本地打包（上游未发布的临时桥接）

上游自带发布流水线，无需等 registry：

```bash
git clone --depth 1 --branch dsh-v0.1.2-alpha.3 \
  https://github.com/deepseek-ai/deepseek-harness.git
cd deepseek-harness
corepack enable                      # packageManager 指定 pnpm@11.7.0
corepack pnpm install --frozen-lockfile
corepack pnpm run build:official     # release:pack 要求 official 客户端构建记录
corepack pnpm exec tsx scripts/release/pack.ts --family vendor --out dist/npm-vendor --concurrency 8
corepack pnpm exec tsx scripts/release/pack.ts --family dsh    --out dist/npm-dsh    --concurrency 8
```

`build:official` 记录 220 个 client artifact / 4 个 public value。产出
**9 个 vendor + 244 个 dsh** tarball（alpha.1 为 9 + 241），已提交到
[`packages/harness-0.1.2-alpha.3/`](../packages/harness-0.1.2-alpha.3/)（含各 family 的
`publish-order.txt`）。旧目录 `packages/harness-0.1.2-alpha.1/` 已在同一提交删除。
`package.json` 以仓库相对 `file:` 路径引用这些 tarball，所以 `npm ci` 对所有人可复现。

注意 `pnpm run release:pack -- --family dsh` 会把参数当位置参数报错，需按上面直接 `pnpm exec tsx` 调用。

**注意补丁里的绝对路径 context 行**：`dsh-client-ui-{agent-preset,model-selection,settings-models,workspace}` 四个补丁（共 5 处 hunk）里有一行 `//#region \0dsh-css:<绝对路径>...module.css.mjs`——这是上游构建产物内嵌的、打包机器上的源码绝对路径，作为 context 行被 `patch-package` 逐行匹配。**用仓库里已提交的 tarball 跑 `npm ci` 对所有人可复现**；但如果换一台机器重新 clone 上游 `pack`，这个路径会变，届时这 4 个补丁需要对着新产物重新生成（其余 12 个补丁不受影响）。

## 上游结构性变更（alpha.1 → alpha.3）

### 被删除的包

| 包名 | 处置 |
| --- | --- |
| `@deepseek-ai/dsh-agent-spine-demo`（`packages/examples` 整组删除） | 上游把其配置行内联进 `dsh-sdk-minimal`。桌面端只是 `package.json` 一行依赖，直接移除；`@deepseek-ai/dsh` 运行时闭包与 `patches/@deepseek-ai+dsh` 均未引用它。 |
| `@deepseek-ai/dsh-session-persistence-sqlite` | 可选的**权威存储后端**（JSONL 的替代），整包删除。桌面端从未打包（一直用 `dsh-session-persistence-jsonl`）。`test/release.test.ts` 的 `excludedHarnessPackages` 里针对它的排除行已过时，删除并留注释。 |

`dsh-storage-sqlite` 的排除行保留为防御性守卫（现已 vacuous，加注释说明现状）。

### 新增的包（5 个，全部提升为 `file:` 直接依赖）

`@deepseek-ai/dsh-client-ui-schedule`、`@deepseek-ai/dsh-deque`、
`@deepseek-ai/dsh-session-turn-outline`、`@deepseek-ai/dsh-util-time`、
`@deepseek-ai/dsh-util-values`。

这 5 个都是已交付包的传递依赖（`npm ls` + `package.json` 反查确认，无孤儿包），
按字母序加入 `package.json` 的 `dependencies` 作 `file:` 直接依赖。否则 lockfile
会从 registry（npmmirror 镜像）解析它们，破坏「仓库内 tarball」约束。
`test/release.test.ts` 新增用例校验这 5 包为 `file:` 依赖且 lockfile 无 registry 解析的
`@deepseek-ai/dsh*`。

> brief 曾预测新包名为 `dsh-util-deque`，实际 tarball 名是 `@deepseek-ai/dsh-deque`；
> `dsh-session-turn-outline` 未被 brief 预测到。均以实际打包产物为准。

### vendor 版本号全部上抬

9 个 vendor 包名不变，版本号全部 patch/minor 上抬：cordis `4.0.1→4.0.2`、
cordis-plugin-group `1.0.1→1.0.2`、cordis-plugin-hmr `1.0.16→1.0.17`、
cordis-plugin-include `1.0.6→1.0.7`、cordis-plugin-loader `1.0.2→1.0.3`、
cordis-plugin-logger-console `1.0.1→1.0.2`、cordis-plugin-timer `1.1.3→1.1.4`、
cosmokit `1.8.2→1.8.3`、schemastery `3.18.1→3.18.2`。
`package.json` 的 `file:` 行按实际文件名逐个替换（不只是路径段）。

### 未受影响

`CORE_BUNDLES`（`@deepseek-ai/dsh-base` / `@deepseek-ai/dsh-web-app` / `dshmarket`）
名称路径不变，`harness-runtime.ts` 无需改动。

## 会话持久化（alpha.3 breaking change）

上游 `refactor(session)!: remove SQLite persistence backend`：

- 删除的是**权威存储后端** `session-persistence-sqlite`（JSONL 的可选替代品）。
- 上游保留 `session-query-sqlite`（可丢弃的 FTS5 搜索索引，从 JSONL 重建）与
  `dsh-storage-sqlite`（通用 domain-KV）——桌面端交付闭包实际两者都不含。
- 桌面端 profile 用 `dsh-session-persistence-jsonl` 作为唯一权威存储，
  历史会话可见性完全不受影响。
- 上游那句「请用旧版本导出」仅针对手动把后端配成 sqlite 的上游 CLI 用户，与桌面端无关。

桌面端原有的“永久删除会话、保留工作区文件”补丁也已迁移到 alpha.3 的新会话架构：
删除 RPC 现在由 `dsh-api-session-controller` 统一承载，经
`dsh-session-persistence` / `dsh-session-persistence-jsonl` 删除权威 JSONL 记录，再由
`dsh-workspace` 清理会话索引。UI 在删除前明确提示工作区文件会保留且操作不可撤销；普通
会话的活动 Agent 会由 controller 自己释放，子 Agent 或其他 capability 持有的会话仍拒绝删除。

## 主机 API / 移动端桥接（复核结论：无契约变化）

逐一比对 alpha.1 → alpha.3 的 `dsh-web-app` / `dsh-client-connection` /
`host/webserver` / `api/*`：

- `dsh web:` 令牌打印行（`web-app/src/index.ts`）——逐字不变。
- headless / 浏览器打不开时的诊断仍写 stderr——就绪探测与错误归类不受影响。
- `CORE_BUNDLES`、主窗口 `/?token=` 首次导航、令牌换签名 cookie 流程——不变。
- 桥接端点全集（`session/list|create|prompt|cancel|selectModel|modelCatalog|page|follow`、
  `agentPresets/list|select`、`workspace/follow`）以 `connection` 的 dispatch switch
  逐行比对——一致。`session/modelCatalog` 仍无参、非按会话；`session/page` 仍游标分页。
- `/api/remote.mux` 线协议（`gateway/src/stream-protocol.ts`、`remote-events.ts`）——
  两 tag 间**零 diff**。`$events` / `$events/result` / `workspace/follow` 订阅不变。
- `dsh-web-app --trusted-host`：桌面固定 `--host 127.0.0.1` 不派生 LAN 地址，桥接以
  loopback 身份回源，依旧无关。

**唯一变化**：RPC 错误码普遍加 `gateway/` 命名空间前缀（`bad-request` →
`gateway/bad-request` 等）。桌面运行时与桥接只取 `error.message`（字符串），
不消费错误码，`src/` 无对 Harness RPC 错误码的字符串匹配——无影响。

`src/main/**` 一行未改，测试未改。

## 补丁清单（16 → 19）

全部 19 个补丁已适配 alpha.3，无 alpha.1 残留；`npm ci` 的 patch-package 0 error。

### 仅改名 / 行号漂移 / blob-index 偏移（内容逐字不变）

| 补丁 | 说明 |
| --- | --- |
| `cordis-plugin-loader`（`1.0.2` → `1.0.3`） | 文件名版本号也变，补丁体不变 |
| `@deepseek-ai+dsh`（依赖闭包 manifest 注入） | 纯 rename + blob index 更新，`@@` hunk 头未变 |
| `dsh-client-modules`、`dsh-client-ui-deliverables`、`dsh-client-ui-directory-picker-native`、`dsh-client-ui-layout`、`dsh-client-ui-sidebar`、`dsh-llm-deepseek`、`dsh-llm-pi-ai` | 纯改名，补丁体 0 改动（上下文未漂移） |
| `dsh-client-ui-chat`、`dsh-client-ui-trajectory` | 仅行号漂移，provider 错误分类逐字不变（alpha.3 pristine 仍只处理 AUTH） |

`test/session-create-remote-event-patch.test.ts` 的 `isJsonValue` import 从
`@deepseek-ai/dsh-session` 迁到 `@deepseek-ai/dsh-util-values`（上游把该导出移出包入口）。

### CSS module hash 迁移

| 补丁 | 旧 hash → 新 hash | 附带 |
| --- | --- | --- |
| `dsh-client-ui-model-selection` | `_2WBGbq_` → `Ydf5zq_` | 13 hunk 保持；纯机械 hash swap |
| `dsh-client-ui-workspace` | `koIWyW_` → `_zvJpq_` | 保留原有未读 / Finder 能力，并接入永久删除确认与错误展示；上游 workspace 行新增 schedule indicator 功能 |
| `dsh-client-ui-settings-models` | `uVX9wq_` → `A_4Mua_`（ModelsSection）、`oGvYtW_` → `_2CJT8a_`（Onboarding） | 顺带修掉 alpha.1 补丁自身的 dual-hash bug（手写 CSS 串混用 stale `zGbnIq_`）；`test/model-settings-catalog-ux-patch.test.ts` 1 行断言更新 |
| `dsh-client-ui-agent-preset` | Seat `_4FiJda_` → `YgMYBq_` | 顺带修正 alpha.1 误把 picker/search 类挂到 `AgentPresetLabel` 模块（Seat 组件读的是 `AgentPresetSeat` 模块，alpha.1 那份样式大概率静默失效）；hunk 19 → 18 |

### 交还给上游的能力（补丁里删掉的部分）

- **`dsh-client-ui-settings-models`**：`EditorFooter` 的 `submitLabelKey*` /
  `submitBusyLabelKey*` prop 上游 alpha.3 已原生提供，补丁只留 sticky-footer 包裹的
  context 行；onboarding 组件的 `api` prop 上游重命名为 `operations`，补丁跟随。
- **`dsh-client-ui-agent-preset`**：`builtInGroup` / `customGroup` 两个 i18n 键上游
  alpha.3 已原生（「内置 / 自定义」），补丁删掉重复键、改为直接复用上游键。

### 仍归桌面端（alpha.3 上游无原生等价，全部保留 rebase）

- provider 错误分类（QUOTA / FORBIDDEN，chat + trajectory，中英 i18n）
- `dsh-api-session-controller` 的 JSON-safe projection 剥离
- `dsh-client-ui-workspace` 的未读会话标记（`unreadSessionIds`）
- 永久删除会话记录与执行轨迹（保留工作区文件；`dsh-api-session-controller`、JSONL
  persistence、workspace registry 与 `dsh-client-ui-workspace` 协同）
- 可搜索模型 / 服务商网格（`dsh-client-ui-model-selection` + `dsh-client-ui-settings-models`）
- 预设导入导出 UI + 可搜索/分组列表 + Awesome Presets 链接（`dsh-client-ui-agent-preset`）

## 其他需要注意的

- `packages/dsh-desktop-{client-ui,preset-transfer,market-installer}` 三个桌面插件包的
  `@deepseek-ai/dsh*` peer 依赖现均为 `^0.1.2-alpha.3`（`market-installer` 在依赖切换提交
  `ade05bc` 中一并更新，另两个随版本字样清理提交 `454d0a9` 更新）——预发布版的 caret 只在
  同一 `major.minor.patch` 内匹配，所以每次上游发版这些 token 都要跟着对齐。注意从 alpha.1
  上调到 alpha.3 是抬高下限（收紧），并非放宽；`^0.1.2-alpha.1` 本就能匹配 `0.1.2-alpha.3`，
  这里只是版本字样对齐，不是功能性放宽。
- `packages/dsh-desktop-preset-transfer/index.js` 的 `PRESET_SOURCE_DSH_VERSION`
  → `0.1.2-alpha.3`（连带 `test/preset-transfer-patch.test.ts` / `test/profile-compatibility.test.ts`
  的 fixture 与断言）。
- lockfile 重生成后体积增长（+1605 行）——npmmirror 镜像给第三方传递依赖回填了
  `resolved` / `integrity`。`@deepseek-ai/dsh*` 仍全部走 `file:` tarball，无 registry
  回退，无 alpha.1 残留，非回归。
- `@deepseek-ai/node-addon-landlock-run-linux-{arm64,x64}` 仍从 npmmirror 解析——
  这是 landlock native addon 的平台包，升级前即如此，非 `dsh-*` 业务包，离线环境需注意。
- 6 份 README（en / zh / ja / es / pt / ru）第 27~28 行的 `@deepseek-ai/dsh@0.1.1-rc.2`
  字样更新为 `@deepseek-ai/dsh@0.1.2-alpha.3`（连带 `test/readme-parity.test.ts` 的
  `requiredFacts` token）。
- `src/main/**` 与 `scripts/**` 里的 "Since 0.1.2-alpha.1" 注释是**机制引入版本**的准确
  记述（令牌认证、Gateway stream carrier 确实是 alpha.1 引入），按规则保留不改。
- `install-brand-assets.mjs` 在 alpha.3 前端资源上验证通过，无需改动
  （icon link → `/dsh-desktop-logo.png`，manifest `purpose:"any"` 保留）。

## 剩余工作

上游发布到 npm 后：

1. 将 `package.json` 中保留的运行时闭包 `file:` 依赖换回 `0.1.2-alpha.3` 语义化版本；
   不要重新加入未启用的 provider 和测试包
2. 删除 `packages/harness-0.1.2-alpha.3/`
3. 重新生成 `package-lock.json`（必须来自真实 registry）
4. 重跑 `npm ci` + `npx vitest run` + `scripts/verify/verify-harness-auth.mjs`
