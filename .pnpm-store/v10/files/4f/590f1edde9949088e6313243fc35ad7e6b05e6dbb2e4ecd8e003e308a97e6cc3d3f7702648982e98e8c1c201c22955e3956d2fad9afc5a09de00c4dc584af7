import { NtExecutable } from 'pe-library';
import SignerObject, { DigestAlgorithmType, EncryptionAlgorithmType } from './SignerObject.js';
/**
 * Generates the executable binary data with signed info.
 * This function is like an extension of `generate` method of `NtExecutable`.
 * @param executable a valid instance of `NtExecutable`
 * @param signer user-defined `SignerObject` instance for signing
 * @param alignment alignment value for placing certificate data
 *     (using `executable.getFileAlignment()` if omitted)
 * @return Promise-like (Thenable) object which will resolve with generated executable binary
 */
export declare function generateExecutableWithSign(executable: NtExecutable, signer: SignerObject, alignment?: number): PromiseLike<ArrayBuffer>;
export { SignerObject, DigestAlgorithmType, EncryptionAlgorithmType };
