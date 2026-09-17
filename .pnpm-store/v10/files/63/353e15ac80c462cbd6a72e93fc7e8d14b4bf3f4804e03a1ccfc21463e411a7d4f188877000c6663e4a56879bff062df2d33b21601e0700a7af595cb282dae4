"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.trimStringWithWarn = void 0;
const builder_util_1 = require("builder-util");
const trimStringWithWarn = (str, maxLength, warnMessage) => {
    if (str.length <= maxLength) {
        return str;
    }
    builder_util_1.log.warn({ length: str.length, maxLength }, warnMessage);
    return str.substring(0, maxLength);
};
exports.trimStringWithWarn = trimStringWithWarn;
//# sourceMappingURL=util.js.map