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
