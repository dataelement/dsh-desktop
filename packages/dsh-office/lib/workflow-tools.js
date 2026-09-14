import path from 'node:path'
import { readFile, writeFile } from 'node:fs/promises'
import { sha256, boundedRead, workspacePath, atomicWrite } from './workspace.js'
import { LIMITS } from './zip.js'
import { inspectOffice } from './inspect.js'
import { editCells, editWord, readWord } from './edit.js'
import { assertEngineInput, recalculate } from './recalculate.js'
import { authorScript, convertWithLibreOffice, resolveRuntime, runIsolated, withJob } from './runtime.js'

const file = { type: 'string', required: true, description: 'Workspace-relative source file.' }
const revision = { type: 'string', required: true, description: 'Exact SHA-256 returned by the latest source inspection.' }
const output = { type: 'string', required: true, description: 'New workspace-relative output filename. Existing files are preserved.' }
export const REFERENCES = {
  'word-design': '../skills/dsh-word/references/design.md',
  'word-create': '../skills/dsh-word/references/create.md',
  'word-edit': '../skills/dsh-word/references/edit.md',
  'excel-design': '../skills/dsh-excel/references/design.md',
  'excel-dashboard': '../skills/dsh-excel/references/dashboard.md',
  'excel-create': '../skills/dsh-excel/references/create.md',
  'excel-edit-calculate': '../skills/dsh-excel/references/edit-calculate.md',
  'simple-project-format': '../FORMAT.md'
}

export function registerWorkflowTools(register, config) {
  const read = async (root, args, extension) => {
    if (extension && path.extname(args.file_path).toLowerCase() !== extension) throw new Error(`Select a ${extension} file`)
    const bytes = await boundedRead(await workspacePath(root, args.file_path), LIMITS.archiveBytes)
    if (args.expected_revision !== undefined && sha256(bytes) !== args.expected_revision) throw new Error('Revision conflict: inspect the current source before editing')
    return bytes
  }
  const publish = async (root, exec, relative, bytes, extension) => {
    if (path.extname(relative).toLowerCase() !== extension) throw new Error(`Output must end in ${extension}`)
    const target = await workspacePath(root, relative, true)
    exec.signal.throwIfAborted(); await atomicWrite(target, bytes)
    return { path: relative, sha256: sha256(bytes) }
  }
  register('office_source', 'Inspect an explicitly selected input file before declaring it for office_build. Returns its SHA-256 and bounded text for CSV/TSV/TXT/JSON; DOCX/XLSX reading uses office_inspect and Word selectors use office_word_read.', { file_path: file }, false, async (args, _exec, root) => {
    const bytes = await read(root, args), extension = path.extname(args.file_path).toLowerCase()
    const isText = ['.csv', '.tsv', '.txt', '.json'].includes(extension)
    if (!isText && !['.docx', '.xlsx', '.png', '.jpg', '.jpeg'].includes(extension)) throw new Error('Select an Office, text/data, PNG or JPEG input')
    const text = isText ? bytes.toString('utf8') : undefined
    return { status: 'read', path: args.file_path, sha256: sha256(bytes), sizeBytes: bytes.length, ...(isText ? { text: text.slice(0, 64000), textTruncated: text.length > 64000 } : {}) }
  })
  register('office_reference', 'Read task-specific Word/Excel authoring examples and tool contracts. Load the relevant reference after selecting a workflow.', {
    topic: { type: 'string', required: true, enum: Object.keys(REFERENCES) }
  }, false, async args => {
    if (!Object.hasOwn(REFERENCES, args.topic)) throw new Error('Choose a listed Office reference topic')
    return { status: 'read', topic: args.topic, content: await readFile(new URL(REFERENCES[args.topic], import.meta.url), 'utf8') }
  })
  register('office_runtime', 'Check available Word/Excel authoring runtimes, pinned openpyxl, calculation engine and isolated execution. Reports setup gaps explicitly.', {}, false, async (_args, exec) => {
    const runtime = await resolveRuntime(config, exec.signal)
    let execution = 'BLOCKED', reason
    try {
      await withJob(job => runIsolated([runtime.node, '-e', 'process.stdout.write("ready")'], { job, readRoots: runtime.nodeReadRoots ?? [], bwrap: runtime.bwrap, signal: exec.signal, env: { ELECTRON_RUN_AS_NODE: '1' }, timeoutMs: 10000 }))
      execution = 'PASS'
    } catch (error) { reason = error.message }
    return { status: execution === 'PASS' ? runtime.openpyxl && runtime.libreOffice ? 'ready' : 'partial' : 'blocked', isolation: execution, isolationDetail: reason ?? null, backend: runtime.sandbox,
      word: runtime.docx ? 'docx@9.6.1' : runtime.nodeError,
      excel: runtime.openpyxl ? `openpyxl@${runtime.openpyxl}` : runtime.pythonError,
      calculation: runtime.libreOffice ? 'LibreOffice installed; execution checked per operation' : 'BLOCKED: configure LibreOffice', nativeAcceptance: 'NOT_RUN' }
  })
  register('office_build', 'Generate a rich native DOCX/XLSX using a JavaScript docx or Python openpyxl script in a filesystem and network isolated job. Read office_reference first. Only declared input copies are readable; publish a validated new file.', {
    language: { type: 'string', required: true, enum: ['javascript', 'python'] },
    source: { type: 'string', required: true, description: 'Up to 128 KiB. JavaScript receives docx and office variables. Python receives office dict. Save the primary artifact to office.output / office["output"].' },
    inputs: { type: 'array', items: { type: 'object', properties: { file_path: file, expected_revision: revision }, additionalProperties: false }, description: 'At most 8 explicitly selected workspace files. office.inputs / office["inputs"] contains their staged absolute paths in this order.' },
    output_file: output
  }, true, async (args, exec, root) => {
    if (!['javascript', 'python'].includes(args.language) || typeof args.source !== 'string' || !args.source.trim() || Buffer.byteLength(args.source) > 128 * 1024) throw new Error('Select JavaScript/Python and supply a script up to 128 KiB')
    if (!Array.isArray(args.inputs ?? []) || (args.inputs?.length ?? 0) > 8) throw new Error('Use at most 8 input files')
    const extension = args.language === 'javascript' ? '.docx' : '.xlsx'
    if (path.extname(args.output_file).toLowerCase() !== extension) throw new Error(`Output must end in ${extension}`)
    // Validate target and source revisions before starting expensive authoring.
    await workspacePath(root, args.output_file, true)
    return withJob(async job => {
      const inputs = [], revisions = []; let total = 0
      for (const [index, input] of (args.inputs ?? []).entries()) {
        const bytes = await read(root, input)
        total += bytes.length
        if (total > LIMITS.totalBytes) throw new Error('Office inputs exceed the total byte limit')
        const ext = path.extname(input.file_path).toLowerCase()
        if (!['.docx', '.xlsx', '.csv', '.tsv', '.txt', '.json', '.png', '.jpg', '.jpeg'].includes(ext)) throw new Error('Use Office, text/data, PNG or JPEG inputs')
        if (['.docx', '.xlsx'].includes(ext)) inspectOffice(bytes, { maxItems: 1 })
        const staged = path.join(job, 'inputs', `${index}${ext}`)
        await writeFile(staged, bytes, { mode: 0o600 }); inputs.push(staged)
        revisions.push({ path: input.file_path, sha256: sha256(bytes) })
      }
      const result = await authorScript({ ...args, inputs, outputName: `output${extension}`, job, config, signal: exec.signal })
      // Author code may create symlinks in its job; the host accepts only regular output paths.
      const produced = await workspacePath(job, `output${extension}`)
      const bytes = await boundedRead(produced, LIMITS.archiveBytes)
      const inspection = inspectOffice(bytes, { maxItems: 50 })
      if ((inspection.kind === 'word' ? '.docx' : '.xlsx') !== extension) throw new Error('Generated package differs from the declared format')
      return { status: 'built', ...await publish(root, exec, args.output_file, bytes, extension), engine: result.engine,
        sourceSha256: sha256(Buffer.from(args.source)), inputs: revisions, confinement: result.execution.confinement,
        diagnostics: { stdout: result.execution.stdout, stderr: result.execution.stderr }, inspection }
    })
  })
  register('office_word_read', 'Read Word body, table, header/footer and note paragraphs with revision-bound selectors for preservation editing. editable=false identifies content requiring a dedicated field/revision/drawing editor.', {
    file_path: file, offset: { type: 'integer' }, max_items: { type: 'integer' }
  }, false, async (args, _exec, root) => {
    const offset = args.offset ?? 0, maxItems = args.max_items ?? 100
    if (!Number.isInteger(offset) || offset < 0 || !Number.isInteger(maxItems) || maxItems < 1 || maxItems > 500) throw new Error('Use a nonnegative offset and 1–500 max_items')
    const bytes = await read(root, args, '.docx')
    return { status: 'read', path: args.file_path, sha256: sha256(bytes), ...readWord(bytes, { offset, maxItems }) }
  })
  register('office_word_edit', 'Apply a batch of exact Word text replacements or existing paragraph styles on a copy. Keeps other package parts and run formatting, checks newly introduced bookmark/comment/note issues, and returns the semantic changes. Original file is the immutable baseline.', {
    file_path: file, expected_revision: revision, output_file: output,
    operations: { type: 'array', required: true, items: { type: 'object', properties: { paragraph_id: { type: 'string', required: true }, type: { type: 'string', required: true, enum: ['replace_text', 'set_paragraph_style'] }, find: { type: 'string' }, replace: { type: 'string' }, style_id: { type: 'string' } }, additionalProperties: false } }
  }, true, async (args, exec, root) => {
    const bytes = await read(root, args, '.docx'), { bytes: result, ...review } = editWord(bytes, args.operations)
    return { status: 'edited', ...await publish(root, exec, args.output_file, result, '.docx'), baseline: { path: args.file_path, sha256: sha256(bytes) }, ...review, visualReview: 'NOT_RUN', nativeAcceptance: 'NOT_RUN' }
  })
  register('office_excel_edit', 'Change existing XLSX cell values or scalar formulas on a copy while retaining styles and every unrelated package part. Invalidates formula caches across the workbook. Follow with office_recalculate.', {
    file_path: file, expected_revision: revision, output_file: output,
    operations: { type: 'array', required: true, items: { type: 'object', properties: { sheet: { type: 'string', required: true }, cell: { type: 'string', required: true }, value: { required: true, oneOf: [{ type: 'string' }, { type: 'number' }, { type: 'boolean' }, { type: 'null' }, { type: 'object', properties: { formula: { type: 'string', required: true } }, additionalProperties: false }] } }, additionalProperties: false } }
  }, true, async (args, exec, root) => {
    const bytes = await read(root, args, '.xlsx'), { bytes: result, ...review } = editCells(bytes, args.operations)
    return { status: 'edited', ...await publish(root, exec, args.output_file, result, '.xlsx'), baseline: { path: args.file_path, sha256: sha256(bytes) }, ...review }
  })
  register('office_recalculate', 'Execute LibreOffice with empty formula caches and forced calculation in an isolated job. Validate formulas, inputs, errors and optional independent numeric checks; transfer fresh results into the original package and publish a new workbook.', {
    file_path: file, expected_revision: revision, output_file: output,
    checks: { type: 'array', items: { type: 'object', properties: { sheet: { type: 'string', required: true }, cell: { type: 'string', required: true }, expected: { required: true, oneOf: [{ type: 'number' }, { type: 'string' }, { type: 'boolean' }] }, tolerance: { type: 'number' } }, additionalProperties: false } }
  }, true, async (args, exec, root) => {
    const bytes = await read(root, args, '.xlsx')
    const { bytes: result, execution, ...review } = await recalculate(bytes, args.checks ?? [], config, exec.signal)
    const artifact = await publish(root, exec, args.output_file, result, '.xlsx')
    return { status: 'recalculated', ...artifact, inputSha256: sha256(bytes), engine: 'LibreOffice', calculation: 'PASS', ...review, confinement: execution.confinement,
      inspection: { ...review.inspection, formulas: { ...review.inspection.formulas, recalculation: 'PASS', evidenceSha256: artifact.sha256 } } }
  })
  register('office_preview', 'Render an exact DOCX/XLSX revision to PDF through isolated LibreOffice. Returns rendering evidence; inspect every PDF page before claiming visual acceptance.', {
    file_path: file, expected_revision: revision, output_file: output
  }, true, async (args, exec, root) => {
    const extension = path.extname(args.file_path).slice(1).toLowerCase()
    if (!['docx', 'xlsx'].includes(extension)) throw new Error('Preview supports DOCX/XLSX')
    const bytes = await read(root, args); assertEngineInput(bytes)
    const result = await convertWithLibreOffice({ bytes, extension, format: 'pdf', config, signal: exec.signal })
    if (result.bytes.length > 64 * 1024 * 1024 || result.bytes.subarray(0, 5).toString() !== '%PDF-') throw new Error('Office preview requires a bounded PDF output')
    return { status: 'rendered', ...await publish(root, exec, args.output_file, result.bytes, '.pdf'), sourceSha256: sha256(bytes), rendering: 'PASS', visualReview: 'NOT_RUN', confinement: result.execution.confinement }
  })
}
