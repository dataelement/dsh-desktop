/**
 * Custom plugin groups (Roadmap #60): user-defined named collections of
 * installed plugins whose enable/disable state can be switched as a unit —
 * borrowing the "group by capability, toggle as one" idea from Claude
 * Desktop's skill management. Membership lives in state.json and is the
 * only durable truth: a group's switch state is always derived from its
 * members and never persisted itself.
 *
 * Pure CRUD over the caller-owned state objects; routes.ts persists after
 * each mutation and applies the live toggles for the batch action.
 */

export type GroupAction = 'create' | 'rename' | 'delete' | 'set-members' | 'toggle'

/** The slices of market state group CRUD touches (routes.ts owns the rest). */
export interface GroupState {
  groups: Record<string, string[]>
  groupOrder: string[]
}

export interface GroupMutationResult {
  ok: boolean
  error?: string
}

/** Group names: letters/digits (incl. CJK), spaces, underscores, hyphens. */
const GROUP_NAME_RE = /^[\p{L}\p{N}_ -]{1,40}$/u

function isGroupName(value: unknown): value is string {
  return typeof value === 'string' && GROUP_NAME_RE.test(value)
}

export function createGroup(state: GroupState, name: unknown): GroupMutationResult {
  if (!isGroupName(name)) return { ok: false, error: 'invalid group name / 分组名称无效' }
  if (state.groups[name] !== undefined) return { ok: false, error: 'group already exists / 分组已存在' }
  state.groups[name] = []
  state.groupOrder.push(name)
  return { ok: true }
}

export function renameGroup(state: GroupState, name: unknown, newName: unknown): GroupMutationResult {
  if (typeof name !== 'string' || state.groups[name] === undefined) {
    return { ok: false, error: 'group not found / 分组不存在' }
  }
  if (!isGroupName(newName)) return { ok: false, error: 'invalid group name / 分组名称无效' }
  if (newName !== name && state.groups[newName] !== undefined) {
    return { ok: false, error: 'group already exists / 分组已存在' }
  }
  const members = state.groups[name]
  delete state.groups[name]
  state.groups[newName] = members
  const index = state.groupOrder.indexOf(name)
  if (index !== -1) state.groupOrder[index] = newName
  return { ok: true }
}

export function deleteGroup(state: GroupState, name: unknown): GroupMutationResult {
  if (typeof name !== 'string' || state.groups[name] === undefined) {
    return { ok: false, error: 'group not found / 分组不存在' }
  }
  delete state.groups[name]
  // Mutate in place: routes.ts hands over the LIVE groupOrder array, and the
  // response serializes that same array — replacing it here would orphan it.
  const index = state.groupOrder.indexOf(name)
  if (index !== -1) state.groupOrder.splice(index, 1)
  return { ok: true }
}

/**
 * Replace a group's membership. Only currently installed plugins can be
 * members — ghost names (uninstalled meanwhile) are dropped and duplicates
 * collapse, so the persisted list stays clean. Themes are exclusive: a group
 * may hold at most one theme plugin, mirroring the global one-active-theme
 * rule (only one theme can be enabled at a time).
 */
export function setGroupMembers(
  state: GroupState,
  name: unknown,
  members: unknown,
  installed: ReadonlySet<string>,
  themes: ReadonlySet<string>,
): GroupMutationResult {
  if (typeof name !== 'string' || state.groups[name] === undefined) {
    return { ok: false, error: 'group not found / 分组不存在' }
  }
  if (!Array.isArray(members)) return { ok: false, error: 'members must be an array / 成员必须是数组' }
  const kept: string[] = []
  const seen = new Set<string>()
  for (const member of members) {
    if (typeof member !== 'string' || member === '' || seen.has(member)) continue
    // The market itself never participates in groups (#60 assumptions).
    if (member === 'dsh-market' || member === 'dshmarket') continue
    seen.add(member)
    if (installed.has(member)) kept.push(member)
  }
  let themeCount = 0
  for (const member of kept) if (themes.has(member)) themeCount += 1
  if (themeCount > 1) {
    return { ok: false, error: 'a group can contain at most one theme / 每组最多一个主题' }
  }
  state.groups[name] = kept
  return { ok: true }
}

/** Drop `name` from every group (called after a successful uninstall). */
export function removeFromGroups(state: GroupState, name: string): void {
  for (const group of Object.keys(state.groups)) {
    const members = state.groups[group]
    if (members.includes(name)) state.groups[group] = members.filter(member => member !== name)
  }
}
