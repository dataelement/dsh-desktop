import z from "@deepseek-ai/schemastery";
//#region lib/types/index.js
/** Host loader entry for the browser implementation exported from `./client`. */
/** Durable settings namespace for product-wide GUI onboarding facts. */
const ONBOARDING_SETTINGS_NAMESPACE = "ui-onboarding";
const OnboardingSettingsSchema = z.object({ welcomeNoticeVersion: z.string() });
/** Register the durable GUI-onboarding section when a settings provider exists. */
function apply(ctx) {
	ctx.inject(["settings"], (settingsCtx) => {
		settingsCtx.settings.register(ONBOARDING_SETTINGS_NAMESPACE, OnboardingSettingsSchema);
	});
}
//#endregion
export { apply };
