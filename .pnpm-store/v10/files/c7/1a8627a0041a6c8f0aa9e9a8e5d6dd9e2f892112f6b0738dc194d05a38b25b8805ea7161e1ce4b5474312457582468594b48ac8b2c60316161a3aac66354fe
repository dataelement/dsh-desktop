# Loading libraries

To declare functions, start by loading the shared library with `koffi.load(filename)`.

```js
import koffi from 'koffi';
// CJS: const koffi = require('koffi');

const lib = koffi.load('/path/to/shared/library'); // File extension depends on platforms: .so, .dll, .dylib, etc.
```

This library will be automatically unloaded once all references to it are gone (including all the functions that use it, as described below).

## Load options

The `load` function can take an optional object argument, with the following options:

```js
const options = {
    lazy: true, // Use RTLD_LAZY (lazy-binding) on POSIX platforms (by default, use RTLD_NOW)
    global: true, // Use RTLD_GLOBAL on POSIX platforms (by default, use RTLD_LOCAL)
    deep: true // Use RTLD_DEEPBIND if supported (Linux, FreeBSD)
};

const lib = koffi.load('/path/to/shared/library.so', options);
```

More options may be added if needed.

## Unloading

Use `lib.unload()` to can explicitly unload a library. Any attempt to find or call a function from this library after unloading it will crash.

> [!NOTE]
> On some platforms (such as with the [musl C library on Linux](https://wiki.musl-libc.org/functional-differences-from-glibc.html#Unloading-libraries)), shared libraries cannot be unloaded, so the library will remain loaded and memory mapped after the call to `lib.unload()`.

# Functions

## Definition syntax

Use the object returned by `koffi.load()` to load C functions from the library. To do so, you can use two syntaxes:

- The classic syntax, inspired by node-ffi
- C-like prototypes

### Classic syntax

To declare a function, you need to specify its non-mangled name, its return type, and its parameters. Use an ellipsis as the last parameter for variadic functions.

```js
const atoi = lib.func('atoi', 'int', ['str']);
```

Once a native function has been declared, you can simply call it as you would any other JS function:

```js
let value = atoi('1257'); // Returns 1257 as number
console.log(typeof value); // Print number
```

Koffi automatically tries mangled names for non-standard x86 calling conventions. See the section on [calling conventions](#calling-conventions) for more information on this subject.

### C-like prototypes

If you prefer, you can declare functions using simple C-like prototype strings, as shown below:

```js
// The parameter name (nptn below) is not used by Koffi, and optional, but can be nice for documentation
const atoi = lib.func('int atoi(const char *nptr)');
```

Once a native function has been declared, you can simply call it as you would any other JS function:

```js
let value = atoi('1257'); // Returns 1257 as number
console.log(typeof value); // Print number
```

You can use `()` or `(void)` for functions that take no argument.

## Variadic functions

Variadic functions are declared with an ellipsis as the last argument.

In order to call a variadic function, you must provide two Javascript arguments for each additional C parameter, the first one is the expected type and the second one is the value.

```js
// These two declarations are identical
const printf1 = lib.func('printf', 'int', ['str', '...']);
const printf2 = lib.func('int printf(str fmt, ...)');

// The variadic arguments are: 6 (int), 8.5 (double), 'THE END' (const char *)
printf1('Integer %d, double %g, str %s', 'int', 6, 'double', 8.5, 'str', 'THE END');
printf2('Integer %d, double %g, str %s', 'int', 6, 'double', 8.5, 'str', 'THE END');
```

On x86 platforms, only the Cdecl convention can be used for variadic functions.

## Calling conventions

Most architectures only support one procedure call standard per process. The 32-bit x86 platform is an exception to this, and Koffi supports several x86 conventions:

 Convention   | Classic form                                  | Prototype form | Description
------------- | --------------------------------------------- | -------------- | -------------------------------------------------------------------
 **Cdecl**    | `koffi.func(name, ret, params)`               | _(default)_    | This is the default convention, and the only one on other platforms
 **Stdcall**  | `koffi.func('__stdcall', name, ret, params)`  | __stdcall      | This convention is used extensively within the Win32 API
 **Fastcall** | `koffi.func('__fastcall', name, ret, params)` | __fastcall     | Rarely used, uses ECX and EDX for first two parameters
 **Thiscall** | `koffi.func('__thiscall', name, ret, params)` | __thiscall     | Rarely used, uses ECX for first parameter

You can safely use these on non-x86 platforms, they are simply ignored.

Below you can find a small example showing how to use a non-default calling convention, with the two syntaxes:

```js
import koffi from 'koffi';
// CJS: const koffi = require('koffi');

const lib = koffi.load('user32.dll');

// The following two declarations are equivalent, and use stdcall on x86 (and the default ABI on other platforms)
const MessageBoxA1 = lib.func('__stdcall', 'MessageBoxA', 'int', ['void *', 'str', 'str', 'uint']);
const MessageBoxA2 = lib.func('int __stdcall MessageBoxA(void *hwnd, str text, str caption, uint type)');
```

## Asynchronous calls

You can issue asynchronous calls by calling the function through its async member. In this case, you need to provide a callback function as the last argument, with `(err, res)` parameters.

```js
import koffi from 'koffi';
// CJS: const koffi = require('koffi');

const lib = koffi.load('libc.so.6');

const atoi = lib.func('int atoi(const char *str)');

atoi.async('1257', (err, res) => {
    console.log('Result:', res);
})
console.log('Hello World!');

// This program will print:
//   Hello World!
//   Result: 1257
```

These calls are executed by worker threads. It is **your responsibility to deal with data sharing issues** in the native code that may be caused by multi-threading.

You can easily convert this callback-style async function to a promise-based version with `util.promisify()` from the Node.js standard library.

Variadic functions cannot be called asynchronously.

> [!WARNING]
> Asynchronous functions run on worker threads. You need to deal with thread safety issues if you share data between threads.

## Conversion of parameters

By default, Koffi will only forward and translate arguments from Javascript to C. However, many C functions use pointer arguments for output values, or input/output values.

Among other thing, in the the following pages you will learn more about:

- The [primitives types](primitives) supported by Koffi
- How to define [composite types](composites): structs, arrays and unions
- How you can [define and use pointers](pointers)
- How to deal with [output parameters](output)

# Variables

*Changed in Koffi 3.1.0*

To find an exported variable symbol, use `lib.symbol(name)`. You need to specify its name and its type.

```c
int my_int = 42;
const char *my_string = NULL;
```

```js
const my_int = lib.symbol('my_int');
const my_string = lib.symbol('my_string');
```

This function returns a pointer (a BigInt value in Koffi 3). To read or change the value of the variable, you can use:

- [koffi.decode()](values#decode-to-js-values) to read the value
- [koffi.encode()](values#encode-to-c-memory) to change the value

> [!NOTE]
> Until Koffi 3.1.0, the `symbol()` function required you to give a type, even though it did nothing with this information. This was a leftover from Koffi 2.
> 
> For compatibility, you can still call `lib.symbol(name, type)`, but this is deprecated.
