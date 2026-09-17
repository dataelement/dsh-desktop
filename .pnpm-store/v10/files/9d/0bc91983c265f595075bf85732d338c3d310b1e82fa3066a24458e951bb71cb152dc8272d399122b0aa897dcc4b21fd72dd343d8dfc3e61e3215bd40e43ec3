"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.SpcIndirectDataContentInfo = exports.SpcAttributeTypeAndOptionalValue = exports.SPC_INDIRECT_DATA_OBJID = void 0;
var ContentInfo_js_1 = require("./ContentInfo.js");
var ObjectIdentifier_js_1 = require("./ObjectIdentifier.js");
var derUtil_js_1 = require("./derUtil.js");
// prettier-ignore
exports.SPC_INDIRECT_DATA_OBJID = new ObjectIdentifier_js_1.default([1, 3, 6, 1, 4, 1, 311, 2, 1, 4]);
var SpcAttributeTypeAndOptionalValue = /** @class */ (function () {
    function SpcAttributeTypeAndOptionalValue(type, value) {
        this.type = type;
        this.value = value;
    }
    SpcAttributeTypeAndOptionalValue.prototype.toDER = function () {
        return derUtil_js_1.makeDERSequence(this.type.toDER().concat(this.value.toDER()));
    };
    return SpcAttributeTypeAndOptionalValue;
}());
exports.SpcAttributeTypeAndOptionalValue = SpcAttributeTypeAndOptionalValue;
var SpcIndirectDataContent = /** @class */ (function () {
    function SpcIndirectDataContent(data, messageDigest) {
        this.data = data;
        this.messageDigest = messageDigest;
    }
    SpcIndirectDataContent.prototype.toDER = function () {
        return derUtil_js_1.makeDERSequence(this.toDERWithoutHeader());
    };
    // this is used for calculating 'messageDigest'
    SpcIndirectDataContent.prototype.toDERWithoutHeader = function () {
        return this.data.toDER().concat(this.messageDigest.toDER());
    };
    return SpcIndirectDataContent;
}());
exports.default = SpcIndirectDataContent;
var SpcIndirectDataContentInfo = /** @class */ (function (_super) {
    __extends(SpcIndirectDataContentInfo, _super);
    function SpcIndirectDataContentInfo(content) {
        return _super.call(this, exports.SPC_INDIRECT_DATA_OBJID, content) || this;
    }
    return SpcIndirectDataContentInfo;
}(ContentInfo_js_1.default));
exports.SpcIndirectDataContentInfo = SpcIndirectDataContentInfo;
