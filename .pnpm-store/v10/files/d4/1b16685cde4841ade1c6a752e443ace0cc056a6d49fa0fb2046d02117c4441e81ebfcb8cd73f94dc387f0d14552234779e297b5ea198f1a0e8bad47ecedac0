var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __esm = (fn, res, err) => function __init() {
  if (err) throw err[0];
  try {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  } catch (e) {
    throw err = [e], e;
  }
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// ../cnoke/src/abi.js
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
  let fd = import_node_fs.default.openSync(filename, flags);
  return new FileHandle(fd);
}
var import_node_fs, FileHandle;
var init_abi = __esm({
  "../cnoke/src/abi.js"() {
    import_node_fs = __toESM(require("node:fs"), 1);
    FileHandle = class {
      constructor(fd) {
        this.fd = fd;
      }
      close() {
        import_node_fs.default.closeSync(this.fd);
      }
      [Symbol.dispose]() {
        import_node_fs.default.closeSync(this.fd);
      }
      read(offset, len) {
        let buf = Buffer.allocUnsafe(len);
        let read = import_node_fs.default.readSync(this.fd, buf, 0, len, offset);
        return buf.subarray(0, read);
      }
    };
  }
});

// package.json
var package_default;
var init_package = __esm({
  "package.json"() {
    package_default = { name: "koffi", version: "3.3.0", cnoke: { api: "../../vendor/node-api-headers", output: "../../bin/Koffi/{{ toolchain }}", node: 16, napi: 8 } };
  }
});

// src/init.js
var init_exports = {};
__export(init_exports, {
  detectPlatform: () => detectPlatform,
  loadDynamic: () => loadDynamic,
  wrapNative: () => wrapNative
});
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
    `${__dirname}/../../../@koromix/koffi-${pkg2}`,
    ...triplets2.flatMap((triplet) => roots.map((dir) => `${dir}/${triplet}/koffi.node`))
  ];
  for (let name of names) {
    if (!import_node_fs2.default.existsSync(name))
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
    lib.cdecl = import_node_util.default.deprecate((...args2) => lib.func("__cdecl", ...args2), "The koffi.cdecl() function was deprecated in Koffi 2.7, use koffi.func(...) instead", "KOFFI003");
    lib.stdcall = import_node_util.default.deprecate((...args2) => lib.func("__stdcall", ...args2), 'The koffi.stdcall() function was deprecated in Koffi 2.7, use koffi.func("__stdcall", ...) instead', "KOFFI004");
    lib.fastcall = import_node_util.default.deprecate((...args2) => lib.func("__fastcall", ...args2), 'The koffi.fastcall() function was deprecated in Koffi 2.7, use koffi.func("__fastcall", ...) instead', "KOFFI005");
    lib.thiscall = import_node_util.default.deprecate((...args2) => lib.func("__thiscall", ...args2), 'The koffi.thiscall() function was deprecated in Koffi 2.7, use koffi.func("__thiscall", ...) instead', "KOFFI006");
    return lib;
  };
  native2.resolve = import_node_util.default.deprecate(native2.type, "The koffi.resolve() function was deprecated in Koffi 3.0, use koffi.type() instead", "KOFFI007");
  native2.introspect = import_node_util.default.deprecate(native2.type, "The koffi.introspect() function was deprecated in Koffi 3.0, use koffi.type() instead", "KOFFI008");
}
var import_node_util, import_node_fs2, import_node_module, require2;
var init_init = __esm({
  "src/init.js"() {
    import_node_util = __toESM(require("node:util"));
    import_node_fs2 = __toESM(require("node:fs"));
    import_node_module = require("node:module");
    init_abi();
    init_package();
    require2 = (0, import_node_module.createRequire)(__filename);
  }
});

// index.cjs
var { detectPlatform: detectPlatform2, loadDynamic: loadDynamic2, wrapNative: wrapNative2 } = (init_init(), __toCommonJS(init_exports));
var { loadStatic } = require("./src/static.cjs");
var [version, pkg, triplets] = detectPlatform2();
var native = loadStatic(pkg) ?? loadDynamic2(__dirname, pkg, triplets);
wrapNative2(native, version);
module.exports = {
  default: native,
  "LibraryHandle": native["LibraryHandle"],
  "TypeObject": native["TypeObject"],
  "Union": native["Union"],
  "address": native["address"],
  "alias": native["alias"],
  "alignof": native["alignof"],
  "alloc": native["alloc"],
  "array": native["array"],
  "as": native["as"],
  "call": native["call"],
  "config": native["config"],
  "decode": native["decode"],
  "disposable": native["disposable"],
  "encode": native["encode"],
  "enumeration": native["enumeration"],
  "errno": native["errno"],
  "extension": native["extension"],
  "free": native["free"],
  "in": native["in"],
  "inout": native["inout"],
  "introspect": native["introspect"],
  "load": native["load"],
  "node": native["node"],
  "offsetof": native["offsetof"],
  "opaque": native["opaque"],
  "os": native["os"],
  "out": native["out"],
  "pack": native["pack"],
  "pointer": native["pointer"],
  "proto": native["proto"],
  "register": native["register"],
  "reset": native["reset"],
  "resolve": native["resolve"],
  "sizeof": native["sizeof"],
  "stats": native["stats"],
  "struct": native["struct"],
  "type": native["type"],
  "types": native["types"],
  "union": native["union"],
  "unregister": native["unregister"],
  "version": native["version"],
  "view": native["view"]
};
