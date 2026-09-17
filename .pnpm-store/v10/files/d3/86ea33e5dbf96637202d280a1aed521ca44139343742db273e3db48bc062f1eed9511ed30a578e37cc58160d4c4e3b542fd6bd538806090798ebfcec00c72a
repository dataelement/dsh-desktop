---
description: "面向注册可信外部事件策略并创建 Workspace Session 的维护者，说明 webhook 规则运行时。"
kind: "package-reference"
---

# @deepseek-ai/dsh-webhook

[English](README.md) | 中文

## 概述

`dsh-webhook` 提供 Host 侧的 `ctx.webhookRuntime`：它既是受信任程序化 webhook 规则的注册表，也拥有唯一内置动作——在 Web Workspace 中创建普通根 Session。接口只包含 `register(rule)` 和 `dispatch(delivery)`；提供方身份验证属于适配器包。当受信任规则必须把外部事件变成新的 agent Session 时，请使用它。

## 目录

- [规则接口](#rule-interface)
- [Session 请求](#session-request)
- [组合](#composition)
- [Model Experience](#model-experience)
- [Known Limitations and Deferred Work](#known-limitations-and-deferred-work)
- [开发备注](#dev-note)

-----

<a id="rule-interface"></a>
## 规则接口

`WebhookRule<K>` 具有带品牌类型的唯一 `id`、提供方 `kind` 与 `run(delivery, signal)`。回调可以执行任意受信任代码，并返回 `null` 或一个 `WebhookSessionRequest`。同类规则彼此独立启动；某个规则抛出或拒绝只会记录日志，不会阻止同级规则。

`VerifiedWebhookDelivery` 携带提供方种类、已配置来源 id、提供方交付 id、规范化的无损 JSON 与接收时间。runtime 会在共享前快照并冻结完整值。`deliveryId` 仅是来源信息；重复交付会再次运行规则。

注册是一项 effect。它的可等待 disposer 会先隐藏规则，再中止并排空活动回调。回调必须观察所提供的 signal；忽略取消的同进程代码无法被安全强制停止。

<a id="session-request"></a>
## Session 请求

`WebhookSessionRequest` 要求 `workspacePath`、`title`、`prompt`、`agentPreset` 与 `permissionPreset`；可选 `model` 会指定明确的提供方／模型路由与输出 token 上限。明确路由使用其适配器的默认推理强度。省略时会快照包含推理强度的完整当前部署选择，直到首个请求记录持久 header；之后的 Web 模型变更保留普通 Session 行为。

runtime 会在变更状态前验证 preset，解析或创建规范 Workspace，以该 Workspace 路径作为 `SessionHeader.cwd` 创建 Agent，在发布前挂载 agent preset，并在应用权限、标题与提示词前附加 Session。附加失败会释放尚未提交动作的 Agent。之后若在提示词前失败，则以尽力而为方式脱离 Workspace 并释放 Agent。

成功的 `Agent.followup()` 是 webhook 操作的提交点。消息使用 `source.kind: "webhook"`，并携带提供方、来源、交付与规则来源信息。runtime 不等待 idle、不执行特殊 flush、不检查回复，也不发布完成状态；之后完全由普通 Agent 与 Session 行为接管。

<a id="composition"></a>
## 组合

在 Web Host plane 上，于 Agents、模型默认值、agent presets、permission presets、标题与 Workspace 注册表之后加载 runtime。用户编写的规则插件注入 `webhookRuntime`，并通过自己的 effect 交出 `register()` 返回的 disposer。

[GitHub 评审指南](../../../docs/user/guide/github-review.zh.md)展示了规则模块、专用入口端口、密钥设置与 Workspace 路由。

<a id="model-experience"></a>
## Model Experience

### 规则编写的初始提示词

#### What the model sees

每个匹配规则都会让模型看到 `WebhookSessionRequest.prompt` 返回的非空文本原文。通用 runtime 不增加私有框架；若规则包含外部文本，则由规则负责标明其信任属性。随附 GitHub 示例会把选定 PR 字段标为不受信任的 JSON 元数据。

#### Token effect

一条依赖数据的 user-role 消息保留在新 Session 中，并持续贡献 token，直到普通 compaction 替换或移除该历史。

#### KV Cache effect

初始提示词开启一个新 Session，因此它建立而不是使该 Session 的可复用请求前缀失效。

## Known Limitations and Deferred Work

<a id="known-limitations-and-deferred-work"></a>

- **仅限进程内 fire-and-forget** — 崩溃会丢失尚未接纳提示词的规则调用；不存在队列、重放或重试。
- **无内置去重** — 提供方重复交付可能创建重复 Session；需要幂等性的规则自行负责。
- **无完成结果** — HTTP 接受与规则结算都不报告 Agent 成功、idle 或输出。
- **受信任回调必须配合取消** — runtime teardown 会中止并等待回调，但无法终止任意同进程代码。
- **Workspace 创建可能比失败的 Session 尝试更长寿** — 空 Workspace 会保留，因为另一个并发调用者可能已经使用它。


<a id="dev-note"></a>
### 开发备注

<details>
<summary>维护者工作上下文——点击展开</summary>

无。

</details>
