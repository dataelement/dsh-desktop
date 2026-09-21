// Windows Office executor. LPAC isolates reads and writes; no network capabilities
// are granted. The host owns the policy, argv, grants, and kill-on-close Job.
#define _WIN32_WINNT 0x0A00
#include <windows.h>
#include <userenv.h>
#include <aclapi.h>
#include <sddl.h>
#include <objbase.h>
#include <string>
#include <vector>
#include <stdexcept>
#include <iostream>
#include <algorithm>
#pragma comment(lib, "advapi32.lib")
#pragma comment(lib, "userenv.lib")
#pragma comment(lib, "ole32.lib")

static void check(BOOL ok, const char* api) {
  if (!ok) throw std::runtime_error(std::string(api) + ": " + std::to_string(GetLastError()));
}
static void status(DWORD code, const char* api) {
  if (code != ERROR_SUCCESS) throw std::runtime_error(std::string(api) + ": " + std::to_string(code));
}
struct Handle {
  HANDLE value = nullptr;
  ~Handle() { if (value && value != INVALID_HANDLE_VALUE) CloseHandle(value); }
  Handle() = default;
  Handle(const Handle&) = delete;
};
struct AclLock {
  Handle mutex;
  AclLock() {
    mutex.value = CreateMutexW(nullptr, FALSE, L"Local\\DSH.Office.RuntimeAcl");
    check(mutex.value != nullptr, "create Office ACL lock");
    DWORD result = WaitForSingleObject(mutex.value, 30000);
    if (result != WAIT_OBJECT_0 && result != WAIT_ABANDONED)
      throw std::runtime_error("Office ACL lock timed out or failed");
  }
  ~AclLock() { ReleaseMutex(mutex.value); }
};
// Windows command-line quoting, including empty arguments and trailing slashes.
static std::wstring quote(const std::wstring& value) {
  std::wstring result = L"\"";
  size_t slashes = 0;
  for (auto c : value) {
    if (c == L'\\') { ++slashes; continue; }
    result.append(c == L'"' ? slashes * 2 + 1 : slashes, L'\\');
    result += c; slashes = 0;
  }
  result.append(slashes * 2, L'\\');
  return result + L'"';
}
static void grant(const std::wstring& name, PSID sid, DWORD rights, ACCESS_MODE mode) {
  // Concurrent workspaces share runtime directories. Serialize ACL read/modify/
  // write so each job's unique SID survives another job's grant or revocation.
  AclLock lock;
  PACL previous = nullptr, updated = nullptr;
  PSECURITY_DESCRIPTOR descriptor = nullptr;
  status(GetNamedSecurityInfoW(name.c_str(), SE_FILE_OBJECT, DACL_SECURITY_INFORMATION,
    nullptr, nullptr, &previous, nullptr, &descriptor), "read directory ACL");
  if (!previous) { LocalFree(descriptor); throw std::runtime_error("An explicit directory DACL is required"); }
  EXPLICIT_ACCESSW access{};
  access.grfAccessPermissions = rights;
  access.grfAccessMode = mode;
  access.grfInheritance = SUB_CONTAINERS_AND_OBJECTS_INHERIT;
  BuildTrusteeWithSidW(&access.Trustee, sid);
  DWORD result = SetEntriesInAclW(1, &access, previous, &updated);
  if (result == ERROR_SUCCESS) result = SetNamedSecurityInfoW(const_cast<LPWSTR>(name.c_str()),
    SE_FILE_OBJECT, DACL_SECURITY_INFORMATION, nullptr, nullptr, updated, nullptr);
  if (updated) LocalFree(updated);
  LocalFree(descriptor);
  status(result, mode == REVOKE_ACCESS ? "revoke Office ACL" : "grant Office ACL");
}
static void lowIntegrity(const std::wstring& directory) {
  PSECURITY_DESCRIPTOR descriptor = nullptr;
  check(ConvertStringSecurityDescriptorToSecurityDescriptorW(L"S:(ML;OICI;NW;;;LW)",
    SDDL_REVISION_1, &descriptor, nullptr), "create private job integrity label");
  PACL label = nullptr;
  BOOL present = FALSE, defaulted = FALSE;
  BOOL ok = GetSecurityDescriptorSacl(descriptor, &present, &label, &defaulted);
  DWORD code = ok ? SetNamedSecurityInfoW(const_cast<LPWSTR>(directory.c_str()), SE_FILE_OBJECT,
    LABEL_SECURITY_INFORMATION, nullptr, nullptr, nullptr, label) : GetLastError();
  LocalFree(descriptor);
  status(code, "set private job integrity label");
}
static std::wstring fullPath(const std::wstring& value) {
  if (value.size() < 3 || value[1] != L':' || value[2] != L'\\')
    throw std::runtime_error("Office sandbox paths must be absolute local drive paths");
  DWORD size = GetFullPathNameW(value.c_str(), 0, nullptr, nullptr);
  check(size, "resolve sandbox path");
  std::vector<wchar_t> buffer(size);
  check(GetFullPathNameW(value.c_str(), size, buffer.data(), nullptr), "resolve sandbox path");
  std::wstring result(buffer.data());
  while (result.size() > 3 && result.back() == L'\\') result.pop_back();
  return result;
}
// Grants are restricted to real directories. Reparse descendants could redirect
// recursive ACL propagation; runtime staging rejects them and the host checks roots.
static void directory(const std::wstring& value) {
  DWORD flags = GetFileAttributesW(value.c_str());
  if (flags == INVALID_FILE_ATTRIBUTES || !(flags & FILE_ATTRIBUTE_DIRECTORY) || (flags & FILE_ATTRIBUTE_REPARSE_POINT))
    throw std::runtime_error("Office sandbox grant requires a regular directory");
}
struct Container {
  PSID sid = nullptr;
  std::wstring name;
  std::vector<std::wstring> grants;
  bool closed = false;
  void close() {
    if (closed) return;
    closed = true;
    std::string errors;
    for (auto i = grants.rbegin(); i != grants.rend(); ++i) {
      try { grant(*i, sid, 0, REVOKE_ACCESS); }
      catch (const std::exception& e) { errors += std::string(e.what()) + "; "; }
    }
    if (!name.empty()) {
      HRESULT hr = DeleteAppContainerProfile(name.c_str());
      if (FAILED(hr)) errors += "delete Office AppContainer profile: " + std::to_string(hr);
    }
    if (sid) { FreeSid(sid); sid = nullptr; }
    if (!errors.empty()) throw std::runtime_error(errors);
  }
  ~Container() { try { close(); } catch (const std::exception& e) { std::cerr << "OFFICE_SANDBOX_CLEANUP: " << e.what() << '\n'; } }
  void allow(const std::wstring& root, DWORD rights) {
    directory(root);
    // Record before mutation so a partial ACL propagation is also revoked.
    grants.push_back(root);
    grant(root, sid, rights, GRANT_ACCESS);
  }
};
// LPAC needs this read capability for system font/locale/runtime registry data.
// It carries no network or credential capability.
struct RegistryReadCapability {
  PSID* groups = nullptr; DWORD groupCount = 0;
  PSID* sids = nullptr; DWORD count = 0;
  std::vector<SID_AND_ATTRIBUTES> attributes;
  ~RegistryReadCapability() {
    for (DWORD i = 0; i < groupCount; ++i) LocalFree(groups[i]);
    for (DWORD i = 0; i < count; ++i) LocalFree(sids[i]);
    LocalFree(groups); LocalFree(sids);
  }
  void init() {
    using Derive = BOOL (WINAPI*)(LPCWSTR, PSID**, DWORD*, PSID**, DWORD*);
    HMODULE library = LoadLibraryExW(L"api-ms-win-security-base-l1-2-2.dll", nullptr, LOAD_LIBRARY_SEARCH_SYSTEM32);
    check(library != nullptr, "load Windows capability API");
    auto derive = reinterpret_cast<Derive>(GetProcAddress(library, "DeriveCapabilitySidsFromName"));
    BOOL ok = derive && derive(L"registryRead", &groups, &groupCount, &sids, &count);
    DWORD code = ok ? ERROR_SUCCESS : GetLastError(); FreeLibrary(library);
    status(code, "derive LPAC registry read capability");
    if (!count) throw std::runtime_error("Windows returned no registry read capability");
    for (DWORD i = 0; i < count; ++i) attributes.push_back({sids[i], SE_GROUP_ENABLED});
  }
};
struct Attributes {
  std::vector<unsigned char> memory;
  LPPROC_THREAD_ATTRIBUTE_LIST list = nullptr;
  ~Attributes() { if (list) DeleteProcThreadAttributeList(list); }
  void init() {
    SIZE_T size = 0;
    InitializeProcThreadAttributeList(nullptr, 3, 0, &size);
    if (!size) throw std::runtime_error("Get process attribute size failed");
    memory.resize(size);
    auto p = reinterpret_cast<LPPROC_THREAD_ATTRIBUTE_LIST>(memory.data());
    check(InitializeProcThreadAttributeList(p, 3, 0, &size), "initialize process attributes");
    list = p;
  }
  void add(DWORD_PTR kind, void* value, SIZE_T size) {
    check(UpdateProcThreadAttribute(list, 0, kind, value, size, nullptr, nullptr), "set process attribute");
  }
};
int wmain(int argc, wchar_t** argv) {
  try {
    std::wstring jobPath;
    std::vector<std::wstring> reads, command;
    DWORD timeout = 120000;
    for (int i = 1; i < argc; ++i) {
      std::wstring option = argv[i];
      if (option == L"--") { while (++i < argc) command.emplace_back(argv[i]); break; }
      if (i + 1 >= argc) throw std::runtime_error("Missing Office sandbox option value");
      if (option == L"--job") jobPath = fullPath(argv[++i]);
      else if (option == L"--read") reads.push_back(fullPath(argv[++i]));
      else if (option == L"--timeout-ms") {
        std::wstring value = argv[++i]; size_t end = 0;
        unsigned long parsed = std::stoul(value, &end);
        if (end != value.size() || parsed < 1 || parsed > 600000) throw std::runtime_error("Invalid Office timeout");
        timeout = parsed;
      } else throw std::runtime_error("Unknown Office sandbox option");
    }
    if (jobPath.empty() || command.empty()) throw std::runtime_error("Office job and command are required");
    directory(jobPath);
    command[0] = fullPath(command[0]);
    GUID id{}; status(CoCreateGuid(&id), "create Office job identity");
    wchar_t guid[40]; StringFromGUID2(id, guid, 40);
    Container container;
    container.name = L"DSH.Office." + std::wstring(guid + 1, 36);
    HRESULT hr = CreateAppContainerProfile(container.name.c_str(), L"DSH Office job",
      L"Private offline document execution", nullptr, 0, &container.sid);
    if (FAILED(hr)) { container.name.clear(); throw std::runtime_error("CreateAppContainerProfile: " + std::to_string(hr)); }
    for (const auto& root : reads) container.allow(root, FILE_GENERIC_READ | FILE_GENERIC_EXECUTE);
    container.allow(jobPath, FILE_GENERIC_READ | FILE_GENERIC_WRITE | FILE_GENERIC_EXECUTE | DELETE | FILE_DELETE_CHILD);
    lowIntegrity(jobPath);

    Handle processJob;
    processJob.value = CreateJobObjectW(nullptr, nullptr);
    check(processJob.value != nullptr, "create Office process Job");
    JOBOBJECT_EXTENDED_LIMIT_INFORMATION limits{};
    limits.BasicLimitInformation.LimitFlags = JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE | JOB_OBJECT_LIMIT_ACTIVE_PROCESS | JOB_OBJECT_LIMIT_JOB_MEMORY;
    limits.BasicLimitInformation.ActiveProcessLimit = 64;
    limits.JobMemoryLimit = static_cast<SIZE_T>(2ull * 1024 * 1024 * 1024);
    check(SetInformationJobObject(processJob.value, JobObjectExtendedLimitInformation, &limits, sizeof(limits)), "set Office process limits");

    Attributes attributes; attributes.init();
    RegistryReadCapability registry; registry.init();
    SECURITY_CAPABILITIES security{};
    security.AppContainerSid = container.sid;
    security.Capabilities = registry.attributes.data();
    security.CapabilityCount = static_cast<DWORD>(registry.attributes.size()); // Network capabilities stay absent.
    attributes.add(PROC_THREAD_ATTRIBUTE_SECURITY_CAPABILITIES, &security, sizeof(security));
    DWORD policy = PROCESS_CREATION_ALL_APPLICATION_PACKAGES_OPT_OUT;
    attributes.add(PROC_THREAD_ATTRIBUTE_ALL_APPLICATION_PACKAGES_POLICY, &policy, sizeof(policy));
    // Duplicate only stdio. No parent credential/file/process handles reach author code.
    Handle input, output, error;
    Handle* streams[] = { &input, &output, &error };
    DWORD streamIds[] = { STD_INPUT_HANDLE, STD_OUTPUT_HANDLE, STD_ERROR_HANDLE };
    HANDLE inherited[3];
    Handle nullInput;
    nullInput.value = CreateFileW(L"NUL", GENERIC_READ, FILE_SHARE_READ | FILE_SHARE_WRITE, nullptr, OPEN_EXISTING, 0, nullptr);
    check(nullInput.value != INVALID_HANDLE_VALUE, "open Office null input");
    for (int i = 0; i < 3; ++i) {
      check(DuplicateHandle(GetCurrentProcess(), i == 0 ? nullInput.value : GetStdHandle(streamIds[i]), GetCurrentProcess(),
        &streams[i]->value, 0, TRUE, DUPLICATE_SAME_ACCESS), "duplicate Office stdio");
      inherited[i] = streams[i]->value;
    }
    attributes.add(PROC_THREAD_ATTRIBUTE_HANDLE_LIST, inherited, sizeof(inherited));
    STARTUPINFOEXW startup{}; startup.StartupInfo.cb = sizeof(startup);
    startup.lpAttributeList = attributes.list;
    startup.StartupInfo.dwFlags = STARTF_USESTDHANDLES;
    startup.StartupInfo.hStdInput = input.value;
    startup.StartupInfo.hStdOutput = output.value;
    startup.StartupInfo.hStdError = error.value;
    std::wstring line;
    for (const auto& arg : command) { if (!line.empty()) line += L' '; line += quote(arg); }
    PROCESS_INFORMATION child{};
    check(CreateProcessW(command[0].c_str(), &line[0], nullptr, nullptr, TRUE,
      EXTENDED_STARTUPINFO_PRESENT | CREATE_SUSPENDED | CREATE_UNICODE_ENVIRONMENT | CREATE_NO_WINDOW,
      nullptr, jobPath.c_str(), &startup.StartupInfo, &child), "start Office LPAC process");
    Handle process, thread; process.value = child.hProcess; thread.value = child.hThread;
    if (!AssignProcessToJobObject(processJob.value, process.value)) {
      DWORD code = GetLastError(); TerminateProcess(process.value, 127); WaitForSingleObject(process.value, 5000);
      status(code, "assign Office process Job");
    }
    if (ResumeThread(thread.value) == static_cast<DWORD>(-1)) {
      DWORD code = GetLastError(); TerminateJobObject(processJob.value, 127); WaitForSingleObject(process.value, 5000);
      status(code, "resume Office process");
    }
    DWORD wait = WAIT_TIMEOUT, exitCode = 127;
    ULONGLONG started = GetTickCount64();
    bool cancelled = false;
    while (GetTickCount64() - started < timeout) {
      wait = WaitForSingleObject(process.value, 20);
      if (wait != WAIT_TIMEOUT) break;
      DWORD available = 0;
      BOOL connected = PeekNamedPipe(GetStdHandle(STD_INPUT_HANDLE), nullptr, 0, nullptr, &available, nullptr);
      if (available || (!connected && GetLastError() == ERROR_BROKEN_PIPE)) { cancelled = true; break; }
    }
    if (wait == WAIT_OBJECT_0) check(GetExitCodeProcess(process.value, &exitCode), "read Office exit status");
    check(TerminateJobObject(processJob.value, wait == WAIT_TIMEOUT ? 124 : exitCode), "stop Office process tree");
    // Wait until every descendant has released runtime files before revoking grants.
    for (int attempt = 0; attempt < 500; ++attempt) {
      JOBOBJECT_BASIC_ACCOUNTING_INFORMATION accounting{};
      check(QueryInformationJobObject(processJob.value, JobObjectBasicAccountingInformation, &accounting, sizeof(accounting), nullptr), "read Office Job status");
      if (accounting.ActiveProcesses == 0) break;
      if (attempt == 499) throw std::runtime_error("Office descendants failed to stop");
      Sleep(10);
    }
    container.close();
    if (cancelled) throw std::runtime_error("Office operation cancelled");
    if (wait == WAIT_TIMEOUT) throw std::runtime_error("Office operation exceeded its time limit");
    if (wait != WAIT_OBJECT_0) throw std::runtime_error("Office process wait failed");
    return static_cast<int>(exitCode);
  } catch (const std::exception& e) {
    std::cerr << "OFFICE_SANDBOX_FAILED: " << e.what() << '\n';
    return 127;
  }
}
