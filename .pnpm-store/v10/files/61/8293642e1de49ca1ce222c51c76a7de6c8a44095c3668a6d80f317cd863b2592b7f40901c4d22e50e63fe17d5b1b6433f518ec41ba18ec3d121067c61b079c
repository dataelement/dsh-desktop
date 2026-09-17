/**
 * Host Remote owner for the configuration surfaces over the settings-domain
 * seams. Two namespaces: `settings`, the redacted reads and writes of
 * `ctx.settings`, owned by the class below; and `credentials`, mounted from
 * here as its own plugin.
 *
 * @module @deepseek-ai/dsh-api-settings-controller
 */
import { Context } from '@deepseek-ai/cordis';
import Schema from '@deepseek-ai/schemastery';
import type { SettingsDescribeValue, SettingsNamespaceView, SettingsPathOpView } from '@deepseek-ai/dsh-settings/types';
import { TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol';
import type { JsonValue } from '@deepseek-ai/dsh-util-values';
import type { AgentPresetDirectoryOpenValue, SettingsDocumentOpenValue } from './types.ts';
export { CredentialsController } from './credentials.ts';
export type * from './types.ts';
/** Native document-opening policy. */
export interface Config {
    /** Override platform desktop-opener detection. */
    readonly nativeOpen?: boolean;
}
/** Host integrations replaceable by direct unit tests. */
export interface SettingsControllerInternals {
    readonly openPath?: (path: string, signal: AbortSignal) => Promise<void>;
    readonly openTextFile?: (path: string, signal: AbortSignal) => Promise<void>;
    readonly canOpenPath?: () => boolean;
}
declare module '@deepseek-ai/cordis' {
    interface Context {
        /** Host owner of the `settings` Remote namespace. */
        settingsController: SettingsController;
    }
}
/**
 * Host service backing the generated `ctx.remote.settings` namespace. Every
 * remote read uses `redactSecrets: true`, so a `role('secret')` field cannot
 * ride a response. Writes expose the settings service's merge, replacement,
 * and path-addressed operations, and classify every provider refusal as
 * `settings/conflict` or `settings/rejected` with the service's message.
 */
export declare class SettingsController extends TypertRemoteService {
    static Config: Schema<Config>;
    private readonly openPath;
    private readonly openTextFile;
    private readonly canOpenPath;
    /**
     * Register the settings namespace and mount the credentials namespace beside
     * it. Both namespaces stay registered when a provider is absent so calls can
     * return the configuration API's actionable missing-provider diagnostic.
     * @param ctx - Host context where settings and credential providers may be mounted.
     */
    constructor(ctx: Context, config?: Config, internals?: SettingsControllerInternals);
    /**
     * Describe every registered namespace for a configuration page: redacted
     * layered values plus the serialized schema the page renders its form from.
     * @returns provider writability, local-document presence, and one view per namespace.
     * @throws RemoteError when no settings provider is mounted.
     */
    describe(): SettingsDescribeValue;
    /**
     * Report whether this deployment can open an authored Agent preset directory natively.
     * @returns true when the matching open operation is available.
     */
    canOpenAgentPresetDirectory(): boolean;
    /**
     * Merge a patch into one namespace's stored user section.
     * @param ns - namespace key to write.
     * @param patch - fields to merge into the user section.
     * @param expectedRevision - revision the caller read; `undefined` writes unconditionally.
     * @returns the namespace's redacted view after the write.
     * @throws RemoteError when the request is invalid, no provider is mounted, or the provider refuses the write.
     */
    update(ns: string, patch: Record<string, JsonValue>, expectedRevision: number | undefined): Promise<SettingsNamespaceView>;
    /**
     * Replace one namespace's stored user section wholesale.
     * @param ns - namespace key to write.
     * @param section - complete replacement user section.
     * @param expectedRevision - revision the caller read; `undefined` writes unconditionally.
     * @returns the namespace's redacted view after the write.
     * @throws RemoteError when the request is invalid, no provider is mounted, or the provider refuses the write.
     */
    replace(ns: string, section: Record<string, JsonValue>, expectedRevision: number | undefined): Promise<SettingsNamespaceView>;
    /**
     * Apply path-addressed edits to one namespace's user section, resolved against
     * the section as stored rather than against whatever the caller last read,
     * then answer with that namespace's new redacted view.
     * @param ns - namespace key to write.
     * @param ops - the edits to apply, in order.
     * @param expectedRevision - revision the caller read; `undefined` writes unconditionally.
     * @returns the namespace's redacted view after the write.
     * @throws RemoteError when the request is invalid, no provider is mounted, or the provider refuses the write.
     */
    mutate(ns: string, ops: SettingsPathOpView[], expectedRevision: number | undefined): Promise<SettingsNamespaceView>;
    /**
     * Materialize the provider-owned settings document and open it in a native text editor.
     * @param signal - caller lifetime; abort terminates preparation or the native command.
     * @returns confirmation after the native opener accepts the document.
     * @throws RemoteError when no document exists, preparation fails, or opening fails.
     */
    openSettingsDocument(signal: AbortSignal): Promise<SettingsDocumentOpenValue>;
    /**
     * Open one user-authored Agent preset directory or return its path when no native opener exists.
     * @param agentPreset - preset id resolved against Host-owned roots.
     * @param signal - caller lifetime; abort terminates the native command.
     * @returns an opened confirmation or the resolved directory for text display.
     * @throws RemoteError when the preset is missing, read-only, invalid, or cannot be opened.
     */
    openAgentPresetDirectory(agentPreset: string, signal: AbortSignal): Promise<AgentPresetDirectoryOpenValue>;
    private write;
    /** Resolve the optional provider or report how to supply it. */
    private provider;
}
export default SettingsController;
//# sourceMappingURL=index.d.ts.map