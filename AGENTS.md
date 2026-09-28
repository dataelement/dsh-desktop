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

### 启动目录与插件解析拓扑

启动目录、Profile、插件目录和宿主安装目录承担不同职责，不能因为开发环境恰好能解析就合并这些边界：

| 位置 | 职责 | 不得依赖的隐含行为 |
| --- | --- | --- |
| `<userData>/launch-root` | Harness 子进程的中立 `cwd`，隔离从工作区继承的上下文 | 不要求是 Git 仓库，不存放或解析插件、依赖和用户项目 |
| `$DSH_HOME/profiles/<profile>` | Profile manifest、组合配置及该 Profile 可见的插件入口 | 不从仓库根目录或调用者 `cwd` 偶然找到包 |
| `$DSH_HOME/profiles/node_modules` | 普通 Profile 共享的宿主依赖闭包与解析接缝 | 不是插件源码、generation 或安装包的权威副本 |
| Profile plugin / `.generations/<id>` / 本地链接目标 | 插件自身代码和插件私有依赖 | 不复制 React、Cordis、Harness 等应与宿主共享的单例 |
| Desktop 安装目录 | 当前运行版本携带的 Harness、宿主插件和受控依赖 | 不作为所有缺包的通用搜索目录，不覆盖插件的普通第三方依赖 |

- 普通 Profile 先从 Profile 解析插件；本地 `file:` 包、symlink 和 Windows junction 必须保持可加载。解析后即使 Node 使用插件的物理路径，插件声明的宿主 peer 仍应连接到当前 Desktop 携带的兼容实现。
- 依赖解析顺序是“插件自身/正常 Node 解析 → 明确的宿主依赖 fallback”。宿主 fallback 只允许覆盖约定的宿主包命名空间（当前为 `@deepseek-ai/*`），且只在正常解析得到 `ERR_MODULE_NOT_FOUND` 时启用；不得用全局 `NODE_PATH`、改变 `cwd` 或把安装目录作为任意包的兜底。
- Safe Mode 是例外但不是第二套模糊规则：它只加载安装包自带的包，可以显式使用宿主 anchor，并且不能依赖普通 Profile 的共享 fallback。普通 Profile 不得套用 Safe Mode 的“所有 bare package 都从宿主解析”语义。
- fallback 必须遵守 `exports`、子路径和当前实际运行安装目录，不能硬编码开发仓库的 `node_modules` 或机器绝对路径；应用升级后不得继续引用旧安装 generation。
- 加载失败须保留最内层的包名、父模块和解析阶段。外层插件首次查找失败、fallback 失败和插件内部 peer 缺失不能互相覆盖，不能把“插件内部缺少宿主依赖”误报成“插件不存在”。
- 修改启动入口、loader、Profile 投影、generation 或依赖闭包时，至少验证：安装包内置插件、普通市场插件、本地软链接插件、缺少宿主 peer、插件自带普通依赖、Safe Mode 无 `profiles/node_modules`；涉及 Windows 时补 junction 与物理路径验证。
- 单元测试中 `import` 成功只证明源码路径可达。交付前还要按影响范围验证实际 Harness 子进程、打包资源清单及安装后的应用；已安装旧版本未重建时不得声称修复已在正式版生效。

### 后端与客户端启动协议

按下面的阶段判断加载是否成功，不把一个阶段的成功替代后续阶段的验收。具体 API 和脚本形式以锁文件对应的 Harness 实现为准；升级时重新核对协议，不能只机械保留旧补丁。

| 阶段 | 必须成立的条件 | 可定位的失败证据 |
| --- | --- | --- |
| Profile 组合 | manifest、patch、启用状态和活动插件入口一致 | Profile 名称、组合来源、插件归属及实际路径 |
| 后端加载 | 插件入口可导入，依赖可解析，所需服务满足并完成激活 | import / apply / activate 阶段及原始 cause |
| 客户端发现 | 从对应插件的同一有效解析基准读取 `dsh.client`，生成模块图和脚本路由 | package、client 入口、解析 anchor、graph 中的模块及 revision |
| HTML 引导 | 注册队列先于 bootstrap 脚本执行，bootstrap 注册先于模块系统创建 | HTML 标签顺序、脚本 URL、HTTP 状态、响应类型及浏览器异常 |
| 客户端激活 | 模块系统按依赖图实例化插件，所需服务和 UI 完成挂载 | 模块注册、依赖/服务状态及实际界面 |

- 后端导入、客户端 bundle 发现及 preset 解析必须遵循同一 Profile/宿主归属规则；修改任一路径时检查其余消费者。Safe Mode 的宿主 anchor 必须传到客户端发现和 preset，不能仅保证后端启动。
- 当前客户端引导顺序为：创建 `window.__ModuleLoader__` 注册队列 → 执行包含 `@deepseek-ai/dsh-client-modules/client.js` 的 bootstrap 脚本并注册模块 → 在 shell 消费前提供 `__DSH_BOOT__` 模块图 → 调用 `create()` 建立模块系统 → 按模块图加载和激活应用插件。应用脚本的 preload 可以提前发起下载；下载、执行、注册和激活是不同状态，不得用下载顺序推断执行顺序。
- 不得随意给 bootstrap 添加 `async`、延后队列初始化或改变 HTML 注入位置。优化合包、缓存或脚本调度时，必须保持上述先后关系以及 graph、revision、脚本响应的一致性，覆盖冷缓存与重启/更新后的缓存场景。
- `Harness is ready`、HTML 200、脚本 200 分别只证明对应阶段。完整客户端验收还须确认 bootstrap 注册、模块系统创建及实际 UI 挂载；不得把脚本标签存在或字符串匹配作为加载成功的唯一证据。
- `HTML did not preload ...` 只表明调用 `create()` 时缺少 bootstrap 注册。诊断时依次区分 graph 漏项、HTML 漏标签、请求失败、错误响应、执行异常和顺序错误；不能仅凭这一行归因于插件不兼容、缓存或某个版本回归。

### 加载链路变更的提交要求

- 实现前写清：改动属于上表哪一阶段、读取哪个目录、采用哪个解析基准、影响普通 Profile 还是 Safe Mode、失败时如何保留原始诊断与恢复入口。不能用在开发仓库中导入成功来推断正式安装包可用。
- 回归优先走真实子进程和临时 Profile，分别覆盖正常、缺包及错误路径；客户端改动验证认证后的 HTML、bootstrap 响应及执行注册，再补真实浏览器/UI 验收。相关入口包括 `test/harness-node-entry.test.ts`、`test/plugin-startup-failure.test.ts`、`test/safe-mode-host-resolved.test.ts`、`test/safe-mode-runtime.test.ts` 和 `test/desktop-plugin-closure.test.ts`，按实际改动选择并扩展行为覆盖。
- 交付说明列出已验证阶段和未验证阶段；规则中的验收要求不代表现有测试或 CI 已全部覆盖。声称版本回归须有完整版本/安装产物、Profile 状态与启动路径的对照，单独替换一个 loader 文件的实验不能替代整应用版本对比。

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
