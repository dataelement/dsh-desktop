import { visit } from "../core/visit.js";
import * as schemas from "./schemas.js";
/** Returns a copy of the schema with every nested object's properties made optional. */
export function deepPartial(schema) {
    return visit(schema, {
        object: (s) => s.partial(),
        // Every partialed option now admits `undefined`, which the constructor rejects as a duplicate.
        union: (s) => {
            const def = s._zod.def;
            return def.discriminator === undefined ? s : schemas.union(def.options);
        },
    });
}
