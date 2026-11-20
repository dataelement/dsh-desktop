# Harness 0.2.2-rc.4 升级记录

这一节记录升级前基线，以及已经做完的移植、补丁和本机验收。签名、公证和 Windows 仍未验证。和 rc.5 一起要在真实窗口里点的用例见 [rc.4 / rc.5 测试用例](./harness-0.2.2-rc.4-rc.5-test-cases.md)。

## 升级前基线

2026-11-18，在分支 `harness-0.2.2-rc.4` 上记录。该分支从 `V0.14.1` 的 `0da72dd7` 开出，此时还没有升级改动。环境是 macOS arm64、Node v26.0.0。

当时的关键依赖：

| 包 | 版本 |
| --- | --- |
| `@deepseek-ai/dsh` | `0.2.2-rc.1` |
| `@deepseek-ai/dsh-web-app` | `0.2.2-rc.1` |
| `@deepseek-ai/cordis` | `4.1.0`（`npm ls` 显示各插件都 dedupe 到这一份） |
| `@deepseek-ai/libreoffice-kit` | `0.1.5`（`overrides` 固定） |

实际跑过：

- `npm run typecheck` 通过。
- `npm run build` 通过。Office 运行时是 darwin/arm64、Python 3.12.14，模板资源 `b726036d2c6c`。PPT 运行时 16 套模板检查都是 0 error。electron-vite 仍提示 `renderer config is missing`，产物是 `out/main/index.js`、`out/main/host.js`、`out/preload/app.cjs`。
- `npm test` 通过：349 个文件通过、3 个跳过（共 352），3372 个用例通过、10 个跳过（共 3382），耗时 87 秒。日志里的 `EPERM`、`Invalid existing version index` 来自测试夹具本身，对应用例是通过的。升级后再出现的失败，先和这份全绿结果对照。

正式用户数据没有打开，也没有复制整份 `userData`。只对会话目录、`profiles/desktop`（不含 `node_modules`）和 PPT 会话做了只读哈希：81 个文件，汇总 SHA-256 是 `7a763fc0d4e735b185262640333a2626cc65075a198886fbfeca55bf13abc8da`。逐文件清单在本机 `.upstream-cache/baseline-sessions-0da72dd7.txt`，被 gitignore，不进仓库。

真实窗口用临时 `userData`（`DSH_DEV_PROFILE=dsh-desktop-rc4-baseline`，端口 43931/43932）启动了当前源码。正式 `dsh-desktop` 目录只做了只读复制，没有写入。启动后进入工作区，侧栏有已记住的会话、工作台、插件、自动化任务和“更多”；输入区有 PPT、Word、Excel。插件页能打开，内置插件和实验插件都在。设置页有通用设置、模型、内置插件、Agent 预设和插件市场，语言是中文，没有账号页，也没有“更新渠道”。侧栏上有维修模式和连接手机入口。Safe Mode、插件安装回滚和 Office 文件实际生成这次没有点进去。

## 依赖

根 `package.json` 里 222 个 `@deepseek-ai/dsh*` 已从 `0.2.2-rc.1` 改为 `0.2.2-rc.4`。`overrides` 里的 `@deepseek-ai/libreoffice-kit` 改为 `0.2.3`，`packages/ppt-runtime/core` 的 kit 依赖同步改了。8 个宿主包的 peer 保留旧范围，并追加 `^0.2.2-rc.4`；原来写死 `0.2.2-rc.1` 的项改成同时接受 `0.2.2-rc.1` 和 `0.2.2-rc.4`。

`npm install --ignore-scripts` 已刷新锁文件：新增 16、删除 64、变更 354。直接依赖里，非 DSH 包的锁定版本没有变。`@deepseek-ai/cordis` 仍是 `4.1.0`，并且只有一份。`libreoffice-kit` 从 `0.1.5` 解到 `0.2.3`，新的 `@deepseek-ai/dsh-office-kit@0.2.2-rc.4` 已进入锁文件。

2026-11-18 再次执行 `npm ci`，42 个补丁全部应用，postinstall 没有报错。`@deepseek-ai/dsh-error@0.2.2-rc.4` 补进根依赖：它是 `dsh-llm` 等包的 peer，锁文件原先没有安装条目，Host 导入会报 `ERR_MODULE_NOT_FOUND`。版本钉死为 `0.2.2-rc.4`，不使用 `^`。

已经落到 rc.4 文件名的包括：

- 内容不用改、只改文件名的 12 个：`dsh-client-file-upload`、`dsh-client-ui-primitives`、`dsh-client-ui-settings`、`dsh-credentials-local`、`dsh-host-open-in-app`、`dsh-llm`、`dsh-llm-deepseek`、`dsh-session-persistence`、`dsh-session-persistence-jsonl`、`dsh-settings`、`dsh-skill`、`dsh-workspace`。
- `dsh`：启动失败改为 `exitCode = 1` 后抛出；`optionalDependencies` 仍注入桌面插件。
- `dsh-app-boot`：补上 `reportPluginCompatibility` 声明，JS 侧的兼容性提示已经重放。
- `dsh-llm-pi-ai`：403 单独归为 `FORBIDDEN`，流结束时补齐缺失的终端内容，模型发现保留目录里的推理档位。
- `dsh-client-shortcuts`：`data-dsh-desktop-web-shortcuts=true` 时快捷键按网页环境处理。
- `dsh-client-modules`：工作台注入失败记入 failures 且不中断启动，其它客户端模块失败仍然抛出。
- `dsh-web-frontend`：整包替换补丁退役。rc.4 只把核心壳包和启动清单之外的条目当成致命失败。可选工作台失败不再白屏。`test/client-shell-failure-isolation.test.ts` 已按新产物改写。
- `libreoffice-kit@0.2.3`：`cli.js`、`index.js`、`editor.js` 的 ASAR `null` 判断，以及 `onImage`。`dsh-office-kit` 另有一处 ASAR `null` 判断。上游同时处理 `null` 和逐页通知后删除。

## Office 与产品补丁

- Host 在 `loadProfileDirectory` 之前设置 `DSH_PRIMARY_RUNTIME`，值来自启动参数第 4 项。
- `dsh-desktop-office` 不再挂载 `skill-office` 和 `workspace-dependencies`，也不再要求 CLI 路径。运行时校验失败时只跳过模板写入。
- 安装包不再复制或改写官方 `office-skills`。Word 模板路由留在 composer 上下文，PPT 路由留在 PPT 模式。
- `ui-account-notifications` 在普通 profile 和 Safe Mode 都禁用。更新仍只走 `https://dshdesktop.com/updates/latest/`。

Windows 上普通对话是否还会用 `Compress-Archive` 打出反斜杠 ZIP，这次没有在 Windows 上测，先不给 `dsh-skill-office` 加补丁。签名、公证和 Windows 打包也还没做。

## 上游壳对照

对照 `66491b05`（rc.1）到 `3f321d32`（rc.4）的 `apps/desktop/src` 和 `apps/desktop-host/src`。7 个已移植文件有差异，没有未登记的新文件。

- 已移植：平台请求头改从 `@deepseek-ai/dsh-deepseek-account/client-metadata` 引入；Host 认证后清掉同一主机名上遗留的 `dsh-auth-*` Cookie；macOS 编辑菜单把「粘贴并匹配样式」绑到 `Shift+Command+V`。
- 有意保留：`argv[4]` 继续传安装目录里的 primary runtime，不用上游的空字符串；不接入官方更新渠道 IPC。下载进度和 Windows `quitAndInstall(false, true)` 原本就在 `src/main/update/`。
- 跳过：`locale.ts`、`settings.ts`。前者这次只增加官方更新文案，后者改成读取已跳过的 `settings-file.ts`。

## 升级指南

对照提交 `66491b05` 与 `3f321d32` 的 `docs/upgrade-guide`。rc.4 新增 46 份 `guide.md`（含中文对照），没有删除旧指南。`v0.2.1-rc.2` 6 份、`v0.2.1-rc.3` 5 份、`v0.2.1-rc.4` 1 份是相对我们上一基线才出现的文档；本仓库宿主插件没有调用其中删除的 Agent API，行为随官方运行时，不另改桌面代码。

| 指南 | 结论 |
| --- | --- |
| `v0.2.1-rc.2/agent-runtime-owner`、`agent-team-subagents`、`session-team-mode`、`subagent-activation-options`、`subagent-service-methods`、`subagent-user-controls` | 不适用。桌面不调用这些 Agent API。按会话开关 Agent Teams 由官方组合提供。 |
| `v0.2.1-rc.3/inbox-only-agent-wait`、`subagent-runtime-ownership`、`team-mode-menu`、`team-projection`、`web-search-defaults` | 不适用。不覆盖官方等待、投影和搜索条数默认值。 |
| `v0.2.1-rc.4/sandbox-unsupported-policy-error` | 不适用。桌面不引用已删除的错误类型。 |
| `css-anchored-menus` | 不适用。宿主插件没有 `useAnchoredPosition` 或 `Menu.getAnchorRect`。 |
| `cua-source-dev-helper` | 不适用。我们不从源码构建官方 helper，使用包内 `DSH Computer Use.app`。 |
| `desktop-stable-channel` | 有意差异。官方稳定渠道改名 `stable`。产品更新地址仍是 `https://dshdesktop.com/updates/latest/`，不接入渠道切换。 |
| `llm-error-builtin-codes`、`retained-ptc-timeout`、`session-header-menu`、`subagent-explicit-reasoning` | 不适用。桌面没有直接构造这些 API。 |
| `web-search-credential-modes`、`web-search-default-provider`、`web-search-billing` | 适配。产品补丁和 Safe Mode 都没有设置 `web.searchProvider`，也没有旧的 `web-deepseek-api` 共享 `baseURL`。搜索默认改为 DeepSeek Search API，凭据跟随模型路由。更新说明需要告诉用户：搜索可能按 Search API 计费，而不再算作模型 token。 |
| `chat-process-activity-context` | 不适用。桌面不读取 `ProcessActivity` 的新字段。 |
| `office-kit-package`、`office-operation-tools`、`office-skill-resources` | 适配。`dsh-office-to-pdf` 已随依赖退出；官方技能留在包内 `assets/`，不再复制 `office-skills`，也不再传 CLI。模板写入仍走 `dsh-desktop-office`。 |
| `subagent-names` | 适配，并有回退风险。新子代理目录写成版本 3，旧版本读到会报错。升级说明要写明新会话数据不能保证被旧版本打开。实机对照还没跑。 |
| `account-notification-fields`、`account-remote-provider` | 有意差异。`ui-account-notifications` 和 `ui-settings-account` 保持禁用，账号页不接到用量和充值。 |
| `archive-worktrees` | 适配。沿用上游默认：归档会话可以清掉干净的 Git 工作树并保留分支。更新说明需要提示。 |
| `attachment-error-codes`、`runtime-context-reminders`、`session-append-overloads`、`subagent-interrupt-default`、`terminal-backend-cleanup-error` | 不适用。桌面补丁和宿主插件没有替换这些类型或调用。 |
| `cua-ax-read-limits`、`cua-hover-ax-only`、`cua-native-platform` | 适配。Computer Use 在官方可选包里默认关闭，只声明 darwin，Safe Mode 的 bundle 列表不含它。macOS 打包把 `dsh-experimental-cua-macos/native` 解出 asar，并增加屏幕录制用途说明。签名、公证和真实授权还没做。 |
| `dsh-doc-skill` | 不适用。`dsh-desktop-preset-transfer` 不按旧 Creator 技能名改写文档。 |
| `forge-change-request-overview`、`forge-pinned-diff`、`forge-review-reads` | 不适用。桌面不实现 Forge provider。Forge 作为官方可选包默认关闭。 |
| `plugin-update-method` | 适配。市场安装器仍走现有 generation；`BundleInfo.update` 由已换成 rc.4 的 plugin-manager 补丁承接。 |
| `terminal-bundle-sidebar-backend` | 不适用。不改官方终端包的侧栏实现。侧栏“更多”收纳由官方插件列表提供，工作台固定入口还要在补丁落地后用真实窗口确认。 |
| `window-drag-regions` | 适配。工作台、市场卸载确认、Office 预览和 PPT 预览这些盖住标题栏的浮层补了 `data-window-drag-exclude`。macOS 上打开浮层后标题栏空白处仍可拖动，这一步还没在真实窗口里点过。 |
| `deepseek-refusal-code` | 不适用。桌面不按 `MALFORMED_RESPONSE` 识别内容拒绝。上游改为 `CONTENT_REFUSED` 后由官方模型错误路径展示。 |

## 可选包与更新边界

- `@deepseek-ai/dsh-cua-bundle` 和 `@deepseek-ai/dsh-deepseek-chat-import` 都在 rc.4 的 `OPTIONAL_BUNDLES` 和 `MORE_BUNDLES` 里，安装包带上，插件页默认关闭，用户可以打开。Safe Mode 只保留 `dsh-base` 和 `dsh-web-app`。
- 原生 Computer Use helper 的包声明了 `"os": ["darwin"]`，Windows 和 Linux 不会安装这份原生应用。签名和公证未验证。
- 壳、Host 和 `src/main/update/` 不引用官方 `update-configuration`、`update-settings`、`updates/electron-updater`。`build.publish` 只有产品地址。
- rc.4 官方侧栏不再使用 `navIcon` 类。`dsh-desktop-client-ui` 仍隐藏带 `data-dsh-market-nav-icon` 或 `data-dsh-better-sidebar-settings-nav` 的旧 span 和直接 svg，避免第三方图标和官方齿轮叠在一起。`sidebar.brand.mark`、`sidebar.brand.name`、`sidebar.settings.action` 这些槽还在。

## 当前验收

同一环境下：

- `npm ci` 应用全部 42 个补丁。
- `npm run typecheck` 通过。
- `npm run build` 通过。Office 运行时是 darwin/arm64、Python 3.12.14，模板资源 `d92e4631ab93`。PPT 17 套模板检查都是 0 error。electron-vite 仍提示 `renderer config is missing`，产物是 `out/main/index.js`、`out/main/host.js`、`out/preload/app.cjs`。
- `npm test` 在精确钉住 `dsh-error` 并加上组合快照之后整轮通过：350 个文件通过、3 个跳过，3376 个用例通过、10 个跳过。耗时约 97 秒。日志里的 Windows 路径和 `Invalid existing version index` 来自测试夹具，不是这次失败。
- Host 子进程覆盖了安装包插件、市场插件、软链接、普通 profile 和 Safe Mode。MCP 启动超时如果先登记了半页工具，失败时会清掉这半页。
- 同一个真实 Host 启动会带上实际启用的插件 id。普通 profile 和 Safe Mode 各有一份快照：`include:skill-office` 各一份，`include:workspace-dependencies` 只在普通 profile 出现一份。账号页、账号通知、产品分析和官方品牌不在启用列表里。Computer Use 和会话导入也不在。匿名 Loader id 每次启动都会变，快照改记它们的模块名。

数据向前兼容：把正式 `dsh-desktop/harness` 复制到临时目录后，用当前 Host 启动这份副本。启动前把副本里指向正式目录的绝对符号链接改到副本内部，避免读到正式数据。正式目录在启动后没有文件被改写。会话目录和 `kimi-ppt` 的内容与正式目录一致，没有被重写。副本里有变化的是桌面自己写的 `.desktop-bin` 启动脚本、`desktop-product.patch.yml`，以及插件市场日志多了一行。

向后兼容没有测。已安装的旧版本固定使用正式 `dsh-desktop` 目录，不能改到临时副本。因此还不能说旧版本打得开升级后的新会话。

真实窗口用临时 profile `dsh-desktop-rc4-window`（Harness 43941，手机桥 43942）打开了当前源码。正式 `dsh-desktop` 和 `dsh-desktop-dev` 没有作为这次的 userData。

- 首次启动出现「发现网页版数据」。点了「从空白开始」，没有导入。临时 profile 里的决定是 `skipped`。
- 进入工作区后，侧栏有新会话、工作台、插件、自动化任务和「更多」，底部有设置、维修模式和连接手机。输入区有默认工作区、标准模式，以及 PPT、Word、Excel。
- 设置导航是通用设置、模型、内置插件、Agent 预设、插件市场。通用设置读到「当前版本：0.2.2-rc.4」，没有「更新渠道」，也没有账号设置页。
- 内置插件里 `ui-account-notifications` 和 `desktop-product-telemetry` 显示已停用。`deepseek-account` 插件本身仍是已启用，设置页不出现账号项。`tool-office` 显示已启用。
- 「更多」打开插件页。实验性插件里 Computer Use、DeepSeek 会话导入的开关都是关。Codex 和 Claude Code 子智能体显示未安装，开关也是关。
- 第二次用同一临时 profile 打开时直接进入工作区。窗口不在当前桌面，后续点击没有落到页面上，所以快捷键编辑、连接手机、工作台浮层和标题栏拖拽这次没有点成。没有进入 LiveShare，也没有制造异常模型响应，也没有生成 Word、Excel、PPT。

未签名的开发目录包可以打出来。`CSC_IDENTITY_AUTO_DISCOVERY=false npm run package:dev:dir` 通过，electron-builder 明确跳过 macOS 签名。产物是 `dist-dev/mac-arm64/DSH Desktop Dev.app`，身份是 `io.dsh.desktop.dev`，屏幕录制用途说明在 Info.plist 里，Computer Use 的 `native` 目录在 `app.asar.unpacked`。用 `DSH_DEV_PROFILE=dsh-desktop-rc4-pkg` 启动后，userData 落在这个临时目录，Host 返回 401（服务已起来并要求认证），页面进入工作区，侧栏有 PPT、Word、Excel、设置、维修和连接手机。手机桥监听了指定端口。更新检查先是 `checking`，随后是 `error`，没有完成下载或安装。正式 `dsh-desktop` 目录的修改时间没有变，`~/.dsh` 在这段时间也没有文件被改写。这个临时 profile 第一次启动时自动导入了网页版数据，验收结束后已删除，避免留下凭据副本。窗口同样不在当前桌面，点击没有进设置。

签名、公证、已安装应用的更新同意/跳过/回滚，以及 Windows 打包、安装、Safe Mode 和更新后重新打开，这次没有做，保持未验证。
