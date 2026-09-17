# ipaddr.js — an IPv4 and IPv6 address manipulation library

[![CI Tests][ci-img]][ci-url]

ipaddr.js is a library for manipulating IPv4 and IPv6 addresses in JavaScript. It runs in Node.js and in browsers.

It lets you parse and validate addresses, match them against CIDR ranges, classify them into named ranges (loopback, private, reserved, etc.), convert between IPv4 and IPv6 representations, and work with raw byte arrays.

## Installation

```
npm install ipaddr.js
```

## Node.js version support

- ipaddr.js 2.x — Node.js 10+
- ipaddr.js 1.x — Node.js < 10

## Quick start

```js
const ipaddr = require('ipaddr.js');

ipaddr.isValid('192.168.1.1');     // => true
ipaddr.isValid('2001:db8::1');    // => true
ipaddr.isValid('not an address'); // => false

const addr = ipaddr.parse('2001:db8::1');
addr.kind();     // => 'ipv6'
addr.toString(); // => '2001:db8::1'

const [network, prefix] = ipaddr.parseCIDR('10.0.0.0/8');
network.toString(); // => '10.0.0.0'
prefix;             // => 8
```

## Table of contents

- [Global API](#global-api)
  - [isValid](#ipaddrIsValid)
  - [isValidCIDR](#ipaddrIsValidCIDR)
  - [parse](#ipaddrParse)
  - [parseCIDR](#ipaddrParseCIDR)
  - [process](#ipaddrProcess)
  - [subnetMatch](#ipaddrSubnetMatch)
  - [fromByteArray](#ipaddrFromByteArray)
- [IPv4 API](#ipv4-api)
  - Static: [isValid](#ipv4-isvalid), [isValidCIDR](#ipv4-isvalidcidr), [isValidFourPartDecimal](#ipv4-isvalidfourpartdecimal), [isValidCIDRFourPartDecimal](#ipv4-isvalidcidrfourpartdecimal), [isIPv4](#ipv4-isipv4), [parse](#ipv4-parse), [parseCIDR](#ipv4-parsecidr), [broadcastAddressFromCIDR](#ipv4-broadcastaddressfromcidr), [networkAddressFromCIDR](#ipv4-networkaddressfromcidr), [subnetMaskFromPrefixLength](#ipv4-subnetmaskfromprefixlength)
  - Instance: [octets](#ipv4-octets), [kind()](#ipv4-kind), [match()](#ipv4-match), [range()](#ipv4-range), [prefixLengthFromSubnetMask()](#ipv4-prefixlengthfromsubnetmask), [subnetMatch()](#ipv4-subnetmatch-instance), [toByteArray()](#ipv4-tobytearray), [toIPv4MappedAddress()](#ipv4-toipv4mappedaddress), [toNormalizedString()](#ipv4-tonormalizedstring), [toString()](#ipv4-tostring)
- [IPv6 API](#ipv6-api)
  - Static: [isValid](#ipv6-isvalid), [isValidCIDR](#ipv6-isvalidcidr), [isIPv6](#ipv6-isipv6), [parse](#ipv6-parse), [parseCIDR](#ipv6-parsecidr), [broadcastAddressFromCIDR](#ipv6-broadcastaddressfromcidr), [networkAddressFromCIDR](#ipv6-networkaddressfromcidr), [subnetMaskFromPrefixLength](#ipv6-subnetmaskfromprefixlength)
  - Instance: [parts](#ipv6-parts), [zoneId](#ipv6-zoneid), [kind()](#ipv6-kind), [isIPv4MappedAddress()](#ipv6-isipv4mappedaddress), [match()](#ipv6-match), [range()](#ipv6-range), [prefixLengthFromSubnetMask()](#ipv6-prefixlengthfromsubnetmask), [subnetMatch()](#ipv6-subnetmatch-instance), [toByteArray()](#ipv6-tobytearray), [toFixedLengthString()](#ipv6-tofixedlengthstring), [toIPv4Address()](#ipv6-toipv4address), [toNormalizedString()](#ipv6-tonormalizedstring), [toRFC5952String()](#ipv6-torfc5952string), [toString()](#ipv6-tostring)

---

## Global API

```js
const ipaddr = require('ipaddr.js');
```

<a name="ipaddrIsValid"></a>
### `ipaddr.isValid(string)`

Returns `true` if the string is a valid IPv4 or IPv6 address; `false` otherwise. Never throws.

```js
ipaddr.isValid('192.168.1.1');   // => true
ipaddr.isValid('2001:db8::1');  // => true
ipaddr.isValid('999.0.0.1');    // => false
ipaddr.isValid('hello');        // => false
```

<a name="ipaddrIsValidCIDR"></a>
### `ipaddr.isValidCIDR(string)`

Returns `true` if the string is a valid IPv4 or IPv6 address in CIDR notation; `false` otherwise. Never throws.

```js
ipaddr.isValidCIDR('192.168.0.0/24');  // => true
ipaddr.isValidCIDR('2001:db8::/32');   // => true
ipaddr.isValidCIDR('192.168.0.1/33'); // => false
```

<a name="ipaddrParse"></a>
### `ipaddr.parse(string)`

Parses the string and returns an `IPv4` or `IPv6` object. Throws if the string is not a valid address.

```js
const v4 = ipaddr.parse('192.168.1.1');
v4.kind();     // => 'ipv4'
v4.toString(); // => '192.168.1.1'

const v6 = ipaddr.parse('2001:db8::1');
v6.kind();     // => 'ipv6'
v6.toString(); // => '2001:db8::1'
```

<a name="ipaddrParseCIDR"></a>
### `ipaddr.parseCIDR(string)`

Parses an IP address with a CIDR prefix length and returns a two-element array `[address, prefixLength]`. Throws if the input is not valid CIDR notation.

```js
const [addr, prefix] = ipaddr.parseCIDR('192.168.1.0/24');
addr.toString(); // => '192.168.1.0'
prefix;          // => 24
```

The returned array can be passed directly to `addr.match()`:

```js
const addr = ipaddr.parse('192.168.1.42');
addr.match(ipaddr.parseCIDR('192.168.1.0/24')); // => true
```

<a name="ipaddrProcess"></a>
### `ipaddr.process(string)`

Like `ipaddr.parse()`, but automatically converts IPv4-mapped IPv6 addresses (e.g. `::ffff:192.168.1.1`) to their IPv4 equivalents. All other addresses are returned as-is.

This is useful when accepting connections on a dual-stack IPv6 socket, where IPv4 client addresses appear as IPv4-mapped IPv6 addresses.

```js
ipaddr.process('::ffff:192.168.1.1').toString(); // => '192.168.1.1'
ipaddr.process('::ffff:192.168.1.1').kind();     // => 'ipv4'
ipaddr.process('2001:db8::1').kind();            // => 'ipv6'
ipaddr.process('192.168.1.1').kind();            // => 'ipv4'
```

<a name="ipaddrSubnetMatch"></a>
### `ipaddr.subnetMatch(address, rangeList[, defaultName])`

Matches `address` against a map of named CIDR ranges and returns the name of the first matching range. Returns `defaultName` (default: `'unicast'`) if no range matches.

Each `rangeList` value is either a single `[address, prefixLength]` pair or an array of such pairs. The list may mix IPv4 and IPv6 entries; entries of the wrong address family are safely skipped.

```js
const rangeList = {
  private: [
    [ipaddr.parse('10.0.0.0'), 8],
    [ipaddr.parse('172.16.0.0'), 12],
    [ipaddr.parse('192.168.0.0'), 16],
  ],
  loopback: [ ipaddr.parse('127.0.0.0'), 8 ],
};

ipaddr.subnetMatch(ipaddr.parse('192.168.1.1'), rangeList);          // => 'private'
ipaddr.subnetMatch(ipaddr.parse('127.0.0.1'), rangeList);            // => 'loopback'
ipaddr.subnetMatch(ipaddr.parse('8.8.8.8'), rangeList, 'public');    // => 'public'
ipaddr.subnetMatch(ipaddr.parse('8.8.8.8'), rangeList);              // => 'unicast'
```

<a name="ipaddrFromByteArray"></a>
### `ipaddr.fromByteArray(bytes)`

Constructs an IPv4 or IPv6 address from a byte array in network byte order (MSB first). Accepts 4 bytes for IPv4, or 16 bytes for IPv6. Throws if the array length is not 4 or 16.

```js
ipaddr.fromByteArray([127, 0, 0, 1]).toString(); // => '127.0.0.1'

ipaddr.fromByteArray([
  0x20, 0x01, 0x0d, 0xb8,
  0x00, 0x00, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x01,
]).toString(); // => '2001:db8::1'
```

---

## IPv4 API

### Static methods

<a name="ipv4-isvalid"></a>
#### `ipaddr.IPv4.isValid(string)`

Returns `true` if the string is a valid IPv4 address; `false` otherwise. Never throws.

Accepts the same extended formats as `ipaddr.IPv4.parse()` (hex, octal, fewer-than-four parts). For strict four-part decimal validation, use `isValidFourPartDecimal()`.

```js
ipaddr.IPv4.isValid('192.168.1.1');   // => true
ipaddr.IPv4.isValid('0xc0.168.1.1'); // => true  (hex octet)
ipaddr.IPv4.isValid('999.0.0.1');    // => false
```

<a name="ipv4-isvalidcidr"></a>
#### `ipaddr.IPv4.isValidCIDR(string)`

Returns `true` if the string is a valid IPv4 CIDR address; `false` otherwise. Never throws.

```js
ipaddr.IPv4.isValidCIDR('192.168.0.0/24'); // => true
ipaddr.IPv4.isValidCIDR('192.168.0.0/33'); // => false
```

<a name="ipv4-isvalidfourpartdecimal"></a>
#### `ipaddr.IPv4.isValidFourPartDecimal(string)`

Like `isValid()`, but only accepts the standard four-part dotted-decimal format. Rejects hex, octal, and other non-standard notations accepted by `inet_aton`.

```js
ipaddr.IPv4.isValidFourPartDecimal('192.168.1.1');  // => true
ipaddr.IPv4.isValidFourPartDecimal('0xc0.168.1.1'); // => false
```

<a name="ipv4-isvalidcidrfourpartdecimal"></a>
#### `ipaddr.IPv4.isValidCIDRFourPartDecimal(string)`

Like `isValidCIDR()`, but only accepts the standard four-part dotted-decimal format for the address portion.

```js
ipaddr.IPv4.isValidCIDRFourPartDecimal('192.168.0.0/24');  // => true
ipaddr.IPv4.isValidCIDRFourPartDecimal('0xc0.168.0.0/24'); // => false
```

<a name="ipv4-isipv4"></a>
#### `ipaddr.IPv4.isIPv4(string)`

Returns `true` if the string matches the IPv4 address pattern. This is a lightweight regex check — it does not validate that all octets are in range (0–255). Prefer `isValid()` for authoritative validation.

```js
ipaddr.IPv4.isIPv4('192.168.1.1'); // => true
ipaddr.IPv4.isIPv4('2001:db8::1'); // => false
```

<a name="ipv4-parse"></a>
#### `ipaddr.IPv4.parse(string)`

Parses the string and returns an `IPv4` object. Throws if the string is not a valid IPv4 address.

In addition to standard dotted-decimal, the parser accepts formats recognised by the POSIX `inet_aton` function: hex octets (`0xc0.0xa8.0x01.0x01`), octal octets (`0300.0250.01.01`), three-part (`192.168.257`), two-part (`192.11010049`), and single-value (`3232235777`) notation.

```js
ipaddr.IPv4.parse('192.168.1.1').toString();   // => '192.168.1.1'
ipaddr.IPv4.parse('0xc0.168.1.1').toString();  // => '192.168.1.1'
```

<a name="ipv4-parsecidr"></a>
#### `ipaddr.IPv4.parseCIDR(string)`

Parses an IPv4 CIDR address and returns `[IPv4, prefixLength]`. Throws if the input is invalid.

```js
const [addr, prefix] = ipaddr.IPv4.parseCIDR('192.168.1.0/24');
addr.toString(); // => '192.168.1.0'
prefix;          // => 24
```

<a name="ipv4-broadcastaddressfromcidr"></a>
#### `ipaddr.IPv4.broadcastAddressFromCIDR(string)`

Returns the broadcast address for the given IPv4 CIDR block.

```js
ipaddr.IPv4.broadcastAddressFromCIDR('192.168.1.0/24').toString(); // => '192.168.1.255'
ipaddr.IPv4.broadcastAddressFromCIDR('10.0.0.1/8').toString();     // => '10.255.255.255'
```

<a name="ipv4-networkaddressfromcidr"></a>
#### `ipaddr.IPv4.networkAddressFromCIDR(string)`

Returns the network address for the given IPv4 CIDR block.

```js
ipaddr.IPv4.networkAddressFromCIDR('192.168.1.42/24').toString(); // => '192.168.1.0'
ipaddr.IPv4.networkAddressFromCIDR('10.1.2.3/8').toString();      // => '10.0.0.0'
```

<a name="ipv4-subnetmaskfromprefixlength"></a>
#### `ipaddr.IPv4.subnetMaskFromPrefixLength(prefix)`

Returns the IPv4 subnet mask corresponding to the given CIDR prefix length.

```js
ipaddr.IPv4.subnetMaskFromPrefixLength(24).toString(); // => '255.255.255.0'
ipaddr.IPv4.subnetMaskFromPrefixLength(16).toString(); // => '255.255.0.0'
```

### Instance properties and methods

<a name="ipv4-octets"></a>
#### `addr.octets`

The four octets of the address as an array of numbers.

```js
ipaddr.parse('192.168.1.1').octets; // => [192, 168, 1, 1]
```

<a name="ipv4-kind"></a>
#### `addr.kind()`

Always returns `'ipv4'`.

```js
ipaddr.parse('192.168.1.1').kind(); // => 'ipv4'
```

<a name="ipv4-match"></a>
#### `addr.match(other, cidrBits)` / `addr.match([address, cidrBits])`

Returns `true` if the address falls within the given CIDR range.

```js
const addr = ipaddr.parse('192.168.1.42');

addr.match(ipaddr.parse('192.168.1.0'), 24); // => true
addr.match(ipaddr.parse('10.0.0.0'), 8);     // => false

// Accepts the tuple returned by parseCIDR:
addr.match(ipaddr.parseCIDR('192.168.1.0/24')); // => true
```

<a name="ipv4-range"></a>
#### `addr.range()`

Returns the name of the built-in range the address belongs to, or `'unicast'` if it does not match any special range. Recognised names: `'unspecified'`, `'broadcast'`, `'multicast'`, `'linkLocal'`, `'loopback'`, `'carrierGradeNat'`, `'private'`, `'reserved'`, `'as112'`, `'amt'`.

See the [source][IPv4 ranges] for the full CIDR list associated with each name.

```js
ipaddr.parse('127.0.0.1').range();   // => 'loopback'
ipaddr.parse('192.168.1.1').range(); // => 'private'
ipaddr.parse('169.254.1.1').range(); // => 'linkLocal'
ipaddr.parse('8.8.8.8').range();     // => 'unicast'
```

<a name="ipv4-prefixlengthfromsubnetmask"></a>
#### `addr.prefixLengthFromSubnetMask()`

Returns the CIDR prefix length if this address is a valid contiguous subnet mask, or `null` otherwise.

```js
ipaddr.parse('255.255.255.0').prefixLengthFromSubnetMask();   // => 24
ipaddr.parse('255.255.255.240').prefixLengthFromSubnetMask(); // => 28
ipaddr.parse('255.192.168.0').prefixLengthFromSubnetMask();   // => null
```

<a name="ipv4-subnetmatch-instance"></a>
#### `addr.subnetMatch(rangeList[, defaultName])`

Instance-method shorthand for `ipaddr.subnetMatch(addr, rangeList, defaultName)`.

```js
const addr = ipaddr.parse('192.168.1.1');
addr.subnetMatch({ private: [ipaddr.parse('192.168.0.0'), 16] }); // => 'private'
```

<a name="ipv4-tobytearray"></a>
#### `addr.toByteArray()`

Returns the address as an array of four bytes in network byte order.

```js
ipaddr.parse('192.168.1.1').toByteArray(); // => [192, 168, 1, 1]
ipaddr.parse('127.0.0.1').toByteArray();   // => [127, 0, 0, 1]
```

<a name="ipv4-toipv4mappedaddress"></a>
#### `addr.toIPv4MappedAddress()`

Returns the IPv4-mapped IPv6 representation of this address (`::ffff:x.x.x.x`).

```js
ipaddr.parse('192.168.1.1').toIPv4MappedAddress().toString(); // => '::ffff:c0a8:101'
```

<a name="ipv4-tonormalizedstring"></a>
#### `addr.toNormalizedString()`

Returns the address in standard four-part dotted-decimal notation. For IPv4, this is the same as `toString()`.

```js
ipaddr.parse('192.168.1.1').toNormalizedString(); // => '192.168.1.1'
```

<a name="ipv4-tostring"></a>
#### `addr.toString()`

Returns the address as a dotted-decimal string.

```js
ipaddr.parse('192.168.001.001').toString(); // => '192.168.1.1'
```

---

## IPv6 API

### Static methods

<a name="ipv6-isvalid"></a>
#### `ipaddr.IPv6.isValid(string)`

Returns `true` if the string is a valid IPv6 address; `false` otherwise. Never throws. Accepts addresses with a zone ID (e.g. `fe80::1%eth0`).

```js
ipaddr.IPv6.isValid('2001:db8::1');    // => true
ipaddr.IPv6.isValid('::1');           // => true
ipaddr.IPv6.isValid('fe80::1%eth0'); // => true
ipaddr.IPv6.isValid('192.168.1.1');  // => false
```

<a name="ipv6-isvalidcidr"></a>
#### `ipaddr.IPv6.isValidCIDR(string)`

Returns `true` if the string is a valid IPv6 CIDR address; `false` otherwise. Never throws.

```js
ipaddr.IPv6.isValidCIDR('2001:db8::/32');  // => true
ipaddr.IPv6.isValidCIDR('2001:db8::/129'); // => false
```

<a name="ipv6-isipv6"></a>
#### `ipaddr.IPv6.isIPv6(string)`

Returns `true` if the string matches the IPv6 address pattern. This is a lightweight regex check and does not fully validate all groups. Prefer `isValid()` for authoritative validation.

```js
ipaddr.IPv6.isIPv6('2001:db8::1'); // => true
ipaddr.IPv6.isIPv6('192.168.1.1'); // => false
```

<a name="ipv6-parse"></a>
#### `ipaddr.IPv6.parse(string)`

Parses the string and returns an `IPv6` object. Throws if the string is not a valid IPv6 address.

```js
ipaddr.IPv6.parse('2001:db8::1').toString();        // => '2001:db8::1'
ipaddr.IPv6.parse('::ffff:192.168.1.1').toString(); // => '::ffff:c0a8:101'
```

<a name="ipv6-parsecidr"></a>
#### `ipaddr.IPv6.parseCIDR(string)`

Parses an IPv6 CIDR address and returns `[IPv6, prefixLength]`. Throws if the input is invalid.

```js
const [addr, prefix] = ipaddr.IPv6.parseCIDR('2001:db8::/32');
addr.toString(); // => '2001:db8::'
prefix;          // => 32
```

<a name="ipv6-broadcastaddressfromcidr"></a>
#### `ipaddr.IPv6.broadcastAddressFromCIDR(string)`

Returns the last address in the given IPv6 CIDR block (the IPv6 equivalent of the broadcast address).

```js
ipaddr.IPv6.broadcastAddressFromCIDR('2001:db8::/120').toString(); // => '2001:db8::ff'
```

<a name="ipv6-networkaddressfromcidr"></a>
#### `ipaddr.IPv6.networkAddressFromCIDR(string)`

Returns the network address for the given IPv6 CIDR block.

```js
ipaddr.IPv6.networkAddressFromCIDR('2001:db8::42/32').toString(); // => '2001:db8::'
```

<a name="ipv6-subnetmaskfromprefixlength"></a>
#### `ipaddr.IPv6.subnetMaskFromPrefixLength(prefix)`

Returns the IPv6 subnet mask corresponding to the given CIDR prefix length.

```js
ipaddr.IPv6.subnetMaskFromPrefixLength(64).toString(); // => 'ffff:ffff:ffff:ffff::'
ipaddr.IPv6.subnetMaskFromPrefixLength(48).toString(); // => 'ffff:ffff:ffff::'
```

### Instance properties and methods

<a name="ipv6-parts"></a>
#### `addr.parts`

The eight 16-bit groups of the address as an array of numbers.

```js
ipaddr.parse('2001:db8:10::1234:dead').parts;
// => [0x2001, 0x0db8, 0x0010, 0, 0, 0, 0x1234, 0xdead]
```

<a name="ipv6-zoneid"></a>
#### `addr.zoneId`

The zone ID string for link-local addresses, or `undefined` if absent.

```js
ipaddr.parse('fe80::1%eth0').zoneId; // => 'eth0'
ipaddr.parse('2001:db8::1').zoneId;  // => undefined
```

<a name="ipv6-kind"></a>
#### `addr.kind()`

Always returns `'ipv6'`.

```js
ipaddr.parse('2001:db8::1').kind(); // => 'ipv6'
```

<a name="ipv6-isipv4mappedaddress"></a>
#### `addr.isIPv4MappedAddress()`

Returns `true` if this is an IPv4-mapped IPv6 address (i.e. in the `::ffff:0:0/96` range).

```js
ipaddr.parse('::ffff:192.168.1.1').isIPv4MappedAddress(); // => true
ipaddr.parse('2001:db8::1').isIPv4MappedAddress();        // => false
```

<a name="ipv6-match"></a>
#### `addr.match(other, cidrBits)` / `addr.match([address, cidrBits])`

Returns `true` if the address falls within the given CIDR range.

```js
const addr = ipaddr.parse('2001:db8:1234::1');

addr.match(ipaddr.parse('2001:db8::'), 32);     // => true
addr.match(ipaddr.parseCIDR('2001:db8::/32'));   // => true
addr.match(ipaddr.parseCIDR('2001:db9::/32'));   // => false
```

<a name="ipv6-range"></a>
#### `addr.range()`

Returns the name of the built-in range the address belongs to, or `'unicast'` if it does not match any. Recognised names include: `'unspecified'`, `'linkLocal'`, `'multicast'`, `'loopback'`, `'uniqueLocal'`, `'ipv4Mapped'`, `'reserved'`, and others.

See the [source][IPv6 ranges] for the full list.

```js
ipaddr.parse('::1').range();          // => 'loopback'
ipaddr.parse('fe80::1').range();      // => 'linkLocal'
ipaddr.parse('fc00::1').range();      // => 'uniqueLocal'
ipaddr.parse('2001:db8::1').range();  // => 'reserved'
ipaddr.parse('2607:f8b0::1').range(); // => 'unicast'
```

<a name="ipv6-prefixlengthfromsubnetmask"></a>
#### `addr.prefixLengthFromSubnetMask()`

Returns the CIDR prefix length if this address is a valid contiguous subnet mask, or `null` otherwise.

```js
ipaddr.parse('ffff:ffff:ffff:ffff::').prefixLengthFromSubnetMask(); // => 64
ipaddr.parse('ffff:ffff::').prefixLengthFromSubnetMask();           // => 32
```

<a name="ipv6-subnetmatch-instance"></a>
#### `addr.subnetMatch(rangeList[, defaultName])`

Instance-method shorthand for `ipaddr.subnetMatch(addr, rangeList, defaultName)`.

```js
const addr = ipaddr.parse('2001:db8::1');
const ranges = { documentation: [ipaddr.parse('2001:db8::'), 32] };
addr.subnetMatch(ranges); // => 'documentation'
```

<a name="ipv6-tobytearray"></a>
#### `addr.toByteArray()`

Returns the address as an array of 16 bytes in network byte order.

```js
ipaddr.parse('2001:db8::1').toByteArray();
// => [0x20, 0x01, 0x0d, 0xb8, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1]
```

<a name="ipv6-tofixedlengthstring"></a>
#### `addr.toFixedLengthString()`

Returns the address with all eight groups fully expanded to four hex digits, separated by colons. No `::` abbreviation is used.

```js
ipaddr.parse('2001:db8::1').toFixedLengthString();
// => '2001:0db8:0000:0000:0000:0000:0000:0001'
```

<a name="ipv6-toipv4address"></a>
#### `addr.toIPv4Address()`

Converts an IPv4-mapped IPv6 address to its IPv4 equivalent. Throws if the address is not IPv4-mapped.

```js
ipaddr.parse('::ffff:192.168.1.1').toIPv4Address().toString(); // => '192.168.1.1'
```

<a name="ipv6-tonormalizedstring"></a>
#### `addr.toNormalizedString()`

Returns the address with all eight 16-bit groups written out in lowercase hex, separated by colons, without `::` compression.

```js
ipaddr.parse('2001:db8::1').toNormalizedString(); // => '2001:db8:0:0:0:0:0:1'
```

<a name="ipv6-torfc5952string"></a>
#### `addr.toRFC5952String()`

Returns the address in the canonical format defined by [RFC 5952]: lowercase hex, leading zeros omitted, and the longest run of consecutive all-zero groups replaced by `::`.

```js
ipaddr.parse('2001:0db8:0000:0000:0000:0000:0000:0001').toRFC5952String();
// => '2001:db8::1'
```

<a name="ipv6-tostring"></a>
#### `addr.toString()`

Returns the compact string representation of the address, identical to `toRFC5952String()`.

```js
ipaddr.parse('2001:0db8::0001').toString(); // => '2001:db8::1'
```

---

[IPv4 ranges]: https://github.com/whitequark/ipaddr.js/blob/master/lib/ipaddr.js#L184
[IPv6 ranges]: https://github.com/whitequark/ipaddr.js/blob/master/lib/ipaddr.js#L562
[RFC 5952]: https://datatracker.ietf.org/doc/html/rfc5952
[nodejs]: http://nodejs.org
[ci-url]: https://github.com/whitequark/ipaddr.js/actions?query=workflow%3A%22CI+Tests%22
[ci-img]: https://github.com/whitequark/ipaddr.js/workflows/CI%20Tests/badge.svg
