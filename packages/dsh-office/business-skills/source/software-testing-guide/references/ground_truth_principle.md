# 唯一真实来源原则 — 防止文档同步问题

**目的**：防止因文档与追踪文件不一致导致的测试套件完整性问题。

**经验教训**：CCPM 项目曾发现 CSV 和文档之间的一致率仅为 3.2%（93 个测试 ID 中只有 3 个正确匹配）。

---

## 问题描述

### 常见反模式
项目中经常存在多个信息来源：
- 测试用例文档（如 `02-CLI-TEST-CASES.md`）
- 执行追踪 CSV（如 `TEST-EXECUTION-TRACKING.csv`）
- 缺陷追踪表
- 自动化测试代码

**可能出现的问题**：
1. 文档更新了 → CSV 没更新
2. CSV 基于旧测试列表自动生成 → 文档另外定稿
3. 按照 CSV 执行测试 → 实际执行了错误的测试步骤
4. 缺陷报告引用 CSV 中的 ID → 无法追溯到正确的测试

### 来自 CCPM 的真实案例

**CSV 中的 TC-CLI-012**："安装不存在的 Skill"
- 步骤：执行 `ccpm install this-skill-does-not-exist-12345`
- 预期：显示清晰的错误信息

**文档中的 TC-CLI-012**："安装已安装的 Skill"
- 步骤：执行 `ccpm install cloudflare-troubleshooting`（已安装）
- 预期：显示警告信息并提示 --force 参数

**结果**：完全不同的测试！QA 工程师可能执行了错误的测试，报告了不正确的结果。

---

## 唯一真实来源原则

### 规则 #1：单一信息来源

**明确声明哪个文件是权威来源**：

```
✅ 正确:
权威来源: 02-CLI-TEST-CASES.md（详细测试规格）
辅助文件: TEST-EXECUTION-TRACKING.csv（仅用于记录执行状态）

❌ 错误:
CSV 和文档都包含测试步骤（不一致不可避免）
```

### 规则 #2：职责明确分离

| 文件类型 | 用途 | 包含内容 | 更新时机 |
|-----------|---------|----------|--------------|
| **测试用例文档** | 测试规格 | 前置条件、步骤、预期结果、通过/失败标准 | 测试设计变更时 |
| **追踪 CSV** | 执行追踪 | 状态、结果、缺陷 ID、执行日期、备注 | 每次测试执行后 |
| **缺陷报告** | 失败记录 | 复现步骤、环境、严重级别、解决方案 | 测试失败时 |

### 规则 #3：明确引用

在指令中始终指定应查阅哪个文件：

**好的做法**：
```markdown
执行测试用例 TC-CLI-042:
1. 从 02-CLI-TEST-CASES.md（第 15-16 页）阅读完整测试规格
2. 严格按文档执行步骤
3. 在 TEST-EXECUTION-TRACKING.csv 的 TC-CLI-042 行更新结果
```

**不好的做法**：
```markdown
执行测试用例 TC-CLI-042（未说明参考哪个文档）
```

---

## 预防策略

### 策略 1：自动化 ID 校验

**脚本**：`validate_test_ids.py`（在项目中生成此脚本）

```python
#!/usr/bin/env python3
"""Validate test IDs between documentation and CSV"""

import csv
import re
from pathlib import Path

def extract_doc_ids(doc_path):
    """Extract all TC-XXX-YYY IDs from markdown documentation"""
    with open(doc_path, 'r') as f:
        content = f.read()
    pattern = r'TC-[A-Z]+-\d{3}'
    return set(re.findall(pattern, content))

def extract_csv_ids(csv_path):
    """Extract all Test Case IDs from CSV"""
    with open(csv_path, 'r') as f:
        reader = csv.DictReader(f)
        return set(row['Test Case ID'] for row in reader if row['Test Case ID'])

def validate_sync(doc_path, csv_path):
    """Check consistency between doc and CSV"""
    doc_ids = extract_doc_ids(doc_path)
    csv_ids = extract_csv_ids(csv_path)

    matching = doc_ids & csv_ids
    csv_only = csv_ids - doc_ids
    doc_only = doc_ids - csv_ids

    consistency_rate = len(matching) / len(csv_ids) * 100 if csv_ids else 0

    print(f"\n{'='*60}")
    print(f"Test ID Validation Report")
    print(f"{'='*60}\n")
    print(f"✅ Matching IDs:     {len(matching)}")
    print(f"⚠️  CSV-only IDs:     {len(csv_only)}")
    print(f"⚠️  Doc-only IDs:     {len(doc_only)}")
    print(f"\n📊 Consistency Rate: {consistency_rate:.1f}%\n")

    if consistency_rate < 100:
        print(f"❌ SYNC ISSUE DETECTED!\n")
        if csv_only:
            print(f"CSV IDs not in documentation: {sorted(csv_only)[:5]}")
        if doc_only:
            print(f"Doc IDs not in CSV: {sorted(doc_only)[:5]}")
    else:
        print(f"✅ Perfect sync!\n")

    return consistency_rate >= 95

if __name__ == "__main__":
    import sys
    if len(sys.argv) < 3:
        print("Usage: python validate_test_ids.py <doc-path> <csv-path>")
        sys.exit(1)

    doc_path = sys.argv[1]
    csv_path = sys.argv[2]

    valid = validate_sync(doc_path, csv_path)
    sys.exit(0 if valid else 1)
```

**使用方式**：
```bash
python scripts/validate_test_ids.py \
  tests/docs/02-CLI-TEST-CASES.md \
  tests/docs/templates/TEST-EXECUTION-TRACKING.csv

# Output:
# ============================================================
# Test ID Validation Report
# ============================================================
#
# ✅ Matching IDs:     3
# ⚠️  CSV-only IDs:     90
# ⚠️  Doc-only IDs:     0
#
# 📊 Consistency Rate: 3.2%
#
# ❌ SYNC ISSUE DETECTED!
```

### 策略 2：ID 映射文档

当检测到不匹配时，创建桥接文档：

**文件**：`tests/docs/TEST-ID-MAPPING.md`

**内容**：
```markdown
# Test ID Mapping - CSV vs. Documentation

## Ground Truth
**Official Source**: 02-CLI-TEST-CASES.md
**Tracking File**: TEST-EXECUTION-TRACKING.csv (execution tracking only)

## ID Mapping Table
| CSV ID | Doc ID | Test Name | Match Status |
|--------|--------|-----------|--------------|
| TC-CLI-001 | TC-CLI-001 | Install Skill by Name | ✅ Match |
| TC-CLI-012 | TC-CLI-008 | Install Non-Existent Skill | ❌ Mismatch |
```

### 策略 3：CSV 使用指南

为 QA 工程师创建明确的使用说明：

**文件**：`tests/docs/templates/CSV-USAGE-GUIDE.md`

**内容**：
```markdown
# TEST-EXECUTION-TRACKING.csv Usage Guide

## ✅ Correct Usage

1. **ALWAYS use test case documentation** as authoritative source for:
   - Test steps
   - Expected results
   - Prerequisites

2. **Use this CSV ONLY for**:
   - Tracking execution status
   - Recording results (PASSED/FAILED)
   - Linking to bug reports

## ❌ Don't Trust CSV for Test Specifications
```

---

## 恢复流程

当发现同步问题时：

### 步骤 1：评估严重程度
```bash
# Run ID validation script
python scripts/validate_test_ids.py <doc> <csv>

# Consistency Rate:
#   100%:   ✅ No action needed
#   90-99%: ⚠️  Minor fixes needed
#   50-89%: 🔴 Major sync required
#   <50%:   🚨 CRITICAL - regenerate CSV
```

### 步骤 2：创建桥接文档
```bash
# If consistency < 100%, create:
1. TEST-ID-MAPPING.md (maps CSV → Doc IDs)
2. CSV-USAGE-GUIDE.md (instructs QA engineers)
```

### 步骤 3：通知团队
```markdown
Subject: [URGENT] Test Suite Sync Issue - Read Before Testing

Team,

We discovered a test ID mismatch between CSV and documentation:
- Consistency Rate: 3.2% (only 3 out of 93 tests match)
- Impact: Tests executed based on CSV may use wrong steps
- Action Required: Read CSV-USAGE-GUIDE.md before continuing

Ground Truth: 02-CLI-TEST-CASES.md (always trust this)
Tracking Only: TEST-EXECUTION-TRACKING.csv

Bridge: TEST-ID-MAPPING.md (maps IDs)
```

### 步骤 4：重新验证已执行的测试
```markdown
修复前已执行的测试可能需要重新验证：
- TC-CLI-001~003: ✅ 正确（ID 匹配）
- TC-CLI-029: ⚠️  需对照文档 TC-CLI-029 验证
- TC-CLI-037: ⚠️  需对照文档 TC-CLI-037 验证
```

### 步骤 5：长期解决方案
**方案 A**：保持分离（在测试进行期间推荐）
- CSV = 仅用于执行追踪
- 文档 = 测试规格
- 映射文档弥补差异

**方案 B**：从文档重新生成 CSV（测试结束后）
- 风险：丢失执行历史
- 好处：完美同步
- 时机：当前测试周期结束后

---

## 最佳实践

### 应该做的 ✅

1. **项目启动时就声明权威来源**（写在 README 中）
2. **职责分离**：规格 vs. 追踪 vs. 缺陷
3. **定期校验 ID**（每周或重要里程碑前）
4. **记录偏差**到映射文件
5. **培训 QA 团队**了解唯一真实来源原则

### 不应该做的 ❌

1. ❌ 在多个文件中重复测试步骤
2. ❌ 不经校验就自动生成追踪文件
3. ❌ 仅凭 CSV 执行测试
4. ❌ 认为"只是追踪而已"— ID 很重要！
5. ❌ 忽略小幅不匹配（3% 会很快恶化到 50%）

---

## QA 项目搭建检查清单

使用 `init_qa_project.py` 时，确保：

- [ ] README 中已声明权威来源
- [ ] CSV 仅包含 ID + 追踪字段（无详细步骤）
- [ ] 生成 CSV 前测试用例文档已完成
- [ ] 项目中已添加 ID 校验脚本
- [ ] 模板目录中已包含 CSV 使用指南
- [ ] QA 工程师已培训，知道该信任哪个文件

---

## 与 software-testing-guide Skill 的集成

使用 `software-testing-guide` 初始化项目时：

```bash
python scripts/init_qa_project.py my-app ./

# This creates:
tests/docs/
  ├── README.md                        (declares ground truth)
  ├── 02-CLI-TEST-CASES.md            (authoritative specs)
  ├── TEST-ID-MAPPING.md              (if needed)
  └── templates/
      ├── TEST-EXECUTION-TRACKING.csv (tracking only)
      ├── CSV-USAGE-GUIDE.md          (usage instructions)
      └── validate_test_ids.py        (validation script)
```

---

## 成功标准

**测试套件完整性良好的标志**：
- ✅ ID 一致率 ≥ 95%
- ✅ QA 工程师清楚应该信任哪个文件
- ✅ 追踪 CSV 仅包含状态（无步骤）
- ✅ 校验脚本每周运行
- ✅ 团队已接受唯一真实来源原则培训

**危险信号**：
- 🚩 多个文件包含测试步骤
- 🚩 CSV 中的测试名称与文档不同
- 🚩 QA 工程师"更喜欢"看 CSV 而不是文档
- 🚩 没人知道哪个文件是权威的
- 🚩 测试 ID 随时间逐渐偏离

---

**文档版本**：1.0
**创建日期**：2025-11-10
**基于**：CCPM 测试套件完整性事件（3.2% 一致率）
**优先级**：🔴 P0（对测试套件质量至关重要）
