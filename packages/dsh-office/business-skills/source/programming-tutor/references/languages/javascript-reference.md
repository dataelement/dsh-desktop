# JavaScript 快速参考

## 基础语法

### 变量与类型
```javascript
// Variable declarations
let x = 5;              // Block-scoped, reassignable
const y = 10;           // Block-scoped, constant
var z = 15;             // Function-scoped (avoid!)

// Types
let num = 42;           // Number
let str = "hello";      // String
let bool = true;        // Boolean
let arr = [1, 2, 3];    // Array
let obj = {a: 1};       // Object
let nothing = null;     // Null
let undef = undefined;  // Undefined

// Type checking
typeof num;             // "number"
Array.isArray(arr);     // true
```

### 字符串
```javascript
// String creation
const s = "hello";
const s2 = 'hello';
const s3 = `hello`;     // Template literal

// Template literals (ES6+)
const name = "Alice";
const age = 30;
const message = `${name} is ${age} years old`;

// Common methods
s.toUpperCase();        // "HELLO"
s.toLowerCase();        // "hello"
s.trim();               // Remove whitespace
s.split(',');           // Split into array
s.replace('h', 'H');    // "Hello"
s.startsWith('he');     // true
s.endsWith('lo');       // true
s.includes('ll');       // true
s.indexOf('ll');        // 2

// Slicing
s[0];                   // 'h'
s.slice(1, 4);          // 'ell'
s.slice(-3);            // 'llo'
```

### 数组
```javascript
// Creation
const nums = [1, 2, 3, 4, 5];
const mixed = [1, "hello", true];
const arr = new Array(5);  // Array of length 5

// Common operations
nums.push(6);           // Add to end
nums.unshift(0);        // Add to beginning
nums.pop();             // Remove from end
nums.shift();           // Remove from beginning
nums.splice(2, 1);      // Remove at index 2
nums.slice(1, 4);       // Subarray [1, 4)
nums.concat([7, 8]);    // Merge arrays

// Array methods
nums.length;            // 5
nums.indexOf(3);        // 2
nums.includes(3);       // true
nums.join(', ');        // "1, 2, 3, 4, 5"
nums.reverse();         // Reverse in-place
nums.sort();            // Sort in-place (lexicographic)
nums.sort((a, b) => a - b);  // Numeric sort

// Higher-order functions
nums.map(x => x * 2);           // [2, 4, 6, 8, 10]
nums.filter(x => x % 2 === 0);  // [2, 4]
nums.reduce((sum, x) => sum + x, 0);  // 15
nums.forEach(x => console.log(x));
nums.find(x => x > 3);          // 4
nums.findIndex(x => x > 3);     // 3
nums.some(x => x > 3);          // true
nums.every(x => x > 0);         // true
```

### 对象
```javascript
// Creation
const person = {
    name: "Alice",
    age: 30,
    city: "NYC"
};

// Or
const person = new Object();
person.name = "Alice";

// Access
person.name;            // "Alice"
person['name'];         // "Alice"
person.name || 'Unknown';  // Default value

// Modification
person.city = 'SF';     // Update
person.email = 'a@example.com';  // Add
delete person.age;      // Remove

// Methods
Object.keys(person);    // ['name', 'age', 'city']
Object.values(person);  // ['Alice', 30, 'NYC']
Object.entries(person); // [['name', 'Alice'], ...]

// Iteration
for (const key in person) {
    console.log(key, person[key]);
}

for (const [key, value] of Object.entries(person)) {
    console.log(key, value);
}

// Destructuring
const {name, age} = person;
```

### Map 与 Set
```javascript
// Map (key-value pairs, any type as key)
const map = new Map();
map.set('name', 'Alice');
map.set(1, 'one');
map.get('name');        // "Alice"
map.has('name');        // true
map.delete('name');
map.size;               // 1

// Set (unique values)
const set = new Set([1, 2, 3, 3, 3]);
set.add(4);
set.has(3);             // true
set.delete(2);
set.size;               // 3

// Iteration
for (const value of set) {
    console.log(value);
}
```

---

## 控制流

### If-Else
```javascript
const x = 10;

if (x > 0) {
    console.log("Positive");
} else if (x < 0) {
    console.log("Negative");
} else {
    console.log("Zero");
}

// Ternary
const result = x > 0 ? "Positive" : "Non-positive";

// Nullish coalescing (ES2020)
const value = null ?? "default";  // "default"
const value2 = 0 ?? "default";    // 0 (not null/undefined)
```

### 循环
```javascript
// For loop
for (let i = 0; i < 5; i++) {
    console.log(i);
}

// For-of (values)
for (const item of [1, 2, 3]) {
    console.log(item);
}

// For-in (keys/indices)
for (const key in {a: 1, b: 2}) {
    console.log(key);
}

// While
let i = 0;
while (i < 5) {
    console.log(i);
    i++;
}

// Do-while
let j = 0;
do {
    console.log(j);
    j++;
} while (j < 5);

// Break and continue
for (let i = 0; i < 10; i++) {
    if (i === 3) continue;  // Skip 3
    if (i === 8) break;     // Stop at 8
    console.log(i);
}
```

---

## 函数

### 函数声明
```javascript
// Regular function
function greet(name) {
    return `Hello, ${name}`;
}

// Function expression
const greet = function(name) {
    return `Hello, ${name}`;
};

// Arrow function (ES6)
const greet = (name) => {
    return `Hello, ${name}`;
};

// Concise arrow function
const greet = name => `Hello, ${name}`;
const add = (a, b) => a + b;

// Default parameters
function greet(name = "World") {
    return `Hello, ${name}`;
}

// Rest parameters
function sum(...numbers) {
    return numbers.reduce((total, n) => total + n, 0);
}

sum(1, 2, 3, 4);  // 10

// Destructuring parameters
function greet({name, age}) {
    return `${name} is ${age}`;
}

greet({name: "Alice", age: 30});
```

### 箭头函数 vs 普通函数
```javascript
// 'this' binding difference
const obj = {
    name: "Alice",
    // Regular function - 'this' is obj
    greet: function() {
        console.log(this.name);
    },
    // Arrow function - 'this' is lexical
    greetArrow: () => {
        console.log(this.name);  // undefined
    }
};
```

---

## 面向对象编程

### 类（ES6）
```javascript
class Person {
    // Constructor
    constructor(name, age) {
        this.name = name;
        this.age = age;
    }

    // Method
    greet() {
        return `Hello, I'm ${this.name}`;
    }

    // Getter
    get birthYear() {
        return new Date().getFullYear() - this.age;
    }

    // Setter
    set birthYear(year) {
        this.age = new Date().getFullYear() - year;
    }

    // Static method
    static species() {
        return "Homo sapiens";
    }
}

// Usage
const person = new Person("Alice", 30);
console.log(person.greet());
console.log(person.birthYear);
console.log(Person.species());
```

### 继承
```javascript
class Animal {
    constructor(name) {
        this.name = name;
    }

    speak() {
        return `${this.name} makes a sound`;
    }
}

class Dog extends Animal {
    constructor(name, breed) {
        super(name);  // Call parent constructor
        this.breed = breed;
    }

    speak() {
        return `${this.name} barks!`;
    }
}

const dog = new Dog("Buddy", "Golden Retriever");
console.log(dog.speak());  // Buddy barks!
```

### 原型（ES6 之前的写法）
```javascript
function Person(name, age) {
    this.name = name;
    this.age = age;
}

Person.prototype.greet = function() {
    return `Hello, I'm ${this.name}`;
};

const person = new Person("Alice", 30);
```

---

## 异步 JavaScript

### 回调
```javascript
function fetchData(callback) {
    setTimeout(() => {
        callback('Data loaded');
    }, 1000);
}

fetchData((data) => {
    console.log(data);
});
```

### Promise
```javascript
const promise = new Promise((resolve, reject) => {
    setTimeout(() => {
        const success = true;
        if (success) {
            resolve('Success!');
        } else {
            reject('Error!');
        }
    }, 1000);
});

// Using promises
promise
    .then(result => console.log(result))
    .catch(error => console.error(error))
    .finally(() => console.log('Done'));

// Promise chaining
fetch('https://api.example.com/data')
    .then(response => response.json())
    .then(data => console.log(data))
    .catch(error => console.error(error));
```

### Async/Await（ES2017）
```javascript
async function fetchData() {
    try {
        const response = await fetch('https://api.example.com/data');
        const data = await response.json();
        return data;
    } catch (error) {
        console.error(error);
    }
}

// Usage
fetchData().then(data => console.log(data));

// Or in async context
const data = await fetchData();
```

---

## 错误处理

```javascript
// Try-catch
try {
    const result = riskyOperation();
} catch (error) {
    console.error('Error:', error.message);
} finally {
    console.log('Cleanup');
}

// Throwing errors
function divide(a, b) {
    if (b === 0) {
        throw new Error('Division by zero');
    }
    return a / b;
}

// Custom errors
class ValidationError extends Error {
    constructor(message) {
        super(message);
        this.name = 'ValidationError';
    }
}

throw new ValidationError('Invalid input');
```

---

## 现代 JavaScript 特性

### 解构赋值
```javascript
// Array destructuring
const [a, b, c] = [1, 2, 3];
const [first, ...rest] = [1, 2, 3, 4, 5];

// Object destructuring
const {name, age} = {name: 'Alice', age: 30};
const {name: userName, age: userAge} = person;

// Function parameters
function greet({name, age = 18}) {
    console.log(`${name} is ${age}`);
}
```

### 展开运算符
```javascript
// Array spread
const arr1 = [1, 2, 3];
const arr2 = [...arr1, 4, 5];  // [1, 2, 3, 4, 5]

// Object spread
const obj1 = {a: 1, b: 2};
const obj2 = {...obj1, c: 3};  // {a: 1, b: 2, c: 3}

// Function arguments
const numbers = [1, 2, 3];
Math.max(...numbers);  // 3
```

### 可选链（ES2020）
```javascript
const user = {
    name: "Alice",
    address: {
        city: "NYC"
    }
};

// Safe access
user.address?.city;           // "NYC"
user.contact?.email;          // undefined (no error)
user.greet?.();               // undefined (method doesn't exist)
```

### 空值合并（ES2020）
```javascript
const value = null ?? "default";    // "default"
const value2 = 0 ?? "default";      // 0
const value3 = "" ?? "default";     // ""
```

---

## 常见模式

### 数组操作
```javascript
// Remove duplicates
const unique = [...new Set([1, 2, 2, 3, 3, 4])];  // [1, 2, 3, 4]

// Flatten array
const nested = [1, [2, 3], [4, [5, 6]]];
const flat = nested.flat(2);  // [1, 2, 3, 4, 5, 6]

// Group by
const people = [
    {name: 'Alice', age: 30},
    {name: 'Bob', age: 25},
    {name: 'Charlie', age: 30}
];

const grouped = people.reduce((acc, person) => {
    (acc[person.age] = acc[person.age] || []).push(person);
    return acc;
}, {});
```

### 对象操作
```javascript
// Merge objects
const merged = {...obj1, ...obj2};
const merged2 = Object.assign({}, obj1, obj2);

// Clone object (shallow)
const clone = {...original};

// Clone object (deep)
const deepClone = JSON.parse(JSON.stringify(original));

// Pick properties
const {name, age, ...rest} = person;
```

### 函数组合
```javascript
const compose = (...fns) => x => fns.reduceRight((v, f) => f(v), x);

const add5 = x => x + 5;
const multiply2 = x => x * 2;
const composed = compose(multiply2, add5);

composed(10);  // (10 + 5) * 2 = 30
```

---

## 常见陷阱

### 1. == vs ===
```javascript
// AVOID ==
0 == false;     // true
"" == false;    // true
null == undefined;  // true

// USE ===
0 === false;    // false
"" === false;   // false
null === undefined;  // false
```

### 2. var vs let/const
```javascript
// var has function scope (problem!)
for (var i = 0; i < 3; i++) {
    setTimeout(() => console.log(i), 100);
}
// Prints: 3, 3, 3 (unexpected!)

// let has block scope (correct)
for (let i = 0; i < 3; i++) {
    setTimeout(() => console.log(i), 100);
}
// Prints: 0, 1, 2
```

### 3. this 绑定
```javascript
const obj = {
    name: "Alice",
    greet: function() {
        // Regular function - 'this' is obj
        console.log(this.name);

        setTimeout(function() {
            // 'this' is undefined/window!
            console.log(this.name);  // undefined
        }, 100);

        // Fix with arrow function
        setTimeout(() => {
            console.log(this.name);  // "Alice"
        }, 100);
    }
};
```

### 4. 数组/对象引用
```javascript
// Arrays and objects are passed by reference
const arr1 = [1, 2, 3];
const arr2 = arr1;  // Same reference!
arr2.push(4);
console.log(arr1);  // [1, 2, 3, 4]

// Clone to avoid
const arr3 = [...arr1];  // New array
```

---

## 最佳实践

### 1. 默认使用 const
```javascript
// Good
const PI = 3.14159;
const user = {name: "Alice"};

// Use let only when reassignment needed
let counter = 0;
counter++;
```

### 2. 使用 === 代替 ==
```javascript
// Always use strict equality
if (value === 0) { }
if (str === "") { }
```

### 3. 回调函数使用箭头函数
```javascript
// Good
arr.map(x => x * 2);
arr.filter(x => x > 0);

// Avoid
arr.map(function(x) { return x * 2; });
```

### 4. 使用模板字符串
```javascript
// Good
const message = `Hello, ${name}!`;

// Avoid
const message = "Hello, " + name + "!";
```

### 5. 使用解构赋值
```javascript
// Good
const {name, age} = person;
const [first, second] = arr;

// Avoid
const name = person.name;
const age = person.age;
```

---

## ES6+ 特性总结

- **let/const**：块级作用域变量
- **箭头函数**：简洁语法，词法 this
- **模板字符串**：字符串插值
- **解构赋值**：从数组/对象中提取值
- **展开/剩余运算符**：... 操作符
- **类**：面向对象语法糖
- **Promise**：异步处理
- **async/await**：更清晰的异步代码
- **模块**：import/export
- **可选链**：?. 操作符
- **空值合并**：?? 操作符

---

## 常见用例

### 数组方法链式调用
```javascript
const result = users
    .filter(user => user.active)
    .map(user => user.name)
    .sort()
    .join(', ');
```

### Fetch API
```javascript
async function getUser(id) {
    try {
        const response = await fetch(`/api/users/${id}`);
        if (!response.ok) throw new Error('User not found');
        return await response.json();
    } catch (error) {
        console.error(error);
    }
}
```

### 事件处理
```javascript
button.addEventListener('click', (event) => {
    event.preventDefault();
    console.log('Clicked!');
});
```
