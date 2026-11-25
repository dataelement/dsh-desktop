export const INSTRUCTION_SOURCE = 'dsh-workbench-instructions'

/** Native reference chips keep the complete text in the persisted draft and clipboard. */
export function createInstructionSource(open) {
  const text = ref => {
    if (typeof ref !== 'string' || !ref.trim() || ref.length > 100_000) throw new Error('Invalid workbench instructions')
    return ref
  }
  return {
    name: INSTRUCTION_SOURCE, trigger: '@',
    candidates: async () => [], onPick: () => undefined,
    openReference: (_session, { ref }) => { open(text(ref)); return true },
    codec: { clipboardText: text, serialize: async ref => text(ref) }
  }
}

/** Prepare an isolated, editable development draft. The agent reads the guide URL in the prompt. */
export async function createWorkbenchConversation({ ctx, signal, current, workspaceId, activate, prompt, starter, label, compact, errorText }) {
  const live = () => !signal.aborted && current()
  if (!live()) return
  // Resolve the composer only for this explicit action, without gating navigation.
  const conversation = ctx.get('conversation')
  if (!conversation?.input?.for) throw new Error(errorText('unsupported'))
  const sessionId = await ctx.sessions.create(workspaceId ? { workspaceId } : {})
  if (!live()) return
  await ctx.sessions.using(sessionId, { source: 'workbench-create', signal }, async reference => {
    const binding = await reference.ready
    if (!live()) return
    const input = conversation.input.for(binding.ctx)
    const snapshot = input.state.getSnapshot()
    if (snapshot.draft || snapshot.attachmentIds.length || snapshot.phase !== 'plain') throw new Error(errorText('draftChanged'))
    if (compact && starter && input.insertReference && conversation.input.requestDraftInitialization) {
      const inserted = input.insertReference({
        source: INSTRUCTION_SOURCE, ref: prompt, label, clipboardText: prompt
      }, { start: 0, end: 0, draftRev: snapshot.draftRev })
      if (!inserted) throw new Error(errorText('draftChanged'))
      // Append already starts a new paragraph; leading newlines would create empty rows.
      const result = conversation.input.requestDraftInitialization(binding, { prompt: starter, whenDraftExists: 'append' })
      if (result !== 'applied') throw new Error(errorText('draftChanged'))
    } else {
      // Older hosts still receive the complete instructions rather than a broken reference.
      input.setDraft(starter ? prompt + '\n\n' + starter : prompt)
    }
    await activate(sessionId)
    if (live()) input.focus()
    // Sending always belongs to the user; no guide download or attachment is needed.
  })
  return sessionId
}
