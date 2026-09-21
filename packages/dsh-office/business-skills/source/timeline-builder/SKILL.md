---
name: timeline-builder
description: "Generate beautiful interactive timeline HTML pages from JSON data, with vertical, horizontal, or dual-side layouts, collapsible details, and custom colors. Ideal for project milestones, company histories, or resumes. Triggered when a user mentions 'timeline', 'history of events', 'project milestones', 'release log', or asks to visualize a chronological sequence of data."
license: MIT
type: tool
tags: ["timeline", "html", "visualization", "interactive", "responsive"]
---

# Timeline Builder

Generate beautiful interactive timeline HTML pages from JSON configuration data, with three layout modes:

1. **Vertical layout (`vertical`)** — A classic top-to-bottom timeline with event cards alternating on either side of the axis
2. **Horizontal layout (`horizontal`)** — A horizontally scrollable timeline, best for displaying fewer events
3. **Dual-side layout (`dual-side`)** — Events are placed on the left or right based on the `side` field, great for side-by-side comparisons

All layouts support:
- Click to expand/collapse event details
- Mobile-friendly responsive design
- Custom theme colors, icons, and category labels
- Pure static HTML with zero dependencies — opens directly in any browser

## Usage

### Basic: Generate from a JSON config file

```bash
python3 scripts/generate_timeline.py --config timeline_data.json --output timeline.html
```

### Read JSON from stdin

```bash
cat timeline_data.json | python3 scripts/generate_timeline.py --stdin --output timeline.html
```

### Override layout mode (takes precedence over config file)

```bash
python3 scripts/generate_timeline.py --config data.json --layout horizontal --output timeline.html
```

### JSON Configuration Format

```json
{
  "title": "Project Milestones",
  "layout": "vertical",
  "theme": {
    "primaryColor": "#2563eb",
    "secondaryColor": "#7c3aed",
    "backgroundColor": "#ffffff",
    "textColor": "#1f2937",
    "lineColor": "#d1d5db",
    "fontFamily": "system-ui, -apple-system, sans-serif"
  },
  "events": [
    {
      "date": "2024-01-15",
      "title": "Project Kickoff",
      "summary": "Approval completed, core team assembled",
      "details": "Detailed description text, shown when the card is expanded...",
      "icon": "🚀",
      "category": "Milestone",
      "color": "#10b981",
      "side": "left"
    }
  ]
}
```

### CLI Arguments

| Argument | Description |
|----------|-------------|
| `--config, -c` | Path to the JSON config file (mutually exclusive with `--stdin`) |
| `--stdin` | Read JSON from standard input |
| `--output, -o` | Output HTML file path (defaults to stdout) |
| `--layout, -l` | Override layout mode: `vertical`, `horizontal`, `dual-side` |
| `--title, -t` | Override the timeline title |

### Event Fields

| Field | Required | Description |
|-------|----------|-------------|
| `date` | Yes | Date label — any format works (e.g. `2024-01`, `Q1 2024`, `Phase One`) |
| `title` | Yes | Event title |
| `summary` | No | Short description, always visible on the card |
| `details` | No | Detailed content, revealed on click |
| `icon` | No | Emoji or single-character icon (defaults to `●`) |
| `category` | No | Category tag displayed on the card |
| `color` | No | Event node color (overrides the theme color) |
| `side` | No | Only for dual-side layout: `left` or `right` |

## Use Cases

- Project milestone displays
- Product release histories
- Company growth timelines
- Personal resume timelines
- Course syllabus outlines
- Any scenario requiring chronological information display

## Dependencies

- Python 3.6+ (standard library only — no extra packages required)
