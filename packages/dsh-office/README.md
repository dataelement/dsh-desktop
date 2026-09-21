# Word and Excel workflows

The normal Desktop profile registers two focused Skills, `dsh-word` and `dsh-excel`, plus the governed tools needed for native Office authoring. The skills cover document/workbook design, rich creation, preservation edits, calculation, inspection, templates and delivery. Their instructions and local design references follow the project's MIT license.

## Implemented routes

| Task | Behavior |
| --- | --- |
| Rich Word creation | `office_build` runs JavaScript with pinned `docx@9.6.1` and native document objects |
| Rich Excel creation | `office_build` runs Python with `openpyxl==3.1.5`: formulas, styles, charts, conditions and worksheets |
| Source reading | Standard `read` handles text/data and Skill reference Markdown; `office_inspect` and `office_word_read` inspect Office packages |
| Word editing | `office_word_read` returns revision-bound paragraph selectors; `office_word_edit` replaces exact text across runs or applies existing paragraph styles and returns semantic changes |
| Excel editing | `office_excel_edit` changes existing typed cells, retains unrelated package parts and invalidates all formula caches |
| Calculation | `office_recalculate` clears old caches, forces LibreOffice calculation, checks formulas/inputs/errors and independent expectations, then merges fresh results into the original package |
| Inspection | `office_inspect` reads DOCX/XLSX structure, cells, formulas and caches |
| Templates | `office_template` loads a reviewed example and its authoring inputs |
| Preview and delivery | Use the built-in Office document preview for final visual review; deliver final DOCX/XLSX/PDF files with the base `present` tool |

Word, Excel and PPT buttons appear above the blank-session input, immediately to the right of the agent preset and workspace. The formats share one serialized, audited session state: selecting Word/Excel closes PPT mode, selecting PPT or a PPT template clears Word/Excel, and clicking the selected format returns to ordinary conversation. The selected mode automatically loads its corresponding Skill at the start of a task. Ordinary conversation can also discover `dsh-word` and `dsh-excel`.

Word and Excel example cards open a read-only preview. The preview footer's “做同款” action persists the reviewed example for the active session. The composer shows only its small, tilted preview image, matching the PPT selection treatment; the remove control appears on hover or keyboard focus. At the next model step the Host injects the exact template id and revision and requires `office_template` before authoring. The example supplies layout, visual language and structure; all content comes from the current task.

The Desktop's `dsh-ppt` Host supplies the `officeModes` service. Both format RPC routes and the model's Skill selection use this persisted state. The browser's change event refreshes display state after successful Host operations. `docs/STATUS.md` records separate automated, native interface and live-model acceptance results.

## Execution and publication

Tools pass through Harness ToolRuntime and session policy. Mutations require workspace-write or danger-full-access; sources and final outputs remain workspace bounded. The Host records start/result/error, task/agent/call identity, script/input/output hashes and confinement evidence.

Author scripts receive a private temporary job containing declared input copies. macOS uses restricted Seatbelt; Linux uses bubblewrap with unshared namespaces and networking. Only required runtime/system/font roots are readable. The job is writable, ambient credentials are omitted, networking is denied, logs are bounded, and execution has a wall timeout. Descendant process groups are terminated on settlement. Missing confinement fails before author code runs. Windows uses the bundled LPAC AppContainer executor with a per-operation identity, explicit runtime read grants, private job writes, registryRead for OS runtime data, and no network capabilities. A kill-on-close Job contains descendants and enforces a wall timeout, 2 GiB memory and 64 processes. Normal cancellation revokes per-operation ACLs and removes the private AppContainer profile. Forced termination can leave inert profile/ACL residue; subsequent jobs receive new identities.

The Host checks a regular output file, package bounds, XML and relationships before publishing under a new name. Original files and conflicting output names are preserved. Word retains unrelated parts byte-for-byte. Excel calculation retains original styles, named ranges, drawings, conditions and formulas while replacing computed caches. Chart cache gaps are reported for preview/open-time refresh.

This is the functional development boundary. Production G3 resource quotas, immutable images and bounded task filesystems remain separate requirements in the root project's docs/ACCEPTANCE.md.

## Runtime setup

Node/docx are in the Desktop dependency closure. Apple Silicon development builds can also embed Python/openpyxl and LibreOffice under Contents/Resources/office-runtime. Engine discovery follows the running application, so moving the app preserves the runtime paths. Python uses -B to preserve the signed app resources. Windows x64 packages embed Python/openpyxl, LibreOffice and `office-sandbox.exe` in `resources/office-runtime`. See [Windows build and acceptance](../../docs/office-acceptance/windows-handoff.md). Operator configuration accepts `node`, `python`, `libreOffice`, `bwrap`, `runtimeRoot`, `windowsSandbox`, and `fontDirectories` (absolute directories). The required `root` is the Host audit/state root configured by the Desktop profile.

Create a dedicated Python environment:

```sh
node packages/dsh-office/scripts/setup-runtime.mjs --root /absolute/office-state-root --python /absolute/python3
```

The installer creates a new root/runtime environment using pinned [requirements](requirements.txt). Existing environments are preserved; select a new root to replace one. Python lookup uses the explicitly configured interpreter, root/runtime/bin/python3, the app's embedded interpreter, then PATH. Virtual-environment interpreter paths retain their identity and packages.

On macOS and Linux, install LibreOffice and configure `libreOffice` when it is outside the normal platform location or PATH. Windows uses the staged runtime and its `program/dsh-office-convert.exe` worker, which calls LibreOfficeKit inside LPAC. Before each Windows operation the host copies the engine's default presets into a private profile and records completed initialization and automatic OOXML recalculation. Conversion uses private profile/font-cache files and explicit font roots, preserving the user's Office settings. Runtime readiness is checked internally by each authoring or recalculation operation.

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

Without engine variables the native test reports skipped. Pure package/edit/policy tests still run. Fixtures exercise Word header/footer/footnote/table preservation, native Excel charts/conditions, five formulas including empty-string and boolean results, independent checks, Chinese document rendering, declared input copies, stale revisions, symlink outputs and actual outside-file/network denial.

Word local edits target ordinary single-line paragraph text and existing styles. Selected fields, revisions and drawings require dedicated editors. Excel local edits target existing cells and scalar formulas; shared/array formulas, new ranges and external data have explicit separate contracts. Stored caches, fresh calculation, visual review and native Office acceptance are distinct results.

Linux runtime, complete external-file fidelity, live-model completion, native Word/Excel/WPS save-reopen and full production sandbox quotas retain separate acceptance gates. Windows CI requires real engine and isolation checks and verifies the moved application package. Manual Windows acceptance is tracked in the handoff document.
