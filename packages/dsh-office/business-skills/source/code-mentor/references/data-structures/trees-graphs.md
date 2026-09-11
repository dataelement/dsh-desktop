# Trees & Graphs Reference

## Binary Trees

### Core Concepts

A **binary tree** is a hierarchical data structure where each node has at most two children (left and right).

**Key Properties**:
- Each node has at most 2 children
- Root node has no parent
- Leaf nodes have no children
- Height: longest path from root to leaf
- Depth: distance from root to node

**Types of Binary Trees**:
- **Full**: Every node has 0 or 2 children
- **Complete**: All levels filled except possibly last, which fills left to right
- **Perfect**: All internal nodes have 2 children, all leaves at same level
- **Balanced**: Height difference between left and right subtrees ≤ 1

### Node Structure

**Python**:
```python
class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right
```

**JavaScript**:
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

## Tree Traversals

### 1. Depth-First Search (DFS)

#### Inorder (Left → Root → Right)
**Use**: BST gives sorted order
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

#### Preorder (Root → Left → Right)
**Use**: Copy tree, prefix expressions
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

#### Postorder (Left → Right → Root)
**Use**: Delete tree, postfix expressions
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

### 2. Breadth-First Search (BFS)

**Use**: Level-order traversal, shortest path in unweighted tree
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

**Time**: O(n), **Space**: O(w) where w is max width

---

## Binary Search Tree (BST)

### Properties
- Left subtree values < node value
- Right subtree values > node value
- Both subtrees are also BSTs
- Inorder traversal gives sorted sequence

### Common Operations

#### Search
```python
def search_bst(root, val):
    if not root or root.val == val:
        return root

    if val < root.val:
        return search_bst(root.left, val)
    return search_bst(root.right, val)
```
**Time**: O(h) where h is height (O(log n) balanced, O(n) worst)

#### Insert
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

#### Delete
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

## Common Tree Algorithms

### 1. Height/Depth of Tree
```python
def max_depth(root):
    if not root:
        return 0
    return 1 + max(max_depth(root.left), max_depth(root.right))
```

### 2. Balanced Tree Check
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

### 3. Lowest Common Ancestor (BST)
```python
def lowest_common_ancestor_bst(root, p, q):
    if p.val < root.val and q.val < root.val:
        return lowest_common_ancestor_bst(root.left, p, q)
    if p.val > root.val and q.val > root.val:
        return lowest_common_ancestor_bst(root.right, p, q)
    return root
```

### 4. Diameter of Binary Tree
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

### 5. Serialize and Deserialize
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

## Graphs

### Core Concepts

A **graph** is a collection of nodes (vertices) connected by edges.

**Types**:
- **Directed** vs **Undirected**: Edges have direction or not
- **Weighted** vs **Unweighted**: Edges have weights or not
- **Cyclic** vs **Acyclic**: Contains cycles or not
- **Connected** vs **Disconnected**: Path exists between all nodes or not

### Representations

#### 1. Adjacency List (Most Common)
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

**Space**: O(V + E)

#### 2. Adjacency Matrix
```python
# graph[i][j] = 1 if edge from i to j exists
n = 5  # number of vertices
graph = [[0] * n for _ in range(n)]
graph[0][1] = 1  # Edge from 0 to 1
graph[1][0] = 1  # Edge from 1 to 0 (undirected)
```

**Space**: O(V²)

---

## Graph Traversals

### 1. Depth-First Search (DFS)

**Recursive**:
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

**Iterative** (using stack):
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

**Time**: O(V + E), **Space**: O(V)

### 2. Breadth-First Search (BFS)

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

**Time**: O(V + E), **Space**: O(V)

---

## Common Graph Algorithms

### 1. Cycle Detection (Undirected Graph)
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

### 2. Cycle Detection (Directed Graph)
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

### 3. Topological Sort (DAG)
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

**Time**: O(V + E)

### 4. Shortest Path (Unweighted - BFS)
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

### 5. Dijkstra's Algorithm (Weighted Graph)
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

**Time**: O((V + E) log V) with min heap

### 6. Union-Find (Disjoint Set)
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

**Use**: Cycle detection, Kruskal's MST, connected components

---

## Common Graph Problems

### 1. Number of Islands
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

### 2. Course Schedule (Cycle Detection)
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

### 3. Clone Graph
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

## When to Use What

**Tree Traversal**:
- **DFS (Inorder)**: BST → sorted order
- **DFS (Preorder)**: Copy tree, prefix notation
- **DFS (Postorder)**: Delete tree, postfix notation
- **BFS**: Level-order, shortest path

**Graph Traversal**:
- **DFS**: Cycle detection, topological sort, connected components
- **BFS**: Shortest path (unweighted), level-wise exploration

**Shortest Path**:
- **BFS**: Unweighted graphs
- **Dijkstra**: Weighted graphs (non-negative weights)
- **Bellman-Ford**: Weighted graphs (can have negative weights)
- **Floyd-Warshall**: All-pairs shortest path

**Tree/Graph Choice**:
- **Adjacency List**: Sparse graphs (E << V²)
- **Adjacency Matrix**: Dense graphs, quick edge lookup
