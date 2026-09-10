import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'
import { patchPath } from './patch-path'

/**
 * The conversation width handle paints a short vertical bar beside the chat
 * column while the pointer hovers it. Harness ships it 3px wide, which reads
 * as a heavy content border; the desktop patch thins it to a hairline.
 */
describe('DSH Desktop conversation width handle', () => {
  it('draws the hover indicator as a 1px hairline', async () => {
    const patch = await readFile(patchPath('@deepseek-ai/dsh-client-ui-conversation'), 'utf8')
    const added = patch.split('\n').filter((line) => line.startsWith('+'))
    const rule = added.find((line) => line.includes('_8JRpoa_widthHandle:after{'))

    expect(rule).toBeDefined()
    expect(rule).toContain(
      'pointer-events:none;border-radius:1px;width:1px;position:absolute;top:0;bottom:0}'
    )
    expect(rule).not.toContain('border-radius:3px;width:3px')
  })
})
