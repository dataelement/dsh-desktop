#!/usr/bin/env python3
"""Stock Fundamental Analyzer — 股票基本面分析工具

计算 20+ 核心财务指标并执行杜邦分析，仅依赖 Python 标准库。
"""

import argparse
import json
import sys
from pathlib import Path


def safe_div(numerator, denominator):
    if denominator is None or numerator is None:
        return None
    if denominator == 0:
        return None
    return numerator / denominator


def get_nested(data, *keys, default=None):
    current = data
    for k in keys:
        if not isinstance(current, dict):
            return default
        current = current.get(k, default)
        if current is None:
            return default
    return current


def compute_indicators(data):
    bs = data.get("balance_sheet", {})
    inc = data.get("income_statement", {})
    cf = data.get("cash_flow_statement", {})
    mkt = data.get("market_data", {})
    prior = data.get("prior_year", {})

    total_assets = bs.get("total_assets")
    total_liabilities = bs.get("total_liabilities")
    equity = bs.get("shareholders_equity")
    current_assets = bs.get("current_assets")
    current_liabilities = bs.get("current_liabilities")
    inventory = bs.get("inventory")
    accounts_receivable = bs.get("accounts_receivable")
    cash = bs.get("cash_and_equivalents")

    revenue = inc.get("revenue")
    cogs = inc.get("cost_of_goods_sold")
    operating_income = inc.get("operating_income")
    net_income = inc.get("net_income")
    interest_expense = inc.get("interest_expense")
    dep_amort = inc.get("depreciation_amortization")
    income_tax = inc.get("income_tax")

    ocf = cf.get("operating_cash_flow")
    capex = cf.get("capital_expenditure")

    shares = mkt.get("shares_outstanding")
    price = mkt.get("stock_price")

    prior_revenue = prior.get("revenue")
    prior_net_income = prior.get("net_income")

    gross_profit = (revenue - cogs) if (revenue is not None and cogs is not None) else None

    ebit = None
    if operating_income is not None:
        ebit = operating_income
    elif net_income is not None and income_tax is not None and interest_expense is not None:
        ebit = net_income + income_tax + interest_expense

    ebitda = None
    if ebit is not None and dep_amort is not None:
        ebitda = ebit + dep_amort

    working_capital = None
    if current_assets is not None and current_liabilities is not None:
        working_capital = current_assets - current_liabilities

    results = {}

    results["profitability"] = {
        "label": "盈利能力",
        "items": [
            {
                "name": "ROE（净资产收益率）",
                "name_en": "Return on Equity",
                "value": safe_div(net_income, equity),
                "format": "percent",
                "reference": "一般 > 15% 为优秀，> 20% 为卓越",
            },
            {
                "name": "ROA（总资产收益率）",
                "name_en": "Return on Assets",
                "value": safe_div(net_income, total_assets),
                "format": "percent",
                "reference": "一般 > 5% 为良好，因行业而异",
            },
            {
                "name": "毛利率",
                "name_en": "Gross Profit Margin",
                "value": safe_div(gross_profit, revenue),
                "format": "percent",
                "reference": "因行业差异大，消费品通常 > 30%",
            },
            {
                "name": "净利率",
                "name_en": "Net Profit Margin",
                "value": safe_div(net_income, revenue),
                "format": "percent",
                "reference": "一般 > 10% 为良好",
            },
            {
                "name": "营业利润率",
                "name_en": "Operating Profit Margin",
                "value": safe_div(operating_income, revenue),
                "format": "percent",
                "reference": "反映主营业务盈利能力",
            },
            {
                "name": "EBITDA 利润率",
                "name_en": "EBITDA Margin",
                "value": safe_div(ebitda, revenue),
                "format": "percent",
                "reference": "消除折旧摊销影响的盈利指标",
            },
        ],
    }

    results["solvency"] = {
        "label": "偿债能力",
        "items": [
            {
                "name": "资产负债率",
                "name_en": "Debt-to-Asset Ratio",
                "value": safe_div(total_liabilities, total_assets),
                "format": "percent",
                "reference": "一般 40%-60% 为适中，> 70% 偏高",
            },
            {
                "name": "产权比率（负债/权益）",
                "name_en": "Debt-to-Equity Ratio",
                "value": safe_div(total_liabilities, equity),
                "format": "ratio",
                "reference": "< 1 较保守，> 2 杠杆偏高",
            },
            {
                "name": "权益乘数",
                "name_en": "Equity Multiplier",
                "value": safe_div(total_assets, equity),
                "format": "ratio",
                "reference": "数值越大杠杆越高，一般 1.5-3.0",
            },
            {
                "name": "利息保障倍数",
                "name_en": "Interest Coverage Ratio",
                "value": safe_div(ebit, interest_expense),
                "format": "ratio",
                "reference": "> 3 较安全，< 1.5 有偿债风险",
            },
        ],
    }

    results["liquidity"] = {
        "label": "流动性",
        "items": [
            {
                "name": "流动比率",
                "name_en": "Current Ratio",
                "value": safe_div(current_assets, current_liabilities),
                "format": "ratio",
                "reference": "一般 1.5-2.0 为健康",
            },
            {
                "name": "速动比率",
                "name_en": "Quick Ratio",
                "value": safe_div(
                    (current_assets - inventory) if (current_assets is not None and inventory is not None) else None,
                    current_liabilities,
                ),
                "format": "ratio",
                "reference": "一般 > 1.0 为健康",
            },
            {
                "name": "现金比率",
                "name_en": "Cash Ratio",
                "value": safe_div(cash, current_liabilities),
                "format": "ratio",
                "reference": "> 0.25 即有较好的即时偿付能力",
            },
        ],
    }

    inventory_turnover = safe_div(cogs, inventory)
    receivables_turnover = safe_div(revenue, accounts_receivable)
    asset_turnover = safe_div(revenue, total_assets)
    working_capital_turnover = safe_div(revenue, working_capital) if working_capital and working_capital > 0 else None

    results["efficiency"] = {
        "label": "营运效率",
        "items": [
            {
                "name": "总资产周转率",
                "name_en": "Asset Turnover",
                "value": asset_turnover,
                "format": "ratio",
                "reference": "因行业而异，重资产行业通常 < 1",
            },
            {
                "name": "存货周转率",
                "name_en": "Inventory Turnover",
                "value": inventory_turnover,
                "format": "ratio",
                "reference": "越高越好，零售业通常 > 8",
            },
            {
                "name": "存货周转天数",
                "name_en": "Days Inventory Outstanding",
                "value": safe_div(365, inventory_turnover),
                "format": "days",
                "reference": "天数越短存货管理效率越高",
            },
            {
                "name": "应收账款周转率",
                "name_en": "Receivables Turnover",
                "value": receivables_turnover,
                "format": "ratio",
                "reference": "越高越好，回款速度快",
            },
            {
                "name": "应收账款周转天数",
                "name_en": "Days Sales Outstanding",
                "value": safe_div(365, receivables_turnover),
                "format": "days",
                "reference": "天数越短回款越快",
            },
            {
                "name": "营运资金周转率",
                "name_en": "Working Capital Turnover",
                "value": working_capital_turnover,
                "format": "ratio",
                "reference": "衡量营运资金使用效率",
            },
        ],
    }

    results["per_share"] = {
        "label": "每股指标",
        "items": [
            {
                "name": "每股收益（EPS）",
                "name_en": "Earnings Per Share",
                "value": safe_div(net_income, shares),
                "format": "currency",
                "reference": "绝对值因股价而异，需结合 P/E 看",
            },
            {
                "name": "每股净资产（BVPS）",
                "name_en": "Book Value Per Share",
                "value": safe_div(equity, shares),
                "format": "currency",
                "reference": "反映每股对应的净资产",
            },
            {
                "name": "市盈率（P/E）",
                "name_en": "Price-to-Earnings Ratio",
                "value": safe_div(price, safe_div(net_income, shares)) if shares else None,
                "format": "ratio",
                "reference": "一般 10-25 为合理区间，因行业而异",
            },
        ],
    }

    results["cash_flow"] = {
        "label": "现金流指标",
        "items": [
            {
                "name": "经营现金流比率",
                "name_en": "Operating Cash Flow Ratio",
                "value": safe_div(ocf, current_liabilities),
                "format": "ratio",
                "reference": "> 1 说明经营现金流可覆盖短期负债",
            },
            {
                "name": "自由现金流",
                "name_en": "Free Cash Flow",
                "value": (ocf - capex) if (ocf is not None and capex is not None) else None,
                "format": "amount",
                "reference": "正值说明经营活动有剩余资金",
            },
            {
                "name": "现金流净利润比",
                "name_en": "Cash Flow to Net Income",
                "value": safe_div(ocf, net_income),
                "format": "ratio",
                "reference": "> 1 说明利润质量较好",
            },
        ],
    }

    results["growth"] = {
        "label": "成长能力",
        "items": [
            {
                "name": "营收同比增长率",
                "name_en": "Revenue Growth Rate (YoY)",
                "value": safe_div(
                    (revenue - prior_revenue) if (revenue is not None and prior_revenue is not None) else None,
                    prior_revenue,
                ),
                "format": "percent",
                "reference": "> 10% 为较快增长",
            },
            {
                "name": "净利润同比增长率",
                "name_en": "Net Income Growth Rate (YoY)",
                "value": safe_div(
                    (net_income - prior_net_income) if (net_income is not None and prior_net_income is not None) else None,
                    prior_net_income,
                ),
                "format": "percent",
                "reference": "正增长为盈利改善",
            },
        ],
    }

    net_margin = safe_div(net_income, revenue)
    equity_multiplier = safe_div(total_assets, equity)

    results["dupont"] = {
        "label": "杜邦分析（DuPont Analysis）",
        "description": "ROE = 净利率 × 总资产周转率 × 权益乘数",
        "components": {
            "net_profit_margin": {
                "name": "净利率",
                "value": net_margin,
                "format": "percent",
            },
            "asset_turnover": {
                "name": "总资产周转率",
                "value": asset_turnover,
                "format": "ratio",
            },
            "equity_multiplier": {
                "name": "权益乘数",
                "value": equity_multiplier,
                "format": "ratio",
            },
        },
        "roe_decomposed": None,
        "roe_direct": safe_div(net_income, equity),
    }

    if net_margin is not None and asset_turnover is not None and equity_multiplier is not None:
        results["dupont"]["roe_decomposed"] = net_margin * asset_turnover * equity_multiplier

    return results


def fmt_value(value, fmt):
    if value is None:
        return "N/A（数据不足）"
    if fmt == "percent":
        return f"{value * 100:.2f}%"
    if fmt == "ratio":
        return f"{value:.2f}"
    if fmt == "days":
        return f"{value:.1f} 天"
    if fmt == "currency":
        return f"{value:.4f}"
    if fmt == "amount":
        if abs(value) >= 1e8:
            return f"{value / 1e8:.2f} 亿"
        if abs(value) >= 1e4:
            return f"{value / 1e4:.2f} 万"
        return f"{value:.2f}"
    return str(value)


def render_text(data, results):
    lines = []
    company = data.get("company_name", "未知公司")
    period = data.get("report_period", "未知期间")
    currency = data.get("currency", "CNY")

    lines.append("=" * 60)
    lines.append(f"  股票基本面分析报告")
    lines.append(f"  公司：{company}  |  报告期：{period}  |  币种：{currency}")
    lines.append("=" * 60)

    category_order = [
        "profitability", "solvency", "liquidity",
        "efficiency", "per_share", "cash_flow", "growth",
    ]

    indicator_count = 0
    for cat_key in category_order:
        cat = results.get(cat_key)
        if not cat:
            continue
        lines.append("")
        lines.append(f"▸ {cat['label']}")
        lines.append("-" * 50)
        for item in cat["items"]:
            val_str = fmt_value(item["value"], item["format"])
            lines.append(f"  {item['name']:<28s} {val_str}")
            lines.append(f"    参考: {item['reference']}")
            indicator_count += 1

    dupont = results.get("dupont", {})
    lines.append("")
    lines.append(f"▸ {dupont.get('label', '杜邦分析')}")
    lines.append("-" * 50)
    lines.append(f"  公式: {dupont.get('description', '')}")
    lines.append("")

    comps = dupont.get("components", {})
    for key in ["net_profit_margin", "asset_turnover", "equity_multiplier"]:
        c = comps.get(key, {})
        lines.append(f"  {c.get('name', key):<20s} = {fmt_value(c.get('value'), c.get('format'))}")

    lines.append("")
    roe_d = dupont.get("roe_decomposed")
    roe_direct = dupont.get("roe_direct")
    lines.append(f"  杜邦分解 ROE        = {fmt_value(roe_d, 'percent')}")
    lines.append(f"  直接计算 ROE        = {fmt_value(roe_direct, 'percent')}")

    if roe_d is not None and roe_direct is not None:
        diff = abs(roe_d - roe_direct)
        if diff < 1e-9:
            lines.append("  ✓ 杜邦分解结果与直接计算一致")
        else:
            lines.append(f"  Δ 差异 = {fmt_value(diff, 'percent')}（因四舍五入或数据口径差异）")

    lines.append("")
    lines.append("=" * 60)
    lines.append(f"  共计算 {indicator_count} 项财务指标 + 杜邦分析")
    lines.append("=" * 60)

    return "\n".join(lines)


def to_json_output(data, results):
    def serialize_category(cat):
        items = []
        for item in cat["items"]:
            items.append({
                "name": item["name"],
                "name_en": item.get("name_en", ""),
                "value": round(item["value"], 6) if item["value"] is not None else None,
                "formatted": fmt_value(item["value"], item["format"]),
                "reference": item["reference"],
            })
        return {"label": cat["label"], "items": items}

    output = {
        "company_name": data.get("company_name", ""),
        "report_period": data.get("report_period", ""),
        "currency": data.get("currency", "CNY"),
        "indicators": {},
        "dupont_analysis": {},
    }

    category_order = [
        "profitability", "solvency", "liquidity",
        "efficiency", "per_share", "cash_flow", "growth",
    ]

    for cat_key in category_order:
        cat = results.get(cat_key)
        if cat:
            output["indicators"][cat_key] = serialize_category(cat)

    dupont = results.get("dupont", {})
    comps = dupont.get("components", {})
    output["dupont_analysis"] = {
        "formula": dupont.get("description", ""),
        "components": {
            k: {
                "name": v.get("name", ""),
                "value": round(v["value"], 6) if v.get("value") is not None else None,
                "formatted": fmt_value(v.get("value"), v.get("format")),
            }
            for k, v in comps.items()
        },
        "roe_decomposed": round(dupont["roe_decomposed"], 6) if dupont.get("roe_decomposed") is not None else None,
        "roe_direct": round(dupont["roe_direct"], 6) if dupont.get("roe_direct") is not None else None,
    }

    return output


def validate_input(data):
    errors = []
    if not isinstance(data, dict):
        return ["输入数据必须是 JSON 对象"]

    if "balance_sheet" not in data:
        errors.append("缺少必填字段: balance_sheet（资产负债表）")
    if "income_statement" not in data:
        errors.append("缺少必填字段: income_statement（利润表）")

    bs = data.get("balance_sheet", {})
    if isinstance(bs, dict):
        if bs.get("total_assets") is None:
            errors.append("balance_sheet 中缺少 total_assets（总资产）")
        if bs.get("shareholders_equity") is None:
            errors.append("balance_sheet 中缺少 shareholders_equity（股东权益）")

    inc = data.get("income_statement", {})
    if isinstance(inc, dict):
        if inc.get("revenue") is None:
            errors.append("income_statement 中缺少 revenue（营业收入）")
        if inc.get("net_income") is None:
            errors.append("income_statement 中缺少 net_income（净利润）")

    for section_name in ["balance_sheet", "income_statement", "cash_flow_statement", "market_data", "prior_year"]:
        section = data.get(section_name, {})
        if isinstance(section, dict):
            for k, v in section.items():
                if v is not None and not isinstance(v, (int, float)):
                    errors.append(f"{section_name}.{k} 的值必须是数字，当前值: {v!r}")

    return errors


def main():
    parser = argparse.ArgumentParser(
        description="股票基本面分析工具 — 计算 20+ 财务指标 + 杜邦分析",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例:
  python3 analyze.py --input data.json
  python3 analyze.py --input data.json --json
  cat data.json | python3 analyze.py --stdin
        """,
    )
    input_group = parser.add_mutually_exclusive_group(required=True)
    input_group.add_argument("--input", "-i", metavar="FILE", help="财报数据 JSON 文件路径")
    input_group.add_argument("--stdin", action="store_true", help="从标准输入读取 JSON 数据")
    parser.add_argument("--json", "-j", action="store_true", help="输出 JSON 格式（默认为文本报告）")

    args = parser.parse_args()

    if args.stdin:
        raw = sys.stdin.read()
    else:
        input_path = Path(args.input)
        if not input_path.is_file():
            print(f"错误：文件不存在 — {args.input}", file=sys.stderr)
            sys.exit(1)
        raw = input_path.read_text(encoding="utf-8")

    try:
        data = json.loads(raw)
    except json.JSONDecodeError as e:
        print(f"错误：JSON 解析失败 — {e}", file=sys.stderr)
        sys.exit(1)

    errors = validate_input(data)
    if errors:
        print("输入数据校验失败：", file=sys.stderr)
        for err in errors:
            print(f"  • {err}", file=sys.stderr)
        sys.exit(1)

    results = compute_indicators(data)

    if args.json:
        output = to_json_output(data, results)
        print(json.dumps(output, ensure_ascii=False, indent=2))
    else:
        print(render_text(data, results))


if __name__ == "__main__":
    main()
