#!/usr/bin/env python3
"""
Calculate QA Metrics

Analyzes TEST-EXECUTION-TRACKING.csv and generates quality metrics.

Usage:
    python scripts/calculate_metrics.py <tracking-csv-path>
"""

import sys
import csv
from pathlib import Path
from collections import Counter

def calculate_metrics(csv_path):
    """Calculate comprehensive QA metrics from tracking CSV."""

    with open(csv_path, 'r') as f:
        reader = csv.DictReader(f)
        tests = list(reader)

    total = len([t for t in tests if t['Test Case ID'] not in ['', 'Test Case ID']])
    executed = len([t for t in tests if t['Status'] == 'Completed'])
    passed = len([t for t in tests if t['Result'] == '✅ PASSED'])
    failed = len([t for t in tests if t['Result'] == '❌ FAILED'])

    pass_rate = (passed / executed * 100) if executed > 0 else 0
    execution_rate = (executed / total * 100) if total > 0 else 0

    # Bug analysis
    bug_ids = [t['Bug ID'] for t in tests if t['Bug ID'] and t['Bug ID'] != '']
    unique_bugs = len(set(bug_ids))

    # Priority analysis
    priority_counts = Counter([t['Priority'] for t in tests if t['Priority']])

    print(f"\n{'='*60}")
    print(f"QA METRICS DASHBOARD")
    print(f"{'='*60}\n")

    print(f"📊 TEST EXECUTION")
    print(f"   Total Tests:     {total}")
    print(f"   Executed:        {executed} ({execution_rate:.1f}%)")
    print(f"   Not Started:     {total - executed}\n")

    print(f"✅ TEST RESULTS")
    print(f"   Passed:          {passed}")
    print(f"   Failed:          {failed}")
    print(f"   Pass Rate:       {pass_rate:.1f}%\n")

    print(f"🐛 BUG ANALYSIS")
    print(f"   Unique Bugs:     {unique_bugs}")
    print(f"   Total Failures:  {failed}\n")

    print(f"⭐ PRIORITY BREAKDOWN")
    for priority in ['P0', 'P1', 'P2', 'P3']:
        count = priority_counts.get(priority, 0)
        print(f"   {priority}:              {count}")

    print(f"\n🎯 QUALITY GATES")
    gates = {
        "Test Execution ≥100%": execution_rate >= 100,
        "Pass Rate ≥80%": pass_rate >= 80,
        "P0 Bugs = 0": len([t for t in tests if t['Bug ID'].startswith('BUG') and 'P0' in t['Notes']]) == 0,
    }

    for gate, status in gates.items():
        symbol = "✅" if status else "❌"
        print(f"   {symbol} {gate}")

    print(f"\n{'='*60}\n")

    return {
        'total': total,
        'executed': executed,
        'passed': passed,
        'failed': failed,
        'pass_rate': pass_rate,
        'execution_rate': execution_rate,
        'unique_bugs': unique_bugs
    }

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python calculate_metrics.py <tracking-csv-path>")
        sys.exit(1)

    csv_path = Path(sys.argv[1])
    if not csv_path.exists():
        print(f"❌ Error: File not found: {csv_path}")
        sys.exit(1)

    calculate_metrics(csv_path)
