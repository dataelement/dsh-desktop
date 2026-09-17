/**
 * Session-visible workspace instruction state and dynamic reconciliation.
 *
 * @module @deepseek-ai/dsh-agent-instructions/state
 */
import type { Agent } from '@deepseek-ai/dsh-agent';
import type { Message } from '@deepseek-ai/dsh-llm';
import type { Session, UserMessage } from '@deepseek-ai/dsh-session';
import type { FileSystem, FsVersion } from '@deepseek-ai/dsh-fs';
import type { ResolvedConfig } from './config.ts';
import { type LoadedInstructionFile } from './files.ts';
import { type AgentInstructionChange } from './render.ts';
export declare const name = "agent-instructions";
/** Durable producer, file, and reconciliation facts for one workspace context. */
export interface AgentInstructionSource {
    kind: 'agent-instructions';
    /** Every workspace context carries instructions read out of a file (the `instructions` context form). */
    form: 'instructions';
    /** Marks the complete startup/resume baseline rather than a later delta. */
    baseline?: true;
    /** Discovery, precedence, and budget identity used to validate a resumed baseline. */
    baselineIdentity?: string;
    changes: AgentInstructionChange[];
}
declare module '@deepseek-ai/dsh-llm' {
    interface MessageSourceMap {
        'agent-instructions': AgentInstructionSource;
    }
}
/** Per-scope metadata cache; instruction prose is deliberately not retained. */
export interface InstructionVersionState {
    path: string;
    version: FsVersion;
    digest: string;
    /**
     * Trimmed-content identity ({@link trimmedInstructionDigest}) used to suppress
     * per-directory duplicates on the metadata fast path without re-reading a sibling.
     */
    trimmedDigest: string;
}
/** Session-isolated fast-path state keyed by logical instruction scope. */
export type InstructionVersionCache = WeakMap<Session, Map<string, InstructionVersionState>>;
/** A metadata-cache transition associated with one rendered instruction change. */
export interface InstructionVersionUpdate {
    change: AgentInstructionChange;
    state?: InstructionVersionState;
}
/** Rendered reconciliation plus its metadata-cache transitions. */
export interface ReconciledInstructionContext {
    context: UserMessage;
    versionUpdates: InstructionVersionUpdate[];
}
/**
 * Build the user-role message for a rendered baseline.
 * @param text - complete plugin-owned system-reminder text.
 * @returns a user-role prefix message.
 */
export declare function workspaceContextMessage(text: string): Message;
/**
 * Convert retained baseline files into comparison and metadata-cache state.
 * @param files - baseline files that survived rendering.
 * @returns latest baseline changes and provider versions keyed by logical scope.
 */
export declare function baselineInstructionState(files: LoadedInstructionFile[]): {
    changes: Map<string, AgentInstructionChange>;
    versions: Map<string, InstructionVersionState>;
};
/**
 * Keep only cache updates represented by rendered changes.
 * @param updates - proposed updates from one or more reconciliations.
 * @param renderedChanges - transitions retained by the renderer.
 * @returns updates represented by an exact retained transition.
 */
export declare function retainedInstructionVersionUpdates(updates: readonly InstructionVersionUpdate[], renderedChanges: readonly AgentInstructionChange[]): InstructionVersionUpdate[];
/**
 * Apply metadata-cache transitions without retaining instruction prose.
 * @param session - owning session.
 * @param updates - ordered set/delete transitions.
 * @param cache - session-isolated metadata cache.
 */
export declare function applyInstructionVersionUpdates(session: Session, updates: readonly InstructionVersionUpdate[], cache: InstructionVersionCache): void;
/**
 * Compare visible state with provider-visible files and render transitions.
 * @param agent - session owner whose visible surface supplies durable state.
 * @param resolved - normalized plugin configuration.
 * @param versionCache - per-session scope metadata used to skip unchanged reads.
 * @param fileSystem - provider used for current file probes.
 * @param options - authoritative claimed context, pending scope hints, touched paths, and baseline participation.
 * @returns rendered context plus deferred cache updates, or undefined when unchanged/unavailable.
 */
export declare function reconcileInstructionContext(agent: Agent, resolved: ResolvedConfig, versionCache: InstructionVersionCache, fileSystem: FileSystem, options: {
    authorityMessages: readonly UserMessage[];
    scopeMessages: readonly UserMessage[];
    touchedPaths: readonly string[];
    includeBaselineScopes: boolean;
    excludedBaselineScopes?: ReadonlySet<string>;
    projectRoot?: string;
    signal?: AbortSignal;
}): Promise<ReconciledInstructionContext | undefined>;
//# sourceMappingURL=state.d.ts.map