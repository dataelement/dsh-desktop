import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { inject as enterpriseInject } from '../packages/dsh-desktop-enterprise/index.js'

const projectRoot = path.resolve(import.meta.dirname, '..')
const execFileAsync = promisify(execFile)

describe('DSH Desktop enterprise package', () => {
  it('separates provider labels while preserving model paths', async () => {
    const client = await readFile(path.join(projectRoot, 'packages/dsh-desktop-enterprise/client.js'), 'utf8')
    const body = client.match(/function modelDisplayParts\(displayName\) \{([\s\S]*?)\n    \}/)?.[1]
    expect(body).toBeDefined()
    const parts = new Function('displayName', body!)
    expect(parts('阿里云百炼 / kimi/kimi-k3')).toEqual({ provider: '阿里云百炼', name: 'kimi/kimi-k3' })
    expect(parts('volces / deepseek-v4-pro')).toEqual({ provider: 'volces', name: 'deepseek-v4-pro' })
    expect(parts('kimi/kimi-k3')).toEqual({ provider: '', name: 'kimi/kimi-k3' })
    expect(parts('custom / ')).toEqual({ provider: '', name: 'custom / ' })
  })

  it('marks models available when routing and their quota both allow use', async () => {
    const client = await readFile(path.join(projectRoot, 'packages/dsh-desktop-enterprise/client.js'), 'utf8')
    const body = client.match(/function isModelAvailable\(state, usage\) \{([\s\S]*?)\n    \}/)?.[1]
    expect(body).toBeDefined()
    const available = new Function('state', 'usage', body!)
    const usage = { quota_state: 'available', used: 5, limit: 10 }
    expect(available({ modelsAvailable: true }, usage)).toBe(true)
    expect(available({ modelsAvailable: false }, usage)).toBe(false)
    expect(available({ modelsAvailable: true }, undefined)).toBe(false)
    for (const update of [{ quota_state: 'unavailable' }, { quota_state: 'exhausted' }, { limit: 0 }, { used: 10 }, { used: 11 }, { used: null }]) {
      expect(available({ modelsAvailable: true }, { ...usage, ...update })).toBe(false)
    }
  })

  it('exports the declared Client bundle for the Harness module loader', async () => {
    const packageJson = JSON.parse(await readFile(
      path.join(projectRoot, 'packages', 'dsh-desktop-enterprise', 'package.json'),
      'utf8'
    )) as {
      dsh?: { client?: { inject?: string[] } }
      exports?: Record<string, unknown>
    }

    expect(packageJson.dsh?.client).toBeTruthy()
    expect(packageJson.dsh?.client).toMatchObject({
      inject: ['@deepseek-ai/dsh-client-locale', '@deepseek-ai/dsh-client-ui-settings', '@deepseek-ai/dsh-client-ui-settings-plugins']
    })
    expect(packageJson.exports?.['./client']).toBe('./client.js')
  })

  it('ships a syntactically valid Client module-loader bundle', async () => {
    const clientPath = path.join(
      projectRoot,
      'packages',
      'dsh-desktop-enterprise',
      'client.js'
    )

    await expect(execFileAsync(process.execPath, ['--check', clientPath])).resolves.toMatchObject({
      stderr: ''
    })
  })

  it('keeps the last BiSheng platform URL after enterprise sign-out', async () => {
    const client = await readFile(
      path.join(projectRoot, 'packages', 'dsh-desktop-enterprise', 'client.js'),
      'utf8'
    )

    expect(client).toContain('dshDesktopEnterprise.lastBase')
    expect(client).toContain('localStorage.setItem(LAST_BASE_KEY')
    expect(client).not.toContain("setBase('')")
  })

  it('opens the enterprise settings section when an enterprise login link arrives', async () => {
    const client = await readFile(
      path.join(projectRoot, 'packages', 'dsh-desktop-enterprise', 'client.js'),
      'utf8'
    )

    expect(client).toContain("const ENTERPRISE_SECTION_ID = 'enterprise-account'")
    expect(client).toContain("const OPEN_SETTINGS_SECTION_EVENT = 'dsh-desktop:open-settings-section'")
    expect(client).toContain('function openEnterpriseSettingsSection()')
    expect(client).toContain('new CustomEvent(OPEN_SETTINGS_SECTION_EVENT, { detail: { id: ENTERPRISE_SECTION_ID } })')
    expect(client).toContain('return bridge.onLoginLink(() => openEnterpriseSettingsSection())')
    expect(client).toContain('bridge.consumeLoginLink?.()')
    expect(client).toContain('void inspectDeepLink(url)')
    expect(client).toContain('id: ENTERPRISE_SECTION_ID')
    expect(client).toContain('confirmation && !connected')
  })

  it('keeps sign-in focused and shows model usage with hover percentages', async () => {
    const client = await readFile(
      path.join(projectRoot, 'packages', 'dsh-desktop-enterprise', 'client.js'),
      'utf8'
    )

    expect(client).not.toContain('copy.lead')
    expect(client).not.toContain('copy.disconnected')
    expect(client).not.toContain('copy.platformHint')
    expect(client).not.toContain('copy.sessionExpires')
    expect(client).toContain('MANUAL_FALLBACK_DELAY_MS')
    expect(client).toContain('setManualFallbackReady')
    expect(client).toContain("className: 'dshEnterpriseManual'")
    expect(client).toContain("autoComplete: 'one-time-code'")
    expect(client).toContain('/api/enterprise.login.manual')
    expect(client).toContain('identityTicket')
    expect(client).toContain("ticket: '一次性登录码'")
    expect(client).toContain("submitTicket: '完成登录'")
    expect(client).toContain("const inject = ['slots', 'locale']")
    expect(client).toContain("ctx.locale.register(NS, { zh, en })")
    expect(client).toContain("const t = ctx.locale.bind(NS)")
    expect(client).toContain("label: () => t('nav')")
    expect(client).toContain("nav: '企业账号'")
    expect(client).toContain("nav: 'Enterprise'")
    expect(client).toContain("title: 'Enterprise account'")
    expect(client).toContain("platform: '企业服务地址'")
    expect(client).toContain("platform: 'Enterprise service URL'")
    expect(client).not.toContain('navigator.language')
    expect(client).not.toContain('copy.manualTitle')
    expect(client).not.toContain('copy.manualHint')
    expect(client).not.toContain('copy.manualToggle')
    expect(client).not.toContain('manualExpanded')
    expect(client).not.toContain('dshEnterpriseManualToggle')
    expect(client).not.toContain('dshEnterpriseCard')
    expect(client).not.toContain("h('dt', null, copy.platform)")
    expect(client).not.toContain('copy.connected')
    expect(client).not.toContain('state.tenant?.name')
    expect(client).toContain("const userLabel = state?.user?.display_name || state?.user?.username || state?.user?.id || '—'")
    expect(client).not.toContain('state.usage)')
    expect(client).not.toContain("h('div', { className: 'dshEnterpriseCard' }, status, accountContent, errorPanel)")
    expect(client).toContain("state.modelUsage?.[model.id]")
    expect(client).toContain('.dshEnterpriseModels li:hover .dshEnterpriseModelUsageValue {')
    expect(client).toContain('.dshEnterpriseModels li:hover .dshEnterpriseModelUsagePercent {')
    expect(client).toContain('display: none;')
    expect(client).toContain('display: inline;')
    expect(client).toContain("className: 'dshEnterpriseModelUsageValue'")
    expect(client).toContain("className: 'dshEnterpriseModelUsagePercent'")
    expect(client).toContain('maximumFractionDigits: 1')
    const percentageBody = client.match(/function modelUsagePercentage\(usage, language, t\) \{([\s\S]*?)\n    \}/)?.[1]
    expect(percentageBody).toBeDefined()
    const formatPercentage = new Function('usage', 'language', 't', 'usageText', percentageBody!)
    expect(formatPercentage({ used: 10000, limit: 8000 }, 'zh-CN')).toBe('100%')
    expect(formatPercentage({ used: 4000, limit: 8000 }, 'zh-CN')).toBe('50%')
    const amountBody = client.match(/function tokenAmount\(value, language\) \{([\s\S]*?)\n    \}/)?.[1]
    expect(amountBody).toBeDefined()
    const formatAmount = new Function('value', 'language', amountBody!)
    expect(formatAmount(3326206, 'zh-CN')).toBe('332.62万')
    expect(formatAmount(1000000, 'zh-CN')).toBe('100万')
    expect(formatAmount(0, 'zh-CN')).toBe('0')
    expect(formatAmount(1, 'zh-CN')).toBe('<0.01万')
    expect(formatAmount(100, 'zh-CN')).toBe('0.01万')
    expect(formatAmount(1000000, 'en')).toBe('1M')
    expect(client).toContain("refresh: '刷新'")
    expect(client).toContain("learnMore: '了解企业版'")
    expect(client).toContain("learnMore: 'Learn about Enterprise'")
    expect(client).toContain("const LEARN_MORE_URL = 'https://dshdesktop.com/enterprise/deployment'")
    expect(client).toContain("className: 'dshEnterpriseLearnMoreShell'")
    expect(client).toContain("className: 'dshEnterpriseLearnMore'")
    expect(client).toContain("window.open(LEARN_MORE_URL, '_blank', 'noopener,noreferrer')")
    expect(client).toContain('.dshEnterpriseTitleRow {')
    expect(client).toContain('.dshEnterpriseTitleRow h2 {')
    expect(client).toContain('color: var(--dsw-alias-label-primary);')
    expect(client).toContain('font-size: 18px;')
    expect(client).toContain('font-weight: 600;')
    expect(client).toContain('.dshEnterpriseLearnMoreShell {')
    expect(client).toContain('color: var(--dsw-alias-label-primary);')
    expect(client).toContain('background: var(--dsw-alias-interactive-bg-hover);')
    expect(client).not.toContain("background: '#fff'")
    expect(client).not.toContain('body[data-ds-dark-theme] .dshEnterpriseLearnMoreShell')
    expect(client).toContain('border: 1px solid var(--ds-border, #ccd0d5);')
    expect(client).toContain("className: 'dshEnterpriseIconButton'")
    expect(client).toContain("'aria-label': t('refresh')")
    expect(client).toContain("h('span', { 'aria-hidden': 'true' }, '↻')")
    expect(client).toContain('.dshEnterpriseButton.login {')
    expect(client).toContain("className: 'dshEnterpriseButton login'")
    expect(client).toContain('disabled: busy || !base.trim()')
    expect(client).toContain("const inspected = await api('/api/enterprise.base.inspect', { base })")
    expect(client).toContain('inspected.insecurePrivateHttp')
    expect(client).toContain('confirmInsecurePrivateHttp: true')
    expect(client).toContain("insecureTitle: '确保服务地址可信'")
    expect(client).toContain("insecureLead: '登录信息会明文传输，确保以下服务地址由可信来源提供。'")
    expect(client).toContain("insecureConfirm: '确认为可信来源'")
    expect(client).toContain("insecureTitle: 'Make sure the service URL is trusted'")
    expect(client).toContain("insecureConfirm: 'Confirm as a trusted source'")
    expect(client).not.toContain("h('button', { className: 'dshEnterpriseButton primary', disabled: busy || !base.trim()")
    expect(client).toContain("seatRevoked: '席位已撤销'")
    expect(client).toContain("seatRevoked: 'Seat revoked'")
    expect(client).toContain('formatEnterpriseSettingsError(error, undefined, t)')
    expect(client).toContain('formatEnterpriseSettingsError(state?.error, state?.errorCode, t)')
    const errorBody = client.match(/function formatEnterpriseSettingsError\(failure, errorCode, t\) \{([\s\S]*?)\n    \}/)?.[1]
    expect(errorBody).toBeDefined()
    const formatSettingsError = new Function('failure', 'errorCode', 't', errorBody!) as (
      failure: unknown,
      errorCode: unknown,
      t: (key: string) => string
    ) => string
    const zhT = (key: string) => key === 'seatRevoked' ? '席位已撤销' : key
    const enT = (key: string) => key === 'seatRevoked' ? 'Seat revoked' : key
    expect(formatSettingsError('seat revoked', undefined, zhT)).toBe('席位已撤销')
    expect(formatSettingsError('seat revoked.', 'seat_revoked', zhT)).toBe('席位已撤销')
    expect(formatSettingsError('unknown upstream', 'seat_revoked', zhT)).toBe('席位已撤销')
    expect(formatSettingsError('账户额度不足，请联系服务商咨询用量限制。', undefined, zhT))
      .toBe('账户额度不足，请联系服务商咨询用量限制。')
    expect(formatSettingsError('seat revoked', undefined, enT)).toBe('Seat revoked')
  })

  it('waits for connection and llm before applying the Harness adapter', () => {
    expect(enterpriseInject).toEqual(['connection', 'llm'])
  })

  it('registers the chat adapter from settings state reads instead of waiting for the idle poll', async () => {
    const source = await readFile(
      path.join(projectRoot, 'packages', 'dsh-desktop-enterprise', 'index.js'),
      'utf8'
    )
    expect(source).toContain('ingestEnterpriseState(state)')
    expect(source).toContain('const delay = [\'authorizing\', \'refreshing\'].includes(latest.phase)')
    expect(source).not.toContain('!modelsAvailable ||')
  })

  it('does not override enterprise service inject from the desktop patch', async () => {
    const desktopPatch = (await readFile(
      path.join(projectRoot, 'build', 'dsh-desktop.patch.yml'),
      'utf8'
    )).replaceAll('\r\n', '\n')
    const start = desktopPatch.indexOf('- id: dsh-desktop-enterprise')
    expect(start).toBeGreaterThanOrEqual(0)
    const rest = desktopPatch.slice(start)
    const nextPlugin = rest.search(/\n[ \t]*- id:/u)
    const enterpriseBlock = nextPlugin === -1 ? rest : rest.slice(0, nextPlugin)
    expect(enterpriseBlock).toContain('name: dsh-desktop-enterprise')
    expect(enterpriseBlock).not.toMatch(/\binject:/u)
  })
})
