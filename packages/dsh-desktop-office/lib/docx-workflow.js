import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineTool } from '@deepseek-ai/dsh-tools'
import { workspacePolicy } from './template-tool.js'
import { selectedTemplate } from './modes.js'

// Short -c program. The worker source travels in the environment because Windows
// Electron parses the confinement command line itself; inlining the script there
// makes the runner exit before Python starts, with an empty stderr.
const docxWorkerBootstrap = "import os; exec(compile(os.environ.pop('DSH_DOCX_LAYOUT_SOURCE'), 'docx-layout.py', 'exec'), {'__name__': '__main__'})"

/** Argv for the confined interpreter. The worker source is not an argument. */
export function docxWorkerArgv(python) {
  return [python, '-I', '-B', '-c', docxWorkerBootstrap]
}

/**
 * Confined Word interpreter. Windows uses pythonw.exe: python.exe is a console
 * binary, and a console-less Electron host makes the ACL runner exit
 * 0xC0000142 before Python starts. Inherited pipes still carry the result.
 */
export function docxWorkerPython(resources, platform = process.platform) {
  return join(resources, 'primary-runtime/dependencies/python', platform === 'win32' ? 'pythonw.exe' : 'bin/python3')
}

/** Environment for the confined Word worker. Credentials stay behind. */
export function docxWorkerEnvironment(runtime = process, script) {
  const env = Object.fromEntries(Object.keys(runtime.env).map(key => [key, undefined]))
  if (runtime.platform === 'win32') env.SystemRoot = runtime.env.SystemRoot
  // Windows wraps this command in the ACL runner at process.execPath. Inside the
  // Electron harness that executable runs the runner only in Node mode.
  if (runtime.versions.electron) env.ELECTRON_RUN_AS_NODE = '1'
  // CreateProcessW rejects an environment block above 32767 characters.
  if (typeof script === 'string') {
    if (script.length > 24000) throw new Error('Word template worker exceeds the Windows environment limit')
    env.DSH_DOCX_LAYOUT_SOURCE = script
  }
  return env
}

/**
 * @typedef {{ source: string, text: string }} NativeTextFragment
 * @typedef {{ id: string, text: string, runs?: NativeTextFragment[] }} ParagraphReplacement
 * @typedef {{ after: string, source: string, text: string, runs?: NativeTextFragment[] }} ParagraphAddition
 * @typedef {{ output_path: string, replacements: ParagraphReplacement[], additions?: ParagraphAddition[], removals?: string[] }} DocxWritePlan
 * @typedef {{ id: string, text: string, fonts: string, size: string, bold: boolean }} NativeRun
 * @typedef {{ id: string, text: string, can_remove: boolean, runs: NativeRun[] }} NativeParagraph
 * @typedef {{ sha256: string, path?: string, checks?: string[], paragraphs?: NativeParagraph[] }} DocxResult
 * @typedef {{ run: (command: 'prepare' | 'write' | 'validate', args: { path: string } | DocxWritePlan, exec: object) => Promise<DocxResult> }} DocxWorkflow
 */

/**
 * Host-owned source and confined Python execution; workspace contents stay in the sandbox.
 * @returns {DocxWorkflow}
 */
export function createDocxWorkflow(ctx, library, modes, resources) {
  const python = docxWorkerPython(resources)
  let worker
  async function run(command, args, exec) {
    const id = exec.agent?.id
    if (!id) throw new Error('Use an active session for the Word template workflow')
    const state = await modes.state(id), item = selectedTemplate(library, state)
    if (!item || item.mode !== 'word') throw new Error('Choose a current Word template before editing or validating')
    const path = args.path ?? args.output_path
    if (typeof path !== 'string' || !path.trim() || path.length > 1024) throw new Error('Use a bounded Word workspace path')
    const policy = await workspacePolicy(ctx, exec, command !== 'validate')
    const source = await library.asset(item.id, item.sampleFile)
    const profile = item.files['generation.json'] ? JSON.parse((await library.asset(item.id, 'generation.json')).toString('utf8')) : null
    worker ??= await readFile(fileURLToPath(new URL('./docx-layout.py', import.meta.url)), 'utf8')
    const plan = await ctx.sandbox.confine(docxWorkerArgv(python), policy)
    const env = docxWorkerEnvironment(process, worker)
    const signal = AbortSignal.any([AbortSignal.timeout(45_000), ...(exec.signal ? [exec.signal] : [])])
    const facts = { templateId: item.id, revision: item.revision, operation: command, path: args.path ?? args.output_path }
    await modes.record(id, 'office-docx-start', facts)
    try {
      const child = ctx.subprocess.spawn({ argv: plan.argv, cwd: policy.cwd, env, signal, graceMs: 1000,
        stdio: { stdin: { data: JSON.stringify({ command, args, profile, source: source.toString('base64'), sourceSha256: item.files[item.sampleFile] }) }, stdout: { maxBytes: 1024 * 1024 }, stderr: { maxBytes: 4096 } } })
      const outcome = await child.done
      signal.throwIfAborted()
      if (outcome.exitCode !== 0) {
        const detail = child.collected.stderr.readFrom(0).text.trim() || child.collected.stdout.readFrom(0).text.trim().slice(0, 500)
        throw new Error(detail || `Word template processing failed (exit ${outcome.exitCode})`)
      }
      const result = JSON.parse(child.collected.stdout.readFrom(0).text)
      if (!result || !/^[a-f0-9]{64}$/.test(result.sha256)) throw new Error('Word template processing returned an invalid result')
      if (command === 'prepare' ? !Array.isArray(result.paragraphs) : !Array.isArray(result.checks) || result.checks.some(check => typeof check !== 'string')) throw new Error('Word template processing returned an invalid layout result')
      if (command === 'write' && result.path !== args.output_path) throw new Error('Word template processing returned a different output path')
      const live = selectedTemplate(library, await modes.state(id))
      if (live?.id !== item.id || live.revision !== item.revision || (await workspacePolicy(ctx, exec, command !== 'validate')).cwd !== policy.cwd) throw new Error('Prepare the current selection in its active workspace')
      await modes.record(id, 'office-docx-ready', { ...facts, sha256: result.sha256 })
      return result
    } catch (error) {
      await modes.record(id, 'office-docx-failed', facts)
      throw error
    }
  }
  return { run }
}

const fragments = { type: 'array', items: { type: 'object', additionalProperties: false, properties: { source: { type: 'string', required: true }, text: { type: 'string', required: true } } }, description: 'Optional text fragments with original run IDs for mixed fonts or emphasis; together they equal the complete text.' }
const paragraph = { type: 'object', additionalProperties: false, properties: {
  id: { type: 'string', required: true }, text: { type: 'string', required: true }, runs: fragments
} }
/** Controlled edits retain the selected DOCX package and its native layout objects. */
export function docxWriteTool(workflow) {
  return defineTool({ name: 'office_template_write',
    description: 'Write a new Word file by editing the selected native template. Use paragraph IDs returned by office_template. Replace all example facts; supply replacements, optional additions cloned from a source paragraph, and removals for unused body paragraphs. The Host retains fonts, page layout, borders and page-number footers and verifies the result.',
    parameters: {
      output_path: { type: 'string', required: true, description: 'A new .docx path inside the active workspace.' },
      replacements: { type: 'array', required: true, items: paragraph, description: 'The complete paragraph text for each recorded ID, including the issuing organization.' },
      additions: { type: 'array', items: { type: 'object', additionalProperties: false, properties: { after: { type: 'string', required: true }, source: { type: 'string', required: true }, text: { type: 'string', required: true }, runs: fragments } } },
      removals: { type: 'array', items: { type: 'string' }, description: 'Unused paragraph IDs marked can_remove by office_template.' }
    },
    output: { schema: { type: 'object', additionalProperties: false, properties: {
      path: { type: 'string', required: true }, sha256: { type: 'string', required: true }, checks: { type: 'array', required: true, items: { type: 'string' } }
    } }, render: (_args, result) => [{ type: 'text', text: JSON.stringify(result) }] },
    timeoutMs: 60_000, isConcurrencySafe: () => false,
    async execute(args, exec) { return workflow.run('write', args, exec) }
  })
}

/** Check current bytes at the actual present admission seam, including nested PTC calls. */
export function registerDocxDelivery(ctx, library, modes, workflow) {
  ctx.on('tools/pre-execute', async (exec, next) => {
    const decision = await next()
    if (decision.kind !== 'allow' || exec.name !== 'present' || !exec.agent || exec.signal.aborted) return decision
    const template = selectedTemplate(library, await modes.state(exec.agent.id))
    if (template?.mode !== 'word') return decision
    const files = exec.arguments?.files
    if (!Array.isArray(files)) return { kind: 'deny', reason: 'Present the verified Word template output' }
    const documents = files.filter(file => typeof file?.path === 'string' && /\.docx$/i.test(file.path))
    if (!documents.length) return { kind: 'deny', reason: 'Present the .docx created with office_template_write for the selected Word workflow' }
    try {
      for (const file of documents) await workflow.run('validate', { path: file.path }, exec)
      return decision
    } catch (error) {
      return { kind: 'deny', reason: `Word template layout check: ${error.message}. Use office_template and office_template_write to retain the selected layout, then present the verified file.` }
    }
  })
}
