# 常见算法模式

本参考涵盖编程面试和实际问题解决中最常用的算法模式。理解这些模式有助于你识别面对陌生问题时应该使用哪种方法。

---

## 模式 1：双指针

**应用场景**：需要在数组或字符串问题中查找配对、三元组或从两端处理元素。

**何时使用**：
- 在有序数组中查找目标和的配对
- 原地反转数组或字符串
- 从有序数组中删除重复项
- 盛水最多的容器类问题

**示例题目**：
- 两数之和（有序数组）
- 验证回文串
- 盛水最多的容器
- 三数之和

**Python 实现**：
```python
def two_sum_sorted(arr, target):
    """Find two numbers that sum to target in sorted array."""
    left, right = 0, len(arr) - 1

    while left < right:
        current_sum = arr[left] + arr[right]

        if current_sum == target:
            return [left, right]
        elif current_sum < target:
            left += 1  # Need larger sum
        else:
            right -= 1  # Need smaller sum

    return None  # No solution found
```

**JavaScript 实现**：
```javascript
function twoSumSorted(arr, target) {
    let left = 0, right = arr.length - 1;

    while (left < right) {
        const currentSum = arr[left] + arr[right];

        if (currentSum === target) {
            return [left, right];
        } else if (currentSum < target) {
            left++;
        } else {
            right--;
        }
    }

    return null;
}
```

**时间复杂度**：O(n) - 单次遍历数组
**空间复杂度**：O(1) - 只需两个指针

---

## 模式 2：滑动窗口

**应用场景**：涉及子数组或子串的问题，需要找到最优窗口大小或追踪连续序列中的元素。

**何时使用**：
- 大小为 k 的最大/最小子数组和
- 无重复字符的最长子串
- 查找字符串中的所有变位词
- 最小覆盖子串

**类型**：
1. **固定大小窗口**：窗口大小固定（如大小为 k 的最大和）
2. **可变大小窗口**：窗口根据条件伸缩

**示例题目**：
- 大小为 K 的最大子数组和
- 无重复字符的最长子串
- 最小覆盖子串
- 字符串的排列

**Python 实现 - 固定窗口**：
```python
def max_sum_subarray(arr, k):
    """Find maximum sum of any subarray of size k."""
    if len(arr) < k:
        return None

    # Calculate sum of first window
    window_sum = sum(arr[:k])
    max_sum = window_sum

    # Slide the window
    for i in range(k, len(arr)):
        window_sum = window_sum - arr[i - k] + arr[i]
        max_sum = max(max_sum, window_sum)

    return max_sum
```

**JavaScript 实现 - 可变窗口**：
```javascript
function lengthOfLongestSubstring(s) {
    const seen = new Set();
    let left = 0;
    let maxLength = 0;

    for (let right = 0; right < s.length; right++) {
        // Shrink window until no duplicates
        while (seen.has(s[right])) {
            seen.delete(s[left]);
            left++;
        }

        seen.add(s[right]);
        maxLength = Math.max(maxLength, right - left + 1);
    }

    return maxLength;
}
```

**时间复杂度**：O(n) - 每个元素最多被访问两次
**空间复杂度**：固定窗口 O(k)，可变窗口使用哈希集合 O(n)

---

## 模式 3：快慢指针（Floyd 环检测）

**应用场景**：链表问题，尤其是环检测和查找中间元素。

**何时使用**：
- 检测链表中的环
- 查找链表中间节点
- 找到环的起点
- 判断快乐数

**示例题目**：
- 环形链表
- 快乐数
- 链表的中间节点
- 环起点检测

**Python 实现**：
```python
class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next

def has_cycle(head):
    """Detect if linked list has a cycle."""
    if not head:
        return False

    slow = fast = head

    while fast and fast.next:
        slow = slow.next        # Move 1 step
        fast = fast.next.next   # Move 2 steps

        if slow == fast:
            return True  # Cycle detected

    return False
```

**时间复杂度**：O(n)
**空间复杂度**：O(1)

---

## 模式 4：区间合并

**应用场景**：处理重叠区间、调度安排或范围的问题。

**何时使用**：
- 合并重叠区间
- 插入区间
- 会议室问题
- 区间交集

**示例题目**：
- 合并区间
- 插入区间
- 会议室 II
- 区间列表的交集

**Python 实现**：
```python
def merge_intervals(intervals):
    """Merge overlapping intervals."""
    if not intervals:
        return []

    # Sort by start time
    intervals.sort(key=lambda x: x[0])
    merged = [intervals[0]]

    for current in intervals[1:]:
        last_merged = merged[-1]

        if current[0] <= last_merged[1]:
            # Overlapping - merge
            merged[-1] = [last_merged[0], max(last_merged[1], current[1])]
        else:
            # Non-overlapping - add new interval
            merged.append(current)

    return merged
```

**时间复杂度**：O(n log n)，排序所致
**空间复杂度**：O(n)，用于输出

---

## 模式 5：循环排序

**应用场景**：涉及包含给定范围（通常是 1 到 n）数字的数组问题。

**何时使用**：
- 查找缺失/重复数字
- 查找所有缺失数字
- 查找损坏的配对
- 包含 1 到 n 数字的数组

**示例题目**：
- 缺失数字
- 查找所有缺失数字
- 寻找重复数
- 查找损坏的配对

**Python 实现**：
```python
def cyclic_sort(nums):
    """Sort array where numbers are in range 1 to n."""
    i = 0
    while i < len(nums):
        correct_index = nums[i] - 1

        if nums[i] != nums[correct_index]:
            # Swap to correct position
            nums[i], nums[correct_index] = nums[correct_index], nums[i]
        else:
            i += 1

    return nums

def find_missing_number(nums):
    """Find missing number in array [0, n]."""
    n = len(nums)
    i = 0

    # Cyclic sort
    while i < n:
        correct_index = nums[i]
        if nums[i] < n and nums[i] != nums[correct_index]:
            nums[i], nums[correct_index] = nums[correct_index], nums[i]
        else:
            i += 1

    # Find missing
    for i in range(n):
        if nums[i] != i:
            return i

    return n
```

**时间复杂度**：O(n)
**空间复杂度**：O(1)

---

## 模式 6：链表原地反转

**应用场景**：不使用额外空间反转链表或链表的部分。

**何时使用**：
- 反转整个链表
- 反转从位置 m 到 n 的子链表
- K 个一组反转
- 回文链表检查

**示例题目**：
- 反转链表
- 反转链表 II
- K 个一组翻转链表

**Python 实现**：
```python
def reverse_linked_list(head):
    """Reverse linked list in-place."""
    prev = None
    current = head

    while current:
        next_node = current.next  # Save next
        current.next = prev       # Reverse pointer
        prev = current            # Move prev forward
        current = next_node       # Move current forward

    return prev  # New head
```

**JavaScript 实现**：
```javascript
function reverseLinkedList(head) {
    let prev = null;
    let current = head;

    while (current !== null) {
        const nextNode = current.next;
        current.next = prev;
        prev = current;
        current = nextNode;
    }

    return prev;
}
```

**时间复杂度**：O(n)
**空间复杂度**：O(1)

---

## 模式 7：树的 BFS（广度优先搜索）

**应用场景**：树的层序遍历，查找特定层的信息。

**何时使用**：
- 层序遍历
- 查找最小深度
- 锯齿形层序遍历
- 连接同层兄弟节点
- 树的右视图

**示例题目**：
- 二叉树的层序遍历
- 二叉树的锯齿形遍历
- 二叉树的最小深度
- 连接同层兄弟节点

**Python 实现**：
```python
from collections import deque

def level_order_traversal(root):
    """BFS traversal returning list of levels."""
    if not root:
        return []

    result = []
    queue = deque([root])

    while queue:
        level_size = len(queue)
        current_level = []

        for _ in range(level_size):
            node = queue.popleft()
            current_level.append(node.val)

            if node.left:
                queue.append(node.left)
            if node.right:
                queue.append(node.right)

        result.append(current_level)

    return result
```

**时间复杂度**：O(n)
**空间复杂度**：O(n)，用于队列

---

## 模式 8：树的 DFS（深度优先搜索）

**应用场景**：基于路径的树问题，递归树遍历。

**何时使用**：
- 查找根到叶子的所有路径
- 路径数字之和
- 具有给定和的路径
- 统计路径和
- 树的直径

**类型**：
1. **前序**：根 → 左 → 右
2. **中序**：左 → 根 → 右
3. **后序**：左 → 右 → 根

**示例题目**：
- 二叉树的所有路径
- 路径总和
- 求根节点到叶节点数字之和
- 二叉树的直径

**Python 实现**：
```python
def has_path_sum(root, target_sum):
    """Check if tree has root-to-leaf path with given sum."""
    if not root:
        return False

    # Leaf node - check if sum matches
    if not root.left and not root.right:
        return root.val == target_sum

    # Recursive DFS
    remaining_sum = target_sum - root.val
    return (has_path_sum(root.left, remaining_sum) or
            has_path_sum(root.right, remaining_sum))
```

**时间复杂度**：O(n)
**空间复杂度**：O(h)，其中 h 为树的高度（递归栈）

---

## 模式 9：双堆

**应用场景**：需要查找中位数或将元素分成两半的问题。

**何时使用**：
- 数据流的中位数
- 滑动窗口中位数
- IPO（最大化资本）

**结构**：
- **最大堆**：存储较小的一半数字
- **最小堆**：存储较大的一半数字
- 中位数要么是最大堆的堆顶，要么是两个堆顶的平均值

**Python 实现**：
```python
import heapq

class MedianFinder:
    def __init__(self):
        self.max_heap = []  # Smaller half (inverted for max heap)
        self.min_heap = []  # Larger half

    def add_num(self, num):
        # Add to max heap first
        heapq.heappush(self.max_heap, -num)

        # Balance: move max of max_heap to min_heap
        heapq.heappush(self.min_heap, -heapq.heappop(self.max_heap))

        # Ensure max_heap has equal or one more element
        if len(self.max_heap) < len(self.min_heap):
            heapq.heappush(self.max_heap, -heapq.heappop(self.min_heap))

    def find_median(self):
        if len(self.max_heap) > len(self.min_heap):
            return -self.max_heap[0]
        return (-self.max_heap[0] + self.min_heap[0]) / 2
```

**时间复杂度**：O(log n) 插入，O(1) 查找中位数
**空间复杂度**：O(n)

---

## 模式 10：子集（回溯）

**应用场景**：需要生成所有组合、排列或子集的问题。

**何时使用**：
- 生成所有子集/幂集
- 排列
- 组合
- 字母大小写排列

**示例题目**：
- 子集
- 排列
- 组合
- 生成括号

**Python 实现**：
```python
def subsets(nums):
    """Generate all subsets using backtracking."""
    result = []

    def backtrack(start, current):
        # Add current subset
        result.append(current[:])

        # Explore further elements
        for i in range(start, len(nums)):
            current.append(nums[i])
            backtrack(i + 1, current)
            current.pop()  # Backtrack

    backtrack(0, [])
    return result
```

**时间复杂度**：O(2^n) - 指数级
**空间复杂度**：O(n)，递归深度

---

## 模式 11：二分查找

**应用场景**：在有序数组或搜索空间中查找，寻找边界。

**何时使用**：
- 在有序数组中搜索
- 查找第一个/最后一个出现位置
- 在旋转有序数组中搜索
- 寻找峰值元素
- 在二维矩阵中搜索

**模板**：
```python
def binary_search(arr, target):
    """Standard binary search."""
    left, right = 0, len(arr) - 1

    while left <= right:
        mid = left + (right - left) // 2  # Avoid overflow

        if arr[mid] == target:
            return mid
        elif arr[mid] < target:
            left = mid + 1
        else:
            right = mid - 1

    return -1  # Not found
```

**时间复杂度**：O(log n)
**空间复杂度**：O(1)

---

## 模式 12：Top K 元素

**应用场景**：查找前 k 个最大/最小元素、k 个最频繁的元素。

**何时使用**：
- 前 K 个最大/最小元素
- 最接近的 K 个点
- 前 K 个高频元素
- 按频率排序字符

**Python 实现**：
```python
import heapq

def k_largest_elements(nums, k):
    """Find k largest elements using min heap."""
    # Maintain min heap of size k
    min_heap = []

    for num in nums:
        heapq.heappush(min_heap, num)
        if len(min_heap) > k:
            heapq.heappop(min_heap)

    return min_heap
```

**时间复杂度**：O(n log k)
**空间复杂度**：O(k)

---

## 模式 13：变体二分查找

**应用场景**：复杂场景下的二分查找变体。

**何时使用**：
- 在旋转有序数组中搜索
- 寻找旋转有序数组中的最小值
- 在无限有序数组中搜索
- 查找范围（第一个和最后一个位置）

**Python 实现**：
```python
def search_rotated_array(nums, target):
    """Search in rotated sorted array."""
    left, right = 0, len(nums) - 1

    while left <= right:
        mid = left + (right - left) // 2

        if nums[mid] == target:
            return mid

        # Determine which half is sorted
        if nums[left] <= nums[mid]:  # Left half sorted
            if nums[left] <= target < nums[mid]:
                right = mid - 1
            else:
                left = mid + 1
        else:  # Right half sorted
            if nums[mid] < target <= nums[right]:
                left = mid + 1
            else:
                right = mid - 1

    return -1
```

---

## 模式 14：动态规划（自顶向下）

**应用场景**：具有重叠子问题的优化问题。

**何时使用**：
- 斐波那契数列、爬楼梯
- 打家劫舍
- 零钱兑换
- 最长公共子序列
- 0/1 背包

**模板（记忆化）**：
```python
def fibonacci(n, memo={}):
    """Calculate nth Fibonacci number with memoization."""
    if n in memo:
        return memo[n]

    if n <= 1:
        return n

    memo[n] = fibonacci(n - 1, memo) + fibonacci(n - 2, memo)
    return memo[n]
```

**时间复杂度**：取决于问题（通常 O(n) 或 O(n²)）
**空间复杂度**：O(n)，记忆化 + 递归栈

---

## 模式 15：动态规划（自底向上）

**应用场景**：与自顶向下相同，但使用迭代方式（通常更高效）。

**模板（制表法）**：
```python
def fibonacci_dp(n):
    """Calculate nth Fibonacci using bottom-up DP."""
    if n <= 1:
        return n

    dp = [0] * (n + 1)
    dp[1] = 1

    for i in range(2, n + 1):
        dp[i] = dp[i - 1] + dp[i - 2]

    return dp[n]
```

**空间优化**（斐波那契为例）：
```python
def fibonacci_optimized(n):
    """Space-optimized Fibonacci."""
    if n <= 1:
        return n

    prev2, prev1 = 0, 1

    for _ in range(2, n + 1):
        current = prev1 + prev2
        prev2, prev1 = prev1, current

    return prev1
```

---

## 如何选择正确的模式

问自己：

1. **输入的数据结构是什么？**
   - 有序数组 → 二分查找、双指针
   - 链表 → 快慢指针、原地反转
   - 树 → BFS、DFS
   - 区间 → 区间合并

2. **我在找什么？**
   - 子数组/子串 → 滑动窗口
   - 配对/三元组 → 双指针
   - 所有组合 → 回溯
   - 有选择的最优解 → 动态规划
   - 前 k 个元素 → 堆

3. **有约束条件吗？**
   - 数字在 [1, n] 范围内 → 循环排序
   - 需要中位数 → 双堆
   - 原地修改 → 双指针、循环排序

4. **时间复杂度要求是什么？**
   - O(log n) → 二分查找
   - O(n) → 双指针、滑动窗口、哈希表
   - O(n log n) → 排序、堆
   - 可接受指数级？ → 回溯、递归

---

**练习策略**：
1. 一次掌握一种模式
2. 每种模式解 5-10 道题
3. 在新问题中识别模式
4. 组合模式解决复杂问题

**常见模式组合**：
- 双指针 + 滑动窗口
- 二分查找 + DFS
- 动态规划 + 记忆化
- 回溯 + 剪枝
