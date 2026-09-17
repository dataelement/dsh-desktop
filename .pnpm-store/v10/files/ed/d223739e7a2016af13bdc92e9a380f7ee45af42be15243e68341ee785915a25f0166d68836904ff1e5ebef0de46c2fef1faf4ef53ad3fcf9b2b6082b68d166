/** Browser availability/choice state and the launch carrier for the split button. */
import { type SnapshotStore } from '@deepseek-ai/dsh-client-store';
type Fetch = (input: string | URL, init?: RequestInit) => Promise<Response>;
/**
 * Owns the once-per-page availability read, the persisted last choice, and
 * the launch POST. Availability and choice publish through uSES-safe sources
 * so every Session header shares one truth.
 */
export declare class OpenInAppController {
    private readonly fetcher;
    /** Installed app ids in host menu order; null until the host answered. */
    readonly apps: SnapshotStore<readonly string[] | null>;
    /** Last chosen app id, or empty before the first choice, shared across sessions and browser restarts. */
    readonly choice: SnapshotStore<string>;
    private loading;
    /**
     * @param fetcher - HTTP carrier for the apps read and the launch POST.
     */
    constructor(fetcher?: Fetch);
    /**
     * Read availability once per controller life; concurrent calls share the read.
     * A failed read publishes an empty list, which renders no button at all.
     * @returns after availability is published.
     */
    load(): Promise<void>;
    /**
     * Remember one picked app id.
     * @param appId - catalog id from the availability list.
     */
    choose(appId: string): void;
    /**
     * Launch one installed app on a workspace directory.
     * @param appId - catalog id from the availability list.
     * @param path - the session's absolute workspace directory.
     * @returns after the host acknowledged the launch; rejects on any failure.
     */
    launch(appId: string, path: string): Promise<void>;
    private run;
}
export {};
//# sourceMappingURL=controller.d.ts.map