import test from 'node:test'
import assert from 'node:assert/strict'
import { browserAddress, browserPage, createBrowserTabs } from '../src/tabs.mjs'
const drain = () => new Promise((r) => setImmediate(r))
function fixture(
  initial = [
    { id: 'a', title: 'A' },
    { id: 'b', title: 'B' },
  ],
  live = [],
) {
  const sid = 'session-one',
    records = [...live],
    listeners = new Set(),
    opens = [],
    errors = []
  let value = { loaded: true, tabs: initial, active: initial.at(-1)?.id },
    closed = [],
    bridge,
    closeResolve
  const model = {
    get: () => value,
    set: (p) => {
      value = { ...value, ...bridge.filter(p) }
      for (const f of listeners) f()
    },
    subscribe: (f) => {
      listeners.add(f)
      return () => listeners.delete(f)
    },
  }
  const native = {
    tabsIn: () => records,
    openResourceIn: (session, address, options) => {
      opens.push({ session, address, options })
      assert.equal(session, sid)
      if (options.replaceTab) {
        const i = records.findIndex((t) => t.id === options.replaceTab)
        if (i >= 0) records.splice(i, 1)
      }
      if (!records.some((t) => t.contentId === address))
        records.push({
          id: 'native-' + address,
          kind: 'page-review',
          contentId: address,
        })
    },
  }
  bridge = createBrowserTabs({
    sessionId: sid,
    kind: 'page-review',
    native,
    model,
    create: async () => ({
      tabs: [...value.tabs, { id: 'new', title: '新标签页' }],
      active: 'new',
    }),
    close: (id) => {
      closed.push(id)
      return new Promise((r) => (closeResolve = r))
    },
    hasDraft: (id) => id === 'draft',
    onError: (e) => errors.push(e.message),
  })
  return {
    bridge,
    model,
    records,
    opens,
    errors,
    closed,
    resolveClose: (state) => closeResolve(state),
    info: { panel: { id: 'pane-one' }, tab: { id: 'old-wrapper' } },
  }
}
test('网页地址按对话隔离，拒绝其他类型及对话的资源', () => {
  const address = browserAddress('session/一', 'page?1')
  assert.equal(browserPage(address, 'session/一'), 'page?1')
  assert.equal(browserPage(address, 'different'), null)
  assert.equal(browserPage('sidebar://page-review', 'session/一'), null)
  assert.equal(browserPage('https://page-review/a/b', 'a'), null)
})
test('原有网页迁到系统标签，替换浏览器外层，保留原活动页', async () => {
  const f = fixture()
  await f.bridge.launch(f.info)
  await drain()
  assert.equal(f.model.get().tabs.length, 2)
  assert.equal(f.records.length, 2)
  assert.equal(f.opens[0].options.replaceTab, 'old-wrapper')
  assert.equal(browserPage(f.opens.at(-1).address, 'session-one'), 'b')
  f.bridge.dispose()
})
test('弹出窗口和新网页只添加一个原生标签，元数据更新不重复开页', async () => {
  const f = fixture()
  await f.bridge.launch(f.info)
  await drain()
  f.opens.length = 0
  f.model.set({
    tabs: [...f.model.get().tabs, { id: 'popup' }],
    active: 'popup',
  })
  await drain()
  assert.equal(f.records.length, 3)
  assert.equal(browserPage(f.opens.at(-1).address, 'session-one'), 'popup')
  f.opens.length = 0
  f.model.set({
    tabs: f.model.get().tabs.map((t) => ({ ...t, title: '更新标题' })),
  })
  await drain()
  assert.equal(f.opens.length, 0)
  f.bridge.dispose()
})
test('新入口创建新标签，刷新已恢复标签不会额外创建', async () => {
  const f = fixture(
    [{ id: 'a' }],
    [
      {
        id: 'native-a',
        kind: 'page-review',
        contentId: browserAddress('session-one', 'a'),
      },
    ],
  )
  f.bridge.adopt(f.info)
  await drain()
  assert.equal(f.model.get().tabs.length, 1)
  await f.bridge.launch(f.info)
  await drain()
  assert.equal(f.model.get().tabs.length, 2)
  assert.equal(f.model.get().active, 'new')
  f.bridge.dispose()
})
test('关闭顶部标签也关闭网页，迟到截图元数据不会将标签重新打开', async () => {
  const f = fixture()
  await f.bridge.launch(f.info)
  await drain()
  const tab = f.records.find(
    (t) => browserPage(t.contentId, 'session-one') === 'b',
  )
  f.bridge.beforeClose(tab)
  f.records.splice(f.records.indexOf(tab), 1)
  f.model.set({ tabs: [{ id: 'a' }, { id: 'b' }] })
  await drain()
  assert.deepEqual(
    f.model.get().tabs.map((t) => t.id),
    ['a'],
  )
  assert.deepEqual(f.closed, ['b'])
  assert.equal(f.records.length, 1)
  f.resolveClose({ tabs: [{ id: 'a' }], active: 'a' })
  await drain()
  f.model.set({ tabs: [{ id: 'a' }, { id: 'b' }] })
  await drain()
  assert.equal(f.records.length, 1)
  assert.equal(f.model.get().tabs.length, 1)
  f.bridge.dispose()
})
test('未保存批注阻止关闭；重复的原生视图不提前关闭共享网页', async () => {
  const f = fixture([{ id: 'draft' }])
  await f.bridge.launch(f.info)
  await drain()
  const tab = f.records[0]
  assert.throws(() => f.bridge.beforeClose(tab), /保存或取消/)
  assert.equal(f.closed.length, 0)
  assert.equal(f.errors.length, 1)
  f.records.push({ ...tab, id: 'duplicate' })
  f.bridge.beforeClose(tab)
  assert.equal(f.closed.length, 0)
  f.bridge.dispose()
})
test('网页关闭失败恢复标签，保留对应页面与错误提示', async () => {
  const f = fixture()
  await f.bridge.launch(f.info)
  await drain()
  const tab = f.records[0]
  // Use a rejecting close service to cover recovery independently.
  f.bridge.dispose()
  let state = { loaded: true, tabs: [{ id: 'a' }], active: 'a' },
    listeners = new Set(),
    bridge
  const model = {
    get: () => state,
    set: (p) => {
      state = { ...state, ...bridge.filter(p) }
      for (const fn of listeners) fn()
    },
    subscribe: (fn) => {
      listeners.add(fn)
      return () => listeners.delete(fn)
    },
  }
  const live = [
      { id: 'n', kind: 'page-review', contentId: browserAddress('s', 'a') },
    ],
    errors = []
  bridge = createBrowserTabs({
    sessionId: 's',
    kind: 'page-review',
    native: { tabsIn: () => live, openResourceIn: () => {} },
    model,
    close: async () => {
      throw Error('离线')
    },
    hasDraft: () => false,
    onError: (e) => errors.push(e.message),
  })
  bridge.adopt({ panel: { id: 'p' } })
  bridge.beforeClose(live[0])
  await drain()
  assert.equal(state.tabs[0].id, 'a')
  assert.deepEqual(errors, ['离线'])
  bridge.dispose()
})
