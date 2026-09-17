# Decode to JS values

## Decode numbers

*New in Koffi 3.1.0*

Use these functions to decode numeric values from a pointer. These functions match the [number types](primitives#number-types) of Koffi:

Type      | Function                     | Result
--------- | ---------------------------- | ------------------------------------
char      | `koffi.decode.char(ptr)`     | Number
uchar     | `koffi.decode.uchar(ptr)`    | Number
short     | `koffi.decode.short(ptr)`    | Number
ushort    | `koffi.decode.ushort(ptr)`   | Number
int       | `koffi.decode.int(ptr)`      | Number
uint      | `koffi.decode.uint(ptr)`     | Number
long      | `koffi.decode.long(ptr)`     | Number or BigInt (on LP64 platforms)
ulong     | `koffi.decode.ulong(ptr)`    | Number or BigInt (on LP64 platforms)
longlong  | `koffi.decode.longlong(ptr)` | Number or BigInt
ulonglong | `koffi.decode.ulonglong(ptr)`| Number or BigInt
int8      | `koffi.decode.int8(ptr)`     | Number
uint8     | `koffi.decode.uint8(ptr)`    | Number
int16     | `koffi.decode.int16(ptr)`    | Number
uint16    | `koffi.decode.uint16(ptr)`   | Number
int32     | `koffi.decode.int32(ptr)`    | Number
uint32    | `koffi.decode.uint32(ptr)`   | Number
int64     | `koffi.decode.int64(ptr)`    | Number or BigInt
uint64    | `koffi.decode.uint64(ptr)`   | Number or BigInt
float     | `koffi.decode.float(ptr)`    | Number
double    | `koffi.decode.double(ptr)`   | Number

You can also decode [endian-sensitive integers](primitives#endian-sensitive-integers) with these functions:

Type      | Function                     | Endianness    | Result
--------- | ---------------------------- | ------------- | ----------------
int16_le  | `koffi.decode.int16le(ptr)`  | Little Endian | Number
uint16_le | `koffi.decode.uint16le(ptr)` | Little Endian | Number
int32_le  | `koffi.decode.int32le(ptr)`  | Little Endian | Number
uint32_le | `koffi.decode.uint32le(ptr)` | Little Endian | Number
int64_le  | `koffi.decode.int64le(ptr)`  | Little Endian | Number or BigInt
uint64_le | `koffi.decode.uint64le(ptr)` | Little Endian | Number or BigInt
int16_be  | `koffi.decode.int16be(ptr)`  | Big Endian    | Number
uint16_be | `koffi.decode.uint16be(ptr)` | Big Endian    | Number
int32_be  | `koffi.decode.int32be(ptr)`  | Big Endian    | Number
uint32_be | `koffi.decode.uint32be(ptr)` | Big Endian    | Number
int64_be  | `koffi.decode.int64be(ptr)`  | Big Endian    | Number or BigInt
uint64_be | `koffi.decode.uint64be(ptr)` | Big Endian    | Number or BigInt

## Decode strings

You can also decode strings, NUL-terminated or with an explicit length:

Type     | Function                             | Conversion/encoding
-------- | ------------------------------------ | -------------------------------------
string   | `koffi.decode.string(ptr)`           | UTF-8 (NUL-terminated)
string   | `koffi.decode.string(ptr, length)`   | UTF-8 (explicit length)
string16 | `koffi.decode.string16(ptr)`         | UTF-16 (NUL-terminated)
string16 | `koffi.decode.string16(ptr, length)` | UTF-16 (explicit length)
string32 | `koffi.decode.string32(ptr)`         | UTF-32 (NUL-terminated)
string32 | `koffi.decode.string32(ptr, length)` | UTF-32 (explicit length)
wstring  | `koffi.decode.wstring(ptr)`          | UTF-16 or UTF-32 (platform-dependent)
wstring  | `koffi.decode.wstring(ptr, length)`  | UTF-16 or UTF-32 (platform-dependent)

## Generic decode function

Use `koffi.decode()` to decode the data pointed to by a pointer (represented by a BigInt value).

Some arguments are optional and this function can be called in several ways:

- `koffi.decode(ptr, type)`: no offset
- `koffi.decode(ptr, offset, type)`: explicit offset to add to the pointer before decoding

By default, Koffi expects NUL terminated strings when decoding them. See below if you need to specify the string length.

The following example illustrates how to decode an integer and a C string variable.

```c
int my_int = 42;
const char *my_string = "foobar";
```

```js
const my_int = lib.symbol('my_int');
const my_string = lib.symbol('my_string');

console.log(koffi.decode(my_int, 'int')) // Prints 42
console.log(koffi.decode(my_string, 'const char *')) // Prints "foobar"
```

There is also an optional ending `length` argument that you can use in two cases:

- Use it to give the number of bytes to decode in non-NUL terminated strings: `koffi.decode(ptr, 'char *', 5)`
- Decode consecutive values into an array. For example, here is how you can decode an array with 3 float values: `koffi.decode(ptr, 'float', 3)`. This is equivalent to `koffi.decode(ptr, koffi.array('float', 3))`.

The example below will decode the symbol `my_string` defined above but only the first three bytes.

```js
// Only decode 3 bytes from the C string my_string
console.log(koffi.decode(my_string, 'const char *', 3)) // Prints "foo"
```

# Encode to C memory

Use `koffi.encode()` to encode JS values into C symbols or pointers, which are represented by BigInt numbers.

Some arguments are optional and this function can be called in several ways:

- `koffi.encode(ptr, type, value)`: no offset
- `koffi.encode(ptr, offset, type, value)`: explicit offset to add to the pointer before encoding

We'll reuse the examples shown above and change the variable values with `koffi.encode()`.

```c
int my_int = 42;
const char *my_string = NULL;
```

```js
const my_int = lib.symbol('my_int');
const my_string = lib.symbol('my_string');

console.log(koffi.decode(my_int, 'int')) // Prints 42
console.log(koffi.decode(my_string, 'const char *')) // Prints null

koffi.encode(my_int, 'int', -1);
koffi.encode(my_string, 'const char *', 'Hello World!');

console.log(koffi.decode(my_int, 'int')) // Prints -1
console.log(koffi.decode(my_string, 'const char *')) // Prints "Hello World!"
```

When encoding strings (either directly or embedded in arrays or structs), the memory will be bound to the raw pointer value and managed by Koffi. You can assign to the same string again and again without any leak or risk of use-after-free.

There is also an optional ending `length` argument that you can use to encode an array. For example, here is how you can encode an array with 3 float values: `koffi.encode(symbol, 'float', [1, 2, 3], 3)`. This is equivalent to `koffi.encode(symbol, koffi.array('float', 3), [1, 2, 3])`.
