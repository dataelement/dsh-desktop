#!/usr/bin/env python3
"""
DCF (Discounted Cash Flow) Valuation Model with Sensitivity Analysis Matrix.

Computes enterprise value via projected free cash flows + terminal value,
then generates a sensitivity matrix across growth-rate and discount-rate ranges.

Usage:
    python dcf_model.py --fcf 1000 --growth 0.15 --discount 0.10 --terminal-growth 0.03
    python dcf_model.py --fcf 1000 --growth 0.15 --discount 0.10 --sensitivity --output result.csv
"""

import argparse
import csv
import json
import math
import os
import sys


def parse_range(range_str):
    """Parse 'min,max,step' into a list of floats."""
    parts = range_str.split(",")
    if len(parts) != 3:
        raise ValueError(f"Range must be 'min,max,step', got: '{range_str}'")
    lo, hi, step = float(parts[0]), float(parts[1]), float(parts[2])
    if step <= 0:
        raise ValueError(f"Step must be positive, got: {step}")
    if lo > hi:
        raise ValueError(f"Min ({lo}) must be <= Max ({hi})")
    result = []
    val = lo
    while val <= hi + 1e-9:
        result.append(round(val, 6))
        val += step
    return result


def project_fcfs(base_fcf, growth_rate, years):
    """Project free cash flows for each year."""
    fcfs = []
    fcf = base_fcf
    for _ in range(years):
        fcf *= (1 + growth_rate)
        fcfs.append(fcf)
    return fcfs


def terminal_value_perpetuity(last_fcf, terminal_growth, discount_rate):
    """Terminal value using Gordon Growth Model: FCF*(1+g) / (r-g)."""
    if discount_rate <= terminal_growth:
        raise ValueError(
            f"Discount rate ({discount_rate:.2%}) must exceed terminal growth "
            f"({terminal_growth:.2%}) for perpetuity model."
        )
    return last_fcf * (1 + terminal_growth) / (discount_rate - terminal_growth)


def discount_cash_flows(cash_flows, discount_rate):
    """Discount a list of cash flows to present value."""
    return [cf / (1 + discount_rate) ** (i + 1) for i, cf in enumerate(cash_flows)]


def compute_dcf(base_fcf, growth_rate, discount_rate, terminal_growth, years):
    """Run a full DCF valuation and return all intermediate results."""
    projected = project_fcfs(base_fcf, growth_rate, years)
    tv = terminal_value_perpetuity(projected[-1], terminal_growth, discount_rate)
    pv_fcfs = discount_cash_flows(projected, discount_rate)
    pv_tv = tv / (1 + discount_rate) ** years
    ev = sum(pv_fcfs) + pv_tv

    return {
        "base_fcf": base_fcf,
        "growth_rate": growth_rate,
        "discount_rate": discount_rate,
        "terminal_growth": terminal_growth,
        "years": years,
        "projected_fcfs": projected,
        "pv_fcfs": pv_fcfs,
        "terminal_value": tv,
        "pv_terminal_value": pv_tv,
        "sum_pv_fcfs": sum(pv_fcfs),
        "enterprise_value": ev,
    }


def compute_equity_value(enterprise_value, net_debt, cash):
    """Equity Value = Enterprise Value - Net Debt + Cash."""
    return enterprise_value - net_debt + cash


def sensitivity_matrix(base_fcf, growth_rates, discount_rates, terminal_growth, years):
    """
    Build a 2D sensitivity matrix: rows=growth rates, cols=discount rates.
    Each cell = enterprise value.
    """
    matrix = []
    for gr in growth_rates:
        row = []
        for dr in discount_rates:
            if dr <= terminal_growth:
                row.append(None)
            else:
                result = compute_dcf(base_fcf, gr, dr, terminal_growth, years)
                row.append(result["enterprise_value"])
        matrix.append(row)
    return matrix


def format_number(val, currency=""):
    """Format a number with thousand separators."""
    if val is None:
        return "N/A"
    suffix = f" {currency}" if currency else ""
    if abs(val) >= 1e8:
        return f"{val:,.0f}{suffix}"
    if abs(val) < 0.01 and val != 0:
        return f"{val:,.6f}{suffix}"
    return f"{val:,.2f}{suffix}"


def print_dcf_report(result, net_debt, cash, shares, currency):
    """Print a formatted DCF valuation report."""
    print("=" * 70)
    print("  DCF Valuation Report / DCF 估值报告")
    print("=" * 70)
    print()

    print(f"  Base FCF (基准自由现金流):  {format_number(result['base_fcf'], currency)}")
    print(f"  Growth Rate (增长率):       {result['growth_rate']:.2%}")
    print(f"  Discount Rate (折现率):     {result['discount_rate']:.2%}")
    print(f"  Terminal Growth (永续增长):  {result['terminal_growth']:.2%}")
    print(f"  Projection Years (预测年数): {result['years']}")
    print()

    print("-" * 70)
    print(f"  {'Year':<8} {'Projected FCF':>18} {'PV of FCF':>18}")
    print(f"  {'年份':<10} {'预测FCF':>16} {'折现值':>20}")
    print("-" * 70)
    for i in range(result["years"]):
        yr = i + 1
        fcf_str = format_number(result["projected_fcfs"][i], currency)
        pv_str = format_number(result["pv_fcfs"][i], currency)
        print(f"  {yr:<8} {fcf_str:>18} {pv_str:>18}")
    print("-" * 70)
    print(f"  {'Total':.<8} {'':>18} {format_number(result['sum_pv_fcfs'], currency):>18}")
    print()

    print(f"  Terminal Value (终值):            {format_number(result['terminal_value'], currency)}")
    print(f"  PV of Terminal Value (终值折现):   {format_number(result['pv_terminal_value'], currency)}")
    print()

    ev = result["enterprise_value"]
    print(f"  Enterprise Value (企业价值):       {format_number(ev, currency)}")

    if net_debt > 0 or cash > 0:
        eq_val = compute_equity_value(ev, net_debt, cash)
        print(f"  - Net Debt (净负债):              {format_number(net_debt, currency)}")
        print(f"  + Cash (现金):                    {format_number(cash, currency)}")
        print(f"  = Equity Value (股权价值):         {format_number(eq_val, currency)}")

        if shares > 0:
            per_share = eq_val / shares
            print(f"  Shares Outstanding (总股本):      {shares:,.0f}")
            print(f"  Value Per Share (每股价值):        {format_number(per_share, currency)}")

    print()
    print("=" * 70)


def print_sensitivity_matrix(matrix, growth_rates, discount_rates, currency,
                              base_growth=None, base_discount=None):
    """Print a formatted sensitivity analysis matrix."""
    print()
    print("=" * 70)
    print("  Sensitivity Analysis: Enterprise Value / 敏感性分析矩阵")
    print("  (Rows = Growth Rate 增长率, Columns = Discount Rate 折现率)")
    print("=" * 70)
    print()

    col_width = 14
    header = f"  {'GR \\ DR':<10}"
    for dr in discount_rates:
        label = f"{dr:.1%}"
        header += f"{label:>{col_width}}"
    print(header)
    print("  " + "-" * (10 + col_width * len(discount_rates)))

    for i, gr in enumerate(growth_rates):
        gr_label = f"{gr:.1%}"
        line = f"  {gr_label:<10}"
        for j, dr in enumerate(discount_rates):
            val = matrix[i][j]
            if val is None:
                cell = "N/A"
            else:
                if abs(val) >= 1e6:
                    cell = f"{val:,.0f}"
                else:
                    cell = f"{val:,.2f}"
            is_base = (base_growth is not None and abs(gr - base_growth) < 1e-9 and
                       base_discount is not None and abs(dr - base_discount) < 1e-9)
            if is_base:
                cell = f"[{cell}]"
            line += f"{cell:>{col_width}}"
        print(line)

    print()
    if base_growth is not None and base_discount is not None:
        print(f"  [x] = Base case / 基准情景 (growth={base_growth:.1%}, discount={base_discount:.1%})")
    print()


def export_sensitivity_csv(matrix, growth_rates, discount_rates, filepath, currency):
    """Export sensitivity matrix to CSV."""
    with open(filepath, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        header_label = "Growth \\ Discount"
        if currency:
            header_label += f" ({currency})"
        header = [header_label] + [f"{dr:.2%}" for dr in discount_rates]
        writer.writerow(header)
        for i, gr in enumerate(growth_rates):
            row = [f"{gr:.2%}"]
            for j in range(len(discount_rates)):
                val = matrix[i][j]
                row.append(f"{val:,.2f}" if val is not None else "N/A")
            writer.writerow(row)
    print(f"  Sensitivity matrix exported to: {filepath}")


def export_json(result, matrix_data, filepath):
    """Export full results as JSON."""

    def make_serializable(obj):
        if isinstance(obj, float):
            if math.isnan(obj) or math.isinf(obj):
                return None
            return round(obj, 4)
        if isinstance(obj, list):
            return [make_serializable(x) for x in obj]
        if isinstance(obj, dict):
            return {k: make_serializable(v) for k, v in obj.items()}
        return obj

    output = {"dcf_result": make_serializable(result)}
    if matrix_data:
        output["sensitivity"] = make_serializable(matrix_data)
    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)
    print(f"  Full results exported to: {filepath}")


def build_parser():
    parser = argparse.ArgumentParser(
        description="DCF Valuation Model with Sensitivity Analysis Matrix",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Basic DCF valuation
  python dcf_model.py --fcf 1000 --growth 0.15 --discount 0.10

  # With sensitivity matrix
  python dcf_model.py --fcf 1000 --growth 0.15 --discount 0.10 --sensitivity

  # Custom sensitivity ranges and CSV export
  python dcf_model.py --fcf 5000 --growth 0.12 --discount 0.09 \\
      --sensitivity --growth-range 0.05,0.25,0.05 --discount-range 0.07,0.13,0.01 \\
      --output valuation.csv

  # Full equity valuation with per-share price
  python dcf_model.py --fcf 2000 --growth 0.10 --discount 0.08 \\
      --debt 5000 --cash 3000 --shares 1000000 --currency "万元"
        """,
    )

    parser.add_argument("--fcf", type=float, required=True,
                        help="Base year Free Cash Flow (required)")
    parser.add_argument("--growth", type=float, required=True,
                        help="Annual revenue/FCF growth rate, e.g. 0.15 for 15%%")
    parser.add_argument("--discount", type=float, required=True,
                        help="Discount rate (WACC), e.g. 0.10 for 10%%")
    parser.add_argument("--terminal-growth", type=float, default=0.03,
                        help="Terminal growth rate (default: 0.03 = 3%%)")
    parser.add_argument("--years", type=int, default=5,
                        help="Number of projection years (default: 5)")

    parser.add_argument("--debt", type=float, default=0,
                        help="Net debt (for equity value calculation)")
    parser.add_argument("--cash", type=float, default=0,
                        help="Cash and equivalents")
    parser.add_argument("--shares", type=float, default=0,
                        help="Shares outstanding (for per-share value)")

    parser.add_argument("--sensitivity", action="store_true",
                        help="Generate sensitivity analysis matrix")
    parser.add_argument("--growth-range", type=str, default=None,
                        help="Growth rate range: min,max,step (e.g. 0.05,0.25,0.05)")
    parser.add_argument("--discount-range", type=str, default=None,
                        help="Discount rate range: min,max,step (e.g. 0.06,0.14,0.02)")

    parser.add_argument("--output", type=str, default=None,
                        help="Output file path (.csv or .json)")
    parser.add_argument("--currency", type=str, default="",
                        help='Currency unit label (e.g. "万元", "M USD")')
    parser.add_argument("--json", action="store_true",
                        help="Output results as JSON to stdout")

    return parser


def validate_args(args):
    """Validate arguments and return list of error messages."""
    errors = []
    if args.fcf <= 0:
        errors.append(f"FCF must be positive, got: {args.fcf}")
    if args.growth < -0.5 or args.growth > 1.0:
        errors.append(f"Growth rate should be between -50% and 100%, got: {args.growth:.2%}")
    if args.discount <= 0 or args.discount > 0.5:
        errors.append(f"Discount rate should be between 0% and 50%, got: {args.discount:.2%}")
    if args.terminal_growth < 0 or args.terminal_growth >= args.discount:
        errors.append(
            f"Terminal growth ({args.terminal_growth:.2%}) must be >= 0 and "
            f"< discount rate ({args.discount:.2%})"
        )
    if args.years < 1 or args.years > 30:
        errors.append(f"Projection years should be 1-30, got: {args.years}")
    # Net debt can be negative (company has more cash than debt on the balance sheet)
    if args.cash < 0:
        errors.append(f"Cash cannot be negative, got: {args.cash}")
    if args.shares < 0:
        errors.append(f"Shares cannot be negative, got: {args.shares}")
    if args.output:
        ext = os.path.splitext(args.output)[1].lower()
        if ext not in (".csv", ".json"):
            errors.append(f"Output file must be .csv or .json, got: {args.output}")
    return errors


def default_sensitivity_range(base_val, steps=5, step_size=None):
    """Generate a symmetric range around the base value."""
    if step_size is None:
        step_size = max(0.01, round(base_val * 0.2, 2))
    half = steps // 2
    return [round(base_val + (i - half) * step_size, 6)
            for i in range(steps)
            if base_val + (i - half) * step_size > -1e-9]


def main():
    parser = build_parser()
    args = parser.parse_args()

    errors = validate_args(args)
    if errors:
        for e in errors:
            print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)

    result = compute_dcf(
        base_fcf=args.fcf,
        growth_rate=args.growth,
        discount_rate=args.discount,
        terminal_growth=args.terminal_growth,
        years=args.years,
    )

    if args.json and not args.sensitivity:
        output = dict(result)
        ev = result["enterprise_value"]
        if args.debt > 0 or args.cash > 0:
            eq = compute_equity_value(ev, args.debt, args.cash)
            output["equity_value"] = eq
            if args.shares > 0:
                output["value_per_share"] = eq / args.shares
        json.dump({k: (round(v, 4) if isinstance(v, float) else
                       [round(x, 4) for x in v] if isinstance(v, list) else v)
                   for k, v in output.items()},
                  sys.stdout, ensure_ascii=False, indent=2)
        print()
        sys.exit(0)

    if not args.json:
        print_dcf_report(result, args.debt, args.cash, args.shares, args.currency)

    matrix_data = None
    if args.sensitivity:
        if args.growth_range:
            growth_rates = parse_range(args.growth_range)
        else:
            growth_rates = default_sensitivity_range(args.growth, steps=5, step_size=0.02)

        if args.discount_range:
            discount_rates = parse_range(args.discount_range)
        else:
            discount_rates = default_sensitivity_range(args.discount, steps=5, step_size=0.01)

        growth_rates = [g for g in growth_rates if g >= -0.5]
        discount_rates = [d for d in discount_rates if d > args.terminal_growth]

        if not growth_rates:
            print("Error: No valid growth rates in range.", file=sys.stderr)
            sys.exit(1)
        if not discount_rates:
            print("Error: No valid discount rates in range (must exceed terminal growth).",
                  file=sys.stderr)
            sys.exit(1)

        matrix = sensitivity_matrix(
            args.fcf, growth_rates, discount_rates,
            args.terminal_growth, args.years,
        )

        matrix_data = {
            "growth_rates": growth_rates,
            "discount_rates": discount_rates,
            "matrix": matrix,
        }

        if args.json:
            full_output = {
                "dcf_result": result,
                "sensitivity": matrix_data,
            }
            json.dump(full_output, sys.stdout, ensure_ascii=False, indent=2, default=str)
            print()
        else:
            print_sensitivity_matrix(
                matrix, growth_rates, discount_rates, args.currency,
                base_growth=args.growth, base_discount=args.discount,
            )

        if args.output:
            ext = os.path.splitext(args.output)[1].lower()
            if ext == ".csv":
                export_sensitivity_csv(matrix, growth_rates, discount_rates,
                                       args.output, args.currency)
            elif ext == ".json":
                export_json(result, matrix_data, args.output)

    elif args.output:
        ext = os.path.splitext(args.output)[1].lower()
        if ext == ".json":
            export_json(result, None, args.output)
        elif ext == ".csv":
            print("Warning: CSV export only available with --sensitivity flag.",
                  file=sys.stderr)

    if not args.json:
        print()
        print("Done.")


if __name__ == "__main__":
    main()
