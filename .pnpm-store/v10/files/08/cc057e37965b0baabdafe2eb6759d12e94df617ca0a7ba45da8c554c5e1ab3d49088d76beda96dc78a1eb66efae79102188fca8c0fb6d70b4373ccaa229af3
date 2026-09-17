/**
 * `ctx.resources`: the provider registry and the per-address states behind
 * `useResource`.
 *
 * A record is kept for every address ever sourced and is never dropped; what
 * the last release discards is its state (the stream is aborted and the
 * snapshot returns to idle). Keeping the record keeps `source()` reference-stable
 * across React's render-then-subscribe window and a StrictMode remount, where a
 * recreated record would make every render resubscribe and restart the stream.
 */
import type { Context } from '@deepseek-ai/cordis';
import { type ObservableSnapshot } from '@deepseek-ai/dsh-client-store';
import type { ResourceProtocol, ResourceProvider, Resources, ResourceSnapshot } from './contract.ts';
/**
 * The one URL scheme resource addresses use: `dsh-resource://<type>/…`, where
 * the host names the protocol. Other schemes (`sidebar://…`) are navigation
 * addresses and name no resource.
 */
export declare const RESOURCE_SCHEME = "dsh-resource";
/**
 * The protocol key of one address: the host of a `dsh-resource://` URL, as the
 * URL parser reads it (lower-cased). Any other string — another scheme, or one
 * the URL parser rejects — names no protocol and is treated like an address
 * whose protocol has no provider.
 * @param address - the full address.
 * @returns the protocol key, or `undefined` when the address is not a resource address.
 */
export declare function protocolOf(address: string): string | undefined;
/** The `ctx.resources` implementation. */
export declare class ResourceRegistry implements Resources {
    private readonly ctx;
    private readonly providers;
    private readonly records;
    /** @param ctx - Context whose effects own the registered providers. */
    constructor(ctx: Context);
    register<P extends ResourceProtocol>(provider: ResourceProvider<P>): () => void;
    pin(address: string, signal: AbortSignal): void;
    source(address: string): ObservableSnapshot<ResourceSnapshot<unknown>>;
    private record;
    private create;
    private providerOf;
    private recordsOf;
    private hold;
    private release;
    /** The provider arrived: a held record opens its stream, an idle one turns `loading`. */
    private attach;
    /** The provider left: the stream ends and the record reports `none`. */
    private detach;
    private start;
    private stop;
    /** Failures arrive as frames; a throw inside the stream is left to surface. */
    private consume;
}
//# sourceMappingURL=resources.d.ts.map