// @vitest-environment jsdom
import { expect, it } from 'vitest'
import { WINDOWS_CAPTION_NO_DRAG_SELECTOR } from '../src/preload/windows-titlebar'

function page(): { body: HTMLElement; matches: (element: Element) => boolean } {
  const doc = document.implementation.createHTMLDocument()
  doc.body.classList.add('dsh-desktop-windows-titlebar-layout')
  return {
    body: doc.body,
    matches: (element) => element.matches(WINDOWS_CAPTION_NO_DRAG_SELECTOR)
  }
}

it('does not mark content buttons or switches as caption no-drag', () => {
  const { body, matches } = page()
  const button = document.createElement('button')
  const toggle = document.createElement('button')
  toggle.setAttribute('role', 'switch')
  body.append(button, toggle)
  expect(matches(button)).toBe(false)
  expect(matches(toggle)).toBe(false)
})

it('keeps no-drag on controls inside a drag row and on an explicit opt-out', () => {
  const { body, matches } = page()
  const dragRow = document.createElement('div')
  dragRow.setAttribute('data-window-drag', '')
  const dragButton = document.createElement('button')
  dragRow.append(dragButton)
  const controls = document.createElement('div')
  controls.setAttribute('data-window-drag-controls', '')
  const controlLink = document.createElement('a')
  controls.append(controlLink)
  const optedOut = document.createElement('div')
  optedOut.setAttribute('data-dsh-no-drag', '')
  body.append(dragRow, controls, optedOut)
  expect(matches(dragButton)).toBe(true)
  expect(matches(controlLink)).toBe(true)
  expect(matches(optedOut)).toBe(true)
  expect(matches(dragRow)).toBe(false)
})
