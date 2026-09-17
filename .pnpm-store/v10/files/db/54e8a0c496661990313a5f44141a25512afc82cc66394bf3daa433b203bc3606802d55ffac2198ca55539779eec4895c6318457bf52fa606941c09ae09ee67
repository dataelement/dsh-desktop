# asyncPool

## Why?

Existing solutions also re-implement Promise 😩...

The goal of this library is to use native async functions (if ES7 is available) and/or native Promise (ES6) including `Promise.race()` and `Promise.all()` to implement the concurrency behavior (look our source code).

## What?

`asyncPool` runs multiple promise-returning & async functions in a limited concurrency pool. It rejects immediately as soon as one of the promises rejects. It resolves when all the promises completes. It calls the iterator function as soon as possible (under concurrency limit). For example:

```js
const timeout = i => new Promise(resolve => setTimeout(() => resolve(i), i));
await asyncPool(2, [1000, 5000, 3000, 2000], timeout);
// Call iterator (i = 1000)
// Call iterator (i = 5000)
// Pool limit of 2 reached, wait for the quicker one to complete...
// 1000 finishes
// Call iterator (i = 3000)
// Pool limit of 2 reached, wait for the quicker one to complete...
// 3000 finishes
// Call iterator (i = 2000)
// Itaration is complete, wait until running ones complete...
// 5000 finishes
// 2000 finishes
// Resolves, results are passed in given array order `[1000, 5000, 3000, 2000]`.
```

## Usage

```
$ npm install tiny-async-pool
```

```js
import asyncPool from "tiny-async-pool";
```

### ES7 async

```js
const timeout = i => new Promise(resolve => setTimeout(() => resolve(i), i));
const results = await asyncPool(2, [1000, 5000, 3000, 2000], timeout);
```

Note: Something really nice will be possible soon https://github.com/tc39/proposal-async-iteration

### ES6 Promise

```js
const timeout = i => new Promise(resolve => setTimeout(() => resolve(i), i));
return asyncPool(2, [1000, 5000, 3000, 2000], timeout).then(results => {
  ...
});
```

## API

### `asyncPool(poolLimit, iterable, iteratorFn)`

Runs multiple promise-returning & async functions in a limited concurrency pool. It rejects immediately as soon as one of the promises rejects. It resolves when all the promises completes. It calls the iterator function as soon as possible (under concurrency limit).

#### poolLimit

The pool limit number (>= 1).

#### iterable

An input [iterable object](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Iteration_protocols#the_iterable_protocol), such as [`String`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String), [`Array`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array), [`TypedArray`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/TypedArray), [`Map`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map), and [`Set`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Set).

#### iteratorFn

Iterator function that takes two arguments: the value of each iteration and the iterable object itself. The iterator function should either return a promise or be an async function.

## License

MIT © [Rafael Xavier de Souza](http://rafael.xavier.blog.br)
