# @electron/asar - Electron Archive

[![Test](https://github.com/electron/asar/actions/workflows/test.yml/badge.svg)](https://github.com/electron/asar/actions/workflows/test.yml)
[![npm version](http://img.shields.io/npm/v/@electron/asar.svg)](https://npmjs.org/package/@electron/asar)

Asar is a simple extensive archive format, it works like `tar` that concatenates
all files together without compression, while having random access support.

## Features

* Support random access
* Use JSON to store files' information
* Very easy to write a parser

## Command line utility

### Install

This module requires Node 10 or later.

```bash
$ npm install --engine-strict @electron/asar
```

### Usage

```bash
$ asar --help

  Usage: asar [options] [command]

  Commands:

    pack|p <dir> <output>
       create asar archive

    list|l <archive>
       list files of asar archive

    extract-file|ef <archive> <filename>
       extract one file from archive

    extract|e <archive> <dest>
       extract archive


  Options:

    -h, --help     output usage information
    -V, --version  output the version number

```

#### Excluding multiple resources from being packed

Given:
```
    app
(a) ├── x1
(b) ├── x2
(c) ├── y3
(d) │   ├── x1
(e) │   └── z1
(f) │       └── x2
(g) └── z4
(h)     └── w1
```

Exclude: a, b
```bash
$ asar pack app app.asar --unpack-dir "{x1,x2}"
```

Exclude: a, b, d, f
```bash
$ asar pack app app.asar --unpack-dir "**/{x1,x2}"
```

Exclude: a, b, d, f, h
```bash
$ asar pack app app.asar --unpack-dir "{**/x1,**/x2,z4/w1}"
```

## Using programmatically

### Example

```javascript
const asar = require('@electron/asar');

const src = 'some/path/';
const dest = 'name.asar';

await asar.createPackage(src, dest);
console.log('done.');
```

Please note that there is currently **no** error handling provided!

### Transform
You can pass in a `transform` option, that is a function, which either returns
nothing, or a `stream.Transform`. The latter will be used on files that will be
in the `.asar` file to transform them (e.g. compress).

```javascript
const asar = require('@electron/asar');

const src = 'some/path/';
const dest = 'name.asar';

function transform (filename) {
  return new CustomTransformStream()
}

await asar.createPackageWithOptions(src, dest, { transform: transform });
console.log('done.');
```

## Format

Asar uses [Pickle][pickle] to safely serialize binary value to file.

The format of asar is very flat:

```
| UInt32: header_size | String: header | Bytes: file1 | ... | Bytes: file42 |
```

The `header_size` and `header` are serialized with [Pickle][pickle] class, and
`header_size`'s [Pickle][pickle] object is 8 bytes.

The `header` is a JSON string, and the `header_size` is the size of `header`'s
`Pickle` object.

Structure of `header` is something like this:

```json
{
   "files": {
      "tmp": {
         "files": {}
      },
      "usr" : {
         "files": {
           "bin": {
             "files": {
               "ls": {
                 "offset": "0",
                 "size": 100,
                 "executable": true,
                 "integrity": {
                   "algorithm": "SHA256",
                   "hash": "...",
                   "blockSize": 1024,
                   "blocks": ["...", "..."]
                 }
               },
               "cd": {
                 "offset": "100",
                 "size": 100,
                 "executable": true,
                 "integrity": {
                   "algorithm": "SHA256",
                   "hash": "...",
                   "blockSize": 1024,
                   "blocks": ["...", "..."]
                 }
               }
             }
           }
         }
      },
      "etc": {
         "files": {
           "hosts": {
             "offset": "200",
             "size": 32,
             "integrity": {
                "algorithm": "SHA256",
                "hash": "...",
                "blockSize": 1024,
                "blocks": ["...", "..."]
              }
           }
         }
      }
   }
}
```

`offset` and `size` records the information to read the file from archive, the
`offset` starts from 0 so you have to manually add the size of `header_size` and
`header` to the `offset` to get the real offset of the file.

`offset` is a UINT64 number represented in string, because there is no way to
precisely represent UINT64 in JavaScript `Number`. `size` is a JavaScript
`Number` that is no larger than `Number.MAX_SAFE_INTEGER`, which has a value of
`9007199254740991` and is about 8PB in size. We didn't store `size` in UINT64
because file size in Node.js is represented as `Number` and it is not safe to
convert `Number` to UINT64.

`integrity` is an object consisting of a few keys:
* A hashing `algorithm`, currently only `SHA256` is supported.
* A hex encoded `hash` value representing the hash of the entire file.
* An array of hex encoded hashes for the `blocks` of the file.  i.e. for a blockSize of 4KB this array contains the hash of every block if you split the file into N 4KB blocks.
* A integer value `blockSize` representing the size in bytes of each block in the `blocks` hashes above

[pickle]: https://chromium.googlesource.com/chromium/src/+/main/base/pickle.h
