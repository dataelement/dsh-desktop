# 树与图参考

## 二叉树

### 核心概念

**二叉树**是一种层级数据结构，每个节点最多有两个子节点（左子节点和右子节点）。

**关键属性**：
- 每个节点最多有 2 个子节点
- 根节点没有父节点
- 叶子节点没有子节点
- 高度：从根到叶子的最长路径
- 深度：从根到某节点的距离

**二叉树的类型**：
- **满二叉树**：每个节点有 0 或 2 个子节点
- **完全二叉树**：除最后一层外所有层都填满，最后一层从左到右填充
- **完美二叉树**：所有内部节点都有 2 个子节点，所有叶子在同一层
- **平衡二叉树**：左右子树的高度差 ≤ 1

### 节点结构

**Python**：
```python
class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right
```

**JavaScript**：
```javascript
class TreeNode {
    constructor(val = 0, left = null, right = null) {
        this.val = val;
        this.left = left;
        this.right = right;
    }
}
```

---

## 树的遍历

### 1. 深度优先搜索（DFS）

#### 中序遍历（左 → 根 → 右）
**用途**：BST 可得到有序序列
```python
def inorder(root):
    result = []

    def traverse(node):
        if not node:
            return
        traverse(node.left)
        result.append(node.val)
        traverse(node.right)

    traverse(root)
    return result
```

#### 前序遍历（根 → 左 → 右）
**用途**：复制树、前缀表达式
```python
def preorder(root):
    result = []

    def traverse(node):
        if not node:
            return
        result.append(node.val)
        traverse(node.left)
        traverse(node.right)

    traverse(root)
    return result
```

#### 后序遍历（左 → 右 → 根）
**用途**：删除树、后缀表达式
```python
def postorder(root):
    result = []

    def traverse(node):
        if not node:
            return
        traverse(node.left)
        traverse(node.right)
        result.append(node.val)

    traverse(root)
    return result
```

### 2. 广度优先搜索（BFS）

**用途**：层序遍历、无权树中的最短路径
```python
from collections import deque

def level_order(root):
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

**时间复杂度**：O(n)，**空间复杂度**：O(w)，其中 w 为最大宽度

---

## 二叉搜索树（BST）

### 属性
- 左子树的值 < 节点值
- 右子树的值 > 节点值
- 左右子树也都是 BST
- 中序遍历得到有序序列

### 常见操作

#### 查找
```python
def search_bst(root, val):
    if not root or root.val == val:
        return root

    if val < root.val:
        return search_bst(root.left, val)
    return search_bst(root.right, val)
```
**时间复杂度**：O(h)，h 为高度（平衡时 O(log n)，最坏 O(n)）

#### 插入
```python
def insert_bst(root, val):
    if not root:
        return TreeNode(val)

    if val < root.val:
        root.left = insert_bst(root.left, val)
    else:
        root.right = insert_bst(root.right, val)

    return root
```

#### 删除
```python
def delete_bst(root, val):
    if not root:
        return None

    if val < root.val:
        root.left = delete_bst(root.left, val)
    elif val > root.val:
        root.right = delete_bst(root.right, val)
    else:
        # Node to delete found
        # Case 1: No children
        if not root.left and not root.right:
            return None

        # Case 2: One child
        if not root.left:
            return root.right
        if not root.right:
            return root.left

        # Case 3: Two children
        # Find inorder successor (min in right subtree)
        min_node = find_min(root.right)
        root.val = min_node.val
        root.right = delete_bst(root.right, min_node.val)

    return root

def find_min(node):
    while node.left:
        node = node.left
    return node
```

---

## 常见树算法

### 1. 树的高度/深度
```python
def max_depth(root):
    if not root:
        return 0
    return 1 + max(max_depth(root.left), max_depth(root.right))
```

### 2. 平衡树检查
```python
def is_balanced(root):
    def height(node):
        if not node:
            return 0

        left_height = height(node.left)
        if left_height == -1:
            return -1

        right_height = height(node.right)
        if right_height == -1:
            return -1

        if abs(left_height - right_height) > 1:
            return -1

        return 1 + max(left_height, right_height)

    return height(root) != -1
```

### 3. 最近公共祖先（BST）
```python
def lowest_common_ancestor_bst(root, p, q):
    if p.val < root.val and q.val < root.val:
        return lowest_common_ancestor_bst(root.left, p, q)
    if p.val > root.val and q.val > root.val:
        return lowest_common_ancestor_bst(root.right, p, q)
    return root
```

### 4. 二叉树的直径
```python
def diameter_of_binary_tree(root):
    diameter = 0

    def height(node):
        nonlocal diameter
        if not node:
            return 0

        left = height(node.left)
        right = height(node.right)

        diameter = max(diameter, left + right)
        return 1 + max(left, right)

    height(root)
    return diameter
```

### 5. 序列化与反序列化
```python
def serialize(root):
    """Encode tree to string."""
    def helper(node):
        if not node:
            return 'null,'
        return str(node.val) + ',' + helper(node.left) + helper(node.right)

    return helper(root)

def deserialize(data):
    """Decode string to tree."""
    def helper(nodes):
        val = next(nodes)
        if val == 'null':
            return None
        node = TreeNode(int(val))
        node.left = helper(nodes)
        node.right = helper(nodes)
        return node

    return helper(iter(data.split(',')))
```

---

## 图

### 核心概念

**图**是由节点（顶点）和边组成的集合。

**类型**：
- **有向图** vs **无向图**：边是否有方向
- **加权图** vs **无权图**：边是否有权重
- **有环图** vs **无环图**：是否包含环
- **连通图** vs **非连通图**：所有节点之间是否都有路径

### 表示方法

#### 1. 邻接表（最常用）
```python
# Undirected graph
graph = {
    'A': ['B', 'C'],
    'B': ['A', 'D', 'E'],
    'C': ['A', 'F'],
    'D': ['B'],
    'E': ['B', 'F'],
    'F': ['C', 'E']
}

# Or using defaultdict
from collections import defaultdict
graph = defaultdict(list)
graph['A'].append('B')
graph['B'].append('A')
```

**空间复杂度**：O(V + E)

#### 2. 邻接矩阵
```python
# graph[i][j] = 1 if edge from i to j exists
n = 5  # number of vertices
graph = [[0] * n for _ in range(n)]
graph[0][1] = 1  # Edge from 0 to 1
graph[1][0] = 1  # Edge from 1 to 0 (undirected)
```

**空间复杂度**：O(V²)

---

## 图的遍历

### 1. 深度优先搜索（DFS）

**递归实现**：
```python
def dfs(graph, start, visited=None):
    if visited is None:
        visited = set()

    visited.add(start)
    print(start)

    for neighbor in graph[start]:
        if neighbor not in visited:
            dfs(graph, neighbor, visited)

    return visited
```

**迭代实现**（使用栈）：
```python
def dfs_iterative(graph, start):
    visited = set()
    stack = [start]

    while stack:
        node = stack.pop()

        if node not in visited:
            visited.add(node)
            print(node)

            for neighbor in graph[node]:
                if neighbor not in visited:
                    stack.append(neighbor)

    return visited
```

**时间复杂度**：O(V + E)，**空间复杂度**：O(V)

### 2. 广度优先搜索（BFS）

```python
from collections import deque

def bfs(graph, start):
    visited = set([start])
    queue = deque([start])

    while queue:
        node = queue.popleft()
        print(node)

        for neighbor in graph[node]:
            if neighbor not in visited:
                visited.add(neighbor)
                queue.append(neighbor)

    return visited
```

**时间复杂度**：O(V + E)，**空间复杂度**：O(V)

---

## 常见图算法

### 1. 环检测（无向图）
```python
def has_cycle(graph):
    visited = set()

    def dfs(node, parent):
        visited.add(node)

        for neighbor in graph[node]:
            if neighbor not in visited:
                if dfs(neighbor, node):
                    return True
            elif neighbor != parent:
                return True  # Cycle found

        return False

    for node in graph:
        if node not in visited:
            if dfs(node, None):
                return True

    return False
```

### 2. 环检测（有向图）
```python
def has_cycle_directed(graph):
    WHITE, GRAY, BLACK = 0, 1, 2
    color = {node: WHITE for node in graph}

    def dfs(node):
        color[node] = GRAY

        for neighbor in graph[node]:
            if color[neighbor] == GRAY:
                return True  # Back edge found
            if color[neighbor] == WHITE and dfs(neighbor):
                return True

        color[node] = BLACK
        return False

    for node in graph:
        if color[node] == WHITE:
            if dfs(node):
                return True

    return False
```

### 3. 拓扑排序（DAG）
```python
def topological_sort(graph):
    visited = set()
    stack = []

    def dfs(node):
        visited.add(node)

        for neighbor in graph[node]:
            if neighbor not in visited:
                dfs(neighbor)

        stack.append(node)

    for node in graph:
        if node not in visited:
            dfs(node)

    return stack[::-1]  # Reverse
```

**时间复杂度**：O(V + E)

### 4. 最短路径（无权图 - BFS）
```python
from collections import deque

def shortest_path_bfs(graph, start, end):
    queue = deque([(start, [start])])
    visited = set([start])

    while queue:
        node, path = queue.popleft()

        if node == end:
            return path

        for neighbor in graph[node]:
            if neighbor not in visited:
                visited.add(neighbor)
                queue.append((neighbor, path + [neighbor]))

    return None  # No path found
```

### 5. Dijkstra 算法（加权图）
```python
import heapq

def dijkstra(graph, start):
    """Find shortest paths from start to all nodes."""
    distances = {node: float('inf') for node in graph}
    distances[start] = 0
    pq = [(0, start)]  # (distance, node)

    while pq:
        current_dist, current_node = heapq.heappop(pq)

        if current_dist > distances[current_node]:
            continue

        for neighbor, weight in graph[current_node]:
            distance = current_dist + weight

            if distance < distances[neighbor]:
                distances[neighbor] = distance
                heapq.heappush(pq, (distance, neighbor))

    return distances
```

**时间复杂度**：使用最小堆时 O((V + E) log V)

### 6. 并查集（不相交集合）
```python
class UnionFind:
    def __init__(self, n):
        self.parent = list(range(n))
        self.rank = [0] * n

    def find(self, x):
        if self.parent[x] != x:
            self.parent[x] = self.find(self.parent[x])  # Path compression
        return self.parent[x]

    def union(self, x, y):
        root_x = self.find(x)
        root_y = self.find(y)

        if root_x == root_y:
            return False

        # Union by rank
        if self.rank[root_x] < self.rank[root_y]:
            self.parent[root_x] = root_y
        elif self.rank[root_x] > self.rank[root_y]:
            self.parent[root_y] = root_x
        else:
            self.parent[root_y] = root_x
            self.rank[root_x] += 1

        return True
```

**用途**：环检测、Kruskal 最小生成树、连通分量

---

## 常见图问题

### 1. 岛屿数量
```python
def num_islands(grid):
    if not grid:
        return 0

    count = 0
    rows, cols = len(grid), len(grid[0])

    def dfs(r, c):
        if (r < 0 or r >= rows or c < 0 or c >= cols or
            grid[r][c] == '0'):
            return

        grid[r][c] = '0'  # Mark as visited
        dfs(r + 1, c)
        dfs(r - 1, c)
        dfs(r, c + 1)
        dfs(r, c - 1)

    for r in range(rows):
        for c in range(cols):
            if grid[r][c] == '1':
                count += 1
                dfs(r, c)

    return count
```

### 2. 课程表（环检测）
```python
def can_finish(num_courses, prerequisites):
    graph = defaultdict(list)
    for course, prereq in prerequisites:
        graph[course].append(prereq)

    WHITE, GRAY, BLACK = 0, 1, 2
    color = [WHITE] * num_courses

    def has_cycle(course):
        color[course] = GRAY

        for prereq in graph[course]:
            if color[prereq] == GRAY:
                return True
            if color[prereq] == WHITE and has_cycle(prereq):
                return True

        color[course] = BLACK
        return False

    for course in range(num_courses):
        if color[course] == WHITE:
            if has_cycle(course):
                return False

    return True
```

### 3. 克隆图
```python
def clone_graph(node):
    if not node:
        return None

    clones = {}

    def dfs(node):
        if node in clones:
            return clones[node]

        clone = Node(node.val)
        clones[node] = clone

        for neighbor in node.neighbors:
            clone.neighbors.append(dfs(neighbor))

        return clone

    return dfs(node)
```

---

## 如何选择合适的方法

**树遍历**：
- **DFS（中序）**：BST → 有序序列
- **DFS（前序）**：复制树、前缀表示
- **DFS（后序）**：删除树、后缀表示
- **BFS**：层序遍历、最短路径

**图遍历**：
- **DFS**：环检测、拓扑排序、连通分量
- **BFS**：最短路径（无权图）、按层探索

**最短路径**：
- **BFS**：无权图
- **Dijkstra**：加权图（非负权重）
- **Bellman-Ford**：加权图（可以有负权重）
- **Floyd-Warshall**：全源最短路径

**数据结构选择**：
- **邻接表**：稀疏图（E << V²）
- **邻接矩阵**：稠密图、快速边查询
