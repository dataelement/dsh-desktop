import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const html = readFileSync(join(process.cwd(), 'build', 'plugin-recovery.html'), 'utf8')

describe('plugin recovery page', () => {
  it('keeps the recovery surface focused on the next useful action', () => {
    expect(html).not.toContain('id="status"')
    expect(html).not.toContain('id="footer-note"')
    expect(html).not.toContain('处理完成后会自动返回 DSH Desktop')
    expect(html).not.toContain('DSH Desktop will reopen automatically when recovery is complete')
  })

  it('keeps diagnostics and exit access without offering a redundant restart', () => {
    expect(html).toContain('class="decision-row"')
    expect(html).not.toContain('id="restart"')
    expect(html.indexOf('id="primary"')).toBeLessThan(html.indexOf('id="safety-note"'))
    expect(html).toContain('id="advanced-label"')
    expect(html).toContain('id="show-log"')
    expect(html).toContain('id="quit"')
  })

  it('renders concise upgrade indicator directly on the plugin item without emojis', () => {
    expect(html).not.toContain('💡')
    expect(html).not.toContain('id="upgrade-card"')
    expect(html).toContain('plugin-upgrade')
    expect(html).toContain('该插件有新的兼容版本（${versionStr}）')
    expect(html).toContain("'卸载插件' : 'Uninstall plugin'")
  })

  it('offers the market its own repair actions without naming a version', () => {
    expect(html).toContain('const market = model.marketCheck')
    expect(html).toContain("navigate(model.marketCheck.upgradeLabel ? 'market-upgrade' : 'market-remove')")
    expect(html).toContain("navigate('market-remove')")
    expect(html).toContain('!model.canUninstall && !model.upgradeCandidate && !model.marketPrimary')
    expect(html).not.toMatch(/navigate\(`market-/)
  })

  it('renders the market row exactly like a third-party plugin row', () => {
    // Name only, green upgrade, neutral removal, no extra confirmation.
    expect(html).toContain('name.textContent = String(market.name)')
    expect(html).toContain("addMarketAction('market-upgrade', market.upgradeLabel, 'plugin-upgrade-btn')")
    expect(html).not.toContain('market-restore')
    expect(html).toContain("addMarketAction('market-remove', market.removeLabel, 'plugin-upgrade-btn plugin-remove-btn')")
    expect(html).not.toContain('removeConfirm')
  })
})
