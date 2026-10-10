# Workbench Development Standard

Version: 2026-10-09 · The website is authoritative; DSH Desktop bundles a copy for offline use.

Official page: https://dshdesktop.com/workbench/docs/development-en/

Markdown source for agents: https://dshdesktop.com/workbench/docs/development-en.md

Six-step quickstart: https://dshdesktop.com/workbench/docs/quickstart-en/ ([Markdown](https://dshdesktop.com/workbench/docs/quickstart-en.md)). [中文版](https://dshdesktop.com/workbench/docs/development/).

This standard is intended for direct execution by an AI developing a workbench. **For local development and personal use, this document is sufficient**: build the package under Section 3, install it in the local DSH Desktop, and pass the Section 8 self-test. There is no requirement to publish code or upload anything.

If the author later wants to list the workbench in the Workbench Market, also read the [Workbench Market Acceptance Standard](https://dshdesktop.com/workbench/docs/market-acceptance-en/). Its separate rules cover a public repository, releases, descriptions, screenshots, and listing PRs.

A workbench is a DSH plugin. It must first be a valid DSH plugin package that `dsh plugin add` can install and Harness can load. It then registers a business panel with Desktop and follows the rules for workbenches, sessions, and workspaces.

Rule levels are **required** (failure prevents installation or loading), **recommended** (strongly advised for usability and future listing), and **optional**.

## 1. Execution principles

**Requirements confirmation gate (before code)**: First establish the workbench's business scenario, target users, and smallest core workflow. Copying Desktop's generic “development instructions,” opening a directory, or finding projects or dependencies inside it cannot replace the user's statement of what to develop now. Do not infer the product direction solely from a directory name or existing code. If the current request and already confirmed context do not establish all three, ask **one combined question**, for example: “Who is this workbench for, what business scenario should it address, and what are the core steps from entry to task completion?” **Wait for the user's answer and remain at requirements confirmation.** Until then, read-only checks of directories, versions, scripts, and host capabilities are allowed; creating or editing business code or UI, building, packing, installing, or submitting are not. An empty directory is not confirmed requirements. Starting implementation from generic instructions alone is an agent execution error.

Once requirements are clear, read project name, author, version, description, and test commands from the project; ask only for necessary information that cannot be found and affects implementation. A development request does not authorize publication of code, business data, or credentials.

Before development, check:

- Project root, existing code, uncommitted changes, package manager, scripts, and target Desktop version. Do not overwrite others' changes.
- Target platform and architecture; distinguish JS/TS packages, external programs, and native dependencies. If the host or toolchain is missing, say so; a successful build alone does not prove the workbench runs.

### One-page execution flow

1. **Confirm requirements**: Record scenario, users, and one complete task flow from the current request and confirmed context. Generic instructions and the project directory do not count. If any is unclear, use the gate above and wait.
2. **Inspect project**: Identify root; run `pwd` and, for a Git repository, `git status --short`; inspect code, package manager, uncommitted work, and target Desktop version. Preserve unrelated changes.
3. **Define the smallest business flow and layout**: Write down entry point, main action, completion state, and failure recovery. Under Section 4, choose a standard split or `customFrame` and define the first-use path without a session before choosing host capabilities.
4. **Implement**: Create the plugin package and registration under Section 3; follow Sections 4–7 for applicable responsibilities and capabilities.
5. **Verify package**: Run `pnpm pack`; inspect `package.json`, declared entries, `cordis.patch.yml`, size, and sensitive files inside the tarball.
6. **Install and test locally**: Check installation capabilities under Section 3.6, install that tarball, complete the required restart, and record real UI and loading evidence under Section 8. If the agent runs inside the target DSH Desktop, ask the user to restart it manually under the boundary below.

**Restart boundary inside the target app**: If the agent is running in the DSH Desktop session that needs restarting, do not close or restart DSH Desktop or Harness yourself, and do not use process probes such as `ps` or `pgrep` to manage that restart. Ask the user to quit DSH Desktop completely and reopen it. Only after the user returns and confirms it has reopened should you check plugin loading, the installed list, sidebar entry, and real UI. Until then, mark those post-restart checks **pending verification**; do not claim they passed. An agent running outside the target app may follow the normal restart process.

**Empty-directory exercise**: If the directory is empty and the user only pasted Desktop's “development instructions” or said “make a workbench,” Step 1 has not passed. Ask one combined question: “Who is this workbench for, what business scenario should it address, and what are the core steps from entry to task completion?” `pwd`, directory inspection, and Desktop capability checks are allowed. Until the answer arrives, stop at Step 1: do not create `package.json`, components, or business pages; do not build, install, or submit.

## 2. What a workbench is

A workbench package is simultaneously:

- **An npm package** with `name` and `version`, installable from a local directory or `.tgz`, and after listing potentially from npm or GitHub.
- **A DSH plugin (bundle)** whose `package.json` declares `dsh.bundle.patch`; `cordis.patch.yml` inserts the server entry into the Harness plugin tree.
- **A Desktop workbench** whose client calls `desktopWorkbenches.register()` to register a business panel. Desktop resolves repository identity from `repository`, installation records, and market distribution mapping.

Three identifiers have distinct purposes and must not be conflated:

| Identifier | Location | Purpose |
|---|---|---|
| npm package name | `package.json` `name` | Installation, dependency resolution, `cordis.patch.yml` `name:` |
| Plugin entry ID | `id` of an `insert` row in `cordis.patch.yml` | Locate that row in the Harness plugin tree |
| Workbench identity | Canonical GitHub `repository` URL and market entry `id` | Lowercase `owner/repository`, shared by market card, sidebar entry, and session ownership |
| Legacy ID for compatibility | Old `register({ id })` and catalog `workbenchId` | Migration of old data only; omit from new packages and submissions |

Desktop lowercases GitHub owner and repository, so `https://github.com/Owner/Repo` corresponds to `owner/repo`. A rename or transfer changes workbench identity; migrate existing sessions under the migration rules rather than changing only the URL. The legacy `wb-owner-repo` is only a compatibility mapping, not a registration ID for new packages.

## 3. Package format

### 3.1 Layout

Put one workbench in one package. Typical structure:

```text
package.json          # npm and DSH plugin declaration
cordis.patch.yml      # insert the server entry in the plugin tree
dsh/index.js          # server entry (exports["."])
lib/client.js         # built client entry (exports["./client"])
README.md  LICENSE
```

### 3.2 package.json

| Field | Level | Requirement |
|---|---|---|
| `name`, `version` | Required | Normal npm fields; `version` is full SemVer such as `1.2.0` |
| `"type": "module"` | Recommended | All official examples use ES modules |
| `main` and `exports["."]` | Required | Point to the server entry imported by `cordis.patch.yml` |
| `dsh.bundle.patch` | Required | For example `"dsh": { "bundle": { "patch": "./cordis.patch.yml" } }`, relative to package root. Without it, the package is an ordinary dependency and no plugin layer activates |
| `dsh.client.platform` | Required | Must be `"web"`, or the client module will not load |
| `dsh.client.inject` | Required | String array that **must contain `dsh-desktop-workbenches`** so its service loads before the client; list other client packages used. This controls load order, not Cordis service injection |
| `exports["./client"]` | Required | A declared `dsh.client` must export the built client file, or startup fails |
| `dsh.client.external` | Optional | List modules (including subpaths) required by the client beyond the shared baseline; do not list itself |
| `exports["./package.json"]`, `exports["./cordis.patch.yml"]` | Recommended | Match official packages |
| `files` | Recommended | Include `cordis.patch.yml`, server entry, and built output |
| `peerDependencies` | Recommended | Put official `@deepseek-ai/*` packages such as `@deepseek-ai/cordis` and `@deepseek-ai/dsh-client-connection` here, not in `dependencies`, to avoid a second copy of host code. Explicitly include prereleases, for example `">=0.1.5-rc.2 <0.2.0-0"`, or prerelease Harness versions are excluded and installation fails with `ERESOLVE` |
| `@deepseek-ai/schemastery` | Recommended | Used to define server `Config`; it is a runtime dependency |
| `license`, `author`, `description` | Recommended | Provide truthful values |

Do not rely on undocumented `dsh` fields such as `dsh.client.inline`; they are silently ignored.

### 3.3 cordis.patch.yml

This file is a YAML array. A workbench normally needs one `insert`:

```yaml
- insert:
    - id: my-workbench            # plugin entry ID
      name: my-workbench-package  # npm package name, so Node can resolve installed code
      config:
        root: !!js dshHomePath('my-workbench')   # optional business data directory
```

- **Required**: `name` is the package name, never a relative or absolute path.
- An empty or comment-only file fails startup; write `[]` if no rows are needed.
- `!!js` expressions evaluate at startup. `dshHomePath()` yields a path under the DSH data directory.
- When overriding an existing row, the patch **replaces the whole `config`**, rather than merging it. Include all keys that must remain. A workbench should not override Desktop or another plugin's rows.

### 3.4 Server entry

```js
import Schema from '@deepseek-ai/schemastery'

export const name = 'my-workbench'
export const inject = ['connection']
export const Config = Schema.object({ root: Schema.string().required() })

export function apply(ctx, config) {
  // Register local endpoints under this workbench, e.g. /api/my-workbench/...
}
```

- `Config` **must** be a Schemastery schema, not a plain exported object.
- Put local endpoints under the workbench's own prefix, such as `/api/<workbench-id>/`, never under Desktop's or another plugin's paths.
- To determine session ownership, inject the internal read-only `desktopWorkbenchOwnership` service and call `await read()`; do not infer it from the visible panel, an old preset, or private settings.
- Write business data in the configured data directory or the location explained in author documentation. Uninstall must not delete user data.

### 3.5 Client entry

The client file **must** be a built single-file module registered through the module loader:

```js
window.__ModuleLoader__.load({
  id: 'my-workbench-package',
  factory: (require) => {
    const React = require('react')
    function BusinessPanel({ service, entry }) { /* business panel */ }
    function apply(ctx) {
      ctx.effect(() => ctx.desktopWorkbenches.register({
        title: 'My Workbench',
        repository: 'https://github.com/owner/repository',
        description: 'Describe the problem it solves'
      }, BusinessPanel))
    }
    return { apply, inject: ['desktopWorkbenches'] }
  }
})
```

- `require` can access only the shared baseline (React, Cordis, etc.), loaded plugins, and modules listed in `dsh.client.external`. Bundle other dependencies into the client file at build time.
- `register()` **must** provide a `title`, business component, and canonical GitHub `repository` URL. New packages **must not specify** `register({ id })`. Desktop resolves `owner/repo` from `repository` and cross-checks the caller client package, market distribution, or installation record. A source conflict prevents provider exposure. An old package's `id` is only for migration, not the new protocol.
- `workbench.json` and submission YAML `workbenchId` are not required for new workbenches. The runtime package name must correspond to `window.__ModuleLoader__.load({ id })`.
- Optional registration fields: `description`, `panelTitle`, `icon`, `audience`, `requirements`, `layout` (`businessSide` is `left` or `right`; `businessWidth` is 0.25–0.7), `customFrame` (boolean; Section 4), and `initialization`.
- Give the unregister function returned by registration to `ctx.effect`.

### 3.6 Build and local installation

- The client file **must** already be built as a single file. Desktop does not build it for you.
- **Detect capabilities first; do not guess from a version number.** Record the version shown in Desktop About, platform, and architecture. Look for local installation in “Workbench management / Installed workbenches”; then check whether the installed version's plugin installation UI or `dsh plugin add --help` accepts local `.tgz`. Install only when the UI or command explicitly supports this input. Do not infer capability from the website publication date. Record the entry point and output used.
- Install the `.tgz` produced by `pnpm pack` through a confirmed supported path. For CLI, follow its actual `--help` syntax. Complete the restart indicated by Desktop, confirm the entry under “Installed workbenches,” open it from the sidebar, and inspect the real business panel. If the agent is running inside the target DSH Desktop, follow the Section 1 restart boundary: the user must fully quit and reopen the app. `dsh --profile web --dump-config` showing a plugin layer proves configuration only, not UI loading.
- If the current Desktop lacks a local package installer, CLI support is absent, or installation fails, deliver the verified `.tgz` and package contents/check record. State Desktop version, capability findings, and failure reason. Mark “install, load after restart, installed list, sidebar entry, business operation” individually **untested**; do not claim local acceptance passed.
- If installation or build scripts need to run (pnpm 10 blocks them by default), understand each script and obtain separate authorization.

## 4. UI boundary

A workbench is a plugin for a specific business scenario. This standard governs its relationship and switching behavior with sessions and workspaces; it does not prescribe a uniform business panel design.

Authors or users may define business panel layout, content, toolbar, and operations. When integrating an existing workbench, reuse its existing UI and business binding flow where possible. A universal top toolbar, session dropdown, business-area collapse control, or “generic chat” button is not required.

### 4.1 Choose the layout for the primary task

Do not treat a persistent conversation pane as the default product design for every workbench. Confirm the user's primary task first; when requirements are unclear, suggest a business-first full page or a conversation split and explain the tradeoffs. Omitting `customFrame` still selects the standard split technically, but authors should choose deliberately rather than inherit that default.

- **Business-first full page with conversation on demand (`customFrame: true`)**: For content review, renovation management, reports, dashboards, or wide tables, recommend a usable business home first. Decide whether and where a conversation entry belongs based on the task; a permanent entry or reserved chat pane is not required for every workbench. Create or restore a workbench session and show the conversation only when the user explicitly requests AI help; closing it returns to the business view. Place the host-provided `conversation` node when needed; do not duplicate the chat UI. This mode does not show the host's generic no-session guidance. Design the first-entry and no-session business states yourself. Do not automatically create a session on first entry to fill the interface.
- **Standard split**: Use when conversation is the primary task and the business content is a compact companion tool, status panel, or reference. By default, the host native conversation is on the left and the business panel occupies 36% of the main content area on the right. In `register()`, `layout` may set `businessSide: 'left' | 'right'` and `businessWidth: 0.25–0.7`; this proportion does not guarantee enough space for every column inside the business panel. When no session is bound to the current workbench, the host shows optional AI-help guidance in the conversation area. The business panel must remain usable, and independent business actions must not require creating a session first. Do not simply enlarge `businessWidth` to squeeze a report into the split at the expense of the guidance or conversation.

In either layout, make the business UI respond to the **actual width of its own container**. Window-wide media queries alone do not reflect the space left by the sidebar, split, or embedding. Use container queries or measure the business root; rearrange columns, collapse secondary information, or provide bounded scrolling when space is tight. Long Chinese headings, English identifiers, numbers, and action buttons must stay readable and usable, without single-character vertical wrapping, clipped controls, or page-wide horizontal overflow.

DSH reserves shared entrances for the market, workbench switcher, and settings; the business panel must not cover them. A `customFrame` (Section 3.5) must stay within the host-assigned main content area. Its root should fill that area using normal flex layout. Internal absolute positioning, maximization, or drag-based repositioning must remain inside the host container's positioning and clipping boundaries, never cover Desktop's left session sidebar. Put the host-provided `conversation` node into the business layout for native sessions; do not build a second chat UI. Native conversation capabilities and mode switching continue to follow Desktop rules.

On macOS, after the sidebar collapses, window controls and the sidebar expansion button occupy the upper-left of main content. The host reserves `--dsh-frame-leading-clearance` width for a left-side embedded business panel and a semantic `<header>` that is the first child of a `customFrame` root. The toolbar may stay in the original 48px top row; the whole content need not move down. A custom toolbar with a different structure should use the same variable in its own styles to clear the controls. Do not cover window controls or `shell.leading`.

## 5. Workbenches, sessions, and workspaces

- One workbench may have many sessions; each session belongs to at most one workbench.
- A workspace is a DSH Desktop project-file environment. A session bound to a workspace has at most one workspace. Different sessions in the same workspace may belong to different workbenches.
- One workbench can use multiple workspaces, and different workbenches can use the same workspace.
- Internal business records or projects are not DSH workspaces and need no duplicate binding. For example, metaphysics records and location-selection projects retain their own create/select flows. A DSH workspace directory is a user-chosen file location; opening or creating a business project does not automatically assign it to a workbench.

## 6. Using a workbench without a bound session

Open the business panel immediately, even without a session or workspace. Browsing, creating, and choosing business records or projects must not require a pre-existing native session or workspace.

Check whether the current session belongs to this workbench only when an action depends on a session, such as sending an agent request or writing a draft. If unbound, guide the user to create or open a session at that action; do not block unrelated business features.

Provide a clear action such as “New workbench session in this workspace” or “Choose a file location and start a workbench session.” A business record may be created first if it needs no filesystem. Once file storage or DSH workspace creation is required, call the host directory picker first; the user must choose an existing directory or explicitly create one in the system picker. Never silently create a folder in a default location, home directory, current repository, or guessed path. After confirming location, create workspace and session, register ownership, save business association, and populate an opening draft. On cancellation, leave no directory, empty project, workspace, session, or binding. Restore existing business records only from a location the user previously confirmed; if missing, ask for a new selection rather than recreating a same-named directory. On failure, retain retryable state and never silently choose an unrelated workspace.

If the user selects a business record or project before creating the first session, preserve that selection. When opening an existing session, restore its own business mapping first; do not let another session's latest selection overwrite it.

When integrating an existing workbench, retain its project-creation guidance and independent business flow. The user need not manually create a session first; the workbench requests creation or restoration through Desktop, which validates and records ownership. Keep user-written opening drafts for the user to send; preserve them for retry if creation fails or is delayed. Automatically run business flows only in a correctly owned session, never mix them with the opening draft or let a hidden workbench send accidentally.

## 7. Mode entry and switching

The host supplies one mode switcher at the top of the sidebar. Its button displays only the current mode; the expanded menu switches among “Native sessions” and added workbenches, with “Workbench management” always at the far right. A workbench must not duplicate, cover, or replace these shared entrances. Switching mode changes foreground display and session filtering only; it neither reinstalls a package nor stops background tasks.

“Native sessions” and each workbench are peer modes. Current mode determines visible sessions and new-session ownership:

- **Workbench mode**: Show only sessions of the current workbench. “New session” and workspace switching may open only sessions of that owner. If a target workspace has none, create a new owner session, persisting ownership and the recent-session record before display. Never reuse, absorb, or rebind ordinary sessions or sessions of another workbench.
- **Native session mode**: Show only unbound sessions. “New session” and workspace switching may open only unbound sessions; create one if the target workspace has none. Do not infer or switch workbench from another session in the same workspace.

Explicitly opening an unbound session switches to Native sessions; explicitly opening a bound session with an available owner switches to that workbench. If its owner is removed, uninstalled, or unavailable, treat it as an ordinary session without automatically activating or reinstalling the owner. If the user navigates, switches modes, or removes an owner during asynchronous creation, do not pull the UI back to an old mode, overwrite the later selection, or bind to an invalid owner.

Mode switching must not collapse or expand the left session sidebar automatically; the user controls its state across modes. A workbench session title has a small icon of its owner; an ordinary session does not. The icon indicates ownership and needs an accessible name or tooltip. Buttons, menus, selected states, and focus rings must not clip, overlap, or overflow in collapsed or expanded states.

First entry may show a home page, empty-session state, or initialize a session under workbench conventions, but the business panel must not depend on session initialization. Later entries restore that workbench's most recent session. Navigation and switching must not delete sessions, business records, project files, favorites, or notes.

## 8. Local self-test checklist

Check each applicable responsibility after development. “Host responsibility” means observe current Desktop behavior and report issues; plugin authors must not copy host UI. For “only when using this capability,” mark “not applicable” with a reason if unused. Claim local self-test passed only with evidence for all applicable items.

**Package and loading**

- [ ] **Plugin**: All required items in Section 3 pass. Run `pnpm pack`; use `tar -tzf <artifact.tgz>` to confirm `package.json`, server and client entries, and `cordis.patch.yml`. Install that artifact rather than running only from source.
- [ ] **Plugin**: Install under 3.6 and complete the required restart. If the agent runs inside the target DSH Desktop, the user must fully quit and reopen the app; check only after the user confirms. Find the plugin layer in `dsh --profile web --dump-config`, the entry in Desktop “Workbench management / Installed workbenches,” and the real business panel opened from the sidebar. Record configuration, list, and UI evidence separately; keep post-restart loading and UI checks pending until restart is confirmed.

**Section 4: UI boundary**

- [ ] **Plugin**: Open the panel, resize the window, switch between native session and workbench modes, and verify the panel does not cover sidebar, market, or management controls; business actions are keyboard reachable.
- [ ] **Plugin**: Check the business entry point and session-related actions both on first entry without a workbench session and with an owned session open. In a standard split, check the host generic guidance beside the business panel. With `customFrame`, check the workbench's own first-use and no-session actions.
- [ ] **Plugin**: With the sidebar expanded and collapsed and the window narrowed, check realistic Chinese and English headings, identifiers, numbers, and buttons. Avoid single-character vertical wrapping, clipped primary controls, and page-wide horizontal overflow. Verify that columns respond to the business container width, not only the window width.
- [ ] **Only if used; plugin**: With `customFrame`, narrow the window and operate layouts, overlays, and drag actions. Everything stays in host main content; native `conversation` works.

**Sections 5–6: workspaces and sessions**

- [ ] **Only if used; plugin**: When the business flow creates files or a workspace, trigger the host directory picker. After cancellation, verify no new directory, empty project, or binding. After confirmation, verify files are only at the chosen location. Test reselection and failure recovery if the original directory disappears.
- [ ] **Only if used; plugin**: If a business action sends to an agent or writes a session draft, open the panel without a session first and verify non-session functions. At the session-dependent action, create or restore this workbench's session; the user sends the draft. Opening an existing session restores its business selection.
- [ ] **Host; plugin assists verification**: In one workspace create a native session and sessions for two workbenches; open each from the sidebar. Each belongs to one owner, and project files remain in place across mode switching.

**Section 7: mode switching and preservation**

- [ ] **Host**: Use the sidebar switcher between Native sessions and each workbench. Verify only corresponding sessions appear; workbench icon, management entrance, focus, and collapse state are correct. Recheck ownership after workspace switching and new sessions. Report Desktop version and reproduction steps for defects; the plugin must not privately rewrite host state.
- [ ] **Host; plugin assists verification**: After closing/reopening and uninstalling, confirm existing sessions, project files, drafts, notes, and favorites remain in their original places. Record install/uninstall separately from data preservation.
- [ ] **Plugin**: Record Desktop version, OS, architecture, package version, UI path taken, and unverified items. If installation is unavailable, deliver under Section 9 without checking post-install items.

## 9. Delivery when something fails

Final delivery must list actual results and evidence: changed files, package version, local installation and self-test outcomes, and unverified items. Identify anything missing; never invent success. If the toolchain is missing, installation fails, or host APIs are unavailable, keep completed code, explain why, and state the next step.

## References

- DSH plugin packaging and publication: `docs/user/develop/basic/publish.md` and `config.md` in deepseek-harness; package manifest types in `@deepseek-ai/dsh-package-manifest`; client module loading in `@deepseek-ai/dsh-client-modules`.
- Market listing: [Workbench Market Acceptance Standard](https://dshdesktop.com/workbench/docs/market-acceptance-en/).
