window.__ModuleLoader__.load({
	id: "@deepseek-ai/dsh-client-ui-theme",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react_jsx_runtime = require("react/jsx-runtime");
		let _deepseek_ai_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");
		let _deepseek_ai_dsh_client_store = require("@deepseek-ai/dsh-client-store");
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
		//#region \0dsh-css:/home/runner/work/deepseek-harness/deepseek-harness/packages/client/ui-theme/src/client/AppearanceRow.module.css.mjs
		const css$1 = "._8HJdBW_group{border-bottom:.5px solid var(--dsw-alias-border-l2);flex-direction:column;gap:8px;padding:16px 0;display:flex}._8HJdBW_title{color:var(--dsw-alias-label-primary);font-size:14px;font-weight:400;line-height:22px}._8HJdBW_cubeRow{flex-wrap:wrap;align-items:stretch;gap:8px;display:flex}._8HJdBW_themeCube{box-sizing:border-box;border:.5px solid var(--dsw-alias-border-l4);font:inherit;color:var(--dsw-alias-label-primary);cursor:pointer;background:0 0;border-radius:20px;flex-direction:column;flex:180px;justify-content:center;align-items:center;gap:4px;padding:20px 32px;font-size:14px;line-height:22px;display:flex}._8HJdBW_themeCube:hover:not(._8HJdBW_selected){background:var(--dsw-alias-interactive-bg-hover)}._8HJdBW_selected{background:var(--dsw-alias-bg-module-platform);border-color:var(--dsw-static-neutral-bluish-400)}";
		const tagId$1 = "@deepseek-ai/dsh-client-ui-theme/AppearanceRow.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$1) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@deepseek-ai/dsh-client-ui-theme";
			tag.dataset.pluginCss = tagId$1;
			tag.textContent = css$1;
			document.head.appendChild(tag);
		}
		var AppearanceRow_module_css_default = {
			"cubeRow": "_8HJdBW_cubeRow",
			"group": "_8HJdBW_group",
			"selected": "_8HJdBW_selected",
			"themeCube": "_8HJdBW_themeCube",
			"title": "_8HJdBW_title"
		};
		//#endregion
		//#region lib/types/client/AppearanceRow.js
		/**
		* Appearance preference row registered into the General section item slot
		* (figma 501:30012 'Frame 2117131228'): title + three preference cubes.
		* Registered by this package — the theme feature owns its own settings
		* surface. Selection follows the persisted preference, never the resolved
		* active theme.
		*/
		/** Cube order and icons (figma 501:30015-30017: Light, Dark, System). */
		const CUBES = [
			{
				id: "light",
				labelKey: "appearance.light",
				Icon: _deepseek_ai_dsh_client_ui_primitives.IconLightOutline16
			},
			{
				id: "dark",
				labelKey: "appearance.dark",
				Icon: _deepseek_ai_dsh_client_ui_primitives.IconDarkOutline16
			},
			{
				id: "system",
				labelKey: "appearance.system",
				Icon: _deepseek_ai_dsh_client_ui_primitives.IconFollowsystemOutline16
			}
		];
		/**
		* Render the Appearance row.
		* @param props - composed slot props.
		* @returns the row element tree.
		*/
		function AppearanceRow({ t, setTheme, useStore }) {
			const preference = useStore((s) => s.preference);
			return (0, react_jsx_runtime.jsxs)("div", {
				className: AppearanceRow_module_css_default.group,
				children: [(0, react_jsx_runtime.jsx)("div", {
					className: AppearanceRow_module_css_default.title,
					children: t("appearance.title")
				}), (0, react_jsx_runtime.jsx)("div", {
					className: AppearanceRow_module_css_default.cubeRow,
					children: CUBES.map(({ id, labelKey, Icon }) => (0, react_jsx_runtime.jsxs)("button", {
						type: "button",
						className: clsx(AppearanceRow_module_css_default.themeCube, preference === id && AppearanceRow_module_css_default.selected),
						"aria-pressed": preference === id,
						onClick: () => {
							setTheme(id);
						},
						children: [(0, react_jsx_runtime.jsx)(Icon, {}), t(labelKey)]
					}, id))
				})]
			});
		}
		//#endregion
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
		//#region lib/types/theme-settings.js
		/** Theme preferences stored in the Host user-settings document. */
		/** Built-in preferences accepted at the registry and settings boundaries. */
		const THEME_PREFERENCES = [
			"light",
			"dark",
			"system"
		];
		/** Settings namespace owned by the theme plugin. */
		const THEME_SETTINGS_NAMESPACE = "ui-theme";
		/** Field carrying the selected built-in theme preference. */
		const THEME_PREFERENCE_FIELD = "preference";
		/** Field carrying the conversation content font size. */
		const FONT_SIZE_FIELD = "fontSize";
		/** Default preference when the user-settings document has no override. */
		const DEFAULT_PREFERENCE = "system";
		Schema.object({
			[THEME_PREFERENCE_FIELD]: Schema.union([...THEME_PREFERENCES]).default(DEFAULT_PREFERENCE),
			[FONT_SIZE_FIELD]: Schema.number().step(1).min(12).max(17).default(14)
		});
		/**
		* Narrow one wire or registry value to a persistable preference.
		* @param value - value crossing the settings or registry boundary.
		* @returns whether the value is a built-in preference.
		*/
		function isThemePreference(value) {
			return THEME_PREFERENCES.some((preference) => preference === value);
		}
		//#endregion
		//#region \0dsh-css:/home/runner/work/deepseek-harness/deepseek-harness/packages/client/ui-theme/src/client/FontSizeRow.module.css.mjs
		const css = ".bVCLcG_row{border-bottom:.5px solid var(--dsw-alias-border-l2);align-items:center;gap:8px;padding:16px 0;display:flex}.bVCLcG_rowText{flex-direction:column;flex:1;gap:4px;min-width:0;padding-right:48px;display:flex}.bVCLcG_title{color:var(--dsw-alias-label-primary);font-size:14px;font-weight:400;line-height:22px}.bVCLcG_desc{color:var(--dsw-alias-label-tertiary);font-size:12px;font-weight:400;line-height:18px}.bVCLcG_control{align-items:center;gap:8px;display:inline-flex}.bVCLcG_stepper{background:var(--dsw-alias-bg-module-platform);border-radius:18px;justify-content:center;align-items:center;min-width:72px;height:36px;display:inline-flex;position:relative}.bVCLcG_value{text-align:center;font-variant-numeric:tabular-nums;min-width:18px;color:var(--dsw-alias-label-primary);font-size:14px;line-height:22px}.bVCLcG_unit{color:var(--dsw-alias-label-secondary);font-size:14px;line-height:22px}.bVCLcG_arrows{opacity:0;flex-direction:column;gap:2px;display:flex;position:absolute;right:8px}.bVCLcG_stepper:hover .bVCLcG_arrows,.bVCLcG_stepper:focus-within .bVCLcG_arrows{opacity:1}.bVCLcG_arrow{background:color-mix(in srgb, var(--dsw-alias-bg-layer-1) 75%, transparent);width:17px;height:12px;color:var(--dsw-alias-label-primary);cursor:pointer;border:none;border-radius:3px;justify-content:center;align-items:center;padding:0;display:inline-flex}.bVCLcG_arrow:hover:not(:disabled){background:var(--dsw-alias-bg-layer-1)}.bVCLcG_arrow:disabled{color:var(--dsw-alias-label-caption);cursor:default}";
		const tagId = "@deepseek-ai/dsh-client-ui-theme/FontSizeRow.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@deepseek-ai/dsh-client-ui-theme";
			tag.dataset.pluginCss = tagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}
		var FontSizeRow_module_css_default = {
			"arrow": "bVCLcG_arrow",
			"arrows": "bVCLcG_arrows",
			"control": "bVCLcG_control",
			"desc": "bVCLcG_desc",
			"row": "bVCLcG_row",
			"rowText": "bVCLcG_rowText",
			"stepper": "bVCLcG_stepper",
			"title": "bVCLcG_title",
			"unit": "bVCLcG_unit",
			"value": "bVCLcG_value"
		};
		//#endregion
		//#region lib/types/client/FontSizeRow.js
		/**
		* Font-size preference row registered into the General section item slot:
		* title + body-text-only description + stepper pill (centered value; hover
		* reveals the up/down arrow column anchored to the pill's right edge) + a px
		* unit label after the pill. Registered by this package — the theme feature
		* owns the content font-size setting the same way it owns the appearance
		* preference. The displayed value follows the persisted setting, never the
		* click echo.
		*/
		/**
		* Render the font-size row.
		* @param props - composed slot props.
		* @returns the row element tree.
		*/
		function FontSizeRow({ t, setFontSize, useStore }) {
			const fontSize = useStore((s) => s.fontSize);
			return (0, react_jsx_runtime.jsxs)("div", {
				className: FontSizeRow_module_css_default.row,
				children: [(0, react_jsx_runtime.jsxs)("div", {
					className: FontSizeRow_module_css_default.rowText,
					children: [(0, react_jsx_runtime.jsx)("div", {
						className: FontSizeRow_module_css_default.title,
						children: t("fontSize.title")
					}), (0, react_jsx_runtime.jsx)("div", {
						className: FontSizeRow_module_css_default.desc,
						children: t("fontSize.description")
					})]
				}), (0, react_jsx_runtime.jsxs)("div", {
					className: FontSizeRow_module_css_default.control,
					children: [(0, react_jsx_runtime.jsxs)("div", {
						className: FontSizeRow_module_css_default.stepper,
						children: [(0, react_jsx_runtime.jsx)("span", {
							className: FontSizeRow_module_css_default.value,
							children: fontSize
						}), (0, react_jsx_runtime.jsxs)("span", {
							className: FontSizeRow_module_css_default.arrows,
							children: [(0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: FontSizeRow_module_css_default.arrow,
								"aria-label": t("fontSize.increase"),
								disabled: fontSize >= 17,
								onClick: () => {
									setFontSize(fontSize + 1);
								},
								children: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronUpOutline14, { size: 9 })
							}), (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: FontSizeRow_module_css_default.arrow,
								"aria-label": t("fontSize.decrease"),
								disabled: fontSize <= 12,
								onClick: () => {
									setFontSize(fontSize - 1);
								},
								children: (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronDownOutline14, { size: 9 })
							})]
						})]
					}), (0, react_jsx_runtime.jsx)("span", {
						className: FontSizeRow_module_css_default.unit,
						children: t("fontSize.unit")
					})]
				})]
			});
		}
		//#endregion
		//#region lib/types/client/settings-store.js
		/**
		* Appearance and font-size row slot stores: mirrors of the theme service
		* snapshot. The plugin's apply-world change listener is the only writer; the
		* row components read via props.useStore.
		*/
		/**
		* Declares the Appearance row state and write surface.
		* @returns the store handle.
		*/
		function createAppearanceRowStore() {
			return (0, _deepseek_ai_dsh_client_store.defineStore)({
				init: () => ({
					preference: "system",
					revision: -1
				}),
				actions: { sync: (d, preference, revision) => {
					if (revision <= d.revision) return;
					d.preference = preference;
					d.revision = revision;
				} }
			});
		}
		/**
		* Declares the font-size row state and write surface.
		* @returns the store handle.
		*/
		function createFontSizeRowStore() {
			return (0, _deepseek_ai_dsh_client_store.defineStore)({
				init: () => ({
					fontSize: 14,
					revision: -1
				}),
				actions: { sync: (d, fontSize, revision) => {
					if (revision <= d.revision) return;
					d.fontSize = fontSize;
					d.revision = revision;
				} }
			});
		}
		//#endregion
		//#region \0dsh-inline-css:/home/runner/work/deepseek-harness/deepseek-harness/packages/client/ui-theme/src/styles/base.css.mjs
		var base_css_default = ":root{--dsw-font-family:-apple-system, BlinkMacSystemFont, \"Segoe UI\", \"PingFang SC\", \"Hiragino Sans GB\", \"Microsoft YaHei\", \"Helvetica Neue\", Helvetica, Arial, sans-serif;--ds-font-family-code:\"SF Mono\", \"JetBrains Mono\", \"Fira Code\", Consolas, \"Liberation Mono\", Menlo, Courier, \"PingFang SC\", \"Microsoft YaHei\";--ds-ease-in-out:cubic-bezier(.4, 0, .2, 1);--ds-transition-duration:.2s;--ds-transition-duration-fast:.1s;--ds-transition-duration-slow:.3s}";
		//#endregion
		//#region \0dsh-inline-css:/home/runner/work/deepseek-harness/deepseek-harness/packages/client/ui-theme/src/styles/corner-shape.css.mjs
		var corner_shape_css_default = "@supports (corner-shape:superellipse(1.5)){:root{--dsw-corner-shape:superellipse(1.5)}*,:before,:after{corner-shape:var(--dsw-corner-shape)}}";
		//#endregion
		//#region \0dsh-inline-css:/home/runner/work/deepseek-harness/deepseek-harness/packages/client/ui-theme/src/styles/design-platform.css.mjs
		var design_platform_css_default = "body{--dsw-static-amber-100:#fef5e7;--dsw-static-amber-400:#f7ad31;--dsw-static-amber-500:#f59e0b;--dsw-static-amber-600:#dd8629;--dsw-static-amber-900:#27241f;--dsw-static-blue-100:#dbeafe;--dsw-static-blue-300:#93c5fd;--dsw-static-blue-400:#60a5fa;--dsw-static-blue-450:#4d93f8;--dsw-static-blue-500:#3b82f6;--dsw-static-blue-50:#eff6ff;--dsw-static-blue-50p:#eaf3ff;--dsw-static-blue-600:#2563eb;--dsw-static-blue-75:#e5f0ff;--dsw-static-blue-800:#1e40af;--dsw-static-blue-900:#0e3074;--dsw-static-blue-950:#172554;--dsw-static-deepseek-100:#e4edfd;--dsw-static-deepseek-200:#d3e2ff;--dsw-static-deepseek-300:#b7c8fe;--dsw-static-deepseek-400:#679efe;--dsw-static-deepseek-450:#5686fe;--dsw-static-deepseek-500:#4176e6;--dsw-static-deepseek-50:#edf3fe;--dsw-static-deepseek-600:#4868b2;--dsw-static-deepseek-700-delete:#2f4c8f;--dsw-static-deepseek-800:#34415b;--dsw-static-deepseek-900:#283142;--dsw-static-green-100:#e6faed;--dsw-static-green-400:#4ed17e;--dsw-static-green-500:#22c55e;--dsw-static-green-900:#233c2c;--dsw-static-neutral-00:#fff;--dsw-static-neutral-1000:#000;--dsw-static-neutral-100:#f5f5f5;--dsw-static-neutral-150:#ededed;--dsw-static-neutral-200:#e5e5e5;--dsw-static-neutral-250:#dcdcdc;--dsw-static-neutral-300:#d4d4d4;--dsw-static-neutral-400:#a2a4a6;--dsw-static-neutral-500:#7f8287;--dsw-static-neutral-50:#fafafa;--dsw-static-neutral-550:#65676b;--dsw-static-neutral-600:#545557;--dsw-static-neutral-700:#3c3c3d;--dsw-static-neutral-800:#292929;--dsw-static-neutral-850:#212123;--dsw-static-neutral-900:#0f0f0f;--dsw-static-neutral-bluish-00:#fff;--dsw-static-neutral-bluish-1000:#0f1115;--dsw-static-neutral-bluish-100:#ebeef2;--dsw-static-neutral-bluish-150:#e9ecf2;--dsw-static-neutral-bluish-200:#e1e5ee;--dsw-static-neutral-bluish-300:#cfd3d6;--dsw-static-neutral-bluish-400:#adb2b8;--dsw-static-neutral-bluish-500:#979da6;--dsw-static-neutral-bluish-50:#f9fafb;--dsw-static-neutral-bluish-600:#81858c;--dsw-static-neutral-bluish-60:#f5f6f7;--dsw-static-neutral-bluish-700:#61666b;--dsw-static-neutral-bluish-750:#43454a;--dsw-static-neutral-bluish-75:#f1f3f5;--dsw-static-neutral-bluish-800:#353638;--dsw-static-neutral-bluish-850:#2c2c2e;--dsw-static-neutral-bluish-875:#232324;--dsw-static-neutral-bluish-900:#1b1b1c;--dsw-static-neutral-bluish-950:#151517;--dsw-static-red-100:#fee2e2;--dsw-static-red-400:#f25a5a;--dsw-static-red-500:#ef4444;--dsw-static-red-50:#fef2f2;--dsw-static-red-600:#ec1313;--dsw-static-red-900:#570c0c}body[data-ds-dark-theme]{--dsw-static-amber-100:#fef5e7;--dsw-static-amber-400:#f7ad31;--dsw-static-amber-500:#f59e0b;--dsw-static-amber-600:#dd8629;--dsw-static-amber-900:#27241f;--dsw-static-blue-100:#dbeafe;--dsw-static-blue-300:#93c5fd;--dsw-static-blue-400:#60a5fa;--dsw-static-blue-450:#4d93f8;--dsw-static-blue-500:#3b82f6;--dsw-static-blue-50:#eff6ff;--dsw-static-blue-50p:#eaf3ff;--dsw-static-blue-600:#2563eb;--dsw-static-blue-75:#e5f0ff;--dsw-static-blue-800:#1e40af;--dsw-static-blue-900:#0e3074;--dsw-static-blue-950:#172554;--dsw-static-deepseek-100:#e4edfd;--dsw-static-deepseek-200:#d3e2ff;--dsw-static-deepseek-300:#b7c8fe;--dsw-static-deepseek-400:#679efe;--dsw-static-deepseek-450:#5686fe;--dsw-static-deepseek-500:#4176e6;--dsw-static-deepseek-50:#edf3fe;--dsw-static-deepseek-600:#4868b2;--dsw-static-deepseek-700-delete:#2f4c8f;--dsw-static-deepseek-800:#34415b;--dsw-static-deepseek-900:#283142;--dsw-static-green-100:#e6faed;--dsw-static-green-400:#4ed17e;--dsw-static-green-500:#22c55e;--dsw-static-green-900:#233c2c;--dsw-static-neutral-00:#fff;--dsw-static-neutral-1000:#000;--dsw-static-neutral-100:#f5f5f5;--dsw-static-neutral-150:#ededed;--dsw-static-neutral-200:#e5e5e5;--dsw-static-neutral-250:#dcdcdc;--dsw-static-neutral-300:#d4d4d4;--dsw-static-neutral-400:#a2a4a6;--dsw-static-neutral-500:#7f8287;--dsw-static-neutral-50:#fafafa;--dsw-static-neutral-550:#65676b;--dsw-static-neutral-600:#545557;--dsw-static-neutral-700:#3c3c3d;--dsw-static-neutral-800:#292929;--dsw-static-neutral-850:#212123;--dsw-static-neutral-900:#0f0f0f;--dsw-static-neutral-bluish-00:#fff;--dsw-static-neutral-bluish-1000:#0f1115;--dsw-static-neutral-bluish-100:#ebeef2;--dsw-static-neutral-bluish-150:#e9ecf2;--dsw-static-neutral-bluish-200:#e1e5ee;--dsw-static-neutral-bluish-300:#cfd3d6;--dsw-static-neutral-bluish-400:#adb2b8;--dsw-static-neutral-bluish-500:#979da6;--dsw-static-neutral-bluish-50:#f9fafb;--dsw-static-neutral-bluish-600:#81858c;--dsw-static-neutral-bluish-60:#f9fafb;--dsw-static-neutral-bluish-700:#61666b;--dsw-static-neutral-bluish-750:#43454a;--dsw-static-neutral-bluish-75:#f1f3f5;--dsw-static-neutral-bluish-800:#353638;--dsw-static-neutral-bluish-850:#2c2c2e;--dsw-static-neutral-bluish-875:#232324;--dsw-static-neutral-bluish-900:#1b1b1c;--dsw-static-neutral-bluish-950:#151517;--dsw-static-red-100:#fee2e2;--dsw-static-red-400:#f25a5a;--dsw-static-red-500:#ef4444;--dsw-static-red-50:#fef2f2;--dsw-static-red-600:#ec1313;--dsw-static-red-900:#570c0c}body{--dsw-alias-bg-base:var(--dsw-static-neutral-bluish-00);--dsw-alias-bg-layer-1:var(--dsw-static-neutral-bluish-00);--dsw-alias-bg-layer-2:var(--dsw-static-neutral-bluish-00);--dsw-alias-bg-layer-3:var(--dsw-static-neutral-bluish-00);--dsw-alias-bg-mask-1:#0000003d;--dsw-alias-bg-mask-2:#0000001f;--dsw-alias-bg-mask-3:#0000007a;--dsw-alias-bg-mask-photo:#000000e0;--dsw-alias-bg-mask-drop:#ffffffb3;--dsw-alias-bg-module-platform:var(--dsw-static-neutral-bluish-60);--dsw-alias-bg-multi-select:var(--dsw-static-neutral-bluish-60);--dsw-alias-bg-overlay:var(--dsw-static-neutral-bluish-150);--dsw-alias-bg-skeleton:#0000000a;--dsw-alias-border-inverted2:#0000;--dsw-alias-border-inverted:#0000;--dsw-alias-border-l1:#0000000a;--dsw-alias-border-l2-darkmode-thin:#0000001a;--dsw-alias-border-l2:#0000001a;--dsw-alias-border-l3:#0000001f;--dsw-alias-border-l4:#00000029;--dsw-alias-brand-primary-invert:var(--dsw-static-neutral-bluish-1000);--dsw-alias-brand-primary-new-colorprimary-new-color:#4176e6;--dsw-alias-brand-primary:var(--dsw-static-neutral-bluish-1000);--dsw-alias-brand-text:var(--dsw-static-neutral-bluish-1000);--dsw-alias-button-contrast-fill:var(--dsw-static-neutral-bluish-700);--dsw-alias-button-elevated-fill:var(--dsw-static-neutral-bluish-00);--dsw-alias-button-floating-fill:var(--dsw-static-neutral-bluish-00);--dsw-alias-button-floating-hover:var(--dsw-static-neutral-bluish-75);--dsw-alias-button-ghost-active-border:var(--dsw-static-neutral-bluish-500);--dsw-alias-button-ghost-active-fill:var(--dsw-static-neutral-bluish-100);--dsw-alias-button-ghost-active-hover:var(--dsw-static-neutral-bluish-150);--dsw-alias-button-info-fill:var(--dsw-static-deepseek-500);--dsw-alias-button-info-hover:var(--dsw-static-deepseek-400);--dsw-alias-button-primary-dimmed:var(--dsw-static-neutral-bluish-100);--dsw-alias-button-primary-fill:var(--dsw-alias-brand-primary);--dsw-alias-button-primary-hover:var(--dsw-static-neutral-bluish-750);--dsw-alias-button-tool-bar-fill-invisible:#1f1f1f5c;--dsw-alias-button-tool-bar-fill:#54555780;--dsw-alias-button-tool-bar-hover:#54555799;--dsw-alias-interactive-bg-active:#2631481a;--dsw-alias-interactive-bg-hover-accent:#26314824;--dsw-alias-interactive-bg-hover-danger:#ec13130d;--dsw-alias-interactive-bg-hover-solid:var(--dsw-static-neutral-bluish-75);--dsw-alias-interactive-bg-hover:#2631480f;--dsw-alias-label-caption:var(--dsw-static-neutral-bluish-400);--dsw-alias-label-dimmed:var(--dsw-static-neutral-bluish-200);--dsw-alias-label-primary-bluish:var(--dsw-static-blue-900);--dsw-alias-label-primary-dimmed:var(--dsw-static-neutral-bluish-950);--dsw-alias-label-primary-foreground:var(--dsw-static-neutral-bluish-00);--dsw-alias-label-primary-inverted:var(--dsw-static-neutral-bluish-00);--dsw-alias-label-primary:var(--dsw-static-neutral-bluish-1000);--dsw-alias-label-secondary:var(--dsw-static-neutral-bluish-700);--dsw-alias-label-tertiary:var(--dsw-static-neutral-bluish-600);--dsw-alias-link:var(--dsw-static-deepseek-500);--dsw-alias-markdown-citation:var(--dsw-static-neutral-bluish-100);--dsw-alias-markdown-code-block-banner:var(--dsw-static-neutral-bluish-50);--dsw-alias-markdown-code-block:var(--dsw-static-neutral-bluish-50);--dsw-alias-markdown-code-segment-selected:var(--dsw-static-neutral-bluish-00);--dsw-alias-markdown-code-segment-unselected:var(--dsw-static-neutral-bluish-75);--dsw-alias-markdown-inline-code:var(--dsw-static-neutral-50);--dsw-alias-markdown-placeholder:var(--dsw-static-neutral-bluish-60);--dsw-alias-markdown-tag:var(--dsw-static-neutral-bluish-75);--dsw-alias-scrollbar-bg-l1:var(--dsw-static-neutral-200);--dsw-alias-scrollbar-bg-l2:var(--dsw-static-neutral-200);--dsw-alias-scrollbar-hover-l1:var(--dsw-static-neutral-300);--dsw-alias-scrollbar-hover-l2:var(--dsw-static-neutral-300);--dsw-alias-state-business-primary:var(--dsw-static-deepseek-500);--dsw-alias-state-business-tertiary:var(--dsw-static-deepseek-100);--dsw-alias-state-error-primary:var(--dsw-static-red-600);--dsw-alias-state-error-secondary:var(--dsw-static-red-400);--dsw-alias-state-success-primary:var(--dsw-static-green-500);--dsw-alias-state-success-secondary:var(--dsw-static-green-400);--dsw-alias-state-success-tertiary:var(--dsw-static-green-100);--dsw-alias-state-warn-label:var(--dsw-static-amber-600);--dsw-alias-state-warn-primary:var(--dsw-static-amber-500);--dsw-alias-state-warn-secondary:var(--dsw-static-amber-400);--dsw-alias-state-warn-tertiary:var(--dsw-static-amber-100);--dsw-alias-toast-bg:var(--dsw-static-neutral-bluish-800);--dsw-alias-tooltip-bg:var(--dsw-static-neutral-bluish-850);--dsw-specific-bubble-highlight:var(--dsw-static-deepseek-200);--dsw-specific-bubble:var(--dsw-static-deepseek-50);--dsw-specific-input-major:var(--dsw-static-neutral-bluish-00);--dsw-specific-login-input:var(--dsw-static-neutral-bluish-50);--dsw-specific-menu:var(--dsw-alias-bg-layer-3);--dsw-specific-selector:var(--dsw-static-neutral-bluish-60);--dsw-specific-sidebar-fill:var(--dsw-static-neutral-bluish-50);--dsw-specific-sidebar-nav-item-active-accent:var(--dsw-static-deepseek-100);--dsw-specific-sidebar-nav-item-active:var(--dsw-static-neutral-bluish-100);--dsw-specific-sidebar-nav-item-hover:var(--dsw-static-neutral-bluish-75);--dsw-specific-tip:var(--dsw-static-neutral-bluish-60)}body[data-ds-dark-theme]{--dsw-alias-bg-base:var(--dsw-static-neutral-bluish-950);--dsw-alias-bg-layer-1:var(--dsw-static-neutral-bluish-875);--dsw-alias-bg-layer-2:var(--dsw-static-neutral-bluish-850);--dsw-alias-bg-layer-3:var(--dsw-static-neutral-bluish-800);--dsw-alias-bg-mask-1:#00000080;--dsw-alias-bg-mask-2:#0003;--dsw-alias-bg-mask-3:#0000007a;--dsw-alias-bg-mask-photo:#000000e0;--dsw-alias-bg-mask-drop:#272730b3;--dsw-alias-bg-module-platform:var(--dsw-static-neutral-bluish-800);--dsw-alias-bg-multi-select:var(--dsw-static-neutral-850);--dsw-alias-bg-overlay:var(--dsw-static-neutral-bluish-700);--dsw-alias-bg-skeleton:#ffffff14;--dsw-alias-border-inverted2:#ffffff14;--dsw-alias-border-inverted:#ffffff0f;--dsw-alias-border-l1:#ffffff0f;--dsw-alias-border-l2-darkmode-thin:#ffffff0f;--dsw-alias-border-l2:#ffffff1f;--dsw-alias-border-l3:#ffffff29;--dsw-alias-border-l4:#fff3;--dsw-alias-brand-primary-invert:var(--dsw-static-neutral-bluish-50);--dsw-alias-brand-primary-new-colorprimary-new-color:var(--dsw-static-deepseek-450);--dsw-alias-brand-primary:var(--dsw-static-neutral-bluish-50);--dsw-alias-brand-text:var(--dsw-static-neutral-bluish-50);--dsw-alias-button-contrast-fill:var(--dsw-static-neutral-bluish-50);--dsw-alias-button-elevated-fill:var(--dsw-static-neutral-bluish-750);--dsw-alias-button-floating-fill:var(--dsw-static-neutral-bluish-850);--dsw-alias-button-floating-hover:var(--dsw-static-neutral-bluish-800);--dsw-alias-button-ghost-active-border:var(--dsw-static-neutral-bluish-600);--dsw-alias-button-ghost-active-fill:var(--dsw-static-neutral-bluish-750);--dsw-alias-button-ghost-active-hover:var(--dsw-static-neutral-bluish-700);--dsw-alias-button-info-fill:var(--dsw-static-deepseek-400);--dsw-alias-button-info-hover:var(--dsw-static-deepseek-500);--dsw-alias-button-primary-dimmed:var(--dsw-static-neutral-bluish-750);--dsw-alias-button-primary-fill:var(--dsw-alias-brand-primary);--dsw-alias-button-primary-hover:var(--dsw-static-neutral-bluish-100);--dsw-alias-button-tool-bar-fill-invisible:#1f1f1f5c;--dsw-alias-button-tool-bar-fill:#54555780;--dsw-alias-button-tool-bar-hover:#54555799;--dsw-alias-interactive-bg-active:#ffffff24;--dsw-alias-interactive-bg-hover-accent:#ffffff3d;--dsw-alias-interactive-bg-hover-danger:#f25a5a26;--dsw-alias-interactive-bg-hover-solid:var(--dsw-static-neutral-bluish-800);--dsw-alias-interactive-bg-hover:#ffffff14;--dsw-alias-label-caption:var(--dsw-static-neutral-bluish-600);--dsw-alias-label-dimmed:var(--dsw-static-neutral-bluish-750);--dsw-alias-label-primary-bluish:var(--dsw-static-neutral-bluish-50);--dsw-alias-label-primary-dimmed:var(--dsw-static-neutral-bluish-100);--dsw-alias-label-primary-foreground:var(--dsw-static-neutral-bluish-1000);--dsw-alias-label-primary-inverted:var(--dsw-static-neutral-bluish-800);--dsw-alias-label-primary:var(--dsw-static-neutral-bluish-50);--dsw-alias-label-secondary:var(--dsw-static-neutral-bluish-300);--dsw-alias-label-tertiary:var(--dsw-static-neutral-bluish-400);--dsw-alias-link:var(--dsw-static-deepseek-400);--dsw-alias-markdown-citation:var(--dsw-static-neutral-bluish-800);--dsw-alias-markdown-code-block-banner:var(--dsw-static-neutral-bluish-850);--dsw-alias-markdown-code-block:var(--dsw-static-neutral-bluish-900);--dsw-alias-markdown-code-segment-selected:var(--dsw-static-neutral-bluish-800);--dsw-alias-markdown-code-segment-unselected:var(--dsw-static-neutral-bluish-900);--dsw-alias-markdown-inline-code:var(--dsw-static-neutral-800);--dsw-alias-markdown-placeholder:var(--dsw-static-neutral-bluish-850);--dsw-alias-markdown-tag:var(--dsw-static-neutral-bluish-850);--dsw-alias-scrollbar-bg-l1:var(--dsw-static-neutral-700);--dsw-alias-scrollbar-bg-l2:var(--dsw-static-neutral-600);--dsw-alias-scrollbar-hover-l1:var(--dsw-static-neutral-600);--dsw-alias-scrollbar-hover-l2:var(--dsw-static-neutral-550);--dsw-alias-state-business-primary:var(--dsw-static-deepseek-400);--dsw-alias-state-business-tertiary:var(--dsw-static-deepseek-800);--dsw-alias-state-error-primary:var(--dsw-static-red-400);--dsw-alias-state-error-secondary:var(--dsw-static-red-400);--dsw-alias-state-success-primary:var(--dsw-static-green-500);--dsw-alias-state-success-secondary:var(--dsw-static-green-400);--dsw-alias-state-success-tertiary:var(--dsw-static-green-900);--dsw-alias-state-warn-label:var(--dsw-static-amber-600);--dsw-alias-state-warn-primary:var(--dsw-static-amber-500);--dsw-alias-state-warn-secondary:var(--dsw-static-amber-400);--dsw-alias-state-warn-tertiary:var(--dsw-static-amber-900);--dsw-alias-toast-bg:var(--dsw-static-neutral-bluish-750);--dsw-alias-tooltip-bg:var(--dsw-static-neutral-bluish-750);--dsw-specific-bubble-highlight:var(--dsw-static-neutral-bluish-750);--dsw-specific-bubble:var(--dsw-static-neutral-bluish-850);--dsw-specific-input-major:var(--dsw-static-neutral-bluish-850);--dsw-specific-login-input:var(--dsw-static-neutral-bluish-900);--dsw-specific-menu:var(--dsw-alias-bg-layer-3);--dsw-specific-selector:var(--dsw-static-neutral-bluish-800);--dsw-specific-sidebar-fill:var(--dsw-static-neutral-bluish-900);--dsw-specific-sidebar-nav-item-active-accent:var(--dsw-static-neutral-bluish-800);--dsw-specific-sidebar-nav-item-active:var(--dsw-static-neutral-bluish-750);--dsw-specific-sidebar-nav-item-hover:var(--dsw-static-neutral-bluish-850);--dsw-specific-tip:var(--dsw-static-neutral-bluish-800)}";
		//#endregion
		//#region \0dsh-inline-css:/home/runner/work/deepseek-harness/deepseek-harness/packages/client/ui-theme/src/styles/scrollbar.css.mjs
		var scrollbar_css_default = "body{--dsh-scrollbar-thumb:var(--dsw-alias-scrollbar-bg-l1);--dsh-scrollbar-thumb-hover:var(--dsw-alias-scrollbar-hover-l1);--dsh-scrollbar-width:8px}@supports not selector(::-webkit-scrollbar){body,body *{scrollbar-width:thin;scrollbar-color:var(--dsh-scrollbar-thumb) transparent}}::-webkit-scrollbar{width:8px;height:8px}::-webkit-scrollbar-track{background:0 0}::-webkit-scrollbar-thumb{background:var(--dsh-scrollbar-thumb);border-radius:4px}::-webkit-scrollbar-thumb:hover{background:var(--dsh-scrollbar-thumb-hover)}::-webkit-scrollbar-corner{background:0 0}";
		//#endregion
		//#region \0dsh-inline-css:/home/runner/work/deepseek-harness/deepseek-harness/packages/client/ui-theme/src/styles/gradient-shadow-text.css.mjs
		var gradient_shadow_text_css_default = "body{--dsw-linear-gradient-think:linear-gradient(180deg, #fff 20.19%, #fff0 100%);--dsw-linear-think-select:linear-gradient(180deg, #f5f6f7 20.19%, #f5f6f700 100%);--dsw-shadow-lv1:0 2px 4px 0 #0000000d;--dsw-shadow-lv1-blur:0 4px 12px 0 #00000005;--dsw-shadow-lv2:0 4px 12px 0 #00000005, 0 2px 8px 0 #0000000a;--dsw-shadow-lv3:0 0 1px 0 #0003, 0 0 4px 0 #00000005, 0 12px 32px 0 #00000014;--dsw-elevation-stroke-color:var(--dsw-alias-border-l4);--dsw-mask-blur:blur(2px)}body,body *{--dsw-elevation-stroke:0 0 0 .5px var(--dsw-elevation-stroke-color);--dsw-elevation-panel:var(--dsw-elevation-stroke), 0 3px 8px 0 #00000008, 0 0 16px 0 #00000005;--dsw-elevation-prominent:var(--dsw-elevation-stroke), 0 3px 8px 0 #0000000a, 0 0 20px 0 #0000000d;--dsw-elevation-soft:var(--dsw-elevation-stroke), 0 4px 16px 0 #00000008, 0 0 24px 0 #00000008}body[data-ds-dark-theme]{--dsw-linear-gradient-think:linear-gradient(180deg, #151517 20.19%, #15151700 100%);--dsw-linear-think-select:linear-gradient(180deg, #232325 20.19%, #23232500 100%)}body{--dsh-content-font-delta:calc(var(--dsh-content-font-size,14px) - 14px);--dsh-content-font-size-secondary:min(calc(var(--dsh-content-font-size,14px) - 1px), max(13px, calc(var(--dsh-content-font-size,14px) - 2px)));--dsh-content-font-delta-secondary:calc(var(--dsh-content-font-size-secondary) - 13px);--dsw-font-markdown-h1:700 calc(21px + var(--dsh-content-font-delta)) / calc(30px + var(--dsh-content-font-delta)) var(--dsw-font-family);--dsw-font-markdown-h1-font-family:var(--dsw-font-family);--dsw-font-markdown-h1-font-weight:700;--dsw-font-markdown-h1-line-height:calc(30px + var(--dsh-content-font-delta));--dsw-font-markdown-h1-font-size:calc(21px + var(--dsh-content-font-delta));--dsw-font-markdown-h1-font-style:normal;--dsw-font-markdown-h2:700 calc(19px + var(--dsh-content-font-delta)) / calc(28px + var(--dsh-content-font-delta)) var(--dsw-font-family);--dsw-font-markdown-h2-font-family:var(--dsw-font-family);--dsw-font-markdown-h2-font-weight:700;--dsw-font-markdown-h2-line-height:calc(28px + var(--dsh-content-font-delta));--dsw-font-markdown-h2-font-size:calc(19px + var(--dsh-content-font-delta));--dsw-font-markdown-h2-font-style:normal;--dsw-font-markdown-h3:700 calc(18px + var(--dsh-content-font-delta)) / calc(26px + var(--dsh-content-font-delta)) var(--dsw-font-family);--dsw-font-markdown-h3-font-family:var(--dsw-font-family);--dsw-font-markdown-h3-font-weight:700;--dsw-font-markdown-h3-line-height:calc(26px + var(--dsh-content-font-delta));--dsw-font-markdown-h3-font-size:calc(18px + var(--dsh-content-font-delta));--dsw-font-markdown-h3-font-style:normal;--dsw-font-markdown-h4:600 var(--dsh-content-font-size,14px) / calc(24px + var(--dsh-content-font-delta)) var(--dsw-font-family);--dsw-font-markdown-h4-font-family:var(--dsw-font-family);--dsw-font-markdown-h4-font-weight:600;--dsw-font-markdown-h4-line-height:calc(24px + var(--dsh-content-font-delta));--dsw-font-markdown-h4-font-size:var(--dsh-content-font-size,14px);--dsw-font-markdown-h4-font-style:normal;--dsw-font-markdown-base:var(--dsh-content-font-size,14px) / calc(24px + var(--dsh-content-font-delta)) var(--dsw-font-family);--dsw-font-markdown-base-font-family:var(--dsw-font-family);--dsw-font-markdown-base-font-weight:400;--dsw-font-markdown-base-line-height:calc(24px + var(--dsh-content-font-delta));--dsw-font-markdown-base-font-size:var(--dsh-content-font-size,14px);--dsw-font-markdown-base-font-style:normal;--dsw-font-markdown-base-strong:600 var(--dsh-content-font-size,14px) / calc(24px + var(--dsh-content-font-delta)) var(--dsw-font-family);--dsw-font-markdown-base-strong-font-family:var(--dsw-font-family);--dsw-font-markdown-base-strong-font-weight:600;--dsw-font-markdown-base-strong-line-height:calc(24px + var(--dsh-content-font-delta));--dsw-font-markdown-base-strong-font-size:var(--dsh-content-font-size,14px);--dsw-font-markdown-base-strong-font-style:normal;--dsw-font-markdown-base-italic:italic var(--dsh-content-font-size,14px) / calc(24px + var(--dsh-content-font-delta)) var(--dsw-font-family);--dsw-font-markdown-base-italic-font-family:var(--dsw-font-family);--dsw-font-markdown-base-italic-font-weight:400;--dsw-font-markdown-base-italic-line-height:calc(24px + var(--dsh-content-font-delta));--dsw-font-markdown-base-italic-font-size:var(--dsh-content-font-size,14px);--dsw-font-markdown-base-italic-font-style:italic;--dsw-font-markdown-base-strong-italic:italic 600 var(--dsh-content-font-size,14px) / calc(24px + var(--dsh-content-font-delta)) var(--dsw-font-family);--dsw-font-markdown-base-strong-italic-font-family:var(--dsw-font-family);--dsw-font-markdown-base-strong-italic-font-weight:600;--dsw-font-markdown-base-strong-italic-line-height:calc(24px + var(--dsh-content-font-delta));--dsw-font-markdown-base-strong-italic-font-size:var(--dsh-content-font-size,14px);--dsw-font-markdown-base-strong-italic-font-style:italic;--dsw-font-markdown-table:var(--dsh-content-font-size-secondary,13px)/calc(22px + var(--dsh-content-font-delta-secondary,0px)) var(--dsw-font-family);--dsw-font-markdown-table-font-family:var(--dsw-font-family);--dsw-font-markdown-table-font-weight:400;--dsw-font-markdown-table-line-height:calc(22px + var(--dsh-content-font-delta-secondary,0px));--dsw-font-markdown-table-font-size:var(--dsh-content-font-size-secondary,13px);--dsw-font-markdown-table-font-style:normal;--dsw-font-markdown-table-head:500 var(--dsh-content-font-size-secondary,13px)/calc(22px + var(--dsh-content-font-delta-secondary,0px)) var(--dsw-font-family);--dsw-font-markdown-table-head-font-family:var(--dsw-font-family);--dsw-font-markdown-table-head-font-weight:500;--dsw-font-markdown-table-head-line-height:calc(22px + var(--dsh-content-font-delta-secondary,0px));--dsw-font-markdown-table-head-font-size:var(--dsh-content-font-size-secondary,13px);--dsw-font-markdown-table-head-font-style:normal;--dsw-font-markdown-small:12px/20px var(--dsw-font-family);--dsw-font-markdown-small-font-family:var(--dsw-font-family);--dsw-font-markdown-small-font-weight:400;--dsw-font-markdown-small-line-height:20px;--dsw-font-markdown-small-font-size:12px;--dsw-font-markdown-small-font-style:normal;--dsw-font-markdown-small-strong:600 12px/20px var(--dsw-font-family);--dsw-font-markdown-small-strong-font-family:var(--dsw-font-family);--dsw-font-markdown-small-strong-font-weight:600;--dsw-font-markdown-small-strong-line-height:20px;--dsw-font-markdown-small-strong-font-size:12px;--dsw-font-markdown-small-strong-font-style:normal;--dsw-font-markdown-small-italic:italic 12px/20px var(--dsw-font-family);--dsw-font-markdown-small-italic-font-family:var(--dsw-font-family);--dsw-font-markdown-small-italic-font-weight:400;--dsw-font-markdown-small-italic-line-height:20px;--dsw-font-markdown-small-italic-font-size:12px;--dsw-font-markdown-small-italic-font-style:italic;--dsw-font-markdown-small-strong-italic:italic 600 12px/20px var(--dsw-font-family);--dsw-font-markdown-small-strong-italic-font-family:var(--dsw-font-family);--dsw-font-markdown-small-strong-italic-font-weight:600;--dsw-font-markdown-small-strong-italic-line-height:20px;--dsw-font-markdown-small-strong-italic-font-size:12px;--dsw-font-markdown-small-strong-italic-font-style:italic;--dsw-font-markdown-code:12px/19px var(--ds-font-family-code);--dsw-font-markdown-code-font-family:var(--ds-font-family-code);--dsw-font-markdown-code-font-weight:400;--dsw-font-markdown-code-line-height:19px;--dsw-font-markdown-code-font-size:12px;--dsw-font-markdown-code-font-style:normal;--dsw-font-markdown-code-block:11px/19px var(--ds-font-family-code);--dsw-font-markdown-code-block-font-family:var(--ds-font-family-code);--dsw-font-markdown-code-block-font-weight:400;--dsw-font-markdown-code-block-line-height:19px;--dsw-font-markdown-code-block-font-size:11px;--dsw-font-markdown-code-block-font-style:normal;--dsw-font-markdown-code-block-small:11px/16px var(--ds-font-family-code);--dsw-font-markdown-code-block-small-font-family:var(--ds-font-family-code);--dsw-font-markdown-code-block-small-font-weight:400;--dsw-font-markdown-code-block-small-line-height:16px;--dsw-font-markdown-code-block-small-font-size:11px;--dsw-font-markdown-code-block-small-font-style:normal;--dsw-font-xl-24:600 24px/32px var(--dsw-font-family);--dsw-font-xl-24-font-family:var(--dsw-font-family);--dsw-font-xl-24-font-weight:600;--dsw-font-xl-24-line-height:32px;--dsw-font-xl-24-font-size:24px;--dsw-font-xl-24-font-style:normal;--dsw-font-l-20:500 20px/28px var(--dsw-font-family);--dsw-font-l-20-font-family:var(--dsw-font-family);--dsw-font-l-20-font-weight:500;--dsw-font-l-20-line-height:28px;--dsw-font-l-20-font-size:20px;--dsw-font-l-20-font-style:normal;--dsw-font-m-18:500 16px/28px var(--dsw-font-family);--dsw-font-m-18-font-family:var(--dsw-font-family);--dsw-font-m-18-font-weight:500;--dsw-font-m-18-line-height:28px;--dsw-font-m-18-font-size:16px;--dsw-font-m-18-font-style:normal;--dsw-font-base-16:16px/24px var(--dsw-font-family);--dsw-font-base-16-font-family:var(--dsw-font-family);--dsw-font-base-16-font-weight:400;--dsw-font-base-16-line-height:24px;--dsw-font-base-16-font-size:16px;--dsw-font-base-16-font-style:normal;--dsw-font-base-strong-16:500 16px/24px var(--dsw-font-family);--dsw-font-base-strong-16-font-family:var(--dsw-font-family);--dsw-font-base-strong-16-font-weight:500;--dsw-font-base-strong-16-line-height:24px;--dsw-font-base-strong-16-font-size:16px;--dsw-font-base-strong-16-font-style:normal;--dsw-font-s-14:14px/22px var(--dsw-font-family);--dsw-font-s-14-font-family:var(--dsw-font-family);--dsw-font-s-14-font-weight:400;--dsw-font-s-14-line-height:22px;--dsw-font-s-14-font-size:14px;--dsw-font-s-14-font-style:normal;--dsw-font-s-strong-14:500 14px/22px var(--dsw-font-family);--dsw-font-s-strong-14-font-family:var(--dsw-font-family);--dsw-font-s-strong-14-font-weight:500;--dsw-font-s-strong-14-line-height:22px;--dsw-font-s-strong-14-font-size:14px;--dsw-font-s-strong-14-font-style:normal;--dsw-font-xs-13:13px/20px var(--dsw-font-family);--dsw-font-xs-13-font-family:var(--dsw-font-family);--dsw-font-xs-13-font-weight:400;--dsw-font-xs-13-line-height:20px;--dsw-font-xs-13-font-size:13px;--dsw-font-xs-13-font-style:normal;--dsw-font-xs-strong-13:500 13px/20px var(--dsw-font-family);--dsw-font-xs-strong-13-font-family:var(--dsw-font-family);--dsw-font-xs-strong-13-font-weight:500;--dsw-font-xs-strong-13-line-height:20px;--dsw-font-xs-strong-13-font-size:13px;--dsw-font-xs-strong-13-font-style:normal;--dsw-font-xxs-12:12px/18px var(--dsw-font-family);--dsw-font-xxs-12-font-family:var(--dsw-font-family);--dsw-font-xxs-12-font-weight:400;--dsw-font-xxs-12-line-height:18px;--dsw-font-xxs-12-font-size:12px;--dsw-font-xxs-12-font-style:normal;--dsw-font-xxs-strong-12:500 12px/18px var(--dsw-font-family);--dsw-font-xxs-strong-12-font-family:var(--dsw-font-family);--dsw-font-xxs-strong-12-font-weight:500;--dsw-font-xxs-strong-12-line-height:18px;--dsw-font-xxs-strong-12-font-size:12px;--dsw-font-xxs-strong-12-font-style:normal;--dsw-font-xxxs-11:11px/14px var(--dsw-font-family);--dsw-font-xxxs-11-font-family:var(--dsw-font-family);--dsw-font-xxxs-11-font-weight:400;--dsw-font-xxxs-11-line-height:14px;--dsw-font-xxxs-11-font-size:11px;--dsw-font-xxxs-11-font-style:normal;--dsw-font-xxxs-strong-11:500 11px/14px var(--dsw-font-family);--dsw-font-xxxs-strong-11-font-family:var(--dsw-font-family);--dsw-font-xxxs-strong-11-font-weight:500;--dsw-font-xxxs-strong-11-line-height:14px;--dsw-font-xxxs-strong-11-font-size:11px;--dsw-font-xxxs-strong-11-font-style:normal}";
		//#endregion
		//#region \0dsh-inline-css:/home/runner/work/deepseek-harness/deepseek-harness/packages/client/ui-theme/src/styles/shiki.css.mjs
		var shiki_css_default = ":root{--shiki-foreground:var(--dsw-alias-label-primary);--shiki-background:var(--dsw-alias-markdown-code-block);--shiki-token-constant:#1c7ed6;--shiki-token-string:#2f9e44;--shiki-token-comment:#868e96;--shiki-token-keyword:#d6336c;--shiki-token-parameter:#e8590c;--shiki-token-function:#6741d9;--shiki-token-string-expression:#2b8a3e;--shiki-token-punctuation:#495057;--shiki-token-link:#1971c2}body[data-ds-dark-theme]{--shiki-token-constant:#4dabf7;--shiki-token-string:#69db7c;--shiki-token-comment:#adb5bd;--shiki-token-keyword:#faa2c1;--shiki-token-parameter:#ffa94d;--shiki-token-function:#b197fc;--shiki-token-string-expression:#8ce99a;--shiki-token-punctuation:#ced4da;--shiki-token-link:#74c0fc}";
		//#endregion
		//#region lib/types/client/styles.js
		const PLUGIN_ID = "@deepseek-ai/dsh-client-ui-theme";
		const STYLES = [
			["base.css", base_css_default],
			["corner-shape.css", corner_shape_css_default],
			["design-platform.css", design_platform_css_default],
			["scrollbar.css", scrollbar_css_default],
			["gradient-shadow-text.css", gradient_shadow_text_css_default],
			["shiki.css", shiki_css_default]
		];
		/**
		* Mount the global theme sheets for exactly the owning plugin lifetime.
		* @param ctx - Owning plugin context.
		*/
		function installThemeStyles(ctx) {
			if (typeof document === "undefined") return;
			for (const [name, css] of STYLES) ctx.effect(() => {
				const tag = document.createElement("style");
				tag.dataset.plugin = PLUGIN_ID;
				tag.dataset.pluginCss = `${PLUGIN_ID}/${name}`;
				tag.textContent = css;
				document.head.appendChild(tag);
				return () => {
					tag.remove();
				};
			}, `ui-theme: ${name} stylesheet`);
		}
		//#endregion
		//#region lib/types/client/locales.js
		/** `settings.theme` namespace dictionaries (the Appearance and font-size rows' copy). */
		/** Simplified Chinese dictionary (the key-set source of truth). */
		const zh = {
			"appearance.title": "外观",
			"appearance.light": "浅色",
			"appearance.dark": "深色",
			"appearance.system": "跟随系统",
			"fontSize.title": "字号大小",
			"fontSize.description": "仅影响会话内容的字号",
			"fontSize.unit": "px",
			"fontSize.increase": "增大字号",
			"fontSize.decrease": "减小字号"
		};
		/** English dictionary, checked complete against the zh key set. */
		const en = {
			"appearance.title": "Appearance",
			"appearance.light": "Light",
			"appearance.dark": "Dark",
			"appearance.system": "System",
			"fontSize.title": "Font size",
			"fontSize.description": "Only affects conversation content",
			"fontSize.unit": "px",
			"fontSize.increase": "Increase font size",
			"fontSize.decrease": "Decrease font size"
		};
		//#endregion
		//#region lib/types/client/index.js
		/** Namespace owning this feature's settings-row copy. */
		const SETTINGS_NS = "settings.theme";
		const BUILTIN_THEMES = Object.freeze([Object.freeze({
			id: "light",
			colorScheme: "light",
			tokens: Object.freeze({})
		}), Object.freeze({
			id: "dark",
			colorScheme: "dark",
			tokens: Object.freeze({})
		})]);
		const BUILTIN_INSPECT_TOKENS = Object.freeze([
			{
				name: "--dsw-alias-bg-base",
				description: "Application base background.",
				valueType: "CSS color",
				requiresLightAndDark: true,
				cssVariable: "--dsw-alias-bg-base"
			},
			{
				name: "--dsw-alias-bg-layer-1",
				description: "Primary raised surface background.",
				valueType: "CSS color",
				requiresLightAndDark: true,
				cssVariable: "--dsw-alias-bg-layer-1"
			},
			{
				name: "--dsw-alias-bg-layer-2",
				description: "Secondary nested surface background.",
				valueType: "CSS color",
				requiresLightAndDark: true,
				cssVariable: "--dsw-alias-bg-layer-2"
			},
			{
				name: "--dsw-alias-bg-overlay",
				description: "Overlay and popover background.",
				valueType: "CSS color",
				requiresLightAndDark: true,
				cssVariable: "--dsw-alias-bg-overlay"
			},
			{
				name: "--dsw-alias-border-l1",
				description: "Primary subtle border.",
				valueType: "CSS color",
				requiresLightAndDark: true,
				cssVariable: "--dsw-alias-border-l1"
			},
			{
				name: "--dsw-alias-border-l2",
				description: "Secondary stronger border.",
				valueType: "CSS color",
				requiresLightAndDark: true,
				cssVariable: "--dsw-alias-border-l2"
			},
			{
				name: "--dsw-alias-brand-primary",
				description: "Primary brand accent.",
				valueType: "CSS color",
				requiresLightAndDark: true,
				cssVariable: "--dsw-alias-brand-primary"
			},
			{
				name: "--dsw-alias-label-primary",
				description: "Primary text color.",
				valueType: "CSS color",
				requiresLightAndDark: true,
				cssVariable: "--dsw-alias-label-primary"
			},
			{
				name: "--dsw-alias-label-secondary",
				description: "Secondary text color.",
				valueType: "CSS color",
				requiresLightAndDark: true,
				cssVariable: "--dsw-alias-label-secondary"
			},
			{
				name: "--dsw-alias-state-error-primary",
				description: "Primary error state color.",
				valueType: "CSS color",
				requiresLightAndDark: true,
				cssVariable: "--dsw-alias-state-error-primary"
			},
			{
				name: "--dsw-alias-state-success-primary",
				description: "Primary success state color.",
				valueType: "CSS color",
				requiresLightAndDark: true,
				cssVariable: "--dsw-alias-state-success-primary"
			},
			{
				name: "--dsw-alias-state-warn-primary",
				description: "Primary warning state color.",
				valueType: "CSS color",
				requiresLightAndDark: true,
				cssVariable: "--dsw-alias-state-warn-primary"
			},
			{
				name: "--dsw-specific-sidebar-fill",
				description: "Sidebar column and title-row background.",
				valueType: "CSS color",
				requiresLightAndDark: true,
				cssVariable: "--dsw-specific-sidebar-fill"
			}
		]);
		/**
		* Theme registry and preference owner. `light`/`dark` are built in (the base
		* stylesheets carry both palettes); third-party themes register alias-layer
		* overrides. Reads go through {@link getTheme}; preference writes only
		* through {@link setTheme}; continuous sync only through the `theme/change`
		* event. {@link overrideTokens} stacks partial token layers over the active
		* theme without touching the registry.
		* The service holds the `prefers-color-scheme` media query (environment
		* sensing, not presentation) and re-emits when the OS scheme flips while the
		* preference is `system`.
		*/
		var ThemeRuntime = class {
			ctx;
			host;
			themes = [...BUILTIN_THEMES];
			preference;
			fontSize = bootstrapFontSize();
			revision = 0;
			snapshot;
			media;
			/** Override layers by source; seq (monotonic) is the stacking order. */
			overrides = /* @__PURE__ */ new Map();
			overrideSeq = 0;
			/**
			* @param ctx - owning context (change events are emitted on it; the
			* media-query and scope listeners are released through ctx.effect on dispose).
			* @param host - durable preference scope owned by the same plugin.
			*/
			constructor(ctx, host) {
				this.ctx = ctx;
				this.host = host;
				this.preference = DEFAULT_PREFERENCE;
				this.media = typeof matchMedia === "undefined" ? void 0 : matchMedia("(prefers-color-scheme: dark)");
				this.snapshot = this.buildSnapshot();
				if (this.media !== void 0) {
					const media = this.media;
					const onChange = () => {
						if (this.preference !== "system") return;
						this.publish();
					};
					ctx.effect(() => {
						media.addEventListener("change", onChange);
						return () => {
							media.removeEventListener("change", onChange);
						};
					}, "ui-theme: prefers-color-scheme listener");
				}
				ctx.effect(() => host.subscribe(() => {
					this.adopt();
				}), "ui-theme: settings scope adoption");
				this.adopt();
			}
			/**
			* Read the current immutable theme snapshot.
			* @returns the current snapshot (stable reference until the next change).
			*/
			getTheme() {
				return this.snapshot;
			}
			/**
			* Export the current token directory without reading DOM or computed styles.
			* @returns stable JSON-safe token descriptions, including registered and override-only names.
			*/
			exportInspectTokens() {
				const tokens = new Map(BUILTIN_INSPECT_TOKENS.map((token) => [token.name, token]));
				for (const theme of this.themes) for (const name of Object.keys(theme.tokens)) if (!tokens.has(name)) tokens.set(name, dynamicToken(name));
				for (const layer of this.overrides.values()) for (const name of Object.keys(layer.tokens)) if (!tokens.has(name)) tokens.set(name, dynamicToken(name));
				return [...tokens.values()].map((token) => ({ ...token })).sort((left, right) => left.name.localeCompare(right.name));
			}
			/**
			* Switch the theme preference — the only user preference write entry.
			* Built-in preferences are written through the settings scope and every
			* accepted value emits `theme/change`.
			* @param id - a registered theme id or `system`; unknown ids throw.
			*/
			setTheme(id) {
				if (id !== "system" && !this.themes.some((t) => t.id === id)) throw new Error(`theme "${id}" is not registered`);
				if (this.preference === id) return;
				this.preference = id;
				if (isThemePreference(id)) this.host.set(THEME_PREFERENCE_FIELD, id);
				this.publish();
			}
			/**
			* Change the conversation content font size — the only font-size write
			* entry. Accepted values are written through the settings scope and emit
			* `theme/change`.
			* @param px - integer px within FONT_SIZE_MIN..FONT_SIZE_MAX; out-of-range or fractional values throw.
			*/
			setFontSize(px) {
				if (!Number.isInteger(px) || px < 12 || px > 17) throw new Error(`font size ${px} is outside 12..17`);
				if (this.fontSize === px) return;
				this.fontSize = px;
				this.host.set(FONT_SIZE_FIELD, px);
				this.publish();
			}
			/** Adopt the scope's accepted durable preference without writing it back. */
			adopt() {
				const section = this.host.getSnapshot().value;
				if (section === void 0) return;
				if (this.preference === section.preference && this.fontSize === section.fontSize) return;
				this.preference = section.preference;
				this.fontSize = section.fontSize;
				this.publish();
			}
			/**
			* Register a theme. Duplicate id throws (single occupant per id; the
			* built-in pair counts; `system` is a preference, not a registrable id).
			* @param definition - theme id, colorScheme, and alias-token overrides.
			* @returns disposer. Disposing the theme backing the active preference
			* resets the preference to the default so the UI never keeps tokens of an
			* unregistered theme.
			*/
			register(definition) {
				if (definition.id === "system") throw new Error("\"system\" is a preference, not a registrable theme id");
				if (this.themes.some((t) => t.id === definition.id)) throw new Error(`theme "${definition.id}" is already registered`);
				this.themes = [...this.themes, definition];
				this.publish();
				return () => {
					if (!this.themes.some((t) => t.id === definition.id)) return;
					this.themes = this.themes.filter((t) => t.id !== definition.id);
					if (this.preference === definition.id) this.preference = DEFAULT_PREFERENCE;
					this.publish();
				};
			}
			/**
			* Stack a token override layer on top of the active theme — the token-level
			* analogue of slot shading: the base theme stays untouched, layers compose
			* in seq order with later layers winning per-token, and removing a layer
			* restores whatever it covered. Calling again with the same source replaces
			* that source's whole layer and restacks it on top (effect re-registration
			* semantics). Emits `theme/change` with the recomposed snapshot.
			* @param source - layer identity; one layer per source (dynamic packages
			* pass their package id — the façade pins it, so it also names the layer's
			* origin for inspection).
			* @param tokens - token-name → `{ light, dark }` value pairs. Validated at
			* runtime (model-authored callers reach this boundary with untyped JS);
			* a bare string value throws a teaching error.
			* @returns disposer removing exactly the layer this call created; a no-op
			* once the source has re-overridden (the newer layer is not torn down).
			*/
			overrideTokens(source, tokens) {
				const layer = {
					seq: this.overrideSeq++,
					tokens: validateOverrides(source, tokens)
				};
				this.overrides.set(source, layer);
				this.publish();
				return () => {
					if (this.overrides.get(source) !== layer) return;
					this.overrides.delete(source);
					this.publish();
				};
			}
			buildSnapshot() {
				const resolvedId = this.preference === "system" ? this.media?.matches === true ? "dark" : "light" : this.preference;
				const active = this.themes.find((t) => t.id === resolvedId);
				/* v8 ignore next 2 -- needs a registry without light/dark, which register()/dispose() cannot produce */
				if (active === void 0) throw new Error(`theme registry lost "${resolvedId}"`);
				return Object.freeze({
					preference: this.preference,
					fontSize: this.fontSize,
					active: this.composeActive(active),
					themes: Object.freeze([...this.themes]),
					revision: this.revision
				});
			}
			/**
			* Fold the override layers into the active definition: seq order, later
			* layers win per-token, each value picked for the active color scheme (the
			* presenter consumes the composed snapshot and needs no override awareness).
			* Without layers the registered definition passes through by identity.
			*/
			composeActive(active) {
				if (this.overrides.size === 0) return active;
				const tokens = { ...active.tokens };
				for (const layer of [...this.overrides.values()].sort((a, b) => a.seq - b.seq)) for (const [name, modes] of Object.entries(layer.tokens)) tokens[name] = modes[active.colorScheme];
				return Object.freeze({
					...active,
					tokens: Object.freeze(tokens)
				});
			}
			publish() {
				this.revision += 1;
				this.snapshot = this.buildSnapshot();
				this.ctx.emit("theme/change", this.snapshot);
			}
		};
		/**
		* Read the font size the Host boot script wrote on `body` before any plugin
		* ran, so the initial snapshot matches first paint and ui-layout's presenter
		* does not flash the schema default while the settings read is in flight.
		* Non-browser runs and mounts without the boot script fall back to the
		* schema default; the durable settings adoption still lands afterwards.
		*/
		function bootstrapFontSize() {
			/* v8 ignore next -- needs a documentless run (node e2e booting the client tree), not constructible under jsdom */
			if (typeof document === "undefined") return 14;
			const raw = document.body.style.getPropertyValue("--dsh-content-font-size");
			const parsed = Number.parseInt(raw, 10);
			return Number.isInteger(parsed) && parsed >= 12 && parsed <= 17 ? parsed : 14;
		}
		/**
		* Runtime shape check for one override layer (model-authored callers pass
		* untyped JS through the dynamic-package façade, so the static type cannot
		* enforce the pair shape there). Returns a defensive per-token copy so later
		* caller mutation cannot reach the stored layer.
		*/ function validateOverrides(source, tokens) {
			const validated = {};
			for (const [name, value] of Object.entries(tokens)) {
				if (typeof value === "string") throw new TypeError(`theme override "${name}" from "${source}" is a bare string — pass { light: ${JSON.stringify(value)}, dark: ${JSON.stringify(value)} } (repeat the value when it is the same in both palettes); a single value goes illegible when the user switches color scheme`);
				if (typeof value !== "object" || value === null || typeof value.light !== "string" || typeof value.dark !== "string") throw new TypeError(`theme override "${name}" from "${source}" must map to a { light, dark } pair of strings — one value per color scheme`);
				const modes = value;
				validated[name] = {
					light: modes.light,
					dark: modes.dark
				};
			}
			return validated;
		}
		function dynamicToken(name) {
			return {
				name,
				description: "Theme token registered by the current Client composition.",
				valueType: "CSS value",
				requiresLightAndDark: true,
				...name.startsWith("--") ? { cssVariable: name } : {}
			};
		}
		/**
		* Required services: settings transport plus slots/locale for the Appearance
		* row. `remote` carries the forwarded settings invalidation that
		* `ctx.settingsScope.bind(spec)` subscribes to on this context.
		*/
		const inject = [
			"slots",
			"locale",
			"remote",
			"settingsScope"
		];
		/**
		* Client plugin body: provide the theme service and register the
		* feature-owned Appearance preference row into the General section's item
		* slot (a feature owns its settings surface).
		* @param ctx - client cordis context.
		*/
		function apply(ctx) {
			installThemeStyles(ctx);
			const theme = new ThemeRuntime(ctx, ctx.settingsScope.bind({ namespace: THEME_SETTINGS_NAMESPACE }));
			ctx.provide("theme", theme);
			ctx.effect(() => ctx.locale.register(SETTINGS_NS, {
				zh,
				en
			}), "ui-theme: settings row dictionaries");
			const store = createAppearanceRowStore();
			let bound;
			const fontSizeStore = createFontSizeRowStore();
			let fontSizeBound;
			const sync = (snapshot) => {
				bound?.sync(snapshot.preference, snapshot.revision);
				fontSizeBound?.sync(snapshot.fontSize, snapshot.revision);
			};
			ctx.on("theme/change", sync);
			const injected = (actions) => {
				bound = actions;
				sync(theme.getTheme());
				return { setTheme: (id) => {
					theme.setTheme(id);
				} };
			};
			ctx.slots.inject("settings.general.item", () => ctx.slots.register({
				name: "settings.general.item",
				id: "appearance",
				order: 10,
				store,
				locale: SETTINGS_NS,
				inject: injected
			}, AppearanceRow));
			const fontSizeInjected = (actions) => {
				fontSizeBound = actions;
				sync(theme.getTheme());
				return { setFontSize: (px) => {
					theme.setFontSize(px);
				} };
			};
			ctx.slots.inject("settings.general.item", () => ctx.slots.register({
				name: "settings.general.item",
				id: "font-size",
				order: 11,
				store: fontSizeStore,
				locale: SETTINGS_NS,
				inject: fontSizeInjected
			}, FontSizeRow));
		}
		//#endregion
		exports.SETTINGS_NS = SETTINGS_NS;
		exports.ThemeRuntime = ThemeRuntime;
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map