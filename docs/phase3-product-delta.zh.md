# 相对官方 Desktop 的增量与改动

对照基线是官方 tag `dsh-v0.2.2-rc.1`（提交 `66491b05`）。本文收本项目相对官方 Desktop 的功能差：阶段 1 的数据目录、阶段 2 的加载、阶段 3 接到新壳的产品功能。桌面通知仍留到最后重写。基线里只改写法、不改变使用路径的差异放在文末。阶段 3 还没按 [架构文档第 8 章](three-desktop-architecture.zh.md) 逐项通过。写过「窗口看过」的记录只来自 2026-11-06。

分类：

| 类别 | 含义 |
| --- | --- |
| 增量 | 官方 Desktop 没有这项，或官方有另一套实现而本产品不移植，改接现有产品层 |
| 改动 | 官方有同名壳模块，新壳按产品改了行为 |

## 怎么走一条路径

自动化不打开窗口，在仓库根目录运行：

```bash
npm test -- test/shell/<文件>.test.ts
```

窗口不要用 `electron .`。正式包由 `npm run build` 产出，入口是 `out/main/index.js`，应用身份是 `io.dsh.desktop` / `DSH Desktop`，用户数据目录是 `dsh-desktop`。提测用正式打包命令，不用已经删除的独立壳配置。

```bash
npm run package:mac:arm64
```

产物是 `dist/dsh-desktop-mac-arm64.dmg`。安装前退出正在使用的正式应用，并保留当前应用和 `~/Library/Application Support/dsh-desktop` 的副本。

安全模式在同一条命令后加 `--safe-mode`。临时目录不要指向正式 `dsh-desktop`、开发 Profile `dsh-desktop-dev` 或 `~/.dsh`。

2026-11-06 已有的 `dist-shell/mac-arm64/DSH Desktop Shell.app` 早于后面的 `out-shell`。快捷键、侧边栏浏览器、文件拖放和崩溃记录要按当前代码重打目录包之后，才在那个包里。下面写过「窗口看过」的记录，多数来自当时的 `build:shell` 产物，不能算进那份旧目录包。

这次启动写到临时 `userData` 的位置：

| 路径 | 内容 |
| --- | --- |
| `harness/` | `DSH_HOME`。不使用 `~/.dsh` |
| `harness/desktop-product.patch.yml` | 产品补丁 |
| `harness/profiles/desktop` | 普通 profile |
| `harness/profiles/desktop-safe-mode` | Safe Mode，只含官方核心包 |
| `harness/fatal-report.json` | 致命失败。查询参数里的 `token` 已抹掉 |
| `plugin-operations/` | 插件操作记录 |
| `keybindings.json` | 快捷键偏好 |
| `recovery/` | 修复代理会话 |

崩溃文件 `crash-*.log` 在应用日志目录，不在上面的 `userData` 里，也不向外发送。

## 阶段 1：数据目录

官方 Host 默认写 `~/.dsh`，入口里的 profile 名写死为 `desktop`。新壳把家目录和 profile 名改成产品自己的。

| 功能 | 相对官方 | 使用路径 | 测试 |
| --- | --- | --- | --- |
| 数据目录 | 启动 Host 时设置 `DSH_HOME=userData/harness`，与本机 CLI 的 `~/.dsh` 分开 | 用临时 `--user-data-dir` 启动后，数据出现在该目录的 `harness/`。`~/.dsh` 的修改时间不变 | `npm test -- test/host/run-profile.test.ts` |
| profile 名 | 从 `DSH_DESKTOP_PROFILE` 读取，缺省是 `desktop`。Safe Mode 使用 `desktop-safe-mode` | 普通启动进 `profiles/desktop`。加 `--safe-mode` 后进 `profiles/desktop-safe-mode` | 同上 |
| `web` 复制到 `desktop` | 官方直接使用 `profiles/desktop`。本产品旧数据在 `profiles/web`。新壳启动前复制：manifest、用户 patch、市场开关和前端存储一起复制，profile 根上的 `lock` 不复制。generation 登记在 `profiles/.generations`，不搬动。进度记在 `profiles/.dsh-profile-rename.json`。中断后丢掉半成品再复制。已经完成的不重复。已有、且不是这次复制结果的 `profiles/desktop` 不覆盖。旧目录留下，旧版本仍能读 `web` | 用带 `profiles/web`、没有完成标记的临时家目录启动。完成后 `web` 仍在，`desktop` 出现 | `npm test -- test/profile/profile-rename.test.ts`。2026-11-06 用正式 Profile 副本启动过：正式目录没有变化，`web` 仍在，`desktop` 的依赖、bundle、模型 patch 和 generation 投影与 `web` 一致。真实窗口里没有中断过一次复制 |
| 打包身份 | 正式产品名和 app ID 留到阶段 5。现在的目录包是 `io.dsh.desktop.shell` / `DSH Desktop Shell`，避免写进正式 `userData` | 安装或打开 `dist-shell` 里的目录包。正式版 `dsh-desktop` 的用户数据不应被改写 | 打包配置在 `electron-builder.shell.cjs`。没有单独的行为测试 |

## 阶段 2：加载

| 功能 | 相对官方 | 使用路径 | 测试 |
| --- | --- | --- | --- |
| 市场 generation 投影 | 官方插件管理不负责这层投影。新壳在 Host 启动前对 `desktop` 调用 `prepareGenerationsForLaunch`。投影只替换自己写下的链接。pnpm 的真实目录遇到投影得到 `EDSH_REAL_PLUGIN_DIRECTORY`，不会被换成链接。新建的 `desktop` 用 `@deepseek-ai/dsh-base` 和 `@deepseek-ai/dsh-web-app` 初始化，不用 web 模板。Safe Mode 不投影，也不创建共享的 `profiles/node_modules` | 普通启动后看 `profiles/desktop` 里的 generation 链接。`--safe-mode` 后该目录没有这层投影，也没有 `profiles/node_modules` | `npm test -- test/generation-launch.test.ts test/host/run-profile.test.ts` |
| 插件解析 | 新壳不再走旧壳的宿主包回退。安装包内置插件、放在 `profiles/node_modules` 的市场插件、指向目录外的符号链接，都按正常 Node 解析。缺少宿主 peer 和插件自带依赖缺失都留下 `ERR_MODULE_NOT_FOUND`，并带上各自的包名 | 临时目录里分别放一个市场插件、一个符号链接插件、一个缺宿主 peer 的插件，再启动 Host，对照错误里的包名 | `npm test -- test/host/plugin-resolution.test.ts`。Windows junction 没跑 |
| macOS 进程方式 | 官方 `dsh-v0.2.2-rc.1` 用 `ELECTRON_RUN_AS_NODE` 启动 Host。旧壳在 macOS 上用 UtilityProcess，把第三方工具的隐私权限请求从主应用拆开。新壳保持 `ELECTRON_RUN_AS_NODE`。没有做 TCC 实测，所以不改成 UtilityProcess | 新壳启动后，Host 不是 UtilityProcess。Office、终端或 Computer Use 的系统授权归到哪个进程，还没在真机上看过 | `npm test -- test/host/run-profile.test.ts`。隐私权限归属没有窗口实测 |

## 增量

这些能力留在产品层。官方的欢迎窗、强制更新和官方更新流程没有接进来。

| 功能 | 相对官方 | 使用路径 | 测试 |
| --- | --- | --- | --- |
| 产品更新 | 不移植官方检查、下载和更新窗。已安装的 macOS 或 Windows 包才自动检查；下载要等用户同意；可以跳过一个版本；更新卡片可以选择历史版本。未打包的启动只注册检查，不自动联网 | 菜单「检查更新…」（`Cmd+U`），或应用页「关于 DSH Desktop」里的「检查更新」。有提议时应用页出现更新卡片，按钮是「更新」和「忽略」。历史版本在关于对话框的「历史版本（回退）」 | `npm test -- test/update-skip.test.ts test/update-rollout.test.ts test/update-ui.test.ts test/desktop-update-ui.test.ts`。2026-11-06 未打包窗口看到更新卡片并保持隐藏，没有下载。同意后下载、跳过和回滚还没在已安装包上走过 |
| 手机桥 | 官方没有配对桥。普通启动在 Host 就绪后监听；桥使用壳已经换到的 Host cookie，不把启动 token 交给手机页；Harness 留在回环；没有局域网地址时才打开互联网隧道。Safe Mode 不监听 | 侧边栏展开后，设置行旁的「连接手机」。已连接时同一位置是「管理手机连接」 | `npm test -- test/shell/mobile-pairing.test.ts test/lan-mobile-bridge.test.ts test/lan-mobile-pages.test.ts test/lan-mobile-tunnel.test.ts`。窗口还没点开配对页，避免打开互联网隧道 |
| 工作台 | 官方没有。普通 profile 挂 `dsh-desktop-workbenches`，根目录是 `DSH_HOME/desktop-workbenches`。Safe Mode 不挂 | 展开左侧栏，左上角「工作台」。可在「设置 → 通用」关闭。市场在「工作台市场」 | `npm test -- test/host/run-profile.test.ts` 核对普通 profile 注入含工作台、Safe Mode 不含。工作台自身在 `test/workbench-*.mjs`。2026-11-06 窗口文字里有「工作台」，没有切换或安装一个工作台 |
| 插件市场 | 官方插件管理走 `dsh-plugin-manager`。本产品的市场安装器是 `dsh-desktop-market-installer`，安装目标跟随 `DSH_DESKTOP_PROFILE`，新壳是 `desktop`。Safe Mode 不挂安装器；Safe Mode 页仍可升级 `desktop` profile 的插件，并打开、恢复或删除卸载备份 | 应用内「插件市场」。Safe Mode 页上是「一键升级 N 个有更新的插件」和「插件恢复备份」 | `npm test -- test/market-installer.test.js test/shell/safe-mode-manager.test.ts test/shell/plugin-maintenance.test.ts`。安装仍走测试替身，没有安装或回滚一个真实市场插件 |
| 网页版导入 | 官方与本机 CLI 共用 `~/.dsh`。本产品只在桌面家目录还没有用户数据时询问，复制后两边独立；网页版目录只读。跳过写下决定，关闭窗口不写决定。Safe Mode 不询问。已有桌面数据不询问 | 空的临时 `userData` 且本机 `~/.dsh` 像一份网页版家目录时，启动先到「发现网页版数据」。主按钮「导入并继续」，次按钮「从空白开始」 | `npm test -- test/shell/web-import-offer.test.ts`。2026-11-06 空临时目录选了「从空白开始」，只在临时目录写下 skipped，网页版标记文件没有变化 |
| 企业入口 | 官方没有这个站点入口 | macOS 应用菜单第三项「了解企业版」，打开 `https://dshdesktop.com/zh/enterprise/`。设置页底部同一文案，由 `dsh-desktop-client-ui` 挂出 | `npm test -- test/shell/enterprise-menu.test.ts test/enterprise-entry.test.ts`。2026-11-06 设置页底部看到该链接。系统菜单没有点开 |
| Office 与 PPT | 先接官方 Host 的 Office 组合。PPT 由产品层补：`dsh-ppt-composer`，工程目录仍是 `DSH_HOME/kimi-ppt`。Office 资源目录是 primary runtime 的上一级，CLI 在打包资源旁；开发目录 `.build/office-runtime` 仍使用 `build/office-cli.mjs`。Safe Mode 不挂这两项 | 空白会话输入区出现 PPT。普通会话的 Word、Excel 走 Office；开启 PPT 模式后使用选中的模板，不自动改回普通 Office 引擎 | `npm test -- test/shell/office-launch.test.ts test/host/run-profile.test.ts test/ppt-integration.test.ts test/office-runtime.test.mjs`。2026-11-06 窗口文字里有「PPT」，没有打开一份 Office 或 PPT 文档 |
| 启动修复页 | 不用官方 `DesktopFatalRecovery`。普通 profile 启动失败且错误点名已安装的第三方插件时，打开现有 `plugin-recovery.html`。这一页只停用这些插件并重启。修复代理、插件升级、卸载备份和应用回滚不在这一页 | 页面标题「启动遇到问题，DSH 暂时无法正常启动」。主按钮「停用并重启」。还可以「打开日志」「查看报错详情」「进入安全模式」「退出 DSH Desktop」。「查看修复方案」列出将停用的插件；有操作记录时一并列出 | `npm test -- test/shell/startup-recovery.test.ts test/shell/plugin-operations.test.ts`。没有在真实窗口里制造一次第三方插件启动失败 |
| Safe Mode 管理页 | 官方 Safe Mode 不载入这套产品页。新壳用现有 `safe-mode.html` 盖住整个窗口，包括侧边栏，管理普通 `desktop` profile 的第三方插件 | 菜单「以安全模式重启…」，或启动失败对话框里的同一次重启。页上可以「停用所选插件」、重新启用、「一键升级」、打开或恢复或删除卸载备份，再「重启并验证」退出。已经在 Safe Mode 时菜单不再显示这一项。Safe Mode 自己的启动失败仍是短对话框 | `npm test -- test/shell/safe-mode-manager.test.ts test/safe-mode.test.ts`。窗口还没点停用、升级或恢复备份 |
| 修复代理 | 官方没有这套维修会话。草稿放进输入框，不会自动发送 | 侧边栏「进入维修模式」。Safe Mode 页也可以打开。启动修复页若点到维修，会提示等重启后从侧边栏或 Safe Mode 页进入 | `npm test -- test/shell/repair-session.test.ts test/repair-agent.test.ts test/repair-drafts.test.ts test/repair-navigation.test.ts`。窗口还没打开维修会话 |
| 鲸鱼启动页 | 不使用官方欢迎窗。Host 就绪前显示现有 `build/splash.html` | 启动先看到标题「DSH Desktop」的鲸鱼页，随后进入 `dsh-app://app/`。网页版导入询问会暂时盖住它，决定之后回到鲸鱼页 | `npm test -- test/shell/splash-page.test.ts`。2026-11-06 窗口导航先是 `splash.html`，随后才是应用页。没有截图 |
| 产品补丁 | 官方 `desktop` profile 会带上产品分析、账号页和官方品牌。新壳在启动 Host 前写 `desktop-product.patch.yml`，关掉 `desktop-product-telemetry`、`product-analytics`、`ui-settings-account`、`ui-brand-official`，把 `deepseek-account` 的 `desktopPlatform` 留空，并挂上 `dsh-desktop-client-ui`。用量页和充值页不接收账号会话 | 普通启动后侧边栏是产品品牌，设置里没有官方账号页。Safe Mode 仍保留这份账号和品牌覆盖，但不挂工作台、市场、Office 和 PPT | `npm test -- test/host/run-profile.test.ts`。2026-11-06 窗口没有登录页 |
| 窗口装饰与文件夹面板 | 官方标题栏会把侧边栏收起按钮挤到下一行。macOS 使用 `hiddenInset`，红绿灯画在侧边栏那一行。添加工作区用应用自己的文件夹面板，标题跟随桌面语言，不用只有英文界面的 `osascript` | macOS 上关闭按钮与侧边栏收起按钮同一行。添加工作区时面板标题是「选择工作区目录」 | `npm test -- test/shell/window-chrome.test.ts`。窗口还没单独核对红绿灯位置 |
| 已记住的会话 | 官方界面靠 `desktop-storage.json` 打开已记住的会话。新壳在页面脚本之前把当前 profile 的这份存储交给 `localStorage`，避免在已有工作区新建空会话 | 用带会话的 profile 副本启动后，标题应是已有会话，而不是新建空会话 | `npm test -- test/shell/desktop-storage-bridge.test.ts`。2026-11-06 用未启动过的正式 Profile 副本启动，标题是「你好 — DeepSeek Harness」，44 个会话文件新增 0、改动 0 |

## 改动

这些模块按官方文件移植，行为差异登记在 `upstream-baseline.json`。

| 功能 | 相对官方 | 使用路径 | 测试 |
| --- | --- | --- | --- |
| 致命失败 | 不弹出官方 `DesktopFatalRecovery`，也不整批禁用第三方插件。先写入调用方传入的 `DSH_HOME/fatal-report.json`，抹掉 `token` 查询参数，进程退出前等这份报告写完。能点名的第三方插件进入上一节的启动修复页；其它失败是一条不含认证参数的短对话框，并写出崩溃日志路径 | 制造一次非插件启动失败后，临时 `harness/fatal-report.json` 存在，短对话框不含 `token` | `npm test -- test/recovery/fatal-entry.test.ts`。该测试同时确认壳不引用官方恢复对话框、更新目录和旧入口。窗口还没看到带日志路径的短对话框 |
| 快捷键 | 偏好写在 `userData/keybindings.json`。页面标记 `data-platform`，不标记网页快捷键。侧边栏浏览器客人可以接收匹配的快捷键。没有强制更新遮罩，所以不按遮罩挡住按键。文件菜单跟在应用菜单后面 | 应用内快捷键设置会写入上面的文件。macOS「文件」菜单有「关闭页面或窗口」 | `npm test -- test/shell/keyboard.test.ts`。2026-11-06 窗口文档上没有快捷键标记，没有在窗口里改一次快捷键 |
| 侧边栏浏览器 | 不另写官方 `browser-guests`。沿用现有客人策略：每个工作区一个隔离分区，不能打开 Harness 端口，也不能下载或要权限 | 应用页里由官方侧边栏浏览器发起打开网页时，壳创建隔离 webview。匹配的快捷键送到已打开的浏览器页 | `npm test -- test/sidebar-browser.test.ts`。2026-11-06 窗口里侧边栏浏览器框架数量是 0，没有打开一个网页 |
| 文件拖放 | 页面只能拖出 Host 授权过的会话文件，或壳写下的临时副本。渲染进程不能直接提交本机路径。会话地址解析经过 `src/host/upstream-api.ts` | 在会话里拖出一个已授权的文件到桌面。未授权的本机路径不会被打开 | `npm test -- test/shell/file-drag.test.ts`。窗口还没拖过文件 |
| 崩溃记录 | 报告正文先抹掉 `token` 查询参数。写完后按 64 KiB 和 500 毫秒上限，把 `userData/plugin-operations` 里的最近操作附进同一份 `crash-*.log`。已取消的收集不会启动。恢复页本身不改，记录也不外发 | 致命失败后到应用日志目录找 `crash-*.log`。短对话框会写出这份路径 | `npm test -- test/shell/crash-report.test.ts`。窗口还没产生一条真实崩溃日志 |
| 插件操作记录 | 官方写到自己的数据目录。新壳由调用方决定目录，实际是 `userData/plugin-operations`。Host 订阅管理事件后经 IPC 交给壳。恢复页读取最近记录；没有记录时页面照常显示 | 做一次插件启停或升级后，查看 `plugin-operations/`。启动修复页的「查看修复方案」列出最近记录 | `npm test -- test/shell/plugin-operations.test.ts test/host/run-profile.test.ts`。窗口还没看到一条真实操作记录 |
| macOS 应用菜单 | 官方菜单含欢迎、账号和官方更新。新壳前三项依次是「关于 DSH Desktop」「检查更新…」「了解企业版」。普通启动下一项是「以安全模式重启…」。手机配对和修复代理不放进这个菜单。应用页的关于使用现有对话框；启动页等其它页面使用系统对话框 | 点左上角应用名。关于在 `dsh-app://app/` 上打开产品对话框；在鲸鱼页上打开系统对话框 | `npm test -- test/shell/enterprise-menu.test.ts`。窗口还没点开系统菜单 |
| Host 进程 | 继续用 `ELECTRON_RUN_AS_NODE`，这次没有把新壳改成 macOS UtilityProcess。启动时设置 `DSH_HOME`，不把标准输出接到父进程。不安装官方更新任务。启动后把插件操作事件交给壳，并响应壳的文件拖放授权。`DSH_DESKTOP_PATCH_FILE` 指向的补丁会附加到 `runProfile` | 临时 `userData/harness` 被创建。`~/.dsh` 的修改时间不应变化 | `npm test -- test/host/run-profile.test.ts test/shell/quit-steps.test.ts`。macOS 隐私权限归属没有实测 |
| 启动注入 | Host 尚未给出认证 Cookie 时，应用请求返回 503。Host 离开就绪后清掉这一次的启动注入和 Cookie。页面再取启动数据时拿不到上一次的注入，失败的刷新也不会把已经离开的注入交回去 | 后端重启后，页面应只看到新的一套启动注入 | `npm test -- test/shell/boot-session.test.ts`。窗口还没重启过 Host |
| 登录 shell 环境 | 从访达或开始菜单打开时，补上终端配置里的 `PATH`。macOS 和 Linux 在第一次启动 Host 前读一次账号记录里的 login shell。Windows 使用已经继承的注册表环境，不跑 PowerShell。`DSH_*` 和 `ELECTRON_*` 保持桌面进程的值。这不是账号登录 | 从访达打开后，Host 能找到 Homebrew、mise 或 nvm 安装的命令。终端里启动看不出差别。失败时应用仍会启动，日志只写 shell 路径和失败原因 | `npm test -- test/shell/login-shell-environment.test.ts`。还没有从访达启动后核对一次真实 `PATH` |

## 启动恢复

这四项相对官方已经存在。正式壳从 `src/main/shell/stability-session.ts` 调用，纯判断和对话框仍然分开，避免不碰窗口的测试带上 Electron。

| 功能 | 相对官方 | 使用路径 | 测试 |
| --- | --- | --- | --- |
| 启动配置恢复 | 官方没有这套原生对话框。纯判断在 `src/main/recovery/startup-config-recovery.ts`，对话框在 `src/main/startup-config-recovery.ts` | Host 进入错误后、插件恢复页或短对话框之前。能修复就备份并重新启动 Host；点「返回」才继续原来的失败处理。Safe Mode 没有插件恢复页，放弃修复后仍是短对话框 | `npm test -- test/startup-config-recovery.test.ts test/shell/stability-session.test.ts` |
| 关闭后留在后台 | 不接官方托盘。只在 Windows 上、且用户不是在退出时，关闭窗口后继续运行。托盘可以显示窗口或退出 | Windows 上关掉窗口，进程仍在；从托盘退出则结束。再次打开应用会显示原来的窗口 | `npm test -- test/close-to-tray.test.ts test/shell/stability-session.test.ts` |
| 进程恢复与渲染重试 | 进程恢复管退出证据、GPU 探测和恢复提示；主窗口恢复管渲染导航丢失后的重试。上一份图形模式写在 `userData/gpu-fallback.json`，下次启动在 Chromium 起来之前生效 | 窗口进程异常、内存耗尽，或图形恢复用尽时出现重启或退出提示。页面加载失败或渲染进程退出时，同一地址最多重试 3 次 | `npm test -- test/stability-protection.test.ts test/main-window-recovery.test.ts test/shell/stability-session.test.ts` |

## 留到最后重写

桌面通知不在阶段 3 接到新壳。现有实现留在 `src/main/desktop-notification.ts` 和 `src/preload/desktop-notification.ts`，正式壳没有调用。不支持通知的环境会直接跳过。`npm test -- test/desktop-notification.test.ts` 覆盖这份模块。其余壳层功能做完后重写，不把这份桥原样搬进新壳。

## 不再移植的旧壳补丁

Windows 的 PowerShell profile 捕获和子进程隐藏是旧壳为修 bug 写的。官方框架已经修好，正式壳不处理，也不拆成 `windows-powershell-environment.ts` 或 `windows-child-process.ts`。这些入口已经随旧壳删除。市场安装器自己的 Windows 隐藏控制台仍留在 `packages/dsh-desktop-market-installer`。

## 阶段 3 明确不接

这些官方文件在 `upstream-baseline.json` 的 `skipped` 里。窗口里不应出现对应界面。

| 官方能力 | 使用时应当看到 | 测试 |
| --- | --- | --- |
| 强制更新遮罩 | 没有必须升级才能继续使用的窗口 | `npm test -- test/recovery/fatal-entry.test.ts` 确认壳不引用 `mandatory-update` |
| 官方更新流程 | 没有官方更新通道、更新窗和检查节奏。检查更新走上一节的产品更新 | 同上，并跑更新测试 |
| 欢迎窗、账号登录、`dsh` 命令注册 | 没有欢迎窗，没有账号页，不注册 `dsh` 命令 | 产品补丁测试；2026-11-06 窗口没有登录页 |
| 飞书测试鉴权 | 安装包里没有官方内部飞书登录 | 基线 `skipped`，没有单独的窗口步骤 |
| 产品分析 | 不接入已发布的 `dsh-client-product-analytics`。补丁把它和 `desktop-product-telemetry` 关掉 | `npm test -- test/host/run-profile.test.ts` |

依赖方向由 `npx vitest run test/verify/import-direction.test.ts` 检查：Host 不导入 Electron 或主进程，`recovery/fatal-entry.ts` 不导入 Electron 或壳窗口，壳可以导入更新、恢复入口和侧边栏浏览器，不导入 `src/main/index.ts` 和强制更新。它随 `npm test` 执行。

## 不是功能的基线差异

`upstream-baseline.json` 的 `divergences` 里还有一类只改写法、不改变上面使用路径的差异：静态路径拒绝 `..`、反斜杠和编码斜线；请求字段用属性读取，不用类型断言；文件句柄用 `try/finally` 关闭；不增加 zod；操作记录 Worker 由壳构建单独产出 `operation-report-worker.js`。这些留在基线里，不另走一条用户路径。

## 现在还不能当成通过

第 8 章要求这些窗口路径都走过，目前还没有：

- 用一份旧版数据副本升级，并在真实窗口里中断一次迁移。
- 真实窗口里打开快捷键、侧边栏浏览器、文件拖放，并制造一条崩溃日志。
- 真实窗口里制造第三方插件启动失败，再点停用、还原和修复代理。
- 安装或回滚一个真实市场插件，打开配对页、PPT 或 Office 文档。
- 在已安装的包上走完同意后下载、跳过一个版本和回滚。
- macOS 隐私权限归属，以及 Windows 的路径、junction、安装和卸载。PowerShell profile 捕获和子进程隐藏不在这条里。
- 桌面通知留到最后重写，现在没有接到新壳。启动配置对话框、关闭留在后台、进程恢复和渲染重试已经接到新壳，真实窗口还没走过。
