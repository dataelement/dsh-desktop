# Desktop Office authoring

本改动属于 Profile 组合与后端激活阶段，不改客户端 bootstrap。普通 Profile 从安装 anchor 加载 `dsh-desktop-office`，组合上游 `dsh-skill-office` 与 `dsh-tool-workspace-dependencies`。Safe Mode 不加载该可选插件，Python 或技能资源损坏时保留独立恢复入口。

资源从当前 Desktop 的 `resources/office-runtime` 读取；开发时读取 `.build/office-runtime`。技能和 Python 必须在 ASAR 外，不能从中立 launch-root、Profile 或用户项目查找。依赖查询直接返回当前安装携带的只读 Python 路径，不复制到用户 Profile，不修改 PATH；升级后重新查询即使用新安装路径。LibreOffice CLI 使用 #646 的 Electron Helper / Electron executable 的 Node 模式与固定 CLI 入口，保留引擎物理路径解析。

Python 和 wheel 的固定 URL/SHA-256 来源：[上游固定提交的 primary-runtime lock](https://github.com/deepseek-ai/deepseek-harness/blob/639ed015397290b3745d163aafe02ffee4aa3f84/scripts/primary-runtime/lock.json)。本仓库保留 Windows x64、macOS arm64/x64 和 Linux x64 的 Python 相关输入；不携带第二份 Node 或 pnpm。Linux x64 追加项保持同一 Python / wheel 版本，来源为 [python-build-standalone 20260901 发布元数据](https://api.github.com/repos/astral-sh/python-build-standalone/releases/tags/20260901) 中的 SHA-256 digest，以及 PyPI 的 [numpy 2.3.5](https://pypi.org/pypi/numpy/2.3.5/json)、[pandas 3.0.1](https://pypi.org/pypi/pandas/3.0.1/json)、[Pillow 12.3.0](https://pypi.org/pypi/pillow/12.3.0/json)、[lxml 6.1.3](https://pypi.org/pypi/lxml/6.1.3/json) 文件 URL / SHA-256。选择通用 `x86_64-unknown-linux-gnu` Python（不使用 x86_64_v2/v3/v4 或 musl），二进制 wheel 的 manylinux 基线不高于目标 UOS 20 的 glibc 2.28。新增 tar / fflate 为构建时提取工具，不增加 renderer 依赖。

构建阶段下载并校验固定资源、离线解包 wheel，不运行 pip install，不依赖系统 Python。生成物位于忽略目录 `.build`；构建失败不能继续消费旧 payload。包内验证必须实际调用 Python 创建、重新读取 DOCX/PPTX/XLSX、检查 ZIP 正斜杠路径，执行技能结构检查及 LibreOffice 转换。Windows、Intel Mac 和 Linux x64 的执行验收须在对应原生 runner 完成；其他平台的成功不可替代。

本地 macOS arm64 开发目录包实测 Office 资源约 205 MiB（包含 Python、numpy/pandas 与 Office 库）；这不是 DMG/NSIS 压缩增量。首次运行不做联网安装或 Profile 复制；安装时间增量取决于目标安装器的解压，需要原生产物对照测量。

## Linux x64 Office 引擎与验收

当前锁定的 LibreOffice Kit 0.1.5 在 Linux 上优先探测开发用的 native glibc 引擎（兼容版本 0.1.1），没有安装兼容 native 包时使用它正式声明的 `wasm` 0.1.5 引擎；这不是调用系统 `soffice` 的兜底。其 worker 实现提供 PDF 转换、表格重算和图片渲染，但源码具有实现不等于目标机器已验收。发布包必须携带 `@deepseek-ai/libreoffice-kit-wasm` 的 loader / wasm / data / metadata，且与 native 引擎一样从 ASAR 外的物理目录解析。只携带 Python 不足以启用 Office/PPT 预览。

LibreOffice Kit 0.1.5 的 API 与 CLI bundle 各自内联安装探测，二者均需应用 Electron ASAR 兼容补丁：[kit patch](../patches/@deepseek-ai+libreoffice-kit+0.1.5.patch) 将 `lstatSync(..., { throwIfNoEntry: false }) !== undefined` 改为同时排除 `null` / `undefined`。Electron 对 ASAR 中不存在的路径返回 `null`，普通 Node 返回 `undefined`；旧逻辑会把完全未安装的 native 引擎误报为 incomplete。这不是 builder 残留目录，不应通过排除所有 native 包或无条件 WASM fallback 绕过。真实存在但丢失 package.json 的 native 目录、无效 manifest 仍须 fail closed 并保留原始 cause。上游发布在 API 与 CLI 中同时处理这两种缺失值的版本后可移除这两处 hunk；其他图像进度补丁需独立评估。

[真实 ASAR 回归](../test/office-engine-asar.test.ts) 使用 Electron Node 模式、实际 kit 的 index.js / cli.js 两份 engine selection 源码及真实 ASAR 文件，覆盖未安装 native 时解析 unpacked WASM、损坏 native 目录、无效 native manifest；不替代完整 WASM 转换/PPT 门禁或重打包验收。该测试已登记 Windows serial；Windows 原生执行结果仍需独立验证。

在 UOS 20 x64 / glibc 2.28 上应运行：

1. `npm run office:prepare`：下载并校验本平台锁定资源，生成 manifest 的 `platform: linux`；模板重算和预览仍走固定 Office CLI。
2. `npm test -- test/office-runtime.test.mjs test/office-engine-resolution.test.ts`：Python 创建/重读 DOCX/PPTX/XLSX、依赖闭包、插件实际激活、物理引擎解析和三种格式 PDF 转换。
3. 原生打包后运行 Office/PPT 门禁及安装应用预览，核对重算值、中文字体和图片。WASM 冷启动时间/内存必须实际测量；不能通过跳过门禁、放宽超时或改用系统 LibreOffice 声称支持。

Linux arm64、musl 及低于 glibc 2.28 的系统不在此次支持范围。跨平台只下载/解包不执行目标 Python；例如 `prepareOfficeRuntime({ target: 'linux-x64', output: '.build/office-runtime-linux-x64' })` 可用于独立载荷核查，不能替代上述原生执行。

## 通用 PPT 与模板 PPT

普通会话使用上游 `office-pptx` / python-pptx；开启现有 PPT 模式后使用 `dsh-ppt`、选中的模板及 `pptd_*` / `pptd_render`。校验或导出失败时修正原工程，不自动切换引擎。用户明确要求改变工作流时仍遵循用户指令。Word/Excel 不受 PPT 模式影响。

`dsh-skill@0.2.0-rc.2` 的最小补丁增加 `skills/invocation` waterfall：目录和技能正文读取均在发现缓存之后解析当前调用策略，不改 provider、优先级或资源归属。PPT 插件根据已有的会话状态，仅在模板模式中关闭 `office-pptx` 的模型调用；保留用户显式调用。`dsh-api-session-controller@0.2.0-rc.2` 的目录查询传入 Session ID，以覆盖 Agent 尚未激活的冷会话。监听器随 PPT 插件卸载，卸载后恢复上游默认策略；不增加第二份模式状态。

上游当前没有目录/加载共用的动态调用策略接缝，provider 的发现结果又会缓存，因此不能只修改静态技能声明。上游提供等价接缝后移除该补丁并迁移监听器。回归需同时覆盖缓存命中、直接模型加载、模式反复切换、会话隔离、冷会话与宿主 HTTP 目录；实际模型创作和界面预览仍需独立验收。

## Word 原生模板制作与交付

选中 Desktop Word 案例后，`office_template` 返回工作副本、稳定段落 ID 和原生文字样式 ID；`office_template_write` 直接沿用原文件的页面、字体、样式、边框、表格和页脚。内容由当前材料提供，新增正文从对应原段落复制样式，混合字体段落可以引用原 run。公文固定单位图片在工作副本准备阶段转为可编辑红色文字，源件继续用于预览与完整性核对。

编辑器通过官方 Sandbox/Subprocess 执行安装级 Python 与固定 worker，输出限当前工作区的新 DOCX。模板修订、工作区策略、取消和审计在准备、生成与交付阶段核对。Word 案例启用期间，`present` 通过公开工具准入接缝校验当前文件的嵌入字体、样式与主题定义、节设置、边框、表格、文字样式和页脚；有效输出才进入后续交付。普通 Word 任务继续使用官方创建流程，Excel/PPT 沿对应模式制作。
