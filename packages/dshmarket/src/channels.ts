/**
 * The market's release channels: which build of ITSELF it offers.
 *
 * Only the market follows this. Other plugins are never pulled from a
 * prerelease on the strength of a setting the user made about the market —
 * opting into early builds is volunteering to try THIS plugin early, not to
 * be handed every other author's unreleased work.
 *
 * The model lives in its own module because it is the part with rules
 * rather than plumbing: three channels, one of them hidden, a mapping to
 * npm dist-tags, and a resolution order that has already been got wrong
 * once (see `resolveChannel`).
 */

/** A channel the market can follow. */
export type Channel = 'stable' | 'beta' | 'dev'

/**
 * The npm dist-tag each channel installs from.
 *
 * `dev` is published straight from a branch with no git tag behind it, so a
 * version carries a timestamp and a short SHA (`1.15.0-dev.20260818-3f1432e`)
 * and is never reused. That is what makes a dev build disposable: nothing in
 * the repository's history refers to it.
 */
export const DIST_TAG: Record<Channel, string> = {
  stable: 'latest',
  beta: 'beta',
  dev: 'dev',
}

/**
 * Every channel a user may pick. All three, always.
 *
 * `dev` was behind a developer-mode switch for one version, on the reasoning
 * that a build published straight off a branch should not sit beside
 * "stable" looking like a third degree of caution. The switch cost more than
 * it bought: a stored mode, a route to change it, a rule for what happens to
 * a dev choice when it is turned off, and a control whose own purpose needed
 * explaining. A plainly labelled option a user can read is simpler than a
 * hidden one plus the machinery that hides it — the label does the work the
 * gate was doing.
 */
export const CHANNELS: readonly Channel[] = ['stable', 'beta', 'dev']

/** Narrow an untrusted value to a Channel, or null. */
export function asChannel(value: unknown): Channel | null {
  return value === 'stable' || value === 'beta' || value === 'dev' ? value : null
}

/**
 * Which channel applies right now.
 *
 * A choice on record always wins — including "stable" while a prerelease is
 * running, which is the only way back off a channel. Only the ABSENCE of a
 * choice is derived, and then from what is actually running: installing
 * `dshmarket@beta` by hand IS the subscription, and treating that as
 * "stable" costs updates rather than just clarity — on the stable channel
 * `latest` (1.13.1) is not newer than an installed 1.14.0-beta.1, so the
 * market answers "up to date" and the next beta is never offered.
 *
 * Which makes `undefined` load-bearing: it has to survive both the settings
 * schema (no `.default`) and state.json (field omitted) or "never chose"
 * silently becomes "chose stable".
 *
 */
export function resolveChannel(setting: Channel | undefined, version: string): Channel {
  if (setting !== undefined) return setting
  return version.includes('-') ? 'beta' : 'stable'
}
