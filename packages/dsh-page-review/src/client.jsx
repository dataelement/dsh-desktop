import { observeComposer } from './composer-compat.mjs'
import { t, configureLocale } from './locale.mjs'
import React, { useState, useEffect, useRef, useSyncExternalStore } from 'react'
import css from './style.css'
import { deliverPacket } from './packet.mjs'
import { SEARCH_ENGINES } from './address.mjs'
import { holdToBrowse, presentTemporaryBrowsing } from './interaction.mjs'
import { createFramePump } from './frames.mjs'
import {
  captureComposer,
  serializeComposerReferences,
  withComposerText,
  composerAttachments,
  retireComposer,
} from './composer.mjs'
import { createDirectSender } from './submission.mjs'
import { annotationPlacement } from './placement.mjs'
import { browserPage, createBrowserTabs } from './tabs.mjs'
import { annotationMessageRenderer } from './message.jsx'
import { webLink, createLinkOpener } from './links.mjs'
const BASE = '/api/page-review',
  KIND = 'page-review',
  TAB = 'dsh-page-review-tab'
export const inject = [
  'sessions',
  'slots',
  'sidebarRight',
  'sidebarRightTabs',
  'conversation',
  'inputTriggers',
  'resources',
  'locale',
]
const stores = new Map()
let sessionsService,
  conversationService,
  sidebarService,
  openBrowserLink,
  inputTriggersService
const tabBridges = new Map()
function inputShellFor(sid) {
  const scope =
    sessionsService.binding(sid)?.ctx || sessionsService.scope?.(sid)
  if (!scope) throw Error(t('the.composer.is.unavailable.reopen.this.chat'))
  return conversationService.input.for(scope)
}
function modelFor(sid) {
  if (!stores.has(sid)) {
    let state = {
      tabs: [],
      active: null,
      notes: [],
      history: [],
      visits: [],
      error: '',
      loaded: false,
      editRequest: null,
      sending: false,
      sendError: '',
    }
    const listeners = new Set()
    stores.set(sid, {
      get: () => state,
      set: (patch) => {
        state = { ...state, ...(tabBridges.get(sid)?.filter(patch) || patch) }
        for (const f of listeners) f()
      },
      subscribe: (f) => {
        listeners.add(f)
        return () => listeners.delete(f)
      },
    })
  }
  return stores.get(sid)
}
const imageURL = (sid, id) =>
  `${BASE}/capture?session=${encodeURIComponent(sid)}&id=${encodeURIComponent(id)}`
async function api(route, args, method = 'POST') {
  const res = await fetch(BASE + route, {
    method,
    headers: { 'content-type': 'application/json' },
    body: method === 'POST' ? JSON.stringify(args) : undefined,
    signal: AbortSignal.timeout(35000),
  })
  const result = await res.json()
  if (!res.ok || !result.ok) throw Error(result.error || t('request.failed'))
  return result.value
}
const get = (route, params) =>
  api(route + '?' + new URLSearchParams(params), null, 'GET')

function senderFor(sid) {
  const model = modelFor(sid)
  if (!model.sender)
    model.sender = createDirectSender({
      prepare: async () => {
        const shell = inputShellFor(sid),
          initial = captureComposer(shell.snapshot),
          scope =
            sessionsService.binding(sid)?.ctx || sessionsService.scope?.(sid),
          capture = await serializeComposerReferences(
            initial,
            initial.references.length
              ? inputTriggersService.sessionOf(scope)
              : null,
            AbortSignal.timeout(35000),
          )
        const prepared = await api('/prepare', {
          session: sid,
          ids: model.get().notes.map((n) => n.id),
        })
        const extras = await composerAttachments(
          conversationService,
          capture,
          sid,
          prepared.images.length,
        )
        return {
          ...withComposerText(prepared, capture),
          composer: capture,
          composerShell: shell,
          nativeExtras: extras,
        }
      },
      deliver: (packet, attempt) => {
        const binding = sessionsService.binding(sid),
          scope = binding?.ctx || sessionsService.scope?.(sid)
        return deliverPacket(
          binding?.session || (scope && sessionsService.sessionOf(scope)),
          packet,
          attempt,
          packet.nativeExtras,
        )
      },
      retire: (packet) =>
        retireComposer(
          packet.composer,
          packet.composerShell.snapshot,
          packet.composerShell.actions,
        ),
      ack: (packet) =>
        api('/ack', { session: sid, deliveryId: packet.deliveryId }),
      onStart: () => model.set({ sending: true, sendError: '' }),
      onSuccess: (state) =>
        model.set({ ...state, sendError: '', sentAt: Date.now() }),
      onError: (error) =>
        model.set({
          sendError:
            error.message ||
            t('sending.failed.annotations.and.draft.were.kept.retry'),
        }),
      onEnd: () => model.set({ sending: false }),
    })
  return model.sender
}
function sendComposer(sid) {
  void senderFor(sid)
    .send()
    .catch(() => {})
}

function Icon({ name, ...props }) {
  const paths = {
    external:
      'M14 3h7v7M21 3 10 14M10 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5',
    comment:
      'M5 4h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-6l-5 4v-4H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2ZM8 9h8M8 13h5',
    back: 'm14 5-7 7 7 7',
    forward: 'm10 5 7 7-7 7',
    refresh: 'M20 7v5h-5M20 12a8 8 0 1 0-2 6',
    plus: 'M12 5v14M5 12h14',
    close: 'm6 6 12 12M6 18 18 6',
    mark: 'm3 3 5 17 3-7 7-3Z',
    globe:
      'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM3 12h18M12 3c5 5 5 13 0 18-5-5-5-13 0-18Z',
    list: 'M9 6h12M9 12h12M9 18h12M3 6h1M3 12h1M3 18h1',
    send: 'M12 20V4m-6 6 6-6 6 6',
    edit: 'm15 4 5 5-10 10-6 1 1-6Z',
    trash: 'M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14M10 11v6M14 11v6',
    check: 'm5 12 4 4L19 6',
    image: 'M3 4h18v16H3ZM3 16l5-5 4 4 3-3 6 6M16 8h.01',
    history: 'M3 12a9 9 0 1 0 3-6M3 4v5h5M12 7v5l3 2',
    expand: 'M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5',
  }
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d={paths[name] || paths.globe} />
    </svg>
  )
}
function Tool({ title, icon, active, ...props }) {
  return (
    <button
      type="button"
      className={'pr-tool' + (active ? ' is-active' : '')}
      aria-label={title}
      title={title}
      {...props}
    >
      <Icon name={icon} />
    </button>
  )
}
function localDraft(sid, value) {
  try {
    if (value)
      localStorage.setItem('page-review:draft:' + sid, JSON.stringify(value))
    else localStorage.removeItem('page-review:draft:' + sid)
  } catch {}
}
function readDraft(sid) {
  try {
    return JSON.parse(
      localStorage.getItem('page-review:draft:' + sid) || 'null',
    )
  } catch {
    return null
  }
}
function savedSearchEngine() {
  try {
    const key = localStorage.getItem('page-review:search-engine')
    return SEARCH_ENGINES[key] ? key : 'bing'
  } catch {
    return 'bing'
  }
}
function draftKey(sid, pageId) {
  return sid + ':' + pageId
}
function bridgeFor(sid) {
  if (!tabBridges.has(sid)) {
    const model = modelFor(sid)
    tabBridges.set(
      sid,
      createBrowserTabs({
        sessionId: sid,
        kind: KIND,
        native: sidebarService,
        model,
        create: () =>
          api('/browser', { session: sid, kind: 'create', url: '' }),
        close: (tabId) =>
          api('/browser', { session: sid, kind: 'close', tabId }),
        hasDraft: (id) => Boolean(readDraft(draftKey(sid, id))),
        onError: (error) => model.set({ error: error.message }),
      }),
    )
  }
  return tabBridges.get(sid)
}
function BrowserTab(props) {
  const info = props.useTabInfo(),
    sid = props.sessionId,
    pageId = browserPage(info.tab.navigation.address, sid)
  const model = modelFor(sid),
    state = useSyncExternalStore(model.subscribe, model.get, model.get)
  useEffect(() => {
    let alive = true
    if (!model.get().loaded)
      get('/state', { session: sid })
        .then((value) => {
          if (alive) model.set({ ...value, loaded: true, error: '' })
        })
        .catch((e) => model.set({ error: e.message, loaded: true }))
    return () => {
      alive = false
    }
  }, [sid])
  useEffect(() => {
    if (!state.loaded) return
    const bridge = bridgeFor(sid)
    if (pageId) {
      bridge.adopt(info)
      return
    }
    void bridge.launch(info)
  }, [sid, pageId, state.loaded, info.tab.id])
  return pageId ? (
    <ReviewPanel key={sid + pageId} {...props} pageId={pageId} />
  ) : (
    <div className="pr-root">
      <div className="pr-opening">{state.error || t('opening.browser')}</div>
    </div>
  )
}
function BrowserTabTitle({ sessionId, useTabInfo }) {
  const info = useTabInfo(),
    model = modelFor(sessionId),
    state = useSyncExternalStore(model.subscribe, model.get, model.get)
  const id = browserPage(info.tab.navigation.address, sessionId),
    page = state.tabs.find((t) => t.id === id)
  return (
    <span className="pr-native-title" title={page?.url}>
      <Icon name="globe" />
      <span>{page?.title || t('new.tab')}</span>
    </span>
  )
}
function BrowserLinkEntry({ sessionId, useTabInfo }) {
  const info = useTabInfo(),
    [error, setError] = useState(''),
    started = useRef(null)
  useEffect(() => {
    const revision = info.tab.navigation.revision
    if (started.current === revision) return
    started.current = revision
    const url = info.tab.navigation.params?.url
    if (!webLink(url)) {
      info.tab.actions.openTab(KIND, { replaceTab: true })
      return
    }
    void openBrowserLink(sessionId, url, { replaceTab: info.tab.id }).catch(
      (e) => setError(e.message),
    )
  }, [sessionId, info.tab.navigation.revision])
  return (
    <div className="pr-root">
      <div className="pr-opening">{error || t('opening.page')}</div>
    </div>
  )
}
function ReviewPanel({ sessionId, useTabInfo, pageId }) {
  const tabInfo = useTabInfo?.(),
    visible = tabInfo?.tab.visible ?? true
  const sid = sessionId,
    model = modelFor(sid),
    shared = useSyncExternalStore(model.subscribe, model.get, model.get),
    state = { ...shared, active: pageId }
  const [frame, setFrame] = useState(null),
    [input, setInput] = useState(''),
    [busy, setBusy] = useState(false),
    [mode, setMode] = useState(false),
    [hover, setHover] = useState(null),
    [drag, setDrag] = useState(null)
  const [draft, setDraft] = useState(
      () =>
        readDraft(draftKey(sid, pageId)) ||
        ((!readDraft(sid)?.capture?.tabId && shared.active === pageId) ||
        readDraft(sid)?.capture?.tabId === pageId
          ? readDraft(sid)
          : null),
    ),
    [list, setList] = useState(false),
    [notice, setNotice] = useState(''),
    [discoveries, setDiscoveries] = useState(null),
    [history, setHistory] = useState(false)
  const [searchEngine, setSearchEngine] = useState(savedSearchEngine),
    [spaceHeld, setSpaceHeld] = useState(false)
  const root = useRef(null),
    spaceHeldRef = useRef(false),
    holdControl = useRef(null),
    hoverEpoch = useRef(0),
    interactionState = useRef(null)
  const editing = Boolean(draft) && !spaceHeld,
    annotationActive = mode || Boolean(draft),
    selecting = annotationActive && !spaceHeld
  const addressInput = useRef(null),
    startInput = useRef(null),
    remoteInput = useRef(null),
    viewport = useRef(null),
    image = useRef(null),
    frameRef = useRef(null),
    actionQueue = useRef(Promise.resolve()),
    hoverPending = useRef(false),
    hoverAt = useRef(0),
    wheel = useRef({ x: 0, y: 0, timer: null }),
    pointer = useRef(null),
    pickEpoch = useRef(0),
    pickPending = useRef(false),
    frameRefresh = useRef(null)
  const active = state.tabs.find((t) => t.id === state.active),
    startPage = !active || active.url === 'about:blank'
  interactionState.current = {
    enabled: annotationActive && visible && !state.sending && !startPage,
    hasDraft: Boolean(draft),
  }
  const chooseSearch = (value) => {
    setSearchEngine(value)
    try {
      localStorage.setItem('page-review:search-engine', value)
    } catch {}
  }
  useEffect(() => {
    if (visible && model.get().active !== pageId) {
      model.set({ active: pageId })
      void api('/browser', {
        session: sid,
        kind: 'select',
        tabId: pageId,
      }).catch((e) => model.set({ error: e.message }))
    }
  }, [visible, pageId, sid])
  useEffect(() => {
    setInput(startPage ? '' : active?.url || '')
    setFrame(null)
    frameRef.current = null
    setHover(null)
    if (startPage) setMode(false)
  }, [state.active, startPage])
  useEffect(() => {
    if (visible && startPage) startInput.current?.focus()
  }, [visible, startPage])
  useEffect(() => {
    localDraft(draftKey(sid, pageId), draft)
    if (readDraft(sid)?.capture?.tabId === pageId) localDraft(sid, null)
  }, [draft, sid, pageId])
  useEffect(() => {
    holdControl.current = holdToBrowse({
      root: root.current,
      surface: () => viewport.current?.querySelector('.pr-screen'),
      window,
      document,
      enabled: () => interactionState.current.enabled,
      remoteInput: () => remoteInput.current,
      onChange: (value) => {
        spaceHeldRef.current = value
        presentTemporaryBrowsing(root.current, value)
        if (remoteInput.current)
          remoteInput.current.readOnly =
            !value && interactionState.current.enabled
        if (value) {
          remoteInput.current?.focus({ preventScroll: true })
          frameRefresh.current?.()
        } else if (interactionState.current.hasDraft)
          root.current
            ?.querySelector('.pr-draft textarea')
            ?.focus({ preventScroll: true })
        setSpaceHeld(value)
      },
      onInterrupt: (paused) => {
        if (paused) {
          pointer.current = null
          pickEpoch.current++
          if (pickPending.current) {
            pickPending.current = false
            setBusy(false)
          }
        }
        hoverEpoch.current++
        hoverAt.current = 0
        setHover(null)
        setDrag(null)
      },
    })
    return () => {
      holdControl.current?.dispose()
      holdControl.current = null
    }
  }, [sid])
  useEffect(() => {
    if (!annotationActive || state.sending || !visible || startPage)
      holdControl.current?.release()
  }, [annotationActive, state.sending, visible, startPage])
  const fail = (e, errorSource = 'action') => {
    model.set({ error: e.message || String(e), errorSource })
    setBusy(false)
  }
  const browser = (kind, params = {}) => {
    const tabId = params.tabId || pageId
    const work = actionQueue.current
      .catch(() => {})
      .then(() =>
        api('/browser', { session: sid, kind, tabId, searchEngine, ...params }),
      )
      .then((value) => {
        model.set({ ...value, error: '' })
        frameRefresh.current?.()
        return value
      })
    actionQueue.current = work.catch(() => {})
    work.catch((e) => fail(e))
    return work
  }
  useEffect(() => {
    if (!state.active || startPage || !visible) return
    let cancelled = false
    const pump = createFramePump({
      read: async () => {
        if (document.visibilityState === 'hidden' || pickPending.current)
          return null
        const epoch = pickEpoch.current
        const f = await get('/frame', { session: sid, tab: state.active })
        return epoch === pickEpoch.current && !pickPending.current ? f : null
      },
      present: async (f) => {
        if (cancelled) return
        const current = model.get()
        if (
          f.browserState &&
          JSON.stringify(f.browserState) !==
            JSON.stringify({
              tabs: current.tabs,
              active: current.active,
              visits: current.visits,
            })
        )
          model.set(f.browserState)
        const previous = frameRef.current
        if (previous?.data !== f.data) {
          const loader = new Image()
          loader.src = 'data:image/jpeg;base64,' + f.data
          await loader.decode()
        }
        if (cancelled) return
        frameRef.current = f
        if (
          previous?.data !== f.data ||
          JSON.stringify(previous?.marks) !== JSON.stringify(f.marks) ||
          previous?.url !== f.url ||
          previous?.tabId !== f.tabId
        )
          setFrame(f)
        if (!pickPending.current) setBusy(false)
        if (model.get().errorSource === 'frame')
          model.set({ error: '', errorSource: null })
        if (document.activeElement?.getAttribute('data-pr-address') !== 'true')
          setInput(f.url)
      },
      onError: (e) => {
        if (!cancelled) fail(e, 'frame')
      },
      interval: () =>
        document.visibilityState === 'hidden'
          ? 1200
          : interactionState.current.hasDraft && !spaceHeldRef.current
            ? 750
            : 180,
    })
    frameRefresh.current = pump.request
    void pump.request()
    return () => {
      cancelled = true
      pump.stop()
      if (frameRefresh.current === pump.request) frameRefresh.current = null
    }
  }, [state.active, startPage, visible, sid])
  useEffect(
    () =>
      tabInfo?.tab.actions.bindCommands(
        active && !startPage && !draft
          ? {
              refresh: () => {
                browser('reload').catch(() => {})
              },
            }
          : {},
      ),
    [tabInfo?.tab.actions, state.active, startPage, Boolean(draft)],
  )
  useEffect(() => {
    const el = viewport.current
    if (!el || !state.active || !visible) return
    let timer
    const observer = new ResizeObserver((entries) => {
      const r = entries[0].contentRect
      clearTimeout(timer)
      timer = setTimeout(() => {
        if (r.width > 0 && r.height > 0)
          browser('viewport', { width: r.width, height: r.height }).catch(
            () => {},
          )
      }, 300)
    })
    observer.observe(el)
    return () => {
      observer.disconnect()
      clearTimeout(timer)
    }
  }, [state.active, sid, visible])
  useEffect(() => {
    const onKey = (e) => {
      if (!visible || e.defaultPrevented) return
      if (e.key === 'Escape') {
        if (draft) {
          if (draft.comment.trim()) {
            setNotice(t('annotation.not.saved.your.text.was.kept'))
            return
          }
          setDraft(null)
          return
        }
        setMode(false)
        setHover(null)
        setList(false)
        setHistory(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [draft, visible])
  const navigate = async (url = input) => {
    if (draft) {
      setNotice(t('save.or.cancel.the.current.annotation.first'))
      return
    }
    setBusy(true)
    setMode(false)
    try {
      await browser(active ? 'navigate' : 'create', { url })
      setDiscoveries(null)
    } catch {
    } finally {
      setBusy(false)
    }
  }
  const newTab = async () => {
    if (draft || state.sending) return
    setBusy(true)
    setDiscoveries(null)
    setMode(false)
    try {
      await browser('create', { url: '' })
    } catch {
    } finally {
      setBusy(false)
    }
  }
  const onBrowserShortcut = (e) => {
    if (!(e.metaKey || e.ctrlKey) || draft) return
    const key = e.key.toLowerCase()
    if (key === 'l') {
      e.preventDefault()
      e.stopPropagation()
      addressInput.current?.focus()
      addressInput.current?.select()
    } else if (key === 't') {
      e.preventDefault()
      e.stopPropagation()
      newTab()
    }
  }
  const pos = (e) => {
    const rect = image.current?.getBoundingClientRect(),
      f = frameRef.current
    if (!rect || !f) return null
    return {
      x: Math.max(
        0,
        Math.min(f.width - 1, ((e.clientX - rect.left) * f.width) / rect.width),
      ),
      y: Math.max(
        0,
        Math.min(
          f.height - 1,
          ((e.clientY - rect.top) * f.height) / rect.height,
        ),
      ),
    }
  }
  const pick = async (point, region) => {
    const epoch = ++pickEpoch.current
    pickPending.current = true
    setBusy(true)
    setHover(null)
    try {
      const capture = await api('/pick', {
        session: sid,
        tabId: state.active,
        ...point,
        region,
        frameURL: frameRef.current?.url,
      })
      if (epoch === pickEpoch.current)
        setDraft({ capture, anchor: point, comment: '', noteId: null })
    } catch (e) {
      if (epoch === pickEpoch.current) fail(e)
    } finally {
      if (epoch === pickEpoch.current) {
        pickPending.current = false
        setBusy(false)
        frameRefresh.current?.()
      }
    }
  }
  const onPointerDown = (e) => {
    if (!frameRef.current || (draft && !spaceHeldRef.current) || busy) return
    remoteInput.current?.focus({ preventScroll: true })
    const p = pos(e)
    if (!p) return
    pointer.current = {
      ...p,
      clientX: e.clientX,
      clientY: e.clientY,
      selecting: mode && !spaceHeldRef.current,
    }
    if (pointer.current.selecting) {
      e.preventDefault()
      e.currentTarget.setPointerCapture(e.pointerId)
    }
  }
  const onPointerMove = (e) => {
    if (!mode || spaceHeldRef.current || draft || !frame) return
    const p = pos(e)
    if (!p) return
    if (pointer.current) {
      const a = pointer.current
      setDrag({
        x: Math.min(a.x, p.x),
        y: Math.min(a.y, p.y),
        width: Math.abs(a.x - p.x),
        height: Math.abs(a.y - p.y),
      })
      return
    }
    if (hoverPending.current || Date.now() - hoverAt.current < 140) return
    hoverPending.current = true
    hoverAt.current = Date.now()
    const epoch = hoverEpoch.current
    api('/hover', { session: sid, tabId: state.active, ...p })
      .then((value) => {
        if (
          epoch === hoverEpoch.current &&
          !spaceHeldRef.current &&
          interactionState.current.enabled
        )
          setHover(value)
      })
      .catch(() => {})
      .finally(() => (hoverPending.current = false))
  }
  const onPointerUp = (e) => {
    if (
      !pointer.current ||
      busy ||
      (draft && !spaceHeldRef.current && pointer.current.selecting)
    )
      return
    const a = pointer.current,
      p = pos(e)
    pointer.current = null
    setDrag(null)
    if (!p) return
    if (a.selecting) {
      const region =
        Math.hypot(a.x - p.x, a.y - p.y) > 7
          ? {
              x: Math.min(a.x, p.x),
              y: Math.min(a.y, p.y),
              width: Math.abs(a.x - p.x),
              height: Math.abs(a.y - p.y),
            }
          : undefined
      void pick(
        region
          ? { x: region.x + region.width / 2, y: region.y + region.height / 2 }
          : p,
        region,
      )
    } else {
      const distance = Math.hypot(a.x - p.x, a.y - p.y)
      browser(distance > 5 ? 'drag' : 'click', {
        ...p,
        from: a,
        middle: e.button === 1,
        modifiers: [
          e.metaKey && 'Meta',
          e.ctrlKey && 'Control',
          e.shiftKey && 'Shift',
          e.altKey && 'Alt',
        ].filter(Boolean),
      }).catch(() => {})
    }
  }
  const onWheel = (e) => {
    if (
      (draft && !spaceHeldRef.current) ||
      e.target.closest?.('.pr-list,.pr-services,.pr-empty')
    )
      return
    e.preventDefault()
    wheel.current.x += e.deltaX
    wheel.current.y += e.deltaY
    if (!wheel.current.timer)
      wheel.current.timer = setTimeout(() => {
        const { x: dx, y: dy } = wheel.current
        wheel.current = { x: 0, y: 0, timer: null }
        browser('wheel', { dx, dy }).catch(() => {})
      }, 90)
  }
  useEffect(() => {
    const el = viewport.current
    if (!el) return
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => {
      el.removeEventListener('wheel', onWheel)
      clearTimeout(wheel.current.timer)
    }
  }, [draft?.capture?.id, state.active])
  const onKeyDown = (e) => {
    if (
      (e.target !== e.currentTarget && e.target !== remoteInput.current) ||
      (annotationActive && !spaceHeldRef.current) ||
      (draft && !spaceHeldRef.current) ||
      e.nativeEvent.isComposing
    )
      return
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'v') return
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'c') {
      e.preventDefault()
      browser('copy')
        .then((value) => navigator.clipboard.writeText(value.clipboard))
        .catch(fail)
      return
    }
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'a') {
      e.preventDefault()
      browser('key', { key: 'SelectAll' }).catch(() => {})
      return
    }
    if (
      [
        'Enter',
        'Tab',
        'Backspace',
        'Delete',
        'ArrowLeft',
        'ArrowRight',
        'ArrowUp',
        'ArrowDown',
        'Escape',
        'Home',
        'End',
        'PageUp',
        'PageDown',
      ].includes(e.key)
    ) {
      e.preventDefault()
      browser('key', { key: e.key }).catch(() => {})
    } else if (e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) {
      e.preventDefault()
      browser('text', { text: e.key }).catch(() => {})
    }
  }
  const saveNote = async () => {
    if (!draft?.comment.trim()) return
    setBusy(true)
    try {
      const value = await api('/note', {
        session: sid,
        captureId: draft.capture.id,
        id: draft.noteId,
        comment: draft.comment,
      })
      model.set({ ...value, error: '' })
      setDraft(null)
      setNotice(t('saved.select.another.element.to.add.a.comment'))
    } catch (e) {
      fail(e)
    } finally {
      setBusy(false)
    }
  }
  const editNote = async (note) => {
    if (note.document) {
      model.set({ editRequest: { id: crypto.randomUUID(), noteId: note.id } })
      sidebarService.openResourceIn(sid, note.document.resourceAddress)
      return
    }
    setDraft({
      capture: {
        id: note.captureId,
        tabId: note.tabId,
        element: note.element,
        url: note.url,
        rect: note.rect,
        width: note.width || 1100,
        height: note.height || 780,
      },
      comment: note.comment,
      noteId: note.id,
    })
    setList(false)
    setHistory(false)
  }
  const removeNote = async (note) => {
    try {
      model.set(
        await api('/note', { session: sid, kind: 'delete', id: note.id }),
      )
      setNotice(t('annotation.deleted'))
    } catch (e) {
      fail(e)
    }
  }
  const restoreNote = async (note) => {
    try {
      model.set(
        await api('/note', {
          session: sid,
          captureId: note.captureId,
          comment: note.comment,
        }),
      )
      setHistory(false)
      setList(true)
      setNotice(t('restored.to.pending.annotations'))
    } catch (e) {
      fail(e)
    }
  }
  const loadDiscover = async () => {
    setBusy(true)
    try {
      setDiscoveries(await get('/discover', {}))
    } catch (e) {
      fail(e)
    } finally {
      setBusy(false)
    }
  }
  useEffect(() => {
    const request = state.editRequest
    if (!request) return
    const note = state.notes.find((n) => n.id === request.noteId)
    if (!note || (request.pageId || note.tabId) !== pageId) return
    model.set({ editRequest: null })
    void editNote(note)
  }, [state.editRequest?.id])
  const frameStyle = (r) =>
    frame
      ? {
          left: `${(r.x / frame.width) * 100}%`,
          top: `${(r.y / frame.height) * 100}%`,
          width: `${(r.width / frame.width) * 100}%`,
          height: `${(r.height / frame.height) * 100}%`,
        }
      : {}
  const frozen = draft ? imageURL(sid, draft.capture.id) : null
  return (
    <div
      className="pr-root"
      data-browser-session={sid}
      data-browser-page={pageId}
      data-testid="page-review"
      ref={root}
      onKeyDownCapture={onBrowserShortcut}
    >
      <div className="pr-toolbar">
        <Tool
          title={t('back')}
          icon="back"
          disabled={!active?.canGoBack || busy || Boolean(draft)}
          onClick={() => browser('back').catch(() => {})}
        />
        <Tool
          title={t('forward')}
          icon="forward"
          disabled={!active?.canGoForward || busy || Boolean(draft)}
          onClick={() => browser('forward').catch(() => {})}
        />
        <Tool
          title={t('reload.page')}
          icon="refresh"
          disabled={!active || busy || Boolean(draft)}
          onClick={() => browser('reload').catch(() => {})}
        />
        <Tool
          title={t('browser.home')}
          icon="globe"
          disabled={!active || Boolean(draft)}
          onClick={() => navigate('about:blank')}
        />
        <form
          className="pr-address"
          onSubmit={(e) => {
            e.preventDefault()
            navigate()
          }}
        >
          <Icon name="globe" />
          <input
            ref={addressInput}
            aria-label={t('search.or.enter.a.url')}
            data-pr-address="true"
            placeholder={t('search.or.enter.a.url')}
            onFocus={(e) => e.target.select()}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={Boolean(draft)}
          />
          <button
            type="submit"
            aria-label={t('go')}
            disabled={!input.trim() || busy || Boolean(draft)}
          >
            ↵
          </button>
        </form>
        <button
          className={
            'pr-annotate' +
            (annotationActive ? ' active' : '') +
            (spaceHeld ? ' is-paused' : '')
          }
          aria-pressed={annotationActive}
          disabled={(!frame && !draft) || busy || editing}
          onClick={() => {
            setMode(!mode)
            setHover(null)
            setNotice('')
          }}
        >
          <Icon name="mark" />
          {annotationActive
            ? spaceHeld
              ? t('paused')
              : t('done')
            : t('annotate')}
        </button>
        <Tool
          title={t('annotations')}
          icon="list"
          active={list}
          disabled={!state.notes.length}
          onClick={() => {
            setHistory(false)
            setList(!list)
          }}
        />
        <Tool
          title={t('sent.annotations')}
          icon="history"
          active={history}
          disabled={!state.history.length}
          onClick={() => {
            setList(false)
            setHistory(!history)
          }}
        />
        <Tool
          title={t('open.in.external.browser')}
          icon="external"
          disabled={!webLink(active?.url)}
          onClick={() =>
            window.open(active.url, '_blank', 'noopener,noreferrer')
          }
        />
      </div>
      {(state.error || active?.error) && (
        <div className="pr-error" role="alert">
          <span>{state.error || active.error}</span>
          <button
            aria-label={t('dismiss.notice')}
            onClick={() => model.set({ error: '' })}
          >
            ×
          </button>
        </div>
      )}
      {notice && (
        <div className="pr-notice" role="status" onClick={() => setNotice('')}>
          {notice}
          <span>×</span>
        </div>
      )}
      <div
        className={
          'pr-viewport' +
          (selecting ? ' selecting' : '') +
          (spaceHeld ? ' temp-browsing' : '')
        }
        ref={viewport}
        tabIndex={0}
        aria-label={t(
          'web.preview.browse.to.interact.annotate.to.select.elements.or.regions',
        )}
        onKeyDown={onKeyDown}
        onPaste={(e) => {
          if (
            (e.target === e.currentTarget ||
              e.target === remoteInput.current) &&
            !(annotationActive && !spaceHeldRef.current) &&
            !(draft && !spaceHeldRef.current)
          ) {
            e.preventDefault()
            browser('text', { text: e.clipboardData.getData('text') }).catch(
              () => {},
            )
          }
        }}
        onCompositionEnd={(e) => {
          if (
            (e.target === e.currentTarget ||
              e.target === remoteInput.current) &&
            !(annotationActive && !spaceHeldRef.current) &&
            !(draft && !spaceHeldRef.current)
          ) {
            browser('text', { text: e.data }).catch(() => {})
            if (remoteInput.current) remoteInput.current.value = ''
          }
        }}
      >
        {active && (
          <textarea
            className="pr-remote-input"
            ref={remoteInput}
            tabIndex={-1}
            aria-label={t('web.keyboard.input')}
            readOnly={selecting || editing}
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
          />
        )}
        {startPage ? (
          <div className="pr-empty pr-browser-home">
            <div className="pr-empty-icon">
              <Icon name="globe" />
            </div>
            <h2>{t('browser')}</h2>
            <p>{t('search.the.web.or.enter.a.url')}</p>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                navigate()
              }}
            >
              <Icon name="globe" />
              <input
                ref={startInput}
                data-pr-address="true"
                aria-label={t('search.or.enter.a.url.28')}
                placeholder={t('search.terms.or.url')}
                value={input}
                onChange={(e) => setInput(e.target.value)}
              />
              <button disabled={!input.trim() || busy}>
                {busy ? t('opening') : t('go')} <span>→</span>
              </button>
            </form>
            <div className="pr-search-options">
              <label>
                {t('search.engine')}
                <select
                  aria-label={t('search.engine')}
                  value={searchEngine}
                  onChange={(e) => chooseSearch(e.target.value)}
                >
                  {Object.entries(SEARCH_ENGINES).map(([key, engine]) => (
                    <option key={key} value={key}>
                      {engine.name}
                    </option>
                  ))}
                </select>
              </label>
              <button className="pr-link" onClick={loadDiscover}>
                {busy ? t('discovering') : t('local.pages')}
              </button>
            </div>
            {state.visits.length > 0 && (
              <section className="pr-recent" aria-label={t('recent.pages')}>
                <h3>{t('recent.pages')}</h3>
                {state.visits.slice(0, 6).map((v) => (
                  <button key={v.url} onClick={() => navigate(v.url)}>
                    <Icon name="globe" />
                    <span>
                      <strong>{v.title}</strong>
                      <small>{new URL(v.url).host}</small>
                    </span>
                  </button>
                ))}
              </section>
            )}
            <small className="pr-browser-tip">
              {t(
                'to.discuss.this.page.with.the.model.choose.annotate.in.the.toolbar',
              )}
            </small>
          </div>
        ) : (
          <div
            className="pr-screen"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={() => {
              pointer.current = null
              setDrag(null)
            }}
          >
            {frame && (
              <img
                ref={image}
                src={'data:image/jpeg;base64,' + frame.data}
                alt={frame.title || t('web.preview')}
                draggable={false}
                onDragStart={(e) => e.preventDefault()}
              />
            )}
            {frozen && (
              <img
                className="pr-frozen"
                src={frozen}
                alt={t('selection.screenshot')}
                draggable={false}
              />
            )}
            {!frame && (
              <div className="pr-opening">
                <span className="pr-spinner" />
                {t('opening.page')}
              </div>
            )}
            {selecting && !draft && hover && !drag && (
              <div className="pr-highlight" style={frameStyle(hover.rect)}>
                <span>
                  {hover.element.tag}
                  {hover.element.name ? ' · ' + hover.element.name : ''}
                </span>
              </div>
            )}
            {selecting && !draft && drag && (
              <div className="pr-highlight" style={frameStyle(drag)} />
            )}
            {!draft &&
              !spaceHeld &&
              frame?.marks?.map((m) => (
                <button
                  key={m.id}
                  className="pr-pin"
                  style={{
                    left: `${(Math.max(0, m.x) / frame.width) * 100}%`,
                    top: `${(Math.max(0, m.y) / frame.height) * 100}%`,
                  }}
                  onPointerDown={(e) => e.stopPropagation()}
                  onPointerUp={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation()
                    const n = state.notes.find((n) => n.id === m.id)
                    if (n) editNote(n)
                  }}
                  aria-label={
                    t('edit.annotation') +
                    (state.notes.findIndex((n) => n.id === m.id) + 1)
                  }
                >
                  {state.notes.findIndex((n) => n.id === m.id) + 1}
                </button>
              ))}
          </div>
        )}
        {annotationActive && !editing && !busy && (
          <div className="pr-mode-hint">
            {spaceHeld
              ? t('browsing.interact.with.the.page')
              : t('select.an.element.or.drag.a.region')}
            <span>
              {spaceHeld
                ? t('release.space.to.resume.annotation')
                : t('hold.space.to.browse.esc.to.exit')}
            </span>
          </div>
        )}
        {busy && active && (
          <div className="pr-busy">
            <span className="pr-spinner" />
            {t('working')}
          </div>
        )}
        {draft && (
          <AnnotationEditor
            active={visible && !spaceHeld}
            draft={draft}
            viewportRef={viewport}
            busy={busy}
            onChange={(comment) => setDraft({ ...draft, comment })}
            onSave={saveNote}
            onCancel={() => setDraft(null)}
            onKeep={() =>
              setNotice(t('annotation.not.saved.your.text.was.kept'))
            }
          />
        )}
        {list && (
          <div
            className="pr-list"
            role="region"
            aria-label={t('pending.annotations')}
          >
            <div className="pr-list-head">
              <strong>
                {state.notes.length} {t('annotations.45')}
              </strong>
              <button
                onClick={() => setList(false)}
                aria-label={t('close.annotation.list')}
              >
                ×
              </button>
            </div>
            {state.notes.map((n, i) => (
              <article key={n.id}>
                <div className="pr-note-main">
                  <button className="pr-note-title" onClick={() => editNote(n)}>
                    <span className="pr-number">{i + 1}</span>
                    <span>
                      {n.element.tag} ·{' '}
                      {n.element.text?.slice(0, 42) ||
                        n.element.name ||
                        t('region')}
                    </span>
                  </button>
                  <p>{n.comment}</p>
                  <img
                    src={imageURL(sid, n.captureId)}
                    alt={t('annotation') + (i + 1) + t('screenshot')}
                    onClick={() => editNote(n)}
                  />
                  <div className="pr-note-actions">
                    <span>{n.document?.path || new URL(n.url).host}</span>
                    <button
                      onClick={() => editNote(n)}
                      aria-label={t('edit.annotation') + (i + 1)}
                    >
                      <Icon name="edit" />
                    </button>
                    <button
                      onClick={() => removeNote(n)}
                      aria-label={t('delete.annotation') + (i + 1)}
                    >
                      <Icon name="trash" />
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
        {history && (
          <div
            className="pr-list"
            role="region"
            aria-label={t('sent.annotations')}
          >
            <div className="pr-list-head">
              <strong>{t('sent.annotations')}</strong>
              <button
                onClick={() => setHistory(false)}
                aria-label={t('close.sent.annotations')}
              >
                ×
              </button>
            </div>
            <p className="pr-history-info">
              {t(
                'sent.means.accepted.by.the.conversation.if.the.model.fails.restore.the.annotations.and.retry',
              )}
            </p>
            {[...state.history].reverse().map((batch) => (
              <section key={batch.deliveryId}>
                <div className="pr-history-time">
                  {new Date(batch.sentAt).toLocaleString()}
                </div>
                {batch.notes.map((n, i) => (
                  <article key={n.id}>
                    <div className="pr-note-main">
                      <div className="pr-note-title">
                        <span className="pr-number">{i + 1}</span>
                        <span>
                          {n.element.tag} ·{' '}
                          {n.element.text?.slice(0, 42) || t('region')}
                        </span>
                      </div>
                      <p>{n.comment}</p>
                      <img
                        src={imageURL(sid, n.captureId)}
                        alt={t('sent.screenshot')}
                      />
                      <div className="pr-note-actions">
                        <span>{n.document?.path || new URL(n.url).host}</span>
                        <button onClick={() => restoreNote(n)}>
                          {t('restore.annotations')}
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </section>
            ))}
          </div>
        )}
        {discoveries !== null && (
          <div
            className="pr-services"
            role="dialog"
            aria-label={t('open.page')}
          >
            <div className="pr-list-head">
              <strong>{t('open.page')}</strong>
              <button
                aria-label={t('close.page.picker')}
                onClick={() => setDiscoveries(null)}
              >
                ×
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                setBusy(true)
                browser(active ? 'navigate' : 'create', { url: input })
                  .then(() => setDiscoveries(null))
                  .catch(() => {})
              }}
            >
              <input
                data-pr-address="true"
                aria-label={t('new.page.url')}
                placeholder={t('search.or.enter.a.url')}
                value={input}
                onChange={(e) => setInput(e.target.value)}
              />
              <button disabled={!input.trim()}>{t('open')}</button>
            </form>
            <button className="pr-link" onClick={loadDiscover}>
              {busy ? t('discovering') : t('find.local.pages')}
            </button>
            {discoveries.map((d) => (
              <button
                className="pr-service"
                key={d.url}
                onClick={() => {
                  setBusy(true)
                  browser(active ? 'navigate' : 'create', { url: d.url })
                    .then(() => setDiscoveries(null))
                    .catch(() => {})
                }}
              >
                <Icon name="globe" />
                <span>
                  <strong>{d.title}</strong>
                  <small>{d.url}</small>
                </span>
                <span>→</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
function AnnotationEditor({
  active,
  draft,
  viewportRef,
  busy,
  onChange,
  onSave,
  onCancel,
  onKeep,
}) {
  const popup = useRef(null),
    editor = useRef(null),
    [placement, setPlacement] = useState(null)
  useEffect(() => {
    const viewport = viewportRef.current,
      el = popup.current
    if (!viewport || !el) return
    const update = () => {
      const box = viewport.getBoundingClientRect()
      if (!box.width || !box.height) return
      const next = annotationPlacement({
        viewport: box,
        capture: draft.capture,
        popup: { width: 360, height: el.offsetHeight },
        point: draft.anchor,
      })
      setPlacement((old) =>
        JSON.stringify(old) === JSON.stringify(next) ? old : next,
      )
    }
    update()
    const observer = new ResizeObserver(update)
    observer.observe(viewport)
    observer.observe(el)
    return () => observer.disconnect()
  }, [draft.capture.id, viewportRef])
  React.useLayoutEffect(() => {
    if (active && placement) editor.current?.focus({ preventScroll: true })
  }, [draft.capture.id, Boolean(placement), active])
  const { side, arrow, ...position } = placement || {}
  return (
    <div className="pr-draft-layer">
      <div
        ref={popup}
        className="pr-draft"
        data-side={side}
        style={{ ...position, visibility: placement ? 'visible' : 'hidden' }}
        role="dialog"
        aria-label={t('element.annotation')}
      >
        {arrow && <span className="pr-draft-arrow" style={arrow} />}
        <div
          className="pr-draft-body"
          style={{ maxHeight: placement ? placement.maxHeight - 2 : undefined }}
        >
          <div className="pr-draft-head">
            <span>
              <Icon name="mark" />
              {draft.capture.element.tag}
              {draft.capture.element.name
                ? ' · ' + draft.capture.element.name
                : ''}
            </span>
            <button aria-label={t('cancel.annotation')} onClick={onCancel}>
              ×
            </button>
          </div>
          <div className="pr-draft-context">
            {draft.capture.element.text || t('selected.region')}
          </div>
          <textarea
            ref={editor}
            aria-label={t('requested.change')}
            placeholder={t('describe.how.you.would.like.to.change.this')}
            value={draft.comment}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => {
              e.stopPropagation()
              if (
                e.key === 'Enter' &&
                !e.shiftKey &&
                !e.nativeEvent.isComposing
              ) {
                e.preventDefault()
                onSave()
              }
              if (e.key === 'Escape') {
                e.preventDefault()
                if (draft.comment.trim()) onKeep()
                else onCancel()
              }
            }}
          />
          <div className="pr-draft-foot">
            <span>
              <Icon name="image" />
              {t('selection.screenshot.saved')}
            </span>
            <button disabled={!draft.comment.trim() || busy} onClick={onSave}>
              <Icon name="check" />
              {t('save')}
            </button>
          </div>
          <small>{t('enter.to.save.shift.enter.for.a.new.line')}</small>
        </div>
      </div>
    </div>
  )
}
function ComposerAnnotations({
  sessionId,
  useInput = () => null,
  useSession = () => null,
  onEdit,
}) {
  const model = modelFor(sessionId),
    state = useSyncExternalStore(model.subscribe, model.get, model.get)
  const input = useInput((s) => s),
    session = useSession((s) => s)
  const seat = useRef(null),
    trigger = useRef(null),
    popup = useRef(null),
    leaveTimer = useRef(null)
  const [expanded, setExpanded] = useState(false),
    [anchor, setAnchor] = useState({}),
    [native, setNative] = useState({ inline: false, disabled: true })
  const popupId = React.useId()
  const clearLeave = () => {
    clearTimeout(leaveTimer.current)
    leaveTimer.current = null
  }
  const position = () => {
    const rect = trigger.current?.getBoundingClientRect()
    if (!rect) return
    const width = Math.min(384, window.innerWidth - 24),
      above = rect.top >= 144
    setAnchor({
      width,
      left: Math.max(12, Math.min(rect.left, window.innerWidth - width - 12)),
      top: above ? rect.top - 4 : rect.bottom + 4,
      maxHeight: Math.min(
        320,
        above ? rect.top - 16 : window.innerHeight - rect.bottom - 16,
      ),
      transform: above ? 'translateY(-100%)' : 'none',
    })
  }
  const show = () => {
    clearLeave()
    position()
    if (!popup.current?.matches(':popover-open')) popup.current?.showPopover()
  }
  const close = (restore = false) => {
    clearLeave()
    popup.current?.hidePopover()
    if (restore) trigger.current?.focus({ preventScroll: true })
  }
  const leave = () => {
    clearLeave()
    leaveTimer.current = setTimeout(() => {
      if (!popup.current?.contains(document.activeElement)) close()
    }, 100)
  }
  useEffect(() => {
    let alive = true
    if (!model.get().loaded)
      get('/state', { session: sessionId })
        .then((value) => {
          if (alive) model.set({ ...value, loaded: true })
        })
        .catch(() => {})
    return () => {
      alive = false
      clearLeave()
    }
  }, [sessionId])
  useEffect(() => {
    if (!expanded) return
    window.addEventListener('resize', position)
    window.addEventListener('scroll', position, true)
    return () => {
      window.removeEventListener('resize', position)
      window.removeEventListener('scroll', position, true)
    }
  }, [expanded])
  useEffect(() => {
    const card = seat.current?.closest('[data-composer-card]')
    if (!card || !state.notes.length) return
    const capture = (e) => {
      if (
        !model.get().notes.length ||
        e.defaultPrevented ||
        e.repeat ||
        e.key !== 'Enter' ||
        e.shiftKey ||
        e.ctrlKey ||
        e.metaKey ||
        e.altKey ||
        e.isComposing ||
        e.keyCode === 229 ||
        !e.target.closest?.('[contenteditable="true"],[role="textbox"]')
      )
        return
      e.preventDefault()
      e.stopImmediatePropagation()
      if (native.disabled || state.sending || input?.phase !== 'plain') return
      close()
      sendComposer(sessionId)
    }
    card.addEventListener('keydown', capture, true)
    return () => card.removeEventListener('keydown', capture, true)
  }, [
    sessionId,
    Boolean(state.notes.length),
    native.disabled,
    state.sending,
    input?.phase,
  ])
  // Use the host's button styling and editor availability. An annotation-only
  // message must be sendable even when the host's plain-text draft is empty.
  useEffect(() => {
    const card = seat.current?.closest('[data-composer-card]')
    if (!card || !state.notes.length) return
    return observeComposer(seat.current, (next) =>
      setNative((old) =>
        old.inline === next.inline && old.disabled === next.disabled
          ? old
          : next,
      ),
    )
  }, [sessionId, Boolean(state.notes.length), input?.phase, session?.removed])
  if (!state.notes.length) return null
  const remove = async (note) => {
    try {
      model.set(
        await api('/note', { session: sessionId, kind: 'delete', id: note.id }),
      )
    } catch (error) {
      model.set({ sendError: error.message })
    }
  }
  return (
    <div className="pr-composer-accessory" ref={seat}>
      <button
        type="button"
        ref={trigger}
        className="pr-composer-chip"
        aria-label={t('view') + state.notes.length + t('annotations.70')}
        aria-haspopup="dialog"
        aria-expanded={expanded}
        aria-controls={popupId}
        onMouseEnter={show}
        onMouseLeave={leave}
        onClick={(e) => {
          show()
          if (e.detail === 0) popup.current?.querySelector('button')?.focus()
        }}
        onKeyDown={(e) => {
          if (e.key === 'Escape' && popup.current?.matches(':popover-open')) {
            e.preventDefault()
            e.stopPropagation()
            close(true)
            return
          }
          if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
            e.preventDefault()
            show()
            popup.current?.querySelector('button')?.focus()
          }
        }}
      >
        <Icon name="comment" />
        <span>
          {state.notes.length} {t('annotations.71')}
        </span>
      </button>
      <div
        id={popupId}
        ref={popup}
        popover="auto"
        role="dialog"
        aria-label={t('review.annotations')}
        className="pr-annotation-popover"
        style={anchor}
        onToggle={(e) => {
          setExpanded(e.newState === 'open')
          if (e.newState === 'closed') clearLeave()
        }}
        onMouseEnter={clearLeave}
        onMouseLeave={leave}
        onKeyDown={(e) => {
          e.stopPropagation()
          if (e.key === 'Escape') {
            e.preventDefault()
            close(true)
          }
        }}
      >
        <div className="pr-popover-head">
          <strong>
            {state.notes.length} {t('annotations.71')}
          </strong>
          <button
            type="button"
            aria-label={t('close.annotation.popover')}
            onClick={() => close(true)}
          >
            <Icon name="close" />
          </button>
        </div>
        <ol className="pr-annotation-items">
          {state.notes.map((note, i) => (
            <li key={note.id}>
              <span className="pr-annotation-index">{i + 1}.</span>
              <div className="pr-annotation-content">
                <div className="pr-annotation-target">
                  <Icon name="image" />
                  <code>{note.element.tag || t('region')}</code>
                  <span>
                    {note.element.text?.slice(0, 100) ||
                      note.element.name ||
                      t('selected.region')}
                  </span>
                </div>
                <p>{note.comment}</p>
                <img
                  className="pr-annotation-thumbnail"
                  src={imageURL(sessionId, note.captureId)}
                  alt={
                    t('annotation.74') + (i + 1) + t('selection.screenshot.75')
                  }
                />
                <details className="pr-annotation-evidence">
                  <summary>
                    {note.document ? t('file.location') : t('element.location')}
                  </summary>
                  <code>
                    {note.document?.regions?.length
                      ? t('page.p0', {
                          p0: note.document.regions
                            .map((r) => r.page)
                            .join('、'),
                        })
                      : note.document?.line
                        ? t('line.p0', { p0: note.document.line })
                        : note.element.selector || JSON.stringify(note.rect)}
                  </code>
                  <small>{note.document?.path || note.url}</small>
                </details>
              </div>
              <div className="pr-annotation-actions">
                <button
                  type="button"
                  aria-label={t('edit.annotation.80') + (i + 1)}
                  disabled={state.sending}
                  onClick={() => {
                    close()
                    onEdit(note.id)
                  }}
                >
                  <Icon name="edit" />
                </button>
                <button
                  type="button"
                  aria-label={t('delete.annotation.81') + (i + 1)}
                  disabled={state.sending}
                  onClick={() => remove(note)}
                >
                  <Icon name="trash" />
                </button>
              </div>
            </li>
          ))}
        </ol>
      </div>
      {state.sendError && (
        <div className="pr-composer-error" role="alert">
          {state.sendError}
          {t('annotations.kept.retry.sending')}
        </div>
      )}
      <button
        type="button"
        className={
          'pr-composer-submit' + (native.inline ? ' pr-composer-inline' : '')
        }
        aria-label={
          state.sending ? t('sending.annotations') : t('send.message')
        }
        title={state.sending ? t('sending') : t('send.message')}
        disabled={native.disabled || state.sending || session?.removed}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => {
          close()
          sendComposer(sessionId)
        }}
      >
        {state.sending ? <span className="pr-spinner" /> : <Icon name="send" />}
      </button>
    </div>
  )
}

export function apply(ctx) {
  configureLocale(ctx)
  const slots = ctx.get('slots'),
    tabs = ctx.get('sidebarRightTabs'),
    sidebar = ctx.get('sidebarRight')
  sessionsService = ctx.get('sessions')
  conversationService = ctx.get('conversation')
  inputTriggersService = ctx.get('inputTriggers')
  sidebarService = sidebar
  openBrowserLink = createLinkOpener({
    load: async (sid) => {
      const model = modelFor(sid)
      if (!model.get().loaded)
        model.set({ ...(await get('/state', { session: sid })), loaded: true })
    },
    read: (sid) => modelFor(sid).get(),
    create: async (sid, url) => {
      const value = await api('/browser', {
        session: sid,
        kind: 'create',
        url,
      })
      modelFor(sid).set(value)
      return value
    },
    select: async (sid, tabId) => {
      const value = await api('/browser', {
        session: sid,
        kind: 'select',
        tabId,
      })
      modelFor(sid).set(value)
      return value
    },
    show: (sid, id, placement) => bridgeFor(sid).open(id, placement),
  })
  ctx.effect(() =>
    sidebar.registerCloseHandler(KIND, (sid, tab) =>
      bridgeFor(sid).beforeClose(tab),
    ),
  )
  ctx.effect(() => () => {
    for (const bridge of tabBridges.values()) bridge.dispose()
    tabBridges.clear()
  })
  ctx.effect(() => {
    const id = 'dsh-page-review-css'
    if (document.getElementById(id)) return
    const style = document.createElement('style')
    style.id = id
    style.dataset.pluginCss = 'dsh-page-review'
    style.textContent = css
    document.head.append(style)
    return () => style.remove()
  })
  ctx.effect(() =>
    tabs.register({
      id: TAB,
      kind: KIND,
      priority: 'extension',
      keepMounted: true,
      patterns: ['dsh-resource://page-review/**'],
      title: () => t('new.tab'),
      guide: [
        {
          order: 1,
          title: () => t('browser'),
          description: () =>
            t(
              'browse.websites.and.send.screenshots.elements.and.comments.to.the.current.chat',
            ),
          icon: () => <Icon name="globe" />,
        },
      ],
    }),
  )
  // The host's Markdown delegate opens the conventional "browser" kind.
  ctx.effect(() =>
    tabs.register({
      id: TAB + '-links',
      kind: 'browser',
      priority: 'extension',
      multiple: true,
      title: () => t('browser'),
    }),
  )
  const locale = ctx.get('locale'),
    subscribe = locale.subscribe.bind(locale),
    snapshot = locale.getSnapshot.bind(locale)
  const localized = (Component) =>
    function Localized(props) {
      useSyncExternalStore(subscribe, snapshot, snapshot)
      return <Component {...props} />
    }
  const contribute = (name, id, Component, extra = {}) =>
    ctx.effect(() =>
      slots.inject(name, () =>
        slots.register(
          { name, id, locale: 'pageReview', ...extra },
          localized(Component),
        ),
      ),
    )
  contribute(
    'sidebar.right.pane.tab',
    TAB,
    (props) => <BrowserTab {...props} />,
    { key: TAB },
  )
  contribute(
    'sidebar.right.pane.tab.title',
    TAB + '-title',
    (props) => <BrowserTabTitle {...props} />,
    { key: TAB },
  )
  contribute(
    'sidebar.right.pane.tab',
    TAB + '-links',
    (props) => <BrowserLinkEntry {...props} />,
    { key: TAB + '-links' },
  )

  const ComposerNotes = (props) => (
    <ComposerAnnotations
      {...props}
      onEdit={async (noteId) => {
        const sid = props.sessionId,
          model = modelFor(sid),
          note = model.get().notes.find((n) => n.id === noteId)
        if (!note) return
        try {
          if (note.document) {
            model.set({ editRequest: { id: crypto.randomUUID(), noteId } })
            sidebar.openResourceIn(sid, note.document.resourceAddress)
            return
          }
          let pageId = note.tabId
          if (!model.get().tabs.some((t) => t.id === pageId)) {
            const value = await api('/browser', {
              session: sid,
              kind: 'create',
              url: note.url,
            })
            pageId = value.active
            model.set(value)
          }
          model.set({
            editRequest: { id: crypto.randomUUID(), noteId, pageId },
          })
          bridgeFor(sid).open(pageId)
        } catch (error) {
          model.set({ sendError: error.message })
        }
      }}
    />
  )
  contribute('conversation.input.accessory', 'page-review-notes', ComposerNotes)
  for (const key of ['user', 'steering'])
    ctx.effect(() =>
      slots.inject('conversation.chat.node', () => {
        const native = slots
          .entries('conversation.chat.node')
          .find((entry) => entry.options.key === key)
        if (!native) return
        return slots.register(
          {
            name: 'conversation.chat.node',
            key,
            priority: (native.options.priority ?? 0) - 10,
            locale: native.locale,
          },
          localized(annotationMessageRenderer(native.component)),
        )
      }),
    )
}
