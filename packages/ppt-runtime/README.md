# Maintained DSH PPT runtime

Product packages: **`dsh-ppt`** (authoring/export) and **`dsh-ppt-composer`** (PPT button/template chooser). Their pinned distributions live in `../ppt-bundles/`.

This directory maintains the distributed JavaScript extracted at Desktop base `9d4502f`; the complete original TypeScript source was not present. Original copyright notices and factual Kimi Slides research attribution remain in `THIRD_PARTY_NOTICES.md`. Renaming does not change provenance or establish legal clearance.

## 参考来源

实现方案参考了 **Kimi PPT（Kimi Slides）** 的 PPTD 文档与示例；其中十套模板参考并按 MIT 许可改编自 **Zara Zhang（GitHub：zarazhangrui）** 的 `beautiful-html-templates`。具体参考范围、固定版本和许可证见 [来源说明](core/THIRD_PARTY_NOTICES.md)。

## Catalog and languages

**16 templates, 192 layouts**, each with English (`source/`) and Chinese (`source-zh/`) examples. All 192 gallery/reference previews are rendered from English source. Preview language does not select the user's output language.

- Three retained native packs: Modular Logistics System, Swiss Signal Grid, Nordic Operating Report, expanded from 10 to 12 pages each.
- Engineering Blueprint, Course Workshop, Editorial Notebook: 12 pages each. The first two adapt pinned Apache-2.0 HTML Anything directions; Editorial Notebook is DSH-authored.
- Ten MIT adaptations of Zara Zhang's `beautiful-html-templates@e5e204fb1f3b06290846e7dcd7aceddabeceec8c`: Soft Editorial, Editorial Forest, Signal, Blue Professional, Broadside, Monochrome, Neo-Grid Bold, Sakura Chroma, Playful, Cartesian. All ten now have 12 layouts each, including DSH-authored composition extensions. Office font substitutions are documented per template. This is a selected native adaptation, not a full import of every HTML slide or animation.

Every metadata/design record contains English and Chinese title/body fonts and platform fallbacks. Font names do not distribute or embed fonts. The renderer selects the Latin face for English text and the platform Chinese face for Chinese text, including tables. Chinese serif headings use Songti SC / SimSun / Noto Serif CJK SC; sans uses PingFang SC / Microsoft YaHei / Noto Sans CJK SC. Actual font availability can still affect Office fallback. The preview renderer preserves English word boundaries.

## Build and install

`npm run ppt:build` regenerates the ten Zara packs, restores the six maintained baseline packs from `scripts/ppt/base-templates/`, applies reviewed English translations, and expands all sixteen packs to twelve layouts each. It validates and renders the 192 English previews and builds both archives. `artifacts.json` records their hashes. The baseline inputs are separate from generated `source/` and `source-zh/`, so consecutive builds do not translate enriched output again. Every pack retains explicit English/Chinese font pairs. The two original experiments live in `scripts/ppt/rich-layouts.mjs`; the other composition plans and editable geometry live in `scripts/ppt/composition-library.mjs`.

After rebuilding, refresh both dependency integrity entries in `package-lock.json`, then use `npm ci` and the normal postinstall flow. Tests verify the exact archives, language coverage, fonts, activation and state migration. The 23 withdrawn designs and 345 excluded images remain absent; `excluded-assets.json` is a hash-only regression list.

## Compatibility

The built-in profile loads one `dsh-ppt-composer` plugin. The Skill, new automatic context records, client registration and primary RPC use DSH names. Historical attribution is kept in notices and an entry-point comment.

The legacy on-disk `kimi-ppt` directory is deliberately retained to preserve sessions, revisions and output files. `/kimi-ppt` remains an alias for in-flight older clients; legacy Skill-root config/env values and old automatic snapshots are handled explicitly. The three retained template IDs migrate to DSH IDs without losing selection; removed IDs fall back visibly. User-authored messages and historical generated decks are preserved.

PPT remains preinstalled. Its automatic instructions are scoped to sessions where the user enabled the PPT button.

Validation evidence and temporary exports live under ignored `doc/ppt-remediation/`. Windows packaging and native Windows PowerPoint require their own runner/device validation.

### Layout refinement

The content layouts now include evidence panels, reconciled contributions, direct chart annotations, exception rows and accountable roadmaps. Shared authoring guidance lives in `scripts/ppt/refinement-guidance.mjs` and the bundled `references/composition.md`. English and Chinese pages retain separate line wrapping and font fallbacks.

Historical withdrawn Kimi-associated reference images were inspected locally to identify general information-design principles. This iteration does not restore those images, their guides, or source files to the distributed packs. The new compositions and wording are authored in the maintained generators; current palette/font provenance remains unchanged.

### Shared preview assets

The build keeps the 192 reference JPGs only in the core skill directory. Both browser clients receive a small manifest of `/dsh-ppt/previews/<sha256>.jpg` URLs instead of Base64 image copies. The core optionally registers an HTTP route using the existing host web server, serving only build-listed reference images with immutable caching. No user files or configurable skill directories are exposed. Model reference reads, bilingual sources and editable exports continue using the existing core files; no remote download is required. Rebuilds change image URLs when the bytes change.

### Validation feedback

`pptd_check` is read-only and returns every diagnostic, including file, page and element ID. `pptd_render` returns `status: needs_revision` with the full `check` when blocked by validation, without publishing or consuming delivery capacity; only `status: exported` includes delivery metadata. Warning-only checks remain exportable. Filesystem, authorization and runtime faults still fail normally. Existing sessions refresh their automatic authoring instructions to this workflow.

The CLI resolves npm `.bin` symlinks before detecting its entry point. `check --json` retains its complete checker output and conventional nonzero exit code for failed validation; blocked `render --json` also prints complete diagnostics and `exported: false`. Neither bypasses the compiler checks.

Authoring diagnostics group misplaced text-style fields by page while retaining per-field issues. Layout estimates wait until an element has a valid field structure. Tool diagnostics include confined absolute paths and `pptd_read_file` arguments. New files accept an omitted or empty `expected_sha256`; replacements still require the current hash. The bundled CLI and tool compiler apply the same structural checks.

### Text escape semantics

Multiline text uses actual line breaks, with YAML `|-` as the shared authoring form. The CLI and host use `lib/text-escapes.js` to report `text-escaped-newline` for literal `\n` or `\r` in text elements and table cells before export. An explicit boolean `literalEscapes: true` preserves intentionally displayed code, escape notation or paths; imported PPTX text carries this declaration when the original already displays those characters. The declaration leaves layout checks active. V4 automatic Skill snapshots explain the correction loop and replace older V2/V3 snapshots in active PPT sessions.
