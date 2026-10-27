import test from 'node:test'
import assert from 'node:assert/strict'
import { JSDOM } from 'jsdom'
import { holdToBrowse, presentTemporaryBrowsing } from '../src/interaction.mjs'

function setup() {
  const dom = new JSDOM(
    '<div id="browser"><button id="mode">标注</button><div id="page" tabindex="0"></div><input id="address"><textarea id="note"></textarea><div id="edit" contenteditable="true"><span id="leaf">文字</span></div><textarea id="remote"></textarea></div><textarea id="chat"></textarea>',
  )
  const { window: w } = dom,
    d = w.document
  let enabled = true,
    held = false,
    changes = 0,
    interrupts = 0
  const control = holdToBrowse({
    root: d.querySelector('#browser'),
    surface: () => d.querySelector('#page'),
    window: w,
    document: d,
    enabled: () => enabled,
    remoteInput: () => d.querySelector('#remote'),
    onChange: (value) => {
      presentTemporaryBrowsing(d.querySelector('#browser'), value)
      held = value
      changes++
    },
    onInterrupt: () => interrupts++,
  })
  const pointer = (target) =>
    d
      .querySelector(target)
      .dispatchEvent(new w.MouseEvent('pointermove', { bubbles: true }))
  const key = (target, type = 'keydown', extra = {}) => {
    const event = new w.KeyboardEvent(type, {
      key: ' ',
      code: 'Space',
      bubbles: true,
      cancelable: true,
      ...extra,
    })
    d.querySelector(target).dispatchEvent(event)
    return event
  }
  return {
    dom,
    w,
    d,
    control,
    key,
    pointer,
    get held() {
      return held
    },
    get changes() {
      return changes
    },
    get interrupts() {
      return interrupts
    },
    disable: () => (enabled = false),
  }
}
test('按住空格暂停标注，重复按键不反复切换，松开即恢复', () => {
  const f = setup()
  try {
    assert.equal(f.key('#mode').defaultPrevented, true)
    assert.equal(f.held, true)
    f.key('#mode', 'keydown', { repeat: true })
    assert.equal(f.changes, 1)
    assert.equal(f.interrupts, 1)
    f.key('#mode', 'keyup')
    assert.equal(f.held, false)
    assert.equal(f.changes, 2)
  } finally {
    f.control.dispose()
    f.dom.window.close()
  }
})
test('聊天、地址栏、批注文字、富文本、组合键和输入法不触发临时浏览', () => {
  const f = setup()
  try {
    for (const target of ['#chat', '#address', '#note', '#leaf']) {
      assert.equal(f.key(target).defaultPrevented, false)
      assert.equal(f.held, false)
    }
    for (const extra of [
      { ctrlKey: true },
      { metaKey: true },
      { altKey: true },
      { shiftKey: true },
      { isComposing: true },
      { repeat: true },
    ]) {
      f.key('#page', 'keydown', extra)
      assert.equal(f.held, false)
    }
    f.disable()
    assert.equal(f.key('#page').defaultPrevented, false)
  } finally {
    f.control.dispose()
    f.dom.window.close()
  }
})
test('网页键盘代理可以临时浏览，点击使焦点离开后抬键仍恢复', () => {
  const f = setup()
  try {
    f.key('#remote')
    assert.equal(f.held, true)
    f.key('#chat', 'keyup')
    assert.equal(f.held, false)
  } finally {
    f.control.dispose()
    f.dom.window.close()
  }
})
test('窗口失焦、页面隐藏、切换模式及卸载都释放空格，不遗留监听器', () => {
  const f = setup()
  try {
    f.key('#page')
    f.w.dispatchEvent(new f.w.Event('blur'))
    assert.equal(f.held, false)
    f.key('#page')
    Object.defineProperty(f.d, 'visibilityState', {
      value: 'hidden',
      configurable: true,
    })
    f.d.dispatchEvent(new f.w.Event('visibilitychange'))
    assert.equal(f.held, false)
    f.key('#page')
    f.control.release()
    assert.equal(f.held, false)
    f.key('#page')
    f.control.dispose()
    assert.equal(f.held, false)
    assert.equal(f.key('#page').defaultPrevented, false)
  } finally {
    f.dom.window.close()
  }
})

test('鼠标回到网页后，不受聊天输入框或页面外遗留键盘焦点限制', () => {
  const f = setup()
  try {
    f.pointer('#page')
    assert.equal(f.key('#chat').defaultPrevented, true)
    assert.equal(f.held, true)
    f.key('#chat', 'keyup')
    assert.equal(f.held, false)
    f.pointer('#page')
    assert.equal(f.key('body').defaultPrevented, true)
    f.key('body', 'keyup')
    assert.equal(f.held, false)
  } finally {
    f.control.dispose()
    f.dom.window.close()
  }
})
test('批注气泡自动聚焦后可按空格浏览，实际开始写批注后空格正常输入', () => {
  const f = setup()
  try {
    f.pointer('#page')
    f.d.querySelector('#note').focus()
    assert.equal(f.key('#note').defaultPrevented, true)
    assert.equal(f.held, true)
    f.key('#note', 'keyup')
    f.key('#note', 'keydown', { key: 'a', code: 'KeyA' })
    assert.equal(f.key('#note').defaultPrevented, false)
    assert.equal(f.held, false)
    f.pointer('#page')
    assert.equal(f.key('#note').defaultPrevented, true)
    f.key('#note', 'keyup')
  } finally {
    f.control.dispose()
    f.dom.window.close()
  }
})
test('点击输入区或输入法、粘贴输入会恢复文字输入意图，不抢空格', () => {
  const f = setup()
  try {
    f.pointer('#page')
    f.pointer('#address')
    assert.equal(f.key('#address').defaultPrevented, false)
    f.pointer('#page')
    f.d
      .querySelector('#note')
      .dispatchEvent(new f.w.Event('input', { bubbles: true }))
    assert.equal(f.key('#note').defaultPrevented, false)
    f.pointer('#page')
    assert.equal(
      f.key('#note', 'keydown', { isComposing: true }).defaultPrevented,
      false,
    )
  } finally {
    f.control.dispose()
    f.dom.window.close()
  }
})

test('滚动网页也会将操作意图切回网页，不要求键盘焦点先离开聊天', () => {
  const f = setup()
  try {
    f.d.querySelector('#chat').focus()
    f.d
      .querySelector('#page')
      .dispatchEvent(new f.w.WheelEvent('wheel', { bubbles: true, deltaY: 10 }))
    assert.equal(f.key('#chat').defaultPrevented, true)
    assert.equal(f.held, true)
    f.key('#chat', 'keyup')
    assert.equal(f.held, false)
  } finally {
    f.control.dispose()
    f.dom.window.close()
  }
})

test('按下与松开的同一个事件内即更新显示状态，不等待异步渲染或截图', () => {
  const f = setup()
  try {
    const root = f.d.querySelector('#browser')
    f.pointer('#page')
    f.key('#chat')
    assert.equal(root.getAttribute('data-temp-browsing'), 'true')
    f.key('#chat', 'keyup')
    assert.equal(root.hasAttribute('data-temp-browsing'), false)
    f.key('#page')
    f.control.dispose()
    assert.equal(root.hasAttribute('data-temp-browsing'), false)
  } finally {
    f.dom.window.close()
  }
})
