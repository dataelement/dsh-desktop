# LLM QA 测试提示词库

**目的**：可直接使用的提示词集合，用于指导 LLM 助手执行特定的 QA 任务。

**最后更新**：2025-11-09

---

## 快速导航

1. [首日入职](#首日入职)
2. [每周执行](#每周执行)
3. [每日进度](#每日进度)
4. [缺陷排查](#缺陷排查)
5. [每周报告](#每周报告)
6. [紧急升级](#紧急升级)

---

## 首日入职

### 初始化搭建
```
You are a senior QA engineer with 20+ years of experience at Google. Help me set up the QA testing environment.

CRITICAL: Follow the Day 1 onboarding checklist exactly as documented.

Read and execute: tests/docs/templates/DAY-1-ONBOARDING-CHECKLIST.md

Start with Hour 1 (Environment Setup). Complete each hour sequentially. Do NOT skip any steps. After completing each hour, confirm what you did and ask if you should continue.

Report any blockers immediately.
```

### 验证搭建完成
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

## 每周执行

### 第一周：开始测试
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

### 每日继续
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

### 周五 — 本周收尾
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

## 每日进度

### 早会
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

### 午间进度检查
```
Give me a mid-day progress update.

How many test cases have you completed so far today?
How many passed vs failed?
Any bugs filed? (provide Bug IDs)
Any blockers preventing you from continuing?
Are you on track to finish today's test cases?

Update: tests/docs/templates/TEST-EXECUTION-TRACKING.csv with latest results before answering.
```

### 每日总结
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

## 缺陷排查

### 调查测试失败
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

### 复现已知缺陷
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

### 根因分析
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

## 每周报告

### 生成每周进度报告
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

### 与基线对比
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

## 紧急升级

### 升级严重缺陷（P0）
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

### 验证阻塞项修复
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

### 环境故障
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

## 使用这些提示词的最佳实践

### 1. 始终提供上下文
在提示词前附带相关上下文：
- 当前周/天
- 前一天的结果
- 已知阻塞项
- 环境状态

### 2. 要具体
将所有模板变量替换为实际值：
- `[CATEGORY]`：CLI / WEB / API / SEC
- `[NUMBER]`：测试用例编号（如 001、015）
- `[N]`：测试数量
- `[XXX]`：缺陷 ID 编号

### 3. 引用文档
始终指明 LLM 应参考的具体文档：
- 测试规格：`tests/docs/02-CLI-TEST-CASES.md`
- 测试策略：`tests/docs/01-TEST-STRATEGY.md`
- 追踪表：`tests/docs/templates/TEST-EXECUTION-TRACKING.csv`

### 4. 强制追踪
始终要求 LLM 在**每条测试后立即**更新追踪模板。不允许下班前批量更新。

### 5. 验证结果
要求 LLM 在修改后展示更新后的 CSV/Markdown 文件。确认数据正确。

### 6. 升级阻塞项
如果 LLM 报告了 P0 缺陷或阻塞项，停止其他所有工作，优先处理该问题。

---

## 常见错误

### ❌ 错误 1：提示词含糊
**不好**："帮我做些 QA 测试"
**好**："执行 CLI 测试用例 TC-CLI-001 到 TC-CLI-015，参照 tests/docs/02-CLI-TEST-CASES.md。每条测试后更新 TEST-EXECUTION-TRACKING.csv。"

### ❌ 错误 2：跳过追踪
**不好**："执行所有 CLI 测试然后告诉我结果"
**好**："执行 TC-CLI-001。更新 TEST-EXECUTION-TRACKING.csv。然后执行 TC-CLI-002。更新 CSV。对所有测试重复此过程。"

### ❌ 错误 3：未指定文档
**不好**："测试一下安装命令"
**好**："执行 tests/docs/02-CLI-TEST-CASES.md 中的测试用例 TC-CLI-001。严格按文档步骤操作。"

### ❌ 错误 4：允许偏离
**不好**："按你觉得最好的方式测试 CLI"
**好**："仅执行 tests/docs/02-CLI-TEST-CASES.md 中记录的测试用例。不要自行添加测试。不要跳过测试。"

### ❌ 错误 5：批量更新
**不好**："执行 15 条测试然后再更新追踪 CSV"
**好**："执行 TC-CLI-001。立即更新 TEST-EXECUTION-TRACKING.csv。然后执行 TC-CLI-002。立即更新 CSV。重复此过程。"

---

## 故障排除

### LLM 未遵循测试计划
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

### LLM 报告了不正确的结果
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

**文档版本**：1.0
**最后更新**：2025-11-09
**反馈**：如果你创建了新的实用提示词，请添加到本文档中。
