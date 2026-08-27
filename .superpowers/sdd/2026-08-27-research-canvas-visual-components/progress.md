# SDD ledger — plan: docs/superpowers/plans/2026-08-27-research-canvas-visual-components.md

## Baseline

- Workspace: linked worktree `/Users/heyafeng/Documents/ChatGPT/dsh/.worktrees/research-canvas-file-drop`
- Branch: `codex/research-canvas-file-drop`
- Baseline: 3 focused files, 151 tests passed, 0 failed.
- Spec: `docs/superpowers/specs/2026-08-27-research-canvas-visual-components-design.md`

## Pre-flight interface scan

| Tasks | Producer / consumer interface | Finding |
|---|---|---|
| 1 -> 4/5/6 | Shared InputBar CSS and conversation dependency patch | Clean: later tasks must regenerate rather than replace the patch. |
| 2 -> 3/6 | Trusted main-frame predicate, preload main-frame gate, frame navigation policy | Clean: preview and HTML depend on these guards. |
| 3 -> 5/6 | Preview admission descriptor, capability URL, revoke lifecycle | Clean: renderer nodes consume descriptors but never raw arbitrary paths. |
| 3 -> 7 | Main-owned authorization persistence and packaged protocol registration | Clean: final restart/package QA must exercise this boundary. |
| 4 -> 5/6 | Normalized node size, shared frame, resize actions, viewport geometry | Clean: rich content extends the frame rather than adding independent geometry. |
| 5 -> 6 | Visibility lifecycle and preview-body event ownership | Clean: PDF/HTML reuse image/message lifecycle hooks. |
| 6 -> 7 | PDF.js worker/dependency packaging and HTML sandbox | Clean: final package QA is the consumer. |

## Per-task consistency scan

| Task | Tests vs implementation | Files vs outputs | Finding |
|---|---|---|---|
| 1 | Exact 8 px behavior plus horizontal non-regression | Conversation runtime, test, durable patch | Clean. |
| 2 | Child-frame denial and privileged IPC behavior | Preload/main security files and focused tests | Clean. |
| 3 | Real service boundaries, ranges, traversal and revocation | New main service plus main/preload wiring | Clean. |
| 4 | Pure geometry plus rendered pointer behavior | Workspace runtime, declarations, durable patch | Clean. |
| 5 | Full text/auto height plus image ratio/lifecycle | Shared frame consumers and durable patch | Clean. |
| 6 | PDF wheel/render lifecycle and HTML sandbox | Dependency, runtime, protocol and durable patch | Clean. |
| 7 | Spec checklist plus packaged UI interaction | QA record and only focused fixes if necessary | Clean. |

## Rulings

- Ruling: The main-owned preview registry persists an opaque authorization id,
  source kind, real authorized path/root, session identity, and node identity;
  renderer canvas JSON may reference only the opaque authorization id — this
  preserves restart recovery without trusting a renderer-written path. Cost if
  wrong: preview recovery could require reauthorization or expose local files.
- Ruling: HTML scripts remain disabled until Task 2's child-frame bridge and IPC
  tests are green; only then may Task 6 add `allow-scripts` under opaque origin
  and network-blocking CSP. Cost if wrong: dynamic local HTML is static rather
  than interactive, but application privileges remain protected.
- Ruling: Every dependency-bundle task regenerates the full conversation patch
  from the current installed tree and validates reverse application. Cost if
  wrong: a later regeneration could silently drop an earlier task's ignored
  node_modules edit.
- Ruling: Task 3 keeps the existing `getPathForFile(File)` bridge only as a
  temporary compatibility path for the current Finder drop/message attachment
  runtime; the new preview capability never consumes or returns that raw path,
  and Task 5 must migrate the rich-node consumer before removing or narrowing
  the legacy method. Cost if wrong: removing it now would regress existing drops,
  while leaving it after migration would retain an unnecessary path surface.
- Ruling: Task 4 uses one geometry policy for later rich consumers: unsupported
  generic files stay compact at 220 x 64 with no resize handles; assistant,
  image, PDF, and HTML nodes use the spec defaults (360-wide auto assistant,
  320-wide image, page-ratio PDF, and 480 x 360 HTML), a 32 px title bar,
  type-specific minimums, and a shared 2400 x 2400 world-unit ceiling. Image
  and PDF content ratio excludes the title bar. Cost if wrong: later preview
  tasks may need a narrowly tested constant adjustment, but they will not gain
  a second geometry model.
- Ruling: Preview lifecycle distinguishes permanent revocation from transient
  release. Deleting a canvas node revokes its durable authorization; scrolling
  it offscreen, switching sessions, or unmounting releases only the exact
  ephemeral capability token so restart/session restoration remains possible.
  Cost if wrong: treating unmount as durable revocation would make persisted
  image/PDF/HTML nodes permanently unavailable after ordinary navigation.
- Ruling: A right-sidebar file may receive a rich preview only from a drag
  payload containing the active session id plus a cwd-relative path generated
  by the Better Sidebar FileTree; its existing absolute path remains only for
  the legacy message-attachment flow and is never used as preview authority.
  Tool-result chips without that identity remain generic. Cost if wrong: using
  the renderer absolute path would reopen arbitrary-path and symlink escape.
- Task 1: fix round 1 ruling: the review correctly found that the pre-task
  durable patch was stale relative to already approved installed-tree Research
  work. Split that catch-up into an explicit prerequisite commit, then keep the
  Task 1 range limited to vertical composer behavior. Rewriting the unpushed
  implementer's latest commit with `git reset --soft` is permitted because it
  preserves every working-tree byte; `--hard` is forbidden. Cost if wrong: the
  patch split could omit an earlier Research feature or leave Task 1 mixed with
  unrelated horizontal rules.

## Task progress

- Task 1: fix round 1/5 (2 addressed, 1 open — dependency InputBar DOM still
  reconstructed by the test-owned slot mock; commits a3f49dc7..fafbb274).
- Task 1: fix round 2/5 (1 addressed, 0 open — real installed InputBar mounted;
  commit f4750cf2).
- Task 1: reopened after Task 2 type gate (7 TypeScript errors in the new real
  InputBar regression; runtime tests remain green).
- Task 1: fix round 3/5 (7 type errors addressed, 0 open; commit 636b0257).
- Task 1: complete (commits a3f49dc7..636b0257, review clean).
- Task 2: review found 1 critical and 2 important issues — child-initiated
  top-frame navigation is not distinguished from main-frame initiation, and
  several privileged IPC checks are source inspections rather than invoked
  behavior tests. Fix round 1 required.
- Task 2: fix round 1/5 (2 addressed, 2 open — null initiator must fail closed;
  production handler wiring still lacks behavior invocation; one directly
  affected composer test keeps a stale source assertion; commit 02f21dca).
- Task 2: fix round 2/5 (3 addressed, 0 open — null initiators fail closed,
  production privileged handlers are behavior-tested, and the stale source
  assertion was removed; commit 21976958).
- Task 2: complete (commits 95441af7..21976958, review clean).
- Task 3: review found 2 important issues — revoke mutations are not
  transactional when durable storage fails, and the custom protocol lacks the
  exact-origin CORS response contract required by PDF.js. Fix round 1 required.
- Task 3: fix round 1/5 (1 addressed, 1 open — untrusted or missing main
  windows still allow no-Origin protocol reads; commit a31b7320).
- Task 3: fix round 2/5 (1 addressed, 0 open — no trusted Harness window now
  denies no-Origin reads before filesystem access; commit 8c58a84d).
- Task 3: complete (commits 6806e63d..8c58a84d, review clean).
- Task 4: review found 2 important issues — aspect-locked geometry ignores the
  declared minimum height for extreme ratios, and re-adding a deduplicated
  assistant artifact discards its manually persisted size. Fix round 1 required.
- Task 4: fix round 1/5 (2 addressed, 0 open — aspect-locked nodes now honor
  both declared minimum dimensions, and deduplicated artifacts retain manual
  geometry; commit 5be76dbe).
- Task 4: complete (commits 1a3e2d01..5be76dbe, review clean; one non-blocking
  CSS constant-duplication minor remains intentionally unchanged).
- Task 5: implementation complete, review pending — full assistant Markdown,
  auto/manual height, capability image lifecycle, Finder/sidebar secure
  admission, exact ephemeral release, and durable deletion revoke are focused
  green (4 files, 174 tests); typecheck and patch durability gates pass.
- Task 5: dual review found 6 confirmed important issues — registry/drop concurrency and
  capacity can orphan durable authorizations, same-path legacy drops can
  downgrade rich nodes, failed deletion revocation lacks recovery, image errors
  retain a live token, and research-file clipboard tags are not session-bound.
  The reported global Markdown CSS change was disproved by commit history and
  an existing 0.6.0 regression test. Fix round 1 required.
- Task 5: fix round 1/5 (6 addressed, 0 open — concurrent admission/drop
  serialization, capacity orphan revocation, authorized same-path preservation,
  failure-safe durable deletion retry, idempotent image-error release, and
  active-session clipboard authority are behavior-tested; commit
  `修复研究预览授权与拖入生命周期`).
- Task 5: fix-round re-review found 3 important issues — revocation can race an
  in-flight admission and be undone, a lost successful revoke response is not
  idempotently recoverable, and orphan cleanup failures have no durable retry
  state. Fix round 2 required.
- Task 5: fix round 2/5 (3 addressed, 0 open — node/session revocation
  generations prevent in-flight admission resurrection, already-absent durable
  revocation is idempotent, and a bounded persistent orphan outbox retries on
  canvas remount without resurrecting visible nodes; commit
  `修复研究预览撤销竞态与重试`).
- Task 5: fix-round 2 re-review found 3 important issues — the orphan outbox
  prefix is rejected by production durable storage, its parser is quadratic and
  does not stop at capacity, and revocation generation maps grow for absent
  identities. Fix round 3 required.
- Task 5: fix round 3/5 (3 addressed, 0 open — production IPC storage restores
  the outbox after restart and propagates rejected writes, parsing is linear and
  stops at 256, and only in-flight admissions retain bounded revocation markers;
  commit `修复研究预览持久存储与资源上限`).
