#!/usr/bin/env python3
"""
Complexity Analyzer - Analyze time and space complexity of algorithms

Features:
- Parse code using AST
- Detect loops (nested, sequential)
- Identify recursion
- Analyze data structure operations
- Estimate Big-O complexity
- Suggest optimizations

Usage:
    python complexity_analyzer.py <file_path> [--function <function_name>]
"""

import argparse
import ast
import json
import os
import sys
from typing import Dict, List, Tuple


class ComplexityAnalyzer(ast.NodeVisitor):
    """Analyze time and space complexity of Python code."""

    def __init__(self, function_name=None):
        self.function_name = function_name
        self.results = {}
        self.current_function = None

    def visit_FunctionDef(self, node):
        """Analyze a function definition."""
        # Only analyze specific function if requested
        if self.function_name and node.name != self.function_name:
            return

        self.current_function = node.name

        analysis = {
            'name': node.name,
            'line': node.lineno,
            'time_complexity': 'O(1)',
            'space_complexity': 'O(1)',
            'loops': [],
            'recursion': False,
            'operations': [],
            'suggestions': []
        }

        # Analyze the function body
        loop_depth = self._analyze_loops(node)
        has_recursion = self._check_recursion(node)
        data_structure_ops = self._analyze_data_structures(node)

        # Determine time complexity
        if has_recursion:
            analysis['recursion'] = True
            recursion_type = self._classify_recursion(node)
            analysis['time_complexity'] = recursion_type
            analysis['suggestions'].append(
                "Recursive function - consider memoization or iterative approach"
            )
        elif loop_depth >= 3:
            analysis['time_complexity'] = f'O(n^{loop_depth})'
            analysis['suggestions'].append(
                f"Deep nesting ({loop_depth} levels) - consider optimization"
            )
        elif loop_depth == 2:
            analysis['time_complexity'] = 'O(n²)'
            analysis['suggestions'].append(
                "Nested loop detected - can this be optimized with hash map?"
            )
        elif loop_depth == 1:
            analysis['time_complexity'] = 'O(n)'

        # Adjust for data structure operations
        for op in data_structure_ops:
            if op['type'] == 'sort':
                if 'n²' not in analysis['time_complexity']:
                    analysis['time_complexity'] = 'O(n log n)'
            elif op['type'] == 'dict_lookup':
                analysis['operations'].append(op)
            elif op['type'] == 'list_search':
                if loop_depth == 0:
                    analysis['time_complexity'] = 'O(n)'

        # Analyze space complexity
        space = self._analyze_space_complexity(node)
        analysis['space_complexity'] = space

        self.results[node.name] = analysis
        self.generic_visit(node)

    def _analyze_loops(self, node, depth=0) -> int:
        """Calculate maximum loop nesting depth."""
        max_depth = depth

        for child in ast.walk(node):
            if isinstance(child, (ast.For, ast.While)):
                # Check if this is a direct child, not in a nested function
                if self._is_direct_child(node, child):
                    child_depth = self._analyze_loops(child, depth + 1)
                    max_depth = max(max_depth, child_depth)

        return max_depth

    def _is_direct_child(self, parent, child):
        """Check if child is a direct descendant (not in nested function)."""
        for node in ast.walk(parent):
            if node == child:
                return True
            if isinstance(node, ast.FunctionDef) and node != parent:
                # Stop if we hit another function definition
                return False
        return False

    def _check_recursion(self, node) -> bool:
        """Check if function is recursive."""
        function_name = node.name

        for child in ast.walk(node):
            if isinstance(child, ast.Call):
                if isinstance(child.func, ast.Name) and child.func.id == function_name:
                    return True
                # Check for indirect recursion via attribute
                if isinstance(child.func, ast.Attribute):
                    if child.func.attr == function_name:
                        return True

        return False

    def _classify_recursion(self, node) -> str:
        """Classify type of recursion for complexity estimation."""
        # Count recursive calls
        recursive_calls = 0
        function_name = node.name

        for child in ast.walk(node):
            if isinstance(child, ast.Call):
                if isinstance(child.func, ast.Name) and child.func.id == function_name:
                    recursive_calls += 1

        if recursive_calls == 1:
            # Linear recursion (e.g., factorial)
            return 'O(n)'
        elif recursive_calls == 2:
            # Binary recursion (e.g., fibonacci)
            return 'O(2^n)'
        else:
            return 'O(recursive)'

    def _analyze_data_structures(self, node) -> List[Dict]:
        """Analyze data structure operations."""
        operations = []

        for child in ast.walk(node):
            # Sorting
            if isinstance(child, ast.Call):
                if isinstance(child.func, ast.Attribute):
                    if child.func.attr == 'sort':
                        operations.append({'type': 'sort', 'line': child.lineno})
                elif isinstance(child.func, ast.Name):
                    if child.func.id == 'sorted':
                        operations.append({'type': 'sort', 'line': child.lineno})

            # Dictionary/set operations (O(1) average)
            if isinstance(child, ast.Subscript):
                if isinstance(child.value, (ast.Dict, ast.Set)):
                    operations.append({'type': 'dict_lookup', 'line': child.lineno})

            # List search operations (O(n))
            if isinstance(child, ast.Compare):
                if any(isinstance(op, ast.In) for op in child.ops):
                    operations.append({'type': 'list_search', 'line': child.lineno})

        return operations

    def _analyze_space_complexity(self, node) -> str:
        """Estimate space complexity."""
        # Check for list comprehensions, array creation
        has_array_creation = False
        has_recursion = self._check_recursion(node)

        for child in ast.walk(node):
            # List comprehension or list creation
            if isinstance(child, (ast.ListComp, ast.List)):
                has_array_creation = True

            # Dictionary comprehension
            if isinstance(child, (ast.DictComp, ast.Dict)):
                has_array_creation = True

        if has_recursion:
            # Recursion uses call stack
            return 'O(n) - call stack'
        elif has_array_creation:
            return 'O(n) - auxiliary space'
        else:
            return 'O(1)'


def format_output(results, output_format='text'):
    """Format analysis results."""
    if output_format == 'json':
        print(json.dumps(results, indent=2))
    else:
        print("\n" + "=" * 60)
        print("COMPLEXITY ANALYSIS")
        print("=" * 60 + "\n")

        for func_name, analysis in results.items():
            print(f"Function: {func_name} (line {analysis['line']})")
            print(f"  Time Complexity:  {analysis['time_complexity']}")
            print(f"  Space Complexity: {analysis['space_complexity']}")

            if analysis['recursion']:
                print(f"  Recursion: Yes")

            if analysis['operations']:
                print(f"  Operations:")
                for op in analysis['operations']:
                    print(f"    - {op['type']} at line {op['line']}")

            if analysis['suggestions']:
                print(f"  Suggestions:")
                for suggestion in analysis['suggestions']:
                    print(f"    → {suggestion}")

            print()


def analyze_file(filepath, function_name=None, output_format='text'):
    """Analyze a Python file."""
    if not os.path.exists(filepath):
        print(f"Error: File '{filepath}' not found", file=sys.stderr)
        sys.exit(1)

    with open(filepath, 'r', encoding='utf-8') as f:
        code = f.read()

    try:
        tree = ast.parse(code)
    except SyntaxError as e:
        print(f"Syntax error in file: {e}", file=sys.stderr)
        sys.exit(1)

    analyzer = ComplexityAnalyzer(function_name)
    analyzer.visit(tree)

    if not analyzer.results:
        if function_name:
            print(f"Error: Function '{function_name}' not found", file=sys.stderr)
        else:
            print("No functions found in file", file=sys.stderr)
        sys.exit(1)

    format_output(analyzer.results, output_format)


def analyze_code_snippet(code, output_format='text'):
    """Analyze a code snippet."""
    try:
        tree = ast.parse(code)
    except SyntaxError as e:
        print(f"Syntax error: {e}", file=sys.stderr)
        sys.exit(1)

    analyzer = ComplexityAnalyzer()
    analyzer.visit(tree)

    format_output(analyzer.results, output_format)


def main():
    parser = argparse.ArgumentParser(
        description='Analyze time and space complexity of code'
    )
    parser.add_argument('file', help='Python file to analyze')
    parser.add_argument('--function', help='Specific function to analyze')
    parser.add_argument('--format', choices=['text', 'json'], default='text',
                        help='Output format (default: text)')

    args = parser.parse_args()

    analyze_file(args.file, args.function, args.format)


if __name__ == '__main__':
    main()
