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
import ObjectIdentifier from './ObjectIdentifier.js';
import { SpcAttributeTypeAndOptionalValue } from './SpcIndirectDataContent.js';
import { makeDERSequence, makeDERTaggedData } from './derUtil.js';
// prettier-ignore
export var SPC_PE_IMAGE_DATA_OBJID = new ObjectIdentifier([1, 3, 6, 1, 4, 1, 311, 2, 1, 15]);
var SpcPeImageData = /** @class */ (function () {
    function SpcPeImageData(flags, file) {
        this.flags = flags;
        this.file = file;
    }
    SpcPeImageData.prototype.toDER = function () {
        return makeDERSequence([0x03, 0x01, this.flags & 0xff].concat(
        // undocumented -- SpcLink must be tagged
        makeDERTaggedData(0, this.file.toDER())));
    };
    return SpcPeImageData;
}());
export default SpcPeImageData;
var SpcPeImageAttributeTypeAndOptionalValue = /** @class */ (function (_super) {
    __extends(SpcPeImageAttributeTypeAndOptionalValue, _super);
    function SpcPeImageAttributeTypeAndOptionalValue(value) {
        return _super.call(this, SPC_PE_IMAGE_DATA_OBJID, value) || this;
    }
    return SpcPeImageAttributeTypeAndOptionalValue;
}(SpcAttributeTypeAndOptionalValue));
export { SpcPeImageAttributeTypeAndOptionalValue };
