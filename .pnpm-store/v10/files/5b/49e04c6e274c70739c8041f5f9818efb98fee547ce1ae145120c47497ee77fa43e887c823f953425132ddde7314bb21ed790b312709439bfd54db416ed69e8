"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Lazy = void 0;
class Lazy {
    constructor(creator) {
        this._value = null;
        this.creator = creator;
    }
    get hasValue() {
        return this.creator == null;
    }
    get value() {
        if (this.creator == null) {
            return this._value;
        }
        const result = this.creator();
        this.value = result;
        return result;
    }
    set value(value) {
        this._value = value;
        this.creator = null;
    }
}
exports.Lazy = Lazy;
//# sourceMappingURL=main.js.map