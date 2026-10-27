import test from 'node:test'
import assert from 'node:assert/strict'
import { annotationPlacement } from '../src/placement.mjs'
const place = (rect, extra = {}) =>
  annotationPlacement({
    viewport: { width: 800, height: 600 },
    capture: { width: 800, height: 600, rect },
    popup: { width: 360, height: 220 },
    ...extra,
  })

test('批注气泡紧贴元素下方，底部元素自动放到上方', () => {
  const below = place({ x: 100, y: 100, width: 180, height: 40 })
  assert.equal(below.side, 'bottom')
  assert.equal(below.left, 100)
  assert.equal(below.top, 150)
  const above = place({ x: 100, y: 530, width: 180, height: 40 })
  assert.equal(above.side, 'top')
  assert.equal(above.top, 300)
})
test('截图缩放和留白后的选区位置与气泡对齐', () => {
  const position = place(
    { x: 100, y: 100, width: 200, height: 40 },
    {
      viewport: { width: 600, height: 600 },
      capture: {
        width: 1000,
        height: 500,
        rect: { x: 100, y: 100, width: 200, height: 40 },
      },
    },
  )
  assert.equal(position.left, 60)
  assert.equal(position.top, 244) // y: 150 letterbox + 140*.6 + gap
})
test('窄侧栏、四角和放大选区均不会将输入区推出视口', () => {
  for (const [vw, vh] of [
    [400, 700],
    [737, 827],
    [300, 220],
  ])
    for (const [x, y] of [
      [0, 0],
      [900, 0],
      [0, 650],
      [900, 650],
    ]) {
      const p = annotationPlacement({
        viewport: { width: vw, height: vh },
        capture: {
          width: 1000,
          height: 700,
          rect: { x, y, width: 100, height: 50 },
        },
        popup: { width: 360, height: 230 },
      })
      assert.ok(p.left >= 12)
      assert.ok(p.top >= 12)
      assert.ok(p.left + p.width <= vw - 12 + 0.001)
      assert.ok(p.top + Math.min(230, p.maxHeight) <= vh - 12 + 0.001)
    }
})
test('整页根元素使用实际点击处作为锚点，避免跳到页面另一端', () => {
  const p = place(
    { x: 0, y: 0, width: 800, height: 600 },
    { point: { x: 120, y: 100 } },
  )
  assert.equal(p.side, 'bottom')
  assert.equal(p.top, 110)
  assert.equal(p.left, 120)
})

test('上下空间不足的长元素，输入气泡选择可容纳它的左右侧', () => {
  const right = place({ x: 100, y: 100, width: 40, height: 400 })
  assert.equal(right.side, 'right')
  assert.equal(right.left, 150)
  const left = place({ x: 660, y: 100, width: 40, height: 400 })
  assert.equal(left.side, 'left')
  assert.equal(left.left, 290)
})
