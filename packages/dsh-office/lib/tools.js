import path from 'node:path'
import { defineTool } from '@deepseek-ai/dsh-tools'
import { inspectOffice } from './inspect.js'
import { LIMITS } from './zip.js'
import { audit, boundedRead, sha256, withLock, workspacePath, workspaceRoot } from './workspace.js'
import { registerWorkflowTools } from './workflow-tools.js'
import { registerTemplateTools } from './templates.js'

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
        await audit(config.root, exec, { phase: 'error', message: error instanceof Error ? error.message : String(error) })
        throw error
      }
    }
  }))

  registerWorkflowTools(register, config)
  registerTemplateTools(register, ctx.officeModes)
  register('office_inspect', 'Read an authorized workspace DOCX/XLSX package. Returns document blocks or worksheet cells, stored formulas/caches, truncation, external-link and embedded-content warnings.', {
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
