/**
 * Internal Merkle-Damgard hash utils.
 * @module
 */
import { setU64FromNum } from "./_u64.js";
import { abytes, aexists, aoutput, createView } from "./utils.js";
/**
 * Shared 32-bit conditional boolean primitive reused by SHA-256, SHA-1, and MD5 `F`.
 * Returns bits from `b` when `a` is set, otherwise from `c`.
 * The XOR form is equivalent to MD5's `F(X,Y,Z) = XY v not(X)Z` because the masked terms never
 * set the same bit.
 * @param a - selector word
 * @param b - word chosen when selector bit is set
 * @param c - word chosen when selector bit is clear
 * @returns Mixed 32-bit word.
 * @example
 * Combine three words with the shared 32-bit choice primitive.
 * ```ts
 * Chi(0xffffffff, 0x12345678, 0x87654321);
 * ```
 */
export function Chi(a, b, c) {
    return (a & b) ^ (~a & c);
}
/**
 * Shared 32-bit majority primitive reused by SHA-256 and SHA-1.
 * Returns bits shared by at least two inputs.
 * @param a - first input word
 * @param b - second input word
 * @param c - third input word
 * @returns Mixed 32-bit word.
 * @example
 * Combine three words with the shared 32-bit majority primitive.
 * ```ts
 * Maj(0xffffffff, 0x12345678, 0x87654321);
 * ```
 */
export function Maj(a, b, c) {
    return (a & b) ^ (a & c) ^ (b & c);
}
/**
 * Merkle-Damgard hash construction base class.
 * Could be used to create MD5, RIPEMD, SHA1, SHA2.
 * Accepts only byte-aligned `Uint8Array` input, even when the underlying spec describes bit
 * strings with partial-byte tails.
 * @param blockLen - internal block size in bytes
 * @param outputLen - digest size in bytes
 * @param padOffset - trailing length field size in bytes
 * @param isLE - whether length and state words are encoded in little-endian
 * @example
 * Use a concrete subclass to get the shared Merkle-Damgard update/digest flow.
 * ```ts
 * import { _SHA1 } from '@noble/hashes/legacy.js';
 * const hash = new _SHA1();
 * hash.update(new Uint8Array([97, 98, 99]));
 * hash.digest();
 * ```
 */
export class HashMD {
    blockLen;
    outputLen;
    canXOF = false;
    padOffset;
    isLE;
    // For partial updates less than block size
    buffer;
    view;
    finished = false;
    length = 0;
    pos = 0;
    destroyed = false;
    constructor(blockLen, outputLen, padOffset, isLE) {
        this.blockLen = blockLen;
        this.outputLen = outputLen;
        this.padOffset = padOffset;
        this.isLE = isLE;
        this.buffer = new Uint8Array(blockLen);
        this.view = createView(this.buffer);
    }
    update(data) {
        aexists(this);
        abytes(data);
        const { view, buffer, blockLen } = this;
        const len = data.length;
        let processed = false;
        for (let pos = 0; pos < len;) {
            const take = Math.min(blockLen - this.pos, len - pos);
            // Fast path only when there is no buffered partial block: `take === blockLen` implies
            // `this.pos === 0`, so we can process full blocks directly from the input view.
            if (take === blockLen) {
                const dataView = createView(data);
                for (; blockLen <= len - pos; pos += blockLen)
                    this.process(dataView, pos);
                processed = true;
                continue;
            }
            // When the whole input is buffered in one go (common for short messages), passing `data`
            // directly avoids allocating a subarray view.
            buffer.set(pos === 0 && take === len ? data : data.subarray(pos, pos + take), this.pos);
            this.pos += take;
            pos += take;
            if (this.pos === blockLen) {
                this.process(view, 0);
                this.pos = 0;
                processed = true;
            }
        }
        this.length += data.length;
        // Shared schedule buffers only pick up input-derived words inside process(); if everything
        // was buffered without processing, there is nothing to zero.
        if (processed)
            this.roundClean();
        return this;
    }
    digestInto(out) {
        aexists(this);
        aoutput(out, this);
        this.finished = true;
        // Padding
        // We can avoid allocation of buffer for padding completely if it
        // was previously not allocated here. But it won't change performance.
        const { buffer, view, blockLen, isLE } = this;
        let { pos } = this;
        // append the bit '1' to the message, then zero-pad the rest of the block
        buffer[pos++] = 0b10000000;
        buffer.fill(0, pos);
        // we have less than padOffset left in buffer, so we cannot put length in
        // current block, need process it and pad again
        if (this.padOffset > blockLen - pos) {
            this.process(view, 0);
            buffer.fill(0);
        }
        // `padOffset` reserves the whole length field. For SHA-384/512 the high 64 bits stay zero from
        // the padding fill above, and JS will overflow before user input can make that half non-zero.
        // So we only need to write the low 64 bits here (`length * 8` only scales the exponent of an
        // integer below 2**53, so the split inside the helper stays exact).
        setU64FromNum(view, blockLen - 8, this.length * 8, isLE);
        this.process(view, 0);
        // The final block above is processed outside update(), so the shared message-schedule
        // buffers (e.g. SHA256_W) would otherwise retain input-derived words after digest().
        this.roundClean();
        // digest() passes our own `buffer` as `out`; reuse its cached view instead of allocating one.
        const oview = out === buffer ? view : createView(out);
        const len = this.outputLen;
        // NOTE: we do division by 4 later, which must be fused in single op with modulo by JIT
        const outLen = len / 4;
        const state = this.get();
        // Subclass-misconfiguration invariant: outputLen must be 32-bit aligned and fit the state.
        if (len % 4 || outLen > state.length)
            throw new Error('invalid outputLen');
        for (let i = 0; i < outLen; i++)
            oview.setUint32(4 * i, state[i], isLE);
    }
    digest() {
        const { buffer, outputLen } = this;
        this.digestInto(buffer);
        // Copy before destroy(): subclasses wipe `buffer` during cleanup, but `digest()` must return
        // fresh bytes to the caller.
        const res = buffer.slice(0, outputLen);
        this.destroy();
        return res;
    }
    _cloneIntoMeta(to) {
        const { buffer, length, finished, destroyed, pos } = this;
        to.destroyed = destroyed;
        to.finished = finished;
        to.length = length;
        to.pos = pos;
        // Only partial-block bytes need copying: when `length % blockLen === 0`, `pos === 0` and
        // later `update()` / `digestInto()` overwrite `to.buffer` from the start before reading it.
        if (pos)
            to.buffer.set(buffer); // Avoid a hot modulo guard.
        return to;
    }
    clone() {
        return this._cloneInto();
    }
}
/**
 * Initial SHA-2 state: fractional parts of square roots of first 16 primes 2..53.
 * Check out `test/misc/sha2-gen-iv.js` for recomputation guide.
 */
/** Initial SHA256 state from RFC 6234 §6.1: the first 32 bits of the fractional parts of the
 * square roots of the first eight prime numbers. Exported as a shared table; callers must treat
 * it as read-only because constructors copy words from it by index. */
export const SHA256_IV = /* @__PURE__ */ Uint32Array.from([
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
]);
/** Initial SHA224 state `H(0)` from RFC 6234 §6.1. Exported as a shared table; callers must
 * treat it as read-only because constructors copy words from it by index. */
export const SHA224_IV = /* @__PURE__ */ Uint32Array.from([
    0xc1059ed8, 0x367cd507, 0x3070dd17, 0xf70e5939, 0xffc00b31, 0x68581511, 0x64f98fa7, 0xbefa4fa4,
]);
/** Initial SHA384 state from RFC 6234 §6.3: eight RFC 64-bit `H(0)` words stored as sixteen
 * big-endian 32-bit halves. Derived from the fractional parts of the square roots of the ninth
 * through sixteenth prime numbers. Exported as a shared table; callers must treat it as read-only
 * because constructors copy halves from it by index. */
export const SHA384_IV = /* @__PURE__ */ Uint32Array.from([
    0xcbbb9d5d, 0xc1059ed8, 0x629a292a, 0x367cd507, 0x9159015a, 0x3070dd17, 0x152fecd8, 0xf70e5939,
    0x67332667, 0xffc00b31, 0x8eb44a87, 0x68581511, 0xdb0c2e0d, 0x64f98fa7, 0x47b5481d, 0xbefa4fa4,
]);
/** Initial SHA512 state from RFC 6234 §6.3: eight RFC 64-bit `H(0)` words stored as sixteen
 * big-endian 32-bit halves. Derived from the fractional parts of the square roots of the first
 * eight prime numbers. Exported as a shared table; callers must treat it as read-only because
 * constructors copy halves from it by index. */
export const SHA512_IV = /* @__PURE__ */ Uint32Array.from([
    0x6a09e667, 0xf3bcc908, 0xbb67ae85, 0x84caa73b, 0x3c6ef372, 0xfe94f82b, 0xa54ff53a, 0x5f1d36f1,
    0x510e527f, 0xade682d1, 0x9b05688c, 0x2b3e6c1f, 0x1f83d9ab, 0xfb41bd6b, 0x5be0cd19, 0x137e2179,
]);
