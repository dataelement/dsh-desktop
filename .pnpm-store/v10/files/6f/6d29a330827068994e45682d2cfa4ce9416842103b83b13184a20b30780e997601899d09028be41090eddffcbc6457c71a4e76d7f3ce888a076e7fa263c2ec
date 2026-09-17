# Koffi 2.x to 3.x

Most programs should work as-is with Koffi 3.x.

However, some changes could impact your code:

- Koffi is now distributed in [split packages](#split-packages) to reduce install size/bloat.
- Pointers are now [BigInt values](#bigint-pointers) instead of opaque V8 external values.
- Types created by koffi are now [type objects](#type-objects) instead of opaque V8 external values.
- Using `koffi.register()` with a [receiver value](#registered-callback-binding) is deprecated.
- Several old [deprecated functions](#removed-functions) have been removed.

## Split packages

The main koffi package does not contain native code any longer. Instead, it depends on platform-specific packages (such as `@koromix/koffi-linux-x64`) for platform support, specified through `optionalDependencies`.

Your package manager should automatically install the binary package relevant to your platform. Importing koffi should work transparently, just as before.

However, if you redistribute software that uses Koffi, you will probably **need to change your packaging system** or configure your bundler differently.

## BigInt pointers

For performance reasons, Koffi now uses BigInt numbers for pointers instead of V8 external objects.

Most code should work without any change, but there are two cases where this might impact you:

- If you use a **type system**, for example in TypeScript code (e.g. for parameters), you may need to accept BigInt values now if you pass pointer values around.
- BigInt pointers **do not carry the C type around**. In Koffi 2.x, trying to pass a pointer to an integer to a `void Myfunc(MyStruct *)` function would have triggered an exception, but in Koffi 3.x this will "work" (and probably crash).

## Type objects

Type functions, such as `koffi.struct()`, now create *TypeObject* objects, and type information is directly available without `koffi.introspect()`.

You can resolve type strings to type objects with `koffi.type()`. This function replaces `koffi.resolve()`, which is now a deprecated alias for `koffi.type()`.

> [!NOTE]
> For compatibility reasons, both `koffi.resolve()` and `koffi.introspect()` still exist, as aliases for `koffi.type()`. Using them will emit a deprecation warning.

Read the documentation about [type specifiers](types#type-specifiers) for more information.

The two versions below illustrate the API difference between Koffi 2.x and Koffi 3.x:

```js
// Koffi 2.x

const MyStruct = koffi.struct('MyStruct', {
    a: 'int',
    b: 'int'
});

console.log(koffi.introspect(MyStruct).members); // Prints MyStruct members
console.log(koffi.introspect('MyStruct').members); // Prints MyStruct members

console.log(koffi.introspect(koffi.types.int).alignment); // Prints MyStruct members
console.log(koffi.introspect('int').alignment); // Prints alignment of int type

// Koffi 3.x

const MyStruct = koffi.struct('MyStruct', {
    a: 'int',
    b: 'int'
});

console.log(MyStruct.members); // Prints MyStruct members
console.log(koffi.type('MyStruct').members); // Prints MyStruct members

console.log(koffi.types.int.alignment); // Prints alignment of int type
console.log(koffi.type('int').alignment); // Prints alignment of int type
```

## Registered callback binding

In Koffi 2.x, it was possible to bind a specific `this` value to the callback function when using `koffi.register()`, by passing an object as the first argument. This feature has been deprecated, it still works but will emit a warning.

You should replace these calls with an explicit call to the `bind()` method:

```js
class ValueStore {
    constructor(value) { this.value = value; }
    get() { return this.value; }
}

let store = new ValueStore(42);

// Koffi 2.x

let cb = koffi.register(store, store.get, 'IntCallback *');

// Koffi 3.x

let cb = koffi.register(store.get.bind(store), 'IntCallback *');
```

## Removed functions

Two deprecated functions have been removed:

- `koffi.callback()`: if you still use it, replace with `koffi.proto()`.
- `koffi.handle()`: if you still use it, replace with `koffi.opaque()`.

# Koffi 1.x to 2.x

The API was changed in 2.x in a few ways, in order to reduce some excessively "magic" behavior and reduce the syntax differences between C and the C-like prototypes.

You may need to change your code if you use:

- Callback functions
- Opaque types
- `koffi.introspect()`

## Callback types

In Koffi 1.x, callbacks were defined in a way that made them usable directly as parameter and return types, obscuring the underlying pointer. Now, you must use them through a pointer: `void CallIt(CallbackType func)` in Koffi 1.x becomes `void CallIt(CallbackType *func)` in version 2.0 and newer.

Given the following C code:

```c
#include <string.h>

int TransferToJS(const char *name, int age, int (*cb)(const char *str, int age))
{
    char buf[64];
    snprintf(buf, sizeof(buf), "Hello %s!", str);
    return cb(buf, age);
}
```

The two versions below illustrate the API difference between Koffi 1.x and Koffi 2.x:

```js
// Koffi 1.x

const TransferCallback = koffi.proto('int TransferCallback(const char *str, int age)');

const TransferToJS = lib.func('TransferToJS', 'int', ['str', 'int', TransferCallback]);
// Equivalent to: const TransferToJS = lib.func('int TransferToJS(str s, int x, TransferCallback cb)');

let ret = TransferToJS('Niels', 27, (str, age) => {
    console.log(str);
    console.log('Your age is:', age);
    return 42;
});
console.log(ret);
```

```js
// Koffi 2.x

const TransferCallback = koffi.proto('int TransferCallback(const char *str, int age)');

const TransferToJS = lib.func('TransferToJS', 'int', ['str', 'int', koffi.pointer(TransferCallback)]);
// Equivalent to: const TransferToJS = lib.func('int TransferToJS(str s, int x, TransferCallback *cb)');

let ret = TransferToJS('Niels', 27, (str, age) => {
    console.log(str);
    console.log('Your age is:', age);
    return 42;
});
console.log(ret);
```

Koffi 1.x only supported [transient callbacks](callbacks#javascript-callbacks), you must use Koffi 2.x for registered callbacks.

## Opaque types

In Koffi 1.x, opaque handles were defined in a way that made them usable directly as parameter and return types, obscuring the underlying pointer. Now, in Koffi 2.0, you must use them through a pointer, and use an array for output parameters.

In addition to that, `koffi.handle()` has been deprecated in Koffi 2.1 and replaced with `koffi.opaque()`. They work the same but new code should use `koffi.opaque()`, the former one will eventually be removed in Koffi 3.0.

For functions that return opaque pointers or pass them by parameter:

```js
// Koffi 1.x

const FILE = koffi.handle('FILE');
const fopen = lib.func('fopen', 'FILE', ['str', 'str']);
const fopen = lib.func('fclose', 'int', ['FILE']);

let fp = fopen('EMPTY', 'wb');
if (!fp)
    throw new Error('Failed to open file');
fclose(fp);
```

```js
// Koffi 2.1

// If you use Koffi 2.0: const FILE = koffi.handle('FILE');
const FILE = koffi.opaque('FILE');
const fopen = lib.func('fopen', 'FILE *', ['str', 'str']);
const fopen = lib.func('fclose', 'int', ['FILE *']);

let fp = fopen('EMPTY', 'wb');
if (!fp)
    throw new Error('Failed to open file');
fclose(fp);
```

For functions that set opaque handles through output parameters (such as `sqlite3_open_v2`), you must now use a single element array as shown below:

```js
// Koffi 1.x

const sqlite3 = koffi.handle('sqlite3');

const sqlite3_open_v2 = lib.func('int sqlite3_open_v2(const char *, _Out_ sqlite3 *db, int, const char *)');
const sqlite3_close_v2 = lib.func('int sqlite3_close_v2(sqlite3 db)');

const SQLITE_OPEN_READWRITE = 0x2;
const SQLITE_OPEN_CREATE = 0x4;

let db = {};

if (sqlite3_open_v2(':memory:', db, SQLITE_OPEN_READWRITE | SQLITE_OPEN_CREATE, null) != 0)
    throw new Error('Failed to open database');

sqlite3_close_v2(db);
```

```js
// Koffi 2.1

// If you use Koffi 2.0: const sqlite3 = koffi.handle('sqlite3');
const sqlite3 = koffi.opaque('sqlite3');

const sqlite3_open_v2 = lib.func('int sqlite3_open_v2(const char *, _Out_ sqlite3 **db, int, const char *)');
const sqlite3_close_v2 = lib.func('int sqlite3_close_v2(sqlite3 *db)');

const SQLITE_OPEN_READWRITE = 0x2;
const SQLITE_OPEN_CREATE = 0x4;

let db = null;

let ptr = [null];
if (sqlite3_open_v2(':memory:', ptr, SQLITE_OPEN_READWRITE | SQLITE_OPEN_CREATE, null) != 0)
    throw new Error('Failed to open database');
db = ptr[0];

sqlite3_close_v2(db);
```

## New koffi.introspect()

In Koffi 1.x, `koffi.introspect()` would only work with struct types, and return the object passed to `koffi.struct()` to initialize the type. Now this function works with all types.

You can still get the list of struct members:

```js
const StructType = koffi.struct('StructType', { dummy: 'int' });

// Koffi 1.x
let members = koffi.introspect(StructType);

// Koffi 2.x
let members = koffi.introspect(StructType).members;
```
