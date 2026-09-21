# PR #424：Windows Word / Excel 交接

## 基线与交付范围

- 目标：`dataelement/dsh-desktop` 的 `V0.9.1@9b2d2cf17e8f25f3c3cc1af297a25760cb0731f0`。
- 原 PR 头：`6343ae89c53c8d431164237bc758037cd8989f7c`；Harness：`0.1.5-rc.2`。
- 开发目录：`.worktrees/dsh-desktop-office-windows-v091`。旧目录的缩略图渐变改动保持独立。
- 本次补充 Windows 10/11 x64 的脚本生成、公式重算、PDF 预览和离线运行时装包。
- Windows ARM64、Linux 实机、模型自主完成和 Word/Excel/WPS 保存重开使用独立验收记录。

## 实现

Office 工具继续通过 Host 工作区策略、审计和版本校验。JavaScript、Python 和 LibreOffice 由专用原生执行器放入每次操作独立的 Less Privileged AppContainer。输入先复制进任务目录，运行时目录只授予读取和执行，任务目录授予写入。系统资源遵循 Windows 的 LPAC 访问策略；`registryRead` 用于系统运行库、字体和区域设置。执行器仅继承标准输出/错误句柄，子进程环境通过固定白名单构造。

执行器采用 `PROC_THREAD_ATTRIBUTE_ALL_APPLICATION_PACKAGES_POLICY` 退出普通 AppContainer 的通用文件授权。令牌仅提供 `registryRead`，网络能力列表为空。创建 Job 后以挂起状态启动子进程，加入 Job 再恢复执行；Job 限制 64 个进程、2 GiB 总内存，并在超时、取消及主进程结束时终止进程树。每次操作撤销该任务 SID 的目录授权并删除私有 AppContainer profile。操作系统仍为 AppContainer 提供独立的临时 profile 存储；该 profile 也随操作清理。进程被操作系统强行终止时，残留 profile/ACL 需要按任务记录清理，后续任务使用新 SID。

Python `3.13.12`、openpyxl `3.1.5`、et_xmlfile `2.0.0`、LibreOffice `26.2.6` 和原生执行器随 Windows 安装包提供。Windows 转换器使用 LibreOfficeKit 稳定 C API，在进程内加载、重算和保存文档，宏执行关闭、交互对话框自动取消；每次调用使用独立 profile。下载地址和 SHA-256 固定在 `scripts/office-runtime-windows.json`；打包前再次核对可执行文件校验值。开发包和正式包共用运行时配置。用户安装测试包后可离线调用 Office 工具。

这里的隔离与功能测试对应 Desktop Office 操作。全局 G3 生产验收还包括 CPU、磁盘配额及完整逃逸测试等独立要求。

参考：[Microsoft AppContainer / LPAC 文档](https://learn.microsoft.com/en-us/windows/win32/secauthz/implementing-an-appcontainer)。

## Windows 构建与自动验证

构建机要求 Windows x64、Node.js 22、PowerShell 7、Visual Studio 2022 C++ x64 Build Tools。运行：

```powershell
npm ci
$runtime = Join-Path $PWD '.office-runtime/win32-x64'
./scripts/stage-office-runtime-windows.ps1 -OutputRoot $runtime
$env:DSH_OFFICE_BUNDLE_ROOT = $runtime
$env:DSH_OFFICE_TEST_PYTHON = Join-Path $runtime 'python/python.exe'
$env:DSH_OFFICE_TEST_LIBREOFFICE = Join-Path $runtime 'libreoffice/program/soffice.com'
$env:DSH_OFFICE_TEST_OUTPUT = Join-Path $PWD 'artifacts/office-windows/native'
$env:DSH_OFFICE_REQUIRE_NATIVE = '1'
npm test
npm run typecheck
npm run package:dev:win
node scripts/verify-office-package.mjs --app "$PWD/dist-dev/win-unpacked" --output "$PWD/artifacts/office-windows/packaged"
```

输出目录每次使用新路径，保留旧结果。CI 自动执行以上功能检查，并把安装包移出源码目录后再次验证运行时发现、内置案例、DOCX/XLSX 创建与修改、Excel 数值独立核对、PDF 导出及 Word/PPT 状态切换。隔离测试覆盖普通 AppContainer 可读文件的拒绝访问、越界写入、网络拒绝、环境变量隔离、子进程清理、取消和超时。

已验证代码提交：`e13541001ef4681d9c722a19d075a5de1a4c3842`。后续交接记录更新只涉及文档。

- [Windows x64 开发安装包](https://github.com/dataelement/dsh-desktop/actions/runs/35491099351/artifacts/10599840107)：下载并解压 `windows-x64-dev`，运行 `dsh-desktop-dev-windows-x64-setup.exe`。压缩包约 601 MB，包含 Office 引擎。
- [Office 自动验证产物](https://github.com/dataelement/dsh-desktop/actions/runs/35491099351/artifacts/10599406142)：生成文档、预览、审计记录和 `packaged/verification.json`。
- [完整 Windows CI](https://github.com/dataelement/dsh-desktop/actions/runs/35491099351)：Windows Server 2022 x64，全部要求步骤通过。Windows 10/11 实机由下述清单验收。

## 同事实机验收

使用对应提交的 Windows 开发安装包；记录 Windows 版本、账号权限、安装目录、DSH 版本和所用模型。开发包显示为 DSH Desktop Dev。

1. 用普通用户选择“仅为我安装”，使用当前用户拥有的目录（可包含空格或中文），启动并确认 Word、Excel、PPT 模式与案例预览可用。依次切换，重开会话检查选中状态。执行器需要为每次任务添加和撤销运行时目录的只读 ACL；管理员统一部署到受保护的 Program Files 目录需要另外配置权限与验收。
2. Word：选择咖啡市场调研“做同款”，提供新材料，生成含中文、标题、表格、页眉页脚的 DOCX；修改一个金额，再打开生成文件和 PDF 预览。记录文档内容、排版、字体及分页结果。
3. Excel：生成采购表和原生图表（材料 A 数量 3、单价 120；材料 B 数量 5、单价 80），合计应为 760。把 A 数量改为 4，执行重算后检查 A 金额 480、合计 880、图表与 PDF 预览。
4. 在 Windows Word / Excel 或 WPS 中打开、编辑、保存、关闭再打开上述文件；分别记录使用的应用和结果。确认公式、图表、中文和页眉页脚保持正确。
5. 生成较大文档时取消任务，立即再生成小文档；检查新任务完成、应用保持可用、原文件保留。安装完成后断网，可使用自动验证脚本生成确定性测试文件；模型调用联网需求按配置另行验收。
6. 把测试结果、失败提示、日志和受影响的生成文件附到同一份验收记录中。

## 证据状态

- 本地 macOS，Desktop 内置 Node `24.9.0`：全量回归 128 个文件、1132 项测试通过，7 项平台/引擎测试跳过；Windows 路径、命令参数、私有 profile 和环境合同定向测试通过；类型检查和应用构建通过。
- Windows 原生 Word/Excel 创建、局部修改、公式重算、图表、PDF 导出及访问隔离与进程清理：14 项定向测试通过；全量回归 127 个测试文件、1130 项通过，2 项平台测试跳过。类型检查、构建和三种显示缩放的恢复界面检查通过。转换器在同一线程运行 LibreOffice 事件循环与文档操作，解决 Excel 加载时的跨线程窗口死锁。
- 完整安装包移出源码目录、放入含中文和空格的路径后，Harness 启动、原生 koffi、Office/PPT RPC、188 个 Skill、678 项资源哈希、17 个工具、案例生成和修改、Word/Excel 生成和修改、独立公式核对、图表及 PDF 预览全部通过。专门的资源目录复制规则保留运行所需的 README、许可证和隐藏资源。[最终 CI 记录](https://github.com/dataelement/dsh-desktop/actions/runs/35491099351)。
- Windows 生成的采购 Word 与 Excel PDF 已做视觉检查，中文、表格、页眉页脚、480/400/880 的金额与柱状图显示正常；该证据为 PDF 检查。
- 同事 Windows 实机界面、真实模型任务、Word/Excel/WPS 保存重开：`NOT_RUN`。
