#!/usr/bin/env python3
"""
Email Template Designer - HTML 邮件模板生成器
生成兼容 Gmail/Outlook/Apple Mail 的 HTML 邮件模板
支持: welcome, promotional, password_reset, notification, order_confirmation
"""

import argparse
import json
import sys
from html import escape


def get_default_theme():
    return {
        "primary_color": "#4A90D9",
        "secondary_color": "#2C5282",
        "accent_color": "#ED8936",
        "bg_color": "#F7FAFC",
        "content_bg_color": "#FFFFFF",
        "text_color": "#2D3748",
        "muted_text_color": "#718096",
        "font_family": "Arial, Helvetica, sans-serif",
        "max_width": 600,
        "border_radius": 8,
    }


def merge_theme(user_theme):
    theme = get_default_theme()
    if user_theme:
        theme.update(user_theme)
    return theme


def render_preheader(text):
    if not text:
        return ""
    safe = escape(text)
    return (
        f'<div style="display:none;font-size:1px;color:#f7f7f7;'
        f'line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">'
        f"{safe}"
        f"&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;"
        f"&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;"
        f"&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;"
        f"</div>\n"
    )


def render_header(header, theme):
    company = escape(header.get("company_name", ""))
    logo_url = header.get("logo_url", "")
    logo_alt = escape(header.get("logo_alt", company))
    pc = theme["primary_color"]

    logo_html = ""
    if logo_url:
        logo_html = (
            f'<img src="{escape(logo_url)}" alt="{logo_alt}" '
            f'width="150" style="display:block;margin:0 auto;max-width:150px;" />'
        )
    else:
        logo_html = (
            f'<span style="font-size:24px;font-weight:bold;color:{pc};'
            f'font-family:{theme["font_family"]};">{company}</span>'
        )

    return (
        f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">\n'
        f"<tr>\n"
        f'<td align="center" style="padding:24px 16px;">\n'
        f"{logo_html}\n"
        f"</td>\n"
        f"</tr>\n"
        f"</table>\n"
    )


def render_cta_button(text, url, theme, align="center"):
    pc = theme["primary_color"]
    br = theme.get("border_radius", 8)
    safe_text = escape(text)
    safe_url = escape(url)

    vml_button = (
        f"<!--[if mso]>\n"
        f'<v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" '
        f'xmlns:w="urn:schemas-microsoft-com:office:word" '
        f'href="{safe_url}" style="height:44px;v-text-anchor:middle;width:200px;" '
        f'arcsize="18%" strokecolor="{pc}" fillcolor="{pc}">\n'
        f'<w:anchorlock/>\n'
        f'<center style="color:#ffffff;font-family:Arial,sans-serif;font-size:16px;'
        f'font-weight:bold;">{safe_text}</center>\n'
        f"</v:roundrect>\n"
        f"<![endif]-->\n"
    )

    html_button = (
        f"<!--[if !mso]><!-->\n"
        f'<a href="{safe_url}" target="_blank" style="display:inline-block;'
        f"background-color:{pc};color:#ffffff;font-family:{theme['font_family']};"
        f"font-size:16px;font-weight:bold;text-align:center;text-decoration:none;"
        f"padding:12px 32px;border-radius:{br}px;-webkit-text-size-adjust:none;"
        f'mso-hide:all;">{safe_text}</a>\n'
        f"<!--<![endif]-->\n"
    )

    return (
        f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">\n'
        f"<tr>\n"
        f'<td align="{align}" style="padding:24px 0;">\n'
        f"{vml_button}"
        f"{html_button}"
        f"</td>\n"
        f"</tr>\n"
        f"</table>\n"
    )


def render_divider(theme, spacing=20):
    return (
        f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">\n'
        f"<tr>\n"
        f'<td style="padding:{spacing}px 0;">\n'
        f'<hr style="border:none;border-top:1px solid #E5E7EB;margin:0;" />\n'
        f"</td>\n"
        f"</tr>\n"
        f"</table>\n"
    )


def render_footer(footer, theme):
    company = escape(footer.get("company", ""))
    address = escape(footer.get("address", ""))
    unsub_url = escape(footer.get("unsubscribe_url", "#"))
    support_email = escape(footer.get("support_email", ""))
    extra_links = footer.get("extra_links", [])
    mc = theme["muted_text_color"]
    ff = theme["font_family"]

    links_html = ""
    if extra_links:
        link_parts = []
        for link in extra_links:
            link_parts.append(
                f'<a href="{escape(link["url"])}" target="_blank" '
                f'style="color:{mc};text-decoration:underline;">'
                f'{escape(link["text"])}</a>'
            )
        links_html = (
            f'<p style="margin:0 0 8px;font-size:13px;color:{mc};font-family:{ff};">'
            f'{" &bull; ".join(link_parts)}'
            f"</p>\n"
        )

    support_html = ""
    if support_email:
        support_html = (
            f'<p style="margin:0 0 8px;font-size:13px;color:{mc};font-family:{ff};">'
            f'联系支持: <a href="mailto:{support_email}" style="color:{mc};'
            f'text-decoration:underline;">{support_email}</a>'
            f"</p>\n"
        )

    return (
        f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">\n'
        f"<tr>\n"
        f'<td align="center" style="padding:32px 16px 24px;">\n'
        f"{links_html}"
        f"{support_html}"
        f'<p style="margin:0 0 8px;font-size:13px;color:{mc};font-family:{ff};">'
        f"{company}</p>\n"
        f'<p style="margin:0 0 8px;font-size:12px;color:{mc};font-family:{ff};">'
        f"{address}</p>\n"
        f'<p style="margin:0;font-size:12px;color:{mc};font-family:{ff};">'
        f'<a href="{unsub_url}" target="_blank" style="color:{mc};'
        f'text-decoration:underline;">退订邮件</a></p>\n'
        f"</td>\n"
        f"</tr>\n"
        f"</table>\n"
    )


def render_responsive_style(theme):
    mw = theme["max_width"]
    return (
        f"<style type=\"text/css\">\n"
        f"  @media only screen and (max-width: {mw + 40}px) {{\n"
        f"    .email-container {{ width: 100% !important; max-width: 100% !important; }}\n"
        f"    .fluid {{ width: 100% !important; max-width: 100% !important; height: auto !important; }}\n"
        f"    .stack-column {{ display: block !important; width: 100% !important; }}\n"
        f"    .stack-column-center {{ text-align: center !important; }}\n"
        f"    .center-on-narrow {{ text-align: center !important; display: block !important; "
        f"margin-left: auto !important; margin-right: auto !important; float: none !important; }}\n"
        f"    .padding-mobile {{ padding-left: 16px !important; padding-right: 16px !important; }}\n"
        f"  }}\n"
        f"</style>\n"
    )


def wrap_document(body_html, theme, preheader_text=""):
    ff = theme["font_family"]
    bg = theme["bg_color"]
    tc = theme["text_color"]
    mw = theme["max_width"]
    cbg = theme["content_bg_color"]

    preheader = render_preheader(preheader_text)
    responsive = render_responsive_style(theme)

    return (
        f'<!DOCTYPE html>\n'
        f'<html lang="zh" xmlns="http://www.w3.org/1999/xhtml" '
        f'xmlns:v="urn:schemas-microsoft-com:vml" '
        f'xmlns:o="urn:schemas-microsoft-com:office:office">\n'
        f"<head>\n"
        f'<meta charset="utf-8" />\n'
        f'<meta name="viewport" content="width=device-width, initial-scale=1.0" />\n'
        f'<meta http-equiv="X-UA-Compatible" content="IE=edge" />\n'
        f"<title></title>\n"
        f"<!--[if mso]>\n"
        f"<xml>\n"
        f"<o:OfficeDocumentSettings>\n"
        f"<o:AllowPNG/>\n"
        f"<o:PixelsPerInch>96</o:PixelsPerInch>\n"
        f"</o:OfficeDocumentSettings>\n"
        f"</xml>\n"
        f"<![endif]-->\n"
        f"{responsive}"
        f"</head>\n"
        f'<body style="margin:0;padding:0;background-color:{bg};font-family:{ff};'
        f'color:{tc};-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">\n'
        f"{preheader}"
        f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" '
        f'bgcolor="{bg}" style="background-color:{bg};">\n'
        f"<tr>\n"
        f'<td align="center" style="padding:16px 8px;">\n'
        f"<!--[if mso]>\n"
        f'<table role="presentation" width="{mw}" cellpadding="0" cellspacing="0" border="0">\n'
        f"<tr>\n"
        f"<td>\n"
        f"<![endif]-->\n"
        f'<table role="presentation" class="email-container" width="100%" '
        f'style="max-width:{mw}px;margin:0 auto;" cellpadding="0" cellspacing="0" border="0" '
        f'bgcolor="{cbg}">\n'
        f"<tr>\n"
        f'<td style="background-color:{cbg};">\n'
        f"{body_html}"
        f"</td>\n"
        f"</tr>\n"
        f"</table>\n"
        f"<!--[if mso]>\n"
        f"</td>\n"
        f"</tr>\n"
        f"</table>\n"
        f"<![endif]-->\n"
        f"</td>\n"
        f"</tr>\n"
        f"</table>\n"
        f"</body>\n"
        f"</html>\n"
    )


def build_welcome(config, theme):
    content = config.get("content", {})
    header = config.get("header", {})
    footer = config.get("footer", {})
    ff = theme["font_family"]
    tc = theme["text_color"]
    mc = theme["muted_text_color"]
    pc = theme["primary_color"]

    user_name = escape(content.get("user_name", ""))
    greeting = escape(content.get("greeting", "欢迎！"))
    message = escape(content.get("message", ""))
    cta_text = content.get("cta_text", "开始使用")
    cta_url = content.get("cta_url", "#")
    features = content.get("features", [])

    parts = []
    parts.append(render_header(header, theme))

    greeting_name = f"{user_name}，" if user_name else ""
    parts.append(
        f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">\n'
        f"<tr>\n"
        f'<td class="padding-mobile" style="padding:8px 32px 0;">\n'
        f'<h1 style="margin:0 0 16px;font-size:24px;font-weight:bold;color:{tc};'
        f'font-family:{ff};line-height:1.3;">{greeting_name}{greeting}</h1>\n'
        f'<p style="margin:0 0 24px;font-size:16px;color:{tc};font-family:{ff};'
        f'line-height:1.6;">{message}</p>\n'
        f"</td>\n"
        f"</tr>\n"
        f"</table>\n"
    )

    if features:
        feature_rows = ""
        for feat in features:
            icon = feat.get("icon", "✦")
            title = escape(feat.get("title", ""))
            desc = escape(feat.get("description", ""))
            feature_rows += (
                f"<tr>\n"
                f'<td style="padding:12px 32px;" class="padding-mobile">\n'
                f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">\n'
                f"<tr>\n"
                f'<td width="48" valign="top" style="padding-right:16px;font-size:28px;">'
                f"{icon}</td>\n"
                f'<td valign="top">\n'
                f'<p style="margin:0 0 4px;font-size:16px;font-weight:bold;color:{tc};'
                f'font-family:{ff};">{title}</p>\n'
                f'<p style="margin:0;font-size:14px;color:{mc};font-family:{ff};'
                f'line-height:1.5;">{desc}</p>\n'
                f"</td>\n"
                f"</tr>\n"
                f"</table>\n"
                f"</td>\n"
                f"</tr>\n"
            )
        parts.append(
            f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">\n'
            f"{feature_rows}"
            f"</table>\n"
        )

    parts.append(
        f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">\n'
        f"<tr>\n"
        f'<td class="padding-mobile" style="padding:8px 32px;">\n'
        f"{render_cta_button(cta_text, cta_url, theme)}"
        f"</td>\n"
        f"</tr>\n"
        f"</table>\n"
    )

    parts.append(render_divider(theme))
    parts.append(render_footer(footer, theme))

    return wrap_document("".join(parts), theme, config.get("preheader", ""))


def build_promotional(config, theme):
    content = config.get("content", {})
    header = config.get("header", {})
    footer = config.get("footer", {})
    ff = theme["font_family"]
    tc = theme["text_color"]
    mc = theme["muted_text_color"]
    pc = theme["primary_color"]
    ac = theme["accent_color"]

    headline = escape(content.get("headline", ""))
    sub_headline = escape(content.get("sub_headline", ""))
    hero_image_url = content.get("hero_image_url", "")
    products = content.get("products", [])
    offer_code = escape(content.get("offer_code", ""))
    offer_expires = escape(content.get("offer_expires", ""))
    cta_text = content.get("cta_text", "立即抢购")
    cta_url = content.get("cta_url", "#")

    parts = []
    parts.append(render_header(header, theme))

    if hero_image_url:
        parts.append(
            f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">\n'
            f"<tr>\n"
            f'<td style="padding:0;">\n'
            f'<img src="{escape(hero_image_url)}" alt="{headline}" width="600" '
            f'class="fluid" style="display:block;width:100%;max-width:600px;height:auto;" />\n'
            f"</td>\n"
            f"</tr>\n"
            f"</table>\n"
        )

    parts.append(
        f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">\n'
        f"<tr>\n"
        f'<td align="center" class="padding-mobile" style="padding:24px 32px 8px;">\n'
        f'<h1 style="margin:0 0 8px;font-size:28px;font-weight:bold;color:{tc};'
        f'font-family:{ff};line-height:1.3;">{headline}</h1>\n'
        f'<p style="margin:0;font-size:16px;color:{mc};font-family:{ff};'
        f'line-height:1.5;">{sub_headline}</p>\n'
        f"</td>\n"
        f"</tr>\n"
        f"</table>\n"
    )

    if products:
        for i in range(0, len(products), 2):
            row_products = products[i : i + 2]
            cols = ""
            for prod in row_products:
                pname = escape(prod.get("name", ""))
                pimg = prod.get("image_url", "")
                orig = escape(prod.get("original_price", ""))
                sale = escape(prod.get("sale_price", ""))
                purl = escape(prod.get("url", "#"))
                col_width = "50%" if len(row_products) == 2 else "100%"
                cols += (
                    f'<td class="stack-column stack-column-center" width="{col_width}" '
                    f'valign="top" style="padding:16px;text-align:center;">\n'
                    f'<a href="{purl}" target="_blank" style="text-decoration:none;">\n'
                )
                if pimg:
                    cols += (
                        f'<img src="{escape(pimg)}" alt="{pname}" width="200" '
                        f'style="display:block;margin:0 auto 12px;max-width:200px;height:auto;" />\n'
                    )
                cols += (
                    f'<p style="margin:0 0 4px;font-size:15px;font-weight:bold;color:{tc};'
                    f'font-family:{ff};">{pname}</p>\n'
                )
                if orig and sale:
                    cols += (
                        f'<p style="margin:0;font-size:14px;font-family:{ff};">'
                        f'<span style="text-decoration:line-through;color:{mc};">{orig}</span>'
                        f' <span style="color:{ac};font-weight:bold;">{sale}</span></p>\n'
                    )
                elif sale:
                    cols += (
                        f'<p style="margin:0;font-size:14px;color:{ac};font-weight:bold;'
                        f'font-family:{ff};">{sale}</p>\n'
                    )
                cols += f"</a>\n</td>\n"

            parts.append(
                f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">\n'
                f"<tr>\n{cols}</tr>\n"
                f"</table>\n"
            )

    if offer_code:
        expires_html = ""
        if offer_expires:
            expires_html = (
                f'<p style="margin:8px 0 0;font-size:13px;color:{mc};'
                f'font-family:{ff};">有效期至 {offer_expires}</p>\n'
            )
        parts.append(
            f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">\n'
            f"<tr>\n"
            f'<td align="center" style="padding:16px 32px;">\n'
            f'<table role="presentation" cellpadding="0" cellspacing="0" border="0">\n'
            f"<tr>\n"
            f'<td style="padding:12px 24px;border:2px dashed {ac};text-align:center;">\n'
            f'<p style="margin:0;font-size:13px;color:{mc};font-family:{ff};">优惠码</p>\n'
            f'<p style="margin:4px 0 0;font-size:22px;font-weight:bold;color:{ac};'
            f'font-family:{ff};letter-spacing:3px;">{offer_code}</p>\n'
            f"</td>\n"
            f"</tr>\n"
            f"</table>\n"
            f"{expires_html}"
            f"</td>\n"
            f"</tr>\n"
            f"</table>\n"
        )

    parts.append(
        f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">\n'
        f"<tr>\n"
        f'<td class="padding-mobile" style="padding:8px 32px 24px;">\n'
        f"{render_cta_button(cta_text, cta_url, theme)}"
        f"</td>\n"
        f"</tr>\n"
        f"</table>\n"
    )

    parts.append(render_divider(theme))
    parts.append(render_footer(footer, theme))

    return wrap_document("".join(parts), theme, config.get("preheader", ""))


def build_password_reset(config, theme):
    content = config.get("content", {})
    header = config.get("header", {})
    footer = config.get("footer", {})
    ff = theme["font_family"]
    tc = theme["text_color"]
    mc = theme["muted_text_color"]

    user_name = escape(content.get("user_name", ""))
    message = escape(
        content.get(
            "message",
            "我们收到了重置你账户密码的请求。点击下方按钮设置新密码。如果这不是你本人操作，请忽略此邮件。",
        )
    )
    reset_url = content.get("reset_url", "#")
    cta_text = content.get("cta_text", "重置密码")
    expires_in = escape(content.get("expires_in", "24小时"))
    support_email = escape(content.get("support_email", ""))

    parts = []
    parts.append(render_header(header, theme))

    greeting = f"{user_name}，你好！" if user_name else "你好！"
    parts.append(
        f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">\n'
        f"<tr>\n"
        f'<td class="padding-mobile" style="padding:8px 32px 0;">\n'
        f'<h1 style="margin:0 0 16px;font-size:22px;font-weight:bold;color:{tc};'
        f'font-family:{ff};">密码重置请求</h1>\n'
        f'<p style="margin:0 0 8px;font-size:16px;color:{tc};font-family:{ff};'
        f'line-height:1.6;">{greeting}</p>\n'
        f'<p style="margin:0 0 24px;font-size:16px;color:{tc};font-family:{ff};'
        f'line-height:1.6;">{message}</p>\n'
        f"</td>\n"
        f"</tr>\n"
        f"</table>\n"
    )

    parts.append(
        f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">\n'
        f"<tr>\n"
        f'<td class="padding-mobile" style="padding:0 32px;">\n'
        f"{render_cta_button(cta_text, reset_url, theme)}"
        f"</td>\n"
        f"</tr>\n"
        f"</table>\n"
    )

    url_display = escape(reset_url)
    parts.append(
        f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">\n'
        f"<tr>\n"
        f'<td class="padding-mobile" style="padding:0 32px 24px;">\n'
        f'<p style="margin:0 0 8px;font-size:13px;color:{mc};font-family:{ff};'
        f'line-height:1.5;">如果按钮无法点击，请复制以下链接到浏览器中打开：</p>\n'
        f'<p style="margin:0 0 16px;font-size:13px;color:{mc};font-family:{ff};'
        f'word-break:break-all;line-height:1.5;">'
        f'<a href="{url_display}" style="color:{theme["primary_color"]};'
        f'text-decoration:underline;">{url_display}</a></p>\n'
        f'<p style="margin:0;font-size:13px;color:{mc};font-family:{ff};'
        f'line-height:1.5;">此链接将在 {expires_in} 后失效。</p>\n'
        f"</td>\n"
        f"</tr>\n"
        f"</table>\n"
    )

    if support_email:
        parts.append(
            f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">\n'
            f"<tr>\n"
            f'<td class="padding-mobile" style="padding:0 32px 24px;">\n'
            f'<p style="margin:0;font-size:14px;color:{mc};font-family:{ff};'
            f'line-height:1.6;">如有疑问，请联系 '
            f'<a href="mailto:{support_email}" style="color:{theme["primary_color"]};'
            f'text-decoration:underline;">{support_email}</a></p>\n'
            f"</td>\n"
            f"</tr>\n"
            f"</table>\n"
        )

    parts.append(render_divider(theme))
    parts.append(render_footer(footer, theme))

    return wrap_document("".join(parts), theme, config.get("preheader", ""))


def build_notification(config, theme):
    content = config.get("content", {})
    header = config.get("header", {})
    footer = config.get("footer", {})
    ff = theme["font_family"]
    tc = theme["text_color"]
    mc = theme["muted_text_color"]
    pc = theme["primary_color"]

    title = escape(content.get("title", "通知"))
    message = escape(content.get("message", ""))
    details = content.get("details", [])
    cta_text = content.get("cta_text", "")
    cta_url = content.get("cta_url", "#")

    parts = []
    parts.append(render_header(header, theme))

    parts.append(
        f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">\n'
        f"<tr>\n"
        f'<td class="padding-mobile" style="padding:8px 32px 0;">\n'
        f'<h1 style="margin:0 0 16px;font-size:22px;font-weight:bold;color:{tc};'
        f'font-family:{ff};line-height:1.3;">{title}</h1>\n'
        f'<p style="margin:0 0 24px;font-size:16px;color:{tc};font-family:{ff};'
        f'line-height:1.6;">{message}</p>\n'
        f"</td>\n"
        f"</tr>\n"
        f"</table>\n"
    )

    if details:
        detail_rows = ""
        for d in details:
            label = escape(d.get("label", ""))
            value = escape(d.get("value", ""))
            detail_rows += (
                f"<tr>\n"
                f'<td style="padding:10px 16px;font-size:14px;color:{mc};'
                f'font-family:{ff};border-bottom:1px solid #EDF2F7;white-space:nowrap;" '
                f'width="35%">{label}</td>\n'
                f'<td style="padding:10px 16px;font-size:14px;color:{tc};font-weight:bold;'
                f'font-family:{ff};border-bottom:1px solid #EDF2F7;">{value}</td>\n'
                f"</tr>\n"
            )
        parts.append(
            f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">\n'
            f"<tr>\n"
            f'<td class="padding-mobile" style="padding:0 32px 24px;">\n'
            f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" '
            f'style="border:1px solid #EDF2F7;border-radius:8px;">\n'
            f"{detail_rows}"
            f"</table>\n"
            f"</td>\n"
            f"</tr>\n"
            f"</table>\n"
        )

    if cta_text:
        parts.append(
            f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">\n'
            f"<tr>\n"
            f'<td class="padding-mobile" style="padding:0 32px;">\n'
            f"{render_cta_button(cta_text, cta_url, theme)}"
            f"</td>\n"
            f"</tr>\n"
            f"</table>\n"
        )

    parts.append(render_divider(theme))
    parts.append(render_footer(footer, theme))

    return wrap_document("".join(parts), theme, config.get("preheader", ""))


def build_order_confirmation(config, theme):
    content = config.get("content", {})
    header = config.get("header", {})
    footer = config.get("footer", {})
    ff = theme["font_family"]
    tc = theme["text_color"]
    mc = theme["muted_text_color"]
    pc = theme["primary_color"]

    user_name = escape(content.get("user_name", ""))
    order_number = escape(content.get("order_number", ""))
    order_date = escape(content.get("order_date", ""))
    items = content.get("items", [])
    subtotal = escape(content.get("subtotal", ""))
    shipping = escape(content.get("shipping", ""))
    total = escape(content.get("total", ""))
    shipping_address = escape(content.get("shipping_address", ""))
    cta_text = content.get("cta_text", "查看订单")
    cta_url = content.get("cta_url", "#")

    parts = []
    parts.append(render_header(header, theme))

    greeting = f"{user_name}，" if user_name else ""
    parts.append(
        f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">\n'
        f"<tr>\n"
        f'<td class="padding-mobile" style="padding:8px 32px 0;">\n'
        f'<h1 style="margin:0 0 8px;font-size:22px;font-weight:bold;color:{tc};'
        f'font-family:{ff};line-height:1.3;">{greeting}感谢你的订单！</h1>\n'
        f'<p style="margin:0 0 4px;font-size:14px;color:{mc};font-family:{ff};">'
        f"订单号: {order_number}</p>\n"
        f'<p style="margin:0 0 24px;font-size:14px;color:{mc};font-family:{ff};">'
        f"下单时间: {order_date}</p>\n"
        f"</td>\n"
        f"</tr>\n"
        f"</table>\n"
    )

    if items:
        item_rows = ""
        for item in items:
            iname = escape(item.get("name", ""))
            iqty = escape(str(item.get("quantity", 1)))
            iprice = escape(item.get("price", ""))
            item_rows += (
                f"<tr>\n"
                f'<td style="padding:12px 16px;font-size:14px;color:{tc};'
                f'font-family:{ff};border-bottom:1px solid #EDF2F7;">{iname}</td>\n'
                f'<td align="center" style="padding:12px 8px;font-size:14px;color:{mc};'
                f'font-family:{ff};border-bottom:1px solid #EDF2F7;">x{iqty}</td>\n'
                f'<td align="right" style="padding:12px 16px;font-size:14px;color:{tc};'
                f'font-weight:bold;font-family:{ff};border-bottom:1px solid #EDF2F7;">'
                f"{iprice}</td>\n"
                f"</tr>\n"
            )

        summary_rows = ""
        if subtotal:
            summary_rows += (
                f"<tr>\n"
                f'<td colspan="2" align="right" style="padding:8px 16px;font-size:14px;'
                f'color:{mc};font-family:{ff};">小计</td>\n'
                f'<td align="right" style="padding:8px 16px;font-size:14px;color:{tc};'
                f'font-family:{ff};">{subtotal}</td>\n'
                f"</tr>\n"
            )
        if shipping:
            summary_rows += (
                f"<tr>\n"
                f'<td colspan="2" align="right" style="padding:8px 16px;font-size:14px;'
                f'color:{mc};font-family:{ff};">运费</td>\n'
                f'<td align="right" style="padding:8px 16px;font-size:14px;color:{tc};'
                f'font-family:{ff};">{shipping}</td>\n'
                f"</tr>\n"
            )
        if total:
            summary_rows += (
                f"<tr>\n"
                f'<td colspan="2" align="right" style="padding:12px 16px;font-size:16px;'
                f'font-weight:bold;color:{tc};font-family:{ff};">合计</td>\n'
                f'<td align="right" style="padding:12px 16px;font-size:16px;font-weight:bold;'
                f'color:{pc};font-family:{ff};">{total}</td>\n'
                f"</tr>\n"
            )

        parts.append(
            f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">\n'
            f"<tr>\n"
            f'<td class="padding-mobile" style="padding:0 32px 16px;">\n'
            f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" '
            f'style="border:1px solid #EDF2F7;border-radius:8px;">\n'
            f"<tr>\n"
            f'<td style="padding:12px 16px;font-size:13px;font-weight:bold;color:{mc};'
            f'font-family:{ff};border-bottom:2px solid #EDF2F7;text-transform:uppercase;">商品</td>\n'
            f'<td align="center" style="padding:12px 8px;font-size:13px;font-weight:bold;'
            f'color:{mc};font-family:{ff};border-bottom:2px solid #EDF2F7;">数量</td>\n'
            f'<td align="right" style="padding:12px 16px;font-size:13px;font-weight:bold;'
            f'color:{mc};font-family:{ff};border-bottom:2px solid #EDF2F7;">金额</td>\n'
            f"</tr>\n"
            f"{item_rows}"
            f"{summary_rows}"
            f"</table>\n"
            f"</td>\n"
            f"</tr>\n"
            f"</table>\n"
        )

    if shipping_address:
        parts.append(
            f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">\n'
            f"<tr>\n"
            f'<td class="padding-mobile" style="padding:0 32px 24px;">\n'
            f'<p style="margin:0 0 4px;font-size:13px;font-weight:bold;color:{mc};'
            f'font-family:{ff};text-transform:uppercase;">收货地址</p>\n'
            f'<p style="margin:0;font-size:14px;color:{tc};font-family:{ff};'
            f'line-height:1.5;">{shipping_address}</p>\n'
            f"</td>\n"
            f"</tr>\n"
            f"</table>\n"
        )

    parts.append(
        f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">\n'
        f"<tr>\n"
        f'<td class="padding-mobile" style="padding:0 32px;">\n'
        f"{render_cta_button(cta_text, cta_url, theme)}"
        f"</td>\n"
        f"</tr>\n"
        f"</table>\n"
    )

    parts.append(render_divider(theme))
    parts.append(render_footer(footer, theme))

    return wrap_document("".join(parts), theme, config.get("preheader", ""))


BUILDERS = {
    "welcome": build_welcome,
    "promotional": build_promotional,
    "password_reset": build_password_reset,
    "notification": build_notification,
    "order_confirmation": build_order_confirmation,
}


def main():
    parser = argparse.ArgumentParser(
        description="生成 HTML 邮件模板（table 布局 + inline CSS + 响应式）"
    )
    parser.add_argument("--input", required=True, help="JSON 配置文件路径")
    parser.add_argument("--output", required=True, help="输出 HTML 文件路径")
    args = parser.parse_args()

    with open(args.input, "r", encoding="utf-8") as f:
        config = json.load(f)

    template_type = config.get("template_type", "welcome")
    if template_type not in BUILDERS:
        print(
            f"错误: 不支持的模板类型 '{template_type}'。"
            f"支持的类型: {', '.join(BUILDERS.keys())}",
            file=sys.stderr,
        )
        sys.exit(1)

    theme = merge_theme(config.get("theme"))
    html = BUILDERS[template_type](config, theme)

    with open(args.output, "w", encoding="utf-8") as f:
        f.write(html)

    print(f"已生成邮件模板: {args.output}")
    print(f"模板类型: {template_type}")
    print(f"主色调: {theme['primary_color']}")


if __name__ == "__main__":
    main()
