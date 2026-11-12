window.__ModuleLoader__.load({
  id: 'dsh-desktop-client-ui',
  factory: (require) => {
    const module = { exports: {} }
    const exports = module.exports
    Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' })

    const React = require('react')
    const { Menu, MenuItemButton, Modal, Button, ReferenceIconRegular, Tooltip } = require('@deepseek-ai/dsh-client-ui-primitives')

    // Paths are copied from build/bisheng-logo-mark.svg. Keeping the browser
    // occupant self-contained makes it replayable when Harness loads plugins
    // from an installed Profile rather than the repository.
    const BISHENG_MARK_PATHS = [
      'M697.188 502.5H764.315C801.418 502.5 831.503 532.585 831.503 569.688V578.317C831.503 615.42 794.4 645.505 764.315 645.505H697.188C660.085 645.505 630 608.402 630 578.317V569.688C630 532.585 667.102 502.5 697.188 502.5Z',
      'M965.863 502.5H1503.17C1540.27 502.5 1570.36 532.585 1570.36 569.688V578.317C1570.36 615.42 1533.25 645.505 1503.17 645.505H965.863C928.761 645.505 898.676 608.402 898.676 578.317V569.688C898.676 532.585 935.778 502.5 965.863 502.5Z',
      'M764.363 752.749H1704.69C1741.79 752.749 1771.88 782.834 1771.88 819.936V828.566C1771.88 865.668 1734.78 895.754 1704.69 895.754H764.363C727.261 895.754 697.176 858.651 697.176 828.566V819.936C697.176 782.834 734.278 752.749 764.363 752.749Z',
      'M764.363 1003H1436.01C1473.12 1003 1503.2 1033.09 1503.2 1070.19V1078.82C1503.2 1115.92 1466.1 1146.01 1436.01 1146.01H764.363C727.261 1146.01 697.176 1108.91 697.176 1078.82V1070.19C697.176 1033.09 734.278 1003 764.363 1003Z',
      'M764.363 1253.26H1570.35C1607.45 1253.26 1637.53 1283.34 1637.53 1320.44V1329.07C1637.53 1366.18 1600.43 1396.26 1570.35 1396.26H764.363C727.261 1396.26 697.176 1359.16 697.176 1329.07V1320.44C697.176 1283.34 734.278 1253.26 764.363 1253.26Z',
      'M764.363 1503.5H1704.69C1741.79 1503.5 1771.88 1533.59 1771.88 1570.69V1579.32C1771.88 1616.42 1734.78 1646.51 1704.69 1646.51H764.363C727.261 1646.51 697.176 1609.41 697.176 1579.32V1570.69C697.176 1533.59 734.278 1503.5 764.363 1503.5Z',
      'M697.188 1753.76H1234.49C1271.6 1753.76 1301.68 1783.84 1301.68 1820.94V1829.57C1301.68 1866.68 1264.58 1896.76 1234.49 1896.76H697.188C660.085 1896.76 630 1859.66 630 1829.57V1820.94C630 1783.84 667.102 1753.76 697.188 1753.76Z',
      'M1436.04 1753.76H1503.17C1540.27 1753.76 1570.36 1783.84 1570.36 1820.94V1829.57C1570.36 1866.68 1533.26 1896.76 1503.17 1896.76H1436.04C1398.94 1896.76 1368.86 1859.66 1368.86 1829.57V1820.94C1368.86 1783.84 1405.96 1753.76 1436.04 1753.76Z'
    ]

    function BishengMark(props = {}) {
      const { size = 17, ...svgProps } = props
      return React.createElement(
        'svg',
        {
          width: size,
          height: size,
          viewBox: '0 0 2400 2400',
          fill: 'none',
          'aria-hidden': 'true',
          ...svgProps
        },
        React.createElement('rect', { width: 2400, height: 2400, rx: 360, fill: '#000000' }),
        ...BISHENG_MARK_PATHS.map((d, index) =>
          React.createElement('path', { key: index, d, fill: 'white' })
        )
      )
    }

    function DesktopBrandMark() {
      return BishengMark({ size: 17 })
    }

    function DesktopBrandName() {
      return null
    }

    function ConversationBrandMark({ navigation, ...props }) {
      const state = React.useSyncExternalStore(navigation.subscribe, navigation.snapshot)
      const icon = state.navigation?.branding?.assistantIcon
      const [failedImage, setFailedImage] = React.useState(null)
      if (icon?.enabled === false) return null
      if (icon?.image && failedImage !== icon.image) {
        return React.createElement('img', { width: props.size, height: props.size, className: props.className,
          src: icon.image, alt: '', style: { objectFit: 'contain', flex: 'none' }, referrerPolicy: 'no-referrer',
          onError: () => setFailedImage(icon.image) })
      }
      return BishengMark(props)
    }

    function ConversationBrandTitle({ navigation, t }) {
      const state = React.useSyncExternalStore(navigation.subscribe, navigation.snapshot)
      return React.createElement('span', { 'data-dsh-welcome-title': true }, state.navigation?.branding?.welcomeMessage || t('welcomeMessage'))
    }

    const LOCAL_OPEN_NS = 'desktop.localOpen'
    const LOCAL_OPEN_COPY = {
      zh: {
        label: '用本地应用打开',
        pending: '正在打开…',
        revealedDarwin: '已在访达中显示',
        revealedWindows: '已在文件资源管理器中显示',
        revealedOther: '已在文件管理器中显示',
        failed: '无法用本地应用打开'
      },
      en: {
        label: 'Open with local app',
        pending: 'Opening…',
        revealedDarwin: 'Shown in Finder',
        revealedWindows: 'Shown in File Explorer',
        revealedOther: 'Shown in the file manager',
        failed: 'Could not open with a local app'
      }
    }
    // macOS Archive Utility extracts a zip and then closes, so a successful
    // default open looks like a no-op. Revealing the archive keeps a visible result.
    const ARCHIVE_EXTENSIONS = new Set(['zip', '7z', 'rar', 'tar', 'gz', 'tgz', 'bz2'])

    function isArchivePath(absolutePath) {
      if (typeof absolutePath !== 'string' || absolutePath.length === 0) return false
      const name = absolutePath.replace(/\\/g, '/').split('/').pop()?.toLowerCase() ?? ''
      const dot = name.lastIndexOf('.')
      if (dot < 0 || dot === name.length - 1) return false
      return ARCHIVE_EXTENSIONS.has(name.slice(dot + 1))
    }

    function revealedCopyKey() {
      const platform = document.documentElement?.dataset?.platform
      if (platform === 'darwin') return 'revealedDarwin'
      if (platform === 'windows') return 'revealedWindows'
      return 'revealedOther'
    }

    function feedbackMessage(reason) {
      if (typeof reason === 'string') return reason.trim()
      if (reason instanceof Error) return reason.message.trim()
      if (reason && typeof reason === 'object' && typeof reason.message === 'string') {
        return reason.message.trim()
      }
      return ''
    }

    function OpenUnpreviewableFile({ absolutePath, openWorkspacePath, t }) {
      const [phase, setPhase] = React.useState('idle')
      const [feedback, setFeedback] = React.useState(null)
      const alive = React.useRef(true)
      const generation = React.useRef(0)
      const timer = React.useRef(0)
      const copy = (key) => t(key)
      React.useEffect(() => {
        setPhase('idle')
        setFeedback(null)
        return () => {
          generation.current += 1
          window.clearTimeout(timer.current)
        }
      }, [absolutePath])
      React.useEffect(() => {
        alive.current = true
        return () => {
          alive.current = false
        }
      }, [])
      const label = phase === 'pending' ? copy('pending') : copy('label')
      return React.createElement(
        'div',
        { 'data-textpreview-open-local-wrap': true },
        React.createElement('button', {
          type: 'button',
          'data-textpreview-open-local': true,
          'aria-busy': phase === 'pending' || undefined,
          disabled: phase === 'pending',
          onClick: () => {
            if (phase === 'pending') return
            const ticket = generation.current + 1
            generation.current = ticket
            window.clearTimeout(timer.current)
            setFeedback(null)
            setPhase('pending')
            const request = isArchivePath(absolutePath)
              ? { path: absolutePath, action: 'reveal' }
              : { path: absolutePath }
            let opened
            try {
              opened = openWorkspacePath(request)
            } catch (reason) {
              if (!alive.current || generation.current !== ticket) return
              setPhase('idle')
              setFeedback({
                kind: 'error',
                message: feedbackMessage(reason) || copy('failed')
              })
              return
            }
            void Promise.resolve(opened).then((result) => {
                if (!alive.current || generation.current !== ticket) return
                if (result && result.ok === false) {
                  setPhase('idle')
                  setFeedback({
                    kind: 'error',
                    message: feedbackMessage(result.error) || copy('failed')
                  })
                  return
                }
                setPhase('idle')
                if (!isArchivePath(absolutePath)) return
                setFeedback({ kind: 'success', message: copy(revealedCopyKey()) })
                timer.current = window.setTimeout(() => {
                  if (!alive.current || generation.current !== ticket) return
                  setFeedback((current) => current && current.kind === 'success' ? null : current)
                }, 2000)
              }, (reason) => {
                if (!alive.current || generation.current !== ticket) return
                setPhase('idle')
                setFeedback({
                  kind: 'error',
                  message: feedbackMessage(reason) || copy('failed')
                })
              })
          }
        },
          React.createElement('span', { 'data-textpreview-open-local-label': true }, label),
          React.createElement('span', {
            'data-textpreview-open-local-sizer': true,
            'aria-hidden': 'true'
          }, copy('label'))
        ),
        feedback && React.createElement('span', {
          role: feedback.kind === 'error' ? 'alert' : 'status',
          'data-textpreview-open-local-feedback': true,
          'data-kind': feedback.kind
        }, feedback.message)
      )
    }

    const DELETE_SESSION_NS = 'dsh-desktop-delete-session'

    // The shell owns the request: closing a row menu unmounts its occupants.
    function createSessionDeletion(deleteSession) {
      let state = null
      let active = true
      const listeners = new Set()
      const publish = (next) => {
        state = next
        listeners.forEach(listener => listener())
      }
      return {
        subscribe: (listener) => { listeners.add(listener); return () => listeners.delete(listener) },
        getSnapshot: () => state,
        request: (sessionId, displayTitle, context) => {
          if (active && state === null) publish({ sessionId, displayTitle, context, busy: false, error: null })
        },
        close: () => { if (state && state.busy === false) publish(null) },
        confirm: async () => {
          if (state === null || state.busy || active === false) return
          const pending = { ...state, busy: true, error: null }
          publish(pending)
          try {
            await deleteSession(pending.sessionId, pending.context)
            if (active && state === pending) publish(null)
          } catch (reason) {
            if (active && state === pending) {
              publish({ ...pending, busy: false, error: reason instanceof Error ? reason.message : String(reason) })
            }
          }
        },
        reset: () => publish(null),
        dispose: () => { active = false; publish(null); listeners.clear() }
      }
    }

    function DeleteSessionMenuItem({ sessionId, displayTitle, useMenuOpenState, deletion, t }) {
      const [, setMenuOpen] = useMenuOpenState()
      return React.createElement(MenuItemButton, {
        danger: true,
        onSelect: () => {
          setMenuOpen(false)
          // Let Menu restore its trigger focus before Modal captures return focus.
          setTimeout(() => deletion.request(sessionId, displayTitle), 0)
        }
      }, t('menu'))
    }

    function DeleteSessionDialog({ deletion, t }) {
      const request = React.useSyncExternalStore(deletion.subscribe, deletion.getSnapshot)
      return React.createElement(Modal, {
        open: request !== null,
        onClose: deletion.close,
        title: t('title'),
        closeLabel: t('close'),
        description: request ? t('description', { name: request.displayTitle || request.sessionId }) : '',
        footer: request && React.createElement(React.Fragment, null,
          React.createElement(Button, {
            variant: 'outline', disabled: request.busy, onClick: deletion.close,
            'data-modal-autofocus': true
          }, t('cancel')),
          React.createElement(Button, {
            variant: 'primary', disabled: request.busy, onClick: deletion.confirm
          }, t(request.busy ? 'pending' : 'confirm')))
      }, request?.busy && React.createElement('p', { role: 'status' }, t('pending')),
      request && request.error !== null && React.createElement('div', { role: 'alert' },
        React.createElement('p', null, t('failed')),
        React.createElement('p', null, request.error)))
    }

    function OpenSessionFolderMenuItem({ sessionId, useMenuOpenState, openInFinder, t }) {
      const [, setMenuOpen] = useMenuOpenState()
      if (typeof window.dshDesktop?.openInFinder !== 'function') return null
      const label = t('openFolder')
      return React.createElement(MenuItemButton, {
        onSelect: () => {
          setMenuOpen(false)
          void Promise.resolve().then(() => openInFinder(sessionId)).catch((reason) => {
            window.alert(reason instanceof Error ? reason.message : String(reason))
          })
        }
      }, label)
    }

    function UnreadSessionMenuItem({ sessionId, unread, onUnreadChange, useMenuOpenState, t }) {
      const [, setMenuOpen] = useMenuOpenState()
      return React.createElement(MenuItemButton, {
        onSelect: () => {
          setMenuOpen(false)
          onUnreadChange(sessionId, !unread)
        }
      }, t(unread ? 'markRead' : 'markUnread'))
    }

    const ACTIONS_NS = 'dsh-desktop-actions'
    const actionMessages = {
      zh: {
        openLocal: '用本地应用打开',
        deleteSession: '永久删除会话',
        deleteWarning: '确定删除“{title}”？工作区文件会保留。此操作无法撤销。',
        openFolder: '在文件管理器中打开',
        markRead: '标为已读',
        markUnread: '标为未读',
        workspaceUnavailable: '工作区导航不可用',
        directoryUnavailable: '会话工作区目录不可用'
      },
      en: {
        openLocal: 'Open with local app',
        deleteSession: 'Delete session permanently',
        deleteWarning: 'Delete “{title}”? Workspace files are kept. This can’t be undone.',
        openFolder: 'Open in file manager',
        markRead: 'Mark as read',
        markUnread: 'Mark as unread',
        workspaceUnavailable: 'Workspace navigation is unavailable',
        directoryUnavailable: 'Session workspace directory is unavailable'
      },
      ja: {
        openLocal: 'ローカルアプリで開く',
        deleteSession: 'セッションを完全に削除',
        deleteWarning: '「{title}」を削除しますか？ワークスペースのファイルは保持されます。この操作は取り消せません。',
        openFolder: 'ファイルマネージャーで開く',
        markRead: '既読にする',
        markUnread: '未読にする',
        workspaceUnavailable: 'ワークスペースのナビゲーションを利用できません',
        directoryUnavailable: 'セッションのワークスペースディレクトリを利用できません'
      },
      es: {
        openLocal: 'Abrir con una aplicación local',
        deleteSession: 'Eliminar sesión permanentemente',
        deleteWarning: '¿Eliminar «{title}»? Se conservan los archivos del espacio de trabajo. No se puede deshacer.',
        openFolder: 'Abrir en el administrador de archivos',
        markRead: 'Marcar como leído',
        markUnread: 'Marcar como no leído',
        workspaceUnavailable: 'La navegación del espacio de trabajo no está disponible',
        directoryUnavailable: 'El directorio de la sesión no está disponible'
      },
      fr: {
        openLocal: 'Ouvrir avec une application locale',
        deleteSession: 'Supprimer définitivement la session',
        deleteWarning: 'Supprimer « {title} » ? Les fichiers de l’espace de travail sont conservés. Cette action est irréversible.',
        openFolder: 'Ouvrir dans le gestionnaire de fichiers',
        markRead: 'Marquer comme lu',
        markUnread: 'Marquer comme non lu',
        workspaceUnavailable: 'La navigation de l’espace de travail est indisponible',
        directoryUnavailable: 'Le dossier de la session est indisponible'
      },
      de: {
        openLocal: 'Mit lokaler Anwendung öffnen',
        deleteSession: 'Sitzung endgültig löschen',
        deleteWarning: '„{title}“ löschen? Die Arbeitsbereichsdateien bleiben erhalten. Dies kann nicht rückgängig gemacht werden.',
        openFolder: 'Im Dateimanager öffnen',
        markRead: 'Als gelesen markieren',
        markUnread: 'Als ungelesen markieren',
        workspaceUnavailable: 'Arbeitsbereichsnavigation ist nicht verfügbar',
        directoryUnavailable: 'Das Arbeitsbereichsverzeichnis der Sitzung ist nicht verfügbar'
      },
      ru: {
        openLocal: 'Открыть в локальном приложении',
        deleteSession: 'Удалить сеанс навсегда',
        deleteWarning: 'Удалить «{title}»? Файлы рабочей области сохранятся. Это действие нельзя отменить.',
        openFolder: 'Открыть в файловом менеджере',
        markRead: 'Отметить как прочитанное',
        markUnread: 'Отметить как непрочитанное',
        workspaceUnavailable: 'Навигация по рабочей области недоступна',
        directoryUnavailable: 'Каталог рабочей области сеанса недоступен'
      },
      pt: {
        openLocal: 'Abrir com aplicativo local',
        deleteSession: 'Excluir sessão permanentemente',
        deleteWarning: 'Excluir “{title}”? Os arquivos do espaço de trabalho serão mantidos. Não é possível desfazer.',
        openFolder: 'Abrir no gerenciador de arquivos',
        markRead: 'Marcar como lida',
        markUnread: 'Marcar como não lida',
        workspaceUnavailable: 'A navegação do espaço de trabalho está indisponível',
        directoryUnavailable: 'O diretório da sessão está indisponível'
      }
    }

    const CLOUD_DELETE_NS = 'desktop.cloudChatDelete'
    const CLOUD_DELETE_COPY = {
      zh: { menu: '删除', actions: '会话操作', title: '删除会话', close: '关闭', cancel: '取消', confirm: '删除会话', description: '确定删除“{name}”？会话及其聊天记录将被永久删除。', pending: '正在删除会话…', failed: '删除失败，请重试。' },
      en: { menu: 'Delete', actions: 'Conversation actions', title: 'Delete conversation', close: 'Close', cancel: 'Cancel', confirm: 'Delete conversation', description: 'Permanently delete “{name}” and its chat history?', pending: 'Deleting conversation…', failed: 'Deletion failed. Please try again.' }
    }
    const MODES_NS = 'desktop.chatWork'
    const MODES_COPY = {
      zh: { welcomeMessage: '来一起创造', welcome: '欢迎来到', newConversation: '新建对话', navigation: '导航', moreNavigation: '更多', recent: '对话', projects: '工作区', all: '所有会话', results: '搜索结果', cloud: '云端聊天', local: '本地工作', recentEmpty: '暂无最近会话', recentSearchEmpty: '当前列表没有匹配的会话', chat: '聊天', work: '工作', label: '聊天与工作', loading: '正在连接企业聊天…', error: '企业聊天连接失败，请重试', retry: '重新连接', refresh: '刷新聊天记录', historyLoading: '正在加载聊天记录…', historyError: '加载失败，点击重试', empty: '暂无聊天记录', more: '加载更多', newChat: '新聊天', signIn: '登录企业账号', signInTitle: '登录后使用聊天', signInDescription: '聊天由企业平台提供。登录后，即可使用平台中的模型和对话记录。', continueWork: '继续使用工作', close: '关闭', justNow: '刚刚' },
      en: { welcomeMessage: "Let's Create Together", welcome: 'Welcome', newConversation: 'New conversation', navigation: 'Navigation', moreNavigation: 'More', recent: 'Conversations', projects: 'Workspaces', all: 'All conversations', results: 'Search results', cloud: 'Cloud chat', local: 'Local work', recentEmpty: 'No recent conversations', recentSearchEmpty: 'No matches in the current list', chat: 'Chat', work: 'Work', label: 'Chat and Work', loading: 'Connecting to enterprise Chat…', error: 'Could not connect to enterprise Chat. Try again.', retry: 'Reconnect', refresh: 'Refresh Chat history', historyLoading: 'Loading history…', historyError: 'Loading failed. Retry', empty: 'No chats yet', more: 'Load more', newChat: 'New chat', signIn: 'Sign in to your enterprise account', signInTitle: 'Sign in to use Chat', signInDescription: 'Chat is provided by your enterprise platform. Sign in to use its models and conversations.', continueWork: 'Continue in Work', close: 'Close', justNow: 'Now' }
    }
    /**
     * Host tokens the embedded enterprise document reuses. It cannot read the host's CSS, so the
     * presenter resolves them here and sends plain channels with the presentation.
     */
    const PALETTE_TOKENS = {
      surface: '--dsw-alias-bg-layer-2', raised: '--dsw-alias-bg-layer-3', strong: '--dsw-alias-bg-overlay',
      labelPrimary: '--dsw-alias-label-primary', labelSecondary: '--dsw-alias-label-secondary', labelTertiary: '--dsw-alias-label-tertiary',
      borderBase: '--dsw-alias-border-l2', borderDeep: '--dsw-alias-border-l3', composer: '--dsw-specific-input-major'
    }
    // A token that does not resolve leaves the fallback behind, which is how a missing one is told
    // apart from a real color; the probe never renders, so the sentinel is never seen.
    const PALETTE_FALLBACK = [1, 2, 3]

    function samplePalette() {
      if (!document.body) return undefined
      const probe = document.createElement('span')
      probe.setAttribute('aria-hidden', 'true')
      probe.style.cssText = 'position:fixed;left:-9999px;top:0;width:0;height:0;pointer-events:none'
      document.body.appendChild(probe)
      try {
        const read = (token) => {
          probe.style.color = `var(${token}, rgb(1, 2, 3))`
          const channels = (getComputedStyle(probe).color.match(/[\d.]+/g) || []).map(Number)
          if (channels.length < 3 || PALETTE_FALLBACK.every((channel, index) => channel === channels[index])) return undefined
          return channels
        }
        const surface = read(PALETTE_TOKENS.surface)
        if (!surface) return undefined
        const palette = {}
        for (const [role, token] of Object.entries(PALETTE_TOKENS)) {
          const channels = read(token)
          if (!channels) return undefined
          // Translucent host tokens (borders, hover fills) are flattened over the surface they sit on.
          const alpha = channels.length > 3 ? channels[3] : 1
          palette[role] = channels.slice(0, 3).map((channel, index) => Math.max(0, Math.min(255, Math.round(surface[index] + (channel - surface[index]) * alpha))))
        }
        const mask = read('--dsw-alias-bg-mask-1')
        if (mask) palette.mask = [...mask.slice(0, 3), mask[3] ?? 1]
        return palette
      } catch { return undefined } finally { probe.remove() }
    }

    let sampledPalette
    /**
     * The palette only moves with the theme, so a successful probe is kept per theme rather than run
     * per frame; a probe that found no tokens yet (theme styles still loading) is tried again next time.
     */
    function hostPalette() {
      const theme = document.body?.hasAttribute('data-ds-dark-theme') ? 'dark' : 'light'
      if (sampledPalette?.theme !== theme) {
        const value = samplePalette()
        sampledPalette = value ? { theme, value } : undefined
        return value
      }
      return sampledPalette.value
    }

    /** One renderer-owned mode/history controller shared by the content and sidebar slots. */
    function createChatNavigation(ctx) {
      let value = { mode: 'work', connected: false, phase: 'idle', epoch: undefined, items: [], page: 0, hasMore: false, historyPhase: 'idle', settingsOpen: false, signInPromptOpen: false, approvalsOpen: false, accountDialogOpen: false, settingsSurface: undefined, pageId: undefined, navigation: undefined, workLanding: false, nativeWork: true, panelOpen: false, activePanelId: null }
      const listeners = new Set()
      let active = false, revision = 0, historyRequest = 0, historyDirty = false
      const publish = (patch) => { value = { ...value, ...patch }; listeners.forEach(fn => fn()) }
      const select = (mode) => {
        if (mode === 'chat' && !value.connected) {
          publish({ signInPromptOpen: true })
          return false
        }
        publish({ mode, pageId: undefined, signInPromptOpen: false })
        return true
      }
      const refreshHistory = async (more = false) => {
        if (!value.connected || !window.dshEnterpriseChat) return
        if (value.historyPhase === 'loading') { if (!more) historyDirty = true; return }
        const request = ++historyRequest, epoch = value.epoch
        const page = more ? value.page + 1 : 1
        const lastPage = more ? page : Math.max(1, value.page)
        publish({ historyPhase: 'loading' })
        try {
          let items = more ? [...value.items] : [], response, fetchedPage = page
          for (let next = page; next <= lastPage; next++) {
            response = await window.dshEnterpriseChat.history(next)
            if (!active || request !== historyRequest || epoch !== value.epoch) return
            if (response.epoch !== epoch) { publish({ historyPhase: 'idle' }); return }
            fetchedPage = next
            items.push(...response.items)
            if (!response.hasMore) break
          }
publish({ items: [...new Map(items.map(item => [item.id, item])).values()], page: fetchedPage, hasMore: response.hasMore, historyPhase: 'ready' })
        } catch {
          if (active && request === historyRequest && epoch === value.epoch) publish({ historyPhase: 'error' })
        } finally {
          if (active && request === historyRequest && historyDirty) { historyDirty = false; void refreshHistory() }
        }
      }
      const deletion = createSessionDeletion(async (id, epoch) => {
        if (epoch !== value.epoch || !value.connected) throw new Error('Chat identity changed.')
        const response = await window.dshEnterpriseChat.remove(id, epoch)
        if (!active || epoch !== value.epoch || response.epoch !== epoch) return
        historyRequest++
        publish({ items: value.items.filter(item => item.id !== id), historyPhase: 'idle' })
        void refreshHistory()
      })
      const open = async (id) => {
        if (!select('chat')) return
        const epoch = value.epoch
        try { await window.dshEnterpriseChat.open(id); if (active && epoch === value.epoch) { publish({ conversationId: id }); void refreshHistory() } }
        catch { if (active && epoch === value.epoch) void readHostState() }
      }
      // Account notifications also follow ordinary enterprise reads. The host epoch,
      // shared by history responses and state updates, owns the in-memory history.
      const applyState = (next, refresh = false) => {
        const identityChanged = next.epoch !== value.epoch
        const signedIn = next.connected && !value.connected
        const conversationChanged = next.conversationId !== value.conversationId
        const becameReady = next.phase === 'ready' && value.phase !== 'ready'
        const clearHistory = identityChanged || !next.connected
if (clearHistory) { historyRequest++; historyDirty = false; deletion.reset() }
        publish({
          ...next,
          ...(clearHistory ? { items: [], page: 0, hasMore: false, historyPhase: 'idle' } : {}),
          signInPromptOpen: next.connected ? false : value.signInPromptOpen,
          pageId: next.navigation?.entries.find(entry => entry.active)?.id,
          mode: next.connected ? signedIn ? 'chat' : value.mode : 'work'
        })
        if (signedIn) window.dispatchEvent(new CustomEvent('dsh-desktop:close-settings'))
        if (next.connected && next.phase === 'ready' && (refresh || identityChanged || signedIn || conversationChanged || becameReady)) void refreshHistory()
      }
      const sync = async () => {
        const request = ++revision
        try {
          const next = await window.dshEnterpriseChat?.state()
          if (!active || request !== revision || !next) return
          applyState(next, true)
        } catch { /* A missed focus read must not paint the reconnect page. */ }
      }
      // One guarded read. It does not refresh history; sync() owns that on focus and visibility.
      const readHostState = async () => {
        const request = ++revision
        try {
          const next = await window.dshEnterpriseChat?.state()
          if (!active || request !== revision || !next) return
          applyState(next)
        } catch { /* Keep the last host snapshot. A missed read is not a dead session. */ }
      }
      return {
        snapshot: () => value,
        subscribe: (fn) => { listeners.add(fn); return () => listeners.delete(fn) },
        select, open, refreshHistory, deletion,
        requestDelete(id, title, epoch) {
          if (value.connected && epoch === value.epoch && value.items.some(item => item.id === id)) deletion.request(id, title, epoch)
        },
        bindWorkbench(service) {
          const sync = () => {
            const snapshot = service.getSnapshot()
            publish({ nativeWork: snapshot.enabled === false || snapshot.state.active == null })
          }
          const unsubscribe = service.subscribe(sync)
          sync()
          return () => { unsubscribe(); publish({ nativeWork: true }) }
        },
        dismissSignIn() { publish({ signInPromptOpen: false }) },
        signIn() {
          publish({ signInPromptOpen: false })
          window.dispatchEvent(new CustomEvent('dsh-desktop:open-settings-section', { detail: { id: 'enterprise-account' } }))
        },
        async openPage(id) {
          if (!value.connected || !value.navigation?.entries.some(entry => entry.id === id)) return
          ctx.layout.selectPanel(null)
          publish({ mode: 'chat', pageId: id })
          const epoch = value.epoch
          try { await window.dshEnterpriseChat.openPage(id) }
          catch { if (active && epoch === value.epoch) void readHostState() }
        },
        choose(mode) {
          if (!select(mode)) return false
          if (mode === 'chat' && value.conversationId !== 'new') void open('new')
          if (mode === 'work' && (!value.workLanding || value.panelOpen)) ctx.uiWorkspace.startSession()
          return true
        },
        start() {
          active = true
          const account = () => { void sync() }
          const visibility = () => { if (!document.hidden) void sync() }
// Older workspace hosts omit this registration. Failing here used to skip
// the enterprise menu sync, so More never received knowledge and the other pages.

const originalStartSession = ctx.uiWorkspace?.startSession
if (typeof originalStartSession === 'function') {
  ctx.uiWorkspace.startSession = function(workspaceId, options) {
    if (workspaceId !== undefined) {
      select('work')
    }
    return originalStartSession.call(this, workspaceId, options)
  }
}
const hasNavigationHandler = typeof ctx.uiWorkspace.registerNavigationHandler === 'function'
const disposeNavigation = hasNavigationHandler
  ? ctx.uiWorkspace.registerNavigationHandler((intent, workspaceId) => {
    if (intent === 'new' && workspaceId === undefined && value.mode === 'chat') { void open('new'); return true }
    select('work')
  })
  : () => {}
// This host never notifies session opens. A history click still replaces
// the work session, so reveal that column when chat is covering it.
const originalOpenSession = ctx.uiWorkspace.openSession
const revealWorkSession = hasNavigationHandler || typeof originalOpenSession !== 'function'
  ? null
  : function (target, source) {
    const result = originalOpenSession.call(this, target, source)
    if (typeof target === 'string' && value.mode === 'chat') select('work')
    return result
  }
if (revealWorkSession) ctx.uiWorkspace.openSession = revealWorkSession
          const settings = (event) => publish({ settingsOpen: event.detail?.open === true, ...(event.detail?.open ? {} : { settingsSurface: undefined }) })
          const approvals = (event) => publish({ approvalsOpen: event.detail?.open === true })
          // A sidebar account dialog is drawn by the renderer, so the native view yields the region.
          const accountDialog = (event) => publish({ accountDialogOpen: event.detail?.open === true })
          const settingsSurface = (event) => {
            const detail = event.detail
            if (detail?.close) { if (value.settingsSurface?.token === detail.token) publish({ settingsSurface: undefined }); return }
            if (detail?.bounds && typeof detail.section === 'string') publish({ settingsSurface: detail })
          }
          let workSession, unsubscribeWork = () => {}
          const workState = () => {
            const list = ctx.sessions.list.getSnapshot()
            const current = Object.values(list.byId).find(row => (row.retainedBy.mainView ?? 0) > 0)
            const session = current && ctx.sessions.binding(current.id)?.session
            if (session !== workSession) {
              unsubscribeWork()
              workSession = session
              unsubscribeWork = session ? session.subscribe(workState) : () => {}
            }
            const live = session?.getSnapshot()
            const blank = live ? live.blank && live.pendingSubmissions.length === 0 && !live.running && !live.awaitingFirstTurn : current?.blank
            publish({ workLanding: current ? blank === true : list.phase === 'ready' })
          }
          const panel = () => {
            const { activePanelId } = ctx.layout.panelInfo.getSnapshot()
            const panelOpen = activePanelId !== null
            publish({ panelOpen, activePanelId, ...(panelOpen ? { mode: 'work' } : {}) })
          }
          const unsubscribe = ctx.layout.panelInfo.subscribe(panel)
          const unsubscribeSessions = ctx.sessions.list.subscribe(workState)
          const unsubscribeChat = window.dshEnterpriseChat?.subscribe?.((next) => {
            revision++
            applyState(next)
          })
          workState(); panel()
          window.addEventListener('dsh-desktop:enterprise-account-changed', account)
          window.addEventListener('dsh-desktop:settings-visibility', settings)
          window.addEventListener('dsh-desktop:approvals-visibility', approvals)
          window.addEventListener('dsh-desktop:account-dialog-visibility', accountDialog)
          window.addEventListener('dsh-desktop:settings-surface', settingsSurface)
          window.addEventListener('focus', sync)
          document.addEventListener('visibilitychange', visibility)
          void sync()
          return () => {
active = false; deletion.reset(); revision++; historyRequest++; unsubscribe(); unsubscribeSessions(); unsubscribeWork(); unsubscribeChat?.()
            window.removeEventListener('dsh-desktop:enterprise-account-changed', account)
            disposeNavigation(); if (originalStartSession && ctx.uiWorkspace?.startSession) ctx.uiWorkspace.startSession = originalStartSession
            if (revealWorkSession && ctx.uiWorkspace.openSession === revealWorkSession) ctx.uiWorkspace.openSession = originalOpenSession
            window.removeEventListener('dsh-desktop:settings-visibility', settings)
            window.removeEventListener('dsh-desktop:approvals-visibility', approvals)
            window.removeEventListener('dsh-desktop:account-dialog-visibility', accountDialog)
            window.removeEventListener('dsh-desktop:settings-surface', settingsSurface)
            window.removeEventListener('focus', sync)
            document.removeEventListener('visibilitychange', visibility)
          }
        }
      }
    }
    /** Cloud rows use the same title reveal speed and geometry as Harness sessions. */
    function CloudHistoryRow({ item, selected, navigation, t, deleteText }) {
      const [menuOpen, setMenuOpen] = React.useState(false)
      const title = React.useRef(null)
      const frame = React.useRef(0)
      const reset = () => {
        cancelAnimationFrame(frame.current)
        if (title.current) title.current.scrollLeft = 0
      }
      React.useEffect(() => reset, [item.title])
      const reveal = () => {
        reset()
        const element = title.current
        const distance = element.scrollWidth - element.clientWidth
        if (distance <= 8) return
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { element.scrollLeft = distance; return }
        let start
        const tick = (now) => {
          start ??= now
          element.scrollLeft = Math.min(distance, (now - start) * .03)
          if (element.scrollLeft < distance) frame.current = requestAnimationFrame(tick)
        }
        frame.current = requestAnimationFrame(tick)
      }
      return React.createElement('div', { className: 'dshCloudHistoryRow' },
        React.createElement('button', { type: 'button', 'data-history-kind': 'chat', className: 'dshHistoryRow', 'aria-current': selected ? 'page' : undefined,
        title: item.title, onClick: () => navigation.open(item.id), onPointerEnter: reveal, onPointerLeave: reset, onFocus: reveal, onBlur: reset },
        React.createElement('span', { ref: title }, item.title || t('newChat')),
        React.createElement('time', { dateTime: new Date(item.updatedAt).toISOString() }, historyTime(item.updatedAt, t))),
        React.createElement(Menu, {
          open: menuOpen, onClose: () => setMenuOpen(false), portal: true, align: 'end', autoFocus: true, dense: true,
          anchor: React.createElement('button', { type: 'button', className: 'dshCloudHistoryActions', 'aria-label': deleteText('actions'), 'aria-haspopup': 'menu', 'aria-expanded': menuOpen, onClick: () => setMenuOpen(open => !open) }, '⋯')
        }, React.createElement(MenuItemButton, {
          danger: true, onSelect: () => {
            const epoch = navigation.snapshot().epoch
            setMenuOpen(false)
            setTimeout(() => navigation.requestDelete(item.id, item.title || t('newChat'), epoch), 0)
          }
        }, deleteText('menu'))))
    }
    /** Cloud identities stay namespaced; project ownership is projected by Harness. */
    function ChevronIcon({ expanded }) {
      return React.createElement('svg', {
        width: 12, height: 12, viewBox: '0 0 16 16', fill: 'none',
        className: 'dshSectionChevron',
        style: {
          transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
          transition: 'transform 0.15s ease',
          flex: 'none'
        }
      }, React.createElement('path', {
        d: 'M6 4L10 8L6 12',
        stroke: 'currentColor',
        strokeWidth: '1.5',
        strokeLinecap: 'round',
        strokeLinejoin: 'round'
      }))
    }

    const REPAIR_NS = 'dsh-desktop-repair'
    function DesktopUtilityActions({ t, wide }) {
      const [busy, setBusy] = React.useState(false)
      // Internal messages are translated at render time; external diagnostics
      // remain verbatim instead of becoming a stale translated state string.
      const [error, setError] = React.useState(null)
      const [connected, setConnected] = React.useState(false)
      const mounted = React.useRef(true)
      React.useEffect(() => {
        mounted.current = true
        const bridge = window.dshDesktop
        const unsubscribe = bridge?.onMobileStatus?.(status => {
          if (mounted.current) setConnected(status.connected === true)
        })
        void bridge?.getMobileStatus?.().then(status => {
          if (mounted.current) setConnected(status.connected === true)
        }).catch(() => { if (mounted.current) setError({ key: 'phoneFailed' }) })
        return () => { mounted.current = false; unsubscribe?.() }
      }, [t])
      const bridge = window.dshDesktop
      if (!bridge) return null
      const open = async (operation) => {
        if (busy) return
        setBusy(true); setError(null)
        try {
          const result = await operation()
          if (mounted.current && result?.ok === false) {
            setError(typeof result.error === 'string' && result.error !== ''
              ? { diagnostic: result.error }
              : { key: 'failed' })
          }
        } catch (reason) {
          if (mounted.current) setError({ diagnostic: reason instanceof Error ? reason.message : String(reason) })
        } finally { if (mounted.current) setBusy(false) }
      }
      const icon = (kind) => React.createElement('svg', {
        width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none',
        stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true
      }, kind === 'phone'
        ? React.createElement(React.Fragment, null,
          React.createElement('rect', { x: 7, y: 2.75, width: 10, height: 18.5, rx: 2.25 }),
          React.createElement('path', { d: 'M10.2 5.5h3.6M10.5 18.35h3' }))
        : React.createElement('path', { d: 'M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-7.91 7.91a2.12 2.12 0 0 1-3-3l7.91-7.91a6 6 0 0 1 7.94-7.94z' }))
      return React.createElement('div', { 'data-dsh-desktop-utilities': true, 'data-wide': wide },
        typeof bridge.openRepairAgent === 'function' && React.createElement(Tooltip, {
          label: t(busy ? 'opening' : 'description'), side: 'top', align: 'end',
          portal: true, maxWidth: 280, delayMs: 0, focusDelayMs: 0
        }, React.createElement(Button, {
          type: 'button', variant: 'ghost', size: 'sm', className: 'dshDesktopUtilityButton', disabled: busy, 'aria-busy': busy,
          'aria-label': t(busy ? 'opening' : 'open'), 'aria-description': t('description'), 'data-dsh-repair-entry': true,
          onClick: () => { void open(() => bridge.openRepairAgent()) }
        }, icon('repair'))),
        typeof bridge.openMobilePairing === 'function' && (wide || connected) && React.createElement(Tooltip, {
          label: t(connected ? 'phoneManage' : 'phone'), side: 'top', align: 'end', portal: true
        }, React.createElement(Button, {
          type: 'button', variant: 'ghost', size: 'sm', className: 'dshDesktopUtilityButton', disabled: busy, 'aria-busy': busy,
          'aria-label': t(connected ? 'phoneManage' : 'phone'), 'data-dsh-mobile-entry': true,
          onClick: () => { void open(() => bridge.openMobilePairing()) }
        }, icon('phone'), connected && React.createElement('span', { 'data-connected': true, 'aria-hidden': true }))),
        error && React.createElement('span', { role: 'alert', 'data-dsh-utility-error': true }, error.key ? t(error.key) : error.diagnostic))
    }

    // The session-scope slot supplies Harness's public editor actions. Capture the
    // revision before IPC so an async suggestion can never overwrite a user's edit.
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
    function applyRepair(ctx) {
      ctx.effect(() => ctx.locale.register(REPAIR_NS, {
        zh: { open: '进入维修模式', description: '维修 Agent：协助排查和修复问题。点击进入修复模式，描述问题后发送。', opening: '正在打开维修…', failed: '无法打开维修会话，请重试', phone: '连接手机', phoneManage: '管理手机连接', phoneFailed: '无法读取手机连接状态' },
        en: { open: 'Enter repair mode', description: 'Repair Agent helps diagnose and resolve problems. Click to enter repair mode, describe the issue, and send when ready.', opening: 'Opening repair…', failed: 'Could not open repair. Please retry.', phone: 'Connect phone', phoneManage: 'Manage phone connection', phoneFailed: 'Could not read phone connection status.' },
        ja: {"open": "修復モードに入る", "description": "修復 Agent が問題の診断と解決を支援します。修復モードに入り、問題を説明して送信してください。", "opening": "修復を開いています…", "failed": "修復を開けません。もう一度お試しください。", "phone": "スマートフォンを接続", "phoneManage": "スマートフォン接続を管理", "phoneFailed": "接続状態を取得できません。"},
        es: {"open": "Entrar en modo de reparación", "description": "El agente de reparación ayuda a diagnosticar y resolver problemas. Entre, describa el problema y envíelo cuando esté listo.", "opening": "Abriendo reparación…", "failed": "No se pudo abrir la reparación. Inténtelo de nuevo.", "phone": "Conectar teléfono", "phoneManage": "Administrar conexión del teléfono", "phoneFailed": "No se pudo consultar el estado de conexión."},
        fr: {"open": "Passer en mode réparation", "description": "L’agent de réparation aide à diagnostiquer et résoudre les problèmes. Entrez, décrivez le problème et envoyez-le.", "opening": "Ouverture de la réparation…", "failed": "Impossible d’ouvrir la réparation. Réessayez.", "phone": "Connecter un téléphone", "phoneManage": "Gérer la connexion du téléphone", "phoneFailed": "Impossible de lire l’état de connexion."},
        de: {"open": "Reparaturmodus öffnen", "description": "Der Reparatur-Agent hilft bei Diagnose und Fehlerbehebung. Öffnen Sie den Modus, beschreiben Sie das Problem und senden Sie es ab.", "opening": "Reparatur wird geöffnet…", "failed": "Reparatur konnte nicht geöffnet werden. Bitte erneut versuchen.", "phone": "Telefon verbinden", "phoneManage": "Telefonverbindung verwalten", "phoneFailed": "Verbindungsstatus konnte nicht gelesen werden."},
        ru: {"open": "Открыть режим восстановления", "description": "Агент восстановления помогает выявлять и устранять проблемы. Откройте режим, опишите проблему и отправьте сообщение.", "opening": "Открытие восстановления…", "failed": "Не удалось открыть восстановление. Повторите попытку.", "phone": "Подключить телефон", "phoneManage": "Управлять подключением телефона", "phoneFailed": "Не удалось получить состояние подключения."},
        pt: {"open": "Entrar no modo de reparo", "description": "O agente de reparo ajuda a diagnosticar e resolver problemas. Entre no modo, descreva o problema e envie quando estiver pronto.", "opening": "Abrindo reparo…", "failed": "Não foi possível abrir o reparo. Tente novamente.", "phone": "Conectar telefone", "phoneManage": "Gerenciar conexão do telefone", "phoneFailed": "Não foi possível consultar o estado da conexão."}
      }))
      const bridge = window.dshDesktop
      if (typeof bridge?.getRepairDraft === 'function') ctx.slots.inject('conversation.input.dock', () => ctx.slots.register({ name: 'conversation.input.dock', id: 'desktop-repair-draft' }, RepairDraft))
      if (typeof bridge?.openRepairAgent === 'function' || typeof bridge?.openMobilePairing === 'function') ctx.slots.inject('sidebar.settings.action', () => ctx.slots.register({ name: 'sidebar.settings.action', id: 'desktop-utilities', locale: REPAIR_NS, inject: () => ({ t: ctx.locale.bind(REPAIR_NS) }) }, DesktopUtilityActions))
    }

    function PlusIcon() {
      return React.createElement('svg', {
        width: 14, height: 14, viewBox: '0 0 16 16', fill: 'none',
        style: { flex: 'none' }
      }, React.createElement('path', {
        d: 'M8 3V13M3 8H13',
        stroke: 'currentColor',
        strokeWidth: '1.5',
        strokeLinecap: 'round'
      }))
    }

    /** Cloud identities stay namespaced; project ownership is projected by Harness. */
    function SharedCollection({ projects, items, mode, query, archivedOnly, searchPending = false, navigation, t, deleteText }) {
      const state = React.useSyncExternalStore(navigation.subscribe, navigation.snapshot)
      const initialHistoryLoading = state.historyPhase === 'loading' && state.page === 0
      const resultsPending = initialHistoryLoading || (mode === 'search' && searchPending)
      const search = query.trim().toLocaleLowerCase()
      const local = items.map(item => ({ ...item, key: `work:${item.id}`, kind: 'work' }))
      const cloud = archivedOnly ? [] : state.items.filter(item => (item.title || t('newChat')).toLocaleLowerCase().includes(search))
        .map(item => ({ ...item, key: `chat:${item.id}`, kind: 'chat', updatedAt: Date.parse(item.updatedAt) || 0 }))
      const rows = [...local, ...cloud].sort((a, b) => Number(!!b.blank) - Number(!!a.blank) || Number(!!b.pinned) - Number(!!a.pinned) || b.updatedAt - a.updatedAt || a.key.localeCompare(b.key))

      const [workspaceCollapsed, setWorkspaceCollapsed] = React.useState(() => {
        try { return localStorage.getItem('dsh.sidebar.workspaceCollapsed') === 'true' } catch { return false }
      })
      const [sessionsCollapsed, setSessionsCollapsed] = React.useState(() => {
        try { return localStorage.getItem('dsh.sidebar.sessionsCollapsed') === 'true' } catch { return false }
      })

      const toggleWorkspace = (e) => {
        e?.stopPropagation()
        setWorkspaceCollapsed(prev => {
          const next = !prev
          try { localStorage.setItem('dsh.sidebar.workspaceCollapsed', String(next)) } catch {}
          return next
        })
      }

      const toggleSessions = (e) => {
        e?.stopPropagation()
        setSessionsCollapsed(prev => {
          const next = !prev
          try { localStorage.setItem('dsh.sidebar.sessionsCollapsed', String(next)) } catch {}
          return next
        })
      }

      const hasSessions = rows.length > 0
      const isSearchOrFlat = mode === 'search' || mode === 'flat'

      if (isSearchOrFlat) {
        return React.createElement('div', { className: 'dshSharedCollection', 'data-mode': state.mode },
          projects(state.mode === 'work'),
          React.createElement('section', { className: 'dshRecentHistory', 'aria-label': t(mode === 'search' ? 'results' : 'all') },
            React.createElement('div', { className: 'dshSectionHeading' },
              React.createElement('span', { className: 'dshSectionTitle' }, t(mode === 'search' ? 'results' : 'all'))
            ),
            React.createElement('div', { className: 'dshHistoryBody' },
              ...rows.map(item => item.kind === 'work'
                ? React.createElement('div', { key: item.key, 'data-history-kind': 'work' }, item.render(state.mode === 'work'))
                : React.createElement(CloudHistoryRow, { key: item.key, item, selected: state.mode === 'chat' && !state.pageId && state.conversationId === item.id, navigation, t, deleteText })
              ),
              state.historyPhase === 'error' && React.createElement('button', { type: 'button', className: 'dshHistoryNotice', onClick: () => navigation.refreshHistory() }, t('historyError')),
              initialHistoryLoading && React.createElement('div', { className: 'dshHistoryNotice', role: 'status' }, t('historyLoading')),
              rows.length === 0 && !resultsPending && React.createElement('div', { className: 'dshHistoryNotice' }, t(search ? 'recentSearchEmpty' : 'recentEmpty')),
              state.hasMore && !archivedOnly && React.createElement('button', { type: 'button', className: 'dshHistoryNotice', disabled: state.historyPhase === 'loading', onClick: () => navigation.refreshHistory(true) }, t('more'))
            )
          )
        )
      }

      return React.createElement('div', { className: 'dshSharedCollection', 'data-mode': state.mode },
        // 1. Workspace Section (工作区)
        React.createElement('section', { className: 'dshWorkspaceSection', 'aria-label': t('projects') },
          hasSessions && React.createElement('div', {
            className: 'dshSectionHeading',
            onClick: toggleWorkspace
          },
            React.createElement('button', {
              type: 'button',
              className: 'dshSectionToggle',
              'aria-expanded': !workspaceCollapsed,
              title: t('projects'),
              onClick: toggleWorkspace
            },
              React.createElement(ChevronIcon, { expanded: !workspaceCollapsed }),
              React.createElement('span', { className: 'dshSectionTitle' }, t('projects'))
            )
          ),
          (!hasSessions || !workspaceCollapsed) && React.createElement('div', { className: 'dshWorkspaceBody' }, projects(state.mode === 'work'))
        ),

        // 2. Sessions Section (会话)
        React.createElement('section', { className: 'dshRecentHistory', 'aria-label': t('recent') },
          React.createElement('div', {
            className: 'dshSectionHeading',
            onClick: hasSessions ? toggleSessions : undefined
          },
            React.createElement('button', {
              type: 'button',
              className: 'dshSectionToggle',
              'aria-expanded': hasSessions ? !sessionsCollapsed : true,
              title: t('recent'),
              onClick: hasSessions ? toggleSessions : undefined
            },
              hasSessions && React.createElement(ChevronIcon, { expanded: !sessionsCollapsed }),
              React.createElement('span', { className: 'dshSectionTitle' }, t('recent'))
            ),
            React.createElement('button', {
              type: 'button',
              className: 'dshSectionAddButton',
              title: t('newConversation'),
              'aria-label': t('newConversation'),
              onClick: (e) => {
                e.stopPropagation()
                if (typeof navigation.choose === 'function') {
                  navigation.choose('chat')
                } else if (typeof navigation.open === 'function') {
                  void navigation.open('new')
                }
              }
            }, React.createElement(PlusIcon))
          ),
          (!hasSessions || !sessionsCollapsed) && React.createElement('div', { className: 'dshHistoryBody' },
            ...rows.map(item => item.kind === 'work'
              ? React.createElement('div', { key: item.key, 'data-history-kind': 'work' }, item.render(state.mode === 'work'))
              : React.createElement(CloudHistoryRow, { key: item.key, item, selected: state.mode === 'chat' && !state.pageId && state.conversationId === item.id, navigation, t, deleteText })
            ),
            state.historyPhase === 'error' && React.createElement('button', { type: 'button', className: 'dshHistoryNotice', onClick: () => navigation.refreshHistory() }, t('historyError')),
            initialHistoryLoading && React.createElement('div', { className: 'dshHistoryNotice', role: 'status' }, t('historyLoading')),
            rows.length === 0 && !resultsPending && React.createElement('div', { className: 'dshHistoryNotice' }, t('recentEmpty')),
            state.hasMore && !archivedOnly && React.createElement('button', { type: 'button', className: 'dshHistoryNotice', disabled: state.historyPhase === 'loading', onClick: () => navigation.refreshHistory(true) }, t('more'))
          )
        )
      )
    }
    function historyTime(date, t) {
      const time = new Date(date).getTime()
      if (!Number.isFinite(time)) return ''
      const elapsed = Date.now() - time
      if (elapsed >= 0 && elapsed < 60000) return t('justNow')
      return new Date(time).toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' })
    }
    /** Host body portals own modal input; native content yields until the last one closes. */
    function observeHostDialogs(report) {
      const selector = '[role="dialog"][aria-modal="true"], [role="alertdialog"][aria-modal="true"], dialog[open]'
      const portals = new Map()
      let previous = false
      let initialized = false
      let disposed = false
      const refresh = () => {
        if (disposed || document.hidden) return
        const children = new Set([...document.body.children].filter(element => element.id !== 'root' && !element.matches('script, style, link')))
        for (const [element, observer] of portals) {
          if (children.has(element)) continue
          observer.disconnect()
          portals.delete(element)
        }
        for (const element of children) {
          if (portals.has(element)) continue
          const observer = new MutationObserver(refresh)
          observer.observe(element, { childList: true, subtree: true, attributes: true, attributeFilter: ['role', 'aria-modal', 'open', 'hidden', 'style', 'class'] })
          portals.set(element, observer)
        }
        const open = [...children].some(element => {
          const dialogs = [...(element.matches(selector) ? [element] : []), ...element.querySelectorAll(selector)]
          return dialogs.some(dialog => dialog.checkVisibility({ checkVisibilityCSS: true }) &&
            (dialog.getAttribute('aria-modal') === 'true' || dialog.matches(':modal')))
        })
        if (open === previous) return
        previous = open
        if (initialized) report(open)
      }
      const body = new MutationObserver(refresh)
      body.observe(document.body, { childList: true })
      document.addEventListener('visibilitychange', refresh)
      refresh()
      initialized = true
      return { isOpen: () => previous, dispose: () => {
        disposed = true
        body.disconnect()
        for (const observer of portals.values()) observer.disconnect()
        portals.clear()
        document.removeEventListener('visibilitychange', refresh)
      } }
    }
    function DesktopModes({ work, columns, resizeHandle, navigation, t, locale }) {
      const state = React.useSyncExternalStore(navigation.subscribe, navigation.snapshot)
      const { mode, settingsOpen, settingsSurface } = state
      React.useEffect(() => navigation.start(), [navigation])
      const panel = React.useRef(null)
      const [animateWork, setAnimateWork] = React.useState(false)
      const tabs = React.useRef({})
      React.useEffect(() => {
        const bridge = window.dshEnterpriseChat
        if (!bridge) return
        const appRoot = document.getElementById('root')
        let observedLeading
        let dialogOpen = false
        const present = () => {
          const rect = panel.current?.getBoundingClientRect()
          if (!rect) return
          const sidebarRight = document.querySelector('[data-dsh-sidebar-root]')?.getBoundingClientRect().right || 0
          const contentLeft = Math.max(rect.x, sidebarRight)
          // Native WebContentsView paints above DOM chrome regardless of z-index.
          // macOS moves the sidebar opener into this seat when the rail disappears.
          const leading = document.querySelector('[data-shell-leading]')
          if (leading !== observedLeading) {
            if (observedLeading) resize.unobserve(observedLeading)
            observedLeading = leading
            if (leading) resize.observe(leading)
          }
          const chrome = leading?.getBoundingClientRect()
          // Keep the title beside the native controls instead of adding a row.
          const x = chrome && chrome.bottom > rect.y && chrome.left < rect.right
            ? Math.max(contentLeft, chrome.right) : contentLeft
          const y = rect.y
          const surfaceOpen = settingsOpen || state.approvalsOpen || state.accountDialogOpen
          const remote = surfaceOpen && state.settingsProtocolVersion === 1 && settingsSurface
const safeModePageOpen = document.documentElement.hasAttribute('data-dsh-safe-mode-page')
const hostModalOpen = dialogOpen || appRoot?.inert || document.documentElement.hasAttribute('data-dsh-about-open')
const palette = hostPalette()
void bridge.present({ visible: hostModalOpen ? false : (remote ? state.connected && remote.bounds.width > 0 && remote.bounds.height > 0 : mode === 'chat' && !surfaceOpen && !safeModePageOpen), ...(remote ? { settings: remote.section } : {}), ...(palette ? { palette } : {}), bounds: remote ? remote.bounds : { x, y, width: Math.max(0, rect.right - x), height: Math.max(0, rect.y + rect.height - y) }, theme: document.body.hasAttribute('data-ds-dark-theme') ? 'dark' : 'light', locale: locale.getSnapshot().active === 'zh' ? 'zh' : 'en' }).catch(() => {})
        }
        // The native view follows the host's modal interaction boundary.
        // Onboarding makes #root inert while its dialog lives in a body portal.
        const interaction = new MutationObserver(present)
        if (appRoot) interaction.observe(appRoot, { attributes: true, attributeFilter: ['inert'] })
// About covers Chat and remote settings. The recovery page covers Chat only.
interaction.observe(document.documentElement, { attributes: true, attributeFilter: ['data-dsh-about-open', 'data-dsh-safe-mode-page'] })
        const resize = new ResizeObserver(present)
        if (panel.current) resize.observe(panel.current)
        const sidebar = document.querySelector('[data-dsh-sidebar-root]')
        if (sidebar) resize.observe(sidebar)
        // The leading seat mounts/unmounts as a direct frame child on collapse.
        // Observe only that boundary, not streaming conversation descendants.
        const chromeLayout = new MutationObserver(present)
        const frame = panel.current?.closest('.dshModes')?.parentElement
        if (frame) chromeLayout.observe(frame, { childList: true, attributes: true, attributeFilter: ['data-sidebar-collapsed'] })
        const theme = new MutationObserver(present)
        theme.observe(document.body, { attributes: true, attributeFilter: ['data-ds-dark-theme'] })
        const dialogs = observeHostDialogs(open => { dialogOpen = open; present() })
        dialogOpen = dialogs.isOpen()
        const unsubscribeLocale = locale.subscribe(present)
        window.addEventListener('resize', present)
        present()
        return () => {
          dialogs.dispose(); interaction.disconnect(); resize.disconnect(); chromeLayout.disconnect(); theme.disconnect(); unsubscribeLocale(); window.removeEventListener('resize', present)
        }
      }, [mode, settingsOpen, state.approvalsOpen, state.accountDialogOpen, settingsSurface, state.connected, state.settingsProtocolVersion, locale])
      React.useEffect(() => () => {
        void window.dshEnterpriseChat?.present({ visible: false, bounds: { x: 0, y: 48, width: 0, height: 0 }, theme: 'light' }).catch(() => {})
      }, [])
      const showModePicker = !settingsOpen && (mode === 'chat'
        ? !state.pageId && state.conversationId === 'new' && state.landing !== false
        : state.nativeWork && state.workLanding && !state.panelOpen)
      const select = navigation.choose
      const keyDown = (event) => {
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
        event.preventDefault()
        setAnimateWork(false)
        const next = event.key === 'Home' ? 'chat' : event.key === 'End' ? 'work' : mode === 'chat' ? 'work' : 'chat'
        if (select(next)) tabs.current[next]?.focus()
      }
      return React.createElement('div', { className: 'dshModes' },
        state.signInPromptOpen && React.createElement(Modal, {
          open: true, title: t('signInTitle'), closeLabel: t('close'), onClose: navigation.dismissSignIn,
          footer: React.createElement('div', { className: 'dshChatSignInActions' },
            React.createElement(Button, { type: 'button', variant: 'outline', onClick: navigation.dismissSignIn }, t('continueWork')),
            React.createElement(Button, { type: 'button', variant: 'primary', onClick: navigation.signIn }, t('signIn')))
        }, React.createElement('p', { className: 'dshChatSignInDescription' }, t('signInDescription'))),
        showModePicker && React.createElement('header', { className: 'dshModesHeader' },
          React.createElement('div', { role: 'tablist', 'aria-label': t('label'), className: 'dshModesTabs', onKeyDown: keyDown },
            ...['chat', 'work'].map((key) => React.createElement('button', { key, id: `dsh-mode-${key}`, type: 'button', role: 'tab', 'aria-selected': mode === key, 'aria-controls': `dsh-panel-${key}`, tabIndex: mode === key ? 0 : -1, ref: (node) => { tabs.current[key] = node }, onClick: (event) => { setAnimateWork(event.detail > 0 && key === 'work'); select(key) } }, t(key))))),
        React.createElement('section', { id: 'dsh-panel-work', role: 'tabpanel', 'aria-label': t('work'), hidden: mode !== 'work', className: 'dshModeBody dshWorkContent', 'data-reveal-controls': animateWork, onTransitionEnd: event => { if (event.propertyName === 'clip-path') setAnimateWork(false) }, style: { gridTemplateColumns: columns } }, work, resizeHandle),
        React.createElement('section', { ref: panel, id: 'dsh-panel-chat', role: 'tabpanel', 'aria-label': t('chat'), hidden: mode !== 'chat', className: 'dshModeBody' },
          React.createElement('div', { className: 'dshChatStatus', role: 'status' },
            React.createElement('p', null, state.phase === 'error' ? t('error') : state.phase === 'ready' ? '' : t('loading')),
            state.connected && state.phase === 'error' && React.createElement('button', { type: 'button', onClick: () => { void window.dshEnterpriseChat.retry().catch(() => {}) } }, t('retry')))))
    }
    const NAV_ICON_PATHS = {
      new: 'M12 20H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v7M16 16v6m-3-3h6M7 8h10M7 12h5',
      knowledge: 'M5 3h14v18H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm0 14h14M7 6h8',
      channel: 'M5 3h14v18l-7-4-7 4V3Zm7 3v8m-4-4h8',
      apps: 'M8 5V3h8v2M3 7h18v14H3V7Zm0 5h18M9 10v5h6v-5',
      tools: 'M14.7 6.3a5.5 5.5 0 0 0-7 7L3 18a2.1 2.1 0 0 0 3 3l4.7-4.7a5.5 5.5 0 0 0 7-7l-3.5 3.5-3-3 3.5-3.5Z',
      skills: 'M5 3h14v18H5V3Zm3 4h8M8 11h8M8 15h5',
      square: 'M3 4h6v6H3V4Zm12 0h6v6h-6V4ZM3 14h6v6H3v-6Zm12 0h6v6h-6v-6',
      more: 'M5 12h.01M12 12h.01M19 12h.01'
    }
    function ResourceIcon({ id, size = 16 }) {
      return React.createElement(ReferenceIconRegular, { kind: { skills: 'skill', tools: 'tool', knowledge: 'folder' }[id], size })
    }
    function NavigationIcon({ id, size = 16 }) {
      return React.createElement('svg', { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: id === 'more' ? 3 : 1.5, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true },
        React.createElement('path', { d: NAV_ICON_PATHS[id === 'capabilities' ? 'skills' : id] || NAV_ICON_PATHS.apps }))
    }
    function PrimaryNavigation({ wide, renderAction, expandSidebar, panels, selectPanel, renderPanelIcon, navigation, t }) {
      const state = React.useSyncExternalStore(navigation.subscribe, navigation.snapshot)
      const [menuOpen, setMenuOpen] = React.useState(false)
      React.useEffect(() => { setMenuOpen(false) }, [state.epoch])
      React.useEffect(() => { if (!wide) setMenuOpen(false) }, [wide])
      React.useEffect(() => {
        if (!menuOpen) return
        // Electron's embedded Chat view takes focus without an iframe in this document.
        // Menu already handles outside pointer clicks in the Harness document.
        const close = () => setMenuOpen(false)
        window.addEventListener('blur', close)
        return () => window.removeEventListener('blur', close)
      }, [menuOpen])
      const entries = state.connected ? state.navigation?.entries || [] : []
      const activeId = state.mode === 'chat' ? entries.find(entry => entry.active)?.id : undefined
      const plugins = panels.find(panel => panel.id === 'plugins')
      const morePanels = panels.filter(panel => panel.id !== 'plugins')
      const items = [
        ...entries.map(entry => ({ id: `web:${entry.id}`, label: entry.label, icon: React.createElement(NavigationIcon, { id: entry.id }) })),
        ...morePanels.map(panel => ({ id: `local:${panel.id}`, label: panel.label, icon: renderPanelIcon(panel.id) }))
      ]
      return React.createElement('nav', { className: 'dshPrimaryNavigation', 'data-wide': wide, 'aria-label': t('navigation') },
        plugins && renderAction({ id: plugins.id, label: plugins.label, icon: renderPanelIcon(plugins.id), active: state.mode === 'work' && state.activePanelId === plugins.id, onClick: () => { setMenuOpen(false); navigation.select('work'); selectPanel(plugins.id) } }),
        items.length > 0 && React.createElement(Menu, {
          open: menuOpen, onClose: () => setMenuOpen(false), items, autoFocus: true, dense: true,
          className: 'dshNavigationMenu', listClassName: 'dshNavigationMenuList',
          selectedId: activeId ? `web:${activeId}` : undefined,
          onSelect: id => { setMenuOpen(false); if (id.startsWith('web:')) void navigation.openPage(id.slice(4)); else { navigation.select('work'); selectPanel(id.slice(6)) } },
          anchor: renderAction({ id: 'more', label: t('moreNavigation'), icon: React.createElement(NavigationIcon, { id: 'more' }), active: Boolean(activeId) || (state.mode === 'work' && morePanels.some(panel => panel.id === state.activePanelId)), expanded: menuOpen, onClick: () => { if (!wide) expandSidebar(); setMenuOpen(open => !open) } })
        }))
    }
    // Work overlays use viewport coordinates. Isolate stacking while keeping
    // their fixed-position containing block attached to the viewport.
    function installDesktopModes(ctx) {
      const navigation = createChatNavigation(ctx)
      ctx.effect(() => () => navigation.deletion.dispose())
      ctx.effect(() => ctx.locale.register(MODES_NS, MODES_COPY), 'desktop: Chat and Work locale')
      ctx.effect(() => ctx.locale.register(CLOUD_DELETE_NS, CLOUD_DELETE_COPY))
      ctx.slots.inject('shell.overlay', () => ctx.slots.register({
        name: 'shell.overlay', id: 'desktop-cloud-chat-delete-dialog', locale: CLOUD_DELETE_NS,
        inject: () => ({ deletion: navigation.deletion, t: ctx.locale.bind(CLOUD_DELETE_NS) })
      }, DeleteSessionDialog))
      ctx.effect(() => {
        const style = document.createElement('style')
        style.dataset.plugin = 'dsh-desktop-client-ui'
        style.textContent = `
          .dshPrimaryNavigation{display:flex;flex-direction:column;flex:none;gap:4px;padding:0 0 12px}
          .dshPrimaryNavigation[data-wide=false]{gap:12px}
          .dshNavigationMenu{display:flex;flex-direction:column;position:relative;width:100%}.dshNavigationMenu .dshNavigationMenuList{width:100%;min-width:0;max-width:100%;box-sizing:border-box}
          .dshModes{grid-column:2 / -1;min-width:0;min-height:0;width:100%;height:100%;display:flex;flex-direction:column;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary)}
          .dshModesHeader{height:56px;flex:none;display:flex;align-items:center;justify-content:center}
          html[data-platform=darwin] .dshModesHeader{-webkit-app-region:drag}
          .dshModesTabs{display:flex;padding:3px;border-radius:24px;background:var(--dsw-alias-bg-layer-2);-webkit-app-region:no-drag}
          .dshModesTabs button{font:inherit;font-size:13px;min-width:96px;height:30px;padding:0 20px;border:0;border-radius:20px;background:transparent;color:var(--dsw-alias-label-secondary);cursor:pointer}
          .dshModesTabs button[aria-selected=true]{background:var(--dsw-alias-interactive-bg-hover-solid);color:var(--dsw-alias-label-primary)}
          .dshModes button:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:2px}
          .dshModeBody{flex:1;min-height:0;display:flex;flex-direction:column;position:relative}.dshModeBody[hidden]{display:none}
          .dshWorkContent{display:grid;grid-template-rows:minmax(0,1fr);isolation:isolate}.dshWorkContent[hidden]{display:none}
          .dshWorkContent[data-reveal-controls=true]:not([hidden]) [data-dsh-hero-controls]{clip-path:inset(-8px -8px -8px -8px);transition:clip-path 180ms cubic-bezier(.23,1,.32,1)}
          @starting-style{.dshWorkContent[data-reveal-controls=true]:not([hidden]) [data-dsh-hero-controls]{clip-path:inset(-8px 100% -8px -8px)}}
          @media(prefers-reduced-motion:reduce){.dshWorkContent[data-reveal-controls=true] [data-dsh-hero-controls]{transition:none;clip-path:none}}
          
          /* Suppress stock gear icon when community plugins use custom icons */
          [data-dsh-market-nav-icon] span[class*="navIcon"],
          [data-dsh-market-nav-icon] svg,
          [data-dsh-better-sidebar-settings-nav] span[class*="navIcon"],
          [data-dsh-better-sidebar-settings-nav] svg {
            display: none !important;
          }

          /* Collapsible Workspace & Sessions styling */
          .dshSectionHeading {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 4px 6px 4px 4px;
            margin-bottom: 2px;
            color: var(--dsw-alias-label-secondary);
            font-size: 12px;
            user-select: none;
            border-radius: 6px;
          }
          .dshSectionToggle {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            background: transparent;
            border: 0;
            padding: 2px 4px;
            border-radius: 4px;
            color: inherit;
            font: inherit;
            font-size: 12px;
            font-weight: 500;
            cursor: pointer;
            text-align: left;
          }
          .dshSectionToggle:hover {
            color: var(--dsw-alias-label-primary);
          }
          .dshSectionAddButton {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 22px;
            height: 22px;
            background: transparent;
            border: 0;
            border-radius: 4px;
            color: var(--dsw-alias-label-secondary);
            cursor: pointer;
            padding: 0;
            transition: background-color 0.12s, color 0.12s;
          }
          .dshSectionAddButton:hover {
            color: var(--dsw-alias-label-primary);
            background: var(--dsw-alias-interactive-bg-hover);
          }
          .dshWorkspaceSection {
            min-width: 0;
            margin-bottom: 8px;
          }
          .dshWorkspaceBody, .dshHistoryBody {
            min-width: 0;
          }

          .dshSharedCollection{min-width:0}
          .dshRecentHistory{margin-top:12px;min-width:0}
          .dshHistoryHeading{display:flex;align-items:center;justify-content:space-between;padding:4px 8px 12px;color:var(--dsw-alias-label-secondary);font-size:13px}
          .dshCloudHistoryRow{display:flex;align-items:center;min-width:0}
          .dshCloudHistoryRow>.dshHistoryRow{flex:1;min-width:0}
          .dshCloudHistoryActions{border:0;border-radius:6px;background:transparent;color:var(--dsw-alias-label-secondary);width:28px;height:28px;cursor:pointer;font:inherit}
          .dshCloudHistoryActions:hover,.dshCloudHistoryActions[aria-expanded=true]{background:var(--dsw-alias-interactive-bg-hover)}
          .dshHistoryRow{box-sizing:border-box;display:flex;align-items:center;gap:6px;width:100%;height:32px;margin-bottom:2px;padding:0 8px 0 28px;border:0;border-radius:8px;background:transparent;color:var(--dsw-alias-label-primary);font:inherit;text-align:left;cursor:pointer}
          .dshHistoryRow:hover,.dshHistoryRow[aria-current=page]{background:var(--dsw-alias-interactive-bg-hover)}
          .dshHistoryRow span{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.dshHistoryRow time{color:var(--dsw-alias-label-tertiary);font-size:10px;white-space:nowrap}
          .dshHistoryRow:is(:hover,:focus-visible) span{text-overflow:clip}.dshHistoryRow:is(:hover,:focus-visible) time{display:none}
          .dshHistoryNotice{padding:8px;font:inherit;font-size:12px;color:var(--dsw-alias-label-secondary);background:transparent;border:0;text-align:left}.dshHistoryNotice:is(button){cursor:pointer}
          .dshSharedCollection button:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:-2px}
          .dshChatSignInDescription{margin:0;font-size:14px;line-height:1.6;color:var(--dsw-alias-label-secondary)}
          .dshChatSignInActions{display:flex;flex-wrap:wrap;justify-content:flex-end;gap:8px}
          .dshChatStatus{margin:auto;text-align:center;font-size:14px;color:var(--dsw-alias-label-secondary)}
          .dshChatStatus button{font:inherit;color:inherit;background:var(--dsw-alias-bg-layer-2);border:1px solid var(--dsw-alias-border-l2);border-radius:8px;padding:8px 16px;cursor:pointer}
        `
        document.head.appendChild(style)
        return () => style.remove()
      })
      ctx.slots.inject('sidebar.primaryNavigation', () => ctx.slots.register({ name: 'sidebar.primaryNavigation', id: 'desktop-primary-navigation', inject: () => ({ navigation, t: ctx.locale.bind(MODES_NS) }) }, PrimaryNavigation))
      ctx.slots.inject('sidebar.workspaces.title', () => ctx.slots.register({ name: 'sidebar.workspaces.title', inject: () => ({ t: ctx.locale.bind(MODES_NS) }) }, ({ flat, t }) => t(flat ? 'all' : 'projects')))
      if (typeof window.dshEnterpriseChat?.present === 'function') ctx.slots.inject('desktop.mode.content', () => ctx.slots.register({ name: 'desktop.mode.content', id: 'desktop-chat-work', inject: () => ({ navigation, t: ctx.locale.bind(MODES_NS), locale: ctx.locale }) }, DesktopModes))
      ctx.slots.inject('sidebar.workspaces.collection', () => ctx.slots.register({ name: 'sidebar.workspaces.collection', id: 'desktop-shared-collection', inject: () => ({ navigation, t: ctx.locale.bind(MODES_NS), deleteText: ctx.locale.bind(CLOUD_DELETE_NS) }) }, SharedCollection))
      return navigation
    }

    const RESOURCE_NS = 'desktop-work-resources'
    const RESOURCE_COPY = {
      zh: { tools: '工具', toolsHint: '选择本次任务使用的工具', skills: '技能', skillsHint: '选择本次任务使用的技能', knowledge: '知识空间', knowledgeHint: '选择本次任务检索的知识空间', search: '搜索知识空间', empty: '暂无可用知识空间', noMatch: '没有匹配的知识空间', loading: '正在加载知识空间…', retry: '重试', cancel: '取消', confirm: '确认添加', close: '关闭', remove: '移除', department: '部门知识空间', mine: '我创建的', joined: '我加入的', selectKnowledge: '选择知识空间', modified: '修改时间', selected: '已选 {count} 个知识空间', limit: '最多选择 50 个空间' },
      en: { tools: 'Tools', toolsHint: 'Choose tools for this task', skills: 'Skills', skillsHint: 'Choose a skill for this task', knowledge: 'Knowledge spaces', knowledgeHint: 'Choose knowledge spaces to search in this task', search: 'Search knowledge spaces', empty: 'No knowledge spaces available', noMatch: 'No matching knowledge spaces', loading: 'Loading knowledge spaces…', retry: 'Retry', cancel: 'Cancel', confirm: 'Add selected', close: 'Close', remove: 'Remove', department: 'Department spaces', mine: 'Created by me', joined: 'Joined spaces', selectKnowledge: 'Select knowledge spaces', modified: 'Modified', selected: '{count} knowledge spaces selected', limit: 'Select up to 50 spaces' }
    }
    async function workResourceRequest(operation, sessionId, spaceIds, signal) {
      const response = await fetch('/api/enterprise.work-resources', {
        method: 'POST', headers: { 'content-type': 'application/json' }, signal,
        body: JSON.stringify({ operation, sessionId, ...(spaceIds === undefined ? {} : { spaceIds }) })
      })
      const result = await response.json().catch(() => ({ error: `Knowledge service unavailable (${response.status})` }))
      if (!response.ok) throw new Error(result.error || `Knowledge request failed (${response.status})`)
      return result
    }
    async function workSkillRequest(body, signal) {
      const response = await fetch('/api/enterprise.work-skills', {
        method: 'POST', headers: { 'content-type': 'application/json' }, signal, body: JSON.stringify(body)
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Skill request failed.')
      return data
    }
    async function workToolRequest(body, signal) {
      const response = await fetch('/api/enterprise.work-tools', {
        method: 'POST', headers: { 'content-type': 'application/json' }, signal, body: JSON.stringify(body)
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Tool request failed.')
      return result
    }
    const TOOL_REFERENCE_SOURCE = 'desktop-tool'
    const validToolLabel = label => typeof label === 'string' && label.trim().length > 0 && !/[\u0000-\u001f\u007f]/u.test(label)
    const decodeToolReference = ref => {
      const tool = JSON.parse(ref)
      if (!tool || !/^mcp__bisheng__bisheng_tool_[1-9][0-9]*$/.test(tool.name) || !validToolLabel(tool.label) || typeof tool.connectionKey !== 'string' || !tool.connectionKey) throw new Error('Invalid tool reference.')
      return tool
    }
    const toolReferenceSource = {
      trigger: '/', name: TOOL_REFERENCE_SOURCE, candidates: async () => [], onPick: () => undefined, openReference: () => false,
      codec: {
        clipboardText: ref => `/${decodeToolReference(ref).label}`,
        serialize: async (ref, signal) => {
          const tool = decodeToolReference(ref)
          await workToolRequest({ operation: 'validate', names: [tool.name], connectionKey: tool.connectionKey }, signal)
          return ` [Selected tool: ${tool.name}; label: ${JSON.stringify(tool.label)}] `
        }
      }
    }
    // Persist the selection's label with its model identity. Transcript rendering
    // reads this snapshot, so account changes and catalog renames preserve history.
    const workToolMessageRule = {
      id: TOOL_REFERENCE_SOURCE, order: 20,
      match(text, from) {
        const pattern = /\[Selected tool: (mcp__bisheng__bisheng_tool_[1-9][0-9]*)(?:; label: ("(?:[^"\\\r\n]|\\.)*"))?\]/gu
        pattern.lastIndex = from
        for (let match = pattern.exec(text); match; match = pattern.exec(text)) {
          let label
          if (match[2] !== undefined) {
            try { label = JSON.parse(match[2]) } catch { continue }
            if (!validToolLabel(label)) continue
          }
          return { id: TOOL_REFERENCE_SOURCE, start: match.index, end: pattern.lastIndex, data: { name: match[1], ...(label === undefined ? {} : { label }) } }
        }
      }
    }
    function WorkToolMessage({ node, t }) {
      // Legacy messages carry only an ID. A neutral label keeps their meaning
      // without resolving that ID against a different enterprise account.
      const label = node.data.label ?? t('selectedTool')
      return React.createElement('span', { className: 'dshWorkToolReference', title: label },
        React.createElement(NavigationIcon, { id: 'tools', size: 14 }), label)
    }
    function installWorkToolMessages(ctx) {
      const ns = 'desktop.toolMessage'
      ctx.effect(() => ctx.locale.register(ns, { zh: { selectedTool: '已选工具' }, en: { selectedTool: 'Selected tool' } }), 'desktop tool message locale')
      ctx.effect(() => ctx.uiConversation.userText.register(workToolMessageRule), 'desktop tool message rule')
      ctx.slots.inject('conversation.user.text.node', () => ctx.slots.register({
        name: 'conversation.user.text.node', key: TOOL_REFERENCE_SOURCE, priority: 100,
        inject: () => ({ t: ctx.locale.bind(ns) })
      }, WorkToolMessage))
      ctx.effect(() => {
        const style = document.createElement('style')
        style.dataset.plugin = 'dsh-desktop-tool-message'
        style.textContent = '.dshWorkToolReference{color:var(--dsw-alias-state-business-primary);overflow-wrap:anywhere}.dshWorkToolReference svg{vertical-align:text-bottom;margin-inline-end:4px}'
        document.head.appendChild(style)
        return () => style.remove()
      })
    }
    const SKILL_REFERENCE_SOURCE = 'desktop-skill'
    const decodeSkillReference = ref => {
      const value = JSON.parse(ref)
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value.name) || typeof value.label !== 'string') throw new Error('Invalid skill reference.')
      return value
    }
    const skillReferenceSource = {
      trigger: '/', name: SKILL_REFERENCE_SOURCE, candidates: async () => [], onPick: () => undefined, openReference: () => false,
      codec: {
        clipboardText: ref => `/${decodeSkillReference(ref).label}`,
        serialize: async (ref, signal) => {
          const skill = decodeSkillReference(ref)
          if (skill.enterprise) await workSkillRequest({ operation: 'validate', names: [skill.name] }, signal)
          return ` /${skill.name} `
        }
      }
    }
    const KNOWLEDGE_REFERENCE_SOURCE = 'desktop-knowledge'

    // The editor owns the draft selection. Retrieval scope is committed before
    // submission, so clearing a sent draft leaves the running task's scope intact.
    function createWorkKnowledgeComposer({ inputFor, ensureSession, request }) {
      const used = new WeakSet()
      const decode = ref => {
        const space = JSON.parse(ref)
        if (!Number.isSafeInteger(space.id) || space.id <= 0 || typeof space.name !== 'string') throw new Error('Invalid knowledge reference.')
        return space
      }
      const read = sessionId => inputFor(sessionId).input.state.getSnapshot().occurrences
        .filter(item => item.source === KNOWLEDGE_REFERENCE_SOURCE).map(item => decode(item.ref))
      const update = (sessionId, spaces, captureInsertion) => {
        const { input, scope } = inputFor(sessionId)
        if (!['plain', 'claimed'].includes(input.state.getSnapshot().phase)) throw new Error('Wait for the current submission to finish, then choose knowledge spaces.')
        const wanted = new Set(spaces.map(space => space.id))
        const snapshot = input.state.getSnapshot()
        let shift = 0
        const removed = []
        for (const item of snapshot.occurrences) {
          if (item.source === KNOWLEDGE_REFERENCE_SOURCE && !wanted.has(decode(item.ref).id)) removed.push(item.offset - shift)
          shift += item.length - 1
        }
        for (const start of removed.reverse()) {
          const state = input.state.getSnapshot()
          if (!scope.bail(scope, 'slash/input-insert-text', { text: '', span: { start, end: start + 1, draftRev: state.draftRev } })) throw new Error('Knowledge selection changed. Please try again.')
        }
        const present = new Set(read(sessionId).map(space => space.id))
        for (const space of spaces) {
          if (present.has(space.id)) continue
          const ref = JSON.stringify({ id: space.id, name: space.name })
          if (!input.insertReference({ source: KNOWLEDGE_REFERENCE_SOURCE, appearance: 'folder', ref, label: space.name, clipboardText: `@${space.name}` }, captureInsertion())) throw new Error('Knowledge selection changed. Please try again.')
          present.add(space.id)
        }
        used.add(inputFor(sessionId).input)
      }
      const source = {
        trigger: '@', name: KNOWLEDGE_REFERENCE_SOURCE,
        candidates: async () => [],
        onPick: () => undefined,
        openReference: () => false,
        codec: { clipboardText: ref => `@${decode(ref).name}`, serialize: async ref => `@${decode(ref).name}` },
      }
      const catalogFor = async (sessionId, signal) => {
        const { input } = inputFor(sessionId)
        const catalog = await request('catalog', sessionId, undefined, signal)
        signal?.throwIfAborted()
        if (inputFor(sessionId).input !== input) throw new Error('Work task changed.')
        return catalog.spaces
      }
      const refresh = async (sessionId, signal) => {
        if (read(sessionId).length === 0) return
        const spaces = await catalogFor(sessionId, signal)
        const { input } = inputFor(sessionId)
        if (['plain', 'claimed'].includes(input.state.getSnapshot().phase)) {
          const allowed = new Set(spaces.map(space => space.id))
          const current = read(sessionId)
          const retained = current.filter(space => allowed.has(space.id))
          if (retained.length < current.length) update(sessionId, retained)
        }
      }
      const choose = async (sessionId, ids, captureInsertion, signal) => {
        const spaces = await catalogFor(sessionId, signal)
        update(sessionId, spaces.filter(space => ids.includes(space.id)), captureInsertion)
      }
      const prepare = async ({ sessionId, references, signal, command }) => {
        // Goal control commands keep the active objective's retrieval scope.
        if (command && (command.name !== 'goal' || !command.args.trim() || /^(?:clear|pause|resume|edit)$/i.test(command.args.trim()))) return
        signal.throwIfAborted()
        const ids = [...new Set(references.filter(item => item.source === KNOWLEDGE_REFERENCE_SOURCE).map(item => decode(item.ref).id))]
        if (!ids.length && !used.has(inputFor(sessionId).input)) return
        await ensureSession(sessionId, signal)
        await request('select', sessionId, ids, signal)
        used.add(inputFor(sessionId).input)
      }
      return { read, update, source, prepare, refresh, choose, state: sessionId => inputFor(sessionId).input.state }
    }

    function WorkResourceAccessory({ sessionId, controls, t, inputActions, knowledge }) {
      const [open, setOpen] = React.useState(false)
      const [spaces, setSpaces] = React.useState([])
      const [draft, setDraft] = React.useState([])
      const [keyword, setKeyword] = React.useState('')
      const [loading, setLoading] = React.useState(false)
      const [saving, setSaving] = React.useState(false)
      const [error, setError] = React.useState('')
      const [accessError, setAccessError] = React.useState('')
      const [revision, retry] = React.useReducer(value => value + 1, 0)
      React.useEffect(() => {
        let pending
        let signature
        const refresh = () => {
          pending?.abort()
          const abort = new AbortController()
          pending = abort
          knowledge.refresh(sessionId, abort.signal)
            .then(() => { if (!abort.signal.aborted) setAccessError('') })
            .catch(reason => { if (!abort.signal.aborted) setAccessError(reason.message) })
        }
        const changed = () => {
          const state = knowledge.state(sessionId).getSnapshot()
          const next = JSON.stringify([state.phase, knowledge.read(sessionId)])
          if (next === signature) return
          signature = next
          if (['plain', 'claimed'].includes(state.phase)) refresh()
        }
        const visible = () => { if (document.visibilityState === 'visible') refresh() }
        const unsubscribe = knowledge.state(sessionId).subscribe(changed)
        changed()
        window.addEventListener('focus', refresh)
        document.addEventListener('visibilitychange', visible)
        const timer = setInterval(visible, 30_000)
        return () => {
          pending?.abort(); unsubscribe(); clearInterval(timer)
          window.removeEventListener('focus', refresh)
          document.removeEventListener('visibilitychange', visible)
        }
      }, [sessionId, knowledge])
      const commitAbort = React.useRef()
      React.useEffect(() => {
        setSaving(false)
        return () => commitAbort.current?.abort()
      }, [sessionId])
      React.useEffect(() => {
        const control = { open: () => { setKeyword(''); setOpen(true) }, captureInsertion: () => inputActions.captureInsertion() }
        controls.set(sessionId, control)
        return () => { if (controls.get(sessionId) === control) controls.delete(sessionId) }
      }, [sessionId, controls, inputActions])
      React.useEffect(() => {
        if (!open) return
        const abort = new AbortController()
        setLoading(true); setError('')
        workResourceRequest('catalog', sessionId, undefined, abort.signal)
          .then(catalog => { if (!abort.signal.aborted) { setSpaces(catalog.spaces); setDraft(knowledge.read(sessionId).map(space => space.id)) } })
          .catch(reason => { if (!abort.signal.aborted) setError(reason.message) })
          .finally(() => { if (!abort.signal.aborted) setLoading(false) })
        return () => abort.abort()
      }, [open, revision, sessionId, knowledge])
      const close = () => { if (!saving) setOpen(false) }
      const commit = async ids => {
        const abort = new AbortController()
        commitAbort.current?.abort()
        commitAbort.current = abort
        setSaving(true); setError('')
        try {
          await knowledge.choose(sessionId, ids, () => inputActions.captureInsertion(), abort.signal)
          setOpen(false)
        }
        catch (reason) { if (!abort.signal.aborted) setError(reason.message) }
        finally { if (!abort.signal.aborted) setSaving(false) }
      }
      const visible = spaces.filter(space => space.name.toLowerCase().includes(keyword.trim().toLowerCase())).sort((a, b) => {
        const an = a.name.trim(), bn = b.name.trim()
        const aIsEn = an.length > 0 && an.charCodeAt(0) < 128
        const bIsEn = bn.length > 0 && bn.charCodeAt(0) < 128
        return aIsEn !== bIsEn ? (aIsEn ? -1 : 1) : an.localeCompare(bn, aIsEn ? 'en' : 'zh-Hans-u-co-pinyin', { sensitivity: 'base' })
      })
      const icon = kind => React.createElement('svg', { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true },
        kind === 'search' ? [React.createElement('circle', { key: 'circle', cx: 11, cy: 11, r: 8 }), React.createElement('path', { key: 'handle', d: 'm21 21-4.3-4.3' })] :
        kind === 'close' ? React.createElement('path', { d: 'm18 6-12 12M6 6l12 12' }) :
        [React.createElement('path', { key: 'left', d: 'M12 7v14m0-14C10 5 8 5 2 5v14c6 0 8 0 10 2' }), React.createElement('path', { key: 'right', d: 'M12 7c2-2 4-2 10-2v14c-6 0-8 0-10 2' })])
      return React.createElement(React.Fragment, null,
        (error || accessError) && !open && React.createElement('div', { role: 'alert', className: 'dshWorkResourceError' }, error || accessError),
        React.createElement(Modal, { open, onClose: close, title: t('selectKnowledge'), headless: true, backdropBlur: false, className: 'dshWorkKnowledgeDialog' },
          React.createElement('header', { className: 'dshWorkKnowledgeHeader' },
            React.createElement('h2', null, t('selectKnowledge')),
            React.createElement('button', { type: 'button', onClick: close, disabled: saving, 'aria-label': t('close') }, icon('close'))),
          React.createElement('div', { className: 'dshWorkKnowledgeBody' },
            React.createElement('div', { className: 'dshWorkKnowledgeSearchField' }, icon('search'),
              React.createElement('input', { className: 'dshWorkKnowledgeSearch', 'data-modal-autofocus': true, type: 'search', placeholder: t('search'), 'aria-label': t('search'), value: keyword, onChange: event => setKeyword(event.target.value) })),
            React.createElement('div', { className: 'dshWorkKnowledgeColumns' }, React.createElement('span', null, t('knowledge')), React.createElement('span', null, t('modified'))),
            React.createElement('div', { className: 'dshWorkKnowledgeList', 'aria-busy': loading },
              loading ? React.createElement('p', { role: 'status' }, t('loading')) : error ? React.createElement('div', { role: 'alert' }, error, React.createElement(Button, { onClick: retry }, t('retry'))) : visible.length === 0 ? React.createElement('p', { role: 'status' }, t(keyword ? 'noMatch' : 'empty')) :
              ['department', 'mine', 'joined'].map(group => {
                const rows = visible.filter(space => space.group === group)
                return rows.length > 0 && React.createElement('section', { key: group }, React.createElement('h3', null, t(group)), rows.map(space => {
                  const checked = draft.includes(space.id)
                  const date = space.updatedAt ? new Date(space.updatedAt) : null
                  const validDate = date && !Number.isNaN(date.getTime())
                  return React.createElement('label', { key: space.id, className: 'dshWorkKnowledgeRow', 'data-selected': checked },
                    React.createElement('input', { type: 'checkbox', checked, 'aria-label': space.name, disabled: saving || (!checked && draft.length >= 50), onChange: event => setDraft(ids => event.target.checked ? [...ids, space.id] : ids.filter(id => id !== space.id)) }),
                    React.createElement('span', { className: 'dshWorkKnowledgeIcon' }, icon('book')),
                    React.createElement('span', { className: 'dshWorkResourceName', title: space.name }, space.name),
                    React.createElement('time', { className: 'dshWorkKnowledgeModified', dateTime: validDate ? space.updatedAt : undefined }, validDate ? date.toLocaleDateString() : '—'))
                }))
              })),
            draft.length >= 50 && React.createElement('p', { role: 'status' }, t('limit'))),
          React.createElement('footer', { className: 'dshWorkKnowledgeFooter' },
            React.createElement('span', { className: 'dshWorkSelectionCount', 'aria-live': 'polite' }, t('selected', { count: draft.length })),
            React.createElement(Button, { variant: 'outline', className: 'dshWorkKnowledgeCancel', disabled: saving, onClick: close }, t('cancel')),
            React.createElement(Button, { variant: 'primary', className: 'dshWorkKnowledgeConfirm', disabled: loading || saving || Boolean(error), onClick: () => commit(draft) }, t('confirm')))))
    }

    function installWorkResources(ctx) {
      const controls = new Map()
      const ensureSession = (sessionId, signal) => ctx.sessions.using(sessionId, { source: 'workResources', signal }, async () => undefined)
      const knowledge = createWorkKnowledgeComposer({ ensureSession, request: workResourceRequest, inputFor: sessionId => {
        const scope = ctx.sessions.scope(sessionId)
        if (!scope) throw new Error('Work task changed.')
        return { scope, input: ctx.conversation.input.for(scope) }
      } })
      ctx.effect(() => ctx.inputTriggers.registerSource(knowledge.source), 'desktop knowledge references')
      ctx.effect(() => ctx.inputTriggers.registerSource(skillReferenceSource), 'desktop skill references')
      ctx.effect(() => ctx.inputTriggers.registerSource(toolReferenceSource), 'desktop tool references')
      ctx.on('conversation/input-before-submit', knowledge.prepare)
      ctx.effect(() => ctx.locale.register(RESOURCE_NS, RESOURCE_COPY), 'desktop Work resources locale')
      const t = ctx.locale.bind(RESOURCE_NS)
      const available = session => ctx.sessions.subagentAddress(session.sessionId) === undefined
      ctx.commandUi.register({ name: 'skills', label: () => t('skills'), description: () => t('skillsHint'), icon: props => React.createElement(ResourceIcon, { ...props, id: 'skills' }), available,
        ui: { kind: 'popupSelect', searchMode: 'fuzzy-label',
          options: ({ sessionId }, signal) => ctx.sessions.using(sessionId, { source: 'workSkillPicker', signal }, async () => {
            const catalog = await workSkillRequest({ operation: 'catalog' }, signal)
            const labels = new Map(catalog.skills.map(skill => [skill.name, skill.displayName]))
            const result = await ctx.remote.skills.list({ sessionId }, signal)
            if (!result.ok) throw new Error(result.error.message)
            return result.value.skills.map(skill => ({
              id: JSON.stringify({ name: skill.name, label: labels.get(skill.name) || skill.name, enterprise: labels.has(skill.name) }),
              label: labels.get(skill.name) || skill.name,
              badgeIcon: labels.has(skill.name) ? props => React.createElement(ResourceIcon, { ...props, id: 'skills', size: 12 }) : undefined,
              detail: skill.description
            }))
          }),
          onSelect: (option, { sessionId }) => {
            const scope = ctx.sessions.scope(sessionId)
            if (!scope) throw new Error('Work task changed.')
            const input = ctx.conversation.input.for(scope)
            scope.bail(scope, 'slash/input-consume-token', { guard: { kind: 'bare-token', token: '/skills' } })
            const state = input.state.getSnapshot()
            const applied = input.insertReference({ source: SKILL_REFERENCE_SOURCE, appearance: 'skill', ref: option.id, label: option.label, clipboardText: `/${option.label}` }, { start: 0, end: 0, draftRev: state.draftRev })
            if (!applied) throw new Error('Finish editing the current command, then choose a skill.')
          }
        } })
      ctx.commandUi.register({ name: 'tools', label: () => t('tools'), description: () => t('toolsHint'), icon: props => React.createElement(ResourceIcon, { ...props, id: 'tools' }), available,
        ui: { kind: 'popupSelect', searchMode: 'fuzzy-label',
          options: async (_session, signal) => {
            const catalog = await workToolRequest({ operation: 'catalog' }, signal)
            return catalog.tools.map(tool => ({ id: JSON.stringify({ name: tool.name, label: tool.label, connectionKey: catalog.connectionKey }), label: tool.label, detail: tool.description }))
          },
          onSelect: (option, { sessionId }) => {
            const scope = ctx.sessions.scope(sessionId)
            if (!scope) throw new Error('Work task changed.')
            const input = ctx.conversation.input.for(scope)
            scope.bail(scope, 'slash/input-consume-token', { guard: { kind: 'bare-token', token: '/tools' } })
            const state = input.state.getSnapshot()
            if (state.occurrences.some(item => item.source === TOOL_REFERENCE_SOURCE && decodeToolReference(item.ref).name === decodeToolReference(option.id).name)) return
            if (!input.insertReference({ source: TOOL_REFERENCE_SOURCE, appearance: 'tool', ref: option.id, label: option.label, clipboardText: `/${option.label}` }, { start: 0, end: 0, draftRev: state.draftRev })) throw new Error('Finish editing the current command, then choose a tool.')
          }
        } })
      ctx.commandUi.register({ name: 'knowledge', label: () => t('knowledge'), description: () => t('knowledgeHint'), icon: props => React.createElement(ResourceIcon, { ...props, id: 'knowledge' }), available,
        ui: { kind: 'action', run: ({ sessionId }) => controls.get(sessionId)?.open() } })
      ctx.slots.inject('conversation.input.accessory', () => ctx.slots.register({ name: 'conversation.input.accessory', id: 'desktop-work-resources', order: 20, inject: sessionId => ({ sessionId, controls, t, knowledge }) }, WorkResourceAccessory))
      ctx.effect(() => {
        if (document.getElementById('desktop-work-resources-style')) return
        const style = document.createElement('style')
        style.dataset.plugin = 'dsh-desktop-client-ui'
        style.id = 'desktop-work-resources-style'
        // Match the Chat KnowledgeSpaceDialog layout using the native Work modal's focus and dismissal handling.
        style.textContent = `
          .dshWorkKnowledgeDialog{width:min(600px,100%);max-height:100%;padding:0;gap:0;border:1px solid var(--dsw-alias-border-l2);border-radius:16px;background:var(--dsw-alias-bg-layer-2);font-size:14px;line-height:20px}
          .dshWorkKnowledgeHeader{height:56px;flex:none;display:flex;align-items:center;justify-content:space-between;padding:0 16px}
          .dshWorkKnowledgeHeader h2{margin:0;font-size:16px;line-height:24px;font-weight:600}
          .dshWorkKnowledgeHeader button{display:grid;place-items:center;width:28px;height:28px;border:0;border-radius:6px;background:transparent;color:var(--dsw-alias-label-tertiary);cursor:pointer}
          .dshWorkKnowledgeHeader button:hover{background:var(--dsw-alias-interactive-bg-hover)}
          .dshWorkKnowledgeBody{padding:0 16px;min-height:0;overflow:auto}
          .dshWorkKnowledgeSearchField{position:relative;display:flex;align-items:center;color:var(--dsw-alias-label-tertiary)}
          .dshWorkKnowledgeSearchField>svg{position:absolute;left:12px;pointer-events:none}
          .dshWorkKnowledgeSearch{box-sizing:border-box;width:100%;height:32px;padding:5px 12px 5px 36px;border:1px solid var(--dsw-alias-border-l2);border-radius:6px;background:transparent;color:var(--dsw-alias-label-primary);font:inherit}
          .dshWorkKnowledgeSearch::placeholder{color:var(--dsw-alias-label-tertiary)}
          .dshWorkKnowledgeColumns{display:flex;justify-content:space-between;margin-top:20px;padding:0 8px 10px;color:var(--dsw-alias-label-tertiary);font-size:12px;border-bottom:1px solid var(--dsw-alias-border-l2)}
          .dshWorkKnowledgeList{height:min(440px,48vh);flex:none;overflow:auto;margin-top:8px}
          .dshWorkKnowledgeList section{margin-bottom:16px}
          .dshWorkKnowledgeList h3{margin:0 0 8px;font-size:12px;line-height:20px;font-weight:400;color:var(--dsw-alias-label-tertiary)}
          .dshWorkKnowledgeRow{box-sizing:border-box;display:flex;align-items:center;gap:12px;min-height:60px;padding:12px 8px;border-radius:8px;border-bottom:1px solid var(--dsw-alias-border-l2);cursor:pointer;min-width:0}
          .dshWorkKnowledgeRow:hover,.dshWorkKnowledgeRow[data-selected=true]{background:var(--dsw-alias-interactive-bg-hover)}
          .dshWorkKnowledgeRow input{appearance:none;flex:none;width:16px;height:16px;margin:0;border:1px solid var(--dsw-alias-border-l2);border-radius:4px;background:transparent;cursor:pointer}
          .dshWorkKnowledgeRow input:checked{background:var(--dsw-alias-state-business-primary);border-color:var(--dsw-alias-state-business-primary);background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath d='m3 8 3 3 7-7' fill='none' stroke='white' stroke-width='2'/%3E%3C/svg%3E")}
          .dshWorkKnowledgeRow input:disabled{opacity:.4;cursor:default}
          .dshWorkKnowledgeIcon{box-sizing:border-box;display:grid;place-items:center;flex:none;width:32px;height:36px;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;color:var(--dsw-alias-label-secondary)}
          .dshWorkResourceName{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--dsw-alias-label-primary)}
          .dshWorkKnowledgeModified{flex:none;font-size:12px;color:var(--dsw-alias-label-tertiary)}
          .dshWorkKnowledgeFooter{display:flex;align-items:center;gap:12px;flex:none;padding:16px}
          .dshWorkSelectionCount{margin-right:auto;color:var(--dsw-alias-label-tertiary)}
          .dshWorkKnowledgeFooter button{height:32px;padding:0 16px;border-radius:6px;font:inherit;white-space:nowrap}
          .dshWorkKnowledgeCancel{background:var(--dsw-alias-interactive-bg-hover);border-color:var(--dsw-alias-border-l2);color:var(--dsw-alias-label-primary)}
          .dshWorkKnowledgeConfirm{background:var(--dsw-alias-state-business-primary);color:var(--dsw-alias-label-primary-foreground);border:1px solid var(--dsw-alias-state-business-primary)}
          .dshWorkKnowledgeConfirm:hover:not(:disabled){background:color-mix(in srgb,var(--dsw-alias-state-business-primary) 88%,var(--dsw-alias-label-primary))}
          .dshWorkKnowledgeConfirm:disabled{opacity:.5}
          .dshWorkResourceError{padding:8px 12px;color:var(--dsw-alias-state-error-primary);font-size:12px}
          @media(max-width:1023px){.dshWorkKnowledgeDialog{width:min(400px,100%)}}
          @media(max-width:575px){.dshWorkKnowledgeModified{max-width:80px}.dshWorkKnowledgeFooter{flex-wrap:wrap}.dshWorkSelectionCount{flex:1 0 100%}}
        `
        document.head.appendChild(style)
        return () => style.remove()
      })
    }

    /** Consume successful-turn facts independently of the selected conversation and animation frames. */
    function installWorkCompletionNotifications(ctx, navigation) {
      const bridge = window.dshDesktopNotifications
      if (!bridge) return
      ctx.effect(() => {
        const observed = new Map()
        const startedAt = Date.now()
        const report = () => {
          const list = ctx.sessions.list.getSnapshot()
          // Completion projections arrive independently of catalog metadata. Work
          // notifications follow those facts even while the catalog loads or fails.
          for (const [id, projection] of Object.entries(list.projectionsBySession)) {
            const completion = projection.values.desktopWorkCompletion
            if (!completion) continue
            const previous = observed.get(id)
            observed.set(id, Math.max(previous ?? 0, completion.count))
            // Baselines carry history. A first read can also contain a fast task completed since subscription.
            if (previous === undefined ? completion.count === 0 || completion.time < startedAt : completion.count <= previous) continue
            void bridge.completed({ sessionId: id, turn: completion.turn, seq: completion.seq,
              count: previous === undefined ? 1 : completion.count - previous }).catch(error => {
              console.error('[desktop-notification] completion delivery failed', error)
            })
          }
        }
        const unsubscribe = ctx.sessions.list.subscribe(report)
        report()
        const unclick = bridge.onClicked(sessionId => {
          navigation.select('work')
          ctx.uiWorkspace.openSession(sessionId)
        })
        return () => { unsubscribe(); unclick(); observed.clear() }
      })
    }


    const inject = ['slots', 'locale', 'remote', 'remote.session', 'sessions', 'uiWorkspace', 'layout']
    function apply(ctx) {
      ctx.effect(() => ctx.locale.register(DELETE_SESSION_NS, {
        zh: {
          menu: '永久删除会话', title: '删除会话', close: '关闭', cancel: '取消', confirm: '删除会话',
          description: '确定删除“{name}”？工作区文件会保留。此操作无法撤销。',
          pending: '正在删除会话…', failed: '删除失败，请重试。'
        },
        en: {
          menu: 'Delete session permanently', title: 'Delete session', close: 'Close', cancel: 'Cancel', confirm: 'Delete session',
          description: 'Delete “{name}”? Workspace files are kept. This can’t be undone.',
          pending: 'Deleting session…', failed: 'Deletion failed. Please try again.'
        }
      }))
      const deletion = createSessionDeletion((sessionId) => {
        const workspace = ctx.get('uiWorkspace')
        if (!workspace) throw new Error('Workspace navigation is unavailable')
        return workspace.deleteSession(sessionId)
      })
      ctx.effect(() => () => deletion.dispose())
      const deletionText = ctx.locale.bind(DELETE_SESSION_NS)
      ctx.slots.inject('shell.overlay', () => ctx.slots.register({
        name: 'shell.overlay', id: 'desktop-delete-session-dialog', locale: DELETE_SESSION_NS,
        inject: () => ({ deletion, t: deletionText })
      }, DeleteSessionDialog))
      const navigation = installDesktopModes(ctx)
      installWorkCompletionNotifications(ctx, navigation)
      if (typeof ctx.inject === 'function') ctx.inject(['desktopWorkbenches'], scoped => {
        scoped.effect(() => navigation.bindWorkbench(scoped.desktopWorkbenches))
      })
      if (typeof ctx.inject === 'function') ctx.inject(['uiConversation'], installWorkToolMessages)
      if (typeof ctx.inject === 'function') ctx.inject(['commandUi', 'inputTriggers', 'conversation', 'remote.skills'], installWorkResources)
      // `remote` and `remote.session` are separate inject names. Reading
      // `ctx.remote` without declaring `remote` throws and unmounts this slot.
      const remote = ctx.remote
      const locale = ctx.locale
      ctx.effect(() => locale.register(LOCAL_OPEN_NS, LOCAL_OPEN_COPY), 'desktop local open locale')
      applyRepair(ctx)
      ctx.effect(() => ctx.locale.register(ACTIONS_NS, actionMessages))
      const actionText = ctx.locale.bind(ACTIONS_NS)
      ctx.effect(() => {
        const id = 'dsh-desktop-preset-toolbar-style'
        let style = document.getElementById(id)
        if (!style || style.tagName !== 'STYLE') {
          style = document.createElement('style')
          style.dataset.plugin = 'dsh-desktop-client-ui'
          style.id = id
        }
        style.textContent = `
          [data-dsh-sidebar-brand-identity] { display:none !important; }
          /* Third-party plugins (dshmarket, dsh-better-sidebar) draw custom icons via ::before on settings nav rows,
             expecting direct > svg to hide the fallback gear. In 0.2.2-rc.1, navIcon wraps the fallback in a span,
             so ensure the fallback gear container is hidden when custom nav marker is present. */
          [data-dsh-market-nav-icon] span[class*="navIcon"],
          [data-dsh-market-nav-icon] svg,
          [data-dsh-better-sidebar-settings-nav] span[class*="navIcon"],
          [data-dsh-better-sidebar-settings-nav] svg { display:none !important; }
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
          [data-textpreview-open-local-wrap] {
            display:flex; flex-direction:column; align-items:center; gap:8px;
            min-width:0; max-width:100%;
          }
          [data-textpreview-open-local] {
            box-sizing:border-box; appearance:none; -webkit-appearance:none;
            display:inline-grid; place-items:center;
            height:36px; margin:0; padding:6px 14px;
            border:.5px solid var(--dsw-alias-border-l2); border-radius:var(--dsw-radius-md);
            background:var(--dsw-alias-bg-base); color:var(--dsw-alias-label-primary);
            font-family:var(--dsw-font-family); font-size:14px; line-height:20px;
            white-space:nowrap; cursor:pointer;
          }
          [data-textpreview-open-local] > span { grid-area:1 / 1; }
          [data-textpreview-open-local-sizer] { visibility:hidden; }
          [data-textpreview-open-local]:hover:not(:disabled),
          [data-textpreview-open-local]:focus:not(:disabled) {
            background:var(--dsw-alias-interactive-bg-hover);
          }
          [data-textpreview-open-local]:focus-visible {
            outline:2px solid var(--dsw-alias-label-primary); outline-offset:2px;
          }
          [data-textpreview-open-local]:disabled { cursor:default; }
          [data-textpreview-open-local-feedback] {
            margin:0; max-width:100%; color:var(--dsw-alias-label-secondary);
            font-size:12px; line-height:1.5; text-align:center; overflow-wrap:anywhere;
          }
          [data-textpreview-open-local-feedback][data-kind='error'] {
            color:var(--dsw-alias-state-error-primary);
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
              { name: 'conversation.hero.brand.mark', inject: () => ({ navigation }) },
              ConversationBrandMark
            )
          })
        )
      )
      ctx.slots.inject('conversation.hero.brand.title', () => ctx.slots.register({ name: 'conversation.hero.brand.title', inject: () => ({ navigation, t: ctx.locale.bind(MODES_NS) }) }, ConversationBrandTitle))
      ctx.slots.inject('sidebar.right.tab.document.unpreviewable', () =>
        ctx.slots.register({
          name: 'sidebar.right.tab.document.unpreviewable',
          id: 'desktop-open-local',
          locale: LOCAL_OPEN_NS,
          inject: () => ({
            t: locale.bind(LOCAL_OPEN_NS),
            openWorkspacePath: (request) => remote.session.openWorkspacePath(request)
          })
        }, OpenUnpreviewableFile)
      )
      ctx.slots.inject('sidebar.workspaces.session.menu.item', () =>
        ctx.slots.register({
          name: 'sidebar.workspaces.session.menu.item',
          id: 'desktop-delete-session',
          order: 900,
          locale: DELETE_SESSION_NS,
          inject: () => ({ deletion, t: deletionText })
        }, DeleteSessionMenuItem)
      )
      ctx.slots.inject('sidebar.workspaces.session.menu.item', () =>
        ctx.slots.register({
          name: 'sidebar.workspaces.session.menu.item',
          id: 'desktop-open-session-folder', locale: ACTIONS_NS,
          order: 800,
          inject: () => ({
            t: actionText,
            openInFinder: (sessionId) => {
              const cwd = ctx.get('sessions').list.getSnapshot().byId[sessionId]?.cwd
              if (!cwd) throw new Error(actionText('directoryUnavailable'))
              return window.dshDesktop.openInFinder(cwd)
            }
          })
        }, OpenSessionFolderMenuItem)
      )
      ctx.slots.inject('sidebar.workspaces.session.menu.item', () =>
        ctx.slots.register({
          name: 'sidebar.workspaces.session.menu.item',
          id: 'desktop-unread-session', locale: ACTIONS_NS,
          inject: () => ({ t: actionText }),
          order: 350
        }, UnreadSessionMenuItem)
      )
    }

    exports.createWorkKnowledgeComposer = createWorkKnowledgeComposer
    exports.skillReferenceSource = skillReferenceSource
    exports.toolReferenceSource = toolReferenceSource
    exports.apply = apply
    exports.installWorkCompletionNotifications = installWorkCompletionNotifications
    exports.inject = inject
    return module.exports
  }
})
