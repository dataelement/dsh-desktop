# Harness 0.2.2-alpha.2 适配与兼容性记录

## 对照范围

- Desktop 基线：远端 main `a8b05bf8af18ded0851a74da2c98bc250a7287ed`。GitHub API 已核实提交一致；本次 Git fetch 因网络失败，没有把缓存分支误当作未经核实的最新 main。
- Harness：`0.2.1-rc.3` → `0.2.2-alpha.2`。后者是目前官方 alpha 标签，不能称为正式稳定版。
- [官方发布元数据](https://registry.npmjs.org/@deepseek-ai%2Fdsh/0.2.2-alpha.2)。全部原有 219 个直接 DSH 包均有目标发布版本，未发现这些直接依赖必须改名或删除。
- 本文区分旧插件公共 API 不兼容、Desktop 内部补丁不兼容以及待验证风险。未修改真实用户 Profile 或已安装应用。

## 已确认的破坏性变化

| 变化 | 旧版本受影响方式 | 适配与保护 |
| --- | --- | --- |
| 官方 bundle 常量从 `dsh-app-boot` 移到 `dsh-official-bundles` | 旧 named import（如 `PROFILE_TEMPLATES`）类型检查失败；运行时导入不存在的导出会失败。Desktop generation 初始化已复现。 | 更新实际导入并声明直接生产依赖；第三方插件需重新适配发布，不能靠放宽版本判断补出缺失 API。 |
| `dsh-api-session-controller` 不再导出 `buildModelCatalog` | 旧插件若从该包 named import 此函数，会在模块导入阶段失败；并非仅内部补丁问题。 | 清点插件导入，迁到目标版实际提供的模型服务／目录接口并验证；无等价接口时明确判为不兼容，不用空实现绕过。 |
| Cordis、Loader、Include、Timer、Schemastery 使用新预发布版本 | 普通 npm semver 不会因为 `^4.0.1` 覆盖稳定版本就接受 `4.0.6-alpha.1`；本地 file 包可能继续保留旧 schema 私有副本。 | 对齐整套版本、明确 peer 预发布范围、用实际物理路径验证共享依赖；锁文件和干净安装一起验收。 |
| `dsh-tools.execute` 从单工具输入改为 `ToolBatchInput`（`calls: ToolCallBlock[]`），结果改为 `results/additionalContexts/concluded` | 直接传旧 `{callId,name,arguments,...}` 或消费旧结果结构的插件需适配；手工创建 ToolRuntime 的测试还必须装配 executor。普通 Profile 已由 dsh-base 注册 native/PTC executor，不能把 fixture 缺 executor 泛化为全部插件损坏。 | 封装工具执行适配边界，覆盖单条批量、多条、失败、取消和结果消费；实际导入／调用验证优先于版本放行。 |
| `collectIndexInjections(peer)` / `renderIndex(html, peer)` 要求页面所属 Peer | Desktop 专用 `/api/desktop/boot` 仍无参调用，远程权限注入读取 `peer.principal` 报错并返回 HTTP 400；普通浏览器首页使用上游路径，不能替代这条路径的验收。 | 通过原 index 认证后传入 `connection.browserPeer`，与上游静态首页一致；补未认证拒绝、权限快照、真实子进程端点及 Electron 启动验证。 |
| 上传记录由 `upload.file` 改成 `upload.attachment` 文件／图片联合结构 | 旧 Desktop 上传预览代码读取 undefined，或将图片当普通文件使用。 | 按 `type` 分支处理引用；验证文件、图片、上传暂存、历史附件与权限范围。 |
| 会话控制器初始化移到 `initialize`，模型选择移到 Agent 上下文 | 依赖旧构造阶段、`this.installSelection` 等内部实现的补丁可能漏初始化或调用不存在的方法。 | 使用目标版本的生命周期及 `installModelSelection(agentCtx)`；验证会话创建、模型切换及 Remote 调用。 |
| 会话控制器内部 helper 被移除／改组 | 旧附件补丁依赖的 `inspectApiSession`、`referencedImage`、本地 `assistantStreamChunks` 不再可直接沿用，可能产生 ReferenceError 或历史附件失效。这是内部补丁耦合，不代表全部插件都调用这些公共 API。 | 冷会话改用可用的 `sessionQuery.readSession`，显式导入实际需要的 helper，保留会话授权。 |
| 工作区列表／树／搜索加入远程访问与会话、工作区权限上下文 | 旧版整函数覆盖可能把新增权限判断一起覆盖掉；功能表面可用但授权行为回退。 | 只增加 Desktop 过滤及 UI 接缝，保留上游访问控制；覆盖拒绝访问、切换目录、搜索和 scoped delete。 |
| 模型列表使用稳定 rowKey、拖动排序和容量缓冲 | 旧整段 ModelRow 替换会丢排序，按索引维护编辑状态可能在重排后指向另一模型。 | 保留上游行与 AnimatedRows，在既有结构上扩展搜索、视觉和推理设置；测试重排后编辑目标。 |
| 聊天用户消息新增作者来源，相对文件路径以 workingDirectory 投影解析 | 旧组件／openFile 整段替换会丢作者信息或使用错误路径基准。 | 保留作者字段和上游路径解析，仅叠加桌面文件打开及消息页脚接缝。 |
| Bundle 增加 `dsh.bundle.platforms` 检查 | 旧 fail-closed 补丁若拦截全部异常，会把“不支持当前平台，正常跳过”变成整应用启动失败。 | 明确区分平台跳过与真实导入、配置、激活错误，保留跳过原因和插件归属。 |
| Web manifest 图标由 SVG 改成多尺寸 PNG | 旧 Desktop postinstall 只识别 favicon.svg，干净安装直接中断，本次已复现。 | 品牌脚本兼容两种已知格式，保持幂等并拒绝未知结构；普通 logo 不冒充 maskable 图标。 |
| Plugin Manager 增加 Git transport 选择、操作诊断，保护名单来源改变 | 旧整段 installBundle 补丁可能丢掉新流程或引用未定义保护常量。 | 保留新操作流程，移植 Desktop preflight／generation 扩展，验证成功、失败、取消和重启要求。 |
| pi-ai 对 malformed tool arguments 增加终态校验 | 旧“恢复终态”补丁整段替换可能吞掉 `argumentsError`，绕过非 length 终态的 `MALFORMED_RESPONSE`。 | 融合 Desktop 行为与新校验；保证畸形工具参数不被当成成功执行。 |

## 不能当成已证实破坏的事项

- `RuntimeResolution`、`PluginPackages` 在 `0.2.1-rc.3` 已经存在，不能整体列成 0.2.2 新机制。仍需对当前实现验证物理路径、软链接、普通 Profile、Safe Mode 和 Worker 解析。
- 尚未发现会话持久化格式发生不可逆迁移的证据；也没有据此证明旧版本可无损回退。应另测“旧数据新版本读取、写入后回退”。
- 未发现 Desktop 自定义 slot 已被上游完整替代。slot 名称保留不等于布局、Props、scope 和生命周期兼容。
- Web shell 的构建文件名和压缩变量发生变化，这是固定构建产物补丁的耦合点；不能仅改 patch 文件版本号。

## 建议保护优先级

### 发布前必须具备

1. **统一版本和真实依赖校验。** 检查 DSH 全闭包、Cordis/schema 版本、host peer 范围及物理解析路径。版本范围警告不能替代真正的入口导入、服务和 API 能力校验。
2. **故障隔离与可恢复启动。** 可选工作台的 import/apply/pending 失败应局部隔离，市场和修复入口仍能用；核心依赖失败应明确报告，不伪装成成功。诊断保留阶段、包名、归属和原始 cause，不能记录敏感配置。
3. **区分平台跳过和不兼容失败。** 不支持当前平台的可选 bundle 正常跳过；损坏包、缺失导出、缺失服务不能用同一 catch 全部忽略。
4. **保护用户配置与数据。** 升级前保留 Profile manifest、patch、generation 指针和迁移记录的可恢复副本；任何新迁移先验证再原子切换，失败保留旧可用状态。不得以删除插件、清空 Profile 或重置设置作为自动修复。
5. **真实启动和交互门禁。** 临时 Profile 覆盖内置插件、普通市场插件、本地软链接／Windows junction、缺宿主 peer、插件普通私有依赖、无共享 node_modules 的 Safe Mode。认证 HTML、bootstrap 执行注册、模块系统创建及 UI 挂载分别验证。

### 随本次适配加强

- 附件联合类型边界检查、历史附件预览、非法或缺失引用回归。
- 工作区权限拒绝、模型重排编辑、消息作者与相对文件路径回归。
- 干净 `npm ci` 完整 postinstall 重放所有补丁；检测补丁未定义变量、缺失 primitives export 和不存在的 slot。
- 对比升级前后冷缓存／重启缓存、插件卸载和重载，避免重复挂载和服务订阅。
- 发现协议／能力不满足时给出可定位的“不兼容”结果；不默认启用“忽略全部 peer 或 API 错误”。

## 最终验证结果

- 干净 `npm ci` 完整成功：35 个补丁全部重放，品牌资源安装和 Electron 安装步骤完成。首次干净安装实际发现新版 manifest 改用 PNG 图标导致旧品牌脚本失败；修复后重跑成功，并新增旧 SVG／新 PNG／重复执行／未知格式回归。
- `npm run typecheck`、`npm run build`、`git diff --check` 通过。构建包含 Office/PPT 准备和 Electron main/preload。
- 初次完整 `npm test -- --maxWorkers=4` 为 2798 通过、20 失败、5 跳过。后续修复 Desktop 专用引导端点后，开发构建已准备 Office/PPT 产物，使用独立 Node 执行 `node node_modules/vitest/vitest.mjs run --maxWorkers=4` 重跑完整套件：276 文件中 271 通过、4 失败、1 跳过；2824 项中 **2799 通过、20 失败、5 跳过**。失败仍为下述同一组环境限制，退出码为 1，不能报告全量测试通过。
- 剩余失败分布：[Word 模板](../test/docx-template-fidelity.test.mjs) 11 项、[图片生成](../test/image-generation.test.mjs) 3 项、[Office 运行时](../test/office-runtime.test.mjs) 2 项、[PTY 安装布局](../test/node-pty-asar-layout.test.ts) 4 项。前 16 项受当前宿主 `sandbox-exec: sandbox_apply: Operation not permitted`／沙箱写入限制影响；后 4 项为 `posix_openpt: Operation not permitted`。同一独立 Node 下分别调用原工作目录和适配目录的 node-pty，均复现相同拒绝，已作环境对照。没有禁用生产沙箱或把失败改成跳过。
- 两个隔离临时 DSH_HOME 的真实 Harness 子进程均启动成功：普通 web Profile 使用完整 Desktop overlay；Safe Mode 使用独立恢复 overlay，未要求修复共享 Profile 依赖目录。
- Tabbit 实际浏览器验证：普通 Profile 的会话页、设置与模型设置入口可以挂载和交互，重载后仍可使用；Safe Mode 实际客户端挂载成功。观察期间没有未捕获的 pageerror。切换普通页面时观察到一次 Office 模板请求被取消（ERR_ABORTED），未将其当作模板执行成功证据。临时验证页面和两个服务进程均已关闭。
- 未执行签名安装包发布、已安装正式应用替换／更新、原生 Windows junction／安装验证、真实用户数据升级后回退验证、完整主题／窄窗口／slot 多贡献项视觉矩阵。此分支是适配结果，尚不构成可直接发版结论。

## 后续 Electron 启动修复

独立开发 Profile 实际启动暴露了 Desktop 专用引导端点遗漏 Peer 的问题。修复 [boot.js](../packages/dsh-desktop-client-ui/boot.js) 后，[引导端点回归](../test/desktop-boot-payload.test.mjs) 新增用例先复现相同 principal 异常，再验证传递当前认证 Peer；[真实 Safe Mode 子进程](../test/safe-mode-runtime.test.ts) 增加该端点的 401／200 和 owner 权限快照检查。连同 [宿主 shell](../test/harness-shell.test.ts)，3 文件 34 项通过。

重启实际 Electron 开发实例后，日志由 `startup` 进入 `running`，Harness 为 `ready`，随后进程以 0 退出；未再出现此前的 boot payload HTTP 400。观察到 macOS GPU mailbox 诊断，尚未完成其视觉影响验证。测试实例已退出。此项验证为独立开发实例，仍不等同于正式安装包更新验收。

## 测试改动与契约说明

新增 [宿主依赖基线](../test/harness-dependency-baseline.test.mjs) 校验 npm 预发布 peer 语义及插件物理目录的共享依赖解析；新增 [品牌安装脚本测试](../test/install-brand-assets.test.mjs) 执行完整脚本，捕获 manifest 格式迁移导致的安装中断。

客户端测试更新：[引导隔离](../test/client-shell-failure-isolation.test.ts)、[企业入口](../test/enterprise-entry.test.ts)、[文件预览](../test/file-preview.test.ts)、[本地路径](../test/local-path-links.test.ts)、[模型选择](../test/model-picker-patch.test.ts)、[推理能力](../test/model-reasoning-efforts-patch.test.ts)、[模型目录](../test/model-settings-catalog-ux-patch.test.ts)、[模型渲染](../test/model-settings-render.test.mjs)、[PPT 集成](../test/ppt-integration.test.ts)、[删除接口](../test/session-delete-patch.test.ts)、[工作台 slot](../test/workbench-patch-slots.test.mjs)。旧 fixture 对组件树、稳定行索引和压缩变量的假设改为目标版本真实结构，同时保留行为断言；新增文件／图片联合类型、跨会话隔离、当前工作目录和重排后模型编辑回归。

服务端与发布测试更新：[generation 启动](../test/generation-launch.test.ts)、[HMR fallback](../test/hmr-fallback.test.js)、[图片执行](../test/image-generation.test.mjs)、[pi-ai 终态](../test/pi-ai-terminal-replay.test.mjs)、[插件开关预检](../test/plugin-manager-switch-preflight.test.mjs)、[插件开关](../test/plugin-manager-switch.test.mjs)、[验证安装](../test/plugin-manager-verified-install.test.mjs)、[Profile 预检](../test/profile-boot-preflight.test.ts)、[发布闭包](../test/release.test.ts)、[删除重试](../test/session-delete-retry.test.ts)。更新官方常量导入、操作事件 fixture 和工具 batch/executor 装配；新增平台正常跳过、畸形工具参数拒绝等回归。上游已移除日期命名的模型标签插件，不再要求它出现在官方闭包中。

## Electron 44.7.0 升级

按指定版本将 Electron 从 43.0.0 固定升级到 44.7.0，同步 package.json 与 npm 锁文件；官方二进制通过随包提供的完整性校验。干净 `npm ci` 的完整 postinstall 成功，35 个补丁全部重放。

在 macOS ARM64 上，`scripts/verify-target.mjs darwin arm64` 确认实际 Electron **44.7.0 / Node 24.21.0** 能加载 Harness 原生加载器；`scripts/probe-electron-node-runtime.mjs` 使用临时 Profile 和中立启动目录启动真实 Harness，并通过认证 HTTP 200 检查。`npm run typecheck` 与 `npm run build` 通过。没有修改原生加载器的版本白名单、关闭沙箱或绕过打包门禁。

[PTC Helper 回归](../test/ptc-electron-helper.test.js) 原本将版本写死为 43.0.0；升级后改为核对 Helper 实际返回的 Electron 版本与项目声明一致，不放宽为任意版本。该回归连同原生加载器及可执行文件选择共 9 项通过。最终 `npm test -- --maxWorkers=4` 为 **2799 通过、20 失败、5 跳过**（276 文件：271 通过、4 失败、1 跳过），失败集合与升级前相同，仍是上述 Office／图片沙箱及 PTY 环境限制；未将退出码 1 报告成全量通过。

该验证覆盖本机原生加载及后端认证端点，不等同于 Electron 44 的完整客户端交互、Windows 原生安装、签名安装包或已安装正式应用升级验收；这些仍需按目标平台完成。

## v0.13.1 整合验证

基于远端 `v0.13.1@6583116965918803cd59df62ffba6e147eb0f59d` 应用上述适配，保留该分支已有的发布流程、Windows 安装错误提示及过期文档启动故障过滤修复。整合后类型检查、构建通过；完整回归为 **2805 通过、20 失败、6 跳过**（278 文件：273 通过、4 失败、1 跳过）。失败仍为同一组 Office／图片沙箱及 PTY 环境限制。

## 补丁处置

35 个补丁均有保留的具体 Desktop 行为：30 个 DSH 补丁迁到目标版，Cordis Loader 迁到 1.0.7-alpha.1，4 个独立第三方补丁保持原固定版本。已替代的旧版本补丁删除。没有用关闭 strict、扩大排除范围或删除失败测试来适配。

实质缩减包括：不再复制旧模型行和容量字段实现，保留上游稳定排序；deliverables 使用上游新的 produced 记录语义；删除 Plugin Manager 非导出入口中的整段重复实现镜像，只维护实际入口及必要声明；删除 JSONL 声明纯末尾换行噪声。解析链保持上游所有权及 interception，未恢复历史 resolver 补丁。
