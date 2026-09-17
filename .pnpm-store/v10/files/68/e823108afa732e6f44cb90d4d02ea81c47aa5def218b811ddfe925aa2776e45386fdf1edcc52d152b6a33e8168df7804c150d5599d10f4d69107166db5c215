/**
 * The market's card on the plugin configuration page (dsh >= 0.1.0-rc.7).
 *
 * It manages the market ITSELF — version, update, remove — when the current
 * profile owns the dependency. A host-provided market keeps only its version
 * display and download-region controls. This page is where a user goes to deal
 * with a plugin,
 * and "which version am I on / update it / get rid of it" is the part of
 * that anybody can act on without knowing how DSH is put together.
 *
 * `allowRestart` deliberately does NOT appear here. It exists for hosts
 * where a supervisor (systemd, launchd, pm2, Docker `restart: always`, a
 * desktop wrapper) owns the process, and its audience is whoever wrote that
 * deployment — a person already editing config, not someone browsing
 * settings. As a switch it read as jargon to everyone else, which is worse
 * than absent: a control you cannot evaluate is a control you cannot safely
 * touch. It remains a config option.
 *
 * ## Why the chrome is hand-built (again), and why it now matches
 *
 * The host's own contract is that "a plugin that ships a browser half owns
 * its own card" — the plugins tab only lays out a flex column and dispatches
 * `settings.plugin.item`. So the container IS ours to draw, and a value
 * import from `dsh-client-ui-settings-plugins` would fail the client
 * bundle-purity gate anyway.
 *
 * What the first version got wrong was drawing something of its own
 * invention: a flat, always-expanded box next to rows that collapse and
 * carry a chevron. The fix is not a different component — `DisclosureRow` is
 * 24px chrome for compact flow rows, a different thing — but the same design
 * tokens, laid out the way the host lays out `PluginCard`. Classes below
 * mirror it one for one, so the market stops looking like it wandered in
 * from another product.
 */

import { createElement as h, Fragment, useCallback, useEffect, useRef, useState } from 'react'
import type { ReactElement } from 'react'
import { Button, IconChevronDownOutline14, IconLoadingOutline16 } from '@deepseek-ai/dsh-client-ui-primitives'
import css from './Market.module.css'
import { api, applyGithubRouting } from './market-data.ts'
import type { MarketStatus } from './market-data.ts'
import type { Translate } from './market-data.ts'

/** Keys the market leaves in the browser; cleared when the user purges. */
const BROWSER_KEYS = ['dshm-webdav', 'dshm-gist-id'] as const

export interface SettingsCardProps {
  t: Translate
  /**
   * Retire the market's own entry in the left settings menu.
   *
   * Called once the package is gone. Leaving "插件市场" in the menu after
   * the user removed it is the card asserting something the profile no
   * longer agrees with — and the section behind it can no longer talk to a
   * server that has disposed its routes.
   */
  onRemoved?: () => void
}

type Channel = 'stable' | 'beta' | 'dev'
type Region = 'global' | 'china'

/** What api('/dsh-market/status') tells this card. */
interface SelfStatus {
  version: string | null
  restart: boolean
  channel: Channel
  /** The channels the SERVER offers; the card never invents its own list. */
  channels: Channel[]
  /** Which mirrors every outbound request uses. */
  region: Region
  /** The regions the SERVER offers, on the same principle as `channels`. */
  regions: Region[]
  /** The region came from the network check, not from the user. */
  regionAuto: boolean
  /** User-maintained fallback prefix, separate from the active learned route. */
  githubProxyCustom: string | null
  /** Environment-owned prefixes are visible but not editable. */
  githubProxyManaged: boolean
  /** Whether the profile package manager owns this market installation. */
  selfManaged: boolean
}

/** The subset of api('/dsh-market/status') this card reads. */
interface StatusBody {
  version?: string
  restart?: boolean
  channel?: string
  channels?: string[]
  region?: string
  regions?: string[]
  regionAuto?: boolean
  githubProxy?: string | null
  githubRoutes?: MarketStatus['githubRoutes']
  githubProxyCustom?: string | null
  githubProxyManaged?: boolean
  selfManaged?: boolean
}

/** What api('/dsh-market/updates') says about the market's own row. */
interface SelfUpdate {
  updateAvailable: boolean
  latest: string | null
  /** The channel points at this version, and it is not newer: a switch. */
  channelSwitch: string | null
  /** The current build came from a local package and must switch to the online release. */
  restoreRequired: boolean
}

type Phase = 'idle' | 'confirming' | 'working' | 'removed' | 'updated' | 'failed'

/** The market's own row as api('/dsh-market/updates') sends it. */
interface RawUpdate { updateAvailable?: boolean; latest?: string; channelSwitch?: string; restoreRequired?: boolean }

const CHANNELS: Channel[] = ['stable', 'beta', 'dev']
const asChannel = (value: unknown): Channel | null =>
  CHANNELS.includes(value as Channel) ? (value as Channel) : null

const CHANNEL_LABEL: Record<Channel, string> = {
  stable: 'setChannelStable', beta: 'setChannelBeta', dev: 'setChannelDev',
}
const CHANNEL_HINT: Record<Channel, string> = {
  stable: 'setChannelStableHint', beta: 'setChannelBetaHint', dev: 'setChannelDevHint',
}

const REGIONS: Region[] = ['global', 'china']
const asRegion = (value: unknown): Region | null =>
  REGIONS.includes(value as Region) ? (value as Region) : null

const REGION_LABEL: Record<Region, string> = {
  global: 'setRegionGlobal', china: 'setRegionChina',
}
const REGION_HINT: Record<Region, string> = {
  global: 'setRegionGlobalHint', china: 'setRegionChinaHint',
}

/**
 * Read the server's answer, taking the list of channels FROM it.
 *
 * The card does not decide which channels exist: the server is what accepts
 * or refuses a selection, so a card drawing its own list could only ever
 * disagree with it.
 */
function readStatus(body: StatusBody): SelfStatus {
  const offered = (body.channels ?? []).map(asChannel).filter((c): c is Channel => c !== null)
  const regions = (body.regions ?? []).map(asRegion).filter((r): r is Region => r !== null)
  return {
    version: body.version ?? null,
    restart: body.restart === true,
    channel: asChannel(body.channel) ?? 'stable',
    // A host too old to send the list still gets the two that predate it.
    channels: offered.length > 0 ? offered : ['stable', 'beta'],
    region: asRegion(body.region) ?? 'global',
    // A host with no region at all is a host from before this existed. It
    // downloads from the official sources, which is what `global` means, so
    // the row tells the truth about that host rather than hiding.
    regions: regions.length > 0 ? regions : REGIONS,
    regionAuto: body.regionAuto === true,
    githubProxyCustom: typeof body.githubProxyCustom === 'string' ? body.githubProxyCustom : null,
    githubProxyManaged: body.githubProxyManaged === true,
    selfManaged: body.selfManaged !== false,
  }
}

function readUpdate(own: RawUpdate): SelfUpdate {
  return {
    updateAvailable: own.updateAvailable === true,
    latest: own.latest ?? null,
    channelSwitch: own.channelSwitch ?? null,
    restoreRequired: own.restoreRequired === true,
  }
}

/**
 * Clear the market's browser-side leftovers.
 *
 * These are the only two things the market keeps in the browser, and the
 * server cannot reach either. Neither holds a credential — the WebDAV
 * password is never persisted and a Gist token is read from the environment,
 * never from disk — so this is tidiness, not a security step, and the copy
 * must not imply otherwise.
 */
export function clearBrowserState(storage: Pick<Storage, 'removeItem'>): void {
  for (const key of BROWSER_KEYS) {
    try { storage.removeItem(key) } catch { /* storage unavailable */ }
  }
}

export function SettingsCard({ t, onRemoved }: SettingsCardProps): ReactElement | null {
  const [open, setOpen] = useState(false)
  const [status, setStatus] = useState<SelfStatus | null>(null)
  const [update, setUpdate] = useState<SelfUpdate | null>(null)
  const [phase, setPhase] = useState<Phase>('idle')
  const [restoreConfirming, setRestoreConfirming] = useState(false)
  const [purge, setPurge] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [proxyEditing, setProxyEditing] = useState(false)
  const [proxyDraft, setProxyDraft] = useState('')
  const [proxySaving, setProxySaving] = useState(false)
  /**
   * The last self-update was refused by pnpm's fresh-release safety wait
   * (#39). Only the market's own card can update the market, so without a
   * retry here there is NO way to take a just-published version — the
   * discover list's retry button covers every plugin except this one (#255).
   */
  const [stale, setStale] = useState(false)

  // Only once the row is opened: the plugin configuration page renders every
  // card at once, and an update check costs a registry round trip.
  //
  // `open` is the ONLY dependency, and re-entry is guarded by a ref rather
  // than by `status`. Keying it on state the effect itself sets meant the
  // first `setStatus` re-ran the effect, whose cleanup dropped the still
  // in-flight update check — so the update row never appeared. Measured by
  // the spec, not reasoned about.
  const probed = useRef(false)
  useEffect(() => {
    if (!open || probed.current) return
    probed.current = true
    let live = true
    void (async () => {
      try {
        const response = await fetch(api('/dsh-market/status'), { cache: 'no-store' })
        const body = (await response.json()) as StatusBody
        if (live) setStatus(readStatus(body))
        applyGithubRouting(body)
      } catch {
        if (live) {
          setStatus({
            version: null, restart: false, channel: 'stable', channels: ['stable', 'beta'],
            region: 'global', regions: REGIONS, regionAuto: false,
            githubProxyCustom: null, githubProxyManaged: false, selfManaged: true,
          })
        }
      }
      try {
        const response = await fetch(api('/dsh-market/updates'), { cache: 'no-store' })
        const body = (await response.json()) as { updates?: Record<string, RawUpdate> }
        const own = body.updates?.['dshmarket'] ?? body.updates?.['dsh-market']
        if (live && own !== undefined) setUpdate(readUpdate(own))
      } catch { /* an update check that fails leaves the row without an offer */ }
    })()
    return () => { live = false }
  }, [open])

  const post = useCallback(async (path: string, payload: unknown): Promise<{ ok?: boolean; error?: string }> => {
    const response = await fetch(path, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    })
    return (await response.json()) as { ok?: boolean; error?: string }
  }, [])

  const onUpdate = useCallback((force = false) => {
    setRestoreConfirming(false)
    setPhase('working')
    setError(null)
    setStale(false)
    void (async () => {
      try {
        const body = await post(api('/dsh-market/update'), {
          name: 'dshmarket',
          ...(update?.restoreRequired === true ? { restore: true } : {}),
          ...(force ? { force: true } : {}),
        }) as {
          ok?: boolean; error?: string; stale?: boolean
        }
        if (body.ok === true) setPhase('updated')
        else {
          setStale(body.stale === true)
          setError(body.error ?? t('setSelfFailed'))
          setPhase('failed')
        }
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : String(cause))
        setPhase('failed')
      }
    })()
  }, [post, t, update?.restoreRequired])

  const onRemove = useCallback(() => {
    setPhase('working')
    setError(null)
    void (async () => {
      try {
        const body = await post(api('/dsh-market/self-uninstall'), { confirm: true, purge })
        if (body.ok === true) {
          if (purge) clearBrowserState(localStorage)
          setPhase('removed')
          onRemoved?.()
        } else { setError(body.error ?? t('setSelfFailed')); setPhase('failed') }
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : String(cause))
        setPhase('failed')
      }
    })()
  }, [onRemoved, post, purge, t])

  const busy = phase === 'working'
  const version = status?.version ?? null
  // A prerelease says so in its own version string; nothing else has to be
  // consulted to know the running build is one.
  const prerelease = version !== null && version.includes('-')

  /** Re-ask what this channel offers; the previous answer was for another one. */
  const refreshUpdate = useCallback(async (): Promise<void> => {
    const response = await fetch(api('/dsh-market/updates') + '?force=1', { cache: 'no-store' })
    const body = (await response.json()) as { updates?: Record<string, RawUpdate> }
    const own = body.updates?.['dshmarket'] ?? body.updates?.['dsh-market']
    setUpdate(own === undefined ? null : readUpdate(own))
  }, [])

  /**
   * Select a channel — and show the one the SERVER accepted.
   *
   * This used to move the control first and ignore the answer, which was
   * harmless while every channel was permitted. It stopped being harmless
   * the moment one of them can be refused: a 403 would have left "dev"
   * highlighted on a profile that is not on it.
   */
  const onChannel = useCallback((next: Channel) => {
    setError(null)
    void (async () => {
      try {
        const body = await post(api('/dsh-market/channel'), { channel: next }) as { ok?: boolean; error?: string; channel?: string }
        if (body.ok !== true) { setError(body.error ?? t('setSelfFailed')); return }
        setStatus(current => (current === null ? current : { ...current, channel: asChannel(body.channel) ?? next }))
        await refreshUpdate()
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : String(cause))
      }
    })()
  }, [post, refreshUpdate, t])

  /**
   * Select a download region — and show the one the SERVER accepted, on the
   * same reasoning as the channel above.
   *
   * A hand-made choice retires the one-time notice: the market no longer has
   * anything to explain once the user has answered for themselves.
   */
  const onRegion = useCallback((next: Region) => {
    setError(null)
    void (async () => {
      try {
        const body = await post(api('/dsh-market/region'), { region: next }) as { ok?: boolean; error?: string; region?: string }
        if (body.ok !== true) { setError(body.error ?? t('setSelfFailed')); return }
        const accepted = asRegion(body.region) ?? next
        setStatus(current => (current === null ? current : { ...current, region: accepted, regionAuto: false }))
        // Re-read the resolved proxy rather than deriving it here. The card
        // knows which regions exist because the server told it; it must not
        // start knowing what each one RESOLVES to, or the routing table would
        // have a second copy that can disagree with the first.
        try {
          const fresh = await fetch(api('/dsh-market/status'), { cache: 'no-store' })
          const status = (await fresh.json()) as StatusBody
          applyGithubRouting(status)
        } catch { /* images keep the previous route until the next load */ }
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : String(cause))
      }
    })()
  }, [post, t])

  /** Save or clear the single user-facing GitHub escape route. */
  const onGithubProxy = useCallback((proxy: string | null) => {
    setError(null)
    setProxySaving(true)
    void (async () => {
      try {
        const body = await post(api('/dsh-market/github-proxy'), { proxy }) as { ok?: boolean; error?: string }
        if (body.ok !== true) { setError(body.error ?? t('setSelfFailed')); return }
        const fresh = await fetch(api('/dsh-market/status'), { cache: 'no-store' })
        const statusBody = (await fresh.json()) as StatusBody
        setStatus(readStatus(statusBody))
        applyGithubRouting(statusBody)
        setProxyEditing(false)
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : String(cause))
      } finally {
        setProxySaving(false)
      }
    })()
  }, [post, t])

  /** One label + hint block with an optional action, the host's row shape. */
  const row = (label: string, hint: string, action: ReactElement | null): ReactElement =>
    h('div', { className: css.setRow },
      h('div', { className: css.setLabelBox },
        h('div', { className: css.setLabel }, label),
        h('div', { className: css.setHint }, hint),
      ),
      action,
    )

  // The end state REPLACES the controls rather than sitting beside them: the
  // package is gone from disk, so an update button next to "removed" would
  // offer something that cannot happen.
  const body = phase === 'removed'
    ? row(t('setSelfRemoved'), t('setSelfRemovedHint'), null)
    : h(Fragment, null,
        status?.selfManaged === true ? row(
          // An older offer is not an update, and calling it one would have
          // the user click "更新" to go backwards. It IS what picking an
          // earlier channel asked for, so it is offered — under its own name.
          update?.updateAvailable === true && update.latest !== null
            ? `${t('setSelfUpdateReady')} ${update.latest}`
            : update?.channelSwitch != null
              ? `${t('setChannelSwitch')} ${update.channelSwitch}`
              : t('setSelfUpToDate'),
          phase === 'updated'
            ? t('setSelfUpdatedHint')
            : update?.channelSwitch != null
              ? t('setChannelSwitchHint')
              // Explains what the Update button does — only worth saying
              // when that button is actually on screen. Already up to date,
              // it read as an instruction for an action that wasn't there.
              : update?.updateAvailable === true ? t('setSelfUpdateHint') : t('setSelfUpToDateHint'),
          phase === 'updated'
            ? null
            : update?.updateAvailable === true
              ? h(Button, {
                  variant: 'primary',
                  size: 'sm',
                  disabled: busy,
                  onClick: () => {
                    if (update.restoreRequired) setRestoreConfirming(true)
                    else onUpdate()
                  },
                }, update.restoreRequired ? t('restoreOnline') : t('setSelfUpdate'))
              : update?.channelSwitch != null
                ? h(Button, { variant: 'outline', size: 'sm', disabled: busy, onClick: () => onUpdate() }, t('setChannelSwitch'))
                : null,
        ) : null,
        status?.selfManaged === true && restoreConfirming
          ? h('div', { className: css.setConfirm },
              h('div', { className: css.setHint }, t('restoreHint')),
              h('div', { className: css.setActions },
                h(Button, {
                  variant: 'ghost', size: 'sm', onClick: () => { setRestoreConfirming(false) },
                }, t('setSelfCancel')),
                h(Button, {
                  variant: 'primary', size: 'sm', onClick: () => onUpdate(),
                }, t('restoreContinue')),
              ),
            )
          : null,
        status?.selfManaged === true ? row(t('setChannel'), t(CHANNEL_HINT[status.channel]),
          h('div', { className: css.setSeg },
            // Drawn from what the SERVER says is available, so the control
            // can never offer a channel the route would refuse.
            (status?.channels ?? ['stable', 'beta']).map(id => h('button', {
              key: id,
              type: 'button',
              className: status?.channel === id ? `${css.setSegBtn} ${css.setSegOn}` : css.setSegBtn,
              disabled: busy || status === null,
              // The dev option says what it is on hover rather than being
              // hidden behind a switch. A label a user can read beats a gate
              // plus the machinery that maintains it, and the row's own hint
              // repeats it in full once the channel is selected.
              title: id === 'dev' ? t('setChannelDevHint') : undefined,
              onClick: () => { onChannel(id) },
            }, t(CHANNEL_LABEL[id]))),
          )) : null,
        // Above the channel row and below the update row: this is about
        // getting plugins at all, which is the market's whole job, while the
        // channel is about which build of the market itself arrives.
        row(
          t('setRegion'),
          // The hint carries the explanation of an automatic choice when
          // there is one to make, and the plain description of the selected
          // region otherwise. One line either way — a notice that pushes the
          // description off screen would trade a permanent answer for a
          // temporary one.
          status?.regionAuto === true
            ? `${t(REGION_HINT[status.region])} ${t('setRegionAuto')}`
            : t(REGION_HINT[status?.region ?? 'global']),
          h('div', { className: css.setSeg },
            (status?.regions ?? REGIONS).map(id => h('button', {
              key: id,
              type: 'button',
              className: status?.region === id ? `${css.setSegBtn} ${css.setSegOn}` : css.setSegBtn,
              disabled: busy || status === null,
              onClick: () => { onRegion(id) },
            }, t(REGION_LABEL[id]))),
          )),
        row(
          t('setGithubProxy'),
          status?.githubProxyManaged === true
            ? t('setGithubProxyManagedHint')
            : status?.githubProxyCustom !== null && status?.githubProxyCustom !== undefined
              ? t('setGithubProxyCustomHint')
              : t('setGithubProxyAutoHint'),
          status?.githubProxyManaged === true
            ? null
            : status?.githubProxyCustom !== null && status?.githubProxyCustom !== undefined
              ? h('div', { className: css.setInlineActions },
                  h(Button, {
                    variant: 'outline', size: 'sm', disabled: proxySaving,
                    onClick: () => { setProxyDraft(status.githubProxyCustom ?? ''); setProxyEditing(true) },
                  }, t('setGithubProxyEdit')),
                  h(Button, {
                    variant: 'ghost', size: 'sm', disabled: proxySaving,
                    onClick: () => { onGithubProxy(null) },
                  }, t('setGithubProxyAuto')),
                )
              : h(Button, {
                  variant: 'outline', size: 'sm', disabled: status === null || proxySaving,
                  onClick: () => { setProxyDraft(''); setProxyEditing(true) },
                }, t('setGithubProxyCustom')),
        ),
        proxyEditing && status?.githubProxyManaged !== true
          ? h('div', { className: css.setProxyEditor },
              h('label', { className: css.setProxyLabel },
                t('setGithubProxyInput'),
                h('input', {
                  className: css.setProxyInput,
                  type: 'url',
                  value: proxyDraft,
                  placeholder: 'https://mirror.example',
                  'aria-label': t('setGithubProxyInput'),
                  disabled: proxySaving,
                  onChange: (event: { currentTarget: { value: string } }) => { setProxyDraft(event.currentTarget.value) },
                }),
              ),
              h('div', { className: css.setInlineActions },
                h(Button, {
                  variant: 'ghost', size: 'sm', disabled: proxySaving,
                  onClick: () => { setProxyEditing(false) },
                }, t('setSelfCancel')),
                h(Button, {
                  variant: 'primary', size: 'sm', disabled: proxySaving || proxyDraft.trim() === '',
                  onClick: () => { onGithubProxy(proxyDraft) },
                }, t('setGithubProxySave')),
              ),
            )
          : null,
        status?.selfManaged === true ? row(t('setSelfRemove'), t('setSelfRemoveHint'),
          phase === 'confirming' || busy
            ? null
            : h(Button, {
                variant: 'outline',
                size: 'sm',
                className: css.setDanger,
                disabled: busy,
                onClick: () => { setPhase('confirming') },
              }, t('setSelfRemove'))) : null,
        status?.selfManaged === true && (phase === 'confirming' || busy)
          ? h('div', { className: css.setConfirm },
              h('div', { className: css.setHint }, t('setSelfConfirm')),
              h('label', { className: css.setCheck },
                h('input', { type: 'checkbox', checked: purge, onChange: () => { setPurge(!purge) } }),
                h('span', null, t('setSelfPurge')),
              ),
              // States the consequence of the CURRENT choice, both ways. The
              // default keeps things, and what "keeping" costs — plugins the
              // market switched off stay off, with the UI that could switch
              // them back on about to disappear — is the part a user cannot
              // work out on their own.
              h('div', { className: css.setHint }, purge ? t('setSelfPurgeOn') : t('setSelfPurgeOff')),
              h('div', { className: css.setActions },
                busy
                  ? null
                  : h(Button, {
                      variant: 'ghost',
                      size: 'sm',
                      onClick: () => { setPhase('idle'); setPurge(false) },
                    }, t('setSelfCancel')),
                h(Button, {
                  variant: 'primary',
                  size: 'sm',
                  className: css.setDanger,
                  disabled: busy,
                  icon: busy ? h('span', { className: css.spin }, h(IconLoadingOutline16, { size: 16 })) : undefined,
                  onClick: onRemove,
                }, busy ? t('setSelfWorking') : t('setSelfRemoveConfirm')),
              ),
            )
          : null,
        error !== null ? h('div', { className: css.err }, error) : null,
        // The one place the market can be forced past pnpm's fresh-release
        // wait. Shown only after that specific refusal, never as a default:
        // the wait exists because a version published minutes ago can still
        // be unpublished (#39).
        stale
          ? h('div', { className: css.setActions },
              h(Button, { variant: 'primary', size: 'sm', onClick: () => onUpdate(true) }, t('updateNow')))
          : null,
      )

  return h('div', { className: open ? `${css.setCard} ${css.setCardOpen}` : css.setCard },
    h('button', {
      type: 'button',
      className: css.setHeader,
      'aria-expanded': open,
      onClick: () => { setOpen(!open) },
    },
      h('div', { className: css.setHeadText },
        h('div', { className: css.setName },
          t('nav'),
          version !== null ? h('span', { className: css.version }, ` v${version}`) : null,
          prerelease ? h('span', { className: css.setBetaTag }, t('setChannelBeta')) : null,
        ),
        h('div', { className: css.setDesc }, t('setCardDesc')),
      ),
      h('span', { className: open ? `${css.setChevron} ${css.setChevronOpen}` : css.setChevron },
        h(IconChevronDownOutline14, { size: 14 }),
      ),
    ),
    open ? h('div', { className: css.setBody }, body) : null,
  )
}
