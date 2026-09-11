# Common Algorithm Patterns

This reference covers the most frequently used algorithm patterns in coding interviews and real-world problem-solving. Understanding these patterns helps you recognize which approach to use for unfamiliar problems.

---

## Pattern 1: Two Pointers

**Use Case**: Array or string problems where you need to find pairs, triplets, or process elements from both ends.

**When to Use**:
- Finding pairs with a target sum in sorted arrays
- Reversing arrays or strings in-place
- Removing duplicates from sorted arrays
- Container with most water type problems

**Example Problems**:
- Two Sum (sorted array)
- Valid Palindrome
- Container With Most Water
- 3Sum

**Implementation (Python)**:
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

**Implementation (JavaScript)**:
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

**Time Complexity**: O(n) - single pass through array
**Space Complexity**: O(1) - only two pointers

---

## Pattern 2: Sliding Window

**Use Case**: Problems involving subarrays or substrings where you need to find the optimal window size or track elements in a contiguous sequence.

**When to Use**:
- Maximum/minimum subarray sum of size k
- Longest substring without repeating characters
- Finding all anagrams in a string
- Minimum window substring

**Types**:
1. **Fixed-size window**: Window size is constant (e.g., max sum of size k)
2. **Variable-size window**: Window grows/shrinks based on conditions

**Example Problems**:
- Maximum Sum Subarray of Size K
- Longest Substring Without Repeating Characters
- Minimum Window Substring
- Permutation in String

**Implementation (Python) - Fixed Window**:
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

**Implementation (JavaScript) - Variable Window**:
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

**Time Complexity**: O(n) - each element visited at most twice
**Space Complexity**: O(k) for fixed window, O(n) for variable window with hash set

---

## Pattern 3: Fast & Slow Pointers (Floyd's Cycle Detection)

**Use Case**: Linked list problems, especially cycle detection and finding middle elements.

**When to Use**:
- Detect cycles in linked lists
- Find the middle of a linked list
- Find the start of a cycle
- Determine if a number is happy

**Example Problems**:
- Linked List Cycle
- Happy Number
- Find Middle of Linked List
- Cycle Start Detection

**Implementation (Python)**:
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

**Time Complexity**: O(n)
**Space Complexity**: O(1)

---

## Pattern 4: Merge Intervals

**Use Case**: Problems dealing with overlapping intervals, scheduling, or ranges.

**When to Use**:
- Merge overlapping intervals
- Insert intervals
- Meeting room problems
- Interval intersection

**Example Problems**:
- Merge Intervals
- Insert Interval
- Meeting Rooms II
- Interval List Intersections

**Implementation (Python)**:
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

**Time Complexity**: O(n log n) due to sorting
**Space Complexity**: O(n) for output

---

## Pattern 5: Cyclic Sort

**Use Case**: Problems involving arrays containing numbers in a given range (typically 1 to n).

**When to Use**:
- Find missing/duplicate numbers
- Find all missing numbers
- Find the corrupt pair
- Arrays containing numbers from 1 to n

**Example Problems**:
- Find Missing Number
- Find All Missing Numbers
- Find Duplicate Number
- Find Corrupt Pair

**Implementation (Python)**:
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

**Time Complexity**: O(n)
**Space Complexity**: O(1)

---

## Pattern 6: In-place Reversal of Linked List

**Use Case**: Reversing linked lists or parts of linked lists without extra space.

**When to Use**:
- Reverse entire linked list
- Reverse sublist from position m to n
- Reverse in k-groups
- Palindrome linked list check

**Example Problems**:
- Reverse Linked List
- Reverse Linked List II
- Reverse Nodes in k-Group

**Implementation (Python)**:
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

**Implementation (JavaScript)**:
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

**Time Complexity**: O(n)
**Space Complexity**: O(1)

---

## Pattern 7: Tree BFS (Breadth-First Search)

**Use Case**: Level-order traversal of trees, finding level-specific information.

**When to Use**:
- Level order traversal
- Find minimum depth
- Zigzag level order traversal
- Connect level order siblings
- Right view of tree

**Example Problems**:
- Binary Tree Level Order Traversal
- Binary Tree Zigzag Traversal
- Minimum Depth of Binary Tree
- Connect Level Order Siblings

**Implementation (Python)**:
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

**Time Complexity**: O(n)
**Space Complexity**: O(n) for queue

---

## Pattern 8: Tree DFS (Depth-First Search)

**Use Case**: Path-based tree problems, recursive tree traversal.

**When to Use**:
- Find all paths from root to leaf
- Sum of path numbers
- Path with given sum
- Count paths with sum
- Tree diameter

**Types**:
1. **Preorder**: Root → Left → Right
2. **Inorder**: Left → Root → Right
3. **Postorder**: Left → Right → Root

**Example Problems**:
- Binary Tree Paths
- Path Sum
- Sum Root to Leaf Numbers
- Diameter of Binary Tree

**Implementation (Python)**:
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

**Time Complexity**: O(n)
**Space Complexity**: O(h) where h is tree height (recursion stack)

---

## Pattern 9: Two Heaps

**Use Case**: Problems where you need to find the median or divide elements into two halves.

**When to Use**:
- Find median from data stream
- Sliding window median
- IPO (maximize capital)

**Structure**:
- **Max heap**: Stores smaller half of numbers
- **Min heap**: Stores larger half of numbers
- Median is either max of max-heap or average of both tops

**Implementation (Python)**:
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

**Time Complexity**: O(log n) for insertion, O(1) for median
**Space Complexity**: O(n)

---

## Pattern 10: Subsets (Backtracking)

**Use Case**: Problems requiring generation of all combinations, permutations, or subsets.

**When to Use**:
- Generate all subsets/power set
- Permutations
- Combinations
- Letter case permutation

**Example Problems**:
- Subsets
- Permutations
- Combinations
- Generate Parentheses

**Implementation (Python)**:
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

**Time Complexity**: O(2^n) - exponential
**Space Complexity**: O(n) for recursion depth

---

## Pattern 11: Binary Search

**Use Case**: Search in sorted arrays or search space, finding boundaries.

**When to Use**:
- Search in sorted array
- Find first/last occurrence
- Search in rotated sorted array
- Find peak element
- Search in 2D matrix

**Template**:
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

**Time Complexity**: O(log n)
**Space Complexity**: O(1)

---

## Pattern 12: Top K Elements

**Use Case**: Find k largest/smallest elements, k most frequent elements.

**When to Use**:
- K largest/smallest elements
- K closest points
- K most frequent elements
- Sort characters by frequency

**Implementation (Python)**:
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

**Time Complexity**: O(n log k)
**Space Complexity**: O(k)

---

## Pattern 13: Modified Binary Search

**Use Case**: Binary search variations for complex scenarios.

**When to Use**:
- Search in rotated sorted array
- Find minimum in rotated sorted array
- Search in infinite sorted array
- Find range (first and last position)

**Implementation (Python)**:
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

## Pattern 14: Dynamic Programming (Top-Down)

**Use Case**: Optimization problems with overlapping subproblems.

**When to Use**:
- Fibonacci, climbing stairs
- House robber
- Coin change
- Longest common subsequence
- 0/1 Knapsack

**Template (Memoization)**:
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

**Time Complexity**: Depends on problem (often O(n) or O(n²))
**Space Complexity**: O(n) for memoization + recursion stack

---

## Pattern 15: Dynamic Programming (Bottom-Up)

**Use Case**: Same as top-down, but iterative (often more efficient).

**Template (Tabulation)**:
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

**Space Optimization** (for Fibonacci):
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

## How to Choose the Right Pattern

Ask yourself:

1. **What's the input structure?**
   - Sorted array → Binary Search, Two Pointers
   - Linked list → Fast/Slow Pointers, In-place Reversal
   - Tree → BFS, DFS
   - Intervals → Merge Intervals

2. **What am I looking for?**
   - Subarray/substring → Sliding Window
   - Pairs/triplets → Two Pointers
   - All combinations → Backtracking
   - Optimal solution with choices → Dynamic Programming
   - Top k elements → Heap

3. **Are there constraints?**
   - Numbers in range [1, n] → Cyclic Sort
   - Need median → Two Heaps
   - In-place modification → Two Pointers, Cyclic Sort

4. **What's the time complexity requirement?**
   - O(log n) → Binary Search
   - O(n) → Two Pointers, Sliding Window, Hash Map
   - O(n log n) → Sorting, Heap
   - Exponential acceptable? → Backtracking, Recursion

---

**Practice Strategy**:
1. Master one pattern at a time
2. Solve 5-10 problems per pattern
3. Identify the pattern in new problems
4. Combine patterns for complex problems

**Common Pattern Combinations**:
- Two Pointers + Sliding Window
- Binary Search + DFS
- Dynamic Programming + Memoization
- Backtracking + Pruning
