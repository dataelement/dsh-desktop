/**
 * Welcome-notice state derived from the welcome settings scope. The scope is
 * the transport: a loopback browser follows the durable Host section, while a
 * remote browser's memory-mode scope never answers and the acknowledgement
 * stays process-local here.
 */
import { type SnapshotStore } from '@deepseek-ai/dsh-client-store';
import type { SettingsScope } from '@deepseek-ai/dsh-client-ui-settings/client';
/** State rendered by the welcome step. */
export interface WelcomeNoticeState {
    status: 'idle' | 'loading' | 'ready' | 'saving' | 'error';
    acknowledged: boolean;
    error: string | null;
}
/** The welcome section as the notice reads it. */
export type WelcomeSection = Record<string, unknown>;
/**
 * Accept any object section verbatim; a malformed durable value reads as an
 * empty section, so the notice treats it as unacknowledged instead of leaving
 * the scope stuck on its previous value.
 * @param section - the wire section value.
 * @returns the section object, or an empty one for non-object values.
 */
export declare function decodeWelcomeSection(section: unknown): WelcomeSection;
/** Coordinates durable Host acknowledgement or a process-local remote fallback. */
export declare class WelcomeNoticeStore {
    private readonly scope;
    /** uSES-safe state source shared by the registered welcome step. */
    readonly store: SnapshotStore<WelcomeNoticeState>;
    private localAcknowledged;
    private saving;
    private following;
    /**
     * @param scope - the welcome settings namespace scope; its memory mode is
     * what keeps a remote browser process-local.
     */
    constructor(scope: SettingsScope<WelcomeSection>);
    /**
     * Begin following the bound scope (idempotent) and publish its current answer.
     * @returns settlement after the current answer is published.
     */
    load(): Promise<void>;
    /**
     * Persist this copy version, or advance only this process for a remote
     * browser. Success is judged against the state the write left behind, so a
     * refused or failed write reports false after its recovery read settles.
     * @returns true when the selected persistence mode holds the acknowledgement.
     */
    acknowledge(): Promise<boolean>;
    /** Stop following the scope. */
    dispose(): void;
    private derive;
}
//# sourceMappingURL=welcome-store.d.ts.map