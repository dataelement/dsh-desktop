// @vitest-environment jsdom
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { afterEach, expect, it, vi } from 'vitest';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
// jsdom supplies the element; actual modal/top-layer behavior is verified in Chrome.
HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); };
const source = await readFile(path.resolve('packages/ppt-runtime/client/personal-template-manager.js'), 'utf8');
const TemplateCard = ({ template, selected, choose }) => React.createElement('button', { 'aria-pressed': selected, onClick: () => choose(template) }, template.name);
const Manager = new Function('react', 'TemplateCard', 'OfficePptHero_module_css_default', `${source}\nreturn PersonalTemplateManager;`)(React, TemplateCard, { templateGrid: 'template-grid' });
let root, container;
afterEach(async () => {
  if (root) await act(async () => root.unmount());
  container?.remove(); root = null;
});

async function fixture(prepareError, waitForPrepare) {
  container = document.createElement('div'); document.body.append(container); root = createRoot(container);
  let saved = [], draft, selectedId;
  const calls = [];
  const waits = new Map(), failures = new Map();
  const image = 'data:image/png;base64,iVBORw0KGgo=';
  const client = { async call(endpoint, payload) {
    calls.push({ endpoint, payload });
    if (waits.has(endpoint)) await waits.get(endpoint);
    if (failures.has(endpoint)) { const error = failures.get(endpoint); failures.delete(endpoint); throw new Error(error); }
    if (endpoint === 'state') return { templates: saved, selectedTemplateId: selectedId, presentationMode: 'ppt' };
    if (endpoint === 'template/prepare') {
      if (waitForPrepare) await waitForPrepare;
      if (prepareError) throw new Error(prepareError);
      draft = { draftId: 'draft-1', template: { id: 'personal-1', name: 'Company', origin: 'personal', diagnostics: [{ slide: 2, feature: 'shape-style', message: '样式已标准化' }] }, previews: [image, image] };
      return draft;
    }
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
  function render() { root.render(React.createElement(Manager, { client, mode, sessionId, state, choose, t: key => key })); }
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
