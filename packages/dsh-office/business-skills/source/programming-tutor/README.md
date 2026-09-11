# 编程导师 - AI 编程辅导老师

一个用于通过互动教学、代码审查、调试指导和动手实践来学习编程的综合性 skill。

## 功能特性

### 🎓 8 种教学模式

1. **概念学习** - 通过渐进式示例学习编程概念
2. **代码审查与重构** - 获取代码反馈和引导式改进
3. **调试侦探** - 使用苏格拉底式教学法学习调试（不直接给答案！）
4. **算法练习** - 掌握数据结构和算法
5. **项目指导** - 带有架构指导的项目设计与构建
6. **设计模式** - 学习何时以及如何应用设计模式
7. **面试准备** - 练习编程面试和系统设计
8. **语言学习** - 从已知语言映射来学习新语言

### 📚 全面的参考材料

- **算法**：15+ 种常见模式（双指针、滑动窗口、DFS/BFS、动态规划等）
- **数据结构**：数组、字符串、树、图、堆
- **设计模式**：创建型、结构型、行为型模式及示例
- **编程语言**：Python 和 JavaScript 快速参考
- **最佳实践**：整洁代码、SOLID 原则、测试策略

### 🛠️ 实用脚本

- **`analyze_code.py`**：静态代码分析，检查 bug、风格、复杂度、安全问题
- **`run_tests.py`**：执行测试并格式化输出（pytest、unittest、jest）
- **`complexity_analyzer.py`**：分析时间/空间复杂度，使用大 O 表示法

## 安装

### 环境要求

```bash
# 用于脚本功能（可选）
pip install -r requirements.txt
```

没有脚本 skill 也能完美运行——它们只是可选增强！

## 使用方法

### 快速开始

激活 skill 后告诉它：

1. 你的经验水平（初学者/中级/高级）
2. 你想学什么或做什么
3. 你偏好的学习方式

**示例**：

```
"我是初学者，教我 Python 基础"
"帮我调试这段代码" [粘贴代码]
"给我一道中等难度的算法题"
"审查我的实现" [附上文件]
"我想构建一个 REST API"
```

### 教学模式

#### 模式一：概念学习
```
"教我递归"
"解释 JavaScript 中闭包是怎么工作的"
"什么是动态规划？"
```

#### 模式二：代码审查
```
"审查我的代码" [粘贴或附上文件]
"怎么改进这个函数？"
"这符合最佳实践吗？"
```

#### 模式三：调试（苏格拉底式教学法）
```
"帮我调试这个错误"
"我的函数返回 None 而不是求和结果"
"为什么这个循环不工作？"
```

导师会通过提问引导你自己发现 bug！

#### 模式四：算法练习
```
"给我一道简单的算法题"
"用链表做练习"
"LeetCode 风格的中等难度题目"
```

#### 模式五：项目指导
```
"帮我设计一个任务管理 API"
"我要做一个博客，从哪里开始？"
"我应该用什么技术栈？"
```

#### 模式六：设计模式
```
"教我单例模式"
"什么时候该用工厂模式？"
"演示一下观察者模式的实际应用"
```

#### 模式七：面试准备
```
"模拟技术面试"
"系统设计：设计一个推特"
"练习数组和字符串题目"
```

#### 模式八：语言学习
```
"我会 Python，教我 JavaScript"
"在 Rust 中怎么做 X？"
"对比 Python 和 Java"
```

## 使用脚本

### 代码分析器

分析代码中的 bug、风格问题、复杂度和安全问题。

```bash
# 分析 Python 文件
python scripts/analyze_code.py mycode.py

# 获取 JSON 输出
python scripts/analyze_code.py mycode.py --format json

# 分析 JavaScript
python scripts/analyze_code.py app.js
```

**输出内容**：
- 代码指标（行数、注释、复杂度）
- 按严重程度分类的问题（严重、警告、提示）
- 具体的改进建议

### 测试运行器

运行测试并格式化输出。

```bash
# 自动检测框架
python scripts/run_tests.py tests/

# 指定框架
python scripts/run_tests.py tests/ --framework pytest

# JSON 输出
python scripts/run_tests.py tests/ --format json
```

**支持的框架**：
- pytest（Python）
- unittest（Python）
- Jest（JavaScript）

### 复杂度分析器

分析时间和空间复杂度。

```bash
# 分析所有函数
python scripts/complexity_analyzer.py algorithm.py

# 分析指定函数
python scripts/complexity_analyzer.py algorithm.py --function bubble_sort

# JSON 输出
python scripts/complexity_analyzer.py algorithm.py --format json
```

**输出内容**：
- 时间复杂度（大 O 表示法）
- 空间复杂度
- 递归检测
- 优化建议

## 目录结构

```
code-mentor-1.0.0/
├── SKILL.md                    # 主 skill 定义
├── README.md                   # 本文件
├── requirements.txt            # Python 依赖
│
├── references/                 # 知识库
│   ├── algorithms/
│   │   └── common-patterns.md  # 15+ 种算法模式
│   ├── data-structures/
│   │   ├── arrays-strings.md
│   │   └── trees-graphs.md
│   ├── design-patterns/
│   │   └── creational-patterns.md
│   ├── languages/
│   │   └── python-reference.md
│   ├── best-practices/
│   │   └── clean-code.md
│   └── user-progress/
│       └── learning_log.md     # 自动更新你的学习进度
│
└── scripts/                    # 实用脚本
    ├── analyze_code.py
    ├── run_tests.py
    └── complexity_analyzer.py
```

## 进度追踪

你的学习进度在每次会话后自动保存到 `references/user-progress/learning_log.md`。包括：
- 涵盖的主题和掌握的概念
- 已解决的算法题
- 练习的技能和使用的模式
- 重要的心得和突破
- 需要进一步复习的领域

你的进度跨会话保持，所以你可以从上次中断的地方继续！

## 学习方法

### 苏格拉底式教学法（调试）

导师**绝不直接给出答案**。相反：

1. **观察**："你期望什么结果 vs 实际发生了什么？"
2. **定位**："问题可能在哪里？"
3. **假设**："你觉得为什么会失败？"
4. **验证**："你怎么测试这个想法？"
5. **解决**："什么方法可以修复它？"

这教会你独立调试！

### 渐进式提示（算法）

练习算法时：

1. **轻推**："想想手动怎么解这道题"
2. **方向**："考虑用哈希表..."
3. **结构**："大致思路是这样的..."
4. **骨架**："这是一个需要填充的模板..."
5. **答案**：完整解答配讲解（仅在必要时）

### 自适应难度

导师根据你的水平调整：

- **初学者**：清晰的解释、简单的示例、更多引导
- **中级**：最佳实践、有挑战的问题、减少手把手指导
- **高级**：架构设计、性能优化、复杂场景

## 示例

### 示例 1：学习概念

```
你："教我 Python 中的列表推导式"

导师：让我们来探索列表推导式！它们是创建列表的简洁方式。
这是传统的循环写法：

squares = []
for x in range(10):
    squares.append(x ** 2)

这是同样功能的列表推导式：

squares = [x ** 2 for x in range(10)]

你注意到语法有什么特点吗？
[接下来是互动讨论...]
```

### 示例 2：调试（苏格拉底式）

```
你："我的函数返回 None 而不是求和结果！"

导师：让我们排查一下。你期望函数返回什么？

你："列表中数字的总和"

导师：好的。你能跟踪第一次迭代的执行过程吗？sum 变量
发生了什么？

[引导你发现缺少 return 语句]
```

### 示例 3：代码审查

```
你：[提交了包含嵌套循环的代码]

导师：我发现了一个优化机会。这个嵌套循环的时间复杂度是多少？

你："O(n²)"

导师：没错。对于每个元素，你都在检查其他所有元素。
你能想到一种 O(1) 查找的数据结构吗？

[引导重构为使用哈希表]
```

## 高效学习建议

1. **坚持练习** - 持续比集中突击更有效
2. **先自己挣扎** - 在请求提示之前先尝试解决问题
3. **多提问** - 导师鼓励好奇心
4. **做项目** - 在真实代码中应用所学
5. **审查自己的代码** - 使用代码审查模式来改进
6. **写测试** - 边学边写测试

## 支持的语言

**主要支持**：Python、JavaScript、TypeScript

**也支持**：Java、C++、Go、Rust、C#、Ruby、PHP、Swift、Kotlin 等！

## 故障排除

### 脚本不工作？

安装依赖：
```bash
pip install -r requirements.txt
```

用于 JavaScript 测试（Jest）：
```bash
npm install --save-dev jest
```

### 找不到参考材料？

参考材料按类别组织：
- 算法：`references/algorithms/`
- 数据结构：`references/data-structures/`
- 设计模式：`references/design-patterns/`
- 编程语言：`references/languages/`
- 最佳实践：`references/best-practices/`

### Skill 无法理解你的请求？

试着说得更具体：
- "教我 [概念]"
- "给我一道 [难度] 的 [主题] 题目"
- "审查我的 [语言] 代码"
- "帮我调试这个 [错误]"

## 贡献

想添加更多参考材料或改进 skill？

1. 在 `references/algorithms/` 中添加新算法
2. 在 `references/languages/` 中添加语言参考
3. 在 `references/design-patterns/` 中贡献设计模式
4. 为脚本添加新功能

## 许可证

MIT 许可证 - 可自由使用和修改！

## 致谢

基于 OpenClaw 框架构建的教育类 AI skill。

---

**祝学习愉快！** 🚀

记住：学习编程最好的方式就是动手实践。这位导师在这里引导你、挑战你，帮助你自己发现解决方案。困难是学习的一部分——拥抱它！
