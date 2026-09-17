# Output and input/output

For simplicity, and because Javascript only has value semantics for primitive types, Koffi can marshal out (or in/out) multiple types of parameters:

- [Structs](composites#structs) (to/from JS objects)
- [Unions](composites#unions)
- [Opaque types](composites#opaque-types)
- String buffers

In order to change an argument from input-only to output or input/output, use the following functions:

- `koffi.out()` on a pointer, e.g. `koffi.out(koffi.pointer(timeval))` (where timeval is a struct type)
- `koffi.inout()` for dual input/output parameters

The same can be done when declaring a function with a C-like prototype string, with the MSDN-like type qualifiers:

- `_Out_` for output parameters
- `_Inout_` for dual input/output parameters

> [!TIP]
> The Win32 API provides many functions that take a pointer to an empty struct for output, except that the first member of the struct (often named `cbSize`) must be set to the size of the struct before calling the function. An example of such a function is `GetLastInputInfo()`.
>
> In order to use these functions in Koffi, you must define the parameter as `_Inout_`: the value must be copied in (to provide `cbSize` to the function) and then the filled struct must be copied out to JS.
>
> Look at the [Win32 example](#win32-struct-example) below for more information.

## Primitive value

This Windows example enumerate all Chrome windows along with their PID and their title. The `GetWindowThreadProcessId()` function illustrates how to get a primitive value from an output argument.

```js
import koffi from 'koffi';
// CJS: const koffi = require('koffi');

const user32 = koffi.load('user32.dll');

const DWORD = koffi.alias('DWORD', 'uint32_t');
const HANDLE = koffi.pointer('HANDLE', koffi.opaque());
const HWND = koffi.alias('HWND', HANDLE);

const FindWindowEx = user32.func('HWND __stdcall FindWindowExW(HWND hWndParent, HWND hWndChildAfter, const char16_t *lpszClass, const char16_t *lpszWindow)');
const GetWindowThreadProcessId = user32.func('DWORD __stdcall GetWindowThreadProcessId(HWND hWnd, _Out_ DWORD *lpdwProcessId)');
const GetWindowText = user32.func('int __stdcall GetWindowTextA(HWND hWnd, _Out_ uint8_t *lpString, int nMaxCount)');

for (let hwnd = null;;) {
    hwnd = FindWindowEx(0, hwnd, 'Chrome_WidgetWin_1', null);

    if (!hwnd)
        break;

    // Get PID
    let pid;
    {
        let ptr = [null];
        let tid = GetWindowThreadProcessId(hwnd, ptr);

        if (!tid) {
            // Maybe the process ended in-between?
            continue;
        }

        pid = ptr[0];
    }

    // Get window title
    let title;
    {
        let buf = Buffer.allocUnsafe(1024);
        let length = GetWindowText(hwnd, buf, buf.length);

        if (!length) {
            // Maybe the process ended in-between?
            continue;
        }

        title = koffi.decode(buf, 'char', length);
    }

    console.log({ PID: pid, Title: title });
}
```

## Struct examples

### POSIX struct example

This example calls the POSIX function `gettimeofday()`, and uses the prototype-like syntax.

```js
import koffi from 'koffi';
// CJS: const koffi = require('koffi');

const lib = koffi.load('libc.so.6');

const timeval = koffi.struct('timeval', {
    tv_sec: 'unsigned int',
    tv_usec: 'unsigned int'
});
const timezone = koffi.struct('timezone', {
    tz_minuteswest: 'int',
    tz_dsttime: 'int'
});

// The _Out_ qualifiers instruct Koffi to marshal out the values
const gettimeofday = lib.func('int gettimeofday(_Out_ timeval *tv, _Out_ timezone *tz)');

let tv = {};
gettimeofday(tv, null);

console.log(tv);
```

### Win32 struct example

Many Win32 functions that use struct outputs require you to set a size member (often named `cbSize`). These functions won't work with `_Out_` because the size value must be copied from JS to C, use `_Inout_` in this case.

```js
import koffi from 'koffi';
// CJS: const koffi = require('koffi');

const user32 = koffi.load('user32.dll');

const LASTINPUTINFO = koffi.struct('LASTINPUTINFO', {
    cbSize: 'uint',
    dwTime: 'uint32'
});
const GetLastInputInfo = user32.func('bool __stdcall GetLastInputInfo(_Inout_ LASTINPUTINFO *plii)');

let info = { cbSize: koffi.sizeof(LASTINPUTINFO) };
let success = GetLastInputInfo(info);

console.log(success, info);
```

## Opaque type example

This example opens an in-memory SQLite database, and uses the node-ffi-style function declaration syntax.

```js
import koffi from 'koffi';
// CJS: const koffi = require('koffi');

const lib = koffi.load('sqlite3.so');

const sqlite3 = koffi.opaque('sqlite3');

// Use koffi.out() on a double pointer to copy out (from C to JS) after the call
const sqlite3_open_v2 = lib.func('sqlite3_open_v2', 'int', ['str', koffi.out(koffi.pointer(sqlite3, 2)), 'int', 'str']);
const sqlite3_close_v2 = lib.func('sqlite3_close_v2', 'int', [koffi.pointer(sqlite3)]);

const SQLITE_OPEN_READWRITE = 0x2;
const SQLITE_OPEN_CREATE = 0x4;

let out = [null];
if (sqlite3_open_v2(':memory:', out, SQLITE_OPEN_READWRITE | SQLITE_OPEN_CREATE, null) != 0)
    throw new Error('Failed to open database');
let db = out[0];

sqlite3_close_v2(db);
```

## String buffer example

This example calls a C function to concatenate two strings to a pre-allocated string buffer. Since JS strings are immutable, you must pass an array with a single string instead.

```c
void ConcatToBuffer(const char *str1, const char *str2, char *out)
{
    size_t len = 0;

    for (size_t i = 0; str1[i]; i++) {
        out[len++] = str1[i];
    }
    for (size_t i = 0; str2[i]; i++) {
        out[len++] = str2[i];
    }

    out[len] = 0;
}
```

```js
const ConcatToBuffer = lib.func('void ConcatToBuffer(const char *str1, const char *str2, _Out_ char *out)');

let str1 = 'Hello ';
let str2 = 'Friends!';

// We need to reserve space for the output buffer! Including the NUL terminator
// because ConcatToBuffer() expects so, but Koffi can convert back to a JS string
// without it (if we reserve the right size).
let out = ['\0'.repeat(str1.length + str2.length + 1)];

ConcatToBuffer(str1, str2, out);

console.log(out[0]);
```

# Output buffers

In most cases, you can use buffers and typed arrays to provide output buffers. This works as long as the buffer only gets used while the native C function is being called. See [transient pointers](#transient-pointers) below for an example.

> [!WARNING]
> It is unsafe to keep the pointer around in the native code, or to change the contents outside of the function call where it is provided.
>
> If you need to provide a pointer that will be kept around, allocate memory with [koffi.alloc()](#stable-pointers) instead.

## Transient pointers

You can use buffers and typed arrays for output (and input/output) pointer parameters. Simply pass the buffer as an argument and the native function will receive a pointer to its contents.

Once the native function returns, you can decode the content with `koffi.decode(value, type)` as in the following example:

```js
import koffi from 'koffi';
// CJS: const koffi = require('koffi');

const lib = koffi.load('libc.so.6');

const Vec3 = koffi.struct('Vec3', {
    x: 'float32',
    y: 'float32',
    z: 'float32'
})

const memcpy = lib.func('void *memcpy(_Out_ void *dest, const void *src, size_t size)');

let vec1 = { x: 1, y: 2, z: 3 };
let vec2 = null;

// Copy the vector in a convoluted way through memcpy
{
    let src = koffi.as(vec1, 'Vec3 *');
    let dest = Buffer.allocUnsafe(koffi.sizeof(Vec3));

    memcpy(dest, src, koffi.sizeof(Vec3));

    vec2 = koffi.decode(dest, Vec3);
}

// CHange vector1, leaving copy alone
[vec1.x, vec1.y, vec1.z] = [vec1.z, vec1.y, vec1.x];

console.log(vec1); // { x: 3, y: 2, z: 1 }
console.log(vec2); // { x: 1, y: 2, z: 3 }
```

See [decoding variables](values#decode-to-js-values) for more information about the decode function.

## Stable pointers

In some cases, the native code may need to change the output buffer at a later time, maybe during a later call or from another thread.

In this case, it is **not safe to use buffers or typed arrays**! 

However, you can use `koffi.alloc(type, len)` to allocate memory and get a pointer that won't move, and can be safely used at any time by the native code. Use [koffi.decode()](values#decode-to-js-values) to read data from the pointer when needed.

The example below sets up some memory to be used as an output buffer where a concatenation function appends a string on each call.

```c
#include <assert.h>
#include <stddef.h>

static char *buf_ptr;
static size_t buf_len;
static size_t buf_size;

void reset_buffer(char *buf, size_t size)
{
    assert(size > 1);

    buf_ptr = buf;
    buf_len = 0;
    buf_size = size - 1; // Keep space for trailing NUL

    buf_ptr[0] = 0;
}

void append_str(const char *str)
{
    for (size_t i = 0; str[i] && buf_len < buf_size; i++, buf_len++) {
        buf_ptr[buf_len] = str[i];
    }
    buf_ptr[buf_len] = 0;
}
```

```js
const reset_buffer = lib.func('void reset_buffer(char *buf, size_t size)');
const append_str = lib.func('void append_str(const char *str)');

let output = koffi.alloc('char', 64);
reset_buffer(output, 64);

append_str('Hello');
console.log(koffi.decode(output, 'char', -1)); // Prints Hello

append_str(' World!');
console.log(koffi.decode(output, 'char', -1)); // Prints Hello World!
```
