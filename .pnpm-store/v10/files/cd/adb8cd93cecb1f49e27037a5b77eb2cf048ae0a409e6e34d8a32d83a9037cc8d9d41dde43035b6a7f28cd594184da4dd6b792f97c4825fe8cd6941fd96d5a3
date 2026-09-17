# Struct types

## Struct definition

Koffi converts JS objects to C structs, and vice-versa.

Unlike function declarations, as of now there is only one way to create a struct type, with the `koffi.struct()` function. This function takes two arguments: the first one is the name of the type, and the second one is an object containing the struct member names and types. You can omit the first argument to declare an anonymous struct.

The following example illustrates how to declare the same struct in C and in JS with Koffi:

```c
typedef struct A {
    int a;
    char b;
    const char *c;
    struct {
        double d1;
        double d2;
    } d;
} A;
```

```js
const A = koffi.struct('A', {
    a: 'int',
    b: 'char',
    c: 'const char *', // Koffi does not care about const, it is ignored
    d: koffi.struct({
        d1: 'double',
        d2: 'double'
    })
});
```

Koffi automatically follows the platform C ABI regarding alignment and padding. However, you can override these rules if needed with:

- Pack all members without padding with `koffi.pack()` (instead of `koffi.struct()`)
- Change alignment of a specific member as shown below

```js
// This struct is 3 bytes long
const PackedStruct = koffi.pack('PackedStruct', {
    a: 'int8_t',
    b: 'int16_t'
});

// This one is 10 bytes long, the second member has an alignment requirement of 8 bytes
const BigStruct = koffi.struct('BigStruct', {
    a: 'int8_t',
    b: [8, 'int16_t']
})
```

Once a struct is declared, you can use it by name (with a string, like you can do for primitive types) or through the value returned by the call to `koffi.struct()`. Only the latter is possible when declaring an anonymous struct.

```js
// The following two function declarations are equivalent, and declare a function taking an A value and returning A
const Function1 = lib.func('A Function(A value)');
const Function2 = lib.func('Function', A, [A]);
```

## Opaque types

Many C libraries use some kind of object-oriented API, with a pair of functions dedicated to create and delete objects. An obvious example of this can be found in stdio.h, with the opaque `FILE *` pointer. You can open and close files with `fopen()` and `fclose()`, and manipulate the opaque pointer with other functions such as `fread()` or `ftell()`.

In Koffi, you can manage this with opaque types. Declare the type with `koffi.opaque(name)`, and use a pointer to this type either as a return type or some kind of [output parameter](output) (with a double pointer).

The full example below implements an iterative string builder (concatenator) in C, and uses it from Javascript to output a mix of Hello World and FizzBuzz. The builder is hidden behind an opaque type, and is created and destroyed using a pair of C functions: `ConcatNew` (or `ConcatNewOut`) and `ConcatFree`.

```c
// Build with: clang -fPIC -o handles.so -shared handles.c -Wall -O2

#include <stdlib.h>
#include <stdbool.h>
#include <stdio.h>
#include <errno.h>
#include <string.h>

typedef struct Fragment {
    struct Fragment *next;

    size_t len;
    char str[];
} Fragment;

typedef struct Concat {
    Fragment *first;
    Fragment *last;

    size_t total;
} Concat;

bool ConcatNew(Concat **out)
{
    Concat *c = malloc(sizeof(*c));
    if (!c) {
        fprintf(stderr, "Failed to allocate memory: %s\n", strerror(errno));
        return false;
    }

    c->first = NULL;
    c->last = NULL;
    c->total = 0;

    *out = c;
    return true;
}

void ConcatFree(Concat *c)
{
    if (!c)
        return;

    Fragment *f = c->first;

    while (f) {
        Fragment *next = f->next;
        free(f);
        f = next;
    }

    free(c);
}

bool ConcatAppend(Concat *c, const char *frag)
{
    size_t len = strlen(frag);

    Fragment *f = malloc(sizeof(*f) + len + 1);
    if (!f) {
        fprintf(stderr, "Failed to allocate memory: %s\n", strerror(errno));
        return false;
    }

    f->next = NULL;
    if (c->last) {
        c->last->next = f;
    } else {
        c->first = f;
    }
    c->last = f;
    c->total += len;

    f->len = len;
    memcpy(f->str, frag, len);
    f->str[len] = 0;

    return true;
}

const char *ConcatBuild(Concat *c)
{
    Fragment *r = malloc(sizeof(*r) + c->total + 1);
    if (!r) {
        fprintf(stderr, "Failed to allocate memory: %s\n", strerror(errno));
        return NULL;
    }

    r->next = NULL;
    r->len = 0;

    Fragment *f = c->first;

    while (f) {
        Fragment *next = f->next;

        memcpy(r->str + r->len, f->str, f->len);
        r->len += f->len;

        free(f);
        f = next;
    }
    r->str[r->len] = 0;

    c->first = r;
    c->last = r;

    return r->str;
}
```

```js
import koffi from 'koffi';
// CJS: const koffi = require('koffi');

const lib = koffi.load('./handles.so');

const Concat = koffi.opaque('Concat');
const ConcatNew = lib.func('bool ConcatNew(_Out_ Concat **out)');
const ConcatFree = lib.func('void ConcatFree(Concat *c)');
const ConcatAppend = lib.func('bool ConcatAppend(Concat *c, const char *frag)');
const ConcatBuild = lib.func('const char *ConcatBuild(Concat *c)');

// The new function uses an output parameter, and returns success with a boolean.
let ptr = [null];
if (!ConcatNew(ptr))
    throw new Error('Allocation failure');
let c = ptr[0];

try {
    if (!ConcatAppend(c, 'Hello... '))
        throw new Error('Allocation failure');
    if (!ConcatAppend(c, 'World!\n'))
        throw new Error('Allocation failure');

    for (let i = 1; i <= 30; i++) {
        let frag;
        if (i % 15 == 0) {
            frag = 'FizzBuzz';
        } else if (i % 5 == 0) {
            frag = 'Buzz';
        } else if (i % 3 == 0) {
            frag = 'Fizz';
        } else {
            frag = String(i);
        }

        if (!ConcatAppend(c, frag))
            throw new Error('Allocation failure');
        if (!ConcatAppend(c, ' '))
            throw new Error('Allocation failure');
    }

    let str = ConcatBuild(c);
    if (str == null)
        throw new Error('Allocation failure');
    console.log(str);
} finally {
    ConcatFree(c);
}
```

# Array types

## Fixed-size C arrays

Fixed-size arrays are declared with `koffi.array(type, length)`. Just like in C, they cannot be passed as functions parameters (they degenerate to pointers), or returned by value. You can however embed them in struct types.

Koffi applies the following conversion rules when passing arrays to/from C:

- **JS to C**: Koffi can take a normal Array (e.g. `[1, 2]`) or a TypedArray of the correct type (e.g. `Uint8Array` for an array of `uint8_t` numbers)
- **C to JS** (return value, output parameters, callbacks): Koffi will use a TypedArray if possible. But you can change this behavior when you create the array type with the optional hint argument: `koffi.array('uint8_t', 64, 'Array')`. For non-number types, such as arrays of strings or structs, Koffi creates normal arrays.

See the example below:

```js
import koffi from 'koffi';
// CJS: const koffi = require('koffi');

// Those two structs are exactly the same, only the array conversion hint is different
const Foo1 = koffi.struct('Foo1', {
    i: 'int',
    a16: koffi.array('int16_t', 2)
});
const Foo2 = koffi.struct('Foo2', {
    i: 'int',
    a16: koffi.array('int16_t', 2, 'Array')
});

// Uses an hypothetical C function that just returns the struct passed as a parameter
const ReturnFoo1 = lib.func('Foo1 ReturnFoo(Foo1 p)');
const ReturnFoo2 = lib.func('Foo2 ReturnFoo(Foo2 p)');

console.log(ReturnFoo1({ i: 5, a16: [6, 8] })) // Prints { i: 5, a16: Int16Array(2) [6, 8] }
console.log(ReturnFoo2({ i: 5, a16: [6, 8] })) // Prints { i: 5, a16: [6, 8] }
```

You can also declare arrays with the C-like short syntax in type declarations, as shown below:

```js
const StructType = koffi.struct('StructType', {
    f8: 'float [8]',
    self4: 'StructType *[4]'
});
```

## Fixed-size string buffers

Koffi can also convert JS strings to fixed-sized arrays in the following cases:

- **char arrays** are filled with the UTF-8 encoded string, truncated if needed. The buffer is always NUL-terminated.
- **char16 (or char16_t) arrays** are filled with the UTF-16 encoded string, truncated if needed. The buffer is always NUL-terminated.
- **char32 (or char32_t) arrays** are filled with the UTF-32 encoded string, truncated if needed. The buffer is always NUL-terminated.

The reverse case is also true, Koffi can convert a C fixed-size buffer to a JS string. This happens by default for char, char16_t and char32_t arrays, but you can also explicitly ask for this with the `String` array hint (e.g. `koffi.array('char', 8, 'String')`).

## Flexible arrays

C structs ending with a flexible array member are often used for variable-sized structs, and are generally paired with dynamic memory allocation. In many cases, the number of elements is described by another struct member.

Use `koffi.array(type, countedBy, maxLen)` to make a flexible array type, for which the array length is determined by the struct member indicated by the `countedBy` parameter. Flexible array types can only be used as the last member of a struct, as shown below:

```js
const FlexibleArray = koffi.struct('FlexibleArray', {
    count: 'size_t',
    numbers: koffi.array('int', 'count', 128)
});
````

For various reasons, Koffi requires you to specify an upper bound (`maxLen`) for the number of elements in the flexible array member.

> [!WARNING]
> Also, unlike C flexible arrays, the struct size will expand to accomodate the maximum size of the flexible array.

The following example illustrates how to use a flexible array API in C from Koffi.

```c
// Build with: clang -fPIC -o flexible.so -shared flexible.c -Wall -O2

#include <stddef.h>

struct FlexibleArray {
    size_t count;
    int numbers[];
};

void AppendValues(struct FlexibleArray *arr, size_t count, int start, int step)
{
    for (size_t i = 0; i < count; i++) {
        arr->numbers[arr->count + i] = start + i * step;
    }
    arr->count += count;
}
```

```js
import koffi from 'koffi';
// CJS: const koffi = require('koffi');

const lib = koffi.load('./flexible.so');

const FlexibleArray = koffi.struct('FlexibleArray', {
    count: 'size_t',
    numbers: koffi.array('int', 'count', 256, 'Array')
});

const AppendValues = lib.func('void AppendValues(_Inout_ FlexibleArray *arr, int count, int start, int step)');

let array = { count: 0, numbers: [] };

AppendValues(array, 5, 1, 1);
console.log(array); // Prints { count: 5, numbers: [1, 2, 3, 4, 5] }

AppendValues(array, 3, 10, 2);
console.log(array); // Prints { count: 8, numbers: [1, 2, 3, 4, 5, 10, 12, 14] }
```

> [!NOTE]
> This is frequently used in the Win32 API, an exemple of this is [AllocateAndInitializeSid()](https://learn.microsoft.com/windows/win32/api/securitybaseapi/nf-securitybaseapi-allocateandinitializesid).

## Dynamic arrays (pointers)

In C, dynamically-sized arrays are usually passed around as pointers. Read more about [array pointers](pointers#dynamic-arrays) in the relevant section.

# Unions

You can declare unions with a syntax similar to structs, but with the `koffi.union()` function. This function takes two arguments: the first one is the name of the type, and the second one is an object containing the union member names and types. You can omit the first argument to declare an anonymous union.

The following example illustrates how to declare the same union in C and in JS with Koffi:

```c
typedef union IntOrDouble {
    int64_t i;
    double d;
} IntOrDouble;
```

```js
const IntOrDouble = koffi.union('IntOrDouble', {
    i: 'int64_t',
    d: 'double'
});
```

## Input unions

### Passing union values to C

You can instantiate an union object with `koffi.Union(type)`. This will create a special object that contains at most one active member.

Once you have created an instance of your union, you can simply set the member with the dot operator as you would with a basic object. Then, simply pass your union value to the C function you wish.

```js
const U = koffi.union('U', { i: 'int', str: 'char *' });

const DoSomething = lib.func('void DoSomething(const char *type, U u)');

const u1 = new koffi.Union('U'); u1.i = 42;
const u2 = new koffi.Union('U'); u2.str = 'Hello!';

DoSomething('int', u1);
DoSomething('string', u2);
```

For simplicity, Koffi also accepts object literals with one property (no more, no less) setting the corresponding union member. The example belows uses this to simplify the code shown above:

```js
const U = koffi.union('U', { i: 'int', str: 'char *' });

const DoSomething = lib.func('void DoSomething(const char *type, U u)');

DoSomething('int', { i: 42 });
DoSomething('string', { str: 'Hello!' });
```

### Win32 example

The following example uses the [SendInput](https://learn.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-sendinput) Win32 API to emit the Win+D shortcut and hide windows (show the desktop).

```js
import koffi from 'koffi';
// CJS: const koffi = require('koffi');

// Win32 type and functions

const user32 = koffi.load('user32.dll');

const INPUT_MOUSE = 0;
const INPUT_KEYBOARD = 1;
const INPUT_HARDWARE = 2;

const KEYEVENTF_KEYUP = 0x2;
const KEYEVENTF_SCANCODE = 0x8;

const VK_LWIN = 0x5B;
const VK_D = 0x44;

const MOUSEINPUT = koffi.struct('MOUSEINPUT', {
    dx: 'long',
    dy: 'long',
    mouseData: 'uint32_t',
    dwFlags: 'uint32_t',
    time: 'uint32_t',
    dwExtraInfo: 'uintptr_t'
});
const KEYBDINPUT = koffi.struct('KEYBDINPUT', {
    wVk: 'uint16_t',
    wScan: 'uint16_t',
    dwFlags: 'uint32_t',
    time: 'uint32_t',
    dwExtraInfo: 'uintptr_t'
});
const HARDWAREINPUT = koffi.struct('HARDWAREINPUT', {
    uMsg: 'uint32_t',
    wParamL: 'uint16_t',
    wParamH: 'uint16_t'
});

const INPUT = koffi.struct('INPUT', {
    type: 'uint32_t',
    u: koffi.union({
        mi: MOUSEINPUT,
        ki: KEYBDINPUT,
        hi: HARDWAREINPUT
    })
});

const SendInput = user32.func('unsigned int __stdcall SendInput(unsigned int cInputs, INPUT *pInputs, int cbSize)');

// Show/hide desktop with Win+D shortcut

let events = [
    make_keyboard_event(VK_LWIN, true),
    make_keyboard_event(VK_D, true),
    make_keyboard_event(VK_D, false),
    make_keyboard_event(VK_LWIN, false)
];

SendInput(events.length, events, koffi.sizeof(INPUT));

// Utility

function make_keyboard_event(vk, down) {
    let event = {
        type: INPUT_KEYBOARD,
        u: {
            ki: {
                wVk: vk,
                wScan: 0,
                dwFlags: down ? 0 : KEYEVENTF_KEYUP,
                time: 0,
                dwExtraInfo: 0
            }
        }
    };

    return event;
}
```

## Output unions

Unlike structs, Koffi does not know which union member is valid, and it cannot decode it automatically. You can however use special `koffi.Union` objects for output parameters, and decode the memory after the call.

To decode an output union pointer parameter, create a placeholder object with `new koffi.Union(type)` and pass the resulting object to the function.

After the call, you can dereference the member value you want on this object and Koffi will decode it at this moment.

The following example illustrates the use of `koffi.Union()` to decode output unions after the call.

```c
#include <stdint.h>

typedef union IntOrDouble {
    int64_t i;
    double d;
} IntOrDouble;

void SetUnionInt(int64_t i, IntOrDouble *out)
{
    out->i = i;
}

void SetUnionDouble(double d, IntOrDouble *out)
{
    out->d = d;
}
```

```js
const IntOrDouble = koffi.union('IntOrDouble', {
    i: 'int64_t',
    d: 'double',
    raw: koffi.array('uint8_t', 8)
});

const SetUnionInt = lib.func('void SetUnionInt(int64_t i, _Out_ IntOrDouble *out)');
const SetUnionDouble = lib.func('void SetUnionDouble(double d, _Out_ IntOrDouble *out)');

let u1 = new koffi.Union('IntOrDouble');
let u2 = new koffi.Union('IntOrDouble');

SetUnionInt(123, u1);
SetUnionDouble(123, u2);

console.log(u1.i, '---', u1.raw); // Prints 123 --- Uint8Array(8) [123, 0, 0, 0, 0, 0, 0, 0]
console.log(u2.d, '---', u2.raw); // Prints 123 --- Uint8Array(8) [0, 0, 0, 0, 0, 0, 69, 64]
```
