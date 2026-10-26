window.__ModuleLoader__.load({
  id: 'dsh-desktop-multi-account',
  factory: (require) => {
    const module = { exports: {} }
    const exports = module.exports
    Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' })

    const React = require('react')
    const { useEffect, useRef, useState, useSyncExternalStore } = React
    const {
      Button,
      Input,
      Modal,
      SegmentedControl,
      Switch,
      IconUsersOutlineRegular,
      IconPlusOutlineRegular,
      IconTrashOutlineRegular,
      IconEditOutlineRegular,
      IconChevronUpOutlineRegular,
      IconChevronDownOutlineRegular,
      IconChevronRightOutlineRegular,
      IconWarningOutlineRegular
    } = require('@deepseek-ai/dsh-client-ui-primitives')
    const h = React.createElement

    const NS = 'desktop-multi-account'
    const SLOT = 'settings.models.provider-card'
    const STATE_PATH = '/api/desktop-multi-account/state'
    const MUTATE_PATH = '/api/desktop-multi-account/mutate'
    const REGISTRATION_RETRIES = 12
    const REGISTRATION_RETRY_MS = 5000

    const STYLE_ID = 'dsh-desktop-multi-account-style'
    const STYLE = `
      .dshDeskMaCard{margin-top:10px}
      .dshDeskMaCardButton{display:flex;align-items:center;gap:8px;width:100%;box-sizing:border-box;padding:8px 10px;border:1px solid var(--dsw-alias-border-l2);border-radius:10px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-secondary);font:inherit;font-size:13px;line-height:18px;text-align:left;cursor:pointer;transition:background .15s ease,border-color .15s ease,color .15s ease}
      .dshDeskMaCardButton:hover{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary)}
      .dshDeskMaCardButton:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:2px}
      .dshDeskMaCardIcon{flex:none;display:inline-flex;color:var(--dsw-alias-label-tertiary)}
      .dshDeskMaCardText{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      .dshDeskMaCardChevron{flex:none;display:inline-flex;color:var(--dsw-alias-label-tertiary)}
      .dshDeskMaDialog{width:min(640px,100%)}
      .dshDeskMaBody{display:flex;flex-direction:column;gap:18px;max-height:calc(100vh - 220px);overflow-y:auto;padding-right:2px}
      .dshDeskMaSection{display:flex;flex-direction:column;gap:8px}
      .dshDeskMaSectionHead{display:flex;align-items:center;justify-content:space-between;gap:12px}
      .dshDeskMaSectionLabel{font-size:13px;font-weight:600;line-height:18px;color:var(--dsw-alias-label-primary)}
      .dshDeskMaHint{margin:0;font-size:12px;line-height:18px;color:var(--dsw-alias-label-tertiary)}
      .dshDeskMaError{margin:0;font-size:13px;line-height:19px;color:var(--dsw-alias-state-error-primary)}
      .dshDeskMaEmpty{margin:0;font-size:13px;line-height:19px;color:var(--dsw-alias-label-secondary)}
      .dshDeskMaList{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:8px}
      .dshDeskMaRow{border:1px solid var(--dsw-alias-border-l2);border-radius:12px;background:var(--dsw-alias-bg-layer-1);padding:10px 12px}
      .dshDeskMaRowMain{display:flex;align-items:flex-start;gap:10px}
      .dshDeskMaDot{flex:none;width:8px;height:8px;border-radius:50%;margin-top:6px;background:var(--dsw-alias-state-idle-primary)}
      .dshDeskMaDot[data-state="active"]{background:var(--dsw-alias-state-success-primary)}
      .dshDeskMaDot[data-state="error"]{background:var(--dsw-alias-state-warn-primary)}
      .dshDeskMaRowText{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}
      .dshDeskMaRowHead{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
      .dshDeskMaRowLabel{font-size:13px;font-weight:600;line-height:18px;color:var(--dsw-alias-label-primary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:260px}
      .dshDeskMaBadge{font-size:11px;line-height:16px;padding:1px 7px;border-radius:999px;background:var(--dsw-alias-bg-layer-3);color:var(--dsw-alias-label-secondary)}
      .dshDeskMaMeta{font-size:12px;line-height:17px;color:var(--dsw-alias-label-tertiary)}
      .dshDeskMaErrorMeta{display:inline-flex;align-items:center;gap:4px;font-size:12px;line-height:17px;color:var(--dsw-alias-state-warn-primary)}
      .dshDeskMaRowActions{flex:none;display:flex;align-items:center;gap:4px}
      .dshDeskMaIconButton{display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;border:0;border-radius:8px;background:transparent;color:var(--dsw-alias-label-secondary);cursor:pointer;transition:background .15s ease,color .15s ease}
      .dshDeskMaIconButton:hover:not(:disabled){background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary)}
      .dshDeskMaIconButton:disabled{color:var(--dsw-alias-label-dimmed);cursor:default}
      .dshDeskMaIconButton:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:1px}
      .dshDeskMaIconButtonDanger:hover:not(:disabled){color:var(--dsw-alias-state-error-primary)}
      .dshDeskMaEditRow{margin-top:10px;display:flex;flex-direction:column;gap:8px}
      .dshDeskMaEditActions{display:flex;justify-content:flex-end;gap:8px}
      .dshDeskMaConfirmRow{margin-top:10px;display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}
      .dshDeskMaConfirmText{font-size:13px;line-height:18px;color:var(--dsw-alias-label-primary)}
      .dshDeskMaConfirmActions{display:flex;gap:8px}
      .dshDeskMaDangerText{color:var(--dsw-alias-state-error-primary)}
      .dshDeskMaAddForm{display:flex;gap:8px;flex-wrap:wrap}
      .dshDeskMaAddLabel{flex:1 1 150px;min-width:0}
      .dshDeskMaAddKey{flex:2 1 220px;min-width:0}
      .dshDeskMaFooterRow{display:flex;justify-content:flex-start}
      .dshDeskMaSrOnly{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
      @media (prefers-reduced-motion:reduce){.dshDeskMaCardButton,.dshDeskMaIconButton{transition:none}}
      @media (width<=560px){.dshDeskMaRowMain{flex-wrap:wrap}.dshDeskMaRowActions{margin-left:18px}}
    `

    function installStyles() {
      if (document.getElementById(STYLE_ID)) return
      const style = document.createElement('style')
      style.id = STYLE_ID
      style.dataset.plugin = 'dsh-desktop-multi-account'
      style.textContent = STYLE
      document.head.appendChild(style)
    }

    // ---------- locale dictionaries (identical keys in every language) ----------

    const en = {
      close: 'Close',
      accounts: 'Accounts',
      manageAccountsFor: 'Manage accounts for {provider}',
      dialogTitle: 'Accounts · {provider}',
      dialogDescription: 'Store several API keys for this provider and choose how the active account changes.',
      credentialRefNote: 'The active key is applied as {ref}.',
      cardEmpty: 'Accounts: not set up',
      cardSummary: '{count} accounts · Active: {active} · {strategy}',
      cardSummaryOne: '1 account · Active: {active} · {strategy}',
      cardNoActive: '{count} accounts · none enabled',
      strategyLabel: 'Switching',
      strategyManual: 'Manual',
      strategyFailover: 'On error',
      strategyRoundRobin: 'Round robin',
      strategyManualHint: 'The active account only changes when you activate another one here.',
      strategyFailoverHint: 'Sticks to the active account. When a request fails because the key is invalid, out of credits, or rate-limited, the next enabled account takes over automatically.',
      strategyRoundRobinHint: 'Every request rotates to the next enabled account. Accounts that fail are skipped just like with “On error”.',
      noAccounts: 'No accounts yet. Add an API key below, or import the key this provider already uses.',
      importCurrent: 'Import current key',
      addAccount: 'Add account',
      labelPlaceholder: 'Label (e.g. Work)',
      keyPlaceholder: 'API key',
      add: 'Add',
      activeBadge: 'Active',
      activate: 'Activate',
      enabledLabel: 'Enable {label}',
      edit: 'Edit {label}',
      save: 'Save',
      cancel: 'Cancel',
      delete: 'Delete {label}',
      deleteConfirm: 'Delete account “{label}”?',
      moveUp: 'Move {label} up',
      moveDown: 'Move {label} down',
      newKeyPlaceholder: 'New API key (leave empty to keep)',
      lastError: 'Last error: {code}',
      lastUsed: 'Last used {date}',
      fingerprintLabel: 'Key #{fingerprint}',
      saved: 'Saved',
      loadFailed: 'Accounts could not be loaded.',
      retry: 'Retry',
      removeAll: 'Remove all accounts',
      removeAllConfirm: 'Remove all accounts for this provider? The provider keeps its current key.',
      confirm: 'Confirm',
      errorDuplicateKey: 'That API key is already stored for this provider.',
      errorInvalidKey: 'Please enter a valid API key.',
      errorNothingToImport: 'No API key is currently stored for this provider.',
      errorNotManageable: 'This provider does not authenticate with an API key.',
      errorGeneric: 'Something went wrong. Please try again.'
    }

    const de = {
      close: 'Schließen',
      accounts: 'Accounts',
      manageAccountsFor: 'Accounts für {provider} verwalten',
      dialogTitle: 'Accounts · {provider}',
      dialogDescription: 'Hinterlege mehrere API-Schlüssel für diesen Provider und lege fest, wie der aktive Account wechselt.',
      credentialRefNote: 'Der aktive Schlüssel wird als {ref} angewendet.',
      cardEmpty: 'Accounts: nicht eingerichtet',
      cardSummary: '{count} Accounts · Aktiv: {active} · {strategy}',
      cardSummaryOne: '1 Account · Aktiv: {active} · {strategy}',
      cardNoActive: '{count} Accounts · keiner aktiviert',
      strategyLabel: 'Wechselstrategie',
      strategyManual: 'Manuell',
      strategyFailover: 'Bei Fehlern',
      strategyRoundRobin: 'Round Robin',
      strategyManualHint: 'Der aktive Account wechselt nur, wenn du hier einen anderen aktivierst.',
      strategyFailoverHint: 'Bleibt beim aktiven Account. Schlägt eine Anfrage fehl, weil der Schlüssel ungültig ist, keine Credits mehr hat oder rate-limitiert wurde, übernimmt automatisch der nächste aktivierte Account.',
      strategyRoundRobinHint: 'Jede Anfrage wechselt zum nächsten aktivierten Account. Fehlschlagende Accounts werden wie bei „Bei Fehlern“ übersprungen.',
      noAccounts: 'Noch keine Accounts. Füge unten einen API-Schlüssel hinzu oder importiere den Schlüssel, den dieser Provider bereits nutzt.',
      importCurrent: 'Aktuellen Schlüssel importieren',
      addAccount: 'Account hinzufügen',
      labelPlaceholder: 'Bezeichnung (z. B. Arbeit)',
      keyPlaceholder: 'API-Schlüssel',
      add: 'Hinzufügen',
      activeBadge: 'Aktiv',
      activate: 'Aktivieren',
      enabledLabel: '{label} aktivieren',
      edit: '{label} bearbeiten',
      save: 'Speichern',
      cancel: 'Abbrechen',
      delete: '{label} löschen',
      deleteConfirm: 'Account „{label}“ löschen?',
      moveUp: '{label} nach oben',
      moveDown: '{label} nach unten',
      newKeyPlaceholder: 'Neuer API-Schlüssel (leer lassen zum Behalten)',
      lastError: 'Letzter Fehler: {code}',
      lastUsed: 'Zuletzt genutzt {date}',
      fingerprintLabel: 'Schlüssel #{fingerprint}',
      saved: 'Gespeichert',
      loadFailed: 'Accounts konnten nicht geladen werden.',
      retry: 'Erneut versuchen',
      removeAll: 'Alle Accounts entfernen',
      removeAllConfirm: 'Alle Accounts dieses Providers entfernen? Der Provider behält seinen aktuellen Schlüssel.',
      confirm: 'Bestätigen',
      errorDuplicateKey: 'Dieser API-Schlüssel ist für diesen Provider bereits gespeichert.',
      errorInvalidKey: 'Bitte einen gültigen API-Schlüssel eingeben.',
      errorNothingToImport: 'Für diesen Provider ist aktuell kein API-Schlüssel gespeichert.',
      errorNotManageable: 'Dieser Provider authentifiziert sich nicht mit einem API-Schlüssel.',
      errorGeneric: 'Etwas ist schiefgelaufen. Bitte erneut versuchen.'
    }

    const zh = {
      close: '关闭',
      accounts: '账户',
      manageAccountsFor: '管理 {provider} 的账户',
      dialogTitle: '账户 · {provider}',
      dialogDescription: '为该提供商保存多个 API 密钥，并选择活动账户的切换方式。',
      credentialRefNote: '活动密钥将作为 {ref} 应用。',
      cardEmpty: '账户：未设置',
      cardSummary: '{count} 个账户 · 活动中：{active} · {strategy}',
      cardSummaryOne: '1 个账户 · 活动中：{active} · {strategy}',
      cardNoActive: '{count} 个账户 · 均未启用',
      strategyLabel: '切换策略',
      strategyManual: '手动',
      strategyFailover: '出错时',
      strategyRoundRobin: '轮询',
      strategyManualHint: '活动账户仅当你在此处激活其他账户时才会更换。',
      strategyFailoverHint: '保持使用活动账户。当请求因密钥无效、余额不足或被限流而失败时，自动切换到下一个已启用的账户。',
      strategyRoundRobinHint: '每次请求都会轮换到下一个已启用的账户。失败的账户会像“出错时”一样被跳过。',
      noAccounts: '尚无账户。在下方添加 API 密钥，或导入该提供商当前已在使用的密钥。',
      importCurrent: '导入当前密钥',
      addAccount: '添加账户',
      labelPlaceholder: '名称（例如：工作）',
      keyPlaceholder: 'API 密钥',
      add: '添加',
      activeBadge: '活动中',
      activate: '设为活动',
      enabledLabel: '启用 {label}',
      edit: '编辑 {label}',
      save: '保存',
      cancel: '取消',
      delete: '删除 {label}',
      deleteConfirm: '删除账户“{label}”？',
      moveUp: '将 {label} 上移',
      moveDown: '将 {label} 下移',
      newKeyPlaceholder: '新 API 密钥（留空则保持不变）',
      lastError: '最近错误：{code}',
      lastUsed: '最近使用 {date}',
      fingerprintLabel: '密钥 #{fingerprint}',
      saved: '已保存',
      loadFailed: '账户加载失败。',
      retry: '重试',
      removeAll: '移除全部账户',
      removeAllConfirm: '移除该提供商的全部账户？提供商将保留其当前密钥。',
      confirm: '确认',
      errorDuplicateKey: '该 API 密钥已为此提供商保存。',
      errorInvalidKey: '请输入有效的 API 密钥。',
      errorNothingToImport: '该提供商当前未保存任何 API 密钥。',
      errorNotManageable: '该提供商不使用 API 密钥进行身份验证。',
      errorGeneric: '出现问题，请重试。'
    }

    // ---------- host API + store ----------

    function createAccountsStore() {
      let snapshot = { status: 'idle', providers: new Map(), namespaces: [], error: null }
      const listeners = new Set()
      let inflight = null

      const publish = (next) => {
        snapshot = next
        listeners.forEach((listener) => listener())
      }

      async function request(path, init) {
        const response = await fetch(path, { credentials: 'same-origin', cache: 'no-store', ...init })
        let payload
        try {
          payload = await response.json()
        } catch {
          payload = undefined
        }
        if (!response.ok) {
          const error = new Error(payload?.error || `HTTP ${response.status}`)
          error.code = payload?.code
          throw error
        }
        return payload
      }

      function load() {
        if (inflight !== null) return inflight
        inflight = (async () => {
          try {
            const payload = await request(STATE_PATH, { method: 'GET' })
            const views = Array.isArray(payload?.providers) ? payload.providers : []
            publish({
              status: 'ready',
              providers: new Map(views.map((view) => [view.provider, view])),
              namespaces: [...new Set(views.map((view) => view.settingsNs).filter((ns) => typeof ns === 'string' && ns.length > 0))],
              error: null
            })
          } catch (error) {
            publish({ ...snapshot, status: snapshot.providers.size > 0 ? 'ready' : 'error', error })
            throw error
          } finally {
            inflight = null
          }
        })()
        return inflight
      }

      async function mutate(body) {
        const payload = await request(MUTATE_PATH, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(body)
        })
        const view = payload?.provider
        if (view && typeof view.provider === 'string') {
          const providers = new Map(snapshot.providers)
          providers.set(view.provider, view)
          publish({ ...snapshot, status: 'ready', providers, error: null })
        }
        return view
      }

      return {
        subscribe(listener) {
          listeners.add(listener)
          return () => listeners.delete(listener)
        },
        getSnapshot: () => snapshot,
        load,
        mutate
      }
    }

    function localizeError(error, t) {
      switch (error?.code) {
        case 'duplicate-key': return t('errorDuplicateKey')
        case 'invalid-key': return t('errorInvalidKey')
        case 'nothing-to-import': return t('errorNothingToImport')
        case 'provider-not-manageable': return t('errorNotManageable')
        default: return error?.message || t('errorGeneric')
      }
    }

    function formatDate(value) {
      if (typeof value !== 'string') return undefined
      const date = new Date(value)
      if (!Number.isFinite(date.getTime())) return undefined
      try {
        return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date)
      } catch {
        return date.toLocaleString()
      }
    }

    function strategyLabel(strategy, t) {
      if (strategy === 'failover') return t('strategyFailover')
      if (strategy === 'round-robin') return t('strategyRoundRobin')
      return t('strategyManual')
    }

    function activeOf(view) {
      const enabled = view.accounts.filter((account) => account.enabled)
      return enabled.find((account) => account.id === view.activeId) ?? enabled[0]
    }

    // ---------- components ----------

    function IconButton({ label, onClick, disabled, danger, children }) {
      return h('button', {
        type: 'button',
        className: danger ? 'dshDeskMaIconButton dshDeskMaIconButtonDanger' : 'dshDeskMaIconButton',
        'aria-label': label,
        title: label,
        disabled,
        onClick
      }, children)
    }

    function AccountRow({ account, view, busy, run, t }) {
      const [editing, setEditing] = useState(false)
      const [confirming, setConfirming] = useState(false)
      const [draftLabel, setDraftLabel] = useState(account.label)
      const [draftKey, setDraftKey] = useState('')
      const isActive = activeOf(view)?.id === account.id
      const index = view.accounts.findIndex((candidate) => candidate.id === account.id)
      const lastUsed = formatDate(account.lastUsedAt)
      const providerId = view.provider

      const saveEdit = () => {
        const body = { action: 'update-account', provider: providerId, accountId: account.id, label: draftLabel }
        if (draftKey.trim().length > 0) body.apiKey = draftKey
        run(body, () => { setEditing(false); setDraftKey('') })
      }

      return h('li', { className: 'dshDeskMaRow' },
        h('div', { className: 'dshDeskMaRowMain' },
          h('span', {
            className: 'dshDeskMaDot',
            'data-state': isActive ? 'active' : account.lastError ? 'error' : 'idle',
            'aria-hidden': 'true'
          }),
          h('div', { className: 'dshDeskMaRowText' },
            h('div', { className: 'dshDeskMaRowHead' },
              h('span', { className: 'dshDeskMaRowLabel' }, account.label),
              isActive ? h('span', { className: 'dshDeskMaBadge' }, t('activeBadge')) : null
            ),
            h('span', { className: 'dshDeskMaMeta' },
              t('fingerprintLabel', { fingerprint: account.fingerprint }),
              lastUsed ? ` · ${t('lastUsed', { date: lastUsed })}` : null
            ),
            account.lastError
              ? h('span', { className: 'dshDeskMaErrorMeta' },
                  h(IconWarningOutlineRegular, { size: 12 }),
                  t('lastError', { code: account.lastError.code }))
              : null
          ),
          h('div', { className: 'dshDeskMaRowActions' },
            isActive ? null : h(Button, {
              variant: 'outline',
              size: 'sm',
              disabled: busy,
              onClick: () => run({ action: 'set-active', provider: providerId, accountId: account.id })
            }, t('activate')),
            h(Switch, {
              checked: account.enabled,
              disabled: busy,
              label: t('enabledLabel', { label: account.label }),
              onChange: (enabled) => run({ action: 'update-account', provider: providerId, accountId: account.id, enabled })
            }),
            h(IconButton, {
              label: t('moveUp', { label: account.label }),
              disabled: busy || index <= 0,
              onClick: () => run({ action: 'move-account', provider: providerId, accountId: account.id, direction: -1 })
            }, h(IconChevronUpOutlineRegular, { size: 14 })),
            h(IconButton, {
              label: t('moveDown', { label: account.label }),
              disabled: busy || index >= view.accounts.length - 1,
              onClick: () => run({ action: 'move-account', provider: providerId, accountId: account.id, direction: 1 })
            }, h(IconChevronDownOutlineRegular, { size: 14 })),
            h(IconButton, {
              label: t('edit', { label: account.label }),
              disabled: busy,
              onClick: () => { setDraftLabel(account.label); setDraftKey(''); setEditing(!editing) }
            }, h(IconEditOutlineRegular, { size: 14 })),
            h(IconButton, {
              label: t('delete', { label: account.label }),
              disabled: busy,
              danger: true,
              onClick: () => setConfirming(!confirming)
            }, h(IconTrashOutlineRegular, { size: 14 }))
          )
        ),
        editing ? h('div', { className: 'dshDeskMaEditRow' },
          h(Input, {
            value: draftLabel,
            disabled: busy,
            placeholder: t('labelPlaceholder'),
            'aria-label': t('labelPlaceholder'),
            onChange: (event) => setDraftLabel(event.target.value)
          }),
          h(Input, {
            type: 'password',
            value: draftKey,
            disabled: busy,
            placeholder: t('newKeyPlaceholder'),
            'aria-label': t('newKeyPlaceholder'),
            autoComplete: 'off',
            onChange: (event) => setDraftKey(event.target.value)
          }),
          h('div', { className: 'dshDeskMaEditActions' },
            h(Button, { variant: 'outline', size: 'sm', disabled: busy, onClick: () => setEditing(false) }, t('cancel')),
            h(Button, { variant: 'primary', size: 'sm', disabled: busy, onClick: saveEdit }, t('save'))
          )
        ) : null,
        confirming ? h('div', { className: 'dshDeskMaConfirmRow' },
          h('span', { className: 'dshDeskMaConfirmText' }, t('deleteConfirm', { label: account.label })),
          h('div', { className: 'dshDeskMaConfirmActions' },
            h(Button, { variant: 'outline', size: 'sm', disabled: busy, onClick: () => setConfirming(false) }, t('cancel')),
            h(Button, {
              variant: 'primary',
              size: 'sm',
              disabled: busy,
              onClick: () => run({ action: 'remove-account', provider: providerId, accountId: account.id }, () => setConfirming(false))
            }, t('confirm'))
          )
        ) : null
      )
    }

    function AccountsDialog({ providerId, displayName, api, onClose }) {
      const { store, t } = api
      const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot)
      const [busy, setBusy] = useState(false)
      const [error, setError] = useState('')
      const [statusText, setStatusText] = useState('')
      const [newLabel, setNewLabel] = useState('')
      const [newKey, setNewKey] = useState('')
      const [confirmingClear, setConfirmingClear] = useState(false)
      const idSuffix = useRef(`ma-${Math.random().toString(36).slice(2, 8)}`).current

      useEffect(() => {
        void store.load().catch(() => {})
      }, [store])

      const view = snapshot.providers.get(providerId)
      const run = (body, after) => {
        setBusy(true)
        setError('')
        store.mutate(body).then(() => {
          if (after) after()
          setStatusText(t('saved'))
        }).catch((reason) => {
          setError(localizeError(reason, t))
        }).finally(() => setBusy(false))
      }

      if (view === undefined) {
        return h(Modal, {
          open: true,
          onClose,
          title: t('dialogTitle', { provider: displayName }),
          closeLabel: t('close'),
          className: 'dshDeskMaDialog'
        }, h('div', { className: 'dshDeskMaBody' },
          h('p', { className: 'dshDeskMaError', role: 'alert' }, t('loadFailed')),
          h('div', null, h(Button, {
            variant: 'outline',
            size: 'sm',
            onClick: () => void store.load().catch(() => {})
          }, t('retry')))
        ))
      }

      const addDisabled = busy || newKey.trim().length === 0
      const strategyHint = view.strategy === 'failover'
        ? t('strategyFailoverHint')
        : view.strategy === 'round-robin'
          ? t('strategyRoundRobinHint')
          : t('strategyManualHint')

      return h(Modal, {
        open: true,
        onClose: () => { if (!busy) onClose() },
        title: t('dialogTitle', { provider: displayName }),
        closeLabel: t('close'),
        description: t('dialogDescription'),
        className: 'dshDeskMaDialog'
      }, h('div', { className: 'dshDeskMaBody' },
        error ? h('p', { className: 'dshDeskMaError', role: 'alert' }, error) : null,
        h('section', { className: 'dshDeskMaSection' },
          h('span', { className: 'dshDeskMaSectionLabel', id: `${idSuffix}-strategy` }, t('strategyLabel')),
          h(SegmentedControl, {
            id: `${idSuffix}-strategy-control`,
            value: view.strategy,
            label: t('strategyLabel'),
            // A strategy only exists once the provider holds an account.
            disabled: busy || view.accounts.length === 0,
            options: [
              { value: 'manual', label: t('strategyManual') },
              { value: 'failover', label: t('strategyFailover') },
              { value: 'round-robin', label: t('strategyRoundRobin') }
            ],
            onChange: (strategy) => run({ action: 'set-strategy', provider: providerId, strategy })
          }),
          h('p', { className: 'dshDeskMaHint' }, strategyHint),
          view.credentialRef
            ? h('p', { className: 'dshDeskMaHint' }, t('credentialRefNote', { ref: view.credentialRef }))
            : null
        ),
        h('section', { className: 'dshDeskMaSection' },
          h('div', { className: 'dshDeskMaSectionHead' },
            h('span', { className: 'dshDeskMaSectionLabel' }, t('accounts')),
            view.importable ? h(Button, {
              variant: 'outline',
              size: 'sm',
              disabled: busy,
              onClick: () => run({ action: 'import-current', provider: providerId })
            }, t('importCurrent')) : null
          ),
          view.accounts.length === 0
            ? h('p', { className: 'dshDeskMaEmpty' }, t('noAccounts'))
            : h('ul', { className: 'dshDeskMaList' },
                view.accounts.map((account) => h(AccountRow, {
                  key: account.id,
                  account,
                  view,
                  busy,
                  run,
                  t
                })))
        ),
        h('section', { className: 'dshDeskMaSection' },
          h('span', { className: 'dshDeskMaSectionLabel' }, t('addAccount')),
          h('div', { className: 'dshDeskMaAddForm' },
            h('span', { className: 'dshDeskMaAddLabel' }, h(Input, {
              value: newLabel,
              disabled: busy,
              placeholder: t('labelPlaceholder'),
              'aria-label': t('labelPlaceholder'),
              'data-modal-autofocus': true,
              onChange: (event) => setNewLabel(event.target.value)
            })),
            h('span', { className: 'dshDeskMaAddKey' }, h(Input, {
              type: 'password',
              value: newKey,
              disabled: busy,
              placeholder: t('keyPlaceholder'),
              'aria-label': t('keyPlaceholder'),
              autoComplete: 'off',
              onChange: (event) => setNewKey(event.target.value),
              onKeyDown: (event) => {
                if (event.key === 'Enter' && !addDisabled) {
                  run({ action: 'add-account', provider: providerId, label: newLabel, apiKey: newKey }, () => {
                    setNewLabel('')
                    setNewKey('')
                  })
                }
              }
            })),
            h(Button, {
              variant: 'primary',
              disabled: addDisabled,
              icon: h(IconPlusOutlineRegular, { size: 14 }),
              onClick: () => run({ action: 'add-account', provider: providerId, label: newLabel, apiKey: newKey }, () => {
                setNewLabel('')
                setNewKey('')
              })
            }, t('add'))
          )
        ),
        view.accounts.length > 0 ? h('div', { className: 'dshDeskMaFooterRow' },
          confirmingClear
            ? h('div', { className: 'dshDeskMaConfirmRow' },
                h('span', { className: 'dshDeskMaConfirmText' }, t('removeAllConfirm')),
                h('div', { className: 'dshDeskMaConfirmActions' },
                  h(Button, { variant: 'outline', size: 'sm', disabled: busy, onClick: () => setConfirmingClear(false) }, t('cancel')),
                  h(Button, {
                    variant: 'primary',
                    size: 'sm',
                    disabled: busy,
                    onClick: () => run({ action: 'clear-provider', provider: providerId }, () => setConfirmingClear(false))
                  }, t('confirm'))
                ))
            : h(Button, {
                variant: 'ghost',
                size: 'sm',
                className: 'dshDeskMaDangerText',
                disabled: busy,
                onClick: () => setConfirmingClear(true)
              }, t('removeAll'))
        ) : null,
        h('span', { className: 'dshDeskMaSrOnly', role: 'status', 'aria-live': 'polite' }, statusText)
      ))
    }

    function ProviderAccountsCard({ provider, configured, api }) {
      const { store, t } = api
      const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot)
      const [open, setOpen] = useState(false)

      useEffect(() => {
        if (snapshot.status === 'idle') void store.load().catch(() => {})
      }, [snapshot.status, store])

      const view = snapshot.providers.get(provider.provider)
      if (!configured || view === undefined || !view.manageable) return null

      const active = activeOf(view)
      const summary = view.accounts.length === 0
        ? t('cardEmpty')
        : active === undefined
          ? t('cardNoActive', { count: view.accounts.length })
          : t(view.accounts.length === 1 ? 'cardSummaryOne' : 'cardSummary', {
              count: view.accounts.length,
              active: active.label,
              strategy: strategyLabel(view.strategy, t)
            })

      return h('div', { className: 'dshDeskMaCard' },
        h('button', {
          type: 'button',
          className: 'dshDeskMaCardButton',
          'aria-haspopup': 'dialog',
          'aria-label': t('manageAccountsFor', { provider: provider.displayName }),
          onClick: () => setOpen(true)
        },
          h('span', { className: 'dshDeskMaCardIcon', 'aria-hidden': 'true' }, h(IconUsersOutlineRegular, { size: 14 })),
          h('span', { className: 'dshDeskMaCardText' }, summary),
          h('span', { className: 'dshDeskMaCardChevron', 'aria-hidden': 'true' }, h(IconChevronRightOutlineRegular, { size: 14 }))
        ),
        open ? h(AccountsDialog, {
          providerId: provider.provider,
          displayName: provider.displayName,
          api,
          onClose: () => setOpen(false)
        }) : null
      )
    }

    // ---------- composition ----------

    function apply(ctx) {
      ctx.inject(['slots', 'locale'], (scope) => {
        installStyles()
        scope.locale.register(NS, { zh, en, de })
        const api = { store: createAccountsStore(), t: scope.locale.bind(NS) }

        // Keep card summaries and open dialogs fresh when credentials move
        // underneath us (a failover switch, a key edited in the stock
        // editor) or the adapter directory changes. An enhancement only:
        // state still loads on demand when pushes are unavailable.
        try {
          scope.effect(() => {
            const refresh = () => { void api.store.load().catch(() => {}) }
            const disposers = [
              ctx.remote.$on('credentials/reference-updated', refresh),
              ctx.remote.$on('llm/adapters-updated', refresh)
            ]
            return () => disposers.forEach((dispose) => dispose())
          }, 'desktop-multi-account: pushed invalidations')
        } catch { /* no remote push channel in this composition */ }

        // The provider-card slot is keyed by the owning settings namespace,
        // which only the host directory knows. Discover the namespaces from
        // the account state (which carries every directory row), register
        // one card per namespace, and keep the set in sync as loads refresh.
        scope.slots.inject(SLOT, () => {
          let disposed = false
          let timer
          let attempts = 0
          const disposers = new Map()

          const syncRegistrations = () => {
            if (disposed) return
            for (const ns of api.store.getSnapshot().namespaces) {
              if (disposers.has(ns)) continue
              try {
                disposers.set(ns, scope.slots.register(
                  { name: SLOT, key: ns, inject: () => ({ api }) },
                  ProviderAccountsCard
                ))
              } catch {
                // Another plugin already occupies this namespace's cell at
                // the same priority; that provider family keeps its own
                // occupant and simply shows no account entry.
                disposers.set(ns, () => {})
              }
            }
          }

          const unsubscribe = api.store.subscribe(syncRegistrations)
          const attempt = () => {
            if (disposed) return
            attempts += 1
            api.store.load().then(syncRegistrations).catch(() => {
              if (!disposed && attempts < REGISTRATION_RETRIES) {
                timer = setTimeout(attempt, REGISTRATION_RETRY_MS)
              }
            })
          }
          attempt()

          return () => {
            disposed = true
            if (timer !== undefined) clearTimeout(timer)
            unsubscribe()
            disposers.forEach((dispose) => dispose())
            disposers.clear()
          }
        })
      })
    }

    const inject = []

    exports.apply = apply
    exports.inject = inject
    // Exposed for the desktop contract tests (vm-loaded like its siblings).
    exports.createAccountsStore = createAccountsStore
    exports.ProviderAccountsCard = ProviderAccountsCard
    return module.exports
  }
})
