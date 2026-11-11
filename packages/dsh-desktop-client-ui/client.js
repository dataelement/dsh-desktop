window.__ModuleLoader__.load({
  id: 'dsh-desktop-client-ui',
  factory: (require) => {
    const module = { exports: {} }
    const exports = module.exports
    Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' })

    const React = require('react')
    const { BrandWordmark, FishLogo, MenuItemButton, Tooltip } = require('@deepseek-ai/dsh-client-ui-primitives')

    // Tight bounds of the mark inside its 1000x1000 source artwork.
    const BRAND_MARK_VIEWBOX = { x: 42, y: 218, width: 898, height: 564 }
    // DSH Desktop whale mark: a window with a tail, drawn in currentColor so
    // it follows the sidebar text color in both themes.
    const BRAND_MARK_PATH = "M478.318 218C605.318 218 683.318 287 687.318 404L691.318 472C693.318 525 697.319 556 726.318 574C746.318 587 774.318 585 790.318 562C799.318 550 802.318 539 792.318 534C747.319 513 727.318 472 738.318 428C739.652 420 742.652 418.667 747.318 424C774.318 450 815.318 460 831.318 501C855.318 457 898.318 456 930.318 436C936.318 431.333 939.318 433.333 939.318 442C938.318 496 903.318 535 850.318 547C841.318 570 833.318 592 819.318 622C773.318 723 661.318 782 491.318 782H294.318C161.319 782 74.3183 714 53.3184 592C41.3184 526 38.3184 433 50.3184 375C70.3184 277 113.82 218 234.32 218H478.318ZM571.82 350.5C469.82 333.5 277.82 329.5 164.82 350.5C138.82 355.5 114.318 379 110.318 404C100.318 451 102.318 551 124.318 596C155.318 660 214.319 697 315.318 705C324.318 678 346.319 662 376.318 662C404.318 662 427.318 678 435.318 705C493.318 699 526.318 680 562.318 652C621.318 606 633.749 527.103 633.749 424C633.749 385.144 604.82 355.5 571.82 350.5ZM179.32 264C167.722 264 158.32 273.402 158.32 285C158.32 296.598 167.722 306 179.32 306C190.918 306 200.32 296.598 200.32 285C200.32 273.402 190.918 264 179.32 264ZM245.551 264C233.953 264 224.551 273.402 224.551 285C224.551 296.598 233.953 306 245.551 306C257.149 306 266.551 296.598 266.551 285C266.551 273.402 257.149 264 245.551 264ZM311.782 264C300.184 264 290.782 273.402 290.782 285C290.782 296.598 300.184 306 311.782 306C323.38 306 332.782 296.598 332.782 285C332.782 273.402 323.38 264 311.782 264Z"

    function DesktopBrandMark() {
      const height = 17
      return React.createElement(
        'svg',
        {
          width: height * BRAND_MARK_VIEWBOX.width / BRAND_MARK_VIEWBOX.height,
          height,
          viewBox: `${BRAND_MARK_VIEWBOX.x} ${BRAND_MARK_VIEWBOX.y} ${BRAND_MARK_VIEWBOX.width} ${BRAND_MARK_VIEWBOX.height}`,
          fill: 'none',
          'aria-hidden': 'true'
        },
        React.createElement('path', { d: BRAND_MARK_PATH, fill: 'currentColor' })
      )
    }

    function DesktopBrandName() {
      return React.createElement(BrandWordmark, { includeMark: false })
    }

    function ConversationBrandMark(props) {
      return React.createElement(FishLogo, props)
    }

    function OpenUnpreviewableFile({ absolutePath, openWorkspacePath }) {
      const [error, setError] = React.useState('')
      const label = document.documentElement.lang?.toLowerCase().startsWith('zh')
        ? '用本地应用打开'
        : 'Open with local app'
      return React.createElement(
        React.Fragment,
        null,
        React.createElement('button', {
          type: 'button',
          'data-textpreview-open-local': true,
          onClick: () => {
            setError('')
            void openWorkspacePath(absolutePath).catch((reason) => {
              setError(reason instanceof Error ? reason.message : String(reason))
            })
          }
        }, label),
        error && React.createElement('span', { role: 'alert' }, error)
      )
    }

    function DeleteSessionMenuItem({ sessionId, displayTitle, useMenuOpenState, deleteSession }) {
      const [, setMenuOpen] = useMenuOpenState()
      const chinese = document.documentElement.lang?.toLowerCase().startsWith('zh')
      const label = chinese ? '永久删除会话' : 'Delete session permanently'
      const warning = chinese
        ? `确定删除“${displayTitle || sessionId}”？工作区文件会保留。此操作无法撤销。`
        : `Delete “${displayTitle || sessionId}”? Workspace files are kept. This can’t be undone.`
      return React.createElement(MenuItemButton, {
        danger: true,
        onSelect: () => {
          setMenuOpen(false)
          if (!window.confirm(warning)) return
          void Promise.resolve().then(() => deleteSession(sessionId)).catch((reason) => {
            window.alert(reason instanceof Error ? reason.message : String(reason))
          })
        }
      }, label)
    }

    function OpenSessionFolderMenuItem({ sessionId, useMenuOpenState, openInFinder }) {
      const [, setMenuOpen] = useMenuOpenState()
      if (typeof window.dshDesktop?.openInFinder !== 'function') return null
      const chinese = document.documentElement.lang?.toLowerCase().startsWith('zh')
      const label = chinese ? '在文件管理器中打开' : 'Open in file manager'
      return React.createElement(MenuItemButton, {
        onSelect: () => {
          setMenuOpen(false)
          void Promise.resolve().then(() => openInFinder(sessionId)).catch((reason) => {
            window.alert(reason instanceof Error ? reason.message : String(reason))
          })
        }
      }, label)
    }

    function UnreadSessionMenuItem({ sessionId, unread, onUnreadChange, useMenuOpenState }) {
      const [, setMenuOpen] = useMenuOpenState()
      const chinese = document.documentElement.lang?.toLowerCase().startsWith('zh')
      return React.createElement(MenuItemButton, {
        onSelect: () => {
          setMenuOpen(false)
          onUnreadChange(sessionId, !unread)
        }
      }, unread ? (chinese ? '标为已读' : 'Mark as read') : (chinese ? '标为未读' : 'Mark as unread'))
    }

    const ENTERPRISE_NS = 'dsh-desktop-enterprise-entry'
    function EnterpriseEntry({ t }) {
      return React.createElement('a', {
        href: 'https://dshdesktop.com/zh/enterprise/', target: '_blank', rel: 'noopener noreferrer',
        'data-dsh-enterprise-entry': true
      }, t('learnMore'), React.createElement('span', { 'aria-hidden': true }, ' ↗'))
    }

    const REPAIR_NS = 'desktop.repair'
    function RepairDraft({ session, input, inputActions }) {
      const currentInput = React.useRef(input)
      currentInput.current = input
      React.useEffect(() => {
        const bridge = window.dshDesktop
        if (typeof bridge?.getRepairDraft !== 'function') return
        let alive = true
        const span = inputActions.captureInsertion()
        const empty = input.draft === '' && input.attachmentIds.length === 0 && input.phase === 'plain'
        void bridge.getRepairDraft(session.sessionId).then(async draft => {
          if (!alive || typeof draft?.token !== 'string') return
          const current = currentInput.current
          if (empty && current.draft === '' && current.attachmentIds.length === 0 && current.phase === 'plain' && typeof draft.text === 'string' && draft.text) {
            if (inputActions.insertText(draft.text, span)) inputActions.persistDraft()
          }
          await bridge.acknowledgeRepairDraft(session.sessionId, draft.token)
        }).catch(error => { console.warn('[desktop-repair] draft initialization failed', error) })
        return () => { alive = false }
      }, [session.sessionId, inputActions])
      return null
    }
    function DesktopUtilities({ wide, t }) {
      const [busy, setBusy] = React.useState(false)
      const [error, setError] = React.useState(false)
      const alive = React.useRef(true)
      React.useEffect(() => { alive.current = true; return () => { alive.current = false } }, [])
      const bridge = window.dshDesktop
      const open = async operation => {
        if (busy) return
        setBusy(true); setError(false)
        try {
          const result = await operation()
          if (result?.ok === false) throw new Error('Desktop operation failed')
        } catch { if (alive.current) setError(true) }
        finally { if (alive.current) setBusy(false) }
      }
      const icon = phone => React.createElement('svg', { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, 'aria-hidden': true },
        phone ? React.createElement('rect', { x: 7, y: 3, width: 10, height: 18, rx: 2 })
          : React.createElement('path', { d: 'M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-7.91 7.91a2.12 2.12 0 0 1-3-3l7.91-7.91a6 6 0 0 1 7.94-7.94z' }))
      return React.createElement('div', { 'data-dsh-desktop-utilities': true, 'data-wide': wide },
        typeof bridge?.openRepairAgent === 'function' && React.createElement(Tooltip, { label: t('description'), side: 'top', align: 'end', portal: true, maxWidth: 280, delayMs: 0, focusDelayMs: 0 },
          React.createElement('button', { type: 'button', disabled: busy, 'aria-label': t('open'), 'aria-description': t('description'), 'data-dsh-repair-entry': true, onClick: () => { void open(() => bridge.openRepairAgent()) } }, icon(false))),
        typeof bridge?.openMobilePairing === 'function' && wide && React.createElement('button', { type: 'button', disabled: busy, 'aria-label': t('phone'), 'data-dsh-mobile-entry': true, onClick: () => { void open(() => bridge.openMobilePairing()) } }, icon(true)),
        error && React.createElement('span', { role: 'alert' }, t('failed')))
    }
    function applyRepair(ctx) {
      ctx.effect(() => ctx.locale.register(REPAIR_NS, {
        zh: { open: '进入维修模式', description: '维修 Agent：协助排查和修复问题。', phone: '连接手机', failed: '无法打开，请重试。' },
        en: { open: 'Enter repair mode', description: 'Repair Agent helps diagnose and resolve problems.', phone: 'Connect phone', failed: 'Could not open. Try again.' }
      }))
      const bridge = window.dshDesktop
      if (typeof bridge?.getRepairDraft === 'function') ctx.slots.inject('conversation.input.dock', () => ctx.slots.register({ name: 'conversation.input.dock', id: 'desktop-repair-draft' }, RepairDraft))
      if (typeof bridge?.openRepairAgent === 'function' || typeof bridge?.openMobilePairing === 'function') ctx.slots.inject('sidebar.settings.action', () => ctx.slots.register({ name: 'sidebar.settings.action', id: 'desktop-utilities', locale: REPAIR_NS, inject: () => ({ t: ctx.locale.bind(REPAIR_NS) }) }, DesktopUtilities))
    }

    const inject = ['locale', 'slots', 'remote.session', 'sessions', 'uiWorkspace']
    function apply(ctx) {
      applyRepair(ctx)
      ctx.effect(() => ctx.locale.register(ENTERPRISE_NS, {
        zh: { learnMore: '了解企业版' }, en: { learnMore: 'Explore Enterprise' }
      }))
      const enterpriseText = ctx.locale.bind(ENTERPRISE_NS)
      ctx.slots.inject('settings.sidebar.footer', () => ctx.slots.register({
        name: 'settings.sidebar.footer', id: 'desktop-enterprise-entry', locale: ENTERPRISE_NS,
        inject: () => ({ t: enterpriseText })
      }, EnterpriseEntry))
      ctx.effect(() => {
        const id = 'dsh-desktop-preset-toolbar-style'
        if (document.getElementById(id)) return
        const style = document.createElement('style')
        style.id = id
        style.textContent = `
          [data-dsh-sidebar-brand-identity] { display:none !important; }
          /* Third-party plugins (dshmarket, dsh-better-sidebar) draw custom icons via ::before on settings nav rows,
             expecting direct > svg to hide the fallback gear. In 0.2.2-rc.1, navIcon wraps the fallback in a span,
             so ensure the fallback gear container is hidden when custom nav marker is present. */
          [data-dsh-market-nav-icon] span[class*="navIcon"],
          [data-dsh-market-nav-icon] svg,
          [data-dsh-better-sidebar-settings-nav] span[class*="navIcon"],
          [data-dsh-better-sidebar-settings-nav] svg { display:none !important; }
          [data-dsh-enterprise-entry] {
            display:flex; align-items:center; gap:4px; min-height:36px; padding:0 12px;
            border-radius:8px; color:var(--dsw-alias-label-secondary); font-size:13px;
            line-height:20px; text-decoration:none;
          }
          [data-dsh-enterprise-entry]:hover { color:var(--dsw-alias-label-primary); background:var(--dsw-alias-interactive-bg-hover); }
          [data-dsh-enterprise-entry]:focus-visible { outline:2px solid var(--dsw-alias-state-business-primary); outline-offset:1px; }
          :root { --dsh-page-title-top-spacing:56px; }
          /* Keep Desktop actions beside Settings, without relocating other slot contributions. */
          [data-dsh-sidebar-settings]:has([data-dsh-desktop-utilities]) {
            display:flex; flex-direction:row; align-items:center; gap:4px;
          }
          [data-dsh-sidebar-settings]:has([data-dsh-desktop-utilities]) > [data-dsh-sidebar-settings-content] {
            flex:1; min-width:0;
          }
          [data-dsh-sidebar-settings]:has([data-dsh-desktop-utilities]) > [data-dsh-sidebar-settings-actions] {
            flex:none;
          }
          [data-dsh-sidebar-settings]:has([data-dsh-desktop-utilities][data-wide="false"]) {
            flex-direction:column;
          }
          /* Utilities own their button layout; leave other contributions unconstrained. */
          [data-dsh-desktop-utilities] {
            display:flex; align-items:center; flex-wrap:wrap; gap:4px; padding:4px;
          }
          [data-dsh-desktop-utilities][data-wide="false"] { justify-content:center; }
          [data-dsh-desktop-utilities] button {
            box-sizing:border-box; appearance:none; -webkit-appearance:none;
            display:inline-flex; align-items:center; justify-content:center; flex:none;
            width:32px; height:32px; padding:0; border:0; border-radius:8px;
            background:transparent; color:var(--dsw-alias-label-secondary); font:inherit; cursor:pointer;
          }
          [data-dsh-desktop-utilities] button:hover:not(:disabled) {
            background:var(--dsw-alias-bg-layer-2); color:var(--dsw-alias-label-primary);
          }
          [data-dsh-desktop-utilities] button:focus-visible {
            outline:2px solid var(--dsw-alias-state-business-primary); outline-offset:2px;
          }
          [data-dsh-desktop-utilities] button:disabled { opacity:.5; cursor:wait; }
          [data-dsh-desktop-utilities] [role=alert] {
            flex-basis:100%; min-width:0; overflow-wrap:anywhere; font-size:12px;
            color:var(--dsw-alias-label-primary);
          }
          /* Top-level page titles align with the sidebar brand row. Keep
             conversation chrome and detail/dialog headers in their own layout. */
          [data-plugin-panel] > header[data-window-drag] {
            padding-top:var(--dsh-page-title-top-spacing);
          }
          [data-dsh-preset-heading] { display:flex; align-items:center; flex-wrap:wrap; gap:12px 16px; }
          [data-dsh-preset-heading] h2 { margin:0; }
          [data-dsh-preset-actions] { display:flex; flex-wrap:wrap; align-items:center; gap:8px; margin-left:auto; }
          [data-dsh-preset-actions] button { white-space:nowrap; }
          [data-dsh-preset-search] { margin-bottom:16px; }
          [data-dsh-preset-search] input[type=search] {
            box-sizing:border-box; width:100%; min-width:0; height:36px;
            border:1px solid var(--dsw-alias-border-l2); border-radius:10px;
            background:var(--dsw-alias-bg-module-platform); color:var(--dsw-alias-label-primary);
            padding:0 12px; font:inherit; font-size:13px;
          }
          [data-dsh-preset-search] input[type=search]::placeholder { color:var(--dsw-alias-label-caption); }
          [data-dsh-preset-search] input[type=search]:focus-visible {
            outline:2px solid var(--dsw-alias-state-business-primary); outline-offset:2px;
            background:var(--dsw-alias-bg-base);
          }
        `
        document.head.appendChild(style)
        return () => style.remove()
      })
      ctx.slots.inject('sidebar.brand.mark', () =>
        ctx.slots.inject('sidebar.brand.name', () =>
          ctx.slots.inject('conversation.hero.brand.mark', function* () {
            yield ctx.slots.register({ name: 'sidebar.brand.mark' }, DesktopBrandMark)
            yield ctx.slots.register({ name: 'sidebar.brand.name' }, DesktopBrandName)
            yield ctx.slots.register(
              { name: 'conversation.hero.brand.mark' },
              ConversationBrandMark
            )
          })
        )
      )
      ctx.slots.inject('sidebar.right.tab.document.unpreviewable', () =>
        ctx.slots.register({
          name: 'sidebar.right.tab.document.unpreviewable',
          id: 'desktop-open-local',
          inject: () => ({
            openWorkspacePath: (path) => ctx.remote.session.openWorkspacePath({ path })
          })
        }, OpenUnpreviewableFile)
      )
      ctx.slots.inject('sidebar.workspaces.session.menu.item', () =>
        ctx.slots.register({
          name: 'sidebar.workspaces.session.menu.item',
          id: 'desktop-delete-session',
          order: 900,
          inject: () => ({
            deleteSession: (sessionId) => {
              const workspace = ctx.get('uiWorkspace')
              if (!workspace) throw new Error('Workspace navigation is unavailable')
              return workspace.deleteSession(sessionId)
            }
          })
        }, DeleteSessionMenuItem)
      )
      ctx.slots.inject('sidebar.workspaces.session.menu.item', () =>
        ctx.slots.register({
          name: 'sidebar.workspaces.session.menu.item',
          id: 'desktop-open-session-folder',
          order: 800,
          inject: () => ({
            openInFinder: (sessionId) => {
              const cwd = ctx.get('sessions').list.getSnapshot().byId[sessionId]?.cwd
              if (!cwd) throw new Error('Session workspace directory is unavailable')
              return window.dshDesktop.openInFinder(cwd)
            }
          })
        }, OpenSessionFolderMenuItem)
      )
      ctx.slots.inject('sidebar.workspaces.session.menu.item', () =>
        ctx.slots.register({
          name: 'sidebar.workspaces.session.menu.item',
          id: 'desktop-unread-session',
          order: 350
        }, UnreadSessionMenuItem)
      )
    }

    exports.apply = apply
    exports.inject = inject
    return module.exports
  }
})
