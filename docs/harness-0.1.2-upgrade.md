# Harness 0.1.2-alpha.1 升级兼容性评估

对照上游 [`dsh-v0.1.2-alpha.1`](https://github.com/deepseek-ai/deepseek-harness/releases/tag/dsh-v0.1.2-alpha.1)
（2026-08-27 发布）与当前锁定的 `0.1.1-rc.2`，评估 dsh-desktop 的升级可行性。

## 结论：当前无法升级

两个互相独立的硬性阻塞点：

1. **上游包尚未发布到 npm。** `0.1.2-alpha.1` 只有 GitHub tag，registry 上不存在。
   npmjs 与 npmmirror 的 `@deepseek-ai/dsh` `dist-tags` 均仍为 `latest: 0.1.1-rc.2`
   （registry `modified` 时间 2026-08-21，早于本次 release）。
   `npm install @deepseek-ai/dsh@0.1.2-alpha.1` 返回 `ETARGET / No matching version found`。
2. **15 个 patch-package 补丁无法重新生成。** 补丁全部打在各包的构建产物
   （`lib/index.js`、`lib/client.js`）上，而不是仓库源码；没有发布的 tarball
   就拿不到新的 `lib/`，也就无法重做补丁、无法校验补丁测试。

在包发布前，升级 PR 既装不上也测不了。下面是包发布后需要完成的工作。

## 上游结构性变更

### 被删除的包（dsh-desktop 直接依赖其行为）

| 上游路径 | 包名 | dsh-desktop 的依赖方式 |
| --- | --- | --- |
| `packages/host/apiproxy` | `@deepseek-ai/dsh-host-apiproxy` | 372 行补丁 + 3 个测试文件 + 移动端桥接的全部 RPC |
| `packages/client/runtime` | `@deepseek-ai/dsh-client-runtime` | 13 行补丁（`lib/client.js`） |

`client/runtime` 的位置由新增的 `packages/client/store`（`@deepseek-ai/dsh-client-store`）接替。
ApiProxy 的职责拆分到 `packages/api/` 下新增的 `session-controller`、
`settings-controller`、`workspace-controller`，与既有的 `gateway`、`remotes` 并列。

`@deepseek-ai/dsh-web-app` 的依赖表相应变化：移除 `dsh-host-apiproxy`、
`dsh-client-runtime`、`dsh-storage*`、`dsh-session-projection-cache`；
新增三个 api controller 与 `dsh-client-ui-approval`、`ui-chat`、`ui-session`。

### 未受影响

`package.json` 里 21 个直接依赖在新 tag 中全部存在。
desktop 组合 profile 所依赖的 bundle —— `@deepseek-ai/dsh-base` 与
`@deepseek-ai/dsh-web-app` —— 名称与路径均未变，
`harness-runtime.ts`、`plugin-recovery.ts`、`safe-mode-profile.ts` 中的
`CORE_BUNDLES` 常量不需要改动。

## 对 dsh-desktop 自有代码的影响

### 1. 移动端桥接的 RPC 通道整体失效（最大工作量）

`src/main/mobile/lan-mobile-bridge.ts` 直接向 Harness 发
`POST /api/<method>`，body 为 `{type:'client-request', rpcId, method, payload}`；
另外还使用 `/api/events.mux`（下行事件流）和 `/api/respond`。
这三条路由都由 `dsh-host-apiproxy` 注册（已在当前 `node_modules` 中确认），随包一起删除。

即便路由有等价替代，它还叠加了第二重阻塞——见下条。

### 2. 浏览器启动令牌认证

上游 Agent Note `2026-08-24-browser-token-authentication` 引入的机制：

- `dsh-client-connection` 在分发前认证**完整** Host API：API Proxy 方法、
  Remote 一元调用、Connection channel、Remote WebSocket stream 都要求同一个浏览器会话。
  Host 可信但无有效会话 → **401**；Host/Origin 校验失败 → **403**。
- 每个 Host 进程生成随机启动令牌，`dsh-web-app` **每进程只打印并打开一次**
  带 `?token=` 的根 URL。只有 `GET /?token=...` 会把令牌换成 cookie 并重定向到干净的 `/`；
  **API 路径和 `Authorization` header 都不接受该令牌**。
- cookie 是签名的 bearer，**绑定规范化 hostname + port**，且为 host-only、
  `HttpOnly`、`SameSite=Strict`。

两处后果：

- `src/main/index.ts:813` 的 `desktopHarnessUrl()` 自行用端口拼 URL，
  拿不到令牌 → 主窗口加载会 401。需要从 Harness stdout 捕获令牌 URL，
  或改用其它方式完成一次性 cookie 交换。
- 移动端桥接是服务端 `fetch`，不是浏览器，没有 cookie；且令牌不能走
  `Authorization`。cookie 又绑定在 `127.0.0.1:PORT` 这个 authority 上，
  与手机侧看到的桥接 authority 不一致。桥接需要自己完成令牌交换并携带 cookie，
  同时把 `Host` 头固定为 loopback authority。

### 3. 新增 `--trusted-host`

`dsh-web-app` 新增 `trustedHosts` 配置与 `--trusted-host` 参数，绑定全网卡时
会采样 LAN 地址组成信任围栏。desktop 目前固定 `--host 127.0.0.1`（`buildHarnessArguments`），
不触发该逻辑，但隧道/LAN 访问路径需要复核是否要显式声明可信 authority。

### 4. Headless 进度输出改到 stderr

`harness-runtime.ts` 依赖逐行解析 `[stderr] ` 前缀来做就绪判定和错误归类
（`cannot resolve profile bundle` 等）。上游改为「headless 运行期间向 stderr
流式输出进度」，stderr 噪声量会变化，就绪探测与错误匹配需要重新验证。

## 补丁清单风险

15 个补丁需要逐个对新构建产物重做。按风险排序：

| 补丁 | 行数 | 风险 |
| --- | --- | --- |
| `dsh-host-apiproxy` | 372 | **作废**——包已删除，功能需迁移到 api controller |
| `dsh-client-runtime` | 13 | **作废**——包已删除，对应 `dsh-client-store` |
| `dsh-client-ui-conversation` | 10542 | 高——上游本轮大改会话交互（折叠、宽度调节、轮次导航、流式高亮） |
| `dsh-client-ui-settings-models` | 941 | 高——上游新增字号设置与模型配置能力，与本补丁的 reasoning effort 编辑器重叠 |
| `dsh-client-ui-agent-preset` | 653 | 高——上游修了 preset 解析与挂载 |
| `dsh-client-ui-workspace` | 259 | 中 |
| `dsh-client-ui-model-selection` | 186 | 中——上游新增子代理模型配置 |
| `dsh-client-ui-sidebar` | 144 | 中 |
| 其余 6 个（`dsh`、`cordis-plugin-loader`、`ui-deliverables`、`ui-layout`、`ui-directory-picker-native`、`llm-deepseek`、`llm-pi-ai`） | ≤45 | 低 |

`dsh-llm-pi-ai` 另需注意：上游把 pi-ai 升到 0.84.2，提供方列表与参数有变。

## 建议的执行顺序

1. 等待 `0.1.2-alpha.1` 发布到 npm。
2. 先只升依赖版本号 + 重装，跑 `npm run typecheck` 与 `npm test`，
   拿到「不打补丁」的失败面。
3. 重做 8 个仍存在的低/中风险补丁，确认对应补丁测试转绿。
4. 处理 `ui-conversation` / `ui-settings-models` / `ui-agent-preset` 三个大补丁，
   优先考虑上游是否已原生提供等价能力，能删则删。
5. 把移动端桥接从 `/api/*` 迁到新的 api controller，并实现令牌换 cookie。
6. 重新验证主窗口加载、就绪探测、LAN/隧道访问。

## 基线

当前 `main`（`d92384a`）在 `npm ci` 后 `npm test` 全绿：59 个文件 / 452 个用例全部通过。
