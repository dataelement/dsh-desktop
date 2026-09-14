#!/usr/bin/env python3
"""
Code Analyzer - Static analysis tool for code review

Analyzes code for:
- Bugs and potential errors
- Style violations
- Complexity metrics
- Security issues
- Best practice violations

Supports: Python, JavaScript, Java, C++

Usage:
    python analyze_code.py <file_path>
    python analyze_code.py <file_path> --format json
"""

import argparse
import ast
import json
import os
import re
import sys
from pathlib import Path
from typing import List, Dict, Any


class CodeIssue:
    """Represents a code issue found during analysis."""

    def __init__(self, category, severity, line, message, suggestion=None):
        self.category = category  # bug, style, performance, security
        self.severity = severity  # critical, warning, info
        self.line = line
        self.message = message
        self.suggestion = suggestion

    def to_dict(self):
        return {
            'category': self.category,
            'severity': self.severity,
            'line': self.line,
            'message': self.message,
            'suggestion': self.suggestion
        }


class PythonAnalyzer:
    """Analyzer for Python code."""

    def __init__(self, code, filename):
        self.code = code
        self.filename = filename
        self.lines = code.split('\n')
        self.issues = []

    def analyze(self) -> List[CodeIssue]:
        """Run all analysis checks."""
        try:
            tree = ast.parse(self.code)
            self._check_syntax(tree)
        except SyntaxError as e:
            self.issues.append(CodeIssue(
                'bug', 'critical', e.lineno,
                f"Syntax error: {e.msg}"
            ))
            return self.issues

        self._check_style()
        self._check_complexity()
        self._check_best_practices()
        self._check_security()

        return self.issues

    def _check_syntax(self, tree):
        """Check for common syntax and logic issues."""
        for node in ast.walk(tree):
            # Check for bare except
            if isinstance(node, ast.ExceptHandler):
                if node.type is None:
                    self.issues.append(CodeIssue(
                        'style', 'warning', node.lineno,
                        "Bare except: clause catches all exceptions",
                        "Use specific exception types (e.g., except ValueError:)"
                    ))

            # Check for mutable default arguments
            if isinstance(node, ast.FunctionDef):
                for default in node.args.defaults:
                    if isinstance(default, (ast.List, ast.Dict, ast.Set)):
                        self.issues.append(CodeIssue(
                            'bug', 'warning', node.lineno,
                            f"Mutable default argument in function '{node.name}'",
                            "Use None as default and create mutable object inside function"
                        ))

    def _check_style(self):
        """Check PEP 8 style guidelines."""
        for i, line in enumerate(self.lines, 1):
            # Line too long
            if len(line) > 100:
                self.issues.append(CodeIssue(
                    'style', 'info', i,
                    f"Line too long ({len(line)} > 100 characters)"
                ))

            # Multiple statements on one line
            if ';' in line and not line.strip().startswith('#'):
                self.issues.append(CodeIssue(
                    'style', 'info', i,
                    "Multiple statements on one line (use semicolon)",
                    "Place each statement on its own line"
                ))

            # Trailing whitespace
            if line.endswith(' ') or line.endswith('\t'):
                self.issues.append(CodeIssue(
                    'style', 'info', i,
                    "Trailing whitespace"
                ))

    def _check_complexity(self):
        """Check for complexity issues."""
        try:
            tree = ast.parse(self.code)
        except:
            return

        for node in ast.walk(tree):
            if isinstance(node, ast.FunctionDef):
                # Count nested depth
                max_depth = self._calculate_nesting_depth(node)
                if max_depth > 4:
                    self.issues.append(CodeIssue(
                        'performance', 'warning', node.lineno,
                        f"Function '{node.name}' has deep nesting (depth {max_depth})",
                        "Consider extracting nested logic into separate functions"
                    ))

                # Count number of statements
                statements = sum(1 for _ in ast.walk(node))
                if statements > 50:
                    self.issues.append(CodeIssue(
                        'style', 'warning', node.lineno,
                        f"Function '{node.name}' is too long ({statements} statements)",
                        "Consider breaking into smaller functions"
                    ))

    def _calculate_nesting_depth(self, node, depth=0):
        """Calculate maximum nesting depth in a function."""
        max_depth = depth
        for child in ast.iter_child_nodes(node):
            if isinstance(child, (ast.If, ast.For, ast.While, ast.With)):
                child_depth = self._calculate_nesting_depth(child, depth + 1)
                max_depth = max(max_depth, child_depth)
        return max_depth

    def _check_best_practices(self):
        """Check for violations of best practices."""
        for i, line in enumerate(self.lines, 1):
            # Check for print statements in production code
            if re.search(r'\bprint\s*\(', line) and 'debug' not in line.lower():
                self.issues.append(CodeIssue(
                    'style', 'info', i,
                    "Print statement found - consider using logging",
                    "Use logging module instead of print for production code"
                ))

            # Check for == None instead of is None
            if re.search(r'==\s*None|None\s*==', line):
                self.issues.append(CodeIssue(
                    'style', 'info', i,
                    "Use 'is None' instead of '== None'"
                ))

            # Check for != None instead of is not None
            if re.search(r'!=\s*None|None\s*!=', line):
                self.issues.append(CodeIssue(
                    'style', 'info', i,
                    "Use 'is not None' instead of '!= None'"
                ))

    def _check_security(self):
        """Check for common security issues."""
        for i, line in enumerate(self.lines, 1):
            # SQL injection vulnerability
            if 'execute' in line and ('+' in line or '%' in line or 'format' in line):
                if 'SELECT' in line.upper() or 'INSERT' in line.upper():
                    self.issues.append(CodeIssue(
                        'security', 'critical', i,
                        "Potential SQL injection vulnerability",
                        "Use parameterized queries with placeholders"
                    ))

            # eval() usage
            if re.search(r'\beval\s*\(', line):
                self.issues.append(CodeIssue(
                    'security', 'critical', i,
                    "Use of eval() is dangerous",
                    "Avoid eval() - use ast.literal_eval() for safe evaluation"
                ))

            # Hard-coded passwords/secrets
            if re.search(r'password\s*=\s*["\']', line, re.IGNORECASE):
                self.issues.append(CodeIssue(
                    'security', 'critical', i,
                    "Potential hard-coded password",
                    "Use environment variables or secure configuration"
                ))


class JavaScriptAnalyzer:
    """Basic analyzer for JavaScript code."""

    def __init__(self, code, filename):
        self.code = code
        self.filename = filename
        self.lines = code.split('\n')
        self.issues = []

    def analyze(self) -> List[CodeIssue]:
        """Run all analysis checks."""
        self._check_style()
        self._check_best_practices()
        return self.issues

    def _check_style(self):
        """Check style guidelines."""
        for i, line in enumerate(self.lines, 1):
            # var instead of let/const
            if re.search(r'\bvar\s+', line):
                self.issues.append(CodeIssue(
                    'style', 'warning', i,
                    "Use 'let' or 'const' instead of 'var'",
                    "ES6+ recommends let/const for better scoping"
                ))

            # == instead of ===
            if '==' in line and '===' not in line and '!==' not in line:
                self.issues.append(CodeIssue(
                    'style', 'info', i,
                    "Use '===' instead of '==' for strict equality"
                ))

    def _check_best_practices(self):
        """Check JavaScript best practices."""
        for i, line in enumerate(self.lines, 1):
            # console.log in production
            if 'console.log' in line:
                self.issues.append(CodeIssue(
                    'style', 'info', i,
                    "console.log found - remove before production"
                ))


class CodeMetrics:
    """Calculate code metrics."""

    def __init__(self, code):
        self.code = code
        self.lines = code.split('\n')

    def calculate(self) -> Dict[str, Any]:
        """Calculate various metrics."""
        total_lines = len(self.lines)
        code_lines = sum(1 for line in self.lines if line.strip() and not line.strip().startswith('#'))
        comment_lines = sum(1 for line in self.lines if line.strip().startswith('#'))
        blank_lines = total_lines - code_lines - comment_lines

        return {
            'total_lines': total_lines,
            'code_lines': code_lines,
            'comment_lines': comment_lines,
            'blank_lines': blank_lines,
            'comment_ratio': round(comment_lines / max(code_lines, 1), 2)
        }


def detect_language(filename):
    """Detect programming language from file extension."""
    ext = Path(filename).suffix.lower()
    language_map = {
        '.py': 'python',
        '.js': 'javascript',
        '.jsx': 'javascript',
        '.ts': 'javascript',
        '.tsx': 'javascript',
        '.java': 'java',
        '.cpp': 'cpp',
        '.cc': 'cpp',
        '.cxx': 'cpp',
        '.c': 'c'
    }
    return language_map.get(ext, 'unknown')


def analyze_file(filepath, output_format='text'):
    """Analyze a code file."""
    if not os.path.exists(filepath):
        print(f"Error: File '{filepath}' not found", file=sys.stderr)
        sys.exit(1)

    with open(filepath, 'r', encoding='utf-8') as f:
        code = f.read()

    language = detect_language(filepath)

    # Choose analyzer based on language
    if language == 'python':
        analyzer = PythonAnalyzer(code, filepath)
    elif language == 'javascript':
        analyzer = JavaScriptAnalyzer(code, filepath)
    else:
        print(f"Error: Unsupported language '{language}'", file=sys.stderr)
        sys.exit(1)

    # Run analysis
    issues = analyzer.analyze()

    # Calculate metrics
    metrics = CodeMetrics(code).calculate()

    # Output results
    if output_format == 'json':
        result = {
            'file': filepath,
            'language': language,
            'metrics': metrics,
            'issues': [issue.to_dict() for issue in issues]
        }
        print(json.dumps(result, indent=2))
    else:
        print(f"\n{'=' * 60}")
        print(f"Code Analysis: {filepath}")
        print(f"Language: {language}")
        print(f"{'=' * 60}\n")

        print("METRICS:")
        print(f"  Total lines:    {metrics['total_lines']}")
        print(f"  Code lines:     {metrics['code_lines']}")
        print(f"  Comment lines:  {metrics['comment_lines']}")
        print(f"  Blank lines:    {metrics['blank_lines']}")
        print(f"  Comment ratio:  {metrics['comment_ratio']:.2%}\n")

        if issues:
            print(f"ISSUES FOUND: {len(issues)}\n")

            # Group by severity
            critical = [i for i in issues if i.severity == 'critical']
            warnings = [i for i in issues if i.severity == 'warning']
            info = [i for i in issues if i.severity == 'info']

            for severity, items in [('CRITICAL', critical), ('WARNING', warnings), ('INFO', info)]:
                if items:
                    print(f"{severity}:")
                    for issue in items:
                        print(f"  Line {issue.line}: [{issue.category}] {issue.message}")
                        if issue.suggestion:
                            print(f"    → {issue.suggestion}")
                    print()
        else:
            print("✓ No issues found!\n")


def main():
    parser = argparse.ArgumentParser(description='Analyze code for issues and metrics')
    parser.add_argument('file', help='Path to code file to analyze')
    parser.add_argument('--format', choices=['text', 'json'], default='text',
                        help='Output format (default: text)')

    args = parser.parse_args()

    analyze_file(args.file, args.format)


if __name__ == '__main__':
    main()
