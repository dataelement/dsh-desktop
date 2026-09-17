/**
 * PBKDF (RFC 2898). Can be used to create a key from password and salt.
 * @module
 */
import { hmac } from "./hmac.js";
// prettier-ignore
import { ahash, anumber, asyncLoop, checkOpts, clean, createView, kdfInputToBytes } from "./utils.js";
// Common validation and per-call state setup for sync/async functions.
function pbkdf2Init(hash, _password, _salt, _opts) {
    ahash(hash);
    const opts = checkOpts({ dkLen: 32, asyncTick: 10 }, _opts);
    const { c, dkLen, asyncTick } = opts;
    anumber(c, 'c');
    anumber(dkLen, 'dkLen');
    anumber(asyncTick, 'asyncTick');
    if (c < 1)
        throw new Error('"c" (iterations) must be >= 1');
    // RFC 8018 §5.2 defines `dkLen` as "a positive integer".
    if (dkLen < 1)
        throw new Error('"dkLen" must be >= 1');
    // RFC 8018 §5.2 step 1 requires rejecting oversize `dkLen`
    // before allocating the destination buffer.
    if (dkLen > (2 ** 32 - 1) * hash.outputLen)
        throw new Error('derived key too long');
    const p = kdfInputToBytes(_password, 'password');
    try {
        const s = kdfInputToBytes(_salt, 'salt');
        try {
            // DK = PBKDF2(PRF, Password, Salt, c, dkLen);
            const DK = new Uint8Array(dkLen);
            const { iHash, oHash, outputLen } = hmac.create(hash, p);
            // Drive keyed hashes directly; the wrapper is only needed to initialize their HMAC midstates.
            const u = new Uint8Array(outputLen);
            const eng = pbkdf2Engine(iHash, oHash, s, u);
            return { c, dkLen, asyncTick, DK, outputLen, eng };
        }
        finally {
            // Uint8Array inputs belong to the caller; only wipe our UTF-8 conversion.
            if (typeof _salt === 'string')
                clean(s);
        }
    }
    finally {
        if (typeof _password === 'string')
            clean(p);
    }
}
// Per-call PRF driver writes U1 into both `u` and `Ti`, then later digests into `u`;
// shared by the sync and async variants.
function pbkdf2Engine(iHash, oHash, salt, u) {
    const counter = new Uint8Array(4);
    const view = createView(counter);
    // Full clones retain tree/config state; absorb salt before async yields without cloning input.
    const salted = iHash._cloneInto().update(salt);
    // u1() overwrites the worker before reading it. Seed from the outer midstate so a long salt
    // cannot pre-populate a tree stack that the first reset would abandon without wiping.
    const work = oHash._cloneInto();
    const iClone = iHash._cloneInto; // Capture before mixed feedback can materialize state tuples.
    const oClone = oHash._cloneInto;
    return {
        u1: (ti, Ti) => {
            view.setInt32(0, ti, false);
            salted._cloneInto(work).update(counter).digestInto(u);
            oHash._cloneInto(work).update(u).digestInto(u);
            Ti.set(u.subarray(0, Ti.length));
        },
        // Whole `F` inner loop for the sync variant: one optimized function owns the hot loop.
        rounds: (c, Ti) => {
            for (let ui = 1; ui < c; ui++) {
                iClone.call(iHash, work).update(u).digestInto(u);
                oClone.call(oHash, work).update(u).digestInto(u);
                for (let i = 0; i < Ti.length; i++)
                    Ti[i] ^= u[i];
            }
        },
        output: (DK) => {
            // Keyed templates and derived worker states are secret material.
            iHash.destroy();
            oHash.destroy();
            salted.destroy();
            work.destroy();
            // Shared sync/async cleanup point: wipe transient PRF state
            // while preserving the derived key buffer.
            clean(u);
            return DK;
        },
    };
}
/**
 * PBKDF2-HMAC: RFC 8018 key derivation function.
 * @param hash - hash function that would be used e.g. sha256
 * @param password - password from which a derived key is generated;
 *   JS string inputs are UTF-8 encoded first
 * @param salt - cryptographic salt; JS string inputs are UTF-8 encoded first
 * @param opts - PBKDF2 work factor and output settings. `dkLen`, if provided,
 *   must be `>= 1` per RFC 8018 §5.2. See {@link Pbkdf2Opt}.
 * @returns Derived key bytes.
 * @throws If the PBKDF2 iteration count or derived-key settings are invalid. {@link Error}
 * @example
 * PBKDF2-HMAC: RFC 2898 key derivation function.
 * ```ts
 * import { pbkdf2 } from '@noble/hashes/pbkdf2.js';
 * import { sha256 } from '@noble/hashes/sha2.js';
 * const key = pbkdf2(sha256, 'password', 'salt', { dkLen: 32, c: Math.pow(2, 18) });
 * ```
 */
export function pbkdf2(hash, password, salt, opts) {
    const { c, dkLen, DK, outputLen, eng } = pbkdf2Init(hash, password, salt, opts);
    // DK = T1 + T2 + ⋯ + Tdklen/hlen
    for (let ti = 1, pos = 0; pos < dkLen; ti++, pos += outputLen) {
        // Ti = F(Password, Salt, c, i)
        // The last Ti view can be shorter than hLen, which applies
        // RFC 8018 §5.2 step 4's T_l<0..r-1> truncation without extra copies.
        const Ti = DK.subarray(pos, pos + outputLen);
        // F(Password, Salt, c, i) = U1 ^ U2 ^ ⋯ ^ Uc
        // U1 = PRF(Password, Salt + INT_32_BE(i))
        eng.u1(ti, Ti);
        // Uc = PRF(Password, Uc−1); Ti ^= Uc
        eng.rounds(c, Ti);
    }
    return eng.output(DK);
}
/**
 * PBKDF2-HMAC: RFC 8018 key derivation function. Async version.
 * @param hash - hash function that would be used e.g. sha256
 * @param password - password from which a derived key is generated;
 *   JS string inputs are UTF-8 encoded first
 * @param salt - cryptographic salt; JS string inputs are UTF-8 encoded first
 * @param opts - PBKDF2 work factor and output settings. `dkLen`, if provided,
 *   must be `>= 1` per RFC 8018 §5.2. `asyncTick` is only a local
 *   scheduler-yield knob for this JS wrapper, not part of RFC 8018.
 *   See {@link Pbkdf2Opt}.
 * @returns Promise resolving to derived key bytes.
 * @throws If the PBKDF2 iteration count or derived-key settings are invalid. {@link Error}
 * @example
 * PBKDF2-HMAC: RFC 2898 key derivation function.
 * ```ts
 * import { pbkdf2Async } from '@noble/hashes/pbkdf2.js';
 * import { sha256 } from '@noble/hashes/sha2.js';
 * const key = await pbkdf2Async(sha256, 'password', 'salt', { dkLen: 32, c: 500_000 });
 * ```
 * @example
 * Tune the async PBKDF2 scheduler for short UI tasks.
 * ```ts
 * import { pbkdf2Async } from '@noble/hashes/pbkdf2.js';
 * import { sha256 } from '@noble/hashes/sha2.js';
 * const key = await pbkdf2Async(sha256, 'password', 'salt', {
 *   dkLen: 32,
 *   c: 32,
 *   asyncTick: 1,
 * });
 * ```
 */
export async function pbkdf2Async(hash, password, salt, opts) {
    const { c, dkLen, asyncTick, DK, outputLen, eng } = pbkdf2Init(hash, password, salt, opts);
    // Reuse normal state destruction, then wipe the incomplete output if a host yield aborts.
    const abort = () => {
        eng.output(DK);
        clean(DK);
    };
    // DK = T1 + T2 + ⋯ + Tdklen/hlen
    for (let ti = 1, pos = 0; pos < dkLen; ti++, pos += outputLen) {
        // Ti = F(Password, Salt, c, i)
        // The last Ti view can be shorter than hLen, which applies
        // RFC 8018 §5.2 step 4's T_l<0..r-1> truncation without extra copies.
        const Ti = DK.subarray(pos, pos + outputLen);
        // F(Password, Salt, c, i) = U1 ^ U2 ^ ⋯ ^ Uc
        // U1 = PRF(Password, Salt + INT_32_BE(i))
        eng.u1(ti, Ti);
        await asyncLoop(c - 1, asyncTick, () => {
            // Uc = PRF(Password, Uc−1)
            eng.rounds(2, Ti); // c=2 runs exactly one PRF iteration per callback.
        }, abort);
    }
    return eng.output(DK);
}
