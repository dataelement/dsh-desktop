# Office client state for extensions

The standard Office and PPT Composer plugins publish `desktopOffice` and
`desktopPresentation` through the existing Cordis context. Extensions must declare
these services through `ctx.inject`; lifecycle disposal is owned by that context.
No example catalog, prompt text or product policy is part of these services.

`desktopOffice` is the same session store used by the Word/Excel picker:
`snapshot(sessionId)`, `subscribe(sessionId, listener)`, `load(sessionId, force)`
and `mutate(sessionId, endpoint, payload)` preserve its request revisions, busy
state, error handling and existing RPC validation. Supported selection endpoints
are `mode`, `select` (with template revision), and `deselect`. A `false` mutation
result means no acknowledged selection was applied. Extensions must inspect the
snapshot error and must not report success in that case.

`desktopPresentation` provides `snapshot(sessionId)`, `subscribe(sessionId,
listener)` and `change(sessionId, { mode, templateId? }, signal?)`. `mode` is `ppt`
or `null`. It uses the existing presentation RPC and updates the picker's own
store. A bound session is required. Stale responses return `false`; rejected RPCs
retain an error and clear loading. Cancellation prevents further UI changes but
cannot roll back an RPC already acknowledged by the server. Extensions own their
prompt insertion and draft revision checks separately.
