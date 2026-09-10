import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

const PATCH = 'patches/@deepseek-ai+dsh-client-ui-chat+0.1.2-rc.1.patch'

// One step under the secondary content tier: 12px at the default 14px setting,
// and still tracking the Settings font-size preference.
const SIZE = 'calc(var(--dsh-content-font-size-secondary,13px) - 1px)'

describe('turn stats font size', () => {
  it('shrinks the turn usage / turn time triggers under each assistant message', async () => {
    const patch = await readFile(PATCH, 'utf8')
    expect(patch).toContain(`+\t\t\ttag.textContent = css$4 + ".CIMUaa_trigger{font-size:${SIZE}}";`)
  })

  it('shrinks the message clock next to the icon actions', async () => {
    const patch = await readFile(PATCH, 'utf8')
    expect(patch).toContain(
      `+\t\t\ttag.textContent = css$12 + ".qJxi1G_timeStart,.qJxi1G_timeEnd{font-size:${SIZE}}";`
    )
  })

  it('shrinks the session stats line under the composer', async () => {
    const patch = await readFile(PATCH, 'utf8')
    expect(patch).toContain(`+\t\t\ttag.textContent = css$2 + ".XZbVjq_root{font-size:${SIZE}}";`)
  })
})
