#!/usr/bin/env python3
"""
Financial Statement Analyzer / 财报三表分析工具
Computes YoY/QoQ changes, financial ratios, and anomaly detection.
"""

import argparse
import json
import re
import sys
from collections import OrderedDict


SAMPLE_DATA = {
    "company": "示例科技有限公司",
    "currency": "CNY",
    "unit": "万元",
    "periods": [
        "2023Q1", "2023Q2", "2023Q3", "2023Q4",
        "2024Q1", "2024Q2", "2024Q3", "2024Q4"
    ],
    "income_statement": {
        "revenue":         [5000, 5200, 4800, 6000, 5500, 5800, 5100, 6500],
        "cost_of_revenue": [3000, 3100, 2900, 3500, 3400, 3600, 3200, 4100],
        "operating_income": [800,  850,  750, 1000,  780,  820,  700,  900],
        "net_income":       [600,  650,  560,  780,  580,  620,  520,  680]
    },
    "balance_sheet": {
        "accounts_receivable":    [2000, 2100, 2200, 2300, 2800, 3200, 3600, 4200],
        "inventory":              [1000, 1050, 1100, 1200, 1100, 1150, 1200, 1300],
        "total_current_assets":   [5000, 5200, 5400, 5800, 6000, 6500, 7000, 7500],
        "goodwill":               [ 500,  500,  500,  500,  500,  500,  500,  500],
        "total_assets":           [15000,15500,16000,16500,17000,17500,18000,18500],
        "accounts_payable":       [1500, 1600, 1550, 1700, 1650, 1750, 1700, 1800],
        "total_current_liabilities":[4000,4200,4100,4500,4300,4600,4500,4900],
        "total_liabilities":      [8000, 8200, 8400, 8600, 8800, 9000, 9200, 9500],
        "total_equity":           [7000, 7300, 7600, 7900, 8200, 8500, 8800, 9000]
    },
    "cash_flow": {
        "operating_cash_flow": [ 700,  750,  620,  850,  300,  280,  250,  200],
        "investing_cash_flow": [-200, -180, -250, -300, -400, -350, -300, -280],
        "financing_cash_flow": [-100,  -50,  -80, -120,  200,  150,  100,   50],
        "capex":               [ 180,  160,  230,  280,  380,  330,  280,  260]
    }
}

DEFAULT_THRESHOLDS = {
    "ar_threshold": 0.20,
    "inv_threshold": 0.15,
    "ocf_ratio": 0.50,
    "margin_threshold": 0.05,
    "net_margin_threshold": 0.03,
    "debt_ceiling": 0.70,
    "current_floor": 1.00,
    "goodwill_ceiling": 0.30,
    "neg_ocf_periods": 2,
    "ap_threshold": 0.20,
}


def safe_div(a, b):
    if b is None or a is None:
        return None
    if b == 0:
        return None
    return a / b


def pct_change(new, old):
    if old is None or new is None:
        return None
    if old == 0:
        if new == 0:
            return 0.0
        return None
    return (new - old) / abs(old)


def get_values(data, section, key):
    sec = data.get(section, {})
    return sec.get(key)


def detect_period_type(periods):
    for p in periods:
        if re.search(r"[Qq]\d", str(p)):
            return "quarterly"
    return "annual"


def parse_period(p):
    p = str(p).strip()
    m = re.match(r"(\d{4})[Qq](\d)", p)
    if m:
        return int(m.group(1)), int(m.group(2))
    m2 = re.match(r"(\d{4})", p)
    if m2:
        return int(m2.group(1)), 0
    return None, None


def build_yoy_map(periods):
    idx = {}
    for i, p in enumerate(periods):
        year, q = parse_period(p)
        if year is not None:
            idx[(year, q)] = i

    yoy_pairs = []
    for i, p in enumerate(periods):
        year, q = parse_period(p)
        if year is None:
            yoy_pairs.append(None)
            continue
        prev_key = (year - 1, q)
        if prev_key in idx:
            yoy_pairs.append(idx[prev_key])
        else:
            yoy_pairs.append(None)
    return yoy_pairs


def compute_changes(values, periods, yoy_map):
    n = len(values)
    yoy = []
    qoq = []
    for i in range(n):
        if yoy_map[i] is not None:
            yoy.append(pct_change(values[i], values[yoy_map[i]]))
        else:
            yoy.append(None)

        if i > 0:
            qoq.append(pct_change(values[i], values[i - 1]))
        else:
            qoq.append(None)
    return yoy, qoq


def compute_all_changes(data, periods, yoy_map):
    result = {}
    for section in ("income_statement", "balance_sheet", "cash_flow"):
        sec = data.get(section, {})
        for key, vals in sec.items():
            if not isinstance(vals, list):
                continue
            yoy, qoq = compute_changes(vals, periods, yoy_map)
            result[key] = {"yoy": yoy, "qoq": qoq}
    return result


def compute_ratios(data, periods):
    n = len(periods)
    ratios = []
    for i in range(n):
        r = OrderedDict()
        rev = _val(data, "income_statement", "revenue", i)
        cogs = _val(data, "income_statement", "cost_of_revenue", i)
        oi = _val(data, "income_statement", "operating_income", i)
        ni = _val(data, "income_statement", "net_income", i)
        ar = _val(data, "balance_sheet", "accounts_receivable", i)
        inv = _val(data, "balance_sheet", "inventory", i)
        tca = _val(data, "balance_sheet", "total_current_assets", i)
        gw = _val(data, "balance_sheet", "goodwill", i)
        ta = _val(data, "balance_sheet", "total_assets", i)
        ap = _val(data, "balance_sheet", "accounts_payable", i)
        tcl = _val(data, "balance_sheet", "total_current_liabilities", i)
        tl = _val(data, "balance_sheet", "total_liabilities", i)
        te = _val(data, "balance_sheet", "total_equity", i)
        ocf = _val(data, "cash_flow", "operating_cash_flow", i)
        capex = _val(data, "cash_flow", "capex", i)

        gp = (rev - cogs) if (rev is not None and cogs is not None) else None
        r["gross_margin"] = safe_div(gp, rev)
        r["operating_margin"] = safe_div(oi, rev)
        r["net_margin"] = safe_div(ni, rev)
        r["debt_ratio"] = safe_div(tl, ta)
        r["current_ratio"] = safe_div(tca, tcl)
        r["goodwill_ratio"] = safe_div(gw, ta)
        r["ar_to_revenue"] = safe_div(ar, rev)
        r["inventory_to_revenue"] = safe_div(inv, rev)
        r["ocf_to_ni"] = safe_div(ocf, ni) if ni and ni != 0 else None
        r["roe"] = safe_div(ni, te)

        fcf = None
        if ocf is not None and capex is not None:
            fcf = ocf - capex
        r["free_cash_flow"] = fcf

        dso = None
        if ar is not None and rev is not None and rev != 0:
            dso = (ar / rev) * 90 if detect_period_type(periods) == "quarterly" else (ar / rev) * 365
        r["dso"] = dso

        dio = None
        if inv is not None and cogs is not None and cogs != 0:
            dio = (inv / cogs) * 90 if detect_period_type(periods) == "quarterly" else (inv / cogs) * 365
        r["dio"] = dio

        dpo = None
        if ap is not None and cogs is not None and cogs != 0:
            dpo = (ap / cogs) * 90 if detect_period_type(periods) == "quarterly" else (ap / cogs) * 365
        r["dpo"] = dpo

        ratios.append(r)
    return ratios


def _val(data, section, key, idx):
    vals = get_values(data, section, key)
    if vals is None or idx >= len(vals):
        return None
    v = vals[idx]
    return v if v is not None else None


def detect_anomalies(data, periods, changes, ratios, thresholds):
    alerts = []
    n = len(periods)

    rev_yoy = changes.get("revenue", {}).get("yoy", [])
    ar_yoy = changes.get("accounts_receivable", {}).get("yoy", [])
    if rev_yoy and ar_yoy:
        for i in range(n):
            if ar_yoy[i] is not None and rev_yoy[i] is not None:
                gap = ar_yoy[i] - rev_yoy[i]
                if gap > thresholds["ar_threshold"]:
                    alerts.append({
                        "rule": "应收账款暴增",
                        "period": periods[i],
                        "severity": "high" if gap > thresholds["ar_threshold"] * 2 else "medium",
                        "detail": (
                            f"应收增速 {ar_yoy[i]*100:.1f}% 远超收入增速 {rev_yoy[i]*100:.1f}%，"
                            f"差值 {gap*100:.1f}pp（阈值 {thresholds['ar_threshold']*100:.0f}pp）"
                        ),
                        "implication": "可能存在收入确认激进或客户回款困难"
                    })

    for i in range(n):
        ni = _val(data, "income_statement", "net_income", i)
        ocf = _val(data, "cash_flow", "operating_cash_flow", i)
        if ni is not None and ocf is not None and ni != 0:
            ratio = ocf / ni if ni > 0 else None
            if ni > 0 and ocf < 0:
                alerts.append({
                    "rule": "现金流背离利润",
                    "period": periods[i],
                    "severity": "high",
                    "detail": f"净利润 {ni:,.0f} 为正但经营现金流 {ocf:,.0f} 为负",
                    "implication": "盈利质量堪忧，利润可能含大量应计项"
                })
            elif ratio is not None and ratio < thresholds["ocf_ratio"]:
                alerts.append({
                    "rule": "现金流背离利润",
                    "period": periods[i],
                    "severity": "medium",
                    "detail": (
                        f"OCF/净利润 = {ratio:.2f}，低于阈值 {thresholds['ocf_ratio']:.2f}"
                    ),
                    "implication": "净利润向现金的转化效率偏低"
                })

    inv_yoy = changes.get("inventory", {}).get("yoy", [])
    if rev_yoy and inv_yoy:
        for i in range(n):
            if inv_yoy[i] is not None and rev_yoy[i] is not None:
                gap = inv_yoy[i] - rev_yoy[i]
                if gap > thresholds["inv_threshold"]:
                    alerts.append({
                        "rule": "存货积压",
                        "period": periods[i],
                        "severity": "medium",
                        "detail": (
                            f"存货增速 {inv_yoy[i]*100:.1f}% 高于收入增速 {rev_yoy[i]*100:.1f}%，"
                            f"差值 {gap*100:.1f}pp"
                        ),
                        "implication": "产品可能滞销，存在跌价减值风险"
                    })

    for i in range(n):
        if i < 1:
            continue
        gm_now = ratios[i].get("gross_margin")
        gm_prev = ratios[i - 1].get("gross_margin")
        if gm_now is not None and gm_prev is not None:
            delta = gm_now - gm_prev
            if abs(delta) > thresholds["margin_threshold"]:
                direction = "上升" if delta > 0 else "下降"
                alerts.append({
                    "rule": "毛利率突变",
                    "period": periods[i],
                    "severity": "medium",
                    "detail": (
                        f"毛利率环比{direction} {abs(delta)*100:.1f}pp "
                        f"({gm_prev*100:.1f}% → {gm_now*100:.1f}%)"
                    ),
                    "implication": "定价能力或成本结构发生显著变化"
                })

    for i in range(n):
        if i < 1:
            continue
        nm_now = ratios[i].get("net_margin")
        nm_prev = ratios[i - 1].get("net_margin")
        if nm_now is not None and nm_prev is not None:
            delta = nm_now - nm_prev
            if abs(delta) > thresholds["net_margin_threshold"]:
                direction = "上升" if delta > 0 else "下降"
                alerts.append({
                    "rule": "净利率突变",
                    "period": periods[i],
                    "severity": "medium",
                    "detail": (
                        f"净利率环比{direction} {abs(delta)*100:.1f}pp "
                        f"({nm_prev*100:.1f}% → {nm_now*100:.1f}%)"
                    ),
                    "implication": "费用管控异常或非经常性损益影响"
                })

    streak = 0
    for i in range(n):
        ocf = _val(data, "cash_flow", "operating_cash_flow", i)
        if ocf is not None and ocf < 0:
            streak += 1
            if streak >= thresholds["neg_ocf_periods"]:
                alerts.append({
                    "rule": "经营现金流持续为负",
                    "period": periods[i],
                    "severity": "high" if streak >= 3 else "medium",
                    "detail": f"经营现金流已连续 {streak} 个报告期为负",
                    "implication": "企业自身造血能力不足，依赖外部融资维持运营"
                })
        else:
            streak = 0

    for i in range(n):
        gw_ratio = ratios[i].get("goodwill_ratio")
        if gw_ratio is not None and gw_ratio > thresholds["goodwill_ceiling"]:
            alerts.append({
                "rule": "商誉占比过高",
                "period": periods[i],
                "severity": "medium",
                "detail": f"商誉/总资产 = {gw_ratio*100:.1f}%（警戒线 {thresholds['goodwill_ceiling']*100:.0f}%）",
                "implication": "若并购标的业绩不达预期，存在大额减值风险"
            })

    for i in range(n):
        dr = ratios[i].get("debt_ratio")
        if dr is not None and dr > thresholds["debt_ceiling"]:
            alerts.append({
                "rule": "资产负债率过高",
                "period": periods[i],
                "severity": "medium",
                "detail": f"资产负债率 {dr*100:.1f}%（警戒线 {thresholds['debt_ceiling']*100:.0f}%）",
                "implication": "财务杠杆偏高，偿债压力较大"
            })

    for i in range(n):
        cr = ratios[i].get("current_ratio")
        if cr is not None and cr < thresholds["current_floor"]:
            alerts.append({
                "rule": "流动比率过低",
                "period": periods[i],
                "severity": "medium" if cr > 0.7 else "high",
                "detail": f"流动比率 {cr:.2f}（警戒线 {thresholds['current_floor']:.2f}）",
                "implication": "短期偿债能力不足，存在流动性风险"
            })

    cogs_yoy = changes.get("cost_of_revenue", {}).get("yoy", [])
    ap_yoy = changes.get("accounts_payable", {}).get("yoy", [])
    if cogs_yoy and ap_yoy:
        for i in range(n):
            if ap_yoy[i] is not None and cogs_yoy[i] is not None:
                gap = abs(ap_yoy[i] - cogs_yoy[i])
                if gap > thresholds["ap_threshold"]:
                    if ap_yoy[i] > cogs_yoy[i]:
                        msg = "应付账款增速远超成本增速，可能依赖延长账期缓解资金压力"
                    else:
                        msg = "应付账款增速远低于成本增速，可能面临供应商要求缩短账期"
                    alerts.append({
                        "rule": "应付账款异常",
                        "period": periods[i],
                        "severity": "low",
                        "detail": (
                            f"AP 增速 {ap_yoy[i]*100:.1f}% vs 成本增速 {cogs_yoy[i]*100:.1f}%，"
                            f"差值 {gap*100:.1f}pp"
                        ),
                        "implication": msg
                    })

    return alerts


def fmt_pct(v):
    if v is None:
        return "N/A"
    return f"{v * 100:+.1f}%"


def fmt_ratio(v, decimals=2):
    if v is None:
        return "N/A"
    return f"{v:.{decimals}f}"


def fmt_num(v):
    if v is None:
        return "N/A"
    return f"{v:,.0f}"


def format_text_report(data, periods, changes, ratios, alerts):
    lines = []
    company = data.get("company", "未知公司")
    unit = data.get("unit", "")
    currency = data.get("currency", "")
    unit_label = f"（{currency} {unit}）" if currency or unit else ""

    lines.append(f"{'='*60}")
    lines.append(f"  财报三表分析报告 — {company}")
    lines.append(f"  报告期：{periods[0]} ~ {periods[-1]} {unit_label}")
    lines.append(f"{'='*60}")
    lines.append("")

    lines.append("【一、核心指标速览（最新期）】")
    lines.append("")
    latest = ratios[-1]
    prev = ratios[-2] if len(ratios) > 1 else {}
    metrics = [
        ("毛利率", "gross_margin"),
        ("营业利润率", "operating_margin"),
        ("净利率", "net_margin"),
        ("资产负债率", "debt_ratio"),
        ("流动比率", "current_ratio"),
        ("商誉占比", "goodwill_ratio"),
        ("应收/收入", "ar_to_revenue"),
        ("OCF/净利润", "ocf_to_ni"),
        ("ROE", "roe"),
    ]
    lines.append(f"  {'指标':<14} {'当期':>10} {'上期':>10} {'变动':>10}")
    lines.append(f"  {'-'*14} {'-'*10} {'-'*10} {'-'*10}")
    for label, key in metrics:
        curr_v = latest.get(key)
        prev_v = prev.get(key) if prev else None
        delta = None
        if curr_v is not None and prev_v is not None:
            delta = curr_v - prev_v
        c_str = fmt_ratio(curr_v) if key == "current_ratio" else (fmt_pct(curr_v).replace("+", "") if curr_v is not None else "N/A")
        p_str = fmt_ratio(prev_v) if key == "current_ratio" else (fmt_pct(prev_v).replace("+", "") if prev_v is not None else "N/A")
        d_str = fmt_pct(delta) if delta is not None else "N/A"
        if key == "current_ratio":
            c_str = fmt_ratio(curr_v)
            p_str = fmt_ratio(prev_v)
            d_str = fmt_ratio(delta) if delta is not None else "N/A"
        lines.append(f"  {label:<14} {c_str:>10} {p_str:>10} {d_str:>10}")

    lines.append("")
    lines.append(f"  应收周转天数(DSO): {fmt_ratio(latest.get('dso'), 0)} 天")
    lines.append(f"  存货周转天数(DIO): {fmt_ratio(latest.get('dio'), 0)} 天")
    lines.append(f"  应付周转天数(DPO): {fmt_ratio(latest.get('dpo'), 0)} 天")
    fcf = latest.get("free_cash_flow")
    lines.append(f"  自由现金流(FCF):   {fmt_num(fcf)}")
    lines.append("")

    lines.append("【二、同比变动（YoY）】")
    lines.append("")
    yoy_keys = [
        ("收入", "revenue"), ("营业成本", "cost_of_revenue"),
        ("营业利润", "operating_income"), ("净利润", "net_income"),
        ("应收账款", "accounts_receivable"), ("存货", "inventory"),
        ("总资产", "total_assets"), ("总负债", "total_liabilities"),
        ("经营现金流", "operating_cash_flow"),
    ]
    header = f"  {'科目':<14}"
    for p in periods:
        header += f" {p:>9}"
    lines.append(header)
    lines.append(f"  {'-'*14}" + f" {'-'*9}" * len(periods))
    for label, key in yoy_keys:
        ch = changes.get(key, {}).get("yoy", [])
        if not ch:
            continue
        row = f"  {label:<14}"
        for v in ch:
            row += f" {fmt_pct(v):>9}"
        lines.append(row)
    lines.append("")

    lines.append("【三、环比变动（QoQ）】")
    lines.append("")
    header = f"  {'科目':<14}"
    for p in periods:
        header += f" {p:>9}"
    lines.append(header)
    lines.append(f"  {'-'*14}" + f" {'-'*9}" * len(periods))
    for label, key in yoy_keys:
        ch = changes.get(key, {}).get("qoq", [])
        if not ch:
            continue
        row = f"  {label:<14}"
        for v in ch:
            row += f" {fmt_pct(v):>9}"
        lines.append(row)
    lines.append("")

    lines.append("【四、异常检测结果】")
    lines.append("")
    if not alerts:
        lines.append("  未检测到异常信号。")
    else:
        severity_order = {"high": 0, "medium": 1, "low": 2}
        sorted_alerts = sorted(alerts, key=lambda a: (severity_order.get(a["severity"], 9), a["period"]))
        severity_labels = {"high": "高", "medium": "中", "low": "低"}
        for idx, a in enumerate(sorted_alerts, 1):
            sev = severity_labels.get(a["severity"], a["severity"])
            lines.append(f"  [{sev}风险] {a['rule']} | {a['period']}")
            lines.append(f"    详情：{a['detail']}")
            lines.append(f"    含义：{a['implication']}")
            lines.append("")
    lines.append("")

    lines.append("【五、三表联动分析要点】")
    lines.append("")
    rev_vals = get_values(data, "income_statement", "revenue")
    ar_vals = get_values(data, "balance_sheet", "accounts_receivable")
    ni_vals = get_values(data, "income_statement", "net_income")
    ocf_vals = get_values(data, "cash_flow", "operating_cash_flow")

    if rev_vals and ar_vals and len(rev_vals) >= 2:
        rev_growth = pct_change(rev_vals[-1], rev_vals[-2])
        ar_growth = pct_change(ar_vals[-1], ar_vals[-2])
        if rev_growth is not None and ar_growth is not None:
            if ar_growth > rev_growth + 0.1:
                lines.append("  · 利润表→资产负债表：应收增速显著快于收入增速，收入增长质量需关注")
            else:
                lines.append("  · 利润表→资产负债表：应收与收入增速基本匹配，收入增长质量尚可")

    if ni_vals and ocf_vals:
        total_ni = sum(v for v in ni_vals if v is not None)
        total_ocf = sum(v for v in ocf_vals if v is not None)
        if total_ni > 0:
            overall_ratio = total_ocf / total_ni
            if overall_ratio < 0.6:
                lines.append(f"  · 利润表→现金流量表：累计 OCF/净利润 = {overall_ratio:.2f}，利润现金含量偏低")
            else:
                lines.append(f"  · 利润表→现金流量表：累计 OCF/净利润 = {overall_ratio:.2f}，利润现金含量合理")

    inv_cf = get_values(data, "cash_flow", "investing_cash_flow")
    capex_vals = get_values(data, "cash_flow", "capex")
    if inv_cf and capex_vals:
        latest_inv = inv_cf[-1] if inv_cf[-1] is not None else 0
        latest_capex = capex_vals[-1] if capex_vals[-1] is not None else 0
        if latest_inv is not None and latest_capex is not None:
            lines.append(
                f"  · 资产负债表→现金流量表：投资活动现金流 {fmt_num(latest_inv)}，"
                f"资本开支 {fmt_num(latest_capex)}"
            )

    lines.append("")
    lines.append(f"{'='*60}")
    lines.append("  报告生成完毕")
    lines.append(f"{'='*60}")
    return "\n".join(lines)


def build_json_report(data, periods, changes, ratios, alerts):
    return OrderedDict([
        ("company", data.get("company", "")),
        ("report_range", f"{periods[0]} ~ {periods[-1]}"),
        ("periods", periods),
        ("ratios", [dict(r) for r in ratios]),
        ("changes", {k: dict(v) for k, v in changes.items()}),
        ("anomalies", alerts),
        ("summary", {
            "total_anomalies": len(alerts),
            "high_severity": sum(1 for a in alerts if a["severity"] == "high"),
            "medium_severity": sum(1 for a in alerts if a["severity"] == "medium"),
            "low_severity": sum(1 for a in alerts if a["severity"] == "low"),
        })
    ])


def validate_data(data):
    errors = []
    periods = data.get("periods")
    if not periods or not isinstance(periods, list):
        errors.append("缺少 periods 字段或格式不正确")
        return errors

    n = len(periods)
    for section in ("income_statement", "balance_sheet", "cash_flow"):
        sec = data.get(section, {})
        for key, vals in sec.items():
            if isinstance(vals, list) and len(vals) != n:
                errors.append(
                    f"{section}.{key} 长度为 {len(vals)}，期望 {n}（与 periods 一致）"
                )
    return errors


def main():
    parser = argparse.ArgumentParser(
        description="财报三表分析工具 — 同比环比 + 异常检测",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="示例:\n"
               "  %(prog)s data.json\n"
               "  %(prog)s data.json --json\n"
               "  %(prog)s data.json -o report.json\n"
               "  %(prog)s --sample > sample.json\n"
    )
    parser.add_argument("input", nargs="?", help="输入 JSON 文件路径")
    parser.add_argument("-j", "--json", action="store_true", help="以 JSON 格式输出")
    parser.add_argument("-o", "--output", help="输出文件路径")
    parser.add_argument("-s", "--sample", action="store_true", help="输出示例数据到 stdout")

    parser.add_argument("--ar-threshold", type=float, default=DEFAULT_THRESHOLDS["ar_threshold"],
                        help=f"应收账款异常阈值 (默认 {DEFAULT_THRESHOLDS['ar_threshold']})")
    parser.add_argument("--inv-threshold", type=float, default=DEFAULT_THRESHOLDS["inv_threshold"],
                        help=f"存货异常阈值 (默认 {DEFAULT_THRESHOLDS['inv_threshold']})")
    parser.add_argument("--ocf-ratio", type=float, default=DEFAULT_THRESHOLDS["ocf_ratio"],
                        help=f"OCF/利润背离阈值 (默认 {DEFAULT_THRESHOLDS['ocf_ratio']})")
    parser.add_argument("--margin-threshold", type=float, default=DEFAULT_THRESHOLDS["margin_threshold"],
                        help=f"毛利率突变阈值 (默认 {DEFAULT_THRESHOLDS['margin_threshold']})")
    parser.add_argument("--debt-ceiling", type=float, default=DEFAULT_THRESHOLDS["debt_ceiling"],
                        help=f"资产负债率警戒线 (默认 {DEFAULT_THRESHOLDS['debt_ceiling']})")
    parser.add_argument("--current-floor", type=float, default=DEFAULT_THRESHOLDS["current_floor"],
                        help=f"流动比率警戒线 (默认 {DEFAULT_THRESHOLDS['current_floor']})")
    parser.add_argument("--goodwill-ceiling", type=float, default=DEFAULT_THRESHOLDS["goodwill_ceiling"],
                        help=f"商誉占比警戒线 (默认 {DEFAULT_THRESHOLDS['goodwill_ceiling']})")

    args = parser.parse_args()

    if args.sample:
        json.dump(SAMPLE_DATA, sys.stdout, ensure_ascii=False, indent=2)
        sys.stdout.write("\n")
        return

    if not args.input:
        parser.error("请提供输入 JSON 文件路径，或使用 --sample 生成示例数据")

    try:
        with open(args.input, "r", encoding="utf-8") as f:
            data = json.load(f)
    except FileNotFoundError:
        print(f"错误：文件 '{args.input}' 不存在", file=sys.stderr)
        sys.exit(1)
    except json.JSONDecodeError as e:
        print(f"错误：JSON 解析失败 — {e}", file=sys.stderr)
        sys.exit(1)

    errors = validate_data(data)
    if errors:
        print("数据校验失败：", file=sys.stderr)
        for err in errors:
            print(f"  - {err}", file=sys.stderr)
        sys.exit(1)

    periods = data["periods"]
    yoy_map = build_yoy_map(periods)

    thresholds = {
        "ar_threshold": args.ar_threshold,
        "inv_threshold": args.inv_threshold,
        "ocf_ratio": args.ocf_ratio,
        "margin_threshold": args.margin_threshold,
        "net_margin_threshold": DEFAULT_THRESHOLDS["net_margin_threshold"],
        "debt_ceiling": args.debt_ceiling,
        "current_floor": args.current_floor,
        "goodwill_ceiling": args.goodwill_ceiling,
        "neg_ocf_periods": DEFAULT_THRESHOLDS["neg_ocf_periods"],
        "ap_threshold": DEFAULT_THRESHOLDS["ap_threshold"],
    }

    changes = compute_all_changes(data, periods, yoy_map)
    ratios = compute_ratios(data, periods)
    alerts = detect_anomalies(data, periods, changes, ratios, thresholds)

    if args.json or (args.output and args.output.endswith(".json")):
        report = build_json_report(data, periods, changes, ratios, alerts)
        output_text = json.dumps(report, ensure_ascii=False, indent=2) + "\n"
    else:
        output_text = format_text_report(data, periods, changes, ratios, alerts) + "\n"

    if args.output:
        with open(args.output, "w", encoding="utf-8") as f:
            f.write(output_text)
        print(f"报告已导出至 {args.output}", file=sys.stderr)
    else:
        sys.stdout.write(output_text)


if __name__ == "__main__":
    main()
