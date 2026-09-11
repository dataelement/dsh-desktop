#!/usr/bin/env python3
"""Newsletter HTML generator - Email-compatible HTML with table layout + inline CSS.

Generates professional HTML emails that render consistently across Gmail, Outlook,
Apple Mail and other major email clients. Uses table-based layout with inline CSS
following email HTML best practices.

Usage:
    python generate_newsletter.py --input config.json --output newsletter.html
    python generate_newsletter.py --input config.json  # prints to stdout
"""

import argparse
import json
import sys
import os
from html import escape


DEFAULT_THEME = {
    "primary_color": "#2563EB",
    "secondary_color": "#1E40AF",
    "accent_color": "#F59E0B",
    "bg_color": "#F3F4F6",
    "content_bg_color": "#FFFFFF",
    "text_color": "#1F2937",
    "muted_text_color": "#6B7280",
    "link_color": "#2563EB",
    "font_family": "Arial, Helvetica, sans-serif",
    "max_width": 600,
}


class NewsletterGenerator:
    def __init__(self, config):
        self.config = config
        self.theme = {**DEFAULT_THEME, **config.get("theme", {})}
        self.layout = config.get("layout", "single-column")
        self.header = config.get("header", {})
        self.sections = config.get("sections", [])
        self.footer = config.get("footer", {})
        self.preheader = config.get("preheader", "")

    def generate(self):
        parts = [
            self._doc_start(),
            self._preheader_html(),
            self._body_wrapper_start(),
            self._header_html(),
            self._content_html(),
            self._footer_html(),
            self._body_wrapper_end(),
            self._doc_end(),
        ]
        return "\n".join(parts)

    # ── Document skeleton ────────────────────────────────────────────

    def _doc_start(self):
        font = escape(self.theme["font_family"])
        return f"""<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office" lang="zh-CN">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<meta http-equiv="X-UA-Compatible" content="IE=edge" />
<meta name="format-detection" content="telephone=no, date=no, address=no, email=no" />
<meta name="x-apple-disable-message-reformatting" />
<title>{escape(self.header.get("title", "Newsletter"))}</title>
<!--[if mso]>
<noscript>
<xml>
<o:OfficeDocumentSettings>
<o:AllowPNG/>
<o:PixelsPerInch>96</o:PixelsPerInch>
</o:OfficeDocumentSettings>
</xml>
</noscript>
<![endif]-->
<style type="text/css">
body, table, td, a {{ -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }}
table, td {{ mso-table-lspace: 0pt; mso-table-rspace: 0pt; }}
img {{ -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }}
body {{ margin: 0; padding: 0; width: 100% !important; height: 100% !important; }}
a[x-apple-data-detectors] {{ color: inherit !important; text-decoration: none !important; font-size: inherit !important; font-family: inherit !important; font-weight: inherit !important; line-height: inherit !important; }}
@media only screen and (max-width: 620px) {{
  .email-container {{ width: 100% !important; max-width: 100% !important; }}
  .fluid {{ width: 100% !important; max-width: 100% !important; height: auto !important; }}
  .stack-column {{ display: block !important; width: 100% !important; max-width: 100% !important; }}
  .stack-column-center {{ text-align: center !important; }}
  .center-on-narrow {{ text-align: center !important; display: block !important; margin-left: auto !important; margin-right: auto !important; float: none !important; }}
  table.center-on-narrow {{ display: inline-block !important; }}
  .padding-mobile {{ padding-left: 16px !important; padding-right: 16px !important; }}
}}
</style>
</head>
<body style="margin: 0; padding: 0; background-color: {escape(self.theme['bg_color'])}; font-family: {font}; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;">"""

    def _doc_end(self):
        return "</body>\n</html>"

    def _preheader_html(self):
        if not self.preheader:
            return ""
        text = escape(self.preheader)
        return f"""<div style="display: none; font-size: 1px; color: {escape(self.theme['bg_color'])}; line-height: 1px; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden;">
{text}
&#847; &#847; &#847; &#847; &#847; &#847; &#847; &#847; &#847; &#847; &#847; &#847; &#847; &#847; &#847; &#847; &#847; &#847; &#847; &#847;
</div>"""

    def _body_wrapper_start(self):
        bg = escape(self.theme["bg_color"])
        mw = int(self.theme["max_width"])
        return f"""
<center style="width: 100%; background-color: {bg};">
<!--[if mso | IE]>
<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="{mw}" align="center" style="width: {mw}px;">
<tr>
<td>
<![endif]-->
<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: {mw}px; margin: 0 auto;" class="email-container">"""

    def _body_wrapper_end(self):
        return """</table>
<!--[if mso | IE]>
</td>
</tr>
</table>
<![endif]-->
</center>"""

    # ── Header ───────────────────────────────────────────────────────

    def _header_html(self):
        if not self.header:
            return ""

        primary = escape(self.theme["primary_color"])
        content_bg = escape(self.theme["content_bg_color"])
        font = escape(self.theme["font_family"])
        mw = int(self.theme["max_width"])

        logo_html = ""
        if self.header.get("logo_url"):
            logo_url = escape(self.header["logo_url"])
            logo_alt = escape(self.header.get("logo_alt", "Logo"))
            logo_html = f'<img src="{logo_url}" alt="{logo_alt}" width="150" style="display: block; margin: 0 auto 12px auto; width: 150px; max-width: 150px; height: auto;" />'

        title = escape(self.header.get("title", ""))
        subtitle = escape(self.header.get("subtitle", ""))

        title_html = ""
        if title:
            title_html = f'<h1 style="margin: 0; padding: 0; font-family: {font}; font-size: 26px; line-height: 32px; font-weight: bold; color: #FFFFFF;">{title}</h1>'

        subtitle_html = ""
        if subtitle:
            subtitle_html = f'<p style="margin: 8px 0 0 0; font-family: {font}; font-size: 15px; line-height: 22px; color: rgba(255,255,255,0.85);">{subtitle}</p>'

        return f"""
<tr>
<td bgcolor="{primary}" style="background-color: {primary}; padding: 30px 40px; text-align: center;">
{logo_html}
{title_html}
{subtitle_html}
</td>
</tr>"""

    # ── Content sections ─────────────────────────────────────────────

    def _content_html(self):
        content_bg = escape(self.theme["content_bg_color"])
        parts = [f'<tr>\n<td bgcolor="{content_bg}" style="background-color: {content_bg};">']

        for section in self.sections:
            section_type = section.get("type", "text")
            renderer = {
                "hero_banner": self._render_hero_banner,
                "text": self._render_text,
                "image_text": self._render_image_text,
                "cta": self._render_cta,
                "divider": self._render_divider,
                "quote": self._render_quote,
                "article_card": self._render_article_card,
                "two_column": self._render_two_column,
            }.get(section_type, self._render_text)
            parts.append(renderer(section))

        parts.append("</td>\n</tr>")
        return "\n".join(parts)

    def _render_hero_banner(self, section):
        image_url = escape(section.get("image_url", "https://placehold.co/600x280/2563EB/FFFFFF?text=Newsletter"))
        title = escape(section.get("title", ""))
        subtitle = escape(section.get("subtitle", ""))
        overlay = section.get("overlay_color", "rgba(0,0,0,0.35)")
        font = escape(self.theme["font_family"])
        mw = int(self.theme["max_width"])

        title_html = ""
        if title:
            title_html = f'<h1 style="margin: 0; font-family: {font}; font-size: 28px; line-height: 36px; font-weight: bold; color: #FFFFFF;">{title}</h1>'

        subtitle_html = ""
        if subtitle:
            subtitle_html = f'<p style="margin: 10px 0 0 0; font-family: {font}; font-size: 16px; line-height: 24px; color: rgba(255,255,255,0.9);">{subtitle}</p>'

        if title or subtitle:
            return f"""
<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-image: url('{image_url}'); background-size: cover; background-position: center center; background-color: {escape(self.theme['primary_color'])};">
<tr>
<td style="padding: 60px 40px; text-align: center;">
<!--[if mso]>
<v:rect xmlns:v="urn:schemas-microsoft-com:vml" fill="true" stroke="false" style="width:{mw}px;">
<v:fill type="frame" src="{image_url}" />
<v:textbox style="mso-fit-shape-to-text:true" inset="0,0,0,0">
<![endif]-->
<div style="background-color: {escape(overlay)}; padding: 40px 30px; border-radius: 0;">
{title_html}
{subtitle_html}
</div>
<!--[if mso]>
</v:textbox>
</v:rect>
<![endif]-->
</td>
</tr>
</table>"""
        else:
            return f"""
<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
<tr>
<td style="padding: 0; text-align: center;">
<img src="{image_url}" alt="Banner" width="{mw}" style="display: block; width: 100%; max-width: {mw}px; height: auto;" class="fluid" />
</td>
</tr>
</table>"""

    def _render_text(self, section):
        font = escape(self.theme["font_family"])
        text_color = escape(self.theme["text_color"])
        primary = escape(self.theme["primary_color"])
        title = section.get("title", "")
        body = section.get("body", "")

        parts = ['<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">\n<tr>\n<td style="padding: 24px 40px;" class="padding-mobile">']

        if title:
            parts.append(f'<h2 style="margin: 0 0 12px 0; font-family: {font}; font-size: 21px; line-height: 28px; font-weight: bold; color: {text_color};">{title}</h2>')

        if body:
            link_style = f"color: {escape(self.theme['link_color'])}; text-decoration: underline;"
            parts.append(f'<p style="margin: 0; font-family: {font}; font-size: 15px; line-height: 24px; color: {text_color};">{body}</p>')

        parts.append("</td>\n</tr>\n</table>")
        return "\n".join(parts)

    def _render_image_text(self, section):
        font = escape(self.theme["font_family"])
        text_color = escape(self.theme["text_color"])
        primary = escape(self.theme["primary_color"])
        image_url = escape(section.get("image_url", "https://placehold.co/260x200/EEE/333?text=Image"))
        image_alt = escape(section.get("image_alt", ""))
        image_position = section.get("image_position", "left")
        title = section.get("title", "")
        body = section.get("body", "")
        cta_text = section.get("cta_text", "")
        cta_url = escape(section.get("cta_url", "#"))

        img_width = 240
        text_width = int(self.theme["max_width"]) - img_width - 80

        img_cell = f"""<td width="{img_width}" class="stack-column" style="padding: 0; vertical-align: top;">
<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
<tr>
<td style="padding: 20px;">
<img src="{image_url}" alt="{image_alt}" width="{img_width - 40}" style="display: block; width: {img_width - 40}px; max-width: 100%; height: auto; border-radius: 4px;" class="fluid center-on-narrow" />
</td>
</tr>
</table>
</td>"""

        text_parts = []
        if title:
            text_parts.append(f'<h3 style="margin: 0 0 8px 0; font-family: {font}; font-size: 18px; line-height: 24px; font-weight: bold; color: {text_color};">{title}</h3>')
        if body:
            text_parts.append(f'<p style="margin: 0 0 12px 0; font-family: {font}; font-size: 14px; line-height: 22px; color: {text_color};">{body}</p>')
        if cta_text:
            text_parts.append(f'<a href="{cta_url}" style="font-family: {font}; font-size: 14px; font-weight: bold; color: {primary}; text-decoration: underline;">{escape(cta_text)}</a>')

        text_content = "\n".join(text_parts)
        text_cell = f"""<td class="stack-column" style="padding: 20px; vertical-align: top;">
{text_content}
</td>"""

        if image_position == "right":
            cells = text_cell + "\n" + img_cell
        else:
            cells = img_cell + "\n" + text_cell

        return f"""
<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
<tr>
{cells}
</tr>
</table>"""

    def _render_cta(self, section):
        primary = escape(self.theme["primary_color"])
        font = escape(self.theme["font_family"])
        text = escape(section.get("text", "Click Here"))
        url = escape(section.get("url", "#"))
        align = section.get("align", "center")
        bg_color = escape(section.get("bg_color", self.theme["primary_color"]))
        text_color = escape(section.get("text_color", "#FFFFFF"))
        border_radius = section.get("border_radius", 6)

        return f"""
<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
<tr>
<td style="padding: 16px 40px 24px 40px;" align="{escape(align)}" class="padding-mobile">
<table role="presentation" border="0" cellpadding="0" cellspacing="0">
<tr>
<td align="center" bgcolor="{bg_color}" style="background-color: {bg_color}; border-radius: {int(border_radius)}px;">
<!--[if mso]>
<v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="{url}" style="height:44px; v-text-anchor:middle; width:200px;" arcsize="14%" strokecolor="{bg_color}" fillcolor="{bg_color}">
<w:anchorlock/>
<center style="color:{text_color}; font-family:{font}; font-size:15px; font-weight:bold;">{text}</center>
</v:roundrect>
<![endif]-->
<!--[if !mso]><!-->
<a href="{url}" style="display: inline-block; padding: 13px 28px; font-family: {font}; font-size: 15px; font-weight: bold; color: {text_color}; text-decoration: none; border-radius: {int(border_radius)}px; background-color: {bg_color}; line-height: 18px; mso-hide: all;">{text}</a>
<!--<![endif]-->
</td>
</tr>
</table>
</td>
</tr>
</table>"""

    def _render_divider(self, section):
        color = escape(section.get("color", "#E5E7EB"))
        spacing = int(section.get("spacing", 20))
        return f"""
<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
<tr>
<td style="padding: {spacing}px 40px;" class="padding-mobile">
<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
<tr>
<td style="border-top: 1px solid {color}; font-size: 1px; line-height: 1px;">&nbsp;</td>
</tr>
</table>
</td>
</tr>
</table>"""

    def _render_quote(self, section):
        font = escape(self.theme["font_family"])
        text_color = escape(self.theme["text_color"])
        primary = escape(self.theme["primary_color"])
        muted = escape(self.theme["muted_text_color"])
        text = section.get("text", "")
        author = section.get("author", "")

        author_html = ""
        if author:
            author_html = f'<p style="margin: 10px 0 0 0; font-family: {font}; font-size: 13px; line-height: 18px; color: {muted}; font-style: italic;">&mdash; {escape(author)}</p>'

        return f"""
<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
<tr>
<td style="padding: 16px 40px;" class="padding-mobile">
<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
<tr>
<td width="4" bgcolor="{primary}" style="background-color: {primary}; border-radius: 2px;"></td>
<td style="padding: 12px 20px;">
<p style="margin: 0; font-family: {font}; font-size: 15px; line-height: 24px; color: {text_color}; font-style: italic;">{text}</p>
{author_html}
</td>
</tr>
</table>
</td>
</tr>
</table>"""

    def _render_article_card(self, section):
        font = escape(self.theme["font_family"])
        text_color = escape(self.theme["text_color"])
        muted = escape(self.theme["muted_text_color"])
        primary = escape(self.theme["primary_color"])
        image_url = section.get("image_url", "")
        title = escape(section.get("title", ""))
        excerpt = section.get("excerpt", "")
        url = escape(section.get("url", "#"))
        cta_text = escape(section.get("cta_text", "Read More"))

        image_html = ""
        if image_url:
            image_html = f"""<tr>
<td style="padding: 0;">
<a href="{url}" style="text-decoration: none;">
<img src="{escape(image_url)}" alt="{title}" width="520" style="display: block; width: 100%; max-width: 520px; height: auto; border-radius: 4px 4px 0 0;" class="fluid" />
</a>
</td>
</tr>"""

        return f"""
<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 4px;">
<tr>
<td style="padding: 12px 40px;" class="padding-mobile">
<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="border: 1px solid #E5E7EB; border-radius: 6px; overflow: hidden;">
{image_html}
<tr>
<td style="padding: 20px;">
<a href="{url}" style="text-decoration: none;">
<h3 style="margin: 0 0 8px 0; font-family: {font}; font-size: 18px; line-height: 24px; font-weight: bold; color: {text_color};">{title}</h3>
</a>
<p style="margin: 0 0 14px 0; font-family: {font}; font-size: 14px; line-height: 22px; color: {muted};">{excerpt}</p>
<a href="{url}" style="font-family: {font}; font-size: 14px; font-weight: bold; color: {primary}; text-decoration: none;">{cta_text} &rarr;</a>
</td>
</tr>
</table>
</td>
</tr>
</table>"""

    def _render_two_column(self, section):
        font = escape(self.theme["font_family"])
        text_color = escape(self.theme["text_color"])
        left = section.get("left", {})
        right = section.get("right", {})
        col_width = (int(self.theme["max_width"]) - 80) // 2

        def render_col(col):
            parts = []
            if col.get("title"):
                parts.append(f'<h3 style="margin: 0 0 8px 0; font-family: {font}; font-size: 17px; line-height: 22px; font-weight: bold; color: {text_color};">{col["title"]}</h3>')
            if col.get("body"):
                parts.append(f'<p style="margin: 0; font-family: {font}; font-size: 14px; line-height: 22px; color: {text_color};">{col["body"]}</p>')
            if col.get("image_url"):
                img_url = escape(col["image_url"])
                img_alt = escape(col.get("image_alt", ""))
                parts.append(f'<img src="{img_url}" alt="{img_alt}" width="{col_width - 20}" style="display: block; width: 100%; max-width: {col_width - 20}px; height: auto; margin-top: 10px; border-radius: 4px;" class="fluid" />')
            return "\n".join(parts)

        return f"""
<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
<tr>
<td style="padding: 20px 40px;" class="padding-mobile">
<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
<tr>
<td width="{col_width}" class="stack-column" style="padding: 0 10px 0 0; vertical-align: top;">
{render_col(left)}
</td>
<td width="{col_width}" class="stack-column" style="padding: 0 0 0 10px; vertical-align: top;">
{render_col(right)}
</td>
</tr>
</table>
</td>
</tr>
</table>"""

    # ── Footer ───────────────────────────────────────────────────────

    def _footer_html(self):
        if not self.footer:
            return ""

        font = escape(self.theme["font_family"])
        muted = escape(self.theme["muted_text_color"])
        bg = escape(self.theme["bg_color"])

        company = escape(self.footer.get("company", ""))
        address = escape(self.footer.get("address", ""))
        unsubscribe_url = escape(self.footer.get("unsubscribe_url", "#"))
        extra_links = self.footer.get("extra_links", [])

        company_html = ""
        if company:
            company_html = f'<p style="margin: 0 0 6px 0; font-family: {font}; font-size: 13px; line-height: 18px; color: {muted}; font-weight: bold;">{company}</p>'

        address_html = ""
        if address:
            address_html = f'<p style="margin: 0 0 6px 0; font-family: {font}; font-size: 12px; line-height: 18px; color: {muted};">{address}</p>'

        links_parts = []
        for link in extra_links:
            link_text = escape(link.get("text", ""))
            link_url = escape(link.get("url", "#"))
            links_parts.append(f'<a href="{link_url}" style="font-family: {font}; font-size: 12px; color: {muted}; text-decoration: underline;">{link_text}</a>')

        links_parts.append(f'<a href="{unsubscribe_url}" style="font-family: {font}; font-size: 12px; color: {muted}; text-decoration: underline;">退订 / Unsubscribe</a>')
        links_html = " &nbsp;|&nbsp; ".join(links_parts)

        return f"""
<tr>
<td bgcolor="{bg}" style="background-color: {bg}; padding: 30px 40px; text-align: center;">
{company_html}
{address_html}
<p style="margin: 0; font-family: {font}; font-size: 12px; line-height: 20px; color: {muted};">
{links_html}
</p>
</td>
</tr>"""


def validate_config(config):
    errors = []
    valid_layouts = {"single-column", "two-column", "hero", "digest"}
    layout = config.get("layout", "single-column")
    if layout not in valid_layouts:
        errors.append(f"Invalid layout '{layout}'. Must be one of: {', '.join(sorted(valid_layouts))}")

    valid_section_types = {"hero_banner", "text", "image_text", "cta", "divider", "quote", "article_card", "two_column"}
    for i, section in enumerate(config.get("sections", [])):
        st = section.get("type", "text")
        if st not in valid_section_types:
            errors.append(f"Section {i}: invalid type '{st}'. Must be one of: {', '.join(sorted(valid_section_types))}")

    return errors


def main():
    parser = argparse.ArgumentParser(description="Generate email-compatible HTML newsletter")
    parser.add_argument("--input", "-i", required=True, help="Path to JSON configuration file")
    parser.add_argument("--output", "-o", default=None, help="Output HTML file path (defaults to stdout)")
    parser.add_argument("--validate-only", action="store_true", help="Only validate config without generating")
    args = parser.parse_args()

    input_path = os.path.expanduser(args.input)
    if not os.path.isfile(input_path):
        print(f"Error: input file not found: {input_path}", file=sys.stderr)
        sys.exit(1)

    with open(input_path, "r", encoding="utf-8") as f:
        try:
            config = json.load(f)
        except json.JSONDecodeError as e:
            print(f"Error: invalid JSON in config file: {e}", file=sys.stderr)
            sys.exit(1)

    errors = validate_config(config)
    if errors:
        print("Config validation errors:", file=sys.stderr)
        for err in errors:
            print(f"  - {err}", file=sys.stderr)
        sys.exit(1)

    if args.validate_only:
        print("Config is valid.")
        sys.exit(0)

    generator = NewsletterGenerator(config)
    html = generator.generate()

    if args.output:
        output_path = os.path.expanduser(args.output)
        output_dir = os.path.dirname(output_path)
        if output_dir and not os.path.isdir(output_dir):
            os.makedirs(output_dir, exist_ok=True)
        with open(output_path, "w", encoding="utf-8") as f:
            f.write(html)
        print(f"Newsletter HTML generated: {output_path}", file=sys.stderr)
    else:
        sys.stdout.buffer.write(html.encode("utf-8"))


if __name__ == "__main__":
    main()
