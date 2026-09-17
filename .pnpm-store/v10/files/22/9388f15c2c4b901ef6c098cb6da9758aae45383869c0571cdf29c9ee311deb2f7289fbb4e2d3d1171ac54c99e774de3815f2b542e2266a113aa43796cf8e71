# noble-hashes

Audited & minimal JS implementation of hash functions, MACs and KDFs.

- 🔒 [**Audited**](#security) by an independent security firm
- 🪶 Minimal: 2.8KB (gzipped) sha256, unused code is excluded from your builds
- 🏎 Fast: hand-optimized for caveats of JS engines
- 🔍 Reliable: chained / ACVP tests ensure correctness
- 🔁 No unrolled loops: makes it easier to verify and reduces source code size up to 5x
- 🦘 Includes SHA, RIPEMD, BLAKE, HMAC, HKDF, PBKDF, Scrypt, Argon2
- 🥈 Wrapper with identical API over native WebCrypto

The library's initial development was funded by [Ethereum Foundation](https://ethereum.org/).

### This library belongs to _noble_ cryptography

> **noble cryptography** — high-security, easily auditable set of contained cryptographic libraries and tools.

- Zero or minimal dependencies
- Highly readable TypeScript / JS code
- PGP-signed releases and transparent NPM builds
- All libraries:
  [ciphers](https://github.com/paulmillr/noble-ciphers),
  [curves](https://github.com/paulmillr/noble-curves),
  [hashes](https://github.com/paulmillr/noble-hashes),
  [post-quantum](https://github.com/paulmillr/noble-post-quantum),
  5kb [secp256k1](https://github.com/paulmillr/noble-secp256k1) /
  [ed25519](https://github.com/paulmillr/noble-ed25519)
- WASM version: [awasm-noble](https://github.com/paulmillr/awasm-noble)
- [Check out the homepage](https://paulmillr.com/noble/)
  for reading resources, documentation, and apps built with noble

## Usage

> `npm install @noble/hashes`

> `deno add jsr:@noble/hashes`

We support all major platforms and runtimes.
For React Native, you may need a [polyfill for getRandomValues](https://github.com/LinusU/react-native-get-random-values).
A standalone file [noble-hashes.js](https://github.com/paulmillr/noble-hashes/releases) is also available.

```js
// import * from '@noble/hashes'; // Error: use sub-imports, to ensure small app size
import { sha256 } from '@noble/hashes/sha2.js';
const hash = sha256(Uint8Array.from([0xca, 0xfe, 0x01, 0x23]));
```

- [sha2: sha256, sha384, sha512](#sha2-sha256-sha384-sha512-and-others)
- [sha3: FIPS, SHAKE, Keccak](#sha3-fips-shake-keccak)
- [sha3-addons: cSHAKE, KMAC, KT128, TurboSHAKE](#sha3-addons-cshake-kmac-kt128-turboshake)
- [blake1, blake2, blake3](#blake1-blake2-blake3)
- [legacy: sha1, md5, ripemd160](#legacy-sha1-md5-ripemd160)
- MACs: [hmac](#hmac) | [kmac](#sha3-addons-cshake-kmac-kt128-turboshake) | [blake3 key mode](#blake1-blake2-blake3)
- KDFs: [hkdf](#hkdf) | [pbkdf2](#pbkdf2) | [scrypt](#scrypt) | [argon2](#argon2) | [eskdf](#eskdf)
- [webcrypto: friendly wrapper](#webcrypto-friendly-wrapper)
- [utils](#utils)
- [Security](#security) | [Speed](#speed) | [Contributing & testing](#contributing--testing) | [License](#license)

### Implementations

Hash functions:

- `sha256()`: receive & return `Uint8Array`
- `sha256.create().update(a).update(b).digest()`: support partial updates
- `blake3.create({ context: 'e', dkLen: 32 })`: can have options
- support little-endian architecture; also experimentally big-endian
- can hash up to 4GB per chunk, with any amount of chunks

#### sha2: sha256, sha384, sha512 and others

```typescript
import { sha224, sha256, sha384, sha512, sha512_224, sha512_256 } from '@noble/hashes/sha2.js';
const res = sha256(Uint8Array.from([0xbc]));
```


#### sha3: FIPS, SHAKE, Keccak

```typescript
import {
  sha3_224, sha3_256, sha3_384, sha3_512,
  keccak_224, keccak_256, keccak_384, keccak_512,
  shake128, shake256,
} from '@noble/hashes/sha3.js';
const s = sha3_256(Uint8Array.from([0x10, 0x20, 0x30]));
const shka = shake128(Uint8Array.from([0x10]), { dkLen: 512 });
const shkb = shake256(Uint8Array.from([0x30]), { dkLen: 512 });
```

#### sha3-addons: cSHAKE, KMAC, KT128, TurboSHAKE

```typescript
import {
  cshake128, cshake256, kt128, kt256,
  keccakprg, kmac128, kmac256,
  parallelhash256, tuplehash256,
  turboshake128, turboshake256,
} from '@noble/hashes/sha3-addons.js';
const data = Uint8Array.from([0x10, 0x20, 0x30]);
const ec = cshake128(data, { personalization: new TextEncoder().encode('def') });
const et = turboshake256(data, { D: 0x05 });
// tuplehash(['ab', 'c']) !== tuplehash(['a', 'bc']) !== tuplehash([data])
const eu = tuplehash256([new TextEncoder().encode('ab'), new TextEncoder().encode('c')]);
// Not parallel in JS (similar to blake3 / kt128), added for compat
const ep = parallelhash256(data, { blockLen: 8 });
const ek = kmac256(Uint8Array.from([0xca]), data);
const ekt = kt128(data);
const p = keccakprg(254);
p.addEntropy();
const rand1b = p.randomBytes(32);
```

#### blake1, blake2, blake3

```typescript
import { blake224, blake256, blake384, blake512 } from '@noble/hashes/blake1.js';
import { blake2b, blake2s } from '@noble/hashes/blake2.js';
import { blake3 } from '@noble/hashes/blake3.js';
const ab = Uint8Array.from([0x01]);
blake256(ab);

// blake2 advanced usage
const txt = new TextEncoder();
blake2s(ab, { key: new Uint8Array(32) }); // blake2b keys can be 64 bytes
blake2s(ab, { personalization: txt.encode('pers1234') }); // 16 bytes for blake2b
blake2s(ab, { salt: txt.encode('salt1234') }); // 16 bytes for blake2b

// blake3 advanced usage
blake3(ab, { dkLen: 256 });
blake3(ab, { key: new Uint8Array(32) });
blake3(ab, { context: txt.encode('application-name') });
```

#### legacy: sha1, md5, ripemd160

```typescript
import { md5, ripemd160, sha1 } from '@noble/hashes/legacy.js';
const h = sha1(Uint8Array.from([0x10, 0x20, 0x30]));
```

#### hmac

```typescript
import { hmac } from '@noble/hashes/hmac.js';
import { sha256 } from '@noble/hashes/sha2.js';
const key = new Uint8Array(32).fill(1);
const msg = new Uint8Array(32).fill(2);
const mac1 = hmac(sha256, key, msg);
const mac2 = hmac.create(sha256, key).update(msg).digest();
```

#### hkdf

```typescript
import { hkdf } from '@noble/hashes/hkdf.js';
import { randomBytes } from '@noble/hashes/utils.js';
import { sha256 } from '@noble/hashes/sha2.js';
const inputKey = randomBytes(32);
const salt = randomBytes(32);
const info = new TextEncoder().encode('application-key');
const hk1 = hkdf(sha256, inputKey, salt, info, 32);

// == same as
import { extract, expand } from '@noble/hashes/hkdf.js';
const prk = extract(sha256, inputKey, salt);
const hk2 = expand(sha256, prk, info, 32);
```

#### pbkdf2

```typescript
import { pbkdf2, pbkdf2Async } from '@noble/hashes/pbkdf2.js';
import { sha256 } from '@noble/hashes/sha2.js';
const pbkey1 = pbkdf2(sha256, 'password', 'salt', { c: 524288, dkLen: 32 });
const pbkey2 = await pbkdf2Async(sha256, 'password', 'salt', { c: 524288, dkLen: 32 });
const pbkey3 = await pbkdf2Async(sha256, Uint8Array.from([1, 2, 3]), Uint8Array.from([4, 5, 6]), {
  c: 524288,
  dkLen: 32,
});
```

#### scrypt

```typescript
import { scrypt, scryptAsync } from '@noble/hashes/scrypt.js';
const scr1 = scrypt('password', 'salt', { N: 2 ** 16, r: 8, p: 1, dkLen: 32 });
const scr2 = await scryptAsync('password', 'salt', { N: 2 ** 16, r: 8, p: 1, dkLen: 32 });
const scr3 = await scryptAsync(Uint8Array.from([1, 2, 3]), Uint8Array.from([4, 5, 6]), {
  N: 2 ** 17,
  r: 8,
  p: 1,
  dkLen: 32,
  onProgress(percentage) {
    console.log('progress', percentage);
  },
  // maxmem: 128 * 8 * (2 ** 17 + 1 + 1), // 128 * r * (N + p + 1)
});
```

- `N, r, p` are work factors. It is common to only adjust N, while keeping `r: 8, p: 1`.
  See [the blog post](https://blog.filippo.io/the-scrypt-parameters/).
  JS doesn't support parallelization, making increasing `p` meaningless.
- `dkLen` is the length of output bytes e.g. `32` or `64`
- `onProgress` can be used with async version of the function to report progress to a user.
- `maxmem` prevents DoS and defaults to `1GiB + 2KiB` (`2**30 + 2**11`), enough for `N: 2**20, r: 8, p: 1`. It can be adjusted using formula: `128 * r * (N + p + 1)`

On Apple M4, `N: 2**16` takes 0.1s and 64MB RAM; each increment of N doubles both,
up to `N: 2**24` at 27s and 16GB. Mobile phones can be 1x-4x slower.

> [!NOTE]
> We support N larger than `2**20` where available, however,
> not all JS engines support >= 2GB ArrayBuffer-s.
> When using such N, you'll need to manually adjust `maxmem`, using formula above.
> Other JS implementations don't support large N-s.

#### argon2

```ts
import { argon2d, argon2i, argon2id } from '@noble/hashes/argon2.js';
// Defaults to t=3, m=1GiB (specified in KiB), p=1, and a 1GiB maxmem limit.
const arg1 = argon2id('password', 'saltsalt');
```

> [!WARNING]
> Argon2 can't be fast in JS, because there is no fast Uint64Array.
> It is suggested to use [Scrypt](#scrypt) instead.
> Being 5x slower than native code means brute-forcing attackers have bigger advantage.

#### eskdf

```ts
import { eskdf } from '@noble/hashes/eskdf.js';
const kdf = await eskdf('example-university', 'beginning-new-example');
console.log(kdf.fingerprint);
const key = kdf.deriveChildKey('aes', 0);
kdf.expire();
```

Experimental KDF for deriving application-specific child keys from a username + password pair,
built on scrypt, pbkdf2 and hkdf with fixed work factors.
Non-standard: prefer [scrypt](#scrypt) or [argon2](#argon2) for new designs.

#### webcrypto: friendly wrapper

```js
import { sha256, sha384, sha512, hmac, hkdf, pbkdf2 } from '@noble/hashes/webcrypto.js';
import { randomBytes } from '@noble/hashes/utils.js';
const whash = await sha256(Uint8Array.from([0xca, 0xfe, 0x01, 0x23]));

const key = new Uint8Array(32).fill(1);
const msg = new Uint8Array(32).fill(2);
const wmac = await hmac(sha256, key, msg);

const inputKey = randomBytes(32);
const salt = randomBytes(32);
const info = new TextEncoder().encode('application-key');
const hk1 = await hkdf(sha256, inputKey, salt, info, 32);

const pbkey1 = await pbkdf2(sha256, 'password', 'salt', { c: 524288, dkLen: 32 });
```

A thin wrapper over built-in `crypto.subtle`, mirroring the noble-hashes API and validating
inputs, in just 30+ lines of code. Webcrypto methods are always async.

#### utils

```typescript
import { bytesToHex as toHex, randomBytes } from '@noble/hashes/utils.js';
console.log(toHex(randomBytes(32)));
```

- `bytesToHex` will convert `Uint8Array` to a hex string
- `randomBytes(bytes)` will produce cryptographically secure random `Uint8Array` of length `bytes`

### Specs

- SHA2: [RFC 6234](https://datatracker.ietf.org/doc/html/rfc6234)
- SHA2-512/256: [pdf](https://eprint.iacr.org/2010/548.pdf)
- SHA3: [FIPS-202](https://nvlpubs.nist.gov/nistpubs/FIPS/NIST.FIPS.202.pdf)
- SHA3-addons: [NIST SP 800-185](https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-185.pdf)
- SHA3-addons KT128 (KangarooTwelve 🦘, K12) / TurboSHAKE: [RFC 9861](https://datatracker.ietf.org/doc/rfc9861/)
- BLAKE1: [pdf](https://www.aumasson.jp/blake/blake.pdf)
- BLAKE2: [RFC 7693](https://datatracker.ietf.org/doc/html/rfc7693)
- BLAKE3: [site](https://blake3.io)
- SHA1: [RFC 3174](https://datatracker.ietf.org/doc/html/rfc3174)
- MD5: [RFC 1321](https://datatracker.ietf.org/doc/html/rfc1321)
- RIPEMD160 (ISO/IEC 10118-3)
- HMAC: [RFC 2104](https://datatracker.ietf.org/doc/html/rfc2104)
- HKDF: [RFC 5869](https://datatracker.ietf.org/doc/html/rfc5869)
- PBKDF2: [RFC 8018](https://datatracker.ietf.org/doc/html/rfc8018)
- Scrypt: [RFC 7914](https://datatracker.ietf.org/doc/html/rfc7914)
- Argon2: [RFC 9106](https://datatracker.ietf.org/doc/html/rfc9106)

## Security

The library has been audited:

- at version 1.0.0, in Jan 2022, independently, by [Cure53](https://cure53.de)
  - PDFs: [website](https://cure53.de/pentest-report_hashing-libs.pdf), [in-repo](./audit/2022-01-05-cure53-audit-nbl2.pdf)
  - Scope: everything, besides `blake3`, `sha3-addons`, `sha1` and `argon2`, which have not been audited
  - The audit has been funded by [Ethereum Foundation](https://ethereum.org/en/) with help of [Nomic Labs](https://nomiclabs.io)

We've started regular AI-assisted self-audits in Apr 2026.

It is tested against official (ACVP / KAT) vectors, cross-library chained hashing,
sliding-window length sweeps and property-based tests (fast-check),
and is being fuzzed in CI.

If you see anything unusual: investigate and report.

### Constant-timeness

We're targetting algorithmic constant time. _JIT-compiler_ and _Garbage Collector_ make "constant time"
extremely hard to achieve [timing attack](https://en.wikipedia.org/wiki/Timing_attack) resistance
in a scripting language. Which means _any other JS library can't have
constant-timeness_. Even statically typed Rust, a language without GC,
[makes it harder to achieve constant-time](https://www.chosenplaintext.ca/open-source/rust-timing-shield/security)
for some cases. If your goal is absolute security, don't use any JS lib — including bindings to native ones.
Use low-level libraries & languages.

### Memory dumping

The library shares state buffers between hash function calls. Library-owned working buffers are
zeroed after use, including mutable UTF-8 copies created from password-KDF string inputs.
However, if an attacker can read application memory, you are doomed in any case:

- JS strings are immutable and can't be overwritten with zeros — e.g. a password passed
  to `scrypt(password, salt)` as a string stays in memory
- Inputs & outputs are re-used across the application and stay in file buffers / memory anyway
- `await anything()` writes all internal variables (including numbers) to memory, with no
  guarantee of when they get overwritten — plenty of time for an attacker to read them

### Supply chain security

- **Commits** are signed with PGP keys to prevent forgery. Be sure to verify the commit signatures
- **Releases** are made transparently through token-less GitHub CI and Trusted Publishing. Be sure to verify the [provenance logs](https://docs.npmjs.com/generating-provenance-statements) for authenticity.
- **Rare releasing** is practiced to minimize the need for re-audits by end-users.
- **Dependencies** are minimized, strictly pinned, and changes are checked with npm-diff.
- **Dev dependencies** are excluded from end-user installs; they’re only used for development and build steps.

For this package, there are 0 dependencies; and a few dev dependencies:

- jsbt contains helpers for building, benchmarking & testing secure JS apps. It is developed by the same author
- prettier, fast-check and typescript are used for code quality / test generation / ts compilation

### Randomness

We rely on the built-in
[`crypto.getRandomValues`](https://developer.mozilla.org/en-US/docs/Web/API/Crypto/getRandomValues),
which is considered a cryptographically secure PRNG.

Browsers have had weaknesses in the past - and could again - but implementing a userspace CSPRNG is even worse, as there’s no reliable userspace source of high-quality entropy.

### Quantum computers

Cryptographically relevant quantum computer, if built, will allow to
utilize Grover's algorithm to break hashes in 2^n/2 operations, instead of 2^n.

This means SHA256 should be replaced with SHA512, SHA3-256 with SHA3-512, SHAKE128 with SHAKE256 etc.

Australian ASD prohibits SHA256 and similar hashes [after 2030](https://www.cyber.gov.au/resources-business-and-government/essential-cyber-security/ism/cyber-security-guidelines/guidelines-cryptography).

## Upgrading

Supported node.js versions:

- v2: v20.19+ (ESM-only)
- v1: v14.21+ (ESM & CJS)

v2.0 changelog:

- The package is now ESM-only. ESM can finally be loaded from common.js on node v20.19+
- `.js` extension must be used for all modules
    - Old: `@noble/hashes/sha3`
    - New: `@noble/hashes/sha3.js`
    - This simplifies working in browsers natively without transpilers
- Only allow Uint8Array as hash inputs, prohibit `string`
    - Strict validation checks improve security
    - To replicate previous behavior, use `utils.utf8ToBytes`
- Rename / remove some modules for consistency. Previously, sha384 resided in sha512, which was weird
    - `sha256`, `sha512` => `sha2.js` (consistent with `sha3.js`)
    - `blake2b`, `blake2s` => `blake2.js` (consistent with `blake3.js`, `blake1.js`)
    - `ripemd160`, `sha1`, `md5` => `legacy.js` (all low-security hashes are there)
    - `_assert` => `utils.js`
    - `crypto` internal module got removed: use built-in WebCrypto instead
- Improve typescript types & option autocomplete
- Bump compilation target from es2020 to es2022

## Contributing & testing

`npm install && npm run build && npm test` will build the code and run tests.

There are **additional** slow suites: timing-based DoS tests `npm run test:dos`,
multi-hour large-input tests `npm run test:slow`, ACVP LDT vectors `npm run test:acvp`,
and memory-intensive KDF tests `npm run test:ultra`. The 9–17GiB scrypt cases require an
explicitly provisioned machine and run separately with `npm run test:ultra:scrypt`.

`test/misc` directory contains unrolled implementations (sha3, argon2) and misc helper scripts.

Some hashes are outside of scope of the library:
- [Pedersen in micro-zk-proofs](https://github.com/paulmillr/micro-zk-proofs/blob/1ed5ce1253583b2e540eef7f3477fb52bf5344ff/src/pedersen.ts)
- [Poseidon in noble-curves](https://github.com/paulmillr/noble-curves/blob/3d124dd3ecec8b6634cc0b2ba1c183aded5304f9/src/abstract/poseidon.ts)
- [Poly1305 & GHash in noble-ciphers](https://github.com/paulmillr/noble-ciphers)

See [paulmillr.com/noble](https://paulmillr.com/noble/) for useful resources, articles, documentation and demos related to the library.

## Speed

```sh
npm run benchmark
```

Benchmarks measured on Apple M4.

The library could be 3x faster by utilizing loop unrolling. It isn't used because
unrolling a) would increase bundle size b) make lib un-readable c) current perf is "fast enough"
for most use-cases.

If you need truly exemplar performance, switch to [awasm-noble](https://github.com/paulmillr/awasm-noble),
which does unrolling in an auditable way and allows to achieve 10GB/s BLAKE3.

```
# 32B
sha256 438 ns
sha512 1219 ns
sha3_256 1853 ns
sha3_512 1864 ns
kt128 1380 ns
kt256 1370 ns
turboshake128 1191 ns
blake256 1335 ns
blake2b 2186 ns
blake2s 1055 ns
blake3 981 ns
ripemd160 563 ns
md5 449 ns
sha1 507 ns
hmac(sha256) 1955 ns
hmac(sha512) 5126 ns
kmac256 6653 ns
blake3(key) 1120 ns

# 1MB
sha256 x 297 mib/sec
sha512 x 130 mib/sec
sha3_256 x 78.1 mib/sec
sha3_512 x 41.9 mib/sec
kt128 x 184 mib/sec
kt256 x 147 mib/sec
turboshake128 x 186 mib/sec
blake256 x 56.7 mib/sec
blake2b x 66.2 mib/sec
blake2s x 62.9 mib/sec
blake3 x 90 mib/sec
ripemd160 x 179 mib/sec
md5 x 275 mib/sec
sha1 x 417 mib/sec
hmac(sha256) x 290 mib/sec
hmac(sha512) x 129 mib/sec
kmac256 x 78.4 mib/sec
blake3(key) x 90.5 mib/sec

# KDF
hkdf(sha256) x 249,100 ops/sec @ 4015 ns/op
blake3(context) x 480,400 ops/sec @ 2081 ns/op
pbkdf2(sha256, c: 2 ** 18) x 5 ops/sec @ 199 ms/op
scrypt(n: 2 ** 19, r: 8, p: 1) x 1 ops/sec @ 751 ms/op
argon2id(t: 1, m: 128MB) x 3 ops/sec @ 276 ms/op
```

## License

The MIT License (MIT)

Copyright (c) 2022 Paul Miller [(https://paulmillr.com)](https://paulmillr.com)

See LICENSE file.
