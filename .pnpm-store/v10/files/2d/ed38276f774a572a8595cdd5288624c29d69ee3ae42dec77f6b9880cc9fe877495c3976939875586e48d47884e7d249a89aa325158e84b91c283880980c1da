# How pointers are used

In C, pointer arguments are used for differenty purposes. It is important to distinguish these use cases because Koffi provides different ways to deal with each of them:

- **Struct pointers**: Use of struct pointers by C libraries fall in two cases: avoid (potentially) expensive copies, and to let the function change struct contents (output or input/output arguments).
- **Opaque pointers**: the library does not expose the contents of the structs, and only provides you with a pointer to it (e.g. `FILE *`). Only the functions provided by the library can do something with this pointer, in Koffi we call this an opaque type. This is usually done for ABI-stability reason, and to prevent library users from messing directly with library internals.
- **Pointers to primitive types**: This is more rare, and generally used for output or input/output arguments. The Win32 API has a lot of these.
- **Arrays**: in C, dynamically-sized arrays are usually passed to functions with pointers, either NULL-terminated (or any other sentinel value) or with an additional length argument.

Koffi uses BigInt numbers to represent pointers.

# Data pointers

## Struct pointers

The following Win32 example uses `GetCursorPos()` (with an [output parameter](output)) to retrieve and show the current cursor position.

```js
import koffi from 'koffi';
// CJS: const koffi = require('koffi');

const lib = koffi.load('user32.dll');

// Type declarations
const POINT = koffi.struct('POINT', {
    x: 'long',
    y: 'long'
});

// Functions declarations
const GetCursorPos = lib.func('int __stdcall GetCursorPos(_Out_ POINT *pos)');

// Get and show cursor position
let pos = {};
if (!GetCursorPos(pos))
    throw new Error('Failed to get cursor position');
console.log(pos);
```

## Opaque pointers

Some C libraries use handles, which behave as pointers to opaque structs. An example of this is the HANDLE type in the Win32 API. If you want to reproduce this behavior, you can define a **named pointer type** to an opaque type, like so:

```js
const HANDLE = koffi.pointer('HANDLE', koffi.opaque());

// And now you get to use it this way:
const GetHandleInformation = lib.func('bool __stdcall GetHandleInformation(HANDLE h, _Out_ uint32_t *flags)');
const CloseHandle = lib.func('bool __stdcall CloseHandle(HANDLE h)');
```

## Pointer to primitive types

In Javascript, it is not possible to pass a primitive value by reference to another function. This means that you cannot call a function and expect it to modify the value of one of its number or string parameter.

However, arrays and objects (among others) are reference type values. Assigning an array or an object from one variable to another does not invole any copy. Instead, as the following example illustrates, the new variable references the same array as the first:

```js
let list1 = [1, 2];
let list2 = list1;

list2[1] = 42;

console.log(list1); // Prints [1, 42]
```

All of this means that C functions that are expected to modify their primitive output values (such as an `int *` parameter) cannot be used directly. However, thanks to Koffi's transparent array support, you can use Javascript arrays to approximate reference semantics with single-element arrays.

Below, you can find an example of an addition function where the result is stored in an `int *` [input/output parameter](output) and how to use this function from Koffi.

```c
void AddInt(int *dest, int add)
{
    *dest += add;
}
```

You can simply pass a single-element array as the first argument:

```js
const AddInt = lib.func('void AddInt(_Inout_ int *dest, int add)');

let sum = [36];
AddInt(sum, 6);

console.log(sum[0]); // Prints 42
```

## Dynamic arrays

In C, dynamically-sized arrays are usually passed around as pointers. The length is either passed as an additional argument, or inferred from the array content itself, for example with a terminating sentinel value (such as a NULL pointers in the case of an array of strings).

Koffi can translate JS arrays and TypedArrays to pointer arguments. However, because C does not have a proper notion of dynamically-sized arrays (fat pointers), you need to provide the length or the sentinel value yourself depending on the API.

Here is a simple example of a C function taking a NULL-terminated list of strings as input, to calculate the total length of all strings.

```c
// Build with: clang -fPIC -o length.so -shared length.c -Wall -O2

#include <stdlib.h>
#include <stdint.h>
#include <string.h>

int64_t ComputeTotalLength(const char **strings)
{
    int64_t total = 0;

    for (const char **ptr = strings; *ptr; ptr++) {
        const char *str = *ptr;
        total += strlen(str);
    }

    return total;
}
```

```js
import koffi from 'koffi';
// CJS: const koffi = require('koffi');

const lib = koffi.load('./length.so');

const ComputeTotalLength = lib.func('int64_t ComputeTotalLength(const char **strings)');

let strings = ['Get', 'Total', 'Length', null];
let total = ComputeTotalLength(strings);

console.log(total); // Prints 14
```

By default, just like for objects, array arguments are copied from JS to C but not vice-versa. You can however change the direction as documented in the section on [output parameters](output).

# Function pointers

You can call a function pointer in two ways:

- Directly call the function pointer with `koffi.call(ptr, type, ...)`
- Decode the function pointer to an actual function with `koffi.decode(ptr, type)`

The example below shows how to call an `int (*)(int, int)` C function pointer both ways, based on the following native C library:

```c
typedef int BinaryIntFunc(int a, int b);

static int AddInt(int a, int b) { return a + b; }
static int SubstractInt(int a, int b) { return a - b; }

BinaryIntFunc *GetBinaryIntFunction(const char *type)
{
    if (!strcmp(type, "add")) {
        return AddInt;
    } else if (!strcmp(type, "substract")) {
        return SubstractInt;
    } else {
        return NULL;
    }
}
```

## Call pointer directly

Use `koffi.call(ptr, type, ...)` to call a function pointer. The first two arguments are the pointer itself and the type of the function you are trying to call (declared with `koffi.proto()` as shown below), and the remaining arguments are used for the call.

```js
// Declare function type
const BinaryIntFunc = koffi.proto('int BinaryIntFunc(int a, int b)');

const GetBinaryIntFunction = lib.func('BinaryIntFunc *GetBinaryIntFunction(const char *name)');

const add_ptr = GetBinaryIntFunction('add');
const substract_ptr = GetBinaryIntFunction('substract');

let sum = koffi.call(add_ptr, BinaryIntFunc, 4, 5);
let delta = koffi.call(substract_ptr, BinaryIntFunc, 100, 58);

console.log(sum, delta); // Prints 9 and 42
```

## Decode pointer to function

Use `koffi.decode(ptr, type)` to get back a JS function, which you can then use like any other Koffi function.

```js
// Declare function type
const BinaryIntFunc = koffi.proto('int BinaryIntFunc(int a, int b)');

const GetBinaryIntFunction = lib.func('BinaryIntFunc *GetBinaryIntFunction(const char *name)');

const add = koffi.decode(GetBinaryIntFunction('add'), BinaryIntFunc);
const substract = koffi.decode(GetBinaryIntFunction('substract'), BinaryIntFunc);

let sum = add(4, 5);
let delta = substract(100, 58);

console.log(sum, delta); // Prints 9 and 42
```

This method also allows you to perform an [asynchronous call](load#asynchronous-calls) with the async member of the decoded function.

# Handling void pointers

Many C functions use `void *` parameters in order to pass polymorphic objects and arrays, meaning that the data format changes can change depending on one other argument, or on some kind of struct tag member.

Koffi provides two features to deal with this:

- You can use `koffi.as(value, type)` to tell Koffi what kind of type is actually expected, as shown in the example below.
- Buffers and typed JS arrays can be used as values in place everywhere a pointer is expected. See [dynamic arrays](#dynamic-arrays) for more information, for input or output.

The example below shows the use of `koffi.as()` to read the header of a PNG file with `fread()` directly to a JS object. It also uses [endian-sensitive integers](primitives#endian-sensitive-integers) to decode PNG header values:

```js
import koffi from 'koffi';
// CJS: const koffi = require('koffi');

const lib = koffi.load('libc.so.6');

const FILE = koffi.opaque('FILE');

const PngHeader = koffi.pack('PngHeader', {
    signature: koffi.array('uint8_t', 8),
    ihdr: koffi.pack({
        length: 'uint32_be_t',
        chunk: koffi.array('char', 4),
        width: 'uint32_be_t',
        height: 'uint32_be_t',
        depth: 'uint8_t',
        color: 'uint8_t',
        compression: 'uint8_t',
        filter: 'uint8_t',
        interlace: 'uint8_t',
        crc: 'uint32_be_t'
    })
});

const fopen = lib.func('FILE *fopen(const char *path, const char *mode)');
const fclose = lib.func('int fclose(FILE *fp)');
const fread = lib.func('size_t fread(_Out_ void *ptr, size_t size, size_t nmemb, FILE *fp)');

let filename = process.argv[2];
if (filename == null)
    throw new Error('Usage: node png.js <image.png>');

let hdr = {};
{
    let fp = fopen(filename, 'rb');
    if (!fp)
        throw new Error(`Failed to open '${filename}'`);

    try {
        let len = fread(koffi.as(hdr, 'PngHeader *'), 1, koffi.sizeof(PngHeader), fp);
        if (len < koffi.sizeof(PngHeader))
            throw new Error('Failed to read PNG header');
    } finally {
        fclose(fp);
    }
}

console.log('PNG header:', hdr);
```

# Disposable types

Disposable types allow you to register a function that will automatically called after each C to JS conversion performed by Koffi. This can be used to avoid leaking heap-allocated strings, for example.

Some C functions return heap-allocated values directly or through output parameters. While Koffi automatically converts values from C to JS (to a string or an object), it does not know when something needs to be freed, or how.

For opaque types, such as FILE, this does not matter because you will explicitly call `fclose()` on them. But some values (such as strings) get implicitly converted by Koffi, and you lose access to the original pointer. This creates a leak if the string is heap-allocated.

To avoid this, you can instruct Koffi to call a function on the original pointer once the conversion is done, by creating a **disposable type** with `koffi.dispose(name, type, func)`. This creates a type derived from another type, the only difference being that *func* gets called with the original pointer once the value has been converted and is not needed anymore.

The *name* can be omitted to create an anonymous disposable type. If *func* is omitted or is null, Koffi will use `koffi.free(ptr)` (which calls the standard C library *free* function under the hood).

```js
const AnonHeapStr = koffi.disposable('str'); // Anonymous type (cannot be used in function prototypes)
const NamedHeapStr = koffi.disposable('HeapStr', 'str'); // Same thing, but named so usable in function prototypes
const ExplicitFree = koffi.disposable('HeapStr16', 'str16', koffi.free); // You can specify any other JS function
```

The following example illustrates the use of a disposable type derived from *str*.

```js
import koffi from 'koffi';
// CJS: const koffi = require('koffi');

const lib = koffi.load('libc.so.6');

const HeapStr = koffi.disposable('str');
const strdup = lib.cdecl('strdup', HeapStr, ['str']);

let copy = strdup('Hello!');
console.log(copy); // Prints Hello!
```

When you declare functions with the [prototype-like syntax](load#definition-syntax), you can either use named disposable types or use the '!' shortcut qualifier with compatibles types, as shown in the example below. This qualifier creates an anonymous disposable type that calls `koffi.free(ptr)`.

```js
import koffi from 'koffi';
// CJS: const koffi = require('koffi');

const lib = koffi.load('libc.so.6');

// You can also use: const strdup = lib.func('const char *! strdup(const char *str)')
const strdup = lib.func('str! strdup(const char *str)');

let copy = strdup('World!');
console.log(copy); // Prints World!
```

Disposable types can only be created from pointer or string types.

> [!WARNING]
> Be careful on Windows: if your shared library uses a different CRT (such as msvcrt), the memory could have been allocated by a different malloc/free implementation or heap, resulting in undefined behavior if you use `koffi.free()`.

# External buffers (views)

You can access unmanaged memory with `koffi.view(ptr, len)`. This function takes a pointer and a length, and creates an ArrayBuffer through which you can access the underlying memory without copy.

> [!NOTE]
> Some runtimes (such as Electron) forbid the use of external buffers. In this case, trying to create a view will trigger an exception.

The following Linux example writes the string "Hello World!" to a file named "hello.txt" through mmaped memory, to demontrate the use of `koffi.view()`:

```js
import koffi from 'koffi';
// CJS: const koffi = require('koffi');

const libc = koffi.load('libc.so.6');

const mode_t = koffi.alias('mode_t', 'uint32_t');
const off_t = koffi.alias('off_t', 'int64_t');

// These values are used on Linux and may differ on other systems
const O_RDONLY = 00000000;
const O_WRONLY = 00000001;
const O_RDWR = 00000002;
const O_CREAT = 00000100;
const O_EXCL = 00000200;
const O_CLOEXEC = 02000000;

// These values are used on Linux and may differ on other systems
const PROT_READ = 0x01;
const PROT_WRITE = 0x02;
const PROT_EXEC = 0x04;
const MAP_SHARED = 0x01;
const MAP_PRIVATE = 0x02;

const open = libc.func('int open(const char *path, int flags, uint32_t mode)');
const close = libc.func('int close(int fd)');
const ftruncate = libc.func('int ftruncate(int fd, off_t length)');
const mmap = libc.func('void *mmap(void *addr, size_t length, int prot, int flags, int fd, off_t offset)');
const munmap = libc.func('int munmap(void *addr, size_t length)');
const strerror = libc.func('const char *strerror(int errnum)');

write('hello.txt', 'Hello World!');

function write(filename, str) {
    let fd = -1;
    let ptr = null;

    // Work with encoded string
    str = Buffer.from(str);

    try {
        fd = open(filename, O_CREAT | O_EXCL | O_RDWR | O_CLOEXEC, 0644);
        if (fd < 0)
            throw new Error(`Failed to create '${filename}': ` + strerror(koffi.errno()));

        if (ftruncate(fd, str.length) < 0)
            throw new Error(`Failed to resize '${filename}': ` + strerror(koffi.errno()));

        ptr = mmap(null, str.length, PROT_READ | PROT_WRITE, MAP_SHARED, fd, 0);
        if (ptr == null)
            throw new Error(`Failed to map '${filename}' to memory: ` + strerror(koffi.errno()));

        let ab = koffi.view(ptr, str.length);
        let view = new Uint8Array(ab);

        str.copy(view);
     } finally {
        if (ptr != null)
            munmap(ptr, str.length);
        close(fd);
    }
}
```
