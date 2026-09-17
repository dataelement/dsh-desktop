/**
 * Decrypt `data` using RC2-CBC with PKCS#7 padding removal (RFC 2268).
 *
 * Used for pbeWithSHAAnd40BitRC2CBC  (OID 1.2.840.113549.1.12.1.6) and
 *          pbeWithSHAAnd128BitRC2CBC (OID 1.2.840.113549.1.12.1.5).
 *
 * These OIDs are commonly used to encrypt certificate bags in PKCS#12
 * files produced by OpenSSL and Windows with default settings. Node.js 22+
 * (OpenSSL 3 default provider) does not support RC2 via `createDecipheriv`.
 */
declare function rc2CbcDecrypt(key: Buffer, iv: Buffer, data: Buffer, effectiveBits: number): Buffer;
/**
 * PKCS#12 key/IV derivation function from RFC 7292 Appendix B (SHA-1 variant).
 * id = 1 to derive a key, id = 2 to derive an IV.
 *
 * Throws if `iterations` is outside [1, MAX_PKCS12_PBE_ITERATIONS] to prevent
 * CPU exhaustion from a crafted PFX file.
 */
declare function pkcs12PbeDeriveKey(password: Buffer, salt: Buffer, iterations: number, id: number, length: number): Buffer;
/**
 * Encode a password as UTF-16 Big Endian with a null terminator, which is the
 * format required by PKCS#12 PBE key derivation (RFC 7292).
 * An empty string yields [0x00, 0x00] (just the null terminator).
 */
declare function pkcs12PasswordToUtf16(password: string): Buffer;
/**
 * Reads certificate info from a PKCS#12 (.pfx) file using pkijs (unobfuscated TypeScript).
 * Mirrors the `certificate-info` subcommand of app-builder-bin.
 * https://github.com/develar/app-builder/blob/master/pkg/codesign/p12.go
 *
 * Returns { commonName, bloodyMicrosoftSubjectDn } on success.
 *
 * Known divergences from the Go binary:
 * - No OpenSSL fallback when the pure PKCS#12 decoder fails for a non-password reason.
 * - Unknown OIDs are rendered using the raw numeric OID as the type name (e.g. `2.5.4.100=value`); Go uses `OID=#hexbytes` when ASN.1 marshal succeeds.
 * - RDN ordering uses DER order; Go normalizes via pkix.Name.ToRDNSequence then reverses via
 *   BloodyMsString. These coincide for pkijs-generated certs (CN-first DER) but may
 *   differ for real CA-issued certs stored in traditional C-first DER order.
 */
export declare function readCertInfo(file: string, password: string): Promise<{
    commonName: string;
    bloodyMicrosoftSubjectDn: string;
}>;
/**
 * Internal functions exported exclusively for unit testing.
 * Not part of the public API — do not use outside of test files.
 */
export declare const _testingOnly: {
    pkcs12PbeDeriveKey: typeof pkcs12PbeDeriveKey;
    pkcs12PasswordToUtf16: typeof pkcs12PasswordToUtf16;
    rc2CbcDecrypt: typeof rc2CbcDecrypt;
    MAX_PKCS12_PBE_ITERATIONS: number;
};
export {};
