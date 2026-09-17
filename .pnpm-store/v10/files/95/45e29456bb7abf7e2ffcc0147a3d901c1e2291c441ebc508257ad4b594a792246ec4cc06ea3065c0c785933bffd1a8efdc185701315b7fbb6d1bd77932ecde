window.__ModuleLoader__.load({
	id: "@deepseek-ai/dsh-client-ui-conversation",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		//#region \0rolldown/runtime.js
		var __create = Object.create;
		var __defProp = Object.defineProperty;
		var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
		var __getOwnPropNames = Object.getOwnPropertyNames;
		var __getProtoOf = Object.getPrototypeOf;
		var __hasOwnProp = Object.prototype.hasOwnProperty;
		var __copyProps = (to, from, except, desc) => {
			if (from && typeof from === "object" || typeof from === "function") for (var keys = __getOwnPropNames(from), i = 0, n = keys.length, key; i < n; i++) {
				key = keys[i];
				if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
					get: ((k) => from[k]).bind(null, key),
					enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
				});
			}
			return to;
		};
		var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", {
			value: mod,
			enumerable: true
		}) : target, mod));
		//#endregion
		let _deepseek_ai_dsh_client_store = require("@deepseek-ai/dsh-client-store");
		let _deepseek_ai_dsh_client_ui_slots = require("@deepseek-ai/dsh-client-ui-slots");
		let _deepseek_ai_cordis = require("@deepseek-ai/cordis");
		let react_jsx_runtime = require("react/jsx-runtime");
		let _deepseek_ai_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");
		let react = require("react");
		react = __toESM(react, 1);
		let react_dom = require("react-dom");
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
		//#endregion
		//#region ../../../vendor/cosmokit/src/types.ts
		/** Test values using `instanceof` with a `toStringTag` fallback. */
		function is$1(type, value) {
			if (arguments.length === 1) return (value) => is$1(type, value);
			return type in globalThis && value instanceof globalThis[type] || Object.prototype.toString.call(value).slice(8, -1) === type;
		}
		function isArrayBufferLike(value) {
			return is$1("ArrayBuffer", value) || is$1("SharedArrayBuffer", value);
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
			if (is$1("Date", source)) return new Date(source.valueOf());
			if (is$1("RegExp", source)) return new RegExp(source.source, source.flags);
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
			return check(Array.isArray, (a, b) => a.length === b.length && a.every((item, index) => deepEqual(item, b[index]))) ?? check(is$1("Date"), (a, b) => a.valueOf() === b.valueOf()) ?? check(is$1("RegExp"), (a, b) => a.source === b.source && a.flags === b.flags) ?? check(isArrayBufferLike, (a, b) => {
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
		//#region lib/types/client/contract/request-inspection.js
		/**
		* Canonicalize one request header against the system node in force and
		* classify the model-visible prompt change.
		* @param previous - Prompt from the preceding loaded request header, when available.
		* @param event - Durable full request header to inspect.
		* @param system - Effective nonempty system prompt after loaded surface replacements; empty when removed.
		* An in-history update already presented its text at its own position, so the header reports no system change for it.
		* @returns The canonical prompt and an initial/system/tool change when it can be established.
		*/
		function inspectRequestPrompt(previous, event, system) {
			const header = event.data.header;
			const rawTools = header.tools;
			const prompt = {
				config: header.config,
				system: system?.text ?? "",
				tools: Array.isArray(rawTools) ? rawTools : []
			};
			if (previous === void 0 && event.data.reason !== "initial") return { prompt };
			const systemChanged = previous !== void 0 && previous.system !== prompt.system && system?.update !== true;
			const toolsChanged = previous !== void 0 && JSON.stringify(previous.tools) !== JSON.stringify(prompt.tools);
			if (previous !== void 0 && !systemChanged && !toolsChanged) return { prompt };
			const origin = system !== void 0 && (previous === void 0 || systemChanged) ? system : event;
			return {
				prompt,
				change: {
					seq: origin.seq,
					time: origin.time,
					kind: previous === void 0 ? "initial" : systemChanged && toolsChanged ? "system-and-tools" : systemChanged ? "system" : "tools",
					...previous === void 0 ? {} : { previous }
				}
			};
		}
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
		* Narrow an event to a surface-eligible event carrying its required marker.
		* @param event - event to test.
		* @returns true when both the type and marker identify a surface event.
		*/
		function isSurfaceEvent(event) {
			if (!SURFACE_EVENT_TYPES.has(event.type)) return false;
			return event.surfaceOp !== void 0;
		}
		//#endregion
		//#region lib/types/client/contract/system-prompt.js
		/**
		* Apply a system event or positional replacement without retaining ordinary messages.
		* Replacement positions inherit their start endpoint, not their chronological seq.
		* Unknown older endpoint order withholds the prompt until prepend replay resolves it.
		* @param previous - Interpretation at the preceding relevant event in the loaded window.
		* @param event - System message or surface replacement already admitted by Session.
		* @returns Immutable surviving system facts and the effective nonempty prompt.
		*/
		function inspectSystemPrompt(previous, event) {
			const op = isSurfaceEvent(event) ? event.surfaceOp : void 0;
			const firstSeq = previous?.firstSeq ?? event.seq;
			let nodes = previous?.nodes ?? [];
			let replacements = previous?.replacements ?? /* @__PURE__ */ new Map();
			const unknownEndpoint = (seq) => seq < firstSeq && !replacements.has(seq);
			const uncertain = previous?.uncertain === true || op !== void 0 && op !== "append" && (unknownEndpoint(op.startSeq) || unknownEndpoint(op.endSeq));
			if (uncertain) return {
				firstSeq,
				uncertain,
				nodes: [],
				replacements: /* @__PURE__ */ new Map(),
				effective: void 0,
				introduced: void 0
			};
			let position = event.seq;
			if (op !== void 0 && op !== "append") {
				position = replacements.get(op.startSeq) ?? op.startSeq;
				const end = replacements.get(op.endSeq) ?? op.endSeq;
				nodes = nodes.filter((item) => item.position < position || item.position > end);
				const retained = new Map([...replacements].filter(([, value]) => value < position || value > end));
				retained.set(event.seq, position);
				replacements = retained;
			}
			const introduced = event.type === "system/message" ? {
				seq: event.seq,
				time: event.time,
				turn: event.data.turn,
				step: event.data.step,
				text: event.data.message.content.flatMap((block) => block.type === "text" ? [block.text] : []).join(""),
				update: op === "append" && previous?.nodes.some((item) => item.node.text !== "") === true
			} : void 0;
			if (introduced !== void 0) nodes = [...nodes, {
				position,
				node: introduced
			}].sort((a, b) => a.position - b.position);
			const surviving = nodes.findLast((item) => item.node.text !== "")?.node;
			const effective = surviving === previous?.nodes.findLast((item) => item.node.text !== "")?.node ? previous?.effective : introduced !== void 0 && introduced === surviving ? introduced : {
				seq: event.seq,
				time: event.time,
				turn: surviving?.turn ?? 0,
				step: surviving?.step ?? 0,
				text: surviving?.text ?? "",
				update: false
			};
			return {
				firstSeq,
				uncertain,
				nodes,
				replacements,
				effective,
				introduced
			};
		}
		//#endregion
		//#region lib/types/client/contract/conversation.js
		/**
		* Build a stable collision-free key for one Definition-local business identity.
		* @param kind - Definition kind.
		* @param id - Definition-local business identity.
		* @returns engine-owned Context key.
		*/
		function conversationContextKey(kind, id) {
			return `${kind.length}:${kind}${id}`;
		}
		//#endregion
		//#region lib/types/client/conversation/location-index.js
		var MutableLocationDataSource = class {
			store;
			key;
			listeners = /* @__PURE__ */ new Set();
			published;
			constructor(store, key) {
				this.store = store;
				this.key = key;
				this.published = store.get(key);
			}
			getSnapshot = () => this.store.get(this.key);
			subscribe = (listener) => {
				this.listeners.add(listener);
				return () => {
					this.listeners.delete(listener);
				};
			};
			publish() {
				const next = this.getSnapshot();
				if (this.published === next) return;
				this.published = next;
				(0, _deepseek_ai_dsh_client_store.notifySubscribers)(this.listeners, `[ui-conversation] Location data ${this.key}`);
			}
		};
		var MutableLocationDataStore = class {
			markDirty;
			entries = /* @__PURE__ */ new Map();
			sources = /* @__PURE__ */ new Map();
			dirtyKeys = /* @__PURE__ */ new Set();
			constructor(markDirty) {
				this.markDirty = markDirty;
			}
			get(key) {
				return this.entries.get(key)?.value;
			}
			source(key) {
				let source = this.sources.get(key);
				if (source === void 0) {
					source = new MutableLocationDataSource(this, key);
					this.sources.set(key, source);
				}
				return source;
			}
			remove(owner, key) {
				if (this.entries.get(key)?.owner !== owner) return false;
				this.entries.delete(key);
				this.changed(key);
				return true;
			}
			set(owner, key, value) {
				const current = this.entries.get(key);
				if (current !== void 0 && current.owner !== owner) throw new Error(`conversation Location data "${key}" is already owned by ${current.owner}`);
				if (current?.value === value) return false;
				this.entries.set(key, {
					owner,
					value
				});
				this.changed(key);
				return true;
			}
			replace(entries) {
				const changedKeys = [];
				for (const key of new Set([...this.entries.keys(), ...entries.keys()])) {
					const current = this.entries.get(key);
					const next = entries.get(key);
					if (current?.owner !== next?.owner || current?.value !== next?.value) changedKeys.push(key);
				}
				if (changedKeys.length === 0) return false;
				this.entries = new Map(entries);
				for (const key of changedKeys) this.changed(key);
				return true;
			}
			publish() {
				const dirty = [...this.dirtyKeys];
				this.dirtyKeys.clear();
				for (const key of dirty) this.sources.get(key)?.publish();
			}
			changed(key) {
				this.dirtyKeys.add(key);
				this.markDirty(this);
			}
		};
		const SESSION_LOCATION = { kind: "session" };
		const UNRESOLVED_LOCATION = { kind: "unresolved" };
		function payloadCoordinates(event) {
			const data = event.data;
			if (data.turn === null) return { session: true };
			const turn = Number.isSafeInteger(data.turn) && data.turn >= 0 ? data.turn : void 0;
			const step = Number.isSafeInteger(data.step) && data.step >= 0 ? data.step : void 0;
			return {
				...turn === void 0 ? {} : { turn },
				...step === void 0 ? {} : { step }
			};
		}
		function sameReferences(left, right) {
			return left.length === right.length && left.every((value, index) => value === right[index]);
		}
		function sameStep(left, right) {
			return left !== void 0 && left.start === right.start && left.end === right.end && left.status === right.status && left.data === right.data;
		}
		function sameTurn(left, right) {
			return left !== void 0 && left.start === right.start && left.end === right.end && left.status === right.status && left.data === right.data && sameReferences(left.steps, right.steps);
		}
		function sameLocation(left, right) {
			if (left === void 0 || right === void 0 || left.kind !== right.kind) return left === right;
			if (left.kind === "session" || left.kind === "unresolved") return true;
			if (right.kind === "session" || right.kind === "unresolved") return false;
			if (left.kind === "turn" || right.kind === "turn") return left.kind === "turn" && right.kind === "turn" && left.turn === right.turn;
			return left.turn === right.turn && left.step === right.step;
		}
		/** Session-owned Turn/Step timeline and event-to-Location index. */
		var ConversationLocationIndex = class {
			coordinates = /* @__PURE__ */ new Map();
			locations = /* @__PURE__ */ new Map();
			seqsByTurn = /* @__PURE__ */ new Map();
			timeline = {
				turnOrder: [],
				turns: /* @__PURE__ */ new Map()
			};
			turnDataStores = /* @__PURE__ */ new Map();
			stepDataStores = /* @__PURE__ */ new Map();
			dirtyDataStores = /* @__PURE__ */ new Set();
			currentTurn;
			currentStep;
			/**
			* Return the current reference-stable timeline.
			* @returns current timeline snapshot.
			*/
			snapshot() {
				return this.timeline;
			}
			/**
			* Replace all Definition-owned Location values while preserving reader identities.
			* @param entries - complete current set of Definition-owned Location values.
			* @returns whether any published Location data changed.
			*/
			replaceData(entries) {
				const turns = /* @__PURE__ */ new Map();
				const steps = /* @__PURE__ */ new Map();
				for (const { owner, data } of entries) {
					const values = data.kind === "turn" ? turns.get(data.turn) ?? /* @__PURE__ */ new Map() : steps.get(stepDataKey(data.turn, requireStep(data))) ?? /* @__PURE__ */ new Map();
					const current = values.get(data.key);
					if (current !== void 0 && current.owner !== owner) throw new Error(`conversation Location data "${data.key}" is already owned by ${current.owner}`);
					values.set(data.key, {
						owner,
						value: data.value
					});
					if (data.kind === "turn") turns.set(data.turn, values);
					else steps.set(stepDataKey(data.turn, requireStep(data)), values);
				}
				let changed = false;
				for (const turn of new Set([...this.turnDataStores.keys(), ...turns.keys()])) changed = this.mutableTurnData(turn).replace(turns.get(turn) ?? /* @__PURE__ */ new Map()) || changed;
				for (const step of new Set([...this.stepDataStores.keys(), ...steps.keys()])) changed = this.mutableStepData(step).replace(steps.get(step) ?? /* @__PURE__ */ new Map()) || changed;
				return changed;
			}
			/**
			* Apply changed Context publications without rebuilding Turn/Step membership.
			* @param changes - incremental removals and replacements from published Contexts.
			* @returns whether any published Location data changed.
			*/
			applyData(changes) {
				let changed = false;
				for (const change of changes) {
					const previous = change.previous;
					if (previous === null) continue;
					changed = this.storeFor(previous).remove(change.owner, previous.key) || changed;
				}
				for (const change of changes) {
					const next = change.next;
					if (next === null) continue;
					changed = this.storeFor(next).set(change.owner, next.key, next.value) || changed;
				}
				return changed;
			}
			/** Publish committed Location-data changes to their keyed sources. */
			publishData() {
				const dirty = [...this.dirtyDataStores];
				this.dirtyDataStores.clear();
				for (const store of dirty) store.publish();
			}
			/**
			* Resolve the latest Location for one event.
			* @param event - event already ingested into this index.
			* @returns current Location, falling back to session when it has no Turn/Step affinity.
			*/
			locationOf(event) {
				return this.locations.get(event.seq) ?? SESSION_LOCATION;
			}
			/**
			* Rebuild timeline facts after replace/prepend or a boundary append.
			* @param entries - complete current window in ascending seq order.
			* @returns seqs whose resolved Location changed.
			*/
			rebuild(entries) {
				const previousLocations = this.locations;
				const turns = /* @__PURE__ */ new Map();
				const coordinates = /* @__PURE__ */ new Map();
				let currentTurn;
				let currentStep;
				const turnDraft = (turn, seq) => {
					let draft = turns.get(turn);
					if (draft === void 0) {
						draft = {
							turn,
							firstSeq: seq,
							steps: /* @__PURE__ */ new Map()
						};
						turns.set(turn, draft);
					} else draft.firstSeq = Math.min(draft.firstSeq, seq);
					return draft;
				};
				const stepDraft = (turn, step, seq) => {
					const owner = turnDraft(turn, seq);
					let draft = owner.steps.get(step);
					if (draft === void 0) {
						draft = {
							turn,
							step,
							firstSeq: seq
						};
						owner.steps.set(step, draft);
					} else draft.firstSeq = Math.min(draft.firstSeq, seq);
					return draft;
				};
				for (const { event } of entries) {
					const explicit = payloadCoordinates(event);
					if (event.type === "turn/start") {
						currentTurn = event.data.turn;
						currentStep = void 0;
					}
					if (event.type === "step/start") {
						currentTurn = event.data.turn;
						currentStep = event.data.step;
					}
					if (explicit.session !== true && explicit.turn !== void 0) {
						if (currentTurn !== explicit.turn) currentStep = void 0;
						currentTurn = explicit.turn;
						if (explicit.step !== void 0) currentStep = explicit.step;
					}
					const turn = explicit.session === true ? void 0 : explicit.turn ?? currentTurn;
					const step = explicit.session === true || event.type === "turn/start" || event.type === "turn/end" ? void 0 : explicit.step ?? (turn === currentTurn ? currentStep : void 0);
					coordinates.set(event.seq, {
						...turn === void 0 ? {} : { turn },
						...turn === void 0 || step === void 0 ? {} : { step }
					});
					if (turn !== void 0) turnDraft(turn, event.seq);
					if (turn !== void 0 && step !== void 0) stepDraft(turn, step, event.seq);
					if (event.type === "turn/start") turnDraft(event.data.turn, event.seq).start = event;
					else if (event.type === "turn/end") turnDraft(event.data.turn, event.seq).end = event;
					else if (event.type === "step/start") stepDraft(event.data.turn, event.data.step, event.seq).start = event;
					else if (event.type === "step/end") stepDraft(event.data.turn, event.data.step, event.seq).end = event;
					if (event.type === "step/end" && currentTurn === event.data.turn && currentStep === event.data.step) currentStep = void 0;
					if (event.type === "turn/end" && currentTurn === event.data.turn) {
						currentTurn = void 0;
						currentStep = void 0;
					}
				}
				const previousTurns = this.timeline.turns;
				const nextTurns = /* @__PURE__ */ new Map();
				const orderedDrafts = [...turns.values()].sort((left, right) => left.firstSeq - right.firstSeq);
				for (const draft of orderedDrafts) {
					const previousTurn = previousTurns.get(draft.turn);
					const previousSteps = new Map(previousTurn?.steps.map((step) => [step.step, step]) ?? []);
					const steps = [...draft.steps.values()].sort((left, right) => left.firstSeq - right.firstSeq).map((candidate) => {
						const value = {
							turn: candidate.turn,
							step: candidate.step,
							start: candidate.start,
							end: candidate.end,
							status: candidate.end !== void 0 ? "closed" : candidate.start === void 0 ? "unknown" : "open",
							data: this.stepData(candidate.turn, candidate.step)
						};
						const previous = previousSteps.get(candidate.step);
						return sameStep(previous, value) ? previous : value;
					});
					const value = {
						turn: draft.turn,
						start: draft.start,
						end: draft.end,
						status: draft.end !== void 0 ? "closed" : draft.start === void 0 ? "unknown" : "open",
						steps,
						data: this.turnData(draft.turn)
					};
					nextTurns.set(draft.turn, sameTurn(previousTurn, value) ? previousTurn : value);
				}
				const nextOrder = orderedDrafts.map((draft) => draft.turn);
				const turnOrder = this.timeline.turnOrder.length === nextOrder.length && this.timeline.turnOrder.every((turn, index) => turn === nextOrder[index]) ? this.timeline.turnOrder : nextOrder;
				let sameMap = previousTurns.size === nextTurns.size;
				if (sameMap) {
					for (const [turn, value] of nextTurns) if (previousTurns.get(turn) !== value) {
						sameMap = false;
						break;
					}
				}
				this.timeline = sameMap && turnOrder === this.timeline.turnOrder ? this.timeline : {
					turnOrder,
					turns: nextTurns
				};
				this.coordinates = coordinates;
				this.locations = /* @__PURE__ */ new Map();
				this.seqsByTurn = /* @__PURE__ */ new Map();
				for (const { event } of entries) {
					const coordinates = this.coordinates.get(event.seq);
					if (coordinates?.turn !== void 0) this.indexTurnSeq(coordinates.turn, event.seq);
					this.locations.set(event.seq, this.resolve(event.seq));
				}
				this.currentTurn = currentTurn;
				this.currentStep = currentStep;
				const changed = /* @__PURE__ */ new Set();
				for (const { event } of entries) if (!sameLocation(previousLocations.get(event.seq), this.locations.get(event.seq))) changed.add(event.seq);
				return changed;
			}
			/**
			* Append one Turn/Step boundary while revisiting only the owning Turn.
			* @param event - contiguous tail boundary event.
			* @returns seqs whose immutable Location reference changed.
			*/
			appendBoundary(event) {
				if (event.type !== "turn/start" && event.type !== "turn/end" && event.type !== "step/start" && event.type !== "step/end") throw new Error(`conversation Location boundary expected, received ${event.type}`);
				const explicit = payloadCoordinates(event);
				if (event.type === "turn/start") {
					this.currentTurn = event.data.turn;
					this.currentStep = void 0;
				} else if (event.type === "step/start") {
					this.currentTurn = event.data.turn;
					this.currentStep = event.data.step;
				}
				if (explicit.turn !== void 0) {
					if (this.currentTurn !== explicit.turn) this.currentStep = void 0;
					this.currentTurn = explicit.turn;
					if (explicit.step !== void 0) this.currentStep = explicit.step;
				}
				const turnNumber = explicit.turn ?? this.currentTurn;
				if (turnNumber === void 0) throw new Error(`conversation boundary ${event.type} has no turn`);
				const stepNumber = event.type === "turn/start" || event.type === "turn/end" ? void 0 : explicit.step ?? (turnNumber === this.currentTurn ? this.currentStep : void 0);
				this.coordinates.set(event.seq, {
					turn: turnNumber,
					...stepNumber === void 0 ? {} : { step: stepNumber }
				});
				this.indexTurnSeq(turnNumber, event.seq);
				const previousTurn = this.timeline.turns.get(turnNumber);
				let steps = previousTurn?.steps ?? [];
				if (event.type === "step/start" || event.type === "step/end") {
					const number = event.data.step;
					const previousStep = steps.find((candidate) => candidate.step === number);
					const candidate = {
						turn: turnNumber,
						step: number,
						start: event.type === "step/start" ? event : previousStep?.start,
						end: event.type === "step/end" ? event : previousStep?.end,
						status: event.type === "step/end" || previousStep?.end !== void 0 ? "closed" : "open",
						data: this.stepData(turnNumber, number)
					};
					const nextStep = sameStep(previousStep, candidate) ? previousStep : candidate;
					const index = steps.findIndex((step) => step.step === number);
					steps = index < 0 ? [...steps, nextStep] : steps.map((step, at) => at === index ? nextStep : step);
				}
				const candidate = {
					turn: turnNumber,
					start: event.type === "turn/start" ? event : previousTurn?.start,
					end: event.type === "turn/end" ? event : previousTurn?.end,
					status: event.type === "turn/end" || previousTurn?.end !== void 0 ? "closed" : event.type === "turn/start" || previousTurn?.start !== void 0 ? "open" : "unknown",
					steps,
					data: this.turnData(turnNumber)
				};
				const turn = sameTurn(previousTurn, candidate) ? previousTurn : candidate;
				const turns = new Map(this.timeline.turns);
				turns.set(turnNumber, turn);
				const turnOrder = previousTurn === void 0 ? [...this.timeline.turnOrder, turnNumber] : this.timeline.turnOrder;
				this.timeline = {
					turnOrder,
					turns
				};
				const changed = /* @__PURE__ */ new Set();
				for (const seq of this.seqsByTurn.get(turnNumber) ?? []) {
					const previous = this.locations.get(seq);
					const next = this.resolve(seq);
					this.locations.set(seq, next);
					if (!sameLocation(previous, next)) changed.add(seq);
				}
				if (event.type === "step/end" && this.currentTurn === event.data.turn && this.currentStep === event.data.step) this.currentStep = void 0;
				if (event.type === "turn/end" && this.currentTurn === event.data.turn) {
					this.currentTurn = void 0;
					this.currentStep = void 0;
				}
				return changed;
			}
			/**
			* Index one non-boundary tail event without rescanning the window.
			* @param event - contiguous appended event.
			*/
			appendNonBoundary(event) {
				const explicit = payloadCoordinates(event);
				if (explicit.session === true) {
					this.coordinates.set(event.seq, {});
					this.locations.set(event.seq, SESSION_LOCATION);
					return;
				}
				if (explicit.turn !== void 0) {
					if (this.currentTurn !== explicit.turn) this.currentStep = void 0;
					this.currentTurn = explicit.turn;
					if (explicit.step !== void 0) this.currentStep = explicit.step;
				}
				const turn = explicit.turn ?? this.currentTurn;
				const step = explicit.step ?? (turn === this.currentTurn ? this.currentStep : void 0);
				this.coordinates.set(event.seq, {
					...turn === void 0 ? {} : { turn },
					...turn === void 0 || step === void 0 ? {} : { step }
				});
				if (turn !== void 0) this.indexTurnSeq(turn, event.seq);
				this.locations.set(event.seq, this.resolve(event.seq));
			}
			/**
			* Remove indexed Assistant transients without rebuilding the Turn/Step timeline.
			* @param events - transient events retired by one Assistant settlement.
			*/
			removeAssistantTransients(events) {
				for (const event of events) {
					const turn = this.coordinates.get(event.seq)?.turn;
					if (turn !== void 0) {
						const seqs = this.seqsByTurn.get(turn);
						seqs?.delete(event.seq);
						if (seqs?.size === 0) this.seqsByTurn.delete(turn);
					}
					this.coordinates.delete(event.seq);
					this.locations.delete(event.seq);
				}
			}
			/**
			* Index one durable Assistant settlement inserted before an already visible tail.
			* @param event - message or attempt settlement with explicit Turn and Step coordinates.
			*/
			insertAssistantSettlement(event) {
				this.coordinates.set(event.seq, {
					turn: event.data.turn,
					step: event.data.step
				});
				this.indexTurnSeq(event.data.turn, event.seq);
				this.locations.set(event.seq, this.resolve(event.seq));
			}
			indexTurnSeq(turn, seq) {
				const current = this.seqsByTurn.get(turn) ?? /* @__PURE__ */ new Set();
				current.add(seq);
				this.seqsByTurn.set(turn, current);
			}
			turnData(turn) {
				return this.mutableTurnData(turn);
			}
			stepData(turn, step) {
				return this.mutableStepData(stepDataKey(turn, step));
			}
			mutableTurnData(turn) {
				const current = this.turnDataStores.get(turn) ?? this.createDataStore();
				this.turnDataStores.set(turn, current);
				return current;
			}
			mutableStepData(key) {
				const current = this.stepDataStores.get(key) ?? this.createDataStore();
				this.stepDataStores.set(key, current);
				return current;
			}
			createDataStore() {
				return new MutableLocationDataStore((store) => this.dirtyDataStores.add(store));
			}
			storeFor(data) {
				return data.kind === "turn" ? this.mutableTurnData(data.turn) : this.mutableStepData(stepDataKey(data.turn, requireStep(data)));
			}
			resolve(seq) {
				const coordinates = this.coordinates.get(seq);
				if (coordinates?.turn === void 0) return SESSION_LOCATION;
				const turn = this.timeline.turns.get(coordinates.turn);
				if (turn === void 0) return UNRESOLVED_LOCATION;
				if (coordinates.step === void 0) return {
					kind: "turn",
					turn
				};
				const step = turn.steps.find((candidate) => candidate.step === coordinates.step);
				return step === void 0 ? {
					kind: "turn",
					turn
				} : {
					kind: "step",
					turn,
					step
				};
			}
		};
		function stepDataKey(turn, step) {
			return `${turn}:${step}`;
		}
		function requireStep(data) {
			if (data.kind === "step" && data.step !== void 0) return data.step;
			throw new Error(`conversation Step data "${data.key}" requires a step`);
		}
		//#endregion
		//#region lib/types/client/conversation/assembler.js
		const PUBLICATION_RANK = {
			none: 0,
			"animation-frame": 1,
			immediate: 2
		};
		const LOCATION_DATA_SCOPES = ["step", "turn"];
		function emptyLocationData() {
			return {
				step: null,
				turn: null
			};
		}
		function maximumPublication(left, right) {
			return PUBLICATION_RANK[left] >= PUBLICATION_RANK[right] ? left : right;
		}
		function startSeq(context) {
			return context.startSeq;
		}
		function insertionIndex(contexts, seq) {
			let low = 0;
			let high = contexts.length;
			while (low < high) {
				const middle = low + Math.floor((high - low) / 2);
				const candidate = contexts[middle];
				if (candidate !== void 0 && candidate.startSeq < seq) low = middle + 1;
				else high = middle;
			}
			return low;
		}
		function contextSnapshot(context) {
			return {
				key: context.key,
				kind: context.kind,
				id: context.id,
				matches: context.matches,
				start: context.start,
				state: context.state,
				current: context.current
			};
		}
		function mergeMatches(key, additions, existing) {
			const merged = [];
			let added = 0;
			let current = 0;
			while (added < additions.length || current < existing.length) {
				const left = additions[added];
				const right = existing[current];
				if (left !== void 0 && right !== void 0 && left.event.seq === right.event.seq) throw new Error(`conversation Context ${key} received duplicate Match ${left.event.seq}`);
				if (right === void 0 || left !== void 0 && left.event.seq < right.event.seq) {
					merged.push(left);
					added++;
				} else {
					merged.push(right);
					current++;
				}
			}
			return merged;
		}
		function conversationMatch(key, input, role, location) {
			if (role === "start") {
				if (input.type !== "event") throw new Error(`conversation Context ${key} received a transient start Match`);
				return {
					event: input.event,
					role,
					location
				};
			}
			return {
				event: input.event,
				role,
				location
			};
		}
		/**
		* Session-owned incremental engine that assembles business Contexts from a
		* contiguous Event window and materializes registered view snapshots.
		*/
		var ConversationNodeAssembler = class {
			eventDefinitions;
			viewDefinitions;
			contexts = /* @__PURE__ */ new Map();
			contextsByKind = /* @__PURE__ */ new Map();
			contextsBySeq = /* @__PURE__ */ new Map();
			contextsByTarget = /* @__PURE__ */ new Map();
			inputs = /* @__PURE__ */ new Map();
			locationIndex = new ConversationLocationIndex();
			dirty = /* @__PURE__ */ new Set();
			dirtyByTarget = /* @__PURE__ */ new Map();
			revised = /* @__PURE__ */ new Set();
			dependents = /* @__PURE__ */ new Map();
			views = /* @__PURE__ */ new Map();
			activeTargets = /* @__PURE__ */ new Set();
			hasMore = false;
			replacePending = true;
			timelineDirty = true;
			/**
			* @param eventDefinitions - live Event Definition registry.
			* @param viewDefinitions - live view builder registry.
			*/
			constructor(eventDefinitions, viewDefinitions) {
				this.eventDefinitions = eventDefinitions;
				this.viewDefinitions = viewDefinitions;
				this.resetViewBuilders();
			}
			/**
			* Replace the complete loaded window after open, resync, or gap repair.
			* @param entries - complete contiguous window.
			* @param hasMore - whether older history remains outside the window.
			* @returns immediate publication request.
			*/
			replaceWindow(entries, hasMore) {
				this.contexts.clear();
				this.contextsByKind.clear();
				this.contextsBySeq.clear();
				this.contextsByTarget.clear();
				this.inputs.clear();
				this.dirty.clear();
				this.dirtyByTarget.clear();
				this.revised.clear();
				this.dependents.clear();
				this.hasMore = hasMore;
				const sorted = [...entries].sort((left, right) => left.event.seq - right.event.seq);
				for (const entry of sorted) this.inputs.set(entry.event.seq, entry);
				this.locationIndex.rebuild(sorted);
				this.timelineDirty = true;
				for (const entry of sorted) this.matchInput(entry);
				this.replayDependencies();
				this.revised.clear();
				for (const context of this.contexts.values()) this.markDirty(context);
				this.replacePending = true;
				return "immediate";
			}
			/**
			* Add one contiguous live tail event without scanning existing Contexts.
			* @param record - appended Session event entry.
			* @returns highest requested publication cadence.
			*/
			append(record) {
				const event = record.event;
				if (this.inputs.has(event.seq)) return "none";
				this.revised.clear();
				this.inputs.set(event.seq, record);
				let publication = "none";
				if (event.type !== "assistant/live-chunk" && isLocationBoundary(event.type)) {
					const previousTimeline = this.locationIndex.snapshot();
					const changed = this.locationIndex.appendBoundary(event);
					if (this.locationIndex.snapshot() !== previousTimeline) {
						this.timelineDirty = true;
						publication = "immediate";
					}
					this.replayContexts(this.refreshMatchLocations(changed));
					if (changed.size > 0) publication = "immediate";
				} else this.locationIndex.appendNonBoundary(event);
				publication = maximumPublication(publication, this.matchInput(record));
				if (this.replayRevisedDependents()) publication = "immediate";
				this.revised.clear();
				return publication;
			}
			/**
			* Retire one Assistant attempt's transient matches and apply its optional durable settlement.
			* @param attemptId - process-local attempt whose transient presentation ended.
			* @param entry - durable message or attempt event committed for the stream.
			* @returns highest requested publication cadence.
			*/
			settleAssistant(attemptId, entry) {
				this.revised.clear();
				const retired = [...this.inputs.values()].filter((candidate) => candidate.type === "transient" && candidate.event.data.attemptId === attemptId);
				const retiredSeqs = new Set(retired.map((candidate) => candidate.event.seq));
				const affected = /* @__PURE__ */ new Set();
				for (const seq of retiredSeqs) {
					this.inputs.delete(seq);
					for (const context of this.contextsBySeq.get(seq) ?? []) affected.add(context);
					this.contextsBySeq.delete(seq);
				}
				for (const context of affected) context.matches = context.matches.filter((match) => !retiredSeqs.has(match.event.seq));
				this.locationIndex.removeAssistantTransients(retired.map((candidate) => candidate.event));
				let publication = retired.length === 0 ? "none" : "immediate";
				if (entry !== void 0 && !this.inputs.has(entry.event.seq)) {
					this.inputs.set(entry.event.seq, entry);
					this.locationIndex.insertAssistantSettlement(entry.event);
					const pending = /* @__PURE__ */ new Map();
					publication = maximumPublication(publication, this.collectInput(entry, pending));
					this.applyPendingMatches(pending, affected);
				}
				this.replayContexts(affected);
				if (this.replayRevisedDependents()) publication = "immediate";
				this.revised.clear();
				return publication;
			}
			/**
			* Add an older page while preserving existing Context and view identities.
			* @param entries - newly loaded older Events.
			* @param hasMore - whether history still precedes the expanded window.
			* @returns highest requested publication cadence.
			*/
			prepend(entries, hasMore) {
				this.revised.clear();
				let publication = "none";
				const previousHasMore = this.hasMore;
				const fresh = entries.filter((entry) => !this.inputs.has(entry.event.seq)).sort((left, right) => left.event.seq - right.event.seq);
				for (const entry of fresh) this.inputs.set(entry.event.seq, entry);
				this.hasMore = hasMore;
				const previousTimeline = this.locationIndex.snapshot();
				const changedLocations = this.locationIndex.rebuild(this.sortedInputs());
				if (this.locationIndex.snapshot() !== previousTimeline) this.timelineDirty = true;
				const affected = this.refreshMatchLocations(changedLocations);
				const pending = /* @__PURE__ */ new Map();
				for (const entry of fresh) publication = maximumPublication(publication, this.collectInput(entry, pending));
				this.applyPendingMatches(pending, affected);
				this.replayContexts(affected);
				if ((this.revised.size > 0 || previousHasMore !== hasMore) && this.replayDependencies()) publication = "immediate";
				if (changedLocations.size > 0) publication = "immediate";
				this.revised.clear();
				return publication;
			}
			/**
			* Rebuild against the current Registry set after a low-frequency plugin change.
			* @returns immediate publication request.
			*/
			rebuildRegistry() {
				this.resetViewBuilders();
				return this.replaceWindow(this.sortedInputs(), this.hasMore);
			}
			/**
			* Materialize dirty Contexts and advance every active view builder.
			* @returns whether any view snapshot was rebuilt or incrementally applied.
			*/
			flush() {
				if (!this.replacePending && this.dirty.size === 0 && !this.timelineDirty) return false;
				if (this.replacePending) {
					this.replaceLocationData();
					let published = false;
					for (const target of this.activeTargets) {
						const view = this.views.get(target);
						if (view === void 0) continue;
						const builder = view.builder ?? view.definition.create();
						view.builder = builder;
						view.snapshot = builder.replace({
							nodes: this.buildTargetNodes(target, this.contextsByTarget.get(target)),
							timeline: this.locationIndex.snapshot()
						});
						published = true;
					}
					this.locationIndex.publishData();
					this.replacePending = false;
					this.dirty.clear();
					this.dirtyByTarget.clear();
					this.timelineDirty = false;
					return published;
				}
				let published = false;
				if (this.applyDirtyLocationData()) this.timelineDirty = true;
				const timelineDirty = this.timelineDirty;
				for (const target of this.activeTargets) {
					const view = this.views.get(target);
					if (view === void 0) continue;
					const builder = view.builder;
					if (builder === void 0) continue;
					const upserts = this.buildTargetUpserts(target, this.dirtyByTarget.get(target));
					if (upserts.length === 0 && !timelineDirty) continue;
					view.snapshot = builder.apply({
						upserts,
						timeline: this.locationIndex.snapshot()
					});
					published = true;
				}
				this.locationIndex.publishData();
				this.dirty.clear();
				this.dirtyByTarget.clear();
				this.timelineDirty = false;
				return published;
			}
			/**
			* Add one target to the monotonic active set and materialize its current snapshot.
			* Pending Context work is flushed before the first complete replacement.
			* @param target - registered or subsequently registered view target.
			* @returns whether any active target snapshot changed.
			*/
			activateTarget(target) {
				const view = this.views.get(target);
				if (this.activeTargets.has(target)) return false;
				const published = this.flush();
				this.activeTargets.add(target);
				if (view === void 0) return published;
				this.replaceView(view);
				return true;
			}
			/**
			* Read the latest snapshot of a registered target.
			* @param target - registered view target.
			* @returns target snapshot, or undefined before registration or activation.
			*/
			snapshot(target) {
				return this.views.get(target)?.snapshot;
			}
			get(target) {
				return this.snapshot(target);
			}
			/**
			* Read targets whose owners classify their latest snapshot as visible activity.
			* @returns target ids contributing visible activity.
			*/
			activityTargets() {
				const active = /* @__PURE__ */ new Set();
				for (const target of this.activeTargets) {
					const view = this.views.get(target);
					if (view === void 0) continue;
					if (view.isActive?.(view.snapshot) === true) active.add(view.target);
				}
				return active;
			}
			sortedInputs() {
				return [...this.inputs.values()].sort((left, right) => left.event.seq - right.event.seq);
			}
			matchInput(input) {
				return this.dispatchInput(input, (definition, id, role) => this.acceptMatch(definition, id, role, input));
			}
			collectInput(input, pending) {
				return this.dispatchInput(input, (definition, id, role) => {
					const key = conversationContextKey(definition.kind, id);
					const match = conversationMatch(key, input, role, this.locationIndex.locationOf(input.event));
					const matches = pending.get(key) ?? [];
					matches.push({
						definition,
						id,
						match
					});
					pending.set(key, matches);
					return definition.publication?.(match) ?? "immediate";
				});
			}
			dispatchInput(input, accept) {
				const event = input.event;
				const matchedTargets = /* @__PURE__ */ new Set();
				let publication = "none";
				for (const definition of this.eventDefinitions.entries()) {
					const result = definition.match(event);
					if (result === null) continue;
					if (definition.target !== void 0) matchedTargets.add(definition.target);
					publication = maximumPublication(publication, accept(definition, result.id, result.role));
				}
				const fallback = this.eventDefinitions.fallbackEntry();
				const target = fallback?.target;
				if (fallback !== void 0 && target !== void 0 && !matchedTargets.has(target)) {
					const result = fallback.match(event);
					if (result !== null) publication = maximumPublication(publication, accept(fallback, result.id, result.role));
				}
				return publication;
			}
			createContext(definition, id, key) {
				const context = {
					key,
					kind: definition.kind,
					id,
					definition,
					startSeq: void 0,
					start: void 0,
					matches: [],
					state: void 0,
					revision: 0,
					current: /* @__PURE__ */ new Map(),
					locationData: emptyLocationData(),
					dependencies: /* @__PURE__ */ new Map()
				};
				this.contexts.set(key, context);
				this.indexTargetContext(context);
				return context;
			}
			acceptMatch(definition, id, role, input) {
				const key = conversationContextKey(definition.kind, id);
				let context = this.contexts.get(key);
				if (role === "start" && context?.start !== void 0) throw new Error(`conversation Context ${key} received more than one start Match`);
				context ??= this.createContext(definition, id, key);
				const match = conversationMatch(key, input, role, this.locationIndex.locationOf(input.event));
				const previous = context.matches.at(-1);
				if (previous !== void 0 && previous.event.seq >= input.event.seq) throw new Error(`conversation Context ${key} received non-appended Match ${input.event.seq}`);
				if (role === "start" && context.matches.length > 0) throw new Error(`conversation Context ${key} received an update before its start Match`);
				context.matches.push(match);
				if (match.role === "start") {
					context.startSeq = input.event.seq;
					context.start = match;
					this.indexStartedContext(context);
				}
				const owners = this.contextsBySeq.get(input.event.seq) ?? /* @__PURE__ */ new Set();
				owners.add(context);
				this.contextsBySeq.set(input.event.seq, owners);
				if (match.role === "start") this.replayContext(context);
				else if (context.state !== void 0) {
					const typed = contextSnapshot(context);
					context.state = requireState(definition, "update", definition.update(typed, match));
					context.revision++;
					this.revised.add(context);
				}
				this.markDirty(context);
				return definition.publication?.(match) ?? "immediate";
			}
			applyPendingMatches(pending, affected) {
				const startsByKind = /* @__PURE__ */ new Map();
				for (const [key, entries] of pending) {
					const first = entries[0];
					if (first === void 0) continue;
					let context = this.contexts.get(key);
					context ??= this.createContext(first.definition, first.id, key);
					let discoveredStart;
					const additions = entries.map((entry) => {
						if (entry.definition !== context.definition || entry.id !== context.id) throw new Error(`conversation Context ${key} received inconsistent Definition identity`);
						if (entry.match.role === "start") {
							if (discoveredStart !== void 0 || context.start !== void 0) throw new Error(`conversation Context ${key} received more than one start Match`);
							discoveredStart = entry.match;
						}
						const owners = this.contextsBySeq.get(entry.match.event.seq) ?? /* @__PURE__ */ new Set();
						owners.add(context);
						this.contextsBySeq.set(entry.match.event.seq, owners);
						return entry.match;
					}).sort((left, right) => left.event.seq - right.event.seq);
					context.matches = mergeMatches(context.key, additions, context.matches);
					if (discoveredStart !== void 0) {
						context.start = discoveredStart;
						context.startSeq = discoveredStart.event.seq;
						const starts = startsByKind.get(context.kind) ?? [];
						starts.push(context);
						startsByKind.set(context.kind, starts);
					}
					if (context.start !== void 0 && context.matches[0] !== context.start) throw new Error(`conversation Context ${context.key} received an update before its start Match`);
					affected.add(context);
					this.markDirty(context);
				}
				for (const [kind, contexts] of startsByKind) this.indexStartedContexts(kind, contexts);
			}
			replayContexts(contexts) {
				const ordered = [...contexts].sort((left, right) => (left.startSeq ?? Number.POSITIVE_INFINITY) - (right.startSeq ?? Number.POSITIVE_INFINITY));
				for (const context of ordered) {
					if (context.start === void 0) {
						context.state = void 0;
						this.markDirty(context);
						continue;
					}
					this.replayContext(context);
				}
			}
			replayContext(context) {
				const start = context.start;
				if (start === void 0) {
					context.state = void 0;
					return;
				}
				if (context.matches[0] !== start) throw new Error(`conversation Context ${context.key} received an update before its start Match`);
				const dependencies = /* @__PURE__ */ new Map();
				const reader = this.readerFor(start.event.seq, dependencies);
				context.state = void 0;
				context.state = requireState(context.definition, "start", context.definition.start(contextSnapshot(context), start, reader));
				this.replaceDependencies(context, dependencies);
				for (let index = 1; index < context.matches.length; index++) {
					const match = context.matches[index];
					if (match === void 0 || match.role !== "update") continue;
					const typed = contextSnapshot(context);
					context.state = requireState(context.definition, "update", context.definition.update(typed, match));
				}
				context.revision++;
				this.revised.add(context);
				this.markDirty(context);
			}
			indexTargetContext(context) {
				const target = context.definition.target;
				if (target === void 0) return;
				const contexts = this.contextsByTarget.get(target) ?? /* @__PURE__ */ new Set();
				contexts.add(context);
				this.contextsByTarget.set(target, contexts);
			}
			markDirty(context) {
				this.dirty.add(context);
				const target = context.definition.target;
				if (target === void 0 || !this.activeTargets.has(target)) return;
				const contexts = this.dirtyByTarget.get(target) ?? /* @__PURE__ */ new Set();
				contexts.add(context);
				this.dirtyByTarget.set(target, contexts);
			}
			replaceDependencies(context, dependencies) {
				for (const dependency of context.dependencies.values()) {
					if (dependency.key === void 0) continue;
					const current = this.dependents.get(dependency.key);
					current?.delete(context);
					if (current?.size === 0) this.dependents.delete(dependency.key);
				}
				context.dependencies = dependencies;
				for (const dependency of dependencies.values()) {
					if (dependency.key === void 0) continue;
					const current = this.dependents.get(dependency.key) ?? /* @__PURE__ */ new Set();
					current.add(context);
					this.dependents.set(dependency.key, current);
				}
			}
			replayRevisedDependents() {
				const pending = [...this.revised];
				const affected = /* @__PURE__ */ new Set();
				for (let index = 0; index < pending.length; index++) {
					const dependency = pending[index];
					if (dependency === void 0) continue;
					for (const dependent of this.dependents.get(dependency.key) ?? []) {
						if (affected.has(dependent)) continue;
						affected.add(dependent);
						pending.push(dependent);
					}
				}
				this.replayContexts(affected);
				return affected.size > 0;
			}
			readerFor(beforeSeq, dependencies) {
				return { previous: (kind) => {
					const predecessor = this.previousContext(kind, beforeSeq);
					dependencies.set(kind, {
						kind,
						key: predecessor?.key,
						revision: predecessor?.revision,
						windowGap: predecessor === void 0 && this.hasMore
					});
					if (predecessor?.state === void 0) return void 0;
					const seq = startSeq(predecessor);
					if (seq === void 0) return void 0;
					return {
						key: predecessor.key,
						kind: predecessor.kind,
						id: predecessor.id,
						startSeq: seq,
						state: predecessor.state,
						matches: predecessor.matches
					};
				} };
			}
			previousContext(kind, beforeSeq) {
				const candidates = this.contextsByKind.get(kind) ?? [];
				const indexBefore = insertionIndex(candidates, beforeSeq);
				for (let index = indexBefore - 1; index >= 0; index--) {
					const candidate = candidates[index];
					if (candidate?.state !== void 0) return candidate;
				}
			}
			/** Insert one newly discovered start into its Definition's ordered predecessor index. */
			indexStartedContext(context) {
				const seq = context.startSeq;
				if (seq === void 0) return;
				const candidates = this.contextsByKind.get(context.kind) ?? [];
				const previous = candidates.at(-1);
				if (previous === void 0 || previous.startSeq < seq) candidates.push(context);
				else candidates.splice(insertionIndex(candidates, seq), 0, context);
				this.contextsByKind.set(context.kind, candidates);
			}
			indexStartedContexts(kind, additions) {
				if (additions.length === 0) return;
				const sorted = [...additions].sort((left, right) => left.startSeq - right.startSeq);
				const existing = this.contextsByKind.get(kind) ?? [];
				const merged = [];
				let before = 0;
				let added = 0;
				while (before < existing.length || added < sorted.length) {
					const left = existing[before];
					const right = sorted[added];
					if (right === void 0 || left !== void 0 && left.startSeq < right.startSeq) {
						merged.push(left);
						before++;
					} else {
						merged.push(right);
						added++;
					}
				}
				this.contextsByKind.set(kind, merged);
			}
			replayDependencies() {
				let replayed = false;
				const ordered = [...this.contexts.values()].filter((context) => startSeq(context) !== void 0).sort((left, right) => startSeq(left) - startSeq(right));
				for (const context of ordered) {
					if (context.state === void 0 || context.dependencies.size === 0) continue;
					const before = startSeq(context);
					if (before === void 0) continue;
					let changed = false;
					for (const dependency of context.dependencies.values()) {
						const current = this.previousContext(dependency.kind, before);
						const windowGap = current === void 0 && this.hasMore;
						if (current?.key !== dependency.key || current?.revision !== dependency.revision || windowGap !== dependency.windowGap) {
							changed = true;
							break;
						}
					}
					if (changed) {
						this.replayContext(context);
						replayed = true;
					}
				}
				return replayed;
			}
			refreshMatchLocations(changedSeqs) {
				const affected = /* @__PURE__ */ new Set();
				if (changedSeqs.size === 0) return affected;
				for (const seq of changedSeqs) for (const context of this.contextsBySeq.get(seq) ?? []) affected.add(context);
				for (const context of affected) {
					let start = context.start;
					context.matches = context.matches.map((match) => {
						if (!changedSeqs.has(match.event.seq)) return match;
						if (match.role === "start") {
							const refreshed = {
								...match,
								location: this.locationIndex.locationOf(match.event)
							};
							if (match === start) start = refreshed;
							return refreshed;
						}
						return {
							...match,
							location: this.locationIndex.locationOf(match.event)
						};
					});
					context.start = start;
				}
				return affected;
			}
			buildNode(context, target) {
				if (context.definition.target !== target || context.definition.buildViewNode === void 0) return null;
				const node = context.definition.buildViewNode(contextSnapshot(context));
				if (node === null) return null;
				if (node.key !== context.key) throw new Error(`conversation Definition "${context.kind}" returned unstable key "${node.key}"; expected "${context.key}"`);
				if (node.target !== target) throw new Error(`conversation Definition "${context.kind}" returned target "${node.target}" while building "${target}"`);
				return node;
			}
			replaceView(view) {
				const builder = view.builder ?? view.definition.create();
				view.builder = builder;
				view.snapshot = builder.replace({
					nodes: this.buildTargetNodes(view.target, this.contextsByTarget.get(view.target)),
					timeline: this.locationIndex.snapshot()
				});
			}
			buildTargetNodes(target, contexts) {
				const nodes = [];
				for (const context of contexts ?? []) {
					const node = this.buildNode(context, target);
					context.current.set(target, node);
					if (node !== null) nodes.push(node);
				}
				return nodes;
			}
			buildTargetUpserts(target, contexts) {
				const upserts = [];
				for (const context of contexts ?? []) {
					const previous = context.current.get(target) ?? null;
					const node = this.buildNode(context, target);
					if (node === null && previous !== null) throw new Error(`conversation Definition "${context.kind}" withdrew materialized target "${target}"; return the same key with hidden visibility instead`);
					context.current.set(target, node);
					if (node !== null) upserts.push(node);
				}
				return upserts;
			}
			buildLocationData(context, scope, previous) {
				if (context.definition.buildLocationData === void 0) return null;
				const data = context.definition.buildLocationData(contextSnapshot(context), scope, previous);
				if (data === null) return null;
				if (data.kind !== scope) throw new Error(`conversation Definition "${context.kind}" published ${data.kind} data through its ${scope} scope`);
				if (data.key !== context.kind) throw new Error(`conversation Definition "${context.kind}" published Location data key "${data.key}"; expected its owned kind`);
				if (!Number.isSafeInteger(data.turn) || data.turn < 0) throw new Error(`conversation Definition "${context.kind}" published invalid turn ${data.turn}`);
				if (data.kind === "step" && (!Number.isSafeInteger(data.step) || data.step < 0)) throw new Error(`conversation Definition "${context.kind}" published invalid step ${String(data.step)}`);
				return data;
			}
			replaceLocationData() {
				const entries = [];
				for (const scope of LOCATION_DATA_SCOPES) {
					for (const context of this.contexts.values()) {
						const data = this.buildLocationData(context, scope, context.locationData[scope]);
						context.locationData[scope] = data;
						if (data !== null) entries.push({
							owner: context.key,
							data
						});
					}
					this.locationIndex.replaceData(entries);
				}
			}
			applyDirtyLocationData() {
				let changed = false;
				for (const scope of LOCATION_DATA_SCOPES) {
					const changes = [];
					for (const context of this.dirty) {
						const previous = context.locationData[scope];
						const next = this.buildLocationData(context, scope, previous);
						if (previous === next) continue;
						context.locationData[scope] = next;
						changes.push({
							owner: context.key,
							previous,
							next
						});
					}
					changed = this.locationIndex.applyData(changes) || changed;
				}
				return changed;
			}
			resetViewBuilders() {
				this.views.clear();
				for (const definition of this.viewDefinitions.entries()) {
					const view = {
						target: definition.target,
						definition,
						isActive: definition.isActive === void 0 ? void 0 : (snapshot) => definition.isActive?.(snapshot) === true,
						builder: void 0,
						snapshot: void 0
					};
					this.views.set(definition.target, view);
				}
				this.replacePending = true;
			}
		};
		function isLocationBoundary(type) {
			return type === "turn/start" || type === "turn/end" || type === "step/start" || type === "step/end";
		}
		function requireState(definition, phase, state) {
			if (state === void 0) throw new Error(`conversation Definition "${definition.kind}" returned undefined from ${phase}()`);
			return state;
		}
		//#endregion
		//#region lib/types/client/conversation/definition-registry.js
		/** Shared lifecycle and stable-entry storage for one Conversation Definition registry. */
		var ConversationDefinitionRegistry = class {
			ctx;
			definitions = /* @__PURE__ */ new Map();
			listeners = /* @__PURE__ */ new Set();
			cached = [];
			/** @param ctx - Context whose effects own contributed Definitions. */
			constructor(ctx) {
				this.ctx = ctx;
				Object.defineProperty(this, _deepseek_ai_cordis.Service.tracker, { value: { property: "ctx" } });
			}
			/**
			* Return reference-stable Definitions in registration order.
			* @returns current Definitions.
			*/
			entries() {
				return this.cached;
			}
			/**
			* Observe low-frequency registry changes.
			* @param listener - synchronous invalidation callback.
			* @returns unsubscribe callback.
			*/
			subscribe(listener) {
				this.listeners.add(listener);
				return () => {
					this.listeners.delete(listener);
				};
			}
			/**
			* Register one uniquely keyed Definition for the caller's lifetime.
			* @param key - registry-local unique key.
			* @param definition - contributed Definition.
			* @param duplicateMessage - error raised when the key is already owned.
			* @param effectName - Cordis effect diagnostic label.
			* @returns idempotent disposer.
			*/
			registerDefinition(key, definition, duplicateMessage, effectName) {
				if (this.definitions.has(key)) throw new Error(duplicateMessage);
				const dispose = this.ctx.effect(() => {
					this.definitions.set(key, definition);
					this.refresh();
					return () => {
						if (this.definitions.get(key) !== definition) return;
						this.definitions.delete(key);
						this.refresh();
					};
				}, effectName);
				return () => {
					dispose();
				};
			}
			/** Refresh cached entries and synchronously invalidate subscribers. */
			refresh() {
				this.cached = [...this.definitions.values()];
				(0, _deepseek_ai_dsh_client_store.notifySubscribers)(this.listeners, "[ui-conversation] definition registry");
			}
		};
		//#endregion
		//#region lib/types/client/conversation/event-registry.js
		/** Runtime registry of independently owned Conversation business Definitions. */
		var ConversationEventRegistry = class extends ConversationDefinitionRegistry {
			fallback;
			/**
			* Register a uniquely named business Definition for the caller's lifetime.
			* @param definition - Definition contribution.
			* @returns idempotent disposer.
			*/
			register(definition) {
				assertDefinitionTarget(definition);
				return this.registerDefinition(definition.kind, definition, `conversation Definition "${definition.kind}" is already registered`, `uiConversation.events.register(${JSON.stringify(definition.kind)})`);
			}
			/**
			* Register the sole fallback used only when no ordinary Definition matches.
			* @param definition - fallback Definition.
			* @returns idempotent disposer.
			*/
			registerFallback(definition) {
				assertDefinitionTarget(definition);
				if (definition.target === void 0) throw new Error("conversation fallback Definition must declare a target");
				if (this.fallback !== void 0) throw new Error("conversation fallback Definition is already registered");
				const dispose = this.ctx.effect(() => {
					this.fallback = definition;
					this.refresh();
					return () => {
						if (this.fallback !== definition) return;
						this.fallback = void 0;
						this.refresh();
					};
				}, `uiConversation.events.registerFallback(${JSON.stringify(definition.kind)})`);
				return () => {
					dispose();
				};
			}
			/**
			* Return the current unmatched-event fallback.
			* @returns installed fallback, when present.
			*/
			fallbackEntry() {
				return this.fallback;
			}
		};
		function assertDefinitionTarget(definition) {
			if (definition.target === void 0 !== (definition.buildViewNode === void 0)) throw new Error(`conversation Definition "${definition.kind}" must declare target and buildViewNode together`);
		}
		//#endregion
		//#region ../../util/crypto/src/index.ts
		/**
		* Encode bytes as canonical base64 without overflowing function argument limits.
		* @param data - Bytes to encode.
		* @returns base64 text.
		*/
		function bytesToBase64(data) {
			let binary = "";
			const chunk = 32768;
			for (let offset = 0; offset < data.length; offset += chunk) binary += String.fromCharCode(...data.subarray(offset, offset + chunk));
			return btoa(binary);
		}
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
		//#region lib/types/client/conversation/historical-images.js
		/** Resolve durable Conversation images and release their browser URLs with Session scope. */
		var HistoricalImageCache = class {
			sessions;
			entries = /* @__PURE__ */ new Map();
			generations = /* @__PURE__ */ new Map();
			scopeDisposers = /* @__PURE__ */ new Map();
			urls = /* @__PURE__ */ new Set();
			disposed = false;
			/**
			* @param ctx - Owning ui-conversation fiber.
			* @param sessions - Session Controller object layer.
			*/
			constructor(ctx, sessions) {
				this.sessions = sessions;
				ctx.effect(() => () => {
					this.dispose();
				}, "ui-conversation historical image cache");
			}
			/**
			* Resolve and cache one session-authorized image URL.
			* @param sessionId - Session authorization and lifetime scope.
			* @param attachment - Durable image reference.
			* @returns browser URL valid until the Session binding is released.
			*/
			resolve(sessionId, attachment) {
				if (this.disposed) return Promise.reject(/* @__PURE__ */ new Error("ui-conversation image cache is disposed"));
				const key = this.key(sessionId, attachment);
				const cached = this.entries.get(key);
				if (cached !== void 0) return cached.pending;
				const binding = this.sessions.binding(sessionId);
				if (binding === void 0) return Promise.reject(/* @__PURE__ */ new Error(`ui-conversation: unknown session "${sessionId}"`));
				this.bindScope(sessionId, binding.ctx);
				const entry = {
					sessionId,
					generation: this.generations.get(sessionId) ?? 0,
					pending: Promise.resolve("")
				};
				this.entries.set(key, entry);
				entry.pending = this.loadCanonical(key, entry, attachment);
				return entry.pending;
			}
			/**
			* Return an already-displayable URL without starting a read.
			* @param sessionId - Session authorization and lifetime scope.
			* @param attachment - Durable image reference.
			* @returns current preview or canonical URL when cached.
			*/
			peek(sessionId, attachment) {
				return this.entries.get(this.key(sessionId, attachment))?.current;
			}
			/**
			* Adopt a submission preview while fetching the durable admitted bytes.
			* The preview is available synchronously, then replaced and revoked when
			* the canonical attachment read completes.
			* @param sessionId - Session authorization and lifetime scope.
			* @param attachment - Durable image reference the URL temporarily displays.
			* @param url - browser URL to adopt.
			* @returns whether the cache took ownership.
			*/
			seed(sessionId, attachment, url) {
				if (this.disposed) return false;
				const key = this.key(sessionId, attachment);
				if (this.entries.has(key)) return false;
				const binding = this.sessions.binding(sessionId);
				if (binding === void 0) return false;
				this.bindScope(sessionId, binding.ctx);
				const entry = {
					sessionId,
					generation: this.generations.get(sessionId) ?? 0,
					current: url,
					pending: Promise.resolve(url)
				};
				this.urls.add(url);
				this.entries.set(key, entry);
				entry.pending = this.loadCanonical(key, entry, attachment).catch((error) => {
					if (this.entries.get(key) === entry && entry.current === url) {
						this.entries.delete(key);
						this.releaseUrl(url);
					}
					throw error;
				});
				entry.pending.catch(() => {});
				return true;
			}
			key(sessionId, attachment) {
				return `${sessionId}:${attachment.attachmentId}`;
			}
			loadCanonical(key, entry, attachment) {
				const binding = this.sessions.binding(entry.sessionId);
				if (binding === void 0) return Promise.reject(/* @__PURE__ */ new Error(`ui-conversation: unknown session "${entry.sessionId}"`));
				return binding.session.readAttachment(attachment.attachmentId).then((result) => {
					if (!result.ok) throw new Error(`${result.error.code}: ${result.error.message}`);
					this.assertLive(key, entry);
					let url;
					if (typeof URL.createObjectURL !== "function") url = `data:${result.value.attachment.mediaType};base64,${bytesToBase64(result.value.data)}`;
					else {
						const bytes = Uint8Array.from(result.value.data);
						url = URL.createObjectURL(new Blob([bytes.buffer], { type: result.value.attachment.mediaType }));
					}
					this.assertLive(key, entry);
					this.urls.add(url);
					const previous = entry.current;
					entry.current = url;
					if (previous !== void 0 && previous !== url) this.releaseUrl(previous);
					return url;
				}).catch((error) => {
					if (this.entries.get(key) === entry && entry.current === void 0) this.entries.delete(key);
					throw error;
				});
			}
			assertLive(key, entry) {
				if (this.disposed) throw new Error("ui-conversation image cache was disposed before loading completed");
				if (this.entries.get(key) !== entry || (this.generations.get(entry.sessionId) ?? 0) !== entry.generation) throw new Error("ui-conversation image scope was released before loading completed");
			}
			bindScope(sessionId, scope) {
				if (this.scopeDisposers.has(sessionId)) return;
				const dispose = scope.effect(() => () => {
					this.scopeDisposers.delete(sessionId);
					this.release(sessionId);
				}, "ui-conversation historical image scope");
				this.scopeDisposers.set(sessionId, () => {
					dispose();
				});
			}
			release(sessionId) {
				this.generations.set(sessionId, (this.generations.get(sessionId) ?? 0) + 1);
				for (const [key, entry] of this.entries) {
					if (entry.sessionId !== sessionId) continue;
					this.entries.delete(key);
					if (entry.current !== void 0) this.releaseUrl(entry.current);
				}
			}
			releaseUrl(url) {
				if (!this.urls.delete(url)) return;
				revokeUrl(url);
			}
			dispose() {
				if (this.disposed) return;
				this.disposed = true;
				for (const dispose of [...this.scopeDisposers.values()]) dispose();
				this.scopeDisposers.clear();
				for (const url of this.urls) revokeUrl(url);
				this.urls.clear();
				this.entries.clear();
			}
		};
		function revokeUrl(url) {
			if (url.startsWith("blob:")) URL.revokeObjectURL(url);
		}
		//#endregion
		//#region lib/types/client/conversation/view-registry.js
		/** Runtime registry of per-target Conversation snapshot builders. */
		var ConversationViewRegistry = class extends ConversationDefinitionRegistry {
			/**
			* Register a uniquely named view builder factory for the caller's lifetime.
			* @param definition - target builder contribution.
			* @returns idempotent disposer.
			*/
			register(definition) {
				return this.registerDefinition(definition.target, definition, `conversation view target "${definition.target}" is already registered`, `uiConversation.views.register(${JSON.stringify(definition.target)})`);
			}
		};
		//#endregion
		//#region lib/types/client/conversation/assembly.js
		/** Per-Session target-neutral Conversation assembly. */
		var BoundConversation = class {
			assembler;
			snapshot;
			viewStore;
			targetSources = /* @__PURE__ */ new Map();
			revision = -1;
			frame;
			disposeFeed = () => {};
			constructor(feed, assembler) {
				this.assembler = assembler;
				this.viewStore = assembler;
				this.snapshot = (0, _deepseek_ai_dsh_client_store.createSnapshotStore)(this.currentSnapshot());
				this.replace(feed.getSnapshot());
				this.disposeFeed = feed.subscribe(() => {
					this.accept(feed.getSnapshot());
				});
			}
			target(target) {
				let source = this.targetSources.get(target);
				if (source === void 0) {
					const views = this.viewStore;
					source = {
						getSnapshot: () => views.get(target),
						subscribe: (listener) => {
							const unsubscribe = this.snapshot.subscribe(listener);
							this.activate(target);
							return unsubscribe;
						}
					};
					this.targetSources.set(target, source);
				}
				return source;
			}
			activate(target) {
				if (this.assembler.activateTarget(target)) this.snapshot.set(this.currentSnapshot());
			}
			rebuild() {
				this.publish(this.assembler.rebuildRegistry());
			}
			dispose() {
				this.cancelFrame();
				this.disposeFeed();
			}
			replace(window) {
				this.revision = window.revision;
				this.publish(this.assembler.replaceWindow(window.entries, window.hasMore));
			}
			accept(window) {
				if (window.revision === this.revision) return;
				if (window.revision !== this.revision + 1 || window.change.kind === "replace") {
					this.replace(window);
					return;
				}
				this.revision = window.revision;
				switch (window.change.kind) {
					case "prepend":
						this.publish(this.assembler.prepend(window.change.entries, window.hasMore));
						return;
					case "append": {
						let publication = "none";
						for (const event of window.change.entries) {
							const next = this.assembler.append(event);
							if (next === "immediate" || publication === "none") publication = next;
						}
						this.publish(publication);
						return;
					}
					case "settle-assistant":
						this.publish(this.assembler.settleAssistant(window.change.attemptId, window.change.entry));
						return;
				}
			}
			publish(publication) {
				if (publication === "none") return;
				if (publication === "animation-frame" && typeof requestAnimationFrame === "function") {
					if (this.frame !== void 0) return;
					this.frame = requestAnimationFrame(() => {
						this.frame = requestAnimationFrame(() => {
							this.frame = requestAnimationFrame(() => {
								this.frame = void 0;
								this.flush();
							});
						});
					});
					return;
				}
				this.cancelFrame();
				this.flush();
			}
			cancelFrame() {
				if (this.frame !== void 0 && typeof cancelAnimationFrame === "function") cancelAnimationFrame(this.frame);
				this.frame = void 0;
			}
			flush() {
				if (this.assembler.flush()) this.snapshot.set(this.currentSnapshot());
			}
			currentSnapshot() {
				return {
					views: this.viewStore,
					activeTargets: this.assembler.activityTargets()
				};
			}
		};
		/** Root service owning Conversation registries and per-Session bindings. */
		var UiConversation = class extends _deepseek_ai_cordis.Service {
			sessions;
			/** Registry of event matchers and target snapshot builders. */
			events;
			/** Registry of target View definitions. */
			views;
			bindings = /* @__PURE__ */ new Map();
			images;
			/**
			* @param ctx - owning Client context.
			* @param sessions - Session Controller object layer.
			*/
			constructor(ctx, sessions) {
				super(ctx, "uiConversation");
				this.sessions = sessions;
				this.events = new ConversationEventRegistry(ctx);
				this.views = new ConversationViewRegistry(ctx);
				this.images = new HistoricalImageCache(ctx, sessions);
				const rebuild = () => {
					for (const record of this.bindings.values()) record.binding.rebuild();
				};
				let rebuildQueued = false;
				const scheduleRebuild = () => {
					if (rebuildQueued) return;
					rebuildQueued = true;
					queueMicrotask(() => {
						rebuildQueued = false;
						rebuild();
					});
				};
				ctx.effect(() => {
					const disposeEvents = this.events.subscribe(scheduleRebuild);
					const disposeViews = this.views.subscribe(scheduleRebuild);
					return () => {
						disposeViews();
						disposeEvents();
						for (const record of [...this.bindings.values()]) this.drop(record, true);
					};
				}, "ui-conversation assembly");
			}
			/**
			* Resolve the Conversation binding for one Controller binding or Session id.
			* @param source - Session binding or identity.
			* @returns stable Conversation binding.
			*/
			binding(source) {
				const sessionId = typeof source === "string" ? source : source.sessionId;
				const owner = typeof source === "string" ? this.sessions.binding(source) : source;
				if (owner === void 0) throw new Error(`uiConversation.binding: unknown session "${sessionId}"`);
				const current = this.bindings.get(owner.sessionId);
				if (current?.source === owner) return current.binding;
				if (current !== void 0) this.drop(current, true);
				const binding = new BoundConversation(owner.eventSource, new ConversationNodeAssembler(this.events, this.views));
				const record = {
					source: owner,
					binding,
					disposeScope: () => {}
				};
				this.bindings.set(owner.sessionId, record);
				const disposeScope = owner.ctx.effect(() => () => {
					this.drop(record, false);
				}, "ui-conversation binding");
				record.disposeScope = () => {
					disposeScope();
				};
				return binding;
			}
			/**
			* Resolve one session-authorized durable image URL, cached per Session so
			* every Conversation target shares one read and one browser URL.
			* @param sessionId - Session authorization and lifetime scope.
			* @param attachment - Durable image reference from a session event.
			* @returns browser URL valid until the Session binding is released.
			*/
			imageUrl(sessionId, attachment) {
				return this.images.resolve(sessionId, attachment);
			}
			/**
			* Read a cached durable image URL synchronously when one is available.
			* @param sessionId - Session authorization and lifetime scope.
			* @param attachment - Durable image reference from a session event.
			* @returns current preview or canonical URL, if cached.
			*/
			peekImageUrl(sessionId, attachment) {
				return this.images.peek(sessionId, attachment);
			}
			/**
			* Adopt an already-displayable URL for one durable reference (see
			* HistoricalImageCache.seed): the transcript node then renders it without a
			* byte round-trip.
			* @param sessionId - Session authorization and lifetime scope.
			* @param attachment - Durable image reference the URL displays.
			* @param url - browser URL to adopt.
			* @returns whether the cache took URL ownership.
			*/
			seedImageUrl(sessionId, attachment, url) {
				return this.images.seed(sessionId, attachment, url);
			}
			/**
			* Interpret a system message or surface replacement for target-owned prompt Definitions.
			* @param previous - System facts at the preceding relevant loaded event.
			* @param event - Durable system message or positional replacement.
			* @returns Immutable prompt interpretation at this event.
			*/
			inspectSystemPrompt(previous, event) {
				return inspectSystemPrompt(previous, event);
			}
			/**
			* Canonicalize one `request/header` event against the previous prompt state
			* and the `system/message` node in force.
			*
			* A pure interpretation shared by the Chat and Trajectory Definitions, exposed
			* as a service method because cross-plugin value imports are forbidden in
			* client bundles.
			* @param previous - prompt recorded by the preceding loaded header, if any.
			* @param event - the `request/header` session event to interpret.
			* @param system - effective prompt after loaded surface replacements, if any.
			* @returns the canonical prompt snapshot and any model-visible change.
			*/
			inspectRequestPrompt(previous, event, system) {
				return inspectRequestPrompt(previous, event, system);
			}
			drop(record, releaseScope) {
				if (this.bindings.get(record.source.sessionId) !== record) return;
				this.bindings.delete(record.source.sessionId);
				record.binding.dispose();
				if (releaseScope) record.disposeScope();
			}
		};
		//#endregion
		//#region lib/types/client/stores.js
		/** Per-session Conversation store shared by the shell body and header. */
		const CONVERSATION_STORE_KEY = "dsh.conversation";
		/**
		* Declare per-session draft persistence and View selection.
		* @returns the store handle.
		*/
		function createConversationStore() {
			return (0, _deepseek_ai_dsh_client_store.defineStore)({
				init: () => ({
					draft: "",
					view: null,
					viewRequest: null
				}),
				persist: CONVERSATION_STORE_KEY,
				actions: {
					setDraft: (d, text) => {
						d.draft = text;
					},
					setView: (d, view) => {
						d.view = view;
					},
					openView: (d, view, focus) => {
						d.view = view;
						d.viewRequest = {
							view,
							focus
						};
					},
					completeViewRequest: (d) => {
						d.viewRequest = null;
					}
				}
			});
		}
		/**
		* Read the persisted View preference before the Slot store is materialized.
		* @param sessionId - Session-scoped persistence suffix.
		* @returns the preferred View id, or null when storage has no usable value.
		*/
		function readConversationViewPreference(sessionId) {
			if (typeof localStorage === "undefined") return null;
			try {
				const raw = localStorage.getItem(`${CONVERSATION_STORE_KEY}.${sessionId}`);
				if (raw === null) return null;
				const stored = JSON.parse(raw);
				if (typeof stored !== "object" || stored === null || !("view" in stored)) return null;
				return typeof stored.view === "string" ? stored.view : null;
			} catch {
				return null;
			}
		}
		//#endregion
		//#region lib/types/client/service.js
		/**
		* Scope-addressed conversation send, cancel, and history orchestration.
		*
		* Scope addressing rides the cordis Service tracker: property access through
		* `ctx.conversation` rebinds `this.ctx` to the caller's context, so methods
		* read the session tag with `scopeOf`. Mutable state must remain reachable
		* through one property read; assignment through the tracker proxy and `#`
		* private fields bypass that rebinding.
		*/
		/** Create one browser-only image draft descriptor; only its id enters input state. */
		function browserDraftAttachment(file) {
			return {
				kind: "image",
				id: randomUUID(),
				previewUrl: URL.createObjectURL(file),
				file
			};
		}
		/**
		* Fill the draft's intrinsic dimensions once the browser parses the image
		* header (a metadata read off the preview URL, not a full decode). Failures
		* and non-browser runtimes leave them absent — consumers size those images
		* from CSS constraints instead. The descriptors stay registry-owned; submit
		* reads the dimensions into an immutable echo snapshot, so this late write
		* does not require a store notification.
		*/
		function probeDimensions(attachment) {
			if (typeof Image !== "function") return;
			const probe = new Image();
			probe.onload = () => {
				attachment.width = probe.naturalWidth;
				attachment.height = probe.naturalHeight;
			};
			probe.src = attachment.previewUrl;
		}
		/** Give the echo one paint opportunity without letting a throttled frame clock block admission. */
		function nextPaint() {
			return new Promise((resolve) => {
				if (typeof requestAnimationFrame === "function") {
					if (typeof document !== "undefined" && document.visibilityState === "hidden") {
						setTimeout(resolve, 0);
						return;
					}
					let settled = false;
					const finish = () => {
						if (settled) return;
						settled = true;
						clearTimeout(fallback);
						setTimeout(resolve, 0);
					};
					const fallback = setTimeout(finish, 100);
					requestAnimationFrame(finish);
				} else setTimeout(resolve, 0);
			});
		}
		/** Native canonical base64 of one browser image (FileReader data-URL encode; no main-thread byte loop). */
		function base64ImageOf(file) {
			return new Promise((resolve, reject) => {
				const reader = new FileReader();
				reader.onload = () => {
					const url = reader.result;
					resolve(url.slice(url.indexOf(",") + 1));
				};
				reader.onerror = () => {
					reject(reader.error ?? /* @__PURE__ */ new Error("conversation: image read failed"));
				};
				reader.readAsDataURL(file);
			});
		}
		/** Unsupported browser-declared image type, localized by the UI boundary. */
		var UnsupportedImageMediaTypeError = class extends Error {
			/** Browser-declared MIME value, possibly empty. */
			mediaType;
			/** @param mediaType - Browser-declared MIME value, possibly empty. */
			constructor(mediaType) {
				super(`unsupported image media type: ${mediaType || "(empty)"}`);
				this.name = "UnsupportedImageMediaTypeError";
				this.mediaType = mediaType;
			}
		};
		/** Scope-addressed conversation service (root singleton, provided as `conversation`). */
		var ConversationController = class extends _deepseek_ai_cordis.Service {
			/** The per-session input machine registry (SessionInputResolver face). */
			input;
			/** The per-session composer-block registry. */
			blocks;
			/** Live upload state per file-kind draft; images never appear here. */
			fileUploads = (0, _deepseek_ai_dsh_client_store.createSnapshotStore)({});
			draftAttachments = /* @__PURE__ */ new Map();
			fileUploadOperations = /* @__PURE__ */ new Map();
			pendingFileUploads = /* @__PURE__ */ new Set();
			fileUploadQueue = [];
			activeFileUploads = 0;
			maxConcurrentFileUploads;
			/**
			* @param ctx - owning root context (the plugin apply context; the service
			* registers itself and follows that fiber's lifetime).
			* @param config - carries the SessionInputResolver and composer-block registry
			* constructed by the plugin apply (the same instances the slot inject
			* factories close over).
			*/
			constructor(ctx, config) {
				super(ctx, "conversation");
				this.input = config.input;
				this.blocks = config.blocks;
				this.maxConcurrentFileUploads = config.maxConcurrentFileUploads;
				ctx.effect(() => async () => {
					const operations = [...this.fileUploadOperations.values()];
					for (const operation of operations) operation.controller.abort();
					await Promise.allSettled([...this.pendingFileUploads]);
					this.fileUploadOperations.clear();
					this.fileUploadQueue.length = 0;
					for (const attachment of this.draftAttachments.values()) if (attachment.kind === "image") revokePreview(attachment.previewUrl);
					this.draftAttachments.clear();
					this.fileUploads.set({});
				}, "conversation draft attachments");
			}
			/**
			* Send a prompt into the scoped session. Business failures also land in the
			* session snapshot's promptError (object-layer state); the rejection here
			* exists for caller choreography (the composer restores the draft on it).
			* @param text - prompt text, sent verbatim as one text block.
			*/
			async send(text) {
				const result = await this.scopedSession("send").prompt([{
					type: "text",
					text
				}], "queue");
				if (!result.ok) throw new Error(`conversation.send failed: ${result.error.code}: ${result.error.message}`);
			}
			/**
			* Submit ordered draft attachments with text through one host admission. A local
			* submission echo enters the session snapshot synchronously; serialization
			* and the prompt round-trip start after the browser can paint it. On the
			* echo's observed retirement seeds admitted image previews into the durable
			* cache and removes every attachment from the draft registry. On failure,
			* every attachment remains registered so the composer can restore it.
			* @param session - target session.
			* @param text - serialized prompt text.
			* @param attachmentIds - ordered draft-local attachment ids.
			* @param mode - queue or steer delivery selected by composer policy.
			* @param signal - optional cancellation for the complete Host admission.
			* @returns the Host admission outcome; local attachment preparation failures reject.
			*/
			async sendSession(session, text, attachmentIds, mode, signal) {
				const attachments = this.resolveDraftAttachments(attachmentIds);
				if (attachments.length !== attachmentIds.length) throw new Error("conversation.sendSession: one or more draft attachments are no longer available");
				const uploads = this.fileUploads.getSnapshot();
				const uploadFor = (attachment) => {
					const upload = uploads[attachment.id];
					if (upload === void 0 || upload.status !== "ready") throw new Error("conversation.sendSession: one or more files have not finished uploading");
					return upload;
				};
				const pendingAttachments = attachments.map((attachment) => attachment.kind === "image" ? {
					type: "image",
					value: {
						previewUrl: attachment.previewUrl,
						...attachment.file.name === "" ? {} : { name: attachment.file.name },
						...attachment.width === void 0 ? {} : { width: attachment.width },
						...attachment.height === void 0 ? {} : { height: attachment.height }
					}
				} : {
					type: "file",
					value: uploadFor(attachment).file
				});
				const serializeAttachments = () => Promise.all(attachments.map(async (attachment) => attachment.kind === "image" ? {
					type: "image",
					...await this.encodeImage(attachment.file)
				} : {
					type: "file",
					receiptId: uploadFor(attachment).receiptId
				}));
				if (session.getSnapshot().subagent !== null) {
					const content = [...await serializeAttachments(), ...text === "" ? [] : [{
						type: "text",
						text
					}]];
					return (await session.prompt(content, mode, signal)).ok ? { kind: "success" } : { kind: "error" };
				}
				let finishRetirement;
				const retirement = attachments.length === 0 ? void 0 : new Promise((resolve) => {
					finishRetirement = resolve;
				});
				const submission = session.beginSubmission({
					mode,
					text,
					attachments: pendingAttachments,
					onRetire: (settlement) => {
						this.settleSubmittedAttachments(session.sessionId, attachments, settlement);
						finishRetirement?.(settlement);
					}
				});
				let content;
				try {
					await nextPaint();
					content = [...await serializeAttachments(), ...text === "" ? [] : [{
						type: "text",
						text
					}]];
				} catch (error) {
					submission.abandon();
					throw error;
				}
				if (!(await session.prompt(content, mode, signal, submission.requestId)).ok) return { kind: "error" };
				if (retirement !== void 0 && (await retirement).reason !== "observed") return { kind: "error" };
				return { kind: "success" };
			}
			/**
			* Create runtime-only draft attachments. Files whose browser MIME is an
			* accepted image type become image drafts (object URL preview, bytes sent
			* with the prompt); every other file becomes a file draft whose background
			* upload starts immediately and remains owned by this service across Session
			* navigation until completion or explicit removal.
			* @param sessionId - target Agent-scope identity.
			* @param files - browser files to register.
			* @returns ordered draft descriptors.
			*/
			createDrafts(sessionId, files) {
				return files.map((file) => {
					if (isImageMediaType(file.type)) {
						const attachment = browserDraftAttachment(file);
						this.draftAttachments.set(attachment.id, attachment);
						probeDimensions(attachment);
						return attachment;
					}
					const attachment = {
						kind: "file",
						id: randomUUID(),
						file
					};
					this.draftAttachments.set(attachment.id, attachment);
					this.beginFileUpload(sessionId, attachment);
					return attachment;
				});
			}
			/**
			* Restart one failed file upload.
			* @param sessionId - target Agent-scope identity.
			* @param id - draft attachment id whose upload previously failed.
			*/
			retryFileUpload(sessionId, id) {
				const attachment = this.draftAttachments.get(id);
				if (attachment === void 0 || attachment.kind !== "file") return;
				if (this.fileUploads.getSnapshot()[id]?.status !== "error") return;
				this.beginFileUpload(sessionId, attachment);
			}
			/**
			* Stage carried file drafts again for a new Session.
			* @param sessionId - target Agent-scope identity after a Workspace switch.
			* @param ids - carried draft attachment ids.
			*/
			rebindDraftFiles(sessionId, ids) {
				for (const id of ids) {
					const attachment = this.draftAttachments.get(id);
					if (attachment?.kind === "file") this.beginFileUpload(sessionId, attachment);
				}
			}
			beginFileUpload(sessionId, attachment) {
				this.fileUploadOperations.get(attachment.id)?.controller.abort();
				const controller = new AbortController();
				this.fileUploads.update((draft) => {
					draft[attachment.id] = {
						status: "uploading",
						loaded: 0
					};
				});
				let settle;
				const done = new Promise((resolve) => {
					settle = resolve;
				});
				this.fileUploadOperations.set(attachment.id, {
					controller,
					done
				});
				this.pendingFileUploads.add(done);
				done.then(() => {
					this.pendingFileUploads.delete(done);
				});
				const run = async () => {
					try {
						if (controller.signal.aborted || this.fileUploadOperations.get(attachment.id)?.controller !== controller) return;
						const result = await this.ctx.fileUpload.upload(sessionId, attachment.file, attachment.file.name === "" ? void 0 : attachment.file.name, controller.signal, (progress) => {
							if (this.fileUploadOperations.get(attachment.id)?.controller !== controller) return;
							this.fileUploads.update((draft) => {
								if (!(attachment.id in draft)) return;
								draft[attachment.id] = {
									status: "uploading",
									loaded: progress.loaded,
									...progress.total === void 0 ? {} : { total: progress.total }
								};
							});
						});
						if (this.fileUploadOperations.get(attachment.id)?.controller !== controller) return;
						this.fileUploads.update((draft) => {
							if (!(attachment.id in draft)) return;
							draft[attachment.id] = result.ok ? {
								status: "ready",
								receiptId: result.value.receiptId,
								file: result.value.file
							} : {
								status: "error",
								message: result.error.message
							};
						});
					} catch (error) {
						if (this.fileUploadOperations.get(attachment.id)?.controller !== controller) return;
						this.fileUploads.update((draft) => {
							if (!(attachment.id in draft)) return;
							draft[attachment.id] = {
								status: "error",
								message: error instanceof Error ? error.message : String(error)
							};
						});
					} finally {
						if (this.fileUploadOperations.get(attachment.id)?.controller === controller) this.fileUploadOperations.delete(attachment.id);
					}
				};
				this.fileUploadQueue.push({
					run,
					settle
				});
				this.pumpFileUploads();
			}
			/** Start queued upload Workers until the configured concurrency is occupied. */
			pumpFileUploads() {
				while (this.activeFileUploads < this.maxConcurrentFileUploads) {
					const task = this.fileUploadQueue.shift();
					if (task === void 0) return;
					this.activeFileUploads += 1;
					task.run().finally(() => {
						this.activeFileUploads -= 1;
						task.settle();
						this.pumpFileUploads();
					});
				}
			}
			/**
			* Resolve ordered input-state ids to runtime-owned draft attachments.
			* @param ids - draft attachment ids.
			* @returns descriptors that remain live, in requested order.
			*/
			resolveDraftAttachments(ids) {
				const attachments = [];
				for (const id of ids) {
					const attachment = this.draftAttachments.get(id);
					if (attachment !== void 0) attachments.push(attachment);
				}
				return attachments;
			}
			/**
			* Serialize ordered draft attachments to command-submit wire payloads without
			* sending or releasing them. Images are encoded; generic files cite receipts
			* from their completed background uploads and never reread browser bytes.
			* @param attachmentIds - ordered draft-local attachment ids.
			* @returns wire payloads in id order.
			*/
			async serializeDraftAttachments(attachmentIds) {
				const attachments = this.resolveDraftAttachments(attachmentIds);
				if (attachments.length !== attachmentIds.length) throw new Error("conversation.serializeDraftAttachments: one or more draft attachments are no longer available");
				const uploads = this.fileUploads.getSnapshot();
				return { attachments: await Promise.all(attachments.map(async (attachment) => {
					if (attachment.kind === "image") return {
						type: "image",
						...await this.encodeImage(attachment.file)
					};
					const upload = uploads[attachment.id];
					if (upload === void 0 || upload.status !== "ready") throw new Error("conversation.serializeDraftAttachments: one or more files have not finished uploading");
					return {
						type: "file",
						receiptId: upload.receiptId
					};
				})) };
			}
			/**
			* Release one browser-owned draft attachment, aborting its active upload.
			* @param id - draft attachment id.
			*/
			releaseDraftAttachment(id) {
				const attachment = this.draftAttachments.get(id);
				if (attachment === void 0) return;
				const operation = this.fileUploadOperations.get(id);
				this.fileUploadOperations.delete(id);
				operation?.controller.abort();
				this.draftAttachments.delete(id);
				if (attachment.kind === "image") {
					revokePreview(attachment.previewUrl);
					return;
				}
				this.fileUploads.set(Object.fromEntries(Object.entries(this.fileUploads.getSnapshot()).filter(([key]) => key !== id)));
			}
			/**
			* Release a set of browser-owned draft attachments.
			* @param attachments - descriptors to release.
			*/
			releaseDraftAttachments(attachments) {
				for (const attachment of attachments) this.releaseDraftAttachment(attachment.id);
			}
			/** Apply one operation to a pending queue occurrence. */
			async updateQueue(itemId, action) {
				const result = await this.scopedSession("updateQueue").updateQueue(itemId, action);
				if (!result.ok) {
					if (action.kind === "steer" && (result.error.code === "session/steer-unavailable" || result.error.code === "session/queue-item-not-found")) return;
					throw new Error(`conversation.updateQueue failed: ${result.error.code}: ${result.error.message}`);
				}
			}
			/** Cancel the scoped session's in-flight turn while preserving Queue (failures land in promptError and reject, as in send). */
			async cancel() {
				const result = await this.scopedSession("cancel").cancel();
				if (!result.ok) throw new Error(`conversation.cancel failed: ${result.error.code}: ${result.error.message}`);
			}
			/** Pull one older history page for the scoped Session. */
			async loadOlder() {
				await this.scopedSession("loadOlder").loadOlder();
			}
			/** Resolve the caller scope's session face or throw on root contexts. */
			scopedSession(op) {
				const id = this.scopeId(op);
				const binding = this.requireSessions().binding(id);
				if (binding === void 0) throw new Error(`conversation.${op}: session "${id}" resolved no binding`);
				return binding.session;
			}
			/** Read the caller's session scope tag via the sessions service; root contexts fail loud. */
			scopeId(op) {
				const id = this.requireSessions().scopeOf(this.ctx);
				if (id === void 0) throw new Error(`conversation.${op} requires a session scope — address one via ctx.sessions.scope(id).conversation`);
				return id;
			}
			requireSessions() {
				const sessions = this.ctx.get("sessions");
				if (sessions === void 0) throw new Error("conversation: sessions service unavailable");
				return sessions;
			}
			/**
			* Settle one submission's draft attachments when its echo retires. Observed:
			* each image leaves the registry, handing its preview URL to the durable
			* image cache (seeded under the admitted reference so the transcript node
			* renders immediately while the cache reads canonical bytes) or revoking it
			* when the cache already holds that reference. Failed: nothing changes;
			* the ids stay registered for the composer's rail restore.
			*/
			settleSubmittedAttachments(sessionId, attachments, retirement) {
				if (retirement.reason !== "observed") return;
				const uiConversation = this.ctx.get("uiConversation");
				let observedIndex = 0;
				for (const attachment of attachments) {
					const live = this.draftAttachments.get(attachment.id);
					const ref = retirement.attachments[observedIndex++];
					if (live === void 0) continue;
					if (attachment.kind === "file") {
						this.releaseDraftAttachment(attachment.id);
						continue;
					}
					this.draftAttachments.delete(attachment.id);
					if (ref !== void 0 && "mediaType" in ref && uiConversation?.seedImageUrl(sessionId, ref, attachment.previewUrl) === true) continue;
					revokePreview(attachment.previewUrl);
				}
			}
			/** Canonical base64 wire form of one browser image file. */
			async encodeImage(file) {
				return {
					mediaType: imageMediaType(file.type),
					data: await base64ImageOf(file),
					...file.name === "" ? {} : { name: file.name }
				};
			}
		};
		function imageMediaType(value) {
			switch (value) {
				case "image/png":
				case "image/jpeg":
				case "image/webp":
				case "image/gif": return value;
				default: throw new UnsupportedImageMediaTypeError(value);
			}
		}
		/** Whether a browser-declared MIME selects the image draft path (all other files upload verbatim). */
		function isImageMediaType(value) {
			return value === "image/png" || value === "image/jpeg" || value === "image/webp" || value === "image/gif";
		}
		function revokePreview(url) {
			if (url.startsWith("blob:")) URL.revokeObjectURL(url);
		}
		//#endregion
		//#region lib/types/client/input/blocks.js
		/**
		* Composer blocks: the one way another plugin stops a session's input.
		*
		* The composer cannot read the plugins that would know — the dependency runs
		* ui-model-selection → ui-conversation, never back — so a blocker pushes here and the
		* bar reads its own session's store. A block carries the localized reason it
		* exists, because the plugin that raised it owns that copy; the composer only
		* knows how to render an inert textarea with a placeholder, exactly as it
		* already does for a session with no workspace.
		*
		* This is an affordance, not enforcement: the Host refuses a prompt it cannot
		* route regardless of what any client disables.
		*/
		/** The per-session composer-block registry (one instance per plugin fiber). */
		var ComposerBlockRegistry = class {
			stores = /* @__PURE__ */ new Map();
			/** @inheritdoc */
			set(sessionId, block) {
				const store = this.storeFor(sessionId);
				if (store.getSnapshot()?.reason === block?.reason) return;
				store.set(block);
			}
			/** @inheritdoc */
			storeFor(sessionId) {
				const existing = this.stores.get(sessionId);
				if (existing !== void 0) return existing;
				const created = (0, _deepseek_ai_dsh_client_store.createSnapshotStore)(void 0);
				this.stores.set(sessionId, created);
				return created;
			}
			/** @inheritdoc */
			forget(sessionId) {
				this.stores.delete(sessionId);
			}
		};
		//#endregion
		//#region lib/types/client/input/queue-store.js
		/**
		* Project a session's transient inbox rows as a bare observable (subscribe/getSnapshot).
		* The wiring layer overlays this onto InputState.queue; the runtime
		* QueuedMessage and the input-contract QueuedMessage are structurally
		* identical.
		* @param session - the resident session face.
		* @returns the queue read face (snapshot reference stable while the queue is unchanged).
		*/
		function queueReadFaceOf(session) {
			return {
				getSnapshot: () => session.getSnapshot().queue,
				subscribe: (fn) => session.subscribe(fn)
			};
		}
		//#endregion
		//#region ../../../node_modules/.pnpm/lexical@0.49.0_typescript@6.0.3/node_modules/lexical/dist/Lexical.prod.mjs
		/**
		* Copyright (c) Meta Platforms, Inc. and affiliates.
		*
		* This source code is licensed under the MIT license found in the
		* LICENSE file in the root directory of this source tree.
		*
		*/
		function t(t, ...e) {
			const n = new URL("https://lexical.dev/docs/error"), o = new URLSearchParams();
			o.append("code", t);
			for (const t of e) o.append("v", t);
			throw n.search = o.toString(), Error(`Minified Lexical error #${t}; visit ${n.toString()} for the full message or use the non-minified dev environment for full errors and additional helpful warnings.`);
		}
		function e(t, ...e) {
			const n = new URL("https://lexical.dev/docs/error"), o = new URLSearchParams();
			o.append("code", t);
			for (const t of e) o.append("v", t);
			n.search = o.toString(), console.warn(`Minified Lexical warning #${t}; visit ${n.toString()} for the full message or use the non-minified dev environment for full errors and additional helpful warnings.`);
		}
		const n = "undefined" != typeof window && void 0 !== window.document && void 0 !== window.document.createElement, o = n && "documentMode" in document ? document.documentMode : null, r$1 = n && /Mac|iPod|iPhone|iPad/.test(navigator.platform), i = n && /^(?!.*Seamonkey)(?=.*Firefox).*/i.test(navigator.userAgent), s = !(!n || !("InputEvent" in window) || o) && "getTargetRanges" in new window.InputEvent("input"), l = n && /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream, c = n && /Android/.test(navigator.userAgent), a = n && /Version\/[\d.]+.*Safari/.test(navigator.userAgent) && !c, u = n && /^(?=.*Chrome).*/i.test(navigator.userAgent), f = n && c && u, d$1 = n && /AppleWebKit\/[\d.]+/.test(navigator.userAgent) && r$1 && !u, h = 0, g = 1, _ = 2, b = 1, N = 2, E$1 = 3, w = 4, O$3 = 5, M$2 = 6, A = a || l || d$1 ? "\xA0" : "​", D$1 = "\n\n", F = i ? "\xA0" : A, z$1 = {
			bold: 1,
			capitalize: 1024,
			code: 16,
			highlight: 128,
			italic: 2,
			lowercase: 256,
			strikethrough: 4,
			subscript: 32,
			superscript: 64,
			underline: 8,
			uppercase: 512
		}, B = {
			directionless: 1,
			unmergeable: 2
		}, R$1 = {
			center: 2,
			end: 6,
			justify: 4,
			left: 1,
			right: 3,
			start: 5
		}, W = {
			[N]: "center",
			[M$2]: "end",
			[w]: "justify",
			[b]: "left",
			[E$1]: "right",
			[O$3]: "start"
		}, $ = {
			normal: 0,
			segmented: 2,
			token: 1
		}, U = {
			[h]: "normal",
			[_]: "segmented",
			[g]: "token"
		}, j = "$config";
		function J() {
			return vc()._blockCursorElement;
		}
		function V(t) {
			return null !== t && 1 === t.nodeType && t.hasAttribute("data-lexical-slot");
		}
		var q = class q {
			element;
			before;
			after;
			constructor(t, e, n) {
				this.element = t, this.before = e || null, this.after = n || null;
			}
			withBefore(t) {
				return new q(this.element, t, this.after);
			}
			withAfter(t) {
				return new q(this.element, this.before, t);
			}
			withElement(t) {
				return this.element === t ? this : new q(t, this.before, this.after);
			}
			insertChild(e) {
				const n = this.getInsertionAnchor();
				return null !== n && n.parentElement !== this.element && t(357), this.element.insertBefore(e, n), this;
			}
			removeChild(e) {
				return e.parentElement !== this.element && t(358), this.element.removeChild(e), this;
			}
			replaceChild(e, n) {
				return n.parentElement !== this.element && t(359), this.element.replaceChild(e, n), this;
			}
			getFirstChild() {
				const t = this.getFirstChildAnchor(), e = t ? t.nextSibling : this.element.firstChild;
				return e === this.getInsertionAnchor() ? null : e;
			}
			getFirstChildAnchor() {
				return this.after;
			}
			resolveLeafPosition(t, e, n) {
				if (this.element === t) return e === t && 0 === n ? "before" : "after";
				const o = Y(t, this.element);
				if (null === o) return "after";
				const r = Array.prototype.indexOf.call(t.childNodes, o);
				if (r < 0) return "after";
				if (e === t) return n <= r ? "before" : "after";
				const i = Y(t, e);
				if (null === i) return "after";
				const s = Array.prototype.indexOf.call(t.childNodes, i);
				return s >= 0 && s <= r ? "before" : "after";
			}
			getInsertionAnchor() {
				return this.before;
			}
		};
		function Y(t, e) {
			let n = e;
			for (; null !== n && n.parentNode !== t;) n = n.parentNode;
			return n;
		}
		var G = class G extends q {
			withBefore(t) {
				return new G(this.element, t, this.after);
			}
			withAfter(t) {
				return new G(this.element, this.before, t);
			}
			withElement(t) {
				return this.element === t ? this : new G(t, this.before, this.after);
			}
			getInsertionAnchor() {
				return super.getInsertionAnchor() || this.getManagedLineBreak();
			}
			getFirstChildAnchor() {
				let t = super.getFirstChildAnchor(), e = t ? t.nextSibling : this.element.firstChild;
				for (; V(e);) t = e, e = e.nextSibling;
				const n = t ? t.nextSibling : this.element.firstChild;
				return null !== n && n === J() ? n : t;
			}
			getManagedLineBreak() {
				return this.element.__lexicalLineBreak || null;
			}
			setManagedLineBreak(t) {
				if (this.element.__lexicalLastChildKind = t, null === t) this.removeManagedLineBreak();
				else {
					const e = "decorator" === t && (d$1 || l || a);
					this.insertManagedLineBreak(e);
				}
			}
			removeManagedLineBreak() {
				const t = this.getManagedLineBreak();
				if (t) {
					const e = this.element, n = "IMG" === t.nodeName ? t.nextSibling : null;
					n && e.removeChild(n), e.removeChild(t), e.__lexicalLineBreak = void 0;
				}
			}
			insertManagedLineBreak(t) {
				const e = this.getManagedLineBreak();
				if (e) {
					if (t === ("IMG" === e.nodeName)) return;
					this.removeManagedLineBreak();
				}
				const n = this.element, o = this.before, r = Zl().createElement("br");
				if (r.setAttribute("data-lexical-managed-linebreak", "true"), n.insertBefore(r, o), t) {
					const t = Zl().createElement("img");
					t.setAttribute("data-lexical-managed-linebreak", "true"), t.style.setProperty("display", "inline", "important"), t.style.setProperty("border", "0px", "important"), t.style.setProperty("margin", "0px", "important"), t.alt = "", n.insertBefore(t, r), n.__lexicalLineBreak = t;
				} else n.__lexicalLineBreak = r;
			}
			getFirstChildOffset() {
				const t = this.getFirstChild(), e = this.getInsertionAnchor();
				let n = 0;
				for (let o = this.element.firstChild; null !== o && o !== t && o !== e; o = o.nextSibling) n++;
				return n;
			}
			resolveChildIndex(t, e, n, o) {
				if (n === this.element) {
					const e = this.getFirstChildOffset(), n = J(), r = this.element.childNodes, i = Math.min(o, r.length);
					let s = 0;
					for (let t = e; t < i; t++) r[t] !== n && s++;
					return [t, Math.min(s, t.getChildrenSize())];
				}
				const r = X(e, n);
				r.push(o);
				const i = X(e, this.element);
				let s = t.getIndexWithinParent();
				for (let t = 0; t < i.length; t++) {
					const e = r[t], n = i[t];
					if (void 0 === e || e < n) break;
					if (e > n) {
						s += 1;
						break;
					}
				}
				return [t.getParentOrThrow(), s];
			}
		};
		function X(e, n) {
			const o = [];
			let r = n;
			for (; r !== e && null !== r; r = r.parentNode) {
				let t = 0;
				for (let e = r.previousSibling; null !== e; e = e.previousSibling) t++;
				o.push(t);
			}
			return r !== e && t(225), o.reverse();
		}
		let Q;
		try {
			Q = "0.49.0+prod.esm";
		} catch (t) {}
		const Z$1 = Q ?? "\"<unknown>+source\"";
		var tt = class {
			_front = /* @__PURE__ */ new Set();
			_back = /* @__PURE__ */ new Set();
			_cache;
			get size() {
				return this._front.size + this._back.size;
			}
			addBack(t) {
				return delete this._cache, this._front.has(t) || this._back.add(t), this;
			}
			addFront(t) {
				return delete this._cache, this._back.has(t) || this._front.add(t), this;
			}
			delete(t) {
				return delete this._cache, this._front.delete(t) || this._back.delete(t);
			}
			toArray() {
				const t = Array.from(this._front).reverse();
				for (const e of this._back) t.push(e);
				return t;
			}
			toReadonlyArray() {
				return this._cache = this._cache || this.toArray(), this._cache;
			}
			[Symbol.iterator]() {
				return this.toReadonlyArray()[Symbol.iterator]();
			}
		};
		const et$1 = null;
		function nt$2(t, e = 1e3) {
			return t instanceof ot$1 ? t.clone() : t.size < e ? new Map(t) : new ot$1().init(new Map(t), void 0, t.size);
		}
		var ot$1 = class ot$1 {
			_mutable = !1;
			_old = void 0;
			_nursery = void 0;
			_size = 0;
			clone() {
				return this._mutable = !1, new ot$1().init(this._old, this._nursery, this._size);
			}
			init(t, e, n) {
				return this._old = t, this._nursery = e, this._size = n, this;
			}
			get size() {
				return this._size;
			}
			has(t) {
				return void 0 !== this.get(t);
			}
			getWithTombstone(t) {
				const e = this._nursery && this._nursery.get(t);
				return void 0 !== e ? e : this._old && this._old.get(t);
			}
			get(t) {
				const e = this.getWithTombstone(t);
				return e === et$1 ? void 0 : e;
			}
			shouldCompact() {
				return void 0 !== this._nursery && 2 * this._nursery.size > this._size;
			}
			getNursery() {
				return this._mutable && this._nursery || (this.compact(), this._nursery = new Map(this._nursery), this._mutable = !0), this._nursery;
			}
			compact(t = !1) {
				if (this._nursery && this._nursery.size > 0 && (t || this.shouldCompact())) {
					const t = new Map(this._old);
					for (const [e, n] of this._nursery) n !== et$1 ? t.set(e, n) : t.delete(e);
					this._old = t, this._nursery = void 0;
				}
				return this._mutable = !1, this;
			}
			set(t, e) {
				const n = this.getWithTombstone(t);
				if (n === e) return this;
				const o = this.getNursery();
				return n !== et$1 && void 0 !== n || (this._size++, n === et$1 && o.delete(t)), o.set(t, e), this;
			}
			delete(t) {
				const e = this.has(t);
				return e && (this.getNursery().set(t, et$1), this._size--), e;
			}
			getOrInsert(t, e) {
				const n = this.get(t);
				return void 0 !== n ? n : (this.set(t, e), e);
			}
			getOrInsertComputed(t, e) {
				const n = this.get(t);
				if (void 0 !== n) return n;
				const o = e(t);
				return this.set(t, o), o;
			}
			clear() {
				this._mutable = !1, this._old = void 0, this._nursery = void 0, this._size = 0;
			}
			*keys() {
				for (const t of this.entries()) yield t[0];
			}
			*values() {
				for (const t of this.entries()) yield t[1];
			}
			*entries() {
				const t = this._nursery, e = this._old;
				if (e) for (const n of e) {
					const e = n[0], o = t ? t.get(e) : void 0;
					o !== et$1 && (void 0 !== o && (n[1] = o), yield n);
				}
				if (t) for (const n of t) n[1] === et$1 || e && e.has(n[0]) || (yield n);
			}
			forEach(t, e) {
				void 0 !== e && (t = t.bind(e));
				for (const [e, n] of this.entries()) t(n, e, this);
			}
			get [Symbol.toStringTag]() {
				return "GenMap";
			}
			[Symbol.iterator]() {
				return this.entries();
			}
		};
		function rt$1(t, e, n, o, r, i) {
			if (Pi(t)) {
				let s = t.getFirstChild();
				for (; null !== s;) {
					const t = s.__key;
					s.__parent === e && ((Pi(s) || Qc(s) && null !== s.__slots) && rt$1(s, t, n, o, r, i), n.has(t) || i.delete(t), r.push(t)), s = s.getNextSibling();
				}
			}
			for (const s of Qc(t) && null !== t.__slots ? t.__slots.values() : []) {
				const t = o.get(s);
				void 0 !== t && Zc(t) && t.__slotHost === e && ((Pi(t) || Qc(t) && null !== t.__slots) && rt$1(t, s, n, o, r, i), n.has(s) || i.delete(s), r.push(s));
			}
		}
		let it$1 = !1, st$1 = 0;
		function lt$1(t) {
			st$1 = t.timeStamp;
		}
		function ct$1(t, e, n) {
			const o = "BR" === t.nodeName, r = e.__lexicalLineBreak;
			return r && (t === r || o && t.previousSibling === r) || o && void 0 !== Qs(t, n);
		}
		function at(t, e, n) {
			const o = Jl(Il(n)), r = o && nc(o, n._rootElement);
			let i = null, s = null;
			null !== r && r.anchorNode === t && (i = r.anchorOffset, s = r.focusOffset);
			const l = t.nodeValue;
			null !== l && fl(e, l, i, s, !1);
		}
		function ut$1(t, e, n) {
			if (ur(t)) {
				const e = t.anchor.getNode();
				if (e.is(n) && t.format !== e.getFormat()) return !1;
			}
			return zs(e) && n.isAttached();
		}
		function ft$1(t, e, n) {
			for (let o = t; o && !zc(o); o = wl(o)) {
				const t = Qs(o, e);
				if (void 0 !== t) {
					const e = Ys(t, n);
					if (e) return Ki(e) || !gc(o) ? void 0 : [o, e];
				}
			}
		}
		function dt$1(t, e, n) {
			it$1 = !0;
			const o = performance.now() - st$1 > 100;
			try {
				Ai(t, () => {
					const r = Kr() || function(t) {
						return t.read("latest", () => {
							const t = Kr();
							return null !== t ? t.clone() : null;
						});
					}(t), s = /* @__PURE__ */ new Map(), l = t._editorState, c = t._blockCursorElement;
					let a = !1, u = "";
					for (let n = 0; n < e.length; n++) {
						const f = e[n], d = f.type, h = f.target, g = ft$1(h, t, l);
						if (!g) continue;
						const [_, p] = g;
						if ("characterData" === d) o && Xo(p) && zs(h) && ut$1(r, h, p) && at(h, p, t);
						else if ("childList" === d) {
							a = !0;
							const e = f.addedNodes;
							for (let n = 0; n < e.length; n++) {
								const o = e[n], r = Gs(o), s = o.parentNode;
								if (!(null == s || o === c || null !== r || ct$1(o, s, t) || t._slotsUsed && gc(o) && o.hasAttribute("data-lexical-slot") || zc(o))) {
									if (i) {
										const t = (gc(o) ? o.innerText : null) || o.nodeValue;
										t && (u += t);
									}
									s.removeChild(o);
								}
							}
							const n = f.removedNodes, o = n.length;
							if (o > 0) {
								let e = 0;
								for (let r = 0; r < o; r++) {
									const o = n[r];
									(ct$1(o, h, t) || c === o) && (h.appendChild(o), e++);
								}
								o !== e && s.set(_, p);
							}
						}
					}
					if (s.size > 0) for (const [e, n] of s) n.reconcileObservedMutation(e, t);
					const f = n.takeRecords();
					if (f.length > 0) {
						for (let e = 0; e < f.length; e++) {
							const n = f[e], o = n.addedNodes, r = n.target;
							for (let e = 0; e < o.length; e++) {
								const n = o[e], i = n.parentNode;
								null == i || "BR" !== n.nodeName || ct$1(n, r, t) || i.removeChild(n);
							}
						}
						n.takeRecords();
					}
					null !== r && (a && ol(r), i && bl(t) && r.insertRawText(u));
				});
			} finally {
				it$1 = !1;
			}
		}
		function ht$2(t) {
			const e = t._observer;
			if (null !== e) dt$1(t, e.takeRecords(), e);
		}
		function gt$1(t) {
			(function(t) {
				0 === st$1 && Il(t).addEventListener("textInput", lt$1, !0);
			})(t), t._observer = new MutationObserver((e, n) => {
				dt$1(t, e, n);
			});
		}
		var yt$2 = class {
			key;
			parse;
			unparse;
			isEqual;
			defaultValue;
			resetOnCopyNode;
			constructor(t, e) {
				this.key = t, this.parse = e.parse.bind(e), this.unparse = (e.unparse || wt).bind(e), this.isEqual = (e.isEqual || Object.is).bind(e), this.defaultValue = this.parse(void 0), this.resetOnCopyNode = e.resetOnCopyNode || !1;
			}
		};
		function mt$2(t, e) {
			return new yt$2(t, e);
		}
		function vt$1(t) {
			const e = /* @__PURE__ */ new Map(), n = /* @__PURE__ */ new Set();
			for (const { ownNodeConfig: o } of jc("function" == typeof t ? t : t.replace)) if (o && o.stateConfigs) for (const t of o.stateConfigs) {
				let o;
				"stateConfig" in t ? (o = t.stateConfig, t.flat && n.add(o.key)) : o = t, e.set(o.key, o);
			}
			return {
				flatKeys: n,
				sharedConfigMap: e
			};
		}
		const Tt$2 = new Set([
			"__proto__",
			"constructor",
			"prototype"
		]);
		var kt$1 = class kt$1 {
			node;
			knownState;
			unknownState;
			sharedNodeState;
			size;
			constructor(t, e, n = void 0, o = /* @__PURE__ */ new Map(), r = void 0) {
				this.node = t, this.sharedNodeState = e, this.unknownState = n, this.knownState = o;
				const { sharedConfigMap: i } = this.sharedNodeState, s = void 0 !== r ? r : function(t, e, n) {
					let o = n.size;
					if (e) for (const r in e) {
						const e = t.get(r);
						e && n.has(e) || o++;
					}
					return o;
				}(i, n, o);
				this.size = s;
			}
			getValue(t) {
				const e = this.knownState.get(t);
				if (void 0 !== e) return e;
				this.sharedNodeState.sharedConfigMap.set(t.key, t);
				let n = t.defaultValue;
				if (this.unknownState && t.key in this.unknownState) {
					const e = this.unknownState[t.key];
					void 0 !== e && (n = t.parse(e)), this.updateFromKnown(t, n);
				}
				return n;
			}
			getInternalState() {
				return [this.unknownState, this.knownState];
			}
			toJSON() {
				const t = { ...this.unknownState }, e = {};
				for (const [e, n] of this.knownState) e.isEqual(n, e.defaultValue) ? delete t[e.key] : t[e.key] = e.unparse(n);
				for (const n of this.sharedNodeState.flatKeys) n in t && (e[n] = t[n], delete t[n]);
				return Et$1(t) && (e.$ = t), e;
			}
			getWritable(t) {
				if (this.node === t) return this;
				const { sharedNodeState: e, unknownState: n } = this, o = new Map(this.knownState);
				return new kt$1(t, e, function(t, e, n) {
					let o;
					if (n) for (const [r, i] of Object.entries(n)) {
						if (Tt$2.has(r)) continue;
						const n = t.get(r);
						n ? e.has(n) || e.set(n, n.parse(i)) : (o = o || {}, o[r] = i);
					}
					return o;
				}(e.sharedConfigMap, o, n), o, this.size);
			}
			resetOnCopyNode() {
				for (const t of this.knownState.keys()) t.resetOnCopyNode && this.knownState.set(t, t.defaultValue);
				return this;
			}
			updateFromKnown(t, e) {
				const n = t.key;
				this.sharedNodeState.sharedConfigMap.set(n, t);
				const { knownState: o, unknownState: r } = this;
				o.has(t) || r && n in r || (r && (delete r[n], this.unknownState = Et$1(r)), this.size++), o.set(t, e);
			}
			updateFromUnknown(t, e) {
				if (Tt$2.has(t)) return;
				const n = this.sharedNodeState.sharedConfigMap.get(t);
				n ? this.updateFromKnown(n, n.parse(e)) : (this.unknownState = this.unknownState || {}, t in this.unknownState || this.size++, this.unknownState[t] = e);
			}
			updateFromJSON(t) {
				const { knownState: e } = this;
				for (const t of e.keys()) e.set(t, t.defaultValue);
				if (this.size = e.size, this.unknownState = void 0, t) for (const [e, n] of Object.entries(t)) this.updateFromUnknown(e, n);
			}
		};
		function bt$2(t) {
			const e = t.getWritable(), n = e.__state ? e.__state.getWritable(e) : new kt$1(e, Nt$1(e));
			return e.__state = n, n;
		}
		function Nt$1(t) {
			return t.__state ? t.__state.sharedNodeState : Ns(vc(), t.getType()).sharedNodeState;
		}
		function Et$1(t) {
			if (t) for (const e in t) return t;
		}
		function wt(t) {
			return t;
		}
		function Ot$1(t, e, n) {
			for (const [o, r] of e.knownState) {
				if (t.has(o.key)) continue;
				t.add(o.key);
				const e = n ? n.getValue(o) : o.defaultValue;
				if (e !== r && !o.isEqual(e, r)) return !0;
			}
			return !1;
		}
		function Mt$1(t, e, n) {
			const { unknownState: o } = e, r = n ? n.unknownState : void 0;
			if (o) for (const [e, n] of Object.entries(o)) {
				if (t.has(e)) continue;
				t.add(e);
				if (n !== (r ? r[e] : void 0)) return !0;
			}
			return !1;
		}
		function At(t, e) {
			const n = t.__state;
			return n && n.node === t ? n.getWritable(e) : n;
		}
		function Dt$1(t, e) {
			const n = t.__mode, o = t.__format, r = t.__style, i = e.__mode, s = e.__format, l = e.__style, c = t.__state, a = e.__state;
			return (null === n || n === i) && (null === o || o === s) && (null === r || r === l) && (null === t.__state || c === a || function(t, e) {
				if (t === e) return !0;
				const n = /* @__PURE__ */ new Set();
				return !(t && Ot$1(n, t, e) || e && Ot$1(n, e, t) || t && Mt$1(n, t, e) || e && Mt$1(n, e, t));
			}(c, a));
		}
		function Ft$1(t, e) {
			const n = t.mergeWithSibling(e), o = _i()._normalizedNodes;
			return o.add(t.__key), o.add(e.__key), n;
		}
		function Pt$1(t) {
			let e, n, o = t;
			if ("" !== o.__text || !o.isSimpleText() || o.isUnmergeable()) {
				for (; null !== (e = o.getPreviousSibling()) && Xo(e) && e.isSimpleText() && !e.isUnmergeable();) {
					if ("" !== e.__text) {
						if (Dt$1(e, o)) {
							o = Ft$1(e, o);
							break;
						}
						break;
					}
					e.remove();
				}
				for (; null !== (n = o.getNextSibling()) && Xo(n) && n.isSimpleText() && !n.isUnmergeable();) {
					if ("" !== n.__text) {
						if (Dt$1(o, n)) {
							o = Ft$1(o, n);
							break;
						}
						break;
					}
					n.remove();
				}
			} else o.remove();
		}
		function It(t) {
			return Lt$1(t.anchor), Lt$1(t.focus), t;
		}
		function Lt$1(t) {
			for (; "element" === t.type;) {
				const e = t.getNode(), n = t.offset;
				let o, r;
				if (n === e.getChildrenSize() ? (o = e.getChildAtIndex(n - 1), r = !0) : (o = e.getChildAtIndex(n), r = !1), Xo(o)) {
					t.set(o.__key, r ? o.getTextContentSize() : 0, "text", !0);
					break;
				}
				if (!Pi(o)) break;
				t.set(o.__key, r ? o.getChildrenSize() : 0, "element", !0);
			}
		}
		const Kt$2 = Symbol.for("@lexical/CachedTextSize");
		function zt$2(e, n) {
			return ee$3.read(() => {
				let o = 0, r = e;
				for (let e = 0; e < n && null !== r; e++) {
					const i = te$3.get(r);
					if (void 0 === i && t(345, r), Pi(i)) {
						const s = ne$3.get(r);
						if (void 0 !== s && Pi(s) && s.__parent !== i.__parent) o += i.getTextContentSize();
						else {
							const e = oe$3.get(r), n = e && e.__lexicalTextContent;
							"string" != typeof n && t(346, i.getType()), o += n.length;
						}
						e < n - 1 && !i.isInline() && (o += 2);
					} else {
						const e = i[Kt$2];
						void 0 === e && t(347, i.getType(), r), o += e;
					}
					r = i.__next;
				}
				return o;
			}, { editor: $t$2 });
		}
		function Bt$3(t) {
			Pi(t) || void 0 === t[Kt$2] && (t[Kt$2] = Xo(t) ? t.__text.length : t.getTextContentSize());
		}
		const Rt$1 = 4;
		let Wt$2, $t$2, Ut$2, Ht$2 = "", jt$2 = null, Jt$2 = null, Vt$2 = null;
		function qt$2() {
			return {
				firstTextKey: Vt$2,
				format: jt$2,
				style: Jt$2
			};
		}
		function Yt$2(t) {
			null !== t.firstTextKey && (jt$2 = t.format, Jt$2 = t.style, Vt$2 = t.firstTextKey);
		}
		function Gt$2(e) {
			if (null !== Vt$2) return;
			const n = e.__lexicalFirstTextKey;
			if (void 0 === n && t(348), null === n) return;
			const o = ne$3.get(n);
			Xo(o) && (jt$2 = o.getFormat(), Jt$2 = o.getStyle(), Vt$2 = n);
		}
		let Xt$2, Qt$2, Zt$2, te$3, ee$3, ne$3, oe$3, re$2, ie$2, se$2, le$2 = !1, ce$2 = !1;
		function ae$2(t, e) {
			const n = te$3.get(t), o = ne$3.has(t);
			if (null !== e) {
				const n = Fe$2(t);
				n.parentNode === e && e.removeChild(n);
			}
			if (!o) {
				if ($t$2._keyToDOMMap.delete(t), Pi(n)) {
					const t = Yc(n, te$3);
					ue$1(t, 0, t.length - 1, null);
				}
				if (void 0 !== n) {
					for (const t of xe$1(n).values()) {
						const e = Se$1(t);
						ae$2(t, null), null !== e && e.remove();
					}
					Sl(ie$2, Ut$2, Xt$2, n, "destroyed");
				}
			}
		}
		function ue$1(t, e, n, o) {
			for (let r = e; r <= n; ++r) {
				const e = t[r];
				void 0 !== e && ae$2(e, o);
			}
		}
		function fe$1(t, e) {
			t.setProperty("text-align", e);
		}
		const de$1 = "40px";
		function he(t, e) {
			const n = Wt$2.theme.indent;
			if ("string" == typeof n) {
				const o = t.classList.contains(n);
				e > 0 && !o ? t.classList.add(n) : e < 1 && o && t.classList.remove(n);
			}
			t.style.setProperty("padding-inline-start", 0 === e ? "" : `calc(${e} * var(--lexical-indent-base-value, ${de$1}))`);
		}
		function ge$1(t, e) {
			const n = t.style;
			0 === e ? fe$1(n, "") : 1 === e ? fe$1(n, "left") : 2 === e ? fe$1(n, "center") : 3 === e ? fe$1(n, "right") : 4 === e ? fe$1(n, "justify") : 5 === e ? fe$1(n, "start") : 6 === e && fe$1(n, "end");
		}
		function _e$2(t, e) {
			const n = function(t) {
				const e = t.__dir;
				if (null !== e) return e;
				if (Bi(t)) return null;
				const n = t.getParent();
				return null === n || Bl(n) && null === n.__dir ? "auto" : null;
			}(e);
			null !== n ? t.dir = n : t.removeAttribute("dir");
		}
		function pe$1(t) {
			const e = Zl().createElement("div");
			return e.setAttribute("data-lexical-slot", t), e.style.display = "none", e;
		}
		function ye$1(t, e, n) {
			e || "false" === t.contentEditable ? Bc(n, $t$2) : n.removeAttribute("contenteditable");
		}
		function me$2(t, e, n) {
			const o = Ht$2, r = qt$2();
			Ht$2 = "";
			let i = "";
			const s = Ki(t);
			for (const [o, r] of n) {
				const n = pe$1(o);
				ye$1(e, s, n), e.appendChild(n), Ht$2 = "";
				const l = qt$2();
				Te$2(r, kc(t, n, $t$2)), Yt$2(l), Ce$2(t, o, e, n), i += Ht$2;
			}
			return Yt$2(r), Ht$2 = o, i;
		}
		function xe$1(t) {
			return Qc(t) && null !== t.__slots ? t.__slots : Xc;
		}
		function Ce$2(t, e, n, o) {
			const r = se$2.$getSlotTargetElement(t, e, n, $t$2);
			null !== r && (o.parentElement !== r && r.appendChild(o), o.style.display = "");
		}
		function Se$1(t) {
			const e = oe$3.get(t);
			return void 0 !== e ? e.parentElement : null;
		}
		function ve$2(t, e, n) {
			const o = xe$1(t), r = xe$1(e);
			for (const [t, e] of o) if (!r.has(t)) {
				const t = Se$1(e);
				ae$2(e, null), null !== t && t.remove();
			}
			const i = Ht$2, s = qt$2();
			let l = "", c = null;
			const a = Ki(e);
			for (const [t, i] of r) {
				const r = o.get(t);
				let s = void 0 !== r ? Se$1(r) : null;
				Ht$2 = "";
				const u = qt$2();
				if (null === s) {
					s = pe$1(t);
					let o = null;
					for (const t of n.children) if (!t.hasAttribute("data-lexical-slot")) {
						o = t;
						break;
					}
					n.insertBefore(s, o), Te$2(i, kc(e, s, $t$2));
				} else r === i ? we$1(i, s) : (void 0 !== r && ae$2(r, s), Te$2(i, kc(e, s, $t$2)));
				if (Yt$2(u), ye$1(n, a, s), Ce$2(e, t, n, s), l += Ht$2, s.parentElement === n) {
					const t = null === c ? n.firstChild : c.nextSibling;
					t !== s && n.insertBefore(s, t), c = s;
				}
			}
			return Yt$2(s), Ht$2 = i, l;
		}
		function Te$2(e, n) {
			const o = ne$3.get(e);
			if (void 0 === o && t(60), null !== n) {
				const t = te$3.get(e);
				if (void 0 !== t) {
					const r = oe$3.get(e);
					if (void 0 !== r) {
						const i = Zc(t) ? t.__slotHost : null, s = Zc(o) ? o.__slotHost : null, l = t.__parent !== o.__parent || i !== s, c = null !== s && r.parentElement !== n.element;
						if (l || c) return n.insertChild(r), we$1(e, n.element);
					}
				}
			}
			const r = se$2.$createDOM(o, $t$2);
			if (function(t, e, n) {
				const o = n._keyToDOMMap;
				Xs(e, n, t), o.set(t, e);
			}(e, r, $t$2), Xo(o) ? r.setAttribute("data-lexical-text", "true") : Ki(o) && (r.setAttribute("data-lexical-decorator", "true"), Kc(r, { captureSelection: !0 })), Pi(o)) {
				const t = o.__indent, e = o.__size;
				_e$2(r, o), 0 !== t && he(r, t);
				const n = xe$1(o), i = n.size > 0 ? me$2(o, r, n) : "";
				if (0 === e) r.__lexicalTextContent = i, r.__lexicalFirstTextKey = null, Ht$2 += i, n.size > 0 && (r.__lexicalSlotTextLength = i.length);
				else {
					const t = Ht$2, s = e - 1;
					if (ke$2(Yc(o, ne$3), o, 0, s, kc(o, r, $t$2)), "" !== i) {
						const e = r.__lexicalTextContent || "";
						r.__lexicalTextContent = i + e, Ht$2 = t + i + e;
					}
					n.size > 0 && (r.__lexicalSlotTextLength = i.length);
				}
				const s = o.__format;
				0 !== s && ge$1(r, s), o.isInline() || be$1(null, o, r);
			} else {
				const t = o.getTextContent();
				if (Ki(o)) {
					const t = o.decorate($t$2, Wt$2);
					null !== t && Oe$1(e, t), r.contentEditable = "false";
					const n = xe$1(o);
					n.size > 0 && me$2(o, r, n);
				}
				Ht$2 += t;
			}
			return null !== n && n.insertChild(r), se$2.$decorateDOM(o, null, r, $t$2), Bt$3(o), Sl(ie$2, Ut$2, Xt$2, o, "created"), r;
		}
		function ke$2(e, n, o, r, i) {
			const s = Ht$2, l = qt$2();
			Ht$2 = "", jt$2 = null, Jt$2 = null, Vt$2 = null;
			let c = o;
			for (; c <= r; ++c) {
				const t = qt$2();
				Te$2(e[c], i);
				const n = ne$3.get(e[c]);
				null !== n && Xo(n) ? null === jt$2 && (jt$2 = n.getFormat(), Jt$2 = n.getStyle(), Vt$2 = n.__key) : Pi(n) && c < r && !n.isInline() && (Ht$2 += D$1), Yt$2(t);
			}
			const a = $t$2._keyToDOMMap.get(n.__key);
			void 0 === a && t(349, n.__key), a.__lexicalTextContent = Ht$2, a.__lexicalFirstTextKey = Vt$2, Ht$2 = s + Ht$2, Yt$2(l);
		}
		function be$1(t, e, n) {
			const o = kc(e, n, $t$2), r = o.element.__lexicalLastChildKind ?? null, i = function(t, e) {
				if (t) {
					const n = t.__last;
					if (n) {
						const t = e.get(n);
						if (t) return Yi(t) ? "line-break" : Ki(t) && t.isInline() ? "decorator" : null;
					}
					return xe$1(t).size > 0 ? null : "empty";
				}
				return null;
			}(e, ne$3);
			r !== i && o.setManagedLineBreak(i);
		}
		function Ne$1(e, n, o) {
			var r;
			jt$2 = null, Jt$2 = null, Vt$2 = null, function(e, n, o) {
				const r = Ht$2, i = e.__size, s = n.__size;
				Ht$2 = "";
				const l = o.element, c = $t$2._keyToDOMMap.get(n.__key);
				void 0 === c && t(351, n.__key);
				const a = s - i;
				if (!le$2 && Math.abs(a) <= 1 && i >= Rt$1 && e.__first === n.__first && (0 !== a || !$t$2._cloneNotNeeded.has(e.__key))) {
					const i = c.__lexicalTextContent, u = re$2.get(e.__key);
					if (!le$2 && "string" == typeof i && void 0 !== u) {
						const s = function(t, e) {
							const n = e.size;
							if (0 === n || n >= t.__size) return null;
							let o = t.__last, r = null, i = 0;
							for (; null !== o && i < n;) {
								if (!e.has(o)) return null;
								r = o;
								const t = ne$3.get(o);
								if (void 0 === t) return null;
								o = t.__prev, i++;
							}
							if (i !== n) return null;
							if (null !== o && e.has(o)) return null;
							return r;
						}(n, u);
						if (null !== s) {
							const f = u.size;
							if (0 === a) {
								const e = zt$2(s, f);
								let o = s, a = 0;
								for (; null !== o && a < f;) {
									const t = ne$3.get(o);
									if (void 0 === t) break;
									const e = qt$2();
									we$1(o, l), Xo(t) && null === jt$2 && (jt$2 = t.getFormat(), Jt$2 = t.getStyle(), Vt$2 = t.__key), Yt$2(e), o = t.__next, a++;
								}
								let d = "";
								for (o = s, a = 0; null !== o && a < f;) {
									const e = ne$3.get(o);
									if (void 0 === e) break;
									let n;
									if (Pi(e)) {
										const r = $t$2._keyToDOMMap.get(o), i = r && r.__lexicalTextContent;
										"string" != typeof i && t(352, e.getType()), n = i;
									} else n = e.getTextContent();
									d += n, a < f - 1 && Pi(e) && !e.isInline() && (d += D$1), o = e.__next, a++;
								}
								const h = c.__lexicalSlotTextLength || 0, g = h > 0 ? i.slice(h) : i, _ = g.slice(0, g.length - e) + d;
								c.__lexicalTextContent = _, Ht$2 = r + _, Ee$1(n, c, u);
								return;
							}
							if (function(e, n, o, r, i, s, l, c) {
								if (1 !== c && -1 !== c) return !1;
								if (l !== (1 === c ? 2 : 1)) return !1;
								const u = l - c;
								let f = e.__last;
								for (let t = 0; t < u - 1; t++) {
									if (null === f) return !1;
									const t = te$3.get(f);
									if (void 0 === t) return !1;
									f = t.__prev;
								}
								if (null === f) return !1;
								const d = ne$3.get(s), h = te$3.get(f);
								if (void 0 === d || void 0 === h) return !1;
								if (d.__prev !== h.__prev) return !1;
								const g = [];
								let _ = s;
								for (let t = 0; t < l; t++) {
									if (null === _) return !1;
									g.push(_);
									const t = ne$3.get(_);
									_ = t ? t.__next : null;
								}
								const p = [];
								_ = f;
								for (let t = 0; t < u; t++) {
									if (null === _) return !1;
									p.push(_);
									const t = te$3.get(_);
									_ = t ? t.__next : null;
								}
								const y = new Set(p), m = new Set(g), x = [];
								let C = 0, S = 0;
								for (; C < u && S < l;) if (g[S] === p[C]) x.push({
									key: g[S],
									kind: "reconcile"
								}), C++, S++;
								else if (m.has(p[C])) {
									if (y.has(g[S])) return !1;
									x.push({
										key: g[S],
										kind: "create",
										nextIndex: S
									}), S++;
								} else x.push({
									key: p[C],
									kind: "destroy"
								}), C++;
								for (; C < u;) x.push({
									key: p[C++],
									kind: "destroy"
								});
								for (; S < l;) x.push({
									key: g[S],
									kind: "create",
									nextIndex: S
								}), S++;
								const v = zt$2(f, u);
								for (const t of x) {
									const e = qt$2();
									if ("reconcile" === t.kind) we$1(t.key, o.element);
									else if ("destroy" === t.kind) ae$2(t.key, o.element);
									else {
										let e = null;
										for (let n = t.nextIndex + 1; n < l; n++) {
											const t = $t$2._keyToDOMMap.get(g[n]);
											if (void 0 !== t) {
												e = t;
												break;
											}
										}
										Te$2(t.key, o.withBefore(e ?? o.before));
									}
									if ("destroy" !== t.kind) {
										const e = ne$3.get(t.key);
										e && Xo(e) && null === jt$2 && (jt$2 = e.getFormat(), Jt$2 = e.getStyle(), Vt$2 = e.__key);
									}
									Yt$2(e);
								}
								let T = "";
								for (let e = 0; e < l; e++) {
									const n = ne$3.get(g[e]);
									if (void 0 === n) return !1;
									let o;
									if (Pi(n)) {
										const r = $t$2._keyToDOMMap.get(g[e]), i = r && r.__lexicalTextContent;
										"string" != typeof i && t(350, n.getType()), o = i;
									} else o = n.getTextContent();
									T += o, e < l - 1 && Pi(n) && !n.isInline() && (T += D$1);
								}
								const k = r.__lexicalSlotTextLength || 0, b = k > 0 ? i.slice(k) : i;
								return r.__lexicalTextContent = b.slice(0, b.length - v) + T, !0;
							}(e, 0, o, c, i, s, f, a)) {
								const e = c.__lexicalTextContent;
								"string" != typeof e && t(353), Ht$2 = r + e, Ee$1(n, c, u);
								return;
							}
						}
					}
					if (0 === a) {
						let n = e.__first, o = 0;
						for (; null !== n;) {
							const e = ne$3.get(n);
							if (void 0 === e) break;
							const r = le$2 || Zt$2.has(n) || Qt$2.has(n), i = qt$2();
							if (r) we$1(n, l);
							else {
								let o, r;
								if (Pi(e)) {
									r = oe$3.get(n);
									const i = r && r.__lexicalTextContent;
									"string" != typeof i && t(354, e.getType()), o = i;
								} else o = e.getTextContent();
								Ht$2 += o, void 0 !== r && Gt$2(r);
							}
							Xo(e) ? null === jt$2 && (jt$2 = e.getFormat(), Jt$2 = e.getStyle(), Vt$2 = e.__key) : Pi(e) && o < s - 1 && !e.isInline() && (Ht$2 += D$1), Yt$2(i), n = e.__next, o++;
						}
						c.__lexicalTextContent = Ht$2, c.__lexicalFirstTextKey = Vt$2, Ht$2 = r + Ht$2;
						return;
					}
				}
				if (1 === i && 1 === s) {
					const t = e.__first, r = n.__first;
					if (t === r) we$1(t, l);
					else {
						const e = Fe$2(t), n = Te$2(r, null);
						try {
							e.parentNode === l ? l.replaceChild(n, e) : o.insertChild(n);
						} catch (o) {
							if ("object" == typeof o && null != o) {
								const i = `${o.toString()} Parent: ${l.tagName}, new child: {tag: ${n.tagName} key: ${r}}, old child: {tag: ${e.tagName}, key: ${t}}.`;
								throw new Error(i);
							}
							throw o;
						}
						ae$2(t, null);
					}
					const i = ne$3.get(r);
					Xo(i) && null === jt$2 && (jt$2 = i.getFormat(), Jt$2 = i.getStyle(), Vt$2 = i.__key);
				} else {
					const r = Yc(e, te$3), c = Yc(n, ne$3);
					if (r.length !== i && t(227), c.length !== s && t(228), 0 === i) 0 !== s && ke$2(c, n, 0, s - 1, o);
					else if (0 === s) {
						if (0 !== i) {
							const t = null == o.after && null == o.before && 0 === xe$1(n).size && null == o.element.__lexicalLineBreak;
							ue$1(r, 0, i - 1, t ? null : l), t && (l.textContent = "");
						}
					} else (function(t, e, n, o, r, i) {
						const s = o - 1, l = r - 1;
						let c, a, u = i.getFirstChild(), f = 0, d = 0;
						for (; f <= s && d <= l;) {
							const t = e[f], o = n[d], r = qt$2();
							if (t === o) u = Me$2(we$1(o, i.element)), f++, d++;
							else {
								if (void 0 === a && (a = Ae$2(n, d)), void 0 === c) c = Ae$2(e, f);
								else if (!c.has(t)) {
									f++, Yt$2(r);
									continue;
								}
								if (!a.has(t)) {
									u = Me$2(Fe$2(t)), ae$2(t, i.element), f++, c.delete(t), Yt$2(r);
									continue;
								}
								if (c.has(o)) {
									const t = El($t$2, o);
									t !== u && i.withBefore(u ?? i.before).insertChild(t), u = Me$2(we$1(o, i.element)), f++, d++;
								} else Te$2(o, i.withBefore(u ?? i.before)), d++;
							}
							const s = ne$3.get(o);
							null !== s && Xo(s) ? null === jt$2 && (jt$2 = s.getFormat(), Jt$2 = s.getStyle(), Vt$2 = s.__key) : Pi(s) && d <= l && !s.isInline() && (Ht$2 += D$1), Yt$2(r);
						}
						const h = f > s, g = d > l;
						if (h && !g) {
							const e = n[l + 1], o = void 0 === e ? null : $t$2.getElementByKey(e);
							ke$2(n, t, d, l, i.withBefore(o ?? i.before));
						} else g && !h && ue$1(e, f, s, i.element);
					})(n, r, c, i, s, o);
				}
				c.__lexicalTextContent = Ht$2, c.__lexicalFirstTextKey = Vt$2, Ht$2 = r + Ht$2;
			}(e, n, kc(n, o, $t$2)), Bl(n) || (r = n, null == jt$2 || jt$2 === r.__textFormat || ce$2 || r.setTextFormat(jt$2), function(t) {
				null == Jt$2 || Jt$2 === t.__textStyle || ce$2 || t.setTextStyle(Jt$2);
			}(n));
		}
		function Ee$1(t, e, n) {
			const o = e.__lexicalFirstTextKey;
			if (null != o) {
				const e = t.__key;
				let r = o;
				for (; null !== r;) {
					const t = ne$3.get(r);
					if (void 0 === t) {
						r = null;
						break;
					}
					if (t.__parent === e) break;
					r = t.__parent;
				}
				if (null !== r && !n.has(r)) {
					const t = ne$3.get(o);
					if (Xo(t)) return jt$2 = t.getFormat(), void (Jt$2 = t.getStyle());
				}
			}
			e.__lexicalFirstTextKey = Vt$2;
		}
		function we$1(e, n) {
			const o = te$3.get(e);
			let r = ne$3.get(e);
			void 0 !== o && void 0 !== r || t(61);
			const i = le$2 || Zt$2.has(e) || Qt$2.has(e), s = El($t$2, e);
			if (o === r && !i) {
				let e;
				if (Pi(o)) {
					const n = s.__lexicalTextContent;
					"string" != typeof n && t(355, o.getType()), e = n, Gt$2(s);
				} else e = o.getTextContent();
				return Ht$2 += e, s;
			}
			if (o !== r && i && Sl(ie$2, Ut$2, Xt$2, r, "updated"), se$2.$updateDOM(r, o, s, $t$2)) {
				const o = Te$2(e, null);
				return null === n && t(62), n.replaceChild(o, s), ae$2(e, null), o;
			}
			if (Pi(o)) {
				Pi(r) || t(334, e);
				const n = r.__indent;
				(le$2 || n !== o.__indent) && he(s, n);
				const l = r.__format;
				(le$2 || l !== o.__format) && ge$1(s, l);
				const c = i && (xe$1(r).size > 0 || xe$1(o).size > 0) ? ve$2(o, r, s) : "";
				if (i) {
					const t = Ht$2;
					if (Ne$1(o, r, s), Bi(r) || r.isInline() || be$1(0, r, s), "" !== c) {
						const e = s.__lexicalTextContent || "";
						s.__lexicalTextContent = c + e, Ht$2 = t + c + e, s.__lexicalSlotTextLength = c.length;
					} else (xe$1(r).size > 0 || xe$1(o).size > 0) && (s.__lexicalSlotTextLength = 0);
				} else {
					const e = s.__lexicalTextContent;
					"string" != typeof e && t(356, o.getType()), Ht$2 += e, Gt$2(s);
				}
				if ((le$2 || r.__dir !== o.__dir || r.__parent !== o.__parent) && (_e$2(s, r), Bi(r) && !le$2)) {
					for (const t of r.getChildren()) if (Pi(t)) _e$2(El($t$2, t.getKey()), t);
				}
			} else {
				const t = r.getTextContent();
				if (Ki(r)) {
					const t = r.decorate($t$2, Wt$2);
					null !== t && Oe$1(e, t), i && (xe$1(r).size > 0 || xe$1(o).size > 0) && ve$2(o, r, s);
				}
				Ht$2 += t;
			}
			if (!ce$2 && Bi(r)) {
				const t = r.getLatest();
				if (t.__cachedText !== Ht$2) {
					const e = t.getWritable();
					e.__cachedText = Ht$2, r = e;
				}
			}
			return se$2.$decorateDOM(r, o, s, $t$2), Bt$3(r), s;
		}
		function Oe$1(t, e) {
			let n = $t$2._pendingDecorators;
			const o = $t$2._decorators;
			if (null === n) {
				if (o[t] === e) return;
				n = tl($t$2);
			}
			n[t] = e;
		}
		function Me$2(t) {
			let e = t.nextSibling;
			return null !== e && e === $t$2._blockCursorElement && (e = e.nextSibling), e;
		}
		function Ae$2(t, e) {
			const n = /* @__PURE__ */ new Set();
			for (let o = e; o < t.length; o++) n.add(t[o]);
			return n;
		}
		function De$2(t, e, n, o, r, i) {
			Ht$2 = "", jt$2 = null, Jt$2 = null, Vt$2 = null, le$2 = 2 === o, $t$2 = n, Wt$2 = n._config, se$2 = n._config.dom || ps, Ut$2 = n._nodes, Xt$2 = $t$2._listeners.mutation, Qt$2 = r, Zt$2 = i, te$3 = t._nodeMap, ee$3 = t, ne$3 = e._nodeMap, ce$2 = e._readOnly, oe$3 = nt$2(n._keyToDOMMap), re$2 = function() {
				const t = /* @__PURE__ */ new Map(), e = (e) => {
					for (const n of e) {
						const e = ne$3.get(n);
						if (void 0 === e) continue;
						const o = e.__parent;
						if (null === o) continue;
						let r = t.get(o);
						void 0 === r && (r = /* @__PURE__ */ new Set(), t.set(o, r)), r.add(n);
					}
				};
				return e(Qt$2.keys()), e(Zt$2), t;
			}();
			const s = /* @__PURE__ */ new Map();
			return ie$2 = s, we$1("root", null), $t$2 = void 0, Ut$2 = void 0, Qt$2 = void 0, Zt$2 = void 0, te$3 = void 0, ee$3 = void 0, ne$3 = void 0, Wt$2 = void 0, oe$3 = void 0, re$2 = void 0, ie$2 = void 0, se$2 = ps, s;
		}
		function Fe$2(e) {
			const n = oe$3.get(e);
			return void 0 === n && t(75, e), n;
		}
		function Pe$2(t) {
			return { type: t };
		}
		const Ie$2 = /* @__PURE__ */ Pe$2("SELECTION_CHANGE_COMMAND"), Ke$2 = /* @__PURE__ */ Pe$2("CLICK_COMMAND"), ze$2 = /* @__PURE__ */ Pe$2("BEFORE_INPUT_COMMAND"), Be$2 = /* @__PURE__ */ Pe$2("INPUT_COMMAND"), Re = /* @__PURE__ */ Pe$2("COMPOSITION_START_COMMAND"), We$2 = /* @__PURE__ */ Pe$2("COMPOSITION_END_COMMAND"), $e$2 = /* @__PURE__ */ Pe$2("DELETE_CHARACTER_COMMAND"), Ue$2 = /* @__PURE__ */ Pe$2("INSERT_LINE_BREAK_COMMAND"), He$2 = /* @__PURE__ */ Pe$2("INSERT_PARAGRAPH_COMMAND"), je$2 = /* @__PURE__ */ Pe$2("CONTROLLED_TEXT_INSERTION_COMMAND"), Je$2 = /* @__PURE__ */ Pe$2("PASTE_COMMAND"), Ve$2 = /* @__PURE__ */ Pe$2("REMOVE_TEXT_COMMAND"), qe$2 = /* @__PURE__ */ Pe$2("DELETE_WORD_COMMAND"), Ye$1 = /* @__PURE__ */ Pe$2("DELETE_LINE_COMMAND"), Ge$2 = /* @__PURE__ */ Pe$2("FORMAT_TEXT_COMMAND"), Qe$2 = /* @__PURE__ */ Pe$2("UNDO_COMMAND"), Ze$2 = /* @__PURE__ */ Pe$2("REDO_COMMAND"), tn$2 = /* @__PURE__ */ Pe$2("KEYDOWN_COMMAND"), en$3 = /* @__PURE__ */ Pe$2("KEY_ARROW_RIGHT_COMMAND"), nn$2 = /* @__PURE__ */ Pe$2("MOVE_TO_END"), on$1 = /* @__PURE__ */ Pe$2("KEY_ARROW_LEFT_COMMAND"), rn$1 = /* @__PURE__ */ Pe$2("MOVE_TO_START"), sn$2 = /* @__PURE__ */ Pe$2("KEY_ARROW_UP_COMMAND"), ln$2 = /* @__PURE__ */ Pe$2("KEY_ARROW_DOWN_COMMAND"), cn$1 = /* @__PURE__ */ Pe$2("KEY_ENTER_COMMAND"), an$1 = /* @__PURE__ */ Pe$2("KEY_SPACE_COMMAND"), un$2 = /* @__PURE__ */ Pe$2("KEY_BACKSPACE_COMMAND"), fn$1 = /* @__PURE__ */ Pe$2("KEY_ESCAPE_COMMAND"), dn$1 = /* @__PURE__ */ Pe$2("KEY_DELETE_COMMAND"), hn$2 = /* @__PURE__ */ Pe$2("KEY_TAB_COMMAND"), yn$1 = /* @__PURE__ */ Pe$2("DROP_COMMAND"), xn$1 = /* @__PURE__ */ Pe$2("DRAGSTART_COMMAND"), Cn$1 = /* @__PURE__ */ Pe$2("DRAGOVER_COMMAND"), Sn$2 = /* @__PURE__ */ Pe$2("DRAGEND_COMMAND"), vn$2 = /* @__PURE__ */ Pe$2("COPY_COMMAND"), Tn = /* @__PURE__ */ Pe$2("CUT_COMMAND"), kn = /* @__PURE__ */ Pe$2("SELECT_ALL_COMMAND"), bn$2 = /* @__PURE__ */ Pe$2("CLEAR_EDITOR_COMMAND"), Nn$1 = /* @__PURE__ */ Pe$2("CLEAR_HISTORY_COMMAND"), En = /* @__PURE__ */ Pe$2("CAN_REDO_COMMAND"), wn$1 = /* @__PURE__ */ Pe$2("CAN_UNDO_COMMAND"), On$1 = /* @__PURE__ */ Pe$2("FOCUS_COMMAND"), Mn$1 = /* @__PURE__ */ Pe$2("BLUR_COMMAND"), An = /* @__PURE__ */ Pe$2("KEY_MODIFIER_COMMAND");
		function Dn$1(t) {
			const e = /* @__PURE__ */ new Map();
			return {
				dispose() {
					for (const t of e.values()) t.dispose();
					e.clear();
				},
				register(n, o) {
					let r = e.get(n);
					void 0 === r && (r = {
						dispose: t(n, o),
						holders: /* @__PURE__ */ new Set()
					}, e.set(n, r));
					const i = () => {
						const t = e.get(n);
						t && t.holders.delete(i) && 0 === t.holders.size && (e.delete(n), t.dispose());
					};
					return r.holders.add(i), i;
				}
			};
		}
		function Fn(t, e, n, o) {
			return t.addEventListener(e, n, o), t.removeEventListener.bind(t, e, n, o);
		}
		const Pn = Object.freeze({}), In = [
			["keydown", function(t, e) {
				const n = e._inputState;
				n.lastKeyDownTimeStamp = t.timeStamp, n.lastKeyCode = t.key, "Backspace" !== t.key && Jn(n);
				if (e.isComposing()) return;
				Nl(e, tn$2, t);
			}],
			["pointerdown", function(t, e) {
				const n = ac(t), o = t.pointerType;
				_c(n) && "touch" !== o && "pen" !== o && 0 === t.button && Ai(e, () => {
					Rc(n, e) || (e._inputState.isSelectionChangeFromMouseDown = !0);
				});
			}],
			["compositionstart", function(t, e) {
				Nl(e, Re, t);
			}],
			["compositionend", function(t, e) {
				const n = e._inputState;
				i ? n.compositionPhase = "ending-firefox" : l || !a && !d$1 ? Nl(e, We$2, t) : (n.compositionPhase = "ending-safari", n.compositionEndData = t.data);
			}],
			["input", function(t, e) {
				t.stopPropagation();
				const n = e._inputState;
				Jn(n), Ai(e, () => {
					qn(t, e) || e.dispatchCommand(Be$2, t);
				}, { event: t }), n.unprocessedBeforeInputData = null;
			}],
			["click", function(t, e) {
				Ai(e, () => {
					const n = Kr(), o = Jl(Il(e)), r = zr();
					if (o) {
						if (ur(n)) {
							const t = n.anchor, e = t.getNode();
							"element" === t.type && 0 === t.offset && n.isCollapsed() && !Bi(e) && 1 === nl().getChildrenSize() && e.getTopLevelElementOrThrow().isEmpty() && null !== r && n.is(r) && (o.removeAllRanges(), n.dirty = !0);
						} else if ("touch" === t.pointerType || "pen" === t.pointerType) {
							const n = nc(o, e._rootElement).anchorNode;
							if (gc(n) || zs(n)) ol(Lr(r, o, e, t));
						}
					}
					if (i && null !== o && 0 === o.rangeCount) {
						const n = e._rootElement;
						if (null !== n && t.target === n) {
							const i = t.clientY;
							let s = n.childNodes.length;
							for (let t = 0; t < n.childNodes.length; t++) {
								const e = n.childNodes[t];
								if (gc(e)) {
									const n = e.getBoundingClientRect();
									if (i <= (n.top + n.bottom) / 2) {
										s = t;
										break;
									}
								}
							}
							o.setBaseAndExtent(n, s, n, s);
							const l = Lr(r, o, e, t);
							null !== l ? ol(l) : o.removeAllRanges();
						}
					}
					Nl(e, Ke$2, t);
				});
			}],
			["cut", Pn],
			["copy", Pn],
			["dragstart", Pn],
			["dragover", Pn],
			["dragend", Pn],
			["paste", Pn],
			["focus", Pn],
			["blur", Pn],
			["drop", Pn]
		];
		s && In.push(["beforeinput", (t, e) => function(t, e) {
			const n = t.inputType;
			if ("deleteCompositionText" === n || i && bl(e)) return;
			if ("insertCompositionText" === n) return;
			Ai(e, () => {
				qn(t, e) || Nl(e, ze$2, t);
			}, { event: t });
		}(t, e)]);
		const Ln = /* @__PURE__ */ new WeakMap(), Kn = /* @__PURE__ */ new WeakMap(), zn = Dn$1((t) => (t.addEventListener("selectionchange", ro), () => t.removeEventListener("selectionchange", ro)));
		function Bn(t, e, n, o, r, i) {
			const l = t.anchor, c = t.focus, a = l.getNode(), u = _i();
			let f;
			if (void 0 !== i) f = i;
			else {
				const t = Jl(Il(u));
				f = null !== t ? nc(t, u._rootElement) : null;
			}
			const d = null !== f ? f.anchorNode : null, h = l.key, g = u.getElementByKey(h), _ = n.length;
			return h !== c.key || !Xo(a) || (!r && (!s || u._inputState.lastBeforeInputInsertTextTimeStamp < o + 50) || a.isDirty() && _ < 2 || sl(n)) && l.offset !== c.offset && !a.isComposing() || Ks(a) || a.isDirty() && _ > 1 || (r || !s) && null !== g && !a.isComposing() && d !== wc(a, g, u) || null !== f && null !== e && (!e.collapsed || e.startContainer !== f.anchorNode || e.startOffset !== f.anchorOffset) || !a.isComposing() && (a.getFormat() !== t.format || a.getStyle() !== t.style) || function(t, e) {
				if (e.isSegmented()) return !0;
				if (!t.isCollapsed()) return !1;
				const n = t.anchor.offset, o = e.getParentOrThrow(), r = Ls(e);
				return 0 === n ? !e.canInsertTextBefore() || !o.canInsertTextBefore() && !e.isComposing() || r || function(t) {
					const e = t.getPreviousSibling();
					return (Xo(e) || Pi(e) && e.isInline()) && !e.canInsertTextAfter();
				}(e) : n === e.getTextContentSize() && (!e.canInsertTextAfter() || !o.canInsertTextAfter() && !e.isComposing() || r);
			}(t, a);
		}
		function Rn(t, e) {
			return zs(t) && null !== t.nodeValue && 0 !== e && e !== t.nodeValue.length;
		}
		function Wn(e, n, o) {
			const { anchorNode: r, anchorOffset: i, focusNode: s, focusOffset: l } = nc(e, n._rootElement), c = n._inputState;
			c.isSelectionChangeFromDOMUpdate && (c.isSelectionChangeFromDOMUpdate = !1, Rn(r, i) && Rn(s, l) && !c.postDeleteSelectionToRestore) || Ai(n, () => {
				if (!o) return void ol(null);
				if (!As(n, r, s)) return;
				let a = Kr();
				if (c.postDeleteSelectionToRestore && ur(a) && a.isCollapsed()) {
					const t = a.anchor, e = c.postDeleteSelectionToRestore.anchor;
					(t.key === e.key && t.offset === e.offset + 1 || 1 === t.offset && e.getNode().is(t.getNode().getPreviousSibling())) && (a = c.postDeleteSelectionToRestore.clone(), ol(a));
				}
				if (c.postDeleteSelectionToRestore = null, ur(a)) {
					const o = a.anchor, u = o.getNode();
					if (a.isCollapsed()) {
						"Range" === e.type && r === s && (a.dirty = !0);
						const i = Il(n).event, l = i ? i.timeStamp : performance.now(), { format: f, style: d, offset: h, key: g, timeStamp: _ } = c.collapsedSelectionFormat, p = nl(), y = !1 === n.isComposing() && "" === p.getTextContent();
						if (l < _ + 200 && o.offset === h && o.key === g) $n$1(a, f, d);
						else if ("text" === o.type) Xo(u) || t(141), Un(a, u);
						else if ("element" === o.type && !y) {
							Pi(u) || t(259);
							const e = o.getNode();
							e.isEmpty() ? function(t, e) {
								$n$1(t, e.getTextFormat(), e.getTextStyle());
							}(a, e) : $n$1(a, a.format, "");
						}
					} else {
						const t = o.key, e = a.focus.key, n = a.getNodes(), r = n.length, s = a.isBackward(), c = s ? l : i, u = s ? i : l, f = s ? e : t, d = s ? t : e;
						let h = 2047, g = !1;
						for (let t = 0; t < r; t++) {
							const e = n[t], o = e.getTextContentSize();
							if (Xo(e) && 0 !== o && !(0 === t && e.__key === f && c === o || t === r - 1 && e.__key === d && 0 === u) && (g = !0, h &= e.getFormat(), 0 === h)) break;
						}
						a.format = g ? h : 0;
					}
				}
				Nl(n, Ie$2);
			});
		}
		function $n$1(t, e, n) {
			t.format === e && t.style === n || (t.format = e, t.style = n, t.dirty = !0);
		}
		function Un(t, e) {
			$n$1(t, e.getFormat(), e.getStyle());
		}
		function Hn(t) {
			if (!t.getTargetRanges) return null;
			const e = t.getTargetRanges();
			return 0 === e.length ? null : e[0];
		}
		function jn(t) {
			const { lastKeyCode: e } = _i()._inputState;
			if (null == t || t.length <= 1 || null == e) return;
			const n = 1 === e.length ? e : "Enter" === e ? "\n" : "Tab" === e ? "	" : null;
			if (!n) return;
			const o = Kr();
			if (!ur(o) || !o.isCollapsed()) return;
			const r = o.anchor.getNode();
			if (!Xo(r)) return;
			const { offset: i } = o.anchor;
			if (r.getTextContentSize() === i) {
				const t = r.getNextSibling();
				if ("\n" === n) {
					if (Yi(t)) t.selectEnd();
					else if (!t) {
						const t = qc(r, Ar), e = t && t.getNextSibling();
						Pi(e) && e.selectStart();
					}
				} else "	" === n ? er(t) && t.selectEnd() : Xo(t) && t.getTextContent()[0] === n && t.select(1, 1);
			} else r.getTextContent()[i] === n && r.select(i + 1, i + 1);
		}
		function Jn(t) {
			t.isInsertTextAfterHandledSelectionCommand = !1, null !== t.handledSelectionCommandTimeoutId && (clearTimeout(t.handledSelectionCommandTimeoutId), t.handledSelectionCommandTimeoutId = null);
		}
		function Vn(t) {
			Jn(t), t.isInsertTextAfterHandledSelectionCommand = !0, t.handledSelectionCommandTimeoutId = setTimeout(() => Jn(t), 0);
		}
		function qn(t, e) {
			const n = ac(t);
			if (gc(n) && Rc(n, e)) return !0;
			const o = e.getRootElement();
			if (null === o) return !1;
			const r = cc(o.ownerDocument);
			return null !== r && o.contains(r) && Rc(r, e);
		}
		function Yn(e) {
			const n = e.inputType, o = Hn(e), r = _i(), i = r._inputState, s = Kr();
			if ("insertText" === n && e.data && i.isInsertTextAfterHandledSelectionCommand) {
				if (Jn(i), e.preventDefault(), ur(s) && !s.isCollapsed()) {
					const t = s.isBackward() ? s.anchor : s.focus;
					s.anchor.set(t.key, t.offset, t.type), s.focus.set(t.key, t.offset, t.type);
				}
				return !0;
			}
			if ("deleteContentBackward" === n) {
				if (null === s) {
					const t = zr();
					if (!ur(t)) return !0;
					ol(t.clone());
				}
				if (ur(s)) {
					const n = s.anchor.key === s.focus.key;
					if (function(t, e) {
						return "MediaLast" === t.lastKeyCode && e < t.lastKeyDownTimeStamp + 30;
					}(i, e.timeStamp) && r.isComposing() && n) {
						if (Vs(null), i.lastKeyDownTimeStamp = 0, setTimeout(() => {
							Ai(r, () => {
								Vs(null);
							});
						}, 30), ur(s)) {
							const e = s.anchor.getNode();
							e.markDirty(), Xo(e) || t(142), Un(s, e);
						}
					} else {
						if (Vs(null), l && null !== o && !o.collapsed && (s.applyDOMRange(o), !s.isCollapsed())) return e.preventDefault(), s.removeText(), !0;
						e.preventDefault();
						const t = s.anchor.getNode(), c = t.getTextContent(), a = t.canInsertTextAfter(), u = 0 === s.anchor.offset && s.focus.offset === c.length;
						let d = f && n && !u && a;
						if (d && s.isCollapsed() && (d = !Ki(kl(s.anchor, !0))), !d) {
							Nl(r, $e$2, !0);
							const t = Kr();
							f && ur(t) && t.isCollapsed() && (i.postDeleteSelectionToRestore = t, setTimeout(() => i.postDeleteSelectionToRestore = null));
						}
					}
					return !0;
				}
			}
			if (!ur(s)) return !0;
			const c = e.data;
			null !== i.unprocessedBeforeInputData && ul(!1, r, i.unprocessedBeforeInputData), s.dirty && null === i.unprocessedBeforeInputData || !s.isCollapsed() || Bi(s.anchor.getNode()) || null === o || s.applyDOMRange(o), i.unprocessedBeforeInputData = null;
			const a = s.anchor, u = s.focus, d = a.getNode(), h = u.getNode();
			if ("insertText" === n || "insertTranspose" === n) {
				if ("\n" === c) e.preventDefault(), Nl(r, Ue$2, !1);
				else if (c === D$1) e.preventDefault(), Nl(r, He$2);
				else if (null == c && e.dataTransfer) {
					const t = e.dataTransfer.getData("text/plain");
					e.preventDefault(), s.insertRawText(t);
				} else null != c && Bn(s, o, c, e.timeStamp, !0) ? (e.preventDefault(), Nl(r, je$2, c), jn(c)) : i.unprocessedBeforeInputData = c;
				return i.lastBeforeInputInsertTextTimeStamp = e.timeStamp, !0;
			}
			switch (e.preventDefault(), n) {
				case "insertFromYank":
				case "insertFromDrop":
				case "insertReplacementText":
					Nl(r, je$2, e);
					jn((e.dataTransfer ? e.dataTransfer.getData("text/plain") : null) ?? e.data);
					break;
				case "insertFromComposition": {
					const t = i.hadOrphanedCompositionEvents;
					i.hadOrphanedCompositionEvents = !1;
					const n = r._compositionKey;
					Vs(null), t || Nl(r, je$2, e), Zn(n);
					break;
				}
				case "insertLineBreak":
					Vs(null), Nl(r, Ue$2, !1);
					break;
				case "insertParagraph":
					Vs(null), i.isInsertLineBreak && !l ? (i.isInsertLineBreak = !1, Nl(r, Ue$2, !1)) : Nl(r, He$2);
					break;
				case "insertFromPaste":
				case "insertFromPasteAsQuotation":
					Nl(r, Je$2, e);
					break;
				case "deleteByComposition":
					(function(t, e) {
						return t !== e || Pi(t) || Pi(e) || !Ls(t) || !Ls(e);
					})(d, h) && Nl(r, Ve$2, e);
					break;
				case "deleteByDrag":
					Al(No), Nl(r, Ve$2, e);
					break;
				case "deleteByCut":
					Nl(r, Ve$2, e);
					break;
				case "deleteContent":
					Nl(r, $e$2, !1);
					break;
				case "deleteWordBackward":
					Nl(r, qe$2, !0);
					break;
				case "deleteWordForward":
					Nl(r, qe$2, !1);
					break;
				case "deleteHardLineBackward":
				case "deleteSoftLineBackward":
					Nl(r, Ye$1, !0);
					break;
				case "deleteContentForward":
				case "deleteHardLineForward":
				case "deleteSoftLineForward":
					Nl(r, Ye$1, !1);
					break;
				case "formatStrikeThrough":
					Nl(r, Ge$2, "strikethrough");
					break;
				case "formatBold":
					Nl(r, Ge$2, "bold");
					break;
				case "formatItalic":
					Nl(r, Ge$2, "italic");
					break;
				case "formatUnderline":
					Nl(r, Ge$2, "underline");
					break;
				case "historyUndo":
					Nl(r, Qe$2);
					break;
				case "historyRedo": Nl(r, Ze$2);
			}
			return !0;
		}
		function Gn(t) {
			const e = _i(), n = e._inputState, o = Kr(), r = t.data, l = Hn(t);
			let c = !1;
			if (null != r && ur(o)) {
				const a = Jl(Il(e)), u = null !== a ? nc(a, e._rootElement) : null, d = "insertCompositionText" === t.inputType && "ending-firefox" !== n.compositionPhase && !e.isComposing();
				d && (n.hadOrphanedCompositionEvents = !0);
				const h = o.anchor.getNode(), g = "insertCompositionText" === t.inputType && "ending-firefox" !== n.compositionPhase && e.isComposing() && Xo(h) && Ks(h);
				if (!d && !g && Bn(o, l, r, t.timeStamp, !1, u)) {
					if (c = !0, "ending-firefox" === n.compositionPhase) {
						const t = to(e, r);
						if (n.compositionPhase = "idle", t) return Al(wo), rl(), !0;
					}
					const l = o.anchor.getNode();
					if (null === a || null === u) return !0;
					const d = o.isBackward(), h = d ? o.anchor.offset : o.focus.offset, g = d ? o.focus.offset : o.anchor.offset;
					s && !o.isCollapsed() && Xo(l) && null !== u.anchorNode && l.getTextContent().slice(0, h) + r + l.getTextContent().slice(h + g) === al(u.anchorNode) || Nl(e, je$2, r);
					const _ = r.length;
					i && _ > 1 && "insertCompositionText" === t.inputType && !e.isComposing() && (o.anchor.offset -= _, o._cachedNodes = null, o._cachedIsBackward = null), f && e.isComposing() && (n.lastKeyDownTimeStamp = 0, Vs(null));
				}
			}
			if (!c) ul(!1, e, null !== r ? r : void 0), "ending-firefox" === n.compositionPhase && (to(e, r || void 0), Al("composition-end"), n.compositionPhase = "idle");
			return rl(), !0;
		}
		function Xn(t) {
			const e = _i(), n = e._inputState, o = Kr();
			if (ur(o) && !e.isComposing()) {
				n.compositionPhase = "composing", n.hadOrphanedCompositionEvents = !1;
				const r = o.anchor, i = o.anchor.getNode();
				if (Vs(r.key), Al("composition-start"), t.timeStamp < n.lastKeyDownTimeStamp + 30 || "element" === r.type || !o.isCollapsed() || !f && (i.getFormat() !== o.format || Xo(i) && i.getStyle() !== o.style) || Xo(i) && (Ks(i) || 0 === r.offset && !i.canInsertTextBefore() || r.offset === i.getTextContentSize() && !i.canInsertTextAfter())) {
					Nl(e, je$2, F);
					const t = Kr();
					ur(t) && Vs(t.anchor.key);
				}
			}
			return !0;
		}
		function Qn(t) {
			const e = _i();
			return e._inputState.compositionPhase = "idle", to(e, t.data), Al(wo), !0;
		}
		function Zn(t) {
			if (null === t) return;
			const e = Ys(t);
			if (!Xo(e) || "text" === e.getType() || Ks(e) || !e.isAttached()) return;
			const n = Kr(), o = ur(n) && n.anchor.key === t ? n.anchor.offset : null, r = Go(e.getTextContent());
			if (r.setFormat(e.getFormat()), r.setStyle(e.getStyle()), e.replace(r), null !== o) {
				const t = Math.min(o, r.getTextContentSize());
				r.select(t, t);
			}
		}
		function to(t, e) {
			const n = t._compositionKey;
			if (Vs(null), null !== n && null != e) {
				if ("" === e) {
					const e = Ys(n), o = t.getElementByKey(n), r = null !== o && Xo(e) ? wc(e, o, t) : null;
					if (null !== r && null !== r.nodeValue && Xo(e)) {
						const n = Jl(Il(t)), o = n && nc(n, t._rootElement);
						let i = null, s = null;
						null !== o && o.anchorNode === r && (i = o.anchorOffset, s = o.focusOffset), fl(e, r.nodeValue, i, s, !0);
					}
					return Zn(n), !1;
				}
				if ("\n" === e[e.length - 1]) {
					const e = Kr();
					if (ur(e) || dr(e)) {
						if (ur(e)) {
							const t = e.focus;
							e.anchor.set(t.key, t.offset, t.type);
						}
						return Nl(t, cn$1, null), Zn(n), !1;
					}
				}
				const o = Ys(n);
				if (null !== o && Xo(o) && Ks(o)) {
					o.markDirty();
					const t = Kr(), r = o.getTextContentSize(), i = ur(t) && t.anchor.key === n ? t.anchor.offset : r;
					return o.select(i, i).insertText(e), !0;
				}
			}
			return ul(!0, t, e), Zn(n), !1;
		}
		function eo(t) {
			const e = _i(), n = e._inputState;
			if (null == t.key) return !0;
			if ("ending-safari" === n.compositionPhase) {
				const o = ml(t);
				if (o && Ai(e, () => {
					to(e, n.compositionEndData);
				}), n.compositionPhase = "idle", n.compositionEndData = "", o) return !0;
			}
			if (function(t) {
				return _l(t, "ArrowRight", { shiftKey: "any" });
			}(t)) Nl(e, en$3, t);
			else if (function(t) {
				return _l(t, "ArrowRight", {
					...pl,
					shiftKey: "any"
				});
			}(t)) Nl(e, nn$2, t);
			else if (function(t) {
				return _l(t, "ArrowLeft", { shiftKey: "any" });
			}(t)) Nl(e, on$1, t);
			else if (function(t) {
				return _l(t, "ArrowLeft", {
					...pl,
					shiftKey: "any"
				});
			}(t)) Nl(e, rn$1, t);
			else if (function(t) {
				return _l(t, "ArrowUp", {
					altKey: "any",
					shiftKey: "any"
				});
			}(t)) Nl(e, sn$2, t);
			else if (function(t) {
				return _l(t, "ArrowDown", {
					altKey: "any",
					shiftKey: "any"
				});
			}(t)) Nl(e, ln$2, t);
			else if (function(t) {
				return _l(t, "Enter", {
					altKey: "any",
					ctrlKey: "any",
					metaKey: "any",
					shiftKey: !0
				});
			}(t)) n.isInsertLineBreak = !0, Nl(e, cn$1, t);
			else if (function(t) {
				return " " === t.key;
			}(t)) Nl(e, an$1, t);
			else if (function(t) {
				return r$1 && _l(t, "o", { ctrlKey: !0 });
			}(t)) t.preventDefault(), n.isInsertLineBreak = !0, Nl(e, Ue$2, !0);
			else if (function(t) {
				return _l(t, "Enter", {
					altKey: "any",
					ctrlKey: "any",
					metaKey: "any"
				});
			}(t)) n.isInsertLineBreak = !1, Nl(e, cn$1, t);
			else if (function(t) {
				return _l(t, "Backspace", { shiftKey: "any" }) || r$1 && _l(t, "h", { ctrlKey: !0 });
			}(t)) ml(t) ? Nl(e, un$2, t) && Vn(n) : (t.preventDefault(), Nl(e, $e$2, !0));
			else if (function(t) {
				return "Escape" === t.key;
			}(t)) Nl(e, fn$1, t);
			else if (function(t) {
				return _l(t, "Delete", {}) || r$1 && _l(t, "d", { ctrlKey: !0 });
			}(t)) !function(t) {
				return "Delete" === t.key;
			}(t) ? (t.preventDefault(), Nl(e, $e$2, !1)) : Nl(e, dn$1, t);
			else if (function(t) {
				return _l(t, "Backspace", yl);
			}(t)) t.preventDefault(), Nl(e, qe$2, !0);
			else if (function(t) {
				return _l(t, "Delete", yl);
			}(t)) t.preventDefault(), Nl(e, qe$2, !1);
			else if (function(t) {
				return r$1 && _l(t, "Backspace", { metaKey: !0 });
			}(t)) t.preventDefault(), Nl(e, Ye$1, !0);
			else if (function(t) {
				return r$1 && (_l(t, "Delete", { metaKey: !0 }) || _l(t, "k", { ctrlKey: !0 }));
			}(t)) t.preventDefault(), Nl(e, Ye$1, !1);
			else if (function(t) {
				return _l(t, "b", pl);
			}(t)) t.preventDefault(), Nl(e, Ge$2, "bold");
			else if (function(t) {
				return _l(t, "u", pl);
			}(t)) t.preventDefault(), Nl(e, Ge$2, "underline");
			else if (function(t) {
				return _l(t, "i", pl);
			}(t)) t.preventDefault(), Nl(e, Ge$2, "italic");
			else if (function(t) {
				return _l(t, "Tab", { shiftKey: "any" });
			}(t)) Nl(e, hn$2, t);
			else if (function(t) {
				return _l(t, "z", pl);
			}(t)) t.preventDefault(), Nl(e, Qe$2);
			else if (function(t) {
				if (r$1) return _l(t, "z", {
					metaKey: !0,
					shiftKey: !0
				});
				return _l(t, "y", { ctrlKey: !0 }) || _l(t, "z", {
					ctrlKey: !0,
					shiftKey: !0
				});
			}(t)) t.preventDefault(), Nl(e, Ze$2);
			else {
				const o = e._editorState._selection;
				!function(t) {
					return _l(t, "a", pl);
				}(t) ? null === o || ur(o) || (!function(t) {
					return _l(t, "c", pl);
				}(t) ? function(t) {
					return _l(t, "x", pl);
				}(t) && (t.preventDefault(), Nl(e, Tn, t)) : (t.preventDefault(), Nl(e, vn$2, t))) : (t.preventDefault(), Nl(e, kn, t) && Vn(n));
			}
			return function(t) {
				return t.ctrlKey || t.shiftKey || t.altKey || t.metaKey;
			}(t) && e.dispatchCommand(An, t), !0;
		}
		function no(t) {
			let e = t.__lexicalEventHandles;
			return void 0 === e && (e = [], t.__lexicalEventHandles = e), e;
		}
		const oo = /* @__PURE__ */ new Map();
		function ro(t) {
			const e = Vl(t.target);
			if (null === e) return;
			const n = Ol(t.target);
			let o = null, r = null;
			const i = null !== n ? Kn.get(n) : void 0;
			if (null !== n) {
				if (void 0 !== i) {
					const t = i.editors;
					let n = i.hasShadowEditor;
					if (void 0 === n) {
						n = !1;
						for (const e of t) if (null !== e._rootElement && ql(e._rootElement.getRootNode())) {
							n = !0;
							break;
						}
						i.hasShadowEditor = n;
					}
					if (n) {
						let n = null, i = null;
						for (const s of t) {
							const t = s._rootElement;
							if (null === t) continue;
							const l = nc(e, t).anchorNode;
							if (null !== l && Fs(l) === s) {
								if (ql(t.getRootNode())) {
									o = s, r = l;
									break;
								}
								null === n && (n = s, i = l);
							}
						}
						null === o && null !== n && (o = n, r = i);
					} else {
						const t = e.anchorNode;
						null === t || gc(t) && null !== t.shadowRoot || (o = Fs(t), null !== o && (r = t));
					}
				}
				if (null === o) {
					const t = cc(n);
					o = null !== t ? Fs(t) : null;
				}
			}
			if (null === o) return;
			if (o._inputState.isSelectionChangeFromMouseDown) {
				if (void 0 !== i) for (const t of i.editors) t._inputState.isSelectionChangeFromMouseDown = !1;
				Ai(o, () => {
					const n = zr(), i = r ?? nc(e, o._rootElement).anchorNode;
					if (gc(i) || zs(i)) ol(Lr(n, e, o, t));
				});
			}
			const s = ll(o), l = s[s.length - 1], c = l._key, a = oo.get(c), u = a || l;
			u !== o && Wn(e, u, !1), Wn(e, o, !0), o !== l ? oo.set(c, o) : a && oo.delete(c);
		}
		function io(t) {
			t._lexicalHandled = !0;
		}
		function so(t) {
			return !0 === t._lexicalHandled;
		}
		function co(e) {
			const n = Ln.get(e);
			if (void 0 === n) return void 0;
			const o = Kn.get(n);
			if (void 0 === o) return void 0;
			Ln.delete(e);
			const r = Ps(e);
			Ds(r) ? (function(t) {
				if (null !== t._parentEditor) {
					const e = ll(t), n = e[e.length - 1]._key;
					oo.get(n) === t && oo.delete(n);
				} else oo.delete(t._key);
			}(r), o.editors.delete(r), o.hasShadowEditor = void 0, e.__lexicalEditor = null) : r && t(198);
			const i = no(e);
			for (let t = 0; t < i.length; t++) i[t]();
			e.__lexicalEventHandles = [];
		}
		function ao(e, n, o) {
			fi();
			const r = e.__key, i = e.getParent();
			if (null === i) return void (null !== ta(e) && t(367, r, String(ta(e))));
			const s = function(t) {
				const e = Kr();
				if (!ur(e) || !Pi(t)) return e;
				const { anchor: n, focus: o } = e, r = n.getNode(), i = o.getNode();
				Fl(r, t) && n.set(t.__key, 0, "element");
				Fl(i, t) && o.set(t.__key, 0, "element");
				return e;
			}(e);
			let l = !1;
			if (ur(s) && n) {
				const t = s.anchor, n = s.focus;
				t.key === r && (Wr(t, e, i, e.getPreviousSibling(), e.getNextSibling()), l = !0), n.key === r && (Wr(n, e, i, e.getPreviousSibling(), e.getNextSibling()), l = !0);
			} else dr(s) && n && e.isSelected() && e.selectPrevious();
			if (ur(s) && n && !l) {
				const t = e.getIndexWithinParent();
				Hs(e), Br(s, i, t, -1);
			} else Hs(e);
			o || Bl(i) || i.canBeEmpty() || !i.isEmpty() || ao(i, n), n && s && Bi(i) && i.isEmpty() && i.selectEnd();
		}
		const fo = Symbol.for("ephemeral");
		function ho(t) {
			return t[fo] || !1;
		}
		const go = {
			configurable: !0,
			enumerable: !1,
			value: void 0,
			writable: !0
		};
		var _o = class {
			__type;
			__key;
			__parent;
			__prev;
			__next;
			__state;
			[Kt$2];
			static getType() {
				const { ownNodeType: e } = Hc(this);
				return void 0 === e && t(64, this.name), e;
			}
			static clone(e) {
				t(65, this.name);
			}
			$config() {
				return {};
			}
			config(t, e) {
				const n = e.extends || Gc(this.constructor);
				return Object.assign(e, { extends: n }), "string" == typeof t && Object.assign(e, { type: t }), { [t]: e };
			}
			afterCloneFrom(t) {
				this.__key === t.__key ? (this.__parent = t.__parent, this.__next = t.__next, this.__prev = t.__prev, this.__state = t.__state) : t.__state && (this.__state = t.__state.getWritable(this));
			}
			resetOnCopyNodeFrom(t) {
				this.__state && (this.__state = this.__state.getWritable(this).resetOnCopyNode());
			}
			static importDOM;
			constructor(t) {
				this.__type = this.constructor.getType(), this.__parent = null, this.__prev = null, this.__next = null, Object.defineProperty(this, "__state", go), Object.defineProperty(this, Kt$2, go), Us(this, t);
			}
			getType() {
				return this.__type;
			}
			isInline() {
				t(137, this.constructor.name);
			}
			isAttached() {
				let t = this.__key;
				for (; null !== t;) {
					if ("root" === t) return !0;
					const e = Ys(t);
					if (null === e) break;
					t = null !== e.__parent ? e.__parent : ta(e);
				}
				return !1;
			}
			isSelected(t) {
				const e = t || Kr();
				if (null == e) return !1;
				const n = e.getNodes().some((t) => t.__key === this.__key);
				if (Xo(this)) return n;
				if (ur(e) && "element" === e.anchor.type && "element" === e.focus.type) {
					if (e.isCollapsed()) return !1;
					const t = this.getParent();
					if (Ki(this) && this.isInline() && t) {
						const n = e.isBackward() ? e.focus : e.anchor;
						if (t.is(n.getNode()) && n.offset === t.getChildrenSize() && this.is(t.getLastChild())) return !1;
					}
				}
				return n;
			}
			getKey() {
				return this.__key;
			}
			getIndexWithinParent() {
				const t = this.getParent();
				if (null === t) return -1;
				let e = t.getFirstChild(), n = 0;
				for (; null !== e;) {
					if (this.is(e)) return n;
					n++, e = e.getNextSibling();
				}
				return -1;
			}
			getParent() {
				const t = this.getLatest().__parent;
				return null === t ? null : Ys(t);
			}
			getParentOrThrow() {
				const e = this.getParent();
				return null === e && t(66, this.__key), e;
			}
			getTopLevelElement() {
				let e = this;
				for (; null !== e;) {
					const n = e.getParent();
					if (Bl(n) || null !== ta(e)) return Pi(e) || e === this && Ki(e) || t(194), e;
					e = n;
				}
				return null;
			}
			getTopLevelElementOrThrow() {
				const e = this.getTopLevelElement();
				return null === e && t(67, this.__key), e;
			}
			getParents() {
				const t = [];
				let e = this.getParent();
				for (; null !== e;) t.push(e), e = e.getParent();
				return t;
			}
			getParentKeys() {
				const t = [];
				let e = this.getParent();
				for (; null !== e;) t.push(e.__key), e = e.getParent();
				return t;
			}
			getPreviousSibling() {
				const t = this.getLatest().__prev;
				return null === t ? null : Ys(t);
			}
			getPreviousSiblings() {
				const t = [], e = this.getParent();
				if (null === e) return t;
				let n = e.getFirstChild();
				for (; null !== n && !n.is(this);) t.push(n), n = n.getNextSibling();
				return t;
			}
			getNextSibling() {
				const t = this.getLatest().__next;
				return null === t ? null : Ys(t);
			}
			getNextSiblings() {
				const t = [];
				let e = this.getNextSibling();
				for (; null !== e;) t.push(e), e = e.getNextSibling();
				return t;
			}
			getCommonAncestor(t) {
				const e = Pi(this) ? this : this.getParent(), n = Pi(t) ? t : t.getParent(), o = e && n ? Za(e, n) : null;
				return o ? o.commonAncestor : null;
			}
			is(t) {
				return null != t && this.__key === t.__key;
			}
			isBefore(e) {
				const n = Za(this, e);
				return null !== n && ("descendant" === n.type || ("branch" === n.type ? -1 === Ga(n) : ("same" !== n.type && "ancestor" !== n.type && t(279), !1)));
			}
			isParentOf(t) {
				return Fl(t, this);
			}
			getNodesBetween(e) {
				const n = this.isBefore(e), o = [], r = /* @__PURE__ */ new Set();
				let i = this;
				for (; null !== i;) {
					const s = i.__key;
					if (r.has(s) || (r.add(s), o.push(i)), i === e) break;
					const l = Pi(i) ? n ? i.getFirstChild() : i.getLastChild() : null;
					if (null !== l) {
						i = l;
						continue;
					}
					const c = n ? i.getNextSibling() : i.getPreviousSibling();
					if (null !== c) {
						i = c;
						continue;
					}
					const a = i.getParentOrThrow();
					if (r.has(a.__key) || o.push(a), a === e) break;
					let u = null, f = a;
					do {
						if (null === f && t(68), u = n ? f.getNextSibling() : f.getPreviousSibling(), f = f.getParent(), null === f) break;
						null !== u || r.has(f.__key) || o.push(f);
					} while (null === u);
					i = u;
				}
				return n || o.reverse(), o;
			}
			isDirty() {
				const t = _i()._dirtyLeaves;
				return null !== t && t.has(this.__key);
			}
			getLatest() {
				if (ho(this)) return this;
				const e = Ys(this.__key);
				return null === e && t(113), e;
			}
			getWritable() {
				if (ho(this)) return this;
				fi();
				const t = hi(), e = _i(), n = t._nodeMap, o = this.__key, r = this.getLatest(), i = e._cloneNotNeeded, s = Kr();
				if (null !== s && s.setCachedNodes(null), i.has(o)) return Js(r), r;
				const l = Dc(r);
				return i.add(o), Js(l), n.set(o, l), l;
			}
			getTextContent() {
				return ha(this);
			}
			getTextContentSize() {
				return this.getTextContent().length;
			}
			createDOM(e, n) {
				t(70);
			}
			updateDOM(e, n, o) {
				t(71);
			}
			getDOMSlot(t) {
				return new q(t);
			}
			exportDOM(t) {
				return { element: this.createDOM(t._config, t) };
			}
			exportJSON() {
				const t = this.__state ? this.__state.toJSON() : void 0;
				return {
					type: this.__type,
					version: 1,
					...t
				};
			}
			static importJSON(e) {
				t(18, this.name);
			}
			updateFromJSON(t) {
				return function(t, e) {
					const n = t.getWritable(), o = e.$;
					let r = o;
					for (const t of Nt$1(n).flatKeys) t in e && (void 0 !== r && r !== o || (r = { ...o }), r[t] = e[t]);
					return (n.__state || r) && bt$2(t).updateFromJSON(r), n;
				}(this, t);
			}
			static transform() {
				return null;
			}
			remove(t) {
				ao(this, !0, t);
			}
			replace(e, n) {
				fi();
				let o = Kr();
				null !== o && (o = o.clone()), $l(this, e);
				const r = this.getLatest(), i = this.__key, s = e.__key, l = e.getWritable(), c = this.getParentOrThrow().getWritable(), a = c.__size, u = l.getParent(), f = null !== u ? l.getIndexWithinParent() : -1;
				Hs(l), null !== u && ur(o) && Br(o, u, f, -1);
				const d = r.getPreviousSibling(), h = r.getNextSibling(), g = r.__prev, _ = r.__next, p = r.__parent;
				if (ao(r, !1, !0), null === d) c.__first = s;
				else d.getWritable().__next = s;
				if (l.__prev = g, null === h) c.__last = s;
				else h.getWritable().__prev = s;
				l.__next = _, l.__parent = p, c.__size = a;
				let y = 0;
				n && (Pi(this) && Pi(l) || t(139), y = l.getChildrenSize(), l.splice(y, 0, this.getChildren()));
				const m = ia(this);
				if (m.length > 0) {
					Qc(this) && Qc(l) || t(368, this.__key, l.__key);
					for (const t of m) {
						const e = sa(this, t);
						null !== e && (ya(this, t), pa(l, t, e));
					}
				}
				if (ur(o)) {
					ol(o);
					const t = o.anchor, e = o.focus;
					t.key === i && (n && "element" === t.type ? t.set(l.__key, y + t.offset, "element") : ir(t, l)), e.key === i && (n && "element" === e.type ? e.set(l.__key, y + e.offset, "element") : ir(e, l));
				}
				return qs() === i && Vs(s), l;
			}
			insertAfter(t, e = !0) {
				fi(), $l(this, t);
				const n = this.getWritable(), o = t.getWritable();
				this.getParentOrThrow();
				const r = o.getParent(), i = Kr();
				let s = !1, l = !1;
				if (null !== r) {
					const n = t.getIndexWithinParent();
					if (ur(i)) {
						const t = r.__key, e = i.anchor, o = i.focus;
						s = "element" === e.type && e.key === t && e.offset === n + 1, l = "element" === o.type && o.key === t && o.offset === n + 1;
					}
					Hs(o), e && ur(i) && Br(i, r, n, -1);
				} else Hs(o);
				const c = this.getNextSibling(), a = this.getParentOrThrow().getWritable(), u = o.__key, f = n.__next;
				if (null === c) a.__last = u;
				else c.getWritable().__prev = u;
				if (a.__size++, n.__next = u, o.__next = f, o.__prev = n.__key, o.__parent = n.__parent, e && ur(i)) {
					const t = this.getIndexWithinParent();
					Br(i, a, t + 1);
					const e = a.__key;
					s && i.anchor.set(e, t + 2, "element"), l && i.focus.set(e, t + 2, "element");
				}
				return t;
			}
			insertBefore(t, e = !0) {
				fi(), $l(this, t);
				const n = this.getWritable(), o = t.getWritable();
				this.getParentOrThrow();
				const r = o.__key, i = Kr(), s = o.getParent(), l = null !== s ? o.getIndexWithinParent() : -1;
				Hs(o), null !== s && e && ur(i) && Br(i, s, l, -1);
				const c = this.getPreviousSibling(), a = this.getParentOrThrow().getWritable(), u = n.__prev, f = this.getIndexWithinParent();
				if (null === c) a.__first = r;
				else c.getWritable().__next = r;
				if (a.__size++, n.__prev = r, o.__prev = u, o.__next = n.__key, o.__parent = n.__parent, e && ur(i)) Br(i, this.getParentOrThrow(), f);
				return t;
			}
			isParentRequired() {
				return !1;
			}
			createParentElementNode() {
				return es();
			}
			selectStart() {
				return this.selectPrevious();
			}
			selectEnd() {
				return this.selectNext(0, 0);
			}
			selectPrevious(t, e) {
				fi();
				const n = ea(this);
				if (null !== n) return n.selectPrevious(t, e);
				const o = this.getPreviousSibling(), r = this.getParentOrThrow();
				if (null === o) return r.select(0, 0);
				if (Pi(o)) return o.select();
				if (!Xo(o)) {
					const t = o.getIndexWithinParent() + 1;
					return r.select(t, t);
				}
				return o.select(t, e);
			}
			selectNext(t, e) {
				fi();
				const n = ea(this);
				if (null !== n) return n.selectNext(t, e);
				const o = this.getNextSibling(), r = this.getParentOrThrow();
				if (null === o) return r.select();
				if (Pi(o)) return o.select(0, 0);
				if (!Xo(o)) {
					const t = o.getIndexWithinParent();
					return r.select(t, t);
				}
				return o.select(t, e);
			}
			markDirty() {
				this.getWritable();
			}
			reconcileObservedMutation(t, e) {
				this.markDirty();
			}
		};
		function po(t) {
			return t instanceof _o;
		}
		const mo = "history-push", xo = "history-merge", Co = "paste", ko = "skip-scroll-into-view", No = "skip-selection-focus", wo = "composition-end", Oo = "!important";
		function Mo(t) {
			const e = {};
			if (!t) return e;
			let n = "", o = "", r = null, i = !1, s = !1, l = !1, c = 0;
			const a = t.length;
			let u = -1;
			for (let f = 0; f < a; f++) {
				const a = t[f];
				if (i) "*" === a && "/" === t[f + 1] && (i = !1, f++);
				else if (s) -1 === u && (u = f), s = !1;
				else if (null === r) if ("/" !== a || "*" !== t[f + 1]) if ("\"" !== a && "'" !== a) if ("(" !== a) if (")" !== a) if (l || ":" !== a || 0 !== c) {
					if (";" === a && 0 === c) {
						-1 !== u && (l ? o += t.slice(u, f) : n += t.slice(u, f), u = -1);
						const r = n.trim(), i = o.trim();
						"" !== r && "" !== i && (e[r] = i), n = "", o = "", l = !1;
						continue;
					}
					-1 === u && (u = f);
				} else -1 !== u && (n += t.slice(u, f), u = -1), l = !0;
				else -1 === u && (u = f), c = Math.max(0, c - 1);
				else -1 === u && (u = f), c++;
				else -1 === u && (u = f), r = a;
				else -1 !== u && (l ? o += t.slice(u, f) : n += t.slice(u, f), u = -1), i = !0, f++;
				else -1 === u && (u = f), "\\" === a ? s = !0 : a === r && (r = null);
			}
			-1 !== u && (l ? o += t.slice(u, a) : n += t.slice(u, a));
			const f = n.trim(), d = o.trim();
			return "" !== f && "" !== d && (e[f] = d), e;
		}
		function Ao(t, e, n) {
			const o = n.trimEnd(), r = o.length - 10;
			r >= 0 && o.slice(r).toLowerCase() === Oo ? t.setProperty(e, o.slice(0, r).trim(), "important") : t.setProperty(e, n, "");
		}
		function Fo(t, e, n = "") {
			if (e === n) return;
			const o = Mo(n), r = Mo(e);
			for (const e in r) delete o[e], Ao(t, e, r[e]);
			for (const e in o) t.removeProperty(e);
		}
		function Po(t, e) {
			return 16 & e ? "code" : e & 128 ? "mark" : 32 & e ? "sub" : 64 & e ? "sup" : null;
		}
		function Io(t, e) {
			return 1 & e ? "strong" : 2 & e ? "em" : "span";
		}
		function Lo(t, e, n, o, r) {
			const i = o.classList;
			let s = Cl(r, "base");
			void 0 !== s && i.add(...s), s = Cl(r, "underlineStrikethrough");
			let l = !1;
			const c = 8 & e && 4 & e;
			void 0 !== s && (8 & n && 4 & n ? (l = !0, c || i.add(...s)) : c && i.remove(...s));
			for (const t in z$1) {
				const o = z$1[t];
				if (s = Cl(r, t), void 0 !== s) if (n & o) {
					if (l && ("underline" === t || "strikethrough" === t)) {
						e & o && i.remove(...s);
						continue;
					}
					(0 === (e & o) || c && "underline" === t || "strikethrough" === t) && i.add(...s);
				} else e & o && i.remove(...s);
			}
		}
		function Ko(t, e, n) {
			const o = n.isComposing(), r = t + (o ? A : ""), s = vc(), l = Tc(s).$getDOMSlot(n, e, s), c = l.getFirstChild();
			if (null === c || c.nodeType !== Node.TEXT_NODE) return void l.insertChild(Zl().createTextNode(r));
			const a = c, u = a.nodeValue;
			if (u !== r) if (o || i) {
				const [t, e, n] = function(t, e) {
					const n = t.length, o = e.length;
					let r = 0, i = 0;
					for (; r < n && r < o && t[r] === e[r];) r++;
					for (; i + r < n && i + r < o && t[n - i - 1] === e[o - i - 1];) i++;
					return [
						r,
						n - r - i,
						e.slice(r, o - i)
					];
				}(u, r);
				0 !== e && a.deleteData(t, e), a.insertData(t, n);
			} else a.nodeValue = r;
		}
		function zo(t, e, n, o, r, i) {
			Ko(r, t, e);
			const s = i.theme.text;
			void 0 !== s && Lo(0, 0, o, t, s);
		}
		function Bo(t, e) {
			const n = Zl().createElement(e);
			return n.appendChild(t), n;
		}
		function Ro(t) {
			return null != t && !0 === t.__isInlineFormattable;
		}
		var Wo = class extends _o {
			__text;
			__format;
			__style;
			__mode;
			__detail;
			get __isInlineFormattable() {
				return !0;
			}
			$config() {
				return this.config("text", { importDOM: {
					"#text": () => ({
						conversion: Jo,
						priority: 0
					}),
					b: () => ({
						conversion: Uo,
						priority: 0
					}),
					code: () => ({
						conversion: Yo,
						priority: 0
					}),
					em: () => ({
						conversion: Yo,
						priority: 0
					}),
					i: () => ({
						conversion: Yo,
						priority: 0
					}),
					mark: () => ({
						conversion: Yo,
						priority: 0
					}),
					s: () => ({
						conversion: Yo,
						priority: 0
					}),
					span: () => ({
						conversion: $o,
						priority: 0
					}),
					strong: () => ({
						conversion: Yo,
						priority: 0
					}),
					sub: () => ({
						conversion: Yo,
						priority: 0
					}),
					sup: () => ({
						conversion: Yo,
						priority: 0
					}),
					u: () => ({
						conversion: Yo,
						priority: 0
					})
				} });
			}
			afterCloneFrom(t) {
				super.afterCloneFrom(t), this.__text = t.__text, this.__format = t.__format, this.__style = t.__style, this.__mode = t.__mode, this.__detail = t.__detail;
			}
			constructor(t = "", e) {
				super(e), this.__text = t, this.__format = 0, this.__style = "", this.__mode = 0, this.__detail = 0;
			}
			getFormat() {
				return this.getLatest().__format;
			}
			getDetail() {
				return this.getLatest().__detail;
			}
			getMode() {
				return U[this.getLatest().__mode];
			}
			getStyle() {
				return this.getLatest().__style;
			}
			isToken() {
				return 1 === this.getLatest().__mode;
			}
			isComposing() {
				return this.__key === qs();
			}
			isSegmented() {
				return 2 === this.getLatest().__mode;
			}
			isDirectionless() {
				return !!(1 & this.getLatest().__detail);
			}
			isUnmergeable() {
				return !!(2 & this.getLatest().__detail);
			}
			hasFormat(t) {
				const e = z$1[t];
				return 0 !== (this.getFormat() & e);
			}
			isSimpleText() {
				return "text" === this.__type && 0 === this.__mode;
			}
			getTextContent() {
				return this.getLatest().__text;
			}
			getFormatFlags(t, e) {
				return Ws(this.getLatest().__format, t, e);
			}
			canHaveFormat() {
				return !0;
			}
			isInline() {
				return !0;
			}
			createDOM(t, e) {
				const n = this.__format, o = Po(0, n), r = Io(0, n), i = null === o ? r : o, s = Zl().createElement(i);
				let l = s;
				this.hasFormat("code") && s.setAttribute("spellcheck", "false"), null !== o && (l = Zl().createElement(r), s.appendChild(l));
				zo(l, this, 0, n, this.__text, t);
				const c = this.__style;
				return "" !== c && Fo(s.style, c), s;
			}
			updateDOM(e, n, o) {
				const r = this.__text, i = e.__format, s = this.__format, l = Po(0, i), c = Po(0, s), a = Io(0, i), u = Io(0, s);
				if ((null === l ? a : l) !== (null === c ? u : c)) return !0;
				if (l === c && a !== u) {
					const e = n.firstChild;
					e ?? t(48);
					const i = Zl().createElement(u);
					return zo(i, this, 0, s, r, o), n.replaceChild(i, e), !1;
				}
				let f = n;
				null !== c && null !== l && (f = n.firstChild, f ?? t(49)), Ko(r, f, this);
				const d = o.theme.text;
				void 0 !== d && i !== s && Lo(0, i, s, f, d);
				const h = e.__style, g = this.__style;
				return h !== g && Fo(n.style, g, h), !1;
			}
			updateFromJSON(t) {
				return super.updateFromJSON(t).setTextContent(t.text).setFormat(t.format).setDetail(t.detail).setMode(t.mode).setStyle(t.style);
			}
			exportDOM(e) {
				let { element: n } = super.exportDOM(e);
				return gc(n) || t(132), n.style.whiteSpace = "pre-wrap", this.hasFormat("lowercase") ? n.style.textTransform = "lowercase" : this.hasFormat("uppercase") ? n.style.textTransform = "uppercase" : this.hasFormat("capitalize") && (n.style.textTransform = "capitalize"), this.hasFormat("bold") && (n = Bo(n, "b")), this.hasFormat("italic") && (n = Bo(n, "i")), this.hasFormat("strikethrough") && (n = Bo(n, "s")), this.hasFormat("underline") && (n = Bo(n, "u")), { element: n };
			}
			exportJSON() {
				return {
					detail: this.getDetail(),
					format: this.getFormat(),
					mode: this.getMode(),
					style: this.getStyle(),
					text: this.getTextContent(),
					...super.exportJSON()
				};
			}
			selectionTransform(t, e) {}
			setFormat(t) {
				const e = this.getWritable();
				return e.__format = "string" == typeof t ? z$1[t] : t, e;
			}
			setDetail(t) {
				const e = this.getWritable();
				return e.__detail = "string" == typeof t ? B[t] : t, e;
			}
			setStyle(t) {
				const e = this.getWritable();
				return e.__style = t, e;
			}
			toggleFormat(t) {
				const e = Ws(this.getFormat(), t, null);
				return this.setFormat(e);
			}
			toggleDirectionless() {
				const t = this.getWritable();
				return t.__detail ^= 1, t;
			}
			toggleUnmergeable() {
				const t = this.getWritable();
				return t.__detail ^= 2, t;
			}
			setMode(t) {
				const e = $[t];
				if (this.__mode === e) return this;
				const n = this.getWritable();
				return n.__mode = e, n;
			}
			setTextContent(t) {
				if (this.__text === t) return this;
				const e = this.getWritable();
				return e.__text = t, e;
			}
			select(t, e) {
				fi();
				let n = t, o = e;
				const r = Kr(), i = this.getTextContent(), s = this.__key;
				if ("string" == typeof i) {
					const t = i.length;
					void 0 === n && (n = t), void 0 === o && (o = t);
				} else n = 0, o = 0;
				if (!ur(r)) return Dr(s, n, s, o, "text", "text");
				{
					const t = qs();
					t !== r.anchor.key && t !== r.focus.key || Vs(s), r.setTextNodeRange(this, n, this, o);
				}
				return r;
			}
			selectStart() {
				return this.select(0, 0);
			}
			selectEnd() {
				const t = this.getTextContentSize();
				return this.select(t, t);
			}
			spliceText(t, e, n, o) {
				const r = this.getWritable(), i = r.__text, s = n.length;
				let l = t;
				l < 0 && (l = s + l, l < 0 && (l = 0));
				const c = Kr();
				if (o && ur(c)) {
					const e = t + s;
					c.setTextNodeRange(r, e, r, e);
				}
				return r.__text = i.slice(0, l) + n + i.slice(l + e), r;
			}
			canInsertTextBefore() {
				return !0;
			}
			canInsertTextAfter() {
				return !0;
			}
			splitText(...t) {
				fi();
				const e = this.getLatest(), n = e.getTextContent();
				if ("" === n) return [];
				const o = e.__key, r = qs(), i = n.length;
				t.sort((t, e) => t - e), t.push(i);
				const s = [], l = t.length;
				for (let e = 0, o = 0; e < i && o <= l; o++) {
					const r = t[o];
					r > e && (s.push(n.slice(e, r)), e = r);
				}
				const c = s.length;
				if (1 === c) return [e];
				const a = s[0], u = e.getParent();
				let f;
				const d = e.getFormat(), h = e.getStyle(), g = e.__detail;
				let _ = !1, p = null, y = null;
				const m = Kr();
				if (ur(m)) {
					const [t, e] = m.isBackward() ? [m.focus, m.anchor] : [m.anchor, m.focus];
					"text" === t.type && t.key === o && (p = t), "text" === e.type && e.key === o && (y = e);
				}
				e.isSegmented() ? (f = Go(a), f.__format = d, f.__style = h, f.__detail = g, f.__state = At(e, f), _ = !0) : f = e.setTextContent(a);
				const x = [f];
				for (let t = 1; t < c; t++) {
					const n = Go(s[t]);
					n.__format = d, n.__style = h, n.__detail = g, n.__state = At(e, n);
					const i = n.__key;
					r === o && Vs(i), x.push(n);
				}
				const C = p ? p.offset : null, S = y ? y.offset : null;
				let v = 0;
				for (const t of x) {
					if (!p && !y) break;
					const e = v + t.getTextContentSize();
					if (null !== p && null !== C && C <= e && C >= v && (p.set(t.getKey(), C - v, "text"), C < e && (p = null)), null !== y && null !== S && S <= e && S >= v) {
						y.set(t.getKey(), S - v, "text");
						break;
					}
					v = e;
				}
				if (null !== u) {
					(function(t) {
						const e = t.getPreviousSibling(), n = t.getNextSibling();
						null !== e && Js(e);
						null !== n && Js(n);
					})(this);
					const t = u.getWritable(), e = this.getIndexWithinParent();
					_ ? (t.splice(e, 0, x), this.remove()) : t.splice(e, 1, x), ur(m) && Br(m, u, e, c - 1);
				}
				return x;
			}
			mergeWithSibling(e) {
				const n = e === this.getPreviousSibling();
				n || e === this.getNextSibling() || t(50);
				const o = this.__key, r = e.__key, i = this.__text, s = i.length;
				qs() === r && Vs(o);
				const l = Kr();
				if (ur(l)) {
					const t = l.anchor, i = l.focus;
					null !== t && t.key === r && $r(t, n, o, e, s), null !== i && i.key === r && $r(i, n, o, e, s);
				}
				const c = e.__text, a = n ? c + i : i + c;
				this.setTextContent(a);
				const u = this.getWritable();
				return e.remove(), u;
			}
			isTextEntity() {
				return !1;
			}
		};
		function $o(t) {
			return {
				forChild: Qo(t.style),
				node: null
			};
		}
		function Uo(t) {
			const e = t, n = "normal" === e.style.fontWeight;
			return {
				forChild: Qo(e.style, n ? void 0 : "bold"),
				node: null
			};
		}
		const Ho = /* @__PURE__ */ new WeakMap();
		function jo(t) {
			if (!gc(t)) return !1;
			if ("PRE" === t.nodeName) return !0;
			const e = t.style.whiteSpace;
			return "string" == typeof e && e.startsWith("pre");
		}
		function Jo(e) {
			const n = e;
			null === e.parentElement && t(129);
			let o = n.textContent || "";
			if (null !== function(t) {
				let e, n = t.parentNode;
				const o = [t];
				for (; null !== n && void 0 === (e = Ho.get(n)) && !jo(n);) o.push(n), n = n.parentNode;
				const r = void 0 === e ? n : e;
				for (let t = 0; t < o.length; t++) Ho.set(o[t], r);
				return r;
			}(n)) return { node: qr(o) };
			if (o = o.replace(/\r/g, "").replace(/[ \t\n]+/g, " "), "" === o) return { node: null };
			if (" " === o[0]) {
				let t = n, e = !0;
				for (; null !== t && null !== (t = Vo(t, !1));) {
					const n = t.textContent || "";
					if (n.length > 0) {
						/[ \t\n]$/.test(n) && (o = o.slice(1)), e = !1;
						break;
					}
				}
				e && (o = o.slice(1));
			}
			if (" " === o[o.length - 1]) {
				let t = n, e = !0;
				for (; null !== t && null !== (t = Vo(t, !0));) if ((t.textContent || "").replace(/^( |\t|\r?\n)+/, "").length > 0) {
					e = !1;
					break;
				}
				e && (o = o.slice(0, o.length - 1));
			}
			return "" === o ? { node: null } : { node: Go(o) };
		}
		function Vo(t, e) {
			let n = t;
			for (;;) {
				let t;
				for (; null === (t = e ? n.nextSibling : n.previousSibling);) {
					const t = n.parentElement;
					if (null === t) return null;
					n = t;
				}
				if (n = t, gc(n)) {
					const t = n.style.display;
					if ("" === t && !mc(n) || "" !== t && !t.startsWith("inline")) return null;
				}
				let o = n;
				for (; null !== (o = e ? n.firstChild : n.lastChild);) n = o;
				if (zs(n)) return n;
				if ("BR" === n.nodeName) return null;
			}
		}
		const qo = {
			code: "code",
			em: "italic",
			i: "italic",
			mark: "highlight",
			s: "strikethrough",
			strong: "bold",
			sub: "subscript",
			sup: "superscript",
			u: "underline"
		};
		function Yo(t) {
			const e = qo[t.nodeName.toLowerCase()];
			return void 0 === e ? { node: null } : {
				forChild: Qo(t.style, e),
				node: null
			};
		}
		function Go(t = "") {
			return Wl(new Wo(t));
		}
		function Xo(t) {
			return t instanceof Wo;
		}
		function Qo(t, e) {
			const n = t.fontWeight, o = t.textDecoration.split(" "), r = "700" === n || "bold" === n, i = o.includes("line-through"), s = "italic" === t.fontStyle, l = o.includes("underline"), c = t.verticalAlign;
			return (t) => Xo(t) || Ro(t) ? (r && !t.hasFormat("bold") && t.toggleFormat("bold"), i && !t.hasFormat("strikethrough") && t.toggleFormat("strikethrough"), s && !t.hasFormat("italic") && t.toggleFormat("italic"), l && !t.hasFormat("underline") && t.toggleFormat("underline"), "sub" !== c || t.hasFormat("subscript") || t.toggleFormat("subscript"), "super" !== c || t.hasFormat("superscript") || t.toggleFormat("superscript"), e && !t.hasFormat(e) && t.toggleFormat(e), t) : t;
		}
		var Zo = class extends Wo {
			$config() {
				return this.config("tab", { extends: Wo });
			}
			constructor(t = void 0) {
				super("	", t), this.__detail = 2;
			}
			createDOM(t) {
				const e = super.createDOM(t), n = Cl(t.theme, "tab");
				if (void 0 !== n) e.classList.add(...n);
				return e;
			}
			setTextContent(t) {
				return super.setTextContent("	");
			}
			spliceText(e, n, o, r) {
				return "" === o && 0 === n || "	" === o && 1 === n || t(286), this;
			}
			setDetail(e) {
				return 2 !== e && t(127), this;
			}
			setMode(e) {
				return "normal" !== e && t(128), this;
			}
			canInsertTextBefore() {
				return !1;
			}
			canInsertTextAfter() {
				return !1;
			}
		};
		function tr() {
			return Wl(new Zo());
		}
		function er(t) {
			return t instanceof Zo;
		}
		var nr = class {
			key;
			offset;
			type;
			_selection;
			constructor(t, e, n) {
				this._selection = null, this.key = t, this.offset = e, this.type = n;
			}
			is(t) {
				return this.key === t.key && this.offset === t.offset && this.type === t.type;
			}
			isBefore(t) {
				if (this.key === t.key) return this.offset < t.offset;
				return Ya(au(tu(this, "next")), au(tu(t, "next"))) < 0;
			}
			getNode() {
				const e = Ys(this.key);
				return null === e && t(20), e;
			}
			set(t, e, n, o) {
				const r = this._selection, i = this.key;
				o && this.key === t && this.offset === e && this.type === n || (this.key = t, this.offset = e, this.type = n, ui() || (qs() === i && Vs(t), null !== r && (r.setCachedNodes(null), ur(r) && (r._cachedIsBackward = null), r.dirty = !0)));
			}
		};
		function or(t, e, n) {
			return new nr(t, e, n);
		}
		function rr(t, e) {
			let n = e.__key, o = t.offset, r = "element";
			if (Xo(e)) {
				r = "text";
				const t = e.getTextContentSize();
				o > t && (o = t);
			} else if (!Pi(e)) {
				const t = e.getNextSibling();
				if (Xo(t)) n = t.__key, o = 0, r = "text";
				else {
					const t = e.getParent();
					t && (n = t.__key, o = e.getIndexWithinParent() + 1);
				}
			}
			t.set(n, o, r);
		}
		function ir(t, e) {
			if (Pi(e)) {
				const n = e.getLastDescendant();
				Pi(n) || Xo(n) ? rr(t, n) : rr(t, e);
			} else rr(t, e);
		}
		function sr(t, e, n, o) {
			const r = t.getNode(), i = r.getChildAtIndex(t.offset), s = Go();
			if (s.setFormat(n), s.setStyle(o), ns(i)) i.splice(0, 0, [s]);
			else if (null !== i) {
				const t = Bl(r) ? es().append(s) : s;
				i.insertBefore(t);
			} else if (Bl(r)) {
				const t = r.getLastChild();
				Pi(t) && !t.isInline() && t.isEmpty() ? t.append(s) : r.append(es().append(s));
			} else r.append(s);
			t.is(e) && e.set(s.__key, 0, "text"), t.set(s.__key, 0, "text");
		}
		function lr(e, n, o, r) {
			const i = e.anchor.getNode();
			Xo(i) || t(398);
			const s = e.anchor.offset, l = Go(n);
			l.setFormat(o), l.setStyle(r);
			const c = i.getParentOrThrow();
			if (0 === s) c.isInline() && !i.__prev ? c.insertBefore(l) : i.insertBefore(l, !1);
			else if (s === i.getTextContentSize()) c.isInline() && !i.__next ? c.insertAfter(l) : i.insertAfter(l, !1);
			else {
				const [t] = i.splitText(s);
				t.insertAfter(l, !1);
			}
			"" === i.getTextContent() && i.isAttached() && i.remove(), l.selectEnd(), l.isComposing() && "text" === e.anchor.type && e.anchor.set(e.anchor.key, e.anchor.offset - n.length, e.anchor.type);
		}
		var cr = class cr {
			_nodes;
			_cachedNodes;
			dirty;
			constructor(t) {
				this._cachedNodes = null, this._nodes = t, this.dirty = !1;
			}
			getCachedNodes() {
				return this._cachedNodes;
			}
			setCachedNodes(t) {
				this._cachedNodes = t;
			}
			is(t) {
				if (!dr(t)) return !1;
				const e = this._nodes, n = t._nodes;
				return e.size === n.size && Array.from(e).every((t) => n.has(t));
			}
			isCollapsed() {
				return !1;
			}
			isBackward() {
				return !1;
			}
			getStartEndPoints() {
				return null;
			}
			add(t) {
				this.dirty = !0, this._nodes.add(t), this._cachedNodes = null;
			}
			delete(t) {
				this.dirty = !0, this._nodes.delete(t), this._cachedNodes = null;
			}
			clear() {
				this.dirty = !0, this._nodes.clear(), this._cachedNodes = null;
			}
			has(t) {
				return this._nodes.has(t);
			}
			clone() {
				return new cr(new Set(this._nodes));
			}
			extract() {
				return this.getNodes();
			}
			insertRawText(t) {}
			insertText() {}
			insertNodes(t) {
				const e = this.getNodes().filter((t) => null === ta(t)), n = e.length;
				if (0 === n) return;
				const o = e[n - 1];
				let r;
				if (Xo(o)) r = o.select();
				else {
					const t = o.getIndexWithinParent() + 1;
					r = o.getParentOrThrow().select(t, t);
				}
				r.insertNodes(t);
				for (let t = 0; t < n; t++) e[t].remove();
			}
			getNodes() {
				const t = this._cachedNodes;
				if (null !== t) return t;
				const e = this._nodes, n = [];
				for (const t of e) {
					const e = Ys(t);
					null !== e && n.push(e);
				}
				return ui() || (this._cachedNodes = n), n;
			}
			getTextContent() {
				const t = this.getNodes();
				let e = "";
				for (let n = 0; n < t.length; n++) e += t[n].getTextContent();
				return e;
			}
			deleteNodes() {
				const t = this.getNodes().filter((t) => null === ta(t));
				if ((Kr() || zr()) === this && t[0]) {
					const e = Ia(t[0], "next");
					nu(Va(e, e));
				}
				for (const e of t) e.remove();
				ar();
			}
		};
		function ar() {
			const t = nl();
			if (t.isEmpty()) {
				const e = es();
				t.append(e), e.select();
			}
		}
		function ur(t) {
			return t instanceof fr;
		}
		var fr = class fr {
			format;
			style;
			anchor;
			focus;
			_cachedNodes;
			_cachedIsBackward;
			dirty;
			constructor(t, e, n, o) {
				this.anchor = t, this.focus = e, t._selection = this, e._selection = this, this._cachedNodes = null, this._cachedIsBackward = null, this.format = n, this.style = o, this.dirty = !1;
			}
			getCachedNodes() {
				return this._cachedNodes;
			}
			setCachedNodes(t) {
				this._cachedNodes = t;
			}
			is(t) {
				return !!ur(t) && this.anchor.is(t.anchor) && this.focus.is(t.focus) && this.format === t.format && this.style === t.style;
			}
			isCollapsed() {
				return this.anchor.is(this.focus);
			}
			getNodes() {
				const t = this._cachedNodes;
				if (null !== t) return t;
				const e = function(t) {
					const e = [], [n, o] = t.getTextSlices();
					n && e.push(n.caret.origin);
					const r = /* @__PURE__ */ new Set(), i = /* @__PURE__ */ new Set();
					for (const n of t) if (Aa(n)) {
						const { origin: t } = n;
						0 === e.length ? r.add(t) : (i.add(t), e.push(t));
					} else {
						const { origin: t } = n;
						Pi(t) && i.has(t) || e.push(t);
					}
					o && e.push(o.caret.origin);
					if (Ma(t.focus) && Pi(t.focus.origin) && null === t.focus.getNodeAtCaret()) for (let n = Ba(t.focus.origin, "previous"); Aa(n) && r.has(n.origin) && !n.origin.isEmpty() && n.origin.is(e[e.length - 1]); n = Wa(n)) r.delete(n.origin), e.pop();
					for (; e.length > 1;) {
						const t = e[e.length - 1];
						if (!Pi(t) || i.has(t) || t.isEmpty() || r.has(t)) break;
						e.pop();
					}
					if (0 === e.length && t.isCollapsed()) {
						const n = au(t.anchor), o = au(t.anchor.getFlipped()), r = (t) => wa(t) ? t.origin : t.getNodeAtCaret(), i = r(n) || r(o) || (t.anchor.getNodeAtCaret() ? n.origin : o.origin);
						e.push(i);
					}
					return e;
				}(du(ru(this), "next"));
				return ui() || (this._cachedNodes = e), e;
			}
			setTextNodeRange(t, e, n, o) {
				return this.anchor.set(t.__key, e, "text"), this.focus.set(n.__key, o, "text"), this;
			}
			getTextContent() {
				const t = this.getNodes();
				if (0 === t.length) return "";
				const e = t[0], n = t[t.length - 1], o = this.anchor, r = this.focus, i = o.isBefore(r), [s, l] = yr(this);
				let c = "", a = !0;
				for (let u = 0; u < t.length; u++) {
					const f = t[u];
					if (Pi(f) && !f.isInline()) {
						a || (c += "\n");
						let t = "";
						for (const e of ia(f)) {
							const n = sa(f, e);
							null !== n && (t += n.getTextContent());
						}
						"" !== t ? (c += t, a = !1) : a = !f.isEmpty();
					} else if (a = !1, Xo(f)) {
						let t = f.getTextContent();
						f === e ? f === n ? "element" === o.type && "element" === r.type && r.offset !== o.offset || (t = s < l ? t.slice(s, l) : t.slice(l, s)) : t = i ? t.slice(s) : t.slice(l) : f === n && (t = i ? t.slice(0, l) : t.slice(0, s)), c += t;
					} else !Ki(f) && !Yi(f) || f === n && this.isCollapsed() || (c += f.getTextContent());
				}
				return c;
			}
			applyDOMRange(t) {
				const e = _i(), n = e.getEditorState()._selection, o = Mr(t.startContainer, t.startOffset, t.endContainer, t.endOffset, e, n);
				if (null === o) return;
				const [r, i, s] = o;
				this.anchor.set(r.key, r.offset, r.type, !0), this.focus.set(i.key, i.offset, i.type, !0), s && (this.dirty = !0), It(this);
			}
			clone() {
				const t = this.anchor, e = this.focus;
				return new fr(or(t.key, t.offset, t.type), or(e.key, e.offset, e.type), this.format, this.style);
			}
			toggleFormat(t) {
				this.format = Ws(this.format, t, null), this.dirty = !0;
			}
			setFormat(t) {
				this.format = t, this.dirty = !0;
			}
			setStyle(t) {
				this.style = t, this.dirty = !0;
			}
			hasFormat(t) {
				const e = z$1[t];
				return 0 !== (this.format & e);
			}
			insertRawText(t) {
				this.insertNodes(qr(t));
			}
			insertText(e) {
				let n = this.format, o = this.style;
				if (!this.isCollapsed()) {
					const t = (this.focus.isBefore(this.anchor) ? this.focus : this.anchor).getNode();
					if (Xo(t) && (n = t.getFormat(), o = t.getStyle()), this.removeText(), this.format = n, this.style = o, "" === e) return;
					if (null === qs()) return "element" === this.anchor.type && sr(this.anchor, this.focus, n, o), void lr(this, e, n, o);
				}
				"element" === this.anchor.type && sr(this.anchor, this.focus, n, o);
				const r = this.anchor.getNode();
				Xo(r) || t(398);
				const i = this.anchor.offset, s = r.getParentOrThrow(), l = r.getTextContentSize();
				if (Ks(r) || 0 === i && (!r.canInsertTextBefore() || !s.canInsertTextBefore() && !r.__prev) || i === l && (!r.canInsertTextAfter() || !s.canInsertTextAfter() && !r.__next)) {
					if (r.isSegmented() && 0 !== i && i !== l) {
						if (null !== qs()) r.setMode("normal").setFormat(n).setStyle(o);
						else {
							const t = Go(r.getTextContent());
							t.setFormat(n), t.setStyle(o), r.replace(t), t.select(i, i);
						}
						"" !== e && this.insertText(e);
						return;
					}
					if ("" === e) return;
					if (0 === i) {
						const t = r.getPreviousSibling();
						if (Xo(t) && t.canInsertTextAfter() && !Ks(t)) t.select();
						else {
							const t = Go();
							t.setFormat(n), t.setStyle(o), s.canInsertTextBefore() ? r.insertBefore(t) : s.insertBefore(t), t.select();
						}
						this.insertText(e);
						return;
					}
					if (i === l) {
						const t = r.getNextSibling();
						if (Xo(t) && t.canInsertTextBefore() && !Ks(t)) t.select(0, 0);
						else {
							const t = Go();
							t.setFormat(n), t.setStyle(o), s.canInsertTextAfter() ? r.insertAfter(t) : s.insertAfter(t), t.select(0, 0);
						}
						this.insertText(e);
						return;
					}
					const t = Go(e);
					t.setFormat(n), t.setStyle(o), r.replace(t), t.select();
					return;
				}
				if ("" === e) return;
				const c = s.isInline() && 0 === i && !r.__prev, a = s.isInline() && i === l && !r.__next, u = r.getFormat() !== n || r.getStyle() !== o;
				if (c || a || u) {
					if ("" !== r.getTextContent() || c || a) return void lr(this, e, n, o);
					r.setFormat(n), r.setStyle(o);
				}
				r.spliceText(i, 0, e, !0), r.isComposing() && "text" === this.anchor.type && this.anchor.set(this.anchor.key, this.anchor.offset - e.length, this.anchor.type);
			}
			removeText() {
				const t = Kr() === this;
				ou(this, cu(ru(this))), t && Kr() !== this && ol(this);
			}
			formatText(t, e = null) {
				_r(this, t, e);
			}
			insertNodes(e) {
				if (0 === e.length) return;
				this.isCollapsed() || this.removeText();
				const n = this.anchor.getNode();
				if ("element" === this.anchor.type && Pi(n) && null !== ta(n)) {
					let o = n.isShadowRoot() ? n.getFirstChild() ?? n.append(es()).getFirstChild() : n.getFirstChild();
					if (n.isShadowRoot() && null !== o && !Pi(o)) {
						const t = es();
						o.insertBefore(t), o = t;
					}
					if (null !== o) {
						o.selectStart();
						const n = Kr();
						return ur(n) || t(369), n.insertNodes(e);
					}
				}
				if ("element" === this.anchor.type && Bl(n)) {
					const t = ti(e), o = t.getLastDescendant();
					n.splice(this.anchor.offset, 0, t.getChildren()), null !== o && o.selectEnd();
					return;
				}
				let o = (this.isBackward() ? this.focus : this.anchor).getNode(), r = qc(o, Sc);
				const i = e[e.length - 1];
				if (Pi(r) && "__language" in r) {
					if ("__language" in e[0]) this.insertText(e[0].getTextContent());
					else {
						const t = Xr(this);
						r.splice(t, 0, e), i.selectEnd();
					}
					return;
				}
				if (!e.some((t) => (Pi(t) || Ki(t)) && !t.isInline())) {
					Pi(r) || t(211, o.constructor.name, o.getType());
					const n = Xr(this);
					r.splice(n, 0, e), i.selectEnd();
					return;
				}
				if (Pi(r) && null !== ta(r)) {
					const t = Xr(this), n = Gr(e);
					r.splice(t, 0, n);
					const o = n[n.length - 1];
					void 0 !== o ? o.selectEnd() : r.select(t, t);
					return;
				}
				if (null === r) {
					const t = ti(e), n = t.getLastDescendant();
					let o = tu(this.anchor, "next");
					for (const e of t.getChildren()) o = mu(e, o);
					null !== n && n.selectEnd();
					return;
				}
				if (Pi(r) && !r.isParentRequired() && !Bl(r.getParentOrThrow())) {
					const t = Xr(this), n = Gr(e);
					r.splice(t, 0, n);
					const o = n[n.length - 1];
					void 0 !== o ? o.selectEnd() : r.select(t, t);
					return;
				}
				const s = ti(e), l = s.getLastDescendant(), c = s.getChildren(), a = !Pi(r) || !r.isEmpty() ? this.insertParagraph() : null;
				a && !r.isAttached() && (o = this.anchor.getNode(), r = qc(o, Sc));
				const u = c[c.length - 1];
				let f = c[0];
				var d;
				Pi(d = f) && Sc(d) && !d.isEmpty() && Pi(r) && (!r.isEmpty() || r.canMergeWhenEmpty()) && (Pi(r) || t(211, o.constructor.name, o.getType()), r.append(...f.getChildren()), f = c[1]), f && (null === r && t(212, o.constructor.name, o.getType()), function(e, n) {
					const o = n.getParentOrThrow().getLastChild();
					let r = n;
					const i = [n];
					for (; r !== o;) r.getNextSibling() || t(140), r = r.getNextSibling(), i.push(r);
					let s = e;
					for (const t of i) s = s.insertAfter(t);
				}(r, f));
				const h = qc(l, Sc);
				a && Pi(h) && (a.canMergeWhenEmpty() || Sc(u)) && (h.append(...a.getChildren()), a.remove()), Pi(r) && r.isEmpty() && r.remove(), l.selectEnd();
				const g = Pi(r) ? r.getLastChild() : null;
				Yi(g) && h !== r && g.remove();
			}
			insertParagraph() {
				const e = this.anchor.getNode();
				if ("element" === this.anchor.type && Bl(e)) {
					const t = es();
					return e.splice(this.anchor.offset, 0, [t]), t.select(), t;
				}
				const n = Xr(this), o = qc(this.anchor.getNode(), Sc);
				if (null !== o && null !== ta(o)) return null;
				Pi(o) || t(213);
				const r = o.getChildAtIndex(n), i = r ? [r, ...r.getNextSiblings()] : [], s = o.insertNewAfter(this, !1);
				return s ? (s.append(...i), s.selectStart(), s) : null;
			}
			insertLineBreak(t) {
				const e = qi();
				if (this.insertNodes([e]), t) {
					const t = e.getParentOrThrow(), n = e.getIndexWithinParent();
					t.select(n, n);
				}
			}
			extract() {
				const t = [...this.getNodes()], e = t.length;
				let n = t[0], o = t[e - 1];
				const [r, i] = yr(this), s = this.isBackward(), [l, c] = s ? [this.focus, this.anchor] : [this.anchor, this.focus], [a, u] = s ? [i, r] : [r, i];
				if (0 === e) return [];
				if (1 === e) {
					if (Xo(n) && !this.isCollapsed()) {
						const t = n.splitText(a, u), e = 0 === a ? t[0] : t[1];
						return e ? (l.set(e.getKey(), 0, "text"), c.set(e.getKey(), e.getTextContentSize(), "text"), [e]) : [];
					}
					return [n];
				}
				if (Xo(n) && (a === n.getTextContentSize() ? t.shift() : 0 !== a && ([, n] = n.splitText(a), t[0] = n, l.set(n.getKey(), 0, "text"))), Xo(o)) {
					const e = o.getTextContent().length;
					0 === u ? t.pop() : u !== e && ([o] = o.splitText(u), t[t.length - 1] = o, c.set(o.getKey(), o.getTextContentSize(), "text"));
				}
				return t;
			}
			modify(t, e, n) {
				if (ei(this, t, e, n)) return;
				const o = "move" === t, r = _i(), i = Jl(Il(r));
				if (!i) return;
				const s = r._blockCursorElement, l = r._rootElement, c = this.focus.getNode();
				null === l || null === s || !Pi(c) || c.isInline() || c.canBeEmpty() || jl(s, r, l);
				const a = El(r, this.focus.key);
				let u = a;
				if ("text" === this.focus.type && (u = Xo(c) ? wc(c, a, r) : null), this.dirty) {
					const t = El(r, this.anchor.key);
					let e = t;
					if ("text" === this.anchor.type) {
						const n = this.anchor.getNode();
						e = Xo(n) ? wc(n, t, r) : null;
					}
					e && u && Ur(i, e, this.anchor.offset, u, this.focus.offset);
				}
				if ("character" === n && Xo(c) && c.isUnmergeable()) {
					if (e ? 0 === this.focus.offset : this.focus.offset === c.getTextContentSize()) {
						const t = Ia(c, e ? "previous" : "next").getNodeAtCaret();
						if (Xo(t)) {
							if (!o) {
								const n = t.getTextContentSize();
								e ? this.focus.set(t.__key, n - 1, "text") : this.focus.set(t.__key, 1, "text"), this.dirty = !0;
								return;
							}
							{
								const n = r.getElementByKey(t.getKey()), o = n ? wc(t, n, r) : null;
								if (o) {
									const t = e ? o.length : 0;
									Ur(i, o, t, o, t);
								}
							}
						}
					}
				}
				if (Cr(i, t, e ? "backward" : "forward", n), i.rangeCount > 0) {
					const t = tc(i, r._rootElement), n = t || i.getRangeAt(0), s = this.anchor.getNode(), l = Bi(s) ? s : Kl(s);
					if (this.applyDOMRange(n), this.dirty = !0, !o) {
						Sr(this, e, l);
						(t ? "backward" !== i.direction : i.anchorNode === n.startContainer && i.anchorOffset === n.startOffset) || xr(this);
					}
				}
				"lineboundary" === n && ei(this, t, e, n, "decorators");
			}
			forwardDeletion(t, e, n) {
				if (!n && ("element" === t.type && Pi(e) && t.offset === e.getChildrenSize() || "text" === t.type && t.offset === e.getTextContentSize())) {
					const t = e.getParent(), n = e.getNextSibling() || (null === t ? null : t.getNextSibling());
					if (Pi(n) && n.isShadowRoot()) return !0;
				}
				return !1;
			}
			deleteCharacter(t) {
				const e = this.isCollapsed();
				if (this.isCollapsed()) {
					const e = this.anchor;
					let n = e.getNode();
					if (this.forwardDeletion(e, n, t)) return;
					const o = ja(tu(e, t ? "previous" : "next"));
					if (o.getTextSlices().every((t) => null === t || 0 === t.distance)) {
						let t = { type: "initial" };
						for (const e of o.iterNodeCarets("shadowRoot")) if (Aa(e)) if (e.origin.isInline());
						else {
							if (e.origin.isShadowRoot()) {
								if ("merge-block" === t.type) break;
								if (Pi(o.anchor.origin) && o.anchor.origin.isEmpty()) {
									const t = au(e);
									ou(this, Va(t, t)), o.anchor.origin.remove();
								}
								return;
							}
							"merge-next-block" !== t.type && "merge-block" !== t.type || (t = {
								block: t.block,
								caret: e,
								type: "merge-block"
							});
						}
						else {
							if ("merge-block" === t.type) break;
							if (Ma(e)) {
								if (Pi(e.origin)) {
									if (e.origin.isInline()) {
										if (!e.origin.isParentOf(o.anchor.origin)) break;
									} else t = {
										block: e.origin,
										type: "merge-next-block"
									};
									continue;
								}
								if (Ki(e.origin)) {
									if (e.origin.isIsolated());
									else if (ia(e.origin).length > 0) {
										if (Pi(o.anchor.origin) && o.anchor.origin.isEmpty()) {
											o.anchor.origin.remove();
											const t = Pr();
											t.add(e.origin.getKey()), ol(t);
										}
									} else if ("merge-next-block" === t.type && (e.origin.isKeyboardSelectable() || !e.origin.isInline()) && Pi(o.anchor.origin) && o.anchor.origin.isEmpty()) {
										o.anchor.origin.remove();
										const t = Pr();
										t.add(e.origin.getKey()), ol(t);
									} else e.origin.remove();
									return;
								}
								break;
							}
						}
						if ("merge-block" === t.type) {
							const { caret: e, block: n } = t;
							if (ia(n).length > 0) return;
							return e.origin.isEmpty() && !n.isEmpty() && e.origin.getParent() === n.getParent() ? void e.origin.remove(!0) : (ou(this, Va(!e.origin.isEmpty() && n.isEmpty() ? iu(Ia(n, e.direction)) : o.anchor, e)), this.removeText());
						}
						for (let t = e.getNode(); null !== t;) {
							if (null !== ta(t)) return;
							if (Pi(t) && t.isShadowRoot()) break;
							t = t.getParent();
						}
					}
					const r = this.focus;
					if (vr(this, t, "character"), this.isCollapsed()) {
						if (t && 0 === e.offset && mr(this, e.getNode())) return;
					} else {
						const o = "text" === r.type ? r.getNode() : null;
						if (n = "text" === e.type ? e.getNode() : null, null !== o && o.isSegmented()) {
							const e = r.offset, i = o.getTextContentSize();
							if (o.is(n) || t && e !== i || !t && 0 !== e) return void kr(o, t, e);
						} else if (null !== n && n.isSegmented()) {
							const r = e.offset, i = n.getTextContentSize();
							if (n.is(o) || t && 0 !== r || !t && r !== i) return void kr(n, t, r);
						}
						(function(t, e) {
							const n = t.anchor, o = t.focus, r = n.getNode();
							if (r === o.getNode() && "text" === n.type && "text" === o.type) {
								const t = n.offset, i = o.offset, s = t < i, l = s ? t : i, c = s ? i : t, a = c - 1;
								if (l !== a) (function(t) {
									return !(sl(t) || Tr(t));
								})(r.getTextContent().slice(l, c)) && (e ? o.set(o.key, a, o.type) : n.set(n.key, a, n.type));
							}
						})(this, t);
					}
				}
				if (this.removeText(), t && !e && this.isCollapsed() && "element" === this.anchor.type && 0 === this.anchor.offset) {
					const t = this.anchor.getNode();
					t.isEmpty() && Bi(t.getParent()) && null === t.getPreviousSibling() && mr(this, t), ar();
				}
			}
			deleteLine(t) {
				const e = Er(this.anchor);
				if (null !== e && Ki(ea(e))) return this.isCollapsed() || this.focus.set(this.anchor.key, this.anchor.offset, this.anchor.type), void this.deleteCharacter(t);
				if (this.isCollapsed() && vr(this, t, "lineboundary"), this.isCollapsed()) this.deleteCharacter(t);
				else qc(this.anchor.getNode(), Sc) !== qc(this.focus.getNode(), Sc) ? (this.focus.set(this.anchor.key, this.anchor.offset, this.anchor.type), this.deleteCharacter(t)) : this.removeText();
			}
			deleteWord(t) {
				if (this.isCollapsed()) {
					const e = this.anchor, n = e.getNode();
					if (this.forwardDeletion(e, n, t)) return;
					vr(this, t, "word");
				}
				this.isCollapsed() ? this.deleteCharacter(t) : this.removeText();
			}
			isBackward() {
				const t = this._cachedIsBackward;
				if (null !== t) return t;
				const e = this.focus.isBefore(this.anchor);
				return ui() || (this._cachedIsBackward = e), e;
			}
			getStartEndPoints() {
				return [this.anchor, this.focus];
			}
		};
		function dr(t) {
			return t instanceof cr;
		}
		function hr(t, e) {
			if (dr(t)) {
				for (const n of t.getNodes()) Ro(n) && n.setFormat(e(n.getFormat()));
				return;
			}
			if (t.isCollapsed()) return t.setFormat(e(t.format)), void Vs(null);
			const n = [];
			for (const o of t.getNodes()) Xo(o) ? n.push(o) : Pi(o) ? o.setTextFormat(e(o.getTextFormat())) : Ro(o) && o.setFormat(e(o.getFormat()));
			const o = n.length;
			if (0 === o) return t.setFormat(e(t.format)), void Vs(null);
			const r = t.anchor, i = t.focus, s = t.isBackward(), l = s ? i : r, c = s ? r : i;
			let a = 0, u = n[0], f = "element" === l.type ? 0 : l.offset;
			if ("text" === l.type && f === u.getTextContentSize() && (a = 1, u = n[1], f = 0), null == u) return;
			const d = o - 1;
			let h = n[d];
			const g = "text" === c.type ? c.offset : h.getTextContentSize();
			if (u.is(h)) {
				if (f === g) return;
				const n = e(u.getFormat());
				if (Ks(u) || 0 === f && g === u.getTextContentSize()) u.setFormat(n);
				else {
					const t = u.splitText(f, g), e = 0 === f ? t[0] : t[1];
					e.setFormat(n), "text" === l.type && l.set(e.__key, 0, "text"), "text" === c.type && c.set(e.__key, g - f, "text");
				}
				t.format = n;
				return;
			}
			0 === f || Ks(u) || ([, u] = u.splitText(f), f = 0);
			const _ = e(u.getFormat());
			u.setFormat(_);
			const p = e(h.getFormat());
			g > 0 && (g === h.getTextContentSize() || Ks(h) || ([h] = h.splitText(g)), h.setFormat(p));
			for (let t = a + 1; t < d; t++) {
				const o = n[t];
				o.setFormat(e(o.getFormat()));
			}
			"text" === l.type && l.set(u.__key, f, "text"), "text" === c.type && c.set(h.__key, g, "text"), t.format = _ | p;
		}
		function _r(t, e, n = null) {
			const o = null === n && ur(t) ? Ws(t.format, e, null) : n;
			hr(t, (t) => Ws(t, e, o));
		}
		function pr(t) {
			const e = t.offset;
			if ("text" === t.type) return e;
			const n = t.getNode();
			return e === n.getChildrenSize() ? n.getTextContent().length : 0;
		}
		function yr(t) {
			const e = t.getStartEndPoints();
			if (null === e) return [0, 0];
			const [n, o] = e;
			return "element" === n.type && "element" === o.type && n.key === o.key && n.offset === o.offset ? [0, 0] : [pr(n), pr(o)];
		}
		function mr(t, e) {
			for (let n = e; n; n = n.getParent()) {
				if (Pi(n)) {
					if (n.collapseAtStart(t)) return !0;
					if (Bl(n)) break;
				}
				if (n.getPreviousSibling()) break;
			}
			return !1;
		}
		function xr(t) {
			const e = t.focus, n = t.anchor, o = n.key, r = n.offset, i = n.type;
			n.set(e.key, e.offset, e.type, !0), e.set(o, r, i, !0);
		}
		function Cr(t, e, n, o) {
			t.modify(e, n, o);
		}
		function Sr(t, e, n) {
			const o = t.getNodes(), r = o.filter((t) => Fl(t, n));
			if (0 === r.length || r.length === o.length) return !1;
			const i = e ? r[0] : r[r.length - 1], s = Pi(i) ? i : i.getParentOrThrow();
			return e ? s.selectStart() : s.selectEnd(), !0;
		}
		function vr(t, e, n) {
			if (ei(t, "extend", e, n)) return;
			const o = _i(), r = Jl(Il(o));
			if (!r || "function" != typeof r.modify) return;
			const i = o._blockCursorElement, s = o._rootElement, l = t.anchor, c = t.focus.getNode();
			null === s || null === i || !Pi(c) || c.isInline() || c.canBeEmpty() || jl(i, o, s);
			const a = (t) => {
				const e = t.getNode(), n = o.getElementByKey(t.key);
				return null !== n && "text" === t.type && Xo(e) ? wc(e, n, o) : n;
			}, u = l.getNode(), f = a(l);
			if (null === f) return;
			const d = l.offset, h = t.isCollapsed(), g = t.focus, _ = h ? f : a(g);
			if (null === _) return;
			const p = g.offset;
			if (Ur(r, _, p, _, p), Cr(r, "move", e ? "backward" : "forward", n), 0 === r.rangeCount) return;
			const y = tc(r, s) || r.getRangeAt(0), m = y.startContainer, x = y.startOffset;
			if (h && "character" === n && "text" === l.type && Xo(u) && u.isUnmergeable()) {
				if (d === (e ? 0 : u.getTextContentSize())) {
					const n = Ia(u, e ? "previous" : "next").getNodeAtCaret();
					if (Xo(n)) {
						const o = e ? n.getTextContentSize() - 1 : 1;
						t.focus.set(n.__key, o, "text"), t.dirty = !0;
						return;
					}
				}
			}
			if (h && "character" === n && "text" === l.type) {
				const n = e ? 0 : u.getTextContentSize(), o = m === f ? x : d !== n ? n : -1;
				if (o >= 0) return void (o !== d && (t.focus.set(l.key, o, "text"), t.dirty = !0));
			}
			const [C, S, v, T] = e ? [
				m,
				x,
				f,
				d
			] : [
				f,
				d,
				m,
				x
			], k = Bi(u) ? u : Kl(u);
			t.applyDOMRange({
				collapsed: !1,
				endContainer: v,
				endOffset: T,
				startContainer: C,
				startOffset: S
			}), t.dirty = !0, !Sr(t, e, k) && e && xr(t), "lineboundary" === n && ei(t, "extend", e, n, "decorators");
		}
		const Tr = (() => {
			try {
				const t = /* @__PURE__ */ new RegExp("\\p{Emoji}", "u"), e = t.test.bind(t);
				if (e("❤️") && e("#️⃣") && e("👍")) return e;
			} catch (t) {}
			return () => !1;
		})();
		function kr(t, e, n) {
			const o = t, r = o.getTextContent().split(/(?=\s)/g), i = r.length;
			let s = 0, l = 0;
			for (let t = 0; t < i; t++) {
				const o = t === i - 1;
				if (l = s, s += r[t].length, e && s === n || s > n || o) {
					r.splice(t, 1), o && (l = void 0);
					break;
				}
			}
			const c = r.join("").trim();
			"" === c ? o.remove() : (o.setTextContent(c), o.select(l, l));
		}
		function br(e, n, o, r) {
			let i, s = n, l = !1;
			if (gc(e)) {
				let c = !1;
				const a = e.childNodes, u = a.length, f = r._blockCursorElement;
				s === u && u > 0 && (c = !0, s = u - 1), void 0 !== Qs(e, r) || Rc(e, r) || (l = !0);
				let d = a[s], h = !1;
				if (d === f) d = a[s + 1], h = !0;
				else if (null !== f) {
					const t = f.parentNode;
					if (e === t) n > Array.prototype.indexOf.call(t.children, f) && s--;
				}
				if (i = il(d), Xo(i)) s = Ka(i, c ? "next" : "previous");
				else {
					let a = il(e);
					if (null === a) return null;
					if (Pi(a)) {
						const l = r.getElementByKey(a.getKey());
						null === l && t(214);
						const u = kc(a, l, r);
						[a, s] = u.resolveChildIndex(a, l, e, n), Pi(a) || t(215), c && s >= a.getChildrenSize() && (s = Math.max(0, a.getChildrenSize() - 1));
						let f = a.getChildAtIndex(s);
						if (Pi(f) && function(t, e, n) {
							const o = t.getParent();
							return null === n || null === o || !o.canBeEmpty() || o !== n.getNode();
						}(f, 0, o)) {
							const t = c ? f.getLastDescendant() : f.getFirstDescendant();
							null === t ? a = f : (f = t, a = Pi(f) ? f : f.getParentOrThrow()), s = 0;
						}
						Xo(f) ? (i = f, a = null, s = Ka(f, c ? "next" : "previous")) : f !== a && c && !h && (Pi(a) || t(216), s = Math.min(a.getChildrenSize(), s + 1));
					} else {
						const t = ea(a), o = null !== t ? t : a, i = o.getIndexWithinParent(), l = r.getElementByKey(a.getKey());
						let c = "after";
						if (null !== l && il(e) === a) {
							const t = kc(a, l, r);
							t.element !== l ? c = t.resolveLeafPosition(l, e, n) : 0 === n && Ki(a) && (c = "before");
						}
						s = "before" === c ? i : i + 1, a = o.getParentOrThrow();
					}
					if (Pi(a)) return [or(a.__key, s, "element"), l];
				}
			} else i = il(e);
			return Xo(i) ? [or(i.__key, Ka(i, s, "clamp"), "text"), l] : null;
		}
		function Nr(t, e, n) {
			const o = t.offset, r = t.getNode();
			if (0 === o) {
				const o = r.getPreviousSibling(), i = r.getParent();
				if (e) {
					if ((n || !e) && null === o && Pi(i) && i.isInline()) {
						const e = i.getPreviousSibling();
						Xo(e) && t.set(e.__key, e.getTextContent().length, "text");
					}
				} else Pi(o) && !n && o.isInline() ? t.set(o.__key, o.getChildrenSize(), "element") : Xo(o) && !r.isUnmergeable() && t.set(o.__key, o.getTextContent().length, "text");
			} else if (o === r.getTextContent().length) {
				const o = r.getNextSibling(), i = r.getParent();
				if (e && Pi(o) && o.isInline()) t.set(o.__key, 0, "element");
				else if ((n || e) && null === o && Pi(i) && i.isInline() && !i.canInsertTextAfter() && i.getTextContentSize() > 1) {
					const e = i.getNextSibling();
					Xo(e) && t.set(e.__key, 0, "text");
				}
			}
		}
		function Er(t) {
			const e = Ys(t.key);
			return null === e ? null : oa(e);
		}
		function wr(t, e, n) {
			const o = Er(t), r = Er(e);
			if (o === r || null !== o && null !== r && o.is(r)) return !1;
			const i = n(o, r);
			if (null !== o) return Pi(o) ? e.set(o.getKey(), i ? o.getChildrenSize() : 0, "element") : e.set(o.getKey(), i ? o.getTextContentSize() : 0, "text"), !0;
			const s = ea(r);
			if (null === s) return !1;
			const l = s.getParent();
			if (null === l) return !1;
			const c = s.getIndexWithinParent();
			return e.set(l.getKey(), i ? c + 1 : c, "element"), !0;
		}
		function Or(t) {
			const e = wr(t.anchor, t.focus, (e, n) => function(t, e, n, o) {
				if (null !== n && null !== o) {
					const t = ea(n), e = ea(o);
					if (null !== t && t.is(e)) {
						for (const e of ra(t).values()) {
							if (e === n.getKey()) return !0;
							if (e === o.getKey()) return !1;
						}
						return !0;
					}
					return null === t || null === e || t.isBefore(e);
				}
				if (null !== n) {
					const t = ea(n), o = Ys(e.key);
					return null === t || null === o || !(!t.is(o) && !t.isParentOf(o)) || t.isBefore(o);
				}
				const r = ea(o), i = Ys(t.key);
				return null !== r && null !== i && !r.is(i) && !r.isParentOf(i) && i.isBefore(r);
			}(t.anchor, t.focus, e, n));
			return e && (t.dirty = !0), e;
		}
		function Mr(t, e, n, o, r, i) {
			if (null === t || null === n || !As(r, t, n)) return null;
			const s = br(t, e, ur(i) ? i.anchor : null, r);
			if (null === s) return null;
			const l = br(n, o, ur(i) ? i.focus : null, r);
			if (null === l) return null;
			const [c, a] = s, [u, f] = l;
			if ("element" === c.type && "element" === u.type) {
				const e = il(t), o = il(n);
				if (Ki(e) && Ki(o)) return null;
			}
			const d = r._slotsUsed && wr(c, u, () => 0 !== (t.compareDocumentPosition(n) & Node.DOCUMENT_POSITION_FOLLOWING));
			return function(t, e) {
				if ("text" === t.type && "text" === e.type) {
					const n = t.isBefore(e), o = t.is(e);
					Nr(t, n, o), Nr(e, !n, o), o && e.set(t.key, t.offset, t.type);
				}
			}(c, u), [
				c,
				u,
				a || f || d
			];
		}
		function Ar(t) {
			return Pi(t) && !t.isInline();
		}
		function Dr(t, e, n, o, r, i) {
			const s = hi(), l = new fr(or(t, e, r), or(n, o, i), 0, "");
			return l.dirty = !0, s._selection = l, l;
		}
		function Fr() {
			return new fr(or("root", 0, "element"), or("root", 0, "element"), 0, "");
		}
		function Pr() {
			return new cr(/* @__PURE__ */ new Set());
		}
		function Lr(t, e, n, o) {
			const r = n._window;
			if (null === r) return null;
			const i = o || r.event, s = i ? i.type : void 0, l = "selectionchange" === s, c = !it$1 && (l || "beforeinput" === s || "compositionstart" === s || "compositionend" === s || "click" === s && i && 3 === i.detail || "drop" === s || void 0 === s);
			let a, u, f, d;
			if (ur(t) && !c) return t.clone();
			{
				if (null === e) return null;
				const o = nc(e, n._rootElement);
				if (a = o.anchorNode, u = o.focusNode, f = o.anchorOffset, d = o.focusOffset, (l || void 0 === s) && ur(t) && !As(n, a, u)) return t.clone();
			}
			const h = Mr(a, f, u, d, n, t);
			if (null === h) return null;
			const [g, _, p] = h;
			let y = 0, m = "";
			if (ur(t)) {
				const e = t.anchor;
				if (g.key === e.key) y = t.format, m = t.style;
				else {
					const t = g.getNode();
					Xo(t) ? (y = t.getFormat(), m = t.getStyle()) : Pi(t) && (y = t.getTextFormat(), m = t.getTextStyle());
				}
			}
			const x = new fr(g, _, y, m);
			return p && (x.dirty = !0), x;
		}
		function Kr() {
			return hi()._selection;
		}
		function zr() {
			return _i()._editorState._selection;
		}
		function Br(t, e, n, o = 1) {
			const r = t.anchor, i = t.focus, s = r.getNode(), l = i.getNode();
			if (!e.is(s) && !e.is(l)) return;
			const c = e.__key;
			if (t.isCollapsed()) {
				const e = r.offset;
				if (n <= e && o > 0 || n < e && o < 0) {
					const n = Math.max(0, e + o);
					r.set(c, n, "element"), i.set(c, n, "element"), Rr(t);
				}
			} else {
				const s = t.isBackward(), l = s ? i : r, a = l.getNode(), u = s ? r : i, f = u.getNode();
				if (e.is(a)) {
					const t = l.offset;
					(n <= t && o > 0 || n < t && o < 0) && l.set(c, Math.max(0, t + o), "element");
				}
				if (e.is(f)) {
					const t = u.offset;
					(n <= t && o > 0 || n < t && o < 0) && u.set(c, Math.max(0, t + o), "element");
				}
			}
			Rr(t);
		}
		function Rr(t) {
			const e = t.anchor, n = e.offset, o = t.focus, r = o.offset, i = e.getNode(), s = o.getNode();
			if (t.isCollapsed()) {
				if (!Pi(i)) return;
				const t = i.getChildrenSize(), r = n >= t, s = r ? i.getChildAtIndex(t - 1) : i.getChildAtIndex(n);
				if (Xo(s)) {
					let t = 0;
					r && (t = s.getTextContentSize()), e.set(s.__key, t, "text"), o.set(s.__key, t, "text");
				}
				return;
			}
			if (Pi(i)) {
				const t = i.getChildrenSize(), o = n >= t, r = o ? i.getChildAtIndex(t - 1) : i.getChildAtIndex(n);
				if (Xo(r)) {
					let t = 0;
					o && (t = r.getTextContentSize()), e.set(r.__key, t, "text");
				}
			}
			if (Pi(s)) {
				const t = s.getChildrenSize(), e = r >= t, n = e ? s.getChildAtIndex(t - 1) : s.getChildAtIndex(r);
				if (Xo(n)) {
					let t = 0;
					e && (t = n.getTextContentSize()), o.set(n.__key, t, "text");
				}
			}
		}
		function Wr(t, e, n, o, r) {
			let i = null, s = 0, l = null;
			null !== o ? (i = o.__key, Xo(o) ? (s = o.getTextContentSize(), l = "text") : Pi(o) && (s = o.getChildrenSize(), l = "element")) : null !== r && (i = r.__key, Xo(r) ? l = "text" : Pi(r) && (l = "element")), null !== i && null !== l ? t.set(i, s, l) : (s = e.getIndexWithinParent(), -1 === s && (s = n.getChildrenSize()), t.set(n.__key, s, "element"));
		}
		function $r(t, e, n, o, r) {
			"text" === t.type ? t.set(n, t.offset + (e ? 0 : r), "text") : t.offset > o.getIndexWithinParent() && t.set(t.key, t.offset - 1, "element");
		}
		function Ur(t, e, n, o, r) {
			try {
				t.setBaseAndExtent(e, n, o, r);
			} catch (t) {}
		}
		function Hr(t, e, n) {
			const o = El(t, e.getKey());
			if (Pi(e)) {
				const r = kc(e, o, t);
				return [r.element, n + r.getFirstChildOffset()];
			}
			return [o, n];
		}
		function jr(t, e, n, o, r, s) {
			const l = s.getRootNode(), c = Bs(l) || ql(l) ? cc(l) : null;
			if (r.has("collaboration") && c !== s || null !== c && Os(c, c)) return;
			const a = nc(o, s);
			let u;
			if (!ur(e)) return void (null !== t && As(n, a.anchorNode, a.focusNode) && o.removeAllRanges());
			const f = e.anchor, d = e.focus, h = f.getNode(), g = d.getNode(), [_, p] = Hr(n, h, f.offset), [y, m] = Hr(n, g, d.offset), x = e.format, C = e.style, S = e.isCollapsed();
			let v = _, T = y, k = !1;
			if ("text" === f.type ? (v = Xo(h) ? wc(h, _, n) : null, k = h.getFormat() !== x || h.getStyle() !== C) : ur(t) && "text" === t.anchor.type && (k = !0), "text" === d.type && (T = Xo(g) ? wc(g, y, n) : null), null !== v && null !== T) {
				if (S && (null === t || k || ur(t) && (t.format !== x || t.style !== C)) && function(t, e, n, o, r, i) {
					t._inputState.collapsedSelectionFormat = {
						format: e,
						key: r,
						offset: o,
						style: n,
						timeStamp: i
					};
				}(n, x, C, p, f.key, performance.now()), ("Range" !== o.type || !S) && a.anchorOffset === p && a.focusOffset === m && a.anchorNode === v && a.focusNode === T) {
					if (null === c || !s.contains(c)) {
						const t = null !== c ? Fs(c) : null;
						null !== t && t !== n || r.has("skip-selection-focus") || s.focus({ preventScroll: !0 });
					}
					if ("element" !== f.type) return;
				}
				if (Ur(o, v, p, T, m), i && e.isCollapsed() && null !== s && !r.has("skip-selection-focus")) {
					const t = lc(s);
					if (null === t || !s.contains(t)) {
						const t = cc(s.ownerDocument), e = null !== t ? Fs(t) : null;
						null !== e && e !== n || s.focus({ preventScroll: !0 });
					}
				}
				if (!r.has("skip-scroll-into-view") && e.isCollapsed() && null !== s && s === lc(s)) {
					const t = ur(e) && "element" === e.anchor.type ? v.childNodes[p] || null : (void 0 === u && (u = ec(o, s)), u);
					if (null !== t) {
						let e;
						if (zs(t)) {
							const n = t.ownerDocument.createRange();
							n.selectNode(t), e = n.getBoundingClientRect();
						} else e = t.getBoundingClientRect();
						(function(t, e, n) {
							const o = Ol(n), r = Pl(o);
							if (null === o || null === r) return;
							const i = n.getBoundingClientRect();
							if (e.bottom < i.top) return;
							let { top: s, bottom: l } = e, c = 0, a = 0, u = n;
							for (; null !== u;) {
								const e = u === o.body;
								if (e) {
									const e = r.visualViewport;
									if (e) {
										const t = e.offsetTop;
										c = t, a = t + e.height;
									} else c = 0, a = Il(t).innerHeight;
									const n = r.getComputedStyle(o.documentElement), i = parseFloat(n.scrollPaddingTop), s = parseFloat(n.scrollPaddingBottom);
									isFinite(i) && (c += i), isFinite(s) && (a -= s);
								} else {
									const t = u === n ? i : u.getBoundingClientRect();
									c = t.top, a = t.bottom;
								}
								let f = 0;
								if (s < c ? f = -(c - s) : l > a && (f = l - a), 0 !== f) if (e) r.scrollBy(0, f);
								else {
									const t = u.scrollTop;
									u.scrollTop += f;
									const e = u.scrollTop - t;
									s -= e, l -= e;
								}
								if (e) break;
								u = wl(u);
							}
						})(n, e, s);
					}
				}
				(function(t) {
					t._inputState.isSelectionChangeFromDOMUpdate = !0;
				})(n);
			}
		}
		function Vr(t, e) {
			for (const n of t.split(/(\r?\n|\t)/)) "\n" === n || "\r\n" === n ? e.linebreak() : "	" === n ? e.tab() : "" !== n && e.text(n);
		}
		function qr(t) {
			const e = [];
			return Vr(t, {
				linebreak: () => e.push(qi()),
				tab: () => e.push(tr()),
				text: (t) => e.push(Go(t))
			}), e;
		}
		function Gr(t) {
			const e = [];
			for (const n of t) Yi(n) || (!Pi(n) && !Ki(n) || n.isInline() ? e.push(n) : Pi(n) && e.push(...Gr(n.getChildren())));
			return e;
		}
		function Xr(e) {
			let n = e;
			e.isCollapsed() || n.removeText();
			const o = Kr();
			ur(o) && (n = o), ur(n) || t(161);
			const r = n.anchor;
			let i = r.getNode(), s = r.offset;
			for (; !Sc(i) && null === ta(i);) {
				const t = i;
				if ([i, s] = Qr(i, s), t.is(i)) break;
			}
			return s;
		}
		function Qr(t, e) {
			const n = t.getParent();
			if (!n) {
				const t = es();
				return nl().append(t), t.select(), [nl(), 0];
			}
			if (Xo(t)) {
				const o = t.splitText(e);
				if (0 === o.length) return [n, t.getIndexWithinParent()];
				const r = 0 === e ? 0 : 1;
				return [n, o[0].getIndexWithinParent() + r];
			}
			if (!Pi(t) || 0 === e) return [n, t.getIndexWithinParent()];
			const o = t.getChildAtIndex(e);
			if (o) {
				const n = new fr(or(t.__key, e, "element"), or(t.__key, e, "element"), 0, ""), r = t.insertNewAfter(n);
				r && r.append(o, ...o.getNextSiblings());
			}
			return [n, t.getIndexWithinParent() + 1];
		}
		function Zr(t) {
			return Yi(t) || Ll(t) || Xo(t) || t.isParentRequired();
		}
		function ti(t) {
			const e = es();
			let n = null;
			for (let o = 0; o < t.length; o++) {
				const r = t[o];
				if (Zr(r)) {
					if (null === n) {
						n = r.createParentElementNode(), e.append(n);
						const i = t[o + 1];
						if (Yi(r) && (void 0 === i || !Zr(i))) continue;
					}
					n.append(r);
				} else e.append(r), n = null;
			}
			return e;
		}
		function ei(t, e, n, o, r = "decorators-and-blocks") {
			if ("move" === e && "character" === o && !t.isCollapsed()) {
				const [e, o] = n === t.isBackward() ? [t.focus, t.anchor] : [t.anchor, t.focus];
				return o.set(e.key, e.offset, e.type), !0;
			}
			const i = tu(t.focus, n ? "previous" : "next"), s = "lineboundary" === o, l = "move" === e;
			let c = i, a = "decorators-and-blocks" === r;
			if (!uu(c)) {
				for (const t of c) {
					a = !1;
					const { origin: e } = t;
					if (!Ki(e) || e.isIsolated() || (c = t, !s || !e.isInline())) break;
				}
				if (a) for (const t of ja(i).iterNodeCarets("extend" === e ? "shadowRoot" : "root")) {
					if (Aa(t)) t.origin.isInline() || (c = t);
					else {
						if (Pi(t.origin)) continue;
						Ki(t.origin) && !t.origin.isInline() && (c = t);
					}
					break;
				}
			}
			if (c === i) return !1;
			if (l && !s && Ki(c.origin) && c.origin.isKeyboardSelectable()) {
				const t = Pr();
				return t.add(c.origin.getKey()), ol(t), !0;
			}
			return c = au(c), l && eu(t.anchor, c), eu(t.focus, c), a || !s;
		}
		let ni = null, oi = null, ri = !1, ii = !1, si = !1;
		const li = /* @__PURE__ */ new Set();
		let ci = 0;
		const ai = {
			characterData: !0,
			childList: !0,
			subtree: !0
		};
		function ui() {
			return ri || null !== ni && ni._readOnly;
		}
		function fi() {
			ri && t(13);
		}
		function di() {
			ci > 99 && t(14);
		}
		function hi() {
			return null === ni && t(195, yi()), ni;
		}
		function gi(t) {
			null !== hi() && null === oi && (oi = t), oi !== t && e(378);
		}
		function _i() {
			return null === oi && t(337, yi()), oi;
		}
		function pi() {
			_i()._dirtyType = 2;
		}
		function yi() {
			let t = 0;
			const e = /* @__PURE__ */ new Set(), n = Cs.version;
			if ("undefined" != typeof window) for (const o of Xl(document)) {
				const r = Ps(o);
				if (Ds(r)) t++;
				else if (r) {
					let t = String(r.constructor.version || "<0.17.1");
					t === n && (t += " (separately built, likely a bundler configuration issue)"), e.add(t);
				}
			}
			let o = ` Detected on the page: ${t} compatible editor(s) with version ${n}`;
			return e.size && (o += ` and incompatible editors with versions ${Array.from(e).join(", ")}`), o;
		}
		function mi() {
			return oi;
		}
		function xi(t, e, n) {
			const o = e.__type, r = Ns(t, o);
			let i = n.get(o);
			void 0 === i && (i = Array.from(r.transforms), n.set(o, i));
			const s = i.length;
			for (let t = 0; t < s && (i[t](e), e.isAttached()); t++);
		}
		function Ci(t, e) {
			return void 0 !== t && t.__key !== e && t.isAttached();
		}
		function Si(t, e) {
			if (!e) return;
			const n = t._updateTags;
			let o = e;
			Array.isArray(e) || (o = [e]);
			for (const t of o) n.add(t);
		}
		function Ti(e, n) {
			const o = e.type, r = n.get(o);
			void 0 === r && t(17, o);
			const i = r.klass;
			e.type !== i.getType() && t(18, i.name);
			const s = i.importJSON(e), l = e.children;
			if (Pi(s) && Array.isArray(l)) for (let t = 0; t < l.length; t++) {
				const e = Ti(l[t], n);
				s.append(e);
			}
			const c = e.$slots;
			if (c) {
				Qc(s) || t(379, i.name);
				for (const t in c) pa(s, t, Ti(c[t], n));
			}
			return s;
		}
		function ki(t, e, n) {
			const o = ni, r = ri, i = oi;
			ni = e, ri = !0, oi = t;
			try {
				return n();
			} finally {
				ni = o, ri = r, oi = i;
			}
		}
		function bi(t, e) {
			const n = si;
			si = !0;
			try {
				(function(t, e) {
					const n = t._pendingEditorState, o = t._rootElement, r = t._headless || null === o;
					if (null === n) return void (!t._updating && t._deferred.length > 0 && wi(t, t._deferred));
					const i = t._editorState, s = i._selection, l = n._selection, c = 0 !== t._dirtyType, a = ni, u = ri, f = oi, d = t._updating, h = t._observer;
					let g = null;
					if (t._pendingEditorState = null, t._editorState = n, !r && c && null !== h) {
						oi = t, ni = n, ri = !1, t._updating = !0;
						try {
							const e = t._dirtyType, o = t._dirtyElements, r = t._dirtyLeaves;
							h.disconnect(), g = De$2(i, n, t, e, o, r);
						} catch (e) {
							if (e instanceof Error && t._onError(e), ii) throw e;
							gs(t, null, o, n), gt$1(t), t._dirtyType = 2, ii = !0, bi(t, i), ii = !1;
							return;
						} finally {
							h.observe(o, ai), t._updating = d, ni = a, ri = u, oi = f;
						}
					}
					n._readOnly || (n._readOnly = !0);
					const _ = t._dirtyLeaves, p = t._dirtyElements, y = t._normalizedNodes, m = t._updateTags;
					c && (t._dirtyType = 0, t._cloneNotNeeded.clear(), t._dirtyLeaves = /* @__PURE__ */ new Set(), t._dirtyElements = /* @__PURE__ */ new Map(), t._normalizedNodes = /* @__PURE__ */ new Set());
					t._updateTags = /* @__PURE__ */ new Set(), function(t, e) {
						const n = t._decorators;
						let o = t._pendingDecorators || n;
						const r = e._nodeMap;
						let i;
						for (i in o) r.has(i) || (o === n && (o = tl(t)), delete o[i]);
					}(t, n);
					const x = r ? null : Jl(Il(t));
					if (t._editable && null !== x && (c || null === l || l.dirty || !l.is(s)) && null !== o && !m.has("skip-dom-selection")) {
						oi = t, ni = n;
						try {
							if (null !== h && h.disconnect(), c || null === l || l.dirty) {
								const e = t._blockCursorElement;
								null !== e && jl(e, t, o), jr(s, l, t, x, m, o);
							}
							(function(t, e, n) {
								let o = t._blockCursorElement;
								if (ur(n) && n.isCollapsed() && "element" === n.anchor.type && e.contains(lc(e))) {
									const r = n.anchor, i = r.getNode(), s = r.offset;
									let l = !1, c = null;
									if (s === i.getChildrenSize()) Hl(i.getChildAtIndex(s - 1)) && (l = !0);
									else {
										const e = i.getChildAtIndex(s);
										if (null !== e && Hl(e)) {
											const n = e.getPreviousSibling();
											(null === n || Hl(n)) && (l = !0, c = t.getElementByKey(e.__key));
										}
									}
									if (l) {
										const n = kc(i, t.getElementByKey(i.__key), t).element;
										null === o && (t._blockCursorElement = o = function(t) {
											const e = t.theme, n = Zl().createElement("div");
											n.contentEditable = "false", n.setAttribute("data-lexical-cursor", "true");
											let o = e.blockCursor;
											if (void 0 !== o) {
												if ("string" == typeof o) o = e.blockCursor = ku(o);
												void 0 !== o && n.classList.add(...o);
											}
											return n;
										}(t._config)), e.style.caretColor = "transparent", null === c ? n.appendChild(o) : n.insertBefore(o, c);
										return;
									}
								}
								null !== o && jl(o, t, e);
							})(t, o, l);
						} finally {
							null !== h && h.observe(o, ai), oi = f, ni = a;
						}
					}
					null !== g && function(t, e, n, o, r) {
						const i = Array.from(t._listeners.mutation), s = i.length;
						for (let t = 0; t < s; t++) {
							const [s, l] = i[t];
							for (const t of l) {
								const i = e.get(t);
								void 0 !== i && s(i, {
									dirtyLeaves: o,
									prevEditorState: r,
									updateTags: n
								});
							}
						}
					}(t, g, m, _, i);
					ur(l) || null === l || null !== s && s.is(l) || t.dispatchCommand(Ie$2);
					const C = t._pendingDecorators;
					null !== C && (t._decorators = C, t._pendingDecorators = null, Ni("decorator", t, !0, C));
					if (function(t, e, n) {
						const o = el(e), r = el(n);
						o !== r && Ni("textcontent", t, !0, r);
					}(t, e || i, n), Ni("update", t, !0, {
						dirtyElements: p,
						dirtyLeaves: _,
						editorState: n,
						mutatedNodes: g,
						normalizedNodes: y,
						prevEditorState: e || i,
						tags: m
					}), !d) wi(t, t._deferred);
					(function(t) {
						const e = t._updates;
						if (0 === e.length) return void (t._cascadeCount = 0);
						if (function(t) {
							if (li.has(t)) return;
							li.add(t), setTimeout(() => {
								li.delete(t), t._cascadeCount = 0;
							}, 0);
						}(t), t._cascadeCount++ > 99) return t._updates = [], t._cascadeCount = 0, void t._onWarn(/* @__PURE__ */ new Error(`One or more update listeners are endlessly enqueueing more updates. May have encountered infinite recursion caused by update listeners that trigger additional updates without a stop condition. Editor namespace: ${t._config.namespace}`));
						const n = e.shift();
						if (n) {
							const [e, o] = n;
							Mi(t, e, o);
						}
					})(t);
				})(t, e);
			} finally {
				si = n;
			}
		}
		function Ni(t, e, n, ...o) {
			const r = e._updating;
			e._updating = n;
			try {
				const n = e._listeners[t], r = Array.from(n);
				for (const [t, e] of r) {
					e && e();
					const r = t(...o);
					n.has(t) ? n.set(t, r) : r && r();
				}
			} finally {
				e._updating = r;
			}
		}
		function Ei(t, e, n, o) {
			const r = ll(t);
			let i;
			if (!si) for (let t = 0; t < r.length; t++) r[t]._updating || (r[t]._cascadeCount = 0);
			for (let t = 4; t >= 0; t--) for (let s = 0; s < r.length; s++) {
				const l = r[s];
				if (s > 0 && l._updating) {
					i = l;
					break;
				}
				const c = l._commands.get(e);
				if (void 0 !== c) {
					const e = c[t];
					if (e.size > 0) {
						let t = !1;
						if (Ai(l, () => {
							for (const r of e) if (r(n, o)) return void (t = !0);
						}), t) return t;
					}
				}
			}
			return i && i.update(() => {
				Ei(i, e, n, o);
			}), !1;
		}
		function wi(t, e) {
			if (t._deferred = [], 0 !== e.length) {
				const n = t._updating;
				t._updating = !0;
				try {
					for (let t = 0; t < e.length; t++) e[t]();
				} finally {
					t._updating = n;
				}
			}
		}
		function Oi(e, n) {
			const o = e._updates;
			let r = n || !1;
			for (; 0 !== o.length;) {
				const n = o.shift();
				if (n) {
					const [o, i] = n, s = e._pendingEditorState;
					let l;
					void 0 !== i && (l = i.onUpdate, i.skipTransforms && (r = !0), i.discrete && (null === s && t(191), s._flushSync = !0), l && e._deferred.push(l), Si(e, i.tag)), null == s ? Mi(e, o, i) : o();
				}
			}
			return r;
		}
		function Mi(e, n, o) {
			const r = e._updateTags;
			let i, s = !1, l = !1;
			void 0 !== o && (i = o.onUpdate, Si(e, o.tag), s = o.skipTransforms || !1, l = o.discrete || !1), i && e._deferred.push(i);
			const c = e._editorState;
			let a = e._pendingEditorState, u = !1;
			(null === a || a._readOnly) && (a = e._pendingEditorState = Ri(a || c), u = !0), a._flushSync = l;
			const f = ni, d = ri, h = oi, g = e._updating;
			ni = a, ri = !1, e._updating = !0, oi = e;
			const _ = e._headless || null === e.getRootElement();
			vs(null);
			try {
				u && (_ ? null !== c._selection && (a._selection = c._selection.clone()) : a._selection = function(t, e) {
					const n = t.getEditorState()._selection, o = Jl(Il(t));
					return ur(n) || null == n ? Lr(n, o, t, e) : n.clone();
				}(e, o && o.event || null));
				const r = e._compositionKey;
				n(), s = Oi(e, s), function(t, e) {
					const n = e.getEditorState()._selection, o = t._selection;
					if (ur(o)) {
						const t = o.anchor, e = o.focus;
						let r;
						if ("text" === t.type && (r = t.getNode(), r.selectionTransform(n, o)), "text" === e.type) {
							const t = e.getNode();
							r !== t && t.selectionTransform(n, o);
						}
					}
				}(a, e), 0 !== e._dirtyType && (s ? function(t, e) {
					const n = e._dirtyLeaves, o = t._nodeMap;
					for (const t of n) {
						const e = o.get(t);
						Xo(e) && e.isAttached() && e.isSimpleText() && !e.isUnmergeable() && Pt$1(e);
					}
				}(a, e) : function(t, e) {
					const n = e._dirtyLeaves, o = e._dirtyElements, r = t._nodeMap, i = qs(), s = /* @__PURE__ */ new Map();
					let l = n, c = l.size, a = o, u = a.size;
					for (; c > 0 || u > 0;) {
						if (c > 0) {
							e._dirtyLeaves = /* @__PURE__ */ new Set();
							for (const t of l) {
								const o = r.get(t);
								Xo(o) && o.isAttached() && o.isSimpleText() && !o.isUnmergeable() && Pt$1(o), void 0 !== o && Ci(o, i) && xi(e, o, s), n.add(t);
							}
							if (l = e._dirtyLeaves, c = l.size, c > 0) {
								ci++;
								continue;
							}
						}
						e._dirtyLeaves = /* @__PURE__ */ new Set(), e._dirtyElements = /* @__PURE__ */ new Map(), a.delete("root") && a.set("root", !0);
						for (const t of a) {
							const n = t[0], l = t[1];
							if (o.set(n, l), !l) continue;
							const c = r.get(n);
							void 0 !== c && Ci(c, i) && xi(e, c, s);
						}
						l = e._dirtyLeaves, c = l.size, a = e._dirtyElements, u = a.size, ci++;
					}
					e._dirtyLeaves = n, e._dirtyElements = o;
				}(a, e), Oi(e), function(t, e, n, o) {
					const r = t._nodeMap, i = e._nodeMap, s = [];
					for (const [t] of o) {
						const e = i.get(t);
						void 0 !== e && (e.isAttached() || (Pi(e) && rt$1(e, t, r, i, s, o), r.has(t) || o.delete(t), s.push(t)));
					}
					for (const t of n) {
						const e = i.get(t);
						void 0 === e || e.isAttached() || (Qc(e) && null !== e.__slots && rt$1(e, t, r, i, s, n), r.has(t) || n.delete(t), s.push(t));
					}
					for (const t of s) i.delete(t);
					const l = _i(), c = l._compositionKey;
					null === c || i.has(c) || (l._compositionKey = null);
				}(c, a, e._dirtyLeaves, e._dirtyElements));
				r !== e._compositionKey && (a._flushSync = !0);
				const i = a._selection;
				if (ur(i)) {
					e._slotsUsed && Or(i);
					const n = a._nodeMap, o = i.anchor.key, r = i.focus.key;
					void 0 !== n.get(o) && void 0 !== n.get(r) || t(19);
				} else dr(i) && 0 === i._nodes.size && (a._selection = null);
			} catch (t) {
				t instanceof Error && e._onError(t), e._pendingEditorState = c, e._dirtyType = 2, e._cloneNotNeeded.clear(), e._dirtyLeaves = /* @__PURE__ */ new Set(), e._dirtyElements.clear(), bi(e);
				return;
			} finally {
				ni = f, ri = d, oi = h, e._updating = g, ci = 0;
			}
			0 !== e._dirtyType || e._deferred.length > 0 || function(t, e) {
				const n = e.getEditorState()._selection, o = t._selection;
				if (null !== o) {
					if (o.dirty || !o.is(n)) return !0;
				} else if (null !== n) return !0;
				return !1;
			}(a, e) ? a._flushSync ? (a._flushSync = !1, bi(e)) : u && ws(() => {
				bi(e);
			}) : (a._flushSync = !1, u && (r.clear(), e._deferred = [], e._pendingEditorState = null));
		}
		function Ai(t, e, n) {
			oi === t && void 0 === n ? ui() ? Mi(t, e, n) : e() : Mi(t, e, n);
		}
		function Di(t) {
			if (Bl(t)) {
				let e = null;
				for (const n of t.getChildren()) e = n.isInline() ? (e || n.replace(n.createParentElementNode())).append(n) : null;
			}
		}
		var Fi = class extends _o {
			__first;
			__last;
			__size;
			__format;
			__style;
			__indent;
			__dir;
			__textFormat;
			__textStyle;
			__slotHost;
			__slots;
			$config() {
				return this.config(Symbol.for("ElementNode"), {
					$transform: Di,
					extends: _o
				});
			}
			constructor(t) {
				super(t), this.__first = null, this.__last = null, this.__size = 0, this.__format = 0, this.__style = "", this.__indent = 0, this.__dir = null, this.__textFormat = 0, this.__textStyle = "", this.__slotHost = null, this.__slots = null;
			}
			afterCloneFrom(e) {
				super.afterCloneFrom(e), this.__key === e.__key && (this.__first = e.__first, this.__last = e.__last, this.__size = e.__size, this.__slotHost = e.__slotHost, null !== this.__slotHost && null !== this.__parent && t(384, this.__key, String(this.__slotHost), String(this.__parent)), this.__slots = e.__slots), this.__indent = e.__indent, this.__format = e.__format, this.__style = e.__style, this.__dir = e.__dir, this.__textFormat = e.__textFormat, this.__textStyle = e.__textStyle;
			}
			getFormat() {
				return this.getLatest().__format;
			}
			getFormatType() {
				return W[this.getFormat()] || "";
			}
			getStyle() {
				return this.getLatest().__style;
			}
			getIndent() {
				return this.getLatest().__indent;
			}
			getChildren() {
				const t = [];
				let e = this.getFirstChild();
				for (; null !== e;) t.push(e), e = e.getNextSibling();
				return t;
			}
			getChildrenKeys() {
				const t = [];
				let e = this.getFirstChild();
				for (; null !== e;) t.push(e.__key), e = e.getNextSibling();
				return t;
			}
			getChildrenSize() {
				return this.getLatest().__size;
			}
			isEmpty() {
				return 0 === this.getChildrenSize() && 0 === ia(this).length;
			}
			isDirty() {
				const t = _i()._dirtyElements;
				return null !== t && t.has(this.__key);
			}
			isLastChild() {
				const t = this.getLatest(), e = this.getParentOrThrow().getLastChild();
				return null !== e && e.is(t);
			}
			getAllTextNodes() {
				const t = [];
				for (const e of ia(this)) {
					const n = sa(this, e);
					Pi(n) && t.push(...n.getAllTextNodes());
				}
				let e = this.getFirstChild();
				for (; null !== e;) {
					if (Xo(e) && t.push(e), Pi(e)) {
						const n = e.getAllTextNodes();
						t.push(...n);
					}
					e = e.getNextSibling();
				}
				return t;
			}
			getFirstDescendant() {
				let t = this.getFirstChild();
				for (; Pi(t);) {
					const e = t.getFirstChild();
					if (null === e) break;
					t = e;
				}
				return t;
			}
			getLastDescendant() {
				let t = this.getLastChild();
				for (; Pi(t);) {
					const e = t.getLastChild();
					if (null === e) break;
					t = e;
				}
				return t;
			}
			getDescendantByIndex(t) {
				const e = this.getChildren(), n = e.length;
				if (t >= n) {
					const t = e[n - 1];
					return Pi(t) && t.getLastDescendant() || t || null;
				}
				const o = e[t];
				return Pi(o) && o.getFirstDescendant() || o || null;
			}
			getFirstChild() {
				const t = this.getLatest().__first;
				return null === t ? null : Ys(t);
			}
			getFirstChildOrThrow() {
				const e = this.getFirstChild();
				return null === e && t(45, this.__key), e;
			}
			getLastChild() {
				const t = this.getLatest().__last;
				return null === t ? null : Ys(t);
			}
			getLastChildOrThrow() {
				const e = this.getLastChild();
				return null === e && t(96, this.__key), e;
			}
			getChildAtIndex(t) {
				const e = this.getChildrenSize();
				let n, o;
				if (t < e / 2) {
					for (n = this.getFirstChild(), o = 0; null !== n && o <= t;) {
						if (o === t) return n;
						n = n.getNextSibling(), o++;
					}
					return null;
				}
				for (n = this.getLastChild(), o = e - 1; null !== n && o >= t;) {
					if (o === t) return n;
					n = n.getPreviousSibling(), o--;
				}
				return null;
			}
			getTextContent() {
				let t = ha(this);
				const e = this.getChildren(), n = e.length;
				for (let o = 0; o < n; o++) {
					const r = e[o];
					t += r.getTextContent(), Pi(r) && o !== n - 1 && !r.isInline() && (t += D$1);
				}
				return t;
			}
			getTextContentSize() {
				let t = function(t) {
					let e = 0;
					for (const n of ia(t)) {
						const o = sa(t, n);
						null !== o && (e += o.getTextContentSize());
					}
					return e;
				}(this);
				const e = this.getChildren(), n = e.length;
				for (let o = 0; o < n; o++) {
					const r = e[o];
					t += r.getTextContentSize(), Pi(r) && o !== n - 1 && !r.isInline() && (t += 2);
				}
				return t;
			}
			getDirection() {
				return this.getLatest().__dir;
			}
			getTextFormat() {
				return this.getLatest().__textFormat;
			}
			hasFormat(t) {
				if ("" !== t) {
					const e = R$1[t];
					return 0 !== (this.getFormat() & e);
				}
				return !1;
			}
			hasTextFormat(t) {
				const e = z$1[t];
				return 0 !== (this.getTextFormat() & e);
			}
			getFormatFlags(t, e) {
				return Ws(this.getLatest().__textFormat, t, e);
			}
			getTextStyle() {
				return this.getLatest().__textStyle;
			}
			select(t, e) {
				fi();
				const n = Kr();
				let o = t, r = e;
				const i = this.getChildrenSize();
				if (!this.canBeEmpty()) {
					if (0 === t && 0 === e) {
						const t = this.getFirstChild();
						if (Xo(t) || Pi(t)) return t.select(0, 0);
					} else if (!(void 0 !== t && t !== i || void 0 !== e && e !== i)) {
						const t = this.getLastChild();
						if (Xo(t) || Pi(t)) return t.select();
					}
				}
				void 0 === o && (o = i), void 0 === r && (r = i);
				const s = this.__key;
				return ur(n) ? (n.anchor.set(s, o, "element"), n.focus.set(s, r, "element"), n.dirty = !0, n) : Dr(s, o, s, r, "element", "element");
			}
			selectStart() {
				const t = this.getFirstDescendant();
				return t ? t.selectStart() : this.select();
			}
			selectEnd() {
				const t = this.getLastDescendant();
				return t ? t.selectEnd() : this.select();
			}
			clear() {
				const t = this.getWritable();
				return this.getChildren().forEach((t) => t.remove()), t;
			}
			append(...t) {
				return this.splice(this.getChildrenSize(), 0, t);
			}
			setDirection(t) {
				const e = this.getWritable();
				return e.__dir = t, e;
			}
			setFormat(t) {
				return this.getWritable().__format = "" !== t && R$1[t] || 0, this;
			}
			setStyle(t) {
				return this.getWritable().__style = t || "", this;
			}
			setTextFormat(t) {
				const e = this.getWritable();
				return e.__textFormat = t, e;
			}
			setTextStyle(t) {
				const e = this.getWritable();
				return e.__textStyle = t, e;
			}
			setIndent(t) {
				return this.getWritable().__indent = t, this;
			}
			splice(e, n, o) {
				ho(this) && t(324, this.__key, this.__type);
				const r = this.getChildrenSize(), i = this.getWritable();
				e + n <= r || t(226, String(e), String(n), String(r));
				for (const t of o);
				const s = i.__key, l = [], c = [], a = this.getChildAtIndex(e + n);
				let u = null, f = r - n + o.length;
				if (0 !== e) if (e === r) u = this.getLastChild();
				else {
					const t = this.getChildAtIndex(e);
					null !== t && (u = t.getPreviousSibling());
				}
				if (n > 0) {
					let e = null === u ? this.getFirstChild() : u.getNextSibling();
					for (let o = 0; o < n; o++) {
						null === e && t(100);
						const n = e.getNextSibling(), o = e.__key;
						Hs(e.getWritable()), c.push(o), e = n;
					}
				}
				let d = u;
				for (const e of o) {
					null !== d && e.is(d) && (u = d = d.getPreviousSibling());
					const n = e.getWritable();
					n.__parent === s && f--, Hs(n);
					const o = e.__key;
					if (null === d) i.__first = o, n.__prev = null;
					else {
						const t = d.getWritable();
						t.__next = o, n.__prev = t.__key;
					}
					e.__key === s && t(76), n.__parent = s, l.push(o), d = e;
				}
				if (e + n === r) {
					if (null !== d) d.getWritable().__next = null, i.__last = d.__key;
				} else if (null !== a) {
					const t = a.getWritable();
					if (null !== d) {
						const e = d.getWritable();
						t.__prev = d.__key, e.__next = a.__key;
					} else t.__prev = null;
				}
				if (i.__size = f, c.length) {
					const t = Kr();
					if (ur(t)) {
						const e = new Set(c), n = new Set(l), { anchor: o, focus: r } = t;
						Ii(o, e, n) && Wr(o, o.getNode(), this, u, a), Ii(r, e, n) && Wr(r, r.getNode(), this, u, a), 0 !== f || this.canBeEmpty() || Bl(this) || this.remove();
					}
				}
				return i;
			}
			getDOMSlot(t) {
				return new G(t);
			}
			exportDOM(t) {
				const { element: e } = super.exportDOM(t);
				if (gc(e)) {
					const t = this.getIndent();
					t > 0 && (e.style.paddingInlineStart = 40 * t + "px", e.setAttribute("data-lexical-indent", String(t)));
					const n = this.getDirection();
					n && (e.dir = n);
				}
				return { element: e };
			}
			exportJSON() {
				const t = {
					children: [],
					direction: this.getDirection(),
					format: this.getFormatType(),
					indent: this.getIndent(),
					...super.exportJSON()
				}, e = this.getTextFormat(), n = this.getTextStyle();
				return 0 === e && "" === n || Bl(this) || this.getChildren().some(Xo) || (0 !== e && (t.textFormat = e), "" !== n && (t.textStyle = n)), t;
			}
			updateFromJSON(t) {
				return super.updateFromJSON(t).setFormat(t.format).setIndent(t.indent).setDirection(t.direction).setTextFormat(t.textFormat || 0).setTextStyle(t.textStyle || "");
			}
			insertNewAfter(t, e) {
				return null;
			}
			canIndent() {
				return !0;
			}
			collapseAtStart(t) {
				return !1;
			}
			excludeFromCopy(t) {
				return !1;
			}
			canReplaceWith(t) {
				return !0;
			}
			canInsertAfter(t) {
				return !0;
			}
			canBeEmpty() {
				return !0;
			}
			canInsertTextBefore() {
				return !0;
			}
			canInsertTextAfter() {
				return !0;
			}
			isInline() {
				return !1;
			}
			isShadowRoot() {
				return !1;
			}
			canMergeWith(t) {
				return !1;
			}
			extractWithChild(t, e, n) {
				return !1;
			}
			canMergeWhenEmpty() {
				return !1;
			}
			reconcileObservedMutation(t, e) {
				const n = kc(this, t, e);
				let o = n.getFirstChild();
				for (let t = this.getFirstChild(); t; t = t.getNextSibling()) {
					const r = e.getElementByKey(t.getKey());
					null !== r && (null == o ? (n.insertChild(r), o = r) : o !== r && n.replaceChild(r, o), o = o.nextSibling);
				}
			}
		};
		function Pi(t) {
			return t instanceof Fi;
		}
		function Ii(t, e, n) {
			let o = t.getNode();
			for (; o;) {
				const t = o.__key;
				if (e.has(t) && !n.has(t)) return !0;
				o = o.getParent();
			}
			return !1;
		}
		var Li = class extends _o {
			__slotHost;
			__slots;
			constructor(t) {
				super(t), this.__slotHost = null, this.__slots = null;
			}
			afterCloneFrom(e) {
				super.afterCloneFrom(e), this.__key === e.__key && (this.__slotHost = e.__slotHost, null !== this.__slotHost && null !== this.__parent && t(383, this.__key, String(this.__slotHost), String(this.__parent)), this.__slots = e.__slots);
			}
			decorate(t, e) {
				return null;
			}
			isIsolated() {
				return !1;
			}
			isInline() {
				return !0;
			}
			isKeyboardSelectable() {
				return !0;
			}
		};
		function Ki(t) {
			return t instanceof Li;
		}
		var zi = class extends Fi {
			__cachedText;
			$config() {
				return this.config("root", { extends: Fi });
			}
			constructor() {
				super("root"), this.__cachedText = null;
			}
			getTopLevelElementOrThrow() {
				t(51);
			}
			getTextContent() {
				const t = this.__cachedText;
				return null === t || !ui() && 0 !== _i()._dirtyType ? super.getTextContent() : t;
			}
			remove() {
				t(52);
			}
			replace(e) {
				t(53);
			}
			insertBefore(e) {
				t(54);
			}
			insertAfter(e) {
				t(55);
			}
			updateDOM(t, e) {
				return !1;
			}
			splice(e, n, o) {
				for (const e of o) Pi(e) || Ki(e) || t(282);
				return super.splice(e, n, o);
			}
			static importJSON(t) {
				return nl().updateFromJSON(t);
			}
			collapseAtStart() {
				return !0;
			}
		};
		function Bi(t) {
			return t instanceof zi;
		}
		function Ri(t) {
			return new Hi(nt$2(t._nodeMap), null, t._slotsUsed);
		}
		function Wi() {
			return new Hi(new Map([["root", new zi()]]), null, !1);
		}
		function $i(e) {
			const n = e.exportJSON(), o = e.constructor;
			if (n.type !== o.getType() && t(130, o.name), Pi(e)) {
				const r = n.children;
				Array.isArray(r) || t(59, o.name);
				const i = e.getChildren();
				for (let t = 0; t < i.length; t++) {
					const e = $i(i[t]);
					r.push(e);
				}
			}
			const r = ia(e);
			if (r.length > 0) {
				const i = {};
				for (const n of r) {
					const r = sa(e, n);
					null === r && t(366, o.name, n), i[n] = $i(r);
				}
				n.$slots = i;
			}
			return n;
		}
		function Ui(t) {
			return t instanceof Hi;
		}
		var Hi = class Hi {
			_nodeMap;
			_selection;
			_flushSync;
			_readOnly;
			_parsed;
			_slotsUsed;
			constructor(t, e = null, n = !1) {
				this._nodeMap = t, this._selection = e || null, this._flushSync = !1, this._readOnly = !1, this._parsed = !1, this._slotsUsed = n;
			}
			isEmpty() {
				return 1 === this._nodeMap.size && null === this._selection;
			}
			read(t, e) {
				return ki(e && e.editor || null, this, t);
			}
			clone(t) {
				const e = new Hi(this._nodeMap, void 0 === t ? this._selection : t, this._slotsUsed);
				return e._readOnly = !0, e;
			}
			toJSON() {
				return ki(null, this, () => ({ root: $i(nl()) }));
			}
		};
		var ji = class extends Fi {
			$config() {
				return this.config("artificial", { extends: Fi });
			}
			createDOM(t) {
				return Zl().createElement("div");
			}
		};
		var Ji = class extends _o {
			$config() {
				return this.config("linebreak", { importDOM: { br: (t) => Gi(t) || Xi(t) ? null : {
					conversion: Vi,
					priority: 0
				} } });
			}
			getTextContent() {
				return "\n";
			}
			createDOM() {
				return Zl().createElement("br");
			}
			updateDOM() {
				return !1;
			}
			isInline() {
				return !0;
			}
		};
		function Vi(t) {
			return { node: qi() };
		}
		function qi() {
			return Wl(new Ji());
		}
		function Yi(t) {
			return t instanceof Ji;
		}
		function Gi(t) {
			const e = t.parentElement;
			if (null !== e && Cc(e)) {
				const n = e.firstChild;
				if (n === t || n.nextSibling === t && Qi(n)) {
					const n = e.lastChild;
					if (n === t || n.previousSibling === t && Qi(n)) return !0;
				}
			}
			return !1;
		}
		function Xi(t) {
			const e = t.parentElement;
			if (null !== e && Cc(e)) {
				const n = e.firstChild;
				if (n === t || n.nextSibling === t && Qi(n)) return !1;
				const o = e.lastChild;
				if (o === t || o.previousSibling === t && Qi(o)) return !0;
			}
			return !1;
		}
		function Qi(t) {
			return zs(t) && /^( |\t|\r?\n)+$/.test(t.textContent || "");
		}
		var Zi = class extends Fi {
			$config() {
				return this.config("paragraph", {
					extends: Fi,
					importDOM: { p: () => ({
						conversion: ts,
						priority: 0
					}) }
				});
			}
			createDOM(t) {
				const e = Zl().createElement("p"), n = Cl(t.theme, "paragraph");
				if (void 0 !== n) e.classList.add(...n);
				return e;
			}
			updateDOM(t, e, n) {
				return !1;
			}
			exportDOM(t) {
				const { element: e } = super.exportDOM(t);
				if (gc(e)) {
					this.isEmpty() && e.append(Zl().createElement("br"));
					const t = this.getFormatType();
					t && (e.style.textAlign = t);
				}
				return { element: e };
			}
			exportJSON() {
				const t = super.exportJSON();
				if (void 0 === t.textFormat || void 0 === t.textStyle) {
					const e = this.getChildren().find(Xo);
					e ? (t.textFormat = e.getFormat(), t.textStyle = e.getStyle()) : (t.textFormat = this.getTextFormat(), t.textStyle = this.getTextStyle());
				}
				return t;
			}
			insertNewAfter(t, e) {
				const n = es();
				n.setTextFormat(t.format), n.setTextStyle(t.style);
				const o = this.getDirection();
				return n.setDirection(o), n.setFormat(this.getFormatType()), n.setStyle(this.getStyle()), this.insertAfter(n, e), n;
			}
			collapseAtStart() {
				const t = this.getChildren();
				if (0 === t.length || Xo(t[0]) && "" === t[0].getTextContent().trim()) {
					if (null !== this.getNextSibling()) return this.selectNext(), this.remove(), !0;
					if (null !== this.getPreviousSibling()) return this.selectPrevious(), this.remove(), !0;
				}
				return !1;
			}
		};
		function ts(t) {
			const e = es();
			if (Lc(e, t), Pc(t, e), "" === e.getFormatType()) {
				const n = t.getAttribute("align");
				n && n && n in R$1 && e.setFormat(n);
			}
			return Ic(e, t), { node: e };
		}
		function es() {
			return Wl(new Zi());
		}
		function ns(t) {
			return t instanceof Zi;
		}
		function os(t) {
			console.warn(t);
		}
		function gs(t, e, n, o, r) {
			const i = t._keyToDOMMap;
			i.clear(), t._editorState = Wi(), t._pendingEditorState = o, t._compositionKey = null, t._dirtyType = 0, t._cloneNotNeeded.clear(), t._dirtyLeaves = /* @__PURE__ */ new Set(), t._dirtyElements.clear(), t._normalizedNodes = /* @__PURE__ */ new Set(), r && r.preserveUpdateQueue || (t._updateTags = /* @__PURE__ */ new Set(), t._updates = [], t._cascadeCount = 0), t._blockCursorElement = null, null !== t._inputState.handledSelectionCommandTimeoutId && clearTimeout(t._inputState.handledSelectionCommandTimeoutId), t._inputState = {
				collapsedSelectionFormat: {
					format: 0,
					key: "root",
					offset: 0,
					style: "",
					timeStamp: 0
				},
				compositionEndData: "",
				compositionPhase: "idle",
				hadOrphanedCompositionEvents: !1,
				handledSelectionCommandTimeoutId: null,
				isInsertLineBreak: !1,
				isInsertTextAfterHandledSelectionCommand: !1,
				isSelectionChangeFromDOMUpdate: !1,
				isSelectionChangeFromMouseDown: !1,
				lastBeforeInputInsertTextTimeStamp: 0,
				lastKeyCode: null,
				lastKeyDownTimeStamp: 0,
				postDeleteSelectionToRestore: null,
				unprocessedBeforeInputData: null
			};
			const s = t._observer;
			null !== s && (s.disconnect(), t._observer = null), null !== e && (e.textContent = "", function(t, e) {
				const n = `__lexicalKey_${e._key}`;
				delete t[n];
			}(e, t)), null !== n && (n.textContent = "", i.set("root", n), Xs(n, t, "root"));
		}
		function _s(t) {
			const e = /* @__PURE__ */ new Set(), n = /* @__PURE__ */ new Set();
			for (const { klass: o, ownNodeConfig: r } of jc(t)) {
				const t = o.transform;
				if (!n.has(t)) {
					n.add(t);
					const r = o.transform();
					r && e.add(r);
				}
				if (r) {
					const t = r.$transform;
					t && e.add(t);
				}
			}
			return e;
		}
		const ps = {
			$createDOM: (t, e) => t.createDOM(e._config, e),
			$decorateDOM: (t, e, n, o) => {},
			$exportDOM: (t, e) => {
				const n = Es(e, t.getType());
				return n && void 0 !== n.exportDOM ? n.exportDOM(e, t) : t.exportDOM(e);
			},
			$extractWithChild: (t, e, n, o, r) => Pi(t) && t.extractWithChild(e, n, o),
			$getDOMSlot: (t, e, n) => t.getDOMSlot(e),
			$getSlotTargetElement: (t, e, n, o) => null,
			$shouldExclude: (t, e, n) => Pi(t) && t.excludeFromCopy("html"),
			$shouldInclude: (t, e, n) => !e || t.isSelected(e),
			$updateDOM: (t, e, n, o) => t.updateDOM(e, n, o._config)
		};
		function ys(e) {
			const n = e || {}, o = mi(), r = n.theme || {}, i = void 0 === e ? o : n.parentEditor || null, s = n.disableEvents || !1, l = Wi(), c = n.namespace || (null !== i ? i._config.namespace : cl()), a = n.editorState, u = [
				zi,
				Wo,
				Ji,
				Zo,
				Zi,
				ji,
				...n.nodes || []
			], { onError: f, onWarn: d, html: h } = n, g = void 0 === n.editable || n.editable;
			let _;
			if (void 0 === e && null !== o) _ = o._nodes;
			else {
				_ = /* @__PURE__ */ new Map();
				for (let e = 0; e < u.length; e++) {
					let o = u[e], r = null, i = null;
					if (o && "object" == typeof o) {
						const t = o;
						o = t.replace, r = t.with, i = t.withKlass || null;
					}
					if ("function" != typeof o || !o.prototype || !(o === _o || o.prototype instanceof _o)) {
						let r = "<unknown>";
						try {
							r = JSON.parse(Z$1);
						} catch (t) {}
						t(365, String(e - u.length + (n.nodes ? n.nodes.length : 0)), "function" == typeof o ? `${o.name}${"function" == typeof o.getType ? ` (type ${String(o.getType())})` : ""}` : String(o), String(r));
					}
					Hc(o);
					const s = o.getType(), l = _s(o);
					_.set(s, {
						exportDOM: h && h.export ? h.export.get(o) : void 0,
						klass: o,
						replace: r,
						replaceWithKlass: i,
						sharedNodeState: vt$1(u[e]),
						transforms: l
					});
				}
			}
			const p = new Cs(l, i, _, {
				disableEvents: s,
				dom: {
					...ps,
					...e && e.dom
				},
				namespace: c,
				theme: r
			}, f || console.error, d || os, function(t, e) {
				const n = /* @__PURE__ */ new Map(), o = /* @__PURE__ */ new Set(), r = (t) => {
					Object.keys(t).forEach((e) => {
						let o = n.get(e);
						void 0 === o && (o = [], n.set(e, o)), o.push(t[e]);
					});
				};
				return t.forEach((t) => {
					const e = t.klass.importDOM;
					if (null == e || o.has(e)) return;
					o.add(e);
					const n = e.call(t.klass);
					null !== n && r(n);
				}), e && r(e), n;
			}(_, h ? h.import : void 0), g, e);
			return void 0 !== a && (p._pendingEditorState = a, p._dirtyType = 2), function(t) {
				t.registerCommand(ze$2, Yn, 0), t.registerCommand(Be$2, Gn, 0), t.registerCommand(Re, Xn, 0), t.registerCommand(We$2, Qn, 0), t.registerCommand(tn$2, eo, 0);
			}(p), p;
		}
		function ms(t, e) {
			const n = t.get(e);
			t.delete(e), n && n();
		}
		function xs(t, e, n) {
			return t.set(e, n), ms.bind(null, t, e);
		}
		var Cs = class {
			static version;
			_headless;
			_parentEditor;
			_rootElement;
			_editorState;
			_pendingEditorState;
			_compositionKey;
			_deferred;
			_keyToDOMMap;
			_updates;
			_updating;
			_cascadeCount;
			_listeners;
			_commands;
			_nodes;
			_decorators;
			_pendingDecorators;
			_config;
			_dirtyType;
			_cloneNotNeeded;
			_dirtyLeaves;
			_dirtyElements;
			_normalizedNodes;
			_updateTags;
			_observer;
			_key;
			_onError;
			_onWarn;
			_htmlConversions;
			_window;
			_editable;
			_blockCursorElement;
			_slotsUsed;
			_inputState;
			_createEditorArgs;
			constructor(t, e, n, o, r, i, s, l, c) {
				this._createEditorArgs = c, this._parentEditor = e, this._rootElement = null, this._editorState = t, this._pendingEditorState = null, this._compositionKey = null, this._deferred = [], this._keyToDOMMap = new ot$1(), this._updates = [], this._updating = !1, this._cascadeCount = 0, this._listeners = {
					decorator: /* @__PURE__ */ new Map(),
					editable: /* @__PURE__ */ new Map(),
					mutation: /* @__PURE__ */ new Map(),
					root: /* @__PURE__ */ new Map(),
					textcontent: /* @__PURE__ */ new Map(),
					update: /* @__PURE__ */ new Map()
				}, this._commands = /* @__PURE__ */ new Map(), this._config = o, this._nodes = n, this._decorators = {}, this._pendingDecorators = null, this._dirtyType = 0, this._cloneNotNeeded = /* @__PURE__ */ new Set(), this._dirtyLeaves = /* @__PURE__ */ new Set(), this._dirtyElements = /* @__PURE__ */ new Map(), this._normalizedNodes = /* @__PURE__ */ new Set(), this._updateTags = /* @__PURE__ */ new Set(), this._observer = null, this._key = cl(), this._onError = r, this._onWarn = i, this._htmlConversions = s, this._editable = l, this._headless = null !== e && e._headless, this._window = null, this._blockCursorElement = null, this._slotsUsed = !1, this._inputState = {
					collapsedSelectionFormat: {
						format: 0,
						key: "root",
						offset: 0,
						style: "",
						timeStamp: 0
					},
					compositionEndData: "",
					compositionPhase: "idle",
					hadOrphanedCompositionEvents: !1,
					handledSelectionCommandTimeoutId: null,
					isInsertLineBreak: !1,
					isInsertTextAfterHandledSelectionCommand: !1,
					isSelectionChangeFromDOMUpdate: !1,
					isSelectionChangeFromMouseDown: !1,
					lastBeforeInputInsertTextTimeStamp: 0,
					lastKeyCode: null,
					lastKeyDownTimeStamp: 0,
					postDeleteSelectionToRestore: null,
					unprocessedBeforeInputData: null
				};
			}
			isComposing() {
				return null != this._compositionKey;
			}
			registerUpdateListener(t) {
				return xs(this._listeners.update, t);
			}
			registerEditableListener(t) {
				return xs(this._listeners.editable, t);
			}
			registerDecoratorListener(t) {
				return xs(this._listeners.decorator, t);
			}
			registerTextContentListener(t) {
				return xs(this._listeners.textcontent, t);
			}
			registerRootListener(t) {
				const e = this._listeners.root;
				return Eu(xs(e, t, t(this._rootElement, null) || void 0), () => function(t, e, n) {
					const o = t.get(e);
					o && o(), t.set(e, e(...n) || void 0);
				}(e, t, [null, this._rootElement]));
			}
			registerCommand(e, n, o) {
				void 0 === o && t(35);
				const r = this._commands;
				r.has(e) || r.set(e, [
					new tt(),
					new tt(),
					new tt(),
					new tt(),
					new tt()
				]);
				const i = r.get(e);
				void 0 === i && t(36, String(e));
				const s = function(t) {
					return 7 & t;
				}(o), l = i[s];
				return s !== o ? l.addFront(n) : l.addBack(n), () => {
					l.delete(n), i.every((t) => 0 === t.size) && r.delete(e);
				};
			}
			registerMutationListener(t, e, n) {
				const o = this.resolveRegisteredNodeAfterReplacements(this.getRegisteredNode(t)).klass, r = this._listeners.mutation;
				let i = r.get(e);
				void 0 === i && (i = /* @__PURE__ */ new Set(), r.set(e, i)), i.add(o);
				const s = n && n.skipInitialization;
				return void 0 !== s && s || this.initializeMutationListener(e, o), () => {
					i.delete(o), 0 === i.size && r.delete(e);
				};
			}
			getRegisteredNode(e) {
				const n = this._nodes.get(e.getType());
				return void 0 === n && t(37, e.name), n;
			}
			resolveRegisteredNodeAfterReplacements(t) {
				for (; t.replaceWithKlass;) t = this.getRegisteredNode(t.replaceWithKlass);
				return t;
			}
			initializeMutationListener(t, e) {
				const n = this._editorState, o = Ac(n).get(e.getType());
				if (!o) return;
				const r = /* @__PURE__ */ new Map();
				for (const t of o.keys()) r.set(t, "created");
				r.size > 0 && t(r, {
					dirtyLeaves: /* @__PURE__ */ new Set(),
					prevEditorState: n,
					updateTags: new Set(["registerMutationListener"])
				});
			}
			registerNodeTransformToKlass(t, e) {
				const n = this.getRegisteredNode(t);
				return n.transforms.add(e), n;
			}
			registerNodeTransform(t, e) {
				const n = this.registerNodeTransformToKlass(t, e), o = [n], r = n.replaceWithKlass;
				if (null != r) {
					const t = this.registerNodeTransformToKlass(r, e);
					o.push(t);
				}
				return function(t, e) {
					const n = Ac(t.getEditorState()), o = [];
					for (const t of e) {
						const e = n.get(t);
						e && o.push(e);
					}
					if (0 === o.length) return;
					t.update(() => {
						for (const t of o) for (const e of t.keys()) {
							const t = Ys(e);
							t && t.markDirty();
						}
					}, null === t._pendingEditorState ? { tag: xo } : void 0);
				}(this, o.map((t) => t.klass.getType())), () => {
					o.forEach((t) => t.transforms.delete(e));
				};
			}
			hasNode(t) {
				return this._nodes.has(t.getType());
			}
			hasNodes(t) {
				return t.every(this.hasNode.bind(this));
			}
			dispatchCommand(t, ...e) {
				return Nl(this, t, ...e);
			}
			getDecorators() {
				return this._decorators;
			}
			getRootElement() {
				return this._rootElement;
			}
			getKey() {
				return this._key;
			}
			setRootElement(t) {
				const e = this._rootElement;
				if (t !== e) {
					const n = Cl(this._config.theme, "root"), o = this._pendingEditorState || this._editorState;
					if (this._rootElement = t, gs(this, e, t, o, { preserveUpdateQueue: !0 }), null !== e && (this._config.disableEvents || co(e), null != n && e.classList.remove(...n)), null !== t) {
						const e = Pl(t), o = t.style;
						o.userSelect = "text", o.whiteSpace = "pre-wrap", o.wordBreak = "break-word", t.setAttribute("data-lexical-editor", "true"), this._window = e, this._dirtyType = 2, gt$1(this), this._updateTags.add(xo), bi(this), this._config.disableEvents || function(t, e) {
							const n = t.ownerDocument;
							Ln.set(t, n);
							let o = Kn.get(n);
							void 0 === o && (o = {
								editors: /* @__PURE__ */ new Set(),
								hasShadowEditor: void 0
							}, Kn.set(n, o)), o.editors.add(e), o.hasShadowEditor = void 0, t.__lexicalEditor = e;
							const r = no(t);
							r.push(zn.register(n));
							for (let n = 0; n < In.length; n++) {
								const [o, i] = In[n], s = "function" == typeof i ? (t) => {
									so(t) || (io(t), (e.isEditable() || "click" === o) && i(t, e));
								} : (t) => {
									if (so(t)) return;
									io(t);
									const n = e.isEditable();
									switch (o) {
										case "cut": return n && Nl(e, Tn, t);
										case "copy": return Nl(e, vn$2, t);
										case "paste": return n && Nl(e, Je$2, t);
										case "dragstart": return n && Nl(e, xn$1, t);
										case "dragover": return n && Nl(e, Cn$1, t);
										case "dragend": return n && Nl(e, Sn$2, t);
										case "focus": return n && Nl(e, On$1, t);
										case "blur": return n && Nl(e, Mn$1, t);
										case "drop": return n && Nl(e, yn$1, t);
									}
								};
								r.push(Fn(t, o, s));
							}
						}(t, this), null != n && t.classList.add(...n);
					} else this._window = null, this._updateTags.add(xo), bi(this);
					Ni("root", this, !1, t, e);
				}
			}
			getElementByKey(t) {
				return this._keyToDOMMap.get(t) || null;
			}
			getEditorState() {
				return this._editorState;
			}
			setEditorState(e, n) {
				e.isEmpty() && t(38);
				let o = e;
				o._readOnly && (o = Ri(e), o._selection = e._selection ? e._selection.clone() : null), ht$2(this);
				const r = this._pendingEditorState, i = void 0 !== n ? n.tag : null;
				null === r || r.isEmpty() || (null != i && this._updateTags.add(i), bi(this)), this._pendingEditorState = o, this._dirtyType = 2, this._dirtyElements.set("root", !1), this._compositionKey = null, this._slotsUsed = this._slotsUsed || e._slotsUsed, Ai(this, () => {
					if (i && this._updateTags.add(i), e._parsed) for (const [t, e] of o._nodeMap.entries()) Pi(e) ? this._dirtyElements.set(t, !0) : this._dirtyLeaves.add(t);
				}, { discrete: !this._updating || void 0 });
			}
			parseEditorState(t, e) {
				return function(t, e, n) {
					const o = Wi(), r = ni, i = ri, s = oi, l = e._dirtyElements, c = e._dirtyLeaves, a = e._cloneNotNeeded, u = e._dirtyType;
					e._dirtyElements = /* @__PURE__ */ new Map(), e._dirtyLeaves = /* @__PURE__ */ new Set(), e._cloneNotNeeded = /* @__PURE__ */ new Set(), e._dirtyType = 0, ni = o, ri = !1, oi = e, vs(null);
					try {
						const r = e._nodes;
						Ti(t.root, r), n && n(), o._readOnly = !0, o._parsed = !0;
					} catch (t) {
						t instanceof Error && e._onError(t);
					} finally {
						e._dirtyElements = l, e._dirtyLeaves = c, e._cloneNotNeeded = a, e._dirtyType = u, ni = r, ri = i, oi = s;
					}
					return o;
				}("string" == typeof t ? JSON.parse(t) : t, this, e);
			}
			read(...t) {
				const [e, n] = 1 === t.length ? ["force-commit", t[0]] : t;
				"force-commit" === e && bi(this);
				return ("pending" === e ? this._pendingEditorState || this._editorState : this.getEditorState()).read(n, { editor: this });
			}
			update(t, e) {
				(function(t, e, n) {
					t._updating ? t._updates.push([e, n]) : Mi(t, e, n);
				})(this, t, e);
			}
			focus(t, e = {}) {
				const n = this._rootElement;
				null !== n && (n.setAttribute("autocapitalize", "off"), Ai(this, () => {
					const o = Kr(), r = nl();
					null !== o ? o.dirty || ol(o.clone()) : 0 !== r.getChildrenSize() && ("rootStart" === e.defaultSelection ? r.selectStart() : r.selectEnd()), Al("focus"), Dl(() => {
						n.removeAttribute("autocapitalize"), t && t();
					});
				}), null === this._pendingEditorState && n.removeAttribute("autocapitalize"));
			}
			blur() {
				const t = this._rootElement;
				null !== t && t.blur();
				const e = Jl(this._window);
				null !== e && e.removeAllRanges();
			}
			isEditable() {
				return this._editable;
			}
			setEditable(t) {
				this._editable !== t && (this._editable = t, Ni("editable", this, !0, t), this._slotsUsed && this.update(() => pi()));
			}
			toJSON() {
				return { editorState: this._editorState.toJSON() };
			}
		};
		Cs.version = Z$1;
		let Ss = null;
		function vs(t) {
			Ss = t;
		}
		const Ts = Symbol("INTERNAL_SKIP_AFTER_CLONE_FROM");
		let ks = 1;
		function Ns(e, n) {
			const o = Es(e, n);
			return void 0 === o && t(30, n), o;
		}
		function Es(t, e) {
			return t._nodes.get(e);
		}
		const ws = "function" == typeof queueMicrotask ? queueMicrotask : (t) => {
			Promise.resolve().then(t);
		};
		function Os(t, e) {
			const n = void 0 !== e ? e : (() => {
				const e = t.getRootNode();
				return Bs(e) || ql(e) ? cc(e) : null;
			})();
			if (!gc(n)) return !1;
			if (n.hasAttribute("data-lexical-slot")) return !1;
			const o = Zs(n), r = n.nodeName;
			return po(o) && ("INPUT" === r || "TEXTAREA" === r || "true" === n.contentEditable && null == Ps(n));
		}
		function As(t, e, n) {
			const o = t.getRootElement();
			if (!o) return !1;
			try {
				if (!e || !o.contains(e) || !o.contains(n)) return !1;
			} catch (t) {
				return !1;
			}
			return Fs(e) === t && t.read("latest", () => !Os(e));
		}
		function Ds(t) {
			return t instanceof Cs;
		}
		function Fs(t) {
			let e = t;
			for (; null != e;) {
				const t = Ps(e);
				if (Ds(t)) return t;
				e = wl(e);
			}
			return null;
		}
		function Ps(t) {
			return t ? t.__lexicalEditor : null;
		}
		function Ls(t) {
			return er(t) || t.isToken();
		}
		function Ks(t) {
			return Ls(t) || t.isSegmented();
		}
		function zs(t) {
			return _c(t) && 3 === t.nodeType;
		}
		function Bs(t) {
			return _c(t) && 9 === t.nodeType;
		}
		function Rs(t) {
			let e = t;
			for (; null != e;) {
				if (zs(e)) return e;
				e = e.firstChild;
			}
			return null;
		}
		function Ws(t, e, n) {
			const o = z$1[e];
			if (null !== n && (t & o) === (n & o)) return t;
			let r = t ^ o;
			return "subscript" === e ? r &= ~z$1.superscript : "superscript" === e ? r &= ~z$1.subscript : "lowercase" === e ? (r &= ~z$1.uppercase, r &= ~z$1.capitalize) : "uppercase" === e ? (r &= ~z$1.lowercase, r &= ~z$1.capitalize) : "capitalize" === e && (r &= ~z$1.lowercase, r &= ~z$1.uppercase), r;
		}
		function Us(t, e) {
			const n = function() {
				const t = Ss;
				return Ss = null, t;
			}();
			if (null != (e = e || n && n.__key)) return void (t.__key = e);
			fi(), di();
			const o = _i(), r = hi(), i = "" + ks++;
			r._nodeMap.set(i, t), Pi(t) ? o._dirtyElements.set(i, !0) : o._dirtyLeaves.add(i), o._cloneNotNeeded.add(i), 0 === o._dirtyType && (o._dirtyType = 1), t.__key = i;
		}
		function Hs(e) {
			null !== ta(e) && t(380, e.__key, String(ta(e)));
			const n = e.getParent();
			if (null !== n) {
				const t = e.getWritable(), o = n.getWritable(), r = e.getPreviousSibling(), i = e.getNextSibling(), s = null !== i ? i.__key : null, l = null !== r ? r.__key : null, c = null !== r ? r.getWritable() : null, a = null !== i ? i.getWritable() : null;
				null === r && (o.__first = s), null === i && (o.__last = l), null !== c && (c.__next = s), null !== a && (a.__prev = l), t.__prev = null, t.__next = null, t.__parent = null, o.__size--;
			}
		}
		function Js(e) {
			di(), ho(e) && t(323, e.__key, e.__type);
			const n = e.getLatest(), o = null !== n.__parent ? n.__parent : Zc(n) ? n.__slotHost : null, r = hi(), i = _i(), s = r._nodeMap, l = i._dirtyElements;
			null !== o && function(t, e, n) {
				let o = t;
				for (; null !== o;) {
					if (n.has(o)) return;
					const t = e.get(o);
					if (void 0 === t) break;
					n.set(o, !1), o = null !== t.__parent ? t.__parent : Zc(t) ? t.__slotHost : null;
				}
			}(o, s, l);
			const c = n.__key;
			0 === i._dirtyType && (i._dirtyType = 1), Pi(e) ? l.set(c, !0) : i._dirtyLeaves.add(c);
		}
		function Vs(t) {
			fi();
			const e = _i(), n = e._compositionKey;
			if (t !== n) {
				if (e._compositionKey = t, null !== n) {
					const t = Ys(n);
					null !== t && t.getWritable();
				}
				if (null !== t) {
					const e = Ys(t);
					null !== e && e.getWritable();
				}
			}
		}
		function qs() {
			if (ui()) return null;
			return _i()._compositionKey;
		}
		function Ys(t, e) {
			const n = (e || hi())._nodeMap.get(t);
			return void 0 === n ? null : n;
		}
		function Gs(t, e) {
			const n = Qs(t, _i());
			return void 0 !== n ? Ys(n, e) : null;
		}
		function Xs(t, e, n) {
			t[`__lexicalKey_${e._key}`] = n;
		}
		function Qs(t, e) {
			return t[`__lexicalKey_${e._key}`];
		}
		function Zs(t, e) {
			let n = t;
			for (; null != n;) {
				const t = Gs(n, e);
				if (null !== t) return t;
				n = wl(n);
			}
			return null;
		}
		function tl(t) {
			const e = t._decorators, n = Object.assign({}, e);
			return t._pendingDecorators = n, n;
		}
		function el(t) {
			return t.read(() => nl().getTextContent());
		}
		function nl() {
			return hi()._nodeMap.get("root");
		}
		function ol(t) {
			fi();
			const e = hi();
			null !== t && (t.dirty = !0, t.setCachedNodes(null), ur(t) && _i()._slotsUsed && Or(t)), e._selection = t;
		}
		function rl() {
			fi();
			ht$2(_i());
		}
		function il(t) {
			const e = function(t, e) {
				let n = t;
				for (; null != n;) {
					const t = Qs(n, e);
					if (void 0 !== t) return t;
					n = wl(n);
				}
				return null;
			}(t, _i());
			return null === e ? null : Ys(e);
		}
		function sl(t) {
			return /[\uD800-\uDBFF][\uDC00-\uDFFF]/g.test(t);
		}
		function ll(t) {
			const e = [];
			for (let n = t; null !== n; n = n._parentEditor) e.push(n);
			return e;
		}
		function cl() {
			return Math.random().toString(36).replace(/[^a-z]+/g, "").substring(0, 5);
		}
		function al(t) {
			return zs(t) ? t.nodeValue : null;
		}
		function ul(t, e, n) {
			const o = Jl(Il(e));
			if (null === o) return;
			const r = nc(o, e._rootElement), i = r.anchorNode;
			let { anchorOffset: s, focusOffset: l } = r;
			if (null !== i) {
				let e = al(i);
				const o = Zs(i);
				if (null !== e && Xo(o)) {
					if ((e === A || e === F) && n) {
						const t = n.length;
						e = n, s = t, l = t;
					}
					null !== e && fl(o, e, s, l, t);
				}
			}
		}
		function fl(t, e, n, o, r) {
			let i = t;
			if (i.isAttached() && (r || !i.isDirty())) {
				const s = i.isComposing();
				if (i.isToken() && s) return;
				let c = e;
				if ((s || r) && (e.endsWith(A) && (c = e.slice(0, -A.length)), r)) {
					const t = F;
					let e;
					for (; -1 !== (e = c.indexOf(t));) c = c.slice(0, e) + c.slice(e + t.length), null !== n && n > e && (n = Math.max(e, n - t.length)), null !== o && o > e && (o = Math.max(e, o - t.length));
				}
				const u = i.getTextContent();
				if (r || c !== u) {
					const e = Kr();
					if ("" === c) {
						if (Vs(null), a || l || d$1) i.remove();
						else {
							const t = _i();
							dl(i, "", e), setTimeout(() => {
								t.update(() => {
									i.isAttached() && "" === i.getTextContent() && i.remove();
								});
							}, 20);
						}
						return;
					}
					const r = i.getParent(), u = zr(), f = i.getTextContentSize(), h = qs(), g = i.getKey();
					if (i.isToken() && !s || null !== h && g === h && !s || ur(u) && (null !== r && !r.canInsertTextBefore() && 0 === u.anchor.offset || u.anchor.key === t.__key && 0 === u.anchor.offset && !i.canInsertTextBefore() && !s || u.focus.key === t.__key && u.focus.offset === f && !i.canInsertTextAfter() && !s)) return void i.markDirty();
					if (!ur(e) || null === n || null === o) return void dl(i, c, e);
					if (e.setTextNodeRange(i, n, i, o), i.isSegmented()) {
						const t = Go(i.getTextContent());
						i.replace(t), i = t;
					}
					dl(i, c, e);
				}
			}
		}
		function dl(t, e, n) {
			if (t.setTextContent(e), ur(n)) {
				const e = t.getKey();
				let o = !1;
				for (const r of ["anchor", "focus"]) {
					const i = n[r];
					"text" === i.type && i.key === e && (i.offset = Ka(t, i.offset, "clamp"), o = !0);
				}
				o && (n._cachedNodes = null, n._cachedIsBackward = null);
			}
		}
		function hl(t, e, n) {
			const o = e[n] || !1;
			return "any" === o || o === t[n];
		}
		function gl(t, e) {
			return hl(t, e, "altKey") && hl(t, e, "ctrlKey") && hl(t, e, "shiftKey") && hl(t, e, "metaKey");
		}
		function _l(t, e, n) {
			if (!gl(t, n)) return !1;
			if (t.key.toLowerCase() === e.toLowerCase()) return !0;
			if (e.length > 1) return !1;
			if (1 === t.key.length && t.key.charCodeAt(0) <= 127) return !1;
			if (t.code.startsWith("Digit") && /^\d$/.test(e)) return t.code === `Digit${e}`;
			const o = "Key" + e.toUpperCase();
			return t.code === o;
		}
		const pl = {
			ctrlKey: !r$1,
			metaKey: r$1
		}, yl = {
			altKey: r$1,
			ctrlKey: !r$1
		};
		function ml(t) {
			return "Backspace" === t.key;
		}
		function xl(t) {
			const e = nl();
			if (ur(t)) {
				const e = t.anchor, n = t.focus, o = e.getNode();
				if (Bi(o)) return e.set(o.getKey(), 0, "element"), n.set(o.getKey(), o.getChildrenSize(), "element"), It(t), t;
				const r = o.getTopLevelElementOrThrow(), i = r.getParent();
				if (null === i) return Pi(r) && (e.set(r.getKey(), 0, "element"), n.set(r.getKey(), r.getChildrenSize(), "element"), It(t)), t;
				const s = i;
				return e.set(s.getKey(), 0, "element"), n.set(s.getKey(), s.getChildrenSize(), "element"), It(t), t;
			}
			{
				const t = e.select(0, e.getChildrenSize());
				return ol(It(t)), t;
			}
		}
		function Cl(t, e) {
			void 0 === t.__lexicalClassNameCache && (t.__lexicalClassNameCache = {});
			const n = t.__lexicalClassNameCache, o = n[e];
			if (void 0 !== o) return o;
			const r = t[e];
			if ("string" == typeof r) {
				const t = ku(r);
				return n[e] = t, t;
			}
			return r;
		}
		function Sl(e, n, o, r, i) {
			if (0 === o.size) return;
			const s = r.__type, l = r.__key, c = n.get(s);
			void 0 === c && t(33, s);
			const a = c.klass;
			let u = e.get(a);
			void 0 === u && (u = /* @__PURE__ */ new Map(), e.set(a, u));
			const f = u.get(l), d = "destroyed" === f && "created" === i;
			(void 0 === f || d) && u.set(l, d ? "updated" : i);
		}
		function Tl(t, e, n) {
			const o = t.getParent();
			let r = n, i = t;
			return null !== o && (e && 0 === n ? (r = i.getIndexWithinParent(), i = o) : e || n !== i.getChildrenSize() || (r = i.getIndexWithinParent() + 1, i = o)), i.getChildAtIndex(e ? r - 1 : r);
		}
		function kl(t, e) {
			const n = t.offset;
			if ("element" === t.type) return Tl(t.getNode(), e, n);
			{
				const o = t.getNode();
				if (e && 0 === n || !e && n === o.getTextContentSize()) {
					const t = e ? o.getPreviousSibling() : o.getNextSibling();
					return null === t ? Tl(o.getParentOrThrow(), e, o.getIndexWithinParent() + (e ? 0 : 1)) : t;
				}
			}
			return null;
		}
		function bl(t) {
			const e = Il(t).event, n = e && e.inputType;
			return "insertFromPaste" === n || "insertFromPasteAsQuotation" === n;
		}
		function Nl(t, e, ...n) {
			return Ei(t, e, n[0], t);
		}
		function El(e, n) {
			const o = e._keyToDOMMap.get(n);
			return void 0 === o && t(75, n), o;
		}
		function wl(t) {
			const e = t.assignedSlot || t.parentElement;
			if (null !== e) return e;
			const n = t.parentNode;
			return ql(n) ? n.host : null;
		}
		function Ol(t) {
			return Bs(t) ? t : gc(t) ? t.ownerDocument : null;
		}
		function Al(t) {
			fi();
			_i()._updateTags.add(t);
		}
		function Dl(t) {
			fi();
			_i()._deferred.push(t);
		}
		function Fl(t, e) {
			let n = t.getParent();
			for (; null !== n;) {
				if (n.is(e)) return !0;
				n = n.getParent();
			}
			return !1;
		}
		function Pl(t) {
			const e = Ol(t);
			return e ? e.defaultView : null;
		}
		function Il(e) {
			const n = e._window;
			return null === n && t(78), n;
		}
		function Ll(t) {
			return Pi(t) && t.isInline() || Ki(t) && t.isInline();
		}
		function Kl(t) {
			let e = t.getLatest();
			for (; null !== e;) {
				if (null !== ta(e) && Pi(e)) return e;
				const t = e.getParentOrThrow();
				if (Bl(t)) return t;
				e = t;
			}
			return e;
		}
		function zl(t) {
			return Pi(t) && t.isShadowRoot();
		}
		function Bl(t) {
			return Bi(t) || zl(t);
		}
		function Rl(t, e = !1) {
			const n = t.constructor.clone(t, Ts);
			return Us(n, null), n.afterCloneFrom(t), e || n.resetOnCopyNodeFrom(t), n;
		}
		function Wl(e) {
			const n = _i(), o = e.getType(), r = Es(n, o);
			void 0 === r && t(200, e.constructor.name, o);
			const { replace: i, replaceWithKlass: s } = r;
			if (null !== i) {
				const n = i(e), r = n.constructor;
				return null !== s ? n instanceof s || t(201, s.name, s.getType(), r.name, r.getType(), e.constructor.name, o) : n instanceof e.constructor && r !== e.constructor || t(202, r.name, r.getType(), e.constructor.name, o), n.__key === e.__key && t(203, e.constructor.name, o, r.name, r.getType()), n;
			}
			return e;
		}
		function $l(e, n) {
			!Bi(e.getParent()) || Pi(n) || Ki(n) || t(99);
		}
		function Ul(e) {
			const n = Ys(e);
			return null === n && t(63, e), n;
		}
		function Hl(t) {
			if (!t || t.isInline()) return !1;
			if (Ki(t)) return !0;
			if (Pi(t)) {
				if (t.isShadowRoot()) {
					const e = t.getParent();
					return !(Pi(e) && e.isShadowRoot());
				}
				return !t.canBeEmpty();
			}
			return !1;
		}
		function jl(t, e, n) {
			n.style.removeProperty("caret-color"), e._blockCursorElement = null;
			const o = t.parentElement;
			null !== o && o.removeChild(t);
		}
		function Jl(t) {
			return n ? (t || window).getSelection() : null;
		}
		function Vl(t) {
			const e = Pl(t);
			return e ? e.getSelection() : null;
		}
		function ql(t) {
			return pc(t) && "host" in t;
		}
		const Yl = [];
		function Gl(t) {
			const e = t.getRootNode();
			if (e === t || !ql(e)) return Yl;
			const n = [e];
			let o = e.host;
			for (;;) {
				const t = o.getRootNode();
				if (t === o || !ql(t)) break;
				n.push(t), o = t.host;
			}
			return n;
		}
		function* Xl(t) {
			const e = [t];
			let n;
			for (; n = e.pop();) {
				yield* n.querySelectorAll("[data-lexical-editor=\"true\"]");
				const t = (Bs(n) ? n : n.ownerDocument).createTreeWalker(n, NodeFilter.SHOW_ELEMENT);
				let o;
				for (; o = t.nextNode();) o.shadowRoot && e.push(o.shadowRoot);
			}
		}
		function Ql(t) {
			return null !== t ? t.ownerDocument : document;
		}
		function Zl() {
			const t = mi();
			return Ql(null !== t ? t._rootElement : null);
		}
		function tc(t, e) {
			if (null === e || "function" != typeof t.getComposedRanges) return null;
			const n = Gl(e);
			if (0 === n.length) return null;
			const o = t.getComposedRanges;
			try {
				const e = o.call(t, { shadowRoots: n })[0];
				if (void 0 !== e) return e;
			} catch (t) {}
			try {
				const e = o.apply(t, n)[0];
				if (void 0 !== e) return e;
			} catch (t) {}
			return null;
		}
		function ec(t, e) {
			const n = tc(t, e);
			if (null !== n) {
				const t = rc(n);
				if (null !== t) return t;
			}
			return t.rangeCount > 0 ? t.getRangeAt(0) : null;
		}
		function nc(t, e) {
			const n = tc(t, e);
			return null === n ? t : ic(n, sc(t));
		}
		function rc(t) {
			const e = t.startContainer.ownerDocument;
			if (null === e) return null;
			const n = e.createRange();
			try {
				return n.setStart(t.startContainer, t.startOffset), n.setEnd(t.endContainer, t.endOffset), n;
			} catch (t) {
				return null;
			}
		}
		function ic(t, e) {
			const { startContainer: n, startOffset: o, endContainer: r, endOffset: i } = t;
			return "backward" === e ? {
				anchorNode: r,
				anchorOffset: i,
				direction: e,
				focusNode: n,
				focusOffset: o
			} : {
				anchorNode: n,
				anchorOffset: o,
				direction: e,
				focusNode: r,
				focusOffset: i
			};
		}
		function sc(t) {
			return t.direction;
		}
		function lc(t) {
			const e = t.getRootNode();
			return Bs(e) || ql(e) ? e.activeElement : null;
		}
		function cc(t) {
			let e = t.activeElement;
			for (; null !== e && null !== e.shadowRoot;) {
				const t = e.shadowRoot.activeElement;
				if (null === t) break;
				e = t;
			}
			return e;
		}
		function ac(t) {
			const e = t.target;
			if (null !== e && gc(e) && null !== e.shadowRoot && "function" == typeof t.composedPath) {
				const e = t.composedPath();
				if (e.length > 0) return e[0];
			}
			return e;
		}
		function gc(t) {
			return _c(t) && 1 === t.nodeType;
		}
		function _c(t) {
			return "object" == typeof t && null !== t && "nodeType" in t && "number" == typeof t.nodeType;
		}
		function pc(t) {
			return _c(t) && 11 === t.nodeType;
		}
		const yc = /^(a|abbr|acronym|b|cite|code|del|em|i|ins|kbd|label|mark|output|q|ruby|s|samp|span|strong|sub|sup|time|u|tt|var|#text)$/i;
		function mc(t) {
			return !(!gc(t) || !t.style.display.startsWith("inline")) || yc.test(t.nodeName);
		}
		const xc = /^(address|article|aside|blockquote|canvas|dd|div|dl|dt|fieldset|figcaption|figure|footer|form|h1|h2|h3|h4|h5|h6|header|hr|li|main|nav|noscript|ol|p|pre|section|table|td|tfoot|ul|video)$/i;
		function Cc(t) {
			return (!gc(t) || !t.style.display.startsWith("inline")) && xc.test(t.nodeName);
		}
		function Sc(t) {
			if (Ki(t) && !t.isInline()) return !0;
			if (!Pi(t) || Bl(t)) return !1;
			const e = t.getFirstChild(), n = null === e || Yi(e) || Xo(e) || e.isInline();
			return !t.isInline() && !1 !== t.canBeEmpty() && n;
		}
		function vc() {
			return _i();
		}
		function Tc(t = vc()) {
			return t._config.dom || ps;
		}
		function kc(e, n, o = vc()) {
			const r = Tc(o).$getDOMSlot(e, n, o);
			return Pi(e) && (Ec(r) || t(344, e.getKey(), e.getType())), r;
		}
		function Ec(t) {
			return t instanceof G;
		}
		function wc(t, e, n = vc()) {
			return Rs(kc(t, e, n).element);
		}
		const Oc = /* @__PURE__ */ new WeakMap(), Mc = /* @__PURE__ */ new Map();
		function Ac(e) {
			if (!e._readOnly && e.isEmpty()) return Mc;
			e._readOnly || t(192);
			let n = Oc.get(e);
			return n || (n = function(t) {
				const e = /* @__PURE__ */ new Map();
				for (const [n, o] of t._nodeMap) {
					const t = o.__type;
					let r = e.get(t);
					r || (r = /* @__PURE__ */ new Map(), e.set(t, r)), r.set(n, o);
				}
				return e;
			}(e), Oc.set(e, n)), n;
		}
		function Dc(t) {
			const e = t.constructor.clone(t, Ts);
			return e.afterCloneFrom(t), e;
		}
		function Fc(t) {
			return (e = Dc(t))[fo] = !0, e;
			var e;
		}
		function Pc(t, e) {
			const n = t.getAttribute("data-lexical-indent");
			if (null !== n) {
				const t = parseInt(n, 10);
				if (Number.isFinite(t) && t >= 0) return void e.setIndent(t);
			}
			const o = parseInt(t.style.paddingInlineStart, 10) || 0, r = Math.round(o / 40);
			e.setIndent(r);
		}
		function Ic(t, e) {
			const n = e.getAttribute("dir");
			return "ltr" === n || "rtl" === n ? t.setDirection(n) : t;
		}
		function Lc(t, e) {
			const n = e.style.textAlign;
			return n && n in R$1 ? t.setFormat(n) : t;
		}
		function Kc(t, e) {
			t.__lexicalUnmanaged = !0, e && void 0 !== e.captureSelection && (t.__lexicalCapturedSelection = e.captureSelection);
		}
		function zc(t) {
			return !0 === t.__lexicalUnmanaged;
		}
		function Bc(t, e = vc()) {
			const n = e.isEditable();
			t.contentEditable = n ? "true" : "false", n ? t.__lexicalEditor = e : delete t.__lexicalEditor;
		}
		function Rc(t, e) {
			let n = t;
			for (; null != n;) {
				if (!0 === n.__lexicalCapturedSelection) return !0;
				if (gc(n) && n.hasAttribute("data-lexical-slot")) return !1;
				if (void 0 !== Qs(n, e)) return !1;
				n = wl(n);
			}
			return !1;
		}
		function Wc(t, e) {
			return function(t, e) {
				return Object.prototype.hasOwnProperty.call(t, e);
			}(t, e) && t[e] !== _o[e];
		}
		const $c = /* @__PURE__ */ new WeakMap(), Uc = Symbol("lexical.synthesizedGetType");
		function Hc(e) {
			const n = $c.get(e);
			if (n) return n;
			const o = null != e.prototype && j in e.prototype ? e.prototype[j]() : void 0, r = function(e) {
				if (!(e === _o || e.prototype instanceof _o)) {
					let n = "<unknown>", o = "<unknown>";
					try {
						n = e.getType();
					} catch (t) {}
					try {
						Cs.version && (o = JSON.parse(Cs.version));
					} catch (t) {}
					t(290, e.name, n, o);
				}
				return e === Li || e === Fi || e === _o;
			}(e), i = !r && Wc(e, "getType") ? e.getType : void 0, s = i && !(Uc in i) ? i.call(e) : void 0;
			let l, c = s;
			if (o) if (s) l = o[s];
			else {
				for (const [t, e] of Object.entries(o)) c = t, l = e;
				if (!l) for (const t of Object.getOwnPropertySymbols(o)) {
					const e = o[t];
					if (e) {
						l = e;
						break;
					}
				}
			}
			if (!r && c) {
				if (!Wc(e, "getType")) {
					const t = e, n = function() {
						return this !== t ? _o.getType.call(this) : c;
					};
					n[Uc] = !0, e.getType = n;
				}
				if (Wc(e, "clone") || (e.clone = (t, n) => {
					vs(t);
					const o = new e();
					return n !== Ts && o.afterCloneFrom(t), o;
				}), Wc(e, "importJSON") || (e.importJSON = l && l.$importJSON || ((t) => new e().updateFromJSON(t))), !Wc(e, "importDOM") && l) {
					const { importDOM: t } = l;
					t && (e.importDOM = () => t);
				}
			}
			const a = {
				klass: e,
				ownNodeConfig: l,
				ownNodeType: c
			};
			return $c.set(e, a), a;
		}
		function* jc(t) {
			for (let e = t; e && (e === _o || po(e.prototype));) {
				const t = Hc(e);
				yield t, e = t.ownNodeConfig && t.ownNodeConfig.extends || Gc(e);
			}
		}
		function Vc(t) {
			const e = vc();
			fi();
			return new (e.resolveRegisteredNodeAfterReplacements(e.getRegisteredNode(t))).klass();
		}
		const qc = (t, e) => {
			let n = t;
			for (; null != n && !Bi(n);) {
				if (e(n)) return n;
				n = n.getParent();
			}
			return null;
		};
		function Yc(e, n) {
			const o = [];
			let r = e.__first;
			for (; null !== r;) {
				const e = null === n ? Ys(r) : n.get(r);
				e ?? t(174), o.push(r), r = e.__next;
			}
			return o;
		}
		function Gc(t) {
			const e = Object.getPrototypeOf(t);
			if ("function" == typeof e && e !== Function.prototype) return e;
			const n = t.prototype && Object.getPrototypeOf(t.prototype);
			return n ? n.constructor : null;
		}
		const Xc = /* @__PURE__ */ new Map();
		function Qc(t) {
			return Pi(t) || Ki(t);
		}
		function Zc(t) {
			return Pi(t) || Ki(t);
		}
		function ta(t) {
			const e = t.getLatest();
			return Zc(e) ? e.__slotHost : null;
		}
		function ea(e) {
			const n = ta(e);
			if (null === n) return null;
			const o = Ys(n);
			return Pi(o) || Ki(o) || t(370), o;
		}
		function na(t) {
			const e = ea(t);
			if (null === e) return null;
			const n = t.getLatest().__key;
			for (const [t, o] of ra(e)) if (o === n) return t;
			return null;
		}
		function oa(t) {
			let e = t.getLatest();
			for (; null !== e;) {
				if (null !== ta(e)) return e;
				e = e.getParent();
			}
			return null;
		}
		function ra(t) {
			const e = t.getLatest();
			return Qc(e) && null !== e.__slots ? e.__slots : Xc;
		}
		function ia(t) {
			return Array.from(ra(t).keys());
		}
		function sa(t, e) {
			const n = ra(t).get(e);
			return void 0 === n ? null : Ys(n);
		}
		const la = [
			"__proto__",
			"constructor",
			"prototype"
		], ca = Symbol("slotMapOwner");
		function aa(t) {
			let e = t.__slots;
			return null !== e && e[ca] === t || (e = new Map(e), e[ca] = t, t.__slots = e), e;
		}
		const ua = /* @__PURE__ */ new WeakMap(), fa = [];
		function da(t) {
			for (const { ownNodeConfig: e } of jc(t)) {
				const t = e && e.slots;
				if (t) return t;
			}
			return fa;
		}
		function ha(t) {
			let e = "";
			for (const n of ia(t)) {
				const o = sa(t, n);
				null !== o && (e += o.getTextContent());
			}
			return e;
		}
		function ga(t, e, n) {
			const o = n.get(t), r = n.get(e);
			return void 0 !== o ? void 0 !== r ? o - r : -1 : void 0 !== r ? 1 : t < e ? -1 : t > e ? 1 : 0;
		}
		function _a(e) {
			const n = e.__slots;
			if (null === n || n.size < 2) return;
			const o = function(e) {
				let n = ua.get(e);
				if (void 0 === n) {
					const o = da(e), r = /* @__PURE__ */ new Map();
					for (const n of o) la.includes(n) && t(371, e.name, n), r.has(n) && t(372, e.name, n), r.set(n, r.size);
					n = r, ua.set(e, n);
				}
				return n;
			}(e.constructor);
			let r = null, i = !0;
			for (const t of n.keys()) {
				if (null !== r && ga(r, t, o) > 0) {
					i = !1;
					break;
				}
				r = t;
			}
			if (i) return;
			const s = Array.from(n).sort(([t], [e]) => ga(t, e, o));
			n.clear();
			for (const [t, e] of s) n.set(t, e);
		}
		function pa(e, n, o) {
			"__proto__" !== n && "constructor" !== n && "prototype" !== n || t(373, n);
			const r = e.getLatest();
			if (null !== r.__slots && r.__slots.get(n) === o.getLatest().__key) return r;
			(!Pi(o) && !Ki(o) || o.isInline()) && t(374, o.__key);
			const i = e.getWritable(), s = aa(i), l = s.get(n);
			void 0 !== l && xa(l);
			const c = o.getWritable(), a = ea(c);
			if (null !== a) {
				const t = na(c);
				null !== t && aa(a.getWritable()).delete(t), c.__slotHost = null;
			}
			return Hs(c), c.__slotHost = i.__key, s.set(n, c.__key), _a(i), function() {
				const t = vc();
				t._slotsUsed = !0, t._pendingEditorState && (t._pendingEditorState._slotsUsed = !0);
			}(), i;
		}
		function ya(t, e) {
			const n = t.getWritable();
			if (null === n.__slots) return n;
			const o = n.__slots.get(e);
			return void 0 !== o && (xa(o), aa(n).delete(e)), n;
		}
		function xa(e) {
			const n = Ys(e);
			if (null === n) return;
			const o = n.getWritable();
			Zc(o) || t(377, e), o.__slotHost = null, o.remove();
		}
		const Ca = {
			next: "previous",
			previous: "next"
		};
		var Sa = class {
			origin;
			constructor(t) {
				this.origin = t;
			}
			[Symbol.iterator]() {
				return qa({
					hasNext: Ma,
					initial: this.getAdjacentCaret(),
					map: (t) => t,
					step: (t) => t.getAdjacentCaret()
				});
			}
			getAdjacentCaret() {
				return Ia(this.getNodeAtCaret(), this.direction);
			}
			getSiblingCaret() {
				return Ia(this.origin, this.direction);
			}
			remove() {
				const t = this.getNodeAtCaret();
				return t && t.remove(), this;
			}
			replaceOrInsert(t, e) {
				const n = this.getNodeAtCaret();
				return t.is(this.origin) || t.is(n) || (null === n ? this.insert(t) : n.replace(t, e)), this;
			}
			splice(e, n, o = "next") {
				const r = o === this.direction ? n : Array.from(n).reverse();
				let i = this;
				const s = this.getParentAtCaret(), l = /* @__PURE__ */ new Map();
				for (let t = i.getAdjacentCaret(); null !== t && l.size < e; t = t.getAdjacentCaret()) {
					const e = t.origin.getWritable();
					l.set(e.getKey(), e);
				}
				for (const e of r) {
					if (l.size > 0) {
						const n = i.getNodeAtCaret();
						if (n) if (l.delete(n.getKey()), l.delete(e.getKey()), n.is(e) || i.origin.is(e));
						else {
							const t = e.getParent();
							t && t.is(s) && e.remove(), n.replace(e);
						}
						else null === n && t(263, Array.from(l).join(" "));
					} else i.insert(e);
					i = Ia(e, this.direction);
				}
				for (const t of l.values()) t.remove();
				return this;
			}
		};
		var va = class va extends Sa {
			type = "child";
			getLatest() {
				const t = this.origin.getLatest();
				return t === this.origin ? this : Ba(t, this.direction);
			}
			getParentCaret(t = "root") {
				return Ia(ba(this.getParentAtCaret(), t), this.direction);
			}
			getFlipped() {
				const t = ka(this.direction);
				return Ia(this.getNodeAtCaret(), t) || Ba(this.origin, t);
			}
			getParentAtCaret() {
				return this.origin;
			}
			getChildCaret() {
				return this;
			}
			isSameNodeCaret(t) {
				return t instanceof va && this.direction === t.direction && this.origin.is(t.origin);
			}
			isSamePointCaret(t) {
				return this.isSameNodeCaret(t);
			}
		};
		const Ta = {
			root: Bi,
			shadowRoot: Bl
		};
		function ka(t) {
			return Ca[t];
		}
		function ba(t, e = "root") {
			return null === t || Ta[e](t) ? null : null === ta(t) ? t : null;
		}
		var Na = class Na extends Sa {
			type = "sibling";
			getLatest() {
				const t = this.origin.getLatest();
				return t === this.origin ? this : Ia(t, this.direction);
			}
			getSiblingCaret() {
				return this;
			}
			getParentAtCaret() {
				return this.origin.getParent();
			}
			getChildCaret() {
				return Pi(this.origin) ? Ba(this.origin, this.direction) : null;
			}
			getParentCaret(t = "root") {
				return Ia(ba(this.getParentAtCaret(), t), this.direction);
			}
			getFlipped() {
				const t = ka(this.direction);
				return Ia(this.getNodeAtCaret(), t) || Ba(this.origin.getParentOrThrow(), t);
			}
			isSamePointCaret(t) {
				return t instanceof Na && this.direction === t.direction && this.origin.is(t.origin);
			}
			isSameNodeCaret(t) {
				return (t instanceof Na || t instanceof Ea) && this.direction === t.direction && this.origin.is(t.origin);
			}
		};
		var Ea = class Ea extends Sa {
			type = "text";
			offset;
			constructor(t, e) {
				super(t), this.offset = e;
			}
			getLatest() {
				const t = this.origin.getLatest();
				return t === this.origin ? this : La(t, this.direction, this.offset);
			}
			getParentAtCaret() {
				return this.origin.getParent();
			}
			getChildCaret() {
				return null;
			}
			getParentCaret(t = "root") {
				return Ia(ba(this.getParentAtCaret(), t), this.direction);
			}
			getFlipped() {
				return La(this.origin, ka(this.direction), this.offset);
			}
			isSamePointCaret(t) {
				return t instanceof Ea && this.direction === t.direction && this.origin.is(t.origin) && this.offset === t.offset;
			}
			isSameNodeCaret(t) {
				return (t instanceof Na || t instanceof Ea) && this.direction === t.direction && this.origin.is(t.origin);
			}
			getSiblingCaret() {
				return Ia(this.origin, this.direction);
			}
		};
		function wa(t) {
			return t instanceof Ea;
		}
		function Ma(t) {
			return t instanceof Na;
		}
		function Aa(t) {
			return t instanceof va;
		}
		const Da = {
			next: class extends Ea {
				direction = "next";
				getNodeAtCaret() {
					return this.origin.getNextSibling();
				}
				insert(t) {
					return this.origin.insertAfter(t), this;
				}
			},
			previous: class extends Ea {
				direction = "previous";
				getNodeAtCaret() {
					return this.origin.getPreviousSibling();
				}
				insert(t) {
					return this.origin.insertBefore(t), this;
				}
			}
		}, Fa = {
			next: class extends Na {
				direction = "next";
				getNodeAtCaret() {
					return this.origin.getNextSibling();
				}
				insert(t) {
					return this.origin.insertAfter(t), this;
				}
			},
			previous: class extends Na {
				direction = "previous";
				getNodeAtCaret() {
					return this.origin.getPreviousSibling();
				}
				insert(t) {
					return this.origin.insertBefore(t), this;
				}
			}
		}, Pa = {
			next: class extends va {
				direction = "next";
				getNodeAtCaret() {
					return this.origin.getFirstChild();
				}
				insert(t) {
					return this.origin.splice(0, 0, [t]), this;
				}
			},
			previous: class extends va {
				direction = "previous";
				getNodeAtCaret() {
					return this.origin.getLastChild();
				}
				insert(t) {
					return this.origin.splice(this.origin.getChildrenSize(), 0, [t]), this;
				}
			}
		};
		function Ia(t, e) {
			return t ? new Fa[e](t) : null;
		}
		function La(t, e, n) {
			return t ? new Da[e](t, Ka(t, n)) : null;
		}
		function Ka(t, n, o = "error") {
			const r = t.getTextContentSize();
			let i = "next" === n ? r : "previous" === n ? 0 : n;
			return (i < 0 || i > r) && ("clamp" !== o && e(284, String(n), String(r), t.getKey()), i = i < 0 ? 0 : r), i;
		}
		function za(t, e) {
			return new Ua(t, e);
		}
		function Ba(t, e) {
			return Pi(t) ? new Pa[e](t) : null;
		}
		function Ra(t) {
			return t && t.getChildCaret() || t;
		}
		function Wa(t) {
			return t && Ra(t.getAdjacentCaret());
		}
		var $a = class $a {
			type = "node-caret-range";
			direction;
			anchor;
			focus;
			constructor(t, e, n) {
				this.anchor = t, this.focus = e, this.direction = n;
			}
			getLatest() {
				const t = this.anchor.getLatest(), e = this.focus.getLatest();
				return t === this.anchor && e === this.focus ? this : new $a(t, e, this.direction);
			}
			isCollapsed() {
				return this.anchor.isSamePointCaret(this.focus);
			}
			getTextSlices() {
				const t = (t) => {
					const e = this[t].getLatest();
					return wa(e) ? function(t, e) {
						const { direction: n, origin: o } = t;
						return za(t, Ka(o, "focus" === e ? ka(n) : n) - t.offset);
					}(e, t) : null;
				}, e = t("anchor"), n = t("focus");
				if (e && n) {
					const { caret: t } = e, { caret: o } = n;
					if (t.isSameNodeCaret(o)) return [za(t, o.offset - t.offset), null];
				}
				return [e, n];
			}
			iterNodeCarets(t = "root") {
				const e = wa(this.anchor) ? this.anchor.getSiblingCaret() : this.anchor.getLatest(), n = this.focus.getLatest(), o = wa(n), r = (e) => e.isSameNodeCaret(n) ? null : Wa(e) || e.getParentCaret(t);
				return qa({
					hasNext: (t) => null !== t && !(o && n.isSameNodeCaret(t)),
					initial: e.isSameNodeCaret(n) ? null : r(e),
					map: (t) => t,
					step: r
				});
			}
			[Symbol.iterator]() {
				return this.iterNodeCarets("root");
			}
		};
		var Ua = class {
			type = "slice";
			caret;
			distance;
			constructor(t, e) {
				this.caret = t, this.distance = e;
			}
			getSliceIndices() {
				const { distance: t, caret: { offset: e } } = this, n = e + t;
				return n < e ? [n, e] : [e, n];
			}
			getTextContent() {
				const [t, e] = this.getSliceIndices();
				return this.caret.origin.getTextContent().slice(t, e);
			}
			getTextContentSize() {
				return Math.abs(this.distance);
			}
			removeTextSlice() {
				const { caret: { origin: t, direction: e } } = this, [n, o] = this.getSliceIndices(), r = t.getTextContent();
				return La(t.setTextContent(r.slice(0, n) + r.slice(o)), e, n);
			}
		};
		function ja(t) {
			return Va(t, Ia(nl(), t.direction));
		}
		function Ja(t) {
			return Va(t, t);
		}
		function Va(e, n) {
			return e.direction !== n.direction && t(265), new $a(e, n, e.direction);
		}
		function qa(t) {
			const { initial: e, hasNext: n, step: o, map: r } = t;
			let i = e;
			return {
				[Symbol.iterator]() {
					return this;
				},
				next() {
					if (!n(i)) return {
						done: !0,
						value: void 0
					};
					const t = {
						done: !1,
						value: r(i)
					};
					return i = o(i), t;
				}
			};
		}
		function Ya(e, n) {
			const o = Za(e.origin, n.origin);
			switch (null === o && t(275, e.origin.getKey(), n.origin.getKey()), o.type) {
				case "same": {
					const t = "text" === e.type, o = "text" === n.type;
					return t && o ? function(t, e) {
						return Math.sign(t - e);
					}(e.offset, n.offset) : e.type === n.type ? 0 : t ? -1 : o ? 1 : "child" === e.type ? -1 : 1;
				}
				case "ancestor": return "child" === e.type ? -1 : 1;
				case "descendant": return "child" === n.type ? 1 : -1;
				case "branch": return Ga(o);
			}
		}
		function Ga(t) {
			const { a: e, b: n } = t, o = e.__key, r = n.__key;
			let i = e, s = n;
			for (; i && s; i = i.getNextSibling(), s = s.getNextSibling()) {
				if (i.__key === r) return -1;
				if (s.__key === o) return 1;
			}
			return null === i ? 1 : -1;
		}
		function Xa(t, e) {
			return e.is(t);
		}
		function Qa(t) {
			return Pi(t) ? [t.getLatest(), null] : [t.getParent(), t.getLatest()];
		}
		function Za(e, n) {
			if (e.is(n)) return {
				commonAncestor: e,
				type: "same"
			};
			const o = /* @__PURE__ */ new Map();
			for (let [t, n] = Qa(e); t; n = t, t = t.getParent()) o.set(t, n);
			for (let [r, i] = Qa(n); r; i = r, r = r.getParent()) {
				const s = o.get(r);
				if (void 0 !== s) return null === s ? (Xa(e, r) || t(276), {
					commonAncestor: r,
					type: "ancestor"
				}) : null === i ? (Xa(n, r) || t(277), {
					commonAncestor: r,
					type: "descendant"
				}) : ((Pi(s) || Xa(e, s)) && (Pi(i) || Xa(n, i)) && r.is(s.getParent()) && r.is(i.getParent()) || t(278), {
					a: s,
					b: i,
					commonAncestor: r,
					type: "branch"
				});
			}
			return null;
		}
		function tu(e, n) {
			const { type: o, key: r, offset: i } = e, s = Ul(e.key);
			return "text" === o ? (Xo(s) || t(266, s.getType(), r), La(s, n, i)) : (Pi(s) || t(267, s.getType(), r), hu(s, e.offset, n));
		}
		function eu(e, n) {
			const { origin: o, direction: r } = n, i = "next" === r;
			wa(n) ? e.set(o.getKey(), n.offset, "text") : Ma(n) ? Xo(o) ? e.set(o.getKey(), Ka(o, r), "text") : e.set(o.getParentOrThrow().getKey(), o.getIndexWithinParent() + (i ? 1 : 0), "element") : (Aa(n) && Pi(o) || t(268), e.set(o.getKey(), i ? 0 : o.getChildrenSize(), "element"));
		}
		function nu(t) {
			const e = Kr(), n = ur(e) ? e : Fr();
			return ou(n, t), ol(n), n;
		}
		function ou(t, e) {
			eu(t.anchor, e.anchor), eu(t.focus, e.focus);
		}
		function ru(t) {
			const { anchor: e, focus: n } = t, o = tu(e, "next"), r = tu(n, "next"), i = Ya(o, r) <= 0 ? "next" : "previous";
			return Va(fu(o, i), fu(r, i));
		}
		function iu(t) {
			const { direction: e, origin: n } = t, o = Ia(n, ka(e)).getNodeAtCaret();
			return o ? Ia(o, e) : Ba(n.getParentOrThrow(), e);
		}
		function su(t, e = "root") {
			const n = [t];
			for (let o = Aa(t) ? t.getParentCaret(e) : t.getSiblingCaret(); null !== o; o = o.getParentCaret(e)) n.push(iu(o));
			return n;
		}
		function lu(t) {
			return !!t && t.origin.isAttached();
		}
		function cu(e, n = "removeEmptySlices") {
			if (e.isCollapsed()) return e;
			const o = "root", r = "next";
			let i = n;
			const s = du(e, r), l = su(s.anchor, o), c = su(s.focus.getFlipped(), o), a = /* @__PURE__ */ new Set(), u = [];
			for (const t of s.iterNodeCarets(o)) if (Aa(t)) a.add(t.origin.getKey());
			else if (Ma(t)) {
				const { origin: e } = t;
				Pi(e) && !a.has(e.getKey()) || u.push(e);
			}
			const f = /* @__PURE__ */ new Set();
			for (const t of u) {
				const e = t.getParent();
				null === e || a.has(e.getKey()) || f.add(e), Hs(t);
			}
			for (const t of f) !t.canBeEmpty() && !Bl(t) && t.isEmpty() && t.isAttached() && t.remove();
			for (const t of s.getTextSlices()) {
				if (!t) continue;
				const { origin: e } = t.caret, n = e.getTextContentSize(), o = iu(Ia(e, r)), s = e.getMode();
				if (Math.abs(t.distance) === n && "removeEmptySlices" === i || "token" === s && 0 !== t.distance) o.remove();
				else if (0 !== t.distance) {
					i = "removeEmptySlices";
					let e = t.removeTextSlice();
					const n = t.caret.origin;
					if ("segmented" === s) {
						const t = e.origin, n = Go(t.getTextContent()).setStyle(t.getStyle()).setFormat(t.getFormat());
						o.replaceOrInsert(n), e = La(n, r, e.offset);
					}
					n.is(l[0].origin) && (l[0] = e), n.is(c[0].origin) && (c[0] = e.getFlipped());
				}
			}
			let d, h;
			for (const t of l) if (lu(t)) {
				d = au(t);
				break;
			}
			for (const t of c) if (lu(t)) {
				h = au(t);
				break;
			}
			const g = function(t, e, n) {
				if (!t || !e) return null;
				const o = t.getParentAtCaret(), r = e.getParentAtCaret();
				if (!o || !r) return null;
				const i = o.getParents().reverse();
				i.push(o);
				const s = r.getParents().reverse();
				s.push(r);
				const l = Math.min(i.length, s.length);
				let c;
				for (c = 0; c < l && i[c] === s[c]; c++);
				const a = (t, e) => {
					let n;
					for (let o = c; o < t.length; o++) {
						const r = t[o];
						if (Bl(r)) return;
						!n && e(r) && (n = r);
					}
					return n;
				}, u = a(i, Sc), f = u && a(s, (t) => n.has(t.getKey()) && Sc(t));
				if (f && ia(f).length > 0) return null;
				return u && f ? [u, f] : null;
			}(d, h, a);
			if (g) {
				const [t, e] = g;
				Ba(t, "previous").splice(0, e.getChildren());
				let n = e.getParent();
				for (e.remove(!0); n && n.isEmpty();) {
					const t = n;
					n = n.getParent(), t.remove(!0);
				}
			} else if (h) {
				const t = function(t) {
					if (Aa(t)) {
						const e = t.origin;
						if (Sc(e)) return e;
					} else {
						const e = t.getParentAtCaret();
						if (e && Sc(e)) return e;
					}
					return null;
				}(h), e = t && t.getParent(), n = t && t.getParents().findLast(zl);
				if (t && e && !Bi(e) && t.isEmpty() && a.has(t.getKey()) && 0 === ia(t).length && (!n || a.has(n.getKey()))) {
					t.remove(!0);
					let n = e;
					for (; n && !Bi(n) && n.isEmpty();) {
						const t = n.getParent();
						if (t && Bi(t) && t.getChildrenSize() <= 1) break;
						const e = n;
						n = t, e.remove(!0);
					}
				}
			}
			const _ = [
				d,
				h,
				...l,
				...c
			].find(lu);
			if (_) return Ja(fu(au(_), e.direction));
			t(269, JSON.stringify(l.map((t) => t.origin.__key)));
		}
		function au(t) {
			const e = function(t) {
				let e = t;
				for (; Aa(e);) {
					const t = Wa(e);
					if (!Aa(t)) break;
					e = t;
				}
				return e;
			}(t.getLatest()), { direction: n } = e;
			if (Xo(e.origin)) return wa(e) ? e : La(e.origin, n, n);
			const o = e.getAdjacentCaret();
			return Ma(o) && Xo(o.origin) ? La(o.origin, n, ka(n)) : e;
		}
		function uu(t) {
			return wa(t) && t.offset !== Ka(t.origin, t.direction);
		}
		function fu(t, e) {
			return t.direction === e ? t : t.getFlipped();
		}
		function du(t, e) {
			return t.direction === e ? t : Va(fu(t.focus, e), fu(t.anchor, e));
		}
		function hu(t, e, n) {
			let o = Ba(t, "next");
			for (let t = 0; t < e; t++) {
				const t = o.getAdjacentCaret();
				if (null === t) break;
				o = t;
			}
			return fu(o, n);
		}
		function _u(e) {
			const { origin: n, offset: o, direction: r } = e;
			if (o === Ka(n, r)) return e.getSiblingCaret();
			if (o === Ka(n, ka(r))) return iu(e.getSiblingCaret());
			const [i] = n.splitText(o);
			return Xo(i) || t(281), fu(Ia(i, "next"), r);
		}
		function pu(t, e) {
			return !0;
		}
		function yu(t, { $copyElementNode: e = Rl, $splitTextPointCaretNext: n = _u, rootMode: o = "shadowRoot", $shouldSplit: r = pu, removeEmptyDestination: i = !1 } = {}) {
			if (wa(t)) return n(t);
			const s = t.getParentCaret(o);
			if (s) {
				const { origin: n } = s;
				if (Aa(t)) {
					const t = iu(s);
					if (i && n.isEmpty()) return n.remove(), t;
					if (!n.canBeEmpty() || !r(n, "first")) return t;
				}
				const o = function(t) {
					const e = [];
					for (let n = t.getAdjacentCaret(); n; n = n.getAdjacentCaret()) e.push(n.origin);
					return e;
				}(t);
				(o.length > 0 || !i && n.canBeEmpty() && r(n, "last")) && s.insert(e(n).splice(0, 0, o));
			}
			return s;
		}
		function mu(e, n, o) {
			let r = fu(n, "next");
			wa(r) && (0 === r.offset ? r = Ia(r.origin, "previous").getFlipped() : r.offset === r.origin.getTextContentSize() && (r = Ia(r.origin, "next"))), r.origin.is(e) && (Ma(r) || t(342, e.getKey(), e.getType()), r = iu(r)), (e.is(r.getNodeAtCaret()) || e.is(r.getFlipped().getNodeAtCaret())) && e.remove(!0);
			for (let t = r; t; t = yu(t, o)) r = t;
			return wa(r) && t(283), r.insert(e.isInline() ? es().append(e) : e), fu(Ia(e.getLatest(), "next"), n.direction);
		}
		function xu(t) {
			return t;
		}
		function vu(t) {
			return t;
		}
		function Tu(t, e) {
			if (!e || t === e) return t;
			for (const n in e) if (t[n] !== e[n]) return {
				...t,
				...e
			};
			return t;
		}
		function ku(...t) {
			const e = [];
			for (const n of t) if (n && "string" == typeof n) for (const [t] of n.matchAll(/\S+/g)) e.push(t);
			return e;
		}
		function bu(t, ...e) {
			const n = ku(...e);
			n.length > 0 && t.classList.add(...n);
		}
		function Eu(...t) {
			return () => {
				for (let e = t.length - 1; e >= 0; e--) t[e]();
				t.length = 0;
			};
		}
		//#endregion
		//#region ../../../node_modules/.pnpm/@lexical+selection@0.49.0_typescript@6.0.3/node_modules/@lexical/selection/dist/LexicalSelection.prod.mjs
		/**
		* Copyright (c) Meta Platforms, Inc. and affiliates.
		*
		* This source code is licensed under the MIT license found in the
		* LICENSE file in the root directory of this source tree.
		*
		*/
		function R(e) {
			const t = vc().getElementByKey(e.getKey());
			if (null === t) return null;
			const o = t.ownerDocument.defaultView;
			return null === o ? null : o.getComputedStyle(t);
		}
		function O$2(e) {
			return R(Bi(e) ? e : e.getParentOrThrow());
		}
		function L(e, t, n = "self") {
			const o = e.getStartEndPoints();
			if (t.isSelected(e) && !Ks(t) && null !== o) {
				const [l, r] = o, i = e.isBackward(), s = l.getNode(), c = r.getNode(), g = t.is(s), a = t.is(c);
				if (g || a) {
					const [o, l] = yr(e), r = s.is(c), g = t.is(i ? c : s), a = t.is(i ? s : c);
					let d, p = 0;
					if (r) p = o > l ? l : o, d = o > l ? o : l;
					else if (g) p = i ? l : o, d = void 0;
					else if (a) p = 0, d = i ? o : l;
					const h = t.__text.slice(p, d);
					h !== t.__text && ("clone" === n && (t = Fc(t)), t.__text = h);
				}
			}
			return t;
		}
		function Z(e) {
			const t = ee$2(e);
			return null !== t && "vertical-rl" === t.writingMode;
		}
		function ee$2(e) {
			const t = e.anchor.getNode();
			return Pi(t) ? R(t) : O$2(t);
		}
		function te$2(e, n) {
			let o = Z(e) ? !n : n;
			oe$2(e) && (o = !o);
			const l = tu(e.focus, o ? "previous" : "next");
			if (uu(l)) return !1;
			if (wa(l) && !er(l.origin) && l.origin.isUnmergeable()) {
				const e = l.getNodeAtCaret();
				if (Xo(e) && !er(e)) return !0;
			}
			for (const e of ja(l)) {
				if (Aa(e)) return !e.origin.isInline();
				if (!Pi(e.origin)) {
					if (Ki(e.origin)) return !0;
					break;
				}
			}
			return !1;
		}
		function ne$2(e, t, n, o) {
			e.modify(t ? "extend" : "move", n, o);
		}
		function oe$2(e) {
			const t = ee$2(e);
			return null !== t && "rtl" === t.direction;
		}
		function le$1(e, t, n) {
			const o = oe$2(e);
			let l;
			l = Z(e) || o ? !n : n, ne$2(e, t, l, "character");
		}
		function Mt(t, e) {
			return null !== t && Object.getPrototypeOf(t).constructor.name === e.name;
		}
		//#endregion
		//#region ../../../node_modules/.pnpm/@lexical+extension@0.49.0_typescript@6.0.3/node_modules/@lexical/extension/dist/LexicalExtension.prod.mjs
		/**
		* Copyright (c) Meta Platforms, Inc. and affiliates.
		*
		* This source code is licensed under the MIT license found in the
		* LICENSE file in the root directory of this source tree.
		*
		*/
		const Kt$1 = Symbol.for("preact-signals");
		function $t$1() {
			if (Bt$1 > 1) return void Bt$1--;
			let t, e = !1;
			for (function() {
				let t = Wt$1;
				for (Wt$1 = void 0; void 0 !== t;) t.S.v === t.v && (t.S.i = t.i), t = t.o;
			}(); void 0 !== zt$1;) {
				let n = zt$1;
				for (zt$1 = void 0, Vt$1++; void 0 !== n;) {
					const i = n.u;
					if (n.u = void 0, n.f &= -3, !(8 & n.f) && qt$1(n)) try {
						n.c();
					} catch (n) {
						e || (t = n, e = !0);
					}
					n = i;
				}
			}
			if (Vt$1 = 0, Bt$1--, e) throw t;
		}
		let Tt$1, zt$1;
		function Ut$1(t) {
			const e = Tt$1;
			Tt$1 = void 0;
			try {
				return t();
			} finally {
				Tt$1 = e;
			}
		}
		let Wt$1, Bt$1 = 0, Vt$1 = 0, Zt$1 = 0, Ht$1 = 0;
		function Jt$1(t) {
			if (void 0 === Tt$1) return;
			let e = t.n;
			return void 0 === e || e.t !== Tt$1 ? (e = {
				i: 0,
				S: t,
				p: Tt$1.s,
				n: void 0,
				t: Tt$1,
				e: void 0,
				x: void 0,
				r: e
			}, void 0 !== Tt$1.s && (Tt$1.s.n = e), Tt$1.s = e, t.n = e, 32 & Tt$1.f && t.S(e), e) : -1 === e.i ? (e.i = 0, void 0 !== e.n && (e.n.p = e.p, void 0 !== e.p && (e.p.n = e.n), e.p = Tt$1.s, e.n = void 0, Tt$1.s.n = e, Tt$1.s = e), e) : void 0;
		}
		function Xt$1(t, e) {
			this.v = t, this.i = 0, this.n = void 0, this.t = void 0, this.l = 0, this.W = null == e ? void 0 : e.watched, this.Z = null == e ? void 0 : e.unwatched, this.name = null == e ? void 0 : e.name;
		}
		function qt$1(t) {
			for (let e = t.s; void 0 !== e; e = e.n) if (e.S.i !== e.i || !e.S.h() || e.S.i !== e.i) return !0;
			return !1;
		}
		function Qt$1(t) {
			for (let e = t.s; void 0 !== e; e = e.n) {
				const n = e.S.n;
				if (void 0 !== n && (e.r = n), e.S.n = e, e.i = -1, void 0 === e.n) {
					t.s = e;
					break;
				}
			}
		}
		function te$1(t) {
			let e, n = t.s;
			for (; void 0 !== n;) {
				const t = n.p;
				-1 === n.i ? (n.S.U(n), void 0 !== t && (t.n = n.n), void 0 !== n.n && (n.n.p = t)) : e = n, n.S.n = n.r, void 0 !== n.r && (n.r = void 0), n = t;
			}
			t.s = e;
		}
		function ee$1(t, e) {
			Xt$1.call(this, void 0), this.x = t, this.s = void 0, this.g = Ht$1 - 1, this.f = 4, this.W = null == e ? void 0 : e.watched, this.Z = null == e ? void 0 : e.unwatched, this.name = null == e ? void 0 : e.name;
		}
		function ie$1(t) {
			const e = t.m;
			if (t.m = void 0, "function" == typeof e) {
				Bt$1++;
				const n = Tt$1;
				Tt$1 = void 0;
				try {
					e();
				} catch (e) {
					throw t.f &= -2, t.f |= 8, oe$1(t), e;
				} finally {
					Tt$1 = n, $t$1();
				}
			}
		}
		function oe$1(t) {
			for (let e = t.s; void 0 !== e; e = e.n) e.S.U(e);
			t.x = void 0, t.s = void 0, ie$1(t);
		}
		function se$1(t) {
			if (Tt$1 !== this) throw new Error("Out-of-order effect");
			te$1(this), Tt$1 = t, this.f &= -2, 8 & this.f && oe$1(this), $t$1();
		}
		function re$1(t, e) {
			this.x = t, this.m = void 0, this.s = void 0, this.u = void 0, this.f = 32, this.name = null == e ? void 0 : e.name;
		}
		function ce$1(t, e) {
			const n = new re$1(t, e);
			try {
				n.c();
			} catch (t) {
				throw n.d(), t;
			}
			const i = n.d.bind(n);
			return i[Symbol.dispose] = i, i;
		}
		Xt$1.prototype.brand = Kt$1, Xt$1.prototype.h = function() {
			return !0;
		}, Xt$1.prototype.S = function(t) {
			const e = this.t;
			e !== t && void 0 === t.e && (t.x = e, this.t = t, void 0 !== e ? e.e = t : Ut$1(() => {
				var t;
				null == (t = this.W) || t.call(this);
			}));
		}, Xt$1.prototype.U = function(t) {
			if (void 0 !== this.t) {
				const e = t.e, n = t.x;
				void 0 !== e && (e.x = n, t.e = void 0), void 0 !== n && (n.e = e, t.x = void 0), t === this.t && (this.t = n, void 0 === n && Ut$1(() => {
					var t;
					null == (t = this.Z) || t.call(this);
				}));
			}
		}, Xt$1.prototype.subscribe = function(t) {
			return ce$1(() => {
				const e = this.value, n = Tt$1;
				Tt$1 = void 0;
				try {
					t(e);
				} finally {
					Tt$1 = n;
				}
			}, { name: "sub" });
		}, Xt$1.prototype.valueOf = function() {
			return this.value;
		}, Xt$1.prototype.toString = function() {
			return this.value + "";
		}, Xt$1.prototype.toJSON = function() {
			return this.value;
		}, Xt$1.prototype.peek = function() {
			const t = Tt$1;
			Tt$1 = void 0;
			try {
				return this.value;
			} finally {
				Tt$1 = t;
			}
		}, Object.defineProperty(Xt$1.prototype, "value", {
			get() {
				const t = Jt$1(this);
				return void 0 !== t && (t.i = this.i), this.v;
			},
			set(t) {
				if (t !== this.v) {
					if (Vt$1 > 100) throw new Error("Cycle detected");
					(function(t) {
						0 !== Bt$1 && 0 === Vt$1 && t.l !== Zt$1 && (t.l = Zt$1, Wt$1 = {
							S: t,
							v: t.v,
							i: t.i,
							o: Wt$1
						});
					})(this), this.v = t, this.i++, Ht$1++, Bt$1++;
					try {
						for (let t = this.t; void 0 !== t; t = t.x) t.t.N();
					} finally {
						$t$1();
					}
				}
			}
		}), ee$1.prototype = new Xt$1(), ee$1.prototype.h = function() {
			if (this.f &= -3, 1 & this.f) return !1;
			if (32 == (36 & this.f)) return !0;
			if (this.f &= -5, this.g === Ht$1) return !0;
			if (this.g = Ht$1, this.f |= 1, this.i > 0 && !qt$1(this)) return this.f &= -2, !0;
			const t = Tt$1;
			try {
				Qt$1(this), Tt$1 = this;
				const t = this.x();
				(16 & this.f || this.v !== t || 0 === this.i) && (this.v = t, this.f &= -17, this.i++);
			} catch (t) {
				this.v = t, this.f |= 16, this.i++;
			}
			return Tt$1 = t, te$1(this), this.f &= -2, !0;
		}, ee$1.prototype.S = function(t) {
			if (void 0 === this.t) {
				this.f |= 36;
				for (let t = this.s; void 0 !== t; t = t.n) t.S.S(t);
			}
			Xt$1.prototype.S.call(this, t);
		}, ee$1.prototype.U = function(t) {
			if (void 0 !== this.t && (Xt$1.prototype.U.call(this, t), void 0 === this.t)) {
				this.f &= -33;
				for (let t = this.s; void 0 !== t; t = t.n) t.S.U(t);
			}
		}, ee$1.prototype.N = function() {
			if (!(2 & this.f)) {
				this.f |= 6;
				for (let t = this.t; void 0 !== t; t = t.x) t.t.N();
			}
		}, Object.defineProperty(ee$1.prototype, "value", { get() {
			if (1 & this.f) throw new Error("Cycle detected");
			const t = Jt$1(this);
			if (this.h(), void 0 !== t && (t.i = this.i), 16 & this.f) throw this.v;
			return this.v;
		} }), re$1.prototype.c = function() {
			const t = this.S();
			try {
				if (8 & this.f) return;
				if (void 0 === this.x) return;
				const t = this.x();
				"function" == typeof t && (this.m = t);
			} finally {
				t();
			}
		}, re$1.prototype.S = function() {
			if (1 & this.f) throw new Error("Cycle detected");
			this.f |= 1, this.f &= -9, ie$1(this), Qt$1(this), Bt$1++;
			const t = Tt$1;
			return Tt$1 = this, se$1.bind(this, t);
		}, re$1.prototype.N = function() {
			2 & this.f || (this.f |= 2, this.u = zt$1, zt$1 = this);
		}, re$1.prototype.d = function() {
			this.f |= 8, 1 & this.f || oe$1(this);
		}, re$1.prototype.dispose = function() {
			this.d();
		};
		function ve$1(t) {
			return ("function" == typeof t.nodes ? t.nodes() : t.nodes) || [];
		}
		function Ie$1(t, ...e) {
			const n = new URL("https://lexical.dev/docs/error"), i = new URLSearchParams();
			i.append("code", t);
			for (const t of e) i.append("v", t);
			throw n.search = i.toString(), Error(`Minified Lexical error #${t}; visit ${n.toString()} for the full message or use the non-minified dev environment for full errors and additional helpful warnings.`);
		}
		let Fe$1;
		try {
			Fe$1 = "0.49.0+prod.esm";
		} catch (t) {}
		const Me$1 = Fe$1 ?? "\"<unknown>+source\"", ke$1 = new Set([
			"__proto__",
			"constructor",
			"prototype"
		]);
		function _e$1(t, e) {
			if (t && e && !Array.isArray(e) && "object" == typeof t && "object" == typeof e) {
				const n = t, i = e;
				for (const t in i) !ke$1.has(t) && Object.prototype.hasOwnProperty.call(i, t) && (n[t] = _e$1(n[t], i[t]));
				return t;
			}
			return e;
		}
		const Ae$1 = 0, Pe$1 = 1, Le$1 = 2, Ke$1 = 3, $e$1 = 4, je$1 = 5, Te$1 = 6, ze$1 = 7;
		function Ue$1(t) {
			return t.id === Ae$1;
		}
		function We$1(t) {
			return t.id === Le$1;
		}
		function Be$1(t) {
			return function(t) {
				return t.id === Pe$1;
			}(t) || Ie$1(305, String(t.id), String(Pe$1)), Object.assign(t, { id: Le$1 });
		}
		const Ve$1 = /* @__PURE__ */ new Set();
		var Ge$1 = class {
			builder;
			configs;
			_dependency;
			_peerNameSet;
			extension;
			state;
			_signal;
			constructor(t, e) {
				this.builder = t, this.extension = e, this.configs = /* @__PURE__ */ new Set(), this.state = { id: Ae$1 };
			}
			mergeConfigs() {
				let t = this.extension.config || {};
				const e = this.extension.mergeConfig ? this.extension.mergeConfig.bind(this.extension) : Tu;
				for (const n of this.configs) t = e(t, n);
				return t;
			}
			init(t) {
				const e = this.state;
				We$1(e) || Ie$1(306, String(e.id));
				const n = {
					getDependency: this.getInitDependency.bind(this),
					getDirectDependentNames: this.getDirectDependentNames.bind(this),
					getPeer: this.getInitPeer.bind(this),
					getPeerNameSet: this.getPeerNameSet.bind(this)
				}, i = {
					...n,
					getDependency: this.getDependency.bind(this),
					getInitResult: this.getInitResult.bind(this),
					getPeer: this.getPeer.bind(this)
				}, o = function(t, e, n) {
					return Object.assign(t, {
						config: e,
						id: Ke$1,
						registerState: n
					});
				}(e, this.mergeConfigs(), n);
				let s;
				this.state = o, this.extension.init && (s = this.extension.init(t, o.config, n)), this.state = function(t, e, n) {
					return Object.assign(t, {
						id: $e$1,
						initResult: e,
						registerState: n
					});
				}(o, s, i);
			}
			build(t) {
				const e = this.state;
				let n;
				e.id !== $e$1 && Ie$1(307, String(e.id), String(je$1)), this.extension.build && (n = this.extension.build(t, e.config, e.registerState));
				const i = {
					...e.registerState,
					getOutput: () => n,
					getSignal: this.getSignal.bind(this)
				};
				this.state = function(t, e, n) {
					return Object.assign(t, {
						id: je$1,
						output: e,
						registerState: n
					});
				}(e, n, i);
			}
			register(t, e) {
				this._signal = e;
				const n = this.state;
				n.id !== je$1 && Ie$1(308, String(n.id), String(je$1));
				const i = this.extension.register && this.extension.register(t, n.config, n.registerState);
				return this.state = function(t) {
					return Object.assign(t, { id: Te$1 });
				}(n), () => {
					const t = this.state;
					t.id !== ze$1 && Ie$1(309, String(n.id), String(ze$1)), this.state = function(t) {
						return Object.assign(t, { id: je$1 });
					}(t), i && i();
				};
			}
			afterRegistration(t) {
				const e = this.state;
				let n;
				return e.id !== Te$1 && Ie$1(310, String(e.id), String(Te$1)), this.extension.afterRegistration && (n = this.extension.afterRegistration(t, e.config, e.registerState)), this.state = function(t) {
					return Object.assign(t, { id: ze$1 });
				}(e), n;
			}
			getSignal() {
				return void 0 === this._signal && Ie$1(311), this._signal;
			}
			getInitResult() {
				void 0 === this.extension.init && Ie$1(312, this.extension.name);
				const t = this.state;
				return function(t) {
					return t.id >= $e$1;
				}(t) || Ie$1(313, String(t.id), String($e$1)), t.initResult;
			}
			getInitPeer(t) {
				const e = this.builder.extensionNameMap.get(t);
				return e ? e.getExtensionInitDependency() : void 0;
			}
			getExtensionInitDependency() {
				const t = this.state;
				return function(t) {
					return t.id >= Ke$1;
				}(t) || Ie$1(314, String(t.id), String(Ke$1)), { config: t.config };
			}
			getPeer(t) {
				const e = this.builder.extensionNameMap.get(t);
				return e ? e.getExtensionDependency() : void 0;
			}
			getInitDependency(t) {
				const e = this.builder.getExtensionRep(t);
				return void 0 === e && Ie$1(315, this.extension.name, t.name), e.getExtensionInitDependency();
			}
			getDependency(t) {
				const e = this.builder.getExtensionRep(t);
				return void 0 === e && Ie$1(315, this.extension.name, t.name), e.getExtensionDependency();
			}
			getState() {
				const t = this.state;
				return function(t) {
					return t.id >= ze$1;
				}(t) || Ie$1(316, String(t.id), String(ze$1)), t;
			}
			getDirectDependentNames() {
				return this.builder.incomingEdges.get(this.extension.name) || Ve$1;
			}
			getPeerNameSet() {
				let t = this._peerNameSet;
				return t || (t = new Set((this.extension.peerDependencies || []).map(([t]) => t)), this._peerNameSet = t), t;
			}
			getExtensionDependency() {
				if (!this._dependency) {
					const t = this.state;
					(function(t) {
						return t.id >= je$1;
					})(t) || Ie$1(317, this.extension.name), this._dependency = {
						config: t.config,
						init: t.initResult,
						output: t.output
					};
				}
				return this._dependency;
			}
		};
		const Ze$1 = { tag: xo };
		function He$1() {
			const t = nl();
			t.isEmpty() && t.append(es());
		}
		const Je$1 = /* @__PURE__ */ xu({
			config: /* @__PURE__ */ vu({
				setOptions: Ze$1,
				updateOptions: Ze$1
			}),
			init: ({ $initialEditorState: t = He$1 }) => ({
				$initialEditorState: t,
				initialized: !1
			}),
			afterRegistration(t, { updateOptions: e, setOptions: n }, i) {
				const o = i.getInitResult();
				if (!o.initialized) {
					o.initialized = !0;
					const { $initialEditorState: i } = o;
					if (Ui(i)) t.setEditorState(i, n);
					else if ("function" == typeof i) t.update(() => {
						i(t);
					}, e);
					else if (i && ("string" == typeof i || "object" == typeof i)) {
						const e = t.parseEditorState(i);
						t.setEditorState(e, n);
					}
				}
				return () => {};
			},
			name: "@lexical/extension/InitialState",
			nodes: [
				zi,
				Wo,
				Ji,
				Zo,
				Zi
			]
		}), Xe$1 = Symbol.for("@lexical/extension/LexicalBuilder");
		function qe$1() {}
		function Qe$1(t) {
			throw t;
		}
		function tn$1(t) {
			return Array.isArray(t) ? t : [t];
		}
		const en$2 = Me$1;
		var nn$1 = class nn$1 {
			roots;
			extensionNameMap;
			outgoingConfigEdges;
			incomingEdges;
			conflicts;
			_sortedExtensionReps;
			PACKAGE_VERSION;
			constructor(t) {
				this.outgoingConfigEdges = /* @__PURE__ */ new Map(), this.incomingEdges = /* @__PURE__ */ new Map(), this.extensionNameMap = /* @__PURE__ */ new Map(), this.conflicts = /* @__PURE__ */ new Map(), this.PACKAGE_VERSION = en$2, this.roots = t;
				for (const e of t) this.addExtension(e);
			}
			static fromExtensions(t) {
				const e = [tn$1(Je$1)];
				for (const n of t) e.push(tn$1(n));
				return new nn$1(e);
			}
			static maybeFromEditor(t) {
				const e = t[Xe$1];
				return e && (e.PACKAGE_VERSION !== en$2 && Ie$1(292, e.PACKAGE_VERSION, en$2), e instanceof nn$1 || Ie$1(293)), e;
			}
			static fromEditor(t) {
				const e = nn$1.maybeFromEditor(t);
				return void 0 === e && Ie$1(294), e;
			}
			constructEditor() {
				const { $initialEditorState: t, onError: e, onWarn: n, ...i } = this.buildCreateEditorArgs(), o = Object.assign(ys({
					...i,
					...e ? { onError: (t) => {
						e(t, o);
					} } : {},
					...n ? { onWarn: (t) => {
						n(t, o);
					} } : {}
				}), { [Xe$1]: this });
				for (const t of this.sortedExtensionReps()) t.build(o);
				return o;
			}
			buildEditor() {
				let t = qe$1;
				function e() {
					try {
						t();
					} finally {
						t = qe$1;
					}
				}
				const n = Object.assign(this.constructEditor(), {
					dispose: e,
					[Symbol.dispose]: e
				});
				return t = Eu(this.registerEditor(n), () => n.setRootElement(null)), n;
			}
			hasExtensionByName(t) {
				return this.extensionNameMap.has(t);
			}
			getExtensionRep(t) {
				const e = this.extensionNameMap.get(t.name);
				if (e) return e.extension !== t && Ie$1(295, t.name), e;
			}
			addEdge(t, e, n) {
				const i = this.outgoingConfigEdges.get(t);
				i ? i.set(e, n) : this.outgoingConfigEdges.set(t, new Map([[e, n]]));
				const o = this.incomingEdges.get(e);
				o ? o.add(t) : this.incomingEdges.set(e, new Set([t]));
			}
			addExtension(t) {
				void 0 !== this._sortedExtensionReps && Ie$1(296);
				const [n] = tn$1(t);
				"string" != typeof n.name && Ie$1(297, typeof n.name);
				let i = this.extensionNameMap.get(n.name);
				if (void 0 !== i && i.extension !== n && Ie$1(298, n.name), !i) {
					i = new Ge$1(this, n), this.extensionNameMap.set(n.name, i);
					const t = this.conflicts.get(n.name);
					"string" == typeof t && Ie$1(299, n.name, t);
					for (const t of n.conflictsWith || []) this.extensionNameMap.has(t) && Ie$1(299, n.name, t), this.conflicts.set(t, n.name);
					for (const t of n.dependencies || []) {
						const e = tn$1(t);
						this.addEdge(n.name, e[0].name, e.slice(1)), this.addExtension(e);
					}
					for (const [t, e] of n.peerDependencies || []) this.addEdge(n.name, t, e ? [e] : []);
				}
			}
			sortedExtensionReps() {
				if (this._sortedExtensionReps) return this._sortedExtensionReps;
				const t = [], e = (n, i) => {
					let o = n.state;
					if (We$1(o)) return;
					const s = n.extension.name;
					var r;
					Ue$1(o) || Ie$1(300, s, i || "[unknown]"), Ue$1(r = o) || Ie$1(304, String(r.id), String(Ae$1)), o = Object.assign(r, { id: Pe$1 }), n.state = o;
					const c = this.outgoingConfigEdges.get(s);
					if (c) for (const t of c.keys()) {
						const n = this.extensionNameMap.get(t);
						n && e(n, s);
					}
					o = Be$1(o), n.state = o, t.push(n);
				};
				for (const t of this.extensionNameMap.values()) Ue$1(t.state) && e(t);
				for (const e of t) for (const [t, n] of this.outgoingConfigEdges.get(e.extension.name) || []) if (n.length > 0) {
					const e = this.extensionNameMap.get(t);
					if (e) for (const t of n) e.configs.add(t);
				}
				for (const [t, ...e] of this.roots) if (e.length > 0) {
					const n = this.extensionNameMap.get(t.name);
					void 0 === n && Ie$1(301, t.name);
					for (const t of e) n.configs.add(t);
				}
				return this._sortedExtensionReps = t, this._sortedExtensionReps;
			}
			registerEditor(t) {
				const e = this.sortedExtensionReps(), n = new AbortController(), i = [() => n.abort()], o = n.signal;
				for (const n of e) {
					const e = n.register(t, o);
					e && i.push(e);
				}
				for (const n of e) {
					const e = n.afterRegistration(t);
					e && i.push(e);
				}
				return Eu(...i);
			}
			buildCreateEditorArgs() {
				const t = {}, e = /* @__PURE__ */ new Set(), n = /* @__PURE__ */ new Map(), i = /* @__PURE__ */ new Map(), o = {}, s = {}, r = this.sortedExtensionReps();
				for (const c of r) {
					const { extension: r } = c;
					if (void 0 !== r.onError && (t.onError = r.onError), void 0 !== r.onWarn && (t.onWarn = r.onWarn), void 0 !== r.disableEvents && (t.disableEvents = r.disableEvents), void 0 !== r.parentEditor && (t.parentEditor = r.parentEditor), void 0 !== r.editable && (t.editable = r.editable), void 0 !== r.namespace && (t.namespace = r.namespace), void 0 !== r.$initialEditorState && (t.$initialEditorState = r.$initialEditorState), r.nodes) for (const t of ve$1(r)) {
						if ("function" != typeof t) {
							const e = n.get(t.replace);
							e && Ie$1(302, r.name, t.replace.name, e.extension.name), n.set(t.replace, c);
						}
						e.add(t);
					}
					if (r.html) {
						if (r.html.export) for (const [t, e] of r.html.export.entries()) i.set(t, e);
						r.html.import && Object.assign(o, r.html.import);
					}
					r.theme && _e$1(s, r.theme);
				}
				Object.keys(s).length > 0 && (t.theme = s), e.size && (t.nodes = [...e]);
				const c = Object.keys(o).length > 0, a = i.size > 0;
				(c || a) && (t.html = {}, c && (t.html.import = o), a && (t.html.export = i));
				for (const e of r) e.init(t);
				return t.onError || (t.onError = Qe$1), t;
			}
		};
		function sn$1(t, e) {
			const n = nn$1.maybeFromEditor(t);
			if (!n) return;
			const i = n.extensionNameMap.get(e);
			return i ? i.getExtensionDependency() : void 0;
		}
		var hn$1 = class extends Li {
			$config() {
				return this.config("horizontalrule", { importDOM: { hr: () => ({
					conversion: gn$1,
					priority: 0
				}) } });
			}
			exportDOM() {
				return { element: Zl().createElement("hr") };
			}
			createDOM(t) {
				const e = Zl().createElement("hr");
				return bu(e, t.theme.hr), e;
			}
			getTextContent() {
				return "\n";
			}
			isInline() {
				return !1;
			}
			updateDOM() {
				return !1;
			}
		};
		function gn$1() {
			return { node: pn$1() };
		}
		function pn$1() {
			return Vc(hn$1);
		}
		new Set([No, ko]);
		Date.now;
		//#endregion
		//#region ../../../node_modules/.pnpm/@lexical+html@0.49.0_typescript@6.0.3/node_modules/@lexical/html/dist/LexicalHtml.prod.mjs
		/**
		* Copyright (c) Meta Platforms, Inc. and affiliates.
		*
		* This source code is licensed under the MIT license found in the
		* LICENSE file in the root directory of this source tree.
		*
		*/
		function nt$1(t, ...e) {
			const n = new URL("https://lexical.dev/docs/error"), o = new URLSearchParams();
			o.append("code", t);
			for (const t of e) o.append("v", t);
			throw n.search = o.toString(), Error(`Minified Lexical error #${t}; visit ${n.toString()} for the full message or use the non-minified dev environment for full errors and additional helpful warnings.`);
		}
		let ot;
		function rt(t, e) {
			const { key: n } = e;
			return t && n in t ? t[n] : e.defaultValue;
		}
		function st(t) {
			return ot && ot.editor === t ? ot : void 0;
		}
		function it(t, e) {
			const n = st(e);
			return n && n[t];
		}
		function ct(t, e) {
			if ("cfg" in e) {
				const { cfg: n, updater: o } = e;
				return [n, o(rt(t, n))];
			}
			return e;
		}
		function lt(t, e) {
			let n = e;
			for (const o of t) {
				const [t, r] = ct(n, o), s = t.key;
				if (n === e && rt(n, t) === r) continue;
				const i = n === e || void 0 === n ? ut(e) : n;
				i[s] = r, n = i;
			}
			return n;
		}
		function ut(t) {
			return Object.create(t || null);
		}
		function ft(t, e) {
			return [t, e];
		}
		function dt(t, n, o, r = vc()) {
			const s = ot, i = st(r);
			try {
				return ot = {
					...i,
					editor: r,
					[t]: n
				}, o();
			} finally {
				ot = s;
			}
		}
		function pt$1(t, n = () => {}) {
			return (o, r = vc()) => (e) => {
				const s = st(r), i = s && s[t], c = lt(o, i || n(r));
				return c && c !== i ? dt(t, c, e, r) : e();
			};
		}
		function ht$1(t, e, o, r) {
			return Object.assign(mt$2(Symbol(e), {
				isEqual: r,
				parse: o
			}), { [t]: !0 });
		}
		const yt$1 = "@lexical/html/DOM", xt$1 = Symbol.for("@lexical/html/DOMExportContext"), St = "@lexical/html/DOMImport", $t = Symbol.for("@lexical/html/DOMImportContext");
		function Ct(t, e, n) {
			return ht$1(xt$1, t, e, n);
		}
		const kt = /* @__PURE__ */ Ct("isExport", Boolean);
		function Dt(t) {
			const e = sn$1(t, yt$1);
			return e ? e.output.defaults : void 0;
		}
		function Ot(t) {
			const e = sn$1(t, yt$1);
			return e ? e.output.runtime : void 0;
		}
		function Nt(t = vc()) {
			const n = Ot(t);
			return n ? n.getSessionConfig() : Tc(t);
		}
		const Et = pt$1(xt$1, Dt);
		new Map([[zi, () => {
			const t = Zl().createElement("div");
			return t.role = "textbox", { element: t };
		}]]);
		const re = Symbol.for("@lexical/html/SelectorImpl");
		function se(t, e) {
			const n = {
				kind: "element",
				predicate: (o = e, 0 === o.length ? gc : 1 === o.length ? o[0] : (t, e) => {
					for (const n of o) if (!n(t, e)) return !1;
					return !0;
				}),
				tags: t
			};
			var o;
			const s = (n) => se(t, [...e, n]);
			return {
				[re]: n,
				attr: (t, e, n) => s(le(t, e, n)),
				classAll: (...t) => s(ce(t)),
				classAny: (...t) => s(function(t) {
					const e = ie(t);
					if (0 === e.length) return () => !1;
					return (t) => {
						if (!gc(t)) return !1;
						const n = t.classList;
						for (const t of e) if (n.contains(t)) return !0;
						return !1;
					};
				}(t)),
				styleAny: (t, e, n) => s(function(t, e, n) {
					if ("string" == typeof e) return (n) => gc(n) && n.style.getPropertyValue(t) === e;
					if (e instanceof RegExp) {
						const o = n && n.capture, s = e;
						return (e, n) => {
							if (!gc(e)) return !1;
							const i = e.style.getPropertyValue(t);
							if (!i) return !1;
							const c = i.match(s);
							return null !== c && (void 0 !== o && (n[o] = c), !0);
						};
					}
					nt$1(362, JSON.stringify(t));
				}(t, e, n))
			};
		}
		function ie(t) {
			const e = [];
			for (const n of t) n && e.push(n);
			return e;
		}
		function ce(t) {
			const e = ie(t);
			return 0 === e.length ? () => !0 : (t) => {
				if (!gc(t)) return !1;
				const n = t.classList;
				for (const t of e) if (!n.contains(t)) return !1;
				return !0;
			};
		}
		function le(t, e, n) {
			if (!0 === e) return (e) => gc(e) && e.hasAttribute(t);
			if ("string" == typeof e) return (n) => gc(n) && n.getAttribute(t) === e;
			if (e instanceof RegExp) {
				const o = n && n.capture, s = e;
				return (e, n) => {
					if (!gc(e)) return !1;
					const i = e.getAttribute(t);
					if (null == i) return !1;
					const c = i.match(s);
					return null !== c && (void 0 !== o && (n[o] = c), !0);
				};
			}
			nt$1(361, JSON.stringify(t));
		}
		const ue = {
			kind: "text",
			predicate: zs,
			tags: /* @__PURE__ */ new Set()
		}, fe = { [re]: ue }, ae = {
			kind: "comment",
			predicate: (t) => 8 === t.nodeType,
			tags: /* @__PURE__ */ new Set()
		}, de = { [re]: ae }, pe = {
			any: () => se(/* @__PURE__ */ new Set(), []),
			comment: () => de,
			tag(...t) {
				t.length > 0 || nt$1(363);
				const e = /* @__PURE__ */ new Set();
				for (const n of t) e.add(n.toUpperCase());
				return se(e, []);
			},
			text: () => fe
		};
		function Ne(t) {
			const e = sn$1(t, St);
			return e ? e.output.defaults : void 0;
		}
		function Ee(t, n = vc()) {
			return rt(function(t) {
				return it($t, t) || Ne(t);
			}(n), t);
		}
		const Ie = pt$1($t, Ne), Le = pe;
		new Set([
			"center",
			"end",
			"justify",
			"left",
			"right",
			"start"
		]);
		new Set([
			"font-weight",
			"font-style",
			"text-decoration",
			"vertical-align"
		]);
		Le.tag("b", "strong", "em", "i", "code", "mark", "s", "sub", "sup", "u", "span");
		Le.text();
		Le.tag("script", "style");
		Le.tag("br");
		Le.tag("p"), Le.tag("hr"), Le.any();
		function sn(t, e) {
			return zs(e) ? t.textIndices : 8 === e.nodeType ? t.commentIndices : gc(e) ? t.byTag.get(e.nodeName) || t.wildcardIndices : cn;
		}
		const cn = Object.freeze([]);
		const an = Object.freeze({});
		function dn(t, e) {
			return {
				$importChildren: (e, n) => function(t, e, n) {
					const o = n && n.rules ? n.rules.dispatch : void 0;
					o && t.overlays.push(o);
					try {
						const o = () => pn(t, e, n);
						return n && n.context ? Ie(n.context, t.editor)(o) : o();
					} finally {
						o && t.overlays.pop();
					}
				}(t, e, n),
				$importOne: (e, n) => hn(t, e, n),
				captures: e,
				get: (e) => Ee(e, t.editor),
				session: t.session
			};
		}
		function pn(t, e, n) {
			const o = n && n.$onChild, r = [];
			for (const n of Array.from(e.childNodes)) {
				const e = hn(t, n, void 0);
				for (const t of e) {
					const e = o ? o(t) : t;
					null != e && r.push(e);
				}
			}
			const s = n && n.$after ? n.$after(r) : r, i = n && n.schema;
			return i ? function(t, e, n, o) {
				const r = [];
				let s = null;
				const i = () => {
					if (null === s) return;
					const e = s;
					if (s = null, t.$packageRun) {
						const s = t.$packageRun(e, n, o);
						if (s.length > 0) {
							for (const t of s) r.push(t);
							return;
						}
					}
					if ("hoist" === t.onReject) for (const t of e) r.push(t);
				};
				for (const o of e) t.$accepts(o, n) ? (i(), r.push(o)) : (null === s && (s = []), s.push(o));
				return i(), t.$finalize ? t.$finalize(r, n) : r;
			}(i, s, null, e) : s;
		}
		function hn(t, e, n) {
			const o = () => function(t, e) {
				const n = function(t, e) {
					const n = [];
					for (let o = t.overlays.length - 1; o >= 0; o--) {
						const r = t.overlays[o], s = sn(r, e);
						s.length > 0 && n.push({
							dispatch: r,
							indices: s
						});
					}
					const o = sn(t.dispatch, e);
					o.length > 0 && n.push({
						dispatch: t.dispatch,
						indices: o
					});
					return n;
				}(t, e);
				if (0 === n.length) return gn(t, e);
				let o = 0, r = 0;
				const s = () => {
					for (; o < n.length;) {
						const { dispatch: i, indices: c } = n[o];
						for (; r < c.length;) {
							const n = c[r++], o = i.rules[n], l = {};
							if (o.predicate(e, l)) {
								const n = dn(t, 0 === Object.keys(l).length ? an : l);
								try {
									return o.$import(n, e, s);
								} catch (t) {
									throw t;
								}
							}
						}
						o++, r = 0;
					}
					return gn(t, e);
				};
				return s();
			}(t, e);
			return n && n.context ? Ie(n.context, t.editor)(o) : o();
		}
		function gn(t, e) {
			if (0 === e.childNodes.length) return [];
			const n = [];
			for (const o of Array.from(e.childNodes)) {
				const e = hn(t, o, void 0);
				for (const t of e) n.push(t);
			}
			return n;
		}
		pe.any();
		pe.any, pe.comment, pe.tag, pe.text;
		new Set(["STYLE", "SCRIPT"]);
		function Dn(t, n = null, o = vc()) {
			return Et([ft(kt, !0)], o)(() => {
				const e = nl(), r = Nt(o), s = ur(n) ? oa(n.anchor.getNode()) : null, i = t.append.bind(t);
				for (const t of (Pi(s) ? s : e).getChildren()) Mn(o, t, i, n, r);
				return t;
			});
		}
		function On(t, e = null) {
			return ("undefined" == typeof document || "undefined" == typeof window && void 0 === global.window) && nt$1(338), gi(t), Dn(Zl().createElement("div"), e, t).innerHTML;
		}
		function Mn(e, n, o, i = null, c = Tc(e)) {
			let l = c.$shouldInclude(n, i, e);
			const u = c.$shouldExclude(n, i, e);
			let f = n;
			null !== i && Xo(n) && (f = L(i, n, "clone"));
			const { element: d, after: p, append: g, $getChildNodes: m } = c.$exportDOM(f, e);
			if (!d) return !1;
			const y = Zl().createDocumentFragment(), S = m ? m() : Pi(f) ? f.getChildren() : [], $ = l && dr(i) && Pi(n) ? null : i, v = y.append.bind(y);
			for (const t of S) {
				const o = Mn(e, t, v, $, c);
				!l && o && c.$extractWithChild(n, t, i, "html", e) && (l = !0);
			}
			if (l && !u) {
				if ((gc(d) || pc(d)) && (g ? g(y) : d.append(y)), o(d), p) {
					const t = p.call(f, d);
					t && (pc(d) ? d.replaceChildren(t) : d.replaceWith(t));
				}
			} else o(y);
			return l;
		}
		//#endregion
		//#region ../../../node_modules/.pnpm/@lexical+clipboard@0.49.0_typescript@6.0.3/node_modules/@lexical/clipboard/dist/LexicalClipboard.prod.mjs
		/**
		* Copyright (c) Meta Platforms, Inc. and affiliates.
		*
		* This source code is licensed under the MIT license found in the
		* LICENSE file in the root directory of this source tree.
		*
		*/
		function et(r, i, l = null) {
			const c = Ql(l), s = l ? Gl(l) : [], u = null !== l && s.length > 0;
			if (u && "function" == typeof c.caretPositionFromPoint) {
				const t = c.caretPositionFromPoint(r, i, { shadowRoots: s });
				if (null !== t && function(t, e) {
					for (let n = t; null !== n;) {
						if (n === e) return !0;
						n = wl(n);
					}
					return !1;
				}(t.offsetNode, l)) return {
					node: t.offsetNode,
					offset: t.offset
				};
			}
			if (u) {
				const t = l.getRootNode();
				if (ql(t)) {
					const e = t.elementFromPoint(r, i);
					if (null !== e && l.contains(e)) {
						const t = function(t, e, n, o) {
							const r = o.createRange(), i = (t) => e < t.top ? t.top - e : e > t.bottom ? e - t.bottom : 0, l = (e) => t < e.left ? e.left - t : t > e.right ? t - e.right : 0, c = o.createTreeWalker(n, NodeFilter.SHOW_TEXT);
							let s = null, u = Infinity, a = Infinity;
							for (let t = c.nextNode(); t; t = c.nextNode()) {
								r.selectNodeContents(t);
								for (const e of r.getClientRects()) {
									const n = i(e), o = l(e);
									(n < u || n === u && o < a) && (u = n, a = o, s = t);
								}
							}
							if (null === s) return null;
							let f = 0, p = Infinity, d = Infinity;
							for (let e = 0; e <= s.length; e++) {
								r.setStart(s, e), r.collapse(!0);
								const n = r.getBoundingClientRect(), o = i(n), l = Math.abs(t - n.left);
								(o < p || o === p && l < d) && (p = o, d = l, f = e);
							}
							return {
								node: s,
								offset: f
							};
						}(r, i, e, c);
						if (null !== t) return t;
					}
				}
			}
			if ("function" == typeof c.caretRangeFromPoint) {
				const t = c.caretRangeFromPoint(r, i);
				return null === t ? null : {
					node: t.startContainer,
					offset: t.startOffset
				};
			}
			if ("function" == typeof c.caretPositionFromPoint) {
				const t = c.caretPositionFromPoint(r, i);
				return null === t ? null : {
					node: t.offsetNode,
					offset: t.offset
				};
			}
			return null;
		}
		function nt(t, ...e) {
			const n = new URL("https://lexical.dev/docs/error"), o = new URLSearchParams();
			o.append("code", t);
			for (const t of e) o.append("v", t);
			throw n.search = o.toString(), Error(`Minified Lexical error #${t}; visit ${n.toString()} for the full message or use the non-minified dev environment for full errors and additional helpful warnings.`);
		}
		function pt(t, e = Kr()) {
			return e ?? nt(166), ur(e) && e.isCollapsed() || 0 === e.getNodes().length ? "" : On(t, e);
		}
		function mt(t, e) {
			const n = t.getData("text/plain") || t.getData("text/uri-list");
			null != n && e.insertRawText(n);
		}
		const yt = "application/x-lexical-drag";
		function xt(t, e) {
			const n = { editorKey: e.getKey() };
			t.setData(yt, JSON.stringify(n));
		}
		function ht(t, e, n) {
			const o = t.dataTransfer;
			if (null === o) return !1;
			const r = function(t) {
				const e = t.getData(yt);
				if (!e) return null;
				let n;
				try {
					n = JSON.parse(e);
				} catch (t) {
					return null;
				}
				return null !== (o = n) && "object" == typeof o && "editorKey" in o && "string" == typeof o.editorKey ? n : null;
				var o;
			}(o);
			if (null === r) return !1;
			const i = function(t, e) {
				const n = et(t.clientX, t.clientY, e.getRootElement());
				if (null === n) return null;
				const o = Zs(n.node);
				if (null === o) return null;
				if (Xo(o)) return La(o, "next", n.offset);
				if (Pi(o)) return hu(o, n.offset, "next");
				const r = o.getParent();
				return null === r ? null : hu(r, o.getIndexWithinParent() + 1, "next");
			}(t, e);
			if (null === i) return !1;
			const l = yu(i);
			if (null === l) return !1;
			const c = r.editorKey === e.getKey(), u = Kr();
			if (c) {
				if (!ur(u) || u.isCollapsed()) return !1;
				if (function(t, e) {
					const { anchor: n, focus: o } = du(ru(e), "next");
					return Ya(n, t) < 0 && Ya(t, o) < 0;
				}(i, u)) return t.preventDefault(), !0;
				u.removeText();
			}
			if (!l.origin.isAttached()) return t.preventDefault(), !0;
			if (n(o, nu(Ja(l)), e), !c) {
				const t = e.getRootElement(), n = t ? t.ownerDocument : null, o = n ? function(t, e) {
					for (const n of Xl(e)) {
						const e = Ps(n);
						if (Ds(e) && e.getKey() === t && gc(n)) return n;
					}
					return null;
				}(r.editorKey, n) : null;
				null !== o && o.dispatchEvent(new InputEvent("beforeinput", {
					bubbles: !0,
					cancelable: !0,
					inputType: "deleteByDrag"
				}));
			}
			return t.preventDefault(), !0;
		}
		function bt(t, e) {
			return ht(t, e, (t, e) => mt(t, e));
		}
		//#endregion
		//#region ../../../node_modules/.pnpm/@lexical+plain-text@0.49.0_typescript@6.0.3/node_modules/@lexical/plain-text/dist/LexicalPlainText.prod.mjs
		/**
		* Copyright (c) Meta Platforms, Inc. and affiliates.
		*
		* This source code is licensed under the MIT license found in the
		* LICENSE file in the root directory of this source tree.
		*
		*/
		function M$1(e, t) {
			t.update(() => {
				if (null !== e) {
					const r = Mt(e, KeyboardEvent) ? null : e.clipboardData, o = Kr();
					if (null !== o && !o.isCollapsed() && null != r) {
						e.preventDefault();
						const a = pt(t);
						null !== a && r.setData("text/html", a), r.setData("text/plain", o.getTextContent());
					}
				}
			});
		}
		function O$1(n) {
			return Eu(n.registerCommand($e$2, (e) => {
				const t = Kr();
				return !!ur(t) && (t.deleteCharacter(e), !0);
			}, 0), n.registerCommand(qe$2, (e) => {
				const t = Kr();
				return !!ur(t) && (t.deleteWord(e), !0);
			}, 0), n.registerCommand(Ye$1, (e) => {
				const t = Kr();
				return !!ur(t) && (t.deleteLine(e), !0);
			}, 0), n.registerCommand(je$2, (t) => {
				const r = Kr();
				if (!ur(r)) return !1;
				if ("string" == typeof t) r.insertText(t);
				else {
					const n = t.dataTransfer;
					if (null != n) mt(n, r);
					else {
						const e = t.data;
						e && r.insertText(e);
					}
				}
				return !0;
			}, 0), n.registerCommand(Ve$2, () => {
				const e = Kr();
				return !!ur(e) && (e.removeText(), !0);
			}, 0), n.registerCommand(Ue$2, (e) => {
				const t = Kr();
				return !!ur(t) && (t.insertLineBreak(e), !0);
			}, 0), n.registerCommand(He$2, () => {
				const e = Kr();
				return !!ur(e) && (e.insertLineBreak(), !0);
			}, 0), n.registerCommand(on$1, (e) => {
				const t = Kr();
				if (!ur(t)) return !1;
				const r = e, n = r.shiftKey;
				return !!te$2(t, !0) && (r.preventDefault(), le$1(t, n, !0), !0);
			}, 0), n.registerCommand(en$3, (e) => {
				const t = Kr();
				if (!ur(t)) return !1;
				const r = e, n = r.shiftKey;
				return !!te$2(t, !1) && (r.preventDefault(), le$1(t, n, !1), !0);
			}, 0), n.registerCommand(un$2, (e) => {
				return !!ur(Kr()) && (!l || !s) && (e.preventDefault(), n.dispatchCommand($e$2, !0));
			}, 0), n.registerCommand(dn$1, (e) => {
				return !!ur(Kr()) && (e.preventDefault(), n.dispatchCommand($e$2, !1));
			}, 0), n.registerCommand(cn$1, (e) => {
				if (!ur(Kr())) return !1;
				if (null !== e) {
					if ((l || a || d$1) && s) return !1;
					e.preventDefault();
				}
				return n.dispatchCommand(Ue$2, !1);
			}, 0), n.registerCommand(kn, () => {
				const e = Kr();
				return xl(ur(e) && null !== oa(e.anchor.getNode()) ? e : null), !0;
			}, 0), n.registerCommand(vn$2, (e) => {
				return !!ur(Kr()) && (M$1(e, n), !0);
			}, 0), n.registerCommand(Tn, (e) => {
				return !!ur(Kr()) && (function(e, t) {
					M$1(e, t), t.update(() => {
						const e = Kr();
						ur(e) && e.removeText();
					}, { tag: "cut" });
				}(e, n), !0);
			}, 0), n.registerCommand(Je$2, (t) => {
				return !!ur(Kr()) && (function(t, r) {
					t.preventDefault(), r.update(() => {
						const r = Kr(), n = Mt(t, ClipboardEvent) ? t.clipboardData : null;
						null != n && ur(r) && mt(n, r);
					}, { tag: "paste" });
				}(t, n), !0);
			}, 0), n.registerCommand(yn$1, (e) => bt(e, n), 0), n.registerCommand(xn$1, (e) => {
				const t = Kr();
				return !!ur(t) && (t.isCollapsed() || null === e.dataTransfer || xt(e.dataTransfer, n), !0);
			}, 0));
		}
		//#endregion
		//#region ../../../node_modules/.pnpm/@lexical+history@0.49.0_typescript@6.0.3/node_modules/@lexical/history/dist/LexicalHistory.prod.mjs
		/**
		* Copyright (c) Meta Platforms, Inc. and affiliates.
		*
		* This source code is licensed under the MIT license found in the
		* LICENSE file in the root directory of this source tree.
		*
		*/
		function E(t, e, n, o, r) {
			if (null === t || 0 === n.size && 0 === o.size && !r) return 0;
			const a = e._selection, i = t._selection;
			if (r) return 1;
			if (!(ur(a) && ur(i) && i.isCollapsed() && a.isCollapsed())) return 0;
			const l = function(t, e, n) {
				const o = t._nodeMap, r = [];
				for (const t of e) {
					const e = o.get(t);
					void 0 !== e && r.push(e);
				}
				for (const [t, e] of n) {
					if (!e) continue;
					const n = o.get(t);
					void 0 === n || Bi(n) || r.push(n);
				}
				return r;
			}(e, n, o);
			if (0 === l.length) return 0;
			if (l.length > 1) {
				const n = e._nodeMap, o = n.get(a.anchor.key), r = n.get(i.anchor.key);
				return o && r && !t._nodeMap.has(o.__key) && Xo(o) && 1 === o.__text.length && 1 === a.anchor.offset ? 2 : 0;
			}
			const s = l[0], u = t._nodeMap.get(s.__key);
			if (!Xo(u) || !Xo(s) || u.__mode !== s.__mode) return 0;
			const d = u.__text, c = s.__text;
			if (d === c) return 0;
			const p = a.anchor, f = i.anchor;
			if (p.key !== f.key || "text" !== p.type) return 0;
			const h = p.offset, m = f.offset, g = c.length - d.length;
			return 1 === g && m === h - 1 ? 2 : -1 === g && m === h + 1 ? 3 : -1 === g && m === h ? 4 : 0;
		}
		function D(t, e, n) {
			let o = n(), r = 0, a = o, i = 0, l = null;
			return (s, u, d, c, p, f) => {
				const h = n();
				if (f.has("composition-start") && (a = o, i = r, l = s), f.has("historic")) return r = 0, o = h, 2;
				f.has("composition-end") && l && (o = a, r = i, s = l);
				const m = f.has("paste") || f.has("cut") ? 0 : E(s, u, c, p, t.isComposing()), w = (() => {
					const n = null === d || d.editor === t, a = f.has(mo);
					if (!a && n && f.has("history-merge")) return 0;
					if (1 === m) return 2;
					if (null === s) return 1;
					const i = u._selection;
					if (!(c.size > 0 || p.size > 0)) return null !== i ? 0 : 2;
					const l = "number" == typeof e ? e : e.peek();
					if (!1 === a && 0 !== m && m === r && h < o + l && n) return 0;
					if (1 === c.size) {
						if (function(t, e, n) {
							const o = e._nodeMap.get(t), r = n._nodeMap.get(t), a = e._selection, i = n._selection;
							return !(ur(a) && ur(i) && "element" === a.anchor.type && "element" === a.focus.type && "text" === i.anchor.type && "text" === i.focus.type || !Xo(o) || !Xo(r) || o.__parent !== r.__parent) && JSON.stringify(e.read(() => o.exportJSON())) === JSON.stringify(n.read(() => r.exportJSON()));
						}(Array.from(c)[0], s, u)) return 0;
					}
					return 1;
				})();
				return o = h, r = m, w;
			};
		}
		function M(t, e) {
			t.undoStack = [], t.redoStack = [], t.current = null, e && e(t);
		}
		function O(t, e, n, o = Date.now, r, f = null) {
			const h = D(t, n, o), m = () => {
				r && r(e);
			};
			return m(), Eu(t.registerCommand(Qe$2, () => (function(t, e, n) {
				const o = e.redoStack, r = e.undoStack;
				if (0 !== r.length) {
					const a = e.current, i = r.pop();
					null !== a && (o.push(a), t.dispatchCommand(En, !0)), 0 === r.length && t.dispatchCommand(wn$1, !1), e.current = i || null, n && n(e), i && i.editor.setEditorState(i.editorState, { tag: "historic" });
				}
			}(t, e, r), !0), 0), t.registerCommand(Ze$2, () => (function(t, e, n) {
				const o = e.redoStack, r = e.undoStack;
				if (0 !== o.length) {
					const a = e.current;
					null !== a && (r.push(a), t.dispatchCommand(wn$1, !0));
					const i = o.pop();
					0 === o.length && t.dispatchCommand(En, !1), e.current = i || null, n && n(e), i && i.editor.setEditorState(i.editorState, { tag: "historic" });
				}
			}(t, e, r), !0), 0), t.registerCommand(bn$2, () => (M(e, r), !1), 0), t.registerCommand(Nn$1, () => (M(e, r), t.dispatchCommand(En, !1), t.dispatchCommand(wn$1, !1), !0), 0), t.registerUpdateListener(({ editorState: n, prevEditorState: o, dirtyLeaves: r, dirtyElements: a, tags: i }) => {
				const l = e.current, s = e.redoStack, u = e.undoStack, d = null === l ? null : l.editorState;
				if (null !== l && n === d) return;
				const g = h(o, n, l, r, a, i);
				if (1 === g) {
					if (0 !== s.length && (e.redoStack = [], t.dispatchCommand(En, !1)), null !== l) {
						u.push({ ...l });
						const e = "number" == typeof f || null === f ? f : f.peek();
						null !== e && u.length > e && u.splice(0, u.length - e), t.dispatchCommand(wn$1, !0);
					}
				} else if (2 === g) return;
				e.current = {
					editor: t,
					editorState: n
				}, m();
			}));
		}
		function z() {
			return {
				current: null,
				redoStack: [],
				undoStack: []
			};
		}
		Date.now;
		//#endregion
		//#region lib/types/client/input/machine.js
		/** Exhaustiveness backstop for the closed InputEvent union. */
		function unreachable(value) {
			throw new Error(`unreachable input event: ${JSON.stringify(value)}`);
		}
		/** Strip a claimed command token from its submit-time draft. */
		function argsAfter(draft, token) {
			const s = draft.trimStart();
			if (s.startsWith(token)) return s.slice(token.length);
			const base = token.trimEnd();
			if (s.startsWith(base)) {
				const rest = s.slice(base.length);
				return /^\s/.test(rest) ? rest.slice(1) : rest;
			}
			return "";
		}
		/** Pure phase, claim, and attempt owner for one Session input. */
		var SubmitMachine = class {
			phase = "plain";
			claim;
			seq = 0;
			inflight;
			/** Ordinary sends detached from the editor, retained for settlement validation and cancellation. */
			detached = /* @__PURE__ */ new Map();
			/** Read-only snapshot of the submit-plane state. */
			get state() {
				const c = this.claim;
				return {
					phase: this.phase,
					...c ? { claim: {
						token: c.token,
						...c.hint !== void 0 ? { hint: c.hint } : {},
						...c.attachments === true ? { attachments: true } : {}
					} } : {}
				};
			}
			/**
			* Feed one event through the machine.
			* @param ev - submit-plane event.
			* @returns effects for the SessionInput shell, in execution order.
			*/
			dispatch(ev) {
				switch (ev.type) {
					case "draft-changed": return this.onDraftChanged(ev.draft);
					case "claim": return this.onClaim(ev.claim);
					case "enter": return this.onEnter(ev.mode, ev.draft);
					case "adjudicated": return this.onAdjudicated(ev.attempt, ev.outcome);
					case "adjudication-failed": return this.onAdjudicationFailed(ev.attempt, ev.message);
					case "submit-settled": return this.onSubmitSettled(ev);
					case "sink-settled": return this.onSinkSettled(ev);
					case "send-committed": return this.onSendCommitted();
					case "release": return this.onRelease();
					default: return unreachable(ev);
				}
			}
			/** Claimed integrity watch: a draft that breaks the token prefix releases the claim. */
			onDraftChanged(draft) {
				if (this.phase === "claimed" && this.claim !== void 0 && !draft.startsWith(this.claim.token)) {
					this.phase = "plain";
					this.claim = void 0;
				}
				return [];
			}
			/** The editor applied a claim-token replacement; busy phases refuse another claim. */
			onClaim(claim) {
				if (this.phase !== "plain" && this.phase !== "claimed") return [];
				this.claim = claim;
				this.phase = "claimed";
				return [];
			}
			/** Mint an attempt and controller without assigning its lifecycle owner. */
			mintAttempt(mode, draft) {
				const controller = new AbortController();
				this.seq += 1;
				return {
					attempt: {
						seq: this.seq,
						signal: controller.signal,
						draftSnapshot: draft,
						mode
					},
					controller
				};
			}
			/** Mint the frozen command/adjudication attempt. */
			beginAttempt(mode, draft) {
				const flight = this.mintAttempt(mode, draft);
				this.inflight = flight;
				return flight.attempt;
			}
			/** Mint an ordinary send that leaves the phase plain. */
			beginDetached(mode, draft) {
				const flight = this.mintAttempt(mode, draft);
				this.detached.set(flight.attempt.seq, flight.controller);
				this.claim = void 0;
				this.phase = "plain";
				return flight.attempt;
			}
			/** Default-send effects capture the sink input before the editor commit. */
			detachedEffects(attempt) {
				return [{
					type: "default-sink",
					attempt,
					draft: attempt.draftSnapshot,
					mode: attempt.mode
				}, {
					type: "commit-draft",
					retainSuffixOf: attempt.draftSnapshot
				}];
			}
			onEnter(mode, draft) {
				if (this.phase === "adjudicating" || this.phase === "submitting") return [];
				if (this.phase === "claimed" && this.claim !== void 0) {
					const attempt = this.beginAttempt(mode, draft);
					this.phase = "submitting";
					return [{
						type: "begin-submit",
						attempt,
						claim: this.claim,
						args: argsAfter(draft, this.claim.token)
					}];
				}
				const trimmed = draft.trim();
				if (trimmed === "") return [];
				if (trimmed.startsWith("/")) {
					const attempt = this.beginAttempt(mode, draft);
					this.phase = "adjudicating";
					return [{
						type: "adjudicate",
						attempt,
						draft
					}];
				}
				return this.detachedEffects(this.beginDetached(mode, draft));
			}
			onAdjudicated(attempt, outcome) {
				const flight = this.inflight;
				if (this.phase !== "adjudicating" || flight === void 0 || flight.attempt.seq !== attempt.seq) return [];
				if (outcome !== void 0 && outcome !== "handled" && "claim" in outcome) {
					this.claim = outcome.claim;
					this.phase = "submitting";
					return [{
						type: "begin-submit",
						attempt,
						claim: outcome.claim,
						args: argsAfter(attempt.draftSnapshot, outcome.claim.token)
					}];
				}
				this.inflight = void 0;
				this.phase = "plain";
				if (outcome !== void 0) return [];
				this.detached.set(attempt.seq, flight.controller);
				return this.detachedEffects(attempt);
			}
			onAdjudicationFailed(attempt, message) {
				if (this.phase !== "adjudicating" || this.inflight?.attempt.seq !== attempt.seq) return [];
				this.inflight = void 0;
				this.phase = "plain";
				return [{
					type: "notice",
					level: "error",
					text: message
				}];
			}
			/** Claimed command settlement retains the frozen transaction semantics. */
			onSubmitSettled(ev) {
				const flight = this.inflight;
				if (this.phase !== "submitting" || flight === void 0 || flight.attempt.seq !== ev.attempt.seq) return [];
				this.inflight = void 0;
				if (ev.ok) {
					this.phase = "plain";
					this.claim = void 0;
					const effects = [{
						type: "commit-draft",
						retainSuffixOf: flight.attempt.draftSnapshot
					}];
					if (ev.outcome?.text !== void 0) effects.push({
						type: "notice",
						level: ev.outcome.kind === "error" ? "error" : "info",
						text: ev.outcome.text
					});
					return effects;
				}
				const text = ev.message ?? ev.outcome?.text;
				if (ev.draft === flight.attempt.draftSnapshot && this.claim !== void 0 && ev.draft.startsWith(this.claim.token)) {
					this.phase = "claimed";
					return text === void 0 ? [] : [{
						type: "notice",
						level: "error",
						text
					}];
				}
				this.phase = "plain";
				this.claim = void 0;
				return text === void 0 ? [] : [{
					type: "notice",
					level: "error",
					text
				}];
			}
			/** Settle one ordinary send independently of current phase and other detached sends. */
			onSinkSettled(ev) {
				if (!this.detached.delete(ev.attempt.seq)) return [];
				const text = ev.message ?? ev.outcome?.text;
				if (text === void 0) return [];
				return [{
					type: "notice",
					level: ev.ok && ev.outcome?.kind !== "error" ? "info" : "error",
					text
				}];
			}
			/** Clear after an accepted attachment-only send; it has no text suffix to retain. */
			onSendCommitted() {
				if (this.phase !== "plain") return [];
				this.claim = void 0;
				return [{
					type: "commit-draft",
					retainSuffixOf: null
				}];
			}
			onRelease() {
				if (this.inflight !== void 0) {
					this.inflight.controller.abort();
					this.inflight = void 0;
				}
				for (const controller of this.detached.values()) controller.abort();
				this.detached.clear();
				this.phase = "plain";
				this.claim = void 0;
				return [];
			}
		};
		//#endregion
		//#region ../../../node_modules/.pnpm/clsx@2.1.1/node_modules/clsx/dist/clsx.mjs
		function r(e) {
			var t, f, n = "";
			if ("string" == typeof e || "number" == typeof e) n += e;
			else if ("object" == typeof e) if (Array.isArray(e)) {
				var o = e.length;
				for (t = 0; t < o; t++) e[t] && (f = r(e[t])) && (n && (n += " "), n += f);
			} else for (f in e) e[f] && (n && (n += " "), n += f);
			return n;
		}
		function clsx() {
			for (var e, t, f = 0, n = "", o = arguments.length; f < o; f++) (e = arguments[f]) && (t = r(e)) && (n && (n += " "), n += t);
			return n;
		}
		//#endregion
		//#region \0dsh-css:/home/runner/work/deepseek-harness/deepseek-harness/packages/client/ui-conversation/src/client/input/editor/ReferenceChip.module.css.mjs
		const css$9 = ".yAWgPa_chip{vertical-align:bottom;background:var(--dsw-alias-interactive-bg-hover);max-width:240px;height:22px;color:var(--dsw-alias-state-business-primary);user-select:none;cursor:default;border-radius:6px;align-items:center;gap:3px;padding:0 6px;line-height:22px;display:inline-flex}.yAWgPa_marker{flex:none;font-weight:500}.yAWgPa_icon{flex:none}.yAWgPa_label{text-overflow:ellipsis;white-space:nowrap;overflow:hidden}.yAWgPa_invalid{color:var(--dsw-alias-state-error-primary);opacity:.7;text-decoration:line-through}";
		const tagId$9 = "@deepseek-ai/dsh-client-ui-conversation/ReferenceChip.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$9) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@deepseek-ai/dsh-client-ui-conversation";
			tag.dataset.pluginCss = tagId$9;
			tag.textContent = css$9;
			document.head.appendChild(tag);
		}
		var ReferenceChip_module_css_default = {
			"chip": "yAWgPa_chip",
			"icon": "yAWgPa_icon",
			"invalid": "yAWgPa_invalid",
			"label": "yAWgPa_label",
			"marker": "yAWgPa_marker"
		};
		//#endregion
		//#region lib/types/client/input/editor/ReferenceChip.js
		/**
		* Visual body of one inline reference chip: the DecoratorNode's React
		* face. Pure display — identity, invalidation, and lifecycle live on the
		* ReferenceChipNode; this component renders whatever the node carries.
		*/
		/**
		* Render one inline reference chip.
		* @param props - label, optional domain glyph, and the invalid bit.
		* @returns the chip body (icon + truncating label).
		*/
		function ReferenceChip({ label, appearance, invalid }) {
			return (0, react_jsx_runtime.jsxs)("span", {
				className: clsx(ReferenceChip_module_css_default.chip, invalid && ReferenceChip_module_css_default.invalid),
				title: label,
				children: [appearance === void 0 ? (0, react_jsx_runtime.jsx)("span", {
					className: ReferenceChip_module_css_default.marker,
					"aria-hidden": true,
					children: "@"
				}) : (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.ReferenceIcon, {
					kind: appearance,
					size: 14,
					className: ReferenceChip_module_css_default.icon
				}), (0, react_jsx_runtime.jsx)("span", {
					className: ReferenceChip_module_css_default.label,
					children: label
				})]
			});
		}
		//#endregion
		//#region lib/types/client/input/editor/chip-node.js
		/** One inline reference occurrence as an atomic decorator node. */
		var ReferenceChipNode = class ReferenceChipNode extends Li {
			/** Owning source name (serializer routing key). */
			__source;
			/** Owner-scoped reference id. */
			__ref;
			/** Inline display label (insert-time cache). */
			__label;
			/** Optional domain glyph (insert-time cache). */
			__appearance;
			/** Clipboard / persistence projection, e.g. `/name` (never the model form). */
			__clipboardText;
			/** Owner-resolution failure flag: chip renders invalid; serialization must fail. */
			__invalid;
			/** Lexical node registry type tag. */
			static getType() {
				return "reference-chip";
			}
			/**
			* Clone with identity (Lexical writable-copy contract).
			* @param node - node to clone.
			* @returns a copy carrying the same NodeKey.
			*/
			static clone(node) {
				return new ReferenceChipNode({
					source: node.__source,
					ref: node.__ref,
					label: node.__label,
					appearance: node.__appearance,
					clipboardText: node.__clipboardText
				}, node.__invalid, node.__key);
			}
			/**
			* Rebuild one chip from its JSON form.
			* @param json - serialized chip.
			* @returns a fresh node (new key).
			*/
			static importJSON(json) {
				return new ReferenceChipNode({
					source: json.source,
					ref: json.ref,
					label: json.label,
					appearance: json.appearance,
					clipboardText: json.clipboardText
				}, json.invalid);
			}
			/**
			* @param insert - the owner's reference insertion (display projections included).
			* @param invalid - owner-resolution failure bit (defaults valid).
			* @param key - Lexical clone-path key; absent for fresh nodes.
			*/
			constructor(insert, invalid = false, key) {
				super(key);
				this.__source = insert.source;
				this.__ref = insert.ref;
				this.__label = insert.label;
				this.__appearance = insert.appearance;
				this.__clipboardText = insert.clipboardText;
				this.__invalid = invalid;
			}
			/** Serialize to the JSON node form. */
			exportJSON() {
				return {
					...super.exportJSON(),
					type: "reference-chip",
					version: 1,
					source: this.__source,
					ref: this.__ref,
					label: this.__label,
					...this.__appearance === void 0 ? {} : { appearance: this.__appearance },
					clipboardText: this.__clipboardText,
					invalid: this.__invalid
				};
			}
			/**
			* Mount the chip's host element; the decorator portal renders into it.
			* @returns an inline, non-editable span carrying the test/e2e anchor.
			*/
			createDOM(_config) {
				const el = document.createElement("span");
				el.setAttribute("data-composer-chip", this.__source);
				el.setAttribute("contenteditable", "false");
				return el;
			}
			/** Host element never changes shape. */
			updateDOM() {
				return false;
			}
			/** Chips sit in the text line. */
			isInline() {
				return true;
			}
			/**
			* No keyboard-selected intermediate state: arrows step across the chip in
			* one move and Backspace/Delete remove it whole (the placeholder semantics
			* of the old textarea). `true` would put a NodeSelection between the
			* keystroke and the caret — a state the plain-text binding's handlers all
			* ignore, deadlocking arrows, typing, and deletion at the chip edge.
			*/
			isKeyboardSelectable() {
				return false;
			}
			/** Clipboard / persistence projection (native copy reads this). */
			getTextContent() {
				return this.__clipboardText;
			}
			/**
			* Flip the owner-resolution failure bit.
			* @param invalid - next bit; no-op writes are the caller's concern.
			*/
			setInvalid(invalid) {
				const writable = this.getWritable();
				writable.__invalid = invalid;
			}
			/** Owner-resolution failure bit. */
			isInvalid() {
				return this.getLatest().__invalid;
			}
			/** Owning source name. */
			getSource() {
				return this.getLatest().__source;
			}
			/** Owner-scoped reference id. */
			getReference() {
				return this.getLatest().__ref;
			}
			/** Inline display label. */
			getLabel() {
				return this.getLatest().__label;
			}
			/** Optional domain glyph. */
			getAppearance() {
				return this.getLatest().__appearance;
			}
			/** React face rendered into the host element by the decorator portal. */
			decorate() {
				return (0, react_jsx_runtime.jsx)(ReferenceChip, {
					label: this.__label,
					appearance: this.__appearance,
					invalid: this.__invalid
				});
			}
		};
		/**
		* Mint one chip node from a reference insertion.
		* @param insert - the owner's reference insertion.
		* @returns the fresh node.
		*/
		function $createReferenceChipNode(insert) {
			return new ReferenceChipNode(insert);
		}
		/**
		* Chip type guard.
		* @param node - any node or nullish.
		* @returns whether the node is a ReferenceChipNode.
		*/
		function $isReferenceChipNode(node) {
			return node instanceof ReferenceChipNode;
		}
		//#endregion
		//#region lib/types/client/input/editor/claim-decor.js
		/** Inline style carried by the claim-token node (the old backdrop's hlToken color). */
		const TOKEN_STYLE = "color: var(--dsw-alias-state-warn-label)";
		/** The document's first text leaf, or null (empty document / leading chip). */
		function firstTextLeaf() {
			const block = nl().getFirstChild();
			if (!Pi(block)) return null;
			const leaf = block.getFirstChild();
			return Xo(leaf) ? leaf : null;
		}
		/**
		* Register the claim-token styling transform.
		* @param editor - the shell-owned editor.
		* @param activeToken - live claim token accessor; null while unclaimed.
		* @returns the unregister disposer.
		*/
		function registerClaimDecoration(editor, activeToken) {
			return editor.registerNodeTransform(Wo, (node) => {
				const first = firstTextLeaf();
				if (first === null || node.getKey() !== first.getKey()) {
					if (node.getStyle() === TOKEN_STYLE) node.setStyle("");
					return;
				}
				const token = activeToken();
				const text = node.getTextContent();
				if (token === null || !text.startsWith(token)) {
					if (node.getStyle() === TOKEN_STYLE) node.setStyle("");
					return;
				}
				if (text.length > token.length) {
					const [tokenNode] = node.splitText(token.length);
					if (tokenNode !== void 0 && tokenNode.getStyle() !== TOKEN_STYLE) tokenNode.setStyle(TOKEN_STYLE);
					return;
				}
				if (node.getStyle() !== TOKEN_STYLE) node.setStyle(TOKEN_STYLE);
			});
		}
		/**
		* Nudge the token seat dirty so the transform restyles after a claim flip
		* (claims change phase without a text edit; transforms only run on dirty
		* nodes).
		* @param editor - the shell-owned editor.
		*/
		function refreshClaimDecoration(editor) {
			editor.update(() => {
				firstTextLeaf()?.markDirty();
			});
		}
		//#endregion
		//#region ../../../node_modules/.pnpm/@lexical+text@0.49.0_typescript@6.0.3/node_modules/@lexical/text/dist/LexicalText.prod.mjs
		/**
		* Copyright (c) Meta Platforms, Inc. and affiliates.
		*
		* This source code is licensed under the MIT license found in the
		* LICENSE file in the root directory of this source tree.
		*
		*/
		function d(t, ...e) {
			const n = new URL("https://lexical.dev/docs/error"), r = new URLSearchParams();
			r.append("code", t);
			for (const t of e) r.append("v", t);
			throw n.search = r.toString(), Error(`Minified Lexical error #${t}; visit ${n.toString()} for the full message or use the non-minified dev environment for full errors and additional helpful warnings.`);
		}
		function x(t, e, n, r) {
			const s = (t) => t instanceof n, f = (t) => {
				const e = Go(t.getTextContent());
				e.setFormat(t.getFormat()), t.replace(e);
			};
			return [t.registerNodeTransform(Wo, (t) => {
				if (!t.isSimpleText()) return;
				let n, o = t.getPreviousSibling(), l = t.getTextContent(), u = t;
				if (Xo(o)) {
					const n = o.getTextContent(), r = e(n + l);
					if (s(o)) {
						if (null === r || 0 !== ((t) => t.getLatest().__mode)(o)) return void f(o);
						{
							const e = r.end - n.length;
							if (e > 0) {
								const r = n + l.slice(0, e);
								if (o.select(), o.setTextContent(r), e === l.length) t.remove();
								else {
									const n = l.slice(e);
									t.setTextContent(n);
								}
								return;
							}
						}
					} else if (null === r || r.start < n.length) return;
				}
				let c = 0;
				for (;;) {
					n = e(l);
					let t, g = null === n ? "" : l.slice(n.end);
					if (l = g, "" === g) {
						const t = u.getNextSibling();
						if (Xo(t)) {
							g = u.getTextContent() + t.getTextContent();
							const n = e(g);
							if (null === n) return void (s(t) ? f(t) : t.markDirty());
							if (0 !== n.start) return;
						}
					}
					if (null === n) return;
					if (0 === n.start && Xo(o) && o.isTextEntity()) {
						c += n.end;
						continue;
					}
					0 === n.start ? [t, u] = u.splitText(n.end) : [, t, u] = u.splitText(n.start + c, n.end + c), void 0 === t && d(165, "nodeToReplace");
					const a = r(t);
					if (a.setFormat(t.getFormat()), t.replace(a), null == u) return;
					c = 0, o = a;
				}
			}), t.registerNodeTransform(n, (t) => {
				const n = t.getTextContent(), r = e(n);
				if (null === r || 0 !== r.start) return void f(t);
				if (n.length > r.end) return void t.splitText(r.end);
				const o = t.getPreviousSibling();
				Xo(o) && o.isTextEntity() && (f(o), f(t));
				const l = t.getNextSibling();
				Xo(l) && l.isTextEntity() && (f(l), s(t) && f(t));
			})];
		}
		//#endregion
		//#region lib/types/client/input/decorations.js
		/**
		* Plain-text reference scan (the plain-text-reference decision;
		* see .agents/notes/archived/architecture/2026-07-25-web-input-machine-and-slash-pipeline.md):
		* a `/name` or `@name` token whose name is on the trigger's lexicon, and
		* syntax-recognizable `@dir/` folder tokens. Pure derivation — the editor's
		* text-ref entity transform consumes these ranges; editing the text out of
		* match shape simply drops the range next scan.
		*/
		/** Token matcher: a trigger char at line start or after whitespace, then a word-ish name (never crosses \n). */
		const TEXT_REF_RE = /(^|\s)([/@])([\w-]+)/g;
		const FOLDER_REF_RE = /(^|\s)(@(?:"[^"\n]*\/|[^\s"]+\/))/g;
		/**
		* What may follow a `/name` token: whitespace or the draft end, the boundary
		* the host skill gesture (`dsh-tool-skill`) requires, so `/nfs-hg/xxx`,
		* `/plan.md`, and `/plan。` are prose, never a reference.
		*/
		const SLASH_TOKEN_END_RE = /^(?:\s|$)/;
		/**
		* Scan the draft for plain-text reference tokens against the hot lexicons.
		* Word-boundary discipline: the trigger must sit at the draft
		* start or after whitespace ('x/name' never matches); the name must be an
		* exact lexicon member; a `/name` token must end at whitespace or the draft
		* end ('/name/x' is a path, '/name。' is prose).
		* @param draft - draft text.
		* @param lexicon - per-trigger name lists (a missing trigger scans nothing).
		* @returns matched ranges in draft order.
		*/
		function scanTextRefs(draft, lexicon) {
			if (draft === "") return [];
			const out = [];
			if (lexicon.size > 0) {
				TEXT_REF_RE.lastIndex = 0;
				let m;
				while ((m = TEXT_REF_RE.exec(draft)) !== null) {
					const trigger = m[2];
					const name = m[3] ?? "";
					if (trigger === "/" && !SLASH_TOKEN_END_RE.test(draft.slice(m.index + m[0].length))) continue;
					if (lexicon.get(trigger)?.includes(name)) {
						const start = m.index + (m[1]?.length ?? 0);
						out.push({
							start,
							end: start + 1 + name.length,
							trigger
						});
					}
				}
			}
			FOLDER_REF_RE.lastIndex = 0;
			let folder;
			while ((folder = FOLDER_REF_RE.exec(draft)) !== null) {
				const token = folder[2] ?? "";
				const start = folder.index + (folder[1]?.length ?? 0);
				const end = start + token.length;
				if (!out.some((range) => range.start < end && range.end > start)) out.push({
					start,
					end,
					trigger: "@"
				});
			}
			return out.sort((left, right) => left.start - right.start);
		}
		//#endregion
		//#region \0dsh-css:/home/runner/work/deepseek-harness/deepseek-harness/packages/client/ui-conversation/src/client/input/editor/composer-editor.module.css.mjs
		const css$8 = ".q44v1G_textRef{color:var(--dsw-alias-state-business-primary);-webkit-box-decoration-break:clone;box-decoration-break:clone}";
		const tagId$8 = "@deepseek-ai/dsh-client-ui-conversation/composer-editor.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$8) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@deepseek-ai/dsh-client-ui-conversation";
			tag.dataset.pluginCss = tagId$8;
			tag.textContent = css$8;
			document.head.appendChild(tag);
		}
		var composer_editor_module_css_default = { "textRef": "q44v1G_textRef" };
		//#endregion
		//#region lib/types/client/input/editor/text-ref.js
		/** One matched plain-text reference as a styled, fully editable text node. */
		var TextRefNode = class TextRefNode extends Wo {
			/** Lexical node registry type tag. */
			static getType() {
				return "composer-text-ref";
			}
			/**
			* Clone with identity (Lexical writable-copy contract).
			* @param node - node to clone.
			* @returns a copy carrying the same NodeKey.
			*/
			static clone(node) {
				return new TextRefNode(node.__text, node.__key);
			}
			/**
			* Rebuild one text-ref from its JSON form.
			* @param json - serialized node.
			* @returns a fresh node.
			*/
			static importJSON(json) {
				const node = new TextRefNode(json.text);
				node.setFormat(json.format);
				node.setDetail(json.detail);
				node.setMode(json.mode);
				node.setStyle(json.style);
				return node;
			}
			/** Serialize to the JSON node form. */
			exportJSON() {
				return {
					...super.exportJSON(),
					type: "composer-text-ref"
				};
			}
			/** Style the span the base TextNode mounts. */
			createDOM(config) {
				const el = super.createDOM(config);
				el.classList.add(composer_editor_module_css_default.textRef ?? "textRef");
				el.setAttribute("data-composer-text-ref", "");
				return el;
			}
			/** Entity nodes never merge with plain siblings (the transform owns their bounds). */
			isTextEntity() {
				return true;
			}
			/** Editing continues inside; the transform re-evaluates match shape per edit. */
			canInsertTextBefore() {
				return true;
			}
		};
		/**
		* Register the plain-text reference entity transform. The claim decoration
		* has precedence on the leading-token seat: while a command claim holds, the
		* claimed token must stay a plain TextNode (transforms register per concrete
		* node class, so a TextRefNode would never receive the TextNode claim
		* transform and the warn color would be lost).
		* @param editor - the shell-owned editor.
		* @param lexiconOf - live per-trigger name-roll accessor (the controller's aggregated store).
		* @param activeToken - live claim token accessor; null while unclaimed.
		* @returns the unregister disposer.
		*/
		function registerTextRefDecoration(editor, lexiconOf, activeToken) {
			const getMatch = (text) => {
				const claim = activeToken();
				for (const range of scanTextRefs(text, lexiconOf())) {
					if (claim !== null && range.start === 0 && text.slice(range.start, range.end) === claim) continue;
					return {
						start: range.start,
						end: range.end
					};
				}
				return null;
			};
			return Eu(...x(editor, getMatch, TextRefNode, (node) => new TextRefNode(node.getTextContent())));
		}
		/**
		* Force a re-scan of the whole document (transforms only visit dirty nodes;
		* a lexicon roll change dirties nothing on its own). Queued, not discrete —
		* the caller may sit inside an update listener.
		* @param editor - the shell-owned editor.
		*/
		function rescanTextRefs(editor) {
			editor.update(() => {
				for (const node of nl().getAllTextNodes()) node.markDirty();
			});
		}
		/**
		* Walk the composer document once, producing every projection segment in
		* document order. Blocks (paragraphs) contribute a one-newline gap between
		* one another in both text projections.
		* @returns the layout for this EditorState.
		*/
		function $composerLayout() {
			const segments = [];
			const byKey = /* @__PURE__ */ new Map();
			const children = /* @__PURE__ */ new Map();
			const bounds = /* @__PURE__ */ new Map();
			let detect = "";
			let clipboard = "";
			const pushLeaf = (kind, node, detectPiece, clipboardPiece) => {
				const segment = {
					kind,
					node,
					detectStart: detect.length,
					detectLength: detectPiece.length,
					clipboardStart: clipboard.length,
					clipboardLength: clipboardPiece.length
				};
				segments.push(segment);
				byKey.set(node.getKey(), segment);
				detect += detectPiece;
				clipboard += clipboardPiece;
			};
			const walkElement = (element) => {
				const start = detect.length;
				const kids = element.getChildren();
				children.set(element.getKey(), kids.map((kid) => kid.getKey()));
				for (const kid of kids) if ($isReferenceChipNode(kid)) pushLeaf("chip", kid, "￼", kid.getTextContent());
				else if (Xo(kid)) {
					const text = kid.getTextContent();
					pushLeaf("text", kid, text, text);
				} else if (Yi(kid)) pushLeaf("linebreak", kid, "\n", "\n");
				else if (Pi(kid))
 /* v8 ignore next 4 -- plain-text composition nests no block elements today; the walk stays total for imported states. */
				walkElement(kid);
				bounds.set(element.getKey(), {
					start,
					end: detect.length
				});
			};
			const root = nl();
			const blocks = root.getChildren();
			children.set(root.getKey(), blocks.map((block) => block.getKey()));
			const rootStart = detect.length;
			blocks.forEach((block, index) => {
				const previous = blocks[index - 1];
				if (index > 0 && previous !== void 0) {
					segments.push({
						kind: "gap",
						node: null,
						detectStart: detect.length,
						detectLength: 1,
						clipboardStart: clipboard.length,
						clipboardLength: 1,
						gapBetween: {
							before: previous.getKey(),
							after: block.getKey()
						}
					});
					detect += "\n";
					clipboard += "\n";
				}
				if (Pi(block)) walkElement(block);
			});
			bounds.set(root.getKey(), {
				start: rootStart,
				end: detect.length
			});
			return {
				segments,
				detectLength: detect.length,
				detectText: detect,
				clipboardText: clipboard,
				byKey,
				children,
				bounds
			};
		}
		/**
		* Fold one clipboard-projection offset to its detect-projection twin.
		* Offsets inside a chip's clipboard expansion snap to the chip's trailing
		* edge; callers only pass boundaries that were once a document end (submit
		* snapshots), which never split a chip.
		* @param layout - the current walk product.
		* @param clipboardOffset - offset into the clipboard projection.
		* @returns the detect offset covering the same document position.
		*/
		function detectOffsetOfClipboardOffset(layout, clipboardOffset) {
			for (const segment of layout.segments) {
				const end = segment.clipboardStart + segment.clipboardLength;
				if (clipboardOffset > end) continue;
				if (clipboardOffset === end) return segment.detectStart + segment.detectLength;
				if (segment.kind === "chip") return segment.detectStart + segment.detectLength;
				return segment.detectStart + (clipboardOffset - segment.clipboardStart);
			}
			return layout.detectLength;
		}
		/**
		* Fold one selection point to a detect offset.
		* @param layout - the current walk product.
		* @param point - selection anchor/focus point.
		* @returns detect offset, or null when the point references an unknown node.
		*/
		function $detectOffsetOfPoint(layout, point) {
			if (point.type === "text") {
				const segment = layout.byKey.get(point.key);
				return segment === void 0 ? null : segment.detectStart + Math.min(point.offset, segment.detectLength);
			}
			const kids = layout.children.get(point.key);
			const elementBounds = layout.bounds.get(point.key);
			if (kids === void 0 || elementBounds === void 0) return null;
			if (point.offset >= kids.length) return elementBounds.end;
			const childKey = kids[point.offset];
			if (childKey === void 0) return elementBounds.end;
			const childSegment = layout.byKey.get(childKey);
			if (childSegment !== void 0) return childSegment.detectStart;
			const childBounds = layout.bounds.get(childKey);
			return childBounds === void 0 ? null : childBounds.start;
		}
		/**
		* Project the composer document and its caret.
		* @param idOf - stable occurrence-id assignment per chip NodeKey (the shell
		* owns the map so ids survive across projections of the same node).
		* @returns the three-view projection product.
		*/
		function $projectComposer(idOf) {
			const layout = $composerLayout();
			const occurrences = [];
			for (const segment of layout.segments) {
				if (segment.kind !== "chip" || !$isReferenceChipNode(segment.node)) continue;
				const chip = segment.node;
				occurrences.push({
					occurrenceId: idOf(chip.getKey()),
					source: chip.getSource(),
					ref: chip.getReference(),
					offset: segment.clipboardStart,
					length: segment.clipboardLength,
					label: chip.getLabel(),
					...chip.getAppearance() === void 0 ? {} : { appearance: chip.getAppearance() },
					clipboardText: chip.getTextContent(),
					...chip.isInvalid() ? { invalid: true } : {}
				});
			}
			const selection = Kr();
			let range = null;
			if (ur(selection)) {
				const anchor = $detectOffsetOfPoint(layout, selection.anchor);
				const focus = $detectOffsetOfPoint(layout, selection.focus);
				if (anchor !== null && focus !== null) range = {
					start: Math.min(anchor, focus),
					end: Math.max(anchor, focus)
				};
			}
			return {
				detectText: layout.detectText,
				clipboardText: layout.clipboardText,
				occurrences,
				selection: range,
				caret: range !== null && range.start === range.end ? range.start : null
			};
		}
		//#endregion
		//#region lib/types/client/input/editor/span-map.js
		/**
		* Resolve one detect offset to a selection point. Ownership rule: the first
		* segment whose half-open [start, end) contains the offset resolves it; the
		* document end falls to the last block. Atomic segments (chip, linebreak)
		* resolve to element points beside them, so a span can only ever address a
		* chip as a whole; a gap offset is the end of the block before it.
		* @param layout - current walk product.
		* @param offset - detect offset in [0, detectLength].
		* @returns the point, or null when the offset is out of bounds.
		*/
		function resolvePoint(layout, offset) {
			if (offset < 0 || offset > layout.detectLength) return null;
			for (const segment of layout.segments) {
				if (offset >= segment.detectStart + segment.detectLength) continue;
				if (segment.kind === "text" && segment.node !== null) return {
					key: segment.node.getKey(),
					offset: offset - segment.detectStart,
					type: "text"
				};
				if (segment.kind === "gap" && segment.gapBetween !== void 0) {
					const before = segment.gapBetween.before;
					return {
						key: before,
						offset: layout.children.get(before)?.length ?? 0,
						type: "element"
					};
				}
				/* v8 ignore next -- non-gap segments always carry their node. */
				if (segment.node === null) return null;
				const element = segment.node.getParent();
				/* v8 ignore next -- a walked leaf always has a parent element. */
				if (element === null) return null;
				return {
					key: element.getKey(),
					offset: segment.node.getIndexWithinParent(),
					type: "element"
				};
			}
			const blocks = nl().getChildren();
			const last = blocks[blocks.length - 1];
			if (last === void 0) return {
				key: nl().getKey(),
				offset: 0,
				type: "element"
			};
			return {
				key: last.getKey(),
				offset: layout.children.get(last.getKey())?.length ?? 0,
				type: "element"
			};
		}
		/**
		* Build and apply a live RangeSelection over one detect span.
		* @param layout - current walk product.
		* @param span - detect span.
		* @returns the applied selection, or null when either endpoint fails to map.
		*/
		function selectSpan(layout, span) {
			if (span.start < 0 || span.start > span.end || span.end > layout.detectLength) return null;
			const anchor = resolvePoint(layout, span.start);
			const focus = resolvePoint(layout, span.end);
			/* v8 ignore next -- bounds were checked above; resolvePoint only fails out of bounds. */
			if (anchor === null || focus === null) return null;
			const selection = Fr();
			selection.anchor.set(anchor.key, anchor.offset, anchor.type);
			selection.focus.set(focus.key, focus.offset, focus.type);
			ol(selection);
			return selection;
		}
		/**
		* Replace one detect span with plain text (empty text deletes the span).
		* The caret lands after the insertion.
		* @param span - detect span to replace.
		* @param text - replacement text.
		* @returns whether the span mapped and the edit applied.
		*/
		function $replaceDetectSpanWithText(span, text) {
			const selection = selectSpan($composerLayout(), span);
			if (selection === null) return false;
			if (text === "" && !selection.isCollapsed()) selection.removeText();
			else selection.insertText(text);
			return true;
		}
		/**
		* Replace one detect span with nodes (chip insertion path). The caret lands
		* after the last inserted node.
		* @param span - detect span to replace.
		* @param nodes - replacement nodes in order.
		* @returns whether the span mapped and the edit applied.
		*/
		function $replaceDetectSpanWithNodes(span, nodes) {
			const selection = selectSpan($composerLayout(), span);
			if (selection === null) return false;
			selection.insertNodes([...nodes]);
			return true;
		}
		//#endregion
		//#region lib/types/client/input/facade.js
		/** Guard tier from the machine phase. */
		function guardOf(phase) {
			switch (phase) {
				case "plain": return "plain";
				case "claimed": return "claimed";
				default: return "frozen";
			}
		}
		/** Whether two projections differ in content (selection and caret excluded). */
		function projectionContentChanged(prev, next) {
			if (prev.clipboardText !== next.clipboardText || prev.detectText !== next.detectText) return true;
			if (prev.occurrences.length !== next.occurrences.length) return true;
			return next.occurrences.some((occ, i) => {
				const old = prev.occurrences[i];
				return old === void 0 || old.occurrenceId !== occ.occurrenceId || old.invalid !== occ.invalid;
			});
		}
		const EMPTY_QUEUE = [];
		/** No-pipeline lexicon: zero text-ref decorations. */
		const EMPTY_LEXICON$1 = /* @__PURE__ */ new Map();
		/**
		* Detect-projection and legacy reference placeholders stripped from every
		* external text entering the document (paste, persisted-draft seed): a chip
		* is the only legitimate source of U+FFFC in the detect projection, so a
		* literal one in text would forge chip positions.
		*/
		const REFERENCE_PLACEHOLDER_RE = /[\uE100-\uE11D\uFFFC]/gu;
		/** Undo merge window for contiguous typing, in ms (the old machine's mergeWindowMs). */
		const HISTORY_MERGE_DELAY_MS = 1e3;
		/**
		* The per-session input facade: scoped-event application verbs +
		* setDraft/submit + the published InputState store, over a shell-owned
		* Lexical editor.
		*/
		var SessionInputShell = class {
			deps;
			/** Published editor projection + submit-plane state + queue overlay (the InputZone currency source). */
			state;
			/** Latest surfaced notice (null after clear); the bar renders errors as banners and information inline. */
			notices = (0, _deepseek_ai_dsh_client_store.createSnapshotStore)(null);
			/** The shell-owned editor (text + chip truth); the composer binds its contenteditable to it. */
			editor;
			/** The public provide-channel action face (one stable identity per session). */
			actions = {
				setDraft: (text) => {
					this.setDraft(text);
				},
				addAttachments: (ids) => this.addAttachments(ids),
				removeAttachment: (id) => {
					this.removeAttachment(id);
				},
				pruneAttachments: (ids) => {
					this.pruneAttachments(ids);
				},
				submit: () => {
					this.submit("queue");
				}
			};
			core = new SubmitMachine();
			projection = {
				detectText: "",
				clipboardText: "",
				occurrences: [],
				selection: null,
				caret: null
			};
			rev = 0;
			/** Stable occurrence ids per chip NodeKey (undo restores keys, so ids survive it too). */
			occurrenceIds = /* @__PURE__ */ new Map();
			occurrenceSeq = 0;
			unregister;
			noticeSeq = 0;
			lastMirroredDraft = "";
			attachmentIds = [];
			disposed = false;
			/** Draft persistence mirror (Conversation store write; receives the clipboard projection). */
			mirrorFn;
			/** Live lexicon subscription disposer; undefined until the controller resolves. */
			lexiconOff;
			/** Default sends retained until admission settles or scope disposal releases their attachments. */
			detachedDrafts = /* @__PURE__ */ new Map();
			/** Failed default sends waiting to be restored together in submission order. */
			failedDetached = /* @__PURE__ */ new Map();
			/** Revision of the last automatic failure restoration. */
			failedRestoreRev;
			restoringFailures = false;
			attachmentFlightSeq = 0;
			/** Attachment-only sends retained until admission settles or scope disposal releases their attachments. */
			attachmentFlights = /* @__PURE__ */ new Map();
			constructor(deps) {
				this.deps = deps;
				this.editor = ys({
					namespace: "dsh-composer",
					nodes: [ReferenceChipNode, TextRefNode],
					onError: (error) => {
						throw error;
					}
				});
				this.unregister = Eu(O$1(this.editor), O(this.editor, z(), HISTORY_MERGE_DELAY_MS), this.editor.registerUpdateListener(() => {
					this.onEditorUpdate();
				}), registerClaimDecoration(this.editor, () => this.activeClaimToken()), registerTextRefDecoration(this.editor, () => this.lexicon.getSnapshot(), () => this.activeClaimToken()), () => {
					this.lexiconOff?.();
				});
				this.state = (0, _deepseek_ai_dsh_client_store.createSnapshotStore)(this.compose());
				deps.queue?.subscribe(() => {
					this.publish();
				});
			}
			/**
			* Run one editor edit whose result is observable on return. At the top
			* level this is a discrete update. Inside this editor's own update —
			* command handlers land here synchronously (space/enter picks, paste) —
			* $-functions are already legal, and wrapping them in update() would DEFER
			* them past the synchronous bail answer (and a nested discrete throws);
			* the body runs directly and the outer update commits it.
			* @param fn - the $-edit body.
			*/
			applyEdit(fn, tag) {
				if (this.editor._updating) {
					if (tag !== void 0) Al(tag);
					fn();
					return;
				}
				this.editor.update(fn, {
					discrete: true,
					...tag === void 0 ? {} : { tag }
				});
			}
			/**
			* Subscribe the text-ref re-scan to the controller's lexicon once the
			* controller resolves. The deps thunk cannot resolve at construction (the
			* shell is created inside the sessions provide materialization), so the
			* first interactive updates retry until it can.
			*/
			ensureLexiconSubscription() {
				if (this.lexiconOff !== void 0) return;
				const controller = this.deps.inputTriggers?.();
				if (controller === void 0) return;
				this.lexiconOff = controller.lexicon.subscribe(() => {
					rescanTextRefs(this.editor);
				});
			}
			/** Re-project, run the claim watch, publish, and feed trigger tracking after every editor commit. */
			onEditorUpdate() {
				this.ensureLexiconSubscription();
				const prev = this.projection;
				this.projection = this.editor.getEditorState().read(() => $projectComposer((key) => this.occurrenceIdOf(key)));
				if (projectionContentChanged(prev, this.projection)) {
					this.rev += 1;
					if (!this.restoringFailures && this.failedRestoreRev !== void 0) {
						this.failedDetached.clear();
						this.failedRestoreRev = void 0;
					}
					this.dispatchRun({
						type: "draft-changed",
						draft: this.projection.clipboardText
					});
				}
				const caret = this.projection.caret;
				if (caret !== null) this.deps.inputTriggers?.()?.track(this.projection.detectText, caret, { tier: guardOf(this.core.state.phase) }, this.rev);
			}
			occurrenceIdOf(key) {
				const existing = this.occurrenceIds.get(key);
				if (existing !== void 0) return existing;
				this.occurrenceSeq += 1;
				this.occurrenceIds.set(key, this.occurrenceSeq);
				return this.occurrenceSeq;
			}
			/**
			* Replace the whole draft (persisted-draft seed and programmatic writes).
			* Placeholder-sanitized; newlines split paragraphs; the caret lands at the
			* end. Merged into history so a seed is not an undoable step of its own.
			* @param text - the full next draft.
			*/
			setDraft(text) {
				const clean = text.replace(REFERENCE_PLACEHOLDER_RE, "");
				if (clean === this.projection.clipboardText) return;
				this.editor.update(() => {
					const root = nl();
					root.clear();
					for (const line of clean.split("\n")) {
						const paragraph = es();
						if (line !== "") paragraph.append(Go(line));
						root.append(paragraph);
					}
					root.selectEnd();
				}, {
					discrete: true,
					tag: xo
				});
			}
			/** Append ordered attachment ids unless an admission transaction is locked. */
			addAttachments(ids) {
				if (this.snapshot.phase === "adjudicating" || this.snapshot.phase === "submitting") return false;
				if (ids.length === 0) return true;
				this.attachmentIds = [...this.attachmentIds, ...ids];
				this.publish();
				return true;
			}
			/**
			* Remove one attachment id from this draft. Busy admission phases refuse, like
			* {@link addAttachments}: a removal landing while a command submit serializes
			* would otherwise vanish from the rail yet still ride the in-flight send.
			*/
			removeAttachment(id) {
				if (this.snapshot.phase === "adjudicating" || this.snapshot.phase === "submitting") return false;
				const next = this.attachmentIds.filter((candidate) => candidate !== id);
				if (next.length === this.attachmentIds.length) return false;
				this.attachmentIds = next;
				this.publish();
				return true;
			}
			/**
			* Keep only ids that still resolve in the browser attachment registry.
			* @param available - live registry ids.
			*/
			pruneAttachments(available) {
				const keep = new Set(available);
				const next = this.attachmentIds.filter((id) => keep.has(id));
				if (next.length === this.attachmentIds.length) return;
				this.attachmentIds = next;
				this.publish();
			}
			/**
			* Clear the draft as a successful-send commit: the editor empties (no undo
			* unit) and the undo history is cut, so Ctrl/Cmd-Z cannot resurrect sent
			* content (the command path gets the same discipline from submit-settled).
			* @param attachmentIds - admitted attachment ids to remove from this draft.
			*/
			commitSend(attachmentIds) {
				const submitted = new Set(attachmentIds);
				this.attachmentIds = this.attachmentIds.filter((id) => !submitted.has(id));
				this.dispatchRun({ type: "send-committed" });
			}
			/**
			* Insert pasted plain text over the current editor selection
			* (placeholder-sanitized). The paste event's own default is suppressed by
			* the caller; PASTE_TAG makes the paste its own history boundary, so one
			* undo never removes both the paste and typing inside the merge window.
			* @param text - pasted plain text.
			*/
			paste(text) {
				const clean = text.replace(REFERENCE_PLACEHOLDER_RE, "");
				if (clean === "") return;
				this.applyEdit(() => {
					const selection = Kr();
					if (ur(selection)) {
						selection.insertText(clean);
						return;
					}
					const root = nl();
					if (root.getChildrenSize() === 0) root.append(es());
					root.selectEnd().insertText(clean);
				}, Co);
			}
			/**
			* Enter adjudication + submit transaction + default sink. Effects fan out
			* from the machine; this method only feeds the event. Lock entry
			* (adjudicating/submitting) force-closes the transient layers: the popup
			* dismisses and the menu tracks frozen.
			*/
			submit(mode = "queue") {
				if (this.snapshot.draft.trim() === "" && this.attachmentIds.length > 0) {
					if (this.snapshot.phase === "plain") {
						const attachmentIds = [...this.attachmentIds];
						const controller = new AbortController();
						this.attachmentFlightSeq += 1;
						const flight = this.attachmentFlightSeq;
						this.attachmentFlights.set(flight, {
							controller,
							attachmentIds
						});
						this.commitSend(attachmentIds);
						this.deps.defaultSink("", attachmentIds, mode, controller.signal).then((outcome) => {
							if (this.disposed || !this.attachmentFlights.delete(flight)) return;
							if (outcome.kind === "success") return;
							this.restoreAttachments(attachmentIds);
							if (outcome.text !== void 0) this.notify("error", outcome.text);
						}, (error) => {
							if (this.disposed || !this.attachmentFlights.delete(flight)) return;
							this.restoreAttachments(attachmentIds);
							this.notify("error", error instanceof Error ? error.message : String(error));
						});
					}
					return;
				}
				const before = this.snapshot;
				if (before.phase === "claimed" && this.attachmentIds.length > 0 && before.claim?.attachments !== true) {
					this.notify("error", this.deps.commandAttachments.unsupportedNotice(before.claim?.token ?? before.draft));
					return;
				}
				this.dispatchRun({
					type: "enter",
					mode,
					draft: this.projection.clipboardText
				});
				const phase = this.snapshot.phase;
				if (phase === "adjudicating" || phase === "submitting") {
					this.deps.popup?.()?.dismiss();
					this.deps.inputTriggers?.()?.track(this.projection.detectText, 0, { tier: "frozen" }, this.rev);
				}
			}
			/**
			* Keyboard arbitration while the menu is open.
			* @param key - the intercepted key.
			* @param composing - IME composition guard state.
			* @returns the menu's verdict; 'pass' when no pipeline is mounted.
			*/
			arbitrate(key, composing) {
				return this.deps.inputTriggers?.()?.arbitrate(key, composing) ?? "pass";
			}
			/**
			* Steer every still-pending queued message into the running turn (the
			* empty-draft accelerated-Enter gesture). Execution belongs to the hub's
			* queue choreography; absent dep = the gesture falls back to the machine's
			* empty-draft no-op.
			*/
			steerQueue() {
				this.deps.steerQueue?.();
			}
			/**
			* Space adjudication over the controller's hot state.
			* @returns true = a claim/insert was applied — the caller preventDefaults.
			*/
			space() {
				const inputTriggers = this.deps.inputTriggers?.();
				if (inputTriggers === void 0) return false;
				return inputTriggers.onSpace();
			}
			/** Dismiss the popupSelect shell (any interaction outside the box). */
			dismissPopup() {
				this.deps.popup?.()?.dismiss();
			}
			/**
			* The live selection as a detect-coordinate span (menu-launcher synthetic
			* hits replace it on pick); an absent selection answers a collapsed span at
			* the document end.
			* @returns the ordered [start, end) span in detect coordinates.
			*/
			caretSpan() {
				if (this.projection.selection !== null) return this.projection.selection;
				const at = this.projection.detectText.length;
				return {
					start: at,
					end: at
				};
			}
			/**
			* Hot plain-text reference lexicon source for the decoration scan:
			* delegates to the controller's aggregated store. Stable
			* identity per shell; without a pipeline the snapshot is the empty Map and
			* subscribers never fire.
			*/
			lexicon = {
				getSnapshot: () => this.deps.inputTriggers?.()?.lexicon.getSnapshot() ?? EMPTY_LEXICON$1,
				subscribe: (fn) => this.deps.inputTriggers?.()?.lexicon.subscribe(fn) ?? (() => {})
			};
			/**
			* Apply one command claim (scoped begin-command event listener body): the
			* editor replaces [0, span.end) with the claim token, then the machine
			* enters claimed.
			* @param claim - the command claim from the pick path.
			* @param span - pick-time span snapshot (detect coordinates).
			* @returns whether the edit applied (phase, span CAS, and leading guard passed).
			*/
			beginCommand(claim, span) {
				const phase = this.core.state.phase;
				if (phase !== "plain" && phase !== "claimed") return false;
				if (span.draftRev !== this.rev) return false;
				if (this.projection.detectText.slice(0, span.start).trim() !== "") return false;
				let applied = false;
				this.applyEdit(() => {
					applied = $replaceDetectSpanWithText({
						start: 0,
						end: span.end
					}, claim.token);
				});
				if (!applied) return false;
				this.dispatchRun({
					type: "claim",
					claim
				});
				return true;
			}
			/**
			* Apply one reference insertion (scoped insert-reference event listener
			* body): the editor replaces the span with one chip node, followed by a
			* separating space unless one is already next.
			* @param ref - the reference insertion from the pick path.
			* @param span - pick-time span snapshot (detect coordinates).
			* @returns whether the edit applied.
			*/
			insertReference(ref, span) {
				const phase = this.core.state.phase;
				if (phase !== "plain" && phase !== "claimed") return false;
				if (span.draftRev !== this.rev) return false;
				const tail = this.projection.detectText.slice(span.end, span.end + 1);
				let applied = false;
				this.applyEdit(() => {
					applied = $replaceDetectSpanWithNodes(span, tail === " " ? [$createReferenceChipNode(ref)] : [$createReferenceChipNode(ref), Go(" ")]);
				});
				return applied;
			}
			/**
			* Consume one command token after business success (scoped consume-token
			* event listener body). Span guard: revision CAS then splice; bare-token
			* guard: trimmed-draft equality then clear.
			* @param guard - exact span or bare-token guard.
			* @returns whether the token was consumed.
			*/
			consumeToken(guard) {
				if (guard.kind === "span") {
					if (guard.span.draftRev !== this.rev || guard.span.start === guard.span.end) return false;
					let applied = false;
					this.applyEdit(() => {
						applied = $replaceDetectSpanWithText(guard.span, "");
					});
					return applied;
				}
				if (guard.token === "" || this.projection.clipboardText.trim() !== guard.token) return false;
				this.setDraft("");
				return true;
			}
			/**
			* Insert plain reference text over the pick-time span (scoped insert-text
			* event listener body; the plain-text reference path). The editor gains
			* ordinary characters — no chip node; the chip look is a scan-derived
			* decoration, never state.
			* @param text - the plain reference text to splice in (e.g. `/name `).
			* @param span - pick-time span snapshot (detect coordinates).
			* @param keepCompleting - contract passenger; completion re-opening is
			* automatic here (the update listener re-tracks at the settled caret, so an
			* open token — a directory pick's trailing slash — reopens the menu without
			* an explicit re-track).
			* @returns whether the text was applied.
			*/
			insertText(text, span, keepCompleting = false) {
				if (span.draftRev !== this.rev) return false;
				let applied = false;
				this.applyEdit(() => {
					applied = $replaceDetectSpanWithText(span, text);
				});
				return applied;
			}
			/**
			* Surface a notice from outside the machine (detached command results).
			* @param level - severity tier.
			* @param text - notice body.
			*/
			notify(level, text) {
				this.noticeSeq += 1;
				this.notices.set({
					level,
					text,
					seq: this.noticeSeq
				});
			}
			/**
			* Teardown the shell and return every browser-owned attachment still retained by
			* the draft or an unsettled default send.
			* @returns attachment ids the scope disposer must release.
			*/
			dispose() {
				if (this.disposed) return [];
				const retained = new Set(this.attachmentIds);
				for (const record of this.detachedDrafts.values()) for (const attachmentId of record.attachmentIds) retained.add(attachmentId);
				for (const flight of this.attachmentFlights.values()) {
					for (const attachmentId of flight.attachmentIds) retained.add(attachmentId);
					flight.controller.abort();
				}
				this.disposed = true;
				this.dispatchRun({ type: "release" });
				this.unregister();
				this.editor.setRootElement(null);
				this.detachedDrafts.clear();
				this.failedDetached.clear();
				this.attachmentFlights.clear();
				return [...retained];
			}
			/** Read the live input state (guard derivation reads here). */
			get snapshot() {
				return this.state.getSnapshot();
			}
			/**
			* Bind the draft persistence mirror (Conversation store write). Adopt-on-bind: the
			* store draft may hold a persisted value from a previous mount; the caller
			* seeds it via setDraft BEFORE binding, and afterwards every editor-adopted
			* draft mirrors out.
			* @param write - store draft write.
			* @returns the unbind disposer.
			*/
			bindMirror(write) {
				this.mirrorFn = write;
				return () => {
					if (this.mirrorFn === write) this.mirrorFn = void 0;
				};
			}
			/** The claim token the decoration transform styles; null while unclaimed. */
			activeClaimToken() {
				const core = this.core.state;
				return (core.phase === "claimed" || core.phase === "submitting") && core.claim !== void 0 ? core.claim.token : null;
			}
			/** Dispatch + execute, refreshing the claim decoration when the styled token flips. */
			dispatchRun(ev) {
				const beforeToken = this.activeClaimToken();
				this.run(this.core.dispatch(ev));
				if (this.activeClaimToken() !== beforeToken) refreshClaimDecoration(this.editor);
			}
			run(effects) {
				for (const fx of effects) this.execute(fx);
				this.publish();
			}
			execute(fx) {
				switch (fx.type) {
					case "notice":
						this.noticeSeq += 1;
						this.notices.set({
							level: fx.level,
							text: fx.text,
							seq: this.noticeSeq
						});
						return;
					case "adjudicate":
						this.adjudicate(fx.attempt, fx.draft);
						return;
					case "begin-submit":
						this.beginSubmit(fx.attempt, fx.claim, fx.args);
						return;
					case "default-sink":
						this.sinkSerialized(fx.attempt, fx.draft, fx.mode);
						return;
					case "commit-draft":
						this.commitDraft(fx.retainSuffixOf);
						return;
				}
			}
			/**
			* Execute the commit-draft effect: clear the committed content (retaining
			* a pure typed-during-flight suffix when the snapshot allows) and cut the
			* undo history so sent content cannot resurrect.
			*/
			commitDraft(retainSuffixOf) {
				this.editor.update(() => {
					const layout = $composerLayout();
					const clip = layout.clipboardText;
					if (retainSuffixOf !== null && clip !== retainSuffixOf && clip.startsWith(retainSuffixOf)) {
						$replaceDetectSpanWithText({
							start: 0,
							end: detectOffsetOfClipboardOffset(layout, retainSuffixOf.length)
						}, "");
						return;
					}
					const root = nl();
					root.clear();
					root.selectEnd();
				}, {
					discrete: true,
					tag: xo
				});
				this.editor.dispatchCommand(Nn$1, void 0);
			}
			/**
			* Prompt serialization before the sink: expand each chip occurrence to its
			* owner's model form via the session controller's codec routing. Owner
			* missing or serialization failure rejects the detached send and restores
			* its editor snapshot. Chip-free drafts skip the async detour.
			*/
			sinkSerialized(attempt, draft, mode) {
				const attachmentIds = [...this.attachmentIds];
				this.attachmentIds = [];
				const occurrences = this.projection.occurrences;
				const record = {
					draft,
					occurrences,
					attachmentIds
				};
				this.detachedDrafts.set(attempt.seq, record);
				if (this.failedRestoreRev === this.rev) {
					this.failedDetached.clear();
					this.failedRestoreRev = void 0;
				}
				if (occurrences.length === 0) {
					this.settleSink(attempt, this.deps.defaultSink(draft.trim(), attachmentIds, mode, attempt.signal));
					return;
				}
				const inputTriggers = this.deps.inputTriggers?.();
				Promise.all(occurrences.map(async (o) => {
					if (inputTriggers === void 0) throw new Error(`no serializer for reference source "${o.source}"`);
					return {
						offset: o.offset,
						length: o.length,
						text: await inputTriggers.serializeReference(o.source, o.ref, attempt.signal)
					};
				})).then((parts) => {
					if (this.disposed) return;
					let out = "";
					let cursor = 0;
					for (const part of parts) {
						out += draft.slice(cursor, part.offset) + part.text;
						cursor = part.offset + part.length;
					}
					out += draft.slice(cursor);
					this.settleSink(attempt, this.deps.defaultSink(out.trim(), attachmentIds, mode, attempt.signal));
				}, (error) => {
					if (this.dead(attempt)) return;
					const message = error instanceof Error ? error.message : String(error);
					this.settleDetachedFailure(attempt, message);
				});
			}
			/** Settle one detached default send independently of other sends. */
			settleSink(attempt, pending) {
				pending.then((outcome) => {
					if (this.dead(attempt)) return;
					if (outcome.kind !== "success") {
						this.settleDetachedFailure(attempt, outcome.text);
						return;
					}
					this.detachedDrafts.delete(attempt.seq);
					this.dispatchRun({
						type: "sink-settled",
						attempt,
						ok: true,
						outcome
					});
				}, (error) => {
					if (this.dead(attempt)) return;
					this.settleDetachedFailure(attempt, error instanceof Error ? error.message : String(error));
				});
			}
			/** Restore one failed detached send without overwriting text entered after a restoration. */
			settleDetachedFailure(attempt, message) {
				const record = this.detachedDrafts.get(attempt.seq);
				if (record === void 0) return;
				this.detachedDrafts.delete(attempt.seq);
				this.restoreAttachments(record.attachmentIds);
				this.failedDetached.set(attempt.seq, record);
				if (this.projection.clipboardText === "" || this.failedRestoreRev === this.rev) this.restoreFailedDrafts();
				this.dispatchRun({
					type: "sink-settled",
					attempt,
					ok: false,
					...message === void 0 ? {} : { message }
				});
			}
			/** Rebuild all currently failed snapshots in submission order. */
			restoreFailedDrafts() {
				const records = [...this.failedDetached.entries()].sort(([a], [b]) => a - b).map(([, record]) => record);
				if (records.length === 0) return;
				const separator = "\n\n";
				let draft = "";
				const occurrences = [];
				for (const record of records) {
					const base = draft.length + (draft === "" ? 0 : 2);
					if (draft !== "") draft += separator;
					draft += record.draft;
					for (const occurrence of record.occurrences) occurrences.push({
						...occurrence,
						offset: base + occurrence.offset
					});
				}
				this.restoringFailures = true;
				try {
					this.editor.update(() => {
						const root = nl();
						root.clear();
						let paragraph = es();
						root.append(paragraph);
						const appendText = (text) => {
							const lines = text.split("\n");
							for (let i = 0; i < lines.length; i += 1) {
								const line = lines[i];
								if (line !== "") paragraph.append(Go(line));
								if (i < lines.length - 1) {
									paragraph = es();
									root.append(paragraph);
								}
							}
						};
						let cursor = 0;
						for (const occurrence of occurrences) {
							appendText(draft.slice(cursor, occurrence.offset));
							paragraph.append(new ReferenceChipNode({
								source: occurrence.source,
								ref: occurrence.ref,
								label: occurrence.label,
								...occurrence.appearance === void 0 ? {} : { appearance: occurrence.appearance },
								clipboardText: occurrence.clipboardText
							}, occurrence.invalid === true));
							cursor = occurrence.offset + occurrence.length;
						}
						appendText(draft.slice(cursor));
						root.selectEnd();
					}, {
						discrete: true,
						tag: xo
					});
					this.editor.dispatchCommand(Nn$1, void 0);
					this.failedRestoreRev = this.rev;
				} finally {
					this.restoringFailures = false;
				}
			}
			/** Return failed-send attachments to the head of the rail; release happens only after success. */
			restoreAttachments(attachmentIds) {
				if (attachmentIds.length === 0) return;
				const current = new Set(this.attachmentIds);
				const restored = attachmentIds.filter((id) => !current.has(id));
				if (restored.length === 0) return;
				this.attachmentIds = [...restored, ...this.attachmentIds];
				this.publish();
			}
			/** Enter adjudication: poll the session controller; failure = notice + draft retained (never a silent downgrade). */
			adjudicate(attempt, draft) {
				const inputTriggers = this.deps.inputTriggers?.();
				if (inputTriggers === void 0) {
					this.dispatchRun({
						type: "adjudicated",
						attempt,
						outcome: void 0
					});
					return;
				}
				inputTriggers.adjudicate(draft.trim(), attempt.signal, { attachments: this.attachmentIds.length }).then((outcome) => {
					if (this.dead(attempt)) return;
					this.dispatchRun({
						type: "adjudicated",
						attempt,
						outcome
					});
				}, (error) => {
					if (this.dead(attempt)) return;
					const message = error instanceof Error ? error.message : String(error);
					this.dispatchRun({
						type: "adjudication-failed",
						attempt,
						message
					});
				});
			}
			/**
			* The submit transaction: claim.submit against the session scope; ok maps
			* from the outcome kind. An accepting claim receives the serialized draft
			* attachments, which are cleared and released only on a success outcome; a
			* failure (serialize, transport, or handler error) keeps draft and attachments
			* for correction.
			*/
			beginSubmit(attempt, claim, args) {
				const attachmentIds = claim.attachments === true ? [...this.attachmentIds] : [];
				Promise.resolve().then(async () => {
					const attachments = attachmentIds.length > 0 ? await this.deps.commandAttachments.serialize(attachmentIds) : [];
					if (this.dead(attempt)) return void 0;
					return claim.submit(args, this.deps.actx, attachments);
				}).then((outcome) => {
					if (outcome === void 0 || this.dead(attempt)) return;
					if (outcome.kind === "success" && attachmentIds.length > 0) {
						const submitted = new Set(attachmentIds);
						this.attachmentIds = this.attachmentIds.filter((id) => !submitted.has(id));
						this.deps.commandAttachments.release(attachmentIds);
					}
					this.dispatchRun({
						type: "submit-settled",
						attempt,
						ok: outcome.kind === "success",
						draft: this.projection.clipboardText,
						outcome,
						...outcome.kind === "error" && outcome.text === void 0 ? { message: "command failed" } : {}
					});
				}, (error) => {
					if (this.dead(attempt)) return;
					const message = error instanceof Error ? error.message : String(error);
					this.dispatchRun({
						type: "submit-settled",
						attempt,
						ok: false,
						draft: this.projection.clipboardText,
						message
					});
				});
			}
			/** Late-settlement guard: superseded attempts and disposed facades drop silently. */
			dead(attempt) {
				return this.disposed || attempt.signal.aborted;
			}
			compose() {
				const core = this.core.state;
				return {
					draft: this.projection.clipboardText,
					attachmentIds: this.attachmentIds,
					draftRev: this.rev,
					phase: core.phase,
					...core.claim !== void 0 ? { claim: core.claim } : {},
					occurrences: this.projection.occurrences,
					queue: this.deps.queue?.getSnapshot() ?? EMPTY_QUEUE
				};
			}
			publish() {
				const next = this.compose();
				this.state.set(next);
				if (next.draft !== this.lastMirroredDraft) {
					this.lastMirroredDraft = next.draft;
					this.mirrorFn?.(next.draft);
				}
			}
		};
		//#endregion
		//#region lib/types/client/input/hub.js
		/** Session-addressed input facade registry (SessionInputResolver face + composer-layer extras). */
		var InputHub = class {
			rootCtx;
			t;
			shells = /* @__PURE__ */ new Map();
			/**
			* @param ctx - client root context (services resolved lazily per call — boot order stays free).
			* @param t - conversation-namespace translate thunk (reads the active locale at call time).
			*/
			constructor(rootCtx, t) {
				this.rootCtx = rootCtx;
				this.t = t;
			}
			/**
			* Resolve the facade for one session-scope ctx (SessionInputResolver face).
			* @param actx - session-scope context.
			* @returns the resident per-session facade.
			*/
			for(actx) {
				const id = this.sessions().scopeOf(actx);
				if (id === void 0) throw new Error("conversation.input.for requires a session scope");
				return this.shell(id);
			}
			/**
			* Resident shell for one session binding — the provide-channel entry
			* (called during scope materialization, BEFORE the scope record is
			* queryable, hence binding-fed and hence the thunked slash/popup deps).
			* Wires the scoped event listeners + teardown into the session scope.
			* @param binding - session assembly handle.
			* @returns the shell.
			*/
			shellFor(binding) {
				const existing = this.shells.get(binding.sessionId);
				if (existing !== void 0) return existing;
				const { sessionId: id, session, ctx: actx } = binding;
				const shell = new SessionInputShell({
					actx,
					inputTriggers: () => this.controller(actx),
					popup: () => this.popup(actx),
					queue: queueReadFaceOf(session),
					defaultSink: (text, attachmentIds, mode, signal) => this.sink(session, text, attachmentIds, mode, signal),
					steerQueue: () => {
						this.steerQueue(session, shell);
					},
					commandAttachments: {
						serialize: async (ids) => {
							return (await this.conversation().serializeDraftAttachments(ids)).attachments;
						},
						release: (ids) => {
							const conversation = this.rootCtx.get("conversation");
							for (const attachmentId of ids) conversation?.releaseDraftAttachment(attachmentId);
						},
						unsupportedNotice: (token) => this.t("command.attachmentsUnsupported", { command: token.trim().replace(/^\//u, "") })
					}
				});
				this.shells.set(id, shell);
				actx.effect(() => {
					const offs = [
						actx.on("slash/input-begin-command", (req) => shell.beginCommand(req.claim, req.span) ? true : void 0),
						actx.on("slash/input-insert-reference", (req) => shell.insertReference(req.reference, req.span) ? true : void 0),
						actx.on("slash/input-consume-token", (req) => shell.consumeToken(req.guard) ? true : void 0),
						actx.on("slash/input-insert-text", (req) => shell.insertText(req.text, req.span, req.continue === true) ? true : void 0)
					];
					return () => {
						for (const off of offs) off();
						const drafts = shell.dispose();
						this.shells.delete(id);
						const conversation = this.rootCtx.get("conversation");
						for (const attachmentId of drafts) conversation?.releaseDraftAttachment(attachmentId);
					};
				}, "conversation.input: session shell");
				return shell;
			}
			/**
			* Resident shell by session id (service-face path; the provide channel has
			* normally created it already — this covers direct id-addressed access).
			* @param id - session id.
			* @returns the shell.
			*/
			shell(id) {
				const existing = this.shells.get(id);
				if (existing !== void 0) return existing;
				const binding = this.sessions().binding(id);
				if (binding === void 0) throw new Error(`conversation.input: session "${id}" resolved no binding`);
				return this.shellFor(binding);
			}
			/**
			* The InputBar-exclusive keyboard command face: the shell
			* satisfies it structurally; package-internal — handed through the
			* composer-bar entry's inject, never across a plugin boundary.
			* @param id - session id.
			* @returns the shell as the keyboard face.
			*/
			keyboard(id) {
				return this.shell(id);
			}
			/**
			* Resolve the optional slash controller for composer chrome that launches
			* the shared candidate menu without typing a trigger.
			* @param id - session id.
			* @returns the resident controller, or undefined when no trigger provider is installed.
			*/
			inputTriggers(id) {
				const actx = this.sessions().scope(id);
				return actx === void 0 ? void 0 : this.controller(actx);
			}
			/**
			* Default sink: optimistic clear + prompt. The session is always a real
			* host entity (materialized when its workspace was picked), so there is
			* exactly one path; a failed first prompt is an ordinary prompt failure
			* (banner via promptError, draft restored only while untouched).
			*/
			sink(session, text, attachmentIds, mode, signal) {
				if (text === "" && attachmentIds.length === 0) return Promise.resolve({ kind: "success" });
				return this.conversation().sendSession(session, text, attachmentIds, mode, signal);
			}
			/**
			* Submit every still-pending queued message through QueueDock Steer, in FIFO
			* request order — the same operation as the queue dock's per-row button.
			* An Agent stopping before a command (`session/steer-unavailable`) or a row already
			* claimed by the agent (`session/queue-item-not-found`) converges silently, while a
			* genuine failure surfaces as one composer notice. Repeated triggers
			* (e.g. two rapid empty-draft chords) rely on that `session/queue-item-not-found`
			* convergence: the snapshot may still list a row the host already steered,
			* and the duplicate Steer is a silent no-op.
			* @param session - the addressed host session.
			* @param shell - the resident shell (notice outlet).
			*/
			async steerQueue(session, shell) {
				const queued = session.getSnapshot().queue.filter((item) => item.placement === "queued");
				if (queued.length === 0) return;
				for (const item of queued) {
					const result = await session.updateQueue(item.id, { kind: "steer" });
					if (result.ok) continue;
					if (result.error.code === "session/steer-unavailable" || result.error.code === "session/queue-item-not-found") return;
					shell.notify("error", this.t("queue.steerFailed"));
					return;
				}
			}
			controller(actx) {
				return this.rootCtx.get("inputTriggers")?.sessionOf(actx);
			}
			popup(actx) {
				return this.rootCtx.get("commandUi")?.popupFor(actx);
			}
			sessions() {
				const sessions = this.rootCtx.get("sessions");
				if (sessions === void 0) throw new Error("conversation.input: sessions service unavailable");
				return sessions;
			}
			conversation() {
				const conversation = this.rootCtx.get("conversation");
				if (conversation === void 0) throw new Error("conversation.input: conversation service unavailable");
				return conversation;
			}
		};
		//#endregion
		//#region lib/types/submission-settings.js
		/** Busy-Enter preference stored in the Host user-settings document. */
		/** Settings namespace owned by the conversation plugin. */
		const CONVERSATION_SETTINGS_NAMESPACE = "ui-conversation";
		/** Field carrying the delivery mode for plain Enter while an agent is busy. */
		const BUSY_ENTER_FIELD = "busyEnter";
		/** Busy-Enter behaviors accepted at settings and input boundaries. */
		const BUSY_ENTER_BEHAVIORS = ["queue", "steer"];
		/** Default preserves Enter-as-Queue for running conversations. */
		const DEFAULT_BUSY_ENTER_BEHAVIOR = "queue";
		Schema.object({ [BUSY_ENTER_FIELD]: Schema.union([...BUSY_ENTER_BEHAVIORS]).default(DEFAULT_BUSY_ENTER_BEHAVIOR) });
		//#endregion
		//#region lib/types/client/input/submission-policy.js
		/**
		* Composer submission policy. It owns the live busy-Enter preference and
		* resolves submission gestures into queue/steer delivery modes; Host and
		* Agent keep the actual delivery-window authority.
		*/
		/**
		* Resolve one submission gesture against the busy-Enter preference. Plain
		* Enter and the primary Send button share the `enter` gesture, so the button
		* delivers exactly what Enter would. Direct `steer` is intentionally
		* best-effort: AgentLoop turns a closed-window submission into the next waking
		* Queue item.
		* @param preferred - the live busy-Enter preference.
		* @param running - whether the addressed agent currently reports busy.
		* @param gesture - plain Enter (or the Send button) or the Cmd/Ctrl-accelerated chord.
		* @param steeringAvailable - whether this session transport supports steering.
		* @returns Queue outside steer-capable busy state; otherwise the preferred mode or its opposite.
		*/
		function resolveSubmitMode(preferred, running, gesture, steeringAvailable) {
			if (!running || !steeringAvailable) return "queue";
			if (gesture === "enter") return preferred;
			return preferred === "queue" ? "steer" : "queue";
		}
		/**
		* Busy-Enter preference shared by the composer bar inject face and its
		* Settings row: one live store the bar's submission gestures and Send label
		* read, backed by the Host user-settings document when one is composed.
		*/
		var ComposerSubmissionPolicy = class {
			/** Reactive preference source for the composer bar and the Settings row. */
			busyEnter = (0, _deepseek_ai_dsh_client_store.createSnapshotStore)(DEFAULT_BUSY_ENTER_BEHAVIOR);
			host;
			/**
			* @param host - durable preference scope owned by the providing plugin;
			* absent compositions stay process-local. The adoption subscription shares
			* the scope's plugin lifetime — a disposed scope never publishes again, so
			* the policy needs no release hook.
			*/
			constructor(host) {
				this.host = host;
				if (host !== void 0) {
					host.subscribe(() => {
						this.adopt(host);
					});
					this.adopt(host);
				}
			}
			/**
			* Change the busy-state submission behavior; the live value publishes
			* before the durable write starts.
			* @param behavior - Queue or Steer.
			*/
			setBusyEnter(behavior) {
				if (this.busyEnter.getSnapshot() === behavior) return;
				this.busyEnter.set(behavior);
				this.host?.set(BUSY_ENTER_FIELD, behavior);
			}
			/**
			* Adopt the scope's accepted durable behavior without writing it back.
			* @param host - the constructor-narrowed scope driving this adoption.
			*/
			adopt(host) {
				const section = host.getSnapshot().value;
				if (section === void 0 || this.busyEnter.getSnapshot() === section.busyEnter) return;
				this.busyEnter.set(section.busyEnter);
			}
		};
		//#endregion
		//#region lib/types/client/locales.js
		/** `conversation` namespace dictionaries. */
		/** Dictionary namespace owned by this plugin. */
		const NS = "conversation";
		const PLAN_NEXT_ACTION_ZH = "描述你的任务以生成计划";
		const PLAN_NEXT_ACTION_EN = "describe your task to generate plan";
		/** Simplified Chinese dictionary (the key-set source of truth). */
		const zh = {
			"hint.plan": PLAN_NEXT_ACTION_ZH,
			"hint.goal": "输入目标，智能体将持续执行",
			"hint.goal.active": "当前目标进行中。可输入 edit 修改 / pause 暂停 / resume 继续 / clear 清除",
			"placeholder.plan": PLAN_NEXT_ACTION_ZH,
			"placeholder.default": "发消息或创建任务, / 调用指令, @ 文件或对话",
			"placeholder.unavailable": "会话不可用",
			"placeholder.parentOffline": "父会话已离线，无法继续发送；仍可停止当前运行",
			"placeholder.hero": "描述你想要构建的内容, / 调用指令, @ 文件或对话",
			"placeholder.workspace": "选择一个工作区开始",
			"placeholder.steerQueue": "Cmd/Ctrl+Enter 插话发送全部排队消息",
			"input.commands": "指令",
			"input.stop": "停止生成",
			"input.send": "发送消息",
			"input.send.queue": "排队发送",
			"input.send.steer": "插话发送",
			"input.accessMode": "访问模式，当前：{name}",
			"attachment.pending": "待发送附件",
			"attachment.scrollLeft": "向左滚动附件",
			"attachment.scrollRight": "向右滚动附件",
			"attachment.dropTitle": "文件或图片拖动到此处即可添加",
			"attachment.dropDesc": "图片限制：最多 {count} 张，每张 {size}",
			"attachment.dropBlocked": "当前无法添加文件或图片",
			"image.pending": "待发送图片",
			"image.openOriginal": "查看原图",
			"image.openOriginalLabel": "{label}，点击查看原图",
			"image.remove": "移除图片 {name}",
			"image.original": "原图",
			"image.label": "图片",
			"image.loadFailed": "图片加载失败，点击重试",
			"image.loading": "图片加载中…",
			"image.preview": "原图预览",
			"image.closePreview": "关闭原图预览",
			"image.unsupportedType": "仅支持 PNG、JPG、WebP、GIF 格式的图片",
			"image.tooMany": "一条消息最多添加 {count} 张图片",
			"image.fileTooLarge": "单张图片不能超过 {size}",
			"image.totalTooLarge": "图片总大小超过 {size}，请移除部分图片",
			"image.tooManyPixels": "图片分辨率过大，请压缩后重试",
			"image.dimensionTooLarge": "图片宽高不能超过 {size}px，请缩小后重试",
			"image.modelUnsupported": "当前模型不支持图片，请切换支持图片的模型",
			"image.sendFailed": "图片发送失败（{reason}），请重新添加图片后再试",
			"file.attach": "添加附件",
			"file.pending": "待发送文件",
			"file.remove": "移除文件 {name}",
			"file.uploading": "上传中…",
			"file.uploadFailed": "上传失败，点击重试",
			"file.retry": "重试上传 {name}",
			"file.stillUploading": "文件还在上传，请等待上传完成后发送",
			"file.sessionUnavailable": "会话不可用，无法上传文件",
			"file.notStaged": "文件尚未上传成功，请重新添加后再试",
			"file.label": "文件",
			"context.aria": "上下文已用 {percent}",
			"context.used": "上下文已用",
			"context.system": "系统提示词",
			"context.tools": "工具定义",
			"context.messages": "对话消息",
			"settings.enter.title": "繁忙时的发送行为",
			"settings.enter.description": "智能体运行时 Enter 键和发送按钮的行为；Cmd/Ctrl+Enter 使用另一行为",
			"settings.enter.queue": "排队发送",
			"settings.enter.steer": "插话发送",
			"access.preset.readOnly": "仅可查看",
			"access.preset.workspaceWrite": "工作区内修改",
			"access.preset.fullAccess": "完全权限",
			"access.confirm.title": "确认启用完全权限？",
			"access.confirm.description": "启用完全权限后，智能体将减少确认步骤，并且可以直接执行更多操作，包括敏感操作、文件修改或外部命令。仅建议在你信任当前任务时使用。",
			"access.confirm.acknowledge": "我已了解风险，并愿意继续",
			"access.confirm.cancel": "取消",
			"access.confirm.enable": "启用完全权限",
			"hero.headline": "探索未至之境",
			"hero.preview": "预览版",
			"hero.chooseWorkspace": "选择工作区",
			"session.hierarchy": "会话层级",
			"todo.title": "任务",
			"todo.progress.done": "{done} 已完成",
			"todo.progress.active": "{active} 进行中",
			"todo.progress.pending": "{pending} 待处理",
			"todo.rowTitle": "更新任务清单",
			"todo.completed": "{done}/{total} 已完成",
			"command.attachmentsUnsupported": "/{command} 不接受附件，请先移除附件",
			"ask.rowTitle": "提问",
			"ask.waiting": "等待回答",
			"ask.cancelled": "已取消",
			"ask.cancelledDetail": "本轮已取消，未提交回答",
			"ask.interrupted": "已中断",
			"ask.interruptedDetail": "本轮已中断，未提交回答",
			"ask.answered": "{answered}/{total} 已回答",
			"ask.skipped": "未回答",
			"bash.running": "运行中",
			"bash.failed": "失败",
			"bash.stopped": "已停止",
			"row.running": "运行中",
			"row.failed": "失败",
			"row.stopped": "已停止",
			"row.input": "输入",
			"row.output": "输出",
			"row.inspect": "查看",
			"tool.title.search": "搜索",
			"tool.title.read": "读取",
			"tool.title.bash": "Bash",
			"tool.title.write": "写入",
			"tool.title.edit": "编辑",
			"tool.title.code": "代码",
			"tool.title.generic": "工具调用",
			"tool.title.inspect": "查看",
			"tool.title.runCordis": "运行 Cordis 插件",
			"tool.title.stopCordis": "停止 Cordis 插件",
			"tool.title.removeCordis": "移除 Cordis 插件",
			"tool.title.pwsh": "Pwsh",
			"tool.title.readImage": "读取图片",
			"tool.title.grep": "Grep",
			"tool.title.glob": "Glob",
			"tool.title.webSearch": "网页搜索",
			"tool.title.webFetch": "网页获取",
			"diff.files.one": "{count} 个文件",
			"diff.files.other": "{count} 个文件",
			"diff.collapseAria": "收起差异",
			"diff.expandAria": "展开其余 {count} 行差异",
			"diff.expandRest": "… 其余 {count} 行",
			"read.window": "显示 {shown} / {total} 行",
			"read.collapseAria": "收起内容",
			"read.expandAria": "展开其余 {count} 行",
			"read.expandRest": "… 其余 {count} 行",
			"search.paths": "{shown} 个路径",
			"search.paths.truncated": "显示 {shown} / 共 {total} 个路径",
			"search.matches": "{shown} 处匹配 · {files} 个文件",
			"search.matches.truncated": "显示 {shown} / 共 {total} 处匹配 · {files} 个文件",
			"search.noResults": "无结果",
			"search.collapseAria": "收起结果",
			"search.expandAria": "展开其余 {count} 行结果",
			"search.expandRest": "… 其余 {count} 行",
			"web.noResults": "未找到结果",
			"web.sourcesTruncated": "来源列表已截断",
			"web.http": "HTTP",
			"web.contentTruncated": "内容已截断",
			"details.running": "运行中…",
			"queue.count": "{n} 条排队消息",
			"queue.sending": "发送中…",
			"queue.image": "排队消息图片",
			"queue.file": "排队文件 {name}",
			"queue.edit": "编辑排队消息",
			"queue.edit.unsupported": "包含非文本内容，暂不支持编辑",
			"queue.save": "保存排队消息",
			"queue.cancelEdit": "取消编辑",
			"queue.remove": "删除排队消息",
			"queue.steer": "插话发送",
			"queue.steer.unavailable": "仅运行中可插话发送",
			"queue.editFailed": "编辑失败：这条消息可能已经开始发送。",
			"queue.removeFailed": "删除失败：这条消息可能已经开始发送。",
			"queue.steerFailed": "插话发送失败，请重试。",
			"terminal.signal": "信号 {signal}",
			"terminal.exitCode": "退出码 {code}",
			"terminal.running": "运行中",
			"terminal.failed": "失败",
			"terminal.done": "已完成",
			"terminal.noOutput": "无输出",
			"terminal.collapseAria": "收起输出",
			"terminal.expandAria": "展开其余 {n} 行输出",
			"terminal.expandRest": "… 其余 {n} 行",
			"terminal.sendInput": "（发送输入）",
			"terminal.session": "终端 {sessionId}"
		};
		/** English dictionary, checked complete against the zh key set. */
		const en = {
			"hint.plan": PLAN_NEXT_ACTION_EN,
			"hint.goal": "describe the objective for a long-running task",
			"hint.goal.active": "goal active — edit / pause / resume / clear",
			"placeholder.plan": PLAN_NEXT_ACTION_EN,
			"placeholder.default": "Message or run a task, / commands, @ files or sessions",
			"placeholder.unavailable": "Session unavailable",
			"placeholder.parentOffline": "Parent session offline; sending is unavailable but you can still stop the run",
			"placeholder.hero": "Describe what you want to build, / commands, @ files or sessions",
			"placeholder.workspace": "Choose a workspace to start",
			"placeholder.steerQueue": "Cmd/Ctrl+Enter steers all queued messages",
			"input.commands": "Commands",
			"input.stop": "Stop generating",
			"input.send": "Send message",
			"input.send.queue": "Queue message",
			"input.send.steer": "Steer message",
			"input.accessMode": "Access mode, current: {name}",
			"attachment.pending": "Pending attachments",
			"attachment.scrollLeft": "Scroll attachments left",
			"attachment.scrollRight": "Scroll attachments right",
			"attachment.dropTitle": "Drag files or images here to add them",
			"attachment.dropDesc": "Image limit: up to {count} images, {size} each",
			"attachment.dropBlocked": "Files and images cannot be added right now",
			"image.pending": "Pending images",
			"image.openOriginal": "View original",
			"image.openOriginalLabel": "{label}, click to view original",
			"image.remove": "Remove image {name}",
			"image.original": "Original image",
			"image.label": "Image",
			"image.loadFailed": "Image failed to load; click to retry",
			"image.loading": "Loading image…",
			"image.preview": "Original image preview",
			"image.closePreview": "Close original image preview",
			"image.unsupportedType": "Only PNG, JPG, WebP, and GIF images are supported",
			"image.tooMany": "A message can include up to {count} images",
			"image.fileTooLarge": "Each image must be smaller than {size}",
			"image.totalTooLarge": "Images exceed {size} in total; remove some and try again",
			"image.tooManyPixels": "Image resolution is too high; compress it and try again",
			"image.dimensionTooLarge": "Image sides must be at most {size}px; downscale it and try again",
			"image.modelUnsupported": "The current model does not support images; switch to a model that does",
			"image.sendFailed": "Sending images failed ({reason}); re-add them and try again",
			"file.attach": "Add attachment",
			"file.pending": "Pending files",
			"file.remove": "Remove file {name}",
			"file.uploading": "Uploading…",
			"file.uploadFailed": "Upload failed; click to retry",
			"file.retry": "Retry uploading {name}",
			"file.stillUploading": "Files are still uploading; send after they finish",
			"file.sessionUnavailable": "Session unavailable; files cannot be uploaded",
			"file.notStaged": "The file has not finished uploading; re-add it and try again",
			"file.label": "File",
			"context.aria": "{percent} of context used",
			"context.used": "of context used",
			"context.system": "System prompt",
			"context.tools": "Tool definitions",
			"context.messages": "Messages",
			"settings.enter.title": "Send behavior while busy",
			"settings.enter.description": "What Enter and the Send button do while the agent is running; Cmd/Ctrl+Enter uses the other behavior",
			"settings.enter.queue": "Queue",
			"settings.enter.steer": "Steer",
			"access.preset.readOnly": "Read Only",
			"access.preset.workspaceWrite": "Workspace Write",
			"access.preset.fullAccess": "Full access",
			"access.confirm.title": "Enable Full access?",
			"access.confirm.description": "Full access reduces confirmation steps and lets the agent perform more actions directly, including sensitive operations, file changes, or external commands. Only use it when you trust the current task.",
			"access.confirm.acknowledge": "I understand the risks and want to continue",
			"access.confirm.cancel": "Cancel",
			"access.confirm.enable": "Enable Full access",
			"hero.headline": "Into the Unknown",
			"hero.preview": "Preview",
			"hero.chooseWorkspace": "Choose workspace",
			"session.hierarchy": "Session hierarchy",
			"todo.title": "To-dos",
			"todo.progress.done": "{done} completed",
			"todo.progress.active": "{active} in progress",
			"todo.progress.pending": "{pending} pending",
			"todo.rowTitle": "Update to-do list",
			"todo.completed": "{done}/{total} completed",
			"command.attachmentsUnsupported": "/{command} does not accept attachments; remove them first",
			"ask.rowTitle": "Ask question",
			"ask.waiting": "waiting",
			"ask.cancelled": "cancelled",
			"ask.cancelledDetail": "This question set was cancelled before answers were submitted.",
			"ask.interrupted": "interrupted",
			"ask.interruptedDetail": "This question set was interrupted before answers were submitted.",
			"ask.answered": "{answered}/{total} answered",
			"ask.skipped": "Not answered",
			"bash.running": "Running",
			"bash.failed": "Failed",
			"bash.stopped": "Stopped",
			"row.running": "Running",
			"row.failed": "Failed",
			"row.stopped": "Stopped",
			"row.input": "IN",
			"row.output": "OUT",
			"row.inspect": "Inspect",
			"tool.title.search": "Search",
			"tool.title.read": "Read",
			"tool.title.bash": "Bash",
			"tool.title.write": "Write",
			"tool.title.edit": "Edit",
			"tool.title.code": "Code",
			"tool.title.generic": "Tool call",
			"tool.title.inspect": "Inspect",
			"tool.title.runCordis": "Run Cordis Plugin",
			"tool.title.stopCordis": "Stop Cordis Plugin",
			"tool.title.removeCordis": "Remove Cordis Plugin",
			"tool.title.pwsh": "Pwsh",
			"tool.title.readImage": "Read image",
			"tool.title.grep": "Grep",
			"tool.title.glob": "Glob",
			"tool.title.webSearch": "Search",
			"tool.title.webFetch": "Fetch",
			"diff.files.one": "{count} file",
			"diff.files.other": "{count} files",
			"diff.collapseAria": "Collapse diff",
			"diff.expandAria": "Expand {count} more diff lines",
			"diff.expandRest": "… {count} more lines",
			"read.window": "Showing {shown} of {total} lines",
			"read.collapseAria": "Collapse content",
			"read.expandAria": "Expand {count} more lines",
			"read.expandRest": "… {count} more lines",
			"search.paths": "{shown} paths",
			"search.paths.truncated": "Showing {shown} of {total} paths",
			"search.matches": "{shown} matches · {files} files",
			"search.matches.truncated": "Showing {shown} of {total} matches · {files} files",
			"search.noResults": "No results",
			"search.collapseAria": "Collapse results",
			"search.expandAria": "Expand {count} more result lines",
			"search.expandRest": "… {count} more lines",
			"web.noResults": "No results found",
			"web.sourcesTruncated": "Source list truncated",
			"web.http": "HTTP",
			"web.contentTruncated": "Content truncated",
			"details.running": "Running…",
			"queue.count": "{n} queued messages",
			"queue.sending": "Sending…",
			"queue.image": "Queued message image",
			"queue.file": "Queued file {name}",
			"queue.edit": "Edit queued message",
			"queue.edit.unsupported": "Contains non-text content; editing is not supported yet",
			"queue.save": "Save queued message",
			"queue.cancelEdit": "Cancel editing",
			"queue.remove": "Remove queued message",
			"queue.steer": "Steer queued message",
			"queue.steer.unavailable": "Steering is available only while the agent is running",
			"queue.editFailed": "Edit failed: this message may have already started sending.",
			"queue.removeFailed": "Removal failed: this message may have already started sending.",
			"queue.steerFailed": "Steering failed. Try again.",
			"terminal.signal": "signal {signal}",
			"terminal.exitCode": "exit code {code}",
			"terminal.running": "Running",
			"terminal.failed": "Failed",
			"terminal.done": "Done",
			"terminal.noOutput": "No output",
			"terminal.collapseAria": "Collapse output",
			"terminal.expandAria": "Expand the remaining {n} output lines",
			"terminal.expandRest": "… {n} more lines",
			"terminal.sendInput": "(send input)",
			"terminal.session": "Terminal {sessionId}"
		};
		//#endregion
		//#region \0dsh-css:/home/runner/work/deepseek-harness/deepseek-harness/packages/client/ui-conversation/src/client/queue/QueueDock.module.css.mjs
		const css$7 = "._7yHdaG_dock{box-sizing:border-box;width:calc(100% - var(--dsh-composer-side-clearance) - var(--dsh-composer-side-clearance) - var(--dsh-composer-dock-inset) - var(--dsh-composer-dock-inset));max-width:calc(var(--dsh-composer-card-max-width) - var(--dsh-composer-dock-inset) - var(--dsh-composer-dock-inset));margin:0 auto calc(0px - var(--dsh-composer-stack-gap) - 3px);padding:0 var(--dsh-composer-dock-inset);flex:none}._7yHdaG_panel{background:var(--dsw-specific-tip);--dsh-scrollbar-thumb:var(--dsw-alias-scrollbar-bg-l2);--dsh-scrollbar-thumb-hover:var(--dsw-alias-scrollbar-hover-l2);border-radius:12px 12px 0 0;width:100%;padding:2px 0;position:relative;overflow:hidden}._7yHdaG_panel:after{border:.5px solid var(--dsw-alias-border-l1);border-radius:inherit;content:\"\";pointer-events:none;border-bottom:none;position:absolute;inset:0}._7yHdaG_header{box-sizing:border-box;width:100%;height:36px;color:var(--dsw-alias-label-primary);text-align:left;cursor:pointer;background:0 0;border:none;border-radius:8px;align-items:center;gap:10px;padding:4px 12px;display:flex}._7yHdaG_header:focus-visible{outline:2px solid var(--dsw-alias-label-tertiary);outline-offset:-2px}._7yHdaG_header:disabled{cursor:default}._7yHdaG_lead{color:var(--dsw-alias-label-tertiary);flex:none;place-items:center;display:grid}._7yHdaG_count{min-width:0;font-family:Inter, var(--dsw-font-family);flex:auto;font-size:13px;font-weight:500;line-height:24px}._7yHdaG_chevron{width:14px;height:14px;color:var(--dsw-alias-label-tertiary);flex:none;place-items:center;display:grid}._7yHdaG_list{max-height:180px;margin:0;padding:0;list-style:none;overflow-y:auto}._7yHdaG_row{box-sizing:border-box;border-radius:8px;align-items:center;gap:10px;width:100%;height:36px;padding:4px 5px 4px 12px;display:flex}._7yHdaG_row+._7yHdaG_row{box-shadow:inset 0 1px 0 var(--dsw-alias-border-l1)}._7yHdaG_attachments{flex:none;gap:4px;min-width:0;max-width:55%;display:flex;overflow:hidden}._7yHdaG_pendingRow ._7yHdaG_attachments{flex-shrink:1}._7yHdaG_file{border:.5px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-base);box-sizing:border-box;border-radius:6px;flex:0 180px;align-items:center;gap:4px;min-width:74px;height:24px;padding:0 6px;display:inline-flex;overflow:hidden}._7yHdaG_fileIcon{flex:none;width:16px;height:16px;display:inline-flex}._7yHdaG_fileName{min-width:0;color:var(--dsw-alias-label-primary-dimmed);font:var(--dsw-font-xs-13);text-overflow:ellipsis;white-space:nowrap;overflow:hidden}._7yHdaG_fileSize{color:var(--dsw-alias-label-tertiary);white-space:nowrap;flex:none;font-size:10px}._7yHdaG_thumb{border:.5px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-base);object-fit:cover;border-radius:4px;width:24px;height:24px}._7yHdaG_preview,._7yHdaG_editor{min-width:0;font:var(--dsw-font-xs-13);font-family:Inter, var(--dsw-font-family);flex:auto}._7yHdaG_preview{color:var(--dsw-alias-label-primary-dimmed);text-overflow:ellipsis;white-space:nowrap;word-break:break-word;overflow:hidden}._7yHdaG_editor{box-sizing:border-box;border:.5px solid var(--dsw-alias-border-l4);background:var(--dsw-alias-bg-base);height:28px;color:var(--dsw-alias-label-primary);border-radius:6px;outline:none;padding:0 8px}._7yHdaG_editor:focus{border-color:var(--dsw-alias-state-business-primary)}._7yHdaG_actions{flex:none;align-items:center;gap:10px;display:flex}._7yHdaG_status{color:var(--dsw-alias-label-tertiary);font:var(--dsw-font-xs-13);white-space:nowrap;flex:none}._7yHdaG_action{corner-shape:round;width:28px;height:28px;color:var(--dsw-alias-label-tertiary);cursor:pointer;background:0 0;border:none;border-radius:999px;flex:none;place-items:center;padding:0;display:grid}._7yHdaG_action:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover)}._7yHdaG_action:focus-visible{outline:2px solid var(--dsw-alias-label-tertiary);outline-offset:-2px}._7yHdaG_action:disabled{cursor:default;opacity:.45}";
		const tagId$7 = "@deepseek-ai/dsh-client-ui-conversation/QueueDock.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$7) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@deepseek-ai/dsh-client-ui-conversation";
			tag.dataset.pluginCss = tagId$7;
			tag.textContent = css$7;
			document.head.appendChild(tag);
		}
		var QueueDock_module_css_default = {
			"action": "_7yHdaG_action",
			"actions": "_7yHdaG_actions",
			"attachments": "_7yHdaG_attachments",
			"chevron": "_7yHdaG_chevron",
			"count": "_7yHdaG_count",
			"dock": "_7yHdaG_dock",
			"editor": "_7yHdaG_editor",
			"file": "_7yHdaG_file",
			"fileIcon": "_7yHdaG_fileIcon",
			"fileName": "_7yHdaG_fileName",
			"fileSize": "_7yHdaG_fileSize",
			"header": "_7yHdaG_header",
			"lead": "_7yHdaG_lead",
			"list": "_7yHdaG_list",
			"panel": "_7yHdaG_panel",
			"pendingRow": "_7yHdaG_pendingRow",
			"preview": "_7yHdaG_preview",
			"row": "_7yHdaG_row",
			"status": "_7yHdaG_status",
			"thumb": "_7yHdaG_thumb"
		};
		//#endregion
		//#region lib/types/client/queue/QueueDock.js
		/**
		* Durable references carried by one queued row. Queue frames are wire data
		* despite their typed face, so an image block without a reference is skipped
		* rather than trusted.
		* @param content - the row's wire content blocks.
		* @returns the row's durable image references in block order.
		*/
		function queueAttachments(content) {
			const attachments = [];
			for (const block of content) {
				if (block.type === "image") {
					const { attachment } = block;
					if (attachment !== void 0) attachments.push({
						type: "image",
						attachment
					});
				}
				if (block.type === "file") {
					const { attachment } = block;
					if (attachment !== void 0) attachments.push({
						type: "file",
						attachment
					});
				}
			}
			return attachments;
		}
		/** Compact file identity used beside queue thumbnails. */
		function QueueFile({ attachment, label }) {
			return (0, react_jsx_runtime.jsxs)("span", {
				className: QueueDock_module_css_default.file,
				"aria-label": label,
				title: attachment.name,
				children: [
					(0, react_jsx_runtime.jsx)("span", {
						className: QueueDock_module_css_default.fileIcon,
						"aria-hidden": true,
						children: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.FileTypeIcon, {
							path: attachment.name,
							size: 16
						})
					}),
					(0, react_jsx_runtime.jsx)("span", {
						className: QueueDock_module_css_default.fileName,
						children: attachment.name
					}),
					(0, react_jsx_runtime.jsx)("span", {
						className: QueueDock_module_css_default.fileSize,
						children: (0, _deepseek_ai_dsh_client_ui_primitives.fileSizeText)(attachment.bytes)
					})
				]
			});
		}
		/** One durable queued image as a fixed-size thumbnail; a load failure keeps the empty placeholder. */
		function QueueThumb({ attachment, loadImage, label }) {
			const [url, setUrl] = (0, react.useState)(null);
			(0, react.useEffect)(() => {
				let alive = true;
				loadImage(attachment).then((resolved) => {
					if (alive) setUrl(resolved);
				}, () => {});
				return () => {
					alive = false;
				};
			}, [attachment, loadImage]);
			return url === null ? (0, react_jsx_runtime.jsx)("span", {
				className: QueueDock_module_css_default.thumb,
				"aria-hidden": true
			}) : (0, react_jsx_runtime.jsx)("img", {
				className: QueueDock_module_css_default.thumb,
				src: url,
				alt: label
			});
		}
		/**
		* Queue strip: one item renders directly; multiple items default to a
		* collapsible count header; an empty queue renders nothing. Local submissions
		* show sending status and disabled actions until their Host queue rows arrive.
		*/
		function QueueDock({ useSession, updateQueue, notify, loadImage, t }) {
			const inbox = useSession((s) => s.queue);
			const queue = (0, react.useMemo)(() => inbox.filter((row) => row.placement === "queued"), [inbox]);
			const pendingSubmissions = useSession((s) => s.pendingSubmissions);
			const pendingQueue = (0, react.useMemo)(() => {
				const admitted = new Set(queue.flatMap((row) => row.rpcId === void 0 ? [] : [row.rpcId]));
				return pendingSubmissions.filter((submission) => submission.placement === "queued" && !admitted.has(submission.requestId));
			}, [pendingSubmissions, queue]);
			const rowCount = queue.length + pendingQueue.length;
			const running = useSession((s) => s.running);
			const queueMutable = useSession((s) => s.subagent === null || s.subagent.address.mode === "continuable");
			const [editing, setEditing] = (0, react.useState)(null);
			const [busy, setBusy] = (0, react.useState)(null);
			const [collapsed, setCollapsed] = (0, react.useState)(true);
			const listId = (0, react.useId)();
			(0, react.useEffect)(() => {
				if (rowCount === 0 && !collapsed) setCollapsed(true);
				if (editing !== null && (!queueMutable || !queue.some((row) => row.id === editing.id))) setEditing(null);
			}, [
				collapsed,
				editing,
				queue,
				queueMutable,
				rowCount
			]);
			if (rowCount === 0) return null;
			const interactionActive = queueMutable && (editing !== null || busy !== null);
			const expanded = !collapsed || interactionActive;
			const listVisible = rowCount === 1 || expanded;
			const applyAction = async (itemId, action, failure) => {
				setBusy(itemId);
				try {
					await updateQueue(itemId, action);
					return true;
				} catch {
					notify("error", failure);
					return false;
				} finally {
					setBusy((current) => current === itemId ? null : current);
				}
			};
			const saveEdit = async () => {
				if (editing === null || editing.text.trim() === "") return;
				if (await applyAction(editing.id, {
					kind: "edit",
					content: [{
						type: "text",
						text: editing.text
					}]
				}, t("queue.editFailed"))) setEditing(null);
			};
			return (0, react_jsx_runtime.jsx)("div", {
				className: QueueDock_module_css_default.dock,
				"data-queue-dock": "",
				children: (0, react_jsx_runtime.jsxs)("div", {
					className: QueueDock_module_css_default.panel,
					children: [rowCount > 1 && (0, react_jsx_runtime.jsxs)("button", {
						type: "button",
						className: QueueDock_module_css_default.header,
						"aria-controls": listId,
						"aria-expanded": expanded,
						disabled: interactionActive,
						onClick: () => {
							setCollapsed((value) => !value);
						},
						children: [
							(0, react_jsx_runtime.jsx)("span", {
								className: QueueDock_module_css_default.lead,
								"aria-hidden": true,
								children: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconQueueOutline14, {})
							}),
							(0, react_jsx_runtime.jsx)("span", {
								className: QueueDock_module_css_default.count,
								children: t("queue.count", { n: rowCount })
							}),
							!listVisible && pendingQueue.length > 0 && (0, react_jsx_runtime.jsx)("span", {
								className: QueueDock_module_css_default.status,
								role: "status",
								children: t("queue.sending")
							}),
							(0, react_jsx_runtime.jsx)("span", {
								className: QueueDock_module_css_default.chevron,
								"aria-hidden": true,
								children: expanded ? (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronDownOutline14, {}) : (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronUpOutline14, {})
							})
						]
					}), (0, react_jsx_runtime.jsxs)("ul", {
						id: listId,
						className: QueueDock_module_css_default.list,
						hidden: !listVisible,
						children: [listVisible && queue.map((row) => {
							const attachments = queueAttachments(row.content);
							return (0, react_jsx_runtime.jsxs)("li", {
								className: QueueDock_module_css_default.row,
								children: [
									rowCount === 1 && (0, react_jsx_runtime.jsx)("span", {
										className: QueueDock_module_css_default.lead,
										"aria-hidden": true,
										children: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconQueueOutline14, {})
									}),
									editing?.id === row.id ? (0, react_jsx_runtime.jsx)("input", {
										autoFocus: true,
										className: QueueDock_module_css_default.editor,
										"aria-label": t("queue.edit"),
										value: editing.text,
										onChange: (event) => {
											setEditing({
												id: row.id,
												text: event.currentTarget.value
											});
										},
										onKeyDown: (event) => {
											if (event.key === "Escape") {
												setEditing(null);
												return;
											}
											if (event.key === "Enter" && !event.nativeEvent.isComposing) {
												event.preventDefault();
												saveEdit();
											}
										}
									}) : (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [attachments.length > 0 && (0, react_jsx_runtime.jsx)("span", {
										className: QueueDock_module_css_default.attachments,
										children: attachments.map((item, index) => item.type === "image" ? (0, react_jsx_runtime.jsx)(QueueThumb, {
											attachment: item.attachment,
											loadImage,
											label: t("queue.image")
										}, `${item.attachment.attachmentId}:${index}`) : (0, react_jsx_runtime.jsx)(QueueFile, {
											attachment: item.attachment,
											label: t("queue.file", { name: item.attachment.name })
										}, `${item.attachment.attachmentId}:${item.attachment.name}:${index}`))
									}), (0, react_jsx_runtime.jsx)("span", {
										className: QueueDock_module_css_default.preview,
										children: (0, _deepseek_ai_dsh_client_ui_primitives.projectUserText)(row.preview, [])
									})] }),
									queueMutable && (0, react_jsx_runtime.jsx)("div", {
										className: QueueDock_module_css_default.actions,
										children: editing?.id === row.id ? (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Tooltip, {
											label: t("queue.save"),
											side: "bottom",
											delayMs: 500,
											children: (0, react_jsx_runtime.jsx)("button", {
												type: "button",
												className: QueueDock_module_css_default.action,
												"aria-label": t("queue.save"),
												disabled: busy !== null || editing.text.trim() === "",
												onClick: () => {
													saveEdit();
												},
												children: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconCheckOutline16, { size: 14 })
											})
										}), (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Tooltip, {
											label: t("queue.cancelEdit"),
											side: "bottom",
											delayMs: 500,
											children: (0, react_jsx_runtime.jsx)("button", {
												type: "button",
												className: QueueDock_module_css_default.action,
												"aria-label": t("queue.cancelEdit"),
												disabled: busy !== null,
												onClick: () => {
													setEditing(null);
												},
												children: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconCloseOutline16, { size: 14 })
											})
										})] }) : (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
											(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Tooltip, {
												label: t("queue.edit"),
												side: "bottom",
												delayMs: 500,
												disabled: row.text === null,
												children: (0, react_jsx_runtime.jsx)("button", {
													type: "button",
													className: QueueDock_module_css_default.action,
													"aria-label": t("queue.edit"),
													title: row.text === null ? t("queue.edit.unsupported") : void 0,
													disabled: busy !== null || row.text === null,
													onClick: () => {
														if (row.text !== null) setEditing({
															id: row.id,
															text: row.text
														});
													},
													children: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconEditOutline16, { size: 14 })
												})
											}),
											(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Tooltip, {
												label: t("queue.remove"),
												side: "bottom",
												delayMs: 500,
												children: (0, react_jsx_runtime.jsx)("button", {
													type: "button",
													className: QueueDock_module_css_default.action,
													"aria-label": t("queue.remove"),
													disabled: busy !== null,
													onClick: () => {
														applyAction(row.id, { kind: "remove" }, t("queue.removeFailed"));
													},
													children: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconTrashOutline16, { size: 14 })
												})
											}),
											(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Tooltip, {
												label: t("queue.steer"),
												side: "bottom",
												delayMs: 500,
												disabled: !running,
												children: (0, react_jsx_runtime.jsx)("button", {
													type: "button",
													className: QueueDock_module_css_default.action,
													"aria-label": t("queue.steer"),
													title: running ? void 0 : t("queue.steer.unavailable"),
													disabled: busy !== null || !running,
													onClick: () => {
														applyAction(row.id, { kind: "steer" }, t("queue.steerFailed"));
													},
													children: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconSendOutline14, {})
												})
											})
										] })
									})
								]
							}, row.id);
						}), listVisible && pendingQueue.map((submission) => {
							return (0, react_jsx_runtime.jsxs)("li", {
								className: `${QueueDock_module_css_default.row} ${QueueDock_module_css_default.pendingRow}`,
								"data-submission-echo": "",
								children: [
									rowCount === 1 && (0, react_jsx_runtime.jsx)("span", {
										className: QueueDock_module_css_default.lead,
										"aria-hidden": true,
										children: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconQueueOutline14, {})
									}),
									submission.attachments.length > 0 && (0, react_jsx_runtime.jsx)("span", {
										className: QueueDock_module_css_default.attachments,
										children: submission.attachments.map((attachment, index) => attachment.type === "image" ? (0, react_jsx_runtime.jsx)("img", {
											className: QueueDock_module_css_default.thumb,
											src: attachment.value.previewUrl,
											alt: t("queue.image")
										}, `${attachment.value.previewUrl}:${index}`) : (0, react_jsx_runtime.jsx)(QueueFile, {
											attachment: attachment.value,
											label: t("queue.file", { name: attachment.value.name })
										}, `${attachment.value.attachmentId}:${attachment.value.name}:${index}`))
									}),
									(0, react_jsx_runtime.jsx)("span", {
										className: QueueDock_module_css_default.preview,
										children: (0, _deepseek_ai_dsh_client_ui_primitives.projectUserText)(submission.text, [])
									}),
									(0, react_jsx_runtime.jsx)("span", {
										className: QueueDock_module_css_default.status,
										role: "status",
										children: t("queue.sending")
									}),
									queueMutable && (0, react_jsx_runtime.jsxs)("div", {
										className: QueueDock_module_css_default.actions,
										children: [
											(0, react_jsx_runtime.jsx)("button", {
												type: "button",
												className: QueueDock_module_css_default.action,
												"aria-label": t("queue.edit"),
												title: t("queue.sending"),
												disabled: true,
												children: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconEditOutline16, { size: 14 })
											}),
											(0, react_jsx_runtime.jsx)("button", {
												type: "button",
												className: QueueDock_module_css_default.action,
												"aria-label": t("queue.remove"),
												title: t("queue.sending"),
												disabled: true,
												children: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconTrashOutline16, { size: 14 })
											}),
											(0, react_jsx_runtime.jsx)("button", {
												type: "button",
												className: QueueDock_module_css_default.action,
												"aria-label": t("queue.steer"),
												title: t("queue.sending"),
												disabled: true,
												children: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconSendOutline14, {})
											})
										]
									})
								]
							}, submission.requestId);
						})]
					})]
				})
			});
		}
		/** Registers queue actions backed by the session-scoped conversation service. */
		const queueDockEntry = {
			name: "conversation-queue-dock",
			inject: [
				"slots",
				"conversation",
				"sessions",
				"uiConversation"
			],
			apply(ctx) {
				ctx.slots.inject("conversation.input.dock", () => ctx.slots.register({
					name: "conversation.input.dock",
					id: "queue",
					order: 20,
					locale: NS,
					inject: (sessionId) => {
						const actx = ctx.sessions.scope(sessionId);
						if (actx === void 0) throw new Error(`queue dock: session "${sessionId}" resolved no scope`);
						const conversation = actx.get("conversation");
						if (conversation === void 0) throw new Error("queue dock: conversation service unavailable");
						return {
							updateQueue: (itemId, action) => conversation.updateQueue(itemId, action),
							notify: (level, text) => {
								conversation.input.for(actx).notify(level, text);
							},
							loadImage: (attachment) => ctx.uiConversation.imageUrl(sessionId, attachment)
						};
					}
				}, QueueDock));
			}
		};
		//#endregion
		//#region \0dsh-css:/home/runner/work/deepseek-harness/deepseek-harness/packages/client/ui-conversation/src/client/settings/EnterBehaviorRow.module.css.mjs
		const css$6 = ".T1PP_q_row{border-bottom:.5px solid var(--dsw-alias-border-l2);align-items:center;gap:8px;padding:16px 0;display:flex}.T1PP_q_rowText{flex-direction:column;flex:1;gap:4px;min-width:0;padding-right:48px;display:flex}.T1PP_q_title{color:var(--dsw-alias-label-primary);font-size:14px;font-weight:400;line-height:22px}.T1PP_q_desc{color:var(--dsw-alias-label-tertiary);font-size:12px;font-weight:400;line-height:18px}.T1PP_q_selector{background:var(--dsw-alias-bg-module-platform);height:36px;font:inherit;color:var(--dsw-alias-label-primary);cursor:pointer;border:none;border-radius:18px;align-items:center;gap:12px;padding:0 14px;font-size:14px;line-height:22px;display:inline-flex}.T1PP_q_selector:hover{background:var(--dsw-alias-interactive-bg-hover)}.T1PP_q_chevron{flex:none}";
		const tagId$6 = "@deepseek-ai/dsh-client-ui-conversation/EnterBehaviorRow.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$6) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@deepseek-ai/dsh-client-ui-conversation";
			tag.dataset.pluginCss = tagId$6;
			tag.textContent = css$6;
			document.head.appendChild(tag);
		}
		var EnterBehaviorRow_module_css_default = {
			"chevron": "T1PP_q_chevron",
			"desc": "T1PP_q_desc",
			"row": "T1PP_q_row",
			"rowText": "T1PP_q_rowText",
			"selector": "T1PP_q_selector",
			"title": "T1PP_q_title"
		};
		//#endregion
		//#region lib/types/client/settings/EnterBehaviorRow.js
		/** General Settings row for the Composer's busy-state Enter preference. */
		const OPTIONS = [{
			id: "queue",
			label: "settings.enter.queue"
		}, {
			id: "steer",
			label: "settings.enter.steer"
		}];
		/**
		* Render the busy-state Enter behavior selector.
		* @param props - composed Settings slot props.
		* @returns the preference row.
		*/
		function EnterBehaviorRow({ useBusyEnter, setBusyEnter, t }) {
			const behavior = useBusyEnter((value) => value);
			const [open, setOpen] = (0, react.useState)(false);
			const selectedLabel = behavior === "queue" ? "settings.enter.queue" : "settings.enter.steer";
			return (0, react_jsx_runtime.jsxs)("div", {
				className: EnterBehaviorRow_module_css_default.row,
				children: [(0, react_jsx_runtime.jsxs)("div", {
					className: EnterBehaviorRow_module_css_default.rowText,
					children: [(0, react_jsx_runtime.jsx)("div", {
						className: EnterBehaviorRow_module_css_default.title,
						children: t("settings.enter.title")
					}), (0, react_jsx_runtime.jsx)("div", {
						className: EnterBehaviorRow_module_css_default.desc,
						children: t("settings.enter.description")
					})]
				}), (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Menu, {
					open,
					onClose: () => {
						setOpen(false);
					},
					items: OPTIONS.map((option) => ({
						id: option.id,
						label: t(option.label)
					})),
					selectedId: behavior,
					onSelect: (id) => {
						setOpen(false);
						setBusyEnter(id);
					},
					align: "end",
					portal: true,
					anchor: (0, react_jsx_runtime.jsxs)("button", {
						type: "button",
						className: EnterBehaviorRow_module_css_default.selector,
						"aria-haspopup": "menu",
						"aria-expanded": open,
						onClick: () => {
							setOpen((value) => !value);
						},
						children: [t(selectedLabel), (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronDownOutline14, { className: EnterBehaviorRow_module_css_default.chevron })]
					})
				})]
			});
		}
		//#endregion
		//#region lib/types/client/contract/snapshot.js
		/** Empty Conversation value used before a Session binding is available. */
		const EMPTY_CONVERSATION_SNAPSHOT = {
			views: { get: () => void 0 },
			activeTargets: /* @__PURE__ */ new Set()
		};
		/**
		* Resolve the shell phase without adding Conversation data to the Session snapshot.
		* @param session - current Session lifecycle state.
		* @param conversation - current target-neutral Conversation state.
		* @returns the phase used by the header, View ring, and composer layout.
		*/
		function conversationPhase(session, conversation) {
			return conversation.activeTargets.size > 0 || !session.blank && !session.awaitingFirstTurn || session.running ? "active" : session.promptAttempted ? "engaging" : "blank";
		}
		//#endregion
		//#region ../../util/workspace-path/src/index.ts
		/**
		* Read the final non-empty segment of a Workspace path for display.
		* Workspace-label surfaces use this helper instead of deriving another basename.
		* @param path - Workspace directory path using POSIX or Windows separators.
		* @returns the final segment, or an empty string for a separator-only path.
		*/
		function workspaceTitleOf(path) {
			const trimmed = path.replace(/[/\\]+$/, "");
			const separator = Math.max(trimmed.lastIndexOf("/"), trimmed.lastIndexOf("\\"));
			return trimmed.slice(separator + 1);
		}
		//#endregion
		//#region \0dsh-css:/home/runner/work/deepseek-harness/deepseek-harness/packages/client/ui-conversation/src/client/skeleton/HeroShell.module.css.mjs
		const css$5 = ".pXSMma_root{justify-content:center;align-items:center;min-width:0;height:100%;padding:0 24px;display:flex}.pXSMma_stack{width:100%;max-width:var(--dsh-composer-card-max-width);flex-direction:column;align-items:stretch;gap:12px;display:flex;overflow:visible}.pXSMma_headline{color:var(--dsw-alias-label-primary);flex-wrap:wrap;justify-content:center;align-items:center;gap:12px 10px;font-size:26px;font-weight:500;line-height:32px;display:flex}.pXSMma_titleGroup{flex-wrap:wrap;justify-content:center;align-items:center;gap:4px 7px;min-width:0;display:flex}.pXSMma_previewBadge{border:.5px solid var(--dsw-alias-interactive-bg-hover);background:var(--dsw-alias-state-business-tertiary);color:var(--dsw-alias-label-primary-bluish);font-family:var(--ds-font-family-code);white-space:nowrap;border-radius:24px;align-self:flex-start;margin-top:2px;padding:1px 7px 0;font-size:12px;font-weight:500;line-height:18px}.pXSMma_fishHitbox{flex:none;justify-content:center;align-items:center;display:inline-flex}.pXSMma_fish{transform-origin:50% 60%;color:var(--dsw-alias-label-primary);display:block;overflow:visible}@keyframes pXSMma_hero-fish-swim{0%,to{transform:none}35%{transform:rotate(-4deg)translate(-.4px,-.9px)}70%{transform:rotate(1.6deg)translate(.3px,.2px)}}@media (hover:hover) and (prefers-reduced-motion:no-preference){.pXSMma_fishHitbox:hover .pXSMma_fish{animation:1.6s ease-in-out infinite pXSMma_hero-fish-swim}}.pXSMma_body{flex-direction:column;gap:12px;min-width:0;display:flex;position:relative;overflow:visible}.pXSMma_body>*{z-index:1;position:relative}.pXSMma_body>.pXSMma_workspaceRow{z-index:10;align-items:center;min-width:0;padding-left:8px;display:flex}.pXSMma_workspace{max-width:min(100%,360px);min-height:28px;color:var(--dsw-alias-label-primary);cursor:pointer;background:0 0;border:none;border-radius:16px;align-items:center;gap:4px;padding:0 8px;font-size:13px;font-weight:500;line-height:20px;display:inline-flex}.pXSMma_workspace:not(:disabled):hover,.pXSMma_workspace[aria-expanded=true]{background:var(--dsw-alias-interactive-bg-hover)}.pXSMma_workspace:disabled{cursor:default}.pXSMma_folder{color:var(--dsw-alias-label-primary);flex:none}.pXSMma_workspaceLabel{text-overflow:ellipsis;white-space:nowrap;min-width:0;overflow:hidden}.pXSMma_chevron{color:var(--dsw-alias-label-caption);flex:none}.pXSMma_modalInput{box-sizing:border-box;border:.5px solid var(--dsw-alias-border-l4);width:100%;height:44px;color:var(--dsw-alias-label-primary);background:0 0;border-radius:22px;outline:none;padding:7px 14px;font-size:14px;font-weight:400;line-height:22px}.pXSMma_modalInput::placeholder{color:var(--dsw-alias-label-caption)}.pXSMma_modalInput:disabled{color:var(--dsw-alias-label-dimmed)}.pXSMma_modalAction{min-width:72px}.pXSMma_modalError{color:var(--dsw-alias-state-error-primary);margin-top:8px;font-size:12px;line-height:18px}";
		const tagId$5 = "@deepseek-ai/dsh-client-ui-conversation/HeroShell.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$5) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@deepseek-ai/dsh-client-ui-conversation";
			tag.dataset.pluginCss = tagId$5;
			tag.textContent = css$5;
			document.head.appendChild(tag);
		}
		var HeroShell_module_css_default = {
			"body": "pXSMma_body",
			"chevron": "pXSMma_chevron",
			"fish": "pXSMma_fish",
			"fishHitbox": "pXSMma_fishHitbox",
			"folder": "pXSMma_folder",
			"headline": "pXSMma_headline",
			"hero-fish-swim": "pXSMma_hero-fish-swim",
			"modalAction": "pXSMma_modalAction",
			"modalError": "pXSMma_modalError",
			"modalInput": "pXSMma_modalInput",
			"previewBadge": "pXSMma_previewBadge",
			"root": "pXSMma_root",
			"stack": "pXSMma_stack",
			"titleGroup": "pXSMma_titleGroup",
			"workspace": "pXSMma_workspace",
			"workspaceLabel": "pXSMma_workspaceLabel",
			"workspaceRow": "pXSMma_workspaceRow"
		};
		//#endregion
		//#region lib/types/client/skeleton/EmptyHero.js
		/**
		* Basename label for the workspace chip (the shared derivation);
		* separator-only paths echo the raw cwd.
		* @param cwd - workspace directory path (non-empty).
		* @returns chip label.
		*/
		function workspaceLabel(cwd) {
			const base = workspaceTitleOf(cwd);
			return base !== "" ? base : cwd;
		}
		/**
		* The workspace chip (folder + label + chevron), always interactive: before
		* the first message the workspace stays switchable — picking another one
		* moves the New Session flow to that workspace's blank session. Without a
		* label the chip renders its placeholder state: closed folder + the
		* "Choose workspace" call to action.
		* @param props.label - chip label (see {@link workspaceLabel}); omitted → placeholder.
		* @param props.menuOpen - menu expansion echo.
		* @param props.onClick - menu toggle.
		* @returns the chip button element.
		*/
		function WorkspaceChip({ buttonRef, label, menuOpen = false, onClick, t }) {
			return (0, react_jsx_runtime.jsxs)("button", {
				ref: buttonRef,
				type: "button",
				className: HeroShell_module_css_default.workspace,
				"aria-label": t("hero.chooseWorkspace"),
				"aria-haspopup": "menu",
				"aria-expanded": menuOpen,
				onClick,
				children: [
					label === void 0 ? (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconFolderClose16, {
						className: HeroShell_module_css_default.folder,
						size: 16
					}) : (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconFolderOpen16, {
						className: HeroShell_module_css_default.folder,
						size: 16
					}),
					(0, react_jsx_runtime.jsx)("span", {
						className: HeroShell_module_css_default.workspaceLabel,
						children: label ?? t("hero.chooseWorkspace")
					}),
					(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronDownOutline14, {
						className: HeroShell_module_css_default.chevron,
						size: 12
					})
				]
			});
		}
		const HERO_SWIM_UP_PATH = "M22.403 0.567C22.145 0.477 22.068 0.718 21.939 0.85C21.895 0.893 21.86 0.947 21.824 0.997C21.515 1.421 21.13 1.721 20.591 1.77C19.829 1.867 19.221 2.244 18.712 2.958C18.535 2.227 18.116 1.839 17.516 1.626C17.203 1.506 16.887 1.379 16.663 1.064C16.508 0.839 16.462 0.581 16.383 0.329C16.332 0.176 16.283 0.02 16.121 -0.002C15.944 -0.029 15.875 0.133 15.805 0.269C15.52 0.822 15.408 1.43 15.42 2.046C15.449 3.432 16.031 4.532 17.202 5.274C17.337 5.356 17.374 5.445 17.335 5.582C17.261 5.862 17.169 6.134 17.086 6.413C17.032 6.59 16.952 6.63 16.764 6.558C16.118 6.301 15.562 5.909 15.074 5.433C14.248 4.633 13.5 3.751 12.568 3.06C12.349 2.898 12.13 2.748 11.903 2.605C10.952 1.682 12.028 0.923 12.277 0.833C12.537 0.739 12.367 0.416 11.526 0.42C10.684 0.424 9.914 0.706 8.933 1.081C8.789 1.138 8.638 1.179 8.484 1.213C7.593 1.044 6.668 1.006 5.702 1.115C3.883 1.318 2.43 2.178 1.362 3.646C0.079 5.41 -0.223 7.415 0.147 9.506C0.535 11.71 1.66 13.535 3.389 14.962C5.181 16.441 7.246 17.166 9.601 17.027C11.032 16.944 12.624 16.753 14.421 15.232C14.874 15.458 15.35 15.548 16.138 15.615C16.746 15.672 17.331 15.585 17.784 15.491C18.493 15.341 18.444 14.684 18.188 14.564C16.108 13.595 16.565 13.989 16.15 13.67C17.206 12.42 18.82 10.198 19.363 7.086C19.421 6.709 19.484 6.171 19.469 5.866C19.458 5.681 19.493 5.604 19.681 5.556C20.199 5.412 20.691 5.172 21.125 4.806C22.366 3.824 22.758 2.554 22.708 1.1C22.7 0.878 22.649 0.654 22.403 0.567ZM11.175 14.451C9.159 12.726 8.182 12.088 7.778 12.067C7.401 12.047 7.469 12.505 7.552 12.807C7.639 13.103 7.752 13.313 7.91 13.581C8.02 13.758 8.095 14.01 7.801 14.16C7.152 14.487 6.023 13.806 5.97 13.772C4.657 12.85 3.559 11.766 2.785 10.369C2.037 9.025 1.603 7.583 1.532 6.044C1.513 5.672 1.622 5.541 1.992 5.473C2.479 5.383 2.981 5.364 3.468 5.436C5.525 5.736 7.276 6.675 8.744 8.323C9.582 9.299 10.216 10.425 10.869 11.496C11.563 12.592 12.31 13.603 13.262 14.414C13.598 14.696 13.866 14.91 14.123 15.068C13.349 15.154 12.058 15.167 11.175 14.452L11.175 14.451ZM12.141 8.26C12.141 8.095 12.273 7.963 12.439 7.963C12.476 7.963 12.511 7.971 12.541 7.982C12.582 7.997 12.62 8.019 12.65 8.053C12.704 8.106 12.733 8.181 12.733 8.26C12.733 8.425 12.601 8.556 12.435 8.556C12.27 8.556 12.141 8.425 12.141 8.26ZM15.142 9.799C14.949 9.878 14.757 9.945 14.572 9.953C14.284 9.968 13.972 9.851 13.802 9.709C13.537 9.487 13.348 9.363 13.27 8.977C13.236 8.812 13.255 8.556 13.284 8.41C13.352 8.094 13.277 7.892 13.055 7.708C12.873 7.558 12.643 7.516 12.39 7.516C12.296 7.516 12.209 7.475 12.145 7.441C12.039 7.389 11.952 7.257 12.035 7.096C12.062 7.043 12.19 6.916 12.22 6.893C12.563 6.698 12.96 6.762 13.326 6.908C13.665 7.047 13.922 7.302 14.292 7.663C14.669 8.098 14.738 8.218 14.953 8.545C15.123 8.801 15.277 9.063 15.383 9.364C15.447 9.551 15.364 9.705 15.142 9.799Z";
		const HERO_SWIM_DOWN_PATH = "M23.271 2.216C23.039 2.071 22.91 2.287 22.755 2.388C22.703 2.42 22.656 2.464 22.61 2.505C22.214 2.848 21.771 3.054 21.225 2.956C20.412 2.784 19.68 2.919 19.005 3.435C18.92 2.663 18.493 2.157 17.808 1.798C17.446 1.621 17.08 1.449 16.83 1.111C16.656 0.872 16.611 0.612 16.524 0.354C16.469 0.198 16.414 0.039 16.223 0.009C16.017 -0.024 15.936 0.137 15.856 0.271C15.539 0.822 15.418 1.43 15.429 2.046C15.454 3.432 16.041 4.538 17.196 5.36C17.325 5.456 17.356 5.547 17.312 5.674C17.229 5.936 17.134 6.191 17.051 6.454C16.999 6.623 16.921 6.659 16.738 6.58C16.107 6.306 15.56 5.909 15.074 5.433C14.248 4.633 13.5 3.751 12.568 3.06C12.349 2.898 12.13 2.748 11.903 2.605C10.952 1.682 12.028 0.923 12.277 0.833C12.537 0.739 12.367 0.416 11.526 0.42C10.684 0.424 9.914 0.706 8.933 1.081C8.789 1.138 8.638 1.179 8.484 1.213C7.593 1.044 6.668 1.006 5.702 1.115C3.883 1.318 2.43 2.178 1.362 3.646C0.079 5.41 -0.223 7.415 0.147 9.506C0.535 11.71 1.66 13.535 3.389 14.962C5.181 16.441 7.246 17.166 9.601 17.027C11.032 16.944 12.624 16.753 14.421 15.232C14.874 15.458 15.35 15.548 16.138 15.615C16.746 15.672 17.331 15.585 17.784 15.491C18.493 15.341 18.444 14.684 18.188 14.564C16.108 13.595 16.565 13.989 16.15 13.67C17.206 12.42 18.82 10.198 19.278 7.246C19.318 6.948 19.375 6.534 19.371 6.293C19.371 6.145 19.411 6.092 19.597 6.098C20.113 6.109 20.619 6.051 21.096 5.891C22.503 5.375 23.169 4.232 23.448 2.804C23.49 2.586 23.491 2.356 23.271 2.216ZM11.175 14.49C9.159 13.005 8.182 12.567 7.778 12.621C7.401 12.673 7.469 13.087 7.552 13.354C7.639 13.619 7.752 13.797 7.91 14.024C8.02 14.175 8.095 14.406 7.801 14.609C7.152 15.063 6.023 14.63 5.97 14.609C4.657 13.941 3.559 12.965 2.785 11.569C2.037 10.225 1.603 8.783 1.532 7.244C1.513 6.872 1.622 6.741 1.992 6.673C2.479 6.583 2.981 6.564 3.468 6.636C5.525 6.936 7.276 7.843 8.744 9.163C9.582 9.888 10.216 10.783 10.869 11.679C11.563 12.659 12.31 13.617 13.262 14.415C13.598 14.696 13.866 14.91 14.123 15.068C13.349 15.155 12.058 15.177 11.175 14.491L11.175 14.49ZM12.141 8.26C12.141 8.095 12.273 7.963 12.439 7.963C12.476 7.963 12.511 7.971 12.541 7.982C12.582 7.997 12.62 8.019 12.65 8.053C12.704 8.106 12.733 8.181 12.733 8.26C12.733 8.425 12.601 8.556 12.435 8.556C12.27 8.556 12.141 8.425 12.141 8.26ZM15.142 9.799C14.949 9.878 14.757 9.945 14.572 9.953C14.284 9.968 13.972 9.851 13.802 9.709C13.537 9.487 13.348 9.363 13.27 8.977C13.236 8.812 13.255 8.556 13.284 8.41C13.352 8.094 13.277 7.892 13.055 7.708C12.873 7.558 12.643 7.516 12.39 7.516C12.296 7.516 12.209 7.475 12.145 7.441C12.039 7.389 11.952 7.257 12.035 7.096C12.062 7.043 12.19 6.916 12.22 6.893C12.563 6.698 12.96 6.762 13.326 6.908C13.665 7.047 13.922 7.302 14.292 7.663C14.669 8.098 14.738 8.218 14.953 8.545C15.123 8.801 15.277 9.063 15.383 9.364C15.447 9.551 15.364 9.705 15.142 9.799Z";
		/**
		* The hero fish (34px wide), static at rest. Hovering swims the whale in
		* place: a gentle head-up sway (CSS, on the hitbox hover) while the body
		* itself morphs — SMIL interpolates `d` through the tail-up and tail-down
		* targets on the same 1.6s period, so the tail wags and the fin flutters in
		* real curve deformation. Decorative — hidden from the accessibility tree;
		* reduced motion keeps the static filled logo on hover (sampled at
		* mouseenter; a mid-hover preference change takes effect on the next enter).
		* @param props.hovering - driven by the hitbox parent's pointer state.
		* @returns the fish svg element.
		*/
		function HeroFish({ hovering }) {
			return (0, react_jsx_runtime.jsx)("svg", {
				className: HeroShell_module_css_default.fish,
				width: 34,
				height: 34 * _deepseek_ai_dsh_client_ui_primitives.FISH_LOGO_VIEWBOX.height / _deepseek_ai_dsh_client_ui_primitives.FISH_LOGO_VIEWBOX.width,
				viewBox: `0 0 ${_deepseek_ai_dsh_client_ui_primitives.FISH_LOGO_VIEWBOX.width} ${_deepseek_ai_dsh_client_ui_primitives.FISH_LOGO_VIEWBOX.height}`,
				fill: "none",
				"aria-hidden": "true",
				children: (0, react_jsx_runtime.jsx)("path", {
					d: _deepseek_ai_dsh_client_ui_primitives.FISH_LOGO_PATH,
					fill: "currentColor",
					children: hovering && (0, react_jsx_runtime.jsx)("animate", {
						attributeName: "d",
						values: `${_deepseek_ai_dsh_client_ui_primitives.FISH_LOGO_PATH};${HERO_SWIM_UP_PATH};${_deepseek_ai_dsh_client_ui_primitives.FISH_LOGO_PATH};${HERO_SWIM_DOWN_PATH};${_deepseek_ai_dsh_client_ui_primitives.FISH_LOGO_PATH}`,
						keyTimes: "0;0.35;0.55;0.75;1",
						calcMode: "spline",
						keySplines: "0.45 0 0.55 1;0.45 0 0.55 1;0.45 0 0.55 1;0.45 0 0.55 1",
						dur: "1.6s",
						repeatCount: "indefinite"
					})
				})
			});
		}
		/**
		* Render the hero chrome (headline only; no composer, no workspace row).
		* @param props - see {@link HeroShellProps}.
		* @returns the centered hero element tree.
		*/
		function HeroShell({ t, renderSlot, children }) {
			const [hovering, setHovering] = (0, react.useState)(false);
			return (0, react_jsx_runtime.jsxs)("div", {
				className: HeroShell_module_css_default.root,
				children: [(0, react_jsx_runtime.jsxs)("div", {
					className: HeroShell_module_css_default.stack,
					children: [(0, react_jsx_runtime.jsxs)("div", {
						className: HeroShell_module_css_default.headline,
						children: [(0, react_jsx_runtime.jsx)("span", {
							className: HeroShell_module_css_default.fishHitbox,
							onMouseEnter: () => {
								if (window.matchMedia("(hover: hover) and (prefers-reduced-motion: no-preference)").matches) setHovering(true);
							},
							onMouseLeave: () => {
								setHovering(false);
							},
							children: renderSlot("conversation.hero.brand.mark", {
								size: 34,
								className: HeroShell_module_css_default.fish
							}, { fallback: (0, react_jsx_runtime.jsx)(HeroFish, { hovering }) })
						}), (0, react_jsx_runtime.jsxs)("span", {
							className: HeroShell_module_css_default.titleGroup,
							children: [(0, react_jsx_runtime.jsx)("span", { children: t("hero.headline") }), (0, react_jsx_runtime.jsx)("span", {
								className: HeroShell_module_css_default.previewBadge,
								children: t("hero.preview")
							})]
						})]
					}), (0, react_jsx_runtime.jsx)("div", { className: HeroShell_module_css_default.body })]
				}), children]
			});
		}
		//#endregion
		//#region \0dsh-css:/home/runner/work/deepseek-harness/deepseek-harness/packages/client/ui-conversation/src/client/skeleton/ConversationRoot.module.css.mjs
		const css$4 = ".wSkVaW_root{background:var(--dsw-alias-bg-base);--dsh-chat-content-width:var(--dsh-chat-user-width,clamp(680px, calc(var(--dsh-conversation-column-width,0px) * .64), 920px));--dsh-composer-card-max-width:calc(var(--dsh-chat-content-width) + 32px);--dsh-composer-side-clearance:16px;--dsh-composer-dock-inset:8px;flex-direction:column;min-width:0;height:100%;display:flex;position:relative}.wSkVaW_header{box-sizing:border-box;border-bottom:.5px solid var(--dsw-alias-border-l3);flex:none;min-height:76px;padding:10px 28px 0 20px}.wSkVaW_headerHidden{display:none}.wSkVaW_titleRow{align-items:center;gap:0;min-height:30px;display:flex}.wSkVaW_titleCluster{flex:1;align-items:center;gap:10px;min-width:0;display:flex}.wSkVaW_crumbs{white-space:nowrap;align-items:center;gap:4px;min-width:0;display:flex;overflow:hidden}.wSkVaW_crumbSeg{align-items:center;gap:4px;min-width:0;display:inline-flex}.wSkVaW_crumbSep{color:var(--dsw-alias-label-caption);font-size:14px;line-height:20px}.wSkVaW_crumb{max-width:220px;color:var(--dsw-alias-label-tertiary);text-overflow:ellipsis;white-space:nowrap;cursor:pointer;background:0 0;border:none;border-radius:12px;padding:4px 8px;font-size:14px;line-height:20px;overflow:hidden}.wSkVaW_crumbSubagent{font-size:12px;line-height:18px}.wSkVaW_crumb:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover)}.wSkVaW_crumbCurrent{color:var(--dsw-alias-label-primary);cursor:default;font-weight:500}.wSkVaW_headerActions{flex:none;align-items:center;gap:8px;display:flex}.wSkVaW_headerUtilities{flex:none;align-items:center;gap:8px;margin-left:20px;display:flex}.wSkVaW_headerUtilities:empty{display:none}.wSkVaW_headerCorner{flex:none;align-items:center;margin-left:8px;margin-right:-16px;display:flex}.wSkVaW_headerCorner:empty{display:none}.wSkVaW_tabs{z-index:1;gap:36px;margin-top:10px;padding-left:8px;display:flex;position:relative}.wSkVaW_tab{color:var(--dsw-alias-label-tertiary);cursor:pointer;background:0 0;border:none;padding:0 0 9px;font-size:13px;font-weight:500;line-height:16px;position:relative}.wSkVaW_tab:after{content:\"\";background:0 0;border-radius:2px;height:2px;position:absolute;bottom:-1px;left:0;right:0}.wSkVaW_tabActive{color:var(--dsw-alias-state-business-primary)}.wSkVaW_tabActive:after{background:var(--dsw-alias-state-business-primary)}.wSkVaW_viewArea{flex-direction:column;flex:1;min-height:0;display:flex}.wSkVaW_widthHandle{z-index:8;width:min(40px, calc((100% - var(--dsh-chat-content-width)) / 2 - 24px - 24px));cursor:col-resize;position:absolute;top:0;bottom:0}.wSkVaW_widthHandle[data-side=left]{right:calc(50% + var(--dsh-chat-content-width) / 2 + 24px)}.wSkVaW_widthHandle[data-side=right]{left:calc(50% + var(--dsh-chat-content-width) / 2 + 24px)}.wSkVaW_widthHandle:after{content:\"\";background:linear-gradient(to bottom, transparent calc(var(--dsh-width-handle-pointer-y,50%) - 52px), var(--dsw-alias-scrollbar-hover-l1) calc(var(--dsh-width-handle-pointer-y,50%) - 12px), var(--dsw-alias-scrollbar-hover-l1) calc(var(--dsh-width-handle-pointer-y,50%) + 12px), transparent calc(var(--dsh-width-handle-pointer-y,50%) + 52px));opacity:0;pointer-events:none;border-radius:3px;width:3px;position:absolute;top:0;bottom:0}.wSkVaW_widthHandle[data-side=left]:after{right:16px}.wSkVaW_widthHandle[data-side=right]:after{left:16px}.wSkVaW_widthHandle:hover:after,.wSkVaW_widthHandle[data-dragging]:after{opacity:1}.wSkVaW_root:has([data-conversation-composer-overlay]) .wSkVaW_widthHandle{display:none}.wSkVaW_composerStack{--dsh-composer-stack-gap:6px;gap:var(--dsh-composer-stack-gap);flex-direction:column;display:flex}.wSkVaW_composerSeat{--dsh-composer-text-max-height:336px;flex-direction:column;flex:none;display:flex}.wSkVaW_root[data-phase=active]{overflow:hidden}.wSkVaW_root[data-phase=active] .wSkVaW_header{flex:none}.wSkVaW_body{flex-direction:column;flex:1;min-height:0;display:flex;position:relative}.wSkVaW_scrollBody{scrollbar-gutter:stable;flex-direction:column;flex:1;min-height:0;margin-right:2px;display:flex;overflow-y:auto}.wSkVaW_scrollBody::-webkit-scrollbar-track{margin:2px}.wSkVaW_root[data-phase=active] .wSkVaW_viewArea{flex:1 0 auto;min-height:auto}.wSkVaW_root[data-phase=active] .wSkVaW_composerSeat{z-index:7;background:linear-gradient(180deg, color-mix(in srgb, var(--dsw-alias-bg-base) 0%, transparent) 0px, var(--dsw-alias-bg-base) 36px);position:sticky;bottom:0}.wSkVaW_root[data-phase=active] .wSkVaW_composerSeat:has([data-trigger-menu]){z-index:9}.wSkVaW_scrollBody:has([data-conversation-composer-overlay]){scrollbar-gutter:auto;position:relative;overflow:hidden auto}.wSkVaW_scrollBody:has([data-conversation-composer-overlay])>[data-slot=conversation\\.session]>.wSkVaW_viewArea{flex:1 1 0;min-height:0;overflow:hidden}.wSkVaW_scrollBody:has([data-conversation-composer-overlay])>.wSkVaW_composerSeat{right:var(--dsh-scrollbar-width);position:absolute;bottom:0;left:0}.wSkVaW_composerHero{width:min(calc(var(--dsh-composer-card-max-width) + 2 * var(--dsh-composer-side-clearance)), 100%);z-index:1;align-self:center;gap:8px;padding-bottom:32px}.wSkVaW_heroWorkspaceRow{align-items:center;gap:2px;min-width:0;margin-top:4px;padding:0 16px 0 20px;display:flex}.wSkVaW_root[data-phase=hero] .wSkVaW_scrollBody{justify-content:center;overflow-y:auto}.wSkVaW_root[data-phase=settling] .wSkVaW_composerSeat{visibility:hidden}";
		const tagId$4 = "@deepseek-ai/dsh-client-ui-conversation/ConversationRoot.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$4) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@deepseek-ai/dsh-client-ui-conversation";
			tag.dataset.pluginCss = tagId$4;
			tag.textContent = css$4;
			document.head.appendChild(tag);
		}
		var ConversationRoot_module_css_default = {
			"body": "wSkVaW_body",
			"composerHero": "wSkVaW_composerHero",
			"composerSeat": "wSkVaW_composerSeat",
			"composerStack": "wSkVaW_composerStack",
			"crumb": "wSkVaW_crumb",
			"crumbCurrent": "wSkVaW_crumbCurrent",
			"crumbSeg": "wSkVaW_crumbSeg",
			"crumbSep": "wSkVaW_crumbSep",
			"crumbSubagent": "wSkVaW_crumbSubagent",
			"crumbs": "wSkVaW_crumbs",
			"header": "wSkVaW_header",
			"headerActions": "wSkVaW_headerActions",
			"headerCorner": "wSkVaW_headerCorner",
			"headerHidden": "wSkVaW_headerHidden",
			"headerUtilities": "wSkVaW_headerUtilities",
			"heroWorkspaceRow": "wSkVaW_heroWorkspaceRow",
			"root": "wSkVaW_root",
			"scrollBody": "wSkVaW_scrollBody",
			"tab": "wSkVaW_tab",
			"tabActive": "wSkVaW_tabActive",
			"tabs": "wSkVaW_tabs",
			"titleCluster": "wSkVaW_titleCluster",
			"titleRow": "wSkVaW_titleRow",
			"viewArea": "wSkVaW_viewArea",
			"widthHandle": "wSkVaW_widthHandle"
		};
		//#endregion
		//#region lib/types/client/skeleton/ConversationRoot.js
		/** localStorage key for the dragged transcript width preference (px). */
		const WIDTH_PREF_KEY = "dsh.conversation.contentWidth";
		/** Floor for a dragged content width; matches the layout center-column minimum. */
		const CONTENT_MIN = 640;
		/** Column budget the content must leave free: 88px per side keeps the width
		* handles fully placeable (24px inset + 40px strip + 24px safe zone) — a
		* larger dragged width would push its own handles off the column and leave no
		* way to drag back. */
		const CONTENT_EDGE_BUDGET = 176;
		/** Reads the persisted width preference; durable-storage boundary, so a
		* missing or corrupt value resolves to "no preference".
		* @returns the stored width in px, or null when unset or invalid. */
		function readWidthPreference() {
			const raw = localStorage.getItem(WIDTH_PREF_KEY);
			if (raw === null) return null;
			const value = Number(raw);
			return Number.isFinite(value) && value > 0 ? value : null;
		}
		/** Resolves the content width the CSS axis would show for a column width.
		* @param columnWidth - the conversation column's rendered width in px.
		* @param preference - the dragged preference, or null for the adaptive clamp.
		* @returns the resolved content width in px (mirrors the CSS clamp). */
		function resolveContentWidth(columnWidth, preference) {
			const max = Math.max(CONTENT_MIN, columnWidth - CONTENT_EDGE_BUDGET);
			if (preference !== null) return Math.min(Math.max(preference, CONTENT_MIN), max);
			return Math.max(680, Math.min(columnWidth * .64, 920));
		}
		/** One transcript width handle: pointer capture + rAF-throttled symmetric
		* resize (both sides write the one centered width, so outward travel widens
		* by 2× the pointer distance). pointermove publishes the pointer's Y as a CSS
		* variable so the glow indicator rides it. Mirrors ui-layout AppFrame's
		* DragHandle capture model. */
		function WidthHandle(props) {
			const [dragging, setDragging] = (0, react.useState)(false);
			const base = (0, react.useRef)(0);
			const origin = (0, react.useRef)(0);
			const latest = (0, react.useRef)(0);
			const frame = (0, react.useRef)(null);
			const callbacks = (0, react.useRef)(props);
			callbacks.current = props;
			const outwardWidth = () => {
				const dx = latest.current - origin.current;
				const outward = callbacks.current.side === "right" ? dx : -dx;
				return base.current + outward * 2;
			};
			const cancelFrame = () => {
				if (frame.current !== null) {
					cancelAnimationFrame(frame.current);
					frame.current = null;
				}
			};
			const onPointerDown = (0, react.useCallback)((e) => {
				e.preventDefault();
				e.currentTarget.setPointerCapture(e.pointerId);
				origin.current = e.clientX;
				latest.current = e.clientX;
				base.current = callbacks.current.onStart();
				setDragging(true);
			}, []);
			const onPointerMove = (0, react.useCallback)((e) => {
				const box = e.currentTarget.getBoundingClientRect();
				e.currentTarget.style.setProperty("--dsh-width-handle-pointer-y", `${e.clientY - box.top}px`);
				if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
				latest.current = e.clientX;
				frame.current ??= requestAnimationFrame(() => {
					frame.current = null;
					callbacks.current.onDrag(outwardWidth());
				});
			}, []);
			const onPointerUp = (0, react.useCallback)((e) => {
				if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
				e.currentTarget.releasePointerCapture(e.pointerId);
				cancelFrame();
				latest.current = e.clientX;
				if (latest.current !== origin.current) callbacks.current.onCommit(outwardWidth());
				setDragging(false);
				callbacks.current.onEnd();
			}, []);
			const onPointerCancel = (0, react.useCallback)(() => {
				cancelFrame();
				setDragging(false);
				callbacks.current.onEnd();
			}, []);
			return (0, react_jsx_runtime.jsx)("div", {
				className: ConversationRoot_module_css_default.widthHandle,
				"data-side": props.side,
				"data-width-handle": props.side,
				"data-dragging": dragging || void 0,
				onPointerDown,
				onPointerMove,
				onPointerUp,
				onPointerCancel,
				onLostPointerCapture: onPointerCancel
			});
		}
		function ConversationRoot({ sessionId, useSession, useSessions, useSessionPendingInteraction, useWorkspaces, useConversation, useInput, useComposerBlock, renderSlot, renderSlotChain, selectWorkspace, t }) {
			const session = useSession((s) => s);
			const pendingInteraction = useSessionPendingInteraction((snapshot) => sessionId === void 0 ? void 0 : snapshot.get(sessionId));
			const conversation = useConversation((s) => s);
			const shellPhase = session === void 0 || conversation === void 0 ? "blank" : conversationPhase(session, conversation);
			const openState = session?.openState;
			const inputState = useInput((s) => s);
			const cwd = useSessions((s) => sessionId === void 0 ? void 0 : s.byId[sessionId]?.cwd);
			const summaryBlank = useSessions((s) => sessionId === void 0 ? void 0 : s.byId[sessionId]?.blank);
			const workspaces = useWorkspaces((s) => s);
			const composerBlock = useComposerBlock((block) => block);
			const [pickerOpen, setPickerOpen] = (0, react.useState)(false);
			const [pendingWorkspaceId, setPendingWorkspaceId] = (0, react.useState)();
			const pickerAnchor = (0, react.useRef)(null);
			const seatObserver = (0, react.useRef)(null);
			const seatResizeRef = (0, react.useCallback)((seat) => {
				seatObserver.current?.disconnect();
				seatObserver.current = null;
				const scroller = seat?.parentElement ?? null;
				if (seat === null || scroller === null) return;
				seatObserver.current = new ResizeObserver(() => {
					scroller.style.setProperty("--dsh-composer-height", `${seat.offsetHeight}px`);
					scroller.style.setProperty("--dsh-conversation-viewport-height", `${scroller.clientHeight}px`);
				});
				seatObserver.current.observe(seat);
				seatObserver.current.observe(scroller);
			}, []);
			const rootEl = (0, react.useRef)(null);
			const rootObserver = (0, react.useRef)(null);
			const publishWidths = (0, react.useCallback)((root) => {
				const column = root.offsetWidth;
				root.style.setProperty("--dsh-conversation-column-width", `${column}px`);
				const preference = readWidthPreference();
				if (preference === null) root.style.removeProperty("--dsh-chat-user-width");
				else root.style.setProperty("--dsh-chat-user-width", `${resolveContentWidth(column, preference)}px`);
			}, []);
			const rootResizeRef = (0, react.useCallback)((root) => {
				rootObserver.current?.disconnect();
				rootObserver.current = null;
				rootEl.current = root;
				if (root === null) return;
				rootObserver.current = new ResizeObserver(() => {
					publishWidths(root);
				});
				rootObserver.current.observe(root);
				publishWidths(root);
			}, [publishWidths]);
			const onHandleStart = (0, react.useCallback)(() => {
				const root = rootEl.current;
				/* v8 ignore next -- handles render inside the root, so the ref is always attached. */
				if (root === null) return 680;
				return resolveContentWidth(root.offsetWidth, readWidthPreference());
			}, []);
			const onHandleDrag = (0, react.useCallback)((width) => {
				const root = rootEl.current;
				/* v8 ignore next -- handles render inside the root, so the ref is always attached. */
				if (root === null) return;
				const clamped = resolveContentWidth(root.offsetWidth, width);
				root.style.setProperty("--dsh-chat-user-width", `${clamped}px`);
			}, []);
			const onHandleCommit = (0, react.useCallback)((width) => {
				const root = rootEl.current;
				/* v8 ignore next -- handles render inside the root, so the ref is always attached. */
				if (root === null) return;
				localStorage.setItem(WIDTH_PREF_KEY, `${resolveContentWidth(root.offsetWidth, width)}`);
			}, []);
			const onHandleEnd = (0, react.useCallback)(() => {
				const root = rootEl.current;
				if (root !== null) publishWidths(root);
			}, [publishWidths]);
			const sessionWorkspace = sessionId === void 0 ? void 0 : workspaces.items.find((workspace) => workspace.sessionIds.includes(sessionId));
			const pendingWorkspace = workspaces.items.find((workspace) => workspace.workspaceId === pendingWorkspaceId);
			(0, react.useEffect)(() => {
				if (pendingWorkspaceId === void 0) return;
				if (sessionWorkspace?.workspaceId === pendingWorkspaceId || workspaces.phase === "ready" && pendingWorkspace === void 0) setPendingWorkspaceId(void 0);
			}, [
				pendingWorkspaceId,
				sessionWorkspace?.workspaceId,
				workspaces.phase,
				pendingWorkspace
			]);
			const parentAvailabilityPending = session?.subagent?.address.mode === "continuable" && session.subagent.parentAvailable === void 0;
			const settling = sessionId !== void 0 && (shellPhase === "blank" && openState === "loading" && summaryBlank !== true || parentAvailabilityPending);
			const hero = sessionId === void 0 || shellPhase === "blank" && (openState === "open" || summaryBlank === true);
			const zone = session === void 0 || inputState === void 0 ? void 0 : {
				session,
				input: inputState
			};
			const chipTitle = pendingWorkspace?.title ?? (sessionId === void 0 ? void 0 : sessionWorkspace?.title ?? (workspaces.phase === "ready" || cwd === void 0 || cwd === "" ? void 0 : workspaceLabel(cwd)));
			const heroWorkspaceRow = (0, react_jsx_runtime.jsxs)("div", {
				className: ConversationRoot_module_css_default.heroWorkspaceRow,
				children: [
					(0, react_jsx_runtime.jsx)(WorkspaceChip, {
						buttonRef: pickerAnchor,
						label: chipTitle,
						menuOpen: pickerOpen,
						onClick: () => {
							setPickerOpen((open) => !open);
						},
						t
					}),
					renderSlot("conversation.hero.workspace", {
						open: pickerOpen,
						anchorRef: pickerAnchor,
						selectedId: pendingWorkspaceId ?? sessionWorkspace?.workspaceId,
						onPick: (workspaceId) => {
							setPickerOpen(false);
							setPendingWorkspaceId(workspaceId);
							selectWorkspace(workspaceId).catch(() => {
								setPendingWorkspaceId((current) => current === workspaceId ? void 0 : current);
							});
						},
						onClose: () => {
							setPickerOpen(false);
						}
					}),
					renderSlot("conversation.hero.agentPreset", {})
				]
			});
			const inert = sessionId === void 0 || hero && chipTitle === void 0;
			const inputBar = renderSlot("conversation.composer.bar", {
				variant: hero ? "hero" : "composer",
				...inert ? {
					disabled: true,
					placeholder: t("placeholder.workspace"),
					workspacePickerOpen: pickerOpen,
					onRequestWorkspace: () => {
						setPickerOpen(true);
					}
				} : !inert && composerBlock !== void 0 ? {
					blocked: composerBlock,
					placeholder: composerBlock.reason
				} : hero ? { placeholder: t("placeholder.hero") } : {}
			});
			const composerBar = (0, react_jsx_runtime.jsxs)("div", {
				className: clsx(ConversationRoot_module_css_default.composerStack, hero && ConversationRoot_module_css_default.composerHero),
				children: [
					hero && (0, react_jsx_runtime.jsx)(HeroShell, {
						t,
						renderSlot
					}),
					hero && heroWorkspaceRow,
					zone !== void 0 && renderSlot("conversation.input.dock", zone),
					inputBar
				]
			});
			const phase = settling ? "settling" : hero ? "hero" : "active";
			const composer = renderSlotChain("conversation.composer", {
				sessionId,
				session,
				pendingInteraction
			}, {
				fallback: composerBar,
				fallbackOnly: sessionId === void 0,
				overlay: true
			});
			const composerSeat = (0, react_jsx_runtime.jsx)("div", {
				ref: seatResizeRef,
				className: ConversationRoot_module_css_default.composerSeat,
				"data-composer-seat": "",
				children: composer
			});
			return (0, react_jsx_runtime.jsxs)("div", {
				ref: rootResizeRef,
				className: ConversationRoot_module_css_default.root,
				"data-phase": phase,
				children: [sessionId === void 0 ? null : renderSlot("conversation.session.header", {}), (0, react_jsx_runtime.jsxs)("div", {
					className: ConversationRoot_module_css_default.body,
					children: [(0, react_jsx_runtime.jsxs)("div", {
						className: ConversationRoot_module_css_default.scrollBody,
						"data-conversation-scroll": "",
						children: [sessionId === void 0 ? null : renderSlot("conversation.session", {}), composerSeat]
					}), phase === "active" && ["left", "right"].map((side) => (0, react_jsx_runtime.jsx)(WidthHandle, {
						side,
						onStart: onHandleStart,
						onDrag: onHandleDrag,
						onCommit: onHandleCommit,
						onEnd: onHandleEnd
					}, side))]
				})]
			});
		}
		//#endregion
		//#region lib/types/client/skeleton/ConversationPanel.js
		/**
		* Render the Conversation with optional current-Session binding.
		* @param props - main-slot inputs and the declared Conversation renderer.
		* @returns the Conversation subtree.
		*/
		function ConversationPanel({ renderSlot }) {
			return renderSlot("main.conversation", {});
		}
		//#endregion
		//#region lib/types/client/view-selection.js
		const DEFAULT_VIEW_ID = "chat";
		/**
		* Resolve a preferred registered View, then Chat, without choosing another View.
		* @param tabs - currently registered Views.
		* @param selectedId - preferred View identity, when one is stored.
		* @returns the selected View, Chat fallback, or undefined when neither is registered.
		*/
		function resolveActiveView(tabs, selectedId) {
			return (selectedId === null ? void 0 : tabs.find((view) => view.id === selectedId)) ?? tabs.find((view) => view.id === DEFAULT_VIEW_ID);
		}
		//#endregion
		//#region lib/types/client/skeleton/ConversationSession.js
		/** Strict per-session header/body content inserted into the resident conversation layout. */
		function deriveAncestry(list, id) {
			const chain = [];
			const seen = /* @__PURE__ */ new Set();
			let cursor = id;
			while (cursor !== void 0) {
				if (seen.has(cursor)) break;
				seen.add(cursor);
				const summary = list.byId[cursor];
				if (summary === void 0) break;
				chain.unshift({
					id: summary.id,
					displayTitle: summary.displayTitle,
					subagent: summary.origin === "subagent"
				});
				if (summary.origin !== "subagent") break;
				cursor = summary.parentId;
			}
			return chain;
		}
		function equalBreadcrumbs(left, right) {
			return left.length === right.length && left.every((item, index) => {
				const other = right.at(index);
				return other !== void 0 && item.id === other.id && item.displayTitle === other.displayTitle;
			});
		}
		/**
		* Renders Session header chrome above the resident conversation scrollport.
		* @param props - Strict Session store, view ledger, navigation, render, and locale shares.
		* @returns the hidden blank-session header or visible title and tabs.
		*/
		function ConversationSessionHeader({ sessionId, useSession, useSessions, useConversation, useConversationViews, useStore, renderSlot, open, selectView, t }) {
			const tabs = useConversationViews((value) => value);
			const active = resolveActiveView(tabs, useStore((s) => s.view));
			const ancestry = useSessions((s) => deriveAncestry(s, sessionId), equalBreadcrumbs);
			const session = useSession((s) => s);
			const conversation = useConversation((s) => s);
			const hideChrome = session.blank && conversationPhase(session, conversation) === "blank";
			return (0, react_jsx_runtime.jsx)("header", {
				className: clsx(ConversationRoot_module_css_default.header, hideChrome && ConversationRoot_module_css_default.headerHidden),
				"aria-hidden": hideChrome || void 0,
				children: !hideChrome && (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [(0, react_jsx_runtime.jsxs)("div", {
					className: ConversationRoot_module_css_default.titleRow,
					children: [
						(0, react_jsx_runtime.jsxs)("div", {
							className: ConversationRoot_module_css_default.titleCluster,
							children: [(0, react_jsx_runtime.jsxs)("nav", {
								className: ConversationRoot_module_css_default.crumbs,
								"aria-label": t("session.hierarchy"),
								children: [ancestry.map((summary, index) => {
									const last = index === ancestry.length - 1;
									const title = (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										className: clsx(ConversationRoot_module_css_default.crumb, summary.subagent && ConversationRoot_module_css_default.crumbSubagent, last && ConversationRoot_module_css_default.crumbCurrent),
										disabled: last,
										onClick: () => {
											open(summary.id);
										},
										children: summary.displayTitle
									});
									const lineage = last || summary.subagent;
									const lineageOwner = {
										lineageSessionId: summary.id,
										displayTitle: summary.displayTitle,
										...last ? {} : { openTitle: () => {
											open(summary.id);
										} }
									};
									return (0, react_jsx_runtime.jsxs)("span", {
										className: ConversationRoot_module_css_default.crumbSeg,
										children: [index > 0 && (0, react_jsx_runtime.jsx)("span", {
											className: ConversationRoot_module_css_default.crumbSep,
											children: "/"
										}), lineage ? summary.subagent ? renderSlot("conversation.session.header.lineage", lineageOwner, { fallback: title }) : (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [title, renderSlot("conversation.session.header.lineage", lineageOwner, { fallback: null })] }) : title]
									}, summary.id);
								}), ancestry.length === 0 && (0, react_jsx_runtime.jsx)("span", {
									className: ConversationRoot_module_css_default.crumbCurrent,
									children: sessionId
								})]
							}), (0, react_jsx_runtime.jsx)("div", {
								className: ConversationRoot_module_css_default.headerActions,
								children: renderSlot("conversation.session.header.actions", {})
							})]
						}),
						(0, react_jsx_runtime.jsx)("div", {
							className: ConversationRoot_module_css_default.headerUtilities,
							children: renderSlot("conversation.session.header.utilities", {})
						}),
						(0, react_jsx_runtime.jsx)("div", {
							className: ConversationRoot_module_css_default.headerCorner,
							"data-conversation-header-corner": "",
							children: renderSlot("conversation.session.header.corner", {})
						})
					]
				}), tabs.length > 1 && (0, react_jsx_runtime.jsx)("div", {
					className: ConversationRoot_module_css_default.tabs,
					role: "tablist",
					children: tabs.map((viewTab) => (0, react_jsx_runtime.jsx)("button", {
						type: "button",
						role: "tab",
						"aria-selected": viewTab.id === active?.id,
						className: clsx(ConversationRoot_module_css_default.tab, viewTab.id === active?.id && ConversationRoot_module_css_default.tabActive),
						onClick: () => {
							selectView(viewTab.id);
						},
						children: viewTab.label
					}, viewTab.id))
				})] })
			});
		}
		/**
		* Renders the active Session view inside the resident scrollport and keeps
		* the input draft mirrored while blank Hero chrome is visible.
		* @param props - Strict Session input/store, view ledger, and render shares.
		* @returns the active view area, or null while the Session remains blank.
		*/
		function ConversationSession({ useSession, useConversation, useConversationViews, useInput, inputActions, useStore, actions, renderSlot, bindDraftMirror, openView }) {
			const active = resolveActiveView(useConversationViews((value) => value), useStore((s) => s.view));
			const session = useSession((s) => s);
			const conversation = useConversation((s) => s);
			const inputState = useInput((s) => s);
			const storedDraft = useStore((s) => s.draft);
			const viewRequest = useStore((s) => s.viewRequest ?? null);
			(0, react.useEffect)(() => {
				if (inputState.draft === "" && storedDraft !== "") inputActions.setDraft(storedDraft);
				const unmirror = bindDraftMirror(actions.setDraft);
				return () => {
					unmirror();
				};
			}, [inputActions]);
			if (session.blank && conversationPhase(session, conversation) === "blank") return null;
			return (0, react_jsx_runtime.jsx)("div", {
				className: ConversationRoot_module_css_default.viewArea,
				children: active !== void 0 && renderSlot("conversation.view", {
					viewRequest,
					openView,
					completeViewRequest: actions.completeViewRequest
				}, { only: active.id })
			});
		}
		//#endregion
		//#region lib/types/client/input/editor/ComposerContentEditable.js
		/**
		* The composer's contenteditable host: binds one shell-owned Lexical editor
		* to a resident div. Session-maybe by design — a null editor renders the
		* same DOM inert (the no-session Workspace-trigger state), so switching
		* between the two never swaps the element tree. Editability has ONE writer:
		* this component reflects the `editable` prop onto the editor; nothing else
		* calls setEditable.
		*/
		/**
		* Render the composer's editable surface.
		* @param props - editor binding, editability, and div passthroughs.
		* @returns the resident contenteditable div.
		*/
		function ComposerContentEditable({ editor, editable, ...rest }) {
			const ref = (0, react.useRef)(null);
			(0, react.useLayoutEffect)(() => {
				const el = ref.current;
				if (editor === null || el === null) return;
				editor.setRootElement(el);
				return () => {
					editor.setRootElement(null);
				};
			}, [editor]);
			(0, react.useLayoutEffect)(() => {
				if (editor !== null) editor.setEditable(editable);
			}, [editor, editable]);
			return (0, react_jsx_runtime.jsx)("div", {
				ref,
				contentEditable: editor !== null && editable,
				suppressContentEditableWarning: true,
				role: "textbox",
				"aria-multiline": "true",
				"data-composer-input": true,
				...rest
			});
		}
		//#endregion
		//#region lib/types/client/input/editor/DecoratorPortals.js
		/**
		* Decorator render loop: portals every decorator node's React face into its
		* host element (what @lexical/react's composer does internally, scoped to
		* this composer's needs). Chip DOM identity rides the NodeKey — text edits
		* around a chip never remount its portal.
		*/
		/**
		* Render every decorator's React face into its editor host element.
		* @param props - the editor to observe.
		* @returns the live portal set.
		*/
		function DecoratorPortals({ editor }) {
			const [decorators, setDecorators] = react.useState(() => editor === null ? {} : editor.getDecorators());
			react.useLayoutEffect(() => {
				if (editor === null) return;
				setDecorators(editor.getDecorators());
				return editor.registerDecoratorListener((next) => {
					setDecorators(next);
				});
			}, [editor]);
			if (editor === null) return null;
			return (0, react_jsx_runtime.jsx)(react_jsx_runtime.Fragment, { children: Object.entries(decorators).map(([key, jsx]) => {
				const el = editor.getElementByKey(key);
				return el === null ? null : (0, react_dom.createPortal)(jsx, el, key);
			}) });
		}
		//#endregion
		//#region lib/types/client/input/editor/keymap.js
		/** Composition state a keydown can trust (see the module doc's Safari note). */
		function isComposingEvent(event, recentlyComposing) {
			return event.isComposing || event.keyCode === 229 || recentlyComposing();
		}
		/**
		* Register the composer keymap on one editor.
		* @param editor - the shell-owned editor.
		* @param handlers - bar-supplied behavior.
		* @returns the unregister disposer.
		*/
		function registerComposerKeymap(editor, handlers) {
			let composing = false;
			let composingUntil = 0;
			const onCompositionStart = () => {
				composing = true;
			};
			const onCompositionEnd = () => {
				composing = false;
				composingUntil = Date.now() + 10;
			};
			const recentlyComposing = () => composing || Date.now() < composingUntil;
			const arrow = (key) => (event) => {
				const inComposition = event !== null && isComposingEvent(event, recentlyComposing);
				if (handlers.arbitrate(key, inComposition) !== "pass") {
					event?.preventDefault();
					return true;
				}
				return false;
			};
			return Eu(editor.registerRootListener((root, prevRoot) => {
				prevRoot?.removeEventListener("compositionstart", onCompositionStart);
				prevRoot?.removeEventListener("compositionend", onCompositionEnd);
				root?.addEventListener("compositionstart", onCompositionStart);
				root?.addEventListener("compositionend", onCompositionEnd);
			}), editor.registerCommand(sn$2, arrow("up"), 4), editor.registerCommand(ln$2, arrow("down"), 4), editor.registerCommand(hn$2, arrow("tab"), 4), editor.registerCommand(fn$1, (event) => {
				handlers.dismissPopup();
				if (handlers.arbitrate("escape", isComposingEvent(event, recentlyComposing)) === "consumed") {
					event.preventDefault();
					return true;
				}
				return false;
			}, 4), editor.registerCommand(an$1, (event) => {
				if (isComposingEvent(event, recentlyComposing)) return false;
				if (handlers.space()) {
					event.preventDefault();
					return true;
				}
				return false;
			}, 4), editor.registerCommand(cn$1, (event) => {
				if (event?.shiftKey === true) return false;
				if (event !== null && isComposingEvent(event, recentlyComposing)) return true;
				if (handlers.arbitrate("enter", false) !== "pass") {
					event?.preventDefault();
					return true;
				}
				event?.preventDefault();
				if (event?.repeat === true) return true;
				if (!handlers.canSubmit()) return true;
				handlers.submit(event?.ctrlKey === true || event?.metaKey === true);
				return true;
			}, 4), editor.registerCommand(Je$2, (event) => {
				const clipboardData = event.clipboardData ?? null;
				if (clipboardData === null) return false;
				const files = Array.from(clipboardData.items).filter((item) => item.kind === "file").map((item) => item.getAsFile()).filter((file) => file !== null);
				if (files.length > 0) handlers.intakeFiles(files);
				const text = clipboardData.getData("text/plain");
				if (text === "") {
					if (files.length === 0) return false;
					event.preventDefault();
					return true;
				}
				event.preventDefault();
				handlers.pasteText(text);
				return true;
			}, 4));
		}
		//#endregion
		//#region lib/types/client/image-labels.js
		/** Attachment error and limit copy owned by the conversation input flow. */
		/**
		* Byte count as user-facing megabytes (`10MB`, `2.5MB`).
		* @param bytes - the byte count.
		* @returns the rounded megabyte text.
		*/
		function imageSizeText(bytes) {
			const mb = bytes / (1024 * 1024);
			return `${Number.isInteger(mb) ? String(mb) : mb.toFixed(1)}MB`;
		}
		/**
		* Product copy for a host attachment rejection (the `details.reason` of
		* `session/attachment-invalid` or `subagent/attachment-invalid`).
		* User-solvable reasons name the limit and the way out;
		* reasons the user cannot act on fold into one send-failed line carrying the
		* reason code for a bug report.
		* @param t - the conversation-namespace translate.
		* @param reason - the wire `details.reason` code.
		* @param limits - projected limits interpolated into count/size copy, when known.
		* @returns the banner text.
		*/
		function attachmentErrorText(t, reason, limits) {
			switch (reason) {
				case "MODEL_DOES_NOT_SUPPORT_IMAGES": return t("image.modelUnsupported");
				case "FILE_NOT_STAGED": return t("file.notStaged");
				case "IMAGE_TOO_MANY_PIXELS": return t("image.tooManyPixels");
				case "IMAGE_DIMENSION_TOO_LARGE":
					if (limits !== void 0) return t("image.dimensionTooLarge", { size: limits.maxImageDimension });
					break;
				case "INVALID_IMAGE":
				case "IMAGE_TYPE_MISMATCH": return t("image.unsupportedType");
				case "TOO_MANY_IMAGES":
					if (limits !== void 0) return t("image.tooMany", { count: limits.maxImagesPerMessage });
					break;
				case "IMAGE_TOO_LARGE":
					if (limits !== void 0) return t("image.fileTooLarge", { size: imageSizeText(limits.maxImageBytes) });
					break;
				case "IMAGES_TOO_LARGE":
					if (limits !== void 0) return t("image.totalTooLarge", { size: imageSizeText(limits.maxMessageImageBytes) });
					break;
				default: break;
			}
			return t("image.sendFailed", { reason });
		}
		//#endregion
		//#region lib/types/client/context-occupancy.js
		/**
		* Resolve bounded display occupancy from independently updated pressure fields.
		* @param pressure - latest token-meter projection.
		* @returns occupancy, or null until numerator and capacity are known.
		*/
		function contextOccupancy(pressure) {
			const usedTokens = pressure?.projectedTokens ?? pressure?.pressureTokens;
			if (usedTokens === void 0 || pressure?.contextWindow === void 0) return null;
			return {
				percent: Math.min(100, Math.round(usedTokens / pressure.contextWindow * 100)),
				usedTokens,
				contextWindow: pressure.contextWindow
			};
		}
		//#endregion
		//#region \0dsh-css:/home/runner/work/deepseek-harness/deepseek-harness/packages/client/ui-conversation/src/client/skeleton/ContextMeter.module.css.mjs
		const css$3 = ".JObwrW_root{display:inline-flex;position:relative}.JObwrW_trigger{corner-shape:round;width:28px;height:28px;color:var(--dsw-alias-label-secondary);cursor:pointer;background:0 0;border:none;border-radius:999px;flex:none;place-items:center;display:grid}.JObwrW_trigger:hover{background:var(--dsw-alias-interactive-bg-hover)}.JObwrW_track{fill:none;stroke:var(--dsw-alias-border-l3);stroke-width:2px}.JObwrW_fill{fill:none;stroke:var(--dsw-alias-label-tertiary);stroke-width:2px;stroke-linecap:round}.JObwrW_panel{z-index:100;box-sizing:border-box;background:var(--dsw-specific-menu);--dsw-elevation-stroke-color:var(--dsw-alias-border-l1);width:264px;box-shadow:var(--dsw-elevation-prominent);color:var(--dsw-alias-label-secondary);cursor:default;border:0;border-radius:12px;padding:12px;font-size:12px;line-height:20px;position:absolute;bottom:calc(100% + 8px);right:0}.JObwrW_header{align-items:center;gap:6px;display:flex}.JObwrW_figures{font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-primary);margin-left:auto;font-weight:500}.JObwrW_percent{color:var(--dsw-alias-label-primary);font-weight:500}.JObwrW_headline{color:var(--dsw-alias-label-tertiary)}.JObwrW_headline:empty{display:none}.JObwrW_bar{corner-shape:round;background:var(--dsw-alias-interactive-bg-hover);border-radius:999px;gap:1px;height:4px;margin:10px 0 12px;display:flex;overflow:hidden}.JObwrW_segment{background:var(--meter-tint,var(--dsw-alias-label-tertiary));border-radius:1px;flex:none;min-width:2px;height:100%}.JObwrW_swatch{background:var(--meter-tint);vertical-align:baseline;border-radius:2px;width:8px;height:8px;margin-right:6px;display:inline-block}.JObwrW_colorSystem{--meter-tint:var(--dsw-static-neutral-bluish-400)}.JObwrW_colorTools{--meter-tint:#a78bfa}.JObwrW_colorMessages{--meter-tint:var(--dsw-static-blue-450)}.JObwrW_rows{margin:6px 0 0}.JObwrW_row{justify-content:space-between;align-items:center;gap:12px;padding:2px 0;display:flex}.JObwrW_row dt{color:var(--dsw-alias-label-secondary)}.JObwrW_row dd{font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-primary);margin:0}";
		const tagId$3 = "@deepseek-ai/dsh-client-ui-conversation/ContextMeter.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$3) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@deepseek-ai/dsh-client-ui-conversation";
			tag.dataset.pluginCss = tagId$3;
			tag.textContent = css$3;
			document.head.appendChild(tag);
		}
		var ContextMeter_module_css_default = {
			"bar": "JObwrW_bar",
			"colorMessages": "JObwrW_colorMessages",
			"colorSystem": "JObwrW_colorSystem",
			"colorTools": "JObwrW_colorTools",
			"figures": "JObwrW_figures",
			"fill": "JObwrW_fill",
			"header": "JObwrW_header",
			"headline": "JObwrW_headline",
			"panel": "JObwrW_panel",
			"percent": "JObwrW_percent",
			"root": "JObwrW_root",
			"row": "JObwrW_row",
			"rows": "JObwrW_rows",
			"segment": "JObwrW_segment",
			"swatch": "JObwrW_swatch",
			"track": "JObwrW_track",
			"trigger": "JObwrW_trigger"
		};
		//#endregion
		//#region lib/types/client/skeleton/ContextMeter.js
		/** Composer context-occupancy meter: a ring beside the send button fed by the
		* `contextPressure` projection, with a click-open panel of the heuristic
		* `contextBreakdown` composition (system prompt, tools, conversation).
		* Renders nothing until a provider reports both pressure and a route
		* capacity. */
		/** Ring geometry: 14px viewBox, 2px stroke. */
		const RADIUS = 5.5;
		const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
		/**
		* Marker the localized occupancy sentence is split on, so the panel headline
		* keeps the reading in its own tone while each locale still owns the word
		* order (`45% of context used` / `上下文已用 45%`).
		*/
		const READING_SLOT = "\0";
		/** Panel legend rows, in bar-segment order; each color class carries the shared swatch/segment tint. */
		const ROWS = [
			{
				key: "systemTokens",
				label: "context.system",
				color: ContextMeter_module_css_default.colorSystem
			},
			{
				key: "toolsTokens",
				label: "context.tools",
				color: ContextMeter_module_css_default.colorTools
			},
			{
				key: "messageTokens",
				label: "context.messages",
				color: ContextMeter_module_css_default.colorMessages
			}
		];
		/**
		* Format a token count for the compact context panel.
		* @param value - token count.
		* @param t - Conversation locale seat with shared compact-number templates.
		* @returns Compact localized count using K or M when needed.
		*/
		function formatTokens(value, t) {
			const scaled = (candidate) => candidate >= 100 ? String(Math.round(candidate)) : String(Math.round(candidate * 10) / 10);
			if (value < 1e3) return String(value);
			if (value < 1e6) return t("number.thousand", { value: scaled(value / 1e3) });
			return t("number.million", { value: scaled(value / 1e6) });
		}
		function ContextMeter({ useProjection, t }) {
			const pressure = useProjection("contextPressure");
			const breakdown = useProjection("contextBreakdown");
			const [open, setOpen] = (0, react.useState)(false);
			const rootRef = (0, react.useRef)(null);
			const context = contextOccupancy(pressure);
			const available = context !== null;
			(0, react.useEffect)(() => {
				if (!available && open) setOpen(false);
			}, [available, open]);
			(0, react.useEffect)(() => {
				if (!open || !available) return;
				const onPointerDown = (e) => {
					if (e.target instanceof Node && rootRef.current?.contains(e.target) === true) return;
					setOpen(false);
				};
				const onKeyDown = (e) => {
					if (e.key === "Escape") setOpen(false);
				};
				document.addEventListener("pointerdown", onPointerDown);
				document.addEventListener("keydown", onKeyDown);
				return () => {
					document.removeEventListener("pointerdown", onPointerDown);
					document.removeEventListener("keydown", onKeyDown);
				};
			}, [available, open]);
			if (context === null) return null;
			const percent = context.percent;
			const reading = `${percent}%`;
			const [headBefore = "", headAfter = ""] = t("context.aria", { percent: READING_SLOT }).split(READING_SLOT).map((part) => part.trim());
			const breakdownTotal = breakdown === void 0 ? 0 : breakdown.systemTokens + breakdown.toolsTokens + breakdown.messageTokens;
			const segments = (breakdown === void 0 || breakdownTotal === 0 ? [{
				key: "total",
				color: void 0,
				width: percent
			}] : ROWS.map((row) => ({
				key: row.key,
				color: row.color,
				width: percent * breakdown[row.key] / breakdownTotal
			}))).filter((part) => part.width > 0);
			return (0, react_jsx_runtime.jsxs)("span", {
				ref: rootRef,
				className: ContextMeter_module_css_default.root,
				children: [(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Tooltip, {
					label: t("context.aria", { percent: reading }),
					side: "top",
					delayMs: 200,
					disabled: open,
					children: (0, react_jsx_runtime.jsx)("button", {
						type: "button",
						className: ContextMeter_module_css_default.trigger,
						"aria-label": t("context.aria", { percent: reading }),
						"aria-haspopup": "dialog",
						"aria-expanded": open,
						onClick: () => {
							setOpen(!open);
						},
						children: (0, react_jsx_runtime.jsxs)("svg", {
							viewBox: "0 0 14 14",
							width: "14",
							height: "14",
							"aria-hidden": true,
							children: [(0, react_jsx_runtime.jsx)("circle", {
								className: ContextMeter_module_css_default.track,
								cx: "7",
								cy: "7",
								r: RADIUS
							}), (0, react_jsx_runtime.jsx)("circle", {
								className: ContextMeter_module_css_default.fill,
								cx: "7",
								cy: "7",
								r: RADIUS,
								strokeDasharray: `${CIRCUMFERENCE * percent / 100} ${CIRCUMFERENCE}`,
								transform: "rotate(-90 7 7)"
							})]
						})
					})
				}), open && (0, react_jsx_runtime.jsxs)("div", {
					className: ContextMeter_module_css_default.panel,
					role: "dialog",
					"aria-label": t("context.used"),
					children: [
						(0, react_jsx_runtime.jsxs)("div", {
							className: ContextMeter_module_css_default.header,
							children: [
								(0, react_jsx_runtime.jsx)("span", {
									className: ContextMeter_module_css_default.headline,
									children: headBefore
								}),
								(0, react_jsx_runtime.jsx)("span", {
									className: ContextMeter_module_css_default.percent,
									children: reading
								}),
								(0, react_jsx_runtime.jsx)("span", {
									className: ContextMeter_module_css_default.headline,
									children: headAfter
								}),
								(0, react_jsx_runtime.jsx)("span", {
									className: ContextMeter_module_css_default.figures,
									children: `~${formatTokens(context.usedTokens, t)} / ${formatTokens(context.contextWindow, t)}`
								})
							]
						}),
						(0, react_jsx_runtime.jsx)("div", {
							className: ContextMeter_module_css_default.bar,
							children: segments.map((segment) => (0, react_jsx_runtime.jsx)("div", {
								className: segment.color === void 0 ? ContextMeter_module_css_default.segment : `${ContextMeter_module_css_default.segment} ${segment.color}`,
								style: { width: `${segment.width}%` }
							}, segment.key))
						}),
						breakdown !== void 0 && (0, react_jsx_runtime.jsx)("dl", {
							className: ContextMeter_module_css_default.rows,
							children: ROWS.map((row) => (0, react_jsx_runtime.jsxs)("div", {
								className: ContextMeter_module_css_default.row,
								children: [(0, react_jsx_runtime.jsxs)("dt", { children: [(0, react_jsx_runtime.jsx)("span", {
									className: `${ContextMeter_module_css_default.swatch} ${row.color}`,
									"aria-hidden": true
								}), t(row.label)] }), (0, react_jsx_runtime.jsx)("dd", { children: `~${formatTokens(breakdown[row.key], t)}` })]
							}, row.key))
						})
					]
				})]
			});
		}
		//#endregion
		//#region \0dsh-css:/home/runner/work/deepseek-harness/deepseek-harness/packages/client/ui-conversation/src/client/skeleton/PermissionSelect.module.css.mjs
		const css$2 = ".Sh0Q9G_trigger{min-width:0;max-width:220px;height:28px;color:var(--dsw-alias-label-secondary);cursor:pointer;background:0 0;border:none;border-radius:24px;outline:none;align-items:center;gap:4px;padding:0 4px 0 8px;font-size:13px;font-weight:500;line-height:20px;display:inline-flex}.Sh0Q9G_trigger:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover)}.Sh0Q9G_trigger:focus-visible{box-shadow:0 0 0 2px var(--dsw-alias-border-l3)}.Sh0Q9G_trigger:disabled{color:var(--dsw-alias-label-dimmed);cursor:default}.Sh0Q9G_triggerIcon{flex:none;display:inline-flex}.Sh0Q9G_triggerIcon svg{width:14px;height:14px}.Sh0Q9G_triggerLabel{text-overflow:ellipsis;white-space:nowrap;min-width:0;overflow:hidden}.Sh0Q9G_chevron{color:var(--dsw-alias-label-caption);flex:none;transition:transform .12s;display:inline-flex}@container (width<=460px){.Sh0Q9G_trigger:has(.Sh0Q9G_triggerIcon) .Sh0Q9G_triggerLabel{display:none}}.Sh0Q9G_chevronOpen{transform:rotate(180deg)}";
		const tagId$2 = "@deepseek-ai/dsh-client-ui-conversation/PermissionSelect.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$2) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@deepseek-ai/dsh-client-ui-conversation";
			tag.dataset.pluginCss = tagId$2;
			tag.textContent = css$2;
			document.head.appendChild(tag);
		}
		var PermissionSelect_module_css_default = {
			"chevron": "Sh0Q9G_chevron",
			"chevronOpen": "Sh0Q9G_chevronOpen",
			"trigger": "Sh0Q9G_trigger",
			"triggerIcon": "Sh0Q9G_triggerIcon",
			"triggerLabel": "Sh0Q9G_triggerLabel"
		};
		//#endregion
		//#region lib/types/client/skeleton/PermissionSelect.js
		const FULL_ACCESS = "danger-full-access";
		const shieldOutline = "M8.20554 0.899994L14.7901 3.36857V7.01026C14.7901 12 11.0466 14.2103 8.20554 15.3C5.36446 14.2103 1.62012 12 1.62012 7.01026V3.36857L8.20554 0.899994Z";
		const permissionGlyphs = new Map([
			["read-only", (0, react_jsx_runtime.jsxs)("svg", {
				width: "16",
				height: "16",
				viewBox: "0 0 16 16",
				fill: "none",
				"aria-hidden": true,
				children: [(0, react_jsx_runtime.jsx)("path", {
					d: shieldOutline,
					stroke: "currentColor",
					strokeWidth: "1.31831",
					strokeLinejoin: "round"
				}), (0, react_jsx_runtime.jsx)("path", {
					d: "M12.1654 5.7552L8.9447 9.41475C8.73044 9.65816 8.53628 9.8804 8.35774 10.0423C8.1713 10.2114 7.94235 10.3717 7.64016 10.4254C7.48207 10.4535 7.32 10.4552 7.16151 10.4294C6.85843 10.3801 6.62728 10.2223 6.43836 10.0559C6.25752 9.89653 6.06037 9.67732 5.84264 9.43705L4.72925 8.20897L5.63557 7.38707L6.74897 8.61594C6.98603 8.87755 7.12974 9.03533 7.24673 9.13839C7.31033 9.19443 7.34485 9.21476 7.35823 9.22122C7.38068 9.22484 7.40352 9.22515 7.42593 9.22122C7.40522 9.22502 7.42893 9.23294 7.53583 9.136C7.65132 9.03126 7.79316 8.87139 8.02643 8.60638L11.2479 4.94763L12.1654 5.7552Z",
					fill: "currentColor"
				})]
			})],
			["workspace-write", (0, react_jsx_runtime.jsxs)("svg", {
				width: "16",
				height: "16",
				viewBox: "0 0 16 16",
				fill: "none",
				"aria-hidden": true,
				children: [
					(0, react_jsx_runtime.jsx)("path", {
						d: "M8.08887 0.251709C8.20479 0.23085 8.32486 0.241168 8.43652 0.282959L15.0215 2.75171C15.2787 2.84819 15.4492 3.09414 15.4492 3.3689V7.0105C15.4492 7.10986 15.4441 7.2081 15.4414 7.30542C15.0285 7.07175 14.5905 6.87695 14.1309 6.73022V3.82495L8.20508 1.60327L2.2793 3.82495V7.0105C2.27936 9.7171 3.4745 11.5379 5.02734 12.7947C5.01025 12.9942 5 13.1962 5 13.4001C5.00001 13.7617 5.02722 14.1169 5.08008 14.4636C2.91555 13.0393 0.961014 10.752 0.960938 7.0105V3.3689C0.960938 3.09417 1.13146 2.84821 1.38867 2.75171L7.97461 0.282959L8.08887 0.251709Z",
						fill: "currentColor"
					}),
					(0, react_jsx_runtime.jsx)("path", {
						d: "M11.3525 5.64688V6.85688H5V5.64688H11.3525Z",
						fill: "currentColor"
					}),
					(0, react_jsx_runtime.jsx)("path", {
						d: "M9.5824 8.29376V9.50376H5V8.29376H9.5824Z",
						fill: "currentColor"
					}),
					(0, react_jsx_runtime.jsx)("path", {
						d: "M14.6647 15.6852H10.0338C10.3878 15.3751 10.7567 15.0517 11.0772 14.7706C11.2531 14.6164 11.4144 14.4746 11.5511 14.3547H14.6647V15.6852Z",
						fill: "currentColor"
					}),
					(0, react_jsx_runtime.jsx)("path", {
						d: "M8.14852 14.1308L7.33925 15.4976C7.22458 15.6912 7.42245 15.9194 7.63037 15.8333L9.09785 15.2254L15.0399 10.0719L14.0905 8.97733L8.14852 14.1308Z",
						fill: "currentColor"
					})
				]
			})],
			[FULL_ACCESS, (0, react_jsx_runtime.jsxs)("svg", {
				width: "16",
				height: "16",
				viewBox: "0 0 16 16",
				fill: "none",
				"aria-hidden": true,
				children: [
					(0, react_jsx_runtime.jsx)("path", {
						d: shieldOutline,
						stroke: "currentColor",
						strokeWidth: "1.31831",
						strokeLinejoin: "round"
					}),
					(0, react_jsx_runtime.jsx)("path", {
						d: "M9.10094 4.5V8.75939H7.59888V4.5H9.10094Z",
						fill: "currentColor"
					}),
					(0, react_jsx_runtime.jsx)("path", {
						d: "M9.10094 9.8114V11.5H7.59888V9.8114H9.10094Z",
						fill: "currentColor"
					})
				]
			})]
		]);
		/** Glyph for a permission option value; host-configured names outside the design set get none. */
		function permissionGlyph(value) {
			return permissionGlyphs.get(value);
		}
		/**
		* Display transform: built-in machine names render as locale product labels;
		* non-kebab host-configured names pass through.
		*/
		function displayName(name) {
			if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(name)) return name;
			return name.split("-").map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
		}
		const BUILT_IN_PERMISSION_NAMES = new Map([
			["read-only", en["access.preset.readOnly"]],
			["workspace-write", en["access.preset.workspaceWrite"]],
			[FULL_ACCESS, en["access.preset.fullAccess"]]
		]);
		function permissionLabel(value, name, t) {
			const builtInName = BUILT_IN_PERMISSION_NAMES.get(value);
			if (builtInName !== void 0 && (name === value || name === builtInName)) {
				if (value === "read-only") return t("access.preset.readOnly");
				if (value === "workspace-write") return t("access.preset.workspaceWrite");
				if (value === FULL_ACCESS) return t("access.preset.fullAccess");
			}
			return displayName(name);
		}
		function PermissionSelect({ value, locked, command, t }) {
			const [pick, setPick] = (0, react.useState)(null);
			const [open, setOpen] = (0, react.useState)(false);
			const [confirmation, setConfirmation] = (0, react.useState)(null);
			const [acknowledged, setAcknowledged] = (0, react.useState)(false);
			(0, react.useEffect)(() => {
				if (!locked && value !== void 0) return;
				setOpen(false);
				setAcknowledged(false);
				setConfirmation(null);
			}, [locked, value]);
			if (value === void 0) return null;
			const currentValue = pick ?? value.currentValue;
			const current = value.options.find((option) => option.value === currentValue);
			const currentLabel = current === void 0 ? permissionLabel(currentValue, currentValue, t) : permissionLabel(current.value, current.name, t);
			const busy = pick !== null || confirmation !== null;
			const items = value.options.filter((o) => o.value !== "custom").map((option) => {
				const icon = permissionGlyph(option.value);
				return {
					id: option.value,
					label: permissionLabel(option.value, option.name, t),
					...icon === void 0 ? {} : { icon }
				};
			});
			const submit = (id) => {
				setPick(id);
				command(`/permission ${id}`).catch(() => false).then(() => {
					setPick(null);
				});
			};
			const choose = (id) => {
				setOpen(false);
				if (id === value.currentValue) return;
				if (id === FULL_ACCESS) {
					setAcknowledged(false);
					setConfirmation(id);
					return;
				}
				submit(id);
			};
			const closeConfirmation = () => {
				setAcknowledged(false);
				setConfirmation(null);
			};
			const confirmFullAccess = () => {
				if (locked || !acknowledged || confirmation === null) return;
				const id = confirmation;
				closeConfirmation();
				submit(id);
			};
			return (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Menu, {
				open,
				items,
				selectedId: currentValue,
				onSelect: choose,
				onClose: () => {
					setOpen(false);
				},
				side: "top",
				anchor: (0, react_jsx_runtime.jsxs)("button", {
					type: "button",
					className: PermissionSelect_module_css_default.trigger,
					"aria-label": t("input.accessMode", { name: currentLabel }),
					title: current?.description,
					disabled: locked || busy,
					onClick: () => {
						setOpen(!open);
					},
					children: [
						permissionGlyph(currentValue) !== void 0 && (0, react_jsx_runtime.jsx)("span", {
							className: PermissionSelect_module_css_default.triggerIcon,
							"aria-hidden": true,
							children: permissionGlyph(currentValue)
						}),
						(0, react_jsx_runtime.jsx)("span", {
							className: PermissionSelect_module_css_default.triggerLabel,
							children: currentLabel
						}),
						(0, react_jsx_runtime.jsx)("span", {
							className: clsx(PermissionSelect_module_css_default.chevron, open && PermissionSelect_module_css_default.chevronOpen),
							"aria-hidden": true,
							children: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronDownOutline14, {})
						})
					]
				})
			}), (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.RiskConfirmation, {
				open: confirmation !== null,
				title: t("access.confirm.title"),
				description: t("access.confirm.description"),
				acknowledgeLabel: t("access.confirm.acknowledge"),
				cancelLabel: t("access.confirm.cancel"),
				closeLabel: t("close"),
				confirmLabel: t("access.confirm.enable"),
				acknowledged,
				disabled: locked,
				onAcknowledgedChange: setAcknowledged,
				onCancel: closeConfirmation,
				onConfirm: confirmFullAccess
			})] });
		}
		//#endregion
		//#region \0dsh-css:/home/runner/work/deepseek-harness/deepseek-harness/packages/client/ui-conversation/src/client/skeleton/InputBar.module.css.mjs
		const css$1 = ".uV2eYG_root{padding:0 var(--dsh-composer-side-clearance) 8px;flex-direction:column;align-items:center;display:flex}.uV2eYG_root:has([data-composer-stats]){padding-bottom:4px}.uV2eYG_hero{padding:0 var(--dsh-composer-side-clearance)}.uV2eYG_notice{width:100%;max-width:var(--dsh-composer-card-max-width);background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-secondary);border-radius:8px;margin-bottom:6px;padding:4px 8px;font-size:12px;line-height:18px}.uV2eYG_card{box-sizing:border-box;width:100%;max-width:var(--dsh-composer-card-max-width);--dsw-elevation-stroke-color:var(--dsw-alias-border-l2);background:var(--dsw-specific-input-major);box-shadow:var(--dsw-elevation-soft);font-size:var(--dsh-content-font-size,14px);line-height:calc(24px + var(--dsh-content-font-delta,0px));--dsh-scrollbar-thumb:var(--dsw-alias-scrollbar-bg-l2);--dsh-scrollbar-thumb-hover:var(--dsw-alias-scrollbar-hover-l2);border:0;border-radius:22px;flex-direction:column;gap:12px;padding-top:8px;display:flex;position:relative}.uV2eYG_cardWorkspaceTrigger{--dsw-elevation-stroke-color:transparent;cursor:pointer}.uV2eYG_cardWorkspaceTrigger:after{content:\"\";background:var(--dsw-alias-border-l4);pointer-events:none;border-radius:22px;transition:background-color .1s;position:absolute;inset:-1px;-webkit-mask:url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='100%25' height='100%25' fill='none' rx='22' ry='22' stroke='black' stroke-width='2' stroke-dasharray='4 4'/%3E%3C/svg%3E\");mask:url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='100%25' height='100%25' fill='none' rx='22' ry='22' stroke='black' stroke-width='2' stroke-dasharray='4 4'/%3E%3C/svg%3E\")}.uV2eYG_cardWorkspaceTrigger :disabled{pointer-events:none}.uV2eYG_cardWorkspaceTrigger:hover:after{background:var(--dsw-alias-state-business-primary)}.uV2eYG_accessory{align-items:center;gap:8px;padding:10px 12px 0;display:flex}.uV2eYG_overlayAnchor{height:0;position:absolute;inset:0 0 auto}.uV2eYG_scroll{max-height:var(--dsh-composer-text-max-height);margin-right:4px;overflow-y:auto}.uV2eYG_scroll::-webkit-scrollbar-track{margin-top:8px}.uV2eYG_grow{position:relative}.uV2eYG_pending{corner-shape:round;background:var(--dsw-alias-state-business-primary);border-radius:50%;width:8px;height:8px;animation:1s ease-in-out infinite alternate uV2eYG_input-pending}@keyframes uV2eYG_input-pending{0%{opacity:.35}to{opacity:1}}.uV2eYG_input{box-sizing:border-box;min-height:36px;font-family:var(--dsw-font-family);font-size:inherit;line-height:inherit;white-space:pre-wrap;word-break:break-word;overflow-wrap:anywhere;color:var(--dsw-alias-label-primary);caret-color:var(--dsw-alias-state-business-primary);outline:none;padding:4px 8px 0 14px}.uV2eYG_input p{margin:0}.uV2eYG_input p:last-child:after{content:var(--dsh-composer-hint);color:var(--dsw-alias-label-caption)}.uV2eYG_placeholder{color:var(--dsw-alias-label-caption);white-space:nowrap;text-overflow:ellipsis;pointer-events:none;user-select:none;position:absolute;inset:4px 8px auto 14px;overflow:hidden}.uV2eYG_inputDisabled{color:var(--dsw-alias-label-tertiary);cursor:not-allowed}.uV2eYG_input[aria-haspopup=menu]{cursor:pointer}.uV2eYG_hero .uV2eYG_input{min-height:52px}.uV2eYG_hero .uV2eYG_placeholder{white-space:normal;-webkit-line-clamp:2;line-clamp:2;-webkit-box-orient:vertical;display:-webkit-box}.uV2eYG_row{flex-wrap:wrap;justify-content:space-between;align-items:center;gap:12px;min-width:0;padding:2px 8px 6px;display:flex;container-type:inline-size}.uV2eYG_tools,.uV2eYG_modes,.uV2eYG_trailing{align-items:center;min-width:0;display:flex}.uV2eYG_tools,.uV2eYG_modes{gap:12px}.uV2eYG_trailing{flex:none;gap:12px;margin-left:auto}.uV2eYG_add{corner-shape:round;background:var(--dsw-specific-selector);width:28px;height:28px;color:var(--dsw-alias-label-primary);cursor:pointer;border:none;border-radius:999px;flex:none;place-items:center;display:grid}.uV2eYG_add:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover-solid)}.uV2eYG_add:disabled{opacity:.5;cursor:default}.uV2eYG_select{max-width:220px;height:28px;color:var(--dsw-alias-label-secondary);white-space:nowrap;cursor:pointer;appearance:none;background-color:#0000;background-image:url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12' fill='none'%3E%3Cpath d='M3 4.5L6 7.5L9 4.5' stroke='%2381858C' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E\");background-position:right 4px center;background-repeat:no-repeat;background-size:12px 12px;border:none;border-radius:8px;outline:none;padding:0 20px 0 8px;font-size:13px;font-weight:500;line-height:20px}.uV2eYG_select:hover:not(:disabled){background-color:var(--dsw-alias-interactive-bg-hover)}.uV2eYG_select:disabled{opacity:.5;cursor:default}.uV2eYG_primary{corner-shape:round;background:var(--dsw-alias-button-info-fill);color:#fff;cursor:pointer;border:none;border-radius:999px;flex:none;place-items:center;width:34px;height:34px;transition:background-color .1s;display:grid;transform:translateY(-2px)}.uV2eYG_primary:hover:not(:disabled){background:var(--dsw-alias-button-info-hover)}.uV2eYG_primary:disabled{opacity:.4;cursor:default}.uV2eYG_retry{color:inherit;cursor:pointer;background:0 0;border:1px solid;border-radius:4px;margin-left:8px;padding:1px 8px;font-size:12px}";
		const tagId$1 = "@deepseek-ai/dsh-client-ui-conversation/InputBar.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$1) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@deepseek-ai/dsh-client-ui-conversation";
			tag.dataset.pluginCss = tagId$1;
			tag.textContent = css$1;
			document.head.appendChild(tag);
		}
		var InputBar_module_css_default = {
			"accessory": "uV2eYG_accessory",
			"add": "uV2eYG_add",
			"card": "uV2eYG_card",
			"cardWorkspaceTrigger": "uV2eYG_cardWorkspaceTrigger",
			"grow": "uV2eYG_grow",
			"hero": "uV2eYG_hero",
			"input": "uV2eYG_input",
			"input-pending": "uV2eYG_input-pending",
			"inputDisabled": "uV2eYG_inputDisabled",
			"modes": "uV2eYG_modes",
			"notice": "uV2eYG_notice",
			"overlayAnchor": "uV2eYG_overlayAnchor",
			"pending": "uV2eYG_pending",
			"placeholder": "uV2eYG_placeholder",
			"primary": "uV2eYG_primary",
			"retry": "uV2eYG_retry",
			"root": "uV2eYG_root",
			"row": "uV2eYG_row",
			"scroll": "uV2eYG_scroll",
			"select": "uV2eYG_select",
			"tools": "uV2eYG_tools",
			"trailing": "uV2eYG_trailing"
		};
		//#endregion
		//#region lib/types/client/skeleton/InputBar.js
		/** The default composer body: the 'conversation.composer.bar' slot entry.
		* Machine state arrives through the standard provide channel
		* (useInput + inputActions); the keyboard/DOM command face and stop arrive
		* through this entry's own inject, whose hooks compartment binds
		* useNotices/useLexicon; layout-phase inputs (variant and placeholder) ride
		* the owner props. Session facts
		* (running/removed/promptError) are self-selected via useSession.
		*
		* The text surface is the shell-owned Lexical editor bound here through
		* ComposerContentEditable; chips render as decorator portals, and the
		* keymap registers submit/menu/paste gestures on the editor command layer.
		* The no-session state renders the SAME div inert as the Workspace-picker
		* trigger instead of a parallel tree.
		*/
		const InputBar = (0, react.memo)(function InputBar({ useSession, useInput, inputActions, keyboard, addFiles, removeAttachment, resolveDraftAttachments, retryFileUpload, toggleCommandMenu, stop, command, t, renderSlot, useBusyEnter, useFileUploads, useNotices, useLexicon, useMenuLauncher, useProjection, sessionId, variant, disabled: inert = false, blocked, workspacePickerOpen = false, onRequestWorkspace, placeholder, accessory }) {
			const input = useInput((s) => s);
			const notice = useNotices((s) => s);
			const busyEnter = useBusyEnter((s) => s);
			const commandMenuOpen = useMenuLauncher((source) => source === "command");
			const promptError = useSession((s) => s.promptError) ?? null;
			const running = useSession((s) => s.running) ?? false;
			const subagent = useSession((s) => s.subagent) ?? null;
			const removed = useSession((s) => s.removed) ?? false;
			const planActive = useProjection("plan", (plan) => plan !== void 0 && (plan.pending ? !plan.active : plan.active));
			const hasGoal = useProjection("goal", (goal) => goal != null);
			const live = input !== void 0 && keyboard !== void 0 && inputActions !== void 0;
			const draft = input?.draft ?? "";
			const editor = keyboard?.editor ?? null;
			const attachments = (0, react.useMemo)(() => input === void 0 || resolveDraftAttachments === void 0 ? [] : resolveDraftAttachments(input.attachmentIds), [resolveDraftAttachments, input?.attachmentIds]);
			const empty = draft.trim() === "" && attachments.length === 0;
			const uploads = useFileUploads((snapshot) => snapshot);
			const uploadsPending = attachments.some((attachment) => attachment.kind === "file" && uploads[attachment.id]?.status !== "ready");
			const [toast, setToast] = (0, react.useState)(null);
			const toastSeq = (0, react.useRef)(0);
			const showToast = (0, react.useCallback)((text) => {
				toastSeq.current += 1;
				setToast({
					seq: toastSeq.current,
					text
				});
			}, []);
			const dismissToast = (0, react.useCallback)(() => {
				setToast(null);
			}, []);
			const imageLimits = useProjection("imageLimits");
			(0, react.useEffect)(() => {
				if (promptError === null) return;
				const { error } = promptError;
				showToast(error.code === "session/attachment-invalid" || error.code === "subagent/attachment-invalid" ? attachmentErrorText(t, error.details.reason, imageLimits) : `${error.message} (${error.code})`);
			}, [
				promptError,
				showToast,
				t,
				imageLimits
			]);
			(0, react.useEffect)(() => {
				if (notice?.level === "error") showToast(notice.text);
			}, [notice, showToast]);
			const cardRef = (0, react.useRef)(null);
			const scrollRef = (0, react.useRef)(null);
			const permissions = useProjection("permissions");
			const continuable = subagent?.address.mode === "continuable";
			const parentOffline = continuable && subagent.parentAvailable !== true;
			const disabled = removed || inert || !live || blocked !== void 0 || parentOffline;
			const locked = disabled;
			const modelSeatLocked = removed || inert || !live;
			const machineBusy = input?.phase === "adjudicating" || input?.phase === "submitting";
			const workspaceTrigger = inert && !removed && onRequestWorkspace !== void 0;
			const editorDisabled = removed || locked && !workspaceTrigger;
			const editable = live && !locked && !machineBusy;
			const steeringAvailable = subagent === null || subagent.address.mode === "continuable";
			const canSteerQueue = !locked && !machineBusy && !commandMenuOpen && empty && running && steeringAvailable && input.queue.some((row) => row.placement === "queued");
			(0, react.useEffect)(() => {
				if (input === void 0 || inputActions === void 0) return;
				if (attachments.length !== input.attachmentIds.length) inputActions.pruneAttachments(attachments.map((attachment) => attachment.id));
			}, [
				attachments,
				input?.attachmentIds,
				inputActions
			]);
			const revealSelection = () => {
				const scrollEl = scrollRef.current;
				if (scrollEl === null || scrollEl.scrollHeight <= scrollEl.clientHeight) return;
				const selection = window.getSelection();
				if (selection === null || selection.rangeCount === 0) return;
				let rect = selection.getRangeAt(0).getBoundingClientRect();
				if (rect.height === 0 && rect.width === 0) {
					const anchor = selection.anchorNode;
					const el = anchor instanceof HTMLElement ? anchor : anchor?.parentElement;
					if (el === void 0 || el === null) return;
					rect = el.getBoundingClientRect();
				}
				const box = scrollEl.getBoundingClientRect();
				if (rect.bottom > box.bottom) scrollEl.scrollTop += rect.bottom - box.bottom;
				else if (rect.top < box.top) scrollEl.scrollTop -= box.top - rect.top;
			};
			(0, react.useEffect)(() => {
				if (locked || editor === null) return;
				editor.getRootElement()?.focus({ preventScroll: true });
				editor.focus(() => {
					revealSelection();
				});
			}, [
				locked,
				sessionId,
				editor
			]);
			(0, react.useEffect)(() => {
				if (locked || draft === "") return;
				revealSelection();
			}, [draft !== ""]);
			(0, react.useEffect)(() => {
				const el = scrollRef.current;
				if (el === null) return;
				const onWheel = (e) => {
					const host = el.closest("[data-conversation-scroll]");
					if (!(host instanceof HTMLElement) || e.deltaY === 0) return;
					const atTop = el.scrollTop <= 0;
					const atEnd = el.scrollTop + el.clientHeight >= el.scrollHeight - 1;
					if (e.deltaY < 0 && !atTop || e.deltaY > 0 && !atEnd) return;
					e.preventDefault();
					host.scrollTop += e.deltaY;
				};
				el.addEventListener("wheel", onWheel, { passive: false });
				return () => {
					el.removeEventListener("wheel", onWheel);
				};
			}, []);
			const intakeFiles = (0, react.useCallback)((files) => {
				if (subagent !== null || addFiles === void 0 || files.length === 0) return;
				const rejected = (() => {
					if (imageLimits !== void 0) {
						const mediaTypes = imageLimits.mediaTypes;
						const images = files.filter((file) => mediaTypes.includes(file.type));
						const imageAttachments = attachments.filter((attachment) => attachment.kind === "image");
						if (imageAttachments.length + images.length > imageLimits.maxImagesPerMessage) return t("image.tooMany", { count: imageLimits.maxImagesPerMessage });
						if (images.some((file) => file.size > imageLimits.maxImageBytes)) return t("image.fileTooLarge", { size: imageSizeText(imageLimits.maxImageBytes) });
						if (imageAttachments.reduce((sum, attachment) => sum + attachment.file.size, 0) + images.reduce((sum, file) => sum + file.size, 0) > imageLimits.maxMessageImageBytes) return t("image.totalTooLarge", { size: imageSizeText(imageLimits.maxMessageImageBytes) });
					}
					return addFiles(files);
				})();
				if (rejected !== null) showToast(rejected);
			}, [
				subagent,
				addFiles,
				attachments,
				imageLimits,
				showToast,
				t
			]);
			const canAcceptDrop = subagent === null && !locked && !machineBusy && addFiles !== void 0;
			const fileInputRef = (0, react.useRef)(null);
			const onPickFiles = (e) => {
				const picked = e.target.files === null ? [] : [...e.target.files];
				e.target.value = "";
				if (picked.length > 0) intakeFiles(picked);
			};
			const gate = (0, react.useRef)({
				locked,
				machineBusy,
				canSteerQueue,
				running,
				steeringAvailable,
				busyEnter,
				intakeFiles,
				uploadsPending,
				showToast,
				t
			});
			gate.current = {
				locked,
				machineBusy,
				canSteerQueue,
				running,
				steeringAvailable,
				busyEnter,
				intakeFiles,
				uploadsPending,
				showToast,
				t
			};
			(0, react.useEffect)(() => {
				if (editor === null || keyboard === void 0) return;
				return registerComposerKeymap(editor, {
					arbitrate: (key, composing) => keyboard.arbitrate(key, composing),
					space: () => {
						if (gate.current.machineBusy || gate.current.locked) return false;
						return keyboard.space();
					},
					dismissPopup: () => {
						keyboard.dismissPopup();
					},
					canSubmit: () => !gate.current.locked && !gate.current.machineBusy,
					submit: (accelerated) => {
						const g = gate.current;
						if (accelerated && g.canSteerQueue) {
							keyboard.steerQueue();
							return;
						}
						if (g.uploadsPending) {
							g.showToast(g.t("file.stillUploading"));
							return;
						}
						keyboard.submit(resolveSubmitMode(g.busyEnter, g.running, accelerated ? "accelerated" : "enter", g.steeringAvailable));
					},
					intakeFiles: (files) => {
						gate.current.intakeFiles(files);
					},
					pasteText: (text) => {
						if (gate.current.machineBusy || gate.current.locked) return;
						keyboard.paste(text);
					}
				});
			}, [editor, keyboard]);
			const keepFocus = (e) => {
				e.preventDefault();
				editor?.getRootElement()?.focus({ preventScroll: true });
			};
			const onToggleCommandMenu = () => {
				if (keyboard !== void 0) toggleCommandMenu?.(keyboard.caretSpan());
			};
			const onWorkspaceKeyDown = (e) => {
				if (!workspaceTrigger) return;
				if (e.key === "Enter" || e.key === " ") {
					e.preventDefault();
					onRequestWorkspace();
				}
			};
			const primaryStops = running && subagent === null && (empty || blocked !== void 0);
			const primaryDisabled = primaryStops ? stop === void 0 : empty || disabled || machineBusy || uploadsPending;
			const interruptible = running && continuable;
			const primarySubmitMode = resolveSubmitMode(busyEnter, running, "enter", steeringAvailable);
			const plainMessageDraft = !empty && input?.phase === "plain" && !draft.trimStart().startsWith("/");
			const primaryLabel = primaryStops ? t("input.stop") : running && steeringAvailable && !disabled && !uploadsPending && plainMessageDraft ? t(primarySubmitMode === "steer" ? "input.send.steer" : "input.send.queue") : t("input.send");
			const onPrimary = () => {
				if (primaryStops) {
					stop?.();
					return;
				}
				if (keyboard === void 0) return;
				/* v8 ignore next -- defensive: the primary button is disabled for empty, disabled, and pending-upload states. */
				if (!empty && !disabled && !machineBusy && !uploadsPending) keyboard.submit(primarySubmitMode);
			};
			const accessSelect = command === void 0 ? null : (0, react_jsx_runtime.jsx)(PermissionSelect, {
				value: permissions,
				locked,
				command,
				t
			}, sessionId);
			const claimActive = (input?.phase === "claimed" || input?.phase === "submitting") && input.claim !== void 0 && draft.startsWith(input.claim.token);
			const rawHint = claimActive && input.claim.hint !== void 0 && draft.slice(input.claim.token.length).trim() === "" ? input.claim.hint : null;
			const hint = (() => {
				if (rawHint === null) return null;
				const commandName = input?.claim?.token.slice(1).trim() ?? "";
				const hintKey = `hint.${commandName === "goal" && hasGoal ? "goal.active" : commandName}`;
				const translated = t(hintKey);
				return translated !== hintKey ? translated : rawHint;
			})();
			const placeholderText = placeholder ?? (parentOffline ? t("placeholder.parentOffline") : disabled ? t("placeholder.unavailable") : canSteerQueue ? t("placeholder.steerQueue") : planActive ? t("placeholder.plan") : t("placeholder.default"));
			return (0, react_jsx_runtime.jsxs)("div", {
				className: clsx(InputBar_module_css_default.root, variant === "hero" && InputBar_module_css_default.hero),
				children: [
					toast !== null && (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Toast, {
						text: toast.text,
						icon: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconWarningOutline16, {}),
						anchor: cardRef.current,
						onDone: dismissToast
					}, toast.seq),
					notice?.level === "info" && (0, react_jsx_runtime.jsx)("div", {
						className: InputBar_module_css_default.notice,
						role: "status",
						children: notice.text
					}),
					(0, react_jsx_runtime.jsxs)("div", {
						ref: cardRef,
						className: clsx(InputBar_module_css_default.card, workspaceTrigger && InputBar_module_css_default.cardWorkspaceTrigger),
						"data-composer-card": true,
						onClick: workspaceTrigger ? onRequestWorkspace : void 0,
						onPointerDown: workspaceTrigger ? (e) => {
							e.stopPropagation();
						} : void 0,
						children: [
							sessionId !== void 0 && (0, react_jsx_runtime.jsx)("div", {
								className: InputBar_module_css_default.overlayAnchor,
								children: renderSlot("conversation.input.overlay", {})
							}),
							accessory !== void 0 && (0, react_jsx_runtime.jsx)("div", {
								className: InputBar_module_css_default.accessory,
								children: accessory
							}),
							renderSlot("conversation.input.attachments", {
								attachments,
								canAcceptDrop,
								onAddFiles: intakeFiles,
								onRemoveAttachment: (id) => {
									removeAttachment?.(id);
								},
								uploads,
								onRetryFile: (id) => {
									retryFileUpload?.(id);
								},
								dropLimits: imageLimits === void 0 ? void 0 : {
									count: imageLimits.maxImagesPerMessage,
									size: imageSizeText(imageLimits.maxImageBytes)
								}
							}),
							(0, react_jsx_runtime.jsx)("div", {
								ref: scrollRef,
								className: InputBar_module_css_default.scroll,
								"data-input-scroll": true,
								children: (0, react_jsx_runtime.jsxs)("div", {
									className: InputBar_module_css_default.grow,
									children: [
										(0, react_jsx_runtime.jsx)(ComposerContentEditable, {
											editor: workspaceTrigger ? null : editor,
											editable,
											className: clsx(InputBar_module_css_default.input, editorDisabled && InputBar_module_css_default.inputDisabled),
											"data-phase": input?.phase ?? "inert",
											"aria-disabled": editorDisabled || void 0,
											"data-placeholder": placeholderText,
											"aria-label": workspaceTrigger ? t("hero.chooseWorkspace") : placeholderText,
											"aria-haspopup": workspaceTrigger ? "menu" : void 0,
											"aria-expanded": workspaceTrigger ? workspacePickerOpen : void 0,
											tabIndex: workspaceTrigger ? 0 : void 0,
											onKeyDown: workspaceTrigger ? onWorkspaceKeyDown : void 0,
											style: hint === null ? void 0 : { "--dsh-composer-hint": JSON.stringify(hint) }
										}),
										draft === "" && attachments.length === 0 && !claimActive && (0, react_jsx_runtime.jsx)("div", {
											"aria-hidden": true,
											className: InputBar_module_css_default.placeholder,
											"data-composer-placeholder": true,
											children: placeholderText
										}),
										(0, react_jsx_runtime.jsx)(DecoratorPortals, { editor: workspaceTrigger ? null : editor })
									]
								})
							}),
							(0, react_jsx_runtime.jsxs)("div", {
								className: InputBar_module_css_default.row,
								children: [(0, react_jsx_runtime.jsxs)("div", {
									className: InputBar_module_css_default.tools,
									children: [
										(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Tooltip, {
											label: t("input.commands"),
											side: "top",
											delayMs: 500,
											children: (0, react_jsx_runtime.jsx)("button", {
												type: "button",
												className: InputBar_module_css_default.add,
												"aria-label": t("input.commands"),
												"aria-haspopup": "listbox",
												"aria-expanded": commandMenuOpen,
												disabled: locked || toggleCommandMenu === void 0,
												onMouseDown: keepFocus,
												onClick: onToggleCommandMenu,
												children: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconPlusOutline16, { size: 14 })
											})
										}),
										(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Tooltip, {
											label: t("file.attach"),
											side: "top",
											delayMs: 500,
											children: (0, react_jsx_runtime.jsx)("button", {
												type: "button",
												className: InputBar_module_css_default.add,
												"aria-label": t("file.attach"),
												disabled: subagent !== null || locked || machineBusy || addFiles === void 0,
												onMouseDown: keepFocus,
												onClick: () => {
													fileInputRef.current?.click();
												},
												children: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconPaperclipOutline16, { size: 14 })
											})
										}),
										(0, react_jsx_runtime.jsx)("input", {
											ref: fileInputRef,
											type: "file",
											multiple: true,
											disabled: subagent !== null,
											hidden: true,
											onChange: onPickFiles
										}),
										(0, react_jsx_runtime.jsxs)("div", {
											className: InputBar_module_css_default.modes,
											children: [accessSelect, sessionId === void 0 ? null : renderSlot("conversation.input.plan", { locked })]
										}),
										input === void 0 || sessionId === void 0 ? null : renderSlot("conversation.input.left", {})
									]
								}), (0, react_jsx_runtime.jsxs)("div", {
									className: InputBar_module_css_default.trailing,
									children: [
										input === void 0 || sessionId === void 0 ? null : renderSlot("conversation.input.right", {}),
										sessionId === void 0 ? null : renderSlot("conversation.input.model", { locked: modelSeatLocked }),
										(0, react_jsx_runtime.jsx)(ContextMeter, {
											useProjection,
											t
										}),
										interruptible && (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Tooltip, {
											label: t("input.stop"),
											side: "top",
											delayMs: 500,
											disabled: stop === void 0,
											children: (0, react_jsx_runtime.jsx)("button", {
												type: "button",
												className: InputBar_module_css_default.primary,
												"aria-label": t("input.stop"),
												disabled: stop === void 0,
												onMouseDown: keepFocus,
												onClick: stop,
												children: (0, react_jsx_runtime.jsx)("svg", {
													viewBox: "0 0 16 16",
													width: "16",
													height: "16",
													"aria-hidden": true,
													children: (0, react_jsx_runtime.jsx)("rect", {
														x: "3",
														y: "3",
														width: "10",
														height: "10",
														rx: "3",
														fill: "currentColor"
													})
												})
											})
										}),
										(0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Tooltip, {
											label: primaryLabel,
											side: "top",
											delayMs: 500,
											disabled: primaryDisabled,
											children: (0, react_jsx_runtime.jsx)("button", {
												type: "button",
												className: InputBar_module_css_default.primary,
												"aria-label": primaryLabel,
												disabled: primaryDisabled,
												onMouseDown: keepFocus,
												onClick: onPrimary,
												children: primaryStops ? (0, react_jsx_runtime.jsx)("svg", {
													viewBox: "0 0 16 16",
													width: "16",
													height: "16",
													"aria-hidden": true,
													children: (0, react_jsx_runtime.jsx)("rect", {
														x: "3",
														y: "3",
														width: "10",
														height: "10",
														rx: "3",
														fill: "currentColor"
													})
												}) : (0, react_jsx_runtime.jsx)("svg", {
													viewBox: "0 0 16 16",
													width: "16",
													height: "16",
													"aria-hidden": true,
													children: (0, react_jsx_runtime.jsx)("path", {
														d: "M8.3125 0.980183C8.66767 1.0531 8.97902 1.20418 9.2627 1.43233C9.48724 1.61297 9.73029 1.85793 9.97949 2.10714L14.707 6.83468L13.293 8.24874L9 3.95577V15.0417H7V3.95577L2.70703 8.24874L1.29297 6.83468L6.02051 2.10714C6.26971 1.85793 6.51277 1.61297 6.7373 1.43233C6.97662 1.23986 7.28445 1.04402 7.6875 0.980183C7.8973 0.947006 8.1031 0.95516 8.3125 0.980183Z",
														fill: "currentColor"
													})
												})
											})
										})
									]
								})]
							})
						]
					}),
					variant === "composer" && input !== void 0 && sessionId !== void 0 ? renderSlot("conversation.composer.dock", {}) : null
				]
			});
		});
		//#endregion
		//#region \0dsh-css:/home/runner/work/deepseek-harness/deepseek-harness/packages/client/ui-conversation/src/client/skeleton/TodoPanel.module.css.mjs
		const css = ".lXshSW_root{box-sizing:border-box;width:calc(100% - var(--dsh-composer-side-clearance) - var(--dsh-composer-side-clearance) - var(--dsh-composer-dock-inset) - var(--dsh-composer-dock-inset) - var(--dsh-composer-dock-inset) - var(--dsh-composer-dock-inset));max-width:calc(var(--dsh-composer-card-max-width) - var(--dsh-composer-dock-inset) - var(--dsh-composer-dock-inset) - var(--dsh-composer-dock-inset) - var(--dsh-composer-dock-inset));border:.5px solid var(--dsw-alias-border-l1);background:var(--dsw-specific-tip);--dsh-scrollbar-thumb:var(--dsw-alias-scrollbar-bg-l2);--dsh-scrollbar-thumb-hover:var(--dsw-alias-scrollbar-hover-l2);border-radius:12px;flex:none;margin:0 auto;overflow:hidden}.lXshSW_body{flex-direction:column;gap:8px;padding:6px 12px;display:flex}.lXshSW_header{text-align:left;cursor:pointer;background:0 0;border:none;align-items:center;gap:10px;width:100%;padding:0;display:flex}.lXshSW_lead{color:var(--dsw-alias-label-tertiary);flex:none;place-items:center;display:grid}.lXshSW_title{color:var(--dsw-alias-label-primary);flex:none;font-size:13px;font-weight:500;line-height:24px}.lXshSW_progress{min-width:0;color:var(--dsw-alias-label-tertiary);text-overflow:ellipsis;white-space:nowrap;flex:auto;font-size:13px;font-weight:400;line-height:20px;overflow:hidden}.lXshSW_chevron{color:var(--dsw-alias-label-tertiary);flex:none;place-items:center;display:grid}.lXshSW_list{flex-direction:column;gap:8px;max-height:180px;margin:0;padding:0;list-style:none;display:flex;overflow-y:auto}.lXshSW_item{min-width:0;color:var(--dsw-alias-label-secondary);align-items:center;gap:10px;font-size:13px;line-height:20px;display:flex}.lXshSW_glyph{flex:none;place-items:center;width:16px;height:16px;display:grid}.lXshSW_glyphCompleted{color:var(--dsw-alias-state-success-primary)}.lXshSW_glyphPending{color:var(--dsw-alias-label-caption)}.lXshSW_glyphProgress{color:var(--dsw-alias-state-business-primary);animation:1s linear infinite lXshSW_todo-progress-spin}@keyframes lXshSW_todo-progress-spin{to{transform:rotate(360deg)}}.lXshSW_content{text-overflow:ellipsis;white-space:nowrap;min-width:0;overflow:hidden}";
		const tagId = "@deepseek-ai/dsh-client-ui-conversation/TodoPanel.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@deepseek-ai/dsh-client-ui-conversation";
			tag.dataset.pluginCss = tagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}
		var TodoPanel_module_css_default = {
			"body": "lXshSW_body",
			"chevron": "lXshSW_chevron",
			"content": "lXshSW_content",
			"glyph": "lXshSW_glyph",
			"glyphCompleted": "lXshSW_glyphCompleted",
			"glyphPending": "lXshSW_glyphPending",
			"glyphProgress": "lXshSW_glyphProgress",
			"header": "lXshSW_header",
			"item": "lXshSW_item",
			"lead": "lXshSW_lead",
			"list": "lXshSW_list",
			"progress": "lXshSW_progress",
			"root": "lXshSW_root",
			"title": "lXshSW_title",
			"todo-progress-spin": "lXshSW_todo-progress-spin"
		};
		//#endregion
		//#region lib/types/client/skeleton/TodoPanel.js
		/** Local exhaustiveness helper — client packages do not depend on `dsh-llm`. */
		/* v8 ignore next 3 -- closed-union backstop; only reached if status is forged */
		function assertNever(value) {
			throw new Error(`unreachable todo status: ${String(value)}`);
		}
		/** Status glyphs share the figma 14×14 artboard; the 16×16 `.glyph` cell centers them. */
		function CompletedGlyph() {
			return (0, react_jsx_runtime.jsxs)("svg", {
				width: 14,
				height: 14,
				viewBox: "0 0 14 14",
				fill: "none",
				"aria-hidden": "true",
				className: TodoPanel_module_css_default.glyphCompleted,
				children: [(0, react_jsx_runtime.jsx)("circle", {
					cx: "7",
					cy: "7",
					r: "6.4",
					stroke: "currentColor",
					strokeWidth: "1.2"
				}), (0, react_jsx_runtime.jsx)("path", {
					d: "M10.9631 5.71411L7.70154 8.97571C7.48011 9.19714 7.27736 9.40099 7.09229 9.54993C6.89742 9.70669 6.66314 9.85279 6.3634 9.90027C6.2049 9.92534 6.04339 9.92534 5.88489 9.90027C5.58515 9.85279 5.35087 9.70669 5.15601 9.54993C4.97093 9.40099 4.76818 9.19714 4.54675 8.97571L3.03516 7.46411L3.96313 6.53613L5.47473 8.04773C5.7169 8.28989 5.86196 8.43389 5.97888 8.52795C6.08597 8.61409 6.10875 8.60701 6.08997 8.604C6.11259 8.60758 6.13571 8.60758 6.15833 8.604C6.13954 8.60701 6.16232 8.61409 6.26941 8.52795C6.38633 8.43389 6.53139 8.28989 6.77356 8.04773L10.0352 4.78613L10.9631 5.71411Z",
					fill: "currentColor"
				})]
			});
		}
		/** In-progress: business-blue ring fading out; CSS spins the svg. */
		function ProgressGlyph() {
			const gradientId = (0, react.useId)();
			return (0, react_jsx_runtime.jsxs)("svg", {
				width: 14,
				height: 14,
				viewBox: "0 0 14 14",
				fill: "none",
				"aria-hidden": "true",
				className: TodoPanel_module_css_default.glyphProgress,
				children: [(0, react_jsx_runtime.jsx)("defs", { children: (0, react_jsx_runtime.jsxs)("linearGradient", {
					id: gradientId,
					x1: "2.5",
					y1: "12",
					x2: "10.5",
					y2: "3.5",
					gradientUnits: "userSpaceOnUse",
					children: [(0, react_jsx_runtime.jsx)("stop", { stopColor: "currentColor" }), (0, react_jsx_runtime.jsx)("stop", {
						offset: "1",
						stopColor: "currentColor",
						stopOpacity: "0"
					})]
				}) }), (0, react_jsx_runtime.jsx)("circle", {
					cx: "7",
					cy: "7",
					r: "6.4",
					stroke: `url(#${gradientId})`,
					strokeWidth: "1.2"
				})]
			});
		}
		/** Pending: dashed unstarted ring (figma dash 2.4 2.4). */
		function PendingGlyph() {
			return (0, react_jsx_runtime.jsx)("svg", {
				width: 14,
				height: 14,
				viewBox: "0 0 14 14",
				fill: "none",
				"aria-hidden": "true",
				className: TodoPanel_module_css_default.glyphPending,
				children: (0, react_jsx_runtime.jsx)("circle", {
					cx: "7",
					cy: "7",
					r: "6.4",
					stroke: "currentColor",
					strokeWidth: "1.2",
					strokeDasharray: "2.4 2.4"
				})
			});
		}
		function StatusGlyph({ status }) {
			switch (status) {
				case "completed": return (0, react_jsx_runtime.jsx)(CompletedGlyph, {});
				case "in_progress": return (0, react_jsx_runtime.jsx)(ProgressGlyph, {});
				case "pending": return (0, react_jsx_runtime.jsx)(PendingGlyph, {});
				/* v8 ignore next -- closed TodoItem status union */
				default: return assertNever(status);
			}
		}
		/** Header summary: "·"-joined per-status counts; zero-count segments are omitted as noise (a non-empty list keeps at least one). */
		function progressLabel(todos, t) {
			const done = todos.filter((item) => item.status === "completed").length;
			const active = todos.filter((item) => item.status === "in_progress").length;
			const pending = todos.length - done - active;
			return [
				...done > 0 ? [t("todo.progress.done", { done })] : [],
				...active > 0 ? [t("todo.progress.active", { active })] : [],
				...pending > 0 ? [t("todo.progress.pending", { pending })] : []
			].join(" · ");
		}
		function TodoPanel({ todos, t }) {
			const [collapsed, setCollapsed] = (0, react.useState)(true);
			if (todos.length === 0) return null;
			return (0, react_jsx_runtime.jsx)("section", {
				className: TodoPanel_module_css_default.root,
				"data-testid": "todo-panel",
				"aria-label": t("todo.title"),
				children: (0, react_jsx_runtime.jsxs)("div", {
					className: TodoPanel_module_css_default.body,
					children: [(0, react_jsx_runtime.jsxs)("button", {
						type: "button",
						className: TodoPanel_module_css_default.header,
						"aria-expanded": !collapsed,
						onClick: () => {
							setCollapsed((v) => !v);
						},
						children: [
							(0, react_jsx_runtime.jsx)("span", {
								className: TodoPanel_module_css_default.lead,
								"aria-hidden": true,
								children: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChecklistOutline14, {})
							}),
							(0, react_jsx_runtime.jsx)("span", {
								className: TodoPanel_module_css_default.title,
								children: t("todo.title")
							}),
							(0, react_jsx_runtime.jsx)("span", {
								className: TodoPanel_module_css_default.progress,
								children: progressLabel(todos, t)
							}),
							(0, react_jsx_runtime.jsx)("span", {
								className: TodoPanel_module_css_default.chevron,
								"aria-hidden": true,
								children: collapsed ? (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronUpOutline14, {}) : (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronDownOutline14, {})
							})
						]
					}), !collapsed && (0, react_jsx_runtime.jsx)("ul", {
						className: TodoPanel_module_css_default.list,
						children: todos.map((item) => (0, react_jsx_runtime.jsxs)("li", {
							className: TodoPanel_module_css_default.item,
							"data-status": item.status,
							children: [(0, react_jsx_runtime.jsx)("span", {
								className: TodoPanel_module_css_default.glyph,
								"aria-hidden": true,
								children: (0, react_jsx_runtime.jsx)(StatusGlyph, { status: item.status })
							}), (0, react_jsx_runtime.jsx)("span", {
								className: TodoPanel_module_css_default.content,
								children: item.content
							})]
						}, item.content))
					})]
				})
			});
		}
		/** Renders the current todo projection, or nothing when it is absent. */
		function TodoDock({ useProjection, t }) {
			return (0, react_jsx_runtime.jsx)(TodoPanel, {
				todos: useProjection("todos") ?? [],
				t
			});
		}
		/** Registers the projected todo dock. */
		const todoDockEntry = {
			name: "conversation-todo-dock",
			inject: ["slots"],
			apply(ctx) {
				ctx.slots.inject("conversation.input.dock", () => ctx.slots.register({
					name: "conversation.input.dock",
					id: "todo",
					order: 0,
					locale: NS
				}, TodoDock));
			}
		};
		//#endregion
		//#region lib/types/client/apply.js
		/** Services required by the Conversation plugin. */
		const inject = [
			"slots",
			"sessions",
			"fileUpload",
			"uiSession",
			"uiWorkspace",
			"locale",
			"settingsScope"
		];
		/** Validated Conversation runtime configuration. */
		const Config = Schema.object({ maxConcurrentFileUploads: Schema.natural().min(1).default(2) });
		const ABSENT_NOTICES = {
			getSnapshot: () => null,
			subscribe: () => () => {}
		};
		const ABSENT_BLOCK = {
			getSnapshot: () => void 0,
			subscribe: () => () => {}
		};
		const EMPTY_LEXICON = /* @__PURE__ */ new Map();
		const ABSENT_LEXICON = {
			getSnapshot: () => EMPTY_LEXICON,
			subscribe: () => () => {}
		};
		const ABSENT_MENU_LAUNCHER = {
			getSnapshot: () => null,
			subscribe: () => () => {}
		};
		const EMPTY_FILE_UPLOADS = {};
		const ABSENT_FILE_UPLOADS = {
			getSnapshot: () => EMPTY_FILE_UPLOADS,
			subscribe: () => () => {}
		};
		/** Resolve the session-scoped Conversation action face, failing loud. */
		function scopedConversation(sessions, id) {
			const scoped = sessions.scope(id);
			if (scoped === void 0) throw new Error(`ui-conversation: session "${id}" resolved no scope`);
			const conversation = scoped.get("conversation");
			if (conversation === void 0) throw new Error("ui-conversation: conversation service unavailable through the session scope");
			return conversation;
		}
		/** Resolve package-internal attachment operations from the public service. */
		function concreteConversation(ctx) {
			const conversation = ctx.get("conversation");
			if (conversation === void 0) throw new Error("ui-conversation: conversation service unavailable");
			return conversation;
		}
		/**
		* Mount the Conversation core and target-neutral presentation.
		* @param ctx - Client root context.
		*/
		function apply(ctx, config = Config({})) {
			const sessions = ctx.sessions;
			const slots = ctx.slots;
			const maxConcurrentFileUploads = config.maxConcurrentFileUploads;
			const workspaceNavigation = ctx.get("uiWorkspace");
			const uiConversation = new UiConversation(ctx, sessions);
			ctx.effect(() => ctx.locale.register(NS, {
				zh,
				en
			}), "ui-conversation: dictionaries");
			const t = ctx.locale.bind(NS);
			const conversationStore = createConversationStore();
			const submissionPolicy = new ComposerSubmissionPolicy(ctx.settingsScope.bind({ namespace: CONVERSATION_SETTINGS_NAMESPACE }));
			ctx.slots.inject("settings.general.item", () => ctx.slots.register({
				name: "settings.general.item",
				id: "composer-enter",
				order: 20,
				locale: NS,
				inject: () => ({
					hooks: { busyEnter: submissionPolicy.busyEnter },
					setBusyEnter: (behavior) => {
						submissionPolicy.setBusyEnter(behavior);
					}
				})
			}, EnterBehaviorRow));
			const viewTabs = () => {
				const tabs = [];
				for (const entry of slots.entries("conversation.view")) {
					/* v8 ignore next -- list registration validates id at load. */
					if (entry.options.id === void 0) continue;
					tabs.push({
						id: entry.options.id,
						label: (0, _deepseek_ai_dsh_client_ui_slots.resolveSlotLabel)(entry.options.label) ?? entry.options.id
					});
				}
				return tabs;
			};
			const activateView = (sessionId, preferred) => {
				const active = resolveActiveView(viewTabs(), preferred);
				if (active !== void 0) uiConversation.binding(sessionId).activate(active.id);
			};
			const restoreView = (sessionId) => {
				activateView(sessionId, readConversationViewPreference(sessionId));
			};
			const restoreCurrentView = () => {
				const sessionId = sessions.list.getSnapshot().current;
				if (sessionId !== void 0 && sessions.binding(sessionId) !== void 0) restoreView(sessionId);
			};
			const conversationViews = (0, _deepseek_ai_dsh_client_store.createSnapshotStore)(viewTabs());
			const refreshViews = () => {
				const current = conversationViews.getSnapshot();
				const next = viewTabs();
				if (!(current.length === next.length && current.every((tab, index) => {
					const candidate = next.at(index);
					return candidate !== void 0 && tab.id === candidate.id && tab.label === candidate.label;
				}))) conversationViews.set(next);
				restoreCurrentView();
			};
			ctx.effect(() => {
				let currentSessionId = sessions.list.getSnapshot().current;
				const disposeViews = slots.subscribe("conversation.view", refreshViews);
				const disposeLocale = ctx.locale.subscribe(refreshViews);
				const disposeCurrent = sessions.list.subscribe(() => {
					const nextSessionId = sessions.list.getSnapshot().current;
					if (nextSessionId === currentSessionId) return;
					currentSessionId = nextSessionId;
					restoreCurrentView();
				});
				return () => {
					disposeCurrent();
					disposeLocale();
					disposeViews();
				};
			}, "ui-conversation: View selection");
			const inputHub = new InputHub(ctx, t);
			const composerBlocks = new ComposerBlockRegistry();
			ctx.uiSession.provide({
				hooks: ["conversation", "input"],
				props: ["inputActions"],
				resolve: (binding) => {
					const shell = inputHub.shellFor(binding);
					const conversation = uiConversation.binding(binding);
					restoreView(binding.sessionId);
					return {
						hooks: {
							conversation: conversation.snapshot,
							input: shell.state
						},
						props: { inputActions: shell.actions }
					};
				}
			});
			const registerConversationRoot = () => slots.register({
				name: "main.conversation",
				locale: NS,
				children: {
					"conversation.session": {
						kind: "single",
						scope: "session"
					},
					"conversation.session.header": {
						kind: "single",
						scope: "session"
					},
					"conversation.composer": {
						kind: "chain",
						scope: "session"
					},
					"conversation.composer.bar": {
						kind: "single",
						scope: "session-maybe"
					},
					"conversation.input.dock": {
						kind: "list",
						scope: "session"
					},
					"conversation.hero.brand.mark": {
						kind: "single",
						scope: "root"
					},
					"conversation.hero.workspace": {
						kind: "single",
						scope: "root"
					},
					"conversation.hero.agentPreset": {
						kind: "single",
						scope: "root"
					}
				},
				inject: (sessionId) => ({
					hooks: { composerBlock: sessionId === void 0 ? ABSENT_BLOCK : composerBlocks.storeFor(sessionId) },
					selectWorkspace: (workspaceId) => workspaceNavigation.openWorkspace(workspaceId, (nextId) => {
						if (sessionId !== void 0 && nextId !== sessionId) {
							const from = inputHub.shell(sessionId);
							const draft = from.snapshot.draft;
							const attachmentIds = from.snapshot.attachmentIds;
							const next = inputHub.shell(nextId);
							if (attachmentIds.length === 0 || next.addAttachments(attachmentIds)) {
								if (sessions.binding(nextId) === void 0) throw new Error(`ui-conversation: session "${nextId}" resolved no binding`);
								concreteConversation(ctx).rebindDraftFiles(nextId, attachmentIds);
								if (draft !== "") {
									next.setDraft(draft);
									from.setDraft("");
								}
								if (attachmentIds.length > 0) for (const id of attachmentIds) from.removeAttachment(id);
							}
						}
					})
				})
			}, ConversationRoot);
			const registerConversationSession = () => slots.register({
				name: "conversation.session",
				children: { "conversation.view": {
					kind: "list",
					scope: "session"
				} },
				store: conversationStore,
				inject: (sessionId, actions) => ({
					hooks: { conversationViews },
					bindDraftMirror: (write) => inputHub.shell(sessionId).bindMirror(write),
					openView: (view, focus) => {
						activateView(sessionId, view);
						actions.openView(view, focus);
					}
				})
			}, ConversationSession);
			const registerConversationHeader = () => slots.register({
				name: "conversation.session.header",
				locale: NS,
				children: {
					"conversation.session.header.lineage": {
						kind: "single",
						scope: "session"
					},
					"conversation.session.header.actions": {
						kind: "list",
						scope: "session"
					},
					"conversation.session.header.utilities": {
						kind: "list",
						scope: "session"
					},
					"conversation.session.header.corner": {
						kind: "single",
						scope: "session"
					}
				},
				store: conversationStore,
				inject: (sessionId, actions) => ({
					hooks: { conversationViews },
					open: (id) => {
						workspaceNavigation.openSession(id);
					},
					selectView: (view) => {
						activateView(sessionId, view);
						actions.setView(view);
					}
				})
			}, ConversationSessionHeader);
			const registerComposerBar = () => slots.register({
				name: "conversation.composer.bar",
				locale: NS,
				children: {
					"conversation.input.attachments": {
						kind: "single",
						scope: "session-maybe"
					},
					"conversation.input.overlay": {
						kind: "list",
						scope: "session"
					},
					"conversation.input.left": {
						kind: "list",
						scope: "session"
					},
					"conversation.input.plan": {
						kind: "single",
						scope: "session"
					},
					"conversation.input.right": {
						kind: "list",
						scope: "session"
					},
					"conversation.input.model": {
						kind: "single",
						scope: "session"
					},
					"conversation.composer.dock": {
						kind: "list",
						scope: "session"
					}
				},
				inject: (sessionId) => {
					if (sessionId === void 0) return {
						keyboard: void 0,
						addFiles: void 0,
						removeAttachment: void 0,
						resolveDraftAttachments: void 0,
						retryFileUpload: void 0,
						toggleCommandMenu: void 0,
						stop: void 0,
						command: void 0,
						hooks: {
							busyEnter: submissionPolicy.busyEnter,
							fileUploads: ABSENT_FILE_UPLOADS,
							notices: ABSENT_NOTICES,
							lexicon: ABSENT_LEXICON,
							menuLauncher: ABSENT_MENU_LAUNCHER
						}
					};
					const conversation = concreteConversation(ctx);
					const shell = inputHub.shell(sessionId);
					const inputTriggers = inputHub.inputTriggers(sessionId);
					return {
						keyboard: shell,
						addFiles: (files) => {
							if (sessions.binding(sessionId) === void 0) return t("file.sessionUnavailable");
							try {
								const drafts = conversation.createDrafts(sessionId, files);
								if (!shell.addAttachments(drafts.map((draft) => draft.id))) conversation.releaseDraftAttachments(drafts);
								return null;
							} catch (error) {
								if (error instanceof UnsupportedImageMediaTypeError) return t("image.unsupportedType");
								return error instanceof Error ? error.message : String(error);
							}
						},
						removeAttachment: (id) => {
							if (shell.removeAttachment(id)) conversation.releaseDraftAttachment(id);
						},
						resolveDraftAttachments: (ids) => conversation.resolveDraftAttachments(ids),
						retryFileUpload: (id) => {
							if (sessions.binding(sessionId) !== void 0) conversation.retryFileUpload(sessionId, id);
						},
						toggleCommandMenu: inputTriggers === void 0 ? void 0 : (selection) => {
							shell.dismissPopup();
							const snapshot = shell.snapshot;
							inputTriggers.toggleSource("command", {
								trigger: "/",
								query: "",
								quoted: false,
								position: snapshot.draft.slice(0, selection.start).trim() === "" ? "leading" : "inline",
								span: {
									...selection,
									draftRev: snapshot.draftRev
								}
							});
						},
						stop: () => {
							scopedConversation(sessions, sessionId).cancel().catch(() => {});
						},
						command: async (line) => {
							const session = sessions.binding(sessionId)?.session;
							if (session === void 0) return false;
							const result = await session.command(line);
							return result.ok && result.value.matched;
						},
						hooks: {
							busyEnter: submissionPolicy.busyEnter,
							fileUploads: conversation.fileUploads,
							notices: shell.notices,
							lexicon: shell.lexicon,
							menuLauncher: inputTriggers?.launcher ?? ABSENT_MENU_LAUNCHER
						}
					};
				}
			}, InputBar);
			slots.inject("main", function* () {
				yield slots.register({
					name: "main",
					key: "conversation",
					children: { "main.conversation": {
						kind: "single",
						scope: "session-maybe"
					} }
				}, ConversationPanel);
				yield registerConversationRoot();
				yield registerConversationSession();
				yield registerConversationHeader();
				yield registerComposerBar();
			});
			ctx.plugin(ConversationController, {
				input: inputHub,
				blocks: composerBlocks,
				maxConcurrentFileUploads
			});
			ctx.plugin(todoDockEntry);
			ctx.plugin(queueDockEntry);
		}
		//#endregion
		exports.Config = Config;
		exports.ConversationController = ConversationController;
		exports.ConversationDefinitionRegistry = ConversationDefinitionRegistry;
		exports.ConversationEventRegistry = ConversationEventRegistry;
		exports.ConversationLocationIndex = ConversationLocationIndex;
		exports.ConversationNodeAssembler = ConversationNodeAssembler;
		exports.ConversationViewRegistry = ConversationViewRegistry;
		exports.EMPTY_CONVERSATION_SNAPSHOT = EMPTY_CONVERSATION_SNAPSHOT;
		exports.UiConversation = UiConversation;
		exports.UnsupportedImageMediaTypeError = UnsupportedImageMediaTypeError;
		exports.apply = apply;
		exports.conversationPhase = conversationPhase;
		exports.inject = inject;
		exports.inspectRequestPrompt = inspectRequestPrompt;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map