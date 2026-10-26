import { describe, expect, it, vi } from 'vitest'
import { entryListProblem } from '@deepseek-ai/dsh-agent-preset-registry'
import { repairPlaybooks } from '../packages/dsh-desktop-client-ui/repair-playbooks.js'
import { apply } from '../packages/dsh-desktop-client-ui/index.js'
import { repairPresetDefinition, REPAIR_MANUAL } from '../packages/dsh-desktop-client-ui/repair-preset.js'

describe('bundled desktop repair mode', () => {
  it('retains all six detailed bilingual incident playbooks in the mode instructions', () => {
    expect(repairPlaybooks()).toHaveLength(6)
    for (const playbook of repairPlaybooks()) {
      expect(REPAIR_MANUAL).toContain(playbook.symptom.zh)
      expect(REPAIR_MANUAL).toContain(playbook.fix.en)
    }
    expect(REPAIR_MANUAL).toContain('healProfilesModuleFallbackLocked')
    expect(REPAIR_MANUAL).toContain('Never silently substitute uninstall for disable')
  })
  it.each(['darwin', 'win32'])('publishes a valid platform-specific composition on %s', platform => {
    const preset = repairPresetDefinition(platform)
    expect(preset.id).toBe('desktop-repair')
    expect(entryListProblem(preset.plugins)).toBeUndefined()
    expect(preset.plugins.find(row => row.id === 'tool-shell').name).toBe(
      platform === 'win32' ? '@deepseek-ai/dsh-tool-pwsh' : '@deepseek-ai/dsh-tool-bash'
    )
    expect(preset.plugins.find(row => row.id === 'persona').config.prefix).toBe(REPAIR_MANUAL)
    expect(preset.plugins.some(row => row.name === '@deepseek-ai/dsh-agent-instructions')).toBe(false)
  })

  it('owns registration through the host plugin lifecycle and releases it on unload', async () => {
    const dispose = vi.fn()
    const register = vi.fn(async () => dispose)
    let cleanup
    await apply({ inject: vi.fn(), agentPresets: { register }, effect: setup => { cleanup = setup() } })
    expect(register).toHaveBeenCalledOnce()
    expect(register.mock.calls[0][0].id).toBe('desktop-repair')
    expect(dispose).not.toHaveBeenCalled()
    await cleanup()
    expect(dispose).toHaveBeenCalledOnce()
  })

  it('does not pretend registration succeeded if the Harness cannot register the mode', async () => {
    await expect(apply({ inject: vi.fn(), agentPresets: { register: async () => { throw new Error('missing tool') } } })).rejects.toThrow('missing tool')
  })
})
