---
name: ecom-listing-copywriter
description: "Writes complete e-commerce product listing copy including titles, selling points, specifications, and FAQs, styled for Taobao, JD.com, or Amazon. Triggered by requests for product copy, titles, detail pages, bullet points, specifications, or platform-specific listings like Taobao titles or Amazon A+ content."
license: MIT
---

# Product Listing Copywriter — E-Commerce Product Detail Page Knowledge Base

Helps users write professional e-commerce product listing copy covering four core modules — title, key selling points, specifications, and FAQ — tailored to the style guidelines of Taobao, JD.com, and Amazon.

## Quick Start

The user only needs to provide:
1. **Product Information**: Category, brand, model, core specs
2. **Target Platform**: Taobao / JD.com / Amazon (or generate for multiple platforms at once)
3. **Target Audience**: Gender, age range, usage scenarios
4. **Language**: Chinese / English / Bilingual
5. **Differentiators**: Core advantages over competitors (optional — user-supplied or extracted from the provided information)

Example:
> "Write product listing copy for a wireless noise-cancelling headphone. Brand is SoundMax, model Pro X3, key features are noise cancellation and long battery life. I need both a Taobao and an Amazon version."

---

## 1. Platform Style Comparison Matrix

### 1.1 Core Rules Across Three Major Platforms

| Dimension | Taobao/Tmall | JD.com | Amazon |
|-----------|-------------|--------|--------|
| Title Length | ≤60 characters (mobile: prioritize keywords in first 30) | ≤75 characters (recommended ≤45) | ≤200 characters (recommended ≤80 for front-end display) |
| Title Style | Keyword stacking + marketing terms, trending keywords first | Brand + Category + Core Specs + Scenario, clear structure | Brand + Core Feature + Product Type + Key Spec, no promotional terms |
| Selling Point Format | Hero image text + long-form detail page | Product intro + structured spec table | Bullet Points (5 items, each ≤500 characters) |
| Selling Point Tone | Emotional, evocative, scenario-driven ("Save your commute") | Rational, spec-driven, authority-backed ("XX Certified") | Feature-Benefit structure, concise and professional |
| FAQ | "Ask Everyone" section / bottom of detail page | Product Q&A section | Product Q&A Section |
| Spec Table | Free-form, often embedded as images in the detail page | Structured spec table (platform template) | Product Information structured fields |
| Prohibited Words | Superlatives like "best," "first," "absolute" (Advertising Law) | Same as Taobao + false advertising terms | "best seller," "#1," "guaranteed," and other exaggerated claims |
| SEO Focus | Trending keywords, long-tail terms, attribute terms | Category terms, brand terms, function terms | Backend Search Terms field + title keywords |

### 1.2 Prohibited Words Quick Reference

**China Platform Common Prohibited Words** (Advertising Law violations):
- Superlatives: best, first, top-tier, ultimate, absolute, only, first-ever, unprecedented
- False Promises: permanent, all-purpose, 100%, zero risk, no side effects
- False Authority: national-level, specially supplied, exclusively provided (without genuine credentials)
- Bait Terms: flash sale, clearance (when no actual promotion is running)

**Amazon Prohibited Words**:
- Price/Promotion: cheap, affordable, discount, on sale, free shipping
- Exaggeration: best, #1, top rated, guaranteed, miracle
- Time-Sensitive: new, latest (invalid after product updates)
- Seller Opinions: amazing quality, perfect product
- Competitor Mentions: better than [Brand X] (prohibited in titles/bullets)

---

## 2. Title Writing Formulas

### 2.1 Taobao Title Formula

```
[Brand] + [Core Category Keyword] + [Key Selling Points ×2] + [Usage Scenario/Audience] + [Modifiers/Trending Keywords]
```

**Writing Rules**:
- Place core search keywords in the first 30 characters (mobile truncation point)
- Separate keyword groups with spaces (the system auto-segments)
- No punctuation; avoid filler words like "的" or "了"
- Season/scenario/audience keywords improve targeted traffic

**Example**:
```
SoundMax Pro X3 无线蓝牙耳机 主动降噪 50小时续航 头戴式 通勤办公 高音质HIFI
```

### 2.2 JD.com Title Formula

```
[Brand] + [Category] + [Model] + [Core Specs ×2-3] + [Usage Scenario] + [Bonus/Service (if any)]
```

**Writing Rules**:
- Brand and category must appear in the first 15 characters
- Separate semantic units with spaces
- Use specific values ("50-hour battery" is better than "ultra-long battery")
- May include service commitments ("JD Self-Operated," "Trade-In Available")

**Example**:
```
SoundMax Pro X3 无线蓝牙耳机 主动降噪45dB 50小时续航 头戴式HIFI音质 通勤办公 京东自营
```

### 2.3 Amazon Title Formula

```
[Brand] + [Model] + [Product Type] + [Key Feature 1] + [Key Feature 2] + [Size/Color/Variant]
```

**Writing Rules**:
- Capitalize the first letter of each word (Title Case), except prepositions/articles
- No special symbols (™ and ® are allowed); no ALL CAPS
- Brand name must appear first
- No promotional info, pricing, or subjective opinions

**Example**:
```
SoundMax Pro X3 Wireless Over-Ear Headphones, Active Noise Cancelling 45dB, 50-Hour Battery Life, Hi-Fi Sound, Foldable Design for Commute and Office
```

---

## 3. Selling Points Writing Framework

### 3.1 Selling Point Methodology (FAB + SPIN)

Each selling point follows a **Feature → Advantage → Benefit** structure:

| Layer | Definition | Example |
|-------|-----------|---------|
| Feature | What the product has | 45dB Active Noise Cancellation |
| Advantage | How it's better than alternatives | Industry-leading noise reduction depth, 10dB above competitors in the same price range |
| Benefit | What value it brings to the user | Enjoy pure music on the subway or airplane — stay focused without distractions |

**Selling Point Priority Order**:
1. Core differentiators (features competitors lack or where you clearly lead)
2. Features addressing high-frequency user pain points
3. Quality/safety/certification endorsements
4. Extended usage scenarios
5. Added value (free gifts, after-sales service, warranties)

### 3.2 Taobao Selling Point Style

**Style**: Scenario-driven, emotional, conversational, with short sentences and contrasts.

```
🎵 降噪实力派 | 45dB深度降噪
地铁轰鸣？飞机引擎？统统消失。
搭载旗舰级ANC芯片，降噪深度达45dB，
让你随时随地沉浸在自己的音乐世界。

🔋 超长续航不焦虑 | 50小时畅听
一周只充一次电。
满电50小时连续播放，通勤党再也不用天天找充电线。
快充10分钟 = 听歌3小时，应急超给力。
```

### 3.3 JD.com Selling Point Style

**Style**: Spec-driven, technical, authoritative, with references to certifications and test data.

```
【45dB 主动降噪】采用自研 ANC 3.0 降噪算法，搭配双馈式麦克风阵列，
实现 45dB 降噪深度。经 SGS 实验室测试认证，有效消减地铁、飞机引擎等
中低频噪音，打造沉浸式聆听环境。

【50 小时超长续航】内置 800mAh 大容量锂电池，满电续航 50 小时
（降噪开启时 35 小时）。支持 Type-C 快充，10 分钟充电可播放 3 小时。
```

### 3.4 Amazon Bullet Points Style

**Style**: Feature-Benefit parallel structure, bold keyword opener, 1–2 sentences per bullet.

```
• INDUSTRY-LEADING NOISE CANCELLATION — Advanced ANC 3.0 technology 
  with dual-feed microphones delivers 45dB noise reduction, effectively 
  blocking subway rumble and airplane engine noise for immersive listening.

• 50-HOUR MARATHON BATTERY — A single charge powers up to 50 hours of 
  playtime (35 hours with ANC on). USB-C fast charging gives you 3 hours 
  of playback from just a 10-minute charge.

• HI-FI AUDIO WITH 40MM DRIVERS — Custom-tuned 40mm dynamic drivers 
  deliver rich bass, clear mids, and sparkling highs. Supports LDAC 
  and AAC codecs for studio-quality wireless audio.

• ALL-DAY COMFORT DESIGN — Memory foam ear cushions with breathable 
  protein leather distribute pressure evenly. Lightweight 250g build 
  and adjustable headband fit all head sizes comfortably.

• SEAMLESS MULTI-DEVICE CONNECTION — Bluetooth 5.3 with multipoint 
  connectivity lets you switch between phone and laptop instantly. 
  Built-in microphone with ENC for crystal-clear calls.
```

---

## 4. Specification Table Template

### 4.1 Universal Specification Template

| Field | Description |
|-------|-------------|
| Brand | Brand name |
| Model | Specific model number |
| Category | Product category |
| Color/Style | List available options |
| Dimensions/Weight | Including packaging and unit |
| Material | Primary materials used |
| Core Specs | Key technical parameters (varies by category) |
| Compatibility | Compatible devices/systems/standards |
| Package Contents | Everything included in the box |
| Warranty | Warranty period and coverage |
| Certifications | Quality/safety certifications obtained |
| Origin | Place of manufacture |

### 4.2 Platform-Specific Notes

- **Taobao**: Spec information is often embedded as images in the detail page; also fill in backend attribute fields
- **JD.com**: Must fill in the platform's mandatory structured spec template; no fields may be left empty
- **Amazon**: Fill in the Product Information section; some fields are platform-required; note unit conversion (inches/pounds for US marketplace)

---

## 5. FAQ Writing Guide

### 5.1 FAQ Sources and Topic Selection

FAQs should address key concerns in the buyer's purchase decision, prioritized by source:

1. **High-frequency questions from competitor reviews**: Look at recurring issues in competitor negative reviews and Q&A sections
2. **Common category concerns**: Core metrics that buyers universally care about in this category
3. **Follow-up questions about differentiating features**: User confusion about innovative functions
4. **After-sales and usage scenarios**: Returns/exchanges, compatibility, usage tips

### 5.2 FAQ Quantity and Structure

| Platform | Recommended Count | Style |
|----------|-------------------|-------|
| Taobao | 8–12 items | Conversational, buyer's perspective ("Does this headphone have lag when gaming?") |
| JD.com | 6–10 items | Semi-formal, technically oriented ("Does this product support aptX HD codec?") |
| Amazon | 5–8 items | Formal, Feature-Answer structure |

### 5.3 FAQ Writing Examples

**Taobao Style**:

```
Q：降噪效果怎么样？能完全隔绝噪音吗？
A：亲，我们这款耳机降噪深度达到45dB，地铁、办公室空调这些噪音
基本听不到了~不过像人声对话这种高频声音会适当保留，这是为了安全考虑哦。
如果需要完全沉浸可以搭配降噪+音乐一起使用，效果非常棒！

Q：续航真的有50小时吗？
A：50小时是关闭降噪、中等音量下的测试数据。开降噪的话大概35小时左右，
正常通勤使用一周一充完全没问题~而且支持快充，10分钟就能听3小时，
出门前充一会儿就够用了！
```

**JD.com Style**:

```
Q：本产品的降噪等级和降噪深度具体是多少？
A：本产品搭载 ANC 3.0 主动降噪技术，降噪深度为 45dB，经 SGS 实验室
环境测试认证。可有效消减 50-1000Hz 频段的环境噪音（如交通噪音、
空调运转声等），高频人声段保留约 30% 以确保安全通行需要。

Q：电池容量和实际续航时间分别是多少？
A：内置 800mAh 锂聚合物电池。续航时间：纯音乐模式约 50 小时，
ANC 开启模式约 35 小时（测试条件：音量 50%，25°C 室温）。
支持 USB-C 快充，充电 10 分钟可使用约 3 小时。
```

**Amazon Style**:

```
Q: How effective is the noise cancellation?
A: The Pro X3 features Active Noise Cancellation with 45dB noise reduction,
verified by SGS lab testing. It effectively reduces low-to-mid frequency 
noise such as airplane engines, subway rumble, and office HVAC. Ambient 
sound mode is available for situational awareness when needed.

Q: What is the actual battery life with ANC turned on?
A: With ANC enabled at 50% volume, the battery lasts approximately 
35 hours. With ANC off, battery life extends to approximately 50 hours. 
USB-C fast charging provides 3 hours of playback from a 10-minute charge.
```

---

## 6. SEO Keyword Strategy

### 6.1 Keyword Tiers

| Tier | Definition | Example (Wireless Headphones) | Usage |
|------|-----------|-------------------------------|-------|
| Core Keywords | Broad category terms | wireless headphones, Bluetooth headphones | Must include in title |
| Attribute Keywords | Feature/spec descriptors | noise cancelling, long battery, over-ear | Title + selling points |
| Scenario Keywords | Usage context | commute, office, sports | Title + detail page |
| Long-Tail Keywords | Niche queries | airplane noise cancelling headphones, low latency gaming headphones | End of title + backend search terms |
| Competitor Keywords | Competitor brand/model names | — | Amazon backend Search Terms only |

### 6.2 Amazon Search Terms Rules

- Total length ≤250 bytes (including spaces)
- Do not repeat words already in the title
- Separate with spaces — no commas or semicolons
- Do not include brand name (already in the title)
- May include spelling variants, synonyms, and common Spanish/French search terms (for respective marketplaces)

---

## 7. Agent Behavior Guidelines

When the user requests e-commerce product listing copy, follow this workflow:

### Step 1: Information Gathering

Confirm the following key details (mark missing items with placeholders and prompt the user to fill them in):
- Basic product info: category, brand, model
- Core specs/selling points: at least 3 differentiating features
- Target platform: Taobao / JD.com / Amazon (multi-select allowed)
- Target audience: buyer persona and usage scenarios
- Language: Chinese / English / Bilingual
- Competitor references (optional): user-specified competitors or benchmark products

### Step 2: Selling Point Extraction and Ranking

1. Extract 5–8 selling points from user-provided information
2. Expand each selling point using the FAB structure
3. Rank by priority (Differentiation > Pain Point Resolution > Quality Endorsement > Scenario Expansion)

### Step 3: Generate Copy by Platform

For each target platform, output in this order:

```
━━━━━━━━━━━ [Platform Name] ━━━━━━━━━━━

📌 Title
[Generated using the platform's title formula]

🎯 Selling Points (Bullet Points / Detail Copy)
[5 core selling points in the platform's style]

📋 Specification Table
[Output in the platform's format]

❓ FAQ (5–8 items)
[Generated in the platform's style]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Step 4: Compliance Check

After generation, automatically verify:
- [ ] No prohibited words or superlatives
- [ ] Title within platform character limits
- [ ] All spec values are substantiated (never fabricate performance data)
- [ ] Bullet points within character limits (Amazon: ≤500 characters each)
- [ ] No exaggerated claims or false promises

### Step 5: Output and Notes

- Output the complete copy for all platforms
- Flag placeholder information that needs user confirmation or input
- Explain the selling point ranking logic and key wording choices
- If certain spec data was not provided by the user, explicitly mark as "[To Be Confirmed]" rather than making it up

---

## 8. Category-Specific Highlights

Different categories require different copy emphases. Here are core focus areas for common categories:

| Category | Title Keyword Focus | Selling Point Focus | High-Frequency FAQ Topics |
|----------|-------------------|-------------------|--------------------------|
| Electronics & Tech | Model, core specs, compatibility | Performance data, battery life, certifications | Compatibility, real-world battery life, warranty |
| Apparel & Accessories | Style, material, season, occasion | Fabric feel, fit/cut, styling scenarios | Size selection, care instructions, color accuracy |
| Beauty & Skincare | Efficacy, ingredients, skin type suitability | Key ingredients, visible results, safety | Suitable for sensitive skin?, frequency of use, shelf life |
| Food & Beverage | Flavor, packaging size, origin, shelf life | Ingredient quality, taste description, health benefits | Shelf life, allergens, storage instructions |
| Home & Appliances | Dimensions, wattage, energy efficiency rating | Energy savings data, ease of use, safety certifications | Installation, energy consumption, after-sales service |
| Baby & Maternity | Age range, safety certifications, material | Non-toxic safety, authoritative testing, usage scenarios | Suitable age, safety certifications, cleaning instructions |

---

## 9. Copy Quality Evaluation Criteria

Generated copy should meet the following standards:

| Dimension | Passing Criteria |
|-----------|-----------------|
| Platform Compliance | No prohibited words, within character limits, correct formatting |
| Information Accuracy | All spec data is verifiable; no fabricated performance metrics |
| Clear Selling Points | Each selling point has a complete FAB structure with clear differentiation |
| Audience Fit | Tone and style match the target buyer persona |
| SEO Friendly | Core keywords naturally integrated into titles and selling points |
| Actionability | Placeholder info is clearly marked; copy is ready for direct use or editing |
