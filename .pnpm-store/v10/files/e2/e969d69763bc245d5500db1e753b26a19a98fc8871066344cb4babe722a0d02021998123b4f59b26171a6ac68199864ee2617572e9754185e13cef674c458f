/**
 * Host directory-picking Remote owner: capability gating, cancellation, and the
 * stable wire failure vocabulary over the `ctx.directoryPicker` seam.
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
import { z } from 'zod';
import { DirectoryPickerError } from '@deepseek-ai/dsh-host-directory-picker';
import { Remote, RemoteError, TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol';
const createDirectoryRequestSchema = z.object({
    path: z.string(),
    name: z.string(),
}).refine(request => request.name.trim() !== '' && request.name !== '.' && request.name !== '..'
    && !/[/\\]/.test(request.name), { message: 'host.createDirectory requires a single non-blank path segment name' });
/**
 * Host service backing the generated `ctx.remote.directoryPicker` namespace. The
 * seam it exports is abstract and therefore never a Loader entry of its own, so
 * this controller carries the wire verbs: one composed backend serves either the
 * native chooser or the browse primitives, and a verb the composition cannot
 * serve is refused rather than approximated.
 */
let DirectoryPickerController = (() => {
    let _classSuper = TypertRemoteService;
    let _instanceExtraInitializers = [];
    let _pick_decorators;
    let _list_decorators;
    let _createDirectory_decorators;
    return class DirectoryPickerController extends _classSuper {
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
            _pick_decorators = [Remote('pick')];
            _list_decorators = [Remote('list')];
            _createDirectory_decorators = [Remote('createDirectory')];
            __esDecorate(this, null, _pick_decorators, { kind: "method", name: "pick", static: false, private: false, access: { has: obj => "pick" in obj, get: obj => obj.pick }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _list_decorators, { kind: "method", name: "list", static: false, private: false, access: { has: obj => "list" in obj, get: obj => obj.list }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _createDirectory_decorators, { kind: "method", name: "createDirectory", static: false, private: false, access: { has: obj => "createDirectory" in obj, get: obj => obj.createDirectory }, metadata: _metadata }, null, _instanceExtraInitializers);
            if (_metadata) Object.defineProperty(this, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        }
        static inject = ['directoryPicker'];
        /** @param ctx - Host context carrying the composed directory-picking backend. */
        constructor(ctx) {
            super(ctx, 'directoryPickerController', { namespace: 'directoryPicker' });
            __runInitializers(this, _instanceExtraInitializers);
        }
        /**
         * Open the host's OS chooser for a Remote caller.
         * @param signal - caller lifetime; abort terminates the chooser.
         * @returns the chosen absolute path, or null when the operator cancels.
         */
        async pick(signal) {
            const capability = this.requireCapability('native', 'pick');
            try {
                return await capability.pick(signal);
            }
            catch (error) {
                throw cancellableFailure(error, signal, 'directory picker was aborted', 'directory picker failed');
            }
        }
        /**
         * List one directory level for a Remote caller's in-app browser.
         * @param path - absolute directory to list; absent lists the home directory.
         * @param signal - caller lifetime; abort stops the backend's scan instead of
         *   letting it outlive a disconnected caller.
         * @returns the level's listing with its ancestry.
         */
        async list(path, signal) {
            const capability = this.requireCapability('browse', 'list');
            try {
                return await capability.list(path, signal);
            }
            catch (error) {
                throw cancellableFailure(error, signal, 'directory listing was aborted');
            }
        }
        /**
         * Create one child directory for a Remote caller's in-app browser.
         * @param path - absolute existing parent directory.
         * @param name - single non-blank path segment.
         * @returns the created directory's absolute path.
         */
        async createDirectory(path, name) {
            const request = createDirectoryRequestSchema.safeParse({ path, name });
            if (!request.success) {
                throw new RemoteError('gateway/bad-request', 'invalid payload for host.createDirectory', { issues: request.error.issues });
            }
            const capability = this.requireCapability('browse', 'createDirectory');
            try {
                return await capability.createDirectory(request.data.path, request.data.name);
            }
            catch (error) {
                throw browseFailure(error);
            }
        }
        /** Resolve the capability one wire verb needs, or refuse with the kind this backend serves. */
        requireCapability(kind, method) {
            const capability = this.ctx.directoryPicker.capability();
            if (capability.kind !== kind) {
                throw new RemoteError('directory-picker/unavailable', `directoryPicker.${method} needs the ${kind} capability; the composed picker serves "${capability.kind}"`, { capability: capability.kind });
            }
            return capability;
        }
    };
})();
export { DirectoryPickerController };
/**
 * Wire code answered for each seam browse failure. The seam's closed codes are
 * its own local vocabulary, so this controller owns the projection onto the
 * `directory-picker/*` codes a Remote caller discriminates on.
 */
const BROWSE_FAILURE_CODES = {
    'directory-unreadable': 'directory-picker/unreadable',
    'directory-exists': 'directory-picker/exists',
    'directory-create-failed': 'directory-picker/create-failed',
};
/**
 * Classify a browse-primitive rejection: the seam's own closed codes carry the
 * path they are about, and anything else stays an infrastructure failure.
 * @param error - the primitive's rejection.
 * @returns the failure to throw across the Remote boundary.
 */
function browseFailure(error) {
    if (error instanceof DirectoryPickerError) {
        return new RemoteError(BROWSE_FAILURE_CODES[error.code], error.message, { path: error.path }, { cause: error });
    }
    return new RemoteError('gateway/internal', errorMessage(error), {}, { cause: error });
}
/**
 * Classify a cancellable primitive's rejection. An abort is the caller's own
 * timeout or disconnect, not a backend failure, so it answers `gateway/cancelled`
 * before the business classification runs.
 * @param error - the primitive's rejection.
 * @param signal - the caller lifetime the primitive ran under.
 * @param cancelled - operator-facing text for the abort outcome.
 * @param failed - prefix for a non-seam failure, when the verb has no closed codes.
 * @returns the failure to throw across the Remote boundary.
 */
function cancellableFailure(error, signal, cancelled, failed) {
    if (signal.aborted)
        return new RemoteError('gateway/cancelled', cancelled, {}, { cause: error });
    if (failed === undefined)
        return browseFailure(error);
    return new RemoteError('gateway/internal', `${failed}: ${errorMessage(error)}`, {}, { cause: error });
}
function errorMessage(error) {
    return error instanceof Error ? error.message : String(error);
}
//# sourceMappingURL=directory-picker.js.map