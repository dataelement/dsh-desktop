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
import { RawDERObject } from './DERObject.js';
import { makeDERTaggedData, makeDERIA5String, makeDERBMPString, } from './derUtil.js';
/**
 * Abstract data SpcLink. Must use either `SpcLinkUrl` or `SpcLinkFile` instead.
 */
var SpcLink = /** @class */ (function () {
    function SpcLink(tag, value) {
        this.tag = tag;
        this.value = value;
    }
    SpcLink.prototype.toDER = function () {
        var v = this.value.toDER();
        if (this.tag === 2) {
            // EXPLICIT
            return makeDERTaggedData(this.tag, v);
        }
        else {
            // IMPLICIT
            v[0] = 0x80 + this.tag;
            return v;
        }
    };
    return SpcLink;
}());
export default SpcLink;
var SpcLinkUrl = /** @class */ (function (_super) {
    __extends(SpcLinkUrl, _super);
    function SpcLinkUrl(url) {
        return _super.call(this, 0, new RawDERObject(makeDERIA5String(url))) || this;
    }
    return SpcLinkUrl;
}(SpcLink));
export { SpcLinkUrl };
// moniker is not supported now (currently unused)
var SpcLinkFile = /** @class */ (function (_super) {
    __extends(SpcLinkFile, _super);
    function SpcLinkFile(file) {
        var _this = this;
        var v = makeDERBMPString(file);
        // [0] IMPLICIT BMPSTRING
        v[0] = 0x80;
        _this = _super.call(this, 2, new RawDERObject(v)) || this;
        return _this;
    }
    return SpcLinkFile;
}(SpcLink));
export { SpcLinkFile };
