window.__ModuleLoader__.load({
  id: 'dsh-desktop-enterprise',
  factory: (require) => {
    const module = { exports: {} }
    const exports = module.exports
    Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' })

    const React = require('react')
    const { createElement: h, useCallback, useEffect, useState } = React
    const LAST_BASE_KEY = 'dshDesktopEnterprise.lastBase'
    const ENTERPRISE_SECTION_ID = 'enterprise-account'
    const OPEN_SETTINGS_SECTION_EVENT = 'dsh-desktop:open-settings-section'
    const MANUAL_FALLBACK_DELAY_MS = 8_000
    const zh = navigator.language.toLowerCase().startsWith('zh')
    const copy = zh ? {
      nav: '账号与企业', title: '企业账号', platform: '毕昇平台地址',
      login: '在浏览器中登录', loggingIn: '等待浏览器授权…',
      refresh: '刷新', logout: '退出登录', models: '可用模型', noModels: '当前账号没有可用模型。',
      modelsUnavailable: '模型权限读取失败，企业模型已暂停。', usageUnavailable: '用量暂不可用',
      ticket: '一次性登录码', submitTicket: '完成登录',
      secureUnavailable: '系统安全存储不可用，企业登录已停用。',
      confirmTitle: '确认毕昇平台', confirmLead: '确认后会停用当前企业模型连接，并在该平台新建一次 PKCE 登录。',
      confirm: '确认并登录', cancel: '取消', requestId: '请求 ID'
    } : {
      nav: 'Account & Enterprise', title: 'Enterprise account', platform: 'BiSheng platform URL',
      login: 'Sign in in browser', loggingIn: 'Waiting for browser authorization…',
      refresh: 'Refresh', logout: 'Sign out', models: 'Available models', noModels: 'No models are assigned to this account.',
      modelsUnavailable: 'Model access could not be verified. Enterprise models are paused.', usageUnavailable: 'Usage unavailable',
      ticket: 'One-time code', submitTicket: 'Complete sign-in',
      secureUnavailable: 'Operating-system secure storage is unavailable. Enterprise sign-in is disabled.',
      confirmTitle: 'Confirm BiSheng platform', confirmLead: 'Continuing pauses the current enterprise connection and starts a new PKCE login at this platform.',
      confirm: 'Confirm and sign in', cancel: 'Cancel', requestId: 'Request ID'
    }

    function installStyles() {
      if (document.getElementById('dsh-desktop-enterprise-style')) return
      const style = document.createElement('style')
      style.id = 'dsh-desktop-enterprise-style'
      style.textContent = `
        .dshEnterprise{max-width:780px;color:var(--ds-text-primary,#202124)}
        .dshEnterprise h2{margin:0 0 8px;font-size:22px}.dshEnterprise h3{margin:0 0 8px;font-size:15px}
        .dshEnterpriseHint{color:var(--ds-text-secondary,#6d7178);line-height:1.55}
        .dshEnterpriseLabel{display:grid;gap:7px;font-size:13px;font-weight:650}.dshEnterpriseInput{box-sizing:border-box;width:100%;height:38px;padding:0 11px;border:1px solid var(--ds-border,#ccd0d5);border-radius:9px;color:inherit;background:transparent;font:inherit}
        .dshEnterpriseActions{display:flex;flex-wrap:wrap;gap:8px;margin-top:14px}.dshEnterpriseButton{min-height:36px;padding:7px 13px;border:1px solid var(--ds-border,#ccd0d5);border-radius:9px;color:inherit;background:var(--ds-bg-primary,#fff);cursor:pointer;font:inherit;font-weight:650}.dshEnterpriseButton.login{border-color:var(--ds-border,#ccd0d5);color:var(--ds-text-primary,#202124);background:transparent}.dshEnterpriseButton.primary{border-color:#2468f2;color:#fff;background:#2468f2}.dshEnterpriseButton.danger{color:#b42318}.dshEnterpriseButton:disabled,.dshEnterpriseIconButton:disabled{opacity:.5;cursor:default}
        .dshEnterpriseManual{display:grid;gap:10px;margin-top:14px}.dshEnterpriseManual .dshEnterpriseActions{margin-top:0}
        .dshEnterpriseIdentity{display:flex;align-items:center;gap:8px;min-height:22px;font-size:13px;font-weight:650}.dshEnterpriseDot{width:8px;height:8px;border-radius:50%;background:#17a673;box-shadow:0 0 0 0 #17a67355;animation:dshEnterprisePulse 2.4s ease-in-out infinite}@keyframes dshEnterprisePulse{0%,100%{box-shadow:0 0 0 0 #17a67355}50%{box-shadow:0 0 0 5px #17a67300}}
        .dshEnterpriseSectionHeader{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:18px}.dshEnterpriseSectionHeader h3{margin:0}.dshEnterpriseIconButton{display:inline-flex;width:28px;height:28px;align-items:center;justify-content:center;padding:0;border:1px solid var(--ds-border,#ccd0d5);border-radius:8px;color:var(--ds-text-secondary,#6d7178);background:transparent;cursor:pointer;font:18px/1 system-ui}.dshEnterpriseIconButton:hover{color:inherit;background:var(--ds-bg-secondary,#f0f2f5)}
        .dshEnterpriseModels{display:grid;gap:7px;margin:8px 0 0;padding:0;list-style:none}.dshEnterpriseModels li{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:8px 10px;border-radius:9px;background:var(--ds-bg-secondary,#f0f2f5);font-size:12px}.dshEnterpriseModelUsage{color:var(--ds-text-secondary,#6d7178);white-space:nowrap}.dshEnterpriseModelUsagePercent{display:none}.dshEnterpriseModels li:hover .dshEnterpriseModelUsageValue{display:none}.dshEnterpriseModels li:hover .dshEnterpriseModelUsagePercent{display:inline}.dshEnterpriseModels.paused{opacity:.5}
        .dshEnterpriseError{margin-top:12px;padding:10px 12px;border-radius:9px;color:#b42318;background:#fef3f2;font-size:13px;line-height:1.45}.dshEnterpriseConfirm{margin-top:18px;padding:18px;border:1px solid #8fb2ff;border-radius:14px;background:#edf4ff}.dshEnterpriseConfirm strong{display:block;margin:12px 0 4px;overflow-wrap:anywhere}
        @media(prefers-reduced-motion:reduce){.dshEnterpriseDot{animation:none}}body[data-ds-dark-theme] .dshEnterprise{color:#f2f3f5}body[data-ds-dark-theme] .dshEnterpriseInput,body[data-ds-dark-theme] .dshEnterpriseButton{color:#f2f3f5;background:#1f2024;border-color:#50535c}body[data-ds-dark-theme] .dshEnterpriseIconButton{border-color:#50535c;color:#c7c9ce}body[data-ds-dark-theme] .dshEnterpriseIconButton:hover,body[data-ds-dark-theme] .dshEnterpriseModels li{background:#35373d}body[data-ds-dark-theme] .dshEnterpriseError{color:#ffb4ab;background:#421b1b}body[data-ds-dark-theme] .dshEnterpriseConfirm{background:#17294a;border-color:#4779d8}`
      document.head.appendChild(style)
    }

    async function api(path, body) {
      const response = await fetch(path, {
        method: body === undefined ? 'GET' : 'POST',
        credentials: 'same-origin',
        headers: body === undefined ? {} : { 'content-type': 'application/json' },
        ...(body === undefined ? {} : { body: JSON.stringify(body) })
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok || payload.ok === false) throw new Error(payload.error || `Request failed (${response.status})`)
      return payload
    }

    function usageText(usage) {
      if (!usage || usage.source === 'unavailable' || usage.quota_state === 'unavailable') return copy.usageUnavailable
      if (usage.limit === 0) return zh ? '额度为 0，模型调用已停用' : 'Limit is 0; model calls are disabled'
      if (usage.used === null || usage.limit === null) return copy.usageUnavailable
      return `${usage.used.toLocaleString()} / ${usage.limit.toLocaleString()}`
    }

    function readLastBase() {
      try {
        return localStorage.getItem(LAST_BASE_KEY) || ''
      } catch {
        return ''
      }
    }

    function rememberBase(value) {
      if (typeof value !== 'string' || !value.trim()) return
      try {
        localStorage.setItem(LAST_BASE_KEY, value.trim())
      } catch {}
    }

    function openEnterpriseSettingsSection() {
      if (typeof window === 'undefined' || typeof window.dispatchEvent !== 'function') return
      const dispatch = () => window.dispatchEvent(
        new CustomEvent(OPEN_SETTINGS_SECTION_EVENT, { detail: { id: ENTERPRISE_SECTION_ID } })
      )
      dispatch()
      window.setTimeout(dispatch, 0)
    }

    function modelUsagePercentage(usage) {
      if (!usage || typeof usage.used !== 'number' || typeof usage.limit !== 'number' || usage.limit <= 0) return usageText(usage)
      const percentage = Math.max(0, usage.used / usage.limit * 100)
      const formatted = new Intl.NumberFormat(zh ? 'zh-CN' : 'en-US', { maximumFractionDigits: 1 }).format(percentage)
      return `${formatted}%`
    }

    function EnterpriseSection() {
      const [state, setState] = useState(null)
      const [base, setBase] = useState(readLastBase)
      const [ticket, setTicket] = useState('')
      const [manualFallbackReady, setManualFallbackReady] = useState(false)
      const [busy, setBusy] = useState(false)
      const [error, setError] = useState('')
      const [confirmation, setConfirmation] = useState(null)

      const refreshState = useCallback(async () => {
        const next = await api('/api/enterprise.state')
        setState(next)
        if (next.base) {
          setBase(next.base)
          rememberBase(next.base)
        }
        return next
      }, [])

      const inspectDeepLink = useCallback(async (url) => {
        setBusy(true); setError('')
        try { setConfirmation(await api('/api/enterprise.deep-link.inspect', { url })) }
        catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)) }
        finally { setBusy(false) }
      }, [])

      useEffect(() => {
        refreshState().catch((cause) => setError(cause instanceof Error ? cause.message : String(cause)))
        const bridge = window.dshDesktopEnterprise
        if (!bridge?.onLoginLink) return undefined
        return bridge.onLoginLink((url) => { openEnterpriseSettingsSection(); bridge.consumeLoginLink?.(); void inspectDeepLink(url) })
      }, [inspectDeepLink, refreshState])

      useEffect(() => {
        if (!['authorizing', 'refreshing'].includes(state?.phase)) return undefined
        const timer = window.setInterval(() => { refreshState().catch(() => {}) }, 1200)
        return () => window.clearInterval(timer)
      }, [state?.phase, refreshState])

      useEffect(() => {
        setManualFallbackReady(false)
        setTicket('')
        if (state?.phase !== 'authorizing' || !state?.loginExpiresAt) return undefined
        const timer = window.setTimeout(() => setManualFallbackReady(true), MANUAL_FALLBACK_DELAY_MS)
        return () => window.clearTimeout(timer)
      }, [state?.phase, state?.loginExpiresAt])

      useEffect(() => {
        if (!state?.connected) return undefined
        const visible = () => {
          if (document.visibilityState !== 'visible') return
          api('/api/enterprise.refresh', {}).then(setState).catch(() => {})
        }
        const timer = window.setInterval(visible, 30_000)
        document.addEventListener('visibilitychange', visible)
        return () => { window.clearInterval(timer); document.removeEventListener('visibilitychange', visible) }
      }, [state?.connected, refreshState])

      async function run(operation) {
        setBusy(true); setError('')
        try { await operation() }
        catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)) }
        finally { setBusy(false) }
      }

      function openAuthorization(result) {
        window.open(result.authorizationUrl, '_blank', 'noopener,noreferrer')
      }

      const connected = state?.connected === true
      const models = Array.isArray(state?.models) ? state.models : []
      const userLabel = state?.user?.display_name || state?.user?.username || state?.user?.id || '—'

      const status = connected ? h('div', { className: 'dshEnterpriseIdentity' },
        h('span', { className: 'dshEnterpriseDot', 'aria-hidden': 'true' }),
        h('span', null, userLabel)) : null

      const accountContent = connected
        ? h(React.Fragment, null,
          h('div', { className: 'dshEnterpriseSectionHeader' },
            h('h3', null, copy.models),
            h('button', {
              className: 'dshEnterpriseIconButton',
              type: 'button',
              title: copy.refresh,
              'aria-label': copy.refresh,
              disabled: busy,
              onClick: () => run(async () => setState(await api('/api/enterprise.refresh', {})))
            }, h('span', { 'aria-hidden': 'true' }, '↻'))),
          models.length
            ? h('ul', { className: `dshEnterpriseModels${state.modelsAvailable ? '' : ' paused'}` },
              ...models.map((model) => {
                const usage = state.modelUsage?.[model.id]
                const value = usageText(usage)
                const percentage = modelUsagePercentage(usage)
                return h('li', { key: model.id, title: `${value} · ${percentage}` },
                  h('span', null, model.display_name),
                  h('span', { className: 'dshEnterpriseModelUsage' },
                    h('span', { className: 'dshEnterpriseModelUsageValue' }, value),
                    h('span', { className: 'dshEnterpriseModelUsagePercent', 'aria-hidden': 'true' }, percentage)))
              }))
            : h('p', { className: 'dshEnterpriseHint' }, copy.noModels),
          h('div', { className: 'dshEnterpriseActions' },
            h('button', { className: 'dshEnterpriseButton danger', disabled: busy, onClick: () => run(async () => setState(await api('/api/enterprise.logout', {}))) }, copy.logout)))
        : h(React.Fragment, null,
          h('label', { className: 'dshEnterpriseLabel', style: { marginTop: 16 } }, copy.platform,
            h('input', { className: 'dshEnterpriseInput', type: 'url', inputMode: 'url', autoComplete: 'url', placeholder: 'https://bisheng.example.com', value: base, onChange: (event) => { setBase(event.target.value); rememberBase(event.target.value) } })),
          state?.secureStorageAvailable === false
            ? h('p', { className: 'dshEnterpriseError' }, copy.secureUnavailable)
            : h('div', { className: 'dshEnterpriseActions' },
              h('button', { className: 'dshEnterpriseButton login', disabled: busy || !base.trim(), onClick: () => run(async () => { rememberBase(base); const result = await api('/api/enterprise.login.start', { base }); openAuthorization(result); await refreshState() }) }, state?.phase === 'authorizing' ? copy.loggingIn : copy.login)))

      const manualFallback = !connected && manualFallbackReady
        ? h('div', { className: 'dshEnterpriseManual' },
          h('label', { className: 'dshEnterpriseLabel' }, copy.ticket,
            h('input', { className: 'dshEnterpriseInput', type: 'text', autoComplete: 'one-time-code', value: ticket, onChange: (event) => setTicket(event.target.value) })),
          h('div', { className: 'dshEnterpriseActions' },
            h('button', { className: 'dshEnterpriseButton', type: 'button', disabled: busy || !ticket.trim(), onClick: () => run(async () => { setState(await api('/api/enterprise.login.manual', { identityTicket: ticket.trim() })); setTicket('') }) }, copy.submitTicket)))
        : null

      const failure = error || state?.error
      const errorPanel = failure
        ? h('p', { className: 'dshEnterpriseError', role: 'alert' }, failure,
          state?.requestId ? h('span', null, ` · ${copy.requestId}: ${state.requestId}`) : null)
        : null

      const confirmationPanel = confirmation
        ? h('div', { className: 'dshEnterpriseConfirm', role: 'dialog', 'aria-modal': 'true' },
          h('h3', null, copy.confirmTitle),
          h('p', { className: 'dshEnterpriseHint' }, copy.confirmLead),
          h('strong', null, confirmation.base),
          h('div', { className: 'dshEnterpriseActions' },
            h('button', { className: 'dshEnterpriseButton primary', disabled: busy, onClick: () => run(async () => { const result = await api('/api/enterprise.deep-link.confirm', { base: confirmation.base }); setConfirmation(null); setBase(result.base); rememberBase(result.base); openAuthorization(result); await refreshState() }) }, copy.confirm),
            h('button', { className: 'dshEnterpriseButton', disabled: busy, onClick: () => setConfirmation(null) }, copy.cancel)))
        : null

      return h('section', { className: 'dshEnterprise' },
        h('h2', null, copy.title),
        status,
        accountContent,
        manualFallback,
        errorPanel,
        confirmationPanel)
    }

    const inject = ['slots']
    function apply(ctx) {
      installStyles()
      ctx.effect(() => {
        const bridge = window.dshDesktopEnterprise
        if (!bridge?.onLoginLink) return undefined
        return bridge.onLoginLink(() => openEnterpriseSettingsSection())
      }, 'dsh-desktop-enterprise: open settings on login link')
      ctx.slots.inject('settings.section', () => ctx.slots.register({
        name: 'settings.section', id: ENTERPRISE_SECTION_ID, order: 15, label: () => copy.nav
      }, EnterpriseSection))
    }
    exports.apply = apply
    exports.inject = inject
    return module.exports
  }
})
