---
description: "面向用户的权限预设：供选择、配置或排查把沙箱模式与审批策略捆绑在一起的 Permissions 选择器的用户与维护者阅读。"
kind: "package-reference"
---

# @deepseek-ai/dsh-permission-presets

[English](README.md) | 中文

## 概述

权限预设让用户通过一个选择器同时应用沙箱模式和审批策略。部署可以配置具名预设以及新建会话的默认预设；更改该默认值不会影响现有会话，内置预设表包含 `workspace-write` 和 `danger-full-access`。如果当前组合不匹配任何预设，客户端会显示推导出的 `custom` 状态，但用户不能选择或持久化它；切换预设只会更改实际值不同的设置。`/permission` 命令用于报告或更改当前预设，而沙箱执行和审批处理仍由不同的执行机制负责。

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

当部署希望向用户提供一个 Permissions 选择器、而非分离的沙箱与审批控件时，选择此服务。它捆绑旋钮；执行与审批各自保留自己的取值，因此以后移除本包，最后一次取值依然生效。

### 配置预设

插件配置定义预设表与新会话的默认值。每个预设名称把一个沙箱模式与一个审批策略捆绑为一组；`name` 与 `description` 是可选的客户端呈现。

```yaml
- name: '@deepseek-ai/dsh-permission-presets'
  config:
    presets:
      workspace-write:
        sandbox: workspace-write
        approval: ask
      danger-full-access:
        sandbox: danger-full-access
        approval: never
    defaultPreset: workspace-write
```

| 字段 | 默认值 | 含义 |
|---|---|---|
| `presets` | `workspace-write`、`danger-full-access` | 预设名称 → 沙箱／审批捆绑的表 |
| `defaultPreset` | 推断 | 固定到新会话的预设；组合默认值不匹配任何预设时必填 |

生成的[配置目录](../../../docs/config-catalog.zh.md#deepseek-aidsh-permission-presets)是每个受支持字段及其 JSDoc 的穷尽式真源。`custom` 这个名称保留给推导出的非预设状态，不能作为表条目。挂载需要具有约束能力的 bash 执行器（会报告 `sandboxMode` 的执行器）与审批服务。

### 切换预设

切换到某个预设只改变实际值不同的旋钮；再次选择当前已生效的预设不会产生任何变化。当前值解析顺序为：仍匹配的最近一次记录选择，其次表中第一个匹配项，否则为 `custom`。用户通过 `/permission` 命令切换：不带参数调用时报告当前预设与可用表，带预设参数时切换过去。

### 用户看到什么

客户端渲染选择器：按表顺序列出每个可切换预设，并在当前值为 `custom` 时将其附加在末尾。`custom` 仅供显示——调用方可以从不匹配的旋钮组合切换出去，但不能通过此服务选中或持久化一个具名 custom 预设。

### 会话默认值

`permission` 设置命名空间为未来会话持有 `defaultPreset`：创建会话时读取它，将其应用于沙箱模式与审批策略，并把应用的预设记录为一次 `permission/preset` 选择。之后的设置变更绝不会改变现有会话。恢复的 seed（包括由 `session/end-seed` 明确标记的空 seed）会保留其有效权限，并只接收缺失的持久事实，而不会接收最新用户默认值。

-----

<a id="understand-the-implementation"></a>
## 理解实现

<details>
<summary>实现细节——点击展开</summary>

可观察行为已在[使用本包](#use-this-package)中说明；本节解释写入路径、读取侧与可选子功能。

### 源码地图

| 文件 | 职责 |
|---|---|
| [`src/index.ts`](src/index.ts) | `PermissionPresetService`：预设表、写入路径、设置命名空间、会话固定、子功能 |
| [`src/types.ts`](src/types.ts) | `permissions` 投影键声明与选择器载荷类型 |
| [`src/invariant.ts`](src/invariant.ts) | 不变式伴生插件：校验 `permission/preset` 指向可解析的预设 |

### 写入路径

`apply()` 解析预设，仅当有效预设变化时追加 `permission/preset`，然后通过各自的权威 setter——`dsh-sandbox-policy` 的 `setSandboxMode` 与 `dsh-user-approval` 的 `setApprovalPolicy`——写入每个变化的旋钮。选择事件先于旋钮事件，因此在两个预设共享同一组取值时保留用户意图；净变化为零的选择不追加任何内容。

### 读取侧与 `custom`

`current(session)` 读取 `permissions` 投影；该单元在组合默认值（`ctx.shell.sandboxMode` 与审批配置）之上折叠三个全量值旋钮事件。host 状态还会保留 `session/end-seed` 是否已经出现，使会话固定无需重扫日志即可区分显式为空的恢复 seed 与真正的新会话。仍匹配的最近选择在共享捆绑时胜出；否则表中第一个匹配项胜出；否则返回推导出的 `CUSTOM_PRESET`。注册表或投影 key 缺失时会显式失败。

### 会话固定与空白复用

挂载时会固定所有存活与未来的会话：真正全新的会话获得默认预设与两个旋钮事实，而 seed 会话或部分初始化的会话保留其有效旋钮值，只补充缺失的持久事实。投影自有的 seed 标记让该判断与旋钮值共用同一份增量状态。

### 可选子功能

`permissions` 投影单元仅在组合了 `ctx.sessionProjections` 注册表时注册；`/permission` 命令仅在组合了 `ctx.commands` 注册表时注册。派生当前预设或固定初始选择的调用要求该投影存在，缺少注册表或 key 时会显式失败。

</details>

-----

<a id="further-exploration"></a>
## 进一步探索

当包级约定不够用时阅读以下页面。它们从预设词汇逐步进入执行旋钮与设计依据。

- [权限预设子系统参考](../../../docs/subsystems/permission-presets.zh.md)——预设表、选择器载荷与 `ctx.permissionPresets` 的 cordis 接口面。
- [沙箱切换设计 Agent Note](../../../.agents/notes/implemented/feature/2026-07-06-sandbox.zh.md)——沙箱模式与审批策略如何组合与切换。
- [审批子系统参考](../../../docs/subsystems/approval.zh.md)——此服务捆绑的审批策略旋钮。
- [交互组映射](../README.zh.md)——相邻的命令、审批与问答包。

-----

<a id="model-experience"></a>
## 模型体验

间接地，通过 `dsh-user-approval` 和 `dsh-tool-bash`：二者渲染由此服务的旋钮事件所选择的审批策略提示词、切换通知与沙箱工具结果；`permission/preset` 本身只写入日志。

#### KV Cache 影响

不会直接使缓存失效；具名消费方拥有所有请求前缀变更。

## 已知限制与延期工作

<a id="known-limitations-and-deferred-work"></a>


这些限制说明预设服务不提供什么。它们是当前包约束，不是权限系统对比。

- **只组合两个机制级旋钮**：预设选择沙箱模式和审批策略；agent（智能体）／profile 选择尚未纳入 `PresetSpec`。
- **`custom` 只能推导得出**：调用方可以从不匹配的旋钮组合切换出去，但无法通过此服务选中或持久化一个名为 custom 的预设。
- **预设表是进程级配置**：配置在插件生命周期内固定；更改可用预设必须重新加载插件。
- **已存储的默认值必须保留在 preset 表中**：移除被引用的 preset 会导致权限设置注册失败，直到更新或重置 `settings.yaml` 中的 `permission` 分节。

<a id="dev-note"></a>
### 开发备注

<details>
<summary>维护者的工作上下文——点击展开</summary>

无。

</details>
