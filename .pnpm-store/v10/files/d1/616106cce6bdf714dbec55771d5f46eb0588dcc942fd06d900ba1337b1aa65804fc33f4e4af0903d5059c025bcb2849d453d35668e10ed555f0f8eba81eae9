/**
 * @deepseek-ai/dsh-web-app — the browser-surface bundle's runtime glue plugin
 * plus the bundle patch (`cordis.patch.yml`, declared by the `dsh.bundle.patch`
 * manifest field). The plugin owns the browser-surface glue: it resolves
 * the built frontend dist (workspace knowledge of this bundle, never user
 * config), mounts the `frontend-static` fallback owner over it, registers the
 * harness-source and web-surface prompt sections, the bash-visible web runtime
 * variable, the process-token URL line, and the default-browser handoff. The
 * model and shell retain the clean URL. App command-line values arrive through
 * the `webStartup` service expressions in the bundle patch.
 * @module @deepseek-ai/dsh-web-app
 */
import type { Context } from '@deepseek-ai/cordis';
import z from '@deepseek-ai/schemastery';
/** Stable Cordis plugin name. */
export declare const name = "web-app";
/** Services required before the web runtime can mount. */
export declare const inject: string[];
/** Plugin config: composed deployment settings plus per-invocation command-line values. */
export interface Config {
    /** Permit default-browser handoff after the Loader tree settles; an SSH launch suppresses it. */
    openBrowser: boolean;
    /** Print the URL line on activation; a non-interactive layer can turn it off. */
    printUrl: boolean;
    /**
     * Register the model-visible surface context (the `app:web-surface` prompt
     * section and the `DSH_WEB_URL` bash variable). A one-shot non-interactive
     * layer can turn it off when its user is not in the GUI, so the
     * orientation text would be false.
     */
    surfaceContext: boolean;
    /** Explicit `--trusted-host` authorities from this invocation. */
    trustedHosts: string[];
}
export declare const Config: z<Config>;
/** Bind-dependent Web values shared by the trust fence and URL display. */
export interface WebRuntimeValues {
    /** LAN IPv4 literals sampled once when the server binds all interfaces. */
    lanAddresses: string[];
    /** LAN literals followed by explicit invocation authorities. */
    trustedHosts: string[];
}
/**
 * Resolve one LAN-trust snapshot from the active server bind.
 *
 * Derived entries are port-less IP literals: DNS rebinding needs an
 * attacker-controlled name, while an IP-literal Host is safe on any port and
 * an OS-assigned port is unknowable before bind.
 * @param bindHost - the active webserver bind host.
 * @param extra - explicit `--trusted-host` values, in argument order.
 * @returns the LAN display addresses and invocation-derived fence authorities.
 */
export declare function resolveLanTrust(bindHost: string, extra: readonly string[]): WebRuntimeValues;
/** Test hooks for the built dist and native browser handoff; production never mutates them. */
export declare const internals: {
    resolveDistIndex: () => string;
    openBrowser: (url: string) => Promise<void>;
};
/**
 * Mount the Web runtime: dist serving, surface prompt, the bash runtime
 * variable, the URL line, and the default-browser handoff.
 * @param ctx - plugin context carrying the webServer service.
 * @param config - validated {@link Config}.
 */
export declare function apply(ctx: Context, config: Config): void;
//# sourceMappingURL=index.d.ts.map