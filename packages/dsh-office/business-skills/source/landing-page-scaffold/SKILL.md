---
name: landing-page-scaffold
description: "Generate a self-contained landing page HTML prototype with five standard sections (Hero → Social Proof → Features → Pricing → CTA), outputting a single inlined HTML file ready to preview in any browser. Triggered when the user asks to build, generate, or scaffold a landing page, wireframe, or marketing page prototype, or mentions specific sections like hero, pricing, or CTA."
license: MIT
type: tool
tags: ["landing-page", "wireframe", "html", "prototype", "marketing"]
---

# Landing Page Scaffold

Generate a fully structured landing page HTML prototype with a single command, featuring five core sections:

1. **Hero** — Headline, subheading, CTA button
2. **Social Proof** — Partner logos, key metrics, user testimonials
3. **Features** — Product feature cards (with icon support)
4. **Pricing** — Plan comparison table (with highlighted recommended tier)
5. **CTA** — Footer call-to-action

Outputs a self-contained HTML file (all CSS inlined) that can be previewed directly in a browser with zero external dependencies.

## Usage

### Quick Start: Use Default Config

```bash
python3 scripts/generate_landing_page.py -o landing.html --open
```

Generates a landing page with default styling and opens it in the browser.

### Customize Product Info

```bash
python3 scripts/generate_landing_page.py \
  --name "MyApp" \
  --tagline "Ship products 10x faster" \
  --description "The platform your team has been waiting for." \
  -o landing.html --open
```

### Full Customization via JSON Config

```bash
python3 scripts/generate_landing_page.py --config my_config.json -o landing.html
```

See the "Configuration" section below for the config file format.

### Custom Theme Color

```bash
python3 scripts/generate_landing_page.py --primary-color "#059669" -o landing.html
```

### Output to stdout (Pipeable)

```bash
python3 scripts/generate_landing_page.py --name "Demo" > page.html
```

## Parameters

| Parameter | Description |
|-----------|-------------|
| `--config, -c` | Path to JSON config file (full customization of all content) |
| `--name, -n` | Product/brand name |
| `--tagline, -t` | Hero section headline |
| `--description, -d` | Hero section subheading |
| `--primary-color` | Primary theme color (HEX format, e.g. `#4F46E5`) |
| `--output, -o` | Output file path (defaults to stdout if not specified) |
| `--open` | Automatically open in browser after generation |

## Configuration

The JSON config supports the following fields (all optional; unspecified fields use defaults):

```json
{
  "product_name": "MyApp",
  "tagline": "Build something amazing.",
  "description": "A short product description.",
  "hero_cta_text": "Get Started",
  "hero_cta_url": "#pricing",
  "social_proof": {
    "stats": [
      {"value": "10K+", "label": "Users"}
    ],
    "logos": ["Partner A", "Partner B"],
    "testimonials": [
      {"quote": "Great product!", "author": "Name", "role": "Title, Company"}
    ]
  },
  "features": [
    {"title": "Feature Name", "description": "Description", "icon": "zap"}
  ],
  "pricing": {
    "tiers": [
      {
        "name": "Free",
        "price": "$0",
        "period": "/month",
        "description": "For individuals",
        "features": ["Feature 1", "Feature 2"],
        "cta_text": "Start Free",
        "highlighted": false
      }
    ]
  },
  "cta": {
    "headline": "Ready to start?",
    "description": "Sign up today.",
    "button_text": "Get Started",
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
    "radius": "12px"
  }
}
```

### Supported Icon Names

`zap`, `users`, `chart`, `shield`, `code`, `headphone`

Icon names not in this list will display as a circular placeholder.

## Features

- **Zero External Dependencies**: Pure Python standard library, all HTML/CSS inlined
- **Responsive Design**: Works well on both desktop and mobile
- **Secure**: All user input is HTML-escaped
- **Themeable**: Color scheme controlled via CSS variables
- **Fixed Navbar**: Frosted glass effect with scroll tracking
- **Interactive Feedback**: Card hover animations and button state transitions

## Use Cases

- Product managers creating landing page prototypes for reviews
- Designers validating page structure and information hierarchy
- Startup teams quickly generating MVP landing pages
- Marketing teams drafting campaign pages
- Rapid page demo creation for interviews or competitions

## Dependencies

- Python 3.7+ (standard library only)
