# Overview

This pages presents the execution time of Koffi calls on three benchmarks, where it is compared to a theoretical ideal FFI implementation (approximated with pre-compiled static Node-API glue code), and other FFI implementations:

- The first benchmark is based on `atoi()` calls
- The second benchmark is based on `memset()` calls
- The third benchmark is based on Raylib

# Linux x86_64

The results presented below were measured on my x86_64 Linux machine (Intel® Core™ Ultra 9 185H).

<div class="benchmark chart" data-platform="linux_x64"></div>

## atoi results for Linux x86_64 ^ atoi results

This test is based on `atoi`, which takes a string parameter. Javascript (V8) to C string conversion is relatively slow and heavy.

<div class="benchmark table" data-platform="linux_x64" data-benchmark="atoi"></div>

## memset results for Linux x86_64 ^ memset results

This test is based around repeated calls to the standard C function `memset`. All implementations pass a Node.js Buffer for the pointer argument.

<div class="benchmark table" data-platform="linux_x64" data-benchmark="memset"></div>

## Raylib results for Linux x86_64 ^ Raylib results

This benchmark uses the CPU-based image drawing functions in Raylib. The calls are much heavier than in the atoi benchmark, thus the FFI overhead is reduced. In this implementation, Koffi is compared to:

- [node-raylib](https://github.com/RobLoach/node-raylib) (baseline): This is a native wrapper implemented with N-API
- Raylib C++: C++ implementation of the benchmark, without any Javascript

<div class="benchmark table" data-platform="linux_x64" data-benchmark="raylib"></div>

> [!NOTE]
> The node-raylib project seems to be **somewhat abandoned as of 2026**. It is based on an older version of Raylib than the other implentations. It could likely be slightly faster than Koffi with some effort and more build optimizations (such as PGO).

# macOS ARM64

The results presented below were measured on an Apple Mac mini M2 hosted by Scaleway.

<div class="benchmark chart" data-platform="darwin_arm64"></div>

## atoi results for macOS ARM64 ^ atoi results

This test is based on `atoi`, which takes a string parameter. Javascript (V8) to C string conversion is relatively slow and heavy.

<div class="benchmark table" data-platform="darwin_arm64" data-benchmark="atoi"></div>

## memset results for macOS ARM64 ^ memset results

This test is based around repeated calls to the standard C function `memset`. All implementations pass a Node.js Buffer for the pointer argument.

<div class="benchmark table" data-platform="darwin_arm64" data-benchmark="memset"></div>

## Raylib results for macOS ARM64 ^ Raylib results

This benchmark uses the CPU-based image drawing functions in Raylib. The calls are much heavier than in the atoi benchmark, thus the FFI overhead is reduced. In this implementation, Koffi is compared to:

- [node-raylib](https://github.com/RobLoach/node-raylib) (baseline): This is a native wrapper implemented with N-API
- Raylib C++: C++ implementation of the benchmark, without any Javascript

<div class="benchmark table" data-platform="darwin_arm64" data-benchmark="raylib"></div>

# Windows x86_64

The results presented below were measured on my x86_64 Windows machine (AMD Ryzen™ 5 2600).

<div class="benchmark chart" data-platform="win32_x64"></div>

## atoi results for Windows x86_64 ^ atoi results

This test is based on `atoi`, which takes a string parameter. Javascript (V8) to C string conversion is relatively slow and heavy.

<div class="benchmark table" data-platform="win32_x64" data-benchmark="atoi"></div>

## memset results for Windows x86_64 ^ memset results

This test is based around repeated calls to the standard C function `memset`. All implementations pass a Node.js Buffer for the pointer argument.

<div class="benchmark table" data-platform="win32_x64" data-benchmark="memset"></div>

## Raylib results for Windows x86_64 ^ Raylib results

This benchmark uses the CPU-based image drawing functions in Raylib. The calls are much heavier than in the atoi benchmark, thus the FFI overhead is reduced. In this implementation, Koffi is compared to:

- [node-raylib](https://github.com/RobLoach/node-raylib) (baseline): This is a native wrapper implemented with N-API
- Raylib C++: C++ implementation of the benchmark, without any Javascript

<div class="benchmark table" data-platform="win32_x64" data-benchmark="raylib"></div>

> [!NOTE]
> The node-raylib project seems to be **somewhat abandoned as of 2026**. It is based on an older version of Raylib than the other implentations. It could likely be slightly faster than Koffi with some effort and more build optimizations (Clang instead of MSVC, PGO, etc.).

# Running benchmarks

Please note that all benchmark results on this page are made with Clang-built binaries.

```sh
cd src/koffi
node ../cnoke/cnoke.js --clang --release

cd benchmark
node ../../cnoke/cnoke.js --clang --release
```

Once everything is built and ready, run:

```sh
node benchmark.js
```

<script src="{{ ASSET static/benchmarks.js }}"></script>
