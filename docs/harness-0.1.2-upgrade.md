# Harness 0.1.2-alpha.1 升级兼容性评估

对照上游 [`dsh-v0.1.2-alpha.1`](https://github.com/deepseek-ai/deepseek-harness/releases/tag/dsh-v0.1.2-alpha.1)
（2026-08-27 发布）与当前锁定的 `0.1.1-rc.2`。

## 结论

上游包尚未发布到 npm，但**可以本地构建打包**，兼容性已完成实测：

- `src/` 对 0.1.2-alpha.1 **类型全通过**，唯一的类型错误在测试文件里（引用了被删除的包）。
- 59 个测试文件中 52 个通过；18 个失败全部是补丁校验用例——即「补丁尚未重做」的预期失败面，不是产品代码不兼容。
- 15 个补丁中 **5 个原样适用、8 个需返工、2 个作废**。

阻塞项从「无法评估」降级为「一批明确的返工工作」。

## 本地打包（绕过 npm 未发布）

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

产出 241 个 dsh + 9 个 vendor 共 250 个 tarball。
消费方式沿用上游 `scripts/release/verify-packed-install.ts` 的做法：把每个 tarball
以 `file:` 形式写进 `dependencies`，npm 即可解析全部传递依赖（实测装入 1081 个包）。

注意 `pnpm run release:pack -- --family dsh` 会把参数当位置参数报错，需按上面直接 `pnpm exec tsx` 调用。

本机验证环境：Node v24.15.0、pnpm 11.7.0（corepack）、macOS arm64。构建耗时约 3 分钟。

## 实测结果

### 类型检查

`tsc --noEmit -p tsconfig.node.json` 仅一处错误：

```
test/preset-transfer-patch.test.ts(6,48): error TS2307:
  Cannot find module '@deepseek-ai/dsh-host-apiproxy'
```

`src/` 全部干净——desktop 主进程代码对新版本没有编译期不兼容。

### 测试（未打补丁状态）

`Test Files 7 failed | 52 passed (59)`，`Tests 20 failed | 423 passed`。
其中 2 个失败（`release.test.ts`）是探针环境用 `--package-lock=false` 导致缺 lockfile，
非真实问题；**真实失败 18 个，全部集中在补丁校验用例**：

| 测试文件 | 失败/总数 |
| --- | --- |
| `preset-transfer-patch.test.ts` | 整文件无法加载（import 已删除的包） |
| `model-reasoning-efforts-patch.test.ts` | 6/7 |
| `model-settings-catalog-ux-patch.test.ts` | 6/7 |
| `model-selection-search-patch.test.ts` | 3/4 |
| `model-picker-patch.test.ts` | 2/6 |
| `onboarding-patch.test.ts` | 1/12 |

### 补丁适用性（对新构建产物 `patch --dry-run`）

| 补丁 | 失败 hunk / 总 hunk | 处置 |
| --- | --- | --- |
| `cordis-plugin-loader` | 0 / 1 | ✅ 原样可用 |
| `dsh` | 0 / 1 | ✅ 原样可用 |
| `dsh-client-ui-deliverables` | 0 / 3 | ✅ 原样可用 |
| `dsh-client-ui-layout` | 0 / 2 | ✅ 原样可用 |
| `dsh-llm-deepseek` | 0 / 2 | ✅ 原样可用 |
| `dsh-llm-pi-ai` | 0 / 1 | ✅ 原样可用 |
| `dsh-client-ui-directory-picker-native` | 1 / 1 | ⚠️ 小改 |
| `dsh-client-ui-model-selection` | 2 / 13 | ⚠️ 返工 |
| `dsh-client-ui-sidebar` | 2 / 6 | ⚠️ 返工 |
| `dsh-client-ui-agent-preset` | 5 / 18 | ⚠️ 返工 |
| `dsh-client-ui-workspace` | 6 / 22 | ⚠️ 返工 |
| `dsh-client-ui-settings-models` | 7 / 35 | ⚠️ 返工 |
| `dsh-client-ui-conversation` | 6 / 9 | ⚠️ 重度返工 |
| `dsh-client-runtime` | — | ❌ 作废（包已删除） |
| `dsh-host-apiproxy` | 9 / 9 | ❌ 作废（包已删除） |

## 上游结构性变更

### 被删除的包

| 上游路径 | 包名 | dsh-desktop 的依赖方式 |
| --- | --- | --- |
| `packages/host/apiproxy` | `@deepseek-ai/dsh-host-apiproxy` | 372 行补丁 + 3 个测试 + 移动端桥接的全部 RPC |
| `packages/client/runtime` | `@deepseek-ai/dsh-client-runtime` | 13 行补丁 |

`client/runtime` 由新增的 `packages/client/store`（`@deepseek-ai/dsh-client-store`）接替；
ApiProxy 职责拆分到 `packages/api/` 下新增的 `session-controller`、`settings-controller`、
`workspace-controller`。以上均已在打包产物中确认（250 个包里无 apiproxy / client-runtime，有 client-store）。

### 未受影响

`package.json` 的 21 个直接依赖在新版本中全部存在。
desktop 组合 profile 依赖的 `@deepseek-ai/dsh-base` 与 `@deepseek-ai/dsh-web-app` 名称路径未变，
`harness-runtime.ts` / `plugin-recovery.ts` / `safe-mode-profile.ts` 里的 `CORE_BUNDLES` 常量无需改动。

## 需要改的自有代码

### 1. 移动端桥接的 RPC 通道整体失效（最大工作量）

`src/main/mobile/lan-mobile-bridge.ts` 直接向 Harness 发 `POST /api/<method>`
（envelope `{type:'client-request', rpcId, method, payload}`），另用 `/api/events.mux`
与 `/api/respond`。这三条路由均由已删除的 `dsh-host-apiproxy` 注册，需迁到新的 api controller。

### 2. 浏览器启动令牌认证

上游 Agent Note `2026-08-24-browser-token-authentication`：

- `dsh-client-connection` 在分发前认证**完整** Host API（API Proxy 方法、Remote 一元调用、
  Connection channel、Remote WebSocket stream）。无有效浏览器会话 → **401**；
  Host/Origin 校验失败 → **403**。
- 每个 Host 进程生成随机启动令牌，**每进程只打印并打开一次**带 `?token=` 的根 URL。
  只有 `GET /?token=...` 能把令牌换成 cookie；**API 路径与 `Authorization` header 都不接受该令牌**。
- cookie 为签名 bearer，**绑定规范化 hostname + port**，host-only、`HttpOnly`、`SameSite=Strict`。

后果：

- `src/main/index.ts:813` 的 `desktopHarnessUrl()` 自行拼 URL，拿不到令牌 → 主窗口会 401。
  需从 Harness stdout 捕获令牌 URL，或另行完成一次性 cookie 交换。
- 移动端桥接是服务端 `fetch`，没有 cookie，且令牌不走 header；cookie 又绑定在
  `127.0.0.1:PORT` 这个 authority 上，与手机侧看到的桥接 authority 不一致。
  桥接需自行完成令牌交换、携带 cookie，并把 `Host` 头固定为 loopback authority。

### 3. 本地包的 peer 范围

`packages/dsh-desktop-market-installer` 声明 peer
`@deepseek-ai/dsh-host-webserver: ^0.1.1-rc.1`，不覆盖 `0.1.2-alpha.1`
（预发布版本的 caret 只在同一 major.minor.patch 内匹配），安装时报 peer 冲突警告，需一并放宽。

### 4. 新增 `--trusted-host`

`dsh-web-app` 新增 `trustedHosts` 配置与 `--trusted-host` 参数，绑定全网卡时会采样 LAN
地址组成信任围栏。desktop 固定 `--host 127.0.0.1`（`buildHarnessArguments`）不触发该逻辑，
但隧道 / LAN 访问路径需复核是否要显式声明可信 authority。

### 5. Headless 进度输出改到 stderr

`harness-runtime.ts` 依赖逐行解析 `[stderr] ` 前缀做就绪判定与错误归类
（`cannot resolve profile bundle` 等）。上游改为 headless 期间向 stderr 流式输出进度，
噪声量变化，需重新验证。

## 建议执行顺序

1. 重做 7 个仍存在、hunk 失败较少的补丁（`directory-picker-native`、`model-selection`、
   `sidebar`、`agent-preset`、`workspace`、`settings-models`），让对应补丁测试转绿。
2. 处理 `ui-conversation`（9 个 hunk 挂 6 个，上游本轮大改会话交互）。
   优先核对上游是否已原生提供等价能力——能删则删，别硬移植。
3. 放宽 `dsh-desktop-market-installer` 的 peer 范围。
4. 把移动端桥接从 `/api/*` 迁到新的 api controller，并实现令牌换 cookie。
5. 重新验证主窗口加载、就绪探测、LAN / 隧道访问。
6. 等 npm 正式发布后，只做版本号 + lockfile 提交（lockfile 必须由真实 registry 生成，
   不能用本地 tarball 的 `file:` 路径）。

## 基线

当前 `main`（`d92384a`）在 `npm ci` 后 `npm test` 全绿：59 文件 / 452 用例全部通过。
