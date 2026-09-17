window.__ModuleLoader__.load({
	id: "@deepseek-ai/dsh-client-ui-brand-official",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react_jsx_runtime = require("react/jsx-runtime");
		let _deepseek_ai_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");
		//#region lib/types/client/Brand.js
		/**
		* Render the official mark with the presentation requested by its host surface.
		* @param props - Host-supplied mark presentation.
		* @returns the official whale mark.
		*/
		function OfficialBrandMark({ size }) {
			return (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.FishLogo, { size });
		}
		/**
		* Render the official name artwork without its independently slotted mark.
		* @returns the official name wordmark.
		*/
		function OfficialBrandName() {
			return (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.BrandWordmark, { includeMark: false });
		}
		//#endregion
		//#region lib/types/client/index.js
		/** Required service: the UI slot registry. */
		const inject = ["slots"];
		/**
		* Fill the sidebar brand slots as one declaration-aware registration set. The
		* conversation hero stays on its declaring package's animated fish fallback,
		* so the official build registers nothing there.
		* @param ctx - Client root context.
		*/
		function apply(ctx) {
			ctx.slots.inject("sidebar.brand.mark", () => ctx.slots.inject("sidebar.brand.name", function* () {
				yield ctx.slots.register({ name: "sidebar.brand.mark" }, OfficialBrandMark);
				yield ctx.slots.register({ name: "sidebar.brand.name" }, OfficialBrandName);
			}));
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map