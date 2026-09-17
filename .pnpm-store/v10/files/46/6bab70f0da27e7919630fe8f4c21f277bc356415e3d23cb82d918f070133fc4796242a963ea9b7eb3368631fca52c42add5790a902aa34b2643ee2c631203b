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
import ContentInfo from './ContentInfo.js';
import ObjectIdentifier from './ObjectIdentifier.js';
import { makeDERSequence } from './derUtil.js';
// prettier-ignore
export var SPC_INDIRECT_DATA_OBJID = new ObjectIdentifier([1, 3, 6, 1, 4, 1, 311, 2, 1, 4]);
var SpcAttributeTypeAndOptionalValue = /** @class */ (function () {
    function SpcAttributeTypeAndOptionalValue(type, value) {
        this.type = type;
        this.value = value;
    }
    SpcAttributeTypeAndOptionalValue.prototype.toDER = function () {
        return makeDERSequence(this.type.toDER().concat(this.value.toDER()));
    };
    return SpcAttributeTypeAndOptionalValue;
}());
export { SpcAttributeTypeAndOptionalValue };
var SpcIndirectDataContent = /** @class */ (function () {
    function SpcIndirectDataContent(data, messageDigest) {
        this.data = data;
        this.messageDigest = messageDigest;
    }
    SpcIndirectDataContent.prototype.toDER = function () {
        return makeDERSequence(this.toDERWithoutHeader());
    };
    // this is used for calculating 'messageDigest'
    SpcIndirectDataContent.prototype.toDERWithoutHeader = function () {
        return this.data.toDER().concat(this.messageDigest.toDER());
    };
    return SpcIndirectDataContent;
}());
export default SpcIndirectDataContent;
var SpcIndirectDataContentInfo = /** @class */ (function (_super) {
    __extends(SpcIndirectDataContentInfo, _super);
    function SpcIndirectDataContentInfo(content) {
        return _super.call(this, SPC_INDIRECT_DATA_OBJID, content) || this;
    }
    return SpcIndirectDataContentInfo;
}(ContentInfo));
export { SpcIndirectDataContentInfo };
