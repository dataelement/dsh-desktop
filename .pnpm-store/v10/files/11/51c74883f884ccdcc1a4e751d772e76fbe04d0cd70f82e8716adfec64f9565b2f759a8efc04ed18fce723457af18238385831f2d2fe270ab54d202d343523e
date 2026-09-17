# Number types

While the C standard allows for variation in the size of most integer types, Koffi enforces the same definition for most primitive types, listed below:

C type                        | JS type          | Bytes | Signedness | Note
----------------------------- | ---------------- | ----- | ---------- | ---------------------------
void                          | Undefined        | 0     |            | Only valid as a return type
int8, int8_t                  | Number (integer) | 1     | Signed     |
uint8, uint8_t                | Number (integer) | 1     | Unsigned   |
char                          | Number (integer) | 1     | Signed     |
uchar, unsigned char          | Number (integer) | 1     | Unsigned   |
char16, char16_t              | Number (integer) | 2     | Signed     |
int16, int16_t                | Number (integer) | 2     | Signed     |
uint16, uint16_t              | Number (integer) | 2     | Unsigned   |
short                         | Number (integer) | 2     | Signed     |
ushort, unsigned short        | Number (integer) | 2     | Unsigned   |
char32, char32_t              | Number (integer) | 4     | Signed     |
int32, int32_t                | Number (integer) | 4     | Signed     |
uint32, uint32_t              | Number (integer) | 4     | Unsigned   |
int                           | Number (integer) | 4     | Signed     |
uint, unsigned int            | Number (integer) | 4     | Unsigned   |
int64, int64_t                | Number (integer) | 8     | Signed     |
uint64, uint64_t              | Number (integer) | 8     | Unsigned   |
longlong, long long           | Number (integer) | 8     | Signed     |
ulonglong, unsigned long long | Number (integer) | 8     | Unsigned   |
float32                       | Number (float)   | 4     |            |
float64                       | Number (float)   | 8     |            |
float                         | Number (float)   | 4     |            |
double                        | Number (float)   | 8     |            |

Koffi also accepts BigInt values when converting from JS to C integers. If the value exceeds the range of the C type, Koffi will convert the number to an undefined value. In the reverse direction, BigInt values are automatically used when needed for big 64-bit integers.

Koffi defines a few more types that can change size depending on the OS and the architecture:

C type           | JS type          | Signedness  | Note
---------------- | ---------------- | ----------- | ------------------------------------------------
bool             | Boolean          |             | Usually one byte
long             | Number (integer) | Signed      | 4 or 8 bytes depending on platform (LP64, LLP64)
ulong            | Number (integer) | Unsigned    | 4 or 8 bytes depending on platform (LP64, LLP64)
unsigned long    | Number (integer) | Unsigned    | 4 or 8 bytes depending on platform (LP64, LLP64)
intptr           | Number (integer) | Signed      | 4 or 8 bytes depending on register width
intptr_t         | Number (integer) | Signed      | 4 or 8 bytes depending on register width
uintptr          | Number (integer) | Unsigned    | 4 or 8 bytes depending on register width
uintptr_t        | Number (integer) | Unsigned    | 4 or 8 bytes depending on register width
wchar_t          | Number (integer) | | 2 bytes on Windows, 4 bytes Linux, macOS and BSD

Primitive types can be specified by name (in a string) or through `koffi.types`:

```js
// These two lines do the same:
let struct1 = koffi.struct({ dummy: 'long' });
let struct2 = koffi.struct({ dummy: koffi.types.long });
```

# String types

Koffi can convert JS strings to and from UTF-8, UTF-16 or UTF-32.

Type name                      | Aliases         | JS type | Conversion / encoding
------------------------------ | --------------- | ------- | ---------------------
const char \*, char \*         | str, string     | String  | UTF-8
const char16_t \*, char16_t \* | str16, string16 | String  | UTF-16
const char32_t \*, char32_t \* | str32, string32 | String  | UTF-32

Koffi also supports wide strings (`wchar_t *` or `wstring`), which use:

- UTF-16 on Windows (where wchar_t is 2 bytes)
- UTF-32 on other platforms (where wchar_t is 4 bytes)

# Enum types

*New in Koffi 3.0*

C enumeration values are stored as integers. The underlying integer type is implementation-defined but Koffi tries to match usual platform behavior.

On POSIX platforms, Koffi follows the following rules:

- If no negative value exists: `unsigned int` by default, `uint64_t` if needed
- If any negative value exists: `int` by default, `int64_t` if needed

On Windows, things are simpler, and `int` is used all the time. Koffi will throw an error if any enumeration value does not fit in a 32-bit integer.

```js
// For OpenResult, the underlying type will be unsigned int on POSIX, int on Windows
const OpenResult = koffi.enumeration('OpenResult', {
    Success: 0,
    MissingFile: 1,
    AccessDenied: 2,
    OtherError: 3
});

// For RelativePosition, the underlying type will be int everywhere
const RelativePosition = koffi.enumeration('RelativePosition', {
    Left: -1,
    Center: 0,
    Right: 1
});

// For IntLimits, the underlying type will be int64_t on POSIX, and fail on Windows
const Int64Limits = koffi.enumeration('Int64Limits', {
    Min: -9223372036854775808n,
    Max: 9223372036854775807n
});
```

> [!WARNING]
> This behavior may not match your compiler:
>
> - On POSIX platforms, GCC and Clang will use a short integer type if `-fshort-enums` is specified and the enumeration values fit in `short` or `unsigned short`.
> - On Windows, MSVC (and Clang) always use `int` even if some values do not fit, which matches what Koffi does... unless the compiler flag `/Zc:enumTypes` is set, maybe.
>
> Use an explicit type specifier to work around these problems, as shown below.

You can access the constants in `values` member of the type object.

```js
console.log(OpenResult.values.MissingFile); // Prints 1
console.log(RelativePosition.values.Left); // Prints -1
```

You can specify the storage type explicitly as the last argument: `koffi.enumeration(name, values, type)`.

```js
// This one explictly uses int64_t as the underlying type, despite the fact that the values fit inside an int.
const ExplicitEnum = koffi.enumeration('ExplicitEnum', {
    Zero: 0,
    One: 1,
    Two: 2
}, 'int64_t');
```

# Endian-sensitive integers

Koffi defines a bunch of endian-sensitive types, which can be used when dealing with binary data (network payloads, binary file formats, etc.).

C type                 | Bytes | Signedness | Endianness
---------------------- | ----- | ---------- | -------------
int16_le, int16_le_t   | 2     | Signed     | Little Endian
int16_be, int16_be_t   | 2     | Signed     | Big Endian
uint16_le, uint16_le_t | 2     | Unsigned   | Little Endian
uint16_be, uint16_be_t | 2     | Unsigned   | Big Endian
int32_le, int32_le_t   | 4     | Signed     | Little Endian
int32_be, int32_be_t   | 4     | Signed     | Big Endian
uint32_le, uint32_le_t | 4     | Unsigned   | Little Endian
uint32_be, uint32_be_t | 4     | Unsigned   | Big Endian
int64_le, int64_le_t   | 8     | Signed     | Little Endian
int64_be, int64_be_t   | 8     | Signed     | Big Endian
uint64_le, uint64_le_t | 8     | Unsigned   | Little Endian
uint64_be, uint64_be_t | 8     | Unsigned   | Big Endian

You can find an example that uses these types to [extract information from a PNG header](pointers#handling-void-pointers) with transparent endian conversion.
