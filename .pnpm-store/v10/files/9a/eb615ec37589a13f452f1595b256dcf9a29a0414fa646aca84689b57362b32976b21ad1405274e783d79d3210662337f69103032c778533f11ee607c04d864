/**
 * Public-network resolution and address-pinned HTTP transport for `web-fetch-http`.
 * One DNS answer set is validated before Undici receives it through a custom lookup,
 * so the connection cannot resolve the hostname again to a private address.
 *
 * @module @deepseek-ai/dsh-web-fetch-http/network
 */
import type { LookupAddress, LookupOptions } from 'node:dns';
import type { Dispatcher, Response } from 'undici';
/** One address resolved and retained for the subsequent pinned connection. */
export interface PublicAddress {
    /** Canonical textual IPv4 or IPv6 address. */
    readonly address: string;
    /** Address family accepted by Node's connection lookup callback. */
    readonly family: 4 | 6;
}
/** The result of one address-pinned request; closing releases its private pool. */
export interface PinnedResponse {
    /** HTTP response whose body remains readable until `close()` is called. */
    readonly response: Response;
    /** Release the request's dispatcher after the response body is consumed or cancelled. */
    close(): Promise<void>;
}
/** Resolver signature used to test public-address policy without process DNS changes. */
export type AddressResolver = (hostname: string, options: {
    all: true;
    order: 'verbatim';
}) => Promise<LookupAddress[]>;
/**
 * Return whether an address is globally reachable unicast. IPv4-mapped IPv6 is
 * classified by its embedded IPv4 address; transition and translation prefixes
 * remain blocked because their eventual IPv4 destination cannot be pinned here.
 *
 * @param input - textual IPv4 or IPv6 address.
 * @returns true only for a public unicast destination.
 */
export declare function isPublicIpAddress(input: string): boolean;
/**
 * Resolve a hostname once and reject the complete answer set if any destination
 * is not public. The returned addresses are the only ones the transport may use.
 *
 * @param hostname - URL hostname, including brackets when it is an IPv6 literal.
 * @param signal - aborts the wait for system resolution; an in-flight OS lookup may finish unused.
 * @param resolver - lookup implementation, overridden only by focused tests.
 * @returns the validated, non-empty address set.
 */
export declare function resolvePublicAddresses(hostname: string, signal: AbortSignal, resolver?: AddressResolver): Promise<PublicAddress[]>;
/**
 * Whether a hostname is an IP literal that {@link resolvePublicAddresses} would refuse.
 *
 * A proxied hop skips those checks because the proxy resolves the origin, but a literal needs no
 * resolution: the address is already stated, and handing it to a proxy running on this machine
 * would reach exactly the loopback or private service the checks exist to keep out of reach.
 *
 * @param hostname - a URL's hostname, bracketed or not.
 * @returns true when the host is a literal address no request may be sent to.
 */
export declare function isNonPublicIpLiteral(hostname: string): boolean;
/**
 * Fetch through an agent whose lookup callback returns only the already validated address set. The
 * URL hostname remains intact for HTTP Host and TLS SNI.
 *
 * The agent is this request's own because the address set is: pinning is how this package refuses a
 * DNS answer that changes between validation and connection, and it may not apply process-wide —
 * an operator-configured MCP server or model endpoint on loopback is a supported destination, and
 * only the URLs this tool fetches are the model's to choose.
 *
 * @param url - validated HTTP(S) URL the policy does not route through a proxy.
 * @param addresses - public addresses returned by {@link resolvePublicAddresses}.
 * @param headers - request headers.
 * @param signal - request and body-read cancellation signal.
 * @returns a response plus the disposer its consumer must call.
 */
export declare function requestPinned(url: URL, addresses: readonly PublicAddress[], headers: Record<string, string>, signal: AbortSignal): Promise<PinnedResponse>;
/**
 * Fetch through the dispatcher the proxy policy already installed, letting the proxy resolve the
 * origin.
 *
 * No address set is pinned because none exists to pin: the proxy performs the lookup, and a
 * connection pinned to a locally resolved address would reach the origin directly and defeat the
 * proxy. The dispatcher is the process-wide one, so hops share its connection pool and no caller
 * closes it.
 *
 * @param dispatcher - the route's dispatcher, from `proxyRouteFor`.
 * @param url - validated HTTP(S) URL the policy routes through a proxy.
 * @param headers - request headers.
 * @param signal - request and body-read cancellation signal.
 * @returns a response plus a disposer that releases nothing, so both paths close alike.
 */
export declare function requestVia(dispatcher: Dispatcher, url: URL, headers: Record<string, string>, signal: AbortSignal): Promise<PinnedResponse>;
/** Production network operations kept as an object so provider tests can replace resolution only. */
export declare const publicHttpNetwork: {
    resolve: typeof resolvePublicAddresses;
    request: typeof requestPinned;
    requestVia: typeof requestVia;
};
type LookupCallback = (error: NodeJS.ErrnoException | null, address: string | LookupAddress[], family?: number) => void;
/**
 * Build the connector lookup that serves a fixed validated answer set.
 *
 * @param addresses - public addresses retained from the preceding resolution.
 * @returns a Node-compatible lookup callback that performs no network resolution.
 */
export declare function createPinnedLookup(addresses: readonly PublicAddress[]): (hostname: string, options: LookupOptions, callback: LookupCallback) => void;
export {};
//# sourceMappingURL=network.d.ts.map