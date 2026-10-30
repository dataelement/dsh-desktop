# Harness 0.2.1-rc.1 升级与补丁诊断

## 基线与方法

基于 Desktop `V0.12.0`，分支 `codex/compat-dsh-0.2.1-rc1`。DSH 依赖从
`0.2.0-rc.2` 固定到 npm 已发布的 `0.2.1-rc.1`，保留 npm 与
`package-lock.json`。没有重新打包上游源码或改动真实用户 Profile。

每个旧补丁均对照三个输入：旧版原始发布包、应用旧补丁的发布包、新版原始发布包。
先合并行为，再按新版发布包生成差异，不能仅改补丁文件名。以下清单覆盖原有全部
28 个补丁；26 个随包版本迁移，另两个第三方补丁保持原版本。一个 patch 文件可同时
包含上游修复和 Desktop 扩展接缝，移除某个 hunk 不代表整个文件可以删除。

## 上游变化与取舍

- Remote 元数据从数组变为按方法名索引的对象，codec 使用 Zod。会话删除同时适配
  host、remote client 和浏览器聚合描述符，归属必须是 session controller，不能放入 Job 表。
- 创建会话使用新的串行 claim 流程。保留上游 blank session 的重用检查、writer 竞争和
  preset 检查，在 resume/create 获得 handle 后登记 Desktop 所有权，删除时等待和释放。
- JSONL persistence 改为命名插件导出；坏 metadata 的列举容错已由上游实现，移除旧容错
  hunk。仍保留删除会话、保持原始坏日志不被覆写的验证。
- 上游退役 schedule bundle，使用其 `dropRetiredBundles` 迁移流程；组合投影测试改用
  仍存在的 voice-input bundle，不重新引入已退役包。
- `dsh-invariants` 与 `dsh-subagent-in-process-driver` 不再作为该版的独立依赖；移除根依赖
  以及 PPT 未使用的 invariants peer。没有补造旧服务。
- 官方 terminal、session-search、session-titles bundle 分别带入 terminal tool、session query
  tool 和 all-prompts title 实现。允许这些传递依赖，但不提升为 Desktop 直接依赖。
- Cordis 依赖闭包同步为 cordis 4.0.5、group 1.0.5、hmr 1.0.20、include 1.0.10、
  loader 1.0.6、timer 1.1.7、cosmokit 1.8.6、schemastery 3.18.5。
- 初始升级阶段存在 libreoffice-kit 0.1.3/0.1.5 双版本；后续按用户要求统一为
  0.1.5，并迁移逐页预览补丁，见末尾版本收敛记录。
- 本地宿主插件的兼容 peer 区间追加 `^0.2.1-rc.1`，Office 的精确 peer 同步到新版本。

## 逐项清单

除注明版本外，下表目标均为 `@deepseek-ai/<包名>@0.2.1-rc.1`。
测试列是回归入口，不表示其全部属于真实安装包或 UI 验收。

| 包 | 诊断与适配结论 | 回归入口 | 移除条件 |
| --- | --- | --- | --- |
| cordis-plugin-loader 1.0.6 | 保留 import cause、阶段诊断、超时和失败所有权；适配上游 module namespace 变量 | cordis-plugin-loader-patch、plugin-startup-failure | 上游暴露同等失败诊断与恢复接口 |
| dsh | 保留 CLI 启动失败退出码及 Desktop 宿主包闭包；更新 manifest 版本 | release、desktop-plugin-closure | 上游提供宿主依赖组合及等价退出语义 |
| dsh-api-remotes | 删除会话描述符迁入新版 session 方法对象，使用新版 Zod codec | session-delete-remote | 上游原生提供相同删除 RPC |
| dsh-api-session-controller | 保留删除、文件授权路径、preset 恢复和 handle 清理；接入 claims；同步声明与生成客户端 | session-delete-remote、session-delete-retry、file-preview、session-create-remote-event-patch | 上游提供删除/附件路径与 handle 生命周期契约 |
| dsh-app-boot | 保留 Desktop 包开关、归属和工作台故障隔离、版本声明告警策略；采用新版 bundle 退役与启动检查 | host-disabled-plugins、plugin-version-policy、plugin-startup-failure、safe-mode-runtime | 上游提供相同宿主策略与归属接口 |
| dsh-client-file-upload | 保留按 attachmentId 查找已暂存文件的受限接口 | file-preview | 上游提供等价授权文件路径能力 |
| dsh-client-modules | 保留 Profile 解析 anchor、可选工作台隔离和组合加载；不回退新版模块图/bootstrap 协议 | client-modules-resolution-patch、client-modules-failure-isolation、client-modules-combo-perf-patch | 上游支持宿主解析与可选贡献项隔离 |
| dsh-client-shortcuts | 保留 Desktop 快捷键处理接缝 | patch-layer | 上游提供等价桌面处理能力 |
| dsh-client-ui-agent-preset | 保留导入/导出、搜索及 Desktop 预设入口，合并新版组件 | preset-transfer-patch、preset-toolbar、legacy-preset-migration | 上游公开相同扩展点和操作 |
| dsh-client-ui-attachment | 保留 ready 附件打开回调，失败不伪装成功 | file-preview | 上游暴露授权附件打开动作 |
| dsh-client-ui-chat | 附件打开迁入新版 UserContent factory；PPT footer 归 ChatFlow，首个人类消息或待发送 echo 只挂载一次；保留文件夹选项重试与原生打开失败 | file-preview、local-path-links、ppt-integration | 上游提供附件动作、消息 footer 及相同文件路由 |
| dsh-client-ui-conversation | 保留 modeActions、dock、workbench 和附件接缝；同时保留新版 hero.options、user.text factory 与 composer | workbench-patch-slots、ppt-integration、file-preview、patch-runtime-compatibility | 上游提供这些独立 slot，布局及生命周期等价 |
| dsh-client-ui-deliverables | 合并上游 argumentPath 映射与 Desktop 本地路径/文件夹识别，保留正常产物优先顺序 | local-path-links、file-preview | 上游原生识别相同路径并保留打开语义 |
| dsh-client-ui-primitives | 保留 markdown 文件/目录 mention 类型与展示 | local-path-links | 上游支持目录 mention 契约 |
| dsh-client-ui-settings-general | 保留 Desktop 设置页所需接缝 | patch-layer | 上游暴露等价设置布局接缝 |
| dsh-client-ui-settings-models | 保留服务商选择、搜索、容量、图像能力与自由 reasoning 映射；上游标准档位编辑器仍用于对应 adapter。二者语义不同，不能用标准枚举丢弃自定义档位及旧配置迁移 | model-reasoning-efforts-patch、model-settings-catalog-ux-patch、patch-runtime-compatibility | 原生编辑器覆盖任意映射、旧配置迁移及 Desktop 目录交互 |
| dsh-client-ui-sidebar | 保留宿主导航/设置操作接缝及桌面侧栏行为 | windows-sidebar-collapse、workbench-patch-slots | 上游有等价导航与布局 API |
| dsh-client-ui-trajectory | 保留 query rail 展示接缝 | query-rail-patch | 上游提供等价轨迹展示扩展点 |
| dsh-client-ui-workspace | 保留会话/工作区过滤、打开/重用/删除注册接口及未读行为；采用新版 fork 和列表契约 | workspace-unread-patch、session-delete-patch、workbench-patch-slots | 上游提供这些公开管理接口 |
| dsh-llm-deepseek | 保留额度、认证与权限错误分类，403 不误判为认证失败 | provider-error-patch | 上游采用同等错误分类 |
| dsh-llm-pi-ai | 保留三种协议的 session 请求头、配置头覆盖和 provider 错误信息；测试模型更新为新版目录中的 completions 模型 | pi-ai-session-headers、provider-error-patch | 上游提供同等身份头和错误上下文 |
| dsh-plugin-manager | 采用新版 pnpm/发布重载实现；重新接入 generation backend、包开关及兼容性告警，保留 commit/rollback | plugin-manager-generation-backend、plugin-manager-switch、plugin-version-policy | 上游提供宿主事务 backend 与开关策略 |
| dsh-session-persistence | 保留删除存储接口与类型 | session-delete-patch | 上游原生实现删除契约 |
| dsh-session-persistence-jsonl | 保留磁盘删除；删除已被上游接管的坏 metadata 容错 hunk；采用命名插件导出 | session-delete-patch、session-corrupt-log-patch | 上游提供同等磁盘删除能力 |
| dsh-skill | 保留可按会话控制模型可调用性、用户调用性及来源过滤，使用新版 workingDirectory 服务 | ppt-activation | 上游原生提供会话级调用门禁 |
| dsh-workspace | 保留 workspace 删除与关联会话管理契约 | session-delete-patch、workbench-patch-slots | 上游公开同等管理接口 |
| libreoffice-kit 0.1.5 | 从原 0.1.3 补丁迁移逐页通知与声明，统一 Office/PPT 引擎 | office-engine-resolution、office-image-progress、office-runtime、ppt-office-preview-progress | 上游发布等价进度接口且取消、背压、失败清理行为回归通过 |
| undici 8.11.2 | 上游版本未变，保留 wrapper 将对象形式 headers/trailers 转为 legacy 数组的兼容修复 | undici-legacy-headers | 上游兼容对象形式的原始 headers/trailers |

## 加载与验证边界

本次涉及 Profile 组合、后端加载、客户端发现及客户端激活。普通 Profile 从 Profile
manifest/入口解析插件，明确的宿主 peer fallback 规则保持不变；Safe Mode 仍使用安装
资源 anchor。没有将工作区 cwd、真实用户配置或开发机路径变成新解析来源。
失败继续保留原始 cause、包名和阶段；恢复入口沿用宿主故障隔离与 Safe Mode。

会话、附件和 PPT 测试夹具按新版服务契约调整。Office skills 不再分发
`scripts/check_office.py`，运行时 smoke 使用准备好的 Python 创建真实 docx/pptx/xlsx，
再检查 ZIP 的标准文档入口和内容，不依赖已删除的脚本。

最终执行结果（macOS arm64，2026-10-17）：

- 干净 `npm ci`：28/28 补丁重放成功，品牌资源和 Electron postinstall 完成；锁文件
  中 301 个顶层 DSH family 包均为 `0.2.1-rc.1`。
- `npm run typecheck`、`npm run build`、`git diff --check` 通过。
- `npm test`：207 个文件、2047 项用例全部通过。包含真实 Harness 子进程、普通/本地
  链接插件、缺失宿主 peer、启动失败、Safe Mode 和宿主插件闭包相关测试；测试中的
  Windows fixture 不等于 Windows 平台验收。
- 对 69 个补丁目标 JS/声明文件做语法解析，JS 另经 `node --check`；全部通过。
  客户端补丁还经过未解析标识符、primitives 导出及宿主 slot 声明检查。
- `node scripts/verify-harness-auth.mjs`：临时 DSH_HOME 启动真实 web，未认证请求 401，
  token 交换 cookie 返回 303，认证后会话 RPC 返回 200。
- 独立临时 web Profile 经 tabbit 验证 HTML/bootstrap 执行、主界面和设置挂载。
- Electron 使用独立开发 Profile 启动，确认实际 `userData`、`DSH_HOME` 和中立
  `launch-root`，Harness 子进程就绪。原生窗口检查主界面、Standard mode 与 Office
  入口并存、设置版本、模型设置、新建服务商草稿/取消、预设导入与搜索入口、PPT 模式
  切换及模板图片。未输入真实凭据或发送模型请求；测试客户端已退出。

本次变动的测试：`file-preview.test.ts`、`generation-projection.test.ts`、
`office-runtime.test.mjs`、`patch-runtime-compatibility.test.mjs`、
`pi-ai-session-headers.test.ts`、`ppt-activation.test.mjs`、`ppt-integration.test.ts`、
`release.test.ts`、`session-corrupt-log-patch.test.ts`、`session-delete-patch.test.ts`、
`session-delete-remote.test.ts`。保留原有断言所验证的删除、授权、恢复、并发请求头和
调用门禁；更新新版导出、描述符、依赖闭包与组件表达式。另补原生打开失败传播/行号保持
的行为用例，以及 native hero options 与 Desktop modeActions 各保留一个出口的契约断言。

验证过程中，测试和构建并行准备 Office 曾触发目录替换冲突，随后改为串行，最终两者
均通过。在运行中的依赖被修改/重新安装时，访问 Desktop 专用端点的外部浏览器出现过
SlotAssemblyError 和脚本错误；没有把该热替换过程计为通过。最终 Desktop 验收使用
重启后的原生窗口，独立 web 验收使用自己的临时 Profile。

未完成的验收：Windows 原生路径/进程与 junction、正式签名安装包及安装后升级、真实
第三方市场包的逐个安装/激活、所有 slot 的多贡献项/深浅主题/窄窗口组合、真实模型调用，
以及发送消息后的 PPT footer 实机流程。已有相关单元/契约回归不代替这些验收。

## 功能审计后的修复

在原有 28 个 patch 的迁移之外，补充两项上游生产运行时修复，总数变为 30：

| 包 | 处理 | 行为验证 | 移除条件 |
| --- | --- | --- | --- |
| @earendil-works/pi-ai 1.3.0 | npm override 固定本分支已使用的版本；对照官方 1.1.0 patch 适配六个 provider，删除每个参数 delta 的重复 JSON 解析，保留结束时完整解析 | pi-ai-streaming-arguments、pi-ai-session-headers、pi-ai-terminal-replay | 固定上游版本包含等价实现且工具调用参数/replay 回归通过 |
| node-pty 1.2.0-beta.15 | 显式/同级 spawn-helper 解析与 ConPTY kill 后主动 dispose | node-pty-asar-layout（macOS 真实终端，默认与外置 helper）、node-pty-cleanup（Windows 对象行为） | 固定上游版本包含修复，且 asar 与 Windows 原生退出验证通过 |

Office/PPT 当前目录改用 workingDirectory 服务，文件操作保持独立权限验证；Office
沙箱 root 不随 cwd 改写，PPT 拒绝只读模式写入及受限模式越界。目录改变会刷新宿主注入
的技能快照。回归涵盖 realpath 后的软链接逃逸、只读拒绝、Word 真实 worker、生成包
PPT 读写与真实 Harness 内切换目录后的模板副本。该阶段 Office 引擎仍有
0.1.3/0.1.5 两条路径；后续收敛记录见下文。

修复后的最终检查：`npm ci --no-audit --no-fund`（30/30 patch、品牌资源与 Electron
postinstall 完整成功）、`npm run typecheck`、`npm run build`、`git diff --check`
通过；完整 `npm test` 为 209 文件、2054 项全部通过。

本轮新增测试 `pi-ai-streaming-arguments.test.mjs`、`node-pty-cleanup.test.mjs`；扩展
`node-pty-asar-layout.test.ts`、`office-templates.test.mjs`、
`docx-template-fidelity.test.mjs`、`office-runtime.test.mjs`、
`ppt-validation.test.mjs`、`ppt-activation.test.mjs`，并为
`ppt-personal-templates.test.mjs` 提供新版宿主服务 fixture。
`patch-runtime-compatibility.test.mjs` 现在区分 CommonJS 的 `__dirname` 与 ESM
局部标识符，并识别 Node 的 `clearImmediate`；未缩小补丁源码检查范围。

完整回归首次运行暴露新增测试缺失 mkdir 导入和 CommonJS 全局识别不足，修正后重跑
相关测试与整套回归通过。Windows 清理仍只完成对象行为验证；签名安装包、安装后升级
与真实模型调用没有在本轮执行。

## Office 引擎统一到 0.1.5

按用户要求，PPT 权威源码依赖和 npm 根 override 均固定
`@deepseek-ai/libreoffice-kit@0.1.5`。锁文件只保留一份 Kit，所有可选引擎也为
0.1.5；Office skill、Office-to-PDF 和 PPT 从各自入口解析到同一份安装。
旧 `0.1.3` patch 已替换为 `patches/@deepseek-ai+libreoffice-kit+0.1.5.patch`。
上游 0.1.5 尚未提供逐页通知，补丁继续保证 PNG 写入后通知、回调背压、取消及失败
清理；上游提供等价接口且对应行为回归通过后可移除。

新增 `test/office-engine-resolution.test.ts` 依赖闭包回归，检查真实消费者解析、
锁文件唯一版本与可选引擎版本，并同步打包路径 fixture。已有
`office-image-progress.test.mjs` 覆盖原生逐页通知、回调失败、参数校验与挂起回调取消；
Office/PPT 模板、导出与真实 Harness 流程随完整测试重跑。

全新 `npm ci --no-audit --no-fund` 完整 postinstall 成功，30/30 patch 通过；
新版引擎重新生成 7 个示例、55 页预览，抽查公文首页排版正常；
`npm run typecheck`、`npm run build`、`git diff --check` 通过，完整 `npm test`
为 209 文件、2055 项全部通过。
尚未执行 Windows 原生运行、签名安装包及安装后升级验收。
