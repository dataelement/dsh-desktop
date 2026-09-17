import z from "@deepseek-ai/schemastery";
//#region lib/types/locale-settings.js
/** Locale preference stored in the Host user-settings document. */
/** Settings namespace owned by the locale plugin. */
const LOCALE_SETTINGS_NAMESPACE = "locale";
/** Field carrying an explicit locale selection; absence delegates to the browser. */
const LOCALE_PREFERENCE_FIELD = "preference";
/** Accepted BCP 47-style language ids. */
const LOCALE_ID_PATTERN = /^[A-Za-z]{2,8}(?:-[A-Za-z0-9]{1,8})*$/u;
/** Locale identifiers shipped by the browser client. */
const LOCALE_IDS = ["zh", "en"];
/** Durable locale schema; also the wire envelope the browser scope validates against. */
const LocaleSettingsSchema = z.object({ [LOCALE_PREFERENCE_FIELD]: z.string().pattern(LOCALE_ID_PATTERN).required(false) });
//#endregion
//#region lib/types/index.js
/** Host registration for the browser locale preference. */
/**
* Register the durable locale section when a settings provider exists.
* @param ctx - Host context whose optional settings service owns the section.
*/
function apply(ctx) {
	ctx.inject(["settings"], (settingsCtx) => {
		settingsCtx.settings.register(LOCALE_SETTINGS_NAMESPACE, LocaleSettingsSchema);
	});
}
//#endregion
export { LOCALE_IDS, LOCALE_PREFERENCE_FIELD, LOCALE_SETTINGS_NAMESPACE, apply };
