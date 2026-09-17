# Version history

> [!NOTE]
> Consult the [migration guide](migration) to migrate between major Koffi versions.

## Koffi 3

### Koffi 3.3

#### Koffi 3.3.0

*Released on 2026-09-14*

- Add support for Power64 ELFv2 Little-Endian ABI
- Add OpenBSD ARM64 prebuild (@koromix/koffi-openbsd-arm64)
- Perform endianness conversion when using typed arrays with pointer arguments
- Support Typed array hint for 64-bit big ints
- Add minor performance optimizations
- Fix misused fast call routine

### Koffi 3.2

#### Koffi 3.2.1

*Released on 2026-09-04*

- Add Android ARM64 prebuild (@koromix/koffi-android-arm64)
- Add Android x64 prebuild (@koromix/koffi-android-x64)

#### Koffi 3.2.0

*Released on 2026-09-02*

- Make errno and GetLastError() available in async callbacks
- Merge forward call interpreters
- Switch to shared bytecode implementation for callbacks
- Restore support for ARM32 ABIs
- Add "callbacks" member to TypeScript result definition for `koffi.stats()`
- Improve performance of GCC builds
- Optimize allocation and preparation for simple calls
- Remove unnecessary map of registered trampoline pointers

### Koffi 3.1

#### Koffi 3.1.6

*Released on 2026-08-20*

- Fix crash when calling `koffi.register()` before loading any library

#### Koffi 3.1.5

*Released on 2026-08-13*

- Revert to native compilation for Windows builds for stability
- Avoid using `statx()` to allow compilation with... stuff

#### Koffi 3.1.4

*Released on 2026-07-31*

- Clear unused register/stack bytes when pushing bool arguments on Win64 and i386
- Dump count of busy static callback trampolines in `koffi.stats()`

#### Koffi 3.1.3

*Released on 2026-07-30*

- Detect Linux libc dynamically:
  * Avoid trying to load glibc build when running musl-based Node binary
  * Fix a crash when loading Koffi binary in Alpine ARM64
- Cross-compile Linux/glibc, Linux/musl, FreeBSD and Windows builds with Clang

#### Koffi 3.1.2

*Released on 2026-07-20*

- Fix crash when trying to run async callback during shutdown
- Perform buffer length check after array type expansion
- Prevent buffer overflow when computing string length (when buffer has known size)
- Support calling `koffi.encode()` with negative (automatic) lengths

#### Koffi 3.1.1

*Released on 2026-07-10*

- Restore missing Windows ARM64 build
- Slightly optimize memory allocation routines

#### Koffi 3.1.0

*Released on 2026-06-29*

- Add endian-sensitive integer decoding functions
- Drop useless but required type specifier from `lib.symbol()`
- Add `wstring` type alias for wide strings
- Add platform-dependent `koffi.decode.wstring()` function
- Improve performance of various functions and value conversions
- Optimize Windows build flags
- Fix static native loading from the koffi ESM entry point ([@yibe](https://codeberg.org/yibe))
- Fix minor memory and reference leaks on exit
- Fix length argument types in TypeScript definition
- Reorganize documentation

### Koffi 3.0

#### Koffi 3.0.2

*Released on 2026-05-26*

- Fix unexpected type error when passing array of pointers (see [Koromix/koffi#269](https://github.com/Koromix/koffi/issues/269))
- Search more native addon directories under `process.resourcesPath`
- Rearrange Koffi loading to use `require()` for static packages
- Avoid declare module syntax in TypeScript definition file
- Fix error when using *String* array hint with UTF-32 string types (`const char32_t *`)
- Add *Buffer* array hint to convert arrays and pointers to Node Buffer objects
- Reduce overhead of various Koffi functions

#### Koffi 3.0.1

*Released on 2026-05-20*

- Fix error when importing default koffi module from TypeScript
- Optimize creation of new JS objects for return values
- Adjust build flags for performance

#### Koffi 3.0.0

*Released on 2026-05-16*

**Highlights:**

- Rewrite call preparation and execution for **vastly improved performance**
- Distribute prebuilt binaries in **separate subpackages**

**Breaking changes:**

- Replace use of externals with type objects:
  * Use `koffi.type()` to resolve type specifiers (strings or objects) to type objects
  * Access type information directly on type objects without `koffi.introspect()`
- Replace use of externals with BigInt pointers

**Other changes:**

- Support ESM and CJS module types
- Add `koffi.enumeration()` to create [enum types](input#enum-types)
- Add fast decode functions for integers, floats and strings
- Use proper types for various objects and handles:
  * Use *LibraryHandle* objects for loaded libraries
  * Use *TypeObject* objects for Koffi types
  * Use *PollHandle* for socket poll handles
- Add `Symbol.dispose` on library objects and poll handles
- Prefer types to interfaces in TypeScript declaration file
- Fix various bugs and small leaks (such as library handles)
- The ARM32 backend has been temporarily removed

**Newly deprecated functions:**

- Deprecate `koffi.resolve()` function, replace with `koffi.type()`
- Deprecate `koffi.introspect()` function, replace with `koffi.type()`

**Removed deprecated functions:**

- Remove `koffi.callback()` long replaced with `koffi.proto()`
- Remove `koffi.handle()` long replaced with `koffi.opaque()`

Consult the [migration guide](migration) for more information.

## Koffi 2

### Koffi 2.16

#### Koffi 2.16.3

*Released on 2026-07-20*

- Fix crash when trying to run async callback during shutdown

#### Koffi 2.16.2

*Released on 2026-05-06*

- Fix string truncation bugs when passing some kinds of long V8 strings (see [Koromix/koffi#266](https://github.com/Koromix/koffi/issues/266))

#### Koffi 2.16.1

*Released on 2026-04-17*

- Fix possible stack check crash when relaying callbacks on Windows
- Improve exception handling inside callbacks

#### Koffi 2.16.0

*Released on 2026-04-14*

- Support buffers and typed arrays in `koffi.address()`
- Put x86 SEH record at the top of stack frame
- Optimize Koffi binaries produced by GCC (with `-fno-semantic-interposition`)
- Fix nonsensical addresses in Koffi call dumps (when using DUMP_CALLS=1 environment variable)

- Reduce Koffi package size even more:
  * Replace table of callback trampoline pointers with simple offset computation
  * Strip out unused data and functions from Koffi binaries
  * Generate repeated trampoline source and macros at build time
  * Remove files not needed to build from source: tests, scripts, etc.
  * Maximize NPM tarball compression with Zopfli
- This reduces decompressed Koffi package size from 41.4 MB to 28.7 MB

### Koffi 2.15

#### Koffi 2.15.6

*Released on 2026-04-07*

- Fix possible exit crash after using `koffi.reset()` (regression introduced in Koffi 2.15.2)

#### Koffi 2.15.5

*Released on 2026-04-05*

- Reduce repeated trampoline code size:
  * Use single set of trampolines to forward general and floating-point values
  * Minimize trampoline size by jumping early to common handling code
- This reduces decompressed Koffi package size from 85.9 MB to 41.4 MB

#### Koffi 2.15.4

*Released on 2026-04-03*

- Fix ABI issue with variadic parameters that are passed on the stack on Apple ARM64 platforms
- Remove erroneous assertion from debug builds

#### Koffi 2.15.3

*Released on 2026-04-03*

- Fix "IsOnCentralStack()" assertion/crash when using callbacks in recent Node versions
- Support SetUnhandledExceptionFilter on Windows x64 and x86 ([@longhun12346](https://github.com/longhun12346))
- Fix incorrect stack alignment when relaying callbacks on 32-bit x86 platforms

#### Koffi 2.15.2

*Released on 2026-03-11*

- Fix possible deadlock or crash after a callback has been used when exiting from Node 24.14+
- Fix build problems on Android/Termux
- Fix failing indirect loading caused by missing path test
- Don't force users to set all members when using koffi.config() in TypeScript
- Use Clang to build Linux ARM64 prebuild

#### Koffi 2.15.1

*Released on 2026-01-24*

- Fix possible union-related crashes
- Support MinGW-w64 x64 builds on Windows

#### Koffi 2.15.0

*Released on 2025-12-21*

- Fix parsing error with some parameter types that could lead to weird crashes (regression introduced in Koffi 2.14)
- Fix rare data race in Koffi memory allocation/release
- Increase default and maximum length of async call queue
- Decrease default stack and heap size used for async calls
- Add API to poll sockets with Node libuv event loop ([@mkicherer](https://github.com/mkicherer))
- Fix erroneous UTF-32 range checks when decoding UTF-32 buffers ([@VastBlast](https://github.com/VastBlast))
- Fix possible overflow when encoding malformed UTF-16 to UTF-32
- Throw error when using negative offset in encode and decode functions ([@VastBlast](https://github.com/VastBlast))
- Use proper Unicode replacement char in UTF-32 routines

> [!NOTE]
> The socket polling/libuv integration API is not yet documented and might change in subsequent releases. You've been warned!

### Koffi 2.14

#### Koffi 2.14.1

*Released on 2025-09-13*

- Recompile Linux (musl) ARM64 prebuild with Alpine 3.20 (instead of Alpine edge)
- Clean up redundant code paths for handling string arguments

#### Koffi 2.14.0

*Released on 2025-08-17*

- Improve support for structs with [flexible array member](input#flexible-arrays)
- Automatically encode/decode dynamic arrays pointers when length is known though struct member
- Fix parser crash when direction qualifier is followed by unknown type
- Add missing TypeScript types and arguments

### Koffi 2.13

#### Koffi 2.13.0

*Released on 2025-08-07*

- Support anonymous function prototype types (`koffi.proto()`)
- Accept null or undefined name to define anonymous composite or pointer types

### Koffi 2.12

#### Koffi 2.12.4

*Released on 2025-08-05*

- Fix build with old glibc or musl versions

#### Koffi 2.12.3

*Released on 2025-07-28*

- Add missing TypeScript overloads for struct redefinition
- Add missing TypeScript member parameter in `koffi.offsetof()`
- Add missing TypeScript declaration for `koffi.view()`
- Add primitive type names to TypeScript
- Simplify TypeScript module declaration

#### Koffi 2.12.2

*Released on 2025-07-16*

- Validate identifiers against Unicode XID table
- Skip struct and union members with placeholder name '\_'
- Add Koffi prebuild for Linux (musl) ARM64

> [!NOTE]
> The Koffi 3 codebase has been put aside, and some of it will be progressively integrated into Koffi 2 over the following months.

#### Koffi 2.12.1

*Released on 2025-07-05*

- Fix type errors when casting function pointers

#### Koffi 2.12.0

*Released on 2025-06-19*

- Support LoongArch64 architecture (thanks to [wjh-la](https://github.com/wjh-la))
- Fix wrong path for RISC-V 64 prebuild

### Koffi 2.11

#### Koffi 2.11.0

*Released on 2025-04-09*

- Add `koffi.view()` to [access memory without copy](pointers#external-buffers-views)
- Various documentation fixes and improvements

### Koffi 2.10

#### Koffi 2.10.1

*Released on 2025-01-24*

- Fix detection of ARM32 in build script in some cases
- Fix wrong path for ARM32 prebuild

#### Koffi 2.10.0

*Released on 2024-12-22*

- Allow [redefinition of opaque types](misc#circular-references) to concrete struct or union
- Clear out executable stack bit from ELF targets (`-z noexecstack`)
- Update documentation style

### Koffi 2.9

#### Koffi 2.9.2

*Released on 2024-11-08*

- Fix non-aligned pointers when pushing UTF-16 and UTF-32 string parameters
- Various documentation fixes and improvements

#### Koffi 2.9.1

*Released on 2024-09-23*

- Fix x86 32-bit support regression in 2.9.0
- Add missing TS definition for `koffi.alloc()`
- Support `koffi.load(null)` in TS definition file

#### Koffi 2.9.0

*Released on 2024-07-22*

- Add support for char32_t and wchar_t (wide) strings
- Include Linux/musl x64 prebuild (based on Alpine)

### Koffi 2.8

#### Koffi 2.8.11

*Released on 2024-06-19*

- Work around MSVC compiler bug introduced in Visual Studio 17.10

> [!WARNING]
> Use on platforms without pre-built binaries is broken in Koffi 2.8.10, skip this version.

#### Koffi 2.8.9

*Released on 2024-05-17*

- Fix ABI issue regarding bool return values on x86_64 (and possibly other platforms)

#### Koffi 2.8.8

*Released on 2024-04-26*

- Support use of buffers with mismatched size (truncation or zero-filling)

#### Koffi 2.8.7

*Released on 2024-04-23*

- Improve compatibility with SEHOP on Windows ([@longhun12346](https://github.com/longhun12346))

#### Koffi 2.8.6

*Released on 2024-04-12*

- Support [loading library](functions#loading-options) with RTLD_DEEPBIND where supported

#### Koffi 2.8.5

*Released on 2024-04-11*

- Prevent obviously invalid type and member names
- Fix possible infinite loop / UB for `koffi.load()` errors on POSIX systems
- Fix null return value instead of exception for some errors in `koffi.load()` on Windows

#### Koffi 2.8.4

*Released on 2024-04-09*

- Use simpler workaround for Node 20.12+ and 21.6+ to avoid excessive memory use

> [!WARNING]
> Some pre-built binaries are missing in Koffi 2.8.3, skip this version.

#### Koffi 2.8.2

*Released on 2024-04-07*

- Support [loading library](functions#loading-options) with RTLD_GLOBAL on POSIX platforms

#### Koffi 2.8.1

*Released on 2024-04-04*

- Fix incompatibility with Node 20.12+ and 21.6+

#### Koffi 2.8.0

*Released on 2024-02-12*

- Support pushing pointers for string arguments
- Add `koffi.alloc()` for [stable pointers](output#stable-pointers)

### Koffi 2.7

#### Koffi 2.7.4

*Released on 2024-02-04*

- Support callbacks happening on main thread but outside JS call (such as during event loop)
- Improve stability after `koffi.reset()`
- Expose internal Node/NAPI `env` pointer
- Name main Koffi API functions

#### Koffi 2.7.3

*Released on 2024-01-26*

- Support decoding NULL terminated arrays

#### Koffi 2.7.2

*Released on 2024-01-15*

- Add missing TypeScript declaration for `koffi.free()`
- Fix TypeScript declaration of `koffi.encode()`
- Try to improve compatibility with webpack

#### Koffi 2.7.1

*Released on 2024-01-02*

- Support C-like `int[3]` syntax for [fixed array types](input#fixed-size-c-arrays)
- Refuse type specifiers with invalid tokens at the end (previously ignored)

#### Koffi 2.7.0

*Released on 2023-12-21*

- Support alternative [callback calling convention](callbacks#callback-types) in classic syntax
- Change syntax for [calling conventions](functions#calling-conventions) with classic syntax
- Drop unused "internal" property from Koffi

### Koffi 2.6

#### Koffi 2.6.12

*Released on 2023-12-11*

- Fix possible crash introduced in Koffi 2.6.11

#### Koffi 2.6.11

*Released on 2023-12-05*

- Speed up resolving simple and often used type names
- Fix use of optional length argument with [koffi.encode()](values#encode-to-c-memory)

#### Koffi 2.6.10

*Released on 2023-11-29*

- Protect GetLastError() value from Node.js and V8 on Windows

#### Koffi 2.6.9

*Released on 2023-11-25*

- Search in DLL directory for additional dependencies on Windows
- Ignore prototype properties when making structs or unions
- Show detected version of Node when not adequate
- Minor documentation fixes

> [!WARNING]
> Loading Win32 system libraries can fail in Koffi 2.6.8, skip this version.

#### Koffi 2.6.6

*Released on 2023-10-28*

- Better handle errors while making struct or union types

#### Koffi 2.6.5

*Released on 2023-10-28*

- Allow self-referential structs and unions
- Fix rare Node.js "FATAL ERROR" with some invalid type specifiers

#### Koffi 2.6.4

*Released on 2023-10-26*

- Fix build issue with recent Visual Studio versions

#### Koffi 2.6.3

*Released on 2023-10-17*

- Add indirect loading script to help some bundlers

> [!WARNING]
> Pre-built binaries don't work correctly in Koffi 2.6.2, skip this version.

#### Koffi 2.6.1

*Released on 2023-09-18*

- Support string direction qualifiers in classic function definitions
- Fix possible off-by-one array access when parsing type name

#### Koffi 2.6.0

*Released on 2023-09-13*

**New features:**

- Use [koffi.symbol()](values#variable-definitions) to make pointers to exported variables (or other symbols)
- Use [koffi.encode()](values#encode-to-c-memory) to explictly encode data from JS to C memory
- Use shared library [lazy-loading](functions#loading-options) (RTLD_LAZY) on POSIX platforms

**Other changes:**

- Print more helpful error for Win32/Win64 DLL mismatches
- Add missing 'Union' primitive value in TS definition file

### Koffi 2.5

#### Koffi 2.5.20

*Released on 2023-08-31*

- Fix possible crash with async registered callbacks introduced in Koffi 2.5.19
- Various documentation fixes and improvements

#### Koffi 2.5.19

*Released on 2023-08-29*

- Create thread-safe function broker lazily
- Add [koffi.reset()](misc#reset-internal-state) for type names and async broker

#### Koffi 2.5.18

*Released on 2023-08-27*

- Fix compatibility with Electron

#### Koffi 2.5.16

*Released on 2023-08-25*

- Run Koffi tests through usual index.js entry point
- Fix DLL error when using Koffi from NW.js on Windows
- Simplify NW.js Koffi example

> [!WARNING]
> Pre-built binaries don't work correctly in Koffi 2.5.13 to 2.5.15, skip those versions.

#### Koffi 2.5.12

*Released on 2023-08-21*

- Fix native module bundling for FreeBSD ARM64 and Linux RISC-V 64
- Increase maximum number of parameters to 64

#### Koffi 2.5.11

*Released on 2023-08-03*

- Support casting function pointers with [koffi.as()](pointers#handling-void-pointers)
- Build in C++20 mode

#### Koffi 2.5.10

*Released on 2023-08-01*

- Fix CMake regression when client has to build Koffi

#### Koffi 2.5.9

*Released on 2023-07-28*

**Main changes:**

- Use bundler-friendly static require calls in Koffi
- Add packaging examples to documentation

**Other changes:**

- Add missing unload() export to TS file
- Add export for koffi.types in TS file

#### Koffi 2.5.8

*Released on 2023-07-26*

- Add more search paths for native Koffi modules
- Add section [about bundling](start#bundling-koffi) to documentation

#### Koffi 2.5.7

*Released on 2023-07-19*

- Point package to new repository

#### Koffi 2.5.6

*Released on 2023-07-19*

- Increase limit of output parameters from 16 to 32

#### Koffi 2.5.5

*Released on 2023-07-17*

- Support decoding non-char null-terminated arrays

#### Koffi 2.5.4

*Released on 2023-07-14*

- Fix `koffi.pointer()` not accepting disposable types
- Fix potential issues when making pointers to anonymous types

#### Koffi 2.5.3

*Released on 2023-07-05*

- Add missing union exports in TS definition file
- Fix some parameter names in TS definition file

#### Koffi 2.5.2

*Released on 2023-07-04*

- Default initialize unset object/struct members

#### Koffi 2.5.1

*Released on 2023-06-20*

- Fix crash with some struct types in System V 64 ABI
- Always use direct passthrough for buffer arguments

#### Koffi 2.5.0

*Released on 2023-06-20*

**New features:**

- Support [union types](unions)

**Other fixes:**

- Fix ABI for single-float aggregate return on i386 BSD systems
- Don't mess with Node.js signal handling on POSIX systems

### Koffi 2.4

#### Koffi 2.4.2

*Released on 2023-06-04*

- Support calling variadic function pointers
- Add documentation for function pointers

#### Koffi 2.4.1

*Released on 2023-06-03*

**Main changes:**

- Support [decoding function pointers](functions#decode-pointer-to-function) to callable functions
- Support calling function pointers with [koffi.call()](functions#call-pointer-directly)
- Deprecate `koffi.callback` in favor of `koffi.proto`

**Other changes:**

- Increase maximum number of callbacks to 8192
- Build Koffi with static CRT on Windows
- Reorganize Koffi data conversion documentation
- Add deprecated `koffi.handle` to TS file

### Koffi 2.3

#### Koffi 2.3.20

*Released on 2023-05-15*

- Support explicit library unloading with `lib.unload()`

#### Koffi 2.3.19

*Released on 2023-04-21*

- Actually allow non-ambiguous [string] values for `void *` arguments

#### Koffi 2.3.18

*Released on 2023-04-21*

- Fix possible crash on exit caused by unregistered callbacks

#### Koffi 2.3.17

*Released on 2023-04-20*

- Allow strings for input `void *`, `int8_t *` and `int16_t *` pointer arguments
- Support using `[string]` (single-element string arrays) for polymorphic input/output arguments

#### Koffi 2.3.16

*Released on 2023-04-11*

- Fix Windows ARM64 build to work with official Node.js version
- Compile Windows builds with Visual Studio 2022 17.5.3
- Support null in `koffi.free()` and `koffi.address()`

#### Koffi 2.3.15

*Released on 2023-04-10*

- Improve manual decoding of 0-terminated strings
- Add checks around array conversion hints

#### Koffi 2.3.14

*Released on 2023-04-05*

- Add `koffi.errno()` function to get and set current errno value
- Add `koffi.os.errno` object with valid errno codes

#### Koffi 2.3.13

*Released on 2023-03-30*

- Add `koffi.address()` to get the raw value of a wrapper pointer

#### Koffi 2.3.12

*Released on 2023-03-30*

- Fix broken syntax in TS definition file
- Add missing exported properties in TS file

#### Koffi 2.3.11

*Released on 2023-03-30*

**Main changes:**

- Allow numbers and BigInts to be used for pointer arguments

**Other changes:**

- Use SQLITE_TRANSIENT in SQLite test code
- Avoid using `statx()` to allow compilation with glibc < 2.28
- Reorganize NPM package files to be less convoluted

#### Koffi 2.3.9

*Released on 2023-03-10*

- Relicense under MIT license

#### Koffi 2.3.8

*Released on 2023-02-28*

- Disable non-ready union support
- Simplify Windows stack allocation and drop NOACCESS and GUARD pages
- Adjust Windows TEB SEH chain and GuaranteedStackBytes for Koffi calls

#### Koffi 2.3.7

*Released on 2023-02-27*

- Fix missing require in index.js ([@gastonFrecceroNapse](https://github.com/gastonFrecceroNapse))
- Reduce NPM package bloat (from 65 MB to 20 MB) caused by changes in 2.3.6

#### Koffi 2.3.6

*Released on 2023-02-26*

- Fix broken TS definition file
- Keep all prebuilt binaries and load correct one at runtime

#### Koffi 2.3.5

*Released on 2023-02-24*

**Main fixes:**

- Fix rare random crashes with async callbacks
- Fix some bugs with RISC-V 64 ABI

**Other changes:**

- Expose array type hint in `koffi.introspect()`
- Add missing `koffi.array()` export in TS definition
- Make KoffiFunction more flexible in TS definition ([@insraq](https://github.com/insraq))
- Add a KoffiFunc<T> helper type in TS typing ([@insraq](https://github.com/insraq))
- Mark optional properties in TS TypeInfo class
- Minor performance improvements

#### Koffi 2.3.4

*Released on 2023-01-31*

- Fix error when installing Koffi on Windows (2.3.2)

#### Koffi 2.3.2

*Released on 2023-01-30*

**Main changes:**

- Fix type parser issues (such as ignoring some [disposable qualifiers](pointers#disposable-types))
- Fix crash when using disposable types in output parameters
- Add basic [koffi.stats()](misc#usage-statistics) interface

**Other changes:**

- Avoid CNoke dependency
- Clear out development dependencies from package.json

#### Koffi 2.3.1

*Released on 2023-01-30*

- Error out when trying to use ambiguous `void *` arguments (input and/or output)
- Adjust TypeScript definitions ([@insraq](https://github.com/insraq))
- Fix possible crash when parsing invalid prototype

#### Koffi 2.3.0

*Released on 2023-01-25*

**Main changes:**

- Allow buffers (TypedArray or ArrayBuffer) values for input and/or output pointer arguments (for polymorphic arguments)
- Support opaque buffers (TypedArray or ArrayBuffer) values in `koffi.decode()` to [decode output buffers](output#output-buffers)
- Decode non-string types as arrays when an [explicit length is passed to koffi.decode()](callbacks#decoding-pointer-arguments)

**Other changes:**

- Drop TypedArray type check for array and pointer values (only the size matters)
- Allow ArrayBuffer everywhere TypedArray is supported
- Add TypeScript definition for Koffi ([@insraq](https://github.com/insraq))
- Improve documentation about opaque and polymorphic structs
- Improve documentation for `koffi.decode()`
- Reduce NPM package size (from 100 MB to 25 MB) by removing test code and dependencies

### Koffi 2.2

#### Koffi 2.2.5

*Released on 2023-01-23*

- Relicense Koffi under LGPL 3.0

#### Koffi 2.2.4

*Released on 2023-01-19*

- Fix memory leak on Windows (in Koffi 2.2.3) when running many async calls
- Reorganize documentation pages

#### Koffi 2.2.3

*Released on 2023-01-17*

- Support native code that uses [Structured Exception Handling (SEH)](https://learn.microsoft.com/en-us/cpp/cpp/structured-exception-handling-c-cpp) on Windows (x86, x64 and ARM64)
- Try to use ebp/rbp as frame pointer in x86/x64 ASM code

#### Koffi 2.2.2

*Released on 2023-01-14*

**Main fixes:**

- Support transparent [asynchronous callbacks](callbacks#asynchronous-callbacks)
- Expand from a maximum of 16+16 to 1024 callbacks running in parallel

**Other fixes:**

- Fix bundler support by removing shebang from index.js
- Fix bugs when loading Koffi multiples times in same process (context aware module)
- Check N-API version when module is loaded
- Optimize callback unregistration

#### Koffi 2.2.1

*Released on 2022-12-21*

- Fix crash when [calling callback again after FFI call inside previous callback](https://github.com/Koromix/rygel/issues/15)

#### Koffi 2.2.0

*Released on 2022-12-20*

**New features:**

- Add [koffi.decode()](callbacks#decoding-pointer-arguments) for callback pointer arguments
- Support transparent [output string parameters](output#string-buffer-example)
- Add `koffi.offsetof()` utility function
- Support optional *this* binding in `koffi.register()`

**Other fixes:**

- Correctly validate output parameter types
- Fix assertion with `void *` parameters

### Koffi 2.1

#### Koffi 2.1.5

*Released on 2022-11-27*

- Add missing README file to NPM package

#### Koffi 2.1.4

*Released on 2022-11-25*

**Main changes:**

- Increase maximum type size from 32 kiB to 64 MiB
- Add configurable option for maximum type size

**Other changes:**

- Moved Koffi to a new repository: https://codeberg.org/Koromix/rygel/

#### Koffi 2.1.3

*Released on 2022-10-31*

- Support up to 16 output parameters (instead of 8)

#### Koffi 2.1.2

*Released on 2022-10-31*

- Support up to 8 output parameters (instead of 4)

#### Koffi 2.1.1

*Released on 2022-08-16*

- Fix potential memory allocation bugs

#### Koffi 2.1.0

*Released on 2022-08-13*

**Main changes:**

- Add [koffi.as()](pointers#handling-void-pointers) to support polymorphic APIs based on `void *` parameters
- Add [endian-sensitive integer types](input#endian-sensitive-integers): `intX_le_t`, `intX_be_t`, `uintX_le_t`, `uintX_be_t`
- Accept typed arrays for `void *` parameters
- Introduce `koffi.opaque()` to replace `koffi.handle()` (which remains supported until Koffi 3.0)
- Support JS Array and TypedArray to fill struct and array pointer members

**Other changes:**

- Improve global performance with inlining and unity builds
- Add `size_t` primitive type
- Support member-specific alignement values in structs
- Detect impossible parameter and return types (such as non-pointer opaque types)
- Various documentation fixes and improvements

### Koffi 2.0

#### Koffi 2.0.1

*Released on 2022-07-30*

- Return `undefined` (instead of null) for `void` functions

#### Koffi 2.0.0

*Released on 2022-07-29*

**Major new features:**

- Add [disposable types](pointers#disposable-types) for automatic disposal of C values (such as heap-allocated strings)
- Add support for [registered callbacks](callbacks#registered-callbacks), that can be called after the initial FFI call
- Support named pointer types
- Support complex type specifications outside of prototype parser

**Minor new features:**

- Support type aliases with `koffi.alias()`
- Add `koffi.resolve()` to resolve type strings
- Expose all primitive type aliases in `koffi.types`
- Correctly pass exceptions thrown in JS callbacks

**Breaking API changes:**

- Change handling of callback types, which must be used through pointers
- Change handling of opaque handles, which must be used through pointers
- Support all types in `koffi.introspect(type)`

Consult the [migration guide](migration) for more information.

## Koffi 1

### Koffi 1.3

#### Koffi 1.3.12

*Released on 2022-07-27*

- Fix support for Yarn package manager

#### Koffi 1.3.11

*Released on 2022-07-26*

- Fix broken parsing of `void *` when used for first parameter

#### Koffi 1.3.10

*Released on 2022-07-25*

**Main fixes:**

- Fix support for callbacks with more than 4 parameters on Windows x64
- Fix support for callbacks with multiple floating-point arguments on ARM32 platforms
- Fix possibly incorrect conversion for uint32_t callback parameters

**Other changes:**

- Various documentation fixes and improvements

#### Koffi 1.3.9

*Released on 2022-07-15*

- Fix prebuild compatibility with Electron on Windows x64

#### Koffi 1.3.8

*Released on 2022-07-12*

**Main changes:**

- Prevent callback reuse beyond FFI call
- Add BTI support for AAarch64 platforms (except Windows)

**Other changes:**

- Fix and harmonize a few error messages

#### Koffi 1.3.7

*Released on 2022-07-07*

**Main fixes:**

- Fix crash when using callbacks inside structs
- Support for null strings in record members

**Other changes:**

- Add intptr_t and uintptr_t primitive types
- Add str/str16 type aliases for string/string16
- Various documentation fixes and improvements

#### Koffi 1.3.6

*Released on 2022-07-01*

**Main fixes:**

- Fix install error with Node < 15 on Windows (build system bug)

**Other changes:**

- Detect incompatible Node.js versions when installing Koffi
- Prebuild with Clang for Windows x64 and Linux x64 binaries
- Various documentation improvements

#### Koffi 1.3.5

*Released on 2022-06-25*

**Main changes:**

- Fix memory leak when many async calls are running
- Add configurable limit for maximum number of async calls (max_async_calls)

**Other changes:**

- Reduce default async memory stack and heap size
- Various documentation improvements

#### Koffi 1.3.4

*Released on 2022-06-24*

- Fix possible OpenBSD i386 crash with `(void)` functions

#### Koffi 1.3.3

*Released on 2022-06-24*

**Main fixes:**

- Fix misconversion of signed integer return value as unsigned

**Other changes:**

- Support `(void)` (empty) function signatures
- Disable unsafe compiler optimizations
- Various documentation improvements

#### Koffi 1.3.2

*Released on 2022-06-23*

- Support compilation in C++14 mode (graceful degradation)
- Support older toolchains on Linux (tested on Debian 9)

#### Koffi 1.3.1

*Released on 2022-06-22*

- The prebuilt binary is tested when Koffi is installed, and a rebuild happens if it fails to load

#### Koffi 1.3.0

*Released on 2022-06-22*

**Major changes:**

- Expand and move documentation to https://koffi.dev/
- Support JS arrays and TypedArrays for pointer arguments (input, output and mixed)

**Other changes:**

- Convert NULL string pointers to null instead of crashing (return values, struct and array members, callbacks)
- Default to 'string' array hint for char, char16 and char16_t arrays
- Fix definition of long types on Windows x64 (LLP64 model)
- Restrict automatic string conversion to signed char types
- Detect floating-point ABI before using prebuilt binaries (ARM32, RISC-V)
- Forbid duplicate member names in struct types

### Koffi 1.2

#### Koffi 1.2.4

*Released on 2022-06-12*

- Windows ARM64 is now supported

#### Koffi 1.2.3

*Released on 2022-06-11*

- A prebuilt binary for macOS ARM64 (M1) is now included

#### Koffi 1.2.1

*Released on 2022-06-11*

This entry documents changes since version 1.1.0.

**New features:**

- JS functions can be used as C callbacks (cdecl, stdcall) on all platforms
- RISC-V 64 LP64D ABI is supported (LP64 is untested)
- Expose settings for memory usage of synchronous and asynchronous calls
- Transparent conversion between C buffers and strings
- Tentative support for Windows ARM64 (untested)

**Main fixes:**

- Fix excessive stack alignment of structs on x86 platforms
- Fix potential problems with big int64_t/uint64_t values
- Fix possible struct layout errors in push/pop code
- Fix alignment issues in ARM32 push code
- Fix incomplete/buggy support for HFA structs on ARM32 and ARM64
- Fix crashes on OpenBSD caused by missing MAP_STACK flag
- Fix non-sense "duplicate array type" errors
- Fix value `koffi.internal` to false in module (normal) builds
- Make sure we have a redzone below the stack for all architectures
- Use slower allocation for big objects instead of failing

# Todo list

The following features and improvements are planned, not necessarily in that order:

- Optimize passing of structs and arrays (with auto-generated JS)
- Automate Windows/AArch64 (qemu) and macOS/AArch64 (how? ... thanks Apple) tests
- Create a real-world example, using several libraries (Raylib, SQLite, libsodium) to illustrate various C API styles
- Add simple struct type parser
- Fix assembly unwind and CFI directives for better debugging experience
