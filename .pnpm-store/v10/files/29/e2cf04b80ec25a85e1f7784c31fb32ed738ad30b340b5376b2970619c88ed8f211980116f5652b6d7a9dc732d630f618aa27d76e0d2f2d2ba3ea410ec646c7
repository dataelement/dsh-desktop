/**
 * Mount one preset composition under an agent's scope context, then prove the
 * result is usable before the agent is published.
 *
 * The scope context is what makes the composition per-session: entry contexts
 * chain to the context the subtree was plugged into, so every `ctx.tools`
 * and `ctx.systemPrompt` registration inside the preset files into that
 * agent's layer and unwinds with it. Two guards make that safe. A row that
 * never reached a usable state is rejected, because a directly-plugged subtree
 * is absent from `ctx.loader.entries()` and no boot audit covers it. A row that
 * published a service into the ROOT realm is rejected, because such a service
 * is process-global rather than per-session and the second session mounting the
 * same preset collides with the first.
 * @module @deepseek-ai/dsh-agent-presets/mount
 */
import { Context, type Fiber } from '@deepseek-ai/cordis';
import type { EntryTree } from '@deepseek-ai/cordis-plugin-loader';
import { type ScopeKey } from '@deepseek-ai/dsh-scope';
import type { AgentPreset } from './preset.ts';
/** One preset composition currently installed under some agent. */
export interface PresetMount {
    /** The preset the subtree was composed from. */
    readonly presetId: string;
    /** The mounted subtree's fiber. */
    readonly fiber: Fiber;
    /** Loader entry tree whose active rows form this standing composition. */
    readonly tree: EntryTree;
    /** The standing scope key agents are parented to (undefined only in torn-down records). */
    readonly key: ScopeKey | undefined;
}
/**
 * Every preset composition still installed, pruning fibers disposed since the
 * last read.
 *
 * The record set is module state and therefore spans every Cordis runtime in
 * the process; a reader that serves one runtime passes that runtime's root
 * fiber so another runtime mounting the same preset id (a second embedded
 * app, a test's second harness) never answers for it.
 * @param within - when present, only mounts inside this fiber's subtree.
 * @returns the live mounts.
 */
export declare function livePresetMounts(within?: Fiber): PresetMount[];
/**
 * Service names the mounted subtree published into the root realm.
 *
 * A provider without an `isolate` realm stores its implementation under the
 * root's symbol for that name, which is exactly the comparison below; a
 * provider inside an `isolate` realm stores under a realm-private symbol and
 * is correctly absent here.
 * @param ctx - any context of the runtime whose service store is inspected.
 * @param mount - the mounted subtree's fiber.
 * @returns the leaked service names in lexical order.
 */
export declare function leakedServices(ctx: Context, mount: Fiber): string[];
/** A live standing mount located through one agent already joined to it. */
export type JoinedPresetMount = PresetMount & {
    /** The standing key, definite because it is what the lookup matched on. */
    readonly key: ScopeKey;
};
/**
 * The standing composition one agent is joined to.
 *
 * The agent's own key is parented to its preset's standing key, so the mount
 * is found by matching that parent rather than by walking up from the agent —
 * the mount is not under the agent's fiber. An agent that joined no preset —
 * a deployment composing no roster, or a child agent before its join — has no
 * parent link and resolves to undefined.
 * @param agentCtx - the agent's scope context.
 * @returns the mount the agent joined, or undefined when it joined none.
 */
export declare function standingMountFor(agentCtx: Context): JoinedPresetMount | undefined;
/**
 * One agent's instance of a service its preset mounted.
 *
 * A preset publishes a service behind an `isolate` realm so two sessions
 * cannot collide, and an entry-local realm is invisible to everything outside
 * the group — including the agent's own scope context and the host. That is
 * right for the rows inside the group and wrong for one caller: a request that
 * is ABOUT a session but arrives from outside it, which is every browser RPC
 * the api-proxy serves.
 *
 * Ownership is the same relation {@link leakedServices} reads, inverted: there
 * it names implementations a subtree published into the ROOT realm, here it
 * names the one this subtree published anywhere. Fiber membership is object
 * identity for the reason stated on {@link withinFiber}.
 *
 * This is READ addressing for a caller that already holds the agent. It is not
 * a general host handle on a session's internals: a host row that `inject`s a
 * service cannot use it, because injection resolves before any session exists
 * and has no agent to key by — such a service belongs on the host plane.
 * @param ctx - any context of the runtime whose service store is inspected.
 * @param agent - the agent whose mounted composition to look inside.
 * @param name - the service name as the preset's rows resolve it.
 * @returns the agent's instance, or undefined when its preset mounts none.
 */
export declare function serviceForAgent<K extends string & keyof Context>(ctx: Context, agent: {
    ctx: Context;
}, name: K): Context[K] | undefined;
/**
 * Rows that did not reach a usable state, each rendered as one diagnostic line.
 *
 * A row whose module failed to import or whose plugin threw already rejects the
 * mount through the loader; what remains observable here is a row still waiting
 * for a service the composition never supplies.
 * @param tree - the mounted subtree.
 * @returns one line per unusable row, empty when every enabled row is usable.
 */
export declare function inactiveRows(tree: EntryTree): string[];
/**
 * Mount `preset` under `agentCtx` and return only once every row is usable.
 *
 * The subtree is owned by `agentCtx`'s fiber, so it unwinds with the agent and
 * the caller receives no disposer. A rejection leaves nothing mounted.
 * @param agentCtx - the agent's scope context, from the agent factory's `setup`.
 * @param preset - the resolved preset to compose the agent from.
 * @throws when `agentCtx` carries no scope, a row is unusable, or a row
 * published a service into the root realm.
 */
export declare function mountPreset(agentCtx: Context, preset: AgentPreset): Promise<void>;
//# sourceMappingURL=mount.d.ts.map