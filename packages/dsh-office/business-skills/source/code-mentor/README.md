# Code Mentor - AI Programming Tutor

A comprehensive OpenClaw skill for learning programming through interactive teaching, code review, debugging guidance, and hands-on practice.

## Features

### 🎓 8 Teaching Modes

1. **Concept Learning** - Learn programming concepts with progressive examples
2. **Code Review & Refactoring** - Get feedback on your code with guided improvements
3. **Debugging Detective** - Learn to debug using the Socratic method (no direct answers!)
4. **Algorithm Practice** - Master data structures and algorithms
5. **Project Guidance** - Design and build projects with architectural guidance
6. **Design Patterns** - Learn when and how to apply design patterns
7. **Interview Preparation** - Practice coding interviews and system design
8. **Language Learning** - Learn new languages by mapping from familiar ones

### 📚 Comprehensive References

- **Algorithms**: 15+ common patterns (Two Pointers, Sliding Window, DFS/BFS, DP, etc.)
- **Data Structures**: Arrays, strings, trees, graphs, heaps
- **Design Patterns**: Creational, structural, behavioral patterns with examples
- **Languages**: Python and JavaScript quick references
- **Best Practices**: Clean code, SOLID principles, testing strategies

### 🛠️ Utility Scripts

- **`analyze_code.py`**: Static code analysis for bugs, style, complexity, security
- **`run_tests.py`**: Execute tests with formatted output (pytest, unittest, jest)
- **`complexity_analyzer.py`**: Analyze time/space complexity with Big-O notation

## Installation

### Requirements

```bash
# For script functionality (optional)
pip install -r requirements.txt
```

The skill works perfectly without scripts - they're optional enhancements!

## Usage

### Quick Start

Activate the skill and tell it:

1. Your experience level (Beginner/Intermediate/Advanced)
2. What you want to learn or work on
3. Your preferred learning style

**Examples**:

```
"I'm a beginner, teach me Python basics"
"Help me debug this code" [paste code]
"Give me a medium algorithm problem"
"Review my implementation" [attach file]
"I want to build a REST API"
```

### Teaching Modes

#### Mode 1: Concept Learning
```
"Teach me about recursion"
"Explain how closures work in JavaScript"
"What is dynamic programming?"
```

#### Mode 2: Code Review
```
"Review my code" [paste or attach file]
"How can I improve this function?"
"Is this following best practices?"
```

#### Mode 3: Debugging (Socratic Method)
```
"Help me debug this error"
"My function returns None instead of the sum"
"Why isn't this loop working?"
```

The mentor will guide you with questions to help you discover the bug yourself!

#### Mode 4: Algorithm Practice
```
"Give me an easy algorithm problem"
"Practice with linked lists"
"LeetCode-style medium problem"
```

#### Mode 5: Project Guidance
```
"Help me design a task management API"
"I'm building a blog, where do I start?"
"What technology stack should I use?"
```

#### Mode 6: Design Patterns
```
"Teach me the Singleton pattern"
"When should I use Factory pattern?"
"Show me the Observer pattern in action"
```

#### Mode 7: Interview Prep
```
"Mock technical interview"
"System design: design Twitter"
"Practice arrays and strings"
```

#### Mode 8: Language Learning
```
"I know Python, teach me JavaScript"
"How do I do X in Rust?"
"Compare Python and Java"
```

## Using the Scripts

### Code Analyzer

Analyzes code for bugs, style violations, complexity, and security issues.

```bash
# Analyze a Python file
python scripts/analyze_code.py mycode.py

# Get JSON output
python scripts/analyze_code.py mycode.py --format json

# Analyze JavaScript
python scripts/analyze_code.py app.js
```

**Output includes**:
- Metrics (lines, comments, complexity)
- Issues by severity (critical, warning, info)
- Specific suggestions for improvement

### Test Runner

Run tests with formatted output.

```bash
# Auto-detect framework
python scripts/run_tests.py tests/

# Specify framework
python scripts/run_tests.py tests/ --framework pytest

# JSON output
python scripts/run_tests.py tests/ --format json
```

**Supports**:
- pytest (Python)
- unittest (Python)
- Jest (JavaScript)

### Complexity Analyzer

Analyze time and space complexity.

```bash
# Analyze all functions
python scripts/complexity_analyzer.py algorithm.py

# Analyze specific function
python scripts/complexity_analyzer.py algorithm.py --function bubble_sort

# JSON output
python scripts/complexity_analyzer.py algorithm.py --format json
```

**Output includes**:
- Time complexity (Big-O notation)
- Space complexity
- Recursion detection
- Optimization suggestions

## Directory Structure

```
code-mentor-1.0.0/
├── SKILL.md                    # Main skill definition
├── README.md                   # This file
├── requirements.txt            # Python dependencies
│
├── references/                 # Knowledge base
│   ├── algorithms/
│   │   └── common-patterns.md  # 15+ algorithm patterns
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
│       └── learning_log.md     # Auto-updated with your progress
│
└── scripts/                    # Utility scripts
    ├── analyze_code.py
    ├── run_tests.py
    └── complexity_analyzer.py
```

## Progress Tracking

Your learning progress is automatically saved to `references/user-progress/learning_log.md` after each session. This includes:
- Topics covered and concepts mastered
- Algorithm problems solved
- Skills practiced and modes used
- Important insights and breakthroughs
- Areas that need more review

Your progress persists across sessions, so you can pick up where you left off!

## Learning Approach

### Socratic Method (Debugging)

The mentor **never gives direct answers** when debugging. Instead:

1. **Observation**: "What did you expect vs what happened?"
2. **Localization**: "Where might the problem be?"
3. **Hypothesis**: "Why do you think it's failing?"
4. **Testing**: "How can you test that?"
5. **Solution**: "What would fix it?"

This teaches you to debug independently!

### Progressive Hints (Algorithms)

When practicing algorithms:

1. **Nudge**: "Think about solving this manually"
2. **Direction**: "Consider using a hash map..."
3. **Structure**: "Here's the general approach..."
4. **Skeleton**: "Here's a template to fill in..."
5. **Solution**: Full solution with explanation (only if needed)

### Adaptive Difficulty

The mentor adjusts based on your level:

- **Beginner**: Clear explanations, simple examples, more guidance
- **Intermediate**: Best practices, challenging problems, less hand-holding
- **Advanced**: Architecture, optimization, complex scenarios

## Examples

### Example 1: Learning a Concept

```
You: "Teach me about list comprehensions in Python"

Mentor: Let's explore list comprehensions! They're a concise way to create
lists. Here's a traditional loop:

squares = []
for x in range(10):
    squares.append(x ** 2)

Here's the same thing as a list comprehension:

squares = [x ** 2 for x in range(10)]

What do you notice about the syntax?
[Interactive discussion follows...]
```

### Example 2: Debugging (Socratic)

```
You: "My function returns None instead of the sum!"

Mentor: Let's investigate. What did you expect the function to return?

You: "The sum of numbers in the list"

Mentor: Good. Can you trace through the first iteration? What happens
to the sum variable?

[Guides you to discover the missing return statement]
```

### Example 3: Code Review

```
You: [Submits code with nested loops]

Mentor: I see an opportunity for optimization. What's the time complexity
of this nested loop?

You: "O(n²)"

Mentor: Exactly. For each element, you're checking every other element.
Can you think of a data structure that offers O(1) lookup?

[Guides refactoring to use hash map]
```

## Tips for Effective Learning

1. **Practice regularly** - Consistency beats cramming
2. **Struggle first** - Try to solve problems before asking for hints
3. **Ask questions** - The mentor encourages curiosity
4. **Build projects** - Apply what you learn in real code
5. **Review your work** - Use code review mode to improve
6. **Test your code** - Write tests as you learn

## Supported Languages

**Primary focus**: Python, JavaScript, TypeScript

**Also supported**: Java, C++, Go, Rust, C#, Ruby, PHP, Swift, Kotlin, and more!

## Troubleshooting

### Scripts not working?

Install dependencies:
```bash
pip install -r requirements.txt
```

For JavaScript testing (Jest):
```bash
npm install --save-dev jest
```

### Can't find a reference?

References are organized by category:
- Algorithms: `references/algorithms/`
- Data structures: `references/data-structures/`
- Design patterns: `references/design-patterns/`
- Languages: `references/languages/`
- Best practices: `references/best-practices/`

### Skill not understanding your request?

Try being more specific:
- "Teach me about [concept]"
- "Give me a [difficulty] problem on [topic]"
- "Review my [language] code"
- "Help me debug this [error]"

## Contributing

Want to add more references or improve the skill?

1. Add new algorithms to `references/algorithms/`
2. Add language references to `references/languages/`
3. Contribute design patterns to `references/design-patterns/`
4. Enhance scripts with new features

## License

MIT License - Feel free to use and modify!

## Acknowledgments

Built with OpenClaw framework for creating educational AI skills.

---

**Happy Learning!** 🚀

Remember: The best way to learn programming is by doing. This mentor is here to guide you, challenge you, and help you discover solutions on your own. Struggle is part of learning—embrace it!
