---
name: html-mail-builder
description: "生成兼容 Gmail/Outlook/Apple Mail 的 HTML 邮件模板，采用 table 布局和 inline CSS 确保一致渲染，支持响应式设计。适用于欢迎邮件、促销邮件、密码重置、通知邮件和订单确认邮件等场景。当用户需要创建或设计营销邮件（EDM）、事务性邮件、Newsletter，或提及邮件模板、HTML 邮件、兼容性设计等关键词时触发。"
license: MIT
type: tool
---

# Email Template Designer

生成专业的 HTML 邮件模板，完全兼容 Gmail、Outlook、Apple Mail 等主流邮件客户端。采用 table 布局 + inline CSS 方案，确保在所有客户端中渲染一致，同时通过 media query 实现移动端响应式适配。

## 使用场景

- 新用户欢迎邮件（Welcome）
- 促销活动 / 限时折扣邮件（Promotional）
- 密码重置 / 安全验证邮件（Password Reset）
- 系统通知邮件（Notification）
- 订单确认邮件（Order Confirmation）

## 支持的模板类型

| 类型 | 说明 | 典型用途 |
|------|------|----------|
| `welcome` | 欢迎注册，含功能亮点和入门引导 | 新用户 Onboarding |
| `promotional` | 促销活动，含商品展示和优惠码 | 营销推广、节日促销 |
| `password_reset` | 密码重置链接，简洁安全 | 安全类事务邮件 |
| `notification` | 通用通知，可自定义标题和内容 | 系统通知、状态更新 |
| `order_confirmation` | 订单确认，含商品列表和金额汇总 | 电商交易确认 |

## 工作流程

### 第一步：收集用户需求

向用户了解以下信息：
1. **邮件类型**：欢迎？促销？密码重置？通知？订单确认？
2. **品牌信息**：公司名称、主色调、Logo URL
3. **具体内容**：因模板类型不同，需要的内容字段各异（见下方详解）
4. **语言偏好**：邮件内容的语言

### 第二步：生成配置文件

根据用户需求，创建 JSON 配置文件并保存。不同模板类型的配置结构如下。

#### 通用字段（所有类型共享）

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
  "preheader": "显示在收件箱预览中的文本",
  "footer": {
    "company": "MyCompany Inc.",
    "address": "北京市朝阳区xxx路1号",
    "unsubscribe_url": "#",
    "support_email": "support@example.com",
    "extra_links": [
      {"text": "官网", "url": "https://example.com"}
    ]
  }
}
```

#### Welcome 模板内容字段

```json
{
  "content": {
    "user_name": "张三",
    "greeting": "欢迎加入 MyCompany！",
    "message": "感谢你注册成为我们的用户。以下是帮助你快速上手的功能介绍。",
    "cta_text": "开始使用",
    "cta_url": "https://example.com/get-started",
    "features": [
      {"icon": "📊", "title": "数据仪表盘", "description": "实时查看关键指标"},
      {"icon": "🤝", "title": "团队协作", "description": "邀请团队成员一起工作"},
      {"icon": "🔔", "title": "智能提醒", "description": "重要事项自动通知"}
    ]
  }
}
```

#### Promotional 模板内容字段

```json
{
  "content": {
    "headline": "夏日特惠 — 全场低至5折",
    "sub_headline": "限时优惠，错过等明年",
    "hero_image_url": "https://placehold.co/600x300/EEE/333?text=Sale+Banner",
    "products": [
      {
        "name": "经典款T恤",
        "image_url": "https://placehold.co/200x200/EEE/333?text=T-Shirt",
        "original_price": "¥299",
        "sale_price": "¥149",
        "url": "https://example.com/product/1"
      }
    ],
    "offer_code": "SUMMER50",
    "offer_expires": "2026-06-30",
    "cta_text": "立即抢购",
    "cta_url": "https://example.com/sale"
  }
}
```

#### Password Reset 模板内容字段

```json
{
  "content": {
    "user_name": "张三",
    "message": "我们收到了重置你账户密码的请求。如果这不是你本人操作，请忽略此邮件。",
    "reset_url": "https://example.com/reset?token=abc123",
    "cta_text": "重置密码",
    "expires_in": "24小时",
    "support_email": "support@example.com"
  }
}
```

#### Notification 模板内容字段

```json
{
  "content": {
    "title": "你的报告已生成",
    "message": "你请求的月度数据报告已经准备完毕，可以点击下方按钮查看。",
    "details": [
      {"label": "报告类型", "value": "月度数据汇总"},
      {"label": "生成时间", "value": "2026-04-14 10:00"},
      {"label": "数据范围", "value": "2026-03-01 ~ 2026-03-31"}
    ],
    "cta_text": "查看报告",
    "cta_url": "https://example.com/reports/202603"
  }
}
```

#### Order Confirmation 模板内容字段

```json
{
  "content": {
    "user_name": "张三",
    "order_number": "ORD-20260414-001",
    "order_date": "2026-04-14",
    "items": [
      {"name": "无线蓝牙耳机", "quantity": 1, "price": "¥399"},
      {"name": "手机壳", "quantity": 2, "price": "¥59"}
    ],
    "subtotal": "¥517",
    "shipping": "¥0",
    "total": "¥517",
    "shipping_address": "北京市海淀区中关村大街1号",
    "cta_text": "查看订单",
    "cta_url": "https://example.com/orders/ORD-20260414-001"
  }
}
```

### 第三步：生成 HTML

将配置写入 JSON 文件后，运行生成脚本：

```bash
python scripts/generate_email_template.py --input config.json --output email.html
```

### 第四步：交付

1. 将生成的 HTML 文件路径告知用户
2. 提示可在浏览器中直接打开预览
3. 提醒用户替换占位图片和链接为实际内容

## 邮件兼容性说明

生成的 HTML 遵循以下邮件兼容性最佳实践：

- **Table 布局**：所有结构使用 `<table>` 而非 `<div>`，确保 Outlook 兼容
- **Inline CSS**：所有核心样式通过 `style` 属性内联
- **响应式设计**：通过 `<style>` 标签中的 `@media` 查询实现移动端适配（支持 Gmail/Apple Mail/iOS）
- **Web-safe 字体**：默认 Arial/Helvetica，不依赖自定义字体
- **固定宽度 + 流式回退**：邮件主体 600px 宽度，移动端自动缩放至 100%
- **MSO 条件注释**：包含 Outlook 专用条件注释确保正确渲染
- **背景色兼容**：同时使用 `bgcolor` 属性和 `background-color` 样式
- **图片处理**：所有图片设置显式宽度和 alt 文本
- **Preheader 文本**：支持邮件预览文本设置
- **VML 按钮**：CTA 按钮使用 VML 兼容方案确保 Outlook 中显示圆角按钮

## 注意事项

- 图片必须使用**外部 URL**（邮件不支持 base64 内嵌图片或相对路径）
- 如果用户没有图片，可使用 `https://placehold.co/600x300/EEE/333?text=Your+Image` 作为占位图
- 生成的 HTML 可直接粘贴到邮件营销工具（Mailchimp、SendGrid 等）中使用
- 密码重置等安全类邮件应保持简洁，避免过多装饰元素
