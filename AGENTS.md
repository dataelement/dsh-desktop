# DSH Desktop 开发约束

本文件适用于整个仓库；目录级 `AGENTS.md` 只补充该目录的规则。规则放在能覆盖其作用域的最深层，不重复维护。新增约束与现状、工具覆盖的区别见 [规范设计说明](docs/code-standards.md)。

## 1. 项目边界

DSH Desktop 是 Electron 宿主，复用 Harness runtime 和 Web UI。保持这一定位，不另建 Agent runtime 或独立业务前端。

设计与评审优先回答四个问题：能力属于哪个进程；失败后用户数据能否恢复；上游升级后能否继续加载；目标平台的安装包是否包含并能运行这项能力。代码风格服务于这些边界。

涉及 Harness 定制、宿主插件或第三方补丁时，先阅读 [Patch 与 Plugin 规范](docs/patch-plugin-contract.md)：选型、slot 兼容性和组合验证在此统一定义。

| 目录 | 职责 / 专项规则 |
| --- | --- |
| `src/main/` | 原生能力、运行时编排、Profile、更新、手机桥接和企业登录；见该目录 `AGENTS.md` |
| `src/preload/` | 窄 IPC 桥和桌面 UI 接缝；见该目录 `AGENTS.md` |
| `src/shared/` | 跨进程数据契约和纯逻辑；不得依赖 main/preload、Electron 或 Node 特权 API |
| `packages/` | 宿主插件、运行时包和第三方分发包；见该目录 `AGENTS.md` |
| `patches/` | 可重放的第三方兼容补丁；见该目录 `AGENTS.md` |
| `build/` | 打包输入，包括 HTML 页面和运行时入口；见该目录 `AGENTS.md` |
| `scripts/`、`test/` | 构建发布工具、行为与契约回归测试 |

先阅读受影响模块和测试；涉及架构时阅读 `docs/architecture.md`，开发和发布分别参考 `docs/development.md`、`docs/release-runbook.md`。实际依赖与命令以当前 `package.json`、锁文件、构建配置和 workflow 为准；发现文档过期时修正文档，不按旧版本描述修改代码。

## 2. 代码规范

- `src/` 新代码使用 TypeScript，保留 `strict` 和 `noUncheckedIndexedAccess`。JS 插件、Node 脚本及 HTML 的例外见目录规则，不为统一后缀改变加载协议。
- 沿用相邻代码的两空格缩进、单引号、无分号风格；不要为格式化改动无关代码。
- 模块优先命名导出；配置文件和上游要求的入口允许默认导出。文件名使用现有的 kebab-case，函数/变量 camelCase，组件及类型 PascalCase，真正的常量使用 UPPER_SNAKE_CASE。
- 跨进程数据使用可序列化的显式契约，不传递 Electron 对象、函数或带原型的业务实例。`interface` / `type` 按表达需求和相邻模块习惯选择，不为统一写法重构已有类型。
- 外部输入先视为 `unknown` 并校验。不得新增无解释的 `any`、双重断言或非空断言；必要的上游类型兼容限制在适配边界，并说明原因。不得通过关闭 strict、整文件忽略或扩大检查排除范围绕过错误。
- 按职责、生命周期和可测试性拆分，不设统一行数硬阈值。入口负责组装；新能力若具有独立状态、副作用或清理流程，应提取为模块。小修复不捆绑整文件重构，单文件加载协议也不能成为堆叠无关逻辑的理由。
- 注释说明原因、平台差异和上游兼容限制，语言沿用所在模块；产品文案遵循对应界面的语言机制，设计文档可以用中文。
- 异步操作必须有失败出口。不得用空 catch 把失败包装成成功；可忽略的清理/遥测错误应说明理由。日志保留可定位的阶段和错误上下文，不能包含密钥、token 或完整敏感配置。

## 3. 依赖、用户数据与变更范围

- 仓库开发使用 npm 和 `package-lock.json`。产品内部用 pnpm 管理 Profile，与仓库包管理是两件事；不得新增竞争锁文件。
- 本仓库维护的代码只保留一份权威输入；由它生成的 bundle、压缩包、预览及完整性清单纳入构建流程，不与源码重复提交。第三方分发包与历史迁移的边界见 [源码与构建产物规范](docs/source-build-contract.md)。
- 优先复用现有工具和组件。新增 UI、状态管理或基础设施依赖必须说明现有能力为何不足、体积/原生平台影响；不得顺带替换技术栈。
- 保留无关 WIP、第三方 tgz 和锁文件。不得以修复构建为由随意删除锁文件或分发包，也不得只留下未记录的 `node_modules` 修改。
- 调试默认使用临时目录或独立开发 Profile。启动前确认实际 `userData` / `DSH_HOME`；多个开发 worktree 默认可能共享开发 Profile，不能并行修改同一份数据。
- 不把用户真实配置、会话、凭据或机器绝对路径加入代码/fixture。诊断用户环境时先保留证据；清空 Profile、删除插件或重置设置不能作为默认排障步骤。
- 安装、下载、激活、实际加载和发布是不同状态，代码及交付说明必须区分。

## 4. 验证与交付

以下命令均在仓库根目录运行：

```bash
npm ci                     # 需要安装依赖时；必须检查 postinstall 是否完整成功
npm test -- test/<name>.test.ts   # 按实际文件选择相关回归
npm run typecheck
npm run build
npm test                   # 代码变更提交前的完整回归
git diff --check
```

- 纯文档修改只需检查差异、链接和命令真实性；不要求启动应用或重装依赖。
- 行为修复应有能捕获该缺陷的回归，优先验证输入、输出、状态转换和失败路径。字符串/源码契约测试只作为补充，不能替代行为验证。
- 当前 `typecheck` 只覆盖配置及 `src/main`、`src/preload`、`src/shared`、TS 测试；插件 JS、脚本和 HTML 不在其覆盖范围。当前没有 `npm run lint` 或 `npm run format:check`，不得报告它们通过。
- 涉及启动、IPC、UI、安装迁移、更新或打包，补充对应真实流程验收。Windows 路径/进程/安装行为必须有 Windows 验证；其他平台通过不能代替。
- 发版遵循 release runbook 和目标原生构建脚本，不绕过 `verify-target`。PR 检查通过或本地打包成功不等于正式发布。
- 交付写清改动、原因、实际运行的检查、未完成的验收与限制。不得把尚未执行的检查写成通过。
