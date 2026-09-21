#!/usr/bin/env python3
"""A/B Test Analyzer — 转化率差异 / 显著性(Z/卡方) / 置信区间 / 功效 / 最小样本量"""

import json
import math
import sys
from statistics import NormalDist


def analyze_ab_test(data):
    n_ctrl = data["control_visitors"]
    x_ctrl = data["control_conversions"]
    n_treat = data["treatment_visitors"]
    x_treat = data["treatment_conversions"]
    alpha = data.get("alpha", 0.05)
    desired_power = data.get("desired_power", 0.8)

    errors = _validate(n_ctrl, x_ctrl, n_treat, x_treat, alpha, desired_power)
    if errors:
        return {"error": errors}

    norm = NormalDist()
    p_ctrl = x_ctrl / n_ctrl
    p_treat = x_treat / n_treat
    diff = p_treat - p_ctrl
    relative_lift = (diff / p_ctrl * 100) if p_ctrl > 0 else None

    z_result = _z_test(p_ctrl, p_treat, n_ctrl, n_treat, x_ctrl, x_treat, diff, norm)
    chi2_result = _chi_square_test(x_ctrl, n_ctrl, x_treat, n_treat, norm)
    ci_result = _confidence_interval(p_ctrl, p_treat, n_ctrl, n_treat, diff, alpha, norm)
    power = _power_analysis(p_ctrl, p_treat, n_ctrl, n_treat, diff, alpha, norm)
    sample_result = _min_sample_size(
        p_ctrl, p_treat, diff, alpha, desired_power, data.get("mde"), norm
    )

    is_sig = z_result["p_value"] < alpha
    recommendation = _recommendation(
        is_sig, z_result["p_value"], power, desired_power,
        diff, sample_result["minimum_per_group"], n_ctrl, n_treat, alpha,
    )

    return {
        "conversion_rates": {
            "control": round(p_ctrl, 6),
            "treatment": round(p_treat, 6),
            "absolute_difference": round(diff, 6),
            "relative_lift_percent": round(relative_lift, 2) if relative_lift is not None else None,
        },
        "z_test": {
            "z_statistic": round(z_result["z"], 4),
            "p_value": round(z_result["p_value"], 6),
            "significant": is_sig,
        },
        "chi_square_test": {
            "chi2_statistic": round(chi2_result["chi2"], 4),
            "p_value": round(chi2_result["p_value"], 6),
            "significant": chi2_result["p_value"] < alpha,
        },
        "confidence_interval": {
            "level": round(1 - alpha, 4),
            "lower": round(ci_result["lower"], 6),
            "upper": round(ci_result["upper"], 6),
        },
        "power_analysis": {
            "observed_power": round(power, 4),
            "desired_power": desired_power,
            "sufficient_power": power >= desired_power,
        },
        "sample_size": {
            "minimum_per_group": sample_result["minimum_per_group"],
            "alpha": alpha,
            "desired_power": desired_power,
            "detectable_effect": sample_result["detectable_effect"],
        },
        "recommendation": recommendation,
    }


def _validate(n_ctrl, x_ctrl, n_treat, x_treat, alpha, desired_power):
    if n_ctrl <= 0 or n_treat <= 0:
        return "访客数必须为正整数"
    if x_ctrl < 0 or x_treat < 0:
        return "转化数不能为负"
    if x_ctrl > n_ctrl or x_treat > n_treat:
        return "转化数不能超过访客数"
    if not (0 < alpha < 1):
        return "显著性水平 alpha 必须在 (0, 1) 之间"
    if not (0 < desired_power < 1):
        return "期望功效 desired_power 必须在 (0, 1) 之间"
    return None


def _z_test(p_ctrl, p_treat, n_ctrl, n_treat, x_ctrl, x_treat, diff, norm):
    p_pool = (x_ctrl + x_treat) / (n_ctrl + n_treat)
    if 0 < p_pool < 1:
        se = math.sqrt(p_pool * (1 - p_pool) * (1 / n_ctrl + 1 / n_treat))
    else:
        se = 0
    z = diff / se if se > 0 else 0.0
    p_value = 2 * (1 - norm.cdf(abs(z)))
    return {"z": z, "p_value": p_value}


def _chi_square_test(x_ctrl, n_ctrl, x_treat, n_treat, norm):
    a, b = x_ctrl, n_ctrl - x_ctrl
    c, d = x_treat, n_treat - x_treat
    N = n_ctrl + n_treat
    denom = (a + b) * (c + d) * (a + c) * (b + d)
    if denom == 0:
        return {"chi2": 0.0, "p_value": 1.0}
    chi2 = N * (a * d - b * c) ** 2 / denom
    p_value = 2 * (1 - norm.cdf(math.sqrt(chi2))) if chi2 > 0 else 1.0
    return {"chi2": chi2, "p_value": p_value}


def _confidence_interval(p_ctrl, p_treat, n_ctrl, n_treat, diff, alpha, norm):
    se = math.sqrt(p_ctrl * (1 - p_ctrl) / n_ctrl + p_treat * (1 - p_treat) / n_treat)
    z_crit = norm.inv_cdf(1 - alpha / 2)
    return {"lower": diff - z_crit * se, "upper": diff + z_crit * se}


def _power_analysis(p_ctrl, p_treat, n_ctrl, n_treat, diff, alpha, norm):
    if abs(diff) == 0:
        return alpha
    se = math.sqrt(p_ctrl * (1 - p_ctrl) / n_ctrl + p_treat * (1 - p_treat) / n_treat)
    if se == 0:
        return 1.0
    z_alpha = norm.inv_cdf(1 - alpha / 2)
    power = (
        1
        - norm.cdf(z_alpha - abs(diff) / se)
        + norm.cdf(-z_alpha - abs(diff) / se)
    )
    return power


def _min_sample_size(p_ctrl, p_treat, diff, alpha, desired_power, mde_input, norm):
    mde = mde_input if mde_input else (abs(diff) if abs(diff) > 0 else 0.01)
    p_avg = (p_ctrl + p_treat) / 2
    z_a = norm.inv_cdf(1 - alpha / 2)
    z_b = norm.inv_cdf(desired_power)

    var_null = 2 * p_avg * (1 - p_avg)
    var_alt = p_ctrl * (1 - p_ctrl) + p_treat * (1 - p_treat)
    if var_null <= 0 and var_alt <= 0:
        return {"minimum_per_group": None, "detectable_effect": round(mde, 6)}

    numerator = (z_a * math.sqrt(var_null) + z_b * math.sqrt(var_alt)) ** 2
    n = math.ceil(numerator / (mde ** 2))
    return {"minimum_per_group": n, "detectable_effect": round(mde, 6)}


def _recommendation(is_sig, p_value, power, desired_power, diff, min_n, n_ctrl, n_treat, alpha):
    parts = []
    if is_sig:
        direction = "高于" if diff > 0 else "低于"
        parts.append(f"实验组转化率显著{direction}对照组 (p={p_value:.4f} < α={alpha})")
    else:
        parts.append(f"未检测到显著差异 (p={p_value:.4f} ≥ α={alpha})")

    if power < desired_power:
        parts.append(f"当前统计功效不足 ({power:.2%} < {desired_power:.0%})，结果可能不可靠")
        if min_n and min_n > max(n_ctrl, n_treat):
            parts.append(f"建议每组至少收集 {min_n:,} 个样本")
    else:
        parts.append(f"统计功效充足 ({power:.2%})")
    return "；".join(parts)


def main():
    if len(sys.argv) > 1:
        raw = sys.argv[1]
    else:
        raw = sys.stdin.read()
    try:
        data = json.loads(raw)
    except json.JSONDecodeError as e:
        print(json.dumps({"error": f"JSON 解析失败: {e}"}, ensure_ascii=False, indent=2))
        sys.exit(1)

    required = ["control_visitors", "control_conversions", "treatment_visitors", "treatment_conversions"]
    missing = [k for k in required if k not in data]
    if missing:
        print(json.dumps({"error": f"缺少必填字段: {', '.join(missing)}"}, ensure_ascii=False, indent=2))
        sys.exit(1)

    result = analyze_ab_test(data)
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
