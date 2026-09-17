/**
 * Shared filesystem path helpers for DeepSeek Harness user data.
 *
 * @module @deepseek-ai/dsh-home-paths
 */
/** Directory name for the default DeepSeek Harness home under the OS home. */
export declare const DSH_HOME_DIR_NAME = ".dsh";
/** Stable user-facing display form for the default DeepSeek Harness home. */
export declare const DEFAULT_DSH_HOME_DISPLAY = "~/.dsh";
/** Environment variable that overrides the default DeepSeek Harness home. */
export declare const DSH_HOME_ENV = "DSH_HOME";
/**
 * Give a native filesystem watcher one canonical spelling of a path, even
 * when its final components do not exist yet. The deepest existing ancestor
 * is resolved through {@link realpath}; when a suffix is missing, that
 * ancestor is also proved to be an enumerable directory before the suffix is
 * restored. This prevents Windows from treating a regular-file ancestor as
 * ordinary absence, and prevents short-name aliases from being mixed with
 * long paths emitted by the native watcher backend.
 * @param path - Watch target or root, resolved against the current directory.
 * @returns the target with its existing ancestor canonicalized.
 * @throws when ancestor traversal encounters an error other than absence, or
 * the existing ancestor of a missing suffix is not an enumerable directory.
 */
export declare function canonicalizeWatchPath(path: string): Promise<string>;
/**
 * Resolve the default DeepSeek Harness home using Node's platform path rules.
 * @returns the absolute default harness home path.
 */
export declare function defaultDshHome(): string;
/**
 * Expand supported tilde prefixes against the operating-system home.
 * @param path - configured path that may begin with `~`, `~/`, or `~\`.
 * @returns the expanded path, or the original value when no supported prefix is present.
 */
export declare function expandHomePath(path: string): string;
/**
 * Resolve the single-root DeepSeek Harness home.
 *
 * Precedence, highest first: an explicit configured path, `$DSH_HOME`, then
 * `~/.dsh`. The harness keeps all user data under one root. An empty or
 * whitespace-only `$DSH_HOME` is treated as unset, so a blank override never
 * resolves the home to the current working directory.
 * @param configured - explicit harness-home override, which has highest precedence.
 * @param env - environment mapping used to read `DSH_HOME`.
 * @returns the normalized absolute harness home path.
 */
export declare function resolveDshHome(configured?: string, env?: Record<string, string | undefined>): string;
/**
 * Join path segments onto the resolved DeepSeek Harness home.
 * @param segments - path segments appended to the Harness home; an empty list returns the home itself.
 * @returns the normalized absolute joined path.
 */
export declare function dshHomePath(...segments: string[]): string;
/**
 * Describe a resolved harness home symbolically for user-facing display.
 *
 * It never returns an absolute machine path: the default home is labelled
 * `~/.dsh`, and any configured home is labelled `$DSH_HOME`.
 * @param resolvedHome - the absolute path returned by {@link resolveDshHome}.
 * @returns `~/.dsh` for the default home, otherwise `$DSH_HOME`.
 */
export declare function dshHomeDisplay(resolvedHome: string): string;
//# sourceMappingURL=index.d.ts.map