# DSH Desktop 代码规范设计说明

## 设计出发点：桌面宿主的风险与边界

DSH Desktop 的主要工程问题来自 Electron 特权边界、Harness 子进程与插件生命周期、用户本地数据、上游兼容和原生安装包。规范按这些问题组织，每条硬约束应能指出要保护的边界及验证方法。

| Desktop 特性 | 需要约束的行为 | 验证重点 |
| --- | --- | --- |
| Electron main / preload / Web UI 分进程 | 最小权限 IPC、可序列化契约、来源及参数校验 | 合法请求与拒绝路径，真实窗口行为 |
| Harness 独立进程、托盘和多实例 | 生命周期清晰、启动幂等、退出清理、主进程不阻塞 | 重启、退出、唤醒及重复事件 |
| Profile 与插件落在用户磁盘 | 有边界的写入、原子切换、失败恢复、保留旧状态 | 安装中断、迁移回滚、文件占用 |
| 上游 Web UI + 宿主插件 + patch | 优先扩展点、保留加载协议、补丁可重放 | 干净安装、真实加载、上游升级兼容 |
| 流式会话与长期运行窗口 | observer/订阅有界，异步结果不过期回写 | 长会话、热重载、隐藏窗口 |
| macOS / Windows 原生分发 | 路径、进程、资源位置及签名按目标平台验证 | 安装包内实际文件和实际启动流程 |
| 多种 UI 承载方式 | Harness 界面复用主题与 locale，恢复页独立可用 | 中英文、深浅主题、Harness 启动失败 |

## 从 Bisheng 取什么、舍什么

已参考 Bisheng 根目录及 frontend platform/client/ui 的 AGENTS、ESLint 配置和质量 workflow。只借鉴三项治理方法：规则分层且单处维护、可检查规则交给工具、存量问题逐步收敛。

具体技术规则由本仓库推导：

- 不采用统一 600 行上限；按独立职责、状态和清理流程决定拆分，避免为行数打散生命周期。
- 不强制纯 TS/TSX；`src/` 保持 strict TS，插件及运行时入口保留当前 JS/MJS 加载方式。
- 不引入 SPA 的目录层级、HTTP/store 框架、路由别名或组件库。不自建第三套主题 token：Harness 内插件只复用 `--dsw-alias-*`，独立恢复页用自有语义变量。IPC 和插件请求各自约束，不强行抽成同一种服务层。
- 不引入三语要求、全局禁中文或英文注释硬门禁；插件文案走 `ctx.locale`，中英文 key 同批维护，词典和展示逻辑分离。
- 不沿用其他浏览器环境的磨砂效果禁令；围绕流式会话、长期驻留、隐藏窗口和目标机器的实测成本约束性能。
- 不复制专用 skill、固定审批阶段或全套历史豁免机制；先看本仓库实际问题规模，再选最小可用工具方案。

## 本次审阅发现的现状

依据当前 worktree（起点 `f7aebb5`）静态检查，以下是本次快照，不是永久基线：

- `src/main/index.ts` 2,931 行、`src/preload/index.ts` 1,186 行、market installer `client.js` 717 行。首要维护性问题是职责集中，单纯格式化不能解决。
- 根 `tsconfig.json` 已启用 strict 和 `noUncheckedIndexedAccess`。`tsconfig.node.json` 未包含插件 JS、脚本及 HTML 内嵌代码。
- `package.json` 有 test/typecheck/build，无 lint/format 检查脚本。当前 release workflow 有原生平台测试、类型检查和打包流程；没有独立的 lint 门禁。
- 桌面 UI 同时存在 Harness loader 插件、preload DOM 注入和独立 HTML。不能用一套 SPA 检查配置假设所有文件拥有相同 globals、模块格式和主题环境。
- `packages/dsh-desktop-enterprise` 与 `src/main/enterprise/` 已是完整企业登录面，但主题用 `--ds-*`、文案用 `navigator.language` 内联 `copy`。规范将其标为待迁移存量，不在本次整改代码。
- `docs/development.md` 的固定 Harness 版本描述与当前依赖不一致；因此规范引用配置作为事实源，不在每份 AGENTS 中复制版本号。

## 规则分层

根 `AGENTS.md` 放项目定位、目录导航、通用编码和交付要求。main 放进程/权限/数据生命周期（含 `enterprise/`）；preload 放桥接、slot 与 DOM 注入判定；packages 放模块加载、UI 插件、主题/locale 硬约束、编译型包与 generation；patches 放上游补丁维护；build 放独立页面和打包输入。

本说明解释取舍和后续工具计划，不复制具体硬规则。暂不增加独立 constitution：当前模块规模下多一份重复法律文件更易漂移。若未来根规范显著膨胀，再抽取稳定架构原则并仅保留链接。

## 工具落地顺序（以下均为待实施）

### 第一阶段：可复现的质量门禁

1. 增加 ESLint 配置，分别设置 TS main/shared、preload browser+Electron、插件 client loader、Node JS/MJS 的运行环境。只对 React 代码启用 Hooks 检查；loader factory 的 `require` 不能被误判为任意 CommonJS 引入。
2. 优先检查未定义变量、无用变量、无理由 any/TS 忽略、Hooks 规则和危险跨层 import。增加 shared 不依赖特权实现、preload 不引入业务文件操作的边界检查；允许例外按具体文件和 API 限定。
3. 格式检查单独落地。排除第三方 tgz、patch diff、生成资源、构建输出；`build/` 的手写入口和页面不能整目录忽略。首次格式整理独立提交。
4. 在 PR workflow 接入 lint + 当前 typecheck/test/build，校验本地命令和 CI 一致；保护分支所需检查状态需另行核实配置。

### 第二阶段：存量基线与覆盖扩展

- 先扫描新增规则的真实违规量；少量问题直接修复。只有存量较大且不能随工具接入安全修复时，才建立文件/规则级基线并阻止增长，修复后裁剪豁免。不要预先复制一套复杂 suppression 系统。
- 新文件严格检查；被修改逻辑不新增违规。历史大文件的小修复不强制清理全文件，但新增职责不能继续塞入入口。
- 插件 JS 逐包评估 `checkJs`/独立 tsconfig 或专用类型验证；先处理真实导出和 loader 环境，不通过大面积 `any` 制造通过结果。
- 为中英文词典补 key parity 检查，独立 HTML 补充脚本/模板安全检查。中文词典本身合法，不能简单用“含汉字即报错”扫描所有代码。
- 超长模块作为重构线索，评审检查是否混合多个生命周期和副作用；不把行数设为 CI 硬门禁。迁移成果以清晰边界及回归行为评估。

### 第三阶段：按风险补真实验收

| 改动 | 所需证据 |
| --- | --- |
| 纯文案、样式 | 对应页面中英文、深浅主题及必要交互 |
| IPC / 权限 | 参数与来源拒绝测试，真实 Electron 允许/拒绝路径 |
| Profile / generation | 临时目录失败恢复、重复执行、实际活动链接和加载验证 |
| 上游 patch / 插件 loader | 干净安装重放、真实加载及受影响用户流程 |
| Windows 路径 / 子进程 | Windows 测试与对应安装包 smoke |
| 正式 release | 按 runbook 核实 SHA/tag、各目标产物、签名和发布状态 |

本次仅交付规则文档，未安装 lint 工具、生成存量豁免、修改 CI、拆分代码或执行应用验收。工具接入应另做范围明确的变更，不能把此文档作为门禁已启用的证据。
