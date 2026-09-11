---
name: software-testing-guide
description: "建立全面的软件QA测试流程，包括制定测试策略、按照Google AAA标准编写测试用例、执行测试计划、使用P0-P4分级追踪缺陷、计算质量指标（如通过率与覆盖率）以及生成每日/每周进度报告。提供完整的文档模板，可直接用于外包团队交接，并实施OWASP安全测试，以90%的覆盖率为目标。当用户提到搭建QA流程、编写测试用例、制定测试计划、追踪缺陷（P0-P4）、计算质量指标、生成QA报告、进行安全测试或准备外包交接时触发。"
keywords: [qa, testing, test-cases, bug-tracking, google-standards, owasp, security, automation, quality-gates, metrics]
---

# 软件测试指南

基于 Google 测试标准和 OWASP 安全最佳实践，为任何软件项目建立世界级的 QA 测试流程。

## 何时使用此 Skill

在以下场景中触发此 Skill：
- 为新项目或已有项目搭建 QA 基础设施
- 编写标准化测试用例（符合 AAA 模式）
- 执行测试计划并进行进度跟踪
- 实施安全测试（OWASP Top 10）
- 按严重级别提交缺陷（P0-P4）
- 生成 QA 报告（每日摘要、每周进度）
- 计算质量指标（通过率、覆盖率、质量门禁）
- 准备 QA 文档用于外包团队交接
- 启用 LLM 驱动的自主测试执行

## 快速开始

**一键初始化**：
```bash
python scripts/init_qa_project.py <项目名称> [输出目录]
```

**创建的内容**：
- 目录结构（`tests/docs/`、`tests/e2e/`、`tests/fixtures/`）
- 追踪表格（`TEST-EXECUTION-TRACKING.csv`、`BUG-TRACKING-TEMPLATE.csv`）
- 文档模板（`BASELINE-METRICS.md`、`WEEKLY-PROGRESS-REPORT.md`）
- 用于自主执行的主 QA 提示词
- 包含完整快速入门指引的 README

**自主执行**（推荐）：参见 `references/master_qa_prompt.md`，只需复制粘贴即可获得 100 倍效率提升。

## 核心功能

### 1. QA 项目初始化

一键初始化完整的 QA 基础设施及所有模板：

```bash
python scripts/init_qa_project.py <项目名称> [输出目录]
```

创建目录结构、追踪表格、文档模板以及用于自主执行的主提示词。

**适用场景**：从零开始搭建 QA 流程，或将现有流程迁移为结构化 QA 体系。

### 2. 测试用例编写

按照 AAA 模式（准备-执行-断言）编写标准化、可复现的测试用例：

1. 阅读模板：`assets/templates/TEST-CASE-TEMPLATE.md`
2. 遵循结构：前置条件（准备）→ 测试步骤（执行）→ 预期结果（断言）
3. 分配优先级：P0（阻塞）→ P4（低）
4. 包含边界场景和潜在缺陷

**测试用例格式**：TC-[分类]-[编号]（例如 TC-CLI-001、TC-WEB-042、TC-SEC-007）

**参考文档**：详见 `references/google_testing_standards.md`，了解完整的 AAA 模式指南和覆盖率阈值。

### 3. 测试执行与跟踪

**唯一真实来源原则**（关键）：
- **测试用例文档**（如 `02-CLI-TEST-CASES.md`）= **权威来源**，用于查看测试步骤
- **追踪 CSV** = 仅记录执行状态（不要依赖 CSV 获取测试规格）
- 详见 `references/ground_truth_principle.md`，了解如何避免文档/CSV 不同步问题

**手动执行**：
1. 从分类文档中读取测试用例（如 `02-CLI-TEST-CASES.md`）← **必须从这里开始**
2. 严格按文档执行测试步骤
3. **每执行完一条测试后立即**更新 `TEST-EXECUTION-TRACKING.csv`（禁止批量更新）
4. 测试失败时在 `BUG-TRACKING-TEMPLATE.csv` 中提交缺陷

**自主执行**（推荐）：
1. 从 `references/master_qa_prompt.md` 复制主提示词
2. 粘贴到 LLM 会话中
3. LLM 自动执行测试、自动跟踪、自动提缺陷、自动生成报告

**创新优势**：效率提升 100 倍 + 追踪零人为错误 + 支持自动续接。

### 4. 缺陷报告

按严重级别分类提交缺陷：

**必填字段**：
- 缺陷 ID：顺序编号（BUG-001、BUG-002……）
- 严重级别：P0（24 小时内修复）→ P4（可选修复）
- 复现步骤：编号列出，具体明确
- 环境信息：操作系统、版本号、配置

**严重级别分类**：
- **P0（阻塞）**：安全漏洞、核心功能不可用、数据丢失
- **P1（严重）**：主要功能异常但有临时方案
- **P2（高）**：次要功能问题、边界场景
- **P3（中）**：界面外观问题
- **P4（低）**：文档错别字

**参考**：完整模板及示例见 `BUG-TRACKING-TEMPLATE.csv`。

### 5. 质量指标计算

计算全面的 QA 指标并检查质量门禁状态：

```bash
python scripts/calculate_metrics.py <TEST-EXECUTION-TRACKING.csv 路径>
```

**指标面板包含**：
- 测试执行进度（X/Y 条测试，Z% 完成）
- 通过率（通过数/已执行数 %）
- 缺陷分析（去重缺陷数、P0/P1/P2 分布）
- 质量门禁状态（✅/❌ 逐项展示）

**质量门禁**（全部通过方可发版）：
| 门禁 | 目标值 | 是否阻塞发版 |
|------|--------|-------------|
| 测试执行率 | 100% | 是 |
| 通过率 | ≥80% | 是 |
| P0 缺陷 | 0 | 是 |
| P1 缺陷 | ≤5 | 是 |
| 代码覆盖率 | ≥80% | 是 |
| 安全覆盖率 | 90% OWASP | 是 |

### 6. 进度报告

为利益相关方生成 QA 报告：

**每日摘要**（每日下班前）：
- 已执行测试数、通过率、已提缺陷数
- 阻塞项（或无）
- 次日计划

**每周报告**（每周五）：
- 使用模板：`WEEKLY-PROGRESS-REPORT.md`（由初始化脚本创建）
- 与基线对比：`BASELINE-METRICS.md`
- 评估质量门禁和趋势

**参考**：详见 `references/llm_prompts_library.md`，包含 30+ 现成可用的报告提示词。

### 7. 安全测试（OWASP）

实施 OWASP Top 10 安全测试：

**覆盖目标**：
1. **A01：访问控制缺陷** - RLS 绕过、权限提升
2. **A02：加密失败** - 令牌加密、密码哈希
3. **A03：注入攻击** - SQL 注入、XSS、命令注入
4. **A04：不安全设计** - 限流、异常检测
5. **A05：安全配置错误** - 详细错误信息、默认凭据
6. **A07：认证失败** - 会话劫持、CSRF
7. **其他**：数据完整性、日志记录、SSRF

**目标**：90% OWASP 覆盖率（10 项威胁中缓解 9 项）。

每个安全测试均遵循 AAA 模式，并记录具体的攻击向量。

## 首日入职指南

为新加入项目的 QA 工程师提供 5 小时入职指南：

**阅读**：`references/day1_onboarding.md`

**时间安排**：
- 第 1 小时：环境搭建（数据库、开发服务器、依赖安装）
- 第 2 小时：文档学习（测试策略、质量门禁）
- 第 3 小时：测试数据准备（用户、CLI、开发者工具）
- 第 4 小时：执行第一条测试用例
- 第 5 小时：团队入职和第一周计划

**检查点**：第一天结束时，环境运行正常、第一条测试已执行、为第一周做好准备。

## 自主执行（⭐ 推荐）

通过一条主提示词启用 LLM 驱动的自主 QA 测试：

**阅读**：`references/master_qa_prompt.md`

**功能特点**：
- 自动续接：从上次完成的测试继续（读取追踪 CSV）
- 自动执行：按周次计划执行测试用例（第 1-5 周递进）
- 自动跟踪：每条测试后更新 CSV
- 自动提缺陷：为失败测试创建缺陷报告
- 自动生成报告：每日摘要、每周报告
- 自动升级 P0 缺陷：停止测试、通知利益相关方

**优势**：
- 比手动执行快 100 倍
- 追踪零人为错误
- 缺陷文档风格一致
- 进度实时可见

**使用方式**：复制主提示词，粘贴到 LLM，让它自主运行 5 周。

## 根据项目规模调整

### 小型项目（50 条测试）
- 周期：2 周
- 分类：2-3 个（如前端、后端）
- 每日：5-7 条测试
- 报告：仅每日摘要

### 中型项目（200 条测试）
- 周期：4 周
- 分类：4-5 个（CLI、Web、API、数据库、安全）
- 每日：10-12 条测试
- 报告：每日 + 每周

### 大型项目（500+ 条测试）
- 周期：8-10 周
- 分类：6-8 个（多个组件）
- 每日：10-15 条测试
- 报告：每日 + 每周 + 双周汇报

## 参考文档

查阅内置参考文档获取详细指南：

- **`references/day1_onboarding.md`** - 新 QA 工程师 5 小时入职指南
- **`references/master_qa_prompt.md`** - LLM 自主执行的一键命令（100 倍提速）
- **`references/llm_prompts_library.md`** - 30+ 现成可用的 QA 任务提示词
- **`references/google_testing_standards.md`** - AAA 模式、覆盖率阈值、快速失败校验
- **`references/ground_truth_principle.md`** - 防止文档/CSV 不同步问题（对测试套件完整性至关重要）

## 资源与模板

测试用例模板和缺陷报告格式：

- **`assets/templates/TEST-CASE-TEMPLATE.md`** - 包含 CLI 和安全测试示例的完整模板

## 脚本

QA 基础设施自动化脚本：

- **`scripts/init_qa_project.py`** - 一键初始化 QA 基础设施
- **`scripts/calculate_metrics.py`** - 生成质量指标面板

## 常见使用模式

### 模式 1：从零搭建 QA
```
1. python scripts/init_qa_project.py my-app ./
2. 填写 BASELINE-METRICS.md（记录当前状态）
3. 使用 assets/templates/TEST-CASE-TEMPLATE.md 编写测试用例
4. 从 references/master_qa_prompt.md 复制主提示词
5. 粘贴到 LLM → 自主执行启动
```

### 模式 2：LLM 驱动测试（自主执行）
```
1. 阅读 references/master_qa_prompt.md
2. 复制主提示词（一段话）
3. 粘贴到 LLM 对话中
4. LLM 在 5 周内执行全部 342 条测试用例
5. LLM 自动更新追踪 CSV
6. LLM 自动生成每周报告
```

### 模式 3：添加安全测试
```
1. 阅读 references/google_testing_standards.md（OWASP 部分）
2. 为每个 OWASP 威胁编写 TC-SEC-XXX 测试用例
3. 目标 90% 覆盖率（10 项中覆盖 9 项）
4. 在测试用例中记录缓解措施
```

### 模式 4：外包 QA 团队交接
```
1. 确保所有模板已填写
2. 确认 BASELINE-METRICS.md 完整
3. 打包 tests/docs/ 目录
4. 附带 references/master_qa_prompt.md 用于自主执行
5. QA 团队可立即上手（首日入职 → 5 周测试）
```

## 成功标准

此 Skill 在以下情况表明使用得当：
- ✅ 测试用例可由任何工程师复现
- ✅ 质量门禁可客观度量
- ✅ 缺陷有完整的复现步骤文档
- ✅ 进度实时可见（CSV 追踪）
- ✅ 自主执行已启用（LLM 可执行完整计划）
- ✅ 外包 QA 团队可立即开始测试
