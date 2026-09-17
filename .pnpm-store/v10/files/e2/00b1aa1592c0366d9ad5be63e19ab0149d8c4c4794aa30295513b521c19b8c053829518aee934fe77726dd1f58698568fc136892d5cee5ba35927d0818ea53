/**
 * The session-log record of which preset a session actually runs.
 *
 * The creation header names the preset a session STARTED with, and it is
 * deep-frozen because that is a creation fact. A session may still change
 * preset while it is blank, and the effect of that change outlives the blank
 * window: the first turn — and every turn after it — runs under the newly
 * mounted composition. Recording the change is what keeps the log honest, and
 * it is required outright by the repo's model-visible ⟺ logged rule, since the
 * preset decides the tool schemas and prompt sections the model sees.
 *
 * Reconstruction reads the `agentPreset` Session projection, never the header
 * alone.
 * @module @deepseek-ai/dsh-agent-presets/session
 */
import { z } from 'zod';
declare module '@deepseek-ai/dsh-session/types' {
    interface SessionEventMap {
        /**
         * The session's agent preset was chosen after creation, while the session
         * was still blank. Log-only: it records the composition later turns ran
         * under, so a resumed or forked session rebuilds the same one instead of
         * the header's creation-time value.
         */
        'agent-preset/selected': {
            agentPreset: string;
        };
    }
}
/** Current Session preset, initialized from its header and advanced by selection events. */
export declare const agentPresetProjectionDefinition: {
    key: "agentPreset";
    stateSchema: z.ZodUnion<readonly [z.ZodString, z.ZodNull]>;
    init: (header: import("@deepseek-ai/dsh-session").SessionHeader) => string | null;
    apply: (state: string | null, event: import("@deepseek-ai/dsh-session").SessionEvent) => string | null;
    wire: {
        viewSchema: z.ZodUnion<readonly [z.ZodString, z.ZodNull]>;
        view: (state: string | null) => string | null;
    };
    stateVersion: number;
};
//# sourceMappingURL=session.d.ts.map