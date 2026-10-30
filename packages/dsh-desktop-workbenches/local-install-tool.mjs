import { defineTool } from '@deepseek-ai/dsh-tools'
import { approveEscalation } from '@deepseek-ai/dsh-sandbox'
import { prepareLocalInstall } from './local-install.mjs'

/** Registerable agent tool; all package mutation remains owned by Plugin Manager. */
export function localWorkbenchInstallTool(ctx, restartStatus) {
  return defineTool({
    name: 'install_local_workbench',
    description: 'Install a built local workbench .tgz into the current Desktop Profile through Plugin Manager. Use after the user asks you to develop and install a workbench; no manual installation page is needed. Installation affects every session in this Profile. Pass replace only when the user authorized updating this existing workbench. Inspect application: applied means verify its UI, restart-required means ask the user to restart Harness after the current task. Failed, cancelled or overridden is not an active workbench. Never restart your own running Harness session. Do not bypass a denied installation using CLI or Profile edits.',
    parameters: {
      path: { type: 'string', required: true, description: 'Absolute path to the verified .tgz on this Desktop host (maximum 8 MiB).' },
      replace: { type: 'boolean', description: 'Replace the same package only when updating it is authorized; default false.' },
      approvedBuilds: { type: 'array', items: { type: 'string' }, description: 'Package names from pendingBuilds, only after explicit approval to execute their install scripts.' }
    },
    output: { schema: { type: 'string' }, render: (_args, value) => [{ type: 'text', text: value }] },
    isConcurrencySafe: () => false,
    presentCall: args => ({ card: 'generic', kind: 'execute', title: 'Install local workbench', rawInput: args }),
    async execute(args, exec) {
      const policy = ctx.sandboxPolicy.resolve(exec.agent ? { session: exec.agent.session } : {})
      await approveEscalation({
        requestedMode: 'danger-full-access', effectiveMode: policy.mode, subject: 'local workbench installation',
        justification: 'Install a local workbench in the shared Desktop Profile. Installed plugin code runs outside the workspace sandbox.'
      }, { approver: ctx.get('approval'), agent: exec.agent, callId: exec.callId,
        toolName: 'install_local_workbench', signal: exec.signal })
      exec.signal.throwIfAborted()
      const target = await prepareLocalInstall(args.path)
      try {
        exec.signal.throwIfAborted()
        const requestId = `workbench-${exec.callId}`
        const cancel = () => {
          void ctx.pluginManager.cancelInstall(requestId).catch(error => ctx.logger?.warn?.('Local workbench cancellation failed: %s', error.message))
        }
        exec.signal.addEventListener('abort', cancel, { once: true })
        let result
        try {
          result = await ctx.pluginManager.installBundle(target.spec, {
            expectedName: target.name, expectedVersion: target.version, replace: args.replace === true,
            requestId, ...(args.approvedBuilds === undefined ? {} : { approvedBuilds: args.approvedBuilds })
          })
        } finally { exec.signal.removeEventListener('abort', cancel) }
        if (!result || !['applied', 'restart-required', 'failed', 'cancelled', 'overridden'].includes(result.application)) {
          throw new Error('Plugin Manager returned no lifecycle outcome.')
        }
        if (result.application === 'applied') {
          try { await restartStatus.acknowledge(target.name) }
          catch (error) { ctx.logger?.warn?.('Local installation applied, but restart status reconciliation failed: %s', error.message) }
        }
        return JSON.stringify({ packageName: target.name, version: target.version, ...result })
      } finally {
        // A cleanup error must not hide an already completed manager operation.
        try { await target.cleanup() }
        catch (error) { ctx.logger?.warn?.('Could not remove local install staging: %s', error.message) }
      }
    }
  })
}
