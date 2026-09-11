#!/usr/bin/env python3
"""
Project Timeline - 交互式 HTML 甘特图生成器
支持关键路径分析（CPM）、依赖关系可视化、浮动时间展示

用法:
  python3 gantt_generator.py --json '{"project":"Demo","tasks":[...]}'
  python3 gantt_generator.py --file tasks.json --output gantt.html
"""

import argparse
import json
import sys
from datetime import datetime, timedelta
from collections import defaultdict, deque


def validate_tasks(data):
    if not isinstance(data, dict):
        raise ValueError("输入必须是 JSON 对象")
    if "tasks" not in data:
        raise ValueError("缺少 'tasks' 字段")
    tasks = data["tasks"]
    if not isinstance(tasks, list) or len(tasks) == 0:
        raise ValueError("'tasks' 必须是非空数组")

    task_ids = set()
    for i, task in enumerate(tasks):
        for field in ("id", "name", "duration"):
            if field not in task:
                raise ValueError(f"任务 #{i+1} 缺少必填字段 '{field}'")
        if not isinstance(task["duration"], (int, float)) or task["duration"] <= 0:
            raise ValueError(f"任务 '{task['id']}' 的 duration 必须为正数")
        if task["id"] in task_ids:
            raise ValueError(f"任务 ID '{task['id']}' 重复")
        task_ids.add(task["id"])
        task.setdefault("dependencies", [])
        if not isinstance(task["dependencies"], list):
            raise ValueError(f"任务 '{task['id']}' 的 dependencies 必须是数组")

    for task in tasks:
        for dep in task["dependencies"]:
            if dep not in task_ids:
                raise ValueError(f"任务 '{task['id']}' 依赖不存在的任务 '{dep}'")
    return data


def topological_sort(tasks):
    in_degree = {t["id"]: 0 for t in tasks}
    adj = defaultdict(list)
    for task in tasks:
        for dep in task["dependencies"]:
            adj[dep].append(task["id"])
            in_degree[task["id"]] += 1

    queue = deque(tid for tid, deg in in_degree.items() if deg == 0)
    order = []
    while queue:
        tid = queue.popleft()
        order.append(tid)
        for next_tid in adj[tid]:
            in_degree[next_tid] -= 1
            if in_degree[next_tid] == 0:
                queue.append(next_tid)

    if len(order) != len(tasks):
        raise ValueError("检测到循环依赖，无法生成甘特图")
    return order


def compute_critical_path(tasks):
    task_map = {t["id"]: t for t in tasks}
    order = topological_sort(tasks)

    es, ef = {}, {}
    for tid in order:
        task = task_map[tid]
        es[tid] = max((ef[d] for d in task["dependencies"]), default=0)
        ef[tid] = es[tid] + task["duration"]

    project_duration = max(ef.values())

    dependents = defaultdict(list)
    for task in tasks:
        for dep in task["dependencies"]:
            dependents[dep].append(task["id"])

    ls, lf = {}, {}
    for tid in reversed(order):
        lf[tid] = min((ls[d] for d in dependents[tid]), default=project_duration)
        ls[tid] = lf[tid] - task_map[tid]["duration"]

    critical_path = []
    for task in tasks:
        tid = task["id"]
        task["es"] = es[tid]
        task["ef"] = ef[tid]
        task["ls"] = ls[tid]
        task["lf"] = lf[tid]
        task["total_float"] = round(ls[tid] - es[tid], 2)
        task["is_critical"] = abs(task["total_float"]) < 1e-9
        if task["is_critical"]:
            critical_path.append(tid)

    return tasks, critical_path, project_duration


def _esc(s):
    return (
        str(s)
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
        .replace("'", "&#39;")
    )


def _safe_json_for_html(obj):
    """JSON 序列化后转义 </ 防止 script 标签被截断"""
    return json.dumps(obj, ensure_ascii=False).replace("</", r"<\/")


def generate_html(project_name, tasks, critical_path, project_duration, start_date):
    tasks_json = _safe_json_for_html(tasks)
    critical_json = _safe_json_for_html(critical_path)
    start_str = start_date.strftime("%Y-%m-%d")
    end_date = start_date + timedelta(days=int(project_duration))
    end_str = end_date.strftime("%Y-%m-%d")
    critical_count = len(critical_path)
    total_count = len(tasks)

    return f"""<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{_esc(project_name)} - 甘特图</title>
<style>
:root {{
  --critical: #E53935;
  --critical-light: #FFCDD2;
  --normal: #1E88E5;
  --normal-light: #BBDEFB;
  --float-color: #FFA726;
  --bg: #FAFAFA;
  --surface: #FFFFFF;
  --grid: #E8E8E8;
  --text: #333333;
  --text-light: #777777;
  --row-h: 40px;
  --header-h: 36px;
  --label-w: 240px;
  --day-w: 40px;
  --shadow: 0 2px 8px rgba(0,0,0,0.08);
}}
* {{ box-sizing: border-box; margin: 0; padding: 0; }}
body {{
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  background: var(--bg); color: var(--text); line-height: 1.5;
}}
.header {{
  background: var(--surface); padding: 20px 28px; box-shadow: var(--shadow);
  display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px;
}}
.header h1 {{ font-size: 22px; font-weight: 600; }}
.stats {{ display: flex; gap: 20px; flex-wrap: wrap; }}
.stat {{ text-align: center; }}
.stat-value {{ font-size: 20px; font-weight: 700; }}
.stat-value.critical {{ color: var(--critical); }}
.stat-label {{ font-size: 12px; color: var(--text-light); }}
.controls {{
  background: var(--surface); padding: 10px 28px; border-bottom: 1px solid var(--grid);
  display: flex; align-items: center; gap: 24px; flex-wrap: wrap;
}}
.controls label {{ font-size: 13px; color: var(--text-light); }}
.controls input[type="range"] {{ width: 120px; cursor: pointer; }}
.legend {{ display: flex; gap: 16px; font-size: 13px; }}
.legend-item {{ display: flex; align-items: center; gap: 5px; }}
.legend-dot {{
  width: 12px; height: 12px; border-radius: 3px; flex-shrink: 0;
}}
.legend-dot.critical {{ background: var(--critical); }}
.legend-dot.normal {{ background: var(--normal); }}
.legend-dot.float {{ background: var(--float-color); opacity: 0.5; }}
.btn {{
  padding: 5px 14px; border-radius: 4px; border: 1px solid var(--grid); cursor: pointer;
  font-size: 13px; background: var(--surface); color: var(--text); transition: all 0.2s;
}}
.btn:hover {{ background: #f0f0f0; }}
.btn.active {{ background: var(--critical); color: white; border-color: var(--critical); }}
.chart-wrapper {{
  margin: 16px; background: var(--surface); border-radius: 8px;
  box-shadow: var(--shadow); overflow: hidden; position: relative;
}}
.chart-scroll {{
  overflow: auto; max-height: calc(100vh - 200px); position: relative;
}}
.chart-inner {{ display: flex; min-width: max-content; }}
.labels {{
  position: sticky; left: 0; z-index: 20; background: var(--surface);
  border-right: 2px solid var(--grid); flex-shrink: 0; width: var(--label-w);
}}
.label-header {{
  height: var(--header-h); padding: 0 16px; font-weight: 600; font-size: 13px;
  display: flex; align-items: center; border-bottom: 1px solid var(--grid);
  background: #F5F5F5; position: sticky; top: 0; z-index: 25;
}}
.label-row {{
  height: var(--row-h); padding: 0 12px; display: flex; align-items: center;
  font-size: 13px; border-bottom: 1px solid #f0f0f0; cursor: pointer;
  transition: background 0.15s; gap: 8px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}}
.label-row:hover {{ background: #f5f8ff; }}
.label-row.selected {{ background: #E3F2FD; }}
.label-row.related {{ background: #FFF3E0; }}
.indicator {{
  width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; background: var(--normal);
}}
.indicator.critical {{ background: var(--critical); }}
.timeline {{ flex: 1; position: relative; }}
.time-header {{
  height: var(--header-h); position: sticky; top: 0; z-index: 15;
  background: #F5F5F5; border-bottom: 1px solid var(--grid); display: flex;
}}
.time-cell {{
  height: var(--header-h); display: flex; align-items: center; justify-content: center;
  font-size: 11px; color: var(--text-light); border-right: 1px solid #eee; flex-shrink: 0;
}}
.time-cell.weekend {{ background: #FAFAFA; }}
.bars-area {{ position: relative; }}
.grid-line {{
  position: absolute; top: 0; width: 1px; background: var(--grid); opacity: 0.5;
  pointer-events: none;
}}
.row-bg {{
  position: absolute; left: 0; right: 0; height: var(--row-h);
  border-bottom: 1px solid #f5f5f5;
}}
.row-bg:nth-child(odd) {{ background: rgba(0,0,0,0.01); }}
.task-bar {{
  position: absolute; height: 24px; border-radius: 4px; cursor: pointer;
  transition: opacity 0.2s, box-shadow 0.2s; z-index: 5;
  display: flex; align-items: center; padding: 0 6px; overflow: hidden;
  font-size: 11px; color: white; font-weight: 500;
}}
.task-bar.normal {{ background: var(--normal); }}
.task-bar.critical {{ background: var(--critical); }}
.task-bar:hover {{ box-shadow: 0 2px 8px rgba(0,0,0,0.2); z-index: 6; }}
.task-bar.selected {{ box-shadow: 0 0 0 3px rgba(30,136,229,0.4); z-index: 7; }}
.task-bar.dimmed {{ opacity: 0.3; }}
.float-bar {{
  position: absolute; right: 0; top: 0; height: 100%; background: var(--float-color);
  opacity: 0.3; border-radius: 0 4px 4px 0; transform: translateX(100%); pointer-events: none;
}}
.today-line {{
  position: absolute; top: 0; width: 2px; background: #4CAF50; z-index: 10;
  pointer-events: none;
}}
.today-label {{
  position: absolute; top: -18px; transform: translateX(-50%);
  font-size: 10px; color: #4CAF50; font-weight: 600; white-space: nowrap;
}}
.tooltip {{
  position: fixed; display: none; background: rgba(30,30,30,0.95); color: white;
  padding: 12px 16px; border-radius: 8px; font-size: 13px; z-index: 1000;
  pointer-events: none; max-width: 320px; box-shadow: 0 4px 16px rgba(0,0,0,0.2);
}}
.tooltip-title {{ font-weight: 600; margin-bottom: 8px; font-size: 14px; }}
.tooltip-row {{ margin: 3px 0; display: flex; justify-content: space-between; gap: 12px; }}
.tooltip-label {{ color: #aaa; }}
.badge {{
  display: inline-block; padding: 1px 6px; border-radius: 3px; font-size: 11px; font-weight: 600;
}}
.badge.critical {{ background: var(--critical); color: white; }}
.summary {{
  margin: 0 16px 16px; background: var(--surface); border-radius: 8px;
  box-shadow: var(--shadow); padding: 16px 24px;
}}
.summary h3 {{ font-size: 14px; margin-bottom: 8px; }}
.path-list {{ display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }}
.path-node {{
  padding: 4px 10px; border-radius: 4px; font-size: 12px; font-weight: 500;
  background: var(--critical-light); color: var(--critical);
}}
.path-arrow {{ color: var(--critical); font-size: 14px; }}
</style>
</head>
<body>
<div class="header">
  <h1>{_esc(project_name)}</h1>
  <div class="stats">
    <div class="stat">
      <div class="stat-value">{int(project_duration)}</div>
      <div class="stat-label">总工期（天）</div>
    </div>
    <div class="stat">
      <div class="stat-value critical">{critical_count}</div>
      <div class="stat-label">关键任务</div>
    </div>
    <div class="stat">
      <div class="stat-value">{total_count}</div>
      <div class="stat-label">任务总数</div>
    </div>
    <div class="stat">
      <div class="stat-value">{_esc(start_str)}</div>
      <div class="stat-label">开始日期</div>
    </div>
    <div class="stat">
      <div class="stat-value">{_esc(end_str)}</div>
      <div class="stat-label">结束日期</div>
    </div>
  </div>
</div>

<div class="controls">
  <div>
    <label>缩放: </label>
    <input type="range" id="zoom" min="20" max="100" value="40">
  </div>
  <div class="legend">
    <span class="legend-item"><span class="legend-dot critical"></span>关键路径</span>
    <span class="legend-item"><span class="legend-dot normal"></span>非关键任务</span>
    <span class="legend-item"><span class="legend-dot float"></span>浮动时间</span>
  </div>
  <button class="btn" id="toggleCritical">仅显示关键路径</button>
  <button class="btn" id="exportBtn">导出 JSON</button>
</div>

<div class="chart-wrapper">
  <div class="chart-scroll" id="chartScroll">
    <div class="chart-inner">
      <div class="labels" id="labels"></div>
      <div class="timeline" id="timeline">
        <div class="time-header" id="timeHeader"></div>
        <div class="bars-area" id="barsArea"></div>
      </div>
    </div>
  </div>
</div>

<div class="summary" id="summaryPanel"></div>

<div class="tooltip" id="tooltip"></div>

<script>
(function() {{
  "use strict";
  const TASKS = {tasks_json};
  const PROJECT_DURATION = {project_duration};
  const START_DATE = "{start_str}";
  const CRITICAL_PATH = {critical_json};

  let dayWidth = 40;
  let showOnlyCritical = false;
  let selectedTaskId = null;

  const $ = (id) => document.getElementById(id);
  const labelsEl = $("labels");
  const timeHeaderEl = $("timeHeader");
  const barsAreaEl = $("barsArea");
  const tooltipEl = $("tooltip");
  const summaryEl = $("summaryPanel");

  function getStartDate() {{ return new Date(START_DATE + "T00:00:00"); }}
  function addDays(d, n) {{ const r = new Date(d); r.setDate(r.getDate() + n); return r; }}
  function fmtDate(d) {{ return (d.getMonth()+1) + "/" + d.getDate(); }}
  function fmtFull(d) {{ return d.getFullYear() + "-" + String(d.getMonth()+1).padStart(2,"0") + "-" + String(d.getDate()).padStart(2,"0"); }}
  function isWeekend(d) {{ const day = d.getDay(); return day === 0 || day === 6; }}

  function esc(s) {{
    const d = document.createElement("div");
    d.textContent = String(s);
    return d.innerHTML;
  }}

  function getVisibleTasks() {{
    return showOnlyCritical ? TASKS.filter(t => t.is_critical) : TASKS;
  }}

  function render() {{
    renderLabels();
    renderTimeHeader();
    renderBars();
    renderArrows();
    renderSummary();
  }}

  function renderLabels() {{
    const tasks = getVisibleTasks();
    let html = '<div class="label-header">任务名称</div>';
    tasks.forEach(t => {{
      const cls = ["label-row"];
      if (t.is_critical) cls.push("critical-row");
      if (t.id === selectedTaskId) cls.push("selected");
      html += '<div class="' + cls.join(" ") + '" data-task-id="' + esc(t.id) + '">'
        + '<span class="indicator ' + (t.is_critical ? "critical" : "") + '"></span>'
        + esc(t.name)
        + '</div>';
    }});
    labelsEl.innerHTML = html;
    labelsEl.querySelectorAll(".label-row").forEach(el => {{
      el.addEventListener("click", () => selectTask(el.dataset.taskId));
    }});
  }}

  function renderTimeHeader() {{
    const base = getStartDate();
    let html = "";
    const step = dayWidth < 25 ? 7 : dayWidth < 35 ? 3 : 1;
    for (let d = 0; d < PROJECT_DURATION; d++) {{
      const dt = addDays(base, d);
      const we = isWeekend(dt) ? " weekend" : "";
      const label = (d % step === 0) ? fmtDate(dt) : "";
      html += '<div class="time-cell' + we + '" style="width:' + dayWidth + 'px">' + label + '</div>';
    }}
    timeHeaderEl.innerHTML = html;
    timeHeaderEl.style.width = (PROJECT_DURATION * dayWidth) + "px";
  }}

  function renderBars() {{
    const tasks = getVisibleTasks();
    const rowH = 40;
    const barH = 24;
    const barOffset = (rowH - barH) / 2;
    let html = "";

    for (let i = 0; i < tasks.length; i++) {{
      html += '<div class="row-bg" style="top:' + (i * rowH) + 'px;height:' + rowH + 'px"></div>';
    }}

    for (let d = 0; d <= PROJECT_DURATION; d++) {{
      html += '<div class="grid-line" style="left:' + (d * dayWidth) + 'px;height:' + (tasks.length * rowH) + 'px"></div>';
    }}

    tasks.forEach((t, i) => {{
      const x = t.es * dayWidth;
      const w = t.duration * dayWidth - 2;
      const y = i * rowH + barOffset;
      const cls = "task-bar " + (t.is_critical ? "critical" : "normal");
      const barLabel = w > 50 ? esc(t.name) : "";
      let floatHtml = "";
      if (t.total_float > 0) {{
        const fw = t.total_float * dayWidth;
        floatHtml = '<div class="float-bar" style="width:' + fw + 'px"></div>';
      }}
      html += '<div class="' + cls + '" data-task-id="' + esc(t.id) + '" '
        + 'style="left:' + x + 'px;top:' + y + 'px;width:' + w + 'px;height:' + barH + 'px">'
        + barLabel + floatHtml + '</div>';
    }});

    const today = new Date();
    today.setHours(0,0,0,0);
    const base = getStartDate();
    const diffDays = Math.round((today - base) / 86400000);
    if (diffDays >= 0 && diffDays <= PROJECT_DURATION) {{
      const tx = diffDays * dayWidth;
      html += '<div class="today-line" style="left:' + tx + 'px;height:' + (tasks.length * rowH) + 'px">'
        + '<div class="today-label">今天</div></div>';
    }}

    barsAreaEl.innerHTML = html;
    barsAreaEl.style.width = (PROJECT_DURATION * dayWidth + 60) + "px";
    barsAreaEl.style.height = (tasks.length * rowH) + "px";

    barsAreaEl.querySelectorAll(".task-bar").forEach(el => {{
      el.addEventListener("mouseenter", (e) => showTooltip(e, el.dataset.taskId));
      el.addEventListener("mousemove", moveTooltip);
      el.addEventListener("mouseleave", hideTooltip);
      el.addEventListener("click", () => selectTask(el.dataset.taskId));
    }});
  }}

  function renderArrows() {{
    const old = document.getElementById("arrowsSvg");
    if (old) old.remove();

    const tasks = getVisibleTasks();
    const idxMap = {{}};
    tasks.forEach((t, i) => {{ idxMap[t.id] = i; }});
    const rowH = 40;
    const totalW = PROJECT_DURATION * dayWidth + 60;
    const totalH = tasks.length * rowH;

    const ns = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(ns, "svg");
    svg.id = "arrowsSvg";
    svg.setAttribute("width", totalW);
    svg.setAttribute("height", totalH);
    Object.assign(svg.style, {{ position: "absolute", top: "0", left: "0", pointerEvents: "none", zIndex: "4" }});

    const defs = document.createElementNS(ns, "defs");
    [["ah","#999"], ["ahc","#E53935"]].forEach(([id, fill]) => {{
      const m = document.createElementNS(ns, "marker");
      m.setAttribute("id", id);
      m.setAttribute("markerWidth", "8");
      m.setAttribute("markerHeight", "6");
      m.setAttribute("refX", "8");
      m.setAttribute("refY", "3");
      m.setAttribute("orient", "auto");
      const p = document.createElementNS(ns, "polygon");
      p.setAttribute("points", "0 0, 8 3, 0 6");
      p.setAttribute("fill", fill);
      m.appendChild(p);
      defs.appendChild(m);
    }});
    svg.appendChild(defs);

    const taskMap = {{}};
    TASKS.forEach(t => {{ taskMap[t.id] = t; }});

    tasks.forEach(task => {{
      task.dependencies.forEach(depId => {{
        if (!(depId in idxMap) || !(task.id in idxMap)) return;
        const dep = taskMap[depId];
        const isCrit = task.is_critical && dep.is_critical;
        const x1 = dep.ef * dayWidth - 1;
        const y1 = idxMap[depId] * rowH + rowH / 2;
        const x2 = task.es * dayWidth;
        const y2 = idxMap[task.id] * rowH + rowH / 2;
        const mx = x1 + Math.max((x2 - x1) / 2, 8);

        const path = document.createElementNS(ns, "path");
        let d;
        if (Math.abs(y1 - y2) < 1) {{
          d = "M " + x1 + " " + y1 + " L " + x2 + " " + y2;
        }} else {{
          d = "M " + x1 + " " + y1 + " L " + mx + " " + y1 + " L " + mx + " " + y2 + " L " + x2 + " " + y2;
        }}
        path.setAttribute("d", d);
        path.setAttribute("stroke", isCrit ? "#E53935" : "#999");
        path.setAttribute("stroke-width", isCrit ? "2" : "1.2");
        path.setAttribute("fill", "none");
        path.setAttribute("marker-end", "url(#" + (isCrit ? "ahc" : "ah") + ")");
        path.setAttribute("data-from", depId);
        path.setAttribute("data-to", task.id);
        svg.appendChild(path);
      }});
    }});

    barsAreaEl.appendChild(svg);
  }}

  function renderSummary() {{
    const pathNames = CRITICAL_PATH.map(id => {{
      const t = TASKS.find(t => t.id === id);
      return t ? t.name : id;
    }});
    let html = '<h3>关键路径（共 ' + CRITICAL_PATH.length + ' 个任务，总工期 ' + PROJECT_DURATION + ' 天）</h3>';
    html += '<div class="path-list">';
    pathNames.forEach((name, i) => {{
      if (i > 0) html += '<span class="path-arrow">→</span>';
      html += '<span class="path-node">' + esc(name) + '</span>';
    }});
    html += '</div>';
    summaryEl.innerHTML = html;
  }}

  function showTooltip(e, taskId) {{
    const t = TASKS.find(x => x.id === taskId);
    if (!t) return;
    const base = getStartDate();
    const esDate = fmtFull(addDays(base, t.es));
    const efDate = fmtFull(addDays(base, t.ef));
    tooltipEl.innerHTML =
      '<div class="tooltip-title">' + esc(t.name) + (t.is_critical ? ' <span class="badge critical">关键</span>' : '') + '</div>'
      + '<div class="tooltip-row"><span class="tooltip-label">ID</span><span>' + esc(t.id) + '</span></div>'
      + '<div class="tooltip-row"><span class="tooltip-label">工期</span><span>' + t.duration + ' 天</span></div>'
      + '<div class="tooltip-row"><span class="tooltip-label">最早开始</span><span>第' + t.es + '天 (' + esDate + ')</span></div>'
      + '<div class="tooltip-row"><span class="tooltip-label">最早完成</span><span>第' + t.ef + '天 (' + efDate + ')</span></div>'
      + '<div class="tooltip-row"><span class="tooltip-label">最晚开始</span><span>第' + t.ls + '天</span></div>'
      + '<div class="tooltip-row"><span class="tooltip-label">最晚完成</span><span>第' + t.lf + '天</span></div>'
      + '<div class="tooltip-row"><span class="tooltip-label">浮动时间</span><span>' + t.total_float + ' 天</span></div>';
    tooltipEl.style.display = "block";
    moveTooltip(e);
  }}

  function moveTooltip(e) {{
    const pad = 15;
    let x = e.clientX + pad;
    let y = e.clientY + pad;
    const rect = tooltipEl.getBoundingClientRect();
    if (x + rect.width > window.innerWidth) x = e.clientX - rect.width - pad;
    if (y + rect.height > window.innerHeight) y = e.clientY - rect.height - pad;
    tooltipEl.style.left = x + "px";
    tooltipEl.style.top = y + "px";
  }}

  function hideTooltip() {{ tooltipEl.style.display = "none"; }}

  function selectTask(taskId) {{
    selectedTaskId = selectedTaskId === taskId ? null : taskId;
    document.querySelectorAll(".task-bar").forEach(el => {{
      el.classList.remove("selected", "dimmed");
    }});
    document.querySelectorAll(".label-row").forEach(el => {{
      el.classList.remove("selected", "related");
    }});

    if (selectedTaskId) {{
      const task = TASKS.find(t => t.id === selectedTaskId);
      const related = new Set(task.dependencies);
      TASKS.forEach(t => {{ if (t.dependencies.includes(selectedTaskId)) related.add(t.id); }});

      document.querySelectorAll(".task-bar").forEach(el => {{
        if (el.dataset.taskId === selectedTaskId) el.classList.add("selected");
        else if (!related.has(el.dataset.taskId)) el.classList.add("dimmed");
      }});
      document.querySelectorAll(".label-row").forEach(el => {{
        if (el.dataset.taskId === selectedTaskId) el.classList.add("selected");
        else if (related.has(el.dataset.taskId)) el.classList.add("related");
      }});
    }}
  }}

  $("zoom").addEventListener("input", function() {{
    dayWidth = parseInt(this.value);
    render();
  }});

  $("toggleCritical").addEventListener("click", function() {{
    showOnlyCritical = !showOnlyCritical;
    this.textContent = showOnlyCritical ? "显示全部任务" : "仅显示关键路径";
    this.classList.toggle("active", showOnlyCritical);
    selectedTaskId = null;
    render();
  }});

  $("exportBtn").addEventListener("click", function() {{
    const data = {{
      project: {_safe_json_for_html(project_name)},
      start_date: START_DATE,
      project_duration: PROJECT_DURATION,
      critical_path: CRITICAL_PATH,
      tasks: TASKS
    }};
    const blob = new Blob([JSON.stringify(data, null, 2)], {{ type: "application/json" }});
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "gantt_data.json";
    a.click();
    URL.revokeObjectURL(a.href);
  }});

  render();
}})();
</script>
</body>
</html>"""


def main():
    parser = argparse.ArgumentParser(
        description="Project Timeline - 交互式甘特图生成器（支持关键路径分析）",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例:
  # 从 JSON 字符串生成
  python3 gantt_generator.py --json '{"project":"示例","tasks":[{"id":"T1","name":"需求","duration":5,"dependencies":[]},{"id":"T2","name":"设计","duration":3,"dependencies":["T1"]}]}'

  # 从文件生成并输出到 HTML
  python3 gantt_generator.py --file tasks.json --output gantt.html

  # 指定开始日期
  python3 gantt_generator.py --file tasks.json --start-date 2026-05-01 -o gantt.html
""",
    )

    input_group = parser.add_mutually_exclusive_group(required=True)
    input_group.add_argument("--json", help="JSON 格式的任务数据字符串")
    input_group.add_argument("--file", help="包含任务数据的 JSON 文件路径")

    parser.add_argument("--start-date", help="项目开始日期 (YYYY-MM-DD)，默认今天")
    parser.add_argument("--output", "-o", help="输出 HTML 文件路径，默认输出到 stdout")
    parser.add_argument("--title", help="覆盖项目标题")

    args = parser.parse_args()

    try:
        if args.json:
            data = json.loads(args.json)
        else:
            with open(args.file, "r", encoding="utf-8") as f:
                data = json.load(f)
    except json.JSONDecodeError as e:
        print(f"错误: JSON 解析失败 - {e}", file=sys.stderr)
        sys.exit(1)
    except FileNotFoundError:
        print(f"错误: 文件 '{args.file}' 不存在", file=sys.stderr)
        sys.exit(1)
    except OSError as e:
        print(f"错误: 无法读取文件 - {e}", file=sys.stderr)
        sys.exit(1)

    try:
        data = validate_tasks(data)
    except ValueError as e:
        print(f"错误: {e}", file=sys.stderr)
        sys.exit(1)

    project_name = args.title or data.get("project", "项目甘特图")

    start_date_str = args.start_date or data.get("start_date")
    if start_date_str:
        try:
            start_date = datetime.strptime(start_date_str, "%Y-%m-%d")
        except ValueError:
            print("错误: 日期格式必须为 YYYY-MM-DD", file=sys.stderr)
            sys.exit(1)
    else:
        start_date = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)

    try:
        tasks, critical_path, project_duration = compute_critical_path(data["tasks"])
    except ValueError as e:
        print(f"错误: {e}", file=sys.stderr)
        sys.exit(1)

    html_content = generate_html(
        project_name, tasks, critical_path, project_duration, start_date
    )

    if args.output:
        try:
            with open(args.output, "w", encoding="utf-8") as f:
                f.write(html_content)
            print(f"甘特图已生成: {args.output}", file=sys.stderr)
        except OSError as e:
            print(f"错误: 无法写入文件 - {e}", file=sys.stderr)
            sys.exit(1)
    else:
        sys.stdout.write(html_content)


if __name__ == "__main__":
    main()
