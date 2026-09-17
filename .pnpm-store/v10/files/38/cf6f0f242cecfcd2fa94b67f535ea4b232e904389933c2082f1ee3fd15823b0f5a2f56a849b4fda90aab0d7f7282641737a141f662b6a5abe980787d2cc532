/**
 * Proxy installation: the transport half of this package. It owns undici's global dispatcher and the
 * process-wide record of which policy is active.
 *
 * `undici` is imported dynamically so the pure {@link ProxyPolicy} half stays loadable where no Node
 * transport exists, matching how `dsh-web-fetch-http` defers its own transport import.
 * @module @deepseek-ai/dsh-http-proxy/install
 */
import type { Dispatcher } from 'undici';
import { type EnvLookup } from './policy.ts';
/**
 * How this process must send one request.
 *
 * A caller that branches on the answer needs the transport that answer assumed, or an install or
 * disposal landing between the two would send the request somewhere the branch did not clear. The
 * proxied arm therefore carries the dispatcher already routing by this policy: it is process-wide
 * and long-lived, so a caller uses it and never closes it. Disposal closes that dispatcher rather
 * than destroying it, so a request already dispatched when a policy is unmounted still finishes.
 */
export type ProxyRoute = {
    readonly proxied: true;
    readonly proxy: string;
    readonly dispatcher: Dispatcher;
} | {
    readonly proxied: false;
};
/**
 * Decide how to send one request, and hand back the transport that decision assumed.
 *
 * @param url - the request URL.
 * @returns the proxied route with its proxy URL and dispatcher, or the direct route.
 */
export declare function proxyRouteFor(url: URL): ProxyRoute;
/**
 * The proxy environment a spawned child needs.
 *
 * A child inherits the parent environment, which this process rewrote to its own resolved policy.
 * Handing that normalization straight through would replace values the user set for other tools, so
 * each proxy name the user exported is restored to what they wrote: a SOCKS proxy `curl` uses is
 * not swapped for the HTTP one this package fell back to for that scheme.
 *
 * A scheme the user named in neither casing carries the resolved value instead of being removed.
 * Without that the child's routing silently diverges from its parent's: `NODE_USE_ENV_PROXY` does
 * not read `ALL_PROXY`, so a child of a parent that resolved its proxy from that name would connect
 * directly while the parent proxies.
 *
 * The bypass list is always the resolved one. It only ever adds the loopback entries to what
 * the user wrote, so nothing is lost, and the child stops sending its own localhost traffic to a
 * proxy that cannot route it.
 *
 * The flag reaches only Node 22.21+ and 24+; an older runtime keeps that child direct. Such a child
 * also matches bypass entries with Node's own `NO_PROXY` rules, which differ from this package's in
 * their separators and IPv4-range support. Non-Node children (curl, git, pnpm) ignore the flag and
 * read the variables themselves.
 *
 * The flag is withheld when a proxy value the child receives is one this package refused. Node
 * parses `HTTP_PROXY` and `HTTPS_PROXY` under that flag before running the program, and exits on a
 * scheme other than `http:` or `https:` — so a SOCKS value kept for `curl` would stop every Node
 * child from starting. Without the flag such a child connects directly, as this process already
 * reported for that scheme, and `curl` still reads the value it was kept for.
 *
 * A worker thread is deliberately NOT served here — see the workflow engine, which runs
 * model-authored scripts and must not receive a proxy URL that may carry credentials.
 *
 * @returns names to apply to the child environment, where `undefined` means remove, or an empty
 *   object when no proxy is active.
 */
export declare function proxyEnvironmentForChild(): Readonly<Record<string, string | undefined>>;
/**
 * Resolve this process's proxy policy from `env` and install it.
 *
 * Resolution, reporting, and installation are one operation because no caller needs them apart: the
 * launcher does all three in sequence before the first plugin mounts, and a policy resolved but not
 * installed routes nothing.
 *
 * A value the environment supplies but this package cannot use is reported and skipped rather than
 * thrown: the variable may have been exported for another tool, and a proxy the harness cannot use
 * must not stop the agent from starting.
 *
 * @param env - the launch environment, whose own layering already prefers real variables over `.env` files.
 * @param report - receives one message per rejected value, in the order the values were considered.
 * @returns a disposer restoring the previous dispatcher, policy, and environment.
 */
export declare function installProxyFromEnvironment(env: EnvLookup, report: (message: string) => void): Promise<() => Promise<void>>;
/**
 * The environment overlay that removes every proxy name from a spawned child.
 *
 * A harness that replays a recorded session must reach its own fixture server, not the proxy a
 * developer or a CI runner exported; `undefined` is how a spawn removes a name it inherits.
 *
 * @returns one entry per proxy name, each `undefined`.
 */
export declare function clearedProxyEnv(): Record<string, undefined>;
//# sourceMappingURL=install.d.ts.map