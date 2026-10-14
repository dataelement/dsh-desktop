import { lstat, realpath } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { defineTool } from '@deepseek-ai/dsh-tools'

export async function workspacePolicy(ctx, exec, write = true) {
  const session = exec.agent?.session
  if (!session?.header.cwd) throw new Error('Choose a workspace for the Office task')
  const policy = ctx.sandboxPolicy.resolve({ session })
  if (!(write ? ['workspace-write', 'danger-full-access'] : ['read-only', 'workspace-write', 'danger-full-access']).includes(policy.mode)) throw new Error('Office template copies require workspace write permission')
  const root = await realpath(session.header.cwd)
  if (root !== await realpath(policy.workspaceRoot) || !(await lstat(root)).isDirectory()) throw new Error('Choose the workspace covered by the session write policy')
  exec.signal?.throwIfAborted()
  return { ...policy, mode: write ? 'workspace-write' : 'read-only', workspaceRoot: root }
}

export function templateTool(ctx, library, modes, docx) {
  return defineTool({
    name: 'office_template',
    description: 'Prepare the current Word or Excel example and its design/reference inputs in a fresh workspace directory. For Word, use the returned editable_paragraphs with office_template_write to retain the native template layout. For Excel, use the returned XLSX with office-xlsx and load_workspace_dependencies. Fill all example facts from current user materials and present the final file.',
    parameters: { template_id: { type: 'string', required: true, description: 'The template ID from the current Office selection.' } },
    output: { schema: { type: 'object', additionalProperties: false, properties: {
      template_id: { type: 'string', required: true }, revision: { type: 'string', required: true },
      mode: { type: 'string', enum: ['word', 'excel'], required: true }, workspace_path: { type: 'string', required: true },
      design_path: { type: 'string', required: true }, guide: { type: 'string', required: true }, skill: { type: 'string', required: true },
      files: { type: 'array', required: true, items: { type: 'object', additionalProperties: false, properties: {
        workspace_path: { type: 'string', required: true }, sha256: { type: 'string', required: true }
      } } },
      editing_tool: { type: 'string', required: true },
      editable_paragraphs: { type: 'array', required: true, items: { type: 'object', additionalProperties: false, properties: {
        id: { type: 'string', required: true }, text: { type: 'string', required: true }, can_remove: { type: 'boolean', required: true },
        runs: { type: 'array', required: true, items: { type: 'object', additionalProperties: false, properties: { id: { type: 'string', required: true }, text: { type: 'string', required: true }, fonts: { type: 'string', required: true }, size: { type: 'string', required: true }, bold: { type: 'boolean', required: true } } } }
      } } }
    } }, render: (_args, result) => [{ type: 'text', text: JSON.stringify(result) }] },
    timeoutMs: 45_000,
    isConcurrencySafe: () => false,
    presentCall: args => ({ card: 'generic', kind: 'execute', title: 'Prepare Office template', rawInput: args }),
    async execute(args, exec) {
      const sessionId = exec.agent.id
      const state = await modes.state(sessionId)
      const selection = state.selectedDocumentTemplate
      if (!selection || selection.mode !== state.documentMode || selection.id !== args.template_id) throw new Error('Choose this example in the current Word or Excel composer')
      const prepared = await library.prepare(args.template_id, selection)
      const policy = await workspacePolicy(ctx, exec)
      const directory = `office-templates/${prepared.item.id}-${randomUUID()}`
      const plan = await ctx.sandbox.confine([process.execPath, fileURLToPath(new URL('./template-writer.js', import.meta.url))], policy)
      const env = Object.fromEntries(Object.keys(process.env).map(key => [key, undefined]))
      if (process.platform === 'win32') env.SystemRoot = process.env.SystemRoot
      if (process.versions.electron) env.ELECTRON_RUN_AS_NODE = '1'
      const facts = { templateId: prepared.item.id, revision: prepared.item.revision, directory }
      await modes.record(sessionId, 'office-template-start', facts)
      try {
        const signal = AbortSignal.any([AbortSignal.timeout(30_000), ...(exec.signal ? [exec.signal] : [])])
        const child = ctx.subprocess.spawn({ argv: plan.argv, cwd: policy.workspaceRoot, env, signal, graceMs: 1000,
          stdio: { stdin: { data: JSON.stringify({ directory, files: prepared.files }) }, stdout: { maxBytes: 32_768 }, stderr: { maxBytes: 2048 } } })
        const outcome = await child.done
        signal.throwIfAborted()
        if (outcome.exitCode !== 0) throw new Error('The workspace sandbox could not prepare the Office example')
        const result = JSON.parse(child.collected.stdout.readFrom(0).text)
        if (result.directory !== directory || result.files?.length !== prepared.files.length
          || prepared.files.some((file, index) => result.files[index]?.workspace_path !== `${directory}/${file.path}` || result.files[index]?.sha256 !== file.sha256)) throw new Error('The Office copy differs from the selected resource revision')
        // A selection made during the copy belongs to the next attempt.
        const live = (await modes.state(sessionId)).selectedDocumentTemplate
        if (live?.id !== selection.id || live?.revision !== selection.revision || (await workspacePolicy(ctx, exec)).workspaceRoot !== policy.workspaceRoot) throw new Error('The Office selection or workspace changed; prepare the current example')
        let paragraphs = []
        const workspacePath = `${directory}/${prepared.item.sampleFile}`
        if (prepared.item.mode === 'word' && docx) {
          const normalized = await docx.run('prepare', { path: workspacePath }, exec)
          paragraphs = normalized.paragraphs
          result.files.find(file => file.workspace_path === workspacePath).sha256 = normalized.sha256
        }
        await modes.record(sessionId, 'office-template-ready', facts)
        return { template_id: prepared.item.id, revision: prepared.item.revision, mode: prepared.item.mode,
          workspace_path: workspacePath, design_path: `${directory}/design.md`,
          files: result.files, guide: prepared.guide, skill: prepared.item.mode === 'word' ? 'office-docx' : 'office-xlsx',
          editing_tool: prepared.item.mode === 'word' ? 'office_template_write' : 'office-xlsx', editable_paragraphs: paragraphs }
      } catch (error) {
        await modes.record(sessionId, 'office-template-failed', facts)
        throw error
      }
    }
  })
}
