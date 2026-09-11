#!/usr/bin/env python3
"""
Risk Register — 项目风险登记册与概率-影响矩阵热力图生成工具

功能：
  --json  '{ ... }'   从命令行传入 JSON 数据
  --file  risks.json   从文件读取 JSON 数据
  --output report.html 输出 HTML 文件路径（默认输出到 stdout）

输出：自包含 HTML 风险热力图报告。
"""

import argparse
import json
import sys
from datetime import date
from html import escape
from typing import Any


PROB_LABELS = {1: "极低", 2: "低", 3: "中", 4: "高", 5: "极高"}
IMPACT_LABELS = {1: "可忽略", 2: "轻微", 3: "中等", 4: "严重", 5: "灾难性"}


def risk_level(score: int) -> tuple[str, str]:
    if score >= 16:
        return "严重", "critical"
    if score >= 10:
        return "高", "high"
    if score >= 5:
        return "中", "medium"
    return "低", "low"


def validate_input(data: dict[str, Any]) -> None:
    if "risks" not in data or not isinstance(data["risks"], list):
        print("错误：缺少 'risks' 字段或格式不正确（需为数组）", file=sys.stderr)
        sys.exit(1)
    if not data["risks"]:
        print("错误：risks 列表为空，至少需要 1 个风险条目", file=sys.stderr)
        sys.exit(1)
    for i, r in enumerate(data["risks"]):
        for field in ("id", "name", "probability", "impact"):
            if field not in r:
                print(f"错误：第 {i+1} 个风险条目缺少必需字段 '{field}'", file=sys.stderr)
                sys.exit(1)
        if not isinstance(r["probability"], int) or not 1 <= r["probability"] <= 5:
            print(f"错误：风险 {r['id']} 的 probability 必须为 1-5 的整数", file=sys.stderr)
            sys.exit(1)
        if not isinstance(r["impact"], int) or not 1 <= r["impact"] <= 5:
            print(f"错误：风险 {r['id']} 的 impact 必须为 1-5 的整数", file=sys.stderr)
            sys.exit(1)


def build_heatmap_grid(risks: list[dict]) -> dict[tuple[int, int], list[dict]]:
    grid: dict[tuple[int, int], list[dict]] = {}
    for r in risks:
        if r.get("status", "active") == "closed":
            continue
        key = (r["probability"], r["impact"])
        grid.setdefault(key, []).append(r)
    return grid


def cell_bg_color(prob: int, impact: int) -> str:
    score = prob * impact
    if score >= 16:
        return "#dc2626"
    if score >= 10:
        return "#f97316"
    if score >= 5:
        return "#eab308"
    return "#22c55e"


def cell_text_color(prob: int, impact: int) -> str:
    score = prob * impact
    if score >= 16:
        return "#ffffff"
    if score >= 10:
        return "#ffffff"
    return "#1a1a1a"


def generate_html(data: dict[str, Any]) -> str:
    project = escape(data.get("project", "未命名项目"))
    eval_date = escape(data.get("date", str(date.today())))
    risks = data["risks"]

    active_risks = [r for r in risks if r.get("status", "active") != "closed"]

    level_counts = {"low": 0, "medium": 0, "high": 0, "critical": 0}
    for r in active_risks:
        score = r["probability"] * r["impact"]
        _, lvl_class = risk_level(score)
        level_counts[lvl_class] += 1

    grid = build_heatmap_grid(risks)

    sorted_risks = sorted(
        risks,
        key=lambda r: r["probability"] * r["impact"],
        reverse=True,
    )

    heatmap_rows = []
    for prob in range(5, 0, -1):
        cells = []
        for impact in range(1, 6):
            bg = cell_bg_color(prob, impact)
            fg = cell_text_color(prob, impact)
            score = prob * impact
            items = grid.get((prob, impact), [])
            ids_html = ""
            if items:
                tags = []
                for r in items:
                    rid = escape(r["id"])
                    rname = escape(r["name"])
                    tags.append(
                        f'<span class="risk-tag" title="{rid}: {rname}">{rid}</span>'
                    )
                ids_html = " ".join(tags)
            cells.append(
                f'<td class="heatmap-cell" style="background:{bg};color:{fg};">'
                f'<div class="cell-score">{score}</div>'
                f'<div class="cell-risks">{ids_html}</div>'
                f"</td>"
            )
        prob_label = escape(PROB_LABELS[prob])
        heatmap_rows.append(
            f'<tr><td class="axis-label">{prob} - {prob_label}</td>'
            + "".join(cells)
            + "</tr>"
        )

    impact_headers = "".join(
        f"<th>{i} - {escape(IMPACT_LABELS[i])}</th>" for i in range(1, 6)
    )

    table_rows = []
    for r in sorted_risks:
        score = r["probability"] * r["impact"]
        level_name, level_class = risk_level(score)
        table_rows.append(
            "<tr>"
            f'<td>{escape(str(r["id"]))}</td>'
            f'<td>{escape(str(r["name"]))}</td>'
            f'<td>{escape(str(r.get("category", "-")))}</td>'
            f"<td>{r['probability']}</td>"
            f"<td>{r['impact']}</td>"
            f'<td><span class="badge badge-{level_class}">{score} ({level_name})</span></td>'
            f'<td>{escape(str(r.get("owner", "-")))}</td>'
            f'<td>{escape(str(r.get("mitigation", "-")))}</td>'
            f'<td>{escape(str(r.get("status", "active")))}</td>'
            "</tr>"
        )

    category_counts: dict[str, int] = {}
    for r in active_risks:
        cat = r.get("category", "未分类")
        category_counts[cat] = category_counts.get(cat, 0) + 1

    cat_bars = ""
    if category_counts:
        max_count = max(category_counts.values())
        for cat, count in sorted(category_counts.items(), key=lambda x: -x[1]):
            pct = count / max_count * 100
            cat_bars += (
                f'<div class="cat-row">'
                f'<span class="cat-name">{escape(cat)}</span>'
                f'<div class="cat-bar-bg"><div class="cat-bar" style="width:{pct}%"></div></div>'
                f'<span class="cat-count">{count}</span>'
                f"</div>"
            )

    html = f"""<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>风险登记册 — {project}</title>
<style>
  * {{ margin: 0; padding: 0; box-sizing: border-box; }}
  body {{ font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #f8fafc; color: #1e293b; padding: 24px; }}
  .container {{ max-width: 1200px; margin: 0 auto; }}
  h1 {{ font-size: 28px; font-weight: 700; margin-bottom: 4px; }}
  .subtitle {{ color: #64748b; font-size: 14px; margin-bottom: 24px; }}
  .summary {{ display: flex; gap: 16px; margin-bottom: 32px; flex-wrap: wrap; }}
  .stat-card {{ background: #fff; border-radius: 12px; padding: 16px 20px; flex: 1; min-width: 140px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }}
  .stat-card .num {{ font-size: 32px; font-weight: 700; }}
  .stat-card .label {{ font-size: 13px; color: #64748b; margin-top: 2px; }}
  .stat-card.critical .num {{ color: #dc2626; }}
  .stat-card.high .num {{ color: #f97316; }}
  .stat-card.medium .num {{ color: #ca8a04; }}
  .stat-card.low .num {{ color: #22c55e; }}
  .section {{ background: #fff; border-radius: 12px; padding: 24px; margin-bottom: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }}
  .section h2 {{ font-size: 18px; font-weight: 600; margin-bottom: 16px; }}
  table.heatmap {{ border-collapse: collapse; width: 100%; }}
  table.heatmap th, table.heatmap td {{ text-align: center; padding: 8px; }}
  table.heatmap th {{ background: #f1f5f9; font-size: 12px; font-weight: 600; color: #475569; }}
  .axis-label {{ background: #f1f5f9 !important; font-size: 12px; font-weight: 600; color: #475569; white-space: nowrap; min-width: 100px; }}
  .heatmap-cell {{ width: 18%; height: 72px; border-radius: 6px; border: 2px solid #fff; vertical-align: top; padding: 6px !important; position: relative; }}
  .cell-score {{ font-size: 11px; opacity: 0.7; }}
  .cell-risks {{ margin-top: 2px; display: flex; flex-wrap: wrap; gap: 3px; justify-content: center; }}
  .risk-tag {{ background: rgba(255,255,255,0.3); border-radius: 3px; padding: 1px 5px; font-size: 11px; font-weight: 600; cursor: default; }}
  .y-axis-label {{ writing-mode: vertical-rl; text-orientation: mixed; transform: rotate(180deg); font-size: 13px; font-weight: 600; color: #475569; padding: 8px; text-align: center; }}
  .x-axis-label {{ font-size: 13px; font-weight: 600; color: #475569; text-align: center; padding-top: 8px; }}
  table.register {{ border-collapse: collapse; width: 100%; font-size: 13px; }}
  table.register th {{ background: #f1f5f9; padding: 10px 12px; text-align: left; font-weight: 600; color: #475569; border-bottom: 2px solid #e2e8f0; white-space: nowrap; }}
  table.register td {{ padding: 10px 12px; border-bottom: 1px solid #f1f5f9; }}
  table.register tr:hover {{ background: #f8fafc; }}
  .badge {{ display: inline-block; padding: 3px 10px; border-radius: 999px; font-size: 12px; font-weight: 600; }}
  .badge-critical {{ background: #fef2f2; color: #dc2626; }}
  .badge-high {{ background: #fff7ed; color: #ea580c; }}
  .badge-medium {{ background: #fefce8; color: #a16207; }}
  .badge-low {{ background: #f0fdf4; color: #16a34a; }}
  .two-col {{ display: flex; gap: 24px; flex-wrap: wrap; }}
  .two-col > * {{ flex: 1; min-width: 300px; }}
  .cat-row {{ display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }}
  .cat-name {{ font-size: 13px; min-width: 80px; text-align: right; color: #475569; }}
  .cat-bar-bg {{ flex: 1; height: 20px; background: #f1f5f9; border-radius: 4px; overflow: hidden; }}
  .cat-bar {{ height: 100%; background: #6366f1; border-radius: 4px; transition: width 0.3s; }}
  .cat-count {{ font-size: 13px; font-weight: 600; min-width: 24px; }}
  .legend {{ display: flex; gap: 16px; margin-bottom: 12px; flex-wrap: wrap; }}
  .legend-item {{ display: flex; align-items: center; gap: 6px; font-size: 12px; color: #64748b; }}
  .legend-color {{ width: 16px; height: 16px; border-radius: 3px; }}
  .footer {{ text-align: center; color: #94a3b8; font-size: 12px; margin-top: 32px; }}
  @media (max-width: 768px) {{
    .summary {{ flex-direction: column; }}
    .two-col {{ flex-direction: column; }}
    table.register {{ font-size: 12px; }}
    table.register th, table.register td {{ padding: 6px 8px; }}
  }}
</style>
</head>
<body>
<div class="container">
  <h1>风险登记册 — {project}</h1>
  <p class="subtitle">评估日期：{eval_date} &nbsp;|&nbsp; 共 {len(risks)} 项风险（活跃 {len(active_risks)} 项）</p>

  <div class="summary">
    <div class="stat-card critical">
      <div class="num">{level_counts['critical']}</div>
      <div class="label">严重风险</div>
    </div>
    <div class="stat-card high">
      <div class="num">{level_counts['high']}</div>
      <div class="label">高风险</div>
    </div>
    <div class="stat-card medium">
      <div class="num">{level_counts['medium']}</div>
      <div class="label">中风险</div>
    </div>
    <div class="stat-card low">
      <div class="num">{level_counts['low']}</div>
      <div class="label">低风险</div>
    </div>
  </div>

  <div class="section">
    <h2>概率-影响矩阵（风险热力图）</h2>
    <div class="legend">
      <div class="legend-item"><div class="legend-color" style="background:#dc2626"></div>严重 (16-25)</div>
      <div class="legend-item"><div class="legend-color" style="background:#f97316"></div>高 (10-15)</div>
      <div class="legend-item"><div class="legend-color" style="background:#eab308"></div>中 (5-9)</div>
      <div class="legend-item"><div class="legend-color" style="background:#22c55e"></div>低 (1-4)</div>
    </div>
    <table class="heatmap">
      <thead>
        <tr>
          <th>概率 \\ 影响</th>
          {impact_headers}
        </tr>
      </thead>
      <tbody>
        {"".join(heatmap_rows)}
      </tbody>
    </table>
    <p class="x-axis-label">影响程度 →</p>
  </div>

  <div class="section">
    <h2>风险登记表（按评分降序）</h2>
    <div style="overflow-x:auto">
    <table class="register">
      <thead>
        <tr>
          <th>编号</th><th>风险名称</th><th>类别</th><th>概率</th><th>影响</th><th>风险等级</th><th>责任人</th><th>应对措施</th><th>状态</th>
        </tr>
      </thead>
      <tbody>
        {"".join(table_rows)}
      </tbody>
    </table>
    </div>
  </div>

  <div class="two-col">
    <div class="section">
      <h2>按类别分布</h2>
      {cat_bars if cat_bars else '<p style="color:#94a3b8">无分类数据</p>'}
    </div>
    <div class="section">
      <h2>风险等级分布</h2>
      <div class="cat-row">
        <span class="cat-name">严重</span>
        <div class="cat-bar-bg"><div class="cat-bar" style="width:{level_counts['critical']/max(len(active_risks),1)*100}%;background:#dc2626"></div></div>
        <span class="cat-count">{level_counts['critical']}</span>
      </div>
      <div class="cat-row">
        <span class="cat-name">高</span>
        <div class="cat-bar-bg"><div class="cat-bar" style="width:{level_counts['high']/max(len(active_risks),1)*100}%;background:#f97316"></div></div>
        <span class="cat-count">{level_counts['high']}</span>
      </div>
      <div class="cat-row">
        <span class="cat-name">中</span>
        <div class="cat-bar-bg"><div class="cat-bar" style="width:{level_counts['medium']/max(len(active_risks),1)*100}%;background:#eab308"></div></div>
        <span class="cat-count">{level_counts['medium']}</span>
      </div>
      <div class="cat-row">
        <span class="cat-name">低</span>
        <div class="cat-bar-bg"><div class="cat-bar" style="width:{level_counts['low']/max(len(active_risks),1)*100}%;background:#22c55e"></div></div>
        <span class="cat-count">{level_counts['low']}</span>
      </div>
    </div>
  </div>

  <p class="footer">由 Risk Register Skill 自动生成 &nbsp;|&nbsp; {eval_date}</p>
</div>
</body>
</html>"""

    return html


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Risk Register — 项目风险登记册与热力图生成工具",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例：
  python3 generate_risk_heatmap.py --file risks.json --output report.html
  python3 generate_risk_heatmap.py --json '{"project":"Demo","risks":[{"id":"R001","name":"测试风险","probability":3,"impact":4}]}'
        """,
    )
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--json", type=str, help="JSON 格式的风险数据字符串")
    group.add_argument("--file", type=str, help="JSON 文件路径")
    parser.add_argument("--output", type=str, help="输出 HTML 文件路径（不指定则输出到 stdout）")

    args = parser.parse_args()

    if args.json:
        try:
            data = json.loads(args.json)
        except json.JSONDecodeError as e:
            print(f"错误：JSON 解析失败 — {e}", file=sys.stderr)
            sys.exit(1)
    else:
        try:
            with open(args.file, encoding="utf-8") as f:
                data = json.load(f)
        except FileNotFoundError:
            print(f"错误：文件不存在 — {args.file}", file=sys.stderr)
            sys.exit(1)
        except json.JSONDecodeError as e:
            print(f"错误：文件 JSON 解析失败 — {e}", file=sys.stderr)
            sys.exit(1)

    validate_input(data)
    html = generate_html(data)

    if args.output:
        with open(args.output, "w", encoding="utf-8") as f:
            f.write(html)
        print(f"已生成风险报告：{args.output}", file=sys.stderr)
    else:
        sys.stdout.write(html)


if __name__ == "__main__":
    main()
