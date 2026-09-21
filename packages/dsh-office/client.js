window.__ModuleLoader__.load({
  id: 'dsh-office',
  factory(require) {
    const React = require('react')
    const EVENT = 'dsh-document-mode-changed'
    const NS = 'dsh-office'
    const STYLE_ID = 'dsh-office-client-styles'
    const empty = { mode: null, templates: [], loading: true, error: '' }
    const h = React.createElement
    async function call(rpc, sessionId, endpoint, payload = {}, signal) {
      const response = await rpc.call('/dsh-office', endpoint, { sessionId, ...payload }, signal)
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
      replace(id, state) {
        this.states.set(id, state)
        for (const listener of this.listeners.get(id) ?? []) listener()
      }
      request(rpc, id, endpoint, payload = {}) {
        const sequence = (this.requests.get(id) ?? 0) + 1
        this.requests.set(id, sequence)
        this.update(id, { loading: true, error: '' })
        const request = (this.queues.get(id) ?? Promise.resolve()).then(async () => {
          try {
            const next = await call(rpc, id, endpoint, endpoint === 'mode' ? { mode: payload } : payload)
            if (this.requests.get(id) === sequence) this.replace(id, { ...next, loading: false, error: '' })
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
    function Preview({ rpc, sessionId, template, close, select, selected, selecting, t }) {
      const dialog = React.useRef(null), titleId = React.useId()
      const [pages, setPages] = React.useState({})
      const [sheetIndex, setSheetIndex] = React.useState(0)
      const scroll = React.useRef(null), scrollPositions = React.useRef({}), cache = React.useRef({})
      const controllers = React.useRef(new Set())
      const sheets = template.mode === 'excel' ? template.sheets : null
      const sheet = sheets?.[sheetIndex]
      const visiblePages = React.useMemo(() => sheet?.pages ?? Array.from({ length: template.pages }, (_, i) => i + 1), [sheet, template.pages])
      const generation = React.useRef(0)
      const abortLoads = React.useCallback(() => {
        for (const controller of controllers.current) controller.abort()
        controllers.current.clear()
      }, [])
      React.useEffect(() => {
        const element = dialog.current, trigger = document.activeElement
        element.showModal()
        return () => {
          abortLoads()
          element.close()
          if (trigger?.isConnected) trigger.focus({ preventScroll: true })
        }
      }, [abortLoads])
      const loadPage = React.useCallback(async (page, version = generation.current) => {
        if (generation.current !== version) return
        const controller = new AbortController()
        controllers.current.add(controller)
        setPages(previous => ({ ...previous, [page]: { loading: true, image: '', error: '' } }))
        try {
          const data = await call(rpc, sessionId, 'template/preview', { templateId: template.id, page }, controller.signal)
          if (!controller.signal.aborted && generation.current === version) {
            cache.current[page] = data.image
            setPages(previous => ({ ...previous, [page]: { loading: false, image: data.image, error: '' } }))
          }
        } catch (error) {
          if (!controller.signal.aborted && generation.current === version) setPages(previous => ({ ...previous, [page]: { loading: false, image: '', error: error.message } }))
        } finally {
          controllers.current.delete(controller)
        }
      }, [rpc, sessionId, template.id])
      React.useEffect(() => {
        abortLoads()
        const version = ++generation.current
        let index = 0
        const pending = visiblePages.filter(page => !cache.current[page])
        // Load the active worksheet in order; retain completed images when switching sheets.
        const worker = async () => { while (generation.current === version && index < pending.length) await loadPage(pending[index++], version) }
        void Promise.all(Array.from({ length: Math.min(3, pending.length) }, worker))
        return () => { generation.current++; abortLoads() }
      }, [abortLoads, loadPage, visiblePages])
      React.useLayoutEffect(() => { if (scroll.current) scroll.current.scrollTop = scrollPositions.current[sheetIndex] ?? 0 }, [sheetIndex])
      const selectSheet = index => {
        if (scroll.current) scrollPositions.current[sheetIndex] = scroll.current.scrollTop
        setSheetIndex(index)
      }
      return h('dialog', { ref: dialog, className: 'wbo-preview', 'aria-labelledby': titleId, 'aria-modal': true,
        onCancel: event => { event.preventDefault(); if (!selecting) close() },
        onClick: event => { if (!selecting && event.target === dialog.current) close() } },
        h('div', { className: 'wbo-preview-shell' },
          h('header', null, h('div', null, h('strong', { id: titleId }, template.title),
            h('p', null, `${sheets?.length ?? template.pages} ${t(sheets ? 'sheets' : 'pages')} · ${t(sheets ? 'sheetScrollHint' : 'scrollHint')}`)),
            h('button', { type: 'button', disabled: selecting, onClick: close, 'aria-label': t('close') }, '×')),
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
            })),
          h('footer', { className: 'wbo-preview-actions' },
            h('button', { type: 'button', disabled: selecting, onClick: close }, t('close')),
            h('button', { type: 'button', className: 'wbo-use-template', disabled: selecting || selected,
              'aria-label': `${t('useTemplate')} ${template.title}`, onClick: () => select(template) }, selected ? t('selected') : t('useTemplate')))))
    }
    function TemplateDock(props) {
      const { rpc, store, sessionId, t } = props, state = useMode(store, sessionId)
      const root = React.useRef(null), panel = React.useRef(null)
      const selectionGeneration = React.useRef(0)
      const [previewId, setPreviewId] = React.useState(null)
      const templates = state.templates.filter(template => (template.mode ?? 'word') === state.mode)
      const visible = props.session.blank && ['word', 'excel'].includes(state.mode) && templates.length > 0
      React.useEffect(() => {
        selectionGeneration.current++
        setPreviewId(null)
        return () => { selectionGeneration.current++ }
      }, [sessionId, visible, state.mode])
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
      const select = async template => {
        const version = selectionGeneration.current
        const accepted = await store.request(rpc, sessionId, 'template/select', { templateId: template.id })
        if (accepted && selectionGeneration.current === version) setPreviewId(null)
      }
      return h('div', { ref: root, className: 'wbo-template-dock', 'data-office-template-dock': state.mode },
        h('section', { ref: panel, className: 'wbo-template-panel', 'aria-label': t('templates') },
          h('div', { className: 'wbo-template-viewport', 'data-native-wheel-owner': '' },
            h('div', { className: 'wbo-template-grid' }, ...templates.map(template => h('div', { className: 'wbo-template-card', key: template.id,
              'data-selected': state.selectedTemplateId === template.id || undefined },
              h('button', { className: 'wbo-template-open', type: 'button', 'aria-label': `${t('preview')} ${template.title}`,
                onClick: () => setPreviewId(template.id) },
                h('span', { className: 'wbo-template-cover' }, h('img', { src: template.thumbnail, alt: '', draggable: false })),
                h('span', { className: 'wbo-template-name', title: template.title }, template.title)))))),
          state.error ? h('div', { role: 'alert' }, state.error, h('button', { onClick: () => store.request(rpc, sessionId, 'state') }, t('retry'))) : null),
        preview ? h(Preview, { key: `${sessionId}:${preview.id}`, ...props, template: preview, close: () => setPreviewId(null), select,
          selected: state.selectedTemplateId === preview.id, selecting: state.loading }) : null)
    }

    function SelectedTemplate(props) {
      const { rpc, store, sessionId, t } = props, state = useMode(store, sessionId)
      const template = state.templates.find(item => item.id === state.selectedTemplateId && (item.mode ?? 'word') === state.mode)
      if (!props.session.blank || !template || !['word', 'excel'].includes(state.mode)) return null
      return h('div', { className: 'wbo-selected', 'aria-label': `${t('selectedExample')}: ${template.title}` },
        h('span', { className: 'wbo-selected-preview' },
          h('span', { className: 'wbo-selected-frame' }, h('img', { src: template.thumbnail, alt: '', draggable: false })),
          h('button', { type: 'button', className: 'wbo-selected-remove', disabled: state.loading, 'aria-label': t('removeTemplate'),
            onClick: () => store.request(rpc, sessionId, 'template/deselect') }, '×')))
    }

    function apply(ctx) {
      ctx.effect(() => ctx.locale.register(NS, {
        zh: { formats: '输出格式', 'word.hint': '创建或修改 Word 文档', 'excel.hint': '创建或修改 Excel 表格', templates: '文档与表格案例', preview: '预览', close: '关闭', loading: '正在加载', retry: '重试', pages: '页', sheets: '个工作表', sheetScrollHint: '切换工作表，上下滚动查看预览', scrollHint: '向下滚动查看完整内容', reportContent: '案例内容', useTemplate: '做同款', selected: '已选择', selectedExample: '已参考案例', removeTemplate: '移除案例参考' },
        en: { formats: 'Output format', 'word.hint': 'Create or edit a Word document', 'excel.hint': 'Create or edit an Excel workbook', templates: 'Document and spreadsheet examples', preview: 'Preview', close: 'Close', loading: 'Loading', retry: 'Retry', pages: 'pages', sheets: 'worksheets', sheetScrollHint: 'Switch worksheets and scroll through the preview', scrollHint: 'Scroll to view the full example', reportContent: 'Example content', useTemplate: 'Make one like this', selected: 'Selected', selectedExample: 'Reference example', removeTemplate: 'Remove example reference' }
      }), 'dsh-office: locale dictionaries')
      const t = ctx.locale.bind(NS)
      ctx.effect(() => {
        let style = document.getElementById(STYLE_ID)
        if (!style) {
          style = document.createElement('style')
          style.id = STYLE_ID
          style.dataset.pluginCss = NS
          document.head.appendChild(style)
        }
        style.dataset.pluginRefs = String(Number(style.dataset.pluginRefs ?? 0) + 1)
        style.textContent = `.wbo-mode-group{display:flex;align-items:center;gap:2px}.wbo-mode-group button{display:inline-flex;align-items:center;justify-content:center;gap:6px;min-width:52px}.wbo-format-icon{display:block;flex:none}.wbo-mode-group button:disabled{opacity:.55;cursor:progress}.wbo-mode-error{font-size:12px;color:var(--dsw-alias-state-error-primary);max-width:340px}.wbo-mode-group button[data-office-mode][data-selected=true]{background:var(--dsw-alias-button-primary-fill)!important;color:var(--dsw-alias-label-primary-foreground)!important}
          .wbo-template-dock{position:relative;height:0;width:100%;overflow:visible;color:var(--dsw-alias-label-primary)}
          .wbo-template-panel{box-sizing:border-box;z-index:2;position:absolute;top:0;left:50%;transform:translateX(-50%);width:100%;max-width:calc(var(--dsh-composer-card-max-width) + 32px);margin-top:8px;display:flex;flex-direction:column;overflow:hidden}
          .wbo-template-viewport{box-sizing:border-box;overscroll-behavior:contain;scrollbar-width:none;min-height:0;padding:4px 4px 12px;overflow-x:hidden;overflow-y:auto}.wbo-template-viewport::-webkit-scrollbar{display:none}
          .wbo-template-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px 14px}
          .wbo-template-card{min-width:0;min-height:0;position:relative}.wbo-template-open{display:flex;flex-direction:column;width:100%;min-width:0;color:var(--dsw-alias-label-tertiary);font:inherit;cursor:pointer;background:none;border:0;outline:0;padding:0}
          .wbo-template-cover{box-sizing:border-box;aspect-ratio:16/9;border:2px solid transparent;border-radius:9px;width:100%;transition:border-color .12s,transform .12s;display:block;position:relative;overflow:hidden;background:linear-gradient(145deg,var(--dsw-alias-bg-layer-1),var(--dsw-alias-bg-layer-2))}
          .wbo-template-cover img{display:block;position:absolute;top:10%;left:50%;transform:translateX(-50%);width:auto;height:112%;max-width:82%;object-fit:contain;object-position:top;border-radius:5px;box-shadow:0 0 0 1px color-mix(in srgb,var(--dsw-alias-label-primary) 10%,transparent),0 3px 12px color-mix(in srgb,var(--dsw-alias-label-primary) 7%,transparent)}
          .wbo-template-cover::after{content:"";position:absolute;inset:82% 0 0;pointer-events:none;background:linear-gradient(transparent,var(--dsw-alias-bg-layer-2))}
          .wbo-template-card:hover .wbo-template-cover{transform:translateY(-1px)}.wbo-template-open:active .wbo-template-cover{transform:scale(.985)}.wbo-template-open:focus-visible .wbo-template-cover{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:2px}
          .wbo-template-card[data-selected=true] .wbo-template-cover{border-color:var(--dsw-alias-state-business-primary);box-shadow:0 0 0 2px color-mix(in srgb,var(--dsw-alias-state-business-primary) 16%,transparent)}
          .wbo-template-name{min-width:0;max-width:100%;text-align:center;text-overflow:ellipsis;white-space:nowrap;padding-top:5px;font-size:12px;line-height:16px;overflow:hidden;align-self:center}
          .wbo-preview{padding:0;border:1px solid var(--dsw-alias-border-l1);border-radius:16px;width:min(920px,calc(100vw - 40px));max-width:calc(100vw - 24px);max-height:calc(100dvh - 40px);color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-base)}
          .wbo-preview::backdrop{background:var(--dsw-alias-bg-mask-1)}.wbo-preview-shell{display:flex;flex-direction:column;height:min(860px,calc(100dvh - 42px))}.wbo-preview header{display:flex;justify-content:space-between;flex:none;gap:20px;padding:18px 22px}.wbo-preview header strong{font-size:16px}.wbo-preview header p{font-size:12px;color:var(--dsw-alias-label-tertiary);margin:7px 0 0;line-height:1.6}
          .wbo-preview button{border:1px solid var(--dsw-alias-border-l1);border-radius:8px;padding:6px 12px;background:transparent;color:inherit;cursor:pointer;font:inherit}.wbo-preview header>button{align-self:flex-start;font-size:20px;border:0;padding:0 5px}.wbo-preview button:focus-visible,.wbo-preview-pages:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:-2px}
          .wbo-sheet-tabs{display:flex;flex:none;gap:6px;overflow-x:auto;overscroll-behavior:contain;padding:0 22px 12px;border-bottom:1px solid var(--dsw-alias-border-l1);scrollbar-width:thin}.wbo-sheet-tabs button{flex:none;white-space:nowrap;font-size:13px;line-height:20px}.wbo-sheet-tabs button[aria-selected=true]{background:var(--dsw-alias-button-primary-fill);border-color:var(--dsw-alias-button-primary-fill);color:var(--dsw-alias-label-primary-foreground)}
          .wbo-preview-pages{min-height:0;flex:1;overflow:auto;overscroll-behavior:contain;background:var(--dsw-alias-bg-layer-1);padding:22px;text-align:center}.wbo-report-page{width:min(100%,680px);margin:0 auto 22px}.wbo-report-page:last-child{margin-bottom:0}.wbo-page-paper{background:var(--dsw-alias-bg-base);position:relative;box-shadow:0 3px 18px color-mix(in srgb,var(--dsw-alias-label-primary) 12%,transparent);overflow:hidden}.wbo-page-paper img{display:block;width:100%;height:100%;object-fit:contain}.wbo-page-message{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;color:var(--dsw-alias-label-tertiary);padding:20px;font-size:13px}.wbo-report-page figcaption{font-size:12px;line-height:18px;color:var(--dsw-alias-label-tertiary);padding-top:8px}
          .wbo-preview-actions{display:flex;flex:none;justify-content:flex-end;gap:10px;padding:14px 20px;border-top:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-base)}.wbo-preview-actions .wbo-use-template{min-width:104px;border-color:var(--dsw-alias-button-primary-fill);background:var(--dsw-alias-button-primary-fill);color:var(--dsw-alias-label-primary-foreground);font-weight:600}.wbo-preview-actions .wbo-use-template:disabled{opacity:.55;cursor:default}
          .wbo-selected{display:flex;align-items:flex-start}.wbo-selected-preview{position:relative;display:block;flex:none;width:clamp(76px,10vw,92px);aspect-ratio:16/9;transform-origin:50%;transform:rotate(-3deg) scale(1);animation:wbo-selected-reveal .2s cubic-bezier(.34,1.56,.64,1)}.wbo-selected-frame{display:block;width:100%;height:100%;overflow:hidden;border:2px solid var(--dsw-alias-state-business-primary);border-radius:9px;background:var(--dsw-alias-bg-base);box-shadow:0 4px 14px color-mix(in srgb,var(--dsw-alias-label-primary) 18%,transparent)}.wbo-selected-frame img{display:block;width:100%;height:100%;object-fit:contain}.wbo-selected-remove{position:absolute;z-index:2;top:-8px;right:-8px;display:grid;place-items:center;width:20px;height:20px;padding:0;border:1px solid var(--dsw-alias-border-l1);border-radius:50%;background:var(--dsw-alias-button-contrast-fill);color:var(--dsw-alias-label-primary-inverted);box-shadow:0 3px 10px color-mix(in srgb,var(--dsw-alias-label-primary) 28%,transparent);font:500 15px/1 ui-sans-serif,system-ui,sans-serif;cursor:pointer;opacity:0;pointer-events:none;transform:rotate(3deg) scale(.88);transition:opacity .12s,transform .12s}.wbo-selected-preview:hover .wbo-selected-remove,.wbo-selected-preview:focus-within .wbo-selected-remove{opacity:1;pointer-events:auto;transform:rotate(3deg) scale(1)}.wbo-selected-remove:disabled{cursor:progress}.wbo-selected-remove:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:2px}@keyframes wbo-selected-reveal{from{transform:rotate(-3deg) scale(.92)}to{transform:rotate(-3deg) scale(1)}}
          @media(max-width:560px){.wbo-preview-pages{padding:10px}.wbo-preview header{padding:12px}}
          @media(prefers-reduced-motion:reduce){.wbo-template-cover{transition:none}.wbo-selected-preview{animation:none}.wbo-selected-remove{transition:none}}
        `
        return () => {
          const references = Math.max(0, Number(style.dataset.pluginRefs ?? 1) - 1)
          style.dataset.pluginRefs = String(references)
          if (!references && document.getElementById(STYLE_ID) === style) style.remove()
        }
      }, 'dsh-office: styles')
      const store = new ModeStore(), rpc = ctx.get('connection').rpc
      ctx.slots.inject('conversation.hero.modeActions', () => ctx.slots.register({
        name: 'conversation.hero.modeActions', id: 'dsh-office', order: 10,
        inject: sessionId => ({ rpc, store, sessionId, t })
      }, ModeActions))
      ctx.slots.inject('conversation.input.accessory', () => ctx.slots.register({
        name: 'conversation.input.accessory', id: 'dsh-office', order: 20,
        inject: sessionId => ({ rpc, store, sessionId, t })
      }, SelectedTemplate))
      for (const [name, component] of [['conversation.composer.dock', TemplateDock]]) {
        ctx.slots.inject(name, () => ctx.slots.register({ name, id: 'dsh-office', order: 10,
          inject: sessionId => ({ rpc, store, sessionId, t }) }, component))
      }
    }
    return { apply, inject: ['slots', 'locale', 'connection'], ModeStore, TemplateDock, SelectedTemplate }
  }
})
