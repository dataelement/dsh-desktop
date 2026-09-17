import z from "@deepseek-ai/schemastery";
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
/** Smallest accepted content font size (px). */
const FONT_SIZE_MIN = 12;
/** Largest accepted content font size (px). */
const FONT_SIZE_MAX = 17;
/** Content font size when the user-settings document has no override (px). */
const DEFAULT_FONT_SIZE = 14;
/** Durable theme schema; also the wire envelope the browser scope validates against. */
const ThemeSettingsSchema = z.object({
	[THEME_PREFERENCE_FIELD]: z.union([...THEME_PREFERENCES]).default(DEFAULT_PREFERENCE),
	[FONT_SIZE_FIELD]: z.number().step(1).min(12).max(17).default(14)
});
//#endregion
//#region lib/types/boot-theme.js
/**
* Theme bootstrap row for the browser's pre-plugin interval. Each index
* render embeds the current durable built-in preference and content font size;
* the browser resolves only `system`, then writes the same DOM fields
* ui-layout's ThemePresenter owns after the client plugin tree activates.
*/
/** Build the inline script body for one schema-validated durable theme section. */
function bootThemeScript(preference, fontSize) {
	return `(() => {
  const preference = ${JSON.stringify(preference)}
  const systemDark = preference === 'system'
    && typeof matchMedia !== 'undefined'
    && matchMedia('(prefers-color-scheme: dark)').matches
  const dark = preference === 'dark' || systemDark
  document.documentElement.style.colorScheme = dark ? 'dark' : 'light'
  document.body.toggleAttribute('data-ds-dark-theme', dark)
  document.body.style.setProperty('--dsh-content-font-size', ${JSON.stringify(`${fontSize}px`)})
})()`;
}
/**
* The theme bootstrap as an injection row: an inline script immediately after
* the opening body tag, before the shell mount and module script.
* @param preference - Current Host-backed built-in preference.
* @param fontSize - Current Host-backed content font size in px.
* @returns the body script row.
*/
function bootThemeInjection(preference = DEFAULT_PREFERENCE, fontSize = 14) {
	return {
		kind: "script",
		placement: "body",
		text: bootThemeScript(preference, fontSize)
	};
}
//#endregion
//#region lib/types/index.js
/** Host registration for the browser theme preference and pre-plugin palette. */
const THEME_NAMESPACE = THEME_SETTINGS_NAMESPACE;
/** Read the registered theme section or the schema defaults without a settings provider. */
function readSection(ctx) {
	const fallback = {
		preference: DEFAULT_PREFERENCE,
		fontSize: 14
	};
	const settings = ctx.get("settings");
	if (settings === void 0) return fallback;
	const section = settings.get(THEME_NAMESPACE);
	if (section === void 0) return fallback;
	return section;
}
/**
* Register the durable theme section when the optional settings service is
* composed, and answer every index injection collection with the current
* theme bootstrap row.
* @param ctx - Host context that may acquire the settings service.
*/
function apply(ctx) {
	ctx.inject(["settings"], (settingsCtx) => {
		settingsCtx.settings.register(THEME_NAMESPACE, ThemeSettingsSchema);
	});
	ctx.on("webserver/index-inject", (table) => {
		const section = readSection(ctx);
		table.push(bootThemeInjection(section.preference, section.fontSize));
	});
}
//#endregion
export { DEFAULT_FONT_SIZE, DEFAULT_PREFERENCE, FONT_SIZE_FIELD, FONT_SIZE_MAX, FONT_SIZE_MIN, THEME_PREFERENCES, THEME_PREFERENCE_FIELD, THEME_SETTINGS_NAMESPACE, apply };
