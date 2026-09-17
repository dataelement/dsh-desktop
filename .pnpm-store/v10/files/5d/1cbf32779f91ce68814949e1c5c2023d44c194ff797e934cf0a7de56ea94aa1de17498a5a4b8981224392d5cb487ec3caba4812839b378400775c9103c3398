let node_worker_threads = require("node:worker_threads");
let node_util = require("node:util");
//#region lib/types/output-json.js
/** JSON string-prefix accounting for the outer-output ledger. @module @deepseek-ai/dsh-code-runtime-worker-thread/output-json */
const intrinsicReflectApply$1 = Reflect.apply;
const intrinsicArrayIsArray$1 = Array.isArray;
const IntrinsicBuffer = Buffer;
const intrinsicBufferByteLength = Reflect.get(Buffer, "byteLength");
const intrinsicObjectCreate$1 = Object.create;
const intrinsicObjectDefineProperty$1 = Object.defineProperty;
const intrinsicObjectKeys$1 = Object.keys;
const intrinsicString = String;
const intrinsicStringCharCodeAt = Reflect.get(String.prototype, "charCodeAt");
const intrinsicStringCodePointAt = Reflect.get(String.prototype, "codePointAt");
const intrinsicStringSlice = Reflect.get(String.prototype, "slice");
/** Build a data descriptor that cannot inherit model-defined accessor fields. */
function dataDescriptor$1(value) {
	const descriptor = intrinsicObjectCreate$1(null);
	descriptor.value = value;
	return descriptor;
}
/** Define an ordinary enumerable data slot without a prototype-bearing descriptor. */
function defineEnumerableDataProperty$1(target, key, value) {
	const descriptor = dataDescriptor$1(value);
	descriptor.enumerable = true;
	descriptor.configurable = true;
	descriptor.writable = true;
	intrinsicObjectDefineProperty$1(target, key, descriptor);
}
/** UTF-8 byte length through the module-captured Node intrinsic. */
function byteLength(text) {
	return intrinsicReflectApply$1(intrinsicBufferByteLength, IntrinsicBuffer, [text, "utf8"]);
}
/** Append without consulting a model-mutated `Array.prototype`. */
function append$1(target, value) {
	defineEnumerableDataProperty$1(target, target.length, value);
}
/** Pop without consulting a model-mutated `Array.prototype`. */
function takeLast$1(target) {
	if (target.length === 0) return void 0;
	const index = target.length - 1;
	const value = target[index];
	intrinsicObjectDefineProperty$1(target, "length", dataDescriptor$1(index));
	return value;
}
/** One code-point-aligned character from a string. */
function characterAt(text, index) {
	return intrinsicReflectApply$1(intrinsicStringSlice, text, [index, index + (intrinsicReflectApply$1(intrinsicStringCodePointAt, text, [index]) > 65535 ? 2 : 1)]);
}
/** Serialized bytes contributed by one complete Unicode code point inside JSON quotes. */
function serializedCharacterBytes(character) {
	if (character.length === 2) return 4;
	if (character === "\"" || character === "\\") return 2;
	const code = intrinsicReflectApply$1(intrinsicStringCharCodeAt, character, [0]);
	if (code >= 55296 && code <= 57343) return 6;
	if (code < 32) return code === 8 || code === 9 || code === 10 || code === 12 || code === 13 ? 2 : 6;
	return byteLength(character);
}
/**
* Measure one JSON string without materializing its complete escaped form.
* @param text - the candidate string.
* @param maxBytes - largest serialized size the caller can admit.
* @returns Exact serialized bytes, or `undefined` as soon as the cap is crossed.
*/
function jsonStringBytesUpTo(text, maxBytes) {
	if (maxBytes < 2) return void 0;
	let bytes = 2;
	for (let index = 0; index < text.length;) {
		const character = characterAt(text, index);
		bytes += serializedCharacterBytes(character);
		if (bytes > maxBytes) return void 0;
		index += character.length;
	}
	return bytes;
}
/**
* Measure one lossless JSON value without allocating its serialized form.
* @param value - already validated lossless JSON.
* @param maxBytes - largest serialized size the caller can admit.
* @returns Exact serialized bytes, or `undefined` as soon as the cap is crossed.
*/
function jsonValueBytesUpTo(value, maxBytes) {
	let bytes = 0;
	const add = (cost) => {
		bytes += cost;
		return bytes <= maxBytes;
	};
	const tasks = [{
		kind: "value",
		value
	}];
	for (let task = takeLast$1(tasks); task !== void 0; task = takeLast$1(tasks)) {
		if (task.kind === "value") {
			const current = task.value;
			if (current === null) {
				if (!add(4)) return void 0;
			} else if (typeof current === "string") {
				const stringBytes = jsonStringBytesUpTo(current, maxBytes - bytes);
				if (stringBytes === void 0) return void 0;
				bytes += stringBytes;
			} else if (typeof current === "number") {
				if (!add(byteLength(intrinsicString(current)))) return void 0;
			} else if (typeof current === "boolean") {
				if (!add(current ? 4 : 5)) return void 0;
			} else if (intrinsicArrayIsArray$1(current)) {
				if (!add(2)) return void 0;
				if (current.length > 0) append$1(tasks, {
					kind: "array",
					value: current,
					index: 0
				});
			} else {
				if (!add(2)) return void 0;
				const keys = intrinsicObjectKeys$1(current);
				if (keys.length > 0) append$1(tasks, {
					kind: "object",
					value: current,
					keys,
					index: 0
				});
			}
			continue;
		}
		if (task.index > 0 && !add(1)) return void 0;
		if (task.kind === "array") {
			const item = task.value[task.index];
			if (item === void 0) return void 0;
			if (task.index + 1 < task.value.length) append$1(tasks, {
				...task,
				index: task.index + 1
			});
			append$1(tasks, {
				kind: "value",
				value: item
			});
			continue;
		}
		const key = task.keys[task.index];
		/* v8 ignore next -- an object frame is created and advanced only for an existing Object.keys entry. */
		if (key === void 0) return void 0;
		const keyBytes = jsonStringBytesUpTo(key, maxBytes - bytes);
		if (keyBytes === void 0) return void 0;
		if (!add(keyBytes + 1)) return void 0;
		const item = task.value[key];
		if (item === void 0) return void 0;
		if (task.index + 1 < task.keys.length) append$1(tasks, {
			...task,
			index: task.index + 1
		});
		append$1(tasks, {
			kind: "value",
			value: item
		});
	}
	return bytes;
}
/**
* Return the longest code-point-aligned prefix whose JSON string encoding,
* including its surrounding quotes, fits `maxBytes`.
*
* @param text - the candidate string.
* @param maxBytes - serialized JSON-string bytes available.
* @returns the fitting prefix, or an empty string when even useful content cannot fit.
*/
function truncateJsonStringBytes(text, maxBytes) {
	if (maxBytes < 2) return "";
	let bytes = 2;
	let end = 0;
	for (let index = 0; index < text.length;) {
		const character = characterAt(text, index);
		const cost = serializedCharacterBytes(character);
		if (bytes + cost > maxBytes) break;
		bytes += cost;
		end += character.length;
		index += character.length;
	}
	return end === text.length ? text : intrinsicReflectApply$1(intrinsicStringSlice, text, [0, end]);
}
//#endregion
//#region lib/types/worker-json.js
/**
* Lossless-JSON snapshots for the dependency-free source worker closure.
* @module @deepseek-ai/dsh-code-runtime-worker-thread/worker-json
*/
const intrinsicFunctionToString = Reflect.get(Function.prototype, "toString");
const intrinsicReflectApply = Reflect.get(Reflect, "apply");
const IntrinsicError = Error;
const IntrinsicSet = Set;
const intrinsicArrayIsArray = Array.isArray;
const intrinsicArrayPrototype = Array.prototype;
const intrinsicNumberIsFinite = Number.isFinite;
const intrinsicNumberIsSafeInteger = Number.isSafeInteger;
const intrinsicObjectCreate = Object.create;
const intrinsicObjectDefineProperty = Object.defineProperty;
const intrinsicObjectGetOwnPropertyDescriptor = Object.getOwnPropertyDescriptor;
const intrinsicObjectGetPrototypeOf = Object.getPrototypeOf;
const intrinsicObjectHasOwn = Object.hasOwn;
const intrinsicObjectIs = Object.is;
const intrinsicObjectKeys = Object.keys;
const intrinsicObjectPrototype = Object.prototype;
const intrinsicObjectPropertyIsEnumerable = Reflect.get(intrinsicObjectPrototype, "propertyIsEnumerable");
const intrinsicReflectOwnKeys = Reflect.ownKeys;
const intrinsicSetAdd = Reflect.get(Set.prototype, "add");
const intrinsicSetDelete = Reflect.get(Set.prototype, "delete");
const intrinsicSetHas = Reflect.get(Set.prototype, "has");
/** Build a data descriptor that cannot inherit model-defined accessor fields. */
function dataDescriptor(value) {
	const descriptor = intrinsicObjectCreate(null);
	descriptor.value = value;
	return descriptor;
}
/** Define an ordinary enumerable data slot without a prototype-bearing descriptor. */
function defineEnumerableDataProperty(target, key, value) {
	const descriptor = dataDescriptor(value);
	descriptor.enumerable = true;
	descriptor.configurable = true;
	descriptor.writable = true;
	intrinsicObjectDefineProperty(target, key, descriptor);
}
/** Append without consulting a model-mutated `Array.prototype`. */
function append(target, value) {
	defineEnumerableDataProperty(target, target.length, value);
}
/** Pop without consulting a model-mutated `Array.prototype`. */
function takeLast(target) {
	if (target.length === 0) return void 0;
	const index = target.length - 1;
	const value = target[index];
	intrinsicObjectDefineProperty(target, "length", dataDescriptor(index));
	return value;
}
/** Whether one captured-intrinsic Set contains a value. */
function setHas(target, value) {
	return intrinsicReflectApply(intrinsicSetHas, target, [value]);
}
/** Add to one captured-intrinsic Set. */
function setAdd(target, value) {
	intrinsicReflectApply(intrinsicSetAdd, target, [value]);
}
/** Delete from one captured-intrinsic Set. */
function setDelete(target, value) {
	intrinsicReflectApply(intrinsicSetDelete, target, [value]);
}
/** Whether a realm-owned intrinsic prototype is backed by its native constructor. */
function hasIntrinsicConstructor(prototype, name) {
	const constructor = intrinsicObjectGetOwnPropertyDescriptor(prototype, "constructor")?.value;
	if (typeof constructor !== "function") return false;
	try {
		return constructor.name === name && constructor.prototype === prototype && intrinsicReflectApply(intrinsicFunctionToString, constructor, []) === `function ${name}() { [native code] }`;
	} catch {
		return false;
	}
}
/** Whether a candidate is a foreign realm's intrinsic `Object.prototype`. */
function isForeignIntrinsicObjectPrototype(value) {
	return intrinsicObjectGetPrototypeOf(value) === null && hasIntrinsicConstructor(value, "Object");
}
/** Whether an array uses one realm's intrinsic `Array.prototype`, not a subclass or forged prototype. */
function hasPlainArrayPrototype(value) {
	const prototype = intrinsicObjectGetPrototypeOf(value);
	if (prototype === intrinsicArrayPrototype) return true;
	if (!intrinsicArrayIsArray(prototype) || !hasIntrinsicConstructor(prototype, "Array")) return false;
	const objectPrototype = intrinsicObjectGetPrototypeOf(prototype);
	return typeof objectPrototype === "object" && objectPrototype !== null && isForeignIntrinsicObjectPrototype(objectPrototype);
}
/** Whether an object is a plain or null-prototype record from any JavaScript realm. */
function hasPlainObjectPrototype(value) {
	const prototype = intrinsicObjectGetPrototypeOf(value);
	return prototype === null || prototype === intrinsicObjectPrototype || typeof prototype === "object" && isForeignIntrinsicObjectPrototype(prototype);
}
/** Return every JSON-visible object key, or reject own data JSON would discard. */
function enumerableStringKeys(value) {
	const keys = intrinsicReflectOwnKeys(value);
	for (let index = 0; index < keys.length; index++) {
		const key = keys[index];
		if (typeof key !== "string" || !intrinsicReflectApply(intrinsicObjectPropertyIsEnumerable, value, [key])) return void 0;
	}
	return keys;
}
/**
* Validate and detach one worker-boundary value without loading another
* workspace package at runtime. This mirrors the session-owned canonical
* JSON boundary while remaining safe to import from the unbuilt worker.
* Its iterative traversal adds no JavaScript call-stack depth limit.
*
* @param value - the candidate completion value.
* @returns a detached lossless-JSON snapshot, or `undefined` when invalid.
*/
function snapshotCodeJsonValue(value) {
	const active = new IntrinsicSet();
	let root;
	const assign = (destination, item) => {
		if (destination.kind === "root") root = item;
		else if (destination.kind === "array") defineEnumerableDataProperty(destination.target, destination.index, item);
		else defineEnumerableDataProperty(destination.target, destination.key, item);
	};
	const tasks = [{
		kind: "visit",
		value,
		destination: { kind: "root" }
	}];
	for (let task = takeLast(tasks); task !== void 0; task = takeLast(tasks)) {
		if (task.kind === "leave") {
			setDelete(active, task.source);
			continue;
		}
		if (task.kind === "array-item") {
			if (!intrinsicObjectHasOwn(task.source, task.index)) return void 0;
			append(tasks, {
				kind: "visit",
				value: task.source[task.index],
				destination: {
					kind: "array",
					target: task.target,
					index: task.index
				}
			});
			continue;
		}
		if (task.kind === "object-property") {
			append(tasks, {
				kind: "visit",
				value: task.source[task.key],
				destination: {
					kind: "object",
					target: task.target,
					key: task.key
				}
			});
			continue;
		}
		const candidate = task.value;
		if (candidate === null) {
			assign(task.destination, null);
			continue;
		}
		if (typeof candidate === "boolean" || typeof candidate === "string") {
			assign(task.destination, candidate);
			continue;
		}
		if (typeof candidate === "number") {
			if (!intrinsicNumberIsFinite(candidate) || intrinsicObjectIs(candidate, -0)) return void 0;
			assign(task.destination, candidate);
			continue;
		}
		if (typeof candidate !== "object") return void 0;
		if (setHas(active, candidate)) return void 0;
		if (intrinsicArrayIsArray(candidate)) {
			if (!hasPlainArrayPrototype(candidate)) return void 0;
			const length = candidate.length;
			if (intrinsicReflectOwnKeys(candidate).length !== length + 1) return void 0;
			const target = [];
			assign(task.destination, target);
			setAdd(active, candidate);
			append(tasks, {
				kind: "leave",
				source: candidate
			});
			for (let index = length - 1; index >= 0; index--) append(tasks, {
				kind: "array-item",
				source: candidate,
				index,
				target
			});
			continue;
		}
		if (!hasPlainObjectPrototype(candidate)) return void 0;
		const keys = enumerableStringKeys(candidate);
		if (keys === void 0) return void 0;
		const target = {};
		assign(task.destination, target);
		setAdd(active, candidate);
		append(tasks, {
			kind: "leave",
			source: candidate
		});
		for (let index = keys.length - 1; index >= 0; index--) {
			const key = keys[index];
			/* v8 ignore next -- the loop is bounded by the captured key count. */
			if (key === void 0) return void 0;
			append(tasks, {
				kind: "object-property",
				source: candidate,
				key,
				target
			});
		}
	}
	return root;
}
/**
* Flatten one validated JSON value for the worker-thread message port.
* @param value - the lossless JSON value to transport.
* @returns a pre-order token stream whose own nesting is bounded.
*/
function encodeWorkerJson(value) {
	const wire = [];
	const pending = [value];
	for (let current = takeLast(pending); current !== void 0; current = takeLast(pending)) {
		if (current === null || typeof current === "boolean" || typeof current === "number" || typeof current === "string") {
			append(wire, current);
			continue;
		}
		if (intrinsicArrayIsArray(current)) {
			append(wire, {
				kind: "array",
				length: current.length
			});
			for (let index = current.length - 1; index >= 0; index--) {
				const item = current[index];
				if (item === void 0) throw new IntrinsicError("cannot encode a sparse JSON array");
				append(pending, item);
			}
			continue;
		}
		const keys = intrinsicObjectKeys(current);
		append(wire, {
			kind: "object",
			keys
		});
		for (let index = keys.length - 1; index >= 0; index--) {
			const key = keys[index];
			/* v8 ignore next -- the loop is bounded by the captured key count. */
			if (key === void 0) throw new IntrinsicError("cannot encode a missing JSON object key");
			const item = current[key];
			if (item === void 0) throw new IntrinsicError("cannot encode an undefined JSON object property");
			append(pending, item);
		}
	}
	return wire;
}
/** Whether an array contains exactly its dense indexed slots and `length`. */
function isDenseArray(value) {
	if (!hasPlainArrayPrototype(value) || intrinsicReflectOwnKeys(value).length !== value.length + 1) return false;
	for (let index = 0; index < value.length; index++) if (!intrinsicObjectHasOwn(value, index)) return false;
	return true;
}
/** Whether one exact string-key list contains a key, without consulting its prototype. */
function keysContain(keys, expected) {
	for (let index = 0; index < keys.length; index++) if (keys[index] === expected) return true;
	return false;
}
/** Return one exact container marker, or reject any extra/missing fields. */
function containerToken(value) {
	if (intrinsicArrayIsArray(value) || !hasPlainObjectPrototype(value)) return void 0;
	const keys = enumerableStringKeys(value);
	if (keys === void 0) return void 0;
	const token = value;
	if (token.kind === "array") {
		if (keys.length !== 2 || !keysContain(keys, "kind") || !keysContain(keys, "length")) return void 0;
		const length = token.length;
		return typeof length === "number" && intrinsicNumberIsSafeInteger(length) && length >= 0 ? {
			kind: "array",
			length
		} : void 0;
	}
	if (token.kind === "object") {
		if (keys.length !== 2 || !keysContain(keys, "kind") || !keysContain(keys, "keys")) return void 0;
		const objectKeys = token.keys;
		if (!intrinsicArrayIsArray(objectKeys) || !isDenseArray(objectKeys)) return void 0;
		const unique = new IntrinsicSet();
		const normalizedKeys = [];
		const objectKeyValues = objectKeys;
		for (let index = 0; index < objectKeyValues.length; index++) {
			const key = objectKeyValues[index];
			if (typeof key !== "string" || setHas(unique, key)) return void 0;
			setAdd(unique, key);
			append(normalizedKeys, key);
		}
		return {
			kind: "object",
			keys: normalizedKeys
		};
	}
}
/**
* Rebuild one lossless JSON value from the flat worker-thread wire format.
* Malformed or incomplete traffic returns `undefined`; traversal is iterative
* and therefore independent of the transported value's application depth.
* @param input - untrusted message-port payload.
* @returns the detached JSON value, or `undefined` when the wire is invalid.
*/
function decodeWorkerJson(input) {
	try {
		if (!intrinsicArrayIsArray(input) || !isDenseArray(input) || input.length === 0) return void 0;
		const wire = input;
		const frames = [];
		let root;
		let rootAssigned = false;
		const attach = (value) => {
			const parent = frames[frames.length - 1];
			if (!parent) {
				if (rootAssigned) return false;
				root = value;
				rootAssigned = true;
				return true;
			}
			/* v8 ignore next -- completed frames are popped before another token can attach. */
			if (parent.index >= (parent.kind === "array" ? parent.length : parent.keys.length)) return false;
			if (parent.kind === "array") append(parent.target, value);
			else {
				const key = parent.keys[parent.index];
				/* v8 ignore next -- object frames are built from validated keys and their exact length. */
				if (key === void 0) return false;
				defineEnumerableDataProperty(parent.target, key, value);
			}
			parent.index += 1;
			return true;
		};
		for (let tokenIndex = 0; tokenIndex < wire.length; tokenIndex++) {
			const token = wire[tokenIndex];
			let value;
			let frame;
			if (token === null || typeof token === "boolean" || typeof token === "string") value = token;
			else if (typeof token === "number") {
				if (!intrinsicNumberIsFinite(token) || intrinsicObjectIs(token, -0)) return void 0;
				value = token;
			} else {
				if (typeof token !== "object") return void 0;
				const marker = containerToken(token);
				if (!marker) return void 0;
				const remainingTokens = wire.length - tokenIndex - 1;
				if (marker.kind === "array") {
					if (marker.length > remainingTokens) return void 0;
					const target = [];
					value = target;
					if (marker.length > 0) frame = {
						kind: "array",
						target,
						length: marker.length,
						index: 0
					};
				} else {
					if (marker.keys.length > remainingTokens) return void 0;
					const target = {};
					value = target;
					if (marker.keys.length > 0) frame = {
						kind: "object",
						target,
						keys: marker.keys,
						index: 0
					};
				}
			}
			if (!attach(value)) return void 0;
			if (frame) append(frames, frame);
			while (frames.length > 0) {
				const current = frames[frames.length - 1];
				/* v8 ignore next -- the loop condition guarantees a final frame. */
				if (current === void 0) break;
				if (current.index < (current.kind === "array" ? current.length : current.keys.length)) break;
				takeLast(frames);
			}
		}
		return frames.length === 0 ? root : void 0;
	} catch {
		return;
	}
}
//#endregion
//#region lib/types/bootstrap.js
/**
* Worker-side execution logic, written as plain functions over an injected port so the unit
* suite can run every line IN-PROCESS against a fake port (a real worker thread is a separate
* V8 isolate the coverage provider cannot observe).
* @module @deepseek-ai/dsh-code-runtime-worker-thread/src/bootstrap
*/
const CapturedError = Error;
const capturedObjectCreate = Object.create;
const capturedObjectDefineProperty = Object.defineProperty;
/** Define one public binding-error field without consulting mutable globals or descriptor prototypes. */
function defineBindingErrorField(error, key, value) {
	const attributes = capturedObjectCreate(null);
	attributes.enumerable = true;
	attributes.value = value;
	capturedObjectDefineProperty(error, key, attributes);
}
/**
* Ordered text capture under the shared outer JSON-byte budget, delivered to
* a sink as each item lands (the real sink streams text over the port eagerly,
* so captured output survives a mid-run termination). It includes the log
* array syntax and string escaping in its accounting. Once exhausted it emits
* the fitting prefix and reports the limit once; the host turns that condition
* into an explicit `output-limit` run failure.
*/
var LogBuffer = class {
	bytes = 2;
	entries = 0;
	truncated = false;
	sink;
	onLimit;
	maxBytes;
	constructor(maxBytes, sink, onLimit = () => {}) {
		this.maxBytes = maxBytes;
		this.sink = sink;
		this.onLimit = onLimit;
	}
	/**
	* Emit text to the sink, charging it against the budget (drops + marks once exhausted).
	* @param text - the captured text to deliver.
	*/
	push(text) {
		if (this.truncated) return;
		const separatorBytes = this.entries > 0 ? 1 : 0;
		const availableBytes = this.maxBytes - this.bytes - separatorBytes;
		const stringBytes = jsonStringBytesUpTo(text, availableBytes);
		if (stringBytes === void 0) {
			this.truncated = true;
			const prefix = truncateJsonStringBytes(text, availableBytes);
			if (prefix.length > 0) {
				const prefixBytes = jsonStringBytesUpTo(prefix, availableBytes);
				/* v8 ignore next -- truncateJsonStringBytes guarantees the returned prefix fits. */
				if (prefixBytes === void 0) throw new CapturedError("worker output ledger produced an oversized log prefix");
				this.bytes += prefixBytes + separatorBytes;
				this.entries += 1;
				this.sink(prefix);
			}
			this.onLimit();
			return;
		}
		this.bytes += stringBytes + separatorBytes;
		this.entries += 1;
		this.sink(text);
	}
	/** Remaining exact JSON-byte budget for the completion value or failure message. */
	remainingOutputBytes() {
		return this.maxBytes - this.bytes;
	}
};
/** The five console methods the shim captures, in the seam's level vocabulary. */
const CONSOLE_LEVELS = [
	"log",
	"info",
	"warn",
	"error",
	"debug"
];
/**
* A `console` replacement whose five leveled methods render their arguments
* `util.inspect`-style (matching real console formatting closely enough for
* a model to recognize its own output) into the buffer. Only these five
* exist — the program gets a deliberately small console, not Node's full
* console API.
* @param logs - the buffer every rendered line is pushed into.
* @returns the five-method console object handed to the program.
*/
function makeConsoleShim(logs) {
	const render = (args) => args.map((arg) => typeof arg === "string" ? arg : (0, node_util.inspect)(arg, INSPECT_OPTIONS)).join(" ");
	const shim = Object.create(null);
	for (const level of CONSOLE_LEVELS) shim[level] = (...args) => {
		logs.push(render(args));
	};
	return shim;
}
/**
* Redirect a stream's `write` into the log buffer (the program-visible
* `process.stdout`/`process.stderr` in the real worker), so raw writes land in emission order
* alongside console output instead of racing down a pipe. It preserves Node's optional callback
* contract: the callback runs asynchronously after admission, even when the log budget drops
* the write.
*
* @param logs - the buffer captured writes are pushed into.
* @param stream - the stream whose `write` slot is patched.
* @returns the restore function (the in-process tests un-patch; the real
*   worker never needs to).
*/
function captureStreamWrites(logs, stream) {
	const original = stream.write;
	stream.write = (chunk, ...rest) => {
		logs.push(typeof chunk === "string" ? chunk : String(chunk));
		const callback = [rest[0], rest[1]].find((arg) => typeof arg === "function");
		if (callback) queueMicrotask(() => {
			callback(null);
		});
		return true;
	};
	return () => {
		stream.write = original;
	};
}
/** Bounded inspect options: deep enough to be useful, bounded so a pathological value cannot explode the rendering. */
const INSPECT_OPTIONS = {
	depth: 4,
	maxArrayLength: 100,
	maxStringLength: 1e4
};
/**
* Prepare the program's completion value for the done message. Only lossless
* JSON crosses, and a value that does not fit the remaining combined outer
* budget reports `output-limit`; the host revalidates hostile traffic and
* remains authoritative for native pipe writes the worker cannot observe.
*
* @param value - the program's completion value.
* @param remainingOutputBytes - exact bytes left after captured logs.
* @param maxOutputBytes - the configured cap named in an overflow diagnostic.
* @returns the done-message fragment: `{}` for `undefined`, else a flat wire `{ value }`.
*/
function prepareCompletion(value, remainingOutputBytes, maxOutputBytes = remainingOutputBytes) {
	if (value === void 0) return {};
	let snapshot;
	try {
		snapshot = snapshotCodeJsonValue(value);
	} catch {
		snapshot = void 0;
	}
	if (snapshot === void 0) return prepareFailure("invalid-output", "program completion must be lossless JSON", remainingOutputBytes, maxOutputBytes);
	if (jsonValueBytesUpTo(snapshot, remainingOutputBytes) === void 0) return outputLimit(maxOutputBytes);
	return { value: encodeWorkerJson(snapshot) };
}
/** Build the fixed overflow fragment without carrying rejected variable bytes. */
function outputLimit(maxOutputBytes) {
	return { error: {
		kind: "output-limit",
		message: `outer output exceeded ${maxOutputBytes} bytes`
	} };
}
/** Admit one bounded failure message or replace it with the fixed overflow diagnostic. */
function prepareFailure(kind, message, remainingOutputBytes, maxOutputBytes) {
	if (jsonStringBytesUpTo(message, remainingOutputBytes) === void 0) return outputLimit(maxOutputBytes);
	return { error: {
		kind,
		message
	} };
}
/**
* Prepare a thrown program value without sending an unbounded stack or
* string across the worker port.
* @param error - the value thrown by the program.
* @param remainingOutputBytes - exact bytes left after captured logs.
* @param maxOutputBytes - the configured cap named in an overflow diagnostic.
* @returns a bounded exception or fixed output-limit fragment.
*/
function prepareException(error, remainingOutputBytes, maxOutputBytes = remainingOutputBytes) {
	let message;
	try {
		const detail = error instanceof CapturedError ? error.stack ?? error.message : error;
		message = typeof detail === "string" ? detail : String(detail);
	} catch {
		message = "program threw an unrenderable value";
	}
	return prepareFailure("exception", message, remainingOutputBytes, maxOutputBytes);
}
/**
* Materialize the real error constructor declared by one namespace.
* @param descriptor - program-global class name and member-name property.
* @returns the constructor injected into the program and used for rejections.
*/
function makeBindingErrorClass(descriptor) {
	return class BindingCallError extends CapturedError {
		constructor(memberName, message) {
			super(message);
			defineBindingErrorField(this, "name", descriptor.name);
			defineBindingErrorField(this, descriptor.memberNameProperty, memberName);
		}
	};
}
/** Create the namespace-specific rejection for one failed binding call. */
function bindingFailure(errorClass, memberName, message) {
	return errorClass ? new errorClass(memberName, message) : new CapturedError(message);
}
/**
* Build each declared error class once so calls and `instanceof` share constructor identity.
* @param data - binding namespace declarations from the boot payload.
* @returns constructors keyed by their owning namespace global.
*/
function makeBindingErrorClasses(data) {
	const classes = /* @__PURE__ */ new Map();
	for (const namespace of data.namespaces) if (namespace.errorClass) classes.set(namespace.global, makeBindingErrorClass(namespace.errorClass));
	return classes;
}
/**
* Route host replies into the pending-call map: each reply settles its call
* at most once, and a reply for an unknown id (stray, or a duplicate answer
* to an id already settled) is ignored. Shared wiring between
* {@link runWorkerMain} and the tests that exercise {@link makeNamespaces}
* standalone.
* @param port - the port whose `message` events carry the replies.
* @param pending - the id-keyed map of unsettled binding calls.
*/
function wireReplies(port, pending) {
	port.on("message", (message) => {
		const entry = pending.get(message.id);
		if (!entry) return;
		pending.delete(message.id);
		if (message.ok) {
			const value = decodeWorkerJson(message.value);
			if (value === void 0) entry.reject(new CapturedError("binding resolution must be lossless JSON"));
			else entry.resolve(value);
		} else entry.reject(new CapturedError(message.message));
	});
}
/**
* Build the binding namespace objects the program sees: one null-prototype global per
* namespace, each declared name an own enumerable async function that bridges over the port
* (`__proto__`/`constructor`/`toString` are ordinary keys, never prototype collisions).
* Lossy arguments reject before posting; clone failures and host failure
* replies reject only the corresponding call.
*
* @param data - the boot payload's namespace declarations (globals + names).
* @param port - the port binding calls are posted to.
* @param pending - the id-keyed map each posted call parks its handles in.
* @param nextId - the shared mutable id counter (worker-issued correlation ids).
* @param errorClasses - per-namespace constructors shared with program globals.
* @returns one namespace object per declaration, in declaration order.
*/
function makeNamespaces(data, port, pending, nextId, errorClasses = makeBindingErrorClasses(data)) {
	return data.namespaces.map(({ global, names }) => {
		const errorClass = errorClasses.get(global);
		const namespace = Object.create(null);
		for (const name of names) Object.defineProperty(namespace, name, {
			enumerable: true,
			value: (args) => {
				let detached;
				try {
					detached = snapshotCodeJsonValue(args);
				} catch {
					detached = void 0;
				}
				if (detached === void 0) return Promise.reject(bindingFailure(errorClass, name, "binding arguments must be lossless JSON"));
				return new Promise((resolve, reject) => {
					const id = nextId.value++;
					pending.set(id, {
						resolve,
						reject: (error) => {
							reject(bindingFailure(errorClass, name, error.message));
						}
					});
					try {
						port.postMessage({
							type: "call",
							id,
							global,
							name,
							args: encodeWorkerJson(detached)
						});
					} catch (error) {
						pending.delete(id);
						reject(bindingFailure(errorClass, name, `binding arguments must be structured-cloneable: ${error instanceof CapturedError ? error.message : String(error)}`));
					}
				});
			}
		});
		return namespace;
	});
}
/**
* Run one strict async-function body, allowing top-level `await` and `return`, and post exactly
* one terminal {@link DoneMessage}; a thrown program error becomes its `error` field.
* @param port - host message port or test double.
* @param data - the boot payload the host sent.
* @param streams - stdout/stderr objects captured as program logs.
* @returns after posting the done message.
*/
async function runWorkerMain(port, data, streams) {
	const logs = new LogBuffer(data.maxOutputBytes, (text) => {
		port.postMessage({
			type: "log",
			text
		});
	}, () => {
		port.postMessage({ type: "output-limit" });
	});
	captureStreamWrites(logs, streams.stdout);
	captureStreamWrites(logs, streams.stderr);
	const pending = /* @__PURE__ */ new Map();
	wireReplies(port, pending);
	const nextId = { value: 1 };
	const errorClasses = makeBindingErrorClasses(data);
	const namespaces = makeNamespaces(data, port, pending, nextId, errorClasses);
	const errorClassParameters = [];
	const errorClassValues = [];
	for (const namespace of data.namespaces) {
		if (!namespace.errorClass) continue;
		errorClassParameters.push(namespace.errorClass.name);
		const errorClass = errorClasses.get(namespace.global);
		/* v8 ignore next -- makeBindingErrorClasses covers every declaration in the same data. */
		if (!errorClass) throw new CapturedError(`missing binding error class for ${namespace.global}`);
		errorClassValues.push(errorClass);
	}
	const consoleShim = makeConsoleShim(logs);
	let done;
	try {
		/* v8 ignore next -- the arrow exists only to reach the AsyncFunction constructor; it is never invoked. */
		const AsyncFunction = (async () => {}).constructor;
		done = {
			type: "done",
			...prepareCompletion(await new AsyncFunction(...data.namespaces.map((namespace) => namespace.global), ...errorClassParameters, "console", `'use strict';\n${data.code}`)(...namespaces, ...errorClassValues, consoleShim), logs.remainingOutputBytes(), data.maxOutputBytes)
		};
	} catch (error) {
		done = {
			type: "done",
			...prepareException(error, logs.remainingOutputBytes(), data.maxOutputBytes)
		};
	}
	port.postMessage(done);
}
//#endregion
//#region lib/types/worker.js
/**
* Spawn-only worker entrypoint over {@link runWorkerMain}. Executable logic stays in
* `bootstrap.ts` for in-process coverage; real-worker tests cover this glue.
* @module @deepseek-ai/dsh-code-runtime-worker-thread/src/worker
*/
if (!node_worker_threads.parentPort) throw new Error("dsh-code-runtime-worker-thread: worker entry loaded outside a worker thread");
runWorkerMain(node_worker_threads.parentPort, node_worker_threads.workerData, {
	stdout: process.stdout,
	stderr: process.stderr
});
//#endregion
