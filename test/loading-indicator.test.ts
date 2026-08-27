import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { runInNewContext } from 'node:vm'
import { describe, expect, it } from 'vitest'

type StateDotComponent = (props: {
  state: 'done' | 'warning' | 'ongoing' | 'error'
  size?: number
  className?: string
}) => unknown

const requireModule = createRequire(import.meta.url)
const { createElement } = requireModule('react') as {
  createElement: (type: unknown, props?: unknown) => unknown
}
const { Fragment, jsx, jsxs } = requireModule('react/jsx-runtime') as {
  Fragment: unknown
  jsx: (type: unknown, props: unknown, key?: string) => unknown
  jsxs: (type: unknown, props: unknown, key?: string) => unknown
}
const { renderToStaticMarkup } = requireModule('react-dom/server') as {
  renderToStaticMarkup: (node: unknown) => string
}
const clsx = requireModule('clsx') as (...values: unknown[]) => string

const IconLoadingOutline16 = ({
  size = 16,
  className
}: {
  size?: number
  className?: string
}) =>
  jsx('svg', {
    width: size,
    height: size,
    className,
    viewBox: '0 0 16 16',
    children: jsx('path', {
      d: 'M2.871 13.1286C0.0387669 10.2962 0.0387669 5.70383 2.871 2.87141C5.70341 0.0390029 10.2957 0.0391154 13.1282 2.87141L12.1387 3.86094C9.85292 1.57538 6.1469 1.57596 3.86123 3.86163C1.57573 6.14732 1.57573 9.85269 3.86123 12.1384C6.1469 14.424 9.85292 14.4246 12.1387 12.1391L13.1282 13.1286C10.2957 15.9609 5.70341 15.961 2.871 13.1286Z',
      fill: 'currentColor'
    })
  })

async function loadStateDot(): Promise<StateDotComponent> {
  const source = await readFile(
    'node_modules/@deepseek-ai/dsh-client-ui-primitives/lib/index.js',
    'utf8'
  )
  const start = source.indexOf('//#region lib/types/StateDot.js')
  const end = source.indexOf('//#endregion', start)
  if (start === -1 || end === -1) throw new Error('StateDot source region is missing')

  const context: { StateDot?: StateDotComponent } = {}
  runInNewContext(
    `${source.slice(start, end)}\n;globalThis.StateDot = StateDot;`,
    {
      ...context,
      globalThis: context,
      Fragment,
      jsx,
      jsxs,
      clsx,
      IconLoadingOutline16,
      StateDot_module_css_default: {}
    }
  )
  if (context.StateDot === undefined) throw new Error('StateDot did not load')
  return context.StateDot
}

describe('Sherlock loading indicator', () => {
  it('renders the ongoing state as the same open white ring used by Codex', async () => {
    const StateDot = await loadStateDot()
    const html = renderToStaticMarkup(
      createElement(StateDot, {
        state: 'ongoing',
        size: 12,
        className: 'status-slot'
      })
    )

    expect(html).toContain('<path')
    expect(html).toContain('d="M2.871 13.1286')
    expect(html).toContain('fill="currentColor"')
    expect(html).toContain('dshStateRingMotion')
    expect(html).toContain('1s linear infinite')
    expect(html).toContain('@keyframes dsh-state-ring-spin')
    expect(html).toContain('@media (prefers-reduced-motion:reduce)')
    expect(html).not.toContain('<circle')
    expect(html).not.toContain('<rect')
  })

  it('patches the prebuilt web frontend that the packaged Harness actually serves', async () => {
    const [frontendJs, frontendCss, frontendPatcher, packageJson] = await Promise.all([
      readFile(
        'node_modules/@deepseek-ai/dsh-web-frontend/dist/assets/index-C-1AiF3k.js',
        'utf8'
      ),
      readFile(
        'node_modules/@deepseek-ai/dsh-web-frontend/dist/assets/index-CSGf6Qzd.css',
        'utf8'
      ),
      readFile('scripts/patch-web-frontend-loading.mjs', 'utf8'),
      readFile('package.json', 'utf8')
    ])

    for (const source of [frontendJs, frontendPatcher]) {
      expect(source).toContain(
        'n==="ongoing"?f.jsx(v9,{size:r,className:ye(yl.matrix,i)})'
      )
      expect(source).not.toContain('shapeRendering:"crispEdges"')
    }
    for (const source of [frontendCss, frontendPatcher]) {
      expect(source).toContain(
        '._matrix_10orb_4{flex:none;color:var(--dsw-alias-label-secondary);animation:_spin_9gj4p_34 1s linear infinite}'
      )
      expect(source).toContain('@media(prefers-reduced-motion:reduce){._matrix_10orb_4{animation:none}}')
    }

    expect(frontendPatcher).toContain('dsh-client-ui-primitives')
    expect(JSON.parse(packageJson).scripts.build).toContain(
      'node scripts/patch-web-frontend-loading.mjs'
    )
  })
})
