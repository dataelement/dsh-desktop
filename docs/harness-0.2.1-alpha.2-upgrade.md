# Harness 0.2.1-alpha.2 升级记录

仓库内 `@deepseek-ai/dsh*` 直接依赖固定到 `0.2.1-alpha.2`。这是预览版本，不是 npm `latest`（当时仍为 `0.2.0-rc.2`）。Cordis 跟随已发布的 `@deepseek-ai/dsh@0.2.1-alpha.2`：`cordis@4.0.5-alpha.1`、`cordis-plugin-loader@1.0.6-alpha.1`。插件和 PPT 的 dsh peer 追加 `|| ^0.2.1-alpha.1`，Cordis peer 追加带预发布号的区间，否则 `^0.2.0-rc.1` 和 `^4.0.1` 都匹配不到这次的预发布版本。

上游已经删除、npm 上也不再发布 `0.2.1-alpha.2` 的包不再钉为直接依赖：`@deepseek-ai/dsh-invariants`、`@deepseek-ai/dsh-subagent-in-process-driver`、`@deepseek-ai/dsh-experimental-schedule-bundle`。日程能力改由仍在闭包里的 `@deepseek-ai/dsh-tool-schedule` 和 `@deepseek-ai/dsh-experimental-terminal-bundle` 承担。会话搜索、会话标题和终端这三个实验包会把 `dsh-tool-session-query`、`dsh-session-title-all-prompts-llm`、`dsh-tool-terminal` 带进锁文件，它们不是 Desktop 的直接依赖。

## 补丁

30 个补丁：28 个 `@deepseek-ai/dsh*`、`cordis-plugin-loader@1.0.6-alpha.1`、`undici@8.11.2`。`@deepseek-ai/dsh` 的 `package.json` 仍用 `patch-package --exclude '^$'` 生成。`undici` 的对象头转换在已发布的 8.11.2 里还没有，补丁保留。

相对 0.2.0-rc.2 需要重新接上的桌面行为：

- `dsh-agent-loop` 增加 `cwd` 系统提示变量。已发布的 0.2.1-alpha.2 只注册了 `provider` 和 `model`，预设里的 `{{cwd}}` 没有取值。上游补回注册后应删除这个补丁。
- 会话标题在读取模型输出的第一行之前去掉 `<think>` 块。MiniMax 会把推理写进文本通道，否则侧边栏标题会以 `<think>` 开头，并盖掉原先的回退标题。
- 聊天里的上传附件打开、首条用户消息页脚，接到新的 `ChatView` / `ChatFlow` / `ChatNodeSeat` 上。
- 预设导入导出和搜索保留，并继续使用上游的 `useDeveloperTools` 过滤。
- Profile 加载跳过市场禁用的 bundle，给补丁行标上 `__dshPluginOwner`，准备失败时抛出带 `dshPluginFailure` 的错误，而不是静默跳过。
- 插件管理器在有宿主包后端时走 `install` / `remove` / `switched` / `removed`。
- 工作区未读、删除、可见性过滤和会话打开器保留。
- 交付物里的本地路径识别保留；版本号和 scoped 包名不会被当成路径。

没有改目录选择。桌面仍走 `directory-picker:open` 到 `dialog.showOpenDialog`。应用继续绑定 `127.0.0.1`。

`both` 工具展示模式没有做用户数据迁移。当前聊天设置只接受 `compact` / `standard` / `detailed` / `verbose`，没有发现会拒绝旧值并挡住启动的路径。PPT 的 `./invariant` 导出还在，对等依赖 `dsh-invariants` 已去掉；默认组合没有加载这个入口。

## 验证

已执行：

- `npm ci` 的 postinstall 重放了全部 28 个补丁。
- `npm run typecheck`、`npm run ppt:build`、`npm run build`。
- `vitest`：182 个文件，1634 通过，3 个跳过。跳过的是 Node 26 上依赖旧版 `fetch` dispatcher 的 undici 用例；包装器本身的对象头转换仍在测。CI 使用 Node 22，这 3 条会继续跑。
- `node scripts/verify-harness-auth.mjs`：临时 `DSH_HOME` 上 `dsh web` 就绪，无 cookie 的 `/api` 返回 401，换 cookie 后返回 200。
- `npm run package:dev:dir` 成功，产物在 `dist-dev/mac-arm64/DSH Desktop Dev.app`。本机 Developer ID 签了名，公证被跳过。
- 临时 `DSH_HOME` 的普通 Profile，用桌面补丁和 `build/harness-node-entry.mjs` 启动。浏览器里模块系统处于 live、等待队列为 0，70 个客户端入口里包含 `dsh-desktop-client-ui`、`dsh-desktop-workbenches`、`dsh-desktop-onboarding`、`dsh-desktop-market-installer`、`dsh-ppt-composer`。界面能打开工作台、PPT、模型设置，以及带导入和搜索的 Agent 预设。
- Safe Mode：另一个临时目录里的 `desktop-safe-mode`，加上 `dsh-desktop-safe.patch.yml` 和 `DSH_DESKTOP_HOST_RESOLVED=1`。浏览器挂载成功，65 个客户端入口，包含 `dsh-desktop-client-ui`，没有 PPT 和工作台。

未执行：从打包应用里复验界面。这个开发目录包会把 `userData` 固定到 `~/Library/Application Support/dsh-desktop-dev`，启动后已退出，没有在那份开发 Profile 里点击。浏览器会话没有 Electron preload，所以没有弹出原生目录选择框。没有用真实模型密钥发消息去看 `{{cwd}}`，变量注册由 `test/agent-loop-cwd.test.ts` 覆盖。会话删除、未读和附件本地打开没有在这次临时 Profile 里点完。Windows junction、PTY 和正式签名安装包不在这次范围内。
