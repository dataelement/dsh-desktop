/**
 * HMAC: RFC2104 message authentication code.
 * @module
 */
import { abytes, aexists, ahash, aoutput, clean, } from "./utils.js";
/**
 * Internal class for HMAC.
 * Accepts any byte key, although RFC 2104 §3 recommends keys at least
 * `HashLen` bytes long.
 */
export class _HMAC {
    oHash;
    iHash;
    blockLen;
    outputLen;
    canXOF = false;
    finished = false;
    destroyed = false;
    constructor(hash, key) {
        ahash(hash);
        abytes(key, undefined, 'key');
        this.iHash = hash.create();
        if (typeof this.iHash.update !== 'function')
            throw new Error('expected Hash instance');
        this.blockLen = this.iHash.blockLen;
        this.outputLen = this.iHash.outputLen;
        const blockLen = this.blockLen;
        const pad = new Uint8Array(blockLen);
        // blockLen can be bigger than outputLen
        pad.set(key.length > blockLen ? hash.create().update(key).digest() : key);
        for (let i = 0; i < pad.length; i++)
            pad[i] ^= 0x36;
        this.iHash.update(pad);
        // By doing update (processing of the first block) of the outer hash here,
        // we can re-use it between multiple calls via clone.
        this.oHash = hash.create();
        // Undo internal XOR && apply outer XOR
        for (let i = 0; i < pad.length; i++)
            pad[i] ^= 0x36 ^ 0x5c;
        this.oHash.update(pad);
        clean(pad);
    }
    update(buf) {
        aexists(this);
        this.iHash.update(buf);
        return this;
    }
    digestInto(out) {
        aexists(this);
        aoutput(out, this);
        this.finished = true;
        const buf = out.subarray(0, this.outputLen);
        // Reuse the first outputLen bytes for the inner digest; the outer hash consumes them before
        // overwriting that same prefix with the final tag, leaving any oversized tail untouched.
        this.iHash.digestInto(buf);
        this.oHash.update(buf);
        this.oHash.digestInto(buf);
        this.destroy();
    }
    digest() {
        const out = new Uint8Array(this.oHash.outputLen);
        this.digestInto(out);
        return out;
    }
    _cloneInto(to) {
        // Create new instance without calling constructor since the key
        // is already in state and we don't know it.
        to ||= Object.create(Object.getPrototypeOf(this), {});
        const { oHash, iHash, finished, destroyed, blockLen, outputLen, canXOF } = this;
        to = to;
        to.finished = finished;
        to.destroyed = destroyed;
        to.blockLen = blockLen;
        to.outputLen = outputLen;
        to.canXOF = canXOF;
        to.oHash = oHash._cloneInto(to.oHash);
        to.iHash = iHash._cloneInto(to.iHash);
        return to;
    }
    clone() {
        return this._cloneInto();
    }
    destroy() {
        this.destroyed = true;
        this.oHash.destroy();
        this.iHash.destroy();
    }
}
export const hmac = /* @__PURE__ */ (() => {
    const hmac_ = ((hash, key, message) => new _HMAC(hash, key).update(message).digest());
    hmac_.create = (hash, key) => new _HMAC(hash, key);
    return hmac_;
})();
