# tiny-typed-emitter

Have your events and their listeners type-checked with [no overhead](#no-overhead).

[![npm version](https://badge.fury.io/js/tiny-typed-emitter.svg)](https://badge.fury.io/js/tiny-typed-emitter)

## Install
  Simply add the dependency using **npm**:
```console
$ npm i tiny-typed-emitter
```
  or using **yarn**:
```console
$ yarn add tiny-typed-emitter
```

## Usage

1. import **tiny-typed-emitter** library:

  ```ts
  import { TypedEmitter } from 'tiny-typed-emitter';
  ```

2. define events and their listener signatures (**note:** quotes around event names are not mandatory):
  ```ts
  interface MyClassEvents {
    'added': (el: string, wasNew: boolean) => void;
    'deleted': (deletedCount: number) => void;
  }
  ```

3. on this step depending on your use case, you can:
  - define your custom class extending `EventEmitter`:
    ```ts
    class MyClass extends TypedEmitter<MyClassEvents> {
      constructor() {
        super();
      }
    }
    ```
  - create new event emitter instance:
    ```ts
    const emitter = new TypedEmitter<MyClassEvent>();
    ```

## Generic events interface
To use with generic events interface:

```ts
interface MyClassEvents<T> {
  'added': (el: T, wasNew: boolean) => void;
}

class MyClass<T> extends TypedEmitter<MyClassEvents<T>> {

}
```

## Compatible subclasses with different events

The type of `eventNames()` is a superset of the actual event names to make
subclasses of a `TypedEmitter` that introduce different events type
compatible. For example the following is possible:

```ts
class Animal<E extends ListenerSignature<E>=ListenerSignature<unknown>> extends TypedEmitter<{spawn: () => void} & E> {
  constructor() {
    super();
  }
}

class Frog<E extends ListenerSignature<E>> extends Animal<{jump: () => void} & E> {
}

class Bird<E extends ListenerSignature<E>> extends Animal<{fly: () => void} & E> {
}

const animals: Animal[] = [new Frog(), new Bird()];
```

## No Overhead
Library adds no overhead. All it does is it simply reexports renamed `EventEmitter`
with customized typings.
You can check **lib/index.js** to see the exported code.
