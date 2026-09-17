[![NPM version](https://badge.fury.io/js/resedit.svg)](https://www.npmjs.com/package/resedit)
[![Build Status](https://github.com/jet2jet/resedit-js/actions/workflows/main-ci.yml/badge.svg)](https://github.com/jet2jet/resedit-js)

# resedit-js

resedit-js is a library that manipulates resouces contained by Windows Executable files. All implementations are written in JavaScript (TypeScript), so there are no further restrictions for running environment.

This library is not tested well for modifying and/or signing executables yet. Please be careful with the emitted binaries.

To use in command line, consider using [resedit-js-cli](https://www.npmjs.com/package/resedit-cli).

The demo page: [resedit demo](https://www.pg-fl.jp/program/resedit/index.en.htm)

- [Install](#install)
- [Supported formats](#supported-formats)
- [Parsing signed executables](#parsing-signed-executables)
- [Signing executables with resedit-js](#signing-executables-with-resedit-js)
- [Notes](#notes)
- [Examples](#examples)
- [License](#license)

## Install

```
npm install resedit
```

## Supported formats

- Windows Executables (PE Format, such as `.exe` and `.dll`), both 32-bit and 64-bit, are supported.
  - Executables for 16-bit Windows is not supported.
- `.res` file is not supported now.
- PNG-based icon data is supported on `require('resedit').Resource.IconGroupEntry` class.

## Parsing signed executables

- Parsing signed executables (by using Authenticode or etc.) is not allowed by default and an exception will be thrown if `NtExecutable.from` receives a signed binary.
- To parse signed, `{ ignoreCert: true }` object must be passed to the second argument of `NtExecutable.from`.
- Although the base executable data is signed, `NtExecutable.generate` will generate unsigned executable binary. If you want to re-sign it, you must use generate-function with signing (see below) or any other signing tool such as Microsoft `signtool`.

## Signing executables with resedit-js

resedit-js provides basic signing process `generateExecutableWithSign` function, which is based on [Authenticode specification](https://download.microsoft.com/download/9/c/5/9c5b2167-8017-4bae-9fde-d599bac8184a/authenticode_pe.docx) and related RFCs.

To keep resedit-js generic library, the followings are required to use signing process.

- Encryption / calculating hash (digest) process (e.g. Node.js built-in `crypto` module)
  - A private key data is implicitly required to encrypt data.
- DER-format certificate binary (such as `*.cer` file data or `*.p7b` file data with DER-format), which is paired with the private key used by encryption process.
- (optional) Generating timestamp data, especially communicating with TSA server (e.g. HTTP/HTTPS API)

These requirements are represented as [`SignerObject`](./src/main/sign/SignerObject.ts). The caller of `generateExecutableWithSign` function must implement this object to sign executables.

An example code is here: [signTest.js](./examples/sign/signTest.js)

Note that resedit-js only provides basic signing process, and provides as beta version. For example adding more attributes/informations to certificates are not supported now.

> Some digest algorithms, such as SHA3 algorithms, might not be supported by current Windows.

## Notes

- **It is not strongly recommended that the destination executable file is equal to the source executable file (which is not an intermediate data).**

## Examples

For more APIs, please see `dist` directory of the package. And, [some test codes](./src/test) may help you for usages.

```js
import * as PELibrary from 'pe-library';
import * as ResEdit from 'resedit';
import * as fs from 'fs';

// load and parse data
const data = fs.readFileSync('MyApp.exe');
// (the Node.js Buffer instance can be specified directly to NtExecutable.from)
const exe = PELibrary.NtExecutable.from(data);
const res = PELibrary.NtExecutableResource.from(exe);

// rewrite resources
// - You can use helper classes as followings:
//   - ResEdit.Resource.IconGroupEntry: access icon resource data
//   - ResEdit.Resource.StringTable: access string resource data
//   - ResEdit.Resource.VersionInfo: access version info data

// -- replace icons

// load icon data from file
// (you can use ResEdit.Data.IconFile to parse icon data)
const iconFile = ResEdit.Data.IconFile.from(fs.readFileSync('MyIcon.ico'));

ResEdit.Resource.IconGroupEntry.replaceIconsForResource(
  // destEntries
  res.entries,
  // iconGroupID
  101,
  // lang ('lang: 1033' means 'en-US')
  1033,
  // icons (map IconFileItem to IconItem/RawIconItem)
  iconFile.icons.map((item) => item.data)
);

// -- replace version

const viList = ResEdit.Resource.VersionInfo.fromEntries(res.entries);
const vi = viList[0];
// setFileVersion will set `vi.fixedInfo.fileVersionMS`/`fileVersionLS` and 'FileVersion' string value
// ('1033' means 'en-US')
vi.setFileVersion(1, 0, 0, 0, 1033);
// ('lang: 1033' means 'en-US', 'codepage: 1200' is the default codepage)
vi.setStringValues(
  { lang: 1033, codepage: 1200 },
  {
    FileDescription: 'My application',
    ProductName: 'My product',
  }
);
vi.outputToResourceEntries(res.entries);

// write to another binary
res.outputResource(exe);
const newBinary = exe.generate();
fs.writeFileSync('MyApp_modified.exe', Buffer.from(newBinary));
```

## License

[MIT License](./LICENSE)
