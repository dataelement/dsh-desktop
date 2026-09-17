var _a;
import { members as installMembers } from "./util.js";
/** A special constant with type `never` */
export const NEVER = /*@__PURE__*/ Object.freeze({
    status: "aborted",
});
/* Shared descriptor for installing `_zod`; defineProperty reads it
 * synchronously, so reusing one object avoids a per-instance allocation. */
const _zodDesc = { value: undefined, enumerable: false };
// null where suppressing the capture would be unrecoverable: `parse()` puts the frames back with `captureStackTrace`, so without it the throw would lose its stack. also latched to null once `stackTraceLimit` proves unassignable, which a realm can do at any point by hardening Error
let _E = "captureStackTrace" in Error ? Error : null;
// v8 captures a stack trace inside the Error constructor, which dominates a failed parse; costs only the frames, and parse() restores those. the constructor must RUN: Object.create is cheaper and passes instanceof, but Error.isError and util.types.isNativeError check an internal slot
function newError(Definition) {
    const E = _E;
    if (E) {
        const saved = E.stackTraceLimit;
        if (typeof saved === "number") {
            try {
                E.stackTraceLimit = 0;
            }
            catch {
                _E = null;
                return new Definition();
            }
            try {
                return new Definition();
            }
            finally {
                E.stackTraceLimit = saved;
            }
        }
    }
    return new Definition();
}
export /*@__NO_SIDE_EFFECTS__*/ function $constructor(name, initializer, 
/** This trait's members, installed once on every prototype that composes it. They cannot be declared in the initializer above: that runs per instance, and the prototype is shared. */
proto, params) {
    // Prototype for this constructor's `_zod` internals. Lazily-derived fields (`values`, `pattern`, `optin`, …) install here once rather than as an accessor on every instance.
    const zodProto = {};
    // Assigning the fields in the constructor body is what gives instances in-object slots; building the object literally and reparenting it costs a second allocation and a generic property copy.
    function Internals(def) {
        this.def = def;
        this.constr = _;
        this.traits = new Set();
    }
    Internals.prototype = zodProto;
    const protoMembers = proto;
    // One trait's members land on every prototype whose chain composes it, so the answer is per prototype rather than per trait.
    const initialized = protoMembers && new WeakSet();
    function init(inst, def) {
        if (!inst._zod) {
            _zodDesc.value = new Internals(def);
            try {
                Object.defineProperty(inst, "_zod", _zodDesc);
            }
            finally {
                // Cleared even on throw, so the shared descriptor never leaks one instance's internals into the next.
                _zodDesc.value = undefined;
            }
        }
        else if (inst._zod.traits.has(name)) {
            return;
        }
        inst._zod.traits.add(name);
        initializer(inst, def);
        if (initialized) {
            // `super(def)` from a user subclass gives `this` a prototype the subclass owns, and installing there would overwrite whatever the subclass declared. `constr` built the instance, so its prototype is the one below the subclass's that should carry the members. A receiver whose chain never reaches that prototype installs on its own, which for a plain object handed straight to `init` means `Object.prototype` — unchanged from before.
            const own = Object.getPrototypeOf(inst);
            const ctorProto = inst._zod.constr.prototype;
            let up = own;
            while (up && up !== ctorProto)
                up = Object.getPrototypeOf(up);
            const target = up ?? own;
            if (!initialized.has(target)) {
                initialized.add(target);
                installMembers(target, protoMembers);
            }
        }
        // support prototype modifications; for-in avoids the array allocation of Object.keys on the (usually empty) prototype
        const proto = _.prototype;
        for (const k in proto) {
            if (!Object.prototype.hasOwnProperty.call(proto, k))
                continue;
            if (!(k in inst)) {
                inst[k] = proto[k].bind(inst);
            }
        }
    }
    // doesn't work if Parent has a constructor with arguments
    const Parent = params?.Parent ?? Object;
    class Definition extends Parent {
    }
    Object.defineProperty(Definition, "name", { value: name });
    function _(def) {
        const inst = params?.Parent ? newError(Definition) : this;
        init(inst, def);
        const deferred = inst._zod.deferred;
        if (deferred) {
            for (const fn of deferred) {
                fn();
            }
            // Released: initializers run once, and the list would otherwise be retained for the schema's lifetime.
            inst._zod.deferred = undefined;
        }
        // Global post-processor hook. Internal: installed by `import "zod/compile"` to enable AOT compilation for every constructed schema. Runs last, once the instance is fully built, because it hands the instance to compile(). The post-processor is expected to be reentrancy-guarded by its own implementation.
        const pp = globalThis.__zod_globalConfig?.postProcessor;
        if (pp)
            pp(inst);
        return inst;
    }
    Object.defineProperty(_, "init", { value: init });
    Object.defineProperty(_, Symbol.hasInstance, {
        value: (inst) => {
            if (params?.Parent && inst instanceof params.Parent)
                return true;
            return inst?._zod?.traits?.has(name);
        },
    });
    Object.defineProperty(_, "name", { value: name });
    return _;
}
//////////////////////////////   UTILITIES   ///////////////////////////////////////
export const $brand = /*@__PURE__*/ Symbol("zod_brand");
export class $ZodAsyncError extends Error {
    constructor() {
        super(`Encountered Promise during synchronous parse. Use .parseAsync() instead.`);
    }
}
export class $ZodEncodeError extends Error {
    constructor(name) {
        super(`Encountered unidirectional transform during encode: ${name}`);
        this.name = "ZodEncodeError";
    }
}
(_a = globalThis).__zod_globalConfig ?? (_a.__zod_globalConfig = {});
export const globalConfig = globalThis.__zod_globalConfig;
export function config(newConfig) {
    if (newConfig)
        Object.assign(globalConfig, newConfig);
    return globalConfig;
}
