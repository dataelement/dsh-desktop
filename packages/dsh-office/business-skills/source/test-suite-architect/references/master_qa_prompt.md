# Master QA Prompt - One Command for Autonomous Execution

**Purpose**: Single copy-paste prompt that directs LLM to execute entire QA test plan autonomously.

**Innovation**: 100x speedup vs manual testing + zero human error in tracking + auto-resume capability.

---

## ⭐ The Master Prompt

Copy this prompt and paste it into your LLM conversation. The LLM will handle everything automatically.

```
You are a senior QA engineer with 20+ years of experience at Google. Execute the QA test plan.

CRITICAL INSTRUCTIONS:
1. Read tests/docs/QA-HANDOVER-INSTRUCTIONS.md - Master handover guide
2. Read tests/docs/BASELINE-METRICS.md - Understand pre-QA baseline
3. Read tests/docs/templates/TEST-EXECUTION-TRACKING.csv - Check current progress
4. Determine current state:
   - If no tests executed yet → Start Day 1 onboarding (tests/docs/templates/DAY-1-ONBOARDING-CHECKLIST.md)
   - If Day 1 complete → Determine current week/day from TEST-EXECUTION-TRACKING.csv
   - If mid-week → Continue from last completed test case
5. Execute today's test cases:
   - Week 1: CLI tests (tests/docs/02-CLI-TEST-CASES.md)
   - Week 2: Web tests (tests/docs/03-WEB-TEST-CASES.md)
   - Week 3: API tests (tests/docs/04-API-TEST-CASES.md)
   - Week 4: Security tests (tests/docs/05-SECURITY-TEST-CASES.md)
   - Week 5: Regression tests (re-run all P0 tests)
6. For EACH test case:
   - Read full test case specification
   - Execute all steps exactly as documented
   - Update TEST-EXECUTION-TRACKING.csv immediately with result
   - If test fails → File bug in BUG-TRACKING-TEMPLATE.csv before continuing
7. End of day:
   - Provide summary (tests executed, pass rate, bugs filed, blockers)
   - If Friday → Generate WEEKLY-PROGRESS-REPORT.md
8. Compare progress against BASELINE-METRICS.md weekly

MANDATORY RULES:
- DO NOT skip tests
- DO NOT deviate from documented test cases
- DO NOT batch CSV updates (update after EACH test)
- DO NOT modify test priorities without approval
- STOP immediately if P0 bug discovered (escalate)

Ground truth: tests/docs/ directory
Test strategy: tests/docs/01-TEST-STRATEGY.md
Quality gates: ≥80% pass rate, zero P0 bugs, ≥80% coverage

Start now. Tell me what state you're in and what you're going to do today.
```

---

## How It Works

### **Step 1: Assess Current State** (2 minutes)
```
✅ Reading QA-HANDOVER-INSTRUCTIONS.md...
✅ Reading BASELINE-METRICS.md...
✅ Reading TEST-EXECUTION-TRACKING.csv...

Current State Detected:
- Day 1 onboarding: NOT COMPLETE
- Tests executed: 0 / 342
- Current week: N/A (need to complete Day 1 first)

Decision: Start Day 1 onboarding
```

### **Step 2: Execute Day 1 Onboarding** (if not done yet)
```
Reading: tests/docs/templates/DAY-1-ONBOARDING-CHECKLIST.md

Starting Hour 1: Environment Setup
Task 1.1: Clone repository
  Executing: git clone https://github.com/your-org/project.git
  Status: ✅ Complete

Task 1.2: Install dependencies
  Executing: pnpm install
  Status: ✅ Complete

[... continues through all 5 hours ...]

Day 1 Onboarding: ✅ COMPLETE
Ready to start Week 1 testing tomorrow.
```

### **Step 3: Execute Daily Tests** (if Day 1 done)
```
Current State Detected:
- Day 1 onboarding: ✅ COMPLETE
- Last completed test: TC-CLI-015
- Current week: Week 1 (CLI Testing)
- Current day: Tuesday
- Today's tests: TC-CLI-016 through TC-CLI-030 (15 tests)

Reading: tests/docs/02-CLI-TEST-CASES.md

Executing TC-CLI-016: Install Skill with --project Flag
  Step 1: Create test project directory
    Executing: mkdir /tmp/test-project && cd /tmp/test-project
    Status: ✅ Complete
  Step 2: Run ccpm install --project cli-demo-generator
    Executing: ccpm install --project cli-demo-generator
    Output: ✓ Skill installed to /tmp/test-project/.claude/skills/cli-demo-generator
    Status: ✅ PASS

Updating TEST-EXECUTION-TRACKING.csv:
  Row: TC-CLI-016
  Status: Completed
  Result: PASS
  Execution Date: 2025-11-08
  Executed By: QA Engineer
  Notes: Skill installed to project directory successfully
  ✅ CSV Updated

Executing TC-CLI-017: Install Skill with Invalid Name
[... continues for all 15 tests ...]

End of Day Summary:
✅ Tests executed: 15 / 15 (100%)
✅ Pass rate: 93% (14 passed, 1 failed)
🐛 Bugs filed: BUG-002 (P2 - Error message unclear for invalid skill name)
📊 TEST-EXECUTION-TRACKING.csv: Updated
📝 BUG-TRACKING-TEMPLATE.csv: Updated

Tomorrow (Wednesday):
- Tests: TC-CLI-031 through TC-CLI-045 (15 tests)
- Estimated time: 5.5 hours
```

### **Step 4: Weekly Reporting** (if Friday)
```
Current State Detected:
- Current day: Friday (end of Week 1)
- Week 1 tests: 93 / 93 executed (100%)
- Pass rate: 91% (85 passed, 8 failed)

Generating WEEKLY-PROGRESS-REPORT.md:
  Reading template: tests/docs/templates/WEEKLY-PROGRESS-REPORT.md

  Executive Summary:
  - Tests Executed: 93 / 342 (27% complete)
  - Pass Rate: 91%
  - Bugs Found: 8 total (P0: 0, P1: 2, P2: 4, P3: 2)
  - Blockers: None
  - On Track: Yes

  [... fills in all sections ...]

  ✅ Report saved: tests/docs/reports/WEEK-1-PROGRESS-REPORT-2025-11-08.md

Comparing against BASELINE-METRICS.md:
  Baseline (2025-11-08):
  - Unit tests: 261 passing (100%)
  - P0 bugs: 0
  - Database: 18 skills, 32 tables

  Current (2025-11-08):
  - Total tests: 261 unit + 93 QA CLI = 354 tests
  - Overall pass rate: 96% (340 passed, 14 failed)
  - P0 bugs: 0 (maintaining baseline) ✅
  - Quality gates: On track for ≥80% target ✅
```

---

## Auto-Resume Capability

If the LLM conversation gets interrupted or you need to pause, just paste the master prompt again.

The LLM will:
1. ✅ Read TEST-EXECUTION-TRACKING.csv
2. ✅ Find the last completed test case
3. ✅ Resume from the next test case
4. ✅ Continue exactly where you left off

**Example**:
```
Current State Detected:
- Last completed test: TC-CLI-042
- Current week: Week 1 (CLI Testing)
- Current day: Wednesday
- Remaining today: TC-CLI-043 through TC-CLI-045 (3 tests)

Resuming from TC-CLI-043...
```

---

## Quality Gates Monitoring

The LLM automatically checks quality gates and alerts you if off track:

### **Pass Rate Check** (Daily)
```
Quality Gate: Pass Rate ≥80%
Current: 91% ✅ PASSING
Status: On track
```

### **P0 Bugs Check** (Daily)
```
Quality Gate: Zero P0 Bugs
Current: 0 P0 bugs ✅ PASSING
Status: Maintained
```

### **Code Coverage Check** (Weekly)
```
Quality Gate: ≥80% Coverage
Current: 76% ⚠️ BELOW TARGET
Status: Need 4% improvement
Action: Add unit tests for uncovered modules
```

### **Release Readiness** (End of Week 5)
```
RELEASE READINESS ASSESSMENT

Quality Gates Status:
✅ Test Execution: 100% (342/342 tests executed)
✅ Pass Rate: 87% (≥80% required) - PASS
✅ P0 Bugs: 0 (zero required) - PASS
⚠️ P1 Bugs: 7 (≤5 required) - FAIL (2 over limit)
✅ Code Coverage: 82% (≥80% required) - PASS
✅ Security: 90% OWASP coverage - PASS

Overall: ⚠️ AT RISK
Blocker: 2 excess P1 bugs must be fixed before release
ETA: 2 weeks (1 sprint)

RECOMMENDATION: Do NOT release until P1 bug count ≤5
```

---

## Emergency Scenarios

### **P0 Bug Discovered**
If the LLM discovers a P0 bug, it will:
```
🚨 CRITICAL: P0 Bug Discovered - STOPPING ALL TESTING

Bug ID: BUG-005
Test Case: TC-CLI-023
Severity: P0 (Blocker - Requires 24-hour fix)
Issue: Path traversal vulnerability allows reading /etc/passwd

Immediate Actions Taken:
✅ Bug report filed in BUG-TRACKING-TEMPLATE.csv (all fields complete)
✅ Test case marked as "Blocked" in TEST-EXECUTION-TRACKING.csv
✅ All further testing STOPPED

ESCALATION REQUIRED:
- Notify: QA Lead, Engineering Lead, Product Manager
- Required Fix Time: 24 hours
- Impact: Security vulnerability, release blocker

Escalation email drafted (see below).

Awaiting fix before resuming testing.
```

### **Environment Broken**
If the environment breaks, the LLM will:
```
🔧 ENVIRONMENT ISSUE DETECTED

Issue: Supabase containers not responding
Diagnostic Results:
  ✅ Docker running: Yes
  ❌ Supabase containers: 3 unhealthy
  ❌ Database connection: Failed

Troubleshooting Steps Taken:
  1. Checked docker ps → 3 containers unhealthy
  2. Checked logs → Error: port 54321 already in use
  3. Attempted restart → Failed (port conflict)

RECOMMENDATION:
  1. Kill conflicting process: lsof -ti:54321 | xargs kill -9
  2. Restart Supabase: npx supabase start
  3. Verify: docker ps (all containers healthy)
  4. Resume testing from TC-CLI-042

Marking tests as "Blocked" until environment fixed.
```

---

## Files Automatically Updated

When you run the master prompt, these files get updated automatically:

| File | Update Frequency | What Gets Updated |
|------|------------------|-------------------|
| **TEST-EXECUTION-TRACKING.csv** | After EACH test | Status, Result, Bug ID, Execution Date, Notes |
| **BUG-TRACKING-TEMPLATE.csv** | When test fails | New bug entry (Bug ID, Severity, Steps to Reproduce, etc.) |
| **WEEKLY-PROGRESS-REPORT.md** | Every Friday | Weekly summary, metrics, quality gates, next week plan |
| **tests/docs/reports/** | Every Friday | New weekly report file created |

**You don't need to manually update anything!** The LLM handles all tracking automatically.

---

## Success Criteria

After 5 weeks of using this master prompt, you should have:

✅ **All 342 test cases executed** (100% completion)
✅ **TEST-EXECUTION-TRACKING.csv fully populated** (all 342 rows with results)
✅ **Bugs documented** in BUG-TRACKING-TEMPLATE.csv (complete with P0-P4 classification)
✅ **5 weekly progress reports** (one per week in `tests/docs/reports/`)
✅ **Quality gates met** (≥80% pass rate, zero P0 bugs, ≥80% coverage)
✅ **Release readiness assessment** (go/no-go decision based on objective criteria)

---

## Daily Workflow Example

### **Day 1 (First Time)**
```
You: [Paste master prompt]

LLM:
  Current State: No testing done yet
  Action: Starting Day 1 onboarding
  [Executes 5-hour onboarding checklist]
  Result: ✅ Day 1 complete, ready for Week 1 Monday
```

### **Day 2 (Monday, Week 1)**
```
You: [Paste master prompt]

LLM:
  Current State: Day 1 complete, Week 1 not started
  Action: Execute TC-CLI-001 through TC-CLI-015 (15 tests)
  [Executes 15 CLI tests, updates CSV after each]
  Result: 14 passed, 1 failed, 1 bug filed
```

### **Day 3 (Tuesday, Week 1)**
```
You: [Paste master prompt]

LLM:
  Current State: Last completed TC-CLI-015
  Action: Execute TC-CLI-016 through TC-CLI-030 (15 tests)
  [Continues testing from where left off]
  Result: 15 passed, 0 failed
```

### **Day 6 (Friday, Week 1)**
```
You: [Paste master prompt]

LLM:
  Current State: Last completed TC-CLI-077
  Action: Execute TC-CLI-078 through TC-CLI-093 (16 tests) + Weekly report
  [Finishes Week 1 tests, generates weekly report]
  Result: Week 1 complete (93/93 tests), 91% pass rate, 8 bugs filed
```

### **Day 8 (Monday, Week 2)**
```
You: [Paste master prompt]

LLM:
  Current State: Week 1 complete, Week 2 not started
  Action: Execute TC-WEB-001 through TC-WEB-015 (15 tests)
  [Switches to Web testing automatically]
  Result: 13 passed, 2 failed, 2 bugs filed
```

**This continues for 5 weeks until all 342 test cases are executed!**

---

## Customizations (Optional)

### **Skip Day 1 Onboarding**
Add this line to the prompt:
```
ASSUMPTION: Day 1 onboarding is already complete. Skip to test execution.
```

### **Execute Specific Tests**
Add this line to the prompt:
```
TODAY ONLY: Execute test cases TC-CLI-020 through TC-CLI-035 (ignore normal schedule).
```

### **Focus on Bug Investigation**
Add this line to the prompt:
```
PRIORITY: Investigate and reproduce Bug ID BUG-003 before continuing test execution.
```

### **Generate Weekly Report Only**
Replace the master prompt with this shorter version:
```
You are a senior QA engineer. Generate the weekly progress report for Week [N].

Read:
- tests/docs/templates/WEEKLY-PROGRESS-REPORT.md (template)
- tests/docs/templates/TEST-EXECUTION-TRACKING.csv (test results)
- tests/docs/templates/BUG-TRACKING-TEMPLATE.csv (bug data)
- tests/docs/BASELINE-METRICS.md (baseline comparison)

Fill in ALL sections with actual data. Save report as:
tests/docs/reports/WEEK-[N]-PROGRESS-REPORT-2025-11-[DD].md

Start now.
```

---

**Pro Tip**: Bookmark this page and copy-paste the master prompt every morning. The LLM will handle the rest! 🚀
