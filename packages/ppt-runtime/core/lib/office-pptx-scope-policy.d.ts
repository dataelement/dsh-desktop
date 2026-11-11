import type { Agent } from '@deepseek-ai/dsh-agent'

export interface OfficePptxScopePolicyController {
  /** Refresh source body/resources this prompt preparation; false removes policy. Absent ordinary Office is a no-op. */
  sync(agent: Agent, options: { active: boolean; cwd?: string; signal?: AbortSignal }): Promise<void>
  /** Remove all owned registrations and suppress late source lookup results. */
  dispose(): void
}

/** Create one plugin-owned controller; sync each agent before every prompt preparation. */
export function createOfficePptxScopePolicyController(): OfficePptxScopePolicyController

/** A body/resource snapshot owned by one existing agent scope. */
export interface OfficePptxScopePolicy {
  /** Remove the exact provider; safe to call again or after scope teardown. */
  dispose(): void
}

/**
 * Retain the effective office-pptx body/resources and existing user invocation
 * while hiding it from model invocation in this live Agent scope only.
 * Requires the newer Harness public scoped skill registry; does not install
 * itself into agent lifecycle events. Re-register after source/cwd changes.
 * Rejects absent/non-live Agents, duplicate policies, missing skills and cancellation.
 */
export function registerOfficePptxScopePolicy(
  agent: Agent,
  options?: { cwd?: string; signal?: AbortSignal },
): Promise<OfficePptxScopePolicy>
