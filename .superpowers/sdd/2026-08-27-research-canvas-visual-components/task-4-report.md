# Task 4 report — persistent canvas geometry and corner resize

## Status

Implemented one normalized geometry model for Research canvas nodes, persisted
the normalized shape, replaced fixed hit rectangles with real node dimensions,
and added four-corner resize behavior to the installed conversation renderer.
No composer, sidebar, version, update-feed, or release code was changed.

## RED

The first focused run was made after adding pure and mounted-renderer tests and
before changing the installed dependency:

```text
Test Files  2 failed (2)
Tests       10 failed | 120 passed (130)
```

The failures were the intended missing behavior: no exported geometry
normalizer or resize helper, viewport rectangles still fixed at 220 x 64,
legacy JSON lacked normalized sizes, and the mounted real `ResearchCanvas`
rendered no handles, preview shield, or live resize operation.

A second narrow RED cycle covered preview wheel ownership. The mounted real
rich preview body bubbled into the canvas wheel listener and produced
`defaultPrevented: true`; after the ownership guard it remained unprevented and
the viewport stayed unchanged.

## Geometry policy

All values are world units. `x` and `y` remain node centers.

| Kind | Default | Minimum | Aspect behavior |
|---|---:|---:|---|
| Generic unsupported file | 220 x 64 | fixed | not resizable; no handles |
| Assistant artifact | 360 x 240 | 240 x 120 | free; 240 is the Task 4 safe auto-height placeholder |
| Image / SVG | 320 x 272 | 160 x 152 | 4:3 content plus 32 title pixels |
| PDF | 320 x 446.117647 | 240 x 342.588235 | 17:22 page content plus 32 title pixels |
| HTML | 480 x 360 | 320 x 240 | free |

The shared title bar is 32 px. The shared maximum is 2400 x 2400. Image and
PDF `aspectRatio` applies only to content height, never to the title bar.
Persisted natural ratios are admitted only when finite and between 0.25 and 8.
Invalid, non-finite, and negative sizes fall back to the kind default; finite
sizes are clamped. Legacy nodes normalize on load and are repaired on the next
workspace persistence write.

Rich-kind detection is centralized: supported `image/*` and known image/SVG
extensions map to image, PDF MIME/extension maps to PDF, HTML/XHTML
MIME/extension maps to HTML, supported assistant artifact kinds map to
assistant, and everything else maps to generic.

## Interaction semantics

- Space-pan is checked first, including pointer-down over a resize handle or an
  interactive preview body.
- A selected rich node renders NW, NE, SW, and SE handles. A generic node never
  renders handles.
- Resize precedes normal card movement and changes only the operated node, even
  when a group is selected.
- Pointer screen deltas are divided by canvas scale. The actual clamped size
  delta shifts the center by half, keeping the opposite corner fixed.
- Assistant and HTML resize freely. Image and PDF resize proportionally using
  their content ratio.
- Live move/resize publishes in-memory geometry without storage writes.
  Pointer-up, pointer-cancel, window blur, and unmount each persist once.
- The title/noninteractive frame remains the move surface; marked rich preview
  bodies own pointer and wheel interaction.
- Rich nodes always contain a real preview shield layer. Space-pan, node move,
  and resize activate it through root interaction state so Task 6 iframes
  cannot steal an active pointer. No generic card or fake iframe was used in
  the rendered tests.
- Existing selection, group move, marquee, Delete, and context deletion paths
  remain exercised by the focused mounted-renderer suite.

## Patch evidence

The installed dependency was regenerated with:

```text
npx patch-package @deepseek-ai/dsh-client-ui-conversation
✔ Created file patches/@deepseek-ai+dsh-client-ui-conversation+0.1.0-rc.7.patch
```

The regenerated full patch still contains the approved shared InputBar
`padding-bottom: 8px` replacement and the previous Research implementation,
plus the new normalizer, resize helper, shared rich frame, handles, shield, and
pointer operation branches. `git apply --check --reverse` succeeds against the
installed tree.

No `.d.ts` file was changed: the package's public declaration index does not
declare the existing Research runtime/testing exports, and Task 4 did not
change a consumed TypeScript contract.

## GREEN and verification

Final evidence is recorded from fresh runs immediately before commit:

- `npm test -- --run test/research-file-drop.test.ts test/sherlock-composer-workspace-ui.test.ts`
- `npm run typecheck`
- `git diff --check`
- `git apply --check --reverse patches/@deepseek-ai+dsh-client-ui-conversation+0.1.0-rc.7.patch`

## Self-review and risks

- Geometry is defined once and both persistence and viewport hit-testing call
  that same normalizer; Task 5/6 should extend preview bodies, not introduce a
  second sizing model.
- Assistant auto height intentionally remains a safe 240-unit placeholder until
  Task 5 installs the specified `ResizeObserver` measurement.
- Image natural ratio and PDF first-page ratio will replace their initial
  ratios in Tasks 5/6. The current admission bounds prevent corrupt persisted
  ratios from producing unusable geometry.
- HTML and PDF bodies are placeholders at this task boundary. The shared frame,
  wheel/pointer ownership marker, and shield are production renderer behavior
  ready for their real preview consumers.
- No full test suite or local packaged-app run was performed because this task's
  brief requires only the two focused files, typecheck, patch validation, and
  diff checks; final real-app QA belongs to Task 7.
