#!/usr/bin/env python3
"""
build_infographic.py — Generate self-contained HTML/SVG infographics from JSON data.

Supported infographic types:
  - stats:      KPI / statistics card grid
  - comparison: Grouped bar chart with multiple series
  - flow:       Process / step-by-step flow diagram
  - dashboard:  Mixed layout (stats + chart + breakdown donut)

Usage:
    python3 build_infographic.py config.json
    cat config.json | python3 build_infographic.py

Output: self-contained HTML file (all CSS/SVG inline, no external deps).
"""

import json
import math
import os
import sys
from html import escape as _esc

# ---------------------------------------------------------------------------
# Color palettes
# ---------------------------------------------------------------------------

PALETTES = {
    "ocean": {
        "bg": "#eef4fb", "card": "#ffffff", "primary": "#0077b6",
        "text": "#023e8a", "text_light": "#4a6fa5",
        "colors": ["#0077b6", "#00b4d8", "#48cae4", "#90e0ef", "#0096c7", "#005f8a"],
        "up": "#0a9396", "down": "#e63946",
    },
    "sunset": {
        "bg": "#fef6f0", "card": "#ffffff", "primary": "#e76f51",
        "text": "#1d3557", "text_light": "#6b7b8d",
        "colors": ["#e63946", "#f4845f", "#f7b267", "#e76f51", "#c1121f", "#d4a373"],
        "up": "#2a9d8f", "down": "#e63946",
    },
    "forest": {
        "bg": "#eef7ee", "card": "#ffffff", "primary": "#2d6a4f",
        "text": "#1b4332", "text_light": "#6b8f71",
        "colors": ["#2d6a4f", "#40916c", "#52b788", "#74c69d", "#95d5b2", "#1b4332"],
        "up": "#2d6a4f", "down": "#c1121f",
    },
    "berry": {
        "bg": "#f8f0fa", "card": "#ffffff", "primary": "#7b2cbf",
        "text": "#3c096c", "text_light": "#8a6baa",
        "colors": ["#7b2cbf", "#9d4edd", "#c77dff", "#e0aaff", "#5a189a", "#240046"],
        "up": "#2a9d8f", "down": "#e63946",
    },
    "vibrant": {
        "bg": "#f5f6fa", "card": "#ffffff", "primary": "#4361ee",
        "text": "#1a1a2e", "text_light": "#6c757d",
        "colors": ["#4361ee", "#f72585", "#4cc9f0", "#7209b7", "#3a0ca3", "#f77f00"],
        "up": "#06d6a0", "down": "#ef476f",
    },
    "corporate": {
        "bg": "#f0f2f5", "card": "#ffffff", "primary": "#1a365d",
        "text": "#1a202c", "text_light": "#718096",
        "colors": ["#1a365d", "#2b6cb0", "#3182ce", "#63b3ed", "#2c5282", "#4a5568"],
        "up": "#38a169", "down": "#e53e3e",
    },
    "pastel": {
        "bg": "#fafafa", "card": "#ffffff", "primary": "#6c8ebf",
        "text": "#333333", "text_light": "#888888",
        "colors": ["#6c8ebf", "#d4a5a5", "#a8d8b9", "#f0d9b5", "#b8b8d1", "#f5c6aa"],
        "up": "#68b684", "down": "#d4a5a5",
    },
    "earth": {
        "bg": "#f9f5f0", "card": "#ffffff", "primary": "#8b5e3c",
        "text": "#3e2723", "text_light": "#795548",
        "colors": ["#8b5e3c", "#a0522d", "#c49a6c", "#ddc9a3", "#6d4c41", "#5d4037"],
        "up": "#558b2f", "down": "#c62828",
    },
}

_PALETTE_NAMES = list(PALETTES.keys())

# ---------------------------------------------------------------------------
# SVG icon paths (viewBox 0 0 24 24)
# ---------------------------------------------------------------------------

ICONS = {
    "arrow-up": '<path d="M12 4l-8 8h5v8h6v-8h5z"/>',
    "arrow-down": '<path d="M12 20l8-8h-5V4h-6v8H4z"/>',
    "trending-up": '<path d="M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6h-6z"/>',
    "trending-down": '<path d="M16 18l2.29-2.29-4.88-4.88-4 4L2 7.41 3.41 6l6 6 4-4 6.3 6.29L22 12v6h-6z"/>',
    "users": '<path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>',
    "user": '<path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>',
    "money": '<path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z"/>',
    "percent": '<path d="M7.5 11C9.43 11 11 9.43 11 7.5S9.43 4 7.5 4 4 5.57 4 7.5 5.57 11 7.5 11zm0-5C8.33 6 9 6.67 9 7.5S8.33 9 7.5 9 6 8.33 6 7.5 6.67 6 7.5 6zM4.81 20L20 4.81 18.19 3 3 18.19 4.81 20zM16.5 13c-1.93 0-3.5 1.57-3.5 3.5s1.57 3.5 3.5 3.5 3.5-1.57 3.5-3.5-1.57-3.5-3.5-3.5zm0 5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/>',
    "globe": '<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>',
    "clock": '<path d="M12 2C6.49 2 2 6.49 2 12s4.49 10 10 10 10-4.49 10-10S17.51 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67V7z"/>',
    "check": '<path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>',
    "star": '<path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>',
    "target": '<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="5" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="1.5"/>',
    "zap": '<path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>',
    "chart-bar": '<path d="M5 9.2h3V19H5zM10.6 5h2.8v14h-2.8zm5.6 8H19v6h-2.8z"/>',
    "chart-pie": '<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8v8l6.93 4A7.96 7.96 0 0112 20z"/>',
    "database": '<ellipse cx="12" cy="5.5" rx="8" ry="3" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M4 5.5v13c0 1.66 3.58 3 8 3s8-1.34 8-3v-13" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M4 12c0 1.66 3.58 3 8 3s8-1.34 8-3" fill="none" stroke="currentColor" stroke-width="1.8"/>',
    "rocket": '<path d="M12 2.5s-7 5.5-7 13.5h14C19 8 12 2.5 12 2.5zM7 20c0 1.1.9 2 2 2h6c1.1 0 2-.9 2-2v-1H7v1z"/>',
    "shield": '<path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/>',
    "heart": '<path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>',
    "light": '<path d="M9 21c0 .55.45 1 1 1h4c.55 0 1-.45 1-1v-1H9v1zm3-19C8.14 2 5 5.14 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.86-3.14-7-7-7z"/>',
    "search": '<path d="M15.5 14h-.79l-.28-.27A6.47 6.47 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>',
    "mail": '<path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>',
    "settings": '<path d="M19.14 12.94c.04-.31.06-.63.06-.94s-.02-.63-.06-.94l2.03-1.58a.49.49 0 00.12-.61l-1.92-3.32a.49.49 0 00-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54A.48.48 0 0014 2h-3.84a.48.48 0 00-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96a.49.49 0 00-.59.22L2.81 8.87a.49.49 0 00.12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58a.49.49 0 00-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32a.49.49 0 00-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>',
    "flag": '<path d="M14.4 6L14 4H5v17h2v-7h5.6l.4 2h7V6z"/>',
}

# ---------------------------------------------------------------------------
# Utility helpers
# ---------------------------------------------------------------------------


def _pick_palette(name, data):
    if name and name != "auto" and name in PALETTES:
        return PALETTES[name]
    idx = hash(json.dumps(data, sort_keys=True, ensure_ascii=False)) % len(_PALETTE_NAMES)
    return PALETTES[_PALETTE_NAMES[idx]]


def _get_color(palette, index):
    colors = palette["colors"]
    return colors[index % len(colors)]


def _svg_icon(name, size=24, color="currentColor"):
    path_data = ICONS.get(name, ICONS.get("star", ""))
    needs_fill = "fill=\"none\"" not in path_data and "stroke=" not in path_data
    fill_attr = f' fill="{_esc(color)}"' if needs_fill else ""
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{size}" height="{size}" '
        f'viewBox="0 0 24 24" style="color:{_esc(color)};fill:{_esc(color)}"'
        f'{fill_attr}>{path_data}</svg>'
    )


def _format_number(v):
    if isinstance(v, str):
        return v
    if isinstance(v, float):
        if v >= 1_000_000:
            return f"{v / 1_000_000:.1f}M"
        if v >= 1_000:
            return f"{v / 1_000:.1f}K"
        return f"{v:.1f}"
    if isinstance(v, int):
        if v >= 1_000_000:
            return f"{v / 1_000_000:.1f}M"
        if v >= 1_000:
            return f"{v:,}"
        return str(v)
    return str(v)


# ---------------------------------------------------------------------------
# SVG chart generators
# ---------------------------------------------------------------------------


def _svg_bar_chart(data, palette, chart_w=760, chart_h=360):
    categories = data.get("categories", [])
    series_list = data.get("series", [])
    if not categories or not series_list:
        return '<p style="color:#888">No chart data provided.</p>'

    pad_l, pad_r, pad_t, pad_b = 65, 20, 30, 55
    plot_w = chart_w - pad_l - pad_r
    plot_h = chart_h - pad_t - pad_b

    all_vals = [v for s in series_list for v in s.get("values", [])]
    if not all_vals:
        return '<p style="color:#888">No values in series.</p>'
    max_val = max(all_vals) * 1.15 or 1

    n_cat = len(categories)
    n_ser = len(series_list)
    group_w = plot_w / n_cat
    bar_gap = max(2, group_w * 0.1)
    bar_w = max(8, (group_w - bar_gap * 2) / n_ser)

    lines = [
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {chart_w} {chart_h}" '
        f'style="width:100%;max-width:{chart_w}px;height:auto">'
    ]

    n_ticks = 5
    for i in range(n_ticks + 1):
        val = max_val * i / n_ticks
        y = pad_t + plot_h - (plot_h * i / n_ticks)
        lines.append(
            f'<line x1="{pad_l}" y1="{y:.1f}" x2="{pad_l + plot_w}" y2="{y:.1f}" '
            f'stroke="#e0e0e0" stroke-width="1"/>'
        )
        lines.append(
            f'<text x="{pad_l - 8}" y="{y + 4:.1f}" text-anchor="end" '
            f'font-size="11" fill="{palette["text_light"]}">{_format_number(val)}</text>'
        )

    for ci, cat in enumerate(categories):
        cx = pad_l + group_w * ci + group_w / 2
        y = pad_t + plot_h + 20
        lines.append(
            f'<text x="{cx:.1f}" y="{y}" text-anchor="middle" '
            f'font-size="12" fill="{palette["text"]}">{_esc(str(cat))}</text>'
        )

    for si, series in enumerate(series_list):
        color = _get_color(palette, si)
        for ci, val in enumerate(series.get("values", [])):
            bar_h = (val / max_val) * plot_h if max_val else 0
            x = pad_l + group_w * ci + bar_gap + bar_w * si
            y = pad_t + plot_h - bar_h
            lines.append(
                f'<rect x="{x:.1f}" y="{y:.1f}" width="{bar_w:.1f}" '
                f'height="{bar_h:.1f}" rx="3" fill="{color}" opacity="0.88">'
                f'<title>{_esc(str(series.get("name", "")))}: {_format_number(val)}</title></rect>'
            )

    if n_ser > 1:
        leg_y = chart_h - 8
        leg_x = pad_l
        for si, series in enumerate(series_list):
            color = _get_color(palette, si)
            lines.append(
                f'<rect x="{leg_x}" y="{leg_y - 8}" width="12" height="12" rx="2" fill="{color}"/>'
            )
            lines.append(
                f'<text x="{leg_x + 16}" y="{leg_y + 2}" font-size="11" '
                f'fill="{palette["text"]}">{_esc(str(series.get("name", "")))}</text>'
            )
            leg_x += 16 + len(str(series.get("name", ""))) * 7 + 20

    lines.append("</svg>")
    return "\n".join(lines)


def _svg_donut_chart(items, palette, size=280):
    if not items:
        return ""
    total = sum(it.get("value", 0) for it in items) or 1
    cx, cy = size / 2, size / 2
    outer_r = size / 2 - 10
    inner_r = outer_r * 0.6

    lines = [
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {size} {size}" '
        f'style="width:100%;max-width:{size}px;height:auto">'
    ]

    angle = 0
    for i, it in enumerate(items):
        val = it.get("value", 0)
        sweep = (val / total) * 360
        if sweep < 0.5:
            angle += sweep
            continue
        color = it.get("color") or _get_color(palette, i)

        a1 = math.radians(angle - 90)
        a2 = math.radians(angle + sweep - 90)
        ox1, oy1 = cx + outer_r * math.cos(a1), cy + outer_r * math.sin(a1)
        ox2, oy2 = cx + outer_r * math.cos(a2), cy + outer_r * math.sin(a2)
        ix1, iy1 = cx + inner_r * math.cos(a2), cy + inner_r * math.sin(a2)
        ix2, iy2 = cx + inner_r * math.cos(a1), cy + inner_r * math.sin(a1)
        large = 1 if sweep > 180 else 0

        d = (
            f"M {ox1:.2f} {oy1:.2f} "
            f"A {outer_r:.2f} {outer_r:.2f} 0 {large} 1 {ox2:.2f} {oy2:.2f} "
            f"L {ix1:.2f} {iy1:.2f} "
            f"A {inner_r:.2f} {inner_r:.2f} 0 {large} 0 {ix2:.2f} {iy2:.2f} Z"
        )
        label_text = _esc(str(it.get("label", "")))
        pct = f"{val / total * 100:.1f}%"
        lines.append(
            f'<path d="{d}" fill="{color}" opacity="0.9">'
            f"<title>{label_text}: {pct}</title></path>"
        )
        angle += sweep

    lines.append(
        f'<text x="{cx}" y="{cy - 4}" text-anchor="middle" '
        f'font-size="20" font-weight="700" fill="{palette["text"]}">'
        f"{_format_number(total)}</text>"
    )
    lines.append(
        f'<text x="{cx}" y="{cy + 16}" text-anchor="middle" '
        f'font-size="12" fill="{palette["text_light"]}">Total</text>'
    )
    lines.append("</svg>")
    return "\n".join(lines)


def _svg_flow_diagram(steps, palette, step_w=180, step_h=90, gap=50):
    n = len(steps)
    if n == 0:
        return ""
    total_w = n * step_w + (n - 1) * gap + 40
    total_h = step_h + 80
    lines = [
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {total_w} {total_h}" '
        f'style="width:100%;max-width:{total_w}px;height:auto;overflow:visible">'
    ]

    lines.append('<defs>')
    lines.append(
        f'<marker id="arrowhead" markerWidth="10" markerHeight="7" '
        f'refX="10" refY="3.5" orient="auto">'
        f'<polygon points="0 0, 10 3.5, 0 7" fill="{palette["primary"]}"/>'
        f'</marker>'
    )
    lines.append('</defs>')

    y_center = total_h / 2
    for i, step in enumerate(steps):
        x = 20 + i * (step_w + gap)
        color = _get_color(palette, i)
        ry = y_center - step_h / 2

        lines.append(
            f'<rect x="{x}" y="{ry:.1f}" width="{step_w}" height="{step_h}" '
            f'rx="12" fill="{color}" opacity="0.13"/>'
        )
        lines.append(
            f'<rect x="{x}" y="{ry:.1f}" width="{step_w}" height="{step_h}" '
            f'rx="12" fill="none" stroke="{color}" stroke-width="2"/>'
        )

        icon_name = step.get("icon", "check")
        step_num = step.get("step", i + 1)
        title = _esc(str(step.get("title", f"Step {step_num}")))
        desc = _esc(str(step.get("description", "")))

        badge_cx = x + 22
        badge_cy = ry + 22
        lines.append(
            f'<circle cx="{badge_cx}" cy="{badge_cy}" r="14" fill="{color}"/>'
        )
        lines.append(
            f'<text x="{badge_cx}" y="{badge_cy + 5}" text-anchor="middle" '
            f'font-size="13" font-weight="700" fill="#fff">{step_num}</text>'
        )

        lines.append(
            f'<text x="{x + step_w / 2}" y="{ry + 48}" text-anchor="middle" '
            f'font-size="14" font-weight="600" fill="{palette["text"]}">{title}</text>'
        )
        if desc:
            lines.append(
                f'<text x="{x + step_w / 2}" y="{ry + 68}" text-anchor="middle" '
                f'font-size="11" fill="{palette["text_light"]}">{desc}</text>'
            )

        if i < n - 1:
            ax1 = x + step_w + 4
            ax2 = x + step_w + gap - 4
            lines.append(
                f'<line x1="{ax1}" y1="{y_center}" x2="{ax2}" y2="{y_center}" '
                f'stroke="{palette["primary"]}" stroke-width="2" '
                f'marker-end="url(#arrowhead)"/>'
            )

    lines.append("</svg>")
    return "\n".join(lines)


# ---------------------------------------------------------------------------
# Section builders
# ---------------------------------------------------------------------------


def _build_stats(data, palette):
    items = data if isinstance(data, list) else data.get("items", data.get("stats", []))
    if not items:
        return '<p style="color:#888">No stats data provided.</p>'

    cards = []
    for i, item in enumerate(items):
        label = _esc(str(item.get("label", "")))
        value = _esc(str(item.get("value", "")))
        icon_name = item.get("icon", "star")
        trend = item.get("trend", "")
        trend_dir = item.get("trend_dir", "up")
        color = _get_color(palette, i)
        trend_color = palette["up"] if trend_dir == "up" else palette["down"]
        trend_icon = "trending-up" if trend_dir == "up" else "trending-down"

        trend_html = ""
        if trend:
            trend_html = (
                f'<div style="display:flex;align-items:center;gap:4px;'
                f'color:{trend_color};font-size:13px;font-weight:600;margin-top:4px">'
                f'{_svg_icon(trend_icon, 16, trend_color)} {_esc(str(trend))}'
                f"</div>"
            )

        cards.append(
            f'<div style="background:{palette["card"]};border-radius:14px;padding:24px;'
            f"box-shadow:0 2px 12px rgba(0,0,0,0.06);display:flex;flex-direction:column;"
            f'gap:8px;min-width:180px">'
            f'<div style="display:flex;align-items:center;justify-content:space-between">'
            f'<span style="font-size:13px;color:{palette["text_light"]};font-weight:500">'
            f"{label}</span>"
            f'<div style="background:{color}18;border-radius:10px;padding:8px;'
            f'display:flex;align-items:center;justify-content:center">'
            f"{_svg_icon(icon_name, 22, color)}</div></div>"
            f'<div style="font-size:28px;font-weight:700;color:{palette["text"]};'
            f'letter-spacing:-0.5px">{value}</div>'
            f"{trend_html}</div>"
        )

    return (
        '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));'
        f'gap:20px">{" ".join(cards)}</div>'
    )


def _build_comparison(data, palette):
    chart_title = data.get("chart_title", "")
    title_html = ""
    if chart_title:
        title_html = (
            f'<h3 style="margin:0 0 16px;font-size:18px;font-weight:600;'
            f'color:{palette["text"]}">{_esc(chart_title)}</h3>'
        )
    chart_svg = _svg_bar_chart(data, palette)
    return (
        f'<div style="background:{palette["card"]};border-radius:14px;padding:28px;'
        f'box-shadow:0 2px 12px rgba(0,0,0,0.06)">{title_html}{chart_svg}</div>'
    )


def _build_flow(data, palette):
    steps = data if isinstance(data, list) else data.get("steps", [])
    if not steps:
        return '<p style="color:#888">No flow data provided.</p>'
    return (
        f'<div style="background:{palette["card"]};border-radius:14px;padding:28px;'
        f'box-shadow:0 2px 12px rgba(0,0,0,0.06);overflow-x:auto">'
        f"{_svg_flow_diagram(steps, palette)}</div>"
    )


def _build_dashboard(data, palette):
    sections = []

    stats_data = data.get("stats", [])
    if stats_data:
        sections.append(_build_stats(stats_data, palette))

    chart_data = data.get("chart")
    if chart_data:
        sections.append(_build_comparison(chart_data, palette))

    breakdown = data.get("breakdown", [])
    if breakdown:
        donut_svg = _svg_donut_chart(breakdown, palette)
        legend_items = []
        for i, it in enumerate(breakdown):
            color = it.get("color") or _get_color(palette, i)
            label = _esc(str(it.get("label", "")))
            val = it.get("value", 0)
            legend_items.append(
                f'<div style="display:flex;align-items:center;gap:8px;font-size:13px">'
                f'<span style="width:12px;height:12px;border-radius:3px;'
                f'background:{color};flex-shrink:0"></span>'
                f'<span style="color:{palette["text"]}">{label}</span>'
                f'<span style="color:{palette["text_light"]};margin-left:auto">'
                f"{_format_number(val)}</span></div>"
            )
        sections.append(
            f'<div style="background:{palette["card"]};border-radius:14px;padding:28px;'
            f'box-shadow:0 2px 12px rgba(0,0,0,0.06);display:flex;align-items:center;'
            f'gap:32px;flex-wrap:wrap">'
            f'<div style="flex:0 0 auto">{donut_svg}</div>'
            f'<div style="flex:1;min-width:200px;display:flex;flex-direction:column;gap:10px">'
            f'{"".join(legend_items)}</div></div>'
        )

    flow_data = data.get("flow", [])
    if flow_data:
        sections.append(_build_flow(flow_data, palette))

    return "\n".join(sections)


# ---------------------------------------------------------------------------
# HTML wrapper
# ---------------------------------------------------------------------------


def _wrap_html(title, subtitle, body_content, footer, palette):
    return f"""<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{_esc(title)}</title>
<style>
*{{margin:0;padding:0;box-sizing:border-box}}
body{{
  font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,
    "Noto Sans SC","PingFang SC","Microsoft YaHei",sans-serif;
  background:{palette["bg"]};
  color:{palette["text"]};
  line-height:1.6;
  min-height:100vh;
}}
.container{{
  max-width:960px;
  margin:0 auto;
  padding:40px 24px;
}}
header{{
  text-align:center;
  margin-bottom:36px;
}}
header h1{{
  font-size:32px;
  font-weight:800;
  color:{palette["text"]};
  letter-spacing:-0.5px;
  margin-bottom:8px;
}}
header .subtitle{{
  font-size:15px;
  color:{palette["text_light"]};
  max-width:600px;
  margin:0 auto;
}}
main{{
  display:flex;
  flex-direction:column;
  gap:24px;
}}
footer.ig-footer{{
  text-align:center;
  margin-top:40px;
  padding-top:20px;
  border-top:1px solid rgba(0,0,0,0.06);
  font-size:12px;
  color:{palette["text_light"]};
}}
@media(max-width:640px){{
  .container{{padding:20px 12px}}
  header h1{{font-size:24px}}
}}
</style>
</head>
<body>
<div class="container">
<header>
<h1>{_esc(title)}</h1>
{"<p class='subtitle'>" + _esc(subtitle) + "</p>" if subtitle else ""}
</header>
<main>
{body_content}
</main>
{"<footer class='ig-footer'>" + _esc(footer) + "</footer>" if footer else ""}
</div>
</body>
</html>"""


# ---------------------------------------------------------------------------
# Validation
# ---------------------------------------------------------------------------


def _validate_config(config):
    errors = []
    if not isinstance(config, dict):
        errors.append("Config must be a JSON object")
        return errors

    ig_type = config.get("type", "stats")
    valid_types = {"stats", "comparison", "flow", "dashboard"}
    if ig_type not in valid_types:
        errors.append(f"Invalid type '{ig_type}'. Must be one of: {', '.join(sorted(valid_types))}")

    if "data" not in config:
        errors.append("Missing required field: data")

    output = config.get("output", "")
    if output:
        out_dir = os.path.dirname(os.path.abspath(output))
        if not os.path.isdir(out_dir):
            errors.append(f"Output directory does not exist: {out_dir}")

    return errors


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------


def main():
    if len(sys.argv) > 1 and sys.argv[1] not in ("-h", "--help"):
        input_path = sys.argv[1]
        try:
            with open(input_path, "r", encoding="utf-8") as f:
                config = json.load(f)
        except FileNotFoundError:
            print(json.dumps({"status": "error", "message": f"File not found: {input_path}"}))
            sys.exit(1)
        except json.JSONDecodeError as e:
            print(json.dumps({"status": "error", "message": f"Invalid JSON: {e}"}))
            sys.exit(1)
    elif not sys.stdin.isatty():
        try:
            config = json.load(sys.stdin)
        except json.JSONDecodeError as e:
            print(json.dumps({"status": "error", "message": f"Invalid JSON from stdin: {e}"}))
            sys.exit(1)
    else:
        print("Usage: python3 build_infographic.py <config.json>", file=sys.stderr)
        print("       cat config.json | python3 build_infographic.py", file=sys.stderr)
        sys.exit(1)

    errors = _validate_config(config)
    if errors:
        print(json.dumps({"status": "error", "errors": errors}))
        sys.exit(1)

    title = config.get("title", "Infographic")
    subtitle = config.get("subtitle", "")
    footer = config.get("footer", "")
    ig_type = config.get("type", "stats")
    palette = _pick_palette(config.get("palette", "auto"), config.get("data", {}))
    data = config.get("data", {})

    if ig_type == "stats":
        body = _build_stats(data, palette)
    elif ig_type == "comparison":
        body = _build_comparison(data, palette)
    elif ig_type == "flow":
        body = _build_flow(data, palette)
    elif ig_type == "dashboard":
        body = _build_dashboard(data, palette)
    else:
        body = _build_stats(data, palette)

    html = _wrap_html(title, subtitle, body, footer, palette)

    output_path = config.get("output", "infographic.html")
    out_dir = os.path.dirname(os.path.abspath(output_path))
    os.makedirs(out_dir, exist_ok=True)

    with open(output_path, "w", encoding="utf-8") as f:
        f.write(html)

    result = {
        "status": "success",
        "output": os.path.abspath(output_path),
        "type": ig_type,
        "title": title,
        "palette": config.get("palette", "auto"),
        "size_bytes": len(html.encode("utf-8")),
    }
    print(json.dumps(result, ensure_ascii=False))


if __name__ == "__main__":
    main()
