#!/usr/bin/env -S node --no-warnings
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
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

// ../cnoke/cnoke.js
var import_node_fs4 = __toESM(require("node:fs"), 1);

// ../cnoke/src/builder.js
var import_node_fs3 = __toESM(require("node:fs"), 1);
var import_node_os = __toESM(require("node:os"), 1);
var import_node_path = __toESM(require("node:path"), 1);
var import_node_child_process = require("node:child_process");

// ../cnoke/src/abi.js
var import_node_fs = __toESM(require("node:fs"), 1);
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
var FileHandle = class {
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

// ../cnoke/src/util.js
var import_node_fs2 = __toESM(require("node:fs"), 1);
function pathIsAbsolute(path2) {
  if (process.platform == "win32" && path2.match(/^[a-zA-Z]:/))
    path2 = path2.substr(2);
  return isPathSeparator(path2[0]);
}
function isPathSeparator(c) {
  if (c == "/")
    return true;
  if (process.platform == "win32" && c == "\\")
    return true;
  return false;
}
function syncFiles(src_dir, dest_dir) {
  let keep = /* @__PURE__ */ new Set();
  {
    let entries = import_node_fs2.default.readdirSync(src_dir, { withFileTypes: true });
    for (let entry of entries) {
      if (!entry.isFile())
        continue;
      keep.add(entry.name);
      import_node_fs2.default.copyFileSync(src_dir + `/${entry.name}`, dest_dir + `/${entry.name}`);
    }
  }
  {
    let entries = import_node_fs2.default.readdirSync(dest_dir, { withFileTypes: true });
    for (let entry of entries) {
      if (!entry.isFile())
        continue;
      if (keep.has(entry.name))
        continue;
      import_node_fs2.default.unlinkSync(dest_dir + `/${entry.name}`);
    }
  }
}
function unlinkRecursive(path2) {
  try {
    import_node_fs2.default.rmSync(path2, { recursive: true, maxRetries: process.platform == "win32" ? 3 : 0 });
  } catch (err) {
    if (err.code !== "ENOENT")
      throw err;
  }
}
function getNapiVersion(napi, major) {
  if (napi > 8)
    return null;
  const support = {
    6: ["6.14.2", "6.14.2", "6.14.2"],
    8: ["8.6.0", "8.10.0", "8.11.2"],
    9: ["9.0.0", "9.3.0", "9.11.0"],
    10: ["10.0.0", "10.0.0", "10.0.0", "10.16.0", "10.17.0", "10.20.0", "10.23.0"],
    11: ["11.0.0", "11.0.0", "11.0.0", "11.8.0"],
    12: ["12.0.0", "12.0.0", "12.0.0", "12.0.0", "12.11.0", "12.17.0", "12.19.0", "12.22.0"],
    13: ["13.0.0", "13.0.0", "13.0.0", "13.0.0", "13.0.0"],
    14: ["14.0.0", "14.0.0", "14.0.0", "14.0.0", "14.0.0", "14.0.0", "14.12.0", "14.17.0"],
    15: ["15.0.0", "15.0.0", "15.0.0", "15.0.0", "15.0.0", "15.0.0", "15.0.0", "15.12.0"]
  };
  const max = Math.max(...Object.keys(support).map((k) => parseInt(k, 10)));
  if (major > max)
    return major + ".0.0";
  if (support[major] == null)
    return null;
  let required = support[major][napi - 1] || null;
  return required;
}
function compareVersions(ver1, ver2) {
  ver1 = String(ver1).replace(/-.*$/, "").split(".").reduce((acc, v, idx) => acc + parseInt(v, 10) * Math.pow(10, 2 * (5 - idx)), 0);
  ver2 = String(ver2).replace(/-.*$/, "").split(".").reduce((acc, v, idx) => acc + parseInt(v, 10) * Math.pow(10, 2 * (5 - idx)), 0);
  let cmp = Math.min(Math.max(ver1 - ver2, -1), 1);
  return cmp;
}

// ../cnoke/src/assets.js
var FIND_CNOKE_CMAKE = `# SPDX-License-Identifier: MIT
# SPDX-FileCopyrightText: 2026 Niels Martign\xE8ne <niels.martignene@protonmail.com>

if(CMAKE_BUILD_TYPE STREQUAL "Release" OR CMAKE_BUILD_TYPE STREQUAL "RelWithDebInfo" OR
   CMAKE_BUILD_TYPE STREQUAL "MinSizeRel")
    set(USE_UNITY_BUILDS ON CACHE BOOL "Use single-TU builds (aka. Unity builds)")
else()
    set(USE_UNITY_BUILDS OFF CACHE BOOL "Use single-TU builds (aka. Unity builds)")
endif()

function(add_node_addon)
    cmake_parse_arguments(ARG "" "NAME" "SOURCES" \${ARGN})
    add_library(\${ARG_NAME} SHARED \${ARG_SOURCES} \${NODE_JS_SOURCES})
    target_link_node(\${ARG_NAME})
    set_target_properties(\${ARG_NAME} PROPERTIES PREFIX "" SUFFIX ".node")
endfunction()

function(target_link_node TARGET)
    target_include_directories(\${TARGET} PRIVATE \${NODE_JS_INCLUDE_DIRS})
    if(NODE_JS_LINK_DEF)
        target_sources(\${TARGET} PRIVATE node.lib)
    endif()
    if(NODE_JS_LINK_LIB)
        target_link_libraries(\${TARGET} PRIVATE \${NODE_JS_LINK_LIB})
    endif()
    target_compile_options(\${TARGET} PRIVATE \${NODE_JS_COMPILE_FLAGS})
    if(NODE_JS_LINK_FLAGS)
        target_link_options(\${TARGET} PRIVATE \${NODE_JS_LINK_FLAGS})
    endif()
endfunction()

if(WIN32)
    function(create_import_lib OUTPUT SRC)
        if (MSVC)
            add_custom_command(OUTPUT \${OUTPUT}
                               COMMAND \${CMAKE_AR} \${CMAKE_STATIC_LINKER_FLAGS}
                                       /def:\${SRC} /out:"\${CMAKE_CURRENT_BINARY_DIR}/\${OUTPUT}"
                               WORKING_DIRECTORY \${CMAKE_CURRENT_SOURCE_DIR}
                               MAIN_DEPENDENCY \${SRC})
        elseif(DEFINED NODE_JS_DLLTOOL_MACHINE)
            add_custom_command(OUTPUT \${OUTPUT}
                               COMMAND \${CMAKE_DLLTOOL} -d \${SRC} -l "\${CMAKE_CURRENT_BINARY_DIR}/\${OUTPUT}" -m \${NODE_JS_DLLTOOL_MACHINE}
                               WORKING_DIRECTORY \${CMAKE_CURRENT_SOURCE_DIR}
                               MAIN_DEPENDENCY \${SRC})
        else()
            add_custom_command(OUTPUT \${OUTPUT}
                               COMMAND \${CMAKE_DLLTOOL} -d \${SRC} -l "\${CMAKE_CURRENT_BINARY_DIR}/\${OUTPUT}"
                               WORKING_DIRECTORY \${CMAKE_CURRENT_SOURCE_DIR}
                               MAIN_DEPENDENCY \${SRC})
        endif()
    endfunction()
endif()

if(NODE_JS_LINK_DEF)
    create_import_lib(node.lib \${NODE_JS_LINK_DEF})
    set(NODE_JS_LINK_LIB "\${CMAKE_CURRENT_BINARY_DIR}/node.lib")
endif()

if(USE_UNITY_BUILDS)
    function(enable_unity_build TARGET)
        cmake_parse_arguments(ARG "" "" "EXCLUDE" \${ARGN})

        get_target_property(sources \${TARGET} SOURCES)
        string(GENEX_STRIP "\${sources}" sources)

        set(unity_file_c "\${CMAKE_CURRENT_BINARY_DIR}/\${TARGET}_unity.c")
        set(unity_file_cpp "\${CMAKE_CURRENT_BINARY_DIR}/\${TARGET}_unity.cpp")
        file(REMOVE \${unity_file_c} \${unity_file_cpp})

        set(c_definitions "")
        set(cpp_definitions "")

        foreach(src \${sources})
            if (src IN_LIST ARG_EXCLUDE)
                continue()
            endif()

            get_source_file_property(language \${src} LANGUAGE)
            get_property(definitions SOURCE \${src} PROPERTY COMPILE_DEFINITIONS)
            if(IS_ABSOLUTE \${src})
                set(src_full \${src})
            else()
                set(src_full "\${CMAKE_CURRENT_SOURCE_DIR}/\${src}")
            endif()
            if(language STREQUAL "C")
                set_source_files_properties(\${src} PROPERTIES HEADER_FILE_ONLY 1)
                file(APPEND \${unity_file_c} "#include \\"\${src_full}\\"\\n")
                if (definitions)
                    set(c_definitions "\${c_definitions} \${definitions}")
                endif()
            elseif(language STREQUAL "CXX")
                set_source_files_properties(\${src} PROPERTIES HEADER_FILE_ONLY 1)
                file(APPEND \${unity_file_cpp} "#include \\"\${src_full}\\"\\n")
                if (definitions)
                    set(cpp_definitions "\${cpp_definitions} \${definitions}")
                endif()
            endif()
        endforeach()

        if(EXISTS \${unity_file_c})
            target_sources(\${TARGET} PRIVATE \${unity_file_c})
            if(c_definitions)
                set_source_files_properties(\${unity_file_c} PROPERTIES COMPILE_DEFINITIONS \${c_definitions})
            endif()
        endif()
        if(EXISTS \${unity_file_cpp})
            target_sources(\${TARGET} PRIVATE \${unity_file_cpp})
            if(cpp_definitions)
                set_source_files_properties(\${unity_file_cpp} PROPERTIES COMPILE_DEFINITIONS \${cpp_definitions})
            endif()
        endif()

        target_compile_definitions(\${TARGET} PRIVATE -DUNITY_BUILD=1)
    endfunction()
else()
    function(enable_unity_build TARGET)
    endfunction()
endif()

if(CMAKE_CXX_COMPILER_ID STREQUAL "Clang" OR CMAKE_CXX_COMPILER_ID STREQUAL "GNU")
    if(CMAKE_SYSTEM_PROCESSOR MATCHES "(amd64|x86_64)")
        foreach(lang C CXX)
            set(CMAKE_\${lang}_FLAGS_RELEASE "\${CMAKE_\${lang}_FLAGS_RELEASE} -march=x86-64-v2")
            set(CMAKE_\${lang}_FLAGS_RELWITHDEBINFO "\${CMAKE_\${lang}_FLAGS_RELWITHDEBINFO} -march=x86-64-v2")
        endforeach()
    endif()
endif()
`;
var WIN_DELAY_HOOK_C = `// SPDX-License-Identifier: MIT
// SPDX-FileCopyrightText: 2026 Niels Martign\xE8ne <niels.martignene@protonmail.com>

#include <stdlib.h>
#if !defined(NOMINMAX)
    #define NOMINMAX
#endif
#if !defined(WIN32_LEAN_AND_MEAN)
    #define WIN32_LEAN_AND_MEAN
#endif
#include <windows.h>
#include <delayimp.h>

static HMODULE node_dll;

static FARPROC WINAPI self_exe_hook(unsigned int event, DelayLoadInfo *info)
{
    if (event == dliStartProcessing) {
        node_dll = GetModuleHandleA("node.dll");
        if (!node_dll) {
            node_dll = GetModuleHandle(NULL);
        }
        return NULL;
    }

    if (event == dliNotePreLoadLibrary && !stricmp(info->szDll, "node.exe"))
        return (FARPROC)node_dll;

    return NULL;
}

#if defined(__MINGW32__)
PfnDliHook __pfnDliNotifyHook2 = self_exe_hook;
#else
const PfnDliHook __pfnDliNotifyHook2 = self_exe_hook;
#endif
`;

// ../cnoke/src/builder.js
var DefaultOptions = {
  mode: "RelWithDebInfo"
};
function Builder(config = {}) {
  let self = this;
  let host = `${process.platform}_${determineAbi()}`;
  let project_dir = config.project_dir;
  let package_dir = config.package_dir;
  if (project_dir == null)
    project_dir = process.cwd();
  project_dir = project_dir.replace(/\\/g, "/");
  if (package_dir == null)
    package_dir = findParentDirectory(project_dir, "package.json");
  if (package_dir != null)
    package_dir = package_dir.replace(/\\/g, "/");
  let runtime_version = config.runtime_version;
  let toolchain = config.toolchain || null;
  let prefer_clang = config.prefer_clang || false;
  let mode = config.mode || DefaultOptions.mode;
  let targets = config.targets || [];
  let verbose = config.verbose || false;
  let prebuild = config.prebuild || false;
  let defines = config.defines || [];
  if (runtime_version == null)
    runtime_version = process.version;
  if (runtime_version.startsWith("v"))
    runtime_version = runtime_version.substr(1);
  let options = null;
  let cache_dir = getCacheDirectory();
  let build_dir = config.build_dir;
  let work_dir = null;
  let output_dir = null;
  if (build_dir == null) {
    let options2 = readCNokeOptions();
    if (options2.output != null) {
      build_dir = expandPath(options2.output, options2.directory);
    } else {
      build_dir = project_dir + "/build";
    }
  }
  build_dir = build_dir.replace(/\\/g, "/");
  work_dir = build_dir + `/v${runtime_version}_${toolchain ?? "native"}/${mode}`;
  output_dir = work_dir + "/Output";
  let cmake_bin = null;
  this.configure = async function(retry = true) {
    let options2 = readCNokeOptions();
    let args = [project_dir];
    checkCMake();
    checkCompatibility();
    console.log(`>> Node: ${runtime_version}`);
    console.log(`>> Toolchain: ${toolchain ?? "native"}`);
    import_node_fs3.default.mkdirSync(build_dir, { recursive: true, mode: 493 });
    import_node_fs3.default.mkdirSync(work_dir, { recursive: true, mode: 493 });
    import_node_fs3.default.mkdirSync(output_dir, { recursive: true, mode: 493 });
    retry &= import_node_fs3.default.existsSync(work_dir + "/CMakeCache.txt");
    args.push(`-DNODE_JS_EXECPATH=${process.execPath}`);
    if (options2.api == null) {
      let downloaded = false;
      if (!downloaded)
        throw new Error("Cannot download API headers");
    } else {
      console.log(`>> Using local node-api headers`);
      let api_dir = expandPath(options2.api, project_dir);
      args.push(`-DNODE_JS_INCLUDE_DIRS=${api_dir}/include`);
    }
    import_node_fs3.default.writeFileSync(work_dir + "/FindCNoke.cmake", FIND_CNOKE_CMAKE);
    args.push(`-DCMAKE_MODULE_PATH=${work_dir}`);
    let win32 = (toolchain ?? host).startsWith("win32_");
    let mingw = process.platform == "win32" && process.env.MSYSTEM != null;
    if (win32) {
      if (mingw) {
        args.push(`-DNODE_JS_LINK_LIB=node.dll`);
      } else {
        if (options2.api == null) {
          let downloaded = false;
          if (!downloaded)
            throw new Error("Cannot download Node import library");
        } else {
          let api_dir = expandPath(options2.api, project_dir);
          args.push(`-DNODE_JS_LINK_DEF=${api_dir}/def/node_api.def`);
        }
      }
      import_node_fs3.default.writeFileSync(work_dir + "/win_delay_hook.c", WIN_DELAY_HOOK_C);
      args.push(`-DNODE_JS_SOURCES=${work_dir}/win_delay_hook.c`);
    }
    if (process.platform != "win32" || mingw) {
      if ((0, import_node_child_process.spawnSync)("ninja", ["--version"]).status === 0) {
        args.push("-G", "Ninja");
      } else if (process.platform == "win32") {
        args.push("-G", "MinGW Makefiles");
      }
      if (config.ccache && (0, import_node_child_process.spawnSync)("ccache", ["--version"]).status === 0) {
        args.push("-DCMAKE_C_COMPILER_LAUNCHER=ccache");
        args.push("-DCMAKE_CXX_COMPILER_LAUNCHER=ccache");
      }
    }
    if (prefer_clang) {
      if (process.platform == "win32" && !mingw) {
        args.push("-T", "ClangCL");
      } else {
        args.push("-DCMAKE_C_COMPILER=clang");
        args.push("-DCMAKE_CXX_COMPILER=clang++");
      }
    }
    args.push(`-DCMAKE_BUILD_TYPE=${mode}`);
    for (let type of ["ARCHIVE", "RUNTIME", "LIBRARY"]) {
      for (let suffix of ["", "_DEBUG", "_RELEASE", "_RELWITHDEBINFO"])
        args.push(`-DCMAKE_${type}_OUTPUT_DIRECTORY${suffix}=${output_dir}`);
    }
    for (let define of defines)
      args.push(`-D${define}`);
    args.push("--no-warn-unused-cli");
    console.log(">> Running configuration");
    let proc = (0, import_node_child_process.spawnSync)(cmake_bin, args, { cwd: work_dir, stdio: "inherit" });
    if (proc.status !== 0) {
      unlinkRecursive(work_dir);
      if (retry)
        return self.configure(false);
      throw new Error("Failed to run configure step");
    }
  };
  this.build = async function() {
    checkCompatibility();
    if (prebuild) {
      let valid = await checkPrebuild();
      if (valid) {
        return;
      } else {
        console.error("Failed to load prebuilt binary, rebuilding from source");
      }
    }
    checkCMake();
    if (!import_node_fs3.default.existsSync(work_dir + "/CMakeCache.txt"))
      await self.configure();
    if (process.env.MAKEFLAGS == null)
      process.env.MAKEFLAGS = "-j" + (import_node_os.default.cpus().length || 1);
    let args = [
      "--build",
      work_dir,
      "--config",
      mode
    ];
    if (verbose)
      args.push("--verbose");
    for (let target of targets)
      args.push("--target", target);
    console.log(">> Running build");
    let proc = (0, import_node_child_process.spawnSync)(cmake_bin, args, { stdio: "inherit" });
    if (proc.status !== 0)
      throw new Error("Failed to run build step");
    console.log(">> Copy target files");
    syncFiles(output_dir, build_dir);
  };
  async function checkPrebuild() {
    let proc = (0, import_node_child_process.spawnSync)(process.execPath, ["-e", "require(process.argv[1])", package_dir]);
    return proc.status === 0;
  }
  this.clean = function() {
    unlinkRecursive(build_dir);
  };
  function findParentDirectory(dirname, basename) {
    if (process.platform == "win32")
      dirname = dirname.replace(/\\/g, "/");
    do {
      if (import_node_fs3.default.existsSync(dirname + "/" + basename))
        return dirname;
      dirname = import_node_path.default.dirname(dirname);
    } while (!dirname.endsWith("/"));
    return null;
  }
  function getCacheDirectory() {
    if (process.platform == "win32") {
      let cache_dir2 = process.env["LOCALAPPDATA"] || process.env["APPDATA"];
      if (!cache_dir2) {
        let home = import_node_os.default.homedir();
        if (!home)
          throw new Error("Missing LOCALAPPDATA and APPDATA environment variable");
        cache_dir2 = import_node_path.default.join(home, "AppData", "Local");
      }
      cache_dir2 = import_node_path.default.join(cache_dir2, "cnoke");
      return cache_dir2;
    } else {
      let cache_dir2 = process.env["XDG_CACHE_HOME"];
      if (!cache_dir2) {
        let home = import_node_os.default.homedir();
        if (!home)
          throw new Error("Missing HOME environment variable");
        cache_dir2 = import_node_path.default.join(home, ".cache");
      }
      cache_dir2 = import_node_path.default.join(cache_dir2, "cnoke");
      return cache_dir2;
    }
  }
  function checkCMake() {
    if (cmake_bin != null)
      return;
    if (!import_node_fs3.default.existsSync(project_dir + "/CMakeLists.txt"))
      throw new Error("This directory does not appear to have a CMakeLists.txt file");
    {
      let proc = (0, import_node_child_process.spawnSync)("cmake", ["--version"]);
      if (proc.status === 0) {
        cmake_bin = "cmake";
      } else {
        if (process.platform == "win32") {
          let proc2 = (0, import_node_child_process.spawnSync)("reg", ["query", "HKEY_LOCAL_MACHINE\\SOFTWARE\\Kitware\\CMake", "/v", "InstallDir"]);
          if (proc2.status === 0) {
            let matches = proc2.stdout.toString("utf-8").match(/InstallDir[ \t]+REG_[A-Z_]+[ \t]+(.*)+/);
            if (matches != null) {
              let bin = import_node_path.default.join(matches[1].trim(), "bin\\cmake.exe");
              if (import_node_fs3.default.existsSync(bin))
                cmake_bin = bin;
            }
          }
        }
        if (cmake_bin == null)
          throw new Error("CMake does not seem to be available");
      }
    }
    console.log(`>> Using CMake binary: ${cmake_bin}`);
  }
  function checkCompatibility() {
    let options2 = readCNokeOptions();
    if (options2.node != null && compareVersions(runtime_version, options2.node) < 0)
      throw new Error(`Project ${options2.name} requires Node.js >= ${options2.node}`);
    if (options2.napi != null) {
      let major = parseInt(runtime_version, 10);
      let required = getNapiVersion(options2.napi, major);
      if (required == null)
        throw new Error(`Project ${options2.name} does not support the Node ${major}.x branch (old or missing Node-API)`);
      if (compareVersions(runtime_version, required) < 0)
        throw new Error(`Project ${options2.name} requires Node >= ${required} in the Node ${major}.x branch (with Node-API >= ${options2.napi})`);
    }
  }
  function readCNokeOptions() {
    if (options != null)
      return options;
    let directory = project_dir;
    let pkg = null;
    let cnoke = null;
    if (package_dir != null) {
      try {
        let json = import_node_fs3.default.readFileSync(package_dir + "/package.json", { encoding: "utf-8" });
        pkg = JSON.parse(json);
        directory = package_dir;
      } catch (err) {
        if (err.code != "ENOENT")
          throw err;
      }
    }
    if (cnoke == null)
      cnoke = pkg?.cnoke ?? {};
    options = {
      name: pkg?.name ?? import_node_path.default.basename(project_dir),
      version: pkg?.version ?? null,
      directory,
      ...cnoke
    };
    return options;
  }
  function expandString(str, values = {}) {
    let expanded = str.replace(/{{ *([a-zA-Z_][a-zA-Z_0-9]*) *}}/g, (match, p1) => {
      switch (p1) {
        case "version":
          {
            let options2 = readCNokeOptions();
            return options2.version || "";
          }
          break;
        case "toolchain":
          return toolchain ?? host;
        default:
          {
            if (Object.hasOwn(values, p1)) {
              return values[p1];
            } else {
              return match;
            }
          }
          break;
      }
    });
    return expanded;
  }
  function expandPath(str, root) {
    let expanded = expandString(str);
    if (!pathIsAbsolute(expanded))
      expanded = import_node_path.default.join(root, expanded);
    expanded = import_node_path.default.normalize(expanded);
    return expanded;
  }
}

// ../cnoke/cnoke.js
var VALID_COMMANDS = ["build", "configure", "clean"];
main();
async function main() {
  let config = {};
  let command = "build";
  {
    let i = 2;
    if (process.argv.length >= 3 && process.argv[2][0] != "-") {
      let cmd = process.argv[2];
      if (VALID_COMMANDS.includes(cmd)) {
        command = cmd;
        i++;
      }
    }
    for (; i < process.argv.length; i++) {
      let arg = process.argv[i];
      let value = null;
      if (arg[0] == "-") {
        if (arg.length > 2 && arg[1] != "-") {
          value = arg.substr(2);
          arg = arg.substr(0, 2);
        } else if (arg[1] == "-") {
          let offset = arg.indexOf("=");
          if (offset > 2 && arg.length > offset + 1) {
            value = arg.substr(offset + 1);
            arg = arg.substr(0, offset);
          }
        }
        if (value == null && process.argv[i + 1] != null && process.argv[i + 1][0] != "-") {
          value = process.argv[i + 1];
          i++;
        }
      }
      if (arg == "--help") {
        printUsage();
        return;
      } else if (arg == "-D" || arg == "--directory") {
        if (value == null)
          throw new Error(`Missing value for ${arg}`);
        config.project_dir = import_node_fs4.default.realpathSync(value);
      } else if (arg == "-P" || arg == "--package") {
        if (value == null)
          throw new Error(`Missing value for ${arg}`);
        config.package_dir = import_node_fs4.default.realpathSync(value);
      } else if (arg == "-O" || arg == "--output") {
        if (value == null)
          throw new Error(`Missing value for ${arg}`);
        config.build_dir = value;
      } else if ((command == "build" || command == "configure") && arg == "--runtime") {
        if (value == null)
          throw new Error(`Missing value for ${arg}`);
        if (!value.match(/^[0-9]+\.[0-9]+\.[0-9]+$/))
          throw new Error(`Malformed runtime version '${value}'`);
        config.runtime_version = value;
      } else if ((command == "build" || command == "configure") && arg == "--clang") {
        config.prefer_clang = true;
      } else if ((command == "build" || command == "configure") && (arg == "-t" || arg == "--toolchain")) {
        if (value == null)
          throw new Error(`Missing value for ${arg}`);
        config.toolchain = value;
      } else if (arg == "-c" || arg == "--config") {
        if (value == null)
          throw new Error(`Missing value for ${arg}`);
        switch (value.toLowerCase()) {
          case "relwithdebinfo":
            {
              config.mode = "RelWithDebInfo";
            }
            break;
          case "debug":
            {
              config.mode = "Debug";
            }
            break;
          case "release":
            {
              config.mode = "Release";
            }
            break;
          default:
            {
              throw new Error(`Unknown value '${value}' for ${arg}`);
            }
            break;
        }
      } else if (arg == "--debug") {
        config.mode = "Debug";
      } else if (arg == "--release") {
        config.mode = "Release";
      } else if ((command == "build" || command == "configure") && arg == "--ccache") {
        config.ccache = true;
      } else if ((command == "build" || command == "configure") && (arg == "-d" || arg == "--define")) {
        if (value == null)
          throw new Error(`Missing value for ${arg}`);
        config.defines ??= [];
        config.defines.push(value);
      } else if (command == "build" && arg == "--prebuild") {
        config.prebuild = true;
      } else if (command == "build" && arg == "--target") {
        if (value == null)
          throw new Error(`Missing value for ${arg}`);
        config.targets = [value];
      } else if (command == "build" && (arg == "-v" || arg == "--verbose")) {
        config.verbose = true;
      } else {
        if (arg[0] == "-") {
          throw new Error(`Unexpected argument '${arg}'`);
        } else {
          throw new Error(`Unexpected value '${arg}'`);
        }
      }
    }
  }
  try {
    let builder = new Builder(config);
    await builder[command]();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
function printUsage() {
  let help = `Usage: cnoke [command] [options...]

Commands:

    configure                            Configure CMake build
    build                                Build project (configure if needed)
    clean                                Clean build files

Options:

    -D, --directory <DIR>                Change source directory
                                         (default: current working directory)
    -P, --package <DIR>                  Change package directory
                                         (default: current working directory)
    -O, --output <DIR>                   Set explicit output directory
                                         (default: ./build)

    -c, --config <CONFIG>                Change build type: RelWithDebInfo, Debug, Release
                                         (default: ${DefaultOptions.mode})
        --debug                          Shortcut for --config Debug
        --release                        Shortcut for --config Release

        --ccache                         Use ccache if available

    -t, --toolchain <TOOLCHAIN>          Cross-compile for specific platform
        --runtime <VERSION>              Change node version
                                         (default: ${process.version})
        --clang                          Use Clang instead of default CMake compiler

        --prebuild                       Use prebuilt binary if available
        --target <TARGET>                Only build the specified target

    -v, --verbose                        Show build commands while building

The ARCH value is similar to process.arch, with the following differences:

- arm is changed to arm32hf or arm32sf depending on the floating-point ABI used (hard-float, soft-float)
- riscv32 is changed to riscv32sf, riscv32hf32, riscv32hf64 or riscv32hf128 depending on the floating-point ABI
- riscv64 is changed to riscv64sf, riscv64hf32, riscv64hf64 or riscv64hf128 depending on the floating-point ABI`;
  console.log(help);
}
