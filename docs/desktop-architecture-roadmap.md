# Desktop 架构继续改造计划

本文记录 Harness 0.1.7 底座合入之后，Desktop 在 Windows 运行时、打包、插件加载和恢复几条线上还剩哪些改造，按什么顺序做，每一步怎么验收。计划以 `main` 的 `eec5d57e65`（已合入 #570，Harness `0.1.7-rc.2`）为起点，同时参考 `v0.10.0` 分支上的 #583。

stable / beta 双通道，以及 Profile checkpoint 与 last-known-good 自动回退，不在本计划范围内。启动失败继续由现有的 Recovery 页、Safe Mode 和修复 Agent 处理。

## 目标

对照官方 `deepseek-harness` 的 `apps/desktop`（dsh-v0.1.7-rc.2）和社区 anywhere-labs/dsh-desktop 的对比结论，Desktop 要解决三个用户可见问题：

1. Windows 杀软把随包的独立 `node.exe` 当成可疑程序。
2. 安装包和 Profile 里文件太多，安装、升级和启动都慢。
3. 插件的安装和回退机制不稳，是启动失败的主要来源。

架构目标保持不变：保留 Desktop 自己的 Electron 壳和产品能力（市场、Recovery、Safe Mode、手机桥、更新与灰度），运行时契约对齐官方，Windows 打包参照官方做法。

## 现状

| 项 | 状态 | 依据 |
| --- | --- | --- |
| 安装器去掉 Defender 排除、HKLM 写入和提权 | 已完成（main） | `build/installer.nsh` |
| 按 PE 内容扫描签名，任一步失败即阻断发布 | 已完成（main） | `scripts/sign-windows-unpacked.mjs`、`release.yml` |
| 最终签名安装包 smoke | 已完成（main） | `scripts/smoke-signed-windows-installer.ps1` |
| 更新验签（`verifyUpdateCodeSignature` + publisherName） | 已完成（main） | `package.json` build 段 |
| 暂存、同卷改名、失败回滚的目录安装 | 已完成（main） | `build/installer-directories.nsh`、`scripts/windows-directory-installer.mjs` |
| 去掉 `profiles/node_modules` 闭包 junction | 已完成（main，随 0.1.7） | `@deepseek-ai/dsh-app-boot@0.1.7-rc.2` |
| plugin-manager 走 generation 后端 | 已完成（main） | `patches/@deepseek-ai+dsh-plugin-manager+0.1.7-rc.2.patch`、`packages/dsh-desktop-market-installer/generations/package-backend.mjs` |
| Windows 去掉独立 `node.exe`，改用 Electron RunAsNode | 在 `v0.10.0`（#583），**未进 main** | #583 |
| Harness 运行时进 asar | 未完成。`asarUnpack: node_modules/**/*`，只有应用 shell 在 asar 里，#583 记录解包文件约 21,210 个 | `package.json` build 段 |
| 按平台裁剪运行时文件、生成运行时清单 | 未完成。只排除了 `*.map`、`*.d.ts` | `package.json` build 段 |
| 删除 `@deepseek-ai/*` 宿主回退钩子 | 未完成。`build/harness-node-entry.mjs` 仍注册 `host-module-fallback.mjs` | — |
| 补丁数量 | 27 个，约 4,900 行 | `patches/` |

## 阶段 1：落地 RunAsNode，并收掉随包 Node

问题 1 的主体。依赖：无。

1. **把 #583 带进 main。** 随 `v0.10.0` 合回，或单独 cherry-pick。合入后 Windows 包里不应再有 `node_modules/node/bin/node.exe`，`.desktop-bin` 下的 `node.cmd` 和 `pnpm.cmd` 带 `ELECTRON_RUN_AS_NODE=1` 转发到应用 exe。
2. **把 Electron 版本约束写成门禁。** #583 锁定 Electron `43.0.0`，因为 `node-addon-require-builtin@0.1.6` 不接受 43.4.0。在打包前增加检查：当前 Electron 版本是否在该 loader 支持的范围内，不在就让构建失败，而不是等到 Harness 启动时才发现。升级 Electron 或 loader 都要重新跑 Windows 打包和签名安装 smoke。
3. **核对 `ELECTRON_RUN_AS_NODE` 的传播范围。** `build/harness-node-entry.mjs` 在 Harness 进程里设置了这个变量，Harness 起的子进程都会继承，包括 Agent 终端命令。确认从 Agent 终端启动其他 Electron 应用（IDE、聊天客户端）时的行为；如果会被当成 Node 运行，只在需要 Node 模式的子进程上设置，其余剔除。补一个真实子进程回归。
4. **macOS 也去掉随包 Node。** Harness 已经跑在 utilityProcess 里。剩下的依赖是 `.desktop-bin` 里的 `node`/`pnpm` shim、Profile 修复命令和 `harness-runtime.ts` 启动前的存在性检查。shim 改为以 RunAsNode 转发到应用可执行文件，删掉 `node` 运行时依赖。需要确认公证后的应用在 Node 模式下能执行 pnpm 和插件生命周期脚本，并避开 LaunchAgent 继承 `process.execPath` 导致抢焦点的历史问题。

验收：

- Windows 与 macOS 安装包中都没有独立 Node 可执行文件。
- 插件安装、卸载、Profile 修复、插件生命周期脚本在两个平台的已安装应用里可用。
- 没有安装系统 Node 的干净 Windows 机器上，安装、首次启动、同路径升级通过。
- 至少一台开启 Defender 的 Windows 机器上，安装和首次启动不触发告警。

## 阶段 2：精简运行时，把 Harness 放进 asar

问题 2 的安装侧。依赖：阶段 1（外部 `node.exe` 读不了 asar，RunAsNode 和 utilityProcess 可以）。

1. **生产运行时单独物化。** 参照官方 `prepare-dsh.ts` 和 `runtime-file-policy.ts`：在临时目录只安装生产依赖，按目标平台裁掉其他平台的原生产物（例如 node-pty 的 darwin/linux/win32-arm64 prebuild、`@electron-internal/extract-zip` 的其他平台二进制）、调试符号、测试夹具和声明文件。
2. **生成运行时清单。** 记录版本、Electron/Node 版本、平台、文件列表和哈希。打包时校验清单；启动只读取元数据，不遍历文件。
3. **盘点需要物理路径的消费者。** 至少包括：pnpm 入口、原生 `.node`/exe/dll（koffi、node-pty 的 `OpenConsole.exe`/`conpty.dll`、`node-addon-require-builtin`、sharp）、generation 安装后的宿主单例校验、PPT 运行时、Safe Mode 宿主 anchor、插件子进程按路径读取的宿主文件。逐项确定放进 asar 还是解包。
4. **Harness 运行时进 asar。** `asarUnpack` 从 `node_modules/**/*` 收窄为第 3 步确定的集合，外加按内容扫描出的全部 PE 文件。打包后逐字节比对解包文件与准备目录。
5. **重新评估 `compression: maximum`。** 文件数下降后，用安装耗时和安装包体积两个数字决定是否保留。

验收：

- 记录 Windows 包的解包文件数（改造前约 21,210）、安装包体积、干净安装与同路径升级耗时，改造前后对比写进 PR。
- AGENTS.md 加载链路清单全部通过：安装包内置插件、普通市场插件、本地软链接插件、缺少宿主 peer、插件自带普通依赖、Safe Mode 无 `profiles/node_modules`。
- 签名安装包 smoke 和 Windows 实机安装、升级通过。

## 阶段 3：简化插件加载与安装事务

问题 3 的剩余部分。依赖：无，可与阶段 1、2 并行。

1. **删除宿主回退钩子。** 0.1.7 的运行时解析按插件的 peer 声明直接给出宿主实例。先用回归覆盖 `host-module-fallback.mjs` 当前处理的三类场景：本地链接插件、宿主包不在闭包里、`profiles/node_modules` 残留旧副本缺少子路径。全部通过后删除该钩子，并评估 `dsh-app-boot` 中传递宿主 anchor 的补丁能否一起删。
2. **清理旧版本留下的共享链接。** 0.1.7 只删除 `.dsh-module-fallback` 投影，不删除旧版本在 `$DSH_HOME/profiles/node_modules` 里建的 junction。在启动维护中做一次性迁移：只删除指向 Desktop 安装目录的自有链接，保留其他内容，失败记录原因并继续启动。
3. **收敛 generation 的每插件 junction。** 现在每个市场插件在 `profiles/web/node_modules/<插件>` 有一个指向 `.generations/<id>` 的 junction。给创建和切换加有界重试与明确诊断（EPERM/EBUSY 时指出占用方），并评估改为运行时解析的 linked root 注册、不再建链接的可行性。
4. **明确插件版本策略。** main 通过补丁把“声明的 Harness 版本不兼容”从拒绝改为告警。保留告警可以，但要让 Recovery 页能把“版本不兼容”作为启动失败的候选原因展示出来，并写清什么情况下仍然拒绝加载。
5. **固化市场约束。** dshmarket 已不在运行时依赖里。增加打包门禁：任何可由市场或用户升级的 bundle 出现在安装包依赖中时构建失败，避免 `resolveBundleDir` 安装目录优先带来的遮蔽问题再次出现。
6. **统一插件状态与管理入口。** 官方 Plugins 页、dshmarket、Safe Mode/Recovery 和内置插件各自读写启停状态，语义不一致；例如官方页停用会从 `dsh.profile.bundles` 删除名称，而下次启动的 `healProfileBundles()` 又会把它加回。按 [插件状态与管理入口统一方案](plugin-management-unification-plan.md) 先统一状态语义和旧数据迁移，再把各入口的安装、启停、卸载接到同一个管理服务。市场层保留 dshmarket 作为发现入口。

验收：

- 真实 Harness 子进程加临时 Profile 的回归覆盖正常、缺包和错误路径（`test/harness-node-entry.test.ts`、`test/plugin-startup-failure.test.ts`、`test/safe-mode-host-resolved.test.ts`、`test/desktop-plugin-closure.test.ts` 等）。
- Windows 实机验证：旧版本升级上来的 Profile 能启动，旧共享链接被清理，插件升级时目标插件文件被占用的场景不会留下半安装状态。

## 阶段 4：补丁与主进程瘦身

依赖：阶段 3 之后收益最大。

1. **补丁分类。** 对 27 个补丁逐个标记为：可提交上游、可改为 slot 或宿主插件、必须保留。优先处理最大的两个：`dsh-api-session-controller`（约 1,229 行）和 `dsh-client-ui-settings-models`（约 909 行）。每个“必须保留”的补丁写明对应的上游接口缺口。
2. **主进程拆分。** `src/main/index.ts`（约 3,700 行）按职责拆出 Harness 运行时编排、窗口与导航、IPC 注册、更新和手机桥的装配代码，入口只负责组装。按 AGENTS.md，拆分单独成 PR，不与行为修改混合。

验收：补丁数量和行数、`index.ts` 行数在每个 PR 描述中记录变化；完整回归和打包 smoke 通过。

## 阶段 5：插件体积与前端加载

问题 2 的 Profile 侧与首屏。依赖：无。

1. **市场体积提示。** 安装前展示插件包体积和文件数，超过阈值时提示；阈值根据现有市场插件分布确定。
2. **插件前端分块指引。** 在插件编写契约中要求大体积的客户端代码用 `require.async` 分块，只把首屏必需的部分放进 `lib/client.js`。
3. **向上游提延后加载档。** `dsh-client-ui-sidebar-documentpreview` 单个客户端包约 6.9 MB，占首屏合包的大部分。向上游提案为 `dsh-client-modules` 增加延后加载阶段，不在 Desktop 侧改变引导顺序。
4. **Profile 内遗留的 pnpm store。** 已观察到 Profile 目录里有一份不再被 `.npmrc` 引用的 `.pnpm-store`（开发机上约 1.3 GB、2.7 万个文件）。先通过诊断上报确认用户机器上的普遍程度，再决定是否在启动维护中清理。

验收：记录首屏合包体积、首次绘制时间和 Profile 目录文件数的变化。

## 顺序

```text
阶段 1（RunAsNode 落地） ──► 阶段 2（运行时进 asar）
阶段 3（插件加载与事务）  ──► 阶段 4（补丁与主进程瘦身）
阶段 5（插件体积与前端）    独立
```

每个阶段拆成可单独发布、可单独回退的 PR。涉及启动、打包、安装和 Windows 路径的 PR，交付说明必须列出已验证和未验证的阶段，Windows 行为以 Windows 实机或签名安装包 smoke 为准。

## 参考

- 官方：`deepseek-ai/deepseek-harness` 的 `apps/desktop`（dsh-v0.1.7-rc.2），特别是 `scripts/electron-builder-config.mjs`、`scripts/prepare-dsh.ts`、`scripts/runtime-file-policy.ts`、`scripts/windows-asar-unpack.mjs`，以及 `.agents/notes/implemented/architecture/` 下的桌面运行时与 Windows 安装决策记录。
- 本仓库：`docs/dsh-0.1.7-baseline.md`、`docs/baseline-runtime-compatibility.md`、`docs/patch-compatibility-review-0.1.7.md`、`docs/patch-plugin-contract.md`。
