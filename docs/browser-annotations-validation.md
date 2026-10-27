# Browser annotation validation on current Desktop

Date: 2026-10-26 (macOS local date). Desktop 0.12.1, Harness 0.2.1-rc.2, Electron 43, Apple Silicon. Testing uses an independent development profile, a local HTML fixture and a deterministic local model endpoint. Production profiles, real provider credentials and real conversations are not used.

## Decisions and fixes

- The normal generation installer rejected the original private Puppeteer dependency graph: a subpath-only package did not resolve at its root and a dependency named `buffer` resolved as a Node builtin. The backend now bundles its private graph into `lib/index.cjs`. React remains host-owned. The generated archive includes third-party licenses and has no runtime dependencies. The archive smoke test imports it outside the checkout and launches real Chrome through the host route.
- The current native chat renderer did not display the earlier annotation footer projection. Sent messages now retain a readable native summary and an independent annotation review chip. Screenshot review delegates to the host's authorized user-content factory and image loader, rather than the removed `renderMessageImages` prop. Durable/model contents remain unchanged.
- Current file intake inserts native reference chips. The plugin now calls the session's public input-trigger owner codec for those references; it preserves the original editor snapshot for retirement and fails before admission if a reference is invalid or its owner fails. Claimed commands retain the native input flow.
- An explicit negative admission permits rebuilding a packet after the user repairs an attachment. A transport failure retains the exact request identity because admission may already have happened. An acknowledgement failure after admission cannot send the same message again.
- Successful combined-send testing exposed a reversed attachment-retirement contract: the host prune operation accepts the IDs to keep. Version 0.4.2 removes only submitted IDs and keeps attachments added while sending. Regression tests model the native keep-only behavior and protect concurrent draft edits.
- The plugin does not override Cmd/Ctrl+Shift+B, which current Desktop already assigns to the right sidebar. Browser entry stays in the native new-tab chooser.
- Build paths use file-URL conversion for Windows compatibility. Browser-process tests run sequentially to avoid competing launches. The distribution smoke test requires no registry/network install because all private runtime code is in the archive.

## Observed desktop interaction

These are actual Electron interactions, not screenshots of a separate prototype or source-string checks.

| Case | Observed result |
| --- | --- |
| Normal profile generation loading | Bundled plugin passed the generation closure check and loaded in a normal Desktop launch. The native generation backend installed successive archives through 0.4.2. The final running generation was checked against the built client bytes and exercised after restart. |
| Sidebar entry and generic new tab | The native right-sidebar chooser offers Browser, workspace files and Terminal. Clicking + opens that chooser. |
| Native browser tabs | Opened two independent local pages, switched/closed the second tab and retained the first page. There is one native tab row. |
| Element annotation | Selecting the paragraph produced an input bubble beside its outline; Enter saved the comment and screenshot. |
| Region annotation | Dragging a region produced a `region` capture containing the matching page content and saved it to the composer. |
| Hold Space | With pointer intent on the page, held Space while clicking the counter: it changed from 0 to 1 without adding a note. After release, clicking the heading opened the annotation editor again. |
| Composer review | The annotation chip opened a floating popover with the correct selection screenshot and comment, without expanding a review pane. |
| Annotation-only send | A single Send action admitted the packet. The local model transport received actual image blocks, comment, selector `#copy`, DOM/style evidence, rectangle and viewport. There was no mandatory review/confirmation step. |
| Sent-message review | After the renderer fix and restart, the transcript showed a readable comment summary. The sent annotation chip opened a popover with its authorized screenshot and collapsed element details. |
| Combined send and retirement | On 0.4.2, submitted a plain draft, native file reference, ordinary JPEG and saved annotation in one Enter action. The local model received both new images and the serialized file reference. On completion the draft, annotation and submitted image rail cleared, and native Send became disabled. Concurrent new attachment preservation is covered by the regression tests. |
| Running queue | Held a real model response, saved a note during the run and sent through the accessory. Native Stop stayed available. The queue admitted one note, then produced exactly one next turn after the held run completed. |
| Native Stop | Stopped a held run with the native primary button. The transcript reported Stopped and no annotation submit displaced it. |
| Theme and width | Inspected dark theme at a 1040 × 780 window, including the anchored editor, toolbar and screenshot review. Light theme was exercised in earlier interactions. |
| Locale | Chinese UI was exercised first. Set the isolated profile locale to English and restarted; browser navigation, annotation controls and review popovers displayed English. The native language picker did not expand during the UI attempt, so that picker itself is not claimed as verified. |
| Disable and re-enable | Used the native plugin manager toggle without restart. Disable removed Browser from the chooser and the annotation projections; a normal native message still completed. Re-enable restored one Browser entry, the prior page and readable history. A new note saved once and sent once after reloading. When disabled, durable annotation payloads remain visible through the native fallback renderer. |
| Failed input preservation | A mislabelled screenshot fixture was rejected by DSH's MIME validation; text, reference, image and saved annotation remained available. The explicit-rejection retry fix is additionally covered by tests. |

The local model endpoint verifies transport contents and admission/queue mechanics; it does not prove a commercial model's visual reasoning quality.

## Automated validation and limits

- Plugin regression: the final run passed all 82 tests, including real Chrome reconnection/lifecycle, archive runtime, reference serialization, readable message projection, admission retry identity, stale locks and installation cleanup. The 0.4.2 run includes standalone archive launch and license verification, completed in 43.5 seconds, with zero skipped/cancelled tests.
- Clean root `npm ci`/postinstall patch replay, typecheck and Desktop build passed before desktop testing. Final typecheck and Electron bundling passed after the fixes. The repeated full `npm run build` timed out in Office template verification; it is not reported as a final all-green Desktop build. The unchanged, previously verified template cache was restored for the isolated development launch. The only host-patch addition remains the native primary-button `send`/`stop` marker.
- The full root suite was executed without skipping tests: 2203 passed and one DOCX fidelity test exceeded its 60-second deadline in the two-worker run. That test had passed alone in 26.8 seconds earlier; a later isolated rerun again timed out at 60 seconds. Concurrent unrelated integration workloads were observed, but this does not by itself prove each timeout is benign. A serial full run passed 2195 and timed out in nine tests across four Office suites. A diagnostic run outside iCloud reproduced broader integration/hook timeouts and was stopped after that repeated result; it is not counted as a completed full run. These runs are not reported as an all-green full regression; no Office assertion/deadline was weakened to obtain a pass.
- After unlock, `npm test -- --maxWorkers=2` stopped in its Office template pretest. Restoring the unchanged earlier template cache allowed a direct, complete `npx vitest run --maxWorkers=2`: **216/219 files passed; 2186/2204 tests passed, 18 failed**, in 957.2 seconds. Failures were confined to `office-runtime.test.mjs` (3), `ppt-import-memory.test.mjs` (4), and `ppt-personal-templates.test.mjs` (11): timeouts plus runtime-ready and import-progress assertions. This direct runner result does not turn the failed npm pretest into a pass. Those Office sources/tests are unchanged by this contribution; a matching upstream baseline has not been established, so the failures are not certified as pre-existing. The run completed without skips or cancelled tests.
- Cross-platform CI is defined for the optional package. No remote check result was reported on the PR at the last inspection; Windows/Linux desktop behavior is not locally verified.

The unlocked desktop checks above complete the macOS interaction pass for version 0.4.2. The optional plugin is ready for review with the root Office regression/build failures disclosed; this is not an all-green repository or cross-platform release certification.

Document-preview annotation UI for PDF/Word/Markdown is outside this PR because current main does not expose the incoming prototype's legacy preview contract. No file-preview or side-chat/session-mail delivery is claimed here.
