/**
 * RFC 7914 Scrypt KDF. Can be used to create a key from password and salt.
 * @module
 */
import { pbkdf2 } from './pbkdf2.ts';
import { sha256 } from './sha2.ts';
// prettier-ignore
import {
  anumber, asyncLoop,
  checkOpts, clean,
  rotl,
  swap32IfBE,
  u32,
  type KDFInput,
  type TArg,
  type TRet
} from './utils.ts';

// The main Scrypt loop: uses Salsa extensively.
// Six versions of the function were tried, this is the fastest one.
// RFC 7914 §3 / §4 step 2 applies Salsa20/8 to one 16-word (64-byte) block
// after xor'ing two such blocks.
// The local `y*` snapshot keeps the xor input stable even when `out` aliases `prev` or `input`.
// prettier-ignore
function XorAndSalsa(
  prev: TArg<Uint32Array>,
  pi: number,
  input: TArg<Uint32Array>,
  ii: number,
  out: TArg<Uint32Array>,
  oi: number
) {
  // Based on https://cr.yp.to/salsa20.html and RFC 7914's Salsa20/8 core.
  // Xor blocks
  let y00 = prev[pi++] ^ input[ii++], y01 = prev[pi++] ^ input[ii++];
  let y02 = prev[pi++] ^ input[ii++], y03 = prev[pi++] ^ input[ii++];
  let y04 = prev[pi++] ^ input[ii++], y05 = prev[pi++] ^ input[ii++];
  let y06 = prev[pi++] ^ input[ii++], y07 = prev[pi++] ^ input[ii++];
  let y08 = prev[pi++] ^ input[ii++], y09 = prev[pi++] ^ input[ii++];
  let y10 = prev[pi++] ^ input[ii++], y11 = prev[pi++] ^ input[ii++];
  let y12 = prev[pi++] ^ input[ii++], y13 = prev[pi++] ^ input[ii++];
  let y14 = prev[pi++] ^ input[ii++], y15 = prev[pi++] ^ input[ii++];
  // Save state to temporary variables (salsa)
  let x00 = y00, x01 = y01, x02 = y02, x03 = y03,
      x04 = y04, x05 = y05, x06 = y06, x07 = y07,
      x08 = y08, x09 = y09, x10 = y10, x11 = y11,
      x12 = y12, x13 = y13, x14 = y14, x15 = y15;
  // Main loop (salsa)
  for (let i = 0; i < 8; i += 2) {
    x04 ^= rotl(x00 + x12 | 0,  7); x08 ^= rotl(x04 + x00 | 0,  9);
    x12 ^= rotl(x08 + x04 | 0, 13); x00 ^= rotl(x12 + x08 | 0, 18);
    x09 ^= rotl(x05 + x01 | 0,  7); x13 ^= rotl(x09 + x05 | 0,  9);
    x01 ^= rotl(x13 + x09 | 0, 13); x05 ^= rotl(x01 + x13 | 0, 18);
    x14 ^= rotl(x10 + x06 | 0,  7); x02 ^= rotl(x14 + x10 | 0,  9);
    x06 ^= rotl(x02 + x14 | 0, 13); x10 ^= rotl(x06 + x02 | 0, 18);
    x03 ^= rotl(x15 + x11 | 0,  7); x07 ^= rotl(x03 + x15 | 0,  9);
    x11 ^= rotl(x07 + x03 | 0, 13); x15 ^= rotl(x11 + x07 | 0, 18);
    x01 ^= rotl(x00 + x03 | 0,  7); x02 ^= rotl(x01 + x00 | 0,  9);
    x03 ^= rotl(x02 + x01 | 0, 13); x00 ^= rotl(x03 + x02 | 0, 18);
    x06 ^= rotl(x05 + x04 | 0,  7); x07 ^= rotl(x06 + x05 | 0,  9);
    x04 ^= rotl(x07 + x06 | 0, 13); x05 ^= rotl(x04 + x07 | 0, 18);
    x11 ^= rotl(x10 + x09 | 0,  7); x08 ^= rotl(x11 + x10 | 0,  9);
    x09 ^= rotl(x08 + x11 | 0, 13); x10 ^= rotl(x09 + x08 | 0, 18);
    x12 ^= rotl(x15 + x14 | 0,  7); x13 ^= rotl(x12 + x15 | 0,  9);
    x14 ^= rotl(x13 + x12 | 0, 13); x15 ^= rotl(x14 + x13 | 0, 18);
  }
  // Write output (salsa)
  out[oi++] = (y00 + x00) | 0; out[oi++] = (y01 + x01) | 0;
  out[oi++] = (y02 + x02) | 0; out[oi++] = (y03 + x03) | 0;
  out[oi++] = (y04 + x04) | 0; out[oi++] = (y05 + x05) | 0;
  out[oi++] = (y06 + x06) | 0; out[oi++] = (y07 + x07) | 0;
  out[oi++] = (y08 + x08) | 0; out[oi++] = (y09 + x09) | 0;
  out[oi++] = (y10 + x10) | 0; out[oi++] = (y11 + x11) | 0;
  out[oi++] = (y12 + x12) | 0; out[oi++] = (y13 + x13) | 0;
  out[oi++] = (y14 + x14) | 0; out[oi++] = (y15 + x15) | 0;
}

function BlockMix(
  input: TArg<Uint32Array>,
  ii: number,
  out: TArg<Uint32Array>,
  oi: number,
  r: number
) {
  // The block B is `r` 128-byte chunks, i.e. `2r` 16-word (64-byte) Salsa blocks.
  let head = oi + 0;
  let tail = oi + 16 * r;
  for (let i = 0; i < 16; i++) out[tail + i] = input[ii + (2 * r - 1) * 16 + i]; // X ← B[2r−1]
  for (let i = 0; i < r; i++, head += 16, ii += 16) {
    // RFC 7914 §4 step 3 outputs `Y[0], Y[2], ...` first, then `Y[1], Y[3], ...`;
    // `head` and `tail` lay out those even/odd halves in place.
    XorAndSalsa(out, tail, input, ii, out, head); // head[i] = Salsa(blockIn[2*i] ^ tail[i-1])
    if (i > 0) tail += 16; // First iteration overwrites tmp value in tail
    // tail[i] = Salsa(blockIn[2*i+1] ^ head[i])
    XorAndSalsa(out, head, input, (ii += 16), out, tail);
  }
}

// 128*r*(N+p+1) for N=2**20, r=8, p=1: 1 GiB main table plus 2 KiB workspace.
const SCRYPT_DEFAULT_MAXMEM = 128 * 8 * (2 ** 20 + 1 + 1);

/**
 * Scrypt options:
 * - `N` is cpu/mem work factor (power of 2 e.g. `2**18`)
 * - `r` is block size (8 is common), fine-tunes sequential memory read size and performance
 * - `p` is parallelization factor (1 is common)
 * - `dkLen` is output key length in bytes e.g. 32, and must be `>= 1` per RFC 7914 §2.
 * - `asyncTick` - (default: 10) max time in ms for which async function can block execution
 * - `maxmem` - (default: `1024 ** 3 + 2 * 1024` aka 1GiB+2KiB). A limit that the app
 *   could use for scrypt
 * - `onProgress` - callback function that would be executed for progress report
 */
export type ScryptOpts = {
  /** CPU and memory work factor. Must be a power of two. */
  N: number;
  /** Block size parameter. */
  r: number;
  /** Parallelization factor. */
  p: number;
  /** Desired derived key length in bytes, must be `>= 1` per RFC 7914 §2. */
  dkLen?: number;
  /** Max scheduler block time in milliseconds for the async variant. */
  asyncTick?: number;
  /** Maximum temporary memory budget in bytes. */
  maxmem?: number;
  /**
   * Optional progress callback invoked during long-running derivations.
   * @param progress - completion fraction in the `0..1` range
   * Should not throw; if it does, derivation is aborted and scrypt work
   * buffers are wiped before the error propagates.
   */
  onProgress?: (progress: number) => void;
};

// Common prologue and epilogue for sync/async functions
function scryptInit(password: TArg<KDFInput>, salt: TArg<KDFInput>, _opts?: ScryptOpts) {
  const opts = checkOpts(
    {
      dkLen: 32,
      asyncTick: 10,
      maxmem: SCRYPT_DEFAULT_MAXMEM,
    },
    _opts
  );
  const { N, r, p, dkLen, asyncTick, maxmem, onProgress } = opts;
  anumber(N, 'N');
  anumber(r, 'r');
  anumber(p, 'p');
  anumber(dkLen, 'dkLen');
  anumber(asyncTick, 'asyncTick');
  anumber(maxmem, 'maxmem');
  if (onProgress !== undefined && typeof onProgress !== 'function')
    throw new Error('"onProgress" must be a function');
  // Without this, r=0 slips through: blockSize=0 turns the `p` upper bound into
  // Infinity and the failure surfaces later as a confusing pbkdf2 dkLen error.
  if (r < 1) throw new Error('"r" expected integer >= 1');
  const blockSize = 128 * r;
  const blockSize32 = blockSize / 4;

  // Max N is 2^32 (Integrify is 32-bit).
  // Real limit can be 2^22: some JS engines limit Uint8Array to 4GB.
  // Spec check `N >= 2^(blockSize / 8)` is not done for compat with popular libs,
  // which used incorrect r: 1, p: 8. Also, the check seems to be a spec error:
  // https://www.rfc-editor.org/errata_search.php?rfc=7914
  const pow32 = Math.pow(2, 32);
  if (N <= 1 || (N & (N - 1)) !== 0 || N > pow32)
    throw new Error('"N" expected a power of 2, and 2^1 <= N <= 2^32');
  if (p < 1 || p > ((pow32 - 1) * 32) / blockSize)
    throw new Error('"p" expected integer 1..((2^32 - 1) * 32) / (128 * r)');
  // RFC 7914 §2 defines `dkLen` as a positive integer.
  if (dkLen < 1 || dkLen > (pow32 - 1) * 32)
    throw new Error('"dkLen" expected integer 1..(2^32 - 1) * 32');
  // Include the shared `tmp` scratch block so `maxmem` matches noble's actual temporary allocation.
  // Node requires more headroom here, so this accounting is intentionally noble-specific.
  const memUsed = blockSize * (N + p + 1);
  if (memUsed > maxmem)
    throw new Error(
      '"maxmem" limit was hit: memUsed(128*r*(N+p+1))=' + memUsed + ', maxmem=' + maxmem
    );
  // [B0...Bp−1] ← PBKDF2HMAC-SHA256(Passphrase, Salt, 1, blockSize*ParallelizationFactor)
  // Since it has only one iteration there is no reason to use async variant
  const B = pbkdf2(sha256, password, salt, { c: 1, dkLen: blockSize * p });
  const B32 = u32(B);
  // Re-used between parallel iterations. Array(iterations) of B
  const V = u32(new Uint8Array(blockSize * N));
  const tmp = u32(new Uint8Array(blockSize));
  let blockMixCb = () => {};
  if (onProgress) {
    const totalBlockMix = 2 * N * p;
    // Invoke callback if progress changes from 10.01 to 10.02
    // Allows to draw smooth progress bar on up to 8K screen
    const callbackPer = Math.max(Math.floor(totalBlockMix / 10000), 1);
    let blockMixCnt = 0;
    blockMixCb = () => {
      blockMixCnt++;
      if (onProgress && (!(blockMixCnt % callbackPer) || blockMixCnt === totalBlockMix)) {
        // Wiping here instead of a try/catch around the main loops keeps them
        // try-free: measured ~1% slower at N=2^21 with the loops inside a try.
        // onProgress is the only user code that can throw mid-derivation.
        try {
          onProgress(blockMixCnt / totalBlockMix);
        } catch (e) {
          clean(B, V, tmp);
          throw e;
        }
      }
    };
  }
  return { N, r, p, dkLen, blockSize32, V, B32, B, tmp, blockMixCb, asyncTick };
}

function scryptOutput(
  password: TArg<KDFInput>,
  dkLen: number,
  B: TArg<Uint8Array>,
  V: TArg<Uint32Array>,
  tmp: TArg<Uint32Array>
): TRet<Uint8Array> {
  // Shared final PBKDF2-and-cleanup step: keep the derived key, wipe the scrypt workspace.
  const res = pbkdf2(sha256, password, B, { c: 1, dkLen });
  clean(B, V, tmp);
  return res;
}

/**
 * Scrypt KDF from RFC 7914. See {@link ScryptOpts}.
 * @param password - password or key material to derive from;
 *   JS string inputs are UTF-8 encoded first
 * @param salt - unique salt bytes or string; JS string inputs are UTF-8 encoded first
 * @param opts - Scrypt cost and memory parameters. `dkLen`, if provided,
 *   must be `>= 1` per RFC 7914 §2. See {@link ScryptOpts}.
 * @returns Derived key bytes.
 * @throws If the Scrypt cost, memory, or callback options are invalid. {@link Error}
 * @example
 * Derive a key with scrypt.
 * ```ts
 * scrypt('password', 'salt', { N: 2**18, r: 8, p: 1, dkLen: 32 });
 * ```
 * @example
 * Derive a key with small demo costs and progress/memory controls.
 * ```ts
 * const progressLog: number[] = [];
 * scrypt('password', 'salt', {
 *   N: 16,
 *   r: 8,
 *   p: 1,
 *   dkLen: 32,
 *   maxmem: 1024 * 1024,
 *   asyncTick: 10,
 *   onProgress(progress) {
 *     progressLog.push(progress);
 *   },
 * });
 * ```
 */
export function scrypt(
  password: TArg<KDFInput>,
  salt: TArg<KDFInput>,
  opts: ScryptOpts
): TRet<Uint8Array> {
  const { N, r, p, dkLen, blockSize32, V, B32, B, tmp, blockMixCb } = scryptInit(
    password,
    salt,
    opts
  );
  swap32IfBE(B32);
  for (let pi = 0; pi < p; pi++) {
    const Pi = blockSize32 * pi;
    for (let i = 0; i < blockSize32; i++) V[i] = B32[Pi + i]; // V[0] = B[i]
    for (let i = 0, pos = 0; i < N - 1; i++) {
      BlockMix(V, pos, V, (pos += blockSize32), r); // V[i] = BlockMix(V[i-1]);
      blockMixCb();
    }
    BlockMix(V, (N - 1) * blockSize32, B32, Pi, r); // Process last element
    blockMixCb();
    for (let i = 0; i < N; i++) {
      // First u32 of the last 64-byte block (u32 is LE)
      // RFC 7914 Integerify(X) uses the whole last 64-byte block, but mod N
      // only depends on the low word here because N is a power of two and
      // this implementation caps N at 2^32.
      // & (N - 1) is % N as N is a power of 2, N & (N - 1) = 0 is checked
      // above; >>> 0 for unsigned, input fits in u32.
      const j = (B32[Pi + blockSize32 - 16] & (N - 1)) >>> 0; // j = Integrify(X) % iterations
      // tmp = B ^ V[j]
      for (let k = 0; k < blockSize32; k++) tmp[k] = B32[Pi + k] ^ V[j * blockSize32 + k];
      BlockMix(tmp, 0, B32, Pi, r); // B = BlockMix(B ^ V[j])
      blockMixCb();
    }
  }
  swap32IfBE(B32);
  return scryptOutput(password, dkLen, B, V, tmp);
}

/**
 * Scrypt KDF from RFC 7914. Async version. See {@link ScryptOpts}.
 * @param password - password or key material to derive from;
 *   JS string inputs are UTF-8 encoded first
 * @param salt - unique salt bytes or string; JS string inputs are UTF-8 encoded first
 * @param opts - Scrypt cost and memory parameters. `dkLen`, if provided,
 *   must be `>= 1` per RFC 7914 §2. `asyncTick` is only a local
 *   scheduler-yield control for this JS wrapper, not part of RFC 7914.
 *   See {@link ScryptOpts}.
 * @returns Promise resolving to derived key bytes.
 * @throws If the Scrypt cost, memory, or callback options are invalid. {@link Error}
 * @example
 * Derive a key with scrypt asynchronously.
 * ```ts
 * await scryptAsync('password', 'salt', { N: 2**18, r: 8, p: 1, dkLen: 32 });
 * ```
 * @example
 * Derive a key asynchronously with small demo costs and progress/memory controls.
 * ```ts
 * await scryptAsync('password', 'salt', {
 *   N: 16,
 *   r: 8,
 *   p: 1,
 *   dkLen: 32,
 *   maxmem: 1024 * 1024,
 *   asyncTick: 1,
 *   onProgress(progress) {
 *     if (progress > 1) throw new Error('invalid progress');
 *   },
 * });
 * ```
 */
export async function scryptAsync(
  password: TArg<KDFInput>,
  salt: TArg<KDFInput>,
  opts: ScryptOpts
): Promise<TRet<Uint8Array>> {
  const { N, r, p, dkLen, blockSize32, V, B32, B, tmp, blockMixCb, asyncTick } = scryptInit(
    password,
    salt,
    opts
  );
  // One failure handler covers both yield boundaries without putting the hot loops in a try block.
  const abort = () => clean(B, V, tmp);
  swap32IfBE(B32);
  for (let pi = 0; pi < p; pi++) {
    const Pi = blockSize32 * pi;
    for (let i = 0; i < blockSize32; i++) V[i] = B32[Pi + i]; // V[0] = B[i]
    let pos = 0;
    await asyncLoop(
      N - 1,
      asyncTick,
      () => {
        BlockMix(V, pos, V, (pos += blockSize32), r); // V[i] = BlockMix(V[i-1]);
        blockMixCb();
      },
      abort
    );
    BlockMix(V, (N - 1) * blockSize32, B32, Pi, r); // Process last element
    blockMixCb();
    await asyncLoop(
      N,
      asyncTick,
      () => {
        // First u32 of the last 64-byte block (u32 is LE)
        // RFC 7914 Integerify(X) uses the whole last 64-byte block, but mod N
        // only depends on the low word here because N is a power of two and
        // this implementation caps N at 2^32.
        // & (N - 1) is % N as N is a power of 2, N & (N - 1) = 0 is checked
        // above; >>> 0 for unsigned, input fits in u32.
        const j = (B32[Pi + blockSize32 - 16] & (N - 1)) >>> 0; // j = Integrify(X) % iterations
        // tmp = B ^ V[j]
        for (let k = 0; k < blockSize32; k++) tmp[k] = B32[Pi + k] ^ V[j * blockSize32 + k];
        BlockMix(tmp, 0, B32, Pi, r); // B = BlockMix(B ^ V[j])
        blockMixCb();
      },
      abort
    );
  }
  swap32IfBE(B32);
  return scryptOutput(password, dkLen, B, V, tmp);
}
