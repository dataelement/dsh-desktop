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
exports.safeDecodeAsync = exports.safeEncodeAsync = exports.safeDecode = exports.safeEncode = exports.decodeAsync = exports.encodeAsync = exports.decode = exports.encode = exports.validateAsync = exports.validate = exports.safeParseAsync = exports.safeParse = exports.parseAsync = exports.parse = void 0;
const core = __importStar(require("../core/index.cjs"));
const errors_js_1 = require("./errors.cjs");
exports.parse = core._parse(errors_js_1.ZodRealError);
exports.parseAsync = core._parseAsync(errors_js_1.ZodRealError);
exports.safeParse = core._safeParse(errors_js_1.ZodRealError);
exports.safeParseAsync = core._safeParseAsync(errors_js_1.ZodRealError);
var index_js_1 = require("../core/index.cjs");
Object.defineProperty(exports, "validate", { enumerable: true, get: function () { return index_js_1.validate; } });
Object.defineProperty(exports, "validateAsync", { enumerable: true, get: function () { return index_js_1.validateAsync; } });
// Codec functions
exports.encode = core._encode(errors_js_1.ZodRealError);
exports.decode = core._decode(errors_js_1.ZodRealError);
exports.encodeAsync = core._encodeAsync(errors_js_1.ZodRealError);
exports.decodeAsync = core._decodeAsync(errors_js_1.ZodRealError);
exports.safeEncode = core._safeEncode(errors_js_1.ZodRealError);
exports.safeDecode = core._safeDecode(errors_js_1.ZodRealError);
exports.safeEncodeAsync = core._safeEncodeAsync(errors_js_1.ZodRealError);
exports.safeDecodeAsync = core._safeDecodeAsync(errors_js_1.ZodRealError);

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
