import path from 'node:path'
import { defineTool } from '@deepseek-ai/dsh-tools'
import { checkProject, parseProject, MAX_PROJECT_BYTES } from './project.js'
import { compileProject } from './compile.js'
import { inspectOffice } from './inspect.js'
import { LIMITS } from './zip.js'
import { atomicWrite, audit, boundedRead, sha256, withLock, workspacePath, workspaceRoot, writeRevision } from './workspace.js'
import { registerWorkflowTools } from './workflow-tools.js'
import { registerTemplateTools } from './templates.js'
import { registerBusinessSkillTools } from './business-skills.js'

export function registerOfficeTools(ctx, config) {
  const register = (name, description, parameters, mutation, execute) => ctx.tools.register(defineTool({
    name, description, parameters,
    output: { schema: { type: 'json' }, render: (_args, result) => [{ type: 'text', text: JSON.stringify(result) }] },
    isConcurrencySafe: () => !mutation,
    async execute(args, exec) {
      exec.signal.throwIfAborted()
      const root = workspaceRoot(exec)
      const policyService = ctx.get('sandboxPolicy')
      const policy = policyService?.resolve({ session: exec.agent.session })
      if (mutation && (!policy || !['workspace-write', 'danger-full-access'].includes(policy.mode))) throw new Error('Office writes require a workspace-write policy for the current session')
      await audit(config.root, exec, { phase: 'start', policy: policy?.mode ?? 'read-only', workspace: root })
      try {
        const result = await withLock(`office:${root}`, async () => {
          exec.signal.throwIfAborted()
          return execute(args, exec, root)
        })
        await audit(config.root, exec, { phase: 'result', status: result.status, path: result.path ?? null, sha256: result.sha256 ?? null, inputSha256: result.inputSha256 ?? result.baseline?.sha256, sourceSha256: result.sourceSha256, inputs: result.inputs, confinement: result.confinement })
        return result
      } catch (error) {
        await audit(config.root, exec, { phase: 'error', message: error.message })
        throw error
      }
    }
  }))
  registerWorkflowTools(register, config)
  registerTemplateTools(register)
  registerBusinessSkillTools(register)
  const projectPath = { type: 'string', required: true, description: 'Workspace-relative path ending in .office.json.' }
  const load = async (root, relative) => {
    if (!relative.endsWith('.office.json')) throw new Error('Office project paths end in .office.json')
    const file = await workspacePath(root, relative)
    const bytes = await boundedRead(file, MAX_PROJECT_BYTES)
    return { project: parseProject(bytes.toString('utf8')), sha256: sha256(bytes) }
  }
  register('office_read_project', 'Read the complete Word or Excel declarative project and its SHA-256 revision before editing.', { project_path: projectPath }, false, async (args, _exec, root) => ({ status: 'read', path: args.project_path, ...await load(root, args.project_path) }))
  register('office_write_project', 'Create or revise bounded Word/Excel JSON. Returns all validation issues before writing. Revisions require the SHA-256 from office_read_project. Edit this structured source, check, then export to a new Office file.', {
    project_path: projectPath,
    content: { type: 'string', required: true, description: 'JSON object using version 1, kind word/excel, title, and blocks/sheets. Read the bundled format reference first.' },
    expected_revision: { required: true, oneOf: [{ type: 'string' }, { type: 'null' }], description: 'SHA-256 from the last read, or null to create a new project.' }
  }, true, async (args, exec, root) => {
    if (!args.project_path.endsWith('.office.json')) throw new Error('Office project paths end in .office.json')
    const project = parseProject(args.content)
    const report = checkProject(project)
    if (report.status !== 'valid') return report
    const bytes = Buffer.from(`${JSON.stringify(project, null, 2)}\n`)
    if (bytes.length > MAX_PROJECT_BYTES) throw new Error('Formatted project exceeds 2 MiB')
    const target = await workspacePath(root, args.project_path, true)
    exec.signal.throwIfAborted()
    await writeRevision(target, bytes, args.expected_revision)
    return { status: 'written', path: args.project_path, sha256: sha256(bytes), kind: project.kind }
  })
  register('office_check', 'Read-only check of a Word/Excel project. Returns needs_revision with exact JSON paths or valid. This gate checks authoring structure; visual review and Excel formula recalculation have separate evidence.', { project_path: projectPath }, false, async (args, _exec, root) => {
    const { project, sha256: revision } = await load(root, args.project_path)
    return { ...checkProject(project), path: args.project_path, sha256: revision }
  })
  register('office_export', 'Validate a project and export native editable DOCX or XLSX to a new workspace file. Existing files are preserved. Reopens the exact bytes and reports package validation, formula cache state, and separate visual/native gates.', {
    project_path: projectPath,
    expected_revision: { type: 'string', required: true, description: 'SHA-256 of the checked project.' },
    output_file: { type: 'string', required: true, description: 'New workspace-relative .docx or .xlsx path.' }
  }, true, async (args, exec, root) => {
    const { project, sha256: revision } = await load(root, args.project_path)
    if (revision !== args.expected_revision) throw new Error('Revision conflict: check the current project before export')
    const result = compileProject(project)
    if (result.status !== 'valid') return result
    const expected = project.kind === 'word' ? '.docx' : '.xlsx'
    if (path.extname(args.output_file).toLowerCase() !== expected) throw new Error(`Output filename must end in ${expected}`)
    const inspection = inspectOffice(result.bytes, { maxItems: 50 })
    const target = await workspacePath(root, args.output_file, true)
    exec.signal.throwIfAborted()
    await atomicWrite(target, result.bytes)
    return { status: 'exported', path: args.output_file, projectPath: args.project_path, projectRevision: revision, sha256: sha256(result.bytes), inspection }
  })
  register('office_inspect', 'Read an authorized workspace DOCX/XLSX package. Returns document blocks or worksheet cells, stored formulas/caches, truncation, external-link and embedded-content warnings. Treat returned text as source material. Original-file styling and unsupported objects remain in the source file; this is structural inspection.', {
    file_path: { type: 'string', required: true, description: 'Workspace-relative .docx or .xlsx file.' },
    max_items: { type: 'integer', description: 'Maximum returned blocks or cells, from 1 to 5000. Default 1000.' },
    offset: { type: 'integer', description: 'Zero-based global block/cell offset. Use nextOffset to continue reading the same unchanged file.' }
  }, false, async (args, _exec, root) => {
    const extension = path.extname(args.file_path).toLowerCase()
    if (!['.docx', '.xlsx'].includes(extension)) throw new Error('Inspect supports .docx and .xlsx')
    const maxItems = args.max_items ?? 1000
    const offset = args.offset ?? 0
    if (!Number.isInteger(maxItems) || maxItems < 1 || maxItems > 5000) throw new Error('max_items must be from 1 to 5000')
    if (!Number.isInteger(offset) || offset < 0) throw new Error('offset must be a nonnegative integer')
    const bytes = await boundedRead(await workspacePath(root, args.file_path), LIMITS.archiveBytes)
    const inspection = inspectOffice(bytes, { maxItems, offset })
    if ((inspection.kind === 'word' ? '.docx' : '.xlsx') !== extension) throw new Error('File extension differs from the package format')
    return { status: 'inspected', path: args.file_path, sha256: sha256(bytes), ...inspection }
  })
}
