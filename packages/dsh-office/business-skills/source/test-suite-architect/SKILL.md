---
name: test-suite-architect
description: This skill should be used when establishing comprehensive QA testing processes for any software project. Use when creating test strategies, writing test cases following Google Testing Standards, executing test plans, tracking bugs with P0-P4 classification, calculating quality metrics, or generating progress reports. Includes autonomous execution capability via master prompts and complete documentation templates for third-party QA team handoffs. Implements OWASP security testing and achieves 90% coverage targets.
keywords: [qa, testing, test-cases, bug-tracking, google-standards, owasp, security, automation, quality-gates, metrics]
---

# QA Expert

Establish world-class QA testing processes for any software project using proven methodologies from Google Testing Standards and OWASP security best practices.

## When to Use This Skill

Trigger this skill when:
- Setting up QA infrastructure for a new or existing project
- Writing standardized test cases (AAA pattern compliance)
- Executing comprehensive test plans with progress tracking
- Implementing security testing (OWASP Top 10)
- Filing bugs with proper severity classification (P0-P4)
- Generating QA reports (daily summaries, weekly progress)
- Calculating quality metrics (pass rate, coverage, gates)
- Preparing QA documentation for third-party team handoffs
- Enabling autonomous LLM-driven test execution

## Quick Start

**One-command initialization**:
```bash
python scripts/init_qa_project.py <project-name> [output-directory]
```

**What gets created**:
- Directory structure (`tests/docs/`, `tests/e2e/`, `tests/fixtures/`)
- Tracking CSVs (`TEST-EXECUTION-TRACKING.csv`, `BUG-TRACKING-TEMPLATE.csv`)
- Documentation templates (`BASELINE-METRICS.md`, `WEEKLY-PROGRESS-REPORT.md`)
- Master QA Prompt for autonomous execution
- README with complete quickstart guide

**For autonomous execution** (recommended): See `references/master_qa_prompt.md` - single copy-paste command for 100x speedup.

## Core Capabilities

### 1. QA Project Initialization

Initialize complete QA infrastructure with all templates:

```bash
python scripts/init_qa_project.py <project-name> [output-directory]
```

Creates directory structure, tracking CSVs, documentation templates, and master prompt for autonomous execution.

**Use when**: Starting QA from scratch or migrating to structured QA process.

### 2. Test Case Writing

Write standardized, reproducible test cases following AAA pattern (Arrange-Act-Assert):

1. Read template: `assets/templates/TEST-CASE-TEMPLATE.md`
2. Follow structure: Prerequisites (Arrange) → Test Steps (Act) → Expected Results (Assert)
3. Assign priority: P0 (blocker) → P4 (low)
4. Include edge cases and potential bugs

**Test case format**: TC-[CATEGORY]-[NUMBER] (e.g., TC-CLI-001, TC-WEB-042, TC-SEC-007)

**Reference**: See `references/google_testing_standards.md` for complete AAA pattern guidelines and coverage thresholds.

### 3. Test Execution & Tracking

**Ground Truth Principle** (critical):
- **Test case documents** (e.g., `02-CLI-TEST-CASES.md`) = **authoritative source** for test steps
- **Tracking CSV** = execution status only (do NOT trust CSV for test specifications)
- See `references/ground_truth_principle.md` for preventing doc/CSV sync issues

**Manual execution**:
1. Read test case from category document (e.g., `02-CLI-TEST-CASES.md`) ← **always start here**
2. Execute test steps exactly as documented
3. Update `TEST-EXECUTION-TRACKING.csv` **immediately** after EACH test (never batch)
4. File bug in `BUG-TRACKING-TEMPLATE.csv` if test fails

**Autonomous execution** (recommended):
1. Copy master prompt from `references/master_qa_prompt.md`
2. Paste to LLM session
3. LLM auto-executes, auto-tracks, auto-files bugs, auto-generates reports

**Innovation**: 100x faster vs manual + zero human error in tracking + auto-resume capability.

### 4. Bug Reporting

File bugs with proper severity classification:

**Required fields**:
- Bug ID: Sequential (BUG-001, BUG-002, ...)
- Severity: P0 (24h fix) → P4 (optional)
- Steps to Reproduce: Numbered, specific
- Environment: OS, versions, configuration

**Severity classification**:
- **P0 (Blocker)**: Security vulnerability, core functionality broken, data loss
- **P1 (Critical)**: Major feature broken with workaround
- **P2 (High)**: Minor feature issue, edge case
- **P3 (Medium)**: Cosmetic issue
- **P4 (Low)**: Documentation typo

**Reference**: See `BUG-TRACKING-TEMPLATE.csv` for complete template with examples.

### 5. Quality Metrics Calculation

Calculate comprehensive QA metrics and quality gates status:

```bash
python scripts/calculate_metrics.py <path/to/TEST-EXECUTION-TRACKING.csv>
```

**Metrics dashboard includes**:
- Test execution progress (X/Y tests, Z% complete)
- Pass rate (passed/executed %)
- Bug analysis (unique bugs, P0/P1/P2 breakdown)
- Quality gates status (✅/❌ for each gate)

**Quality gates** (all must pass for release):
| Gate | Target | Blocker |
|------|--------|---------|
| Test Execution | 100% | Yes |
| Pass Rate | ≥80% | Yes |
| P0 Bugs | 0 | Yes |
| P1 Bugs | ≤5 | Yes |
| Code Coverage | ≥80% | Yes |
| Security | 90% OWASP | Yes |

### 6. Progress Reporting

Generate QA reports for stakeholders:

**Daily summary** (end-of-day):
- Tests executed, pass rate, bugs filed
- Blockers (or None)
- Tomorrow's plan

**Weekly report** (every Friday):
- Use template: `WEEKLY-PROGRESS-REPORT.md` (created by init script)
- Compare against baseline: `BASELINE-METRICS.md`
- Assess quality gates and trends

**Reference**: See `references/llm_prompts_library.md` for 30+ ready-to-use reporting prompts.

### 7. Security Testing (OWASP)

Implement OWASP Top 10 security testing:

**Coverage targets**:
1. **A01: Broken Access Control** - RLS bypass, privilege escalation
2. **A02: Cryptographic Failures** - Token encryption, password hashing
3. **A03: Injection** - SQL injection, XSS, command injection
4. **A04: Insecure Design** - Rate limiting, anomaly detection
5. **A05: Security Misconfiguration** - Verbose errors, default credentials
6. **A07: Authentication Failures** - Session hijacking, CSRF
7. **Others**: Data integrity, logging, SSRF

**Target**: 90% OWASP coverage (9/10 threats mitigated).

Each security test follows AAA pattern with specific attack vectors documented.

## Day 1 Onboarding

For new QA engineers joining a project, complete 5-hour onboarding guide:

**Read**: `references/day1_onboarding.md`

**Timeline**:
- Hour 1: Environment setup (database, dev server, dependencies)
- Hour 2: Documentation review (test strategy, quality gates)
- Hour 3: Test data setup (users, CLI, DevTools)
- Hour 4: Execute first test case
- Hour 5: Team onboarding & Week 1 planning

**Checkpoint**: By end of Day 1, environment running, first test executed, ready for Week 1.

## Autonomous Execution (⭐ Recommended)

Enable LLM-driven autonomous QA testing with single master prompt:

**Read**: `references/master_qa_prompt.md`

**Features**:
- Auto-resume from last completed test (reads tracking CSV)
- Auto-execute test cases (Week 1-5 progression)
- Auto-track results (updates CSV after each test)
- Auto-file bugs (creates bug reports for failures)
- Auto-generate reports (daily summaries, weekly reports)
- Auto-escalate P0 bugs (stops testing, notifies stakeholders)

**Benefits**:
- 100x faster execution vs manual
- Zero human error in tracking
- Consistent bug documentation
- Immediate progress visibility

**Usage**: Copy master prompt, paste to LLM, let it run autonomously for 5 weeks.

## Adapting for Your Project

### Small Project (50 tests)
- Timeline: 2 weeks
- Categories: 2-3 (e.g., Frontend, Backend)
- Daily: 5-7 tests
- Reports: Daily summary only

### Medium Project (200 tests)
- Timeline: 4 weeks
- Categories: 4-5 (CLI, Web, API, DB, Security)
- Daily: 10-12 tests
- Reports: Daily + weekly

### Large Project (500+ tests)
- Timeline: 8-10 weeks
- Categories: 6-8 (multiple components)
- Daily: 10-15 tests
- Reports: Daily + weekly + bi-weekly stakeholder

## Reference Documents

Access detailed guidelines from bundled references:

- **`references/day1_onboarding.md`** - 5-hour onboarding guide for new QA engineers
- **`references/master_qa_prompt.md`** - Single command for autonomous LLM execution (100x speedup)
- **`references/llm_prompts_library.md`** - 30+ ready-to-use prompts for specific QA tasks
- **`references/google_testing_standards.md`** - AAA pattern, coverage thresholds, fail-fast validation
- **`references/ground_truth_principle.md`** - Preventing doc/CSV sync issues (critical for test suite integrity)

## Assets & Templates

Test case templates and bug report formats:

- **`assets/templates/TEST-CASE-TEMPLATE.md`** - Complete template with CLI and security examples

## Scripts

Automation scripts for QA infrastructure:

- **`scripts/init_qa_project.py`** - Initialize QA infrastructure (one command setup)
- **`scripts/calculate_metrics.py`** - Generate quality metrics dashboard

## Common Patterns

### Pattern 1: Starting Fresh QA
```
1. python scripts/init_qa_project.py my-app ./
2. Fill in BASELINE-METRICS.md (document current state)
3. Write test cases using assets/templates/TEST-CASE-TEMPLATE.md
4. Copy master prompt from references/master_qa_prompt.md
5. Paste to LLM → autonomous execution begins
```

### Pattern 2: LLM-Driven Testing (Autonomous)
```
1. Read references/master_qa_prompt.md
2. Copy the single master prompt (one paragraph)
3. Paste to LLM conversation
4. LLM executes all 342 test cases over 5 weeks
5. LLM updates tracking CSVs automatically
6. LLM generates weekly reports automatically
```

### Pattern 3: Adding Security Testing
```
1. Read references/google_testing_standards.md (OWASP section)
2. Write TC-SEC-XXX test cases for each OWASP threat
3. Target 90% coverage (9/10 threats)
4. Document mitigations in test cases
```

### Pattern 4: Third-Party QA Handoff
```
1. Ensure all templates populated
2. Verify BASELINE-METRICS.md complete
3. Package tests/docs/ folder
4. Include references/master_qa_prompt.md for autonomous execution
5. QA team can start immediately (Day 1 onboarding → 5 weeks testing)
```

## Success Criteria

This skill is effective when:
- ✅ Test cases are reproducible by any engineer
- ✅ Quality gates objectively measured
- ✅ Bugs fully documented with repro steps
- ✅ Progress visible in real-time (CSV tracking)
- ✅ Autonomous execution enabled (LLM can execute full plan)
- ✅ Third-party QA teams can start testing immediately
