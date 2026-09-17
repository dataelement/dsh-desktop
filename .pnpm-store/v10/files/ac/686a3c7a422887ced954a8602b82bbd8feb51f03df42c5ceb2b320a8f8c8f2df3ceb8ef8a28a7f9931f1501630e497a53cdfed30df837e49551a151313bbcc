# SPDX-License-Identifier: MIT
# SPDX-FileCopyrightText: 2026 Niels Martignène <niels.martignene@protonmail.com>

cmake_minimum_required(VERSION 3.11)
cmake_policy(SET CMP0091 NEW)

if(NOT NODE_JS_INCLUDE_DIRS)
    message(FATAL_ERROR "Please use CNoke to build Koffi, follow instructions here: https://koffi.dev/contribute#build-from-source")
endif()

project(koffi C CXX ASM)
find_package(CNoke)

include(CheckCXXCompilerFlag)

set(CMAKE_CXX_STANDARD 20)
if(MSVC)
    set(CMAKE_MSVC_RUNTIME_LIBRARY MultiThreaded)
    set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} /Zc:__cplusplus /Zc:preprocessor /Zc:twoPhase- /W4 /wd4200 /wd4201 /wd4127 /wd4458 /wd4706 /wd4702 /wd4324")

    # ASM_MASM does not (yet) work on Windows ARM64
    if(NOT CMAKE_GENERATOR_PLATFORM MATCHES "ARM64")
        enable_language(ASM_MASM)
    endif()
else()
    set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -Wall -Wextra -Wno-missing-field-initializers -Wno-unused-parameter -Wno-class-memaccess -Wno-c99-designator -Wswitch -Werror=switch -Wimplicit-fallthrough -Werror=implicit-fallthrough")

    if(CMAKE_CXX_COMPILER_ID MATCHES "Clang")
        set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -Wno-unknown-warning-option")
    endif()
endif()

if(UNIX AND NOT APPLE)
    set(CMAKE_C_FLAGS "${CMAKE_C_FLAGS} -D_FILE_OFFSET_BITS=64")
    set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -D_FILE_OFFSET_BITS=64")
    set(CMAKE_SHARED_LINKER_FLAGS "${CMAKE_SHARED_LINKER_FLAGS} -z noexecstack")
endif()

set(CMAKE_EXPORT_COMPILE_COMMANDS ON)

# ---- Koffi ----

# Recompute the version string after each commit
if(EXISTS "${CMAKE_SOURCE_DIR}/../../.git/logs/HEAD")
    configure_file("${CMAKE_SOURCE_DIR}/../../.git/logs/HEAD" git_logs_HEAD COPYONLY)
endif()
if(EXISTS ${CMAKE_CURRENT_SOURCE_DIR}/package.json)
    file(READ ${CMAKE_CURRENT_SOURCE_DIR}/package.json PKG)
else()
    file(READ ${CMAKE_CURRENT_SOURCE_DIR}/../../package.json PKG)
endif()
string(REGEX MATCH "\"version\": \"([^\"]+)\"" XX "${PKG}")
set(KOFFI_VERSION ${CMAKE_MATCH_1})

set_source_files_properties(src/ffi.cc PROPERTIES COMPILE_DEFINITIONS VERSION=${KOFFI_VERSION})

add_custom_command(OUTPUT trampolines/gnu.inc
                          trampolines/armasm.inc
                          trampolines/masm32.inc
                          trampolines/masm64.inc
                   COMMENT "Generate trampoline macros"
                   COMMAND "${NODE_JS_EXECPATH}"
                   ARGS "${CMAKE_CURRENT_SOURCE_DIR}/src/trampolines.cjs" "${CMAKE_CURRENT_BINARY_DIR}/trampolines" 8192
                   DEPENDS "${CMAKE_CURRENT_SOURCE_DIR}/src/trampolines.cjs")

set(KOFFI_SRC
    src/ffi.cc
    src/call.cc
    src/interp.cc
    src/parser.cc
    src/type.cc
    src/util.cc
    src/uv.cc
    src/win32.cc
    ../../lib/native/base/base.cc
)
if(CMAKE_SIZEOF_VOID_P EQUAL 8)
    # CMAKE_SYSTEM_PROCESSOR is wrong on Windows ARM64

    if(CMAKE_SYSTEM_PROCESSOR MATCHES "aarch|arm|ARM|AARCH" OR CMAKE_GENERATOR_PLATFORM STREQUAL "ARM64" OR CMAKE_OSX_ARCHITECTURES MATCHES "arm")
        if(MSVC)
            get_filename_component(cl_dir "${CMAKE_CXX_COMPILER}" DIRECTORY)
            file(TO_CMAKE_PATH "${cl_dir}/armasm64.exe" asm_compiler)

            # Work around missing ARM64-native ARMASM64 compiler (at least in VS 17.3 Preview 2)
            if(NOT EXISTS "${asm_compiler}")
                file(TO_CMAKE_PATH "${cl_dir}/../../Hostx64/arm64/armasm64.exe" asm_compiler)
            endif()

            message(STATUS "Using ARMASM64 compiler: ${asm_compiler}")

            file(TO_CMAKE_PATH "${CMAKE_CURRENT_SOURCE_DIR}/src/abi/arm64_asm.asm" asm_source)
            file(TO_CMAKE_PATH "${CMAKE_CURRENT_BINARY_DIR}/arm64_asm.obj" asm_object)

            add_custom_command(
                OUTPUT "${asm_object}"
                COMMAND "${asm_compiler}"
                ARGS /nologo /i "${CMAKE_CURRENT_BINARY_DIR}/trampolines" /o "${asm_object}" "${asm_source}"
                DEPENDS "${asm_source}" trampolines/armasm.inc
                COMMENT "Assembling ${asm_source}"
            )
            set_source_files_properties("${asm_object}" PROPERTIES EXTERNAL_OBJECT TRUE)

            list(APPEND KOFFI_SRC src/abi/arm64.cc "${asm_object}")
        else()
            list(APPEND KOFFI_SRC src/abi/arm64.cc src/abi/arm64_asm.S)
        endif()
    elseif(CMAKE_SYSTEM_PROCESSOR MATCHES "riscv")
        list(APPEND KOFFI_SRC src/abi/riscv64.cc src/abi/riscv64_asm.S)
    elseif(CMAKE_SYSTEM_PROCESSOR MATCHES "loongarch64")
        list(APPEND KOFFI_SRC src/abi/riscv64.cc src/abi/loong64_asm.S)
    elseif(CMAKE_SYSTEM_PROCESSOR MATCHES "ppc64")
        list(APPEND KOFFI_SRC src/abi/ppc64.cc src/abi/ppc64_asm.S)
    else()
        if(WIN32)
            if(MSVC)
                list(APPEND KOFFI_SRC src/abi/x64win.cc src/abi/x64win_asm.asm)
            else()
                list(APPEND KOFFI_SRC src/abi/x64win.cc src/abi/x64win_asm.S)
            endif()
        else()
            list(APPEND KOFFI_SRC src/abi/x64sysv.cc src/abi/x64sysv_asm.S)
        endif()
    endif()
elseif(CMAKE_SIZEOF_VOID_P EQUAL 4)
    if(CMAKE_SYSTEM_PROCESSOR MATCHES "aarch|arm")
        list(APPEND KOFFI_SRC src/abi/arm32.cc src/abi/arm32_asm.S)
    else()
        if(MSVC)
            list(APPEND KOFFI_SRC src/abi/x86.cc src/abi/x86_asm.asm)
        else()
            list(APPEND KOFFI_SRC src/abi/x86.cc src/abi/x86_asm.S)
        endif()
    endif()
endif()

add_node_addon(NAME koffi SOURCES ${KOFFI_SRC} trampolines/gnu.inc)
target_include_directories(koffi PRIVATE . ../.. ../../vendor/node-addon-api "${CMAKE_CURRENT_BINARY_DIR}/trampolines")

if(WIN32)
    create_import_lib(uv.lib src/uv.def)
    set(UV_LINK_LIB "${CMAKE_CURRENT_BINARY_DIR}/uv.lib")
    target_sources(koffi PRIVATE uv.lib)
    target_link_libraries(koffi PRIVATE ${UV_LINK_LIB})
endif()

target_compile_definitions(koffi PRIVATE FELIX_TARGET=koffi NAPI_VERSION=NAPI_VERSION_EXPERIMENTAL
                                         NODE_ADDON_API_DISABLE_CPP_EXCEPTIONS NODE_ADDON_API_REQUIRE_BASIC_FINALIZERS)

if(WIN32)
    target_compile_definitions(koffi PRIVATE _CRT_SECURE_NO_WARNINGS _CRT_NONSTDC_NO_DEPRECATE)
    target_link_libraries(koffi PRIVATE ws2_32)
endif()

if(UNIX AND NOT APPLE)
    target_compile_options(koffi PRIVATE -fno-semantic-interposition -fvisibility=hidden -fdata-sections -ffunction-sections)
    target_link_options(koffi PRIVATE -Wl,--gc-sections)
endif()

# ---- Optimization ----

option(PGO_GENERATE "Build with PGO profile generation" "")
option(PGO_USE "Optimize with PGO profile" "")

if(MSVC)
    if (NOT CMAKE_C_COMPILER_ID MATCHES "[Cc]lang")
        target_compile_options(koffi PRIVATE $<$<COMPILE_LANGUAGE:CXX>:/EHsc>)
    endif()

    if(CMAKE_BUILD_TYPE STREQUAL "Release" OR CMAKE_BUILD_TYPE STREQUAL "RelWithDebInfo")
        target_compile_options(koffi PRIVATE $<$<COMPILE_LANGUAGE:CXX>:/GS- /Ob2>)

        if(CMAKE_C_COMPILER_ID MATCHES "[Cc]lang")
            set(CMAKE_CXX_FLAGS_RELEASE "${CMAKE_CXX_FLAGS_RELEASE} /clang:-O3")
        endif()

        if(CMAKE_BUILD_TYPE STREQUAL "Release")
            target_compile_options(koffi PRIVATE $<$<COMPILE_LANGUAGE:CXX>:/Oy->)
        endif()
    endif()
endif()

if(NOT MSVC OR CMAKE_C_COMPILER_ID MATCHES "[Cc]lang")
    # Restore C/C++ compiler sanity

    target_compile_options(koffi PRIVATE $<$<COMPILE_LANGUAGE:CXX>:-fno-strict-aliasing -fno-delete-null-pointer-checks>)
    if(MSVC)
        target_compile_options(koffi PRIVATE $<$<COMPILE_LANGUAGE:CXX>:/clang:-fwrapv /clang:-fno-exceptions /clang:-fno-rtti>)
    else()
        target_compile_options(koffi PRIVATE $<$<COMPILE_LANGUAGE:CXX>:-fwrapv -fno-exceptions -fno-rtti>)
    endif()

    check_cxx_compiler_flag(-fno-finite-loops use_no_finite_loops)
    if(use_no_finite_loops)
        target_compile_options(koffi PRIVATE $<$<COMPILE_LANGUAGE:CXX>:-fno-finite-loops>)
    endif()

    if(CMAKE_C_COMPILER_ID STREQUAL "GNU")
        target_compile_options(koffi PRIVATE -fno-reorder-blocks-and-partition -Wno-maybe-musttail-local-addr)
    endif()
endif()

if(PGO_GENERATE)
    set_target_properties(koffi PROPERTIES INTERPROCEDURAL_OPTIMIZATION ON)
    target_compile_options(koffi PRIVATE "-fprofile-generate=${PGO_GENERATE}")
    target_link_options(koffi PRIVATE "-fprofile-generate=${PGO_GENERATE}")

    message(STATUS "PGO: Building instrumented binary")
elseif(PGO_PROFILE)
    if(NOT EXISTS "${PGO_PROFILE}")
        message(FATAL_ERROR "Profile data not found at '${PGO_PROFILE}'")
    endif()

    set_target_properties(koffi PROPERTIES INTERPROCEDURAL_OPTIMIZATION ON)
    target_compile_options(koffi PRIVATE "-fprofile-use=${PGO_PROFILE}")
    target_link_options(koffi PRIVATE "-fprofile-use=${PGO_PROFILE}")

    if(CMAKE_C_COMPILER_ID STREQUAL "GNU")
        target_compile_options(koffi PRIVATE -fprofile-correction)
    endif()

    message(STATUS "PGO: Building optimized binary with profile data")
else()
    enable_unity_build(koffi)
endif()

if(CMAKE_BUILD_TYPE STREQUAL "Release")
    if(APPLE)
        add_custom_command(
            TARGET koffi POST_BUILD
            COMMAND ${CMAKE_STRIP}
            ARGS -x $<TARGET_FILE:koffi>
        )
    elseif(UNIX)
        add_custom_command(
            TARGET koffi POST_BUILD
            COMMAND ${CMAKE_STRIP}
            ARGS $<TARGET_FILE:koffi>
        )
    endif()
endif()

# ---- Debug ----

option(ASAN "Build with ASan" OFF)
option(UBSAN "Build with UBSan" OFF)

if(ASAN)
    target_compile_options(koffi PRIVATE -fsanitize=address)
    target_link_options(koffi BEFORE PRIVATE -fsanitize=address)
endif()

if(UBSAN)
    target_compile_options(koffi PRIVATE -fsanitize=undefined)
    target_link_options(koffi BEFORE PRIVATE -fsanitize=undefined)
endif()
