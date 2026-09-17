/**
 * PowerShell executable resolution, dependency-free so non-package consumers
 * (the repository's coverage-gate probe in `vitest.config.ts`) can share the
 * ONE resolution definition with the executor and its suites — a probe that
 * resolved differently from the code under test could exempt a file whose
 * suites actually run.
 *
 * @module @deepseek-ai/dsh-pwsh-local/resolve
 */
/**
 * Well-known Windows PowerShell install locations plus PATH entries, newest
 * first. Explicitly parameterized (env) so resolution is a pure function of
 * its inputs on every platform.
 * @param env - the environment to probe; defaults to the process environment.
 * @returns candidate `pwsh` executable paths in resolution order.
 */
export declare function candidatePwshPaths(env?: NodeJS.ProcessEnv): string[];
/**
 * Resolve the pwsh executable this executor spawns.
 * @param configured - an explicit `pwshPath` config value, trusted as-is.
 * @param env - the environment to probe on Windows; defaults to the process environment.
 * @param platform - the platform to resolve for; defaults to the process platform.
 * @returns the first existing well-known location on Windows (PowerShell 7
 *   install, a PATH entry such as the Microsoft Store install, then Windows
 *   PowerShell 5.1), else `pwsh` for PATH resolution.
 */
export declare function resolvePwshPath(configured?: string, env?: NodeJS.ProcessEnv, platform?: NodeJS.Platform): string;
//# sourceMappingURL=resolve.d.ts.map