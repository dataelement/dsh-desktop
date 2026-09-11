---
name: lp-proto-gen
description: "一键生成结构完整的落地页HTML原型，包含Hero主标题、Social Proof合作品牌、Features产品特性、Pricing定价方案和CTA行动召唤五大核心板块，输出为自包含HTML文件（CSS内联）可直接在浏览器中预览。当用户请求生成落地页、营销页、产品主页的HTML原型、线框图或快速demo，或提及“Landing Page”、“营销页”、“产品主页”等关键词时触发。"
license: MIT
type: tool
tags: ["landing-page", "wireframe", "html", "prototype", "marketing"]
---

# Landing Page Wireframe

一键生成结构完整的落地页 HTML 原型，包含五大核心板块：

1. **Hero** — 主标题、副标题、CTA 按钮
2. **Social Proof** — 合作品牌 Logo、关键数据指标、用户推荐语
3. **Features** — 产品特性卡片（支持图标）
4. **Pricing** — 定价方案对比（支持高亮推荐档）
5. **CTA** — 页尾行动召唤

输出为自包含 HTML 文件（所有 CSS 内联），可直接在浏览器中预览，无需任何外部依赖。

## 使用方式

### 最简用法：使用默认配置

```bash
python3 scripts/generate_landing_page.py -o landing.html --open
```

生成一个默认风格的落地页并在浏览器中打开。

### 自定义产品信息

```bash
python3 scripts/generate_landing_page.py \
  --name "MyApp" \
  --tagline "Ship products 10x faster" \
  --description "The platform your team has been waiting for." \
  -o landing.html --open
```

### 通过 JSON 配置文件完全自定义

```bash
python3 scripts/generate_landing_page.py --config my_config.json -o landing.html
```

配置文件格式参见下方「配置说明」。

### 自定义主题色

```bash
python3 scripts/generate_landing_page.py --primary-color "#059669" -o landing.html
```

### 输出到 stdout（可管道到其他工具）

```bash
python3 scripts/generate_landing_page.py --name "Demo" > page.html
```

## 参数说明

| 参数 | 说明 |
|------|------|
| `--config, -c` | JSON 配置文件路径（完全自定义所有内容） |
| `--name, -n` | 产品/品牌名称 |
| `--tagline, -t` | Hero 区域主标题 |
| `--description, -d` | Hero 区域副标题描述 |
| `--primary-color` | 主题主色调（HEX 格式，如 `#4F46E5`） |
| `--output, -o` | 输出文件路径（不指定则输出到 stdout） |
| `--open` | 生成后自动用浏览器打开 |

## 配置说明

JSON 配置支持以下字段（均可选，未指定字段使用默认值）：

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

### 支持的图标名称

`zap`、`users`、`chart`、`shield`、`code`、`headphone`

不在列表中的图标名称会显示为圆形占位符。

## 特性

- **零外部依赖**：纯 Python 标准库，HTML/CSS 全部内联
- **响应式设计**：桌面端和移动端均有良好表现
- **无安全隐患**：所有用户输入经 HTML 转义处理
- **支持主题定制**：通过 CSS 变量控制配色方案
- **固定导航栏**：毛玻璃效果，自动跟随滚动
- **交互反馈**：卡片悬停动效、按钮状态变化

## 适用场景

- 产品经理快速搭建落地页原型用于评审
- 设计师验证页面结构和信息层级
- 创业团队快速生成 MVP 落地页
- 营销团队制作活动页面初稿
- 面试或比赛中快速产出页面 demo

## 依赖

- Python 3.7+（仅标准库）
