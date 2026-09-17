// src/init.js
import util from "node:util";
import fs2 from "node:fs";
import { createRequire } from "node:module";

// ../cnoke/src/abi.js
import fs from "node:fs";
function determineAbi() {
  let abi = process.arch.toString();
  if (abi == "riscv32" || abi == "riscv64") {
    let file = openFile(process.execPath, "r");
    try {
      let header = readElfHeader(file);
      let float_abi = header.e_flags & 6;
      switch (float_abi) {
        case 0:
          {
          }
          break;
        case 2:
          {
            abi += "f";
          }
          break;
        case 4:
          {
            abi += "d";
          }
          break;
        case 6:
          {
            abi += "q";
          }
          break;
      }
    } finally {
      file.close();
    }
  } else if (abi == "arm") {
    let file = openFile(process.execPath, "r");
    try {
      let header = readElfHeader(file);
      if (header.e_flags & 1024) {
        abi += "hf";
      } else if (header.e_flags & 512) {
        abi += "sf";
      } else {
        throw new Error("Unknown ARM floating-point ABI");
      }
    } finally {
      file.close();
    }
  } else if (abi == "ppc64") {
    let file = openFile(process.execPath, "r");
    try {
      let header = readElfHeader(file);
      switch (header.ei_data) {
        case 1:
          {
            abi += "le";
          }
          break;
        case 2:
          {
            abi += "be";
          }
          break;
        default:
          throw new Error("Invalid ELF endianness value");
      }
    } finally {
      file.close();
    }
  }
  return abi;
}
function readElfHeader(file, offset = 0) {
  let buf = file.read(offset, 512);
  if (buf.length < 16)
    throw new Error("Truncated header");
  if (buf[0] != 127 || buf[1] != 69 || buf[2] != 76 || buf[3] != 70)
    throw new Error("Invalid magic number");
  if (buf[6] != 1)
    throw new Error("Invalid ELF version");
  if (buf[5] != 1)
    throw new Error("Big-endian architectures are not supported");
  switch (buf[4]) {
    case 1:
      {
        if (buf.length < 68)
          throw new Error("Truncated ELF header");
        return {
          ei_class: 32,
          ei_data: buf[5],
          e_machine: buf.readUInt16LE(18),
          e_flags: buf.readUInt32LE(36),
          e_phoff: buf.readUInt32LE(28),
          e_phentsize: buf.readUInt16LE(42),
          e_phnum: buf.readUInt16LE(44)
        };
      }
      break;
    case 2:
      {
        if (buf.length < 120)
          throw new Error("Truncated ELF header");
        return {
          ei_class: 64,
          ei_data: buf[5],
          e_machine: buf.readUInt16LE(18),
          e_flags: buf.readUInt32LE(48),
          e_phoff: buf.readBigUInt64LE(32),
          e_phentsize: buf.readUInt16LE(54),
          e_phnum: buf.readUInt16LE(56)
        };
      }
      break;
    default:
      throw new Error("Invalid ELF class");
  }
}
function openFile(filename, flags) {
  let fd = fs.openSync(filename, flags);
  return new FileHandle(fd);
}
var FileHandle = class {
  constructor(fd) {
    this.fd = fd;
  }
  close() {
    fs.closeSync(this.fd);
  }
  [Symbol.dispose]() {
    fs.closeSync(this.fd);
  }
  read(offset, len) {
    let buf = Buffer.allocUnsafe(len);
    let read = fs.readSync(this.fd, buf, 0, len, offset);
    return buf.subarray(0, read);
  }
};

// package.json
var package_default = { name: "koffi", version: "3.3.0", cnoke: { api: "../../vendor/node-api-headers", output: "../../bin/Koffi/{{ toolchain }}", node: 16, napi: 8 } };

// src/init.js
var require2 = createRequire(import.meta.url);
function detectPlatform() {
  if (process.versions.napi == null || process.versions.napi < package_default.cnoke.napi) {
    let major = parseInt(process.versions.node, 10);
    throw new Error(`This engine is based on Node ${process.versions.node}, but ${package_default.name} does not support the Node ${major}.x branch (Node-API < ${package_default.cnoke.napi})`);
  }
  let abi = determineAbi();
  let pkg2 = `${process.platform}-${process.arch}`;
  let triplets2 = [`${process.platform}_${abi}`];
  if (process.platform == "linux")
    triplets2.push(`musl_${abi}`);
  return [package_default.version, pkg2, triplets2];
}
function loadDynamic(dirname, pkg2, triplets2) {
  let suffix = "/../../build/koffi";
  let root = dirname + suffix;
  let roots = [root];
  let native2 = null;
  let err = null;
  if (process["resourcesPath"] != null) {
    let suffixes = [
      "/koffi",
      "/koffi/build",
      "/node_modules/koffi/build"
    ];
    for (let suffix2 of suffixes)
      roots.push(process["resourcesPath"] + suffix2);
  }
  let names = [
    `${import.meta.dirname}/../../../@koromix/koffi-${pkg2}`,
    ...triplets2.flatMap((triplet) => roots.map((dir) => `${dir}/${triplet}/koffi.node`))
  ];
  for (let name of names) {
    if (!fs2.existsSync(name))
      continue;
    try {
      native2 = require2(name);
      break;
    } catch (e) {
      err ??= e;
    }
  }
  if (native2 == null && err != null)
    throw err;
  return native2;
}
function wrapNative(native2, version2) {
  if (native2 == null)
    throw new Error("Cannot find the native Koffi module; did you bundle it correctly?");
  if (native2.version != version2)
    throw new Error("Mismatched native Koffi modules");
  let load = native2.load;
  let register = native2.register;
  let introspect = native2.type;
  native2.sizeof = (spec) => introspect(spec).size;
  native2.alignof = (spec) => introspect(spec).alignment;
  native2.offsetof = (spec, name) => {
    let info = introspect(spec);
    if (info.primitive != "Record")
      throw new TypeError("The offsetof() function can only be used with record types");
    let member = info.members[name];
    if (member == null)
      throw new Error(`Record type ${info.name} does not have member '${name}'`);
    return member.offset;
  };
  native2.register = (...args) => {
    if (args.length >= 3 && typeof args[1] == "function") {
      process.emitWarning("Using koffi.register() with a custom this value was deprecated in Koffi 2.17, use function.bind() instead", "DeprecationWarning", "KOFFI009");
      args[1] = args[1].bind(args[0]);
      args = args.slice(1);
    }
    return register(...args);
  };
  native2.load = (...args) => {
    let lib = load(...args);
    lib.cdecl = util.deprecate((...args2) => lib.func("__cdecl", ...args2), "The koffi.cdecl() function was deprecated in Koffi 2.7, use koffi.func(...) instead", "KOFFI003");
    lib.stdcall = util.deprecate((...args2) => lib.func("__stdcall", ...args2), 'The koffi.stdcall() function was deprecated in Koffi 2.7, use koffi.func("__stdcall", ...) instead', "KOFFI004");
    lib.fastcall = util.deprecate((...args2) => lib.func("__fastcall", ...args2), 'The koffi.fastcall() function was deprecated in Koffi 2.7, use koffi.func("__fastcall", ...) instead', "KOFFI005");
    lib.thiscall = util.deprecate((...args2) => lib.func("__thiscall", ...args2), 'The koffi.thiscall() function was deprecated in Koffi 2.7, use koffi.func("__thiscall", ...) instead', "KOFFI006");
    return lib;
  };
  native2.resolve = util.deprecate(native2.type, "The koffi.resolve() function was deprecated in Koffi 3.0, use koffi.type() instead", "KOFFI007");
  native2.introspect = util.deprecate(native2.type, "The koffi.introspect() function was deprecated in Koffi 3.0, use koffi.type() instead", "KOFFI008");
}

// indirect.js
var [version, pkg, triplets] = detectPlatform();
var native = loadDynamic(import.meta.dirname, pkg, triplets);
wrapNative(native, version);
var mod_LibraryHandle = native.LibraryHandle;
var mod_TypeObject = native.TypeObject;
var mod_Union = native.Union;
var mod_address = native.address;
var mod_alias = native.alias;
var mod_alignof = native.alignof;
var mod_alloc = native.alloc;
var mod_array = native.array;
var mod_as = native.as;
var mod_call = native.call;
var mod_config = native.config;
var mod_decode = native.decode;
var mod_disposable = native.disposable;
var mod_encode = native.encode;
var mod_enumeration = native.enumeration;
var mod_errno = native.errno;
var mod_extension = native.extension;
var mod_free = native.free;
var mod_in = native.in;
var mod_inout = native.inout;
var mod_introspect = native.introspect;
var mod_load = native.load;
var mod_node = native.node;
var mod_offsetof = native.offsetof;
var mod_opaque = native.opaque;
var mod_os = native.os;
var mod_out = native.out;
var mod_pack = native.pack;
var mod_pointer = native.pointer;
var mod_proto = native.proto;
var mod_register = native.register;
var mod_reset = native.reset;
var mod_resolve = native.resolve;
var mod_sizeof = native.sizeof;
var mod_stats = native.stats;
var mod_struct = native.struct;
var mod_type = native.type;
var mod_types = native.types;
var mod_union = native.union;
var mod_unregister = native.unregister;
var mod_version = native.version;
var mod_view = native.view;
var indirect_default = native;
export {
  mod_LibraryHandle as LibraryHandle,
  mod_TypeObject as TypeObject,
  mod_Union as Union,
  mod_address as address,
  mod_alias as alias,
  mod_alignof as alignof,
  mod_alloc as alloc,
  mod_array as array,
  mod_as as as,
  mod_call as call,
  mod_config as config,
  mod_decode as decode,
  indirect_default as default,
  mod_disposable as disposable,
  mod_encode as encode,
  mod_enumeration as enumeration,
  mod_errno as errno,
  mod_extension as extension,
  mod_free as free,
  mod_in as in,
  mod_inout as inout,
  mod_introspect as introspect,
  mod_load as load,
  mod_node as node,
  mod_offsetof as offsetof,
  mod_opaque as opaque,
  mod_os as os,
  mod_out as out,
  mod_pack as pack,
  mod_pointer as pointer,
  mod_proto as proto,
  mod_register as register,
  mod_reset as reset,
  mod_resolve as resolve,
  mod_sizeof as sizeof,
  mod_stats as stats,
  mod_struct as struct,
  mod_type as type,
  mod_types as types,
  mod_union as union,
  mod_unregister as unregister,
  mod_version as version,
  mod_view as view
};
