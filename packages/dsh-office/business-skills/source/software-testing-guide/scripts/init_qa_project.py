#!/usr/bin/env python3
"""
Initialize QA Project Structure

Creates complete QA testing infrastructure including documentation templates,
tracking CSVs, and baseline metrics for any software project.

Usage:
    python scripts/init_qa_project.py <project-name> [output-dir]

Example:
    python scripts/init_qa_project.py my-app ./tests
"""

import os
import sys
import csv
from pathlib import Path
from datetime import datetime

def create_directory_structure(base_path):
    """Create QA project directory structure."""
    dirs = [
        "tests/docs",
        "tests/docs/templates",
        "tests/e2e",
        "tests/fixtures"
    ]

    for dir_path in dirs:
        full_path = base_path / dir_path
        full_path.mkdir(parents=True, exist_ok=True)
        print(f"✅ Created: {full_path}")

def create_test_execution_tracking(base_path, project_name):
    """Create TEST-EXECUTION-TRACKING.csv with headers."""
    csv_path = base_path / "tests/docs/templates/TEST-EXECUTION-TRACKING.csv"

    headers = [
        "Test Case ID", "Category", "Priority", "Test Name",
        "Estimated Time (min)", "Prerequisites", "Status",
        "Result", "Bug ID", "Execution Date", "Executed By",
        "Notes", "Screenshot/Log"
    ]

    with open(csv_path, 'w', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(headers)
        # Add example row
        writer.writerow([
            "TC-001", "Core", "P0", "Example Test Case",
            "5", "System running", "Not Started", "", "", "", "",
            "Replace with actual test cases", ""
        ])

    print(f"✅ Created: {csv_path}")

def create_bug_tracking_template(base_path):
    """Create BUG-TRACKING-TEMPLATE.csv."""
    csv_path = base_path / "tests/docs/templates/BUG-TRACKING-TEMPLATE.csv"

    headers = [
        "Bug ID", "Title", "Severity", "Component", "Test Case ID",
        "Status", "Reported Date", "Reported By", "Assigned To",
        "Description", "Steps to Reproduce", "Expected Result",
        "Actual Result", "Environment", "Screenshots/Logs",
        "Resolution", "Resolved Date", "Verified By", "Verification Date"
    ]

    with open(csv_path, 'w', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(headers)
        # Add example bug
        writer.writerow([
            "BUG-001", "Example Bug Title", "P1", "Component",
            "TC-001", "Open", datetime.now().strftime("%Y-%m-%d"),
            "QA Engineer", "Engineering Lead",
            "Description of the bug", "1. Step 1\n2. Step 2",
            "Expected behavior", "Actual behavior",
            "OS: macOS\nNode.js: v18.0.0", "",
            "", "", "", ""
        ])

    print(f"✅ Created: {csv_path}")

def create_baseline_metrics(base_path, project_name):
    """Create BASELINE-METRICS.md template."""
    content = f"""# Baseline Metrics - {project_name}

**Date**: {datetime.now().strftime("%Y-%m-%d")}
**Purpose**: Pre-QA snapshot for comparison during testing

---

## 1. Test Coverage (Current State)

### Unit Tests
- **Total Tests**: [NUMBER]
- **Passing**: [NUMBER] ([%]%)
- **Failing**: [NUMBER]
- **Coverage**: [%]% (statements/branches/functions)

### Integration Tests
- **Total Tests**: [NUMBER]
- **Status**: [Passing/Failing/Not Implemented]

### E2E Tests
- **Total Tests**: [NUMBER]
- **Browsers Covered**: [List browsers]

---

## 2. Known Issues (Pre-QA)

### Critical Issues
- [ ] Issue 1: Description
- [ ] Issue 2: Description

### Technical Debt
- [ ] Debt 1: Description
- [ ] Debt 2: Description

---

## 3. Security Status

### OWASP Top 10 Coverage
- [ ] A01: Broken Access Control
- [ ] A02: Cryptographic Failures
- [ ] A03: Injection
- [ ] A04: Insecure Design
- [ ] A05: Security Misconfiguration
- [ ] A06: Vulnerable Components
- [ ] A07: Authentication Failures
- [ ] A08: Data Integrity Failures
- [ ] A09: Logging Failures
- [ ] A10: SSRF

**Current Coverage**: [X]/10 ([%]%)

---

## 4. Performance Metrics

- **Page Load Time**: [X]ms (average)
- **API Response Time**: [X]ms (p95)
- **Database Query Time**: [X]ms (average)

---

## 5. Code Quality

- **Linting Errors**: [NUMBER]
- **TypeScript Strict Mode**: [Yes/No]
- **Code Duplication**: [%]%
- **Cyclomatic Complexity**: [Average]

---

## 6. Predicted Issues

**CRITICAL-001**: [Title]
- **Predicted Severity**: P0/P1/P2
- **Root Cause**: [Analysis]
- **Test Case**: TC-XXX-YYY will verify
- **Mitigation**: [Recommendation]

---

**Next Steps**: Begin Week 1 testing with baseline established.
"""

    file_path = base_path / "tests/docs/BASELINE-METRICS.md"
    with open(file_path, 'w') as f:
        f.write(content)

    print(f"✅ Created: {file_path}")

def create_weekly_report_template(base_path):
    """Create WEEKLY-PROGRESS-REPORT.md template."""
    content = """# Weekly QA Progress Report - Week [N]

**Date Range**: [Start Date] - [End Date]
**QA Lead**: [Name]
**Project**: [Project Name]

---

## Executive Summary

**Status**: 🟢 On Track / 🟡 At Risk / 🔴 Blocked

### Key Metrics
- **Tests Executed**: X / Y ([Z]%)
- **Pass Rate**: [%]%
- **Bugs Filed**: [N] (P0: [a], P1: [b], P2: [c], P3: [d])
- **Code Coverage**: [%]%

---

## Test Execution Progress

| Category | Total | Executed | Pass | Fail | Pass Rate |
|----------|-------|----------|------|------|-----------|
| Component 1 | X | Y | Z | W | [%]% |
| Component 2 | X | Y | Z | W | [%]% |
| Security | X | Y | Z | W | [%]% |
| **TOTAL** | X | Y | Z | W | [%]% |

---

## Quality Gates Status

| Gate | Target | Current | Status |
|------|--------|---------|--------|
| Test Execution | 100% | [%]% | ✅/⚠️/❌ |
| Pass Rate | ≥80% | [%]% | ✅/⚠️/❌ |
| P0 Bugs | 0 | [N] | ✅/⚠️/❌ |
| P1 Bugs | ≤5 | [N] | ✅/⚠️/❌ |
| Code Coverage | ≥80% | [%]% | ✅/⚠️/❌ |
| Security Coverage | 90% | [%]% | ✅/⚠️/❌ |

---

## Bugs Summary

### P0 Bugs (Blockers)
1. **BUG-001**: [Title]
   - Status: [Open/In Progress/Blocked]
   - Assignee: [Name]
   - ETA: [Date]

### P1 Bugs (Critical)
1. **BUG-XXX**: [Title]

---

## Baseline Comparison

| Metric | Week 1 | This Week | Trend |
|--------|--------|-----------|-------|
| Pass Rate | [%]% | [%]% | ⬆️/⬇️/➡️ |
| P0 Bugs | [N] | [N] | ⬆️/⬇️/➡️ |
| Coverage | [%]% | [%]% | ⬆️/⬇️/➡️ |

---

## Blockers & Risks

### Current Blockers
- [ ] Blocker 1: Description
- [ ] Blocker 2: Description

### Risks
- ⚠️ **Risk 1**: Description - Mitigation: [Action]
- ⚠️ **Risk 2**: Description - Mitigation: [Action]

---

## Next Week Plan

### Test Cases (Week [N+1])
- [Category]: TC-XXX-YYY to TC-XXX-ZZZ ([N] tests)
- Estimated Time: [X] hours

### Prerequisites
- [ ] Prerequisite 1
- [ ] Prerequisite 2

---

**Prepared By**: [Name]
**Date**: [Date]
"""

    file_path = base_path / "tests/docs/templates/WEEKLY-PROGRESS-REPORT.md"
    with open(file_path, 'w') as f:
        f.write(content)

    print(f"✅ Created: {file_path}")

def create_master_qa_prompt(base_path, project_name):
    """Create MASTER-QA-PROMPT.md for autonomous execution."""
    content = f"""# Master QA Prompt - {project_name}

**Purpose**: Single copy-paste prompt for autonomous QA test execution.

---

## ⭐ Master Prompt (Copy-Paste This)

```
You are a senior QA engineer with 20+ years of experience at Google.
Execute the {project_name} QA test plan.

**CRITICAL INSTRUCTIONS**:

1. Read tests/docs/QA-HANDOVER-INSTRUCTIONS.md
2. Read tests/docs/BASELINE-METRICS.md
3. Read tests/docs/templates/TEST-EXECUTION-TRACKING.csv

**Determine Current State**:
- If no tests executed: Start Day 1 onboarding
- If tests in progress: Resume from last completed test case

**For EACH test case**:
1. Read test specification
2. Execute test steps
3. Update TEST-EXECUTION-TRACKING.csv IMMEDIATELY (no batching)
4. If FAILED: File bug in BUG-TRACKING-TEMPLATE.csv
5. If P0 bug: STOP and escalate

**Daily Routine**:
- Morning: Check blockers, plan today's tests
- During: Execute tests, update CSV after EACH test
- End-of-day: Provide summary (tests executed, pass rate, bugs filed)

**Weekly Routine** (Friday):
- Generate WEEKLY-PROGRESS-REPORT.md
- Compare against BASELINE-METRICS.md
- Assess quality gates

**MANDATORY RULES**:
- ❌ DO NOT skip tests
- ❌ DO NOT batch CSV updates
- ❌ DO NOT deviate from documented test cases
- ✅ STOP immediately if P0 bug discovered

**Start now**: Tell me current state and what you're doing today.
```

---

## Auto-Resume Capability

The master prompt automatically:
1. Reads TEST-EXECUTION-TRACKING.csv
2. Finds last "Completed" test
3. Resumes from next test
4. No manual tracking needed

---

## Weekly Execution Schedule

**Week 1**: Critical path tests (highest priority)
**Week 2**: User workflows (common journeys)
**Week 3**: Data integrity (database, API)
**Week 4**: Security audit (OWASP Top 10)
**Week 5**: Regression (re-run P0 tests)

---

**Usage**: Copy the master prompt above and paste it to start autonomous QA execution.
"""

    file_path = base_path / "tests/docs/MASTER-QA-PROMPT.md"
    with open(file_path, 'w') as f:
        f.write(content)

    print(f"✅ Created: {file_path}")

def create_readme(base_path, project_name):
    """Create README.md for QA docs."""
    content = f"""# QA Documentation - {project_name}

**Status**: 🟢 Ready for Execution
**Created**: {datetime.now().strftime("%Y-%m-%d")}
**QA Framework**: Google Testing Standards

---

## 📋 Quick Start

### Option 1: Autonomous Execution (Recommended)
```bash
# Copy the master prompt from MASTER-QA-PROMPT.md and paste to your LLM
```

### Option 2: Manual Execution
1. Read `QA-HANDOVER-INSTRUCTIONS.md`
2. Complete Day 1 onboarding checklist
3. Execute test cases from category-specific documents
4. Update tracking CSVs after each test

---

## 📚 Document Index

### Core Strategy
- **QA-HANDOVER-INSTRUCTIONS.md** - Master handover guide
- **BASELINE-METRICS.md** - Pre-QA snapshot

### Test Cases
- **01-[CATEGORY]-TEST-CASES.md** - Component tests
- **02-SECURITY-TEST-CASES.md** - OWASP Top 10 tests

### Templates
- **TEST-EXECUTION-TRACKING.csv** - Progress tracker
- **BUG-TRACKING-TEMPLATE.csv** - Bug log
- **WEEKLY-PROGRESS-REPORT.md** - Status reporting

### Automation
- **MASTER-QA-PROMPT.md** - Autonomous execution

---

## 🎯 Quality Gates

| Gate | Target | Status |
|------|--------|--------|
| Test Execution | 100% | ⏳ Not Started |
| Pass Rate | ≥80% | ⏳ Not Started |
| P0 Bugs | 0 | ✅ No blockers |
| Code Coverage | ≥80% | ⏳ Baseline TBD |
| Security | 90% | ⏳ Week 4 |

---

## 🚀 Getting Started

**Day 1 Setup** (5 hours):
1. Environment setup
2. Test data seeding
3. Execute first test case
4. Verify tracking systems

**Week 1-5 Execution**:
- Follow test case documents
- Update CSV after EACH test
- File bugs for failures
- Weekly progress reports

---

**Contact**: QA Lead - [Your Name]
"""

    file_path = base_path / "tests/docs/README.md"
    with open(file_path, 'w') as f:
        f.write(content)

    print(f"✅ Created: {file_path}")

def main():
    if len(sys.argv) < 2:
        print("❌ Error: Project name required")
        print("Usage: python init_qa_project.py <project-name> [output-dir]")
        sys.exit(1)

    project_name = sys.argv[1]
    output_dir = sys.argv[2] if len(sys.argv) > 2 else "."

    base_path = Path(output_dir).resolve()

    print(f"\n🚀 Initializing QA Project: {project_name}")
    print(f"   Location: {base_path}\n")

    # Create directory structure
    create_directory_structure(base_path)

    # Create tracking files
    create_test_execution_tracking(base_path, project_name)
    create_bug_tracking_template(base_path)

    # Create documentation
    create_baseline_metrics(base_path, project_name)
    create_weekly_report_template(base_path)
    create_master_qa_prompt(base_path, project_name)
    create_readme(base_path, project_name)

    print(f"\n✅ QA Project '{project_name}' initialized successfully!")
    print(f"\n📝 Next Steps:")
    print(f"   1. Review {base_path}/tests/docs/README.md")
    print(f"   2. Fill in BASELINE-METRICS.md with current project state")
    print(f"   3. Write test cases in category-specific documents")
    print(f"   4. Start testing with MASTER-QA-PROMPT.md")

if __name__ == "__main__":
    main()
