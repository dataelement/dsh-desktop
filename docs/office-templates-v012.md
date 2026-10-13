# Word / Excel 案例与官方 Harness 集成

## 格式切换连续显示 — 2026-10-12

绑定会话的 PPT 模式等待 Host 确认成功，再同步替换 Word / Excel 模板区；等待期间保留当前内容，失败显示错误。模式和模板提交按照当前会话修订接收结果，后续选择保持有效。尚未绑定会话时，清理选择保留已加载的 PPT 案例目录，进入 PPT 直接展示缓存内容。

组合两份真实客户端的 DOM 回归已覆盖绑定会话的等待 / 成功 / 失败、旧响应与后续 Word 选择，以及未绑定会话的目录缓存。195 文件 / 1849 项完整回归与类型检查 PASS；最终 Desktop Host 的逐帧视觉效果由用户复测。


## 与 PPT PR #675 综合 — 2026-10-12

合入 `PR #675@364e683461b62a6ef1b2e8f3b660ddd5f3ef8cb4` 的完整 PPT 版本，并保留 Word / Excel 模式服务、选择与持久化协议。Word 四个案例、Excel 三个案例继续平铺；会议内置 Skill、双页预览、工作表导航与当前用户材料替换流程保持。

基线为 `V0.12.0@ab419d21`，Harness `0.2.0-rc.2`、Kit `0.1.3`。干净安装重放、类型检查、194 文件 / 1845 项回归、综合开发包及包内 Office/PPT 加载与制作转换 PASS。PPT 42 个维护模块、45 个声明和两份客户端源 / 构建 / ASAR 一致，Office 8 个插件文件和 90 个资源一致，严格签名与 ZIP CRC PASS。综合版实际 Desktop UI、当前材料的模型生成、原生 Office 保存重开、Windows/WASM、首次字体授权、公证 NOT_RUN。


## Office r13：Excel 三个案例直接平铺 — 2026-10-12

- Excel 与 Word 共用按文件格式直接展示案例的逻辑；分类栏、分类筛选状态及对应样式已清理。Excel 三个案例直接展示，预览内保留工作表导航和双页阅读。
- 基线重新核实为 `V0.12.0@ab419d21f8973cd22db8e4971889840fef52d02f`，工作树 `codex/v012-office-templates`，安装 Harness `0.2.0-rc.2`、Kit `0.1.3`。
- 23 项界面回归及类型检查 PASS，覆盖不同 Excel 分类的三个案例同时显示、中英文名称、选用与工作表导航。最终开发包构建、包内 Office 制作及 PDF 转换、8 个插件文件与 90 个登记资源一致性、严格开发签名和 ZIP CRC PASS；最终包实际 Desktop UI、原生 Office 编辑保存重开、Windows、公证 NOT_RUN。
- [r13 交付记录与 macOS ARM64 测试包](/Users/dongjianghan/Documents/ChatGPT/workbuddy/outputs/office-template-harness-rc2-20261010/delivery-r13.md)。


## Office r12：采用已认可的会议纪要案例 — 2026-10-12

- 用户认可 DSH 内置 `meeting-recap` + 官方 `office-docx` 生成、修订并复核的三页成品；将原始 DOCX 作为 `meeting-minutes` 的权威模板，含五个议题与十五项行动记录。Word 四个案例平铺，Excel 保留三个案例，目录共 7 案例 / 55 页。会议案例沿用双页预览，第三页独立居中，并支持直接选用和做同款。
- 基线已合入本轮核实的远程 `V0.12.0@ab419d21f8973cd22db8e4971889840fef52d02f`；Harness `0.2.0-rc.2`、Kit `0.1.3`。Skill 明确相对期限、原文依据、原生标题、网格与列宽；用户当前材料替换案例中的全部事实。
- 184 文件 / 1688 项全量回归、类型检查、真实 Harness 模板复制与审计、会议结构及期限核对 PASS。最终开发包构建、包内 Office 制作 / PDF 转换、8 个插件文件、90 个登记资源哈希、7 案例 / 55 页原生检查及严格开发签名 PASS。
- 受限字体环境曾产生标题缺字预览；原生环境重建后逐页检查通过。构建在缓存发布和复用时执行标题字形覆盖检查；该已知标题检查用于拦截本次故障，完整成品仍逐页检查。批准的 DOCX 字节保持一致，SHA256 `b6183bbe83637defb3efe220fbfba6ddc9e5070a1e42aacf1168f9040f0deb5a`。
- 用户已认可会议成品质量；实际 Desktop UI、使用当前用户材料的新一轮生成、原生 Office 编辑保存重开、Windows、Apple 公证 NOT_RUN。原始转写及模型日志保存在本地评估目录；安装包收录成品及设计说明。
- [r12 交付记录与 macOS ARM64 测试包](/Users/dongjianghan/Documents/ChatGPT/workbuddy/outputs/office-template-harness-rc2-20261010/delivery-r12.md)。


## Office r11：Word 收敛为三个精选案例 — 2026-10-12

- 基线：重新核实远程 `V0.12.0@1fe2cd4b1c9ca9e81f29a40ece180236aa02ec33`，工作树 `codex/v012-office-templates`，Harness `0.2.0-rc.2`、Kit `0.1.3`。
- 实现：Word 直接展示公文写作、咖啡市场调研、小米汽车研究三份案例；撤下会议纪要、工作总结、日报和方案，清理相应生成器与安装资源。Excel 保留三个案例、分类与工作表双页交互。总目录 6 案例 / 52 页。
- 验证：184 文件 / 1675 项全量回归、23 项 Office UI 行为、类型检查 PASS；已保存的撤下案例呈现过期状态，用户可选择保留案例继续。最终构建、包内 Office 激活 / 文件制作 / PDF 转换、8 个插件源文件与 6 案例 / 52 页资源一致性、严格开发签名及 ZIP CRC PASS。实际 DSH 视觉、真实模型、原生 Office 保存重开、Windows、公证 NOT_RUN。
- 会议案例：[重新筛选与评审](meeting-minutes-case-review.md)，完整成品与原始材料配对后再引入。
- [r11 交付记录与 macOS ARM64 测试包](/Users/dongjianghan/Documents/ChatGPT/workbuddy/outputs/office-template-harness-rc2-20261010/delivery-r11.md)。


## Office r10：用途分类与 Word 代表案例 — 2026-10-10

- 基线：本工作树已合入当前远程 `V0.12.0@1fe2cd4b1c9ca9e81f29a40ece180236aa02ec33`；安装 Harness `0.2.0-rc.2` 与 Kit `0.1.3`，继续使用仓库锁定的 Office/Python 依赖。
- 实现：Word 按公文写作、会议纪要、工作总结、日报周报、方案报告、调研分析展示。重做阶段总结与项目实施方案，新增一页日报；目录为 7 个 Word 与 3 个 Excel，共 59 页。工作汇报 Skill 从原用户归档迁入并重写，日报和总结共享同一业务方法。
- 验证：4 个生成 Word 案例共 7 页经官方 Kit 导出与逐页 PNG 视觉检查 PASS，日报 1 页、总结和方案各 2 页。23 项 UI 行为回归 PASS，涵盖用途筛选、分类更新、格式切换及英文显示。184 文件 / 1676 项全量回归及类型检查 PASS；10 案例 / 59 页资源完整性、Word 分页 / 样式 / 表格结构、9 项 Excel 数值核对 PASS。最终构建、包内 Office 制作 / PDF 转换、8 个插件源文件 / 7 个业务 Skill / 10 个案例资源一致性、10 个案例工作副本复制、严格开发签名及 ZIP CRC PASS。实际 DSH 页面、真实模型、原生 Office 编辑保存重开、Windows、公证 NOT_RUN。
- [r10 交付记录与 macOS ARM64 测试包](/Users/dongjianghan/Documents/ChatGPT/workbuddy/outputs/office-template-harness-rc2-20261010/delivery-r10.md)。


本次在 `codex/v012-office-templates` 实现 Word、Excel 的案例入口、逐页查看和「做同款」。精选案例直接展示在模板列表，用户选择案例后，Agent 获得对应业务方法、官方 Office Skill 和可编辑工作副本。

## 基线与来源

- Desktop：初始基线 `V0.12.0@35b9f85ae06d6b19faa070b1c32f5f631bb474a2`；r8 合入 `upstream/V0.12.0@6c25786dae65c787b44692a7f34dae33fab3cc7a`，r10 再合入当前核实的 `upstream/V0.12.0@1fe2cd4b1c9ca9e81f29a40ece180236aa02ec33`。
- 安装的官方 Harness：`0.2.0-rc.2`；源码标签 `dsh-v0.2.0-rc.2@639ed015397290b3745d163aafe02ffee4aa3f84`。官方 Office 依赖、服务注入、工具和客户端协议均按该版本接入。
- 原 Word / Excel PR：#387、#424 均 CLOSED，合并时间为空。复用 #424 的 `08fe8ce64db6e30ebc701be8120fd4aca2ec0c2e` 中六个案例原始文件和六个业务 Skill。
- 官方 Office / 离线 Python 已由 #649 进入 V0.12.0；本次复用现有安装级运行时和 `@deepseek-ai/libreoffice-kit@0.1.3`。Python 3.12.14、python-docx、openpyxl 等依赖继续使用仓库锁定版本。
- 工作树：`.worktrees/dsh-desktop-v012-office-templates`。相邻 PPT 验收和旧 Office 工作树保持原状态。

## Office r9：精简 Excel 案例与双页阅读 — 2026-10-10

- 基线沿用已核实的 `V0.12.0@6c25786d`，Harness `0.2.0-rc.2`。
- 删除预算与费用表、项目任务台账、销售数据报表及对应生成逻辑；目录保留 6 个 Word 和 3 个 Excel 案例，共 58 页。
- Excel 复用 Word 双页阅读区，相邻两页等比并排，逐页展示工作表名称和页码。工作表标签定位到该表准确起始页；每次翻两页，奇数末页居中。
- 184 文件 / 1661 项全量回归（含 21 项 Office UI 行为）、类型检查及 9 案例 / 58 页资源校验 PASS；9 项 Excel 数值核对通过。工作表偶数起始页的末组键盘右翻与按钮边界一致。最终构建、包内 Office 制作 / PDF 转换、8 个插件源文件与 9 案例 / 58 页资源一致性、严格开发签名及 ZIP CRC PASS。实际视觉、真实模型、原生 Office 编辑保存重开、Windows、Apple 公证 NOT_RUN。
- [r9 交付记录与 macOS ARM64 测试包](/Users/dongjianghan/Documents/ChatGPT/workbuddy/outputs/office-template-harness-rc2-20261010/delivery-r9.md)。

## r8 按 PPT PR #675 对齐详细预览

样式参照固定的 `PR #675@fe63bb3c07d823bac7b4a2791d9e96717a3c24d3`，来源为 `packages/ppt-runtime/client/personal-template-manager.js` 的详细模板 viewer。本轮只调整 Office 自有客户端，PPT PR 的后续上传改动由原工作树继续维护。

Word、Excel 共用 1280×900 最大阅读弹窗、32px 视窗外边距、20px 内边距、16px 圆角和标题；内容区使用官方浅灰 hover token。小眼睛位于卡片左上，关闭按钮、居中翻页和黑底做同款按 PPT 对齐，窄窗口操作自然换行。Word 双页按阅读区尺寸等比显示、各页标号、每次翻两页；Excel 保留工作表标签。弹窗内键盘焦点循环，关闭后返回入口；点击弹窗内留白保持阅读，点击外部遮罩关闭。

184 文件 / 1659 项全量回归（含 19 项 Office UI 行为）、类型检查和构建 PASS。独立临时 Harness 启动 PASS；浏览器安全策略阻止访问本地预览页，实际深浅主题及窄窗口视觉验收 NOT_RUN。最终开发包构建、包内 Office 制作 / PDF 转换、8 个插件源文件及 12 案例 / 64 页哈希、严格开发签名 PASS。真实模型与原生 Office 编辑保存重开继续由用户独立验收。

## r7 封面与选中状态

预览保留关闭、翻页、工作表标签和做同款。Word 双页直接适合阅读区尺寸。

Excel 封面和输入框缩略图以表头为起点裁切上半部分；较宽工作表按阅读区比例放大并从左上截取，突出列名和数据。卡片前景延伸至底边，hover 仍只放大文档。Word / Excel 底板分别使用 5% / 6% 类型色混合。

Word / Excel 模式选中使用官方主题的 primary label 作为底色、primary foreground 作为文字色；浅色主题为黑底白字，深色主题按官方反色显示。宿主模式栏的基础样式使用 important，本插件在自身选中状态选择器中明确颜色优先级，保持公开 seat 的几何与其他按钮样式。

实际 Harness 验证封面、输入框缩略图、预览移除放大入口、双页、Excel 工作表与做同款、深浅主题和 520px 窄窗口 PASS。184 文件 / 1656 项回归、类型检查、最终开发包构建、包内 Office 制作 / PDF 转换、源码与资源一致、严格签名 PASS。

本轮重新核实安装 Harness 0.2.0-rc.2；选定 V0.12.0 的保留基线仍为 35b9f85ae06d6b19faa070b1c32f5f631bb474a2。2026-10-09 本轮远端查询已不再公布同名 V0.12.0 分支，本次沿用当前 feature worktree 的已选基线完成 UI 调整。

## r6 Word 双页阅读

Word 多页案例使用横向双页模式：1–2、3–4 顺序翻页，每张纸下方标明原页码，底部显示当前位置范围。页面同高、保持各自原始比例；奇数末页保留双页尺度并居中。上一组 / 下一组和左右方向键切换两页，Home / End 定位首末组，翻页后焦点保持在阅读区。

双页尺寸同时适配阅读区宽度与高度；放大阅读可滚动，切换页组或缩放会复位两个方向的滚动。两页一起加载成功才展示，单页失败显示重新加载，翻页取消旧请求。Excel 沿用单页和工作表标签。

184 文件 / 1656 项全量测试与类型检查 PASS。实际官方 Harness 验证：1280×720 默认窗口、520×720 窄窗口与 1280×520 短窗口完整显示双页；公文 1–2 / 3–4、7 页报告的末页居中、方向键连续操作、放大滚动和会议纪要双页做同款 PASS。最终开发包构建、原生 Office 制作 / PDF 转换、源码与资源一致和严格签名 PASS。真实模型由用户在 DSH 用原文验收。

## r5 预览与会议纪要

Word 预览统一使用官方 Kit 导出的 PDF 页面。公文红色抬头旁的细灰框来自 Writer 编辑视图中的图片边界；PDF 页面保持原文内容和正式版式，原始 DOCX 逐字节保留。

会议纪要案例重做为两页：第 1 页呈现会议信息、已定事项和议题记录，第 2 页呈现行动项、待决事项与跟进方式。正文 11pt、主标题 23pt、一级标题 14pt，页边距约 2cm；表格使用浅色表头、细灰边框和自动行高。

`meeting-recap` 沿用原用户归档的 MIT 许可，本版正文与校验器按 DSH 当前需求重写。归档此前被称为“Kimi 185”，现有记录能确认归档与 PR 迁入链路，官方作者身份待核实；公文 Skill 来自 WorkBuddy。详情见 [来源记录](office-template-sources.md)。

验证状态记录在 [STATUS](STATUS.md)。真实模型摘要质量由用户在 DSH 使用会议原文验证。

## 外显案例

| 格式 | 当前外显案例 |
| --- | --- |
| Word | 公文写作 · 通知、会议纪要 · 发布会筹备、中国现制咖啡市场调研报告、小米汽车研究报告 |
| Excel | 年度经营与客户分析、青岚港货物流向与作业效率、荧光酶活性筛选与批次质控 |

共 7 个案例、55 页预览。Word 直接展示四张卡片；Excel 直接展示三个案例，并保留双页与工作表导航。案例以原生 DOCX/XLSX、设计说明和登记的输入材料为权威源。

工作总结、日报和方案三个案例已撤下；旧会议案例由本次用户认可的三页成品替换，历史输入可从 r10 提交恢复。业务方法继续由独立 provider 提供，文件制作使用官方 Office Skill。会议案例已完成成品、原始记录、决策与行动依据、原生可编辑文档及逐页视觉核对，评审见 [会议案例评审](meeting-minutes-case-review.md)。

Word 沿用 PPT 的模板选用流程：点击案例卡片直接选用，小眼睛打开完整预览，预览内支持翻页和「做同款」。页面自动适合阅读区，支持键盘翻页和 Esc 关闭。Excel 使用同一双页交互，并按工作表准确起始页切换预览；每页标注工作表名称及页码。Word 以四张卡片直接展示，Excel 以三张卡片直接展示。模板选择随会话保存；Word、Excel、PPT 共用已有 Host 状态和审计层，切换输出格式时清理前一格式的模板选择。

r4 以当前 V0.12.0 已改版的 PPT chooser / input accessory / opening preview 为样式基准：分类靠左、12px 单行居中标题、9px 卡片圆角、单色 18px 模式图标；预览采用 760px 最大宽度、20px 内边距、16px 标题、28px 关闭按钮和居中 32px 翻页按钮。Word / Excel 保留浅色文档底板及内容层缩放，沿用自身独立插件和公开主题 token。

卡片选用与查看分别作为两个按钮：点击卡片直接加入输入框，小眼睛打开完整预览，预览内继续支持「做同款」。模板区使用已有 Composer seat / scroll 标记读取与 PPT 相同的宽度和可用高度，以零高度根节点承载下方独立面板；打开模板区时输入框保持原位。ResizeObserver、resize 监听和待执行帧均随组件清理。

Word 卡片使用浅蓝背景，Excel 使用浅绿背景，前景文档带圆角和阴影；悬停只将前景文档放大 4.5% 并上移 3px，背景层保持原尺寸与变换。主题颜色使用现有语义变量，触屏显示查看按钮，键盘焦点显示查看按钮；减少动画规则关闭移动与缩放。实际 Harness 中 Word、Excel、PPT 面板均为 left=420.5 / top=477 / width=712，打开 Word 前后输入框 top=351；520px 窄窗口双列，页面宽度保持 520px。深色主题和减少动画规则通过独立静态样式 fixture 验证，真实模型验收继续由用户在 DSH 完成。

案例卡片与输入框选中图共用同一缩略图组件：竖版首屏按原始比例展示上 50%，横版首屏展示整张，图片铺满宽度。选中图采用改版 PPT 的 16:9 外框、76–92px 响应式宽度、蓝色选中边框和轻微倾斜；取消按钮在悬停 / 键盘焦点时显示，触屏直接显示。输入框仅展示图片和取消按钮；案例名称保留在列表、完整预览和无障碍标签。完整预览继续使用整页图。实际 Harness 已验证会议纪要卡片和输入框的半页裁切、Excel 横版整图及 520px 窄窗口换列；模型生成由用户在 DSH 中提供原文验收。

客户端以完整响应记录目录的加载完成状态；首次请求期间连接重置、重连及 PPT 切换均取消旧请求并读取当前目录。已选择的输出格式继续保留，初始空状态与有效目录分别处理。

## 依赖与执行路径

`dsh-desktop-office` 保留官方 `office-docx`、`office-xlsx`、`office-pptx`，通过独立的 `dsh-desktop-office-business` provider 加入业务方法。客户端使用公开 Slots、Locale、Connection；Host 在已鉴权的 Connection 通道注册精确 Office 路由。模板目录保留完整 SHA-256 与版本，预览和选择都校验当前版本。

Agent 每一步从当前会话恢复格式和案例上下文，覆盖压缩、恢复及任务中途选择。`office_template` 工具校验所选版本、当前工作区写入策略和调用取消信号，通过官方 Sandbox/Subprocess 执行固定资源复制器，在工作区创建独立目录。复制完成核对文件哈希，并记录审计事件。后续制作由官方 Skill、安装级 Python 和 Kit 完成，最终通过 `present` 交付。

模板预览由相同的官方 Kit 重算、渲染原生文件后生成，全部资源放在安装目录的 `office-runtime/templates`；业务 Skill 放在 `office-runtime/business-skills`。dev、build、pretest、package 统一调用 `office:prepare`；生成的预览、清单和缓存位于忽略的 `.build`。Git 维护原始输入、生成器、客户端、Host 和测试。

Office 归一化脚本统一 ZIP 顺序、时间和文件元数据，并把 Kit 分配的随机图表轴 ID 映射为稳定的局部 ID，完整保留轴引用关系。重复官方重算的哈希检查覆盖该契约。

本次迁移范围为案例与对应业务方法。旧 PR 的全部 186 个业务 Skill、17 个独立编辑工具及旧 Windows 运行时保留在原 PR；此分支采用官方文件制作、重算与预览依赖。

## 初始实现验证记录（历史）

| 验证 | 状态 | 证据 |
| --- | --- | --- |
| 类型检查 | PASS | `npm run typecheck` |
| 构建 | PASS | `npm run build` |
| 全量回归 | PASS | 183 个文件、1646 项测试，含真实 Harness、工作区沙箱复制、重复重算的稳定哈希、首次目录加载 / 重连和直接选用 / 独立查看 |
| 案例资源 | PASS | 12 份原生文件、64 页预览完整哈希、ZIP CRC |
| Excel 数值 / 原生结构 | PASS | 23 项独立数值核对；公式错误为 0，图表和原有冻结位置保留 |
| 实际 Harness 浏览器 | PASS | Word 案例、会议纪要翻页与选择、刷新恢复、Excel 工作表切换、Esc、Excel→PPT→Word |
| macOS ARM64 开发应用 | PASS | 最终包内 12 案例 / 6 业务 Skill / 官方运行时；原生制作与转换、8 个 Office 源文件逐字节一致、严格签名、全部 12 案例真实工具复制与哈希核对；包内 Harness 浏览器复测 Word 目录、会议纪要预览和选择 |
| 真实模型生成 | NOT_RUN | 当前验证使用真实 Host 和工具，模型调用单独验收 |
| 原生 Word/WPS/Excel 编辑、保存、重开 | NOT_RUN | 独立于 Kit 预览和文件结构检查 |
| Windows / macOS x64 安装 | NOT_RUN | 需各自原生构建与验收环境 |

Kit 报告部分字体缺失，现有中文页面已目视检查。目标系统字体与原生 Office 排版保真需在安装后的 Word/WPS 中继续验收。发布、公证及 PR 合并分别记录。

WPS 使用独立临时副本尝试打开会议纪要，原生窗口短暂显示文件名，随后回到原文档窗口；本次未取得稳定查看、编辑、保存与重开的完整证据。原生 Office 验收继续保持 `NOT_RUN`。开发应用采用 Apple Development 签名，Apple 公证 `NOT_RUN`；实际 Harness 联验使用独立临时 Profile，测试与用户已有数据分开。
