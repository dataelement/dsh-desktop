import { expect, it } from 'vitest'
import { rollbackUnavailableDescription } from '../src/main/update/rollback-description'

it('explains missing history and unverified compatibility separately', () => {
  expect(rollbackUnavailableDescription('previous-installed-version-not-recorded', 'zh')).toContain('未记录')
  expect(rollbackUnavailableDescription('data-compatibility-unverified', 'zh')).toContain('兼容性')
  expect(rollbackUnavailableDescription('previous-version-archive-unavailable', 'en')).toContain('installer')
})

it('does not render arbitrary updater errors or local paths', () => {
  const reason = 'private error /Users/private/token'
  expect(rollbackUnavailableDescription(reason, 'en')).not.toContain(reason)
})
