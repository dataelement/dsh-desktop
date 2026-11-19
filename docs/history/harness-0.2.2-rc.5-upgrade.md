# Harness 0.2.2-rc.5 升级记录

这一节记录从 `0.2.2-rc.4` 升到 `0.2.2-rc.5` 的依赖、补丁和本机验收。签名、公证、Windows 安装包、企业网关和真实会话搜索还没有验证。可执行用例见 [rc.4 / rc.5 测试用例](./harness-0.2.2-rc.4-rc.5-test-cases.md)。

## 上游变化

标签 [dsh-v0.2.2-rc.5](https://github.com/deepseek-ai/deepseek-harness/releases/tag/dsh-v0.2.2-rc.5) 的提交是 `9c2670d3bce5275e0d1610272958121af87787bb`，比 rc.4 的 `3f321d32` 超前 5 个提交。除各包版本号外，行为只在网页搜索：

- `dsh-base` 不再写 `web.searchProvider: deepseek-search-api`，只保留 `fetchProvider: http`。
- 没有显式配置时，`deepseek-official` 和 `deepseek-account` 走不按次收费的 Messages 搜索；其他路由，以及不服务于模型请求的搜索，仍走 DeepSeek Search API。
- 设置页增加「自动选择」。旧文案「DeepSeek（旧版）」改为「DeepSeek 服务端搜索」。已保存的 `web.searchProvider` 和 `DSH_WEB_SEARCH_PROVIDER` 仍然优先。

`apps/desktop/src` 和 `apps/desktop-host/src` 相对 rc.4 没有源码差异，也没有未登记的新文件。这次不移植壳源码。LibreOffice Kit 仍是 `0.2.3`。

产品补丁和 Safe Mode 都不写 `searchProvider`，所以会采用新默认。Messages 搜索不跟随模型 `baseURL`，地址按 `web-search-deepseek.baseURL`、`DEEPSEEK_SEARCH_BASE_URL`、`https://api.deepseek.com/anthropic/v1` 取值。给 DeepSeek 配了自定义接口的用户，DeepSeek 会话的搜索会改发官方端点；在设置里改选「DeepSeek Search API」，或填写服务端搜索的 Base URL，可以恢复。

## 依赖

根 `package.json` 里 223 个 `@deepseek-ai/dsh*` 从 `0.2.2-rc.4` 改为 `0.2.2-rc.5`，仍然是精确版本。`@deepseek-ai/cordis` 仍是 `4.1.0` 且只有一份。`@deepseek-ai/libreoffice-kit` 仍由 overrides 固定在 `0.2.3`。

精确 peer `"0.2.2-rc.1 || 0.2.2-rc.4"` 追加了 `|| 0.2.2-rc.5`：`dsh-desktop-office` 6 处，`dsh-desktop-workbenches` 2 处。其余宿主包的 `^0.2.2-rc.4` 已经接受 rc.5，没有改。

`npm install --ignore-scripts` 刷新锁文件后，包集合没有增减。338 个 `@deepseek-ai/dsh*` 条目都是 `0.2.2-rc.5`。直接依赖里的非 DSH 包锁定版本没有变。npm 顺带把传递依赖 `jose` 从 `6.2.17` 浮到 `6.2.18`，已改回 `6.2.17`。

## 补丁

`patches/` 里 42 个 `.patch`：34 个 Harness 补丁改到 `0.2.2-rc.5`，另外 8 个第三方补丁不动。2026-11-19 的 `npm ci` 把 42 个补丁全部应用，postinstall 没有报错。

30 个补丁只改了文件名，用 rc.5 的包做了 `git apply --check`。另外 4 个在 rc.5 上对不上上下文，按原意图重新生成，行为没有扩大：

- `dsh`：启动失败仍是 `exitCode = 1` 后抛出。`optionalDependencies` 仍注入桌面插件，其中 `@deepseek-ai/dsh-deepseek-account` 改为 `0.2.2-rc.5`。`patch-package` 默认排除 `package.json`，这一段是按 rc.5 的 `package.json` 手工补进补丁的。
- `dsh-api-remotes`：rc.5 只把 `packages/web/web/src/index.ts` 的 sourceLocation 行号从 152 改成 174。补丁行为与 rc.4 相同。
- `dsh-client-ui-settings-general`：压缩产物里的版本字面量从 `0.2.2-rc.4` 改为 `0.2.2-rc.5`。
- `dsh-client-ui-sidebar`：构建版本从 `0.2.2-rc.4-70005a5` 改为 `0.2.2-rc.5-3f85d88`。

`dsh-app-boot` 补丁仍带着 `lib/index.js.orig` 等备份文件的 hunk。它们能应用，这次没有拆掉。

## 本机验收

环境是 macOS arm64、Node v26.0.0，分支 `harness-0.2.2-rc.5`。

- `npm run typecheck` 通过。
- `npm test` 通过：350 个文件通过、3 个跳过（共 353），3379 个用例通过、10 个跳过（共 3389），耗时 96 秒。日志里的 `EPERM` 和 `Invalid existing version index` 来自测试夹具，对应用例是通过的。
- `npm run build` 通过。electron-vite 仍提示 `renderer config is missing`。产物是 `out/main/index.js`、`out/main/host.js`、`out/preload/app.cjs`。Office 运行时是 darwin/arm64、Python 3.12.14，模板资源 `63454a91cb43`。
- `node scripts/check-upstream-baseline.mjs` 通过。`node scripts/upstream-diff.mjs --from 3f321d32 --to 9c2670d3` 报告没有模块改动，也没有未登记的新文件。本地 bare 仓库曾缺对象，先执行了 `git fetch --refetch`。

安装包里的搜索设置文案包含「自动选择」和「DeepSeek 服务端搜索」。没有打开临时 Profile，也没有看真实搜索日志，所以下面几项还没验收：DeepSeek API key 会话、账号登录且没有 API key 的会话、非 DeepSeek 模型、自定义 `baseURL` 的恢复路径、已保存搜索选择的旧 Profile、Safe Mode 启动，以及客户端 bootstrap 到 UI 挂载。企业插件不在本仓库，企业网关只能在含 `dsh-desktop-enterprise` 的构建上验。Windows 安装包、签名和公证也还没做。
