/**
 * HMAC: RFC2104 message authentication code.
 * @module
 */
import { type CHash, type Hash, type TArg, type TRet } from './utils.ts';
/**
 * Internal class for HMAC.
 * Accepts any byte key, although RFC 2104 §3 recommends keys at least
 * `HashLen` bytes long.
 */
export declare class _HMAC<T extends Hash<T>> implements Hash<_HMAC<T>> {
    oHash: T;
    iHash: T;
    blockLen: number;
    outputLen: number;
    canXOF: boolean;
    private finished;
    private destroyed;
    constructor(hash: TArg<CHash>, key: TArg<Uint8Array>);
    update(buf: TArg<Uint8Array>): this;
    digestInto(out: TArg<Uint8Array>): void;
    digest(): TRet<Uint8Array>;
    _cloneInto(to?: _HMAC<T>): _HMAC<T>;
    clone(): _HMAC<T>;
    destroy(): void;
}
/**
 * HMAC: RFC2104 message authentication code.
 * @param hash - function that would be used e.g. sha256
 * @param key - authentication key bytes
 * @param message - message bytes to authenticate
 * @returns Authentication tag bytes.
 * @example
 * Compute an RFC 2104 HMAC directly and with an incremental state.
 * ```ts
 * import { hmac } from '@noble/hashes/hmac.js';
 * import { sha256 } from '@noble/hashes/sha2.js';
 * const key = new Uint8Array([1, 2, 3]);
 * const message = new Uint8Array([4, 5, 6]);
 * const mac = hmac(sha256, key, message);
 * const out = new Uint8Array(sha256.outputLen);
 * hmac.create(sha256, key).update(message).digestInto(out);
 * ```
 */
type HmacFn = {
    (hash: TArg<CHash>, key: TArg<Uint8Array>, message: TArg<Uint8Array>): TRet<Uint8Array>;
    create(hash: TArg<CHash>, key: TArg<Uint8Array>): TRet<_HMAC<any>>;
};
export declare const hmac: TRet<HmacFn>;
export {};
