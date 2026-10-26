# Harness 0.2.1-rc.3 升级记录

## 范围与版本选择

Desktop 保持 `0.12.1`，本次将 Harness 从 `0.2.1-rc.2` 升至 `0.2.1-rc.3`。
审计时 npm 的 `latest` 标签仍指向 rc.2，较新的 rc.3 通过 `next` 标签发布；
因此明确固定 rc.3，不能以 `latest` 标签推断本次目标版本。
标签会变化，后续复查可用 `npm view @deepseek-ai/dsh dist-tags --json`。

- 根依赖中 219 个直接 DSH 固定版本统一为 rc.3。
- 锁文件中的 DSH 包条目由 303 增至 304，新增传递依赖
  `@deepseek-ai/dsh-client-ui-entry-customization`；没有删除 DSH 包。
- Office 宿主插件的八个精确 DSH peer 与本地锁元数据同步升至 rc.3。
- README 各语言版、开发基线及版本契约测试同步更新。
  [rc.2 升级记录](harness-0.2.1-rc.2-upgrade.md) 与
  [稳定性清单](0.12.1-stability-fix-checklist.md) 保留历史统计和当时的验收结论。

## 原始分发包与补丁审计

对照未应用 Desktop 补丁的 rc.2、rc.3 原始分发包，逐一检查全部 26 个 DSH 补丁的
66 个目标文件。14 个目标文件在十个包中存在上游变化，其余 52 个目标文件未变（比较时归一版本号）。
这是补丁目标范围内的比较，不代表整个 Harness 只有这些文件变化。

以下包名均省略 `@deepseek-ai/` 前缀，文件路径相对于对应分发包：

| 包 | 发生上游变化的补丁目标 |
| --- | --- |
| `dsh-api-remotes` | `lib/client.js` |
| `dsh-api-session-controller` | `lib/types/client/sessions/service.d.ts`（补充原生 New Session 复用说明） |
| `dsh-client-ui-agent-preset` | `lib/client.js` |
| `dsh-client-ui-conversation` | `lib/client.js`、`lib/types/client/contract/slots.d.ts` |
| `dsh-client-ui-primitives` | `lib/index.js` |
| `dsh-client-ui-settings-general` | `lib/client.js` |
| `dsh-client-ui-sidebar` | `lib/client.js`、`lib/types/client/contract/slots.d.ts`、`lib/types/client/index.d.ts` |
| `dsh-client-ui-workspace` | `lib/client.js`、`lib/types/client/navigation.d.ts` |
| `dsh-llm-deepseek` | `lib/index.js` |
| `dsh-client-modules` | `lib/index.js` |

审计未发现 rc.3 已提供足以替代现有 Desktop 定制的等价行为，因此保留这 26 个 DSH
补丁并针对 rc.3 重放/合并。另有五个非 DSH 补丁保持不变，补丁总数仍为 31。
补丁能应用只证明文本匹配；实际行为仍需下述运行时和 UI 验证。

主要合并边界：

- Sidebar 保留 rc.3 的 pins、More 菜单、公开 exports 和 analytics，叠加 Desktop
  quickSwitcher 与 V0.13.0 恢复入口的 settings/action 容器；同步声明及组件 props union，避免以旧实现覆盖新上游能力。
- Conversation 保留 rc.3 新增的 header menus、pinned views 及相应 CSS/类型，叠加
  Desktop hero/frame 定制。
- Workspace 保留 rc.3 draft mode 的 append 行为及原生复用，叠加 Desktop opener。
- 其他发生变化的目标以 rc.3 为基础保留 Desktop hunk；没有把整个旧文件替换回去。

相关维护规则见 [Patch 与 Plugin 规范](patch-plugin-contract.md)。最终补丁重放及行为
验证状态须以本次结果为准，不沿用 rc.2 的通过记录。

## 依赖锁与加载边界

安装解析曾带出 21 个无关第三方包条目变化，覆盖 AWS SDK 家族、OpenTelemetry、Smithy、
execa、jose、on-finished。恢复这些条目的完整原始锁记录前，按候选锁的解析位置检查
87 个传入 dependency、optionalDependency 和 peerDependency semver 约束，全部满足。
因此无需保留这些无关升级，版本、resolved、integrity 及关联元数据均保持原锁记录。

新增的外部约束为 DeepSeek LLM 的 `semver ^7.8.5`，以及新 UI 包的 Cordis
`~4.0.5`；现有锁版本已满足。Office 的精确 peer 与锁元数据一致。

此次没有改变 loader 解析规则、普通 Profile 与 Safe Mode 的解析 anchor，保留原始
缺包、父模块、加载阶段及 cause 诊断。普通 Profile 的宿主 peer fallback 边界和
Safe Mode 的宿主解析规则继续沿用现有契约；未增加通用安装目录 fallback。

## 验证结果与未完成验收

本 PR 基于 `V0.13.0`，不包含原适配分支继承的发布与工作台生命周期提交。Plugin Manager 沿用目标分支契约，侧栏合并保留其恢复入口的 `sidebar.settings.action` 与内容/操作容器。

下表记录基于 `V0.13.0` 的 macOS arm64 适配验证。旧文档的测试数量、安装产物与浏览器结果属于历史基线。

| 检查 | 当前状态 |
| --- | --- |
| 原始包目标对照、第三方锁 87 个约束检查 | 已完成 |
| `npm run typecheck` | 已通过（V0.13.0 移植后重新执行） |
| `node scripts/verify-target.mjs darwin arm64` | 已通过（V0.13.0 移植后重新执行） |
| 干净安装及 31 个补丁完整 postinstall | 已通过；品牌资源与 Electron postinstall 成功 |
| 52 个未变目标的补丁结果对比 | 归一版本号后与 V0.13.0 原 rc.2 补丁结果完全一致 |
| 完整 `npm test` | 独立 Node 24.15.0、允许原生 Seatbelt：236 文件、2299 用例全部通过 |
| `npm run build` | 独立 Node 下通过（main/preload）；上游 Web UI 由 Harness 分发包提供 |
| Electron Node 真实 Harness 子进程 | 临时 Profile、中立 cwd、认证 HTML 200 已通过；此项不证明 UI 激活 |
| 客户端 bootstrap / 普通 Profile / Safe Mode 行为 | 完整回归中通过对应行为测试；浏览器与原生 renderer 验收未完成 |
| 实际桌面 UI | 已尝试隔离开发 Profile 启动；外层工具沙箱阻止 Chromium 初始化，未完成视觉与交互验收 |
| 最终安装产物及目标平台验收 | 待执行；开发检查不替代安装验收 |

仓库根目录的验证命令：

~~~bash
npm ci --no-audit --no-fund
npm run typecheck
npm run build
npm test
git diff --check
node scripts/verify-target.mjs darwin arm64
node scripts/probe-electron-node-runtime.mjs
~~~

`npm ci` 需确认补丁、品牌资源及 Electron 的 postinstall 全部成功。
`verify-target` 示例对应 macOS arm64，其他发布目标须在对应原生平台运行，不能绕过。
打包命令与最终验收按 [发布手册](release-runbook.md) 执行。

本次修改的测试与契约：

- `release.test.ts` 同步版本并验证新入口自定义包只在官方传递闭包中。
- `session-delete-patch.test.ts` 同步补丁版本，删除行为断言不变。
- `workbench-patch-slots.test.mjs` 验证零/一/多个面板、pins/More 与 quickSwitcher 共存、workspace 参数及菜单 analytics，以及设置/恢复贡献各自在独立容器挂载一次。
- `workbench-navigation.test.mjs` 验证 rc.3 原生空会话复用、Desktop 所有权过滤及 preset 匹配、显式草稿 replace/keep/append 与 starter 边界；原有工作台空会话 fixture 补上实际需要的复用过滤器。

验证环境说明：默认工具 `node` 是 Electron RunAsNode shim，直接运行会让使用 `spawn(process.execPath)` 的测试启动 Desktop 应用，并使 ASAR fixture 走 Electron 文件系统语义。改用独立 Node 后，启动诊断与禁用插件两份测试通过（22/22），未修改生产代码。此外，Office 测试在嵌套工具沙箱中报 `sandbox-exec: sandbox_apply: Operation not permitted`；真实 Seatbelt 验证在获准的外层执行环境运行。构建与测试串行运行，避免共享 Office staging 目录竞争。

针对性回归可从以下入口选择，命令形式为 `npm test -- test/<name>.test.ts`：

- [版本/发布契约](../test/release.test.ts)、[补丁契约](../test/session-delete-patch.test.ts)。
- [真实启动入口](../test/harness-node-entry.test.ts)、[失败诊断](../test/plugin-startup-failure.test.ts)。
- [Safe Mode 宿主解析](../test/safe-mode-host-resolved.test.ts)、[Safe Mode runtime](../test/safe-mode-runtime.test.ts)。
- [宿主插件闭包](../test/desktop-plugin-closure.test.ts)。

使用临时 Profile 和独立端口运行开发验收，方式见 [开发指南](development.md)。
依次确认认证 HTML、bootstrap 请求与执行注册、模块系统创建、实际 UI 挂载；随后验证
侧栏 pins/More/quickSwitcher、会话 header/pinned views/hero、workspace draft/opener，
并覆盖重启后的行为。HTTP 200、脚本标签存在或 Harness ready 日志不能替代客户端激活。
原生 UI 启动使用独立开发 Profile 与 43132/43133 端口，日志出现 SingletonLock 创建失败和 `sandbox initialization failed: Operation not permitted`；更宽权限启动请求在工具执行期限内未完成，检查任务未创建。没有通过关闭 Chromium sandbox 绕过该限制，也没有替换正式安装应用。

真实浏览器/原生 renderer 组合验收、模型请求、Windows junction/升级安装、macOS x64 和正式安装产物尚无本次验收结果，不作通过声明。
