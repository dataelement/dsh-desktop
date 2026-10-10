/** Fit the entire slide into the measured viewport; zoom multiplies that fit. */
function FitPreviewImage({ src, alt, zoom, onZoom, onError, className }) {
  const h = react.createElement;
  const viewport = react.useRef(null);
  const imageRef = react.useRef(null);
  const [size, setSize] = react.useState({ width: 1, height: 1 });
  const [natural, setNatural] = react.useState({ width: 16, height: 9 });
  const imageReady = image => {
    if (!image?.naturalWidth || !image.naturalHeight) return;
    setNatural({ width: image.naturalWidth, height: image.naturalHeight });
  };
  // Cached images may finish before React installs the load handler.
  react.useEffect(() => { if (imageRef.current?.complete) imageReady(imageRef.current); }, [src]);
  react.useLayoutEffect(() => {
    const node = viewport.current;
    const measure = () => setSize({ width: Math.max(1, node.clientWidth), height: Math.max(1, node.clientHeight) });
    measure();
    if (typeof ResizeObserver === 'undefined') { window.addEventListener('resize', measure); return () => window.removeEventListener('resize', measure); }
    const observer = new ResizeObserver(measure); observer.observe(node); return () => observer.disconnect();
  }, []);
  const zoomValue = react.useRef(zoom);
  zoomValue.current = zoom;
  react.useEffect(() => {
    const node=viewport.current;
    const clamp=value=>Math.max(1,Math.min(3,value));
    const wheel=event=>{
      if(!event.ctrlKey) return;
      event.preventDefault();
      onZoom?.(clamp(zoomValue.current*Math.exp(-event.deltaY*.01)));
    };
    let pinch;
    const distance=touches=>Math.hypot(touches[0].clientX-touches[1].clientX,touches[0].clientY-touches[1].clientY);
    const start=event=>{if(event.touches.length===2){event.preventDefault();pinch={distance:distance(event.touches),zoom:zoomValue.current};}};
    const move=event=>{if(pinch && event.touches.length===2){event.preventDefault();if(pinch.distance>0) onZoom?.(clamp(pinch.zoom*distance(event.touches)/pinch.distance));}};
    const end=()=>{pinch=undefined;};
    node.addEventListener('wheel',wheel,{passive:false});
    node.addEventListener('touchstart',start,{passive:false});node.addEventListener('touchmove',move,{passive:false});
    node.addEventListener('touchend',end);node.addEventListener('touchcancel',end);
    return ()=>{node.removeEventListener('wheel',wheel);node.removeEventListener('touchstart',start);node.removeEventListener('touchmove',move);node.removeEventListener('touchend',end);node.removeEventListener('touchcancel',end);};
  },[onZoom]);
  const scale = Math.min(size.width / natural.width, size.height / natural.height) * zoom;
  const width = natural.width * scale, height = natural.height * scale;
  return h('div', { ref: viewport, className: `ppt-fit-viewport ${className ?? ''}`, style: { flex: 1, minHeight: 0, height: '100%', overflow: 'auto' } },
    h('div', { style: { width: Math.max(size.width, width), height: Math.max(size.height, height), display: 'grid', placeItems: 'center' } },
      h('img', { ref: imageRef, src, alt, 'data-zoom': zoom, onError, onLoad: event => imageReady(event.currentTarget),
        style: { display: 'block', width, height, maxWidth: 'none', flex: 'none' } })));
}

function personalPreviewSlides(template) {
  return template.templateSamples?.representativePages?.length
    ? template.templateSamples.representativePages : Array.from({length:template.slideCount},(_,i)=>i+1);
}

/** Bound the responsive grid by four measured rows, including captions and gaps. */
function ImportProgressThumbnails({ pages, t }) {
  const h = react.createElement;
  const grid = react.useRef(null);
  const [height, setHeight] = react.useState(null);
  react.useLayoutEffect(() => {
    const node = grid.current, first = node.firstElementChild;
    const measure = () => setHeight(first.getBoundingClientRect().height * 4 + parseFloat(getComputedStyle(node).rowGap) * 3);
    measure();
    if (typeof ResizeObserver === 'undefined') { window.addEventListener('resize', measure); return () => window.removeEventListener('resize', measure); }
    const observer = new ResizeObserver(measure);
    observer.observe(first);
    return () => observer.disconnect();
  }, []);
  return h('div', { ref: grid, className: 'personal-progress-pages', tabIndex: 0, role: 'region', 'aria-label': t('personal.preview'),
    style: height === null ? undefined : { '--personal-progress-height': `${height}px` } },
    ...pages.map(item => h('figure', { key: item.page },
      h('img', { src: item.preview, alt: `${t('personal.preview')} ${item.page}` }), h('figcaption', null, item.page))));
}

/** Shared detailed template viewer; selection remains an independent action. */
function TemplatePreviewCard({ template, selected, choose, client, t }) {
  const h = react.createElement;
  const [open, setOpen] = react.useState(false);
  const [page, setPage] = react.useState(0);
  const [pages, setPages] = react.useState({});
  const [loading, setLoading] = react.useState(false);
  const [error, setError] = react.useState('');
  const [zoom, setZoom] = react.useState(1);
  const dialog = react.useRef(null);
  const request = react.useRef(0);
  const titleId = react.useId();
  const staticPages = FULL_TEMPLATE_PREVIEWS[template.id] ?? template.previewImages ?? [];
  const detailedPersonal = template.origin === 'personal' && client.bound === true;
  const slides=personalPreviewSlides(template);
  const count = detailedPersonal ? slides.length : staticPages.length;
  const cacheKey=slide=>`${template.previewVersion ?? 0}:${slide}`;
  const src = detailedPersonal ? pages[cacheKey(slides[page])] : staticPages[page];
  async function load(next) {
    const slide=slides[next],key=cacheKey(slide);
    const token = ++request.current;
    setPage(next); setZoom(1); setError('');
    if (!detailedPersonal || pages[key]) { setLoading(false); return; }
    setLoading(true);
    try {
      const result = await client.call('template/preview-saved-page', { templateId: template.id, page: slide });
      if (request.current === token) setPages(value => ({ ...value, [key]: result.preview }));
    } catch (reason) {
      if (request.current === token) setError(reason instanceof Error ? reason.message : String(reason));
    } finally { if (request.current === token) setLoading(false); }
  }
  react.useLayoutEffect(() => {
    if (!open) return;
    const node = dialog.current;
    node.showModal();
    node.querySelector('button')?.focus();
    load(0);
    return () => { request.current++; if (node.open) node.close(); };
  }, [open,template.previewVersion]);
  react.useEffect(() => () => { request.current++; }, [client, template.id,template.previewVersion]);
  return h('div', { className: 'ppt-preview-card' },
    h('style', null, TEMPLATE_VIEWER_CSS),
    h(TemplateCard, { template, selected, choose }),
    h('button', { type: 'button', className: 'ppt-preview-open', 'aria-label': `${t('personal.view')} · ${template.name}`, title: t('personal.view'), onClick: () => setOpen(true) },
      h('svg', { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, 'aria-hidden': true },
        h('path', { d: 'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z' }),
        h('circle', { cx: 12, cy: 12, r: 3 }))),
    open && h('dialog', { ref: dialog, className: 'ppt-template-viewer', 'aria-labelledby': titleId,
      onCancel: event => { event.preventDefault(); setOpen(false); },
      onClick: event => {
        if (event.target !== event.currentTarget) return;
        const rect = event.currentTarget.getBoundingClientRect();
        if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) setOpen(false);
      },
      onKeyDown: event => {
        if (event.key === 'ArrowLeft' && page > 0) { event.preventDefault(); load(page - 1); }
        if (event.key === 'ArrowRight' && page < count - 1) { event.preventDefault(); load(page + 1); }
        if (event.key === 'Tab') {
          const buttons = [...event.currentTarget.querySelectorAll('button:not(:disabled)')];
          const first = buttons[0], last = buttons.at(-1);
          if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
          else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
        }
      } },
      h('header', null, h('h2', { id: titleId }, template.name), h('button', { type: 'button', 'aria-label': t('personal.close'), onClick: () => setOpen(false) }, '×')),
      h('div', { className: 'ppt-template-stage', 'aria-busy': loading },
        loading ? h('span', { role: 'status' }, t('personal.processing'))
          : error ? h('div', { role: 'alert' }, h('p', null, error), h('button', { type: 'button', onClick: () => load(page) }, t('templates.retry')))
          : src ? h(FitPreviewImage, { src, alt: `${template.name} ${page + 1}`, zoom, onZoom: setZoom, onError: () => setError(t('personal.previewFailed')) })
          : h('span', { role: 'status' }, t('personal.previewFailed'))),
      h('footer', null,
        h('button', { type: 'button', disabled: page === 0, 'aria-label': t('personal.previous'), onClick: () => load(page - 1) }, '‹'),
        h('span', { role: 'status' }, `${template.templateSamples ? t('personal.layouts')+' ' : ''}${page + 1} / ${count}`),
        h('button', { type: 'button', disabled: page >= count - 1, 'aria-label': t('personal.next'), onClick: () => load(page + 1) }, '›'),
        h('button',{type:'button',className:'ppt-preview-use',onClick:()=>{if(!selected)choose(template);setOpen(false);}},t('personal.useSame')))));
}
const FULL_TEMPLATE_PREVIEWS = /* GENERATED_PPT_FULL_PREVIEWS */ {};
const TEMPLATE_VIEWER_CSS = `
.ppt-preview-card {position:relative;min-width:0}
.ppt-preview-open {position:absolute;left:10px;top:10px;width:28px;height:28px;display:grid;place-items:center;padding:0;opacity:0;pointer-events:none;transition:opacity 120ms;border:1px solid var(--dsw-alias-border-l2-darkmode-thin);border-radius:7px;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);font:inherit;font-size:12px;cursor:pointer}
.ppt-preview-card:hover .ppt-preview-open,.ppt-preview-card:focus-within .ppt-preview-open {opacity:1;pointer-events:auto}
@media (hover:none) {.ppt-preview-open {opacity:1;pointer-events:auto}}
@media (prefers-reduced-motion:reduce) {.ppt-preview-open {transition:none}}
.ppt-template-viewer {box-sizing:border-box;width:min(1280px,calc(100vw - 32px));height:min(900px,calc(100dvh - 32px));padding:20px;margin:auto;border:1px solid var(--dsw-alias-border-l2-darkmode-thin);border-radius:16px;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);font:inherit}
.ppt-template-viewer[open] {display:flex;flex-direction:column;gap:16px}
.ppt-template-viewer::backdrop {background:color-mix(in srgb,var(--dsw-alias-label-primary) 45%,transparent)}
.ppt-template-viewer header,.ppt-template-viewer footer {display:flex;align-items:center;gap:12px;flex:none}
.ppt-template-viewer .ppt-preview-use {width:auto;padding:0 14px;margin-left:8px;background:var(--dsw-alias-label-primary);color:var(--dsw-alias-bg-base);border-color:transparent;font-size:13px}
.ppt-template-viewer header {justify-content:space-between}
.ppt-template-viewer h2 {font-size:16px;margin:0;overflow-wrap:anywhere}
.ppt-template-viewer footer {justify-content:center;flex-wrap:wrap;font-size:13px;font-variant-numeric:tabular-nums}
.ppt-template-viewer button {min-width:32px;min-height:32px;border:1px solid var(--dsw-alias-border-l2-darkmode-thin);border-radius:7px;background:var(--dsw-alias-bg-base);color:inherit;font:inherit;cursor:pointer}
.ppt-template-viewer button:disabled {opacity:.35;cursor:default}
.ppt-template-viewer button:focus-visible,.ppt-preview-open:focus-visible {outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:2px}
.ppt-template-stage {display:flex;flex-direction:column;flex:1;min-height:0;overflow:auto;border-radius:8px;background:var(--dsw-alias-interactive-bg-hover);position:relative}
.ppt-template-stage img {display:block;height:auto;margin:0 auto}
.ppt-template-stage>[role] {display:grid;place-content:center;min-height:240px;text-align:center;padding:16px}
`;

/** Injected into both maintained client factories by the PPT build. */
function PersonalTemplateManager({ client, mode, sessionId, state, choose, t, mutable = true, builtInCards = [] }) {
  const h = react.createElement;
  const input = react.useRef(null);
  const [busy, setBusy] = react.useState(false);
  const [error, setError] = react.useState('');
  const [draft, setDraft] = react.useState(null);
  const [importing, setImporting] = react.useState(false);
  const savedDraft = react.useRef(null);
  const [name, setName] = react.useState('');
  const [page, setPage] = react.useState(0);
  const [pageLoading, setPageLoading] = react.useState(false);
  const [pageError, setPageError] = react.useState('');
  const [zoom, setZoom] = react.useState(1);
  const pageRequest = react.useRef(0);
  const [editing, setEditing] = react.useState(null);
  const [deleting, setDeleting] = react.useState(null);
  const [description, setDescription] = react.useState('');
  const dialog = react.useRef(null);
  const editName = react.useRef(null);
  const cancelDelete = react.useRef(null);
  const dialogId = react.useId();
  const modalOpen = importing || editing !== null || deleting !== null;
  const [notice, setNotice] = react.useState('');
  const [savedFeedback,setSavedFeedback] = react.useState(null);
  react.useEffect(()=>{if(!savedFeedback)return;const timer=setTimeout(()=>setSavedFeedback(null),2400);return()=>clearTimeout(timer);},[savedFeedback]);
  const alive = react.useRef(true);
  const generation = react.useRef(0);
  const [importProgress,setImportProgress] = react.useState({total:0,pages:[]});
  const activeDraft = react.useRef(null);
  const activeUpload = react.useRef(null);
  react.useEffect(() => { activeDraft.current = draft; }, [draft]);
  react.useEffect(() => {
    generation.current++; pageRequest.current++;
    alive.current = true;
    setPageLoading(false); setPageError(''); setZoom(1); setDraft(null); setImporting(false); savedDraft.current = null; setBusy(false); setError(''); setNotice(''); setSavedFeedback(null); setEditing(null); setDeleting(null);
    return () => {
      generation.current++; pageRequest.current++;
      alive.current = false;
      if (activeDraft.current) client.call('template/cancel', { draftId: activeDraft.current.draftId }).catch(() => {});
      activeDraft.current = null;
      if (activeUpload.current) activeUpload.current.client.call('template/upload-cancel', { uploadId: activeUpload.current.uploadId }).catch(() => {});
      activeUpload.current = null;
    };
  }, [client, sessionId]);
  const templates = state.templates.filter(item => item.origin === 'personal').sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));
  const deletingTemplate = templates.find(template => template.id === deleting);
  const slides=draft ? personalPreviewSlides(draft.template) : [];
  react.useLayoutEffect(() => {
    if (!modalOpen) return;
    const node = dialog.current;
    node.showModal();
    return () => { if (node.open) node.close(); };
  }, [modalOpen]);
  react.useLayoutEffect(() => {
    if (modalOpen) (deleting ? cancelDelete.current : editName.current)?.focus();
  }, [modalOpen, deleting, !!draft]);
  const dismissModal = () => {
    pageRequest.current++;setPageLoading(false); setPageError(''); setZoom(1);
    activeDraft.current = null; savedDraft.current = null;
    setDraft(null); setImporting(false); setEditing(null); setDeleting(null); setError('');
  };
  const closeModal = () => {
    if (busy) return;
    if (draft && !savedDraft.current) act(() => client.call('template/cancel', { draftId: draft.draftId }), true);
    else dismissModal();
  };
  const openEditor = template => { setName(template.name); setDescription(template.description ?? ''); setError(''); setDeleting(null); setEditing(template.id); };
  async function refresh() {
    const current = generation.current;
    const next = await client.call('state');
    if (!alive.current || generation.current !== current) return;
    if (client.bound === true) mode.setTemplateState(sessionId, next);
    else mode.setTemplates(sessionId, next.templates ?? []);
  }
  async function act(work, close = false) {
    if (busy) return;
    setBusy(true); setError(''); setNotice(''); setSavedFeedback(null);
    const current = generation.current;
    const isCurrent = () => alive.current && generation.current === current;
    try {
      await work(isCurrent);
      if (close && isCurrent()) dismissModal();
    }
    catch (reason) { if (alive.current && generation.current === current) setError(reason instanceof Error ? reason.message : String(reason)); }
    finally { if (alive.current && generation.current === current) setBusy(false); }
  }
  react.useEffect(() => {
    const current = generation.current;
    refresh().catch(reason => { if (alive.current && generation.current === current) setError(String(reason)); });
  }, [client, sessionId]);
  async function upload(file) {
    if (!file) return;
    const current = generation.current;
    setImporting(true); setImportProgress({total:0,pages:[]});
    await act(async isCurrent => {
      if (!/\.pptx$/i.test(file.name)) throw new Error(t('personal.fileType'));
      const { uploadId, chunkBytes } = await client.call('template/upload-start', { input: { fileName: file.name, size: file.size } });
      try {
        if (!isCurrent()) return;
        activeUpload.current = { uploadId, client };
        for (let offset = 0; offset < file.size; offset += chunkBytes) {
          if (!isCurrent()) return;
          const base64 = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result).split(',')[1]);
            reader.onerror = () => reject(new Error(t('personal.readFailed')));
            reader.readAsDataURL(file.slice(offset, offset + chunkBytes));
          });
          if (!isCurrent()) return;
          await client.call('template/upload-chunk', { uploadId, offset, base64 });
        }
        if (!isCurrent()) return;
        const requestId=crypto.randomUUID();
        let polling=true,after=0;
        const poll=async () => {
          while(polling && alive.current && current===generation.current) {
            try {
              const progress=await client.call('template/import-progress',{requestId,after});
              if(polling && alive.current && current===generation.current) {
                after=progress.completed;
                setImportProgress(previous=>({total:progress.total,pages:[...previous.pages,...progress.pages]}));
              }
            } catch { /* The prepare request remains the authoritative error result. */ }
            if(polling) await new Promise(resolve=>setTimeout(resolve,400));
          }
        };
        const pollingTask=poll();
        let result;
        try {result=await client.call('template/prepare', { input: { uploadId, requestId } });}
        finally {polling=false;void pollingTask;}

        if (!alive.current || current !== generation.current) { if (result.draftId) await client.call('template/cancel', { draftId: result.draftId }); return; }
        if (result.duplicate) { await refresh(); if (alive.current && current === generation.current) { dismissModal(); setNotice(t('personal.duplicate')); } return; }
        setDraft({
          ...result,
          slideCount: result.template.slideCount,
          pages: { 1: result.preview }
        });
        setName(result.template.name); setPage(0);
      } finally {
        if (activeUpload.current?.uploadId === uploadId) activeUpload.current = null;
        // The host also expires abandoned transfers after a client disconnect.
        await client.call('template/upload-cancel', { uploadId }).catch(() => {});
      }
    });
  }
  async function showPage(next) {
    if (!draft || next < 0 || next >= slides.length) return;
    const token = ++pageRequest.current;
    const current = generation.current;
    setPage(next); setZoom(1); setPageError('');
    const slide=slides[next];
    if (draft.pages[slide]) { setPageLoading(false); return; }
    setPageLoading(true);
    try {
      const result = await client.call('template/preview-page', { draftId: draft.draftId, page: slide });
      if (!alive.current || generation.current !== current || token !== pageRequest.current) return;
      setDraft(value => value && value.draftId === draft.draftId ? { ...value, pages: { ...value.pages, [slide]: result.preview } } : value);
    } catch (reason) {
      if (alive.current && generation.current === current && token === pageRequest.current) setPageError(reason instanceof Error ? reason.message : String(reason));
    } finally { if (alive.current && generation.current === current && token === pageRequest.current) setPageLoading(false); }
  }
  const icon = name => h('svg', { width: name === 'create' ? 28 : 16, height: name === 'create' ? 28 : 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.65, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true },
    ...(name === 'create' ? ['m4 20 11-11 3 3L7 23z', 'm14 10 3 3', 'M6 3v4M4 5h4M18 2v4M16 4h4M21 8v4M19 10h4']
      : name === 'rename' ? ['m15 4 5 5', 'M4 20l4-1L20 7a2.8 2.8 0 0 0-4-4L4 15z']
      : name === 'delete' ? ['M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7']
      : name === 'close' ? ['m6 6 12 12M6 18 18 6']
      : ['m7 12 3 3 7-7']).map((d, i) => h('path', { d, key: i })));
  return h('div', { 'data-personal-template-library': '', style: { padding: '8px 4px 16px', display: 'grid', gap: 16 } },
    h('style', null, `
      [data-personal-template-library] .personal-create {box-sizing:border-box;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;aspect-ratio:16/9;width:100%;padding:20px;border:2px solid transparent;border-radius:14px;background:var(--dsw-alias-interactive-bg-hover,#f1f2f4);color:var(--dsw-alias-label-secondary,#686b73);font:inherit;font-size:13px;cursor:pointer;transition:background .15s,color .15s}
      [data-personal-template-library] .personal-create:hover {background:color-mix(in srgb,var(--dsw-alias-label-primary,#222) 10%,var(--dsw-alias-bg-base,#fff));color:var(--dsw-alias-label-primary,#222)}
      [data-personal-template-library] .personal-create:focus-visible {outline:2px solid var(--dsw-alias-state-business-primary,#3385ff);outline-offset:2px}
      [data-personal-template-library] .personal-create:disabled {opacity:.55;cursor:default}
      [data-personal-card] {min-width:0;display:grid;grid-template-columns:minmax(0,1fr);gap:8px;align-content:start}
      [data-personal-card] .personal-frame {min-width:0;position:relative}
      [data-personal-card] .${OfficePptHero_module_css_default.previewViewport} {box-sizing:border-box;border-radius:14px}
      [data-personal-card] .personal-selected {box-sizing:border-box;position:absolute;inset:0 0 auto;aspect-ratio:16/9;display:flex;align-items:center;justify-content:center;gap:7px;border:2px solid var(--dsw-alias-state-business-primary,#3385ff);border-radius:14px;background:#0006;color:white;font-size:13px;pointer-events:none}
      [data-personal-card] .personal-check {display:grid;place-items:center;background:white;color:#50545c;border-radius:50%;width:18px;height:18px}
      [data-personal-card] .personal-actions {position:absolute;top:8px;right:8px;display:flex;gap:4px;z-index:2;opacity:0;pointer-events:none;transition:opacity .12s}
      [data-personal-card]:hover .personal-actions,[data-personal-card]:has(:focus-visible) .personal-actions {opacity:1;pointer-events:auto}
      [data-personal-card] .personal-actions button {display:grid;place-items:center;width:28px;height:28px;border:1px solid #ffffff26;border-radius:7px;background:#222c;color:#fff;cursor:pointer;backdrop-filter:blur(8px)}
      [data-personal-card] .personal-actions button:hover {background:#111}
      [data-personal-card] .personal-actions button:focus-visible {outline:2px solid var(--dsw-alias-state-business-primary,#3385ff);outline-offset:2px}
      [data-personal-card] .personal-actions button:disabled {opacity:.5;cursor:default}
      .personal-dialog {box-sizing:border-box;width:min(560px,calc(100vw - 40px));max-height:calc(100dvh - 48px);margin:auto;padding:26px;border:1px solid var(--dsw-alias-border-l2-darkmode-thin,#e7e7e9);border-radius:20px;background:var(--dsw-alias-bg-base,#fff);color:var(--dsw-alias-label-primary,#242424);font:inherit;box-shadow:0 24px 80px #0003;overflow-y:auto;overscroll-behavior:contain}
      .personal-dialog::backdrop {background:rgb(0 0 0 / .5)}
      .personal-dialog header {display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:26px}
      .personal-dialog h2 {margin:0;font-size:18px;line-height:26px;font-weight:600}
      .personal-dialog .personal-close {display:grid;place-items:center;flex:none;width:28px;height:28px;padding:0;border:0;border-radius:7px;background:transparent;color:var(--dsw-alias-label-secondary,#777);cursor:pointer}
      .personal-dialog form,.personal-dialog .personal-fields {display:grid;gap:22px}
      .personal-dialog label {display:grid;gap:9px;color:var(--dsw-alias-label-secondary,#666);font-size:14px;line-height:20px}
      .personal-dialog input,.personal-dialog textarea {box-sizing:border-box;width:100%;margin:0;padding:12px 14px;border:1px solid transparent;border-radius:12px;background:var(--dsw-alias-interactive-bg-hover,#f4f4f5);color:var(--dsw-alias-label-primary,#242424);font:inherit;font-size:14px;line-height:21px}
      .personal-dialog textarea {min-height:112px;resize:vertical;max-height:260px}
      .personal-dialog input::placeholder,.personal-dialog textarea::placeholder {color:var(--dsw-alias-label-tertiary,#999)}
      .personal-dialog footer {display:flex;align-items:center;justify-content:flex-end;gap:10px;margin-top:4px}
      .personal-dialog footer button {min-height:38px;padding:8px 16px;border:1px solid #d1d5db;background:#fff;color:#242424;border-radius:10px;font:inherit;font-size:14px;line-height:20px;cursor:pointer;transition:transform 120ms cubic-bezier(.23,1,.32,1)}
      .personal-dialog .personal-submit {min-width:104px}
      .personal-dialog :is(button,input,textarea,.personal-progress-pages):focus-visible {outline:2px solid var(--dsw-alias-state-business-primary,#3888ff);outline-offset:2px}
      .personal-dialog button:active:not(:disabled) {transform:scale(.97)}
      .personal-dialog :disabled {cursor:default}
      .personal-dialog .personal-modal-error {margin:0;padding:10px 12px;border-radius:10px;background:#f0445212;color:#d12e3c;font-size:13px;white-space:pre-wrap;overflow-wrap:anywhere}
      .personal-dialog .personal-delete-copy {margin:0 0 26px;color:var(--dsw-alias-label-secondary,#666);font-size:14px;line-height:1.65;overflow-wrap:anywhere}
      .personal-dialog.personal-upload {width:min(1280px,calc(100vw - 32px))}
      .personal-dialog.personal-upload[open] {display:flex;flex-direction:column}
      .personal-upload header,.personal-upload footer {flex:none}
      .personal-upload footer {display:grid;grid-template-columns:minmax(0,1fr) auto minmax(0,1fr);align-items:center;gap:12px}
      .personal-upload footer .personal-pagination {grid-column:2;justify-self:center;flex-wrap:nowrap;white-space:nowrap}
      .personal-upload-actions {grid-column:3;justify-self:end;display:flex;align-items:center;gap:10px;white-space:nowrap}
      .personal-dialog .personal-upload-form {display:flex;flex-direction:column;gap:18px;min-height:0}
      .personal-upload-body {display:grid;gap:16px;overflow-y:auto;overscroll-behavior:contain;min-height:0;padding:4px}
      .personal-upload-preview {display:block;width:100%;height:auto;max-width:none;border:1px solid var(--dsw-alias-border-l2-darkmode-thin,#e7e7e9);border-radius:10px;background:white;box-sizing:border-box}
      .personal-zoom-stage {position:relative;height: min(55dvh,650px);min-height:180px;overflow:auto;background:var(--dsw-alias-interactive-bg-hover)}
      .personal-zoom-stage>[role] {min-height:260px;display:grid;place-content:center;gap:12px}
      .personal-pagination {display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:12px;font-size:13px;font-variant-numeric:tabular-nums}
      .personal-pagination button {display:grid;place-items:center;width:32px;height:32px;border:1px solid var(--dsw-alias-border-l2-darkmode-thin,#ddd);border-radius:8px;background:transparent;color:inherit;cursor:pointer;font-size:18px}
      .personal-pagination button:disabled {color:var(--dsw-alias-label-tertiary,#aaa)}
      .personal-upload footer .personal-pagination button {min-height:32px;padding:0;font-size:18px}
      @media (max-width:640px) {.personal-upload footer {grid-template-columns:minmax(0,1fr) auto;gap:8px}.personal-upload footer .personal-pagination {grid-column:1;justify-self:start;gap:8px}.personal-upload-actions {grid-column:2;gap:8px}.personal-upload footer .personal-upload-actions button {padding-inline:10px}}
      .personal-progress-pages {display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:16px;width:100%;align-self:stretch;align-content:start;max-height:min(var(--personal-progress-height,55dvh),max(120px,calc(100dvh - 240px)));overflow-y:auto;overscroll-behavior:contain;scrollbar-gutter:stable;flex-shrink:0}
      .personal-progress-pages figure {animation:personal-thumbnail-enter 160ms cubic-bezier(.23,1,.32,1) both;margin:0;min-width:0;color:var(--dsw-alias-label-secondary,#666);text-align:center;font-size:12px}
      .personal-progress-pages img {display:block;width:100%;aspect-ratio:16/9;object-fit:contain;background:var(--dsw-alias-background-secondary,#f4f4f4);border-radius:4px;margin-bottom:4px}
      .personal-upload-wait:has(.personal-progress-pages) {justify-content:flex-start;align-items:flex-start}
      .personal-upload-wait {position:relative;box-sizing:border-box;width:100%;padding-bottom:32px;min-height:260px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;color:var(--dsw-alias-label-secondary,#666);font-size:14px;line-height:22px}
      .personal-progress-count {position:absolute;right:0;bottom:0;font-size:12px;font-variant-numeric:tabular-nums}
      .personal-save-feedback {position:fixed;right:24px;bottom:24px;z-index:100;display:flex;align-items:center;gap:8px;padding:12px 16px;border:1px solid var(--dsw-alias-border-l2-darkmode-thin,#ddd);border-radius:12px;background:var(--dsw-alias-bg-base,#fff);color:var(--dsw-alias-state-success-primary,#22864a);box-shadow:0 4px 20px #0001;font-size:14px;pointer-events:none}
      @keyframes personal-thumbnail-enter {from {opacity:0;transform:translateY(3px)} to {opacity:1;transform:translateY(0)}}
      @media (prefers-reduced-motion:reduce) {.personal-progress-pages figure {animation:none}}
      .personal-loading-dots {display:flex;align-items:center;gap:6px;height:16px;color:var(--dsw-alias-label-secondary)}
      .personal-loading-dots span {width:5px;height:5px;border-radius:50%;background:currentColor;opacity:.25;animation:personal-loading-pulse 1.5s linear infinite;animation-delay:var(--dot-delay)}
      @keyframes personal-loading-pulse {0%,65%,100% {opacity:.25} 30% {opacity:.85}}
      @media (prefers-reduced-motion:reduce) {.personal-loading-dots span {animation:none;opacity:.6}}
      @media (hover:hover) and (pointer:fine) {.personal-dialog button:hover:not(:disabled) {filter:brightness(.94)}.personal-dialog .personal-close:hover {background:var(--dsw-alias-interactive-bg-hover,#f1f2f4)}}
      @media (hover:none) {[data-personal-card] .personal-actions {opacity:1;pointer-events:auto}}
      @media (prefers-reduced-motion:reduce) {[data-personal-template-library] .personal-create,[data-personal-card] .personal-actions,.personal-dialog footer button {transition:none}.personal-dialog button:active:not(:disabled) {transform:none}}
    `),
    h('input', { ref: input, type: 'file', accept: '.pptx', hidden: true, disabled: busy || draft !== null, onChange: e => { const file = e.target.files?.[0]; e.target.value = ''; upload(file); } }),
    error && !modalOpen && h('div', { role: 'alert', style: { color: '#b42318', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', maxHeight: 280, overflowY: 'auto' } }, error),
    notice && h('div', { role: 'status' }, notice),
    savedFeedback && h('div',{className:'personal-save-feedback',role:'status','aria-live':'polite'},
      h('svg',{width:24,height:24,viewBox:'0 0 24 24',fill:'none','aria-hidden':true},
        h('circle',{cx:12,cy:12,r:11,fill:'currentColor',opacity:.12}),
        h('path',{d:'M6.5 12.5 10 16 17.5 8',stroke:'currentColor',strokeWidth:2,strokeLinecap:'round',strokeLinejoin:'round',pathLength:1})),
      h('span',null,t('personal.saved'))),
    h('div', { className: OfficePptHero_module_css_default.templateGrid, 'data-personal-template-grid': '' },
      mutable && h('button', { type: 'button', className: 'personal-create', disabled: busy, onClick: () => input.current?.click() }, icon('create'), h('span', null, t('personal.create'))),
      ...templates.map(template => h('div', { key: template.id, 'data-personal-card': template.id },
      h('div', { className: 'personal-frame' },
        h(TemplatePreviewCard, { template, selected: template.id === state.selectedId, choose, client, t }),
        template.id === state.selectedId && h('div', { className: 'personal-selected', 'aria-hidden': true }, h('span', { className: 'personal-check' }, icon('check')), t('personal.selected')),
        mutable && h('div', { className: 'personal-actions' },
          h('button', { type: 'button', disabled: busy, title: t('personal.edit'), 'aria-label': t('personal.edit'), onClick: () => openEditor(template) }, icon('rename')),
          h('button', { type: 'button', disabled: busy, title: t('personal.delete'), 'aria-label': t('personal.delete'), onClick: () => { setError(''); setDeleting(template.id); setEditing(null); } }, icon('delete')))))),
      ...builtInCards),
    h('dialog', { ref: dialog, className: `personal-dialog${importing ? ' personal-upload' : ''}`, 'aria-labelledby': `${dialogId}-title`, 'aria-modal': true,
      onCancel: event => { event.preventDefault(); closeModal(); },
      onKeyDown: event => {
        if (event.key !== 'Tab') return;
        const fields = [...event.currentTarget.querySelectorAll('button:not(:disabled),input:not(:disabled),textarea:not(:disabled),[tabindex="0"]')];
        const first = fields[0], last = fields.at(-1);
        if (event.shiftKey && (document.activeElement === first || !event.currentTarget.contains(document.activeElement))) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && (document.activeElement === last || !event.currentTarget.contains(document.activeElement))) { event.preventDefault(); first?.focus(); }
      },
      onClick: event => {
        if (event.target !== event.currentTarget) return;
        const rect = event.currentTarget.getBoundingClientRect();
        if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) closeModal();
      } },
      modalOpen && h(react.Fragment, null,
        h('header', null, h('h2', { id: `${dialogId}-title` }, t(importing ? 'personal.preview' : deleting ? 'personal.deleteTitle' : 'personal.editTitle')),
          h('button', { type: 'button', className: 'personal-close', disabled: busy, 'aria-label': t('personal.close'), onClick: closeModal }, icon('close'))),
        importing ? h('form', { className: 'personal-upload-form', 'aria-busy': busy, onSubmit: event => {
          event.preventDefault(); if (!draft || !name.trim()) return;
          act(async current => {
            if (!savedDraft.current) {
              const saved = await client.call('template/save', { draftId: draft.draftId, name });
              if (!current()) return;
              savedDraft.current = saved;
              activeDraft.current = null;
            }
            await client.call('template/select', { templateId: savedDraft.current.id, mode: 'ppt' });
            if (current()) {await refresh();if(current())setSavedFeedback({id:savedDraft.current.id});}
          }, true);
        } },
          h('div', { className: 'personal-upload-body' },
            draft ? h(react.Fragment, null,
              h('label', null, t('personal.name'), h('input', { ref: editName, value: name, maxLength: 80, required: true, disabled: busy || !!savedDraft.current, autoComplete: 'off', onChange: event => setName(event.target.value) })),
              draft.template.resourcePlaceholders?.length > 0 && h('small', { role: 'status', style: { color: 'var(--dsw-alias-label-secondary,#666)', fontSize: 12 } }, t('personal.placeholderNotice')),
              h('div', { className: 'personal-zoom-stage', 'aria-busy': pageLoading },
                pageLoading ? h('div', { role: 'status' }, t('personal.processing'))
                : pageError ? h('div', { role: 'alert' }, h('span', null, pageError), h('button', { type: 'button', onClick: () => showPage(page) }, t('templates.retry')))
                : h(FitPreviewImage, { src: draft.pages[slides[page]], alt: `${t('personal.preview')} ${page + 1}`, zoom, onZoom: setZoom, onError: () => setPageError(t('personal.previewFailed')) })))
            : busy && h('div', { className: 'personal-upload-wait' },
              !importProgress.pages.length && h('div', { className: 'personal-loading-dots', 'aria-hidden': true },
                ...[0, 1, 2].map(index => h('span', { key: index, style: { '--dot-delay': `${index * .2}s` } }))),
              h('span', {className:importProgress.total ? 'personal-progress-count' : '',role:'status','aria-live':'polite'}, importProgress.total ? `${t('personal.completedPages')} ${importProgress.pages.length} / ${importProgress.total}` : t('personal.processing')),
              importProgress.pages.length>0 && h(ImportProgressThumbnails,{pages:importProgress.pages,t})),
            error && h('div', { role: 'alert', className: 'personal-modal-error' }, error)),
          h('footer', null,
            draft && h('div', { className: 'personal-pagination' },
              h('button', { type: 'button', 'aria-label': t('personal.previous'), disabled: page === 0, onClick: () => showPage(page - 1) }, '‹'),
              h('span', { role: 'status' }, `${draft.template.templateSamples ? t('personal.layouts')+' ' : ''}${page + 1} / ${slides.length}`),
              h('button', { type: 'button', 'aria-label': t('personal.next'), disabled: page === slides.length - 1, onClick: () => showPage(page + 1) }, '›')),
            h('div', { className: 'personal-upload-actions' },
              h('button', { type: 'button', disabled: busy, onClick: closeModal }, t('personal.cancel')),
              draft ? h('button', { type: 'submit', className: 'personal-submit', disabled: busy || !name.trim() }, t(busy ? 'personal.processing' : 'personal.save'))
              : !busy && h('button', { type: 'button', onClick: () => input.current?.click() }, t('personal.chooseFile')))))
        : deleting ? h('div', { className: 'personal-fields' },
          h('p', { className: 'personal-delete-copy' }, `${deletingTemplate?.name ?? ''}。${t('personal.deleteHint')}`),
          error && h('div', { role: 'alert', className: 'personal-modal-error' }, error),
          h('footer', null,
            h('button', { ref: cancelDelete, type: 'button', className: 'personal-cancel', disabled: busy, onClick: () => { setDeleting(null); setError(''); } }, t('personal.cancel')),
            h('button', { type: 'button', className: 'personal-danger', disabled: busy, onClick: () => act(async current => {
              await client.call('template/delete', { templateId: deleting });
              if (current()) await refresh();
            }, true) }, t(busy ? 'personal.processing' : 'personal.confirmDelete'))))
        : h('form', { 'aria-busy': busy, onSubmit: event => { event.preventDefault(); if (!name.trim()) return; act(async current => {
            await client.call('template/update', { templateId: editing, name, description });
            if (current()) await refresh();
          }, true); } },
          h('label', null, t('personal.name'), h('input', { ref: editName, value: name, maxLength: 80, required: true, disabled: busy, autoComplete: 'off', onChange: event => setName(event.target.value) })),
          h('label', null, t('personal.description'), h('textarea', { value: description, maxLength: 1000, disabled: busy, placeholder: t('personal.descriptionPlaceholder'), onChange: event => setDescription(event.target.value) })),
          error && h('div', { role: 'alert', className: 'personal-modal-error' }, error),
          h('footer', null,
            h('button', { type: 'button', className: 'personal-danger', disabled: busy, onClick: () => { setDeleting(editing); setError(''); } }, t('personal.delete')),
            h('button', { type: 'submit', className: 'personal-submit', disabled: busy || !name.trim() }, t(busy ? 'personal.processing' : 'personal.update')))))));
}
