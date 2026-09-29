# 插件状态与管理入口统一方案

> 本文在 `v0.10.0` 上审查，其中“工作台市场”（`packages/dsh-desktop-workbenches`）目前只存在于 `v0.10.0`；在 `main` 上实施时，该入口相关的步骤随 `v0.10.0` 合入后再执行。整体改造顺序见 [Desktop 架构继续改造计划](desktop-architecture-roadmap.md) 阶段 3。

核对基线：隔离 worktree 的 `bee91223a9`，并核对远端 `origin/v0.10.0` 的 `ed2dc8d6e2` 增量（Windows Electron Node 切换，未改本文涉及的管理入口与状态文件），2026-09-28。本文是源码审查与实施方案，尚未改动运行逻辑；不包含 stable/beta 隔离或健康版本自动回退。

## 审查结论

当前已经有官方 `@deepseek-ai/dsh-plugin-manager@0.1.7-rc.2`、其 Plugins 页面，以及 Desktop 为它提供的 generation package backend。问题在于页面和各市场没有共用一套状态语义与操作入口。

| 入口 | 安装/卸载 | 启停或状态来源 | 主要不一致 |
| --- | --- | --- | --- |
| 官方 Plugins 页面、CLI、Agent | `pluginManager.installBundle/removeBundle`；Desktop 补丁把包操作转到 generation backend | `listBundles` 读 Profile manifest，`setBundleEnabled` 改 `dsh.profile.bundles`；`setPluginEnabled` 改用户 patch | 只看 manifest 会把市场禁用的包显示为启用；运行中无 HMR 的卸载可能被 `stop-profile` 拒绝 |
| 第三方 dshmarket | `desktopPnpm.runExternalMarketPluginInstall/runPlugin` | 市场 `.dsh-market/state.json`、用户 patch，另有 generation `desired.json` | 市场操作绕开 manager 的结果、锁和状态事件；来源选取与取消语义不同 |
| 工作台市场 | `desktopPnpm.installWorkbenchGeneration/removeWorkbenchGeneration` | `market-installs.json`、工作台 `state.json`、运行时 provider | 市场记录表示来源和安装请求，不能证明 Profile 已选中或运行时已加载；移出工作台与卸载包是两种操作 |
| Safe Mode / Recovery | `removePluginSafely` 的 tombstone、备份与 generation pointer；市场包有独立移除 | `disableProfilePlugin` 写市场 state 和用户 patch | 正常页与离线恢复分别写状态；恢复需要继续具备启动前操作能力 |
| Desktop 内置插件（目前图片生成） | 随安装包分发，不经过 Profile 装包 | `desktop-host-plugins.json` 决定宿主插入；设置页经 preload IPC 操作 | 与 Profile 插件所有权不同，但应在统一列表展示，并标明不可卸载 |

当前最直接的冲突：`pluginManager.setBundleEnabled(name, false)` 从 Profile 的 `bundles` 删除名称；下一次启动的 `healProfileBundles()` 会把仍作为依赖安装的 bundle 自动加回，现有 `profile-consistency` 测试确认了这种行为。部分 generation 发布路径还会以 `syncBundles: true` 从 `desired.json` 重建 bundle 列表。`desired.json` 应表示已选中的安装版本，不能同时充当启用开关。市场 state 对加载器的禁用又会造成 manager 显示“启用”但运行时没有加载。

工作台总开关只控制工作台 UI 偏好，不是某个插件的启停；“从工作台移除”也不一定等于卸载插件。产品文案和 API 必须区分。

## 建议的目标模型

只保留一个面向用户的 **插件管理页**，以官方 Plugins 页为基础。普通市场和工作台市场保留发现、筛选、来源及完整性校验，但通过同一管理服务执行四种操作。市场卡片可显示同一状态并跳转到管理页；不要在市场内维护第二套已安装/已启用真相。第三方 dshmarket 如果无法改为只读目录与统一操作适配层，需要 fork 或换成自有目录界面；不能长期解析它的 pnpm argv 作为主协议。

统一状态按维度表达，而不是一个布尔值：

| 维度 | 权威来源 | 用户可见值 |
| --- | --- | --- |
| 安装 | Profile 依赖与 generation 当前版本；内置包取 Desktop 安装目录 | 未安装、已安装、安装失败 |
| 启用意图 | Profile `dsh.profile.bundles`；单条插件用用户 patch；宿主内置包仍由宿主状态管理 | 已启用、已停用、待重启生效 |
| 实际运行 | Harness loader/client inventory 和故障记录 | 运行中、未加载、加载失败、待重启 |
| 操作进度 | 同一操作 ID、日志和持久结果记录；卸载使用恢复 tombstone | 安装中、取消中、待移除、失败可重试 |
| 来源 | 市场及工作台 catalog 的来源记录，仅供展示与更新校验 | 市场、工作台、手动、本地、内置 |

同一个包只显示一张管理卡。工作台身份作为该卡的能力/来源属性；多个工作台可能共用一个 bundle 时，不得凭一个 catalog ID 卸载整个包。宿主内置包显示在同一列表，但不可卸载，也不伪装成 Profile bundle。

## 四项操作的统一合同

| 操作 | 顺序和落点 | 成功条件 |
| --- | --- | --- |
| 安装/更新 | catalog/手动 spec → `inspect`/校验版本、来源、完整性 → Profile 锁 → generation staging/peer 校验 → 发布版本指针 → 显式设置是否启用 | 返回已安装版本与 Profile 可见状态；加载成功另报，不能用 pnpm 退出码代替 |
| 关闭 | 在管理服务里修改启用意图，不删除包或 generation；可 HMR 则卸载，不能则待重启 | 同一列表显示停用或待重启；重启后不得被自动修复重新启用 |
| 打开 | 检查 bundle、peer 和冲突，再修改启用意图；可 HMR 则加载，不能则待重启 | 重启或 HMR 后由实际 loader 证明运行中；失败保留安装和诊断 |
| 卸载 | 校验所有权和共享依赖 → 写恢复 tombstone/备份 → 取消启用 → 从 installed pointer 移除 → 冷启动后清理已确认不再引用的文件 | 明确区分待移除、已从 Profile 消失、文件清理完成；用户数据按现有恢复合同保留 |

## 实施次序

1. **先修状态语义。** 将 `desired.json` 解释为当前安装版本指针，`bundles` 解释为启用意图；停止 `healProfileBundles()` 对明确停用包的自动启用，替换其测试。审计并改造所有 `syncBundles: true` 路径。对旧 Profile 做一次有记录的迁移：读取市场 disabled、用户 patch、内置状态和 generation pointer；冲突或损坏时保留原文件并进入可诊断状态，不猜测启用。
2. **把 manager 的读写接到同一状态服务。** 保留官方 Remote/UI 的 `listBundles`、`installBundle`、`setBundleEnabled`、`removeBundle`，用窄 patch/宿主 backend 完成 generation 与延迟卸载语义。manager 的 `package.json` 文件锁和 generation registry 锁必须有统一顺序；Safe Mode 使用同一状态服务的离线入口，不依赖运行中的 Harness。补持久 operation ID/结果查询：目前 `waitForInstall` 只保留进行中的请求。
3. **迁移自有工作台市场。** 保持 catalog 精确版本、npm integrity / Release SHA-256 与 Git commit 校验；改为 manager 操作后再写 `market-installs.json`。该文件只是来源映射。把“移出工作台”与“卸载插件”拆成明确动作；重启后按实际插件状态重新投影卡片。
4. **迁移社区市场。** 在兼容期让 dshmarket 仅负责目录和详情，安装/更新/启停/卸载交给 manager 适配层；若其公开协议不支持，fork 或替换目录界面。`dshmarket` 自身的安装与启动基线仍是受保护的宿主操作，直到不再依赖它。切换后删除 `desktopPnpm` 的重复普通插件写入接口与市场禁用双写。
5. **收敛 UI。** 官方 Plugins 页成为安装状态和管理主入口；市场展示同一状态，工作台只管理工作台身份。Safe Mode 保留离线恢复入口，但操作落到同一持久状态合同。内置插件在列表中标注宿主所有权与不可卸载。

## 验收与难度

先在隔离 Profile 做四操作 × 五入口（官方页、CLI/Agent、社区市场、工作台市场、Safe Mode）的状态矩阵；覆盖重启、取消、重复点击、安装失败、缺 peer、卸载失败及恢复、共享 bundle、旧 Profile 迁移。运行时验收须核对 Profile 文件、generation 指针、实际 loader/client 挂载与 UI 文案。Windows 再验证 junction、文件占用和最终打包应用。当前仅有源码审查与局部测试；没有完成这些实际验收。

难度：**高**。第一阶段状态语义和旧数据迁移风险最高；工作台市场可由我们直接改，属中等；第三方 dshmarket 取决于其扩展协议，可能需要 fork。建议先完成第 1、2 步，再切换任何用户可见入口。
