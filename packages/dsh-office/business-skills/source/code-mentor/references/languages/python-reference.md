# Python Quick Reference

## Basic Syntax

### Variables & Types
```python
# Dynamic typing
x = 5           # int
y = 3.14        # float
name = "Alice"  # str
is_valid = True # bool

# Type hints (optional, Python 3.5+)
def greet(name: str) -> str:
    return f"Hello, {name}"

# Multiple assignment
a, b, c = 1, 2, 3
x = y = z = 0
```

### Strings
```python
# String creation
s = "hello"
s = 'hello'
s = """multi
line"""

# F-strings (Python 3.6+)
name = "Alice"
age = 30
message = f"{name} is {age} years old"

# Common methods
s.upper()           # "HELLO"
s.lower()           # "hello"
s.strip()           # Remove whitespace
s.split(',')        # Split into list
s.replace('h', 'H') # "Hello"
s.startswith('he')  # True
s.endswith('lo')    # True
s.find('ll')        # 2 (index, -1 if not found)

# Slicing
s[0]      # 'h'
s[-1]     # 'o'
s[1:4]    # 'ell'
s[::-1]   # 'olleh' (reverse)
```

### Lists
```python
# Creation
nums = [1, 2, 3, 4, 5]
mixed = [1, "hello", True, 3.14]

# Common operations
nums.append(6)        # Add to end
nums.insert(0, 0)     # Insert at index
nums.remove(3)        # Remove first occurrence
nums.pop()            # Remove and return last
nums.pop(0)           # Remove and return at index
nums.extend([7, 8])   # Add multiple elements
len(nums)             # Length
nums.sort()           # Sort in-place
sorted(nums)          # Return sorted copy
nums.reverse()        # Reverse in-place
nums[::-1]            # Return reversed copy

# List comprehension
squares = [x**2 for x in range(10)]
evens = [x for x in range(10) if x % 2 == 0]
```

### Dictionaries
```python
# Creation
person = {'name': 'Alice', 'age': 30}
person = dict(name='Alice', age=30)

# Access
name = person['name']           # KeyError if not exists
name = person.get('name')       # None if not exists
name = person.get('name', 'Unknown')  # Default value

# Modification
person['city'] = 'NYC'          # Add/update
del person['age']               # Remove
age = person.pop('age', 0)      # Remove and return

# Iteration
for key in person:
    print(key, person[key])

for key, value in person.items():
    print(key, value)

# Dict comprehension
squares = {x: x**2 for x in range(5)}
```

### Sets
```python
# Creation
s = {1, 2, 3, 4, 5}
s = set([1, 2, 3, 3, 3])  # {1, 2, 3}

# Operations
s.add(6)              # Add element
s.remove(3)           # Remove (KeyError if not exists)
s.discard(3)          # Remove (no error)
s.union({4, 5, 6})    # {1, 2, 3, 4, 5, 6}
s.intersection({3, 4})  # {3, 4}
s.difference({3, 4})  # {1, 2, 5}
```

---

## Control Flow

### If-Elif-Else
```python
x = 10

if x > 0:
    print("Positive")
elif x < 0:
    print("Negative")
else:
    print("Zero")

# Ternary
result = "Positive" if x > 0 else "Non-positive"
```

### Loops
```python
# For loop
for i in range(5):      # 0, 1, 2, 3, 4
    print(i)

for i in range(2, 10, 2):  # 2, 4, 6, 8
    print(i)

for item in [1, 2, 3]:
    print(item)

# Enumerate (index + value)
for i, val in enumerate(['a', 'b', 'c']):
    print(f"{i}: {val}")

# While loop
i = 0
while i < 5:
    print(i)
    i += 1

# Break and continue
for i in range(10):
    if i == 3:
        continue  # Skip 3
    if i == 8:
        break     # Stop at 8
    print(i)
```

---

## Functions

### Basic Functions
```python
def greet(name):
    return f"Hello, {name}"

# Default arguments
def greet(name="World"):
    return f"Hello, {name}"

# Multiple return values
def divide(a, b):
    return a // b, a % b  # Returns tuple

quotient, remainder = divide(10, 3)

# *args and **kwargs
def print_all(*args):
    for arg in args:
        print(arg)

def print_info(**kwargs):
    for key, value in kwargs.items():
        print(f"{key}: {value}")

print_all(1, 2, 3)
print_info(name="Alice", age=30)
```

### Lambda Functions
```python
# Anonymous function
square = lambda x: x ** 2
add = lambda x, y: x + y

# Common with map, filter, sorted
nums = [1, 2, 3, 4, 5]
squares = list(map(lambda x: x**2, nums))
evens = list(filter(lambda x: x % 2 == 0, nums))
sorted_tuples = sorted([(1, 'c'), (2, 'a')], key=lambda x: x[1])
```

---

## Object-Oriented Programming

### Classes
```python
class Person:
    # Class variable
    species = "Homo sapiens"

    def __init__(self, name, age):
        # Instance variables
        self.name = name
        self.age = age

    def greet(self):
        return f"Hello, I'm {self.name}"

    def __str__(self):
        return f"Person(name={self.name}, age={self.age})"

    def __repr__(self):
        return f"Person('{self.name}', {self.age})"

# Usage
p = Person("Alice", 30)
print(p.greet())
print(p)  # Uses __str__
```

### Inheritance
```python
class Animal:
    def __init__(self, name):
        self.name = name

    def speak(self):
        pass

class Dog(Animal):
    def speak(self):
        return f"{self.name} says Woof!"

class Cat(Animal):
    def speak(self):
        return f"{self.name} says Meow!"

dog = Dog("Buddy")
print(dog.speak())  # Buddy says Woof!
```

### Properties
```python
class Circle:
    def __init__(self, radius):
        self._radius = radius

    @property
    def radius(self):
        return self._radius

    @radius.setter
    def radius(self, value):
        if value < 0:
            raise ValueError("Radius cannot be negative")
        self._radius = value

    @property
    def area(self):
        return 3.14159 * self._radius ** 2

# Usage
c = Circle(5)
print(c.area)    # 78.53975
c.radius = 10    # Uses setter
```

### Special Methods (Dunder Methods)
```python
class Vector:
    def __init__(self, x, y):
        self.x = x
        self.y = y

    def __add__(self, other):
        return Vector(self.x + other.x, self.y + other.y)

    def __str__(self):
        return f"Vector({self.x}, {self.y})"

    def __len__(self):
        return 2

    def __getitem__(self, index):
        return [self.x, self.y][index]

v1 = Vector(1, 2)
v2 = Vector(3, 4)
v3 = v1 + v2  # Uses __add__
print(v3)     # Uses __str__
```

---

## File I/O

```python
# Reading
with open('file.txt', 'r') as f:
    content = f.read()        # Read entire file
    # or
    lines = f.readlines()     # List of lines
    # or
    for line in f:            # Iterate line by line
        print(line.strip())

# Writing
with open('file.txt', 'w') as f:
    f.write("Hello\n")
    f.writelines(["Line 1\n", "Line 2\n"])

# Appending
with open('file.txt', 'a') as f:
    f.write("New line\n")

# JSON
import json

# Write JSON
data = {'name': 'Alice', 'age': 30}
with open('data.json', 'w') as f:
    json.dump(data, f, indent=2)

# Read JSON
with open('data.json', 'r') as f:
    data = json.load(f)
```

---

## Error Handling

```python
# Try-except
try:
    result = 10 / 0
except ZeroDivisionError:
    print("Cannot divide by zero")
except Exception as e:
    print(f"Error: {e}")
else:
    print("No errors")  # Runs if no exception
finally:
    print("Always runs")

# Raising exceptions
def divide(a, b):
    if b == 0:
        raise ValueError("Divisor cannot be zero")
    return a / b

# Custom exceptions
class InvalidAgeError(Exception):
    pass

def set_age(age):
    if age < 0:
        raise InvalidAgeError("Age cannot be negative")
```

---

## Common Libraries

### Collections
```python
from collections import Counter, defaultdict, deque

# Counter
words = ['apple', 'banana', 'apple', 'orange', 'banana', 'apple']
count = Counter(words)
print(count['apple'])  # 3
print(count.most_common(2))  # [('apple', 3), ('banana', 2)]

# defaultdict
d = defaultdict(list)
d['key'].append(1)  # No KeyError

# deque (double-ended queue)
q = deque([1, 2, 3])
q.append(4)       # Add to right
q.appendleft(0)   # Add to left
q.pop()           # Remove from right
q.popleft()       # Remove from left
```

### Itertools
```python
from itertools import combinations, permutations, product

# Combinations
list(combinations([1, 2, 3], 2))  # [(1, 2), (1, 3), (2, 3)]

# Permutations
list(permutations([1, 2, 3], 2))  # [(1, 2), (1, 3), (2, 1), ...]

# Cartesian product
list(product([1, 2], ['a', 'b']))  # [(1, 'a'), (1, 'b'), (2, 'a'), (2, 'b')]
```

### Functools
```python
from functools import lru_cache, reduce

# Memoization
@lru_cache(maxsize=None)
def fibonacci(n):
    if n < 2:
        return n
    return fibonacci(n-1) + fibonacci(n-2)

# Reduce
from functools import reduce
product = reduce(lambda x, y: x * y, [1, 2, 3, 4])  # 24
```

---

## List/Dict/Set Comprehensions

```python
# List comprehension
squares = [x**2 for x in range(10)]
evens = [x for x in range(10) if x % 2 == 0]
nested = [[i for i in range(3)] for j in range(3)]

# Dict comprehension
squares_dict = {x: x**2 for x in range(5)}
filtered = {k: v for k, v in squares_dict.items() if v > 5}

# Set comprehension
unique_lengths = {len(word) for word in ['apple', 'banana', 'kiwi']}

# Generator expression (memory efficient)
sum_of_squares = sum(x**2 for x in range(1000000))
```

---

## Useful Built-in Functions

```python
# any, all
any([False, True, False])   # True (at least one True)
all([True, True, True])     # True (all True)

# zip
names = ['Alice', 'Bob']
ages = [30, 25]
for name, age in zip(names, ages):
    print(f"{name}: {age}")

# enumerate
for i, val in enumerate(['a', 'b', 'c']):
    print(f"{i}: {val}")

# map, filter
nums = [1, 2, 3, 4, 5]
squared = list(map(lambda x: x**2, nums))
evens = list(filter(lambda x: x % 2 == 0, nums))

# sorted, reversed
sorted([3, 1, 2])           # [1, 2, 3]
sorted([3, 1, 2], reverse=True)  # [3, 2, 1]
list(reversed([1, 2, 3]))   # [3, 2, 1]

# max, min, sum
max([1, 5, 3])    # 5
min([1, 5, 3])    # 1
sum([1, 2, 3])    # 6
```

---

## Common Idioms

### Swap Variables
```python
a, b = b, a
```

### Ternary Operator
```python
result = "Even" if x % 2 == 0 else "Odd"
```

### Default Dict Value
```python
value = my_dict.get('key', default_value)
```

### Enumerate with Start
```python
for i, val in enumerate(items, start=1):
    print(f"{i}. {val}")
```

### Unpacking
```python
first, *middle, last = [1, 2, 3, 4, 5]
# first=1, middle=[2,3,4], last=5
```

### Context Managers
```python
with open('file.txt') as f:
    data = f.read()
# File automatically closed
```

---

## Best Practices

### 1. PEP 8 Style Guide
```python
# Use 4 spaces for indentation
# Use snake_case for variables and functions
# Use PascalCase for classes
# Constants in UPPERCASE

def calculate_total(items):
    DISCOUNT_RATE = 0.1
    total = sum(items)
    return total * (1 - DISCOUNT_RATE)
```

### 2. List Comprehension vs Loop
```python
# Prefer comprehension for simple transformations
squares = [x**2 for x in range(10)]

# Use loop for complex logic
results = []
for x in range(10):
    if x % 2 == 0:
        result = process_even(x)
    else:
        result = process_odd(x)
    results.append(result)
```

### 3. Use `is` for None, `==` for Values
```python
if value is None:    # Correct
if value == None:    # Works but not idiomatic
```

### 4. EAFP vs LBYL
```python
# Easier to Ask Forgiveness than Permission (Pythonic)
try:
    value = my_dict['key']
except KeyError:
    value = default

# Look Before You Leap (less Pythonic)
if 'key' in my_dict:
    value = my_dict['key']
else:
    value = default
```

---

## Common Gotchas

### 1. Mutable Default Arguments
```python
# WRONG
def append_to(element, lst=[]):
    lst.append(element)
    return lst

# Calls share same list!
print(append_to(1))  # [1]
print(append_to(2))  # [1, 2] - unexpected!

# CORRECT
def append_to(element, lst=None):
    if lst is None:
        lst = []
    lst.append(element)
    return lst
```

### 2. Late Binding Closures
```python
# WRONG
funcs = [lambda: i for i in range(5)]
print([f() for f in funcs])  # [4, 4, 4, 4, 4]

# CORRECT
funcs = [lambda i=i: i for i in range(5)]
print([f() for f in funcs])  # [0, 1, 2, 3, 4]
```

### 3. Modifying List While Iterating
```python
# WRONG
lst = [1, 2, 3, 4, 5]
for item in lst:
    if item % 2 == 0:
        lst.remove(item)  # Can skip elements

# CORRECT
lst = [item for item in lst if item % 2 != 0]
```

---

## Python 3.10+ Features

### Structural Pattern Matching
```python
def process_command(command):
    match command.split():
        case ["quit"]:
            return "Quitting"
        case ["load", filename]:
            return f"Loading {filename}"
        case ["save", filename]:
            return f"Saving {filename}"
        case _:
            return "Unknown command"
```

### Union Types
```python
def greet(name: str | None = None) -> str:
    if name is None:
        return "Hello, stranger"
    return f"Hello, {name}"
```
