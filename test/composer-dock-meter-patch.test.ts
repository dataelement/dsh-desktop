import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

const PATCH = 'patches/@deepseek-ai+dsh-client-ui-conversation+0.1.2-rc.1.patch'

describe('composer dock meter placement', () => {
  it('moves the context meter from the trailing controls into the dock row under the card', async () => {
    const patch = await readFile(PATCH, 'utf8')

    // The meter no longer sits between the model seat and the primary button.
    expect(patch).toContain('-\t\t\t\t\t\t\t\t\t\t(0, react_jsx_runtime.jsx)(ContextMeter, {')

    // The dock slot and the meter share one row; the meter is pinned to the right.
    expect(patch).toContain('+\t\t\t\t\t\t"data-dsh-composer-dock-row": "",')
    expect(patch).toContain('+\t\t\t\t\t\t\t"data-dsh-composer-dock-meter": "",')
    expect(patch).toContain('+\t\t\t\t\t\t\tchildren: (0, react_jsx_runtime.jsx)(ContextMeter, {')
    expect(patch).toContain('[data-dsh-composer-dock-meter]{align-items:center;display:inline-flex;position:absolute;')
  })

  it('renders the composer "+" button without a resting background', async () => {
    const patch = await readFile(PATCH, 'utf8')
    expect(patch).toContain('+\t\t\t\t\t\t\t\t\t\t\t\t"data-dsh-composer-add": "",')
    expect(patch).toContain('[data-dsh-composer-add]{background:0 0}')
  })

  it('tightens the gap between the "+" button and the mode selectors to 4px', async () => {
    const patch = await readFile(PATCH, 'utf8')
    expect(patch).toContain('+\t\t\t\t\t\t\t\t\t"data-dsh-composer-tools": "",')
    expect(patch).toContain('[data-dsh-composer-tools]{gap:4px}')
  })
})
