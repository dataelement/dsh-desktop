import test from 'node:test'
import assert from 'node:assert/strict'
import { JSDOM } from 'jsdom'
import { observeComposer } from '../src/composer-compat.mjs'
import { configureLocale, t, zh, en, NS } from '../src/locale.mjs'

test('composer adapter follows stable markers, keeps Stop available and releases observers', async () => {
  const dom = new JSDOM(
    '<div data-composer-card><div contenteditable="true"></div><button data-dsh-composer-primary="send" aria-label="Send"></button><div id="seat"></div></div>',
  )
  const { document } = dom.window,
    states = [],
    button = document.querySelector('button'),
    editor = document.querySelector('[contenteditable]')
  const dispose = observeComposer(document.querySelector('#seat'), (value) =>
    states.push(value),
  )
  assert.deepEqual(states.at(-1), { inline: false, disabled: false })
  button.setAttribute('data-dsh-composer-primary', 'stop')
  await new Promise((r) => setImmediate(r))
  assert.deepEqual(states.at(-1), { inline: true, disabled: false })
  editor.setAttribute('contenteditable', 'false')
  await new Promise((r) => setImmediate(r))
  assert.equal(states.at(-1).disabled, true)
  dispose()
  const count = states.length
  editor.setAttribute('contenteditable', 'true')
  await new Promise((r) => setImmediate(r))
  assert.equal(states.length, count)
  dom.window.close()
})

test('without the explicit host marker annotation submission stays unavailable', () => {
  const dom = new JSDOM(
    '<div data-composer-card><div contenteditable="true"></div><button aria-label="发送消息"></button><div id="seat"></div></div>',
  )
  let state
  const off = observeComposer(
    dom.window.document.querySelector('#seat'),
    (value) => (state = value),
  )
  assert.equal(state.disabled, true)
  off()
  dom.window.close()
})

test('both locale catalogs have matching keys; active locale changes are read at call time', () => {
  assert.deepEqual(Object.keys(zh).sort(), Object.keys(en).sort())
  let active = 'en',
    registered = false
  configureLocale({
    effect: (fn) => fn(),
    locale: {
      register: (namespace, dicts) => {
        assert.equal(namespace, NS)
        assert.ok(dicts.zh && dicts.en)
        registered = true
        return () => {}
      },
      bind: () => (key) => (active === 'en' ? en : zh)[key],
    },
  })
  assert.ok(registered)
  assert.equal(t('browser'), 'Browser')
  active = 'zh'
  assert.equal(t('browser'), '浏览器')
})
