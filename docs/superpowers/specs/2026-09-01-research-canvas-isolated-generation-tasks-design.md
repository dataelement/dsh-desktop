# Sherlock Research Canvas Isolated Generation Tasks Design

## Status

Approved on 2026-09-01. This design extends the existing Research canvas
selection actions and the shared-conversation ownership defined by
`2026-08-26-research-canvas-workspace-design.md`. It replaces only the execution
path used by the canvas actions currently labelled `生成思维导图` and
`总结提炼`.

## Goal

Move Research canvas generation work into its destination component so that a
user can:

- watch each canvas task's public execution events and streamed assistant reply
  inside the component that will receive the result;
- start several canvas tasks without serializing them through the main
  conversation;
- continue an unrelated conversation in the right panel while canvas work is
  running;
- cancel, retry, reload, and recover a task without losing the component-to-task
  association;
- receive the same PPT-ready mind-map result and the same focused summary result
  as the existing actions.

The toolbar label changes from `生成思维导图` to `思维导图`. Its dropdown keeps
the `简要`, `常规`, and `详细` choices. `总结提炼` keeps its current label.

## Non-goals

- This work does not turn the right conversation into a task manager.
- It does not hide canvas messages after first inserting them into the main
  conversation. Canvas tasks must never enter that conversation or its queue.
- It does not expose private model reasoning or chain-of-thought. The component
  shows only public lifecycle states, tool-call summaries, tool results already
  intended for the user, and streamed assistant output.
- It does not keep an execution transcript in a completed component.
- It does not add a general-purpose background-agent UI for other features.
- It does not change public release metadata, publish an update, or modify the
  right-panel width and composer ownership.

## Chosen Architecture

Each canvas generation is an isolated, host-owned Research task backed by a
one-shot child Agent. The child inherits the selected parent session's
workspace, model configuration, and applicable read capabilities, but owns a
separate Session and execution loop. Starting a Research task directly through
the host service does not append a prompt, tool call, progress row, report, or
assistant message to the parent Session.

This approach was selected over two alternatives:

1. Sending hidden messages through the main Session would still share its FIFO
   turn queue and could not provide real concurrency.
2. Calling the LLM directly would stream text concurrently but would lose the
   existing Agent's ability to resolve selected files and produce meaningful
   tool execution events.

The host owns admission, cancellation, lifecycle, and event ordering. The
renderer owns placement, component presentation, and durable canvas geometry.
No renderer-only promise or FIFO assistant-message heuristic may decide which
component receives a result.

## Task Service Contract

A Sherlock Research task service exposes browser-safe operations equivalent to:

```ts
type ResearchTaskKind = 'mind-map' | 'summary'
type ResearchTaskDetail = 'brief' | 'standard' | 'detailed'

type ResearchTaskStart = {
  parentSessionId: string
  canvasNodeId: string
  kind: ResearchTaskKind
  detail?: ResearchTaskDetail
  sources: ResearchTaskSourceSnapshot[]
}

type ResearchTaskReceipt = {
  taskId: string
  childSessionId: string
  state: 'queued' | 'running'
}
```

The service also supports task inspection/reconnection and cancellation. Every
streamed event carries `taskId`, a monotonically increasing task-local sequence,
and one of these public event classes:

- `queued` and `started` lifecycle events;
- bounded phase/status copy such as reading selected material, using a named
  tool, or generating the result;
- sanitized tool-call and user-facing tool-result summaries;
- assistant text deltas;
- `completed`, `failed`, or `cancelled` terminal events.

The task service validates the parent Session, source limits, task kind, mind-map
detail, and payload lengths before admission. It applies the existing generation
prompts and output bounds. It never accepts an arbitrary system prompt from the
renderer.

## Concurrency and Isolation

At most four canvas tasks run concurrently for one parent Research Session.
Additional tasks are admitted durably in FIFO order and render immediately in
their destination components as `排队中`. Completion, failure, cancellation,
or deletion of a running component releases one slot and starts the next
admitted task.

Concurrency is scoped per parent Session so work in one Research Session does
not block another. Results may complete in any order. `taskId` and
`canvasNodeId`, never completion order, route every event and terminal result.

The existing right composer continues to call the main Session input path. A
canvas task never calls the main Session's `prompt(..., 'queue')` or
`prompt(..., 'steer')`, and the right conversation therefore remains usable
while all four canvas slots are active.

## Source Snapshot Semantics

Clicking an action creates a bounded immutable snapshot of the selected canvas
sources before the task is admitted. The snapshot preserves the canonical file
descriptor or assistant-artifact text needed by the existing Research prompt,
plus stable source identifiers for provenance.

Moving, editing, or deleting a source component after admission does not mutate
the task. Deleting the generated destination component cancels its queued or
running task and discards later events. Retrying a failed or interrupted task
uses the saved source snapshot and the same mind-map detail; it does not silently
read a different current selection.

## Component State Model

Generated components use these states:

```ts
type ResearchGenerationState =
  | 'queued'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'interrupted'
```

The persisted component record keeps:

- destination node id, generation kind, and mind-map detail;
- `taskId` and hidden child Session id after admission;
- saved source snapshot and source ids;
- current state and bounded error copy;
- final normalized output after completion;
- created, started, and completed timestamps when available;
- existing position, size, and manual/automatic sizing fields.

Transient execution events and assistant deltas may be retained in memory while
the task is active. They are removed from the component when the final result is
committed and are not persisted as a completed execution transcript.

## Running Component Presentation

The component title bar always uses the ordinary theme-aware component-frame
color and remains the drag surface. The title is `思维导图` or `总结提炼`.

Queued and running bodies also use the normal theme-aware component background;
they are not forced to white. The process layout uses restrained typography and
spacing appropriate to a canvas component:

- 16–20 px body padding;
- 13–14 px primary copy with a compact line height;
- 12 px secondary status and metadata;
- clear spacing between the current phase, public tool rows, and streamed
  assistant text;
- an unobtrusive stop action while the task is queued or running.

No right-conversation bubble chrome is copied into the component.

## Adaptive Size Behavior

An untouched task component starts at approximately 480 x 280 px. While it is
queued or running, measured public content can expand it within an automatic
range of approximately 480–640 px wide and 280–560 px tall. The top-left world
coordinate stays anchored so growth does not move the component away from its
source placement. Content beyond the maximum scrolls inside the body while the
title bar stays visible.

If the user manually resizes the component, it enters manual size mode and
stops automatic process growth. Its body scrolls as needed.

On successful completion, an untouched component switches to the normal final
content size:

- mind maps use the existing detail-specific PPT-ready sizes, each targeting an
  overall ratio near 1.2:1;
- summaries use a readable fixed width near 520 px and a measured height clamped
  to roughly 280–640 px.

A manually resized component preserves the user's size at completion. The final
mind-map body becomes white as required for direct PPT screenshots; the running
body does not. Summary results continue to use the normal theme-aware artifact
presentation.

## Completion, Failure, and Retry

On completion, the component atomically replaces its process presentation with
the final mind map or summary. It does not show an `执行过程` row, collapsed
trace, tool history, or streamed draft after completion.

A failed, cancelled, or unrecoverably interrupted component keeps its normal
frame and uses a centered body. A short explanatory message appears above a
centered `重试` button. Retry starts a new isolated task for the same destination
component from the saved source snapshot.

Cancellation is idempotent. Deleting a destination component issues
cancellation and immediately removes the local node; a late terminal event is
ignored by node id and task id. Cancelling without deletion keeps the component
in a retryable state.

## Reload and Recovery

On application or renderer restart, a component with a non-terminal task id asks
the host for the authoritative task state and the event cursor after its last
seen sequence:

- a queued or running task reconnects and resumes component-local updates;
- a task that completed while the renderer was absent commits its final output;
- a known failed or cancelled task renders the centered retry state;
- an unknown or no-longer-recoverable task becomes `interrupted` and remains
  retryable.

Recovery never replays task content into the main conversation. Duplicate or
out-of-order stream events are ignored using the task-local sequence.

## Security and Resource Bounds

- The child Agent receives only the source snapshot and product-owned generation
  instruction, not the main conversation transcript.
- The task composition prefers read-only material-resolution tools. It must not
  mutate workspace files or invoke external side effects for a mind map or
  summary.
- Source, event, error, and output sizes are bounded before persistence or
  rendering.
- Task ownership is checked against the parent Session for inspect and cancel
  operations.
- Four active tasks per parent and a bounded pending queue prevent unbounded
  local Agent and memory growth.
- Private reasoning content is neither emitted by the host nor reconstructed in
  the component.

## Implementation Boundaries

The implementation requires three isolated units:

1. A host-side Research task runtime that owns child-Agent startup, the
   four-slot scheduler, event sanitization, cancellation, and recovery.
2. A browser-safe task transport that exposes start/inspect/cancel and task
   event frames without inserting Session messages.
3. A Research canvas controller and component view that persist task identity,
   route events by id, render transient process UI, and commit final output.

The existing `ResearchWorkspace` generation helpers remain responsible for
placement and durable canvas nodes, but their current pending-generation FIFO
and `observeAssistantResult` association must no longer handle isolated canvas
tasks. The main `InputHub.generateResearchSelection` path must stop calling the
parent Session queue.

Dependency changes must be persisted through the appropriate `patch-package`
files or product-owned package sources, not left only in `node_modules`. Any new
host plugin must be included in Sherlock's bundled offline plugin profile and
verified for source/package parity.

## Focused Verification

Automated coverage must prove:

- the toolbar label is `思维导图` and its three detail choices are unchanged;
- a canvas task never calls the main Session prompt or adds a right-conversation
  message;
- four tasks run together and a fifth remains queued until a slot is released;
- out-of-order deltas and completions update only the matching component;
- the right composer can submit and complete an unrelated turn while canvas
  tasks run;
- queued/running cancellation, destination deletion, late-event rejection, and
  centered retry behavior;
- immutable source snapshots and retry using the saved snapshot;
- reload reconnection, completion while absent, and interrupted fallback;
- automatic process sizing, manual-size preservation, maximum-body scrolling,
  final mind-map ratio, and final summary height;
- theme-aware queued/running surfaces, white final mind-map background, and no
  execution-process UI after completion;
- the existing brief/standard/detailed parsing, PPT styling, connector geometry,
  and summary rendering remain intact.

Final validation follows `docs/sherlock-local-test-runbook.md` with
`./script/build_and_run.sh --verify`. In the real locally built Sherlock window,
verify at least two simultaneous mind maps, one summary, one queued fifth task,
and an unrelated right-panel conversation. Exercise cancellation, retry,
component deletion, session switching, and application restart. Keep the app
open for user testing.

Do not run the full test suite. Do not notarize, upload, publish, bump the
version, push source, or promote the integration batch without user acceptance.
