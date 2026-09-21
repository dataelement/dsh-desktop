---
name: html-mailer-builder
description: "Generate professional HTML email templates compatible with Gmail, Outlook, and Apple Mail, using table layouts and inline CSS for responsive design. Triggered by requests for welcome emails, promotional campaigns, password resets, notifications, order confirmations, or any mention of creating EDM, newsletters, or transactional email templates."
license: MIT
type: tool
---

# HTML Mailer Builder

Generate professional HTML email templates fully compatible with Gmail, Outlook, Apple Mail, and other major email clients. Uses table layout + inline CSS to ensure consistent rendering across all clients, with media query-based responsive design for mobile devices.

## Use Cases

- Welcome emails for new users (Welcome)
- Promotional / limited-time discount emails (Promotional)
- Password reset / security verification emails (Password Reset)
- System notification emails (Notification)
- Order confirmation emails (Order Confirmation)

## Supported Template Types

| Type | Description | Typical Use |
|------|-------------|-------------|
| `welcome` | Welcome message with feature highlights and onboarding guide | New user onboarding |
| `promotional` | Promotional campaign with product showcase and discount codes | Marketing campaigns, holiday sales |
| `password_reset` | Clean, secure password reset link | Security transactional emails |
| `notification` | General notification with customizable title and content | System alerts, status updates |
| `order_confirmation` | Order confirmation with item list and price summary | E-commerce transaction confirmations |

## Workflow

### Step 1: Gather User Requirements

Collect the following information from the user:
1. **Email type**: Welcome? Promotional? Password reset? Notification? Order confirmation?
2. **Brand info**: Company name, primary color, logo URL
3. **Content details**: Required fields vary by template type (see details below)
4. **Language preference**: Language for the email content

### Step 2: Generate Configuration File

Create a JSON configuration file based on user requirements. Configuration structures differ by template type.

#### Common Fields (shared by all types)

```json
{
  "template_type": "welcome",
  "theme": {
    "primary_color": "#4A90D9",
    "secondary_color": "#2C5282",
    "accent_color": "#ED8936",
    "bg_color": "#F7FAFC",
    "content_bg_color": "#FFFFFF",
    "text_color": "#2D3748",
    "muted_text_color": "#718096",
    "font_family": "Arial, Helvetica, sans-serif",
    "max_width": 600,
    "border_radius": 8
  },
  "header": {
    "logo_url": "",
    "logo_alt": "Company Logo",
    "company_name": "MyCompany"
  },
  "preheader": "Preview text shown in the inbox",
  "footer": {
    "company": "MyCompany Inc.",
    "address": "123 Main Street, San Francisco, CA 94102",
    "unsubscribe_url": "#",
    "support_email": "support@example.com",
    "extra_links": [
      {"text": "Website", "url": "https://example.com"}
    ]
  }
}
```

#### Welcome Template Content Fields

```json
{
  "content": {
    "user_name": "John",
    "greeting": "Welcome to MyCompany!",
    "message": "Thanks for signing up. Here are some features to help you get started.",
    "cta_text": "Get Started",
    "cta_url": "https://example.com/get-started",
    "features": [
      {"icon": "📊", "title": "Dashboard", "description": "View key metrics in real time"},
      {"icon": "🤝", "title": "Team Collaboration", "description": "Invite team members to work together"},
      {"icon": "🔔", "title": "Smart Alerts", "description": "Get notified about important events automatically"}
    ]
  }
}
```

#### Promotional Template Content Fields

```json
{
  "content": {
    "headline": "Summer Sale — Up to 50% Off",
    "sub_headline": "Limited-time offer, don't miss out",
    "hero_image_url": "https://placehold.co/600x300/EEE/333?text=Sale+Banner",
    "products": [
      {
        "name": "Classic T-Shirt",
        "image_url": "https://placehold.co/200x200/EEE/333?text=T-Shirt",
        "original_price": "$39.99",
        "sale_price": "$19.99",
        "url": "https://example.com/product/1"
      }
    ],
    "offer_code": "SUMMER50",
    "offer_expires": "2026-06-30",
    "cta_text": "Shop Now",
    "cta_url": "https://example.com/sale"
  }
}
```

#### Password Reset Template Content Fields

```json
{
  "content": {
    "user_name": "John",
    "message": "We received a request to reset your account password. If you didn't make this request, you can safely ignore this email.",
    "reset_url": "https://example.com/reset?token=abc123",
    "cta_text": "Reset Password",
    "expires_in": "24 hours",
    "support_email": "support@example.com"
  }
}
```

#### Notification Template Content Fields

```json
{
  "content": {
    "title": "Your Report Is Ready",
    "message": "The monthly data report you requested is now available. Click the button below to view it.",
    "details": [
      {"label": "Report Type", "value": "Monthly Data Summary"},
      {"label": "Generated At", "value": "2026-04-14 10:00"},
      {"label": "Data Range", "value": "2026-03-01 ~ 2026-03-31"}
    ],
    "cta_text": "View Report",
    "cta_url": "https://example.com/reports/202603"
  }
}
```

#### Order Confirmation Template Content Fields

```json
{
  "content": {
    "user_name": "John",
    "order_number": "ORD-20260414-001",
    "order_date": "2026-04-14",
    "items": [
      {"name": "Wireless Bluetooth Earbuds", "quantity": 1, "price": "$39.99"},
      {"name": "Phone Case", "quantity": 2, "price": "$9.99"}
    ],
    "subtotal": "$59.97",
    "shipping": "$0.00",
    "total": "$59.97",
    "shipping_address": "123 Main Street, San Francisco, CA 94102",
    "cta_text": "View Order",
    "cta_url": "https://example.com/orders/ORD-20260414-001"
  }
}
```

### Step 3: Generate HTML

After writing the configuration to a JSON file, run the generation script:

```bash
python scripts/generate_email_template.py --input config.json --output email.html
```

### Step 4: Delivery

1. Provide the user with the generated HTML file path
2. Suggest opening it in a browser for preview
3. Remind the user to replace placeholder images and links with actual content

## Email Compatibility Notes

The generated HTML follows these email compatibility best practices:

- **Table layout**: All structure uses `<table>` instead of `<div>` for Outlook compatibility
- **Inline CSS**: All core styles are applied via inline `style` attributes
- **Responsive design**: Mobile adaptation via `@media` queries in `<style>` tags (supports Gmail/Apple Mail/iOS)
- **Web-safe fonts**: Defaults to Arial/Helvetica with no custom font dependencies
- **Fixed width + fluid fallback**: Email body is 600px wide, scaling to 100% on mobile
- **MSO conditional comments**: Includes Outlook-specific conditional comments for correct rendering
- **Background color compatibility**: Uses both `bgcolor` attributes and `background-color` styles
- **Image handling**: All images have explicit width and alt text
- **Preheader text**: Supports inbox preview text configuration
- **VML buttons**: CTA buttons use VML-compatible markup for rounded buttons in Outlook

## Important Notes

- Images must use **external URLs** (emails do not support base64-embedded images or relative paths)
- If the user has no images, use `https://placehold.co/600x300/EEE/333?text=Your+Image` as a placeholder
- The generated HTML can be pasted directly into email marketing tools (Mailchimp, SendGrid, etc.)
- Security emails like password reset should be kept clean and minimal, avoiding excessive decorative elements
