---
name: html-email-builder
description: "生成兼容 Gmail/Outlook 等主流邮件客户端 HTML Newsletter，使用 table 布局和 inline CSS 确保渲染一致，支持单栏、双栏、Hero Banner、内容摘要等多种版式。当用户需要制作公司周报、产品公告、营销邮件、活动邀请函或内容摘要邮件，或提及 Newsletter、HTML 邮件、邮件模板、兼容 Outlook 等关键词时触发。"
license: MIT
type: tool
---

# Newsletter Composer

生成专业的 HTML 邮件 Newsletter，完全兼容 Gmail、Outlook、Apple Mail 等主流邮件客户端。采用 table 布局 + inline CSS 方案，确保在所有客户端中渲染一致。

## 使用场景

- 公司内部周报 / 月报
- 产品更新公告
- 营销推广邮件
- 活动邀请函
- 内容摘要 / 文章推荐

## 布局类型（语义标签）

`layout` 字段是一个语义标签，用于标注邮件的用途类型，帮助你选择合适的 section 组合。实际的邮件结构由 `sections` 数组中的模块类型决定。

| 布局标签 | 推荐的 section 组合 | 适用场景 |
|----------|---------------------|----------|
| `single-column` | `hero_banner` + `text` + `cta` | 通用 Newsletter、公告 |
| `two-column` | `two_column` + `image_text` | 产品对比、图文并排 |
| `hero` | `hero_banner` + `text` + `cta` | 营销邮件、活动邀请 |
| `digest` | 多个 `article_card` | 内容摘要、文章推荐 |

## 支持的内容模块

| 模块类型 | 说明 |
|----------|------|
| `hero_banner` | 全宽 Banner 大图，可叠加标题文字 |
| `text` | 纯文本段落，支持标题 |
| `image_text` | 图文混排（图片+文字并排） |
| `cta` | 行动号召按钮 |
| `divider` | 分隔线 |
| `quote` | 引用块 |
| `article_card` | 文章卡片（图+标题+摘要+链接） |
| `two_column` | 双栏内容区域 |

## 工作流程

### 第一步：收集用户需求

向用户了解以下信息：
1. **邮件用途**：周报？公告？营销？（决定布局推荐）
2. **内容结构**：有哪些模块？（标题、正文、图片、按钮等）
3. **品牌风格**：主色调、Logo、公司名称
4. **具体内容**：各模块的文本、图片链接、按钮链接

### 第二步：生成配置文件

根据用户需求，创建 JSON 配置文件。配置格式如下：

```json
{
  "layout": "single-column",
  "theme": {
    "primary_color": "#2563EB",
    "secondary_color": "#1E40AF",
    "accent_color": "#F59E0B",
    "bg_color": "#F3F4F6",
    "content_bg_color": "#FFFFFF",
    "text_color": "#1F2937",
    "muted_text_color": "#6B7280",
    "font_family": "Arial, Helvetica, sans-serif",
    "max_width": 600
  },
  "header": {
    "logo_url": "",
    "logo_alt": "Company",
    "title": "Newsletter Title",
    "subtitle": ""
  },
  "preheader": "邮件预览文本，显示在收件箱列表中",
  "sections": [
    {
      "type": "text",
      "title": "Section Title",
      "body": "Section content in HTML or plain text."
    }
  ],
  "footer": {
    "company": "Company Name",
    "address": "Company Address",
    "unsubscribe_url": "#",
    "extra_links": [
      {"text": "Website", "url": "#"}
    ]
  }
}
```

### 第三步：生成 HTML

将配置写入临时 JSON 文件，然后运行生成脚本：

```bash
python scripts/generate_newsletter.py --input config.json --output newsletter.html
```

### 第四步：检查和交付

1. 将生成的 HTML 文件路径告知用户
2. 说明如何在浏览器中预览
3. 提醒用户替换占位图片和链接

## 各模块配置详解

### hero_banner

```json
{
  "type": "hero_banner",
  "image_url": "https://example.com/hero.jpg",
  "title": "Welcome to Our Newsletter",
  "subtitle": "Monthly updates and insights",
  "overlay_color": "rgba(0,0,0,0.4)"
}
```

### text

```json
{
  "type": "text",
  "title": "Section Heading",
  "body": "Paragraph content. Supports <b>bold</b>, <i>italic</i>, <a href='#'>links</a>."
}
```

### image_text

```json
{
  "type": "image_text",
  "image_url": "https://example.com/photo.jpg",
  "image_alt": "Description",
  "image_position": "left",
  "title": "Feature Title",
  "body": "Feature description text.",
  "cta_text": "Learn More",
  "cta_url": "#"
}
```

### cta

```json
{
  "type": "cta",
  "text": "Get Started Now",
  "url": "#",
  "align": "center"
}
```

### divider

```json
{
  "type": "divider",
  "color": "#E5E7EB",
  "spacing": 20
}
```

### quote

```json
{
  "type": "quote",
  "text": "This is a quoted text block.",
  "author": "Author Name"
}
```

### article_card

```json
{
  "type": "article_card",
  "image_url": "https://example.com/thumb.jpg",
  "title": "Article Title",
  "excerpt": "Brief summary of the article...",
  "url": "#",
  "cta_text": "Read More"
}
```

### two_column

```json
{
  "type": "two_column",
  "left": {
    "title": "Left Column",
    "body": "Left content"
  },
  "right": {
    "title": "Right Column",
    "body": "Right content"
  }
}
```

## 邮件兼容性说明

生成的 HTML 遵循以下邮件兼容性最佳实践：

- **Table 布局**：所有结构使用 `<table>` 而非 `<div>`，确保 Outlook 兼容
- **Inline CSS**：所有样式通过 `style` 属性内联，避免 `<style>` 标签被邮件客户端剥离
- **Web-safe 字体**：默认 Arial/Helvetica，不依赖自定义字体
- **固定宽度**：邮件主体固定 600px 宽度，适配各种屏幕
- **MSO 条件注释**：包含 Outlook 专用条件注释确保正确渲染
- **背景色兼容**：同时使用 `bgcolor` 属性和 `background-color` 样式
- **图片处理**：所有图片设置显式宽高和 alt 文本
- **Preheader 文本**：支持邮件预览文本设置

## 注意事项

- 图片必须使用**外部 URL**（邮件不支持 base64 内嵌图片或相对路径）
- 如果用户没有现成图片，可使用 `https://placehold.co/600x300/EEE/333?text=Your+Image` 作为占位图
- CTA 按钮使用 VML 兼容方案确保 Outlook 中也能正确显示圆角按钮
- 生成的 HTML 可直接粘贴到邮件营销工具（Mailchimp、SendGrid 等）中使用
