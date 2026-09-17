/**
 * Text renderers for `cordis_runtime_inspect`. Live facts come from the service store and
 * the plugin registry; what each service CAN DO comes from the generated
 * `api-catalog.ts`. This module owns the join of the two plus presentation: which
 * lines a section prints, how compact the default report stays, and what an exact
 * `name` adds.
 * @module @deepseek-ai/dsh-tool-cordis/inspect
 */
import type { Context, Fiber } from '@deepseek-ai/cordis';
import type { ScopeKey } from '@deepseek-ai/dsh-scope';
import type { Agent } from '@deepseek-ai/dsh-agent';
import type { EventApiEntry, InheritedApiEntry, ServiceApiEntry, TypeApiEntry } from './api-catalog.ts';
/**
 * Whether a fiber is `root` itself or mounted anywhere inside `root`'s subtree.
 * @param fiber - the fiber to locate.
 * @param root - the subtree root to test against.
 * @returns true when `fiber` belongs to that subtree.
 */
export declare function withinFiber(fiber: Fiber, root: Fiber): boolean;
/**
 * Service names provided by one mount's fiber subtree.
 * @param ctx - the runtime whose service registrations are inspected.
 * @param fiber - the root of the mounted fiber subtree.
 * @returns the provided service names in lexical order.
 */
export declare function providedServices(ctx: Context, fiber: Fiber): string[];
/**
 * Services a fiber declared in `inject` that do not exist yet — a settled fiber
 * that is not active is waiting on exactly these (legal cordis semantics: it
 * activates when the service appears).
 * @param ctx - the context to resolve service existence against.
 * @param fiber - the fiber whose `inject` declarations are checked.
 * @returns the missing service names, in declaration order.
 */
export declare function missingServices(ctx: Context, fiber: Fiber): string[];
/**
 * The `services` section: every live ctx service with its owning fiber and, when
 * the generated catalog covers it, a one-line summary. The `api` section is the
 * one that carries signatures; this one answers what exists and who provides it.
 * @param ctx - the runtime to enumerate.
 * @param api - the generated service entries whose summaries annotate the live ones.
 * @returns one line per service, or a single placeholder line when none are provided.
 */
export declare function describeServices(ctx: Context, api?: readonly ServiceApiEntry[]): string[];
/**
 * The `plugins` section: a flat list of every fiber the registry knows, one line
 * per fiber with its lifecycle state, sorted by plugin name (a plugin mounted
 * more than once repeats — one line per instance). Temporary plugins are listed
 * like any other plugin; their ids live in the `temporary` section.
 * @param ctx - the runtime whose registry is enumerated.
 * @returns one line per loaded plugin fiber.
 */
export declare function describePlugins(ctx: Context): string[];
/**
 * The `tools` section: the model-facing tool names the CALLING agent can see
 * (its scoped layer shadowing/joining the restricted global tool set) — the
 * honest answer to the tool description's "what you can call".
 * @param ctx - the runtime whose tool registry is read.
 * @param scope - the calling agent (the viewing scope); omitted = global view.
 * @returns one line per visible tool.
 */
export declare function describeTools(ctx: Context, scope?: ScopeKey): string[];
/**
 * The `temporary` section: one line per dynamic package this session defined,
 * with its metadata, which halves exist, the host half's lifecycle state and
 * provides/waits, the invoke methods it registered, and the last browser-half
 * load report. Session-scoped like every runner verb.
 * @param ctx - the runtime the packages live in.
 * @param agent - the calling agent; without one there is no definition space to report.
 * @returns one line per package, or a single placeholder line when none exist.
 */
export declare function describeDynamic(ctx: Context, agent?: Agent): string[];
/**
 * Render the generated catalog against the live runtime: live catalogued services with methods,
 * uncatalogued live services with owners, absent loadable services, referenced type shapes, and
 * inherited Context APIs.
 * @param ctx - the runtime to intersect the catalog with.
 * @param api - generated service entries, replaceable in tests.
 * @param name - exact live service key whose methods should include structured contracts; omitted for the compact catalog.
 * @param inherited - inherited `ctx` entries, replaceable in tests.
 * @param types - public type shapes, replaceable in tests.
 * @returns the section lines.
 */
export declare function describeApi(ctx: Context, api?: readonly ServiceApiEntry[], name?: string, inherited?: readonly InheritedApiEntry[], types?: readonly TypeApiEntry[]): string[];
/**
 * The `events` section: every harness event with its dispatch mode, one-line
 * summary, and exact signature, closed by the waterfall caution.
 * @param events - the event catalog (the generated one by default; injectable for tests).
 * @param name - exact event name whose signature should include its structured contract; omitted for the compact catalog.
 * @returns the section lines.
 */
export declare function describeEvents(events?: readonly EventApiEntry[], name?: string): string[];
//# sourceMappingURL=inspect.d.ts.map