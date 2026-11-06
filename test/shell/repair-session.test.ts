import { describe, expect, it } from 'vitest'
import { RepairDrafts } from '../../src/main/repair-drafts'
import { applyRepairNavigation, REPAIR_SESSION_KEY } from '../../src/main/shell/repair-session'

describe('repair session navigation', () => {
  it('remembers the previous session and leaves an unsent draft', () => {
    const storage = new Map<string, string>([[REPAIR_SESSION_KEY, JSON.stringify({ sessionId: 'work-session' })]])
    const drafts = new RepairDrafts()
    applyRepairNavigation({
      storage: {
        getItem: key => storage.get(key) ?? null,
        setItem: (key, value) => { storage.set(key, value) },
        removeItem: key => { storage.delete(key) }
      },
      drafts,
      sessionId: 'repair-1',
      prompt: '请先说明结论。',
      rememberReturn: true,
      previousSessionId: 'old-repair'
    })
    expect(storage.get(REPAIR_SESSION_KEY)).toBe(JSON.stringify({ sessionId: 'repair-1' }))
    expect(storage.get('dsh.desktop.repair-return-navigation.v1')).toContain('work-session')
    const draft = drafts.get('repair-1')
    expect(draft.text).toBe('请先说明结论。')
    expect(typeof draft.token).toBe('string')
    expect(drafts.acknowledge('repair-1', draft.token ?? '')).toBe(true)
    expect(drafts.get('repair-1').text).toBeUndefined()
  })
})