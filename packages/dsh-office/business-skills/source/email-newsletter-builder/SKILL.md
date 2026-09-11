---
name: email-newsletter-builder
description: "Generate professional HTML email newsletters compatible with Gmail and Outlook. Creates table-based layouts with inline CSS for reliable rendering. Use it when asked to \"build a newsletter,\" \"create an email template,\" or draft a marketing, internal, or digest email."
license: MIT
type: tool
---

# Email Newsletter Builder

Generate professional HTML email newsletters fully compatible with Gmail, Outlook, Apple Mail, and other major email clients. Uses table-based layout with inline CSS to ensure consistent rendering across all clients.

## Use Cases

- Company internal weekly/monthly reports
- Product update announcements
- Marketing and promotional emails
- Event invitations
- Content digests and article roundups

## Layout Types (Semantic Tags)

The `layout` field is a semantic tag indicating the intended purpose of the email, helping you choose the right combination of sections. The actual email structure is determined by the module types in the `sections` array.

| Layout Tag | Recommended Sections | Best For |
|----------|---------------------|----------|
| `single-column` | `hero_banner` + `text` + `cta` | General newsletters, announcements |
| `two-column` | `two_column` + `image_text` | Product comparisons, side-by-side image/text |
| `hero` | `hero_banner` + `text` + `cta` | Marketing emails, event invitations |
| `digest` | Multiple `article_card` | Content digests, article roundups |

## Supported Content Modules

| Module Type | Description |
|----------|------|
| `hero_banner` | Full-width banner image with optional overlay title text |
| `text` | Plain text paragraph with optional heading |
| `image_text` | Image and text side by side |
| `cta` | Call-to-action button |
| `divider` | Horizontal separator line |
| `quote` | Blockquote |
| `article_card` | Article card (image + title + excerpt + link) |
| `two_column` | Two-column content area |

## Workflow

### Step 1: Gather User Requirements

Collect the following information from the user:
1. **Email purpose**: Weekly report? Announcement? Marketing? (Determines layout recommendation)
2. **Content structure**: What modules are needed? (Headings, body text, images, buttons, etc.)
3. **Brand style**: Primary color, logo, company name
4. **Specific content**: Text, image URLs, and button links for each module

### Step 2: Generate Configuration File

Based on user requirements, create a JSON configuration file. The format is as follows:

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
  "preheader": "Preview text shown in the inbox list",
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

### Step 3: Generate HTML

Write the configuration to a temporary JSON file, then run the generation script:

```bash
python scripts/generate_newsletter.py --input config.json --output newsletter.html
```

### Step 4: Review and Deliver

1. Provide the generated HTML file path to the user
2. Explain how to preview it in a browser
3. Remind the user to replace any placeholder images and links

## Module Configuration Details

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

## Email Compatibility Notes

The generated HTML follows these email compatibility best practices:

- **Table layout**: All structure uses `<table>` instead of `<div>` for Outlook compatibility
- **Inline CSS**: All styles are applied via `style` attributes to prevent `<style>` tags from being stripped by email clients
- **Web-safe fonts**: Defaults to Arial/Helvetica with no dependency on custom fonts
- **Fixed width**: Email body is fixed at 600px width to fit various screens
- **MSO conditional comments**: Includes Outlook-specific conditional comments to ensure correct rendering
- **Background color compatibility**: Uses both `bgcolor` attributes and `background-color` styles
- **Image handling**: All images have explicit width/height and alt text
- **Preheader text**: Supports inbox preview text

## Important Notes

- Images must use **external URLs** (emails do not support base64-embedded images or relative paths)
- If the user doesn't have images ready, use `https://placehold.co/600x300/EEE/333?text=Your+Image` as a placeholder
- CTA buttons use a VML-compatible approach to ensure rounded buttons render correctly in Outlook
- The generated HTML can be directly pasted into email marketing tools (Mailchimp, SendGrid, etc.)
