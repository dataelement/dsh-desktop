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
export type GroupAction = 'create' | 'rename' | 'delete' | 'set-members' | 'toggle';
/** The slices of market state group CRUD touches (routes.ts owns the rest). */
export interface GroupState {
    groups: Record<string, string[]>;
    groupOrder: string[];
}
export interface GroupMutationResult {
    ok: boolean;
    error?: string;
}
export declare function createGroup(state: GroupState, name: unknown): GroupMutationResult;
export declare function renameGroup(state: GroupState, name: unknown, newName: unknown): GroupMutationResult;
export declare function deleteGroup(state: GroupState, name: unknown): GroupMutationResult;
/**
 * Replace a group's membership. Only currently installed plugins can be
 * members — ghost names (uninstalled meanwhile) are dropped and duplicates
 * collapse, so the persisted list stays clean. Themes are exclusive: a group
 * may hold at most one theme plugin, mirroring the global one-active-theme
 * rule (only one theme can be enabled at a time).
 */
export declare function setGroupMembers(state: GroupState, name: unknown, members: unknown, installed: ReadonlySet<string>, themes: ReadonlySet<string>): GroupMutationResult;
/** Drop `name` from every group (called after a successful uninstall). */
export declare function removeFromGroups(state: GroupState, name: string): void;
