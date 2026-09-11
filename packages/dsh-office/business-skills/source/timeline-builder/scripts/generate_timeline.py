#!/usr/bin/env python3
"""Generate interactive timeline HTML from JSON configuration."""

import argparse
import html
import json
import sys
from textwrap import dedent


def escape(text):
    if text is None:
        return ""
    return html.escape(str(text), quote=True)


import re

_CSS_UNSAFE = re.compile(r'[<>{}\x00-\x08\x0b\x0e-\x1f]|</style', re.IGNORECASE)


def css_safe(text):
    if text is None:
        return ""
    return _CSS_UNSAFE.sub("", str(text))


def parse_args():
    parser = argparse.ArgumentParser(description="Generate interactive timeline HTML")
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("-c", "--config", help="Path to JSON config file")
    group.add_argument("--stdin", action="store_true", help="Read JSON from stdin")
    parser.add_argument("-o", "--output", help="Output HTML file path (default: stdout)")
    parser.add_argument("-l", "--layout", choices=["vertical", "horizontal", "dual-side"],
                        help="Override layout mode")
    parser.add_argument("-t", "--title", help="Override timeline title")
    return parser.parse_args()


def load_config(args):
    if args.stdin:
        data = json.load(sys.stdin)
    else:
        with open(args.config, "r", encoding="utf-8") as f:
            data = json.load(f)

    if args.layout:
        data["layout"] = args.layout
    if args.title:
        data["title"] = args.title

    data.setdefault("title", "Timeline")
    data.setdefault("layout", "vertical")
    data.setdefault("theme", {})
    data.setdefault("events", [])

    theme = data["theme"]
    theme.setdefault("primaryColor", "#2563eb")
    theme.setdefault("secondaryColor", "#7c3aed")
    theme.setdefault("backgroundColor", "#ffffff")
    theme.setdefault("textColor", "#1f2937")
    theme.setdefault("lineColor", "#d1d5db")
    theme.setdefault("fontFamily", "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif")

    return data


def build_css(theme, layout):
    primary = css_safe(theme["primaryColor"])
    secondary = css_safe(theme["secondaryColor"])
    bg = css_safe(theme["backgroundColor"])
    text = css_safe(theme["textColor"])
    line = css_safe(theme["lineColor"])
    font = css_safe(theme["fontFamily"])

    base_css = dedent(f"""\
    :root {{
      --primary: {primary};
      --secondary: {secondary};
      --bg: {bg};
      --text: {text};
      --line: {line};
      --font: {font};
      --card-bg: #ffffff;
      --card-shadow: 0 2px 12px rgba(0,0,0,0.08);
      --card-hover-shadow: 0 6px 24px rgba(0,0,0,0.12);
      --card-radius: 12px;
      --dot-size: 16px;
      --line-width: 3px;
    }}
    *, *::before, *::after {{ box-sizing: border-box; margin: 0; padding: 0; }}
    html {{ scroll-behavior: smooth; }}
    body {{
      font-family: var(--font);
      background: var(--bg);
      color: var(--text);
      line-height: 1.6;
      padding: 0;
      min-height: 100vh;
    }}
    .tl-container {{
      max-width: 1100px;
      margin: 0 auto;
      padding: 40px 20px 60px;
    }}
    .tl-header {{
      text-align: center;
      margin-bottom: 48px;
    }}
    .tl-header h1 {{
      font-size: 2rem;
      font-weight: 700;
      color: var(--text);
      margin-bottom: 4px;
    }}
    .tl-card {{
      background: var(--card-bg);
      border-radius: var(--card-radius);
      box-shadow: var(--card-shadow);
      padding: 20px 24px;
      transition: box-shadow 0.25s ease, transform 0.25s ease;
      cursor: pointer;
      position: relative;
    }}
    .tl-card:hover {{
      box-shadow: var(--card-hover-shadow);
      transform: translateY(-2px);
    }}
    .tl-card-date {{
      font-size: 0.8rem;
      font-weight: 600;
      color: var(--primary);
      text-transform: uppercase;
      letter-spacing: 0.03em;
      margin-bottom: 4px;
    }}
    .tl-card-title {{
      font-size: 1.1rem;
      font-weight: 600;
      color: var(--text);
      margin-bottom: 6px;
    }}
    .tl-card-summary {{
      font-size: 0.92rem;
      color: #6b7280;
      margin-bottom: 0;
    }}
    .tl-card-category {{
      display: inline-block;
      font-size: 0.72rem;
      font-weight: 600;
      padding: 2px 10px;
      border-radius: 99px;
      background: var(--primary);
      color: #fff;
      margin-bottom: 8px;
      letter-spacing: 0.02em;
    }}
    .tl-card-details {{
      max-height: 0;
      overflow: hidden;
      transition: max-height 0.4s ease, opacity 0.3s ease, margin-top 0.3s ease;
      opacity: 0;
      margin-top: 0;
    }}
    .tl-card-details.open {{
      max-height: 600px;
      opacity: 1;
      margin-top: 12px;
    }}
    .tl-card-details-inner {{
      padding-top: 12px;
      border-top: 1px solid #e5e7eb;
      font-size: 0.9rem;
      color: #4b5563;
      line-height: 1.7;
      white-space: pre-wrap;
    }}
    .tl-expand-hint {{
      position: absolute;
      bottom: 8px;
      right: 12px;
      font-size: 0.7rem;
      color: #9ca3af;
      transition: opacity 0.2s;
    }}
    .tl-card.expanded .tl-expand-hint {{ opacity: 0; }}
    """)

    if layout == "vertical":
        layout_css = dedent("""\
        .tl-timeline {
          position: relative;
          padding: 0;
        }
        .tl-timeline::before {
          content: '';
          position: absolute;
          left: 50%;
          top: 0;
          bottom: 0;
          width: var(--line-width);
          background: var(--line);
          transform: translateX(-50%);
        }
        .tl-event {
          display: flex;
          align-items: flex-start;
          position: relative;
          margin-bottom: 40px;
          width: 100%;
        }
        .tl-event:last-child { margin-bottom: 0; }
        .tl-event-left .tl-card-wrap {
          width: 45%;
          margin-right: auto;
          padding-right: 40px;
          text-align: right;
        }
        .tl-event-right .tl-card-wrap {
          width: 45%;
          margin-left: auto;
          padding-left: 40px;
        }
        .tl-dot {
          position: absolute;
          left: 50%;
          top: 24px;
          width: var(--dot-size);
          height: var(--dot-size);
          border-radius: 50%;
          background: var(--primary);
          border: 3px solid var(--bg);
          box-shadow: 0 0 0 3px var(--primary);
          transform: translate(-50%, -50%);
          z-index: 2;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.55rem;
          line-height: 1;
        }
        .tl-dot-icon {
          position: absolute;
          left: 50%;
          top: 24px;
          transform: translate(-50%, -50%);
          font-size: 1.4rem;
          z-index: 3;
          filter: drop-shadow(0 1px 2px rgba(0,0,0,0.15));
        }
        .tl-event-left .tl-card { text-align: left; }
        @media (max-width: 768px) {
          .tl-timeline::before { left: 24px; }
          .tl-event-left .tl-card-wrap,
          .tl-event-right .tl-card-wrap {
            width: calc(100% - 56px);
            margin-left: 56px;
            margin-right: 0;
            padding-left: 0;
            padding-right: 0;
            text-align: left;
          }
          .tl-dot, .tl-dot-icon { left: 24px; }
        }
        """)
    elif layout == "horizontal":
        layout_css = dedent("""\
        .tl-timeline {
          position: relative;
          overflow-x: auto;
          overflow-y: visible;
          padding: 60px 20px 80px;
          -webkit-overflow-scrolling: touch;
        }
        .tl-timeline::before {
          content: '';
          position: absolute;
          left: 0;
          right: 0;
          top: 50%;
          height: var(--line-width);
          background: var(--line);
          transform: translateY(-50%);
        }
        .tl-events-row {
          display: flex;
          gap: 32px;
          min-width: max-content;
          position: relative;
          align-items: center;
        }
        .tl-event {
          position: relative;
          flex: 0 0 280px;
          max-width: 300px;
        }
        .tl-event-top .tl-card-wrap {
          position: absolute;
          bottom: calc(50% + 28px);
          left: 0;
          right: 0;
        }
        .tl-event-bottom .tl-card-wrap {
          position: absolute;
          top: calc(50% + 28px);
          left: 0;
          right: 0;
        }
        .tl-dot {
          position: absolute;
          left: 50%;
          top: 50%;
          width: var(--dot-size);
          height: var(--dot-size);
          border-radius: 50%;
          background: var(--primary);
          border: 3px solid var(--bg);
          box-shadow: 0 0 0 3px var(--primary);
          transform: translate(-50%, -50%);
          z-index: 2;
        }
        .tl-dot-icon {
          position: absolute;
          left: 50%;
          top: 50%;
          transform: translate(-50%, -50%);
          font-size: 1.4rem;
          z-index: 3;
          filter: drop-shadow(0 1px 2px rgba(0,0,0,0.15));
        }
        .tl-scroll-hint {
          text-align: center;
          font-size: 0.8rem;
          color: #9ca3af;
          margin-top: 12px;
        }
        @media (max-width: 768px) {
          .tl-timeline { padding: 40px 10px 60px; }
          .tl-event { flex: 0 0 220px; max-width: 240px; }
          .tl-events-row { gap: 20px; }
        }
        """)
    else:  # dual-side
        layout_css = dedent("""\
        .tl-timeline {
          position: relative;
          padding: 0;
        }
        .tl-timeline::before {
          content: '';
          position: absolute;
          left: 50%;
          top: 0;
          bottom: 0;
          width: var(--line-width);
          background: var(--line);
          transform: translateX(-50%);
        }
        .tl-event {
          display: flex;
          align-items: flex-start;
          position: relative;
          margin-bottom: 40px;
          width: 100%;
        }
        .tl-event:last-child { margin-bottom: 0; }
        .tl-event-left .tl-card-wrap {
          width: 45%;
          margin-right: auto;
          padding-right: 40px;
          text-align: right;
        }
        .tl-event-right .tl-card-wrap {
          width: 45%;
          margin-left: auto;
          padding-left: 40px;
        }
        .tl-event-left .tl-card { text-align: left; }
        .tl-side-label {
          position: absolute;
          top: -18px;
          font-size: 0.65rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: var(--secondary);
          opacity: 0.7;
        }
        .tl-event-left .tl-side-label { right: 56%; }
        .tl-event-right .tl-side-label { left: 56%; }
        .tl-dot {
          position: absolute;
          left: 50%;
          top: 24px;
          width: var(--dot-size);
          height: var(--dot-size);
          border-radius: 50%;
          background: var(--primary);
          border: 3px solid var(--bg);
          box-shadow: 0 0 0 3px var(--primary);
          transform: translate(-50%, -50%);
          z-index: 2;
        }
        .tl-dot-icon {
          position: absolute;
          left: 50%;
          top: 24px;
          transform: translate(-50%, -50%);
          font-size: 1.4rem;
          z-index: 3;
          filter: drop-shadow(0 1px 2px rgba(0,0,0,0.15));
        }
        @media (max-width: 768px) {
          .tl-timeline::before { left: 24px; }
          .tl-event-left .tl-card-wrap,
          .tl-event-right .tl-card-wrap {
            width: calc(100% - 56px);
            margin-left: 56px;
            margin-right: 0;
            padding-left: 0;
            padding-right: 0;
            text-align: left;
          }
          .tl-dot, .tl-dot-icon { left: 24px; }
          .tl-side-label { display: none; }
        }
        """)

    anim_css = dedent("""\
    .tl-event { opacity: 0; transform: translateY(24px); animation: tl-fadein 0.5s ease forwards; }
    @keyframes tl-fadein {
      to { opacity: 1; transform: translateY(0); }
    }
    """)

    stagger = ""
    for i in range(30):
        stagger += f".tl-event:nth-child({i+1}) {{ animation-delay: {i * 0.08:.2f}s; }}\n"

    print_css = dedent("""\
    @media print {
      .tl-card { break-inside: avoid; box-shadow: none; border: 1px solid #e5e7eb; }
      .tl-card-details { max-height: none !important; opacity: 1 !important; margin-top: 12px !important; }
      .tl-expand-hint { display: none; }
    }
    """)

    return base_css + layout_css + anim_css + stagger + print_css


def build_event_html(event, index, layout):
    date = escape(event.get("date", ""))
    title = escape(event.get("title", ""))
    summary = escape(event.get("summary", ""))
    details = escape(event.get("details", ""))
    icon = escape(event.get("icon", ""))
    category = escape(event.get("category", ""))
    color = escape(event.get("color", ""))
    side = event.get("side", "")

    if layout == "vertical":
        side_class = "tl-event-left" if index % 2 == 0 else "tl-event-right"
    elif layout == "horizontal":
        side_class = "tl-event-top" if index % 2 == 0 else "tl-event-bottom"
    else:  # dual-side
        side_class = "tl-event-left" if side == "left" else "tl-event-right"

    dot_style = f' style="background:{color};box-shadow:0 0 0 3px {color}"' if color else ""

    dot_html = f'<span class="tl-dot"{dot_style}></span>'
    if icon:
        dot_html += f'<span class="tl-dot-icon">{icon}</span>'

    category_style = f' style="background:{color}"' if color else ""
    category_html = f'<span class="tl-card-category"{category_style}>{category}</span>' if category else ""

    details_html = ""
    expand_hint = ""
    if details:
        details_html = f'''<div class="tl-card-details" id="detail-{index}"><div class="tl-card-details-inner">{details}</div></div>'''
        expand_hint = '<span class="tl-expand-hint">点击展开 ▾</span>'

    onclick = f' onclick="toggleDetail({index})"' if details else ""
    has_details_attr = ' data-has-details="true"' if details else ""

    side_label = ""
    if layout == "dual-side" and side:
        side_label = f'<span class="tl-side-label">{escape(side)}</span>'

    card_html = f'''<div class="tl-card" id="card-{index}"{onclick}{has_details_attr}>
  {category_html}
  <div class="tl-card-date">{date}</div>
  <div class="tl-card-title">{title}</div>
  {"<div class='tl-card-summary'>" + summary + "</div>" if summary else ""}
  {details_html}
  {expand_hint}
</div>'''

    if layout == "horizontal":
        return f'''<div class="tl-event {side_class}">
  {dot_html}
  <div class="tl-card-wrap">{side_label}{card_html}</div>
</div>'''
    else:
        return f'''<div class="tl-event {side_class}">
  {dot_html}
  <div class="tl-card-wrap">{side_label}{card_html}</div>
</div>'''


def build_js():
    return dedent("""\
    function toggleDetail(index) {
      var detail = document.getElementById('detail-' + index);
      var card = document.getElementById('card-' + index);
      if (!detail) return;
      detail.classList.toggle('open');
      card.classList.toggle('expanded');
      var hint = card.querySelector('.tl-expand-hint');
      if (hint) {
        hint.textContent = detail.classList.contains('open') ? '点击收起 ▴' : '点击展开 ▾';
      }
    }

    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') {
        var openDetails = document.querySelectorAll('.tl-card-details.open');
        openDetails.forEach(function(d) {
          d.classList.remove('open');
          var card = d.closest('.tl-card');
          if (card) {
            card.classList.remove('expanded');
            var hint = card.querySelector('.tl-expand-hint');
            if (hint) hint.textContent = '点击展开 ▾';
          }
        });
      }
    });
    """)


def build_html(config):
    layout = config["layout"]
    theme = config["theme"]
    title = escape(config["title"])
    events = config["events"]

    css = build_css(theme, layout)
    js = build_js()

    events_html_parts = []
    for i, ev in enumerate(events):
        events_html_parts.append(build_event_html(ev, i, layout))

    events_joined = "\n".join(events_html_parts)

    if layout == "horizontal":
        timeline_body = f'''<div class="tl-timeline">
  <div class="tl-events-row">
    {events_joined}
  </div>
</div>
<div class="tl-scroll-hint">← 左右滑动查看更多 →</div>'''
    else:
        timeline_body = f'''<div class="tl-timeline">
  {events_joined}
</div>'''

    return f'''<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{title}</title>
<style>
{css}
</style>
</head>
<body>
<div class="tl-container">
  <div class="tl-header">
    <h1>{title}</h1>
  </div>
  {timeline_body}
</div>
<script>
{js}
</script>
</body>
</html>'''


def main():
    args = parse_args()

    try:
        config = load_config(args)
    except FileNotFoundError:
        print(f"Error: config file not found: {args.config}", file=sys.stderr)
        sys.exit(1)
    except json.JSONDecodeError as e:
        print(f"Error: invalid JSON - {e}", file=sys.stderr)
        sys.exit(1)

    if not config["events"]:
        print("Error: no events in config", file=sys.stderr)
        sys.exit(1)

    result = build_html(config)

    if args.output:
        with open(args.output, "w", encoding="utf-8") as f:
            f.write(result)
        print(f"Timeline generated: {args.output}", file=sys.stderr)
    else:
        sys.stdout.write(result)


if __name__ == "__main__":
    main()
