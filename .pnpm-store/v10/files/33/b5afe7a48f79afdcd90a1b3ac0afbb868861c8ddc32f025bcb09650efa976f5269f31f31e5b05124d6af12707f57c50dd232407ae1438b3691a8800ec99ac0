// SPDX-License-Identifier: MIT
// SPDX-FileCopyrightText: 2026 Niels Martignène <niels.martignene@protonmail.com>

#if defined(_WIN32)

#include "util.hh"
#include "win32.hh"

#if !defined(NOMINMAX)
    #define NOMINMAX
#endif
#if !defined(WIN32_LEAN_AND_MEAN)
    #define WIN32_LEAN_AND_MEAN
#endif
#include <windows.h>
#include <ntsecapi.h>
#include <processthreadsapi.h>

namespace K {

const HashMap<int, const char *> WindowsMachineNames = {
    { 0x184, "Alpha AXP, 32-bit" },
    { 0x284, "Alpha 64" },
    { 0x1d3, "Matsushita AM33" },
    { 0x8664, "AMD x64" },
    { 0x1c0, "ARM little endian" },
    { 0xaa64, "ARM64 little endian" },
    { 0xA641, "ARM64/emulated x64 interoperable binary" },
    { 0xA64E, "ARM64/ARM64EC interoperable binary" }, 
    { 0x1c4, "ARM Thumb-2 little endian" },
    { 0x284, "AXP 64" },
    { 0xebc, "EFI byte code" },
    { 0x14c, "Intel 386+" },
    { 0x200, "Intel Itanium" },
    { 0x6232, "LoongArch 32-bit" },
    { 0x6264, "LoongArch 64-bit" },
    { 0x9041, "Mitsubishi M32R little endian" },
    { 0x266, "MIPS16" },
    { 0x366, "MIPS with FPU" },
    { 0x466, "MIPS16 with FPU" },
    { 0x1f0, "Power PC little endian" },
    { 0x1f1, "Power PC with FP support" },
    { 0x166, "MIPS little endian" },
    { 0x5032, "RISC-V 32-bit" },
    { 0x5064, "RISC-V 64-bit" },
    { 0x5128, "RISC-V 128-bit" },
    { 0x1a2, "Hitachi SH3" },
    { 0x1a3, "Hitachi SH3 DSP" },
    { 0x1a6, "Hitachi SH4" },
    { 0x1a8, "Hitachi SH5" },
    { 0x1c2, "Thumb" },
    { 0x169, "MIPS little-endian WCE v2" }
};

HANDLE LoadWindowsLibrary(Napi::Env env, Span<const char> path)
{
    BlockAllocator temp_alloc;

    Span<wchar_t> filename_w = AllocateSpan<wchar_t>(&temp_alloc, path.len + 1);

    if (ConvertUtf8ToWin32Wide(path, filename_w) < 0) {
        ThrowError<Napi::Error>(env, "Invalid path string");
        return nullptr;
    }

    HMODULE module = LoadLibraryW(filename_w.ptr);

    if (!module) {
        DWORD flags = LOAD_LIBRARY_SEARCH_DEFAULT_DIRS | LOAD_LIBRARY_SEARCH_DLL_LOAD_DIR;

        Span<const char> filename = NormalizePath(path, GetWorkingDirectory(), &temp_alloc);
        Span<wchar_t> filename_w = AllocateSpan<wchar_t>(&temp_alloc, filename.len + 1);

        if (ConvertUtf8ToWin32Wide(filename, filename_w) < 0) {
            ThrowError<Napi::Error>(env, "Invalid path string");
            return nullptr;
        }

        module = LoadLibraryExW(filename_w.ptr, nullptr, flags);
    }

    if (!module) {
        if (GetLastError() == ERROR_BAD_EXE_FORMAT) {
            int process = GetSelfMachine();
            int dll = GetDllMachine(filename_w.ptr);

            if (process >= 0 && dll >= 0 && dll != process) {
                ThrowError<Napi::Error>(env, "Cannot load '%1' DLL in '%2' process",
                                        WindowsMachineNames.FindValue(dll, "Unknown"),
                                        WindowsMachineNames.FindValue(process, "Unknown"));
                return nullptr;
            }
        }

        ThrowError<Napi::Error>(env, "Failed to load shared library: %1", GetWin32ErrorString());
        return nullptr;
    }

    return module;
}

// Fails silently on purpose
static bool ReadAt(HANDLE h, int32_t offset, void *buf, int len)
{
    OVERLAPPED ov = {};
    DWORD read;

    ov.Offset = offset & 0x7FFFFFFFu;

    if (offset < 0)
        return false;
    if (!ReadFile(h, buf, (DWORD)len, &read, &ov))
        return false;
    if (read != (DWORD)len)
        return false;

    return true;
}

static int GetFileMachine(HANDLE h, bool check_dll)
{
    PE_DOS_HEADER dos = {};
    PE_NT_HEADERS nt = {};

    if (!ReadAt(h, 0, &dos, K_SIZE(dos)))
        goto generic;
    if (!ReadAt(h, dos.e_lfanew, &nt, K_SIZE(nt)))
        goto generic;

    if (dos.e_magic != 0x5A4D) // MZ
        goto generic;
    if (nt.Signature != 0x00004550) // PE\0\0
        goto generic;
    if (check_dll && !(nt.FileHeader.Characteristics & IMAGE_FILE_DLL))
        goto generic;

    return (int)nt.FileHeader.Machine;

generic:
    LogError("Invalid or forbidden %1 file: %2", check_dll ? "DLL" : "executable", GetWin32ErrorString());
    return -1;
}

int GetSelfMachine()
{
    const char *filename = GetApplicationExecutable();

    HANDLE h;
    if (IsWin32Utf8()) {
        h = CreateFileA(filename, GENERIC_READ,
                        FILE_SHARE_READ | FILE_SHARE_WRITE | FILE_SHARE_DELETE,
                        nullptr, OPEN_EXISTING, 0, nullptr);
    } else {
        wchar_t filename_w[4096];
        if (ConvertUtf8ToWin32Wide(filename, filename_w) < 0)
            return -1;

        h = CreateFileW(filename_w, GENERIC_READ,
                        FILE_SHARE_READ | FILE_SHARE_WRITE | FILE_SHARE_DELETE,
                        nullptr, OPEN_EXISTING, 0, nullptr);
    }
    if (h == INVALID_HANDLE_VALUE) {
        LogError("Cannot open '%1': %2", filename, GetWin32ErrorString());
        return -1;
    }
    K_DEFER { CloseHandle(h); };

    return GetFileMachine(h, false);
}

int GetDllMachine(const wchar_t *filename)
{
    HANDLE h = CreateFileW((LPCWSTR)filename, GENERIC_READ,
                           FILE_SHARE_READ | FILE_SHARE_WRITE | FILE_SHARE_DELETE,
                           nullptr, OPEN_EXISTING, 0, nullptr);
    if (h == INVALID_HANDLE_VALUE) {
        LogError("Cannot open '%1': %2", filename, GetWin32ErrorString());
        return -1;
    }
    K_DEFER { CloseHandle(h); };

    return GetFileMachine(h, true);
}

extern "C" int __cdecl SehHandler(void *ptr, void *, void *ctx, void *)
{
    EXCEPTION_RECORD *rec = (EXCEPTION_RECORD *)ptr;

    if (!(rec->ExceptionFlags & (EXCEPTION_UNWINDING | EXCEPTION_EXIT_UNWIND))) {
        EXCEPTION_POINTERS ep = { rec, (CONTEXT *)ctx };
        UnhandledExceptionFilter(&ep);
        ExitProcess(rec->ExceptionCode);
    }

    return ExceptionContinueSearch;
}

}

#endif
