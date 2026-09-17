<h1 align="center">
  @peculiar/webcrypto
</h1>

<div align="center">

![NPM License](https://img.shields.io/npm/l/@peculiar/webcrypto)
![GitHub Actions Workflow Status](https://img.shields.io/github/actions/workflow/status/PeculiarVentures/webcrypto/test.yml?label=test)
[![npm version](https://img.shields.io/npm/v/@peculiar/webcrypto.svg)](https://www.npmjs.com/package/@peculiar/webcrypto)
![Coveralls](https://img.shields.io/coverallsCoverage/github/PeculiarVentures/webcrypto)
[![npm downloads](https://img.shields.io/npm/dm/@peculiar/webcrypto.svg)](https://www.npmjs.com/package/@peculiar/webcrypto)

</div>

We wanted to be able to write Javascript that used crypto on both the client and the server but we did not want to rely on Javascript implementations of crypto. The only native cryptography available in browser is [Web Crypto](http://caniuse.com/#search=cryptography), this resulted in us creating a `@peculiar/webcrypto`.

## Table Of Contents

* [WARNING](#warning)
* [Installing](#installing)
* [Using](#using)
* [Examples](#examples)
* [Bug Reporting](#bug-reporting)
* [Related](#related)

## WARNING

**At this time this solution should be considered suitable for research and experimentation, further code and security review is needed before utilization in a production application.**

**Module is based on the Node.js crypto API. It requires Node v14.18.0 or higher.**

## Installing

```
npm install @peculiar/webcrypto
```

## Supported algorithms

| Algorithm name    | generateKey | digest  | export/import | sign/verify | encrypt/decrypt | wrapKey/unwrapKey | derive  |
|-------------------|-------------|---------|---------------|-------------|-----------------|-------------------|---------|
| SHA-1             |             |    X    |               |             |                 |                   |         |
| SHA-256           |             |    X    |               |             |                 |                   |         |
| SHA-384           |             |    X    |               |             |                 |                   |         |
| SHA-512           |             |    X    |               |             |                 |                   |         |
| HMAC              |      X      |         |       X       |      X      |                 |                   |         |
| RSASSA-PKCS1-v1_5 |      X      |         |       X       |      X      |                 |                   |         |
| RSAES-PKCS1-v1_5<sup>2</sup>| X |         |       X       |             |        X        |         X         |         |
| RSA-PSS           |      X      |         |       X       |      X      |                 |                   |         |
| RSA-OAEP          |      X      |         |       X       |             |        X        |         X         |         |
| AES-CMAC          |      X      |         |       X       |      X      |                 |                   |         |
| AES-CBC           |      X      |         |       X       |             |        X        |         X         |         |
| AES-CTR           |      X      |         |       X       |             |        X        |         X         |         |
| AES-ECB           |      X      |         |       X       |             |        X        |         X         |         |
| AES-GCM           |      X      |         |       X       |             |        X        |         X         |         |
| AES-KW            |      X      |         |       X       |             |                 |         X         |         |
| ECDSA<sup>1</sup> |      X      |         |       X       |      X      |                 |                   |         |
| ECDH<sup>1</sup>  |      X      |         |       X       |             |                 |                   |    X    |
| EdDSA<sup>2,3</sup> |      X      |         |       X       |      X      |                 |                   |         |
| ECDH-ES<sup>2,4</sup>  |      X      |         |       X       |             |                 |                   |    X    |
| HKDF              |             |         |       X       |             |                 |                   |    X    |
| PBKDF2            |             |         |       X       |             |                 |                   |    X    |
| DES-CBC<sup>2</sup>|      X      |         |       X       |             |        X        |         X         |         |
| DES-EDE3-CBC<sup>2</sup>|      X      |         |       X       |             |        X        |         X         |         |
| shake128<sup>2</sup>|             |    X    |               |             |                 |                   |         |
| shake256<sup>2</sup>|             |    X    |               |             |                 |                   |         |

<sup>1</sup> Mechanism supports extended list of named curves `P-256`, `P-384`, `P-521`, `K-256`,
`brainpoolP160r1`, `brainpoolP160t1`, `brainpoolP192r1`, `brainpoolP192t1`, `brainpoolP224r1`, `brainpoolP224t1`, `brainpoolP256r1`, `brainpoolP256t1`, `brainpoolP320r1`, `brainpoolP320t1`, `brainpoolP384r1`, `brainpoolP384t1`, `brainpoolP512r1`, and `brainpoolP512t1`

<sup>2</sup> Mechanism is not defined by the WebCrypto specifications. Use of mechanism in a safe way is hard, it was added for the purpose of enabling interoperability with an existing system. We recommend against its use unless needed for interoperability.

<sup>3</sup> Mechanism supports extended list of named curves `Ed25519`, and `Ed448`

<sup>4</sup> Mechanism supports extended list of named curves `X25519`, and `X448`

## Using

```javascript
const { Crypto } = require("@peculiar/webcrypto");

const crypto = new Crypto();
```

## Examples

See [WebCrypto Docs](https://github.com/PeculiarVentures/webcrypto-docs/blob/master/README.md) for examples

## Bug Reporting

Please report bugs either as pull requests or as issues in the issue tracker. `@peculiar/webcrypto` has a full disclosure vulnerability policy. Please do NOT attempt to report any security vulnerability in this code privately to anybody.

## Related

* [node-webcrypto-ossl](https://github.com/PeculiarVentures/node-webcrypto-ossl)
* [node-webcrypto-p11](https://github.com/PeculiarVentures/node-webcrypto-p11)
* [webcrypto-liner](https://github.com/PeculiarVentures/webcrypto-liner)
