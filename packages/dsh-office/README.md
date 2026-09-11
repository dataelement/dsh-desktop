# Word and Excel workflows

The normal Desktop profile registers 188 discoverable Skills (two foundation Skills and 186 business Skills) and seventeen governed tools. The Word and Excel skills are authored for DSH Desktop's product requirements and executable tool contracts: document/workbook design, creation, preservation edits, calculation, inspection and preview. Their instructions and local design references follow the project's MIT license. See [authorship and dependency scope](../../docs/office-skill-authorship-2026-09-10.md).

## Implemented routes

| Task | Behavior |
| --- | --- |
| Rich Word creation | `office_build` runs JavaScript with pinned `docx@9.6.1` and native document objects |
| Rich Excel creation | `office_build` runs Python with `openpyxl==3.1.5`: formulas, styles, charts, conditions and worksheets |
| Sources | `office_source` returns file hashes and bounded text; builds receive declared input copies with checked revisions |
| Word editing | `office_word_read` returns revision-bound paragraph selectors; `office_word_edit` replaces exact text across runs or applies existing paragraph styles and returns semantic changes |
| Excel editing | `office_excel_edit` changes existing typed cells, retains unrelated package parts and invalidates all formula caches |
| Calculation | `office_recalculate` clears old caches, forces LibreOffice calculation, checks formulas/inputs/errors and independent expectations, then merges fresh results into the original package |
| Preview | `office_preview` renders PDF using a job-local LibreOffice profile and explicit system-font configuration |
| Discovery | `office_reference` loads the relevant task reference; `office_runtime` reports runtime readiness and probes isolation |
| Simple projects | The original five JSON project/check/export/inspect tools remain available; see [FORMAT.md](FORMAT.md) and [examples](examples) |

Word, Excel and PPT buttons appear above the blank-session input, immediately to the right of the agent preset and workspace. The formats share one serialized, audited session state: selecting Word/Excel closes PPT mode, selecting PPT or a PPT template clears Word/Excel, and clicking the selected format returns to ordinary conversation. The selected mode automatically loads its corresponding Skill at the start of a task. Ordinary conversation can also discover `dsh-word` and `dsh-excel`.

The Desktop's `dsh-ppt` Host supplies the `officeModes` service. Both format RPC routes and the model's Skill selection use this persisted state. The browser's change event refreshes display state after successful Host operations. `docs/STATUS.md` records separate automated, native interface and live-model acceptance results.

## Execution and publication

Tools pass through Harness ToolRuntime and session policy. Mutations require workspace-write or danger-full-access; sources and final outputs remain workspace bounded. The Host records start/result/error, task/agent/call identity, script/input/output hashes and confinement evidence.

Author scripts receive a private temporary job containing declared input copies. macOS uses restricted Seatbelt; Linux uses bubblewrap with unshared namespaces and networking. Only required runtime/system/font roots are readable. The job is writable, ambient credentials are omitted, networking is denied, logs are bounded, and execution has a wall timeout. Descendant process groups are terminated on settlement. Missing confinement fails before author code runs. Windows script execution currently reports OFFICE_SANDBOX_UNAVAILABLE.

The Host checks a regular output file, package bounds, XML and relationships before publishing under a new name. Original files and conflicting output names are preserved. Word retains unrelated parts byte-for-byte. Excel calculation retains original styles, named ranges, drawings, conditions and formulas while replacing computed caches. Chart cache gaps are reported for preview/open-time refresh.

This is the functional development boundary. Production G3 resource quotas, immutable images and bounded task filesystems remain separate requirements in the root project's docs/ACCEPTANCE.md.

## Runtime setup

Node/docx are in the Desktop dependency closure. Apple Silicon development builds can also embed Python/openpyxl and LibreOffice under Contents/Resources/office-runtime. Engine discovery follows the running application, so moving the app preserves the runtime paths. Python uses -B to preserve the signed app resources. Operator configuration accepts `node`, `python`, `libreOffice`, `bwrap`, and `fontDirectories` (absolute directories). The required `root` is the Host audit/state root configured by the Desktop profile.

Create a dedicated Python environment:

```sh
node packages/dsh-office/scripts/setup-runtime.mjs --root /absolute/office-state-root --python /absolute/python3
```

The installer creates a new root/runtime environment using pinned [requirements](requirements.txt). Existing environments are preserved; select a new root to replace one. Python lookup uses the explicitly configured interpreter, root/runtime/bin/python3, the app's embedded interpreter, then PATH. Virtual-environment interpreter paths retain their identity and packages.

Install LibreOffice and configure `libreOffice` when it is outside the normal platform location or PATH. Preview uses private profile/font-cache files and explicit font roots, preserving the user's Office settings. Use office_runtime to inspect readiness.

To create a self-contained local Apple Silicon test package from supplied runtimes:

```sh
node scripts/stage-office-runtime.mjs --python-root /absolute/relocatable-python --libreoffice-app /absolute/LibreOffice.app --output /absolute/new-office-runtime
DSH_OFFICE_BUNDLE_ROOT=/absolute/new-office-runtime npm run package:dev:mac:arm64
node scripts/verify-office-package.mjs --app '/absolute/DSH Desktop Dev.app' --output /absolute/new-verification-directory
```

The staging recipe checks architecture, pins openpyxl/et_xmlfile, retains their license metadata, copies only the selected Python packages, preserves LibreOffice's notices, rejects links outside the bundle and probes Python relocation. Inputs are explicit local operator paths. The package verifier exercises the packaged plugin and engines under a test workspace policy; Desktop model execution and native Office save-reopen retain separate acceptance gates.

## Verification and limits

[STATUS.md](../../docs/STATUS.md) records current evidence. Set DSH_OFFICE_TEST_PYTHON, DSH_OFFICE_TEST_LIBREOFFICE and DSH_OFFICE_TEST_OUTPUT to absolute runtime/output paths, then run:

```sh
node_modules/node/bin/node node_modules/vitest/vitest.mjs run test/office-native-runtime.test.mjs
```

Without engine variables the native test reports skipped. Pure package/edit/policy tests still run. Fixtures exercise Word header/footer/footnote/table preservation, native Excel charts/conditions, five formulas including empty-string and boolean results, independent checks, Chinese previews, declared input copies, stale revisions, symlink outputs and actual outside-file/network denial.

Word local edits target ordinary single-line paragraph text and existing styles. Selected fields, revisions and drawings require dedicated editors. Excel local edits target existing cells and scalar formulas; shared/array formulas, new ranges and external data have explicit separate contracts. Stored caches, fresh calculation, visual review and native Office acceptance are distinct results.

Linux runtime, Windows script confinement, complete external-file fidelity, live-model completion, native Word/Excel/WPS save-reopen and Desktop release packaging require their own target-environment evidence. This branch establishes the documented macOS development routes.
