import z from "@deepseek-ai/schemastery";
import * as officePpt from "dsh-ppt";
//#region lib/types/index.js
/** Host composition entry for the standard Composer Office PPT adapter. */
/** Cordis plugin identity. */
const name = "dsh-ppt-composer";
/** Host services required by the shared Office PPT implementation. */
const inject = [
	"connection",
	"tools",
	"systemPrompt",
	"skills"
];
/** Validate the adapter with the shared Office PPT schema. */
const Config = z.intersect([officePpt.Config]);
/** Start the shared Office PPT Host plugin below the adapter fiber. */
async function apply(ctx, config) {
	await ctx.plugin(officePpt, config);
}
//#endregion
export { Config, apply, inject, name };
