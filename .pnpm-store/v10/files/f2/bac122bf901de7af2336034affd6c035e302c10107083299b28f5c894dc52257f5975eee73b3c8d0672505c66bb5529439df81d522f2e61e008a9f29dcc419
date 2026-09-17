/**
 * Copyright (c) 2013-2015, Christopher Jeffrey, Peter Sunde (MIT License)
 * Copyright (c) 2016, Daniel Imms (MIT License).
 * Copyright (c) 2018, Microsoft Corporation (MIT License).
 *
 * pty.cc:
 *   This file is responsible for starting processes
 *   with pseudo-terminal file descriptors.
 */

#define _WIN32_WINNT 0x600

#define NODE_ADDON_API_DISABLE_DEPRECATED
#include <node_api.h>
#include <assert.h>
#include <Shlwapi.h> // PathCombine, PathIsRelative
#include <atomic>
#include <mutex>
#include <sstream>
#include <iostream>
#include <string>
#include <thread>
#include <vector>
#include <Windows.h>
#include <strsafe.h>
#include "path_util.h"
#include "conpty.h"

// Taken from the RS5 Windows SDK, but redefined here in case we're targeting <= 17134
#ifndef PROC_THREAD_ATTRIBUTE_PSEUDOCONSOLE
#define PROC_THREAD_ATTRIBUTE_PSEUDOCONSOLE \
  ProcThreadAttributeValue(22, FALSE, TRUE, FALSE)

typedef VOID* HPCON;
typedef HRESULT (__stdcall *PFNCREATEPSEUDOCONSOLE)(COORD c, HANDLE hIn, HANDLE hOut, DWORD dwFlags, HPCON* phpcon);
typedef HRESULT (__stdcall *PFNRESIZEPSEUDOCONSOLE)(HPCON hpc, COORD newSize);
typedef HRESULT (__stdcall *PFNCLEARPSEUDOCONSOLE)(HPCON hpc);
typedef void (__stdcall *PFNCLOSEPSEUDOCONSOLE)(HPCON hpc);
typedef void (__stdcall *PFNRELEASEPSEUDOCONSOLE)(HPCON hpc);

#endif

struct pty_baton {
  int id;
  HANDLE hIn;
  HANDLE hOut;
  HPCON hpc;

  HANDLE hShell = nullptr;

  pty_baton(int _id, HANDLE _hIn, HANDLE _hOut, HPCON _hpc) : id(_id), hIn(_hIn), hOut(_hOut), hpc(_hpc) {};
};

static std::vector<std::unique_ptr<pty_baton>> ptyHandles;
static std::mutex g_ptyHandlesMutex;
static std::atomic<int> ptyCounter{0};

// The leading scoped-lock parameter encodes the precondition that the caller
// holds g_ptyHandlesMutex.
static pty_baton* get_pty_baton(const std::lock_guard<std::mutex>&, int id) {
  auto it = std::find_if(ptyHandles.begin(), ptyHandles.end(), [id](const auto& ptyHandle) {
    return ptyHandle->id == id;
  });
  if (it != ptyHandles.end()) {
    return it->get();
  }
  return nullptr;
}

struct ExitEvent {
  int exit_code = 0;
};

void SetupExitCallback(Napi::Env env, Napi::Function cb, pty_baton* baton) {
  std::thread *th = new std::thread;
  // Don't use Napi::AsyncWorker which is limited by UV_THREADPOOL_SIZE.
  auto tsfn = Napi::ThreadSafeFunction::New(
      env,
      cb,                           // JavaScript function called asynchronously
      "SetupExitCallback_resource", // Name
      0,                            // Unlimited queue
      1,                            // Only one thread will use this initially
      [th](Napi::Env) {   // Finalizer used to clean threads up
        th->join();
        delete th;
      });
  *th = std::thread([tsfn = std::move(tsfn), baton] {
    auto callback = [](Napi::Env env, Napi::Function cb, ExitEvent *exit_event) {
      cb.Call({Napi::Number::New(env, exit_event->exit_code)});
      delete exit_event;
    };

    ExitEvent *exit_event = new ExitEvent;
    // Wait for process to complete.
    WaitForSingleObject(baton->hShell, INFINITE);
    {
      std::lock_guard<std::mutex> lock(g_ptyHandlesMutex);
      GetExitCodeProcess(baton->hShell, (LPDWORD)(&exit_event->exit_code));
      CloseHandle(baton->hShell);
      const int id = baton->id;
      std::erase_if(ptyHandles, [id](const auto& ptyHandle) {
        return ptyHandle->id == id;
      });
    }

    auto status = tsfn.BlockingCall(exit_event, callback); // In main thread
    switch (status) {
      case napi_closing:
        break;

      case napi_queue_full:
        Napi::Error::Fatal("SetupExitCallback", "Queue was full");

      case napi_ok:
        if (tsfn.Release() != napi_ok) {
          Napi::Error::Fatal("SetupExitCallback", "ThreadSafeFunction.Release() failed");
        }
        break;

      default:
        Napi::Error::Fatal("SetupExitCallback", "ThreadSafeFunction.BlockingCall() failed");
    }
  });
}

Napi::Error errorWithCode(const Napi::CallbackInfo& info, const char* text) {
  std::stringstream errorText;
  errorText << text;
  errorText << ", error code: " << GetLastError();
  return Napi::Error::New(info.Env(), errorText.str());
}

// Returns a new server named pipe.  It has not yet been connected.
bool createDataServerPipe(bool write,
                          std::wstring kind,
                          HANDLE* hServer,
                          std::wstring &name,
                          const std::wstring &pipeName)
{
  *hServer = INVALID_HANDLE_VALUE;

  name = L"\\\\.\\pipe\\" + pipeName + L"-" + kind;

  const DWORD winOpenMode =  PIPE_ACCESS_INBOUND | PIPE_ACCESS_OUTBOUND | FILE_FLAG_FIRST_PIPE_INSTANCE/*  | FILE_FLAG_OVERLAPPED */;

  SECURITY_ATTRIBUTES sa = {};
  sa.nLength = sizeof(sa);

  *hServer = CreateNamedPipeW(
      name.c_str(),
      /*dwOpenMode=*/winOpenMode,
      /*dwPipeMode=*/PIPE_TYPE_BYTE | PIPE_READMODE_BYTE | PIPE_WAIT,
      /*nMaxInstances=*/1,
      /*nOutBufferSize=*/128 * 1024,
      /*nInBufferSize=*/128 * 1024,
      /*nDefaultTimeOut=*/30000,
      &sa);

  return *hServer != INVALID_HANDLE_VALUE;
}

HANDLE LoadConptyDll(const Napi::CallbackInfo& info,
                     const bool useConptyDll)
{
  if (!useConptyDll) {
    return LoadLibraryExW(L"kernel32.dll", 0, 0);
  }
  wchar_t currentDir[MAX_PATH];
  HMODULE hModule = GetModuleHandleA("conpty.node");
  if (hModule == NULL) {
    throw errorWithCode(info, "Failed to get conpty.node module handle");
  }
  DWORD result = GetModuleFileNameW(hModule, currentDir, MAX_PATH);
  if (result == 0) {
    throw errorWithCode(info, "Failed to get conpty.node module file name");
  }
  PathRemoveFileSpecW(currentDir);
  wchar_t conptyDllPath[MAX_PATH];
  PathCombineW(conptyDllPath, currentDir, L"conpty\\conpty.dll");
  if (!path_util::file_exists(conptyDllPath)) {
    std::wstring errorMessage = L"Cannot find conpty.dll at " + std::wstring(conptyDllPath);
    std::string errorMessageStr = path_util::wstring_to_string(errorMessage);
    throw errorWithCode(info, errorMessageStr.c_str());
  }

  return LoadLibraryW(conptyDllPath);
}

HRESULT CreateNamedPipesAndPseudoConsole(const Napi::CallbackInfo& info,
                                         COORD size,
                                         DWORD dwFlags,
                                         HANDLE *phInput,
                                         HANDLE *phOutput,
                                         HPCON* phPC,
                                         std::wstring& inName,
                                         std::wstring& outName,
                                         const std::wstring& pipeName,
                                         const bool useConptyDll)
{
  HANDLE hLibrary = LoadConptyDll(info, useConptyDll);
  DWORD error = GetLastError();
  bool fLoadedDll = hLibrary != nullptr;
  if (fLoadedDll)
  {
    PFNCREATEPSEUDOCONSOLE const pfnCreate = (PFNCREATEPSEUDOCONSOLE)GetProcAddress(
        (HMODULE)hLibrary,
        useConptyDll ? "ConptyCreatePseudoConsole" : "CreatePseudoConsole");
    if (pfnCreate)
    {
      if (phPC == NULL || phInput == NULL || phOutput == NULL)
      {
        return E_INVALIDARG;
      }

      bool success = createDataServerPipe(true, L"in", phInput, inName, pipeName);
      if (!success)
      {
        return HRESULT_FROM_WIN32(GetLastError());
      }
      success = createDataServerPipe(false, L"out", phOutput, outName, pipeName);
      if (!success)
      {
        return HRESULT_FROM_WIN32(GetLastError());
      }
      return pfnCreate(size, *phInput, *phOutput, dwFlags, phPC);
    }
    else
    {
      // Failed to find CreatePseudoConsole in kernel32. This is likely because
      //    the user is not running a build of Windows that supports that API.
      return HRESULT_FROM_WIN32(GetLastError());
    }
  } else {
    throw errorWithCode(info, "Failed to load conpty.dll");
  }

  // Failed to find  kernel32. This is realy unlikely - honestly no idea how
  //    this is even possible to hit.
  return HRESULT_FROM_WIN32(GetLastError());
}

static Napi::Value PtyStartProcess(const Napi::CallbackInfo& info) {
  Napi::Env env(info.Env());
  Napi::HandleScope scope(env);

  Napi::Object marshal;
  std::wstring inName, outName;
  BOOL fSuccess = FALSE;
  std::unique_ptr<wchar_t[]> mutableCommandline;
  PROCESS_INFORMATION _piClient{};

  if (info.Length() != 7 ||
      !info[0].IsString() ||
      !info[1].IsNumber() ||
      !info[2].IsNumber() ||
      !info[3].IsBoolean() ||
      !info[4].IsString() ||
      !info[5].IsBoolean() ||
      !info[6].IsBoolean()) {
    throw Napi::Error::New(env, "Usage: pty.startProcess(file, cols, rows, debug, pipeName, inheritCursor, useConptyDll)");
  }

  const std::wstring filename(path_util::to_wstring(info[0].As<Napi::String>()));
  const SHORT cols = static_cast<SHORT>(info[1].As<Napi::Number>().Uint32Value());
  const SHORT rows = static_cast<SHORT>(info[2].As<Napi::Number>().Uint32Value());
  const bool debug = info[3].As<Napi::Boolean>().Value();
  const std::wstring pipeName(path_util::to_wstring(info[4].As<Napi::String>()));
  const bool inheritCursor = info[5].As<Napi::Boolean>().Value();
  const bool useConptyDll = info[6].As<Napi::Boolean>().Value();

  // use environment 'Path' variable to determine location of
  // the relative path that we have recieved (e.g cmd.exe)
  std::wstring shellpath;
  if (::PathIsRelativeW(filename.c_str())) {
    shellpath = path_util::get_shell_path(filename.c_str());
  } else {
    shellpath = filename;
  }

  if (shellpath.empty() || !path_util::file_exists(shellpath)) {
    std::string why;
    why += "File not found: ";
    why += path_util::wstring_to_string(shellpath);
    throw Napi::Error::New(env, why);
  }

  HANDLE hIn, hOut;
  HPCON hpc;
  HRESULT hr = CreateNamedPipesAndPseudoConsole(info, {cols, rows}, inheritCursor ? 1/*PSEUDOCONSOLE_INHERIT_CURSOR*/ : 0, &hIn, &hOut, &hpc, inName, outName, pipeName, useConptyDll);

  // Restore default handling of ctrl+c
  SetConsoleCtrlHandler(NULL, FALSE);

  // Set return values
  marshal = Napi::Object::New(env);

  if (SUCCEEDED(hr)) {
    // We were able to instantiate a conpty
    const int ptyId = ++ptyCounter;
    marshal.Set("pty", Napi::Number::New(env, ptyId));
    {
      std::lock_guard<std::mutex> lock(g_ptyHandlesMutex);
      ptyHandles.emplace_back(
          std::make_unique<pty_baton>(ptyId, hIn, hOut, hpc));
    }
  } else {
    throw Napi::Error::New(env, "Cannot launch conpty");
  }

  std::string inNameStr = path_util::wstring_to_string(inName);
  if (inNameStr.empty()) {
    throw Napi::Error::New(env, "Failed to initialize conpty conin");
  }
  std::string outNameStr = path_util::wstring_to_string(outName);
  if (outNameStr.empty()) {
    throw Napi::Error::New(env, "Failed to initialize conpty conout");
  }

  marshal.Set("fd", Napi::Number::New(env, -1));
  marshal.Set("conin", Napi::String::New(env, inNameStr));
  marshal.Set("conout", Napi::String::New(env, outNameStr));
  return marshal;
}

static Napi::Value PtyConnect(const Napi::CallbackInfo& info) {
  Napi::Env env(info.Env());
  Napi::HandleScope scope(env);

  // If we're working with conpty's we need to call ConnectNamedPipe here AFTER
  //    the Socket has attempted to connect to the other end, then actually
  //    spawn the process here.

  std::stringstream errorText;
  BOOL fSuccess = FALSE;

  if (info.Length() != 6 ||
      !info[0].IsNumber() ||
      !info[1].IsString() ||
      !info[2].IsString() ||
      !info[3].IsArray() ||
      !info[4].IsBoolean() ||
      !info[5].IsFunction()) {
    throw Napi::Error::New(env, "Usage: pty.connect(id, cmdline, cwd, env, useConptyDll, exitCallback)");
  }

  const int id = info[0].As<Napi::Number>().Int32Value();
  const std::wstring cmdline(path_util::to_wstring(info[1].As<Napi::String>()));
  const std::wstring cwd(path_util::to_wstring(info[2].As<Napi::String>()));
  const Napi::Array envValues = info[3].As<Napi::Array>();
  const bool useConptyDll = info[4].As<Napi::Boolean>().Value();
  Napi::Function exitCallback = info[5].As<Napi::Function>();

  pty_baton* handle;
  {
    std::lock_guard<std::mutex> lock(g_ptyHandlesMutex);
    handle = get_pty_baton(lock, id);
    if (!handle) {
      throw Napi::Error::New(env, "Invalid pty handle");
    }
  }

  // Prepare command line
  std::unique_ptr<wchar_t[]> mutableCommandline = std::make_unique<wchar_t[]>(cmdline.length() + 1);
  HRESULT hr = StringCchCopyW(mutableCommandline.get(), cmdline.length() + 1, cmdline.c_str());

  // Prepare cwd
  std::unique_ptr<wchar_t[]> mutableCwd = std::make_unique<wchar_t[]>(cwd.length() + 1);
  hr = StringCchCopyW(mutableCwd.get(), cwd.length() + 1, cwd.c_str());

  // Prepare environment
  std::wstring envStr;
  if (!envValues.IsEmpty()) {
    std::wstring envBlock;
    for(uint32_t i = 0; i < envValues.Length(); i++) {
      envBlock += path_util::to_wstring(envValues.Get(i).As<Napi::String>());
      envBlock += L'\0';
    }
    envBlock += L'\0';
    envStr = std::move(envBlock);
  }
  std::vector<wchar_t> envV(envStr.cbegin(), envStr.cend());
  LPWSTR envArg = envV.empty() ? nullptr : envV.data();

  ConnectNamedPipe(handle->hIn, nullptr);
  ConnectNamedPipe(handle->hOut, nullptr);

  // Close hIn/hOut on every exit so a throw doesn't leak the named-pipe server handles.
  auto closePipeHandles = [handle]() {
    CloseHandle(handle->hIn);
    CloseHandle(handle->hOut);
    handle->hIn = nullptr;
    handle->hOut = nullptr;
  };

  // Attach the pseudoconsole to the client application we're creating
  STARTUPINFOEXW siEx{0};
  siEx.StartupInfo.cb = sizeof(STARTUPINFOEXW);
  siEx.StartupInfo.dwFlags |= STARTF_USESTDHANDLES;
  siEx.StartupInfo.hStdError = nullptr;
  siEx.StartupInfo.hStdInput = nullptr;
  siEx.StartupInfo.hStdOutput = nullptr;

  SIZE_T size = 0;
  InitializeProcThreadAttributeList(NULL, 1, 0, &size);
  std::unique_ptr<BYTE[]> attrList = std::make_unique<BYTE[]>(size);
  siEx.lpAttributeList = reinterpret_cast<PPROC_THREAD_ATTRIBUTE_LIST>(attrList.get());

  fSuccess = InitializeProcThreadAttributeList(siEx.lpAttributeList, 1, 0, &size);
  if (!fSuccess) {
    Napi::Error error = errorWithCode(info, "InitializeProcThreadAttributeList failed");
    closePipeHandles();
    throw error;
  }
  fSuccess = UpdateProcThreadAttribute(siEx.lpAttributeList,
                                       0,
                                       PROC_THREAD_ATTRIBUTE_PSEUDOCONSOLE,
                                       handle->hpc,
                                       sizeof(HPCON),
                                       NULL,
                                       NULL);
  if (!fSuccess) {
    Napi::Error error = errorWithCode(info, "UpdateProcThreadAttribute failed");
    DeleteProcThreadAttributeList(siEx.lpAttributeList);
    closePipeHandles();
    throw error;
  }

  PROCESS_INFORMATION piClient{};
  fSuccess = !!CreateProcessW(
      nullptr,
      mutableCommandline.get(),
      nullptr,                      // lpProcessAttributes
      nullptr,                      // lpThreadAttributes
      false,                        // bInheritHandles VERY IMPORTANT that this is false
      EXTENDED_STARTUPINFO_PRESENT | CREATE_UNICODE_ENVIRONMENT, // dwCreationFlags
      envArg,                       // lpEnvironment
      mutableCwd.get(),             // lpCurrentDirectory
      &siEx.StartupInfo,            // lpStartupInfo
      &piClient                     // lpProcessInformation
  );
  if (!fSuccess) {
    Napi::Error error = errorWithCode(info, "Cannot create process");
    DeleteProcThreadAttributeList(siEx.lpAttributeList);
    closePipeHandles();
    throw error;
  }

  DeleteProcThreadAttributeList(siEx.lpAttributeList);

  HANDLE hLibrary = LoadConptyDll(info, useConptyDll);
  bool fLoadedDll = hLibrary != nullptr;
  if (useConptyDll && fLoadedDll)
  {
    PFNRELEASEPSEUDOCONSOLE const pfnReleasePseudoConsole = (PFNRELEASEPSEUDOCONSOLE)GetProcAddress(
      (HMODULE)hLibrary, "ConptyReleasePseudoConsole");
    if (pfnReleasePseudoConsole)
    {
      pfnReleasePseudoConsole(handle->hpc);
    }
  }

  // Update handle
  handle->hShell = piClient.hProcess;

  // Close the thread handle to avoid resource leak
  CloseHandle(piClient.hThread);
  // Close the input read and output write handle of the pseudoconsole
  closePipeHandles();

  SetupExitCallback(env, exitCallback, handle);

  // Return
  auto marshal = Napi::Object::New(env);
  marshal.Set("pid", Napi::Number::New(env, piClient.dwProcessId));
  return marshal;
}

static Napi::Value PtyResize(const Napi::CallbackInfo& info) {
  Napi::Env env(info.Env());
  Napi::HandleScope scope(env);

  if (info.Length() != 4 ||
      !info[0].IsNumber() ||
      !info[1].IsNumber() ||
      !info[2].IsNumber() ||
      !info[3].IsBoolean()) {
    throw Napi::Error::New(env, "Usage: pty.resize(id, cols, rows, useConptyDll)");
  }

  int id = info[0].As<Napi::Number>().Int32Value();
  SHORT cols = static_cast<SHORT>(info[1].As<Napi::Number>().Uint32Value());
  SHORT rows = static_cast<SHORT>(info[2].As<Napi::Number>().Uint32Value());
  const bool useConptyDll = info[3].As<Napi::Boolean>().Value();

  std::lock_guard<std::mutex> lock(g_ptyHandlesMutex);
  const pty_baton* handle = get_pty_baton(lock, id);

  if (handle != nullptr) {
    HANDLE hLibrary = LoadConptyDll(info, useConptyDll);
    bool fLoadedDll = hLibrary != nullptr;
    if (fLoadedDll)
    {
      PFNRESIZEPSEUDOCONSOLE const pfnResizePseudoConsole = (PFNRESIZEPSEUDOCONSOLE)GetProcAddress(
        (HMODULE)hLibrary,
        useConptyDll ? "ConptyResizePseudoConsole" : "ResizePseudoConsole");
      if (pfnResizePseudoConsole)
      {
        COORD size = {cols, rows};
        pfnResizePseudoConsole(handle->hpc, size);
      }
    }
  }

  return env.Undefined();
}

static Napi::Value PtyClear(const Napi::CallbackInfo& info) {
  Napi::Env env(info.Env());
  Napi::HandleScope scope(env);

  if (info.Length() != 2 ||
      !info[0].IsNumber() ||
      !info[1].IsBoolean()) {
    throw Napi::Error::New(env, "Usage: pty.clear(id, useConptyDll)");
  }

  int id = info[0].As<Napi::Number>().Int32Value();
  const bool useConptyDll = info[1].As<Napi::Boolean>().Value();

  // This API is only supported for conpty.dll as it was introduced in a later version of Windows.
  // We could hook it up to point at >= a version of Windows only, but the future is conpty.dll
  // anyway.
  if (!useConptyDll) {
    return env.Undefined();
  }

  std::lock_guard<std::mutex> lock(g_ptyHandlesMutex);
  const pty_baton* handle = get_pty_baton(lock, id);

  if (handle != nullptr) {
    HANDLE hLibrary = LoadConptyDll(info, useConptyDll);
    bool fLoadedDll = hLibrary != nullptr;
    if (fLoadedDll)
    {
      PFNCLEARPSEUDOCONSOLE const pfnClearPseudoConsole = (PFNCLEARPSEUDOCONSOLE)GetProcAddress((HMODULE)hLibrary, "ConptyClearPseudoConsole");
      if (pfnClearPseudoConsole)
      {
        pfnClearPseudoConsole(handle->hpc);
      }
    }
  }

  return env.Undefined();
}

static Napi::Value PtyKill(const Napi::CallbackInfo& info) {
  Napi::Env env(info.Env());
  Napi::HandleScope scope(env);

  if (info.Length() != 2 ||
      !info[0].IsNumber() ||
      !info[1].IsBoolean()) {
    throw Napi::Error::New(env, "Usage: pty.kill(id, useConptyDll)");
  }

  int id = info[0].As<Napi::Number>().Int32Value();
  const bool useConptyDll = info[1].As<Napi::Boolean>().Value();

  std::lock_guard<std::mutex> lock(g_ptyHandlesMutex);
  pty_baton* handle = get_pty_baton(lock, id);

  if (handle != nullptr) {
    HANDLE hLibrary = LoadConptyDll(info, useConptyDll);
    bool fLoadedDll = hLibrary != nullptr;
    if (fLoadedDll)
    {
      PFNCLOSEPSEUDOCONSOLE const pfnClosePseudoConsole = (PFNCLOSEPSEUDOCONSOLE)GetProcAddress(
        (HMODULE)hLibrary,
        useConptyDll ? "ConptyClosePseudoConsole" : "ClosePseudoConsole");
      if (pfnClosePseudoConsole)
      {
        pfnClosePseudoConsole(handle->hpc);
      }
    }
    // Defensive: if PtyConnect was never called (or failed before closing the
    // pipe handles), release the named pipe server handles here.
    if (handle->hIn != nullptr) {
      CloseHandle(handle->hIn);
      handle->hIn = nullptr;
    }
    if (handle->hOut != nullptr) {
      CloseHandle(handle->hOut);
      handle->hOut = nullptr;
    }
    if (useConptyDll && handle->hShell != nullptr) {
      TerminateProcess(handle->hShell, 1);
    }
  }

  return env.Undefined();
}

/**
* Init
*/

Napi::Object init(Napi::Env env, Napi::Object exports) {
  exports.Set("startProcess", Napi::Function::New(env, PtyStartProcess));
  exports.Set("connect", Napi::Function::New(env, PtyConnect));
  exports.Set("resize", Napi::Function::New(env, PtyResize));
  exports.Set("clear", Napi::Function::New(env, PtyClear));
  exports.Set("kill", Napi::Function::New(env, PtyKill));
  return exports;
};

NODE_API_MODULE(NODE_GYP_MODULE_NAME, init);
