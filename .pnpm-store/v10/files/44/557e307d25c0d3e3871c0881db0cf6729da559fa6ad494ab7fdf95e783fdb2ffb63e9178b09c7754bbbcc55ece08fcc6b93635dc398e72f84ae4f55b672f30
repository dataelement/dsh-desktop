let node_worker_threads = require("node:worker_threads");
let node_crypto = require("node:crypto");
let node_fs_promises = require("node:fs/promises");
let node_path = require("node:path");
let node_perf_hooks = require("node:perf_hooks");
let node_stream = require("node:stream");
let node_timers_promises = require("node:timers/promises");
let node_util = require("node:util");
let node_zlib = require("node:zlib");
let node_module = require("node:module");
let node_buffer = require("node:buffer");
//#region ../../../vendor/cosmokit/src/misc.ts
/** Return true when a value is `null` or `undefined`. */
function isNullable(value) {
	return value === null || value === void 0;
}
/** Return true for non-array object values. */
function isPlainObject(data) {
	return data && typeof data === "object" && !Array.isArray(data);
}
/** Filter object entries and return a new object. */
function filterKeys(object, filter) {
	return Object.fromEntries(Object.entries(object).filter(([key, value]) => filter(key, value)));
}
/** Map object values while preserving the original key set. */
function mapValues(object, transform) {
	return Object.fromEntries(Object.entries(object).map(([key, value]) => [key, transform(value, key)]));
}
/** Pick selected keys from an object, optionally including `undefined` values. */
function pick(source, keys, forced) {
	if (!keys) return { ...source };
	const result = {};
	for (const key of keys) if (forced || source[key] !== void 0) result[key] = source[key];
	return result;
}
/** Define a non-enumerable writable property and return the object. */
function defineProperty(object, key, value) {
	return Object.defineProperty(object, key, {
		writable: true,
		value,
		enumerable: false
	});
}
//#endregion
//#region ../../../vendor/cosmokit/src/types.ts
/** Test values using `instanceof` with a `toStringTag` fallback. */
function is(type, value) {
	if (arguments.length === 1) return (value) => is(type, value);
	return type in globalThis && value instanceof globalThis[type] || Object.prototype.toString.call(value).slice(8, -1) === type;
}
function isArrayBufferLike(value) {
	return is("ArrayBuffer", value) || is("SharedArrayBuffer", value);
}
function isArrayBufferSource(value) {
	return isArrayBufferLike(value) || ArrayBuffer.isView(value);
}
let Binary;
(function(_Binary) {
	_Binary.is = isArrayBufferLike;
	_Binary.isSource = isArrayBufferSource;
	function fromSource(source) {
		if (ArrayBuffer.isView(source)) return source.buffer.slice(source.byteOffset, source.byteOffset + source.byteLength);
		else return source;
	}
	_Binary.fromSource = fromSource;
	function toBase64(source) {
		source = fromSource(source);
		if (typeof Buffer !== "undefined") return Buffer.from(source).toString("base64");
		let binary = "";
		const bytes = new Uint8Array(source);
		for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
		return btoa(binary);
	}
	_Binary.toBase64 = toBase64;
	function fromBase64(source) {
		if (typeof Buffer !== "undefined") return fromSource(Buffer.from(source, "base64"));
		return Uint8Array.from(atob(source), (c) => c.charCodeAt(0));
	}
	_Binary.fromBase64 = fromBase64;
	function toHex(source) {
		source = fromSource(source);
		if (typeof Buffer !== "undefined") return Buffer.from(source).toString("hex");
		return Array.from(new Uint8Array(source), (byte) => byte.toString(16).padStart(2, "0")).join("");
	}
	_Binary.toHex = toHex;
	function fromHex(source) {
		if (typeof Buffer !== "undefined") return fromSource(Buffer.from(source, "hex"));
		const hex = source.length % 2 === 0 ? source : source.slice(0, source.length - 1);
		const buffer = [];
		for (let i = 0; i < hex.length; i += 2) buffer.push(parseInt(`${hex[i]}${hex[i + 1]}`, 16));
		return Uint8Array.from(buffer).buffer;
	}
	_Binary.fromHex = fromHex;
})(Binary || (Binary = {}));
Binary.fromBase64;
Binary.toBase64;
Binary.fromHex;
Binary.toHex;
/** Deep-clone common JavaScript values while preserving prototypes and cycles. */
function clone(source, refs = /* @__PURE__ */ new Map()) {
	if (!source || typeof source !== "object") return source;
	if (is("Date", source)) return new Date(source.valueOf());
	if (is("RegExp", source)) return new RegExp(source.source, source.flags);
	if (isArrayBufferLike(source)) return source.slice(0);
	if (ArrayBuffer.isView(source)) return source.buffer.slice(source.byteOffset, source.byteOffset + source.byteLength);
	const cached = refs.get(source);
	if (cached) return cached;
	if (Array.isArray(source)) {
		const result = [];
		refs.set(source, result);
		source.forEach((value, index) => {
			result[index] = Reflect.apply(clone, null, [value, refs]);
		});
		return result;
	}
	const result = Object.create(Object.getPrototypeOf(source));
	refs.set(source, result);
	for (const key of Reflect.ownKeys(source)) {
		const descriptor = { ...Reflect.getOwnPropertyDescriptor(source, key) };
		if ("value" in descriptor) descriptor.value = Reflect.apply(clone, null, [descriptor.value, refs]);
		Reflect.defineProperty(result, key, descriptor);
	}
	return result;
}
/** Deeply compare arrays, dates, regexps, buffers, and plain object fields. */
function deepEqual(a, b, strict) {
	if (a === b) return true;
	if (!strict && isNullable(a) && isNullable(b)) return true;
	if (typeof a !== typeof b) return false;
	if (typeof a !== "object") return false;
	if (!a || !b) return false;
	function check(test, then) {
		return test(a) ? test(b) ? then(a, b) : false : test(b) ? false : void 0;
	}
	return check(Array.isArray, (a, b) => a.length === b.length && a.every((item, index) => deepEqual(item, b[index]))) ?? check(is("Date"), (a, b) => a.valueOf() === b.valueOf()) ?? check(is("RegExp"), (a, b) => a.source === b.source && a.flags === b.flags) ?? check(isArrayBufferLike, (a, b) => {
		if (a.byteLength !== b.byteLength) return false;
		const viewA = new Uint8Array(a);
		const viewB = new Uint8Array(b);
		for (let i = 0; i < viewA.length; i++) if (viewA[i] !== viewB[i]) return false;
		return true;
	}) ?? Object.keys({
		...a,
		...b
	}).every((key) => deepEqual(a[key], b[key], strict));
}
//#endregion
//#region ../../../vendor/cosmokit/src/string.ts
function tokenize(source, delimiters, delimiter) {
	const output = [];
	let state = 0;
	for (let i = 0; i < source.length; i++) {
		const code = source.charCodeAt(i);
		if (code >= 65 && code <= 90) {
			if (state === 1) {
				const next = source.charCodeAt(i + 1);
				if (next >= 97 && next <= 122) output.push(delimiter);
				output.push(code + 32);
			} else {
				if (state !== 0) output.push(delimiter);
				output.push(code + 32);
			}
			state = 1;
		} else if (code >= 97 && code <= 122) {
			output.push(code);
			state = 2;
		} else if (delimiters.includes(code)) {
			if (state !== 0) output.push(delimiter);
			state = 0;
		} else output.push(code);
	}
	return String.fromCharCode(...output);
}
/** Convert text to dash-delimited parameter case. */
function paramCase(source) {
	return tokenize(source, [45, 95], 45);
}
/** Runtime alias for `paramCase`. */
const hyphenate = paramCase;
//#endregion
//#region ../../../vendor/cosmokit/src/time.ts
let Time;
(function(_Time) {
	_Time.millisecond = 1;
	const second = _Time.second = 1e3;
	const minute = _Time.minute = second * 60;
	const hour = _Time.hour = minute * 60;
	const day = _Time.day = hour * 24;
	const week = _Time.week = day * 7;
	let timezoneOffset = (/* @__PURE__ */ new Date()).getTimezoneOffset();
	function setTimezoneOffset(offset) {
		timezoneOffset = offset;
	}
	_Time.setTimezoneOffset = setTimezoneOffset;
	function getTimezoneOffset() {
		return timezoneOffset;
	}
	_Time.getTimezoneOffset = getTimezoneOffset;
	function getDateNumber(date = /* @__PURE__ */ new Date(), offset) {
		if (typeof date === "number") date = new Date(date);
		if (offset === void 0) offset = timezoneOffset;
		return Math.floor((date.valueOf() / minute - offset) / 1440);
	}
	_Time.getDateNumber = getDateNumber;
	function fromDateNumber(value, offset) {
		const date = new Date(value * day);
		if (offset === void 0) offset = timezoneOffset;
		return new Date(+date + offset * minute);
	}
	_Time.fromDateNumber = fromDateNumber;
	const numeric = /\d+(?:\.\d+)?/.source;
	const timeRegExp = new RegExp(`^${[
		"w(?:eek(?:s)?)?",
		"d(?:ay(?:s)?)?",
		"h(?:our(?:s)?)?",
		"m(?:in(?:ute)?(?:s)?)?",
		"s(?:ec(?:ond)?(?:s)?)?"
	].map((unit) => `(${numeric}${unit})?`).join("")}$`);
	function parseTime(source) {
		const capture = timeRegExp.exec(source);
		if (!capture) return 0;
		return (parseFloat(capture[1]) * week || 0) + (parseFloat(capture[2]) * day || 0) + (parseFloat(capture[3]) * hour || 0) + (parseFloat(capture[4]) * minute || 0) + (parseFloat(capture[5]) * second || 0);
	}
	_Time.parseTime = parseTime;
	function parseDate(date) {
		const parsed = parseTime(date);
		if (parsed) date = Date.now() + parsed;
		else if (/^\d{1,2}(:\d{1,2}){1,2}$/.test(date)) date = `${(/* @__PURE__ */ new Date()).toLocaleDateString()}-${date}`;
		else if (/^\d{1,2}-\d{1,2}-\d{1,2}(:\d{1,2}){1,2}$/.test(date)) date = `${(/* @__PURE__ */ new Date()).getFullYear()}-${date}`;
		return date ? new Date(date) : /* @__PURE__ */ new Date();
	}
	_Time.parseDate = parseDate;
	function format(ms) {
		const abs = Math.abs(ms);
		if (abs >= day - hour / 2) return Math.round(ms / day) + "d";
		else if (abs >= hour - minute / 2) return Math.round(ms / hour) + "h";
		else if (abs >= minute - second / 2) return Math.round(ms / minute) + "m";
		else if (abs >= second) return Math.round(ms / second) + "s";
		return ms + "ms";
	}
	_Time.format = format;
	function toDigits(source, length = 2) {
		return source.toString().padStart(length, "0");
	}
	_Time.toDigits = toDigits;
	function template(template, time = /* @__PURE__ */ new Date()) {
		return template.replace("yyyy", time.getFullYear().toString()).replace("yy", time.getFullYear().toString().slice(2)).replace("MM", toDigits(time.getMonth() + 1)).replace("dd", toDigits(time.getDate())).replace("hh", toDigits(time.getHours())).replace("mm", toDigits(time.getMinutes())).replace("ss", toDigits(time.getSeconds())).replace("SSS", toDigits(time.getMilliseconds(), 3));
	}
	_Time.template = template;
})(Time || (Time = {}));
//#endregion
//#region ../../../vendor/cordis/src/utils.ts
/** Ordered collection of disposable values with O(1) deletion by value. */
var DisposableList = class {
	sn = 0;
	map = /* @__PURE__ */ new Map();
	weak = /* @__PURE__ */ new WeakMap();
	get length() {
		return this.map.size;
	}
	push(value) {
		const sn = ++this.sn;
		this.map.set(sn, value);
		this.weak.set(value, sn);
		return () => this.map.delete(sn);
	}
	delete(value) {
		const sn = this.weak.get(value);
		if (!sn) return false;
		return this.map.delete(sn);
	}
	clear() {
		const values = [...this.map.values()];
		this.map.clear();
		return values.reverse();
	}
	[Symbol.iterator]() {
		return this.map.values();
	}
	[Symbol.for("nodejs.util.inspect.custom")]() {
		return [...this];
	}
};
/** Shared symbols used to avoid public property-name collisions. */
const symbols = {
	shadow: Symbol.for("cordis.shadow"),
	receiver: Symbol.for("cordis.receiver"),
	original: Symbol.for("cordis.original"),
	metadata: Symbol.for("cordis.metadata"),
	initHooks: Symbol.for("cordis.initHooks"),
	checkProto: Symbol.for("cordis.checkProto"),
	effect: Symbol.for("cordis.effect"),
	filter: Symbol.for("cordis.filter"),
	isolate: Symbol.for("cordis.isolate"),
	intercept: Symbol.for("cordis.intercept"),
	init: Symbol.for("cordis.init"),
	check: Symbol.for("cordis.check"),
	config: Symbol.for("cordis.config"),
	invoke: Symbol.for("cordis.invoke"),
	extend: Symbol.for("cordis.extend"),
	tracker: Symbol.for("cordis.tracker"),
	resolveConfig: Symbol.for("cordis.resolveConfig")
};
const GeneratorFunction = function* () {}.constructor;
const AsyncGeneratorFunction = async function* () {}.constructor;
/** Return true when a plugin callback should be constructed with `new`. */
function isConstructor(func) {
	if (!func.prototype) return false;
	if (func instanceof GeneratorFunction) return false;
	if (AsyncGeneratorFunction !== Function && func instanceof AsyncGeneratorFunction) return false;
	return true;
}
/** Merge two prototype chains while preserving descriptors from `proto1`. */
function joinPrototype(proto1, proto2) {
	if (proto1 === Object.prototype) return proto2;
	const result = Object.create(joinPrototype(Object.getPrototypeOf(proto1), proto2));
	for (const key of Reflect.ownKeys(proto1)) Object.defineProperty(result, key, Object.getOwnPropertyDescriptor(proto1, key));
	return result;
}
/** Return true for non-null objects and functions. */
function isObject(value) {
	return value && (typeof value === "object" || typeof value === "function");
}
/** Find a property descriptor by walking an object's prototype chain. */
function getPropertyDescriptor(target, prop) {
	let proto = target;
	while (proto) {
		const desc = Reflect.getOwnPropertyDescriptor(proto, prop);
		if (desc) return desc;
		proto = Object.getPrototypeOf(proto);
	}
}
/** Wrap services/functions so method calls see the caller's active context. */
function getTraceable(ctx, value) {
	if (!isObject(value)) return value;
	if (Object.hasOwn(value, symbols.shadow)) return Object.getPrototypeOf(value);
	const tracker = value[symbols.tracker];
	if (!tracker) return value;
	return createTraceable(ctx, value, tracker);
}
/** Return a proxy that overlays readonly or writable properties onto a target. */
function withProps(target, props) {
	if (!props) return target;
	return new Proxy(target, {
		get: (target, prop, receiver) => {
			if (prop in props && prop !== "constructor") return Reflect.get(props, prop, receiver);
			return Reflect.get(target, prop, receiver);
		},
		set: (target, prop, value, receiver) => {
			if (prop in props && prop !== "constructor") return Reflect.set(props, prop, value, receiver);
			return Reflect.set(target, prop, value, receiver);
		}
	});
}
function withProp(target, prop, value) {
	return withProps(target, Object.defineProperty(Object.create(null), prop, {
		value,
		writable: false
	}));
}
function createShadow(ctx, target, property, receiver) {
	if (!property) return receiver;
	const origin = Reflect.getOwnPropertyDescriptor(target, property)?.value;
	if (!origin) return receiver;
	return withProp(receiver, property, ctx.extend({ [symbols.shadow]: origin }));
}
function createShadowMethod(ctx, value, outer, shadow) {
	return new Proxy(value, { apply: (target, thisArg, args) => {
		if (thisArg === outer) thisArg = shadow;
		return getTraceable(ctx, Reflect.apply(target, thisArg, args));
	} });
}
function createTraceable(ctx, value, tracker) {
	if (ctx[symbols.shadow] && !tracker.noShadow) ctx = Object.getPrototypeOf(ctx);
	const proxy = new Proxy(value, {
		get: (target, prop, receiver) => {
			if (prop === symbols.original) return target;
			if (prop === tracker.property) return ctx;
			if (typeof prop === "symbol") return Reflect.get(target, prop, receiver);
			if (tracker.associate && ctx.reflect.props[`${tracker.associate}.${prop}`]) return Reflect.get(ctx, `${tracker.associate}.${prop}`, withProp(ctx, symbols.receiver, receiver));
			let shadow, innerValue;
			const desc = getPropertyDescriptor(target, prop);
			if (desc && "value" in desc) innerValue = desc.value;
			else {
				shadow = createShadow(ctx, target, tracker.property, receiver);
				innerValue = Reflect.get(target, prop, shadow);
			}
			const innerTracker = innerValue?.[symbols.tracker];
			if (innerTracker) return createTraceable(ctx, innerValue, innerTracker);
			else if (!tracker.noShadow && typeof innerValue === "function") {
				shadow ??= createShadow(ctx, target, tracker.property, receiver);
				return createShadowMethod(ctx, innerValue, receiver, shadow);
			} else return innerValue;
		},
		set: (target, prop, value, receiver) => {
			if (prop === symbols.original) return false;
			if (prop === tracker.property) return false;
			if (typeof prop === "symbol") return Reflect.set(target, prop, value, receiver);
			if (tracker.associate && ctx.reflect.props[`${tracker.associate}.${prop}`]) return Reflect.set(ctx, `${tracker.associate}.${prop}`, value, withProp(ctx, symbols.receiver, receiver));
			const shadow = createShadow(ctx, target, tracker.property, receiver);
			return Reflect.set(target, prop, value, shadow);
		},
		apply: (target, thisArg, args) => {
			return applyTraceable(proxy, target, thisArg, args);
		}
	});
	return proxy;
}
function applyTraceable(proxy, value, thisArg, args) {
	if (!value[symbols.invoke]) return Reflect.apply(value, thisArg, args);
	return value[symbols.invoke].apply(proxy, args);
}
/** Create a callable service object that dispatches through `symbols.invoke`. */
function createCallable(name, proto, tracker) {
	const self = function(...args) {
		return applyTraceable(createTraceable(self["ctx"], self, tracker), self, this, args);
	};
	defineProperty(self, "name", name);
	return Object.setPrototypeOf(self, proto);
}
function handleError(info, reason, getOuterStack) {
	const innerLines = info.error.stack.split("\n");
	if (typeof reason?.stack !== "string") {
		const outerError = new Error(reason);
		const lines = outerError.stack.split("\n");
		lines.splice(1, Infinity, ...getOuterStack());
		outerError.stack = lines.join("\n");
		throw outerError;
	}
	const lines = reason.stack.split("\n");
	let index = lines.indexOf(innerLines[2]);
	if (index === -1) throw reason;
	index -= info.offset;
	while (index > 0) {
		if (!lines[index - 1].endsWith(" (<anonymous>)")) break;
		index -= 1;
	}
	lines.splice(index, Infinity, ...getOuterStack());
	reason.stack = lines.join("\n");
	throw reason;
}
/** Run a callback and splice outer call-site frames into thrown async errors. */
function composeError(callback, getOuterStack = buildOuterStack()) {
	const info = {
		offset: 1,
		error: /* @__PURE__ */ new Error()
	};
	try {
		const result = callback(info);
		if (isObject(result) && "then" in result) return result.then(void 0, (reason) => handleError(info, reason, getOuterStack));
		else return result;
	} catch (reason) {
		handleError(info, reason, getOuterStack);
	}
}
/** Capture a lazy stack-frame supplier for later error composition. */
function buildOuterStack(offset = 0) {
	const outerError = /* @__PURE__ */ new Error();
	return () => outerError.stack.split("\n").slice(3 + offset);
}
//#endregion
//#region ../../../vendor/cordis/src/events.ts
/**
* Return whether an event result should stop a bail-style dispatch.
*
* @param value — a listener's return value.
* @returns `true` unless `value` is `null`, `false`, or `undefined`.
*/
function isBailed(value) {
	return value !== null && value !== false && value !== void 0;
}
/**
* Event bus installed as `ctx.events` and mixed into every context.
*
* The service supports concurrent, synchronous, serial, bail, and waterfall
* dispatch and automatically disposes listeners with their owning fiber.
*/
var EventsService = class {
	ctx;
	_hooks = {};
	constructor(ctx) {
		this.ctx = ctx;
		defineProperty(this, symbols.tracker, {
			property: "ctx",
			noShadow: true
		});
		this.on("internal/listener", function(name, listener, options) {
			if (name === "internal/update" && !options.global) return (this.fiber._hooks["internal/update"] ??= new DisposableList())[options.prepend ? "unshift" : "push"](listener);
		});
		this.on("internal/update", function(config, noSave, next) {
			const cbs = [...this._hooks["internal/update"] || []];
			const _next = () => {
				return (cbs.shift() ?? next).call(this, config, noSave, _next);
			};
			return _next();
		}, {
			global: true,
			prepend: true
		});
	}
	/**
	* Resolve listeners for one dispatch and apply context filtering.
	*
	* @param type — the dispatch mode, reported on `internal/dispatch`.
	* @param args — the raw dispatch arguments; consumed up to the event name.
	* @returns the matching listener callbacks, bound to the dispatch `this`.
	*/
	dispatch(type, args) {
		const thisArg = typeof args[0] === "object" || typeof args[0] === "function" ? args.shift() : null;
		const name = args.shift();
		if (!name.startsWith("internal/")) this.emit("internal/dispatch", type, name, args, thisArg);
		const filter = thisArg?.[Context.filter];
		return (this._hooks[name] || []).filter((hook) => hook.global || !filter || filter.call(thisArg, hook.ctx)).map((hook) => hook.callback.bind(thisArg));
	}
	/**
	* Run listeners concurrently and wait for all of them.
	*
	* @param args — optional `this`, the event name, then listener arguments.
	* @returns a promise resolving once every listener has settled.
	*/
	async parallel(...args) {
		const errors = (await Promise.allSettled(this.dispatch("emit", args).map(async (cb) => cb(...args)))).filter((result) => result.status === "rejected");
		if (errors.length) throw new AggregateError(errors.map((error) => error.reason));
	}
	/**
	* Run listeners synchronously without waiting for returned promises.
	*
	* @param args — optional `this`, the event name, then listener arguments.
	*/
	emit(...args) {
		this.dispatch("emit", args).map((cb) => cb(...args));
	}
	/**
	* Run listeners in order, awaiting each, until one returns a bail value.
	*
	* @param args — optional `this`, the event name, then listener arguments.
	* @returns the first bail value (see {@link isBailed}), if any.
	*/
	async serial(...args) {
		for (const cb of this.dispatch("serial", args)) {
			const result = await cb(...args);
			if (isBailed(result)) return result;
		}
	}
	/**
	* Run listeners synchronously until one returns a bail value.
	*
	* @param args — optional `this`, the event name, then listener arguments.
	* @returns the first bail value (see {@link isBailed}), if any.
	*/
	bail(...args) {
		for (const cb of this.dispatch("bail", args)) {
			const result = cb(...args);
			if (isBailed(result)) return result;
		}
	}
	/**
	* Compose listeners around the final `next` callback.
	*
	* The last dispatch argument is treated as the innermost `next`. Listeners
	* run outermost-first; a listener that does not call `next()` vetoes the
	* rest of the chain, including the built-in behavior.
	*
	* @param args — optional `this`, the event name, listener arguments, then `next`.
	* @returns the outermost listener's return value.
	*/
	waterfall(...args) {
		const cbs = this.dispatch("waterfall", args);
		const inner = args.pop();
		const next = () => {
			return (cbs.shift() ?? inner)(...args);
		};
		args.push(next);
		return next();
	}
	/**
	* Store a listener record as an effect on the current fiber.
	*
	* @param label — effect label shown in fiber diagnostics.
	* @param hooks — the listener list for one event.
	* @param callback — the listener to store.
	* @param options — placement and filtering options.
	* @returns a disposer that unregisters the listener.
	*/
	register(label, hooks, callback, options) {
		const method = options.prepend ? "unshift" : "push";
		return this.ctx.fiber.effect(() => {
			hooks[method]({
				ctx: this.ctx,
				callback,
				...options
			});
			return () => this.unregister(hooks, callback);
		}, label);
	}
	/**
	* Remove a stored listener record.
	*
	* @param hooks — the listener list for one event.
	* @param callback — the listener to remove.
	* @returns `true` if the listener was found and removed.
	*/
	unregister(hooks, callback) {
		const index = hooks.findIndex((hook) => hook.callback === callback);
		if (index >= 0) {
			hooks.splice(index, 1);
			return true;
		}
	}
	/**
	* Register an event listener owned by the current fiber.
	*
	* The listener is removed automatically when the fiber unloads. Throws
	* `CordisError('INACTIVE_EFFECT')` if the fiber is already disposed.
	*
	* @param name — the event name to listen for.
	* @param listener — called with the dispatch arguments.
	* @param options — listener options; a boolean is shorthand for `prepend`.
	* @returns a disposer removing the listener; `true` if it was still registered.
	*/
	on(name, listener, options) {
		if (typeof options !== "object") options = { prepend: options };
		this.ctx.fiber.assertActive();
		listener = this.ctx.reflect.bind(listener);
		const result = this.bail(this.ctx, "internal/listener", name, listener, options);
		if (result) return result;
		const hooks = this._hooks[name] ||= [];
		const label = `ctx.on(${typeof name === "string" ? JSON.stringify(name) : name.toString()})`;
		return this.register(label, hooks, listener, options);
	}
	/**
	* Register an event listener that disposes itself after the first call.
	*
	* @param name — the event name to listen for.
	* @param listener — called at most once with the dispatch arguments.
	* @param options — listener options; a boolean is shorthand for `prepend`.
	* @returns a disposer removing the listener; `true` if it was still registered.
	*/
	once(name, listener, options) {
		const dispose = this.on(name, function(...args) {
			dispose();
			return listener.apply(this, args);
		}, options);
		return dispose;
	}
};
//#endregion
//#region ../../../vendor/cordis/src/logger.ts
/** Built-in placeholder formatters used by `Logger.format()`. */
const defaultFormatters = {
	s: (value) => String(value),
	d: (value) => Math.trunc(Number(value)),
	i: (value) => Math.trunc(Number(value)),
	f: (value) => Number(value),
	o: (value) => JSON.stringify(value),
	O: (value) => JSON.stringify(value),
	c: () => "",
	C: (value, exporter, message) => {
		return Logger.color(exporter, Logger.code(message.name, exporter.colors), value);
	}
};
function isAggregateError(error) {
	return error instanceof Error && Array.isArray(error["errors"]);
}
/** Logger facade for one named subsystem. */
var Logger = class {
	service;
	static color(exporter, code, value, decoration = "") {
		if (!exporter.colors) return "" + value;
		return `\u001b[3${code < 8 ? code : "8;5;" + code}${exporter.colors >= 2 ? decoration : ""}m${value}\u001b[0m`;
	}
	static code(name, level) {
		let hash = 0;
		for (let i = 0; i < name.length; i++) {
			hash = (hash << 3) - hash + name.charCodeAt(i) + 13;
			hash |= 0;
		}
		const colors = !level ? [] : level >= 2 ? c256 : c16;
		return colors[Math.abs(hash) % colors.length];
	}
	static format(exporter, message) {
		const args = message.args.slice();
		if (args[0] instanceof Error) {
			args[0] = args[0].stack || args[0].message;
			args.unshift("%s");
		} else if (typeof args[0] !== "string") args.unshift("%o");
		let format = args.shift();
		format = format.replace(/%([a-zA-Z%])/g, (match, char) => {
			if (match === "%%") return "%";
			const formatter = exporter.formatters?.[char] ?? defaultFormatters[char];
			if (typeof formatter === "function") return formatter(args.shift(), exporter, message);
			return match;
		});
		const oFormatter = exporter.formatters?.o ?? defaultFormatters.o;
		for (let arg of args) {
			if (typeof arg === "object" && arg) arg = oFormatter(arg, exporter, message);
			format += " " + arg;
		}
		const { maxLength = 10240 } = exporter;
		return format.split(/\r?\n/g).map((line) => {
			return line.slice(0, maxLength) + (line.length > maxLength ? "..." : "");
		}).join("\n");
	}
	constructor(options, service) {
		this.service = service;
		Object.assign(this, options);
		this.error = this._method("error", 0);
		this.info = this._method("info", 1);
		this.warn = this._method("warn", 2);
		this.debug = this._method("debug", 3);
	}
	_method(type, level) {
		return (...args) => {
			if (args.length === 1 && args[0] instanceof Error) {
				if (args[0].cause) this[type](args[0].cause);
				else if (isAggregateError(args[0])) {
					args[0].errors.forEach((error) => this[type](error));
					return;
				}
			}
			const sn = ++this.service._snMessage;
			const ts = Date.now();
			for (const exporter of this.service.exporters.values()) {
				if ((exporter.levels?.[this.name] ?? exporter.levels?.default ?? this.level ?? 1) < level) continue;
				const message = {
					sn,
					ts,
					type,
					level,
					name: this.name,
					...this.meta,
					args
				};
				exporter.export(message);
			}
		};
	}
};
/** ANSI 16-color palette indexes used for logger name coloring. */
const c16 = [
	6,
	2,
	3,
	4,
	5,
	1
];
/** ANSI 256-color palette indexes used for logger name coloring. */
const c256 = [
	20,
	21,
	26,
	27,
	32,
	33,
	38,
	39,
	40,
	41,
	42,
	43,
	44,
	45,
	56,
	57,
	62,
	63,
	68,
	69,
	74,
	75,
	76,
	77,
	78,
	79,
	80,
	81,
	92,
	93,
	98,
	99,
	112,
	113,
	129,
	134,
	135,
	148,
	149,
	160,
	161,
	162,
	163,
	164,
	165,
	166,
	167,
	168,
	169,
	170,
	171,
	172,
	173,
	178,
	179,
	184,
	185,
	196,
	197,
	198,
	199,
	200,
	201,
	202,
	203,
	204,
	205,
	206,
	207,
	208,
	209,
	214,
	215,
	220,
	221
];
/**
* Built-in logging service.
*
* Call `ctx.logger()` to create a named logger, or call `ctx.logger.info()`
* directly to log with the current fiber-derived name.
*/
var LoggerService = class LoggerService {
	bufferSize = 1e3;
	buffer = [];
	ctx;
	_snMessage = 0;
	_snExporter = 0;
	exporters = /* @__PURE__ */ new Map();
	constructor(ctx) {
		const tracker = {
			property: "ctx",
			noShadow: true
		};
		const self = createCallable("logger", joinPrototype(Object.getPrototypeOf(this), Function.prototype), tracker);
		Object.assign(self, this);
		self.ctx = ctx;
		defineProperty(self, symbols.tracker, tracker);
		self.exporter({
			colors: 3,
			export: (message) => {
				self.buffer.push(message);
				if (self.buffer.length > self.bufferSize) self.buffer = self.buffer.slice(-self.bufferSize);
			}
		});
		return self;
	}
	/**
	* Register an exporter and dispose it with the current fiber.
	*
	* @param exporter — the sink that receives structured log messages.
	* @returns a disposer that removes the exporter.
	*/
	exporter(exporter) {
		return this.ctx.effect(() => {
			this.exporters.set(++this._snExporter, exporter);
			return () => this.exporters.delete(this._snExporter);
		}, "ctx.logger.exporter()");
	}
	_resolveConfig() {
		let intercept = this.ctx[symbols.intercept];
		const configs = [];
		while ("logger" in intercept) {
			if (Object.hasOwn(intercept, "logger")) configs.unshift(intercept["logger"]);
			intercept = Object.getPrototypeOf(intercept);
		}
		return Object.assign({}, ...configs);
	}
	[symbols.invoke](name) {
		const config = this._resolveConfig();
		const fiber = (this.ctx[symbols.shadow] ?? this.ctx).fiber;
		name ??= config.name;
		name ??= hyphenate(fiber.name);
		return new Logger({
			name,
			level: config.level,
			meta: { fiber: new WeakRef(fiber) }
		}, this);
	}
	static {
		for (const type of [
			"error",
			"info",
			"warn",
			"debug"
		]) LoggerService.prototype[type] = function(...args) {
			return this()[type](...args);
		};
	}
};
//#endregion
//#region ../../../vendor/cordis/src/fiber.ts
const kValidationError$1 = Symbol.for("ValidationError");
/** Error raised when plugin configuration fails standard-schema validation. */
var ValidationError$1 = class extends TypeError {
	name = "ValidationError";
	/**
	* Build the aggregated message from schema issues.
	*
	* @param issues — the standard-schema issues, one message line each.
	*/
	constructor(issues) {
		super(`invalid config:\n` + issues.map((issue) => {
			if (issue.path) return `  - ${issue.message} (at ${issue.path.join(".")})`;
			else return `  - ${issue.message}`;
		}).join("\n"));
	}
};
Object.defineProperty(ValidationError$1.prototype, kValidationError$1, { value: true });
/**
* Validate and normalize config for a plugin runtime before it starts.
*
* @param runtime — the plugin runtime whose `Config` schema to apply.
* @param config — the raw user config.
* @returns the validated config, or `config` unchanged if the runtime has no schema.
* @throws {ValidationError} when validation reports issues.
*/
function resolveConfig(runtime, config) {
	if (!runtime.Config) return config;
	const result = runtime.Config["~standard"].validate(config);
	if ("then" in result) throw new TypeError("Async config validation is not supported");
	if (result.issues) throw new ValidationError$1(result.issues);
	else return result.value;
}
const effectInertia = /* @__PURE__ */ new WeakMap();
function runDisposable(dispose) {
	const result = dispose();
	return effectInertia.get(dispose)?.() ?? result;
}
/** Notify plugin teardown without allowing one observer to break ownership cleanup. */
function emitPluginDisposed(context, fiber) {
	const args = ["internal/plugin", fiber];
	let callbacks;
	try {
		callbacks = context.events.dispatch("emit", args);
	} catch (error) {
		context.logger.error(error);
		return;
	}
	for (const callback of callbacks) try {
		const returned = callback(...args);
		Promise.resolve(returned).catch((error) => context.logger.error(error));
	} catch (error) {
		context.logger.error(error);
	}
}
/** Framework error with a stable machine-readable code. */
var CordisError = class CordisError extends Error {
	code;
	/**
	* @param code — the stable error code; also the default message.
	* @param message — optional human-readable override.
	*/
	constructor(code, message) {
		super(message ?? CordisError.Code[code]);
		this.code = code;
	}
};
(function(_CordisError) {
	_CordisError.Code = { INACTIVE_EFFECT: "cannot create effect on inactive context" };
})(CordisError || (CordisError = {}));
const INACTIVE = "__INACTIVE__";
/**
* Runtime instance of one plugin application.
*
* A fiber tracks dependency state, validated config, lifecycle effects, and
* cleanup for the plugin context returned by `ctx.plugin()`.
*/
var Fiber = class {
	parent;
	inject;
	runtime;
	/** Unique id within the registry; 0 for the root fiber, `null` once disposed. */
	uid;
	/** The context this fiber's plugin runs in (extends the parent context). */
	ctx;
	/** The validated plugin config (updated by `update()`). */
	config;
	/** The raw plugin config, re-resolved before each activation. */
	_config;
	/** Current lifecycle state; transitions emit `internal/status`. */
	state = 0;
	/** Dispose this fiber: unload the plugin, then settle once cleanup finished. */
	dispose;
	/** Snapshot of required service implementations while loaded; `undefined` otherwise. */
	store;
	/** The in-flight load/unload transition, if one is currently running. */
	inertia;
	_hooks = Object.create(null);
	_disposables = new DisposableList();
	context;
	_error;
	_runner;
	_store = Object.create(null);
	/**
	* Create a fiber. Plugin authors normally obtain fibers from `ctx.plugin()`
	* rather than constructing them directly.
	*
	* @param parent — the context the plugin was loaded from.
	* @param config — raw config, validated against the runtime's schema.
	* @param inject — resolved dependency map (service name → intercept config).
	* @param runtime — the shared plugin runtime, or `null` for the root fiber.
	* @param getOuterStack — captures the caller stack for effect diagnostics.
	*/
	constructor(parent, config, inject, runtime, getOuterStack) {
		this.parent = parent;
		this.inject = inject;
		this.runtime = runtime;
		this._config = config;
		const collect = (dispose) => {
			this._disposables.push(dispose);
		};
		if (runtime) {
			this.uid = parent.registry.counter;
			this.ctx = this.context = parent.extend({ fiber: this });
			const injectEntries = Object.entries(this.inject);
			if (injectEntries.length) {
				this.ctx[Context.intercept] = Object.create(parent[Context.intercept]);
				for (const [name, config] of injectEntries) {
					if (isNullable(config)) continue;
					this.ctx[Context.intercept][name] = config;
				}
			}
			this._runner = {
				epoch: INACTIVE,
				getOuterStack,
				execute: function() {
					if (isConstructor(runtime.callback)) {
						const instance = new runtime.callback(this.ctx, this.config);
						for (const hook of instance?.[symbols.initHooks] ?? []) hook();
						return instance?.[symbols.init]?.();
					} else return runtime.callback(this.ctx, this.config);
				},
				collect
			};
			this.dispose = parent.fiber.effect(() => {
				const remove = runtime.fibers.push(this);
				return async () => {
					this.uid = null;
					emitPluginDisposed(this.context, this);
					if (this.ctx.registry.has(runtime.callback)) {
						remove();
						if (!runtime.fibers.length) this.ctx.registry.delete(runtime.callback);
					}
					this._setEpoch(INACTIVE);
					if (!this.inertia) this._updateState(() => {
						this.inertia = this._unload();
						return 5;
					});
					while (this.inertia) await this.inertia;
				};
			}, "ctx.plugin()");
			try {
				this.context.emit("internal/plugin", this);
			} catch (error) {
				Promise.resolve(this.dispose()).catch((reason) => this.ctx.logger.error(reason));
				throw error;
			}
			if (this.uid !== null && parent.fiber.state !== 5) {
				for (const name of Object.keys(this.inject)) this._checkImpl(name);
				this._refresh();
			}
		} else {
			this.uid = 0;
			this.ctx = this.context = parent;
			this.state = 2;
			this.store = Object.create(null);
			this._runner = {
				epoch: "",
				getOuterStack,
				execute: () => {},
				collect
			};
			this.dispose = () => this.restart();
		}
	}
	/** The plugin's display name, inherited from the nearest named ancestor, else `'root'`. */
	get name() {
		let fiber = this;
		do {
			if (fiber.runtime?.name) return fiber.runtime.name;
			fiber = fiber.parent.fiber;
		} while (fiber !== fiber.parent.fiber);
		return "root";
	}
	/**
	* Throw if the fiber has already been disposed.
	*
	* @returns nothing when the fiber is still active.
	* @throws {CordisError} `INACTIVE_EFFECT` when the fiber's uid has been cleared.
	*/
	assertActive() {
		if (this.uid !== null) return;
		throw new CordisError("INACTIVE_EFFECT");
	}
	_execute(runner) {
		const oldEpoch = runner.epoch;
		return composeError((info) => {
			const safeCollect = (dispose) => {
				if (typeof dispose === "function") runner.collect(dispose);
				else if (!isNullable(dispose)) throw new TypeError("Invalid effect");
			};
			const effect = runner.execute.call(this);
			if (typeof effect === "function") return runner.collect(effect);
			else if (isNullable(effect)) {} else if (!isObject(effect)) throw new TypeError("Invalid effect");
			else if ("then" in effect) return effect.then(safeCollect);
			else if (Symbol.iterator in effect) {
				info.error = /* @__PURE__ */ new Error();
				const iter = effect[Symbol.iterator]();
				while (true) {
					const result = iter.next();
					safeCollect(result.value);
					if (result.done) return;
				}
			} else if (Symbol.asyncIterator in effect) {
				const iter = effect[Symbol.asyncIterator]();
				return (async () => {
					await Promise.resolve();
					info.error = /* @__PURE__ */ new Error();
					while (true) {
						if (runner.epoch !== oldEpoch) return;
						const result = await iter.next();
						safeCollect(result.value);
						if (result.done) return;
					}
				})();
			} else throw new TypeError("Invalid effect");
		}, runner.getOuterStack);
	}
	effect(execute, label = "anonymous") {
		this.assertActive();
		if (this.state === 5) throw new CordisError("INACTIVE_EFFECT");
		const disposables = [];
		let disposing = false;
		let disposalTask;
		const dispose = () => {
			if (disposing) return disposalTask;
			disposing = true;
			let task;
			for (const disposable of disposables.splice(0).reverse()) if (task) task = task.then(() => runDisposable(disposable));
			else {
				const result = runDisposable(disposable);
				if (isObject(result) && "then" in result) task = result;
			}
			return disposalTask = task;
		};
		const meta = {
			label,
			children: []
		};
		const runner = {
			execute,
			epoch: true,
			collect: (dispose) => {
				disposables.push(dispose);
				this._disposables.delete(dispose);
				if (dispose[symbols.effect]) meta.children.push(dispose[symbols.effect]);
			},
			getOuterStack: buildOuterStack()
		};
		let task;
		let executing = true;
		let resolveSetup;
		let rejectSetup;
		let setupBarrier;
		let setupFailed = false;
		let inFlight;
		let removeWrapper = () => false;
		const waitForSetup = () => {
			setupBarrier ??= new Promise((resolve, reject) => {
				resolveSetup = resolve;
				rejectSetup = reject;
			});
			return setupBarrier;
		};
		const disposeAfter = (setup) => {
			return Promise.resolve(setup).then(() => dispose(), async (reason) => {
				await dispose();
				throw reason;
			});
		};
		const finalizeDisposal = (callback) => {
			let result;
			try {
				result = callback();
			} catch (error) {
				removeWrapper();
				throw error;
			}
			if (isObject(result) && "then" in result) {
				const pending = Promise.resolve(result).finally(() => {
					removeWrapper();
					if (inFlight === pending) inFlight = void 0;
				});
				return inFlight = pending;
			}
			removeWrapper();
			return result;
		};
		const wrapper = defineProperty(() => {
			if (!runner.epoch) return setupFailed ? inFlight : void 0;
			runner.epoch = false;
			return finalizeDisposal(() => {
				if (executing) return disposeAfter(waitForSetup());
				return task ? disposeAfter(task) : dispose();
			});
		}, symbols.effect, meta);
		effectInertia.set(wrapper, () => inFlight);
		removeWrapper = this._disposables.push(wrapper);
		try {
			task = this._execute(runner);
		} catch (reason) {
			executing = false;
			setupFailed = true;
			runner.epoch = false;
			let cleanup;
			try {
				cleanup = finalizeDisposal(dispose);
			} finally {
				rejectSetup?.(reason);
			}
			if (isObject(cleanup) && "then" in cleanup) cleanup.catch((error) => this.ctx.logger.error(error));
			throw reason;
		}
		executing = false;
		if (setupBarrier) Promise.resolve(task).then(resolveSetup, rejectSetup);
		task?.catch(() => {
			if (!runner.epoch) return dispose();
			return finalizeDisposal(dispose);
		}).catch((error) => this.ctx.logger.error(error));
		const disposeAsync = () => {
			if (!runner.epoch) return;
			runner.epoch = false;
			return finalizeDisposal(dispose);
		};
		wrapper.then = async (onFulfilled, onRejected) => {
			return Promise.resolve(task).then(() => disposeAsync).then(onFulfilled, onRejected);
		};
		return wrapper;
	}
	/**
	* Return metadata for currently registered effects.
	*
	* @returns one {@link EffectMeta} tree per labeled live effect.
	*/
	getEffects() {
		return [...this._disposables].map((dispose) => dispose[symbols.effect]).filter(Boolean);
	}
	_getState() {
		if (this.uid === null) return 4;
		if (this._error) return 3;
		if (this._runner.epoch !== INACTIVE) return 2;
		return 0;
	}
	_updateState(callback) {
		const oldState = this.state;
		this.state = callback() ?? this._getState();
		if (oldState === this.state) return;
		this.context.emit("internal/status", this, oldState);
		if (oldState !== 2 && this.state !== 2) return;
		for (const key of Reflect.ownKeys(this.ctx.reflect.store)) {
			const impl = this.ctx.reflect.store[key];
			if (impl.fiber !== this) continue;
			this.ctx.reflect.notify([impl.name]);
		}
	}
	_checkImpl(name) {
		const impl = this.ctx.reflect._getImpl(name, true);
		if (!impl) return delete this._store[name];
		try {
			if (impl.check && !impl.check.call(getTraceable(this.ctx, impl.value))) return delete this._store[name];
		} catch (error) {
			impl.fiber.ctx.logger.error(error);
			return delete this._store[name];
		}
		this._store[name] = impl;
	}
	_refresh() {
		let epoch = false;
		epoch = "";
		for (const name of Object.keys(this.inject)) {
			const impl = this._store[name];
			if (!impl) {
				epoch = INACTIVE;
				break;
			}
			epoch += ":" + impl.fiber.uid;
		}
		this._setEpoch(epoch);
	}
	_setEpoch(epoch) {
		const oldEpoch = this._runner.epoch;
		if (epoch === oldEpoch) return;
		this._runner.epoch = epoch;
		if (this.inertia) return;
		this._updateState(() => {
			if (epoch !== INACTIVE && oldEpoch === INACTIVE) {
				this.inertia = this._reload();
				return 1;
			} else {
				this.inertia = this._unload();
				return 5;
			}
		});
	}
	_resolveConfig(config) {
		config = this.context.waterfall(this, "internal/config", config, () => config);
		return this.runtime ? resolveConfig(this.runtime, config) : config;
	}
	async _reload() {
		this.store = { ...this._store };
		const oldEpoch = this._runner.epoch;
		try {
			await Promise.resolve();
			if (this._runner.epoch === oldEpoch) {
				this.config = this._resolveConfig(this._config);
				await this._execute(this._runner);
				this._error = void 0;
			}
		} catch (reason) {
			this.ctx.logger.error(reason);
			this._error = reason;
			this._runner.epoch = INACTIVE;
		}
		this._updateState(() => {
			if (this._runner.epoch === oldEpoch) this.inertia = void 0;
			else {
				this.inertia = this._unload();
				return 5;
			}
		});
	}
	async _unload() {
		await Promise.all(this._disposables.clear().map(async (dispose) => {
			try {
				await composeError(async (info) => {
					await Promise.resolve();
					info.error = /* @__PURE__ */ new Error();
					await runDisposable(dispose);
				}, this._runner.getOuterStack);
			} catch (reason) {
				this.ctx.logger.error(reason);
			}
		}));
		this.store = void 0;
		this._updateState(() => {
			if (this._runner.epoch === INACTIVE) this.inertia = void 0;
			else {
				this.inertia = this._reload();
				return 1;
			}
		});
	}
	/**
	* Wait for current lifecycle work and rethrow startup errors.
	*
	* @returns this fiber, once it has settled into a stable state.
	* @throws the config-validation or plugin-startup error, if any.
	*/
	async await() {
		while (this.inertia) await this.inertia;
		if (this._error) throw this._error;
		return this;
	}
	/**
	* Dispose and immediately reload this plugin with its current config.
	*
	* @returns a promise resolving once the reload settled.
	* @throws {CordisError} `INACTIVE_EFFECT` when the fiber is already disposed.
	*/
	async restart() {
		this.assertActive();
		this._setEpoch(INACTIVE);
		this._refresh();
		await this.await();
	}
	/**
	* Validate and apply new config, then restart the plugin.
	*
	* Runs the `internal/update` waterfall first, so update hooks (and HMR)
	* can veto or replace the restart.
	*
	* @param config — the new raw config; validated before anything restarts.
	* @param noSave — hint for persistence hooks not to write the change back.
	* @returns the update waterfall result; the default restart returns a promise.
	* @throws when validation, an update listener, or the restarted plugin fails.
	*/
	update(config, noSave = false) {
		this.assertActive();
		this._config = config;
		if (this.state !== 2) {
			this._error = void 0;
			this._setEpoch(INACTIVE);
			this._refresh();
			return;
		}
		config = this._resolveConfig(config);
		return this.context.waterfall(this, "internal/update", config, noSave, () => {
			this.config = config;
			this._error = void 0;
			return this.restart();
		});
	}
};
//#endregion
//#region ../../../vendor/cordis/src/reflect.ts
function enhanceError(error) {
	const lines = error.stack.split("\n");
	lines.splice(0, 2, `Error: ${error.message}`);
	error.stack = lines.join("\n");
	return error;
}
const RESERVED_WORDS = ["prototype", "then"];
function isSpecialProperty(prop) {
	return typeof prop === "symbol" || RESERVED_WORDS.includes(prop) || parseInt(prop).toString() === prop || prop.startsWith("_");
}
/**
* Reflection and service-resolution layer installed as `ctx.reflect`.
*
* This service powers the context proxy, service registration, accessors, and
* the mixins that expose core service methods directly on `ctx`.
*/
var ReflectService = class {
	ctx;
	/** Proxy traps implementing service resolution for every context object. */
	static handler = {
		get: (target, prop, ctx) => {
			if (isSpecialProperty(prop)) return Reflect.get(target, prop, ctx);
			if (Reflect.has(target, prop)) return getTraceable(ctx, Reflect.get(target, prop, ctx));
			const error = /* @__PURE__ */ new Error(`cannot get property "${prop}" without inject`);
			try {
				const def = target.reflect.props[prop];
				if (def?.type === "accessor") return def.get.call(ctx, ctx[symbols.receiver], error);
				if (!ctx.fiber.runtime) return ctx.reflect.get(prop, false);
				return ctx.events.waterfall("internal/get", ctx, prop, error, () => {
					const key = target[symbols.isolate][prop];
					let fiber = (ctx[symbols.shadow] ?? ctx).fiber;
					while (true) {
						const impl = fiber.store?.[prop];
						if (impl) return getTraceable(ctx, impl.value);
						if (prop in fiber.inject) {
							error.message = `cannot get required service "${prop}" in inactive context`;
							throw error;
						}
						if (!fiber.runtime) throw error;
						if (fiber.parent[symbols.isolate][prop] !== key) throw error;
						fiber = fiber.parent.fiber;
					}
				});
			} catch (e) {
				throw e === error ? enhanceError(e) : e;
			}
		},
		set: (target, prop, value, ctx) => {
			if (isSpecialProperty(prop)) return Reflect.set(target, prop, value, ctx);
			const error = /* @__PURE__ */ new Error(`cannot set property "${prop}" without provide`);
			const def = target.reflect.props[prop];
			if (!def) {
				if (!ctx.fiber.runtime) return Reflect.set(target, prop, value, ctx);
				throw enhanceError(error);
			}
			try {
				if (def.type === "accessor") {
					if (!def.set) return false;
					return def.set.call(ctx, value, ctx[symbols.receiver], error);
				}
				return ctx.events.waterfall("internal/set", ctx, prop, value, error, () => {
					return ctx.reflect.set(prop, value, error);
				});
			} catch (e) {
				throw e === error ? enhanceError(e) : e;
			}
		},
		has: (target, prop) => {
			if (isSpecialProperty(prop)) return Reflect.has(target, prop);
			if (Reflect.has(target, prop)) return true;
			return !!target.reflect.props[prop];
		}
	};
	/** Service implementations, keyed by isolation label. */
	store = Object.create(null);
	/** Declared context properties (services and accessors), by name. */
	props = Object.create(null);
	constructor(ctx) {
		this.ctx = ctx;
		defineProperty(this, symbols.tracker, {
			property: "ctx",
			noShadow: true
		});
		this.mixin("reflect", [
			"get",
			"set",
			"provide",
			"accessor",
			"mixin"
		]);
		this.mixin("fiber", ["runtime", "effect"]);
		this.mixin("registry", ["inject", "plugin"]);
		this.mixin("events", [
			"on",
			"once",
			"parallel",
			"emit",
			"serial",
			"bail",
			"waterfall"
		]);
	}
	/**
	* Read a service from the store without the inject requirement.
	*
	* @param name — the service name.
	* @param strict — when `true`, only return implementations whose providing
	* fiber is currently active.
	* @returns the service value, or `undefined` when not (yet) provided.
	*/
	get(name, strict = true) {
		return getTraceable(this.ctx, this._getImpl(name, strict)?.value);
	}
	_getImpl(name, strict = true) {
		const key = this.ctx[symbols.isolate][name];
		const impl = key && this.store[key];
		if (!impl) return;
		if (strict && impl.fiber.state !== 2) return;
		return impl;
	}
	/**
	* Overwrite a provided service's value.
	*
	* @param name — the service name.
	* @param value — the new service value.
	* @param error — carrier for the caller stack in diagnostics.
	* @returns `true` on success.
	* @throws when `name` was never provided, or was provided by another fiber.
	*/
	set(name, value, error) {
		const key = this.ctx[symbols.isolate][name];
		const impl = this.store[key];
		if (!impl) throw new Error(`cannot set property "${name}" without provide`);
		if (impl.fiber !== this.ctx.fiber) throw new Error(`cannot set property "${name}" in multiple fibers`);
		impl.value = value;
		return true;
	}
	/**
	* Register a service implementation owned by the current fiber.
	*
	* See the `ctx.provide()` overload above for the full contract.
	*
	* @param name — the service name.
	* @param value — the service value.
	* @param check — optional availability predicate for dependents.
	* @returns a disposer that unregisters the service.
	*/
	provide(name, value, check) {
		return this.ctx.fiber.effect(() => {
			if (!this.props[name]) this.props[name] ??= { type: "service" };
			else if (this.props[name].type !== "service") throw new Error(`property "${name}" is already declared as ${this.props[name].type}`);
			this.props[name] = { type: "service" };
			this.ctx.root[symbols.isolate][name] ??= Symbol(name);
			const key = this.ctx[symbols.isolate][name];
			const impl = {
				name,
				value,
				fiber: this.ctx.fiber,
				check
			};
			if (this.store[key]) throw new Error(`service "${name}" has been registered at <${this.store[key].fiber.name}>`);
			this.store[key] = impl;
			this.ctx.fiber.store[name] = impl;
			if (this.ctx.fiber.state === 2) this.notify([name]);
			return async () => {
				delete this.store[key];
				const fibers = this.notify([name]);
				await Promise.allSettled(fibers.map((fiber) => fiber.await()));
				delete this.ctx.fiber.store[name];
			};
		}, `ctx.provide(${JSON.stringify(name)})`);
	}
	/**
	* Re-evaluate every fiber that requires one of the given services.
	*
	* @param names — the service names that changed.
	* @param filter — restricts notification to matching isolation scopes.
	* @returns the fibers whose dependency state was refreshed.
	*/
	notify(names, filter = (ctx, name) => ctx[symbols.isolate][name] === this.ctx[symbols.isolate][name]) {
		const fibers = [];
		for (const runtime of this.ctx.registry.values()) for (const fiber of runtime.fibers) {
			let hasUpdate = false;
			for (const name of names) {
				if (!(name in fiber.inject)) continue;
				if (!filter(fiber.ctx, name)) continue;
				hasUpdate = true;
				fiber._checkImpl(name);
			}
			if (!hasUpdate) continue;
			fiber._refresh();
			fibers.push(fiber);
		}
		for (const name of names) {
			const self = Object.create(this.ctx);
			self[symbols.filter] = (target) => filter(target, name);
			this.ctx.events.emit(self, "internal/service", name, this._getImpl(name, false)?.value);
		}
		return fibers;
	}
	/**
	* Define a computed context property backed by get/set hooks.
	*
	* @param name — the context property name.
	* @param options — the `get` hook and optional `set` hook.
	* @returns a disposer that removes the accessor.
	*/
	accessor(name, options) {
		return this.ctx.fiber.effect(() => {
			if (name in this.props) throw new Error(`property "${name}" is already declared as ${this.props[name].type}`);
			this.props[name] = {
				type: "accessor",
				...options
			};
			return () => delete this.props[name];
		}, `ctx.accessor(${JSON.stringify(name)})`);
	}
	/**
	* Expose selected members of a service directly on `ctx`.
	*
	* See the `ctx.mixin()` overload above for the full contract.
	*
	* @param source — a context property name or a source object.
	* @param mixins — keys to forward, or a source-key → ctx-key map.
	* @returns a disposer that removes all created accessors.
	*/
	mixin(source, mixins) {
		const self = this;
		return this.ctx.fiber.effect(function* () {
			const entries = Array.isArray(mixins) ? mixins.map((key) => [key, key]) : Object.entries(mixins);
			const getTarget = (ctx, error) => {
				return ctx[source];
			};
			for (const [key, value] of entries) yield self.accessor(value, {
				get(receiver, error) {
					const service = getTarget(this, error);
					if (isNullable(service)) return service;
					const mixin = receiver ? withProps(receiver, service) : service;
					const value = Reflect.get(service, key, mixin);
					if (typeof value !== "function") return value;
					return value.bind(mixin ?? service);
				},
				set(value, receiver, error) {
					const service = getTarget(this, error);
					const mixin = receiver ? withProps(receiver, service) : service;
					return Reflect.set(service, key, value, mixin);
				}
			});
		}, `ctx.mixin(${JSON.stringify(source)})`);
	}
	/**
	* Attach this context's tracing wrapper to a value.
	*
	* @param value — the value to wrap.
	* @returns the traceable wrapper (or the value itself when not applicable).
	*/
	trace(value) {
		return getTraceable(this.ctx, value);
	}
	/**
	* Wrap a callback so calls trace `this` and arguments to this context.
	*
	* @param callback — the function to wrap.
	* @returns a proxy delegating to `callback` with traced values.
	*/
	bind(callback) {
		return new Proxy(callback, {
			apply: (target, thisArg, args) => {
				return Reflect.apply(target, this.trace(thisArg), args.map((arg) => this.trace(arg)));
			},
			construct: (target, args, newTarget) => {
				return Reflect.construct(target, args.map((arg) => this.trace(arg)), newTarget);
			}
		});
	}
};
//#endregion
//#region ../../../vendor/cordis/src/registry.ts
function isApplicable(object) {
	return object && typeof object === "object" && typeof object.apply === "function";
}
/**
* Decorator for declaring service dependencies on classes or class methods.
*
* On classes it contributes to the plugin's static `inject` map. On methods it
* delays the method call until the declared services are available.
*/
/**
* @param name — the required service name.
* @param config — optional intercept config applied for that service.
* @returns the class or method decorator.
*/
function Inject(name, config) {
	return function(value, decorator) {
		if (decorator.kind === "class") {
			if (!Object.hasOwn(value, "inject")) {
				defineProperty(value, "inject", Object.create(Object.getPrototypeOf(value).inject ?? null));
				defineProperty(value.inject, symbols.checkProto, true);
			}
			value.inject[name] = config;
		} else if (decorator.kind === "method") {
			const inject = (value[symbols.metadata] ??= {}).inject ??= Object.create(null);
			inject[name] = config;
			decorator.addInitializer(function() {
				const property = this[symbols.tracker]?.property;
				(this[symbols.initHooks] ??= []).push(() => {
					this.ctx.inject(inject, (ctx) => {
						return value.call(property ? withProps(this, { [property]: ctx }) : this);
					});
				});
			});
		} else throw new Error("@Inject() can only be used on class or class methods");
	};
}
(function(_Inject) {
	function resolve(inject, result = Object.create(null)) {
		if (!inject) return result;
		if (Array.isArray(inject)) for (const name of inject) result[name] = null;
		else if (Reflect.has(inject, symbols.checkProto)) {
			Object.assign(result, resolve(Object.getPrototypeOf(inject)));
			for (const name of Object.keys(inject)) result[name] = inject[name] ?? null;
		} else for (const name of Object.keys(inject)) result[name] = inject[name] ?? null;
		return result;
	}
	_Inject.resolve = resolve;
})(Inject || (Inject = {}));
/**
* Plugin registry installed as `ctx.registry` and mixed into every context.
*
* It normalizes plugin shapes, tracks plugin runtimes, starts fibers, and
* exposes map-like inspection over active plugin callbacks.
*/
var RegistryService = class {
	ctx;
	_counter = 0;
	_internal = /* @__PURE__ */ new Map();
	constructor(ctx) {
		this.ctx = ctx;
		defineProperty(this, symbols.tracker, {
			property: "ctx",
			noShadow: true
		});
	}
	/** Allocate the next fiber uid (increments on every read). */
	get counter() {
		return ++this._counter;
	}
	/** Number of registered plugin runtimes. */
	get size() {
		return this._internal.size;
	}
	/**
	* Resolve a supported plugin shape to its executable callback.
	*
	* @param plugin — a function, class, or `{ apply }` object plugin.
	* @returns the callback identifying the plugin, or `undefined` if invalid.
	*/
	resolve(plugin) {
		try {
			if (typeof plugin === "function") return plugin;
			if (isApplicable(plugin)) return plugin.apply;
		} catch {}
	}
	/**
	* Look up the runtime record for a plugin.
	*
	* @param plugin — any supported plugin shape.
	* @returns the runtime, or `undefined` when the plugin is not registered.
	*/
	get(plugin) {
		const key = this.resolve(plugin);
		return key && this._internal.get(key);
	}
	/**
	* Check whether a plugin has a registered runtime.
	*
	* @param plugin — any supported plugin shape.
	* @returns `true` when at least one fiber of the plugin exists.
	*/
	has(plugin) {
		const key = this.resolve(plugin);
		return !!key && this._internal.has(key);
	}
	/**
	* Dispose every running fiber for a plugin and remove its runtime record.
	*
	* @param plugin — any supported plugin shape.
	* @returns the removed runtime, or `undefined` when none was registered.
	*/
	delete(plugin) {
		const key = this.resolve(plugin);
		const runtime = key && this._internal.get(key);
		if (!runtime) return;
		this._internal.delete(key);
		for (const fiber of runtime.fibers) fiber.dispose();
		return runtime;
	}
	/** Iterate the registered plugin callbacks. */
	keys() {
		return this._internal.keys();
	}
	/** Iterate the registered plugin runtimes. */
	values() {
		return this._internal.values();
	}
	/** Iterate `[callback, runtime]` pairs. */
	entries() {
		return this._internal.entries();
	}
	/**
	* Visit every registered runtime.
	*
	* @param callback — receives each runtime and its identifying callback.
	*/
	forEach(callback) {
		return this._internal.forEach(callback);
	}
	/**
	* Start a callback once the requested dependencies are available.
	*
	* @param inject — required services, as an array or a name → config map.
	* @param callback — plugin body called with `(ctx, config)`.
	* @returns the fiber; awaiting it settles once loading finished.
	*/
	inject(inject, callback) {
		return this.plugin({
			inject,
			apply: callback,
			name: callback.name
		});
	}
	/**
	* Start a plugin in the current context and return its fiber.
	*
	* Creates (or reuses) the plugin's runtime record, then starts a new fiber
	* under the current context. Throws if `plugin` is not a supported shape or
	* if the current fiber is already disposed.
	*
	* @param plugin — a function, class, or `{ apply }` object plugin.
	* @param config — the plugin config, validated against its `Config` schema.
	* @param getOuterStack — captures the caller stack for effect diagnostics.
	* @returns the fiber; awaiting it settles once loading finished.
	*/
	plugin(plugin, config, getOuterStack = buildOuterStack()) {
		const callback = this.resolve(plugin);
		if (!callback) throw new Error("invalid plugin, expect function or object with an \"apply\" method, received " + typeof plugin);
		this.ctx.fiber.assertActive();
		let runtime = this._internal.get(callback);
		if (!runtime) {
			let name = plugin.name;
			if (name === "apply") name = void 0;
			runtime = {
				name,
				callback,
				fibers: new DisposableList(),
				Config: plugin.Config
			};
			this._internal.set(callback, runtime);
		}
		const fiber = new Fiber(this.ctx, config, Inject.resolve(plugin.inject), runtime, getOuterStack);
		const wrapped = Object.create(fiber);
		wrapped.then = (onFulfilled, onRejected) => {
			return fiber.await().then(onFulfilled, onRejected);
		};
		return wrapped;
	}
};
//#endregion
//#region ../../../vendor/cordis/src/context.ts
/**
* Root and child dependency containers for Cordis plugins.
*
* A context is a proxy: normal property reads go through the service resolver,
* while `extend()`, `isolate()`, and `intercept()` create scoped child
* contexts without mutating their parent.
*/
var Context = class Context {
	/** Symbol key under which a disposer exposes its {@link EffectMeta} diagnostics tree. */
	static effect = symbols.effect;
	/** Symbol key for a context's listener filter, consulted on every event dispatch. */
	static filter = symbols.filter;
	/** Symbol key of the isolation map (see the `Context[symbols.isolate]` property). */
	static isolate = symbols.isolate;
	/** Symbol key of the intercept map (see the `Context[symbols.intercept]` property). */
	static intercept = symbols.intercept;
	/**
	* Returns true for Cordis context proxies and context prototypes.
	*
	* Works across realms and across multiple copies of cordis, because the
	* brand is keyed by a global symbol rather than by `instanceof`.
	*
	* @param value — the value to test.
	* @returns `true` if `value` is a Cordis context, narrowing its type.
	*/
	static is(value) {
		return !!value?.[Context.is];
	}
	static {
		Context.is[Symbol.toPrimitive] = () => Symbol.for("cordis.is");
		Context.prototype[Context.is] = true;
	}
	/** Create the root context and install the built-in services. */
	constructor() {
		this[symbols.isolate] = Object.create(null);
		this[symbols.intercept] = Object.create(null);
		const self = new Proxy(this, ReflectService.handler);
		this.root = self;
		this.baseUrl = void 0;
		this.fiber = new Fiber(self, {}, Object.create(null), null, () => []);
		this.reflect = new ReflectService(self);
		this.registry = new RegistryService(self);
		this.events = new EventsService(self);
		this.logger = new LoggerService(self);
		this.fiber._disposables.clear();
		return self;
	}
	[Symbol.for("nodejs.util.inspect.custom")]() {
		return `Context <${this.fiber.name}>`;
	}
	/**
	* Create a child context with extra metadata on top of the current scope.
	*
	* The child prototypally inherits every property of this context; own
	* properties of `meta` shadow the inherited ones. The parent is not mutated.
	*
	* @param meta — own properties (including symbol keys) to define on the child.
	* @returns a child context inheriting from this one.
	*/
	extend(meta = {}) {
		const shadow = Reflect.getOwnPropertyDescriptor(this, symbols.shadow)?.value;
		const self = Object.create(getTraceable(this, this));
		for (const prop of Reflect.ownKeys(meta)) Object.defineProperty(self, prop, Reflect.getOwnPropertyDescriptor(meta, prop));
		if (!shadow) return self;
		return Object.assign(Object.create(self), { [symbols.shadow]: shadow });
	}
	/**
	* Create a child context with an independent service scope for `name`.
	*
	* Below the returned context, reads and writes of the service `name`
	* resolve against the new label instead of the parent's, so a different
	* implementation can be provided without affecting the parent scope.
	* Passing the same `label` to two `isolate()` calls joins their scopes.
	*
	* @param name — the service name to isolate.
	* @param label — scope label to join; defaults to a fresh unique symbol.
	* @returns a child context whose `name` service resolves in the new scope.
	*/
	isolate(name, label) {
		const shadow = Object.create(this[symbols.isolate]);
		shadow[name] = label ?? Symbol(name);
		return this.extend({ [symbols.isolate]: shadow });
	}
	intercept(name, config) {
		const intercept = Object.create(this[symbols.intercept]);
		intercept[name] = config;
		return this.extend({ [symbols.intercept]: intercept });
	}
};
//#endregion
//#region ../../../vendor/cordis/src/service.ts
/**
* Base class for services that expose a named API on `ctx`.
*
* Subclasses call `super(ctx, name)` from their constructor. The service is
* registered immediately and is automatically removed with the owning fiber.
*/
var Service = class Service {
	ctx;
	/** Symbol key of an instance method run after construction (class plugins). */
	static init = symbols.init;
	/** Symbol key of the availability predicate passed to `ctx.provide()`. */
	static check = symbols.check;
	/** Symbol key of the phantom intercept-config type parameter. */
	static config = symbols.config;
	/** Symbol key of the call body making a service callable (e.g. `ctx.logger()`). */
	static invoke = symbols.invoke;
	/** Symbol key of the helper deriving an extended service instance. */
	static extend = symbols.extend;
	/** Symbol key of the tracker metadata used for context tracing. */
	static tracker = symbols.tracker;
	/** Symbol key of the intercept-config resolution helper below. */
	static resolveConfig = symbols.resolveConfig;
	/** The service name this instance is registered under. */
	name;
	/**
	* Register this instance as `name` in the current context.
	*
	* Calls `ctx.reflect.provide(name, this, this[Service.check])`, so the
	* service is unregistered automatically when the owning fiber unloads.
	* Services with a `[Service.invoke]` body return a callable instance.
	*
	* @param ctx — the context to register in (stored as `this.ctx`).
	* @param name — the service name; defaults to the static `provide` field.
	*/
	constructor(ctx, name) {
		this.ctx = ctx;
		name ??= this.constructor["provide"];
		let self = this;
		const tracker = {
			associate: name,
			property: "ctx"
		};
		if (self[symbols.invoke]) self = createCallable(name, joinPrototype(Object.getPrototypeOf(this), Function.prototype), tracker);
		self.ctx = ctx;
		self.name = name;
		defineProperty(self, symbols.tracker, tracker);
		self.ctx.reflect.provide(name, self, this[symbols.check]);
		return self;
	}
	[symbols.filter](ctx) {
		return ctx[symbols.isolate][this.name] === this.ctx[symbols.isolate][this.name];
	}
	[symbols.extend](props) {
		let self;
		if (this[Service.invoke]) self = createCallable(this.name, this, this[symbols.tracker]);
		else self = Object.create(this);
		return Object.assign(self, props);
	}
	/**
	* Merge intercept config from ancestors with optional base and head values.
	*
	* Entries added closer to the root apply first; `base` is prepended and
	* `head` appended. Uses `Config.merge` when the service declares one,
	* otherwise a shallow `Object.assign`.
	*
	* @param base — lowest-precedence config merged before all intercepts.
	* @param head — highest-precedence config merged after all intercepts.
	* @returns the merged config.
	*/
	[symbols.resolveConfig](base, head) {
		let intercept = this.ctx[Context.intercept];
		const configs = [];
		while (this.name in intercept) {
			if (Object.hasOwn(intercept, this.name)) configs.unshift(intercept[this.name]);
			intercept = Object.getPrototypeOf(intercept);
		}
		if (base) configs.unshift(base);
		if (head) configs.push(head);
		if (this["Config"]?.merge) return this["Config"].merge(...configs);
		else return Object.assign({}, ...configs);
	}
	static [Symbol.hasInstance](instance) {
		if (!instance) return false;
		let constructor = instance.constructor;
		while (constructor) {
			constructor = constructor.prototype?.constructor;
			if (constructor === this) return true;
			constructor &&= Object.getPrototypeOf(constructor);
		}
		return false;
	}
};
//#endregion
//#region ../../util/brand/src/index.ts
/**
* Apply a compile-time string brand without changing the value.
* @param value - string admitted by the domain that owns the target brand.
* @returns the same string with the requested compile-time brand.
*/
function brandString(value) {
	return value;
}
/**
* Apply a compile-time number brand without changing the value.
* @param value - number admitted by the domain that owns the target brand.
* @returns the same number with the requested compile-time brand.
*/
function brandNumber(value) {
	return value;
}
//#endregion
//#region ../../util/values/src/index.ts
/**
* Mark an unreachable closed-union branch.
* @param value - impossible value; an unhandled typed variant fails at the call site.
* @param context - optional switch-site label included in the failure message.
* @returns never; a runtime value that escaped its type always throws.
*/
function assertNever(value, context) {
	const rendered = JSON.stringify(value) ?? String(value);
	throw new Error(`unreachable variant${context ? ` in ${context}` : ""}: ${rendered}`);
}
/** Whether a realm-owned intrinsic prototype is backed by its native constructor. */
function hasIntrinsicConstructor(prototype, name) {
	const constructor = Object.getOwnPropertyDescriptor(prototype, "constructor")?.value;
	if (typeof constructor !== "function") return false;
	try {
		return constructor.name === name && constructor.prototype === prototype && Function.prototype.toString.call(constructor) === `function ${name}() { [native code] }`;
	} catch {
		return false;
	}
}
/** Whether a candidate is one realm's intrinsic `Object.prototype`. */
function isIntrinsicObjectPrototype(value) {
	return Object.getPrototypeOf(value) === null && hasIntrinsicConstructor(value, "Object");
}
/** Whether an array uses one realm's intrinsic `Array.prototype`, not a subclass or forged prototype. */
function hasPlainArrayPrototype(value) {
	const prototype = Object.getPrototypeOf(value);
	if (!Array.isArray(prototype) || !hasIntrinsicConstructor(prototype, "Array")) return false;
	const objectPrototype = Object.getPrototypeOf(prototype);
	return typeof objectPrototype === "object" && objectPrototype !== null && isIntrinsicObjectPrototype(objectPrototype);
}
/** Whether an object is a plain or null-prototype record from any JavaScript realm. */
function hasPlainObjectPrototype(value) {
	const prototype = Object.getPrototypeOf(value);
	return prototype === null || typeof prototype === "object" && isIntrinsicObjectPrototype(prototype);
}
/** Return every JSON-visible object key, or reject own data JSON would discard. */
function enumerableStringKeys(value) {
	const keys = Reflect.ownKeys(value);
	if (keys.some((key) => typeof key !== "string" || !Object.prototype.propertyIsEnumerable.call(value, key))) return void 0;
	return keys;
}
/** Validate lossless JSON iteratively, optionally materializing a detached snapshot. */
function walkJsonValue(value, detach) {
	const ancestors = /* @__PURE__ */ new Set();
	let root;
	const assign = (destination, item) => {
		if (destination === void 0) return;
		if (destination.kind === "root") root = item;
		else if (destination.kind === "array") destination.target[destination.index] = item;
		else Object.defineProperty(destination.target, destination.key, {
			value: item,
			enumerable: true,
			configurable: true,
			writable: true
		});
	};
	const tasks = [{
		kind: "visit",
		value,
		...detach ? { destination: { kind: "root" } } : {}
	}];
	for (let task = tasks.pop(); task !== void 0; task = tasks.pop()) {
		if (task.kind === "leave") {
			ancestors.delete(task.source);
			continue;
		}
		if (task.kind === "array-item") {
			if (!Object.prototype.hasOwnProperty.call(task.source, task.index)) return void 0;
			tasks.push({
				kind: "visit",
				value: task.source[task.index],
				...task.target === void 0 ? {} : { destination: {
					kind: "array",
					target: task.target,
					index: task.index
				} }
			});
			continue;
		}
		if (task.kind === "object-property") {
			tasks.push({
				kind: "visit",
				value: task.source[task.key],
				...task.target === void 0 ? {} : { destination: {
					kind: "object",
					target: task.target,
					key: task.key
				} }
			});
			continue;
		}
		const current = task.value;
		if (current === null) {
			assign(task.destination, null);
			continue;
		}
		if (typeof current === "boolean" || typeof current === "string") {
			assign(task.destination, current);
			continue;
		}
		if (typeof current === "number") {
			if (!Number.isFinite(current) || Object.is(current, -0)) return void 0;
			assign(task.destination, current);
			continue;
		}
		if (typeof current !== "object") return void 0;
		if (ancestors.has(current)) return void 0;
		if (Array.isArray(current)) {
			if (!hasPlainArrayPrototype(current)) return void 0;
			const length = current.length;
			if (Reflect.ownKeys(current).length !== length + 1) return void 0;
			const target = detach ? [] : void 0;
			if (target !== void 0) assign(task.destination, target);
			ancestors.add(current);
			tasks.push({
				kind: "leave",
				source: current
			});
			for (let index = length - 1; index >= 0; index--) tasks.push({
				kind: "array-item",
				source: current,
				index,
				...target === void 0 ? {} : { target }
			});
			continue;
		}
		if (!hasPlainObjectPrototype(current)) return void 0;
		const keys = enumerableStringKeys(current);
		if (keys === void 0) return void 0;
		const target = detach ? {} : void 0;
		if (target !== void 0) assign(task.destination, target);
		ancestors.add(current);
		tasks.push({
			kind: "leave",
			source: current
		});
		for (let index = keys.length - 1; index >= 0; index--) {
			const key = keys[index];
			/* v8 ignore next -- the loop is bounded by the captured key count. */
			if (key === void 0) return void 0;
			tasks.push({
				kind: "object-property",
				source: current,
				key,
				...target === void 0 ? {} : { target }
			});
		}
	}
	return detach ? root : true;
}
/**
* Validate and detach lossless JSON in one read per property.
* @param value - candidate value to validate and detach.
* @returns the detached snapshot, or `undefined` when the value is not losslessly JSON-serializable.
*/
function snapshotJsonValue(value) {
	return walkJsonValue(value, true);
}
/**
* Test the same lossless JSON rules as {@link snapshotJsonValue} without detaching the value.
* @param value - candidate value to test.
* @returns whether the value survives a JSON round trip without loss.
*/
function isJsonValue(value) {
	return walkJsonValue(value, false) === true;
}
/**
* Compare JSON-compatible values structurally.
* @param a - one JSON-compatible value.
* @param b - the other JSON-compatible value.
* @returns whether both values contain the same JSON data.
*/
function deepEqualJson(a, b) {
	if (a === b) return true;
	if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) return false;
	if (Array.isArray(a) || Array.isArray(b)) {
		if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
		return a.every((entry, index) => deepEqualJson(entry, b[index]));
	}
	const left = a;
	const right = b;
	const keys = Object.keys(left);
	if (keys.length !== Object.keys(right).length) return false;
	return keys.every((key) => key in right && deepEqualJson(left[key], right[key]));
}
/**
* Deep-freeze an object graph in place while leaving live AbortSignal objects mutable.
* @param value - value to freeze.
* @returns the same value after every reachable enumerable child is frozen.
*/
function deepFreeze(value) {
	const seen = /* @__PURE__ */ new WeakSet();
	const pending = [{
		kind: "visit",
		node: value
	}];
	while (pending.length > 0) {
		const task = pending.pop();
		/* v8 ignore next -- the loop condition guarantees one pending task. */
		if (task === void 0) continue;
		if (task.kind === "property") {
			pending.push({
				kind: "visit",
				node: task.source[task.key]
			});
			continue;
		}
		const node = task.node;
		if (node === null || typeof node !== "object") continue;
		if (node instanceof AbortSignal) continue;
		if (seen.has(node)) continue;
		seen.add(node);
		Object.freeze(node);
		const keys = Object.keys(node);
		for (let index = keys.length - 1; index >= 0; index--) {
			const key = keys[index];
			/* v8 ignore next -- the loop is bounded by the captured key count. */
			if (key === void 0) continue;
			pending.push({
				kind: "property",
				source: node,
				key
			});
		}
	}
	return value;
}
//#endregion
//#region ../../core/session/src/types.ts
/**
* Brand a string as a {@link SessionId}.
* @param id - the raw session id string.
* @returns the same string with the session-id brand.
*/
function SessionId(id) {
	return brandString(id);
}
/**
* Admit a numeric value as an existing Session event position.
* @param value - non-negative safe integer admitted by the owning log operation.
* @returns the same number with the Session-sequence brand.
*/
function SessionSeq(value) {
	if (!Number.isSafeInteger(value) || value < 0 || Object.is(value, -0)) throw new TypeError(`SessionSeq must be a non-negative safe integer, got ${String(value)}`);
	return brandNumber(value);
}
/**
* Admit a numeric value as a Session log offset.
* @param value - non-negative safe integer used as a gap or prefix length.
* @returns the same number with the Session-log-offset brand.
*/
function SessionLogOffset(value) {
	if (!Number.isSafeInteger(value) || value < 0 || Object.is(value, -0)) throw new TypeError(`SessionLogOffset must be a non-negative safe integer, got ${String(value)}`);
	return brandNumber(value);
}
//#endregion
//#region ../../core/session/src/known-event-types.ts
/**
* GENERATED by `scripts/gen-persistence-catalog.ts` — do not edit by hand; run
* `pnpm run gen-persistence-catalog` to regenerate (verified fresh by
* `pnpm run verify-persistence-catalog`, part of `doc-sync`).
* @module @deepseek-ai/dsh-session/known-event-types
*/
/**
* Every `SessionEventMap` member declared in this repository — the event
* vocabulary this build understands. The persistence read path refuses to
* interpret a log containing a type outside this set unless the event
* carries the envelope's `ignorable` marker (see `SessionEvent.ignorable`
* in `./types.ts`): such a log was likely written by a newer harness, and
* silently skipping a required event would reconstruct a wrong session.
* Downstream (out-of-repo) plugin events are outside this list by
* construction. The persisted `SessionEvent.ignorable` marker is the
* compatibility mechanism; event-name registration was rejected because
* it does not classify omission safety and would make reads
* composition-dependent. The rationale is in
* `.agents/notes/implemented/architecture/2026-08-30-retain-ignorable-external-session-events.md`.
*/
const KNOWN_SESSION_EVENT_TYPES = new Set([
	"agent-preset/selected",
	"agent/inbox/spliced",
	"approval/asked",
	"approval/decided",
	"approval/policy",
	"assistant/attempt",
	"assistant/message",
	"command/done",
	"command/run",
	"compaction/end",
	"compaction/prune",
	"compaction/start",
	"compaction/summary",
	"deliverables/presented",
	"feedback/message-delete",
	"feedback/message-put",
	"feedback/record",
	"goal/change",
	"hook/invoked",
	"hook/result",
	"llm/retry",
	"llm/retry-started",
	"model/selection",
	"permission/preset",
	"plan/mode",
	"request/context",
	"request/header",
	"sandbox/mode",
	"schedule/change",
	"session-log-deepseek/delivery-accepted",
	"session/end-seed",
	"session/title",
	"session/title-llm-request",
	"step/end",
	"step/start",
	"subagent/catalog",
	"subagent/descriptor",
	"subagent/model-selection-policy",
	"system/message",
	"team/member",
	"team/message/delivered",
	"team/message/queued",
	"team/task",
	"todo/write",
	"tool-workflow/agent-end",
	"tool-workflow/agent-start",
	"tool-workflow/run-end",
	"tool-workflow/run-start",
	"tool/call",
	"tool/ptc-dispatch",
	"tool/ptc-dispatch-start",
	"tool/result",
	"turn/end",
	"turn/start",
	"user/message",
	"web/deepseek-search-llm-request"
]);
//#endregion
//#region ../../core/session/src/surface.ts
/** Runtime counterpart of the message-producing event union. */
const SURFACE_EVENT_TYPES = new Set([
	"system/message",
	"user/message",
	"assistant/message",
	"tool/result"
]);
/**
* Whether an event type can join the model-visible surface.
* @param type - event type to test.
* @returns true for one of the four message-producing event types.
*/
function isSurfaceEligibleType(type) {
	return SURFACE_EVENT_TYPES.has(type);
}
/**
* Project a single event into the LLM message it derives to, or null when it
* produces none — a non-surface event (attempt, boundary, log-only record) or an
* empty-content assistant/message (which exists only to host usage). This is
* THE per-node projection rule: `Session.deriveMessages` folds it over the
* live surface, external reconstructors and pure projections fold the same
* function over a log prefix's surface to rebuild the exact messages any
* request was built from. The returned message is the already frozen message
* nested in the event wrapper and shared by delivery, durable history, and
* model requests.
* @param event - the event to project.
* @returns the derived message, or null when the event produces none.
*/
function deriveEventMessage(event) {
	switch (event.type) {
		case "user/message": return event.data;
		case "system/message":
		case "assistant/message":
			if (event.data.message.content.length === 0) return null;
			return event.data.message;
		case "tool/result": return event.data.message;
		default: return null;
	}
}
/** Whether a payload field is a JSON object rather than an array or scalar. */
function isRecord(value) {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
/**
* Reject noncanonical request-header fields and contradictory tool failure metadata.
* This does not validate complete event payloads or embedded provider streams.
* @param event - event whose locally related payload fields are inspected.
* @param subject - event location to include in validation errors.
* @throws when request data/header is not an object, optional header fields are empty, or tool failure metadata contradicts its message.
*/
function validateSessionEventData(event, subject) {
	const data = event.data;
	if (event.type === "request/header") {
		if (!isRecord(data)) throw new Error(`${subject} data must be an object`);
		const header = data["header"];
		if (!isRecord(header)) throw new Error(`${subject} header must be an object`);
		if (Object.hasOwn(header, "system")) throw new Error(`${subject} must omit header.system; use system/message`);
		if (Array.isArray(header["tools"]) && header["tools"].length === 0) throw new Error(`${subject} must omit empty tools`);
		const defaults = header["adapterDefaults"];
		if (isRecord(defaults) && Object.keys(defaults).length === 0) throw new Error(`${subject} must omit empty adapterDefaults`);
	} else if (event.type === "tool/result") {
		if (!isRecord(data)) throw new Error(`${subject} data must be an object`);
		if (data["error"] === void 0) return;
		const message = data["message"];
		const content = isRecord(message) ? message["content"] : void 0;
		const block = Array.isArray(content) ? content[0] : void 0;
		if (!isRecord(block) || block["isError"] !== true) throw new Error(`${subject} error requires message content[0].isError === true`);
	}
}
/** Create an empty surface fold state. */
function createFoldState() {
	return {
		nodes: [],
		replaceGeneration: 0
	};
}
/** Whether a runtime value is a non-negative safe event sequence. */
function isEventSeq(value) {
	return typeof value === "number" && Number.isSafeInteger(value) && value >= 0 && !Object.is(value, -0);
}
/** Whether a runtime value is the exact positional-replacement shape. */
function isReplaceOp(value) {
	const op = value;
	return Object.keys(op).length === 3 && Object.hasOwn(op, "op") && Object.hasOwn(op, "startSeq") && Object.hasOwn(op, "endSeq") && op["op"] === "replace" && isEventSeq(op["startSeq"]) && isEventSeq(op["endSeq"]);
}
/** Validate event-local surface eligibility and return its operation. */
function surfaceOpOf(event) {
	const raw = event;
	if (!isSurfaceEligibleType(event.type)) {
		if (!KNOWN_SESSION_EVENT_TYPES.has(event.type) && event.ignorable === true) return;
		if (raw.surfaceOp !== void 0) throw new Error(`session event "${event.type}" is not surface-eligible and cannot carry surfaceOp`);
		if (raw.sourceEventSeqs !== void 0) throw new Error(`session event "${event.type}" is not surface-eligible and cannot carry sourceEventSeqs`);
		return;
	}
	const op = raw.surfaceOp;
	if (op === void 0) throw new Error(`session event "${event.type}" is surface-eligible and requires a surfaceOp marker`);
	if (op === "append") return op;
	if (op === null || typeof op !== "object" || Array.isArray(op)) throw new Error(`session event "${event.type}" carries an invalid surfaceOp`);
	if (!isReplaceOp(op)) throw new Error(`session event "${event.type}" carries an invalid replace surfaceOp`);
	return op;
}
/** Validate cited source-event seqs against prior log entries and the replacement range. */
function assertProvenance(event, shadowedSeqs) {
	const raw = event.sourceEventSeqs;
	if (event.type === "assistant/message" && raw !== void 0) throw new Error("assistant/message embeds its source stream and cannot carry sourceEventSeqs");
	const sources = /* @__PURE__ */ new Set();
	if (raw !== void 0) {
		if (!Array.isArray(raw)) throw new Error(`sourceEventSeqs on event at seq ${event.seq} must be an array when present`);
		if (raw.length === 0) throw new Error("sourceEventSeqs must not be empty");
		let nonEarlierSource;
		for (const source of raw) {
			if (!isEventSeq(source)) throw new Error(`session event "${event.type}" sourceEventSeqs must densely contain non-negative safe integers`);
			sources.add(source);
			if (nonEarlierSource === void 0 && source >= event.seq) nonEarlierSource = source;
		}
		if (sources.size !== raw.length) throw new Error("sourceEventSeqs must not contain duplicates");
		if (nonEarlierSource !== void 0) throw new Error(`sourceEventSeqs must reference earlier events: ${nonEarlierSource} >= current seq ${event.seq}`);
	}
	const missing = shadowedSeqs.filter((seq) => !sources.has(seq));
	if (missing.length > 0) throw new Error(`surface replace: sourceEventSeqs must include every shadowed surface node; missing ${missing.join(", ")}`);
}
/**
* Validate one event's surface metadata without checking membership in a log or surface.
* @param event - event whose marker and source sequence values are inspected.
* Unknown ignorable records retain opaque metadata and never change the surface.
* @returns the validated operation, or undefined for a log-only or unknown ignorable event.
* @throws when metadata violates event-local eligibility, marker, or source-sequence rules.
*/
function validateSurfaceMetadata(event) {
	const op = surfaceOpOf(event);
	if (op !== void 0 && op !== "append" && (op.startSeq >= event.seq || op.endSeq >= event.seq)) throw new Error(`surface replace at seq ${event.seq}: startSeq and endSeq must reference earlier events`);
	if (op !== void 0) assertProvenance(event, []);
	return op;
}
/** Locate one replacement range without mutating the current fold state. */
function replacementRange(state, op) {
	const startIdx = state.nodes.indexOf(op.startSeq);
	if (startIdx === -1) throw new Error(`surface replace: start seq ${op.startSeq} not found in surface`);
	const endIdx = state.nodes.indexOf(op.endSeq);
	if (endIdx === -1) throw new Error(`surface replace: end seq ${op.endSeq} not found in surface`);
	if (startIdx > endIdx) throw new Error(`surface replace: start seq ${op.startSeq} (index ${startIdx}) is after end seq ${op.endSeq} (index ${endIdx})`);
	return {
		startIdx,
		endIdx,
		shadowedSeqs: state.nodes.slice(startIdx, endIdx + 1)
	};
}
/**
* Deep structural equality over the session-event JSON value domain
* (null/boolean/number/string, arrays, plain objects). Replaces
* `node:util`'s isDeepStrictEqual to keep this module browser-safe.
*/
function isDeepEqualJson(a, b) {
	if (a === b) return true;
	if (Array.isArray(a) || Array.isArray(b)) {
		if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
		return a.every((item, i) => isDeepEqualJson(item, b[i]));
	}
	if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) return false;
	const aKeys = Object.keys(a);
	const bRecord = b;
	if (aKeys.length !== Object.keys(b).length) return false;
	return aKeys.every((key) => Object.hasOwn(b, key) && isDeepEqualJson(a[key], bRecord[key]));
}
/** Restrict a tool-result replacement to one current result's content. */
function assertToolResultRewrite(event, shadowedSeqs, events, baseSeq) {
	if (event.type !== "tool/result") return;
	if (shadowedSeqs.length !== 1) throw new Error("tool/result surface replacement must rewrite exactly one current node");
	for (const originalSeq of shadowedSeqs) {
		const original = events[originalSeq - baseSeq];
		if (original?.type !== "tool/result") throw new Error("tool/result surface replacement must target a current tool/result");
		const originalRest = { ...original.data };
		const replacementRest = { ...event.data };
		const originalResult = original.data.message.content[0];
		const replacementResult = event.data.message.content[0];
		originalRest["message"] = {
			...original.data.message,
			content: [{
				...originalResult,
				content: null
			}]
		};
		replacementRest["message"] = {
			...event.data.message,
			content: [{
				...replacementResult,
				content: null
			}]
		};
		if (!isDeepEqualJson(originalRest, replacementRest)) throw new Error("tool/result surface replacement may change only content");
	}
}
/**
* Protect the system prompt at surface node 0. A replacement covering node 0
* while that node is a `system/message` must itself be a `system/message` over
* exactly that node; later system nodes carry no protection and a compaction
* range may shadow them.
*/
function assertSystemHeadRewrite(event, state, startIdx, shadowedSeqs, events, baseSeq) {
	if (startIdx !== 0) return;
	if (events[state.nodes[0] - baseSeq]?.type !== "system/message") return;
	if (event.type !== "system/message" || shadowedSeqs.length !== 1) throw new Error("surface replace: node 0 holds the system prompt and may be rewritten only by a system/message over exactly that node");
}
/** Validate one event at its replay boundary and prepare its atomic fold transition. */
function planSurfaceEvent(state, event, expectedSeq, events, baseSeq) {
	if (event.seq !== expectedSeq) throw new Error(`session event seq ${event.seq} is not contiguous; expected ${expectedSeq}`);
	const surfaceOp = validateSurfaceMetadata(event);
	if (surfaceOp === void 0) return;
	if (surfaceOp === "append") return {
		kind: "append",
		seq: event.seq
	};
	const range = replacementRange(state, surfaceOp);
	assertProvenance(event, range.shadowedSeqs);
	assertToolResultRewrite(event, range.shadowedSeqs, events, baseSeq);
	assertSystemHeadRewrite(event, state, range.startIdx, range.shadowedSeqs, events, baseSeq);
	return {
		kind: "replace",
		seq: event.seq,
		start: surfaceOp.startSeq,
		end: surfaceOp.endSeq,
		...range
	};
}
/** Apply one event and return replacement metadata only when one occurred. */
function applySurfaceEvent(state, event, expectedSeq, events, baseSeq) {
	return applySurfacePlan(state, planSurfaceEvent(state, event, expectedSeq, events, baseSeq));
}
/** Commit one previously validated surface transition. */
function applySurfacePlan(state, plan) {
	if (plan?.kind === "append") state.nodes.push(plan.seq);
	else if (plan?.kind === "replace") {
		state.nodes.splice(plan.startIdx, plan.endIdx - plan.startIdx + 1, plan.seq);
		state.replaceGeneration += 1;
	}
	if (plan?.kind !== "replace") return;
	return {
		seq: plan.seq,
		start: plan.start,
		end: plan.end,
		shadowedSeqs: plan.shadowedSeqs
	};
}
/** Incremental ordered surface view and append-boundary validator. */
var SurfaceManager = class {
	log;
	baseSeq;
	/** Shared transition state; replacement history is not retained. */
	_state = createFoldState();
	/** Last processed absolute seq. */
	_lastProcessedSeq;
	/** Candidate already validated by `validateNext`, pending exact log admission. */
	_pendingPlan;
	/**
	* @param log - Contiguous complete log or loaded event window.
	* @param baseSeq - Absolute sequence of the window's first event.
	*/
	constructor(log, baseSeq = SessionLogOffset(0)) {
		this.log = log;
		this.baseSeq = baseSeq;
		this._lastProcessedSeq = baseSeq === 0 ? -1 : SessionSeq(baseSeq - 1);
	}
	/**
	* Validate the next candidate without mutating the committed surface.
	* @param event - candidate event that has not entered the log yet.
	*/
	validateNext(event) {
		if (this._lastProcessedSeq < this.baseSeq + this.log.length - 1) this._processDelta();
		const expectedSeq = SessionSeq(this.baseSeq + this.log.length);
		this._pendingPlan = {
			event,
			expectedSeq,
			plan: planSurfaceEvent(this._state, event, expectedSeq, this.log, this.baseSeq)
		};
	}
	/** Monotonic count of folded positional replacements. */
	get replaceGeneration() {
		if (this._lastProcessedSeq < this.baseSeq + this.log.length - 1) this._processDelta();
		return this._state.replaceGeneration;
	}
	/** Surface event sequences in model-visible order. */
	get nodes() {
		if (this._lastProcessedSeq < this.baseSeq + this.log.length - 1) this._processDelta();
		return this._state.nodes;
	}
	/** Fold events appended since the previous access. */
	_processDelta() {
		const tailSeq = this.baseSeq + this.log.length - 1;
		for (let seq = this._lastProcessedSeq + 1; seq <= tailSeq; seq++) {
			const index = seq - this.baseSeq;
			const event = this.log[index];
			const pending = this._pendingPlan;
			if (pending?.event === event && pending.expectedSeq === seq) applySurfacePlan(this._state, pending.plan);
			else applySurfaceEvent(this._state, event, SessionSeq(seq), this.log, this.baseSeq);
			if (pending !== void 0 && pending.expectedSeq <= seq) this._pendingPlan = void 0;
			this._lastProcessedSeq = SessionSeq(seq);
		}
	}
};
//#endregion
//#region ../../typert/protocol/src/remote-error.ts
/**
* One Remote call failure: a real Error carrying its stable code and typed
* details. Owners throw it at the failure point; the Host Gateway encodes it
* onto the wire unchanged; the Client face rebuilds an instance for the
* `RemoteResult` error branch, so `throw result.error` keeps throw semantics.
* Discrimination is always by `code`, never by instanceof.
*/
var RemoteError = class extends Error {
	code;
	details;
	/** Structural marker: cross-realm/bundle identification never uses instanceof. */
	isDSHRemoteError = true;
	/**
	* @param code - stable failure code declared in {@link RemoteErrorDetailsMap}.
	* @param message - human diagnostic carried across the wire.
	* @param details - structured payload typed by the code.
	* @param options - standard Error options (`cause` survives in-process only).
	*/
	constructor(code, message, details, options) {
		super(message, options);
		this.code = code;
		this.details = details;
		this.name = "RemoteError";
	}
};
//#endregion
//#region ../../typert/protocol/src/index.ts
/**
* Remote decorators and explicit Gateway bindings backed by versioned
* descriptors carried on decorated class prototypes. Strict reflection
* remains a Typert compiler responsibility.
* @module @deepseek-ai/dsh-typert-protocol
*/
const TYPERT_REMOTE_SEGMENT_PATTERN = /^[A-Za-z0-9_$.-]+$/;
/**
* Test one generated Remote name against the Connection endpoint grammar.
* @param value - namespace, method, lookup, or Context segment.
* @returns whether the value can cross the shared RPC carrier unchanged.
*/
function isTypertRemoteSegment(value) {
	return value !== "." && value !== ".." && TYPERT_REMOTE_SEGMENT_PATTERN.test(value);
}
const REMOTE_METHOD_DESCRIPTOR = "@deepseek-ai/dsh-typert-protocol/remote-methods";
/**
* Bind one visible Service field to a Cordis key and Remote namespace.
* @param service - owning Service instance, normally `this`.
* @param serviceKey - exact Cordis service key.
* @param options - optional distinct wire namespace.
* @returns a frozen, inspectable binding with no compiler-injected metadata.
*/
function bindTypertRemote(service, serviceKey, options = {}) {
	validateName("service key", serviceKey);
	const namespace = options.namespace ?? serviceKey;
	validateName("namespace", namespace);
	return Object.freeze({
		service,
		serviceKey,
		namespace
	});
}
/** Cordis Service base that exposes its registered name through Typert Gateway. */
var TypertRemoteService = class extends Service {
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
};
function Remote(methodExportOrOptions, context) {
	if (typeof methodExportOrOptions === "string") {
		validateName("Remote export name", methodExportOrOptions);
		return remoteDecorator({ kind: "direct" }, void 0, methodExportOrOptions);
	}
	if (typeof methodExportOrOptions === "object") {
		if (remoteOptionMode(methodExportOrOptions) !== "stream" || Reflect.ownKeys(methodExportOrOptions).length !== 1) throw new TypeError("typert-protocol: Remote options must contain exactly mode: \"stream\"");
		return remoteDecorator({ kind: "direct" }, "stream");
	}
	if (context === void 0) throw new TypeError("typert-protocol: Remote decorator context is missing");
	addMarkerInitializer(context, { kind: "direct" });
}
function remoteOptionMode(options) {
	return Reflect.get(options, "mode");
}
function remoteDecorator(invocation, mode, exportName) {
	return function(_method, context) {
		addMarkerInitializer(context, invocation, mode, exportName);
	};
}
function readRemoteMethodDescriptor(prototype) {
	const property = Object.getOwnPropertyDescriptor(prototype, REMOTE_METHOD_DESCRIPTOR);
	if (property === void 0) return void 0;
	const descriptor = property.value;
	if (descriptor === null || typeof descriptor !== "object") throw new TypeError("typert-protocol: Remote method descriptor must be an object");
	const version = Reflect.get(descriptor, "version");
	if (version !== 1) throw new TypeError(`typert-protocol: unsupported Remote method descriptor version ${String(version)}`);
	const methods = Reflect.get(descriptor, "methods");
	if (!Array.isArray(methods)) throw new TypeError("typert-protocol: Remote method descriptor methods must be an array");
	return descriptor;
}
function addMarkerInitializer(context, invocation, mode, exportName) {
	if (context.private || context.static || typeof context.name !== "string") throw new TypeError("typert-protocol: Remote decorators require a public instance method with a string name");
	const method = context.name;
	context.addInitializer(function() {
		const prototype = Object.getPrototypeOf(this);
		if (prototype === null) throw new TypeError(`typert-protocol: cannot mark Remote method "${method}" on an object without a prototype`);
		mark(prototype, method, invocation, mode, exportName);
	});
}
function mark(prototype, method, invocation, mode, exportName) {
	const descriptor = readRemoteMethodDescriptor(prototype);
	const marker = Object.freeze({
		method,
		...exportName === void 0 || exportName === method ? {} : { exportName },
		...mode === void 0 ? {} : { mode },
		invocation: Object.freeze(invocation)
	});
	const current = descriptor?.methods.find((candidate) => candidate.method === method);
	if (current !== void 0) {
		if (current.exportName === marker.exportName && current.mode === marker.mode && sameInvocation(current.invocation, invocation)) return;
		throw new Error(`typert-protocol: Remote method "${method}" has conflicting invocation markers`);
	}
	Object.defineProperty(prototype, REMOTE_METHOD_DESCRIPTOR, {
		configurable: true,
		value: Object.freeze({
			version: 1,
			methods: Object.freeze([...descriptor?.methods ?? [], marker])
		})
	});
}
function sameInvocation(left, right) {
	if (left.kind === "direct") return right.kind === "direct";
	if (right.kind === "direct") return false;
	return left.context === right.context;
}
function validateName(subject, value) {
	if (!isTypertRemoteSegment(value)) throw new TypeError(`typert-protocol: ${subject} must contain only RPC endpoint segment characters`);
}
//#endregion
//#region ../../util/crypto/src/index.ts
/**
* Random v4 UUID, minted from `crypto.getRandomValues`.
* @returns the UUID string.
*/
function randomUUID() {
	const bytes = globalThis.crypto.getRandomValues(new Uint8Array(16));
	const hex = Array.from(bytes, (byte, index) => {
		return (index === 6 ? byte & 15 | 64 : index === 8 ? byte & 63 | 128 : byte).toString(16).padStart(2, "0");
	}).join("");
	return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
//#endregion
//#region ../../llm/llm/src/message.ts
/** Message value types, identity, and immutable construction helpers. */
/**
* Detach and deep-freeze a message whose identity already exists.
* @param message - complete message, including its stable identity.
* @returns an immutable snapshot that preserves the identity.
*/
function freezeMessage(message) {
	return deepFreeze(structuredClone(message));
}
/**
* Create one identified message and freeze it before publication.
* @param input - complete role, content, and source for a new message.
* @returns an immutable message with a fresh stable identity.
*/
function createMessage(input) {
	return freezeMessage({
		...input,
		id: brandString(randomUUID())
	});
}
//#endregion
//#region ../../../vendor/schemastery/src/index.ts
const kSchema = Symbol.for("schemastery");
const kValidationError = Symbol.for("ValidationError");
globalThis.__schemastery_index__ ??= 0;
globalThis.__schemastery_refs__ = void 0;
var ValidationError = class extends TypeError {
	options;
	name = "ValidationError";
	constructor(message, options) {
		let prefix = "$";
		for (const segment of options.path || []) if (typeof segment === "string") prefix += "." + segment;
		else if (typeof segment === "number") prefix += "[" + segment + "]";
		else if (typeof segment === "symbol") prefix += `[Symbol(${segment.toString()})]`;
		if (prefix.startsWith(".")) prefix = prefix.slice(1);
		super((prefix === "$" ? "" : `${prefix} `) + message);
		this.options = options;
	}
	static is(error) {
		return !!error?.[kValidationError];
	}
};
Object.defineProperty(ValidationError.prototype, kValidationError, { value: true });
const Schema = function(options) {
	const schema = function(data, options = {}) {
		return Schema.resolve(data, schema, options)[0];
	};
	if (options.refs) {
		const refs = mapValues(options.refs, (options) => new Schema(options));
		const getRef = (uid) => refs[uid];
		for (const key in refs) {
			const options = refs[key];
			options.sKey = getRef(options.sKey);
			options.inner = getRef(options.inner);
			options.list = options.list && options.list.map(getRef);
			options.dict = options.dict && mapValues(options.dict, getRef);
		}
		return refs[options.uid];
	}
	Object.assign(schema, options);
	if (typeof schema.callback === "string") try {
		schema.callback = new Function("return " + schema.callback)();
	} catch {}
	Object.defineProperty(schema, "uid", { value: globalThis.__schemastery_index__++ });
	Object.setPrototypeOf(schema, Schema.prototype);
	schema.meta ||= {};
	schema.toString = schema.toString.bind(schema);
	return schema;
};
Schema.prototype = Object.create(Function.prototype);
Schema.prototype[kSchema] = true;
Object.defineProperty(Schema.prototype, "~standard", { get() {
	return {
		version: 1,
		vendor: "schemastery",
		validate: (value) => {
			try {
				return { value: Schema.resolve(value, this, {})[0] };
			} catch (error) {
				if (ValidationError.is(error)) return { issues: [{
					message: error.message,
					path: error.options.path
				}] };
				throw error;
			}
		}
	};
} });
Schema.ValidationError = ValidationError;
Schema.prototype.toJSON = function toJSON() {
	if (globalThis.__schemastery_refs__) {
		globalThis.__schemastery_refs__[this.uid] ??= JSON.parse(JSON.stringify({ ...this }));
		return this.uid;
	}
	globalThis.__schemastery_refs__ = { [this.uid]: { ...this } };
	globalThis.__schemastery_refs__[this.uid] = JSON.parse(JSON.stringify({ ...this }));
	const result = {
		uid: this.uid,
		refs: globalThis.__schemastery_refs__
	};
	globalThis.__schemastery_refs__ = void 0;
	return result;
};
Schema.prototype.set = function set(key, value) {
	this.dict[key] = value;
	return this;
};
Schema.prototype.push = function push(value) {
	this.list.push(value);
	return this;
};
function mergeDesc(original, messages) {
	const result = typeof original === "string" ? { "": original } : { ...original };
	for (const locale in messages) {
		const value = messages[locale];
		if (value?.$description || value?.$desc) result[locale] = value.$description || value.$desc;
		else if (typeof value === "string") result[locale] = value;
	}
	return result;
}
function getInner(value) {
	return value?.$value ?? value?.$inner;
}
function extractKeys(data) {
	return filterKeys(data ?? {}, (key) => !key.startsWith("$"));
}
Schema.prototype.i18n = function i18n(messages) {
	const schema = Schema(this);
	const desc = mergeDesc(schema.meta.description, messages);
	if (Object.keys(desc).length) schema.meta.description = desc;
	if (schema.dict) schema.dict = mapValues(schema.dict, (inner, key) => {
		return inner.i18n(mapValues(messages, (data) => getInner(data)?.[key] ?? data?.[key]));
	});
	if (schema.list) schema.list = schema.list.map((inner, index) => {
		return inner.i18n(mapValues(messages, (data = {}) => {
			if (Array.isArray(getInner(data))) return getInner(data)[index];
			if (Array.isArray(data)) return data[index];
			return extractKeys(data);
		}));
	});
	if (schema.inner) schema.inner = schema.inner.i18n(mapValues(messages, (data) => {
		if (getInner(data)) return getInner(data);
		return extractKeys(data);
	}));
	if (schema.sKey) schema.sKey = schema.sKey.i18n(mapValues(messages, (data) => data?.$key));
	return schema;
};
Schema.prototype.extra = function extra(key, value) {
	const schema = Schema(this);
	schema.meta = {
		...schema.meta,
		[key]: value
	};
	return schema;
};
for (const key of [
	"required",
	"disabled",
	"collapse",
	"hidden",
	"loose"
]) Object.assign(Schema.prototype, { [key](value = true) {
	const schema = Schema(this);
	schema.meta = {
		...schema.meta,
		[key]: value
	};
	return schema;
} });
Schema.prototype.deprecated = function deprecated() {
	const schema = Schema(this);
	schema.meta.badges ||= [];
	schema.meta.badges.push({
		text: "deprecated",
		type: "danger"
	});
	return schema;
};
Schema.prototype.experimental = function experimental() {
	const schema = Schema(this);
	schema.meta.badges ||= [];
	schema.meta.badges.push({
		text: "experimental",
		type: "warning"
	});
	return schema;
};
Schema.prototype.pattern = function pattern(regexp) {
	const schema = Schema(this);
	const pattern = pick(regexp, ["source", "flags"]);
	schema.meta = {
		...schema.meta,
		pattern
	};
	return schema;
};
Schema.prototype.simplify = function simplify(value) {
	if (deepEqual(value, this.meta.default, this.type === "dict")) return null;
	if (isNullable(value)) return value;
	if (this.type === "object" || this.type === "dict") {
		const result = {};
		for (const key in value) {
			const item = (this.type === "object" ? this.dict[key] : this.inner)?.simplify(value[key]);
			if (this.type === "dict" || !isNullable(item)) result[key] = item;
		}
		if (deepEqual(result, this.meta.default, this.type === "dict")) return null;
		return result;
	} else if (this.type === "array" || this.type === "tuple") {
		const result = [];
		value.forEach((value, index) => {
			const schema = this.type === "array" ? this.inner : this.list[index];
			const item = schema ? schema.simplify(value) : value;
			result.push(item);
		});
		return result;
	} else if (this.type === "intersect") {
		const result = {};
		for (const item of this.list) Object.assign(result, item.simplify(value));
		return result;
	} else if (this.type === "union") for (const schema of this.list) try {
		Schema.resolve(value, schema, {});
		return schema.simplify(value);
	} catch {}
	return value;
};
Schema.prototype.toString = function toString(inline) {
	return formatters[this.type]?.(this, inline) ?? `Schema<${this.type}>`;
};
Schema.prototype.role = function role(role, extra) {
	const schema = Schema(this);
	schema.meta = {
		...schema.meta,
		role,
		extra
	};
	return schema;
};
for (const key of [
	"default",
	"link",
	"comment",
	"description",
	"max",
	"min",
	"step"
]) Object.assign(Schema.prototype, { [key](value) {
	const schema = Schema(this);
	schema.meta = {
		...schema.meta,
		[key]: value
	};
	return schema;
} });
const resolvers = {};
Schema.extend = function extend(type, resolve) {
	resolvers[type] = resolve;
};
Schema.resolve = function resolve(data, schema, options = {}, strict = false) {
	if (!schema) return [data];
	if (options.ignore?.(data, schema)) return [data];
	if (isNullable(data) && schema.type !== "lazy") {
		if (schema.meta.required) throw new ValidationError(`missing required value`, options);
		let current = schema;
		let fallback = schema.meta.default;
		while (current?.type === "intersect" && isNullable(fallback)) {
			current = current.list[0];
			fallback = current?.meta.default;
		}
		if (isNullable(fallback)) return [data];
		data = clone(fallback);
	}
	const callback = resolvers[schema.type];
	if (!callback) throw new ValidationError(`unsupported type "${schema.type}"`, options);
	try {
		return callback(data, schema, options, strict);
	} catch (error) {
		if (!schema.meta.loose) throw error;
		return [schema.meta.default];
	}
};
Schema.from = function from(source) {
	if (isNullable(source)) return Schema.any();
	else if ([
		"string",
		"number",
		"boolean"
	].includes(typeof source)) return Schema.const(source).required();
	else if (source[kSchema]) return source;
	else if (typeof source === "function") switch (source) {
		case String: return Schema.string().required();
		case Number: return Schema.number().required();
		case Boolean: return Schema.boolean().required();
		case Function: return Schema.function().required();
		default: return Schema.is(source).required();
	}
	else throw new TypeError(`cannot infer schema from ${source}`);
};
Schema.lazy = function lazy(builder) {
	const toJSON = () => {
		if (!schema.inner[kSchema]) {
			schema.inner = schema.builder();
			schema.inner.meta = {
				...schema.meta,
				...schema.inner.meta
			};
		}
		return schema.inner.toJSON();
	};
	const schema = new Schema({
		type: "lazy",
		builder,
		inner: { toJSON }
	});
	return schema;
};
Schema.natural = function natural() {
	return Schema.number().step(1).min(0);
};
Schema.percent = function percent() {
	return Schema.number().step(.01).min(0).max(1).role("slider");
};
Schema.date = function date() {
	return Schema.union([Schema.is(Date), Schema.transform(Schema.string().role("datetime"), (value, options) => {
		const date = new Date(value);
		if (isNaN(+date)) throw new ValidationError(`invalid date "${value}"`, options);
		return date;
	}, true)]);
};
Schema.regExp = function regExp(flag = "") {
	return Schema.union([Schema.is(RegExp), Schema.transform(Schema.string().role("regexp", { flag }), (value, options) => {
		try {
			return new RegExp(value, flag);
		} catch (e) {
			throw new ValidationError(e.message, options);
		}
	}, true)]);
};
Schema.arrayBuffer = function arrayBuffer(encoding) {
	return Schema.union([
		Schema.is(ArrayBuffer),
		Schema.is(SharedArrayBuffer),
		Schema.transform(Schema.any(), (value, options) => {
			if (Binary.isSource(value)) return Binary.fromSource(value);
			throw new ValidationError(`expected ArrayBufferSource but got ${value}`, options);
		}, true),
		...encoding ? [Schema.transform(Schema.string(), (value, options) => {
			try {
				return encoding === "base64" ? Binary.fromBase64(value) : Binary.fromHex(value);
			} catch (e) {
				throw new ValidationError(e.message, options);
			}
		}, true)] : []
	]);
};
Schema.extend("lazy", (data, schema, options, strict) => {
	if (!schema.inner[kSchema]) {
		schema.inner = schema.builder();
		schema.inner.meta = {
			...schema.meta,
			...schema.inner.meta
		};
	}
	return Schema.resolve(data, schema.inner, options, strict);
});
Schema.extend("any", (data) => {
	return [data];
});
Schema.extend("never", (data, _, options) => {
	throw new ValidationError(`expected nullable but got ${data}`, options);
});
Schema.extend("const", (data, { value }, options) => {
	if (deepEqual(data, value)) return [value];
	throw new ValidationError(`expected ${value} but got ${data}`, options);
});
function checkWithinRange(data, meta, description, options, skipMin = false) {
	const { max = Infinity, min = -Infinity } = meta;
	if (data > max) throw new ValidationError(`expected ${description} <= ${max} but got ${data}`, options);
	if (data < min && !skipMin) throw new ValidationError(`expected ${description} >= ${min} but got ${data}`, options);
}
Schema.extend("string", (data, { meta }, options) => {
	if (typeof data !== "string") throw new ValidationError(`expected string but got ${data}`, options);
	if (meta.pattern) {
		const regexp = new RegExp(meta.pattern.source, meta.pattern.flags);
		if (!regexp.test(data)) throw new ValidationError(`expect string to match regexp ${regexp}`, options);
	}
	checkWithinRange(data.length, meta, "string length", options);
	return [data];
});
function decimalShift(data, digits) {
	const str = data.toString();
	if (str.includes("e")) return data * Math.pow(10, digits);
	const index = str.indexOf(".");
	if (index === -1) return data * Math.pow(10, digits);
	const frac = str.slice(index + 1);
	const integer = str.slice(0, index);
	if (frac.length <= digits) return +(integer + frac.padEnd(digits, "0"));
	return +(integer + frac.slice(0, digits) + "." + frac.slice(digits));
}
function isMultipleOf(data, min, step) {
	step = Math.abs(step);
	if (!/^\d+\.\d+$/.test(step.toString())) return (data - min) % step === 0;
	const index = step.toString().indexOf(".");
	const digits = step.toString().slice(index + 1).length;
	return Math.abs(decimalShift(data, digits) - decimalShift(min, digits)) % decimalShift(step, digits) === 0;
}
Schema.extend("number", (data, { meta }, options) => {
	if (typeof data !== "number") throw new ValidationError(`expected number but got ${data}`, options);
	checkWithinRange(data, meta, "number", options);
	const { step } = meta;
	if (step && !isMultipleOf(data, meta.min ?? 0, step)) throw new ValidationError(`expected number multiple of ${step} but got ${data}`, options);
	return [data];
});
Schema.extend("boolean", (data, _, options) => {
	if (typeof data === "boolean") return [data];
	throw new ValidationError(`expected boolean but got ${data}`, options);
});
Schema.extend("bitset", (data, { bits, meta }, options) => {
	let value = 0, keys = [];
	if (typeof data === "number") {
		value = data;
		for (const key in bits) if (data & bits[key]) keys.push(key);
	} else if (Array.isArray(data)) {
		keys = data;
		for (const key of keys) {
			if (typeof key !== "string") throw new ValidationError(`expected string but got ${key}`, options);
			if (key in bits) value |= bits[key];
		}
	} else throw new ValidationError(`expected number or array but got ${data}`, options);
	if (value === meta.default) return [value];
	return [value, keys];
});
Schema.extend("function", (data, _, options) => {
	if (typeof data === "function") return [data];
	throw new ValidationError(`expected function but got ${data}`, options);
});
Schema.extend("is", (data, { constructor }, options) => {
	if (typeof constructor === "function") {
		if (data instanceof constructor) return [data];
		throw new ValidationError(`expected ${constructor.name} but got ${data}`, options);
	} else {
		if (isNullable(data)) throw new ValidationError(`expected ${constructor} but got ${data}`, options);
		let prototype = Object.getPrototypeOf(data);
		while (prototype) {
			if (prototype.constructor?.name === constructor) return [data];
			prototype = Object.getPrototypeOf(prototype);
		}
		throw new ValidationError(`expected ${constructor} but got ${data}`, options);
	}
});
function property(data, key, schema, options) {
	try {
		const [value, adapted] = Schema.resolve(data[key], schema, {
			...options,
			path: [...options.path || [], key]
		});
		if (adapted !== void 0) data[key] = adapted;
		return value;
	} catch (e) {
		if (!options?.autofix) throw e;
		delete data[key];
		return schema.meta.default;
	}
}
Schema.extend("array", (data, { inner, meta }, options) => {
	if (!Array.isArray(data)) throw new ValidationError(`expected array but got ${data}`, options);
	checkWithinRange(data.length, meta, "array length", options, !isNullable(inner.meta.default));
	return [data.map((_, index) => property(data, index, inner, options))];
});
Schema.extend("dict", (data, { inner, sKey }, options, strict) => {
	if (!isPlainObject(data)) throw new ValidationError(`expected object but got ${data}`, options);
	const result = {};
	for (const key in data) {
		let rKey;
		try {
			rKey = Schema.resolve(key, sKey, options)[0];
		} catch (error) {
			if (strict) continue;
			throw error;
		}
		result[rKey] = property(data, key, inner, options);
		data[rKey] = data[key];
		if (key !== rKey) delete data[key];
	}
	return [result];
});
Schema.extend("tuple", (data, { list }, options, strict) => {
	if (!Array.isArray(data)) throw new ValidationError(`expected array but got ${data}`, options);
	const result = list.map((inner, index) => property(data, index, inner, options));
	if (strict) return [result];
	result.push(...data.slice(list.length));
	return [result];
});
function merge(result, data) {
	for (const key in data) {
		if (key in result) continue;
		result[key] = data[key];
	}
}
Schema.extend("object", (data, { dict }, options, strict) => {
	if (!isPlainObject(data)) throw new ValidationError(`expected object but got ${data}`, options);
	const result = {};
	for (const key in dict) {
		const value = property(data, key, dict[key], options);
		if (!isNullable(value) || key in data) result[key] = value;
	}
	if (!strict) merge(result, data);
	return [result];
});
Schema.extend("union", (data, { list, toString }, options, strict) => {
	const messages = [];
	for (const inner of list) try {
		return Schema.resolve(data, inner, options, strict);
	} catch (error) {
		messages.push(error);
	}
	throw new ValidationError(`expected ${toString()} but got ${JSON.stringify(data)}`, options);
});
Schema.extend("intersect", (data, { list, toString }, options, strict) => {
	if (!list.length) return [data];
	let result;
	for (const inner of list) {
		const value = Schema.resolve(data, inner, options, true)[0];
		if (isNullable(value)) continue;
		if (isNullable(result)) result = value;
		else if (typeof result !== typeof value) throw new ValidationError(`expected ${toString()} but got ${JSON.stringify(data)}`, options);
		else if (typeof value === "object") merge(result ??= {}, value);
		else if (result !== value) throw new ValidationError(`expected ${toString()} but got ${JSON.stringify(data)}`, options);
	}
	if (!strict && isPlainObject(data)) merge(result, data);
	return [result];
});
Schema.extend("transform", (data, { inner, callback, preserve }, options) => {
	const [result, adapted = data] = Schema.resolve(data, inner, options, true);
	if (preserve) return [callback(result)];
	else return [callback(result), callback(adapted)];
});
const formatters = {};
function defineMethod(name, keys, format) {
	formatters[name] = format;
	Object.assign(Schema, { [name](...args) {
		const schema = new Schema({ type: name });
		keys.forEach((key, index) => {
			switch (key) {
				case "sKey":
					schema.sKey = args[index] ?? Schema.string();
					break;
				case "inner":
					schema.inner = Schema.from(args[index]);
					break;
				case "list":
					schema.list = args[index].map(Schema.from);
					break;
				case "dict":
					schema.dict = mapValues(args[index], Schema.from);
					break;
				case "bits":
					schema.bits = {};
					for (const key in args[index]) {
						if (typeof args[index][key] !== "number") continue;
						schema.bits[key] = args[index][key];
					}
					break;
				case "callback": {
					const callback = schema.callback = args[index];
					callback["toJSON"] ||= () => callback.toString();
					break;
				}
				case "constructor": {
					const constructor = schema.constructor = args[index];
					if (typeof constructor === "function") constructor["toJSON"] ||= () => constructor["name"];
					break;
				}
				default: schema[key] = args[index];
			}
		});
		if (name === "object" || name === "dict") schema.meta.default = {};
		else if (name === "array" || name === "tuple") schema.meta.default = [];
		else if (name === "bitset") schema.meta.default = 0;
		return schema;
	} });
}
defineMethod("is", ["constructor"], ({ constructor }) => {
	if (typeof constructor === "function") return constructor.name;
	else return constructor;
});
defineMethod("any", [], () => "any");
defineMethod("never", [], () => "never");
defineMethod("const", ["value"], ({ value }) => typeof value === "string" ? JSON.stringify(value) : value);
defineMethod("string", [], () => "string");
defineMethod("number", [], () => "number");
defineMethod("boolean", [], () => "boolean");
defineMethod("bitset", ["bits"], () => "bitset");
defineMethod("function", [], () => "function");
defineMethod("array", ["inner"], ({ inner }) => `${inner.toString(true)}[]`);
defineMethod("dict", ["inner", "sKey"], ({ inner, sKey }) => `{ [key: ${sKey.toString()}]: ${inner.toString()} }`);
defineMethod("tuple", ["list"], ({ list }) => `[${list.map((inner) => inner.toString()).join(", ")}]`);
defineMethod("object", ["dict"], ({ dict }) => {
	if (Object.keys(dict).length === 0) return "{}";
	return `{ ${Object.entries(dict).map(([key, inner]) => {
		return `${key}${inner.meta.required ? "" : "?"}: ${inner.toString()}`;
	}).join(", ")} }`;
});
defineMethod("union", ["list"], ({ list }, inline) => {
	const result = list.map(({ toString: format }) => format()).join(" | ");
	return inline ? `(${result})` : result;
});
defineMethod("intersect", ["list"], ({ list }) => {
	return `${list.map((inner) => inner.toString(true)).join(" & ")}`;
});
defineMethod("transform", [
	"inner",
	"callback",
	"preserve"
], ({ inner }, isInner) => inner.toString(isInner));
//#endregion
//#region ../../util/timeout/src/index.ts
/** Largest delay Node schedules without clamping it to one millisecond. */
const MAX_TIMER_DELAY_MS = 2147483647;
//#endregion
//#region ../../llm/llm/src/error.ts
/**
* Harness error base with a stable machine-routable code and chained cause.
* Package errors extend it so tool results and replay can retain failure class.
* @module @deepseek-ai/dsh-llm/error
*/
/**
* Base class for all harness errors. Carries a `code` (stable, programmatic —
* e.g. `NO_ADAPTER`, `INVALID_ARGS`, `INVARIANT`) distinct from the
* human-readable `message`, and supports `cause` chaining via the standard
* `ErrorOptions`. `name` defaults to the subclass constructor name.
*/
var HarnessError = class extends Error {
	/** Stable machine-routable failure class (e.g. `RATE_LIMIT`); route on this, never by parsing `message`. */
	code;
	constructor(message, code, options) {
		super(message, options);
		this.code = code;
		this.name = new.target.name;
	}
};
/**
* Canonical provider-neutral code for a response that completed normally but
* carried no content blocks at all. Providers occasionally emit a degenerate
* completion (a terminal stop with zero output); adapters classify it as this
* failure instead of yielding an empty assistant message, because an empty
* message silently ends the turn with nothing for the user or the loop to act
* on. The attempt produced nothing durable, so retry policy treats it as safe
* to repeat.
*/
const EMPTY_RESPONSE_CODE = "EMPTY_RESPONSE";
new RegExp(String.raw`(?:^|[^a-z0-9])context[\s_-](?:length|window)[\s_-]` + String.raw`(?:exceed(?:ed|s)?|overflow(?:ed)?|limit[\s_-]exceeded)(?:$|[^a-z0-9])`, "i");
new RegExp(String.raw`\b(?:request|prompt|input|messages?)\s+(?:is\s+|are\s+)?` + String.raw`too\s+(?:large|long)\s+for\s+(?:(?:this|the)\s+)?` + String.raw`(?:model(?:'s)?\s+)?context(?:\s+window)?\b`, "i");
new RegExp(String.raw`\b(?:input|prompt|request|messages?)\b.{0,40}` + String.raw`\b(?:exceed(?:s|ed)?|overflows?|is\s+larger\s+than)\b.{0,40}` + String.raw`\b(?:the\s+)?(?:model(?:'s)?\s+)?context(?:\s+(?:length|window))?\b`, "i");
//#endregion
//#region ../../llm/llm/src/retry-policy.ts
/**
* Provider-owned request-retry policy configuration and resolution.
*
* Adapters expose one resolved policy per registered provider route; the
* optional dsh-llm-retry plugin executes it on the agent's failed-step extension point.
*
* @module @deepseek-ai/dsh-llm/retry-policy
*/
const DEFAULT_MAX_RETRIES = 5;
const DEFAULT_INITIAL_DELAY_MS = 500;
const DEFAULT_MAX_DELAY_MS = 1e4;
const DEFAULT_JITTER_RATIO = .1;
const DEFAULT_RETRYABLE_CODES = Object.freeze([
	EMPTY_RESPONSE_CODE,
	"RATE_LIMIT",
	"SERVER",
	"TIMEOUT",
	"TRANSPORT"
]);
const backoffSchema = Schema.object({
	initialDelayMs: Schema.number().max(MAX_TIMER_DELAY_MS).default(DEFAULT_INITIAL_DELAY_MS),
	maxDelayMs: Schema.number().max(MAX_TIMER_DELAY_MS).default(DEFAULT_MAX_DELAY_MS),
	jitterRatio: Schema.number().min(0).max(1).default(DEFAULT_JITTER_RATIO)
});
const normalPolicySchema = Schema.object({
	mode: Schema.const("normal").required(),
	maxRetries: Schema.number().step(1).min(0).max(Number.MAX_SAFE_INTEGER).default(DEFAULT_MAX_RETRIES),
	retryableCodes: Schema.array(Schema.string()).default([...DEFAULT_RETRYABLE_CODES]),
	backoff: backoffSchema
});
const alwaysPolicySchema = Schema.object({
	mode: Schema.const("always").required(),
	backoff: backoffSchema
});
Schema.union([normalPolicySchema, alwaysPolicySchema]);
const NORMAL_POLICY_KEYS = new Set([
	"mode",
	"maxRetries",
	"retryableCodes",
	"backoff"
]);
const ALWAYS_POLICY_KEYS = new Set([
	"mode",
	"maxRetries",
	"retryableCodes",
	"backoff"
]);
const BACKOFF_KEYS = new Set([
	"initialDelayMs",
	"maxDelayMs",
	"jitterRatio"
]);
function validateKeys(value, allowed, path) {
	for (const key of Object.keys(value)) if (!allowed.has(key)) throw new Error(`${path}: unknown key "${key}"`);
}
function resolveBackoff(config, path) {
	if (config !== void 0) validateKeys(config, BACKOFF_KEYS, path);
	const initialDelayMs = config?.initialDelayMs ?? DEFAULT_INITIAL_DELAY_MS;
	const maxDelayMs = config?.maxDelayMs ?? DEFAULT_MAX_DELAY_MS;
	const jitterRatio = config?.jitterRatio ?? DEFAULT_JITTER_RATIO;
	if (!Number.isFinite(initialDelayMs) || initialDelayMs <= 0 || initialDelayMs > 2147483647) throw new Error(`${path}.initialDelayMs must be a positive finite number no greater than ${MAX_TIMER_DELAY_MS}`);
	if (!Number.isFinite(maxDelayMs) || maxDelayMs <= 0 || maxDelayMs > 2147483647) throw new Error(`${path}.maxDelayMs must be a positive finite number no greater than ${MAX_TIMER_DELAY_MS}`);
	if (initialDelayMs > maxDelayMs) throw new Error(`${path}.initialDelayMs must be less than or equal to maxDelayMs`);
	if (!Number.isFinite(jitterRatio) || jitterRatio < 0 || jitterRatio > 1) throw new Error(`${path}.jitterRatio must be between 0 and 1`);
	return Object.freeze({
		initialDelayMs,
		maxDelayMs,
		jitterRatio
	});
}
/**
* Validate, default, and detach one provider-owned retry policy.
* @param config - optional provider configuration; omission selects normal defaults.
* @param path - diagnostic path naming the provider config that owns the value.
* @returns an immutable policy safe to capture in provider registration state.
*/
function resolveRetryPolicy(config, path) {
	if (config === void 0) return Object.freeze({
		mode: "normal",
		maxRetries: DEFAULT_MAX_RETRIES,
		retryableCodes: DEFAULT_RETRYABLE_CODES,
		...resolveBackoff(void 0, `${path}.backoff`)
	});
	switch (config.mode) {
		case "normal": {
			validateKeys(config, NORMAL_POLICY_KEYS, path);
			const maxRetries = config.maxRetries ?? DEFAULT_MAX_RETRIES;
			const retryableCodes = config.retryableCodes ?? [...DEFAULT_RETRYABLE_CODES];
			if (!Number.isSafeInteger(maxRetries) || maxRetries < 0) throw new Error(`${path}.maxRetries must be a non-negative safe integer`);
			if (retryableCodes.length === 0) throw new Error(`${path}.retryableCodes must not be empty`);
			if (retryableCodes.some((code) => typeof code !== "string" || code.length === 0)) throw new Error(`${path}.retryableCodes must contain only non-empty strings`);
			if (new Set(retryableCodes).size !== retryableCodes.length) throw new Error(`${path}.retryableCodes must not contain duplicates`);
			return Object.freeze({
				mode: "normal",
				maxRetries,
				retryableCodes: Object.freeze([...retryableCodes]),
				...resolveBackoff(config.backoff, `${path}.backoff`)
			});
		}
		case "always":
			validateKeys(config, ALWAYS_POLICY_KEYS, path);
			return Object.freeze({
				mode: "always",
				...resolveBackoff(config.backoff, `${path}.backoff`)
			});
		default: throw new Error(`${path}.mode must be "normal" or "always"`);
	}
}
//#endregion
//#region ../../llm/llm/src/call-config.ts
/**
* Field-wise equality over {@link LlmCallConfig} — the comparison a caller
* runs to decide whether a proposed configuration is a real change (worth a
* logged header snapshot) or the held one restated.
* @param a - one configuration.
* @param b - the other.
* @returns whether every field (including the `stop` list, element-wise) matches.
*/
function callConfigEquals(a, b) {
	if (a.provider !== b.provider || a.model !== b.model || a.reasoningEffort !== b.reasoningEffort || a.temperature !== b.temperature || a.maxTokens !== b.maxTokens) return false;
	if (a.stop === void 0 || b.stop === void 0) return a.stop === b.stop;
	return a.stop.length === b.stop.length && a.stop.every((s, i) => s === b.stop?.[i]);
}
//#endregion
//#region ../../llm/llm/src/adapter-failure.ts
/**
* Normalization for values thrown by a final LLM adapter boundary.
*
* @module @deepseek-ai/dsh-llm/adapter-failure
*/
/**
* Detach serializable provider facts from a value thrown by an adapter.
* @param value - arbitrary value thrown during adapter dispatch or iteration.
* @returns immutable provider-neutral facts suitable for a terminal finish chunk.
* @internal
*/
function normalizeLlmFailure(value) {
	const error = value instanceof Error ? value : new HarnessError(thrownMessage(value), "UNKNOWN", { cause: value });
	const carried = ownFailureSnapshot(error);
	if (carried !== void 0 && carried.code === ownErrorCode(error)) return carried;
	return Object.freeze({
		message: errorMessage(error),
		code: harnessErrorCode(error)
	});
}
/** Render a non-Error throw without letting hostile coercion escape normalization. */
function thrownMessage(value) {
	try {
		const message = String(value);
		return message.length > 0 ? message : "LLM adapter failed";
	} catch (_hostileThrownValue) {
		return "LLM adapter failed";
	}
}
/** Read a foreign error's own data-backed `code` without invoking accessors. */
function ownErrorCode(error) {
	try {
		const descriptor = Object.getOwnPropertyDescriptor(error, "code");
		return descriptor !== void 0 && "value" in descriptor ? descriptor.value : void 0;
	} catch (_sdkPropertyTrap) {
		return;
	}
}
/** Snapshot an own data property without invoking an SDK-defined accessor. */
function ownFailureSnapshot(error) {
	try {
		const descriptor = Object.getOwnPropertyDescriptor(error, "failure");
		return descriptor !== void 0 && "value" in descriptor ? failureSnapshot(descriptor.value) : void 0;
	} catch (_sdkPropertyTrap) {
		return;
	}
}
/** Validate and detach an arbitrary serializable failure payload. */
function failureSnapshot(value) {
	if (typeof value !== "object" || value === null) return void 0;
	try {
		const candidate = value;
		const message = candidate.message;
		const code = candidate.code;
		const status = candidate.status;
		const providerRetryAfterMs = candidate.providerRetryAfterMs;
		const requestId = candidate.requestId;
		if (typeof message !== "string" || message.length === 0 || typeof code !== "string" || code.length === 0 || status !== void 0 && (!Number.isInteger(status) || status < 100 || status > 599) || providerRetryAfterMs !== void 0 && (!Number.isFinite(providerRetryAfterMs) || providerRetryAfterMs <= 0) || requestId !== void 0 && (typeof requestId !== "string" || requestId.length === 0)) return void 0;
		return Object.freeze({
			message,
			code,
			...status === void 0 ? {} : { status },
			...providerRetryAfterMs === void 0 ? {} : { providerRetryAfterMs },
			...requestId === void 0 ? {} : { requestId }
		});
	} catch (_sdkFailureGetter) {
		return;
	}
}
/** Read an SDK error message without letting an accessor replace the primary failure. */
function errorMessage(error) {
	try {
		const message = error.message;
		if (typeof message === "string" && message.length > 0) return message;
	} catch (_sdkMessageGetter) {}
	return "LLM adapter failed";
}
/** Trust only Harness-owned codes; third-party SDK codes are not our taxonomy. */
function harnessErrorCode(error) {
	return error instanceof HarnessError ? error.code : "UNKNOWN";
}
//#endregion
//#region ../../llm/llm/src/content.ts
function quoted(value) {
	return JSON.stringify(value);
}
/**
* Stable text shown to a model that cannot accept one durable image reference.
* @param ref - durable normalized attachment omitted from the request.
* @returns deterministic text-only placeholder.
*/
function textOnlyImageText(ref) {
	return `[image omitted because this model accepts text only; attachment sha256:${String(ref.attachmentId).slice(7, 15)}]`;
}
/**
* True when typed model content contains an image block, walking nested
* tool-result content. This is the one recursive image walk shared by every
* image policy (capability gating, text-only serialization, compaction
* survey), so a consumer cannot silently diverge on nesting depth.
* @param content - typed model content blocks.
* @returns whether any nested block is an image.
*/
function contentHasImage(content) {
	return content.some((block) => block.type === "image" || block.type === "tool-result" && contentHasImage(block.content));
}
/**
* True when typed model content contains a file block, walking nested
* tool-result content on the same recursion every file policy shares.
* Reads current content on every call without retaining scan results.
* @param content - typed model content blocks.
* @returns whether any nested block is a file.
*/
function contentHasFile(content) {
	for (const block of content) if (block.type === "file" || block.type === "tool-result" && contentHasFile(block.content)) return true;
	return false;
}
/**
* Stable model-facing handle for one durable file reference: the address of
* the verbatim stored copy and the instruction to read it on demand. This is
* the only representation a provider ever receives for a file.
* @param ref - durable verbatim file reference.
* @param readonlyPath - execution-world path of the stored copy, when resolvable.
* @returns deterministic handle text naming the file, its size, and its address.
*/
function fileHandleText(ref, readonlyPath) {
	const digest = String(ref.attachmentId).slice(7, 15);
	const identity = `File ${quoted(ref.name)} (${ref.bytes} bytes, sha256:${digest})`;
	if (readonlyPath === void 0) return `[${identity} was uploaded, but the current execution environment cannot access a readable path. Report that limitation if its contents are needed; do not claim to have read it.]`;
	return `[${identity}: verbatim read-only copy saved at ${quoted(readonlyPath)}. Read that path with your file tools when its contents are needed; copy it to a writable location before modifying it. When delegating file work, include this saved path in the delegation prompt; only subagents sharing this execution environment can read it.]`;
}
/** Replace every file occurrence, including nested tool results, with handle text. */
function replaceFilesWithHandles(blocks, resolvePath) {
	let next;
	for (const [index, block] of blocks.entries()) {
		if (block.type === "file") {
			next ??= blocks.slice(0, index);
			next.push({
				type: "text",
				text: fileHandleText(block.attachment, resolvePath(block.attachment))
			});
			continue;
		}
		if (block.type === "tool-result") {
			const content = replaceFilesWithHandles(block.content, resolvePath);
			if (content !== block.content) {
				next ??= blocks.slice(0, index);
				next.push({
					...block,
					content
				});
				continue;
			}
		}
		next?.push(block);
	}
	return next ?? blocks;
}
/**
* Project durable file history into deterministic handle text for every model
* route. Unlike images, no provider receives file blocks natively, so this
* projection is unconditional in request assembly.
* @param messages - complete request history.
* @param resolvePath - resolve one reference's current execution-world read path.
* @returns the original list without files, otherwise shallow message copies with handle text.
*/
function projectFilesToText(messages, resolvePath) {
	if (!messages.some((message) => contentHasFile(message.content))) return messages;
	return messages.map((message) => {
		const content = replaceFilesWithHandles(message.content, resolvePath);
		return content === message.content ? message : {
			...message,
			content
		};
	});
}
/** Replace every image occurrence, including nested tool results, for a text-only model. */
function replaceImagesForTextModel(blocks) {
	let next;
	for (const [index, block] of blocks.entries()) {
		if (block.type === "image") {
			next ??= blocks.slice(0, index);
			next.push({
				type: "text",
				text: textOnlyImageText(block.attachment)
			});
			continue;
		}
		if (block.type === "tool-result") {
			const content = replaceImagesForTextModel(block.content);
			if (content !== block.content) {
				next ??= blocks.slice(0, index);
				next.push({
					...block,
					content
				});
				continue;
			}
		}
		next?.push(block);
	}
	return next ?? blocks;
}
/**
* Project durable image history into deterministic text for an exact text-only model.
* @param messages - complete request history.
* @returns the original list without images, otherwise shallow message copies with stable placeholders.
*/
function projectImagesForTextModel(messages) {
	if (!messages.some((message) => contentHasImage(message.content))) return messages;
	return messages.map((message) => {
		const content = replaceImagesForTextModel(message.content);
		return content === message.content ? message : {
			...message,
			content
		};
	});
}
//#endregion
//#region ../../llm/llm/src/attribution.ts
/**
* Centralize the non-secret product identity every provider request sends as `User-Agent`, keeping
* adapters from drifting. See
* `.agents/notes/implemented/architecture/2026-06-21-mandatory-app-attribution-headers.md`.
*
* App-attribution vocabulary for provider requests.
* @module @deepseek-ai/dsh-llm/attribution
*/
const { version } = (0, node_module.createRequire)(require("url").pathToFileURL(__filename).href)("../package.json");
//#endregion
//#region ../../llm/llm/src/assembler.ts
/**
* Incremental chunk-to-message assembler. This is the single canonical assembly
* algorithm used by the agent loop to build an assistant message from a chunk
* stream while logging the raw chunks for replay fidelity.
*
* @module @deepseek-ai/dsh-llm/assembler
*/
/**
* Incrementally assembles raw {@link StreamChunk}s into complete
* {@link ContentBlock}s and a final assistant {@link Message}.
*
* The agent loop feeds it while logging raw chunks for replay fidelity, then
* reads `blocks()` / `message()` / `usage` / `finish` once the stream ends,
* or `interruptedBlocks()` when cancellation cut the stream short.
*
* Tolerant of delta-only protocols (no block-start/end); deltas arriving for
* an index already closed by `block-end` are ignored (malformed stream) so a
* misbehaving adapter cannot grow memory or corrupt a completed block.
*/
var BlockAssembler = class {
	partials = /* @__PURE__ */ new Map();
	order = [];
	_usage;
	_finish;
	_replayState;
	/**
	* Feed one chunk into the assembly state.
	* @param chunk - the next raw chunk, in stream order.
	*/
	push(chunk) {
		switch (chunk.type) {
			case "block-start":
				if (!this.partials.has(chunk.index)) {
					this.order.push(chunk.index);
					this.partials.set(chunk.index, {
						blockType: chunk.blockType,
						text: "",
						toolCallArguments: ""
					});
				}
				return;
			case "text-delta":
			case "reasoning-delta": {
				const partial = this.ensure(chunk.index, chunk.type === "text-delta" ? "text" : "reasoning");
				if (partial.block) return;
				partial.text += chunk.text;
				return;
			}
			case "tool-call-delta": {
				const partial = this.ensure(chunk.index, "tool-call");
				if (partial.block) return;
				partial.toolCallId = chunk.id;
				if (chunk.name) partial.toolCallName = chunk.name;
				partial.toolCallArguments += chunk.argumentsDelta;
				return;
			}
			case "block-end": {
				const partial = this.ensure(chunk.index, chunk.block.type);
				if (partial.block) return;
				partial.block = chunk.block;
				return;
			}
			case "usage":
				this._usage = chunk.usage;
				return;
			case "finish":
				this._finish = chunk.reason;
				this._replayState = chunk.replayState;
				return;
			default: return assertNever(chunk, "BlockAssembler.push");
		}
	}
	ensure(index, blockType) {
		let partial = this.partials.get(index);
		if (!partial) {
			partial = {
				blockType,
				text: "",
				toolCallArguments: ""
			};
			this.partials.set(index, partial);
			this.order.push(index);
		}
		return partial;
	}
	assemble(partial, index) {
		if (partial.block) return partial.block;
		switch (partial.blockType) {
			case "text": return {
				type: "text",
				text: partial.text
			};
			case "reasoning": return {
				type: "reasoning",
				text: partial.text
			};
			case "tool-call": return {
				type: "tool-call",
				id: partial.toolCallId ?? brandString(`call-${index}`),
				name: partial.toolCallName ?? "",
				arguments: partial.toolCallArguments
			};
			default: throw new Error(`cannot assemble incomplete block of type "${partial.blockType}"`);
		}
	}
	/** Invariant accessor: every index in `order` has a partial. */
	mustGet(index) {
		const partial = this.partials.get(index);
		if (!partial) throw new Error(`BlockAssembler invariant violated: no partial for index ${index}`);
		return partial;
	}
	/**
	* The one shared keep/drop decision over all seen blocks: max-token
	* truncation drops tool calls that cannot be executed safely. Emitted blocks
	* and replay metadata both derive from this result, so they cannot disagree.
	*/
	assembled() {
		const all = this.order.map((index) => this.assemble(this.mustGet(index), index));
		const kept = this.finish.kind === "max-tokens" ? all.map((block) => block.type !== "tool-call") : void 0;
		const blocks = kept === void 0 ? all : all.filter((_, position) => kept[position]);
		const envelope = this._replayState;
		if (envelope?.blocks === void 0) return {
			blocks,
			replay: envelope
		};
		if (envelope.blocks.length !== all.length) return {
			blocks,
			replay: void 0
		};
		return {
			blocks,
			replay: kept === void 0 || blocks.length === all.length ? envelope : {
				response: envelope.response,
				blocks: envelope.blocks.filter((_, position) => kept[position])
			}
		};
	}
	/**
	* Assemble all blocks seen so far, in stream order.
	* @returns one block per seen index, except that max-token truncation drops
	*   tool calls that cannot be executed safely; an open block assembles from
	*   its accumulated deltas (an unknown block type never closed by `block-end` throws).
	*/
	blocks() {
		return this.assembled().blocks;
	}
	/**
	* Assemble the prefix an interrupted stream can safely finalize: closed and
	* open text/reasoning blocks with non-whitespace content, in stream order.
	* Tool calls are omitted because interruption precedes dispatch; retaining
	* one would require a fabricated result. Open unknown blocks are also omitted.
	* @returns the kept blocks; empty when nothing streamed before the interruption.
	*/
	interruptedBlocks() {
		return this.order.map((index) => {
			const partial = this.mustGet(index);
			const type = partial.block?.type ?? partial.blockType;
			if (type !== "text" && type !== "reasoning") return void 0;
			return this.assemble(partial, index);
		}).filter((block) => (block?.type === "text" || block?.type === "reasoning") && block.text.trim() !== "");
	}
	/** Usage from the `usage` chunk; undefined until one arrives. */
	get usage() {
		return this._usage;
	}
	/** Finish reason from the `finish` chunk; `{kind: 'stop'}` when the stream ended without one. */
	get finish() {
		return this._finish ?? { kind: "stop" };
	}
	/**
	* Replay metadata from the terminal finish chunk, if any, with per-block
	* entries pruned in step with {@link blocks}. Undefined when the envelope's
	* entries do not align with the emitted blocks.
	*/
	get replayState() {
		return this.assembled().replay;
	}
	/**
	* The assembled assistant message.
	* @param source - producer attribution for the assembled message.
	* @returns a frozen assistant-role message over `blocks()` (same open-block assembly rules).
	*/
	message(source = {
		kind: "plugin",
		plugin: "dsh-llm/assembler"
	}) {
		return createMessage({
			role: "assistant",
			content: this.blocks(),
			source
		});
	}
};
//#endregion
//#region ../../llm/llm/src/assistant-stream.ts
/**
* Lossless compact representation of one model-stream attempt, plus record-level
* readers that answer common consumer questions without materializing members.
* Readers trust the static record type; expandAssistantStream is the validating
* path for records read at a durable boundary.
*/
function safeTime(value) {
	if (!Number.isSafeInteger(value)) throw new TypeError(`Assistant stream time must be a safe integer, got ${String(value)}`);
	return value;
}
function safeIndex(value, label) {
	if (!Number.isSafeInteger(value) || value < 0 || Object.is(value, -0)) throw new TypeError(`${label} index must be a non-negative safe integer`);
	return value;
}
function snapshotChunk(chunk) {
	const snapshot = snapshotJsonValue(chunk);
	if (snapshot === void 0) throw new TypeError("Assistant stream chunk must be losslessly JSON-serializable");
	return snapshot;
}
function safeGap(previous, next) {
	const gap = next - previous;
	return Number.isSafeInteger(gap) && previous + gap === next ? gap : void 0;
}
/** Incrementally compacts one attempt without retaining a second raw-chunk list. */
var AssistantStreamAccumulator = class {
	records = [];
	/**
	* Add one timed chunk to the compact attempt stream.
	* @param value - model chunk and its original Session timestamp.
	* @returns a detached immutable copy for assembly and live publication.
	*/
	push(value) {
		const time = safeTime(value.time);
		const chunk = snapshotChunk(value.chunk);
		const timed = deepFreeze({
			time,
			chunk
		});
		const previous = this.records.at(-1);
		switch (chunk.type) {
			case "text-delta":
			case "reasoning-delta": {
				safeIndex(chunk.index, chunk.type);
				if (typeof chunk.text !== "string") throw new TypeError(`${chunk.type} text must be a string`);
				const type = chunk.type === "text-delta" ? "text-chunks" : "reasoning-chunks";
				const gap = previous !== void 0 && previous.type === type ? safeGap(previous.lastTime, time) : void 0;
				if (previous !== void 0 && previous.type === type && previous.index === chunk.index && gap !== void 0) {
					previous.dt.push(gap);
					previous.texts.push(chunk.text);
					previous.lastTime = time;
				} else this.records.push({
					type,
					time0: time,
					index: chunk.index,
					dt: [],
					texts: [chunk.text],
					lastTime: time
				});
				return timed;
			}
			case "tool-call-delta": {
				safeIndex(chunk.index, chunk.type);
				if (typeof chunk.id !== "string") throw new TypeError("tool-call-delta id must be a string");
				if (Object.hasOwn(chunk, "name") && typeof chunk.name !== "string") throw new TypeError("tool-call-delta name must be a string");
				if (typeof chunk.argumentsDelta !== "string") throw new TypeError("tool-call-delta argumentsDelta must be a string");
				if (chunk.id.length === 0 || chunk.name === "") {
					this.records.push({
						type: "chunk",
						time,
						chunk
					});
					return timed;
				}
				const gap = previous?.type === "tool-call-chunks" ? safeGap(previous.lastTime, time) : void 0;
				const sameName = previous?.type === "tool-call-chunks" && Object.hasOwn(previous, "name") === Object.hasOwn(chunk, "name") && previous.name === chunk.name;
				if (previous?.type === "tool-call-chunks" && previous.index === chunk.index && previous.id === chunk.id && sameName && gap !== void 0) {
					previous.dt.push(gap);
					previous.args.push(chunk.argumentsDelta);
					previous.lastTime = time;
				} else this.records.push({
					type: "tool-call-chunks",
					time0: time,
					index: chunk.index,
					dt: [],
					id: chunk.id,
					...Object.hasOwn(chunk, "name") ? { name: chunk.name } : {},
					args: [chunk.argumentsDelta],
					lastTime: time
				});
				return timed;
			}
			case "block-start":
			case "block-end":
			case "usage":
			case "finish":
				this.records.push({
					type: "chunk",
					time,
					chunk
				});
				return timed;
			default: return assertNever(chunk, "AssistantStreamAccumulator.push");
		}
	}
	/**
	* Return the current compact attempt stream.
	* @returns a detached immutable record list suitable for a durable event.
	*/
	snapshot() {
		return deepFreeze(this.records.map((record) => {
			if (record.type === "chunk") return { ...record };
			const { lastTime: _lastTime, ...durable } = record;
			if (durable.type === "tool-call-chunks") return {
				...durable,
				dt: [...durable.dt],
				args: [...durable.args]
			};
			return {
				...durable,
				dt: [...durable.dt],
				texts: [...durable.texts]
			};
		}));
	}
};
/**
* Expand compact records into the exact timed chunk sequence.
* @param stream - compact records from one durable Assistant settlement.
* @returns detached timed chunks with every original delta boundary preserved.
* @throws {TypeError} when a record or reconstructed timestamp is invalid.
*/
function expandAssistantStream(stream) {
	const chunks = [];
	for (const candidate of stream) {
		const record = validateRecord(candidate);
		if (record.type === "chunk") {
			chunks.push({
				time: record.time,
				chunk: record.chunk
			});
			continue;
		}
		const members = record.type === "tool-call-chunks" ? record.args : record.texts;
		let time = record.time0;
		for (let index = 0; index < members.length; index += 1) {
			if (index > 0) time += record.dt[index - 1];
			let chunk;
			if (record.type === "text-chunks") chunk = {
				type: "text-delta",
				index: record.index,
				text: members[index]
			};
			else if (record.type === "reasoning-chunks") chunk = {
				type: "reasoning-delta",
				index: record.index,
				text: members[index]
			};
			else chunk = {
				type: "tool-call-delta",
				index: record.index,
				id: record.id,
				...Object.hasOwn(record, "name") ? { name: record.name } : {},
				argumentsDelta: members[index]
			};
			chunks.push({
				time,
				chunk
			});
		}
	}
	return chunks;
}
function validateRecord(value) {
	if (typeof value !== "object" || value === null || Array.isArray(value)) throw new TypeError("Assistant stream record must be an object");
	const record = value;
	switch (record.type) {
		case "text-chunks":
		case "reasoning-chunks": {
			exactKeys$1(record, [
				"type",
				"time0",
				"index",
				"dt",
				"texts"
			], record.type);
			const texts = stringArray(record.texts, `${record.type} texts`);
			if (texts.length === 0) throw new TypeError(`${record.type} texts must be non-empty`);
			validateRun(record, texts.length, record.type);
			return record;
		}
		case "tool-call-chunks": {
			exactKeys$1(record, Object.hasOwn(record, "name") ? [
				"type",
				"time0",
				"index",
				"dt",
				"id",
				"name",
				"args"
			] : [
				"type",
				"time0",
				"index",
				"dt",
				"id",
				"args"
			], record.type);
			const args = stringArray(record.args, "tool-call-chunks args");
			if (args.length === 0) throw new TypeError("tool-call-chunks args must be non-empty");
			if (typeof record.id !== "string" || record.id.length === 0) throw new TypeError("tool-call-chunks id must be a non-empty string");
			if (record.name !== void 0 && (typeof record.name !== "string" || record.name.length === 0)) throw new TypeError("tool-call-chunks name must be a non-empty string");
			validateRun(record, args.length, record.type);
			return record;
		}
		case "chunk": {
			exactKeys$1(record, [
				"type",
				"time",
				"chunk"
			], "chunk");
			const time = safeTime(record.time);
			if (typeof record.chunk !== "object" || record.chunk === null || Array.isArray(record.chunk)) throw new TypeError("Assistant stream raw chunk must be a lossless JSON object");
			let chunk;
			try {
				chunk = snapshotChunk(record.chunk);
			} catch (error) {
				throw new TypeError("Assistant stream raw chunk must be a lossless JSON object", { cause: error });
			}
			return deepFreeze({
				type: "chunk",
				time,
				chunk
			});
		}
		default: throw new TypeError(`Unsupported Assistant stream record ${JSON.stringify(record.type)}`);
	}
}
function validateRun(record, members, label) {
	safeTime(record.time0);
	safeIndex(record.index, label);
	if (!Array.isArray(record.dt) || record.dt.some((value) => !Number.isSafeInteger(value))) throw new TypeError(`${label} dt must contain safe integers`);
	if (record.dt.length !== members - 1) throw new TypeError(`${label} dt length must be one less than its members`);
	let time = record.time0;
	for (const gap of record.dt) {
		time += gap;
		if (!Number.isSafeInteger(time)) throw new TypeError(`${label} member times must stay safe integers`);
	}
}
function stringArray(value, label) {
	if (!Array.isArray(value) || value.some((member) => typeof member !== "string")) throw new TypeError(`${label} must be a string array`);
	return value;
}
function exactKeys$1(record, keys, label) {
	if (Object.keys(record).length !== keys.length || !keys.every((key) => Object.hasOwn(record, key))) throw new TypeError(`${label} Assistant stream record must contain exactly ${keys.join(", ")}`);
}
//#endregion
//#region ../../llm/llm/src/index.ts
/**
* LLM service: adapter registry with a waterfall-interceptable streaming call
* API. Exports the `LlmRuntime` default, the abstract `LlmAdapter` for
* provider backends, and `BlockAssembler` for chunk assembly.
*
* @module @deepseek-ai/dsh-llm
*/
var __runInitializers = function(thisArg, initializers, value) {
	var useValue = arguments.length > 2;
	for (var i = 0; i < initializers.length; i++) value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
	return useValue ? value : void 0;
};
var __esDecorate = function(ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
	function accept(f) {
		if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected");
		return f;
	}
	var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
	var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
	var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
	var _, done = false;
	for (var i = decorators.length - 1; i >= 0; i--) {
		var context = {};
		for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
		for (var p in contextIn.access) context.access[p] = contextIn.access[p];
		context.addInitializer = function(f) {
			if (done) throw new TypeError("Cannot add initializers after decoration has completed");
			extraInitializers.push(accept(f || null));
		};
		var result = (0, decorators[i])(kind === "accessor" ? {
			get: descriptor.get,
			set: descriptor.set
		} : descriptor[key], context);
		if (kind === "accessor") {
			if (result === void 0) continue;
			if (result === null || typeof result !== "object") throw new TypeError("Object expected");
			if (_ = accept(result.get)) descriptor.get = _;
			if (_ = accept(result.set)) descriptor.set = _;
			if (_ = accept(result.init)) initializers.unshift(_);
		} else if (_ = accept(result)) if (kind === "field") initializers.unshift(_);
		else descriptor[key] = _;
	}
	if (target) Object.defineProperty(target, contextIn.name, descriptor);
	done = true;
};
/**
* Typed error for LLM-related failures. Extends {@link HarnessError}, so the
* `code` string (e.g. `AUTH`, `RATE_LIMIT`, `NO_ADAPTER`) is shared taxonomy.
*/
var LlmError = class extends HarnessError {
	/** Serializable facts retained beside this live Error. */
	failure;
	/**
	* @param message - non-empty human-readable failure summary.
	* @param code - non-empty stable provider-neutral machine code.
	* @param options - optional cause and validated serializable provider facts.
	*/
	constructor(message, code, options) {
		if (typeof message !== "string" || message.length === 0) throw new Error("LlmError message must be a non-empty string");
		if (typeof code !== "string" || code.length === 0) throw new Error("LlmError code must be a non-empty string");
		if (options?.status !== void 0 && (!Number.isInteger(options.status) || options.status < 100 || options.status > 599)) throw new Error("LlmError status must be an integer from 100 through 599");
		if (options?.providerRetryAfterMs !== void 0 && (!Number.isFinite(options.providerRetryAfterMs) || options.providerRetryAfterMs <= 0)) throw new Error("LlmError providerRetryAfterMs must be a positive finite number");
		if (options?.requestId !== void 0 && (typeof options.requestId !== "string" || options.requestId.length === 0)) throw new Error("LlmError requestId must be a non-empty string");
		super(message, code, options);
		this.name = "LlmError";
		this.failure = Object.freeze({
			message,
			code,
			...options?.status === void 0 ? {} : { status: options.status },
			...options?.providerRetryAfterMs === void 0 ? {} : { providerRetryAfterMs: options.providerRetryAfterMs },
			...options?.requestId === void 0 ? {} : { requestId: options.requestId }
		});
	}
};
(() => {
	let _classSuper = TypertRemoteService;
	let _instanceExtraInitializers = [];
	let _listProviders_decorators;
	let _listConfigurableProviders_decorators;
	let _remoteDiscoverModels_decorators;
	return class LlmRuntime extends _classSuper {
		static {
			const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
			_listProviders_decorators = [Remote];
			_listConfigurableProviders_decorators = [Remote];
			_remoteDiscoverModels_decorators = [Remote("discoverModels")];
			__esDecorate(this, null, _listProviders_decorators, {
				kind: "method",
				name: "listProviders",
				static: false,
				private: false,
				access: {
					has: (obj) => "listProviders" in obj,
					get: (obj) => obj.listProviders
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			__esDecorate(this, null, _listConfigurableProviders_decorators, {
				kind: "method",
				name: "listConfigurableProviders",
				static: false,
				private: false,
				access: {
					has: (obj) => "listConfigurableProviders" in obj,
					get: (obj) => obj.listConfigurableProviders
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			__esDecorate(this, null, _remoteDiscoverModels_decorators, {
				kind: "method",
				name: "remoteDiscoverModels",
				static: false,
				private: false,
				access: {
					has: (obj) => "remoteDiscoverModels" in obj,
					get: (obj) => obj.remoteDiscoverModels
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			if (_metadata) Object.defineProperty(this, Symbol.metadata, {
				enumerable: true,
				configurable: true,
				writable: true,
				value: _metadata
			});
		}
		adapters = (__runInitializers(this, _instanceExtraInitializers), /* @__PURE__ */ new Map());
		directory = /* @__PURE__ */ new Map();
		discoveries = /* @__PURE__ */ new Map();
		constructor(ctx) {
			super(ctx, "llm");
		}
		/** Notify topology observers without letting one broken listener veto the commit. */
		emitAdaptersUpdated() {
			let invariantFailure;
			for (const listener of this.ctx.events.dispatch("emit", ["llm/adapters-updated"])) try {
				const returned = listener();
				if (returned != null && typeof returned.then === "function") Promise.resolve(returned).then(void 0, (error) => {
					this.warnAdaptersListenerFailure(error);
				});
			} catch (error) {
				if (error?.code === "INVARIANT") {
					invariantFailure ??= error;
					continue;
				}
				this.warnAdaptersListenerFailure(error);
			}
			if (invariantFailure !== void 0) throw invariantFailure;
		}
		/** Contained-listener diagnostic shared by the sync and async failure paths. */
		warnAdaptersListenerFailure(error) {
			this.ctx.logger.warn("llm: an llm/adapters-updated listener failed");
			this.ctx.logger.warn(error);
		}
		/**
		* Register an adapter for the given provider routes. Throws `LlmError` with code
		* `DUPLICATE_ADAPTER` if any provider already has an adapter (all-or-nothing).
		* Disposed with the fiber.
		* @param providers - every provider route this adapter should serve.
		* @param adapter - the adapter that streams calls for those providers.
		* @returns the disposer, carrying {@link AdapterRegistrationHandle.replace}.
		*/
		registerAdapter(providers, adapter) {
			const owned = /* @__PURE__ */ new Set();
			let released = false;
			const dispose = this.ctx.effect(function* () {
				if (providers.length === 0) throw new LlmError("an adapter must register at least one provider", "INVALID_ADAPTER");
				this.commitRoutes(owned, this.prepareRoutes(providers, adapter, owned));
				yield () => {
					released = true;
					for (const provider of owned) this.adapters.delete(provider);
					owned.clear();
					this.emitAdaptersUpdated();
				};
			}.bind(this), "llm.registerAdapter()");
			const handle = (() => void dispose());
			handle.replace = (next) => {
				if (released) throw new LlmError("a disposed adapter registration cannot replace its routes", "REGISTRATION_DISPOSED");
				this.commitRoutes(owned, this.prepareRoutes(next, adapter, owned));
			};
			return handle;
		}
		/**
		* Validate one candidate route set for `adapter`, treating routes this
		* registration already holds as available. Nothing is mutated: a rejected
		* candidate leaves the registry exactly as it was.
		*/
		prepareRoutes(providers, adapter, owned) {
			const unique = /* @__PURE__ */ new Set();
			const registrations = [];
			for (const provider of providers) {
				if (provider.length === 0) throw new LlmError("adapter provider names must be non-empty", "INVALID_ADAPTER");
				if (unique.has(provider) || this.adapters.has(provider) && !owned.has(provider)) throw new LlmError(`an adapter for provider "${provider}" is already registered`, "DUPLICATE_ADAPTER");
				const info = adapter.providerInfo(provider);
				if (typeof info.id !== "string" || info.id !== provider || typeof info.name !== "string" || info.name.length === 0) throw new LlmError(`adapter metadata for provider "${provider}" must preserve its id and have a non-empty name`, "INVALID_ADAPTER");
				unique.add(provider);
				const retryPolicy = adapter.providerRetryPolicy(provider) ?? resolveRetryPolicy(void 0, `llm: provider "${provider}" retryPolicy`);
				registrations.push({
					adapter,
					provider: {
						id: info.id,
						name: info.name
					},
					retryPolicy
				});
			}
			return registrations;
		}
		/**
		* Swap this registration's routes for the prepared ones in one synchronous
		* section, so no observer can see the registry between the release and the
		* re-registration. The route set's one mutation point is also where
		* `llm/adapters-updated` is published, so a `replace` announces itself
		* exactly like a first registration.
		*/
		commitRoutes(owned, registrations) {
			for (const provider of owned) this.adapters.delete(provider);
			owned.clear();
			for (const registration of registrations) {
				this.adapters.set(registration.provider.id, registration);
				owned.add(registration.provider.id);
			}
			this.emitAdaptersUpdated();
		}
		/**
		* Describe provider routes with a registered adapter.
		* @returns detached provider metadata in registration order.
		*/
		listProviders() {
			return [...this.adapters.values()].map(({ provider }) => ({ ...provider }));
		}
		/**
		* Declare provider routes an adapter plugin can activate through
		* configuration. Registration is all-or-nothing: an empty list, invalid
		* entry, or a provider already declared by any registration throws
		* `LlmError` without registering the rest. Disposed with the fiber.
		* @param entries - every configurable provider this plugin owns.
		* @returns a handle that withdraws all of them, and can atomically replace them.
		*/
		registerConfigurableProviders(entries) {
			let held = [];
			let disposed = false;
			/**
			* Validate a candidate set in full against everything this registration
			* does not already hold, then publish it. Nothing is written until the
			* whole set passes, so a refused candidate leaves the current entries in
			* place — the property that makes `replace` a swap rather than a
			* delete-then-add that can strand the directory empty.
			*/
			const commit = (candidates) => {
				const detached = [];
				const own = new Set(held.map((entry) => entry.provider));
				for (const entry of candidates) {
					if (entry.provider.length === 0 || entry.displayName.length === 0 || entry.settingsNs.length === 0) throw new LlmError("configurable providers need a non-empty provider, displayName, and settingsNs", "INVALID_DIRECTORY");
					if (entry.settingsPath.some((segment) => segment.length === 0)) throw new LlmError(`configurable provider "${entry.provider}" has an empty settingsPath segment`, "INVALID_DIRECTORY");
					if (this.directory.has(entry.provider) && !own.has(entry.provider) || detached.some((seen) => seen.provider === entry.provider)) throw new LlmError(`configurable provider "${entry.provider}" is already declared`, "DUPLICATE_DIRECTORY");
					detached.push({
						...entry,
						settingsPath: [...entry.settingsPath]
					});
				}
				for (const entry of held) this.directory.delete(entry.provider);
				for (const entry of detached) this.directory.set(entry.provider, entry);
				held = detached;
				this.emitAdaptersUpdated();
			};
			const dispose = this.ctx.effect(function* () {
				if (entries.length === 0) throw new LlmError("a configurable-provider registration must declare at least one provider", "INVALID_DIRECTORY");
				commit(entries);
				yield () => {
					disposed = true;
					for (const entry of held) this.directory.delete(entry.provider);
					held = [];
					this.emitAdaptersUpdated();
				};
			}.bind(this), "llm.registerConfigurableProviders()");
			const handle = (() => void dispose());
			handle.replace = (next) => {
				if (disposed) throw new LlmError("this configurable-provider registration was disposed", "REGISTRATION_DISPOSED");
				commit(next);
			};
			return handle;
		}
		/**
		* List every declared configurable provider, registered or dormant.
		* @returns detached directory entries in declaration order.
		*/
		listConfigurableProviders() {
			return [...this.directory.values()].map((entry) => ({
				...entry,
				settingsPath: [...entry.settingsPath]
			}));
		}
		/**
		* Offer to interrogate provider endpoints on behalf of the settings
		* namespace this plugin owns. The namespace is the key because that is what
		* a configuration surface already holds from the configurable-provider
		* directory, and because a provider being *added* has no route to name yet.
		* Disposed with the fiber.
		* @param settingsNs - the namespace whose profiles this discovery serves.
		* @param discover - interrogates one endpoint and must honor the supplied signal.
		* @returns the disposer that withdraws the offer.
		*/
		registerModelDiscovery(settingsNs, discover) {
			const dispose = this.ctx.effect(function* () {
				if (settingsNs.length === 0) throw new LlmError("model discovery needs a non-empty settings namespace", "INVALID_DISCOVERY");
				if (this.discoveries.has(settingsNs)) throw new LlmError(`model discovery for "${settingsNs}" is already registered`, "DUPLICATE_DISCOVERY");
				this.discoveries.set(settingsNs, discover);
				yield () => {
					this.discoveries.delete(settingsNs);
				};
			}.bind(this), "llm.registerModelDiscovery()");
			return () => void dispose();
		}
		/**
		* Interrogate one provider endpoint for the models it advertises. The
		* request describes a draft, not a stored route, so nothing here reads or
		* writes settings or credentials — the caller owns both, and the reply is
		* candidate metadata a surface may offer for adoption.
		* @param settingsNs - namespace whose registered discovery serves this draft.
		* @param request - the endpoint, protocol, and one-shot credential to use.
		* @param signal - caller cancellation.
		* @returns the advertised models, deduplicated in endpoint order.
		*/
		async discoverModels(settingsNs, request, signal) {
			const discover = this.discoveries.get(settingsNs);
			if (discover === void 0) throw new LlmError(`no model discovery is registered for "${settingsNs}"`, "NO_DISCOVERY");
			if ((request.provider ?? "").length === 0 && (request.baseURL ?? "").length === 0) throw new LlmError("model discovery needs a provider route or a baseURL", "INVALID_DISCOVERY");
			const discovered = signal === void 0 ? await discover(request) : await discover(request, signal);
			const seen = /* @__PURE__ */ new Set();
			const models = [];
			for (const model of discovered) {
				if (typeof model.id !== "string" || model.id.length === 0 || seen.has(model.id)) continue;
				seen.add(model.id);
				models.push({
					id: model.id,
					...model.name === void 0 ? {} : { name: model.name },
					...model.contextWindow === void 0 ? {} : { contextWindow: model.contextWindow },
					...model.maxTokens === void 0 ? {} : { maxTokens: model.maxTokens }
				});
			}
			return models;
		}
		/**
		* Remote adapter for one draft provider interrogation.
		* @param settingsNs - namespace whose registered discovery serves this draft.
		* @param request - endpoint, protocol, and one-shot credential to use.
		* @param signal - caller cancellation supplied by the Remote carrier.
		* @returns advertised models in endpoint order.
		* @throws RemoteError with `llm/model-discovery-rejected` when discovery refuses or fails.
		*/
		async remoteDiscoverModels(settingsNs, request, signal) {
			try {
				return await this.discoverModels(settingsNs, request, signal);
			} catch (error) {
				throw new RemoteError("llm/model-discovery-rejected", error instanceof Error ? error.message : String(error), {
					settingsNs,
					...request.baseURL === void 0 ? {} : { baseURL: request.baseURL }
				}, { cause: error });
			}
		}
		/**
		* Resolve the retry policy captured when one provider route was registered.
		* @param provider - registered provider route to inspect.
		* @returns the provider-owned policy, with normal defaults already resolved.
		*/
		providerRetryPolicy(provider) {
			return this.registration(provider).retryPolicy;
		}
		/**
		* Resolve provider-side request-image pricing for one exact route, or
		* `undefined` when the provider is unregistered or declares none. Unknown
		* providers degrade to `undefined` rather than throwing because callers
		* price durable history whose route may no longer be mounted.
		* @param provider - provider route named by a request header.
		* @param model - exact model id named by the same header.
		* @returns the owning adapter's image pricing for the route, when declared.
		*/
		imageRequestPricing(provider, model) {
			return this.adapters.get(provider)?.adapter.imageRequestPricing(provider, model);
		}
		/**
		* Resolve the exact text one durable file occurrence contributes to every
		* provider request in the current execution environment.
		* @param ref - durable verbatim file reference from model history.
		* @returns the same deterministic handle text used at adapter dispatch.
		*/
		fileRequestText(ref) {
			return fileHandleText(ref, this.fileReadPath(ref));
		}
		/** Detach typed adapter-owned modality metadata. */
		detachedModalities(modalities) {
			return modalities === void 0 ? void 0 : [...modalities];
		}
		/**
		* Discover models advertised by one registered provider. Catalog membership
		* is advisory and never changes routing or request validation.
		* @param provider - registered provider route to inspect.
		* @returns detached model metadata in adapter-preferred order.
		*/
		async listModels(provider) {
			const models = await this.registration(provider).adapter.listModels(provider);
			const seen = /* @__PURE__ */ new Set();
			return models.map((model) => {
				if (typeof model.provider !== "string" || model.provider !== provider || typeof model.id !== "string" || model.id.length === 0 || typeof model.name !== "string" || model.name.length === 0 || model.description !== void 0 && typeof model.description !== "string" || seen.has(model.id)) throw new LlmError(`adapter returned invalid or duplicate model metadata for provider "${provider}"`, "INVALID_CATALOG");
				seen.add(model.id);
				const inputModalities = this.detachedModalities(model.inputModalities);
				return {
					provider: model.provider,
					id: model.id,
					name: model.name,
					...model.description === void 0 ? {} : { description: model.description },
					...inputModalities === void 0 ? {} : { inputModalities }
				};
			});
		}
		/**
		* Resolve and validate all metadata from the adapter that owns one exact
		* route. The result is detached from adapter-owned objects; catalog
		* membership remains advisory and does not control request routing.
		* @param provider - registered provider route to inspect.
		* @param model - exact model id passed to the adapter.
		* @param signal - optional cancellation for adapter-owned asynchronous lookup.
		* @returns exact model identity plus available context and reasoning metadata.
		*/
		async resolveModelInfo(provider, model, signal) {
			return this.resolveModelInfoFor(this.registration(provider), model, signal);
		}
		async resolveModelInfoFor(registration, model, signal) {
			const resolved = await registration.adapter.resolveModel(registration.provider.id, model, signal);
			return this.normalizeModelInfo(registration, model, resolved);
		}
		/** Validate and detach one adapter-returned exact model result. */
		normalizeModelInfo(registration, model, resolved) {
			const provider = registration.provider.id;
			if (typeof resolved.provider !== "string" || resolved.provider !== provider || typeof resolved.id !== "string" || resolved.id !== model || typeof resolved.name !== "string" || resolved.name.length === 0 || resolved.description !== void 0 && typeof resolved.description !== "string") throw new LlmError(`adapter returned invalid exact model metadata for provider "${provider}" model "${model}"`, "INVALID_MODEL_INFO");
			const context = resolved.context;
			if (context !== void 0 && (!Number.isInteger(context.contextWindow) || context.contextWindow <= 0)) throw new LlmError(`adapter returned invalid context metadata for provider "${provider}" model "${model}"`, "INVALID_MODEL_CONTEXT");
			const inputModalities = this.detachedModalities(resolved.inputModalities);
			const systemPromptUpdate = resolved.systemPromptUpdate;
			if (systemPromptUpdate !== void 0 && systemPromptUpdate !== "in-history") throw new LlmError(`adapter returned invalid system prompt update mode for provider "${provider}" model "${model}"`, "INVALID_MODEL_INFO");
			const defaultMaxTokens = resolved.defaultMaxTokens;
			if (defaultMaxTokens !== void 0 && (!Number.isSafeInteger(defaultMaxTokens) || defaultMaxTokens <= 0)) throw new LlmError(`adapter returned invalid default maxTokens for provider "${provider}" model "${model}"`, "INVALID_MODEL_MAX_TOKENS");
			const info = {
				provider,
				id: model,
				name: resolved.name,
				...resolved.description === void 0 ? {} : { description: resolved.description },
				...inputModalities === void 0 ? {} : { inputModalities },
				...context === void 0 ? {} : { context: { contextWindow: context.contextWindow } },
				...defaultMaxTokens === void 0 ? {} : { defaultMaxTokens },
				...resolved.systemPromptUpdate === void 0 ? {} : { systemPromptUpdate: resolved.systemPromptUpdate }
			};
			const reasoning = resolved.reasoning;
			if (reasoning === void 0) return info;
			if (reasoning.efforts.length === 0) throw new LlmError(`adapter returned invalid reasoning metadata for provider "${provider}" model "${model}"`, "INVALID_MODEL_REASONING");
			const seen = /* @__PURE__ */ new Set();
			const efforts = reasoning.efforts.map((effort) => {
				if (typeof effort.id !== "string" || effort.id.length === 0 || typeof effort.name !== "string" || effort.name.length === 0 || effort.description !== void 0 && typeof effort.description !== "string" || seen.has(effort.id)) throw new LlmError(`adapter returned invalid or duplicate reasoning effort metadata for provider "${provider}" model "${model}"`, "INVALID_MODEL_REASONING");
				seen.add(effort.id);
				return {
					id: effort.id,
					name: effort.name,
					...effort.description === void 0 ? {} : { description: effort.description }
				};
			});
			if (reasoning.defaultEffort !== void 0 && !seen.has(reasoning.defaultEffort)) throw new LlmError(`adapter returned an unknown default reasoning effort for provider "${provider}" model "${model}"`, "INVALID_MODEL_REASONING");
			return {
				...info,
				reasoning: {
					efforts,
					...reasoning.defaultEffort === void 0 ? {} : { defaultEffort: reasoning.defaultEffort }
				}
			};
		}
		/**
		* Validate a conversation call config against its exact model capability and
		* materialize adapter-configured defaults. Unsupported explicit efforts
		* reject before provider I/O; no clamping or aliasing is performed. This
		* standalone query does not bind a later dispatch; use {@link prepareCall}
		* when logging and streaming must share one adapter registration.
		* @param config - provider/model route and optional request controls.
		* @param signal - optional cancellation for adapter-owned capability lookup.
		* @returns a detached config only when a default must be materialized.
		*/
		async resolveCallConfig(config, signal) {
			return (await this.resolveCallFor(this.registration(config.provider), config, signal)).config;
		}
		async resolveCallFor(registration, config, signal) {
			const info = await this.resolveModelInfoFor(registration, config.model, signal);
			return this.resolveCallWithInfo(config, info);
		}
		/** Validate request controls against one already-bound exact model result. */
		resolveCallWithInfo(config, info) {
			const defaulted = config.maxTokens === void 0 && info.defaultMaxTokens !== void 0 ? {
				...config,
				maxTokens: info.defaultMaxTokens
			} : config;
			const reasoning = info.reasoning;
			const requested = defaulted.reasoningEffort;
			let resolvedConfig = defaulted;
			if (reasoning === void 0) {
				if (requested !== void 0) throw new LlmError(`provider "${config.provider}" model "${config.model}" does not support reasoning effort "${requested}"`, "UNSUPPORTED_REASONING_EFFORT");
			} else {
				const effective = requested ?? reasoning.defaultEffort;
				if (effective !== void 0) {
					if (!reasoning.efforts.some((effort) => effort.id === effective)) throw new LlmError(`provider "${config.provider}" model "${config.model}" does not support reasoning effort "${effective}"`, "UNSUPPORTED_REASONING_EFFORT");
					if (requested !== effective) resolvedConfig = {
						...defaulted,
						reasoningEffort: effective
					};
				}
			}
			return {
				config: resolvedConfig,
				...info.context === void 0 ? {} : { context: info.context },
				modelInfo: info
			};
		}
		/**
		* Resolve one call under its current adapter registration. The returned
		* one-shot handle keeps that registration across header logging and dispatch,
		* so HMR cannot combine one adapter's capability result with another adapter.
		* @param config - provider/model route and optional request controls.
		* @param signal - optional cancellation for adapter-owned capability lookup.
		* @returns a prepared config and its registration-bound stream entry point.
		*/
		async prepareCall(config, signal) {
			const registration = this.registration(config.provider);
			const adapterCall = await registration.adapter.prepareCall(config.provider, config.model, signal);
			const modelInfo = this.normalizeModelInfo(registration, config.model, adapterCall.model);
			const resolved = this.resolveCallWithInfo(config, modelInfo);
			const resolvedConfig = deepFreeze(structuredClone(resolved.config));
			const context = resolved.context === void 0 ? void 0 : deepFreeze(structuredClone(resolved.context));
			const adapterDefaults = deepFreeze({
				...config.reasoningEffort === void 0 && resolvedConfig.reasoningEffort !== void 0 ? { reasoningEffort: true } : {},
				...config.maxTokens === void 0 && resolvedConfig.maxTokens !== void 0 ? { maxTokens: true } : {}
			});
			let dispatched = false;
			return Object.freeze({
				config: resolvedConfig,
				retryPolicy: registration.retryPolicy,
				adapterDefaults,
				...context === void 0 ? {} : { context },
				...modelInfo.inputModalities === void 0 ? {} : { inputModalities: Object.freeze([...modelInfo.inputModalities]) },
				...modelInfo.systemPromptUpdate === void 0 ? {} : { systemPromptUpdate: modelInfo.systemPromptUpdate },
				stream: (options) => {
					if (dispatched) throw new LlmError("a prepared LLM call can only be dispatched once", "INVALID_PREPARED_CALL");
					if (!callConfigEquals(options, resolvedConfig)) throw new LlmError("prepared LLM call config changed before adapter dispatch", "INVALID_PREPARED_CALL");
					dispatched = true;
					return this.streamWithRegistration(options, {
						registration,
						config: resolvedConfig,
						modelInfo,
						dispatch: (options) => adapterCall.stream(options)
					});
				}
			});
		}
		registration(provider) {
			const registration = this.adapters.get(provider);
			if (!registration) throw new LlmError(`no adapter registered for provider "${provider}"`, "NO_ADAPTER");
			return registration;
		}
		/** Remove replay state whose historical route is owned by another adapter. */
		forAdapter(options, adapter) {
			const messages = options.messages.map((message) => {
				const source = message.source;
				if (message.role !== "assistant" || source.kind !== "model" || source.replayState === void 0) return message;
				if (this.adapters.get(source.provider)?.adapter === adapter) return message;
				return freezeMessage({
					...message,
					source: {
						kind: "model",
						provider: source.provider,
						model: source.model
					}
				});
			});
			if (messages.every((message, index) => message === options.messages[index])) return options;
			const filtered = {
				...options,
				messages
			};
			return Object.isFrozen(options) ? deepFreeze(filtered) : filtered;
		}
		/**
		* Resolve the current execution-world read path of one durable file
		* reference through the mounted attachment and filesystem providers.
		*/
		fileReadPath(ref) {
			let hostPath;
			try {
				hostPath = this.ctx.get("attachments")?.fileHostPath(ref);
			} catch {
				return;
			}
			if (hostPath === void 0) return void 0;
			return this.ctx.get("fs")?.processPathFromHostPath(hostPath);
		}
		/**
		* Final adapter boundary. Adapter selection, dispatch, iterator construction,
		* and iteration failures become one terminal failure chunk. Middleware and
		* downstream consumer failures remain thrown plugin or consumer errors.
		*/
		async *adapterStream(options, prepared) {
			let iterator;
			try {
				const registration = prepared?.registration ?? this.registration(options.provider);
				const adapter = registration.adapter;
				let modelInfo;
				let resolvedConfig;
				let dispatch;
				if (prepared === void 0) {
					const adapterCall = await adapter.prepareCall(options.provider, options.model, options.signal);
					modelInfo = this.normalizeModelInfo(registration, options.model, adapterCall.model);
					resolvedConfig = this.resolveCallWithInfo(options, modelInfo).config;
					dispatch = (options) => adapterCall.stream(options);
				} else {
					modelInfo = prepared.modelInfo;
					resolvedConfig = prepared.config;
					dispatch = prepared.dispatch;
				}
				if (prepared !== void 0 && !callConfigEquals(options, resolvedConfig)) throw new LlmError("prepared LLM call config changed before adapter dispatch", "INVALID_PREPARED_CALL");
				const resolvedOptions = callConfigEquals(options, resolvedConfig) ? options : Object.isFrozen(options) ? deepFreeze({
					...options,
					...resolvedConfig
				}) : {
					...options,
					...resolvedConfig
				};
				let projectedMessages = resolvedOptions.messages;
				if (projectedMessages.some((message) => contentHasFile(message.content))) projectedMessages = projectFilesToText(projectedMessages, (ref) => this.fileReadPath(ref));
				if (modelInfo.inputModalities !== void 0 && !modelInfo.inputModalities.includes("image") && projectedMessages.some((message) => contentHasImage(message.content))) projectedMessages = projectImagesForTextModel(projectedMessages);
				const projectedOptions = projectedMessages === resolvedOptions.messages ? resolvedOptions : Object.isFrozen(resolvedOptions) ? deepFreeze({
					...resolvedOptions,
					messages: projectedMessages
				}) : {
					...resolvedOptions,
					messages: projectedMessages
				};
				iterator = dispatch(this.forAdapter(projectedOptions, adapter))[Symbol.asyncIterator]();
			} catch (error) {
				yield adapterFailureChunk(error, options.signal);
				return;
			}
			let completed = false;
			try {
				while (true) {
					let item;
					try {
						const next = await iterator.next();
						item = next.done ? { done: true } : {
							done: false,
							value: next.value
						};
					} catch (error) {
						completed = true;
						yield adapterFailureChunk(error, options.signal);
						return;
					}
					if (item.done) {
						completed = true;
						return;
					}
					yield item.value;
				}
			} finally {
				if (!completed) {
					const close = iterator.return?.bind(iterator);
					if (close) await close();
				}
			}
		}
		/**
		* Stream one model call as raw chunks (token-level deltas). Replay state is
		* retained only when the same adapter instance owns its historical provider
		* and the target provider. Final adapter selection remains fixed through
		* asynchronous exact-model resolution and dispatch. Adapter selection,
		* dispatch, and iteration failures become terminal `error` or `aborted`
		* finish chunks; middleware, nested-call, cleanup, and consumer failures
		* remain thrown.
		* @param options - the full request; `options.provider` selects the adapter.
		* @returns the chunk stream, possibly wrapped by `llm/stream` listeners.
		*/
		stream(options) {
			return this.streamWithRegistration(options);
		}
		streamWithRegistration(options, prepared) {
			return this.ctx.waterfall(this, "llm/stream", options, () => this.adapterStream(options, prepared));
		}
	};
})();
/** Convert one adapter throw into the stream protocol's terminal outcome. */
function adapterFailureChunk(error, signal) {
	const failure = normalizeLlmFailure(error);
	return {
		type: "finish",
		reason: signal?.aborted || failure.code === "ABORTED" ? {
			kind: "aborted",
			failure
		} : {
			kind: "error",
			failure
		}
	};
}
//#endregion
//#region ../../core/session/src/request-header.ts
/**
* Normalize a header to canonical form: an empty tool list becomes an absent
* field, matching how requests are built. Logging, folding, and comparison use
* this one representation.
* @param header - the header to normalize (not mutated).
* @returns the canonical header.
*/
function canonicalHeader(header) {
	const adapterDefaults = header.adapterDefaults;
	return {
		config: header.config,
		...adapterDefaults?.reasoningEffort === true || adapterDefaults?.maxTokens === true ? { adapterDefaults } : {},
		...header.tools !== void 0 && header.tools.length > 0 ? { tools: header.tools } : {}
	};
}
/**
* Fold the header events of a log (or any prefix) into the
* {@link EpochHeader} in force after the last snapshot. Non-header events are
* skipped. This is the pure offline reconstruction path; the live session
* tracks the same fold incrementally.
* @param events - session events in log order.
* @param from - a previously folded state to continue from.
* @returns the latest canonical header, or undefined when none exists yet.
*/
function foldRequestHeader(events, from) {
	let state = from;
	for (const event of events) if (event.type === "request/header") state = canonicalHeader(event.data.header);
	return state;
}
//#endregion
//#region ../../core/session/src/index.ts
/** Validate and freeze one detached creation header in place. */
function validateSessionHeader(id, input) {
	if (input === null || typeof input !== "object" || Array.isArray(input)) throw new Error("session header is not a plain JSON record");
	const record = input;
	if (Object.hasOwn(record, "seedLength")) throw new Error("session header has invalid field \"seedLength\"");
	if (record.version !== 3) throw new Error(`session header version must be 3, got ${String(record.version)}`);
	if (record.id !== id) throw new Error(`session header id "${String(record.id)}" does not match session id "${id}"`);
	if (typeof record.createdAt !== "number" || !Number.isSafeInteger(record.createdAt) || record.createdAt < 0) throw new Error("session header createdAt must be a non-negative safe integer");
	if (record.cwd !== void 0) {
		if (typeof record.cwd !== "string") throw new Error("session header cwd must be a string");
		if (!(0, node_path.isAbsolute)(record.cwd)) throw new Error(`session header cwd must be an absolute path, got "${record.cwd}"`);
	}
	if (record.parentSession !== void 0 && typeof record.parentSession !== "string") throw new Error("session header parentSession must be a string");
	if (typeof record.isSeeded !== "boolean") throw new Error("session header isSeeded must be a boolean");
	if (record.origin !== void 0 && record.origin !== "subagent") throw new Error("session header origin must be \"subagent\"");
	if (record.delegationDepth !== void 0 && (typeof record.delegationDepth !== "number" || !Number.isSafeInteger(record.delegationDepth) || record.delegationDepth < 0)) throw new Error("session header delegationDepth must be a non-negative safe integer");
	if (record.agentPreset !== void 0 && typeof record.agentPreset !== "string") throw new Error("session header agentPreset must be a string");
	return deepFreeze(record);
}
/** Validate and freeze one exclusively owned persistence header in place. */
function validateRestoredSessionHeader(id, input) {
	if (input !== null && typeof input === "object" && !Array.isArray(input)) {
		const prototype = Reflect.getPrototypeOf(input);
		if (prototype !== Object.prototype && prototype !== null) throw new Error("session header is not a plain JSON record");
	}
	return validateSessionHeader(id, input);
}
/** Detach, validate, and freeze the creation metadata published by a session. */
function snapshotSessionHeader(id, source) {
	const snapshot = snapshotJsonValue(source === void 0 ? {
		version: 3,
		id,
		createdAt: Date.now(),
		isSeeded: false
	} : source);
	if (snapshot === void 0) throw new Error("session header is not losslessly JSON-serializable");
	return validateSessionHeader(id, snapshot);
}
/**
* Validate an exclusively owned event and deeply freeze its identified message
* without copying the event. The caller transfers an object graph that no
* producer retains and that shares no mutable children with another event.
* Use {@link snapshotSessionEvent} when exclusive ownership is not guaranteed.
* @param event - exclusively owned event imported across a trusted boundary.
* @returns the same event object with a validated, deeply frozen message.
* @throws when event-local surface metadata, request-header fields, or message invariants are invalid; history relations are not checked.
*/
function adoptSessionEvent(event) {
	validateSessionEventData(event, `session event at seq ${event.seq}`);
	validateSurfaceMetadata(event);
	assertMessageEventShape(event, `session event at seq ${event.seq}`);
	switch (event.type) {
		case "user/message":
			deepFreeze(event.data);
			break;
		case "system/message":
		case "assistant/message":
		case "tool/result":
			deepFreeze(event.data.message);
			break;
		default: break;
	}
	return event;
}
/** Validate the fixed event envelope after one-pass JSON materialization. */
function assertSessionEventEnvelope(value, index) {
	if (value === null || typeof value !== "object" || Array.isArray(value)) throw new Error(`seed event at index ${index} has an invalid event envelope`);
	const event = value;
	for (const key in event) switch (key) {
		case "type":
		case "seq":
		case "time":
		case "data":
		case "surfaceOp":
		case "sourceEventSeqs":
		case "ignorable": break;
		default: throw new Error(`seed event at index ${index} has an invalid event envelope`);
	}
	const type = event["type"];
	const seq = event["seq"];
	const time = event["time"];
	if (typeof type !== "string" || typeof seq !== "number" || !Number.isSafeInteger(seq) || seq < 0 || Object.is(seq, -0) || typeof time !== "number" || !Number.isSafeInteger(time) || event["data"] === void 0 || event["ignorable"] !== void 0 && event["ignorable"] !== true) throw new Error(`seed event at index ${index} has an invalid event envelope`);
	validateSessionEventData(event, `seed ${type} at index ${index}`);
	switch (type) {
		case "request/header":
		case "system/message":
		case "user/message":
		case "assistant/attempt":
		case "assistant/message":
		case "tool/result":
			assertCurrentLlmShape(event, index);
			break;
	}
}
/** Reject obsolete request headers and malformed messages at the seed/load boundary. */
function assertCurrentLlmShape(event, index) {
	const data = event["data"];
	const record = typeof data === "object" && data !== null ? data : void 0;
	if (event["type"] === "request/header") {
		const headerRecord = record?.["header"];
		const config = headerRecord["config"];
		if (!hasProviderModel(config)) throw new Error(`seed request/header at index ${index} lacks provider/model`);
		const configRecord = config;
		const reasoningEffort = configRecord["reasoningEffort"];
		if (reasoningEffort !== void 0 && (typeof reasoningEffort !== "string" || reasoningEffort.length === 0)) throw new Error(`seed request/header at index ${index} has an invalid reasoningEffort`);
		assertAdapterDefaults(headerRecord["adapterDefaults"], configRecord, index);
		const reason = record?.["reason"];
		if (reason !== "initial" && reason !== "resume" && reason !== "change" && reason !== "series") throw new Error(`seed request/header at index ${index} has an invalid reason`);
		if (record?.["startsSeries"] !== void 0 && record["startsSeries"] !== true) throw new Error(`seed request/header at index ${index} has an invalid startsSeries marker`);
	}
	const type = event["type"];
	if (type === "assistant/attempt") {
		assertAssistantSettlementShape(record, type, index);
		return;
	}
	if (!isMessageEventType(type)) return;
	assertMessageEventShape(event, `seed ${type} at index ${index}`);
	if (type === "assistant/message") assertAssistantSettlementShape(record, type, index);
}
/** Validate fields used directly by restored Session lifecycle logic without replaying the embedded stream. */
function assertAssistantSettlementShape(data, type, index) {
	const turn = data?.["turn"];
	const step = data?.["step"];
	if (typeof turn !== "number" || !Number.isSafeInteger(turn) || turn < 0 || Object.is(turn, -0) || typeof step !== "number" || !Number.isSafeInteger(step) || step < 0 || Object.is(step, -0) || !Array.isArray(data?.["stream"])) throw new Error(`seed ${type} at index ${index} has invalid settlement fields`);
}
const allowedAdapterKeys = new Set(["reasoningEffort", "maxTokens"]);
/** Validate adapter-default markers imported from a durable request header. */
function assertAdapterDefaults(value, config, index) {
	if (value === void 0) return;
	if (typeof value !== "object" || value === null || Array.isArray(value)) throw new Error(`seed request/header at index ${index} has invalid adapterDefaults`);
	const defaults = value;
	if (Object.keys(defaults).some((key) => !allowedAdapterKeys.has(key)) || Object.values(defaults).some((marker) => marker !== true) || defaults["reasoningEffort"] === true && config["reasoningEffort"] === void 0 || defaults["maxTokens"] === true && config["maxTokens"] === void 0) throw new Error(`seed request/header at index ${index} has invalid adapterDefaults`);
}
/** The four surface event types whose payload carries an identified message. */
function isMessageEventType(type) {
	return type === "system/message" || type === "user/message" || type === "assistant/message" || type === "tool/result";
}
const MESSAGE_ROLE_BY_TYPE = {
	"system/message": "system",
	"user/message": "user",
	"assistant/message": "assistant",
	"tool/result": "user"
};
/** Validate only the event-specific invariants needed to safely replay a message. */
function assertMessageEventShape(event, subject) {
	const type = event["type"];
	if (!isMessageEventType(type)) return;
	const data = event["data"];
	const record = typeof data === "object" && data !== null ? data : void 0;
	const message = type === "user/message" ? record : record?.["message"];
	if (typeof message !== "object" || message === null || typeof message["id"] !== "string" || message["id"] === "") throw new Error(`${subject} lacks an identified message`);
	const messageRecord = message;
	const expectedRole = MESSAGE_ROLE_BY_TYPE[type];
	if (messageRecord["role"] !== expectedRole) throw new Error(`${subject} message must have role "${expectedRole}"`);
	const source = messageRecord["source"];
	if (typeof source !== "object" || source === null || typeof source["kind"] !== "string" || source["kind"] === "") throw new Error(`${subject} message has invalid source`);
	if (!Array.isArray(messageRecord["content"])) throw new Error(`${subject} message has invalid content`);
	const sourceRecord = source;
	if (type === "system/message") {
		if (sourceRecord["kind"] !== "plugin" || typeof sourceRecord["plugin"] !== "string" || sourceRecord["plugin"] === "") throw new Error(`${subject} message must have plugin source`);
		return;
	}
	if (type === "assistant/message") {
		if (sourceRecord["kind"] !== "model" || !hasProviderModel(sourceRecord)) throw new Error(`${subject} message must have model source`);
		return;
	}
	if (type !== "tool/result") return;
	if (sourceRecord["kind"] !== "tool" || typeof sourceRecord["callId"] !== "string" || sourceRecord["callId"] === "") throw new Error(`${subject} message must have tool source`);
	const content = messageRecord["content"];
	const block = content[0];
	if (content.length !== 1 || typeof block !== "object" || block === null || block["type"] !== "tool-result" || !Array.isArray(block["content"])) throw new Error(`${subject} message must contain one tool-result block`);
	if (block["toolCallId"] !== sourceRecord["callId"]) throw new Error(`${subject} message has mismatched tool call ids`);
}
/** Whether an unknown value carries the current provider/model pair. */
function hasProviderModel(value) {
	if (typeof value !== "object" || value === null) return false;
	const pair = value;
	return typeof pair["provider"] === "string" && pair["provider"].length > 0 && typeof pair["model"] === "string" && pair["model"].length > 0;
}
/** Resolve one listener snapshot, including Cordis's internal dispatch checks. */
function collectSessionCallbacks(ctx, args) {
	return [...ctx.events.dispatch("emit", args)];
}
/** Invoke one resolved observe-only listener snapshot with per-listener containment. */
function invokeContainedSessionObservers(ctx, name, id, args, callbacks) {
	for (const callback of callbacks) try {
		const returned = callback(...args);
		Promise.resolve(returned).catch((error) => {
			ctx.logger.warn(`session "${id}": ${name} listener rejected: ${String(error)}`);
		});
	} catch (error) {
		ctx.logger.warn(`session "${id}": ${name} listener threw: ${String(error)}`);
	}
}
/** Store attachment for the append path; module-private to keep Session store-agnostic publicly. */
const attachments = /* @__PURE__ */ new WeakMap();
/**
* An event-sourced session: an append-only log of {@link SessionEvent}s.
*
* Plain class (not a Service) — create live instances via
* `ctx.sessions.create()` and detached instances via {@link create}.
* Seeding with an existing event log replays/forks a session.
* @typert object
*/
var Session = class Session {
	log = [];
	/** Single incremental owner of surface acceptance and projection state. */
	surfaceManager = new SurfaceManager(this.log);
	/** The ordered surface over this session's event log. */
	get surface() {
		return this.surfaceManager;
	}
	/**
	* Detached, deep-frozen creation metadata (format version, cwd, lineage,
	* and whether fork history exists). Supplied by the store via `ctx.sessions.create()`. When a
	* `Session` is created without a store-owned header, a minimal header is
	* synthesized (stamped with the current {@link SESSION_FORMAT_VERSION}) so
	* `session.header` is always present. Kept out of the event log — it is a
	* storage concern, not replayable conversation state.
	*/
	header;
	/** Number of leading events inherited from this Session's fork parent. */
	inheritedEventCount;
	/** The session identity, derived from its durable header's single copy. */
	get id() {
		return this.header.id;
	}
	/**
	* The first seq appended IN THIS PROCESS: the length of the constructor
	* seed (0 without one). Events with smaller seq values entered through
	* construction — replay, fork, or resume — and were never published on the
	* `session/event` firehose (constructor seeds do not emit). This offset marks
	* the constructor-input boundary for lifecycle ownership and persistence
	* adoption; consumers that need complete canonical history still start at
	* seq 0. Distinct from {@link inheritedEventCount}, the DURABLE
	* fork-lineage cut: a resumed session's constructor seed is its full stored
	* log, while the inherited count keeps the original fork value — this field is the
	* in-process construction fact.
	*
	* Not persisted itself: a seeded session projects it into the log as the
	* `session/end-seed` event, which is what a consumer reading STORED history
	* reads. Locate the LAST such event, not necessarily one at this seq — a
	* seed already ending in one is not re-marked, so reopening an untouched
	* session leaves that event at a smaller seq than `firstLiveSeq`. Prefer
	* this field in-process: it is exact before the marker reaches storage.
	*
	* When this lifecycle appends the marker, it occupies this seq before the
	* store attaches and therefore does not publish either. Otherwise this seq
	* holds an ordinary published write.
	*/
	firstLiveSeq;
	/**
	* Create a detached session by validating and snapshotting borrowed seed
	* events and storage metadata.
	* @param id - session identity.
	* @param seed - optional borrowed replay or fork events.
	* @param header - optional borrowed storage metadata.
	* @param inheritedEventCount - exact fork-inherited prefix length for a seeded header.
	* @returns a detached session.
	*/
	static create(id, seed, header, inheritedEventCount) {
		return new Session(id, seed, header, "snapshot", inheritedEventCount);
	}
	/**
	* Restore a detached session by adopting an independently owned or deeply frozen seed.
	* Runtime-required event fields, event envelopes, sequence continuity, surface
	* transitions, and header fields are validated without copying or freezing events.
	* Embedded Assistant streams remain opaque until a stream consumer or storage
	* verifier reads them.
	* @param id - restored session identity.
	* @param seed - independently owned or deeply frozen events.
	* @param header - independently owned storage metadata.
	* @param inheritedEventCount - exact fork-inherited prefix length decoded from storage.
	* @param eventState - aliasing state carried from the operation that produced the seed.
	* @returns a restored detached session.
	*/
	static fromRestore(id, seed, header, inheritedEventCount, eventState) {
		return new Session(id, seed, header, eventState, inheritedEventCount);
	}
	constructor(id, seed, header, mode = "snapshot", suppliedInheritedEventCount) {
		const restoredHeader = mode === "snapshot" ? void 0 : validateRestoredSessionHeader(id, header);
		if (seed !== void 0) for (const [index, source] of seed.entries()) {
			const snapshot = mode === "snapshot" ? snapshotJsonValue(source) : source;
			if (snapshot === void 0) throw new Error(`seed event at index ${index} is not losslessly JSON-serializable`);
			assertSessionEventEnvelope(snapshot, index);
			if (snapshot.seq !== index) throw new Error(`seed event at index ${index} has seq ${snapshot.seq} (expected ${index}); seed must be contiguous from 0`);
			try {
				this.surfaceManager.validateNext(snapshot);
			} catch (error) {
				throw new Error(`invalid seed event at index ${index}: ${error instanceof Error ? error.message : "invalid surface metadata"}`);
			}
			this.log.push(mode === "snapshot" ? deepFreeze(snapshot) : snapshot);
		}
		this.firstLiveSeq = SessionLogOffset(this.log.length);
		this.header = restoredHeader ?? snapshotSessionHeader(id, header);
		if (this.header.isSeeded && seed === void 0) throw new Error("seeded session requires an explicit constructor seed");
		if (this.header.isSeeded && suppliedInheritedEventCount === void 0) throw new Error("seeded session requires an inherited event count");
		const inheritedEventCount = SessionLogOffset(suppliedInheritedEventCount ?? 0);
		if (!this.header.isSeeded && inheritedEventCount !== 0) throw new Error("unseeded session inherited event count must be 0");
		if (inheritedEventCount > this.log.length) throw new Error("session inherited event count exceeds its event log");
		if (mode === "snapshot" && this.header.isSeeded && inheritedEventCount !== this.log.length) throw new Error("seeded session constructor seed must equal its inherited prefix");
		this.inheritedEventCount = inheritedEventCount;
		if (seed !== void 0 && mode === "snapshot" && this.header.isSeeded) this.append("session/end-seed", { inherited: true });
		else if (seed !== void 0 && this.log.at(-1)?.type !== "session/end-seed") this.append("session/end-seed", {});
	}
	/** Cached immutable full snapshot of the private append-only log. */
	eventsSnapshot;
	/**
	* Return the immutable event stored at one exact sequence number.
	* @param seq - event sequence number.
	* @returns the accepted event, or undefined when the log does not contain it.
	*/
	eventAt(seq) {
		return this.log[seq];
	}
	/**
	* Materialize an immutable snapshot of a half-open event sequence range.
	* A full current snapshot is reused until the next append; every previously
	* returned snapshot remains stable after later appends.
	* @param fromSeq - non-negative inclusive sequence number; defaults to the log start.
	* @param toSeqExclusive - non-negative exclusive sequence number; defaults to the current end.
	* @returns a frozen array of the selected deeply frozen events.
	*/
	snapshotEvents(fromSeq = SessionLogOffset(0), toSeqExclusive = this.seq) {
		if (fromSeq === 0 && toSeqExclusive === this.log.length) {
			this.eventsSnapshot ??= Object.freeze([...this.log]);
			return this.eventsSnapshot;
		}
		return Object.freeze(this.log.slice(fromSeq, toSeqExclusive));
	}
	/**
	* Return this Session's events after its fork-inherited prefix.
	* @returns a fresh array containing child-owned events in log order.
	*/
	ownEvents() {
		return this.snapshotEvents(this.inheritedEventCount);
	}
	/**
	* Whether one existing event position is outside the fork-inherited prefix.
	* @param seq - event position in this Session.
	* @returns true when the event belongs to this Session rather than its parent.
	*/
	isOwnSeq(seq) {
		return seq >= this.inheritedEventCount && seq < this.seq;
	}
	/** The next event's sequence number — always the log length (the `seq = log.length` contiguity contract). */
	get seq() {
		return SessionLogOffset(this.log.length);
	}
	/**
	* Append one typed event to the log and synchronously notify observers via
	* the store-owned, module-private publication hooks. The hot path never blocks
	* on I/O — persistence plugins buffer asynchronously. Once the event enters
	* the log, the append is committed: observer failures are logged and
	* contained per listener, so they do not change the return value or prevent
	* later listeners from observing the same accepted event.
	*
	* @param type - The event type (key of {@link SessionEventMap}).
	* @param data - The event payload; must be JSON-serializable.
	* @param opts - Surface metadata: `surfaceOp` controls how the event enters
	*   the ordered surface; `sourceEventSeqs` lists the seq numbers of earlier
	*   events this one derives from. REQUIRED for
	*   {@link SurfaceEventType} events (every message-producing event must
	*   declare how it joins the surface, the sole source of derived model
	*   history) and
	*   rejected by the compiler for non-surface types like `turn/start` or
	*   `assistant/attempt`. Assistant messages embed their exact provider
	*   stream and cannot cite top-level source events.
	* @returns the logged event — its assigned `seq`/`time` plus the SNAPSHOT of
	*   `data` that entered the log, so reading `event.data` back sees the logged
	*   value, never the caller's still-mutable input.
	* @throws if `data` or surface metadata is not losslessly JSON-serializable
	*   (BigInt, function, symbol, undefined, negative zero, non-finite number,
	*   circular reference, sparse array, or an exotic object such as
	*   Map/Set/Date/class instance), or when the candidate violates the
	*   request-header empty-field or tool-error consistency rules, or the
	*   canonical surface contract (marker shape and eligibility, unique
	*   earlier source-event references, positional replacement validity, and complete
	*   shadowed-node coverage). One iterative pass reads, validates, and
	*   copies each nested value once, so a stateful getter cannot supply one value
	*   to validation and another to storage. The event log is the durable source
	*   of truth, so a bad event fails at the append site rather than later during
	*   a backend flush. A synchronous internal dispatch validation failure or an
	*   append reentered while this acceptance/publication boundary is open also
	*   rejects before the log changes.
	*/
	append(type, data, ...opts) {
		const surfaceOpts = opts[0];
		const surfaceMetadata = {
			...surfaceOpts?.sourceEventSeqs === void 0 ? {} : { sourceEventSeqs: surfaceOpts.sourceEventSeqs },
			...surfaceOpts?.surfaceOp === void 0 ? {} : { surfaceOp: surfaceOpts.surfaceOp }
		};
		const dataSnapshot = snapshotJsonValue(data);
		if (dataSnapshot === void 0) throw new Error(`session event "${type}" carries non-JSON-serializable data`);
		const surfaceMetadataSnapshot = snapshotJsonValue(surfaceMetadata);
		if (surfaceMetadataSnapshot === void 0) throw new Error(`session event "${type}" carries non-JSON-serializable surface metadata`);
		const entry = attachments.get(this);
		if (entry?.appending) throw new Error("session append cannot reenter while another append is being published");
		const event = deepFreeze({
			type,
			seq: SessionSeq(this.log.length),
			time: Date.now(),
			data: dataSnapshot,
			...surfaceMetadataSnapshot
		});
		validateSessionEventData(event, `session event "${type}" at seq ${event.seq}`);
		this.surfaceManager.validateNext(event);
		if (entry !== void 0) entry.appending = true;
		try {
			let callbacks;
			const callbackArgs = [this, event];
			if (entry !== void 0) callbacks = collectSessionCallbacks(entry.emitCtx, [
				entry.carrier,
				"session/event",
				...callbackArgs
			]);
			this.log.push(event);
			this.eventsSnapshot = void 0;
			if (callbacks !== void 0 && entry !== void 0) invokeContainedSessionObservers(entry.emitCtx, "session/event", entry.id, callbackArgs, callbacks);
			return event;
		} finally {
			if (entry !== void 0) {
				entry.appending = false;
				if (entry.detachRequested && !entry.announcing) entry.detach();
			}
		}
	}
	/** Cached fold of the request-header events — see {@link requestHeader}. */
	headerFold;
	/** Log position (events consumed) the header fold has reached. */
	headerFoldSeq = 0;
	/**
	* The {@link EpochHeader} in force after the log's last header event — the
	* header the NEXT request will be compared against — or undefined before
	* the first `request/header` snapshot. The live, incrementally-maintained
	* form of `foldRequestHeader(session.snapshotEvents())`: each header event is folded
	* once, when first seen, so a per-step read costs O(new events).
	* @returns the folded header, or undefined when no header event exists yet.
	*/
	requestHeader() {
		if (this.headerFoldSeq < this.log.length) {
			this.headerFold = deepFreeze(foldRequestHeader(this.log.slice(this.headerFoldSeq), this.headerFold));
			this.headerFoldSeq = this.log.length;
		}
		return this.headerFold;
	}
	/** Cached fold of `request/context` events. */
	contextFold;
	contextFoldSeq = 0;
	/**
	* Return the latest resolved route metadata, or `undefined` before the first
	* `request/context` event. Each event is folded once.
	* @returns the latest immutable route metadata.
	*/
	requestContext() {
		if (this.contextFoldSeq < this.log.length) {
			for (const event of this.log.slice(this.contextFoldSeq)) if (event.type === "request/context") this.contextFold = deepFreeze({ ...event.data });
			this.contextFoldSeq = this.log.length;
		}
		return this.contextFold;
	}
	/** The derived-message cache: frozen projections, extended per unseen node. */
	derived = [];
	/** Surface position (nodes projected) the cache has reached. */
	derivedNodes = 0;
	/** {@link SurfaceManager.replaceGeneration} the cache was built under. */
	derivedGeneration = 0;
	/**
	* Derive the LLM message history by walking the ordered sequences of
	* message-producing events maintained by `surfaceOp` markers. The
	* surface is the single source of derived history: every message-producing
	* append records its `surfaceOp`, so a raw event with no marker (a chunk, a
	* turn boundary) is correctly absent, and a compaction `replace` deletes the
	* shadowed nodes from the derivation. The projection rules are
	* {@link deriveEventMessage}, folded per node.
	*
	* CACHED: each surface node is projected exactly once, when first seen — a
	* call costs O(new nodes), and a surface rewrite (a `replace`;
	* {@link SessionSurface.replaceGeneration}) rebuilds. The returned array is
	* a fresh snapshot per call (later appends never grow an array a caller
	* already holds); the `Message` objects in it are SHARED and **deep-frozen**.
	* Their content reuses the already frozen durable event data, so the cache
	* needs no second deep clone and consumers still cannot mutate the log.
	* @returns a fresh array of the shared, frozen derived history.
	*/
	deriveMessages() {
		const surface = this.surface;
		const nodes = surface.nodes;
		const generation = surface.replaceGeneration;
		if (generation !== this.derivedGeneration) {
			this.derived = [];
			this.derivedNodes = 0;
			this.derivedGeneration = generation;
		}
		for (const seq of nodes.slice(this.derivedNodes)) {
			const msg = this.deriveEventMessage(this.log[seq]);
			if (msg) this.derived.push(msg);
		}
		this.derivedNodes = nodes.length;
		return [...this.derived];
	}
	/**
	* Instance face of the pure per-node `deriveEventMessage` export from
	* `surface.ts`.
	* @param event - the event to project.
	* @returns the derived message, or null when the event produces none.
	*/
	deriveEventMessage(event) {
		return deriveEventMessage(event);
	}
};
//#endregion
//#region ../session-persistence/src/errors.ts
/**
* Stable failures exposed by the session-persistence service and its handles,
* including the format refusals shared by every backend: a stored log this
* build cannot faithfully interpret is refused, never misread, and the
* refusal points at the raw artifact when the backend keeps one per session.
* @module @deepseek-ai/dsh-session-persistence/errors
*/
/** Durable session contents failed validation after a successful backend read. */
var SessionPersistenceCorruptionError = class extends Error {
	/**
	* @param message - stable corruption context.
	* @param options - original validation failure.
	*/
	constructor(message, options) {
		super(message, options);
		this.name = "SessionPersistenceCorruptionError";
	}
};
/**
* The stored log is intact but this runtime cannot faithfully interpret it:
* the header carries an unsupported format version, or an event's type is
* unknown to this build. Distinct from {@link SessionPersistenceCorruptionError}
* — nothing is damaged; the raw log remains readable at {@link location} when
* the backend keeps one artifact per session.
*/
var SessionFormatUnsupportedError = class extends Error {
	location;
	/**
	* @param message - stable reason the log cannot be interpreted, already
	*   including the raw-log path when one exists.
	* @param location - the backend's artifact location, when one exists.
	*/
	constructor(message, location) {
		super(message);
		this.location = location;
		this.name = "SessionFormatUnsupportedError";
	}
};
/**
* Direction-aware refusal text for a stored session whose format version this
* build does not read. Shared by load-time checks and by backends that must
* refuse BEFORE decoding version-dependent structure (a future format may not
* satisfy this build's structural checks at all, and the user must see
* "upgrade the harness", never "corrupt").
* @param id - the stored session id, for message context.
* @param version - the stored format version.
* @returns the stable refusal text, without a raw-log path suffix.
*/
function sessionFormatVersionRefusal(id, version) {
	return version > 3 ? `session "${id}" uses log format v${version}, but this harness reads only v3: the log was written by a newer harness — upgrade the harness to open it` : `session "${id}" uses log format v${version}, older than the supported v3, and this build ships no upgrade path for it`;
}
//#endregion
//#region ../session-persistence/src/storage-contract.ts
/**
* Backend-shared storage validation: the version gate, the fail-closed event
* vocabulary, append-batch materialization, and contiguity — one place so
* every backend refuses the same inputs identically.
* @module @deepseek-ai/dsh-session-persistence/storage-contract
*/
/** Build a format refusal that points at the raw artifact when the backend has one. */
function unsupported(reason, location) {
	return new SessionFormatUnsupportedError(location === void 0 ? reason : `${reason} (raw log: ${location.path})`, location);
}
/**
* Validate one exclusively owned stored event array in place: adopt each
* record (validating and freezing it) and refuse any event type this build
* does not know, unless its writer marked it `ignorable: true` — silently
* skipping an unknown required event could reconstruct a wrong session (the
* envelope contract on `SessionEvent.ignorable`). Unknown required types and
* retired pre-release shapes refuse here; this validator performs no migration.
* @param meta - the stored header the events belong to.
* @param events - exclusively owned decoded events; validated in place.
* @param location - the backend's artifact location for refusals, when one exists.
* @returns the same array, validated and frozen.
* @throws {SessionFormatUnsupportedError} for unknown event types.
* @throws {SessionPersistenceCorruptionError} for records that fail validation.
*/
function validateStoredEvents(meta, events, location) {
	for (const event of events) {
		if (!KNOWN_SESSION_EVENT_TYPES.has(event.type) && event.ignorable !== true) throw unsupported(`session "${meta.id}" contains event type "${event.type}" (seq ${event.seq}) unknown to this harness and not marked ignorable; refusing to interpret the log — it was likely written by a newer harness`, location);
		if (event.type === "request/header") {
			const data = event.data;
			if (typeof data === "object" && data !== null && data["reason"] === "fallback") throw unsupported(`session "${meta.id}" contains a request/header event (seq ${event.seq}) with the unsupported legacy reason "fallback"; refusing to interpret the log — it was written by a retired pre-release harness`, location);
		}
	}
	try {
		for (const [index, event] of events.entries()) events[index] = adoptSessionEvent(event);
	} catch (error) {
		if (error instanceof SessionFormatUnsupportedError) throw error;
		throw new SessionPersistenceCorruptionError(`stored session "${meta.id}" failed validation: ${String(error)}`, { cause: error });
	}
	return events;
}
//#endregion
//#region ../session-format/src/error.ts
/** Error raised when a durable Session artifact cannot be restored or migrated losslessly. */
var SessionFormatError = class extends Error {
	name = "SessionFormatError";
};
/** A readable artifact whose released source policy has no supported migration. */
var SessionFormatUnsupportedMigrationError = class extends SessionFormatError {
	name = "SessionFormatUnsupportedMigrationError";
};
//#endregion
//#region ../session-format/src/json.ts
/**
* Test whether a value is a non-null, non-array object.
* @param value - candidate value.
* @returns whether the value is an object record.
*/
function isSessionFormatJsonObject(value) {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
/**
* Require a non-negative safe integer without the JSON-unstable negative zero.
* @param value - candidate count.
* @param label - diagnostic subject.
* @returns validated count.
*/
function sessionFormatCount(value, label) {
	if (!Number.isSafeInteger(value) || value < 0 || Object.is(value, -0)) throw new SessionFormatError(`${label} must be a non-negative safe integer`);
	return value;
}
/**
* Require a safe integer without the JSON-unstable negative zero.
* @param value - candidate integer.
* @param label - diagnostic subject.
* @returns validated integer.
*/
function sessionFormatSafeInteger(value, label) {
	if (!Number.isSafeInteger(value) || Object.is(value, -0)) throw new SessionFormatError(`${label} must be a safe integer`);
	return value;
}
/**
* Require a non-negative integral format version.
* @param value - candidate version.
* @param label - diagnostic subject.
* @returns validated version.
*/
function sessionFormatVersion(value, label = "Session format version") {
	return sessionFormatCount(value, label);
}
/**
* Read only the version required for directional dispatch.
* @param headerValue - untrusted physical header value.
* @returns validated stored version.
*/
function inspectSessionFormatVersion(headerValue) {
	if (!isSessionFormatJsonObject(headerValue)) throw new SessionFormatError("Session header must be a JSON object");
	return sessionFormatVersion(headerValue["version"]);
}
/**
* Detach and deeply freeze a caller-supplied lossless JSON value.
* @param value - borrowed candidate.
* @param label - diagnostic subject.
* @returns an immutable detached JSON snapshot.
*/
function snapshotSessionFormatJson(value, label = "Session value") {
	const snapshot = snapshotJsonValue(value);
	if (snapshot === void 0) throw new SessionFormatError(`${label} is not lossless JSON`);
	return deepFreeze(snapshot);
}
/**
* Snapshot one logical header without inspecting an event body.
* @param header - borrowed logical header.
* @param label - diagnostic subject.
* @returns immutable detached header.
*/
function snapshotSessionFormatHeader(header, label = "Session header") {
	const snapshot = snapshotSessionFormatJson(header, label);
	if (!isSessionFormatJsonObject(snapshot)) throw new SessionFormatError(`${label} must be a JSON object`);
	inspectSessionFormatVersion(snapshot);
	if (typeof snapshot["id"] !== "string") throw new SessionFormatError(`${label} id must be a string`);
	sessionFormatCount(snapshot["createdAt"], `${label} createdAt`);
	if (typeof snapshot["isSeeded"] !== "boolean") throw new SessionFormatError(`${label} isSeeded must be a boolean`);
	sessionFormatCount(snapshot["delegationDepth"], `${label} delegationDepth`);
	return snapshot;
}
//#endregion
//#region ../session-format/src/chain.ts
/**
* Validate and freeze one adjacent migration declaration.
* @param migration - named exact adjacent conversion.
* @returns immutable validated declaration.
*/
function defineSessionFormatMigration(migration) {
	if (typeof migration.name !== "string" || migration.name.length === 0) throw new SessionFormatError("Session migration name must be a non-empty string");
	const from = sessionFormatVersion(migration.fromVersion, `${migration.name} fromVersion`);
	if (sessionFormatVersion(migration.toVersion, `${migration.name} toVersion`) !== from + 1) throw new SessionFormatError(`${migration.name} must declare adjacent v${from}->v${from + 1}`);
	return Object.freeze({ ...migration });
}
/**
* Compile a unique, complete adjacent migration chain.
* @param options - current version, adjacent declarations, and current restorer.
* @returns immutable planner and streaming migration compiler.
*/
function createSessionFormatChain(options) {
	return new CompiledSessionFormatChain(options);
}
var CompiledSessionFormatChain = class {
	currentVersion;
	migrations;
	restoreCurrentHeader;
	constructor(options) {
		this.currentVersion = sessionFormatVersion(options.currentVersion, "current Session format version");
		this.restoreCurrentHeader = options.restoreCurrentHeader;
		const byFrom = /* @__PURE__ */ new Map();
		const names = /* @__PURE__ */ new Set();
		for (const candidate of options.migrations) {
			const migration = defineSessionFormatMigration(candidate);
			if (byFrom.has(migration.fromVersion)) throw new SessionFormatError(`Session migration v${migration.fromVersion}->v${migration.toVersion} is duplicated`);
			if (names.has(migration.name)) throw new SessionFormatError(`Session migration name ${JSON.stringify(migration.name)} is duplicated`);
			byFrom.set(migration.fromVersion, migration);
			names.add(migration.name);
		}
		const ordered = [];
		for (let version = 0; version < this.currentVersion; version += 1) {
			const migration = byFrom.get(version);
			if (migration === void 0) throw new SessionFormatUnsupportedMigrationError(`Session migration v${version}->v${version + 1} is missing`);
			ordered.push(migration);
		}
		if (byFrom.size !== ordered.length) throw new SessionFormatError(`Session migration from v${[...byFrom.keys()].find((version) => version >= this.currentVersion)} does not lead to current v${this.currentVersion}`);
		this.migrations = Object.freeze(ordered);
	}
	plan(fromVersion) {
		const from = sessionFormatVersion(fromVersion, "stored Session format version");
		if (from > this.currentVersion) throw new SessionFormatUnsupportedMigrationError(`stored Session uses newer format v${from}; this build writes v${this.currentVersion}`);
		return Object.freeze(this.migrations.slice(from));
	}
	createStream(sourceHeader, sourceCut, output) {
		let header = sourceHeader;
		const validatedSourceCut = sourceCut === void 0 ? void 0 : sessionFormatCount(sourceCut, "Session inherited event count");
		let inheritedEventCount = validatedSourceCut;
		const stages = [];
		const plan = this.plan(header.version);
		for (const [index, migration] of plan.entries()) {
			const targetHeader = this.advanceHeader(migration, header);
			let stage;
			try {
				stage = migration.createStage({
					sourceHeader: header,
					targetHeader,
					sourceInheritedEventCount: inheritedEventCount,
					sourceKind: index === 0 ? "decoded" : "transformed"
				});
			} catch (error) {
				throwUnsupportedRefusal(migration, error);
			}
			header = targetHeader;
			stages.push({
				migration,
				stage
			});
			inheritedEventCount = stage.headerInheritedEventCount;
		}
		return new CompiledSessionFormatMigrationStream(header, validatedSourceCut, stages, output);
	}
	migrateHeader(source) {
		let current = snapshotSessionFormatHeader(source, "stored Session header");
		for (const migration of this.plan(current.version)) current = this.advanceHeader(migration, current);
		current = snapshotSessionFormatHeader(this.restoreCurrentHeader(current), "current Session header restoration");
		if (current.version !== this.currentVersion) throw new SessionFormatError(`current Session header restorer returned v${current.version}; expected v${this.currentVersion}`);
		return current;
	}
	advanceHeader(migration, source) {
		let target;
		try {
			target = migration.migrateHeader(snapshotSessionFormatHeader(source, `${migration.name} header input`));
		} catch (error) {
			throwUnsupportedRefusal(migration, error, "Session header");
		}
		const current = snapshotSessionFormatHeader(target, `${migration.name} header output`);
		if (current.version !== migration.toVersion) throw new SessionFormatError(`${migration.name} header returned v${current.version}; expected v${migration.toVersion}`);
		try {
			migration.validateTargetHeader(current);
		} catch (error) {
			throwUnsupportedRefusal(migration, error, "Session header");
		}
		return current;
	}
};
var ChainedMigrationContext = class {
	entry;
	output;
	constructor(entry, output) {
		this.entry = entry;
		this.output = output;
	}
	emitEvent(event) {
		try {
			this.entry.stage.transformEvent(event, this.output);
		} catch (error) {
			throwUnsupportedRefusal(this.entry.migration, error);
		}
	}
	emitRun(run) {
		try {
			this.entry.stage.transformRun(run, this.output);
		} catch (error) {
			throwUnsupportedRefusal(this.entry.migration, error);
		}
	}
	finish() {
		let targetCut;
		try {
			targetCut = this.entry.stage.finish(this.output);
		} catch (error) {
			throwUnsupportedRefusal(this.entry.migration, error);
		}
		if (this.entry.stage.headerInheritedEventCount !== void 0 && this.entry.stage.headerInheritedEventCount !== targetCut) throw new SessionFormatError(`${this.entry.migration.name} changed its predeclared inherited cut`);
		return targetCut;
	}
};
var CompiledSessionFormatMigrationStream = class {
	header;
	sourceInheritedEventCount;
	input;
	stages;
	constructor(header, sourceInheritedEventCount, entries, output) {
		this.header = header;
		this.sourceInheritedEventCount = sourceInheritedEventCount;
		const stages = new Array(entries.length);
		let downstream = output;
		for (const [offset, entry] of entries.toReversed().entries()) {
			const context = new ChainedMigrationContext(entry, downstream);
			stages[entries.length - offset - 1] = context;
			downstream = context;
		}
		this.input = downstream;
		this.stages = stages;
	}
	emitEvent(event) {
		this.input.emitEvent(event);
	}
	emitRun(run) {
		this.input.emitRun(run);
	}
	finish() {
		let inheritedEventCount = this.sourceInheritedEventCount;
		for (const stage of this.stages) inheritedEventCount = stage.finish();
		return sessionFormatCount(inheritedEventCount, "finished Session inherited event count");
	}
};
function throwUnsupportedRefusal(migration, error, subject = "Session") {
	if (error instanceof SessionFormatUnsupportedMigrationError) throw error;
	const detail = error instanceof Error ? error.message : String(error);
	throw new SessionFormatUnsupportedMigrationError(`${migration.name} refuses this format v${migration.fromVersion} ${subject}: ${detail}`, { cause: error });
}
//#endregion
//#region ../session-format/src/context.ts
/** Migration output context that expands compact runs into retained events. */
var SessionFormatEventCollector = class {
	/** Events retained by this collector in source order. */
	values = [];
	/**
	* Retain one settled event.
	* @param event - settled event emitted by the upstream stage.
	*/
	emitEvent(event) {
		this.values.push(event);
	}
	/**
	* Expand one compact run directly into retained events.
	* @param run - compact event run emitted by the upstream stage.
	*/
	emitRun(run) {
		for (const event of run.expand()) this.values.push(event);
	}
};
//#endregion
//#region ../session-format/src/catalog.ts
/**
* Compile a build-static physical codec and adjacent migration catalog.
* @param options - complete codecs, migrations, current version, and restorer.
* @returns immutable physical dispatch and migration operations.
*/
function createSessionFormatCatalog(options) {
	const chain = createSessionFormatChain(options);
	const codecs = /* @__PURE__ */ new Map();
	for (const codec of options.codecs) {
		const version = sessionFormatVersion(codec.version, "Session format codec version");
		if (codecs.has(version)) throw new SessionFormatError(`Session format codec v${version} is duplicated`);
		codecs.set(version, Object.freeze({ ...codec }));
	}
	for (let version = 0; version <= chain.currentVersion; version += 1) if (!codecs.has(version)) throw new SessionFormatError(`Session format codec v${version} is missing`);
	if (codecs.size !== chain.currentVersion + 1) throw new SessionFormatError(`Session format codec v${[...codecs.keys()].find((version) => version > chain.currentVersion)} is newer than current v${chain.currentVersion}`);
	function readHeader(headerValue) {
		let storedVersion;
		try {
			storedVersion = inspectSessionFormatVersion(headerValue);
		} catch (error) {
			return malformed(chain.currentVersion, error);
		}
		if (storedVersion > chain.currentVersion) return Object.freeze({
			status: "unsupported",
			storedVersion,
			targetVersion: chain.currentVersion,
			reason: `stored Session uses newer format v${storedVersion}; this build writes v${chain.currentVersion}`
		});
		const codec = codecs.get(storedVersion);
		/* v8 ignore next -- construction proves every supported version has exactly one codec. */
		if (codec === void 0) return Object.freeze({
			status: "unsupported",
			storedVersion,
			targetVersion: chain.currentVersion,
			reason: `this build has no Session format codec for v${storedVersion}`
		});
		try {
			const decoded = snapshotSessionFormatHeader(codec.decodeHeader(headerValue), `format v${storedVersion} header`);
			const header = chain.migrateHeader(decoded);
			return Object.freeze({
				status: storedVersion === chain.currentVersion ? "current" : "migration-required",
				storedVersion,
				targetVersion: chain.currentVersion,
				header
			});
		} catch (error) {
			if (error instanceof SessionFormatUnsupportedMigrationError) return Object.freeze({
				status: "unsupported",
				storedVersion,
				targetVersion: chain.currentVersion,
				reason: error.message
			});
			return malformed(chain.currentVersion, error, storedVersion);
		}
	}
	function artifactCodec(headerValue) {
		const storedVersion = inspectSessionFormatVersion(headerValue);
		if (storedVersion > chain.currentVersion) throw new SessionFormatUnsupportedMigrationError(`stored Session uses newer format v${storedVersion}; this build writes v${chain.currentVersion}`);
		const codec = codecs.get(storedVersion);
		/* v8 ignore next -- construction proves every supported version has exactly one codec. */
		if (codec === void 0) throw new SessionFormatUnsupportedMigrationError(`this build has no Session format codec for v${storedVersion}`);
		return {
			storedVersion,
			codec
		};
	}
	function encodeCurrentHeader(header, inheritedEventCount) {
		if (inspectSessionFormatVersion(header) !== chain.currentVersion) throw new SessionFormatError(`encodeCurrent requires Session format v${chain.currentVersion}`);
		const encoded = options.currentEncoder.encodeHeader(header, inheritedEventCount);
		if (inspectSessionFormatVersion(encoded) !== chain.currentVersion) throw new SessionFormatError("current Session codec returned a non-current header");
		return encoded;
	}
	function createRestore(headerValue, restoreOptions) {
		const { storedVersion, codec } = artifactCodec(headerValue);
		const decoder = codec.createDecoder(headerValue, restoreOptions.recovery);
		const sourceCut = decoder.headerInheritedEventCount;
		if (storedVersion === chain.currentVersion) return new CurrentSessionFormatRestore(decoder, sourceCut, restoreOptions.validation === "current" ? options.restoreCurrent : identityArtifact, chain.currentVersion);
		const collector = new SessionFormatEventCollector();
		return new MigratingSessionFormatRestore(decoder, sourceCut, chain.createStream(decoder.header, sourceCut, collector), collector, restoreOptions.validation === "current" ? options.restoreCurrent : options.restoreTransformedCurrent, restoreOptions.validation, storedVersion, chain.currentVersion);
	}
	return Object.freeze({
		currentVersion: chain.currentVersion,
		readHeader,
		createRestore,
		encodeCurrentHeader,
		encodeCurrentEvent: options.currentEncoder.encodeEvent.bind(options.currentEncoder)
	});
}
var CurrentSessionFormatRestore = class {
	decoder;
	sourceInheritedEventCount;
	restoreArtifact;
	currentVersion;
	header;
	collector = new SessionFormatEventCollector();
	constructor(decoder, sourceInheritedEventCount, restoreArtifact, currentVersion) {
		this.decoder = decoder;
		this.sourceInheritedEventCount = sourceInheritedEventCount;
		this.restoreArtifact = restoreArtifact;
		this.currentVersion = currentVersion;
		this.header = decoder.header;
	}
	decodeRow(rowValue) {
		this.decoder.decodeRow(rowValue, this.collector);
	}
	finish() {
		const inheritedEventCount = finishDecoder(this.decoder, this.collector, this.sourceInheritedEventCount);
		return restoreCurrentVersion(this.restoreArtifact({
			header: this.header,
			inheritedEventCount,
			events: this.collector.values
		}), this.currentVersion);
	}
};
var MigratingSessionFormatRestore = class {
	decoder;
	sourceInheritedEventCount;
	migration;
	collector;
	restoreArtifact;
	validation;
	sourceVersion;
	currentVersion;
	header;
	constructor(decoder, sourceInheritedEventCount, migration, collector, restoreArtifact, validation, sourceVersion, currentVersion) {
		this.decoder = decoder;
		this.sourceInheritedEventCount = sourceInheritedEventCount;
		this.migration = migration;
		this.collector = collector;
		this.restoreArtifact = restoreArtifact;
		this.validation = validation;
		this.sourceVersion = sourceVersion;
		this.currentVersion = currentVersion;
		this.header = migration.header;
	}
	decodeRow(rowValue) {
		this.decoder.decodeRow(rowValue, this);
	}
	emitEvent(event) {
		this.migration.emitEvent(event);
	}
	emitRun(run) {
		this.migration.emitRun(run);
	}
	finish() {
		finishDecoder(this.decoder, this, this.sourceInheritedEventCount);
		const artifact = {
			header: this.header,
			inheritedEventCount: this.migration.finish(),
			events: this.collector.values
		};
		let restored;
		try {
			restored = this.restoreArtifact(artifact);
		} catch (error) {
			if (this.validation === "current" || error instanceof SessionFormatUnsupportedMigrationError) throw error;
			const detail = error instanceof Error ? error.message : String(error);
			throw new SessionFormatUnsupportedMigrationError(`Session migration from v${this.sourceVersion} to v${this.currentVersion} refuses the transformed artifact: ${detail}`, { cause: error });
		}
		return restoreCurrentVersion(restored, this.currentVersion);
	}
};
function finishDecoder(decoder, context, sourceInheritedEventCount) {
	const inheritedEventCount = decoder.finish(context);
	if (sourceInheritedEventCount !== void 0 && inheritedEventCount !== sourceInheritedEventCount) throw new SessionFormatError("streaming decoder changed its predeclared inherited cut");
	return inheritedEventCount;
}
function restoreCurrentVersion(artifact, currentVersion) {
	if (artifact.header.version !== currentVersion) throw new SessionFormatError(`current Session restorer returned v${artifact.header.version}; expected v${currentVersion}`);
	return artifact;
}
function identityArtifact(artifact) {
	return artifact;
}
function malformed(targetVersion, error, storedVersion) {
	return Object.freeze({
		status: "malformed",
		...storedVersion === void 0 ? {} : { storedVersion },
		targetVersion,
		reason: error instanceof Error ? error.message : String(error)
	});
}
//#endregion
//#region ../session-format/src/filename.ts
/** Canonical raw log basename shared by every generation-addressed Session artifact. */
/**
* Name the raw JSONL log of one immutable Session format generation. Version
* zero keeps the original `session.jsonl`; every later generation carries a
* lowercase numeric `.vN` component before the `.jsonl` suffix.
* @param version - non-negative safe integer Session format version.
* @returns the canonical basename, without any compression suffix.
*/
function sessionFormatLogFilename(version) {
	const generation = sessionFormatVersion(version, "Session log generation version");
	return generation === 0 ? "session.jsonl" : `session.v${generation}.jsonl`;
}
//#endregion
//#region ../session-format-catalog/src/current.ts
/** Current installed Session validation used after vocabulary-aware format restoration. */
/**
* Validate current logical metadata through the installed Session package.
* @param header - detached current logical header.
* @returns nothing after successful validation.
*/
function validateInstalledCurrentSessionHeader(header) {
	if (header.version !== 3) throw new Error(`installed Session format is v3, got v${header.version}`);
	Session.fromRestore(SessionId(header.id), [], header, SessionLogOffset(0), "detached");
}
/**
* Validate current header, event envelopes, messages, surface operations, and seed cut through the installed Session package.
* @param artifact - vocabulary-restored current logical artifact.
* @returns nothing after successful validation.
*/
function validateInstalledCurrentSessionArtifact(artifact) {
	if (artifact.header.version !== 3) throw new Error(`installed Session format is v3, got v${artifact.header.version}`);
	Session.fromRestore(SessionId(artifact.header.id), artifact.events, artifact.header, SessionLogOffset(artifact.inheritedEventCount), "detached");
}
//#endregion
//#region ../session-format-v0-to-v1/src/dispositions.ts
/**
* Freeze one exact released payload-member disposition for adjacent format validators.
* @param required - members that must be present.
* @param optional - additional admitted members.
* @param opaque - members retained as lossless JSON without nested semantic inspection.
* @returns the detached frozen disposition.
*/
function defineReleasedPayloadDisposition(required, optional = [], opaque = []) {
	return Object.freeze({
		required: Object.freeze([...required]),
		optional: Object.freeze([...optional]),
		opaque: Object.freeze([...opaque])
	});
}
const disposition = defineReleasedPayloadDisposition;
/**
* Frozen released-v0 event and payload-member inventory.
* Every listed member is preserved by the identity edge. Members in `opaque`
* remain lossless JSON without nested Session-sequence interpretation. Nested
* merge-extensible discriminants validate known variants and preserve
* unknown variants as owner-opaque JSON.
*/
const RELEASED_V0_EVENT_DISPOSITIONS = Object.freeze({
	"agent-preset/selected": disposition(["agentPreset"]),
	"agent/inbox/spliced": disposition([
		"target",
		"start",
		"inserted"
	], ["removedCount", "outcome"]),
	"approval/asked": disposition(["id", "toolName"], ["callId", "reason"]),
	"approval/decided": disposition(["id", "outcome"]),
	"approval/policy": disposition(["policy"], ["source"]),
	"assistant/chunk": disposition([
		"turn",
		"step",
		"chunk"
	]),
	"assistant/message": disposition([
		"turn",
		"step",
		"message"
	], ["usage", "interrupted"]),
	"command/done": disposition(["commandId", "kind"], ["text", "sourceEventSeq"]),
	"command/run": disposition([
		"commandId",
		"name",
		"source"
	], ["args"]),
	"compaction/end": disposition(["compactionId", "turn"], ["sourceCommandId", "error"]),
	"compaction/prune": disposition([
		"shadowedRange",
		"shadowedSeqs",
		"shadowedTokenCount"
	]),
	"compaction/start": disposition(["compactionId", "turn"], ["sourceCommandId"]),
	"compaction/summary": disposition([
		"compactionId",
		"summary",
		"shadowedRange",
		"shadowedSeqs",
		"shadowedTokenCount",
		"provider",
		"model"
	], [
		"sourceCommandId",
		"maxTokens",
		"usage",
		"rawOutput",
		"llmStreamCall"
	]),
	"feedback/record": disposition(["text"]),
	"goal/change": disposition([
		"kind",
		"version",
		"operation"
	], [
		"goal",
		"roundsStarted",
		"createdAt",
		"updatedAt",
		"cleared",
		"clearedAt"
	]),
	"hook/invoked": disposition([
		"turn",
		"point",
		"dialect",
		"handlerId"
	], ["matcher"]),
	"hook/result": disposition([
		"turn",
		"point",
		"handlerId",
		"decision",
		"durationMs"
	], ["exitCode", "stderrSummary"]),
	"llm/retry": disposition([
		"retryId",
		"turn",
		"step",
		"provider",
		"mode",
		"policyKey",
		"retry",
		"delayMs",
		"failure"
	], ["maxRetries"]),
	"llm/retry-started": disposition([
		"retryId",
		"turn",
		"step",
		"retry"
	]),
	"model/selection": disposition(["provider", "model"], ["reasoningEffort"]),
	"permission/preset": disposition(["preset"]),
	"plan/mode": disposition(["active"]),
	"request/context": disposition(["provider", "model"], ["contextWindow"]),
	"request/header": disposition(["header", "reason"], ["startsSeries"]),
	"sandbox/mode": disposition(["mode"], ["source"]),
	"schedule/change": disposition(["version", "operation"], [
		"schedule",
		"id",
		"acceptedAt"
	]),
	"session-log-deepseek/delivery-accepted": disposition(["sessionId", "throughSeq"]),
	"session/end-seed": disposition([]),
	"session/title": disposition([
		"title",
		"messageSeqs",
		"source"
	]),
	"session/title-llm-request": disposition([
		"titleProvider",
		"messageSeqs",
		"route",
		"system",
		"messages",
		"maxTokens"
	]),
	"step/end": disposition(["turn", "step"]),
	"step/start": disposition(["turn", "step"]),
	"subagent/descriptor": disposition([
		"mode",
		"version",
		"provider"
	], [
		"label",
		"agentProvider",
		"agentModel",
		"agentReasoningEffort",
		"persona",
		"toolFilter"
	]),
	"subagent/model-selection-policy": disposition(["allowedModels"]),
	"team/member": disposition([
		"version",
		"teamId",
		"member"
	]),
	"team/message/delivered": disposition([
		"version",
		"teamId",
		"messageId",
		"targetId"
	]),
	"team/message/queued": disposition([
		"version",
		"teamId",
		"message"
	]),
	"team/task": disposition([
		"version",
		"teamId",
		"task"
	]),
	"todo/write": disposition(["todos"]),
	"tool-workflow/agent-end": disposition([
		"runId",
		"seq",
		"outcome"
	]),
	"tool-workflow/agent-start": disposition([
		"runId",
		"seq",
		"label",
		"childId"
	], ["phase"]),
	"tool-workflow/run-end": disposition(["runId", "stopReason"]),
	"tool-workflow/run-start": disposition(["runId", "name"]),
	"tool/call": disposition([
		"turn",
		"step",
		"callId",
		"name",
		"arguments"
	]),
	"tool/code-dispatch": disposition([
		"rootCallId",
		"parentCallId",
		"subCallId",
		"name",
		"arguments",
		"isError",
		"content"
	], [], ["arguments"]),
	"tool/code-dispatch-start": disposition([
		"rootCallId",
		"parentCallId",
		"subCallId",
		"name",
		"arguments"
	], [], ["arguments"]),
	"tool/result": disposition([
		"turn",
		"step",
		"message"
	], ["error", "meta"], ["meta"]),
	"turn/end": disposition(["turn", "reason"]),
	"turn/start": disposition(["turn"]),
	"user/message": disposition([
		"role",
		"id",
		"content",
		"source"
	]),
	"web/deepseek-search-llm-request": disposition([
		"endpoint",
		"apiVersion",
		"body"
	])
});
Object.freeze(Object.keys(RELEASED_V0_EVENT_DISPOSITIONS).sort((left, right) => left.localeCompare(right, "en")));
//#endregion
//#region ../session-format-v0-to-v1/src/validation-helpers.ts
/**
* Require one plain JSON object.
* @param value - candidate JSON value.
* @param label - diagnostic subject.
* @returns validated object record.
*/
function releasedV0Record(value, label) {
	if (!isSessionFormatJsonObject(value)) throw new SessionFormatError(`${label} must be a JSON object`);
	return value;
}
/**
* Require every named member and no member outside the optional list.
* @param record - candidate object.
* @param required - members that must exist.
* @param optional - additional admitted members.
* @param label - diagnostic subject.
*/
function assertReleasedV0Keys(record, required, optional = [], label) {
	const allowed = new Set([...required, ...optional]);
	const unexpected = Object.keys(record).find((key) => !allowed.has(key));
	if (unexpected !== void 0) throw new SessionFormatError(`${label} has unexpected member ${JSON.stringify(unexpected)}`);
	const missing = required.find((key) => !Object.hasOwn(record, key));
	if (missing !== void 0) throw new SessionFormatError(`${label} lacks required member ${JSON.stringify(missing)}`);
}
//#endregion
//#region ../session-format-v0-to-v1/src/payload-validation.ts
/**
* Validate nested released payload semantics for one known event.
* @param event - known event with exact top-level members.
* @param version - source or current payload generation.
*/
function assertReleasedPayloadSemantics(event, version) {
	const data = releasedV0Record(event.data, `${event.type} ${event.seq} data`);
	const label = `${event.type} ${event.seq}`;
	switch (event.type) {
		case "agent-preset/selected":
			stringValue(data["agentPreset"], `${label} agentPreset`);
			return;
		case "agent/inbox/spliced":
			literalValue(data["target"], ["next-turn", "next-step"], `${label} target`);
			countValue(data["start"], `${label} start`);
			if (data["removedCount"] !== void 0) countValue(data["removedCount"], `${label} removedCount`);
			arrayValue(data["inserted"], `${label} inserted`, (value) => {
				messageValue(value, `${label} inserted message`, version, "user");
			});
			if (data["outcome"] !== void 0) literalValue(data["outcome"], ["canceled"], `${label} outcome`);
			return;
		case "approval/asked":
			nonEmptyString(data["id"], `${label} id`);
			nonEmptyString(data["toolName"], `${label} toolName`);
			if (data["callId"] !== void 0) nonEmptyString(data["callId"], `${label} callId`);
			if (data["reason"] !== void 0) stringValue(data["reason"], `${label} reason`);
			return;
		case "approval/decided":
			nonEmptyString(data["id"], `${label} id`);
			literalValue(data["outcome"], [
				"allowed-once",
				"rejected",
				"cancelled",
				"unavailable"
			], `${label} outcome`);
			return;
		case "approval/policy":
			literalValue(data["policy"], ["ask", "never"], `${label} policy`);
			if (data["source"] !== void 0) literalValue(data["source"], ["delegation"], `${label} source`);
			return;
		case "assistant/chunk":
			coordinatePair(data, label);
			streamChunkValue(data["chunk"], `${label} chunk`);
			return;
		case "assistant/message":
			coordinatePair(data, label);
			messageValue(data["message"], `${label} message`, version, "assistant");
			if (data["usage"] !== void 0) tokenUsageValue(data["usage"], `${label} usage`);
			if (data["interrupted"] !== void 0) literalValue(data["interrupted"], [true], `${label} interrupted`);
			return;
		case "command/done":
			nonEmptyString(data["commandId"], `${label} commandId`);
			literalValue(data["kind"], ["success", "error"], `${label} kind`);
			if (data["text"] !== void 0) stringValue(data["text"], `${label} text`);
			if (data["sourceEventSeq"] !== void 0) earlierSeq(data["sourceEventSeq"], event.seq, `${label} sourceEventSeq`);
			return;
		case "command/run":
			nonEmptyString(data["commandId"], `${label} commandId`);
			nonEmptyString(data["name"], `${label} name`);
			if (data["args"] !== void 0) stringValue(data["args"], `${label} args`);
			literalValue(exactRecord(data["source"], `${label} source`, ["kind"])["kind"], ["user"], `${label} source kind`);
			return;
		case "compaction/start":
		case "compaction/end":
			nonEmptyString(data["compactionId"], `${label} compactionId`);
			if (data["sourceCommandId"] !== void 0) nonEmptyString(data["sourceCommandId"], `${label} sourceCommandId`);
			nullableValue(data["turn"], `${label} turn`, countValue);
			if (data["error"] !== void 0) stringValue(data["error"], `${label} error`);
			return;
		case "compaction/prune":
			shadowedValue(data, event.seq, label);
			return;
		case "compaction/summary":
			if (data["llmStreamCall"] === true && data["rawOutput"] === void 0) throw new SessionFormatError(`${label} llmStreamCall requires rawOutput`);
			nonEmptyString(data["compactionId"], `${label} compactionId`);
			if (data["sourceCommandId"] !== void 0) nonEmptyString(data["sourceCommandId"], `${label} sourceCommandId`);
			contentBlocksValue(data["summary"], `${label} summary`, version);
			shadowedValue(data, event.seq, label);
			nonEmptyString(data["provider"], `${label} provider`);
			nonEmptyString(data["model"], `${label} model`);
			if (data["maxTokens"] !== void 0) countValue(data["maxTokens"], `${label} maxTokens`);
			if (data["usage"] !== void 0) tokenUsageValue(data["usage"], `${label} usage`);
			if (data["rawOutput"] !== void 0) contentBlocksValue(data["rawOutput"], `${label} rawOutput`, version);
			if (data["llmStreamCall"] !== void 0) literalValue(data["llmStreamCall"], [true], `${label} llmStreamCall`);
			return;
		case "feedback/record":
			nonEmptyString(data["text"], `${label} text`);
			return;
		case "goal/change":
			goalChangeValue(data, label);
			return;
		case "hook/invoked":
			countValue(data["turn"], `${label} turn`);
			nonEmptyString(data["point"], `${label} point`);
			literalValue(data["dialect"], ["claude-code", "codex"], `${label} dialect`);
			if (data["matcher"] !== void 0) stringValue(data["matcher"], `${label} matcher`);
			nonEmptyString(data["handlerId"], `${label} handlerId`);
			return;
		case "hook/result":
			countValue(data["turn"], `${label} turn`);
			nonEmptyString(data["point"], `${label} point`);
			nonEmptyString(data["handlerId"], `${label} handlerId`);
			nonEmptyString(data["decision"], `${label} decision`);
			if (data["exitCode"] !== void 0) safeIntegerValue(data["exitCode"], `${label} exitCode`);
			if (data["stderrSummary"] !== void 0) stringValue(data["stderrSummary"], `${label} stderrSummary`);
			if (finiteNumberValue(data["durationMs"], `${label} durationMs`) < 0) throw new SessionFormatError(`${label} durationMs must be non-negative`);
			return;
		case "llm/retry":
			nonEmptyString(data["retryId"], `${label} retryId`);
			coordinatePair(data, label);
			nonEmptyString(data["provider"], `${label} provider`);
			literalValue(data["mode"], ["normal", "always"], `${label} mode`);
			nonEmptyString(data["policyKey"], `${label} policyKey`);
			positiveIntegerValue(data["retry"], `${label} retry`);
			if (data["mode"] === "normal") {
				const maxRetries = positiveIntegerValue(data["maxRetries"], `${label} maxRetries`);
				if (data["retry"] > maxRetries) throw new SessionFormatError(`${label} retry exceeds maxRetries`);
			} else if (data["maxRetries"] !== void 0) throw new SessionFormatError(`${label} always mode must omit maxRetries`);
			const delayMs = finiteNumberValue(data["delayMs"], `${label} delayMs`);
			if (delayMs < 0) throw new SessionFormatError(`${label} delayMs must be non-negative`);
			if (delayMs > 2147483647) throw new SessionFormatError(`${label} delayMs exceeds the timer range`);
			llmFailureValue(data["failure"], `${label} failure`);
			return;
		case "llm/retry-started":
			nonEmptyString(data["retryId"], `${label} retryId`);
			coordinatePair(data, label);
			positiveIntegerValue(data["retry"], `${label} retry`);
			return;
		case "model/selection":
			nonEmptyString(data["provider"], `${label} provider`);
			nonEmptyString(data["model"], `${label} model`);
			if (data["reasoningEffort"] !== void 0) nonEmptyString(data["reasoningEffort"], `${label} reasoningEffort`);
			return;
		case "permission/preset":
			nonEmptyString(data["preset"], `${label} preset`);
			return;
		case "plan/mode":
			booleanValue(data["active"], `${label} active`);
			return;
		case "request/context":
			nonEmptyString(data["provider"], `${label} provider`);
			nonEmptyString(data["model"], `${label} model`);
			if (data["contextWindow"] !== void 0) positiveIntegerValue(data["contextWindow"], `${label} contextWindow`);
			return;
		case "request/header":
			requestHeaderValue(data["header"], `${label} header`);
			literalValue(data["reason"], [
				"initial",
				"resume",
				"change",
				"series"
			], `${label} reason`);
			if (data["startsSeries"] !== void 0) literalValue(data["startsSeries"], [true], `${label} startsSeries`);
			return;
		case "sandbox/mode":
			literalValue(data["mode"], [
				"read-only",
				"workspace-write",
				"danger-full-access"
			], `${label} mode`);
			if (data["source"] !== void 0) literalValue(data["source"], ["delegation"], `${label} source`);
			return;
		case "schedule/change":
			scheduleChangeValue(data, label);
			return;
		case "session-log-deepseek/delivery-accepted":
			if ((data["sessionFormatVersion"] === void 0 ? 0 : countValue(data["sessionFormatVersion"], `${label} sessionFormatVersion`)) !== version) return;
			nonEmptyString(data["sessionId"], `${label} sessionId`);
			earlierSeq(data["throughSeq"], event.seq, `${label} throughSeq`);
			return;
		case "session/end-seed": return;
		case "session/title":
			nonEmptyString(data["title"], `${label} title`);
			seqArray(data["messageSeqs"], event.seq, `${label} messageSeqs`, false);
			titleSourceValue(data["source"], `${label} source`);
			return;
		case "session/title-llm-request":
			nonEmptyString(data["titleProvider"], `${label} titleProvider`);
			seqArray(data["messageSeqs"], event.seq, `${label} messageSeqs`, true);
			modelRouteValue(data["route"], `${label} route`);
			stringValue(data["system"], `${label} system`);
			arrayValue(data["messages"], `${label} messages`, (value) => {
				messageValue(value, `${label} message`, version);
			});
			positiveIntegerValue(data["maxTokens"], `${label} maxTokens`);
			return;
		case "step/end":
		case "step/start":
			coordinatePair(data, label);
			return;
		case "subagent/descriptor":
			subagentDescriptorValue(data, label);
			return;
		case "subagent/model-selection-policy":
			allowedModelsValue(data["allowedModels"], `${label} allowedModels`);
			return;
		case "team/member":
			teamSelector(data, label);
			teamMemberValue(data["member"], `${label} member`);
			return;
		case "team/message/delivered":
			teamSelector(data, label);
			nonEmptyString(data["messageId"], `${label} messageId`);
			nonEmptyString(data["targetId"], `${label} targetId`);
			return;
		case "team/message/queued":
			teamSelector(data, label);
			teamMessageValue(data["message"], `${label} message`, version);
			return;
		case "team/task":
			teamSelector(data, label);
			teamTaskValue(data["task"], `${label} task`);
			return;
		case "todo/write":
			arrayValue(data["todos"], `${label} todos`, (value, itemLabel) => {
				const item = exactRecord(value, itemLabel, ["content", "status"]);
				stringValue(item["content"], `${itemLabel} content`);
				literalValue(item["status"], [
					"pending",
					"in_progress",
					"completed"
				], `${itemLabel} status`);
			});
			return;
		case "tool-workflow/agent-end":
			workflowIdentity(data, label);
			literalValue(data["outcome"], [
				"completed",
				"failed",
				"cancelled"
			], `${label} outcome`);
			return;
		case "tool-workflow/agent-start":
			workflowIdentity(data, label);
			stringValue(data["label"], `${label} label`);
			if (data["phase"] !== void 0) stringValue(data["phase"], `${label} phase`);
			nonEmptyString(data["childId"], `${label} childId`);
			return;
		case "tool-workflow/run-end":
			nonEmptyString(data["runId"], `${label} runId`);
			literalValue(data["stopReason"], [
				"completed",
				"cancelled",
				"error"
			], `${label} stopReason`);
			return;
		case "tool-workflow/run-start":
			nonEmptyString(data["runId"], `${label} runId`);
			nonEmptyString(data["name"], `${label} name`);
			return;
		case "tool/call":
			coordinatePair(data, label);
			nonEmptyString(data["callId"], `${label} callId`);
			nonEmptyString(data["name"], `${label} name`);
			stringValue(data["arguments"], `${label} arguments`);
			return;
		case "tool/code-dispatch":
		case "tool/code-dispatch-start":
			nonEmptyString(data["rootCallId"], `${label} rootCallId`);
			nonEmptyString(data["parentCallId"], `${label} parentCallId`);
			nonEmptyString(data["subCallId"], `${label} subCallId`);
			nonEmptyString(data["name"], `${label} name`);
			if (event.type === "tool/code-dispatch") {
				booleanValue(data["isError"], `${label} isError`);
				contentBlocksValue(data["content"], `${label} content`, version);
			}
			return;
		case "tool/result":
			coordinatePair(data, label);
			messageValue(data["message"], `${label} message`, version, "tool");
			if (data["error"] !== void 0) {
				const error = exactRecord(data["error"], `${label} error`, ["name", "code"]);
				nonEmptyString(error["name"], `${label} error name`);
				nonEmptyString(error["code"], `${label} error code`);
			}
			return;
		case "turn/end":
			countValue(data["turn"], `${label} turn`);
			turnEndReasonValue(data["reason"], `${label} reason`);
			return;
		case "turn/start":
			countValue(data["turn"], `${label} turn`);
			return;
		case "user/message":
			messageValue(data, label, version, "user");
			return;
		case "web/deepseek-search-llm-request":
			nonEmptyString(data["endpoint"], `${label} endpoint`);
			nonEmptyString(data["apiVersion"], `${label} apiVersion`);
			deepSeekSearchBodyValue(data["body"], `${label} body`);
			return;
		/* v8 ignore next -- the frozen disposition rejects unknown types before semantic dispatch. */
		default: throw new SessionFormatError(`released payload validator is missing event ${JSON.stringify(event.type)}`);
	}
}
function exactRecord(value, label, required, optional = []) {
	const record = releasedV0Record(value, label);
	assertReleasedV0Keys(record, required, optional, label);
	return record;
}
function stringValue(value, label) {
	if (typeof value !== "string") throw new SessionFormatError(`${label} must be a string`);
}
function nonEmptyString(value, label) {
	if (typeof value !== "string" || value.length === 0) throw new SessionFormatError(`${label} must be a non-empty string`);
}
function booleanValue(value, label) {
	if (typeof value !== "boolean") throw new SessionFormatError(`${label} must be a boolean`);
}
function safeIntegerValue(value, label) {
	return sessionFormatSafeInteger(value, label);
}
function countValue(value, label) {
	return sessionFormatCount(value, label);
}
function positiveIntegerValue(value, label) {
	const result = countValue(value, label);
	if (result === 0) throw new SessionFormatError(`${label} must be positive`);
	return result;
}
function finiteNumberValue(value, label) {
	if (typeof value !== "number" || !Number.isFinite(value) || Object.is(value, -0)) throw new SessionFormatError(`${label} must be a finite number`);
	return value;
}
function literalValue(value, allowed, label) {
	if (!allowed.some((candidate) => candidate === value)) throw new SessionFormatError(`${label} must be one of ${allowed.map(String).join(", ")}`);
}
function nullableValue(value, label, validate) {
	if (value !== null) validate(value, label);
}
function arrayValue(value, label, validate) {
	if (!Array.isArray(value)) throw new SessionFormatError(`${label} must be an array`);
	const members = value;
	members.forEach((member, index) => {
		validate(member, `${label}[${index}]`);
	});
	return members;
}
function coordinatePair(data, label) {
	countValue(data["turn"], `${label} turn`);
	countValue(data["step"], `${label} step`);
}
function earlierSeq(value, eventSeq, label) {
	const seq = countValue(value, label);
	if (seq >= eventSeq) throw new SessionFormatError(`${label} must identify an earlier event`);
	return seq;
}
function seqArray(value, eventSeq, label, requireNonEmpty) {
	const seen = /* @__PURE__ */ new Set();
	const values = arrayValue(value, label, (member, memberLabel) => {
		const seq = earlierSeq(member, eventSeq, memberLabel);
		if (seen.has(seq)) throw new SessionFormatError(`${label} repeats seq ${seq}`);
		seen.add(seq);
	});
	if (requireNonEmpty && values.length === 0) throw new SessionFormatError(`${label} must be non-empty`);
	return values;
}
function llmFailureValue(value, label) {
	const failure = exactRecord(value, label, ["message", "code"], [
		"status",
		"providerRetryAfterMs",
		"requestId"
	]);
	nonEmptyString(failure["message"], `${label} message`);
	nonEmptyString(failure["code"], `${label} code`);
	if (failure["status"] !== void 0) {
		const status = safeIntegerValue(failure["status"], `${label} status`);
		if (status < 100 || status > 599) throw new SessionFormatError(`${label} status must be 100 through 599`);
	}
	if (failure["providerRetryAfterMs"] !== void 0 && finiteNumberValue(failure["providerRetryAfterMs"], `${label} providerRetryAfterMs`) <= 0) throw new SessionFormatError(`${label} providerRetryAfterMs must be positive`);
	if (failure["requestId"] !== void 0) nonEmptyString(failure["requestId"], `${label} requestId`);
}
function tokenUsageValue(value, label) {
	const usage = exactRecord(value, label, ["inputTokens", "outputTokens"], [
		"totalTokens",
		"cacheReadTokens",
		"cacheWriteTokens",
		"reasoningTokens"
	]);
	for (const key of Object.keys(usage)) countValue(usage[key], `${label} ${key}`);
}
function contentBlocksValue(value, label, version) {
	arrayValue(value, label, (member, memberLabel) => {
		contentBlockValue(member, memberLabel, version);
	});
}
function contentBlockValue(value, label, version) {
	const block = releasedV0Record(value, label);
	switch (block["type"]) {
		case "text":
		case "reasoning":
			assertReleasedV0Keys(block, ["type", "text"], [], label);
			stringValue(block["text"], `${label} text`);
			return;
		case "image":
			assertReleasedV0Keys(block, ["type", "attachment"], [], label);
			imageAttachmentValue(block["attachment"], `${label} attachment`);
			return;
		case "tool-call":
			assertReleasedV0Keys(block, [
				"type",
				"id",
				"name",
				"arguments"
			], [], label);
			nonEmptyString(block["id"], `${label} id`);
			nonEmptyString(block["name"], `${label} name`);
			stringValue(block["arguments"], `${label} arguments`);
			return;
		case "tool-result":
			assertReleasedV0Keys(block, [
				"type",
				"toolCallId",
				"content"
			], ["isError"], label);
			nonEmptyString(block["toolCallId"], `${label} toolCallId`);
			contentBlocksValue(block["content"], `${label} content`, version);
			if (block["isError"] !== void 0) booleanValue(block["isError"], `${label} isError`);
			return;
		default:
			nonEmptyString(block["type"], `${label} type`);
			return;
	}
}
function imageAttachmentValue(value, label) {
	const attachment = exactRecord(value, label, [
		"attachmentId",
		"mediaType",
		"bytes",
		"width",
		"height"
	], ["name", "originalDimensions"]);
	nonEmptyString(attachment["attachmentId"], `${label} attachmentId`);
	literalValue(attachment["mediaType"], [
		"image/png",
		"image/jpeg",
		"image/webp",
		"image/gif"
	], `${label} mediaType`);
	countValue(attachment["bytes"], `${label} bytes`);
	positiveIntegerValue(attachment["width"], `${label} width`);
	positiveIntegerValue(attachment["height"], `${label} height`);
	if (attachment["name"] !== void 0) stringValue(attachment["name"], `${label} name`);
	if (attachment["originalDimensions"] !== void 0) {
		const dimensions = exactRecord(attachment["originalDimensions"], `${label} originalDimensions`, ["width", "height"]);
		positiveIntegerValue(dimensions["width"], `${label} original width`);
		positiveIntegerValue(dimensions["height"], `${label} original height`);
	}
}
function messageValue(value, label, version, expected) {
	const message = exactRecord(value, label, [
		"id",
		"role",
		"content",
		"source"
	]);
	nonEmptyString(message["id"], `${label} id`);
	const role = expected === "assistant" ? "assistant" : expected === "user" || expected === "tool" ? "user" : void 0;
	if (role === void 0) literalValue(message["role"], [
		"system",
		"user",
		"assistant"
	], `${label} role`);
	else literalValue(message["role"], [role], `${label} role`);
	contentBlocksValue(message["content"], `${label} content`, version);
	const source = releasedV0Record(message["source"], `${label} source`);
	if (version < 2 && expected === "user" && source["kind"] === "goal" && source["change"] !== void 0) legacyGoalMessageValue(message, source, label);
	else messageSourceValue(source, `${label} source`, version, expected);
	if (expected === "tool") {
		const content = message["content"];
		const block = Array.isArray(content) && content.length === 1 ? releasedV0Record(content[0], `${label} tool result`) : void 0;
		const source = releasedV0Record(message["source"], `${label} source`);
		if (block?.["type"] !== "tool-result" || block["toolCallId"] !== source["callId"]) throw new SessionFormatError(`${label} must contain exactly one tool-result block`);
	}
}
function legacyGoalMessageValue(message, source, label) {
	assertReleasedV0Keys(source, [
		"kind",
		"goalId",
		"revision",
		"round",
		"change"
	], [], `${label} source`);
	nonEmptyString(source["goalId"], `${label} source goalId`);
	positiveIntegerValue(source["revision"], `${label} source revision`);
	if (source["round"] !== 0) throw new SessionFormatError(`${label} legacy goal source round must be 0`);
	const change = releasedV0Record(source["change"], `${label} source change`);
	goalChangeValue(change, `${label} source change`);
	const ref = releasedV0Record(change["operation"] === "clear" ? change["cleared"] : change["goal"], `${label} source change ref`);
	if (source["goalId"] !== ref["id"] || source["revision"] !== ref["revision"]) throw new SessionFormatError(`${label} legacy goal source does not match its change`);
	const payload = change["operation"] === "clear" ? {
		cleared: change["cleared"],
		clearedAt: change["clearedAt"]
	} : {
		goal: change["goal"],
		roundsStarted: change["roundsStarted"],
		createdAt: change["createdAt"],
		updatedAt: change["updatedAt"]
	};
	const expected = [{
		type: "text",
		text: `<goal_state>${JSON.stringify(payload)}</goal_state>`
	}];
	if (!deepEqualJson(message["content"], expected)) throw new SessionFormatError(`${label} legacy goal content does not match its change`);
}
function messageSourceValue(value, label, version, expected) {
	const source = releasedV0Record(value, label);
	if (expected === "assistant" && source["kind"] !== "model") throw new SessionFormatError(`${label} must be model source`);
	if (expected === "tool" && source["kind"] !== "tool") throw new SessionFormatError(`${label} must be tool source`);
	switch (source["kind"]) {
		case "user":
			assertReleasedV0Keys(source, ["kind"], ["rpcId", "clientTimeZone"], label);
			if (source["rpcId"] !== void 0) nonEmptyString(source["rpcId"], `${label} rpcId`);
			if (source["clientTimeZone"] !== void 0) nonEmptyString(source["clientTimeZone"], `${label} clientTimeZone`);
			return;
		case "plugin":
			pluginSourceValue(source, label);
			return;
		case "model":
			assertReleasedV0Keys(source, [
				"kind",
				"provider",
				"model"
			], ["replayState"], label);
			nonEmptyString(source["provider"], `${label} provider`);
			nonEmptyString(source["model"], `${label} model`);
			return;
		case "tool":
			assertReleasedV0Keys(source, ["kind", "callId"], [], label);
			nonEmptyString(source["callId"], `${label} callId`);
			return;
		case "agent-instructions":
			assertReleasedV0Keys(source, [
				"kind",
				"form",
				"changes"
			], ["baseline", "baselineIdentity"], label);
			literalValue(source["form"], ["instructions"], `${label} form`);
			if (source["baseline"] !== void 0) literalValue(source["baseline"], [true], `${label} baseline`);
			if (source["baselineIdentity"] !== void 0) nonEmptyString(source["baselineIdentity"], `${label} baselineIdentity`);
			arrayValue(source["changes"], `${label} changes`, (member, memberLabel) => {
				const change = exactRecord(member, memberLabel, [
					"action",
					"scope",
					"path"
				], ["digest"]);
				literalValue(change["action"], [
					"set",
					"replace",
					"remove"
				], `${memberLabel} action`);
				stringValue(change["scope"], `${memberLabel} scope`);
				stringValue(change["path"], `${memberLabel} path`);
				if (change["digest"] !== void 0) stringValue(change["digest"], `${memberLabel} digest`);
			});
			return;
		case "session-reference":
			sessionReferenceSourceValue(source, label, version);
			return;
		case "team-message":
			assertReleasedV0Keys(source, [
				"kind",
				"teamId",
				"messageId",
				"senderId",
				"senderName"
			], [], label);
			for (const key of [
				"teamId",
				"messageId",
				"senderId"
			]) nonEmptyString(source[key], `${label} ${key}`);
			stringValue(source["senderName"], `${label} senderName`);
			return;
		case "goal":
			assertReleasedV0Keys(source, [
				"kind",
				"goalId",
				"revision",
				"round"
			], [], label);
			nonEmptyString(source["goalId"], `${label} goalId`);
			positiveIntegerValue(source["revision"], `${label} revision`);
			positiveIntegerValue(source["round"], `${label} round`);
			return;
		case "skill-invocation":
			assertReleasedV0Keys(source, [
				"kind",
				"name",
				"form"
			], [], label);
			nonEmptyString(source["name"], `${label} name`);
			literalValue(source["form"], ["instructions"], `${label} form`);
			return;
		case "skill-catalog":
			assertReleasedV0Keys(source, [
				"kind",
				"form",
				"entries"
			], ["update"], label);
			literalValue(source["form"], ["catalog"], `${label} form`);
			if (source["update"] !== void 0) literalValue(source["update"], [true], `${label} update`);
			arrayValue(source["entries"], `${label} entries`, (member, memberLabel) => {
				const entry = exactRecord(member, memberLabel, ["name", "description"]);
				nonEmptyString(entry["name"], `${memberLabel} name`);
				stringValue(entry["description"], `${memberLabel} description`);
			});
			return;
		case "coordinator":
		case "subagent-report":
			assertReleasedV0Keys(source, [
				"kind",
				"form",
				"senderSessionId"
			], [], label);
			literalValue(source["form"], ["relay"], `${label} form`);
			nonEmptyString(source["senderSessionId"], `${label} senderSessionId`);
			return;
		case "subagent-settled":
			assertReleasedV0Keys(source, [
				"kind",
				"form",
				"summary",
				"senderSessionId"
			], [], label);
			literalValue(source["form"], ["notice"], `${label} form`);
			stringValue(source["summary"], `${label} summary`);
			nonEmptyString(source["senderSessionId"], `${label} senderSessionId`);
			return;
		case "webhook":
			assertReleasedV0Keys(source, [
				"kind",
				"provider",
				"source",
				"deliveryId",
				"ruleId",
				"form",
				"summary"
			], [], label);
			for (const key of [
				"provider",
				"source",
				"deliveryId",
				"ruleId"
			]) nonEmptyString(source[key], `${label} ${key}`);
			literalValue(source["form"], ["notice"], `${label} form`);
			stringValue(source["summary"], `${label} summary`);
			return;
		default:
			nonEmptyString(source["kind"], `${label} kind`);
			return;
	}
}
function pluginSourceValue(source, label) {
	const optional = [
		"form",
		"sections",
		"summary"
	];
	if (source["plugin"] === "compact") optional.push("compactionId", "sourceCommandId");
	assertReleasedV0Keys(source, ["kind", "plugin"], optional, label);
	nonEmptyString(source["plugin"], `${label} plugin`);
	if (source["plugin"] === "compact") {
		nonEmptyString(source["compactionId"], `${label} compactionId`);
		if (source["sourceCommandId"] !== void 0) nonEmptyString(source["sourceCommandId"], `${label} sourceCommandId`);
	}
	const form = source["form"];
	if (form === void 0) return;
	literalValue(form, [
		"instructions",
		"catalog",
		"snapshot",
		"notice",
		"relay",
		"recall"
	], `${label} form`);
	if (form === "snapshot") arrayValue(source["sections"], `${label} sections`, (member, memberLabel) => {
		const section = exactRecord(member, memberLabel, ["name", "text"]);
		nonEmptyString(section["name"], `${memberLabel} name`);
		stringValue(section["text"], `${memberLabel} text`);
	});
	else if (source["sections"] !== void 0) throw new SessionFormatError(`${label} sections require snapshot form`);
	if (form === "notice") stringValue(source["summary"], `${label} summary`);
	else if (source["summary"] !== void 0) throw new SessionFormatError(`${label} summary requires notice form`);
}
function sessionReferenceSourceValue(source, label, version) {
	assertReleasedV0Keys(source, [
		"kind",
		"form",
		"version",
		"references"
	], [], label);
	literalValue(source["form"], ["recall"], `${label} form`);
	literalValue(source["version"], [1], `${label} version`);
	let expectedInputIndex = 0;
	const sessionIds = /* @__PURE__ */ new Set();
	if (arrayValue(source["references"], `${label} references`, (member, memberLabel) => {
		const reference = exactRecord(member, memberLabel, [
			"sessionId",
			"label",
			"capturedThroughSeq",
			"compacted",
			"originalMessages",
			"retainedMessages",
			"omittedMessages",
			"omittedBytes",
			"truncated",
			"inputIndex"
		], version >= 1 ? ["capturedFormatVersion"] : []);
		nonEmptyString(reference["sessionId"], `${memberLabel} sessionId`);
		stringValue(reference["label"], `${memberLabel} label`);
		if (reference["capturedThroughSeq"] !== null) countValue(reference["capturedThroughSeq"], `${memberLabel} capturedThroughSeq`);
		if (reference["capturedFormatVersion"] !== void 0) {
			const capturedVersion = countValue(reference["capturedFormatVersion"], `${memberLabel} capturedFormatVersion`);
			if (capturedVersion < 1 || capturedVersion > version) throw new SessionFormatError(`${memberLabel} capturedFormatVersion must be between 1 and ${version}`);
		}
		booleanValue(reference["compacted"], `${memberLabel} compacted`);
		const original = countValue(reference["originalMessages"], `${memberLabel} originalMessages`);
		const retained = countValue(reference["retainedMessages"], `${memberLabel} retainedMessages`);
		const omitted = countValue(reference["omittedMessages"], `${memberLabel} omittedMessages`);
		const omittedBytes = countValue(reference["omittedBytes"], `${memberLabel} omittedBytes`);
		const inputIndex = countValue(reference["inputIndex"], `${memberLabel} inputIndex`);
		const truncated = reference["truncated"];
		booleanValue(truncated, `${memberLabel} truncated`);
		if (retained > original || omitted !== original - retained) throw new SessionFormatError(`${memberLabel} message counts are inconsistent`);
		if (truncated !== (omitted > 0 || omittedBytes > 0)) throw new SessionFormatError(`${memberLabel} truncated disagrees with omitted content`);
		if (inputIndex !== expectedInputIndex) throw new SessionFormatError(`${label} inputIndex must match reference position`);
		expectedInputIndex += 1;
		const sessionId = reference["sessionId"];
		if (sessionIds.has(sessionId)) throw new SessionFormatError(`${label} repeats sessionId ${sessionId}`);
		sessionIds.add(sessionId);
	}).length === 0) throw new SessionFormatError(`${label} references must be non-empty`);
}
function streamChunkValue(value, label) {
	const chunk = releasedV0Record(value, label);
	switch (chunk["type"]) {
		case "block-start":
			assertReleasedV0Keys(chunk, [
				"type",
				"index",
				"blockType"
			], [], label);
			countValue(chunk["index"], `${label} index`);
			nonEmptyString(chunk["blockType"], `${label} blockType`);
			return;
		case "text-delta":
		case "reasoning-delta":
			assertReleasedV0Keys(chunk, [
				"type",
				"index",
				"text"
			], [], label);
			countValue(chunk["index"], `${label} index`);
			stringValue(chunk["text"], `${label} text`);
			return;
		case "tool-call-delta":
			assertReleasedV0Keys(chunk, [
				"type",
				"index",
				"id",
				"argumentsDelta"
			], ["name"], label);
			countValue(chunk["index"], `${label} index`);
			nonEmptyString(chunk["id"], `${label} id`);
			if (chunk["name"] !== void 0) stringValue(chunk["name"], `${label} name`);
			stringValue(chunk["argumentsDelta"], `${label} argumentsDelta`);
			return;
		case "block-end":
			assertReleasedV0Keys(chunk, [
				"type",
				"index",
				"block"
			], [], label);
			countValue(chunk["index"], `${label} index`);
			contentBlockValue(chunk["block"], `${label} block`, 1);
			return;
		case "usage":
			assertReleasedV0Keys(chunk, ["type", "usage"], [], label);
			tokenUsageValue(chunk["usage"], `${label} usage`);
			return;
		case "finish":
			assertReleasedV0Keys(chunk, ["type", "reason"], ["replayState"], label);
			finishReasonValue(chunk["reason"], `${label} reason`);
			if (chunk["replayState"] !== void 0) replayEnvelopeValue(chunk["replayState"], `${label} replayState`);
			return;
		default: throw new SessionFormatError(`${label} has unknown stream chunk type ${JSON.stringify(chunk["type"])}`);
	}
}
function finishReasonValue(value, label) {
	const reason = releasedV0Record(value, label);
	if (reason["kind"] === "aborted" || reason["kind"] === "error") {
		assertReleasedV0Keys(reason, ["kind", "failure"], [], label);
		llmFailureValue(reason["failure"], `${label} failure`);
		return;
	}
	if (reason["kind"] === "stop" || reason["kind"] === "tool-calls" || reason["kind"] === "max-tokens") assertReleasedV0Keys(reason, ["kind"], [], label);
	nonEmptyString(reason["kind"], `${label} kind`);
}
function replayEnvelopeValue(value, label) {
	const replay = exactRecord(value, label, ["response"], ["blocks"]);
	if (replay["blocks"] !== void 0 && !Array.isArray(replay["blocks"])) throw new SessionFormatError(`${label} blocks must be an array`);
}
function turnEndReasonValue(value, label) {
	const reason = releasedV0Record(value, label);
	switch (reason["kind"]) {
		case "completed":
		case "blocked":
		case "max-tokens":
		case "interrupted":
			assertReleasedV0Keys(reason, ["kind"], [], label);
			return;
		case "aborted": {
			assertReleasedV0Keys(reason, ["kind", "reason"], [], label);
			const cause = releasedV0Record(reason["reason"], `${label} abort cause`);
			if (cause["kind"] === "hook") {
				assertReleasedV0Keys(cause, ["kind", "reason"], [], `${label} abort cause`);
				stringValue(cause["reason"], `${label} abort reason`);
			} else {
				assertReleasedV0Keys(cause, ["kind"], [], `${label} abort cause`);
				literalValue(cause["kind"], [
					"user",
					"parent",
					"disposed",
					"legacy"
				], `${label} abort kind`);
			}
			return;
		}
		case "error":
			assertReleasedV0Keys(reason, ["kind", "error"], [], label);
			llmFailureValue(reason["error"], `${label} error`);
			return;
		default:
			nonEmptyString(reason["kind"], `${label} kind`);
			return;
	}
}
function requestHeaderValue(value, label) {
	const header = exactRecord(value, label, ["config"], [
		"adapterDefaults",
		"system",
		"tools"
	]);
	const config = exactRecord(header["config"], `${label} config`, ["provider", "model"], [
		"reasoningEffort",
		"temperature",
		"maxTokens",
		"stop"
	]);
	nonEmptyString(config["provider"], `${label} provider`);
	nonEmptyString(config["model"], `${label} model`);
	if (config["reasoningEffort"] !== void 0) nonEmptyString(config["reasoningEffort"], `${label} reasoningEffort`);
	if (config["temperature"] !== void 0) finiteNumberValue(config["temperature"], `${label} temperature`);
	if (config["maxTokens"] !== void 0) positiveIntegerValue(config["maxTokens"], `${label} maxTokens`);
	if (config["stop"] !== void 0) arrayValue(config["stop"], `${label} stop`, stringValue);
	if (header["adapterDefaults"] !== void 0) {
		const defaults = exactRecord(header["adapterDefaults"], `${label} adapterDefaults`, [], ["reasoningEffort", "maxTokens"]);
		for (const [key, marker] of Object.entries(defaults)) {
			literalValue(marker, [true], `${label} adapterDefaults ${key}`);
			if (!Object.hasOwn(config, key)) throw new SessionFormatError(`${label} adapter default ${key} lacks config value`);
		}
	}
	if (header["system"] !== void 0) stringValue(header["system"], `${label} system`);
	if (header["tools"] !== void 0) arrayValue(header["tools"], `${label} tools`, toolSchemaValue);
}
function toolSchemaValue(value, label) {
	const schema = exactRecord(value, label, [
		"name",
		"description",
		"parameters"
	]);
	nonEmptyString(schema["name"], `${label} name`);
	stringValue(schema["description"], `${label} description`);
	releasedV0Record(schema["parameters"], `${label} parameters`);
}
function shadowedValue(data, eventSeq, label) {
	const range = exactRecord(data["shadowedRange"], `${label} shadowedRange`, ["start", "end"]);
	const start = earlierSeq(range["start"], eventSeq, `${label} shadowedRange start`);
	const end = earlierSeq(range["end"], eventSeq, `${label} shadowedRange end`);
	const seqs = seqArray(data["shadowedSeqs"], eventSeq, `${label} shadowedSeqs`, true);
	if (seqs[0] !== start || seqs.at(-1) !== end) throw new SessionFormatError(`${label} shadowedRange must match shadowedSeqs endpoints`);
	countValue(data["shadowedTokenCount"], `${label} shadowedTokenCount`);
}
function goalChangeValue(data, label) {
	literalValue(data["kind"], ["goal/change"], `${label} kind`);
	literalValue(data["version"], [1], `${label} version`);
	if (data["operation"] === "clear") {
		assertReleasedV0Keys(data, [
			"kind",
			"version",
			"operation",
			"cleared",
			"clearedAt"
		], [], `${label} data`);
		goalRefValue(data["cleared"], `${label} cleared`);
		countValue(data["clearedAt"], `${label} clearedAt`);
		return;
	}
	assertReleasedV0Keys(data, [
		"kind",
		"version",
		"operation",
		"goal",
		"roundsStarted",
		"createdAt",
		"updatedAt"
	], [], `${label} data`);
	literalValue(data["operation"], [
		"create",
		"edit",
		"pause",
		"resume",
		"complete",
		"block"
	], `${label} operation`);
	goalSnapshotValue(data["goal"], `${label} goal`);
	countValue(data["roundsStarted"], `${label} roundsStarted`);
	countValue(data["createdAt"], `${label} createdAt`);
	countValue(data["updatedAt"], `${label} updatedAt`);
}
function goalRefValue(value, label) {
	const ref = exactRecord(value, label, ["id", "revision"]);
	nonEmptyString(ref["id"], `${label} id`);
	positiveIntegerValue(ref["revision"], `${label} revision`);
}
function goalSnapshotValue(value, label) {
	const goal = exactRecord(value, label, [
		"id",
		"revision",
		"objective",
		"phase",
		"maxGoalRounds"
	], ["blockedReason"]);
	nonEmptyString(goal["id"], `${label} id`);
	positiveIntegerValue(goal["revision"], `${label} revision`);
	nonEmptyString(goal["objective"], `${label} objective`);
	literalValue(goal["phase"], [
		"active",
		"paused",
		"blocked",
		"complete"
	], `${label} phase`);
	positiveIntegerValue(goal["maxGoalRounds"], `${label} maxGoalRounds`);
	if (goal["phase"] === "blocked") {
		const reason = exactRecord(goal["blockedReason"], `${label} blockedReason`, ["code", "message"]);
		nonEmptyString(reason["code"], `${label} blocked code`);
		nonEmptyString(reason["message"], `${label} blocked message`);
	} else if (goal["blockedReason"] !== void 0) throw new SessionFormatError(`${label} blockedReason requires blocked phase`);
}
function scheduleChangeValue(data, label) {
	literalValue(data["version"], [1], `${label} version`);
	if (data["operation"] === "create") {
		assertReleasedV0Keys(data, [
			"version",
			"operation",
			"schedule"
		], [], `${label} data`);
		scheduleRecordValue(data["schedule"], `${label} schedule`);
		return;
	}
	assertReleasedV0Keys(data, [
		"version",
		"operation",
		"id"
	], data["operation"] === "dispatch" ? ["acceptedAt"] : [], `${label} data`);
	literalValue(data["operation"], ["delete", "dispatch"], `${label} operation`);
	scheduleIdValue(data["id"], `${label} id`);
	if (data["acceptedAt"] !== void 0) instantValue(data["acceptedAt"], `${label} acceptedAt`);
}
function scheduleRecordValue(value, label) {
	const record = releasedV0Record(value, label);
	if (record["kind"] === "after") {
		assertReleasedV0Keys(record, [
			"id",
			"kind",
			"prompt",
			"afterSeconds",
			"scheduledAt"
		], [], label);
		positiveIntegerValue(record["afterSeconds"], `${label} afterSeconds`);
	} else if (record["kind"] === "at") assertReleasedV0Keys(record, [
		"id",
		"kind",
		"prompt",
		"scheduledAt"
	], [], label);
	else if (record["kind"] === "every") {
		assertReleasedV0Keys(record, [
			"id",
			"kind",
			"prompt",
			"everySeconds",
			"scheduledAt"
		], [], label);
		if (positiveIntegerValue(record["everySeconds"], `${label} everySeconds`) < 300) throw new SessionFormatError(`${label} everySeconds must be at least 300`);
	} else throw new SessionFormatError(`${label} has unknown schedule kind`);
	scheduleIdValue(record["id"], `${label} id`);
	nonEmptyString(record["prompt"], `${label} prompt`);
	instantValue(record["scheduledAt"], `${label} scheduledAt`);
}
function scheduleIdValue(value, label) {
	nonEmptyString(value, label);
	if (value.trim() !== value) throw new SessionFormatError(`${label} must not have surrounding whitespace`);
}
function instantValue(value, label) {
	if (typeof value !== "string" || !/^(?!0000)\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d\.\d{3}Z$/u.test(value) || !Number.isFinite(Date.parse(value)) || new Date(Date.parse(value)).toISOString() !== value) throw new SessionFormatError(`${label} must be a canonical UTC instant`);
}
function titleSourceValue(value, label) {
	const source = releasedV0Record(value, label);
	if (source["kind"] === "provider") {
		assertReleasedV0Keys(source, ["kind", "provider"], ["model"], label);
		nonEmptyString(source["provider"], `${label} provider`);
		if (source["model"] !== void 0) modelRouteValue(source["model"], `${label} model`);
		return;
	}
	assertReleasedV0Keys(source, ["kind"], [], label);
	literalValue(source["kind"], ["fallback", "user"], `${label} kind`);
}
function modelRouteValue(value, label) {
	const route = exactRecord(value, label, ["provider", "model"]);
	nonEmptyString(route["provider"], `${label} provider`);
	nonEmptyString(route["model"], `${label} model`);
}
function subagentDescriptorValue(data, label) {
	literalValue(data["version"], [3], `${label} version`);
	nonEmptyString(data["provider"], `${label} provider`);
	if (data["mode"] === "one-shot") {
		assertReleasedV0Keys(data, [
			"mode",
			"version",
			"provider"
		], ["label"], `${label} data`);
		if (data["label"] !== void 0) stringValue(data["label"], `${label} label`);
		return;
	}
	literalValue(data["mode"], ["continuable"], `${label} mode`);
	nonEmptyString(data["label"], `${label} label`);
	for (const key of [
		"agentProvider",
		"agentModel",
		"agentReasoningEffort",
		"persona"
	]) if (data[key] !== void 0) nonEmptyString(data[key], `${label} ${key}`);
	if (data["agentProvider"] === void 0 !== (data["agentModel"] === void 0)) throw new SessionFormatError(`${label} agentProvider and agentModel must be paired`);
	if (data["toolFilter"] !== void 0) {
		const filter = exactRecord(data["toolFilter"], `${label} toolFilter`, [], ["allow", "deny"]);
		if (filter["allow"] === void 0 && filter["deny"] === void 0) throw new SessionFormatError(`${label} toolFilter requires allow or deny`);
		if (filter["allow"] !== void 0) arrayValue(filter["allow"], `${label} allow`, nonEmptyString);
		if (filter["deny"] !== void 0) arrayValue(filter["deny"], `${label} deny`, nonEmptyString);
	}
}
function allowedModelsValue(value, label) {
	const seen = /* @__PURE__ */ new Set();
	if (arrayValue(value, label, (member, memberLabel) => {
		const route = exactRecord(member, memberLabel, ["provider", "model"]);
		nonEmptyString(route["provider"], `${memberLabel} provider`);
		nonEmptyString(route["model"], `${memberLabel} model`);
		const key = `${route["provider"]}\0${route["model"]}`;
		if (seen.has(key)) throw new SessionFormatError(`${label} repeats route ${key}`);
		seen.add(key);
	}).length === 0) throw new SessionFormatError(`${label} must be non-empty`);
}
function teamSelector(data, label) {
	literalValue(data["version"], [1], `${label} version`);
	nonEmptyString(data["teamId"], `${label} teamId`);
}
function teamMemberValue(value, label) {
	const member = exactRecord(value, label, [
		"id",
		"name",
		"description",
		"provider",
		"context",
		"phase"
	], ["error"]);
	nonEmptyString(member["id"], `${label} id`);
	stringValue(member["name"], `${label} name`);
	stringValue(member["description"], `${label} description`);
	stringValue(member["provider"], `${label} provider`);
	literalValue(member["context"], ["fresh", "fork"], `${label} context`);
	literalValue(member["phase"], [
		"provisioning",
		"active",
		"failed"
	], `${label} phase`);
	if (member["error"] !== void 0) stringValue(member["error"], `${label} error`);
}
function teamTaskValue(value, label) {
	const task = exactRecord(value, label, [
		"id",
		"revision",
		"subject",
		"description",
		"status",
		"blockedBy",
		"writeScopes"
	], ["ownerId"]);
	nonEmptyString(task["id"], `${label} id`);
	positiveIntegerValue(task["revision"], `${label} revision`);
	stringValue(task["subject"], `${label} subject`);
	stringValue(task["description"], `${label} description`);
	literalValue(task["status"], [
		"pending",
		"in_progress",
		"completed",
		"deleted"
	], `${label} status`);
	if (task["ownerId"] !== void 0) nonEmptyString(task["ownerId"], `${label} ownerId`);
	arrayValue(task["blockedBy"], `${label} blockedBy`, nonEmptyString);
	arrayValue(task["writeScopes"], `${label} writeScopes`, stringValue);
}
function teamMessageValue(value, label, version) {
	const message = exactRecord(value, label, [
		"id",
		"senderId",
		"senderName",
		"targetId",
		"delivery",
		"content"
	]);
	for (const key of [
		"id",
		"senderId",
		"targetId"
	]) nonEmptyString(message[key], `${label} ${key}`);
	stringValue(message["senderName"], `${label} senderName`);
	literalValue(message["delivery"], ["quiet", "wakeup"], `${label} delivery`);
	contentBlocksValue(message["content"], `${label} content`, version);
}
function workflowIdentity(data, label) {
	nonEmptyString(data["runId"], `${label} runId`);
	positiveIntegerValue(data["seq"], `${label} seq`);
}
function deepSeekSearchBodyValue(value, label) {
	const body = exactRecord(value, label, [
		"model",
		"max_tokens",
		"messages",
		"tools"
	]);
	nonEmptyString(body["model"], `${label} model`);
	positiveIntegerValue(body["max_tokens"], `${label} max_tokens`);
	if (arrayValue(body["messages"], `${label} messages`, (member, memberLabel) => {
		const message = exactRecord(member, memberLabel, ["role", "content"]);
		literalValue(message["role"], ["user"], `${memberLabel} role`);
		if (arrayValue(message["content"], `${memberLabel} content`, (block, blockLabel) => {
			const text = exactRecord(block, blockLabel, ["type", "text"]);
			literalValue(text["type"], ["text"], `${blockLabel} type`);
			stringValue(text["text"], `${blockLabel} text`);
		}).length !== 1) throw new SessionFormatError(`${memberLabel} content must contain one text block`);
	}).length !== 1) throw new SessionFormatError(`${label} messages must contain one user message`);
	if (arrayValue(body["tools"], `${label} tools`, (member, memberLabel) => {
		const tool = exactRecord(member, memberLabel, [
			"type",
			"name",
			"max_uses"
		]);
		literalValue(tool["type"], ["web_search_20250305"], `${memberLabel} type`);
		literalValue(tool["name"], ["web_search"], `${memberLabel} name`);
		positiveIntegerValue(tool["max_uses"], `${memberLabel} max_uses`);
	}).length !== 1) throw new SessionFormatError(`${label} tools must contain one web search tool`);
}
//#endregion
//#region ../session-format-v0-to-v1/src/validation.ts
const HEADER_REQUIRED$2 = [
	"version",
	"id",
	"createdAt",
	"isSeeded",
	"delegationDepth"
];
const HEADER_OPTIONAL$2 = [
	"cwd",
	"parentSession",
	"origin",
	"agentPreset"
];
/**
* Validate the logical header shared by released v0 and v1.
* @param header - detached logical header.
* @param version - exact expected generation.
*/
function assertReleasedSessionFormatHeader(header, version) {
	const record = releasedV0Record(header, `format v${version} header`);
	assertReleasedV0Keys(record, HEADER_REQUIRED$2, HEADER_OPTIONAL$2, `format v${version} header`);
	if (record["version"] !== version) throw new SessionFormatError(`expected format v${version} header`);
	if (typeof record["id"] !== "string") throw new SessionFormatError(`format v${version} header id must be a string`);
	sessionFormatCount(record["createdAt"], `format v${version} header createdAt`);
	if (typeof record["isSeeded"] !== "boolean") throw new SessionFormatError(`format v${version} header isSeeded must be a boolean`);
	sessionFormatCount(record["delegationDepth"], `format v${version} header delegationDepth`);
	for (const key of [
		"cwd",
		"parentSession",
		"agentPreset"
	]) if (record[key] !== void 0 && typeof record[key] !== "string") throw new SessionFormatError(`format v${version} header ${key} must be a string`);
	if (typeof record["cwd"] === "string" && !(0, node_path.isAbsolute)(record["cwd"])) throw new SessionFormatError(`format v${version} header cwd must be absolute`);
	if (record["origin"] !== void 0 && record["origin"] !== "subagent") throw new SessionFormatError(`format v${version} header origin must be "subagent"`);
}
/**
* Validate one released-v1 logical header.
* @param header - detached logical header.
*/
function assertReleasedV1Header(header) {
	assertReleasedSessionFormatHeader(header, 1);
}
/**
* Validate shared-layout surface references for one released generation.
* @param record - exact event envelope.
* @param seq - event position used for earlier-reference checks.
* @param type - surface event type used in diagnostics.
* @param assistantSources - whether this generation admits empty Assistant chunk provenance.
*/
function assertReleasedSurfaceMetadata(record, seq, type, assistantSources) {
	const sources = record["sourceEventSeqs"];
	if (type === "assistant/message" && sources !== void 0 && assistantSources === "forbid-assistant") throw new SessionFormatError(`assistant/message ${seq} retains obsolete chunk provenance`);
	if (sources !== void 0) {
		if (!Array.isArray(sources)) throw new SessionFormatError(`${type} ${seq} sourceEventSeqs must be an array`);
		const seen = /* @__PURE__ */ new Set();
		for (const source of sources) {
			const current = sessionFormatCount(source, `${type} ${seq} sourceEventSeqs member`);
			if (current >= seq || seen.has(current)) throw new SessionFormatError(`${type} ${seq} sourceEventSeqs must be unique earlier seqs`);
			seen.add(current);
		}
		if (sources.length === 0 && type !== "assistant/message") throw new SessionFormatError(`${type} ${seq} sourceEventSeqs must be non-empty`);
	}
	const operation = record["surfaceOp"];
	if (operation === void 0 || operation === "append") return;
	const replacement = releasedV0Record(operation, `${type} ${seq} surfaceOp`);
	assertReleasedV0Keys(replacement, [
		"op",
		"start",
		"end"
	], [], `${type} ${seq} surfaceOp`);
	if (replacement["op"] !== "replace") throw new SessionFormatError(`${type} ${seq} surfaceOp must replace`);
	const start = sessionFormatCount(replacement["start"], `${type} ${seq} surface start`);
	const end = sessionFormatCount(replacement["end"], `${type} ${seq} surface end`);
	if (start >= seq || end >= seq) throw new SessionFormatError(`${type} ${seq} has an invalid surface replacement`);
}
/**
* Validate one exact known payload after legacy normalization.
* @param event - known event to validate.
* @param version - payload generation controlling versioned members.
*/
function assertReleasedEventPayload(event, version) {
	const disposition = RELEASED_V0_EVENT_DISPOSITIONS[event.type];
	/* v8 ignore next -- artifact coordinate validation admits only the frozen inventory before payload validation. */
	if (disposition === void 0) throw new SessionFormatUnsupportedMigrationError(`format v0 contains unknown historical event type ${JSON.stringify(event.type)} at seq ${event.seq}; migration refuses unknown historical events even when ignorable`);
	const data = releasedV0Record(event.data, `${event.type} ${event.seq} data`);
	if (event.type === "subagent/descriptor" && data["version"] !== 3) {
		const descriptorVersion = sessionFormatCount(data["version"], `${event.type} ${event.seq} version`);
		if (version === 0) throw new SessionFormatUnsupportedMigrationError(`${event.type} ${event.seq} uses unsupported descriptor version ${descriptorVersion}`);
		return;
	}
	const versionOptional = version === 1 && event.type === "session-log-deepseek/delivery-accepted" ? [...disposition.optional, "sessionFormatVersion"] : disposition.optional;
	assertReleasedV0Keys(data, disposition.required, versionOptional, `${event.type} ${event.seq} data`);
	for (const key of disposition.opaque) if (Object.hasOwn(data, key) && !isJsonValue(data[key])) throw new SessionFormatError(`${event.type} ${event.seq} opaque ${key} is not lossless JSON`);
	assertReleasedPayloadSemantics(event, version);
}
//#endregion
//#region ../session-format-v0-to-v1/src/codec.ts
const PHYSICAL_HEADER_REQUIRED = [
	"type",
	"version",
	"id",
	"createdAt",
	"delegationDepth"
];
const PHYSICAL_HEADER_OPTIONAL = [
	"cwd",
	"parentSession",
	"seedLength",
	"origin",
	"agentPreset"
];
const PACKED_TAGS = new Set([
	"text-chunks",
	"reasoning-chunks",
	"tool-call-chunks"
]);
/**
* Test whether a compact migration item is a released packed Assistant row.
* @param run - compact migration item to classify.
* @returns whether the item carries the released Assistant chunk representation.
*/
function isReleasedAssistantChunkRun(run) {
	return run.runType === "released-assistant-chunks";
}
/** Frozen physical JSON codec for the released v0 layout. */
const releasedV0SessionFormatCodec = createReleasedCodec(0);
/** Frozen physical JSON codec for the shared-layout released v1 format. */
const releasedV1SessionFormatCodec = createReleasedCodec(1);
function createReleasedCodec(version) {
	return Object.freeze({
		version,
		decodeHeader: (value) => decodeHeader(value, version),
		createDecoder(headerValue, recovery) {
			const physical = decodePhysicalHeader$1(headerValue, version);
			const scanner = scanRows(recovery === "recoverable");
			return {
				header: physical.header,
				headerInheritedEventCount: physical.inheritedEventCount,
				decodeRow: (rowValue, context) => {
					scanner.decodeRow(rowValue, context);
				},
				finish(_context) {
					scanner.finish(physical.inheritedEventCount);
					return physical.inheritedEventCount;
				}
			};
		}
	});
}
function scanRows(recoverable) {
	let rowIndex = 0;
	let eventCount = 0;
	let issue;
	return {
		decodeRow(rowValue, context) {
			const currentRow = rowIndex;
			rowIndex += 1;
			let packed = false;
			let decoded;
			try {
				const record = releasedV0Record(rowValue, `released Session row ${currentRow}`);
				const type = record["type"];
				if (typeof type === "string" && PACKED_TAGS.has(type)) {
					packed = true;
					decoded = decodePackedRun(record, type, currentRow);
				} else decoded = decodeEvent$1(record, currentRow);
			} catch (error) {
				const current = error instanceof SessionFormatError ? error : new SessionFormatError(`released Session row ${currentRow} is malformed`, { cause: error });
				if (!recoverable) throw current;
				issue ??= current;
				return;
			}
			if (issue !== void 0) {
				if (!packed && decoded.type === "turn/end") throw issue;
				return;
			}
			const seq = packed ? decoded.firstSeq : decoded.seq;
			if (seq !== eventCount) {
				const gap = new SessionFormatError(`released Session row ${currentRow} has seq gap (expected ${eventCount}, got ${seq})`);
				if (!recoverable) throw gap;
				issue = gap;
				if (!packed && decoded.type === "turn/end") throw gap;
				return;
			}
			if (packed) {
				const run = decoded;
				eventCount += run.eventCount;
				context.emitRun(run);
			} else {
				eventCount += 1;
				context.emitEvent(decoded);
			}
		},
		finish(inheritedEventCount) {
			if (inheritedEventCount > eventCount) throw new SessionFormatError("Session inheritedEventCount exceeds its event count");
		}
	};
}
function decodeHeader(value, version) {
	return decodePhysicalHeader$1(value, version).header;
}
function decodePhysicalHeader$1(value, version) {
	const record = releasedV0Record(snapshotSessionFormatJson(value, `released v${version} physical header`), `released v${version} physical header`);
	assertReleasedV0Keys(record, PHYSICAL_HEADER_REQUIRED, PHYSICAL_HEADER_OPTIONAL, `released v${version} physical header`);
	if (record["type"] !== "session" || record["version"] !== version) throw new SessionFormatError(`expected released v${version} physical Session header`);
	if (typeof record["id"] !== "string") throw new SessionFormatError(`released v${version} header id must be a string`);
	const createdAt = sessionFormatCount(record["createdAt"], `released v${version} header createdAt`);
	const delegationDepth = sessionFormatCount(record["delegationDepth"], `released v${version} header delegationDepth`);
	const seedLength = record["seedLength"] === void 0 ? 0 : sessionFormatCount(record["seedLength"], `released v${version} header seedLength`);
	for (const key of [
		"cwd",
		"parentSession",
		"agentPreset"
	]) if (record[key] !== void 0 && typeof record[key] !== "string") throw new SessionFormatError(`released v${version} header ${key} must be a string`);
	if (record["origin"] !== void 0 && record["origin"] !== "subagent") throw new SessionFormatError(`released v${version} header origin must be "subagent"`);
	const header = {
		version,
		id: record["id"],
		createdAt,
		...record["cwd"] === void 0 ? {} : { cwd: record["cwd"] },
		...record["parentSession"] === void 0 ? {} : { parentSession: record["parentSession"] },
		isSeeded: record["seedLength"] !== void 0,
		...record["origin"] === void 0 ? {} : { origin: record["origin"] },
		delegationDepth,
		...record["agentPreset"] === void 0 ? {} : { agentPreset: record["agentPreset"] }
	};
	assertReleasedSessionFormatHeader(header, version);
	return {
		header,
		inheritedEventCount: seedLength
	};
}
function decodeEvent$1(record, rowIndex) {
	if (record["sourceEventSeqs"] !== void 0) {
		const seq = sessionFormatCount(record["seq"], `released Session row ${rowIndex} seq`);
		return {
			...record,
			sourceEventSeqs: decodeSeqRanges$1(record["sourceEventSeqs"], seq)
		};
	}
	return record;
}
function decodePackedRun(row, type, rowIndex) {
	const label = `released ${type} row ${rowIndex}`;
	assertReleasedV0Keys(row, [
		"type",
		"seq0",
		"time0",
		"data"
	], [], label);
	const seq0 = sessionFormatCount(row["seq0"], `${label} seq0`);
	const time0 = sessionFormatSafeInteger(row["time0"], `${label} time0`);
	const data = releasedV0Record(row["data"], `${label} data`);
	const isTool = type === "tool-call-chunks";
	assertReleasedV0Keys(data, isTool ? [
		"turn",
		"step",
		"index",
		"id",
		"dt",
		"args"
	] : [
		"turn",
		"step",
		"index",
		"dt",
		"texts"
	], isTool ? ["name"] : [], `${label} data`);
	const payload = data[isTool ? "args" : "texts"];
	if (!Array.isArray(payload) || payload.length === 0 || payload.some((member) => typeof member !== "string")) throw new SessionFormatError(`${label} payload must be a non-empty string array`);
	const gaps = data["dt"];
	if (!Array.isArray(gaps) || gaps.length !== payload.length - 1) throw new SessionFormatError(`${label} dt length must match its payload`);
	let lastTime = time0;
	for (const gap of gaps) {
		const validGap = sessionFormatSafeInteger(gap, `${label} dt member`);
		lastTime = sessionFormatSafeInteger(lastTime + validGap, `${label} member time`);
	}
	const turn = sessionFormatCount(data["turn"], `${label} turn`);
	const step = sessionFormatCount(data["step"], `${label} step`);
	const chunkIndex = sessionFormatCount(data["index"], `${label} index`);
	if (isTool && (typeof data["id"] !== "string" || data["id"].length === 0 || data["name"] !== void 0 && typeof data["name"] !== "string")) throw new SessionFormatError(`${label} id and optional name must be strings`);
	const lastSeq = sessionFormatCount(seq0 + payload.length - 1, `${label} final seq`);
	const stream = type === "tool-call-chunks" ? {
		type,
		time0,
		index: chunkIndex,
		dt: gaps,
		id: data["id"],
		...data["name"] === void 0 ? {} : { name: data["name"] },
		args: payload
	} : {
		type,
		time0,
		index: chunkIndex,
		dt: gaps,
		texts: payload
	};
	const run = {
		runType: "released-assistant-chunks",
		firstSeq: seq0,
		eventCount: payload.length,
		turn,
		step,
		lastSeq,
		lastTime,
		stream,
		expand: () => expandAssistantChunkRun(run)
	};
	return run;
}
function* expandAssistantChunkRun(run) {
	const stream = run.stream;
	const gaps = stream["dt"];
	const members = stream["type"] === "tool-call-chunks" ? stream["args"] : stream["texts"];
	let time = run.stream["time0"];
	for (let index = 0; index < members.length; index += 1) {
		if (index > 0) time += gaps[index - 1];
		const member = members[index];
		const chunk = stream["type"] === "text-chunks" ? {
			type: "text-delta",
			index: stream["index"],
			text: member
		} : stream["type"] === "reasoning-chunks" ? {
			type: "reasoning-delta",
			index: stream["index"],
			text: member
		} : {
			type: "tool-call-delta",
			index: stream["index"],
			id: stream["id"],
			...stream["name"] === void 0 ? {} : { name: stream["name"] },
			argumentsDelta: member
		};
		yield {
			type: "assistant/chunk",
			seq: run.firstSeq + index,
			time,
			data: {
				turn: run.turn,
				step: run.step,
				chunk
			}
		};
	}
}
function decodeSeqRanges$1(value, maxEntries) {
	if (!Array.isArray(value)) throw new SessionFormatError("sourceEventSeqs must be an array");
	const output = [];
	let hasRange = false;
	for (const entry of value) {
		if (typeof entry === "number") {
			if (output.length >= maxEntries) throw new SessionFormatError("sourceEventSeqs exceeds its event seq");
			output.push(sessionFormatCount(entry, "sourceEventSeqs member"));
			continue;
		}
		if (!Array.isArray(entry) || entry.length !== 2) throw new SessionFormatError("sourceEventSeqs range must be a [start, end] pair");
		const start = sessionFormatCount(entry[0], "sourceEventSeqs range start");
		const end = sessionFormatCount(entry[1], "sourceEventSeqs range end");
		if (end < start || end - start + 1 > maxEntries - output.length) throw new SessionFormatError("sourceEventSeqs range exceeds its event seq");
		for (let seq = start; seq <= end; seq += 1) output.push(seq);
		hasRange = true;
	}
	if (hasRange && output.some((member, index) => index > 0 && member <= output[index - 1])) throw new SessionFormatError("sourceEventSeqs ranges must be strictly increasing");
	return output;
}
//#endregion
//#region ../session-format-v0-to-v1/src/migration.ts
/** Identity format edge that promotes released v0 into released v1. */
const sessionFormatV0ToV1 = defineSessionFormatMigration({
	name: "@deepseek-ai/dsh-session-format-v0-to-v1",
	fromVersion: 0,
	toVersion: 1,
	migrateHeader(header) {
		assertHeaderVersion(header, 0);
		return {
			...header,
			version: 1
		};
	},
	createStage(input) {
		return new ReleasedV0ToV1Stage(input);
	},
	validateTargetHeader: assertReleasedV1Header
});
var ReleasedV0ToV1Stage = class {
	input;
	headerInheritedEventCount;
	state = {
		messageIds: /* @__PURE__ */ new Map(),
		retryIds: /* @__PURE__ */ new Map()
	};
	constructor(input) {
		this.input = input;
		assertHeaderVersion(input.sourceHeader, 0);
		this.headerInheritedEventCount = sessionFormatCount(input.sourceInheritedEventCount, "format v0 inherited event count");
	}
	transformEvent(event, context) {
		const normalized = normalizeReleasedV0Event(event, this.input.sourceHeader.id, this.state);
		assertSourceDeliveryMarker$1(normalized, this.input);
		context.emitEvent(normalized);
	}
	transformRun(run, context) {
		if (isReleasedAssistantChunkRun(run)) {
			context.emitRun(run);
			return;
		}
		for (const event of run.expand()) this.transformEvent(event, context);
	}
	finish(_context) {
		return this.headerInheritedEventCount;
	}
};
function assertHeaderVersion(header, version) {
	if (header.version !== version) throw new SessionFormatError(`expected format v${version} header`);
}
function normalizeReleasedV0Event(event, sessionId, state) {
	const named = normalizeLegacyCompactionType(event);
	assertSupportedLegacyType(named, sessionId);
	const message = normalizeLegacyMessage(normalizeLegacyCompaction(normalizeLegacyRetry(normalizeLegacySteering(normalizeLegacyRequestHeader(normalizeLegacyTurnEnd(normalizeLegacyTurnStart(named, sessionId), sessionId), sessionId), sessionId), sessionId, state.retryIds), sessionId, state), sessionId, state.messageIds);
	if (message.type !== "assistant/chunk") assertReleasedEventPayload(message, 0);
	const messageId = eventMessageId(message);
	if (messageId !== void 0) state.messageIds.set(message.seq, messageId);
	return message;
}
function normalizeLegacyCompactionType(event) {
	switch (event.type) {
		case "compact/start": return {
			...event,
			type: "compaction/start"
		};
		case "compact/summary": return {
			...event,
			type: "compaction/summary"
		};
		case "compact/end": return {
			...event,
			type: "compaction/end"
		};
		case "compact/prune": return {
			...event,
			type: "compaction/prune"
		};
		default: return event;
	}
}
function assertSourceDeliveryMarker$1(event, input) {
	if (event.type !== "session-log-deepseek/delivery-accepted") return;
	const data = releasedV0Record(event.data, `${event.type} ${event.seq} data`);
	const acceptedVersion = data["sessionFormatVersion"] ?? 0;
	const inherited = input.sourceHeader.parentSession !== void 0 && event.seq < sessionFormatCount(input.sourceInheritedEventCount, "format v0 inherited event count");
	if (acceptedVersion === 0 && !inherited && data["sessionId"] !== input.sourceHeader.id) throw new SessionFormatError("current-generation delivery marker names the wrong Session");
}
function normalizeLegacyRetry(event, sessionId, retryIds) {
	if (event.type !== "llm/retry") return event;
	const data = releasedV0Record(event.data, `llm/retry ${event.seq} data`);
	const chain = [
		data["turn"],
		data["step"],
		data["provider"],
		data["policyKey"]
	].map((value) => JSON.stringify(value)).join("\0");
	const retryId = data["retryId"];
	if (typeof retryId === "string" && retryId.length > 0) {
		retryIds.set(chain, retryId);
		return event;
	}
	if (Object.hasOwn(data, "retryId")) return event;
	const migratedRetryId = retryIds.get(chain) ?? `legacy-retry:${sessionId}:${event.seq}`;
	retryIds.set(chain, migratedRetryId);
	return {
		...event,
		data: {
			...data,
			retryId: migratedRetryId
		}
	};
}
function normalizeLegacyCompaction(event, sessionId, state) {
	if (event.type === "session/end-seed") {
		delete state.compactionId;
		return event;
	}
	if (event.type === "compaction/start") {
		const data = releasedV0Record(event.data, `compaction/start ${event.seq} data`);
		const existing = data["compactionId"];
		if (typeof existing === "string" && existing.length > 0) {
			state.compactionId = existing;
			return event;
		}
		if (Object.hasOwn(data, "compactionId")) return event;
		const id = `legacy-compaction:${sessionId}:${event.seq}`;
		state.compactionId = id;
		return {
			...event,
			data: {
				...data,
				compactionId: id
			}
		};
	}
	const compactionId = state.compactionId;
	if (compactionId === void 0) return event;
	if (event.type === "compaction/summary" || event.type === "compaction/end") {
		const normalized = addLegacyCompactionId(event, compactionId);
		if (event.type === "compaction/end") delete state.compactionId;
		return normalized;
	}
	if (event.type !== "user/message") return event;
	const data = releasedV0Record(event.data, `user/message ${event.seq} data`);
	const source = data["source"];
	if (!releasedIsRecord(source) || source["kind"] !== "plugin" || source["plugin"] !== "compact" || Object.hasOwn(source, "compactionId")) return event;
	return {
		...event,
		data: {
			...data,
			source: {
				...source,
				compactionId
			}
		}
	};
}
function addLegacyCompactionId(event, compactionId) {
	const data = releasedV0Record(event.data, `${event.type} ${event.seq} data`);
	if (Object.hasOwn(data, "compactionId")) return event;
	return {
		...event,
		data: {
			...data,
			compactionId
		}
	};
}
function normalizeLegacyRequestHeader(event, sessionId) {
	if (event.type !== "request/header") return event;
	const data = releasedV0Record(event.data, `request/header ${event.seq} data`);
	const header = releasedV0Record(data["header"], `request/header ${event.seq} header`);
	if (!Object.hasOwn(header, "messagePrefix")) return event;
	if (!Array.isArray(header["messagePrefix"])) throw new SessionFormatError(`session ${JSON.stringify(sessionId)} contains malformed request/header messagePrefix at seq ${event.seq}`);
	const { messagePrefix: _messagePrefix, ...currentHeader } = header;
	return {
		...event,
		data: {
			...data,
			header: currentHeader
		}
	};
}
function assertSupportedLegacyType(event, sessionId) {
	if (event.type === "request/header-delta" || event.type === "mode/set") throw new SessionFormatUnsupportedMigrationError(`session ${JSON.stringify(sessionId)} contains unsupported legacy ${event.type} event at seq ${event.seq}`);
	if (event.type === "request/header") {
		if (releasedV0Record(event.data, `request/header ${event.seq} data`)["reason"] === "fallback") throw new SessionFormatUnsupportedMigrationError(`session ${JSON.stringify(sessionId)} contains unsupported request/header reason "fallback" at seq ${event.seq}`);
	}
}
function normalizeLegacySteering(event, sessionId) {
	if (event.type !== "steering/message") return event;
	const data = releasedV0Record(event.data, `steering/message ${event.seq} data`);
	const wrapped = data["message"];
	if (wrapped !== void 0) {
		assertReleasedV0Keys(data, ["turn", "message"], [], `steering/message ${event.seq} data`);
		sessionFormatCount(data["turn"], `steering/message ${event.seq} turn`);
		return {
			...event,
			type: "user/message",
			data: wrapped
		};
	}
	assertReleasedV0Keys(data, [
		"turn",
		"content",
		"source"
	], [], `steering/message ${event.seq} data`);
	sessionFormatCount(data["turn"], `steering/message ${event.seq} turn`);
	const { turn: _turn, ...message } = data;
	return {
		...event,
		type: "user/message",
		data: {
			...message,
			id: legacyMessageId(sessionId, event.seq),
			role: "user"
		}
	};
}
function normalizeLegacyTurnStart(event, sessionId) {
	if (event.type !== "turn/start") return event;
	const data = releasedV0Record(event.data, `turn/start ${event.seq} data`);
	if (!Object.hasOwn(data, "trigger")) return event;
	assertReleasedV0Keys(data, ["turn", "trigger"], [], `turn/start ${event.seq} data`);
	const turn = sessionFormatCount(data["turn"], `turn/start ${event.seq} turn`);
	const trigger = releasedV0Record(data["trigger"], `turn/start ${event.seq} trigger`);
	if (turn < 1 || typeof trigger["kind"] !== "string" || trigger["kind"].length === 0) throw malformedLegacy(sessionId, "turn/start", event.seq);
	return {
		...event,
		data: { turn }
	};
}
function normalizeLegacyTurnEnd(event, sessionId) {
	if (event.type !== "turn/end") return event;
	const data = releasedV0Record(event.data, `turn/end ${event.seq} data`);
	assertReleasedV0Keys(data, ["turn", "reason"], [], `turn/end ${event.seq} data`);
	if (sessionFormatCount(data["turn"], `turn/end ${event.seq} turn`) < 1) throw malformedLegacy(sessionId, "turn/end", event.seq);
	const reason = releasedV0Record(data["reason"], `turn/end ${event.seq} reason`);
	if (typeof reason["kind"] !== "string") throw malformedLegacy(sessionId, "turn/end", event.seq);
	let current;
	switch (reason["kind"]) {
		case "completed":
		case "blocked":
		case "max-tokens":
		case "interrupted":
			assertReleasedV0Keys(reason, ["kind"], [], `turn/end ${event.seq} reason`);
			return event;
		case "aborted":
			if (Object.hasOwn(reason, "reason")) return event;
			assertReleasedV0Keys(reason, ["kind"], [], `turn/end ${event.seq} reason`);
			current = {
				kind: "aborted",
				reason: { kind: "legacy" }
			};
			break;
		case "disposed":
			assertReleasedV0Keys(reason, ["kind"], [], `turn/end ${event.seq} reason`);
			current = {
				kind: "aborted",
				reason: { kind: "disposed" }
			};
			break;
		case "error":
			if (Object.hasOwn(reason, "error")) return event;
			current = normalizeLegacyErrorReason(reason, event.seq, sessionId);
			break;
		default: return event;
	}
	return {
		...event,
		data: {
			...data,
			reason: current
		}
	};
}
function normalizeLegacyErrorReason(reason, seq, sessionId) {
	sessionFormatCount(reason["step"], `turn/end ${seq} error step`);
	const failure = reason["failure"];
	if (failure !== void 0) {
		assertReleasedV0Keys(reason, [
			"kind",
			"step",
			"failure"
		], [], `turn/end ${seq} reason`);
		const record = releasedV0Record(failure, `turn/end ${seq} failure`);
		assertReleasedV0Keys(record, ["message", "code"], [
			"status",
			"providerRetryAfterMs",
			"requestId"
		], `turn/end ${seq} failure`);
		if (typeof record["message"] !== "string" || typeof record["code"] !== "string") throw malformedLegacy(sessionId, "turn/end", seq);
		return {
			kind: "error",
			error: record
		};
	}
	assertReleasedV0Keys(reason, [
		"kind",
		"step",
		"message"
	], ["code"], `turn/end ${seq} reason`);
	if (typeof reason["message"] !== "string" || reason["code"] !== void 0 && typeof reason["code"] !== "string") throw malformedLegacy(sessionId, "turn/end", seq);
	return {
		kind: "error",
		error: {
			message: reason["message"],
			code: typeof reason["code"] === "string" ? reason["code"] : "UNKNOWN"
		}
	};
}
function normalizeLegacyMessage(event, sessionId, messageIds) {
	const data = releasedV0Record(event.data, `${event.type} ${event.seq} data`);
	switch (event.type) {
		case "user/message":
			if (Object.hasOwn(data, "id") || Object.hasOwn(data, "role") || Object.hasOwn(data, "message") || !Object.hasOwn(data, "content") || !Object.hasOwn(data, "source")) return event;
			return {
				...event,
				data: {
					...data,
					id: legacyMessageId(sessionId, event.seq),
					role: "user"
				}
			};
		case "assistant/message": {
			if (Object.hasOwn(data, "message") || !Object.hasOwn(data, "content") || !Object.hasOwn(data, "provenance")) return event;
			const { content, provenance, ...eventData } = data;
			const source = releasedV0Record(provenance, `assistant/message ${event.seq} provenance`);
			return {
				...event,
				data: {
					...eventData,
					message: {
						id: legacyMessageId(sessionId, event.seq),
						role: "assistant",
						content,
						source: {
							...source,
							kind: "model"
						}
					}
				}
			};
		}
		case "tool/result": {
			if (Object.hasOwn(data, "message") || !Object.hasOwn(data, "callId") || !Object.hasOwn(data, "content") || !Object.hasOwn(data, "isError")) return event;
			const { callId, content, isError, ...eventData } = data;
			if (typeof callId !== "string" || typeof isError !== "boolean" || content === void 0) return event;
			const inheritedId = replacementStart(event);
			const messageId = inheritedId === void 0 ? legacyMessageId(sessionId, event.seq) : messageIds.get(inheritedId);
			if (messageId === void 0) throw new SessionFormatError(`tool/result ${event.seq} replacement cites a message without identity`);
			return {
				...event,
				data: {
					...eventData,
					message: {
						id: messageId,
						role: "user",
						content: [{
							type: "tool-result",
							toolCallId: callId,
							content,
							isError
						}],
						source: {
							kind: "tool",
							callId
						}
					}
				}
			};
		}
		default: return event;
	}
}
function replacementStart(event) {
	const operation = event["surfaceOp"];
	if (operation === void 0 || !releasedIsRecord(operation) || operation["op"] !== "replace") return void 0;
	return operation["start"];
}
function eventMessageId(event) {
	const data = releasedV0Record(event.data, `${event.type} ${event.seq} data`);
	const message = event.type === "user/message" ? data : releasedIsRecord(data["message"]) ? data["message"] : void 0;
	return typeof message?.["id"] === "string" ? message["id"] : void 0;
}
function releasedIsRecord(value) {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
function legacyMessageId(sessionId, seq) {
	return `legacy-message:${sessionId}:${seq}`;
}
function malformedLegacy(sessionId, type, seq) {
	return new SessionFormatError(`session ${JSON.stringify(sessionId)} contains malformed pre-react-loop ${type} at seq ${seq}`);
}
//#endregion
//#region ../session-format-v0-to-v1/src/relationships.ts
const SURFACE_TYPES$2 = new Set([
	"user/message",
	"assistant/message",
	"tool/result"
]);
/**
* Validate cross-event relationships required to construct one current Session safely.
* @param artifact - complete normalized v0 or exact current v1 artifact.
* @param extensions - later-generation event roles interpreted by the calling format owner.
*/
function assertReleasedArtifactRelationships(artifact, extensions = {}) {
	let openTurn = null;
	let openStep = null;
	let openStepProvider;
	let nextTurn = 1;
	let nextStep = 1;
	let surface = [];
	let openCompaction;
	const staleCompactionStarts = inheritedOrphanCompactionStarts(artifact.events);
	const retries = [];
	const retryStarts = /* @__PURE__ */ new Set();
	const ptcRoots = /* @__PURE__ */ new Map();
	const ptcStarts = /* @__PURE__ */ new Map();
	const toolLifecycles = /* @__PURE__ */ new Map();
	const commandRuns = /* @__PURE__ */ new Set();
	for (const event of artifact.events) {
		const extensionStepEvent = extensions.stepEvents?.has(event.type) === true;
		if (RELEASED_V0_EVENT_DISPOSITIONS[event.type] === void 0 && !extensionStepEvent) continue;
		const data = releasedV0Record(event.data, `${event.type} ${event.seq} data`);
		if (SURFACE_TYPES$2.has(event.type)) surface = applySurface(surface, event);
		if ((event.type === "turn/start" || event.type === "turn/end") && openCompaction !== void 0 && !staleCompactionStarts.has(openCompaction.startSeq)) throw new SessionFormatError(`${event.type} crosses an open compaction`);
		if (extensionStepEvent) {
			requireOpenStep(event, data, openTurn, openStep);
			continue;
		}
		switch (event.type) {
			case "turn/start": {
				const previous = artifact.events[event.seq - 1];
				if (extensions.legacyInterruptedTurnRestart === true && openTurn !== null && openStep === null && data["turn"] === openTurn + 1 && nextTurn === openTurn && previous?.type === "agent/inbox/spliced") {
					const splice = releasedV0Record(previous.data, `agent/inbox/spliced ${previous.seq} data`);
					if (splice["target"] === "next-turn" && Array.isArray(splice["inserted"]) && splice["inserted"].length > 0) {
						openTurn = null;
						nextTurn += 1;
					}
				}
				if (openTurn !== null || data["turn"] !== nextTurn) throw new SessionFormatError(`turn/start ${JSON.stringify(data["turn"])} does not open expected turn ${nextTurn}`);
				openTurn = data["turn"];
				openStep = null;
				toolLifecycles.clear();
				nextStep = 1;
				break;
			}
			case "turn/end":
				if (openTurn !== data["turn"]) throw new SessionFormatError(`turn/end ${JSON.stringify(data["turn"])} has no matching open turn`);
				assertNoUnresolvedTools(toolLifecycles, "turn/end");
				if (openStep !== null) throw new SessionFormatError(`turn/end ${JSON.stringify(data["turn"])} crosses an open step`);
				openTurn = null;
				nextTurn += 1;
				break;
			case "step/start":
				if (openTurn !== data["turn"] || openStep !== null || data["step"] !== nextStep) throw new SessionFormatError(`${event.type} does not match the open turn and next step`);
				openStep = data["step"];
				break;
			case "step/end":
				requireOpenStep(event, data, openTurn, openStep);
				assertNoUnresolvedTools(toolLifecycles, "step/end");
				toolLifecycles.clear();
				openStep = null;
				nextStep += 1;
				break;
			case "assistant/chunk":
				requireOpenStep(event, data, openTurn, openStep);
				break;
			case "assistant/message": {
				requireOpenStep(event, data, openTurn, openStep);
				const content = releasedV0Record(data["message"], `assistant/message ${event.seq} message`)["content"];
				for (const block of content) {
					if (block["type"] !== "tool-call") continue;
					const callId = block["id"];
					if (toolLifecycles.has(callId)) throw new SessionFormatError(`assistant/message repeats advertised tool call ${callId}`);
					toolLifecycles.set(callId, {
						name: block["name"],
						arguments: block["arguments"],
						state: "advertised"
					});
				}
				break;
			}
			case "tool/call": {
				requireOpenStep(event, data, openTurn, openStep);
				const callId = data["callId"];
				const lifecycle = toolLifecycles.get(callId);
				if (lifecycle === void 0 || lifecycle.state !== "advertised" || lifecycle.name !== data["name"] || lifecycle.arguments !== data["arguments"]) throw new SessionFormatError(`tool/call ${callId} does not match one advertised tool call`);
				lifecycle.state = "started";
				break;
			}
			case "tool/result":
				if (event["surfaceOp"] === "append") {
					requireOpenStep(event, data, openTurn, openStep);
					const message = releasedV0Record(data["message"], `tool/result ${event.seq} message`);
					const callId = releasedV0Record(message["source"], `tool/result ${event.seq} source`)["callId"];
					const content = message["content"];
					const error = data["error"] === void 0 ? void 0 : releasedV0Record(data["error"], `tool/result ${event.seq} error`);
					const lifecycle = toolLifecycles.get(callId);
					if (lifecycle === void 0) throw new SessionFormatError(`tool/result ${callId} has no advertised tool lifecycle`);
					if (lifecycle.state === "advertised" && !isExactToolNotStartedRepair(event, content, error)) throw new SessionFormatError(`tool/result ${callId} is not the exact TOOL_NOT_STARTED repair`);
					toolLifecycles.delete(callId);
				} else if (openTurn === null) throw new SessionFormatError("tool/result replacement is outside an open turn");
				break;
			case "request/header":
				if (openTurn === null) throw new SessionFormatError(`${event.type} is outside an open turn`);
				openStepProvider = data["header"]["config"]["provider"];
				break;
			case "request/context":
				if (openTurn === null) throw new SessionFormatError(`${event.type} is outside an open turn`);
				break;
			case "tool/code-dispatch-start":
			case "tool/code-dispatch": {
				if (openTurn === null) throw new SessionFormatError(`${event.type} is outside an open turn`);
				const root = data["rootCallId"];
				const parent = data["parentCallId"];
				const child = data["subCallId"];
				const known = ptcRoots.get(child);
				if (known !== void 0 && known !== root) throw new SessionFormatError(`${event.type} changes its rootCallId`);
				if (parent !== root && ptcRoots.get(parent) !== root) throw new SessionFormatError(`${event.type} parentCallId does not belong to rootCallId`);
				if (event.type === "tool/code-dispatch-start") {
					if (ptcStarts.has(child)) throw new SessionFormatError("tool/code-dispatch-start repeats subCallId");
					ptcStarts.set(child, {
						root,
						parent,
						name: data["name"],
						arguments: data["arguments"],
						settled: false
					});
				} else {
					const start = ptcStarts.get(child);
					if (start === void 0 || start.settled) throw new SessionFormatError("tool/code-dispatch has no unique start");
					if (start.root !== root || start.parent !== parent || start.name !== data["name"] || !deepEqualJson(start.arguments, data["arguments"])) throw new SessionFormatError("tool/code-dispatch does not match its start");
					start.settled = true;
				}
				ptcRoots.set(child, root);
				break;
			}
			case "llm/retry":
				if (openTurn !== data["turn"] || data["step"] !== (openStep ?? nextStep - 1) || openTurn === null) throw new SessionFormatError("llm/retry does not match the current turn and step");
				if (data["provider"] !== openStepProvider) throw new SessionFormatError("llm/retry provider does not match the open request/header");
				assertRetryChain(retries, data);
				retries.push(event);
				break;
			case "llm/retry-started": {
				const scheduled = retries.find((candidate) => {
					const prior = candidate.data;
					return prior["retryId"] === data["retryId"] && prior["retry"] === data["retry"];
				});
				if (scheduled === void 0) throw new SessionFormatError("llm/retry-started pairs no prior scheduled attempt");
				const prior = scheduled.data;
				if (prior["turn"] !== data["turn"] || prior["step"] !== data["step"]) throw new SessionFormatError("llm/retry-started does not match its scheduled turn and step");
				const key = `${JSON.stringify(data["retryId"])}\0${JSON.stringify(data["retry"])}`;
				if (retryStarts.has(key)) throw new SessionFormatError("llm/retry-started repeats one scheduled attempt");
				retryStarts.add(key);
				break;
			}
			case "session/title":
			case "session/title-llm-request":
				assertTitleSources(artifact.events, event, data, extensions.preservedSourceTitleRequestText !== true);
				break;
			case "command/run": {
				const id = data["commandId"];
				if (commandRuns.has(id)) throw new SessionFormatError(`command/run repeats commandId ${id}`);
				commandRuns.add(id);
				break;
			}
			case "command/done": {
				const id = data["commandId"];
				if (!commandRuns.has(id)) throw new SessionFormatError(`command/done ${id} has no prior command/run`);
				const sourceSeq = data["sourceEventSeq"];
				if (sourceSeq !== void 0) {
					const source = artifact.events[sourceSeq];
					if (data["kind"] !== "success" || source?.type === "command/run" || source?.type === "command/done") throw new SessionFormatError(`command/done ${id} has invalid sourceEventSeq`);
				}
				break;
			}
			case "session-log-deepseek/delivery-accepted":
				if ((data["sessionFormatVersion"] ?? 0) === artifact.header.version) {
					if (!(artifact.header.parentSession !== void 0 && event.seq < artifact.inheritedEventCount) && data["sessionId"] !== artifact.header.id) throw new SessionFormatError("current-generation delivery marker names the wrong Session");
				}
				break;
			case "compaction/start":
				if (openCompaction !== void 0) throw new SessionFormatError("compaction/start overlaps an open compaction");
				assertCompactionTurn(data["turn"], openTurn, "compaction/start");
				openCompaction = {
					id: data["compactionId"],
					...data["sourceCommandId"] === void 0 ? {} : { sourceCommandId: data["sourceCommandId"] },
					turn: data["turn"],
					startSeq: event.seq,
					summarized: false
				};
				break;
			case "compaction/summary":
				assertCompactionOwner(openCompaction, data, "compaction/summary");
				assertCompactionTurn(openCompaction?.turn, openTurn, "compaction/summary");
				if (openCompaction?.summarized === true) throw new SessionFormatError("compaction/summary repeats");
				assertCurrentSurfaceSpan(surface, data, "compaction/summary");
				openCompaction = {
					...openCompaction,
					summarized: true
				};
				break;
			case "compaction/end":
				assertCompactionOwner(openCompaction, data, "compaction/end");
				if (data["turn"] !== openCompaction?.turn) throw new SessionFormatError("compaction/end changes its owner turn");
				assertCompactionTurn(openCompaction?.turn, openTurn, "compaction/end");
				if (data["error"] === void 0 && openCompaction?.summarized !== true) throw new SessionFormatError("successful compaction/end requires one summary");
				openCompaction = void 0;
				break;
			case "compaction/prune":
				assertCurrentSurfaceSpan(surface, data, "compaction/prune");
				break;
			case "user/message": {
				const source = releasedV0Record(data["source"], `user/message ${event.seq} source`);
				if (event["surfaceOp"] !== "append" && source["kind"] === "plugin" && source["plugin"] === "compact") assertCompactionOwner(openCompaction, source, `compaction checkpoint at seq ${event.seq}`);
				break;
			}
			case "session/end-seed":
				openCompaction = void 0;
				break;
		}
	}
}
function inheritedOrphanCompactionStarts(events) {
	const stale = /* @__PURE__ */ new Set();
	let open;
	for (const event of events) if (event.type === "compaction/start") open = event.seq;
	else if (event.type === "compaction/end") open = void 0;
	else if (event.type === "session/end-seed") {
		if (open !== void 0) stale.add(open);
		open = void 0;
	}
	return stale;
}
function assertRetryChain(retries, data) {
	const prior = [...retries].reverse().find((candidate) => {
		const value = candidate.data;
		return value["turn"] === data["turn"] && value["step"] === data["step"] && value["provider"] === data["provider"] && value["policyKey"] === data["policyKey"];
	});
	const expected = ((prior?.data)?.["retry"] ?? 0) + 1;
	if (data["retry"] !== expected) throw new SessionFormatError(`llm/retry must use retry ${expected}`);
	if (prior !== void 0 && prior.data["retryId"] !== data["retryId"]) throw new SessionFormatError("llm/retry must preserve retryId across one policy chain");
	if (prior === void 0 && retries.some((candidate) => candidate.data["retryId"] === data["retryId"])) throw new SessionFormatError(`llm/retry reuses retryId ${JSON.stringify(data["retryId"])} across policy chains`);
}
function requireOpenStep(event, data, openTurn, openStep) {
	if (data["turn"] !== openTurn || data["step"] !== openStep || openTurn === null || openStep === null) throw new SessionFormatError(`${event.type} does not match an open turn and step`);
}
function assertNoUnresolvedTools(lifecycles, boundary) {
	const unresolved = lifecycles.keys().next().value;
	if (unresolved !== void 0) throw new SessionFormatError(`${boundary} leaves unresolved tool call ${unresolved}`);
}
function isExactToolNotStartedRepair(event, content, error) {
	const message = event.data["message"];
	const callId = message["source"]["callId"];
	const block = content[0];
	const repairContent = block?.["content"];
	return error?.["name"] === "ToolNotStartedError" && error["code"] === "TOOL_NOT_STARTED" && event["sourceEventSeqs"] === void 0 && message["id"] === `interrupted-tool-result-${callId}-${event.seq}` && block?.["isError"] === true && repairContent?.length === 1 && repairContent[0]?.["type"] === "text" && repairContent[0]["text"] === "The tool call was interrupted before the Harness recorded it as started. Retry it if it is still needed.";
}
function applySurface(surface, event) {
	const operation = event["surfaceOp"];
	if (operation === void 0) throw new SessionFormatError(`${event.type} requires a surfaceOp marker`);
	if (operation === "append") return [...surface, event.seq];
	const replace = operation;
	const start = surface.indexOf(replace.start);
	const end = surface.indexOf(replace.end);
	if (start < 0 || end < start) throw new SessionFormatError(`${event.type} replacement range is not on the current surface`);
	const shadowed = surface.slice(start, end + 1);
	const sources = new Set(Array.isArray(event["sourceEventSeqs"]) ? event["sourceEventSeqs"] : []);
	if (shadowed.some((seq) => !sources.has(seq))) throw new SessionFormatError(`${event.type} replacement sourceEventSeqs omit a shadowed surface node`);
	return [
		...surface.slice(0, start),
		event.seq,
		...surface.slice(end + 1)
	];
}
function assertTitleSources(events, event, data, validateFramedText) {
	const seqs = data["messageSeqs"];
	if (event.type === "session/title") {
		const titleSource = releasedV0Record(data["source"], `session/title ${event.seq} source`);
		if (seqs.length === 0 !== (titleSource["kind"] === "user")) throw new SessionFormatError(`session/title ${event.seq} messageSeqs must be empty exactly for a user title`);
	}
	const selected = [];
	for (const seq of seqs) {
		const source = events[seq];
		if (source?.type !== "user/message") throw new SessionFormatError(`${event.type} ${event.seq} messageSeqs must cite earlier human user/message events`);
		const sourceData = releasedV0Record(source.data, `${source.type} ${seq} data`);
		if (releasedV0Record(sourceData["source"], `${source.type} ${seq} source`)["kind"] !== "user") throw new SessionFormatError(`${event.type} ${event.seq} messageSeqs must cite earlier human user/message events`);
		const content = sourceData["content"];
		selected.push({
			seq,
			text: content.flatMap((block) => block["type"] === "text" && typeof block["text"] === "string" ? [block["text"]] : []).join("\n")
		});
	}
	if (event.type === "session/title-llm-request") {
		const messages = data["messages"];
		const expected = `Generate the session title from this JSON array of human messages:\n${JSON.stringify(selected)}`;
		const message = messages[0];
		const content = message?.["content"];
		const source = message === void 0 ? void 0 : releasedV0Record(message["source"], "session/title-llm-request message source");
		if (messages.length !== 1 || message?.["role"] !== "user" || content?.length !== 1 || source?.["kind"] !== "plugin" || source["plugin"] !== "dsh-session-title-llm") throw new SessionFormatError("session/title-llm-request messages do not represent messageSeqs");
		const framed = content[0];
		if (framed === void 0 || framed["type"] !== "text" || validateFramedText && framed["text"] !== expected) throw new SessionFormatError("session/title-llm-request messages do not represent messageSeqs");
	}
}
function assertCompactionOwner(open, data, type) {
	if (open === void 0 || data["compactionId"] !== open.id || data["sourceCommandId"] !== open.sourceCommandId) throw new SessionFormatError(`${type} has no matching compaction/start`);
}
function assertCompactionTurn(owner, openTurn, type) {
	if (owner === null ? openTurn !== null : owner !== openTurn) throw new SessionFormatError(`${type} does not match the open turn`);
}
function assertCurrentSurfaceSpan(surface, data, type) {
	const range = data["shadowedRange"];
	const seqs = data["shadowedSeqs"];
	const start = surface.indexOf(range.start);
	const end = surface.indexOf(range.end);
	const expected = start < 0 || end < start ? [] : surface.slice(start, end + 1);
	if (expected.length !== seqs.length || expected.some((seq, index) => seq !== seqs[index])) throw new SessionFormatError(`${type} shadowedSeqs do not name an exact current surface span`);
}
//#endregion
//#region ../session-format-v1-to-v2/src/dispositions.ts
const retained = Object.fromEntries(Object.entries(RELEASED_V0_EVENT_DISPOSITIONS).filter(([type]) => type !== "assistant/chunk" && type !== "assistant/message" && type !== "session-log-deepseek/delivery-accepted" && type !== "session/end-seed"));
/** Exact top-level event and payload-member inventory frozen for released v2. */
const RELEASED_V2_EVENT_DISPOSITIONS = Object.freeze({
	...retained,
	"assistant/attempt": defineReleasedPayloadDisposition([
		"turn",
		"step",
		"stream"
	]),
	"assistant/message": defineReleasedPayloadDisposition([
		"turn",
		"step",
		"message",
		"stream"
	], ["usage", "interrupted"]),
	"session-log-deepseek/delivery-accepted": defineReleasedPayloadDisposition(["sessionId", "throughSeq"], ["sessionFormatVersion"]),
	"session/end-seed": defineReleasedPayloadDisposition([], ["inherited"])
});
Object.freeze(Object.keys(RELEASED_V2_EVENT_DISPOSITIONS).sort((left, right) => left.localeCompare(right, "en")));
//#endregion
//#region ../session-format-v1-to-v2/src/validation.ts
const HEADER_REQUIRED$1 = [
	"version",
	"id",
	"createdAt",
	"isSeeded",
	"delegationDepth"
];
const HEADER_OPTIONAL$1 = [
	"cwd",
	"parentSession",
	"origin",
	"agentPreset"
];
const EVENT_REQUIRED$1 = [
	"type",
	"seq",
	"time",
	"data"
];
const SURFACE_TYPES$1 = new Set([
	"user/message",
	"assistant/message",
	"tool/result"
]);
const SURFACE_OPTIONAL = [
	"ignorable",
	"sourceEventSeqs",
	"surfaceOp"
];
const LOG_OPTIONAL = ["ignorable"];
const RELEASED_V2_RELATIONSHIP_EXTENSIONS = {
	stepEvents: new Set(["assistant/attempt"]),
	preservedSourceTitleRequestText: true
};
/**
* Validate the exact logical header written by released v2.
* @param header - decoded released-v2 Session header.
* @throws {SessionFormatError} when the header is not an exact released-v2 value.
*/
function assertReleasedV2Header(header) {
	const record = releasedV2Record(header, "format v2 header");
	assertReleasedV2Keys(record, HEADER_REQUIRED$1, HEADER_OPTIONAL$1, "format v2 header");
	if (record["version"] !== 2) throw new SessionFormatError("expected format v2 header");
	if (typeof record["id"] !== "string") throw new SessionFormatError("format v2 header id must be a string");
	sessionFormatCount(record["createdAt"], "format v2 header createdAt");
	sessionFormatCount(record["delegationDepth"], "format v2 header delegationDepth");
	if (typeof record["isSeeded"] !== "boolean") throw new SessionFormatError("format v2 header isSeeded must be boolean");
	if (record["cwd"] !== void 0 && (typeof record["cwd"] !== "string" || !(0, node_path.isAbsolute)(record["cwd"]))) throw new SessionFormatError("format v2 header cwd must be absolute");
	for (const key of ["parentSession", "agentPreset"]) if (record[key] !== void 0 && typeof record[key] !== "string") throw new SessionFormatError(`format v2 header ${key} must be a string`);
	if (record["origin"] !== void 0 && record["origin"] !== "subagent") throw new SessionFormatError("format v2 header origin must be \"subagent\"");
}
function validateReleasedV2Artifact(artifact, mode, knownEventTypes, relationshipHeaderVersion = artifact.header.version) {
	assertReleasedV2Header(artifact.header);
	const cut = sessionFormatCount(artifact.inheritedEventCount, "format v2 inherited event count");
	if (cut > artifact.events.length) throw new SessionFormatError("format v2 inherited event count exceeds its events");
	if (!artifact.header.isSeeded && cut !== 0) throw new SessionFormatError("unseeded format v2 Session has inherited events");
	let lastInheritedMarker;
	for (const [index, event] of artifact.events.entries()) {
		const record = releasedV2Record(event, `format v2 event ${index}`);
		const type = record["type"];
		if (typeof type !== "string") throw new SessionFormatError(`format v2 event ${index} type must be a string`);
		const disposition = RELEASED_V2_EVENT_DISPOSITIONS[type];
		const installed = knownEventTypes?.has(type) === true;
		const ignorableUnknown = disposition === void 0 && record["ignorable"] === true;
		if (mode === "current" && disposition === void 0 && !installed && !ignorableUnknown) throw new SessionFormatUnsupportedMigrationError(`format v2 contains unknown event type ${JSON.stringify(type)} at seq ${index}`);
		const surface = disposition !== void 0 && SURFACE_TYPES$1.has(type);
		assertReleasedV2Keys(record, EVENT_REQUIRED$1, mode === "physical" || disposition === void 0 ? SURFACE_OPTIONAL : surface ? SURFACE_OPTIONAL : LOG_OPTIONAL, `format v2 event ${index}`);
		if (record["seq"] !== index) throw new SessionFormatError(`format v2 event ${index} is not dense`);
		sessionFormatSafeInteger(record["time"], `format v2 event ${index} time`);
		if (record["ignorable"] !== void 0 && record["ignorable"] !== true) throw new SessionFormatError(`format v2 event ${index} ignorable must be true when present`);
		if (type === "session/end-seed") {
			if (releasedV2Record(event.data, `session/end-seed ${index} data`)["inherited"] === true) lastInheritedMarker = index;
		}
	}
	if (artifact.header.isSeeded && lastInheritedMarker !== cut) throw new SessionFormatError("format v2 seeded header disagrees with its last inherited end-seed marker");
	if (!artifact.header.isSeeded && lastInheritedMarker !== void 0) throw new SessionFormatError("format v2 unseeded Session contains an inherited end-seed marker");
	if (mode === "current") assertReleasedArtifactRelationships({
		...artifact,
		header: {
			...artifact.header,
			version: relationshipHeaderVersion
		}
	}, RELEASED_V2_RELATIONSHIP_EXTENSIONS);
}
/**
* Require one released-v2 value to be a JSON object.
* @param value - value to narrow.
* @param label - diagnostic subject.
* @returns the narrowed object.
*/
function releasedV2Record(value, label) {
	if (typeof value !== "object" || value === null || Array.isArray(value)) throw new SessionFormatError(`${label} must be an object`);
	return value;
}
/**
* Require one released-v2 object to contain exactly the admitted keys.
* @param value - object to inspect.
* @param required - keys that must be present.
* @param optional - additional keys that may be present.
* @param label - diagnostic subject.
*/
function assertReleasedV2Keys(value, required, optional, label) {
	const allowed = new Set([...required, ...optional]);
	const missing = required.find((key) => !Object.hasOwn(value, key));
	if (missing !== void 0) throw new SessionFormatError(`${label} lacks required field ${missing}`);
	const unexpected = Object.keys(value).find((key) => !allowed.has(key));
	if (unexpected !== void 0) throw new SessionFormatError(`${label} has unexpected field ${unexpected}`);
}
/**
* Restore and validate one decoded released-v2 artifact.
* @param artifact - detached vocabulary-restored artifact.
* @param knownEventTypes - event types understood by the installed current Session package.
* @param relationshipHeaderVersion - logical generation whose version-sensitive relationships are checked.
* @returns the same validated artifact.
*/
function restoreReleasedV2Artifact(artifact, knownEventTypes, relationshipHeaderVersion = artifact.header.version) {
	validateReleasedV2Artifact(artifact, "current", knownEventTypes, relationshipHeaderVersion);
	return artifact;
}
//#endregion
//#region ../session-format-v1-to-v2/src/codec.ts
const HEADER_REQUIRED = [
	"type",
	"version",
	"id",
	"createdAt",
	"isSeeded",
	"delegationDepth"
];
const HEADER_OPTIONAL = [
	"cwd",
	"parentSession",
	"origin",
	"agentPreset"
];
const EVENT_REQUIRED = [
	"type",
	"seq",
	"time",
	"data"
];
const EVENT_OPTIONAL = [
	"ignorable",
	"sourceEventSeqs",
	"surfaceOp"
];
const EVENT_KEYS = new Set([...EVENT_REQUIRED, ...EVENT_OPTIONAL]);
/** Frozen physical JSON codec for released v2. */
const releasedV2SessionFormatCodec = Object.freeze({
	version: 2,
	decodeHeader(value) {
		return decodePhysicalHeader(value);
	},
	createDecoder(headerValue, recovery) {
		return createDecoder(headerValue, recovery);
	},
	encodeHeader(header, inheritedEventCount) {
		return encodeHeader(header, inheritedEventCount);
	},
	encodeEvent(event) {
		return encodeProvenance(event);
	}
});
function decodePhysicalHeader(value) {
	const record = jsonRecord(snapshotSessionFormatJson(value, "released v2 physical header"), "released v2 physical header");
	exactKeys(record, HEADER_REQUIRED, HEADER_OPTIONAL, "released v2 physical header");
	if (record["type"] !== "session" || record["version"] !== 2) throw new SessionFormatError("expected released v2 physical Session header");
	if (typeof record["id"] !== "string") throw new SessionFormatError("released v2 header id must be a string");
	const createdAt = sessionFormatCount(record["createdAt"], "released v2 header createdAt");
	const delegationDepth = sessionFormatCount(record["delegationDepth"], "released v2 header delegationDepth");
	if (typeof record["isSeeded"] !== "boolean") throw new SessionFormatError("released v2 header isSeeded must be boolean");
	for (const key of [
		"cwd",
		"parentSession",
		"agentPreset"
	]) if (record[key] !== void 0 && typeof record[key] !== "string") throw new SessionFormatError(`released v2 header ${key} must be a string`);
	if (record["origin"] !== void 0 && record["origin"] !== "subagent") throw new SessionFormatError("released v2 header origin must be \"subagent\"");
	const header = snapshotSessionFormatJson({
		version: 2,
		id: record["id"],
		createdAt,
		...record["cwd"] === void 0 ? {} : { cwd: record["cwd"] },
		...record["parentSession"] === void 0 ? {} : { parentSession: record["parentSession"] },
		isSeeded: record["isSeeded"],
		...record["origin"] === void 0 ? {} : { origin: record["origin"] },
		delegationDepth,
		...record["agentPreset"] === void 0 ? {} : { agentPreset: record["agentPreset"] }
	}, "released v2 logical header");
	assertReleasedV2Header(header);
	return header;
}
function createDecoder(headerValue, recovery) {
	const header = decodePhysicalHeader(headerValue);
	let rowIndex = 0;
	let eventCount = 0;
	let inheritedEventCount;
	let issue;
	return {
		header,
		decodeRow(value, context) {
			const currentRow = rowIndex;
			rowIndex += 1;
			let event;
			try {
				event = decodeEvent(value, currentRow);
			} catch (error) {
				const current = error instanceof SessionFormatError ? error : new SessionFormatError(`released v2 row ${currentRow} is malformed`, { cause: error });
				if (recovery === "strict") throw current;
				issue ??= current;
				return;
			}
			if (issue !== void 0) {
				if (event.type === "turn/end") throw issue;
				return;
			}
			if (event.seq !== eventCount) {
				const gap = new SessionFormatError(`released v2 row ${currentRow} has seq gap (expected ${eventCount}, got ${event.seq})`);
				if (recovery === "strict") throw gap;
				issue = gap;
				if (event.type === "turn/end") throw issue;
				return;
			}
			eventCount += 1;
			if (event.type === "session/end-seed") {
				if (jsonRecord(event.data, `session/end-seed ${event.seq} data`)["inherited"] === true) inheritedEventCount = event.seq;
			}
			context.emitEvent(event);
		},
		finish(_context) {
			if (header.isSeeded && inheritedEventCount === void 0) throw new SessionFormatError("released v2 seeded Session lacks an inherited end-seed marker");
			if (!header.isSeeded && inheritedEventCount !== void 0) throw new SessionFormatError("released v2 unseeded Session contains an inherited end-seed marker");
			return inheritedEventCount ?? 0;
		}
	};
}
function decodeEvent(value, rowIndex) {
	const record = jsonRecord(value, `released v2 row ${rowIndex}`);
	const missing = EVENT_REQUIRED.find((key) => !Object.hasOwn(record, key));
	if (missing !== void 0) throw new SessionFormatError(`released v2 row ${rowIndex} lacks required field ${missing}`);
	const unexpected = Object.keys(record).find((key) => !EVENT_KEYS.has(key));
	if (unexpected !== void 0) throw new SessionFormatError(`released v2 row ${rowIndex} has unexpected field ${unexpected}`);
	if (typeof record["type"] !== "string") throw new SessionFormatError(`released v2 row ${rowIndex} type must be a string`);
	sessionFormatSafeInteger(record["time"], `released v2 row ${rowIndex} time`);
	if (record["ignorable"] !== void 0 && record["ignorable"] !== true) throw new SessionFormatError(`released v2 row ${rowIndex} ignorable must be true when present`);
	if (record["sourceEventSeqs"] === void 0) return record;
	const seq = sessionFormatCount(record["seq"], `released v2 row ${rowIndex} seq`);
	return {
		...record,
		sourceEventSeqs: decodeSeqRanges(record["sourceEventSeqs"], seq)
	};
}
function encodeHeader(header, inheritedEventCount) {
	assertReleasedV2Header(header);
	const cut = sessionFormatCount(inheritedEventCount, "format v2 inherited event count");
	if (!header.isSeeded && cut !== 0) throw new SessionFormatError("unseeded format v2 Session has inherited events");
	return {
		type: "session",
		version: 2,
		id: header.id,
		createdAt: header.createdAt,
		...header.cwd === void 0 ? {} : { cwd: header.cwd },
		...header.parentSession === void 0 ? {} : { parentSession: header.parentSession },
		isSeeded: header.isSeeded,
		...header.origin === void 0 ? {} : { origin: header.origin },
		delegationDepth: header.delegationDepth,
		...header.agentPreset === void 0 ? {} : { agentPreset: header.agentPreset }
	};
}
function encodeProvenance(event) {
	if (event.sourceEventSeqs === void 0) return event;
	return {
		...event,
		sourceEventSeqs: encodeSeqRanges(event.sourceEventSeqs)
	};
}
function decodeSeqRanges(value, maxEntries) {
	if (!Array.isArray(value)) throw new SessionFormatError("sourceEventSeqs must be an array");
	const output = [];
	let hasRange = false;
	for (const entry of value) {
		if (!Array.isArray(entry)) {
			output.push(sessionFormatCount(entry, "sourceEventSeqs member"));
			continue;
		}
		if (entry.length !== 2) throw new SessionFormatError("sourceEventSeqs range must be a [start, end] pair");
		const start = sessionFormatCount(entry[0], "sourceEventSeqs range start");
		const end = sessionFormatCount(entry[1], "sourceEventSeqs range end");
		if (start > end || end >= maxEntries || end - start + 1 > maxEntries - output.length) throw new SessionFormatError("sourceEventSeqs range exceeds its event seq");
		for (let current = start; current <= end; current += 1) output.push(current);
		hasRange = true;
	}
	const seen = /* @__PURE__ */ new Set();
	for (const source of output) {
		if (source >= maxEntries || seen.has(source)) throw new SessionFormatError("sourceEventSeqs ranges must contain unique earlier seqs");
		seen.add(source);
	}
	if (hasRange && output.some((source, index) => index > 0 && source <= output[index - 1])) throw new SessionFormatError("sourceEventSeqs ranges must be strictly increasing");
	return output;
}
function encodeSeqRanges(values) {
	if (values.some((value, index) => index > 0 && value <= values[index - 1])) return [...values];
	const output = [];
	for (let index = 0; index < values.length;) {
		const start = values[index];
		let end = start;
		while (index + 1 < values.length && values[index + 1] === end + 1) {
			index += 1;
			end += 1;
		}
		output.push(end - start >= 2 ? [start, end] : start);
		if (end - start === 1) output.push(end);
		index += 1;
	}
	return output;
}
function jsonRecord(value, label) {
	if (typeof value !== "object" || value === null || Array.isArray(value)) throw new SessionFormatError(`${label} must be an object`);
	return value;
}
function exactKeys(record, required, optional, label) {
	const allowed = new Set([...required, ...optional]);
	const missing = required.find((key) => !Object.hasOwn(record, key));
	if (missing !== void 0) throw new SessionFormatError(`${label} lacks ${missing}`);
	const unexpected = Object.keys(record).find((key) => !allowed.has(key));
	if (unexpected !== void 0) throw new SessionFormatError(`${label} has unexpected field ${unexpected}`);
}
//#endregion
//#region ../session-format-v1-to-v2/src/migration.ts
const CHUNK_EVENT_REQUIRED = [
	"type",
	"seq",
	"time",
	"data"
];
const CHUNK_EVENT_OPTIONAL = [
	"ignorable",
	"sourceEventSeqs",
	"surfaceOp"
];
const CHUNK_EVENT_KEYS = new Set([...CHUNK_EVENT_REQUIRED, ...CHUNK_EVENT_OPTIONAL]);
/** Adjacent migration that embeds released-v1 top-level Assistant chunks into v2 attempt events. */
const sessionFormatV1ToV2 = defineSessionFormatMigration({
	name: "@deepseek-ai/dsh-session-format-v1-to-v2",
	fromVersion: 1,
	toVersion: 2,
	migrateHeader(header) {
		assertReleasedV1Header(header);
		return {
			...header,
			version: 2
		};
	},
	createStage(input) {
		return input.sourceKind === "decoded" ? new DecodedReleasedV1ToV2Stage(input) : new TransformedReleasedV1ToV2Stage(input);
	},
	validateTargetHeader: assertReleasedV2Header
});
var TransformedReleasedV1ToV2Stage = class {
	state;
	constructor(input) {
		assertReleasedV1Header(input.sourceHeader);
		this.state = {
			sourceHeader: input.sourceHeader,
			sourceCut: sessionFormatCount(input.sourceInheritedEventCount, "format v1 inherited event count"),
			mapping: /* @__PURE__ */ new Map(),
			legacyTurns: legacyTurnState(),
			pending: void 0,
			targetSeq: 0,
			targetCut: input.sourceHeader.isSeeded ? void 0 : 0,
			lastTime: input.sourceHeader.createdAt
		};
	}
	transformEvent(event, context) {
		transformReleasedEvent(this.state, event, context);
	}
	transformRun(run, context) {
		transformReleasedRun(this.state, run, context);
	}
	finish(context) {
		return finishMigration(this.state, context);
	}
};
var DecodedReleasedV1ToV2Stage = class extends TransformedReleasedV1ToV2Stage {
	transformEvent(event, context) {
		if (event.type !== "assistant/chunk" && RELEASED_V0_EVENT_DISPOSITIONS[event.type] !== void 0) assertReleasedEventPayload(event, 1);
		super.transformEvent(event, context);
	}
};
function transformReleasedEvent(state, event, context) {
	if (event.type === "assistant/chunk") assertChunkEnvelope(event);
	if (RELEASED_V0_EVENT_DISPOSITIONS[event.type] === void 0) throw refusal(`format v1 contains unknown event type ${JSON.stringify(event.type)} at seq ${event.seq}`);
	const interrupted = legacyInterruptedTurn(state.legacyTurns, event);
	if (event.type === "turn/start" && state.legacyTurns.openTurn !== null && interrupted === void 0) throw refusal(`turn/start ${JSON.stringify(record$1(event.data)["turn"])} does not close the prior turn`);
	assertSourceDeliveryMarker(state, event);
	observeLegacyTurn(state.legacyTurns, event);
	state.lastTime = event.time;
	if (interrupted !== void 0) {
		finishAttempt(state, context);
		emitGenerated(state, event.seq, interrupted, context);
	}
	const legacyGoal = splitLegacyGoalChange(event);
	if (legacyGoal !== void 0) {
		emitGenerated(state, event.seq, legacyGoal.change, context);
		emitSource(state, legacyGoal.message, context);
		return;
	}
	if (event.type === "assistant/chunk") {
		transformChunk(state, event, context);
		return;
	}
	if (event.type === "assistant/message") {
		transformMessage(state, event, context);
		return;
	}
	if (closesAttempt(event)) {
		finishAttempt(state, context);
		emitSource(state, event, context);
		return;
	}
	if (state.pending !== void 0) {
		state.pending.afterLastChunk.push(event);
		return;
	}
	emitSource(state, event, context);
}
function assertChunkEnvelope(event) {
	const unexpected = Object.keys(event).find((key) => !CHUNK_EVENT_KEYS.has(key));
	if (unexpected !== void 0) throw refusal(`assistant/chunk ${event.seq} has unexpected member ${unexpected}`);
	const missing = CHUNK_EVENT_REQUIRED.find((key) => !Object.hasOwn(event, key));
	if (missing !== void 0) throw refusal(`assistant/chunk ${event.seq} lacks required member ${missing}`);
	if (event.ignorable !== void 0 && event.ignorable !== true) throw refusal(`assistant/chunk ${event.seq} ignorable must be true when present`);
}
function assertSourceDeliveryMarker(state, event) {
	if (event.type !== "session-log-deepseek/delivery-accepted") return;
	const data = record$1(event.data);
	const inherited = state.sourceHeader.parentSession !== void 0 && event.seq < state.sourceCut;
	if (data["sessionFormatVersion"] === 1 && !inherited && data["sessionId"] !== state.sourceHeader.id) throw refusal("current-generation delivery marker names the wrong Session");
}
function transformReleasedRun(state, run, context) {
	if (!isReleasedAssistantChunkRun(run)) {
		for (const event of run.expand()) transformReleasedEvent(state, event, context);
		return;
	}
	state.legacyTurns.previous = void 0;
	state.lastTime = run.lastTime;
	if (state.pending !== void 0 && (state.pending.group.terminal || state.pending.group.turn !== run.turn || state.pending.group.step !== run.step)) finishAttempt(state, context);
	else if (state.pending !== void 0) flushBuffered(state, state.pending, context);
	state.pending ??= {
		group: attemptGroup(run.turn, run.step),
		afterLastChunk: []
	};
	assertAttemptRange(state, run.firstSeq, run.lastSeq);
	flushAccumulator(state.pending.group);
	appendStreamRecord(state.pending.group, run.stream, run.lastTime);
	recordChunkSpan(state.pending.group, run.firstSeq, run.eventCount, run.lastTime);
}
function finishMigration(state, context) {
	finishAttempt(state, context);
	if (state.sourceHeader.isSeeded && state.targetCut === void 0) {
		state.targetCut = state.targetSeq;
		context.emitEvent({
			type: "session/end-seed",
			seq: state.targetSeq,
			time: state.lastTime,
			data: { inherited: true }
		});
		state.targetSeq += 1;
	}
	return state.targetCut;
}
function transformChunk(state, event, context) {
	const data = record$1(event.data);
	const turn = coordinate(data["turn"]);
	const step = coordinate(data["step"]);
	const chunk = record$1(data["chunk"]);
	if (state.pending !== void 0 && (state.pending.group.terminal || state.pending.group.turn !== turn || state.pending.group.step !== step)) finishAttempt(state, context);
	else if (state.pending !== void 0) flushBuffered(state, state.pending, context);
	state.pending ??= {
		group: attemptGroup(turn, step),
		afterLastChunk: []
	};
	assertAttemptCut(state, state.pending.group, event.seq);
	state.pending.group.accumulator ??= new AssistantStreamAccumulator();
	state.pending.group.accumulator.push({
		time: event.time,
		chunk: data["chunk"]
	});
	recordChunkSpan(state.pending.group, event.seq, 1, event.time);
	if (chunk["type"] === "finish") state.pending.group.terminal = true;
}
function transformMessage(state, event, context) {
	const data = record$1(event.data);
	const turn = coordinate(data["turn"]);
	const step = coordinate(data["step"]);
	const sources = event.sourceEventSeqs;
	const pending = state.pending;
	if (pending !== void 0 && (pending.group.turn !== turn || pending.group.step !== step)) {
		finishAttempt(state, context);
		emitSource(state, messageEvent(event, attemptGroup(turn, step)), context);
		return;
	}
	if (!Array.isArray(sources)) {
		if (pending !== void 0) throw refusal(`assistant/message ${event.seq} does not cite its complete v1 chunk attempt`);
		emitSource(state, messageEvent(event, attemptGroup(turn, step)), context);
		return;
	}
	if (sources.length === 0) {
		finishAttempt(state, context);
		emitSource(state, messageEvent(event, attemptGroup(turn, step)), context);
		return;
	}
	if (pending === void 0 || !matchesChunkSources(pending.group, sources)) throw refusal(`assistant/message ${event.seq} chunk provenance is not one complete ordered attempt`);
	assertAttemptCut(state, pending.group, event.seq);
	pending.group.terminal = true;
	flushBuffered(state, pending, context);
	emitSource(state, messageEvent(event, pending.group), context);
	state.pending = void 0;
}
function finishAttempt(state, context) {
	const pending = state.pending;
	if (pending === void 0) return;
	emitGenerated(state, pending.group.lastChunkSeq, attemptEvent(pending.group), context);
	flushBuffered(state, pending, context);
	state.pending = void 0;
}
function flushBuffered(state, pending, context) {
	for (const event of pending.afterLastChunk) emitSource(state, event, context);
	pending.afterLastChunk.length = 0;
}
function emitSource(state, event, context) {
	let source = event;
	if (state.sourceHeader.isSeeded && event.seq === state.sourceCut && event.type === "session/end-seed") source = {
		...event,
		data: { inherited: true }
	};
	ensureTargetCut(state, event.seq, event.time, source.type, context);
	state.mapping.set(event.seq, state.targetSeq);
	context.emitEvent(remapReferences(source, state.targetSeq, state.mapping));
	state.targetSeq += 1;
}
function emitGenerated(state, origin, event, context) {
	ensureTargetCut(state, origin, event.time, event.type, context);
	context.emitEvent(remapReferences(event, state.targetSeq, state.mapping));
	state.targetSeq += 1;
}
function ensureTargetCut(state, origin, time, type, context) {
	if (!state.sourceHeader.isSeeded || state.targetCut !== void 0 || origin < state.sourceCut) return;
	state.targetCut = state.targetSeq;
	if (origin === state.sourceCut && type === "session/end-seed") return;
	context.emitEvent({
		type: "session/end-seed",
		seq: state.targetSeq,
		time,
		data: { inherited: true }
	});
	state.targetSeq += 1;
}
function assertAttemptCut(state, group, member) {
	if ((group.spans[0]?.firstSeq ?? member) < state.sourceCut !== member < state.sourceCut) throw refusal(`inherited Session cut ${state.sourceCut} splits one Assistant attempt`);
}
function assertAttemptRange(state, first, last) {
	if (first < state.sourceCut !== last < state.sourceCut) throw refusal(`inherited Session cut ${state.sourceCut} splits one Assistant attempt`);
}
function legacyTurnState() {
	return {
		openTurn: null,
		openStep: null,
		previous: void 0
	};
}
function legacyInterruptedTurn(state, event) {
	if (event.type !== "turn/start" || state.openTurn === null || state.openStep !== null || coordinate(record$1(event.data)["turn"]) !== state.openTurn + 1 || state.previous?.type !== "agent/inbox/spliced") return void 0;
	const splice = record$1(state.previous.data);
	if (splice["target"] !== "next-turn" || !Array.isArray(splice["inserted"]) || splice["inserted"].length === 0) return;
	return {
		type: "turn/end",
		seq: event.seq,
		time: event.time,
		data: {
			turn: state.openTurn,
			reason: { kind: "interrupted" }
		}
	};
}
function observeLegacyTurn(state, event) {
	const data = record$1(event.data);
	if (event.type === "turn/start") {
		state.openTurn = coordinate(data["turn"]);
		state.openStep = null;
	} else if (event.type === "turn/end") {
		state.openTurn = null;
		state.openStep = null;
	} else if (event.type === "step/start") state.openStep = coordinate(data["step"]);
	else if (event.type === "step/end") state.openStep = null;
	state.previous = event;
}
function splitLegacyGoalChange(event) {
	if (event.type !== "user/message") return void 0;
	const data = record$1(event.data);
	const source = record$1(data["source"]);
	if (source["kind"] !== "goal" || source["change"] === void 0) return void 0;
	return {
		change: {
			type: "goal/change",
			seq: event.seq,
			time: event.time,
			data: source["change"]
		},
		message: {
			...event,
			data: {
				...data,
				source: {
					kind: "plugin",
					plugin: "goal"
				}
			}
		}
	};
}
function closesAttempt(event) {
	return event.type === "turn/end" || event.type === "step/end" || event.type === "llm/retry" || event.type === "llm/retry-started";
}
function attemptGroup(turn, step) {
	return {
		turn,
		step,
		spans: [],
		stream: [],
		chunkCount: 0,
		terminal: false
	};
}
function recordChunkSpan(group, firstSeq, eventCount, lastTime) {
	const previous = group.spans.at(-1);
	if (previous !== void 0 && previous.firstSeq + previous.eventCount === firstSeq) previous.eventCount += eventCount;
	else group.spans.push({
		firstSeq,
		eventCount
	});
	group.chunkCount += eventCount;
	group.lastChunkSeq = firstSeq + eventCount - 1;
	group.lastChunkTime = lastTime;
}
function matchesChunkSources(group, sources) {
	if (sources.length !== group.chunkCount) return false;
	let index = 0;
	for (const span of group.spans) for (let offset = 0; offset < span.eventCount; offset += 1) {
		if (sources[index] !== span.firstSeq + offset) return false;
		index += 1;
	}
	return true;
}
function recordLastTime(record) {
	if (record.type === "chunk") return record.time;
	return record.dt.reduce((time, gap) => time + gap, record.time0);
}
function mutableRecord(record) {
	if (record.type === "chunk") return record;
	if (record.type === "tool-call-chunks") return {
		...record,
		dt: [...record.dt],
		args: [...record.args]
	};
	return {
		...record,
		dt: [...record.dt],
		texts: [...record.texts]
	};
}
function appendStreamRecord(group, source, lastTime, owned = true) {
	const previous = group.stream.at(-1);
	if (previous === void 0 || source.type === "chunk" || previous.record.type !== source.type) {
		group.stream.push({
			record: owned ? source : mutableRecord(source),
			lastTime
		});
		return;
	}
	const gap = source.time0 - previous.lastTime;
	if (previous.record.index !== source.index || !Number.isSafeInteger(gap)) {
		group.stream.push({
			record: owned ? source : mutableRecord(source),
			lastTime
		});
		return;
	}
	if (source.type === "tool-call-chunks") {
		const target = previous.record;
		if (target.id !== source.id || target.name !== source.name) {
			group.stream.push({
				record: owned ? source : mutableRecord(source),
				lastTime
			});
			return;
		}
		target.dt.push(gap);
		for (const value of source.dt) target.dt.push(value);
		for (const value of source.args) target.args.push(value);
	} else {
		const target = previous.record;
		target.dt.push(gap);
		for (const value of source.dt) target.dt.push(value);
		for (const value of source.texts) target.texts.push(value);
	}
	previous.lastTime = lastTime;
}
function flushAccumulator(group) {
	const accumulator = group.accumulator;
	if (accumulator === void 0) return;
	for (const record of accumulator.snapshot()) appendStreamRecord(group, record, recordLastTime(record), false);
	delete group.accumulator;
}
function streamOf(group) {
	flushAccumulator(group);
	return group.stream.map(({ record }) => record);
}
function messageEvent(source, group) {
	const data = record$1(source.data);
	const { sourceEventSeqs: _sourceEventSeqs, ...event } = source;
	return {
		...event,
		data: {
			...data,
			stream: streamOf(group)
		}
	};
}
function attemptEvent(group) {
	return {
		type: "assistant/attempt",
		seq: group.lastChunkSeq,
		time: group.lastChunkTime,
		data: {
			turn: group.turn,
			step: group.step,
			stream: streamOf(group)
		}
	};
}
function remapReferences(source, targetSeq, mapping) {
	const { sourceEventSeqs, surfaceOp, ...event } = source;
	const sources = sourceEventSeqs === void 0 ? {} : { sourceEventSeqs: mapList(numberArray(sourceEventSeqs), mapping, `${source.type} ${source.seq} sources`) };
	let operation = surfaceOp;
	if (surfaceOp !== void 0 && surfaceOp !== "append") {
		const replacement = record$1(surfaceOp);
		operation = {
			op: "replace",
			start: mapOne(coordinate(replacement["start"]), mapping, `${source.type} ${source.seq} surface start`),
			end: mapOne(coordinate(replacement["end"]), mapping, `${source.type} ${source.seq} surface end`)
		};
	}
	return {
		...event,
		seq: targetSeq,
		data: remapPayloadReferences(source, mapping),
		...sources,
		...operation === void 0 ? {} : { surfaceOp: operation }
	};
}
function remapPayloadReferences(event, mapping) {
	const data = record$1(event.data);
	switch (event.type) {
		case "command/done": return data["sourceEventSeq"] === void 0 ? data : {
			...data,
			sourceEventSeq: mapOne(coordinate(data["sourceEventSeq"]), mapping, `command/done ${event.seq} sourceEventSeq`)
		};
		case "compaction/prune":
		case "compaction/summary": {
			const range = record$1(data["shadowedRange"]);
			return {
				...data,
				shadowedRange: {
					start: mapOne(coordinate(range["start"]), mapping, `${event.type} ${event.seq} shadowedRange start`),
					end: mapOne(coordinate(range["end"]), mapping, `${event.type} ${event.seq} shadowedRange end`)
				},
				shadowedSeqs: mapList(numberArray(data["shadowedSeqs"]), mapping, `${event.type} ${event.seq} shadowedSeqs`)
			};
		}
		case "session/title":
		case "session/title-llm-request": return {
			...data,
			messageSeqs: mapList(numberArray(data["messageSeqs"]), mapping, `${event.type} ${event.seq} messageSeqs`)
		};
		default: return data;
	}
}
function mapList(values, mapping, label) {
	return values.map((value) => mapOne(value, mapping, label));
}
function mapOne(value, mapping, label) {
	const mapped = mapping.get(value);
	if (mapped === void 0) throw refusal(`${label} targets consumed assistant/chunk ${value}`);
	return mapped;
}
function record$1(value) {
	return value;
}
function numberArray(value) {
	return value;
}
function coordinate(value) {
	return value;
}
function refusal(message) {
	return new SessionFormatUnsupportedMigrationError(message);
}
//#endregion
//#region ../session-format-v2-to-v3/src/payload.ts
/** Audited V2 migration admission and V3 payload validation, independent of installed core Session types. */
/** Audited surface event names; all other admitted events are log-only. */
const SURFACE_TYPES = new Set([
	"system/message",
	"user/message",
	"assistant/message",
	"tool/result"
]);
const SOURCE_KINDS = new Set([
	"user",
	"plugin",
	"model",
	"tool",
	"agent-instructions",
	"session-reference",
	"team-message",
	"goal",
	"skill-invocation",
	"skill-catalog",
	"coordinator",
	"subagent-report",
	"subagent-settled",
	"webhook",
	"agent-message"
]);
/**
* Require a JSON object at the durable input boundary.
* @param value - decoded value.
* @param label - diagnostic subject.
* @returns the narrowed object.
*/
function record(value, label) {
	if (!isSessionFormatJsonObject(value)) throw new SessionFormatError(label + " must be an object");
	return value;
}
/**
* Reject missing and unaudited members rather than guessing whether they contain coordinates.
* @param value - decoded record.
* @param required - required member names.
* @param optional - additional admitted names.
* @param label - diagnostic subject.
*/
function keys(value, required, optional, label) {
	const missing = required.find((key) => !Object.hasOwn(value, key));
	const unexpected = Object.keys(value).find((key) => !required.includes(key) && !optional.includes(key));
	if (missing !== void 0) throw new SessionFormatError(label + " lacks required field " + missing);
	if (unexpected !== void 0) throw new SessionFormatError(label + " has unexpected field " + unexpected);
}
/**
* Validate classified payloads before migration, or native V3 system/header payloads.
* @param event - decoded logical event.
* @param version - source or target generation.
*/
function assertEvent(event, version) {
	if (version === 3) {
		assertV3Event(event);
		return;
	}
	const disposition = RELEASED_V2_EVENT_DISPOSITIONS[event.type];
	const feedback = event.type === "feedback/message-put" || event.type === "feedback/message-delete";
	if (disposition === void 0 && !feedback) throw new SessionFormatUnsupportedMigrationError("format v2 to v3 cannot safely transform unclassified event " + event.type);
	const surface = SURFACE_TYPES.has(event.type);
	keys(event, [
		"type",
		"seq",
		"time",
		"data"
	], surface ? [
		"ignorable",
		"sourceEventSeqs",
		"surfaceOp"
	] : ["ignorable"], event.type);
	sessionFormatCount(event.seq, "event seq");
	sessionFormatSafeInteger(event.time, "event time");
	if (event["ignorable"] !== void 0 && event["ignorable"] !== true) throw new SessionFormatError("ignorable must be true");
	if (surface) {
		assertReleasedSurfaceMetadata(event, event.seq, event.type, "forbid-assistant");
		if (event["surfaceOp"] === void 0) throw new SessionFormatError(event.type + " requires surfaceOp");
	}
	const data = record(event.data, event.type + " data");
	if (feedback) {
		assertFeedback(event.type, data);
		return;
	}
	const admitted = disposition;
	keys(data, admitted.required, admitted.optional, event.type + " data");
	assertOwnedContent(event, data);
	if (event.type !== "assistant/attempt") assertReleasedPayloadSemantics(event, version);
	if (event.type === "assistant/message" || event.type === "assistant/attempt") {
		for (const coordinate of ["turn", "step"]) if (sessionFormatCount(data[coordinate], coordinate) === 0) throw new SessionFormatError(coordinate + " must be positive");
	}
	if (event.type === "session/end-seed" && data["inherited"] !== void 0 && data["inherited"] !== true) throw new SessionFormatError("session/end-seed inherited must be true");
	if (event.type === "user/message") assertSource(data);
	if (event.type === "assistant/message" || event.type === "tool/result") assertSource(record(data["message"], "message"));
	if (event.type === "tool/result" && isSessionFormatJsonObject(data["error"]) && data["error"]["code"] === "TOOL_NOT_STARTED") {
		const message = record(data["message"], "tool result message");
		const source = record(message["source"], "tool result source");
		if (!isRepairIdentity(message["id"], source["callId"])) throw new SessionFormatError("TOOL_NOT_STARTED repair requires its canonical historical message id");
	}
	if (event.type === "agent/inbox/spliced" || event.type === "session/title-llm-request") {
		const messages = data[event.type === "agent/inbox/spliced" ? "inserted" : "messages"];
		for (const message of messages) assertSource(message);
	}
}
/**
* Recognize stable generated repair IDs without interpreting their historical suffix as a current coordinate.
* @param id - durable message identity.
* @param callId - advertised tool identity.
* @returns whether the identity has the canonical historical repair form.
*/
function isRepairIdentity(id, callId) {
	if (typeof callId !== "string") return false;
	const prefix = "interrupted-tool-result-" + callId + "-";
	if (typeof id !== "string" || !id.startsWith(prefix)) return false;
	const suffix = id.slice(prefix.length);
	return /^(0|[1-9]\d*)$/.test(suffix) && Number.isSafeInteger(Number(suffix));
}
function assertSource(message) {
	const source = record(message["source"], "message source");
	if (typeof source["kind"] !== "string" || !SOURCE_KINDS.has(source["kind"])) throw new SessionFormatUnsupportedMigrationError("cannot safely transform unclassified message source");
	if (source["kind"] === "agent-message") {
		keys(source, [
			"kind",
			"form",
			"senderSessionId"
		], [], "agent-message source");
		if (source["form"] !== "relay" || typeof source["senderSessionId"] !== "string" || source["senderSessionId"].length === 0) throw new SessionFormatError("agent-message source requires relay form and senderSessionId");
	}
}
const CONTENT_KINDS = new Set([
	"text",
	"reasoning",
	"image",
	"file",
	"tool-call",
	"tool-result"
]);
function contentArray(value, label) {
	if (!Array.isArray(value)) throw new SessionFormatError(label + ": content must be an array");
	return value;
}
function assertOwnedContent(event, data) {
	const label = "format v2 " + event.type + " at seq " + String(event.seq) + " data";
	switch (event.type) {
		case "user/message":
		case "tool/code-dispatch":
			assertContentKinds(data["content"], label + ".content");
			break;
		case "assistant/message":
		case "tool/result":
		case "team/message/queued":
			assertContentKinds(record(data["message"], label + ".message")["content"], label + ".message.content");
			break;
		case "agent/inbox/spliced":
		case "session/title-llm-request": {
			const field = event.type === "agent/inbox/spliced" ? "inserted" : "messages";
			for (const [index, value] of contentArray(data[field], label + "." + field).entries()) {
				const path = label + "." + field + "[" + String(index) + "]";
				assertContentKinds(record(value, path)["content"], path + ".content");
			}
			break;
		}
		case "compaction/summary":
			assertContentKinds(data["summary"], label + ".summary");
			if (data["rawOutput"] !== void 0) assertContentKinds(data["rawOutput"], label + ".rawOutput");
			break;
	}
	if (event.type === "assistant/message" || event.type === "assistant/attempt") for (const [index, value] of contentArray(data["stream"], label + ".stream").entries()) {
		const path = label + ".stream[" + String(index) + "]";
		const entry = record(value, path);
		if (entry["type"] !== "chunk") continue;
		const chunk = record(entry["chunk"], path + ".chunk");
		if (chunk["type"] === "block-end") assertContentBlock(chunk["block"], path + ".chunk.block");
		if (chunk["type"] === "block-start") assertContentKind(chunk["blockType"], path + ".chunk.blockType");
	}
}
function assertContentKind(kind, label) {
	if (typeof kind !== "string" || !CONTENT_KINDS.has(kind)) throw new SessionFormatUnsupportedMigrationError(label + ": cannot safely transform unclassified message content kind " + JSON.stringify(kind));
}
function assertContentKinds(content, label) {
	for (const [index, value] of contentArray(content, label).entries()) assertContentBlock(value, label + "[" + String(index) + "]");
}
function assertContentBlock(value, label) {
	const block = record(value, label);
	assertContentKind(block["type"], label);
	if (block["type"] === "tool-result") {
		if (!Array.isArray(block["content"])) throw new SessionFormatError(label + ".content: invalid message content kind \"tool-result\": content must be an array");
		assertContentKinds(block["content"], label + ".content");
	}
	if (block["type"] === "file") {
		keys(block, ["type", "attachment"], [], label + " kind \"file\"");
		const attachment = record(block["attachment"], label + " kind \"file\" attachment");
		keys(attachment, [
			"attachmentId",
			"name",
			"bytes"
		], [], label + " kind \"file\" attachment");
		if (typeof attachment["attachmentId"] !== "string" || attachment["attachmentId"].length === 0 || typeof attachment["name"] !== "string") throw new SessionFormatError(label + " kind \"file\": file attachment requires attachmentId and name");
		sessionFormatCount(attachment["bytes"], label + " kind \"file\" attachment bytes");
		return;
	}
	const probe = {
		type: "user/message",
		seq: 0,
		time: 0,
		data: {
			id: "content-admission",
			role: "user",
			source: { kind: "user" },
			content: [block["type"] === "tool-result" ? {
				...block,
				content: []
			} : block]
		}
	};
	try {
		assertReleasedPayloadSemantics(probe, 2);
	} catch (error) {
		throw new SessionFormatError(label + ": invalid message content kind " + JSON.stringify(block["type"]) + ": " + String(error));
	}
}
/**
* Reject V3 structural payload violations even beyond a recoverable physical-row failure.
* @param value - raw physical row; ordinary rows retain the frozen decoder's recovery policy.
*/
function assertV3StructuralRow(value) {
	if (typeof value !== "object" || value === null || Array.isArray(value)) return;
	const row = value;
	if (row["type"] === "request/header") {
		const data = record(row["data"], "request/header data");
		if (Object.hasOwn(record(data["header"], "request header"), "system")) throw new SessionFormatUnsupportedMigrationError("format v3 request/header rejects retired header.system");
	} else if (row["type"] === "system/message") {
		const data = record(row["data"], "system/message data");
		assertSystem({
			type: "system/message",
			seq: 0,
			time: 0,
			data
		}, data);
	}
}
function assertSystem(event, data) {
	keys(data, [
		"turn",
		"step",
		"message"
	], [], "system/message data");
	for (const coordinate of ["turn", "step"]) if (sessionFormatCount(data[coordinate], coordinate) === 0) throw new SessionFormatError(coordinate + " must be positive");
	const message = record(data["message"], "system message");
	keys(message, [
		"id",
		"role",
		"source",
		"content"
	], [], "system message");
	if (typeof message["id"] !== "string" || message["id"].length === 0 || message["role"] !== "system") throw new SessionFormatError("system message requires an id and system role");
	const source = record(message["source"], "system source");
	if (source["kind"] !== "plugin" || typeof source["plugin"] !== "string" || source["plugin"].length === 0) throw new SessionFormatError("system message requires plugin source");
	assertReleasedPayloadSemantics({
		...event,
		type: "user/message",
		data: {
			...message,
			role: "user"
		}
	}, 3);
}
function assertFeedback(type, data) {
	keys(data, type === "feedback/message-put" ? ["sessionId", "item"] : ["sessionId", "messageId"], [], type);
	if (typeof data["sessionId"] !== "string") throw new SessionFormatError("feedback sessionId must be a string");
	if (type === "feedback/message-delete") {
		if (typeof data["messageId"] !== "string") throw new SessionFormatError("feedback messageId must be a string");
		return;
	}
	const item = record(data["item"], "feedback item");
	keys(item, [
		"messageId",
		"rating",
		"version",
		"createdAt",
		"updatedAt"
	], ["note"], "feedback item");
	for (const key of ["messageId", "version"]) if (typeof item[key] !== "string") throw new SessionFormatError("feedback " + key + " must be a string");
	if (item["rating"] !== "positive" && item["rating"] !== "negative") throw new SessionFormatError("invalid feedback rating");
	if (item["note"] !== void 0 && typeof item["note"] !== "string") throw new SessionFormatError("feedback note must be a string");
	sessionFormatCount(item["createdAt"], "feedback createdAt");
	sessionFormatCount(item["updatedAt"], "feedback updatedAt");
}
/**
* Validate one canonical V3 event without interpreting plugin-owned payloads or log relationships.
* Unclassified metadata is deferred to vocabulary-aware restoration; unknown required types must not become recoverable corruption.
* @param event - decoded logical event.
* @param knownEventTypes - additional installed event types whose envelopes are interpreted.
*/
function assertV3Event(event, knownEventTypes) {
	const value = record(event, "format v3 event");
	const subject = `format v3 ${event.type} at seq ${event.seq}`;
	const opaque = !(!(event.type === "tool/code-dispatch-start" || event.type === "tool/code-dispatch") && (SURFACE_TYPES.has(event.type) || RELEASED_V2_EVENT_DISPOSITIONS[event.type] !== void 0 || event.type === "tool/ptc-dispatch-start" || event.type === "tool/ptc-dispatch" || event.type === "feedback/message-put" || event.type === "feedback/message-delete" || knownEventTypes?.has(event.type) === true));
	keys(value, [
		"type",
		"seq",
		"time",
		"data"
	], SURFACE_TYPES.has(event.type) || opaque ? [
		"ignorable",
		"surfaceOp",
		"sourceEventSeqs"
	] : ["ignorable"], subject);
	if (typeof event.type !== "string") throw new SessionFormatError(`${subject} type must be a string`);
	sessionFormatCount(event.seq, `${subject} seq`);
	sessionFormatSafeInteger(event.time, `${subject} time`);
	if (Object.hasOwn(value, "ignorable") && value["ignorable"] !== true) throw new SessionFormatError(`${subject} ignorable must be true when present`);
	if (SURFACE_TYPES.has(event.type)) {
		const operation = value["surfaceOp"];
		if (operation === void 0) throw new SessionFormatError(`${subject} requires a surfaceOp marker`);
		if (operation !== "append") {
			const replace = record(operation, `${subject} surfaceOp`);
			if (Object.keys(replace).length !== 3 || replace["op"] !== "replace" || !Object.hasOwn(replace, "startSeq") || !Object.hasOwn(replace, "endSeq")) throw new SessionFormatError(`${subject} requires exact replace fields op/startSeq/endSeq`);
			for (const key of ["startSeq", "endSeq"]) if (sessionFormatCount(replace[key], `${subject} surfaceOp ${key}`) >= event.seq) throw new SessionFormatError(`${subject} replacement endpoints must reference earlier events`);
		}
		const sources = value["sourceEventSeqs"];
		if (event.type === "assistant/message" && sources !== void 0) throw new SessionFormatError(`${subject} embeds its stream and cannot carry sourceEventSeqs`);
		if (sources !== void 0) {
			if (!Array.isArray(sources) || sources.length === 0) throw new SessionFormatError(`${subject} sourceEventSeqs must be a non-empty array`);
			const seen = /* @__PURE__ */ new Set();
			for (const source of sources) {
				const seq = sessionFormatCount(source, `${subject} sourceEventSeqs member`);
				if (seq >= event.seq || seen.has(seq)) throw new SessionFormatError(`${subject} sourceEventSeqs must be unique earlier seqs`);
				seen.add(seq);
			}
		}
	}
	assertV3StructuralRow(event);
	assertCanonicalPayload(event);
}
function assertCanonicalPayload(event) {
	const subject = `format v3 ${event.type} at seq ${event.seq}`;
	if (event.type === "request/header") {
		const header = record(record(event.data, `${subject} data`)["header"], `${subject} header`);
		if (Array.isArray(header["tools"]) && header["tools"].length === 0 || isSessionFormatJsonObject(header["adapterDefaults"]) && Object.keys(header["adapterDefaults"]).length === 0) throw new SessionFormatError(`${subject} empty optional header fields must be omitted`);
	}
	if (event.type !== "tool/result") return;
	const data = record(event.data, `${subject} data`);
	if (data["error"] === void 0) return;
	const content = record(data["message"], `${subject} message`)["content"];
	if (!Array.isArray(content) || content.length !== 1 || !isSessionFormatJsonObject(content[0]) || content[0]["type"] !== "tool-result" || content[0]["isError"] !== true) throw new SessionFormatError(`${subject} carries error metadata for a non-error tool result`);
}
/**
* Canonicalize structurally transformed events without changing their target coordinates.
* @param event - transformed event using released replacement names and target coordinates.
* @returns a V3 event sharing all unchanged payloads and reference values.
*/
function canonicalizeTransformedEvent(event) {
	let target = event;
	const operation = event["surfaceOp"];
	if (operation !== void 0 && operation !== "append") {
		const replace = record(operation, `format v2 ${event.type} at seq ${event.seq} surfaceOp`);
		if (Object.keys(replace).length !== 3 || replace["op"] !== "replace" || !Object.hasOwn(replace, "start") || !Object.hasOwn(replace, "end")) throw new SessionFormatError(`format v2 ${event.type} at seq ${event.seq} requires exact replace fields op/start/end`);
		target = {
			...event,
			surfaceOp: {
				op: "replace",
				startSeq: sessionFormatCount(replace["start"], `format v2 ${event.type} at seq ${event.seq} replace start`),
				endSeq: sessionFormatCount(replace["end"], `format v2 ${event.type} at seq ${event.seq} replace end`)
			}
		};
	}
	if (event.type === "request/header") {
		const data = record(event.data, `format v2 request/header at seq ${event.seq} data`);
		const header = record(data["header"], `format v2 request/header at seq ${event.seq} header`);
		const empty = Object.keys(header).filter((key) => key === "tools" && Array.isArray(header[key]) && header[key].length === 0 || key === "adapterDefaults" && isSessionFormatJsonObject(header[key]) && Object.keys(header[key]).length === 0);
		if (empty.length > 0) {
			const canonical = Object.fromEntries(Object.entries(header).filter(([key]) => !empty.includes(key)));
			target = {
				...target,
				data: {
					...data,
					header: canonical
				}
			};
		}
	}
	assertV3Event(target);
	return target;
}
//#endregion
//#region ../session-format-v2-to-v3/src/validation.ts
/** Native V3 system-head validation with a private view for frozen non-system relationships. */
/**
* Validate v3 logical metadata with the released-v2 fields.
* @param header - decoded v3 Session header.
*/
function assertReleasedV3Header(header) {
	if (header.version !== 3) throw new SessionFormatError("expected format v3 header");
	assertReleasedV2Header({
		...header,
		version: 2
	});
}
/**
* Validate system ownership, protected-head operations, ordinary relationships, and inherited cut.
* The private relationship view never escapes; the returned artifact and its messages are unchanged.
* @param artifact - detached v3 artifact.
* @param knownEventTypes - event types understood by the installed Session package.
* @returns the same validated artifact.
*/
function restoreReleasedV3Artifact(artifact, knownEventTypes) {
	assertReleasedV3Header(artifact.header);
	let step;
	let head;
	let hasSurface = false;
	const events = artifact.events.map((event) => {
		assertV3EventAdmission(event);
		assertV3Event(event, knownEventTypes);
		const system = event.type === "system/message";
		if (event.type === "step/start") {
			const data = record(event.data, event.type);
			step = {
				turn: data["turn"],
				step: data["step"]
			};
		} else if (event.type === "step/end" || event.type === "turn/end") step = void 0;
		if (system) {
			const data = record(event.data, "system/message");
			if (step === void 0 || step.turn !== data["turn"] || step.step !== data["step"]) throw new SessionFormatError("system/message does not match an open step");
			const operation = event["surfaceOp"];
			if (hasSurface && head === void 0) throw new SessionFormatError("system/message requires a protected first surface head");
			if (operation === "append") {
				if (!hasSurface) head = event.seq;
			} else {
				const replace = record(operation, "system replacement");
				if (replace["startSeq"] === head || replace["endSeq"] === head) {
					if (replace["startSeq"] !== head || replace["endSeq"] !== head) throw new SessionFormatError("system/message must replace exactly the current system head");
					head = event.seq;
				}
			}
		} else if (SURFACE_TYPES.has(event.type) && event["surfaceOp"] !== "append") {
			const replace = record(event["surfaceOp"], "surface replacement");
			if (replace["startSeq"] === head || replace["endSeq"] === head) throw new SessionFormatError("surface replacement cannot shadow the protected system head");
		}
		if (event.type === "compaction/prune" || event.type === "compaction/summary") {
			const seqs = record(event.data, event.type)["shadowedSeqs"];
			if (Array.isArray(seqs) && seqs.some((seq) => seq === head)) throw new SessionFormatError("compaction cannot shadow the protected system head");
		}
		if (SURFACE_TYPES.has(event.type)) hasSurface = true;
		const projected = relationshipEvent(event);
		if (!SURFACE_TYPES.has(event.type) || event["surfaceOp"] === "append") return projected;
		const replacement = event["surfaceOp"];
		return {
			...projected,
			surfaceOp: {
				op: "replace",
				start: replacement.startSeq,
				end: replacement.endSeq
			}
		};
	});
	restoreReleasedV2Artifact({
		...artifact,
		header: {
			...artifact.header,
			version: 2
		},
		events
	}, knownEventTypes, 3);
	return artifact;
}
/**
* Refuse required predecessor PTC tags without interpreting native extension payloads.
* @param event - event envelope whose type and ignorable admission markers are available.
*/
function assertV3EventAdmission(event) {
	if ((event.type === "tool/code-dispatch-start" || event.type === "tool/code-dispatch") && event["ignorable"] !== true) throw new SessionFormatUnsupportedMigrationError("format v3 contains unknown event type " + JSON.stringify(event.type) + " at seq " + String(event.seq));
}
function relationshipEvent(event) {
	switch (event.type) {
		case "tool/ptc-dispatch-start": return {
			...event,
			type: "tool/code-dispatch-start"
		};
		case "tool/ptc-dispatch": return {
			...event,
			type: "tool/code-dispatch"
		};
		case "tool/code-dispatch-start":
		case "tool/code-dispatch":
			assertV3EventAdmission(event);
			return {
				...event,
				type: "v3/opaque-released-event"
			};
	}
	if (event.type === "system/message") {
		const message = record(record(event.data, "system data")["message"], "system message");
		return {
			...event,
			type: "user/message",
			data: {
				...message,
				role: "user"
			}
		};
	}
	if (event.type !== "tool/result") return event;
	const data = record(event.data, "tool result");
	if (data["error"] === void 0) return event;
	if (record(data["error"], "tool error")["code"] !== "TOOL_NOT_STARTED") return event;
	const message = record(data["message"], "tool message");
	const callId = record(message["source"], "tool source")["callId"];
	const id = message["id"];
	if (!isRepairIdentity(id, callId)) return event;
	const prefix = "interrupted-tool-result-" + callId + "-";
	return {
		...event,
		data: {
			...data,
			message: {
				...message,
				id: `${prefix}${event.seq}`
			}
		}
	};
}
//#endregion
//#region ../session-format-v2-to-v3/src/codec.ts
/** V3 framing with hard structural admission and recoverable canonical event validation. */
/** V3 codec validates structural rows before recovery and logical envelopes after provenance decoding. */
const releasedV3SessionFormatCodec = Object.freeze({
	version: 3,
	decodeHeader(value) {
		return {
			...releasedV2SessionFormatCodec.decodeHeader(v2PhysicalHeader(value)),
			version: 3
		};
	},
	createDecoder(value, recovery) {
		const decoder = releasedV2SessionFormatCodec.createDecoder(v2PhysicalHeader(value), recovery);
		let issue;
		let acceptedInheritedCut;
		return {
			header: {
				...decoder.header,
				version: 3
			},
			decodeRow(row, context) {
				assertV3RowAdmission(row);
				decoder.decodeRow(row, {
					emitRun: context.emitRun.bind(context),
					emitEvent(event) {
						assertV3EventAdmission(event);
						if (issue === void 0) try {
							assertV3Event(event);
						} catch (error) {
							const invalid = error;
							if (recovery === "strict") throw invalid;
							issue = invalid;
						}
						if (issue !== void 0) {
							if (event.type === "turn/end") throw issue;
							return;
						}
						if (event.type === "session/end-seed" && isSessionFormatJsonObject(event.data) && event.data["inherited"] === true) acceptedInheritedCut = event.seq;
						context.emitEvent(event);
					}
				});
			},
			finish(context) {
				if (issue === void 0) return decoder.finish(context);
				if (decoder.header.isSeeded && acceptedInheritedCut === void 0) throw new SessionFormatError("format v3 seeded Session lacks an accepted inherited end-seed marker");
				if (!decoder.header.isSeeded && acceptedInheritedCut !== void 0) throw new SessionFormatError("format v3 unseeded Session contains an inherited end-seed marker");
				return acceptedInheritedCut ?? 0;
			}
		};
	},
	encodeHeader(header, inheritedEventCount) {
		assertReleasedV3Header(header);
		return {
			...releasedV2SessionFormatCodec.encodeHeader({
				...header,
				version: 2
			}, inheritedEventCount),
			version: 3
		};
	},
	encodeEvent(event) {
		assertV3EventAdmission(event);
		assertV3Event(event);
		return releasedV2SessionFormatCodec.encodeEvent(event);
	}
});
/**
* Validate owned V3 admission rules before a scanner or codec can discard a recoverable tail.
* This checks only identified structural payloads; physical provenance still belongs to decoding.
* @param row - parsed physical row, before envelope or compressed-range decoding.
*/
function assertV3RowAdmission(row) {
	assertV3StructuralRow(row);
	if (typeof row === "object" && row !== null && !Array.isArray(row)) assertV3EventAdmission(row);
}
function v2PhysicalHeader(value) {
	const header = snapshotSessionFormatJson(value, "format v3 physical header");
	if (!isSessionFormatJsonObject(header) || header["version"] !== 3) throw new SessionFormatError("expected format v3 physical Session header");
	return {
		...header,
		version: 2
	};
}
//#endregion
//#region ../session-format-v2-to-v3/src/references.ts
/** Explicit local-coordinate remapping; captured generations and owner-local counters remain opaque. */
/**
* Remap only audited same-artifact references, preserving IDs and embedded model input.
* @param event - validated source event.
* @param seq - output event position.
* @param mapping - earlier source positions mapped to output positions.
* @returns the event in target coordinates.
*/
function remapEvent(event, seq, mapping) {
	const one = (value) => {
		const source = sessionFormatCount(value, "source event reference");
		const target = mapping[source];
		if (source >= event.seq || target === void 0) throw new SessionFormatError("reference must name an earlier source event");
		return target;
	};
	const list = (value) => {
		if (!Array.isArray(value)) throw new SessionFormatError("sequence references must be an array");
		return value.map(one);
	};
	const range = (value) => {
		const source = record(value, "sequence range");
		return {
			...source,
			start: one(source["start"]),
			end: one(source["end"])
		};
	};
	let data = record(event.data, event.type);
	switch (event.type) {
		case "command/done":
			if (data["sourceEventSeq"] !== void 0) data = {
				...data,
				sourceEventSeq: one(data["sourceEventSeq"])
			};
			break;
		case "compaction/summary":
		case "compaction/prune":
			data = {
				...data,
				shadowedRange: range(data["shadowedRange"]),
				shadowedSeqs: list(data["shadowedSeqs"])
			};
			break;
		case "session/title":
		case "session/title-llm-request":
			data = {
				...data,
				messageSeqs: list(data["messageSeqs"])
			};
			break;
	}
	return {
		...event,
		seq,
		data,
		...event["sourceEventSeqs"] === void 0 ? {} : { sourceEventSeqs: list(event["sourceEventSeqs"]) },
		...event["surfaceOp"] === void 0 || event["surfaceOp"] === "append" ? {} : { surfaceOp: range(event["surfaceOp"]) }
	};
}
//#endregion
//#region ../session-format-v2-to-v3/src/migration.ts
/** Streaming system-prompt promotion followed by canonical V3 envelope conversion. */
/** Promote system prompts, remap audited references, and canonicalize envelopes and PTC vocabulary. */
const sessionFormatV2ToV3 = defineSessionFormatMigration({
	name: "@deepseek-ai/dsh-session-format-v2-to-v3",
	fromVersion: 2,
	toVersion: 3,
	migrateHeader(header) {
		assertReleasedV2Header(header);
		return {
			...header,
			version: 3,
			...header.agentPreset === "code" ? { agentPreset: "ptc" } : {}
		};
	},
	createStage(input) {
		return new ReleasedV2ToV3Stage(input);
	},
	validateTargetHeader: assertReleasedV3Header
});
var ReleasedV2ToV3Stage = class {
	input;
	headerInheritedEventCount;
	mapping = [];
	originalIds = /* @__PURE__ */ new Set();
	generatedIds = /* @__PURE__ */ new Set();
	targetSeq = 0;
	sourceCut;
	targetCut;
	lastForeignDeliverySeq;
	step;
	head;
	prompt = "";
	constructor(input) {
		this.input = input;
		assertReleasedV2Header(input.sourceHeader);
		this.sourceCut = input.sourceHeader.isSeeded ? void 0 : 0;
		this.targetCut = input.sourceHeader.isSeeded ? void 0 : 0;
		if (!input.sourceHeader.isSeeded) this.headerInheritedEventCount = 0;
	}
	transformEvent(event, context) {
		if (event.seq !== this.mapping.length) throw new SessionFormatError("format v2 source events must be dense");
		assertEvent(event, 2);
		this.observeMessageIds(event);
		let source = event;
		const data = record(event.data, event.type);
		if (event.type === "request/header") {
			const { system, ...header } = record(data["header"], "request header");
			const prompt = typeof system === "string" ? system : "";
			if (prompt !== this.prompt) this.emitSystem(prompt, event, context);
			source = {
				...event,
				data: {
					...data,
					header
				}
			};
		}
		if (SURFACE_TYPES.has(event.type) && this.head === void 0) throw new SessionFormatUnsupportedMigrationError("format v2 surface before first step cannot acquire a system head without changing chronology");
		if (event.type === "session/end-seed" && data["inherited"] === true) {
			if (!this.input.sourceHeader.isSeeded) throw new SessionFormatError("format v2 unseeded Session contains an inherited end-seed marker");
			this.sourceCut = event.seq;
			this.targetCut = this.targetSeq;
		}
		if (event.type === "session-log-deepseek/delivery-accepted") {
			if (data["sessionFormatVersion"] === 3) throw new SessionFormatError("format v2 delivery marker claims target format v3");
			if (data["sessionFormatVersion"] === 2 && data["sessionId"] !== this.input.sourceHeader.id) this.lastForeignDeliverySeq = event.seq;
		}
		const target = remapEvent(source, this.targetSeq, this.mapping);
		this.mapping.push(this.targetSeq++);
		context.emitEvent(canonicalizeTransformedEvent(renamePtcEvent(target)));
		if (event.type === "step/start") {
			this.step = {
				turn: data["turn"],
				step: data["step"]
			};
			if (this.head === void 0) this.emitSystem("", event, context);
		} else if (event.type === "step/end" || event.type === "turn/end") this.step = void 0;
	}
	transformRun(run, context) {
		for (const event of run.expand()) this.transformEvent(event, context);
	}
	finish(_context) {
		const cut = sessionFormatCount(this.sourceCut, "format v2 inherited end-seed marker");
		if (this.input.sourceInheritedEventCount !== void 0 && this.input.sourceInheritedEventCount !== cut) throw new SessionFormatError("format v2 inherited end-seed marker disagrees with its source cut");
		if (this.lastForeignDeliverySeq !== void 0 && (this.input.sourceHeader.parentSession === void 0 || this.lastForeignDeliverySeq >= cut)) throw new SessionFormatError("current-generation delivery marker names the wrong Session");
		return sessionFormatCount(this.targetCut, "format v3 inherited event count");
	}
	observeMessageIds(event) {
		const data = record(event.data, event.type);
		const messages = event.type === "user/message" ? [data] : event.type === "assistant/message" || event.type === "tool/result" ? [record(data["message"], "message")] : event.type === "agent/inbox/spliced" ? data["inserted"] : event.type === "session/title-llm-request" ? data["messages"] : [];
		for (const message of messages) {
			const id = message["id"];
			if (this.generatedIds.has(id)) throw new SessionFormatUnsupportedMigrationError("source message id collides with a generated system message id");
			this.originalIds.add(id);
		}
	}
	emitSystem(prompt, anchor, context) {
		if (this.step === void 0) throw new SessionFormatUnsupportedMigrationError("format v2 changed request prompt outside an open step cannot retain source chronology");
		const identity = JSON.stringify([
			"session-format-v2-to-v3",
			this.input.sourceHeader.id,
			anchor.seq,
			anchor.type
		]);
		const id = "v2-to-v3-system-" + (0, node_crypto.createHash)("sha256").update(identity).digest("hex");
		if (this.originalIds.has(id) || this.generatedIds.has(id)) throw new SessionFormatUnsupportedMigrationError("generated system message id collides with an existing message id");
		this.generatedIds.add(id);
		const seq = this.targetSeq++;
		context.emitEvent(canonicalizeTransformedEvent({
			type: "system/message",
			seq,
			time: anchor.time,
			data: {
				...this.step,
				message: {
					id,
					role: "system",
					source: {
						kind: "plugin",
						plugin: "@deepseek-ai/dsh-system-prompt"
					},
					content: prompt === "" ? [] : [{
						type: "text",
						text: prompt
					}]
				}
			},
			...this.head === void 0 ? { surfaceOp: "append" } : {
				surfaceOp: {
					op: "replace",
					start: this.head,
					end: this.head
				},
				sourceEventSeqs: [this.head]
			}
		}));
		this.head = seq;
		this.prompt = prompt;
	}
};
/** Source admission precedes renaming, so these payloads have exact audited fields. */
function renamePtcEvent(event) {
	switch (event.type) {
		case "agent-preset/selected": return event.data["agentPreset"] === "code" ? {
			...event,
			data: {
				...event.data,
				agentPreset: "ptc"
			}
		} : event;
		case "tool/code-dispatch-start": return {
			...event,
			type: "tool/ptc-dispatch-start"
		};
		case "tool/code-dispatch": return {
			...event,
			type: "tool/ptc-dispatch"
		};
		case "user/message": {
			const data = renameMessageSource(event.data);
			return data === event.data ? event : {
				...event,
				data
			};
		}
		case "agent/inbox/spliced":
		case "session/title-llm-request": {
			const data = event.data;
			const key = event.type === "agent/inbox/spliced" ? "inserted" : "messages";
			const messages = data[key];
			const renamed = messages.map(renameMessageSource);
			return renamed.every((message, index) => message === messages[index]) ? event : {
				...event,
				data: {
					...data,
					[key]: renamed
				}
			};
		}
		default: return event;
	}
}
function renameMessageSource(message) {
	const source = message["source"];
	if (source["kind"] !== "plugin" || source["plugin"] !== "tools-code-mode") return message;
	return {
		...message,
		source: {
			...source,
			plugin: "tools-ptc"
		}
	};
}
//#endregion
//#region ../session-format-catalog/src/generated.ts
/**
* GENERATED by `scripts/gen-session-format-catalog.ts` — do not edit by hand.
* The direct imports make historical readability independent of mounted plugins.
*/
/** Physical codec dispatch and complete adjacent chain, independent of mounted plugins. */
const sessionFormatCatalog = createSessionFormatCatalog({
	currentVersion: 3,
	codecs: [
		releasedV0SessionFormatCodec,
		releasedV1SessionFormatCodec,
		releasedV2SessionFormatCodec,
		releasedV3SessionFormatCodec
	],
	currentEncoder: releasedV3SessionFormatCodec,
	migrations: [
		sessionFormatV0ToV1,
		sessionFormatV1ToV2,
		sessionFormatV2ToV3
	],
	restoreCurrent(artifact) {
		const restored = restoreReleasedV3Artifact(artifact, KNOWN_SESSION_EVENT_TYPES);
		validateInstalledCurrentSessionArtifact(restored);
		return restored;
	},
	restoreTransformedCurrent(artifact) {
		return restoreReleasedV3Artifact(artifact, KNOWN_SESSION_EVENT_TYPES);
	},
	restoreCurrentHeader(header) {
		assertReleasedV3Header(header);
		validateInstalledCurrentSessionHeader(header);
		return header;
	}
});
//#endregion
//#region lib/types/format.js
/**
* On-disk format helpers for the JSONL session-persistence backend: path
* sanitization (a {@link SessionId} is an unvalidated branded string, so it
* MUST be encoded before use in a path — no traversal, no collision), the
* per-project/session directory layout, header-line (de)serialization, and the
* truncation-repair offset computation.
*
* @module dsh-session-persistence-jsonl/format
*/
/**
* Return the artifact suffix for one physical encoding.
* @param compression - configured JSONL artifact encoding.
* @returns `.jsonl.zstd` for Zstandard or `.jsonl` for plaintext.
*/
function logSuffix(compression) {
	return `.jsonl${compressionSuffix(compression)}`;
}
function compressionSuffix(compression) {
	return compression === "zstd" ? ".zstd" : "";
}
/**
* Return the canonical filename for one immutable Session format generation.
* Version zero retains the original suffix-only name; every later generation
* carries a lowercase numeric `vN` component.
* @param version - non-negative safe Session format version.
* @param compression - configured JSONL artifact encoding.
* @returns the generation filename inside one Session directory.
*/
function generationLogFilename(version, compression) {
	return `${sessionFormatLogFilename(version)}${compressionSuffix(compression)}`;
}
const HEADER_REQUIRED_KEYS = [
	"type",
	"version",
	"id",
	"createdAt",
	"isSeeded",
	"delegationDepth"
];
const HEADER_OPTIONAL_KEYS = [
	"cwd",
	"parentSession",
	"origin",
	"agentPreset"
];
const HEADER_KEYS = new Set([...HEADER_REQUIRED_KEYS, ...HEADER_OPTIONAL_KEYS]);
/**
* Refuse policy fields that never belong to a released Session header.
* @param value - parsed physical header candidate.
* @returns nothing after successful validation.
*/
function assertNoRetiredHeaderFields(value) {
	if (typeof value !== "object" || value === null) return;
	if (Object.hasOwn(value, "sandboxMode") || Object.hasOwn(value, "approvalPolicy")) throw new Error("session header uses retired policy baseline fields");
}
/**
* Translate one current physical header into logical metadata and its cut.
* @param line - the shape-checked first line of a log (see the `isHeaderLine` guard).
* @returns logical Session metadata paired with the exact inherited prefix length.
*/
function fromHeaderLine(line) {
	return {
		meta: {
			version: 3,
			id: line.id,
			createdAt: line.createdAt,
			...line.cwd !== void 0 ? { cwd: line.cwd } : {},
			...line.parentSession !== void 0 ? { parentSession: line.parentSession } : {},
			isSeeded: line.isSeeded,
			...line.origin !== void 0 ? { origin: line.origin } : {},
			delegationDepth: line.delegationDepth,
			...line.agentPreset !== void 0 ? { agentPreset: line.agentPreset } : {}
		},
		inheritedEventCount: SessionLogOffset(0)
	};
}
/** Type guard: a parsed first line is a well-formed session header. */
function isHeaderLine(value) {
	return typeof value === "object" && value !== null && !Array.isArray(value) && HEADER_REQUIRED_KEYS.every((key) => Object.hasOwn(value, key)) && Object.keys(value).every((key) => HEADER_KEYS.has(key)) && value.type === "session" && typeof value.version === "number" && typeof value.id === "string" && typeof value.createdAt === "number" && Number.isSafeInteger(value.createdAt) && value.createdAt >= 0 && !Object.is(value.createdAt, -0) && typeof value.delegationDepth === "number" && Number.isSafeInteger(value.delegationDepth) && value.delegationDepth >= 0 && !Object.is(value.delegationDepth, -0) && (value.cwd === void 0 || typeof value.cwd === "string" && (0, node_path.isAbsolute)(value.cwd)) && (value.parentSession === void 0 || typeof value.parentSession === "string") && typeof value.isSeeded === "boolean" && (value.origin === void 0 || value.origin === "subagent") && (value.agentPreset === void 0 || typeof value.agentPreset === "string");
}
/**
* Refuse a header carrying a format version this build does not read BEFORE
* validating the current header shape or decoding any event row: a future
* format need not satisfy this build's structural checks at all, and its user
* must see "upgrade the harness", never "corrupt session log".
* @param parsed - the JSON-parsed first line of a session artifact.
*/
function refuseForeignFormatVersion(parsed) {
	const { version, id } = parsed;
	if (typeof version !== "number" || version === 3) return;
	throw new SessionFormatUnsupportedError(sessionFormatVersionRefusal(typeof id === "string" ? id : String(id), version));
}
/** Parse one complete header record supplied independently from event rows. */
function parseHeaderRecord(record) {
	if (record.length === 0 || record.at(-1) !== 10 || record.indexOf(10) !== record.length - 1) throw new Error("empty or header-less session log");
	let parsed;
	try {
		parsed = JSON.parse(record.subarray(0, -1).toString("utf8"));
	} catch {
		throw new Error("corrupt session log: header line is not valid JSON");
	}
	if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) throw new Error("corrupt session log: first line is not a JSON object");
	refuseForeignFormatVersion(parsed);
	assertNoRetiredHeaderFields(parsed);
	if (!isHeaderLine(parsed)) throw new Error("corrupt session log: first line is not a session header");
	let restore;
	try {
		restore = sessionFormatCatalog.createRestore(parsed, {
			recovery: "strict",
			validation: "transformed"
		});
	} catch {
		/* v8 ignore next -- isHeaderLine matches the current codec; this preserves classification if it tightens. */
		throw new Error("corrupt session log: first line is not a session header");
	}
	return {
		meta: fromHeaderLine(parsed).meta,
		restore
	};
}
/**
* Incrementally scan complete JSONL event records after an independently
* supplied header record. Newline search and byte offsets stay on raw buffers;
* only complete records are decoded to UTF-8. A fragment crossing writes is
* copied because a decoder may reuse its output buffer after `write()` returns.
*/
var SessionLogScanner = class {
	recovery;
	meta;
	restore;
	eventCount = 0;
	fragments = [];
	fragmentBytes = 0;
	inputBytes;
	committedBytes;
	eventLine = 0;
	issue;
	finished = false;
	/**
	* Create an event scanner from exactly one newline-terminated header record.
	* @param headerRecord - the complete first JSONL record, including its newline.
	*/
	constructor(headerRecord, recovery = "recoverable") {
		this.recovery = recovery;
		const parsed = parseHeaderRecord(headerRecord);
		this.meta = parsed.meta;
		this.restore = parsed.restore;
		this.inputBytes = headerRecord.length;
		this.committedBytes = headerRecord.length;
	}
	/**
	* Consume the next raw plaintext chunk, retaining only an incomplete final record.
	* @param chunk - bytes immediately following all previously supplied bytes.
	*/
	write(chunk) {
		if (this.finished) throw new Error("cannot write to a finished session log scanner");
		const chunkStart = this.inputBytes;
		this.inputBytes += chunk.length;
		let lineStart = 0;
		for (let newline = chunk.indexOf(10); newline !== -1; newline = chunk.indexOf(10, lineStart)) {
			const fragment = chunk.subarray(lineStart, newline);
			let line = fragment;
			if (this.fragments.length > 0) {
				if (fragment.length > 0) this.fragments.push(fragment);
				line = Buffer.concat(this.fragments, this.fragmentBytes + fragment.length);
				this.fragments = [];
				this.fragmentBytes = 0;
			}
			this.consumeEventLine(line, chunkStart + newline + 1);
			lineStart = newline + 1;
		}
		if (lineStart < chunk.length) {
			const fragment = Buffer.from(chunk.subarray(lineStart));
			this.fragments.push(fragment);
			this.fragmentBytes += fragment.length;
		}
	}
	/**
	* Snapshot progress before appending a recoverable torn-frame prefix.
	* @returns byte, committed-prefix, and expanded-event cursors.
	*/
	checkpoint() {
		return {
			inputBytes: this.inputBytes,
			committedBytes: this.committedBytes,
			eventCount: SessionLogOffset(this.eventCount)
		};
	}
	/**
	* Finish scanning, ignoring a final record without a newline as a torn tail.
	* @returns the header, contiguous event prefix, and safe truncation offset.
	*/
	finish() {
		this.finished = true;
		const artifact = this.restore.finish();
		return {
			meta: this.meta,
			inheritedEventCount: SessionLogOffset(artifact.inheritedEventCount),
			events: artifact.events,
			committedBytes: this.committedBytes
		};
	}
	/** Decode one complete event row and update the contiguous prefix. */
	consumeEventLine(line, endByte) {
		this.eventLine += 1;
		let decoded;
		try {
			decoded = JSON.parse(line.toString("utf8"));
		} catch {
			const issue = /* @__PURE__ */ new Error(`corrupt session log: unparsable committed event at line ${this.eventLine}`);
			if (this.recovery === "strict") throw issue;
			this.issue ??= issue;
			return;
		}
		try {
			assertV3RowAdmission(decoded);
		} catch (error) {
			if (error instanceof SessionFormatUnsupportedMigrationError) throw new SessionFormatUnsupportedError(error.message);
			throw error;
		}
		if (this.issue !== void 0) {
			if (typeof decoded === "object" && decoded !== null && decoded.type === "turn/end") throw this.issue;
			return;
		}
		try {
			this.restore.decodeRow(decoded);
		} catch (error) {
			/* v8 ignore next -- every production Session format decoder rejects with Error. */
			const detail = error instanceof Error ? error.message : String(error);
			const issue = new Error(`corrupt session log: invalid committed event at line ${this.eventLine}: ${detail}`, { cause: error });
			if (this.recovery === "strict") throw issue;
			this.issue = issue;
			if (typeof decoded === "object" && decoded !== null && decoded.type === "turn/end") throw issue;
			return;
		}
		this.eventCount += 1;
		this.committedBytes = endByte;
	}
};
//#endregion
//#region lib/types/win32.js
/**
* Windows durable namespace helpers for the JSONL backend.
*
* POSIX publishes a newly-created log by creating a directory entry and then
* fsyncing the parent directory. Windows does not expose that parent-directory
* fsync contract through Node, so the Windows path uses the native durable
* namespace primitive instead: create a staging object in the target directory
* and publish it with `MoveFileExW(..., MOVEFILE_WRITE_THROUGH)` without
* replacement or cross-volume copy fallback.
*
* @module dsh-session-persistence-jsonl/win32
*/
const MOVEFILE_WRITE_THROUGH = 8;
const ERROR_FILE_NOT_FOUND = 2;
const ERROR_PATH_NOT_FOUND = 3;
const ERROR_ACCESS_DENIED = 5;
const ERROR_NOT_SAME_DEVICE = 17;
const ERROR_SHARING_VIOLATION = 32;
const ERROR_FILE_EXISTS = 80;
const ERROR_INVALID_NAME = 123;
const ERROR_ALREADY_EXISTS = 183;
let bindings;
/** Load the small Win32 API lazily so non-Windows processes never load Koffi. */
async function win32() {
	if (bindings !== void 0) return bindings;
	const kernel32 = (await import("koffi")).default.load("kernel32.dll");
	bindings = {
		moveFileExW: kernel32.func("__stdcall", "MoveFileExW", "int", [
			"str16",
			"str16",
			"uint"
		]),
		createSemaphoreW: kernel32.func("__stdcall", "CreateSemaphoreW", "intptr", [
			"void*",
			"int",
			"int",
			"str16"
		]),
		waitForSingleObject: kernel32.func("__stdcall", "WaitForSingleObject", "uint", ["intptr", "uint"]),
		releaseSemaphore: kernel32.func("__stdcall", "ReleaseSemaphore", "int", [
			"intptr",
			"int",
			"void*"
		]),
		closeHandle: kernel32.func("__stdcall", "CloseHandle", "int", ["intptr"]),
		getLastError: kernel32.func("__stdcall", "GetLastError", "uint", [])
	};
	return bindings;
}
function errnoCode(win32Code) {
	switch (win32Code) {
		case ERROR_FILE_NOT_FOUND:
		case ERROR_PATH_NOT_FOUND: return "ENOENT";
		case ERROR_ACCESS_DENIED: return "EACCES";
		case ERROR_NOT_SAME_DEVICE: return "EXDEV";
		case ERROR_SHARING_VIOLATION: return "EBUSY";
		case ERROR_FILE_EXISTS:
		case ERROR_ALREADY_EXISTS: return "EEXIST";
		case ERROR_INVALID_NAME: return "EINVAL";
		default: return "EIO";
	}
}
function win32Error(syscall, win32Code, path, dest) {
	const code = errnoCode(win32Code);
	const error = /* @__PURE__ */ new Error(`${syscall} ${code} (Win32 ${win32Code}): ${path} -> ${dest}`);
	error.code = code;
	error.errno = win32Code;
	error.syscall = syscall;
	error.path = path;
	error.dest = dest;
	error.win32Code = win32Code;
	return error;
}
/**
* Publish `existing` at `replacement` with Windows write-through rename
* semantics. The destination must not already exist; the move must stay within
* the volume (no copy fallback flag is set).
* @param existing - the synced staging path to move.
* @param replacement - the final path, which must not already exist.
*/
async function publishNewFileWin32(existing, replacement) {
	const api = await win32();
	if (api.moveFileExW((0, node_path.toNamespacedPath)(existing), (0, node_path.toNamespacedPath)(replacement), MOVEFILE_WRITE_THROUGH) === 0) throw win32Error("MoveFileExW", api.getLastError(), existing, replacement);
}
//#endregion
//#region lib/types/zstd-private-decoder.js
/**
* Node-private synchronous Zstandard frame decoder optimization.
* @module dsh-session-persistence-jsonl/zstd-private-decoder
*/
const DECODE_CHUNK_SIZE = 1024 * 1024;
/** Return the stream with its observed private Node contract, or reject that optimization. */
function privateZstdStream(stream) {
	const candidate = stream;
	const handle = candidate._handle;
	const errorKey = Reflect.ownKeys(stream).find((key) => typeof key === "symbol" && key.description === "kError");
	/* v8 ignore next -- one test runtime exposes one Node-private shape; the Node 22/24/26 matrix checks compatibility. */
	if (typeof handle !== "object" || handle === null || typeof handle.writeSync !== "function" || !(candidate._writeState instanceof Uint32Array) || candidate._writeState.length < 2 || typeof candidate._defaultFlushFlag !== "number" || errorKey === void 0 || candidate[errorKey] !== null) return void 0;
	return {
		stream,
		errorKey
	};
}
/**
* Synchronous multi-frame decoder backed by one Node Zstd stream handle. Node
* exposes synchronous decoding only as a one-shot API, so this adapter uses
* the stream's private handle contract to reuse its native context and output
* chunks across frames.
*/
var NodePrivateZstdFrameDecoder = class NodePrivateZstdFrameDecoder {
	stream;
	errorKey;
	output = Buffer.allocUnsafe(DECODE_CHUNK_SIZE);
	decoderError;
	started = false;
	closed = false;
	constructor(stream, errorKey) {
		this.stream = stream;
		this.errorKey = errorKey;
		this.stream.on("error", (error) => {
			this.decoderError ??= error;
		});
	}
	/**
	* Create the optimized decoder when this Node release exposes the expected
	* private stream shape.
	* @returns a shared decoder, or `undefined` when callers must use the public fallback.
	*/
	static create() {
		const stream = (0, node_zlib.createZstdDecompress)({ chunkSize: DECODE_CHUNK_SIZE });
		const privateAccess = privateZstdStream(stream);
		/* v8 ignore next -- reached only when a supported Node release changes its private stream shape. */
		if (privateAccess !== void 0) return new NodePrivateZstdFrameDecoder(privateAccess.stream, privateAccess.errorKey);
		/* v8 ignore next -- the active Node runtime passed the private-shape probe above. */
		stream.close();
	}
	/** @inheritdoc */
	*decode(source, frames) {
		if (this.started) throw new Error("Zstandard frame decoder was already started");
		if (this.closed) throw new Error("cannot start a closed Zstandard frame decoder");
		this.started = true;
		try {
			for (const frame of frames) try {
				yield this.decodeFrame(source.subarray(frame.start, frame.end));
			} catch (error) {
				throw new Error(`corrupt Zstandard session log: frame at byte ${frame.start} failed validation`, { cause: error });
			}
		} finally {
			this.close();
		}
	}
	/** Decode one frame; its returned scratch view remains valid until the next call. */
	decodeFrame(input) {
		const handle = this.stream._handle;
		/* v8 ignore next -- decode() rejects closed instances before entering this private frame operation. */
		if (this.closed || handle === null) throw new Error("cannot decode with a closed Zstandard frame decoder");
		let inputOffset = 0;
		let inputRemaining = input.length;
		let outputBytes = 0;
		const fullChunks = [];
		for (;;) {
			handle.writeSync(this.stream._defaultFlushFlag, input, inputOffset, inputRemaining, this.output, 0, this.output.length);
			if (this.decoderError !== void 0) throw this.decoderError;
			const internalError = this.stream[this.errorKey];
			if (internalError !== null) {
				if (internalError instanceof Error) throw internalError;
				throw new Error("Zstandard decoder exposed a non-Error internal failure");
			}
			const outputAfter = this.stream._writeState[0];
			const inputAfter = this.stream._writeState[1];
			const consumed = inputRemaining - inputAfter;
			const produced = this.output.length - outputAfter;
			if (produced > 0) {
				outputBytes += produced;
				/* v8 ignore next -- Buffer cannot materialize a frame beyond its own process-wide maximum length. */
				if (outputBytes > node_buffer.constants.MAX_LENGTH) throw new Error(`Zstandard frame output exceeds ${node_buffer.constants.MAX_LENGTH} bytes`);
			}
			if (outputAfter !== 0) {
				/* v8 ignore next -- structurally scanned ranges contain exactly one complete frame and no trailing bytes. */
				if (inputAfter !== 0) throw new Error("Zstandard frame decoder left trailing input");
				const finalChunk = this.output.subarray(0, produced);
				if (fullChunks.length === 0) return finalChunk;
				if (produced > 0) fullChunks.push(Buffer.from(finalChunk));
				const onlyChunk = fullChunks[0];
				return fullChunks.length === 1 ? onlyChunk : Buffer.concat(fullChunks, outputBytes);
			}
			fullChunks.push(Buffer.from(this.output));
			inputOffset += consumed;
			inputRemaining = inputAfter;
		}
	}
	/** @inheritdoc */
	close() {
		if (this.closed) return;
		this.closed = true;
		this.stream.close();
	}
};
//#endregion
//#region lib/types/zstd-public-decoder.js
/**
* Public-API synchronous Zstandard frame decoder fallback.
* @module dsh-session-persistence-jsonl/zstd-public-decoder
*/
/** Multi-frame adapter built exclusively from Node's supported one-shot API. */
var PublicZstdFrameDecoder = class {
	started = false;
	closed = false;
	/** @inheritdoc */
	*decode(source, frames) {
		if (this.started) throw new Error("Zstandard frame decoder was already started");
		if (this.closed) throw new Error("cannot start a closed Zstandard frame decoder");
		this.started = true;
		try {
			for (const { start, end } of frames) {
				let decoded;
				try {
					decoded = (0, node_zlib.zstdDecompressSync)(source.subarray(start, end));
				} catch (error) {
					throw new Error(`corrupt Zstandard session log: frame at byte ${start} failed validation`, { cause: error });
				}
				yield decoded;
			}
		} finally {
			this.close();
		}
	}
	/** @inheritdoc */
	close() {
		this.closed = true;
	}
};
//#endregion
//#region lib/types/zstd.js
/**
* Zstandard frame primitives for the JSONL persistence backend. The backend
* owns a concatenated-frame container so it can append and recover batches
* without exposing compression mechanics through the persistence seam.
* @module dsh-session-persistence-jsonl/zstd
*/
const ZSTD_MAGIC = 4247762216;
const zstdCompressAsync = (0, node_util.promisify)(node_zlib.zstdCompress);
const zstdDecompressAsync = (0, node_util.promisify)(node_zlib.zstdDecompress);
const CHECKSUM_OPTIONS = { params: { [node_zlib.constants.ZSTD_c_checksumFlag]: 1 } };
const INCOMPLETE_FRAME_OPTIONS = { finishFlush: node_zlib.constants.ZSTD_e_flush };
/**
* Locate complete frames without decompressing their blocks. Invalid complete
* structure rejects; EOF inside the final frame returns its start for repair.
* @param buffer - complete bytes currently present in the session artifact.
* @param maxFrames - optional complete-frame limit for metadata-only readers.
* @returns complete frame ranges and an optional incomplete-final-frame start.
*/
function scanZstdFrames(buffer, maxFrames = Number.POSITIVE_INFINITY) {
	const frames = [];
	let offset = 0;
	while (offset < buffer.length) {
		const start = offset;
		if (buffer.length - offset < 4) return {
			frames,
			tornStart: start
		};
		if (buffer.readUInt32LE(offset) !== ZSTD_MAGIC) throw new Error(`corrupt Zstandard session log: invalid frame magic at byte ${offset}`);
		offset += 4;
		if (offset === buffer.length) return {
			frames,
			tornStart: start
		};
		const descriptor = buffer.readUInt8(offset);
		offset += 1;
		if ((descriptor & 24) !== 0) throw new Error(`corrupt Zstandard session log: reserved frame-header bit at byte ${offset - 1}`);
		const contentSizeFlag = descriptor >>> 6;
		const singleSegment = (descriptor & 32) !== 0;
		const checksum = (descriptor & 4) !== 0;
		const dictionaryFlag = descriptor & 3;
		const dictionaryBytes = dictionaryFlag === 3 ? 4 : dictionaryFlag;
		const contentSizeBytes = contentSizeFlag === 0 ? singleSegment ? 1 : 0 : 1 << contentSizeFlag;
		const remainingHeaderBytes = (singleSegment ? 0 : 1) + dictionaryBytes + contentSizeBytes;
		if (buffer.length - offset < remainingHeaderBytes) return {
			frames,
			tornStart: start
		};
		offset += remainingHeaderBytes;
		for (;;) {
			if (buffer.length - offset < 3) return {
				frames,
				tornStart: start
			};
			const blockHeader = buffer.readUIntLE(offset, 3);
			offset += 3;
			const lastBlock = (blockHeader & 1) !== 0;
			const blockType = blockHeader >>> 1 & 3;
			const blockSize = blockHeader >>> 3;
			if (blockType === 3) throw new Error(`corrupt Zstandard session log: reserved block type at byte ${offset - 3}`);
			const payloadBytes = blockType === 1 ? 1 : blockSize;
			if (buffer.length - offset < payloadBytes) return {
				frames,
				tornStart: start
			};
			offset += payloadBytes;
			if (lastBlock) break;
		}
		if (checksum) {
			if (buffer.length - offset < 4) return {
				frames,
				tornStart: start
			};
			offset += 4;
		}
		frames.push({
			start,
			end: offset
		});
		if (frames.length === maxFrames) return { frames };
	}
	return { frames };
}
/**
* Compress one independently decodable, checksummed Zstandard frame.
* @param input - JSONL bytes for a header or durable event batch.
* @returns the complete encoded frame.
*/
async function compressZstdFrame(input) {
	return zstdCompressAsync(input, CHECKSUM_OPTIONS);
}
/**
* Select the shared private decoder when the running Node 22/24/26 shape is
* compatible, otherwise preserve correctness with the public one-shot API.
* @returns a synchronous decoder with an implementation-independent lifecycle.
*/
function createZstdFrameDecoder() {
	return NodePrivateZstdFrameDecoder.create() ?? new PublicZstdFrameDecoder();
}
/**
* Recover available plaintext from a structurally incomplete final frame.
* `ZSTD_e_flush` deliberately suppresses final-frame and checksum completion;
* callers must establish the torn frame boundary before using this helper.
* @param input - available bytes from a known incomplete Zstandard frame.
* @returns plaintext produced from the available input.
*/
async function decompressZstdPrefix(input) {
	return zstdDecompressAsync(input, INCOMPLETE_FRAME_OPTIONS);
}
//#endregion
//#region lib/types/generation.js
/**
* Durable whole-generation publication for JSONL Session artifacts.
*
* Format packages transform parsed JSON values. This module owns the physical
* encoding, exact source identity, immutable generation files, and exclusive
* current-generation publication for both configured JSONL suffixes.
* @module @deepseek-ai/dsh-session-persistence-jsonl/generation
*/
/** Internal scheduling bounds: preserve old decode cadence and cap each synchronous encode slice. */
const MIGRATION_DECODE_YIELD_INTERVAL_MS = 500;
const MIGRATION_WORK_CHUNK_BYTES = 1024 * 1024;
const MIGRATION_WRITE_CHUNK_BYTES = 4 * 1024 * 1024;
const ZSTD_CHECKSUM_OPTIONS = {
	chunkSize: MIGRATION_WORK_CHUNK_BYTES,
	params: { [node_zlib.constants.ZSTD_c_checksumFlag]: 1 }
};
/** A historical source changed after its single decode and migration pass. */
var JsonlGenerationSourceChangedError = class extends Error {
	path;
	name = "JsonlGenerationSourceChangedError";
	/** @param path - historical generation whose revision changed. */
	constructor(path) {
		super(`historical session generation changed during migration: "${path}"`);
		this.path = path;
	}
};
/** A historical artifact is intact, but the format edge refuses its contents. */
var JsonlGenerationUnsupportedMigrationError = class extends Error {
	fromVersion;
	reason;
	name = "JsonlGenerationUnsupportedMigrationError";
	/**
	* @param fromVersion - unchanged source generation version.
	* @param reason - format-edge refusal.
	*/
	constructor(fromVersion, reason) {
		super(reason.message, { cause: reason });
		this.fromVersion = fromVersion;
		this.reason = reason;
	}
};
/** A current-generation filename already names different or invalid bytes. */
var JsonlGenerationTargetConflictError = class extends Error {
	path;
	reason;
	name = "JsonlGenerationTargetConflictError";
	/**
	* @param path - immutable target that prevented exclusive publication.
	* @param reason - why the existing target cannot be accepted.
	*/
	constructor(path, reason) {
		super(`current session generation already exists at "${path}": ${reason.message}`, { cause: reason });
		this.path = path;
		this.reason = reason;
	}
};
const defaultFileSystem = {
	open: (path, flags, mode) => (0, node_fs_promises.open)(path, flags, mode),
	readFile: (path, signal) => (0, node_fs_promises.readFile)(path, signal === void 0 ? void 0 : { signal }),
	readdir: (path) => (0, node_fs_promises.readdir)(path),
	stat: (path) => (0, node_fs_promises.stat)(path, { bigint: true }),
	lstat: (path) => (0, node_fs_promises.lstat)(path),
	link: node_fs_promises.link,
	rm: (path) => (0, node_fs_promises.rm)(path, { force: true })
};
const defaultInternals = {
	fs: defaultFileSystem,
	randomToken: () => (0, node_crypto.randomBytes)(8).toString("hex"),
	platform: process.platform,
	publishNewWin32: publishNewFileWin32,
	barrier: () => {}
};
function isEEXIST(error) {
	return error?.code === "EEXIST";
}
/** Whether a filesystem-owned failure should retain its original errno and path. */
function isErrnoException(error) {
	return typeof error?.code === "string";
}
function identity(value) {
	return [
		value.dev,
		value.ino,
		value.size,
		value.mtimeNs,
		value.ctimeNs
	].join(":");
}
async function readStableSnapshot(path, signal, fs) {
	signal?.throwIfAborted();
	let before = await fs.stat(path);
	for (let attempt = 0;; attempt += 1) {
		const bytes = await fs.readFile(path, signal);
		signal?.throwIfAborted();
		const after = await fs.stat(path);
		if (identity(before) === identity(after)) {
			signal?.throwIfAborted();
			return {
				bytes,
				identity: after
			};
		}
		if (attempt === 1) return {
			bytes: bytes.subarray(0, Number(before.size)),
			identity: before
		};
		before = after;
	}
}
/** Parse the version discriminator without validating any version-specific field. */
function storedVersion(header) {
	if (typeof header !== "object" || header === null || Array.isArray(header)) throw new Error("corrupt session log: first line is not a JSON object");
	const version = header.version;
	if (!Number.isSafeInteger(version) || version < 0 || Object.is(version, -0)) throw new Error("corrupt session log: header version is not a non-negative safe integer");
	return version;
}
function parseJson(text, subject) {
	try {
		return JSON.parse(text);
	} catch (error) {
		throw new Error(`corrupt session log: ${subject} is not valid JSON`, { cause: error });
	}
}
/** Incremental JSONL parser that retains only one cross-frame record fragment. */
var MigratingJsonlRows = class {
	restore;
	fragments = [];
	fragmentBytes = 0;
	rowIndex = 0;
	issue;
	constructor(restore) {
		this.restore = restore;
	}
	/** Consume plaintext bytes following the independently decoded header. */
	write(chunk) {
		let lineStart = 0;
		for (let newline = chunk.indexOf(10); newline !== -1; newline = chunk.indexOf(10, lineStart)) {
			const fragment = chunk.subarray(lineStart, newline);
			let line = fragment;
			if (this.fragments.length > 0) {
				if (fragment.length > 0) this.fragments.push(fragment);
				line = Buffer.concat(this.fragments, this.fragmentBytes + fragment.length);
				this.fragments = [];
				this.fragmentBytes = 0;
			}
			this.consume(line);
			lineStart = newline + 1;
		}
		if (lineStart < chunk.length) {
			const fragment = Buffer.from(chunk.subarray(lineStart));
			this.fragments.push(fragment);
			this.fragmentBytes += fragment.length;
		}
	}
	/** Refuse a record fragment left by structurally complete Zstandard frames. */
	assertCompleteFramesEndOnRecord() {
		if (this.fragments.length > 0) throw new Error("corrupt Zstandard session log: complete frame contains a torn JSONL record");
	}
	finish() {
		return this.restore.finish();
	}
	consume(line) {
		const index = this.rowIndex;
		this.rowIndex += 1;
		let row;
		try {
			row = parseJson(line.toString("utf8"), `row ${index + 1}`);
		} catch (error) {
			this.issue ??= asError(error);
			return;
		}
		if (this.issue !== void 0) {
			if (typeof row === "object" && row !== null && row.type === "turn/end") throw this.issue;
			return;
		}
		this.restore.decodeRow(row);
	}
};
async function startMigrationStream(headerRecord, sourceVersion, format, validateHistoricalHeader) {
	const value = parseJson(headerRecord.subarray(0, -1).toString("utf8"), "header line");
	const version = storedVersion(value);
	if (version !== sourceVersion) throw new Error(`resolved JSONL source filename identifies v${sourceVersion}, but its header identifies v${version}`);
	const header = value;
	const validation = validateHistoricalHeader?.(header);
	if (validation !== void 0) await validation;
	return { parser: new MigratingJsonlRows(format.createRestore(header)) };
}
async function consumeMigrationBytes(rows, chunks, signal) {
	signal?.throwIfAborted();
	let yieldDeadline = node_perf_hooks.performance.now() + MIGRATION_DECODE_YIELD_INTERVAL_MS;
	for (const bytes of chunks) for (let offset = 0; offset < bytes.length; offset += MIGRATION_WORK_CHUNK_BYTES) {
		rows.write(bytes.subarray(offset, offset + MIGRATION_WORK_CHUNK_BYTES));
		if (node_perf_hooks.performance.now() < yieldDeadline) continue;
		await node_timers_promises.scheduler.yield();
		signal?.throwIfAborted();
		yieldDeadline = node_perf_hooks.performance.now() + MIGRATION_DECODE_YIELD_INTERVAL_MS;
	}
}
async function decodeStreamingMigration(bytes, compression, sourceVersion, format, validateHistoricalHeader, signal) {
	signal?.throwIfAborted();
	if (compression === "none") {
		const headerEnd = bytes.indexOf(10);
		if (headerEnd === -1) throw new Error("empty or header-less session log");
		const stream = await startMigrationStream(bytes.subarray(0, headerEnd + 1), sourceVersion, format, validateHistoricalHeader);
		signal?.throwIfAborted();
		const bodyEnd = bytes.lastIndexOf(10);
		if (bodyEnd > headerEnd) await consumeMigrationBytes(stream.parser, [bytes.subarray(headerEnd + 1, bodyEnd + 1)], signal);
		return stream.parser.finish();
	}
	const { frames, tornStart } = scanZstdFrames(bytes);
	if (frames.length === 0) throw new Error("empty or header-less Zstandard session log");
	const decoder = createZstdFrameDecoder();
	try {
		const decoded = decoder.decode(bytes, frames);
		const first = decoded.next();
		/* v8 ignore next -- a non-empty structural frame list yields once or throws. */
		if (first.done) throw new Error("empty or header-less Zstandard session log");
		assertIndependentHeaderFrame(first.value);
		const stream = await startMigrationStream(first.value, sourceVersion, format, validateHistoricalHeader);
		signal?.throwIfAborted();
		await consumeMigrationBytes(stream.parser, decoded, signal);
		stream.parser.assertCompleteFramesEndOnRecord();
		if (tornStart !== void 0) {
			let recovered = Buffer.alloc(0);
			try {
				recovered = await decompressZstdPrefix(bytes.subarray(tornStart));
			} catch {
				/* v8 ignore next -- decoder failure plus concurrent abort is timing-dependent. */
				if (signal?.aborted) signal.throwIfAborted();
			}
			signal?.throwIfAborted();
			const newline = recovered.lastIndexOf(10);
			if (newline !== -1) await consumeMigrationBytes(stream.parser, [recovered.subarray(0, newline + 1)], signal);
		}
		return stream.parser.finish();
	} finally {
		decoder.close();
	}
}
/**
* Read and validate one complete current generation for an isolated verifier.
* @param path - staged or competing current-generation path.
* @param compression - configured physical encoding.
* @param expectedId - Session identity expected in the header.
* @param expectedEventCount - exact logical event count expected after decoding.
* @param expectedPrefix - verified migration prefix; an append tail may be present and is not validated.
* @returns stable physical identity and digest for publication comparison.
*/
async function verifyJsonlCurrentGeneration(path, compression, expectedId, expectedEventCount, expectedPrefix) {
	return defaultGenerationRuntime.verify(path, compression, expectedId, expectedEventCount, expectedPrefix);
}
async function verifyCurrentGeneration(path, compression, expectedId, expectedEventCount, fs, expectedPrefix) {
	const before = await fs.stat(path);
	const bytes = await fs.readFile(path);
	const after = await fs.stat(path);
	if (expectedPrefix !== void 0) {
		if (bytes.length < expectedPrefix.bytes) throw new Error("target bytes are shorter than the migrated generation");
		const digest = (0, node_crypto.createHash)("sha256").update(bytes.subarray(0, expectedPrefix.bytes)).digest("hex");
		if (digest !== expectedPrefix.digest) throw new Error("target bytes do not begin with the migrated generation");
		return {
			identity: after,
			bytes: expectedPrefix.bytes,
			digest
		};
	}
	if (identity(before) !== identity(after)) throw new Error("current session generation changed during verification");
	const snapshot = {
		bytes,
		identity: after
	};
	const generation = decodeCurrentGeneration(snapshot.bytes, compression);
	validateStoredEvents(generation.meta, generation.events, {
		kind: "jsonl",
		path
	});
	if (generation.meta.id !== expectedId) throw new Error(`current session generation contains id "${generation.meta.id}", expected "${expectedId}"`);
	if (generation.events.length !== expectedEventCount) throw new Error(`current session generation contains ${generation.events.length} events, expected ${expectedEventCount}`);
	Session.fromRestore(generation.meta.id, generation.events, generation.meta, generation.inheritedEventCount, "detached");
	assertCurrentAssistantStreams(generation.events);
	return {
		identity: snapshot.identity,
		bytes: snapshot.bytes.length,
		digest: (0, node_crypto.createHash)("sha256").update(snapshot.bytes).digest("hex")
	};
}
/** Fully replay embedded streams only inside isolated current-generation verification. */
function assertCurrentAssistantStreams(events) {
	for (const [index, event] of events.entries()) {
		if (event.type !== "assistant/message" && event.type !== "assistant/attempt") continue;
		const assembler = new BlockAssembler();
		let timed;
		try {
			timed = expandAssistantStream(event.data.stream);
			for (const member of timed) assembler.push(member.chunk);
		} catch (error) {
			throw new Error(`seed ${event.type} at index ${index} has an invalid embedded stream`, { cause: error });
		}
		if (event.type === "assistant/attempt" || timed.length === 0) continue;
		const content = event.data.interrupted === true ? assembler.interruptedBlocks() : assembler.blocks();
		if (!(0, node_util.isDeepStrictEqual)(event.data.message.content, content)) throw new Error(`seed assistant/message at index ${index} content disagrees with its embedded stream`);
		if (!(0, node_util.isDeepStrictEqual)(event.data.usage, assembler.usage)) throw new Error(`seed assistant/message at index ${index} usage disagrees with its embedded stream`);
		if (!(0, node_util.isDeepStrictEqual)(event.data.message.source.replayState, assembler.replayState)) throw new Error(`seed assistant/message at index ${index} replay state disagrees with its embedded stream`);
	}
}
function decodeCurrentGeneration(bytes, compression) {
	if (compression === "none") {
		const headerEnd = bytes.indexOf(10);
		if (headerEnd === -1) throw new Error("empty or header-less session log");
		const scanner = new SessionLogScanner(bytes.subarray(0, headerEnd + 1), "strict");
		scanner.write(bytes.subarray(headerEnd + 1));
		return finishCurrentGenerationScan(scanner);
	}
	const { frames, tornStart } = scanZstdFrames(bytes);
	if (frames.length === 0) throw new Error("empty or header-less Zstandard session log");
	if (tornStart !== void 0) throw new Error("current session generation has a torn physical tail");
	const decoder = createZstdFrameDecoder();
	try {
		const plaintext = decoder.decode(bytes, frames);
		const header = plaintext.next();
		/* v8 ignore next -- a non-empty structural frame list yields once or throws. */
		if (header.done) throw new Error("empty or header-less Zstandard session log");
		assertIndependentHeaderFrame(header.value);
		const scanner = new SessionLogScanner(header.value, "strict");
		for (const chunk of plaintext) scanner.write(chunk);
		return finishCurrentGenerationScan(scanner);
	} finally {
		decoder.close();
	}
}
function finishCurrentGenerationScan(scanner) {
	const inputBytes = scanner.checkpoint().inputBytes;
	const decoded = scanner.finish();
	if (decoded.committedBytes !== inputBytes) throw new Error("current session generation has a torn physical tail");
	return decoded;
}
function stringifyJson(value, subject) {
	let text;
	try {
		text = JSON.stringify(value);
	} catch (error) {
		throw new Error(`${subject} is not lossless JSON`, { cause: error });
	}
	if (typeof text !== "string") throw new Error(`${subject} is not lossless JSON`);
	return text;
}
function assertIndependentHeaderFrame(plaintext) {
	if (plaintext.length === 0 || plaintext.indexOf(10) !== plaintext.length - 1) throw new Error("corrupt Zstandard session log: first frame is not exactly one header line");
}
function assertGenerationPaths(sourcePath, sourceVersion, currentPath, currentVersion, compression) {
	const expectedSource = generationLogFilename(sourceVersion, compression);
	const expectedCurrent = generationLogFilename(currentVersion, compression);
	if ((0, node_path.basename)(sourcePath) !== expectedSource) throw new Error(`resolved JSONL source path must end with "${expectedSource}": ${sourcePath}`);
	if ((0, node_path.basename)(currentPath) !== expectedCurrent) throw new Error(`current JSONL generation path must end with "${expectedCurrent}": ${currentPath}`);
	if ((0, node_path.dirname)(sourcePath) !== (0, node_path.dirname)(currentPath)) throw new Error("source and current JSONL generations must share one Session directory");
	return logSuffix(compression);
}
async function syncDirectory(path, internals) {
	/* v8 ignore next -- Windows namespace operations request write-through directly. */
	if (internals.platform === "win32") return;
	const handle = await internals.fs.open(path, "r");
	try {
		await handle.sync();
	} finally {
		await handle.close();
	}
}
/** Produce bounded JSONL chunks while yielding between main-thread encoding slices. */
async function* encodeMigrationRows(artifact, format, signal) {
	signal?.throwIfAborted();
	let lines = [];
	let bytes = 0;
	for (const value of artifact.events) {
		const line = `${stringifyJson(format.encodeEvent(value), `migrated Session event ${value.seq}`)}\n`;
		const lineBytes = Buffer.byteLength(line);
		if (bytes > 0 && bytes + lineBytes > MIGRATION_WORK_CHUNK_BYTES) {
			yield Buffer.from(lines.join(""));
			await node_timers_promises.scheduler.yield();
			signal?.throwIfAborted();
			lines = [];
			bytes = 0;
		}
		lines.push(line);
		bytes += lineBytes;
	}
	yield Buffer.from(lines.join(""));
}
async function writeMigrationChunks(chunks, write) {
	let pending = [];
	let bytes = 0;
	for await (const chunk of chunks) {
		pending.push(chunk);
		bytes += chunk.length;
		if (bytes < MIGRATION_WRITE_CHUNK_BYTES) continue;
		await write(pending.length === 1 ? pending[0] : Buffer.concat(pending, bytes));
		pending = [];
		bytes = 0;
	}
	if (bytes > 0) await write(pending.length === 1 ? pending[0] : Buffer.concat(pending, bytes));
}
/** Encode directly into one synced stage without a whole-artifact row or byte buffer. */
async function writeSyncedTemp(currentPath, suffix, compression, artifact, format, signal, internals) {
	signal?.throwIfAborted();
	let path;
	let handle;
	for (;;) {
		path = (0, node_path.join)((0, node_path.dirname)(currentPath), `session.migration.${internals.randomToken()}${suffix}.tmp`);
		try {
			handle = await internals.fs.open(path, "wx", 384);
			break;
		} catch (error) {
			if (isEEXIST(error)) continue;
			throw error;
		}
	}
	const hash = (0, node_crypto.createHash)("sha256");
	let bytes = 0;
	const write = async (chunk) => {
		await handle.writeFile(chunk);
		hash.update(chunk);
		bytes += chunk.length;
	};
	let failure;
	try {
		const headerValue = format.encodeHeader(artifact.header, artifact.inheritedEventCount);
		const header = Buffer.from(`${stringifyJson(headerValue, "migrated session header")}\n`);
		await write(compression === "zstd" ? await compressZstdFrame(header) : header);
		if (artifact.events.length > 0) {
			const rows = encodeMigrationRows(artifact, format, signal);
			if (compression === "none") await writeMigrationChunks(rows, write);
			else await new Promise((resolve, reject) => {
				(0, node_stream.pipeline)(node_stream.Readable.from(rows, {
					objectMode: false,
					highWaterMark: MIGRATION_WORK_CHUNK_BYTES
				}), (0, node_zlib.createZstdCompress)(ZSTD_CHECKSUM_OPTIONS), async (source) => {
					await writeMigrationChunks(source, write);
				}, (error) => {
					if (error instanceof Error) reject(error);
					else resolve();
				});
			});
		}
		signal?.throwIfAborted();
		await handle.sync();
	} catch (error) {
		failure = error;
	}
	try {
		await handle.close();
	} catch (error) {
		failure = failure === void 0 ? error : new AggregateError([failure, error], `failed to write and close migration stage "${path}"`);
	}
	if (failure !== void 0) {
		const writeError = failure instanceof Error ? failure : new Error("migration stage write failed with a non-Error rejection", { cause: failure });
		await removeTemporary(path, writeError, internals);
		throw writeError;
	}
	return {
		path,
		bytes,
		digest: hash.digest("hex")
	};
}
/** Remove one temporary file without hiding the operation failure that made it disposable. */
async function removeTemporary(path, primaryFailure, internals) {
	try {
		await internals.fs.rm(path);
	} catch (cleanupFailure) {
		throw new AggregateError([primaryFailure, cleanupFailure], `failed to clean migration temporary "${path}" after an earlier failure`);
	}
}
/** Remove a redundant stage after the target has been validated as committed. */
async function removeCommittedTemporary(path, internals) {
	try {
		await internals.fs.rm(path);
	} catch {}
}
async function publishCurrentExclusive(staged, currentPath, internals) {
	if (internals.platform === "win32") try {
		await internals.publishNewWin32(staged, currentPath);
		return true;
	} catch (error) {
		/* v8 ignore else -- native helper tests own non-collision Win32 failures. */
		if (isEEXIST(error)) return false;
		/* v8 ignore next -- the filesystem error is already complete. */
		throw error;
	}
	try {
		await internals.fs.link(staged, currentPath);
	} catch (error) {
		/* v8 ignore else -- a non-collision filesystem error propagates unchanged. */
		if (isEEXIST(error)) return false;
		/* v8 ignore next -- the filesystem error is already complete. */
		throw error;
	}
	await syncDirectory((0, node_path.dirname)(currentPath), internals);
	return true;
}
function asError(error) {
	return error instanceof Error ? error : new Error("current-generation validation failed with a non-Error rejection", { cause: error });
}
async function inspectExpectedCurrent(currentPath, internals, inspect) {
	try {
		const expectedName = (0, node_path.basename)(currentPath);
		const names = await internals.fs.readdir((0, node_path.dirname)(currentPath));
		if (!names.includes(expectedName)) {
			const noncanonical = names.find((name) => name.toLowerCase() === expectedName.toLowerCase());
			if (noncanonical !== void 0) throw new Error(`target resolves to noncanonical directory entry "${noncanonical}"`);
		}
		const info = await internals.fs.lstat(currentPath);
		if (info.isSymbolicLink() || !info.isFile()) throw new Error(`target is a ${info.isSymbolicLink() ? "symbolic link" : "non-regular file"}`);
		return await inspect();
	} catch (error) {
		if (isErrnoException(error)) throw error;
		throw new JsonlGenerationTargetConflictError(currentPath, asError(error));
	}
}
function withOverrides(overrides) {
	return {
		...defaultInternals,
		...overrides,
		fs: {
			...defaultFileSystem,
			...overrides.fs
		}
	};
}
async function publishPreparedMigration(options, suffix, artifact, sourceIdentity, internals) {
	await node_timers_promises.scheduler.yield();
	const { sourcePath, currentPath, compression, verifyCurrentFile } = options;
	const eventCount = artifact.events.length;
	let staged = await writeSyncedTemp(currentPath, suffix, compression, artifact, options.format, void 0, internals);
	try {
		const verifiedStage = await verifyCurrentFile(staged.path, compression, artifact.header.id, eventCount);
		if (verifiedStage.bytes !== staged.bytes || verifiedStage.digest !== staged.digest) throw new Error("staged session generation changed during verification");
		await internals.barrier("before-source-check", 1);
		if (identity(await internals.fs.stat(sourcePath)) !== identity(sourceIdentity)) throw new JsonlGenerationSourceChangedError(sourcePath);
		const published = await publishCurrentExclusive(staged.path, currentPath, internals);
		if (published && internals.platform === "win32") staged = {
			...staged,
			path: ""
		};
		await internals.barrier("after-publication", 1);
		let currentIdentity;
		if (published) {
			if (staged.path !== "") {
				await removeCommittedTemporary(staged.path, internals);
				staged = {
					...staged,
					path: ""
				};
			}
			currentIdentity = await internals.fs.stat(currentPath);
		} else {
			currentIdentity = (await inspectExpectedCurrent(currentPath, internals, async () => {
				const candidate = await verifyCurrentFile(currentPath, compression, artifact.header.id, eventCount, staged);
				if (candidate.bytes !== staged.bytes || candidate.digest !== staged.digest) throw new Error("target bytes differ from the migrated generation");
				return candidate;
			})).identity;
			await removeCommittedTemporary(staged.path, internals);
			staged = {
				...staged,
				path: ""
			};
		}
		return currentIdentity;
	} catch (error) {
		if (staged.path !== "") await removeTemporary(staged.path, error, internals);
		throw error;
	}
}
async function prepareMigration(options, internals) {
	const { sourcePath, sourceVersion, currentPath, compression, format, signal } = options;
	const suffix = assertGenerationPaths(sourcePath, sourceVersion, currentPath, format.currentVersion, compression);
	if (sourceVersion >= format.currentVersion) throw new Error(`migration preparation requires a historical source, got v${sourceVersion}`);
	const source = await readStableSnapshot(sourcePath, signal, internals.fs);
	let artifact;
	try {
		artifact = await decodeStreamingMigration(source.bytes, compression, sourceVersion, format, options.validateHistoricalHeader, signal);
	} catch (error) {
		if (format.isUnsupportedMigrationError?.(error) === true) throw new JsonlGenerationUnsupportedMigrationError(sourceVersion, error);
		throw error;
	}
	if (artifact.header.version !== format.currentVersion) throw new Error(`format migration returned v${artifact.header.version}, expected v${format.currentVersion}`);
	const sourceIdentity = source.identity;
	let publication;
	return {
		sourceIdentity,
		artifact,
		publish() {
			if (publication === void 0) publication = publishPreparedMigration(options, suffix, artifact, sourceIdentity, internals);
			return publication;
		}
	};
}
/**
* Create one generation runtime with fixed filesystem and publication dependencies.
* @param overrides - deterministic filesystem, platform, and race dependencies.
* @returns bound generation operations.
*/
function createJsonlGenerationRuntime(overrides = {}) {
	const internals = withOverrides(overrides);
	return {
		readStable: (path, signal) => readStableSnapshot(path, signal, internals.fs),
		prepare: (options) => prepareMigration(options, internals),
		verify: (path, compression, expectedId, expectedEventCount, expectedPrefix) => verifyCurrentGeneration(path, compression, expectedId, expectedEventCount, internals.fs, expectedPrefix)
	};
}
const defaultGenerationRuntime = createJsonlGenerationRuntime();
//#endregion
//#region lib/types/worker.js
/** Worker entry for current-generation physical and logical verification. */
function parseRequest(value) {
	if (typeof value !== "object" || value === null) throw new Error("migration verifier request must be an object");
	const request = value;
	if (typeof request.path !== "string" || request.compression !== "none" && request.compression !== "zstd" || typeof request.expectedId !== "string" || !Number.isSafeInteger(request.expectedEventCount) || request.expectedEventCount < 0 || request.expectedPrefix !== void 0 && (!Number.isSafeInteger(request.expectedPrefix.bytes) || request.expectedPrefix.bytes < 0 || !/^[0-9a-f]{64}$/.test(request.expectedPrefix.digest))) throw new Error("migration verifier request is malformed");
	return request;
}
if (node_worker_threads.parentPort === null) throw new Error("migration verifier requires a parent port");
const port = node_worker_threads.parentPort;
const request = parseRequest(node_worker_threads.workerData);
async function verify() {
	try {
		const result = await verifyJsonlCurrentGeneration(request.path, request.compression, request.expectedId, request.expectedEventCount, request.expectedPrefix);
		port.postMessage({
			ok: true,
			result
		});
	} catch (error) {
		const failure = error instanceof Error ? error : new Error(String(error));
		port.postMessage({
			ok: false,
			message: failure.message,
			stack: failure.stack
		});
	} finally {
		port.close();
	}
}
verify();
//#endregion
