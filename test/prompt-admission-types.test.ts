import type { Context } from '@deepseek-ai/cordis'
import type { AssembleContext, PreparedPrompt, SystemPrompt } from '@deepseek-ai/dsh-system-prompt'
import type { InputBeforeSubmitRequest } from '@deepseek-ai/dsh-client-ui-conversation/client'
import { expectTypeOf, it } from 'vitest'

function registerAdmission(ctx: Context) {
  ctx.on('system-prompt/prepare', async context => { expectTypeOf(context).toEqualTypeOf<AssembleContext>() })
  ctx.on('conversation/input-before-submit', async request => { expectTypeOf(request).toEqualTypeOf<InputBeforeSubmitRequest>() })
}

it('publishes typed awaitable events and preserves the optional preparation argument', () => {
  expectTypeOf(registerAdmission).parameter(0).toEqualTypeOf<Context>()
  expectTypeOf<SystemPrompt['prepare']>().returns.toEqualTypeOf<Promise<PreparedPrompt>>()
  expectTypeOf<Parameters<SystemPrompt['assemble']>[1]>().toEqualTypeOf<PreparedPrompt | undefined>()
  expectTypeOf<InputBeforeSubmitRequest['signal']>().toEqualTypeOf<AbortSignal>()
})
