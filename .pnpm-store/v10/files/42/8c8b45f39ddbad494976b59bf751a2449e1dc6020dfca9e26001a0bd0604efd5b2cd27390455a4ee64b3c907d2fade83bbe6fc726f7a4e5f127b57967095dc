/**
 * Host owner of the `credentials` Remote namespace: the reference half of
 * `ctx.credentials` as a browser configuration page reads and writes it.
 *
 * @module @deepseek-ai/dsh-api-settings-controller/src/credentials.ts
 */
import { Context } from '@deepseek-ai/cordis';
import type { CredentialInfo } from '@deepseek-ai/dsh-credentials/types';
import { TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol';
declare module '@deepseek-ai/cordis' {
    interface Context {
        /** Host owner of the `credentials` Remote namespace. */
        credentialsController: CredentialsController;
    }
}
/**
 * Host service backing the generated `ctx.remote.credentials` namespace. It
 * carries every wire obligation the credential seam itself does not: the batch
 * fan-out bound, the field-by-field view projection, the reference-grammar
 * guard, and the refusal mapping. Secret values cross in one direction only —
 * no method here returns one.
 */
export declare class CredentialsController extends TypertRemoteService {
    /** @param ctx - Host context where a credential provider may be mounted. */
    constructor(ctx: Context);
    /**
     * Describe several references for one configuration surface. Batched because
     * a settings page describes every reference its rows name at once, and one
     * round trip keeps those rows from settling separately.
     * @param refs - reference names, at most {@link MAX_DESCRIBE_REFS}; a name outside the grammar
     *   rejects the whole call as `gateway/bad-request`.
     * @returns one view per requested name, keyed by that name.
     * @throws RemoteError when the request is invalid or no credential provider is mounted.
     */
    describe(refs: string[]): Promise<Record<string, CredentialInfo>>;
    /**
     * Store one value from a configuration surface. The value crosses the wire in
     * this direction only: no read path returns it.
     * @param ref - reference name to store under.
     * @param value - the non-empty secret value.
     * @throws RemoteError when the request is invalid, no provider is mounted, or the provider refuses the write.
     */
    set(ref: string, value: string): Promise<void>;
    /**
     * Remove one reference from a configuration surface.
     * @param ref - reference name to remove.
     * @throws RemoteError when the request is invalid, no provider is mounted, or the provider refuses the write.
     */
    unset(ref: string): Promise<void>;
    /** Resolve the optional provider or report how to supply it. */
    private provider;
    /**
     * Run one remote write and report every refusal as `credential/rejected`
     * carrying the seam's own message: a read-only source shadowing the reference
     * is what a configuration surface must show verbatim. Callers brand the
     * reference before entering, so a name outside the grammar never reaches this
     * path and fails the same way it does on the read side. The details name only
     * the reference, so no failure path can carry the value back out.
     */
    private write;
}
export default CredentialsController;
//# sourceMappingURL=credentials.d.ts.map