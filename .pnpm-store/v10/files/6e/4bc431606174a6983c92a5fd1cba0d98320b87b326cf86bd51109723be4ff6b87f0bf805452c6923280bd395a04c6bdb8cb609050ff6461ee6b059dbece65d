// SPDX-License-Identifier: MIT
// SPDX-FileCopyrightText: 2026 Niels Martignène <niels.martignene@protonmail.com>

#include "base.hh"
#if __has_include("crc.inc")
    #include "crc.inc"
#endif
#include "unicode.inc"

#if __has_include("vendor/dragonbox/include/dragonbox/dragonbox.h")
    #include "vendor/dragonbox/include/dragonbox/dragonbox.h"
#endif

#if defined(_WIN32)
    #if !defined(NOMINMAX)
        #define NOMINMAX
    #endif
    #if !defined(WIN32_LEAN_AND_MEAN)
        #define WIN32_LEAN_AND_MEAN
    #endif
    #include <ws2tcpip.h>
    #include <windows.h>
    #include <fcntl.h>
    #include <io.h>
    #include <sys/types.h>
    #include <sys/stat.h>
    #include <direct.h>
    #include <shlobj.h>
    #include <userenv.h>
    #if !defined(ENABLE_VIRTUAL_TERMINAL_PROCESSING)
        #define ENABLE_VIRTUAL_TERMINAL_PROCESSING 0x0004
    #endif

    #if !defined(UNIX_PATH_MAX)
        #define UNIX_PATH_MAX 108
    #endif
    typedef struct sockaddr_un {
        ADDRESS_FAMILY sun_family;
        char sun_path[UNIX_PATH_MAX];
    } SOCKADDR_UN, *PSOCKADDR_UN;

    #if defined(__MINGW32__)
        // Some MinGW distributions set it to 0 by default
        int _CRT_glob = 1;
    #endif

    #define RtlGenRandom SystemFunction036
    extern "C" BOOLEAN NTAPI RtlGenRandom(PVOID RandomBuffer, ULONG RandomBufferLength);

    typedef struct _IO_STATUS_BLOCK {
        union {
            LONG Status;
            PVOID Pointer;
        };
        ULONG_PTR Information;
    } IO_STATUS_BLOCK, *PIO_STATUS_BLOCK;

    typedef LONG NTAPI NtCopyFileChunkFunc(HANDLE SourceHandle, HANDLE DestHandle, HANDLE Event,
                                           PIO_STATUS_BLOCK IoStatusBlock, ULONG Length,
                                           PLARGE_INTEGER SourceOffset, PLARGE_INTEGER DestOffset,
                                           PULONG SourceKey, PULONG DestKey, ULONG Flags);
    typedef ULONG RtlNtStatusToDosErrorFunc(LONG Status);
#elif defined(__wasi__)
    #include <dirent.h>
    #include <fcntl.h>
    #include <fnmatch.h>
    #include <poll.h>
    #include <sys/ioctl.h>
    #include <sys/stat.h>
    #include <sys/types.h>
    #include <time.h>

    extern char **environ;
#else
    #include <dlfcn.h>
    #include <dirent.h>
    #include <fcntl.h>
    #include <fnmatch.h>
    #include <grp.h>
    #include <poll.h>
    #include <signal.h>
    #include <spawn.h>
    #include <sys/ioctl.h>
    #include <sys/mman.h>
    #include <sys/resource.h>
    #include <sys/stat.h>
    #include <sys/statvfs.h>
    #include <sys/types.h>
    #include <sys/socket.h>
    #include <sys/un.h>
    #include <sys/wait.h>
    #include <netinet/in.h>
    #include <netinet/tcp.h>
    #include <arpa/inet.h>
    #include <termios.h>
    #include <time.h>
    #include <pwd.h>

    extern char **environ;
#endif
#if defined(__linux__)
    #include <sys/syscall.h>
    #include <sys/sendfile.h>
    #include <sys/eventfd.h>
#endif
#if defined(__APPLE__)
    #include <sys/random.h>
    #include <mach-o/dyld.h>
    #include <copyfile.h>
#endif
#if defined(__OpenBSD__) || defined(__FreeBSD__)
    #include <pthread_np.h>
    #include <sys/param.h>
    #include <sys/sysctl.h>
#endif
#if defined(__EMSCRIPTEN__)
    #include <emscripten.h>
#endif
#include <chrono>
#include <random>
#include <thread>

namespace K {

// ------------------------------------------------------------------------
// Utility
// ------------------------------------------------------------------------

#if !defined(FELIX)
    #if defined(FELIX_TARGET)
        const char *FelixTarget = K_STRINGIFY(FELIX_TARGET);
    #else
        const char *FelixTarget = "????";
    #endif
    const char *FelixVersion = "(unknown version)";
    const char *FelixCompiler = "????";
#endif

void PrintAssertError(const char *filename, int line, const char *msg)
{
    Print(StdErr, "%1:%2: Assertion '%3' failed\n", filename, line, msg);
}

#if defined(_WIN32)

void *MemMem(const void *src, Size src_len, const void *needle, Size needle_len)
{
    K_ASSERT(src_len >= 0);
    K_ASSERT(needle_len > 0);

    src_len -= needle_len - 1;

    int needle0 = *(const uint8_t *)needle;
    Size offset = 0;

    while (offset < src_len) {
        uint8_t *next = (uint8_t *)memchr((uint8_t *)src + offset, needle0, (size_t)(src_len - offset));

        if (!next)
            return nullptr;
        if (!memcmp(next, needle, (size_t)needle_len))
            return next;

        offset = next - (const uint8_t *)src + 1;
    }

    return nullptr;
}

#endif

// ------------------------------------------------------------------------
// Memory / Allocator
// ------------------------------------------------------------------------

K_DEFAULT_ALLOCATOR DefaultAllocator;
VoidAllocator NullAllocator;

void *MallocAllocator::Allocate(Size size)
{
    void *ptr = malloc((size_t)size);
    K_CRITICAL(ptr, "Failed to allocate %1 of memory", FmtMemSize(size));

    return ptr;
}

void *MallocAllocator::Resize(void *ptr, Size old_size, Size new_size)
{
    if (!new_size) {
        Release(ptr, old_size);
        return nullptr;
    }

    ptr = realloc(ptr, (size_t)new_size);
    K_CRITICAL(ptr || !new_size, "Failed to resize %1 memory block to %2", FmtMemSize(old_size), FmtMemSize(new_size));

    return ptr;
}

void MallocAllocator::Release(const void *ptr, Size)
{
    free((void *)ptr);
}

LinkedAllocator& LinkedAllocator::operator=(LinkedAllocator &&other)
{
    ReleaseAll();

    allocator = other.allocator;
    list = other.list;
    other.list = nullptr;

    return *this;
}

void LinkedAllocator::ReleaseAll()
{
    if (!list)
        return;

    Bucket *bucket = list;

    do {
        Bucket *next = bucket->next;
        allocator->Release(bucket, -1);
        bucket = next;
    } while (bucket != list);

    list = nullptr;
}

void LinkedAllocator::ReleaseAllExcept(void *ptr)
{
    K_ASSERT(ptr);

    Bucket *keep = PointerToBucket(ptr);
    Bucket *bucket = keep->next;

    while (bucket != keep) {
        Bucket *next = bucket->next;
        allocator->Release(bucket, -1);
        bucket = next;
    }

    list = keep;

    keep->prev = keep;
    keep->next = keep;
}

void *LinkedAllocator::Allocate(Size size)
{
    K_ASSERT(size >= 0 && size <= K_SIZE_MAX - K_SIZE(Bucket));

    Bucket *bucket = (Bucket *)allocator->Allocate(K_SIZE(Bucket) + size);

#if defined(K_DEBUG)
    bucket->size = size;
#endif

    bucket->prev = bucket;
    bucket->next = bucket;

    list = list ? list : bucket;

    bucket->prev = list;
    bucket->next = list->next;
    list->next->prev = bucket;
    list->next = bucket;

    return (void *)bucket->data;
}

void *LinkedAllocator::Resize(void *ptr, Size old_size, Size new_size)
{
    if (!ptr) {
        ptr = Allocate(new_size);
    } else if (!new_size) {
        Release(ptr, old_size);
        ptr = nullptr;
    } else {
        Bucket *bucket = PointerToBucket(ptr);
        bool single = (bucket->next == bucket);

        bucket = (Bucket *)allocator->Resize(bucket, K_SIZE(Bucket) + old_size,
                                                     K_SIZE(Bucket) + new_size);

#if defined(K_DEBUG)
        K_ASSERT(bucket->size == old_size);
        bucket->size = new_size;
#endif

        list = bucket;

        if (single) {
            bucket->prev = bucket;
            bucket->next = bucket;
        } else {
            bucket->prev->next = bucket;
            bucket->next->prev = bucket;
        }

        ptr = (void *)bucket->data;
    }

    return ptr;
}

void LinkedAllocator::Release(const void *ptr, [[maybe_unused]] Size size)
{
    if (!ptr)
        return;

    Bucket *bucket = PointerToBucket((void *)ptr);
    bool single = (bucket->next == bucket);

#if defined(K_DEBUG)
    K_ASSERT(bucket->size == size);
#endif

    list = single ? nullptr : bucket->next;

    bucket->prev->next = bucket->next;
    bucket->next->prev = bucket->prev;

    allocator->Release(bucket, -1);
}

void LinkedAllocator::GiveTo(LinkedAllocator *alloc)
{
    Bucket *other = alloc->list;

    if (other && list) {
        other->prev->next = list;
        list->prev = other->prev;
        list->next = other;
        other->prev = list;
    } else if (list) {
        K_ASSERT(!alloc->list);
        alloc->list = list;
    }

    list = nullptr;
}

LinkedAllocator::Bucket *LinkedAllocator::PointerToBucket(void *ptr)
{
    uint8_t *data = (uint8_t *)ptr;
    return (Bucket *)(data - offsetof(Bucket, data));
}

BlockAllocator& BlockAllocator::operator=(BlockAllocator &&other)
{
    allocator.operator=(std::move(other.allocator));

    block_size = other.block_size;

    bucket_ptr = other.bucket_ptr;
    bucket_end = other.bucket_end;
    last_alloc = other.last_alloc;

    other.bucket_ptr = nullptr;
    other.bucket_end = nullptr;
    other.last_alloc = nullptr;

    return *this;
}

void BlockAllocator::Reset()
{
    if (bucket_ptr) {
        bucket_ptr = bucket_end - block_size;

        // Not true but Resize code assumes that last_alloc is not null when a bucket exists.
        // I could also let it as-is, but for some reason I find that less clean.
        last_alloc = bucket_ptr;

        allocator.ReleaseAllExcept(bucket_ptr);
    } else {
        ReleaseAll();
    }
}

void BlockAllocator::ReleaseAll()
{
    bucket_ptr = nullptr;
    bucket_end = nullptr;
    last_alloc = nullptr;

    allocator.ReleaseAll();
}

void *BlockAllocator::Allocate(Size size)
{
    K_ASSERT(size >= 0);

    uint8_t *ptr = bucket_ptr;

    // Fast path
    if (uint8_t *new_ptr = AlignUp(ptr + size, 8); new_ptr <= bucket_end) [[likely]] {
        bucket_ptr = new_ptr;

        last_alloc = ptr;
        return ptr;
    }

    if (size <= block_size) {
        bucket_ptr = (uint8_t *)allocator.Allocate(block_size);
        bucket_end = bucket_ptr + block_size;

        ptr = bucket_ptr;
        bucket_ptr = AlignUp(ptr + size, 8);

        last_alloc = ptr;
        return ptr;
    }

    // Fallback for big allocations
    return allocator.Allocate(size);
}

void *BlockAllocator::Resize(void *ptr, Size old_size, Size new_size)
{
    K_ASSERT(old_size >= 0);
    K_ASSERT(new_size >= 0);
    K_ASSERT(ptr || !old_size);

    if (!new_size) {
        Release(ptr, old_size);
        return nullptr;
    }

    // Fast path
    if (uint8_t *new_ptr = AlignUp((uint8_t *)ptr + new_size, 8); ptr == last_alloc && new_ptr <= bucket_end) {
        K_ASSERT(ptr);

        bucket_ptr = new_ptr;
        return ptr;
    }

    if (old_size <= block_size) {
        uint8_t *copy_ptr = (uint8_t *)Allocate(new_size);
        Size copy_len = std::min(old_size, new_size);

        MemCpy(copy_ptr, ptr, copy_len);

        return copy_ptr;
    }

    // Old allocation fell back to separate allocation, we can resize at will now!
    return allocator.Resize(ptr, old_size, new_size);
}

void BlockAllocator::Release(const void *ptr, Size size)
{
    K_ASSERT(size >= 0);

    if (ptr == last_alloc) {
        bucket_ptr = last_alloc;
    } else if (size > block_size) {
        allocator.Release(ptr, size);
    }
}

void BlockAllocator::GiveTo(LinkedAllocator *alloc)
{
    bucket_ptr = nullptr;
    bucket_end = nullptr;
    last_alloc = nullptr;

    allocator.GiveTo(alloc);
}

#if defined(_WIN32)

void *AllocateSafe(Size len)
{
    void *ptr = VirtualAlloc(nullptr, (SIZE_T)len, MEM_RESERVE | MEM_COMMIT, PAGE_READWRITE);
    if (!ptr) {
        LogError("Failed to allocate %1 of memory: %2", FmtMemSize(len), GetWin32ErrorString());
        abort();
    }

    if (!VirtualLock(ptr, (SIZE_T)len)) {
        LogError("Failed to lock memory (%1): %2", FmtMemSize(len), GetWin32ErrorString());
        abort();
    }

    ZeroSafe(ptr, len);

    return ptr;
}

void ReleaseSafe(void *ptr, Size len)
{
    if (!ptr)
        return;

    ZeroSafe(ptr, len);
    VirtualFree(ptr, 0, MEM_RELEASE);
}

void ZeroSafe(void *ptr, Size len)
{
    SecureZeroMemory(ptr, (SIZE_T)len);
}

#elif !defined(__wasi__)

static int GetPageSize()
{
    static Size pagesize = sysconf(_SC_PAGESIZE);
    return pagesize;
}

void *AllocateSafe(Size len)
{
    Size aligned = AlignLen(len, GetPageSize());
    int flags = MAP_PRIVATE | MAP_ANONYMOUS;

#if defined(MAP_CONCEAL)
    flags |= MAP_CONCEAL;
#endif

    void *ptr = mmap(nullptr, (size_t)aligned, PROT_READ | PROT_WRITE, flags, -1, 0);
    if (ptr == MAP_FAILED) {
        LogError("Failed to allocate %1 of memory: %2", FmtMemSize(len), strerror(errno));
        abort();
    }

    if (mlock(ptr, (size_t)aligned) < 0) {
        LogError("Failed to lock memory (%1): %2", FmtMemSize(len), strerror(errno));
        abort();
    }

#if defined(MADV_DONTDUMP)
    (void)madvise(ptr, (size_t)aligned, MADV_DONTDUMP);
#elif defined(MADV_NOCORE)
    (void)madvise(ptr, (size_t)aligned, MADV_NOCORE);
#endif

    ZeroSafe(ptr, len);

    return ptr;
}

void ReleaseSafe(void *ptr, Size len)
{
    if (!ptr)
        return;

    ZeroSafe(ptr, len);

    Size aligned = AlignLen(len, GetPageSize());
    munmap(ptr, aligned);
}

void ZeroSafe(void *ptr, Size len)
{
    MemSet(ptr, 0, len);
    __asm__ __volatile__("" : : "r"(ptr) : "memory");
}

#endif

// ------------------------------------------------------------------------
// Date
// ------------------------------------------------------------------------

LocalDate LocalDate::FromJulianDays(int days)
{
    K_ASSERT(days >= 0);

    // Algorithm from Richards, copied from Wikipedia:
    // https://en.wikipedia.org/w/index.php?title=Julian_day&oldid=792497863

    LocalDate date;
    {
        int f = days + 1401 + (((4 * days + 274277) / 146097) * 3) / 4 - 38;
        int e = 4 * f + 3;
        int g = e % 1461 / 4;
        int h = 5 * g + 2;
        date.st.day = (int8_t)(h % 153 / 5 + 1);
        date.st.month = (int8_t)((h / 153 + 2) % 12 + 1);
        date.st.year = (int16_t)((e / 1461) - 4716 + (date.st.month < 3));
    }

    return date;
}

int LocalDate::ToJulianDays() const
{
    K_ASSERT(IsValid());

    // Straight from the Web:
    // http://www.cs.utsa.edu/~cs1063/projects/Spring2011/Project1/jdn-explanation.html

    bool adjust = st.month < 3;
    int year = st.year + 4800 - adjust;
    int month = st.month + 12 * adjust - 3;

    int julian_days = st.day + (153 * month + 2) / 5 + 365 * year - 32045 +
                      year / 4 - year / 100 + year / 400;

    return julian_days;
}

int LocalDate::IsoWeekDay() const
{
    K_ASSERT(IsValid());
    return 1 + ToJulianDays() % 7;
}

LocalDate &LocalDate::operator++()
{
    K_ASSERT(IsValid());

    if (st.day < DaysInMonth(st.year, st.month)) {
        st.day++;
    } else if (st.month < 12) {
        st.month++;
        st.day = 1;
    } else {
        st.year++;
        st.month = 1;
        st.day = 1;
    }

    return *this;
}

LocalDate &LocalDate::operator--()
{
    K_ASSERT(IsValid());

    if (st.day > 1) {
        st.day--;
    } else if (st.month > 1) {
        st.month--;
        st.day = DaysInMonth(st.year, st.month);
    } else {
        st.year--;
        st.month = 12;
        st.day = DaysInMonth(st.year, st.month);
    }

    return *this;
}

// ------------------------------------------------------------------------
// Time
// ------------------------------------------------------------------------

#if defined(_WIN32)

static int64_t FileTimeToUnixTime(FILETIME ft)
{
    int64_t time = ((int64_t)ft.dwHighDateTime << 32) | ft.dwLowDateTime;
    return time / 10000 - 11644473600000ll;
}

static FILETIME UnixTimeToFileTime(int64_t time)
{
    time = (time + 11644473600000ll) * 10000;

    FILETIME ft;
    ft.dwHighDateTime = (DWORD)(time >> 32);
    ft.dwLowDateTime = (DWORD)time;

    return ft;
}

#endif

int64_t GetUnixTime()
{
#if defined(_WIN32)
    FILETIME ft;
    GetSystemTimeAsFileTime(&ft);

    return FileTimeToUnixTime(ft);
#elif defined(__EMSCRIPTEN__)
    return (int64_t)emscripten_get_now();
#elif defined(__linux__)
    struct timespec ts;
    K_CRITICAL(clock_gettime(CLOCK_REALTIME_COARSE, &ts) == 0, "clock_gettime(CLOCK_REALTIME_COARSE) failed: %1", strerror(errno));

    int64_t time = (int64_t)ts.tv_sec * 1000 + (int64_t)ts.tv_nsec / 1000000;
    return time;
#else
    struct timespec ts;
    K_CRITICAL(clock_gettime(CLOCK_REALTIME, &ts) == 0, "clock_gettime(CLOCK_REALTIME) failed: %1", strerror(errno));

    int64_t time = (int64_t)ts.tv_sec * 1000 + (int64_t)ts.tv_nsec / 1000000;
    return time;
#endif
}

TimeSpec DecomposeTimeUTC(int64_t time)
{
    TimeSpec spec = {};

#if defined(_WIN32)
    __time64_t time64 = time / 1000;

    struct tm ti = {};
    _gmtime64_s(&ti, &time64);
#else
    time_t time64 = time / 1000;

    struct tm ti = {};
    gmtime_r(&time64, &ti);
#endif

    spec.year = (int16_t)(1900 + ti.tm_year);
    spec.month = (int8_t)ti.tm_mon + 1; // Whose idea was it to use 0-11? ...
    spec.day = (int8_t)ti.tm_mday;
    spec.week_day = (int8_t)(ti.tm_wday ? (ti.tm_wday + 1) : 7);
    spec.hour = (int8_t)ti.tm_hour;
    spec.min = (int8_t)ti.tm_min;
    spec.sec = (int8_t)ti.tm_sec;
    spec.msec = time % 1000;
    spec.offset = 0;

    return spec;
}

TimeSpec DecomposeTimeLocal(int64_t time)
{
    TimeSpec spec = {};

#if defined(_WIN32)
    __time64_t time64 = time / 1000;

    struct tm ti = {};
    int offset = 0;

    _localtime64_s(&ti, &time64);

    struct tm utc = {};
    _gmtime64_s(&utc, &time64);

    offset = (int)(_mktime64(&ti) - _mktime64(&utc) + (3600 * ti.tm_isdst));
#else
    time_t time64 = time / 1000;

    struct tm ti = {};
    int offset = 0;

    localtime_r(&time64, &ti);
    offset = ti.tm_gmtoff;
#endif

    spec.year = (int16_t)(1900 + ti.tm_year);
    spec.month = (int8_t)ti.tm_mon + 1; // Whose idea was it to use 0-11? ...
    spec.day = (int8_t)ti.tm_mday;
    spec.week_day = (int8_t)(ti.tm_wday ? (ti.tm_wday + 1) : 7);
    spec.hour = (int8_t)ti.tm_hour;
    spec.min = (int8_t)ti.tm_min;
    spec.sec = (int8_t)ti.tm_sec;
    spec.msec = time % 1000;
    spec.offset = (int16_t)(offset / 60);

    return spec;
}

int64_t ComposeTimeUTC(const TimeSpec &spec)
{
    K_ASSERT(!spec.offset);

    struct tm ti = {};

    ti.tm_year = spec.year - 1900;
    ti.tm_mon = spec.month - 1;
    ti.tm_mday = spec.day;
    ti.tm_hour = spec.hour;
    ti.tm_min = spec.min;
    ti.tm_sec = spec.sec;

#if defined(_WIN32)
    int64_t time = (int64_t)_mkgmtime64(&ti);
#else
    int64_t time = (int64_t)timegm(&ti);
#endif

    time *= 1000;
    time += spec.msec;

    return time;
}

// ------------------------------------------------------------------------
// Clock
// ------------------------------------------------------------------------

int64_t GetMonotonicClock()
{
    static std::atomic_int64_t memory;

#if defined(_WIN32)
    int64_t clock = (int64_t)GetTickCount64();
#elif defined(__EMSCRIPTEN__)
    int64_t clock = emscripten_get_now();
#elif defined(CLOCK_MONOTONIC_COARSE)
    struct timespec ts;
    K_CRITICAL(clock_gettime(CLOCK_MONOTONIC_COARSE, &ts) == 0, "clock_gettime(CLOCK_MONOTONIC_COARSE) failed: %1", strerror(errno));

    int64_t clock = (int64_t)ts.tv_sec * 1000 + (int64_t)ts.tv_nsec / 1000000;
#else
    struct timespec ts;
    K_CRITICAL(clock_gettime(CLOCK_MONOTONIC, &ts) == 0, "clock_gettime(CLOCK_MONOTONIC) failed: %1", strerror(errno));

    int64_t clock = (int64_t)ts.tv_sec * 1000 + (int64_t)ts.tv_nsec / 1000000;
#endif

    // Protect against clock going backwards
    int64_t prev = memory.load(std::memory_order_relaxed);
    if (clock < prev) [[unlikely]]
        return prev;
    memory.compare_exchange_weak(prev, clock, std::memory_order_relaxed, std::memory_order_relaxed);

    return clock;
}

// ------------------------------------------------------------------------
// Strings
// ------------------------------------------------------------------------

bool CopyString(const char *str, Span<char> buf)
{
#if defined(K_DEBUG)
    K_ASSERT(buf.len > 0);
#else
    if (!buf.len) [[unlikely]]
        return false;
#endif

    Size i = 0;
    for (; str[i]; i++) {
        if (i >= buf.len - 1) [[unlikely]] {
            buf[buf.len - 1] = 0;
            return false;
        }
        buf[i] = str[i];
    }
    buf[i] = 0;

    return true;
}

bool CopyString(Span<const char> str, Span<char> buf)
{
#if defined(K_DEBUG)
    K_ASSERT(buf.len > 0);
#else
    if (!buf.len) [[unlikely]]
        return false;
#endif

    Size copy_len = std::min(str.len, buf.len - 1);

    MemCpy(buf.ptr, str.ptr, copy_len);
    buf[copy_len] = 0;

    return (copy_len == str.len);
}

Span<char> DuplicateString(Span<const char> str, Allocator *alloc)
{
    K_ASSERT(alloc);

    char *new_str = (char *)AllocateRaw(alloc, str.len + 1);
    MemCpy(new_str, str.ptr, str.len);
    new_str[str.len] = 0;
    return MakeSpan(new_str, str.len);
}

template <typename CompareFunc>
static inline int NaturalCmp(Span<const char> str1, Span<const char> str2, CompareFunc cmp)
{
    Size i = 0;
    Size j = 0;

    while (i < str1.len && j < str2.len) {
        int delta = cmp(str1[i], str2[j]);

        if (delta) {
            if (IsAsciiDigit(str1[i]) && IsAsciiDigit(str2[i])) {
                while (i < str1.len && str1[i] == '0') {
                    i++;
                }
                while (j < str2.len && str2[j] == '0') {
                    j++;
                }

                bool digit1 = false;
                bool digit2 = false;
                int bias = 0;

                for (;;) {
                    digit1 = (i < str1.len) && IsAsciiDigit(str1[i]);
                    digit2 = (j < str2.len) && IsAsciiDigit(str2[j]);

                    if (!digit1 || !digit2)
                        break;

                    bias = bias ? bias : cmp(str1[i], str2[j]);
                    i++;
                    j++;
                }

                if (!digit1 && !digit2 && bias) {
                    return bias;
                } else if (digit1 || digit2) {
                    return digit1 ? 1 : -1;
                }
            } else {
                return delta;
            }
        } else {
            i++;
            j++;
        }
    }

    if (i == str1.len && j < str2.len) {
        return -1;
    } else if (i < str1.len) {
        return 1;
    } else {
        return 0;
    }
}

int CmpNatural(Span<const char> str1, Span<const char> str2)
{
    auto cmp = [](int a, int b) { return a - b; };
    return NaturalCmp(str1, str2, cmp);
}

int CmpNaturalI(Span<const char> str1, Span<const char> str2)
{
    auto cmp = [](int a, int b) { return LowerAscii(a) - LowerAscii(b); };
    return NaturalCmp(str1, str2, cmp);
}

// ------------------------------------------------------------------------
// Format
// ------------------------------------------------------------------------

static const char DigitPairs[201] = "00010203040506070809101112131415161718192021222324"
                                    "25262728293031323334353637383940414243444546474849"
                                    "50515253545556575859606162636465666768697071727374"
                                    "75767778798081828384858687888990919293949596979899";
static const char BigHexLiterals[] = "0123456789ABCDEF";
static const char SmallHexLiterals[] = "0123456789abcdef";

static Span<char> FormatUnsignedToDecimal(uint64_t value, char out_buf[32])
{
    Size offset = 32;
    {
        int pair_idx;
        do {
            pair_idx = (int)((value % 100) * 2);
            value /= 100;
            offset -= 2;
            MemCpy(out_buf + offset, DigitPairs + pair_idx, 2);
        } while (value);
        offset += (pair_idx < 20);
    }

    return MakeSpan(out_buf + offset, 32 - offset);
}

static Span<char> FormatUnsignedToBinary(uint64_t value, char out_buf[64])
{
    Size msb = 64 - (Size)CountLeadingZeros(value);
    if (!msb) {
        msb = 1;
    }

    for (Size i = 0; i < msb; i++) {
        bool bit = (value >> (msb - i - 1)) & 0x1;
        out_buf[i] = bit ? '1' : '0';
    }

    return MakeSpan(out_buf, msb);
}

static Span<char> FormatUnsignedToOctal(uint64_t value, char out_buf[64])
{
    Size offset = 64;
    do {
        uint64_t digit = value & 0x7;
        value >>= 3;
        out_buf[--offset] = BigHexLiterals[digit];
    } while (value);

    return MakeSpan(out_buf + offset, 64 - offset);
}

static Span<char> FormatUnsignedToBigHex(uint64_t value, char out_buf[32])
{
    Size offset = 32;
    do {
        uint64_t digit = value & 0xF;
        value >>= 4;
        out_buf[--offset] = BigHexLiterals[digit];
    } while (value);

    return MakeSpan(out_buf + offset, 32 - offset);
}

static Span<char> FormatUnsignedToSmallHex(uint64_t value, char out_buf[32])
{
    Size offset = 32;
    do {
        uint64_t digit = value & 0xF;
        value >>= 4;
        out_buf[--offset] = SmallHexLiterals[digit];
    } while (value);

    return MakeSpan(out_buf + offset, 32 - offset);
}

#if defined(JKJ_HEADER_DRAGONBOX)
static Size FakeFloatPrecision(Span<char> buf, int K, int min_prec, int max_prec, int *out_K)
{
    K_ASSERT(min_prec >= 0);

    if (-K < min_prec) {
        int delta = min_prec + K;
        MemSet(buf.end(), '0', delta);

        *out_K -= delta;
        return buf.len + delta;
    } else if (-K > max_prec) {
        if (-K <= buf.len) {
            int offset = (int)buf.len + K;
            int truncate = offset + max_prec;
            int scale = offset + max_prec;

            if (buf[truncate] >= '5') {
                buf[truncate] = '0';

                for (int i = truncate - 1; i >= 0; i--) {
                    if (buf[i] == '9') {
                        buf[i] = '0' + !i;
                        truncate += !i;
                    } else {
                        buf[i]++;
                        break;
                    }
                }
            }

            *out_K -= (int)(scale - buf.len);
            return truncate;
        } else {
            buf[0] = '0' + (-K == buf.len + 1 && buf[0] >= '5');

            if (min_prec) {
                MemSet(buf.ptr + 1, '0', min_prec - 1);
                *out_K = -min_prec;
                return min_prec;
            } else {
                *out_K = 0;
                return 1;
            }
        }
    } else {
        return buf.len;
    }
}

static Span<char> PrettifyFloat(Span<char> buf, int K, int min_prec, int max_prec)
{
    // Apply precision settings after conversion
    buf.len = FakeFloatPrecision(buf, K, min_prec, max_prec, &K);

    int KK = (int)buf.len + K;

    if (K >= 0) {
        // 1234e7 -> 12340000000

        if (!buf.len && !K) {
            K = 1;
        }

        MemSet(buf.end(), '0', K);
        buf.len += K;
    } else if (KK > 0) {
        // 1234e-2 -> 12.34

        MemMove(buf.ptr + KK + 1, buf.ptr + KK, buf.len - KK);
        buf.ptr[KK] = '.';
        buf.len++;
    } else {
        // 1234e-6 -> 0.001234

        int offset = 2 - KK;
        MemMove(buf.ptr + offset, buf.ptr, buf.len);
        MemSet(buf.ptr, '0', offset);
        buf.ptr[1] = '.';
        buf.len += offset;
    }

    return buf;
}

static Span<char> ExponentiateFloat(Span<char> buf, int K, int min_prec, int max_prec)
{
    // Apply precision settings after conversion
    buf.len = FakeFloatPrecision(buf, (int)(1 - buf.len), min_prec, max_prec, &K);

    int exponent = (int)buf.len + K - 1;

    if (buf.len > 1) {
        MemMove(buf.ptr + 2, buf.ptr + 1, buf.len - 1);
        buf.ptr[1] = '.';
        buf.ptr[buf.len + 1] = 'e';
        buf.len += 2;
    } else {
        buf.ptr[1] = 'e';
        buf.len = 2;
    }

    if (exponent > 0) {
        buf.ptr[buf.len++] = '+';
    } else {
        buf.ptr[buf.len++] = '-';
        exponent = -exponent;
    }

    if (exponent >= 100) {
        buf.ptr[buf.len++] = (char)('0' + exponent / 100);
        exponent %= 100;

        int pair_idx = (int)(exponent * 2);
        MemCpy(buf.end(), DigitPairs + pair_idx, 2);
        buf.len += 2;
    } else if (exponent >= 10) {
        int pair_idx = (int)(exponent * 2);
        MemCpy(buf.end(), DigitPairs + pair_idx, 2);
        buf.len += 2;
    } else {
        buf.ptr[buf.len++] = (char)('0' + exponent);
    }

    return buf;
}
#endif

// NaN and Inf are handled by caller
template <typename T>
Span<const char> FormatFloatingPoint(T value, bool non_zero, int min_prec, int max_prec, char out_buf[128])
{
#if defined(JKJ_HEADER_DRAGONBOX)
    if (non_zero) {
        auto v = jkj::dragonbox::to_decimal(value, jkj::dragonbox::policy::sign::ignore);

        Span<char> buf = FormatUnsignedToDecimal(v.significand, out_buf);
        int KK = (int)buf.len + v.exponent;

        if (KK > -6 && KK <= 21) {
            return PrettifyFloat(buf, v.exponent, min_prec, max_prec);
        } else {
            return ExponentiateFloat(buf, v.exponent, min_prec, max_prec);
        }
    } else {
        Span<char> buf = MakeSpan(out_buf, 128);

        buf[0] = '0';
        if (min_prec) {
            buf.ptr[1] = '.';
            MemSet(buf.ptr + 2, '0', min_prec);
            buf.len = 2 + min_prec;
        } else {
            buf.len = 1;
        }

        return buf;
    }
#else
    #if defined(_MSC_VER)
        #pragma message("Cannot format floating point values correctly without Dragonbox")
    #else
        #warning Cannot format floating point values correctly without Dragonbox
    #endif

    int ret = snprintf(out_buf, 128, "%g", value);
    return MakeSpan(out_buf, std::min(ret, 128));
#endif
}

template <typename AppendFunc>
static inline void AppendPad(Size pad, char padding, AppendFunc append)
{
    for (Size i = 0; i < pad; i++) {
        append(padding);
    }
}

template <typename AppendFunc>
static inline void AppendSafe(char c, AppendFunc append)
{
    if (IsAsciiControl(c))
        return;

    append(c);
}

template <typename AppendFunc>
static inline void ProcessArg(const FmtArg &arg, AppendFunc append)
{
    switch (arg.type) {
        case FmtType::Str: { append(arg.u.str); } break;

        case FmtType::PadStr: {
            append(arg.u.str);
            AppendPad(arg.pad - arg.u.str.len, arg.padding, append);
        } break;
        case FmtType::RepeatStr: {
            Span<const char> str = arg.u.repeat.str;

            for (int i = 0; i < arg.u.repeat.count; i++) {
                append(str);
            }
        } break;

        case FmtType::Char: { append(MakeSpan(&arg.u.ch, 1)); } break;
        case FmtType::Buffer: {
            Span<const char> str = arg.u.buf;
            append(str);
        } break;
        case FmtType::Custom: { arg.u.custom.Format(append); } break;

        case FmtType::Bool: { append(arg.u.b ? "true" : "false"); } break;

        case FmtType::Integer: {
            if (arg.u.i < 0) {
                char buf[128];
                Span<const char> str = FormatUnsignedToDecimal((uint64_t)-arg.u.i, buf);

                if (arg.pad) {
                    if (arg.padding == '0') {
                        append('-');
                        AppendPad((Size)arg.pad - str.len - 1, arg.padding, append);
                    } else {
                        AppendPad((Size)arg.pad - str.len - 1, arg.padding, append);
                        append('-');
                    }
                } else {
                    append('-');
                }

                append(str);
            } else {
                char buf[128];
                Span<const char> str = FormatUnsignedToDecimal((uint64_t)arg.u.i, buf);

                AppendPad((Size)arg.pad - str.len, arg.padding, append);
                append(str);
            }
        } break;
        case FmtType::Unsigned: {
            char buf[128];
            Span<const char> str = FormatUnsignedToDecimal(arg.u.u, buf);

            AppendPad((Size)arg.pad - str.len, arg.padding, append);
            append(str);
        } break;

        case FmtType::Float: {
            static const uint32_t ExponentMask = 0x7f800000u;
            static const uint32_t MantissaMask = 0x007fffffu;
            static const uint32_t SignMask = 0x80000000u;

            union { float f; uint32_t u32; } u;
            u.f = arg.u.f.value;

            if ((u.u32 & ExponentMask) == ExponentMask) {
                uint32_t mantissa = u.u32 & MantissaMask;

                if (mantissa) {
                    append("NaN");
                } else {
                    append((u.u32 & SignMask) ? "-Inf" : "Inf");
                }
            } else {
                char buf[128];

                if (u.u32 & SignMask) {
                    append('-');
                    append(FormatFloatingPoint(-u.f, true, arg.u.f.min_prec, arg.u.f.max_prec, buf));
                } else {
                    append(FormatFloatingPoint(u.f, u.u32, arg.u.f.min_prec, arg.u.f.max_prec, buf));
                }
            }
        } break;
        case FmtType::Double: {
            static const uint64_t ExponentMask = 0x7FF0000000000000ull;
            static const uint64_t MantissaMask = 0x000FFFFFFFFFFFFFull;
            static const uint64_t SignMask = 0x8000000000000000ull;

            union { double d; uint64_t u64; } u;
            u.d = arg.u.d.value;

            if ((u.u64 & ExponentMask) == ExponentMask) {
                uint64_t mantissa = u.u64 & MantissaMask;

                if (mantissa) {
                    append("NaN");
                } else {
                    append((u.u64 & SignMask) ? "-Inf" : "Inf");
                }
            } else {
                char buf[128];

                if (u.u64 & SignMask) {
                    append('-');
                    append(FormatFloatingPoint(-u.d, true, arg.u.d.min_prec, arg.u.d.max_prec, buf));
                } else {
                    append(FormatFloatingPoint(u.d, u.u64, arg.u.d.min_prec, arg.u.d.max_prec, buf));
                }
            }
        } break;

        case FmtType::Binary: {
            char buf[128];
            Span<const char> str = FormatUnsignedToBinary(arg.u.u, buf);

            AppendPad((Size)arg.pad - str.len, arg.padding, append);
            append(str);
        } break;
        case FmtType::Octal: {
            char buf[128];
            Span<const char> str = FormatUnsignedToOctal(arg.u.u, buf);

            AppendPad((Size)arg.pad - str.len, arg.padding, append);
            append(str);
        } break;
        case FmtType::BigHex: {
            char buf[128];
            Span<const char> str = FormatUnsignedToBigHex(arg.u.u, buf);

            AppendPad((Size)arg.pad - str.len, arg.padding, append);
            append(str);
        } break;
        case FmtType::SmallHex: {
            char buf[128];
            Span<const char> str = FormatUnsignedToSmallHex(arg.u.u, buf);

            AppendPad((Size)arg.pad - str.len, arg.padding, append);
            append(str);
        } break;

        case FmtType::BigBytes: {
            for (uint8_t c: arg.u.hex) {
                char encoded[2];

                encoded[0] = BigHexLiterals[((uint8_t)c >> 4) & 0xF];
                encoded[1] = BigHexLiterals[((uint8_t)c >> 0) & 0xF];

                Span<const char> buf = MakeSpan(encoded, 2);
                append(buf);
            }
        } break;
        case FmtType::SmallBytes: {
            for (uint8_t c: arg.u.hex) {
                char encoded[2];

                encoded[0] = SmallHexLiterals[((uint8_t)c >> 4) & 0xF];
                encoded[1] = SmallHexLiterals[((uint8_t)c >> 0) & 0xF];

                Span<const char> buf = MakeSpan(encoded, 2);
                append(buf);
            }
        } break;

        case FmtType::MemorySize: {
            char buf[128];

            double size;
            if (arg.u.i < 0) {
                append('-');
                size = (double)-arg.u.i;
            } else {
                size = (double)arg.u.i;
            }

            if (size >= 1073688137.0) {
                size /= 1073741824.0;

                int prec = 1 + (size < 9.9995) + (size < 99.995);
                append(FormatFloatingPoint(size, true, prec, prec, buf));
                append(" GiB");
            } else if (size >= 1048524.0) {
                size /= 1048576.0;

                int prec = 1 + (size < 9.9995) + (size < 99.995);
                append(FormatFloatingPoint(size, true, prec, prec, buf));
                append(" MiB");
            } else if (size >= 1023.95) {
                size /= 1024.0;

                int prec = 1 + (size < 9.9995) + (size < 99.995);
                append(FormatFloatingPoint(size, true, prec, prec, buf));
                append(" kiB");
            } else {
                append(FormatFloatingPoint(size, arg.u.i, 0, 0, buf));
                append(" B");
            }
        } break;
        case FmtType::DiskSize: {
            char buf[128];

            double size;
            if (arg.u.i < 0) {
                append('-');
                size = (double)-arg.u.i;
            } else {
                size = (double)arg.u.i;
            }

            if (size >= 999950000.0) {
                size /= 1000000000.0;

                int prec = 1 + (size < 9.9995) + (size < 99.995);
                append(FormatFloatingPoint(size, true, prec, prec, buf));
                append(" GB");
            } else if (size >= 999950.0) {
                size /= 1000000.0;

                int prec = 1 + (size < 9.9995) + (size < 99.995);
                append(FormatFloatingPoint(size, true, prec, prec, buf));
                append(" MB");
            } else if (size >= 999.95) {
                size /= 1000.0;

                int prec = 1 + (size < 9.9995) + (size < 99.995);
                append(FormatFloatingPoint(size, true, prec, prec, buf));
                append(" kB");
            } else {
                append(FormatFloatingPoint(size, arg.u.i, 0, 0, buf));
                append(" B");
            }
        } break;

        case FmtType::Date: {
            K_ASSERT(!arg.u.date.value || arg.u.date.IsValid());

            char buf[128];

            int year = arg.u.date.st.year;
            if (year < 0) {
                append('-');
                year = -year;
            }
            if (year < 10) {
                append("000");
            } else if (year < 100) {
                append("00");
            } else if (year < 1000) {
                append('0');
            }
            append(FormatUnsignedToDecimal((uint64_t)year, buf));
            append('-');
            if (arg.u.date.st.month < 10) {
                append('0');
            }
            append(FormatUnsignedToDecimal((uint64_t)arg.u.date.st.month, buf));
            append('-');
            if (arg.u.date.st.day < 10) {
                append('0');
            }
            append(FormatUnsignedToDecimal((uint64_t)arg.u.date.st.day, buf));
        } break;

        case FmtType::TimeBasic: {
            const TimeSpec &spec = arg.u.time.spec;

            LocalArray<char, 128> buf;

            if (spec.offset && arg.u.time.ms) {
                int offset_h = spec.offset / 60;
                int offset_m = spec.offset % 60;

                buf.len = Fmt(buf.data, "%1%2%3T%4%5%6.%7%8%9%10",
                              FmtInt(spec.year, 2), FmtInt(spec.month, 2),
                              FmtInt(spec.day, 2), FmtInt(spec.hour, 2),
                              FmtInt(spec.min, 2), FmtInt(spec.sec, 2), FmtInt(spec.msec, 3),
                              offset_h >= 0 ? "+" : "", FmtInt(offset_h, 2), FmtInt(offset_m, 2)).len;
            } else if (spec.offset) {
                int offset_h = spec.offset / 60;
                int offset_m = spec.offset % 60;

                buf.len = Fmt(buf.data, "%1%2%3T%4%5%6%7%8%9",
                              FmtInt(spec.year, 2), FmtInt(spec.month, 2),
                              FmtInt(spec.day, 2), FmtInt(spec.hour, 2),
                              FmtInt(spec.min, 2), FmtInt(spec.sec, 2),
                              offset_h >= 0 ? "+" : "", FmtInt(offset_h, 2), FmtInt(offset_m, 2)).len;
            } else if (arg.u.time.ms) {
                buf.len = Fmt(buf.data, "%1%2%3T%4%5%6.%7Z",
                              FmtInt(spec.year, 2), FmtInt(spec.month, 2),
                              FmtInt(spec.day, 2), FmtInt(spec.hour, 2),
                              FmtInt(spec.min, 2), FmtInt(spec.sec, 2), FmtInt(spec.msec, 3)).len;
            } else {
                buf.len = Fmt(buf.data, "%1%2%3T%4%5%6Z",
                              FmtInt(spec.year, 2), FmtInt(spec.month, 2),
                              FmtInt(spec.day, 2), FmtInt(spec.hour, 2),
                              FmtInt(spec.min, 2), FmtInt(spec.sec, 2)).len;
            }

            append(buf);
        } break;
        case FmtType::TimeIso: {
            const TimeSpec &spec = arg.u.time.spec;

            LocalArray<char, 128> buf;

            if (spec.offset && arg.u.time.ms) {
                int offset_h = spec.offset / 60;
                int offset_m = spec.offset % 60;

                buf.len = Fmt(buf.data, "%1-%2-%3T%4:%5:%6.%7%8%9%10",
                              FmtInt(spec.year, 2), FmtInt(spec.month, 2),
                              FmtInt(spec.day, 2), FmtInt(spec.hour, 2),
                              FmtInt(spec.min, 2), FmtInt(spec.sec, 2), FmtInt(spec.msec, 3),
                              offset_h >= 0 ? "+" : "", FmtInt(offset_h, 2), FmtInt(offset_m, 2)).len;
            } else if (spec.offset) {
                int offset_h = spec.offset / 60;
                int offset_m = spec.offset % 60;

                buf.len = Fmt(buf.data, "%1-%2-%3T%4:%5:%6%7%8%9",
                              FmtInt(spec.year, 2), FmtInt(spec.month, 2),
                              FmtInt(spec.day, 2), FmtInt(spec.hour, 2),
                              FmtInt(spec.min, 2), FmtInt(spec.sec, 2),
                              offset_h >= 0 ? "+" : "", FmtInt(offset_h, 2), FmtInt(offset_m, 2)).len;
            } else if (arg.u.time.ms) {
                buf.len = Fmt(buf.data, "%1-%2-%3T%4:%5:%6.%7Z",
                              FmtInt(spec.year, 2), FmtInt(spec.month, 2),
                              FmtInt(spec.day, 2), FmtInt(spec.hour, 2),
                              FmtInt(spec.min, 2), FmtInt(spec.sec, 2), FmtInt(spec.msec, 3)).len;
            } else {
                buf.len = Fmt(buf.data, "%1-%2-%3T%4:%5:%6Z",
                              FmtInt(spec.year, 2), FmtInt(spec.month, 2),
                              FmtInt(spec.day, 2), FmtInt(spec.hour, 2),
                              FmtInt(spec.min, 2), FmtInt(spec.sec, 2)).len;
            }

            append(buf);
        } break;
        case FmtType::TimeNice: {
            const TimeSpec &spec = arg.u.time.spec;

            LocalArray<char, 128> buf;

            if (arg.u.time.ms) {
                int offset_h = spec.offset / 60;
                int offset_m = spec.offset % 60;

                buf.len = Fmt(buf.data, "%1-%2-%3 %4:%5:%6.%7 %8%9%10",
                              FmtInt(spec.year, 2), FmtInt(spec.month, 2),
                              FmtInt(spec.day, 2), FmtInt(spec.hour, 2),
                              FmtInt(spec.min, 2), FmtInt(spec.sec, 2), FmtInt(spec.msec, 3),
                              offset_h >= 0 ? "+" : "", FmtInt(offset_h, 2), FmtInt(offset_m, 2)).len;
            } else {
                int offset_h = spec.offset / 60;
                int offset_m = spec.offset % 60;

                buf.len = Fmt(buf.data, "%1-%2-%3 %4:%5:%6 %7%8%9",
                              FmtInt(spec.year, 2), FmtInt(spec.month, 2),
                              FmtInt(spec.day, 2), FmtInt(spec.hour, 2),
                              FmtInt(spec.min, 2), FmtInt(spec.sec, 2),
                              offset_h >= 0 ? "+" : "", FmtInt(offset_h, 2), FmtInt(offset_m, 2)).len;
            }

            append(buf);
        } break;

        case FmtType::List: {
            Span<const char> separator = arg.u.list.separator;

            if (arg.u.list.u.names.len) {
                append(arg.u.list.u.names[0]);

                for (Size i = 1; i < arg.u.list.u.names.len; i++) {
                    append(separator);
                    append(arg.u.list.u.names[i]);
                }
            } else {
                append(T("None"));
            }
        } break;
        case FmtType::FlagNames: {
            uint64_t flags = arg.u.list.flags;
            Span<const char> separator = arg.u.list.separator;

            if (flags) {
                for (;;) {
                    int idx = CountTrailingZeros(flags);
                    flags &= ~(1ull << idx);

                    append(arg.u.list.u.names[idx]);
                    if (!flags)
                        break;
                    append(separator);
                }
            } else {
                append(T("None"));
            }
        } break;
        case FmtType::FlagOptions: {
            uint64_t flags = arg.u.list.flags;
            Span<const char> separator = arg.u.list.separator;

            if (arg.u.list.flags) {
                for (;;) {
                    int idx = CountTrailingZeros(flags);
                    flags &= ~(1ull << idx);

                    append(arg.u.list.u.options[idx].name);
                    if (!flags)
                        break;
                    append(separator);
                }
            } else {
                append(T("None"));
            }
        } break;

        case FmtType::Random: {
            LocalArray<char, 512> buf;

            static const char *const DefaultChars = "abcdefghijklmnopqrstuvwxyz0123456789";
            Span<const char> chars = arg.u.random.chars ? arg.u.random.chars : DefaultChars;

            K_ASSERT(arg.u.random.len <= K_SIZE(buf.data));
            buf.len = arg.u.random.len;

            for (Size j = 0; j < arg.u.random.len; j++) {
                int rnd = GetRandomInt(0, (int)chars.len);
                buf[j] = chars[rnd];
            }

            append(buf);
        } break;

        case FmtType::SafeStr: {
            for (char c: arg.u.str) {
                AppendSafe(c, append);
            }
        } break;
        case FmtType::SafeChar: { AppendSafe(arg.u.ch, append); } break;
    }
}

template <typename AppendFunc>
static inline Size ProcessAnsiSpecifier(const char *spec, bool vt100, AppendFunc append)
{
    Size idx = 0;

    LocalArray<char, 32> buf;
    bool valid = true;

    buf.Append("\x1B[");

    // Foreground color
    switch (spec[++idx]) {
        case 'd': { buf.Append("30"); } break;
        case 'r': { buf.Append("31"); } break;
        case 'g': { buf.Append("32"); } break;
        case 'y': { buf.Append("33"); } break;
        case 'b': { buf.Append("34"); } break;
        case 'm': { buf.Append("35"); } break;
        case 'c': { buf.Append("36"); } break;
        case 'w': { buf.Append("37"); } break;
        case 'D': { buf.Append("90"); } break;
        case 'R': { buf.Append("91"); } break;
        case 'G': { buf.Append("92"); } break;
        case 'Y': { buf.Append("93"); } break;
        case 'B': { buf.Append("94"); } break;
        case 'M': { buf.Append("95"); } break;
        case 'C': { buf.Append("96"); } break;
        case 'W': { buf.Append("97"); } break;
        case '.': { buf.Append("39"); } break;
        case '0': {
            buf.Append("0");
            goto end;
        } break;
        case 0: {
            valid = false;
            goto end;
        } break;
        default: { valid = false; } break;
    }

    // Background color
    switch (spec[++idx]) {
        case 'd': { buf.Append(";40"); } break;
        case 'r': { buf.Append(";41"); } break;
        case 'g': { buf.Append(";42"); } break;
        case 'y': { buf.Append(";43"); } break;
        case 'b': { buf.Append(";44"); } break;
        case 'm': { buf.Append(";45"); } break;
        case 'c': { buf.Append(";46"); } break;
        case 'w': { buf.Append(";47"); } break;
        case 'D': { buf.Append(";100"); } break;
        case 'R': { buf.Append(";101"); } break;
        case 'G': { buf.Append(";102"); } break;
        case 'Y': { buf.Append(";103"); } break;
        case 'B': { buf.Append(";104"); } break;
        case 'M': { buf.Append(";105"); } break;
        case 'C': { buf.Append(";106"); } break;
        case 'W': { buf.Append(";107"); } break;
        case '.': { buf.Append(";49"); } break;
        case 0: {
            valid = false;
            goto end;
        } break;
        default: { valid = false; } break;
    }

    // Bold/dim/underline/invert
    switch (spec[++idx]) {
        case '+': { buf.Append(";1"); } break;
        case '-': { buf.Append(";2"); } break;
        case '_': { buf.Append(";4"); } break;
        case '^': { buf.Append(";7"); } break;
        case '.': {} break;
        case 0: {
            valid = false;
            goto end;
        } break;
        default: { valid = false; } break;
    }

end:
    if (!valid) {
#if defined(K_DEBUG)
        LogDebug("Format string contains invalid ANSI specifier");
#endif
        return idx;
    }

    if (vt100) {
        buf.Append("m");
        append(buf);
    }

    return idx;
}

template <typename AppendFunc>
static inline void DoFormat(const char *fmt, Span<const FmtArg> args, bool vt100, AppendFunc append)
{
#if defined(K_DEBUG)
    bool invalid_marker = false;
    uint32_t unused_arguments = ((uint32_t)1 << args.len) - 1;
#endif

    const char *fmt_ptr = fmt;
    for (;;) {
        // Find the next marker (or the end of string) and write everything before it
        const char *marker_ptr = fmt_ptr;
        while (marker_ptr[0] && marker_ptr[0] != '%') {
            marker_ptr++;
        }
        append(MakeSpan(fmt_ptr, (Size)(marker_ptr - fmt_ptr)));
        if (!marker_ptr[0])
            break;

        // Try to interpret this marker as a number
        Size idx = 0;
        Size idx_end = 1;
        for (;;) {
            // Unsigned cast makes the test below quicker, don't remove it or it'll break
            unsigned int digit = (unsigned int)marker_ptr[idx_end] - '0';
            if (digit > 9)
                break;
            idx = (Size)(idx * 10) + (Size)digit;
            idx_end++;
        }

        // That was indeed a number
        if (idx_end > 1) {
            idx--;
            if (idx < args.len) {
                ProcessArg<AppendFunc>(args[idx], append);
#if defined(K_DEBUG)
                unused_arguments &= ~((uint32_t)1 << idx);
            } else {
                invalid_marker = true;
#endif
            }
            fmt_ptr = marker_ptr + idx_end;
        } else if (marker_ptr[1] == '%') {
            append('%');
            fmt_ptr = marker_ptr + 2;
        } else if (marker_ptr[1] == '/') {
            append(*K_PATH_SEPARATORS);
            fmt_ptr = marker_ptr + 2;
        } else if (marker_ptr[1] == '!') {
            fmt_ptr = marker_ptr + 2 + ProcessAnsiSpecifier(marker_ptr + 1, vt100, append);
        } else if (marker_ptr[1]) {
            append(marker_ptr[0]);
            fmt_ptr = marker_ptr + 1;
#if defined(K_DEBUG)
            invalid_marker = true;
#endif
        } else {
#if defined(K_DEBUG)
            invalid_marker = true;
#endif
            break;
        }
    }

#if defined(K_DEBUG)
    if (invalid_marker && unused_arguments) {
        PrintLn(StdErr, "\nLog format string '%1' has invalid markers and unused arguments", fmt);
    } else if (unused_arguments) {
        PrintLn(StdErr, "\nLog format string '%1' has unused arguments", fmt);
    } else if (invalid_marker) {
        PrintLn(StdErr, "\nLog format string '%1' has invalid markers", fmt);
    }
#endif
}

Span<char> FmtFmt(const char *fmt, Span<const FmtArg> args, bool vt100, Span<char> out_buf)
{
    K_ASSERT(out_buf.len >= 0);

    if (!out_buf.len)
        return {};
    out_buf.len--;

    Size available_len = out_buf.len;

    DoFormat(fmt, args, vt100, [&](Span<const char> frag) {
        Size copy_len = std::min(frag.len, available_len);

        MemCpy(out_buf.end() - available_len, frag.ptr, copy_len);
        available_len -= copy_len;
    });

    out_buf.len -= available_len;
    out_buf.ptr[out_buf.len] = 0;

    return out_buf;
}

Span<char> FmtFmt(const char *fmt, Span<const FmtArg> args, bool vt100, HeapArray<char> *out_buf)
{
    Size start_len = out_buf->len;

    out_buf->Grow(K_FMT_STRING_BASE_CAPACITY);
    DoFormat(fmt, args, vt100, [&](Span<const char> frag) {
        out_buf->Grow(frag.len + 1);
        MemCpy(out_buf->end(), frag.ptr, frag.len);
        out_buf->len += frag.len;
    });
    out_buf->ptr[out_buf->len] = 0;

    return out_buf->Take(start_len, out_buf->len - start_len);
}

Span<char> FmtFmt(const char *fmt, Span<const FmtArg> args, bool vt100, Allocator *alloc)
{
    K_ASSERT(alloc);

    HeapArray<char> buf(alloc);
    FmtFmt(fmt, args, vt100, &buf);

    return buf.TrimAndLeak(1);
}

void FmtFmt(const char *fmt, Span<const FmtArg> args, bool vt100, FunctionRef<void(Span<const char>)> append)
{
    // This one dos not null terminate! Be careful!
    DoFormat(fmt, args, vt100, append);
}

void PrintFmt(const char *fmt, Span<const FmtArg> args, StreamWriter *st)
{
    LocalArray<char, K_FMT_STRING_PRINT_BUFFER_SIZE> buf;
    DoFormat(fmt, args, st->IsVt100(), [&](Span<const char> frag) {
        if (frag.len > K_LEN(buf.data) - buf.len) {
            st->Write(buf);
            buf.len = 0;
        }
        if (frag.len >= K_LEN(buf.data)) {
            st->Write(frag);
        } else {
            MemCpy(buf.data + buf.len, frag.ptr, frag.len);
            buf.len += frag.len;
        }
    });
    st->Write(buf);
}

void PrintLnFmt(const char *fmt, Span<const FmtArg> args, StreamWriter *st)
{
    PrintFmt(fmt, args, st);
    st->Write('\n');
}

// PrintLn variants without format strings
void PrintLn(StreamWriter *out_st)
{
    out_st->Write('\n');
}
void PrintLn()
{
    StdOut->Write('\n');
}

void FmtUpperAscii::Format(FunctionRef<void(Span<const char>)> append) const
{
    for (char c: str) {
        c = UpperAscii(c);
        append((char)c);
    }
}

void FmtLowerAscii::Format(FunctionRef<void(Span<const char>)> append) const
{
    for (char c: str) {
        c = LowerAscii(c);
        append((char)c);
    }
}

void FmtUrlSafe::Format(FunctionRef<void(Span<const char>)> append) const
{
    for (char c: str) {
        if (IsAsciiAlphaOrDigit(c) || strchr(passthrough, c)) {
            append((char)c);
        } else {
            char encoded[3];

            encoded[0] = '%';
            encoded[1] = BigHexLiterals[((uint8_t)c >> 4) & 0xF];
            encoded[2] = BigHexLiterals[((uint8_t)c >> 0) & 0xF];

            Span<const char> buf = MakeSpan(encoded, 3);
            append(buf);
        }
    }
}

void FmtXmlSafe::Format(FunctionRef<void(Span<const char>)> append) const
{
    for (char c: str) {
        switch (c) {
            case '<': { append("&lt;"); } break;
            case '>':  { append("&gt;"); } break;
            case '"':  { append("&quot;"); } break;
            case '\'': { append("&apos;"); } break;
            case '&':  { append("&amp;"); } break;

            default: { append(c); } break;
        }
    }
}

void FmtEscape::Format(FunctionRef<void(Span<const char>)> append) const
{
    for (char c: str) {
        if (c == '\r') {
            append("\\r");
        } else if (c == '\n') {
            append("\\n");
        } else if (c == '\\') {
            append("\\\\");
        } else if ((unsigned int)c < 32) {
            char encoded[4];

            encoded[0] = '\\';
            encoded[1] = '0' + (((uint8_t)c >> 6) & 7);
            encoded[2] = '0' + (((uint8_t)c >> 3) & 7);
            encoded[3] = '0' + (((uint8_t)c >> 0) & 7);

            Span<const char> buf = MakeSpan(encoded, 4);
            append(buf);
        } else if (c == quote) {
            append('\\');
            append(quote);
        } else {
            append(c);
        }
    }
}

FmtArg FmtVersion(int64_t version, int parts, int by)
{
    K_ASSERT(version >= 0);
    K_ASSERT(parts > 0);

    FmtArg arg = {};
    arg.type = FmtType::Buffer;

    Span<char> buf = arg.u.buf;
    int64_t divisor = 1;

    for (int i = 1; i < parts; i++) {
        divisor *= by;
    }

    for (int i = 0; i < parts; i++) {
        int64_t component = (version / divisor) % by;
        Size len = Fmt(buf, "%1.", component).len;

        buf.ptr += len;
        buf.len -= len;

        divisor /= by;
    }

    // Remove trailing dot
    buf.ptr[-1] = 0;

    return arg;
}

// ------------------------------------------------------------------------
// Debug and errors
// ------------------------------------------------------------------------

static int64_t start_clock = GetMonotonicClock();

static std::function<LogFunc> log_handler = DefaultLogHandler;
static bool log_vt100 = FileIsVt100(STDERR_FILENO);

// thread_local is broken on MinGW when destructors are involved.
// So heap allocation it is, at least for now.
static thread_local std::function<LogFilterFunc> *log_filters[16];
static thread_local Size log_filters_len;

const char *GetEnv(const char *name)
{
#if defined(__EMSCRIPTEN__)
    // Each accessed environment variable is kept in memory and thus leaked once
    static HashMap<const char *, const char *> values;

    bool inserted;
    auto bucket = values.InsertOrGetDefault(name, &inserted);

    if (inserted) {
        const char *str = (const char *)EM_ASM_INT({
            try {
                var name = UTF8ToString($0);
                var str = process.env[name];

                if (str == null)
                    return 0;

                var bytes = lengthBytesUTF8(str) + 1;
                var utf8 = _malloc(bytes);
                stringToUTF8(str, utf8, bytes);

                return utf8;
            } catch (error) {
                return 0;
            }
        }, name);

        bucket->key = DuplicateString(name, &DefaultAllocator).ptr;
        bucket->value = str;
    }

    return bucket->value;
#else
    return getenv(name);
#endif
}

bool GetDebugFlag(const char *name, bool value)
{
    Span<const char> str = TrimStr(GetEnv(name));

    if (str.len && !ParseBool(str, &value, K_DEFAULT_PARSE_FLAGS & ~(int)ParseFlag::Log)) {
        LogError("Environment variable '%1=%2' is not a boolean", name, str);
    }
    if (value) {
        LogWarning("Debug flag '%1' is in effect, set '%1=0' to disable", name);
    }

    return value;
}

static void RunLogFilter(Size idx, LogLevel level, const char *ctx, const char *msg)
{
    const std::function<LogFilterFunc> &func = *log_filters[idx];

    func(level, ctx, msg, [&](LogLevel level, const char *ctx, const char *msg) {
        if (idx > 0) {
            RunLogFilter(idx - 1, level, ctx, msg);
        } else {
            log_handler(level, ctx, msg);
        }
    });
}

void LogFmt(LogLevel level, const char *ctx, const char *fmt, Span<const FmtArg> args)
{
    // Not thread-safe but it does not really matter if multiple threads try to run the
    // code inside the init branch below. They'll reach the same results and set the values.
    static bool init = false;
    static bool log_times;
#if defined(K_DEBUG)
    static bool log_debug;
#endif

    if (!init) {
        // Do this first... GetDebugFlag() might log an error or something, in which
        // case we don't want to recurse forever and crash!
        init = true;

        log_times = GetDebugFlag("LOG_TIMES");
#if defined(K_DEBUG)
        log_debug = GetDebugFlag("LOG_DEBUG", true);
#endif
    }

#if defined(K_DEBUG)
    if (level == LogLevel::Debug && !log_debug)
        return;
#endif

    char ctx_buf[512];
    if (log_times) {
        double time = (double)(GetMonotonicClock() - start_clock) / 1000;
        Fmt(ctx_buf, "[%1] %2", FmtDouble(time, 3, 8), ctx ? ctx : "");

        ctx = ctx_buf;
    }

    char msg_buf[2048];
    {
        Size len = FmtFmt(T(fmt), args, log_vt100, msg_buf).len;

        if (len == K_SIZE(msg_buf) - 1) {
            strncpy(msg_buf + K_SIZE(msg_buf) - 32, "... [truncated]", 32);
            msg_buf[K_SIZE(msg_buf) - 1] = 0;
        }
    }

    if (log_filters_len) {
        RunLogFilter(log_filters_len - 1, level, ctx, msg_buf);
    } else {
        log_handler(level, ctx, msg_buf);
    }
}

void SetLogHandler(const std::function<LogFunc> &func, bool vt100)
{
    log_handler = func;
    log_vt100 = vt100;
}

void DefaultLogHandler(LogLevel level, const char *ctx, const char *msg)
{
    switch (level)  {
        case LogLevel::Debug:
        case LogLevel::Info: { Print(StdErr, "%!D..%1%!0%2\n", ctx ? ctx : "", msg); } break;
        case LogLevel::Warning: { Print(StdErr, "%!M..%1%!0%2\n", ctx ? ctx : "", msg); } break;
        case LogLevel::Error: { Print(StdErr, "%!R..%1%!0%2\n", ctx ? ctx : "", msg); } break;
    }
}

void PushLogFilter(const std::function<LogFilterFunc> &func)
{
    K_ASSERT(log_filters_len < K_LEN(log_filters));
    log_filters[log_filters_len++] = new std::function<LogFilterFunc>(func);
}

void PopLogFilter()
{
    K_ASSERT(log_filters_len > 0);
    delete log_filters[--log_filters_len];
}

#if defined(_WIN32)
bool RedirectLogToWindowsEvents(const char *name)
{
    static HANDLE log = nullptr;
    K_ASSERT(!log);

    log = OpenEventLogA(nullptr, name);
    if (!log) {
        LogError("Failed to register event provider: %1", GetWin32ErrorString());
        return false;
    }
    atexit([]() { CloseEventLog(log); });

    SetLogHandler([](LogLevel level, const char *ctx, const char *msg) {
        WORD type = 0;
        LocalArray<wchar_t, 8192> buf_w;

        switch (level)  {
            case LogLevel::Debug:
            case LogLevel::Info: { type = EVENTLOG_INFORMATION_TYPE; } break;
            case LogLevel::Warning: { type = EVENTLOG_WARNING_TYPE; } break;
            case LogLevel::Error: { type = EVENTLOG_ERROR_TYPE; } break;
        }

        // Append context
        if (ctx) {
            Size len = ConvertUtf8ToWin32Wide(ctx, buf_w.TakeAvailable());
            if (len < 0)
                return;
            buf_w.len += len;
        }

        // Append message
        {
            Size len = ConvertUtf8ToWin32Wide(msg, buf_w.TakeAvailable());
            if (len < 0)
                return;
            buf_w.len += len;
        }

        const wchar_t *ptr = buf_w.data;
        ReportEventW(log, type, 0, 0, nullptr, 1, 0, &ptr, nullptr);
    }, false);

    return true;
}
#endif

// ------------------------------------------------------------------------
// Progress
// ------------------------------------------------------------------------

#if !defined(__wasi__)

struct ProgressState {
    char text[K_PROGRESS_TEXT_SIZE];

    int64_t value;
    int64_t min;
    int64_t max;

    bool determinate;
    bool valid;
};

struct ProgressNode {
    std::atomic_bool used;

    std::mutex mutex;
    ProgressState front;
    ProgressState back;
};

static std::function<ProgressFunc> pg_handler = DefaultProgressHandler;

static std::atomic_int pg_count;
static ProgressNode pg_nodes[K_PROGRESS_MAX_NODES];

static std::mutex pg_mutex;
static bool pg_run = false;

static void RunProgressThread()
{
    // Reuse for performance
    HeapArray<ProgressInfo> bars;

    int delay = StdErr->IsVt100() ? 400 : 4000;

    for (;;) {
        // Need to run still?
        {
            std::lock_guard<std::mutex> lock(pg_mutex);

            if (!pg_count) {
                pg_run = false;
                break;
            }
        }

        bars.RemoveFrom(0);

        for (ProgressNode &node: pg_nodes) {
            ProgressInfo bar = {};

            // Copy state atomically or bail
            {
                std::unique_lock<std::mutex> lock(node.mutex, std::try_to_lock);

                if (lock.owns_lock()) {
                    node.back = node.front;
                    lock.unlock();
                }

                if (!node.back.valid)
                    continue;
            }

            bar.text = node.back.text;
            bar.value = node.back.value;
            bar.min = node.back.min;
            bar.max = node.back.max;
            bar.determinate = node.back.determinate;

            bars.Append(bar);
        }

        pg_handler(bars);

        WaitDelay(delay);
    }
}

ProgressHandle::~ProgressHandle()
{
    ProgressNode *node = this->node.load();

    if (node) {
        std::lock_guard<std::mutex> lock(node->mutex);

        node->front.valid = false;
        node->used = false;

        if (!--pg_count) {
            StdErr->Flush();
        }
    }
}

void ProgressHandle::Set(int64_t value, int64_t min, int64_t max)
{
    ProgressNode *node = AcquireNode();

    if (!node) [[unlikely]]
        return;

    std::unique_lock<std::mutex> lock(node->mutex, std::try_to_lock);

    if (!lock.owns_lock())
        return;

    node->front.value = value;
    node->front.min = min;
    node->front.max = max;
    node->front.determinate = (max > min);
    node->front.valid = true;
}

void ProgressHandle::Set(int64_t value, int64_t min, int64_t max, Span<const char> text)
{
    ProgressNode *node = AcquireNode();

    if (!node) [[unlikely]]
        return;

    std::unique_lock<std::mutex> lock(node->mutex, std::try_to_lock);

    if (!lock.owns_lock())
        return;

    CopyText(text, node->front.text);
    node->front.value = value;
    node->front.min = min;
    node->front.max = max;
    node->front.determinate = (max > min);
    node->front.valid = true;
}

ProgressNode *ProgressHandle::AcquireNode()
{
    // Fast path
    {
        ProgressNode *node = this->node.load(std::memory_order_relaxed);

        if (node)
            return node;
    }

    int count = pg_count++;

    if (!count) {
        std::lock_guard lock(pg_mutex);

        if (!pg_run) {
            std::thread thread(RunProgressThread);
            thread.detach();

            pg_run = true;
        }
    } else if (count > K_PROGRESS_USED_NODES) {
        pg_count--;
        return nullptr;
    }

    int base = GetRandomInt(0, K_LEN(pg_nodes));

    for (int i = 0; i < K_LEN(pg_nodes); i++) {
        int idx = (base + i) % K_LEN(pg_nodes);

        ProgressNode *node = &pg_nodes[idx];
        bool used = node->used.exchange(true);

        if (!used) {
            static_assert(K_SIZE(text) == K_SIZE(node->front.text));
            MemCpy(node->front.text, text, K_SIZE(text));

            ProgressNode *prev = nullptr;
            bool set = this->node.compare_exchange_strong(prev, node);

            if (set) {
                return node;
            } else {
                node->used = false;
                pg_count--;

                return prev;
            }
        }
    }

    return nullptr;
}

void ProgressHandle::CopyText(Span<const char> text, char out[K_PROGRESS_TEXT_SIZE])
{
    Span<char> buf = MakeSpan(out, K_PROGRESS_TEXT_SIZE);
    bool complete = CopyString(text, buf);

    if (!complete) [[unlikely]] {
        out[K_PROGRESS_TEXT_SIZE - 4] = '.';
        out[K_PROGRESS_TEXT_SIZE - 3] = '.';
        out[K_PROGRESS_TEXT_SIZE - 2] = '.';
        out[K_PROGRESS_TEXT_SIZE - 1] = 0;
    }
}

void SetProgressHandler(const std::function<ProgressFunc> &func)
{
    pg_handler = func;
}

void DefaultProgressHandler(Span<const ProgressInfo> bars)
{
    static uint64_t frame = 0;

    if (!bars.len) {
        StdErr->Flush();
        return;
    }

    Size count = bars.len;
    Size rows = std::min((Size)20, bars.len);

    bars = bars.Take(0, rows);

    if (StdErr->IsVt100()) {
        // Don't blow up stack size
        static LocalArray<char, 65536> buf;
        buf.Clear();

        for (const ProgressInfo &bar: bars) {
            if (bar.determinate) {
                int64_t range = bar.max - bar.min;
                int64_t delta = bar.value - bar.min;

                int progress = (int)(100 * delta / range);
                int size = progress / 4;

                buf.len += Fmt(buf.TakeAvailable(), true, "%!..+[%1%2]%!0  %3\n", FmtRepeat("=", size), FmtRepeat(" ", 25 - size), bar.text).len;
            } else {
                int progress = (int)(frame % 44);
                int before = (progress > 22) ? (44 - progress) : progress;
                int after = std::max(22 - before, 0);

                buf.len += Fmt(buf.TakeAvailable(), true, "%!..+[%1===%2]%!0  %3\n", FmtRepeat(" ", before), FmtRepeat(" ", after), bar.text).len;
            }
        }

        if (count > bars.len) {
            buf.len += Fmt(buf.TakeAvailable(), true, "%!D..... and %1 more tasks%!0\n", count - bars.len).len;
            rows++;
        }
        buf.len--;

        StdErr->Write(buf);
        StdErr->Flush();

        if (rows > 1) {
            Print(StdErr, "\r\x1B[%1F\x1B[%2M", rows - 1, rows);
        } else {
            Print(StdErr, "\r\x1B[%1M", rows);
        }
    } else {
        for (const ProgressInfo &bar: bars) {
            PrintLn(StdErr, "%1", bar.text);
        }
    }

    frame++;
}

#endif

// ------------------------------------------------------------------------
// System
// ------------------------------------------------------------------------

#if defined(_WIN32)

static bool win32_utf8 = (GetACP() == CP_UTF8);

bool IsWin32Utf8()
{
    return win32_utf8;
}

Size ConvertUtf8ToWin32Wide(Span<const char> str, Span<wchar_t> out_str_w)
{
    if (!out_str_w.len) {
        LogError("Output buffer is too small");
        return -1;
    }

    if (!str.len) {
        out_str_w[0] = 0;
        return 0;
    } else if (out_str_w.len == 1) {
        LogError("Output buffer is too small");
        return -1;
    }

    int len = MultiByteToWideChar(CP_UTF8, 0, str.ptr, (int)str.len, out_str_w.ptr, (int)out_str_w.len - 1);
    if (!len) {
        switch (GetLastError()) {
            case ERROR_INSUFFICIENT_BUFFER: { LogError("String '%1' is too large", str); } break;
            case ERROR_NO_UNICODE_TRANSLATION: { LogError("String '%1' is not valid UTF-8", str); } break;
            default: { LogError("MultiByteToWideChar() failed: %1", GetWin32ErrorString()); } break;
        }
        return -1;
    }

    // MultiByteToWideChar() does not NUL terminate when passed in explicit string length
    out_str_w.ptr[len] = 0;

    return (Size)len;
}

Size ConvertWin32WideToUtf8(Span<const wchar_t> str_w, Span<char> out_str)
{
    if (!out_str.len) {
        LogError("Output buffer is too small");
        return -1;
    }

    int len = WideCharToMultiByte(CP_UTF8, 0, str_w.ptr, (int)str_w.len, out_str.ptr, (int)out_str.len - 1, nullptr, nullptr);

    if (!len) {
        switch (GetLastError()) {
            case ERROR_INSUFFICIENT_BUFFER: { LogError("Cannot convert UTF-16 string to UTF-8: too large"); } break;
            case ERROR_NO_UNICODE_TRANSLATION: { LogError("Cannot convert invalid UTF-16 string to UTF-8"); } break;
            default: { LogError("WideCharToMultiByte() failed: %1", GetWin32ErrorString()); } break;
        }
        return -1;
    }

    if (len >= out_str.len) {
        LogError("Cannot convert UTF-16 string to UTF-8: too large");
        return -1;
    }
    out_str[len] = 0;

    return (Size)len;
}

Size ConvertWin32WideToUtf8(LPCWSTR str_w, Span<char> out_str)
{
    Span<const wchar_t> span = MakeSpan(str_w, (Size)wcslen(str_w));
    return ConvertWin32WideToUtf8(span, out_str);
}

char *GetWin32ErrorString(uint32_t error_code)
{
    static thread_local char str_buf[512];

    if (error_code == UINT32_MAX) {
        error_code = GetLastError();
    }

    if (win32_utf8) {
        if (!FormatMessageA(FORMAT_MESSAGE_FROM_SYSTEM | FORMAT_MESSAGE_IGNORE_INSERTS,
                            nullptr, error_code, MAKELANGID(LANG_NEUTRAL, SUBLANG_DEFAULT),
                            str_buf, K_SIZE(str_buf), nullptr))
            goto fail;
    } else {
        wchar_t buf_w[256];
        if (!FormatMessageW(FORMAT_MESSAGE_FROM_SYSTEM | FORMAT_MESSAGE_IGNORE_INSERTS,
                            nullptr, error_code, MAKELANGID(LANG_NEUTRAL, SUBLANG_DEFAULT),
                            buf_w, K_SIZE(buf_w), nullptr))
            goto fail;

        if (!WideCharToMultiByte(CP_UTF8, 0, buf_w, -1, str_buf, K_SIZE(str_buf), nullptr, nullptr))
            goto fail;
    }

    // Truncate newlines
    {
        char *str_end = str_buf + strlen(str_buf);
        while (str_end > str_buf && (str_end[-1] == '\n' || str_end[-1] == '\r'))
            str_end--;
        *str_end = 0;
    }

    return str_buf;

fail:
    sprintf(str_buf, "Win32 error 0x%x", error_code);
    return str_buf;
}

static inline FileType FileAttributesToType(uint32_t attr)
{
    if (attr & FILE_ATTRIBUTE_DIRECTORY) {
        return FileType::Directory;
    } else if (attr & FILE_ATTRIBUTE_DEVICE) {
        return FileType::Device;
    } else {
        return FileType::File;
    }
}

static StatResult StatHandle(HANDLE h, const char *filename, FileInfo *out_info)
{
    BY_HANDLE_FILE_INFORMATION attr;
    if (!GetFileInformationByHandle(h, &attr)) {
        LogError("Cannot stat file '%1': %2", filename, GetWin32ErrorString());
        return StatResult::OtherError;
    }

    out_info->type = FileAttributesToType(attr.dwFileAttributes);
    out_info->size = ((uint64_t)attr.nFileSizeHigh << 32) | attr.nFileSizeLow;
    out_info->mtime = FileTimeToUnixTime(attr.ftLastWriteTime);
    out_info->ctime = FileTimeToUnixTime(attr.ftCreationTime);
    out_info->atime = FileTimeToUnixTime(attr.ftLastAccessTime);
    out_info->btime = out_info->ctime;
    out_info->mode = (out_info->type == FileType::Directory) ? 0755 : 0644;
    out_info->uid = 0;
    out_info->gid = 0;

    return StatResult::Success;
}

StatResult StatFile(int fd, const char *filename, unsigned int flags, FileInfo *out_info)
{
    // We don't detect symbolic links, but since they are much less of a hazard
    // than on POSIX systems we care a lot less about them.

    if (fd < 0) {
        HANDLE h;
        if (win32_utf8) {
            h = CreateFileA(filename, 0, FILE_SHARE_READ | FILE_SHARE_WRITE | FILE_SHARE_DELETE,
                            nullptr, OPEN_EXISTING, FILE_FLAG_BACKUP_SEMANTICS, nullptr);
        } else {
            wchar_t filename_w[4096];
            if (ConvertUtf8ToWin32Wide(filename, filename_w) < 0)
                return StatResult::OtherError;

            h = CreateFileW(filename_w, 0, FILE_SHARE_READ | FILE_SHARE_WRITE | FILE_SHARE_DELETE,
                            nullptr, OPEN_EXISTING, FILE_FLAG_BACKUP_SEMANTICS, nullptr);
        }
        if (h == INVALID_HANDLE_VALUE) {
            DWORD err = GetLastError();

            switch (err) {
                case ERROR_FILE_NOT_FOUND:
                case ERROR_PATH_NOT_FOUND: {
                    if (!(flags & (int)StatFlag::SilentMissing)) {
                        LogError("Cannot stat file '%1': %2", filename, GetWin32ErrorString(err));
                    }
                    return StatResult::MissingPath;
                } break;
                case ERROR_ACCESS_DENIED: {
                    LogError("Cannot stat file '%1': %2", filename, GetWin32ErrorString(err));
                    return StatResult::AccessDenied;
                }
                default: {
                    LogError("Cannot stat file '%1': %2", filename, GetWin32ErrorString(err));
                    return StatResult::OtherError;
                } break;
            }
        }
        K_DEFER { CloseHandle(h); };

        return StatHandle(h, filename, out_info);
    } else {
        HANDLE h = (HANDLE)_get_osfhandle(fd);
        return StatHandle(h, filename, out_info);
    }
}

RenameResult RenameFile(const char *src_filename, const char *dest_filename, unsigned int silent, unsigned int flags)
{
    K_ASSERT(!(silent & ((int)RenameResult::Success | (int)RenameResult::OtherError)));

    DWORD move_flags = (flags & (int)RenameFlag::Overwrite) ? MOVEFILE_REPLACE_EXISTING : 0;
    DWORD err = ERROR_SUCCESS;

    for (int i = 0; i < 10; i++) {
        if (win32_utf8) {
            if (MoveFileExA(src_filename, dest_filename, move_flags))
                return RenameResult::Success;
        } else {
            wchar_t src_filename_w[4096];
            wchar_t dest_filename_w[4096];
            if (ConvertUtf8ToWin32Wide(src_filename, src_filename_w) < 0)
                return RenameResult::OtherError;
            if (ConvertUtf8ToWin32Wide(dest_filename, dest_filename_w) < 0)
                return RenameResult::OtherError;

            if (MoveFileExW(src_filename_w, dest_filename_w, move_flags))
                return RenameResult::Success;
        }

        err = GetLastError();

        // If two threads are trying to rename to the same destination or the FS is
        // very busy, we get spurious ERROR_ACCESS_DENIED errors. Wait a bit and retry :)
        if (err != ERROR_ACCESS_DENIED)
            break;

        Sleep(1);
    }

    if (err == ERROR_ALREADY_EXISTS) {
        if (!(silent & (int)RenameResult::AlreadyExists)) {
            LogError("Failed to rename '%1' to '%2': file already exists", src_filename, dest_filename);
        }
        return RenameResult::AlreadyExists;
    } else {
        LogError("Failed to rename '%1' to '%2': %3", src_filename, dest_filename, GetWin32ErrorString(err));
        return RenameResult::OtherError;
    }
}

bool ResizeFile(int fd, const char *filename, int64_t len)
{
    HANDLE h = (HANDLE)_get_osfhandle(fd);

    LARGE_INTEGER prev_pos = {};
    if (!SetFilePointerEx(h, prev_pos, &prev_pos, FILE_CURRENT)) {
        LogError("Failed to resize file '%1': %2", filename, GetWin32ErrorString());
        return false;
    }
    K_DEFER { SetFilePointerEx(h, prev_pos, nullptr, FILE_BEGIN); };

    if (!SetFilePointerEx(h, { .QuadPart = len }, nullptr, FILE_BEGIN)) {
        LogError("Failed to resize file '%1': %2", filename, GetWin32ErrorString());
        return false;
    }
    if (!SetEndOfFile(h)) {
        LogError("Failed to resize file '%1': %2", filename, GetWin32ErrorString());
        return false;
    }

    return true;
}

bool SetFileTimes(int fd, const char *filename, int64_t mtime, int64_t btime)
{
    HANDLE h = (HANDLE)_get_osfhandle(fd);

    FILETIME mft = UnixTimeToFileTime(mtime);
    FILETIME bft = UnixTimeToFileTime(btime);

    if (!SetFileTime(h, &bft, nullptr, &mft)) {
        LogError("Failed to set modification time of '%1': %2", filename, GetWin32ErrorString());
        return false;
    }

    return true;
}

bool GetVolumeInfo(const char *dirname, VolumeInfo *out_volume)
{
    ULARGE_INTEGER available;
    ULARGE_INTEGER total;

    if (win32_utf8) {
        if (!GetDiskFreeSpaceExA(dirname, &available, &total, nullptr)) {
            LogError("Cannot get volume information for '%1': %2", dirname, GetWin32ErrorString());
            return false;
        }
    } else {
        wchar_t dirname_w[4096];
        if (ConvertUtf8ToWin32Wide(dirname, dirname_w) < 0)
            return false;

        if (!GetDiskFreeSpaceExW(dirname_w, &available, &total, nullptr)) {
            LogError("Cannot get volume information for '%1': %2", dirname, GetWin32ErrorString());
            return false;
        }
    }

    out_volume->total = (int64_t)total.QuadPart;
    out_volume->available = (int64_t)available.QuadPart;

    return true;
}

EnumResult EnumerateDirectory(const char *dirname, const char *filter, Size max_files,
                              FunctionRef<bool(const char *, FileType)> func)
{
    EnumResult ret = EnumerateDirectory(dirname, filter, max_files,
                                        [&](const char *basename, const FileInfo &file_info) {
        return func(basename, file_info.type);
    });

    return ret;
}

EnumResult EnumerateDirectory(const char *dirname, const char *filter, Size max_files,
                              FunctionRef<bool(const char *, const FileInfo &)> func)
{
    if (filter) {
        K_ASSERT(!strpbrk(filter, K_PATH_SEPARATORS));
    } else {
        filter = "*";
    }

    wchar_t find_filter_w[4096];
    {
        char find_filter[4096];
        if (snprintf(find_filter, K_SIZE(find_filter), "%s\\%s", dirname, filter) >= K_SIZE(find_filter)) {
            LogError("Cannot enumerate directory '%1': Path too long", dirname);
            return EnumResult::OtherError;
        }

        if (ConvertUtf8ToWin32Wide(find_filter, find_filter_w) < 0)
            return EnumResult::OtherError;
    }

    WIN32_FIND_DATAW attr;
    HANDLE handle = FindFirstFileExW(find_filter_w, FindExInfoBasic, &attr,
                                     FindExSearchNameMatch, nullptr, FIND_FIRST_EX_LARGE_FETCH);
    if (handle == INVALID_HANDLE_VALUE) {
        DWORD err = GetLastError();

        if (err == ERROR_FILE_NOT_FOUND) {
            // Erase the filter part from the buffer, we are about to exit anyway.
            // And no, I don't want to include wchar.h
            Size len = 0;
            while (find_filter_w[len++]);
            while (len > 0 && find_filter_w[--len] != L'\\');
            find_filter_w[len] = 0;

            DWORD attrib = GetFileAttributesW(find_filter_w);
            if (attrib != INVALID_FILE_ATTRIBUTES && (attrib & FILE_ATTRIBUTE_DIRECTORY))
                return EnumResult::Success;
        }

        LogError("Cannot enumerate directory '%1': %2", dirname, GetWin32ErrorString());

        switch (err) {
            case ERROR_FILE_NOT_FOUND:
            case ERROR_PATH_NOT_FOUND: return EnumResult::MissingPath;
            case ERROR_ACCESS_DENIED: return EnumResult::AccessDenied;
            default: return EnumResult::OtherError;
        }
    }
    K_DEFER { FindClose(handle); };

    Size count = 0;
    do {
        if ((attr.cFileName[0] == '.' && !attr.cFileName[1]) ||
                (attr.cFileName[0] == '.' && attr.cFileName[1] == '.' && !attr.cFileName[2]))
            continue;

        if (count++ >= max_files && max_files >= 0) [[unlikely]] {
            LogError("Partial enumation of directory '%1'", dirname);
            return EnumResult::PartialEnum;
        }

        char filename[512];
        if (ConvertWin32WideToUtf8(attr.cFileName, filename) < 0)
            return EnumResult::OtherError;

        FileInfo file_info = {};

        file_info.type = FileAttributesToType(attr.dwFileAttributes);
        file_info.size = ((uint64_t)attr.nFileSizeHigh << 32) | attr.nFileSizeLow;
        file_info.mtime = FileTimeToUnixTime(attr.ftLastWriteTime);
        file_info.btime = FileTimeToUnixTime(attr.ftCreationTime);
        file_info.mode = (file_info.type == FileType::Directory) ? 0755 : 0644;
        file_info.uid = 0;
        file_info.gid = 0;

        if (!func(filename, file_info))
            return EnumResult::CallbackFail;
    } while (FindNextFileW(handle, &attr));

    if (GetLastError() != ERROR_NO_MORE_FILES) {
        LogError("Error while enumerating directory '%1': %2", dirname,
                 GetWin32ErrorString());
        return EnumResult::OtherError;
    }

    return EnumResult::Success;
}

#else

static FileType FileModeToType(mode_t mode)
{
    if (S_ISDIR(mode)) {
        return FileType::Directory;
    } else if (S_ISREG(mode)) {
        return FileType::File;
    } else if (S_ISBLK(mode) || S_ISCHR(mode)) {
        return FileType::Device;
    } else if (S_ISLNK(mode)) {
        return FileType::Link;
    } else if (S_ISFIFO(mode)) {
        return FileType::Pipe;
    } else if (S_ISSOCK(mode)) {
        return FileType::Socket;
    } else {
        // This... should not happen. But who knows?
        return FileType::File;
    }
}

static StatResult StatAt(int fd, bool fd_is_directory, const char *filename, unsigned int flags, FileInfo *out_info)
{
#if defined(__linux__) && defined(STATX_TYPE)
    {
        const char *pathname = filename;
        int stat_flags = (flags & (int)StatFlag::FollowSymlink) ? 0 : AT_SYMLINK_NOFOLLOW;
        int stat_mask = STATX_TYPE | STATX_MODE | STATX_MTIME | STATX_BTIME | STATX_SIZE;

        if (!fd_is_directory) {
            if (fd >= 0) {
                pathname = "";
                stat_flags |= AT_EMPTY_PATH;
            } else {
                fd = AT_FDCWD;
            }
        }

        struct statx sxb;
        if (syscall(__NR_statx, fd, pathname, stat_flags, stat_mask, &sxb) < 0) {
            switch (errno) {
                case ENOSYS: goto fallback;

                case ENOENT: {
                    if (!(flags & (int)StatFlag::SilentMissing)) {
                        LogError("Cannot stat '%1': %2", filename, strerror(errno));
                    }
                    return StatResult::MissingPath;
                } break;
                case EACCES: {
                    LogError("Cannot stat '%1': %2", filename, strerror(errno));
                    return StatResult::AccessDenied;
                } break;
                case ENOTDIR: {
                    LogError("Cannot stat '%1': Component is not a directory", filename);
                    return StatResult::OtherError;
                } break;
                default: {
                    LogError("Cannot stat '%1': %2", filename, strerror(errno));
                    return StatResult::OtherError;
                } break;
            }
        }

        out_info->type = FileModeToType(sxb.stx_mode);
        out_info->size = (int64_t)sxb.stx_size;
        out_info->mtime = (int64_t)sxb.stx_mtime.tv_sec * 1000 +
                          (int64_t)sxb.stx_mtime.tv_nsec / 1000000;
        out_info->ctime = (int64_t)sxb.stx_ctime.tv_sec * 1000 +
                          (int64_t)sxb.stx_ctime.tv_nsec / 1000000;
        out_info->atime = (int64_t)sxb.stx_atime.tv_sec * 1000 +
                          (int64_t)sxb.stx_atime.tv_nsec / 1000000;
        if (sxb.stx_mask & STATX_BTIME) {
            out_info->btime = (int64_t)sxb.stx_btime.tv_sec * 1000 +
                              (int64_t)sxb.stx_btime.tv_nsec / 1000000;
        } else {
            out_info->btime = out_info->mtime;
        }
        out_info->mode = (unsigned int)sxb.stx_mode & ~S_IFMT;
        out_info->uid = sxb.stx_uid;
        out_info->gid = sxb.stx_gid;
    }

fallback:
#endif

    if (fd < 0) {
        fd_is_directory = true;
        fd = AT_FDCWD;
    }

    struct stat sb;
    int ret = 0;

    if (fd_is_directory) {
        int stat_flags = (flags & (int)StatFlag::FollowSymlink) ? 0 : AT_SYMLINK_NOFOLLOW;
        ret = fstatat(fd, filename, &sb, stat_flags);
    } else {
        ret = fstat(fd, &sb);
    }

    if (ret < 0) {
        switch (errno) {
            case ENOENT: {
                if (!(flags & (int)StatFlag::SilentMissing)) {
                    LogError("Cannot stat '%1': %2", filename, strerror(errno));
                }
                return StatResult::MissingPath;
            } break;
            case EACCES: {
                LogError("Cannot stat '%1': %2", filename, strerror(errno));
                return StatResult::AccessDenied;
            } break;
            case ENOTDIR: {
                LogError("Cannot stat '%1': Component is not a directory", filename);
                return StatResult::OtherError;
            } break;
            default: {
                LogError("Cannot stat '%1': %2", filename, strerror(errno));
                return StatResult::OtherError;
            } break;
        }
    }

    out_info->type = FileModeToType(sb.st_mode);
    out_info->size = (int64_t)sb.st_size;
#if defined(__linux__)
    out_info->mtime = (int64_t)sb.st_mtim.tv_sec * 1000 +
                      (int64_t)sb.st_mtim.tv_nsec / 1000000;
    out_info->ctime = (int64_t)sb.st_ctim.tv_sec * 1000 +
                      (int64_t)sb.st_ctim.tv_nsec / 1000000;
    out_info->atime = (int64_t)sb.st_atim.tv_sec * 1000 +
                      (int64_t)sb.st_atim.tv_nsec / 1000000;
    out_info->btime = out_info->mtime;
#elif defined(__APPLE__)
    out_info->mtime = (int64_t)sb.st_mtimespec.tv_sec * 1000 +
                      (int64_t)sb.st_mtimespec.tv_nsec / 1000000;
    out_info->ctime = (int64_t)sb.st_ctimespec.tv_sec * 1000 +
                      (int64_t)sb.st_ctimespec.tv_nsec / 1000000;
    out_info->atime = (int64_t)sb.st_atimespec.tv_sec * 1000 +
                      (int64_t)sb.st_atimespec.tv_nsec / 1000000;
    out_info->btime = (int64_t)sb.st_birthtimespec.tv_sec * 1000 +
                      (int64_t)sb.st_birthtimespec.tv_nsec / 1000000;
#elif defined(__OpenBSD__)
    out_info->mtime = (int64_t)sb.st_mtim.tv_sec * 1000 +
                      (int64_t)sb.st_mtim.tv_nsec / 1000000;
    out_info->ctime = (int64_t)sb.st_ctim.tv_sec * 1000 +
                      (int64_t)sb.st_ctim.tv_nsec / 1000000;
    out_info->atime = (int64_t)sb.st_atim.tv_sec * 1000 +
                      (int64_t)sb.st_atim.tv_nsec / 1000000;
    out_info->btime = (int64_t)sb.__st_birthtim.tv_sec * 1000 +
                      (int64_t)sb.__st_birthtim.tv_nsec / 1000000;
#elif defined(__FreeBSD__)
    out_info->mtime = (int64_t)sb.st_mtim.tv_sec * 1000 +
                      (int64_t)sb.st_mtim.tv_nsec / 1000000;
    out_info->ctime = (int64_t)sb.st_ctim.tv_sec * 1000 +
                      (int64_t)sb.st_ctim.tv_nsec / 1000000;
    out_info->atime = (int64_t)sb.st_atim.tv_sec * 1000 +
                      (int64_t)sb.st_atim.tv_nsec / 1000000;
    out_info->btime = (int64_t)sb.st_birthtim.tv_sec * 1000 +
                      (int64_t)sb.st_birthtim.tv_nsec / 1000000;
#else
    out_info->mtime = (int64_t)sb.st_mtim.tv_sec * 1000 +
                      (int64_t)sb.st_mtim.tv_nsec / 1000000;
    out_info->ctime = (int64_t)sb.st_ctim.tv_sec * 1000 +
                      (int64_t)sb.st_ctim.tv_nsec / 1000000;
    out_info->atime = (int64_t)sb.st_atim.tv_sec * 1000 +
                      (int64_t)sb.st_atim.tv_nsec / 1000000;
    out_info->btime = out_info->mtime;
#endif
    out_info->mode = (unsigned int)sb.st_mode;
    out_info->uid = (uint32_t)sb.st_uid;
    out_info->gid = (uint32_t)sb.st_gid;

    return StatResult::Success;
}

StatResult StatFile(int fd, const char *path, unsigned int flags, FileInfo *out_info)
{
    return StatAt(fd, false, path, flags, out_info);
}

static bool SyncDirectory(Span<const char> directory)
{
    char directory0[4096];
    if (directory.len >= K_SIZE(directory0)) {
        LogError("Failed to sync directory '%1': path too long", directory);
        return false;
    }
    MemCpy(directory0, directory.ptr, directory.len);
    directory0[directory.len] = 0;

    int dirfd = K_RESTART_EINTR(open(directory0, O_RDONLY | O_CLOEXEC), < 0);
    if (dirfd < 0) {
        LogError("Failed to sync directory '%1': %2", directory, strerror(errno));
        return false;
    }
    K_DEFER { CloseDescriptor(dirfd); };

    if (fsync(dirfd) < 0) {
        LogError("Failed to sync directory '%1': %2", directory, strerror(errno));
        return false;
    }

    return true;
}

static inline bool IsErrnoNotSupported(int err)
{
    bool unsupported = (err == ENOSYS || err == ENOTSUP || err == EOPNOTSUPP);
    return unsupported;
}

RenameResult RenameFile(const char *src_filename, const char *dest_filename, unsigned int silent, unsigned int flags)
{
    K_ASSERT(!(silent & ((int)RenameResult::Success | (int)RenameResult::OtherError)));

    if (flags & (int)RenameFlag::Overwrite) {
        if (rename(src_filename, dest_filename) < 0)
            goto error;
    } else {
#if defined(__NR_renameat2)
        {
            int dirfd = AT_FDCWD;
            int rflags = 1; // RENAME_NOREPLACE

            if (!syscall(__NR_renameat2, dirfd, src_filename, dirfd, dest_filename, rflags))
                goto sync;
            if (!IsErrnoNotSupported(errno) && errno != EINVAL)
                goto error;
        }
#elif defined(RENAME_EXCL)
        if (!renamex_np(src_filename, dest_filename, RENAME_EXCL))
            goto sync;
        if (!IsErrnoNotSupported(errno) && errno != EINVAL)
            goto error;
#endif

        // Not atomic, but not racy
        if (!link(src_filename, dest_filename)) {
            if (unlink(src_filename) < 0) {
                unlink(dest_filename);
                goto error;
            }
            goto sync;
        }
#if defined(__linux__)
        if (!IsErrnoNotSupported(errno) && errno != EINVAL && errno != EPERM)
            goto error;
#else
        if (!IsErrnoNotSupported(errno) && errno != EINVAL)
            goto error;
#endif

        // Fall back to racy way...
        if (!faccessat(AT_FDCWD, dest_filename, F_OK, AT_SYMLINK_NOFOLLOW)) {
            errno = EEXIST;
            goto error;
        }
        if (errno != ENOENT)
            goto error;
        if (rename(src_filename, dest_filename) < 0)
            goto error;
    }

sync:
    if (flags & (int)RenameFlag::Sync) {
        Span<const char> src_directory = GetPathDirectory(src_filename);
        Span<const char> dest_directory = GetPathDirectory(dest_filename);

        // Not much we can do if fsync fails (I think), so ignore errors.
        // Hope for the best: that's the spirit behind the POSIX filesystem API ;)
        SyncDirectory(src_directory);
        if (dest_directory != src_directory) {
            SyncDirectory(dest_directory);
        }
    }

    return RenameResult::Success;

error:
    if (errno == EEXIST) {
        if (!(silent & (int)RenameResult::AlreadyExists)) {
            LogError("Failed to rename '%1' to '%2': file already exists", src_filename, dest_filename);
        }
        return RenameResult::AlreadyExists;
    }

    LogError("Failed to rename '%1' to '%2': %3", src_filename, dest_filename, strerror(errno));
    return RenameResult::OtherError;
}

bool ResizeFile(int fd, const char *filename, int64_t len)
{
    if (ftruncate(fd, len) < 0) {
        if (errno == EINVAL) {
            // Only write() calls seem to return ENOSPC, ftruncate() seems to fail with EINVAL
            LogError("Failed to reserve file '%1': not enough space", filename);
        } else {
            LogError("Failed to reserve file '%1': %2", filename, strerror(errno));
        }
        return false;
    }

    return true;
}

bool SetFileMode(int fd, const char *filename, uint32_t mode)
{
    if (fd >= 0) {
        if (fchmod(fd, (mode_t)mode) < 0) {
            LogError("Failed to set permissions of '%1': %2", filename, strerror(errno));
            return false;
        }
    } else {
        if (fchmodat(AT_FDCWD, filename, (mode_t)mode, AT_SYMLINK_NOFOLLOW) < 0) {
            LogError("Failed to set permissions of '%1': %2", filename, strerror(errno));
            return false;
        }
    }

    return true;
}

bool SetFileOwner(int fd, const char *filename, uint32_t uid, uint32_t gid)
{
    if (fd >= 0) {
        if (fchown(fd, (uid_t)uid, (gid_t)gid) < 0) {
            LogError("Failed to change owner of '%1': %2", filename, strerror(errno));
            return false;
        }
    } else {
        if (lchown(filename, (uid_t)uid, (gid_t)gid) < 0) {
            LogError("Failed to change owner of '%1': %2", filename, strerror(errno));
            return false;
        }
    }

    return true;
}

bool SetFileTimes(int fd, const char *filename, int64_t mtime, int64_t)
{
    struct timespec times[2] = {};

    times[0].tv_nsec = UTIME_OMIT;
    times[1].tv_sec = mtime / 1000;
    times[1].tv_nsec = (mtime % 1000) * 1000000;

    if (fd >= 0) {
        if (futimens(fd, times) < 0) {
            LogError("Failed to set modification time of '%1': %2", filename, strerror(errno));
            return false;
        }
    } else {
        if (utimensat(AT_FDCWD, filename, times, AT_SYMLINK_NOFOLLOW) < 0) {
            LogError("Failed to set modification time of '%1': %2", filename, strerror(errno));
            return false;
        }
    }

    return true;
}

#if !defined(__wasm__)

bool GetVolumeInfo(const char *dirname, VolumeInfo *out_volume)
{
    struct statvfs vfs;
    if (statvfs(dirname, &vfs) < 0) {
        LogError("Cannot get volume information for '%1': %2", dirname, strerror(errno));
        return false;
    }

    out_volume->total = (int64_t)vfs.f_blocks * vfs.f_frsize;
    out_volume->available = (int64_t)vfs.f_bavail * vfs.f_frsize;

    return true;
}

#endif

static EnumResult ReadDirectory(DIR *dirp, const char *dirname, const char *filter, Size max_files,
                                FunctionRef<bool(const char *, FileType)> func)
{
    // Avoid random failure in empty directories
    errno = 0;

    Size count = 0;
    dirent *dent;
    while ((dent = readdir(dirp))) {
        if ((dent->d_name[0] == '.' && !dent->d_name[1]) ||
                (dent->d_name[0] == '.' && dent->d_name[1] == '.' && !dent->d_name[2]))
            continue;

        if (!filter || !fnmatch(filter, dent->d_name, FNM_PERIOD)) {
            if (count++ >= max_files && max_files >= 0) [[unlikely]] {
                LogError("Partial enumation of directory '%1'", dirname);
                return EnumResult::PartialEnum;
            }

            FileType file_type;
#if defined(_DIRENT_HAVE_D_TYPE)
            if (dent->d_type != DT_UNKNOWN) {
                switch (dent->d_type) {
                    case DT_DIR: { file_type = FileType::Directory; } break;
                    case DT_REG: { file_type = FileType::File; } break;
                    case DT_LNK: { file_type = FileType::Link; } break;
                    case DT_BLK:
                    case DT_CHR: { file_type = FileType::Device; } break;
                    case DT_FIFO: { file_type = FileType::Pipe; } break;
#if !defined(__wasi__)
                    case DT_SOCK: { file_type = FileType::Socket; } break;
#endif

                    default: {
                        // This... should not happen. But who knows?
                        file_type = FileType::File;
                    } break;
                }
            } else
#endif
            {
                struct stat sb;
                if (fstatat(dirfd(dirp), dent->d_name, &sb, AT_SYMLINK_NOFOLLOW) < 0) {
                    LogError("Ignoring file '%1' in '%2' (stat failed)", dent->d_name, dirname);
                    continue;
                }

                file_type = FileModeToType(sb.st_mode);
            }

            if (!func(dent->d_name, file_type))
                return EnumResult::CallbackFail;
        }

        errno = 0;
    }

    if (errno) {
        LogError("Error while enumerating directory '%1': %2", dirname, strerror(errno));
        return EnumResult::OtherError;
    }

    return EnumResult::Success;
}

static EnumResult ReadDirectory(DIR *dirp, const char *dirname, const char *filter, Size max_files,
                                FunctionRef<bool(const char *, const FileInfo &)> func)
{
    // Avoid random failure in empty directories
    errno = 0;

    Size count = 0;
    dirent *dent;
    while ((dent = readdir(dirp))) {
        if ((dent->d_name[0] == '.' && !dent->d_name[1]) ||
                (dent->d_name[0] == '.' && dent->d_name[1] == '.' && !dent->d_name[2]))
            continue;

        if (!filter || !fnmatch(filter, dent->d_name, FNM_PERIOD)) {
            if (count++ >= max_files && max_files >= 0) [[unlikely]] {
                LogError("Partial enumation of directory '%1'", dirname);
                return EnumResult::PartialEnum;
            }

            FileInfo file_info;
            StatResult ret = StatAt(dirfd(dirp), true, dent->d_name, (int)StatFlag::SilentMissing, &file_info);

            if (ret == StatResult::Success && !func(dent->d_name, file_info))
                return EnumResult::CallbackFail;
        }

        errno = 0;
    }

    if (errno) {
        LogError("Error while enumerating directory '%1': %2", dirname, strerror(errno));
        return EnumResult::OtherError;
    }

    return EnumResult::Success;
}

EnumResult EnumerateDirectory(const char *dirname, const char *filter, Size max_files,
                              FunctionRef<bool(const char *, FileType)> func)
{
    DIR *dirp = K_RESTART_EINTR(opendir(dirname), == nullptr);
    if (!dirp) {
        LogError("Cannot enumerate directory '%1': %2", dirname, strerror(errno));

        switch (errno) {
            case ENOENT: return EnumResult::MissingPath;
            case EACCES: return EnumResult::AccessDenied;
            default: return EnumResult::OtherError;
        }
    }
    K_DEFER { closedir(dirp); };

    return ReadDirectory(dirp, dirname, filter, max_files, func);
}

EnumResult EnumerateDirectory(const char *dirname, const char *filter, Size max_files,
                              FunctionRef<bool(const char *, const FileInfo &)> func)
{
    DIR *dirp = K_RESTART_EINTR(opendir(dirname), == nullptr);
    if (!dirp) {
        LogError("Cannot enumerate directory '%1': %2", dirname, strerror(errno));

        switch (errno) {
            case ENOENT: return EnumResult::MissingPath;
            case EACCES: return EnumResult::AccessDenied;
            default: return EnumResult::OtherError;
        }
    }
    K_DEFER { closedir(dirp); };

    return ReadDirectory(dirp, dirname, filter, max_files, func);
}

#if !defined(__APPLE__)

EnumResult EnumerateDirectory(int fd, const char *dirname, const char *filter, Size max_files,
                              FunctionRef<bool(const char *, FileType)> func)
{
    DIR *dirp = fdopendir(fd);
    if (!dirp) {
        CloseDescriptor(fd);

        LogError("Cannot enumerate directory '%1': %2", dirname, strerror(errno));
        return EnumResult::OtherError;
    }
    K_DEFER { closedir(dirp); };

    return ReadDirectory(dirp, dirname, filter, max_files, func);
}

EnumResult EnumerateDirectory(int fd, const char *dirname, const char *filter, Size max_files,
                              FunctionRef<bool(const char *, const FileInfo &)> func)
{
    DIR *dirp = fdopendir(fd);
    if (!dirp) {
        CloseDescriptor(fd);

        LogError("Cannot enumerate directory '%1': %2", dirname, strerror(errno));
        return EnumResult::OtherError;
    }
    K_DEFER { closedir(dirp); };

    return ReadDirectory(dirp, dirname, filter, max_files, func);
}

#endif

#endif

bool EnumerateFiles(const char *dirname, const char *filter, Size max_depth, Size max_files,
                    Allocator *str_alloc, HeapArray<const char *> *out_files)
{
    K_DEFER_NC(out_guard, len = out_files->len) { out_files->RemoveFrom(len); };

    EnumResult ret = EnumerateDirectory(dirname, nullptr, max_files,
                                        [&](const char *basename, FileType file_type) {
        switch (file_type) {
            case FileType::Directory: {
                if (max_depth) {
                    const char *sub_directory = Fmt(str_alloc, "%1%/%2", dirname, basename).ptr;
                    return EnumerateFiles(sub_directory, filter, std::max((Size)-1, max_depth - 1),
                                          max_files, str_alloc, out_files);
                }
            } break;

            case FileType::File:
            case FileType::Link: {
                if (!filter || MatchPathName(basename, filter)) {
                    const char *filename = Fmt(str_alloc, "%1%/%2", dirname, basename).ptr;
                    out_files->Append(filename);
                }
            } break;

            case FileType::Device:
            case FileType::Pipe:
            case FileType::Socket: {} break;
        }

        return true;
    });
    if (ret != EnumResult::Success && ret != EnumResult::PartialEnum)
        return false;

    out_guard.Disable();
    return true;
}

bool IsDirectoryEmpty(const char *dirname)
{
    EnumResult ret = EnumerateDirectory(dirname, nullptr, -1, [](const char *, FileType) { return false; });

    bool empty = (ret == EnumResult::Success);
    return empty;
}

bool TestFile(const char *filename)
{
    FileInfo file_info;
    StatResult ret = StatFile(filename, (int)StatFlag::SilentMissing, &file_info);

    bool exists = (ret == StatResult::Success);
    return exists;
}

bool TestFile(const char *filename, FileType type)
{
    FileInfo file_info;
    if (StatFile(filename, (int)StatFlag::SilentMissing, &file_info) != StatResult::Success)
        return false;

    // Don't follow, but don't warn if we just wanted a file
    if (type != FileType::Link && file_info.type == FileType::Link) {
        file_info.type = FileType::File;
    }

    if (type != file_info.type) {
        switch (type) {
            case FileType::Directory: { LogError("Path '%1' is not a directory", filename); } break;
            case FileType::File: { LogError("Path '%1' is not a file", filename); } break;
            case FileType::Device: { LogError("Path '%1' is not a device", filename); } break;
            case FileType::Pipe: { LogError("Path '%1' is not a pipe", filename); } break;
            case FileType::Socket: { LogError("Path '%1' is not a socket", filename); } break;

            case FileType::Link: { K_UNREACHABLE(); } break;
        }

        return false;
    }

    return true;
}

bool IsDirectory(const char *filename)
{
    FileInfo file_info;
    if (StatFile(filename, (int)StatFlag::SilentMissing, &file_info) != StatResult::Success)
        return false;
    return file_info.type == FileType::Directory;
}

static Size MatchPathItem(const char *path, const char *spec)
{
    Size i = 0;

    while (spec[i] && spec[i] != '*') {
        switch (spec[i]) {
            case '?': {
                if (!path[i] || IsPathSeparator(path[i]))
                    return -1;
            } break;

#if defined(_WIN32)
            case '\\':
#endif
            case '/': {
                if (!IsPathSeparator(path[i]))
                    return -1;
            } break;

            default: {
                if (path[i] != spec[i])
                    return -1;
            } break;
        }

        i++;
    }

    return i;
}

static Size MatchPathItemI(const char *path, const char *spec)
{
    Size i = 0;

    while (spec[i] && spec[i] != '*') {
        switch (spec[i]) {
            case '?': {
                if (!path[i] || IsPathSeparator(path[i]))
                    return -1;
            } break;

#if defined(_WIN32)
            case '\\':
#endif
            case '/': {
                if (!IsPathSeparator(path[i]))
                    return -1;
            } break;

            default: {
                // XXX: Use proper Unicode/locale case-folding? Or is this enough?

                if (LowerAscii(path[i]) != LowerAscii(spec[i]))
                    return -1;
            } break;
        }

        i++;
    }

    return i;
}

bool MatchPathName(const char *path, const char *spec, bool case_sensitive)
{
    auto match = case_sensitive ? MatchPathItem : MatchPathItemI;

    // Match head
    {
        Size match_len = match(path, spec);

        if (match_len < 0) {
            return false;
        } else {
            // Fast path (no wildcard)
            if (!spec[match_len])
                return !path[match_len];

            path += match_len;
            spec += match_len;
        }
    }

    // Find tail
    const char *tail = strrchr(spec, '*') + 1;

    // Match remaining items
    while (spec[0] == '*') {
        bool superstar = (spec[1] == '*');
        while (spec[0] == '*') {
            spec++;
        }

        for (;;) {
            Size match_len = match(path, spec);

            // We need to be greedy for the last wildcard, or we may not reach the tail
            if (match_len < 0 || (spec == tail && path[match_len])) {
                if (!path[0])
                    return false;
                if (!superstar && IsPathSeparator(path[0]))
                    return false;
                path++;
            } else {
                path += match_len;
                spec += match_len;

                break;
            }
        }
    }

    return true;
}

bool MatchPathSpec(const char *path, const char *spec, bool case_sensitive)
{
    Span<const char> path2 = path;

    do {
        const char *it = SplitStrReverseAny(path2, K_PATH_SEPARATORS, &path2).ptr;

        if (MatchPathName(it, spec, case_sensitive))
            return true;
    } while (path2.len);

    return false;
}

bool FindExecutableInPath(Span<const char> paths, const char *name, Allocator *alloc, const char **out_path)
{
    K_ASSERT(alloc || !out_path);

    // Fast path
    if (strpbrk(name, K_PATH_SEPARATORS)) {
        if (!TestFile(name, FileType::File))
            return false;

        if (out_path) {
            *out_path = DuplicateString(name, alloc).ptr;
        }
        return true;
    }

    while (paths.len) {
        Span<const char> path = SplitStr(paths, K_PATH_DELIMITER, &paths);

        LocalArray<char, 4096> buf;
        buf.len = Fmt(buf.data, "%1%/%2", path, name).len;

#if defined(_WIN32)
        static const Span<const char> extensions[] = { ".com", ".exe", ".bat", ".cmd" };

        for (Span<const char> ext: extensions) {
            if (ext.len < buf.Available() - 1) [[likely]] {
                MemCpy(buf.end(), ext.ptr, ext.len + 1);

                if (TestFile(buf.data)) {
                    if (out_path) {
                        *out_path = DuplicateString(buf.data, alloc).ptr;
                    }
                    return true;
                }
            }
        }
#else
        if (buf.len < K_SIZE(buf.data) - 1 && TestFile(buf.data)) {
            if (out_path) {
                *out_path = DuplicateString(buf.data, alloc).ptr;
            }
            return true;
        }
#endif
    }

    return false;
}

bool FindExecutableInPath(const char *name, Allocator *alloc, const char **out_path)
{
    K_ASSERT(alloc || !out_path);

    // Fast path
    if (strpbrk(name, K_PATH_SEPARATORS)) {
        if (!TestFile(name, FileType::File))
            return false;

        if (out_path) {
            *out_path = DuplicateString(name, alloc).ptr;
        }
        return true;
    }

#if defined(_WIN32)
    LocalArray<char, 16384> env_buf;
    Span<const char> paths;

    if (win32_utf8) {
        paths = GetEnv("PATH");
    } else {
        wchar_t buf_w[K_SIZE(env_buf.data)];
        DWORD len_w = GetEnvironmentVariableW(L"PATH", buf_w, K_LEN(buf_w));

        if (!len_w && GetLastError() != ERROR_ENVVAR_NOT_FOUND) {
            LogError("Failed to get PATH environment variable: %1", GetWin32ErrorString());
            return false;
        } else if (len_w >= K_LEN(buf_w)) {
            LogError("Failed to get PATH environment variable: buffer to small");
            return false;
        }

        env_buf.len = ConvertWin32WideToUtf8(MakeSpan(buf_w, len_w), env_buf.data);
        if (env_buf.len < 0)
            return false;

        paths = env_buf;
    }
#else
    Span<const char> paths = GetEnv("PATH");
#endif

    return FindExecutableInPath(paths, name, alloc, out_path);
}

bool SetWorkingDirectory(const char *directory)
{
#if defined(_WIN32)
    if (!win32_utf8) {
        wchar_t directory_w[4096];
        if (ConvertUtf8ToWin32Wide(directory, directory_w) < 0)
            return false;

        if (!SetCurrentDirectoryW(directory_w)) {
            LogError("Failed to set current directory to '%1': %2", directory, GetWin32ErrorString());
            return false;
        }

        return true;
    }
#endif

    if (chdir(directory) < 0) {
        LogError("Failed to set current directory to '%1': %2", directory, strerror(errno));
        return false;
    }

    return true;
}

const char *GetWorkingDirectory()
{
    static thread_local char buf[4096];

#if defined(_WIN32)
    if (!win32_utf8) {
        wchar_t buf_w[K_SIZE(buf)];
        DWORD len_w = GetCurrentDirectoryW(K_SIZE(buf_w), buf_w);
        K_ASSERT(len_w && len_w <= K_SIZE(buf_w));

        Size len = ConvertWin32WideToUtf8(MakeSpan(buf_w, len_w), buf);
        K_ASSERT(len >= 0);

        return buf;
    }
#endif

    const char *ptr = getcwd(buf, K_SIZE(buf));
    K_ASSERT(ptr);

    return buf;
}

const char *GetApplicationExecutable()
{
#if defined(_WIN32)
    static char executable_path[4096];

    if (!executable_path[0]) {
        if (win32_utf8) {
            Size len = (Size)GetModuleFileNameA(nullptr, executable_path, K_SIZE(executable_path));
            K_ASSERT(len && len < K_SIZE(executable_path));
        } else {
            wchar_t path_w[K_SIZE(executable_path)];
            Size len_w = (Size)GetModuleFileNameW(nullptr, path_w, K_SIZE(path_w));
            K_ASSERT(len_w && len_w < K_LEN(path_w));

            Size len = ConvertWin32WideToUtf8(MakeSpan(path_w, len_w), executable_path);
            K_ASSERT(len >= 0);
        }
    }

    return executable_path;
#elif defined(__APPLE__)
    static char executable_path[4096];

    if (!executable_path[0]) {
        uint32_t buffer_size = K_SIZE(executable_path);
        int ret = _NSGetExecutablePath(executable_path, &buffer_size);
        K_ASSERT(!ret);

        char *path_buf = realpath(executable_path, nullptr);
        K_ASSERT(path_buf);
        K_ASSERT(strlen(path_buf) < K_SIZE(executable_path));

        CopyString(path_buf, executable_path);
        free(path_buf);
    }

    return executable_path;
#elif defined(__linux__)
    static char executable_path[4096];

    if (!executable_path[0]) {
        ssize_t ret = readlink("/proc/self/exe", executable_path, K_SIZE(executable_path));
        K_ASSERT(ret > 0 && ret < K_SIZE(executable_path));
    }

    return executable_path;
#elif defined(__OpenBSD__)
    static char executable_path[4096];

    if (!executable_path[0]) {
        int name[4] = { CTL_KERN, KERN_PROC_ARGS, getpid(), KERN_PROC_ARGV };

        size_t argc;
        {
            int ret = sysctl(name, K_LEN(name), nullptr, &argc, nullptr, 0);
            K_ASSERT(ret >= 0);
            K_ASSERT(argc >= 1);
        }

        HeapArray<char *> argv;
        {
            argv.AppendDefault(argc);
            int ret = sysctl(name, K_LEN(name), argv.ptr, &argc, nullptr, 0);
            K_ASSERT(ret >= 0);
        }

        if (PathIsAbsolute(argv[0])) {
            K_ASSERT(strlen(argv[0]) < K_SIZE(executable_path));

            CopyString(argv[0], executable_path);
        } else {
            const char *path;
            bool success = FindExecutableInPath(argv[0], &DefaultAllocator, &path);
            K_ASSERT(success);
            K_ASSERT(strlen(path) < K_SIZE(executable_path));

            CopyString(path, executable_path);
            ReleaseRaw(nullptr, (void *)path, -1);
        }
    }

    return executable_path;
#elif defined(__FreeBSD__)
    static char executable_path[4096];

    if (!executable_path[0]) {
        int name[4] = { CTL_KERN, KERN_PROC, KERN_PROC_PATHNAME, -1 };
        size_t len = sizeof(executable_path);

        int ret = sysctl(name, K_LEN(name), executable_path, &len, nullptr, 0);
        K_ASSERT(ret >= 0);
        K_ASSERT(len < K_SIZE(executable_path));
    }

    return executable_path;
#elif defined(__wasm__)
    return nullptr;
#else
    #error GetApplicationExecutable() not implemented for this platform
#endif
}

const char *GetApplicationDirectory()
{
    static char executable_dir[4096];
    static bool init;

    if (!init) {
        const char *executable_path = GetApplicationExecutable();

        if (executable_path) {
            Size dir_len = (Size)strlen(executable_path);
            while (dir_len && !IsPathSeparator(executable_path[--dir_len]));
            MemCpy(executable_dir, executable_path, dir_len);
            executable_dir[dir_len] = 0;
        }

        init = true;
    }

    return executable_dir[0] ? executable_dir : nullptr;
}

const char *GetHomeDirectory()
{
    static char home_dir[4096];
    static bool init;

#if defined(_WIN32)
    if (!init) {
        HANDLE token = nullptr;
        DWORD len = 0;

        HMODULE module = LoadLibraryA("userenv");
        K_DEFER { FreeLibrary(module); };

        OpenProcessToken(GetCurrentProcess(), TOKEN_READ, &token);
        K_DEFER { CloseHandle(token); };

        if (win32_utf8) {
            len = K_SIZE(home_dir);

            BOOL (*GetUserProfileDirectoryA_)(HANDLE hToken, const char *lpProfileDir, DWORD *lpcchSize);
            GetUserProfileDirectoryA_ = (decltype(GetUserProfileDirectoryA_))GetProcAddress(module, "GetUserProfileDirectoryA");

            GetUserProfileDirectoryA_(token, home_dir, &len);
            K_CRITICAL(len && len <= K_SIZE(home_dir), "Failed to retrieve user profile path");

            len--;
        } else {
            wchar_t dir_w[K_SIZE(home_dir)];
            DWORD len_w = K_LEN(dir_w);

            BOOL (*GetUserProfileDirectoryW_)(HANDLE hToken, const wchar_t *lpProfileDir, DWORD *lpcchSize);
            GetUserProfileDirectoryW_ = (decltype(GetUserProfileDirectoryW_))GetProcAddress(module, "GetUserProfileDirectoryW");

            GetUserProfileDirectoryW_(token, dir_w, &len_w);
            K_CRITICAL(len_w && len_w <= K_LEN(dir_w), "Failed to retrieve user profile path");

            len = (DWORD)ConvertWin32WideToUtf8(MakeSpan(dir_w, len_w), home_dir);
            K_CRITICAL(len > 0, "Failed to retrieve user profile path");
        }

        Size end = TrimStrRight(MakeSpan(home_dir, (Size)len), K_PATH_SEPARATORS).len;
        home_dir[end] = 0;

        init = true;
    }
#else
    if (!init) {
        const char *value = GetEnv("HOME");

        if (value && value[0]) {
            Span<const char> trimmed = TrimStrRight(value, '/');
            CopyString(trimmed, home_dir);
        } else {
            struct passwd pw;
            struct passwd *result = nullptr;;
            char buf[8192];

            K_RESTART_EINTR(getpwuid_r(geteuid(), &pw, buf, K_SIZE(buf), &result), < 0);

            if (result) {
                Span<const char> trimmed = TrimStrRight(result->pw_dir, '/');
                CopyString(trimmed, home_dir);
            }
        }

        init = true;
    }
#endif

    return home_dir[0] ? home_dir : nullptr;
}

Span<const char> GetPathDirectory(Span<const char> filename)
{
    Span<const char> directory;
    SplitStrReverseAny(filename, K_PATH_SEPARATORS, &directory);

    return directory.len ? directory : ".";
}

// Names starting with a dot are not considered to be an extension (POSIX hidden files)
Span<const char> GetPathExtension(Span<const char> filename, CompressionType *out_compression_type)
{
    filename = SplitStrReverseAny(filename, K_PATH_SEPARATORS);

    Span<const char> extension = {};
    const auto consume_next_extension = [&]() {
        Span<const char> part = SplitStrReverse(filename, '.', &filename);

        if (part.ptr > filename.ptr) {
            extension = MakeSpan(part.ptr - 1, part.len + 1);
        } else {
            extension = MakeSpan(part.end(), 0);
        }
    };

    consume_next_extension();

    if (out_compression_type) {
        const char *const *it = std::find_if(std::begin(CompressionTypeExtensions), std::end(CompressionTypeExtensions),
                                             [&](const char *it) { return it && TestStr(it, extension); });

        if (it != std::end(CompressionTypeExtensions)) {
            *out_compression_type = (CompressionType)(it - CompressionTypeExtensions);
            consume_next_extension();
        } else {
            *out_compression_type = CompressionType::None;
        }
    }

    return extension;
}

Span<char> NormalizePath(Span<const char> path, Span<const char> root_directory, unsigned int flags, Allocator *alloc)
{
    K_ASSERT(alloc);

    if (!path.len && !root_directory.len)
        return Fmt(alloc, "");

    if (!(flags & (int)NormalizeFlag::NoExpansion)) {
        Span<const char> prefix = SplitStrAny(path, K_PATH_SEPARATORS);

        if (prefix == "~") {
            const char *home = GetHomeDirectory();

            if (home) {
                root_directory = home;
                path = TrimStrLeft(path.Take(1, path.len - 1), K_PATH_SEPARATORS);
            }
        }
    }

    HeapArray<char> buf(alloc);
    Size parts_count = 0;

    char separator = (flags & (int)NormalizeFlag::ForceSlash) ? '/' : *K_PATH_SEPARATORS;

    const auto append_normalized_path = [&](Span<const char> path) {
        if (!buf.len && PathIsAbsolute(path)) {
            Span<const char> prefix = SplitStrAny(path, K_PATH_SEPARATORS, &path);
            buf.Append(prefix);
            buf.Append(separator);
        }

        while (path.len) {
            Span<const char> part = SplitStrAny(path, K_PATH_SEPARATORS, &path);

            if (part == "..") {
                if (parts_count) {
                    while (--buf.len && !IsPathSeparator(buf.ptr[buf.len - 1]));
                    parts_count--;
                } else {
                    buf.Append("..");
                    buf.Append(separator);
                }
            } else if (part == ".") {
                // Skip
            } else if (part.len) {
                buf.Append(part);
                buf.Append(separator);
                parts_count++;
            }
        }
    };

    if (root_directory.len && !PathIsAbsolute(path)) {
        append_normalized_path(root_directory);
    }
    append_normalized_path(path);

    if (!buf.len) {
        buf.Append('.');

        if (flags & (int)NormalizeFlag::EndWithSeparator) {
            buf.Append(separator);
        }
    } else if (buf.len == 1 && IsPathSeparator(buf[0])) {
        // Root '/', keep as-is or almost
        buf[0] = separator;
    } else if (!(flags & (int)NormalizeFlag::EndWithSeparator)) {
        // Strip last separator
        buf.len--;
    }

#if defined(_WIN32)
    if (buf.len >= 2 && IsAsciiAlpha(buf[0]) && buf[1] == ':') {
        buf[0] = UpperAscii(buf[0]);
    }
#endif

    // NUL terminator
    buf.Trim(1);
    buf.ptr[buf.len] = 0;

    return buf.Leak();
}

bool PathIsAbsolute(const char *path)
{
#if defined(_WIN32)
    if (IsAsciiAlpha(path[0]) && path[1] == ':')
        return true;
#endif

    return IsPathSeparator(path[0]);
}
bool PathIsAbsolute(Span<const char> path)
{
#if defined(_WIN32)
    if (path.len >= 2 && IsAsciiAlpha(path[0]) && path[1] == ':')
        return true;
#endif

    return path.len && IsPathSeparator(path[0]);
}

bool PathContainsDotDot(const char *path)
{
    const char *ptr = path;

    while ((ptr = strstr(ptr, ".."))) {
        if ((ptr == path || IsPathSeparator(ptr[-1])) && (IsPathSeparator(ptr[2]) || !ptr[2]))
            return true;
        ptr += 2;
    }

    return false;
}

bool PathContainsDotDot(Span<const char> path)
{
    const char *ptr = path.ptr;
    const char *end = path.end();

    while ((ptr = (const char *)MemMem(ptr, end - ptr, "..", 2))) {
        if ((ptr == path.ptr || IsPathSeparator(ptr[-1])) && (ptr + 2 == end || IsPathSeparator(ptr[2])))
            return true;
        ptr += 2;
    }

    return false;
}

static bool CheckForDumbTerm()
{
    static bool dumb = ([]() {
        const char *term = GetEnv("TERM");

        if (term && TestStr(term, "dumb"))
            return true;
        if (GetEnv("NO_COLOR"))
            return true;

        return false;
    })();

    return dumb;
}

#if defined(_WIN32)

OpenResult OpenFile(const char *filename, unsigned int flags, unsigned int silent, int *out_fd)
{
    K_ASSERT(!(silent & ((int)OpenResult::Success | (int)OpenResult::OtherError)));

    DWORD access = 0;
    DWORD share = 0;
    DWORD creation = 0;
    DWORD attributes = 0;
    int oflags = -1;
    switch (flags & ((int)OpenFlag::Read |
                     (int)OpenFlag::Write |
                     (int)OpenFlag::Append)) {
        case (int)OpenFlag::Read: {
            access = GENERIC_READ;
            share = FILE_SHARE_READ | FILE_SHARE_WRITE | FILE_SHARE_DELETE;
            creation = OPEN_EXISTING;
            attributes = FILE_ATTRIBUTE_NORMAL;
            oflags = _O_RDONLY | _O_BINARY | _O_NOINHERIT;
        } break;
        case (int)OpenFlag::Write: {
            access = GENERIC_WRITE;
            share = FILE_SHARE_READ | FILE_SHARE_WRITE | FILE_SHARE_DELETE;
            creation = CREATE_ALWAYS;
            attributes = FILE_ATTRIBUTE_NORMAL;
            oflags = _O_WRONLY | _O_CREAT | _O_TRUNC | _O_BINARY | _O_NOINHERIT;
        } break;
        case (int)OpenFlag::Read | (int)OpenFlag::Write: {
            access = GENERIC_READ | GENERIC_WRITE;
            share = FILE_SHARE_READ | FILE_SHARE_WRITE | FILE_SHARE_DELETE;
            creation = CREATE_ALWAYS;
            attributes = FILE_ATTRIBUTE_NORMAL;
            oflags = _O_RDWR | _O_CREAT | _O_TRUNC | _O_BINARY | _O_NOINHERIT;
        } break;
        case (int)OpenFlag::Append: {
            access = GENERIC_WRITE;
            share = FILE_SHARE_READ | FILE_SHARE_WRITE | FILE_SHARE_DELETE;
            creation = OPEN_ALWAYS;
            attributes = FILE_ATTRIBUTE_NORMAL;
            oflags = _O_WRONLY | _O_CREAT | _O_APPEND | _O_BINARY | _O_NOINHERIT;
        } break;
    }
    K_ASSERT(oflags >= 0);

    if (flags & (int)OpenFlag::Keep) {
        if (creation == CREATE_ALWAYS) {
            creation = OPEN_ALWAYS;
        }
        oflags &= ~_O_TRUNC;
    }
    if (flags & (int)OpenFlag::Directory) {
        K_ASSERT(!(flags & (int)OpenFlag::Exclusive));
        K_ASSERT(!(flags & (int)OpenFlag::Append));

        creation = OPEN_EXISTING;
        attributes = FILE_FLAG_BACKUP_SEMANTICS;
        oflags &= ~(_O_CREAT | _O_TRUNC | _O_BINARY);
    }
    if (flags & (int)OpenFlag::Exists) {
        K_ASSERT(!(flags & (int)OpenFlag::Exclusive));

        creation = OPEN_EXISTING;
        oflags &= ~_O_CREAT;
    } else if (flags & (int)OpenFlag::Exclusive) {
        K_ASSERT(creation == CREATE_ALWAYS);

        creation = CREATE_NEW;
        oflags |= (int)_O_EXCL;
    }

    HANDLE h = nullptr;
    int fd = -1;
    K_DEFER_N(err_guard) {
        CloseDescriptor(fd);
        if (h) {
            CloseHandle(h);
        }
    };

    if (win32_utf8) {
        h = CreateFileA(filename, access, share, nullptr, creation, attributes, nullptr);
    } else {
        wchar_t filename_w[4096];
        if (ConvertUtf8ToWin32Wide(filename, filename_w) < 0)
            return OpenResult::OtherError;

        h = CreateFileW(filename_w, access, share, nullptr, creation, attributes, nullptr);
    }
    if (h == INVALID_HANDLE_VALUE) {
        DWORD err = GetLastError();

        OpenResult ret;
        switch (err) {
            case ERROR_FILE_NOT_FOUND:
            case ERROR_PATH_NOT_FOUND: { ret = OpenResult::MissingPath; } break;
            case ERROR_FILE_EXISTS: { ret = OpenResult::FileExists; } break;
            case ERROR_ACCESS_DENIED: { ret = OpenResult::AccessDenied; } break;
            default: { ret = OpenResult::OtherError; } break;
        }

        if (!(silent & (int)ret)) {
            LogError("Cannot open '%1': %2", filename, GetWin32ErrorString(err));
        }
        return ret;
    }

    fd = _open_osfhandle((intptr_t)h, oflags);
    if (fd < 0) {
        LogError("Cannot open '%1': %2", filename, strerror(errno));
        return OpenResult::OtherError;
    }

    if ((flags & (int)OpenFlag::Append) && _lseeki64(fd, 0, SEEK_END) < 0) {
        LogError("Cannot move file pointer: %1", strerror(errno));
        return OpenResult::OtherError;
    }

    err_guard.Disable();
    *out_fd = fd;

    return OpenResult::Success;
}

void CloseDescriptor(int fd)
{
    if (fd < 0)
        return;

    _close(fd);
}

bool FlushFile(int fd, const char *filename)
{
    K_ASSERT(filename);

    HANDLE h = (HANDLE)_get_osfhandle(fd);

    if (!FlushFileBuffers(h)) {
        DWORD err = GetLastError();

        if (err != ERROR_INVALID_FUNCTION && err != ERROR_INVALID_HANDLE) {
            LogError("Failed to sync '%1': %2", filename, GetWin32ErrorString(err));
            return false;
        }
    }

    return true;
}

bool SpliceFile(int src_fd, const char *src_filename, int64_t src_offset,
                int dest_fd, const char *dest_filename, int64_t dest_offset, int64_t size,
                FunctionRef<void(int64_t, int64_t)> progress)
{
    static NtCopyFileChunkFunc *NtCopyFileChunk =
        (NtCopyFileChunkFunc *)(void *)GetProcAddress(GetModuleHandleA("ntdll.dll"), "NtCopyFileChunk");

    int64_t max = size;
    progress(0, max);

    // Try fast kernel-mode copy introduced in Windows 11
    if (NtCopyFileChunk) {
        HANDLE h1 = (HANDLE)_get_osfhandle(src_fd);
        HANDLE h2 = (HANDLE)_get_osfhandle(dest_fd);

        LARGE_INTEGER offset0 = {};
        LARGE_INTEGER offset1 = {};

        offset0.QuadPart = src_offset;
        offset1.QuadPart = dest_offset;

        while (size) {
            unsigned long count = (unsigned long)std::min(size, (int64_t)Mebibytes(64));

            IO_STATUS_BLOCK iob;
            LONG status = NtCopyFileChunk(h1, h2, nullptr, &iob, count, &offset0, &offset1, nullptr, nullptr, 0);

            if (status) {
                static RtlNtStatusToDosErrorFunc *RtlNtStatusToDosError =
                    (RtlNtStatusToDosErrorFunc *)(void *)GetProcAddress(GetModuleHandleA("ntdll.dll"), "RtlNtStatusToDosError");

                unsigned long err = RtlNtStatusToDosError(status);
                LogError("Failed to copy '%1' to '%2': %3", src_filename, dest_filename, GetWin32ErrorString(err));

                return false;
            }
            if (!iob.Information) {
                LogError("Failed to copy '%1' to '%2': Truncated file", src_filename, dest_filename);
                return false;
            }

            offset0.QuadPart += iob.Information;
            offset1.QuadPart += iob.Information;
            size -= iob.Information;

            progress(max - size, max);
        }

        return true;
    }

    // User-mode fallback method
    {
        if (_lseeki64(src_fd, src_offset, SEEK_SET) < 0) {
            LogError("Failed to seek to start of '%1': %2", src_filename, strerror(errno));
            return false;
        }
        if (_lseeki64(dest_fd, dest_offset, SEEK_SET) < 0) {
            LogError("Failed to seek to start of '%1': %2", dest_filename, strerror(errno));
            return false;
        }

        while (size) {
            LocalArray<uint8_t, 655536> buf;
            unsigned long count = (unsigned long)std::min(size, (int64_t)K_SIZE(buf.data));

            buf.len = _read(src_fd, buf.data, count);

            if (buf.len < 0) {
                if (errno == EINTR)
                    continue;

                LogError("Failed to copy '%1' to '%2': %3", src_filename, dest_filename, strerror(errno));
                return false;
            }
            if (!buf.len) {
                LogError("Failed to copy '%1' to '%2': Truncated file", src_filename, dest_filename);
                return false;
            }

            Span<const uint8_t> remain = buf;

            do {
                int written = _write(dest_fd, remain.ptr, (unsigned int)remain.len);

                if (written < 0) {
                   LogError("Failed to copy '%1' to '%2': %3", src_filename, dest_filename, strerror(errno));
                    return false;
                }
                if (!written) {
                    LogError("Failed to copy '%1' to '%2': Truncated file", src_filename, dest_filename);
                    return false;
                }

                remain.ptr += written;
                remain.len -= written;
            } while (remain.len);

            size -= buf.len;

            progress(max - size, max);
        }

        return true;
    }

    K_UNREACHABLE();
}

bool FileIsVt100(int fd)
{
    static thread_local int cache_fd = -1;
    static thread_local bool cache_vt100;

    if (CheckForDumbTerm())
        return false;

    // Fast path, for repeated calls (such as Print in a loop)
    if (fd == cache_fd)
        return cache_vt100;

    if (fd == STDOUT_FILENO || fd == STDERR_FILENO) {
        HANDLE h = (HANDLE)_get_osfhandle(fd);

        DWORD console_mode;
        if (GetConsoleMode(h, &console_mode)) {
            static bool enable_emulation = [&]() {
                bool emulation = console_mode & ENABLE_VIRTUAL_TERMINAL_PROCESSING;

                if (!emulation) {
                    // Enable VT100 escape sequences, introduced in Windows 10
                    DWORD new_mode = console_mode | ENABLE_VIRTUAL_TERMINAL_PROCESSING;
                    emulation = SetConsoleMode(h, new_mode);

                    if (emulation) {
                        static HANDLE exit_handle = h;
                        static DWORD exit_mode = console_mode;

                        atexit([]() { SetConsoleMode(exit_handle, exit_mode); });
                    } else {
                        // Try ConEmu ANSI support for Windows < 10
                        const char *conemuansi_str = GetEnv("ConEmuANSI");
                        emulation = conemuansi_str && TestStr(conemuansi_str, "ON");
                    }
                }

                return emulation;
            }();

            cache_vt100 = enable_emulation;
        } else {
            cache_vt100 = false;
        }
    } else {
        cache_vt100 = false;
    }

    cache_fd = fd;
    return cache_vt100;
}

bool MakeDirectory(const char *directory, bool error_if_exists)
{
    if (win32_utf8) {
        if (!CreateDirectoryA(directory, nullptr))
            goto error;
    } else {
        wchar_t directory_w[4096];
        if (ConvertUtf8ToWin32Wide(directory, directory_w) < 0)
            return false;

        if (!CreateDirectoryW(directory_w, nullptr))
            goto error;
    }

    return true;

error:
    DWORD err = GetLastError();

    if (err != ERROR_ALREADY_EXISTS || error_if_exists) {
        LogError("Cannot create directory '%1': %2", directory, GetWin32ErrorString(err));
        return false;
    } else {
        return true;
    }
}

bool MakeDirectoryRec(Span<const char> directory)
{
    LocalArray<wchar_t, 4096> buf_w;
    buf_w.len = ConvertUtf8ToWin32Wide(directory, buf_w.data);
    if (buf_w.len < 0)
        return false;

    // Simple case: directory already exists or only last level was missing
    if (!CreateDirectoryW(buf_w.data, nullptr)) {
        DWORD err = GetLastError();

        if (err == ERROR_ALREADY_EXISTS) {
            return true;
        } else if (err != ERROR_PATH_NOT_FOUND) {
            LogError("Cannot create directory '%1': %2", directory, strerror(errno));
            return false;
        }
    }

    for (Size offset = 1, parts = 0; offset <= buf_w.len; offset++) {
        if (!buf_w.data[offset] || buf_w[offset] == L'\\' || buf_w[offset] == L'/') {
            buf_w.data[offset] = 0;
            parts++;

            if (!CreateDirectoryW(buf_w.data, nullptr) && GetLastError() != ERROR_ALREADY_EXISTS) {
                Size offset8 = 0;
                while (offset8 < directory.len) {
                    parts -= IsPathSeparator(directory[offset8]);
                    if (!parts)
                        break;
                    offset8++;
                }

                LogError("Cannot create directory '%1': %2",
                         directory.Take(0, offset8), GetWin32ErrorString());
                return false;
            }

            buf_w.data[offset] = L'\\';
        }
    }

    return true;
}

bool UnlinkDirectory(const char *directory, bool error_if_missing)
{
    if (win32_utf8) {
        if (!RemoveDirectoryA(directory))
            goto error;
    } else {
        wchar_t directory_w[4096];
        if (ConvertUtf8ToWin32Wide(directory, directory_w) < 0)
            return false;

        if (!RemoveDirectoryW(directory_w))
            goto error;
    }

    return true;

error:
    DWORD err = GetLastError();

    if (err != ERROR_FILE_NOT_FOUND || error_if_missing) {
        LogError("Failed to remove directory '%1': %2", directory, GetWin32ErrorString(err));
        return false;
    } else {
        return true;
    }
}

bool UnlinkFile(const char *filename, bool error_if_missing)
{
    if (win32_utf8) {
        if (!DeleteFileA(filename))
            goto error;
    } else {
        wchar_t filename_w[4096];
        if (ConvertUtf8ToWin32Wide(filename, filename_w) < 0)
            return false;

        if (!DeleteFileW(filename_w))
            goto error;
    }

    return true;

error:
    DWORD err = GetLastError();

    if (err != ERROR_FILE_NOT_FOUND || error_if_missing) {
        LogError("Failed to remove file '%1': %2", filename, GetWin32ErrorString());
        return false;
    } else {
        return true;
    }
}

#else

OpenResult OpenFile(const char *filename, unsigned int flags, unsigned int silent, int *out_fd)
{
    K_ASSERT(!(silent & ((int)OpenResult::Success | (int)OpenResult::OtherError)));

    int oflags = -1;
    switch (flags & ((int)OpenFlag::Read |
                     (int)OpenFlag::Write |
                     (int)OpenFlag::Append)) {
        case (int)OpenFlag::Read: { oflags = O_RDONLY | O_CLOEXEC; } break;
        case (int)OpenFlag::Write: { oflags = O_WRONLY | O_CREAT | O_TRUNC | O_CLOEXEC; } break;
        case (int)OpenFlag::Read | (int)OpenFlag::Write: { oflags = O_RDWR | O_CREAT | O_TRUNC | O_CLOEXEC; } break;
        case (int)OpenFlag::Append: { oflags = O_WRONLY | O_CREAT | O_APPEND | O_CLOEXEC; } break;
    }
    K_ASSERT(oflags >= 0);

    if (flags & (int)OpenFlag::Keep) {
        oflags &= ~O_TRUNC;
    }
    if (flags & (int)OpenFlag::Directory) {
        K_ASSERT(!(flags & (int)OpenFlag::Exclusive));
        K_ASSERT(!(flags & (int)OpenFlag::Append));

        oflags &= ~(O_CREAT | O_WRONLY | O_RDWR | O_TRUNC);
    }
    if (flags & (int)OpenFlag::Exists) {
        K_ASSERT(!(flags & (int)OpenFlag::Exclusive));
        oflags &= ~O_CREAT;
    } else if (flags & (int)OpenFlag::Exclusive) {
        K_ASSERT(oflags & O_CREAT);
        oflags |= O_EXCL;
    }
    if (flags & (int)OpenFlag::NoFollow) {
        oflags |= O_NOFOLLOW;
    }

    int fd = K_RESTART_EINTR(open(filename, oflags, 0644), < 0);
    if (fd < 0) {
        OpenResult ret;
        switch (errno) {
            case ENOENT: { ret = OpenResult::MissingPath; } break;
            case EEXIST: { ret = OpenResult::FileExists; } break;
            case EACCES: { ret = OpenResult::AccessDenied; } break;
            default: { ret = OpenResult::OtherError; } break;
        }

        if (!(silent & (int)ret)) {
            LogError("Cannot open '%1': %2", filename, strerror(errno));
        }
        return ret;
    }

    *out_fd = fd;
    return OpenResult::Success;
}

void CloseDescriptor(int fd)
{
    // We could call close() anyway, it will fail with EINVAL,
    // but that leads to debugger or valgrind noise.
    if (fd < 0)
        return;

    close(fd);
}

bool FlushFile(int fd, const char *filename)
{
    K_ASSERT(filename);

#if defined(__APPLE__)
    if (fsync(fd) < 0 && errno != EINVAL && errno != ENOTSUP) {
#else
    if (fsync(fd) < 0 && errno != EINVAL) {
#endif
        LogError("Failed to sync '%1': %2", filename, strerror(errno));
        return false;
    }

    return true;
}

bool SpliceFile(int src_fd, const char *src_filename, int64_t src_offset,
                int dest_fd, const char *dest_filename, int64_t dest_offset, int64_t size,
                FunctionRef<void(int64_t, int64_t)> progress)
{
    static_assert(sizeof(off_t) == 8, "This code base requires large file offsets");

    int64_t max = size;
    progress(0, max);

    // Try copy_file_range() if available
#if defined(__NR_copy_file_range)
    {
        bool first = true;

        while (size) {
            // glibc < 2.27 doesn't define copy_file_range

            size_t count = (size_t)std::min(size, (int64_t)Mebibytes(64));
            ssize_t ret = syscall(__NR_copy_file_range, src_fd, (off_t *)&src_offset, dest_fd, (off_t *)&dest_offset, count, 0u);

            if (ret < 0) {
                if (first && errno == EXDEV)
                    goto xdev;
                if (errno == EINTR)
                    continue;

                LogError("Failed to copy '%1' to '%2': %3", src_filename, dest_filename, strerror(errno));
                return false;
            }

            first = false;
            size -= ret;

            progress(max - size, max);
        }

        return true;
    }

xdev:
#elif defined(__FreeBSD__)
    {
        bool first = true;

        while (size) {
            size_t count = (size_t)std::min(size, (int64_t)Mebibytes(64));
            ssize_t ret = copy_file_range(src_fd, (off_t *)&src_offset, dest_fd, (off_t *)&dest_offset, count, 0u);

            if (ret < 0) {
                if (first && errno == EXDEV)
                    goto xdev;
                if (errno == EINTR)
                    continue;

                LogError("Failed to copy '%1' to '%2': %3", src_filename, dest_filename, strerror(errno));
                return false;
            }

            first = false;
            size -= ret;

            progress(max - size, max);
        }

        return true;
    }

xdev:
#endif

#if defined(__linux__)
    // Try sendfile() on Linux
    {
        bool first = true;

        if (lseek(dest_fd, dest_offset, SEEK_SET) < 0) {
            LogError("Failed to seek to start of '%1': %2", dest_filename, strerror(errno));
            return false;
        }

        while (size) {
            size_t count = (size_t)std::min(size, (int64_t)Mebibytes(64));
            ssize_t ret = sendfile(dest_fd, src_fd, (off_t *)&src_offset, count);

            if (ret < 0) {
                if (first && errno == EINVAL)
                    goto unsupported;
                if (errno == EINTR)
                    continue;

                LogError("Failed to copy '%1' to '%2': %3", src_filename, dest_filename, strerror(errno));
                return false;
            }

            first = false;
            size -= ret;

            progress(max - size, max);
        }

        return true;
    }

unsupported:
#endif

    // User-mode fallback method
    {
        if (lseek(src_fd, src_offset, SEEK_SET) < 0) {
            LogError("Failed to seek to start of '%1': %2", src_filename, strerror(errno));
            return false;
        }
        if (lseek(dest_fd, dest_offset, SEEK_SET) < 0) {
            LogError("Failed to seek to start of '%1': %2", dest_filename, strerror(errno));
            return false;
        }

        while (size) {
            LocalArray<uint8_t, 655536> buf;
            Size count = (Size)std::min(size, (int64_t)K_SIZE(buf.data));

            buf.len = read(src_fd, buf.data, (size_t)count);

            if (buf.len < 0) {
                if (errno == EINTR)
                    continue;

                LogError("Failed to copy '%1' to '%2': %3", src_filename, dest_filename, strerror(errno));
                return false;
            }
            if (!buf.len) {
                LogError("Failed to copy '%1' to '%2': Truncated file");
                return false;
            }

            Span<const uint8_t> remain = buf;

            do {
                ssize_t written = write(dest_fd, remain.ptr, (size_t)remain.len);

                if (written < 0) {
                   LogError("Failed to copy '%1' to '%2': %3", src_filename, dest_filename, strerror(errno));
                    return false;
                }
                if (!written) {
                    LogError("Failed to copy '%1' to '%2': Truncated file", src_filename, dest_filename);
                    return false;
                }

                remain.ptr += written;
                remain.len -= written;
            } while (remain.len);

            size -= buf.len;

            progress(max - size, max);
        }

        return true;
    }

    K_UNREACHABLE();
}

bool FileIsVt100(int fd)
{
    static thread_local int cache_fd = -1;
    static thread_local bool cache_vt100;

    if (CheckForDumbTerm())
        return false;

#if defined(__EMSCRIPTEN__)
    static bool win32 = ([]() {
        int win32 = EM_ASM_INT({
            try {
                const os = require('os');

                var win32 = (os.platform() === 'win32');
                return win32 ? 1 : 0;
            } catch (err) {
                return 0;
            }
        });

        return (bool)win32;
    })();

    if (win32)
        return false;
#endif

    // Fast path, for repeated calls (such as Print in a loop)
    if (fd == cache_fd)
        return cache_vt100;

    cache_fd = fd;
    cache_vt100 = isatty(fd);

    return cache_vt100;
}

bool MakeDirectory(const char *directory, bool error_if_exists)
{
    if (mkdir(directory, 0755) < 0 && (errno != EEXIST || error_if_exists)) {
        LogError("Cannot create directory '%1': %2", directory, strerror(errno));
        return false;
    }

    return true;
}

bool MakeDirectoryRec(Span<const char> directory)
{
    char buf[4096];
    if (directory.len >= K_SIZE(buf)) [[unlikely]] {
        LogError("Path '%1' is too large", directory);
        return false;
    }
    MemCpy(buf, directory.ptr, directory.len);
    buf[directory.len] = 0;

    // Simple case: directory already exists or only last level was missing
    if (mkdir(buf, 0755) < 0) {
        if (errno == EEXIST) {
            return true;
        } else if (errno != ENOENT) {
            LogError("Cannot create directory '%1': %2", buf, strerror(errno));
            return false;
        }
    }

    for (Size offset = 1; offset <= directory.len; offset++) {
        if (!buf[offset] || IsPathSeparator(buf[offset])) {
            buf[offset] = 0;

            if (mkdir(buf, 0755) < 0 && errno != EEXIST) {
                LogError("Cannot create directory '%1': %2", buf, strerror(errno));
                return false;
            }

            buf[offset] = *K_PATH_SEPARATORS;
        }
    }

    return true;
}

bool UnlinkDirectory(const char *directory, bool error_if_missing)
{
    if (rmdir(directory) < 0 && (errno != ENOENT || error_if_missing)) {
        LogError("Failed to remove directory '%1': %2", directory, strerror(errno));
        return false;
    }

    return true;
}

bool UnlinkFile(const char *filename, bool error_if_missing)
{
    if (unlink(filename) < 0 && (errno != ENOENT || error_if_missing)) {
        LogError("Failed to remove file '%1': %2", filename, strerror(errno));
        return false;
    }

    return true;
}

#endif

bool EnsureDirectoryExists(const char *filename)
{
    Span<const char> directory = GetPathDirectory(filename);
    return MakeDirectoryRec(directory);
}

#if !defined(__wasi__)

#if defined(_WIN32)

static const DWORD main_thread = GetCurrentThreadId();
static HANDLE console_ctrl_event = CreateEvent(nullptr, TRUE, FALSE, nullptr);
static bool ignore_ctrl_event = false;

static BOOL CALLBACK ConsoleCtrlHandler(DWORD)
{
    SetEvent(console_ctrl_event);
    return (BOOL)ignore_ctrl_event;
}

static bool InitConsoleCtrlHandler()
{
    static std::once_flag flag;

    static bool success;
    std::call_once(flag, []() { success = SetConsoleCtrlHandler(ConsoleCtrlHandler, TRUE); });

    if (!success) {
        LogError("SetConsoleCtrlHandler() failed: %1", GetWin32ErrorString());
    }
    return success;
}

bool CreateOverlappedPipe(bool overlap0, bool overlap1, PipeMode mode, HANDLE out_handles[2])
{
    static LONG pipe_idx;

    HANDLE handles[2] = {};
    K_DEFER_N(handle_guard) {
        CloseHandleSafe(&handles[0]);
        CloseHandleSafe(&handles[1]);
    };

    char pipe_name[128];
    do {
        Fmt(pipe_name, "\\\\.\\pipe\\kcc.%1.%2",
            GetCurrentProcessId(), InterlockedIncrement(&pipe_idx));

        DWORD open_mode = PIPE_ACCESS_INBOUND | FILE_FLAG_FIRST_PIPE_INSTANCE | (overlap0 ? FILE_FLAG_OVERLAPPED : 0);
        DWORD pipe_mode = PIPE_WAIT | PIPE_REJECT_REMOTE_CLIENTS;
        switch (mode) {
            case PipeMode::Byte: { pipe_mode |= PIPE_TYPE_BYTE; } break;
            case PipeMode::Message: { pipe_mode |= PIPE_TYPE_MESSAGE | PIPE_READMODE_MESSAGE; } break;
        }

        handles[0] = CreateNamedPipeA(pipe_name, open_mode, pipe_mode, 1, 8192, 8192, 0, nullptr);
        if (!handles[0] && GetLastError() != ERROR_ACCESS_DENIED) {
            LogError("Failed to create pipe: %1", GetWin32ErrorString());
            return false;
        }
    } while (!handles[0]);

    handles[1] = CreateFileA(pipe_name, GENERIC_WRITE, 0, nullptr, OPEN_EXISTING,
                             FILE_ATTRIBUTE_NORMAL | (overlap1 ? FILE_FLAG_OVERLAPPED : 0), nullptr);
    if (handles[1] == INVALID_HANDLE_VALUE) {
        LogError("Failed to create pipe: %1", GetWin32ErrorString());
        return false;
    }

    if (mode == PipeMode::Message) {
        DWORD value = PIPE_READMODE_MESSAGE;
        if (!SetNamedPipeHandleState(handles[1], &value, nullptr, nullptr)) {
            LogError("Failed to switch pipe to message mode: %1", GetWin32ErrorString());
            return false;
        }
    }

    handle_guard.Disable();
    out_handles[0] = handles[0];
    out_handles[1] = handles[1];
    return true;
}

void CloseHandleSafe(HANDLE *handle_ptr)
{
    HANDLE h = *handle_ptr;

    if (h && h != INVALID_HANDLE_VALUE) {
        CancelIo(h);
        CloseHandle(h);
    }

    *handle_ptr = nullptr;
}

struct PendingIO {
    OVERLAPPED ov = {}; // Keep first

    bool pending = false;
    DWORD err = 0;
    Size len = -1;

    static void CALLBACK CompletionHandler(DWORD err, DWORD len, OVERLAPPED *ov)
    {
        PendingIO *self = (PendingIO *)ov;

        self->pending = false;
        self->err = err;
        self->len = err ? -1 : len;
    }
};

bool ExecuteCommandLine(const char *cmd_line, const ExecuteInfo &info,
                        FunctionRef<Span<const uint8_t>()> in_func,
                        FunctionRef<void(Span<uint8_t> buf)> out_func, int *out_code)
{
    STARTUPINFOW si = {};

    BlockAllocator temp_alloc;

    // Convert command line
    Span<wchar_t> cmd_line_w = AllocateSpan<wchar_t>(&temp_alloc, 2 * strlen(cmd_line) + 1);
    if (ConvertUtf8ToWin32Wide(cmd_line, cmd_line_w) < 0)
        return false;

    // Convert work directory
    Span<wchar_t> work_dir_w;
    if (info.work_dir) {
        work_dir_w = AllocateSpan<wchar_t>(&temp_alloc, 2 * strlen(info.work_dir) + 1);
        if (ConvertUtf8ToWin32Wide(info.work_dir, work_dir_w) < 0)
            return false;
    } else {
        work_dir_w = {};
    }

    // Detect CTRL+C and CTRL+BREAK events
    if (!InitConsoleCtrlHandler())
        return false;

    // Neither GenerateConsoleCtrlEvent() or TerminateProcess() manage to fully kill Clang on
    // Windows (in highly-parallel builds) after CTRL-C, with occasionnal suspended child
    // processes remaining alive. Furthermore, processes killed by GenerateConsoleCtrlEvent()
    // can trigger "MessageBox" errors, unless SetErrorMode() is used.
    //
    // TerminateJobObject() is a bit brutal, but it takes care of these issues.
    HANDLE job_handle = CreateJobObject(nullptr, nullptr);
    if (!job_handle) {
        LogError("Failed to create job object: %1", GetWin32ErrorString());
        return false;
    }
    K_DEFER { CloseHandleSafe(&job_handle); };

    // If I die, everyone dies!
    {
        JOBOBJECT_EXTENDED_LIMIT_INFORMATION limits = {};
        limits.BasicLimitInformation.LimitFlags = JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE;

        if (!SetInformationJobObject(job_handle, JobObjectExtendedLimitInformation, &limits, K_SIZE(limits))) {
            LogError("SetInformationJobObject() failed: %1", GetWin32ErrorString());
            return false;
        }
    }

    // Create read pipes
    HANDLE in_pipe[2] = {};
    K_DEFER {
        CloseHandleSafe(&in_pipe[0]);
        CloseHandleSafe(&in_pipe[1]);
    };
    if (in_func.IsValid() && !CreateOverlappedPipe(false, true, PipeMode::Byte, in_pipe))
        return false;

    // Create write pipes
    HANDLE out_pipe[2] = {};
    K_DEFER {
        CloseHandleSafe(&out_pipe[0]);
        CloseHandleSafe(&out_pipe[1]);
    };
    if (out_func.IsValid() && !CreateOverlappedPipe(true, false, PipeMode::Byte, out_pipe))
        return false;

    // Prepare environment (if needed)
    HeapArray<wchar_t> new_env_w;
    if (info.reset_env || info.env_variables.len) {
        if (!info.reset_env) {
            Span<wchar_t> current_env = MakeSpan(GetEnvironmentStringsW(), 0);

            do {
                Size len = (Size)wcslen(current_env.end());
                current_env.len += len + 1;
            } while (current_env.ptr[current_env.len]);

            new_env_w.Append(current_env);
        }

        for (const ExecuteInfo::KeyValue &kv: info.env_variables) {
            Span<const char> key = kv.key;
            Span<const char> value = kv.value;

            Size len = 2 * (key.len + value.len + 1) + 1;
            new_env_w.Grow(len);

            len = ConvertUtf8ToWin32Wide(key, new_env_w.TakeAvailable());
            if (len < 0) [[unlikely]]
                return false;
            new_env_w.len += len;

            new_env_w.Append(L'=');

            len = ConvertUtf8ToWin32Wide(value, new_env_w.TakeAvailable());
            if (len < 0) [[unlikely]]
                return false;
            new_env_w.len += len;

            new_env_w.Append(0);
        }

        new_env_w.Append(0);
    }

    // Start process
    HANDLE process_handle;
    {
        K_DEFER {
            CloseHandleSafe(&si.hStdInput);
            CloseHandleSafe(&si.hStdOutput);
            CloseHandleSafe(&si.hStdError);
        };

        if (in_func.IsValid() || out_func.IsValid()) {
            if (!DuplicateHandle(GetCurrentProcess(), in_func.IsValid() ? in_pipe[0] : GetStdHandle(STD_INPUT_HANDLE),
                                 GetCurrentProcess(), &si.hStdInput, 0, TRUE, DUPLICATE_SAME_ACCESS)) {
                LogError("Failed to duplicate handle: %1", GetWin32ErrorString());
                return false;
            }
            if (!DuplicateHandle(GetCurrentProcess(), out_func.IsValid() ? out_pipe[1] : GetStdHandle(STD_OUTPUT_HANDLE),
                                 GetCurrentProcess(), &si.hStdOutput, 0, TRUE, DUPLICATE_SAME_ACCESS) ||
                !DuplicateHandle(GetCurrentProcess(), out_func.IsValid() ? out_pipe[1] : GetStdHandle(STD_ERROR_HANDLE),
                                 GetCurrentProcess(), &si.hStdError, 0, TRUE, DUPLICATE_SAME_ACCESS)) {
                LogError("Failed to duplicate handle: %1", GetWin32ErrorString());
                return false;
            }
            si.dwFlags |= STARTF_USESTDHANDLES;
        }

        int flags = CREATE_NEW_PROCESS_GROUP | CREATE_UNICODE_ENVIRONMENT;

        PROCESS_INFORMATION pi = {};
        if (!CreateProcessW(nullptr, cmd_line_w.ptr, nullptr, nullptr, TRUE, flags,
                            new_env_w.ptr, work_dir_w.ptr, &si, &pi)) {
            LogError("Failed to start process: %1", GetWin32ErrorString());
            return false;
        }
        if (!AssignProcessToJobObject(job_handle, pi.hProcess)) {
            CloseHandleSafe(&job_handle);
        }

        process_handle = pi.hProcess;
        CloseHandle(pi.hThread);

        CloseHandleSafe(&in_pipe[0]);
        CloseHandleSafe(&out_pipe[1]);
    }
    K_DEFER { CloseHandleSafe(&process_handle); };

    // Read and write standard process streams
    {
        bool running = in_func.IsValid() || out_func.IsValid();

        PendingIO proc_in;
        Span<const uint8_t> write_buf = {};
        PendingIO proc_out;
        uint8_t read_buf[4096];

        while (running) {
            // Try to write
            if (in_func.IsValid() && !proc_in.pending) {
                if (!proc_in.err) {
                    if (proc_in.len >= 0) {
                        write_buf.ptr += proc_in.len;
                        write_buf.len -= proc_in.len;
                    }

                    if (!write_buf.len) {
                        write_buf = in_func();
                        K_ASSERT(write_buf.len >= 0);
                    }

                    if (write_buf.len) {
                        K_ASSERT(write_buf.len < UINT_MAX);

                        if (!WriteFileEx(in_pipe[1], write_buf.ptr, (DWORD)write_buf.len,
                                         &proc_in.ov, PendingIO::CompletionHandler)) {
                            proc_in.err = GetLastError();
                        }
                    } else {
                        CloseHandleSafe(&in_pipe[1]);
                        running &= out_func.IsValid();
                    }
                }

                if (proc_in.err && proc_in.err != ERROR_BROKEN_PIPE && proc_in.err != ERROR_NO_DATA) {
                    LogError("Failed to write to process: %1", GetWin32ErrorString(proc_in.err));
                }

                proc_in.pending = true;
            }

            // Try to read
            if (out_func.IsValid() && !proc_out.pending) {
                if (!proc_out.err) {
                    if (proc_out.len >= 0) {
                        out_func(MakeSpan(read_buf, proc_out.len));
                        proc_out.len = -1;
                    }

                    if (proc_out.len && !ReadFileEx(out_pipe[0], read_buf, K_SIZE(read_buf), &proc_out.ov, PendingIO::CompletionHandler)) {
                        proc_out.err = GetLastError();
                    }
                }

                if (proc_out.err) {
                    if (proc_out.err != ERROR_BROKEN_PIPE && proc_out.err != ERROR_NO_DATA) {
                        LogError("Failed to read process output: %1", GetWin32ErrorString(proc_out.err));
                    }
                    break;
                }

                proc_out.pending = true;
            }

            running = (WaitForSingleObjectEx(console_ctrl_event, INFINITE, TRUE) != WAIT_OBJECT_0);
        }
    }

    // Terminate any remaining I/O
    CloseHandleSafe(&in_pipe[1]);
    CloseHandleSafe(&out_pipe[0]);

    // Wait for process exit
    {
        HANDLE events[2] = {
            process_handle,
            console_ctrl_event
        };

        if (WaitForMultipleObjects(K_LEN(events), events, FALSE, INFINITE) == WAIT_FAILED) {
            LogError("WaitForMultipleObjects() failed: %1", GetWin32ErrorString());
            return false;
        }
    }

    // Get exit code
    DWORD exit_code;
    if (WaitForSingleObject(console_ctrl_event, 0) == WAIT_OBJECT_0) {
        TerminateJobObject(job_handle, STATUS_CONTROL_C_EXIT);
        exit_code = STATUS_CONTROL_C_EXIT;
    } else if (!GetExitCodeProcess(process_handle, &exit_code)) {
        LogError("GetExitCodeProcess() failed: %1", GetWin32ErrorString());
        return false;
    }

    // Mimic POSIX SIGINT
    if (exit_code == STATUS_CONTROL_C_EXIT) {
        exit_code = 130;
    }

    *out_code = (int)exit_code;
    return true;
}

#else

static const pthread_t main_thread = pthread_self();

static std::atomic_bool flag_signal { false };
static std::atomic_int explicit_signal { 0 };
static std::atomic_int interrupt_pfd[2] { -1, -1 };

void SetSignalHandler(int signal, void (*func)(int), struct sigaction *prev)
{
    struct sigaction action = {};

    action.sa_handler = func;
    sigemptyset(&action.sa_mask);
    action.sa_flags = 0;

    sigaction(signal, &action, prev);
}

static void DefaultSignalHandler(int signal)
{
    if (pthread_self() != main_thread) {
        pthread_kill(main_thread, signal);
        return;
    }

    if (int fd = interrupt_pfd[1].load(); fd >= 0) {
        char dummy = 0;
        K_IGNORE write(fd, &dummy, 1);
    }

    if (flag_signal) {
        explicit_signal = signal;
    } else {
        int code = (signal == SIGINT) ? 130 : 1;
        exit(code);
    }
}

bool CreatePipe(bool block, int out_pfd[2])
{
#if defined(__APPLE__)
    if (pipe(out_pfd) < 0) {
        LogError("Failed to create pipe: %1", strerror(errno));
        return false;
    }

    if (fcntl(out_pfd[0], F_SETFD, FD_CLOEXEC) < 0 || fcntl(out_pfd[1], F_SETFD, FD_CLOEXEC) < 0) {
        LogError("Failed to set FD_CLOEXEC on pipe: %1", strerror(errno));
        return false;
    }
    if (!block) {
        if (fcntl(out_pfd[0], F_SETFL, O_NONBLOCK) < 0 || fcntl(out_pfd[1], F_SETFL, O_NONBLOCK) < 0) {
            LogError("Failed to set O_NONBLOCK on pipe: %1", strerror(errno));
            return false;
        }
    }

    return true;
#else
    int flags = O_CLOEXEC | (block ? 0 : O_NONBLOCK);

    if (pipe2(out_pfd, flags) < 0)  {
        LogError("Failed to create pipe: %1", strerror(errno));
        return false;
    }

    return true;
#endif
}

void CloseDescriptorSafe(int *fd_ptr)
{
    if (*fd_ptr >= 0) {
        close(*fd_ptr);
    }

    *fd_ptr = -1;
}

static void InitInterruptPipe()
{
    static bool success = ([]() {
        static int pfd[2];

        if (!CreatePipe(false, pfd))
            return false;

        atexit([]() {
            CloseDescriptor(pfd[0]);
            CloseDescriptor(pfd[1]);
        });

        interrupt_pfd[0] = pfd[0];
        interrupt_pfd[1] = pfd[1];

        return true;
    })();

    K_CRITICAL(success, "Failed to create interrupt pipe");
}

bool ExecuteCommandLine(const char *cmd_line, const ExecuteInfo &info,
                        FunctionRef<Span<const uint8_t>()> in_func,
                        FunctionRef<void(Span<uint8_t> buf)> out_func, int *out_code)
{
    BlockAllocator temp_alloc;

    // Create read pipes
    int in_pfd[2] = {-1, -1};
    K_DEFER {
        CloseDescriptorSafe(&in_pfd[0]);
        CloseDescriptorSafe(&in_pfd[1]);
    };
    if (in_func.IsValid()) {
        if (!CreatePipe(false, in_pfd))
            return false;
    }

    // Create write pipes
    int out_pfd[2] = {-1, -1};
    K_DEFER {
        CloseDescriptorSafe(&out_pfd[0]);
        CloseDescriptorSafe(&out_pfd[1]);
    };
    if (out_func.IsValid()) {
        if (!CreatePipe(false, out_pfd))
            return false;
    }

    InitInterruptPipe();

    // Prepare new environment (if needed)
    HeapArray<char *> new_env;
    if (info.reset_env || info.env_variables.len) {
        if (!info.reset_env) {
            char **ptr = environ;

            while (*ptr) {
                new_env.Append(*ptr);
                ptr++;
            }
        }

        for (const ExecuteInfo::KeyValue &kv: info.env_variables) {
            const char *var = Fmt(&temp_alloc, "%1=%2", kv.key, kv.value).ptr;
            new_env.Append((char *)var);
        }

        new_env.Append(nullptr);
    }

    // Start process
    pid_t pid;
    {
        posix_spawn_file_actions_t file_actions;
        if ((errno = posix_spawn_file_actions_init(&file_actions))) {
            LogError("Failed to set up standard process descriptors: %1", strerror(errno));
            return false;
        }
        K_DEFER { posix_spawn_file_actions_destroy(&file_actions); };

        if (in_func.IsValid() && (errno = posix_spawn_file_actions_adddup2(&file_actions, in_pfd[0], STDIN_FILENO))) {
            LogError("Failed to set up standard process descriptors: %1", strerror(errno));
            return false;
        }
        if (out_func.IsValid() && ((errno = posix_spawn_file_actions_adddup2(&file_actions, out_pfd[1], STDOUT_FILENO)) ||
                                   (errno = posix_spawn_file_actions_adddup2(&file_actions, out_pfd[1], STDERR_FILENO)))) {
            LogError("Failed to set up standard process descriptors: %1", strerror(errno));
            return false;
        }

        if (info.work_dir) {
            const char *argv[] = { "env", "-C", info.work_dir, "sh", "-c", cmd_line, nullptr };
            errno = posix_spawn(&pid, "/bin/env", &file_actions, nullptr, const_cast<char **>(argv), new_env.ptr ? new_env.ptr : environ);
        } else {
            const char *argv[] = { "sh", "-c", cmd_line, nullptr };
            errno = posix_spawn(&pid, "/bin/sh", &file_actions, nullptr, const_cast<char **>(argv), new_env.ptr ? new_env.ptr : environ);
        }
        if (errno) {
            LogError("Failed to start process: %1", strerror(errno));
            return false;
        }

        CloseDescriptorSafe(&in_pfd[0]);
        CloseDescriptorSafe(&out_pfd[1]);
    }

    Span<const uint8_t> write_buf = {};
    bool terminate = false;

    // Read and write standard process streams
    while (in_pfd[1] >= 0 || out_pfd[0] >= 0) {
        LocalArray<struct pollfd, 3> pfds;
        int in_idx = -1, out_idx = -1, term_idx = -1;
        if (in_pfd[1] >= 0) {
            in_idx = pfds.len;
            pfds.Append({ in_pfd[1], POLLOUT, 0 });
        }
        if (out_pfd[0] >= 0) {
            out_idx = pfds.len;
            pfds.Append({ out_pfd[0], POLLIN, 0 });
        }
        if (int fd = interrupt_pfd[0].load(); fd >= 0) {
            term_idx = pfds.len;
            pfds.Append({ fd, POLLIN, 0 });
        }

        if (K_RESTART_EINTR(poll(pfds.data, (nfds_t)pfds.len, -1), < 0) < 0) {
            LogError("Failed to poll process I/O: %1", strerror(errno));
            break;
        }

        unsigned int in_revents = (in_idx >= 0) ? pfds[in_idx].revents : 0;
        unsigned int out_revents = (out_idx >= 0) ? pfds[out_idx].revents : 0;
        unsigned int term_revents = (term_idx >= 0) ? pfds[term_idx].revents : 0;

        // Try to write
        if (in_revents & (POLLHUP | POLLERR)) {
            CloseDescriptorSafe(&in_pfd[1]);
        } else if (in_revents & POLLOUT) {
            K_ASSERT(in_func.IsValid());

            if (!write_buf.len) {
                write_buf = in_func();
                K_ASSERT(write_buf.len >= 0);
            }

            if (write_buf.len) {
                ssize_t write_len = K_RESTART_EINTR(write(in_pfd[1], write_buf.ptr, (size_t)write_buf.len), < 0);

                if (write_len > 0) {
                    write_buf.ptr += write_len;
                    write_buf.len -= (Size)write_len;
                } else if (!write_len) {
                    CloseDescriptorSafe(&in_pfd[1]);
                } else {
                    LogError("Failed to write process input: %1", strerror(errno));
                    CloseDescriptorSafe(&in_pfd[1]);
                }
            } else {
                CloseDescriptorSafe(&in_pfd[1]);
            }
        }

        // Try to read
        if (out_revents & POLLERR) {
            break;
        } else if (out_revents & (POLLIN | POLLHUP)) {
            K_ASSERT(out_func.IsValid());

            uint8_t read_buf[4096];
            ssize_t read_len = K_RESTART_EINTR(read(out_pfd[0], read_buf, K_SIZE(read_buf)), < 0);

            if (read_len > 0) {
                out_func(MakeSpan(read_buf, read_len));
            } else if (!read_len) {
                // EOF
                break;
            } else {
                LogError("Failed to read process output: %1", strerror(errno));
                break;
            }
        }

        if (term_revents) {
            kill(pid, SIGTERM);
            terminate = true;

            break;
        }
    }

    // Done reading and writing
    CloseDescriptorSafe(&in_pfd[1]);
    CloseDescriptorSafe(&out_pfd[0]);

    // Wait for process exit
    int status;
    {
        int64_t start = GetMonotonicClock();

        for (;;) {
            int ret = K_RESTART_EINTR(waitpid(pid, &status, terminate ? WNOHANG : 0), < 0);

            if (ret < 0) {
                LogError("Failed to wait for process exit: %1", strerror(errno));
                return false;
            } else if (!ret) {
                int64_t delay = GetMonotonicClock() - start;

                if (delay < 2000) {
                    // A timeout on waitpid would be better, but... sigh
                    WaitDelay(10);
                } else {
                    kill(pid, SIGKILL);
                    terminate = false;
                }
            } else {
                break;
            }
        }
    }

    if (WIFSIGNALED(status)) {
        *out_code = 128 + WTERMSIG(status);
    } else if (WIFEXITED(status)) {
        *out_code = WEXITSTATUS(status);
    } else {
        *out_code = -1;
    }
    return true;
}

#endif

bool ExecuteCommandLine(const char *cmd_line, const ExecuteInfo &info,
                        Span<const uint8_t> in_buf, Size max_len,
                        HeapArray<uint8_t> *out_buf, int *out_code)
{
    Size start_len = out_buf->len;
    K_DEFER_N(out_guard) { out_buf->RemoveFrom(start_len); };

    // Check virtual memory limits
    {
        Size memory_max = K_SIZE_MAX - out_buf->len - 1;

        if (memory_max <= 0) [[unlikely]] {
            LogError("Exhausted memory limit");
            return false;
        }

        K_ASSERT(max_len);
        max_len = (max_len >= 0) ? std::min(max_len, memory_max) : memory_max;
    }

    // Don't f*ck up the log
    bool warned = false;

    bool success = ExecuteCommandLine(cmd_line, info, [&]() { return in_buf; }, [&](Span<uint8_t> buf) {
        if (out_buf->len - start_len <= max_len - buf.len) {
            out_buf->Append(buf);
        } else if (!warned) {
            LogError("Truncated output");
            warned = true;
        }
    }, out_code);
    if (!success)
        return false;

    out_guard.Disable();
    return true;
}

Size ReadCommandOutput(const char *cmd_line, Span<uint8_t> out_output)
{
    static ExecuteInfo::KeyValue variables[] = {
        { "LANG", "C" },
        { "LC_ALL", "C" }
    };

    ExecuteInfo info = {};
    info.env_variables = variables;

    Size total_len = 0;
    const auto write = [&](Span<uint8_t> buf) {
        Size copy = std::min(out_output.len - total_len, buf.len);

        MemCpy(out_output.ptr + total_len, buf.ptr, copy);
        total_len += copy;
    };

    int exit_code = -1;
    ExecuteCommandLine(cmd_line, info, MakeSpan((const uint8_t *)nullptr, 0), write, &exit_code);

    if (exit_code) {
        if (out_output.len) {
            Span<const char> output = TrimStr(out_output.As<const char>());
            LogError("Command '%1' failed with exit code %2:\n%3", cmd_line, exit_code, FmtArg(output));
        } else {
            LogError("Command '%1' failed with exit code %2", cmd_line, exit_code);
        }
        return -1;
    }

    return total_len;
}

bool ReadCommandOutput(const char *cmd_line, HeapArray<uint8_t> *out_output)
{
    static ExecuteInfo::KeyValue variables[] = {
        { "LANG", "C" },
        { "LC_ALL", "C" }
    };

    Size start_len = out_output->len;
    K_DEFER_N(err_guard) { out_output->RemoveFrom(start_len); };

    ExecuteInfo info = {};
    info.env_variables = variables;

    int exit_code = -1;
    ExecuteCommandLine(cmd_line, info, {}, Mebibytes(1), out_output, &exit_code);

    if (exit_code) {
        if (out_output->len > start_len) {
            Span<const char> output = TrimStr(out_output->Take(start_len, out_output->len - start_len).As<const char>());
            LogError("Command '%1' failed with exit code %2:\n%3", cmd_line, exit_code, FmtArg(output));
        } else {
            LogError("Command '%1' failed with exit code %2", cmd_line, exit_code);
        }
        return false;
    }

    err_guard.Disable();
    return true;
}

#endif

#if defined(_WIN32)

static HANDLE wait_msg_event = CreateEvent(nullptr, TRUE, FALSE, nullptr);

void WaitDelay(int64_t delay)
{
    K_ASSERT(delay >= 0);
    K_ASSERT(delay < 1000ll * INT32_MAX);

    while (delay) {
        DWORD delay32 = (DWORD)std::min(delay, (int64_t)UINT32_MAX);
        delay -= delay32;

        Sleep(delay32);
    }
}

WaitResult WaitEvents(Span<const WaitSource> sources, int64_t timeout, uint64_t *out_ready)
{
    K_ASSERT(sources.len <= 62);

    ignore_ctrl_event = InitConsoleCtrlHandler();
    K_ASSERT(ignore_ctrl_event);

    LocalArray<HANDLE, 64> events;
    DWORD wake = 0;
    DWORD wait_ret = 0;

    events.Append(console_ctrl_event);

    // There is no way to get a waitable HANDLE for the Win32 GUI message pump.
    // Instead, waitable sources (such as the system tray code) return NULL to indicate that
    // they need to wait for messages on the message pump.
    for (const WaitSource &src: sources) {
        if (src.handle) {
            events.Append(src.handle);
        } else {
            wake = QS_ALLINPUT;
        }

        timeout = (int64_t)std::min((uint64_t)timeout, (uint64_t)src.timeout);
    }

    if (main_thread == GetCurrentThreadId()) {
        wait_ret = WAIT_OBJECT_0 + (DWORD)events.len;
        events.Append(wait_msg_event);
    }

    DWORD ret;
    if (timeout >= 0) {
        do {
            DWORD timeout32 = (DWORD)std::min(timeout, (int64_t)UINT32_MAX);
            timeout -= timeout32;

            ret = MsgWaitForMultipleObjects((DWORD)events.len, events.data, FALSE, timeout32, wake);
        } while (ret == WAIT_TIMEOUT && timeout);
    } else {
        ret = MsgWaitForMultipleObjects((DWORD)events.len, events.data, FALSE, INFINITE, wake);
    }

    if (ret == WAIT_TIMEOUT) {
        return WaitResult::Timeout;
    } else if (ret == WAIT_OBJECT_0) {
        return WaitResult::Interrupt;
    } else if (ret == wait_ret) {
        ResetEvent(wait_msg_event);
        return WaitResult::Message;
    } else if (ret == WAIT_OBJECT_0 + events.len) {
        // Mark all sources with an interest in the message pump as ready
        if (out_ready) {
            uint64_t flags = 0;
            for (Size i = 0; i < sources.len; i++) {
                flags |= !sources[i].handle ? (1ull << i) : 0;
            }
            *out_ready = flags;
        }
        return WaitResult::Ready;
    } else {
        Size idx = (Size)ret - WAIT_OBJECT_0 - 1;
        K_ASSERT(idx >= 0 && idx < sources.len);

        if (out_ready) {
            *out_ready |= 1ull << idx;
        }
        return WaitResult::Ready;
    }
}

WaitResult WaitEvents(int64_t timeout)
{
    Span<const WaitSource> sources = {};
    return WaitEvents(sources, timeout);
}

void PostWaitMessage()
{
    SetEvent(wait_msg_event);
}

void PostTerminate()
{
    SetEvent(console_ctrl_event);
}

#else

void WaitDelay(int64_t delay)
{
    K_ASSERT(delay >= 0);
    K_ASSERT(delay < 1000ll * INT32_MAX);

    struct timespec ts;
    ts.tv_sec = (int)(delay / 1000);
    ts.tv_nsec = (int)((delay % 1000) * 1000000);

    struct timespec rem;
    while (nanosleep(&ts, &rem) < 0) {
        K_ASSERT(errno == EINTR);
        ts = rem;
    }
}

#if !defined(__wasi__)

WaitResult WaitEvents(Span<const WaitSource> sources, int64_t timeout, uint64_t *out_ready)
{
    LocalArray<struct pollfd, 64> pfds;
    K_ASSERT(sources.len <= K_LEN(pfds.data) - 1);

    // Don't exit after SIGINT/SIGTERM, just signal us
    flag_signal = true;

    static std::atomic_bool message { false };
    SetSignalHandler(SIGUSR1, [](int) { message = true; });

    for (const WaitSource &src: sources) {
        short events = src.events ? (short)src.events : POLLIN;
        pfds.Append({ src.fd, events, 0 });

        timeout = (int64_t)std::min((uint64_t)timeout, (uint64_t)src.timeout);
    }

    InitInterruptPipe();
    pfds.Append({ interrupt_pfd[0], POLLIN, 0 });

    int64_t start = (timeout >= 0) ? GetMonotonicClock() : 0;
    int64_t until = start + timeout;
    int timeout32 = (int)std::min(until - start, (int64_t)INT_MAX);

    for (;;) {
        if (explicit_signal == SIGTERM) {
            return WaitResult::Exit;
        } else if (explicit_signal) {
            return WaitResult::Interrupt;
        } else if (message && pthread_self() == main_thread) {
            message = false;
            return WaitResult::Message;
        }

        int ready = poll(pfds.data, (nfds_t)pfds.len, timeout32);

        if (ready < 0) {
            if (errno == EINTR)
                continue;

            LogError("Failed to poll for events: %1", strerror(errno));
            abort();
        } else if (ready > 0) {
            uint64_t flags = 0;
            for (Size i = 0; i < pfds.len - 1; i++) {
                flags |= pfds[i].revents ? (1ull << i) : 0;
            }

            if (flags) {
                if (out_ready) {
                    *out_ready = flags;
                }
                return WaitResult::Ready;
            }
        }

        if (timeout >= 0) {
            int64_t clock = GetMonotonicClock();
            if (clock >= until)
                break;
            timeout32 = (int)std::min(until - clock, (int64_t)INT_MAX);
        }
    }

    return WaitResult::Timeout;
}

WaitResult WaitEvents(int64_t timeout)
{
    Span<const WaitSource> sources = {};
    return WaitEvents(sources, timeout);
}

void PostWaitMessage()
{
    pid_t pid = getpid();
    kill(pid, SIGUSR1);
}

void PostTerminate()
{
    InitInterruptPipe();

    char dummy = 0;
    K_IGNORE write(interrupt_pfd[1], &dummy, 1);
}

#endif

#endif

int GetCoreCount()
{
#if defined(__wasi__)
    return 1;
#else
    static int cores;

    if (!cores) {
        const char *env = GetEnv("OVERRIDE_CORES");

        if (env) {
            char *end_ptr;
            long value = strtol(env, &end_ptr, 10);

            if (end_ptr > env && !end_ptr[0] && value > 0) {
                cores = (int)value;
            } else {
                LogError("OVERRIDE_CORES must be positive number (ignored)");
                cores = (int)std::thread::hardware_concurrency();
            }
        } else {
            cores = (int)std::thread::hardware_concurrency();
        }

        K_ASSERT(cores > 0);
    }

    return cores;
#endif
}

#if !defined(_WIN32) && !defined(__wasi__)

bool RaiseMaximumOpenFiles(int limit)
{
    struct rlimit lim;

    if (getrlimit(RLIMIT_NOFILE, &lim) < 0) {
        LogError("getrlimit(RLIMIT_NOFILE) failed: %1", strerror(errno));
        return false;
    }

    rlim_t target = (limit >= 0) ? (rlim_t)limit : lim.rlim_max;

    if (lim.rlim_cur >= target)
        return true;

    lim.rlim_cur = std::min(target, lim.rlim_max);

    if (setrlimit(RLIMIT_NOFILE, &lim) < 0) {
        LogError("Could not raise RLIMIT_NOFILE: %1", strerror(errno));
        return false;
    }

    if (lim.rlim_cur < target) {
        LogWarning("Maximum number of open descriptors is low: %1 (recommended: %2)", lim.rlim_cur, target);
    }

    return true;
}

bool DropRootIdentity()
{
    uid_t uid = getuid();
    uid_t euid = geteuid();
    gid_t gid = getgid();

    if (!uid) {
        LogError("This program must not be run as root");
        return false;
    }
    if (uid != euid) {
        LogDebug("Dropping SUID privileges...");
    }

    if (!euid && setgroups(1, &gid) < 0)
        goto error;
    if (setregid(gid, gid) < 0)
        goto error;
    if (setreuid(uid, uid) < 0)
        goto error;
    K_CRITICAL(setuid(0) < 0, "Managed to regain root privileges");

    return true;

error:
    LogError("Failed to drop root privilegies: %1", strerror(errno));
    return false;
}

static std::mutex fork_mutex;
static int64_t fork_generation;

bool DetectFork(int64_t *marker)
{
    static void *addr = []() -> void * {
        size_t page_size = (size_t)GetPageSize();

        void *addr = mmap(nullptr, page_size, PROT_READ | PROT_WRITE, MAP_PRIVATE | MAP_ANONYMOUS, -1, 0);
        if (!addr)
            return nullptr;
        K_DEFER_N(err_guard) { munmap(addr, page_size); };

#if defined(__linux__)
        if (!madvise(addr, page_size, -1) || madvise(addr, page_size, MADV_WIPEONFORK) < 0)
            return nullptr;
#elif defined(MAP_INHERIT_ZERO)
        if (minherit(addr, page_size, MAP_INHERIT_ZERO) < 0)
            return nullptr;
#elif defined(INHERIT_ZERO)
        if (minherit(addr, page_size, INHERIT_ZERO) < 0)
            return nullptr;
#else
        return nullptr;
#endif

        err_guard.Disable();
        return addr;
    }();

    if (addr) {
        std::atomic<int64_t> *ptr = (std::atomic<int64_t> *)addr;
        int64_t generation = ptr->load();

        if (!generation) {
            std::lock_guard<std::mutex> lock(fork_mutex);

            generation = ++fork_generation;
            ptr->store(generation);
        }

        if (*marker != generation) [[unlikely]] {
            *marker = generation;
            return true;
        } else {
            return false;
        }
    } else {
        int64_t pid = (int64_t)getpid();

        if (*marker != pid) [[unlikely]] {
            *marker = pid;
            return true;
        } else {
            return false;
        }
    }
}

#endif

#if defined(__linux__)

bool NotifySystemd()
{
    const char *addr = GetEnv("NOTIFY_SOCKET");
    if (!addr)
        return true;

    struct sockaddr_un sa;
    if (addr[0] == '@') {
        addr++;

        if (strlen(addr) >= sizeof(sa.sun_path) - 1) {
            LogError("Abstract socket address in NOTIFY_SOCKET is too long");
            return false;
        }

        sa.sun_family = AF_UNIX;
        sa.sun_path[0] = 0;
        CopyString(addr, MakeSpan(sa.sun_path + 1, K_SIZE(sa.sun_path) - 1));
    } else if (addr[0] == '/') {
        if (strlen(addr) >= sizeof(sa.sun_path)) {
            LogError("Socket pathname in NOTIFY_SOCKET is too long");
            return false;
        }

        sa.sun_family = AF_UNIX;
        CopyString(addr, sa.sun_path);
    } else {
        LogError("Invalid socket address in NOTIFY_SOCKET");
        return false;
    }

    int fd = socket(AF_UNIX, SOCK_DGRAM | SOCK_CLOEXEC, 0);
    if (fd < 0) {
        LogError("Failed to create UNIX socket: %1", strerror(errno));
        return false;
    }
    K_DEFER { close(fd); };

    struct iovec iov = {};
    struct msghdr msg = {};
    iov.iov_base = (void *)"READY=1";
    iov.iov_len = strlen("READY=1");
    msg.msg_name = &sa;
    msg.msg_namelen = offsetof(struct sockaddr_un, sun_path) + strlen(addr);
    msg.msg_iov = &iov;
    msg.msg_iovlen = 1;

    if (sendmsg(fd, &msg, MSG_NOSIGNAL) < 0) {
        LogError("Failed to send message to systemd: %1", strerror(errno));
        return false;
    }

    unsetenv("NOTIFY_SOCKET");
    return true;
}

#endif

// ------------------------------------------------------------------------
// Main
// ------------------------------------------------------------------------

static InitHelper *init;
static FinalizeHelper *finalize;

InitHelper::InitHelper(const char *name)
    : name(name)
{
    next = init;
    init = this;
}

FinalizeHelper::FinalizeHelper(const char *name)
    : name(name)
{
    next = finalize;
    finalize = this;
}

void InitApp()
{
#if defined(_WIN32)
    // Use binary standard I/O
    _setmode(STDIN_FILENO, _O_BINARY);
    _setmode(STDOUT_FILENO, _O_BINARY);
    _setmode(STDERR_FILENO, _O_BINARY);

    SetConsoleCP(CP_UTF8);
    SetConsoleOutputCP(CP_UTF8);
#endif

#if !defined(_WIN32) && !defined(__wasi__)
    // Setup default signal handlers
    SetSignalHandler(SIGINT, DefaultSignalHandler);
    SetSignalHandler(SIGTERM, DefaultSignalHandler);
    SetSignalHandler(SIGHUP, DefaultSignalHandler);
    SetSignalHandler(SIGPIPE, [](int) {});

    InitInterruptPipe();

    // Make sure timezone information is in place, which is useful if some kind of sandbox runs later and
    // the timezone information is not available (seccomp, namespace, landlock, whatever).
    tzset();
#endif

#if defined(__OpenBSD__)
    // This can depend on PATH, which could change during execution
    // so we want to cache the result as soon as possible.
    GetApplicationExecutable();
#endif

    // Init libraries
    while (init) {
#if defined(K_DEBUG)
        LogDebug("Init %1 library", init->name);
#endif

        init->Run();
        init = init->next;
    }
}

void ExitApp()
{
    while (finalize) {
#if defined(K_DEBUG)
        LogDebug("Finalize %1 library", finalize->name);
#endif

        finalize->Run();
        finalize = finalize->next;
    }
}

bool FlushStandardOutputs()
{
    bool success = true;

    success &= StdOut->Flush();
    success &= StdErr->Flush();

    return success;
}

// ------------------------------------------------------------------------
// Standard paths
// ------------------------------------------------------------------------

#if defined(_WIN32)

const char *GetUserConfigPath(const char *name, Allocator *alloc)
{
    K_ASSERT(!strchr(K_PATH_SEPARATORS, name[0]));

    static char cache_dir[4096];
    static std::once_flag flag;

    std::call_once(flag, []() {
        wchar_t *dir = nullptr;
        K_DEFER { CoTaskMemFree(dir); };

        K_CRITICAL(SHGetKnownFolderPath(FOLDERID_RoamingAppData, 0, nullptr, &dir) == S_OK,
                    "Failed to retrieve path to roaming user AppData");
        K_CRITICAL(ConvertWin32WideToUtf8(dir, cache_dir) >= 0,
                    "Path to roaming AppData is invalid or too big");
    });

    const char *path = Fmt(alloc, "%1%/%2", cache_dir, name).ptr;
    return path;
}

const char *GetUserCachePath(const char *name, Allocator *alloc)
{
    K_ASSERT(!strchr(K_PATH_SEPARATORS, name[0]));

    static char cache_dir[4096];
    static std::once_flag flag;

    std::call_once(flag, []() {
        wchar_t *dir = nullptr;
        K_DEFER { CoTaskMemFree(dir); };

        K_CRITICAL(SHGetKnownFolderPath(FOLDERID_LocalAppData, 0, nullptr, &dir) == S_OK,
                    "Failed to retrieve path to local user AppData");
        K_CRITICAL(ConvertWin32WideToUtf8(dir, cache_dir) >= 0,
                    "Path to local AppData is invalid or too big");
    });

    const char *path = Fmt(alloc, "%1%/%2", cache_dir, name).ptr;
    return path;
}

const char *GetTemporaryDirectory()
{
    static char temp_dir[4096];
    static std::once_flag flag;

    std::call_once(flag, []() {
        Size len;
        if (win32_utf8) {
            len = (Size)GetTempPathA(K_SIZE(temp_dir), temp_dir);
            K_CRITICAL(len < K_SIZE(temp_dir), "Temporary directory path is too big");
        } else {
            static wchar_t dir_w[4096];
            Size len_w = (Size)GetTempPathW(K_LEN(dir_w), dir_w);

            K_CRITICAL(len_w < K_LEN(dir_w), "Temporary directory path is too big");

            len = ConvertWin32WideToUtf8(MakeSpan(dir_w, len_w), temp_dir);
            K_CRITICAL(len >= 0, "Temporary directory path is invalid or too big");
        }

        while (len > 0 && IsPathSeparator(temp_dir[len - 1])) {
            len--;
        }
        temp_dir[len] = 0;
    });

    return temp_dir;
}

#else

const char *GetUserConfigPath(const char *name, Allocator *alloc)
{
    K_ASSERT(!strchr(K_PATH_SEPARATORS, name[0]));

    const char *xdg = GetEnv("XDG_CONFIG_HOME");
    const char *home = GetHomeDirectory();

    const char *path = nullptr;

    if (xdg) {
        path = Fmt(alloc, "%1%/%2", xdg, name).ptr;
    } else if (home) {
        path = Fmt(alloc, "%1%/.config/%2", home, name).ptr;
#if !defined(__wasi__)
    } else if (!getuid()) {
        path = Fmt(alloc, "/root/.config/%1", name).ptr;
#endif
    }

    if (path && !EnsureDirectoryExists(path))
        return nullptr;

    return path;
}

const char *GetUserCachePath(const char *name, Allocator *alloc)
{
    K_ASSERT(!strchr(K_PATH_SEPARATORS, name[0]));

    const char *xdg = GetEnv("XDG_CACHE_HOME");
    const char *home = GetHomeDirectory();

    const char *path = nullptr;

    if (xdg) {
        path = Fmt(alloc, "%1%/%2", xdg, name).ptr;
    } else if (home) {
        path = Fmt(alloc, "%1%/.cache/%2", home, name).ptr;
#if !defined(__wasi__)
    } else if (!getuid()) {
        path = Fmt(alloc, "/root/.cache/%1", name).ptr;
#endif
    }

    if (path && !EnsureDirectoryExists(path))
        return nullptr;

    return path;
}

const char *GetSystemConfigPath(const char *name, Allocator *alloc)
{
    K_ASSERT(!strchr(K_PATH_SEPARATORS, name[0]));

    const char *path = Fmt(alloc, "/etc/%1", name).ptr;
    return path;
}

const char *GetTemporaryDirectory()
{
    static char temp_dir[4096];
    static std::once_flag flag;

    std::call_once(flag, []() {
        Span<const char> env = GetEnv("TMPDIR");

        while (env.len > 0 && IsPathSeparator(env[env.len - 1])) {
            env.len--;
        }

        if (env.len && env.len < K_SIZE(temp_dir)) {
            CopyString(env, temp_dir);
        } else {
            CopyString("/tmp", temp_dir);
        }
    });

    return temp_dir;
}

#endif

const char *FindConfigFile(const char *directory, Span<const char *const> names,
                           Allocator *alloc, HeapArray<const char *> *out_possibilities)
{
    K_ASSERT(!directory || directory[0]);

    decltype(GetUserConfigPath) *funcs[] = {
        GetUserConfigPath,
#if !defined(_WIN32)
        GetSystemConfigPath
#endif
    };

    const char *filename = nullptr;

    // Try application directory
    for (const char *name: names) {
        Span<const char> dir = GetApplicationDirectory();
        const char *path = Fmt(alloc, "%1%/%2", dir, name).ptr;

        if (!filename && TestFile(path, FileType::File)) {
            filename = path;
        }
        if (out_possibilities) {
            out_possibilities->Append(path);
        }
    }

    LocalArray<const char *, 8> tests;
    {
        K_ASSERT(names.len <= tests.Available());

        for (const char *name: names) {
            if (directory) {
                const char *test = Fmt(alloc, "%1%/%2", directory, name).ptr;
                tests.Append(test);
            } else {
                tests.Append(name);
            }
        }
    }

    // Try standard paths
    for (const auto &func: funcs) {
        for (const char *test: tests) {
            const char *path = func(test, alloc);

            if (!path)
                continue;

            if (!filename && TestFile(path, FileType::File)) {
                filename = path;
            }
            if (out_possibilities) {
                out_possibilities->Append(path);
            }
        }
    }

    return filename;
}

static const char *CreateUniquePath(Span<const char> directory, const char *prefix, const char *extension,
                                    Allocator *alloc, FunctionRef<bool(const char *path)> create)
{
    K_ASSERT(alloc);

    HeapArray<char> filename(alloc);
    filename.Append(directory);
    filename.Append(*K_PATH_SEPARATORS);
    if (prefix) {
        filename.Append(prefix);
        filename.Append('.');
    }

    Size change_offset = filename.len;

    PushLogFilter([](LogLevel, const char *, const char *, FunctionRef<LogFunc>) {});
    K_DEFER_N(log_guard) { PopLogFilter(); };

    for (Size i = 0; i < 1000; i++) {
        // We want to show an error on last try
        if (i == 999) [[unlikely]] {
            PopLogFilter();
            log_guard.Disable();
        }

        filename.RemoveFrom(change_offset);
        Fmt(&filename, "%1%2", FmtRandom(24), extension);

        if (create(filename.ptr)) {
            const char *ret = filename.TrimAndLeak(1).ptr;
            return ret;
        }
    }

    return nullptr;
}

const char *CreateUniqueFile(Span<const char> directory, const char *prefix, const char *extension,
                             Allocator *alloc, int *out_fd)
{
    return CreateUniquePath(directory, prefix, extension, alloc, [&](const char *path) {
        int flags = (int)OpenFlag::Read | (int)OpenFlag::Write |
                    (int)OpenFlag::Exclusive;

        int fd = OpenFile(path, flags);

        if (fd >= 0) {
            if (out_fd) {
                *out_fd = fd;
            } else {
                CloseDescriptor(fd);
            }

            return true;
        } else {
            return false;
        }
    });
}

const char *CreateUniqueDirectory(Span<const char> directory, const char *prefix, Allocator *alloc)
{
    return CreateUniquePath(directory, prefix, "", alloc, [&](const char *path) {
        return MakeDirectory(path);
    });
}

// ------------------------------------------------------------------------
// Parsing
// ------------------------------------------------------------------------

bool ParseBool(Span<const char> str, bool *out_value, unsigned int flags, Span<const char> *out_remaining)
{
    union {
        char raw[8];
        uint64_t u;
    } u = {};
    Size end = 0;
    bool value = false;

    switch (str.len) {
        default: { K_ASSERT(str.len >= 0); } [[fallthrough]];

#if defined(K_BIG_ENDIAN)
        case 8: { u.raw[0] = LowerAscii(str[7]); } [[fallthrough]];
        case 7: { u.raw[1] = LowerAscii(str[6]); } [[fallthrough]];
        case 6: { u.raw[2] = LowerAscii(str[5]); } [[fallthrough]];
        case 5: { u.raw[3] = LowerAscii(str[4]); } [[fallthrough]];
        case 4: { u.raw[4] = LowerAscii(str[3]); } [[fallthrough]];
        case 3: { u.raw[5] = LowerAscii(str[2]); } [[fallthrough]];
        case 2: { u.raw[6] = LowerAscii(str[1]); } [[fallthrough]];
        case 1: { u.raw[7] = LowerAscii(str[0]); } [[fallthrough]];
        case 0: {} break;
#else
        case 8: { u.raw[7] = LowerAscii(str[7]); } [[fallthrough]];
        case 7: { u.raw[6] = LowerAscii(str[6]); } [[fallthrough]];
        case 6: { u.raw[5] = LowerAscii(str[5]); } [[fallthrough]];
        case 5: { u.raw[4] = LowerAscii(str[4]); } [[fallthrough]];
        case 4: { u.raw[3] = LowerAscii(str[3]); } [[fallthrough]];
        case 3: { u.raw[2] = LowerAscii(str[2]); } [[fallthrough]];
        case 2: { u.raw[1] = LowerAscii(str[1]); } [[fallthrough]];
        case 1: { u.raw[0] = LowerAscii(str[0]); } [[fallthrough]];
        case 0: {} break;
#endif
    }

#define MATCH(Wanted, Len, Value) \
        if (uint64_t masked = u.u & ((1ull << ((Len) * 8)) - 1); masked == (Wanted)) { \
            end = (Len); \
            value = (Value); \
             \
            break; \
        }

    do {
        MATCH(0x31ull, 1, true);
        MATCH(0x6E6Full, 2, true);
        MATCH(0x736579ull, 3, true);
        MATCH(0x79ull, 1, true);
        MATCH(0x65757274ull, 4, true);
        MATCH(0x30ull, 1, false);
        MATCH(0x66666Full, 3, false);
        MATCH(0x6F6Eull, 2, false);
        MATCH(0x6Eull, 1, false);
        MATCH(0x65736C6166ull, 5, false);

        if (flags & (int)ParseFlag::Log) {
            LogError("Invalid boolean value '%1'", str);
        }
        return false;
    } while (false);

#undef MATCH

    if ((flags & (int)ParseFlag::End) && end < str.len) [[unlikely]] {
        if (flags & (int)ParseFlag::Log) {
            LogError("Malformed boolean '%1'", str);
        }
        return false;
    }

    *out_value = value;
    if (out_remaining) {
        *out_remaining = str.Take(end, str.len - end);
    }
    return true;
}

bool ParseSize(Span<const char> str, int64_t *out_size, unsigned int flags, Span<const char> *out_remaining)
{
    uint64_t size = 0;
    uint64_t multiplier = 1;

    if (!ParseInt(str, &size, flags & ~(int)ParseFlag::End, &str))
        return false;
    if (size > INT64_MAX) [[unlikely]]
        goto overflow;

    if (str.len) {
        int next = 1;

        switch (str[0]) {
            case 'B': { multiplier = 1; } break;
            case 'k': { multiplier = 1000; } break;
            case 'M': { multiplier = 1000000; } break;
            case 'G': { multiplier = 1000000000; } break;
            case 'T': { multiplier = 1000000000000; } break;
            default: { next = 0; } break;
        }

        if ((flags & (int)ParseFlag::End) && str.len > next) [[unlikely]] {
            if (flags & (int)ParseFlag::Log) {
                LogError("Unknown size unit '%1'", str[0]);
            }
            return false;
        }
        str = str.Take(next, str.len - next);
    }

#if defined(__GNUC__) || defined(__clang__)
    if (__builtin_mul_overflow(size, multiplier, &size) || size > INT64_MAX) [[unlikely]]
        goto overflow;
#else
    {
        uint64_t total = size * multiplier;
        if ((size && total / size != multiplier) || total > INT64_MAX) [[unlikely]]
            goto overflow;
        size = (int64_t)total;
    }
#endif

    *out_size = (int64_t)size;
    if (out_remaining) {
        *out_remaining = str;
    }
    return true;

overflow:
    if (flags & (int)ParseFlag::Log) {
        LogError("Size value is too high");
    }
    return false;
}

bool ParseDuration(Span<const char> str, int64_t *out_duration, unsigned int flags, Span<const char> *out_remaining)
{
    int64_t duration = 0;
    int64_t multiplier = 1000;

    if (!ParseInt(str, &duration, flags & ~(int)ParseFlag::End, &str))
        return false;
    if (duration < 0) [[unlikely]] {
        LogError("Duration values must be positive");
        return false;
    }

    if (str.len) {
        int next = 1;

        switch (str[0]) {
            case 's': { multiplier = 1000; } break;
            case 'm': { multiplier = 60000; } break;
            case 'h': { multiplier = 3600000; } break;
            case 'd': { multiplier = 86400000; } break;
            default: { next = 0; } break;
        }

        if ((flags & (int)ParseFlag::End) && str.len > next) [[unlikely]] {
            if (flags & (int)ParseFlag::Log) {
                LogError("Unknown duration unit '%1'", str[0]);
            }
            return false;
        }

        str = str.Take(next, str.len - next);
    }

#if defined(__GNUC__) || defined(__clang__)
    if (__builtin_mul_overflow(duration, multiplier, &duration)) [[unlikely]]
        goto overflow;
#else
    {
        uint64_t total = duration * multiplier;
        if ((duration && total / duration != (uint64_t)multiplier) || total > INT64_MAX) [[unlikely]]
            goto overflow;
        duration = (int64_t)total;
    }
#endif

    *out_duration = duration;
    if (out_remaining) {
        *out_remaining = str;
    }
    return true;

overflow:
    if (flags & (int)ParseFlag::Log) {
        LogError("Duration value is too high");
    }
    return false;
}

// XXX: Rewrite the ugly parsing part
bool ParseDate(Span<const char> date_str, LocalDate *out_date, unsigned int flags, Span<const char> *out_remaining)
{
    LocalDate date;

    int parts[3] = {};
    int lengths[3] = {};
    Size offset = 0;
    for (int i = 0; i < 3; i++) {
        int mult = 1;
        while (offset < date_str.len) {
            char c = date_str[offset];
            int digit = c - '0';
            if ((unsigned int)digit < 10) {
                parts[i] = (parts[i] * 10) + digit;
                if (++lengths[i] > 5) [[unlikely]]
                    goto malformed;
            } else if (!lengths[i] && c == '-' && mult == 1 && i != 1) {
                mult = -1;
            } else if (i == 2 && !(flags & (int)ParseFlag::End) && c != '/' && c != '-') [[unlikely]] {
                break;
            } else if (!lengths[i] || (c != '/' && c != '-')) [[unlikely]] {
                goto malformed;
            } else {
                offset++;
                break;
            }
            offset++;
        }
        parts[i] *= mult;
    }
    if ((flags & (int)ParseFlag::End) && offset < date_str.len)
        goto malformed;

    if ((unsigned int)lengths[1] > 2) [[unlikely]]
        goto malformed;
    if ((lengths[0] > 2) == (lengths[2] > 2)) [[unlikely]] {
        if (flags & (int)ParseFlag::Log) {
            LogError("Ambiguous date string '%1'", date_str);
        }
        return false;
    } else if (lengths[2] > 2) {
        std::swap(parts[0], parts[2]);
    }
    if (parts[0] < -INT16_MAX || parts[0] > INT16_MAX || (unsigned int)parts[2] > 99) [[unlikely]]
        goto malformed;

    date.st.year = (int16_t)parts[0];
    date.st.month = (int8_t)parts[1];
    date.st.day = (int8_t)parts[2];

    if ((flags & (int)ParseFlag::Validate) && !date.IsValid()) {
        if (flags & (int)ParseFlag::Log) {
            LogError("Invalid date string '%1'", date_str);
        }
        return false;
    }

    *out_date = date;
    if (out_remaining) {
        *out_remaining = date_str.Take(offset, date_str.len - offset);
    }
    return true;

malformed:
    if (flags & (int)ParseFlag::Log) {
        LogError("Malformed date string '%1'", date_str);
    }
    return false;
}

bool ParseVersion(Span<const char> str, int parts, int multiplier,
                  int64_t *out_version, unsigned int flags, Span<const char> *out_remaining)
{
    K_ASSERT(parts >= 0 && parts < 6);

    int64_t version = 0;
    Span<const char> remain = str;

    while (remain.len && parts) {
        int component = 0;
        if (!ParseInt(remain, &component, 0, &remain)) {
            if (flags & (int)ParseFlag::Log) {
                LogError("Malformed version string '%1'", str);
            }
            return false;
        }

        version = (version * multiplier) + component;
        parts--;

        if (!remain.len || remain[0] != '.')
            break;
        remain.ptr++;
        remain.len--;
    }

    if (remain.len && (flags & (int)ParseFlag::End)) {
        if (flags & (int)ParseFlag::Log) {
            LogError("Malformed version string '%1'", str);
        }
        return false;
    }

    while (parts) {
        version *= multiplier;
        parts--;
    }

    *out_version = version;
    if (out_remaining) {
        *out_remaining = remain;
    }
    return true;
}

// ------------------------------------------------------------------------
// Random
// ------------------------------------------------------------------------

static thread_local Size rnd_remain;
static thread_local int64_t rnd_clock;
#if !defined(_WIN32)
static thread_local int64_t rnd_generation;
#endif
static thread_local uint32_t rnd_state[16];
static thread_local uint8_t rnd_buf[64];
static thread_local Size rnd_offset;

static thread_local FastRandom rng_fast;

static inline uint32_t ROTL32(uint32_t v, int n)
{
    return (v << n) | (v >> (32 - n));
}

static inline uint64_t ROTL64(uint64_t v, int n)
{
    return (v << n) | (v >> (64 - n));
}

static inline uint32_t LE32(const uint8_t *ptr)
{
    return ((uint32_t)ptr[0] << 0) |
           ((uint32_t)ptr[1] << 8) |
           ((uint32_t)ptr[2] << 16) |
           ((uint32_t)ptr[3] << 24);
}

void InitChaCha20(uint32_t state[16], const uint8_t key[32], const uint8_t iv[8], const uint8_t counter[8])
{
    static uint8_t magic[] = "expand 32-byte k";

    state[0] = LE32(magic + 0);
    state[1] = LE32(magic + 4);
    state[2] = LE32(magic + 8);
    state[3] = LE32(magic + 12);
    state[4] = LE32(key + 0);
    state[5] = LE32(key + 4);
    state[6] = LE32(key + 8);
    state[7] = LE32(key + 12);
    state[8] = LE32(key + 16);
    state[9] = LE32(key + 20);
    state[10] = LE32(key + 24);
    state[11] = LE32(key + 28);
    state[12] = counter ? LE32(counter + 0) : 0;
    state[13] = counter ? LE32(counter + 4) : 0;
    state[14] = LE32(iv + 0);
    state[15] = LE32(iv + 4);
}

void RunChaCha20(uint32_t state[16], uint8_t out_buf[64])
{
    uint32_t *out_buf32 = (uint32_t *)out_buf;

    uint32_t x[16];
    MemCpy(x, state, K_SIZE(x));

    for (Size i = 0; i < 20; i += 2) {
        x[0] += x[4];   x[12] = ROTL32(x[12] ^ x[0], 16);
        x[1] += x[5];   x[13] = ROTL32(x[13] ^ x[1], 16);
        x[2] += x[6];   x[14] = ROTL32(x[14] ^ x[2], 16);
        x[3] += x[7];   x[15] = ROTL32(x[15] ^ x[3], 16);

        x[8]  += x[12]; x[4]  = ROTL32(x[4] ^ x[8],  12);
        x[9]  += x[13]; x[5]  = ROTL32(x[5] ^ x[9],  12);
        x[10] += x[14]; x[6]  = ROTL32(x[6] ^ x[10], 12);
        x[11] += x[15]; x[7]  = ROTL32(x[7] ^ x[11], 12);

        x[0] += x[4];   x[12] = ROTL32(x[12] ^ x[0], 8);
        x[1] += x[5];   x[13] = ROTL32(x[13] ^ x[1], 8);
        x[2] += x[6];   x[14] = ROTL32(x[14] ^ x[2], 8);
        x[3] += x[7];   x[15] = ROTL32(x[15] ^ x[3], 8);

        x[8]  += x[12]; x[4]  = ROTL32(x[4] ^ x[8],  7);
        x[9]  += x[13]; x[5]  = ROTL32(x[5] ^ x[9],  7);
        x[10] += x[14]; x[6]  = ROTL32(x[6] ^ x[10], 7);
        x[11] += x[15]; x[7]  = ROTL32(x[7] ^ x[11], 7);

        x[0] += x[5];   x[15] = ROTL32(x[15] ^ x[0], 16);
        x[1] += x[6];   x[12] = ROTL32(x[12] ^ x[1], 16);
        x[2] += x[7];   x[13] = ROTL32(x[13] ^ x[2], 16);
        x[3] += x[4];   x[14] = ROTL32(x[14] ^ x[3], 16);

        x[10] += x[15]; x[5]  = ROTL32(x[5] ^ x[10], 12);
        x[11] += x[12]; x[6]  = ROTL32(x[6] ^ x[11], 12);
        x[8]  += x[13]; x[7]  = ROTL32(x[7] ^ x[8],  12);
        x[9]  += x[14]; x[4]  = ROTL32(x[4] ^ x[9],  12);

        x[0] += x[5];   x[15] = ROTL32(x[15] ^ x[0], 8);
        x[1] += x[6];   x[12] = ROTL32(x[12] ^ x[1], 8);
        x[2] += x[7];   x[13] = ROTL32(x[13] ^ x[2], 8);
        x[3] += x[4];   x[14] = ROTL32(x[14] ^ x[3], 8);

        x[10] += x[15]; x[5]  = ROTL32(x[5] ^ x[10], 7);
        x[11] += x[12]; x[6]  = ROTL32(x[6] ^ x[11], 7);
        x[8]  += x[13]; x[7]  = ROTL32(x[7] ^ x[8],  7);
        x[9]  += x[14]; x[4]  = ROTL32(x[4] ^ x[9],  7);
    }

    for (Size i = 0; i < K_LEN(x); i++) {
        out_buf32[i] = LittleEndian(x[i] + state[i]);
    }

    state[12]++;
    state[13] += !state[12];
}

void FillRandomSafe(void *out_buf, Size len)
{
    bool reseed = false;

    // Reseed every 4 megabytes, or every hour, or after a fork
    reseed |= (rnd_remain <= 0);
    reseed |= (GetMonotonicClock() - rnd_clock > 3600 * 1000);
#if !defined(_WIN32)
    reseed |= DetectFork(&rnd_generation);
#endif

    if (reseed) {
        struct { uint8_t key[32]; uint8_t iv[8]; } buf;
        MemSet(rnd_state, 0, K_SIZE(rnd_state));

#if defined(_WIN32)
        BOOL success = RtlGenRandom(&buf, K_SIZE(buf));
        K_CRITICAL(success, "RtlGenRandom() failed: %1", GetWin32ErrorString());
#elif defined(__BIONIC__) && __ANDROID_API__ < 28
restart:
        int ret = syscall(__NR_getrandom, &buf, K_SIZE(buf), 0);
        if (ret < 0) {
            K_ASSERT(errno == EINTR);
            goto restart;
        }
        K_CRITICAL(ret == K_SIZE(buf), "getrandom() returned a partially filled buffer");
#else
        int ret = getentropy(&buf, K_SIZE(buf));
        K_CRITICAL(!ret, "getentropy() failed: %1", strerror(errno));
#endif

        InitChaCha20(rnd_state, buf.key, buf.iv);
        ZeroSafe(&buf, K_SIZE(buf));

        rnd_remain = Mebibytes(4);
        rnd_clock = GetMonotonicClock();

        rnd_offset = K_SIZE(rnd_buf);
    }

    Size copy_len = std::min(K_SIZE(rnd_buf) - rnd_offset, len);
    MemCpy(out_buf, rnd_buf + rnd_offset, copy_len);
    ZeroSafe(rnd_buf + rnd_offset, copy_len);
    rnd_offset += copy_len;

    for (Size i = copy_len; i < len; i += K_SIZE(rnd_buf)) {
        RunChaCha20(rnd_state, rnd_buf);

        copy_len = std::min(K_SIZE(rnd_buf), len - i);
        MemCpy((uint8_t *)out_buf + i, rnd_buf, copy_len);
        ZeroSafe(rnd_buf, copy_len);
        rnd_offset = copy_len;
    }

    rnd_remain -= len;
}

FastRandom::FastRandom()
{
    do {
        FillRandomSafe(state, K_SIZE(state));
    } while (std::all_of(std::begin(state), std::end(state), [](uint64_t v) { return !v; }));
}

FastRandom::FastRandom(uint64_t seed)
{
    // splitmix64 generator to seed xoshiro256++, as recommended

    seed += 0x9e3779b97f4a7c15;

    for (int i = 0; i < 4; i++) {
        seed = (seed ^ (seed >> 30)) * 0xbf58476d1ce4e5b9;
        seed = (seed ^ (seed >> 27)) * 0x94d049bb133111eb;
        state[i] = seed ^ (seed >> 31);
    }
}

uint64_t FastRandom::Next()
{
    // xoshiro256++ by David Blackman and Sebastiano Vigna (vigna@acm.org)
    // Hopefully I did not screw it up :)

    uint64_t result = ROTL64(state[0] + state[3], 23) + state[0];
    uint64_t t = state[1] << 17;

    state[2] ^= state[0];
    state[3] ^= state[1];
    state[1] ^= state[2];
    state[0] ^= state[3];
    state[2] ^= t;
    state[3] = ROTL64(state[3], 45);

    return result;
}

void FastRandom::Fill(void *out_buf, Size len)
{
    for (Size i = 0; i < len; i += 8) {
        uint64_t rnd = Next();

        Size copy_len = std::min(K_SIZE(rnd), len - i);
        MemCpy((uint8_t *)out_buf + i, &rnd, copy_len);
    }
}

int FastRandom::GetInt(int min, int max)
{
    int range = max - min;

    if (range < 2) [[unlikely]] {
        K_ASSERT(range >= 1);
        return min;
    }

    unsigned int treshold = (UINT_MAX - UINT_MAX % range);

    unsigned int x;
    do {
        x = (unsigned int)Next();
    } while (x >= treshold);
    x %= range;

    return min + (int)x;
}

int64_t FastRandom::GetInt64(int64_t min, int64_t max)
{
    int64_t range = max - min;

    if (range < 2) [[unlikely]] {
        K_ASSERT(range >= 1);
        return min;
    }

    uint64_t treshold = (UINT64_MAX - UINT64_MAX % range);

    uint64_t x;
    do {
        x = (uint64_t)Next();
    } while (x >= treshold);
    x %= range;

    return min + (int64_t)x;
}

uint64_t GetRandom()
{
    return rng_fast.Next();
}

int GetRandomInt(int min, int max)
{
    return rng_fast.GetInt(min, max);
}

int64_t GetRandomInt64(int64_t min, int64_t max)
{
    return rng_fast.GetInt64(min, max);
}

// ------------------------------------------------------------------------
// Sockets
// ------------------------------------------------------------------------

#if !defined(__wasi__)

#if defined(_WIN32)

bool InitWinsock()
{
    static bool ready = false;
    static std::once_flag flag;

    std::call_once(flag, []() {
        WORD version = MAKEWORD(2, 2);
        WSADATA wsa = {};

        int ret = WSAStartup(version, &wsa);

        if (ret) {
            LogError("Failed to initialize Winsock: %1", GetWin32ErrorString(ret));
            return;
        }

        K_ASSERT(LOBYTE(wsa.wVersion) == 2 && HIBYTE(wsa.wVersion) == 2);
        atexit([]() { WSACleanup(); });

        ready = true;
    });

    return ready;
}

int CreateSocket(SocketType type, int flags)
{
    if (!InitWinsock())
        return -1;

    int family = 0;

    switch (type) {
        case SocketType::Dual:
        case SocketType::IPv6: { family = AF_INET6; } break;
        case SocketType::IPv4: { family = AF_INET; } break;
        case SocketType::Unix: { family = AF_UNIX; } break;
    }

    bool overlapped = (flags & SOCK_OVERLAPPED);
    flags &= ~SOCK_OVERLAPPED;

    SOCKET sock = WSASocketW(family, flags, 0, nullptr, 0, overlapped ? WSA_FLAG_OVERLAPPED : 0);
    if (sock == INVALID_SOCKET) {
        LogError("Failed to create IP socket: %1", GetWin32ErrorString());
        return -1;
    }
    K_DEFER_N(err_guard) { closesocket(sock); };

    int reuse = 1;
    setsockopt(sock, SOL_SOCKET, SO_REUSEADDR, (char *)&reuse, sizeof(reuse));

    if (type == SocketType::Dual || type == SocketType::IPv6) {
        int v6only = (type == SocketType::IPv6);

        if (setsockopt(sock, IPPROTO_IPV6, IPV6_V6ONLY, (const char *)&v6only, sizeof(v6only)) < 0) {
            LogError("Failed to change dual-stack socket option: %1", GetWin32ErrorString());
            return -1;
        }
    }

    err_guard.Disable();
    return (int)sock;
}

#else

int CreateSocket(SocketType type, int flags)
{
    int family = 0;

    switch (type) {
        case SocketType::Dual:
        case SocketType::IPv6: { family = AF_INET6; } break;
        case SocketType::IPv4: { family = AF_INET; } break;
        case SocketType::Unix: { family = AF_UNIX; } break;
    }

#if defined(SOCK_CLOEXEC)
    flags |= SOCK_CLOEXEC;
#endif

    int sock = socket(family, flags, 0);
    if (sock < 0) {
        LogError("Failed to create IP socket: %1", strerror(errno));
        return -1;
    }
    K_DEFER_N(err_guard) { close(sock); };

#if !defined(SOCK_CLOEXEC)
    fcntl(sock, F_SETFD, FD_CLOEXEC);
#endif

    int reuse = 1;
    setsockopt(sock, SOL_SOCKET, SO_REUSEADDR, &reuse, sizeof(reuse));

    if (type == SocketType::Dual || type == SocketType::IPv6) {
        int v6only = (type == SocketType::IPv6);

#if defined(__OpenBSD__)
        if (!v6only) {
            LogError("Dual-stack sockets are not supported on OpenBSD");
            return -1;
        }
#else
        if (setsockopt(sock, IPPROTO_IPV6, IPV6_V6ONLY, &v6only, sizeof(v6only)) < 0) {
            LogError("Failed to change dual-stack socket option: %1", strerror(errno));
            return -1;
        }
#endif
    }

    err_guard.Disable();
    return (int)sock;
}

#endif

bool BindIPSocket(int sock, SocketType type, const char *addr, int port)
{
    K_ASSERT(type == SocketType::Dual || type == SocketType::IPv4 || type == SocketType::IPv6);

    if (type == SocketType::IPv4) {
        struct sockaddr_in sa = {};

        sa.sin_family = AF_INET;
        sa.sin_port = htons((uint16_t)port);

        if (addr) {
            if (inet_pton(AF_INET, addr, &sa.sin_addr) <= 0) {
                LogError("Invalid IPv4 address '%1'", addr);
                return false;
            }
        } else {
            sa.sin_addr.s_addr = htonl(INADDR_ANY);
        }

        if (bind(sock, (struct sockaddr *)&sa, sizeof(sa)) < 0) {
#if defined(_WIN32)
            LogError("Failed to bind to '%1:%2': %3", addr ? addr : "*", port, GetWin32ErrorString());
            return false;
#else
            LogError("Failed to bind to '%1:%2': %3", addr ? addr : "*", port, strerror(errno));
            return false;
#endif
        }
    } else {
        struct sockaddr_in6 sa = {};

        sa.sin6_family = AF_INET6;
        sa.sin6_port = htons((uint16_t)port);

        if (addr) {
            if (!strchr(addr, ':')) {
                char buf[512];
                Fmt(buf, "::FFFF:%1", addr);

                if (inet_pton(AF_INET6, buf, &sa.sin6_addr) <= 0) {
                    LogError("Invalid IPv4 or IPv6 address '%1'", addr);
                    return false;
                }
            } else {
                if (inet_pton(AF_INET6, addr, &sa.sin6_addr) <= 0) {
                    LogError("Invalid IPv6 address '%1'", addr);
                    return false;
                }
            }
        } else {
            sa.sin6_addr = IN6ADDR_ANY_INIT;
        }

        if (bind(sock, (struct sockaddr *)&sa, sizeof(sa)) < 0) {
#if defined(_WIN32)
            LogError("Failed to bind to '%1:%2': %3", addr ? addr : "*", port, GetWin32ErrorString());
            return false;
#else
            LogError("Failed to bind to '%1:%2': %3", addr ? addr : "*", port, strerror(errno));
            return false;
#endif
        }
    }

    return true;
}

bool BindUnixSocket(int sock, const char *path)
{
    struct sockaddr_un sa = {};

    // Protect against abtract Unix sockets on Linux
    if (!path[0]) {
        LogError("Cannot open empty UNIX socket");
        return false;
    }

    sa.sun_family = AF_UNIX;
    if (!CopyString(path, sa.sun_path)) {
        LogError("Excessive UNIX socket path length");
        return false;
    }

#if !defined(_WIN32)
    // Remove existing socket (if any)
    {
        struct stat sb;
        if (!stat(path, &sb) && S_ISSOCK(sb.st_mode)) {
            LogDebug("Removing existing socket '%1'", path);
            unlink(path);
        }
    }
#endif

    if (bind(sock, (struct sockaddr *)&sa, sizeof(sa)) < 0) {
#if defined(_WIN32)
        LogError("Failed to bind socket to '%1': %2", path, GetWin32ErrorString());
        return false;
#else
        LogError("Failed to bind socket to '%1': %2", path, strerror(errno));
        return false;
#endif
    }

#if !defined(_WIN32)
    chmod(path, 0666);
#endif

    return true;
}

bool ConnectIPSocket(int sock, const char *addr, int port)
{
    if (strchr(addr, ':')) {
        struct sockaddr_in6 sa = {};

        sa.sin6_family = AF_INET6;
        sa.sin6_port = htons((unsigned short)port);

        if (inet_pton(AF_INET6, addr, &sa.sin6_addr) <= 0) {
            LogError("Invalid IPv6 address '%1'", addr);
            return false;
        }

        if (connect(sock, (struct sockaddr *)&sa, sizeof(sa)) < 0) {
#if defined(_WIN32)
            LogError("Failed to connect to '%1' (%2): %3", addr, port, GetWin32ErrorString());
            return false;
#else
            LogError("Failed to connect to '%1' (%2): %3", addr, port, strerror(errno));
            return false;
#endif
        }
    } else {
        struct sockaddr_in sa = {};

        sa.sin_family = AF_INET;
        sa.sin_port = htons((unsigned short)port);

        if (inet_pton(AF_INET, addr, &sa.sin_addr) <= 0) {
            LogError("Invalid IPv4 address '%1'", addr);
            return false;
        }

        if (connect(sock, (struct sockaddr *)&sa, sizeof(sa)) < 0) {
#if defined(_WIN32)
            LogError("Failed to connect to '%1' (%2): %3", addr, port, GetWin32ErrorString());
            return false;
#else
            LogError("Failed to connect to '%1' (%2): %3", addr, port, strerror(errno));
            return false;
#endif
        }
    }

    return true;
}

bool ConnectUnixSocket(int sock, const char *path)
{
    struct sockaddr_un sa = {};

    sa.sun_family = AF_UNIX;
    if (!CopyString(path, sa.sun_path)) {
        LogError("Excessive UNIX socket path length");
        return false;
    }

    if (connect(sock, (struct sockaddr *)&sa, sizeof(sa)) < 0) {
#if defined(_WIN32)
        LogError("Failed to connect to UNIX socket '%1': %2", path, GetWin32ErrorString());
        return false;
#else
        LogError("Failed to connect to UNIX socket '%1': %2", path, strerror(errno));
        return false;
#endif
    }

    return true;
}

void SetDescriptorNonBlock(int fd, bool enable)
{
#if defined(_WIN32)
    unsigned long mode = enable;
    ioctlsocket((SOCKET)fd, FIONBIO, &mode);
#else
    int flags = fcntl(fd, F_GETFL, 0);
    flags = ApplyMask(flags, O_NONBLOCK, enable);
    fcntl(fd, F_SETFL, flags);
#endif
}

void SetDescriptorRetain(int fd, bool retain)
{
#if defined(TCP_CORK)
    int flag = retain;
    setsockopt(fd, IPPROTO_TCP, TCP_CORK, &flag, sizeof(flag));
#elif defined(TCP_NOPUSH)
    int flag = retain;
    setsockopt(fd, IPPROTO_TCP, TCP_NOPUSH, &flag, sizeof(flag));

#if defined(__APPLE__)
    if (!retain) {
        send(fd, nullptr, 0, MSG_NOSIGNAL);
    }
#endif
#else
    // Nothing to see here

    (void)fd;
    (void)retain;
#endif
}

void CloseSocket(int fd)
{
    if (fd < 0)
        return;

#if defined(_WIN32)
    shutdown((SOCKET)fd, SD_BOTH);
    closesocket((SOCKET)fd);
#else
    shutdown(fd, SHUT_RDWR);
    close(fd);
#endif
}

#endif

// ------------------------------------------------------------------------
// Tasks
// ------------------------------------------------------------------------

#if !defined(__wasi__)

struct Task {
    Async *async;
    std::function<bool()> func;
};

struct WorkerData {
    AsyncPool *pool = nullptr;
    int idx;

    std::mutex queue_mutex;
    BucketList<Task> tasks;
};

class AsyncPool {
    K_DELETE_COPY(AsyncPool)

    std::mutex pool_mutex;
    std::condition_variable pending_cv;
    std::condition_variable sync_cv;

    // Manipulate with pool_mutex locked
    int refcount = 0;

    int async_count = 0;
    std::atomic_uint next_worker { 0 };
    HeapArray<WorkerData> workers;
    std::atomic_int pending_tasks { 0 };

public:
    AsyncPool(int threads, bool leak);

    int GetWorkerCount() const { return (int)workers.len; }

    void RegisterAsync();
    void UnregisterAsync();

    void AddTask(Async *async, const std::function<bool()> &func);
    void AddTask(Async *async, int worker_idx, const std::function<bool()> &func);

    void RunWorker(int worker_idx);
    void SyncOn(Async *async, Async *only);
    bool WaitOn(Async *async, int timeout);

    void RunTasks(int worker_idx, Async *only);
    void RunTask(Task *task);
};

// thread_local breaks down on MinGW when destructors are involved, work
// around this with heap allocation.
static thread_local AsyncPool *async_default_pool = nullptr;
static thread_local AsyncPool *async_running_pool = nullptr;
static thread_local int async_running_worker_idx;
static thread_local bool async_running_task = false;

Async::Async(int threads, unsigned int flags)
{
    K_ASSERT(threads);

    if (threads > 0) {
        pool = new AsyncPool(threads, false);
    } else if (async_running_pool) {
        pool = async_running_pool;
    } else {
        if (!async_default_pool) {
            // NOTE: We're leaking one AsyncPool each time a non-worker thread uses Async()
            // for the first time. That's only one leak in most cases, when the main thread
            // is the only non-worker thread using Async, but still. Something to keep in mind.

            threads = GetCoreCount();
            async_default_pool = new AsyncPool(threads, true);
        }

        pool = async_default_pool;
    }

    pool->RegisterAsync();

    if (flags & (int)AsyncFlag::Selfish) {
        only = this;
    }
}

Async::Async(Async *parent, unsigned int flags)
{
    K_ASSERT(parent);

    pool = parent->pool;
    pool->RegisterAsync();

    if (flags & (int)AsyncFlag::Selfish) {
        only = this;
    }
}

Async::~Async()
{
    success = false;
    Sync();

    pool->UnregisterAsync();
}

void Async::Run(const std::function<bool()> &func)
{
    pool->AddTask(this, func);
}

void Async::Run(int worker, const std::function<bool()> &func)
{
    pool->AddTask(this, worker, func);
}

bool Async::Sync()
{
    pool->SyncOn(this, only);
    return success;
}

bool Async::Wait(int timeout)
{
    return pool->WaitOn(this, timeout);
}

int Async::GetWorkerCount()
{
    return pool->GetWorkerCount();
}

bool Async::IsTaskRunning()
{
    return async_running_task;
}

int Async::GetWorkerIdx()
{
    return async_running_worker_idx;
}

AsyncPool::AsyncPool(int threads, bool leak)
{
    if (threads > K_ASYNC_MAX_THREADS) {
        LogError("Async cannot use more than %1 threads", K_ASYNC_MAX_THREADS);
        threads = K_ASYNC_MAX_THREADS;
    }

    // The first queue is for the main thread
    workers.AppendDefault(threads);

    refcount = leak;
}

#if defined(_WIN32)

static DWORD WINAPI RunWorkerWin32(void *udata)
{
    WorkerData *worker = (WorkerData *)udata;
    worker->pool->RunWorker(worker->idx);
    return 0;
}

#else

static void *RunWorkerPthread(void *udata)
{
    WorkerData *worker = (WorkerData *)udata;
    worker->pool->RunWorker(worker->idx);
    return nullptr;
}

#endif

void AsyncPool::RegisterAsync()
{
    std::lock_guard<std::mutex> lock_pool(pool_mutex);

    if (!async_count++) {
        for (int i = 1; i < workers.len; i++) {
            WorkerData *worker = &workers[i];

            if (!worker->pool) {
                worker->pool = this;
                worker->idx = i;

#if defined(_WIN32)
                // Our worker threads may exit after main() has returned (or exit has been called),
                // which can trigger crashes in _Cnd_do_broadcast_at_thread_exit() because it
                // tries to dereference destroyed stuff. It turns out that std::thread calls this
                // function, and we don't want that, so avoid std::thread on Windows.
                HANDLE h = CreateThread(nullptr, 0, RunWorkerWin32, worker, 0, nullptr);
                if (!h) [[unlikely]] {
                    LogError("Failed to create worker thread: %1", GetWin32ErrorString());

                    worker->pool = nullptr;
                    return;
                }

                CloseHandle(h);
#else
                pthread_t thread;
                int ret = pthread_create(&thread, nullptr, RunWorkerPthread, worker);
                if (ret) [[unlikely]] {
                    LogError("Failed to create worker thread: %1", strerror(ret));

                    worker->pool = nullptr;
                    return;
                }

                pthread_detach(thread);
#endif

                refcount++;
            }
        }
    }
}

void AsyncPool::UnregisterAsync()
{
    std::lock_guard<std::mutex> lock_pool(pool_mutex);
    async_count--;
}

void AsyncPool::AddTask(Async *async, const std::function<bool()> &func)
{
    if (async_running_pool != this) {
        int worker_idx = (next_worker++ % (int)workers.len);
        AddTask(async, worker_idx, func);
    } else {
        AddTask(async, async_running_worker_idx, func);
    }
}

void AsyncPool::AddTask(Async *async, int worker_idx, const std::function<bool()> &func)
{
    WorkerData *worker = &workers[worker_idx];

    // Add the task damn it
    {
        std::lock_guard<std::mutex> lock_queue(worker->queue_mutex);
        worker->tasks.Append({ async, func });
    }

    async->remaining_tasks++;

    int prev_pending = pending_tasks++;

    if (prev_pending >= K_ASYNC_MAX_PENDING_TASKS) {
        int worker_idx = async_running_worker_idx;

        do {
            RunTasks(worker_idx, async->only);
        } while (pending_tasks >= K_ASYNC_MAX_PENDING_TASKS);
    } else if (!prev_pending) {
        std::lock_guard<std::mutex> lock_pool(pool_mutex);

        pending_cv.notify_all();
        sync_cv.notify_all();
    }
}

void AsyncPool::RunWorker(int worker_idx)
{
    async_running_pool = this;
    async_running_worker_idx = worker_idx;

    std::unique_lock<std::mutex> lock_pool(pool_mutex);

    while (async_count) {
        lock_pool.unlock();
        RunTasks(worker_idx, nullptr);
        lock_pool.lock();

        std::chrono::duration<int, std::milli> duration(K_ASYNC_MAX_IDLE_TIME); // Thanks C++
        pending_cv.wait_for(lock_pool, duration, [&]() { return !!pending_tasks; });
    }

    workers[worker_idx].pool = nullptr;

    if (!--refcount) {
        lock_pool.unlock();
        delete this;
    }
}

void AsyncPool::SyncOn(Async *async, Async *only)
{
    K_DEFER_C(pool = async_running_pool,
               worker_idx = async_running_worker_idx) {
        async_running_pool = pool;
        async_running_worker_idx = worker_idx;
    };

    async_running_pool = this;
    async_running_worker_idx = 0;

    while (async->remaining_tasks) {
        RunTasks(0, only);

        std::unique_lock<std::mutex> lock_sync(pool_mutex);
        sync_cv.wait(lock_sync, [&]() { return pending_tasks || !async->remaining_tasks; });
    }
}

bool AsyncPool::WaitOn(Async *async, int timeout)
{
    std::unique_lock<std::mutex> lock_sync(pool_mutex);

    if (timeout >= 0) {
        std::chrono::milliseconds delay(timeout);
        bool done = sync_cv.wait_for(lock_sync, delay, [&]() { return !async->remaining_tasks; });
        return done;
    } else {
        sync_cv.wait(lock_sync, [&]() { return !async->remaining_tasks; });
        return true;
    }
}

void AsyncPool::RunTasks(int worker_idx, Async *only)
{
    // The '12' factor is pretty arbitrary, don't try to find meaning there
    for (int i = 0; i < workers.len * 12; i++) {
        WorkerData *worker = &workers[worker_idx];
        std::unique_lock<std::mutex> lock_queue(worker->queue_mutex, std::try_to_lock);

        if (lock_queue.owns_lock()) {
            Size idx = 0;

            if (only) {
                for (const Task &task: worker->tasks) {
                    if (task.async == only) {
                        std::swap(worker->tasks[0], worker->tasks[idx]);
                        break;
                    }
                    idx++;
                }
            }

            if (idx < worker->tasks.count) {
                Task task = std::move(worker->tasks[0]);

                worker->tasks.RemoveFirst();
                worker->tasks.Trim();

                lock_queue.unlock();

                RunTask(&task);
                continue;
            }
        }

        worker_idx = GetRandomInt(0, (int)workers.len);
    }
}

void AsyncPool::RunTask(Task *task)
{
    Async *async = task->async;

    K_DEFER_C(running = async_running_task) { async_running_task = running; };
    async_running_task = true;

    pending_tasks--;

    if (!task->func()) {
        async->success = false;
    }

    if (!--async->remaining_tasks) {
        std::lock_guard<std::mutex> lock_sync(pool_mutex);
        sync_cv.notify_all();
    }
}

#else


Async::Async(int threads, unsigned int)
{
    K_ASSERT(threads);
}

Async::Async(Async *parent, unsigned int)
{
    K_ASSERT(parent);
}

Async::~Async()
{
    // Nothing to do
}

void Async::Run(const std::function<bool()> &func)
{
    success &= !!func();
}

void Async::Run(int, const std::function<bool()> &func)
{
    success &= !!func();
}

bool Async::Sync()
{
    return success;
}

bool Async::IsTaskRunning()
{
    return false;
}

int Async::GetWorkerIdx()
{
    return 0;
}

int Async::GetWorkerCount()
{
    return 1;
}

#endif

// ------------------------------------------------------------------------
// Streams
// ------------------------------------------------------------------------

static NoDestroy<StreamReader> StdInStream(STDIN_FILENO, "<stdin>");
static NoDestroy<StreamWriter> StdOutStream(STDOUT_FILENO, "<stdout>", (int)StreamWriterFlag::LineBuffer);
static NoDestroy<StreamWriter> StdErrStream(STDERR_FILENO, "<stderr>", (int)StreamWriterFlag::LineBuffer);

extern StreamReader *const StdIn = StdInStream.Get();
extern StreamWriter *const StdOut = StdOutStream.Get();
extern StreamWriter *const StdErr = StdErrStream.Get();

static CreateDecompressorFunc *DecompressorFunctions[K_LEN(CompressionTypeNames)];
static CreateCompressorFunc *CompressorFunctions[K_LEN(CompressionTypeNames)];

K_EXIT(FlushStd)
{
    StdOut->Flush();
    StdErr->Flush();
}

void StreamReader::SetDecoder(StreamDecoder *decoder)
{
    K_ASSERT(decoder);
    K_ASSERT(!filename);
    K_ASSERT(!this->decoder);

    this->decoder = decoder;
}

bool StreamReader::Open(Span<const uint8_t> buf, const char *filename, CompressionType compression_type)
{
    Close(true);

    K_DEFER_N(err_guard) { error = true; };

    error = false;
    raw_read = 0;
    read_total = 0;
    read_max = -1;

    K_ASSERT(filename);
    this->filename = DuplicateString(filename, &str_alloc).ptr;

    source.type = SourceType::Memory;
    source.u.memory.buf = buf;
    source.u.memory.pos = 0;

    if (!InitDecompressor(compression_type))
        return false;

    err_guard.Disable();
    return true;
}

bool StreamReader::Open(int fd, const char *filename, CompressionType compression_type)
{
    Close(true);

    K_DEFER_N(err_guard) { error = true; };

    error = false;
    raw_read = 0;
    read_total = 0;
    read_max = -1;

    K_ASSERT(fd >= 0);
    K_ASSERT(filename);
    this->filename = DuplicateString(filename, &str_alloc).ptr;

    source.type = SourceType::File;
    source.u.file.fd = fd;
    source.u.file.owned = false;

    if (!InitDecompressor(compression_type))
        return false;

    err_guard.Disable();
    return true;
}

OpenResult StreamReader::Open(const char *filename, CompressionType compression_type)
{
    Close(true);

    K_DEFER_N(err_guard) { error = true; };

    error = false;
    raw_read = 0;
    read_total = 0;
    read_max = -1;

    K_ASSERT(filename);
    this->filename = DuplicateString(filename, &str_alloc).ptr;

    source.type = SourceType::File;
    {
        OpenResult ret = OpenFile(filename, (int)OpenFlag::Read, &source.u.file.fd);
        if (ret != OpenResult::Success)
            return ret;
    }
    source.u.file.owned = true;

    if (!InitDecompressor(compression_type))
        return OpenResult::OtherError;

    err_guard.Disable();
    return OpenResult::Success;
}

bool StreamReader::Open(const std::function<Size(Span<uint8_t>)> &func, const char *filename, CompressionType compression_type)
{
    Close(true);

    K_DEFER_N(err_guard) { error = true; };

    error = false;
    raw_read = 0;
    read_total = 0;
    read_max = -1;

    K_ASSERT(filename);
    this->filename = DuplicateString(filename, &str_alloc).ptr;

    source.type = SourceType::Function;
    new (&source.u.func) std::function<Size(Span<uint8_t>)>(func);

    if (!InitDecompressor(compression_type))
        return false;

    err_guard.Disable();
    return true;
}

bool StreamReader::Close(bool implicit)
{
    K_ASSERT(implicit || this != StdIn);

    if (decoder) {
        delete decoder;
        decoder = nullptr;
    }

    switch (source.type) {
        case SourceType::Memory: { source.u.memory = {}; } break;
        case SourceType::File: {
            if (source.u.file.owned && source.u.file.fd >= 0) {
                CloseDescriptor(source.u.file.fd);
            }

            source.u.file.fd = -1;
            source.u.file.owned = false;
        } break;
        case SourceType::Function: { source.u.func.~function(); } break;
    }

    bool ret = !filename || !error;

    filename = nullptr;
    error = true;
    source.type = SourceType::Memory;
    source.eof = false;
    eof = false;
    raw_len = -1;
    str_alloc.Reset();

    return ret;
}

bool StreamReader::Rewind()
{
    if (error) [[unlikely]]
        return false;

    if (decoder) [[unlikely]] {
        LogError("Cannot rewind stream with decoder");
        return false;
    }

    switch (source.type) {
        case SourceType::Memory: { source.u.memory.pos = 0; } break;
        case SourceType::File: {
            if (lseek(source.u.file.fd, 0, SEEK_SET) < 0) {
                LogError("Failed to rewind '%1': %2", filename, strerror(errno));
                error = true;
                return false;
            }
        } break;
        case SourceType::Function: {
            LogError("Cannot rewind stream '%1'", filename);
            error = true;
            return false;
        } break;
    }

    source.eof = false;
    raw_len = -1;
    raw_read = 0;
    eof = false;

    return true;
}

int StreamReader::GetDescriptor() const
{
    K_ASSERT(source.type == SourceType::File);
    return source.u.file.fd;
}

void StreamReader::SetDescriptorOwned(bool owned)
{
    K_ASSERT(source.type == SourceType::File);
    source.u.file.owned = owned;
}

Size StreamReader::Read(Span<uint8_t> out_buf)
{
#if !defined(__wasm__)
    std::lock_guard<std::mutex> lock(mutex);
#endif

    if (error) [[unlikely]]
        return -1;

    Size len = 0;

    if (decoder) {
        len = decoder->Read(out_buf.len, out_buf.ptr);
        if (len < 0) [[unlikely]] {
            error = true;
            return -1;
        }
    } else {
        len = ReadRaw(out_buf.len, out_buf.ptr);
        if (len < 0) [[unlikely]]
            return -1;
        eof = source.eof;
    }

    if (!error && read_max >= 0 && len > read_max - read_total) [[unlikely]] {
        LogError("Exceeded max stream size of %1", FmtDiskSize(read_max));
        error = true;
        return -1;
    }

    read_total += len;
    return len;
}

Size StreamReader::ReadFill(Span<uint8_t> out_buf)
{
#if !defined(__wasm__)
    std::lock_guard<std::mutex> lock(mutex);
#endif

    if (error) [[unlikely]]
        return -1;

    Size read_len = 0;

    while (out_buf.len) {
        Size len = 0;

        if (decoder) {
            len = decoder->Read(out_buf.len, out_buf.ptr);
            if (len < 0) [[unlikely]] {
                error = true;
                return -1;
            }
        } else {
            len = ReadRaw(out_buf.len, out_buf.ptr);
            if (len < 0) [[unlikely]]
                return -1;
            eof = source.eof;
        }

        out_buf.ptr += len;
        out_buf.len -= len;
        read_len += len;

        if (!error && read_max >= 0 && read_len > read_max - read_total) [[unlikely]] {
            LogError("Exceeded max stream size of %1", FmtDiskSize(read_max));
            error = true;
            return -1;
        }

        if (eof)
            break;
    }

    read_total += read_len;
    return read_len;
}

Size StreamReader::ReadAll(Size max_len, HeapArray<uint8_t> *out_buf)
{
    if (error) [[unlikely]]
        return -1;

    K_DEFER_NC(buf_guard, buf_len = out_buf->len) { out_buf->RemoveFrom(buf_len); };

    // Check virtual memory limits
    {
        Size memory_max = K_SIZE_MAX - out_buf->len - 1;

        if (memory_max <= 0) [[unlikely]] {
            LogError("Exhausted memory limit reading file '%1'", filename);
            return -1;
        }

        K_ASSERT(max_len);
        max_len = (max_len >= 0) ? std::min(max_len, memory_max) : memory_max;
    }

    // For some files (such as in /proc), the file size is reported as 0 even though there
    // is content inside, because these files are generated on demand. So we need to take
    // the slow path for apparently empty files.
    if (!decoder && ComputeRawLen() > 0) {
        if (raw_len > max_len) {
            LogError("File '%1' is too large (limit = %2)", filename, FmtDiskSize(max_len));
            return -1;
        }

        // Count one trailing byte (if possible) to avoid reallocation for users
        // who need/want to append a NUL character.
        out_buf->Grow((Size)raw_len + 1);

        Size read_len = ReadFill(out_buf->TakeAvailable());
        if (read_len < 0)
            return -1;
        out_buf->len += (Size)std::min(raw_len, (int64_t)read_len);

        buf_guard.Disable();
        return read_len;
    } else {
        Size total_len = 0;

        while (!eof) {
            Size grow = std::min(total_len ? Megabytes(1) : Kibibytes(64), K_SIZE_MAX - out_buf->len);
            out_buf->Grow(grow);

            Size read_len = Read(out_buf->TakeAvailable());
            if (read_len < 0)
                return -1;

            if (read_len > max_len - total_len) [[unlikely]] {
                LogError("File '%1' is too large (limit = %2)", filename, FmtDiskSize(max_len));
                return -1;
            }

            total_len += read_len;
            out_buf->len += read_len;
        }

        buf_guard.Disable();
        return total_len;
    }
}

int64_t StreamReader::ComputeRawLen()
{
    if (error) [[unlikely]]
        return -1;
    if (raw_read || raw_len >= 0)
        return raw_len;

    switch (source.type) {
        case SourceType::Memory: {
            raw_len = source.u.memory.buf.len;
        } break;

        case SourceType::File: {
#if defined(_WIN32)
            struct __stat64 sb;
            if (_fstat64(source.u.file.fd, &sb) < 0)
                return -1;
            raw_len = (int64_t)sb.st_size;
#else
            struct stat sb;
            if (fstat(source.u.file.fd, &sb) < 0 || S_ISFIFO(sb.st_mode) | S_ISSOCK(sb.st_mode))
                return -1;
            raw_len = (int64_t)sb.st_size;
#endif
        } break;

        case SourceType::Function: {
            return -1;
        } break;
    }

    return raw_len;
}

bool StreamReader::InitDecompressor(CompressionType type)
{
    if (type != CompressionType::None) {
        CreateDecompressorFunc *func = DecompressorFunctions[(int)type];

        if (!func) {
            LogError("%1 decompression is not available for '%2'", CompressionTypeNames[(int)type], filename);
            error = true;
            return false;
        }

        decoder = func(this, type);
        K_ASSERT(decoder);
    }

    return true;
}

Size StreamReader::ReadRaw(Size max_len, void *out_buf)
{
    ComputeRawLen();

    Size read_len = 0;
    switch (source.type) {
        case SourceType::Memory: {
            read_len = source.u.memory.buf.len - source.u.memory.pos;
            if (read_len > max_len) {
                read_len = max_len;
            }
            MemCpy(out_buf, source.u.memory.buf.ptr + source.u.memory.pos, read_len);
            source.u.memory.pos += read_len;
            source.eof = (source.u.memory.pos >= source.u.memory.buf.len);
        } break;

        case SourceType::File: {
#if defined(_WIN32)
            max_len = std::min(max_len, (Size)UINT_MAX);
            read_len = _read(source.u.file.fd, out_buf, (unsigned int)max_len);
#else
            read_len = K_RESTART_EINTR(read(source.u.file.fd, out_buf, (size_t)max_len), < 0);
#endif
            if (read_len < 0) {
                LogError("Error while reading file '%1': %2", filename, strerror(errno));
                error = true;
                return -1;
            }
            source.eof = (read_len == 0);
        } break;

        case SourceType::Function: {
            read_len = source.u.func(MakeSpan((uint8_t *)out_buf, max_len));
            if (read_len < 0) {
                error = true;
                return -1;
            }
            source.eof = (read_len == 0);
        } break;
    }

    raw_read += read_len;
    return read_len;
}

StreamDecompressorHelper::StreamDecompressorHelper(CompressionType compression_type, CreateDecompressorFunc *func)
{
    K_ASSERT(!DecompressorFunctions[(int)compression_type]);
    DecompressorFunctions[(int)compression_type] = func;
}

// XXX: Maximum line length
bool LineReader::Next(Span<char> *out_line)
{
    if (eof) {
        line_number = 0;
        return false;
    }
    if (error) [[unlikely]]
        return false;

    for (;;) {
        if (!view.len) {
            buf.Grow(K_LINE_READER_STEP_SIZE + 1);

            Span<char> available = MakeSpan(buf.end(), K_LINE_READER_STEP_SIZE);

            Size read_len = st->Read(available);
            if (read_len < 0) {
                error = true;
                return false;
            }
            buf.len += read_len;
            eof = !read_len;

            view = buf;
        }

        line = SplitStrLine(view, &view);
        if (view.len || eof) {
            line.ptr[line.len] = 0;
            line_number++;
            *out_line = line;
            return true;
        }

        buf.len = view.ptr - line.ptr;
        MemMove(buf.ptr, line.ptr, buf.len);
    }
}

void LineReader::PushLogFilter()
{
    K::PushLogFilter([this](LogLevel level, const char *, const char *msg, FunctionRef<LogFunc> func) {
        char ctx[1024];

        if (line_number > 0) {
            Fmt(ctx, "%1(%2): ", st->GetFileName(), line_number);
        } else {
            Fmt(ctx, "%1: ", st->GetFileName());
        }

        func(level, ctx, msg);
    });
}

void StreamWriter::SetEncoder(StreamEncoder *encoder)
{
    K_ASSERT(encoder);
    K_ASSERT(!filename);
    K_ASSERT(!this->encoder);

    this->encoder = encoder;
}

bool StreamWriter::Open(HeapArray<uint8_t> *mem, const char *filename, unsigned int,
                        CompressionType compression_type, CompressionSpeed compression_speed)
{
    Close(true);

    K_DEFER_N(err_guard) { error = true; };
    error = false;
    raw_written = 0;

    K_ASSERT(filename);
    this->filename = DuplicateString(filename, &str_alloc).ptr;

    dest.type = DestinationType::Memory;
    dest.u.mem.memory = mem;
    dest.u.mem.start = mem->len;
    dest.vt100 = false;

    if (!InitCompressor(compression_type, compression_speed))
        return false;

    err_guard.Disable();
    return true;
}

bool StreamWriter::Open(int fd, const char *filename, unsigned int flags,
                        CompressionType compression_type, CompressionSpeed compression_speed)
{
    Close(true);

    K_DEFER_N(err_guard) { error = true; };
    error = false;
    raw_written = 0;

    K_ASSERT(fd >= 0);
    K_ASSERT(filename);
    this->filename = DuplicateString(filename, &str_alloc).ptr;

    InitFile(flags);

    dest.u.file.fd = fd;
    dest.vt100 = FileIsVt100(fd);

    if (!InitCompressor(compression_type, compression_speed))
        return false;

    err_guard.Disable();
    return true;
}

bool StreamWriter::Open(const char *filename, unsigned int flags,
                        CompressionType compression_type, CompressionSpeed compression_speed)
{
    Close(true);

    K_DEFER_N(err_guard) { error = true; };
    error = false;
    raw_written = 0;

    K_ASSERT(filename);
    this->filename = DuplicateString(filename, &str_alloc).ptr;

    InitFile(flags);

    dest.u.file.atomic = (flags & (int)StreamWriterFlag::Atomic);
    dest.u.file.exclusive = (flags & (int)StreamWriterFlag::Exclusive);

    if (dest.u.file.atomic) {
        Span<const char> directory = GetPathDirectory(filename);

        if (dest.u.file.exclusive) {
            int fd = OpenFile(filename, (int)OpenFlag::Write | (int)OpenFlag::Exclusive);
            if (fd < 0)
                return false;
            CloseDescriptor(fd);

            dest.u.file.unlink_on_error = true;
        }

#if defined(O_TMPFILE)
        {
            static bool has_proc = !access("/proc/self/fd", X_OK);

            if (has_proc) {
                const char *dirname = DuplicateString(directory, &str_alloc).ptr;
                dest.u.file.fd = K_RESTART_EINTR(open(dirname, O_WRONLY | O_TMPFILE | O_CLOEXEC, 0644), < 0);

                if (dest.u.file.fd >= 0) {
                    dest.u.file.owned = true;
                } else if (errno != EINVAL && errno != EOPNOTSUPP) {
                    LogError("Cannot open temporary file in '%1': %2", directory, strerror(errno));
                    return false;
                }
            }
        }
#endif

        if (!dest.u.file.owned) {
            const char *basename = SplitStrReverseAny(filename, K_PATH_SEPARATORS).ptr;

            dest.u.file.tmp_filename = CreateUniqueFile(directory, basename, ".tmp", &str_alloc, &dest.u.file.fd);
            if (!dest.u.file.tmp_filename)
                return false;
            dest.u.file.owned = true;
        }
    } else {
        unsigned int open_flags = (int)OpenFlag::Write;
        open_flags |= dest.u.file.exclusive ? (int)OpenFlag::Exclusive : 0;

        dest.u.file.fd = OpenFile(filename, open_flags);
        if (dest.u.file.fd < 0)
            return false;
        dest.u.file.owned = true;

        dest.u.file.unlink_on_error = dest.u.file.exclusive;
    }
    dest.vt100 = FileIsVt100(dest.u.file.fd);

    if (!InitCompressor(compression_type, compression_speed))
        return false;

    err_guard.Disable();
    return true;
}

bool StreamWriter::Open(const std::function<bool(Span<const uint8_t>)> &func, const char *filename, unsigned int,
                        CompressionType compression_type, CompressionSpeed compression_speed)
{
    Close(true);

    K_DEFER_N(err_guard) { error = true; };
    error = false;
    raw_written = 0;

    K_ASSERT(filename);
    this->filename = DuplicateString(filename, &str_alloc).ptr;

    dest.type = DestinationType::Function;
    new (&dest.u.func) std::function<bool(Span<const uint8_t>)>(func);
    dest.vt100 = false;

    if (!InitCompressor(compression_type, compression_speed))
        return false;

    err_guard.Disable();
    return true;
}

bool StreamWriter::Rewind()
{
    if (error) [[unlikely]]
        return false;

    if (encoder) [[unlikely]] {
        LogError("Cannot rewind stream with encoder");
        return false;
    }

    switch (dest.type) {
        case DestinationType::Memory: { dest.u.mem.memory->RemoveFrom(dest.u.mem.start); } break;

        case DestinationType::LineFile:
        case DestinationType::BufferedFile:
        case DestinationType::DirectFile: {
            if (lseek(dest.u.file.fd, 0, SEEK_SET) < 0) {
                LogError("Failed to rewind '%1': %2", filename, strerror(errno));
                error = true;
                return false;
            }

#if defined(_WIN32)
            HANDLE h = (HANDLE)_get_osfhandle(dest.u.file.fd);

            if (!SetEndOfFile(h)) {
                LogError("Failed to truncate '%1': %2", filename, GetWin32ErrorString());
                error = true;
                return false;
            }
#else
            if (ftruncate(dest.u.file.fd, 0) < 0) {
                LogError("Failed to truncate '%1': %2", filename, strerror(errno));
                error = true;
                return false;
            }
#endif

            dest.u.file.buf_used = 0;
        } break;

        case DestinationType::Function: {
            LogError("Cannot rewind stream '%1'", filename);
            error = true;
            return false;
        } break;
    }

    raw_written = 0;

    return true;
}

bool StreamWriter::Flush()
{
#if !defined(__wasm__)
    std::lock_guard<std::mutex> lock(mutex);
#endif

    if (error) [[unlikely]]
        return false;

    switch (dest.type) {
        case DestinationType::Memory: return true;

        case DestinationType::LineFile:
        case DestinationType::BufferedFile: {
            if (!FlushBuffer())
                return false;
        } [[fallthrough]];
        case DestinationType::DirectFile: {
            if (!FlushFile(dest.u.file.fd, filename)) {
                error = true;
                return false;
            }

            return true;
        } break;

        case DestinationType::Function: return true;
    }

    K_UNREACHABLE();
}

int StreamWriter::GetDescriptor() const
{
    K_ASSERT(dest.type == DestinationType::BufferedFile ||
              dest.type == DestinationType::LineFile ||
              dest.type == DestinationType::DirectFile);

    return dest.u.file.fd;
}

void StreamWriter::SetDescriptorOwned(bool owned)
{
    K_ASSERT(dest.type == DestinationType::BufferedFile ||
              dest.type == DestinationType::LineFile ||
              dest.type == DestinationType::DirectFile);

    dest.u.file.owned = owned;
}

bool StreamWriter::Write(Span<const uint8_t> buf)
{
#if !defined(__wasm__)
    std::lock_guard<std::mutex> lock(mutex);
#endif

    if (error) [[unlikely]]
        return false;

    if (encoder) {
        error |= !encoder->Write(buf);
        return !error;
    } else {
        return WriteRaw(buf);
    }
}

bool StreamWriter::Close(bool implicit)
{
    K_ASSERT(implicit || this != StdOut);
    K_ASSERT(implicit || this != StdErr);

    if (encoder) {
        error = error || !encoder->Finalize();

        delete encoder;
        encoder = nullptr;
    }

    switch (dest.type) {
        case DestinationType::Memory: { dest.u.mem = {}; } break;

        case DestinationType::BufferedFile:
        case DestinationType::LineFile: {
            if (IsValid()) {
                FlushBuffer();
            }
        } [[fallthrough]];
        case DestinationType::DirectFile: {
            if (dest.u.file.atomic) {
                if (IsValid()) {
                    if (implicit) {
                        LogDebug("Deleting implicitly closed file '%1'", filename);
                        error = true;
                    } else if (!FlushFile(dest.u.file.fd, filename)) {
                        error = true;
                    }
                }

                if (IsValid()) {
#if defined(O_TMPFILE)
                    if (!dest.u.file.tmp_filename) {
                        bool linked = false;

                        // AT_EMPTY_PATH requires CAP_DAC_READ_SEARCH so use the /proc trick instead.
                        // Will revisit once this restriction is lifted (if ever).
                        char proc[256];
                        Fmt(proc, "/proc/self/fd/%1", dest.u.file.fd);

                        for (int i = 0; i < 10; i++) {
                            if (linkat(AT_FDCWD, proc, AT_FDCWD, filename, AT_SYMLINK_FOLLOW) < 0) {
                                if (errno == EEXIST) {
                                    unlink(filename);
                                    continue;
                                }

                                LogError("Failed to materialize file '%1': %2", filename, strerror(errno));
                                return false;
                            }

                            linked = true;
                            break;
                        }

                        // The linkat() call cannot overwrite an existing file. We try to unlink() the file if
                        // needed several times (see loop above) to make it work but it it still doesn't, link to
                        // a temporary file and let RenameFile() handle the final step. Should be rare!
                        if (!linked) {
                            Span<const char> directory = GetPathDirectory(filename);
                            const char *basename = SplitStrReverseAny(filename, K_PATH_SEPARATORS).ptr;

                            dest.u.file.tmp_filename = CreateUniquePath(directory, basename, ".tmp", &str_alloc, [&](const char *path) {
                                return !linkat(AT_FDCWD, proc, AT_FDCWD, path, AT_SYMLINK_FOLLOW);
                            });
                            if (!dest.u.file.tmp_filename) {
                                LogError("Failed to materialize file '%1': %2", filename, strerror(errno));
                                error = true;
                            }
                        }
                    }
#endif

                    if (dest.u.file.owned) {
                        CloseDescriptor(dest.u.file.fd);
                        dest.u.file.owned = false;
                    }

                    if (dest.u.file.tmp_filename) {
                        unsigned int flags = (int)RenameFlag::Overwrite | (int)RenameFlag::Sync;

                        if (RenameFile(dest.u.file.tmp_filename, filename, flags) == RenameResult::Success) {
                            dest.u.file.tmp_filename = nullptr;
                        } else {
                            error = true;
                        }
                    }
                } else {
                    error = true;
                }
            }

            if (dest.u.file.owned) {
                CloseDescriptor(dest.u.file.fd);
                dest.u.file.owned = false;
            }

            // Try to clean up, though we can't do much if that fails (except log error)
            if (dest.u.file.tmp_filename) {
                UnlinkFile(dest.u.file.tmp_filename);
            }
            if (error && dest.u.file.unlink_on_error) {
                UnlinkFile(filename);
            }

            MemSet(&dest.u.file, 0, K_SIZE(dest.u.file));
        } break;

        case DestinationType::Function: {
            error |= IsValid() && !dest.u.func({});
            dest.u.func.~function();
        } break;
    }

    bool ret = !filename || !error;

    filename = nullptr;
    error = true;
    dest.type = DestinationType::Memory;
    str_alloc.Reset();

    return ret;
}

void StreamWriter::InitFile(unsigned int flags)
{
    bool direct = (flags & (int)StreamWriterFlag::NoBuffer);
    bool line = (flags & (int)StreamWriterFlag::LineBuffer);

    K_ASSERT(!direct || !line);

    MemSet(&dest.u.file, 0, K_SIZE(dest.u.file));

    if (direct) {
        dest.type = DestinationType::DirectFile;
    } else if (line) {
        dest.type = DestinationType::LineFile;
        dest.u.file.buf = AllocateSpan<uint8_t>(&str_alloc, Kibibytes(4));
    } else {
        dest.type = DestinationType::BufferedFile;
        dest.u.file.buf = AllocateSpan<uint8_t>(&str_alloc, Kibibytes(4));
    }
}

bool StreamWriter::FlushBuffer()
{
    K_ASSERT(!error);
    K_ASSERT(dest.type == DestinationType::BufferedFile ||
              dest.type == DestinationType::LineFile);

    while (dest.u.file.buf_used) {
#if defined(_WIN32)
        Size write_len = _write(dest.u.file.fd, dest.u.file.buf.ptr, (unsigned int)dest.u.file.buf_used);
#else
        Size write_len = K_RESTART_EINTR(write(dest.u.file.fd, dest.u.file.buf.ptr, (size_t)dest.u.file.buf_used), < 0);
#endif

        if (write_len < 0) {
            LogError("Failed to write to '%1': %2", filename, strerror(errno));
            error = true;
            return false;
        }

        Size move_len = dest.u.file.buf_used - write_len;
        MemMove(dest.u.file.buf.ptr, dest.u.file.buf.ptr + write_len, move_len);
        dest.u.file.buf_used -= write_len;

        raw_written += write_len;
    }

    return true;
}

bool StreamWriter::InitCompressor(CompressionType type, CompressionSpeed speed)
{
    if (type != CompressionType::None) {
        CreateCompressorFunc *func = CompressorFunctions[(int)type];

        if (!func) {
            LogError("%1 compression is not available for '%2'", CompressionTypeNames[(int)type], filename);
            error = true;
            return false;
        }

        encoder = func(this, type, speed);
        K_ASSERT(encoder);
    }

    return true;
}

#if defined(_WIN32) || defined(__APPLE__)

static void *memrchr(const void *m, int c, size_t n)
{
    const uint8_t *ptr = (const uint8_t *)m + n;

    while (ptr-- > m) {
        if (*ptr == c)
            return (void *)ptr;
    }

    return nullptr;
}

#endif

bool StreamWriter::WriteRaw(Span<const uint8_t> buf)
{
    switch (dest.type) {
        case DestinationType::Memory: {
            // dest.u.memory->Append(buf) would work but it's probably slower
            dest.u.mem.memory->Grow(buf.len);
            MemCpy(dest.u.mem.memory->ptr + dest.u.mem.memory->len, buf.ptr, buf.len);
            dest.u.mem.memory->len += buf.len;

            raw_written += buf.len;
        } break;

        case DestinationType::BufferedFile: {
            if (!buf.len)
                return true;

            for (;;) {
                Size copy_len = std::min(buf.len, dest.u.file.buf.len - dest.u.file.buf_used);
                MemCpy(dest.u.file.buf.ptr + dest.u.file.buf_used, buf.ptr, copy_len);

                buf.ptr += copy_len;
                buf.len -= copy_len;
                dest.u.file.buf_used += copy_len;

                if (!buf.len)
                    break;
                if (!FlushBuffer())
                    return false;
            }
        } break;

        case DestinationType::LineFile: {
            while (buf.len) {
                const uint8_t *end = (const uint8_t *)memrchr(buf.ptr, '\n', (size_t)buf.len);

                if (end++) {
                    Size copy_len = std::min((Size)(end - buf.ptr), dest.u.file.buf.len - dest.u.file.buf_used);
                    MemCpy(dest.u.file.buf.ptr + dest.u.file.buf_used, buf.ptr, copy_len);

                    buf.ptr += copy_len;
                    buf.len -= copy_len;
                    dest.u.file.buf_used += copy_len;
                } else {
                    Size copy_len = std::min(buf.len, dest.u.file.buf.len - dest.u.file.buf_used);
                    MemCpy(dest.u.file.buf.ptr + dest.u.file.buf_used, buf.ptr, copy_len);

                    buf.ptr += copy_len;
                    buf.len -= copy_len;
                    dest.u.file.buf_used += copy_len;

                    if (!buf.len)
                        break;
                }

                if (!FlushBuffer())
                    return false;
            }
        } break;

        case DestinationType::DirectFile: {
            while (buf.len) {
#if defined(_WIN32)
                unsigned int int_len = (unsigned int)std::min(buf.len, (Size)UINT_MAX);
                Size write_len = _write(dest.u.file.fd, buf.ptr, int_len);
#else
                Size write_len = K_RESTART_EINTR(write(dest.u.file.fd, buf.ptr, (size_t)buf.len), < 0);
#endif

                if (write_len < 0) {
                    LogError("Failed to write to '%1': %2", filename, strerror(errno));
                    error = true;
                    return false;
                }

                buf.ptr += write_len;
                buf.len -= write_len;

                raw_written += write_len;
            }
        } break;

        case DestinationType::Function: {
            // Empty writes are used to "close" the file.. don't!
            if (!buf.len)
                return true;

            if (!dest.u.func(buf)) {
                error = true;
                return false;
            }

            raw_written += buf.len;
        } break;
    }

    return true;
}

StreamCompressorHelper::StreamCompressorHelper(CompressionType compression_type, CreateCompressorFunc *func)
{
    K_ASSERT(!CompressorFunctions[(int)compression_type]);
    CompressorFunctions[(int)compression_type] = func;
}

bool SpliceStream(StreamReader *reader, int64_t max_len, StreamWriter *writer, Span<uint8_t> buf,
                  FunctionRef<void(int64_t, int64_t)> progress)
{
    K_ASSERT(buf.len >= Kibibytes(2));

    if (!reader->IsValid())
        return false;

    int64_t raw_len = reader->ComputeRawLen();
    int64_t total_len = 0;

    do {
        Size read_len = reader->Read(buf);
        if (read_len < 0)
            return false;

        if (max_len >= 0 && read_len > max_len - total_len) [[unlikely]] {
            LogError("File '%1' is too large (limit = %2)", reader->GetFileName(), FmtDiskSize(max_len));
            return false;
        }
        total_len += read_len;

        if (!writer->Write(buf.ptr, read_len))
            return false;

        progress(reader->GetRawRead(), raw_len);
    } while (!reader->IsEOF());

    return true;
}

bool IsCompressorAvailable(CompressionType compression_type)
{
    return CompressorFunctions[(int)compression_type];
}

bool IsDecompressorAvailable(CompressionType compression_type)
{
    return DecompressorFunctions[(int)compression_type];
}

// ------------------------------------------------------------------------
// INI
// ------------------------------------------------------------------------

IniParser::LineType IniParser::FindNextLine(IniProperty *out_prop)
{
    if (error) [[unlikely]]
        return LineType::Exit;

    K_DEFER_N(err_guard) { error = true; };

    Span<char> line;
    while (reader.Next(&line)) {
        line = TrimStr(line);

        if (!line.len || line[0] == ';' || line[0] == '#') {
            // Ignore this line (empty or comment)
        } else if (line[0] == '[') {
            if (line.len < 2 || line[line.len - 1] != ']') {
                LogError("Malformed [section] line");
                return LineType::Exit;
            }

            Span<const char> section = TrimStr(line.Take(1, line.len - 2));
            if (!section.len) {
                LogError("Empty section name");
                return LineType::Exit;
            }

            current_section.RemoveFrom(0);
            current_section.Grow(section.len + 1);
            current_section.Append(section);
            current_section.ptr[current_section.len] = 0;

            err_guard.Disable();
            return LineType::Section;
        } else {
            Span<char> value;

            Span<char> key = TrimStr(SplitStr(line, '=', &value));
            if (!key.len || key.end() == line.end()) {
                LogError("Expected [section] or <key> = <value> pair");
                return LineType::Exit;
            }
            key.ptr[key.len] = 0;

            value = TrimStr(value);
            *value.end() = 0;

            out_prop->section = current_section;
            out_prop->key = key;
            out_prop->value = value;

            err_guard.Disable();
            return LineType::KeyValue;
        }
    }
    if (!reader.IsValid())
        return LineType::Exit;

    eof = true;

    err_guard.Disable();
    return LineType::Exit;
}

bool IniParser::Next(IniProperty *out_prop)
{
    LineType type;
    while ((type = FindNextLine(out_prop)) == LineType::Section);
    return type == LineType::KeyValue;
}

bool IniParser::NextInSection(IniProperty *out_prop)
{
    LineType type = FindNextLine(out_prop);
    return type == LineType::KeyValue;
}

// ------------------------------------------------------------------------
// Assets
// ------------------------------------------------------------------------

#if defined(FELIX_HOT_ASSETS)

static char assets_filename[4096];
static int64_t assets_last_check = -1;
static HeapArray<AssetInfo> assets;
static HashTable<const char *, const AssetInfo *> assets_map;
static BlockAllocator assets_alloc;
static bool assets_ready;

bool ReloadAssets()
{
    const Span<const AssetInfo> *lib_assets = nullptr;

    // Make asset library filename
    if (!assets_filename[0]) {
        Span<const char> prefix = GetApplicationExecutable();
#if defined(_WIN32)
        SplitStrReverse(prefix, '.', &prefix);
#endif

        Fmt(assets_filename, "%1_assets%2", prefix, K_SHARED_LIBRARY_EXTENSION);
    }

    // Check library time
    {
        FileInfo file_info;
        if (StatFile(assets_filename, &file_info) != StatResult::Success)
            return false;

        if (assets_last_check == file_info.mtime)
            return false;
        assets_last_check = file_info.mtime;
    }

#if defined(_WIN32)
    HMODULE h;
    if (win32_utf8) {
        h = LoadLibraryA(assets_filename);
    } else {
        wchar_t filename_w[4096];
        if (ConvertUtf8ToWin32Wide(assets_filename, filename_w) < 0)
            return false;

        h = LoadLibraryW(filename_w);
    }
    if (!h) {
        LogError("Cannot load library '%1'", assets_filename);
        return false;
    }
    K_DEFER { FreeLibrary(h); };

    lib_assets = (const Span<const AssetInfo> *)(void *)GetProcAddress(h, "EmbedAssets");
#else
    void *h = dlopen(assets_filename, RTLD_LAZY | RTLD_LOCAL);
    if (!h) {
        LogError("Cannot load library '%1': %2", assets_filename, dlerror());
        return false;
    }
    K_DEFER { dlclose(h); };

    lib_assets = (const Span<const AssetInfo> *)dlsym(h, "EmbedAssets");
#endif
    if (!lib_assets) {
        LogError("Cannot find symbol 'EmbedAssets' in library '%1'", assets_filename);
        return false;
    }

    // We are not allowed to fail from now on
    assets.Clear();
    assets_map.Clear();
    assets_alloc.Reset();

    for (const AssetInfo &asset: *lib_assets) {
        AssetInfo asset_copy;

        asset_copy.name = DuplicateString(asset.name, &assets_alloc).ptr;
        asset_copy.data = AllocateSpan<uint8_t>(&assets_alloc, asset.data.len);
        MemCpy((void *)asset_copy.data.ptr, asset.data.ptr, asset.data.len);
        asset_copy.compression_type = asset.compression_type;

        assets.Append(asset_copy);
    }
    for (const AssetInfo &asset: assets) {
        assets_map.Set(&asset);
    }

    assets_ready = true;
    return true;
}

Span<const AssetInfo> GetEmbedAssets()
{
    if (!assets_ready) {
        ReloadAssets();
        K_ASSERT(assets_ready);
    }

    return assets;
}

const AssetInfo *FindEmbedAsset(const char *name)
{
    if (!assets_ready) {
        ReloadAssets();
        K_ASSERT(assets_ready);
    }

    return assets_map.FindValue(name, nullptr);
}

#else

HashTable<const char *, const AssetInfo *> EmbedAssetsMap;
static bool assets_ready;

void InitEmbedMap(Span<const AssetInfo> assets)
{
    if (!assets_ready) [[likely]] {
        for (const AssetInfo &asset: assets) {
            EmbedAssetsMap.Set(&asset);
        }
    }
}

#endif

bool PatchFile(StreamReader *reader, StreamWriter *writer,
               FunctionRef<void(Span<const char>, StreamWriter *)> func)
{
    LineReader splitter(reader);

    Span<const char> line;
    while (splitter.Next(&line) && writer->IsValid()) {
        while (line.len) {
            Span<const char> before = SplitStr(line, "{{", &line);

            writer->Write(before);

            if (before.end() < line.ptr) {
                Span<const char> expr = SplitStr(line, "}}", &line);

                if (expr.end() < line.ptr) {
                    func(expr, writer);
                } else {
                    Print(writer, "{{%1", expr);
                }
            }
        }

        writer->Write('\n');
    }

    if (!reader->IsValid())
        return false;
    if (!writer->IsValid())
        return false;

    return true;
}

bool PatchFile(Span<const uint8_t> data, StreamWriter *writer,
               FunctionRef<void(Span<const char>, StreamWriter *)> func)
{
    StreamReader reader(data, "<asset>");

    if (!PatchFile(&reader, writer, func)) {
        K_ASSERT(reader.IsValid());
        return false;
    }

    return true;
}

bool PatchFile(const AssetInfo &asset, StreamWriter *writer,
               FunctionRef<void(Span<const char>, StreamWriter *)> func)
{
    StreamReader reader(asset.data, "<asset>", asset.compression_type);

    if (!PatchFile(&reader, writer, func)) {
        K_ASSERT(reader.IsValid());
        return false;
    }

    return true;
}

Span<const uint8_t> PatchFile(Span<const uint8_t> data, Allocator *alloc,
                              FunctionRef<void(Span<const char>, StreamWriter *)> func)
{
    K_ASSERT(alloc);

    HeapArray<uint8_t> buf(alloc);
    StreamWriter writer(&buf, "<asset>");

    PatchFile(data, &writer, func);

    bool success = writer.Close();
    K_ASSERT(success);

    buf.Grow(1);
    buf.ptr[buf.len] = 0;

    return buf.Leak();
}

Span<const uint8_t> PatchFile(const AssetInfo &asset, Allocator *alloc,
                              FunctionRef<void(Span<const char>, StreamWriter *)> func)
{
    K_ASSERT(alloc);

    HeapArray<uint8_t> buf(alloc);
    StreamWriter writer(&buf, "<asset>", 0, asset.compression_type);

    PatchFile(asset, &writer, func);

    bool success = writer.Close();
    K_ASSERT(success);

    buf.Grow(1);
    buf.ptr[buf.len] = 0;

    return buf.Leak();
}

Span<const char> PatchFile(Span<const char> data, Allocator *alloc,
                           FunctionRef<void(Span<const char> key, StreamWriter *)> func)
{
    Span<const uint8_t> ret = PatchFile(data.As<const uint8_t>(), alloc, func);
    return ret.As<const char>();
}

// ------------------------------------------------------------------------
// Translations
// ------------------------------------------------------------------------

typedef HashMap<const char *, const char *> TranslationMap;

static HeapArray<TranslationTable> i18n_tables;
static NoDestroy<HeapArray<TranslationMap>> i18n_maps;
static HashMap<Span<const char> , const TranslationTable *> i18n_locales;

static const TranslationTable *i18n_default_table;
static const TranslationMap *i18n_default_map;
static thread_local const TranslationTable *i18n_thread_table = i18n_default_table;
static thread_local const TranslationMap *i18n_thread_map = i18n_default_map;

static void SetDefaultLocale(const char *default_lang)
{
    if (i18n_default_table)
        return;

    // Obey environment settings, even on Windows, for easy override
    {
        // Yeah this order makes perfect sense. Don't ask.
        static const char *const EnvVariables[] = { "LANGUAGE", "LC_MESSAGES", "LC_ALL", "LANG" };

        for (const char *variable: EnvVariables) {
            const char *env = GetEnv(variable);

            if (env) {
                ChangeThreadLocale(env);

                i18n_default_table = i18n_thread_table;
                i18n_default_map = i18n_thread_map;

                if (i18n_default_table)
                    return;
            }
        }
    }

#if defined(_WIN32)
    {
        wchar_t buffer[16384];
        unsigned long languages = 0;
        unsigned long size = K_LEN(buffer);

        if (GetUserPreferredUILanguages(MUI_LANGUAGE_NAME, &languages, buffer, &size)) {
            if (languages) {
                char lang[256] = {};
                ConvertWin32WideToUtf8(buffer, lang);

                ChangeThreadLocale(lang);

                i18n_default_table = i18n_thread_table;
                i18n_default_map = i18n_thread_map;

                if (i18n_default_table)
                    return;
            }
        } else {
            LogError("Failed to retrieve preferred Windows UI language: %1", GetWin32ErrorString());
        }
    }
#endif

    ChangeThreadLocale(default_lang);
    K_CRITICAL(i18n_thread_table, "Missing default locale");

    i18n_default_table = i18n_thread_table;
    i18n_default_map = i18n_thread_map;
}

void InitLocales(Span<const TranslationTable> tables, const char *default_lang)
{
    K_ASSERT(!i18n_tables.len);

    for (const TranslationTable &table: tables) {
        i18n_tables.Append(table);

        TranslationMap *map = i18n_maps->AppendDefault();

        for (const TranslationTable::Pair &pair: table.messages) {
            map->Set(pair.key, pair.value);
        }
    }
    for (const TranslationTable &table: i18n_tables) {
        i18n_locales.Set(table.language, &table);
    }

    SetDefaultLocale(default_lang);
}

bool HasLocale(const char *name)
{
    Span<const char> lang = name ? SplitStrAny(name, "_-") : "";
    return i18n_locales.Find(lang);
}

void ChangeThreadLocale(const char *name)
{
    Span<const char> lang = name ? SplitStrAny(name, "_-") : "";
    const TranslationTable *table = i18n_locales.FindValue(lang, nullptr);

    if (table) {
        Size idx = table - i18n_tables.ptr;

        i18n_thread_table = table;
        i18n_thread_map = &(*i18n_maps)[idx];
    } else {
        i18n_thread_table = i18n_default_table;
        i18n_thread_map = i18n_default_map;
    }
}

const char *GetThreadLocale()
{
    K_ASSERT(i18n_thread_table);
    return i18n_thread_table->language;
}

const char *T(const char *key)
{
    if (!i18n_thread_map)
        return key;

    return i18n_thread_map->FindValue(key, key);
}

// ------------------------------------------------------------------------
// Options
// ------------------------------------------------------------------------

static inline bool IsOption(const char *arg)
{
    return arg[0] == '-' && arg[1];
}

static inline bool IsLongOption(const char *arg)
{
    return arg[0] == '-' && arg[1] == '-' && arg[2];
}

static inline bool IsDashDash(const char *arg)
{
    return arg[0] == '-' && arg[1] == '-' && !arg[2];
}

const char *OptionParser::Next()
{
    current_option = nullptr;
    current_value = nullptr;
    test_failed = false;

    // Support aggregate short options, such as '-fbar'. Note that this can also be
    // parsed as the short option '-f' with value 'bar', if the user calls
    // ConsumeOptionValue() after getting '-f'.
    if (smallopt_offset) {
        const char *opt = args[pos];

        buf[1] = opt[smallopt_offset];
        current_option = buf;

        if (!opt[++smallopt_offset]) {
            smallopt_offset = 0;
            pos++;
        }

        return current_option;
    }

    if (mode == OptionMode::Stop && (pos >= limit || !IsOption(args[pos]))) {
        limit = pos;
        return nullptr;
    }

    // Skip non-options, do the permutation once we reach an option or the last argument
    Size next_index = pos;
    while (next_index < limit && !IsOption(args[next_index])) {
        next_index++;
    }
    if (mode == OptionMode::Rotate) {
        std::rotate(args.ptr + pos, args.ptr + next_index, args.end());
        limit -= (next_index - pos);
    } else if (mode == OptionMode::Skip) {
        pos = next_index;
    }
    if (pos >= limit)
        return nullptr;

    const char *opt = args[pos];

    if (IsLongOption(opt)) {
        const char *needle = strchr(opt, '=');
        if (needle) {
            // We can reorder args, but we don't want to change strings. So copy the
            // option up to '=' in our buffer. And store the part after '=' as the
            // current value.
            Size len = needle - opt;
            if (len > K_SIZE(buf) - 1) {
                len = K_SIZE(buf) - 1;
            }
            MemCpy(buf, opt, len);
            buf[len] = 0;
            current_option = buf;
            current_value = needle + 1;
        } else {
            current_option = opt;
        }
        pos++;
    } else if (IsDashDash(opt)) {
        // We may have previously moved non-options to the end of args. For example,
        // at this point 'a b c -- d e' is reordered to '-- d e a b c'. Fix it.
        std::rotate(args.ptr + pos + 1, args.ptr + limit, args.end());
        limit = pos;
        pos++;
    } else if (opt[2]) {
        // We either have aggregated short options or one short option with a value,
        // depending on whether or not the user calls ConsumeOptionValue().
        buf[0] = '-';
        buf[1] = opt[1];
        buf[2] = 0;
        current_option = buf;
        smallopt_offset = opt[2] ? 2 : 0;

        // The main point of Skip mode is to be able to parse arguments in
        // multiple passes. This does not work well with ambiguous short options
        // (such as -oOption, which can be interpeted as multiple one-char options
        // or one -o option with a value), so force the value interpretation.
        if (mode == OptionMode::Skip) {
            ConsumeValue();
        }
    } else {
        current_option = opt;
        pos++;
    }

    return current_option;
}

const char *OptionParser::ConsumeValue()
{
    if (current_value)
        return current_value;

    // Support '-fbar' where bar is the value, but only for the first short option
    // if it's an aggregate.
    if (smallopt_offset == 2 && args[pos][2]) {
        smallopt_offset = 0;
        current_value = args[pos] + 2;
        pos++;
    // Support '-f bar' and '--foo bar', see ConsumeOption() for '--foo=bar'
    } else if (current_option != buf && pos < limit && !IsOption(args[pos])) {
        current_value = args[pos];
        pos++;
    }

    return current_value;
}

const char *OptionParser::ConsumeNonOption()
{
    if (pos == args.len)
        return nullptr;
    // Beyond limit there are only non-options, the limit is moved when we move non-options
    // to the end or upon encouteering a double dash '--'.
    if (pos < limit && IsOption(args[pos]))
        return nullptr;

    return args[pos++];
}

void OptionParser::ConsumeNonOptions(HeapArray<const char *> *non_options)
{
    const char *non_option;
    while ((non_option = ConsumeNonOption())) {
        non_options->Append(non_option);
    }
}

bool OptionParser::Test(const char *test1, const char *test2, OptionType type)
{
    K_ASSERT(test1 && IsOption(test1));
    K_ASSERT(!test2 || IsOption(test2));

    if (TestStr(test1, current_option) || (test2 && TestStr(test2, current_option))) {
        switch (type) {
            case OptionType::NoValue: {
                if (current_value) {
                    LogError("Option '%1' does not support values", current_option);
                    test_failed = true;
                    return false;
                }
            } break;
            case OptionType::Value: {
                if (!ConsumeValue()) {
                    LogError("Option '%1' requires a value", current_option);
                    test_failed = true;
                    return false;
                }
            } break;
            case OptionType::OptionalValue: {
                ConsumeValue();
            } break;
        }

        return true;
    } else {
        return false;
    }
}

void OptionParser::LogUnknownError() const
{
    if (!TestHasFailed()) {
        LogError("Unknown option '%1'", current_option);
    }
}

void OptionParser::LogUnusedArguments() const
{
    if (pos < args.len) {
       LogWarning("Unused command-line arguments");
    }
}

// ------------------------------------------------------------------------
// Console prompter (simplified readline)
// ------------------------------------------------------------------------

static bool input_is_raw;
#if defined(_WIN32)
static HANDLE stdin_handle;
static DWORD input_orig_mode;
#elif !defined(__wasm__)
static struct termios input_orig_tio;
#endif

ConsolePrompter::ConsolePrompter()
{
    entries.AppendDefault();
}

static bool EnableRawMode()
{
#if defined(_WIN32)
    static bool init_atexit = false;

    if (!input_is_raw) {
        stdin_handle = (HANDLE)_get_osfhandle(STDIN_FILENO);

        if (GetConsoleMode(stdin_handle, &input_orig_mode)) {
            input_is_raw = SetConsoleMode(stdin_handle, ENABLE_WINDOW_INPUT);

            if (input_is_raw && !init_atexit) {
                atexit([]() { SetConsoleMode(stdin_handle, input_orig_mode); });
                init_atexit = true;
            }
        }
    }

    return input_is_raw;
#elif !defined(__wasm__)
    static bool init_atexit = false;

    if (!input_is_raw) {
        if (isatty(STDIN_FILENO) && tcgetattr(STDIN_FILENO, &input_orig_tio) >= 0) {
            struct termios raw = input_orig_tio;
            cfmakeraw(&raw);

            input_is_raw = (tcsetattr(STDIN_FILENO, TCSAFLUSH, &raw) >= 0);

            if (input_is_raw && !init_atexit) {
                atexit([]() { tcsetattr(STDIN_FILENO, TCSAFLUSH, &input_orig_tio); });
                init_atexit = true;
            }
        }
    }

    return input_is_raw;
#else
    return false;
#endif
}

static void DisableRawMode()
{
    if (input_is_raw) {
#if defined(_WIN32)
        input_is_raw = !SetConsoleMode(stdin_handle, input_orig_mode);
#elif !defined(__wasm__)
        input_is_raw = !(tcsetattr(STDIN_FILENO, TCSAFLUSH, &input_orig_tio) >= 0);
#endif
    }
}

#if !defined(_WIN32) && !defined(__wasm__)
static void IgnoreSigWinch(struct sigaction *old_sa)
{
    struct sigaction sa;

    sa.sa_handler = [](int) {};
    sigemptyset(&sa.sa_mask);
    sa.sa_flags = 0;

    sigaction(SIGWINCH, &sa, old_sa);
}
#endif

bool ConsolePrompter::Read(Span<const char> *out_str)
{
#if !defined(_WIN32) && !defined(__wasm__)
    struct sigaction old_sa;
    IgnoreSigWinch(&old_sa);
    K_DEFER { sigaction(SIGWINCH, &old_sa, nullptr); };
#endif

    if (FileIsVt100(STDERR_FILENO) && EnableRawMode()) {
        K_DEFER {
            Print(StdErr, "%!0");
            DisableRawMode();
        };

        return ReadRaw(out_str);
    } else {
        return ReadBuffered(out_str);
    }
}

Size ConsolePrompter::ReadEnum(Span<const PromptChoice> choices, Size value)
{
    K_ASSERT(value < choices.len);

#if !defined(_WIN32) && !defined(__wasm__)
    struct sigaction old_sa;
    IgnoreSigWinch(&old_sa);
    K_DEFER { sigaction(SIGWINCH, &old_sa, nullptr); };
#endif

    if (FileIsVt100(STDERR_FILENO) && EnableRawMode()) {
        K_DEFER {
            Print(StdErr, "%!0");
            DisableRawMode();
        };

        return ReadRawEnum(choices, value);
    } else {
        return ReadBufferedEnum(choices);
    }
}

void ConsolePrompter::Commit()
{
    str.len = TrimStrRight(str.Take(), "\r\n").len;

    if (str.len) {
        std::swap(str, entries[entries.len - 1]);
        entries.AppendDefault();
    }
    entry_idx = entries.len - 1;
    str.RemoveFrom(0);
    str_offset = 0;

    rows = 0;
    rows_with_extra = 0;
    x = 0;
    y = 0;
}

bool ConsolePrompter::ReadRaw(Span<const char> *out_str)
{
    StdErr->Flush();

    prompt_columns = ComputeUnicodeWidth(prompt) + 1;
    str_offset = str.len;

    RenderRaw();

    int32_t uc;
    while ((uc = ReadChar()) >= 0) {
        // Fix display if terminal is resized
        if (GetConsoleSize().x != columns) {
            RenderRaw();
        }

        switch (uc) {
            case 0x1B: {
                LocalArray<char, 16> buf;

                const auto match_escape = [&](const char *seq) {
                    K_ASSERT(strlen(seq) < K_SIZE(buf.data));

                    for (Size i = 0; seq[i]; i++) {
                        if (i >= buf.len) {
                            uc = ReadChar();

                            if (uc >= 128) {
                                // Got some kind of non-ASCII character, make sure nothing else matches
                                buf.Append(0);
                                return false;
                            }

                            buf.Append((char)uc);
                        }
                        if (buf[i] != seq[i])
                            return false;
                    }

                    return true;
                };

                if (match_escape("[1;5D")) { // Ctrl-Left
                    str_offset = FindBackward(str_offset, " \t\r\n");
                    RenderRaw();
                } else if (match_escape("[1;5C")) { // Ctrl-Right
                    str_offset = FindForward(str_offset, " \t\r\n");
                    RenderRaw();
                } else if (match_escape("[3~")) { // Delete
                    if (str_offset < str.len) {
                        Delete(str_offset, SkipForward(str_offset, 1));
                        RenderRaw();
                    }
                } else if (match_escape("\x1B")) { // Double escape
                    StdErr->Write("\r\n");
                    StdErr->Flush();
                    return false;
                } else if (match_escape("\x7F")) { // Alt-Backspace
                    Delete(FindBackward(str_offset, " \t\r\n"), str_offset);
                    RenderRaw();
                } else if (match_escape("d")) { // Alt-D
                    Delete(str_offset, FindForward(str_offset, " \t\r\n"));
                    RenderRaw();
                } else if (match_escape("[A")) { // Up
                    fake_input = "\x10";
                } else if (match_escape("[B")) { // Down
                    fake_input = "\x0E";
                } else if (match_escape("[D")) { // Left
                    fake_input = "\x02";
                } else if (match_escape("[C")) { // Right
                    fake_input = "\x06";
                } else if (match_escape("[H")) { // Home
                    fake_input = "\x01";
                } else if (match_escape("[F")) { // End
                    fake_input = "\x05";
                }
            } break;

            case 0x2: { // Left
                if (str_offset > 0) {
                    str_offset = SkipBackward(str_offset, 1);
                    RenderRaw();
                }
            } break;
            case 0x6: { // Right
                if (str_offset < str.len) {
                    str_offset = SkipForward(str_offset, 1);
                    RenderRaw();
                }
            } break;
            case 0xE: { // Down
                Span<const char> remain = str.Take(str_offset, str.len - str_offset);
                SplitStr(remain, '\n', &remain);

                if (remain.len) {
                    Span<const char> line = SplitStr(remain, '\n', &remain);

                    Size line_offset = std::min(line.len, (Size)x - prompt_columns);
                    str_offset = std::min((Size)(line.ptr - str.ptr + line_offset), str.len);

                    RenderRaw();
                } else if (entry_idx < entries.len - 1) {
                    ChangeEntry(entry_idx + 1);
                    RenderRaw();
                }
            } break;
            case 0x10: { // Up
                Span<const char> remain = str.Take(0, str_offset);
                SplitStrReverse(remain, '\n', &remain);

                if (remain.len) {
                    Span<const char> line = SplitStrReverse(remain, '\n', &remain);

                    Size line_offset = std::min(line.len, (Size)x - prompt_columns);
                    str_offset = std::min((Size)(line.ptr - str.ptr + line_offset), str.len);

                    RenderRaw();
                } else if (entry_idx > 0) {
                    ChangeEntry(entry_idx - 1);
                    RenderRaw();
                }
            } break;

            case 0x1: { // Home
                str_offset = FindBackward(str_offset, "\n");
                RenderRaw();
            } break;
            case 0x5: { // End
                str_offset = FindForward(str_offset, "\n");
                RenderRaw();
            } break;

            case 0x8:
            case 0x7F: { // Backspace
                if (str.len) {
                    Delete(SkipBackward(str_offset, 1), str_offset);
                    RenderRaw();
                }
            } break;
            case 0x3: { // Ctrl-C
                if (str.len) {
                    str.RemoveFrom(0);
                    str_offset = 0;
                    entry_idx = entries.len - 1;
                    entries[entry_idx].RemoveFrom(0);

                    RenderRaw();
                } else {
                    StdErr->Write("\r\n");
                    StdErr->Flush();
                    return false;
                }
            } break;
            case 0x4: { // Ctrl-D
                if (str.len) {
                    Delete(str_offset, SkipForward(str_offset, 1));
                    RenderRaw();
                } else {
                    return false;
                }
            } break;
            case 0x14: { // Ctrl-T
                Size middle = SkipBackward(str_offset, 1);
                Size start = SkipBackward(middle, 1);

                if (start < middle) {
                    std::rotate(str.ptr + start, str.ptr + middle, str.ptr + str_offset);
                    RenderRaw();
                }
            } break;
            case 0xB: { // Ctrl-K
                Delete(str_offset, FindForward(str_offset, "\n"));
                RenderRaw();
            } break;
            case 0x15: { // Ctrl-U
                Delete(FindBackward(str_offset, "\n"), str_offset);
                RenderRaw();
            } break;
            case 0xC: { // Ctrl-L
                StdErr->Write("\x1B[2J\x1B[999A");
                RenderRaw();
            } break;

            case '\r':
            case '\n': {
                if (rows > y) {
                    Print(StdErr, "\x1B[%1B", rows - y);
                }
                StdErr->Write("\r\n");
                StdErr->Flush();
                y = rows + 1;

                EnsureNulTermination();
                if (out_str) {
                    *out_str = str;
                }
                return true;
            } break;

            case '\t': {
                if (complete) {
                    BlockAllocator temp_alloc;
                    HeapArray<CompleteChoice> choices;

                    PushLogFilter([](LogLevel, const char *, const char *, FunctionRef<LogFunc>) {});
                    K_DEFER_N(log_guard) { PopLogFilter(); };

                    CompleteResult ret = complete(str, &temp_alloc, &choices);

                    switch (ret) {
                        case CompleteResult::Success: {
                            if (choices.len == 1) {
                                const CompleteChoice &choice = choices[0];

                                str.RemoveFrom(0);
                                str.Append(choice.value);
                                str_offset = str.len;
                                RenderRaw();
                            } else if (choices.len) {
                                for (const CompleteChoice &choice: choices) {
                                    Print(StdErr, "\r\n  %!0%!Y..%1%!0", choice.name);
                                }
                                StdErr->Write("\r\n");

                                RenderRaw();
                            }
                        } break;

                        case CompleteResult::TooMany: {
                            Print(StdErr, "\r\n  %!0%!Y..%1%!0\r\n", T("Too many possibilities to show"));
                            RenderRaw();
                        } break;
                        case CompleteResult::Error: {
                            Print(StdErr, "\r\n  %!0%!Y..%1%!0\r\n", T("Autocompletion error"));
                            RenderRaw();
                        } break;
                    }

                    break;
                }
            } [[fallthrough]];

            default: {
                LocalArray<char, 16> frag;
                if (uc == '\t') {
                    frag.Append("    ");
                } else if (!IsAsciiControl(uc)) {
                    frag.len = EncodeUtf8(uc, frag.data);
                } else {
                    continue;
                }

                str.Grow(frag.len);
                MemMove(str.ptr + str_offset + frag.len, str.ptr + str_offset, str.len - str_offset);
                MemCpy(str.ptr + str_offset, frag.data, frag.len);
                str.len += frag.len;
                str_offset += frag.len;

                if (!mask && str_offset == str.len && uc < 128 && x + frag.len < columns) {
                    StdErr->Write(frag.data, frag.len);
                    StdErr->Flush();
                    x += (int)frag.len;
                } else {
                    RenderRaw();
                }
            } break;
        }
    }

    EnsureNulTermination();
    if (out_str) {
        *out_str = str;
    }
    return true;
}

Size ConsolePrompter::ReadRawEnum(Span<const PromptChoice> choices, Size value)
{
    StdErr->Flush();

    prompt_columns = 0;
    FormatChoices(choices, value);
    RenderRaw();

    int32_t uc;
    while ((uc = ReadChar()) >= 0) {
        // Fix display if terminal is resized
        if (GetConsoleSize().x != columns) {
            RenderRaw();
            Print(StdErr, "%!D..[Y/N]%!0 ");
        }

        switch (uc) {
            case 0x1B: {
                LocalArray<char, 16> buf;

                const auto match_escape = [&](const char *seq) {
                    K_ASSERT(strlen(seq) < K_SIZE(buf.data));

                    for (Size i = 0; seq[i]; i++) {
                        if (i >= buf.len) {
                            uc = ReadChar();

                            if (uc >= 128) {
                                // Got some kind of non-ASCII character, make sure nothing else matches
                                buf.Append(0);
                                return false;
                            }

                            buf.Append((char)uc);
                        }
                        if (buf[i] != seq[i])
                            return false;
                    }

                    return true;
                };

                if (match_escape("[A")) { // Up
                    fake_input = "\x10";
                } else if (match_escape("[B")) { // Down
                    fake_input = "\x0E";
                } else if (match_escape("\x1B")) { // Double escape
                    if (rows > y) {
                        Print(StdErr, "\x1B[%1B", rows - y);
                    }
                    StdErr->Write("\r");
                    StdErr->Flush();

                    return -1;
                }
            } break;

            case 0x3:   // Ctrl-C
            case 0x4: { // Ctrl-D
                if (rows > y) {
                    Print(StdErr, "\x1B[%1B", rows - y);
                }
                StdErr->Write("\r");
                StdErr->Flush();

                return -1;
            } break;

            case 0xE: { // Down
                if (value + 1 < choices.len) {
                    FormatChoices(choices, ++value);
                    RenderRaw();
                }
            } break;
            case 0x10: { // Up
                if (value > 0) {
                    FormatChoices(choices, --value);
                    RenderRaw();
                }
            } break;

            default: {
                const auto it = std::find_if(choices.begin(), choices.end(),
                                             [&](const PromptChoice &choice) { return choice.c == uc; });
                if (it == choices.end())
                    break;
                value = it - choices.begin();
            } [[fallthrough]];

            case '\r':
            case '\n': {
                str.RemoveFrom(0);
                str.Append(choices[value].str);
                str_offset = str.len;
                RenderRaw();

                StdErr->Write("\r\n");
                StdErr->Flush();

                return value;
            } break;
        }
    }

    return -1;
}

bool ConsolePrompter::ReadBuffered(Span<const char> *out_str)
{
    prompt_columns = ComputeUnicodeWidth(prompt) + 1;

    RenderBuffered();

    do {
        uint8_t c = 0;
        if (StdIn->Read(MakeSpan(&c, 1)) < 0)
            return false;

        if (c == '\n') {
            EnsureNulTermination();
            if (out_str) {
                *out_str = str;
            }
            return true;
        } else if (!IsAsciiControl(c)) {
            str.Append((char)c);
        }
    } while (!StdIn->IsEOF());

    // EOF
    return false;
}

Size ConsolePrompter::ReadBufferedEnum(Span<const PromptChoice> choices)
{
    static const Span<const char> prefix = "Input your choice: ";

    prompt_columns = 0;
    FormatChoices(choices, 0);
    RenderBuffered();

    Print(StdErr, "\n%1", prefix);
    StdErr->Flush();

    do {
        uint8_t c = 0;
        if (StdIn->Read(MakeSpan(&c, 1)) < 0)
            return -1;

        if (c == '\n') {
            Span<const char> end = TrimStr(SplitStrReverse(str, '\n'));

            if (end.len == 1) {
                const auto it = std::find_if(choices.begin(), choices.end(),
                                             [&](const PromptChoice &choice) { return choice.c == end[0]; });
                if (it != choices.end())
                    return it - choices.ptr;
            }

            str.RemoveFrom(end.ptr - str.ptr);

            StdErr->Write(prefix);
            StdErr->Flush();
        } else if (!IsAsciiControl(c)) {
            str.Append((char)c);
        }
    } while (!StdIn->IsEOF());

    // EOF
    return -1;
}

void ConsolePrompter::ChangeEntry(Size new_idx)
{
    if (str.len) {
        std::swap(str, entries[entry_idx]);
    }

    str.RemoveFrom(0);
    str.Append(entries[new_idx]);
    str_offset = str.len;
    entry_idx = new_idx;
}

Size ConsolePrompter::SkipForward(Size offset, Size count)
{
    if (offset < str.len) {
        offset++;

        while (offset < str.len && (((str[offset] & 0xC0) == 0x80) || --count)) {
            offset++;
        }
    }

    return offset;
}

Size ConsolePrompter::SkipBackward(Size offset, Size count)
{
    if (offset > 0) {
        offset--;

        while (offset > 0 && (((str[offset] & 0xC0) == 0x80) || --count)) {
            offset--;
        }
    }

    return offset;
}

Size ConsolePrompter::FindForward(Size offset, const char *chars)
{
    while (offset < str.len && strchr(chars, str[offset])) {
        offset++;
    }
    while (offset < str.len && !strchr(chars, str[offset])) {
        offset++;
    }

    return offset;
}

Size ConsolePrompter::FindBackward(Size offset, const char *chars)
{
    if (offset > 0) {
        offset--;

        while (offset > 0 && strchr(chars, str[offset])) {
            offset--;
        }
        while (offset > 0 && !strchr(chars, str[offset - 1])) {
            offset--;
        }
    }

    return offset;
}

void ConsolePrompter::Delete(Size start, Size end)
{
    K_ASSERT(start >= 0);
    K_ASSERT(end >= start && end <= str.len);

    MemMove(str.ptr + start, str.ptr + end, str.len - end);
    str.len -= end - start;

    if (str_offset > end) {
        str_offset -= end - start;
    } else if (str_offset > start) {
        str_offset = start;
    }
}

void ConsolePrompter::FormatChoices(Span<const PromptChoice> choices, Size value)
{
    int align = 0;

    for (const PromptChoice &choice: choices) {
        align = std::max(align, (int)ComputeUnicodeWidth(choice.str));
    }

    str.RemoveFrom(0);
    str.Append('\n');
    for (Size i = 0; i < choices.len; i++) {
        const PromptChoice &choice = choices[i];
        int pad = align - ComputeUnicodeWidth(choice.str);

        if (choice.c) {
            Fmt(&str, "  [%1] %2%3  ", choice.c, choice.str, FmtRepeat(" ", pad));
        } else {
            Fmt(&str, "      %1%2  ", choice.str, FmtRepeat(" ", pad));
        }
        if (i == value) {
            str_offset = str.len;
        }
        str.Append('\n');
    }
}

void ConsolePrompter::RenderRaw()
{
    columns = GetConsoleSize().x;
    rows = 0;

    int mask_columns = mask ? ComputeUnicodeWidth(mask) : 0;

    // Hide cursor during refresh
    StdErr->Write("\x1B[?25l");
    if (y) {
        Print(StdErr, "\x1B[%1A", y);
    }

    // Output prompt(s) and string lines
    {
        Size i = 0;
        int x2 = prompt_columns;

        Print(StdErr, "\r%!0%1 %!..+", prompt);

        for (;;) {
            if (i == str_offset) {
                x = x2;
                y = rows;
            }
            if (i >= str.len)
                break;

            Size bytes = std::min((Size)CountUtf8Bytes(str[i]), str.len - i);
            int width = mask ? mask_columns : ComputeUnicodeWidth(str.Take(i, bytes));

            if (x2 + width >= columns || str[i] == '\n') {
                FmtArg prefix = FmtRepeat(" ", prompt_columns - 1);
                Print(StdErr, "\x1B[0K\r\n%!D.+%1%!0 %!..+", prefix);

                x2 = prompt_columns;
                rows++;
            }
            if (width > 0) {
                if (mask) {
                    StdErr->Write(mask);
                } else {
                    StdErr->Write(str.ptr + i, bytes);
                }
            }

            x2 += width;
            i += bytes;
        }
        StdErr->Write("\x1B[0K");
    }

    // Clear remaining rows
    for (int i = rows; i < rows_with_extra; i++) {
        StdErr->Write("\r\n\x1B[0K");
    }
    rows_with_extra = std::max(rows_with_extra, rows);

    // Fix up cursor and show it
    if (rows_with_extra > y) {
        Print(StdErr, "\x1B[%1A", rows_with_extra - y);
    }
    Print(StdErr, "\r\x1B[%1C", x);
    Print(StdErr, "\x1B[?25h");

    StdErr->Flush();
}

void ConsolePrompter::RenderBuffered()
{
    Span<const char> remain = str;
    Span<const char> line = SplitStr(remain, '\n', &remain);

    Print(StdErr, "%1 %2", prompt, line);
    while (remain.len) {
        line = SplitStr(remain, '\n', &remain);
        Print(StdErr, "\n%1%2", FmtRepeat(" ", prompt_columns), line);
    }

    StdErr->Flush();
}

Vec2<int> ConsolePrompter::GetConsoleSize()
{
#if defined(_WIN32)
    HANDLE h = (HANDLE)_get_osfhandle(STDERR_FILENO);

    CONSOLE_SCREEN_BUFFER_INFO screen;
    if (GetConsoleScreenBufferInfo(h, &screen))
        return { screen.dwSize.X, screen.dwSize.Y };
#elif !defined(__wasm__)
    struct winsize ws;
    if (ioctl(STDOUT_FILENO, TIOCGWINSZ, &ws) >= 0 && ws.ws_col)
        return { ws.ws_col, ws.ws_row };
#endif

    // Give up!
    return { 80, 24 };
}

int32_t ConsolePrompter::ReadChar()
{
    if (fake_input[0]) {
        int c = fake_input[0];
        fake_input++;
        return c;
    }

#if defined(_WIN32)
    HANDLE h = (HANDLE)_get_osfhandle(STDIN_FILENO);

    for (;;) {
        INPUT_RECORD ev;
        DWORD ev_len;
        if (!ReadConsoleInputW(h, &ev, 1, &ev_len))
            return -1;
        if (!ev_len)
            return -1;

        if (ev.EventType == KEY_EVENT && ev.Event.KeyEvent.bKeyDown) {
            bool ctrl = ev.Event.KeyEvent.dwControlKeyState & (LEFT_CTRL_PRESSED | RIGHT_CTRL_PRESSED);
            bool alt = ev.Event.KeyEvent.dwControlKeyState & (LEFT_ALT_PRESSED | RIGHT_ALT_PRESSED);

            if (ctrl && !alt) {
                switch (ev.Event.KeyEvent.wVirtualKeyCode) {
                    case 'A': return 0x1;
                    case 'B': return 0x2;
                    case 'C': return 0x3;
                    case 'D': return 0x4;
                    case 'E': return 0x5;
                    case 'F': return 0x6;
                    case 'H': return 0x8;
                    case 'K': return 0xB;
                    case 'L': return 0xC;
                    case 'N': return 0xE;
                    case 'P': return 0x10;
                    case 'T': return 0x14;
                    case 'U': return 0x15;
                    case VK_LEFT: {
                        fake_input = "[1;5D";
                        return 0x1B;
                    } break;
                    case VK_RIGHT: {
                        fake_input = "[1;5C";
                        return 0x1B;
                    } break;
                }
            } else {
                if (alt) {
                    switch (ev.Event.KeyEvent.wVirtualKeyCode) {
                        case VK_BACK: {
                            fake_input = "\x7F";
                            return 0x1B;
                        } break;
                        case 'D': {
                            fake_input = "d";
                            return 0x1B;
                        } break;
                    }
                }

                switch (ev.Event.KeyEvent.wVirtualKeyCode) {
                    case VK_UP: return 0x10;
                    case VK_DOWN: return 0xE;
                    case VK_LEFT: return 0x2;
                    case VK_RIGHT: return 0x6;
                    case VK_HOME: return 0x1;
                    case VK_END: return 0x5;
                    case VK_RETURN: return '\r';
                    case VK_BACK: return 0x8;
                    case VK_DELETE: {
                        fake_input = "[3~";
                        return 0x1B;
                    } break;

                    default: {
                        uint32_t uc = ev.Event.KeyEvent.uChar.UnicodeChar;

                        if ((uc - 0xD800u) < 0x800u) {
                            if ((uc & 0xFC00u) == 0xD800u) {
                                surrogate_buf = uc;
                                return 0;
                            } else if (surrogate_buf && (uc & 0xFC00) == 0xDC00) {
                                uc = (surrogate_buf << 10) + uc - 0x35FDC00;
                            } else {
                                // Yeah something is up. Give up on this character.
                                surrogate_buf = 0;
                                return 0;
                            }
                        }

                        return (int32_t)uc;
                    } break;
                }
            }
        } else if (ev.EventType == WINDOW_BUFFER_SIZE_EVENT) {
            return 0;
        }
    }
#else
    int32_t uc = 0;

    {
        uint8_t c = 0;
        ssize_t read_len = read(STDIN_FILENO, &c, 1);
        if (read_len < 0)
            goto error;
        if (!read_len)
            return -1;
        uc = c;
    }

    if (uc >= 128) {
        Size bytes = CountUtf8Bytes((char)uc);

        LocalArray<char, 4> buf;
        buf.Append((char)uc);
        buf.len += read(STDIN_FILENO, buf.end(), bytes - 1);
        if (buf.len < 1)
            goto error;

        if (buf.len != bytes)
            return 0;
        if (DecodeUtf8(buf, 0, &uc) != bytes)
            return 0;
    }

    return uc;

error:
    if (errno == EINTR) {
        // Could be SIGWINCH, give the user a chance to deal with it
        return 0;
    } else {
        LogError("Failed to read from standard input: %1", strerror(errno));
        return -1;
    }
#endif
}

void ConsolePrompter::EnsureNulTermination()
{
    str.Grow(1);
    str.ptr[str.len] = 0;
}

const char *Prompt(const char *prompt, const char *default_value, const char *mask, Allocator *alloc)
{
    K_ASSERT(alloc);

    ConsolePrompter prompter;

    prompter.prompt = prompt;
    prompter.mask = mask;

    prompter.str.allocator = alloc;
    if (default_value) {
        prompter.str.Append(default_value);
    }

    if (!prompter.Read())
        return nullptr;

    const char *str = prompter.str.Leak().ptr;
    return str;
}

Size PromptEnum(const char *prompt, Span<const PromptChoice> choices, Size value)
{
#if defined(K_DEBUG)
    {
        HashSet<char> keys;

        for (const PromptChoice &choice: choices) {
            if (!choice.c)
                continue;

            bool duplicates = !keys.InsertOrFail(choice.c);
            K_ASSERT(!duplicates);
        }
    }
#endif

    ConsolePrompter prompter;
    prompter.prompt = prompt;

    return prompter.ReadEnum(choices, value);
}

Size PromptEnum(const char *prompt, Span<const char *const> strings, Size value)
{
    static const char literals[] = "123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";

    HeapArray<PromptChoice> choices;

    for (Size i = 0; i < strings.len; i++) {
        const char *str = strings[i];
        PromptChoice choice = { str, i < K_LEN(literals) ? literals[i] : (char)0 };

        choices.Append(choice);
    }

    return PromptEnum(prompt, choices, value);
}

int PromptYN(const char *prompt)
{
    const char *shortcuts = T("yn");
    K_ASSERT(strlen(shortcuts) == 2);

    const PromptChoice choices[] = {
        { T("Yes"), shortcuts[0] },
        { T("No"), shortcuts[1] }
    };

    Size ret = PromptEnum(prompt, choices);
    if (ret < 0)
        return -1;

    return !ret;
}

const char *PromptPath(const char *prompt, const char *default_path, Span<const char> root_directory, Allocator *alloc)
{
    K_ASSERT(alloc);

    ConsolePrompter prompter;

    prompter.prompt = prompt;
    prompter.complete = [&](Span<const char> str, Allocator *alloc, HeapArray<CompleteChoice> *out_choices) {
        Size start_len = out_choices->len;
        K_DEFER_N(err_guard) { out_choices->RemoveFrom(start_len); };

        Span<const char> path = TrimStrRight(str, K_PATH_SEPARATORS);
        bool separator = (path.len < str.len);

        // If the value points to a directory, append separator and return
        if (str.len && !separator) {
            const char *filename = NormalizePath(path, root_directory, alloc).ptr;

            FileInfo file_info;
            StatResult ret = StatFile(filename, (int)StatFlag::SilentMissing | (int)StatFlag::FollowSymlink, &file_info);

            if (ret == StatResult::Success && file_info.type == FileType::Directory) {
                const char *value = Fmt(alloc, "%1%/", path).ptr;
                out_choices->Append({ value, value });

                err_guard.Disable();
                return CompleteResult::Success;
            }
        }

        Span<const char> directory = path;
        Span<const char> prefix = separator ? "" : SplitStrReverseAny(path, K_PATH_SEPARATORS, &directory);

        // EnumerateDirectory takes a C string, so we need the NUL terminator,
        // and we also need to take root_dir into account.
        const char *dirname = nullptr;

        if (PathIsAbsolute(directory)) {
            dirname = DuplicateString(directory, alloc).ptr;
        } else {
            if (!root_directory.len)
                return CompleteResult::Success;

            dirname = NormalizePath(directory, root_directory, alloc).ptr;
            dirname = dirname[0] ? dirname : ".";
        }

        EnumResult ret = EnumerateDirectory(dirname, nullptr, -1, [&](const char *basename, FileType file_type) {
#if defined(_WIN32)
            if (!StartsWithI(basename, prefix))
                return true;
#else
            if (!StartsWith(basename, prefix))
                return true;
#endif

            if (out_choices->len - start_len >= K_COMPLETE_PATH_LIMIT)
                return false;

            CompleteChoice choice;
            {
                HeapArray<char> buf(alloc);

                // Make directory part
                buf.Append(directory);
                if (directory.len && !IsPathSeparator(directory[directory.len - 1])) {
                    buf.Append(*K_PATH_SEPARATORS);
                }

                Size name_offset = buf.len;

                // Append name
                buf.Append(basename);
                if (file_type == FileType::Directory) {
                    buf.Append(*K_PATH_SEPARATORS);
                }
                buf.Append(0);
                buf.Trim();

                choice.value = buf.Leak().ptr;
                choice.name = choice.value + name_offset;
            }

            out_choices->Append(choice);
            return true;
        });

        if (ret == EnumResult::CallbackFail) {
            return CompleteResult::TooMany;
        } else if (ret != EnumResult::Success) {
            // Just ignore it and don't print anything
            return CompleteResult::Success;
        }

        std::sort(out_choices->ptr + start_len, out_choices->end(),
                  [](const CompleteChoice &choice1, const CompleteChoice &choice2) { return CmpNaturalI(choice1.name, choice2.name) < 0; });

        err_guard.Disable();
        return CompleteResult::Success;
    };

    prompter.str.allocator = alloc;
    if (default_path) {
        prompter.str.Append(default_path);
    }

    if (!prompter.Read())
        return nullptr;

    const char *str = NormalizePath(prompter.str, alloc).ptr;
    return str;
}

// ------------------------------------------------------------------------
// Mime types
// ------------------------------------------------------------------------

#if __has_include("mimetypes.inc")

const char *GetMimeType(Span<const char> extension, const char *default_type)
{
    static const HashMap<Span<const char>, const char *> mimetypes = {
        #define MIMETYPE(Extension, MimeType) { (Extension), (MimeType) },
        #include "mimetypes.inc"

        { "", "application/octet-stream" }
    };

    char lower[32];
    {
        Size take = std::min(extension.len, (Size)16);
        Span<const char> truncated = extension.Take(0, take);

        for (Size i = 0; i < truncated.len; i++) {
            lower[i] = LowerAscii(truncated[i]);
        }
        lower[truncated.len] = 0;
    }

    const char *mimetype = mimetypes.FindValue(lower, nullptr);

    if (!mimetype) {
        LogDebug("Unknown MIME type for extension '%1'", extension);
        mimetype = default_type;
    }

    return mimetype;
}

bool CanCompressFile(const char *filename)
{
    char extension[8];
    {
        const char *ptr = GetPathExtension(filename).ptr;

        Size i = 0;
        while (i < K_SIZE(extension) - 1 && ptr[i]) {
            extension[i] = LowerAscii(ptr[i]);
            i++;
        }
        extension[i] = 0;
    }

    if (TestStrI(extension, ".zip"))
        return false;
    if (TestStrI(extension, ".rar"))
        return false;
    if (TestStrI(extension, ".7z"))
        return false;
    if (TestStrI(extension, ".gz") || TestStrI(extension, ".tgz"))
        return false;
    if (TestStrI(extension, ".bz2") || TestStrI(extension, ".tbz2"))
        return false;
    if (TestStrI(extension, ".xz") || TestStrI(extension, ".txz"))
        return false;
    if (TestStrI(extension, ".zst") || TestStrI(extension, ".tzst"))
        return false;
    if (TestStrI(extension, ".woff") || TestStrI(extension, ".woff2"))
        return false;
    if (TestStrI(extension, ".db") || TestStrI(extension, ".sqlite3"))
        return false;

    const char *mimetype = GetMimeType(extension, nullptr);

    if (!mimetype)
        return false;
    if (StartsWith(mimetype, "video/"))
        return false;
    if (StartsWith(mimetype, "audio/"))
        return false;
    if (StartsWith(mimetype, "image/") && !TestStr(mimetype, "image/svg+xml"))
        return false;

    return true;
}

#endif

// ------------------------------------------------------------------------
// Unicode
// ------------------------------------------------------------------------

bool IsValidUtf8(Span<const char> str)
{
    Size i = 0;

    while (i < str.len) {
        int32_t uc;
        Size bytes = DecodeUtf8(str, i, &uc);

        if (!bytes) [[unlikely]]
            return false;

        i += bytes;
    }

    return i == str.len;
}

#if __has_include("unicode.inc")

static bool TestUnicodeTable(Span<const int32_t> table, int32_t uc)
{
    K_ASSERT(table.len > 0);
    K_ASSERT(table.len % 2 == 0);

    auto it = std::upper_bound(table.begin(), table.end(), uc,
                               [](int32_t uc, int32_t x) { return uc < x; });
    Size idx = it - table.ptr;

    // Each pair of value in table represents a valid interval
    return idx & 0x1;
}

static inline int ComputeCharacterWidth(int32_t uc)
{
    // Fast path
    if (uc < 128)
        return IsAsciiControl(uc) ? 0 : 1;

    if (TestUnicodeTable(WcWidthNull, uc))
        return 0;
    if (TestUnicodeTable(WcWidthWide, uc))
        return 2;

    return 1;
}

int ComputeUnicodeWidth(Span<const char> str)
{
    Size i = 0;
    int width = 0;

    while (i < str.len) {
        int32_t uc;
        Size bytes = DecodeUtf8(str, i, &uc);

        if (!bytes) [[unlikely]]
            return false;

        i += bytes;
        width += ComputeCharacterWidth(uc);
    }

    return width;
}

bool IsXidStart(int32_t uc)
{
    if (IsAsciiAlpha(uc))
        return true;
    if (uc == '_')
        return true;
    if (TestUnicodeTable(XidStartTable, uc))
        return true;

    return false;
}

bool IsXidContinue(int32_t uc)
{
    if (IsAsciiAlphaOrDigit(uc))
        return true;
    if (uc == '_')
        return true;
    if (TestUnicodeTable(XidContinueTable, uc))
        return true;

    return false;
}

#endif

// ------------------------------------------------------------------------
// CRC
// ------------------------------------------------------------------------

#if __has_include("crc.inc")

uint32_t CRC32(uint32_t state, Span<const uint8_t> buf)
{
    state = ~state;

    Size right = buf.len & (K_SIZE_MAX - 3);

    for (Size i = 0; i < right; i += 4) {
        state = (state >> 8) ^ Crc32Table[(state ^ buf[i + 0]) & 0xFF];
        state = (state >> 8) ^ Crc32Table[(state ^ buf[i + 1]) & 0xFF];
        state = (state >> 8) ^ Crc32Table[(state ^ buf[i + 2]) & 0xFF];
        state = (state >> 8) ^ Crc32Table[(state ^ buf[i + 3]) & 0xFF];
    }
    for (Size i = right; i < buf.len; i++) {
        state = (state >> 8) ^ Crc32Table[(state ^ buf[i]) & 0xFF];
    }

    return ~state;
}

uint32_t CRC32C(uint32_t state, Span<const uint8_t> buf)
{
    state = ~state;

    Size right = buf.len & (K_SIZE_MAX - 3);

    for (Size i = 0; i < right; i += 4) {
        state = (state >> 8) ^ Crc32CTable[(state ^ buf[i + 0]) & 0xFF];
        state = (state >> 8) ^ Crc32CTable[(state ^ buf[i + 1]) & 0xFF];
        state = (state >> 8) ^ Crc32CTable[(state ^ buf[i + 2]) & 0xFF];
        state = (state >> 8) ^ Crc32CTable[(state ^ buf[i + 3]) & 0xFF];
    }
    for (Size i = right; i < buf.len; i++) {
        state = (state >> 8) ^ Crc32CTable[(state ^ buf[i]) & 0xFF];
    }

    return ~state;
}

static uint64_t XzUpdate1(uint64_t state, uint8_t byte)
{
    uint64_t ret = (state >> 8) ^ Crc64XzTable0[byte ^ (uint8_t)state];
    return ret;
}

static uint64_t XzUpdate16(uint64_t state, const uint8_t *bytes)
{
    uint64_t ret = Crc64XzTable0[bytes[15]] ^
                   Crc64XzTable1[bytes[14]] ^
                   Crc64XzTable2[bytes[13]] ^
                   Crc64XzTable3[bytes[12]] ^
                   Crc64XzTable4[bytes[11]] ^
                   Crc64XzTable5[bytes[10]] ^
                   Crc64XzTable6[bytes[9]] ^
                   Crc64XzTable7[bytes[8]] ^
                   Crc64XzTable8[bytes[7] ^ (uint8_t)(state >> 56)] ^
                   Crc64XzTable9[bytes[6] ^ (uint8_t)(state >> 48)] ^
                   Crc64XzTable10[bytes[5] ^ (uint8_t)(state >> 40)] ^
                   Crc64XzTable11[bytes[4] ^ (uint8_t)(state >> 32)] ^
                   Crc64XzTable12[bytes[3] ^ (uint8_t)(state >> 24)] ^
                   Crc64XzTable13[bytes[2] ^ (uint8_t)(state >> 16)] ^
                   Crc64XzTable14[bytes[1] ^ (uint8_t)(state >> 8)] ^
                   Crc64XzTable15[bytes[0] ^ (uint8_t)(state >> 0)];
    return ret;
}

uint64_t CRC64xz(uint64_t state, Span<const uint8_t> buf)
{
    state = ~state;

    Size len16 = buf.len / 16 * 16;

    for (Size i = 0; i < len16; i += 16) {
        state = XzUpdate16(state, buf.ptr + i);
    }
    for (Size i = len16; i < buf.len; i++) {
        state = XzUpdate1(state, buf[i]);
    }

    return ~state;
}

static uint64_t NvmeUpdate1(uint64_t state, uint8_t byte)
{
    uint64_t ret = (state >> 8) ^ Crc64NvmeTable0[byte ^ (uint8_t)state];
    return ret;
}

static uint64_t NvmeUpdate16(uint64_t state, const uint8_t *bytes)
{
    uint64_t ret = Crc64NvmeTable0[bytes[15]] ^
                   Crc64NvmeTable1[bytes[14]] ^
                   Crc64NvmeTable2[bytes[13]] ^
                   Crc64NvmeTable3[bytes[12]] ^
                   Crc64NvmeTable4[bytes[11]] ^
                   Crc64NvmeTable5[bytes[10]] ^
                   Crc64NvmeTable6[bytes[9]] ^
                   Crc64NvmeTable7[bytes[8]] ^
                   Crc64NvmeTable8[bytes[7] ^ (uint8_t)(state >> 56)] ^
                   Crc64NvmeTable9[bytes[6] ^ (uint8_t)(state >> 48)] ^
                   Crc64NvmeTable10[bytes[5] ^ (uint8_t)(state >> 40)] ^
                   Crc64NvmeTable11[bytes[4] ^ (uint8_t)(state >> 32)] ^
                   Crc64NvmeTable12[bytes[3] ^ (uint8_t)(state >> 24)] ^
                   Crc64NvmeTable13[bytes[2] ^ (uint8_t)(state >> 16)] ^
                   Crc64NvmeTable14[bytes[1] ^ (uint8_t)(state >> 8)] ^
                   Crc64NvmeTable15[bytes[0] ^ (uint8_t)(state >> 0)];
    return ret;
}

uint64_t CRC64nvme(uint64_t state, Span<const uint8_t> buf)
{
    state = ~state;

    Size len16 = buf.len / 16 * 16;

    for (Size i = 0; i < len16; i += 16) {
        state = NvmeUpdate16(state, buf.ptr + i);
    }
    for (Size i = len16; i < buf.len; i++) {
        state = NvmeUpdate1(state, buf[i]);
    }

    return ~state;
}

#endif

}
