# Desktop Office authoring

本改动属于 Profile 组合与后端激活阶段，不改客户端 bootstrap。普通 Profile 从安装 anchor 加载 `dsh-desktop-office`，组合上游 `dsh-skill-office` 与 `dsh-tool-workspace-dependencies`。Safe Mode 不加载该可选插件，Python 或技能资源损坏时保留独立恢复入口。

资源从当前 Desktop 的 `resources/office-runtime` 读取；开发时读取 `.build/office-runtime`。技能和 Python 必须在 ASAR 外，不能从中立 launch-root、Profile 或用户项目查找。依赖查询直接返回当前安装携带的只读 Python 路径，不复制到用户 Profile，不修改 PATH；升级后重新查询即使用新安装路径。LibreOffice CLI 使用 #646 的 Electron Helper / Electron executable 的 Node 模式与固定 CLI 入口，保留引擎物理路径解析。

Python 和 wheel 的固定 URL/SHA-256 来源：[上游固定提交的 primary-runtime lock](https://github.com/deepseek-ai/deepseek-harness/blob/639ed015397290b3745d163aafe02ffee4aa3f84/scripts/primary-runtime/lock.json)。本仓库仅保留 Windows x64、macOS arm64/x64 的 Python 相关输入；不携带第二份 Node 或 pnpm。新增 tar / fflate 为构建时提取工具，不增加 renderer 依赖。

构建阶段下载并校验固定资源、离线解包 wheel，不运行 pip install，不依赖系统 Python。生成物位于忽略目录 `.build`；构建失败不能继续消费旧 payload。包内验证必须实际调用 Python 创建、重新读取 DOCX/PPTX/XLSX、检查 ZIP 正斜杠路径，执行技能结构检查及 LibreOffice 转换。Windows 和 Intel Mac 的执行验收须在对应原生 runner 完成；其他平台的成功不可替代。

本地 macOS arm64 开发目录包实测 Office 资源约 205 MiB（包含 Python、numpy/pandas 与 Office 库）；这不是 DMG/NSIS 压缩增量。首次运行不做联网安装或 Profile 复制；安装时间增量取决于目标安装器的解压，需要原生产物对照测量。

## 通用 PPT 与模板 PPT

普通会话使用上游 `office-pptx` / python-pptx；开启现有 PPT 模式后使用 `dsh-ppt`、选中的模板及 `pptd_*` / `pptd_render`。校验或导出失败时修正原工程，不自动切换引擎。用户明确要求改变工作流时仍遵循用户指令。Word/Excel 不受 PPT 模式影响。

`dsh-skill@0.2.0-rc.2` 的最小补丁增加 `skills/invocation` waterfall：目录和技能正文读取均在发现缓存之后解析当前调用策略，不改 provider、优先级或资源归属。PPT 插件根据已有的会话状态，仅在模板模式中关闭 `office-pptx` 的模型调用；保留用户显式调用。`dsh-api-session-controller@0.2.0-rc.2` 的目录查询传入 Session ID，以覆盖 Agent 尚未激活的冷会话。监听器随 PPT 插件卸载，卸载后恢复上游默认策略；不增加第二份模式状态。

上游当前没有目录/加载共用的动态调用策略接缝，provider 的发现结果又会缓存，因此不能只修改静态技能声明。上游提供等价接缝后移除该补丁并迁移监听器。回归需同时覆盖缓存命中、直接模型加载、模式反复切换、会话隔离、冷会话与宿主 HTTP 目录；实际模型创作和界面预览仍需独立验收。

## Word 原生模板制作与交付

选中 Desktop Word 案例后，`office_template` 返回工作副本、稳定段落 ID 和原生文字样式 ID；`office_template_write` 直接沿用原文件的页面、字体、样式、边框、表格和页脚。内容由当前材料提供，新增正文从对应原段落复制样式，混合字体段落可以引用原 run。公文固定单位图片在工作副本准备阶段转为可编辑红色文字，源件继续用于预览与完整性核对。

编辑器通过官方 Sandbox/Subprocess 执行安装级 Python 与固定 worker，输出限当前工作区的新 DOCX。模板修订、工作区策略、取消和审计在准备、生成与交付阶段核对。Word 案例启用期间，`present` 通过公开工具准入接缝校验当前文件的嵌入字体、样式与主题定义、节设置、边框、表格、文字样式和页脚；有效输出才进入后续交付。普通 Word 任务继续使用官方创建流程，Excel/PPT 沿对应模式制作。
