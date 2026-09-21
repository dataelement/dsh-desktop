# Office 功能实施与验证状态

更新日期：2026-09-20。PR #424 已在开发目录对齐 `V0.9.1@9b2d2cf17e8f25f3c3cc1af297a25760cb0731f0`，Harness 为 `0.1.5-rc.2`。Windows 补充实现和验收说明见 [交接文档](office-acceptance/windows-handoff.md)。

## 本次 Windows 补充

- Windows x64 使用 AppContainer/LPAC 执行 Office 作者脚本和 LibreOffice；运行时只读、任务目录可写、网络能力关闭，采用 Job 对象管理子进程、取消、超时、内存与进程数。
- Windows 转换使用 LibreOfficeKit 稳定 C API，每次调用独立进程和 profile；文档加载关闭宏执行、自动取消交互对话框，并保持原有公式独立核对。
- 固定版本 Python/openpyxl、LibreOffice 和原生执行器随开发包与正式包提供。构建验证下载及引擎 SHA-256，运行时按安装位置定位，支持应用移动。
- Windows CI 强制运行真实 DOCX/XLSX 生成、局部修改、公式重算、PDF 预览和隔离测试；打包后在源码目录之外再次运行完整 Office 检查并上传证据。
- 本地使用 Desktop 内置 Node `24.9.0` 全量回归通过：128 个文件、1132 项测试；7 项目标平台/引擎测试在 macOS 环境跳过。类型检查、应用构建和 51 项运行时与发布定向回归通过。版本合并后的测试夹具已按当前 Host 服务合同适配。
- [Windows CI](https://github.com/dataelement/dsh-desktop/actions/runs/35491099351) 验证代码提交 `e1354100`：14 项原生功能与隔离定向测试通过；全量回归 127 个文件、1130 项测试通过，2 项平台测试跳过；类型检查、构建、恢复界面检查通过。Windows Server 2022 x64 上生成开发安装包，移出源码目录并放入中文和空格路径后的 Harness 启动、koffi、Office/PPT RPC、188 个 Skill、678 项资源哈希、17 个工具和真实 Word/Excel 生成、修改、独立公式核对、图表与 PDF 预览均通过。安装包与产物下载见交接文档。
- 同事实机使用 Windows 10/11 x64 当前用户安装；受保护的全用户安装目录需要单独配置执行器的 ACL 管理权限与验收。Windows 实机界面、真实模型任务、Word/Excel/WPS 保存重开为 `NOT_RUN`。最终代码后的交接记录更新只涉及文档。

以下保留 2026-09-14 原提交的历史验证范围。

## 已实施

- 新会话输入框上方提供 Word、Excel 与 PPT 模式；共享持久化、串行化和审计的会话状态，切换后按所选格式加载基础 Skill。
- 内置 DSH 自有 Word / Excel 基础 Skill、186 个业务 Skill 和 17 个工作区工具；业务资源按需读取并核验哈希，原始条款及出处保留。
- 支持文档和工作簿创建、版本绑定的局部修改、公式重算、检查与 PDF 预览。macOS 使用 Seatbelt 开发沙箱，Linux 运行路径要求 bubblewrap；执行时使用独立任务目录及声明的输入副本。
- Word 三例：现制咖啡市场调研、小米汽车研究、中国中车质量安全月通知。Excel 三例：年度经营与客户分析、港口货物流向与作业效率、荧光酶活性筛选与批次质控。卡片打开只读预览；Word 按页滚动，Excel 支持切 Sheet 与连续滚动。预览底部提供“做同款”，选择后输入区只显示与 PPT 一致的小幅倾斜预览图，悬停或键盘聚焦后可移除。
- “做同款”选择保存在会话状态中，模型步骤会收到案例版本、设计说明和明确的 `office_template` 调用要求。带制作源码的案例复用可执行源码和固定输入结构；原生 Word/Excel 案例复用受控工作副本和设计说明。案例只提供版式、视觉语言与结构，全部内容来自当前任务材料。
- 中国中车红头公文案例固定绑定用户提供的 WorkBuddy `gov-doc-writing` v2.0.4；`dsh-word` 只承担 DOCX 生成与检查。此前对比产物使用的 `chinese-official-writing` 未进入当前运行目录。
- macOS arm64 开发包可显式装入 Python/openpyxl 与 LibreOffice；提供运行时装配和完整包验证脚本。
- electron-builder 默认排除的 Skill `.gitignore` 资源通过受限额外资源规则原路径装包，业务目录登记的 678 个文件均可在 App 内按哈希读取。
- Office 案例和业务 Skill 资源在 Git 中按原始字节检出，Windows 不再将换行转换为 CRLF，目录版本在各平台保持一致。
- Office/PPT 插件直接拥有 Host Web 路由，并复用 Connection 的 Host/Origin 限制与浏览器会话认证。打包后的 `/dsh-office`、`/dsh-ppt` 和兼容 `/kimi-ppt` 通道均从实际 Host 路由接收请求。
- 最新 `main` 的灰度发布脚本补充公开类型声明，相关测试在严格 TypeScript 检查下通过。
- Harness 启动失败后的停止流程等待后台子进程退出和日志句柄关闭，后续启动与 Windows 临时目录清理不会再与旧进程竞争。

## 验证证据

| 检查 | 状态与范围 |
| --- | --- |
| 依赖与补丁 | PASS：当前锁文件保持不变；22 个补丁全部应用，最新 `pi-ai` 会话头补丁的 7 项测试通过 |
| 本次功能定向回归 | PASS：本次反馈定向 4 个文件、23 项测试；覆盖输入区纯缩略图、版式参考约束、公文 Skill 精确绑定与案例准备 |
| 自动回归 | PASS：110 个文件、971 项测试；另有 1 个文件、3 项测试按环境条件跳过 |
| 类型与构建 | PASS：npm run typecheck、npm run build |
| Windows CI | PASS：GitHub Actions run `34838517299`；109 个文件、969 项测试通过，2 个文件、5 项测试按平台条件跳过；类型检查、构建、三档缩放恢复界面检查、隔离开发包与打包后 Harness 冒烟通过 |
| 模式切换资源 | PASS：PPT 包变动限于模式状态、客户端同步与类型；192 项预览清单语义一致，其余包内资源字节一致 |
| Office 制品完整性 | PASS：案例、设计说明、制作源码和预览均绑定目录版本；包内 678 个业务资源逐文件校验哈希 |
| 打包工具链 | PASS：本次 macOS arm64 包加载 188 个 Skill、678 个业务资源与 17 个工具；纯缩略图选择/取消、版式参考约束、公文 Skill 绑定、五个可执行或可修改案例及基础读写链路通过；DMG 和 ZIP 完整性通过 |
| 打包后 Host RPC | PASS：从应用包内启动 Harness，`/dsh-office/mode`、`/dsh-ppt/presentation/mode`、`/dsh-office/state` 均返回成功，状态按 `word → ppt` 共享切换 |
| Desktop 原生界面 | 本次“做同款”界面为 NOT_RUN，等待新包本地验收；上一份已验收包的案例预览、切 Sheet、滚动与返回为 PASS |

结构化证据与截图见 [office-acceptance](office-acceptance/)。本次 macOS arm64 开发包 SHA-256：DMG `987ae442a3c74370cb8635aaeed39ed10ab99fe61c755781434f11c6bd21845f`；ZIP `ef72e5fc87f124b53af19fd119e1cafa8d02416db7dc45da53fbe47639879616`。

## 独立验收边界

2026-09-14 的历史交付范围为 macOS 开发链路。本次 Windows 实现以新 CI 和交接文档为准。Linux 实机、完整生产资源配额、目标模型自主完成、原生 Word/Excel/WPS 编辑保存重开、Developer ID 签名及 Apple 公证均使用各自的验收证据。包内工具验证与 Desktop 界面验证分别记录。
