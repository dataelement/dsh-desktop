# Arrays & Strings Reference

## Arrays

### Core Concepts

An **array** is a contiguous collection of elements stored at consecutive memory locations. Arrays provide O(1) random access but O(n) insertion/deletion (except at the end).

**Key Properties**:
- Fixed or dynamic size (depending on language)
- Homogeneous elements (same type)
- Zero-indexed in most languages
- Contiguous memory allocation

### Common Operations

| Operation | Time Complexity | Notes |
|-----------|----------------|-------|
| Access | O(1) | Direct index lookup |
| Search | O(n) | O(log n) if sorted + binary search |
| Insert (end) | O(1) amortized | May trigger resize |
| Insert (arbitrary) | O(n) | Shift elements |
| Delete (end) | O(1) | Pop operation |
| Delete (arbitrary) | O(n) | Shift elements |

### Python Implementation

```python
# Array/List operations
arr = [1, 2, 3, 4, 5]

# Access
element = arr[2]  # O(1)

# Search
index = arr.index(3)  # O(n)
exists = 3 in arr  # O(n)

# Insert
arr.append(6)  # O(1) at end
arr.insert(2, 10)  # O(n) at arbitrary position

# Delete
arr.pop()  # O(1) from end
arr.pop(2)  # O(n) from arbitrary position
arr.remove(10)  # O(n) - finds and removes

# Slicing
subarray = arr[1:4]  # O(k) where k is slice size

# Common patterns
reversed_arr = arr[::-1]
sorted_arr = sorted(arr)  # O(n log n)
```

### JavaScript Implementation

```javascript
// Array operations
const arr = [1, 2, 3, 4, 5];

// Access
const element = arr[2];  // O(1)

// Search
const index = arr.indexOf(3);  // O(n)
const exists = arr.includes(3);  // O(n)

// Insert
arr.push(6);  // O(1) at end
arr.splice(2, 0, 10);  // O(n) at arbitrary position

// Delete
arr.pop();  // O(1) from end
arr.splice(2, 1);  // O(n) from arbitrary position

// Slicing
const subarray = arr.slice(1, 4);  // O(k)

// Common patterns
const reversedArr = arr.reverse();
const sortedArr = arr.sort((a, b) => a - b);  // O(n log n)
```

---

## Strings

### Core Concepts

A **string** is a sequence of characters. In most languages, strings are immutable (Python, Java) or treated as character arrays (C++, JavaScript allows mutation in some cases).

**Key Properties**:
- Immutable in Python, Java, JavaScript (primitives)
- Character array in C++
- UTF-8/UTF-16 encoding considerations
- Concatenation can be expensive

### Common Operations

| Operation | Time Complexity | Notes |
|-----------|----------------|-------|
| Access | O(1) | Direct index lookup |
| Concatenation | O(n + m) | Creates new string if immutable |
| Substring | O(k) | k = substring length |
| Search | O(n * m) | Naive; O(n + m) with KMP |
| Replace | O(n) | Immutable languages create new string |

### Python Implementation

```python
s = "hello world"

# Access
char = s[0]  # O(1)

# Slicing
substring = s[0:5]  # O(k)
substring = s[::-1]  # Reverse O(n)

# Search
index = s.find("world")  # O(n), returns -1 if not found
index = s.index("world")  # O(n), raises error if not found
exists = "world" in s  # O(n)

# Modification (creates new string)
s_upper = s.upper()
s_lower = s.lower()
s_replaced = s.replace("world", "python")

# Split and join
words = s.split()  # O(n)
joined = " ".join(words)  # O(n)

# Common patterns
is_alpha = s.isalpha()
is_digit = s.isdigit()
stripped = s.strip()  # Remove whitespace
```

### JavaScript Implementation

```javascript
let s = "hello world";

// Access
const char = s[0];  // O(1)

// Slicing
const substring = s.slice(0, 5);  // O(k)
const reversed = s.split('').reverse().join('');  // O(n)

// Search
const index = s.indexOf("world");  // O(n), returns -1 if not found
const exists = s.includes("world");  // O(n)

// Modification (creates new string)
const sUpper = s.toUpperCase();
const sLower = s.toLowerCase();
const sReplaced = s.replace("world", "javascript");

// Split and join
const words = s.split(' ');  // O(n)
const joined = words.join(' ');  // O(n)

// Common methods
const trimmed = s.trim();
const startsWithHello = s.startsWith("hello");
const endsWithWorld = s.endsWith("world");
```

---

## Common Array/String Patterns

### 1. Two Pointers

**Problem**: Check if string is palindrome
```python
def is_palindrome(s):
    left, right = 0, len(s) - 1

    while left < right:
        if s[left] != s[right]:
            return False
        left += 1
        right -= 1

    return True
```

### 2. Sliding Window

**Problem**: Maximum sum subarray of size k
```python
def max_sum_subarray(arr, k):
    if len(arr) < k:
        return None

    window_sum = sum(arr[:k])
    max_sum = window_sum

    for i in range(k, len(arr)):
        window_sum = window_sum - arr[i - k] + arr[i]
        max_sum = max(max_sum, window_sum)

    return max_sum
```

### 3. Prefix Sum

**Problem**: Range sum queries
```python
class RangeSumQuery:
    def __init__(self, nums):
        self.prefix = [0]
        for num in nums:
            self.prefix.append(self.prefix[-1] + num)

    def sum_range(self, left, right):
        return self.prefix[right + 1] - self.prefix[left]
```

### 4. Hash Map for Frequency

**Problem**: First unique character in string
```python
def first_unique_char(s):
    from collections import Counter

    freq = Counter(s)

    for i, char in enumerate(s):
        if freq[char] == 1:
            return i

    return -1
```

### 5. String Builder (for performance)

**Problem**: Efficient string concatenation
```python
# BAD: O(n²) due to immutability
result = ""
for i in range(n):
    result += str(i)  # Creates new string each time

# GOOD: O(n) using list
result = []
for i in range(n):
    result.append(str(i))
final_result = "".join(result)
```

---

## Advanced Techniques

### 1. Kadane's Algorithm (Max Subarray Sum)

```python
def max_subarray_sum(nums):
    """Find maximum sum of contiguous subarray."""
    max_current = max_global = nums[0]

    for i in range(1, len(nums)):
        max_current = max(nums[i], max_current + nums[i])
        max_global = max(max_global, max_current)

    return max_global
```

**Time**: O(n), **Space**: O(1)

### 2. KMP String Matching

```python
def kmp_search(text, pattern):
    """Knuth-Morris-Pratt string matching."""
    def compute_lps(pattern):
        lps = [0] * len(pattern)
        length = 0
        i = 1

        while i < len(pattern):
            if pattern[i] == pattern[length]:
                length += 1
                lps[i] = length
                i += 1
            else:
                if length != 0:
                    length = lps[length - 1]
                else:
                    lps[i] = 0
                    i += 1

        return lps

    lps = compute_lps(pattern)
    i = j = 0

    while i < len(text):
        if pattern[j] == text[i]:
            i += 1
            j += 1

        if j == len(pattern):
            return i - j  # Pattern found
        elif i < len(text) and pattern[j] != text[i]:
            if j != 0:
                j = lps[j - 1]
            else:
                i += 1

    return -1  # Not found
```

**Time**: O(n + m), **Space**: O(m)

### 3. Rabin-Karp (Rolling Hash)

```python
def rabin_karp(text, pattern):
    """Rolling hash string matching."""
    d = 256  # Number of characters
    q = 101  # Prime number
    m = len(pattern)
    n = len(text)
    p = 0  # Hash value for pattern
    t = 0  # Hash value for text
    h = 1

    # Calculate h = pow(d, m-1) % q
    for i in range(m - 1):
        h = (h * d) % q

    # Calculate initial hash values
    for i in range(m):
        p = (d * p + ord(pattern[i])) % q
        t = (d * t + ord(text[i])) % q

    # Slide pattern over text
    for i in range(n - m + 1):
        if p == t:
            # Check characters one by one
            if text[i:i + m] == pattern:
                return i

        # Calculate hash for next window
        if i < n - m:
            t = (d * (t - ord(text[i]) * h) + ord(text[i + m])) % q
            if t < 0:
                t += q

    return -1
```

**Average Time**: O(n + m), **Worst**: O(n * m)

---

## Common Pitfalls & Best Practices

### Pitfall 1: Off-by-One Errors
```python
# WRONG
for i in range(len(arr) - 1):  # Misses last element
    print(arr[i])

# CORRECT
for i in range(len(arr)):
    print(arr[i])
```

### Pitfall 2: Modifying While Iterating
```python
# WRONG
for item in arr:
    if item % 2 == 0:
        arr.remove(item)  # Can skip elements

# CORRECT
arr = [item for item in arr if item % 2 != 0]
# Or iterate backwards
for i in range(len(arr) - 1, -1, -1):
    if arr[i] % 2 == 0:
        arr.pop(i)
```

### Pitfall 3: String Concatenation in Loop
```python
# INEFFICIENT: O(n²)
result = ""
for i in range(n):
    result += str(i)

# EFFICIENT: O(n)
result = "".join(str(i) for i in range(n))
```

### Best Practice 1: Use Built-in Functions
```python
# Manual max finding
max_val = arr[0]
for val in arr:
    if val > max_val:
        max_val = val

# Better
max_val = max(arr)
```

### Best Practice 2: List Comprehensions
```python
# Traditional loop
squares = []
for x in range(10):
    squares.append(x ** 2)

# List comprehension (more Pythonic)
squares = [x ** 2 for x in range(10)]
```

### Best Practice 3: Enumerate for Index + Value
```python
# Manual indexing
for i in range(len(arr)):
    print(f"Index {i}: {arr[i]}")

# Better
for i, val in enumerate(arr):
    print(f"Index {i}: {val}")
```

---

## Interview Problem Checklist

When solving array/string problems:

1. **Clarify constraints**:
   - Array size limits?
   - Can array be empty?
   - Value ranges?
   - In-place modification allowed?

2. **Consider edge cases**:
   - Empty array/string
   - Single element
   - All elements same
   - Already sorted
   - Negative numbers (for arrays)

3. **Choose approach**:
   - Brute force first (to verify logic)
   - Optimize (two pointers, hash map, sliding window)
   - Consider time/space trade-offs

4. **Test with examples**:
   - Normal case
   - Edge cases
   - Large input

5. **Analyze complexity**:
   - Time complexity
   - Space complexity
   - Can it be optimized further?
