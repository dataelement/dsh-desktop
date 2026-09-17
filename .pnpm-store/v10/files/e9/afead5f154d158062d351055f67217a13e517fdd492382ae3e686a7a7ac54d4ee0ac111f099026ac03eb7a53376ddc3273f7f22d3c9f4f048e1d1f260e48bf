import { makeDERSequence, makeDERTaggedData } from './derUtil.js';
// abstract
var ContentInfo = /** @class */ (function () {
    function ContentInfo(contentType, content) {
        this.contentType = contentType;
        this.content = content;
    }
    ContentInfo.prototype.toDER = function () {
        return makeDERSequence(this.contentType
            .toDER()
            .concat(makeDERTaggedData(0, this.content.toDER())));
    };
    return ContentInfo;
}());
export default ContentInfo;
