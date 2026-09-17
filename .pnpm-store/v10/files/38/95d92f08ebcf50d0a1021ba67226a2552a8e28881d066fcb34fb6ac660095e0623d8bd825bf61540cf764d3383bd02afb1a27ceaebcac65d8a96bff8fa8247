/**
 * Host owner of the `credentials` Remote namespace: the reference half of
 * `ctx.credentials` as a browser configuration page reads and writes it.
 *
 * @module @deepseek-ai/dsh-api-settings-controller/src/credentials.ts
 */
var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
};
var __esDecorate = (this && this.__esDecorate) || function (ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
    function accept(f) { if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected"); return f; }
    var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
    var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
    var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
    var _, done = false;
    for (var i = decorators.length - 1; i >= 0; i--) {
        var context = {};
        for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
        for (var p in contextIn.access) context.access[p] = contextIn.access[p];
        context.addInitializer = function (f) { if (done) throw new TypeError("Cannot add initializers after decoration has completed"); extraInitializers.push(accept(f || null)); };
        var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
        if (kind === "accessor") {
            if (result === void 0) continue;
            if (result === null || typeof result !== "object") throw new TypeError("Object expected");
            if (_ = accept(result.get)) descriptor.get = _;
            if (_ = accept(result.set)) descriptor.set = _;
            if (_ = accept(result.init)) initializers.unshift(_);
        }
        else if (_ = accept(result)) {
            if (kind === "field") initializers.unshift(_);
            else descriptor[key] = _;
        }
    }
    if (target) Object.defineProperty(target, contextIn.name, descriptor);
    done = true;
};
import { credentialRef } from '@deepseek-ai/dsh-credentials';
import { Remote, RemoteError, TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol';
import { z } from 'zod';
/**
 * Fan-out bound on one remote `describe` batch. A settings page asks about the
 * references its own rows name, so this is far above any real page and still
 * keeps one authenticated request from starting unbounded provider work.
 */
const MAX_DESCRIBE_REFS = 64;
const credentialRefSchema = z.string().regex(/^[A-Za-z_][A-Za-z0-9_]*$/);
const describeRequestSchema = z.object({
    refs: z.array(credentialRefSchema).max(MAX_DESCRIBE_REFS),
});
const setRequestSchema = z.object({ ref: credentialRefSchema, value: z.string().min(1) });
const unsetRequestSchema = z.object({ ref: credentialRefSchema });
/** Parse the domain constraints that are more specific than generated TypeScript codecs. */
function parseRequest(method, schema, value) {
    const parsed = schema.safeParse(value);
    if (!parsed.success) {
        throw new RemoteError('gateway/bad-request', `invalid payload for ${method}`, { issues: parsed.error.issues });
    }
    return parsed.data;
}
/**
 * Copy exactly the fields {@link CredentialInfo} declares. The Gateway returns
 * a business result without decoding it, so a provider whose `describe` carried
 * extra enumerable properties would otherwise serialize them to the caller.
 * @param info - the provider's answer for one reference.
 * @returns the same facts with nothing else attached.
 */
function projectCredentialInfo(info) {
    return {
        configured: info.configured,
        ...info.source === undefined ? {} : { source: info.source },
        writable: info.writable,
    };
}
/**
 * Host service backing the generated `ctx.remote.credentials` namespace. It
 * carries every wire obligation the credential seam itself does not: the batch
 * fan-out bound, the field-by-field view projection, the reference-grammar
 * guard, and the refusal mapping. Secret values cross in one direction only —
 * no method here returns one.
 */
let CredentialsController = (() => {
    let _classSuper = TypertRemoteService;
    let _instanceExtraInitializers = [];
    let _describe_decorators;
    let _set_decorators;
    let _unset_decorators;
    return class CredentialsController extends _classSuper {
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
            _describe_decorators = [Remote];
            _set_decorators = [Remote];
            _unset_decorators = [Remote];
            __esDecorate(this, null, _describe_decorators, { kind: "method", name: "describe", static: false, private: false, access: { has: obj => "describe" in obj, get: obj => obj.describe }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _set_decorators, { kind: "method", name: "set", static: false, private: false, access: { has: obj => "set" in obj, get: obj => obj.set }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _unset_decorators, { kind: "method", name: "unset", static: false, private: false, access: { has: obj => "unset" in obj, get: obj => obj.unset }, metadata: _metadata }, null, _instanceExtraInitializers);
            if (_metadata) Object.defineProperty(this, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        }
        /** @param ctx - Host context where a credential provider may be mounted. */
        constructor(ctx) {
            super(ctx, 'credentialsController', { namespace: 'credentials' });
            __runInitializers(this, _instanceExtraInitializers);
        }
        /**
         * Describe several references for one configuration surface. Batched because
         * a settings page describes every reference its rows name at once, and one
         * round trip keeps those rows from settling separately.
         * @param refs - reference names, at most {@link MAX_DESCRIBE_REFS}; a name outside the grammar
         *   rejects the whole call as `gateway/bad-request`.
         * @returns one view per requested name, keyed by that name.
         * @throws RemoteError when the request is invalid or no credential provider is mounted.
         */
        async describe(refs) {
            const request = parseRequest('credentials.describe', describeRequestSchema, { refs });
            const branded = request.refs.map(ref => [ref, credentialRef(ref)]);
            const credentials = this.provider();
            const entries = await Promise.all(branded.map(async ([ref, key]) => [ref, projectCredentialInfo(await credentials.describe(key))]));
            return Object.fromEntries(entries);
        }
        /**
         * Store one value from a configuration surface. The value crosses the wire in
         * this direction only: no read path returns it.
         * @param ref - reference name to store under.
         * @param value - the non-empty secret value.
         * @throws RemoteError when the request is invalid, no provider is mounted, or the provider refuses the write.
         */
        async set(ref, value) {
            const request = parseRequest('credentials.set', setRequestSchema, { ref, value });
            const branded = credentialRef(request.ref);
            const credentials = this.provider();
            await this.write(request.ref, () => credentials.set(branded, request.value));
        }
        /**
         * Remove one reference from a configuration surface.
         * @param ref - reference name to remove.
         * @throws RemoteError when the request is invalid, no provider is mounted, or the provider refuses the write.
         */
        async unset(ref) {
            const request = parseRequest('credentials.unset', unsetRequestSchema, { ref });
            const branded = credentialRef(request.ref);
            const credentials = this.provider();
            await this.write(request.ref, () => credentials.unset(branded));
        }
        /** Resolve the optional provider or report how to supply it. */
        provider() {
            const credentials = this.ctx.get('credentials');
            if (credentials === undefined) {
                throw new RemoteError('gateway/internal', 'credentials service is absent: this deployment does not mount a credential provider (e.g. @deepseek-ai/dsh-credentials-local) in its composition', {});
            }
            return credentials;
        }
        /**
         * Run one remote write and report every refusal as `credential/rejected`
         * carrying the seam's own message: a read-only source shadowing the reference
         * is what a configuration surface must show verbatim. Callers brand the
         * reference before entering, so a name outside the grammar never reaches this
         * path and fails the same way it does on the read side. The details name only
         * the reference, so no failure path can carry the value back out.
         */
        async write(ref, write) {
            try {
                await write();
            }
            catch (error) {
                throw new RemoteError('credential/rejected', error instanceof Error ? error.message : String(error), { ref }, { cause: error });
            }
        }
    };
})();
export { CredentialsController };
export default CredentialsController;
//# sourceMappingURL=credentials.js.map