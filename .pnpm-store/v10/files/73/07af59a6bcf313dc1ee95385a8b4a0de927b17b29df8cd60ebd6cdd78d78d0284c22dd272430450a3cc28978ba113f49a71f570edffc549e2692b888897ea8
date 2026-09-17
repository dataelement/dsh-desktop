import { visit } from "../core/visit.js";
import * as schemas from "./schemas.js";
/** See `classic/deep-partial.ts`. Mini variant uses `mini.partial(...)`. */
export function deepPartial(schema) {
    return visit(schema, {
        object: (s) => schemas.partial(s),
        // See `classic/deep-partial.ts`.
        union: (s) => {
            const def = s._zod.def;
            return def.discriminator === undefined ? s : schemas.union(def.options);
        },
    });
}
