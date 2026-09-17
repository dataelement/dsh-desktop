/**
 * Copyright (c) 2013-2015, Christopher Jeffrey, Peter Sunde (MIT License)
 * Copyright (c) 2016, Daniel Imms (MIT License).
 * Copyright (c) 2018, Microsoft Corporation (MIT License).
 */

#include <stdexcept>
#include <Shlwapi.h> // PathCombine
#include <Windows.h>
#include "path_util.h"

namespace path_util {

std::wstring to_wstring(const Napi::String& str) {
  const std::u16string & u16 = str.Utf16Value();
  return std::wstring(u16.begin(), u16.end());
}

std::string wstring_to_string(const std::wstring &wide_string) {
  if (wide_string.empty()) {
    return "";
  }
  const auto size_needed = WideCharToMultiByte(CP_UTF8, 0, &wide_string.at(0), (int)wide_string.size(), nullptr, 0, nullptr, nullptr);
  if (size_needed <= 0) {
    return "";
  }
  std::string result(size_needed, 0);
  WideCharToMultiByte(CP_UTF8, 0, &wide_string.at(0), (int)wide_string.size(), &result.at(0), size_needed, nullptr, nullptr);
  return result;
}

const char* from_wstring(const wchar_t* wstr) {
  int bufferSize = WideCharToMultiByte(CP_UTF8, 0, wstr, -1, NULL, 0, NULL, NULL);
  if (bufferSize <= 0) {
    return "";
  }
  char *output = new char[bufferSize];
  int status = WideCharToMultiByte(CP_UTF8, 0, wstr, -1, output, bufferSize, NULL, NULL);
  if (status == 0) {
    return "";
  }
  return output;
}

bool file_exists(std::wstring filename) {
  DWORD attr = ::GetFileAttributesW(filename.c_str());
  if (attr == INVALID_FILE_ATTRIBUTES || (attr & FILE_ATTRIBUTE_DIRECTORY)) {
    return false;
  }
  return true;
}

// cmd.exe -> C:\Windows\system32\cmd.exe
std::wstring get_shell_path(std::wstring filename) {
  std::wstring shellpath;

  if (file_exists(filename)) {
    return shellpath;
  }

  wchar_t* buffer_ = new wchar_t[MAX_ENV];
  int read = ::GetEnvironmentVariableW(L"Path", buffer_, MAX_ENV);
  if (read) {
    std::wstring delimiter = L";";
    size_t pos = 0;
    std::vector<std::wstring> paths;
    std::wstring buffer(buffer_);
    while ((pos = buffer.find(delimiter)) != std::wstring::npos) {
      paths.push_back(buffer.substr(0, pos));
      buffer.erase(0, pos + delimiter.length());
    }

    const wchar_t *filename_ = filename.c_str();

    for (size_t i = 0; i < paths.size(); ++i) {
      std::wstring path = paths[i];
      wchar_t searchPath[MAX_PATH];
      ::PathCombineW(searchPath, const_cast<wchar_t*>(path.c_str()), filename_);

      if (searchPath == NULL) {
        continue;
      }

      if (file_exists(searchPath)) {
        shellpath = searchPath;
        break;
      }
    }
  }

  delete[] buffer_;
  return shellpath;
}

}  // namespace path_util
