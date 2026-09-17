// SPDX-License-Identifier: MIT
// SPDX-FileCopyrightText: 2026 Niels Martignène <niels.martignene@protonmail.com>

#pragma once

#include <algorithm>
#include <atomic>
#include <cmath>
#include <condition_variable>
#include <errno.h>
#include <float.h>
#include <functional>
#include <inttypes.h>
#include <limits.h>
#include <limits>
#include <memory>
#include <mutex>
#include <shared_mutex>
#if __cplusplus >= 202002L && __has_include(<source_location>)
    #include <source_location>
#endif
#include <stddef.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <thread>
#include <type_traits>
#include <utility>
#if defined(_WIN32)
    #if !defined(STDIN_FILENO)
        #define STDIN_FILENO 0
    #endif
    #if !defined(STDOUT_FILENO)
        #define STDOUT_FILENO 1
    #endif
    #if !defined(STDERR_FILENO)
        #define STDERR_FILENO 2
    #endif

    #include <intrin.h>
#else
    #include <unistd.h>
#endif
#if defined(_MSC_VER)
    #define ENABLE_INTSAFE_SIGNED_FUNCTIONS
    #include <intsafe.h>
    #pragma intrinsic(_BitScanReverse)
    #if defined(_WIN64)
        #pragma intrinsic(_BitScanReverse64)
    #endif
    #if defined(_M_IX86) || defined(_M_X64)
        #pragma intrinsic(__rdtsc)
    #endif
#endif

struct sigaction;
struct BrotliEncoderStateStruct;

namespace K {

// ------------------------------------------------------------------------
// Config
// ------------------------------------------------------------------------

#if !defined(NDEBUG)
    #define K_DEBUG
#endif

#define K_DEFAULT_ALLOCATOR MallocAllocator
#define K_BLOCK_ALLOCATOR_DEFAULT_SIZE Kibibytes(4)

#define K_HEAPARRAY_BASE_CAPACITY 8
#define K_HEAPARRAY_GROWTH_FACTOR 2.0

// Must be a power-of-two
#define K_HASHTABLE_BASE_CAPACITY 8
#define K_HASHTABLE_MAX_LOAD_FACTOR 0.5

#define K_FMT_STRING_BASE_CAPACITY 256
#define K_FMT_STRING_PRINT_BUFFER_SIZE 1024

#define K_LINE_READER_STEP_SIZE 65536

#define K_ASYNC_MAX_THREADS 2048
#define K_ASYNC_MAX_IDLE_TIME 10000
#define K_ASYNC_MAX_PENDING_TASKS 2048

#define K_PROGRESS_MAX_NODES 400
#define K_PROGRESS_USED_NODES 100
#define K_PROGRESS_TEXT_SIZE 64

#define K_COMPLETE_PATH_LIMIT 256

// ------------------------------------------------------------------------
// Utility
// ------------------------------------------------------------------------

class StreamReader;
class StreamWriter;

extern "C" const char *FelixTarget;
extern "C" const char *FelixVersion;
extern "C" const char *FelixCompiler;

extern StreamReader *const StdIn;
extern StreamWriter *const StdOut;
extern StreamWriter *const StdErr;

#if INTPTR_MAX == INT64_MAX
    typedef int64_t Size;
    #define K_SIZE_MAX INT64_MAX
#elif INTPTR_MAX == INT32_MAX
    typedef int32_t Size;
    #define K_SIZE_MAX INT32_MAX
#else
    #error This code base is not designed to support non-32-or-64-bit platforms
#endif

#if defined(_MSC_VER) || __BYTE_ORDER__ == __ORDER_LITTLE_ENDIAN__
    // Sane platform
#elif __BYTE_ORDER__ == __ORDER_BIG_ENDIAN__
    #define K_BIG_ENDIAN
#else
    #error This code base is not designed to support platforms with crazy endianness
#endif

#if UINT_MAX != 0xFFFFFFFFu
    #error This code base is not designed to support non-32-bits int types
#endif
#if ULLONG_MAX != 0xFFFFFFFFFFFFFFFFull
    #error This code base is not designed to support non-64-bits long long types
#endif
static_assert(sizeof(double) == 8, "This code base is not designed to support single-precision double floats");
static_assert(sizeof(intptr_t) == sizeof(size_t), "This code base assumes that intptr_t and size_t are the same size");

#define K_STRINGIFY_(a) #a
#define K_STRINGIFY(a) K_STRINGIFY_(a)
#define K_CONCAT_(a, b) a ## b
#define K_CONCAT(a, b) K_CONCAT_(a, b)
#define K_UNIQUE_NAME(prefix) K_CONCAT(prefix, __COUNTER__)
#define K_FORCE_EXPAND(x) x
#define K_IGNORE (void)!

#if defined(__GNUC__) || defined(__clang__)
    #define K_PUSH_NO_WARNINGS \
        _Pragma("GCC diagnostic push") \
        _Pragma("GCC diagnostic ignored \"-Wall\"") \
        _Pragma("GCC diagnostic ignored \"-Wextra\"") \
        _Pragma("GCC diagnostic ignored \"-Wconversion\"") \
        _Pragma("GCC diagnostic ignored \"-Wsign-conversion\"") \
        _Pragma("GCC diagnostic ignored \"-Wunused-function\"") \
        _Pragma("GCC diagnostic ignored \"-Wunused-variable\"") \
        _Pragma("GCC diagnostic ignored \"-Wunused-but-set-variable\"") \
        _Pragma("GCC diagnostic ignored \"-Wunused-parameter\"") \
        _Pragma("GCC diagnostic ignored \"-Wzero-as-null-pointer-constant\"") \
        _Pragma("GCC diagnostic ignored \"-Winvalid-offsetof\"")
    #define K_POP_NO_WARNINGS \
        _Pragma("GCC diagnostic pop")

    #if !defined(SCNd8)
        #define SCNd8 "hhd"
    #endif
    #if !defined(SCNi8)
        #define SCNi8 "hhd"
    #endif
    #if !defined(SCNu8)
        #define SCNu8 "hhu"
    #endif
#elif defined(_MSC_VER)
    #define K_PUSH_NO_WARNINGS __pragma(warning(push, 0))
    #define K_POP_NO_WARNINGS __pragma(warning(pop))

    #define __restrict__ __restrict
#else
    #error Compiler not supported
#endif

#if defined(__clang__)
    #if __has_feature(address_sanitizer)
        #define __SANITIZE_ADDRESS__
    #endif
    #if __has_feature(thread_sanitizer)
        #define __SANITIZE_THREAD__
    #endif
    #if __has_feature(undefined_sanitizer)
        #define __SANITIZE_UNDEFINED__
    #endif
#endif

void PrintAssertError(const char *filename, int line, const char *msg);

#if defined(_MSC_VER)
    #define K_DEBUG_BREAK() __debugbreak()
#elif defined(__clang__)
    #define K_DEBUG_BREAK() __builtin_debugtrap()
#elif defined(__i386__) || defined(__x86_64__)
    #define K_DEBUG_BREAK() __asm__ __volatile__("int $0x03")
#elif defined(__thumb__)
    #define K_DEBUG_BREAK() __asm__ __volatile__(".inst 0xde01")
#elif defined(__aarch64__)
    #define K_DEBUG_BREAK() __asm__ __volatile__(".inst 0xd4200000")
#elif defined(__arm__)
    #define K_DEBUG_BREAK() __asm__ __volatile__(".inst 0xe7f001f0")
#elif defined(__riscv)
    #define K_DEBUG_BREAK() __asm__ __volatile__("ebreak")
#elif defined(__loongarch64)
    #define K_DEBUG_BREAK() __asm__ __volatile__("break 1")
#else
    #define K_DEBUG_BREAK() __builtin_trap()
#endif

#if defined(_MSC_VER) || __EXCEPTIONS
    #define K_BAD_ALLOC() \
        do { \
            throw std::bad_alloc(); \
        } while (false)
#else
    #define K_BAD_ALLOC() \
        do { \
            PrintLn(StdErr, "Memory allocation failed"); \
            abort(); \
        } while (false);
#endif

#define K_CRITICAL(Cond, ...) \
    do { \
        if (!(Cond)) [[unlikely]] { \
            PrintLn(StdErr, __VA_ARGS__); \
            abort(); \
        } \
    } while (false)
#if defined(K_DEBUG)
    #define K_ASSERT(Cond) \
        do { \
            if (!(Cond)) [[unlikely]] { \
                K::PrintAssertError(__FILE__, __LINE__, K_STRINGIFY(Cond)); \
                K_DEBUG_BREAK(); \
                abort(); \
            } \
        } while (false)
#else
    #define K_ASSERT(Cond) \
        do { \
            (void)sizeof(Cond); \
        } while (false)
#endif

#if defined(K_DEBUG)
    #define K_UNREACHABLE() \
        do { \
            K::PrintAssertError(__FILE__, __LINE__, "Reached code marked as UNREACHABLE"); \
            K_DEBUG_BREAK(); \
            abort(); \
        } while (false)
#elif defined(__GNUC__) || defined(__clang__)
    #define K_UNREACHABLE() __builtin_unreachable()
#else
    #define K_UNREACHABLE() __assume(0)
#endif

#if defined(_MSC_VER)
    #define K_FORCE_INLINE __forceinline
#else
    #define K_FORCE_INLINE __attribute__((always_inline)) inline
#endif

#define K_DELETE_COPY(Cls) \
    Cls(const Cls&) = delete; \
    Cls &operator=(const Cls&) = delete;

constexpr uint16_t MakeUInt16(uint8_t high, uint8_t low)
    { return (uint16_t)(((uint16_t)high << 8) | low); }
constexpr uint32_t MakeUInt32(uint16_t high, uint16_t low) { return ((uint32_t)high << 16) | low; }
constexpr uint64_t MakeUInt64(uint32_t high, uint32_t low) { return ((uint64_t)high << 32) | low; }

constexpr Size Mebibytes(Size len) { return len * 1024 * 1024; }
constexpr Size Kibibytes(Size len) { return len * 1024; }
constexpr Size Megabytes(Size len) { return len * 1000 * 1000; }
constexpr Size Kilobytes(Size len) { return len * 1000; }

#define K_SIZE(Type) ((K::Size)sizeof(Type))
template <typename T, unsigned N>
char (&ComputeArraySize(T const (&)[N]))[N];
#define K_BITS(Type) (8 * K_SIZE(Type))
#define K_LEN(Array) K_SIZE(K::ComputeArraySize(Array))

static constexpr inline uint16_t ReverseBytes(uint16_t u)
{
    return (uint16_t)(((u & 0x00FF) << 8) |
                      ((u & 0xFF00) >> 8));
}

static constexpr inline uint32_t ReverseBytes(uint32_t u)
{
    return ((u & 0x000000FF) << 24) |
           ((u & 0x0000FF00) << 8)  |
           ((u & 0x00FF0000) >> 8)  |
           ((u & 0xFF000000) >> 24);
}

static constexpr inline uint64_t ReverseBytes(uint64_t u)
{
    return ((u & 0x00000000000000FF) << 56) |
           ((u & 0x000000000000FF00) << 40) |
           ((u & 0x0000000000FF0000) << 24) |
           ((u & 0x00000000FF000000) << 8)  |
           ((u & 0x000000FF00000000) >> 8)  |
           ((u & 0x0000FF0000000000) >> 24) |
           ((u & 0x00FF000000000000) >> 40) |
           ((u & 0xFF00000000000000) >> 56);
}

static constexpr inline int16_t ReverseBytes(int16_t i)
    { return (int16_t)ReverseBytes((uint16_t)i); }
static constexpr inline int32_t ReverseBytes(int32_t i)
    { return (int32_t)ReverseBytes((uint32_t)i); }
static constexpr inline int64_t ReverseBytes(int64_t i)
    { return (int64_t)ReverseBytes((uint64_t)i); }

#if defined(K_BIG_ENDIAN)
template <typename T>
constexpr T LittleEndian(T v) { return ReverseBytes(v); }
template <typename T>
constexpr T BigEndian(T v) { return v; }
#else
template <typename T>
constexpr T LittleEndian(T v) { return v; }
template <typename T>
constexpr T BigEndian(T v) { return ReverseBytes(v); }
#endif

#if defined(__GNUC__)
    static inline int CountLeadingZeros(uint32_t u)
    {
        if (!u)
            return 32;

        return __builtin_clz(u);
    }
    static inline int CountLeadingZeros(uint64_t u)
    {
        if (!u)
            return 64;

    #if UINT64_MAX == ULONG_MAX
        return __builtin_clzl(u);
    #elif UINT64_MAX == ULLONG_MAX
        return __builtin_clzll(u);
    #else
        #error Neither unsigned long nor unsigned long long is a 64-bit unsigned integer
    #endif
    }

    static inline int CountTrailingZeros(uint32_t u)
    {
        if (!u)
            return 32;

        return __builtin_ctz(u);
    }
    static inline int CountTrailingZeros(uint64_t u)
    {
        if (!u)
            return 64;

    #if UINT64_MAX == ULONG_MAX
        return __builtin_ctzl(u);
    #elif UINT64_MAX == ULLONG_MAX
        return __builtin_ctzll(u);
    #else
        #error Neither unsigned long nor unsigned long long is a 64-bit unsigned integer
    #endif
    }

    static inline int PopCount(uint32_t u)
    {
        return __builtin_popcount(u);
    }
    static inline int PopCount(uint64_t u)
    {
        return __builtin_popcountll(u);
    }
#elif defined(_MSC_VER)
    static inline int CountLeadingZeros(uint32_t u)
    {
        unsigned long leading_zero;
        if (_BitScanReverse(&leading_zero, u)) {
            return (int)(31 - leading_zero);
        } else {
            return 32;
        }
    }
    static inline int CountLeadingZeros(uint64_t u)
    {
        unsigned long leading_zero;
    #if defined(_WIN64)
        if (_BitScanReverse64(&leading_zero, u)) {
            return (int)(63 - leading_zero);
        } else {
            return 64;
        }
    #else
        if (_BitScanReverse(&leading_zero, u >> 32)) {
            return (int)(31 - leading_zero);
        } else if (_BitScanReverse(&leading_zero, (uint32_t)u)) {
            return (int)(63 - leading_zero);
        } else {
            return 64;
        }
    #endif
    }

    static inline int CountTrailingZeros(uint32_t u)
    {
        unsigned long trailing_zero;
        if (_BitScanForward(&trailing_zero, u)) {
            return (int)trailing_zero;
        } else {
            return 32;
        }
    }
    static inline int CountTrailingZeros(uint64_t u)
    {
        unsigned long trailing_zero;
    #if defined(_WIN64)
        if (_BitScanForward64(&trailing_zero, u)) {
            return (int)trailing_zero;
        } else {
            return 64;
        }
    #else
        if (_BitScanForward(&trailing_zero, (uint32_t)u)) {
            return trailing_zero;
        } else if (_BitScanForward(&trailing_zero, u >> 32)) {
            return 32 + trailing_zero;
        } else {
            return 64;
        }
    #endif
    }

    static inline int PopCount(uint32_t u)
    {
    #if defined(_M_ARM64)
        uint32_t count;

        u = u - ((u >> 1) & 0x55555555);
        u = (u & 0x33333333) + ((u >> 2) & 0x33333333);
        count = ((u + (u >> 4) & 0xF0F0F0F) * 0x1010101) >> 24;

        return (int)count;
    #else
        return __popcnt(u);
    #endif
    }
    static inline int PopCount(uint64_t u)
    {
    #if defined(_M_X64)
        return (int)__popcnt64(u);
    #else
        int count = PopCount((uint32_t)(u >> 32)) + PopCount((uint32_t)u);
        return count;
    #endif
    }
#else
    #error No implementation of CountLeadingZeros(), CountTrailingZeros() and PopCount() for this compiler / toolchain
#endif

#if __cplusplus >= 202002L && (defined(_MSC_VER) || defined(__clang__) || __GNUC__ >= 11)
    #define K_CONSTINIT constinit
#else
    #define K_CONSTINIT const
#endif

static inline Size AlignLen(Size len, Size align)
{
    K_ASSERT(align >= 1 && !((align - 1) & align));

    // Compilers can optimize x / align * align... for unsigned types.
    // It's pessimized for signed types, to handle len < 0.

    Size aligned = (len + align - 1) & ~(align - 1);
    return aligned;
}

template <typename T>
static inline T *AlignUp(T *ptr, Size align)
{
    K_ASSERT(align >= 1 && !((align - 1) & align));

    uint8_t *aligned = (uint8_t *)(((uintptr_t)ptr + align - 1) & ~(align - 1));
    return (T *)aligned;
}

template <typename T>
static inline T *AlignDown(T *ptr, Size align)
{
    K_ASSERT(align >= 1 && !((align - 1) & align));

    uint8_t *aligned = (uint8_t *)((uintptr_t)ptr & ~(align - 1));
    return (T *)aligned;
}

// Calling memcpy (and friends) with a NULL source pointer is undefined behavior
// even if length is 0. This is dumb, work around this.
static inline void *MemCpy(void *__restrict__ dest, const void *__restrict__ src, Size len)
{
    K_ASSERT(len >= 0);

#if defined(__clang__)
    // LLVM guarantees sane behavior
    __builtin_memcpy(dest, src, (size_t)len);
#else
    if (len) {
        memcpy(dest, src, (size_t)len);
    }
#endif
    return dest;
}
static inline void *MemMove(void *dest, const void *src, Size len)
{
    K_ASSERT(len >= 0);

#if defined(__clang__)
    // LLVM guarantees sane behavior
    __builtin_memmove(dest, src, (size_t)len);
#else
    if (len) {
        memmove(dest, src, (size_t)len);
    }
#endif
    return dest;
}
static inline void *MemSet(void *dest, int c, Size len)
{
    K_ASSERT(len >= 0);

#if defined(__clang__)
    // LLVM guarantees sane behavior
    __builtin_memset(dest, c, (size_t)len);
#else
    if (len) {
        memset(dest, c, (size_t)len);
    }
#endif
    return dest;
}

#if defined(_WIN32)

void *MemMem(const void *src, Size src_len, const void *needle, Size needle_len);

#else

static inline void *MemMem(const void *src, Size src_len, const void *needle, Size needle_len)
{
    K_ASSERT(src_len >= 0);
    K_ASSERT(needle_len > 0);

    void *ptr = memmem(src, (size_t)src_len, needle, (size_t)needle_len);
    return ptr;
}

#endif

// Implemented for translations, but we need it before we get to this part
const char *T(const char *key);

template <typename T, typename = typename std::enable_if<std::is_enum<T>::value, T>>
typename std::underlying_type<T>::type MaskEnum(T value)
{
    auto mask = 1 << static_cast<typename std::underlying_type<T>::type>(value);
    return (typename std::underlying_type<T>::type)mask;
}

template <typename Fun>
class DeferGuard {
    K_DELETE_COPY(DeferGuard)

    Fun f;

public:
    DeferGuard() = delete;
    DeferGuard(Fun f_) : f(std::move(f_)) {}
    ~DeferGuard() { f(); }

    DeferGuard(DeferGuard &&other) : f(std::move(other.f)) {}
};

template <typename Fun>
class NamedDeferGuard {
    K_DELETE_COPY(NamedDeferGuard)

    Fun f;
    bool enabled;

public:
    NamedDeferGuard() = delete;
    NamedDeferGuard(Fun f_, bool enable = true) : f(std::move(f_)), enabled(enable) {}
    ~NamedDeferGuard()
    {
        if (enabled) {
            f();
        }
    }

    NamedDeferGuard(NamedDeferGuard &&other)
        : f(std::move(other.f)), enabled(other.enabled)
    {
        other.enabled = false;
    }

    void Disable() { enabled = false; }
};

// Honestly, I don't understand all the details in there, this comes from Andrei Alexandrescu.
// https://channel9.msdn.com/Shows/Going+Deep/C-and-Beyond-2012-Andrei-Alexandrescu-Systematic-Error-Handling-in-C
struct DeferGuardHelper {};
template <typename Fun>
DeferGuard<Fun> operator+(DeferGuardHelper, Fun &&f)
{
    return DeferGuard<Fun>(std::forward<Fun>(f));
}
struct NamedDeferGuardHelper {};
template <typename Fun>
NamedDeferGuard<Fun> operator+(NamedDeferGuardHelper, Fun &&f)
{
    return NamedDeferGuard<Fun>(std::forward<Fun>(f));
}

// Write 'DEFER { code };' to do something at the end of the current scope, you
// can use DEFER_N(Name) if you need to disable the guard for some reason, and
// DEFER_NC(Name, Captures) if you need to capture values.
#define K_DEFER \
    auto K_UNIQUE_NAME(defer) = K::DeferGuardHelper() + [&]()
#define K_DEFER_N(Name) \
    auto Name = K::NamedDeferGuardHelper() + [&]()
#define K_DEFER_C(...) \
    auto K_UNIQUE_NAME(defer) = K::DeferGuardHelper() + [&, __VA_ARGS__]()
#define K_DEFER_NC(Name, ...) \
    auto Name = K::NamedDeferGuardHelper() + [&, __VA_ARGS__]()

template <typename T>
class NoDestroy {
    K_DELETE_COPY(NoDestroy);

    alignas(T) uint8_t data[K_SIZE(T)];

public:
    template <class... Args>
    NoDestroy(Args&&... args) { new (data) T(std::forward<Args>(args)...); }

    ~NoDestroy() = default;

    const T *Get() const { return (const T *)(data); }
    T *Get() { return (T*)data; }

    const T &operator*() const { return *Get(); }
    T& operator*() { return *Get(); }
    const T *operator->() const { return Get(); }
    T *operator->() { return Get(); }
};

// Heavily inspired from FunctionRef in LLVM
template<typename Fn> class FunctionRef;
template<typename Ret, typename ...Params>
class FunctionRef<Ret(Params...)> {
    Ret (*callback)(intptr_t callable, Params ...params) = nullptr;
    intptr_t callable;

    template<typename Callable>
    static Ret callback_fn(intptr_t callable, Params ...params)
        { return (*reinterpret_cast<Callable*>(callable))(std::forward<Params>(params)...); }

public:
    FunctionRef() = default;

    template <typename Callable>
    FunctionRef(Callable &&callable,
                std::enable_if_t<!std::is_same<std::remove_cv_t<std::remove_reference_t<Callable>>, FunctionRef>::value> * = nullptr,
                std::enable_if_t<std::is_void<Ret>::value ||
                                 std::is_convertible<decltype(std::declval<Callable>()(std::declval<Params>()...)),
                                                     Ret>::value> * = nullptr)
      : callback(callback_fn<typename std::remove_reference<Callable>::type>),
        callable(reinterpret_cast<intptr_t>(&callable)) {}

    Ret operator()(Params ...params) const
        { return callback(callable, std::forward<Params>(params)...); }

    bool IsValid() const { return callback; }
};

template <typename T>
T MultiCmp()
{
    return 0;
}
template <typename T, typename... Args>
T MultiCmp(T cmp_value, Args... other_args)
{
    if (cmp_value) {
        return cmp_value;
    } else {
        return MultiCmp<T>(other_args...);
    }
}

template <typename T, typename U>
T ApplyMask(T value, U mask, bool enable)
{
    if (enable) {
        return value | (T)mask;
    } else {
        return value & ~(T)mask;
    }
}

template <typename T>
struct Vec2 {
    T x;
    T y;
};

template <typename T>
struct Vec3 {
    T x;
    T y;
    T z;
};

template <Size N>
class Bitset {
public:
    template <typename T>
    class Iterator {
    public:
        typedef std::input_iterator_tag iterator_category;
        typedef Size value_type;
        typedef Size difference_type;
        typedef Iterator *pointer;
        typedef Iterator &reference;

        T *bitset = nullptr;
        Size offset;
        size_t bits = 0;
        int ctz;

        Iterator() = default;
        Iterator(T *bitset, Size offset)
            : bitset(bitset), offset(offset - 1)
        {
            operator++();
        }

        Size operator*() const
        {
            K_ASSERT(offset <= K_LEN(bitset->data));

            if (offset == K_LEN(bitset->data))
                return -1;
            return offset * K_SIZE(size_t) * 8 + ctz;
        }

        Iterator &operator++()
        {
            K_ASSERT(offset <= K_LEN(bitset->data));

            while (!bits) {
                if (offset == K_LEN(bitset->data) - 1)
                    return *this;
                bits = bitset->data[++offset];
            }

            ctz = CountTrailingZeros((uint64_t)bits);
            bits ^= (size_t)1 << ctz;

            return *this;
        }

        Iterator operator++(int)
        {
            Iterator ret = *this;
            ++(*this);
            return ret;
        }

        bool operator==(const Iterator &other) const
            { return bitset == other.bitset && offset == other.offset; }
        bool operator!=(const Iterator &other) const { return !(*this == other); }
    };

    typedef Size value_type;
    typedef Iterator<Bitset> iterator_type;

    static constexpr Size Bits = N;
    size_t data[(N + K_BITS(size_t) - 1) / K_BITS(size_t)] = {};

    constexpr Bitset() = default;
    constexpr Bitset(std::initializer_list<Size> bits)
    {
        for (Size idx: bits) {
            Size offset = idx / (K_SIZE(size_t) * 8);
            size_t mask = (size_t)1 << (idx % (K_SIZE(size_t) * 8));

            data[offset] |= mask;
        }
    }

    void Clear()
    {
        MemSet(data, 0, K_SIZE(data));
    }

    Iterator<Bitset> begin() { return Iterator<Bitset>(this, 0); }
    Iterator<const Bitset> begin() const { return Iterator<const Bitset>(this, 0); }
    Iterator<Bitset> end() { return Iterator<Bitset>(this, K_LEN(data)); }
    Iterator<const Bitset> end() const { return Iterator<const Bitset>(this, K_LEN(data)); }

    Size PopCount() const
    {
        Size count = 0;
        for (size_t bits: data) {
#if K_SIZE_MAX == INT64_MAX
            count += K::PopCount((uint64_t)bits);
#else
            count += K::PopCount((uint32_t)bits);
#endif
        }
        return count;
    }

    inline bool Test(Size idx) const
    {
        K_ASSERT(idx >= 0 && idx < N);

        Size offset = idx / (K_SIZE(size_t) * 8);
        size_t mask = (size_t)1 << (idx % (K_SIZE(size_t) * 8));

        return data[offset] & mask;
    }
    inline void Set(Size idx, bool value = true)
    {
        K_ASSERT(idx >= 0 && idx < N);

        Size offset = idx / (K_SIZE(size_t) * 8);
        size_t mask = (size_t)1 << (idx % (K_SIZE(size_t) * 8));

        data[offset] = ApplyMask(data[offset], mask, value);
    }
    inline bool TestAndSet(Size idx, bool value = true)
    {
        K_ASSERT(idx >= 0 && idx < N);

        Size offset = idx / (K_SIZE(size_t) * 8);
        size_t mask = (size_t)1 << (idx % (K_SIZE(size_t) * 8));

        bool ret = data[offset] & mask;
        data[offset] = ApplyMask(data[offset], mask, value);

        return ret;
    }

    Bitset &operator&=(const Bitset &other)
    {
        for (Size i = 0; i < K_LEN(data); i++) {
            data[i] &= other.data[i];
        }
        return *this;
    }
    Bitset operator&(const Bitset &other)
    {
        Bitset ret;
        for (Size i = 0; i < K_LEN(data); i++) {
            ret.data[i] = data[i] & other.data[i];
        }
        return ret;
    }

    Bitset &operator|=(const Bitset &other)
    {
        for (Size i = 0; i < K_LEN(data); i++) {
            data[i] |= other.data[i];
        }
        return *this;
    }
    Bitset operator|(const Bitset &other)
    {
        Bitset ret;
        for (Size i = 0; i < K_LEN(data); i++) {
            ret.data[i] = data[i] | other.data[i];
        }
        return ret;
    }

    Bitset &operator^=(const Bitset &other)
    {
        for (Size i = 0; i < K_LEN(data); i++) {
            data[i] ^= other.data[i];
        }
        return *this;
    }
    Bitset operator^(const Bitset &other)
    {
        Bitset ret;
        for (Size i = 0; i < K_LEN(data); i++) {
            ret.data[i] = data[i] ^ other.data[i];
        }
        return ret;
    }

    Bitset &Flip()
    {
        for (Size i = 0; i < K_LEN(data); i++) {
            data[i] = ~data[i];
        }
        return *this;
    }
    Bitset operator~()
    {
        Bitset ret;
        for (Size i = 0; i < K_LEN(data); i++) {
            ret.data[i] = ~data[i];
        }
        return ret;
    }

    // XXX: Shift operators
};

// ------------------------------------------------------------------------
// Memory / Allocator
// ------------------------------------------------------------------------

// I'd love to make Span default to { nullptr, 0 } but unfortunately that makes
// it a non-POD and prevents putting it in a union.
template <typename T>
struct Span {
    T *ptr;
    Size len;

    Span() = default;
    constexpr Span(T &value) : ptr(&value), len(1) {}
    constexpr Span(std::initializer_list<T> l) : ptr(l.begin()), len((Size)l.size()) {}
    constexpr Span(T *ptr_, Size len_) : ptr(ptr_), len(len_) {}
    template <Size N>
    constexpr Span(T (&arr)[N]) : ptr(arr), len(N) {}

    constexpr void Reset()
    {
        ptr = nullptr;
        len = 0;
    }

    constexpr T *begin() { return ptr; }
    constexpr const T *begin() const { return ptr; }
    constexpr T *end() { return ptr + len; }
    constexpr const T *end() const { return ptr + len; }

    constexpr bool IsValid() const { return ptr; }

    constexpr T &operator[](Size idx)
    {
        K_ASSERT(idx >= 0 && idx < len);
        return ptr[idx];
    }
    constexpr const T &operator[](Size idx) const
    {
        K_ASSERT(idx >= 0 && idx < len);
        return ptr[idx];
    }

    constexpr operator Span<const T>() const { return Span<const T>(ptr, len); }

    constexpr bool operator==(const Span &other) const
    {
        if (len != other.len)
            return false;

        for (Size i = 0; i < len; i++) {
            if (ptr[i] != other.ptr[i])
                return false;
        }

        return true;
    }
    constexpr bool operator!=(const Span &other) const { return !(*this == other); }

    constexpr Span Take(Size offset, Size sub_len) const
    {
        K_ASSERT(sub_len >= 0 && sub_len <= len);
        K_ASSERT(offset >= 0 && offset <= len - sub_len);

        Span<T> sub = { ptr + offset, sub_len };
        return sub;
    }

    template <typename U>
    constexpr Span<U> As() const { return Span<U>((U *)ptr, len); }
};

// Use strlen() to build Span<const char> instead of the template-based
// array constructor.
template <>
struct Span<const char> {
    const char *ptr;
    Size len;

    Span() = default;
    constexpr Span(const char &ch) : ptr(&ch), len(1) {}
    constexpr Span(const char *ptr_, Size len_) : ptr(ptr_), len(len_) {}
    template <Size N>
    Span(const char (&arr)[N]) : ptr(arr), len(strnlen(arr, N)) {}
#if defined(__clang__) || defined(_MSC_VER)
    constexpr Span(const char *const &str) : ptr(str), len(str ? (Size)__builtin_strlen(str) : 0) {}
#else
    constexpr Span(const char *const &str) : ptr(str), len(str ? (Size)strlen(str) : 0) {}
#endif

    constexpr void Reset()
    {
        ptr = nullptr;
        len = 0;
    }

    constexpr const char *begin() const { return ptr; }
    constexpr const char *end() const { return ptr + len; }

    constexpr bool IsValid() const { return ptr; }

    constexpr char operator[](Size idx) const
    {
        K_ASSERT(idx >= 0 && idx < len);
        return ptr[idx];
    }

    // The implementation comes later, after TestStr() is available
    constexpr bool operator==(Span<const char> other) const;
    constexpr bool operator==(const char *other) const;
    constexpr bool operator!=(Span<const char> other) const { return !(*this == other); }
    constexpr bool operator!=(const char *other) const { return !(*this == other); }

    constexpr Span Take(Size offset, Size sub_len) const
    {
        K_ASSERT(sub_len >= 0 && sub_len <= len);
        K_ASSERT(offset >= 0 && offset <= len - sub_len);

        Span<const char> sub = { ptr + offset, sub_len };
        return sub;
    }

    template <typename U>
    constexpr Span<U> As() const { return Span<U>((U *)ptr, len); }
};

template <typename T>
static constexpr inline Span<T> MakeSpan(T *ptr, Size len)
{
    return Span<T>(ptr, len);
}
template <typename T>
static constexpr inline Span<T> MakeSpan(T *ptr, T *end)
{
    return Span<T>(ptr, end - ptr);
}
template <typename T, Size N>
static constexpr inline Span<T> MakeSpan(T (&arr)[N])
{
    return Span<T>(arr, N);
}

template <typename T>
class Strider {
public:
    void *ptr = nullptr;
    Size stride;

    Strider() = default;
    constexpr Strider(T *ptr_) : ptr(ptr_), stride(K_SIZE(T)) {}
    constexpr Strider(T *ptr_, Size stride_) : ptr(ptr_), stride(stride_) {}

    constexpr bool IsValid() const { return ptr; }

    constexpr T &operator[](Size idx) const
    {
        K_ASSERT(idx >= 0);
        return *(T *)((uint8_t *)ptr + (idx * stride));
    }
};

template <typename T>
static constexpr inline Strider<T> MakeStrider(T *ptr)
{
    return Strider<T>(ptr, K_SIZE(T));
}
template <typename T>
static constexpr inline Strider<T> MakeStrider(T *ptr, Size stride)
{
    return Strider<T>(ptr, stride);
}
template <typename T, Size N>
static constexpr inline Strider<T> MakeStrider(T (&arr)[N])
{
    return Strider<T>(arr, K_SIZE(T));
}

class Allocator {
    K_DELETE_COPY(Allocator)

public:
    Allocator() = default;
    virtual ~Allocator() = default;

    virtual void *Allocate(Size size) = 0;
    virtual void *Resize(void *ptr, Size old_size, Size new_size) = 0;
    virtual void Release(const void *ptr, Size size) = 0;
};

class MallocAllocator final: public Allocator {
public:
    void *Allocate(Size size) override;
    void *Resize(void *ptr, Size old_size, Size new_size) override;
    void Release(const void *ptr, Size) override;
};

class VoidAllocator: public Allocator {
public:
    void *Allocate(Size) override { K_UNREACHABLE(); }
    void *Resize(void *, Size, Size) override { K_UNREACHABLE(); }

    // This is the only useful method, switch to the null allocator (use NullAllocator global)
    // when you want to keep container memory around when it is destroyed. This can be used
    // to leak HeapArray memory without resetting it, for example.
    void Release(const void *, Size) override {}
};

extern K_DEFAULT_ALLOCATOR DefaultAllocator;
extern VoidAllocator NullAllocator;

class LinkedAllocator final: public Allocator {
    struct Bucket {
#if defined(K_DEBUG)
        Size size;
#endif
        Bucket *prev;
        Bucket *next;
        alignas(16) uint8_t data[];
    };

    Allocator *allocator;

    Bucket *list = nullptr;

public:
    LinkedAllocator(Allocator *alloc = nullptr) : allocator(alloc ? alloc : &DefaultAllocator) {}
    ~LinkedAllocator() override { ReleaseAll(); }

    LinkedAllocator(LinkedAllocator &&other) { *this = std::move(other); }
    LinkedAllocator& operator=(LinkedAllocator &&other);

    void ReleaseAll();
    void ReleaseAllExcept(void *ptr);

    void *Allocate(Size size) override;
    void *Resize(void *ptr, Size old_size, Size new_size) override;
    void Release(const void *ptr, Size size) override;

    bool IsUsed() const { return list; }

    void GiveTo(LinkedAllocator *alloc);

private:
    static Bucket *PointerToBucket(void *ptr);
};

class BlockAllocator final: public Allocator {
    LinkedAllocator allocator;
    Size block_size;

    uint8_t *bucket_ptr = nullptr;
    uint8_t *bucket_end = nullptr;
    uint8_t *last_alloc = nullptr;

public:
    BlockAllocator(Allocator *alloc, Size block_size = K_BLOCK_ALLOCATOR_DEFAULT_SIZE)
        : allocator(alloc), block_size(block_size)
    {
        K_ASSERT(block_size > 0);
    }
    BlockAllocator(Size block_size = K_BLOCK_ALLOCATOR_DEFAULT_SIZE)
        : BlockAllocator(nullptr, block_size) {}

    BlockAllocator(BlockAllocator &&other) { *this = std::move(other); }
    BlockAllocator& operator=(BlockAllocator &&other);

    void Reset();
    void ReleaseAll();

    void *Allocate(Size size) override;
    void *Resize(void *ptr, Size old_size, Size new_size) override;
    void Release(const void *ptr, Size size) override;

    bool IsUsed() const { return allocator.IsUsed(); }

    void GiveTo(LinkedAllocator *alloc);
    void GiveTo(BlockAllocator *alloc) { GiveTo(&alloc->allocator); }
};

static inline void *AllocateRaw(Allocator *alloc, Size size)
{
    K_ASSERT(size >= 0);

    alloc = alloc ? alloc : &DefaultAllocator;

    void *ptr = alloc->Allocate(size);

    return ptr;
}

template <typename T>
T *AllocateOne(Allocator *alloc)
{
    alloc = alloc ? alloc : &DefaultAllocator;

    Size size = K_SIZE(T);
    T *ptr = (T *)alloc->Allocate(size);

    return ptr;
}

template <typename T>
Span<T> AllocateSpan(Allocator *alloc, Size len)
{
    K_ASSERT(len >= 0);
    K_ASSERT(len <= K_SIZE_MAX / K_SIZE(T));

    if (len >= K_SIZE_MAX / K_SIZE(T)) [[unlikely]] {
        PrintAssertError(__FILE__, __LINE__, "allocation size overflow");
        abort();
    }

    alloc = alloc ? alloc : &DefaultAllocator;

    Size size = len * K_SIZE(T);
    T *ptr = (T *)alloc->Allocate(size);

    return MakeSpan(ptr, len);
}

static inline void *ResizeRaw(Allocator *alloc, void *ptr, Size old_size, Size new_size)
{
    K_ASSERT(new_size >= 0);

    alloc = alloc ? alloc : &DefaultAllocator;

    ptr = alloc->Resize(ptr, old_size, new_size);

    return ptr;
}

template <typename T>
Span<T> ResizeSpan(Allocator *alloc, Span<T> mem, Size new_len)
{
    K_ASSERT(new_len >= 0);
    K_ASSERT(new_len <= K_SIZE_MAX / K_SIZE(T));

    if (new_len >= K_SIZE_MAX / K_SIZE(T)) [[unlikely]] {
        PrintAssertError(__FILE__, __LINE__, "allocation size overflow");
        abort();
    }

    alloc = alloc ? alloc : &DefaultAllocator;

    Size old_size = mem.len * K_SIZE(T);
    Size new_size = new_len * K_SIZE(T);

    mem.ptr = (T *)alloc->Resize(mem.ptr, old_size, new_size);

    return MakeSpan(mem.ptr, new_len);
}

static inline void ReleaseRaw(Allocator *alloc, const void *ptr, Size size)
{
    alloc = alloc ? alloc : &DefaultAllocator;
    alloc->Release(ptr, size);
}

template<typename T>
void ReleaseOne(Allocator *alloc, T *ptr)
{
    alloc = alloc ? alloc : &DefaultAllocator;
    alloc->Release((void *)ptr, K_SIZE(T));
}

template<typename T>
void ReleaseSpan(Allocator *alloc, Span<T> mem)
{
    alloc = alloc ? alloc : &DefaultAllocator;

    Size size = mem.len * K_SIZE(T);
    alloc->Release((void *)mem.ptr, size);
}

void *AllocateSafe(Size len);
void ReleaseSafe(void *ptr, Size len);
void ZeroSafe(void *ptr, Size len);

// This is like ArenaAllocator but simpler, without a vtable, without resizing, and whatnot.
// It is it own free thing and cannot be used with the standard allocation functions.
// Use when you want low overhead.
class HeapChain {
    struct Bucket {
        Bucket *next;
        alignas(16) uint8_t data[];
    };

    Bucket *list = nullptr;

public:
    HeapChain() = default;
    ~HeapChain() { ReleaseAll(); }

    HeapChain(HeapChain &&other) { *this = std::move(other); }
    HeapChain& operator=(HeapChain &&other)
    {
        ReleaseAll();

        list = other.list;
        other.list = nullptr;

        return *this;
    }

    void *Allocate(Size size)
    {
        static_assert(offsetof(Bucket, data) == 16);

        Size needed = K_SIZE(Bucket) + size;
        Bucket *bucket = (Bucket *)DefaultAllocator.Allocate(needed);

        bucket->next = list;
        list = bucket;

        return bucket->data;
    }

    template<typename T>
    Span<T> AllocateSpan(Size len)
    {
        K_ASSERT(len >= 0);
        K_ASSERT(len <= K_SIZE_MAX / K_SIZE(T));

        if (len >= K_SIZE_MAX / K_SIZE(T)) [[unlikely]] {
            PrintAssertError(__FILE__, __LINE__, "allocation size overflow");
            abort();
        }

        Size size = len * K_SIZE(T);
        T *ptr = (T *)Allocate(size);

        return MakeSpan(ptr, len);
    }

    void ReleaseAll()
    {
        while (list) {
            Bucket *next = list->next;
            DefaultAllocator.Release(list, -1);
            list = next;
        }
    }

    bool IsUsed() const { return list; }
};

// ------------------------------------------------------------------------
// Reference counting
// ------------------------------------------------------------------------

template <typename T>
class RetainPtr {
    T *p = nullptr;

public:
    RetainPtr() = default;
    RetainPtr(T *p, void (*delete_func)(std::remove_const_t<T> *))
        : p(p)
    {
        K_ASSERT(p);
        K_ASSERT(delete_func);
        K_ASSERT(!p->delete_func || delete_func == p->delete_func);

        p->Ref();
        p->delete_func = delete_func;
    }
    RetainPtr(T *p, bool ref = true)
        : p(p)
    {
        if (p) {
            K_ASSERT(p->delete_func);

            if (ref) {
                p->Ref();
            }
        }
    }

    ~RetainPtr()
    {
        if (p && !p->Unref()) {
            p->delete_func((std::remove_const_t<T> *)p);
        }
    }

    RetainPtr(const RetainPtr &other)
    {
        p = other.p;
        if (p) {
            p->Ref();
        }
    }
    RetainPtr &operator=(const RetainPtr &other)
    {
        if (p && !p->Unref()) {
            p->delete_func((std::remove_const_t<T> *)p);
        }

        p = other.p;
        if (p) {
            p->Ref();
        }

        return *this;
    }

    operator RetainPtr<const T>() const
    {
        RetainPtr<const T> ptr((const T *)p);
        return ptr;
    }

    bool IsValid() const { return p; }
    operator bool() const { return p; }

    T &operator*() const
    {
        K_ASSERT(p);
        return *p;
    }
    T *operator->() const { return p; }
    T *GetRaw() const { return p; }
};

template <typename T>
class RetainObject {
    mutable void (*delete_func)(T *) = nullptr;
    mutable std::atomic_int refcount { 0 };

public:
    void Ref() const { refcount++; }
    bool Unref() const
    {
        int new_count = --refcount;
        K_ASSERT(new_count >= 0);
        return new_count;
    }

    friend class RetainPtr<T>;
    friend class RetainPtr<const T>;
};

// ------------------------------------------------------------------------
// Strings
// ------------------------------------------------------------------------

bool CopyString(const char *str, Span<char> buf);
bool CopyString(Span<const char> str, Span<char> buf);
Span<char> DuplicateString(Span<const char> str, Allocator *alloc);

static constexpr inline bool IsAsciiAlpha(int c)
{
    return (c >= 'A' && c <= 'Z') || (c >= 'a' && c <= 'z');
}
static constexpr inline bool IsAsciiDigit(int c)
{
    return (c >= '0' && c <= '9');
}
static constexpr inline bool IsAsciiAlphaOrDigit(int c)
{
    return IsAsciiAlpha(c) || IsAsciiDigit(c);
}
static constexpr inline bool IsAsciiWhite(int c)
{
    return c == ' ' || c == '\t' || c == '\v' ||
           c == '\n' || c == '\r' || c == '\f';
}
static constexpr inline bool IsAsciiControl(int c)
{
    return c == 0x7F || ((uint8_t)c < ' ' && c != '\t');
}

static constexpr inline char UpperAscii(int c)
{
    if (c >= 'a' && c <= 'z') {
        return (char)(c - 32);
    } else {
        return (char)c;
    }
}
static constexpr inline char LowerAscii(int c)
{
    if (c >= 'A' && c <= 'Z') {
        return (char)(c + 32);
    } else {
        return (char)c;
    }
}

static constexpr inline bool TestStr(Span<const char> str1, Span<const char> str2)
{
    if (str1.len != str2.len)
        return false;
    for (Size i = 0; i < str1.len; i++) {
        if (str1[i] != str2[i])
            return false;
    }
    return true;
}
static constexpr inline bool TestStr(Span<const char> str1, const char *str2)
{
    Size i = 0;
    for (; i < str1.len && str2[i]; i++) {
        if (str1[i] != str2[i])
            return false;
    }
    return (i == str1.len) && !str2[i];
}
static constexpr inline bool TestStr(const char *str1, Span<const char> str2)
    { return TestStr(str2, str1); }
static constexpr inline bool TestStr(const char *str1, const char *str2)
{
#if defined(__GNUC__) || defined(__clang__)
    return !__builtin_strcmp(str1, str2);
#else
    Size i = 0;
    for (; str1[i]; i++) {
        if (str2[i] != str1[i])
            return false;
    }
    return !str2[i];
#endif
}

// Allow direct Span<const char> equality comparison
constexpr inline bool Span<const char>::operator==(Span<const char> other) const
    { return TestStr(*this, other); }
constexpr inline bool Span<const char>::operator==(const char *other) const
    { return TestStr(*this, other); }

// Case insensitive (ASCII) versions
static constexpr inline bool TestStrI(Span<const char> str1, Span<const char> str2)
{
    if (str1.len != str2.len)
        return false;
    for (Size i = 0; i < str1.len; i++) {
        if (LowerAscii(str1[i]) != LowerAscii(str2[i]))
            return false;
    }
    return true;
}
static constexpr inline bool TestStrI(Span<const char> str1, const char *str2)
{
    Size i = 0;
    for (; i < str1.len && str2[i]; i++) {
        if (LowerAscii(str1[i]) != LowerAscii(str2[i]))
            return false;
    }
    return (i == str1.len) && !str2[i];
}
static constexpr inline bool TestStrI(const char *str1, Span<const char> str2)
    { return TestStrI(str2, str1); }
static constexpr inline bool TestStrI(const char *str1, const char *str2)
{
    Size i = 0;
    int delta = 0;
    do {
        delta = LowerAscii(str1[i]) - LowerAscii(str2[i]);
    } while (str1[i++] && !delta);
    return !delta;
}

static constexpr inline int CmpStr(Span<const char> str1, Span<const char> str2)
{
    for (Size i = 0; i < str1.len && i < str2.len; i++) {
        int delta = str1[i] - str2[i];
        if (delta)
            return delta;
    }
    if (str1.len < str2.len) {
        return -str2[str1.len];
    } else if (str1.len > str2.len) {
        return str1[str2.len];
    } else {
        return 0;
    }
}
static constexpr inline int CmpStr(Span<const char> str1, const char *str2)
{
    Size i = 0;
    for (; i < str1.len && str2[i]; i++) {
        int delta = str1[i] - str2[i];
        if (delta)
            return delta;
    }
    if (str1.len == i) {
        return -str2[i];
    } else {
        return str1[i];
    }
}
static constexpr inline int CmpStr(const char *str1, Span<const char> str2)
    { return -CmpStr(str2, str1); }
static constexpr inline int CmpStr(const char *str1, const char *str2)
{
#if defined(__GNUC__) || defined(__clang__)
        return __builtin_strcmp(str1, str2);
#else
        Size i = 0;
        for (; str1[i]; i++) {
            int delta = str1[i] - str2[i];
            if (delta)
                return delta;
        }
        return str2[i] - str1[i];
#endif
}

static inline bool StartsWith(Span<const char> str, Span<const char> prefix)
{
    Size i = 0;
    while (i < str.len && i < prefix.len) {
        if (str[i] != prefix[i])
            return false;
        i++;
    }
    return (i == prefix.len);
}
static inline bool StartsWith(Span<const char> str, const char *prefix)
{
    Size i = 0;
    while (i < str.len && prefix[i]) {
        if (str[i] != prefix[i])
            return false;
        i++;
    }
    return !prefix[i];
}
static inline bool StartsWith(const char *str, Span<const char> prefix)
{
    Size i = 0;
    while (str[i] && i < prefix.len) {
        if (str[i] != prefix[i])
            return false;
        i++;
    }
    return (i == prefix.len);
}
static inline bool StartsWith(const char *str, const char *prefix)
{
    Size i = 0;
    while (str[i] && prefix[i]) {
        if (str[i] != prefix[i])
            return false;
        i++;
    }
    return !prefix[i];
}

static inline bool StartsWithI(Span<const char> str, Span<const char> prefix)
{
    Size i = 0;
    while (i < str.len && i < prefix.len) {
        if (LowerAscii(str[i]) != LowerAscii(prefix[i]))
            return false;
        i++;
    }
    return (i == prefix.len);
}
static inline bool StartsWithI(Span<const char> str, const char *prefix)
{
    Size i = 0;
    while (i < str.len && prefix[i]) {
        if (LowerAscii(str[i]) != LowerAscii(prefix[i]))
            return false;
        i++;
    }
    return !prefix[i];
}
static inline bool StartsWithI(const char *str, Span<const char> prefix)
{
    Size i = 0;
    while (str[i] && i < prefix.len) {
        if (LowerAscii(str[i]) != LowerAscii(prefix[i]))
            return false;
        i++;
    }
    return (i == prefix.len);
}
static inline bool StartsWithI(const char *str, const char *prefix)
{
    Size i = 0;
    while (str[i] && prefix[i]) {
        if (LowerAscii(str[i]) != LowerAscii(prefix[i]))
            return false;
        i++;
    }
    return !prefix[i];
}

static inline bool EndsWith(Span<const char> str, Span<const char> suffix)
{
    Size i = str.len - 1;
    Size j = suffix.len - 1;

    while (i >= 0 && j >= 0) {
        if (str[i] != suffix[j])
            return false;

        i--;
        j--;
    }

    return j < 0;
}
static inline bool EndsWithI(Span<const char> str, Span<const char> suffix)
{
    Size i = str.len - 1;
    Size j = suffix.len - 1;

    while (i >= 0 && j >= 0) {
        if (LowerAscii(str[i]) != LowerAscii(suffix[j]))
            return false;

        i--;
        j--;
    }

    return j < 0;
}

static inline Size FindStr(Span<const char> str, Span<const char> needle)
{
    if (!needle.len)
        return 0;
    if (needle.len > str.len)
        return -1;

    Size end = str.len - needle.len;

    for (Size i = 0; i <= end; i++) {
        if (!memcmp(str.ptr + i, needle.ptr, (size_t)needle.len))
            return i;
    }

    return -1;
}
static inline Size FindStr(const char *str, const char *needle)
{
    const char *ret = strstr(str, needle);
    return ret ? ret - str : -1;
}

static inline Span<char> SplitStr(Span<char> str, char split_char, Span<char> *out_remainder = nullptr)
{
    Size part_len = 0;
    while (part_len < str.len) {
        if (str[part_len] == split_char) {
            if (out_remainder) {
                *out_remainder = str.Take(part_len + 1, str.len - part_len - 1);
            }
            return str.Take(0, part_len);
        }
        part_len++;
    }

    if (out_remainder) {
        *out_remainder = str.Take(str.len, 0);
    }
    return str;
}
static inline Span<char> SplitStr(char *str, char split_char, char **out_remainder = nullptr)
{
    Size part_len = 0;
    while (str[part_len]) {
        if (str[part_len] == split_char) {
            if (out_remainder) {
                *out_remainder = str + part_len + 1;
            }
            return MakeSpan(str, part_len);
        }
        part_len++;
    }

    if (out_remainder) {
        *out_remainder = str + part_len;
    }
    return MakeSpan(str, part_len);
}
static inline Span<const char> SplitStr(Span<const char> str, char split_char, Span<const char> *out_remainder = nullptr)
    { return SplitStr(MakeSpan((char *)str.ptr, str.len), split_char, (Span<char> *)out_remainder); }
static inline Span<const char> SplitStr(const char *str, char split_char, const char **out_remainder = nullptr)
    { return SplitStr((char *)str, split_char, (char **)out_remainder); }

static inline Span<char> SplitStr(Span<char> str, Span<const char> split, Span<char> *out_remainder = nullptr)
{
    K_ASSERT(split.len);

    Size part_len = 0;
    while (part_len < str.len) {
        if (StartsWith(str.Take(part_len, str.len - part_len), split)) {
            if (out_remainder) {
                *out_remainder = str.Take(part_len + split.len, str.len - part_len - split.len);
            }
            return str.Take(0, part_len);
        }
        part_len++;
    }

    if (out_remainder) {
        *out_remainder = str.Take(str.len, 0);
    }
    return str;
}
static inline Span<char> SplitStr(char *str, Span<const char> split, char **out_remainder = nullptr)
{
    K_ASSERT(split.len);

    Size part_len = 0;
    while (str[part_len]) {
        if (StartsWith(str + part_len, split)) {
            if (out_remainder) {
                *out_remainder = str + part_len + split.len;
            }
            return MakeSpan(str, part_len);
        }
        part_len++;
    }

    if (out_remainder) {
        *out_remainder = str + part_len;
    }
    return MakeSpan(str, part_len);
}
static inline Span<const char> SplitStr(Span<const char> str, Span<const char> split, Span<const char> *out_remainder = nullptr)
    { return SplitStr(MakeSpan((char *)str.ptr, str.len), split, (Span<char> *)out_remainder); }
static inline Span<const char> SplitStr(const char *str, Span<const char> split, const char **out_remainder = nullptr)
    { return SplitStr((char *)str, split, (char **)out_remainder); }

static inline Span<char> SplitStrLine(Span<char> str, Span<char> *out_remainder = nullptr)
{
    Span<char> part = SplitStr(str, '\n', out_remainder);
    if (part.len < str.len && part.len && part[part.len - 1] == '\r') {
        part.len--;
    }
    return part;
}
static inline Span<char> SplitStrLine(char *str, char **out_remainder = nullptr)
{
    Span<char> part = SplitStr(str, '\n', out_remainder);
    if (str[part.len] && part.len && part[part.len - 1] == '\r') {
        part.len--;
    }
    return part;
}
static inline Span<const char> SplitStrLine(Span<const char> str, Span<const char> *out_remainder = nullptr)
    { return SplitStrLine(MakeSpan((char *)str.ptr, str.len), (Span<char> *)out_remainder); }
static inline Span<const char> SplitStrLine(const char *str, const char **out_remainder = nullptr)
    { return SplitStrLine((char *)str, (char **)out_remainder); }

static inline Span<char> SplitStrAny(Span<char> str, const char *split_chars, Span<char> *out_remainder = nullptr)
{
    Bitset<256> split_mask;
    for (Size i = 0; split_chars[i]; i++) {
        uint8_t c = (uint8_t)split_chars[i];
        split_mask.Set(c);
    }

    Size part_len = 0;
    while (part_len < str.len) {
        uint8_t c = (uint8_t)str[part_len];

        if (split_mask.Test(c)) {
            if (out_remainder) {
                *out_remainder = str.Take(part_len + 1, str.len - part_len - 1);
            }
            return str.Take(0, part_len);
        }
        part_len++;
    }

    if (out_remainder) {
        *out_remainder = str.Take(str.len, 0);
    }
    return str;
}
static inline Span<char> SplitStrAny(char *str, const char *split_chars, char **out_remainder = nullptr)
{
    Bitset<256> split_mask;
    for (Size i = 0; split_chars[i]; i++) {
        uint8_t c = (uint8_t)split_chars[i];
        split_mask.Set(c);
    }

    Size part_len = 0;
    while (str[part_len]) {
        uint8_t c = (uint8_t)str[part_len];

        if (split_mask.Test(c)) {
            if (out_remainder) {
                *out_remainder = str + part_len + 1;
            }
            return MakeSpan(str, part_len);
        }
        part_len++;
    }

    if (out_remainder) {
        *out_remainder = str + part_len;
    }
    return MakeSpan(str, part_len);
}
static inline Span<const char> SplitStrAny(Span<const char> str, const char *split_chars, Span<const char> *out_remainder = nullptr)
    { return SplitStrAny(MakeSpan((char *)str.ptr, str.len), split_chars, (Span<char> *)out_remainder); }
static inline Span<const char> SplitStrAny(const char *str, const char *split_chars, const char **out_remainder = nullptr)
    { return SplitStrAny((char *)str, split_chars, (char **)out_remainder); }

static inline Span<const char> SplitStrReverse(Span<const char> str, char split_char,
                                               Span<const char> *out_remainder = nullptr)
{
    Size remainder_len = str.len - 1;
    while (remainder_len >= 0) {
        if (str[remainder_len] == split_char) {
            if (out_remainder) {
                *out_remainder = str.Take(0, remainder_len);
            }
            return str.Take(remainder_len + 1, str.len - remainder_len - 1);
        }
        remainder_len--;
    }

    if (out_remainder) {
        *out_remainder = str.Take(0, 0);
    }
    return str;
}
static inline Span<const char> SplitStrReverse(const char *str, char split_char,
                                               Span<const char> *out_remainder = nullptr)
    { return SplitStrReverse(MakeSpan(str, strlen(str)), split_char, out_remainder); }

static inline Span<const char> SplitStrReverseAny(Span<const char> str, const char *split_chars,
                                                  Span<const char> *out_remainder = nullptr)
{
    Bitset<256> split_mask;
    for (Size i = 0; split_chars[i]; i++) {
        uint8_t c = (uint8_t)split_chars[i];
        split_mask.Set(c);
    }

    Size remainder_len = str.len - 1;
    while (remainder_len >= 0) {
        uint8_t c = (uint8_t)str[remainder_len];

        if (split_mask.Test(c)) {
            if (out_remainder) {
                *out_remainder = str.Take(0, remainder_len);
            }
            return str.Take(remainder_len + 1, str.len - remainder_len - 1);
        }
        remainder_len--;
    }

    if (out_remainder) {
        *out_remainder = str.Take(0, 0);
    }
    return str;
}
static inline Span<const char> SplitStrReverseAny(const char *str, const char *split_chars,
                                                  Span<const char> *out_remainder = nullptr)
    { return SplitStrReverseAny(MakeSpan(str, strlen(str)), split_chars, out_remainder); }

static inline Span<char> TrimStrLeft(Span<char> str, char trim_char)
{
    while (str.len && str[0] == trim_char && str[0]) {
        str.ptr++;
        str.len--;
    }

    return str;
}
static inline Span<char> TrimStrRight(Span<char> str, char trim_char)
{
    while (str.len && str[str.len - 1] == trim_char && str[str.len - 1]) {
        str.len--;
    }

    return str;
}
static inline Span<char> TrimStr(Span<char> str, char trim_char)
{
    str = TrimStrRight(str, trim_char);
    str = TrimStrLeft(str, trim_char);

    return str;
}
static inline Span<const char> TrimStrLeft(Span<const char> str, char trim_char)
    { return TrimStrLeft(MakeSpan((char *)str.ptr, str.len), trim_char); }
static inline Span<const char> TrimStrRight(Span<const char> str, char trim_char)
    { return TrimStrRight(MakeSpan((char *)str.ptr, str.len), trim_char); }
static inline Span<const char> TrimStr(Span<const char> str,char trim_char)
    { return TrimStr(MakeSpan((char *)str.ptr, str.len), trim_char); }

static inline Span<char> TrimStrLeft(Span<char> str, const char *trim_chars = " \t\r\n")
{
    while (str.len && strchr(trim_chars, str[0]) && str[0]) {
        str.ptr++;
        str.len--;
    }

    return str;
}
static inline Span<char> TrimStrRight(Span<char> str, const char *trim_chars = " \t\r\n")
{
    while (str.len && strchr(trim_chars, str[str.len - 1]) && str[str.len - 1]) {
        str.len--;
    }

    return str;
}
static inline Span<char> TrimStr(Span<char> str, const char *trim_chars = " \t\r\n")
{
    str = TrimStrRight(str, trim_chars);
    str = TrimStrLeft(str, trim_chars);

    return str;
}
static inline Span<const char> TrimStrLeft(Span<const char> str, const char *trim_chars = " \t\r\n")
    { return TrimStrLeft(MakeSpan((char *)str.ptr, str.len), trim_chars); }
static inline Span<const char> TrimStrRight(Span<const char> str, const char *trim_chars = " \t\r\n")
    { return TrimStrRight(MakeSpan((char *)str.ptr, str.len), trim_chars); }
static inline Span<const char> TrimStr(Span<const char> str, const char *trim_chars = " \t\r\n")
    { return TrimStr(MakeSpan((char *)str.ptr, str.len), trim_chars); }

int CmpNatural(Span<const char> str1, Span<const char> str2);
int CmpNaturalI(Span<const char> str1, Span<const char> str2);

// ------------------------------------------------------------------------
// Collections
// ------------------------------------------------------------------------

template <typename T, Size N, Size AlignAs = alignof(T)>
class LocalArray {
public:
    alignas(AlignAs) T data[N];
    Size len = 0;

    typedef T value_type;
    typedef T *iterator_type;

    constexpr LocalArray() = default;
    constexpr LocalArray(std::initializer_list<T> l)
    {
        K_ASSERT(l.size() <= N);
        for (const T &it: l) {
            data[len++] = it;
        }
        len = (Size)l.size();
    }

    void Clear()
    {
        for (Size i = 0; i < len; i++) {
            data[i] = T();
        }
        len = 0;
    }

    operator Span<T>() { return Span<T>(data, len); }
    operator Span<const T>() const { return Span<const T>(data, len); }

    T *begin() { return data; }
    const T *begin() const { return data; }
    T *end() { return data + len; }
    const T *end() const { return data + len; }

    Size Available() const { return K_LEN(data) - len; }

    T &operator[](Size idx)
    {
        K_ASSERT(idx >= 0 && idx < len);
        return data[idx];
    }
    const T &operator[](Size idx) const
    {
        K_ASSERT(idx >= 0 && idx < len);
        return data[idx];
    }

    bool operator==(const LocalArray &other) const
    {
        if (len != other.len)
            return false;

        for (Size i = 0; i < len; i++) {
            if (data[i] != other.data[i])
                return false;
        }

        return true;
    }
    bool operator!=(const LocalArray &other) const { return !(*this == other); }

    T *AppendDefault(Size count = 1)
    {
        K_ASSERT(len <= N - count);

        T *first = data + len;
        if constexpr(!std::is_trivial<T>::value) {
            for (Size i = 0; i < count; i++) {
                new (data + len) T();
                len++;
            }
        } else {
            MemSet(first, 0, count * K_SIZE(T));
            len += count;
        }

        return first;
    }

    T *Append(const T &value)
    {
        K_ASSERT(len < N);

        T *it = data + len;
        *it = value;
        len++;

        return it;
    }
    T *Append(T &&value)
    {
        K_ASSERT(len < N);

        T *it = data + len;
        *it = std::move(value);
        len++;

        return it;
    }
    T *Append(Span<const T> values)
    {
        K_ASSERT(values.len <= N - len);

        T *it = data + len;
        for (Size i = 0; i < values.len; i++) {
            data[len + i] = values[i];
        }
        len += values.len;

        return it;
    }

    void RemoveFrom(Size first)
    {
        K_ASSERT(first >= 0 && first <= len);

        for (Size i = first; i < len; i++) {
            data[i] = T();
        }
        len = first;
    }
    void RemoveLast(Size count = 1)
    {
        K_ASSERT(count >= 0 && count <= len);
        RemoveFrom(len - count);
    }

    Span<T> Take() const { return Span<T>((T *)data, len); }
    Span<T> Take(Size offset, Size len) const { return Span<T>((T *)data, N).Take(offset, len); }
    Span<T> TakeAvailable() const { return Span<T>((T *)data + len, N - len); }

    template <typename U = T>
    Span<U> As() const { return Span<U>((U *)data, len); }
};

template <typename T>
class HeapArray {
    // StaticAssert(std::is_trivially_copyable<T>::value);

public:
    T *ptr = nullptr;
    Size len = 0;
    Size capacity = 0;
    Allocator *allocator = nullptr;

    typedef T value_type;
    typedef T *iterator_type;

    HeapArray() = default;
    HeapArray(Allocator *alloc, Size min_capacity = 0) : allocator(alloc)
        { SetCapacity(min_capacity); }
    HeapArray(Size min_capacity) { Reserve(min_capacity); }
    HeapArray(std::initializer_list<T> l)
    {
        Reserve(l.size());
        for (const T &it: l) {
            ptr[len++] = it;
        }
    }
    ~HeapArray() { Clear(); }

    HeapArray(HeapArray &&other) { *this = std::move(other); }
    HeapArray &operator=(HeapArray &&other)
    {
        Clear();
        MemMove(this, &other, K_SIZE(other));
        MemSet(&other, 0, K_SIZE(other));
        return *this;
    }
    HeapArray(const HeapArray &other) { *this = other; }
    HeapArray &operator=(const HeapArray &other)
    {
        RemoveFrom(0);
        Grow(other.capacity);
        if constexpr(!std::is_trivial<T>::value) {
            for (Size i = 0; i < other.len; i++) {
                ptr[i] = other.ptr[i];
            }
        } else {
            MemCpy(ptr, other.ptr, other.len * K_SIZE(*ptr));
        }
        len = other.len;
        return *this;
    }

    void Clear()
    {
        RemoveFrom(0);
        SetCapacity(0);
    }

    operator Span<T>() { return Span<T>(ptr, len); }
    operator Span<const T>() const { return Span<const T>(ptr, len); }

    T *begin() { return ptr; }
    const T *begin() const { return ptr; }
    T *end() { return ptr + len; }
    const T *end() const { return ptr + len; }

    Size Available() const { return capacity - len; }

    T &operator[](Size idx)
    {
        K_ASSERT(idx >= 0 && idx < len);
        return ptr[idx];
    }
    const T &operator[](Size idx) const
    {
        K_ASSERT(idx >= 0 && idx < len);
        return ptr[idx];
    }

    bool operator==(const HeapArray &other) const
    {
        if (len != other.len)
            return false;

        for (Size i = 0; i < len; i++) {
            if (ptr[i] != other.ptr[i])
                return false;
        }

        return true;
    }
    bool operator!=(const HeapArray &other) const { return !(*this == other); }

    void SetCapacity(Size new_capacity)
    {
        K_ASSERT(new_capacity >= 0);

        if (new_capacity != capacity) {
            if (len > new_capacity) {
                for (Size i = new_capacity; i < len; i++) {
                    ptr[i].~T();
                }
                len = new_capacity;
            }

            ptr = (T *)ResizeRaw(allocator, ptr, capacity * K_SIZE(T), new_capacity * K_SIZE(T));
            capacity = new_capacity;
        }
    }

    void Reserve(Size min_capacity)
    {
        if (min_capacity > capacity) {
            SetCapacity(min_capacity);
        }
    }

    T *Grow(Size reserve_capacity = 1)
    {
        K_ASSERT(capacity >= 0);
        K_ASSERT(reserve_capacity >= 0);
        K_ASSERT((size_t)capacity + (size_t)reserve_capacity <= K_SIZE_MAX);

        if (reserve_capacity > capacity - len) {
            Size needed = capacity + reserve_capacity;

            Size new_capacity;
            if (needed <= K_HEAPARRAY_BASE_CAPACITY) {
                new_capacity = K_HEAPARRAY_BASE_CAPACITY;
            } else {
                new_capacity = (Size)((double)(needed - 1) * K_HEAPARRAY_GROWTH_FACTOR);
            }

            SetCapacity(new_capacity);
        }

        return ptr + len;
    }

    void Trim(Size extra_capacity = 0) { SetCapacity(len + extra_capacity); }

    T *AppendDefault(Size count = 1)
    {
        Grow(count);

        T *first = ptr + len;
        if constexpr(!std::is_trivial<T>::value) {
            for (Size i = 0; i < count; i++) {
                new (ptr + len) T();
                len++;
            }
        } else {
            MemSet(first, 0, count * K_SIZE(T));
            len += count;
        }

        return first;
    }

    T *Append(const T &value)
    {
        Grow();

        T *first = ptr + len;
        if constexpr(!std::is_trivial<T>::value) {
            new (ptr + len) T;
        }
        ptr[len++] = value;
        return first;
    }
    T *Append(T &&value)
    {
        Grow();

        T *first = ptr + len;
        if constexpr(!std::is_trivial<T>::value) {
            new (ptr + len) T;
        }
        ptr[len++] = std::move(value);
        return first;
    }
    T *Append(Span<const T> values)
    {
        Grow(values.len);

        T *first = ptr + len;
        for (const T &value: values) {
            if constexpr(!std::is_trivial<T>::value) {
                new (ptr + len) T;
            }
            ptr[len++] = value;
        }
        return first;
    }

    void RemoveFrom(Size first)
    {
        K_ASSERT(first >= 0 && first <= len);

        if constexpr(!std::is_trivial<T>::value) {
            for (Size i = first; i < len; i++) {
                ptr[i].~T();
            }
        }
        len = first;
    }
    void RemoveLast(Size count = 1)
    {
        K_ASSERT(count >= 0 && count <= len);
        RemoveFrom(len - count);
    }

    Span<T> Take() const { return Span<T>(ptr, len); }
    Span<T> Take(Size offset, Size len) const { return Span<T>(ptr, this->len).Take(offset, len); }
    Span<T> TakeAvailable() const { return Span<T>((T *)ptr + len, capacity - len); }

    Span<T> Leak()
    {
        Span<T> span = *this;

        ptr = nullptr;
        len = 0;
        capacity = 0;

        return span;
    }
    Span<T> TrimAndLeak(Size extra_capacity = 0)
    {
        Trim(extra_capacity);
        return Leak();
    }

    template <typename U = T>
    Span<U> As() const { return Span<U>((U *)ptr, len); }
};

template <typename T, Size BucketSize = 64, typename AllocatorType = BlockAllocator>
class BucketList {
    K_DELETE_COPY(BucketList)

public:
    struct Bucket {
        T *values;
        AllocatorType allocator;
    };

    template <typename U>
    class Iterator {
    public:
        typedef std::bidirectional_iterator_tag iterator_category;
        typedef Size value_type;
        typedef Size difference_type;
        typedef Iterator *pointer;
        typedef Iterator &reference;

        U *queue = nullptr;
        Size bucket_idx;
        Size bucket_offset;
        Bucket *bucket;
        Bucket *next_bucket;

        Iterator() = default;
        Iterator(U *queue, Size bucket_idx, Size bucket_offset)
            : queue(queue), bucket_idx(bucket_idx), bucket_offset(bucket_offset),
              bucket(GetBucketSafe(bucket_idx)), next_bucket(GetBucketSafe(bucket_idx + 1)) {}

        T *operator->() { return &bucket->values[bucket_offset]; }
        const T *operator->() const { return &bucket->values[bucket_offset]; }
        T &operator*() { return bucket->values[bucket_offset]; }
        const T &operator*() const { return bucket->values[bucket_offset]; }

        Iterator &operator++()
        {
            if (++bucket_offset >= BucketSize) {
                bucket_idx++;
                bucket_offset = 0;

                // Allow iterator to go before start temporarily
                if (bucket_idx < 0) [[unlikely]]
                    return *this;

                if (next_bucket) {
                    // We support deletion of all values up to (and including) the current one.
                    // When the user does that, some or all front buckets may be gone, but we can
                    // use next_bucket to fix bucket_idx.
                    while (bucket_idx >= queue->buckets.len ||
                           queue->buckets[bucket_idx] != next_bucket) {
                        bucket_idx--;
                    }
                }

                bucket = GetBucketSafe(bucket_idx);
                next_bucket = GetBucketSafe(bucket_idx + 1);
            }

            return *this;
        }
        Iterator operator++(int)
        {
            Iterator ret = *this;
            ++(*this);
            return ret;
        }

        Iterator &operator--()
        {
            if (--bucket_offset < 0) {
                bucket_idx--;
                bucket_offset = BucketSize - 1;

                // Allow iterator to go before start temporarily
                if (bucket_idx >= 0) [[unlikely]] {
                    bucket = (bucket_idx >= 0) ? GetBucketSafe(bucket_idx) : nullptr;
                    next_bucket = (bucket_idx >= 0) ? GetBucketSafe(bucket_idx + 1) : nullptr;
                }
            }

            return *this;
        }
        Iterator operator--(int)
        {
            Iterator ret = *this;
            --(*this);
            return ret;
        }

        bool operator==(const Iterator &other) const
            { return queue == other.queue && bucket == other.bucket &&
                     bucket_offset == other.bucket_offset; }
        bool operator!=(const Iterator &other) const { return !(*this == other); }

    private:
        Bucket *GetBucketSafe(Size idx)
            { return idx < queue->buckets.len ? queue->buckets[idx] : nullptr; }
    };

    HeapArray<Bucket *> buckets;
    Size offset = 0;
    Size count = 0;

    typedef T value_type;
    typedef Iterator<BucketList> iterator_type;

    BucketList() {}
    BucketList(std::initializer_list<T> l)
    {
        for (const T &value: l) {
            Append(value);
        }
    }
    ~BucketList() { ClearBucketsAndValues(); }

    BucketList(BucketList &&other) { *this = std::move(other); }
    BucketList &operator=(BucketList &&other)
    {
        ClearBucketsAndValues();
        MemMove(this, &other, K_SIZE(other));
        MemSet(&other, 0, K_SIZE(other));
        return *this;
    }

    void Clear()
    {
        ClearBucketsAndValues();

        offset = 0;
        count = 0;
    }

    iterator_type begin() { return iterator_type(this, 0, offset); }
    Iterator<const BucketList<T, BucketSize>> begin() const { return Iterator<const BucketList>(this, 0, offset); }
    iterator_type end()
    {
        Size end_idx = offset + count;
        Size bucket_idx = end_idx / BucketSize;
        Size bucket_offset = end_idx % BucketSize;

        return iterator_type(this, bucket_idx, bucket_offset);
    }
    Iterator<const BucketList<T, BucketSize>> end() const
    {
        Size end_idx = offset + count;
        Size bucket_idx = end_idx / BucketSize;
        Size bucket_offset = end_idx % BucketSize;

        return Iterator<const BucketList>(this, bucket_idx, bucket_offset);
    }

    const T &operator[](Size idx) const
    {
        K_ASSERT(idx >= 0 && idx < count);

        idx += offset;
        Size bucket_idx = idx / BucketSize;
        Size bucket_offset = idx % BucketSize;

        return buckets[bucket_idx]->values[bucket_offset];
    }
    T &operator[](Size idx) { return (T &)(*(const BucketList *)this)[idx]; }

    T *AppendDefault(Allocator **out_alloc = nullptr)
    {
        Size bucket_idx = (offset + count) / BucketSize;
        Size bucket_offset = (offset + count) % BucketSize;

        if (bucket_idx >= buckets.len) {
            Bucket *new_bucket = AllocateOne<Bucket>(buckets.allocator);
            new (&new_bucket->allocator) AllocatorType();
            new_bucket->values = (T *)AllocateRaw(&new_bucket->allocator, BucketSize * K_SIZE(T));

            buckets.Append(new_bucket);
        }

        T *first = buckets[bucket_idx]->values + bucket_offset;
        new (first) T();

        count++;

        if (out_alloc) {
            *out_alloc = &buckets[bucket_idx]->allocator;
        }
        return first;
    }

    T *Append(const T &value, Allocator **out_alloc = nullptr)
    {
        T *it = AppendDefault(out_alloc);
        *it = value;
        return it;
    }

    void RemoveFrom(Size from)
    {
        K_ASSERT(from >= 0 && from <= count);

        if (from == count)
            return;
        if (!from) {
            Clear();
            return;
        }

        Size start_idx = offset + from;
        Size start_bucket_idx = start_idx / BucketSize;
        Size start_bucket_offset = start_idx % BucketSize;

        iterator_type from_it(this, start_bucket_idx, start_bucket_offset);
        DeleteValues(from_it, end());

        Size delete_idx = start_bucket_idx + !!start_bucket_offset;
        for (Size i = delete_idx; i < buckets.len; i++) {
            DeleteBucket(buckets[i]);
        }
        buckets.RemoveFrom(delete_idx);

        count = from;
    }
    void RemoveLast(Size n = 1)
    {
        K_ASSERT(n >= 0 && n <= count);
        RemoveFrom(count - n);
    }

    void RemoveFirst(Size n = 1)
    {
        K_ASSERT(n >= 0 && n <= count);

        if (n == count) {
            Clear();
            return;
        }

        Size end_idx = offset + n;
        Size end_bucket_idx = end_idx / BucketSize;
        Size end_bucket_offset = end_idx % BucketSize;

        iterator_type until_it(this, end_bucket_idx, end_bucket_offset);
        DeleteValues(begin(), until_it);

        if (end_bucket_idx) {
            for (Size i = 0; i < end_bucket_idx; i++) {
                DeleteBucket(buckets[i]);
            }
            MemMove(&buckets[0], &buckets[end_bucket_idx],
                    (buckets.len - end_bucket_idx) * K_SIZE(Bucket *));
            buckets.RemoveLast(end_bucket_idx);
        }

        offset = (offset + n) % BucketSize;
        count -= n;
    }

    void RemoveFrom(const iterator_type &it)
    {
        if (it == end())
            return;
        if (it == begin()) {
            Clear();
            return;
        }

        DeleteValues(it, end());

        Size delete_idx = it.bucket_idx + !!it.bucket_offset;
        for (Size i = delete_idx; i < buckets.len; i++) {
            DeleteBucket(buckets[i]);
        }
        buckets.RemoveFrom(delete_idx);

        count = (it.bucket_idx * BucketSize) + it.bucket_offset - offset;

        K_ASSERT(it == end());
    }
    void RemoveFrom(const Iterator<const BucketList<T, BucketSize>> &it) { return RemoveFrom((iterator_type)it); }

    void RemoveUntil(const iterator_type &it)
    {
        if (it == begin())
            return;
        if (it == end()) {
            Clear();
            return;
        }

        DeleteValues(begin(), it);

        if (it.bucket_idx) {
            for (Size i = 0; i < it.bucket_idx; i++) {
                DeleteBucket(buckets[i]);
            }
            MemMove(&buckets[0], &buckets[it.bucket_idx],
                    (buckets.len - it.bucket_idx) * K_SIZE(Bucket *));
            buckets.RemoveLast(it.bucket_idx);
        }

        Size count = it.bucket_idx * BucketSize + it.bucket_offset - offset;

        offset = (offset + count) % BucketSize;
        count -= count;
    }
    void RemoveUntil(const Iterator<const BucketList<T, BucketSize>> &it) { return RemoveUntil((iterator_type)it); }

    void Trim()
    {
        buckets.Trim();
    }

private:
    void ClearBucketsAndValues()
    {
        DeleteValues(begin(), end());

        for (Bucket *bucket: buckets) {
            DeleteBucket(bucket);
        }
        buckets.Clear();
    }

    void DeleteValues([[maybe_unused]] iterator_type begin,
                      [[maybe_unused]] iterator_type end)
    {
        if constexpr(!std::is_trivial<T>::value) {
            for (iterator_type it = begin; it != end; ++it) {
                it->~T();
            }
        }
    }

    void DeleteBucket(Bucket *bucket)
    {
        bucket->allocator.~AllocatorType();
        ReleaseOne(buckets.allocator, bucket);
    }
};

template <typename KeyType, typename ValueType,
          typename Handler = typename std::remove_pointer<ValueType>::type::HashHandler>
class HashTable {
public:
    template <typename T>
    class Iterator {
    public:
        typedef std::forward_iterator_tag iterator_category;
        typedef ValueType value_type;
        typedef Size difference_type;
        typedef Iterator *pointer;
        typedef Iterator &reference;

        T *table = nullptr;
        Size offset;

        Iterator() = default;
        Iterator(T *table, Size offset)
            : table(table), offset(offset - 1) { operator++(); }

        ValueType &operator*()
        {
            K_ASSERT(!table->IsEmpty(offset));
            return table->data[offset];
        }
        const ValueType &operator*() const
        {
            K_ASSERT(!table->IsEmpty(offset));
            return table->data[offset];
        }

        Iterator &operator++()
        {
            K_ASSERT(offset < table->capacity);
            while (++offset < table->capacity && table->IsEmpty(offset));
            return *this;
        }

        Iterator operator++(int)
        {
            Iterator ret = *this;
            ++(*this);
            return ret;
        }

        // Beware, in some cases a previous value may be seen again after this action
        void Remove()
        {
            table->Remove(&table->data[offset]);
            offset--;
        }

        bool operator==(const Iterator &other) const
            { return table == other.table && offset == other.offset; }
        bool operator!=(const Iterator &other) const { return !(*this == other); }
    };

    typedef Size value_type;
    typedef Iterator<HashTable> iterator_type;

    size_t *used = nullptr;
    ValueType *data = nullptr;
    Size count = 0;
    Size capacity = 0;
    Allocator *allocator = nullptr;

    HashTable() = default;
    HashTable(std::initializer_list<ValueType> l)
    {
        for (const ValueType &value: l) {
            Set(value);
        }
    }
    ~HashTable() { Clear(); }

    HashTable(HashTable &&other) { *this = std::move(other); }
    HashTable &operator=(HashTable &&other)
    {
        Clear();
        MemMove(this, &other, K_SIZE(other));
        MemSet(&other, 0, K_SIZE(other));
        return *this;
    }
    HashTable(const HashTable &other) { *this = other; }
    HashTable &operator=(const HashTable &other)
    {
        Clear();
        for (const ValueType &value: other) {
            Set(value);
        }
        return *this;
    }

    void Clear()
    {
        if constexpr(!std::is_trivial<ValueType>::value) {
            for (Size i = 0; i < capacity; i++) {
                data[i].~ValueType();
            }
        }

        count = 0;
        Rehash(0);
    }

    void RemoveAll()
    {
        if constexpr(!std::is_trivial<ValueType>::value) {
            for (Size i = 0; i < capacity; i++) {
                data[i].~ValueType();
            }
        }

        count = 0;
        if (used) {
            size_t len = (size_t)(capacity + (K_SIZE(size_t) * 8) - 1) / K_SIZE(size_t);
            MemSet(used, 0, len);
        }
    }

    Iterator<HashTable> begin() { return Iterator<HashTable>(this, 0); }
    Iterator<const HashTable> begin() const { return Iterator<const HashTable>(this, 0); }
    Iterator<HashTable> end() { return Iterator<HashTable>(this, capacity); }
    Iterator<const HashTable> end() const { return Iterator<const HashTable>(this, capacity); }

    template <typename T = KeyType>
    ValueType *Find(const T &key)
        { return (ValueType *)((const HashTable *)this)->Find(key); }
    template <typename T = KeyType>
    const ValueType *Find(const T &key) const
    {
        if (!capacity)
            return nullptr;

        uint64_t hash = Handler::HashKey(key);
        Size idx = HashToIndex(hash);
        return Find(&idx, key);
    }
    template <typename T = KeyType>
    ValueType FindValue(const T &key, const ValueType &default_value)
        { return (ValueType)((const HashTable *)this)->FindValue(key, default_value); }
    template <typename T = KeyType>
    const ValueType FindValue(const T &key, const ValueType &default_value) const
    {
        const ValueType *it = Find(key);
        return it ? *it : default_value;
    }

    ValueType *Set(const ValueType &value)
    {
        const KeyType &key = Handler::GetKey(value);

        bool inserted;
        ValueType *ptr = Insert(key, &inserted);

        *ptr = value;

        return ptr;
    }
    ValueType *SetDefault(const KeyType &key)
    {
        bool inserted;
        ValueType *ptr = Insert(key, &inserted);

        if (!inserted) {
            ptr->~ValueType();
        }
        new (ptr) ValueType();

        return ptr;
    }

    ValueType *InsertOrGet(const ValueType &value, bool *out_inserted = nullptr)
    {
        const KeyType &key = Handler::GetKey(value);

        bool inserted;
        ValueType *ptr = Insert(key, &inserted);

        if (inserted) {
            *ptr = value;
        }

        if (out_inserted) {
            *out_inserted = inserted;
        }
        return ptr;
    }
    ValueType *InsertOrGetDefault(const KeyType &key, bool *out_inserted = nullptr)
    {
        bool inserted;
        ValueType *ptr = Insert(key, &inserted);

        if (inserted) {
            new (ptr) ValueType();
        }

        if (out_inserted) {
            *out_inserted = inserted;
        }
        return ptr;
    }

    void Remove(ValueType *it)
    {
        if (!it)
            return;

        Size clear_idx = it - data;
        K_ASSERT(!IsEmpty(clear_idx));

        it->~ValueType();
        count--;
        MarkEmpty(clear_idx);

        // Move following slots if needed
        for (Size idx = NextIndex(clear_idx); !IsEmpty(idx); idx = NextIndex(idx)) {
            Size real_idx = KeyToIndex(Handler::GetKey(data[idx]));

            if (clear_idx <= idx) {
                if (clear_idx < real_idx && real_idx <= idx)
                    continue;
            } else {
                if (real_idx <= idx || clear_idx < real_idx)
                    continue;
            }

            MarkUsed(clear_idx);
            MarkEmpty(idx);
            MemMove(&data[clear_idx], &data[idx], K_SIZE(*data));

            clear_idx = idx;
        }

        new (&data[clear_idx]) ValueType();
    }
    template <typename T = KeyType>
    void Remove(const T &key) { Remove(Find(key)); }

    void Trim()
    {
        if (count) {
            Size new_capacity = (Size)1 << (64 - CountLeadingZeros((uint64_t)count));

            if (new_capacity < K_HASHTABLE_BASE_CAPACITY) {
                new_capacity = K_HASHTABLE_BASE_CAPACITY;
            } else if (count > (double)new_capacity * K_HASHTABLE_MAX_LOAD_FACTOR) {
                new_capacity *= 2;
            }

            Rehash(new_capacity);
        } else {
            Rehash(0);
        }
    }

private:
    template <typename T = KeyType>
    ValueType *Find(Size *idx, const T &key)
        { return (ValueType *)((const HashTable *)this)->Find(idx, key); }
    template <typename T = KeyType>
    const ValueType *Find(Size *idx, const T &key) const
    {
        if constexpr(std::is_pointer<ValueType>::value) {
            while (data[*idx]) {
                const KeyType &it_key = Handler::GetKey(data[*idx]);
                if (Handler::TestKeys(it_key, key))
                    return &data[*idx];
                *idx = NextIndex(*idx);
            }
            return nullptr;
        } else {
            while (!IsEmpty(*idx)) {
                const KeyType &it_key = Handler::GetKey(data[*idx]);
                if (Handler::TestKeys(it_key, key))
                    return &data[*idx];
                *idx = NextIndex(*idx);
            }
            return nullptr;
        }
    }

    ValueType *Insert(const KeyType &key, bool *out_inserted)
    {
        uint64_t hash = Handler::HashKey(key);

        if (capacity) {
            Size idx = HashToIndex(hash);
            ValueType *it = Find(&idx, key);
            if (!it) {
                if (count >= (Size)((double)capacity * K_HASHTABLE_MAX_LOAD_FACTOR)) {
                    Rehash(capacity << 1);
                    idx = HashToIndex(hash);
                    while (!IsEmpty(idx)) {
                        idx = NextIndex(idx);
                    }
                }
                count++;
                MarkUsed(idx);

                *out_inserted = true;
                return &data[idx];
            } else {
                *out_inserted = false;
                return it;
            }
        } else {
            Rehash(K_HASHTABLE_BASE_CAPACITY);

            Size idx = HashToIndex(hash);
            count++;
            MarkUsed(idx);

            *out_inserted = true;
            return &data[idx];
        }
    }

    void Rehash(Size new_capacity)
    {
        if (new_capacity == capacity)
            return;
        K_ASSERT(count <= new_capacity);

        size_t *old_used = used;
        ValueType *old_data = data;
        Size old_capacity = capacity;

        if (new_capacity) {
            Size used_size = (new_capacity + (K_SIZE(size_t) * 8) - 1) / K_SIZE(size_t);

            used = (size_t *)AllocateRaw(allocator, used_size);
            data = (ValueType *)AllocateRaw(allocator, new_capacity * K_SIZE(ValueType));
            capacity = new_capacity;

            for (Size i = 0; i < new_capacity; i++) {
                new (&data[i]) ValueType();
            }
            MemSet(used, 0, used_size);

            for (Size i = 0; i < old_capacity; i++) {
                if (!IsEmpty(old_used, i)) {
                    Size new_idx = KeyToIndex(Handler::GetKey(old_data[i]));
                    while (!IsEmpty(new_idx)) {
                        new_idx = NextIndex(new_idx);
                    }
                    MarkUsed(new_idx);
                    data[new_idx] = old_data[i];
                }
            }
        } else {
            used = nullptr;
            data = nullptr;
            capacity = 0;
        }

        ReleaseRaw(allocator, old_used, (old_capacity + (K_SIZE(size_t) * 8) - 1) / K_SIZE(size_t));
        ReleaseRaw(allocator, old_data, old_capacity * K_SIZE(ValueType));
    }

    inline void MarkUsed(Size idx)
    {
        used[idx / (K_SIZE(size_t) * 8)] |= (1ull << (idx % (K_SIZE(size_t) * 8)));
    }
    inline void MarkEmpty(Size idx)
    {
        used[idx / (K_SIZE(size_t) * 8)] &= ~(1ull << (idx % (K_SIZE(size_t) * 8)));
    }

    inline bool IsEmpty(size_t *used, Size idx) const
    {
        bool empty = !(used[idx / (K_SIZE(size_t) * 8)] & (1ull << (idx % (K_SIZE(size_t) * 8))));
        return empty;
    }
    inline bool IsEmpty(Size idx) const { return IsEmpty(used, idx); }

    inline Size HashToIndex(uint64_t hash) const
    {
        return (Size)(hash & (uint64_t)(capacity - 1));
    }
    inline Size KeyToIndex(const KeyType &key) const
    {
        uint64_t hash = Handler::HashKey(key);
        return HashToIndex(hash);
    }

    inline Size NextIndex(Size idx) const
    {
        return (idx + 1) & (capacity - 1);
    }
};

template <typename T>
class HashTraits {
public:
    static uint64_t Hash(const T &key) { return key.Hash(); }
    static bool Test(const T &key1, const T &key2) { return key1 == key2; }
};

// Stole the Hash function from Thomas Wang (see here: https://gist.github.com/badboy/6267743)
#define DEFINE_INTEGER_HASH_TRAITS_32(Type, ...) \
    template <> \
    class HashTraits<Type> { \
    public: \
        static __VA_ARGS__ uint64_t Hash(Type key) \
        { \
            uint32_t hash = (uint32_t)key; \
             \
            hash = (hash ^ 61) ^ (hash >> 16); \
            hash += hash << 3; \
            hash ^= hash >> 4; \
            hash *= 0x27D4EB2D; \
            hash ^= hash >> 15; \
             \
            return (uint64_t)hash; \
        } \
         \
        static __VA_ARGS__ bool Test(Type key1, Type key2) { return key1 == key2; } \
    }
#define DEFINE_INTEGER_HASH_TRAITS_64(Type, ...) \
    template <> \
    class HashTraits<Type> { \
    public: \
        static __VA_ARGS__ uint64_t Hash(Type key) \
        { \
            uint64_t hash = (uint64_t)key; \
             \
            hash = (~hash) + (hash << 18); \
            hash ^= hash >> 31; \
            hash *= 21; \
            hash ^= hash >> 11; \
            hash += hash << 6; \
            hash ^= hash >> 22; \
             \
            return hash; \
        } \
         \
        static __VA_ARGS__ bool Test(Type key1, Type key2) { return key1 == key2; } \
    }

DEFINE_INTEGER_HASH_TRAITS_32(char, constexpr);
DEFINE_INTEGER_HASH_TRAITS_32(unsigned char, constexpr);
DEFINE_INTEGER_HASH_TRAITS_32(short, constexpr);
DEFINE_INTEGER_HASH_TRAITS_32(unsigned short, constexpr);
DEFINE_INTEGER_HASH_TRAITS_32(int, constexpr);
DEFINE_INTEGER_HASH_TRAITS_32(unsigned int, constexpr);
#if defined(__LP64__)
    DEFINE_INTEGER_HASH_TRAITS_64(long, constexpr);
    DEFINE_INTEGER_HASH_TRAITS_64(unsigned long, constexpr);
#else
    DEFINE_INTEGER_HASH_TRAITS_32(long, constexpr);
    DEFINE_INTEGER_HASH_TRAITS_32(unsigned long, constexpr);
#endif
DEFINE_INTEGER_HASH_TRAITS_64(long long, constexpr);
DEFINE_INTEGER_HASH_TRAITS_64(unsigned long long, constexpr);
#if K_SIZE_MAX == INT64_MAX
    DEFINE_INTEGER_HASH_TRAITS_64(void *);
    DEFINE_INTEGER_HASH_TRAITS_64(const void *);
#else
    DEFINE_INTEGER_HASH_TRAITS_32(void *);
    DEFINE_INTEGER_HASH_TRAITS_32(const void *);
#endif

#undef DEFINE_INTEGER_HASH_TRAITS_32
#undef DEFINE_INTEGER_HASH_TRAITS_64

// MurmurHash2
static inline uint64_t HashStr(Span<const char> str)
{
    const uint64_t Seed = 0;
    const uint64_t Mult = (((uint64_t)0xc6a4a793ull) << 32ull) + (uint64_t)0x5bd1e995ull;

    const auto unaligned_load =
        [](const char *p) {
            uint64_t result;
            memcpy(&result, p, sizeof(result));
            return result;
        };
    const auto load_bytes = [](const char *p, int n) {
        uint64_t result = 0;

        n--;
        do {
            result = (result << 8) + (uint8_t)p[n];
        } while (--n >= 0);

        return result;
    };
    const auto shift_mix = [](uint64_t v) { return v ^ (v >> 47); };

    const char *end = str.ptr + (str.len & ~0x7);
    int remain = (int)(str.len & 0x7);

    uint64_t hash = Seed ^ (str.len * Mult);

    for (const char *p = str.ptr; p != end; p += 8) {
        uint64_t u64 = shift_mix(unaligned_load(p) * Mult) * Mult;
        hash = (hash ^ u64) * Mult;
    }
    if (remain) {
        uint64_t u64 = load_bytes(end, remain);
        hash = (hash ^ u64) * Mult;
    }

    hash = shift_mix(hash) * Mult;
    hash = shift_mix(hash);

    return hash;
}

static inline uint64_t HashStr(const char *str)
{
    Span<const char> span = str;
    return HashStr(span);
}

template <>
class HashTraits<const char *> {
public:
    static uint64_t Hash(Span<const char> key) { return HashStr(key); }
    static uint64_t Hash(const char *key) { return HashStr(key); }

    static bool Test(const char *key1, const char *key2) { return TestStr(key1, key2); }
    static bool Test(const char *key1, Span<const char> key2) { return key2 == key1; }
};

template <>
class HashTraits<Span<const char>> {
public:
    static uint64_t Hash(Span<const char> key) { return HashStr(key); }
    static uint64_t Hash(const char *key) { return HashStr(key); }

    static bool Test(Span<const char> key1, Span<const char> key2) { return key1 == key2; }
    static bool Test(Span<const char> key1, const char * key2) { return key1 == key2; }
};

#define K_HASHTABLE_HANDLER_EX_N(Name, ValueType, KeyType, KeyMember, HashFunc, TestFunc) \
    class Name { \
    public: \
        static KeyType GetKey(const ValueType &value) \
            { return (KeyType)(value.KeyMember); } \
        static KeyType GetKey(const ValueType *value) \
            { return (KeyType)(value->KeyMember); } \
        template <typename TestKey> \
        static uint64_t HashKey(TestKey key) \
            { return HashFunc(key); } \
        template <typename TestKey> \
        static bool TestKeys(KeyType key1, TestKey key2) \
            { return TestFunc((key1), (key2)); } \
    }
#define K_HASHTABLE_HANDLER_EX(ValueType, KeyType, KeyMember, HashFunc, TestFunc) \
    K_HASHTABLE_HANDLER_EX_N(HashHandler, ValueType, KeyType, KeyMember, HashFunc, TestFunc)
#define K_HASHTABLE_HANDLER(ValueType, KeyMember) \
    K_HASHTABLE_HANDLER_EX(ValueType, decltype(ValueType::KeyMember), KeyMember, HashTraits<decltype(ValueType::KeyMember)>::Hash, HashTraits<decltype(ValueType::KeyMember)>::Test)
#define K_HASHTABLE_HANDLER_N(Name, ValueType, KeyMember) \
    K_HASHTABLE_HANDLER_EX_N(Name, ValueType, decltype(ValueType::KeyMember), KeyMember, HashTraits<decltype(ValueType::KeyMember)>::Hash, HashTraits<decltype(ValueType::KeyMember)>::Test)
#define K_HASHTABLE_HANDLER_T(ValueType, KeyType, KeyMember) \
    K_HASHTABLE_HANDLER_EX(ValueType, KeyType, KeyMember, HashTraits<KeyType>::Hash, HashTraits<KeyType>::Test)
#define K_HASHTABLE_HANDLER_NT(Name, ValueType, KeyType, KeyMember) \
    K_HASHTABLE_HANDLER_EX_N(Name, ValueType, KeyType, KeyMember, HashTraits<KeyType>::Hash, HashTraits<KeyType>::Test)

template <typename KeyType, typename ValueType>
class HashMap {
public:
    struct Bucket {
        KeyType key;
        ValueType value;

        K_HASHTABLE_HANDLER(Bucket, key);
    };

    HashTable<KeyType, Bucket> table;

    HashMap() = default;
    HashMap(std::initializer_list<Bucket> l) : table(l) {}

    void Clear() { table.Clear(); }
    void RemoveAll() { table.RemoveAll(); }

    template <typename T = KeyType>
    ValueType *Find(const T &key)
        { return (ValueType *)((const HashMap *)this)->Find(key); }
    template <typename T = KeyType>
    const ValueType *Find(const T &key) const
    {
        const Bucket *table_it = table.Find(key);
        return table_it ? &table_it->value : nullptr;
    }
    template <typename T = KeyType>
    ValueType FindValue(const T &key, const ValueType &default_value)
        { return (ValueType)((const HashMap *)this)->FindValue(key, default_value); }
    template <typename T = KeyType>
    const ValueType FindValue(const T &key, const ValueType &default_value) const
    {
        const ValueType *it = Find(key);
        return it ? *it : default_value;
    }

    ValueType *Set(const KeyType &key, const ValueType &value)
        { return &table.Set({ key, value })->value; }
    Bucket *SetDefault(const KeyType &key)
    {
        Bucket *table_it = table.SetDefault(key);
        table_it->key = key;
        return table_it;
    }

    ValueType *InsertOrGet(const KeyType &key, const ValueType &value, bool *out_inserted = nullptr)
    {
        Bucket *ptr = table.InsertOrGet({ key, value }, out_inserted);
        return &ptr->value;
    }
    Bucket *InsertOrGetDefault(const KeyType &key, bool *out_inserted = nullptr)
    {
        bool inserted;
        Bucket *ptr = table.InsertOrGetDefault(key, &inserted);

        if (inserted) {
            ptr->key = key;
        }

        if (out_inserted) {
            *out_inserted = inserted;
        }
        return ptr;
    }

    void Remove(ValueType *it)
    {
        if (!it)
            return;
        table.Remove((Bucket *)((uint8_t *)it - offsetof(Bucket, value)));
    }
    void Remove(Bucket *it)
    {
        if (!it)
            return;
        table.Remove(it);
    }
    template <typename T = KeyType>
    void Remove(const KeyType &key) { Remove(Find(key)); }

    void Trim() { table.Trim(); }
};

template <typename ValueType>
class HashSet {
    class Handler {
    public:
        static ValueType GetKey(const ValueType &value) { return value; }
        static ValueType GetKey(const ValueType *value) { return *value; }
        static uint64_t HashKey(const ValueType &value)
            { return HashTraits<ValueType>::Hash(value); }
        static bool TestKeys(const ValueType &value1, const ValueType &value2)
            { return HashTraits<ValueType>::Test(value1, value2); }
    };

public:
    HashTable<ValueType, ValueType, Handler> table;

    HashSet() = default;
    HashSet(std::initializer_list<ValueType> l) : table(l) {}

    void Clear() { table.Clear(); }
    void RemoveAll() { table.RemoveAll(); }

    template <typename T = ValueType>
    ValueType *Find(const T &value) { return table.Find(value); }
    template <typename T = ValueType>
    const ValueType *Find(const T &value) const { return table.Find(value); }
    template <typename T = ValueType>
    ValueType FindValue(const T &value, const ValueType &default_value)
        { return table.FindValue(value, default_value); }
    template <typename T = ValueType>
    const ValueType FindValue(const T &value, const ValueType &default_value) const
        { return table.FindValue(value, default_value); }

    ValueType *Set(const ValueType &value) { return table.Set(value); }

    ValueType *InsertOrGet(const ValueType &value, bool *out_inserted = nullptr)
        { return table.InsertOrGet(value, out_inserted); }
    bool InsertOrFail(const ValueType &value)
    {
        bool inserted;
        InsertOrGet(value, &inserted);
        return inserted;
    }

    void Remove(ValueType *it) { table.Remove(it); }
    template <typename T = ValueType>
    void Remove(const T &value) { Remove(Find(value)); }

    void Trim() { table.Trim(); }

private:
};

// ------------------------------------------------------------------------
// Date
// ------------------------------------------------------------------------

union LocalDate {
    int32_t value;
    struct {
#if defined(K_BIG_ENDIAN)
        int16_t year;
        int8_t month;
        int8_t day;
#else
        int8_t day;
        int8_t month;
        int16_t year;
#endif
    } st;

    LocalDate() = default;
#if defined(K_BIG_ENDIAN)
    LocalDate(int16_t year, int8_t month, int8_t day)
        : st({ year, month, day }) { K_ASSERT(IsValid()); }
#else
    LocalDate(int16_t year, int8_t month, int8_t day)
        : st({ day, month, year }) { K_ASSERT(IsValid()); }
#endif

    static inline bool IsLeapYear(int16_t year)
    {
        return (year % 4 == 0 && year % 100 != 0) || year % 400 == 0;
    }
    static inline int8_t DaysInMonth(int16_t year, int8_t month)
    {
        static const int8_t DaysPerMonth[12] = { 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31 };
        return (int8_t)(DaysPerMonth[month - 1] + (month == 2 && IsLeapYear(year)));
    }

    static LocalDate FromJulianDays(int days);
    static LocalDate FromCalendarDate(int days) { return LocalDate::FromJulianDays(days + 2440588); }

    bool IsValid() const
    {
        if (st.year < -4712)
            return false;
        if (st.month < 1 || st.month > 12)
            return false;
        if (st.day < 1 || st.day > DaysInMonth(st.year, st.month))
            return false;

        return true;
    }

    bool operator==(LocalDate other) const { return value == other.value; }
    bool operator!=(LocalDate other) const { return value != other.value; }
    bool operator>(LocalDate other) const { return value > other.value; }
    bool operator>=(LocalDate other) const { return value >= other.value; }
    bool operator<(LocalDate other) const { return value < other.value; }
    bool operator<=(LocalDate other) const { return value <= other.value; }

    int ToJulianDays() const;
    int ToCalendarDate() const { return ToJulianDays() - 2440588; }

    int IsoWeekDay() const;

    int operator-(LocalDate other) const
        { return ToJulianDays() - other.ToJulianDays(); }

    LocalDate operator+(int days) const
    {
        if (days < 5 && days > -5) {
            LocalDate date = *this;
            if (days > 0) {
                while (days--) {
                    ++date;
                }
            } else {
                while (days++) {
                    --date;
                }
            }
            return date;
        } else {
            return LocalDate::FromJulianDays(ToJulianDays() + days);
        }
    }
    // That'll fail with INT_MAX days but that's far more days than can
    // be represented as a date anyway
    LocalDate operator-(int days) const { return *this + (-days); }

    LocalDate &operator+=(int days) { *this = *this + days; return *this; }
    LocalDate &operator-=(int days) { *this = *this - days; return *this; }
    LocalDate &operator++();
    LocalDate operator++(int) { LocalDate date = *this; ++(*this); return date; }
    LocalDate &operator--();
    LocalDate operator--(int) { LocalDate date = *this; --(*this); return date; }

    uint64_t Hash() const { return HashTraits<int32_t>::Hash(value); }
};

// ------------------------------------------------------------------------
// Time
// ------------------------------------------------------------------------

int64_t GetUnixTime();

struct TimeSpec {
    int16_t year;
    int8_t month;
    int8_t day;
    int8_t week_day; // 1 (monday) to 7 (sunday)

    int8_t hour;
    int8_t min;
    int8_t sec;
    int16_t msec;

    int16_t offset; // minutes
};

TimeSpec DecomposeTimeUTC(int64_t time);
TimeSpec DecomposeTimeLocal(int64_t time);
int64_t ComposeTimeUTC(const TimeSpec &spec);

// ------------------------------------------------------------------------
// Clock
// ------------------------------------------------------------------------

#if defined(_MSC_VER) && !defined(_M_ARM64)
static inline int64_t GetCoreCycles()
{
    return (int64_t)__rdtsc();
}
#elif defined(__i386__) || defined(__x86_64__)
static inline int64_t GetCoreCycles()
{
    uint32_t counter_low, counter_high;
    __asm__ __volatile__ ("cpuid; rdtsc"
                          : "=a" (counter_low), "=d" (counter_high)
                          : : "%ebx", "%ecx");
    int64_t counter = ((int64_t)counter_high << 32) | counter_low;
    return counter;
}
#elif defined(__aarch64__)
static inline int64_t GetCoreCycles()
{
    uint64_t counter;
    __asm__ __volatile__ ("mrs %0, cntvct_el0" : "=r" (counter));
    return (int64_t)counter;
}
#elif defined(__riscv)
static inline int64_t GetCoreCycles()
{
    uint64_t counter;
    __asm__ __volatile__("csrr %0, mcycle" : "=r"(counter));
    return (int64_t)counter;
}
#endif

int64_t GetMonotonicClock();

// ------------------------------------------------------------------------
// Format
// ------------------------------------------------------------------------

enum class FmtType {
    Str,
    PadStr,
    RepeatStr,
    Char,
    Buffer,
    Custom,
    Bool,
    Integer,
    Unsigned,
    Float,
    Double,
    Binary,
    Octal,
    BigHex,
    SmallHex,
    BigBytes,
    SmallBytes,
    MemorySize,
    DiskSize,
    Date,
    TimeBasic,
    TimeIso,
    TimeNice,
    List,
    FlagNames,
    FlagOptions,
    Random,
    SafeStr,
    SafeChar
};

template <typename T>
class FmtTraits {
public:
    static void Format(const T &obj, FunctionRef<void(Span<const char>)> append) { return obj.Format(append); }
};

class FmtCustom {
    struct Base {
        virtual void Format(FunctionRef<void(Span<const char>)> append) const = 0;
    };

    template <typename T>
    struct Concrete: public Base {
        typedef void FuncType(const T &obj, FunctionRef<void(Span<const char>)>);

        const T *obj;
        FuncType *func;

        Concrete(const T *obj, FuncType *func) : obj(obj), func(func) {}

        void Format(FunctionRef<void(Span<const char>)> append) const override { func(*obj, append); }
    };

    // Concrete has 3 pointers (vtable, obj, func), so size should match!
    void *raw[3];

public:
    FmtCustom() = default;

    template <typename T>
    explicit FmtCustom(const T &obj)
    {
        static_assert(K_SIZE(*this) <= K_SIZE(raw));
        new (raw) Concrete<T>(&obj, &FmtTraits<T>::Format);
    }

    void Format(FunctionRef<void(Span<const char>)> append) const
    {
        const Base *ptr = reinterpret_cast<const Base *>(&raw);
        ptr->Format(append);
    }
};

class FmtArg {
public:
    FmtType type;
    union {
        Span<const char> str;
        struct {
            const char *str;
            int count;
        } repeat;
        char buf[32];
        char ch;
        FmtCustom custom;
        bool b;
        int64_t i;
        uint64_t u;
        Span<const uint8_t> hex;
        struct {
            float value;
            int min_prec;
            int max_prec;
        } f;
        struct {
            double value;
            int min_prec;
            int max_prec;
        } d;
        const void *ptr;
        LocalDate date;
        struct {
            TimeSpec spec;
            bool ms;
        } time;
        struct {
            Size len;
            const char *chars;
        } random;
        struct {
            uint64_t flags;
            union {
                Span<const char *const> names;
                Span<const struct OptionDesc> options;
            } u;
            const char *separator;
        } list;
    } u;

    int pad = 0;
    char padding = 0;

    FmtArg() = default;
    FmtArg(const FmtArg &other) = default;
    FmtArg(std::nullptr_t) : FmtArg(FmtType::Str) { u.str = "(null)"; }
    FmtArg(const char *str) : FmtArg(FmtType::Str) { u.str = str ? str : "(null)"; }
    FmtArg(Span<const char> str) : FmtArg(FmtType::Str) { u.str = str; }
    FmtArg(char c) : FmtArg(FmtType::Char) { u.ch = c; }
    FmtArg(const FmtCustom &custom) : FmtArg(FmtType::Custom) { u.custom = custom; }
    FmtArg(bool b) : FmtArg(FmtType::Bool) { u.b = b; }
    FmtArg(unsigned char i) : FmtArg(FmtType::Unsigned) { u.u = i; }
    FmtArg(short i) : FmtArg(FmtType::Integer) { u.i = i; }
    FmtArg(unsigned short i) : FmtArg(FmtType::Unsigned) { u.u = i; }
    FmtArg(int i) : FmtArg(FmtType::Integer) { u.i = i; }
    FmtArg(unsigned int i) : FmtArg(FmtType::Unsigned) { u.u = i; }
    FmtArg(long i) : FmtArg(FmtType::Integer) { u.i = i; }
    FmtArg(unsigned long i) : FmtArg(FmtType::Unsigned) { u.u = i; }
    FmtArg(long long i) : FmtArg(FmtType::Integer) { u.i = i; }
    FmtArg(unsigned long long i) : FmtArg(FmtType::Unsigned) { u.u = i; }
    FmtArg(float f) : FmtArg(FmtType::Float) { u.f = { f, 0, INT_MAX }; }
    FmtArg(double d) : FmtArg(FmtType::Double) { u.d = { d, 0, INT_MAX }; }
    FmtArg(const void *ptr) : FmtArg(FmtType::BigHex) { u.u = (uint64_t)ptr; }
    FmtArg(const LocalDate &date) : FmtArg(FmtType::Date) { u.date = date; }

protected:
    FmtArg(FmtType type) : type(type) {}
};

class FmtSafe: public FmtArg {
public:
    FmtSafe() = default;
    FmtSafe(FmtArg arg) : FmtArg(arg) {}
    FmtSafe(std::nullptr_t) : FmtArg(FmtType::Str) { u.str = "(null)"; }
    FmtSafe(const char *str) : FmtArg(FmtType::SafeStr) { u.str = str ? str : "(null)"; } // safe
    FmtSafe(Span<const char> str) : FmtArg(FmtType::SafeStr) { u.str = str; } // safe
    FmtSafe(char c) : FmtArg(FmtType::SafeChar) { u.ch = c; } // safe
    FmtSafe(const FmtCustom &custom) : FmtArg(custom) {}
    FmtSafe(bool b) : FmtArg(b) {}
    FmtSafe(unsigned char i) : FmtArg(i) {}
    FmtSafe(short i) : FmtArg(i) {}
    FmtSafe(unsigned short i) : FmtArg(i) {}
    FmtSafe(int i) : FmtArg(i) {}
    FmtSafe(unsigned int i) : FmtArg(i) {}
    FmtSafe(long i) : FmtArg(i) {}
    FmtSafe(unsigned long i) : FmtArg(i) {}
    FmtSafe(long long i) : FmtArg(i) {}
    FmtSafe(unsigned long long i) : FmtArg(i) {}
    FmtSafe(float f) : FmtArg(f) {}
    FmtSafe(double d) : FmtArg(d) {}
    FmtSafe(const void *ptr) : FmtArg(ptr) {}
    FmtSafe(const LocalDate &date) : FmtArg(date) {}
};

static inline FmtArg FmtInt(long long i, int pad = 0, char padding = '0')
{
    FmtArg arg;
    arg.type = FmtType::Integer;
    arg.u.i = i;
    arg.pad = pad;
    arg.padding = padding;
    return arg;
}
static inline FmtArg FmtInt(unsigned long long u, int pad = 0, char padding = '0')
{
    FmtArg arg;
    arg.type = FmtType::Unsigned;
    arg.u.u = u;
    arg.pad = pad;
    arg.padding = padding;
    return arg;
}
static inline FmtArg FmtInt(unsigned char u, int pad = 0, char padding = '0') { return FmtInt((unsigned long long)u, pad, padding); }
static inline FmtArg FmtInt(short i, int pad = 0, char padding = '0') { return FmtInt((long long)i, pad, padding); }
static inline FmtArg FmtInt(unsigned short u, int pad = 0, char padding = '0') { return FmtInt((unsigned long long)u, pad, padding); }
static inline FmtArg FmtInt(int i, int pad = 0, char padding = '0') { return FmtInt((long long)i, pad, padding); }
static inline FmtArg FmtInt(unsigned int u, int pad = 0, char padding = '0') { return FmtInt((unsigned long long)u, pad, padding); }
static inline FmtArg FmtInt(long i, int pad = 0, char padding = '0') { return FmtInt((long long)i, pad, padding); }
static inline FmtArg FmtInt(unsigned long u, int pad = 0, char padding = '0') { return FmtInt((unsigned long long)u, pad, padding); }

static inline FmtArg FmtBin(uint64_t u, int pad = 0, char padding = '0')
{
    FmtArg arg;
    arg.type = FmtType::Binary;
    arg.u.u = u;
    arg.pad = pad;
    arg.padding = padding;
    return arg;
}
static inline FmtArg FmtOctal(uint64_t u, int pad = 0, char padding = '0')
{
    FmtArg arg;
    arg.type = FmtType::Octal;
    arg.u.u = u;
    arg.pad = pad;
    arg.padding = padding;
    return arg;
}
static inline FmtArg FmtHex(uint64_t u, int pad = 0, char padding = '0')
{
    FmtArg arg;
    arg.type = FmtType::BigHex;
    arg.u.u = u;
    arg.pad = pad;
    arg.padding = padding;
    return arg;
}
static inline FmtArg FmtHexSmall(uint64_t u, int pad = 0, char padding = '0')
{
    FmtArg arg;
    arg.type = FmtType::SmallHex;
    arg.u.u = u;
    arg.pad = pad;
    arg.padding = padding;
    return arg;
}

static inline FmtArg FmtFloat(float f, int min_prec, int max_prec)
{
    FmtArg arg;
    arg.type = FmtType::Float;
    arg.u.f.value = f;
    arg.u.f.min_prec = min_prec;
    arg.u.f.max_prec = max_prec;
    return arg;
}
static inline FmtArg FmtFloat(float f, int prec) { return FmtFloat(f, prec, prec); }
static inline FmtArg FmtFloat(float f) { return FmtFloat(f, 0, INT_MAX); }

static inline FmtArg FmtDouble(double d, int min_prec, int max_prec)
{
    FmtArg arg;
    arg.type = FmtType::Double;
    arg.u.d.value = d;
    arg.u.d.min_prec = min_prec;
    arg.u.d.max_prec = max_prec;
    return arg;
}
static inline FmtArg FmtDouble(double d, int prec) { return FmtDouble(d, prec, prec); }
static inline FmtArg FmtDouble(double d) { return FmtDouble(d, 0, INT_MAX); }

static inline FmtArg FmtMemSize(int64_t size)
{
    FmtArg arg;
    arg.type = FmtType::MemorySize;
    arg.u.i = size;
    return arg;
}
static inline FmtArg FmtDiskSize(int64_t size)
{
    FmtArg arg;
    arg.type = FmtType::DiskSize;
    arg.u.i = size;
    return arg;
}

static inline FmtArg FmtTimeBasic(TimeSpec spec, bool ms = false)
{
    FmtArg arg;
    arg.type = FmtType::TimeBasic;
    arg.u.time.spec = spec;
    arg.u.time.ms = ms;
    return arg;
}

static inline FmtArg FmtTimeIso(TimeSpec spec, bool ms = false)
{
    FmtArg arg;
    arg.type = FmtType::TimeIso;
    arg.u.time.spec = spec;
    arg.u.time.ms = ms;
    return arg;
}

static inline FmtArg FmtTimeNice(TimeSpec spec, bool ms = false)
{
    FmtArg arg;
    arg.type = FmtType::TimeNice;
    arg.u.time.spec = spec;
    arg.u.time.ms = ms;
    return arg;
}

static inline FmtArg FmtList(Span<const char *const> names, const char *sep = ", ")
{
    FmtArg arg;
    arg.type = FmtType::List;
    arg.u.list.u.names = names;
    arg.u.list.separator = sep;
    return arg;
}
static inline FmtArg FmtFlags(uint64_t flags, Span<const char *const> names, const char *sep = ", ")
{
    FmtArg arg;
    arg.type = FmtType::FlagNames;
    arg.u.list.flags = flags & ((1ull << names.len) - 1);
    arg.u.list.u.names = names;
    arg.u.list.separator = sep;
    return arg;
}
static inline FmtArg FmtFlags(uint64_t flags, Span<const struct OptionDesc> options, const char *sep = ", ")
{
    FmtArg arg;
    arg.type = FmtType::FlagOptions;
    arg.u.list.flags = flags & ((1ull << options.len) - 1);
    arg.u.list.u.options = options;
    arg.u.list.separator = sep;
    return arg;
}

static inline FmtArg FmtPad(Span<const char> str, int pad, char padding = ' ')
{
    FmtArg arg;
    arg.type = FmtType::PadStr;
    arg.u.str = str;
    arg.pad = pad;
    arg.padding = padding;
    return arg;
}
static inline FmtArg FmtRepeat(const char *str, int count)
{
    FmtArg arg;
    arg.type = FmtType::RepeatStr;
    arg.u.repeat.str = str;
    arg.u.repeat.count = count;
    return arg;
}

static inline FmtArg FmtHex(Span<const uint8_t> buf)
{
    FmtArg arg;
    arg.type = FmtType::BigBytes;
    arg.u.hex = buf;
    return arg;
}
static inline FmtArg FmtHexSmall(Span<const uint8_t> buf)
{
    FmtArg arg;
    arg.type = FmtType::SmallBytes;
    arg.u.hex = buf;
    return arg;
}

static inline FmtArg FmtRandom(Size len, const char *chars = nullptr)
{
    K_ASSERT(len < 256);
    len = std::min(len, (Size)256);

    FmtArg arg;
    arg.type = FmtType::Random;
    arg.u.random.len = len;
    arg.u.random.chars = chars;
    return arg;
}

class FmtUpperAscii {
    Span<const char> str;

public:
    FmtUpperAscii(Span<const char> str) : str(str) {}

    void Format(FunctionRef<void(Span<const char>)> append) const;
    operator FmtArg() const { return FmtCustom(*this); }
};

class FmtLowerAscii {
    Span<const char> str;

public:
    FmtLowerAscii(Span<const char> str) : str(str) {}

    void Format(FunctionRef<void(Span<const char>)> append) const;
    operator FmtArg() const { return FmtCustom(*this); }
};

class FmtUrlSafe {
    Span<const char> str;
    const char *passthrough;

public:
    FmtUrlSafe(Span<const char> str, const char *passthrough)
        : str(str), passthrough(passthrough) {}

    void Format(FunctionRef<void(Span<const char>)> append) const;
    operator FmtArg() const { return FmtCustom(*this); }
};

class FmtXmlSafe {
    Span<const char> str;

public:
    FmtXmlSafe(Span<const char> str) : str(str) {}

    void Format(FunctionRef<void(Span<const char>)> append) const;
    operator FmtArg() const { return FmtCustom(*this); }
};

class FmtEscape {
    Span<const char> str;
    char quote;

public:
    FmtEscape(Span<const char> str, char quote) : str(str), quote(quote) {}

    void Format(FunctionRef<void(Span<const char>)> append) const;
    operator FmtArg() const { return FmtCustom(*this); }
};

FmtArg FmtVersion(int64_t version, int parts, int by);

enum class LogLevel {
    Debug,
    Info,
    Warning,
    Error
};

Span<char> FmtFmt(const char *fmt, Span<const FmtArg> args, bool vt100, Span<char> out_buf);
Span<char> FmtFmt(const char *fmt, Span<const FmtArg> args, bool vt100, HeapArray<char> *out_buf);
Span<char> FmtFmt(const char *fmt, Span<const FmtArg> args, bool vt100, Allocator *alloc);
void FmtFmt(const char *fmt, Span<const FmtArg> args, bool vt100, FunctionRef<void(Span<const char>)> append);
void PrintFmt(const char *fmt, Span<const FmtArg> args, StreamWriter *out_st);
void PrintLnFmt(const char *fmt, Span<const FmtArg> args, StreamWriter *out_st);

#define DEFINE_FMT_VARIANT(Ret, Type) \
    static inline Ret Fmt(Type out, const char *fmt) \
    { \
        return FmtFmt(fmt, {}, false, out); \
    } \
    static inline Ret Fmt(Type out, bool vt100, const char *fmt) \
    { \
        return FmtFmt(fmt, {}, vt100, out); \
    } \
    template <typename... Args> \
    Ret Fmt(Type out, const char *fmt, Args... args) \
    { \
        const FmtArg fmt_args[] = { FmtArg(args)... }; \
        return FmtFmt(fmt, fmt_args, false, out); \
    } \
    template <typename... Args> \
    Ret Fmt(Type out, bool vt100, const char *fmt, Args... args) \
    { \
        const FmtArg fmt_args[] = { FmtArg(args)... }; \
        return FmtFmt(fmt, fmt_args, vt100, out); \
    }
#define DEFINE_PRINT_VARIANT(Name, Ret, Type) \
    static inline Ret Name(Type out, const char *fmt) \
    { \
        return Name##Fmt(fmt, {}, out); \
    } \
    template <typename... Args> \
    Ret Name(Type out, const char *fmt, Args... args) \
    { \
        const FmtArg fmt_args[] = { FmtArg(args)... }; \
        return Name##Fmt(fmt, fmt_args, out); \
    }

DEFINE_FMT_VARIANT(Span<char>, Span<char>)
DEFINE_FMT_VARIANT(Span<char>, HeapArray<char> *)
DEFINE_FMT_VARIANT(Span<char>, Allocator *)
DEFINE_FMT_VARIANT(void, FunctionRef<void(Span<const char>)>)
DEFINE_PRINT_VARIANT(Print, void, StreamWriter *)
DEFINE_PRINT_VARIANT(PrintLn, void, StreamWriter *)

#undef DEFINE_FMT_VARIANT
#undef DEFINE_PRINT_VARIANT

// Print formatted strings to stdout
template <typename... Args>
void Print(const char *fmt, Args... args)
{
    Print(StdOut, fmt, args...);
}
template <typename... Args>
void PrintLn(const char *fmt, Args... args)
{
    PrintLn(StdOut, fmt, args...);
}

// PrintLn variants without format strings
void PrintLn(StreamWriter *out_st);
void PrintLn();

// ------------------------------------------------------------------------
// Debug and errors
// ------------------------------------------------------------------------

typedef void LogFunc(LogLevel level, const char *ctx, const char *msg);
typedef void LogFilterFunc(LogLevel level, const char *ctx, const char *msg,
                           FunctionRef<LogFunc> func);

const char *GetEnv(const char *name);
bool GetDebugFlag(const char *name, bool value = false);

void LogFmt(LogLevel level, const char *ctx, const char *fmt, Span<const FmtArg> args);

static inline void Log(LogLevel level, const char *ctx)
{
    LogFmt(level, ctx, "", {});
}
static inline void Log(LogLevel level, const char *ctx, const char *fmt)
{
    LogFmt(level, ctx, fmt, {});
}
template <typename... Args>
static inline void Log(LogLevel level, const char *ctx, const char *fmt, Args... args)
{
    const FmtArg fmt_args[] = { FmtSafe(args)... };
    LogFmt(level, ctx, fmt, fmt_args);
}

#if defined(K_DEBUG) && __cplusplus >= 202002L && __has_include(<source_location>)
    struct LogContext {
        const char *fmt;
        char str[56] = {};

        consteval LogContext(const char *fmt, const std::source_location &location = std::source_location::current())
            : fmt(fmt)
        {
            Span<const char> filename = location.file_name();
            int line = (int)location.line();

            int digits = 1 + (line >= 10) + (line >= 100) + (line >= 1000) +
                             (line >= 10000) + (line >= 100000) + (line >= 1000000) +
                             (line >= 10000000) + (line >= 100000000) + (line >= 1000000000);

            // Cut long filenames to make sure is 32 characters long at most
            Size treshold = 25 - digits;
            Size offset = 0;

            str[offset++] = '[';

            if (filename.len > treshold) {
                filename = filename.Take(filename.len - treshold, treshold);

                str[offset++] = '.';
                str[offset++] = '.';
                str[offset++] = '.';
            }

            for (char c: filename) {
                str[offset++] = c;
            }
            str[offset++] = ':';

            offset += digits;
            for (int i = 0; i < digits; i++) {
                str[offset - i - 1] = '0' + (line % 10);
                line /= 10;
            }

            str[offset++] = ']';
            str[offset++] = ' ';
        }
    };

    template <typename... Args>
    static inline void LogDebug(LogContext ctx, Args... args) { Log(LogLevel::Debug, ctx.str, ctx.fmt, args...); }
    template <typename... Args>
    static inline void LogInfo() { Log(LogLevel::Info, nullptr); }
    template <typename... Args>
    static inline void LogInfo(const char *fmt, Args... args) { Log(LogLevel::Info, nullptr, fmt, args...); }
    template <typename... Args>
    static inline void LogWarning(LogContext ctx, Args... args) { Log(LogLevel::Warning, ctx.str, ctx.fmt, args...); }
    template <typename... Args>
    static inline void LogError(LogContext ctx, Args... args) { Log(LogLevel::Error, ctx.str, ctx.fmt, args...); }
#else
    #if defined(K_DEBUG)
        template <typename... Args>
        static inline void LogDebug(Args... args) { Log(LogLevel::Debug, "Debug: ", args...); }
    #else
        template <typename... Args>
        static inline void LogDebug(Args...) {}
    #endif
    template <typename... Args>
    static inline void LogInfo(Args... args) { Log(LogLevel::Info, nullptr, args...); }
    template <typename... Args>
    static inline void LogWarning(Args... args) { Log(LogLevel::Warning, T("Warning: "), args...); }
    template <typename... Args>
    static inline void LogError(Args... args) { Log(LogLevel::Error, T("Error: "), args...); }
#endif

void SetLogHandler(const std::function<LogFunc> &func, bool vt100);
void DefaultLogHandler(LogLevel level, const char *ctx, const char *msg);

void PushLogFilter(const std::function<LogFilterFunc> &func);
void PopLogFilter();

#if defined(_WIN32)
bool RedirectLogToWindowsEvents(const char *name);
#endif

// ------------------------------------------------------------------------
// Progress
// ------------------------------------------------------------------------

#if !defined(__wasi__)

struct ProgressNode;

struct ProgressInfo {
    Span<const char> text;

    bool determinate;
    int64_t value;
    int64_t min;
    int64_t max;
};

typedef void ProgressFunc(Span<const ProgressInfo> states);

class ProgressHandle {
    char text[K_PROGRESS_TEXT_SIZE] = {};

    std::atomic<ProgressNode *> node = nullptr;

public:
    ProgressHandle() {}
    ProgressHandle(Span<const char> str) { CopyText(str, text); }
    ~ProgressHandle();

    void Set(int64_t value, int64_t min, int64_t max);
    void Set(int64_t value, int64_t max) { Set(value, 0, max); }
    void Set() { Set(0, 0, 0); }

    void Set(int64_t value, int64_t min, int64_t max, Span<const char> text);
    void Set(int64_t value, int64_t max, Span<const char> text) { Set(value, 0, max, text); }
    void Set(Span<const char> text) { Set(0, 0, 0, text); }

    template<typename... Args>
    void SetFmt(int64_t value, int64_t min, int64_t max, const char *fmt, Args... args)
    {
        char buf[K_PROGRESS_TEXT_SIZE];
        Fmt(buf, fmt, args...);

        Set(value, min, max, (const char *)buf);
    }
    template<typename... Args>
    void SetFmt(int64_t value, int64_t max, const char *fmt, Args... args) { SetFmt(value, 0, max, fmt, args...); }
    template<typename... Args>
    void SetFmt(const char *fmt, Args... args) { SetFmt(1ll, 0ll, fmt, args...); }

    template<typename... Args>

    void operator()(int64_t value, int64_t min, int64_t max) { Set(value, min, max); }
    void operator()(int64_t value, int64_t max) { Set(value, 0, max); }
    void operator()() { Set(0, 0); }

private:
    ProgressNode *AcquireNode();
    void CopyText(Span<const char> text, char out[K_PROGRESS_TEXT_SIZE]);
};

void SetProgressHandler(const std::function<ProgressFunc> &func);
void DefaultProgressHandler(Span<const ProgressInfo> bars);

#endif

// ------------------------------------------------------------------------
// System
// ------------------------------------------------------------------------

#if defined(_WIN32)
    #define K_PATH_SEPARATORS "\\/"
    #define K_PATH_DELIMITER ';'
    #define K_EXECUTABLE_EXTENSION ".exe"
    #define K_SHARED_LIBRARY_EXTENSION ".dll"
#else
    #define K_PATH_SEPARATORS "/"
    #define K_PATH_DELIMITER ':'
    #define K_EXECUTABLE_EXTENSION ""
    #define K_SHARED_LIBRARY_EXTENSION ".so"
#endif

#if defined(_WIN32)
bool IsWin32Utf8();
Size ConvertUtf8ToWin32Wide(Span<const char> str, Span<wchar_t> out_str_w);
Size ConvertWin32WideToUtf8(const wchar_t *str_w, Span<char> out_str);
char *GetWin32ErrorString(uint32_t error_code = UINT32_MAX);
#endif

static inline bool IsPathSeparator(char c)
{
#if defined(_WIN32)
    return c == '/' || c == '\\';
#else
    return c == '/';
#endif
}

enum class CompressionType {
    None,
    Zlib,
    Gzip,
    Brotli,
    Zstd
};
static const char *const CompressionTypeNames[] = {
    "None",
    "Zlib",
    "Gzip",
    "Brotli",
    "Zstd"
};
static const char *const CompressionTypeExtensions[] = {
    nullptr,
    ".zz",
    ".gz",
    ".br",
    ".zst"
};

Span<const char> GetPathDirectory(Span<const char> filename);
Span<const char> GetPathExtension(Span<const char> filename,
                                  CompressionType *out_compression_type = nullptr);

enum class NormalizeFlag {
    EndWithSeparator = 1 << 0,
    ForceSlash = 1 << 1,
    NoExpansion = 1 << 2
};

Span<char> NormalizePath(Span<const char> path, Span<const char> root_directory, unsigned int flags, Allocator *alloc);
static inline Span<char> NormalizePath(Span<const char> path, Span<const char> root_directory, Allocator *alloc)
    { return NormalizePath(path, root_directory, 0, alloc); }
static inline Span<char> NormalizePath(Span<const char> path, unsigned int flags, Allocator *alloc)
    { return NormalizePath(path, {}, flags, alloc); }
static inline Span<char> NormalizePath(Span<const char> path, Allocator *alloc)
    { return NormalizePath(path, {}, 0, alloc); }

bool PathIsAbsolute(const char *path);
bool PathIsAbsolute(Span<const char> path);
bool PathContainsDotDot(const char *path);
bool PathContainsDotDot(Span<const char> path);

enum class StatFlag {
    SilentMissing = 1 << 0,
    FollowSymlink = 1 << 1
};

enum class FileType {
    Directory,
    File,
    Link,
    Device,
    Pipe,
    Socket
};
static const char *const FileTypeNames[] = {
    "Directory",
    "File",
    "Link",
    "Device",
    "Pipe",
    "Socket"
};

struct FileInfo {
    FileType type;

    int64_t size;
    int64_t mtime;
    int64_t ctime;
    int64_t atime;
    int64_t btime;
    unsigned int mode;

    uint32_t uid;
    uint32_t gid;
};

enum class StatResult {
    Success,

    MissingPath,
    AccessDenied,
    OtherError
};

StatResult StatFile(int fd, const char *filename, unsigned int flags, FileInfo *out_info);

static inline StatResult StatFile(int fd, const char *filename, FileInfo *out_info)
    { return StatFile(fd, filename, 0, out_info); }
static inline StatResult StatFile(const char *filename, unsigned int flags, FileInfo *out_info)
    { return StatFile(-1, filename, flags, out_info); }
static inline StatResult StatFile(const char *filename, FileInfo *out_info)
    { return StatFile(-1, filename, 0, out_info); }

enum class RenameFlag {
    Overwrite = 1 << 0,
    Sync = 1 << 1
};

enum class RenameResult {
    Success = 0,

    AlreadyExists = 1 << 0,
    OtherError = 1 << 1
};

// Sync failures are logged but not reported as errors
RenameResult RenameFile(const char *src_filename, const char *dest_filename, unsigned int silent, unsigned int flags);
static inline RenameResult RenameFile(const char *src_filename, const char *dest_filename, unsigned int flags)
    { return RenameFile(src_filename, dest_filename, 0, flags); }

bool ResizeFile(int fd, const char *filename, int64_t len);

#if !defined(_WIN32)
bool SetFileMode(int fd, const char *filename, uint32_t mode);
static inline bool SetFileMode(const char *filename, uint32_t mode)
    { return SetFileMode(-1, filename, mode); }

bool SetFileOwner(int fd, const char *filename, uint32_t uid, uint32_t gid);
static inline bool SetFileOwner(const char *filename, uint32_t uid, uint32_t gid)
    { return SetFileOwner(-1, filename, uid, gid); }
#endif

bool SetFileTimes(int fd, const char *filename, int64_t mtime, int64_t ctime);
static inline bool SetFileTimes(const char *filename, int64_t mtime, int64_t ctime)
    { return SetFileTimes(-1, filename, mtime, ctime); }

struct VolumeInfo {
    int64_t total;
    int64_t available;
};

#if !defined(__wasm__)
bool GetVolumeInfo(const char *dirname, VolumeInfo *out_volume);
#endif

enum class EnumResult {
    Success,

    MissingPath,
    AccessDenied,
    PartialEnum,
    CallbackFail,
    OtherError
};

EnumResult EnumerateDirectory(const char *dirname, const char *filter, Size max_files,
                              FunctionRef<bool(const char *, FileType)> func);
EnumResult EnumerateDirectory(const char *dirname, const char *filter, Size max_files,
                              FunctionRef<bool(const char *, const FileInfo &)> func);

#if !defined(_WIN32) && !defined(__APPLE__)
EnumResult EnumerateDirectory(int fd, const char *dirname, const char *filter, Size max_files,
                              FunctionRef<bool(const char *, FileType)> func);
EnumResult EnumerateDirectory(int fd, const char *dirname, const char *filter, Size max_files,
                              FunctionRef<bool(const char *, const FileInfo &)> func);
#endif

bool EnumerateFiles(const char *dirname, const char *filter, Size max_depth, Size max_files,
                    Allocator *str_alloc, HeapArray<const char *> *out_files);
bool IsDirectoryEmpty(const char *dirname);

bool TestFile(const char *filename);
bool TestFile(const char *filename, FileType type);
bool IsDirectory(const char *filename);

#if defined(_WIN32)
bool MatchPathName(const char *path, const char *spec, bool case_sensitive = false);
bool MatchPathSpec(const char *path, const char *spec, bool case_sensitive = false);
#else
bool MatchPathName(const char *path, const char *spec, bool case_sensitive = true);
bool MatchPathSpec(const char *path, const char *spec, bool case_sensitive = true);
#endif

bool FindExecutableInPath(const char *path, const char *name,
                          Allocator *alloc = nullptr, const char **out_path = nullptr);
bool FindExecutableInPath(const char *name, Allocator *alloc = nullptr,
                          const char **out_path = nullptr);

bool SetWorkingDirectory(const char *directory);
const char *GetWorkingDirectory();

const char *GetApplicationExecutable(); // Can be NULL (EmSDK)
const char *GetApplicationDirectory(); // Can be NULL (EmSDK)
const char *GetHomeDirectory(); // Can be NULL

bool MakeDirectory(const char *directory, bool error_if_exists = true);
bool MakeDirectoryRec(Span<const char> directory);
bool UnlinkDirectory(const char *directory, bool error_if_missing = false);
bool UnlinkFile(const char *filename, bool error_if_missing = false);
bool EnsureDirectoryExists(const char *filename);

enum class OpenFlag {
    Read = 1 << 0,
    Write = 1 << 1,
    Append = 1 << 2,

    Keep = 1 << 3,
    Exists = 1 << 4,
    Exclusive = 1 << 5,

    NoFollow = 1 << 6,
    Directory = 1 << 7
};

enum class OpenResult {
    Success = 0,

    MissingPath = 1 << 0,
    FileExists = 1 << 1,
    AccessDenied = 1 << 2,
    OtherError = 1 << 3
};

OpenResult OpenFile(const char *filename, unsigned int flags, unsigned int silent, int *out_fd);

static inline OpenResult OpenFile(const char *filename, unsigned int flags, int *out_fd)
    { return OpenFile(filename, flags, 0, out_fd); }
static inline int OpenFile(const char *filename, unsigned int flags)
{
    int fd = -1;
    if (OpenFile(filename, flags, &fd) != OpenResult::Success)
        return -1;
    return fd;
}

void CloseDescriptor(int fd);
bool FlushFile(int fd, const char *filename);

bool SpliceFile(int src_fd, const char *src_filename, int64_t src_offset,
                int dest_fd, const char *dest_filename, int64_t dest_offset, int64_t size,
                FunctionRef<void(int64_t, int64_t)> progress = [](int64_t, int64_t) {});
static inline bool SpliceFile(int src_fd, const char *src_filename, int dest_fd, const char *dest_filename, int64_t size,
                              FunctionRef<void(int64_t, int64_t)> progress = [](int64_t, int64_t) {})
    { return SpliceFile(src_fd, src_filename, 0, dest_fd, dest_filename, 0, size, progress); }

bool FileIsVt100(int fd);

#if !defined(__wasi__)

#if defined(_WIN32)
enum class PipeMode {
    Byte,
    Message
};

bool CreateOverlappedPipe(bool overlap0, bool overlap1, PipeMode mode, void *out_handles[2]); // HANDLE
void CloseHandleSafe(void **handle_ptr); // HANDLE
#else
void SetSignalHandler(int signal, void (*func)(int), struct sigaction *prev = nullptr);

bool CreatePipe(bool block, int out_pfd[2]);
void CloseDescriptorSafe(int *fd_ptr);
#endif

struct ExecuteInfo {
    struct KeyValue {
        const char *key;
        const char *value;
    };

    const char *work_dir = nullptr;

    bool reset_env = false;
    Span<const KeyValue> env_variables = {};
};

bool ExecuteCommandLine(const char *cmd_line, const ExecuteInfo &info,
                        FunctionRef<Span<const uint8_t>()> in_func,
                        FunctionRef<void(Span<uint8_t> buf)> out_func, int *out_code);
bool ExecuteCommandLine(const char *cmd_line, const ExecuteInfo &info,
                        Span<const uint8_t> in_buf, Size max_len,
                        HeapArray<uint8_t> *out_buf, int *out_code);

// Simple variants
static inline bool ExecuteCommandLine(const char *cmd_line, const ExecuteInfo &info, int *out_code)
    { return ExecuteCommandLine(cmd_line, info, {}, {}, out_code); }
static inline bool ExecuteCommandLine(const char *cmd_line, const ExecuteInfo &info,
                                      Span<const uint8_t> in_buf,
                                      FunctionRef<void(Span<uint8_t> buf)> out_func, int *out_code)
{
    const auto read_once = [&]() {
        Span<const uint8_t> buf = in_buf;
        in_buf = {};
        return buf;
    };

    return ExecuteCommandLine(cmd_line, info, read_once, out_func, out_code);
}

// Char variants
static inline bool ExecuteCommandLine(const char *cmd_line, const ExecuteInfo &info,
                                      Span<const char> in_buf,
                                      FunctionRef<void(Span<char> buf)> out_func, int *out_code)
{
    const auto write = [&](Span<uint8_t> buf) { out_func(buf.As<char>()); };
    return ExecuteCommandLine(cmd_line, info, in_buf.As<const uint8_t>(), write, out_code);
}
static inline bool ExecuteCommandLine(const char *cmd_line, const ExecuteInfo &info,
                                      Span<const char> in_buf, Size max_len,
                                      HeapArray<char> *out_buf, int *out_code)
{
    return ExecuteCommandLine(cmd_line, info, in_buf.As<const uint8_t>(), max_len,
                              (HeapArray<uint8_t> *)out_buf, out_code);
}

Size ReadCommandOutput(const char *cmd_line, Span<uint8_t> out_output);
bool ReadCommandOutput(const char *cmd_line, HeapArray<uint8_t> *out_output);

// Char variants
static inline Size ReadCommandOutput(const char *cmd_line, Span<char> out_output)
    { return ReadCommandOutput(cmd_line, out_output.As<uint8_t>()); }
static inline bool ReadCommandOutput(const char *cmd_line, HeapArray<char> *out_output)
{
    HeapArray<uint8_t> *out = (HeapArray<uint8_t> *)out_output;
    return ReadCommandOutput(cmd_line, out);
}

#endif

void WaitDelay(int64_t delay);

#if !defined(__wasi__)

enum class WaitResult {
    Ready,
    Timeout,
    Interrupt,
    Message,
    Exit
};

struct WaitSource {
#if defined(_WIN32)
    // Special-cased on Windows: set to NULL to wait for the Win32 message pump too
    void *handle; // HANDLE
    int timeout;
#else
    int fd;
    int timeout;
    int events = 0;
#endif
};

// After WaitEvents() has been called once (even with timeout 0), a few signals (such as SIGINT, SIGHUP)
// and their Windows equivalent will be permanently ignored.
// Only the main thread (running main) will get WaitResult::Message events (and SIGUSR1).
WaitResult WaitEvents(Span<const WaitSource> sources, int64_t timeout, uint64_t *out_ready = nullptr);
WaitResult WaitEvents(int64_t timeout);

void PostWaitMessage();
void PostTerminate();

#endif

int GetCoreCount();

#if !defined(_WIN32) && !defined(__wasi__)
bool RaiseMaximumOpenFiles(int limit = -1);
bool DropRootIdentity();
bool DetectFork(int64_t *marker);
#endif

#if defined(__linux__)
bool NotifySystemd();
#endif

#define K_RESTART_EINTR(CallCode, ErrorCond) \
    ([&]() { \
        decltype(CallCode) ret; \
        while ((ret = (CallCode)) ErrorCond && errno == EINTR); \
        return ret; \
    })()

class InitHelper {
public:
    const char *name;
    InitHelper *next = nullptr;

    InitHelper(const char *name);
    virtual void Run() = 0;
};

class FinalizeHelper {
public:
    const char *name;
    FinalizeHelper *next = nullptr;

    FinalizeHelper(const char *name);
    virtual void Run() = 0;
};

#define K_INIT_(Cls, Name) \
    class Cls: public InitHelper { \
    public: \
        Cls(): InitHelper(Name) {} \
        void Run() override; \
    }; \
    static Cls K_UNIQUE_NAME(init); \
    void Cls::Run()
#define K_INIT(Name) K_INIT_(InitHelper ## Name, K_STRINGIFY(Name))

#define K_FINALIZE_(Cls, Name) \
    class Cls: public FinalizeHelper { \
    public: \
        Cls(): FinalizeHelper(Name) {} \
        void Run() override; \
    }; \
    static Cls K_UNIQUE_NAME(finalize); \
    void Cls::Run()
#define K_FINALIZE(Name) K_FINALIZE_(FinalizeHelper ## Name, K_STRINGIFY(Name))

#define K_EXIT_(Cls) \
    class Cls { \
    public: \
        ~Cls(); \
    }; \
    static Cls K_UNIQUE_NAME(exit); \
    Cls::~Cls()
#define K_EXIT(Name) K_EXIT_(ExitHelper ## Name)

void InitApp();
void ExitApp();
bool FlushStandardOutputs();

int Main(int argc, char **argv);

static inline int RunApp(int argc, char **argv)
{
    K_CRITICAL(argc >= 1, "First argument is missing");

    InitApp();
    K_DEFER { ExitApp(); };

    int ret = Main(argc, argv);

    if (!FlushStandardOutputs() && !ret) {
        ret = 1;
    }

    return ret;
}

// ------------------------------------------------------------------------
// Standard paths
// ------------------------------------------------------------------------

const char *GetUserConfigPath(const char *name, Allocator *alloc); // Can return NULL
const char *GetUserCachePath(const char *name, Allocator *alloc); // Can return NULL
const char *GetSystemConfigPath(const char *name, Allocator *alloc);
const char *GetTemporaryDirectory();

enum class FindConfigFlag {
    IgnoreAppDir = 1 << 0
};

const char *FindConfigFile(const char *directory, Span<const char *const> names,
                           Allocator *alloc, HeapArray<const char *> *out_possibilities = nullptr);
static inline const char *FindConfigFile(Span<const char *const> names, Allocator *alloc,
                                         HeapArray<const char *> *out_possibilities = nullptr)
    { return FindConfigFile(nullptr, names, alloc, out_possibilities); }

const char *CreateUniqueFile(Span<const char> directory, const char *prefix, const char *extension,
                             Allocator *alloc, int *out_fd = nullptr);
const char *CreateUniqueDirectory(Span<const char> directory, const char *prefix, Allocator *alloc);

// ------------------------------------------------------------------------
// Parsing
// ------------------------------------------------------------------------

enum class ParseFlag {
    Log = 1 << 0,
    Validate = 1 << 1,
    End = 1 << 2
};
#define K_DEFAULT_PARSE_FLAGS ((int)ParseFlag::Log | (int)ParseFlag::Validate | (int)ParseFlag::End)

template <typename T>
bool ParseInt(Span<const char> str, T *out_value, unsigned int flags = K_DEFAULT_PARSE_FLAGS,
              Span<const char> *out_remaining = nullptr)
{
    if (!str.len) [[unlikely]] {
        if (flags & (int)ParseFlag::Log) {
            LogError("Cannot convert empty string to integer");
        }
        return false;
    }

    uint64_t value = 0;

    Size pos = 0;
    uint64_t neg = 0;
    if (str.len >= 2) {
        if (std::numeric_limits<T>::min() < 0 && str[0] == '-') {
            pos = 1;
            neg = UINT64_MAX;
        } else if (str[0] == '+') {
            pos = 1;
        }
    }

    for (; pos < str.len; pos++) {
        unsigned int digit = (unsigned int)(str[pos] - '0');
        if (digit > 9) [[unlikely]] {
            if (!pos || flags & (int)ParseFlag::End) {
                if (flags & (int)ParseFlag::Log) {
                    LogError("Malformed integer number '%1'", str);
                }
                return false;
            } else {
                break;
            }
        }

        uint64_t new_value = (value * 10) + digit;
        if (new_value < value) [[unlikely]]
            goto overflow;
        value = new_value;
    }
    if (value > (uint64_t)std::numeric_limits<T>::max()) [[unlikely]]
        goto overflow;
    value = ((value ^ neg) - neg);

    if (out_remaining) {
        *out_remaining = str.Take(pos, str.len - pos);
    }
    *out_value = (T)value;
    return true;

overflow:
    if (flags & (int)ParseFlag::Log) {
        LogError("Integer overflow for number '%1' (max = %2)", str,
                std::numeric_limits<T>::max());
    }
    return false;
}

bool ParseBool(Span<const char> str, bool *out_value, unsigned int flags = K_DEFAULT_PARSE_FLAGS,
               Span<const char> *out_remaining = nullptr);

bool ParseSize(Span<const char> str, int64_t *out_size, unsigned int flags = K_DEFAULT_PARSE_FLAGS,
               Span<const char> *out_remaining = nullptr);
#if K_SIZE_MAX < INT64_MAX
static inline bool ParseSize(Span<const char> str, Size *out_size,
                             unsigned int flags = K_DEFAULT_PARSE_FLAGS, Span<const char> *out_remaining = nullptr)
{
    int64_t size = 0;
    if (!ParseSize(str, &size, flags, out_remaining))
        return false;

    if (size > K_SIZE_MAX) [[unlikely]] {
        if (flags & (int)ParseFlag::Log) {
            LogError("Size value is too high");
        }
        return false;
    }

    *out_size = (Size)size;
    return true;
}
#endif

bool ParseDate(Span<const char> date_str, LocalDate *out_date, unsigned int flags = K_DEFAULT_PARSE_FLAGS,
               Span<const char> *out_remaining = nullptr);

bool ParseDuration(Span<const char> str, int64_t *out_duration, unsigned int flags = K_DEFAULT_PARSE_FLAGS,
                   Span<const char> *out_remaining = nullptr);
static inline bool ParseDuration(Span<const char> str, int *out_duration,
                                 unsigned int flags = K_DEFAULT_PARSE_FLAGS, Span<const char> *out_remaining = nullptr)
{
    int64_t duration = 0;
    if (!ParseDuration(str, &duration, flags, out_remaining))
        return false;

    if (duration > INT_MAX) [[unlikely]] {
        if (flags & (int)ParseFlag::Log) {
            LogError("Duration value is too high");
        }
        return false;
    }

    *out_duration = (int)duration;
    return true;
}

bool ParseVersion(Span<const char> str, int parts, int multiplier, int64_t *out_duration,
                  unsigned int flags = K_DEFAULT_PARSE_FLAGS, Span<const char> *out_remaining = nullptr);

// ------------------------------------------------------------------------
// Random
// ------------------------------------------------------------------------

void InitChaCha20(uint32_t state[16], const uint8_t key[32], const uint8_t iv[8], const uint8_t counter[8] = nullptr);
void RunChaCha20(uint32_t state[16], uint8_t out_buf[64]);

void FillRandomSafe(void *buf, Size len);
static inline void FillRandomSafe(Span<uint8_t> buf) { FillRandomSafe(buf.ptr, buf.len); }

class FastRandom {
    uint64_t state[4];

public:
    FastRandom();
    FastRandom(uint64_t seed);

    uint64_t Next();

    void Fill(void *buf, Size len);
    void Fill(Span<uint8_t> buf) { Fill(buf.ptr, buf.len); }

    int GetInt(int min, int max);
    int64_t GetInt64(int64_t min, int64_t max);
};

template <typename T>
class FastRandomRNG {
    FastRandom rng;

public:
    typedef T result_type;

    static constexpr T min() { return std::numeric_limits<T>::min(); }
    static constexpr T max() { return std::numeric_limits<T>::max(); }

    T operator()()
    {
        T value;
        rng.Fill(&value, K_SIZE(value));
        return value;
    }
};

uint64_t GetRandom();
int GetRandomInt(int min, int max);
int64_t GetRandomInt64(int64_t min, int64_t max);

// ------------------------------------------------------------------------
// Sockets
// ------------------------------------------------------------------------

#if !defined(__wasi__)

enum class SocketType {
    Dual,
    IPv4,
    IPv6,
    Unix
};
static const char *const SocketTypeNames[] = {
    "Dual",
    "IPv4",
    "IPv6",
    "Unix"
};

#if defined(_WIN32)
    #define SOCK_OVERLAPPED 256
#endif

#if defined(_WIN32)
bool InitWinsock();
#endif

int CreateSocket(SocketType type, int flags);

bool BindIPSocket(int sock, SocketType type, const char *addr, int port);
bool BindUnixSocket(int sock, const char *path);
bool ConnectIPSocket(int sock, const char *addr, int port);
bool ConnectUnixSocket(int sock, const char *path);

// Only for sockets on Windows
void SetDescriptorNonBlock(int fd, bool enable);
void SetDescriptorRetain(int fd, bool retain);

void CloseSocket(int fd);

#endif

// ------------------------------------------------------------------------
// Tasks
// ------------------------------------------------------------------------

enum class AsyncFlag {
    Selfish = 1 << 0
};

class Async {
    K_DELETE_COPY(Async)

#if !defined(__wasi__)
    std::atomic_bool success { true };
    std::atomic_int remaining_tasks { 0 };

    class AsyncPool *pool;

    Async *only = nullptr;
#else
    bool success = true;
#endif

public:
    Async(int threads = -1, unsigned int flags = 0);
    Async(Async *parent, unsigned int flags = 0);
    ~Async();

    void Run(const std::function<bool()> &f);
    void Run(int worker, const std::function<bool()> &f);

    bool Sync();
    bool Wait(int timeout);
    bool IsSuccess() const { return success; }

    int GetWorkerCount();

    static bool IsTaskRunning();
    static int GetWorkerIdx();

    friend class AsyncPool;
};

// ------------------------------------------------------------------------
// Streams
// ------------------------------------------------------------------------

enum class CompressionSpeed {
    Default,
    Slow,
    Fast
};

class StreamDecoder;
class StreamEncoder;

class StreamReader {
    K_DELETE_COPY(StreamReader)

    enum class SourceType {
        Memory,
        File,
        Function
    };

    const char *filename = nullptr;
    bool error = true;

    int64_t read_total = 0;
    int64_t read_max = -1;

    struct {
        SourceType type = SourceType::Memory;
        union U {
            struct {
                Span<const uint8_t> buf;
                Size pos;
            } memory;
            struct {
                int fd;
                bool owned;
            } file;
            std::function<Size(Span<uint8_t> buf)> func;

            // StreamReader deals with func destructor
            U() {}
            ~U() {}
        } u;

        bool eof = false;
    } source;

#if !defined(__wasm__)
    std::mutex mutex;
#endif
    StreamDecoder *decoder = nullptr;

    int64_t raw_len = -1;
    Size raw_read = 0;
    bool eof = false;

    BlockAllocator str_alloc;

public:
    StreamReader() { Close(true); }
    StreamReader(Span<const uint8_t> buf, const char *filename, CompressionType compression_type = CompressionType::None)
        : StreamReader() { Open(buf, filename, compression_type); }
    StreamReader(int fd, const char *filename, CompressionType compression_type = CompressionType::None)
        : StreamReader() { Open(fd, filename, compression_type); }
    StreamReader(const char *filename, CompressionType compression_type = CompressionType::None)
        : StreamReader() { Open(filename, compression_type); }
    StreamReader(const std::function<Size(Span<uint8_t>)> &func, const char *filename,
                 CompressionType compression_type = CompressionType::None)
        : StreamReader() { Open(func, filename, compression_type); }
    ~StreamReader() { Close(true); }

    // Call before Open. Takes ownership and deletes the decoder at the end.
    void SetDecoder(StreamDecoder *decoder);

    bool Open(Span<const uint8_t> buf, const char *filename, CompressionType compression_type = CompressionType::None);
    bool Open(int fd, const char *filename, CompressionType compression_type = CompressionType::None);
    OpenResult Open(const char *filename, CompressionType compression_type = CompressionType::None);
    bool Open(const std::function<Size(Span<uint8_t>)> &func, const char *filename,
              CompressionType compression_type = CompressionType::None);
    bool Close() { return Close(false); }

    // File-specific
    bool Rewind();

    const char *GetFileName() const { return filename; }
    int64_t GetReadLimit() { return read_max; }
    bool IsValid() const { return filename && !error; }
    bool IsEOF() const { return eof; }

    int GetDescriptor() const;
    void SetDescriptorOwned(bool owned);

    void SetReadLimit(int64_t limit) { read_max = limit; }

    // Thread safe methods
    Size Read(Span<uint8_t> out_buf);
    Size Read(Span<char> out_buf) { return Read(out_buf.As<uint8_t>()); }

    // Thread safe methods
    Size ReadFill(Span<uint8_t> out_buf);
    Size ReadFill(Span<char> out_buf) { return ReadFill(out_buf.As<uint8_t>()); }
    Size ReadFill(Size buf_len, void *out_buf) { return ReadFill(MakeSpan((uint8_t *)out_buf, buf_len)); }

    Size ReadAll(Size max_len, HeapArray<uint8_t> *out_buf);
    Size ReadAll(Size max_len, HeapArray<char> *out_buf)
        { return ReadAll(max_len, (HeapArray<uint8_t> *)out_buf); }

    int64_t ComputeRawLen();
    int64_t GetRawRead() const { return raw_read; }

private:
    bool Close(bool implicit);

    bool InitDecompressor(CompressionType type);

    Size ReadRaw(Size max_len, void *out_buf);

    friend class StreamDecoder;
};

static inline Size ReadFile(const char *filename, Span<uint8_t> out_buf)
{
    StreamReader st(filename);
    return st.ReadFill(out_buf);
}
static inline Size ReadFile(const char *filename, Span<char> out_buf)
{
    StreamReader st(filename);
    return st.ReadFill(out_buf);
}
static inline Size ReadFile(const char *filename, Size max_len, HeapArray<uint8_t> *out_buf)
{
    StreamReader st(filename);
    return st.ReadAll(max_len, out_buf);
}
static inline Size ReadFile(const char *filename, Size max_len, HeapArray<char> *out_buf)
{
    StreamReader st(filename);
    return st.ReadAll(max_len, out_buf);
}

class StreamDecoder {
protected:
    StreamReader *reader;

public:
    StreamDecoder(StreamReader *reader) : reader(reader) {}
    virtual ~StreamDecoder() {}

    virtual Size Read(Size max_len, void *out_buf) = 0;

protected:
    const char *GetFileName() const { return reader->filename; }
    bool IsValid() const { return reader->IsValid(); }
    bool IsSourceEOF() const { return reader->source.eof; }

    Size ReadRaw(Size max_len, void *out_buf) { return reader->ReadRaw(max_len, out_buf); }

    void SetEOF(bool eof) { reader->eof = eof; }
};

typedef StreamDecoder *CreateDecompressorFunc(StreamReader *reader, CompressionType type);

class StreamDecompressorHelper {
public:
    StreamDecompressorHelper(CompressionType type, CreateDecompressorFunc *func);
};

#define K_REGISTER_DECOMPRESSOR_(Func, Type, Cls) \
    static StreamDecoder *Func(StreamReader *reader, CompressionType type) \
    { \
        StreamDecoder *decompressor = new Cls(reader, type); \
        return decompressor; \
    } \
    static StreamDecompressorHelper K_UNIQUE_NAME(decompressor_helper)((Type), Func)
#define K_REGISTER_DECOMPRESSOR(Type, Cls) K_REGISTER_DECOMPRESSOR_(K_UNIQUE_NAME(CreateDecompressor), (Type), (Cls))

class LineReader {
    K_DELETE_COPY(LineReader)

    HeapArray<char> buf;
    Span<char> view = {};

    StreamReader *st;
    bool error;
    bool eof = false;

    Span<char> line = {};
    int line_number = 0;

public:
    LineReader(StreamReader *st) : st(st), error(!st->IsValid()) {}

    const char *GetFileName() const { return st->GetFileName(); }
    int GetLineNumber() const { return line_number; }
    bool IsValid() const { return !error; }
    bool IsEOF() const { return eof; }

    bool Next(Span<char> *out_line);
    bool Next(Span<const char> *out_line) { return Next((Span<char> *)out_line); }

    void PushLogFilter();
};

enum class StreamWriterFlag {
    Exclusive = 1 << 0, // Only for files
    Atomic = 1 << 1, // Only for files
    NoBuffer = 1 << 2, // Only for files and descriptors
    LineBuffer = 1 << 3 // Only for files and descriptors
};

class StreamWriter {
    K_DELETE_COPY(StreamWriter)

    enum class DestinationType {
        Memory,
        DirectFile,
        LineFile,
        BufferedFile,
        Function
    };

    const char *filename = nullptr;
    bool error = true;

    struct {
        DestinationType type = DestinationType::Memory;
        union U {
            struct {
                HeapArray<uint8_t> *memory;
                Size start;
            } mem;
            struct {
                int fd;
                bool owned;

                Span<uint8_t> buf;
                Size buf_used;

                bool exclusive;
                bool atomic;
                bool unlink_on_error;
                const char *tmp_filename;
            } file;
            std::function<bool(Span<const uint8_t>)> func;

            // StreamWriter deals with func destructor
            U() {}
            ~U() {}
        } u;

        bool vt100;
    } dest;

#if !defined(__wasm__)
    std::mutex mutex;
#endif
    StreamEncoder *encoder = nullptr;

    int64_t raw_written = 0;

    BlockAllocator str_alloc { Kibibytes(8) };

public:
    StreamWriter() { Close(true); }
    StreamWriter(HeapArray<uint8_t> *mem, const char *filename, unsigned int flags = 0,
                 CompressionType compression_type = CompressionType::None,
                 CompressionSpeed compression_speed = CompressionSpeed::Default)
        : StreamWriter() { Open(mem, filename, flags, compression_type, compression_speed); }
    StreamWriter(HeapArray<char> *mem, const char *filename, unsigned int flags = 0,
                 CompressionType compression_type = CompressionType::None,
                 CompressionSpeed compression_speed = CompressionSpeed::Default)
        : StreamWriter() { Open(mem, filename, flags, compression_type, compression_speed); }
    StreamWriter(int fd, const char *filename, unsigned int flags = 0,
                 CompressionType compression_type = CompressionType::None,
                 CompressionSpeed compression_speed = CompressionSpeed::Default)
        : StreamWriter() { Open(fd, filename, flags, compression_type, compression_speed); }
    StreamWriter(const char *filename, unsigned int flags = 0,
                 CompressionType compression_type = CompressionType::None,
                 CompressionSpeed compression_speed = CompressionSpeed::Default)
        : StreamWriter() { Open(filename, flags, compression_type, compression_speed); }
    StreamWriter(const std::function<bool(Span<const uint8_t>)> &func, const char *filename, unsigned int flags = 0,
                 CompressionType compression_type = CompressionType::None,
                 CompressionSpeed compression_speed = CompressionSpeed::Default)
        : StreamWriter() { Open(func, filename, flags, compression_type, compression_speed); }
    ~StreamWriter() { Close(true); }

    // Call before Open. Takes ownership and deletes the encoder at the end.
    void SetEncoder(StreamEncoder *encoder);

    bool Open(HeapArray<uint8_t> *mem, const char *filename, unsigned int flags = 0,
              CompressionType compression_type = CompressionType::None,
              CompressionSpeed compression_speed = CompressionSpeed::Default);
    bool Open(HeapArray<char> *mem, const char *filename, unsigned int flags = 0,
              CompressionType compression_type = CompressionType::None,
              CompressionSpeed compression_speed = CompressionSpeed::Default)
        { return Open((HeapArray<uint8_t> *)mem, filename, flags, compression_type, compression_speed); }
    bool Open(int fd, const char *filename, unsigned int flags = 0,
              CompressionType compression_type = CompressionType::None,
              CompressionSpeed compression_speed = CompressionSpeed::Default);
    bool Open(const char *filename, unsigned int flags = 0,
              CompressionType compression_type = CompressionType::None,
              CompressionSpeed compression_speed = CompressionSpeed::Default);
    bool Open(const std::function<bool(Span<const uint8_t>)> &func, const char *filename, unsigned int flags = 0,
              CompressionType compression_type = CompressionType::None,
              CompressionSpeed compression_speed = CompressionSpeed::Default);
    bool Close() { return Close(false); }

    // File-specific
    bool Rewind();

    // For compressed streams, Flush may not be complete and only Close() can finalize the file.
    // Thread safe method
    bool Flush();

    const char *GetFileName() const { return filename; }
    bool IsVt100() const { return dest.vt100; }
    bool IsValid() const { return filename && !error; }

    int GetDescriptor() const;
    void SetDescriptorOwned(bool owned);

    // Thread safe methods
    bool Write(Span<const uint8_t> buf);
    bool Write(Span<const char> buf) { return Write(buf.As<const uint8_t>()); }
    bool Write(char buf) { return Write(MakeSpan(&buf, 1)); }
    bool Write(const void *buf, Size len) { return Write(MakeSpan((const uint8_t *)buf, len)); }

    int64_t GetRawWritten() const { return raw_written; }

private:
    bool Close(bool implicit);

    void InitFile(unsigned int flags);
    bool FlushBuffer();

    bool InitCompressor(CompressionType type, CompressionSpeed speed);

    bool WriteRaw(Span<const uint8_t> buf);

    friend class StreamEncoder;
};

static inline bool WriteFile(Span<const uint8_t> buf, const char *filename, unsigned int flags = 0)
{
    StreamWriter st(filename, flags);
    st.Write(buf);
    return st.Close();
}
static inline bool WriteFile(Span<const char> buf, const char *filename, unsigned int flags = 0)
{
    StreamWriter st(filename, flags);
    st.Write(buf);
    return st.Close();
}

class StreamEncoder {
protected:
    StreamWriter *writer;

public:
    StreamEncoder(StreamWriter *writer) : writer(writer) {}
    virtual ~StreamEncoder() {}

    virtual bool Write(Span<const uint8_t> buf) = 0;
    virtual bool Finalize() = 0;

protected:
    const char *GetFileName() const { return writer->filename; }
    bool IsValid() const { return writer->IsValid(); }

    bool WriteRaw(Span<const uint8_t> buf) { return writer->WriteRaw(buf); }
};

typedef StreamEncoder *CreateCompressorFunc(StreamWriter *writer, CompressionType type, CompressionSpeed speed);

class StreamCompressorHelper {
public:
    StreamCompressorHelper(CompressionType type, CreateCompressorFunc *func);
};

#define K_REGISTER_COMPRESSOR_(Func, Type, Cls) \
    static StreamEncoder *Func(StreamWriter *writer, CompressionType type, CompressionSpeed speed) \
    { \
        StreamEncoder *compressor = new Cls(writer, type, speed); \
        return compressor; \
    } \
    static StreamCompressorHelper K_UNIQUE_NAME(compressor_helper)((Type), Func)
#define K_REGISTER_COMPRESSOR(Type, Cls) K_REGISTER_COMPRESSOR_(K_UNIQUE_NAME(CreateCompressor), (Type), (Cls))

bool SpliceStream(StreamReader *reader, int64_t max_len, StreamWriter *writer, Span<uint8_t> buf,
                  FunctionRef<void(int64_t, int64_t)> progress = [](int64_t, int64_t) {});

template<Size S = 65535>
bool SpliceStream(StreamReader *reader, int64_t max_len, StreamWriter *writer,
                  FunctionRef<void(int64_t, int64_t)> progress = [](int64_t, int64_t) {})
{
    static_assert(S >= Kibibytes(2) && S <= Kibibytes(96));

    // The default size happens to be the maximum chunk size (0xFFFF) in our HTTP chunk
    // transfer implementation. musl now defaults to 128k stack size, and we ask
    // for 1 MiB with PT_GNU_STACK (using linker flag -z stack-size) anyway.
    uint8_t buf[S];

    return SpliceStream(reader, max_len, writer, buf, progress);
}

bool IsCompressorAvailable(CompressionType compression_type);
bool IsDecompressorAvailable(CompressionType compression_type);

// ------------------------------------------------------------------------
// INI
// ------------------------------------------------------------------------

struct IniProperty {
    Span<const char> section;
    Span<const char> key;
    Span<const char> value;
};

class IniParser {
    K_DELETE_COPY(IniParser)

    HeapArray<char> current_section;

    enum class LineType {
        Section,
        KeyValue,
        Exit
    };

    LineReader reader;
    bool eof = false;
    bool error = false;

public:
    IniParser(StreamReader *st) : reader(st) {}

    const char *GetFileName() const { return reader.GetFileName(); }
    bool IsValid() const { return !error; }
    bool IsEOF() const { return eof; }

    bool Next(IniProperty *out_prop);
    bool NextInSection(IniProperty *out_prop);

    void PushLogFilter() { reader.PushLogFilter(); }

private:
    LineType FindNextLine(IniProperty *out_prop);
};

// ------------------------------------------------------------------------
// Assets
// ------------------------------------------------------------------------

// Keep in sync with version in packer.cc
struct AssetInfo {
    const char *name;
    CompressionType compression_type;
    Span<const uint8_t> data;

    K_HASHTABLE_HANDLER(AssetInfo, name);
};

#if defined(FELIX_HOT_ASSETS)

bool ReloadAssets();
Span<const AssetInfo> GetEmbedAssets();
const AssetInfo *FindEmbedAsset(const char *name);

#else

// Reserved for internal use
void InitEmbedMap(Span<const AssetInfo> assets);

extern "C" const Span<const AssetInfo> EmbedAssets;
extern HashTable<const char *, const AssetInfo *> EmbedAssetsMap;

// By definining functions here (with static inline), we don't nee EmbedAssets
// to exist unless these functions are called. It also allows the compiler to remove
// calls to ReloadAssets in non-debug builds (LTO or not).

static inline bool ReloadAssets()
{
    return false;
}

static inline Span<const AssetInfo> GetEmbedAssets()
{
    return EmbedAssets;
}

static inline const AssetInfo *FindEmbedAsset(const char *name)
{
    InitEmbedMap(EmbedAssets);
    return EmbedAssetsMap.FindValue(name, nullptr);
}

#endif

// These functions won't win any beauty or speed contest but whatever
bool PatchFile(StreamReader *reader, StreamWriter *writer,
               FunctionRef<void(Span<const char>, StreamWriter *)> func);
bool PatchFile(Span<const uint8_t> data, StreamWriter *writer,
               FunctionRef<void(Span<const char>, StreamWriter *)> func);
bool PatchFile(const AssetInfo &asset, StreamWriter *writer,
               FunctionRef<void(Span<const char>, StreamWriter *)> func);
Span<const uint8_t> PatchFile(Span<const uint8_t> data, Allocator *alloc,
                              FunctionRef<void(Span<const char> key, StreamWriter *)> func);
Span<const uint8_t> PatchFile(const AssetInfo &asset, Allocator *alloc,
                              FunctionRef<void(Span<const char> key, StreamWriter *)> func);
Span<const char> PatchFile(Span<const char> data, Allocator *alloc,
                           FunctionRef<void(Span<const char> key, StreamWriter *)> func);

// ------------------------------------------------------------------------
// Translations
// ------------------------------------------------------------------------

struct TranslationTable {
    struct Pair {
        const char *key;
        const char *value;
    };

    const char *language;
    Span<Pair> messages;

    K_HASHTABLE_HANDLER(TranslationTable, language);
};

extern "C" const Span<const TranslationTable> TranslationTables;

void InitLocales(Span<const TranslationTable> tables, const char *default_lang);

// Resets the locale to the process default if lang is NULL or is unknown
bool HasLocale(const char *name);
void ChangeThreadLocale(const char *name);
const char *GetThreadLocale();

// ------------------------------------------------------------------------
// Options
// ------------------------------------------------------------------------

struct OptionDesc {
    const char *name;
    const char *help;
};

enum class OptionMode {
    Rotate,
    Skip,
    Stop
};

enum class OptionType {
    NoValue,
    Value,
    OptionalValue
};

class OptionParser {
    K_DELETE_COPY(OptionParser)

    Span<const char *> args;
    OptionMode mode;

    Size pos = 0;
    Size limit;
    Size smallopt_offset = 0;
    char buf[80];

    bool test_failed = false;

public:

    const char *current_option = nullptr;
    const char *current_value = nullptr;

    OptionParser(Span<const char *> args, OptionMode mode = OptionMode::Rotate)
        : args(args), mode(mode), limit(args.len) {}
    OptionParser(int argc, char **argv, OptionMode mode = OptionMode::Rotate)
        : args((const char **)argv, argc), mode(mode), pos(1), limit(args.len) {}

    Size GetPosition() const { return pos; }

    const char *Next();

    const char *ConsumeValue();
    const char *ConsumeNonOption();
    void ConsumeNonOptions(HeapArray<const char *> *non_options);

    Span<const char *> GetRemainingArguments() const { return args.Take(pos, args.len - pos); }

    bool Test(const char *test1, const char *test2, OptionType type = OptionType::NoValue);
    bool Test(const char *test1, OptionType type = OptionType::NoValue)
        { return Test(test1, nullptr, type); }

    bool TestHasFailed() const { return test_failed; }

    void LogUnknownError() const;
    void LogUnusedArguments() const;
};

template <typename T>
bool OptionToEnum(Span<const char *const> options, Span<const char> str, T *out_value)
{
    static_assert(std::is_enum<T>::value);

    for (Size i = 0; i < options.len; i++) {
        const char *opt = options[i];

        if (TestStr(opt, str)) {
            *out_value = (T)i;
            return true;
        }
    }

    return false;
}

template <typename T>
bool OptionToEnum(Span<const OptionDesc> options, Span<const char> str, T *out_value)
{
    static_assert(std::is_enum<T>::value);

    for (Size i = 0; i < options.len; i++) {
        const OptionDesc &desc = options[i];

        if (TestStr(desc.name, str)) {
            *out_value = (T)i;
            return true;
        }
    }

    return false;
}

template <typename T>
bool OptionToEnumI(Span<const char *const> options, Span<const char> str, T *out_value)
{
    static_assert(std::is_enum<T>::value);

    for (Size i = 0; i < options.len; i++) {
        const char *opt = options[i];

        if (TestStrI(opt, str)) {
            *out_value = (T)i;
            return true;
        }
    }

    return false;
}

template <typename T>
bool OptionToEnumI(Span<const OptionDesc> options, Span<const char> str, T *out_value)
{
    static_assert(std::is_enum<T>::value);

    for (Size i = 0; i < options.len; i++) {
        const OptionDesc &desc = options[i];

        if (TestStrI(desc.name, str)) {
            *out_value = (T)i;
            return true;
        }
    }

    return false;
}

template <typename T>
bool OptionToFlag(Span<const char *const> options, Span<const char> str, T *out_flags, bool enable = true)
{
    for (Size i = 0; i < options.len; i++) {
        const char *opt = options[i];

        if (TestStr(opt, str)) {
            *out_flags = ApplyMask(*out_flags, 1u << i, enable);
            return true;
        }
    }

    return false;
}

template <typename T>
bool OptionToFlag(Span<const OptionDesc> options, Span<const char> str, T *out_flags, bool enable = true)
{
    for (Size i = 0; i < options.len; i++) {
        const OptionDesc &desc = options[i];

        if (TestStr(desc.name, str)) {
            *out_flags = ApplyMask(*out_flags, 1u << i, enable);
            return true;
        }
    }

    return false;
}

template <typename T>
bool OptionToFlagI(Span<const char *const> options, Span<const char> str, T *out_flags, bool enable = true)
{
    for (Size i = 0; i < options.len; i++) {
        const char *opt = options[i];

        if (TestStrI(opt, str)) {
            *out_flags = ApplyMask(*out_flags, 1u << i, enable);
            return true;
        }
    }

    return false;
}

template <typename T>
bool OptionToFlagI(Span<const OptionDesc> options, Span<const char> str, T *out_flags, bool enable = true)
{
    for (Size i = 0; i < options.len; i++) {
        const OptionDesc &desc = options[i];

        if (TestStrI(desc.name, str)) {
            *out_flags = ApplyMask(*out_flags, 1u << i, enable);
            return true;
        }
    }

    return false;
}

// ------------------------------------------------------------------------
// Console prompter (simplified readline)
// ------------------------------------------------------------------------

struct PromptChoice {
    const char *str;
    char c;
};

enum class CompleteResult {
    Success,
    TooMany,
    Error
};

struct CompleteChoice {
    const char *name;
    const char *value;
};

typedef CompleteResult CompleteFunc(Span<const char> value, Allocator *alloc, HeapArray<CompleteChoice> *out_choices);

class ConsolePrompter {
    int prompt_columns = 0;

    HeapArray<HeapArray<char>> entries;
    Size entry_idx = 0;
    Size str_offset = 0;

    int columns = 0;
    int rows = 0;
    int rows_with_extra = 0;
    int x = 0;
    int y = 0;

    const char *fake_input = "";
#if defined(_WIN32)
    uint32_t surrogate_buf = 0;
#endif

public:
    const char *prompt = ">>>";
    const char *mask = nullptr;
    std::function<CompleteFunc> complete = {};

    HeapArray<char> str;

    ConsolePrompter();

    bool Read(Span<const char> *out_str = nullptr);
    Size ReadEnum(Span<const PromptChoice> choices, Size value = 0);

    void Commit();

private:
    bool ReadRaw(Span<const char> *out_str);
    bool ReadBuffered(Span<const char> *out_str);

    Size ReadRawEnum(Span<const PromptChoice> choices, Size value);
    Size ReadBufferedEnum(Span<const PromptChoice> choices);

    void ChangeEntry(Size new_idx);

    Size SkipForward(Size offset, Size count);
    Size SkipBackward(Size offset, Size count);
    Size FindForward(Size offset, const char *chars);
    Size FindBackward(Size offset, const char *chars);

    void Delete(Size start, Size end);

    void FormatChoices(Span<const PromptChoice> choices, Size value);

    void RenderRaw();
    void RenderBuffered();

    Vec2<int> GetConsoleSize();
    int32_t ReadChar();

    void EnsureNulTermination();
};

const char *Prompt(const char *prompt, const char *default_value, const char *mask, Allocator *alloc);
static inline const char *Prompt(const char *prompt, Allocator *alloc)
    { return Prompt(prompt, nullptr, nullptr, alloc); }

Size PromptEnum(const char *prompt, Span<const PromptChoice> choices, Size value = 0);
Size PromptEnum(const char *prompt, Span<const char *const> strings, Size value = 0);

// Returns -1 if cancelled, otherwise it's 1 for Yes and or 0 for No
int PromptYN(const char *prompt);

const char *PromptPath(const char *prompt, const char *default_path, Span<const char> root_directory, Allocator *alloc);
static inline const char *PromptPath(const char *prompt, Allocator *alloc)
    { return PromptPath(prompt, nullptr, GetWorkingDirectory(), alloc); }

// ------------------------------------------------------------------------
// Mime types
// ------------------------------------------------------------------------

#if __has_include("mimetypes.inc")

const char *GetMimeType(Span<const char> extension, const char *default_type = "application/octet-stream");

bool CanCompressFile(const char *filename);

#endif

// ------------------------------------------------------------------------
// Unicode
// ------------------------------------------------------------------------

static inline int CountUtf8Bytes(char c)
{
    int ones = CountLeadingZeros((uint32_t)~c << 24);
    return std::min(std::max(ones, 1), 4);
}

static constexpr inline Size DecodeUtf8(const char *str, int32_t *out_c)
{
    K_ASSERT(str[0]);

#define BYTE(Idx) ((uint8_t)str[Idx])

    if (BYTE(0) < 0x80) {
        *out_c = BYTE(0);
        return 1;
    } else if (BYTE(0) - 0xC2 > 0xF4 - 0xC2) [[unlikely]] {
        return 0;
    } else if (BYTE(1)) [[likely]] {
        if (BYTE(0) < 0xE0 && (BYTE(1) & 0xC0) == 0x80) {
            *out_c = ((BYTE(0) & 0x1F) << 6) | (BYTE(1) & 0x3F);
            return 2;
        } else if (BYTE(2)) [[likely]] {
            if (BYTE(0) < 0xF0 &&
                   (BYTE(1) & 0xC0) == 0x80 &&
                   (BYTE(2) & 0xC0) == 0x80) {
                *out_c = ((BYTE(0) & 0xF) << 12) | ((BYTE(1) & 0x3F) << 6) | (BYTE(2) & 0x3F);
                return 3;
            } else if (BYTE(3)) [[likely]] {
                if ((BYTE(1) & 0xC0) == 0x80 &&
                       (BYTE(2) & 0xC0) == 0x80 &&
                       (BYTE(3) & 0xC0) == 0x80) {
                    *out_c = ((BYTE(0) & 0x7) << 18) | ((BYTE(1) & 0x3F) << 12) | ((BYTE(2) & 0x3F) << 6) | (BYTE(3) & 0x3F);
                    return 4;
                }
            }
        }
    }

#undef BYTE

    return 0;
}

static constexpr inline Size DecodeUtf8(Span<const char> str, Size offset, int32_t *out_c)
{
    K_ASSERT(offset < str.len);

    str = str.Take(offset, str.len - offset);

#define BYTE(Idx) ((uint8_t)str[Idx])

    if (BYTE(0) < 0x80) {
        *out_c = BYTE(0);
        return 1;
    } else if (BYTE(0) - 0xC2 > 0xF4 - 0xC2) [[unlikely]] {
        return 0;
    } else if (BYTE(0) < 0xE0 && str.len >= 2 && (BYTE(1) & 0xC0) == 0x80) {
        *out_c = ((BYTE(0) & 0x1F) << 6) | (BYTE(1) & 0x3F);
        return 2;
    } else if (BYTE(0) < 0xF0 && str.len >= 3 && (BYTE(1) & 0xC0) == 0x80 &&
                                                 (BYTE(2) & 0xC0) == 0x80) {
        *out_c = ((BYTE(0) & 0xF) << 12) | ((BYTE(1) & 0x3F) << 6) | (BYTE(2) & 0x3F);
        return 3;
    } else if (str.len >= 4 && (BYTE(1) & 0xC0) == 0x80 &&
                               (BYTE(2) & 0xC0) == 0x80 &&
                               (BYTE(3) & 0xC0) == 0x80) {
        *out_c = ((BYTE(0) & 0x7) << 18) | ((BYTE(1) & 0x3F) << 12) | ((BYTE(2) & 0x3F) << 6) | (BYTE(3) & 0x3F);
        return 4;
    } else {
        return 0;
    }

#undef BYTE
}

static constexpr inline int32_t DecodeUtf8(const char *str)
{
    int32_t uc = -1;
    DecodeUtf8(str, &uc);
    return uc;
}

static inline Size EncodeUtf8(int32_t c, char out_buf[4])
{
    if (c < 0x80) {
        out_buf[0] = (char)c;
        return 1;
    } else if (c < 0x800) {
        out_buf[0] = (char)(0xC0 | (c >> 6));
        out_buf[1] = (char)(0x80 | (c & 0x3F));
        return 2;
    } else if (c >= 0xD800 && c < 0xE000) {
        return 0;
    } else if (c < 0x10000) {
        out_buf[0] = (char)(0xE0 | (c >> 12));
        out_buf[1] = (char)(0x80 | ((c >> 6) & 0x3F));
        out_buf[2] = (char)(0x80 | (c & 0x3F));
        return 3;
    } else if (c < 0x110000) {
        out_buf[0] = (char)(0xF0 | (c >> 18));
        out_buf[1] = (char)(0x80 | ((c >> 12) & 0x3F));
        out_buf[2] = (char)(0x80 | ((c >> 6) & 0x3F));
        out_buf[3] = (char)(0x80 | (c & 0x3F));
        return 4;
    } else {
        return 0;
    }
}

bool IsValidUtf8(Span<const char> str);

#if __has_include("unicode.inc")

int ComputeUnicodeWidth(Span<const char> str);

bool IsXidStart(int32_t uc);
bool IsXidContinue(int32_t uc);

#endif

// ------------------------------------------------------------------------
// CRC
// ------------------------------------------------------------------------

#if __has_include("crc.inc")

uint32_t CRC32(uint32_t state, Span<const uint8_t> buf);
uint32_t CRC32C(uint32_t state, Span<const uint8_t> buf);

uint64_t CRC64xz(uint64_t state, Span<const uint8_t> buf);
uint64_t CRC64nvme(uint64_t state, Span<const uint8_t> buf);

#endif

}
