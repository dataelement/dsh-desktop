# LLM QA Testing Prompts Library

**Purpose**: Ready-to-use prompts for directing LLM assistants to execute specific QA tasks.

**Last Updated**: 2025-11-09

---

## Quick Navigation

1. [Day 1 Onboarding](#day-1-onboarding)
2. [Weekly Execution](#weekly-execution)
3. [Daily Progress](#daily-progress)
4. [Bug Investigation](#bug-investigation)
5. [Weekly Reporting](#weekly-reporting)
6. [Emergency Escalation](#emergency-escalation)

---

## Day 1 Onboarding

### Initial Setup
```
You are a senior QA engineer with 20+ years of experience at Google. Help me set up the QA testing environment.

CRITICAL: Follow the Day 1 onboarding checklist exactly as documented.

Read and execute: tests/docs/templates/DAY-1-ONBOARDING-CHECKLIST.md

Start with Hour 1 (Environment Setup). Complete each hour sequentially. Do NOT skip any steps. After completing each hour, confirm what you did and ask if you should continue.

Report any blockers immediately.
```

### Verify Setup Completion
```
Verify that my Day 1 QA onboarding is complete by checking:

1. All database containers are healthy (docker ps)
2. Database has seeded data (SELECT COUNT(*) FROM <table>)
3. Test users created (regular, admin, moderator)
4. CLI installed (if applicable) - global and/or local
5. Dev server running at http://localhost:8080
6. First test case executed successfully

Read tests/docs/templates/DAY-1-ONBOARDING-CHECKLIST.md section "Day 1 Completion Checklist" and verify ALL items are checked.

If anything is missing, tell me what needs to be fixed and how to fix it.
```

---

## Weekly Execution

### Week 1: Start Testing
```
You are a senior QA engineer executing Week 1 of the QA test plan.

CRITICAL: Follow the test plan exactly as documented.

Read: tests/docs/02-CLI-TEST-CASES.md (or appropriate test category document)

Your task today (Monday, Week 1):
- Execute test cases TC-CLI-001 through TC-CLI-015 (15 tests)
- Update tests/docs/templates/TEST-EXECUTION-TRACKING.csv after EACH test
- File bugs in tests/docs/templates/BUG-TRACKING-TEMPLATE.csv for any failures
- Expected time: 5 hours

Execute tests in order. For each test:
1. Read the full test case specification
2. Execute all test steps exactly as documented
3. Record result in TEST-EXECUTION-TRACKING.csv immediately
4. If test fails, create bug report in BUG-TRACKING-TEMPLATE.csv before moving to next test

After completing all 15 tests, give me a summary:
- How many passed/failed/blocked
- Bug IDs filed (if any)
- Any blockers for tomorrow
```

### Daily Continuation
```
Continue Week [N] testing.

Read: tests/docs/[CATEGORY]-TEST-CASES.md

Today's test cases: TC-[CATEGORY]-[START] through TC-[CATEGORY]-[END] ([N] tests)

Follow the same process as yesterday:
1. Execute each test exactly as documented
2. Update TEST-EXECUTION-TRACKING.csv immediately after each test
3. File bugs for any failures
4. Give me end-of-day summary

Start now.
```

### Friday - Week Completion
```
Complete Week [N] testing and submit weekly progress report.

Tasks:
1. Execute remaining tests: TC-[CATEGORY]-[START] through TC-[CATEGORY]-[END] ([N] tests)
2. Update TEST-EXECUTION-TRACKING.csv for all completed tests
3. Generate weekly progress report using tests/docs/templates/WEEKLY-PROGRESS-REPORT.md

For the weekly report:
- Calculate pass rate for Week [N] (passed / total executed)
- Summarize all bugs filed this week (by severity: P0/P1/P2/P3)
- Compare against baseline: tests/docs/BASELINE-METRICS.md
- Assess quality gates: Are we on track for 80% pass rate?
- Plan for Week [N+1]

Submit the completed WEEKLY-PROGRESS-REPORT.md.
```

---

## Daily Progress

### Morning Standup
```
Daily standup for QA testing.

Current status:
- Week: [1-5]
- Day: [Monday-Friday]
- Yesterday's progress: [X] tests executed, [Y] passed, [Z] failed
- Blockers: [None / List blockers]

Today's plan:
- Test cases: TC-[XXX]-[YYY] to TC-[XXX]-[ZZZ] ([N] tests)
- Expected time: [X] hours
- Prerequisites: [Any setup needed]

Read today's test cases from the appropriate document and confirm you're ready to start.
```

### Mid-Day Progress Check
```
Give me a mid-day progress update.

How many test cases have you completed so far today?
How many passed vs failed?
Any bugs filed? (provide Bug IDs)
Any blockers preventing you from continuing?
Are you on track to finish today's test cases?

Update: tests/docs/templates/TEST-EXECUTION-TRACKING.csv with latest results before answering.
```

### End-of-Day Summary
```
Provide end-of-day summary for QA testing.

Today's results:
- Test cases executed: [X] / [Y] planned
- Pass rate: [Z]%
- Bugs filed: [List Bug IDs with severity]
- Test execution tracking updated: Yes/No
- Bug reports filed: Yes/No

Tomorrow's plan:
- Test cases: TC-[XXX]-[YYY] to TC-[XXX]-[ZZZ]
- Prerequisites: [Any setup needed]
- Estimated time: [X] hours

Blockers:
- [None / List blockers]

If you didn't finish today's test cases, explain why and how you'll catch up.
```

---

## Bug Investigation

### Investigate Test Failure
```
A test case failed. I need you to investigate the root cause.

Test Case: TC-[CATEGORY]-[NUMBER]
Expected Result: [Copy from test case spec]
Actual Result: [What happened]

Your investigation:
1. Re-run the test case exactly as documented
2. Capture detailed logs, screenshots, network traces
3. Check if this is a test environment issue vs real bug
4. Determine severity: P0/P1/P2/P3/P4
5. Search for similar issues in existing bug reports

If confirmed as a bug:
- Create bug report in BUG-TRACKING-TEMPLATE.csv
- Assign unique Bug ID (BUG-XXX)
- Complete ALL fields (Steps to Reproduce, Environment, Screenshots, etc.)
- Update TEST-EXECUTION-TRACKING.csv with Bug ID reference

If NOT a bug (e.g., environment issue):
- Fix the environment issue
- Re-run the test
- Update TEST-EXECUTION-TRACKING.csv with PASS result

Report your findings.
```

### Reproduce Bug from Report
```
I need you to reproduce a bug to verify it's still an issue.

Bug ID: BUG-[XXX]
Read: tests/docs/templates/BUG-TRACKING-TEMPLATE.csv (find Bug ID BUG-[XXX])

Steps:
1. Read the full bug report (Steps to Reproduce, Environment, etc.)
2. Set up the exact same environment
3. Execute the steps to reproduce exactly as documented
4. Verify you get the same Actual Result

If bug reproduces:
- Confirm "Yes, bug still exists"
- Add verification note to bug report

If bug does NOT reproduce:
- Explain what's different (environment, data, timing, etc.)
- Mark bug as "Cannot Reproduce" or "Fixed"

Report your findings.
```

### Root Cause Analysis
```
Perform root cause analysis for a critical bug.

Bug ID: BUG-[XXX] (P0 or P1 severity)

Your analysis:
1. Understand the symptom (what the user sees)
2. Trace the data flow (where does the failure occur?)
3. Identify the root cause (what line of code / configuration is wrong?)
4. Assess impact (how many users affected? data loss? security risk?)
5. Propose fix (what needs to change to resolve this?)
6. Estimate fix complexity (hours/days to implement)

Read the relevant codebase files.
Check database state.
Review logs.

Document your findings in the bug report under "Root Cause Analysis" section.
```

---

## Weekly Reporting

### Generate Weekly Progress Report
```
Generate the weekly progress report for Week [1-5].

Read: tests/docs/templates/WEEKLY-PROGRESS-REPORT.md (use this template)

Data sources:
- tests/docs/templates/TEST-EXECUTION-TRACKING.csv (for test execution stats)
- tests/docs/templates/BUG-TRACKING-TEMPLATE.csv (for bug stats)
- tests/docs/BASELINE-METRICS.md (for comparison)

Fill in ALL sections:
1. Executive Summary (tests executed, pass rate, bugs found, blockers, on track status)
2. Test Execution Progress (table by category)
3. Bugs Filed This Week (P0/P1 highlights + summary table)
4. Test Execution Highlights (what went well, challenges, findings)
5. Quality Metrics (pass rate trend, bug discovery rate, test velocity)
6. Environment & Infrastructure (any issues?)
7. Next Week Plan (objectives, deliverables, risks)
8. Resource Needs (blockers, questions)
9. Release Readiness Assessment (quality gates status)

Calculate all metrics from actual data. Do NOT make up numbers.

Save the report as: tests/docs/reports/WEEK-[N]-PROGRESS-REPORT-2025-11-[DD].md
```

### Compare Against Baseline
```
Compare current QA progress against the pre-QA baseline.

Read:
- tests/docs/BASELINE-METRICS.md (pre-QA state)
- tests/docs/templates/TEST-EXECUTION-TRACKING.csv (current state)
- tests/docs/templates/BUG-TRACKING-TEMPLATE.csv (bugs found)

Analysis:
1. Test execution: Baseline had [X] unit tests passing. How many total tests do we have now?
2. Pass rate: What's our QA test pass rate vs baseline pass rate?
3. Bugs discovered: Baseline started with [X] P0 bugs. How many P0/P1/P2/P3 bugs have we found?
4. Quality gates: Are we on track to meet 80% pass rate, zero P0 bugs policy?
5. Security: Have we maintained OWASP coverage?

Provide a comparison table showing:
- Metric | Baseline (YYYY-MM-DD) | Current (YYYY-MM-DD) | Delta | Status

Are we improving or regressing? What actions are needed?
```

---

## Emergency Escalation

### Escalate Critical Bug (P0)
```
URGENT: A P0 (Blocker) bug has been discovered.

Test Case: TC-[CATEGORY]-[NUMBER]
Bug ID: BUG-[XXX]
Severity: P0 (Blocks release, requires 24-hour fix)

Issue: [Brief description]

Immediate actions:
1. Stop all other testing immediately
2. Create detailed bug report in BUG-TRACKING-TEMPLATE.csv
3. Include:
   - Detailed steps to reproduce
   - Screenshots/videos of the issue
   - Full error logs
   - Environment details (OS, browser, Node version, etc.)
   - Impact assessment (how many users affected?)
   - Proposed workaround (if any)
4. Mark test case as "Blocked" in TEST-EXECUTION-TRACKING.csv
5. Notify:
   - QA Lead
   - Engineering Lead
   - Product Manager

Draft escalation email:

Subject: [P0 BLOCKER] [Brief description]

Body:
- What: [Issue description]
- When: [When discovered]
- Impact: [Severity and user impact]
- Test Case: TC-[XXX]-[YYY]
- Bug ID: BUG-[XXX]
- Next Steps: [What needs to happen to fix]
- ETA: [Expected fix time - must be within 24 hours]

Generate the bug report and escalation email now.
```

### Resolve Blocker
```
A blocker has been resolved. I need you to verify the fix.

Bug ID: BUG-[XXX] (previously P0 blocker)
Status: Engineering reports "Fixed"
Test Case: TC-[CATEGORY]-[NUMBER] (originally failed)

Verification steps:
1. Read the bug report in BUG-TRACKING-TEMPLATE.csv
2. Understand what was fixed (check git commit if available)
3. Re-run the original test case exactly as documented
4. Verify the Expected Result now matches Actual Result

If fix is verified:
- Update BUG-TRACKING-TEMPLATE.csv:
  - Status: "Closed"
  - Resolution: "Fixed - Verified"
  - Resolved Date: [Today's date]
  - Verified By: [Your name/ID]
  - Verification Date: [Today's date]
- Update TEST-EXECUTION-TRACKING.csv:
  - Result: "PASS"
  - Notes: "Re-tested after BUG-[XXX] fix, now passing"

If fix is NOT verified (bug still exists):
- Update bug status: "Reopened"
- Add comment: "Fix verification failed - bug still reproduces"
- Re-escalate to Engineering Lead

Report verification results.
```

### Environment Issues
```
The test environment is broken. I need you to diagnose and fix it.

Symptoms: [Describe what's not working]

Diagnostic steps:
1. Check database containers: docker ps | grep <db-name>
   - Are all containers running and healthy?
2. Check database connection: docker exec <container-name> psql -U postgres -d postgres -c "SELECT 1;"
   - Can you connect to the database?
3. Check data: docker exec <container-name> psql -U postgres -d postgres -c "SELECT COUNT(*) FROM <table>;"
   - Does the database still have seeded data?
4. Check dev server: curl http://localhost:8080
   - Is the dev server responding?
5. Check CLI (if applicable): ccpm --version
   - Is the CLI installed and working?

Refer to: tests/docs/templates/DAY-1-ONBOARDING-CHECKLIST.md section "Troubleshooting Common Day 1 Issues"

If you can fix the issue:
- Execute the fix
- Document what was broken and how you fixed it
- Verify the environment is fully operational
- Resume testing

If you cannot fix the issue:
- Document all diagnostic findings
- Escalate to Environment Engineer
- Mark affected tests as "Blocked" in TEST-EXECUTION-TRACKING.csv

Start diagnostics now.
```

---

## Best Practices for Using These Prompts

### 1. Always Provide Context
Include relevant context before the prompt:
- Current week/day
- Previous day's results
- Known blockers
- Environment status

### 2. Be Specific
Replace all template variables with actual values:
- `[CATEGORY]`: CLI / WEB / API / SEC
- `[NUMBER]`: Test case number (e.g., 001, 015)
- `[N]`: Number of tests
- `[XXX]`: Bug ID number

### 3. Reference Documentation
Always point the LLM to specific documentation files:
- Test case specs: `tests/docs/02-CLI-TEST-CASES.md`
- Test strategy: `tests/docs/01-TEST-STRATEGY.md`
- Tracking: `tests/docs/templates/TEST-EXECUTION-TRACKING.csv`

### 4. Enforce Tracking
Always require the LLM to update tracking templates **immediately** after each test. Don't allow batch updates at end of day.

### 5. Verify Results
Ask the LLM to show you the updated CSV/Markdown files after making changes. Verify the data is correct.

### 6. Escalate Blockers
If the LLM reports a P0 bug or blocker, stop all other work and focus on that issue first.

---

## Common Mistakes to Avoid

### ❌ Mistake 1: Vague Prompts
**Bad**: "Do some QA testing for me"
**Good**: "Execute CLI test cases TC-CLI-001 through TC-CLI-015 following tests/docs/02-CLI-TEST-CASES.md. Update TEST-EXECUTION-TRACKING.csv after each test."

### ❌ Mistake 2: Skipping Tracking
**Bad**: "Run all the CLI tests and tell me the results"
**Good**: "Execute TC-CLI-001. Update TEST-EXECUTION-TRACKING.csv with result. Then execute TC-CLI-002. Update CSV. Repeat for all tests."

### ❌ Mistake 3: Not Specifying Documentation
**Bad**: "Test the install command"
**Good**: "Execute test case TC-CLI-001 from tests/docs/02-CLI-TEST-CASES.md. Follow the exact steps documented."

### ❌ Mistake 4: Allowing Deviations
**Bad**: "Test the CLI however you think is best"
**Good**: "Execute ONLY the test cases documented in tests/docs/02-CLI-TEST-CASES.md. Do NOT add your own test cases. Do NOT skip test cases."

### ❌ Mistake 5: Batching Updates
**Bad**: "Run 15 tests and then update the tracking CSV"
**Good**: "Execute TC-CLI-001. Update TEST-EXECUTION-TRACKING.csv immediately. Then execute TC-CLI-002. Update CSV immediately. Repeat."

---

## Troubleshooting

### LLM Not Following Test Plan
```
CRITICAL: You are deviating from the documented test plan.

STOP all current work.

Re-read: tests/docs/README.md

You MUST:
1. Follow the exact test case specifications
2. Execute test steps in the documented order
3. Update TEST-EXECUTION-TRACKING.csv after EACH test (not in batches)
4. File bugs in BUG-TRACKING-TEMPLATE.csv for any failures
5. NOT add your own test cases
6. NOT skip test cases
7. NOT modify test case priorities without approval

Acknowledge that you understand these requirements and will follow the documented test plan exactly.

Then resume testing from where you left off.
```

### LLM Providing Incorrect Results
```
The test results you reported do not match my manual verification.

Test Case: TC-[CATEGORY]-[NUMBER]
Your Result: [PASS / FAIL]
My Result: [PASS / FAIL]

Re-execute this test case step-by-step:
1. Read the full test case spec from tests/docs/[DOCUMENT].md
2. Show me each test step as you execute it
3. Show me the actual output/result after each step
4. Compare the actual result to the expected result
5. Determine PASS/FAIL based on documented criteria (not your assumptions)

Be precise. Use exact command outputs, exact HTTP responses, exact UI text. Do NOT paraphrase or summarize.
```

---

**Document Version**: 1.0
**Last Updated**: 2025-11-09
**Feedback**: If you create new useful prompts, add them to this document.
