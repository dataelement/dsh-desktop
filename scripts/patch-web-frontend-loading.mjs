import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const assetsDirectory = join(
  process.cwd(),
  'node_modules',
  '@deepseek-ai',
  'dsh-web-frontend',
  'dist',
  'assets'
)
const primitivesPath = join(
  process.cwd(),
  'node_modules',
  '@deepseek-ai',
  'dsh-client-ui-primitives',
  'lib',
  'index.js'
)

const ringMotionCss =
  '@keyframes dsh-state-ring-spin{to{transform:rotate(360deg)}}' +
  '.dsh-state-ring{color:var(--dsw-alias-label-secondary);animation:dsh-state-ring-spin 1s linear infinite}' +
  '@media (prefers-reduced-motion:reduce){.dsh-state-ring{animation:none}}'

function asset(suffix) {
  const matches = readdirSync(assetsDirectory).filter(
    (name) => name.startsWith('index-') && name.endsWith(suffix)
  )
  if (matches.length !== 1) {
    throw new Error(`Expected one dsh-web-frontend ${suffix} asset, found ${matches.length}`)
  }
  return join(assetsDirectory, matches[0])
}

function patchJavaScript(path) {
  let source = readFileSync(path, 'utf8')
  const replacement = 'n==="ongoing"?f.jsx(v9,{size:r,className:ye(yl.matrix,i)})'
  if (source.includes(replacement)) return

  const startNeedle = 'n==="ongoing"?f.jsx("svg",{className:ye(yl.matrix,i)'
  const endNeedle = ':f.jsx("span"'
  const start = source.indexOf(startNeedle)
  const end = source.indexOf(endNeedle, start)
  if (start < 0 || end < 0) throw new Error('Unable to find the running StateDot bundle')

  source = source.slice(0, start) + replacement + source.slice(end)
  writeFileSync(path, source)
}

function patchPrimitives(path) {
  let source = readFileSync(path, 'utf8')
  if (source.includes('className: "dshStateRingMotion"')) return

  const startNeedle = '\tif (state === "ongoing") return jsx("svg", {'
  const endNeedle = '\n\treturn jsx("span"'
  const start = source.indexOf(startNeedle)
  const end = source.indexOf(endNeedle, start)
  if (start < 0 || end < 0) throw new Error('Unable to find the source StateDot component')

  const replacement = [
    '\tif (state === "ongoing") return jsxs(Fragment, {',
    '\t\tchildren: [jsx("style", {',
    '\t\t\tclassName: "dshStateRingMotion",',
    `\t\t\tchildren: ${JSON.stringify(ringMotionCss)}`,
    '\t\t}), jsx(IconLoadingOutline16, {',
    '\t\t\tsize,',
    '\t\t\tclassName: clsx(StateDot_module_css_default.matrix, "dsh-state-ring", className)',
    '\t\t})]',
    '\t});'
  ].join('\n')

  source = source.slice(0, start) + replacement + source.slice(end)
  writeFileSync(path, source)
}

function patchStyles(path) {
  let source = readFileSync(path, 'utf8')
  const replacement =
    '._matrix_10orb_4{flex:none;color:var(--dsw-alias-label-secondary);animation:_spin_9gj4p_34 1s linear infinite}@media(prefers-reduced-motion:reduce){._matrix_10orb_4{animation:none}}'
  if (source.includes(replacement)) return

  const startNeedle = '._matrix_10orb_4{flex:none;color:var(--dsh-state-ongoing)}'
  const endNeedle = '._root_9cl6j_3'
  const start = source.indexOf(startNeedle)
  const end = source.indexOf(endNeedle, start)
  if (start < 0 || end < 0) throw new Error('Unable to find the running StateDot styles')

  source = source.slice(0, start) + replacement + source.slice(end)
  writeFileSync(path, source)
}

patchPrimitives(primitivesPath)
patchJavaScript(asset('.js'))
patchStyles(asset('.css'))
