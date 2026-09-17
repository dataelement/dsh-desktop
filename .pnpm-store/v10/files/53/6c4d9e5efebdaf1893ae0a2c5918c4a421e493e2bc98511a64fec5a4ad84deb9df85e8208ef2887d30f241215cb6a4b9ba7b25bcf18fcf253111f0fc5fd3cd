/** Platform-neutral assembly of generated Host Remote contributions. */
import agentPresetsRemote from '@deepseek-ai/dsh-agent-presets/remote';
import commandsRemote from '@deepseek-ai/dsh-commands/remote';
import settingsControllerRemote from '@deepseek-ai/dsh-api-settings-controller/remote';
import goalsRemote from '@deepseek-ai/dsh-goal/remote';
import llmRemote from '@deepseek-ai/dsh-llm/remote';
import dynamicRemote from '@deepseek-ai/dsh-cordis-host-runner/remote';
import pluginInventoryRemote from '@deepseek-ai/dsh-host-plugin-inventory/remote';
import messageFeedbackRemote from '@deepseek-ai/dsh-message-feedback/remote';
import sessionFeedbackRemote from '@deepseek-ai/dsh-command-feedback/remote';
import fileUploadsRemote from '@deepseek-ai/dsh-client-file-upload/remote';
import sessionReferencesRemote from '@deepseek-ai/dsh-session-reference/remote';
import subagentsRemote from '@deepseek-ai/dsh-subagent/remote';
import sessionRemote from '@deepseek-ai/dsh-api-session-controller/remote';
import workspaceRemote from '@deepseek-ai/dsh-api-workspace-controller/remote';
import workspaceFilesRemote from '@deepseek-ai/dsh-api-workspace-files/remote';
/** Required service: the typed Client Remote contribution mount. */
export const inject = ['remote'];
/**
 * Mount the Host capabilities explicitly selected for this Client assembly.
 * @param ctx - Client Cordis root carrying the typed API service.
 * @returns disposer after every selected Remote namespace is ready.
 */
export async function apply(ctx) {
    const disposers = [];
    try {
        for (const contribution of [
            agentPresetsRemote, commandsRemote, settingsControllerRemote, goalsRemote, llmRemote, dynamicRemote,
            pluginInventoryRemote, messageFeedbackRemote, sessionFeedbackRemote, fileUploadsRemote, sessionReferencesRemote,
            subagentsRemote, sessionRemote, workspaceRemote, workspaceFilesRemote,
        ]) {
            disposers.push(await ctx.remote.$mount(contribution));
        }
    }
    catch (error) {
        for (const dispose of disposers.reverse())
            await dispose();
        throw error;
    }
    // Unwound in reverse mount order, so a namespace never outlives one mounted
    // after it.
    return async () => {
        for (const dispose of disposers.reverse())
            await dispose();
    };
}
//# sourceMappingURL=index.js.map