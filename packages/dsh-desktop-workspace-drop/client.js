/**
 * Opens a folder dropped on the DSH Desktop window as a Harness workspace.
 *
 * A page cannot read the real path of a dropped folder — Chromium hides it — so
 * the preload bridge `window.dshDesktopFiles.getPathForFile` supplies it and
 * this plugin performs the adoption through the public client services
 * (`ctx.workspaces.create` + `ctx.uiWorkspace.openWorkspace`). Outside the
 * desktop host that bridge is absent, so the plugin installs nothing and leaves
 * drops to the composer's file-attachment flow.
 *
 * Folder drops are claimed in the capture phase because the composer owns a
 * document-level bubble listener that would otherwise take the directory as a
 * zero-byte attachment. File drops are never claimed here.
 */
window.__ModuleLoader__.load({
  id: 'dsh-desktop-workspace-drop',
  factory: (require) => {
    const module = { exports: {} }
    const exports = module.exports
    Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' })

    const NS = 'desktop.workspaceDrop'
    const NOTICE_ID = 'dsh-desktop-workspace-drop-notice'
    const NOTICE_STYLE_KEY = 'dsh-desktop-workspace-drop/notice.css'
    const NOTICE_TIMEOUT_MS = 8000

    const NOTICE_CSS =
      '.dshDesktopWorkspaceDropNotice{position:fixed;z-index:1200;left:50%;bottom:28px;transform:translateX(-50%);box-sizing:border-box;max-width:min(520px,calc(100vw - 32px));padding:10px 14px;border:.5px solid var(--dsw-alias-border-l4);border-radius:10px;color:var(--dsw-alias-label-primary);background:var(--dsw-alias-button-elevated-fill);box-shadow:var(--dsw-shadow-lv3);font-size:13px;line-height:18px;word-break:break-word}' +
      '@media (prefers-reduced-motion:no-preference){.dshDesktopWorkspaceDropNotice{animation:dshDesktopWorkspaceDropNoticeIn .16s ease-out}}' +
      '@keyframes dshDesktopWorkspaceDropNoticeIn{from{opacity:0}}'

    const en = {
      failed: 'Could not open the dropped folder: {message}',
      unresolved: 'the folder path could not be resolved'
    }
    const zh = {
      failed: '无法打开拖入的文件夹：{message}',
      unresolved: '无法解析该文件夹的路径'
    }

    /** Human-readable reason from a rejected adoption or bridge call. */
    function messageOf(reason) {
      return reason instanceof Error ? reason.message : String(reason)
    }

    /**
     * The dropped `File` handles when every dropped item is a directory, else
     * null. Null also means "cannot tell": `webkitGetAsEntry` is the only
     * synchronous entry probe Chromium exposes, and an unreadable entry must
     * leave the event to the attachment flow rather than guess that a folder is
     * involved.
     * @param transfer - the event's DataTransfer, possibly absent.
     * @returns one File per dropped directory, or null to leave the drop alone.
     */
    function droppedDirectoryFiles(transfer) {
      if (transfer === null || transfer === undefined) return null
      const items = transfer.items
      if (items === undefined || items.length === 0) return null
      const files = []
      for (let index = 0; index < items.length; index += 1) {
        const item = items[index]
        if (item.kind !== 'file') return null
        const entry =
          typeof item.webkitGetAsEntry === 'function' ? item.webkitGetAsEntry() : null
        if (entry === null || entry === undefined || entry.isDirectory !== true) return null
        const file = item.getAsFile()
        if (file === null) return null
        files.push(file)
      }
      return files.length === 0 ? null : files
    }

    /**
     * Claim folder drops for this window.
     * @param ctx - client root context.
     * @param t - translator for the workspace-drop namespace.
     * @returns the disposer removing every listener, node and timer it added.
     */
    function installWorkspaceDrop(ctx, t) {
      const bridge = window.dshDesktopFiles
      if (bridge === undefined || typeof bridge.getPathForFile !== 'function') return () => {}

      let notice = null
      let noticeTimer
      let noticeStyle = null

      function installNoticeStyle() {
        if (noticeStyle !== null) return
        if (
          document.querySelector(
            'style[data-plugin-css=' + JSON.stringify(NOTICE_STYLE_KEY) + ']'
          ) !== null
        ) {
          return
        }
        noticeStyle = document.createElement('style')
        noticeStyle.dataset.plugin = 'dsh-desktop-workspace-drop'
        noticeStyle.dataset.pluginCss = NOTICE_STYLE_KEY
        noticeStyle.textContent = NOTICE_CSS
        document.head.appendChild(noticeStyle)
      }

      /**
       * Transient, self-owned failure report; the success path stays silent.
       * Auto-dismisses, so it carries no pointer-only affordance.
       */
      function showNotice(message) {
        if (document.body === null || document.body === undefined) return
        installNoticeStyle()
        if (notice === null || notice.isConnected !== true) {
          notice = document.createElement('div')
          notice.id = NOTICE_ID
          notice.className = 'dshDesktopWorkspaceDropNotice'
          notice.setAttribute('role', 'status')
          notice.setAttribute('aria-live', 'polite')
          document.body.appendChild(notice)
        }
        notice.textContent = message
        clearTimeout(noticeTimer)
        noticeTimer = setTimeout(dismissNotice, NOTICE_TIMEOUT_MS)
      }

      function dismissNotice() {
        clearTimeout(noticeTimer)
        noticeTimer = undefined
        if (notice !== null) notice.remove()
        notice = null
      }

      async function adopt(files) {
        const [file] = files
        if (file === undefined) return
        if (files.length > 1) {
          console.warn(
            '[dsh-desktop-workspace-drop] opening the first of',
            files.length,
            'dropped folders'
          )
        }
        let path
        try {
          path = bridge.getPathForFile(file)
        } catch (reason) {
          showNotice(t('failed', { message: messageOf(reason) }))
          return
        }
        if (typeof path !== 'string' || path.length === 0) {
          showNotice(t('failed', { message: t('unresolved') }))
          return
        }
        try {
          const workspace = await ctx.workspaces.create({ path })
          await ctx.uiWorkspace.openWorkspace(workspace.workspaceId)
        } catch (reason) {
          showNotice(t('failed', { message: messageOf(reason) }))
        }
      }

      const onDragEnter = (event) => {
        if (droppedDirectoryFiles(event.dataTransfer) === null) return
        // Claimed before the composer's bubble listeners, so its file-drop
        // overlay does not invite an upload this drop will not perform.
        event.preventDefault()
        event.stopPropagation()
      }
      const onDragOver = (event) => {
        if (droppedDirectoryFiles(event.dataTransfer) === null) return
        event.preventDefault()
        if (event.dataTransfer !== null && event.dataTransfer !== undefined) {
          event.dataTransfer.dropEffect = 'copy'
        }
      }
      const onDrop = (event) => {
        const files = droppedDirectoryFiles(event.dataTransfer)
        if (files === null) return
        event.preventDefault()
        event.stopPropagation()
        void adopt(files)
      }

      document.addEventListener('dragenter', onDragEnter, true)
      document.addEventListener('dragover', onDragOver, true)
      document.addEventListener('drop', onDrop, true)
      return () => {
        document.removeEventListener('dragenter', onDragEnter, true)
        document.removeEventListener('dragover', onDragOver, true)
        document.removeEventListener('drop', onDrop, true)
        dismissNotice()
        if (noticeStyle !== null) noticeStyle.remove()
        noticeStyle = null
      }
    }

    const inject = ['locale', 'workspaces', 'uiWorkspace']

    /**
     * Client plugin body: register the copy and the window-level folder drop.
     * @param ctx - client root context.
     */
    function apply(ctx) {
      ctx.effect(
        () => ctx.locale.register(NS, { zh, en }),
        'dsh-desktop-workspace-drop: copy dictionaries'
      )
      const t = ctx.locale.bind(NS)
      ctx.effect(
        () => installWorkspaceDrop(ctx, t),
        'dsh-desktop-workspace-drop: folder drop'
      )
    }

    exports.apply = apply
    exports.inject = inject
    return module.exports
  }
})
