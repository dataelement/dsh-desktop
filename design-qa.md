# 研究工作区设计 QA

## 取证基线

- 设计源图：`/var/folders/rm/jy4dz49s171fl1dxd9qr3hh80000gp/T/codex-clipboard-f2975acf-dece-4160-8f9c-00d26c0524c3.png`，1380 × 900 px。源图是深色主题、研究页、空画布、右侧文件页签和红色迁移标注；标注表达把底部对话输入迁到右栏，不是成品 UI。
- 等尺寸实现图：`/tmp/sherlock-research-workspace-final-1380x900.png`，1380 × 900 CSS px，`devicePixelRatio = 1`，研究页、右侧对话、空画布状态。
- 等尺寸交互图：`/tmp/sherlock-research-workspace-final-artifact-1380x900.png`，1380 × 900 CSS px，`devicePixelRatio = 1`，显式加入并拖动一个助手回复卡片后的状态。
- 同画面对照图：`/tmp/sherlock-research-comparison-2760x900.png`，2760 × 900 px；左侧是 1380 × 900 源图，右侧是 1380 × 900 最终实现，二者均为研究页空画布状态，并在同一 comparison input 中等高并排。含助手卡片的实现图仅作为交互证据，不参与空状态视觉基准判断。
- 真实打包应用图：`/tmp/sherlock-packaged-research-final.jpeg`，1178 × 768 px；宿主当前可捕获窗口尺寸小于源图，但来自精确应用路径和 PID 19867，而不是主 checkout 的旧包。
- 精确应用路径：`/Users/heyafeng/Documents/ChatGPT/dsh/.worktrees/research-canvas-file-drop/dist-notarized/mac-arm64/Sherlock.app`。

## 全视图比较

在 `/tmp/sherlock-research-comparison-2760x900.png` 同画面对照中，实现保留 Sherlock 现有完整工作区侧栏，而源图使用较窄的概念导航栏；这属于既有产品壳层差异，不是本增量要替换的区域。两者均保持顶部研究导航、点阵纯画布和右侧独立面板。实现依规格采用 420 px 默认右栏并给中央画布剩余空间；源图的右栏约 480 px，属于草图比例。当前 1380 px 宽度下信息层级清楚，没有遮挡、溢出或重复输入框。

源图右侧展示 `Files` 是迁移前示意；确认后的方案要求最左固定 `对话`，因此实现将完整消息历史、动作、统计和输入框放在右栏，并把 `文件` 放在其后。顶部 `对话 / 研究 / 轨迹` 始终可见，中央只显示研究画布，退出研究的入口不会丢失。

## 右栏与输入框聚焦比较

- `对话` 位于右栏最左且处于选中态；DOM 与真实可访问性树均无 `关闭对话` 控件。`文件` 有独立关闭控件，右侧仍保留添加页签入口。
- 为保留单一 composer 状态，右栏在离开 Research 后仍保持挂载，但根节点同时设置 `inert` 与 `aria-hidden`；普通对话和轨迹页的真实可访问性树均不再暴露右栏页签、`添加到画布` 或第二个输入框，回到 Research 后语义与焦点能力恢复。
- 消息区独立滚动，输入框固定在右栏底部。实际 DOM 只有一个 `textarea`，占位文案为 `给智能体发消息`。
- 输入框保留命令、上传、访问模式、模型、上下文、发送与统计区域。聚焦测试还正向断言任务、队列、统计和 input snapshot 随同一 composer 移入右栏。
- 真实会话消息在窄栏中自然换行；长中文回复没有水平溢出，输入区与统计行不会覆盖消息动作。

## 视觉细节

- 字体：沿用 Sherlock 现有中文系统无衬线层级；标题、页签、正文、辅助信息的字号和明度关系稳定。
- 间距：顶部导航、画布边界、右栏页签、消息正文和底部 composer 使用一致的 8/12/16 px 节奏；三列分隔明确。
- 颜色：背景、点阵、卡片、输入框和弱化文字延续现有深色 token；蓝色研究页签及画布焦点状态在暗色背景上可辨。
- 图标与资产：沿用现有 Lucide/产品图标，没有引入与 Sherlock 不一致的新资产；复制、评价、添加到画布、分支等动作在窄栏仍可辨。
- 文案：顶部为 `研究`，右栏固定页签为 `对话`，文件页签为 `文件`，显式动作是 `添加到画布`，与确认方案及中文产品文案一致。

## 交互证据与边界

已在最终 1380 × 900 本地页面实际验证：Chat → Trajectory → Research 可往返；每个状态只有一个 composer；进入 Research 后中央出现唯一 `研究画布`，右侧默认选中 `对话`；切到 `文件` 后可返回 `对话`，且始终没有关闭对话控件；显式 `添加到画布` 后出现一个助手回复卡片；该卡片从 `{x: 510, y: 446}` 拖至 `{x: 605, y: 517}`；普通消息不会自动生成画布卡片。

受当前 Computer Use 跨应用拖拽能力限制，Finder → Electron 文件拖入未能自动执行；两文件框选、组拖、两档缩放、附件标签排序/删除、真实发送的流式/失败恢复/未读提示，以及应用重启后的文件和附件持久化也没有冒充为人工验证。这些行为由 96/96 聚焦测试覆盖，仍应由用户在保持打开的真实包中完成手动试用。

## 控制台与运行时

- 最终 1380 × 900 页面针对当前端口 `127.0.0.1:64951` 查询 error 日志，结果为 `[]`。
- 打包运行时与已安装依赖同时通过保护断言：顶层可选 conversation 不再注册 session chat store；右栏使用 session 所拥有的 conversation view；Research 面板不越权渲染 `conversation.view`；顶部 session header 在 Research 中持续挂载。
- `verify:package:mac` 验证签名和包内容通过；构建明确记录 `skipped macOS notarization`。

## P0 / P1 / P2 修复迭代

1. P0：打包应用进入 Harness recovery，原因为同一 conversation store handle 同时挂载到 `session` 与 `session-maybe`。增加打包运行时保护断言后，把 Research presentation 从 session owner 向可选根 owner 桥接，移除顶层重复 store 注册；修复后真实主界面可启动。
2. P0：进入 Research 后中间和右栏 React 子树消失，控制台报 `slot 'conversation.view' is not declared by this entry's children`。改为由 `ConversationSession` 在其合法 slot 所有权内创建 chat view，再随 presentation 传给右栏；修复后画布和右对话均正常渲染。
3. P1：Research 初次可见后顶部会话页签被条件隐藏，用户无退出路径。改为始终挂载 session header，并新增回归测试；最终真实界面保留 `对话 / 研究 / 轨迹`。
4. P1：非 Research 状态下，保持挂载的右栏曾只用透明度和 `pointer-events` 隐藏，键盘与辅助功能仍可到达；现增加 `inert` 与 `aria-hidden`，并把 `添加到画布` 限定为 Research 右侧对话动作。精确打包应用复核显示，普通对话与轨迹页的 AX 树均无右栏/动作，Research 中恢复且仍只有一个 composer。
5. 最终在 2760 × 900 同画面对照图及 PID 41769 的精确打包应用中复核后，没有残留可执行的 P0、P1 或 P2 视觉或可访问性缺陷。最终 Research 截图：`/var/folders/rm/jy4dz49s171fl1dxd9qr3hh80000gp/T/com.openai.sky.CUAService/Sherlock Screenshot 2026-08-26 at 9.22.10 PM.jpeg`。

final result: passed
