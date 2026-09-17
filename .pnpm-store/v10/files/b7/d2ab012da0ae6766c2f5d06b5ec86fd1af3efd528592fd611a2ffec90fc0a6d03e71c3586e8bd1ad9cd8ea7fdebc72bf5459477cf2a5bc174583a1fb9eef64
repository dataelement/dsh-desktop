# Type specifiers

*Changed in Koffi 3.0*

> [!NOTE]
> In Koffi 2.0, types were External values, you had to use `koffi.introspect()` to get type information. In Koffi 3.0, this information is directly available in type objects, and this function is deprecated.
>
> Consult the [migration guide](migration) for more information.

You can use strings or type objects to give type information to Koffi (when declaring functions, structs, and so on). Use `koffi.type(spec)` to resolve all accepted type values (strings and type objects) to type objects.

You can inspect the type object for information: name, primitive, size, alignment, members (record types), reference type (array, pointer), length (array), arguments and return type (prototypes).

```js
const FoobarType = koffi.struct('FoobarType', {
    a: 'int',
    b: 'char *',
    c: 'double'
});

console.log(FoobarType);

// Expected result on 64-bit machines:
// {
//     name: 'FoobarType',
//     primitive: 'Record',
//     size: 24,
//     alignment: 8,
//     disposable: false,
//     members: {
//         a: { name: 'a', type: [Type], offset: 0 },
//         b: { name: 'b', type: [Type], offset: 8 },
//         c: { name: 'c', type: [Type], offset: 16 }
//     }
// }
```

Koffi also exposes a few more utility functions to get a subset of this information:

- `koffi.sizeof(type)` to get the size of a type
- `koffi.alignof(type)` to get the alignment of a type
- `koffi.offsetof(type, member_name)` to get the offset of a record member
- `koffi.type(type)` to get the resolved type object from a type string

Just like before, you can refer to primitive types by their name or through `koffi.types`:

```js
// These two lines do the same:
console.log(koffi.sizeof('long'));
console.log(koffi.sizeof(koffi.types.long));
```

# Aliases

You can alias a type with `koffi.alias(name, type)`. Aliased types are completely equivalent.

# Circular references

In some cases, composite types can point to each other and thus depend on each other. This can also happen when a function takes a pointer to a struct that also contains a function pointer.

To deal with this, you can create an opaque type and redefine it later to a concrete struct or union type, as shown below.

```js
const Type1 = koffi.opaque('Type1');

const Type2 = koffi.struct('Type2', {
    ptr: 'Type1 *',
    i: 'int'
});

// Redefine Type1 to a concrete type
koffi.struct(Type1, {
    ptr: 'Type2 *',
    f: 'float'
});
```

> [!NOTE]
> You must use a proper type object when you redefine the type. If you only have the name, use `koffi.type()` to get a type object from a type string.
>
> ```js
> const MyType = koffi.opaque('MyType');
>
> // This does not work, you must use the MyType object and not a type string
> koffi.struct('MyType', {
>      ptr: 'Type2 *',
>      f: 'float'
> });
