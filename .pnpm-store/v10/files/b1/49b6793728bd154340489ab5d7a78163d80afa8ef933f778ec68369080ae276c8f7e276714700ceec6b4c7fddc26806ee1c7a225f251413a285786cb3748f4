/**

SHA1 (RFC 3174), MD5 (RFC 1321), and RIPEMD160 legacy, weak hash functions.
RFC 2286 only covers HMAC-RIPEMD160 wrapper material and test vectors,
not the base RIPEMD-160 compression spec.
Don't use them in a new protocol. What "weak" means:

- Collisions can be made with 2^18 effort in MD5, 2^60 in SHA1, 2^80 in RIPEMD160.
- No practical pre-image attacks (only theoretical, 2^123.4)
- HMAC seems kinda ok: https://www.rfc-editor.org/rfc/rfc6151
 * @module
 */
import { Chi, HashMD, Maj } from "./_md.js";
import { clean, createHasher, rotl } from "./utils.js";
/** Initial SHA-1 state from RFC 3174 §6.1. */
const SHA1_IV = /* @__PURE__ */ Uint32Array.from([
    0x67452301, 0xefcdab89, 0x98badcfe, 0x10325476, 0xc3d2e1f0,
]);
// Reusable 80-word SHA-1 message schedule buffer.
const SHA1_W = /* @__PURE__ */ new Uint32Array(80);
/** Internal SHA1 legacy hash class. */
export class _SHA1 extends HashMD {
    A = SHA1_IV[0] | 0;
    B = SHA1_IV[1] | 0;
    C = SHA1_IV[2] | 0;
    D = SHA1_IV[3] | 0;
    E = SHA1_IV[4] | 0;
    constructor() {
        super(64, 20, 8, false);
    }
    get() {
        const { A, B, C, D, E } = this;
        return [A, B, C, D, E];
    }
    set(A, B, C, D, E) {
        this.A = A | 0;
        this.B = B | 0;
        this.C = C | 0;
        this.D = D | 0;
        this.E = E | 0;
    }
    _cloneInto(to) {
        (to ||= new this.constructor()).set(...this.get());
        return this._cloneIntoMeta(to);
    }
    process(view, offset) {
        for (let i = 0; i < 16; i++, offset += 4)
            SHA1_W[i] = view.getUint32(offset, false);
        for (let i = 16; i < 80; i++)
            SHA1_W[i] = rotl(SHA1_W[i - 3] ^ SHA1_W[i - 8] ^ SHA1_W[i - 14] ^ SHA1_W[i - 16], 1);
        // Compression function main loop, 80 rounds
        let { A, B, C, D, E } = this;
        for (let i = 0; i < 80; i++) {
            let F, K;
            if (i < 20) {
                F = Chi(B, C, D);
                K = 0x5a827999;
            }
            else if (i < 40) {
                F = B ^ C ^ D;
                K = 0x6ed9eba1;
            }
            else if (i < 60) {
                F = Maj(B, C, D);
                K = 0x8f1bbcdc;
            }
            else {
                F = B ^ C ^ D;
                K = 0xca62c1d6;
            }
            const T = (rotl(A, 5) + F + E + K + SHA1_W[i]) | 0;
            E = D;
            D = C;
            C = rotl(B, 30);
            B = A;
            A = T;
        }
        // Add the compressed chunk to the current hash value
        A = (A + this.A) | 0;
        B = (B + this.B) | 0;
        C = (C + this.C) | 0;
        D = (D + this.D) | 0;
        E = (E + this.E) | 0;
        this.set(A, B, C, D, E);
    }
    roundClean() {
        clean(SHA1_W);
    }
    destroy() {
        // HashMD callers route post-destroy usability through `destroyed`; zeroizing alone still leaves
        // update()/digest() callable on reused instances.
        this.destroyed = true;
        this.set(0, 0, 0, 0, 0);
        clean(this.buffer);
    }
}
/**
 * SHA1 (RFC 3174) legacy hash function. It was cryptographically broken.
 * @param msg - message bytes to hash
 * @param opts - Reserved hash options.
 * @returns Digest bytes.
 * @example
 * Hash a message with SHA1.
 * ```ts
 * sha1(new Uint8Array([97, 98, 99]));
 * ```
 */
export const sha1 = /* @__PURE__ */ createHasher(() => new _SHA1());
/** RFC 1321 `T[i]` uses `floor(2^32 * abs(sin(i)))`; this is the shared `2^32` scale factor. */
const p32 = /* @__PURE__ */ Math.pow(2, 32);
/** RFC 1321 `T[1..64]` table. */
const K = /* @__PURE__ */ Array.from({ length: 64 }, (_, i) => Math.floor(p32 * Math.abs(Math.sin(i + 1))));
/** MD5 initial state from RFC 1321, stored as 4 u32 words. */
const MD5_IV = /* @__PURE__ */ SHA1_IV.slice(0, 4);
// Reusable 16-word MD5 message block buffer.
const MD5_W = /* @__PURE__ */ new Uint32Array(16);
// RFC 1321 §3.4 per-round rotate amounts, flattened to 64 entries so the round loop
// avoids allocating a 4-element array literal every round (measured ~5% of md5).
const MD5_SHIFTS = /* @__PURE__ */ (() => {
    const S = [
        [7, 12, 17, 22],
        [5, 9, 14, 20],
        [4, 11, 16, 23],
        [6, 10, 15, 21],
    ];
    return Uint8Array.from({ length: 64 }, (_, i) => S[Math.floor(i / 16)][i % 4]);
})();
/** Internal MD5 legacy hash class. */
export class _MD5 extends HashMD {
    A = MD5_IV[0] | 0;
    B = MD5_IV[1] | 0;
    C = MD5_IV[2] | 0;
    D = MD5_IV[3] | 0;
    constructor() {
        super(64, 16, 8, true);
    }
    get() {
        const { A, B, C, D } = this;
        return [A, B, C, D];
    }
    set(A, B, C, D) {
        this.A = A | 0;
        this.B = B | 0;
        this.C = C | 0;
        this.D = D | 0;
    }
    _cloneInto(to) {
        (to ||= new this.constructor()).set(...this.get());
        return this._cloneIntoMeta(to);
    }
    process(view, offset) {
        for (let i = 0; i < 16; i++, offset += 4)
            MD5_W[i] = view.getUint32(offset, true);
        // Compression function main loop, 64 rounds
        let { A, B, C, D } = this;
        for (let i = 0; i < 64; i++) {
            let F, g;
            if (i < 16) {
                F = Chi(B, C, D);
                g = i;
            }
            else if (i < 32) {
                // RFC 1321 round 2 uses G(B,C,D) = (B & D) | (C & ~D), which is `Chi(D, B, C)`.
                F = Chi(D, B, C);
                g = (5 * i + 1) % 16;
            }
            else if (i < 48) {
                F = B ^ C ^ D;
                g = (3 * i + 5) % 16;
            }
            else {
                F = C ^ (B | ~D);
                g = (7 * i) % 16;
            }
            F = F + A + K[i] + MD5_W[g];
            A = D;
            D = C;
            C = B;
            B = B + rotl(F, MD5_SHIFTS[i]);
        }
        // Add the compressed chunk to the current hash value
        A = (A + this.A) | 0;
        B = (B + this.B) | 0;
        C = (C + this.C) | 0;
        D = (D + this.D) | 0;
        this.set(A, B, C, D);
    }
    roundClean() {
        clean(MD5_W);
    }
    destroy() {
        // HashMD callers route post-destroy usability through `destroyed`; zeroizing alone still leaves
        // update()/digest() callable on reused instances.
        this.destroyed = true;
        this.set(0, 0, 0, 0);
        clean(this.buffer);
    }
}
/**
 * MD5 (RFC 1321) legacy hash function. It was cryptographically broken.
 * MD5 architecture is similar to SHA1, with some differences:
 * - Reduced output length: 16 bytes (128 bit) instead of 20
 * - 64 rounds, instead of 80
 * - Little-endian: could be faster, but will require more code
 * - Non-linear index selection: huge speed-up for unroll
 * - Per round constants: more memory accesses, additional speed-up for unroll
 * @param msg - message bytes to hash
 * @param opts - Reserved hash options.
 * @returns Digest bytes.
 * @example
 * Hash a message with MD5.
 * ```ts
 * md5(new Uint8Array([97, 98, 99]));
 * ```
 */
export const md5 = /* @__PURE__ */ createHasher(() => new _MD5());
// RIPEMD-160
// Permutation repeatedly applied to derive the later RIPEMD-160 message-order tables.
const Rho160 = /* @__PURE__ */ Uint8Array.from([
    7, 4, 13, 1, 10, 6, 15, 3, 12, 0, 9, 5, 2, 14, 11, 8,
]);
const Id160 = /* @__PURE__ */ (() => Uint8Array.from(new Array(16).fill(0).map((_, i) => i)))();
const Pi160 = /* @__PURE__ */ (() => Id160.map((i) => (9 * i + 5) % 16))();
// Five left/right message-word orderings for the RIPEMD-160 dual-lane rounds.
const idxLR = /* @__PURE__ */ (() => {
    const L = [Id160];
    const R = [Pi160];
    const res = [L, R];
    for (let i = 0; i < 4; i++)
        for (let j of res)
            j.push(j[i].map((k) => Rho160[k]));
    return res;
})();
const idxL = /* @__PURE__ */ (() => idxLR[0])();
const idxR = /* @__PURE__ */ (() => idxLR[1])();
// const [idxL, idxR] = idxLR;
// Base per-group shift table before the left/right message-order permutations are applied.
const shifts160 = /* @__PURE__ */ [
    [11, 14, 15, 12, 5, 8, 7, 9, 11, 13, 14, 15, 6, 7, 9, 8],
    [12, 13, 11, 15, 6, 9, 9, 7, 12, 15, 11, 13, 7, 8, 7, 7],
    [13, 15, 14, 11, 7, 7, 6, 8, 13, 14, 13, 12, 5, 5, 6, 9],
    [14, 11, 12, 14, 8, 6, 5, 5, 15, 12, 15, 14, 9, 9, 8, 6],
    [15, 12, 13, 13, 9, 5, 8, 6, 14, 11, 12, 11, 8, 6, 5, 5],
].map((i) => Uint8Array.from(i));
const shiftsL160 = /* @__PURE__ */ idxL.map((idx, i) => idx.map((j) => shifts160[i][j]));
const shiftsR160 = /* @__PURE__ */ idxR.map((idx, i) => idx.map((j) => shifts160[i][j]));
// Five left-lane additive constants for RIPEMD-160.
const Kl160 = /* @__PURE__ */ Uint32Array.from([
    0x00000000, 0x5a827999, 0x6ed9eba1, 0x8f1bbcdc, 0xa953fd4e,
]);
// Five right-lane additive constants for RIPEMD-160.
const Kr160 = /* @__PURE__ */ Uint32Array.from([
    0x50a28be6, 0x5c4dd124, 0x6d703ef3, 0x7a6d76e9, 0x00000000,
]);
// Called `f()` in the spec; valid `group` values are 0..4, and out-of-range
// inputs currently fall through to the group-4 branch.
function ripemd_f(group, x, y, z) {
    if (group === 0)
        return x ^ y ^ z;
    if (group === 1)
        return (x & y) | (~x & z);
    if (group === 2)
        return (x | ~y) ^ z;
    if (group === 3)
        return (x & z) | (y & ~z);
    return x ^ (y | ~z);
}
// Reusable 16-word RIPEMD-160 message block buffer.
const BUF_160 = /* @__PURE__ */ new Uint32Array(16);
/**
 * Internal RIPEMD-160 legacy hash class.
 * RFC 2286 only adds HMAC-RIPEMD160 material, not the core hash specification.
 */
export class _RIPEMD160 extends HashMD {
    h0 = 0x67452301 | 0;
    h1 = 0xefcdab89 | 0;
    h2 = 0x98badcfe | 0;
    h3 = 0x10325476 | 0;
    h4 = 0xc3d2e1f0 | 0;
    constructor() {
        super(64, 20, 8, true);
    }
    get() {
        const { h0, h1, h2, h3, h4 } = this;
        return [h0, h1, h2, h3, h4];
    }
    set(h0, h1, h2, h3, h4) {
        this.h0 = h0 | 0;
        this.h1 = h1 | 0;
        this.h2 = h2 | 0;
        this.h3 = h3 | 0;
        this.h4 = h4 | 0;
    }
    _cloneInto(to) {
        (to ||= new this.constructor()).set(...this.get());
        return this._cloneIntoMeta(to);
    }
    process(view, offset) {
        for (let i = 0; i < 16; i++, offset += 4)
            BUF_160[i] = view.getUint32(offset, true);
        // prettier-ignore
        let al = this.h0 | 0, ar = al, bl = this.h1 | 0, br = bl, cl = this.h2 | 0, cr = cl, dl = this.h3 | 0, dr = dl, el = this.h4 | 0, er = el;
        // Instead of iterating 0 to 80, we split it into 5 groups
        // And use the groups in constants, functions, etc. Much simpler
        for (let group = 0; group < 5; group++) {
            const rGroup = 4 - group;
            const hbl = Kl160[group], hbr = Kr160[group]; // prettier-ignore
            const rl = idxL[group], rr = idxR[group]; // prettier-ignore
            const sl = shiftsL160[group], sr = shiftsR160[group]; // prettier-ignore
            for (let i = 0; i < 16; i++) {
                const tl = (rotl(al + ripemd_f(group, bl, cl, dl) + BUF_160[rl[i]] + hbl, sl[i]) + el) | 0;
                al = el, el = dl, dl = rotl(cl, 10) | 0, cl = bl, bl = tl; // prettier-ignore
            }
            // 2 loops are 10% faster
            for (let i = 0; i < 16; i++) {
                const tr = (rotl(ar + ripemd_f(rGroup, br, cr, dr) + BUF_160[rr[i]] + hbr, sr[i]) + er) | 0;
                ar = er, er = dr, dr = rotl(cr, 10) | 0, cr = br, br = tr; // prettier-ignore
            }
        }
        // Add the compressed chunk to the current hash value
        // Final recombination cross-adds the left/right lane accumulators into the next h0..h4 order.
        this.set((this.h1 + cl + dr) | 0, (this.h2 + dl + er) | 0, (this.h3 + el + ar) | 0, (this.h4 + al + br) | 0, (this.h0 + bl + cr) | 0);
    }
    roundClean() {
        clean(BUF_160);
    }
    destroy() {
        this.destroyed = true;
        clean(this.buffer);
        this.set(0, 0, 0, 0, 0);
    }
}
/**
 * RIPEMD-160 - a legacy hash function from 1990s.
 * RFC 2286 only covers HMAC-RIPEMD160 test material; the links below point
 * at the base RIPEMD-160 references.
 * * {@link https://homes.esat.kuleuven.be/~bosselae/ripemd160.html}
 * * {@link https://homes.esat.kuleuven.be/~bosselae/ripemd160/pdf/AB-9601/AB-9601.pdf}
 * @param msg - message bytes to hash
 * @param opts - Reserved hash options.
 * @returns Digest bytes.
 * @example
 * Hash a message with RIPEMD-160.
 * ```ts
 * ripemd160(new Uint8Array([97, 98, 99]));
 * ```
 */
export const ripemd160 = /* @__PURE__ */ createHasher(() => new _RIPEMD160());
