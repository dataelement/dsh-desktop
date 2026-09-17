/**
 * Internal platform-profile builders for the local sandbox provider.
 *
 * @module @deepseek-ai/dsh-sandbox-local/profiles
 */
import type { SandboxPolicy } from '@deepseek-ai/dsh-sandbox';
/**
 * Build the bwrap profile arguments for one file-effect policy.
 * @param policy - file-effect policy to express as bwrap mounts.
 * @returns profile arguments before the trailing separator and command argv.
 */
export declare function bwrapProfileArgs(policy: SandboxPolicy): string[];
/**
 * Build the Landlock launcher grants for one file-effect policy.
 * @param policy - file-effect policy to express as Landlock allow-list grants.
 * @returns launcher grant arguments before the trailing separator and command argv.
 */
export declare function landlockProfileArgs(policy: SandboxPolicy): string[];
/**
 * Build the sandbox-exec arguments and SBPL profile for one policy. The
 * writable roots come from the shared {@link writableRoots} helper (canonical,
 * deduplicated) so the Seatbelt grant and the in-process fs fence
 * (`@deepseek-ai/dsh-fs-sandbox`) can never drift apart.
 * @param policy - file-effect policy to express as an SBPL profile.
 * @returns sandbox-exec arguments before the trailing separator and command argv.
 */
export declare function seatbeltProfileArgs(policy: SandboxPolicy): string[];
//# sourceMappingURL=profiles.d.ts.map