//#region lib/types/invariant.js
/** Package-owned invariant companion for the standard Composer adapter. */
const PACKAGE_NAME = "dsh-ppt-composer";
/** Companion plugin identity. */
const name = "dsh-ppt-composer-invariant";
/** Required invariant registry. */
const inject = ["invariants"];
/** The shared Office PPT package owns runtime invariants; this package owns composition only. */
const install = () => {};
/** Register the adapter's static-composition ownership. */
const apply = (ctx) => Promise.resolve(ctx.invariants.register(PACKAGE_NAME, install));
//#endregion
export { apply, inject, name };
