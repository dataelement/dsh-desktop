window.__ModuleLoader__.load({
  id: 'dsh-desktop-client-ui',
  factory: (require) => {
    const module = { exports: {} }
    const exports = module.exports
    Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' })

    const React = require('react')
    const { BrandWordmark, Button, FishLogo, Menu, MenuItemButton } = require('@deepseek-ai/dsh-client-ui-primitives')

    // The sidebar brand seat shows Harness's official whale — the same primitive
    // the conversation hero uses — so both seats carry one mark. FishLogo sizes by
    // width, and the width is the one the retired window mark occupied in this
    // seat (898/564 * 17), so the brand lockup keeps the space it had.
    const BRAND_MARK_WIDTH = 27.1

    function DesktopBrandMark() {
      return React.createElement(FishLogo, { size: BRAND_MARK_WIDTH })
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

    // Desktop commands the native menu bar used to carry. A GTK window always
    // draws that bar as a row of top-level menus, so Linux installs none (see
    // installMenu in src/main/index.ts) and the settings panel header is where
    // those commands live instead.
    const APP_MENU_NS = 'desktop-app-menu'
    const APP_MENU_ENTRIES = [
      ['connect-phone', 'connectPhone'],
      ['restart-harness', 'restartHarness'],
      ['safe-mode', 'safeMode'],
      ['show-harness-log', 'showHarnessLog'],
      ['check-for-updates', 'checkForUpdates'],
      ['export-session', 'exportSession'],
      ['about', 'about']
    ]
    const APP_MENU_COPY = {
      zh: {
        trigger: '应用菜单',
        connectPhone: '连接手机…',
        restartHarness: '重启 Harness',
        safeMode: '以安全模式重启…',
        showHarnessLog: '显示 Harness 日志',
        checkForUpdates: '检查更新…',
        exportSession: '导出 Session 日志…',
        about: '关于 DSH Desktop'
      },
      en: {
        trigger: 'Application menu',
        connectPhone: 'Connect Phone…',
        restartHarness: 'Restart Harness',
        safeMode: 'Restart as Safe Mode…',
        showHarnessLog: 'Show Harness Log',
        checkForUpdates: 'Check for Updates…',
        exportSession: 'Export Session Log…',
        about: 'About DSH Desktop'
      }
    }

    function DesktopAppMenu({ runMenuCommand, t }) {
      const [open, setOpen] = React.useState(false)
      if (typeof window.dshDesktop?.runMenuCommand !== 'function') return null
      return React.createElement(Menu, {
        open,
        autoFocus: true,
        align: 'end',
        portal: true,
        compact: true,
        items: APP_MENU_ENTRIES.map(([id, key]) => ({ id, label: t(key) })),
        onClose: () => setOpen(false),
        onSelect: (id) => {
          setOpen(false)
          void Promise.resolve().then(() => runMenuCommand(id)).catch((reason) => {
            window.alert(reason instanceof Error ? reason.message : String(reason))
          })
        },
        anchor: React.createElement(Button, {
          variant: 'outline',
          size: 'sm',
          'aria-haspopup': 'menu',
          'aria-expanded': open ? 'true' : 'false',
          onClick: () => setOpen((value) => !value)
        }, t('trigger'))
      })
    }

    const inject = ['slots', 'remote.session', 'sessions', 'uiWorkspace', 'locale']
    function apply(ctx) {
      ctx.effect(() => ctx.locale.register(APP_MENU_NS, APP_MENU_COPY), 'desktop app menu locale')
      const t = ctx.locale.bind(APP_MENU_NS)
      ctx.effect(() => {
        const id = 'dsh-desktop-preset-toolbar-style'
        if (document.getElementById(id)) return
        const style = document.createElement('style')
        style.id = id
        style.textContent = `
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
      ctx.slots.inject('settings.action', () =>
        ctx.slots.register({
          name: 'settings.action',
          id: 'desktop-app-menu',
          order: 100,
          inject: () => ({
            runMenuCommand: (command) => window.dshDesktop.runMenuCommand(command),
            t
          })
        }, DesktopAppMenu)
      )
    }

    exports.apply = apply
    exports.inject = inject
    return module.exports
  }
})
