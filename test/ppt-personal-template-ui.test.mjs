// @vitest-environment jsdom
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { afterEach, expect, it, vi } from 'vitest';
import React, { act } from 'react';
import * as jsxRuntime from 'react/jsx-runtime';
import { createRoot } from 'react-dom/client';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
// jsdom exercises component state; native modal/top-layer behavior has a separate acceptance gate.
HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); };
const source = await readFile(path.resolve('packages/ppt-runtime/client/personal-template-manager.js'), 'utf8');
it.each(['core', 'adapter'])('provides localized dialog copy in both languages for the %s client', async plugin => {
  const clientSource = await readFile(path.resolve(`packages/ppt-runtime/${plugin}/lib/client.js`), 'utf8');
  const usedKeys = new Set([...source.matchAll(/\bt\(['"](personal\.[^'"]+)['"]/g)].map(match => match[1]));
  for (const language of ['zh', 'en']) {
    const match = clientSource.match(new RegExp(`const ${language} = (\\{[\\s\\S]*?\\n\\s*\\});`));
    expect(match, `${plugin}/${language} dictionary`).not.toBeNull();
    const dictionary = new Function(`return (${match[1]});`)();
    for (const key of usedKeys) expect(dictionary[key], `${plugin}/${language}/${key}`).toBeTypeOf('string');
  }
});
const TemplateCard = ({ template, selected, choose }) => React.createElement('button', { 'aria-pressed': selected, onClick: () => choose(template) }, template.name);
const Manager = new Function('react', 'TemplateCard', 'OfficePptHero_module_css_default', `${source}\nreturn PersonalTemplateManager;`)(React, TemplateCard, { templateGrid: 'template-grid' });
const previewClients = [{ name: 'maintained', Component: Manager }];
for (const name of ['dsh-ppt', 'dsh-ppt-composer']) {
  const generated = await readFile(path.resolve(process.env.DSH_PPT_UI_PACKAGES ?? '.build/ppt-runtime/packages', name, 'lib/client.js'), 'utf8');
  let Component;
  const loader = { load({ factory }) { Component = factory(module => {
    if (module === 'react') return React;
    if (module === 'react/jsx-runtime') return jsxRuntime;
    if (module === '@deepseek-ai/dsh-client-ui-primitives') return {};
    throw new Error(`Unexpected client module: ${module}`);
  }); } };
  const instrumented = generated.replace('window.__ModuleLoader__.load(', 'moduleLoader.load(')
    .replace(/\breturn\s+module\.exports\b\s*;?/u, 'return PersonalTemplateManager;');
  new Function('moduleLoader', instrumented)(loader);
  expect(Component).toBeTypeOf('function');
  previewClients.push({ name, Component });
}
let root, container;
afterEach(async () => {
  if (root) await act(async () => root.unmount());
  container?.remove(); root = null;
  vi.useRealTimers(); vi.restoreAllMocks();
});

async function loadPreview() {
  const image = container.querySelector('.personal-zoom-stage img');
  Object.defineProperties(image, { naturalWidth: { configurable: true, value: 1920 }, naturalHeight: { configurable: true, value: 1080 } });
  await act(async () => image.dispatchEvent(new Event('load')));
}

async function fixture(prepareError, waitForPrepare, resourcePlaceholders = [], Component = Manager, templateSamples) {
  container = document.createElement('div'); document.body.append(container); root = createRoot(container);
  let saved = [], draft, selectedId;
  const calls = [];
  const waits = new Map(), failures = new Map();
  const image = 'data:image/png;base64,iVBORw0KGgo=';
  const client = { bound: true, async call(endpoint, payload) {
    calls.push({ endpoint, payload });
    if (waits.has(endpoint)) await waits.get(endpoint);
    if (failures.has(endpoint)) { const error = failures.get(endpoint); failures.delete(endpoint); throw new Error(error); }
    if (endpoint === 'state') return { templates: saved, selectedTemplateId: selectedId, presentationMode: 'ppt' };
    if (endpoint === 'template/prepare') {
      if (waitForPrepare) await waitForPrepare;
      if (prepareError) throw new Error(prepareError);
      draft = { draftId: 'draft-1', template: { id: 'personal-1', name: 'Company', origin: 'personal', slideCount: templateSamples ? 4 : 2,templateSamples, previewImages: [image], palette: { background: 'FFFFFF', surface: 'F4F4F4', text: '242424', muted: '666666', accent: '3888FF', secondary: 'E7E7E9' }, resourcePlaceholders, diagnostics: [{ slide: 2, feature: 'shape-style', message: '样式已标准化' }] }, preview: image };
      return draft;
    }
    if (endpoint === 'template/import-progress') return {total:2,completed:1,pages:payload.after ? [] : [{page:1,preview:image}],status:'processing'};
    if (endpoint === 'template/preview-page') return { page: payload.page, preview: image };
    if (endpoint === 'template/save') { const template = { ...draft.template, name: payload.name }; saved = [template]; return template; }
    if (endpoint === 'template/select') { selectedId = payload.templateId; return true; }
    if (endpoint === 'template/update') { saved = saved.map(item => ({ ...item, name: payload.name, description: payload.description })); return saved[0]; }
    if (endpoint === 'template/delete') { saved = []; return true; }
    if (endpoint === 'template/cancel') return true;
    throw new Error(endpoint);
  } };
  const choose = vi.fn();
  let state = { templates: [], selectedId: null, activeMode: 'ppt' };
  const mode = { setTemplateState(_id, next) { state = { ...state, templates: next.templates, selectedId: next.selectedTemplateId ?? null }; render(); }, setTemplates(_id, templates) { state = { ...state, templates }; render(); }, setNotice() {}, select(_id, template) { state = { ...state, selectedId: template.id }; render(); }, deselect() { state = { ...state, selectedId: null }; render(); } };
  let sessionId = 'session-a';
  function render() { root.render(React.createElement(Component, { client, mode, sessionId, state, choose, t: key => key })); }
  await act(async () => render());
  async function click(label) {
    const scope = container.querySelector('dialog[open]') ?? container;
    const button = [...scope.querySelectorAll('button')].find(item => item.textContent === label || item.getAttribute('aria-label') === label);
    expect(button, label).toBeDefined();
    await act(async () => button.click());
  }
  async function upload(file) {
    const input = container.querySelector('input[type=file]');
    Object.defineProperty(input, 'files', { configurable: true, value: [file] });
    await act(async () => {
      input.dispatchEvent(new Event('change', { bubbles: true }));
      // FileReader dispatches on a later DOM task.
      await new Promise(resolve => setTimeout(resolve, 20));
    });
  }
  return { calls, click, upload, choose, hold(endpoint) { let release; waits.set(endpoint, new Promise(resolve => release = resolve)); return async () => { await act(async () => { waits.delete(endpoint); release(); }); }; }, failNext(endpoint, message) { failures.set(endpoint, message); }, async switchSession() { sessionId = 'session-b'; await act(async () => render()); } };
}

it('hides create, rename, and delete before a session exists', async () => {
  container = document.createElement('div'); document.body.append(container); root = createRoot(container);
  const template = { id: 'personal-1', name: 'Company', origin: 'personal' };
  await act(async () => {
    root.render(React.createElement(Manager, {
      client: { async call() { throw new Error('unexpected'); } },
      mode: {},
      sessionId: undefined,
      state: { templates: [template], selectedId: null, activeMode: 'ppt' },
      choose: () => {},
      t: key => key,
      mutable: false
    }));
  });
  expect(container.querySelector('.personal-create')).toBeNull();
  expect(container.querySelector('.personal-actions')).toBeNull();
  expect(container.querySelector('[data-personal-card="personal-1"]')).not.toBeNull();
});

it.each(previewClients)('$name puts newest personal templates after create and before built-in cards', async ({Component}) => {
  container = document.createElement('div'); document.body.append(container); root = createRoot(container);
  const templates = [
    {id:'older',name:'Older',origin:'personal',createdAt:'2026-10-08'},
    {id:'builtin',name:'Built-in',origin:'built-in'},
    {id:'newer',name:'Newer',origin:'personal',createdAt:'2026-10-10'}
  ].map(template=>({...template,previewImages:['data:image/png;base64,iVBORw0KGgo='],palette:{background:'FFFFFF',surface:'F4F4F4',text:'222222',muted:'666666',accent:'333333',secondary:'AAAAAA'}}));
  await act(async () => root.render(React.createElement(Component, {
    client:{bound:false},mode:{},state:{templates,selectedId:null},choose:()=>{},t:key=>key,
    builtInCards:[React.createElement('div',{key:'builtin','data-built-in-card':'builtin'},'Built-in')]
  })));
  const grid=container.querySelector('[data-personal-template-grid]');
  expect([...grid.children].map(item=>item.getAttribute('data-personal-card')??item.getAttribute('data-built-in-card')??item.textContent))
    .toEqual(['personal.create','newer','older','builtin']);
});

it('keeps a staged built-in template when opening personal templates before a session exists', async () => {
  container = document.createElement('div'); document.body.append(container); root = createRoot(container);
  const builtIn = { id: 'built-in-a', name: 'Blueprint', origin: 'built-in' };
  const personal = { id: 'personal-1', name: 'Company', origin: 'personal' };
  const client = {
    bound: false,
    async call(endpoint) {
      if (endpoint !== 'state') throw new Error(endpoint);
      return { templates: [builtIn, personal], selectedTemplateId: null, presentationMode: null };
    }
  };
  let state = { templates: [builtIn], selectedId: 'built-in-a', activeMode: 'ppt' };
  const mode = {
    setTemplateState() { throw new Error('unbound refresh must not apply remote selection'); },
    setTemplates(_id, templates) {
      state = {
        ...state,
        templates,
        selectedId: templates.some(template => template.id === state.selectedId) ? state.selectedId : null
      };
    }
  };
  await act(async () => {
    root.render(React.createElement(Manager, {
      client, mode, sessionId: undefined, state, choose: () => {}, t: key => key, mutable: false
    }));
  });
  expect(state.selectedId).toBe('built-in-a');
  expect(state.activeMode).toBe('ppt');
});

it('keeps a staged template when an unbound catalog returns no selection', async () => {
  container = document.createElement('div'); document.body.append(container); root = createRoot(container);
  const builtIn = { id: 'built-in-a', name: 'Blueprint', origin: 'built-in' };
  const personal = { id: 'personal-1', name: 'Company', origin: 'personal' };
  let release;
  const pending = new Promise(resolve => { release = resolve; });
  const client = {
    bound: false,
    async call(endpoint) {
      if (endpoint !== 'state') throw new Error(endpoint);
      await pending;
      return { templates: [builtIn, personal], selectedTemplateId: null, presentationMode: null };
    }
  };
  let state = { templates: [builtIn], selectedId: 'built-in-a', activeMode: 'ppt' };
  const writes = [];
  const mode = {
    setTemplateState() { writes.push('setTemplateState'); },
    setTemplates(_id, templates) {
      writes.push('setTemplates');
      state = {
        ...state,
        templates,
        selectedId: templates.some(template => template.id === state.selectedId) ? state.selectedId : null
      };
    }
  };
  const choose = template => { state = { ...state, selectedId: template.id }; };
  await act(async () => {
    root.render(React.createElement(Manager, {
      client, mode, sessionId: undefined, state, choose, t: key => key, mutable: false
    }));
  });
  choose(personal);
  await act(async () => { release(); });
  expect(writes).toEqual(['setTemplates']);
  expect(state.selectedId).toBe('personal-1');
  expect(state.activeMode).toBe('ppt');
});

it('previews uploads in the modal while retaining the grid, then supports editing and confirmed delete', async () => {
  const f = await fixture();
  await f.upload(new File(['source'], 'Company.pptx'));
  expect(f.calls.some(call => call.endpoint === 'template/save')).toBe(false);
  expect(container.querySelector('dialog[open] img')).not.toBeNull();
  expect(container.querySelector('[data-personal-template-grid]')).not.toBeNull();
  expect(container.querySelector('img').getAttribute('src')).toContain('data:image/png');
  expect(container.querySelector('dialog[open] details')).toBeNull();
  expect(container.querySelector('dialog[open] p')).toBeNull();
  expect(container.textContent).toContain('1 / 2');
  await f.click('personal.next'); expect(container.textContent).toContain('2 / 2');
  await f.click('personal.save');
  expect(f.calls.find(call => call.endpoint === 'template/select').payload.templateId).toBe('personal-1');
  expect(container.querySelector('.personal-save-feedback').textContent).toBe('personal.saved');
  expect(container.querySelector('.personal-save-feedback svg path')).not.toBeNull();
  const grid = container.querySelector('[data-personal-template-grid]');
  expect(grid.children[0].textContent).toBe('personal.create');
  expect(grid.children[1].getAttribute('data-personal-card')).toBe('personal-1');
  expect(grid.children[1].querySelector('[aria-pressed=true]')).not.toBeNull();
  expect(grid.children[1].textContent).toContain('personal.selected');
  expect(container.querySelector('section')).toBeNull();
  await f.click('personal.edit');
  expect(container.querySelector('dialog[open] input').value).toBe('Company');
  expect(container.querySelector('dialog[open] textarea')).not.toBeNull();
  expect(container.querySelector('dialog input[type=file]')).toBeNull();
  await f.click('personal.update');
  expect(f.calls.some(call => call.endpoint === 'template/update')).toBe(true);
  expect(container.querySelector('dialog[open]')).toBeNull();
  expect(f.choose).not.toHaveBeenCalled();
  await f.click('personal.delete');
  expect(f.calls.some(call => call.endpoint === 'template/delete')).toBe(false);
  await f.click('personal.confirmDelete');
  expect(f.calls.some(call => call.endpoint === 'template/delete')).toBe(true);
  expect(container.querySelector('[data-personal-template-grid]').children).toHaveLength(1);
  expect(container.querySelector('[data-personal-template-grid]').textContent).toBe('personal.create');
  expect(container.querySelector('p')).toBeNull();
});

it('closes the modal without saving and returns from deletion confirmation to the editor', async () => {
  const f = await fixture();
  await f.upload(new File(['source'], 'Company.pptx')); await f.click('personal.save');
  await f.click('personal.edit');
  await f.click('personal.delete');
  expect(container.querySelector('dialog[open]').textContent).toContain('personal.deleteTitle');
  await f.click('personal.cancel');
  expect(container.querySelector('dialog[open] textarea')).not.toBeNull();
  await act(async () => container.querySelector('dialog').dispatchEvent(new Event('cancel', { cancelable: true })));
  expect(container.querySelector('dialog[open]')).toBeNull();
  expect(f.calls.some(call => call.endpoint === 'template/update' || call.endpoint === 'template/delete')).toBe(false);
  await f.click('personal.edit'); await f.switchSession();
  expect(container.querySelector('dialog[open]')).toBeNull();
});

it('keeps multiline conversion details visible and allows the upload to be retried', async () => {
  const details = '模板导入遇到 3 项转换问题：\n第 1 页 · 对象 Title · 文本超出文本框\n第 2 页 · 对象 Logo · 元素超出页面\n第 3 页 · 对象 Footer · 文本超出文本框';
  const f = await fixture(details);
  await f.upload(new File(['source'], 'Company.pptx'));
  const alert = container.querySelector('[role=alert]');
  expect(alert.textContent).toBe(details);
  expect(alert.closest('dialog[open]')).not.toBeNull();
  expect(container.querySelector('input[type=file]').disabled).toBe(false);
  expect(f.calls.some(call => call.endpoint === 'template/save')).toBe(false);
});

it('rejects unsupported files and cancels a prepared preview without registering it', async () => {
  const f = await fixture();
  await f.upload(new File(['wrong'], 'Company.ppt'));
  expect(container.querySelector('[role=alert]').textContent).toBe('personal.fileType');
  expect(f.calls.some(call => call.endpoint === 'template/prepare')).toBe(false);
  await f.upload(new File(['source'], 'Company.pptx'));
  await f.click('personal.cancel');
  expect(f.calls.some(call => call.endpoint === 'template/cancel')).toBe(true);
  expect(f.calls.some(call => call.endpoint === 'template/save')).toBe(false);
  expect(container.querySelector('section')).toBeNull();
});

it('shows a quiet placeholder notice while keeping preview, pagination and saving available', async () => {
  const f = await fixture(undefined, undefined, [{ slide: 2, feature: 'picture' }]);
  await f.upload(new File(['source'], 'Company.pptx'));
  expect(container.querySelector('dialog[open] small[role=status]').textContent).toBe('personal.placeholderNotice');
  expect(container.querySelector('[role=alert]')).toBeNull();
  await f.click('personal.next');
  await f.click('personal.save');
  expect(f.calls.some(call => call.endpoint === 'template/save')).toBe(true);
  expect(f.calls.some(call => call.endpoint === 'template/select')).toBe(true);
});

it.each(previewClients)('shows the completed template directly and supports pagination and saving ($name)', async ({ Component }) => {
  const f = await fixture(undefined, undefined, [], Component);
  await f.upload(new File(['source'], 'Company.pptx'));
  await loadPreview();
  expect(container.querySelector('.personal-zoom-stage img')).not.toBeNull();
  expect(container.querySelector('.personal-preview-ready')).toBeNull();
  expect(container.querySelector('.personal-view-toggle')).toBeNull();
  expect(f.calls.some(call => call.endpoint === 'template/save')).toBe(false);
  await f.click('personal.next'); await loadPreview();
  expect(container.querySelector('dialog[open]').textContent).toContain('2 / 2');
  await f.click('personal.previous'); await loadPreview();
  expect(container.querySelector('dialog[open]').textContent).toContain('1 / 2');
  await f.click('personal.save');
  expect(container.querySelector('.personal-save-feedback').textContent).toBe('personal.saved');
  expect(container.querySelector('dialog[open]')).toBeNull();
});

it.each(previewClients)('recovers the template image after a failed preview ($name)', async ({ Component }) => {
  const f = await fixture(undefined, undefined, [], Component);
  await f.upload(new File(['source'], 'Company.pptx'));
  await act(async () => container.querySelector('.personal-zoom-stage img').dispatchEvent(new Event('error')));
  expect(container.querySelector('[role=alert]')).not.toBeNull();
  await f.click('templates.retry'); await loadPreview();
  expect(container.querySelector('.personal-zoom-stage img')).not.toBeNull();
  expect(container.querySelector('[role=alert]')).toBeNull();
});

it.each(previewClients)('fits a cached image using its actual aspect ratio before the load event ($name)', async ({ Component }) => {
  vi.spyOn(HTMLImageElement.prototype, 'naturalWidth', 'get').mockReturnValue(1600);
  vi.spyOn(HTMLImageElement.prototype, 'naturalHeight', 'get').mockReturnValue(1200);
  vi.spyOn(HTMLImageElement.prototype, 'complete', 'get').mockReturnValue(true);
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(800);
  vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(600);
  const f = await fixture(undefined, undefined, [], Component);
  await f.upload(new File(['source'], 'Company.pptx'));
  const image = container.querySelector('.personal-zoom-stage img');
  expect(image.style.width).toBe('800px');
  expect(image.style.height).toBe('600px');
  await f.switchSession();
  expect(container.querySelector('dialog[open]')).toBeNull();
});

it('reads a file above 16 MB and sends its full payload to the Host', async () => {
  const f = await fixture();
  const size = 17 * 1024 * 1024;
  await f.upload(new File([new Uint8Array(size)], 'Large.pptx'));
  await act(async () => {
    await vi.waitFor(() => expect(f.calls.some(call => call.endpoint === 'template/prepare')).toBe(true));
  });
  const sent = f.calls.find(call => call.endpoint === 'template/prepare').payload.input;
  expect(sent.fileName).toBe('Large.pptx');
  expect(Buffer.from(sent.base64, 'base64')).toHaveLength(size);
  expect(container.querySelector('dialog[open] img')).not.toBeNull();
  expect(container.querySelector('[role=alert]')).toBeNull();
});

it('rejects a file larger than 64 MB before reading it', async () => {
  const f = await fixture();
  const file = new File(['x'], 'Huge.pptx');
  Object.defineProperty(file, 'size', { value: 65 * 1024 * 1024 });
  await f.upload(file);
  expect(container.querySelector('[role=alert]').textContent).toBe('personal.fileTooLarge');
  expect(f.calls.some(call => call.endpoint === 'template/prepare')).toBe(false);
});

it('cancels an upload completed after switching sessions and keeps the new session ready', async () => {
  let complete;
  const pending = new Promise(resolve => complete = resolve);
  const f = await fixture(undefined, pending);
  await f.upload(new File(['source'], 'Company.pptx'));
  expect(f.calls.some(call => call.endpoint === 'template/prepare')).toBe(true);
  await f.switchSession();
  await act(async () => { complete(); await pending; });
  expect(f.calls.some(call => call.endpoint === 'template/cancel' && call.payload.draftId === 'draft-1')).toBe(true);
  expect(container.querySelector('section')).toBeNull();
  expect(container.querySelector('input[type=file]').disabled).toBe(false);
  expect(f.choose).not.toHaveBeenCalled();
});


it('keeps the editor open until refreshed state is ready and closes without a list loading flash', async () => {
  const f = await fixture();
  await f.upload(new File(['source'], 'Company.pptx')); await f.click('personal.save');
  const grid = container.querySelector('[data-personal-template-grid]');
  await f.click('personal.edit');
  const resume = f.hold('state');
  await f.click('personal.update');
  expect(container.querySelector('dialog[open] form').getAttribute('aria-busy')).toBe('true');
  expect(container.querySelector('[data-personal-template-library] > [role=status]')).toBeNull();
  expect(container.querySelector('[data-personal-template-grid]')).toBe(grid);
  await resume();
  expect(container.querySelector('dialog[open]')).toBeNull();
  expect(container.querySelector('[data-personal-template-library] > [role=status]')).toBeNull();
});

it('keeps upload preview open until selection finishes, and reuses the committed template after refresh failure', async () => {
  const f = await fixture();
  const grid = container.querySelector('[data-personal-template-grid]');
  await f.upload(new File(['source'], 'Company.pptx'));
  const resume = f.hold('template/select');
  f.failNext('state', '状态读取失败');
  await f.click('personal.save');
  expect(container.querySelector('dialog[open] img')).not.toBeNull();
  expect(container.querySelector('[data-personal-template-grid]')).toBe(grid);
  expect(container.querySelector('[data-personal-template-library] > [role=status]')).toBeNull();
  await resume();
  expect(container.querySelector('dialog[open] [role=alert]').textContent).toBe('状态读取失败');
  await f.click('personal.save');
  expect(f.calls.filter(call => call.endpoint === 'template/save')).toHaveLength(1);
  expect(container.querySelector('dialog[open]')).toBeNull();
  expect(grid.children[1].querySelector('[aria-pressed=true]')).not.toBeNull();
});

it('discards an uploaded draft when the preview is dismissed with Escape', async () => {
  const f = await fixture();
  await f.upload(new File(['source'], 'Company.pptx'));
  await act(async () => container.querySelector('dialog').dispatchEvent(new Event('cancel', { cancelable: true })));
  expect(f.calls.filter(call => call.endpoint === 'template/cancel')).toHaveLength(1);
  expect(container.querySelector('dialog[open]')).toBeNull();
  expect(f.calls.some(call => call.endpoint === 'template/save')).toBe(false);
});

it('shows page request failures and retries without losing the uploaded draft', async () => {
  const f = await fixture();
  await f.upload(new File(['source'], 'Company.pptx'));
  f.failNext('template/preview-page', '预览页读取失败');
  await f.click('personal.next');
  expect(container.querySelector('dialog[open] [role=alert]').textContent).toContain('预览页读取失败');
  expect(container.textContent).toContain('2 / 2');
  await f.click('templates.retry');
  expect(container.querySelector('dialog[open] [role=alert]')).toBeNull();
  expect(container.querySelector('dialog[open] img')).not.toBeNull();
  expect(container.querySelector('[aria-label="personal.zoomIn"]')).toBeNull();
  await act(async()=>container.querySelector('.ppt-fit-viewport').dispatchEvent(new WheelEvent('wheel',{ctrlKey:true,deltaY:-Math.log(1.5)/.01,cancelable:true})));
  expect(Number(container.querySelector('dialog[open] img').getAttribute('data-zoom'))).toBeCloseTo(1.5);
  await act(async()=>container.querySelector('.ppt-fit-viewport').dispatchEvent(new WheelEvent('wheel',{ctrlKey:true,deltaY:1000,cancelable:true})));
  expect(container.querySelector('dialog[open] img').getAttribute('data-zoom')).toBe('1');
  const viewport=container.querySelector('.ppt-fit-viewport');
  const touch=(type,distance)=>{const event=new Event(type,{cancelable:true});Object.defineProperty(event,'touches',{value:[{clientX:0,clientY:0},{clientX:distance,clientY:0}]});return event;};
  await act(async()=>{viewport.dispatchEvent(touch('touchstart',100));viewport.dispatchEvent(touch('touchmove',200));});
  expect(container.querySelector('img').getAttribute('data-zoom')).toBe('2');
  await act(async()=>viewport.dispatchEvent(new Event('touchend')));
  expect(f.calls.some(call => call.endpoint === 'template/save')).toBe(false);
});

it.each(previewClients)('$name pages through representative layouts and isolates late page responses',async({Component})=>{
  const f=await fixture(undefined,undefined,[],Component,{representativePages:[1,3]});
  await f.upload(new File(['source'],'Samples.pptx'));
  expect(container.querySelector('dialog[open]').textContent).toContain('personal.layouts 1 / 2');
  expect(container.querySelector('.personal-view-toggle')).toBeNull();
  const release=f.hold('template/preview-page');
  await f.click('personal.next');
  expect(f.calls.at(-1)).toMatchObject({endpoint:'template/preview-page',payload:{page:3}});
  expect(container.querySelector('dialog[open]').textContent).toContain('2 / 2');
  expect(container.querySelector('.personal-zoom-stage').getAttribute('aria-busy')).toBe('true');
  await f.click('personal.previous');
  await release();
  expect(container.querySelector('dialog[open]').textContent).toContain('personal.layouts 1 / 2');
  expect(container.querySelector('.personal-zoom-stage').getAttribute('aria-busy')).toBe('false');
  expect(container.querySelector('.personal-zoom-stage img')).not.toBeNull();
  // The late third page was discarded; navigation requests that page again.
  await f.click('personal.next');
  expect(f.calls.filter(call=>call.endpoint==='template/preview-page'&&call.payload.page===3)).toHaveLength(2);
  expect(container.querySelector('dialog[open]').textContent).toContain('personal.layouts 2 / 2');
  await f.click('personal.save');
  expect(f.calls.some(call=>call.endpoint==='template/select')).toBe(true);
});

it('caches representative pages in the detailed viewer and chooses the same reusable template',async()=>{
  const Viewer=new Function('react','TemplateCard','OfficePptHero_module_css_default',`${source}\nreturn TemplatePreviewCard;`)(React,TemplateCard,{});
  container=document.createElement('div');document.body.append(container);root=createRoot(container);
  const template={id:'sample-view',name:'Samples',origin:'personal',previewVersion:9,slideCount:4,templateSamples:{representativePages:[1,3]}};
  const client={bound:true,call:vi.fn(async(_endpoint,payload)=>({preview:`data:image/png;base64,sample-${payload.page}`}))};
  const choose=vi.fn();
  await act(async()=>root.render(React.createElement(Viewer,{template,client,choose,t:key=>key})));
  await act(async()=>container.querySelector('.ppt-preview-open').click());
  const modal=container.querySelector('dialog[open]');
  expect(modal.textContent).toContain('personal.layouts 1 / 2');
  expect(modal.querySelector('.personal-view-toggle')).toBeNull();
  await act(async()=>modal.querySelector('[aria-label="personal.next"]').click());
  expect(modal.querySelector('img').src).toContain('sample-3');
  expect(client.call).toHaveBeenLastCalledWith('template/preview-saved-page',{templateId:template.id,page:3});
  const requests=client.call.mock.calls.length;
  await act(async()=>modal.querySelector('[aria-label="personal.previous"]').click());
  expect(client.call.mock.calls).toHaveLength(requests);
  expect(modal.querySelector('img').src).toContain('sample-1');
  await act(async()=>modal.querySelector('.ppt-preview-use').click());
  expect(choose).toHaveBeenCalledWith(template);
  expect(container.querySelector('dialog[open]')).toBeNull();
});

it('opens a separate detailed viewer without selecting and supports zoom, arrows and Escape', async () => {
  const Viewer = new Function('react', 'TemplateCard', 'OfficePptHero_module_css_default', `${source}\nreturn TemplatePreviewCard;`)(React, TemplateCard, {});
  container = document.createElement('div'); document.body.append(container); root = createRoot(container);
  const choose = vi.fn();
  const template = { id: 'personal-view', name: 'Preview sample', origin: 'personal', slideCount: 2 };
  const client = { bound: true, call: vi.fn(async (_endpoint, payload) => ({ page: payload.page, preview: `data:image/png;base64,page${payload.page}` })) };
  await act(async () => root.render(React.createElement(Viewer, { template, selected: false, choose, client, t: key => key })));
  await act(async () => container.querySelector('.ppt-preview-open').click());
  expect(choose).not.toHaveBeenCalled();
  expect(client.call).toHaveBeenCalledWith('template/preview-saved-page', { templateId: template.id, page: 1 });
  const modal = container.querySelector('dialog[open]');
  expect(modal.querySelector('img').getAttribute('src')).toContain('page1');
  await act(async()=>modal.querySelector('.ppt-fit-viewport').dispatchEvent(new WheelEvent('wheel',{ctrlKey:true,deltaY:-Math.log(1.5)/.01,cancelable:true})));
  expect(Number(modal.querySelector('img').getAttribute('data-zoom'))).toBeCloseTo(1.5);
  await act(async () => modal.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })));
  expect(modal.textContent).toContain('2 / 2');
  expect(modal.querySelector('img').getAttribute('src')).toContain('page2');
  expect(modal.querySelector('img').getAttribute('data-zoom')).toBe('1');
  await act(async () => modal.dispatchEvent(new Event('cancel', { cancelable: true })));
  expect(container.querySelector('dialog[open]')).toBeNull();
});

it('shows completed thumbnails before preparation finishes', async () => {
  let finish;
  const pending=new Promise(resolve=>{finish=resolve;});
  const f=await fixture(undefined,pending);
  await f.upload(new File([new Uint8Array(10)],'Progress.pptx'));
  await act(async()=>{await new Promise(resolve=>setTimeout(resolve,450));});
  expect(container.querySelector('.personal-progress-pages img')).not.toBeNull();
  expect(container.querySelector('.personal-progress-count').textContent).toContain('1 / 2');
  await act(async()=>{finish();await new Promise(resolve=>setTimeout(resolve,30));});
  expect(container.querySelector('.personal-progress-pages')).toBeNull();
  expect(container.querySelector('dialog[open] img')).not.toBeNull();
});

it('uses the previewed template and preserves an existing selection', async () => {
  const Viewer=new Function('react','TemplateCard','OfficePptHero_module_css_default',`${source}\nreturn TemplatePreviewCard;`)(React,TemplateCard,{});
  container=document.createElement('div');document.body.append(container);root=createRoot(container);
  const template={id:'reuse',name:'Reuse',previewImages:['data:image/png;base64,page1']};
  const choose=vi.fn();
  for(const selected of [false,true]) {
    await act(async()=>root.render(React.createElement(Viewer,{template,selected,choose,client:{bound:false},t:key=>key})));
    await act(async()=>container.querySelector('.ppt-preview-open').click());
    expect(container.querySelector('.ppt-preview-use').textContent).toBe('personal.useSame');
    await act(async()=>container.querySelector('.ppt-preview-use').click());
    expect(container.querySelector('dialog[open]')).toBeNull();
    expect(choose).toHaveBeenCalledTimes(1);
    expect(choose).toHaveBeenCalledWith(template);
  }
});
