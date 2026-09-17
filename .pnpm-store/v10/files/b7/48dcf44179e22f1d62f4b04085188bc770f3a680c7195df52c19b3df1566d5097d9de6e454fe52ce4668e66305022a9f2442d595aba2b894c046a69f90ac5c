/**
 * Copyright (c) 2019, Microsoft Corporation (MIT License).
 */

#define NODE_ADDON_API_DISABLE_DEPRECATED
#include <napi.h>
#include <windows.h>

static Napi::Value ApiConsoleProcessList(const Napi::CallbackInfo& info) {
  Napi::Env env(info.Env());
  if (info.Length() != 1 ||
      !info[0].IsNumber()) {
    throw Napi::Error::New(env, "Usage: getConsoleProcessList(shellPid)");
  }

  const DWORD pid = info[0].As<Napi::Number>().Uint32Value();

  if (!FreeConsole()) {
    throw Napi::Error::New(env, "FreeConsole failed");
  }
  if (!AttachConsole(pid)) {
    throw Napi::Error::New(env, "AttachConsole failed");
  }
  auto processList = std::vector<DWORD>(64);
  auto processCount = GetConsoleProcessList(&processList[0], static_cast<DWORD>(processList.size()));
  if (processList.size() < processCount) {
      processList.resize(processCount);
      processCount = GetConsoleProcessList(&processList[0], static_cast<DWORD>(processList.size()));
  }
  FreeConsole();

  Napi::Array result = Napi::Array::New(env);
  for (DWORD i = 0; i < processCount; i++) {
    result.Set(i, Napi::Number::New(env, processList[i]));
  }
  return result;
}

Napi::Object init(Napi::Env env, Napi::Object exports) {
  exports.Set("getConsoleProcessList", Napi::Function::New(env, ApiConsoleProcessList));
  return exports;
};

NODE_API_MODULE(NODE_GYP_MODULE_NAME, init);
