// @vitest-environment jsdom
import { readFileSync } from 'node:fs'
import ts from 'typescript'
import { expect, it } from 'vitest'
import { WINDOWS_TITLEBAR_HEIGHT } from '../src/shared/desktop-menu'
import { markWindowsTitlebar } from '../src/preload/windows-titlebar'

const client = readFileSync('node_modules/@deepseek-ai/dsh-client-ui-layout/lib/client.js', 'utf8')
const ast = ts.createSourceFile('client.js', client, ts.ScriptTarget.Latest, true)

function functionSource(name: string): string {
  let source: string | undefined
  const visit = (node: ts.Node): void => {
    if (ts.isFunctionDeclaration(node) && node.name?.text === name) source = node.getText(ast)
    ts.forEachChild(node, visit)
  }
  visit(ast)
  if (!source) throw new Error(`Harness layout function ${name} is unavailable`)
  return source
}

let collapsedWidthSource: string | undefined
const findCollapsedWidth = (node: ts.Node): void => {
  if (ts.isVariableStatement(node) && node.declarationList.declarations.some(declaration =>
    ts.isIdentifier(declaration.name) && declaration.name.text === 'collapsedWidth'
  )) collapsedWidthSource = node.getText(ast)
  ts.forEachChild(node, findCollapsedWidth)
}
findCollapsedWidth(ast)

it.each(['win32', 'linux'])('uses the caption layout without changing the %s platform identity', platform => {
  const doc = document.implementation.createHTMLDocument()
  doc.documentElement.dataset.platform = platform
  markWindowsTitlebar(doc)
  expect(doc.documentElement.dataset.platform).toBe(platform)
  expect(doc.documentElement.hasAttribute('data-windows-titlebar')).toBe(true)
  expect(doc.documentElement.style.getPropertyValue('--dsh-windows-titlebar-height')).toBe(`${WINDOWS_TITLEBAR_HEIGHT}px`)
  if (!collapsedWidthSource) throw new Error('Harness collapsed sidebar width is unavailable')

  const createColumns = new Function('document', `
    ${functionSource('clampWidth')}
    ${functionSource('computeColumns')}
    const viewport = 1200
    const windowsTitlebar = document.documentElement.hasAttribute('data-windows-titlebar')
    const drawer = viewport < 768 && !windowsTitlebar
    const darwin = document.documentElement.dataset.platform === 'darwin'
    ${collapsedWidthSource}
    return () => computeColumns(1200, 0, 0, collapsedWidth)
  `) as (doc: Document) => () => { sidebar: number; center: number }

  expect(createColumns(doc)()).toMatchObject({ sidebar: 0, center: 1200 })
  const webDoc = document.implementation.createHTMLDocument()
  expect(createColumns(webDoc)()).toMatchObject({ sidebar: 56, center: 1144 })
})
