/**
 * The three adapters between pi-ai's auth model and the harness credential
 * plane. Every pi-ai-specific concept stays on this side of them: the harness
 * seams they consume — `ctx.credentials` records and `ctx.authorization` flows —
 * name nothing from this library, so another adapter family can arrive with a
 * different auth model and share the same two seams.
 *
 * @module dsh-llm-pi-ai/auth
 */
import type { AuthContext, CredentialStore } from '@earendil-works/pi-ai';
import type { Context } from '@deepseek-ai/cordis';
import type { CredentialKey } from '@deepseek-ai/dsh-credentials';
/**
 * The record scope every credential this adapter family stores is written
 * under. It is the plugin's registered name, which is what tells a later
 * reader — a configuration UI, or a second adapter family serving the same
 * provider name — that this plugin owns the format inside the record.
 */
export declare const RECORD_SCOPE = "llm-pi-ai";
/**
 * The record address for one pi-ai provider id.
 * @param providerId - pi-ai's own provider id, which is also the harness route key.
 * @returns the scoped credential key this adapter family reads and writes.
 */
export declare function recordKeyFor(providerId: string): CredentialKey;
/**
 * A pi-ai `CredentialStore` over the harness credential records.
 *
 * pi-ai runs OAuth refresh *inside* `modify()`, so this store's exclusion has
 * to cover a network round trip rather than a file rename — which is why the
 * record write path takes a wait limit of its own rather than the short one a
 * local write would need.
 *
 * pi-ai asks this store about every provider in the collection, hand-declared
 * routes included, and a route key is an arbitrary settings dict key while a
 * record id is not. An id outside the record grammar can never have stored a
 * record, so reads answer "nothing stored" and a delete has nothing to remove;
 * only `modify` refuses it, because a write that cannot land must not report
 * that it did.
 * @param ctx - the plugin context carrying the optional `ctx.credentials`.
 * @returns the store to hand `createModels()`.
 */
export declare function credentialStoreFrom(ctx: Context): CredentialStore;
/**
 * A pi-ai `AuthContext` over the harness credential plane and the host
 * filesystem.
 *
 * `env()` answers from the credential seam first, so a value a deployment
 * stored through the harness is found by a provider's own ambient discovery —
 * without this, that discovery reads only the process environment and a stored
 * `AWS_ACCESS_KEY_ID` is invisible to it. `fileExists()` answers about the host
 * process's own filesystem rather than the workspace `ctx.fs` seam, because the
 * paths it is asked about (`~/.aws/credentials`, application-default
 * credentials) are facts about where this process runs, not about the project
 * under edit.
 * @param ctx - the plugin context carrying the optional `ctx.credentials`.
 * @returns the auth context to hand `createModels()`.
 */
export declare function authContextFrom(ctx: Context): AuthContext;
//# sourceMappingURL=auth.d.ts.map