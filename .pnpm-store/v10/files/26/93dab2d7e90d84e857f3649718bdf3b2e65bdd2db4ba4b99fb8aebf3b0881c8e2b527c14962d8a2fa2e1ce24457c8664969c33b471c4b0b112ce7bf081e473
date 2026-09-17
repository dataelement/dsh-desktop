"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.input = input;
exports.output = output;
const util_js_1 = require("../core/util.cjs");
const visit_js_1 = require("../core/visit.cjs");
const schemas = __importStar(require("./schemas.cjs"));
/** Appends a pipe's own checks to the side that replaces it, mirroring how `.check()` clones. */
function withChecks(side, checks) {
    if (!checks?.length)
        return side;
    const def = side._zod.def;
    return (0, util_js_1.clone)(side, (0, util_js_1.mergeDefs)(def, { checks: [...(def.checks ?? []), ...checks] }), { parent: true });
}
/** The out side, carrying the pipe's own checks: those run against the decoded value, which is what `out` produces. */
function outSide(def) {
    return withChecks(def.out, def.checks);
}
/** The in side. `z.preprocess` pipes a transform into a schema, and a bare transform validates nothing, so the schema it feeds is the real input side — the resolution `toJSONSchema` already makes for this case. */
function inSide(def) {
    return def.in._zod.traits.has("$ZodTransform") ? outSide(def) : def.in;
}
/** Returns a copy of the schema with every pipe replaced by its input side. A codec's checks are dropped: they constrain the decoded value the input side never produces. */
function input(schema) {
    return (0, visit_js_1.visit)(schema, {
        pipe: (s) => inSide(s._zod.def),
        // A default value belongs to the output side, so a rewritten inner type leaves it stranded. `.default()` widens the declared input type with `undefined`, and `optional` is what carries that across.
        default: (s, rewritten) => (rewritten ? schemas.optional(s._zod.def.innerType) : s),
        // A catch value is output-side too, but `.catch()` leaves the declared input type alone, so the inner schema stands on its own.
        catch: (s, rewritten) => (rewritten ? s._zod.def.innerType : s),
    });
}
/** Returns a copy of the schema with every pipe replaced by its output side, carrying over the pipe's own checks. */
function output(schema) {
    return (0, visit_js_1.visit)(schema, {
        pipe: (s) => outSide(s._zod.def),
        // A prefault value is fed through the schema, which makes it input-side, so a rewritten inner type leaves it stranded.
        prefault: (s, rewritten) => (rewritten ? s._zod.def.innerType : s),
    });
}

// seal-cjs-exports
(function () {
  var keys = Object.getOwnPropertyNames(exports);
  for (var i = 0; i < keys.length; i++) {
    var desc = Object.getOwnPropertyDescriptor(exports, keys[i]);
    if (!desc || !desc.get || !desc.configurable) continue;
    var value;
    try {
      value = desc.get();
    } catch (e) {
      continue;
    }
    // a circular require may not have settled this one yet, so leave it live
    if (value === undefined) continue;
    Object.defineProperty(exports, keys[i], { value: value, writable: false, enumerable: desc.enumerable, configurable: false });
  }
  Object.freeze(exports);
})();
