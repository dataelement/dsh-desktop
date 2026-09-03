# 升级到 Harness 0.1.2-alpha.1

> 本文档记录 0.1.1-rc.2 → 0.1.2-alpha.1 的升级。后续见 [harness-0.1.2-alpha.3-upgrade.md](./harness-0.1.2-alpha.3-upgrade.md)、[harness-0.1.2-alpha.4-upgrade.md](./harness-0.1.2-alpha.4-upgrade.md) 及 [harness-0.1.2-rc.1-upgrade.md](./harness-0.1.2-rc.1-upgrade.md)。

对照上游 [`dsh-v0.1.2-alpha.1`](https://github.com/deepseek-ai/deepseek-harness/releases/tag/dsh-v0.1.2-alpha.1)
（2026-08-27 发布）从 `0.1.1-rc.2` 升级。

## 状态

升级已完成并验证：

```
npm ci（含 postinstall）  → 0
npm run build             → ok
实际启动 Electron          → 正常运行，profile 四个插件全部挂载
npm test                  → 61 files / 454 tests 通过；已有 WebSocket teardown 异常使进程退出 1
tsc --noEmit              → 0 错误
verify-harness-auth.mjs   → 401 → 303 → 200 全通过
```

**唯一未完成的一步**：上游尚未发布到 npm，依赖暂时指向仓库内本地打包的 tarball。
包发布后需要把 `package.json` 换回语义化版本并重新生成 lockfile。

> 验证时务必用完整的 `npm ci`。带 `--ignore-scripts` 会跳过 `postinstall`，
> 而 `postinstall` 既装 Electron 二进制也改前端品牌资源——跳过它，测试和 typecheck
> 依然全绿，应用却根本起不来。本次升级正是这样漏掉了两个启动期问题。

## 本地打包（上游未发布的临时桥接）

上游自带发布流水线，无需等 registry：

```bash
git clone --depth 1 --branch dsh-v0.1.2-alpha.1 \
  https://github.com/deepseek-ai/deepseek-harness.git
cd deepseek-harness
corepack enable                      # packageManager 指定 pnpm@11.7.0
corepack pnpm install --frozen-lockfile
corepack pnpm run build:official     # release:pack 要求 official 客户端构建记录
corepack pnpm exec tsx scripts/release/pack.ts --family vendor --out dist/npm-vendor --concurrency 8
corepack pnpm exec tsx scripts/release/pack.ts --family dsh    --out dist/npm-dsh    --concurrency 8
```

产出 241 个 dsh + 9 个 vendor tarball，已提交到
[`packages/harness-0.1.2-alpha.1/`](../packages/harness-0.1.2-alpha.1/)。
`package.json` 以仓库相对 `file:` 路径引用它们，所以 `npm ci` 对所有人可复现。

注意 `pnpm run release:pack -- --family dsh` 会把参数当位置参数报错，需按上面直接 `pnpm exec tsx` 调用。

## 上游结构性变更

### 被删除的包

| 上游路径 | 包名 | 处置 |
| --- | --- | --- |
| `packages/host/apiproxy` | `@deepseek-ai/dsh-host-apiproxy` | 传输层职责迁到 `dsh-client-connection`；预设导入导出改为本地插件；目录选择器补丁作废 |
| `packages/client/runtime` | `@deepseek-ai/dsh-client-runtime` | provider 错误提示拆进 `ui-chat` 与 `ui-trajectory` |

`client/runtime` 由 `packages/client/store` 接替；ApiProxy 职责拆到
`packages/api/{session,settings,workspace}-controller`；会话渲染整体移入
新增的 `packages/client/ui-chat`。

### 未受影响

21 个直接依赖全部存在。`@deepseek-ai/dsh-base` 与 `@deepseek-ai/dsh-web-app`
两个 bundle 名称路径未变，`CORE_BUNDLES` 常量无需改动。

## 主机 API 认证（本次最大的行为变化）

上游 Agent Note `2026-08-24-browser-token-authentication` 引入：Host 的 HTTP
接口原先用请求里的 `Host` 头判断调用者是否本地，而该头由调用方自填——任何能连到
端口的调用者都能声称 `localhost`，进入配置接口并读出存储的凭据。

新机制：

- 每个 Host 进程生成随机启动令牌，`dsh-web-app` 每进程只打印一次带 `?token=` 的根 URL
- 只有 `GET /?token=...` 能把令牌换成签名 cookie；API 路径与 `Authorization` 头都不接受
- cookie 绑定规范化后的 `Host`（hostname:port），host-only、`HttpOnly`、`SameSite=Strict`
- HMAC 密钥存在 `$DSH_HOME/.credentials.yaml`，cookie 默认 30 天跨重启有效；令牌不落盘

desktop 侧的接入：

- `harness-runtime` 从 `dsh web:` 输出行捕获令牌，每次启停清空（每进程令牌不同）
- 主窗口首次导航带令牌，之后 Chromium 维持 cookie
- 移动端桥接是服务端 `fetch`，自行走一遍换取流程，401 时重换一次

`scripts/verify-harness-auth.mjs` 起一个真实 `dsh web` 验证整条链路，含「不带 cookie 必须 401」。

## 移动端桥接迁移

RPC 信封 `{type:'client-request', rpcId, method, payload}` 与 `/api` 前缀未变——
它们从被删的 apiproxy 原样搬进了 `dsh-client-connection`。变的是端点命名与载荷：

```
POST /api/session/list                       ← <namespace>/<method>，不是点号
{"type":"client-request", "method":"session/list",
 "payload":{"args":{"_request":{}}}}          ← 具名参数包一层 args
```

| 移动端方法 | 新端点 | 备注 |
| --- | --- | --- |
| `session.list` | `session/list` | |
| `session.create` | `session/create` | |
| `session.prompt` | `session/prompt` | 需补 `requestId` |
| `session.cancel` | `session/cancel` | |
| `session.selectModel` | `session/selectModel` | |
| `session.models` | `session/modelCatalog` | **不再按会话查**，无参 |
| `agentPreset.list` | `agentPresets/list` | |
| `agentPreset.select` | `agentPresets/select` | 键从 `agent` 改为 `agentId` |
| `session.history` | `session/page` | **改为游标分页**，`throughSeq` 不得超过会话游标 |
| `workspace.list` | `workspace/follow` 的 `baseline` 帧 | **无一元替代**，只能走流 |

流载体也换了：`/api/events.mux` → `/api/remote.mux`，一条 WebSocket 复用多条逻辑流，
按名字 `open`。桥接同时订阅 `$events`（问题事件）与 `workspace/follow`（工作区基线）。
`/api/respond` 由 `$events/result` 取代，应答要带上 `ready` 帧给出的 `clientId`。

一处行为变化：旧 mux 会广播 `question/resolved`，由 Harness 决定问题何时消失；
新网关在结果之后不再发任何东西，所以桥接改为应答成功即清除，否则问题永不消失。

## 补丁清单（15 → 12）

| 补丁 | 处置 |
| --- | --- |
| `cordis-plugin-loader`、`dsh`、`ui-deliverables`、`ui-layout`、`llm-deepseek`、`llm-pi-ai` | 内容未变，仅行号偏移 |
| `ui-directory-picker-native` | 上游把 `ctx.workspaces` 改名 `ctx.uiWorkspace` |
| `ui-model-selection` | CSS hash `_7KE1Ra_` → `_2WBGbq_` |
| `ui-settings-models` | hash `GL8Viq_`→`oGvYtW_`、`zGbnIq_`→`uVX9wq_`；`EditorFooter` 属性改名 `submitLabel*` → `submitLabelKey*`；服务商下拉改为可搜索卡片网格 |
| `ui-sidebar` | 不再改写品牌结构；仅保留红绿灯顶部留白和 Desktop 稳定状态标记 |
| `ui-workspace` | hash `YDXeBa_` → `koIWyW_`；`SessionTree`/`FlatList` 上游新增 `useSessionPendingInteraction` 参数 |
| `ui-agent-preset` | hash `cubgiG_` → `_4FiJda_`；菜单 `onSelect` 上游新增 toast，需绕开 |
| **新增** `ui-chat`、`ui-trajectory` | 承接被删的 `client-runtime` 的 provider 错误提示，改为 i18n 并中文化 |
| **删除** `dsh-host-apiproxy` | 见下 |
| **删除** `dsh-client-runtime` | 包已删除 |
| **删除** `ui-conversation` | 见下 |

### 交还给上游的能力

判断标准是「上游是否已原生提供」，而不是「补丁能不能修好」：

- **轮次导航**：我们的 `QueryRail` 被上游原生 `turnNavigation` 取代。会话渲染搬到
  `dsh-client-ui-chat`，其 `ChatView` 读 `s.navigation.items()` 并在同一组
  `listRef`/`columnRef` 上跟踪 `activeTurn`。硬移植会在内置导航旁边多出一条轨。
- **文件访问确认弹窗**：上游已采纳，`access.confirm.*` 就在原始包里。
- **目录选择器缺失兜底**：原因是 ApiProxy 直接取 `ctx.directoryPicker`，缺失就整个塌掉。
  上游把这些方法拆成独立服务并声明 `static inject = ["directoryPicker"]`，
  Cordis 会直接不挂载该控制器。再打补丁等于重写上游。

### 从补丁改为插件

Sidebar 品牌原先直接改写构建后的组件和 CSS Module 映射。0.1.2 已正式提供
`sidebar.brand.mark`、`sidebar.brand.name` 与 `conversation.hero.brand.mark`，现在由
[`packages/dsh-desktop-client-ui/`](../packages/dsh-desktop-client-ui/) 接管这些 single slot：
Desktop 图标与 `includeMark: false` 的原生字标分别注册，conversation hero 继续使用上游
FishLogo。`sidebar.footer.action` 是设置入口上方的独立行，无法保持手机入口与设置平齐；
因此手机入口继续由 preload 放进设置行，并固定在最右侧。
macOS 无边框窗口、traffic lights、拖动区和折叠栏 80px 仍属于宿主/布局几何，不交给品牌 slot。

预设导入导出（`/api/agent-preset.export` / `.import`）原本寄生在 apiproxy 补丁里。
上游没有等价能力（`agentPresets` 只有 copy/delete/list/read/select），所以功能仍归桌面端，
但改成了 [`packages/dsh-desktop-preset-transfer/`](../packages/dsh-desktop-preset-transfer/)：
`dsh-client-connection` 提供了公开的精确 Fetch 路由注册接口，正是上游自己
`/api/session.export` 用的那个接缝。以后不必每次 Harness 发版都对着重新构建的产物重推补丁。

迁移中顺带修掉一个 API 变化：`scanRoot` 新增第二个参数（组合行包名解析的 base URL），
不传会在报告损坏预设之前先抛异常，导致导入的目录未经校验就装上。

## 启动期问题（升级中踩到的）

两处都不是上游 API 变化，而是「上游变了、我们的桌面侧假设没跟上」：

**`postinstall` 中断。** `scripts/install-brand-assets.mjs` 用固定字符串匹配上游前端资源，
0.1.2 把 favicon 的 `href` 从 `/favicon.svg` 改成 `./favicon.svg`，manifest 的图标项
新增 `"purpose": "any"`，两处匹配都落空。脚本按设计抛错，整条 `postinstall` 链断掉——
连带 Electron 二进制都没装。现在图标链接按标签匹配而非固定 `href`，manifest 改为按 JSON 编辑
（键序不是契约），但两者在目标缺失时仍然响亮失败。

**新桌面插件进不了 profile。** 加插件时只往 `build/dsh-desktop.patch.yml` 写了行，
启动即报：

```
Cannot find package 'dsh-desktop-preset-transfer' imported from .../profiles/web/
```

Harness 把 `@deepseek-ai/dsh` 的**依赖闭包**镜像进 `$DSH_HOME/profiles/node_modules`，
锚点是那个包的 manifest 而不是我们的，且 profile 不会走到应用自身的 node_modules。
所以桌面插件想被 profile 解析到，必须注入进那份 manifest——这正是
`patches/@deepseek-ai+dsh+*.patch` 的作用。少了这一步会让**整棵插件树**失败，而不只是那一行。

`test/desktop-plugin-closure.test.ts` 锁住了这个不变量：profile patch 里每个
`dsh-desktop-*` 行，都必须同时出现在 dsh 依赖补丁和 `package.json` 的 dependencies 里。

## 其他需要注意的

- `packages/dsh-desktop-market-installer` 的 peer 范围放宽到 `^0.1.2-alpha.1`
  （预发布版的 caret 只在同一 major.minor.patch 内匹配）
- 新增直接依赖 `ws`：流载体的 upgrade 需要发 `Cookie` 头，全局 `WebSocket` 做不到
- `dsh-web-app` 新增 `--trusted-host`；desktop 固定 `--host 127.0.0.1` 不触发，
  但隧道 / LAN 路径需复核
- 上游把 headless 进度输出改到 stderr，`harness-runtime` 的就绪探测与错误归类需持续观察

## 剩余工作

上游发布到 npm 后：

1. 将 `package.json` 中保留的运行时闭包 `file:` 依赖换回 `0.1.2-alpha.1` 语义化版本；不要重新加入未启用的 provider 和测试包
2. 删除 `packages/harness-0.1.2-alpha.1/`
3. 重新生成 `package-lock.json`（必须来自真实 registry）
4. 重跑 `npm ci` + `npm test` + `scripts/verify-harness-auth.mjs`
