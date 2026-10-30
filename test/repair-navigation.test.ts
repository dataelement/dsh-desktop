import { expect, it } from 'vitest'
import { REPAIR_NAVIGATION_KEYS, rememberRepairReturnNavigation, restoreRepairReturnNavigation } from '../src/main/repair-navigation'

function storage() {
  const values = new Map<string, string>()
  return {
    values,
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value) },
    removeItem: (key: string) => { values.delete(key) }
  }
}
const navigation = (id: string) => JSON.stringify({ sessionId: id, workspaceId: 'workspace' })

it('returns to both ordinary navigation locations and preserves repair draft and history', () => {
  const state = storage()
  for (const key of REPAIR_NAVIGATION_KEYS) state.setItem(key, navigation('ordinary'))
  rememberRepairReturnNavigation(state, 'repair')
  for (const key of REPAIR_NAVIGATION_KEYS) state.setItem(key, navigation('repair'))
  state.setItem('dsh.conversation.repair', 'unsent draft')
  state.setItem('history', 'repair history')
  rememberRepairReturnNavigation(state, 'repair')
  expect(restoreRepairReturnNavigation(state, 'repair')).toBe(true)
  for (const key of REPAIR_NAVIGATION_KEYS) expect(state.getItem(key)).toBe(navigation('ordinary'))
  expect(state.getItem('dsh.conversation.repair')).toBe('unsent draft')
  expect(state.getItem('history')).toBe('repair history')
})

it('clears both legacy repair pointers when no earlier normal navigation was captured', () => {
  const state = storage()
  for (const key of REPAIR_NAVIGATION_KEYS) state.setItem(key, navigation('repair'))
  expect(restoreRepairReturnNavigation(state, 'repair')).toBe(true)
  for (const key of REPAIR_NAVIGATION_KEYS) expect(state.getItem(key)).toBeNull()
})

it('leaves a deliberately selected ordinary session alone', () => {
  const state = storage()
  for (const key of REPAIR_NAVIGATION_KEYS) state.setItem(key, navigation('ordinary'))
  const before = [...state.values]
  expect(restoreRepairReturnNavigation(state, 'repair')).toBe(false)
  expect([...state.values]).toEqual(before)
})
