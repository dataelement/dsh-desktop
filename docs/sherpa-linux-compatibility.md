# Linux speech addon ABI compatibility

The locked sherpa-onnx-node / sherpa-onnx-linux-x64 1.13.8 wrapper requires GLIBC_2.32 and GLIBCXX_3.4.29. UOS with glibc 2.28 cannot load it. Its adjacent C API / ONNX Runtime shared libraries were confirmed to need no newer than GLIBC_2.16 and GLIBCXX_3.4.19. Setting LD_LIBRARY_PATH is not a fix for a missing symbol version.

## Minimal adaptation

Recompile only the upstream v1.13.8 Node-API wrapper on the target baseline, preserving its API, linked library versions and relative $ORIGIN rpath. No change to the system libraries, global environment, npm lockfile or installed node_modules is necessary. The script does not install anything and refuses an existing output directory.

Source archive: https://codeload.github.com/k2-fsa/sherpa-onnx/tar.gz/refs/tags/v1.13.8

SHA256: b0374cc56dbc186d442ae73d5de743bb092470b640c4c50ce7b029044c0c4fa8

Run scripts/release/rebuild-sherpa-linux.mjs on Linux x64 with arguments: extracted source, Node include/node, new output directory, C++17 compiler executable, verified archive. It validates the archive, compares wrapper inputs to the archive, reuses the locked platform package's .so files, compiles the 18 reviewed sources, and performs an actual dlopen using the current Node executable. Output rebuild.json records source and addon hashes and compiler identity. Keep the source archive and toolchain hashes in the build evidence.

On a baseline machine without g++, extracting matching distro g++-8 and libstdc++-8-dev .deb packages into a private toolchain is sufficient; do not install or replace system packages. The tested UOS 8.3.0.13-deepin1 package hashes are:

- g++-8: 986834aa9a4265bf9790582e5e7773b5d260162b2474a91ce70e62ef885ac3d9
- libstdc++-8-dev: 32f66cd1fb2ba20db40243695e6a388f0460f489e58dc65992629f4fd265392d

The compiler needs its extracted cc1plus via COMPILER_PATH, extracted C++ include directories via CPLUS_INCLUDE_PATH, and system GCC's builtin headers/link support. A wrapper passing -B/usr/lib/gcc/x86_64-linux-gnu/8/ preserves linker plugin resolution. Scope these settings to the build command; do not export LD_LIBRARY_PATH.

## Packaging and validation boundary

Overlay only the rebuilt sherpa-onnx.node into node_modules/sherpa-onnx-linux-x64 **before ASAR creation**, verifying rebuild.json's addon SHA. Keep the original package metadata and companion libraries. Never replace app.asar.unpacked after creation: that invalidates size/integrity metadata. The Linux production and development builder configs use this pre-ASAR overlay and preserve the original beforePack hook. Their integrity gate checks metadata, ELF architecture and the rebuilt addon hash before packaging.

Keep verifyTerminal's real speech addon load as a mandatory package gate. Node 24.17.0 and Electron 44.7.0 Node mode (Node 24.21.0) have both loaded the rebuilt addon on UOS and decoded a generated 160-sample/16kHz wave buffer. This is not yet an installed application verification: run the actual packaged gate and speech smoke after projecting the rebuilt wrapper. No voice feature is silently disabled.

The patch patches/sherpa-onnx-node+1.13.8.patch preserves the underlying native loader error and cause instead of incorrectly suggesting library search paths after an ABI failure. Candidate fallback and static imports remain unchanged. test/sherpa-native-loader.test.mjs replays the patch in a temporary tree and exercises ABI failure, missing modules and successful fallback. Remove the patch when upstream preserves these diagnostics; remove the wrapper rebuild when the published binary supports the deployment baseline.
