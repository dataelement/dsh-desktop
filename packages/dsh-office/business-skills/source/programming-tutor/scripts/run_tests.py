#!/usr/bin/env python3
"""
Test Runner - Execute and format test results

Supports:
- pytest (Python)
- unittest (Python)
- jest (JavaScript)
- JUnit (Java)

Usage:
    python run_tests.py <test_file>
    python run_tests.py <test_directory>
    python run_tests.py --framework pytest
"""

import argparse
import json
import os
import subprocess
import sys
from pathlib import Path


class TestResult:
    """Represents test execution results."""

    def __init__(self):
        self.passed = 0
        self.failed = 0
        self.errors = 0
        self.skipped = 0
        self.total = 0
        self.duration = 0.0
        self.failures = []

    def to_dict(self):
        return {
            'passed': self.passed,
            'failed': self.failed,
            'errors': self.errors,
            'skipped': self.skipped,
            'total': self.total,
            'duration': self.duration,
            'failures': self.failures
        }


class TestRunner:
    """Base class for test runners."""

    def __init__(self, target):
        self.target = target

    def run(self) -> TestResult:
        raise NotImplementedError


class PytestRunner(TestRunner):
    """Run pytest tests."""

    def run(self) -> TestResult:
        result = TestResult()

        try:
            # Run pytest with verbose output and JSON report
            cmd = [
                'python', '-m', 'pytest',
                self.target,
                '-v',
                '--tb=short'
            ]

            process = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=60
            )

            # Parse output
            output = process.stdout + process.stderr
            lines = output.split('\n')

            for line in lines:
                if ' PASSED' in line:
                    result.passed += 1
                elif ' FAILED' in line:
                    result.failed += 1
                    # Extract test name and failure info
                    test_name = line.split('::')[1].split(' ')[0] if '::' in line else 'unknown'
                    result.failures.append({
                        'test': test_name,
                        'message': 'See output for details'
                    })
                elif ' ERROR' in line:
                    result.errors += 1
                elif ' SKIPPED' in line:
                    result.skipped += 1

                # Extract duration
                if 'passed in' in line or 'failed in' in line:
                    try:
                        duration_str = line.split(' in ')[1].split('s')[0]
                        result.duration = float(duration_str)
                    except:
                        pass

            result.total = result.passed + result.failed + result.errors + result.skipped

            return result

        except FileNotFoundError:
            print("Error: pytest not found. Install with: pip install pytest", file=sys.stderr)
            sys.exit(1)
        except subprocess.TimeoutExpired:
            print("Error: Tests timed out after 60 seconds", file=sys.stderr)
            sys.exit(1)
        except Exception as e:
            print(f"Error running tests: {e}", file=sys.stderr)
            sys.exit(1)


class UnittestRunner(TestRunner):
    """Run unittest tests."""

    def run(self) -> TestResult:
        result = TestResult()

        try:
            cmd = [
                'python', '-m', 'unittest',
                'discover',
                '-s', self.target,
                '-v'
            ]

            process = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=60
            )

            output = process.stdout + process.stderr
            lines = output.split('\n')

            for line in lines:
                if ' ... ok' in line:
                    result.passed += 1
                elif 'FAIL:' in line:
                    result.failed += 1
                    test_name = line.replace('FAIL:', '').strip()
                    result.failures.append({
                        'test': test_name,
                        'message': 'See output for details'
                    })
                elif 'ERROR:' in line:
                    result.errors += 1

            # Parse summary line
            for line in reversed(lines):
                if 'Ran ' in line and ' test' in line:
                    try:
                        result.total = int(line.split('Ran ')[1].split(' test')[0])
                    except:
                        pass
                    break

            return result

        except FileNotFoundError:
            print("Error: unittest module not found", file=sys.stderr)
            sys.exit(1)
        except Exception as e:
            print(f"Error running tests: {e}", file=sys.stderr)
            sys.exit(1)


class JestRunner(TestRunner):
    """Run Jest tests."""

    def run(self) -> TestResult:
        result = TestResult()

        try:
            cmd = ['npx', 'jest', self.target, '--verbose']

            process = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=60
            )

            output = process.stdout + process.stderr
            lines = output.split('\n')

            for line in lines:
                if '✓' in line or 'PASS' in line:
                    result.passed += 1
                elif '✕' in line or 'FAIL' in line:
                    result.failed += 1

            # Parse summary
            for line in lines:
                if 'Tests:' in line:
                    parts = line.split(',')
                    for part in parts:
                        if 'passed' in part:
                            try:
                                result.passed = int(part.split()[0])
                            except:
                                pass
                        elif 'failed' in part:
                            try:
                                result.failed = int(part.split()[0])
                            except:
                                pass

            result.total = result.passed + result.failed

            return result

        except FileNotFoundError:
            print("Error: Jest not found. Install with: npm install --save-dev jest", file=sys.stderr)
            sys.exit(1)
        except Exception as e:
            print(f"Error running tests: {e}", file=sys.stderr)
            sys.exit(1)


def detect_framework(target):
    """Detect testing framework to use."""
    # Check if it's a Python file
    if target.endswith('.py') or os.path.isdir(target):
        # Check for pytest markers
        if os.path.isfile(target):
            with open(target, 'r') as f:
                content = f.read()
                if 'import pytest' in content or '@pytest' in content:
                    return 'pytest'
                elif 'import unittest' in content or 'class Test' in content:
                    return 'unittest'
        else:
            # Check for pytest.ini or setup.cfg
            if os.path.exists('pytest.ini') or os.path.exists('setup.cfg'):
                return 'pytest'
            return 'unittest'

    # Check if it's JavaScript
    elif target.endswith('.js') or target.endswith('.test.js'):
        return 'jest'

    return 'pytest'  # Default


def run_tests(target, framework=None, output_format='text'):
    """Run tests and format output."""
    if not os.path.exists(target):
        print(f"Error: Target '{target}' not found", file=sys.stderr)
        sys.exit(1)

    # Detect framework if not specified
    if framework is None:
        framework = detect_framework(target)

    # Create appropriate runner
    if framework == 'pytest':
        runner = PytestRunner(target)
    elif framework == 'unittest':
        runner = UnittestRunner(target)
    elif framework == 'jest':
        runner = JestRunner(target)
    else:
        print(f"Error: Unsupported framework '{framework}'", file=sys.stderr)
        sys.exit(1)

    print(f"\nRunning tests with {framework}...")
    print(f"Target: {target}\n")

    # Run tests
    result = runner.run()

    # Output results
    if output_format == 'json':
        print(json.dumps(result.to_dict(), indent=2))
    else:
        print("=" * 60)
        print("TEST RESULTS")
        print("=" * 60)
        print(f"Total:   {result.total}")
        print(f"Passed:  {result.passed} ✓")
        print(f"Failed:  {result.failed} ✗")
        if result.errors > 0:
            print(f"Errors:  {result.errors}")
        if result.skipped > 0:
            print(f"Skipped: {result.skipped}")
        if result.duration > 0:
            print(f"Duration: {result.duration:.2f}s")
        print()

        if result.failures:
            print("FAILURES:")
            for failure in result.failures:
                print(f"  - {failure['test']}")
                if failure.get('message'):
                    print(f"    {failure['message']}")
            print()

        # Summary
        if result.failed == 0 and result.errors == 0:
            print("✓ All tests passed!")
        else:
            print(f"✗ {result.failed + result.errors} test(s) failed")

        print()


def main():
    parser = argparse.ArgumentParser(description='Run and format test results')
    parser.add_argument('target', help='Test file or directory to run')
    parser.add_argument('--framework', choices=['pytest', 'unittest', 'jest'],
                        help='Testing framework to use (auto-detected if not specified)')
    parser.add_argument('--format', choices=['text', 'json'], default='text',
                        help='Output format (default: text)')

    args = parser.parse_args()

    run_tests(args.target, args.framework, args.format)


if __name__ == '__main__':
    main()
