# 主 QA 提示词 — 一条命令实现自主执行

**目的**：只需复制粘贴一条提示词，即可指导 LLM 自主执行整个 QA 测试计划。

**创新点**：比手动测试快 100 倍 + 追踪零人为错误 + 支持自动续接。

---

## ⭐ 主提示词

将此提示词复制粘贴到你的 LLM 对话中，LLM 会自动处理一切。

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

## 工作原理

### **步骤 1：评估当前状态**（2 分钟）
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

### **步骤 2：执行首日入职**（如尚未完成）
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

### **步骤 3：执行每日测试**（首日完成后）
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

### **步骤 4：每周报告**（如为周五）
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

## 自动续接能力

如果 LLM 对话被中断或需要暂停，只需重新粘贴主提示词即可。

LLM 会：
1. ✅ 读取 TEST-EXECUTION-TRACKING.csv
2. ✅ 找到最后完成的测试用例
3. ✅ 从下一条测试用例开始继续
4. ✅ 完全从中断处恢复

**示例**：
```
Current State Detected:
- Last completed test: TC-CLI-042
- Current week: Week 1 (CLI Testing)
- Current day: Wednesday
- Remaining today: TC-CLI-043 through TC-CLI-045 (3 tests)

Resuming from TC-CLI-043...
```

---

## 质量门禁监控

LLM 自动检查质量门禁，偏离目标时发出提醒：

### **通过率检查**（每日）
```
Quality Gate: Pass Rate ≥80%
Current: 91% ✅ PASSING
Status: On track
```

### **P0 缺陷检查**（每日）
```
Quality Gate: Zero P0 Bugs
Current: 0 P0 bugs ✅ PASSING
Status: Maintained
```

### **代码覆盖率检查**（每周）
```
Quality Gate: ≥80% Coverage
Current: 76% ⚠️ BELOW TARGET
Status: Need 4% improvement
Action: Add unit tests for uncovered modules
```

### **发版就绪评估**（第 5 周结束）
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

## 紧急情况处理

### **发现 P0 缺陷**
如果 LLM 发现 P0 缺陷，它会：
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

### **环境故障**
如果环境出现故障，LLM 会：
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

## 自动更新的文件

运行主提示词时，以下文件会自动更新：

| 文件 | 更新频率 | 更新内容 |
|------|------------------|-------------------|
| **TEST-EXECUTION-TRACKING.csv** | 每条测试后 | 状态、结果、缺陷 ID、执行日期、备注 |
| **BUG-TRACKING-TEMPLATE.csv** | 测试失败时 | 新缺陷条目（缺陷 ID、严重级别、复现步骤等） |
| **WEEKLY-PROGRESS-REPORT.md** | 每周五 | 周总结、指标、质量门禁、下周计划 |
| **tests/docs/reports/** | 每周五 | 创建新的周报文件 |

**你不需要手动更新任何内容！** LLM 会自动处理所有追踪工作。

---

## 成功标准

使用主提示词 5 周后，你应该获得：

✅ **全部 342 条测试用例已执行**（100% 完成）
✅ **TEST-EXECUTION-TRACKING.csv 完全填充**（342 行均有结果）
✅ **缺陷已记录**在 BUG-TRACKING-TEMPLATE.csv 中（含 P0-P4 分级）
✅ **5 份周进度报告**（每周一份，存于 `tests/docs/reports/`）
✅ **质量门禁达标**（≥80% 通过率、零 P0 缺陷、≥80% 覆盖率）
✅ **发版就绪评估**（基于客观标准的 Go/No-Go 决策）

---

## 每日工作流示例

### **第 1 天（首次使用）**
```
你：[粘贴主提示词]

LLM：
  当前状态：尚未进行任何测试
  操作：开始首日入职
  [执行 5 小时入职清单]
  结果：✅ 首日完成，准备好进入第一周的周一
```

### **第 2 天（第一周，周一）**
```
你：[粘贴主提示词]

LLM：
  当前状态：首日完成，第一周未开始
  操作：执行 TC-CLI-001 到 TC-CLI-015（15 条测试）
  [执行 15 条 CLI 测试，每条后更新 CSV]
  结果：14 条通过，1 条失败，1 个缺陷已提交
```

### **第 3 天（第一周，周二）**
```
你：[粘贴主提示词]

LLM：
  当前状态：最后完成 TC-CLI-015
  操作：执行 TC-CLI-016 到 TC-CLI-030（15 条测试）
  [从上次中断处继续]
  结果：15 条通过，0 条失败
```

### **第 6 天（第一周，周五）**
```
你：[粘贴主提示词]

LLM：
  当前状态：最后完成 TC-CLI-077
  操作：执行 TC-CLI-078 到 TC-CLI-093（16 条测试）+ 周报
  [完成第一周测试，生成周报]
  结果：第一周完成（93/93 条），91% 通过率，8 个缺陷
```

### **第 8 天（第二周，周一）**
```
你：[粘贴主提示词]

LLM：
  当前状态：第一周完成，第二周未开始
  操作：执行 TC-WEB-001 到 TC-WEB-015（15 条测试）
  [自动切换到 Web 测试]
  结果：13 条通过，2 条失败，2 个缺陷已提交
```

**这将持续 5 周，直到所有 342 条测试用例全部执行完毕！**

---

## 自定义选项（可选）

### **跳过首日入职**
在提示词中添加：
```
ASSUMPTION: Day 1 onboarding is already complete. Skip to test execution.
```

### **执行特定测试**
在提示词中添加：
```
TODAY ONLY: Execute test cases TC-CLI-020 through TC-CLI-035 (ignore normal schedule).
```

### **优先排查缺陷**
在提示词中添加：
```
PRIORITY: Investigate and reproduce Bug ID BUG-003 before continuing test execution.
```

### **仅生成周报**
用以下简短版本替换主提示词：
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

**小贴士**：将此页加入书签，每天早上复制粘贴主提示词。LLM 会搞定剩下的一切！🚀
