/**
 * Proxy policy resolution: the pure, transport-free half of this package. It turns the launch
 * environment into one {@link ProxyPolicy}, and answers which proxy
 * (if any) a given URL goes through.
 *
 * Nothing here imports `undici`, so the module stays loadable in the browser-worker runtime that
 * evaluates `dsh-web-fetch-http` without a Node transport.
 * @module @deepseek-ai/dsh-http-proxy/policy
 */
/**
 * The one thing resolution needs from an environment: a name in, the winning value out. The
 * launcher's snapshot satisfies this structurally and is passed unchanged, so this module names no
 * package to describe its input — and a test builds one from an object literal.
 */
export interface EnvLookup {
    /**
     * Resolve one variable name.
     * @param name - the variable name.
     * @returns the winning entry, or `undefined` when nothing supplies it.
     */
    get(name: string): {
        readonly value: string;
    } | undefined;
}
/**
 * Loopback entries merged into every policy's `noProxy`. A proxy that also serves the harness's own
 * loopback traffic turns the Web UI, the Connection transport, and every local test server into a
 * routing loop, so the bypass is not optional.
 *
 * `::1` and `[::1]` are both listed because the resolved string is also handed to undici, whose
 * matcher reads a bare `::1` as host `:` port `1` and therefore never bypasses it.
 */
export declare const LOOPBACK_NO_PROXY: readonly string[];
/**
 * The environment names each policy field owns, lowercase first — undici reads the lowercase name
 * first, so both casings are always written or cleared together.
 */
export declare const POLICY_ENV_NAMES: {
    readonly httpProxy: readonly ["http_proxy", "HTTP_PROXY"];
    readonly httpsProxy: readonly ["https_proxy", "HTTPS_PROXY"];
    readonly noProxy: readonly ["no_proxy", "NO_PROXY"];
};
/**
 * Every environment name that carries proxy configuration, including the `ALL_PROXY` fallback this
 * package resolves but never writes back. A caller that must isolate a child from the machine's
 * network policy clears exactly these.
 */
export declare const PROXY_ENV_NAMES: readonly string[];
/**
 * One resolved outbound proxy policy. Plain data with no methods: worker threads receive it through
 * `workerData`'s structured clone, so both sides run the identical policy rather than each re-reading
 * an environment they may not share.
 */
export interface ProxyPolicy {
    /** Proxy for `http:` origins, or absent for a direct connection. Always a validated `http(s):` URL. */
    readonly httpProxy?: string;
    /** Proxy for `https:` origins, or absent for a direct connection. Always a validated `http(s):` URL. */
    readonly httpsProxy?: string;
    /** The bypass list, already merged with {@link LOOPBACK_NO_PROXY}. Empty when nothing is bypassed. */
    readonly noProxy: string;
    /** Which layer supplied the winning proxy URL; `env` when either field came from the environment. */
    readonly source: 'env' | 'none';
}
/** A policy that proxies nothing. Callers that have not installed a policy resolve URLs against this. */
export declare const DIRECT_POLICY: ProxyPolicy;
/** Why one candidate proxy value was not used. Callers decide whether this warns or fails the load. */
export interface ProxyDiagnostic {
    /** `socks` for a SOCKS or PAC URL this package cannot route; `invalid` for anything unparseable. */
    readonly kind: 'socks' | 'invalid';
    /** The environment variable that supplied the rejected value. */
    readonly origin: string;
    /** Operator-facing sentence naming the rejection and the way forward. Carries no credential. */
    readonly message: string;
}
/** A resolved policy plus every candidate value that was rejected on the way to it. */
export interface ProxyResolution {
    /** The policy to install. Never carries a rejected value. */
    readonly policy: ProxyPolicy;
    /** Rejections, in the order the candidates were considered. Empty on a clean resolution. */
    readonly diagnostics: readonly ProxyDiagnostic[];
}
/**
 * Whether a proxy URL is one this package accepts: parseable, with an `http:` or `https:` scheme.
 * The same test {@link acceptProxyUrl} applies, without its diagnostics.
 *
 * @param value - the proxy URL as an environment variable holds it.
 * @returns true when the URL would be accepted.
 */
export declare function isSupportedProxyUrl(value: string): boolean;
/**
 * Whether a host names this machine.
 *
 * A proxy cannot meaningfully reach one: it would resolve the address in its own network, and a
 * proxy running on this machine would reach a service that only listens on loopback. The bypass
 * list carries {@link LOOPBACK_NO_PROXY} for the consumers that read an environment rather than a
 * policy, but those are four literal entries — matching them alone leaves `127.0.0.2`, the whole
 * rest of `127.0.0.0/8`, and the IPv4-mapped spelling routed through the proxy.
 *
 * @param hostname - a URL's hostname, bracketed or not.
 * @returns true when the host is loopback or the unspecified address.
 */
export declare function isLoopbackHost(hostname: string): boolean;
/**
 * Decide whether a bypass list exempts one URL. An entry names a host and matches it together with
 * every subdomain under it — `example.com` also bypasses `api.example.com` — and a leading `.` or
 * `*.` is accepted as the same thing; an entry may carry a `:port`, and `*` bypasses everything.
 * CIDR notation is not matched —
 * an operating system's bypass list often carries `10.0.0.0/8`, which must be rewritten as suffixes.
 *
 * @param noProxy - the effective bypass list.
 * @param url - the request URL.
 * @returns true when the URL must bypass the proxy.
 */
export declare function bypassesProxy(noProxy: string, url: URL): boolean;
/**
 * Resolve the outbound proxy policy for this process.
 *
 * A scheme's own variable wins, then `ALL_PROXY`, then — for HTTPS only — the HTTP proxy, matching
 * undici so this function and the installed dispatcher never disagree about one URL.
 *
 * @param env - the launch environment, whose own layering already prefers real variables over `.env` files.
 * @returns the policy to install plus every rejected candidate.
 */
export declare function resolveProxyPolicy(env: EnvLookup): ProxyResolution;
/**
 * Resolve which proxy one URL goes through under a policy.
 *
 * This is the single answer both the installed dispatcher and `dsh-web-fetch-http` consult, so a URL
 * can never be pinned to a resolved address by one and tunnelled by the other.
 *
 * @param policy - the active policy.
 * @param url - the request URL.
 * @returns the proxy URL to tunnel through, or `undefined` for a direct connection.
 */
export declare function proxyForUrl(policy: ProxyPolicy, url: URL): string | undefined;
//# sourceMappingURL=policy.d.ts.map