# 数组与字符串参考

## 数组

### 核心概念

**数组**是存储在连续内存位置的元素集合。数组提供 O(1) 随机访问，但插入/删除为 O(n)（尾部除外）。

**关键属性**：
- 固定或动态大小（取决于语言）
- 同质元素（相同类型）
- 大多数语言中从零开始索引
- 连续内存分配

### 常见操作

| 操作 | 时间复杂度 | 备注 |
|------|-----------|------|
| 访问 | O(1) | 直接索引查找 |
| 搜索 | O(n) | 若已排序可用二分查找 O(log n) |
| 尾部插入 | O(1) 均摊 | 可能触发扩容 |
| 任意位置插入 | O(n) | 需要移动元素 |
| 尾部删除 | O(1) | pop 操作 |
| 任意位置删除 | O(n) | 需要移动元素 |

### Python 实现

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

### JavaScript 实现

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

## 字符串

### 核心概念

**字符串**是字符的序列。在大多数语言中，字符串是不可变的（Python、Java）或被当作字符数组（C++，JavaScript 在某些情况下允许修改）。

**关键属性**：
- 在 Python、Java、JavaScript（原始类型）中不可变
- 在 C++ 中是字符数组
- UTF-8/UTF-16 编码考量
- 拼接操作可能很耗性能

### 常见操作

| 操作 | 时间复杂度 | 备注 |
|------|-----------|------|
| 访问 | O(1) | 直接索引查找 |
| 拼接 | O(n + m) | 不可变时创建新字符串 |
| 子串 | O(k) | k = 子串长度 |
| 搜索 | O(n * m) | 朴素算法；KMP 为 O(n + m) |
| 替换 | O(n) | 不可变语言创建新字符串 |

### Python 实现

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

### JavaScript 实现

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

## 常见数组/字符串模式

### 1. 双指针

**问题**：检查字符串是否为回文
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

### 2. 滑动窗口

**问题**：大小为 k 的最大子数组和
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

### 3. 前缀和

**问题**：区间求和查询
```python
class RangeSumQuery:
    def __init__(self, nums):
        self.prefix = [0]
        for num in nums:
            self.prefix.append(self.prefix[-1] + num)

    def sum_range(self, left, right):
        return self.prefix[right + 1] - self.prefix[left]
```

### 4. 哈希表统计频率

**问题**：字符串中第一个不重复的字符
```python
def first_unique_char(s):
    from collections import Counter

    freq = Counter(s)

    for i, char in enumerate(s):
        if freq[char] == 1:
            return i

    return -1
```

### 5. 字符串拼接优化

**问题**：高效的字符串拼接
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

## 高级技巧

### 1. Kadane 算法（最大子数组和）

```python
def max_subarray_sum(nums):
    """Find maximum sum of contiguous subarray."""
    max_current = max_global = nums[0]

    for i in range(1, len(nums)):
        max_current = max(nums[i], max_current + nums[i])
        max_global = max(max_global, max_current)

    return max_global
```

**时间复杂度**：O(n)，**空间复杂度**：O(1)

### 2. KMP 字符串匹配

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

**时间复杂度**：O(n + m)，**空间复杂度**：O(m)

### 3. Rabin-Karp（滚动哈希）

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

**平均时间复杂度**：O(n + m)，**最坏**：O(n * m)

---

## 常见陷阱与最佳实践

### 陷阱 1：差一错误
```python
# WRONG
for i in range(len(arr) - 1):  # Misses last element
    print(arr[i])

# CORRECT
for i in range(len(arr)):
    print(arr[i])
```

### 陷阱 2：遍历时修改
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

### 陷阱 3：循环中的字符串拼接
```python
# INEFFICIENT: O(n²)
result = ""
for i in range(n):
    result += str(i)

# EFFICIENT: O(n)
result = "".join(str(i) for i in range(n))
```

### 最佳实践 1：使用内置函数
```python
# Manual max finding
max_val = arr[0]
for val in arr:
    if val > max_val:
        max_val = val

# Better
max_val = max(arr)
```

### 最佳实践 2：列表推导式
```python
# Traditional loop
squares = []
for x in range(10):
    squares.append(x ** 2)

# List comprehension (more Pythonic)
squares = [x ** 2 for x in range(10)]
```

### 最佳实践 3：enumerate 获取索引和值
```python
# Manual indexing
for i in range(len(arr)):
    print(f"Index {i}: {arr[i]}")

# Better
for i, val in enumerate(arr):
    print(f"Index {i}: {val}")
```

---

## 面试问题检查清单

解决数组/字符串问题时：

1. **明确约束**：
   - 数组大小限制？
   - 数组可以为空吗？
   - 值的范围？
   - 允许原地修改吗？

2. **考虑边界情况**：
   - 空数组/字符串
   - 单个元素
   - 所有元素相同
   - 已排序
   - 负数（对于数组）

3. **选择方法**：
   - 先暴力解法（验证逻辑）
   - 优化（双指针、哈希表、滑动窗口）
   - 考虑时间/空间权衡

4. **用示例测试**：
   - 正常情况
   - 边界情况
   - 大规模输入

5. **分析复杂度**：
   - 时间复杂度
   - 空间复杂度
   - 还能进一步优化吗？
