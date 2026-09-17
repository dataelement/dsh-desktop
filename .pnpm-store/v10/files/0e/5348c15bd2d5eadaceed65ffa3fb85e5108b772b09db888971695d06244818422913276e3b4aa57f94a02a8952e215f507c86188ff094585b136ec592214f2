/**
 * Browser-facing subagent control assembly: the catalog view sampled against
 * the live Agent registry, one browser zone's validation, and the stable
 * failure codes the Remote surface answers with.
 *
 * @module @deepseek-ai/dsh-subagent
 */
import type { Context } from '@deepseek-ai/cordis';
import type { SessionId } from '@deepseek-ai/dsh-session';
import { z } from 'zod';
import type { SubagentCatalog, SubagentListEntry } from './control-types.ts';
declare const CONTROL_ID_SCHEMAS: {
    readonly 'subagent.list': z.ZodObject<{
        parentSessionId: z.ZodString;
    }, z.core.$strip>;
    readonly 'subagent.prompt': z.ZodObject<{
        parentSessionId: z.ZodString;
        childSessionId: z.ZodString;
        mode: z.ZodLiteral<"continuable">;
        delivery: z.ZodEnum<{
            queue: "queue";
            steer: "steer";
        }>;
    }, z.core.$strip>;
    readonly 'subagent.interrupt': z.ZodObject<{
        parentSessionId: z.ZodString;
        childSessionId: z.ZodString;
        mode: z.ZodLiteral<"continuable">;
    }, z.core.$strip>;
};
/**
 * Apply the subagent payload checks that are stricter than generated
 * branded-string codecs.
 * @param method - method name carried in the failure message.
 * @param payload - decoded control fields to validate.
 * @throws {RemoteError} `gateway/bad-request` with the original Zod issues.
 */
export declare function validateControlRequest(method: keyof typeof CONTROL_ID_SCHEMAS, payload: unknown): void;
/**
 * Project one durable listing onto the catalog view, replacing each row's
 * store-derived activity with the live Agent driver's status and reporting
 * whether the exact parent Agent is live. Without an Agent registry no driver
 * runs at all, so every row is inactive and the parent is unavailable.
 * @param ctx - Host context that may carry the Agent registry.
 * @param parentSessionId - the listed parent.
 * @param entries - the durable direct-child listing.
 * @returns the catalog view answered to one browser.
 */
export declare function catalogView(ctx: Context, parentSessionId: SessionId, entries: readonly SubagentListEntry[]): SubagentCatalog;
/**
 * Refuse one catalog read while preserving cancellation and a missing
 * projections registry as distinct failures.
 * @param error - the thrown value.
 * @param signal - the caller's cancellation.
 * @returns Never — the refusal is thrown.
 * @throws {RemoteError} always.
 */
export declare function rejectCatalogRead(error: unknown, signal: AbortSignal): never;
/**
 * Refuse one continuation prompt without exposing provider detail: admission
 * failures the caller can act on keep their own code, everything else is
 * internal.
 * @param error - the thrown value.
 * @param childSessionId - the addressed child.
 * @param signal - the caller's cancellation.
 * @returns Never — the refusal is thrown.
 * @throws {RemoteError} always.
 */
export declare function rejectPrompt(error: unknown, childSessionId: SessionId, signal: AbortSignal): never;
export {};
//# sourceMappingURL=control.d.ts.map