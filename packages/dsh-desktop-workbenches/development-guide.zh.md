# DSH Desktop 工作台开发指南

本文随 DSH Desktop 分发，也发布在独立的工作台市场栏目，供任意 Agent 直接读取。

# 工作台开发与验收规范

本文记录工作台的产品约定，供开发、提交和验收使用。具体 SDK 接口及实现状态以对应版本的开发文档为准。

## 第二期市场投稿 MVP

“制作我的工作台”是与“工作台市场”“我的工作台”并列的第三个一级 Tab。用户按三步进行：先阅读随本机分发的规范，把开发指令交给自己的 Agent；开发完成后由 Agent 装到当前设备，用户确认工作台出现在“我的工作台”和左侧入口并实际打开；只有想投稿时，才按工作台市场仓库的要求准备材料并提交。DSH 不控制开发过程。本机安装并实际验证是投稿的前提，不是与投稿并列的另一种选择。投稿由 Agent 从项目核实名称、描述、作者及源码仓库的完整 commit SHA，校验并提交工作台 `.tgz` 包；GitHub 仓库地址可选。当前本机接口只保存待送审记录，尚未向平台发送。

Agent 可从项目中选择一张合适的产品截图随投稿提交。截图仅支持 PNG、JPEG 或 WebP，文件不得超过 2 MB。两个交付指令都要求测试、构建及可用的包校验；本地加载无法完成时，不得声称已加载。无法访问本机投稿接口时，应保留验证后的投稿数据并如实说明剩余步骤。本机记录状态为 `pending`，只表示材料保存在当前设备。未来平台人工或 AI 审核通过并收录后，工作台才会显示在工作台市场。

市场预览和详情页应显示已有的产品截图及作者名称，并为安装人数和点赞人数保留展示位置。没有可信市场服务数据时，必须明确显示为未知或暂无数据，不得虚构为 0、估算值或热度结论。

已有 `schemaVersion: 1` 工作台包继续有效，无需升级 schema。包描述文件可选声明 `author`，其值可以是作者名称字符串，也可以是含 `name` 的对象；还可选声明 1–5 张 `screenshots`。每张截图使用包内安全相对路径，可附带 `alt` 文本，文件必须真实存在、是普通文件、不得越出包目录，并满足 PNG/JPEG/WebP 和 2 MB 限制。

每次提交的新版本都需要验收；个人创建的工作台可以先在本地使用。第二期当前只实现本机投稿接收；远程投稿传输、官方审核后台及公开市场收录尚未实现，不能将本地可用或本机提交等同于已通过官方收录。

## 1. 定义与界面边界

工作台是一种面向具体工作场景的特殊插件。规范约束工作台、会话、工作区的关联关系和切换行为，不规定统一的业务面板设计。

工作台作者或用户可以定义业务面板的布局、内容、工具栏和业务操作。接入已有工作台时，优先复用原有界面和业务绑定流程，不要求加入统一顶部工具栏、会话下拉框、业务区折叠按钮或“通用聊天”按钮。

市场、工作台切换和设置等公共入口由 DSH 保留，业务面板不得遮挡。使用 `customFrame` 的工作台必须限制在宿主分配的主内容区域内：根容器应按正常 flex 布局填满该区域；内部使用绝对定位、窗口最大化或拖拽换位时，都不得越过宿主容器的定位与裁剪边界，也不得覆盖 Desktop 左侧会话栏。原生会话能力与模式切换沿用 Desktop 的规则。

## 2. 工作台、会话与工作区

- 一个工作台可以关联多个会话，每个会话最多归属一个工作台。
- 工作区是 DSH Desktop 的项目资料环境；每个会话如绑定工作区，最多绑定一个工作区。同一工作区内的不同会话可以属于不同工作台。
- 一个工作台可以处理多个工作区，不同工作台也可以使用同一个工作区。
- 工作台内部的档案、业务项目不等同于 DSH 工作区，不要求重复绑定。例如，玄学档案和选址项目继续使用各自原有的创建、选择流程。

## 3. 未绑定会话时的使用

打开工作台后，即使没有会话或工作区，也应立即显示业务面板。浏览、创建、选择业务档案或项目，不得以已有原生会话或工作区为前提。

仅当用户执行向 Agent 发起请求、写入会话草稿等依赖会话的操作时，才检查当前会话是否属于该工作台。尚未绑定时，在该操作处引导创建或打开会话，不阻断其他业务功能。

右侧原生会话区应支持直接新建工作区并开始对话，也支持使用已有工作区。没有已有工作区时，创建入口仍可用；选择或新建目录后，完成工作区与会话创建并关联当前工作台。取消选择不创建会话，失败可重试。实现不应默默改用无关的工作区。

先选择业务档案或项目，再创建第一条会话时，应保留当前业务选择。打开已有会话时，优先恢复该会话已有的业务映射，不被其他会话最近选择覆盖。

接入时应保留工作台原有的项目创建引导。玄学和选址工作台创建业务资料后，使用业务资料目录自动创建对应工作区和会话，保存关联，再填入开场提示词草稿；已有业务资料恢复其保存的会话，缺失时新建。用户无需先手工新建会话。工作台通过 Desktop 接口发起创建或恢复，由宿主校验并登记会话归属。业务面板不等待会话创建完成才显示。

开场提示词保留用户已输入的内容，由用户发送；会话创建失败或延迟时，待填入提示词保留用于重试。玄学原有的自动解读属于独立业务行为，不能与开场草稿混为一谈或在适配时删除；应在正确归属的会话中运行，避免隐藏工作台触发误发送。

## 4. 固定入口与切换

多个工作台可保留固定入口，支持拖动排序，同时只有一个前台工作台。再次单击侧边栏中当前打开的工作台图标，关闭工作台视图；再次点击可重新打开。关闭保留固定入口、会话和业务资料，不停止后台任务。打开另一个工作台时切换展示，不执行卸载重装，不停止已有后台任务。

首次进入可以显示首页或空会话状态，也可以按工作台约定初始化会话；无论哪种方式，都不能将业务面板的显示依赖于会话初始化完成。后续进入恢复最近会话。

点击会话时，如其工作台仍可用，则唤起对应工作台并打开这条会话；工作台已卸载时不自动唤起或重装。异步创建期间发生切换，不得将用户拉回旧工作台或将会话误绑到新工作台。

工作区侧边栏中的切换和“新建会话”都保留 DSH 原生入口和用户选择的目标。从原生“新建会话”入口创建的会话始终是新的普通未绑定会话，即使有工作台前台面板或同一工作区里已有工作台所属空白会话，也不得复用或绑定它。只有从工作台内部明确发起的创建或恢复动作，才登记工作台归属。切换已有工作区或打开已有普通未绑定会话只更新原生会话区域并保留当前业务面板；只有用户明确点击已绑定工作台的会话时，才唤起对应工作台。异步创建完成前若用户继续导航，不得把界面拉回原工作台或覆盖用户后续选择。

通过原生侧边栏新建或切换到普通会话时，当前工作台的业务面板继续保留，标准分栏中的会话区直接展示该原生会话。历史 owner 已移除、卸载或暂时不可用的会话也遵循这一规则：不唤起或重装该 owner，同时不关闭当前业务面板。保留业务面板只表示界面上下文没有被关闭，不表示这条会话获得了当前工作台能力：宿主不得新增会话归属、更新工作台最近会话，工作台发起 Agent 请求等依赖归属的操作仍需显式创建或恢复该工作台会话。仅在当前确实没有任何会话时，标准分栏才显示创建或绑定引导。


---

# 实现与交付说明

# Local workbenches

Phase 1 adds a local workbench catalog and persistent sidebar entries. Phase 2 begins with local community-submission intake from the market; review, remote catalog publishing, and package upgrades remain later work. Settings > General has a single switch that turns the workbench feature on or off. Turning it off stops every workbench from loading and hides the sidebar entries and the market, while saved sessions, data and notes are retained.

## Phase 2 market-submission MVP

Users open **Make my workbench**, a third top-level market tab alongside **Workbench market** and **My workbenches**. The UI guides three sequential steps: (1) read the specification and have the user's own Agent develop the workbench, (2) have that Agent install it locally and confirm the user can actually open it, and (3) submit it only if the user wants to, following the market repository's requirements. Local use is a prerequisite for submission rather than an alternative to it: review requires a workbench that was installed and verified on a real DSH Desktop version. Only steps 1 and 3 hand a copyable instruction to the Agent; step 2 ends the personal-use path. This follows the preset-transfer model of Agent-driven handoff without controlling the user's development Agent or asking the user to re-enter project metadata.

Two prompts cover the flow. The development prompt asks the Agent to validate, install through an available project/plugin mechanism, and verify personal use. The submission prompt asks for a validated `.tgz` workbench package and an optional screenshot recorded through the local submission API. GitHub is optional. Both require relevant tests and build plus `scripts/check-workbench-package.mjs` when available. The submission path asks the user only for metadata that cannot be verified from the project.

When the local endpoint is reachable, the submission prompt posts `{ title, description, author, package, screenshot?, repository? }` to `$DSH_WEB_URL/api/desktop-workbenches/submissions` and verifies an ID, SHA-256, and `pending` status. `package` is a `data:application/gzip;base64,...` URL containing a gzip tarball no larger than 8 MB. The server checks the gzip/tar envelope and stores the binary separately from the market JSON; this local intake does not install or execute submitted code. This record is **local only**; the platform's remote human/AI review service is not connected. If either the local install mechanism or submission endpoint is unavailable, the Agent preserves the validated artifact/payload and reports the remaining action without claiming success. An optional GitHub URL identifies proposed source; Desktop does not upload or modify that repository. The submission prompt also asks for the source repository's full commit SHA, because the market's review checklist rejects a bare branch or tag.

One product screenshot is optional during submission. It must be a PNG, JPEG, or WebP image no larger than 2 MB. Accepted submissions are stored locally with `pending` status, displayed as **local, awaiting remote submission**. A validated, actually installed workbench may be used personally before review; it appears in the public gallery only after platform review and catalog admission are implemented and approval is granted.

The market preview and detail view display an available product screenshot and author name. Market records also expose install and like counts. Until a trusted catalog service provides a value, the interface must represent it honestly as unknown or unavailable; it must not invent a zero, estimate, or popularity claim. Package descriptors may continue to use schemaVersion 1 and optionally declare `author` plus one to five packaged `screenshots` for later catalog ingestion. Each screenshot is a safe relative package path, optionally with alt text, and must meet the same PNG/JPEG/WebP and 2 MB rules.

## User behavior

The sidebar market opens the catalog. Adding a template puts it in My Workbenches; opening it pins its entry. Entries support dragging and accessible up/down controls. Clicking the active workbench in the sidebar closes its view; clicking an inactive entry opens it. Closing retains pinned entries, data and running sessions. The market’s Open action remains an explicit open. Opening another workbench replaces the foreground workbench without terminating sessions. Public navigation and Settings remain owned by Desktop.

A workbench can own multiple new sessions. Each session has at most one immutable workbench binding. Workspaces remain native DSH projects: session creation takes a workspace ID; workbenches neither move project files nor redefine workspace membership. Clicking a bound session opens that exact session in its available workbench; opening a workbench entry restores its latest session. Removing a local workbench entry preserves sessions and notes, and those sessions subsequently open through native navigation without reviving the removed workbench.

Two included templates exercise initialization: Research Notes starts empty; Content Writing creates a session when a default workspace is available. The conversation region must let users either select an existing native workspace or create a new workspace and start a conversation directly. Having no existing workspace must never leave the primary action disabled. Creating a workspace uses Desktop's native directory picker and workspace creation API, then creates a session bound to the active workbench. Cancelling the picker creates neither a workspace nor a session. Templates use native session tools, permissions and presets; no special model provider, publishing integration or collection tools are bundled.

The frame embeds the existing native conversation once and renders a business component alongside it. Business components remain mounted while switching between workbenches; built-in notes are controller-owned and persist even when navigating to another main panel. Native conversation drafts and task execution remain under upstream session ownership. The market is a separate main panel, so third-party panels must persist their own drafts outside React component state if they need to survive leaving the frame.

## Extension seam

A client plugin injecting `desktopWorkbenches` can register a business component:

```js
ctx.effect(() => ctx.desktopWorkbenches.register({
  id: 'my-workbench',
  title: 'My workbench',
  icon: '◇',
  panelTitle: 'Business panel',
  description: 'What this workbench helps with',
  audience: 'Who it serves',
  requirements: 'Required native configuration',
  // Omit for an empty start, or use 'new-session'.
  initialization: 'new-session'
}, BusinessPanel))
```

The component receives `{ service, entry }`. This is a local extension seam, not a stable public SDK. Registration returns an idempotent disposer. It does not grant tools, global navigation ownership, or additional permissions. Developers must use native session-scoped capability mechanisms; this feature does not implement a new runtime for arbitrary tool isolation. Phase-1 templates deliberately use existing native capabilities only.

`desktop.workbench.frame` is a single root slot owned by the native conversation panel. Its owner supplies `{ conversation }`. `uiWorkspace.registerSessionOpener` lets the workbench controller route an explicitly selected, bound Session to its installed workbench. The native sidebar New Session action always creates a fresh unbound Session in the user's selected workspace, even when a workbench panel is visible and even when an older blank workbench Session exists there. Workbench-owned Sessions are created only through explicit workbench actions. Opening an existing workspace or Session never acquires a binding merely because a business panel is visible.

When native navigation opens an ordinary unowned session, or a session whose recorded owner is removed or unavailable, Desktop keeps the current workbench business panel visible and shows that native session in a standard split frame. Keeping the panel visible does not grant the session workbench ownership or capabilities: `sessionBindings` and `recentSessions` remain unchanged, and provider actions that require ownership must still create or restore an owned session explicitly. The unavailable owner is neither woken nor reinstalled. The standard split frame shows its creation/binding guidance only when there is no current native session. `customFrame` providers keep their existing conversation placement behavior.

If native New Session creation finishes after the user navigates elsewhere, Desktop does not reopen that Session or replace the user's newer navigation. It remains an ordinary unbound Session. Selecting any existing bound Session still opens its exact available owner.

## Local persistence

The host stores `desktop-workbenches/state.json` under the active DSH home. Version 1 records added and pinned IDs, foreground workbench, session bindings, recent sessions, and template notes. Writes are serialized, atomic, and revision-checked. A stale window receives a conflict and must reload; unsaved template drafts remain in memory for retry. Invalid/corrupted state is reported rather than silently overwritten. Removing a workbench never deletes stored notes or bindings.

Phase-2 submissions are stored separately in `desktop-workbenches/submissions.json`; they do not change the version-1 workbench state schema. Submission writes are serialized and atomic, duplicate repositories are rejected, and read responses are not cached. The local queue is not a public registry and does not imply review approval.

## Validation

Run `npm test`, `npm run typecheck`, and `npm run build`. Controller tests cover navigation races, exact-session selection, removal fallback, immutable bindings, ordering, initialization, draft persistence, write conflicts and recovery. Store tests cover concurrent revisions, validation, limits and corruption. For manual testing, use a separate DSH_HOME so existing user sessions and credentials remain untouched.

Manual smoke validation used an isolated web profile and a synthetic workspace: add/open, both initialization flows, sidebar ordering, switching, native New Session interception, exact-session selection, returning from generic chat, removing without reactivation, per-session input draft recovery, notes surviving market navigation, and restoration after page reload. The rendered workbench contained one native editable conversation input. No model call was sent. Electron's OS folder dialog and actual background model execution still require desktop acceptance testing.

Run the desktop from the repository with `npm ci` followed by `npm run dev`. The implementation is in `packages/dsh-desktop-workbenches/`; the minimal upstream integration changes live in the existing conversation/workspace patch-package files.

## First-party catalog packages

The local catalog also includes `ming-life` (玄学人生) and `dsh-site-selection` (门店选址), adapted from the internal dataelement repositories. Their reviewed npm tarballs live under `vendor/workbenches/` and are pinned in the Desktop lockfile; installing Desktop does not automatically add or activate them. Open the market to add either provider. This is local catalog inclusion, not a public npm release or community-market listing.

Providers include a `workbench.json` with schemaVersion 1, stable ID, title, description, package version, client entry, compatibility requirements and declared capabilities. Before importing a provider, run `node scripts/check-workbench-package.mjs <package-directory>`. Repeat the check against the unpacked tarball, run the provider's tests and build, and verify with the native conversation and other installed workbenches. A custom frame must stay within the host's positioned and clipped main-content container, including during internal maximize and drag operations. Pin the resulting artifact checksum and source revision in `vendor/workbenches/catalog.json`.

The descriptor may use `embedded: true` for an edge-to-edge business component and `layout: { businessSide: 'left', businessWidth: 0.65 }`. Width is a fraction of the main area, bounded to 0.25–0.70; the native conversation stays mounted in a stable tree position. These descriptor options are rendering choices, not a required business-panel design. Workbench authors and users define their business panels, including layout, content, toolbars and business interactions. Desktop does not inject a shared workbench toolbar or collapse control. Desktop preserves public sidebar, market and Settings access; business panels must not cover these public entries. Narrow windows stack the default frame regions.

Business projects/profiles remain independent of DSH workspaces. These providers preserve their original project-creation onboarding: automatically prepare the opening prompt in the owning native conversation draft, retaining existing draft text. When there is no conversation yet, retain the pending prompt and deliver it once the matching business selection has an available owned conversation, without duplicate delivery. Preparing this draft does not submit it. Providers may request session creation or restoration through Desktop's ensureSession bridge. Desktop records and validates workbench ownership; the original business-folder workspace and saved session mapping are retained. Creating a profile/project automatically creates or restores its conversation before filling its onboarding draft. Ming Life's original automatic interpretation is a separate business action and remains supported in the matching owned session. Hidden providers cannot write into the active conversation. Their iframe bridges validate origin and source, and host routes use `connection.requestRejection` so API and embedded resources require the existing Desktop authentication.

## Workspace creation and business-flow acceptance

The right conversation region owns new-conversation and new-workspace actions. With zero existing workspaces, a user can choose ‘新建工作区并开始对话’, select or create a project folder in the native picker, and enter a conversation without leaving the workbench. Existing workspaces remain selectable. Creation failures must be shown with a retry path; switching workbenches during creation must not pull the user back or bind the session to the wrong workbench.

Reuse a provider's existing interface and business binding process wherever possible. Ming Life retains its profile creation/selection flow; Site Selection retains its business-project creation/selection flow. These business entities are not DSH workspaces. Desktop must not require a duplicate business binding or replace the provider's workflow merely to integrate native conversations.

## UI ownership

The workbench standard governs workbench/session/workspace associations and switching behavior, not a uniform business UI. Do not require every workbench to include a shared toolbar, session selector, collapse button or generic-chat button. Native conversation controls and Desktop navigation provide session creation, session selection and workbench switching. Reuse provider interfaces; configuration options for the host frame do not prescribe the internal layout of a business panel.

## Business panels before conversation binding

Opening an available workbench must show its business panel even when there are no native sessions or workspaces. Browsing, selecting and creating business profiles/projects do not require a native conversation. Only actions that send content to an Agent conversation require a currently owned session; explain that requirement at the action. Preserve business selection independently of native workspace membership, while retaining any existing per-session business mapping.

## Business-triggered session creation

`await service.ensureSession({ workbenchId, folder, sessionId })` creates or restores the business conversation through Desktop. The optional saved session is reused when valid; conflicting workbench ownership is rejected. Missing sessions use the business folder as the native workspace path. The host records ownership before activating the conversation, and does not take focus back after navigation changes. Providers preserve their original business-to-session persistence and opening prompts; a native creation failure must not hide their business panel.

Original-workflow adaptation validation uses the fresh upstream sources (Ming Life 3666033, Site Selection 7bf06a1). An isolated real-host check starts with no native workspaces or sessions, invokes the Desktop session bridge for each business directory, verifies native workspace membership and persisted workbench ownership, and restores the saved session without duplication. It creates no model requests. Provider tests additionally exercise creation-to-onboarding and original automatic-interpretation routing with mocked model submission.

## Custom conversation layout

A provider with an existing dock may register `customFrame: true`. Its component receives `{ service, entry, active, conversation }`; place the supplied `conversation` node in the existing chat dock rather than rendering another native conversation. Only the active workbench receives the mount node. Desktop retains the native conversation tree and moves its mount container between layouts so switching, closing and reopening preserve the input instance and draft. Hidden provider components remain mounted. Standard split-layout providers need no changes.

The local catalog includes Content Operations (`media-workbench`, package `dsh-media-workbench`). Unlike the life/site providers, creating a topic or Campaign does not create a conversation: users explicitly choose New Session within that business scope. The original four-window dock hosts the supplied native conversation through customFrame. Existing business bindings and projectRoot remain in use.
