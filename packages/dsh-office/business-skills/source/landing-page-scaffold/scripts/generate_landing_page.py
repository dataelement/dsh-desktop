#!/usr/bin/env python3
"""Generate a self-contained landing page HTML wireframe.

Sections: Hero → Social Proof → Features → Pricing → CTA
All styles inlined, no external dependencies.
"""

import argparse
import json
import html
import os
import sys
import webbrowser
from pathlib import Path


DEFAULT_CONFIG = {
    "product_name": "ProductName",
    "tagline": "Build something amazing, faster than ever.",
    "description": "The all-in-one platform that helps teams ship products with confidence. Simple, powerful, and designed for the modern workflow.",
    "hero_cta_text": "Get Started Free",
    "hero_cta_url": "#pricing",
    "hero_secondary_cta_text": "See Demo",
    "hero_secondary_cta_url": "#features",
    "social_proof": {
        "stats": [
            {"value": "10,000+", "label": "Active Users"},
            {"value": "99.9%", "label": "Uptime"},
            {"value": "4.9/5", "label": "User Rating"},
            {"value": "50M+", "label": "Tasks Completed"}
        ],
        "logos": ["Acme Corp", "Globex", "Initech", "Umbrella", "Stark Inc"],
        "testimonials": [
            {
                "quote": "This tool completely transformed how our team works. We shipped 3x faster in the first month.",
                "author": "Sarah Chen",
                "role": "CTO, TechFlow"
            },
            {
                "quote": "The best investment we made this year. Simple to set up, powerful in practice.",
                "author": "Marcus Rivera",
                "role": "VP Engineering, ScaleUp"
            }
        ]
    },
    "features": [
        {
            "title": "Lightning Fast",
            "description": "Built for speed from the ground up. Sub-100ms response times on every action.",
            "icon": "zap"
        },
        {
            "title": "Team Collaboration",
            "description": "Real-time editing, comments, and shared workspaces that keep everyone in sync.",
            "icon": "users"
        },
        {
            "title": "Smart Analytics",
            "description": "Actionable insights with dashboards that surface what matters most to your team.",
            "icon": "chart"
        },
        {
            "title": "Enterprise Security",
            "description": "SOC 2 compliant with SSO, RBAC, and end-to-end encryption built in.",
            "icon": "shield"
        },
        {
            "title": "API First",
            "description": "RESTful API with SDKs in every major language. Build custom integrations in minutes.",
            "icon": "code"
        },
        {
            "title": "24/7 Support",
            "description": "Dedicated support team with average response time under 5 minutes.",
            "icon": "headphone"
        }
    ],
    "pricing": {
        "tiers": [
            {
                "name": "Starter",
                "price": "$0",
                "period": "/month",
                "description": "For individuals and small projects",
                "features": ["Up to 3 projects", "1 GB storage", "Basic analytics", "Community support"],
                "cta_text": "Start Free",
                "highlighted": False
            },
            {
                "name": "Pro",
                "price": "$29",
                "period": "/month",
                "description": "For growing teams that need more",
                "features": ["Unlimited projects", "100 GB storage", "Advanced analytics", "Priority support", "Custom integrations", "Team management"],
                "cta_text": "Start Free Trial",
                "highlighted": True
            },
            {
                "name": "Enterprise",
                "price": "Custom",
                "period": "",
                "description": "For large organizations with specific needs",
                "features": ["Everything in Pro", "Unlimited storage", "SSO & SAML", "Dedicated account manager", "SLA guarantee", "Custom contracts"],
                "cta_text": "Contact Sales",
                "highlighted": False
            }
        ]
    },
    "cta": {
        "headline": "Ready to get started?",
        "description": "Join thousands of teams already using our platform. No credit card required.",
        "button_text": "Start Your Free Trial",
        "button_url": "#"
    },
    "theme": {
        "primary": "#4F46E5",
        "primary_light": "#818CF8",
        "primary_dark": "#3730A3",
        "secondary": "#0F172A",
        "accent": "#06B6D4",
        "background": "#FFFFFF",
        "surface": "#F8FAFC",
        "text": "#1E293B",
        "text_light": "#64748B",
        "border": "#E2E8F0",
        "radius": "12px",
        "font_family": "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
    }
}

ICON_SVG = {
    "zap": '<path d="M13 2L3 14h9l-1 10 10-12h-9l1-10z" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
    "users": '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="9" cy="7" r="4" fill="none" stroke="currentColor" stroke-width="2"/><path d="M23 21v-2a4 4 0 0 0-3-3.87" fill="none" stroke="currentColor" stroke-width="2"/><path d="M16 3.13a4 4 0 0 1 0 7.75" fill="none" stroke="currentColor" stroke-width="2"/>',
    "chart": '<path d="M18 20V10M12 20V4M6 20v-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
    "shield": '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
    "code": '<polyline points="16 18 22 12 16 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><polyline points="8 6 2 12 8 18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
    "headphone": '<path d="M3 18v-6a9 9 0 0 1 18 0v6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" fill="none" stroke="currentColor" stroke-width="2"/>',
    "check": '<polyline points="20 6 9 17 4 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
    "star": '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" fill="currentColor" stroke="currentColor" stroke-width="1"/>',
    "arrow_right": '<line x1="5" y1="12" x2="19" y2="12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><polyline points="12 5 19 12 12 19" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
    "quote": '<path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V21zM15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z" fill="currentColor"/>',
}


def e(text):
    """HTML-escape user-provided text."""
    return html.escape(str(text), quote=True)


def css_safe(text):
    """Sanitize text for use inside <style>. Prevents </style> injection."""
    return str(text).replace("<", "").replace(">", "")


def icon_svg(name, size=24):
    """Return an inline SVG icon. Falls back to a circle if icon name is unknown."""
    inner = ICON_SVG.get(name, f'<circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2"/>')
    return f'<svg xmlns="http://www.w3.org/2000/svg" width="{size}" height="{size}" viewBox="0 0 24 24">{inner}</svg>'


def deep_merge(base, override):
    """Recursively merge override dict into base dict."""
    result = base.copy()
    for key, val in override.items():
        if key in result and isinstance(result[key], dict) and isinstance(val, dict):
            result[key] = deep_merge(result[key], val)
        else:
            result[key] = val
    return result


def build_html(config):
    """Build the complete HTML string from config."""
    c = deep_merge(DEFAULT_CONFIG, config)
    t = c["theme"]

    product = e(c["product_name"])
    tagline = e(c["tagline"])
    desc = e(c["description"])

    # --- Social proof logos ---
    logos_html = ""
    for logo_name in c["social_proof"]["logos"]:
        logos_html += f'<div class="logo-item">{e(logo_name)}</div>\n'

    # --- Stats ---
    stats_html = ""
    for stat in c["social_proof"]["stats"]:
        stats_html += f'''<div class="stat-item">
  <div class="stat-value">{e(stat["value"])}</div>
  <div class="stat-label">{e(stat["label"])}</div>
</div>\n'''

    # --- Testimonials ---
    testimonials_html = ""
    for t_item in c["social_proof"]["testimonials"]:
        testimonials_html += f'''<div class="testimonial-card">
  <div class="testimonial-icon">{icon_svg("quote", 20)}</div>
  <p class="testimonial-quote">{e(t_item["quote"])}</p>
  <div class="testimonial-author">
    <div class="author-avatar">{e(t_item["author"][0])}</div>
    <div>
      <div class="author-name">{e(t_item["author"])}</div>
      <div class="author-role">{e(t_item["role"])}</div>
    </div>
  </div>
</div>\n'''

    # --- Features ---
    features_html = ""
    for feat in c["features"]:
        features_html += f'''<div class="feature-card">
  <div class="feature-icon">{icon_svg(feat.get("icon", "check"), 28)}</div>
  <h3 class="feature-title">{e(feat["title"])}</h3>
  <p class="feature-desc">{e(feat["description"])}</p>
</div>\n'''

    # --- Pricing tiers ---
    pricing_html = ""
    for tier in c["pricing"]["tiers"]:
        hl_class = " tier-highlighted" if tier.get("highlighted") else ""
        badge = '<div class="tier-badge">Most Popular</div>' if tier.get("highlighted") else ""
        features_list = ""
        for f in tier["features"]:
            features_list += f'<li>{icon_svg("check", 16)} {e(f)}</li>\n'
        btn_class = "btn-primary" if tier.get("highlighted") else "btn-outline"
        pricing_html += f'''<div class="tier-card{hl_class}">
  {badge}
  <h3 class="tier-name">{e(tier["name"])}</h3>
  <p class="tier-desc">{e(tier["description"])}</p>
  <div class="tier-price">
    <span class="price-amount">{e(tier["price"])}</span>
    <span class="price-period">{e(tier.get("period", ""))}</span>
  </div>
  <ul class="tier-features">{features_list}</ul>
  <a href="#" class="btn {btn_class}">{e(tier["cta_text"])}</a>
</div>\n'''

    # --- CTA section ---
    cta = c["cta"]

    return f'''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{product} — {tagline}</title>
<style>
:root {{
  --primary: {css_safe(t["primary"])};
  --primary-light: {css_safe(t["primary_light"])};
  --primary-dark: {css_safe(t["primary_dark"])};
  --secondary: {css_safe(t["secondary"])};
  --accent: {css_safe(t["accent"])};
  --bg: {css_safe(t["background"])};
  --surface: {css_safe(t["surface"])};
  --text: {css_safe(t["text"])};
  --text-light: {css_safe(t["text_light"])};
  --border: {css_safe(t["border"])};
  --radius: {css_safe(t["radius"])};
  --font: {css_safe(t["font_family"])};
}}

*, *::before, *::after {{ box-sizing: border-box; margin: 0; padding: 0; }}

html {{ scroll-behavior: smooth; }}

body {{
  font-family: var(--font);
  color: var(--text);
  background: var(--bg);
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
}}

.container {{
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 24px;
}}

/* --- NAV --- */
.nav {{
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  background: rgba(255,255,255,0.92);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--border);
  padding: 16px 0;
}}

.nav .container {{
  display: flex;
  align-items: center;
  justify-content: space-between;
}}

.nav-brand {{
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--primary);
  text-decoration: none;
}}

.nav-links {{
  display: flex;
  gap: 32px;
  list-style: none;
}}

.nav-links a {{
  color: var(--text-light);
  text-decoration: none;
  font-size: 0.9rem;
  font-weight: 500;
  transition: color 0.2s;
}}

.nav-links a:hover {{
  color: var(--primary);
}}

/* --- HERO --- */
.hero {{
  padding: 160px 0 100px;
  text-align: center;
  background: linear-gradient(180deg, var(--surface) 0%, var(--bg) 100%);
}}

.hero-tag {{
  display: inline-block;
  padding: 6px 16px;
  border-radius: 50px;
  background: rgba(79,70,229,0.08);
  color: var(--primary);
  font-size: 0.85rem;
  font-weight: 600;
  margin-bottom: 24px;
}}

.hero h1 {{
  font-size: clamp(2.5rem, 5vw, 4rem);
  font-weight: 800;
  line-height: 1.1;
  margin-bottom: 20px;
  color: var(--secondary);
  letter-spacing: -0.02em;
}}

.hero p {{
  font-size: 1.2rem;
  color: var(--text-light);
  max-width: 640px;
  margin: 0 auto 40px;
}}

.hero-actions {{
  display: flex;
  gap: 16px;
  justify-content: center;
  flex-wrap: wrap;
}}

/* --- BUTTONS --- */
.btn {{
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 14px 28px;
  border-radius: var(--radius);
  font-size: 1rem;
  font-weight: 600;
  text-decoration: none;
  transition: all 0.2s;
  cursor: pointer;
  border: 2px solid transparent;
}}

.btn-primary {{
  background: var(--primary);
  color: #fff;
  border-color: var(--primary);
}}

.btn-primary:hover {{
  background: var(--primary-dark);
  border-color: var(--primary-dark);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(79,70,229,0.3);
}}

.btn-outline {{
  background: transparent;
  color: var(--text);
  border-color: var(--border);
}}

.btn-outline:hover {{
  border-color: var(--primary);
  color: var(--primary);
}}

/* --- SOCIAL PROOF --- */
.social-proof {{
  padding: 80px 0;
  border-top: 1px solid var(--border);
  border-bottom: 1px solid var(--border);
}}

.section-label {{
  text-align: center;
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--text-light);
  margin-bottom: 32px;
  font-weight: 600;
}}

.logo-strip {{
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 48px;
  flex-wrap: wrap;
  margin-bottom: 60px;
}}

.logo-item {{
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--text-light);
  opacity: 0.5;
}}

.stats-row {{
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 32px;
  text-align: center;
  margin-bottom: 60px;
}}

.stat-value {{
  font-size: 2.5rem;
  font-weight: 800;
  color: var(--primary);
  line-height: 1.2;
}}

.stat-label {{
  font-size: 0.9rem;
  color: var(--text-light);
  margin-top: 4px;
}}

.testimonials {{
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 24px;
}}

.testimonial-card {{
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 32px;
}}

.testimonial-icon {{
  color: var(--primary-light);
  margin-bottom: 16px;
}}

.testimonial-quote {{
  font-size: 1rem;
  color: var(--text);
  margin-bottom: 24px;
  line-height: 1.7;
}}

.testimonial-author {{
  display: flex;
  align-items: center;
  gap: 12px;
}}

.author-avatar {{
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--primary);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 1rem;
}}

.author-name {{
  font-weight: 600;
  font-size: 0.9rem;
}}

.author-role {{
  font-size: 0.8rem;
  color: var(--text-light);
}}

/* --- FEATURES --- */
.features {{
  padding: 100px 0;
}}

.section-header {{
  text-align: center;
  max-width: 600px;
  margin: 0 auto 64px;
}}

.section-header h2 {{
  font-size: 2.2rem;
  font-weight: 800;
  margin-bottom: 16px;
  color: var(--secondary);
}}

.section-header p {{
  color: var(--text-light);
  font-size: 1.1rem;
}}

.features-grid {{
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 32px;
}}

.feature-card {{
  padding: 32px;
  border-radius: var(--radius);
  border: 1px solid var(--border);
  transition: all 0.2s;
}}

.feature-card:hover {{
  border-color: var(--primary-light);
  box-shadow: 0 4px 24px rgba(79,70,229,0.08);
  transform: translateY(-2px);
}}

.feature-icon {{
  width: 48px;
  height: 48px;
  border-radius: 10px;
  background: rgba(79,70,229,0.08);
  color: var(--primary);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 20px;
}}

.feature-title {{
  font-size: 1.15rem;
  font-weight: 700;
  margin-bottom: 8px;
}}

.feature-desc {{
  color: var(--text-light);
  font-size: 0.95rem;
  line-height: 1.6;
}}

/* --- PRICING --- */
.pricing {{
  padding: 100px 0;
  background: var(--surface);
}}

.pricing-grid {{
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 24px;
  align-items: start;
}}

.tier-card {{
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 40px 32px;
  position: relative;
  transition: all 0.2s;
}}

.tier-highlighted {{
  border-color: var(--primary);
  box-shadow: 0 8px 32px rgba(79,70,229,0.12);
  transform: scale(1.02);
}}

.tier-badge {{
  position: absolute;
  top: -12px;
  left: 50%;
  transform: translateX(-50%);
  background: var(--primary);
  color: #fff;
  padding: 4px 16px;
  border-radius: 50px;
  font-size: 0.8rem;
  font-weight: 600;
}}

.tier-name {{
  font-size: 1.3rem;
  font-weight: 700;
  margin-bottom: 8px;
}}

.tier-desc {{
  color: var(--text-light);
  font-size: 0.9rem;
  margin-bottom: 24px;
}}

.tier-price {{
  margin-bottom: 32px;
}}

.price-amount {{
  font-size: 3rem;
  font-weight: 800;
  color: var(--secondary);
}}

.price-period {{
  font-size: 1rem;
  color: var(--text-light);
}}

.tier-features {{
  list-style: none;
  margin-bottom: 32px;
}}

.tier-features li {{
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 0;
  font-size: 0.95rem;
  color: var(--text);
}}

.tier-features li svg {{
  color: var(--primary);
  flex-shrink: 0;
}}

.tier-card .btn {{
  width: 100%;
  justify-content: center;
}}

/* --- CTA --- */
.cta-section {{
  padding: 100px 0;
  text-align: center;
}}

.cta-box {{
  background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
  border-radius: calc(var(--radius) * 2);
  padding: 80px 40px;
  color: #fff;
}}

.cta-box h2 {{
  font-size: 2.5rem;
  font-weight: 800;
  margin-bottom: 16px;
}}

.cta-box p {{
  font-size: 1.15rem;
  opacity: 0.9;
  margin-bottom: 40px;
  max-width: 500px;
  margin-left: auto;
  margin-right: auto;
}}

.cta-box .btn {{
  background: #fff;
  color: var(--primary);
  border-color: #fff;
  font-size: 1.1rem;
  padding: 16px 36px;
}}

.cta-box .btn:hover {{
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0,0,0,0.2);
}}

/* --- FOOTER --- */
.footer {{
  padding: 40px 0;
  text-align: center;
  color: var(--text-light);
  font-size: 0.85rem;
  border-top: 1px solid var(--border);
}}

/* --- RESPONSIVE --- */
@media (max-width: 768px) {{
  .hero {{ padding: 120px 0 60px; }}
  .hero h1 {{ font-size: 2rem; }}
  .hero p {{ font-size: 1rem; }}
  .nav-links {{ display: none; }}
  .stats-row {{ grid-template-columns: repeat(2, 1fr); }}
  .features-grid {{ grid-template-columns: 1fr; }}
  .pricing-grid {{ grid-template-columns: 1fr; }}
  .tier-highlighted {{ transform: none; }}
  .cta-box {{ padding: 60px 24px; }}
  .cta-box h2 {{ font-size: 1.8rem; }}
  .logo-strip {{ gap: 24px; }}
}}
</style>
</head>
<body>

<!-- NAV -->
<nav class="nav">
  <div class="container">
    <a href="#" class="nav-brand">{product}</a>
    <ul class="nav-links">
      <li><a href="#features">Features</a></li>
      <li><a href="#pricing">Pricing</a></li>
      <li><a href="#" class="btn btn-primary" style="padding:8px 20px;font-size:0.9rem">{e(c["hero_cta_text"])}</a></li>
    </ul>
  </div>
</nav>

<!-- HERO -->
<section class="hero" id="hero">
  <div class="container">
    <div class="hero-tag">&#x2728; Now in Public Beta</div>
    <h1>{tagline}</h1>
    <p>{desc}</p>
    <div class="hero-actions">
      <a href="{e(c["hero_cta_url"])}" class="btn btn-primary">
        {e(c["hero_cta_text"])} {icon_svg("arrow_right", 18)}
      </a>
      <a href="{e(c["hero_secondary_cta_url"])}" class="btn btn-outline">
        {e(c["hero_secondary_cta_text"])}
      </a>
    </div>
  </div>
</section>

<!-- SOCIAL PROOF -->
<section class="social-proof" id="social-proof">
  <div class="container">
    <div class="section-label">Trusted by forward-thinking teams</div>
    <div class="logo-strip">
      {logos_html}
    </div>
    <div class="stats-row">
      {stats_html}
    </div>
    <div class="testimonials">
      {testimonials_html}
    </div>
  </div>
</section>

<!-- FEATURES -->
<section class="features" id="features">
  <div class="container">
    <div class="section-header">
      <h2>Everything you need to ship faster</h2>
      <p>Powerful features designed to help your team move from idea to production with confidence.</p>
    </div>
    <div class="features-grid">
      {features_html}
    </div>
  </div>
</section>

<!-- PRICING -->
<section class="pricing" id="pricing">
  <div class="container">
    <div class="section-header">
      <h2>Simple, transparent pricing</h2>
      <p>Start free, upgrade when you need to. No hidden fees, cancel anytime.</p>
    </div>
    <div class="pricing-grid">
      {pricing_html}
    </div>
  </div>
</section>

<!-- CTA -->
<section class="cta-section" id="cta">
  <div class="container">
    <div class="cta-box">
      <h2>{e(cta["headline"])}</h2>
      <p>{e(cta["description"])}</p>
      <a href="{e(cta["button_url"])}" class="btn">{e(cta["button_text"])} {icon_svg("arrow_right", 18)}</a>
    </div>
  </div>
</section>

<!-- FOOTER -->
<footer class="footer">
  <div class="container">
    &copy; 2026 {product}. All rights reserved.
  </div>
</footer>

</body>
</html>'''


def load_config(args):
    """Load config from file or CLI args, merge with defaults."""
    config = {}
    if args.config:
        config_path = Path(args.config)
        if not config_path.is_file():
            print(f"Error: config file not found: {args.config}", file=sys.stderr)
            sys.exit(1)
        with open(config_path, "r", encoding="utf-8") as f:
            config = json.load(f)

    if args.name:
        config["product_name"] = args.name
    if args.tagline:
        config["tagline"] = args.tagline
    if args.description:
        config["description"] = args.description
    if args.primary_color:
        config.setdefault("theme", {})["primary"] = args.primary_color

    return config


def main():
    parser = argparse.ArgumentParser(
        description="Generate a landing page HTML wireframe (Hero → Social Proof → Features → Pricing → CTA)"
    )
    parser.add_argument("--config", "-c", help="Path to JSON config file")
    parser.add_argument("--name", "-n", help="Product name")
    parser.add_argument("--tagline", "-t", help="Hero tagline")
    parser.add_argument("--description", "-d", help="Product description")
    parser.add_argument("--primary-color", help="Primary theme color (hex, e.g. #4F46E5)")
    parser.add_argument("--output", "-o", help="Output HTML file path (default: stdout)")
    parser.add_argument("--open", action="store_true", help="Open in default browser after generation")
    args = parser.parse_args()

    config = load_config(args)
    html_content = build_html(config)

    if args.output:
        out_path = Path(args.output).resolve()
        out_path.parent.mkdir(parents=True, exist_ok=True)
        with open(out_path, "w", encoding="utf-8") as f:
            f.write(html_content)
        print(f"Generated: {out_path}", file=sys.stderr)

        if args.open:
            webbrowser.open(f"file://{out_path}")
            print(f"Opened in browser: file://{out_path}", file=sys.stderr)
    else:
        sys.stdout.write(html_content)


if __name__ == "__main__":
    main()
