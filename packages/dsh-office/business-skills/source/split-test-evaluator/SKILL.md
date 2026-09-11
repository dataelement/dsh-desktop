---
name: split-test-evaluator
description: "A/B测试分析工具：对A/B测试数据进行全面统计分析，包括计算转化率差异、进行显著性检验（Z检验/卡方检验）、构建置信区间、评估统计功效以及估算最小样本量，输出JSON结果和中文建议报告。当用户提供A/B测试的访客和转化数据，或询问如何分析、解读、设计A/B测试，以及使用诸如“A/B测试结果”、“显著性”、“转化率提升”、“统计功效”、“样本量估算”等关键词时触发。"
license: MIT
---

# A/B Test Analyzer

对 A/B 测试数据进行全面的统计分析，输出结构化的 JSON 结果和中文建议。

## 功能

- **转化率差异**：计算对照组与实验组的绝对差异和相对提升
- **Z 检验**：双比例 Z 检验，判断转化率差异是否具有统计显著性
- **卡方检验**：2×2 列联表卡方检验，作为显著性的交叉验证
- **置信区间**：转化率差异的置信区间（默认 95%）
- **功效分析**：评估当前样本量下检测到差异的统计功效
- **最小样本量**：基于期望功效和最小可检测效应，估算每组所需样本量

## 使用方式

### 输入格式（JSON）

通过 stdin 或命令行参数传入：

```json
{
  "control_visitors": 10000,
  "control_conversions": 500,
  "treatment_visitors": 10000,
  "treatment_conversions": 550,
  "alpha": 0.05,
  "desired_power": 0.8,
  "mde": 0.01
}
```

| 字段 | 必填 | 说明 |
|------|------|------|
| `control_visitors` | 是 | 对照组访客数 |
| `control_conversions` | 是 | 对照组转化数 |
| `treatment_visitors` | 是 | 实验组访客数 |
| `treatment_conversions` | 是 | 实验组转化数 |
| `alpha` | 否 | 显著性水平，默认 0.05 |
| `desired_power` | 否 | 期望统计功效，默认 0.8 |
| `mde` | 否 | 最小可检测效应（绝对值），默认使用观测差异 |

### 运行

```bash
# 通过 stdin
echo '{"control_visitors":10000,"control_conversions":500,"treatment_visitors":10000,"treatment_conversions":550}' | python3 scripts/ab_test_analyze.py

# 通过命令行参数
python3 scripts/ab_test_analyze.py '{"control_visitors":10000,"control_conversions":500,"treatment_visitors":10000,"treatment_conversions":550}'
```

### 输出格式

```json
{
  "conversion_rates": {
    "control": 0.05,
    "treatment": 0.055,
    "absolute_difference": 0.005,
    "relative_lift_percent": 10.0
  },
  "z_test": {
    "z_statistic": 1.5852,
    "p_value": 0.11292,
    "significant": false
  },
  "chi_square_test": {
    "chi2_statistic": 2.5129,
    "p_value": 0.11292,
    "significant": false
  },
  "confidence_interval": {
    "level": 0.95,
    "lower": -0.001182,
    "upper": 0.011182
  },
  "power_analysis": {
    "observed_power": 0.3542,
    "desired_power": 0.8,
    "sufficient_power": false
  },
  "sample_size": {
    "minimum_per_group": 31234,
    "alpha": 0.05,
    "desired_power": 0.8,
    "detectable_effect": 0.005
  },
  "recommendation": "未检测到显著差异 (p=0.1129 ≥ α=0.05)；当前统计功效不足 (35.42% < 80%)，结果可能不可靠；建议每组至少收集 31,234 个样本"
}
```

## 依赖

仅使用 Python 标准库（Python 3.8+），无需安装任何第三方包。

## 统计方法说明

- **Z 检验**使用 pooled 标准误，适用于大样本（各组 ≥30）
- **卡方检验**基于 2×2 列联表，与 Z 检验在大样本下等价（χ² ≈ z²）
- **置信区间**使用 unpooled 标准误（Wald 方法）
- **功效/样本量**基于正态近似，使用双侧检验
