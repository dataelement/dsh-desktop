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

patchJavaScript(asset('.js'))
patchStyles(asset('.css'))
