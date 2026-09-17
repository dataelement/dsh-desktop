---
description: "dsh Web 客户端的 Trajectory 视图：按轮次组织的事件记录表加交互式时间概览，注册进对话视图环。"
kind: "package-reference"
---

# @deepseek-ai/dsh-client-ui-trajectory

[English](README.md) | 中文

## 概述

Trajectory 标签页让你以按轮次组织的事件记录表和交互式时间概览检查 agent 活动。它对用户、助手、工具、嵌套子工具和压缩记录分组，标示轮次与步骤边界，并为所选记录打开检查器，显示 token 用量、耗时、输入、输出、计时、图片和附件摘要。较长历史打开时定位于当前尾部，按需加载更早页面，并且只渲染可见行。流式输出期间，视图会跟随尾部，直到你向上滚动；进行中的记录只显示开始标记，不会虚构耗时。

## 目录

- [使用本包](#use-this-package)
- [理解实现](#understand-the-implementation)
- [进一步探索](#further-exploration)
- [模型体验](#model-experience)
- [已知限制与延期工作](#known-limitations-and-deferred-work)
- [开发备注](#dev-note)

-----

<a id="use-this-package"></a>
## 使用本包

在对话视图环中打开 Trajectory 标签页，把 agent 活动作为事件记录表与时间线查看。初始尾部完成定位前，记录表会用明确的加载行遮住真实记录；更早的前缀仍未加载时，首行控件会在点击时加载一页更早的历史，并在该页加载期间显示禁用的加载状态。

### 检查记录

选择、时间线导航、折叠与搜索只覆盖 React 可见窗口。请求编号与累计用量覆盖完整的驻留 snapshot。选择记录会打开局部检查器，查看 token 用量、耗时、输入、输出、计时与持久图片。图片 URL 使用 Conversation 拥有的逐会话缓存，因此 Chat 与 Trajectory 对每个附件共享一次已授权读取。用户记录会在文本旁显示通用文件数量；记录没有文本时，则显示图片与文件数量。独立运行的压缩请求会按时间顺序显示在自己的 `Between turns` 区段中，而带编号的压缩仍位于其所属轮次内。

### 时间概览

固定在记录表上方的 Overview 区域从左到右投影记录的真实开始时间与耗时；助手时间条区分记录到的 TTFT 与解码时间，悬停 500 ms 后可查看精确时刻与耗时详情。拖选区间会把记录表聚焦到该闭区间内任何时刻处于活动的记录；滚轮手势用于缩放时间域；右键单击会清除所选区间，在已放大的视口上按住右键拖动则会平移。初始视图与流式更新都停留在尾部；向上滚动会暂停跟随，因此新记录不会打断对旧记录的检查。

-----

<a id="understand-the-implementation"></a>
## 理解实现

<details>
<summary>实现细节——点击展开</summary>

视图是纯投影：Trajectory 自有的 Definition 从共享 Session 窗口组装业务记录——包括持久化的取消定稿前缀、只能从分片恢复的打断前缀与被打断的工具记录——因此 Trajectory 既不读取也不改变 Chat 会话快照。其 steering 分类器通过持久 splice state 只保留 next-step Inbox ID，并让后续 Context 共享当前 claimed batch。

完整的追加提示词在请求头未加载时显示为独立系统行；仅提供已知文本，不推断请求选项或工具目录。补入其请求历史后，该独立展示被替代而不重复提示词。历史中的系统提示词变更与最近的请求状态比较，包括没有新请求头的先前提示词更新。每个请求保留其所在位置生效的提示词与变更。包括压缩在内的 surface 替换会恢复最后一个非空的存活系统提示词，即使没有新的系统事件；未加载的提示词在对应分页到达前仍不可用。

### 虚拟行

长记录表最初只从挂载时尾部结束的 50 个 target Node 派生 React 数据。后续 Node 会扩展这个固定起点的窗口而不会逐出其前缀；现有加载控件会先显露更早的驻留 Node，再请求下一个 Session 页面。虚拟化只挂载可见行窗口加少量缓冲；仅含请求的分隔行并入下一个具备可测高度的虚拟项，语义行键与 ARIA 索引在向前补页后保持不变。虚拟化器负责结构性追加后的底部跟随；非虚拟记录表会直接写入末尾位置。仅含内容更新的流式帧会保持虚拟行的键与高度、复用测量结果，并且不会重复写入末尾滚动位置。已完成的回复会在 Trajectory target State 中保留组装后的 blocks、计时与用量，共享 Session 窗口则保留原始 Event。

### 布局

Trajectory 要求会话壳把 composer 作为浮层置于全高记录表上方；其响应式纵向滚动容器会预留 composer 的实时高度，确保仍可滚动到最后几行。可滚动的 Summary 区域在悬停或聚焦前保持滚动条滑块透明，同时不改变预留的滚动几何空间。本包不提供 service，也不声明 Context 合并。

</details>

-----

<a id="further-exploration"></a>
## 进一步探索

以下页面覆盖对话宿主与本视图所投影的会话数据。

- [ui-conversation](../ui-conversation/README.zh.md)——承载 `conversation.view` 环的聊天界面。
- [session-projection](../../session/session-projection/README.zh.md)——为客户端读取模型提供会话状态的服务注册表。
- [session](../../core/session/README.zh.md)——其窗口持有原始事件的会话 seam。
- [compaction](../../compaction/compaction/README.zh.md)——其请求出现在记录表中的压缩 seam。

-----

<a id="model-experience"></a>
## 模型体验

无。该包是浏览器端 UI 插件层，不注册任何面向模型的内容。

#### KV Cache 影响

无；该包既不组装也不发送提供方请求。

## 已知限制与延期工作

<a id="known-limitations-and-deferred-work"></a>


这些限制定义工作仍在进行时视图能显示什么；它们是当前包约束。

- **进行中时 Time 保持空白**：`partial` 与 `runningCalls` 行会显示运行状态，但不会虚构耗时，因此 Overview 区域只渲染开始标记，而不会杜撰实时跨度。记录选择与时间线选择位于 Trajectory 内部，不提供锚点深链接。

<a id="dev-note"></a>
### 开发备注

<details>
<summary>维护者的工作上下文——点击展开</summary>

无。

</details>

**运行时不变式：** 不发布伴生入口。这是纯消费插件，不发出 Cordis 事件，也不持有跨插件可变状态；view-slot effect 的释放由 slot ledger 与包测试观察。
