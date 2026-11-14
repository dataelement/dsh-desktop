# Harness 0.2.2-rc.1 升级记录

依赖、锁文件和 37 个补丁已经对上 `0.2.2-rc.1`。干净 `npm ci`、`npm run typecheck`、`npm run build` 和完整 `npm test` 已通过。真实 Harness 子进程在临时 `DSH_HOME` 上覆盖了普通 profile 和 Safe Mode。还没有打安装包，也没有在 Windows 上复验，不能发版。

## 范围

- 分支 `upgrade/dsh-0.2.2-rc.1`，起点是 `main` `8504fd59`（`v0.13.2`）。
- 官方对照 tag 是 [`dsh-v0.2.2-rc.1`](https://github.com/deepseek-ai/deepseek-harness/releases/tag/dsh-v0.2.2-rc.1)（`66491b05`）。
- 根依赖里 220 个 `@deepseek-ai/dsh*` 从 `0.2.2-alpha.2` 改为精确版本 `0.2.2-rc.1`。这 220 个包在 npm 上都有该版本。
- 配套依赖跟着 `0.2.2-rc.1` 的 peer 一起升，否则安装会解出两套 Cordis：

| 包 | 旧版本 | 新版本 |
| --- | --- | --- |
| `@deepseek-ai/cordis` | `4.0.6-alpha.1` | `4.1.0` |
| `@deepseek-ai/cordis-plugin-group` | `1.0.6-alpha.1` | `1.1.0` |
| `@deepseek-ai/cordis-plugin-hmr` | `1.0.21-alpha.1` | `1.1.0` |
| `@deepseek-ai/cordis-plugin-include` | `1.0.11-alpha.1` | `1.1.0` |
| `@deepseek-ai/cordis-plugin-loader` | `1.0.7-alpha.1` | `1.1.0` |
| `@deepseek-ai/cordis-plugin-timer` | `1.1.8-alpha.1` | `1.2.0` |
| `@deepseek-ai/cosmokit` | `1.8.6` | `1.9.0` |
| `@deepseek-ai/schemastery` | `3.18.6-alpha.1` | `3.19.0` |

- 宿主插件和 PPT 包的 peer 范围追加 `^0.2.2-rc.1`、`^4.1.0`、`^3.19.0`。原先写死 `0.2.2-alpha.2` 或 `3.18.6-alpha.1` 的项改成新版本。旧范围保留，已发布的旧插件仍能声明兼容。
- 锁文件由 `npm install --ignore-scripts` 更新。随后干净 `npm ci` 成功，postinstall 里的 `patch-package` 把 37 个补丁全部打上。

## 补丁

补丁文件名已改到新版本：`0.2.2-alpha.2` 改为 `0.2.2-rc.1`，`cordis-plugin-loader` 改为 `1.1.0`。非 DSH 补丁（`libreoffice-kit`、`pi-ai`、`node-pty`、`undici`）未改内容，重放成功。

原先对不上的 16 个补丁已按 rc.1 源码重放并重新生成，没有删除。`npx patch-package` 和干净 `npm ci` 的 postinstall 都是 37 个全部成功。

重放时保住的行为：

| 补丁 | 在 rc.1 上的落点 |
| --- | --- |
| `cordis-plugin-loader`、`dsh-api-remotes`、`dsh-api-session-controller`、`dsh-app-boot`、`dsh-client-ui-trajectory`、`dsh-plugin-manager` | 原行为仍在，只是上下文变了，按新源码重生成 |
| `dsh` | CLI 失败改为 `exitCode = 1` 后抛出。桌面可选依赖改成独立的 `optionalDependencies`，因为 rc.1 已把实验包放进 `dependencies`，也不再有 `dsh-cua-bundle` |
| `dsh-client-ui-sidebar` | 侧栏根节点保留 `data-dsh-sidebar-root` / `data-dsh-sidebar-wide` |
| `dsh-client-ui-chat` | `ChatNodeSeat` 继续接收 `leadingUserKey` 和 `messageFooter`。rc.1 已去掉 `fileMentions` 参数 |
| `dsh-llm-pi-ai` | 会话 id 写在新的 `requestHeaders(configured, options, baseURL, prepare)` 里 |
| `dsh-client-ui-settings-models` | 模型行保留图片输入开关和 `ModelReasoningEffortsField` |
| `dsh-client-ui-primitives` | `parseFileLink` 继续识别冒号和 GitHub 行列后缀，并排除 `localhost:8080` 这类地址 |
| `dsh-client-ui-conversation` | 空白会话的 mode/dock 槽和输入附件样式按新的 CSS 类名接上 |
| `dsh-client-ui-deliverables` | 本地路径和文件夹提及保留，并接上 rc.1 新增的右键菜单参数 |
| `dsh-client-ui-workspace` | 未读标记和会话可见性过滤保留。右键菜单改走 rc.1 的 context menu，并把 `unread` / `onUnreadChange` 放进菜单值 |
| `dsh-web-frontend` | 可选插件失败仍从整树启动失败里分开。目标文件从已消失的 `index--TtJvO-i.js` 改到当前产物 `index-BgUyXZcc.js`。这个文件名每次发版都会变，下次升级还要重放 |

随源码布局改过的测试：`test/client-shell-failure-isolation.test.ts` 改为当前压缩符号 `ut` / `KZ` / `qZ` / `GZ`；`test/file-preview.test.ts` 的 `openFile` 截取止于 rc.1 新插入的 `resolveFilePath`。

干净安装之后，下面这组测试通过（14 个文件，355 个用例）：`hmr-fallback`、`model-picker-patch`、`model-settings-catalog-ux-patch`、`model-reasoning-efforts-patch`、`file-preview`、`local-path-links`、`pi-ai-session-headers`、`cordis-plugin-loader-patch`、`workspace-unread-patch`、`workbench-navigation`、`client-shell-failure-isolation`、`boot-cover-integration`、`workbench-client`、`mcp-startup-deadline`。

## 检查

在 macOS arm64、Node v26.0.0 上实际跑过：

- `npm run typecheck` 通过。会话头测试补上了 rc.1 解析后的 `maxRequestImages` 和 `imageOffloadCountQuantum`。
- `npm run build` 通过。产物是 `out/main/index.js` 和 `out/preload/index.cjs`。electron-vite 仍提示 `renderer config is missing`，渲染进程继续用 Harness 前端，这次构建没有生成渲染端 bundle。
- `npm test` 通过：292 个文件、2952 个用例通过，1 个文件和 6 个用例跳过。第一次全量跑有 12 个失败，已按 rc.1 的实际接口改测试或补丁后重跑通过。其中 Safe Mode 用例曾和桌面默认端口 `43129` 冲突，现改为临时端口。
- 真实子进程：`test/host-disabled-plugins.test.ts` 在临时 `DSH_HOME` 把普通 `web` profile 启动到 `ready`，并完成带启动令牌的页面请求。`test/safe-mode-runtime.test.ts` 在另一个临时 `DSH_HOME` 把 `desktop-safe-mode` 启动到 `ready`，未创建 `profiles/node_modules`，认证后的 desktop boot 返回 200。这两处就是应用放在 `<userData>/harness` 的那个目录，没有改本机 `dsh-desktop` 或 `dsh-desktop-dev`。

随全量测试改过的契约：

- 折叠侧栏在 Windows 标题栏下宽度为 0，判断改成 `drawer || darwin || windowsTitlebar`。
- 会话菜单改由 rc.1 的 `SessionMenu` 统一渲染 `sidebar.workspaces.session.menu.item`。
- 空白侧栏的新建会话只在带 `data-platform` 的桌面文档上出现。
- Node 26 的 fetch 已经使用新的 handler。`undici` 补丁在这条路径上仍把对象形式的旧响应头摊成数组。
- `packages/ppt-runtime` 里残留的 `@deepseek-ai/schemastery@3.18.2` 私有副本已删掉，解析回到仓库根的 `3.19.0`。这个目录在 `.gitignore` 里，不进提交。

## 还要做

1. Windows 上复验打包、启动、Safe Mode 和这次改过的侧栏宽度。macOS 通过不能代替。
2. 这次没有打安装包，也没有走签名后的已安装应用冒烟。
3. 官方壳移植仍未开始。仓库外的官方 Desktop 已在 macOS 上构建并启动，观察见 [upstream-reference/66491b05e3f05ad35bcdd4f6cd7ed26041d9e3db.md](upstream-reference/66491b05e3f05ad35bcdd4f6cd7ed26041d9e3db.md)。Windows 对照还没做。
4. 来源基线检查现在通过。最小壳源码已写入 `src/main/shell/`、`src/host/index.ts` 和 `src/preload/app.ts`。欢迎窗口、账号登录和 `dsh` 命令注册不移植，对应文件在 `upstream-baseline.json` 的 `skipped`。产品分析不接入。`npm run build:shell` 在 macOS 产出 `out-shell/`。`test/host/run-profile.test.ts` 用临时 `DSH_HOME`、profile 名 `desktop` 和产品分析关闭补丁启动 `runProfile`。`profiles/web` 到 `profiles/desktop` 的复制在 `test/profile/profile-rename.test.ts`。`npm run package:shell:dir` 在 macOS arm64 产出未安装的 `dist-shell/mac-arm64/DSH Desktop Shell.app`，app ID 是 `io.dsh.desktop.shell`，`Contents/Resources/THIRD_PARTY_NOTICES.md` 存在。2026-11-06 用临时 `userData` 启动了当前目录包，主窗口进入工作区并提示选择模型。这个包没有安装。Windows 没验。
