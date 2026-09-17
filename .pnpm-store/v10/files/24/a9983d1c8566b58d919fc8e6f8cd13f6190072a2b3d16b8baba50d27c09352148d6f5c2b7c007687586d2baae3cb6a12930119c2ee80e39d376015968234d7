/**
 * Event-only filesystem observation policy; it registers no service. A weak owner/target map
 * records every authoritative presence/absence observation, single-slot intent listeners derive
 * guards from that state, and the provider performs the atomic freshness/no-clobber check. Without
 * this plugin, tools retain the bare provider's unconditional mutation behavior. See the package
 * README for composition rules.
 * @module @deepseek-ai/dsh-fs-observation-policy
 */
import type { Context } from '@deepseek-ai/cordis';
export type { FsObservationActor } from './types.ts';
/** Cordis plugin name used by loader diagnostics. */
export declare const name = "fs-observation-policy";
/**
 * Register the three `fs/*` listeners. No `inject` — this plugin reads no
 * services; it operates only on its own `WeakMap`. The waterfalls are unbound
 * (the tool dispatches them with no `this`), so the listeners take the raw
 * `(target, actor, next)` arguments.
 */
export declare function apply(ctx: Context): void;
//# sourceMappingURL=index.d.ts.map