window.__ModuleLoader__.load({
  id: 'dsh-desktop-client-ui',
  factory: (require) => {
    const module = { exports: {} }
    const exports = module.exports
    Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' })

    const React = require('react')
    const { BrandWordmark, FishLogo, MenuItemButton } = require('@deepseek-ai/dsh-client-ui-primitives')

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

    const inject = ['slots', 'remote.session', 'sessions', 'uiWorkspace']
    function apply(ctx) {
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
