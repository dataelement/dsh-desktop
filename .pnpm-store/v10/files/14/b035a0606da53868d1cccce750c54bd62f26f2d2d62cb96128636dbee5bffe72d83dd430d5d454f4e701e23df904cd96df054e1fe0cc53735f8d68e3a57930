//#region lib/types/policy.js
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
* Loopback entries merged into every policy's `noProxy`. A proxy that also serves the harness's own
* loopback traffic turns the Web UI, the Connection transport, and every local test server into a
* routing loop, so the bypass is not optional.
*
* `::1` and `[::1]` are both listed because the resolved string is also handed to undici, whose
* matcher reads a bare `::1` as host `:` port `1` and therefore never bypasses it.
*/
const LOOPBACK_NO_PROXY = [
	"localhost",
	"127.0.0.1",
	"::1",
	"[::1]"
];
/**
* The environment names each policy field owns, lowercase first — undici reads the lowercase name
* first, so both casings are always written or cleared together.
*/
const POLICY_ENV_NAMES = {
	httpProxy: ["http_proxy", "HTTP_PROXY"],
	httpsProxy: ["https_proxy", "HTTPS_PROXY"],
	noProxy: ["no_proxy", "NO_PROXY"]
};
/**
* Every environment name that carries proxy configuration, including the `ALL_PROXY` fallback this
* package resolves but never writes back. A caller that must isolate a child from the machine's
* network policy clears exactly these.
*/
const PROXY_ENV_NAMES = [
	...Object.values(POLICY_ENV_NAMES).flat(),
	"all_proxy",
	"ALL_PROXY"
];
/** Proxy URL schemes this package routes through. Everything else is reported, never silently dropped. */
const SUPPORTED_PROTOCOLS = new Set(["http:", "https:"]);
/** Schemes recognised well enough to name in a diagnostic instead of calling them malformed. */
const SOCKS_PROTOCOLS = new Set([
	"socks:",
	"socks4:",
	"socks4a:",
	"socks5:",
	"socks5h:"
]);
/** A policy that proxies nothing. Callers that have not installed a policy resolve URLs against this. */
const DIRECT_POLICY = {
	noProxy: "",
	source: "none"
};
/**
* Read one environment name in undici's precedence order — lowercase first, uppercase as the
* fallback — treating a blank value as unset. Blank matters: undici's own `??` chain lets an empty
* lowercase name shadow a populated uppercase one.
*
* @param env - the launch environment snapshot to read.
* @param lower - the lowercase variable name.
* @returns the trimmed value and the name that supplied it, or `undefined` when neither is set.
*/
function readEnv(env, lower) {
	for (const name of [lower, lower.toUpperCase()]) {
		const value = env.get(name)?.value.trim();
		if (value !== void 0 && value !== "") return {
			value,
			name
		};
	}
}
/** A slot nobody filled. */
const ABSENT = { kind: "absent" };
/**
* Validate one candidate proxy URL.
*
* @param candidate - the raw value and the origin to name in a diagnostic.
* @param diagnostics - collector the rejection is appended to.
* @returns the candidate's usability, distinguishing a rejected slot from an empty one.
*/
function acceptProxyUrl(candidate, diagnostics) {
	if (candidate === void 0) return ABSENT;
	const parsed = URL.parse(candidate.value);
	if (parsed === null) {
		diagnostics.push({
			kind: "invalid",
			origin: candidate.name,
			message: `${candidate.name} is not a valid URL; connecting directly`
		});
		return { kind: "rejected" };
	}
	if (SOCKS_PROTOCOLS.has(parsed.protocol)) {
		diagnostics.push({
			kind: "socks",
			origin: candidate.name,
			message: `${candidate.name} names a SOCKS proxy, which is not supported; connecting directly for that scheme — set an http:// or https:// proxy URL instead`
		});
		return { kind: "rejected" };
	}
	if (!SUPPORTED_PROTOCOLS.has(parsed.protocol)) {
		diagnostics.push({
			kind: "invalid",
			origin: candidate.name,
			message: `${candidate.name} uses the unsupported ${parsed.protocol}// scheme; connecting directly for that scheme — set an http:// or https:// proxy URL instead`
		});
		return { kind: "rejected" };
	}
	return {
		kind: "accepted",
		value: candidate.value
	};
}
/**
* Whether a proxy URL is one this package accepts: parseable, with an `http:` or `https:` scheme.
* The same test {@link acceptProxyUrl} applies, without its diagnostics.
*
* @param value - the proxy URL as an environment variable holds it.
* @returns true when the URL would be accepted.
*/
function isSupportedProxyUrl(value) {
	const parsed = URL.parse(value);
	return parsed !== null && SUPPORTED_PROTOCOLS.has(parsed.protocol);
}
/**
* Resolve one scheme's proxy from its own slot, then the fallbacks — but only when the scheme's own
* slot was empty. A rejected slot keeps that scheme direct, so the diagnostic and the route agree.
*
* @param own - what the scheme's own name supplied.
* @param fallbacks - values to try in order when `own` is absent.
* @returns the proxy URL for that scheme, or `undefined` for a direct connection.
*/
function resolveScheme(own, ...fallbacks) {
	if (own.kind === "accepted") return own.value;
	if (own.kind === "rejected") return void 0;
	return fallbacks.find((value) => value !== void 0);
}
/**
* Merge {@link LOOPBACK_NO_PROXY} into a bypass list, preserving the caller's entries and order.
* A list of `*` already bypasses everything and is returned unchanged.
*
* @param noProxy - the bypass list as the environment supplied it.
* @returns the effective bypass list.
*/
function withLoopback(noProxy) {
	const entries = (noProxy ?? "").split(/[,\s]+/).map((entry) => entry.trim()).filter((entry) => entry !== "");
	if (entries.includes("*")) return "*";
	const present = new Set(entries.map((entry) => entry.toLowerCase()));
	return [...entries, ...LOOPBACK_NO_PROXY.filter((entry) => !present.has(entry))].join(",");
}
/**
* Split one bypass entry into host and optional port.
*
* A bare IPv6 literal carries several colons and no port, so only a single-colon entry splits;
* a bracketed literal takes its port from after the bracket. Getting this wrong is how undici
* turns `::1` into host `:` port `1`.
*
* @param entry - one already-trimmed bypass entry.
* @returns the entry's host and, when it carries one, its port.
*/
function splitHostPort(entry) {
	if (entry.startsWith("[")) {
		const close = entry.indexOf("]");
		if (close !== -1) {
			const rest = entry.slice(close + 1);
			const host = entry.slice(1, close);
			return rest.startsWith(":") ? {
				host,
				port: rest.slice(1)
			} : { host };
		}
	}
	const colon = entry.indexOf(":");
	if (colon !== -1 && entry.indexOf(":", colon + 1) === -1) return {
		host: entry.slice(0, colon),
		port: entry.slice(colon + 1)
	};
	return { host: entry };
}
/** One IPv4 octet, so a loopback match cannot accept `127.999.1.1`. */
const OCTET = "(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)";
/** The whole `127.0.0.0/8` block, not just its first address. */
const LOOPBACK_IPV4 = new RegExp(`^127\\.${OCTET}\\.${OCTET}\\.${OCTET}$`);
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
function isLoopbackHost(hostname) {
	const host = hostname.replace(/^\[|\]$/g, "").replace(/\.$/, "").toLowerCase();
	if (host === "localhost" || host.endsWith(".localhost")) return true;
	if (host === "::1" || host === "::" || host === "0.0.0.0") return true;
	const mappedHigh = /^::ffff:([0-9a-f]{1,4}):[0-9a-f]{1,4}$/.exec(host)?.[1];
	if (mappedHigh !== void 0) return Number.parseInt(mappedHigh, 16) >>> 8 === 127;
	return LOOPBACK_IPV4.test(host.startsWith("::ffff:") ? host.slice(7) : host);
}
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
function bypassesProxy(noProxy, url) {
	const host = url.hostname.replace(/^\[|\]$/g, "").replace(/\.$/, "").toLowerCase();
	const port = url.port !== "" ? url.port : url.protocol === "https:" ? "443" : "80";
	for (const raw of noProxy.split(/[,\s]+/)) {
		const entry = raw.trim().toLowerCase();
		if (entry === "") continue;
		if (entry === "*") return true;
		const split = splitHostPort(entry);
		if (split.port !== void 0 && split.port !== port) continue;
		const candidate = split.host.replace(/^\*?\./, "").replace(/\.$/, "");
		if (candidate === "") continue;
		if (host === candidate || host.endsWith(`.${candidate}`)) return true;
	}
	return false;
}
/**
* Resolve the outbound proxy policy for this process.
*
* A scheme's own variable wins, then `ALL_PROXY`, then — for HTTPS only — the HTTP proxy, matching
* undici so this function and the installed dispatcher never disagree about one URL.
*
* @param env - the launch environment, whose own layering already prefers real variables over `.env` files.
* @returns the policy to install plus every rejected candidate.
*/
function resolveProxyPolicy(env) {
	const diagnostics = [];
	const all = acceptProxyUrl(readEnv(env, "all_proxy"), diagnostics);
	const allValue = all.kind === "accepted" ? all.value : void 0;
	const envHttp = acceptProxyUrl(readEnv(env, "http_proxy"), diagnostics);
	const envHttps = acceptProxyUrl(readEnv(env, "https_proxy"), diagnostics);
	const httpProxy = resolveScheme(envHttp, allValue);
	const httpsProxy = resolveScheme(envHttps, allValue, httpProxy);
	if (httpProxy === void 0 && httpsProxy === void 0) return {
		policy: DIRECT_POLICY,
		diagnostics
	};
	return {
		policy: {
			...httpProxy === void 0 ? {} : { httpProxy },
			...httpsProxy === void 0 ? {} : { httpsProxy },
			noProxy: withLoopback(readEnv(env, "no_proxy")?.value),
			source: "env"
		},
		diagnostics
	};
}
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
function proxyForUrl(policy, url) {
	const proxy = url.protocol === "https:" ? policy.httpsProxy : url.protocol === "http:" ? policy.httpProxy : void 0;
	if (proxy === void 0) return void 0;
	if (isLoopbackHost(url.hostname)) return void 0;
	return bypassesProxy(policy.noProxy, url) ? void 0 : proxy;
}
//#endregion
//#region lib/types/install.js
/**
* Proxy installation: the transport half of this package. It owns undici's global dispatcher and the
* process-wide record of which policy is active.
*
* `undici` is imported dynamically so the pure {@link ProxyPolicy} half stays loadable where no Node
* transport exists, matching how `dsh-web-fetch-http` defers its own transport import.
* @module @deepseek-ai/dsh-http-proxy/install
*/
/** The active policy, or `undefined` until one is installed. Process-wide, like the dispatcher it tracks. */
let active;
/**
* The proxy environment as the user exported it, or `undefined` when no policy is installed.
*
* Owned by the OUTERMOST install: one layered over the launcher's would otherwise record the outer
* policy's published values as if the user had written them, and
* hand every child a normalization the user never asked for.
*
* {@link proxyEnvironmentForChild} keeps a value the user set rather than the one this process resolved from
* it, so a SOCKS proxy `curl` can use is not replaced by an HTTP proxy named for another scheme.
*/
let inheritedProxyEnv;
/** The dispatcher installed with {@link active}, so a route can hand back the one already routing. */
let installed;
/** A route that sends nothing through a proxy, shared because it carries no per-request state. */
const DIRECT_ROUTE = { proxied: false };
/**
* Decide how to send one request, and hand back the transport that decision assumed.
*
* @param url - the request URL.
* @returns the proxied route with its proxy URL and dispatcher, or the direct route.
*/
function proxyRouteFor(url) {
	const policy = active;
	const dispatcher = installed;
	if (policy === void 0 || dispatcher === void 0) return DIRECT_ROUTE;
	const proxy = proxyForUrl(policy, url);
	return proxy === void 0 ? DIRECT_ROUTE : {
		proxied: true,
		proxy,
		dispatcher
	};
}
/**
* Publish a policy through the proxy environment variables, which is how the consumers that read an
* environment rather than a policy object — `node:http`'s `proxyEnv` and every spawned child — see
* the one resolved answer, including the `ALL_PROXY` fallback and the merged loopback bypass that
* neither derives on its own. The global dispatcher does not read these; it routes by the policy.
*
* @param policy - the policy to publish.
* @returns a function restoring every name this call changed.
*/
function applyPolicyEnv(policy) {
	const previousInherited = inheritedProxyEnv;
	inheritedProxyEnv = previousInherited ?? snapshotProxyEnv();
	const published = {};
	for (const [field, names] of Object.entries(POLICY_ENV_NAMES)) {
		const value = policy[field];
		for (const name of names) published[name] = value;
	}
	const restore = writeProxyEnv(published);
	return () => {
		restore();
		inheritedProxyEnv = previousInherited;
	};
}
/**
* Read every proxy name this package publishes, as `process.env` holds it now.
*
* @returns one entry per name in {@link POLICY_ENV_NAMES}; `undefined` marks an absent name.
*/
function snapshotProxyEnv() {
	const snapshot = {};
	for (const names of Object.values(POLICY_ENV_NAMES)) for (const name of names) snapshot[name] = process.env[name];
	return snapshot;
}
/**
* Set every proxy name to the value `values` holds for it, removing a name whose value is `undefined`.
*
* @param values - the value each name in {@link POLICY_ENV_NAMES} should hold.
* @returns a function restoring every name to what it held before this call.
*/
function writeProxyEnv(values) {
	const previous = snapshotProxyEnv();
	for (const name of Object.keys(previous)) {
		const value = values[name];
		if (value === void 0) Reflect.deleteProperty(process.env, name);
		else process.env[name] = value;
	}
	return () => {
		for (const [name, value] of Object.entries(previous)) if (value === void 0) Reflect.deleteProperty(process.env, name);
		else process.env[name] = value;
	};
}
/**
* Build the global dispatcher for one policy.
*
* Routing runs through {@link proxyForUrl} per origin, so `fetch` and every caller that asks where a
* URL goes read the same answer from the same matcher. undici's `EnvHttpProxyAgent` cannot express
* this policy: with no `HTTPS_PROXY` present it reuses the HTTP proxy for `https:`, which would
* tunnel a scheme this package deliberately keeps direct after refusing the SOCKS or malformed URL
* the user named for it — the route and the diagnostic would then disagree.
*
* @param policy - the policy to route by; it must proxy at least one scheme.
* @returns the dispatcher to install, owning every per-origin agent its factory created.
*/
async function createPolicyDispatcher(policy) {
	const { Agent, Pool, ProxyAgent } = await import("undici");
	return new Agent({ factory(origin, options) {
		const passed = options;
		const proxy = proxyForUrl(policy, new URL(origin.toString()));
		if (proxy !== void 0) return new ProxyAgent({
			...passed,
			uri: proxy
		});
		return new Pool(origin, passed);
	} });
}
/**
* Route this process's outbound HTTP through `policy`.
*
* Installing replaces undici's global dispatcher, which is what Node's built-in `fetch` resolves, so
* every caller that issues a plain `fetch()` is covered without knowing this package exists. A policy
* that proxies nothing installs a direct dispatcher and leaves the environment untouched.
*
* A worker thread has its own `globalThis` and so its own dispatcher; installing here does not
* reach it. No worker installs one today: both this repository ships — the workflow engine and the
* code runtime — evaluate model-authored scripts, which must not receive a proxy URL that may carry
* credentials. A worker that needs the policy has to be handed one explicitly and install it itself.
*
* @param policy - the resolved policy to install.
* @returns a disposer restoring the previous dispatcher, policy, and environment, then closing the agent.
*/
async function installGlobalProxy(policy) {
	const previousPolicy = active;
	if (policy.source === "none") {
		if (previousPolicy === void 0) {
			active = policy;
			return () => {
				active = previousPolicy;
				return Promise.resolve();
			};
		}
		const previousInstalled = installed;
		const restoreEnv = inheritedProxyEnv === void 0 ? void 0 : writeProxyEnv(inheritedProxyEnv);
		const undici = await import("undici");
		const previous = undici.getGlobalDispatcher();
		const direct = new undici.Agent();
		undici.setGlobalDispatcher(direct);
		active = policy;
		installed = void 0;
		return async () => {
			undici.setGlobalDispatcher(previous);
			active = previousPolicy;
			installed = previousInstalled;
			restoreEnv?.();
			await direct.close();
		};
	}
	const restoreEnv = applyPolicyEnv(policy);
	const { getGlobalDispatcher, setGlobalDispatcher } = await import("undici");
	const previousDispatcher = getGlobalDispatcher();
	const previousInstalled = installed;
	const agent = await createPolicyDispatcher(policy);
	setGlobalDispatcher(agent);
	active = policy;
	installed = agent;
	return async () => {
		setGlobalDispatcher(previousDispatcher);
		active = previousPolicy;
		installed = previousInstalled;
		restoreEnv();
		await agent.close();
	};
}
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
function proxyEnvironmentForChild() {
	const policy = active;
	const inherited = inheritedProxyEnv;
	if (policy === void 0 || policy.source === "none" || inherited === void 0) return {};
	const overlay = { NODE_USE_ENV_PROXY: "1" };
	for (const [field, names] of Object.entries(POLICY_ENV_NAMES)) {
		const resolved = policy[field];
		const named = field !== "noProxy" && names.some((name) => inherited[name] !== void 0);
		for (const name of names) overlay[name] = named ? inherited[name] : resolved;
	}
	if ([...POLICY_ENV_NAMES.httpProxy, ...POLICY_ENV_NAMES.httpsProxy].some((name) => overlay[name] !== void 0 && !isSupportedProxyUrl(overlay[name]))) delete overlay.NODE_USE_ENV_PROXY;
	return overlay;
}
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
async function installProxyFromEnvironment(env, report) {
	const { policy, diagnostics } = resolveProxyPolicy(env);
	for (const diagnostic of diagnostics) report(diagnostic.message);
	return await installGlobalProxy(policy);
}
/**
* The environment overlay that removes every proxy name from a spawned child.
*
* A harness that replays a recorded session must reach its own fixture server, not the proxy a
* developer or a CI runner exported; `undefined` is how a spawn removes a name it inherits.
*
* @returns one entry per proxy name, each `undefined`.
*/
function clearedProxyEnv() {
	return Object.fromEntries(PROXY_ENV_NAMES.map((name) => [name, void 0]));
}
//#endregion
export { clearedProxyEnv, installProxyFromEnvironment, proxyEnvironmentForChild, proxyRouteFor };
