window.__ModuleLoader__.load({
  id: 'dsh-office',
  factory(require) {
    const React = require('react')
    const EVENT = 'dsh-document-mode-changed'
    const NS = 'dsh-office'
    const empty = { mode: null, templates: [], loading: true, error: '' }
    const h = React.createElement
    async function call(rpc, sessionId, endpoint, payload = {}) {
      const response = await rpc.call('/dsh-office', endpoint, { sessionId, ...payload })
      if (!response.ok) throw new Error(response.error.message)
      if (response.value.status !== 'ok') throw new Error(response.value.error.message)
      return response.value.data
    }

    class ModeStore {
      states = new Map()
      listeners = new Map()
      requests = new Map()
      queues = new Map()
      snapshot(id) { return this.states.get(id) ?? empty }
      subscribe(id, listener) {
        const listeners = this.listeners.get(id) ?? new Set()
        listeners.add(listener); this.listeners.set(id, listeners)
        return () => { listeners.delete(listener); if (!listeners.size) this.listeners.delete(id) }
      }
      update(id, patch) {
        this.states.set(id, { ...this.snapshot(id), ...patch })
        for (const listener of this.listeners.get(id) ?? []) listener()
      }
      request(rpc, id, endpoint, value) {
        const sequence = (this.requests.get(id) ?? 0) + 1
        this.requests.set(id, sequence)
        this.update(id, { loading: true, error: '' })
        const request = (this.queues.get(id) ?? Promise.resolve()).then(async () => {
          try {
            const next = await call(rpc, id, endpoint, endpoint === 'mode' ? { mode: value } : {})
            if (this.requests.get(id) === sequence) this.update(id, { ...next, loading: false, error: '' })
            if (endpoint !== 'state') window.dispatchEvent(new CustomEvent(EVENT, { detail: { ...next, origin: NS } }))
            return true
          } catch (error) {
            if (this.requests.get(id) === sequence) this.update(id, { loading: false, error: error.message })
            return false
          }
        })
        this.queues.set(id, request)
        request.finally(() => { if (this.queues.get(id) === request) this.queues.delete(id) })
        return request
      }
    }

    function FormatIcon({ mode }) {
      const props = { className: 'wbo-format-icon', width: 18, height: 18, viewBox: '0 0 24 24',
        fill: 'none', stroke: 'currentColor', strokeWidth: 1.75, strokeLinecap: 'round',
        strokeLinejoin: 'round', 'aria-hidden': true, focusable: false }
      return mode === 'word'
        ? React.createElement('svg', props,
          React.createElement('path', { d: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M8 12h8M8 16h8' }))
        : React.createElement('svg', props,
          React.createElement('rect', { x: 3, y: 3, width: 18, height: 18, rx: 2 }),
          React.createElement('path', { d: 'M3 9h18M3 15h18M9 3v18M15 9v12' }))
    }

    function ModeActions({ rpc, store, sessionId, t }) {
      const state = React.useSyncExternalStore(listener => store.subscribe(sessionId, listener), () => store.snapshot(sessionId))
      React.useEffect(() => {
        store.request(rpc, sessionId, 'state')
        const refresh = event => {
          if (event.detail?.sessionId === sessionId && event.detail?.origin !== NS) store.request(rpc, sessionId, 'state')
        }
        const focus = () => store.request(rpc, sessionId, 'state')
        window.addEventListener(EVENT, refresh); window.addEventListener('focus', focus)
        return () => { window.removeEventListener(EVENT, refresh); window.removeEventListener('focus', focus) }
      }, [rpc, store, sessionId])
      return React.createElement('div', { className: 'wbo-mode-group', role: 'group', 'aria-label': t('formats') },
        ...['word', 'excel'].map(mode => React.createElement('button', {
          key: mode, type: 'button', 'data-office-mode': mode, 'data-selected': state.mode === mode,
          'aria-pressed': state.mode === mode, 'aria-label': mode === 'word' ? 'Word' : 'Excel',
          title: t(`${mode}.hint`), disabled: state.loading,
          onClick: () => store.request(rpc, sessionId, 'mode', state.mode === mode ? null : mode)
        }, React.createElement(FormatIcon, { mode }), mode === 'word' ? 'Word' : 'Excel')),
        state.error ? React.createElement('span', { className: 'wbo-mode-error', role: 'alert' }, state.error) : null)
    }

    const useMode = (store, id) => React.useSyncExternalStore(listener => store.subscribe(id, listener), () => store.snapshot(id))
    function Preview({ rpc, sessionId, template, close, t }) {
      const dialog = React.useRef(null), titleId = React.useId()
      const [pages, setPages] = React.useState({})
      const [sheetIndex, setSheetIndex] = React.useState(0)
      const scroll = React.useRef(null), scrollPositions = React.useRef({}), cache = React.useRef({})
      const sheets = template.mode === 'excel' ? template.sheets : null
      const sheet = sheets?.[sheetIndex]
      const visiblePages = React.useMemo(() => sheet?.pages ?? Array.from({ length: template.pages }, (_, i) => i + 1), [sheet, template.pages])
      const generation = React.useRef(0)
      React.useEffect(() => {
        const element = dialog.current, trigger = document.activeElement
        element.showModal()
        return () => { element.close(); if (trigger?.isConnected) trigger.focus({ preventScroll: true }) }
      }, [])
      const loadPage = React.useCallback(async (page, version = generation.current) => {
        if (generation.current !== version) return
        setPages(previous => ({ ...previous, [page]: { loading: true, image: '', error: '' } }))
        try {
          const data = await call(rpc, sessionId, 'template/preview', { templateId: template.id, page })
          if (generation.current === version) {
            cache.current[page] = data.image
            setPages(previous => ({ ...previous, [page]: { loading: false, image: data.image, error: '' } }))
          }
        } catch (error) {
          if (generation.current === version) setPages(previous => ({ ...previous, [page]: { loading: false, image: '', error: error.message } }))
        }
      }, [rpc, sessionId, template.id])
      React.useEffect(() => {
        const version = ++generation.current
        let index = 0
        const pending = visiblePages.filter(page => !cache.current[page])
        // Load the active worksheet in order; retain completed images when switching sheets.
        const worker = async () => { while (generation.current === version && index < pending.length) await loadPage(pending[index++], version) }
        void Promise.all(Array.from({ length: Math.min(3, pending.length) }, worker))
        return () => { generation.current++ }
      }, [loadPage, visiblePages])
      React.useLayoutEffect(() => { if (scroll.current) scroll.current.scrollTop = scrollPositions.current[sheetIndex] ?? 0 }, [sheetIndex])
      const selectSheet = index => {
        if (scroll.current) scrollPositions.current[sheetIndex] = scroll.current.scrollTop
        setSheetIndex(index)
      }
      return h('dialog', { ref: dialog, className: 'wbo-preview', 'aria-labelledby': titleId,
        onCancel: event => { event.preventDefault(); close() }, onClick: event => { if (event.target === dialog.current) close() } },
        h('div', { className: 'wbo-preview-shell' },
          h('header', null, h('div', null, h('strong', { id: titleId }, template.title),
            h('p', null, `${sheets?.length ?? template.pages} ${t(sheets ? 'sheets' : 'pages')} · ${t(sheets ? 'sheetScrollHint' : 'scrollHint')}`)),
            h('button', { type: 'button', onClick: close, 'aria-label': t('close') }, '×')),
          sheets ? h('div', { className: 'wbo-sheet-tabs', role: 'tablist', 'aria-label': t('sheets'), 'data-native-wheel-owner': '' },
            ...sheets.map((item, index) => h('button', { key: item.name, type: 'button', role: 'tab', id: `${titleId}-sheet-${index}`,
              'aria-selected': index === sheetIndex, 'aria-controls': `${titleId}-content`, tabIndex: index === sheetIndex ? 0 : -1,
              onClick: () => selectSheet(index), onKeyDown: event => {
                const next = { ArrowRight: (index + 1) % sheets.length, ArrowLeft: (index + sheets.length - 1) % sheets.length, Home: 0, End: sheets.length - 1 }[event.key]
                if (next === undefined) return
                event.preventDefault(); selectSheet(next)
                const tab = event.currentTarget.parentElement.querySelectorAll('[role=tab]')[next]
                tab.focus(); tab.scrollIntoView?.({ block: 'nearest', inline: 'nearest' })
              }
            }, item.name))) : null,
          h('div', { ref: scroll, key: sheetIndex, id: `${titleId}-content`, className: 'wbo-preview-pages', 'data-native-wheel-owner': '', tabIndex: 0,
            role: sheets ? 'tabpanel' : 'region', ...(sheets ? { 'aria-labelledby': `${titleId}-sheet-${sheetIndex}` } : { 'aria-label': t('reportContent') }),
            onScroll: event => { scrollPositions.current[sheetIndex] = event.currentTarget.scrollTop } },
            ...visiblePages.map((page, index) => {
              const preview = pages[page], label = `${sheet ? sheet.name : template.title} · ${index + 1} / ${visiblePages.length}`
              return h('figure', { className: 'wbo-report-page', style: template.mode === 'excel' ? { width: '100%', maxWidth: 840 } : undefined, key: page, 'data-report-page': page },
                h('div', { className: 'wbo-page-paper', style: { aspectRatio: template.previewPages?.[page - 1]?.aspectRatio ?? template.pageAspectRatio ?? 210 / 297 }, 'aria-busy': !preview || preview.loading },
                  preview?.image ? h('img', { src: preview.image, alt: label, draggable: false }) :
                  preview?.error ? h('div', { className: 'wbo-page-message', role: 'alert' }, preview.error,
                    h('button', { type: 'button', onClick: () => loadPage(page), 'aria-label': `${t('retry')} ${page}` }, t('retry'))) :
                    h('p', { className: 'wbo-page-message' }, `${t('loading')} ${page} / ${template.pages}`)),
                h('figcaption', null, sheet ? label : `${page} / ${template.pages}`))
            }))))
    }
    function TemplateDock(props) {
      const { rpc, store, sessionId, t } = props, state = useMode(store, sessionId)
      const root = React.useRef(null), panel = React.useRef(null)
      const [previewId, setPreviewId] = React.useState(null)
      const templates = state.templates.filter(template => (template.mode ?? 'word') === state.mode)
      const visible = props.session.blank && ['word', 'excel'].includes(state.mode) && templates.length > 0
      React.useEffect(() => { setPreviewId(null) }, [sessionId, visible, state.mode])
      React.useLayoutEffect(() => {
        if (!visible || !root.current) return
        const scroll = root.current.closest('[data-conversation-scroll]')
        const measure = () => { if (panel.current) panel.current.style.maxHeight = `${Math.max(140, (scroll?.getBoundingClientRect().bottom ?? window.innerHeight) - panel.current.getBoundingClientRect().top - 12)}px` }
        measure()
        const observer = new ResizeObserver(measure)
        observer.observe(root.current.closest('[data-composer-seat]') ?? root.current)
        if (scroll) observer.observe(scroll)
        window.addEventListener('resize', measure); scroll?.addEventListener('scroll', measure)
        return () => { observer.disconnect(); window.removeEventListener('resize', measure); scroll?.removeEventListener('scroll', measure) }
      }, [visible])
      if (!visible) return null
      const preview = templates.find(item => item.id === previewId)
      return h('div', { ref: root, className: 'wbo-template-dock', 'data-office-template-dock': state.mode },
        h('section', { ref: panel, className: 'wbo-template-panel', 'aria-label': t('templates') },
          h('div', { className: 'wbo-template-viewport', 'data-native-wheel-owner': '' },
            h('div', { className: 'wbo-template-grid' }, ...templates.map(template => h('div', { className: 'wbo-template-card', key: template.id },
              h('button', { className: 'wbo-template-open', type: 'button', 'aria-label': `${t('preview')} ${template.title}`,
                onClick: () => setPreviewId(template.id) },
                h('span', { className: 'wbo-template-cover' }, h('img', { src: template.thumbnail, alt: '', draggable: false })),
                h('span', { className: 'wbo-template-name', title: template.title }, template.title)))))),
          state.error ? h('div', { role: 'alert' }, state.error, h('button', { onClick: () => store.request(rpc, sessionId, 'state') }, t('retry'))) : null),
        preview ? h(Preview, { key: `${sessionId}:${preview.id}`, ...props, template: preview, close: () => setPreviewId(null) }) : null)
    }

    function apply(ctx) {
      ctx.effect(() => ctx.locale.register(NS, {
        zh: { formats: '输出格式', 'word.hint': '创建或修改 Word 文档', 'excel.hint': '创建或修改 Excel 表格', templates: '文档与表格案例', preview: '预览', close: '关闭预览', loading: '正在加载', retry: '重试', pages: '页', sheets: '个工作表', sheetScrollHint: '切换工作表，上下滚动查看预览', scrollHint: '向下滚动查看完整内容', reportContent: '案例内容' },
        en: { formats: 'Output format', 'word.hint': 'Create or edit a Word document', 'excel.hint': 'Create or edit an Excel workbook', templates: 'Document and spreadsheet examples', preview: 'Preview', close: 'Close preview', loading: 'Loading', retry: 'Retry', pages: 'pages', sheets: 'worksheets', sheetScrollHint: 'Switch worksheets and scroll through the preview', scrollHint: 'Scroll to view the full example', reportContent: 'Example content' }
      }), 'office-mode:locale')
      ctx.effect(() => {
        const style = document.createElement('style')
        style.dataset.plugin = 'dsh-office'
        style.textContent = `.wbo-mode-group{display:flex;align-items:center;gap:2px}.wbo-mode-group button{display:inline-flex;align-items:center;justify-content:center;gap:6px;min-width:52px}.wbo-format-icon{display:block;flex:none}.wbo-mode-group button:disabled{opacity:.55;cursor:progress}.wbo-mode-error{font-size:12px;color:var(--dsw-alias-state-error-primary);max-width:340px}.\_8JRpoa_heroModeCluster button[data-office-mode][data-selected=true]{background:#262626!important;color:#fafafa!important}`
        document.head.appendChild(style)
        style.textContent += `
          .wbo-template-dock{position:relative;height:0;width:100%;overflow:visible;color:var(--dsw-alias-label-primary,#262626)}
          .wbo-template-panel{box-sizing:border-box;z-index:2;position:absolute;top:0;left:50%;transform:translateX(-50%);width:100%;max-width:calc(var(--dsh-composer-card-max-width) + 32px);margin-top:8px;display:flex;flex-direction:column;overflow:hidden}
          .wbo-template-viewport{box-sizing:border-box;overscroll-behavior:contain;scrollbar-width:none;min-height:0;padding:4px 4px 12px;overflow-x:hidden;overflow-y:auto}.wbo-template-viewport::-webkit-scrollbar{display:none}
          .wbo-template-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px 14px}
          .wbo-template-card{min-width:0;min-height:0;position:relative}.wbo-template-open{display:flex;flex-direction:column;width:100%;min-width:0;color:var(--dsw-alias-label-tertiary);font:inherit;cursor:pointer;background:none;border:0;outline:0;padding:0}
          .wbo-template-cover{box-sizing:border-box;aspect-ratio:16/9;border:2px solid transparent;border-radius:9px;width:100%;transition:border-color .12s,transform .12s;display:block;position:relative;overflow:hidden;background:linear-gradient(145deg,#edf2f7,#e5ebf3)}
          .wbo-template-cover img{display:block;position:absolute;top:10%;left:50%;transform:translateX(-50%);width:auto;height:112%;max-width:82%;object-fit:contain;object-position:top;border-radius:5px;box-shadow:0 0 0 1px #2437521a,0 3px 12px #24375212}
          .wbo-template-cover::after{content:"";position:absolute;inset:82% 0 0;pointer-events:none;background:linear-gradient(transparent,#e5ebf3)}
          .wbo-template-card:hover .wbo-template-cover{transform:translateY(-1px)}.wbo-template-open:active .wbo-template-cover{transform:scale(.985)}.wbo-template-open:focus-visible .wbo-template-cover{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:2px}
          .wbo-template-name{min-width:0;max-width:100%;text-align:center;text-overflow:ellipsis;white-space:nowrap;padding-top:5px;font-size:12px;line-height:16px;overflow:hidden;align-self:center}
          .wbo-preview{padding:0;border:1px solid var(--dsw-alias-border-l1,#d8dce1);border-radius:16px;width:min(920px,calc(100vw - 40px));max-width:calc(100vw - 24px);max-height:calc(100dvh - 40px);color:var(--dsw-alias-label-primary,#262626);background:var(--dsw-alias-bg-base,#fff)}
          .wbo-preview::backdrop{background:#15202d80}.wbo-preview-shell{display:flex;flex-direction:column;height:min(860px,calc(100dvh - 42px))}.wbo-preview header{display:flex;justify-content:space-between;flex:none;gap:20px;padding:18px 22px}.wbo-preview header strong{font-size:16px}.wbo-preview header p{font-size:12px;color:var(--dsw-alias-label-tertiary,#909399);margin:7px 0 0;line-height:1.6}
          .wbo-preview button{border:1px solid var(--dsw-alias-border-l1,#d8dce1);border-radius:8px;padding:6px 12px;background:transparent;color:inherit;cursor:pointer;font:inherit}.wbo-preview header>button{align-self:flex-start;font-size:20px;border:0;padding:0 5px}.wbo-preview button:focus-visible,.wbo-preview-pages:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary,#4479df);outline-offset:-2px}
          .wbo-sheet-tabs{display:flex;flex:none;gap:6px;overflow-x:auto;overscroll-behavior:contain;padding:0 22px 12px;border-bottom:1px solid var(--dsw-alias-border-l1,#d8dce1);scrollbar-width:thin}.wbo-sheet-tabs button{flex:none;white-space:nowrap;font-size:13px;line-height:20px}.wbo-sheet-tabs button[aria-selected=true]{background:#26334b;border-color:#26334b;color:#fff}
          .wbo-preview-pages{min-height:0;flex:1;overflow:auto;overscroll-behavior:contain;background:#eaf0f5;padding:22px;text-align:center}.wbo-report-page{width:min(100%,680px);margin:0 auto 22px}.wbo-report-page:last-child{margin-bottom:0}.wbo-page-paper{background:#fff;position:relative;box-shadow:0 3px 18px #20334b20;overflow:hidden}.wbo-page-paper img{display:block;width:100%;height:100%;object-fit:contain}.wbo-page-message{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;color:#697684;padding:20px;font-size:13px}.wbo-report-page figcaption{font-size:12px;line-height:18px;color:#697684;padding-top:8px}
          @media(max-width:560px){.wbo-preview-pages{padding:10px}.wbo-preview header{padding:12px}}
          @media(prefers-reduced-motion:reduce){.wbo-template-cover{transition:none}}
        `
        return () => style.remove()
      }, 'office-mode:styles')
      const store = new ModeStore(), rpc = ctx.get('connection').rpc
      ctx.slots.inject('conversation.hero.modeActions', () => ctx.slots.register({
        name: 'conversation.hero.modeActions', id: 'dsh-office', order: 10, locale: NS,
        inject: sessionId => ({ rpc, store, sessionId })
      }, ModeActions))
      for (const [name, component] of [['conversation.composer.dock', TemplateDock]]) {
        ctx.slots.inject(name, () => ctx.slots.register({ name, id: 'dsh-office', order: 10, locale: NS,
          inject: sessionId => ({ rpc, store, sessionId }) }, component))
      }
    }
    return { apply, inject: ['slots', 'locale', 'connection'], ModeStore, TemplateDock }
  }
})
