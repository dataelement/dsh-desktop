import path from 'node:path'
import { writeFile } from 'node:fs/promises'
import { readBytes, resolveRegularFile, resolveWorkspaceFile, sha256, writeBinaryAtomic } from './workspace.js'
import { LIMITS } from './zip.js'
import { inspectOffice } from './inspect.js'
import { editCells, editWord, readWord } from './edit.js'
import { recalculate } from './recalculate.js'
import { authorScript, withJob } from './runtime.js'

const file = { type: 'string', required: true, description: 'Workspace-relative source file.' }
const revision = { type: 'string', required: true, description: 'Exact SHA-256 returned by the latest source inspection.' }
const output = { type: 'string', required: true, description: 'New workspace-relative output filename. Existing files are preserved.' }
export function registerWorkflowTools(register, config) {
  const read = async ({ fs, policy }, exec, args, extension) => {
    if (extension && path.extname(args.file_path).toLowerCase() !== extension) throw new Error(`Select a ${extension} file`)
    const target = await resolveWorkspaceFile(fs, policy, args.file_path, exec.signal)
    const bytes = await readBytes(fs, target, LIMITS.archiveBytes, exec.signal)
    if (args.expected_revision !== undefined && sha256(bytes) !== args.expected_revision) throw new Error('Revision conflict: inspect the current source before editing')
    return bytes
  }
  const publish = async ({ fs, policy }, exec, relative, bytes, extension) => {
    if (path.extname(relative).toLowerCase() !== extension) throw new Error(`Output must end in ${extension}`)
    const target = await resolveWorkspaceFile(fs, policy, relative, exec.signal)
    await writeBinaryAtomic(fs, target, bytes, { signal: exec.signal })
    return { path: relative, sha256: sha256(bytes) }
  }
  register('office_build', 'Generate a rich native DOCX/XLSX using a JavaScript docx or Python openpyxl script in a filesystem and network isolated job. Only declared input copies are readable; publish a validated new file.', {
    language: { type: 'string', required: true, enum: ['javascript', 'python'] },
    source: { type: 'string', required: true, description: 'Up to 128 KiB. JavaScript receives docx and office variables. Python receives office dict. Save the primary artifact to office.output / office["output"].' },
    inputs: { type: 'array', items: { type: 'object', properties: { file_path: file, expected_revision: revision }, additionalProperties: false }, description: 'At most 8 explicitly selected workspace files. office.inputs / office["inputs"] contains their staged absolute paths in this order.' },
    output_file: output
  }, true, async (args, exec, services) => {
    if (!['javascript', 'python'].includes(args.language) || typeof args.source !== 'string' || !args.source.trim() || Buffer.byteLength(args.source) > 128 * 1024) throw new Error('Select JavaScript/Python and supply a script up to 128 KiB')
    if (!Array.isArray(args.inputs ?? []) || (args.inputs?.length ?? 0) > 8) throw new Error('Use at most 8 input files')
    const extension = args.language === 'javascript' ? '.docx' : '.xlsx'
    if (path.extname(args.output_file).toLowerCase() !== extension) throw new Error(`Output must end in ${extension}`)
    // Validate target and source revisions before starting expensive authoring.
    await resolveWorkspaceFile(services.fs, services.policy, args.output_file, exec.signal)
    return withJob(async job => {
      const inputs = [], revisions = []; let total = 0
      for (const [index, input] of (args.inputs ?? []).entries()) {
        const bytes = await read(services, exec, input)
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
      const produced = await resolveRegularFile(services.fs, path.join(job, `output${extension}`), job, exec.signal)
      const bytes = await readBytes(services.fs, produced, LIMITS.archiveBytes, exec.signal)
      const inspection = inspectOffice(bytes, { maxItems: 50 })
      if ((inspection.kind === 'word' ? '.docx' : '.xlsx') !== extension) throw new Error('Generated package differs from the declared format')
      return { status: 'built', ...await publish(services, exec, args.output_file, bytes, extension), engine: result.engine,
        sourceSha256: sha256(Buffer.from(args.source)), inputs: revisions, confinement: result.execution.confinement,
        diagnostics: { stdout: result.execution.stdout, stderr: result.execution.stderr }, inspection }
    })
  })
  register('office_word_read', 'Read Word body, table, header/footer and note paragraphs with revision-bound selectors for preservation editing. editable=false identifies content requiring a dedicated field/revision/drawing editor.', {
    file_path: file, offset: { type: 'integer' }, max_items: { type: 'integer' }
  }, false, async (args, exec, services) => {
    const offset = args.offset ?? 0, maxItems = args.max_items ?? 100
    if (!Number.isInteger(offset) || offset < 0 || !Number.isInteger(maxItems) || maxItems < 1 || maxItems > 500) throw new Error('Use a nonnegative offset and 1–500 max_items')
    const bytes = await read(services, exec, args, '.docx')
    return { status: 'read', path: args.file_path, sha256: sha256(bytes), ...readWord(bytes, { offset, maxItems }) }
  })
  register('office_word_edit', 'Apply a batch of exact Word text replacements or existing paragraph styles on a copy. Keeps other package parts and run formatting, checks newly introduced bookmark/comment/note issues, and returns the semantic changes. Original file is the immutable baseline.', {
    file_path: file, expected_revision: revision, output_file: output,
    operations: { type: 'array', required: true, items: { type: 'object', properties: { paragraph_id: { type: 'string', required: true }, type: { type: 'string', required: true, enum: ['replace_text', 'set_paragraph_style'] }, find: { type: 'string' }, replace: { type: 'string' }, style_id: { type: 'string' } }, additionalProperties: false } }
  }, true, async (args, exec, services) => {
    const bytes = await read(services, exec, args, '.docx'), { bytes: result, ...review } = editWord(bytes, args.operations)
    return { status: 'edited', ...await publish(services, exec, args.output_file, result, '.docx'), baseline: { path: args.file_path, sha256: sha256(bytes) }, ...review, visualReview: 'NOT_RUN', nativeAcceptance: 'NOT_RUN' }
  })
  register('office_excel_edit', 'Change existing XLSX cell values or scalar formulas on a copy while retaining styles and every unrelated package part. Invalidates formula caches across the workbook. Follow with office_recalculate.', {
    file_path: file, expected_revision: revision, output_file: output,
    operations: { type: 'array', required: true, items: { type: 'object', properties: { sheet: { type: 'string', required: true }, cell: { type: 'string', required: true }, value: { required: true, oneOf: [{ type: 'string' }, { type: 'number' }, { type: 'boolean' }, { type: 'null' }, { type: 'object', properties: { formula: { type: 'string', required: true } }, additionalProperties: false }] } }, additionalProperties: false } }
  }, true, async (args, exec, services) => {
    const bytes = await read(services, exec, args, '.xlsx'), { bytes: result, ...review } = editCells(bytes, args.operations)
    return { status: 'edited', ...await publish(services, exec, args.output_file, result, '.xlsx'), baseline: { path: args.file_path, sha256: sha256(bytes) }, ...review }
  })
  register('office_recalculate', 'Execute LibreOffice with empty formula caches and forced calculation in an isolated job. Validate formulas, inputs, errors and optional independent numeric checks; transfer fresh results into the original package and publish a new workbook.', {
    file_path: file, expected_revision: revision, output_file: output,
    checks: { type: 'array', items: { type: 'object', properties: { sheet: { type: 'string', required: true }, cell: { type: 'string', required: true }, expected: { required: true, oneOf: [{ type: 'number' }, { type: 'string' }, { type: 'boolean' }] }, tolerance: { type: 'number' } }, additionalProperties: false } }
  }, true, async (args, exec, services) => {
    const bytes = await read(services, exec, args, '.xlsx')
    const { bytes: result, execution, ...review } = await recalculate(bytes, args.checks ?? [], { ...config, fs: services.fs }, exec.signal)
    const artifact = await publish(services, exec, args.output_file, result, '.xlsx')
    return { status: 'recalculated', ...artifact, inputSha256: sha256(bytes), engine: 'LibreOffice', calculation: 'PASS', ...review, confinement: execution.confinement,
      inspection: { ...review.inspection, formulas: { ...review.inspection.formulas, recalculation: 'PASS', evidenceSha256: artifact.sha256 } } }
  })
}
