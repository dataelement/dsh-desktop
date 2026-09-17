"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var derUtil_js_1 = require("./derUtil.js");
// abstract
var ContentInfo = /** @class */ (function () {
    function ContentInfo(contentType, content) {
        this.contentType = contentType;
        this.content = content;
    }
    ContentInfo.prototype.toDER = function () {
        return derUtil_js_1.makeDERSequence(this.contentType
            .toDER()
            .concat(derUtil_js_1.makeDERTaggedData(0, this.content.toDER())));
    };
    return ContentInfo;
}());
exports.default = ContentInfo;
