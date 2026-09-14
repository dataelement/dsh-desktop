---
name: data-viz-renderer
description: "Generate self-contained HTML/SVG infographics from JSON data, including stat cards, bar charts, flow diagrams, and mixed dashboards. Offers 8 color palettes and built-in icons with no external dependencies. Triggered when users request data visualization, infographics, charts, or dashboards."
license: MIT
type: tool
tags: ["infographic", "visualization", "svg", "html", "chart", "dashboard"]
---

# Data Viz Renderer

Generate self-contained HTML/SVG infographics from JSON data. Four supported types:

1. **Stats Cards** — KPI big numbers + trend arrows + icons
2. **Comparison Chart** — Grouped bar chart with multiple series
3. **Flow Diagram** — Step-by-step process with numbering, icons, and connecting arrows
4. **Dashboard** — Mixed layout: stat cards + bar chart + donut chart + flow

Output is a **fully self-contained** HTML file (all CSS/SVG inline, no external dependencies), ready to open directly in a browser.

## Usage

### Basic Usage

```bash
python3 scripts/build_infographic.py config.json
```

Also supports reading from stdin:

```bash
cat config.json | python3 scripts/build_infographic.py
```

The script outputs a JSON status to stdout and writes the generated HTML to the path specified in the `output` field.

### JSON Configuration Format

Common fields:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `title` | string | No | Infographic title |
| `subtitle` | string | No | Subtitle |
| `type` | string | Yes | `stats` / `comparison` / `flow` / `dashboard` |
| `palette` | string | No | Color palette (default: `auto`) |
| `data` | object/array | Yes | Data content (format depends on type) |
| `output` | string | No | Output file path (default: `infographic.html`) |
| `footer` | string | No | Footer text |

### Color Palettes

Available values: `auto` (automatically chosen based on data), `ocean`, `sunset`, `forest`, `berry`, `vibrant`, `corporate`, `pastel`, `earth`

### Data Format by Type

#### 1. stats — Stat Cards

```json
{
  "type": "stats",
  "data": [
    {
      "label": "Total Revenue",
      "value": "$1.2M",
      "icon": "money",
      "trend": "+12.5%",
      "trend_dir": "up"
    },
    {
      "label": "Users",
      "value": "45,230",
      "icon": "users",
      "trend": "+8.2%",
      "trend_dir": "up"
    }
  ]
}
```

**icon** options: `users`, `user`, `money`, `percent`, `globe`, `clock`, `check`, `star`, `target`, `zap`, `chart-bar`, `chart-pie`, `database`, `rocket`, `shield`, `heart`, `light`, `search`, `mail`, `settings`, `flag`, `trending-up`, `trending-down`

**trend_dir**: `up` (green upward arrow) or `down` (red downward arrow)

#### 2. comparison — Bar Chart Comparison

```json
{
  "type": "comparison",
  "data": {
    "chart_title": "Quarterly Revenue Comparison",
    "categories": ["Q1", "Q2", "Q3", "Q4"],
    "series": [
      {"name": "2024", "values": [320, 410, 380, 520]},
      {"name": "2025", "values": [380, 490, 450, 610]}
    ]
  }
}
```

#### 3. flow — Flow Diagram

```json
{
  "type": "flow",
  "data": [
    {"step": 1, "title": "Requirements", "description": "Gather user needs", "icon": "search"},
    {"step": 2, "title": "Design", "description": "Create technical plan", "icon": "light"},
    {"step": 3, "title": "Development", "description": "Code and test", "icon": "settings"},
    {"step": 4, "title": "Launch", "description": "Deploy to production", "icon": "rocket"}
  ]
}
```

#### 4. dashboard — Mixed Dashboard

```json
{
  "type": "dashboard",
  "data": {
    "stats": [
      {"label": "DAU", "value": "12.3K", "icon": "users", "trend": "+5%", "trend_dir": "up"},
      {"label": "Conversion Rate", "value": "3.8%", "icon": "target", "trend": "-0.2%", "trend_dir": "down"}
    ],
    "chart": {
      "chart_title": "Monthly Trend",
      "categories": ["Jan", "Feb", "Mar", "Apr"],
      "series": [{"name": "DAU", "values": [10200, 11500, 11800, 12300]}]
    },
    "breakdown": [
      {"label": "iOS", "value": 45},
      {"label": "Android", "value": 38},
      {"label": "Web", "value": 17}
    ],
    "flow": [
      {"step": 1, "title": "Sign Up", "description": ""},
      {"step": 2, "title": "Activate", "description": ""},
      {"step": 3, "title": "Retain", "description": ""}
    ]
  }
}
```

## Output Format

The script outputs a JSON result to stdout:

```json
{
  "status": "success",
  "output": "/absolute/path/to/infographic.html",
  "type": "stats",
  "title": "My Infographic",
  "palette": "auto",
  "size_bytes": 8432
}
```

On error:

```json
{
  "status": "error",
  "errors": ["Missing required field: data"]
}
```

## Design Highlights

- **Zero external dependencies**: Pure Python standard library, no pip install needed
- **Self-contained output**: HTML with all CSS and SVG inline, no network required
- **Responsive layout**: Works on both desktop and mobile browsers
- **Professional palettes**: 8 preset color schemes + automatic selection
- **24+ built-in icons**: Common SVG icons, no font files needed
- **CJK-friendly**: Font stack includes Noto Sans SC, PingFang SC, Microsoft YaHei

## Use Cases

- Visualization modules in data reports
- Product data dashboards
- Business process illustrations
- Quarterly/monthly data comparisons
- Team KPI displays

## Dependencies

- Python 3.7+ (standard library only)
