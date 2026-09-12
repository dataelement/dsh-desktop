/** Injected into both maintained client factories by the PPT build. */
function PersonalTemplateManager({ client, mode, sessionId, state, choose, t }) {
  const h = react.createElement;
  const input = react.useRef(null);
  const [busy, setBusy] = react.useState(false);
  const [error, setError] = react.useState('');
  const [draft, setDraft] = react.useState(null);
  const [importing, setImporting] = react.useState(false);
  const savedDraft = react.useRef(null);
  const [name, setName] = react.useState('');
  const [page, setPage] = react.useState(0);
  const [editing, setEditing] = react.useState(null);
  const [deleting, setDeleting] = react.useState(null);
  const [description, setDescription] = react.useState('');
  const dialog = react.useRef(null);
  const editName = react.useRef(null);
  const cancelDelete = react.useRef(null);
  const dialogId = react.useId();
  const modalOpen = importing || editing !== null || deleting !== null;
  const [notice, setNotice] = react.useState('');
  const alive = react.useRef(true);
  const generation = react.useRef(0);
  const activeDraft = react.useRef(null);
  react.useEffect(() => { activeDraft.current = draft; }, [draft]);
  react.useEffect(() => {
    generation.current++;
    alive.current = true;
    setDraft(null); setImporting(false); savedDraft.current = null; setBusy(false); setError(''); setNotice(''); setEditing(null); setDeleting(null);
    return () => {
      generation.current++;
      alive.current = false;
      if (activeDraft.current) client.call('template/cancel', { draftId: activeDraft.current.draftId }).catch(() => {});
      activeDraft.current = null;
    };
  }, [client, sessionId]);
  const templates = state.templates.filter(item => item.origin === 'personal').sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));
  const deletingTemplate = templates.find(template => template.id === deleting);
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
    mode.setTemplateState(sessionId, next);
  }
  async function act(work, close = false) {
    if (busy) return;
    setBusy(true); setError(''); setNotice('');
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
    setImporting(true);
    await act(async () => {
      if (!/\.pptx$/i.test(file.name)) throw new Error(t('personal.fileType'));
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result).split(',')[1]);
        reader.onerror = () => reject(new Error(t('personal.readFailed')));
        reader.readAsDataURL(file);
      });
      const result = await client.call('template/prepare', { input: { fileName: file.name, base64 } });
      if (!alive.current || current !== generation.current) { if (result.draftId) await client.call('template/cancel', { draftId: result.draftId }); return; }
      if (result.duplicate) { await refresh(); if (alive.current && current === generation.current) { dismissModal(); setNotice(t('personal.duplicate')); } return; }
      setDraft(result); setName(result.template.name); setPage(0);
    });
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
      .personal-dialog :is(button,input,textarea):focus-visible {outline:2px solid var(--dsw-alias-state-business-primary,#3888ff);outline-offset:2px}
      .personal-dialog button:active:not(:disabled) {transform:scale(.97)}
      .personal-dialog :disabled {cursor:default}
      .personal-dialog .personal-modal-error {margin:0;padding:10px 12px;border-radius:10px;background:#f0445212;color:#d12e3c;font-size:13px;white-space:pre-wrap;overflow-wrap:anywhere}
      .personal-dialog .personal-delete-copy {margin:0 0 26px;color:var(--dsw-alias-label-secondary,#666);font-size:14px;line-height:1.65;overflow-wrap:anywhere}
      .personal-dialog.personal-upload {width:min(880px,calc(100vw - 40px))}
      .personal-dialog.personal-upload[open] {display:flex;flex-direction:column}
      .personal-upload header,.personal-upload footer {flex:none}
      .personal-dialog .personal-upload-form {display:flex;flex-direction:column;gap:18px;min-height:0}
      .personal-upload-body {display:grid;gap:16px;overflow-y:auto;overscroll-behavior:contain;min-height:0;padding:4px}
      .personal-upload-preview {display:block;width:100%;aspect-ratio:16/9;max-height:45dvh;object-fit:contain;border:1px solid var(--dsw-alias-border-l2-darkmode-thin,#e7e7e9);border-radius:10px;background:white;box-sizing:border-box}
      .personal-pagination {display:flex;align-items:center;justify-content:center;gap:16px;font-size:13px;font-variant-numeric:tabular-nums}
      .personal-pagination button {display:grid;place-items:center;width:32px;height:32px;border:1px solid var(--dsw-alias-border-l2-darkmode-thin,#ddd);border-radius:8px;background:transparent;color:inherit;cursor:pointer;font-size:18px}
      .personal-pagination button:disabled {color:var(--dsw-alias-label-tertiary,#aaa)}
      .personal-upload-wait {min-height:260px;display:grid;place-items:center;color:var(--dsw-alias-label-secondary,#666);font-size:14px}
      @media (hover:hover) and (pointer:fine) {.personal-dialog button:hover:not(:disabled) {filter:brightness(.94)}.personal-dialog .personal-close:hover {background:var(--dsw-alias-interactive-bg-hover,#f1f2f4)}}
      @media (hover:none) {[data-personal-card] .personal-actions {opacity:1;pointer-events:auto}}
      @media (prefers-reduced-motion:reduce) {[data-personal-template-library] .personal-create,[data-personal-card] .personal-actions,.personal-dialog footer button {transition:none}.personal-dialog button:active:not(:disabled) {transform:none}}
    `),
    h('input', { ref: input, type: 'file', accept: '.pptx', hidden: true, disabled: busy || draft !== null, onChange: e => { const file = e.target.files?.[0]; e.target.value = ''; upload(file); } }),
    error && !modalOpen && h('div', { role: 'alert', style: { color: '#b42318', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', maxHeight: 280, overflowY: 'auto' } }, error),
    notice && h('div', { role: 'status' }, notice),
    h('div', { className: OfficePptHero_module_css_default.templateGrid, 'data-personal-template-grid': '' },
      h('button', { type: 'button', className: 'personal-create', disabled: busy, title: t('personal.local'), onClick: () => input.current?.click() }, icon('create'), h('span', null, t('personal.create'))),
      ...templates.map(template => h('div', { key: template.id, 'data-personal-card': template.id },
      h('div', { className: 'personal-frame' },
        h(TemplateCard, { template, selected: template.id === state.selectedId, choose }),
        template.id === state.selectedId && h('div', { className: 'personal-selected', 'aria-hidden': true }, h('span', { className: 'personal-check' }, icon('check')), t('personal.selected')),
        h('div', { className: 'personal-actions' },
          h('button', { type: 'button', disabled: busy, title: t('personal.edit'), 'aria-label': t('personal.edit'), onClick: () => openEditor(template) }, icon('rename')),
          h('button', { type: 'button', disabled: busy, title: t('personal.delete'), 'aria-label': t('personal.delete'), onClick: () => { setError(''); setDeleting(template.id); setEditing(null); } }, icon('delete'))))))),
    h('dialog', { ref: dialog, className: `personal-dialog${importing ? ' personal-upload' : ''}`, 'aria-labelledby': `${dialogId}-title`, 'aria-modal': true,
      onCancel: event => { event.preventDefault(); closeModal(); },
      onKeyDown: event => {
        if (event.key !== 'Tab') return;
        const fields = [...event.currentTarget.querySelectorAll('button:not(:disabled),input:not(:disabled),textarea:not(:disabled)')];
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
            if (current()) await refresh();
          }, true);
        } },
          h('div', { className: 'personal-upload-body' },
            draft ? h(react.Fragment, null,
              h('label', null, t('personal.name'), h('input', { ref: editName, value: name, maxLength: 80, required: true, disabled: busy || !!savedDraft.current, autoComplete: 'off', onChange: event => setName(event.target.value) })),
              h('img', { className: 'personal-upload-preview', src: draft.previews[page], alt: `${t('personal.preview')} ${page + 1}` }),
              h('div', { className: 'personal-pagination' },
                h('button', { type: 'button', 'aria-label': t('personal.previous'), disabled: page === 0, onClick: () => setPage(Math.max(0, page - 1)) }, '‹'),
                h('span', { role: 'status' }, `${page + 1} / ${draft.previews.length}`),
                h('button', { type: 'button', 'aria-label': t('personal.next'), disabled: page === draft.previews.length - 1, onClick: () => setPage(Math.min(draft.previews.length - 1, page + 1)) }, '›')))
            : busy && h('div', { className: 'personal-upload-wait', role: 'status' }, t('personal.processing')),
            error && h('div', { role: 'alert', className: 'personal-modal-error' }, error)),
          h('footer', null,
            h('button', { type: 'button', disabled: busy, onClick: closeModal }, t('personal.cancel')),
            draft ? h('button', { type: 'submit', className: 'personal-submit', disabled: busy || !name.trim() }, t(busy ? 'personal.processing' : 'personal.save'))
            : !busy && h('button', { type: 'button', onClick: () => input.current?.click() }, t('personal.chooseFile'))))
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
