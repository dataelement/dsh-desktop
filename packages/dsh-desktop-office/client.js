window.__ModuleLoader__.load({ id: 'dsh-desktop-office', factory: require => {
  const React = require('react'), h = React.createElement
  const NS = 'desktop-office', EVENT = 'dsh-office-mode-change', staged = '@staged'
  const zh = { templates: '选择案例', preview: '查看案例', use: '做同款', close: '关闭预览', previous: '上一页', next: '下一页',
    select: '选用案例', loading: '正在加载…', retry: '重新加载', remove: '取消选择案例', selected: '已选案例',
    page: '第 {page} 页，共 {total} 页', spread: '第 {start}–{end} 页，共 {total} 页', pageNumber: '第 {page} 页', previousSpread: '上一组', nextSpread: '下一组', expired: '案例已更新，请重新选择',
    empty: '暂无案例' }
  const en = { templates: 'Choose an example', preview: 'Preview example', use: 'Use this example', close: 'Close preview', previous: 'Previous page', next: 'Next page',
    select: 'Select example', loading: 'Loading…', retry: 'Retry', remove: 'Remove example', selected: 'Selected example',
    page: 'Page {page} of {total}', spread: 'Pages {start}–{end} of {total}', pageNumber: 'Page {page}', previousSpread: 'Previous spread', nextSpread: 'Next spread', expired: 'This example was updated. Choose it again.',
    empty: 'No examples available' }
  const empty = Object.freeze({ templates: [], mode: null, selectedTemplateId: null, loaded: false, loading: false, busy: false, error: '' })
  const keyOf = id => id || staged
  const announce = (sessionId, mode) => window.dispatchEvent(new CustomEvent(EVENT, { detail: { sessionId, mode, origin: 'office' } }))

  class OfficeStore {
    constructor(connection) { this.connection = connection; this.states = new Map(); this.listeners = new Map(); this.revisions = new Map(); this.requests = new Map(); this.adopted = new Set() }
    snapshot(id) { return this.states.get(keyOf(id)) ?? empty }
    subscribe(id, listener) { const key = keyOf(id); const set = this.listeners.get(key) ?? new Set(); set.add(listener); this.listeners.set(key, set); return () => { set.delete(listener); if (!set.size) this.listeners.delete(key) } }
    update(id, change) { const key = keyOf(id); this.states.set(key, { ...this.snapshot(id), ...change }); for (const listener of this.listeners.get(key) ?? []) listener() }
    bump(id) { const key = keyOf(id), value = (this.revisions.get(key) ?? 0) + 1; this.revisions.set(key, value); return value }
    async call(id, endpoint, payload = {}, signal) {
      const timeout = AbortSignal.timeout(10_000)
      const combined = signal ? AbortSignal.any([timeout, signal]) : timeout
      const result = await this.connection.rpc.call('/api', 'office-templates', { endpoint, ...(id ? { sessionId: id } : {}), ...payload }, combined)
      combined.throwIfAborted()
      if (!result.ok) throw new Error(result.error.message)
      return result.value
    }
    async load(id, force = false) {
      const key = keyOf(id)
      if (this.requests.has(key) || this.snapshot(id).busy || (!force && this.snapshot(id).loaded && !this.snapshot(id).error)) return
      const revision = this.bump(id), controller = new AbortController()
      this.requests.set(key, controller); this.update(id, { loading: true, error: '' })
      try {
        let state = await this.call(id, 'state', {}, controller.signal)
        if (this.revisions.get(key) !== revision) return
        const local = this.snapshot(), selected = local.selectedTemplateId
        if (id && !this.adopted.has(id) && local.engaged && local.mode && !state.mode && !state.presentationMode) {
          state = await this.call(id, 'mode', { mode: local.mode }, controller.signal)
          if (selected) state = await this.call(id, 'select', { templateId: selected, revision: local.templates.find(item => item.id === selected)?.revision }, controller.signal)
          if (this.revisions.get(key) !== revision) return
          announce(id, state.mode)
        }
        if (id) { this.adopted.add(id); if (local.engaged) { this.bump(); this.update(undefined, { mode: null, selectedTemplateId: null, engaged: false }) } }
        this.update(id, { ...state, ...(!id && this.snapshot(id).engaged ? { mode: this.snapshot(id).mode, selectedTemplateId: this.snapshot(id).selectedTemplateId } : {}), loaded: true, loading: false, error: '' })
      } catch (error) {
        if (this.revisions.get(key) === revision) this.update(id, { loading: false, error: error.message })
      } finally { if (this.requests.get(key) === controller) this.requests.delete(key) }
    }
    async mutate(id, endpoint, payload) {
      if (this.snapshot(id).busy || this.snapshot(id).loading) return false
      const revision = this.bump(id), key = keyOf(id)
      if (!id) {
        this.update(id, endpoint === 'mode' ? { mode: payload.mode, selectedTemplateId: null, engaged: true, error: '' }
          : { selectedTemplateId: endpoint === 'select' ? payload.templateId : null, engaged: true, error: '' })
        announce(id, this.snapshot(id).mode); return true
      }
      this.update(id, { busy: true, error: '' })
      try {
        const state = await this.call(id, endpoint, payload)
        if (this.revisions.get(key) !== revision) return false
        this.update(id, { ...state, loaded: true, busy: false, error: '' }); announce(id, state.mode); return true
      } catch (error) { if (this.revisions.get(key) === revision) this.update(id, { busy: false, error: error.message }); return false }
    }
    syncPpt(detail) {
      if (detail.origin !== 'ppt') return
      const id = detail.sessionId
      this.requests.get(keyOf(id))?.abort(); this.requests.delete(keyOf(id))
      this.bump(id); this.update(id, { mode: null, selectedTemplateId: null, engaged: false, busy: false, loading: false, error: '' })
      void this.load(id, true)
    }
    reset() { for (const request of this.requests.values()) request.abort(); this.requests.clear(); for (const key of this.states.keys()) { this.bump(key); this.update(key, { loaded: false, loading: false, busy: false }); void this.load(key === staged ? undefined : key, true) } }
    dispose() { for (const request of this.requests.values()) request.abort(); this.requests.clear(); this.listeners.clear() }
  }
  function useOffice(store, sessionId) {
    const state = React.useSyncExternalStore(listener => store.subscribe(sessionId, listener), () => store.snapshot(sessionId), () => store.snapshot(sessionId))
    React.useEffect(() => { void store.load(sessionId) }, [store, sessionId])
    return state
  }
  const titleOf = (item, t) => t('preview') === en.preview ? item.titleEn ?? item.title : item.title

  function Thumbnail({ item }) {
    const ratio = item.pageAspectRatios[0], excel = item.mode === 'excel'
    const frameRatio = excel ? 16 / 9 : ratio < 1 ? ratio * 2 : ratio
    // Fill the landscape frame with the top half of a sheet, beginning at its header.
    const sheetStyle = excel ? { width: `${Math.max(100, ratio * 2 / frameRatio * 100)}%`, height: 'auto' } : undefined
    return h('span', { className: 'dso-thumbnail', style: { aspectRatio: frameRatio } },
      h('img', { src: item.thumbnail, style: sheetStyle, alt: '', loading: 'lazy', draggable: false }))
  }

  function TemplateCard({ item, selected, busy, t, choose, preview }) {
    return h('article', { className: 'dso-card', 'data-office-template': item.id, 'data-selected': selected },
      h('button', { type: 'button', className: 'dso-card-select', disabled: busy, 'aria-pressed': selected,
        'aria-label': `${t('select')} ${titleOf(item, t)}`, onClick: () => choose(item) },
        h('span', { className: 'dso-cover', 'data-mode': item.mode }, h(Thumbnail, { item })),
        h('span', { className: 'dso-card-name' }, titleOf(item, t))),
      h('button', { type: 'button', className: 'dso-card-preview', disabled: busy, 'aria-label': `${t('preview')} ${titleOf(item, t)}`, onClick: () => preview(item) },
        h('svg', { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, 'aria-hidden': true },
          h('path', { d: 'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z' }), h('circle', { cx: 12, cy: 12, r: 3 }))))
  }

  // Share the existing Composer seat geometry used by the PPT chooser.
  function useDockGeometry(root, panel, visible) {
    React.useLayoutEffect(() => {
      if (!visible || !root.current || !panel.current) return
      const element = root.current, body = element.closest('[data-conversation-scroll]')
      const card = element.closest('[data-composer-seat]')?.querySelector('[data-composer-card]')
      if (!body || !card) return
      const sync = () => {
        const bodyRect = body.getBoundingClientRect(), cardRect = card.getBoundingClientRect()
        element.style.setProperty('--dso-dock-width', `${Math.min(cardRect.width, bodyRect.width)}px`)
        element.style.setProperty('--dso-dock-height', `${Math.max(200, Math.floor(bodyRect.bottom - panel.current.getBoundingClientRect().top - 12))}px`)
      }
      const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(sync) : null
      observer?.observe(body); observer?.observe(card)
      window.addEventListener('resize', sync)
      const frame = window.requestAnimationFrame(sync)
      return () => {
        window.cancelAnimationFrame(frame); observer?.disconnect(); window.removeEventListener('resize', sync)
        element.style.removeProperty('--dso-dock-width'); element.style.removeProperty('--dso-dock-height')
      }
    }, [root, panel, visible])
  }

  function Preview({ item, store, sessionId, t, choose, close, busy, actionError }) {
    const dialog = React.useRef(), stage = React.useRef(), opener = React.useRef(document.activeElement), active = React.useRef(true)
    const [page, setPage] = React.useState(1), [preview, setPreview] = React.useState(null), [error, setError] = React.useState(''), [retry, setRetry] = React.useState(0)
    const [bounds, setBounds] = React.useState({ width: 0, height: 0 })
    const spread = item.pages > 1, step = spread ? 2 : 1, endPage = Math.min(page + step - 1, item.pages)
    React.useEffect(() => { if (stage.current) { stage.current.scrollTop = 0; stage.current.scrollLeft = 0 } }, [page])
    React.useEffect(() => { active.current = true; const element = dialog.current; element.showModal(); element.querySelector('button')?.focus(); return () => { active.current = false; element.close(); if (opener.current?.isConnected) opener.current.focus() } }, [])
    React.useLayoutEffect(() => {
      if (!spread) return
      const element = stage.current
      const measure = () => { const width = element.clientWidth, height = element.clientHeight; setBounds(old => old.width === width && old.height === height ? old : { width, height }) }
      measure()
      const observer = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(measure)
      observer?.observe(element); window.addEventListener('resize', measure)
      return () => { observer?.disconnect(); window.removeEventListener('resize', measure) }
    }, [spread])
    React.useEffect(() => {
      const controller = new AbortController(); setPreview(null); setError('')
      const pages = Array.from({ length: endPage - page + 1 }, (_, index) => page + index)
      Promise.all(pages.map(page => store.call(sessionId, 'preview', { templateId: item.id, revision: item.revision, page }, controller.signal))).then(
        values => { if (!controller.signal.aborted) setPreview(values) },
        error => { if (!controller.signal.aborted) { setError(error.message); controller.abort() } })
      return () => controller.abort()
    }, [store, sessionId, item.id, item.revision, page, endPage, retry])
    const move = value => { const bounded = Math.min(item.pages, Math.max(1, value)); setPage(spread && item.mode === 'word' ? bounded - (bounded - 1) % 2 : bounded); dialog.current?.focus() }
    const pageLabel = page === endPage ? t('page').replace('{page}', page).replace('{total}', item.pages)
      : t('spread').replace('{start}', page).replace('{end}', endPage).replace('{total}', item.pages)
    const ratios = Array.from({ length: endPage - page + 1 }, (_, index) => item.pageAspectRatios[page + index - 1])
    // A final single page retains the scale of a full spread and is centered.
    const spreadRatio = ratios.length === 2 ? ratios[0] + ratios[1] : ratios[0] * 2
    const availableWidth = Math.max(0, bounds.width - 32), availableHeight = Math.max(0, bounds.height - 60)
    const paperHeight = spread ? Math.max(0, Math.min(availableHeight, Math.max(0, availableWidth - 16) / spreadRatio)) : 0
    const caption = page => [item.sheets?.find(sheet => sheet.pages.includes(page))?.name, t('pageNumber').replace('{page}', page)].filter(Boolean).join(' · ')
    return h('dialog', { ref: dialog, className: 'dso-modal', 'data-spread': spread, tabIndex: -1, 'aria-modal': true, 'aria-label': titleOf(item, t), onCancel: event => { event.preventDefault(); if (!busy) close() },
      onClick: event => {
        if (event.target !== dialog.current || busy) return
        const rect = dialog.current.getBoundingClientRect()
        if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) close()
      }, onKeyDown: event => {
        if (event.key === 'Tab') {
          const buttons = [...dialog.current.querySelectorAll('button:not(:disabled)')]
          const first = buttons[0], last = buttons.at(-1)
          if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog.current)) { event.preventDefault(); last?.focus() }
          else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
        }
        if (event.target.tagName === 'SELECT' || busy) return
        if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) { event.preventDefault(); if (event.key === 'ArrowRight' && page + step > item.pages) return; move(event.key === 'Home' ? 1 : event.key === 'End' ? item.pages - (spread ? (item.pages - 1) % 2 : 0) : page + (event.key === 'ArrowRight' ? step : -step)) }
      } },
      h('header', null, h('h2', null, titleOf(item, t)), h('span', { className: 'dso-preview-actions' },
        h('button', { type: 'button', className: 'dso-close', onClick: close, disabled: busy, 'aria-label': t('close') }, '×'))),
      item.sheets?.length ? h('nav', { className: 'dso-sheets', 'aria-label': 'Excel' }, item.sheets.map(sheet => h('button', { key: sheet.name, type: 'button', 'aria-pressed': sheet.pages.includes(page), onClick: () => move(sheet.pages[0]) }, sheet.name))) : null,
      h('div', { ref: stage, className: 'dso-page', 'data-spread': spread, 'aria-busy': !preview && !error }, preview ? spread
        ? h('div', { className: 'dso-spread' }, preview.map((value, index) => h('figure', { key: value.page, style: { width: paperHeight * ratios[index], flex: 'none' } },
          h('img', { src: value.image, alt: `${titleOf(item, t)} · ${t('page').replace('{page}', value.page).replace('{total}', item.pages)}`, style: { height: paperHeight }, draggable: false }),
          h('figcaption', { title: caption(value.page) }, caption(value.page)))))
        : h('img', { src: preview[0].image, alt: `${titleOf(item, t)} · ${pageLabel}`, draggable: false })
        : error ? h('div', { role: 'alert' }, error, h('button', { type: 'button', onClick: () => setRetry(value => value + 1) }, t('retry'))) : h('span', { role: 'status' }, t('loading'))),
      actionError ? h('p', { role: 'alert' }, actionError) : null,
      h('footer', null, h('div', { className: 'dso-pagination' }, h('button', { type: 'button', disabled: page === 1, onClick: () => move(page - step), 'aria-label': t(spread ? 'previousSpread' : 'previous') }, '‹'),
        h('span', { role: 'status', 'aria-live': 'polite' }, pageLabel), h('button', { type: 'button', disabled: page + step > item.pages, onClick: () => move(page + step), 'aria-label': t(spread ? 'nextSpread' : 'next') }, '›')),
        choose ? h('button', { type: 'button', className: 'dso-use', disabled: busy || !!error || !preview, onClick: async () => { if (await choose(item) && active.current) close() } }, busy ? t('loading') : t('use')) : null))
  }

  function ModeActions({ store, sessionId, t }) {
    const state = useOffice(store, sessionId)
    return h(React.Fragment, null, ['word', 'excel'].map(mode => h('button', { key: mode, type: 'button', className: 'dso-mode-action', 'data-office-mode': mode,
      'aria-pressed': state.mode === mode, 'aria-expanded': state.mode === mode, disabled: state.loading || state.busy, onClick: () => store.mutate(sessionId, 'mode', { mode: state.mode === mode ? null : mode }) }, h('svg', { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.75, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true },
        h('path', { d: mode === 'word' ? 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M8 13h8M8 17h6' : 'M4 3h16a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1ZM3 9h18M3 15h18M9 3v18M15 3v18' })), mode === 'word' ? 'Word' : 'Excel')),
      state.error ? h('span', { role: 'alert' }, state.error, h('button', { type: 'button', onClick: () => store.load(sessionId, true) }, t('retry'))) : null)
  }
  function Dock({ store, sessionId, session, t }) {
    const state = useOffice(store, sessionId), [opened, setOpened] = React.useState(null)
    const root = React.useRef(), panel = React.useRef(), visible = !!state.mode && (session == null || session.blank === true)
    useDockGeometry(root, panel, visible)
    React.useEffect(() => setOpened(null), [sessionId, state.mode])
    React.useEffect(() => { if (opened && state.templates.find(item => item.id === opened.id)?.revision !== opened.revision) setOpened(null) }, [state.templates, opened])
    if (!visible) return null
    const items = state.templates.filter(item => item.mode === state.mode)
    return h('div', { ref: root, className: 'dso-dock-root' }, h('section', { ref: panel, className: 'dso-dock', 'data-office-dock': state.mode, 'aria-label': t('templates') },
      h('div', { className: 'dso-viewport', 'data-native-wheel-owner': '' },
      state.error ? h('div', { role: 'alert' }, state.error, h('button', { type: 'button', onClick: () => store.load(sessionId, true) }, t('retry'))) : null,
      state.selectionExpired ? h('p', { role: 'status' }, t('expired')) : null,
      state.loading ? h('p', { role: 'status' }, t('loading')) : !items.length ? h('p', { role: 'status' }, t('empty')) : null,
      h('div', { className: 'dso-grid' }, items.map(item => h(TemplateCard, { key: item.id, item, t, selected: state.selectedTemplateId === item.id,
        busy: state.busy || state.loading, preview: setOpened, choose: item => store.mutate(sessionId, 'select', { templateId: item.id, revision: item.revision }) })))),
      opened ? h(Preview, { key: `${sessionId}:${opened.id}`, item: opened, store, sessionId, t, close: () => setOpened(null), busy: state.busy, actionError: state.error,
        choose: item => store.mutate(sessionId, 'select', { templateId: item.id, revision: item.revision }) }) : null))
  }
  function Accessory({ store, sessionId, session, t }) {
    const state = useOffice(store, sessionId), [opened, setOpened] = React.useState(false)
    React.useEffect(() => setOpened(false), [sessionId, state.selectedTemplateId, session?.blank])
    const item = state.templates.find(item => item.id === state.selectedTemplateId && item.mode === state.mode)
    if (session?.blank !== true || !item) return null
    return h('div', { className: 'dso-selected', 'data-office-selected': item.id },
      h('span', { className: 'dso-selected-frame' }, h('button', { type: 'button', className: 'dso-selected-preview', 'aria-label': `${t('preview')} ${titleOf(item, t)}`, onClick: () => setOpened(true) }, h(Thumbnail, { item })),
      h('button', { type: 'button', className: 'dso-selected-remove', disabled: state.busy, 'aria-label': t('remove'), onClick: () => store.mutate(sessionId, 'deselect', {}) }, '×')),
      opened ? h(Preview, { item, store, sessionId, t, close: () => setOpened(false), busy: state.busy }) : null)
  }
  function OpeningTemplate({ store, sessionId, leading, t }) {
    const state = useOffice(store, sessionId), [opened, setOpened] = React.useState(false)
    const item = state.templates.find(item => item.id === state.selectedTemplateId && item.mode === state.mode)
    React.useEffect(() => setOpened(false), [sessionId, state.selectedTemplateId, leading])
    if (leading !== true || !item) return null
    return h(React.Fragment, null,
      h('div', { className: 'dso-opening-row', 'data-office-opening-template': item.id, 'data-mode': item.mode },
        h('svg', { className: 'dso-opening-file', width: 22, height: 26, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.75, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true },
          h('path', { d: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6' }),
          h('path', { d: item.mode === 'word' ? 'M8 13h8M8 17h6' : 'M8 12h8v7H8zM8 15.5h8M12 12v7' })),
        h('button', { type: 'button', className: 'dso-opening-title', 'aria-haspopup': 'dialog', 'aria-label': `${t('preview')} ${titleOf(item, t)}`, onClick: () => setOpened(true) }, titleOf(item, t))),
      opened ? h(Preview, { item, store, sessionId, t, close: () => setOpened(false), busy: state.busy }) : null)
  }
  const css = `
.dso-opening-row{display:flex;align-items:center;gap:6px;min-width:0}.dso-opening-row:not(:first-child){margin-top:8px;padding-top:8px;border-top:.5px solid var(--dsw-alias-border-l2)}.dso-opening-file{flex:none;color:var(--dsw-alias-state-business-primary)}.dso-opening-row[data-mode=excel] .dso-opening-file{color:var(--dsw-alias-state-success-primary)}.dso-opening-title{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;border:0;background:transparent;padding:0;color:var(--dsw-alias-state-business-primary);font:inherit;font-size:13px;line-height:20px;text-align:left;cursor:pointer}.dso-opening-title:hover{text-decoration:underline}.dso-opening-title:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:2px}
.dso-preview-actions{display:flex;gap:12px;align-items:center}
.dso-mode-action{display:inline-flex;align-items:center;gap:6px;line-height:16px;font:inherit;font-size:12px;border-radius:999px;padding:7px 13px;background:transparent;border:1px solid var(--dsw-alias-border-l2-darkmode-thin);color:var(--dsw-alias-label-secondary);cursor:pointer}.dso-mode-action[aria-pressed=true]{color:var(--dsw-alias-label-primary-foreground)!important;border-color:var(--dsw-alias-label-primary);background:var(--dsw-alias-label-primary)!important}
.dso-dock-root{box-sizing:border-box;position:relative;width:100%;height:0;padding:0 var(--dsh-composer-side-clearance);overflow:visible}.dso-dock{box-sizing:border-box;position:absolute;top:0;left:50%;transform:translateX(-50%);z-index:2;display:flex;flex-direction:column;width:var(--dso-dock-width,var(--dsh-composer-card-max-width,100%));max-width:calc(100vw - 32px);height:var(--dso-dock-height,calc(100dvh - 178px));margin-top:8px;color:var(--dsw-alias-label-primary);font-size:12px}.dso-viewport{flex:1;min-height:0;overflow:auto;overscroll-behavior:contain;padding:4px 4px 12px;scrollbar-width:none}.dso-viewport::-webkit-scrollbar{display:none}.dso-sheets{display:flex;align-items:center;flex:none;overflow:auto;gap:4px;scrollbar-width:none}.dso-sheets::-webkit-scrollbar{display:none}.dso-sheets button{font:inherit;font-size:11px;line-height:16px;border:0;border-radius:999px;padding:5px 10px;flex:none;color:var(--dsw-alias-label-caption);background:transparent;cursor:pointer}.dso-sheets button:hover{color:var(--dsw-alias-label-primary)}.dso-sheets button[aria-pressed=true]{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}
.dso-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px 14px}.dso-card{min-width:0;position:relative}.dso-card-select{font:inherit;display:flex;flex-direction:column;width:100%;padding:0;min-width:0;border:0;text-align:center;background:transparent;color:var(--dsw-alias-label-tertiary);cursor:pointer}.dso-card-select:disabled{cursor:default;opacity:.65}.dso-cover{box-sizing:border-box;display:block;position:relative;width:100%;aspect-ratio:16/9;border:2px solid transparent;border-radius:9px;overflow:hidden;background:color-mix(in srgb,var(--dsw-alias-state-business-primary) 5%,var(--dsw-alias-bg-layer-1))}.dso-cover[data-mode=excel]{background:color-mix(in srgb,var(--dsw-alias-state-success-primary) 6%,var(--dsw-alias-bg-layer-1))}.dso-thumbnail{display:block;width:100%;border-radius:8px;overflow:hidden}.dso-thumbnail img{display:block;width:100%;height:auto}.dso-cover>.dso-thumbnail{position:absolute;left:13%;top:14%;width:74%;box-shadow:0 2px 10px color-mix(in srgb,var(--dsw-alias-label-primary) 15%,transparent);transform-origin:center top;transition:transform 180ms cubic-bezier(.23,1,.32,1)}.dso-cover[data-mode=excel]>.dso-thumbnail{left:8%;width:84%;height:100%}.dso-card[data-selected=true] .dso-cover{border-color:var(--dsw-alias-state-business-primary)}.dso-card-name{display:block;box-sizing:border-box;width:100%;padding-top:5px;text-align:center;font-size:12px;line-height:16px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.dso-card[data-selected=true] .dso-card-name{color:var(--dsw-alias-label-primary)}.dso-card-preview{position:absolute;left:10px;top:10px;z-index:1;display:grid;place-items:center;width:28px;height:28px;padding:0;border:1px solid var(--dsw-alias-border-l2-darkmode-thin);border-radius:7px;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);cursor:pointer;opacity:0;transition:opacity 120ms ease}.dso-card:hover .dso-card-preview,.dso-card:focus-within .dso-card-preview{opacity:1}.dso-card-preview:disabled{cursor:default}.dso-card-select:active:not(:focus-visible) .dso-thumbnail{transform:scale(.98)}
@media(hover:hover) and (pointer:fine){.dso-card:has(.dso-card-select:enabled):hover .dso-thumbnail{transform:translateY(-3px) scale(1.045)}}@media(hover:none){.dso-card-preview{opacity:1}}@media(prefers-reduced-motion:reduce){.dso-cover>.dso-thumbnail,.dso-card-preview{transition:none}.dso-card:has(.dso-card-select:enabled):hover .dso-thumbnail,.dso-card-select:active:not(:focus-visible) .dso-thumbnail{transform:none}}
/* Match the detailed viewer in PPT PR 675; Office keeps its native page navigation. */
.dso-modal{box-sizing:border-box;width:min(1280px,calc(100vw - 32px));height:min(900px,calc(100dvh - 32px));max-width:calc(100vw - 32px);max-height:calc(100dvh - 32px);margin:auto;border:1px solid var(--dsw-alias-border-l2-darkmode-thin);border-radius:16px;padding:20px;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);font:inherit}
.dso-modal[open]{display:flex;flex-direction:column;gap:16px}
.dso-modal::backdrop{background:color-mix(in srgb,var(--dsw-alias-label-primary) 45%,transparent)}
.dso-modal header,.dso-modal footer{display:flex;align-items:center;gap:12px;flex:none}
.dso-modal header{justify-content:space-between}
.dso-modal h2{margin:0;min-width:0;overflow-wrap:anywhere;font-size:16px;line-height:24px;font-weight:600}
.dso-modal button{min-width:32px;min-height:32px;font:inherit;font-size:13px;border:1px solid var(--dsw-alias-border-l2-darkmode-thin);border-radius:7px;padding:0;background:var(--dsw-alias-bg-base);color:inherit;cursor:pointer}
.dso-modal button:disabled{cursor:default;opacity:.35}
.dso-modal .dso-close{display:grid;place-items:center;flex:none;width:32px;height:32px;font-size:18px}
.dso-modal button:hover:enabled{background:var(--dsw-alias-interactive-bg-hover)}
.dso-page{display:flex;justify-content:center;align-items:center;flex:1;min-height:0;min-width:0;overflow:auto;background:var(--dsw-alias-interactive-bg-hover);border-radius:8px;position:relative}
.dso-page>img{width:100%;height:100%;object-fit:contain;min-height:0;display:block;margin:0 auto}
.dso-page>[role]{display:grid;place-content:center;gap:12px;text-align:center;padding:16px;overflow-wrap:anywhere}
.dso-page>[role] button{padding:0 14px;justify-self:center}
.dso-modal footer{justify-content:center;flex-wrap:wrap;font-size:13px;font-variant-numeric:tabular-nums}
.dso-pagination{display:flex;align-items:center;justify-content:center;gap:12px;color:var(--dsw-alias-label-primary);font-size:13px;font-variant-numeric:tabular-nums}
.dso-pagination button{display:grid;place-items:center;width:32px;height:32px}
.dso-modal .dso-use{width:auto;padding:0 14px;margin-left:8px;background:var(--dsw-alias-label-primary);color:var(--dsw-alias-bg-base);border-color:transparent;font-size:13px}
.dso-modal .dso-use:hover:enabled{background:var(--dsw-alias-label-primary)}
.dso-modal .dso-sheets button{min-width:0;min-height:28px;padding:5px 10px;border:0;border-radius:999px;background:transparent;font-size:11px;color:var(--dsw-alias-label-caption)}
.dso-modal .dso-sheets button[aria-pressed=true],.dso-modal .dso-sheets button:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}
.dso-page[data-spread=true]{box-sizing:border-box;padding:16px}
.dso-spread{display:flex;justify-content:center;align-items:flex-start;gap:16px;max-width:100%}
.dso-spread figure{margin:0;min-width:0;display:flex;flex-direction:column;align-items:center;gap:8px}
.dso-spread img{display:block;width:100%;object-fit:contain;box-shadow:0 2px 12px color-mix(in srgb,var(--dsw-alias-label-primary) 10%,transparent)}
.dso-spread figcaption{width:100%;text-align:center;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--dsw-alias-label-secondary);font-size:12px;line-height:20px;flex:none}
.dso-selected{display:flex;align-items:flex-start}.dso-selected button{cursor:pointer}.dso-selected-frame{position:relative;display:block;flex:none;width:clamp(76px,10vw,92px);aspect-ratio:16/9;transform:rotate(-3deg);transform-origin:center}.dso-selected-preview{font:inherit;display:block;box-sizing:border-box;width:100%;height:100%;padding:0;border:2px solid var(--dsw-alias-state-business-primary);border-radius:9px;overflow:hidden;background:var(--dsw-alias-bg-base);box-shadow:0 4px 14px color-mix(in srgb,var(--dsw-alias-label-primary) 18%,transparent)}.dso-selected .dso-thumbnail{width:100%;height:100%;border-radius:0}.dso-selected .dso-thumbnail img{height:100%;object-fit:cover;object-position:top}.dso-selected-remove{position:absolute;top:-8px;right:-8px;z-index:2;display:grid;place-items:center;width:20px;height:20px;padding:0;border:1px solid var(--dsw-alias-border-l2);border-radius:50%;background:var(--dsw-alias-label-primary);color:var(--dsw-alias-bg-base);font:500 15px/1 ui-sans-serif,system-ui,sans-serif;opacity:0;pointer-events:none;transform:rotate(3deg);transition:opacity 120ms ease}.dso-selected-frame:hover .dso-selected-remove,.dso-selected-frame:focus-within .dso-selected-remove{opacity:1;pointer-events:auto}.dso-selected-remove:disabled{cursor:default}.dso-selected .dso-selected-preview:focus-visible{outline-offset:2px}@media(hover:none){.dso-selected-remove{opacity:1;pointer-events:auto}}@media(prefers-reduced-motion:reduce){.dso-selected-frame{transform:none}.dso-selected-remove{transform:none;transition:none}}.dso-mode-action:focus-visible,.dso-card-select:focus-visible,.dso-card-preview:focus-visible,.dso-modal button:focus-visible,.dso-selected button:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:3px}@media(max-width:540px){.dso-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.dso-modal{padding:10px}.dso-modal footer{gap:12px}.dso-pagination{gap:8px}}`
  function apply(ctx) {
    const store = new OfficeStore(ctx.get('connection'))
    ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'Office dictionaries')
    ctx.effect(() => { if (document.querySelector('style[data-plugin-css="desktop-office/styles"]')) return; const tag = document.createElement('style'); tag.dataset.plugin = NS; tag.dataset.pluginCss = 'desktop-office/styles'; tag.textContent = css; document.head.append(tag); return () => tag.remove() }, 'Office styles')
    ctx.effect(() => { const listener = event => store.syncPpt(event.detail ?? {}); window.addEventListener(EVENT, listener); return () => { window.removeEventListener(EVENT, listener); store.dispose() } }, 'Office mode synchronization')
    ctx.on('connection/reset', () => store.reset())
    for (const [seat, component] of [['conversation.hero.modeActions', ModeActions], ['conversation.input.accessory', Accessory], ['conversation.chat.userMessageFooter', OpeningTemplate], ['conversation.hero.dock', Dock], ['conversation.composer.dock', Dock]]) {
      ctx.slots.inject(seat, () => ctx.slots.register({ name: seat, id: NS, order: seat === 'conversation.hero.modeActions' ? 30 : 10, locale: NS, inject: () => ({ store }) }, component))
    }
  }
  return { apply, inject: ['slots', 'locale', 'connection'] }
} })
