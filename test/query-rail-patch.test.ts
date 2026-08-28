import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'
import { projectRoot } from './patch-path'
import path from 'node:path'

describe('conversation Query navigation rail', () => {
  it('is left to Harness, which now ships turn navigation of its own', async () => {
    // The desktop carried a QueryRail: a compact, independently scrollable
    // rail marking every durable user query, plus the viewport arithmetic that
    // decided which turn owned the reading position.
    //
    // 0.1.2-alpha.1 moved conversation rendering into
    // @deepseek-ai/dsh-client-ui-chat and shipped turn navigation natively —
    // the chat view reads `s.navigation.items()` and tracks an active turn
    // over the same list and column refs the rail used. Re-applying the patch
    // would put a second rail beside the built-in one.
    const chat = await readFile(
      path.join(
        projectRoot,
        'node_modules',
        '@deepseek-ai',
        'dsh-client-ui-chat',
        'lib',
        'client.js'
      ),
      'utf8'
    )

    expect(chat).toContain('turnNavigationItems')
    expect(chat).toContain('const [activeTurn, setActiveTurn]')
  })

  it('leaves the file-access confirmation to Harness as well', async () => {
    // The same patch added an access-confirmation dialog. Upstream adopted it:
    // the conversation package ships the `access.confirm.*` copy itself now.
    const conversation = await readFile(
      path.join(
        projectRoot,
        'node_modules',
        '@deepseek-ai',
        'dsh-client-ui-conversation',
        'lib',
        'client.js'
      ),
      'utf8'
    )

    expect(conversation).toContain('access.confirm.title')
    expect(conversation).toContain('access.confirm.enable')
  })
})
