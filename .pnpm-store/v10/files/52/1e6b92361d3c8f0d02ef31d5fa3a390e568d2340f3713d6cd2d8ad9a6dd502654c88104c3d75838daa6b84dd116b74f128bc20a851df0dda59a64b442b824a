window.__ModuleLoader__.load({
	id: "@deepseek-ai/dsh-client-connection",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		//#region ../../../vendor/cosmokit/lib/index.js
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
		/** Binary source detection and base64/hex conversion helpers. */
		var Binary;
		(function(Binary) {
			Binary.is = isArrayBufferLike;
			Binary.isSource = isArrayBufferSource;
			function fromSource(source) {
				if (ArrayBuffer.isView(source)) return source.buffer.slice(source.byteOffset, source.byteOffset + source.byteLength);
				else return source;
			}
			Binary.fromSource = fromSource;
			function toBase64(source) {
				source = fromSource(source);
				if (typeof Buffer !== "undefined") return Buffer.from(source).toString("base64");
				let binary = "";
				const bytes = new Uint8Array(source);
				for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
				return btoa(binary);
			}
			Binary.toBase64 = toBase64;
			function fromBase64(source) {
				if (typeof Buffer !== "undefined") return fromSource(Buffer.from(source, "base64"));
				return Uint8Array.from(atob(source), (c) => c.charCodeAt(0));
			}
			Binary.fromBase64 = fromBase64;
			function toHex(source) {
				source = fromSource(source);
				if (typeof Buffer !== "undefined") return Buffer.from(source).toString("hex");
				return Array.from(new Uint8Array(source), (byte) => byte.toString(16).padStart(2, "0")).join("");
			}
			Binary.toHex = toHex;
			function fromHex(source) {
				if (typeof Buffer !== "undefined") return fromSource(Buffer.from(source, "hex"));
				const hex = source.length % 2 === 0 ? source : source.slice(0, source.length - 1);
				const buffer = [];
				for (let i = 0; i < hex.length; i += 2) buffer.push(parseInt(`${hex[i]}${hex[i + 1]}`, 16));
				return Uint8Array.from(buffer).buffer;
			}
			Binary.fromHex = fromHex;
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
		/** Time constants plus parsing and formatting helpers. */
		var Time;
		(function(Time) {
			Time.millisecond = 1;
			Time.second = 1e3;
			Time.minute = Time.second * 60;
			Time.hour = Time.minute * 60;
			Time.day = Time.hour * 24;
			Time.week = Time.day * 7;
			let timezoneOffset = (/* @__PURE__ */ new Date()).getTimezoneOffset();
			function setTimezoneOffset(offset) {
				timezoneOffset = offset;
			}
			Time.setTimezoneOffset = setTimezoneOffset;
			function getTimezoneOffset() {
				return timezoneOffset;
			}
			Time.getTimezoneOffset = getTimezoneOffset;
			function getDateNumber(date = /* @__PURE__ */ new Date(), offset) {
				if (typeof date === "number") date = new Date(date);
				if (offset === void 0) offset = timezoneOffset;
				return Math.floor((date.valueOf() / Time.minute - offset) / 1440);
			}
			Time.getDateNumber = getDateNumber;
			function fromDateNumber(value, offset) {
				const date = new Date(value * Time.day);
				if (offset === void 0) offset = timezoneOffset;
				return new Date(+date + offset * Time.minute);
			}
			Time.fromDateNumber = fromDateNumber;
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
				return (parseFloat(capture[1]) * Time.week || 0) + (parseFloat(capture[2]) * Time.day || 0) + (parseFloat(capture[3]) * Time.hour || 0) + (parseFloat(capture[4]) * Time.minute || 0) + (parseFloat(capture[5]) * Time.second || 0);
			}
			Time.parseTime = parseTime;
			function parseDate(date) {
				const parsed = parseTime(date);
				if (parsed) date = Date.now() + parsed;
				else if (/^\d{1,2}(:\d{1,2}){1,2}$/.test(date)) date = `${(/* @__PURE__ */ new Date()).toLocaleDateString()}-${date}`;
				else if (/^\d{1,2}-\d{1,2}-\d{1,2}(:\d{1,2}){1,2}$/.test(date)) date = `${(/* @__PURE__ */ new Date()).getFullYear()}-${date}`;
				return date ? new Date(date) : /* @__PURE__ */ new Date();
			}
			Time.parseDate = parseDate;
			function format(ms) {
				const abs = Math.abs(ms);
				if (abs >= Time.day - Time.hour / 2) return Math.round(ms / Time.day) + "d";
				else if (abs >= Time.hour - Time.minute / 2) return Math.round(ms / Time.hour) + "h";
				else if (abs >= Time.minute - Time.second / 2) return Math.round(ms / Time.minute) + "m";
				else if (abs >= Time.second) return Math.round(ms / Time.second) + "s";
				return ms + "ms";
			}
			Time.format = format;
			function toDigits(source, length = 2) {
				return source.toString().padStart(length, "0");
			}
			Time.toDigits = toDigits;
			function template(template, time = /* @__PURE__ */ new Date()) {
				return template.replace("yyyy", time.getFullYear().toString()).replace("yy", time.getFullYear().toString().slice(2)).replace("MM", toDigits(time.getMonth() + 1)).replace("dd", toDigits(time.getDate())).replace("hh", toDigits(time.getHours())).replace("mm", toDigits(time.getMinutes())).replace("ss", toDigits(time.getSeconds())).replace("SSS", toDigits(time.getMilliseconds(), 3));
			}
			Time.template = template;
		})(Time || (Time = {}));
		//#endregion
		//#region ../../../vendor/schemastery/lib/index.mjs
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
		//#region lib/types/recovery-config.js
		/** Shared validation for Host-configured and browser-local connection recovery. */
		const MAX_TIMER_MS = 2147483647;
		/** Schema shared by the Host plugin and the Client's recovery input parser. */
		const ConnectionRecoveryConfigSchema = Schema.object({
			backoffBaseMs: Schema.natural().min(1).max(MAX_TIMER_MS).default(500),
			backoffFactor: Schema.number().min(1).max(Number.MAX_VALUE).default(2),
			backoffMaxMs: Schema.natural().min(1).max(MAX_TIMER_MS).default(1e4),
			generationReadyWarnMs: Schema.natural().min(1).max(MAX_TIMER_MS).default(3e3),
			generationReadyTimeoutMs: Schema.natural().min(1).max(MAX_TIMER_MS).default(15e3)
		});
		/**
		* Validate recovery input and supply every timing default before starting work.
		* @param config - Host configuration, page bootstrap data, or direct loop options.
		* @returns validated, complete recovery timing.
		*/
		function resolveConnectionConfig(config = {}) {
			const resolved = ConnectionRecoveryConfigSchema(config);
			if (!Number.isFinite(resolved.backoffFactor)) throw new RangeError("connection recovery backoffFactor must be finite");
			return resolved;
		}
		//#endregion
		//#region lib/types/client/connection.js
		/** Connection generation readiness, cancellation, and continuous recovery. */
		const MANUAL_RECONNECT = /* @__PURE__ */ new Error("connection: manual reconnect requested");
		const NETWORK_STATE_CHANGED = /* @__PURE__ */ new Error("connection: browser network state changed");
		function sleep(ms, signal) {
			return new Promise((resolve) => {
				const t = setTimeout(done, ms);
				signal.addEventListener("abort", done, { once: true });
				function done() {
					clearTimeout(t);
					signal.removeEventListener("abort", done);
					resolve();
				}
			});
		}
		function waitForAbort(signal) {
			if (signal.aborted) return Promise.resolve();
			return new Promise((resolve) => {
				signal.addEventListener("abort", () => {
					resolve();
				}, { once: true });
			});
		}
		/**
		* Opens the registered generation source, reconnecting with exponential backoff on loss.
		* State (generation/attempt) is instance-private, never in the store.
		* Sink exceptions do not kill the generation loop.
		*/
		var ConnectionController = class {
			source;
			sinks;
			generation = 0;
			attempt = 0;
			current = null;
			retryDelay = null;
			running = false;
			immediateRetry = false;
			networkAvailable = true;
			lastState;
			config;
			constructor(source, sinks = {}, config = {}) {
				this.source = source;
				this.sinks = sinks;
				this.config = resolveConnectionConfig(config);
			}
			/** Idempotent: begin the connect/pump/reconnect loop. */
			start() {
				if (this.running) return;
				this.running = true;
				this.loop();
			}
			/** Stop the loop and abort the current generation source. */
			stop() {
				this.running = false;
				this.current?.abort();
				this.current = null;
				this.retryDelay?.abort();
				this.retryDelay = null;
			}
			/** Reset the retry sequence and replace the current generation or retry delay immediately. */
			reconnect() {
				if (!this.running) return;
				this.attempt = 0;
				this.immediateRetry = true;
				this.emitState("connecting");
				if (!this.isRunning()) return;
				this.current?.abort(MANUAL_RECONNECT);
				this.retryDelay?.abort(MANUAL_RECONNECT);
			}
			/**
			* Suspend automatic retries while offline and restart backoff when the network returns.
			* @param available - whether the browser reports network access.
			*/
			setNetworkAvailable(available) {
				if (this.networkAvailable === available) return;
				this.networkAvailable = available;
				this.attempt = 0;
				this.immediateRetry = false;
				if (!this.running) return;
				this.emitState(available ? "connecting" : "disconnected");
				if (!this.isRunning()) return;
				this.current?.abort(NETWORK_STATE_CHANGED);
				this.retryDelay?.abort(NETWORK_STATE_CHANGED);
			}
			backoffCap(attempt) {
				const { backoffBaseMs, backoffFactor, backoffMaxMs } = this.config;
				return Math.min(backoffMaxMs, backoffBaseMs * backoffFactor ** Math.max(0, attempt - 1));
			}
			backoffDelay(attempt) {
				const cap = this.backoffCap(attempt);
				return cap / 2 + Math.random() * (cap / 2);
			}
			/** Re-read retry inputs after a potentially reentrant state sink. */
			isRetryInterrupted(immediate) {
				return this.immediateRetry || !this.networkAvailable && !immediate;
			}
			/** Read through a method: stop() flips the flag across awaits, so narrowing from the loop condition must not stick. */
			isRunning() {
				return this.running;
			}
			/** Re-read both mutable liveness guards after a potentially reentrant sink. */
			isGenerationActive(controller) {
				return this.isRunning() && !controller.signal.aborted;
			}
			async loop() {
				let retry = false;
				while (this.running) {
					if (!this.networkAvailable && !this.immediateRetry) {
						const retryDelay = new AbortController();
						this.retryDelay = retryDelay;
						this.emitState("disconnected");
						await waitForAbort(retryDelay.signal);
						if (this.retryDelay === retryDelay) this.retryDelay = null;
						if (!this.isRunning()) return;
						retry = true;
						continue;
					}
					let manualAttempt = false;
					if (retry) {
						const immediate = this.immediateRetry;
						this.immediateRetry = false;
						if (immediate) this.attempt = 0;
						manualAttempt = immediate;
						const attempt = ++this.attempt;
						this.emitState("connecting");
						if (!this.isRunning()) return;
						if (this.isRetryInterrupted(immediate)) continue;
						if (!immediate) {
							const retryDelay = new AbortController();
							this.retryDelay = retryDelay;
							await sleep(this.backoffDelay(attempt), retryDelay.signal);
							if (this.retryDelay === retryDelay) this.retryDelay = null;
							if (!this.isRunning()) return;
							if (retryDelay.signal.aborted) continue;
						}
						console.warn(`[connection] connection lost, retry #${String(attempt)}`);
						this.callSink(() => {
							this.sinks.onReconnectRequested?.();
						});
						if (!this.isRunning()) return;
					}
					const gen = ++this.generation;
					const ac = new AbortController();
					this.current = ac;
					let sourceReady = false;
					let resolveReady;
					let rejectReady;
					let rejectSourceLost;
					const ready = new Promise((resolve, reject) => {
						resolveReady = resolve;
						rejectReady = reject;
					});
					const sourceLost = new Promise((_resolve, reject) => {
						rejectSourceLost = reject;
					});
					const reportReady = (host) => {
						if (sourceReady || gen !== this.generation || !this.isGenerationActive(ac)) return;
						sourceReady = true;
						resolveReady(host);
					};
					const failed = new Promise((resolve) => {
						const settle = () => {
							if (gen === this.generation && !ac.signal.aborted) ac.abort();
							resolve();
						};
						Promise.resolve().then(() => this.source(ac.signal, reportReady)).then(() => {
							const error = /* @__PURE__ */ new Error("connection generation ended");
							if (!sourceReady) rejectReady(error);
							rejectSourceLost(error);
							settle();
						}, (error) => {
							const failure = error instanceof Error ? error : new Error("connection generation failed", { cause: error });
							if (!sourceReady) rejectReady(failure);
							rejectSourceLost(failure);
							settle();
						});
					});
					try {
						const host = await Promise.race([waitForReady(ready, this.config, ac.signal), sourceLost]);
						if (ac.signal.aborted) throw new Error("generation aborted during readiness handshake");
						this.attempt = 0;
						this.emitState("connected");
						if (this.isGenerationActive(ac)) this.callSink(() => {
							this.sinks.onConnected?.(host);
						});
					} catch (error) {
						if (!ac.signal.aborted) ac.abort(error);
					}
					await failed;
					if (!this.isRunning()) return;
					if (manualAttempt) this.attempt = 0;
					retry = true;
				}
			}
			/** Deduplicated state emission (sink isolation applies). */
			emitState(state) {
				if (this.lastState === state) return;
				this.lastState = state;
				this.callSink(() => this.sinks.onStateChange?.(state));
			}
			/** Sink exception isolation: a business-layer throw is logged only, never affecting pump or reconnect semantics. */
			callSink(fn) {
				try {
					fn();
				} catch (error) {
					console.error("[connection] connection sink threw:", error);
				}
			}
		};
		/** Report a slow handshake before the hard deadline ends its generation. */
		function waitForReady(ready, config, signal) {
			return new Promise((resolve, reject) => {
				let settled = false;
				const warning = setTimeout(() => {
					console.warn(`[connection] generation is still not ready after ${String(config.generationReadyWarnMs)}ms`);
				}, config.generationReadyWarnMs);
				const timeout = setTimeout(() => {
					const error = /* @__PURE__ */ new Error(`connection generation was not ready within ${String(config.generationReadyTimeoutMs)}ms`);
					console.warn(`[connection] ${error.message}; cancelling generation`);
					finish({ error });
				}, config.generationReadyTimeoutMs);
				const aborted = () => {
					finish({ error: new Error("connection generation aborted", { cause: signal.reason }) });
				};
				const finish = (outcome) => {
					if (settled) return;
					settled = true;
					clearTimeout(warning);
					clearTimeout(timeout);
					signal.removeEventListener("abort", aborted);
					if ("error" in outcome) reject(outcome.error);
					else resolve(outcome.value);
				};
				signal.addEventListener("abort", aborted, { once: true });
				ready.then((value) => {
					finish({ value });
				}, (error) => {
					finish({ error });
				});
			});
		}
		//#endregion
		//#region ../../util/crypto/lib/index.js
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
		//#region ../../util/brand/lib/index.js
		/**
		* Duplicate-install-safe nominal primitive helpers.
		*
		* A brand makes structurally identical strings or numbers non-interchangeable
		* at the type level: a `SessionId` cannot be passed where a `ToolCallId` is
		* expected, and an event sequence cannot be passed as a log offset. Comparison,
		* logging, and serialization retain the underlying primitive behavior.
		*
		* This package owns no concrete domain value and keeps no runtime identity or mutable
		* state, so independently installed copies produce interchangeable values.
		*
		* @module @deepseek-ai/dsh-brand
		*/
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
		//#region ../../util/values/lib/index.js
		/** Duplicate-install-safe JSON and immutable-value helpers. @module @deepseek-ai/dsh-util-values */
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
		//#region ../../llm/llm/lib/types/message.js
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
		/**
		* Create one identified user-role message and freeze it before publication.
		* @param input - complete content and source for a new user message.
		* @returns an immutable user message with a fresh stable identity.
		*/
		function createUserMessage(input) {
			return createMessage({
				...input,
				role: "user"
			});
		}
		/**
		* Create one identified model-produced assistant message and freeze it before publication.
		* @param input - complete content plus the provider, model, and optional replay state for a new assistant message.
		* @returns an immutable assistant message with fixed role/source tags and a fresh stable identity.
		*/
		function createAssistantMessage(input) {
			return createMessage({
				role: "assistant",
				content: input.content,
				source: {
					kind: "model",
					...input.source
				}
			});
		}
		/**
		* Create and freeze one identified system-role message holding a rendered
		* system prompt.
		* @param text - the complete rendered prompt; `''` records "no system prompt".
		* @param plugin - the plugin that assembled the prompt.
		* @returns an immutable system message with a fresh stable identity.
		*/
		function createSystemMessage(text, plugin) {
			return createMessage({
				role: "system",
				content: text.length === 0 ? [] : [{
					type: "text",
					text
				}],
				source: {
					kind: "plugin",
					plugin
				}
			});
		}
		/**
		* Create and freeze one identified tool-result message.
		* @param input - call identity, raw result blocks, and outcome.
		* @returns an immutable user-role tool-result message.
		*/
		function createToolResultMessage(input) {
			return createUserMessage({
				source: {
					kind: "tool",
					callId: input.callId
				},
				content: [{
					type: "tool-result",
					toolCallId: input.callId,
					content: input.content,
					isError: input.isError
				}]
			});
		}
		//#endregion
		//#region ../../llm/llm/lib/types/brand.js
		/**
		* dsh-llm's owned branded ids: tool-call correlation and provider request
		* diagnostics.
		*
		* The `Branded<B>` primitive and stateless constructor live in
		* `@deepseek-ai/dsh-brand` so every owner of a cross-boundary id can brand it
		* without depending on dsh-llm; see that package's README for the
		* nominal-typing policy.
		*
		* @module @deepseek-ai/dsh-llm/brand
		*/
		/**
		* Brand one loop-owned streaming attempt identifier.
		* @param id - the opaque Agent-lifecycle-local identifier.
		* @returns the same string with the attempt-id brand.
		*/
		function LlmAttemptId(id) {
			return brandString(id);
		}
		//#endregion
		//#region ../../llm/llm/lib/types/assistant-stream.js
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
					exactKeys(record, [
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
					exactKeys(record, Object.hasOwn(record, "name") ? [
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
					exactKeys(record, [
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
		function exactKeys(record, keys, label) {
			if (Object.keys(record).length !== keys.length || !keys.every((key) => Object.hasOwn(record, key))) throw new TypeError(`${label} Assistant stream record must contain exactly ${keys.join(", ")}`);
		}
		//#endregion
		//#region ../../core/session/lib/types/types.js
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
		//#region ../../core/session/lib/types/known-event-types.js
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
		//#region ../../core/session/lib/types/surface.js
		/**
		* Surface layer on top of the session event log: an ordered view of events
		* that produce LLM messages. The append-only log remains the source of truth.
		*
		* Browser-safe: web clients consume this subpath export, so it must stay free
		* of `node:` imports (they break the vite bundle).
		*
		* @module @deepseek-ai/dsh-session/surface
		*/
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
		/**
		* Replay a complete session log through the canonical surface fold.
		* @param events - session events in contiguous seq order.
		* @returns detached current sequences and replacement history.
		* @throws when an event violates surface metadata, source-event references, range, or tool-result rewrite rules.
		*/
		function foldSurface(events) {
			const state = createFoldState();
			const replacements = [];
			for (const [index, event] of events.entries()) {
				const replacement = applySurfaceEvent(state, event, SessionSeq(index), events, SessionLogOffset(0));
				if (replacement !== void 0) replacements.push(replacement);
			}
			return {
				nodes: [...state.nodes],
				replacements
			};
		}
		//#endregion
		//#region lib/types/client/random-uuid.js
		/** Browser-safe UUID generation for client-side wire correlation. */
		/**
		* Generate an RFC 4122 version 4 UUID without requiring a secure context.
		* @returns a UUID backed by `crypto.getRandomValues()`, which browsers expose on insecure origins.
		*/
		function randomUuid() {
			const bytes = globalThis.crypto.getRandomValues(new Uint8Array(16));
			const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
			view.setUint8(6, view.getUint8(6) & 15 | 64);
			view.setUint8(8, view.getUint8(8) & 63 | 128);
			const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
			return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
		}
		//#endregion
		//#region lib/types/client/fixture.js
		const FIXTURE_SESSION_SEARCH_RESULT_LIMIT = 20;
		function isFixtureTokenDelta(chunk) {
			switch (chunk.type) {
				case "text-delta":
				case "reasoning-delta": return chunk.text !== "";
				case "tool-call-delta": return chunk.argumentsDelta !== "" || chunk.name !== void 0;
				default: return false;
			}
		}
		function text(t) {
			return [{
				type: "text",
				text: t
			}];
		}
		function userMessage(content, source = { kind: "user" }) {
			return createUserMessage({
				content,
				source
			});
		}
		function assistantMessage(content, model = "fx-1") {
			return createAssistantMessage({
				content,
				source: {
					provider: "fixture",
					model
				}
			});
		}
		function toolResultMessage(callId, content, isError) {
			return createToolResultMessage({
				callId: brandString(callId),
				content,
				isError
			});
		}
		const MARKDOWN_FIXTURE = [
			"# Markdown fixture",
			"",
			"Assistant output renders **strong text**, *emphasis*, and `inline code`.",
			"",
			"- first item",
			"  - nested item",
			"",
			"| Area | State |",
			"| --- | --- |",
			"| history | rendered |",
			"| streaming | stable |",
			"",
			"[DeepSeek](https://www.deepseek.com)",
			"",
			"```ts",
			"const markdown = true",
			"```"
		].join("\n");
		const USER_MARKDOWN_LITERAL = "用户字面量：# 不渲染 `code` [link](https://example.com)";
		/**
		* SGR wrapper for the terminal output sample below: authoring the escapes as
		* `\u001b` keeps literal control bytes out of this source file.
		* @param code - the SGR parameter (an ANSI color or attribute number).
		* @param body - the text the attribute applies to.
		* @returns the body wrapped in the attribute and a reset.
		*/
		function sgr(code, body) {
			return `\u001b[${code}m${body}\u001b[0m`;
		}
		/**
		* Terminal output sample for fixture turn 66, authored to carry every feature
		* the terminal card draws that turn 60's two prompt rows cannot reach:
		* basic-16 SGR foreground runs (green, red, bright-black) that must resolve to
		* `--dsw-*` tokens, a bold run, column-aligned table rows that must scroll
		* rather than fold, more than DEFAULT_TERMINAL_MAX_LINES (16) lines so the
		* height cap collapses the middle. This constant is the visible body; the call
		* site appends the shell result's `[exit code: N]` marker so Client derivation
		* can consume it into the terminal status pill.
		*/
		const TERMINAL_OUTPUT_FIXTURE = [
			sgr(1, "Running 4 checks"),
			`${sgr(32, "✓")} typecheck                                          1.82s`,
			`${sgr(32, "✓")} lint                                               0.94s`,
			`${sgr(32, "✓")} duplication                                        2.10s`,
			`${sgr(31, "✗")} unit                                               8.41s`,
			"",
			sgr(90, "packages/client/ui-primitives/tests/terminal-block.client.spec.tsx"),
			`  ${sgr(31, "FAIL")} caps output at the configured line budget`,
			"    expected 16 lines, received 24",
			"",
			"NAME                        LINES    BRANCHES    FUNCTIONS    UNCOVERED",
			"TerminalBlock.tsx           100%     100%        100%         -",
			"ansi.ts                     100%     100%        100%         -",
			"clipboard.ts                100%     100%        100%         -",
			"CodeBlock.tsx               98.4%    96.2%       100%         41-43",
			"highlight.ts                100%     100%        100%         -",
			"Pill.tsx                    100%     100%        100%         -",
			"StateDot.tsx                100%     100%        100%         -",
			"markdown/Markdown.tsx       100%     100%        100%         -",
			"",
			sgr(31, "1 of 4 checks failed")
		].join("\n");
		/**
		* Structured grep metadata for the search sample (turn 67). `truncated` with a
		* larger `total` than the retained match count exercises the search card's
		* capped indicator; the file with more than CHAT_SEARCH_MAX_LINES rows
		* exercises its head/tail height cap.
		*/
		const SEARCH_MATCHES_FIXTURE = [
			{
				path: "packages/client/ui-primitives/src/SearchBlock.tsx",
				matches: [
					{
						lineNumber: 16,
						line: "export const DEFAULT_SEARCH_MAX_LINES = 16"
					},
					{
						lineNumber: 138,
						line: "export function SearchBlock(props: SearchBlockProps) {"
					},
					{
						lineNumber: 141,
						line: "  const [collapsed, setCollapsed] = useState<ReadonlySet<number>>(() => new Set())"
					}
				]
			},
			{
				path: "packages/client/ui-tool/src/client/tool/models/search-card-model.ts",
				matches: [{
					lineNumber: 45,
					line: "export const CHAT_SEARCH_MAX_LINES = 8"
				}, {
					lineNumber: 130,
					line: "export function searchCardModel(block: ToolCallBlock): SearchCardModel | null {"
				}]
			},
			{
				path: "packages/client/ui-tool/src/client/tool/toolviews/search-row.tsx",
				matches: [
					{
						lineNumber: 34,
						line: "export function SearchRow({ toolName, block, inspect, t }: SearchRowProps) {"
					},
					{
						lineNumber: 36,
						line: "  const search = searchCardModel(block)"
					},
					{
						lineNumber: 56,
						line: "      search={search}"
					},
					{
						lineNumber: 78,
						line: "      yield ctx.slots.register({ name: 'tool.call.toolview', key: 'grep', locale: NS }, SearchRow)"
					}
				]
			}
		];
		const SEARCH_MATCHES_TEXT = [
			"Found 9 of 42 matches",
			"",
			...SEARCH_MATCHES_FIXTURE.map((file) => [file.path, ...file.matches.map((m) => `Line ${m.lineNumber}: ${m.line}`)].join("\n")),
			"",
			"(Full grep result stored at: fixture://spill/grep-66. Read it to see every match.)"
		].join("\n");
		const SEARCH_PATHS_FIXTURE = [
			"packages/client/ui-primitives/src/SearchBlock.tsx",
			"packages/client/ui-primitives/src/SearchBlock.module.css",
			"packages/client/ui-tool/src/client/tool/models/search-card-model.ts",
			"packages/client/ui-tool/src/client/tool/toolviews/search-row.tsx",
			"packages/client/ui-tool/tests/search-card.client.spec.tsx"
		];
		const SEARCH_PATHS_TEXT = [
			...SEARCH_PATHS_FIXTURE,
			"",
			"(Showing 5 of 23 paths. Full sorted result stored at: fixture://spill/glob-67. Read it to see every path.)"
		].join("\n");
		const READ_SAMPLE_FIRST_LINE = 41;
		const READ_SAMPLE_SOURCE = [
			"export interface ReadBlockProps {",
			"  label?: string | undefined",
			"  lines: readonly ReadBlockLine[]",
			"  totalLines: number",
			"  lang?: string | undefined",
			"  maxLines?: number | undefined",
			"  className?: string | undefined",
			"}",
			"",
			"// A windowed read keeps the file line numbers in the gutter.",
			"const marker = \"fixture read sample\""
		];
		const READ_SAMPLE_LINES = READ_SAMPLE_SOURCE.map((text, index) => ({
			number: READ_SAMPLE_FIRST_LINE + index,
			text
		}));
		const READ_SAMPLE_PATH = "packages/client/ui-primitives/src/ReadBlock.tsx";
		const READ_SAMPLE_TOTAL = 180;
		const READ_SAMPLE_LAST_LINE = READ_SAMPLE_FIRST_LINE + READ_SAMPLE_SOURCE.length - 1;
		const READ_SAMPLE_TEXT = [
			`<path>${READ_SAMPLE_PATH}</path>`,
			"<type>file</type>",
			"<content>",
			...READ_SAMPLE_SOURCE.map((text, index) => `${READ_SAMPLE_FIRST_LINE + index}: ${text}`),
			"",
			`(Showing lines ${READ_SAMPLE_FIRST_LINE}-${READ_SAMPLE_LAST_LINE} of ${READ_SAMPLE_TOTAL}. Use offset=${READ_SAMPLE_LAST_LINE + 1} to continue.)`,
			"</content>"
		].join("\n");
		/**
		* The `web_search` result metadata for the web-search turn. The sources cover a
		* titled source with a snippet and date, a hostname-label fallback, and a
		* titled source without a snippet; `truncated` exercises the capped indicator.
		*/
		const WEB_SEARCH_META = {
			answer: "DeepSeek Harness is a plugin-based agent harness on vendored Cordis where **every capability is a plugin**.",
			sources: [
				{
					url: "https://github.com/deepseek-ai/deepseek-harness",
					title: "DeepSeek Harness — plugin-based agent harness",
					snippet: "Everything is a plugin: session, tools, agent-loop, and LLM adapters all mount on the same Cordis context.",
					publishedAt: "2026-07-01"
				},
				{
					url: "https://www.deepseek.com/blog/harness-architecture",
					snippet: "The capability-seam pattern splits each capability into interface, implementation, and consumer packages."
				},
				{
					url: "https://docs.deepseek.com/harness/plugins",
					title: "Writing a harness plugin",
					publishedAt: "2026-06-15"
				}
			],
			truncated: true
		};
		/** The `web_fetch` result metadata for the web-fetch turn. */
		const WEB_FETCH_META = {
			url: "https://www.deepseek.com/blog/harness-architecture",
			statusCode: 200,
			truncated: false
		};
		const DEEPSEEK_REASONING = {
			efforts: [
				{
					id: "off",
					name: "Off"
				},
				{
					id: "high",
					name: "High"
				},
				{
					id: "max",
					name: "Max"
				}
			],
			defaultEffort: "high"
		};
		const OPENAI_REASONING = {
			efforts: [
				{
					id: "off",
					name: "Off"
				},
				{
					id: "medium",
					name: "Medium"
				},
				{
					id: "high",
					name: "High"
				},
				{
					id: "max",
					name: "Max"
				}
			],
			defaultEffort: "medium"
		};
		/** Catalog served by `session/modelCatalog` (fresh copies per call). */
		function fixtureModelGroups() {
			return [{
				id: "deepseek-official",
				name: "DeepSeek",
				models: [{
					id: "deepseek-v4-flash",
					name: "DeepSeek-V4-Flash",
					description: "快速响应",
					reasoning: DEEPSEEK_REASONING
				}, {
					id: "deepseek-v4-pro",
					name: "DeepSeek-V4-Pro",
					description: "复杂任务",
					reasoning: DEEPSEEK_REASONING
				}]
			}, {
				id: "openai",
				name: "OpenAI",
				models: [{
					id: "gpt-5",
					name: "GPT-5",
					reasoning: OPENAI_REASONING
				}]
			}];
		}
		function sid(id) {
			return id;
		}
		const FIXTURE_IMAGE_DATA = "iVBORw0KGgoAAAANSUhEUgAAAKAAAABaCAYAAAA/xl1SAAAAvklEQVR42u3SMQ0AAAjAMIyhELM4AAe8PD1qYFlk9cCXEAEDYkAwIAYEA2JAMCAGBANiQDAgBgQDYkAwIAYEA2JAMCAGBANiQDAgBgQDYkAwIAYEA2JAMCAGxIBCYEAMCAbEgGBADAgGxIBgQAwIBsSAYEAMCAbEgGBADAgGxIBgQAwIBsSAYEAMCAbEgGBADAgGxIAYEAyIAcGAGBAMiAHBgBgQDIgBwYAYEAyIAcGAGBAMiAHBgBgQDIgB4bYWLb6pnOb1xAAAAABJRU5ErkJggg==";
		const FIXTURE_IMAGE_REF = {
			attachmentId: "fixture:image",
			mediaType: "image/png",
			bytes: 247,
			width: 160,
			height: 90,
			name: "fixture-image.png"
		};
		/** Deterministic provider billing attached to fixture assistant messages. */
		function fixtureUsage(turn, step) {
			return {
				inputTokens: 20 + turn % 5,
				outputTokens: 8 + step,
				cacheReadTokens: turn === 0 ? 0 : 80,
				cacheWriteTokens: turn % 10 === 0 ? 4 : 0
			};
		}
		/** Build a lossless settled stream for static fixture messages. */
		function fixtureSettledStream(message, usage, time) {
			const stream = [];
			for (const [index, block] of message.content.entries()) stream.push({
				type: "chunk",
				time,
				chunk: {
					type: "block-start",
					index,
					blockType: block.type
				}
			}, {
				type: "chunk",
				time,
				chunk: {
					type: "block-end",
					index,
					block
				}
			});
			stream.push({
				type: "chunk",
				time,
				chunk: {
					type: "usage",
					usage
				}
			}, {
				type: "chunk",
				time,
				chunk: {
					type: "finish",
					reason: { kind: "stop" }
				}
			});
			return stream;
		}
		/** Rendered system prompt of the fx-alpha history: surface node 0. */
		const FIXTURE_SYSTEM_PROMPT = "你是 DeepSeek Harness 的 fixture 助手。用简洁的中文回答，并在需要时调用工具。";
		/** fx-alpha history script: 75 turns (~150+ messages -> 4 pages at PAGE_MESSAGES=50),
		*  mixing reasoning blocks / tool call+result / context. */
		function buildAlphaLog() {
			const events = [];
			let time = Date.now() - 36e5;
			const push = (e) => {
				const seq = events.length;
				const data = e["data"];
				const nextTime = time + 800;
				const authored = e["type"] === "assistant/message" && data !== void 0 ? {
					...e,
					data: {
						...data,
						usage: fixtureUsage(data["turn"], data["step"]),
						stream: fixtureSettledStream(data["message"], fixtureUsage(data["turn"], data["step"]), nextTime)
					}
				} : e;
				events.push({
					seq,
					time: time = nextTime,
					...authored
				});
				return seq;
			};
			push({
				type: "request/context",
				data: {
					provider: "deepseek-official",
					model: "deepseek-v4-flash",
					contextWindow: 128e3
				}
			});
			for (let turn = 0; turn < 60; turn++) {
				push({
					type: "turn/start",
					data: { turn }
				});
				if (turn === 0) push({
					type: "system/message",
					surfaceOp: "append",
					data: {
						turn,
						step: 0,
						message: createSystemMessage(FIXTURE_SYSTEM_PROMPT, "@deepseek-ai/dsh-system-prompt")
					}
				});
				const userSeq = push({
					type: "user/message",
					surfaceOp: "append",
					data: userMessage(text(turn === 59 ? USER_MARKDOWN_LITERAL : `问题 ${turn}：fixture 历史消息，用于翻页与渲染验收。`))
				});
				if (turn === 0) push({
					type: "session/title",
					data: {
						title: "Fixture 历史会话",
						messageSeqs: [userSeq],
						source: { kind: "fallback" }
					}
				});
				if (turn % 9 === 4) push({
					type: "user/message",
					surfaceOp: "append",
					data: userMessage(text(`[fixture] 上下文注入（turn ${turn}）`), {
						kind: "plugin",
						plugin: "fixture"
					})
				});
				push({
					type: "step/start",
					data: {
						turn,
						step: 0
					}
				});
				const withTool = turn % 5 === 2;
				const withReasoning = turn % 3 === 1;
				const blocks = [];
				if (withReasoning) blocks.push({
					type: "reasoning",
					text: `思考过程 ${turn}：这是一段可折叠的 reasoning 内容。`
				});
				blocks.push({
					type: "text",
					text: turn === 59 ? MARKDOWN_FIXTURE : `回答 ${turn}：这是 fixture 生成的历史回复正文。`
				});
				if (withTool) {
					const callId = `fx-call-${turn}`;
					blocks.push({
						type: "tool-call",
						id: callId,
						name: "echo",
						arguments: `{"text":"turn ${turn}"}`
					});
					push({
						type: "assistant/message",
						surfaceOp: "append",
						data: {
							turn,
							step: 0,
							message: assistantMessage(blocks)
						}
					});
					push({
						type: "tool/call",
						data: {
							turn,
							step: 0,
							callId,
							name: "echo",
							arguments: `{"text":"turn ${turn}"}`
						}
					});
					push({
						type: "tool/result",
						surfaceOp: "append",
						data: {
							turn,
							step: 0,
							message: toolResultMessage(callId, text(`ECHO: TURN ${turn}`), turn % 25 === 12)
						}
					});
					push({
						type: "step/end",
						data: {
							turn,
							step: 0
						}
					});
					push({
						type: "step/start",
						data: {
							turn,
							step: 1
						}
					});
					push({
						type: "assistant/message",
						surfaceOp: "append",
						data: {
							turn,
							step: 1,
							message: assistantMessage(text(`工具结果已消化（turn ${turn}）。`))
						}
					});
					push({
						type: "step/end",
						data: {
							turn,
							step: 1
						}
					});
				} else {
					push({
						type: "assistant/message",
						surfaceOp: "append",
						data: {
							turn,
							step: 0,
							message: assistantMessage(blocks)
						}
					});
					push({
						type: "step/end",
						data: {
							turn,
							step: 0
						}
					});
				}
				push({
					type: "turn/end",
					data: {
						turn,
						reason: { kind: "completed" }
					}
				});
			}
			const toolTurn = (turn, name, args, resultText, resultMeta) => {
				const callId = `fx-call-${turn}`;
				push({
					type: "turn/start",
					data: { turn }
				});
				push({
					type: "user/message",
					surfaceOp: "append",
					data: userMessage(text(`问题 ${turn}：${name} 样本。`))
				});
				push({
					type: "step/start",
					data: {
						turn,
						step: 0
					}
				});
				push({
					type: "assistant/message",
					surfaceOp: "append",
					data: {
						turn,
						step: 0,
						message: assistantMessage([{
							type: "tool-call",
							id: callId,
							name,
							arguments: args
						}])
					}
				});
				push({
					type: "tool/call",
					data: {
						turn,
						step: 0,
						callId,
						name,
						arguments: args
					}
				});
				push({
					type: "tool/result",
					surfaceOp: "append",
					data: {
						turn,
						step: 0,
						message: toolResultMessage(callId, text(resultText), false),
						...resultMeta === void 0 ? {} : { meta: resultMeta }
					}
				});
				push({
					type: "step/end",
					data: {
						turn,
						step: 0
					}
				});
				push({
					type: "turn/end",
					data: {
						turn,
						reason: { kind: "completed" }
					}
				});
			};
			toolTurn(60, "bash", "{\"command\":\"ls -la\\necho done\",\"description\":\"fixture 终端样本\",\"workdir\":\"/tmp/fixture\"}", "total 2\ndrwxr-xr-x fixture\n-rw-r--r-- demo.txt");
			toolTurn(61, "write", "{\"file_path\":\"notes/demo.txt\",\"content\":\"hello fixture\\n\"}", "wrote notes/demo.txt", { diffs: [{
				path: "notes/demo.txt",
				oldText: null,
				newText: "hello fixture\n"
			}] });
			toolTurn(62, "edit", "{\"file_path\":\"notes/demo.txt\",\"old_string\":\"hello\",\"new_string\":\"hello fixture\"}", "已编辑", { diffs: [{
				path: "notes/demo.txt",
				oldText: "hello",
				newText: "hello fixture"
			}] });
			toolTurn(63, "write", "{\"file_path\":\"notes/new-demo.txt\",\"content\":\"hello fixture\\n\"}", "已写入", { diffs: [{
				path: "notes/new-demo.txt",
				oldText: null,
				newText: "hello fixture\n"
			}] });
			toolTurn(64, "edit", "{\"file_path\":\"src/config.ts\",\"old_string\":\"const timeout = 30\",\"new_string\":\"const timeout = 60\"}", "已编辑", { diffs: [{
				path: "src/config.ts",
				oldText: "const timeout = 30",
				newText: "const timeout = 60"
			}, {
				path: "src/config.ts",
				oldText: "retries: 1",
				newText: "retries: 3"
			}] });
			{
				const turn = 65;
				const callId = `fx-call-${turn}`;
				const args = JSON.stringify({
					code: "const listing = await tools.bash({ command: \"ls notes\", description: \"List notes\" })\nconst demo = await tools.read({ file_path: \"notes/demo.txt\" })\nawait tools.read({ file_path: \"notes/missing.txt\" }).catch(() => \"tolerated\")\nreturn { listing, demo }",
					description: "Read the notes files and summarize"
				});
				push({
					type: "turn/start",
					data: { turn }
				});
				push({
					type: "user/message",
					surfaceOp: "append",
					data: userMessage(text(`问题 ${turn}：run_code 样本。`))
				});
				push({
					type: "step/start",
					data: {
						turn,
						step: 0
					}
				});
				push({
					type: "assistant/message",
					surfaceOp: "append",
					data: {
						turn,
						step: 0,
						message: assistantMessage([{
							type: "tool-call",
							id: callId,
							name: "run_code",
							arguments: args
						}])
					}
				});
				push({
					type: "tool/call",
					data: {
						turn,
						step: 0,
						callId,
						name: "run_code",
						arguments: args
					}
				});
				const dispatchPair = (n, name, dispatchArgs, resultText, isError = false) => {
					push({
						type: "tool/ptc-dispatch-start",
						data: {
							rootCallId: callId,
							parentCallId: callId,
							subCallId: `${callId}:ptc:${n}`,
							name,
							arguments: dispatchArgs
						}
					});
					push({
						type: "tool/ptc-dispatch",
						data: {
							rootCallId: callId,
							parentCallId: callId,
							subCallId: `${callId}:ptc:${n}`,
							name,
							arguments: dispatchArgs,
							isError,
							content: [{
								type: "text",
								text: resultText
							}]
						}
					});
				};
				dispatchPair(1, "bash", {
					command: "ls notes",
					description: "List notes"
				}, "demo.txt\nnew-demo.txt");
				dispatchPair(2, "read", { file_path: "notes/demo.txt" }, "hello fixture\n");
				dispatchPair(3, "read", { file_path: "notes/missing.txt" }, "Error: ENOENT: notes/missing.txt not found", true);
				push({
					type: "tool/result",
					surfaceOp: "append",
					data: {
						turn,
						step: 0,
						message: toolResultMessage(callId, text("{\"listing\":\"demo.txt\\nnew-demo.txt\",\"demo\":\"hello fixture\\n\"}"), false)
					}
				});
				push({
					type: "step/end",
					data: {
						turn,
						step: 0
					}
				});
				push({
					type: "turn/end",
					data: {
						turn,
						reason: { kind: "completed" }
					}
				});
			}
			const fixtureTodos = [
				{
					content: "梳理需求",
					status: "completed"
				},
				{
					content: "实现 fixture 样本",
					status: "in_progress"
				},
				{
					content: "跑后台构建",
					status: "in_progress"
				},
				{
					content: "浏览器验收",
					status: "pending"
				}
			];
			toolTurn(66, "bash", "{\"command\":\"pnpm run check\",\"description\":\"fixture 终端样本\",\"workdir\":\"/tmp/fixture/deep/nested\"}", `${TERMINAL_OUTPUT_FIXTURE}\n[exit code: 1]`);
			toolTurn(67, "grep", "{\"pattern\":\"SEARCH_MAX_LINES\",\"path\":\"packages/client\"}", SEARCH_MATCHES_TEXT, {
				shape: "matches",
				files: SEARCH_MATCHES_FIXTURE,
				truncated: true,
				total: 42
			});
			toolTurn(68, "glob", "{\"pattern\":\"**/SearchBlock*\",\"path\":\"packages/client\"}", SEARCH_PATHS_TEXT, {
				shape: "paths",
				paths: SEARCH_PATHS_FIXTURE,
				truncated: true,
				total: 23
			});
			toolTurn(69, "read", `{"file_path":${JSON.stringify(READ_SAMPLE_PATH)},"offset":${READ_SAMPLE_FIRST_LINE}}`, READ_SAMPLE_TEXT, {
				path: READ_SAMPLE_PATH,
				offset: READ_SAMPLE_FIRST_LINE,
				lines: READ_SAMPLE_LINES,
				totalLines: READ_SAMPLE_TOTAL,
				lang: "ts"
			});
			toolTurn(70, "web_search", "{\"queries\":[\"deepseek harness architecture\"]}", "Search results for deepseek harness architecture.", WEB_SEARCH_META);
			toolTurn(71, "web_fetch", "{\"url\":\"https://www.deepseek.com/blog/harness-architecture\"}", "# Harness architecture\n\nEverything is a plugin.", WEB_FETCH_META);
			push({
				type: "turn/start",
				data: { turn: 72 }
			});
			push({
				type: "user/message",
				surfaceOp: "append",
				data: userMessage(text("问题 72：请完整列出全部一百条条目。"))
			});
			push({
				type: "step/start",
				data: {
					turn: 72,
					step: 0
				}
			});
			push({
				type: "assistant/message",
				surfaceOp: "append",
				data: {
					turn: 72,
					step: 0,
					message: assistantMessage(text("条目 1：第一条。条目 2：第二条。条目 3：这一条写到一半被"))
				}
			});
			push({
				type: "step/end",
				data: {
					turn: 72,
					step: 0
				}
			});
			push({
				type: "turn/end",
				data: {
					turn: 72,
					reason: { kind: "max-tokens" }
				}
			});
			push({
				type: "turn/start",
				data: { turn: 73 }
			});
			push({
				type: "user/message",
				surfaceOp: "append",
				data: userMessage([{
					type: "image",
					attachment: FIXTURE_IMAGE_REF
				}, ...text("历史用户图片")])
			});
			push({
				type: "step/start",
				data: {
					turn: 73,
					step: 0
				}
			});
			push({
				type: "assistant/message",
				surfaceOp: "append",
				data: {
					turn: 73,
					step: 0,
					message: assistantMessage([...text("结构化模型图片："), {
						type: "image",
						attachment: FIXTURE_IMAGE_REF
					}], "fx-vision")
				}
			});
			push({
				type: "step/end",
				data: {
					turn: 73,
					step: 0
				}
			});
			push({
				type: "turn/end",
				data: {
					turn: 73,
					reason: { kind: "completed" }
				}
			});
			toolTurn(74, "todo_write", JSON.stringify({ todos: fixtureTodos }), "Updated todo list: 1 pending, 2 in progress, 1 completed.");
			const callIndex = events.length - 4;
			const callTime = events[callIndex]?.time;
			events.splice(callIndex + 1, 0, {
				type: "todo/write",
				time: callTime + 400,
				data: { todos: fixtureTodos }
			});
			events.forEach((e, i) => {
				e.seq = i;
			});
			return events;
		}
		/**
		* Fixture parallel of the plan unit's lifecycle fold. The paired
		* `command/done` retains successful plan selections and drops failures;
		* `plan/mode` commits one. `wanted` is exposed for the prompt boundary (the
		* fixture's step/start parallel).
		*/
		function foldPlan(log) {
			let active = false;
			let wanted = null;
			let running = null;
			for (const event of log) {
				const item = event;
				if (item.type === "command/run" && item.data?.["name"] === "plan") {
					const args = item.data["args"];
					if (typeof args !== "string") continue;
					running = {
						commandId: item.data["commandId"],
						wanted: args.trim() !== "off"
					};
				} else if (item.type === "command/done" && item.data !== void 0 && running !== null && item.data["commandId"] === running.commandId) {
					wanted = item.data["kind"] === "success" && running.wanted !== active ? running.wanted : null;
					running = null;
				} else if (item.type === "plan/mode") {
					active = item.data?.["active"] === true;
					wanted = null;
				}
			}
			const selected = running?.wanted ?? wanted;
			return {
				active,
				pending: selected !== null && selected !== active,
				wanted: selected
			};
		}
		/** The plan projection's wire view over the full log. */
		function planViewOf(log) {
			const plan = foldPlan(log);
			return {
				active: plan.active,
				pending: plan.pending
			};
		}
		/** Fixture parallel of the host's projection units: whole current values per key over the full log. */
		/** Fixture preset table (the host PermissionPresetService defaults). */
		const PERMISSION_PRESETS = {
			"workspace-write": {
				sandbox: "workspace-write",
				approval: "ask",
				description: "Write inside the workspace and permitted temporary directories; wider retries require approval."
			},
			"danger-full-access": {
				sandbox: "danger-full-access",
				approval: "never",
				description: "Full file access without approval prompts."
			}
		};
		/** Host permissions-unit parallel: fold the three knob events, derive the select over the fixture defaults. */
		function permissionSelectOf(log) {
			let preset = null;
			let sandbox = "workspace-write";
			let approval = "ask";
			for (const event of log) {
				const item = event;
				if (item.type === "permission/preset") preset = item.data["preset"];
				else if (item.type === "sandbox/mode") sandbox = item.data["mode"];
				else if (item.type === "approval/policy") approval = item.data["policy"];
			}
			const matches = (spec) => spec.sandbox === sandbox && spec.approval === approval;
			let currentValue = "custom";
			const folded = preset === null ? void 0 : PERMISSION_PRESETS[preset];
			if (preset !== null && folded !== void 0 && matches(folded)) currentValue = preset;
			else for (const [name, spec] of Object.entries(PERMISSION_PRESETS)) if (matches(spec)) {
				currentValue = name;
				break;
			}
			return {
				options: [...Object.entries(PERMISSION_PRESETS).map(([value, spec]) => ({
					value,
					name: value,
					description: spec.description
				})), ...currentValue === "custom" ? [{
					value: "custom",
					name: "Custom",
					description: "Current sandbox and approval settings do not match a preset."
				}] : []],
				currentValue
			};
		}
		/** Read one provider usage sample from either durable carrier. */
		function usageSampleOf(event) {
			if (event.type !== "assistant/message" && event.type !== "assistant/attempt") return void 0;
			let usage = event.type === "assistant/message" ? event.data.usage : void 0;
			for (const member of expandAssistantStream(event.data.stream)) if (member.chunk.type === "usage") usage = member.chunk.usage;
			return usage === void 0 ? void 0 : {
				turn: event.data.turn,
				step: event.data.step,
				usage
			};
		}
		/** Fixture parallel of token-meter's last-sample-replacing usage projection. */
		function tokenUsageOf(log) {
			const totals = {
				uncachedInputTokens: 0,
				outputTokens: 0,
				cacheReadTokens: 0,
				cacheWriteTokens: 0
			};
			let last = null;
			for (const event of log) {
				const sample = usageSampleOf(event);
				if (sample === void 0) continue;
				const buckets = {
					uncachedInputTokens: sample.usage.inputTokens,
					outputTokens: sample.usage.outputTokens,
					cacheReadTokens: sample.usage.cacheReadTokens ?? 0,
					cacheWriteTokens: sample.usage.cacheWriteTokens ?? 0
				};
				const previous = last?.turn === sample.turn && last.step === sample.step ? last.buckets : void 0;
				totals.uncachedInputTokens += buckets.uncachedInputTokens - (previous?.uncachedInputTokens ?? 0);
				totals.outputTokens += buckets.outputTokens - (previous?.outputTokens ?? 0);
				totals.cacheReadTokens += buckets.cacheReadTokens - (previous?.cacheReadTokens ?? 0);
				totals.cacheWriteTokens += buckets.cacheWriteTokens - (previous?.cacheWriteTokens ?? 0);
				last = {
					turn: sample.turn,
					step: sample.step,
					buckets
				};
			}
			return totals;
		}
		/** Fixture parallel of session-stats' whole-log counting and wall-time fold. */
		function sessionStatsOf(log) {
			const value = {
				turns: 0,
				steps: 0,
				llmMs: 0,
				toolMs: 0,
				ttftMs: 0,
				ttftSteps: 0,
				decodeMs: 0,
				decodeTokens: 0
			};
			let lastTurn = null;
			let openStep = null;
			const pendingCalls = /* @__PURE__ */ new Map();
			for (const event of log) switch (event.type) {
				case "step/start":
					openStep = {
						turn: event.data.turn,
						step: event.data.step,
						startTime: event.time,
						firstTokenTime: null
					};
					break;
				case "assistant/attempt": {
					if (openStep === null || openStep.turn !== event.data.turn || openStep.step !== event.data.step) break;
					const first = expandAssistantStream(event.data.stream).find((member) => isFixtureTokenDelta(member.chunk))?.time;
					if (openStep.firstTokenTime === null && first !== void 0) openStep.firstTokenTime = first;
					break;
				}
				case "assistant/message": {
					if (openStep === null || openStep.turn !== event.data.turn || openStep.step !== event.data.step) break;
					const first = expandAssistantStream(event.data.stream).find((member) => isFixtureTokenDelta(member.chunk))?.time;
					if (openStep.firstTokenTime === null && first !== void 0) openStep.firstTokenTime = first;
					value.llmMs += Math.max(0, event.time - openStep.startTime);
					if (openStep.firstTokenTime !== null) {
						value.ttftMs += Math.max(0, openStep.firstTokenTime - openStep.startTime);
						value.ttftSteps += 1;
						const outputTokens = event.data.usage?.outputTokens;
						if (typeof outputTokens === "number" && Number.isFinite(outputTokens) && outputTokens >= 0) {
							value.decodeMs += Math.max(0, event.time - openStep.firstTokenTime);
							value.decodeTokens += outputTokens;
						}
					}
					openStep = null;
					break;
				}
				case "tool/call":
					pendingCalls.set(event.data.callId, event.time);
					break;
				case "tool/result": {
					const callId = event.data.message.source.callId;
					const dispatched = pendingCalls.get(callId);
					if (dispatched === void 0) break;
					pendingCalls.delete(callId);
					value.toolMs += Math.max(0, event.time - dispatched);
					break;
				}
				case "step/end":
					if (event.data.turn !== lastTurn) {
						value.turns += 1;
						lastTurn = event.data.turn;
					}
					value.steps += 1;
					openStep = null;
					break;
				case "turn/end":
					pendingCalls.clear();
					break;
				default: break;
			}
			return value;
		}
		/** Fixed token-meter heuristic constants mirrored by this client-only fixture. */
		const CHARS_PER_TOKEN = 4;
		const BLOCK_OVERHEAD = 4;
		const ROLE_OVERHEAD = 4;
		/** Price fixture content with token-meter's fixed-density heuristic. */
		function estimateFixtureContent(blocks) {
			const densityPrice = (value) => Math.ceil(value.length / CHARS_PER_TOKEN);
			return blocks.reduce((tokens, block) => {
				if (block.type === "text" || block.type === "reasoning") return tokens + densityPrice(block.text) + BLOCK_OVERHEAD;
				if (block.type === "tool-call") return tokens + densityPrice(block.name) + densityPrice(block.arguments) + BLOCK_OVERHEAD;
				if (block.type === "tool-result") return tokens + estimateFixtureContent(block.content) + BLOCK_OVERHEAD;
				return tokens + densityPrice(JSON.stringify(block)) + BLOCK_OVERHEAD;
			}, 0);
		}
		/**
		* Fixture parallel of token-meter's heuristic context-composition projection.
		* The system prompt is the system-role surface node; it prices as text plus
		* role framing with no block overhead and stays out of the message figure.
		*/
		function contextBreakdownOf(log) {
			const headerEvent = log.findLast((event) => event.type === "request/header");
			const header = headerEvent === void 0 ? void 0 : headerEvent.data.header;
			let systemTokens = 0;
			let messageTokens = 0;
			for (const seq of foldSurface(log).nodes) {
				const event = log[seq];
				if (event === void 0) continue;
				const message = deriveEventMessage(event);
				if (message === null) continue;
				if (message.role === "system") {
					const characters = message.content.reduce((total, block) => total + (block.type === "text" ? block.text.length : JSON.stringify(block).length), 0);
					systemTokens = Math.ceil(characters / CHARS_PER_TOKEN) + ROLE_OVERHEAD;
					continue;
				}
				messageTokens += estimateFixtureContent(message.content) + ROLE_OVERHEAD;
			}
			return {
				systemTokens,
				toolsTokens: header?.tools === void 0 || header.tools.length === 0 ? 0 : Math.ceil(JSON.stringify(header.tools).length / CHARS_PER_TOKEN) + BLOCK_OVERHEAD,
				messageTokens
			};
		}
		/** Latest log-only route context, or undefined before any request ran. */
		function lastRequestContext(log) {
			const event = log.findLast((item) => item.type === "request/context");
			return event === void 0 ? void 0 : event.data;
		}
		/**
		* Fixture parallel of token-meter's request-pressure projection: the last
		* provider-reported prompt size paired with the last recorded capacity. The
		* two need not come from one request — see the token-meter README. The host's
		* `projectedTokens` is deliberately absent: reproducing it would mean
		* reimplementing the estimator client-side, and every consumer falls back to
		* the bare sample, so a fixture-driven view simply lags a compaction the way
		* the projection did before that field existed.
		*/
		function contextPressureOf(log) {
			let pressureTokens;
			for (const event of log) {
				const sample = usageSampleOf(event);
				if (sample === void 0) continue;
				pressureTokens = sample.usage.inputTokens + (sample.usage.cacheReadTokens ?? 0) + (sample.usage.cacheWriteTokens ?? 0);
			}
			const contextWindow = lastRequestContext(log)?.contextWindow;
			return {
				...pressureTokens === void 0 ? {} : { pressureTokens },
				...contextWindow === void 0 ? {} : { contextWindow }
			};
		}
		function projectionValuesOf(log) {
			const values = {};
			values["modelSelection"] = modelSelectionProjectionOf(log);
			const titleEvent = log.findLast((item) => item.type === "session/title");
			if (titleEvent !== void 0) values["title"] = titleEvent.data.title;
			values["todos"] = backscanTodos(log) ?? null;
			values["permissions"] = permissionSelectOf(log);
			values["plan"] = planViewOf(log);
			values["goal"] = backscanGoal(log);
			values["tokenUsage"] = tokenUsageOf(log);
			values["contextPressure"] = contextPressureOf(log);
			values["contextBreakdown"] = contextBreakdownOf(log);
			values["sessionStats"] = sessionStatsOf(log);
			values["imageLimits"] = {
				maxImageBytes: 5 * 1024 * 1024,
				maxImagesPerMessage: 20,
				maxMessageImageBytes: 100 * 1024 * 1024,
				maxImagePixels: 4e7,
				maxImageDimension: 2e3,
				mediaTypes: [
					"image/png",
					"image/jpeg",
					"image/webp",
					"image/gif"
				]
			};
			return values;
		}
		function modelSelectionProjectionOf(log) {
			let lastUsed = null;
			let pending = null;
			for (const event of log) {
				if (event.type === "model/selection") {
					pending = event.data;
					continue;
				}
				if (event.type !== "request/header") continue;
				lastUsed = {
					provider: event.data.header.config.provider,
					model: event.data.header.config.model,
					...event.data.header.config.reasoningEffort === void 0 ? {} : { reasoningEffort: event.data.header.config.reasoningEffort }
				};
				if (sameModelSelection(pending, lastUsed)) pending = null;
			}
			return {
				lastUsed,
				next: pending ?? lastUsed
			};
		}
		function sameModelSelection(left, right) {
			return left === right || left !== null && right !== null && left.provider === right.provider && left.model === right.model && left.reasoningEffort === right.reasoningEffort;
		}
		/** Host parallel: emit one Session control projection frame per key advanced by the event. */
		function projectionFramesOf(id, log, event) {
			const type = event.type;
			const frames = [];
			if (type === "model/selection" || type === "request/header") frames.push({
				type: "projection",
				sessionId: id,
				key: "modelSelection",
				value: modelSelectionProjectionOf(log),
				seq: event.seq
			});
			if (usageSampleOf(event) !== void 0) frames.push({
				type: "projection",
				sessionId: id,
				key: "tokenUsage",
				value: tokenUsageOf(log),
				seq: event.seq
			}, {
				type: "projection",
				sessionId: id,
				key: "contextPressure",
				value: contextPressureOf(log),
				seq: event.seq
			});
			if (type === "request/context") frames.push({
				type: "projection",
				sessionId: id,
				key: "contextPressure",
				value: contextPressureOf(log),
				seq: event.seq
			});
			if (type === "request/header" || type === "system/message" || type === "user/message" || type === "assistant/message" || type === "tool/result") frames.push({
				type: "projection",
				sessionId: id,
				key: "contextBreakdown",
				value: contextBreakdownOf(log),
				seq: event.seq
			});
			if (type === "assistant/message" || type === "tool/result" || type === "step/end") frames.push({
				type: "projection",
				sessionId: id,
				key: "sessionStats",
				value: sessionStatsOf(log),
				seq: event.seq
			});
			if (frames.length > 0) return frames;
			if (type === "session/title") {
				const values = projectionValuesOf(log);
				/* v8 ignore next -- the advancing title event is in the log, so the key is present. */
				if (!Object.hasOwn(values, "title")) return [];
				return [{
					type: "projection",
					sessionId: id,
					key: "title",
					value: values["title"],
					seq: event.seq
				}];
			}
			if (type === "goal/change") return [{
				type: "projection",
				sessionId: id,
				key: "goal",
				value: backscanGoal(log),
				seq: event.seq
			}];
			if (type === "todo/write" || type === "turn/start") return [{
				type: "projection",
				sessionId: id,
				key: "todos",
				value: backscanTodos(log) ?? null,
				seq: event.seq
			}];
			if (type === "permission/preset" || type === "sandbox/mode" || type === "approval/policy") return [{
				type: "projection",
				sessionId: id,
				key: "permissions",
				value: permissionSelectOf(log),
				seq: event.seq
			}];
			const commandData = event;
			if (type === "plan/mode" || type === "command/run" && commandData.data.name === "plan" && typeof commandData.data.args === "string") return [{
				type: "projection",
				sessionId: id,
				key: "plan",
				value: planViewOf(log),
				seq: event.seq
			}];
			return [];
		}
		/**
		* Message-boundary paging mirrors the Host contract: count `maxMessages`
		* backwards from the end and cut at a turn/start boundary.
		*/
		function pageOf(log, beforeSeq, maxMessages) {
			const end = beforeSeq === void 0 ? log.length : Math.max(0, Math.min(beforeSeq, log.length));
			let start = 0;
			let messages = 0;
			for (let i = end - 1; i >= 0; i--) {
				const event = log[i];
				/* v8 ignore next -- dense-array guard: log seqs are array indexes, i stays within [0, end). */
				if (event === void 0) break;
				if (event.type === "user/message" || event.type === "assistant/message") messages++;
				if (event.type === "turn/start" && messages >= maxMessages) {
					start = i;
					break;
				}
			}
			return {
				records: log.slice(start, end).map((event) => ({
					type: "event",
					event
				})),
				hasMore: start > 0
			};
		}
		/** Fixture mirror of host session-scoped attachment authorization. */
		function logReferencesAttachment(log, attachmentId) {
			const visit = (value) => {
				if (Array.isArray(value)) return value.some(visit);
				if (typeof value !== "object" || value === null) return false;
				const record = value;
				if (record.attachmentId === attachmentId) return true;
				return Object.values(record).some(visit);
			};
			return log.some((event) => visit(event.data));
		}
		/** Fixture mirror of first-party message extraction used by session-query. */
		function searchBlockText(block) {
			switch (block.type) {
				case "text": return [block.text];
				case "reasoning": return [];
				case "tool-call": return [block.name, block.arguments];
				case "tool-result": return block.content.flatMap(searchBlockText);
				default: return [];
			}
		}
		/** One current-surface user/assistant document, if searchable. */
		function searchEventText(event) {
			const content = event.type === "user/message" ? event.data.content : event.type === "assistant/message" ? event.data.message.content : void 0;
			if (content === void 0) return "";
			return content.flatMap(searchBlockText).map((part) => part.trim()).filter(Boolean).join("\n");
		}
		/**
		* Browser-safe approximation of SQLite FTS5 unicode61 token boundaries.
		* Keeping phrase matching token-based prevents the development fixture from
		* promising arbitrary within-token substring behavior that production lacks.
		*/
		function searchTokenSpans(value) {
			const text = value.replace(/\s+/gu, " ").trim();
			const characters = Array.from(text);
			const tokens = [];
			let start;
			let raw = "";
			const flush = (end) => {
				if (start !== void 0) {
					const folded = raw.normalize("NFD").replace(/\p{M}+/gu, "").toLowerCase();
					if (folded !== "") tokens.push({
						value: folded,
						start,
						end
					});
				}
				start = void 0;
				raw = "";
			};
			for (let index = 0; index < characters.length; index++) {
				const character = characters[index];
				const tokenBase = character.normalize("NFD").replace(/\p{M}+/gu, "");
				if (tokenBase === "") {
					if (start !== void 0) raw += character;
					continue;
				}
				if (/^[\p{L}\p{N}\p{Co}]+$/u.test(tokenBase)) {
					start ??= index;
					raw += character;
				} else flush(index);
			}
			flush(characters.length);
			return {
				text,
				tokens
			};
		}
		/** Count exact contiguous token-phrase occurrences and retain the first display span. */
		function phraseMatch(document, phrase) {
			if (phrase.length === 0 || phrase.length > document.length) return {
				count: 0,
				start: 0,
				end: 0
			};
			let count = 0;
			let firstStart = 0;
			let firstEnd = 0;
			for (let start = 0; start <= document.length - phrase.length; start++) {
				if (!phrase.every((token, offset) => document[start + offset]?.value === token)) continue;
				count++;
				if (count === 1) {
					firstStart = document[start]?.start ?? 0;
					firstEnd = document[start + phrase.length - 1]?.end ?? firstStart;
				}
			}
			return {
				count,
				start: firstStart,
				end: firstEnd
			};
		}
		/** Match-centered fixture excerpt, bounded by Unicode code points for the sidebar. */
		function searchSnippet(value, matchStart, matchEnd) {
			const characters = Array.from(value);
			if (characters.length <= 120) return value;
			const boundedStart = Math.min(Math.max(0, matchStart), characters.length - 1);
			const boundedEnd = Math.min(characters.length, Math.max(boundedStart + 1, matchEnd));
			const center = Math.floor((boundedStart + boundedEnd) / 2);
			let start = Math.min(characters.length - 118, Math.max(0, center - Math.floor(118 / 2)));
			let end = start + 118;
			if (start === 0) end = 119;
			else if (end === characters.length) start = characters.length - 119;
			return `${start > 0 ? "…" : ""}${characters.slice(start, end).join("")}${end < characters.length ? "…" : ""}`;
		}
		/** Mirrors `packages/session-query/session-query-sqlite/src/index.ts`; update both together. */
		function compareSearchCandidates(a, b) {
			if (a.matchCount !== b.matchCount) return b.matchCount - a.matchCount;
			if (a.documentLength !== b.documentLength) return a.documentLength - b.documentLength;
			if (a.time !== b.time) return b.time - a.time;
			if (a.sessionId !== b.sessionId) return a.sessionId < b.sessionId ? -1 : 1;
			return b.seq - a.seq;
		}
		/**
		* Current plan projection over the full log (host parallel: latest todo/write
		* with no later turn/start; a new turn retires the previous plan).
		*/
		function backscanTodos(log) {
			for (let i = log.length - 1; i >= 0; i--) {
				const event = log[i];
				if (event === void 0) continue;
				if (event.type === "turn/start") return void 0;
				if (event.type === "todo/write") return event.data.todos;
			}
		}
		/**
		* Current goal projection over the full log (host parallel: the GoalService
		* unit's last-wins fold of goal/change whole values; clear returns null).
		*/
		function backscanGoal(log) {
			for (let i = log.length - 1; i >= 0; i--) {
				const event = log[i];
				if (event === void 0 || event.type !== "goal/change" || event.data === void 0) continue;
				const change = event.data;
				if (change.operation === "clear") return null;
				return {
					goal: change.goal,
					roundsStarted: change.roundsStarted,
					createdAt: change.createdAt,
					updatedAt: change.updatedAt
				};
			}
			return null;
		}
		/** Inbox pump shared by both stream generators (FrameQueue pattern: ONE abort listener hung
		*  outside the loop — a per-iteration {once:true} listener never fires for non-final rounds and
		*  piles up for the stream's lifetime). breakNow force-ends the stream without the
		*  client's signal (timing hook: simulated connection loss). */
		var FxInbox = class {
			inbox = [];
			wake = null;
			broken = false;
			push(value) {
				this.inbox.push(value);
				this.wake?.();
			}
			breakNow() {
				this.broken = true;
				this.wake?.();
			}
			/** Read through a method: breakNow()/abort flip state across yields, so narrowing from the loop condition must not stick. */
			isLive(signal) {
				return !signal.aborted && !this.broken;
			}
			async *drain(signal) {
				const onAbort = () => this.wake?.();
				signal.addEventListener("abort", onAbort);
				try {
					while (this.isLive(signal)) {
						while (this.inbox.length > 0) yield this.inbox.shift();
						if (!this.isLive(signal)) break;
						await new Promise((resolve) => {
							this.wake = resolve;
						});
						this.wake = null;
					}
				} finally {
					signal.removeEventListener("abort", onAbort);
				}
			}
		};
		/** Build the fixture's Remote RPC face over one state graph. */
		function createFixtureWorld(options) {
			const sessions = options.empty ? [] : [
				{
					sessionId: sid("fx-alpha"),
					updatedAt: Date.now(),
					running: true,
					blank: false,
					cwd: "/tmp/fixture"
				},
				{
					sessionId: sid("fx-beta"),
					updatedAt: Date.now() - 6e4,
					running: false,
					blank: false,
					parentSessionId: sid("fx-alpha"),
					cwd: "/tmp/fixture"
				},
				{
					sessionId: sid("fx-gamma"),
					updatedAt: Date.now() - 12e4,
					running: false,
					blank: false,
					cwd: "/tmp/fixture"
				}
			];
			const logs = new Map([[sid("fx-alpha"), buildAlphaLog()]]);
			const goalActivations = /* @__PURE__ */ new Map();
			const modelSelections = new Map(sessions.map((session) => [session.sessionId, {
				provider: "deepseek-official",
				model: "deepseek-v4-flash"
			}]));
			const attachments = new Map([[String(FIXTURE_IMAGE_REF.attachmentId), {
				attachment: FIXTURE_IMAGE_REF,
				data: FIXTURE_IMAGE_DATA
			}]]);
			/** Credential store double: set/unset flip the describe badge, values never read back. */
			const fixtureCredentials = new Map([["DEEPSEEK_API_KEY", true]]);
			/** Canonical fixture implementation of the generated Settings Remote contract. */
			const settingsRemotes = {
				describe() {
					return {
						ok: true,
						value: {
							writable: true,
							hasDocument: true,
							namespaces: [{
								ns: "llm-deepseek",
								schema: {},
								value: { apiKeyEnv: "DEEPSEEK_API_KEY" },
								applies: "live",
								secrets: [{
									path: ["apiKey"],
									set: false
								}],
								revision: 0
							}]
						}
					};
				},
				update(ns) {
					return {
						ok: false,
						error: {
							code: "settings/rejected",
							message: "fixture: the minimal readiness settings descriptor is read-only",
							details: { ns }
						}
					};
				},
				replace(ns) {
					return {
						ok: false,
						error: {
							code: "settings/rejected",
							message: "fixture: the minimal readiness settings descriptor is read-only",
							details: { ns }
						}
					};
				},
				mutate(ns) {
					return {
						ok: false,
						error: {
							code: "settings/rejected",
							message: "fixture: no settings namespaces are registered",
							details: { ns }
						}
					};
				},
				openSettingsDocument() {
					return {
						ok: true,
						value: { opened: true }
					};
				},
				openAgentPresetDirectory(agentPreset) {
					const existing = fixturePresets.get(agentPreset);
					if (existing === void 0 || existing.trust === "system") return {
						ok: false,
						error: {
							code: "agent-preset/read-only",
							message: `agent preset "${agentPreset}" ships with the deployment`,
							details: {
								agentPreset,
								reason: "it ships with the deployment"
							}
						}
					};
					return {
						ok: true,
						value: { opened: true }
					};
				}
			};
			const credentialRemotes = {
				describe(refs) {
					return {
						ok: true,
						value: Object.fromEntries(refs.map((ref) => [ref, {
							configured: fixtureCredentials.has(ref),
							...fixtureCredentials.has(ref) ? { source: "file" } : {},
							writable: true
						}]))
					};
				},
				set(ref) {
					fixtureCredentials.set(ref, true);
					return {
						ok: true,
						value: void 0
					};
				},
				unset(ref) {
					fixtureCredentials.delete(ref);
					return {
						ok: true,
						value: void 0
					};
				}
			};
			/**
			* Preset compositions the fixture serves. Held as state rather than
			* constants so the settings editor's save and delete are exercisable: the
			* roster a GUI journey sees after writing is the text it wrote.
			*/
			const fixturePresets = new Map([
				["standard", {
					trust: "system",
					content: "- id: tool-bash\n  name: '@deepseek-ai/dsh-tool-bash'\n"
				}],
				["minimal", {
					trust: "system",
					content: "- id: tool-web-search\n  name: '@deepseek-ai/dsh-tool-web-search'\n"
				}],
				["my-agent", {
					trust: "user",
					content: "- id: tool-read\n  name: '@deepseek-ai/dsh-tool-read'\n"
				}]
			]);
			let fixtureDefaultPreset = "standard";
			const nextTurn = new Map([[sid("fx-alpha"), 75]]);
			let nextSession = 1;
			const wid = (raw) => raw;
			const fixtureEpoch = (/* @__PURE__ */ new Date(Date.now() - 3e5)).toISOString();
			const FIXTURE_HOME = "/home/fixture";
			const workspaces = options.empty ? [] : [{
				workspaceId: wid("fx-ws-fixture"),
				path: "/tmp/fixture",
				title: "fixture",
				sessionIds: [
					sid("fx-alpha"),
					sid("fx-beta"),
					sid("fx-gamma")
				],
				createdAt: fixtureEpoch,
				updatedAt: fixtureEpoch
			}, {
				workspaceId: wid("fx-ws-home"),
				path: `${FIXTURE_HOME}/Documents/project`,
				title: "project",
				sessionIds: [],
				createdAt: fixtureEpoch,
				updatedAt: fixtureEpoch
			}];
			let nextWorkspace = 1;
			const archivedSessionIds = [];
			const workspaceSnapshot = (workspace) => ({
				...workspace,
				sessionIds: [...workspace.sessionIds]
			});
			const workspaceBaseline = () => ({
				type: "baseline",
				value: {
					items: workspaces.map(workspaceSnapshot),
					archivedSessionIds: [...archivedSessionIds]
				}
			});
			const directoryTree = new Map([
				["/", ["home"]],
				["/home", ["fixture"]],
				[FIXTURE_HOME, [
					"Documents",
					"Downloads",
					".config"
				]],
				[`${FIXTURE_HOME}/Documents`, [
					"project",
					"deepseek-iOS",
					"deepseek-android",
					"deepseek-platform",
					"deepseek-web",
					"deepseek-harness",
					"deepseek-app",
					"deepseek-landing-blog"
				]]
			]);
			const childrenOf = (path) => {
				const known = directoryTree.get(path);
				if (known !== void 0) return known;
				const parent = path.slice(0, path.lastIndexOf("/")) || "/";
				const name = path.slice(path.lastIndexOf("/") + 1);
				return directoryTree.get(parent)?.includes(name) === true ? [] : void 0;
			};
			const crumbsOf = (path) => {
				const crumbs = [{
					name: "/",
					path: "/",
					hidden: false
				}];
				let acc = "";
				for (const segment of path.split("/").filter(Boolean)) {
					acc += `/${segment}`;
					crumbs.push({
						name: segment,
						path: acc,
						hidden: false
					});
				}
				return crumbs;
			};
			/** Resident waterfalls retain their event ids across Remote Event generations. */
			const pendingApprovalEventId = "fx-interaction-approval";
			let approvalPending = !options.empty;
			const pendingQuestionEventId = "fx-interaction-question";
			let questionPending = !options.empty;
			const fixtureQuestions = [
				{
					id: "harness-profile",
					header: "偏好",
					question: "你现在更想招哪类 Agent/Harness 候选人？",
					options: [
						{
							label: "工程落地型 (Recommended)",
							description: "更看重能直接做 runtime、tool executor、sandbox、trace 和线上问题排查。"
						},
						{
							label: "研究潜力型",
							description: "更看重 Agent 理解、训练评测思路和长期成长空间。"
						},
						{
							label: "均衡型",
							description: "同时要求工程能力和 Agent 认知，但可能筛选门槛更高。"
						}
					]
				},
				{
					id: "work-mode",
					header: "方式",
					question: "你希望候选人优先展示哪种工作方式？",
					options: [{
						label: "先做小型原型 (Recommended)",
						description: "用可运行结果尽快验证关键假设。"
					}, {
						label: "先写完整设计",
						description: "先收敛边界、协议和风险，再开始实现。"
					}]
				},
				{
					id: "signals",
					header: "信号",
					question: "哪些面试信号最重要？",
					detail: "按当前招聘目标选择；跳过则视为不设偏好。",
					multiSelect: true,
					options: [
						{ label: "系统设计" },
						{ label: "代码质量" },
						{ label: "Agent 产品判断" }
					]
				}
			];
			const controlConns = /* @__PURE__ */ new Set();
			const followConns = /* @__PURE__ */ new Map();
			const activeAttempts = /* @__PURE__ */ new Map();
			const assistantRevisions = /* @__PURE__ */ new Map();
			const workspaceConns = /* @__PURE__ */ new Set();
			const remoteEventConns = /* @__PURE__ */ new Map();
			const emitControl = (frame) => {
				for (const conn of controlConns) conn.push(frame);
			};
			const emitWorkspace = (frame) => {
				for (const conn of workspaceConns) conn.push(frame);
			};
			const emitRemote = (event, args) => {
				for (const conn of remoteEventConns.values()) conn.push({
					type: "emit",
					event,
					args
				});
			};
			const emitRemoteFrame = (frame) => {
				for (const conn of remoteEventConns.values()) conn.push(frame);
			};
			const emitFollow = (sessionId, entry) => {
				for (const conn of followConns.get(sessionId) ?? []) conn.push(entry);
			};
			const emitAssistant = (sessionId, frame) => {
				for (const conn of followConns.get(sessionId) ?? []) conn.push({
					type: "assistant-stream",
					frame
				});
			};
			const nextAssistantRevision = (sessionId) => {
				const revision = (assistantRevisions.get(sessionId) ?? 0) + 1;
				assistantRevisions.set(sessionId, revision);
				return revision;
			};
			const beginAssistant = (sessionId, turn, step) => {
				const attemptId = LlmAttemptId(`${sessionId}:fixture:${String(nextAssistantRevision(sessionId))}`);
				const lastSeq = logOf(sessionId).length - 1;
				const startedAfterSeq = lastSeq < 0 ? -1 : SessionSeq(lastSeq);
				const attempt = {
					attemptId,
					startedAfterSeq,
					turn,
					step,
					stream: new AssistantStreamAccumulator(),
					index: 0
				};
				activeAttempts.set(sessionId, attempt);
				emitAssistant(sessionId, {
					type: "start",
					attemptId,
					revision: assistantRevisions.get(sessionId),
					startedAfterSeq,
					turn,
					step
				});
				return attempt;
			};
			const pushAssistant = (sessionId, chunk) => {
				const attempt = activeAttempts.get(sessionId);
				if (attempt === void 0) throw new Error(`fixture: no active Assistant attempt for ${sessionId}`);
				const timed = attempt.stream.push({
					time: Date.now(),
					chunk
				});
				emitAssistant(sessionId, {
					type: "chunk",
					attemptId: attempt.attemptId,
					revision: nextAssistantRevision(sessionId),
					index: attempt.index++,
					time: timed.time,
					chunk: timed.chunk
				});
			};
			const commitAssistant = (sessionId, event) => {
				const attempt = activeAttempts.get(sessionId);
				if (attempt === void 0) throw new Error(`fixture: no active Assistant attempt for ${sessionId}`);
				activeAttempts.delete(sessionId);
				emitAssistant(sessionId, {
					type: "end",
					attemptId: attempt.attemptId,
					revision: nextAssistantRevision(sessionId),
					index: attempt.index,
					outcome: {
						kind: "committed",
						eventType: event.type === "assistant/message" ? "assistant/message" : "assistant/attempt",
						seq: event.seq
					}
				});
			};
			function sessionOk(value) {
				return Promise.resolve({
					ok: true,
					value
				});
			}
			function sessionErr(error) {
				return Promise.resolve({
					ok: false,
					error
				});
			}
			const summaryOf = (id) => sessions.find((s) => s.sessionId === id);
			const requireRemoteSession = (request) => {
				if (summaryOf(request.sessionId) !== void 0) return void 0;
				return sessionErr({
					code: "session/not-found",
					message: `no session ${request.sessionId}`,
					details: { sessionId: request.sessionId }
				});
			};
			const setRunning = (id, running) => {
				const summary = summaryOf(id);
				if (summary === void 0 || summary.running === running) return;
				summary.running = running;
				emitRemote("api-session/status", [id, running]);
			};
			const logOf = (id) => {
				let log = logs.get(id);
				if (log === void 0) {
					log = [];
					logs.set(id, log);
				}
				return log;
			};
			const append = (id, e) => {
				const log = logOf(id);
				const event = {
					seq: SessionSeq(log.length),
					time: Date.now(),
					...e
				};
				log.push(event);
				emitFollow(id, {
					type: "event",
					event
				});
				for (const frame of projectionFramesOf(id, log, event)) emitControl(frame);
				if (event.type === "user/message" && event.data.source.kind === "user") {
					const summary = summaryOf(id);
					if (summary !== void 0) summary.updatedAt = event.time;
					emitRemote("api-session/activity", [id, event.time]);
				}
				return event;
			};
			/** Append one durable goal/change (host GoalService parallel). */
			const appendGoalChange = (id, change) => {
				const log = logOf(id);
				append(id, {
					type: "goal/change",
					data: change
				});
				return backscanGoal(log);
			};
			/** Update process-local goal activation and publish the forwarded edge. */
			const setGoalActivation = (id, activation) => {
				const current = backscanGoal(logOf(id));
				if (current === null) {
					if (!goalActivations.delete(id)) return;
					emitRemote("goal/activation-changed", [{ sessionId: id }]);
					return;
				}
				const previous = goalActivations.get(id);
				goalActivations.set(id, activation);
				if (previous === activation) return;
				emitRemote("goal/activation-changed", [{
					sessionId: id,
					goal: {
						id: current.goal.id,
						revision: current.goal.revision,
						activation
					}
				}]);
			};
			const goalFailure = (message) => ({
				ok: false,
				error: {
					code: "gateway/internal",
					message,
					details: {}
				}
			});
			const requireGoalSession = (id) => summaryOf(id) === void 0 ? {
				ok: false,
				error: {
					code: "session/not-found",
					message: `no session ${id}`,
					details: { sessionId: id }
				}
			} : void 0;
			/** Canonical fixture implementation of the generated Commands Remote contract. */
			const commandRemotes = {
				list(id) {
					const missing = requireGoalSession(id);
					if (missing !== void 0) return missing;
					return {
						ok: true,
						value: [
							{
								name: "compact",
								description: "fixture：压缩当前会话上下文"
							},
							{
								name: "echo",
								description: "fixture：回显参数",
								input: { hint: "text to echo" }
							},
							{
								name: "goal",
								description: "set or view the goal for a long-running task",
								input: {
									hint: "<objective>",
									attachments: true
								}
							},
							{
								name: "permission",
								description: "Switch the permission preset (sandbox mode + approval policy)",
								input: { hint: "<preset>" }
							},
							{
								name: "plan",
								description: "Enter or leave plan mode",
								input: {
									hint: "[off|message]",
									attachments: true
								}
							}
						]
					};
				},
				execute(id, line, attachments = []) {
					const missing = requireGoalSession(id);
					if (missing !== void 0) return missing;
					const match = /^\/(\S+)((?:\s.*)?)$/.exec(line.trim());
					const name = match?.[1];
					const args = match?.[2] ?? "";
					if (attachments.length > 0 && name !== void 0 && [
						"permission",
						"goal",
						"compact",
						"echo",
						"plan"
					].includes(name)) {
						const rejection = name !== "goal" && name !== "plan" ? `/${name} does not accept attachments` : name === "goal" && args.trim() === "" ? "Attachments only accompany a goal objective: /goal <objective> or /goal edit <objective>." : name === "plan" && args.trim() === "off" ? "Attachments cannot accompany /plan off." : void 0;
						if (rejection !== void 0) {
							const commandId = `fx-cmd-${logOf(id).length}`;
							append(id, {
								type: "command/run",
								data: {
									commandId,
									name,
									args,
									source: { kind: "user" }
								}
							});
							const result = {
								kind: "error",
								text: rejection
							};
							append(id, {
								type: "command/done",
								data: {
									commandId,
									...result
								}
							});
							return {
								ok: true,
								value: {
									commandId,
									result
								}
							};
						}
					}
					if (name === "permission") {
						const preset = args.trim();
						const commandId = `fx-cmd-${logOf(id).length}`;
						append(id, {
							type: "command/run",
							data: {
								commandId,
								name,
								args,
								source: { kind: "user" }
							}
						});
						const spec = PERMISSION_PRESETS[preset];
						let result;
						if (preset === "") result = {
							kind: "success",
							text: `current preset ${permissionSelectOf(logOf(id)).currentValue} (available: ${Object.keys(PERMISSION_PRESETS).join(", ")})`
						};
						else if (spec === void 0) result = {
							kind: "error",
							text: `unknown preset "${preset}" (available: ${Object.keys(PERMISSION_PRESETS).join(", ")})`
						};
						else {
							if (permissionSelectOf(logOf(id)).currentValue !== preset) append(id, {
								type: "permission/preset",
								data: { preset }
							});
							append(id, {
								type: "sandbox/mode",
								data: { mode: spec.sandbox }
							});
							append(id, {
								type: "approval/policy",
								data: { policy: spec.approval }
							});
							result = {
								kind: "success",
								text: `preset ${preset}`
							};
						}
						append(id, {
							type: "command/done",
							data: {
								commandId,
								...result
							}
						});
						return {
							ok: true,
							value: {
								commandId,
								result
							}
						};
					}
					if (name === "goal") {
						const commandId = `fx-cmd-${logOf(id).length}`;
						append(id, {
							type: "command/run",
							data: {
								commandId,
								name,
								args,
								source: { kind: "user" }
							}
						});
						const objective = args.trim();
						const current = backscanGoal(logOf(id));
						let text;
						if (objective === "") text = current === null ? "No goal is set. Usage: /goal <objective>" : `Current goal: ${current.goal.objective}`;
						else if (current !== null && current.goal.phase !== "complete") text = `A goal already exists (${current.goal.objective}). Clear it first.`;
						else {
							const created = appendGoalChange(id, {
								kind: "goal/change",
								version: 1,
								operation: "create",
								goal: {
									id: `fx-goal-${logOf(id).length}`,
									revision: 1,
									objective,
									phase: "active",
									maxGoalRounds: 256
								},
								roundsStarted: 0,
								createdAt: Date.now(),
								updatedAt: Date.now()
							});
							setGoalActivation(id, "armed");
							text = `Goal created: ${created.goal.objective}`;
						}
						const result = {
							kind: "success",
							text
						};
						append(id, {
							type: "command/done",
							data: {
								commandId,
								...result
							}
						});
						return {
							ok: true,
							value: {
								commandId,
								result
							}
						};
					}
					const running = summaryOf(id)?.running === true;
					const outcomes = {
						compact: "fixture：已压缩（假动作）",
						echo: args.trim(),
						plan: args.trim() === "off" ? running ? "Leaving plan mode (applies from the next step)." : "Plan mode off." : running ? "Entering plan mode (applies from the next step). Use /plan off to leave." : "Plan mode on. Use /plan off to leave."
					};
					const text = name === void 0 ? void 0 : outcomes[name];
					if (name === void 0 || text === void 0) return {
						ok: true,
						value: void 0
					};
					const commandId = `fx-cmd-${logOf(id).length}`;
					append(id, {
						type: "command/run",
						data: {
							commandId,
							name,
							args,
							source: { kind: "user" }
						}
					});
					if (name === "plan" && !running) {
						const plan = foldPlan(logOf(id));
						if (plan.wanted !== null && plan.wanted !== plan.active) append(id, {
							type: "plan/mode",
							data: { active: plan.wanted }
						});
					}
					const result = {
						kind: "success",
						...text === "" ? {} : { text }
					};
					append(id, {
						type: "command/done",
						data: {
							commandId,
							...result
						}
					});
					return {
						ok: true,
						value: {
							commandId,
							result
						}
					};
				}
			};
			const goalView = (id, projection) => ({
				...projection.goal,
				roundsStarted: projection.roundsStarted,
				createdAt: projection.createdAt,
				updatedAt: projection.updatedAt,
				activation: goalActivations.get(id) ?? (projection.goal.phase === "active" ? "armed" : "disarmed")
			});
			/** Canonical fixture implementation of the generated Goal Remote contract. */
			/** Canonical fixture implementation of the generated reference-discovery Remote contracts. */
			const referenceRemotes = {
				files(id, query) {
					const missing = requireGoalSession(id);
					if (missing !== void 0) return missing;
					const needle = query.toLocaleLowerCase();
					return {
						ok: true,
						value: [
							{
								path: "notes",
								kind: "directory"
							},
							{
								path: "README.md",
								kind: "file"
							},
							{
								path: "notes/demo.txt",
								kind: "file"
							}
						].filter((item) => item.path.toLocaleLowerCase().includes(needle))
					};
				},
				sessions(id, query) {
					const missing = requireGoalSession(id);
					if (missing !== void 0) return missing;
					const needle = query.toLocaleLowerCase();
					return {
						ok: true,
						value: sessions.filter((item) => item.sessionId !== id).filter((item) => String(item.sessionId).toLocaleLowerCase().includes(needle) || item.cwd?.toLocaleLowerCase().includes(needle) === true).map((item) => {
							const label = item.sessionId === sid("fx-beta") ? "Fixture child session" : String(item.sessionId);
							const encoded = btoa(JSON.stringify(item.sessionId)).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/u, "");
							return {
								sessionId: item.sessionId,
								label,
								...item.cwd === void 0 ? {} : { cwd: item.cwd },
								createdAt: item.updatedAt,
								mention: `@[${label}](dsh-session:${encoded})`
							};
						})
					};
				}
			};
			/**
			* Workspace text reads under `?fixture`.
			*
			* The sample content is deliberately more than one shape: the panel's states
			* (text, oversized, unreadable) are only demonstrable if the fixture can
			* produce each of them, and a preview that can only ever succeed hides its
			* own failure rendering.
			*/
			const WORKSPACE_FILES_ROOT = "/tmp/fixture";
			const workspaceFileTree = new Map([
				["", [
					{
						name: ".gitignore",
						type: "file",
						size: 24
					},
					{
						name: "dev.sock",
						type: "other"
					},
					{
						name: "notes",
						type: "directory"
					},
					{
						name: "package.json",
						type: "file",
						size: 512
					},
					{
						name: "README.md",
						type: "file",
						size: 640
					},
					{
						name: "src",
						type: "directory"
					}
				]],
				["notes", [{
					name: "demo.txt",
					type: "file",
					size: 14
				}, {
					name: "new-demo.txt",
					type: "file",
					size: 14
				}]],
				["src", [
					{
						name: "config.ts",
						type: "file",
						size: 211
					},
					{
						name: "index.ts",
						type: "file",
						size: 88
					},
					{
						name: "lib",
						type: "directory"
					}
				]],
				["src/lib", Array.from({ length: 24 }, (_, index) => ({
					name: `module-${String(index + 1).padStart(2, "0")}.ts`,
					type: "file",
					size: 96 + index
				}))]
			]);
			/** Resolve a `list` argument to its workspace-relative path, or undefined when it leaves the root. */
			const workspaceFilePath = (path) => {
				const segments = [];
				for (const segment of (path.startsWith("/") ? path : `${WORKSPACE_FILES_ROOT}/${path}`).split("/")) {
					if (segment === "" || segment === ".") continue;
					if (segment === "..") {
						segments.pop();
						continue;
					}
					segments.push(segment);
				}
				const absolute = `/${segments.join("/")}`;
				if (absolute !== WORKSPACE_FILES_ROOT && !absolute.startsWith(`${WORKSPACE_FILES_ROOT}/`)) return void 0;
				return absolute.slice(13);
			};
			const WORKSPACE_FILE_PAGE_LINES = 5e3;
			/**
			* Sample text for any readable path: a heading plus two lines of copy. The
			* replayed conversation's `demo` files, and any `huge` path, run past two
			* default pages so paging can be exercised without a real workspace.
			*/
			const workspaceFileLines = (path) => {
				const head = [
					`# ${path.slice(path.lastIndexOf("/") + 1)}`,
					"",
					"fixture 模式下的示例文本，用于验收侧栏的文本预览。",
					"真实构建从工作区读取同名文件。"
				];
				return path.includes("demo") || path.includes("huge") ? [...head, ...Array.from({ length: 12e3 }, (_, index) => `第 ${index + 5} 行：用于验收分页与滚动的长文本样本。`)] : head;
			};
			const workspaceFileRemotes = {
				list(path) {
					if (path.length === 0) return {
						ok: false,
						error: {
							code: "gateway/bad-request",
							message: "path is required",
							details: {}
						}
					};
					const relative = workspaceFilePath(path);
					if (relative === void 0) return {
						ok: false,
						error: {
							code: "workspace-file/outside-workspace",
							message: `${path} is outside the workspace`,
							details: { path }
						}
					};
					const entries = workspaceFileTree.get(relative);
					if (entries === void 0) {
						const cut = relative.lastIndexOf("/");
						const name = relative.slice(cut + 1);
						const sibling = workspaceFileTree.get(cut === -1 ? "" : relative.slice(0, cut))?.find((entry) => entry.name === name);
						if (sibling === void 0) return {
							ok: false,
							error: {
								code: "workspace-file/not-found",
								message: `no entry at ${path}`,
								details: { path }
							}
						};
						return {
							ok: false,
							error: {
								code: "workspace-file/not-directory",
								message: `${path} is a ${sibling.type}`,
								details: {
									path,
									kind: sibling.type === "file" ? "file" : "other"
								}
							}
						};
					}
					return {
						ok: true,
						value: {
							path: relative,
							entries,
							truncated: relative === "src/lib"
						}
					};
				},
				read(path, range) {
					const located = workspaceFileRemotes.stat(path);
					if (!located.ok) return located;
					const offset = range.offset ?? 1;
					const limit = range.limit ?? WORKSPACE_FILE_PAGE_LINES;
					if (!Number.isInteger(offset) || offset < 1 || !Number.isInteger(limit) || limit < 1 || limit > WORKSPACE_FILE_PAGE_LINES) return {
						ok: false,
						error: {
							code: "gateway/bad-request",
							message: "offset and limit must be positive integers within the page cap",
							details: {}
						}
					};
					const lines = workspaceFileLines(path);
					const page = lines.slice(offset - 1, offset - 1 + limit);
					return {
						ok: true,
						value: {
							...located.value,
							offset,
							text: page.join("\n"),
							lines: page.length,
							eof: offset - 1 + limit >= lines.length
						}
					};
				},
				stat(path) {
					if (path.length === 0) return {
						ok: false,
						error: {
							code: "gateway/bad-request",
							message: "path is required",
							details: {}
						}
					};
					if (path.endsWith(".png") || path.endsWith(".bin")) return {
						ok: false,
						error: {
							code: "workspace-file/not-text",
							message: `${path} is not UTF-8 text`,
							details: { path }
						}
					};
					return {
						ok: true,
						value: {
							absolutePath: path.startsWith("/") ? path : `/${path}`,
							version: "fx-v1",
							bytes: new TextEncoder().encode(workspaceFileLines(path).join("\n")).byteLength
						}
					};
				}
			};
			/**
			* Canonical fixture implementation of the generated Directory Picker Remote
			* contract. The pick is deterministic — the keyless lanes drive the full
			* pick-then-adopt path without an OS chooser — over the same design-mock
			* tree the browse primitives serve.
			*/
			const directoryPickerRemotes = {
				pick() {
					return {
						ok: true,
						value: `${FIXTURE_HOME}/Documents/project`
					};
				},
				list(path) {
					const target = path ?? FIXTURE_HOME;
					const children = childrenOf(target);
					if (children === void 0) return {
						ok: false,
						error: {
							code: "directory-picker/unreadable",
							message: `cannot list ${target}: not in the fixture tree`,
							details: { path: target }
						}
					};
					return {
						ok: true,
						value: {
							path: target,
							home: FIXTURE_HOME,
							crumbs: crumbsOf(target),
							entries: [...children].sort((a, b) => a.localeCompare(b)).map((name) => ({
								name,
								path: target === "/" ? `/${name}` : `${target}/${name}`,
								hidden: name.startsWith(".")
							})),
							truncated: false
						}
					};
				},
				createDirectory(parent, name) {
					const children = childrenOf(parent);
					if (children === void 0) return {
						ok: false,
						error: {
							code: "directory-picker/create-failed",
							message: `missing parent ${parent}`,
							details: { path: parent }
						}
					};
					const target = parent === "/" ? `/${name}` : `${parent}/${name}`;
					if (children.includes(name)) return {
						ok: false,
						error: {
							code: "directory-picker/exists",
							message: `${target} already exists`,
							details: { path: target }
						}
					};
					directoryTree.set(parent, [...children, name]);
					directoryTree.set(target, []);
					return {
						ok: true,
						value: target
					};
				}
			};
			const goalRemotes = {
				get(id) {
					const missing = requireGoalSession(id);
					if (missing !== void 0) return missing;
					const current = backscanGoal(logOf(id));
					return {
						ok: true,
						value: current === null ? void 0 : goalView(id, current)
					};
				},
				create(id, request) {
					const missing = requireGoalSession(id);
					if (missing !== void 0) return missing;
					const current = backscanGoal(logOf(id));
					if (current !== null && current.goal.phase !== "complete") return goalFailure(`goal "${current.goal.id}" already exists`);
					const now = Date.now();
					const projection = appendGoalChange(id, {
						kind: "goal/change",
						version: 1,
						operation: "create",
						goal: {
							id: `fx-goal-${logOf(id).length}`,
							revision: 1,
							objective: request.objective,
							phase: "active",
							maxGoalRounds: request.maxGoalRounds ?? 256
						},
						roundsStarted: 0,
						createdAt: now,
						updatedAt: now
					});
					setGoalActivation(id, "armed");
					return {
						ok: true,
						value: { ref: {
							id: projection.goal.id,
							revision: projection.goal.revision
						} }
					};
				},
				edit(id, ref, request) {
					return mutateGoal(id, ref, (current) => ({
						...current.goal,
						revision: current.goal.revision + 1,
						...request.objective === void 0 ? {} : { objective: request.objective },
						...request.maxGoalRounds === void 0 ? {} : { maxGoalRounds: request.maxGoalRounds }
					}));
				},
				pause(id, ref) {
					return mutateGoal(id, ref, (current) => current.goal.phase === "active" ? {
						...current.goal,
						revision: current.goal.revision + 1,
						phase: "paused"
					} : void 0);
				},
				resume(id, ref) {
					return mutateGoal(id, ref, (current) => current.goal.phase === "paused" || current.goal.phase === "blocked" || current.goal.phase === "active" ? {
						...current.goal,
						revision: current.goal.revision + 1,
						phase: "active"
					} : void 0);
				},
				complete(id, ref) {
					return mutateGoal(id, ref, (current) => current.goal.phase === "complete" ? void 0 : {
						...current.goal,
						revision: current.goal.revision + 1,
						phase: "complete"
					});
				},
				clear(id, ref) {
					const resolved = resolveGoal(id, ref);
					if (!resolved.ok) return resolved;
					const current = resolved.value;
					const tombstone = {
						id: current.goal.id,
						revision: current.goal.revision + 1
					};
					appendGoalChange(id, {
						kind: "goal/change",
						version: 1,
						operation: "clear",
						cleared: tombstone,
						clearedAt: Date.now()
					});
					setGoalActivation(id, "disarmed");
					return {
						ok: true,
						value: tombstone
					};
				}
			};
			/** Resolve one current goal revision for a canonical Remote mutation. */
			function resolveGoal(id, ref) {
				const missing = requireGoalSession(id);
				if (missing !== void 0) return missing;
				const current = backscanGoal(logOf(id));
				if (current === null || current.goal.id !== ref.id || current.goal.revision !== ref.revision) return goalFailure("stale or missing goal revision");
				return {
					ok: true,
					value: current
				};
			}
			/** Shared CAS mutation path behind the canonical Remote verbs. */
			function mutateGoal(id, ref, next) {
				const resolved = resolveGoal(id, ref);
				if (!resolved.ok) return resolved;
				const current = resolved.value;
				const goal = next(current);
				if (goal === void 0) return goalFailure(`invalid goal transition from "${current.goal.phase}"`);
				const currentActivation = goalActivations.get(id) ?? (current.goal.phase === "active" ? "armed" : "disarmed");
				const activation = goal.phase === "active" ? current.goal.phase === "active" ? currentActivation : "armed" : "disarmed";
				const projection = appendGoalChange(id, {
					kind: "goal/change",
					version: 1,
					operation: goal.phase === current.goal.phase ? "edit" : goal.phase === "paused" ? "pause" : goal.phase === "active" ? "resume" : "complete",
					goal,
					roundsStarted: current.roundsStarted,
					createdAt: current.createdAt,
					updatedAt: Date.now()
				});
				setGoalActivation(id, activation);
				return {
					ok: true,
					value: goalView(id, projection)
				};
			}
			/** Canonical fixture implementation of the generated AgentPresets Remote contract. */
			const presetRemotes = {
				list() {
					return {
						ok: true,
						value: {
							presets: [...fixturePresets].map(([id, preset]) => ({
								id,
								trust: preset.trust,
								isDefault: id === fixtureDefaultPreset
							})),
							authorable: true
						}
					};
				},
				select(_id, agentPreset) {
					fixtureDefaultPreset = agentPreset;
					return {
						ok: true,
						value: agentPreset
					};
				},
				read(agentPreset) {
					const preset = fixturePresets.get(agentPreset);
					if (preset === void 0) return {
						ok: false,
						error: {
							code: "agent-preset/not-found",
							message: `unknown agent preset "${agentPreset}"`,
							details: {
								agentPreset,
								available: [...fixturePresets.keys()]
							}
						}
					};
					return {
						ok: true,
						value: {
							agentPreset,
							trust: preset.trust,
							content: preset.content
						}
					};
				},
				copy(from, id) {
					const source = fixturePresets.get(from);
					if (source === void 0) return {
						ok: false,
						error: {
							code: "agent-preset/not-found",
							message: `unknown agent preset "${from}"`,
							details: {
								agentPreset: from,
								available: [...fixturePresets.keys()]
							}
						}
					};
					if (fixturePresets.has(id)) return {
						ok: false,
						error: {
							code: "agent-preset/invalid",
							message: `agent preset "${id}" already exists`,
							details: {
								agentPreset: id,
								reason: "already exists"
							}
						}
					};
					fixturePresets.set(id, {
						trust: "user",
						content: source.content
					});
					return {
						ok: true,
						value: void 0
					};
				},
				deletePreset(id) {
					if (fixturePresets.get(id)?.trust === "system") return {
						ok: false,
						error: {
							code: "agent-preset/read-only",
							message: `agent preset "${id}" ships with the deployment`,
							details: {
								agentPreset: id,
								reason: "it ships with the deployment"
							}
						}
					};
					fixturePresets.delete(id);
					return {
						ok: true,
						value: void 0
					};
				}
			};
			/** At most one in-flight replay per session; cancel clears it. */
			const replays = /* @__PURE__ */ new Map();
			/** History transit delay; the page snapshot is taken at request time. */
			let historyDelayMs = 0;
			/** One-shot history failure (timing hook: a pre-disconnect history request already doomed when reconnect lands). */
			let failNextHistory = false;
			/** Force-enders for currently open stream generators (timing hook: simulated connection loss). */
			const streamBreakers = /* @__PURE__ */ new Set();
			/** Retry scenarios opened by timing hooks and completed in a later browser assertion phase. */
			const retryScenarios = /* @__PURE__ */ new Map();
			/** The single opt-in browser stress producer; normal fixture journeys never start it. */
			let activeReasoningChunkStorm = null;
			globalThis.__fxTiming = {
				setHistoryDelay(ms) {
					historyDelayMs = ms;
				},
				/** Fail the NEXT history call (after its transit delay) with a transport-level throw. */
				failNextHistory() {
					failNextHistory = true;
				},
				/** Log append plus follow-stream delivery (the normal live path). */
				appendUser(id, msg) {
					append(sid(id), {
						type: "user/message",
						surfaceOp: "append",
						data: userMessage(text(msg))
					});
				},
				/** Append a later durable title revision through the normal raw-event + control-frame path. */
				appendTitle(id, title) {
					const messageSeqs = logOf(sid(id)).filter((event) => event.type === "user/message").map((event) => event.seq);
					append(sid(id), {
						type: "session/title",
						data: {
							title,
							messageSeqs,
							source: {
								kind: "provider",
								provider: "fixture"
							}
						}
					});
				},
				/** Disarm the single active goal without a durable phase change. */
				disarmOnlyGoal() {
					const active = [...logs.entries()].filter(([, log]) => {
						return backscanGoal(log)?.goal.phase === "active";
					});
					if (active.length !== 1) throw new Error(`fixture: expected one active goal, found ${String(active.length)}`);
					const [session] = active;
					if (session === void 0) return;
					setGoalActivation(session[0], "disarmed");
				},
				/** Start an externally paced reasoning stream for the opt-in browser stress lane. */
				startReasoningChunkStorm(id, chunkCount, chunksPerInterval, intervalMs) {
					if (!Number.isSafeInteger(chunkCount) || chunkCount < 1) throw new Error("fixture: reasoning chunk count must be a positive safe integer");
					if (!Number.isSafeInteger(chunksPerInterval) || chunksPerInterval < 1) throw new Error("fixture: reasoning chunks per interval must be a positive safe integer");
					if (!Number.isSafeInteger(intervalMs) || intervalMs < 1) throw new Error("fixture: reasoning interval must be a positive safe integer");
					if (activeReasoningChunkStorm?.emitting === true) throw new Error("fixture: reasoning chunk storm already running");
					const sessionId = sid(id);
					const log = logOf(sessionId);
					let turn = nextTurn.get(sessionId) ?? 0;
					for (const event of log) {
						const candidate = event.data?.turn;
						if (typeof candidate === "number") turn = Math.max(turn, candidate + 1);
					}
					nextTurn.set(sessionId, turn + 1);
					const marker = `REASONING_STRESS_COMPLETE:${String(turn)}:${String(chunkCount)}`;
					const state = {
						sessionId: id,
						chunkCount,
						chunksPerInterval,
						intervalMs,
						emitted: 0,
						marker,
						emitting: true
					};
					activeReasoningChunkStorm = state;
					setRunning(sessionId, true);
					append(sessionId, {
						type: "turn/start",
						data: {
							turn,
							trigger: {
								kind: "message",
								source: { kind: "user" }
							}
						}
					});
					append(sessionId, {
						type: "user/message",
						surfaceOp: "append",
						data: userMessage(text(`Reasoning chunk stress: ${String(chunkCount)} chunks.`))
					});
					append(sessionId, {
						type: "step/start",
						data: {
							turn,
							step: 0
						}
					});
					beginAssistant(sessionId, turn, 0);
					pushAssistant(sessionId, {
						type: "block-start",
						index: 0,
						blockType: "reasoning"
					});
					const startedAt = Date.now();
					const pump = () => {
						const elapsedIntervals = Math.floor((Date.now() - startedAt) / intervalMs) + 1;
						const due = Math.max(state.emitted + chunksPerInterval, elapsedIntervals * chunksPerInterval);
						const end = Math.min(due, chunkCount);
						for (let index = state.emitted; index < end; index++) pushAssistant(sessionId, {
							type: "reasoning-delta",
							index: 0,
							text: index === chunkCount - 1 ? `\n${marker}` : index % 64 === 63 ? "推理\n" : "推理"
						});
						state.emitted = end;
						if (end < chunkCount) setTimeout(pump, intervalMs);
						else state.emitting = false;
					};
					setTimeout(pump, 0);
					return marker;
				},
				/** Return a copy so browser probes cannot mutate the active producer. */
				reasoningChunkStormState() {
					return activeReasoningChunkStorm === null ? null : { ...activeReasoningChunkStorm };
				},
				/** Open one failed model step whose partial remains visible until llm/retry arrives. */
				beginModelRetry(id) {
					const sessionId = sid(id);
					const turn = nextTurn.get(sessionId) ?? 0;
					nextTurn.set(sessionId, turn + 1);
					retryScenarios.set(sessionId, {
						turn,
						stepStarted: true
					});
					setRunning(sessionId, true);
					append(sessionId, {
						type: "turn/start",
						data: { turn }
					});
					append(sessionId, {
						type: "user/message",
						surfaceOp: "append",
						data: {
							content: text("请重试这个请求"),
							source: { kind: "user" }
						}
					});
					append(sessionId, {
						type: "step/start",
						data: {
							turn,
							step: 1
						}
					});
					beginAssistant(sessionId, turn, 1);
					pushAssistant(sessionId, {
						type: "block-start",
						index: 0,
						blockType: "text"
					});
					pushAssistant(sessionId, {
						type: "text-delta",
						index: 0,
						text: "应撤回的半截回复"
					});
				},
				/** Record one retry decision; the next attempt remains in the same step. */
				scheduleModelRetry(id, retry = 1, delayMs = 450) {
					const sessionId = sid(id);
					const scenario = retryScenarios.get(sessionId);
					if (scenario === void 0) throw new Error(`fixture: no model retry scenario for ${id}`);
					if (!scenario.stepStarted) {
						beginAssistant(sessionId, scenario.turn, 1);
						pushAssistant(sessionId, {
							type: "block-start",
							index: 0,
							blockType: "text"
						});
						pushAssistant(sessionId, {
							type: "text-delta",
							index: 0,
							text: `第 ${String(retry)} 次应撤回的回复`
						});
						scenario.stepStarted = true;
					}
					const failure = {
						code: "TRANSPORT",
						message: "连接被重置"
					};
					pushAssistant(sessionId, {
						type: "finish",
						reason: {
							kind: "error",
							failure
						}
					});
					const attempt = activeAttempts.get(sessionId);
					commitAssistant(sessionId, append(sessionId, {
						type: "assistant/attempt",
						data: {
							turn: scenario.turn,
							step: 1,
							stream: attempt.stream.snapshot()
						}
					}));
					append(sessionId, {
						type: "llm/retry",
						data: {
							turn: scenario.turn,
							step: 1,
							provider: "fixture",
							mode: "normal",
							policyKey: "fixture-normal",
							retry,
							maxRetries: 2,
							delayMs,
							failure
						}
					});
					scenario.stepStarted = false;
				},
				/** Record one retry decision, then cancel its source turn before the retry starts. */
				cancelModelRetryDuringBackoff(id, delayMs = 450) {
					const sessionId = sid(id);
					const scenario = retryScenarios.get(sessionId);
					if (scenario === void 0) throw new Error(`fixture: no model retry scenario for ${id}`);
					const failure = {
						code: "TRANSPORT",
						message: "连接被重置"
					};
					const active = activeAttempts.get(sessionId);
					if (active !== void 0) {
						pushAssistant(sessionId, {
							type: "finish",
							reason: {
								kind: "error",
								failure
							}
						});
						commitAssistant(sessionId, append(sessionId, {
							type: "assistant/attempt",
							data: {
								turn: scenario.turn,
								step: 1,
								stream: active.stream.snapshot()
							}
						}));
					}
					append(sessionId, {
						type: "llm/retry",
						data: {
							turn: scenario.turn,
							step: 1,
							provider: "fixture",
							mode: "normal",
							policyKey: "fixture-normal",
							retry: 1,
							maxRetries: 2,
							delayMs,
							failure
						}
					});
					append(sessionId, {
						type: "step/end",
						data: {
							turn: scenario.turn,
							step: 1
						}
					});
					append(sessionId, {
						type: "turn/end",
						data: {
							turn: scenario.turn,
							reason: {
								kind: "aborted",
								reason: { kind: "user" }
							}
						}
					});
					retryScenarios.delete(sessionId);
					setRunning(sessionId, false);
				},
				/** Finish the timing-hook retry with a finalized response in the open step. */
				completeModelRetry(id) {
					const sessionId = sid(id);
					const scenario = retryScenarios.get(sessionId);
					if (scenario === void 0) throw new Error(`fixture: no model retry scenario for ${id}`);
					retryScenarios.delete(sessionId);
					const completed = "重试后的完整回复";
					beginAssistant(sessionId, scenario.turn, 1);
					pushAssistant(sessionId, {
						type: "block-start",
						index: 0,
						blockType: "text"
					});
					pushAssistant(sessionId, {
						type: "text-delta",
						index: 0,
						text: completed
					});
					pushAssistant(sessionId, {
						type: "block-end",
						index: 0,
						block: {
							type: "text",
							text: completed
						}
					});
					pushAssistant(sessionId, {
						type: "finish",
						reason: { kind: "stop" }
					});
					const attempt = activeAttempts.get(sessionId);
					commitAssistant(sessionId, append(sessionId, {
						type: "assistant/message",
						surfaceOp: "append",
						data: {
							turn: scenario.turn,
							step: 1,
							message: assistantMessage(text(completed)),
							stream: attempt.stream.snapshot()
						}
					}));
					append(sessionId, {
						type: "step/end",
						data: {
							turn: scenario.turn,
							step: 1
						}
					});
					append(sessionId, {
						type: "turn/end",
						data: {
							turn: scenario.turn,
							reason: { kind: "completed" }
						}
					});
					setRunning(sessionId, false);
				},
				/** Log append without follow delivery: a frame lost in transit that page repair must recover. */
				appendSilent(id, msg) {
					const log = logOf(sid(id));
					log.push({
						type: "user/message",
						surfaceOp: "append",
						seq: SessionSeq(log.length),
						time: Date.now(),
						data: userMessage(text(msg))
					});
				},
				/** End every open stream generator (client sees both streams close -> reconnect + resync path). */
				breakStreams() {
					for (const breakNow of [...streamBreakers]) breakNow();
				}
			};
			/** Prompt replay: chunk typewriter (80ms/frame) -> assistant/message finalize -> turn/end + running flip. */
			const startReply = (id, turn, replyText) => {
				const step = 0;
				append(id, {
					type: "step/start",
					data: {
						turn,
						step
					}
				});
				beginAssistant(id, turn, step);
				pushAssistant(id, {
					type: "block-start",
					index: 0,
					blockType: "text"
				});
				/* v8 ignore next -- the ?? arm needs a null match, but every fixture reply is non-empty. */
				const pieces = replyText.match(/[\s\S]{1,6}/gu) ?? [replyText];
				let i = 0;
				const finish = (aborted) => {
					replays.delete(id);
					const done = pieces.slice(0, i).join("");
					pushAssistant(id, {
						type: "block-end",
						index: 0,
						block: {
							type: "text",
							text: done
						}
					});
					pushAssistant(id, {
						type: "usage",
						usage: fixtureUsage(turn, step)
					});
					if (!aborted) pushAssistant(id, {
						type: "finish",
						reason: { kind: "stop" }
					});
					const attempt = activeAttempts.get(id);
					commitAssistant(id, append(id, {
						type: "assistant/message",
						surfaceOp: "append",
						data: {
							turn,
							step,
							message: assistantMessage(text(done)),
							stream: attempt.stream.snapshot(),
							usage: fixtureUsage(turn, step),
							...aborted ? { interrupted: true } : {}
						}
					}));
					append(id, {
						type: "step/end",
						data: {
							turn,
							step
						}
					});
					append(id, {
						type: "turn/end",
						data: {
							turn,
							reason: aborted ? {
								kind: "aborted",
								reason: { kind: "user" }
							} : { kind: "completed" }
						}
					});
					setRunning(id, false);
				};
				const tick = () => {
					const piece = pieces[i];
					if (piece === void 0) {
						finish(false);
						return;
					}
					i++;
					pushAssistant(id, {
						type: "text-delta",
						index: 0,
						text: piece
					});
					replays.set(id, {
						timer: setTimeout(tick, 80),
						finish
					});
				};
				replays.set(id, {
					timer: setTimeout(tick, 80),
					finish
				});
			};
			const sessionApi = {
				list: (_request) => sessionOk({ items: [...sessions].sort((a, b) => b.updatedAt - a.updatedAt) }),
				search: (request, signal) => {
					if (signal.aborted) return sessionErr({
						code: "gateway/cancelled",
						message: "fixture session search was aborted",
						details: {}
					});
					const query = searchTokenSpans(request.query).tokens.map((token) => token.value);
					const matches = sessions.flatMap((summary) => {
						const log = logs.get(summary.sessionId) ?? [];
						const current = new Set(foldSurface(log).nodes);
						const best = log.flatMap((event) => {
							if (!current.has(event.seq)) return [];
							const eventText = searchEventText(event);
							const document = searchTokenSpans(eventText);
							const match = phraseMatch(document.tokens, query);
							if (match.count === 0) return [];
							return [{
								sessionId: summary.sessionId,
								seq: event.seq,
								time: event.time,
								text: document.text,
								matchCount: match.count,
								matchStart: match.start,
								matchEnd: match.end,
								documentLength: Array.from(eventText).length
							}];
						}).sort(compareSearchCandidates)[0];
						return best === void 0 ? [] : [best];
					}).sort(compareSearchCandidates);
					return sessionOk({
						items: matches.slice(0, FIXTURE_SESSION_SEARCH_RESULT_LIMIT).map((match) => ({
							sessionId: match.sessionId,
							snippet: searchSnippet(match.text, match.matchStart, match.matchEnd)
						})),
						hasMore: matches.length > FIXTURE_SESSION_SEARCH_RESULT_LIMIT
					});
				},
				create: async (request) => {
					const workspace = request.workspaceId === void 0 ? void 0 : workspaces.find((w) => w.workspaceId === request.workspaceId);
					if (request.workspaceId !== void 0 && workspace === void 0) return sessionErr({
						code: "workspace/not-found",
						message: `no workspace ${request.workspaceId}`,
						details: { workspaceId: request.workspaceId }
					});
					const cwd = workspace?.path ?? request.cwd ?? "/tmp/fixture";
					const requestedId = request.sessionId;
					const attachWorkspace = (sessionId) => {
						/* v8 ignore next -- callers enter only when a target Workspace exists. */
						if (workspace === void 0 || workspace.sessionIds.includes(sessionId)) return;
						workspace.sessionIds = [sessionId, ...workspace.sessionIds];
						workspace.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
						emitWorkspace({
							type: "upsert",
							workspace: workspaceSnapshot(workspace)
						});
					};
					const attachFailure = (sessionId, workspaceId) => sessionErr({
						code: "session/workspace-attach-failed",
						message: `fixture rejected Workspace attachment for ${sessionId}`,
						details: {
							sessionId,
							workspaceId
						}
					});
					if (requestedId !== void 0) {
						const existing = summaryOf(requestedId);
						if (existing !== void 0) {
							if (existing.cwd !== cwd) return sessionErr({
								code: "session/conflict",
								message: `session ${requestedId} already uses ${existing.cwd ?? "no cwd"}`,
								details: {
									sessionId: requestedId,
									requestedCwd: cwd,
									...existing.cwd === void 0 ? {} : { existingCwd: existing.cwd }
								}
							});
							if (workspace !== void 0 && !workspace.sessionIds.includes(requestedId)) {
								if (options.failWorkspaceAttach) return attachFailure(requestedId, workspace.workspaceId);
								attachWorkspace(requestedId);
							}
							return sessionOk({ sessionId: requestedId });
						}
					}
					const created = {
						sessionId: requestedId ?? sid(`fx-${nextSession++}`),
						updatedAt: Date.now(),
						running: false,
						blank: true,
						cwd
					};
					sessions.push(created);
					modelSelections.set(created.sessionId, {
						provider: "deepseek-official",
						model: "deepseek-v4-flash"
					});
					const emitSession = () => {
						emitRemote("api-session/added", [created]);
					};
					if (workspace !== void 0 && options.failWorkspaceAttach) {
						emitSession();
						return attachFailure(created.sessionId, workspace.workspaceId);
					}
					if (workspace !== void 0 && options.createFrameOrder === "workspace-first") {
						attachWorkspace(created.sessionId);
						emitSession();
					} else {
						emitSession();
						if (workspace !== void 0) attachWorkspace(created.sessionId);
					}
					if (options.dropSessionCreateResponse) throw new Error("fixture: dropped session.create response after publication");
					return sessionOk({ sessionId: created.sessionId });
				},
				rename: (request) => {
					const missing = requireRemoteSession(request);
					if (missing !== void 0) return missing;
					const { sessionId, title } = request;
					const normalized = title.trim().replace(/\s+/g, " ");
					if (normalized.length === 0) return sessionErr({
						code: "session/title-invalid",
						message: "session title must contain visible characters",
						details: { sessionId }
					});
					append(sessionId, {
						type: "session/title",
						data: {
							title: normalized,
							messageSeqs: [],
							source: { kind: "user" }
						}
					});
					return sessionOk({
						title: normalized,
						seq: logOf(sessionId).at(-1).seq
					});
				},
				fork: (request) => {
					const { sessionId, atSeq } = request;
					const source = summaryOf(sessionId);
					if (source === void 0) return sessionErr({
						code: "session/not-found",
						message: `no session ${sessionId}`,
						details: { sessionId }
					});
					const log = logs.get(sessionId) ?? [];
					const lastSeq = log.at(-1)?.seq ?? -1;
					const boundary = (atSeq === void 0 ? void 0 : log.find((e) => e.type === "turn/end" && e.seq >= atSeq)) ?? (atSeq === void 0 || atSeq > lastSeq ? log.findLast((e) => e.type === "turn/end") : void 0);
					if (boundary === void 0) return sessionErr({
						code: "session/fork-unavailable",
						message: atSeq !== void 0 && atSeq <= lastSeq ? `session ${sessionId} has not completed the turn containing event ${String(atSeq)}` : `session ${sessionId} has no completed turn`,
						details: { sessionId }
					});
					let cut = boundary.seq + 1;
					while (cut < log.length && log[cut]?.type !== "turn/start") cut++;
					const child = {
						sessionId: sid(`fx-${nextSession++}`),
						updatedAt: Date.now(),
						running: false,
						blank: false,
						parentSessionId: sessionId,
						...source.cwd === void 0 ? {} : { cwd: source.cwd }
					};
					logs.set(child.sessionId, log.slice(0, cut));
					sessions.push(child);
					emitRemote("api-session/added", [child]);
					const workspace = workspaces.find((w) => w.sessionIds.includes(sessionId));
					if (workspace !== void 0) {
						workspace.sessionIds = [child.sessionId, ...workspace.sessionIds];
						workspace.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
						emitWorkspace({
							type: "upsert",
							workspace: workspaceSnapshot(workspace)
						});
					}
					return sessionOk({ sessionId: child.sessionId });
				},
				history: async (request) => {
					const log = logs.get(request.sessionId) ?? [];
					const throughSeq = request.throughSeq ?? log.length - 1;
					const page = pageOf(log.slice(0, throughSeq + 1), request.beforeSeq, request.maxMessages ?? 50);
					const doomed = failNextHistory;
					failNextHistory = false;
					const delay = historyDelayMs;
					if (delay > 0) await new Promise((resolve) => setTimeout(resolve, delay));
					if (doomed) throw new Error("fixture: simulated history transport failure");
					return sessionOk(page);
				},
				selectModel: (request) => {
					const selected = {
						provider: request.provider,
						model: request.model,
						...request.reasoningEffort === void 0 ? {} : { reasoningEffort: request.reasoningEffort }
					};
					append(request.sessionId, {
						type: "model/selection",
						data: selected
					});
					modelSelections.set(request.sessionId, selected);
					return sessionOk({ selected });
				},
				prompt: (request) => {
					const { sessionId: id, mode, content } = request;
					const summary = summaryOf(id);
					if (summary === void 0) return sessionErr({
						code: "session/not-found",
						message: `no session ${id}`,
						details: { sessionId: id }
					});
					if (options.rejectPrompt) {
						if (content.some((block) => block.type === "image")) return sessionErr({
							code: "session/attachment-invalid",
							message: "fixture: image side exceeds the deployment limit",
							details: { reason: "IMAGE_DIMENSION_TOO_LARGE" }
						});
						return sessionErr({
							code: "session/agent-busy",
							message: "fixture: prompt rejected before acceptance",
							details: { reason: "fixture-prompt-rejection" }
						});
					}
					summary.updatedAt = Date.now();
					summary.blank = false;
					const userText = content.map((b) => b.type === "text" ? b.text : "").join("");
					const durable = content.map((block) => {
						if (block.type === "text") return block;
						const attachment = {
							attachmentId: `fixture:${randomUuid()}`,
							mediaType: block.mediaType,
							bytes: Math.max(1, Math.floor(block.data.length * 3 / 4) - (block.data.endsWith("==") ? 2 : block.data.endsWith("=") ? 1 : 0)),
							width: 160,
							height: 90,
							...block.name === void 0 ? {} : { name: block.name }
						};
						attachments.set(String(attachment.attachmentId), {
							attachment,
							data: block.data
						});
						return {
							type: "image",
							attachment
						};
					});
					const promptSource = {
						kind: "user",
						rpcId: request.requestId
					};
					if (mode === "steer" && replays.has(id)) {
						append(id, {
							type: "user/message",
							surfaceOp: "append",
							data: userMessage(durable, promptSource)
						});
						return sessionOk({ accepted: true });
					}
					const turn = nextTurn.get(id) ?? 0;
					nextTurn.set(id, turn + 1);
					setRunning(id, true);
					append(id, {
						type: "turn/start",
						data: { turn }
					});
					const plan = foldPlan(logOf(id));
					if (plan.wanted !== null && plan.wanted !== plan.active) append(id, {
						type: "plan/mode",
						data: { active: plan.wanted }
					});
					append(id, {
						type: "user/message",
						surfaceOp: "append",
						data: userMessage(durable, promptSource)
					});
					const selection = modelSelections.get(id) ?? {
						provider: "deepseek",
						model: "deepseek-v4-flash"
					};
					const previousHeader = logOf(id).findLast((event) => event.type === "request/header");
					if (!sameModelSelection(previousHeader?.type === "request/header" ? {
						provider: previousHeader.data.header.config.provider,
						model: previousHeader.data.header.config.model,
						...previousHeader.data.header.config.reasoningEffort === void 0 ? {} : { reasoningEffort: previousHeader.data.header.config.reasoningEffort }
					} : null, selection)) append(id, {
						type: "request/header",
						data: {
							header: { config: selection },
							reason: previousHeader === void 0 ? "initial" : "change"
						}
					});
					if (lastRequestContext(logOf(id))?.model !== selection.model) append(id, {
						type: "request/context",
						data: {
							provider: selection.provider,
							model: selection.model,
							contextWindow: 128e3
						}
					});
					startReply(id, turn, userText === "render markdown" ? MARKDOWN_FIXTURE : userText === "report model" ? (() => {
						const selection = modelSelections.get(id);
						return `当前模型：${selection?.provider ?? "unknown"}/${selection?.model ?? "unknown"}` + (selection?.reasoningEffort === void 0 ? "" : ` · 推理等级：${selection.reasoningEffort}`);
					})() : `回声：${userText}。这是 fixture 的流式回复，用于验证打字机增长与定稿切换。`);
					return sessionOk({ accepted: true });
				},
				attachment: (request) => {
					const stored = attachments.get(String(request.attachmentId));
					if (stored === void 0) return sessionErr({
						code: "session/attachment-invalid",
						message: "fixture attachment missing",
						details: { reason: "ATTACHMENT_NOT_FOUND" }
					});
					if (!logReferencesAttachment(logs.get(request.sessionId) ?? [], String(request.attachmentId))) return sessionErr({
						code: "session/attachment-invalid",
						message: "fixture attachment is not referenced by this session",
						details: { reason: "ATTACHMENT_NOT_REFERENCED" }
					});
					return sessionOk(stored);
				},
				updateQueue: (request) => sessionErr({
					code: "session/queue-item-not-found",
					message: "fixture has no pending queue item",
					details: { itemId: request.itemId }
				}),
				cancel: (request) => {
					const replay = replays.get(request.sessionId);
					if (replay !== void 0) {
						clearTimeout(replay.timer);
						replay.finish(true);
					} else setRunning(request.sessionId, false);
					return sessionOk({ accepted: true });
				}
			};
			const controlBaseline = () => {
				const queues = {};
				const jobs = {};
				const projections = {};
				for (const summary of sessions) {
					queues[summary.sessionId] = [];
					jobs[summary.sessionId] = [];
					const log = logs.get(summary.sessionId) ?? [];
					projections[summary.sessionId] = {
						asOfSeq: log.length - 1,
						values: projectionValuesOf(log)
					};
				}
				return {
					type: "baseline",
					value: {
						queues,
						jobs,
						approvals: [],
						questions: [],
						projections
					}
				};
			};
			const approvalInvocation = () => ({
				type: "waterfall",
				event: "approval/request",
				eventId: pendingApprovalEventId,
				agentId: sid("fx-alpha"),
				request: {
					toolName: "dangerous_tool",
					reason: "fixture 常驻审批（可答：批准/拒绝后消失）"
				}
			});
			const questionInvocation = () => ({
				type: "waterfall",
				event: "user-questions/request",
				eventId: pendingQuestionEventId,
				agentId: sid("fx-alpha"),
				request: { questions: fixtureQuestions }
			});
			async function* openControl(signal) {
				signal.throwIfAborted();
				const conn = new FxInbox();
				controlConns.add(conn);
				const breakNow = () => {
					conn.breakNow();
				};
				streamBreakers.add(breakNow);
				try {
					yield controlBaseline();
					yield* conn.drain(signal);
				} finally {
					streamBreakers.delete(breakNow);
					controlConns.delete(conn);
				}
			}
			async function* openWorkspace(signal) {
				signal.throwIfAborted();
				const conn = new FxInbox();
				workspaceConns.add(conn);
				const breakNow = () => {
					conn.breakNow();
				};
				streamBreakers.add(breakNow);
				try {
					yield workspaceBaseline();
					yield* conn.drain(signal);
				} finally {
					streamBreakers.delete(breakNow);
					workspaceConns.delete(conn);
				}
			}
			async function* openWorkspaceFileChanges(signal) {
				signal.throwIfAborted();
				const conn = new FxInbox();
				const breakNow = () => {
					conn.breakNow();
				};
				streamBreakers.add(breakNow);
				const announce = options.fileChanges ? setTimeout(() => {
					conn.push({
						kind: "change",
						change: {
							absolutePath: `${WORKSPACE_FILES_ROOT}/notes/demo.txt`,
							version: "fx-demo-v2"
						}
					});
				}, 1e3) : void 0;
				try {
					yield { kind: "ready" };
					yield* conn.drain(signal);
				} finally {
					if (announce !== void 0) clearTimeout(announce);
					streamBreakers.delete(breakNow);
				}
			}
			async function* openRemoteEvents(signal) {
				signal.throwIfAborted();
				const clientId = randomUuid();
				const conn = new FxInbox();
				remoteEventConns.set(clientId, conn);
				const timer = setInterval(() => {
					const gamma = summaryOf(sid("fx-gamma"));
					/* v8 ignore next -- the fixture never removes fx-gamma. */
					if (gamma !== void 0) setRunning(gamma.sessionId, !gamma.running);
				}, 5e3);
				try {
					yield {
						type: "ready",
						clientId,
						host: { home: FIXTURE_HOME }
					};
					if (approvalPending) yield approvalInvocation();
					if (questionPending) yield questionInvocation();
					yield* conn.drain(signal);
				} finally {
					clearInterval(timer);
					remoteEventConns.delete(clientId);
				}
			}
			async function* openFollow(request, signal) {
				signal.throwIfAborted();
				const sessionId = request.address.kind === "session" ? request.address.sessionId : request.address.childSessionId;
				if (summaryOf(sessionId) === void 0) throw new Error(`fixture: no session ${sessionId}`);
				const conn = new FxInbox();
				let conns = followConns.get(sessionId);
				if (conns === void 0) {
					conns = /* @__PURE__ */ new Set();
					followConns.set(sessionId, conns);
				}
				conns.add(conn);
				const breakNow = () => {
					conn.breakNow();
				};
				streamBreakers.add(breakNow);
				const snapshot = [...logOf(sessionId)];
				const cursor = snapshot.at(-1)?.seq ?? -1;
				const summary = summaryOf(sessionId);
				/* v8 ignore next -- existence was checked before the stream registered. */
				if (summary === void 0) throw new Error(`fixture: no session ${sessionId}`);
				const initial = pageOf(snapshot, void 0, request.maxMessages ?? 50);
				let nextSeq = cursor + 1;
				try {
					yield {
						type: "snapshot",
						header: {
							version: 3,
							id: sessionId,
							createdAt: summary.updatedAt,
							...summary.cwd === void 0 ? {} : { cwd: summary.cwd },
							...summary.parentSessionId === void 0 ? {} : { parentSession: summary.parentSessionId },
							isSeeded: summary.parentSessionId !== void 0,
							...summary.origin === void 0 ? {} : { origin: summary.origin },
							...summary.agentPreset === void 0 ? {} : { agentPreset: summary.agentPreset }
						},
						cursor,
						records: initial.records,
						hasMore: initial.hasMore,
						projections: {
							asOfSeq: cursor,
							values: projectionValuesOf(snapshot)
						},
						...request.assistantStream === true ? { assistantStream: {
							revision: assistantRevisions.get(sessionId) ?? 0,
							...activeAttempts.get(sessionId) === void 0 ? {} : { activeAttempt: {
								attemptId: activeAttempts.get(sessionId).attemptId,
								startedAfterSeq: activeAttempts.get(sessionId).startedAfterSeq,
								turn: activeAttempts.get(sessionId).turn,
								step: activeAttempts.get(sessionId).step,
								nextIndex: activeAttempts.get(sessionId).index,
								stream: activeAttempts.get(sessionId).stream.snapshot()
							} }
						} } : {}
					};
					for await (const frame of conn.drain(signal)) {
						if (frame.type === "assistant-stream") {
							yield frame;
							continue;
						}
						if (frame.event.seq < nextSeq) continue;
						if (frame.event.seq !== nextSeq) throw new Error(`fixture: session event stream skipped seq ${String(nextSeq)}`);
						nextSeq++;
						yield frame;
					}
				} finally {
					streamBreakers.delete(breakNow);
					conns.delete(conn);
					if (conns.size === 0) followConns.delete(sessionId);
				}
			}
			const answerRemoteEvent = (result) => {
				if (!remoteEventConns.has(result.clientId)) return {
					ok: false,
					error: {
						code: "gateway/invocation-unavailable",
						message: "fixture Remote event result identifies no active event stream",
						details: {}
					}
				};
				if (result.eventId === pendingApprovalEventId) {
					if (!approvalPending) return {
						ok: true,
						value: void 0
					};
					approvalPending = false;
				} else if (result.eventId === pendingQuestionEventId) {
					if (!questionPending) return {
						ok: true,
						value: void 0
					};
					questionPending = false;
				} else return {
					ok: true,
					value: void 0
				};
				emitRemoteFrame({
					type: "cancel",
					eventId: result.eventId
				});
				return {
					ok: true,
					value: void 0
				};
			};
			const workspaceApi = {
				create: (request) => {
					const existing = workspaces.find((workspace) => workspace.path === request.path);
					if (existing !== void 0) return sessionOk({
						workspace: workspaceSnapshot(existing),
						created: false
					});
					const now = (/* @__PURE__ */ new Date()).toISOString();
					const created = {
						workspaceId: wid(`fx-ws-${nextWorkspace++}`),
						path: request.path,
						title: request.path.split("/").filter(Boolean).at(-1) ?? request.path,
						sessionIds: [],
						createdAt: now,
						updatedAt: now
					};
					workspaces.unshift(created);
					const workspace = workspaceSnapshot(created);
					emitWorkspace({
						type: "upsert",
						workspace
					});
					return sessionOk({
						workspace,
						created: true
					});
				},
				rename: (request) => {
					const workspace = workspaces.find((candidate) => candidate.workspaceId === request.workspaceId);
					if (workspace === void 0) return sessionErr({
						code: "workspace/not-found",
						message: `no workspace ${request.workspaceId}`,
						details: { workspaceId: request.workspaceId }
					});
					const title = request.title.trim();
					if (title === "") return sessionErr({
						code: "gateway/bad-request",
						message: "Workspace rename requires a non-blank title",
						details: {}
					});
					if (title !== workspace.title) {
						if (workspaces.some((candidate) => candidate.workspaceId !== request.workspaceId && candidate.title === title)) return sessionErr({
							code: "workspace/name-conflict",
							message: `workspace name '${title}' is already in use`,
							details: { name: title }
						});
						workspace.title = title;
						workspace.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
						emitWorkspace({
							type: "upsert",
							workspace: workspaceSnapshot(workspace)
						});
					}
					return sessionOk({ workspace: workspaceSnapshot(workspace) });
				},
				delete: (request) => {
					const index = workspaces.findIndex((workspace) => workspace.workspaceId === request.workspaceId);
					if (index === -1) return sessionErr({
						code: "workspace/not-found",
						message: `no workspace ${request.workspaceId}`,
						details: { workspaceId: request.workspaceId }
					});
					workspaces.splice(index, 1);
					emitWorkspace({
						type: "remove",
						workspaceId: request.workspaceId
					});
					return sessionOk({ deleted: true });
				},
				insertBefore: (request) => {
					const source = workspaces.findIndex((workspace) => workspace.workspaceId === request.workspaceId);
					const anchor = request.beforeWorkspaceId === void 0 ? workspaces.length : workspaces.findIndex((workspace) => workspace.workspaceId === request.beforeWorkspaceId);
					const missing = source === -1 ? request.workspaceId : anchor === -1 ? request.beforeWorkspaceId : void 0;
					if (missing !== void 0) return sessionErr({
						code: "workspace/not-found",
						message: `no workspace ${missing}`,
						details: { workspaceId: missing }
					});
					if (request.beforeWorkspaceId !== request.workspaceId) {
						const previousOrder = workspaces.map((workspace) => workspace.workspaceId);
						const [workspace] = workspaces.splice(source, 1);
						/* v8 ignore next -- source was resolved from the same array immediately above. */
						if (workspace === void 0) throw new Error(`fixture lost workspace ${request.workspaceId}`);
						const at = request.beforeWorkspaceId === void 0 ? workspaces.length : workspaces.findIndex((candidate) => candidate.workspaceId === request.beforeWorkspaceId);
						workspaces.splice(at, 0, workspace);
						if (workspaces.some((candidate, index) => candidate.workspaceId !== previousOrder[index])) emitWorkspace({
							type: "order",
							workspaceIds: workspaces.map((candidate) => candidate.workspaceId)
						});
					}
					return sessionOk({ workspaceIds: workspaces.map((candidate) => candidate.workspaceId) });
				},
				insertSessionBefore: (request) => {
					const workspace = workspaces.find((candidate) => candidate.workspaceId === request.workspaceId);
					if (workspace === void 0) return sessionErr({
						code: "workspace/not-found",
						message: `no workspace ${request.workspaceId}`,
						details: { workspaceId: request.workspaceId }
					});
					if (!workspace.sessionIds.includes(request.sessionId) || request.beforeSessionId !== void 0 && !workspace.sessionIds.includes(request.beforeSessionId)) return sessionErr({
						code: "workspace/move-invalid",
						message: `session or anchor is not accounted by workspace ${request.workspaceId}`,
						details: {
							workspaceId: request.workspaceId,
							sessionId: request.sessionId,
							...request.beforeSessionId === void 0 ? {} : { beforeSessionId: request.beforeSessionId }
						}
					});
					const without = workspace.sessionIds.filter((id) => id !== request.sessionId);
					const at = request.beforeSessionId === void 0 ? without.length : without.indexOf(request.beforeSessionId);
					const sessionIds = [
						...without.slice(0, at),
						request.sessionId,
						...without.slice(at)
					];
					if (!sessionIds.every((id, index) => id === workspace.sessionIds[index])) {
						workspace.sessionIds = sessionIds;
						workspace.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
						emitWorkspace({
							type: "upsert",
							workspace: workspaceSnapshot(workspace)
						});
					}
					return sessionOk({ workspace: workspaceSnapshot(workspace) });
				},
				archiveSession: (request) => {
					if (summaryOf(request.sessionId) === void 0) return sessionErr({
						code: "session/not-found",
						message: `no session ${request.sessionId}`,
						details: { sessionId: request.sessionId }
					});
					if (!archivedSessionIds.includes(request.sessionId)) {
						archivedSessionIds.push(request.sessionId);
						emitWorkspace({
							type: "archived",
							archivedSessionIds: [...archivedSessionIds]
						});
					}
					return sessionOk({ archivedSessionIds: [...archivedSessionIds] });
				}
			};
			return { rpc: {
				call(channel, endpoint, payload, signal) {
					if (channel !== "/api") return Promise.reject(/* @__PURE__ */ new Error(`fixture connection RPC channel ${JSON.stringify(channel)} is unavailable`));
					const args = payload.args;
					const sessionId = args.agentId;
					const callSignal = signal ?? new AbortController().signal;
					const request = args.request;
					switch (endpoint) {
						case "commands/list": return Promise.resolve(commandRemotes.list(sessionId));
						case "commands/execute": return Promise.resolve(commandRemotes.execute(sessionId, args.line, args.images ?? []));
						case "fileReferences/list": return Promise.resolve(referenceRemotes.files(sessionId, args.query ?? ""));
						case "sessionReferenceResolver/candidates": return Promise.resolve(referenceRemotes.sessions(sessionId, args.query ?? ""));
						case "directoryPicker/pick": return Promise.resolve(directoryPickerRemotes.pick());
						case "directoryPicker/list": return Promise.resolve(directoryPickerRemotes.list(args.path));
						case "directoryPicker/createDirectory": return Promise.resolve(directoryPickerRemotes.createDirectory(args.path ?? "", args.name ?? ""));
						case "goals/get": return Promise.resolve(goalRemotes.get(sessionId));
						case "goals/create": return Promise.resolve(goalRemotes.create(sessionId, {
							objective: request?.objective,
							...request?.maxGoalRounds === void 0 ? {} : { maxGoalRounds: request.maxGoalRounds }
						}));
						case "goals/edit": return Promise.resolve(goalRemotes.edit(sessionId, args.ref, request));
						case "goals/pause": return Promise.resolve(goalRemotes.pause(sessionId, args.ref));
						case "goals/resume": return Promise.resolve(goalRemotes.resume(sessionId, args.ref));
						case "goals/complete": return Promise.resolve(goalRemotes.complete(sessionId, args.ref));
						case "goals/clear": return Promise.resolve(goalRemotes.clear(sessionId, args.ref));
						case "agentPresets/list": return Promise.resolve(presetRemotes.list());
						case "agentPresets/select": return Promise.resolve(presetRemotes.select(sessionId, args.agentPreset));
						case "agentPresets/read": return Promise.resolve(presetRemotes.read(args.agentPreset));
						case "agentPresets/copy": return Promise.resolve(presetRemotes.copy(args.from, args.id));
						case "agentPresets/deletePreset": return Promise.resolve(presetRemotes.deletePreset(args.id));
						case "subagents/list": return Promise.resolve({
							ok: true,
							value: {
								entries: [],
								parentAvailable: true
							}
						});
						case "subagents/prompt": return Promise.resolve({
							ok: true,
							value: { messageId: `fixture-message-${request.childSessionId}` }
						});
						case "subagents/interruptByParent": return Promise.resolve({
							ok: true,
							value: { accepted: true }
						});
						case "credentials/describe": return Promise.resolve(credentialRemotes.describe(args.refs ?? []));
						case "credentials/set": return Promise.resolve(credentialRemotes.set(args.ref));
						case "credentials/unset": return Promise.resolve(credentialRemotes.unset(args.ref));
						case "settings/describe": return Promise.resolve(settingsRemotes.describe());
						case "settings/canOpenAgentPresetDirectory": return Promise.resolve({
							ok: true,
							value: true
						});
						case "settings/openSettingsDocument": return Promise.resolve(settingsRemotes.openSettingsDocument());
						case "settings/openAgentPresetDirectory": return Promise.resolve(settingsRemotes.openAgentPresetDirectory(args.agentPreset));
						case "skills/list": {
							const missing = requireRemoteSession(request);
							if (missing !== void 0) return missing;
							return sessionOk({ skills: [{
								name: "fixture-demo",
								description: "fixture 技能样本",
								whenToUse: "仅供 UI 目录渲染验收",
								modelInvocable: true
							}, {
								name: "fixture-user-only",
								description: "fixture 仅用户技能样本",
								modelInvocable: false
							}] });
						}
						case "session/openWorkspacePath": return sessionOk({ opened: true });
						case "workspaceFiles/read": return Promise.resolve(workspaceFileRemotes.read(args.path ?? "", args.range ?? {}));
						case "workspaceFiles/stat": return Promise.resolve(workspaceFileRemotes.stat(args.path ?? ""));
						case "workspaceFiles/list": return Promise.resolve(workspaceFileRemotes.list(args.path ?? ""));
						case "session/canOpenWorkspacePath": return Promise.resolve({
							ok: true,
							value: true
						});
						case "session/modelCatalog": return Promise.resolve({
							ok: true,
							value: {
								default: {
									provider: "deepseek-official",
									model: "deepseek-v4-flash"
								},
								routableProviders: [
									"deepseek-official",
									"openai",
									"acme-gateway"
								],
								groups: fixtureModelGroups(),
								failures: []
							}
						});
						case "llm/listProviders": return Promise.resolve({
							ok: true,
							value: [
								{
									id: "deepseek-official",
									name: "DeepSeek"
								},
								{
									id: "openai",
									name: "openai"
								},
								{
									id: "acme-gateway",
									name: "Acme Gateway"
								}
							]
						});
						case "llm/listConfigurableProviders": return Promise.resolve({
							ok: true,
							value: [
								{
									provider: "deepseek-official",
									displayName: "DeepSeek",
									settingsNs: "llm-deepseek",
									settingsPath: []
								},
								{
									provider: "openai",
									displayName: "openai",
									settingsNs: "llm-pi-ai",
									settingsPath: ["providers", "openai"],
									declared: false
								},
								{
									provider: "anthropic",
									displayName: "anthropic",
									settingsNs: "llm-pi-ai",
									settingsPath: ["providers", "anthropic"],
									declared: false
								},
								{
									provider: "acme-gateway",
									displayName: "Acme Gateway",
									settingsNs: "llm-pi-ai",
									settingsPath: ["providers", "acme-gateway"],
									declared: true
								}
							]
						});
						case "llm/discoverModels": return Promise.resolve({
							ok: true,
							value: fixtureModelGroups().flatMap((group) => group.models.map((model) => ({
								id: model.id,
								name: model.name
							})))
						});
						case "settings/update": return Promise.resolve(settingsRemotes.update(args.ns));
						case "settings/replace": return Promise.resolve(settingsRemotes.replace(args.ns));
						case "settings/mutate": return Promise.resolve(settingsRemotes.mutate(args.ns));
						case "session/list": return sessionApi.list(args._request);
						case "session/search": return sessionApi.search(request, callSignal);
						case "session/create": return sessionApi.create(request);
						case "session/selectModel": return sessionApi.selectModel(request);
						case "session/rename": return sessionApi.rename(request);
						case "session/fork": return sessionApi.fork(request);
						case "session/prompt": return sessionApi.prompt(request);
						case "session/attachment": return sessionApi.attachment(request);
						case "session/updateQueue": return sessionApi.updateQueue(request);
						case "session/cancel": return sessionApi.cancel(request);
						case "session/page": {
							const page = request;
							const pageSessionId = page.address.kind === "session" ? page.address.sessionId : page.address.childSessionId;
							return sessionApi.history({
								sessionId: pageSessionId,
								throughSeq: page.throughSeq,
								...page.beforeSeq === void 0 ? {} : { beforeSeq: page.beforeSeq },
								...page.maxMessages === void 0 ? {} : { maxMessages: page.maxMessages }
							});
						}
						case "$events/result": return Promise.resolve(answerRemoteEvent(args));
						case "workspace/create": return workspaceApi.create(request);
						case "workspace/rename": return workspaceApi.rename(request);
						case "workspace/delete": return workspaceApi.delete(request);
						case "workspace/insertBefore": return workspaceApi.insertBefore(request);
						case "workspace/insertSessionBefore": return workspaceApi.insertSessionBefore(request);
						case "workspace/archiveSession": return workspaceApi.archiveSession(request);
						default: return Promise.reject(/* @__PURE__ */ new Error(`fixture connection RPC endpoint ${JSON.stringify(endpoint)} is unavailable`));
					}
				},
				open(channel, endpoint, payload, signal) {
					if (channel !== "/api") throw new Error(`fixture connection RPC channel ${JSON.stringify(channel)} is unavailable`);
					const args = payload.args;
					switch (endpoint) {
						case "$events": return openRemoteEvents(signal);
						case "session/control": return openControl(signal);
						case "session/follow": return openFollow(args.request, signal);
						case "workspace/follow": return openWorkspace(signal);
						case "workspaceFiles/changes": return openWorkspaceFileChanges(signal);
						default: throw new Error(`fixture connection stream endpoint ${JSON.stringify(endpoint)} is unavailable`);
					}
				}
			} };
		}
		/**
		* Build the browser fixture transport from the current page's query switches.
		* @returns an in-memory Connection RPC transport.
		*/
		function createFixtureConnectionRpc() {
			return createFixtureWorld(fixtureOptionsFromLocation()).rpc;
		}
		/** Browser query mapping; direct unit callers pass FixtureOptions explicitly. */
		function fixtureOptionsFromLocation() {
			if (typeof location === "undefined") return {};
			const query = new URLSearchParams(location.search);
			return {
				empty: query.get("fixture") === "empty",
				rejectPrompt: query.get("fixturePrompt") === "reject",
				failWorkspaceAttach: query.get("fixtureAttach") === "fail",
				dropSessionCreateResponse: query.get("fixtureSessionCreate") === "drop-response",
				createFrameOrder: query.get("fixtureFrames") === "workspace-first" ? "workspace-first" : "session-first",
				fileChanges: query.get("fixtureFileChanges") === "demo"
			};
		}
		//#endregion
		//#region lib/types/rpc.js
		/** Generic unary RPC contracts shared by the Host and Client Connection halves. */
		/**
		* Brand one validated string as a Connection correlation id.
		* @param id - validated wire identity.
		* @returns the same string with the correlation-id brand.
		*/
		function RpcId(id) {
			return id;
		}
		/**
		* Convert a rejected transport operation into a generic failure result.
		* @param error - rejected transport value.
		* @returns an `internal` failure preserving the available message.
		*/
		function transportError(error) {
			return {
				ok: false,
				error: {
					code: "gateway/internal",
					message: error instanceof Error ? error.message : String(error),
					details: {}
				}
			};
		}
		//#endregion
		//#region lib/types/client/rpc.js
		/** Browser caller for generic Connection unary RPC channels. */
		const INTERNAL_BASE = "http://dsh.internal";
		const CHANNEL_PATTERN = /^\/[A-Za-z0-9._~-]+$/;
		const ENDPOINT_SEGMENT_PATTERN = /^[A-Za-z0-9_$.-]+$/;
		/**
		* Create the browser-backed generic RPC caller.
		* @param doFetch - transport override; defaults to the page's global fetch.
		* @param openStream - optional worker-local Gateway stream carrier.
		* @returns caller that owns request correlation and response-envelope validation.
		*/
		function createWebConnectionRpc(doFetch, openStream) {
			const send = doFetch ?? ((input, init) => globalThis.fetch(input, init));
			return {
				async call(channel, endpoint, payload, signal) {
					assertTarget(channel, endpoint);
					const rpcId = RpcId(randomUuid());
					const message = {
						type: "client-request",
						rpcId,
						method: endpoint,
						payload
					};
					const response = await send(new URL(`${channel}/${endpoint}`, resolveBase()), {
						method: "POST",
						headers: { "content-type": "application/json" },
						body: JSON.stringify(message),
						...signal === void 0 ? {} : { signal }
					});
					if (!response.ok) throw new Error(`transport failure for ${channel}/${endpoint}: HTTP ${response.status}`);
					const full = parseConnectionResponse(await response.json());
					if (full.rpcId !== rpcId) throw new Error(`rpcId mismatch for ${endpoint}: sent ${rpcId}, got ${full.rpcId}`);
					return full.result;
				},
				...openStream === void 0 ? {} : { open(channel, endpoint, payload, signal) {
					assertTarget(channel, endpoint);
					if (channel !== "/api") throw new Error(`connection: worker-local streams require the /api channel, got ${JSON.stringify(channel)}`);
					return openStream(endpoint, payload, signal);
				} }
			};
		}
		function parseConnectionResponse(value) {
			if (!isRecord(value) || value.type !== "server-response" || typeof value.rpcId !== "string") throw new TypeError("connection: invalid server-response envelope");
			const result = value.result;
			if (!isRecord(result)) throw new TypeError("connection: invalid server-response result");
			if (result.ok === true) return {
				rpcId: RpcId(value.rpcId),
				result: {
					ok: true,
					value: result.value
				}
			};
			if (result.ok !== false || !isRecord(result.error)) throw new TypeError("connection: invalid server-response result");
			const error = result.error;
			if (typeof error.code !== "string" || typeof error.message !== "string" || !isRecord(error.details)) throw new TypeError("connection: invalid server-response failure");
			return {
				rpcId: RpcId(value.rpcId),
				result: {
					ok: false,
					error: {
						code: error.code,
						message: error.message,
						details: error.details
					}
				}
			};
		}
		function isRecord(value) {
			return typeof value === "object" && value !== null && !Array.isArray(value);
		}
		function resolveBase() {
			const location = globalThis.location;
			return location?.origin !== void 0 && location.origin !== "null" ? location.origin : INTERNAL_BASE;
		}
		function assertTarget(channel, endpoint) {
			const segments = endpoint.split("/");
			if (!CHANNEL_PATTERN.test(channel) || segments.some((segment) => segment === "" || segment === "." || segment === ".." || !ENDPOINT_SEGMENT_PATTERN.test(segment))) throw new Error(`connection: invalid RPC target ${JSON.stringify(`${channel}/${endpoint}`)}`);
		}
		//#endregion
		//#region lib/types/loopback-hostname.js
		/**
		* Browser-safe, zero-dependency loopback classification shared by the `/api`
		* Host fence and the package's `ctx.connection` state. The predicate stays
		* package-internal; client plugins consume the derived state through Cordis.
		*/
		/**
		* Whether a normalized URL hostname names the local loopback authority.
		* @param hostname - WHATWG URL hostname (IPv6 literals retain brackets).
		* @returns true for localhost, IPv6 loopback, or any IPv4 address in 127/8.
		*/
		function isLoopbackHostname(hostname) {
			if (hostname === "localhost" || hostname === "[::1]") return true;
			const parts = hostname.split(".");
			return parts.length === 4 && parts[0] === "127" && parts.every((part) => /^\d{1,3}$/.test(part) && Number(part) <= 255);
		}
		//#endregion
		//#region lib/types/client/index.js
		/** Required services (none — this is the wire root). */
		const inject = [];
		function watchBrowserNetwork(controller) {
			const browser = globalThis.window;
			const initiallyAvailable = browser?.navigator?.onLine;
			if (browser === void 0 || initiallyAvailable === void 0) return () => {};
			const online = () => {
				controller.setNetworkAvailable(true);
			};
			const offline = () => {
				controller.setNetworkAvailable(false);
			};
			controller.setNetworkAvailable(initiallyAvailable);
			browser.addEventListener("online", online);
			browser.addEventListener("offline", offline);
			return () => {
				browser.removeEventListener("online", online);
				browser.removeEventListener("offline", offline);
			};
		}
		/**
		* Client plugin body: pick physical carriers by page mode and provide ctx.connection.
		* @param ctx - client cordis context.
		*/
		function apply(ctx) {
			const pageLocation = typeof location === "undefined" ? void 0 : location;
			const fixtureRpc = pageLocation !== void 0 && new URLSearchParams(pageLocation.search).has("fixture") ? createFixtureConnectionRpc() : void 0;
			const transport = globalThis.__DSH_TRANSPORT__;
			const recovery = resolveConnectionConfig(globalThis.__DSH_CONNECTION_RECOVERY__);
			const rpc = fixtureRpc ?? createWebConnectionRpc(transport?.fetch, transport?.openStream);
			let generationSource;
			let owner;
			let generationId = 0;
			let generation;
			let state;
			const generationListeners = /* @__PURE__ */ new Set();
			const stateListeners = /* @__PURE__ */ new Set();
			const publishGeneration = (next) => {
				if (Object.is(generation, next)) return;
				generation = next;
				for (const listener of [...generationListeners]) try {
					listener();
				} catch (error) {
					console.error("[connection] generation listener threw:", error);
				}
			};
			const publishState = (next) => {
				if (state === next) return;
				state = next;
				for (const listener of [...stateListeners]) try {
					listener();
				} catch (error) {
					console.error("[connection] state listener threw:", error);
				}
			};
			const releaseOwner = (current) => {
				if (owner !== current) return;
				owner = void 0;
				current.stopNetworkWatch();
				current.controller.stop();
				publishGeneration(void 0);
				publishState(void 0);
			};
			const handle = {
				isLoopback: transport?.ownsHost === true || pageLocation === void 0 || isLoopbackHostname(pageLocation.hostname),
				generation: {
					getSnapshot: () => generation,
					subscribe: (listener) => {
						generationListeners.add(listener);
						return () => {
							generationListeners.delete(listener);
						};
					}
				},
				state: {
					getSnapshot: () => state,
					subscribe: (listener) => {
						stateListeners.add(listener);
						return () => {
							stateListeners.delete(listener);
						};
					}
				},
				rpc,
				reconnect() {
					owner?.controller.reconnect();
				},
				registerGenerationSource(source) {
					if (generationSource !== void 0) throw new Error("connection: a generation source is already registered");
					generationSource = source;
					return () => {
						if (generationSource !== source) return;
						generationSource = void 0;
						const current = owner;
						if (current?.source === source) releaseOwner(current);
					};
				},
				start(sinks, config) {
					if (owner !== void 0) throw new Error("connection: the stream loop is already owned by another consumer");
					const source = generationSource;
					if (source === void 0) throw new Error("connection: no generation source is registered");
					const token = {};
					const ownsGeneration = () => owner?.token === token;
					const controller = new ConnectionController(source, {
						...sinks,
						onConnected: (host) => {
							const nextGeneration = {
								id: ++generationId,
								host
							};
							publishGeneration(nextGeneration);
							if (!ownsGeneration() || !Object.is(generation, nextGeneration)) return;
							sinks.onConnected?.(host);
						},
						onStateChange: (state) => {
							if (state !== "connected") publishGeneration(void 0);
							if (!ownsGeneration()) return;
							publishState(state);
							sinks.onStateChange?.(state);
						}
					}, {
						...recovery,
						...config
					});
					const current = {
						token,
						source,
						controller,
						stopNetworkWatch: watchBrowserNetwork(controller)
					};
					owner = current;
					controller.start();
					return { stop: () => {
						releaseOwner(current);
					} };
				}
			};
			ctx.provide("connection", handle);
		}
		//#endregion
		exports.RpcId = RpcId;
		exports.apply = apply;
		exports.inject = inject;
		exports.transportError = transportError;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map