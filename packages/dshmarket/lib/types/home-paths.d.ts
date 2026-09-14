/**
 * Resolve the Harness home with the same semantics as the current
 * `@deepseek-ai/dsh-home-paths` package.
 */
/** Default single-root Harness home. */
export declare function defaultDshHome(): string;
/** Expand the tilde forms supported by DSH configuration. */
export declare function expandHomePath(path: string): string;
/**
 * Resolve an explicit home, `DSH_HOME`, or the default to one normalized
 * absolute path. Blank environment values are unset, matching DSH alpha.
 */
export declare function resolveDshHome(configured?: string, env?: Record<string, string | undefined>): string;
