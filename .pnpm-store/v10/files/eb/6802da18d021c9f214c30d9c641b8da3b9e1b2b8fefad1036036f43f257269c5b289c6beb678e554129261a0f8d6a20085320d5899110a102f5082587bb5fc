# Install Koffi

You can install Koffi with npm:

```sh
npm install koffi
```

Once you have installed Koffi, you can start by loading it:

```js
// ES6 modules
import koffi from 'koffi';

// CommonJS syntax
const koffi = require('koffi');
```

> [!NOTE]
> Follow the [build instructions](contribute#build-from-source) if you want to build the native Koffi code yourself, to fix something or simply to study the code.

# Simple examples

Below you can find two examples:

* The first one runs on Linux. The functions are declared with the C-like prototype language.
* The second one runs on Windows, and uses the node-ffi like syntax to declare functions.

## For Linux

This is a small example for Linux systems, which uses `gettimeofday()`, `localtime_r()` and `printf()` to print the current time.

It illustrates the use of output parameters.

```js
import koffi from 'koffi';
// CJS: const koffi = require('koffi');

// Load the shared library
const lib = koffi.load('libc.so.6');

// Declare struct types
const timeval = koffi.struct('timeval', {
    tv_sec: 'unsigned int',
    tv_usec: 'unsigned int'
});
const timezone = koffi.struct('timezone', {
    tz_minuteswest: 'int',
    tz_dsttime: 'int'
});
const time_t = koffi.struct('time_t', { value: 'int64_t' });
const tm = koffi.struct('tm', {
    tm_sec: 'int',
    tm_min: 'int',
    tm_hour: 'int',
    tmay: 'int',
    tm_mon: 'int',
    tm_year: 'int',
    tm_wday: 'int',
    tm_yday: 'int',
    tm_isdst: 'int'
});

// Find functions
const gettimeofday = lib.func('int gettimeofday(_Out_ timeval *tv, _Out_ timezone *tz)');
const localtime_r = lib.func('tm *localtime_r(const time_t *timeval, _Out_ tm *result)');
const printf = lib.func('int printf(const char *format, ...)');

// Get local time
let tv = {};
let now = {};
gettimeofday(tv, null);
localtime_r({ value: tv.tv_sec }, now);

// And format it with printf (variadic function)
printf('Hello World!\n');
printf('Local time: %02d:%02d:%02d\n', 'int', now.tm_hour, 'int', now.tm_min, 'int', now.tm_sec);
```

## For Windows

This is a small example targeting the Win32 API, using `MessageBox()` to show a *Hello World!* message to the user.

It illustrates the use of the x86 stdcall calling convention, and the use of UTF-8 and UTF-16 string arguments.

```js
import koffi from 'koffi';
// CJS: const koffi = require('koffi');

// Load the shared library
const lib = koffi.load('user32.dll');

// Declare constants
const MB_OK = 0x0;
const MB_YESNO = 0x4;
const MB_ICONQUESTION = 0x20;
const MB_ICONINFORMATION = 0x40;
const IDOK = 1;
const IDYES = 6;
const IDNO = 7;

// Find functions
const MessageBoxA = lib.func('__stdcall', 'MessageBoxA', 'int', ['void *', 'str', 'str', 'uint']);
const MessageBoxW = lib.func('__stdcall', 'MessageBoxW', 'int', ['void *', 'str16', 'str16', 'uint']);

let ret = MessageBoxA(null, 'Do you want another message box?', 'Koffi', MB_YESNO | MB_ICONQUESTION);

if (ret == IDYES)
    MessageBoxW(null, 'Hello World!', 'Koffi', MB_ICONINFORMATION);
```
