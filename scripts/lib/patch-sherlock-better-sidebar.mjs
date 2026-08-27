import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

const PATCH_MARKER = '/* sherlock:pinned-sidebar-tabs:v1 */'
const RECONCILE_PATCH_MARKER = '/* sherlock:pinned-sidebar-reconcile:v1 */'
const EDGE_PATCH_MARKER = '/* sherlock:pinned-sidebar-edge:v1 */'
const FILE_DRAG_PATCH_MARKER = '/* sherlock:files-to-research-canvas:v2 */'
const LEGACY_FILE_DRAG_PATCH_MARKER = '/* sherlock:files-to-research-canvas:v1 */'

function replaceExact(source, before, after, label, expectedCount = 1) {
  const count = source.split(before).length - 1
  if (count !== expectedCount) {
    throw new Error(`Unable to patch Better Sidebar ${label}: expected ${expectedCount}, found ${count}`)
  }
  return source.split(before).join(after)
}

/**
 * Extend the bundled Better Sidebar runtime with the small host contract used
 * by Research mode. The transform is deliberately exact so a plugin upgrade
 * fails packaging instead of silently shipping a half-compatible sidebar.
 */
export function patchBetterSidebarClient(source) {
  let next = source

  if (!next.includes(PATCH_MARKER)) next = replaceExact(
    next,
    '\t\tfunction openTabInActivePane(state, tab) {\n\t\t\tlet targetId = state.activePane ?? firstLeaf(state.splits).id;',
    `\t\tfunction openTabInActivePane(state, tab) {\n\t\t\t${PATCH_MARKER}\n\t\t\tconst pinned = tab.meta?.sherlockPinned === true;\n\t\t\tlet targetId = pinned ? firstLeaf(state.splits).id : state.activePane ?? firstLeaf(state.splits).id;`,
    'pinned landing pane'
  )
  if (!source.includes(PATCH_MARKER)) next = replaceExact(
    next,
    '\t\t\t\t[targetKey]: mapLeaf(state[targetKey], targetId, (leaf) => {\n\t\t\t\t\tleaf.tabs = [...leaf.tabs, tab];\n\t\t\t\t\tleaf.active = tab.id;',
    '\t\t\t\t[targetKey]: mapLeaf(state[targetKey], targetId, (leaf) => {\n\t\t\t\t\tleaf.tabs = pinned ? [tab, ...leaf.tabs] : [...leaf.tabs, tab];\n\t\t\t\t\tleaf.active = tab.id;',
    'pinned first position'
  )
  if (!next.includes(RECONCILE_PATCH_MARKER)) next = replaceExact(
    next,
    '\t\t\t\tconst existing = leaf.tabs.find((candidate) => candidate.id === tab.id);\n\t\t\t\tif (existing !== void 0) return activateTab(state, leaf.id, existing.id);',
    `\t\t\t\tconst existing = leaf.tabs.find((candidate) => candidate.id === tab.id);\n\t\t\t\t${RECONCILE_PATCH_MARKER}\n\t\t\t\tif (existing !== void 0) {\n\t\t\t\t\tif (!pinned) return activateTab(state, leaf.id, existing.id);\n\t\t\t\t\tconst reconciled = { ...existing, ...tab, meta: { ...existing.meta, ...tab.meta } };\n\t\t\t\t\treturn openTabInActivePane(closeTab(state, leaf.id, existing.id), reconciled);\n\t\t\t\t}`,
    'persisted pinned tab reconciliation'
  )

  if (!next.includes(EDGE_PATCH_MARKER)) next = replaceExact(
    next,
    '\t\tfunction moveTabToEdge(state, fromPane, tabId, toPane, zone) {',
    `\t\tfunction moveTabToEdge(state, fromPane, tabId, toPane, zone) {\n\t\t\t${EDGE_PATCH_MARKER}\n\t\t\tconst moving = leafWithTab(state[treeOf(state, fromPane)], tabId)?.tabs.find((tab) => tab.id === tabId);\n\t\t\tif (moving?.meta?.sherlockPinned === true) return state;\n\t\t\tconst targetHasPinned = leafWithTab(state[treeOf(state, toPane)], \"sherlock-research-conversation\")?.id === toPane;\n\t\t\tif (targetHasPinned && (zone === \"left\" || zone === \"up\")) zone = \"center\";`,
    'pinned edge boundary'
  )

  if (next.includes(FILE_DRAG_PATCH_MARKER) && !next.includes('const previewEligible = relativePath !== null')) {
    next = replaceExact(
      next,
      '\t\t\tconst relativePath = safeSherlockSidebarRelativePath(filePath, cwd, relativePathHint);\n\t\t\tevent.dataTransfer.effectAllowed = "copy";\n\t\t\tevent.dataTransfer.setData("application/x-sherlock-file", JSON.stringify(relativePath === null ? { path: filePath, name } : { path: filePath, name, sessionId, relativePath }));',
      '\t\t\tconst relativePath = safeSherlockSidebarRelativePath(filePath, cwd, relativePathHint);\n\t\t\tconst previewEligible = relativePath !== null && relativePath.length <= 512 && typeof sessionId === "string" && sessionId.length > 0 && sessionId.length <= 512;\n\t\t\tevent.dataTransfer.effectAllowed = "copy";\n\t\t\tevent.dataTransfer.setData("application/x-sherlock-file", JSON.stringify(previewEligible ? { path: filePath, name, sessionId, relativePath } : { path: filePath, name }));',
      'bounded Research file preview identity'
    )
  }

  if (!next.includes(FILE_DRAG_PATCH_MARKER) && next.includes(LEGACY_FILE_DRAG_PATCH_MARKER)) {
    next = replaceExact(
      next,
      `${LEGACY_FILE_DRAG_PATCH_MARKER}\n\t\tfunction writeSherlockSidebarFileDrag(event, filePath, name) {\n\t\t\tif (event.dataTransfer === null) return;\n\t\t\tevent.dataTransfer.effectAllowed = "copy";\n\t\t\tevent.dataTransfer.setData("application/x-sherlock-file", JSON.stringify({ path: filePath, name }));\n\t\t}`,
      `${FILE_DRAG_PATCH_MARKER}\n\t\tfunction safeSherlockSidebarRelativePath(filePath, cwd, relativePathHint) {\n\t\t\tconst raw = typeof relativePathHint === "string" ? relativePathHint : typeof cwd === "string" && (filePath.startsWith(\`\${cwd}/\`) || filePath.startsWith(\`\${cwd}\\\\\`)) ? filePath.slice(cwd.length + 1) : "";\n\t\t\tconst relativePath = raw.replaceAll("\\\\", "/");\n\t\t\tif (relativePath === "" || /^(?:\\/|[A-Za-z]:\\/)/.test(relativePath) || relativePath.split("/").some((part) => part === "" || part === "." || part === "..")) return null;\n\t\t\treturn relativePath;\n\t\t}\n\t\tfunction writeSherlockSidebarFileDrag(event, filePath, name, sessionId, cwd, relativePathHint) {\n\t\t\tif (event.dataTransfer === null) return;\n\t\t\tconst relativePath = safeSherlockSidebarRelativePath(filePath, cwd, relativePathHint);\n\t\t\tconst previewEligible = relativePath !== null && relativePath.length <= 512 && typeof sessionId === "string" && sessionId.length > 0 && sessionId.length <= 512;\n\t\t\tevent.dataTransfer.effectAllowed = "copy";\n\t\t\tevent.dataTransfer.setData("application/x-sherlock-file", JSON.stringify(previewEligible ? { path: filePath, name, sessionId, relativePath } : { path: filePath, name }));\n\t\t}`,
      'Research file drag payload upgrade'
    )
    next = replaceExact(next,
      'writeSherlockSidebarFileDrag(event, entry.path, entry.name);',
      'writeSherlockSidebarFileDrag(event, entry.path, entry.name, sessionId, cwd);',
      'file tree preview identity')
    next = replaceExact(next,
      'writeSherlockSidebarFileDrag(event, absolutePath, baseName$1(absolutePath));',
      'writeSherlockSidebarFileDrag(event, absolutePath, baseName$1(absolutePath), sessionId, cwd, rel);',
      'search result preview identity')
  }

  if (!next.includes(FILE_DRAG_PATCH_MARKER)) {
    next = replaceExact(
      next,
      `\t\tfunction baseName$1(path) {\n\t\t\tconst trimmed = path.replace(/[\\\\/]+$/, "");\n\t\t\tconst at = Math.max(trimmed.lastIndexOf("/"), trimmed.lastIndexOf("\\\\"));\n\t\t\treturn at === -1 ? trimmed : trimmed.slice(at + 1);\n\t\t}\n\t\t/** How long the row's "copied" label stays after a successful write. */`,
      `\t\tfunction baseName$1(path) {\n\t\t\tconst trimmed = path.replace(/[\\\\/]+$/, "");\n\t\t\tconst at = Math.max(trimmed.lastIndexOf("/"), trimmed.lastIndexOf("\\\\"));\n\t\t\treturn at === -1 ? trimmed : trimmed.slice(at + 1);\n\t\t}\n\t\t${FILE_DRAG_PATCH_MARKER}\n\t\tfunction safeSherlockSidebarRelativePath(filePath, cwd, relativePathHint) {\n\t\t\tconst raw = typeof relativePathHint === "string" ? relativePathHint : typeof cwd === "string" && (filePath.startsWith(\`\${cwd}/\`) || filePath.startsWith(\`\${cwd}\\\\\`)) ? filePath.slice(cwd.length + 1) : "";\n\t\t\tconst relativePath = raw.replaceAll("\\\\", "/");\n\t\t\tif (relativePath === "" || /^(?:\\/|[A-Za-z]:\\/)/.test(relativePath) || relativePath.split("/").some((part) => part === "" || part === "." || part === "..")) return null;\n\t\t\treturn relativePath;\n\t\t}\n\t\tfunction writeSherlockSidebarFileDrag(event, filePath, name, sessionId, cwd, relativePathHint) {\n\t\t\tif (event.dataTransfer === null) return;\n\t\t\tconst relativePath = safeSherlockSidebarRelativePath(filePath, cwd, relativePathHint);\n\t\t\tconst previewEligible = relativePath !== null && relativePath.length <= 512 && typeof sessionId === "string" && sessionId.length > 0 && sessionId.length <= 512;\n\t\t\tevent.dataTransfer.effectAllowed = "copy";\n\t\t\tevent.dataTransfer.setData("application/x-sherlock-file", JSON.stringify(previewEligible ? { path: filePath, name, sessionId, relativePath } : { path: filePath, name }));\n\t\t}\n\t\t/** How long the row's "copied" label stays after a successful write. */`,
      'Research file drag payload'
    )
    next = replaceExact(
      next,
      `\t\t\t\t\t\tstyle: { paddingLeft: depth * 22 + 6 },\n\t\t\t\t\t\ttitle: entry.broken ? \`\${entry.path} — \${t("brokenSymlink")}\` : entry.path,\n\t\t\t\t\t\tonClick: () => {`,
      `\t\t\t\t\t\tstyle: { paddingLeft: depth * 22 + 6 },\n\t\t\t\t\t\ttitle: entry.broken ? \`\${entry.path} — \${t("brokenSymlink")}\` : entry.path,\n\t\t\t\t\t\tdraggable: true,\n\t\t\t\t\t\t"data-sherlock-file-drag-source": entry.path,\n\t\t\t\t\t\tonDragStart: (event) => {\n\t\t\t\t\t\t\twriteSherlockSidebarFileDrag(event, entry.path, entry.name, sessionId, cwd);\n\t\t\t\t\t\t},\n\t\t\t\t\t\tonClick: () => {`,
      'file tree drag source'
    )
    next = replaceExact(
      next,
      `\t\t\t\t\t\terror === null && results !== null && results.matches.map((rel) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {\n\t\t\t\t\t\t\ttype: "button",\n\t\t\t\t\t\t\tclassName: sidebar_module_css_default.editorSearchResult,\n\t\t\t\t\t\t\ttitle: rel,\n\t\t\t\t\t\t\tonClick: () => {\n\t\t\t\t\t\t\t\tonOpenFile(resolveSidebarPath(cwd, rel));\n\t\t\t\t\t\t\t},\n\t\t\t\t\t\t\tchildren: rel\n\t\t\t\t\t\t}, rel)),`,
      `\t\t\t\t\t\terror === null && results !== null && results.matches.map((rel) => {\n\t\t\t\t\t\t\tconst absolutePath = resolveSidebarPath(cwd, rel);\n\t\t\t\t\t\t\treturn /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {\n\t\t\t\t\t\t\t\ttype: "button",\n\t\t\t\t\t\t\t\tclassName: sidebar_module_css_default.editorSearchResult,\n\t\t\t\t\t\t\t\ttitle: rel,\n\t\t\t\t\t\t\t\tdraggable: true,\n\t\t\t\t\t\t\t\t"data-sherlock-file-drag-source": absolutePath,\n\t\t\t\t\t\t\t\tonDragStart: (event) => {\n\t\t\t\t\t\t\t\t\twriteSherlockSidebarFileDrag(event, absolutePath, baseName$1(absolutePath), sessionId, cwd, rel);\n\t\t\t\t\t\t\t\t},\n\t\t\t\t\t\t\t\tonClick: () => {\n\t\t\t\t\t\t\t\t\tonOpenFile(absolutePath);\n\t\t\t\t\t\t\t\t},\n\t\t\t\t\t\t\t\tchildren: rel\n\t\t\t\t\t\t\t}, rel);\n\t\t\t\t\t\t}),`,
      'search result drag source'
    )
  }

  if (source.includes(PATCH_MARKER)) return next

  const moveBefore = `\t\t\t\t\tconst insertAt = index >= 0 && index <= leaf.tabs.length ? index : leaf.tabs.length;\n\t\t\t\t\tleaf.tabs = [\n\t\t\t\t\t\t...leaf.tabs.slice(0, insertAt),\n\t\t\t\t\t\tmoved,\n\t\t\t\t\t\t...leaf.tabs.slice(insertAt)\n\t\t\t\t\t];`
  const moveAfter = `\t\t\t\t\tconst requestedIndex = index >= 0 && index <= leaf.tabs.length ? index : leaf.tabs.length;\n\t\t\t\t\tconst pinnedCount = leaf.tabs.filter((tab) => tab.meta?.sherlockPinned === true).length;\n\t\t\t\t\tconst insertAt = moved.meta?.sherlockPinned === true ? 0 : Math.max(pinnedCount, requestedIndex);\n\t\t\t\t\tleaf.tabs = [\n\t\t\t\t\t\t...leaf.tabs.slice(0, insertAt),\n\t\t\t\t\t\tmoved,\n\t\t\t\t\t\t...leaf.tabs.slice(insertAt)\n\t\t\t\t\t];`
  next = replaceExact(next, moveBefore, moveAfter, 'cross-panel pinned move boundary')
  next = replaceExact(
    next,
    moveBefore.replaceAll('\t\t\t\t\t', '\t\t\t\t'),
    moveAfter.replaceAll('\t\t\t\t\t', '\t\t\t\t'),
    'same-panel pinned move boundary'
  )

  next = replaceExact(
    next,
    '\t\t\t"settingSelect"\n\t\t];',
    '\t\t\t"settingSelect",\n\t\t\t"panelState"\n\t\t];',
    'panel state feature'
  )

  const serviceBefore = `\t\t\tconst closeTab$1 = (tabId, scope) => {\n\t\t\t\tlet closed;\n\t\t\t\tstore.reduce((state) => {\n\t\t\t\t\tif (!tabOpenIn(state, tabId)) return state;\n\t\t\t\t\tconst paneId = findPaneIdOf(state, tabId);\n\t\t\t\t\tclosed = leafWithTab(state[treeOf(state, paneId)], tabId)?.tabs.find((tab) => tab.id === tabId);\n\t\t\t\t\treturn closeTab(state, paneId, tabId);\n\t\t\t\t});\n\t\t\t\tif (closed !== void 0) {\n\t\t\t\t\tconst sessionId = scope?.sessionId ?? store.getSnapshot().sessionId;\n\t\t\t\t\tif (sessionId !== void 0) {\n\t\t\t\t\t\tconst descriptor = tabs.get(closed.type);\n\t\t\t\t\t\tsafeCall(() => descriptor?.onClose?.(closed, scope ?? { sessionId }));\n\t\t\t\t\t}\n\t\t\t\t}\n\t\t\t};\n\t\t\t/** The snapshot the store publishes (state/prefs carry the active session). */\n\t\t\tconst getSnapshot = () => store.getSnapshot();\n\t\t\t/** Store changes: session switch, state mutations, prefs writes. */\n\t\t\tconst subscribeState = (listener) => store.subscribe(listener);\n\t\t\t/** Patch an open tab's display fields (a missing tab id is a no-op). */\n\t\t\tconst updateTab = (tabId, patch) => {\n\t\t\t\tstore.reduce((state) => patchTab(state, tabId, {\n\t\t\t\t\t...patch.title !== void 0 ? { title: patch.title } : {},\n\t\t\t\t\t...patch.path !== void 0 ? { path: patch.path } : {},\n\t\t\t\t\t...patch.meta !== void 0 ? { meta: patch.meta } : {}\n\t\t\t\t}));\n\t\t\t};\n\t\t\t/** Activate an open tab (the tab-bar activation path; fires onActivate). */\n\t\t\tconst activateTab$1 = (tabId, scope) => {\n\t\t\t\tlet activated;\n\t\t\t\tstore.reduce((state) => {\n\t\t\t\t\tif (!tabOpenIn(state, tabId)) return state;\n\t\t\t\t\tconst paneId = findPaneIdOf(state, tabId);\n\t\t\t\t\tactivated = leafWithTab(state[treeOf(state, paneId)], tabId)?.tabs.find((tab) => tab.id === tabId);\n\t\t\t\t\treturn activateTab(state, paneId, tabId);\n\t\t\t\t});\n\t\t\t\tif (activated !== void 0) {\n\t\t\t\t\tconst sessionId = scope?.sessionId ?? store.getSnapshot().sessionId;\n\t\t\t\t\tif (sessionId !== void 0) {\n\t\t\t\t\t\tconst descriptor = tabs.get(activated.type);\n\t\t\t\t\t\tsafeCall(() => descriptor?.onActivate?.(activated, scope ?? { sessionId }));\n\t\t\t\t\t}\n\t\t\t\t}\n\t\t\t};`
  const serviceAfter = `\t\t\tconst closeTab$1 = (tabId, scope) => {\n\t\t\t\tlet closed;\n\t\t\t\tconst activeSessionId = store.getSnapshot().sessionId;\n\t\t\t\tconst targetsInactiveSession = scope !== void 0 && scope.sessionId !== activeSessionId;\n\t\t\t\tconst reducer = (state) => {\n\t\t\t\t\tif (!tabOpenIn(state, tabId)) return state;\n\t\t\t\t\tconst paneId = findPaneIdOf(state, tabId);\n\t\t\t\t\tconst candidate = leafWithTab(state[treeOf(state, paneId)], tabId)?.tabs.find((tab) => tab.id === tabId);\n\t\t\t\t\tif (candidate?.meta?.sherlockClosable === false) return state;\n\t\t\t\t\tclosed = candidate;\n\t\t\t\t\treturn closeTab(state, paneId, tabId);\n\t\t\t\t};\n\t\t\t\tif (targetsInactiveSession) store.reduceFor(scope.sessionId, reducer);\n\t\t\t\telse store.reduce(reducer);\n\t\t\t\tif (closed !== void 0) {\n\t\t\t\t\tconst sessionId = scope?.sessionId ?? activeSessionId;\n\t\t\t\t\tif (sessionId !== void 0) {\n\t\t\t\t\t\tconst descriptor = tabs.get(closed.type);\n\t\t\t\t\t\tsafeCall(() => descriptor?.onClose?.(closed, scope ?? { sessionId }));\n\t\t\t\t\t}\n\t\t\t\t}\n\t\t\t};\n\t\t\t/** The snapshot the store publishes (state/prefs carry the active session). */\n\t\t\tconst getSnapshot = () => store.getSnapshot();\n\t\t\t/** Store changes: session switch, state mutations, prefs writes. */\n\t\t\tconst subscribeState = (listener) => store.subscribe(listener);\n\t\t\t/** Patch an open tab's display fields (a missing tab id is a no-op). */\n\t\t\tconst updateTab = (tabId, patch, scope) => {\n\t\t\t\tconst reducer = (state) => patchTab(state, tabId, {\n\t\t\t\t\t...patch.title !== void 0 ? { title: patch.title } : {},\n\t\t\t\t\t...patch.path !== void 0 ? { path: patch.path } : {},\n\t\t\t\t\t...patch.meta !== void 0 ? { meta: patch.meta } : {}\n\t\t\t\t});\n\t\t\t\tconst targetsInactiveSession = scope !== void 0 && scope.sessionId !== store.getSnapshot().sessionId;\n\t\t\t\ttargetsInactiveSession ? store.reduceFor(scope.sessionId, reducer) : store.reduce(reducer);\n\t\t\t};\n\t\t\t/** Activate an open tab (the tab-bar activation path; fires onActivate). */\n\t\t\tconst activateTab$1 = (tabId, scope) => {\n\t\t\t\tlet activated;\n\t\t\t\tconst activeSessionId = store.getSnapshot().sessionId;\n\t\t\t\tconst targetsInactiveSession = scope !== void 0 && scope.sessionId !== activeSessionId;\n\t\t\t\tconst reducer = (state) => {\n\t\t\t\t\tif (!tabOpenIn(state, tabId)) return state;\n\t\t\t\t\tconst paneId = findPaneIdOf(state, tabId);\n\t\t\t\t\tactivated = leafWithTab(state[treeOf(state, paneId)], tabId)?.tabs.find((tab) => tab.id === tabId);\n\t\t\t\t\treturn activateTab(state, paneId, tabId);\n\t\t\t\t};\n\t\t\t\tif (targetsInactiveSession) store.reduceFor(scope.sessionId, reducer);\n\t\t\t\telse store.reduce(reducer);\n\t\t\t\tif (activated !== void 0) {\n\t\t\t\t\tconst sessionId = scope?.sessionId ?? activeSessionId;\n\t\t\t\t\tif (sessionId !== void 0) {\n\t\t\t\t\t\tconst descriptor = tabs.get(activated.type);\n\t\t\t\t\t\tsafeCall(() => descriptor?.onActivate?.(activated, scope ?? { sessionId }));\n\t\t\t\t\t}\n\t\t\t\t}\n\t\t\t};`
  next = replaceExact(next, serviceBefore, serviceAfter, 'session-targeted service operations')

  next = replaceExact(
    next,
    '\t\t\t/** Open a file in the sidebar editor of `scope`\'s session (title defaults',
    `\t\t\tconst setPanelState = (patch, scope) => {\n\t\t\t\tconst reducer = (state) => {\n\t\t\t\t\tlet result = state;\n\t\t\t\t\tif (typeof patch.width === "number") result = setWidth(result, patch.width);\n\t\t\t\t\tif (typeof patch.open === "boolean" && result.panelOpen !== patch.open) result = { ...result, panelOpen: patch.open };\n\t\t\t\t\treturn result;\n\t\t\t\t};\n\t\t\t\tconst targetsInactiveSession = scope !== void 0 && scope.sessionId !== store.getSnapshot().sessionId;\n\t\t\t\ttargetsInactiveSession ? store.reduceFor(scope.sessionId, reducer) : store.reduce(reducer);\n\t\t\t};\n\t\t\t/** Open a file in the sidebar editor of \`scope\`'s session (title defaults`,
    'panel state service'
  )
  next = replaceExact(
    next,
    '\t\t\t\tactivateTab: activateTab$1,\n\t\t\t\topenFile',
    '\t\t\t\tactivateTab: activateTab$1,\n\t\t\t\tsetPanelState,\n\t\t\t\topenFile',
    'panel state export'
  )

  next = replaceExact(
    next,
    '\t\t\t\t\tchildren: [tabs.map((tab) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {',
    '\t\t\t\t\tchildren: [tabs.map((tab) => {\n\t\t\t\t\t\tconst pinned = tab.meta?.sherlockPinned === true;\n\t\t\t\t\t\treturn /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {',
    'tab render metadata'
  )
  next = replaceExact(next, '\t\t\t\t\t\tdraggable: true,', '\t\t\t\t\t\tdraggable: !pinned,', 'fixed tab drag')
  next = replaceExact(
    next,
    '\t\t\t\t\t\tonDragStart: (event) => {\n\t\t\t\t\t\t\tsetTabDragging(true);',
    '\t\t\t\t\t\tonDragStart: (event) => {\n\t\t\t\t\t\t\tif (pinned) { event.preventDefault(); return; }\n\t\t\t\t\t\t\tsetTabDragging(true);',
    'fixed tab drag handler'
  )
  next = replaceExact(
    next,
    '\t\t\t\t\t\t\tif (event.button === 1) {',
    '\t\t\t\t\t\t\tif (event.button === 1 && tab.meta?.sherlockClosable !== false) {',
    'fixed tab middle click'
  )
  const closeBefore = `\t\t\t\t\t\t\t/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {\n\t\t\t\t\t\t\t\ttype: "button",\n\t\t\t\t\t\t\t\tclassName: sidebar_module_css_default.tabClose,\n\t\t\t\t\t\t\t\t"aria-label": t("close"),\n\t\t\t\t\t\t\t\tonClick: (event) => {\n\t\t\t\t\t\t\t\t\tevent.stopPropagation();\n\t\t\t\t\t\t\t\t\tonClose(tab.id);\n\t\t\t\t\t\t\t\t},\n\t\t\t\t\t\t\t\tchildren: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconCloseFill14, {})\n\t\t\t\t\t\t\t})`
  const closeAfter = `\t\t\t\t\t\t\ttab.meta?.sherlockClosable !== false ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {\n\t\t\t\t\t\t\t\ttype: "button",\n\t\t\t\t\t\t\t\tclassName: sidebar_module_css_default.tabClose,\n\t\t\t\t\t\t\t\t"aria-label": t("close"),\n\t\t\t\t\t\t\t\tonClick: (event) => {\n\t\t\t\t\t\t\t\t\tevent.stopPropagation();\n\t\t\t\t\t\t\t\t\tonClose(tab.id);\n\t\t\t\t\t\t\t\t},\n\t\t\t\t\t\t\t\tchildren: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconCloseFill14, {})\n\t\t\t\t\t\t\t}) : null`
  next = replaceExact(next, closeBefore, closeAfter, 'fixed tab close control')
  next = replaceExact(
    next,
    '\t\t\t\t\t}, tab.id)), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Menu, {',
    '\t\t\t\t\t}, tab.id); }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Menu, {',
    'tab render closure'
  )

  return next
}

export async function patchBetterSidebarPackage(packageRoot) {
  const manifestPath = path.join(packageRoot, 'package.json')
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
  if (manifest.name !== 'dsh-better-sidebar' || manifest.version !== '0.14.1') {
    throw new Error(
      `Unsupported Better Sidebar package for Sherlock patch: ${manifest.name}@${manifest.version}`
    )
  }
  const clientPath = path.join(packageRoot, 'lib', 'client.js')
  const source = await readFile(clientPath, 'utf8')
  const patched = patchBetterSidebarClient(source)
  if (patched !== source) await writeFile(clientPath, patched, 'utf8')
}
