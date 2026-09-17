import { clone, mergeDefs } from "../core/util.js";
import { visit } from "../core/visit.js";
import * as schemas from "./schemas.js";
/** See `classic/in-out.ts`. */
function withChecks(side, checks) {
    if (!checks?.length)
        return side;
    const def = side._zod.def;
    return clone(side, mergeDefs(def, { checks: [...(def.checks ?? []), ...checks] }), { parent: true });
}
/** See `classic/in-out.ts`. */
function outSide(def) {
    return withChecks(def.out, def.checks);
}
/** See `classic/in-out.ts`. */
function inSide(def) {
    return def.in._zod.traits.has("$ZodTransform") ? outSide(def) : def.in;
}
/** See `classic/in-out.ts`. */
export function input(schema) {
    return visit(schema, {
        pipe: (s) => inSide(s._zod.def),
        // A default value belongs to the output side, so a rewritten inner type leaves it stranded. `.default()` widens the declared input type with `undefined`, and `optional` is what carries that across.
        default: (s, rewritten) => (rewritten ? schemas.optional(s._zod.def.innerType) : s),
        // A catch value is output-side too, but `.catch()` leaves the declared input type alone, so the inner schema stands on its own.
        catch: (s, rewritten) => (rewritten ? s._zod.def.innerType : s),
    });
}
/** See `classic/in-out.ts`. */
export function output(schema) {
    return visit(schema, {
        pipe: (s) => outSide(s._zod.def),
        // A prefault value is fed through the schema, which makes it input-side, so a rewritten inner type leaves it stranded.
        prefault: (s, rewritten) => (rewritten ? s._zod.def.innerType : s),
    });
}
