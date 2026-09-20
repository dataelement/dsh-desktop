window.__ModuleLoader__.load({
  id: 'dsh-desktop-enterprise',
  factory: (require) => {
    const module = { exports: {} }
    const exports = module.exports
    Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' })

    const React = require('react')
    const { createElement: h, useCallback, useEffect, useState } = React
    const LAST_BASE_KEY = 'dshDesktopEnterprise.lastBase'
    const MANUAL_FALLBACK_DELAY_MS = 8_000
    const ENTERPRISE_SECTION_ID = 'enterprise-account'
    const LEARN_MORE_URL = 'https://bisheng.ai/'
    const OPEN_SETTINGS_SECTION_EVENT = 'dsh-desktop:open-settings-section'
    const NS = 'settings.desktopEnterprise'
    const zh = {
      nav: '企业账号', title: '企业账号', platform: '企业服务地址',
      login: '在浏览器中登录', loggingIn: '等待浏览器授权…',
      learnMore: '了解企业版',
      vision: '视觉', visionHint: '企业已开启图片输入', usageLabel: '已用 / 额度（Token）',
      ticket: '一次性登录码', submitTicket: '完成登录',
      refresh: '刷新', logout: '退出登录', models: '可用模型', noModels: '当前账号没有可用模型。',
      usageUnavailable: '用量暂不可用',
      limitZero: '额度为 0，模型调用已停用',
      secureUnavailable: '系统安全存储不可用，企业登录已停用。',
      confirmTitle: '确认毕昇平台', confirmLead: '确认后会停用当前企业模型连接，并在该平台新建一次 PKCE 登录。',
      insecureTitle: '确认使用内网 HTTP',
      insecureLead: '该地址是内网明文 HTTP。登录票据和令牌会在局域网上明文传输，仅在你信任的企业内网继续。',
      confirm: '确认并登录', insecureConfirm: '我了解风险，继续登录', cancel: '取消', requestId: '请求 ID',
      seatRevoked: '席位已撤销'
    }
    const en = {
      nav: 'Enterprise account', title: 'Enterprise account', platform: 'Enterprise service URL',
      login: 'Sign in in browser', loggingIn: 'Waiting for browser authorization…',
      learnMore: 'Learn about Enterprise',
      vision: 'Vision', visionHint: 'Image input enabled by your enterprise', usageLabel: 'Used / limit (tokens)',
      ticket: 'One-time code', submitTicket: 'Complete sign-in',
      refresh: 'Refresh', logout: 'Sign out', models: 'Available models', noModels: 'No models are assigned to this account.',
      usageUnavailable: 'Usage unavailable',
      limitZero: 'Limit is 0; model calls are disabled',
      secureUnavailable: 'Operating-system secure storage is unavailable. Enterprise sign-in is disabled.',
      confirmTitle: 'Confirm BiSheng platform', confirmLead: 'Continuing pauses the current enterprise connection and starts a new PKCE login at this platform.',
      insecureTitle: 'Confirm intranet HTTP',
      insecureLead: 'This address is cleartext HTTP on a private network. Login tickets and tokens will travel unencrypted on the LAN. Continue only on a network you trust.',
      confirm: 'Confirm and sign in', insecureConfirm: 'I understand, continue', cancel: 'Cancel', requestId: 'Request ID',
      seatRevoked: 'Seat revoked'
    }

    function installStyles() {
      let style = document.getElementById('dsh-desktop-enterprise-style')
      if (!style) {
        style = document.createElement('style')
        style.id = 'dsh-desktop-enterprise-style'
        document.head.appendChild(style)
      }
      style.textContent = `
        .dshEnterprise{max-width:720px;color:var(--dsw-alias-label-primary,#202124)}
        .dshEnterpriseTitleRow{display:flex;align-items:center;flex-wrap:nowrap;gap:10px;margin:0 0 8px}.dshEnterpriseTitleRow h2{margin:0;flex:0 0 auto;width:auto;color:var(--dsw-alias-label-primary);font-size:18px;font-weight:600;line-height:normal}
        .dshEnterprise h3{margin:0 0 8px;font-size:14px;font-weight:500;line-height:22px}
        .dshEnterpriseHint{color:var(--ds-text-secondary,#6d7178);line-height:1.55}
        .dshEnterpriseLabel{display:grid;gap:7px;font-size:13px;font-weight:650}.dshEnterpriseInput{box-sizing:border-box;width:100%;height:38px;padding:0 11px;border:1px solid var(--ds-border,#ccd0d5);border-radius:9px;color:inherit;background:transparent;font:inherit}
        .dshEnterpriseActions{display:flex;flex-wrap:wrap;gap:8px;margin-top:14px}.dshEnterpriseButton{min-height:36px;padding:7px 13px;border:1px solid var(--ds-border,#ccd0d5);border-radius:9px;color:inherit;background:var(--ds-bg-primary,#fff);cursor:pointer;font:inherit;font-weight:650}.dshEnterpriseButton.login{border-color:var(--ds-border,#ccd0d5);color:var(--ds-text-primary,#202124);background:transparent}.dshEnterpriseButton.primary{border-color:#2468f2;color:#fff;background:#2468f2}.dshEnterpriseButton.danger{color:#b42318}.dshEnterpriseButton:disabled,.dshEnterpriseIconButton:disabled{opacity:.5;cursor:default}
        .dshEnterpriseLearnMoreShell{box-sizing:border-box;display:inline-flex;flex:none;height:32px;border:1px solid var(--ds-border,#ccd0d5);border-radius:9999px;corner-shape:round;background:#fff;overflow:hidden}.dshEnterpriseLearnMoreShell>.dshEnterpriseLearnMore{-webkit-appearance:none;appearance:none;box-sizing:border-box;display:inline-flex;align-items:center;justify-content:center;height:100%;margin:0;padding:0 14px;border:0;border-radius:9999px;corner-shape:round;background:transparent;color:var(--ds-text-primary,#202124);font:inherit;font-size:13px;font-weight:650;line-height:1;cursor:pointer}
        .dshEnterpriseIdentity{display:flex;align-items:center;gap:8px;min-height:22px;font-size:13px;font-weight:650}.dshEnterpriseDot{width:8px;height:8px;border-radius:50%;background:#17a673;box-shadow:0 0 0 0 #17a67355;animation:dshEnterprisePulse 2.4s ease-in-out infinite}@keyframes dshEnterprisePulse{0%,100%{box-shadow:0 0 0 0 #17a67355}50%{box-shadow:0 0 0 5px #17a67300}}
        .dshEnterpriseSectionHeader{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:18px}.dshEnterpriseSectionHeader h3{margin:0}.dshEnterpriseIconButton{display:inline-flex;width:28px;height:28px;align-items:center;justify-content:center;padding:0;border:1px solid var(--ds-border,#ccd0d5);border-radius:8px;color:var(--ds-text-secondary,#6d7178);background:transparent;cursor:pointer;font:18px/1 system-ui}.dshEnterpriseIconButton:hover{color:inherit;background:var(--ds-bg-secondary,#f0f2f5)}
        .dshEnterpriseModels{display:grid;gap:8px;margin:12px 0 0;padding:0;list-style:none}.dshEnterpriseModels li{box-sizing:border-box;display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px 14px;min-height:60px;padding:12px 14px;border:.5px solid var(--dsw-alias-border-l4,#e0e1e5);border-radius:16px;font-size:14px;line-height:22px}.dshEnterpriseModelIdentity{display:flex;align-items:center;gap:8px;flex:1 1 180px;min-width:0}.dshEnterpriseModelName{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:500}.dshEnterpriseModelVision{display:inline-flex;align-items:center;gap:4px;flex:none;color:var(--dsw-alias-label-tertiary,#81858c);font-size:12px;line-height:18px;white-space:nowrap}.dshEnterpriseModelVision svg{flex:none}.dshEnterpriseModelUsage{margin-left:auto;text-align:right;color:var(--dsw-alias-label-tertiary,#81858c);font-size:13px;line-height:20px;font-variant-numeric:tabular-nums;white-space:nowrap}.dshEnterpriseModelUsagePercent{display:none}.dshEnterpriseModels li:hover .dshEnterpriseModelUsageValue{display:none}.dshEnterpriseModels li:hover .dshEnterpriseModelUsagePercent{display:inline}.dshEnterpriseModels.paused{opacity:.5}
        .dshEnterpriseManual{margin-top:18px}.dshEnterpriseError{margin-top:12px;padding:10px 12px;border-radius:9px;color:#b42318;background:#fef3f2;font-size:13px;line-height:1.45}.dshEnterpriseConfirm{margin-top:18px;padding:18px;border:1px solid #8fb2ff;border-radius:14px;background:#edf4ff}.dshEnterpriseConfirm strong{display:block;margin:12px 0 4px;overflow-wrap:anywhere}
        @media(prefers-reduced-motion:reduce){.dshEnterpriseDot{animation:none}}body[data-ds-dark-theme] .dshEnterprise{color:#f2f3f5}body[data-ds-dark-theme] .dshEnterpriseInput,body[data-ds-dark-theme] .dshEnterpriseButton{color:#f2f3f5;background:#1f2024;border-color:#50535c}body[data-ds-dark-theme] .dshEnterpriseLearnMoreShell{background:#1f2024;border-color:#50535c}body[data-ds-dark-theme] .dshEnterpriseLearnMoreShell>.dshEnterpriseLearnMore{color:#f2f3f5}body[data-ds-dark-theme] .dshEnterpriseIconButton{border-color:#50535c;color:#c7c9ce}body[data-ds-dark-theme] .dshEnterpriseIconButton:hover{background:#35373d}body[data-ds-dark-theme] .dshEnterpriseError{color:#ffb4ab;background:#421b1b}body[data-ds-dark-theme] .dshEnterpriseConfirm{background:#17294a;border-color:#4779d8}`
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

    function tokenAmount(value, language) {
      const zhLocale = String(language || '').toLowerCase().startsWith('zh')
      if (!zhLocale) return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 2 }).format(value)
      if (value === 0) return '0'
      if (value < 100) return '<0.01万'
      return `${new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 2 }).format(value / 10_000)}万`
    }

    function usageText(usage, language, t) {
      if (!usage || usage.source === 'unavailable' || usage.quota_state === 'unavailable') return t('usageUnavailable')
      if (usage.limit === 0) return t('limitZero')
      if (usage.used === null || usage.limit === null) return t('usageUnavailable')
      return `${tokenAmount(usage.used, language)} / ${tokenAmount(usage.limit, language)}`
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

    function formatEnterpriseSettingsError(failure, errorCode, t) {
      const text = typeof failure === 'string' ? failure.trim() : ''
      const code = typeof errorCode === 'string' ? errorCode : ''
      if (code === 'seat_revoked' || /^seat revoked\.?$/i.test(text)) return t('seatRevoked')
      return text
    }

    function modelUsagePercentage(usage, language, t) {
      if (!usage || typeof usage.used !== 'number' || typeof usage.limit !== 'number' || usage.limit <= 0) {
        return usageText(usage, language, t)
      }
      const zhLocale = String(language || '').toLowerCase().startsWith('zh')
      const percentage = Math.min(100, Math.max(0, usage.used / usage.limit * 100))
      const formatted = new Intl.NumberFormat(zhLocale ? 'zh-CN' : 'en-US', { maximumFractionDigits: 1 }).format(percentage)
      return `${formatted}%`
    }

    function readUiLanguage() {
      return typeof document === 'object' && document.documentElement?.lang
        ? document.documentElement.lang
        : 'en'
    }

    function EnterpriseSection({ t }) {
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
        try { setConfirmation({ ...(await api('/api/enterprise.deep-link.inspect', { url })), fromDeepLink: true }) }
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
        setManualFallbackReady(false)
        setTicket('')
        if (state?.phase !== 'authorizing' || !state?.loginExpiresAt) return undefined
        const timer = window.setTimeout(() => setManualFallbackReady(true), MANUAL_FALLBACK_DELAY_MS)
        return () => window.clearTimeout(timer)
      }, [state?.phase, state?.loginExpiresAt])

      useEffect(() => {
        const phase = state?.phase
        const intervalMs = ['authorizing', 'refreshing'].includes(phase)
          ? 1_000
          : phase === 'connected' || state?.connected
            ? 30_000
            : 60_000
        const timer = window.setInterval(() => { refreshState().catch(() => {}) }, intervalMs)
        return () => window.clearInterval(timer)
      }, [state?.phase, state?.connected, refreshState])

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
      const language = readUiLanguage()

      const status = connected ? h('div', { className: 'dshEnterpriseIdentity' },
        h('span', { className: 'dshEnterpriseDot', 'aria-hidden': 'true' }),
        h('span', null, userLabel)) : null

      const accountContent = connected
        ? h(React.Fragment, null,
          h('div', { className: 'dshEnterpriseSectionHeader' },
            h('h3', null, t('models')),
            h('button', {
              className: 'dshEnterpriseIconButton',
              type: 'button',
              title: t('refresh'),
              'aria-label': t('refresh'),
              disabled: busy,
              onClick: () => run(async () => setState(await api('/api/enterprise.refresh', {})))
            }, h('span', { 'aria-hidden': 'true' }, '↻'))),
          models.length
            ? h('ul', { className: `dshEnterpriseModels${state.modelsAvailable ? '' : ' paused'}` },
              ...models.map((model) => {
                const usage = state.modelUsage?.[model.id]
                const value = usageText(usage, language, t)
                const percentage = modelUsagePercentage(usage, language, t)
                return h('li', { key: model.id, title: `${t('usageLabel')}: ${value} · ${percentage}` },
                  h('span', { className: 'dshEnterpriseModelIdentity' },
                    h('span', { className: 'dshEnterpriseModelName', title: model.display_name }, model.display_name),
                    model.capabilities?.vision === true ? h('span', { className: 'dshEnterpriseModelVision', title: t('visionHint') },
                      h('svg', { width: 14, height: 14, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': 'true' },
                        h('path', { d: 'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z' }),
                        h('circle', { cx: 12, cy: 12, r: 3 })),
                      t('vision')) : null),
                  h('span', { className: 'dshEnterpriseModelUsage', 'aria-label': `${t('usageLabel')}: ${value} · ${percentage}` },
                    h('span', { className: 'dshEnterpriseModelUsageValue' }, value),
                    h('span', { className: 'dshEnterpriseModelUsagePercent', 'aria-hidden': 'true' }, percentage)))
              }))
            : h('p', { className: 'dshEnterpriseHint' }, t('noModels')),
          h('div', { className: 'dshEnterpriseActions' },
            h('button', { className: 'dshEnterpriseButton danger', disabled: busy, onClick: () => run(async () => setState(await api('/api/enterprise.logout', {}))) }, t('logout'))))
        : h(React.Fragment, null,
          h('label', { className: 'dshEnterpriseLabel', style: { marginTop: 16 } }, t('platform'),
            h('input', { className: 'dshEnterpriseInput', type: 'url', inputMode: 'url', autoComplete: 'url', placeholder: 'https://bisheng.example.com', value: base, onChange: (event) => { setBase(event.target.value); rememberBase(event.target.value) } })),
          state?.secureStorageAvailable === false
            ? h('p', { className: 'dshEnterpriseError' }, t('secureUnavailable'))
            : h('div', { className: 'dshEnterpriseActions' },
              h('button', { className: 'dshEnterpriseButton login', disabled: busy || !base.trim(), onClick: () => run(async () => {
                rememberBase(base)
                const inspected = await api('/api/enterprise.base.inspect', { base })
                if (inspected.insecurePrivateHttp) {
                  setConfirmation({ base: inspected.base, insecurePrivateHttp: true })
                  return
                }
                const result = await api('/api/enterprise.login.start', { base: inspected.base })
                openAuthorization(result)
                await refreshState()
              }) }, state?.phase === 'authorizing' ? t('loggingIn') : t('login'))))

      const manualFallback = !connected && manualFallbackReady
        ? h('div', { className: 'dshEnterpriseManual' },
          h('label', { className: 'dshEnterpriseLabel' }, t('ticket'),
            h('input', { className: 'dshEnterpriseInput', type: 'text', autoComplete: 'one-time-code', value: ticket, onChange: (event) => setTicket(event.target.value) })),
          h('div', { className: 'dshEnterpriseActions' },
            h('button', { className: 'dshEnterpriseButton', type: 'button', disabled: busy || !ticket.trim(), onClick: () => run(async () => {
              setState(await api('/api/enterprise.login.manual', { identityTicket: ticket.trim() }))
              setTicket('')
            }) }, t('submitTicket'))))
        : null

      const failure = error
        ? formatEnterpriseSettingsError(error, undefined, t)
        : formatEnterpriseSettingsError(state?.error, state?.errorCode, t)
      const errorPanel = failure
        ? h('p', { className: 'dshEnterpriseError', role: 'alert' }, failure,
          state?.requestId ? h('span', null, ` · ${t('requestId')}: ${state.requestId}`) : null)
        : null

      const confirmationPanel = confirmation
        ? h('div', { className: 'dshEnterpriseConfirm', role: 'dialog', 'aria-modal': 'true' },
          h('h3', null, confirmation.insecurePrivateHttp ? t('insecureTitle') : t('confirmTitle')),
          h('p', { className: 'dshEnterpriseHint' }, confirmation.insecurePrivateHttp ? t('insecureLead') : t('confirmLead')),
          h('strong', null, confirmation.base),
          h('div', { className: 'dshEnterpriseActions' },
            h('button', { className: 'dshEnterpriseButton primary', disabled: busy, onClick: () => run(async () => {
              const path = confirmation.fromDeepLink ? '/api/enterprise.deep-link.confirm' : '/api/enterprise.login.start'
              const result = await api(path, {
                base: confirmation.base,
                ...(confirmation.insecurePrivateHttp ? { confirmInsecurePrivateHttp: true } : {})
              })
              setConfirmation(null)
              setBase(result.base)
              rememberBase(result.base)
              openAuthorization(result)
              await refreshState()
            }) }, confirmation.insecurePrivateHttp ? t('insecureConfirm') : t('confirm')),
            h('button', { className: 'dshEnterpriseButton', disabled: busy, onClick: () => setConfirmation(null) }, t('cancel'))))
        : null

      return h('section', { className: 'dshEnterprise' },
        h('div', { className: 'dshEnterpriseTitleRow' },
          h('h2', null, t('title')),
          h('span', {
            className: 'dshEnterpriseLearnMoreShell',
            // Host theme sets `*,*::before,*::after { corner-shape: superellipse(1.5) }`,
            // which turns large border-radius into soft squircle corners. Force round arcs
            // on this control only so 9999px reads as true semicircle pill ends.
            style: {
              display: 'inline-flex',
              height: 32,
              borderRadius: 9999,
              cornerShape: 'round',
              overflow: 'hidden',
              border: '1px solid var(--ds-border, #ccd0d5)',
              background: '#fff'
            }
          },
            h('button', {
              className: 'dshEnterpriseLearnMore',
              type: 'button',
              style: {
                height: '100%',
                border: 0,
                borderRadius: 9999,
                cornerShape: 'round',
                background: 'transparent'
              },
              onClick: () => window.open(LEARN_MORE_URL, '_blank', 'noopener,noreferrer')
            }, t('learnMore'))
          )
        ),
        status,
        accountContent,
        manualFallback,
        errorPanel,
        confirmationPanel)
    }

    const inject = ['slots', 'locale']
    function apply(ctx) {
      installStyles()
      ctx.effect(
        () => ctx.locale.register(NS, { zh, en }),
        'dsh-desktop-enterprise: copy dictionaries'
      )
      const t = ctx.locale.bind(NS)
      ctx.effect(() => {
        const bridge = window.dshDesktopEnterprise
        if (!bridge?.onLoginLink) return undefined
        return bridge.onLoginLink(() => openEnterpriseSettingsSection())
      }, 'dsh-desktop-enterprise: open settings on login link')
      ctx.slots.inject('settings.section', () => ctx.slots.register({
        name: 'settings.section',
        id: ENTERPRISE_SECTION_ID,
        order: 15,
        label: () => t('nav'),
        inject: () => ({ t })
      }, EnterpriseSection))
    }
    exports.apply = apply
    exports.inject = inject
    return module.exports
  }
})
