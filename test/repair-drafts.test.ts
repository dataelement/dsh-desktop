import { expect, it } from 'vitest'
import { RepairDrafts } from '../src/main/repair-drafts'

it('keeps a session draft available until its exact token is acknowledged', () => {
  const drafts = new RepairDrafts()
  drafts.set('repair-one', 'Please diagnose the startup problem')
  const first = drafts.get('repair-one')
  expect(drafts.get('other-session')).toEqual({})
  expect(drafts.get('repair-one')).toEqual(first)
  expect(drafts.acknowledge('repair-one', 'stale-token')).toBe(false)
  drafts.set('repair-one', 'New problem description')
  expect(drafts.acknowledge('repair-one', first.token ?? '')).toBe(false)
  expect(drafts.get('repair-one').text).toBe('New problem description')
  expect(drafts.acknowledge('repair-one', drafts.get('repair-one').token ?? '')).toBe(true)
  expect(drafts.get('repair-one')).toEqual({})
})

it('rejects invalid text and session addresses without retaining them', () => {
  const drafts = new RepairDrafts()
  expect(() => drafts.set('../session', 'text')).toThrow()
  expect(() => drafts.set('session', '')).toThrow()
  expect(() => drafts.set('session', 'a'.repeat(16_001))).toThrow()
})
