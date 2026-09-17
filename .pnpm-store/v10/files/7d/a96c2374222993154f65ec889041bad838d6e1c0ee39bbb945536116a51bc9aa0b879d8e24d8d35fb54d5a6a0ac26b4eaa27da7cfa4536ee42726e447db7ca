/**
 * Remote decorators and explicit Gateway bindings backed by versioned
 * descriptors carried on decorated class prototypes. Strict reflection
 * remains a Typert compiler responsibility.
 * @module @deepseek-ai/dsh-typert-protocol
 */
import { Service } from '@deepseek-ai/cordis';
export { RemoteError, remoteErrorOf } from "./remote-error.js";
const TYPERT_REMOTE_SEGMENT_PATTERN = /^[A-Za-z0-9_$.-]+$/;
/**
 * Test one generated Remote name against the Connection endpoint grammar.
 * @param value - namespace, method, lookup, or Context segment.
 * @returns whether the value can cross the shared RPC carrier unchanged.
 */
export function isTypertRemoteSegment(value) {
    return value !== '.' && value !== '..' && TYPERT_REMOTE_SEGMENT_PATTERN.test(value);
}
const REMOTE_METHOD_DESCRIPTOR = '@deepseek-ai/dsh-typert-protocol/remote-methods';
/**
 * Bind one visible Service field to a Cordis key and Remote namespace.
 * @param service - owning Service instance, normally `this`.
 * @param serviceKey - exact Cordis service key.
 * @param options - optional distinct wire namespace.
 * @returns a frozen, inspectable binding with no compiler-injected metadata.
 */
export function bindTypertRemote(service, serviceKey, options = {}) {
    validateName('service key', serviceKey);
    const namespace = options.namespace ?? serviceKey;
    validateName('namespace', namespace);
    return Object.freeze({ service, serviceKey, namespace });
}
/** Cordis Service base that exposes its registered name through Typert Gateway. */
export class TypertRemoteService extends Service {
    /** Visible binding consumed by the Gateway's source-mode discovery. */
    typertRemote;
    /**
     * Register the Service and bind the same key to Typert Gateway.
     * @param ctx - owning Cordis Context.
     * @param serviceKey - exact Cordis service key and default wire namespace.
     * @param options - optional distinct wire namespace.
     */
    constructor(ctx, serviceKey, options = {}) {
        super(ctx, serviceKey);
        this.typertRemote = bindTypertRemote(this, this.name, options);
    }
}
export function Remote(methodExportOrOptions, context) {
    if (typeof methodExportOrOptions === 'string') {
        validateName('Remote export name', methodExportOrOptions);
        return remoteDecorator({ kind: 'direct' }, undefined, methodExportOrOptions);
    }
    if (typeof methodExportOrOptions === 'object') {
        if (remoteOptionMode(methodExportOrOptions) !== 'stream'
            || Reflect.ownKeys(methodExportOrOptions).length !== 1) {
            throw new TypeError('typert-protocol: Remote options must contain exactly mode: "stream"');
        }
        return remoteDecorator({ kind: 'direct' }, 'stream');
    }
    if (context === undefined)
        throw new TypeError('typert-protocol: Remote decorator context is missing');
    addMarkerInitializer(context, { kind: 'direct' });
}
function remoteOptionMode(options) {
    return Reflect.get(options, 'mode');
}
function remoteDecorator(invocation, mode, exportName) {
    return function (_method, context) {
        addMarkerInitializer(context, invocation, mode, exportName);
    };
}
/**
 * Create a decorator for a method resolved from one Remote Scope.
 * @param key - scope key declared through the Context map.
 * @param exportName - optional Remote export name; defaults to the method name.
 * @returns a standard method decorator that records a versioned prototype descriptor.
 */
export function RemoteScope(key, exportName) {
    validateName('Scope key', key);
    if (exportName !== undefined)
        validateName('Remote export name', exportName);
    return remoteDecorator({ kind: 'context', context: key }, undefined, exportName);
}
/**
 * Read Remote markers attached to a live Service's class prototype.
 * The returned snapshot cannot mutate the stored descriptor.
 * @param service - live Service instance.
 * @returns markers in class declaration order.
 */
export function remoteMethods(service) {
    const prototype = Object.getPrototypeOf(service);
    if (prototype === null)
        return [];
    return (readRemoteMethodDescriptor(prototype)?.methods ?? []).map(marker => ({ ...marker }));
}
function readRemoteMethodDescriptor(prototype) {
    const property = Object.getOwnPropertyDescriptor(prototype, REMOTE_METHOD_DESCRIPTOR);
    if (property === undefined)
        return undefined;
    const descriptor = property.value;
    if (descriptor === null || typeof descriptor !== 'object') {
        throw new TypeError('typert-protocol: Remote method descriptor must be an object');
    }
    const version = Reflect.get(descriptor, 'version');
    if (version !== 1) {
        throw new TypeError(`typert-protocol: unsupported Remote method descriptor version ${String(version)}`);
    }
    const methods = Reflect.get(descriptor, 'methods');
    if (!Array.isArray(methods)) {
        throw new TypeError('typert-protocol: Remote method descriptor methods must be an array');
    }
    return descriptor;
}
function addMarkerInitializer(context, invocation, mode, exportName) {
    if (context.private || context.static || typeof context.name !== 'string') {
        throw new TypeError('typert-protocol: Remote decorators require a public instance method with a string name');
    }
    const method = context.name;
    context.addInitializer(function () {
        const prototype = Object.getPrototypeOf(this);
        if (prototype === null) {
            throw new TypeError(`typert-protocol: cannot mark Remote method "${method}" on an object without a prototype`);
        }
        mark(prototype, method, invocation, mode, exportName);
    });
}
function mark(prototype, method, invocation, mode, exportName) {
    const descriptor = readRemoteMethodDescriptor(prototype);
    const marker = Object.freeze({
        method,
        ...(exportName === undefined || exportName === method ? {} : { exportName }),
        ...(mode === undefined ? {} : { mode }),
        invocation: Object.freeze(invocation),
    });
    const current = descriptor?.methods.find(candidate => candidate.method === method);
    if (current !== undefined) {
        if (current.exportName === marker.exportName
            && current.mode === marker.mode
            && sameInvocation(current.invocation, invocation))
            return;
        throw new Error(`typert-protocol: Remote method "${method}" has conflicting invocation markers`);
    }
    Object.defineProperty(prototype, REMOTE_METHOD_DESCRIPTOR, {
        configurable: true,
        value: Object.freeze({
            version: 1,
            methods: Object.freeze([...(descriptor?.methods ?? []), marker]),
        }),
    });
}
function sameInvocation(left, right) {
    if (left.kind === 'direct')
        return right.kind === 'direct';
    if (right.kind === 'direct')
        return false;
    return left.context === right.context;
}
function validateName(subject, value) {
    if (!isTypertRemoteSegment(value)) {
        throw new TypeError(`typert-protocol: ${subject} must contain only RPC endpoint segment characters`);
    }
}
//# sourceMappingURL=index.js.map