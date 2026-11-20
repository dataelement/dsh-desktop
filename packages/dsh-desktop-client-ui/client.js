window.__ModuleLoader__.load({
  id: 'dsh-desktop-client-ui',
  factory: (require) => {
    const module = { exports: {} }
    const exports = module.exports
    Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' })

    const React = require('react')
    const { BrandWordmark, FishLogo, MenuItemButton, Tooltip } = require('@deepseek-ai/dsh-client-ui-primitives')


    // Small presentation-only primitives shared by PPT and native Office templates.
    // Callers own file import, persistence, translations and template state.
    const templateElement = React.createElement
    function TemplateIcon({ name }) {
      const paths = name === 'create' ? ['m4 20 11-11 3 3L7 23z', 'm14 10 3 3', 'M6 3v4M4 5h4M18 2v4M16 4h4M21 8v4M19 10h4']
        : name === 'edit' ? ['m15 4 5 5', 'M4 20l4-1L20 7a2.8 2.8 0 0 0-4-4L4 15z']
        : name === 'delete' ? ['M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7'] : ['m6 6 12 12M6 18 18 6']
      return templateElement('svg', { width: name === 'create' ? 28 : 16, height: name === 'create' ? 28 : 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.65, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true },
        ...paths.map((d, key) => templateElement('path', { key, d })))
    }
    function TemplateCreateButton({ label, hint, disabled, onClick }) {
      return templateElement('button', { type: 'button', className: 'dsh-template-create', disabled, title: hint, onClick }, templateElement(TemplateIcon, { name: 'create' }), templateElement('span', null, label))
    }
    function TemplateCardActions({ busy, editLabel, deleteLabel, onEdit, onDelete }) {
      return templateElement('div', { className: 'dsh-template-actions' },
        templateElement('button', { type: 'button', disabled: busy, title: editLabel, 'aria-label': editLabel, onClick: onEdit }, templateElement(TemplateIcon, { name: 'edit' })),
        templateElement('button', { type: 'button', disabled: busy, title: deleteLabel, 'aria-label': deleteLabel, onClick: onDelete }, templateElement(TemplateIcon, { name: 'delete' })))
    }
    function TemplateManagementDialog({ deleting, name, description, onNameChange, onDescriptionChange, onSave, onDelete, onRequestDelete, onClose, onCancelDelete, busy, error, t }) {
      const dialog = React.useRef(null), first = React.useRef(null), title = React.useId()
      React.useLayoutEffect(() => {
        const node = dialog.current
        node.showModal(); first.current?.focus()
        return () => { if (node.open) node.close() }
      }, [])
      React.useLayoutEffect(() => { first.current?.focus() }, [deleting])
      const close = () => { if (!busy) onClose() }
      const button = (label, onClick, props = {}) => templateElement('button', { type: 'button', disabled: busy, onClick, ...props }, label)
      return templateElement('dialog', { ref: dialog, className: 'dsh-template-dialog', 'aria-modal': true, 'aria-labelledby': title,
        onCancel: event => { event.preventDefault(); close() },
        onClick: event => {
          if (event.target !== event.currentTarget) return
          const rect = event.currentTarget.getBoundingClientRect()
          if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) close()
        },
        onKeyDown: event => {
          if (event.key !== 'Tab') return
          const fields = [...event.currentTarget.querySelectorAll('button:not(:disabled),input:not(:disabled),textarea:not(:disabled)')]
          const first = fields[0], last = fields.at(-1)
          if (!first) { event.preventDefault(); return }
          if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
          else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
        } },
        templateElement('header', null, templateElement('h2', { id: title }, t(deleting ? 'deleteTitle' : 'editTitle')),
          templateElement('button', { type: 'button', className: 'dsh-template-close', disabled: busy, 'aria-label': t('close'), onClick: close }, templateElement(TemplateIcon, { name: 'close' }))),
        deleting ? templateElement('div', { className: 'dsh-template-fields' },
          templateElement('p', { className: 'dsh-template-delete-copy' },
            templateElement('bdi', null, name), templateElement('br'), t('deleteHint')),
          error ? templateElement('div', { role: 'alert', className: 'dsh-template-error' }, error) : null,
          templateElement('footer', null, button(t('cancel'), onCancelDelete ?? close, { ref: first }), button(t(busy ? 'processing' : 'confirmDelete'), onDelete)))
        : templateElement('form', { 'aria-busy': busy, onSubmit: event => { event.preventDefault(); if (!busy && name.trim()) onSave() } },
          templateElement('label', null, t('name'), templateElement('input', { ref: first, value: name, maxLength: 80, required: true, disabled: busy, autoComplete: 'off', onChange: event => onNameChange(event.target.value) })),
          templateElement('label', null, t('description'), templateElement('textarea', { value: description, maxLength: 1000, disabled: busy, placeholder: t('descriptionPlaceholder'), onChange: event => onDescriptionChange(event.target.value) })),
          error ? templateElement('div', { role: 'alert', className: 'dsh-template-error' }, error) : null,
          templateElement('footer', null, button(t('delete'), onRequestDelete), templateElement('button', { type: 'submit', disabled: busy || !name.trim() }, t(busy ? 'processing' : 'update')))))
    }
    const templateControlsCss = `
.dsh-template-create{box-sizing:border-box;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;aspect-ratio:16/9;width:100%;padding:20px;border:2px solid transparent;border-radius:14px;background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-secondary);font:inherit;font-size:13px;cursor:pointer;transition:background .15s,color .15s}
.dsh-template-create:hover{background:color-mix(in srgb,var(--dsw-alias-label-primary) 10%,var(--dsw-alias-bg-base));color:var(--dsw-alias-label-primary)}
.dsh-template-create:disabled{opacity:.55;cursor:default}
.dsh-template-actions{position:absolute;top:8px;right:8px;display:flex;gap:4px;z-index:2;opacity:0;pointer-events:none;transition:opacity .12s}
[data-template-card]:hover .dsh-template-actions,[data-template-card]:focus-within .dsh-template-actions{opacity:1;pointer-events:auto}
.dsh-template-actions button{display:grid;place-items:center;width:28px;height:28px;padding:0;border:1px solid color-mix(in srgb,var(--dsw-alias-label-primary-foreground) 15%,transparent);border-radius:7px;background:color-mix(in srgb,var(--dsw-alias-label-primary) 80%,transparent);color:var(--dsw-alias-label-primary-foreground);cursor:pointer;backdrop-filter:blur(8px)}
.dsh-template-actions button:hover{background:var(--dsw-alias-label-primary)}.dsh-template-actions button:disabled{opacity:.5;cursor:default}
.dsh-template-dialog{box-sizing:border-box;width:min(560px,calc(100vw - 40px));max-height:calc(100dvh - 48px);margin:auto;padding:26px;border:1px solid var(--dsw-alias-border-l2-darkmode-thin);border-radius:20px;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);font:inherit;box-shadow:0 24px 80px color-mix(in srgb,var(--dsw-alias-label-primary) 20%,transparent);overflow-y:auto;overscroll-behavior:contain}
.dsh-template-dialog::backdrop{background:color-mix(in srgb,var(--dsw-alias-label-primary) 50%,transparent)}
.dsh-template-dialog header{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:26px}.dsh-template-dialog h2{margin:0;font-size:18px;line-height:26px;font-weight:600}
.dsh-template-dialog .dsh-template-close{display:grid;place-items:center;flex:none;width:28px;height:28px;padding:0;border:0;border-radius:7px;background:transparent;color:var(--dsw-alias-label-secondary);cursor:pointer}
.dsh-template-dialog form,.dsh-template-fields{display:grid;gap:22px}.dsh-template-dialog label{display:grid;gap:9px;color:var(--dsw-alias-label-secondary);font-size:14px;line-height:20px}
.dsh-template-dialog input,.dsh-template-dialog textarea{box-sizing:border-box;width:100%;margin:0;padding:12px 14px;border:1px solid transparent;border-radius:12px;background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary);font:inherit;font-size:14px;line-height:21px}.dsh-template-dialog textarea{min-height:112px;resize:vertical;max-height:260px}.dsh-template-dialog input::placeholder,.dsh-template-dialog textarea::placeholder{color:var(--dsw-alias-label-tertiary)}
.dsh-template-dialog footer{display:flex;align-items:center;justify-content:flex-end;gap:10px;margin-top:4px}.dsh-template-dialog footer button{min-height:38px;padding:8px 16px;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);border-radius:10px;font:inherit;font-size:14px;line-height:20px;cursor:pointer;transition:transform 120ms cubic-bezier(.23,1,.32,1)}
.dsh-template-dialog :disabled{cursor:default;opacity:.55}.dsh-template-delete-copy{margin:0 0 26px;color:var(--dsw-alias-label-secondary);font-size:14px;line-height:1.65;overflow-wrap:anywhere}.dsh-template-error{margin:0;padding:10px 12px;border-radius:10px;background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary);font-size:13px;white-space:pre-wrap;overflow-wrap:anywhere}
.dsh-template-create:focus-visible,.dsh-template-actions button:focus-visible,.dsh-template-dialog :is(button,input,textarea):focus-visible{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:2px}
@media(hover:none){.dsh-template-actions{opacity:1;pointer-events:auto}}@media(hover:hover) and (pointer:fine){.dsh-template-dialog button:hover:not(:disabled){filter:brightness(.94)}.dsh-template-dialog .dsh-template-close:hover{background:var(--dsw-alias-interactive-bg-hover)}}@media(prefers-reduced-motion:reduce){.dsh-template-create,.dsh-template-actions,.dsh-template-dialog footer button{transition:none}}
`
    const TemplateLibraryControls = { CreateButton: TemplateCreateButton, CardActions: TemplateCardActions, ManagementDialog: TemplateManagementDialog }

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

    function DeleteSessionMenuItem({ sessionId, displayTitle, useMenuOpenState, deleteSession, t }) {
      const [, setMenuOpen] = useMenuOpenState()
      const label = t('deleteSession')
      const warning = t('deleteWarning', { title: displayTitle || sessionId })
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
        deleteSession: '永久删除会话',
        deleteWarning: '确定删除“{title}”？工作区文件会保留。此操作无法撤销。',
        openFolder: '在文件管理器中打开',
        markRead: '标为已读',
        markUnread: '标为未读',
        workspaceUnavailable: '工作区导航不可用',
        directoryUnavailable: '会话工作区目录不可用'
      },
      en: {
        deleteSession: 'Delete session permanently',
        deleteWarning: 'Delete “{title}”? Workspace files are kept. This can’t be undone.',
        openFolder: 'Open in file manager',
        markRead: 'Mark as read',
        markUnread: 'Mark as unread',
        workspaceUnavailable: 'Workspace navigation is unavailable',
        directoryUnavailable: 'Session workspace directory is unavailable'
      },
      ja: {
        deleteSession: 'セッションを完全に削除',
        deleteWarning: '「{title}」を削除しますか？ワークスペースのファイルは保持されます。この操作は取り消せません。',
        openFolder: 'ファイルマネージャーで開く',
        markRead: '既読にする',
        markUnread: '未読にする',
        workspaceUnavailable: 'ワークスペースのナビゲーションを利用できません',
        directoryUnavailable: 'セッションのワークスペースディレクトリを利用できません'
      },
      es: {
        deleteSession: 'Eliminar sesión permanentemente',
        deleteWarning: '¿Eliminar «{title}»? Se conservan los archivos del espacio de trabajo. No se puede deshacer.',
        openFolder: 'Abrir en el administrador de archivos',
        markRead: 'Marcar como leído',
        markUnread: 'Marcar como no leído',
        workspaceUnavailable: 'La navegación del espacio de trabajo no está disponible',
        directoryUnavailable: 'El directorio de la sesión no está disponible'
      },
      fr: {
        deleteSession: 'Supprimer définitivement la session',
        deleteWarning: 'Supprimer « {title} » ? Les fichiers de l’espace de travail sont conservés. Cette action est irréversible.',
        openFolder: 'Ouvrir dans le gestionnaire de fichiers',
        markRead: 'Marquer comme lu',
        markUnread: 'Marquer comme non lu',
        workspaceUnavailable: 'La navigation de l’espace de travail est indisponible',
        directoryUnavailable: 'Le dossier de la session est indisponible'
      },
      de: {
        deleteSession: 'Sitzung endgültig löschen',
        deleteWarning: '„{title}“ löschen? Die Arbeitsbereichsdateien bleiben erhalten. Dies kann nicht rückgängig gemacht werden.',
        openFolder: 'Im Dateimanager öffnen',
        markRead: 'Als gelesen markieren',
        markUnread: 'Als ungelesen markieren',
        workspaceUnavailable: 'Arbeitsbereichsnavigation ist nicht verfügbar',
        directoryUnavailable: 'Das Arbeitsbereichsverzeichnis der Sitzung ist nicht verfügbar'
      },
      ru: {
        deleteSession: 'Удалить сеанс навсегда',
        deleteWarning: 'Удалить «{title}»? Файлы рабочей области сохранятся. Это действие нельзя отменить.',
        openFolder: 'Открыть в файловом менеджере',
        markRead: 'Отметить как прочитанное',
        markUnread: 'Отметить как непрочитанное',
        workspaceUnavailable: 'Навигация по рабочей области недоступна',
        directoryUnavailable: 'Каталог рабочей области сеанса недоступен'
      },
      pt: {
        deleteSession: 'Excluir sessão permanentemente',
        deleteWarning: 'Excluir “{title}”? Os arquivos do espaço de trabalho serão mantidos. Não é possível desfazer.',
        openFolder: 'Abrir no gerenciador de arquivos',
        markRead: 'Marcar como lida',
        markUnread: 'Marcar como não lida',
        workspaceUnavailable: 'A navegação do espaço de trabalho está indisponível',
        directoryUnavailable: 'O diretório da sessão está indisponível'
      }
    }

    const ENTERPRISE_NS = 'dsh-desktop-enterprise-entry'
    function EnterpriseEntry({ t }) {
      return React.createElement('a', {
        href: 'https://dshdesktop.com/zh/enterprise/', target: '_blank', rel: 'noopener noreferrer',
        'data-dsh-enterprise-entry': true
      }, t('learnMore'), React.createElement('span', { 'aria-hidden': true }, ' ↗'))
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
        }, React.createElement('button', {
          type: 'button', disabled: busy,
          'aria-label': t(busy ? 'opening' : 'open'), 'aria-description': t('description'), 'data-dsh-repair-entry': true,
          onClick: () => { void open(() => bridge.openRepairAgent()) }
        }, icon('repair'))),
        typeof bridge.openMobilePairing === 'function' && (wide || connected) && React.createElement('button', {
          type: 'button', disabled: busy, title: t(connected ? 'phoneManage' : 'phone'),
          'aria-label': t(connected ? 'phoneManage' : 'phone'), 'data-dsh-mobile-entry': true,
          onClick: () => { void open(() => bridge.openMobilePairing()) }
        }, icon('phone'), connected && React.createElement('span', { 'data-connected': true, 'aria-hidden': true })),
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

    // Ordinary http(s) clicks inside a conversation follow Settings → General → link opening.
    // Links outside that conversation, modifier clicks, the middle button, and explicit window.open stay with the browser.
    function readHttpLink(value, baseHref) {
      if (typeof value !== 'string' || value === '') return undefined
      try {
        const url = new URL(value, baseHref)
        if (url.protocol !== 'http:' && url.protocol !== 'https:') return undefined
        if (url.username !== '' || url.password !== '') return undefined
        return url.href
      } catch {
        return undefined
      }
    }

    function configuredLinkDestination(linkOpening, browserAvailable) {
      const opening = linkOpening === 'new-tab' ? 'new-tab' : 'sidebar'
      return opening === 'sidebar' && browserAvailable ? 'sidebar' : 'external'
    }

    function linkClickFollowsSetting(event, baseHref) {
      if (event.defaultPrevented || event.button !== 0) return undefined
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return undefined
      const target = event.target
      const anchor = target !== null && typeof target === 'object' && typeof target.closest === 'function'
        ? target.closest('a[href]')
        : undefined
      if (anchor === undefined || anchor === null || anchor.hasAttribute('download')) return undefined
      return readHttpLink(anchor.getAttribute('href'), baseHref)
    }

    function conversationSessionId(event) {
      const target = event.target
      const root = target !== null && typeof target === 'object' && typeof target.closest === 'function'
        ? target.closest('[data-conversation-session]')
        : undefined
      if (root === undefined || root === null || typeof root.getAttribute !== 'function') return undefined
      const sessionId = root.getAttribute('data-conversation-session')
      return typeof sessionId === 'string' && sessionId !== '' ? sessionId : undefined
    }

    function installConfiguredLinkClicks(ctx) {
      const forms = ctx.configForms
      const sidebar = ctx.sidebarRight
      const tabs = ctx.sidebarRightTabs
      if (forms === undefined || typeof forms.get !== 'function'
        || sidebar === undefined || typeof sidebar.openTabIn !== 'function'
        || tabs === undefined || typeof tabs.get !== 'function') return
      const settings = forms.get('ui-chat')
      if (settings === undefined || typeof settings.getSnapshot !== 'function') return
      ctx.effect(() => {
        if (typeof window.addEventListener !== 'function') return
        // Capture runs before a tool-row link stops the bubble, so search and fetch
        // links use the same setting as markdown. Stopping the event keeps chat
        // from opening the same address again and keeps the row from toggling.
        const onClick = (event) => {
          const url = linkClickFollowsSetting(event, window.location.href)
          if (url === undefined) return
          const sessionId = conversationSessionId(event)
          if (sessionId === undefined) return
          const linkOpening = settings.getSnapshot()?.value?.linkOpening
          const destination = configuredLinkDestination(linkOpening, tabs.get('browser') !== undefined)
          event.preventDefault()
          event.stopPropagation()
          if (destination === 'sidebar') {
            sidebar.openTabIn(sessionId, 'browser', { params: { url }, revealIfOpened: false })
            return
          }
          window.open(url, '_blank', 'noopener,noreferrer')
        }
        window.addEventListener('click', onClick, true)
        return () => window.removeEventListener('click', onClick, true)
      })
    }

    const inject = ['locale', 'slots', 'sessions', 'uiWorkspace', 'configForms', 'sidebarRight', 'sidebarRightTabs']
    function apply(ctx) {
      installConfiguredLinkClicks(ctx)
      applyRepair(ctx)
      ctx.effect(() => ctx.locale.register(ACTIONS_NS, actionMessages))
      const actionText = ctx.locale.bind(ACTIONS_NS)
      ctx.effect(() => ctx.locale.register(ENTERPRISE_NS, {
        zh: { learnMore: '了解企业版' }, en: { learnMore: 'Explore Enterprise' },
        ja: { learnMore: 'エンタープライズ版について' }, es: { learnMore: 'Conocer la edición empresarial' },
        fr: { learnMore: 'Découvrir la version entreprise' }, de: { learnMore: 'Enterprise-Version entdecken' },
        ru: { learnMore: 'Корпоративная версия' }, pt: { learnMore: 'Conhecer a versão empresarial' }
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
        style.textContent = `${templateControlsCss}
          [data-dsh-sidebar-brand-identity] { display:none !important; }
          /* Third-party plugins (dshmarket, dsh-better-sidebar) draw custom icons via ::before on settings nav rows
             and expect the fallback gear to disappear. rc.4's official sidebar no longer uses a navIcon class;
             keep both the old span wrapper and a direct svg so either structure stays hidden. */
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
      ctx.slots.inject('sidebar.workspaces.session.menu.item', () =>
        ctx.slots.register({
          name: 'sidebar.workspaces.session.menu.item',
          id: 'desktop-delete-session', locale: ACTIONS_NS,
          order: 900,
          inject: () => ({
            t: actionText,
            deleteSession: (sessionId) => {
              const workspace = ctx.get('uiWorkspace')
              if (!workspace) throw new Error(actionText('workspaceUnavailable'))
              return workspace.deleteSession(sessionId)
            }
          })
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

    exports.TemplateLibraryControls = TemplateLibraryControls
    exports.apply = apply
    exports.inject = inject
    exports.readHttpLink = readHttpLink
    exports.configuredLinkDestination = configuredLinkDestination
    exports.linkClickFollowsSetting = linkClickFollowsSetting
    exports.conversationSessionId = conversationSessionId
    return module.exports
  }
})
