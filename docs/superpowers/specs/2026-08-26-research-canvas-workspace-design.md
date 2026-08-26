# Sherlock Research Canvas Workspace Design

## Status

Product direction approved; detailed specification pending user review. This
document combines the existing Research canvas file-drop work with the agreed
canvas-selection, right-side conversation, and message-to-canvas behavior. It
supersedes the earlier interaction scope in
`2026-08-25-research-canvas-file-drop-design.md` while retaining that document's
validated file-path, persistence, drop-ownership, and safety contracts.

## Goal

Turn Research into a desktop research workspace instead of a chat page with a
canvas background:

- the center column is a pure, full-height canvas for files and deliberately
  saved research artifacts;
- the right panel contains the complete conversation experience for the active
  session;
- canvas file selection becomes the ordered file context of the right-side
  composer;
- conversation messages never appear on the canvas automatically;
- users decide which assistant outputs or excerpts are worth placing on the
  canvas.

The existing `对话` page remains the normal full-width conversation surface.
Research reuses the same session and input state rather than creating a second
conversation.

## Product Principles

1. **One session, two presentations.** The main Chat view and the Research
   right-side conversation render the same session log, draft, queue, running
   turn, permissions, model, attachments, and errors.
2. **Only one composer is mounted at a time.** Research moves the resident
   composer into the right panel; it does not duplicate it in the center.
3. **The canvas is curated, not chronological.** Files and deliberately added
   research artifacts belong on the canvas. Ordinary user and assistant
   messages stay in the conversation.
4. **Selection is input context.** Selected file nodes and composer file tags
   are two views of one ordered per-session selection.
5. **Spatial state is durable.** File and research-artifact positions survive
   view switching, session switching, reload, and application restart.

## Research Layout

### Entering Research

Selecting the top-level `研究` tab must:

1. open the right panel if it is closed;
2. install a pinned `对话` tab at the far left of the right-panel tab strip;
3. select that pinned tab when entering Research from another top-level view;
4. restore the last user-adjusted right-panel width, using 420 px on first use;
5. remove the center-column composer, composer docks, queue/task strip, and
   statistics footer so the canvas reaches the bottom edge of the center
   column.

The existing resizable right-panel contract remains in force. The panel may be
resized within its supported 300–520 px range and may be collapsed as a whole.
Collapsing the panel does not close the pinned Conversation tab or lose its
state. Leaving Research and entering it again opens the panel and selects
Conversation again.

### Right-Panel Tabs

The right-panel tab order is:

1. `对话` — pinned, leftmost, not closable, and not reorderable;
2. file surfaces such as `Files`;
3. tool-call or other temporary detail tabs;
4. the existing add-tab control.

Switching away from Conversation inside Research is allowed. If a new assistant
update arrives while another right-panel tab is active, Conversation receives
an unread indicator but does not steal focus.

Clicking a tool call in the conversation opens or selects a closable detail tab
to the right of Conversation. Tool details never replace the pinned
Conversation tab.

### Leaving Research

When the user selects the top-level `对话` or `轨迹` view:

- the Research-only pinned Conversation tab is removed from the right panel;
- the center view resumes its normal composer placement;
- the pre-Research right-panel tab, width, and open/closed state are restored;
- no draft, attachment, scroll, running-turn, or queue state is copied because
  both presentations already share the same session state.

This prevents the full-width Chat page and the right-side Conversation page
from appearing at the same time.

## Right-Side Conversation

The pinned Conversation page is the existing Chat experience adapted to the
right-panel width. It includes:

- the complete message history and streaming assistant response;
- compact execution progress and approval surfaces;
- queued or steering messages;
- the task/queue dock;
- the composer, permission selector, model selector, stop/send controls, and
  statistics footer;
- draft images and the new ordered Research file tags;
- prompt errors, attachment errors, and retry behavior.

It omits the duplicated session title row and the top-level `对话 / 研究 / 轨迹`
navigation. The message history scrolls independently, while the composer stays
anchored at the bottom of the right panel.

Switching between the full-width Chat view and Research must preserve the live
draft, caret-relevant text state, file-tag order, image attachments, pending
queue, running response, and message scroll position. A view switch must never
submit, cancel, or duplicate a message.

## Canvas Navigation

The current infinite-canvas behavior remains:

- wheel gestures pan the canvas;
- Command-wheel zooms around the pointer;
- holding Space and dragging pans the canvas;
- the dotted background, file nodes, and research-artifact nodes share one
  world-coordinate transform;
- light and dark themes use the existing theme-aware canvas styling;
- no browser focus outline or global file-drop overlay obscures the canvas.

Interaction priority is:

1. Space-drag pans, regardless of the pointer target;
2. primary-button drag on a selected node moves the selected group;
3. primary-button drag on an unselected node selects and moves that node;
4. primary-button drag on blank canvas creates a marquee selection;
5. wheel and Command-wheel keep their existing pan/zoom behavior.

## Files on the Canvas

### Adding Files

Research accepts one or more files from:

- Finder through the narrow Electron `webUtils.getPathForFile` preload bridge;
- Sherlock right-side file/detail surfaces through the validated
  `application/x-sherlock-file` payload.

The first card is placed at the pointer's world coordinate. Additional files
use a small diagonal offset. Re-dropping the same resolved path repositions the
existing node rather than creating a duplicate.

Each file node persists the validated JSON-safe metadata already established by
the file-drop design:

```ts
type ResearchCanvasFileNode = {
  id: string
  path?: string
  name: string
  mediaType?: string
  source: 'computer' | 'sherlock'
  x: number
  y: number
}
```

The existing session-scoped storage key remains
`sherlock.research.canvas.files.v1:<sessionId>` until a schema change requires a
new version.

### Selecting Files

File cards support direct and marquee selection:

- clicking a file selects only that file;
- Command-click toggles that file without changing the other selections;
- Shift-click adds the file to the current selection;
- dragging on blank canvas creates a visible marquee rectangle;
- a plain marquee replaces the current selection;
- Shift-marquee adds every intersecting file;
- Command-marquee toggles every intersecting file;
- clicking blank canvas without dragging or pressing Escape clears the
  selection.

A file counts as intersecting when its rendered card rectangle overlaps the
marquee rectangle. Selection geometry is evaluated in viewport coordinates so
it remains visually correct at every canvas zoom level.

Selected cards use a clear theme-aware border and selected-state background.
Keyboard focus remains visually distinct from selection. File cards are
focusable; Enter selects the focused card and Command-A selects all file and
artifact nodes when focus is inside the canvas rather than the composer.

### Moving Files

Dragging an unselected card selects it and moves only that card. Dragging any
already-selected card moves the complete selected group while preserving the
relative spacing between nodes.

Pointer movement is converted from screen delta to world delta by dividing by
the active canvas scale. Positions update during the drag and are persisted
when it ends. Pointer cancellation, window blur, or component cleanup commits
the last valid in-memory position and removes all dragging visuals.

Files and research-artifact nodes participate in the same group-movement
contract.

## File Selection and Composer Tags

The canvas selection and right-side composer file tags share one
session-scoped draft state:

```ts
type ResearchCanvasSelection = {
  selectedNodeIds: string[]
  orderedFileIds: string[]
}
```

`selectedNodeIds` contains the selected file and artifact node ids in their
most-recent selection order. `orderedFileIds` is the unique, ordered subset of
selected nodes whose nodes are files, and is the model-facing tag order. The
canvas may derive a `Set` from `selectedNodeIds` for hit-testing, but neither
the set nor the tag UI becomes a second source of truth. Selecting artifacts
never adds composer attachments.

Behavior:

- newly selected files append to the tag row;
- files selected together by a marquee append in stable top-to-bottom,
  left-to-right canvas order;
- tags display the file icon and basename, never the absolute path;
- tags sit above the text editor inside the right-side composer;
- dragging a tag reorders `orderedFileIds` without moving canvas nodes;
- removing a tag also deselects its canvas file;
- deselecting a canvas file removes its tag;
- duplicate selections never create duplicate tags;
- selection and tag order survive top-level view switches, session switches,
  reload, and restart until the draft is sent or the user removes them.

This draft selection is persisted under
`sherlock.research.canvas.selection.v1:<sessionId>`.

A node without a resolved local path still remains movable and selectable. Its
composer tag shows an unavailable state, and submission is blocked until the
user removes or re-imports that file. Sherlock must not pretend that a
name-only card can be read by the agent.

## Sending a Research Message

The send operation captures one immutable attempt containing:

- the visible draft text;
- the ordered Research file descriptors;
- any existing image attachments;
- the active session, model, permission, queue/steer mode, and running-turn
  state.

The visible text area contains only the user's text and file tags. For the host
prompt, ordered file descriptors are serialized through the existing Sherlock
file-reference contract immediately before the user's text. The user message
renderer recognizes that owned prefix and displays the same file tags instead
of raw path lines. Other user-authored text that resembles a file line is not
silently reinterpreted.

Submitting files without text is valid. Submitting neither text nor files nor
images remains disabled.

Submission first snapshots the complete attempt, then follows the existing
optimistic behavior by clearing the composer when `session.prompt` is
dispatched, before remote settlement. On success, the corresponding canvas
files become unselected while their nodes and positions remain. If the host
rejects the prompt or sending fails, the exact draft text, images, file
selection, and tag order are restored without duplication.

While a turn is running, additional messages continue to use the existing
queue/steer policy. The right-side Conversation page is the only place that
renders the user message, execution progress, streaming response, and final
assistant message.

## Receiving Messages

Assistant output streams into the pinned Conversation page using the same
rendering and state as the full-width Chat page. The center canvas does not
create a request card, response card, or tool node automatically.

If Conversation is not the active right-panel tab:

- streaming continues normally;
- the Conversation tab shows a running or unread indicator;
- the current Files/detail tab remains selected;
- selecting Conversation returns to the last reading position or follows the
  existing scroll-to-bottom policy for new output.

Errors, cancellation, retry, approvals, and queued messages behave exactly as
they do in the main Chat view. Research must not introduce a second execution
state machine.

## Deliberately Adding Conversation Output to the Canvas

Assistant messages provide two explicit ways to create canvas research
artifacts:

1. **Add the complete response.** The message action `添加到画布` creates a
   compact result card in the center of the visible canvas viewport.
2. **Add an excerpt.** When the user selects text inside one assistant message,
   the selection action `加入画布` creates an excerpt card. Dragging that
   selected passage from the right panel and dropping it on the canvas creates
   the same artifact at the drop point.

The internal drag payload is bounded and validated. It carries only the owning
session/message identity, artifact kind, a bounded title, and a bounded text
excerpt; arbitrary HTML is never accepted.

```ts
type ResearchCanvasArtifactNode = {
  id: string
  kind: 'assistant-result' | 'assistant-excerpt'
  messageId: string
  title: string
  excerpt: string
  x: number
  y: number
}
```

Artifact nodes are persisted per session under
`sherlock.research.canvas.artifacts.v1:<sessionId>`. A complete-response
artifact is unique by message id: adding it again repositions the existing
card. Excerpt identity is derived from the owning message id and normalized,
bounded excerpt text, so different excerpts from one message may coexist while
an exact duplicate repositions its existing card.

Artifact cards are compact, movable, selectable, and group-draggable like file
cards. Activating an artifact opens the pinned Conversation tab and scrolls to
its source message. If the source message cannot be loaded, the persisted title
and excerpt remain visible and the card shows that its source is unavailable.

No automatic connectors, automatic layout, or automatic extraction of every
heading is included in this increment.

## Persistence and Ownership

Persist separately per session:

- file nodes and positions;
- artifact nodes and positions;
- ordered Research file selection used by the current draft;
- right-panel Research preferences such as last width.

Conversation messages, drafts, images, queue state, and execution state remain
owned by the existing conversation/session services. Research consumes those
services and must not mirror their payloads into local storage.

All persisted JSON is bounded before parsing, validated field by field, capped
by per-session node counts, and ignored safely when malformed. Storage write
failure leaves the current in-memory workspace usable.

## Failure and Edge Cases

- **Unresolved file path:** show an unavailable tag and block send until it is
  removed or re-imported.
- **File moved after selection:** keep the canvas card; when send-time path
  validation reports it unavailable, block that attempt and preserve the
  draft.
- **Right panel cannot open:** keep Research visible, show a non-blocking retry
  affordance, and do not remount a center composer as an untracked fallback.
- **Session changes during a drag:** cancel the pointer operation and load the
  new session's independent canvas state.
- **Prompt failure:** restore the exact draft, images, file tags, and order.
- **Artifact source unavailable:** retain its snapshot title/excerpt and disable
  only the jump-to-message action.
- **Malformed internal drag data:** ignore it and allow unrelated drag consumers
  to continue.
- **Narrow window:** the existing layout may collapse the right panel according
  to its responsive policy; reopening it must still show the pinned
  Conversation page without duplicating the composer.

## Accessibility and Input Safety

- The pinned Conversation tab exposes standard tab semantics and has no close
  control in the accessibility tree.
- Marquee selection has a non-color visual boundary; selected cards expose
  `aria-selected`.
- File tags are keyboard focusable, reorderable through accessible move
  actions, and removable by keyboard.
- Space-pan never inserts a space while canvas focus owns the gesture.
- Composer focus, IME composition, undo/redo, queue/steer shortcuts, and image
  attachment behavior remain unchanged in the right-side presentation.
- Research drag handlers stop propagation only after validating that they own
  the drag.

## Focused Testing and Real-App Verification

Do not run the full project test suite. The implementation must use
test-driven development and add focused coverage for:

- marquee rectangle normalization and node intersection at non-1.0 zoom;
- click, modifier-click, marquee, Escape, and Command-A selection semantics;
- single-node and selected-group movement in world coordinates;
- selection/tag synchronization, deduplication, reorder, removal, persistence,
  success clearing, and failure restoration;
- path validation and unavailable-file submission blocking;
- automatic right-panel opening and pinned leftmost Conversation-tab behavior;
- one-composer-only behavior while switching Chat, Research, and Trajectory;
- shared draft, message, streaming, queue, and error state across both
  conversation presentations;
- unread/running indication while another right-panel tab is active;
- complete-response and excerpt artifact creation, drop placement,
  deduplication, persistence, movement, and source-message navigation;
- Finder and Sherlock internal file drops remaining isolated from global
  composer drop intake;
- patch-package regeneration and installed-package parity.

After focused tests and type/patch checks pass, follow
`docs/sherlock-local-test-runbook.md`: run `./script/build_and_run.sh --verify`,
skip notarization and all publishing, and verify the real Sherlock interface.
The application must remain open for user testing.

The manual pass must confirm:

1. entering Research opens the right-side Conversation tab and removes the
   center composer;
2. the canvas reaches the bottom edge and preserves pan/zoom;
3. Finder and right-side files drop correctly;
4. marquee multi-selection and group dragging work at different zoom levels;
5. selected files appear as reorderable/removable tags in the right composer;
6. send, streaming response, failure restoration, and tab unread state work in
   the right panel;
7. switching to full-width Chat shows the same message and draft state without
   duplication;
8. assistant responses appear on the canvas only after an explicit add or drag;
9. file and artifact positions survive tab/session switching and app restart.

## Non-Goals for This Increment

- automatic graph edges between files, messages, and artifacts;
- automatic spatial layout or collision avoidance;
- automatic insertion of every assistant response onto the canvas;
- arbitrary free-positioning of tags inside the text itself (tags reorder only
  within the attachment row);
- collaborative multi-user canvas editing;
- cloud upload or synchronization of local canvas files;
- replacing the existing Chat or Trajectory views;
- changing the financial research tool policy or building the full structured
  `ResearchContext` workflow in the same implementation increment.
