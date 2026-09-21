// A one-document LibreOfficeKit worker, always launched inside the Office LPAC.
// The embedded API disables desktop-instance IPC and keeps every document load
// in the private profile, with macro execution disabled and dialogs cancelled.
#define _WIN32_WINNT 0x0A00
#include <windows.h>
#include <LibreOfficeKit/LibreOfficeKit.h>
#include <string>
#include <stdexcept>
#include <iostream>
#include <memory>
#include <cstdlib>
#pragma comment(lib, "user32.lib")

static std::string utf8(const wchar_t* value) {
  int size = WideCharToMultiByte(CP_UTF8, WC_ERR_INVALID_CHARS, value, -1, nullptr, 0, nullptr, nullptr);
  if (!size) throw std::runtime_error("Invalid UTF-16 Office argument");
  std::string result(static_cast<size_t>(size), '\0');
  if (!WideCharToMultiByte(CP_UTF8, WC_ERR_INVALID_CHARS, value, -1, result.data(), size, nullptr, nullptr))
    throw std::runtime_error("Office argument encoding failed");
  result.pop_back();
  return result;
}
static std::string engineError(LibreOfficeKit* kit) {
  char* error = kit->pClass->getError(kit);
  std::string result = error ? error : "Unknown LibreOfficeKit error";
  if (error) kit->pClass->freeError(error);
  return result;
}
using Office = std::unique_ptr<LibreOfficeKit, void (*)(LibreOfficeKit*)>;
struct Conversion {
  Office office;
  std::string input, output, format;
  DWORD thread = GetCurrentThreadId();
  bool started = false, completed = false;
  int result = 1;
};
static int pollWindows(void*, int timeoutUs) {
  DWORD timeout = timeoutUs < 0 ? INFINITE : static_cast<DWORD>(timeoutUs / 1000 + (timeoutUs % 1000 != 0));
  return MsgWaitForMultipleObjectsEx(0, nullptr, timeout, QS_ALLINPUT, MWMO_INPUTAVAILABLE) == WAIT_OBJECT_0;
}
static void wakeWindows(void* data) {
  PostThreadMessageW(static_cast<Conversion*>(data)->thread, WM_NULL, 0, 0);
}
static LRESULT CALLBACK conversionWindow(HWND window, UINT message, WPARAM wParam, LPARAM lParam) {
  if (message == WM_NCCREATE) {
    auto* create = reinterpret_cast<CREATESTRUCTW*>(lParam);
    SetWindowLongPtrW(window, GWLP_USERDATA, reinterpret_cast<LONG_PTR>(create->lpCreateParams));
  }
  auto* task = reinterpret_cast<Conversion*>(GetWindowLongPtrW(window, GWLP_USERDATA));
  if (message != WM_TIMER || wParam != 1 || !task || task->started)
    return DefWindowProcW(window, message, wParam, lParam);
  task->started = true;
  KillTimer(window, 1);
  try {
    auto* kit = task->office.get();
    std::cerr << "OFFICE_CONVERT: load\n";
    auto* rawDocument = kit->pClass->documentLoadWithOptions(kit, task->input.c_str(),
      "Batch=true,EnableMacrosExecution=false,MacroSecurityLevel=3");
    if (!rawDocument) throw std::runtime_error("Load document: " + engineError(kit));
    std::unique_ptr<LibreOfficeKitDocument, void (*)(LibreOfficeKitDocument*)> document(rawDocument, rawDocument->pClass->destroy);
    std::cerr << "OFFICE_CONVERT: save\n";
    if (!document->pClass->saveAs(document.get(), task->output.c_str(), task->format.c_str(), nullptr))
      throw std::runtime_error("Save document: " + engineError(kit));
    task->result = 0;
    std::cerr << "OFFICE_CONVERT: complete\n";
  } catch (const std::exception& error) {
    std::cerr << "OFFICE_CONVERT_FAILED: " << error.what() << '\n';
  } catch (...) {
    std::cerr << "OFFICE_CONVERT_FAILED: Native engine exception\n";
  }
  task->completed = true;
  // End the Kit loop after document handles close. In unipoll mode Kit has no
  // background main thread; runLoop returns through normal Desktop shutdown.
  task->office.reset();
  return 0;
}
int wmain(int argc, wchar_t** argv) {
  try {
    SetErrorMode(SEM_FAILCRITICALERRORS | SEM_NOGPFAULTERRORBOX | SEM_NOOPENFILEERRORBOX);
    if (argc != 6) throw std::runtime_error("Expected program directory, profile URL, input URL, output URL and format");
    std::wstring program = argv[1];
    if (program.size() < 3 || program[1] != L':' || program[2] != L'\\')
      throw std::runtime_error("LibreOffice program directory must be an absolute local path");
    const auto format = utf8(argv[5]);
    if (format != "pdf" && format != "xlsx") throw std::runtime_error("Office conversion format must be pdf or xlsx");
    // Windows VCL windows and every Kit call belong to this one thread.
    // The engine's Desktop startup runs before our low-priority timer message.
    if (_putenv_s("SAL_LOK_OPTIONS", "unipoll") != 0)
      throw std::runtime_error("Configure LibreOfficeKit event loop failed");
    if (!SetDefaultDllDirectories(LOAD_LIBRARY_SEARCH_DEFAULT_DIRS) || !AddDllDirectory(program.c_str()))
      throw std::runtime_error("Configure LibreOffice DLL directory: " + std::to_string(GetLastError()));
    HMODULE library = nullptr;
    for (const auto* name : { L"sofficeapp.dll", L"mergedlo.dll" }) {
      library = LoadLibraryExW((program + L"\\" + name).c_str(), nullptr,
        LOAD_LIBRARY_SEARCH_DLL_LOAD_DIR | LOAD_LIBRARY_SEARCH_DEFAULT_DIRS);
      if (library) break;
    }
    if (!library) throw std::runtime_error("Load LibreOfficeKit: " + std::to_string(GetLastError()));
    // Keep the module loaded until process exit; LibreOffice owns global objects.
    using Initialize = LibreOfficeKit* (*)(const char*, const char*);
    auto initialize = reinterpret_cast<Initialize>(GetProcAddress(library, "libreofficekit_hook_2"));
    if (!initialize) throw std::runtime_error("LibreOfficeKit entry point is missing");
    std::cerr << "OFFICE_CONVERT: initialize\n";
    auto* rawKit = initialize(utf8(argv[1]).c_str(), utf8(argv[2]).c_str());
    if (!rawKit) throw std::runtime_error("LibreOfficeKit initialization failed");
    Conversion task{Office(rawKit, rawKit->pClass->destroy), utf8(argv[3]), utf8(argv[4]), format};
    if (!LIBREOFFICEKIT_HAS(rawKit, runLoop)) throw std::runtime_error("LibreOfficeKit ABI is too old");
    WNDCLASSW windowClass{};
    windowClass.lpfnWndProc = conversionWindow;
    windowClass.hInstance = GetModuleHandleW(nullptr);
    windowClass.lpszClassName = L"DSH.Office.Convert";
    if (!RegisterClassW(&windowClass)) throw std::runtime_error("Register conversion event window failed");
    HWND window = CreateWindowExW(0, windowClass.lpszClassName, L"", 0, 0, 0, 0, 0,
      HWND_MESSAGE, nullptr, windowClass.hInstance, &task);
    if (!window || !SetTimer(window, 1, USER_TIMER_MINIMUM, nullptr))
      throw std::runtime_error("Create conversion event timer failed");
    std::cerr << "OFFICE_CONVERT: event-loop\n";
    rawKit->pClass->runLoop(rawKit, pollWindows, wakeWindows, &task);
    DestroyWindow(window);
    UnregisterClassW(windowClass.lpszClassName, windowClass.hInstance);
    if (!task.completed) throw std::runtime_error("Office event loop stopped before conversion completed");
    return task.result;
  } catch (const std::exception& error) {
    std::cerr << "OFFICE_CONVERT_FAILED: " << error.what() << '\n';
    return 1;
  }
}
