# Settings

## Memory usage

For synchronous/normal calls, Koffi uses two preallocated memory blocks:

- One to construct the C stack and assign registers, subsequently used by the platform-specific assembly code (1 MiB by default)
- One to allocate strings and objects/structs (2 MiB by default)

Unless very big strings or objects (at least more than one page of memory) are used, Koffi does not directly allocate any extra memory during calls or callbacks. However, please note that the JS engine (V8) might.

The size (in bytes) of these preallocated blocks can be changed. Use `koffi.config()` to get an object with the settings, and `koffi.config(obj)` to apply new settings.

```js
let config = koffi.config();
console.log(config);
```

The same is true for asynchronous calls. When an asynchronous call is made, Koffi will allocate new blocks unless there is an unused (resident) set of blocks still available. Once the asynchronous call is finished, these blocks are freed if there are more than `resident_async_pools` sets of blocks left around. By default, the preallocated stack and heap blocks are much smaller than for synchronous calls (see [default settings](#default-settings)).

> [!CAUTION]
> The **memory usage can blow up easily** if you increase the size of async memory blocks and many async calls are running or queued at the same time !
>
> For example, with 4096 running/queued async calls, a stack size of 256 kiB and a heap size of 512 kiB, the memory usage will reach approximately _4096 * (256 + 512) kiB ≈ 3 GiB_ just for Koffi, even though most of it will be freed once the number of queued calls goes down.

Async calls run on worker threads, the number of which depends on the number of cores in your machine. Additional async calls are queued, up to `max_async_calls` can run and be queued at the same time. If you try to make an async call once the queue if full, an exception will be thrown.

## Default settings

Setting              | Default | Maximum | Description
-------------------- | ------- | ------- | ----------------------------------------------------
sync_stack_size      | 1 MiB   | 16 MiB  | Stack size for synchronous calls
sync_heap_size       | 2 MiB   | 16 MiB  | Heap size for synchronous calls
async_stack_size     | 128 kiB | 16 MiB  | Stack size for asynchronous calls
async_heap_size      | 128 kiB | 16 MiB  | Heap size for asynchronous calls
resident_async_pools | 4       | 16      | Number of resident pools for asynchronous calls
max_async_calls      | 256     | 4096    | Maximum number of queued asynchronous calls
max_type_size        | 64 MiB  | 512 MiB | Maximum size of Koffi types (for arrays and structs)

# Usage statistics

You can use `koffi.stats()` to get a few statistics related to Koffi.

# POSIX error codes

You can use `koffi.errno()` to get the current errno value, and `koffi.errno(value)` to change it.

The standard POSIX error codes are available in `koffi.os.errno`, as shown below:

```js
const assert = require('assert');

import koffi from 'koffi';
// CJS: const koffi = require('koffi');

const lib = koffi.load('libc.so.6');

const close = lib.func('int close(int fd)');

close(-1);
assert.equal(koffi.errno(), koffi.os.errno.EBADF);

console.log('close() with invalid FD is POSIX compliant!');
```

# Reset internal state

You can use `koffi.reset()` to clear some Koffi internal state such as:

- Parser type names
- Asynchronous function broker (useful to avoid false positive with `jest --detectOpenHandles`)

This function is mainly intended for test code, when you execute the same code over and over and you need to reuse type names.

> [!WARNING]
> Trying to use a function or a type that was initially defined before the reset is undefined behavior and will likely lead to a crash!
