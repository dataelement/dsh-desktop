---
name: cross-platform-adapter
description: "Adapts and repurposes content (blog posts, articles, reports, newsletters) for LinkedIn, Twitter/X, WeChat Official Accounts, Zhihu, and Slack — adjusting tone, length, formatting, and language to match each platform's norms, including English-Chinese cross-language adaptation. Use when a user wants to repurpose, cross-post, adapt, or convert existing content for different platforms."
license: MIT
---

# Cross-Platform Adapter — One Source, Five Platforms

Take any long-form content (blog post, report, speech, internal doc, newsletter) and produce tailored versions for LinkedIn, Twitter/X, WeChat Official Accounts, Zhihu, and Slack. Each version respects the platform's character limits, audience expectations, formatting conventions, and cultural context.

## When to Use

- User has a piece of content and wants to distribute it across multiple platforms
- User asks to "repurpose this," "adapt this for LinkedIn/Twitter/WeChat/Zhihu/Slack," or "make platform versions"
- User wants to maximize reach from a single content investment

## Input

The user provides source content (article, blog post, report, talking points, etc.) and optionally specifies:

- Target platforms (default: all five)
- Target audience per platform (if different from general)
- Language preference per platform (Chinese for WeChat/Zhihu, English for LinkedIn/Twitter/Slack — or user-specified)
- Tone override (e.g., "keep LinkedIn more casual than usual")
- Specific CTA per platform

## SOP — Step-by-Step Process

> **Length scaling**: The per-platform character recommendations below assume a medium-length source (~500–1,500 words). For shorter sources, scale down proportionally — a 300-word blog post should NOT be padded to hit 1,500 Chinese characters on WeChat. Quality over length.

### Step 1: Analyze the Source Content

Read the full input and extract:

1. **Core message** — the single main idea in one sentence
2. **Key supporting points** — 3–7 distinct arguments, data points, or stories
3. **Target audience** — who benefits from this content
4. **Content type** — educational, opinion, announcement, case study, how-to, thought leadership
5. **Quotable moments** — short, punchy phrases that can stand alone
6. **Data and evidence** — statistics, research citations, concrete examples
7. **Original language** — note whether the source is in English, Chinese, or mixed

### Step 2: Platform Analysis Matrix

Before writing, map each platform's constraints:

| Dimension | LinkedIn | Twitter/X | WeChat Official Accounts | Zhihu | Slack |
|---|---|---|---|---|---|
| Max length | ~3,000 chars | 280 chars/tweet | ~20,000 chars | ~20,000 chars | ~4,000 chars/message |
| Primary language | English (default) | English (default) | Chinese | Chinese | English (default) |
| Tone | Professional, insightful | Punchy, conversational | Storytelling, authoritative | Analytical, evidence-based | Concise, action-oriented |
| Format | Paragraphs with line breaks | Thread of short tweets | Rich text with headers/bold | Structured with headers/lists | Bullets, bold, emoji |
| Audience mindset | Career growth, industry trends | Quick takes, hot takes | Deep reading, sharing-worthy | Learning, seeking expertise | Team context, actionable info |
| CTA style | Comment/share/follow | Reply/repost/follow | Like/Wow/Share/Follow | Upvote/Bookmark/Follow | React/thread/share link |

### Step 3: Produce LinkedIn Version

**Constraints:**
- Length: 1,200–1,800 characters recommended (posts under 1,300 chars get the "see more" fold at ~210 chars)
- Language: English by default; Chinese if user specifies or source is Chinese
- No markdown rendering — use Unicode line breaks and emoji sparingly for structure

**Structure:**
1. **Hook line** (first 210 characters — visible before "see more"): Start with a bold or surprising statement. This must compel the click.
2. **Body** (3–5 short paragraphs): One idea per paragraph. Use single-line breaks between paragraphs for visual breathing room. Include 1–2 data points from the source.
3. **Personal insight** (1–2 sentences): Add a "here's what I've learned" or "my take" element — LinkedIn rewards personal perspective.
4. **CTA** (final line): One clear ask — comment, share, or follow.

**LinkedIn-specific rules:**
- No hashtags in the first line — they look spammy
- 3–5 hashtags at the very end, if used at all
- Avoid corporate jargon ("synergy," "leverage," "disruption") unless the source specifically uses it
- Short sentences. Single-sentence paragraphs are fine and perform well.
- Do not fabricate personal anecdotes — only include what the source provides

### Step 4: Produce Twitter/X Version

**Constraints:**
- Hard limit: 280 characters per tweet
- Thread length: 5–15 tweets ideal
- Language: English by default

**Structure:**
1. **Hook tweet**: Use a proven pattern — contrarian claim, surprising stat, bold promise, or relatable pain point. End with a thread indicator (e.g., "A thread:"). No hashtags in tweet 1.
2. **Body tweets**: One idea per tweet. Use line breaks for readability within tweets. Maintain logical flow — each tweet builds on the previous.
3. **CTA tweet**: Drive exactly one action (follow, reply, repost, bookmark).

**Twitter-specific rules:**
- Count characters carefully — URLs count as 23 characters, emojis as 2
- Include tweet numbering (2/, 3/, etc.) for threads over 5 tweets; hook tweet does not get a number
- Short punchy tweets (under 100 chars) between dense tweets for rhythm
- Preserve all statistics and facts from source — never fabricate
- Show character count for each tweet in the output

### Step 5: Produce WeChat Official Accounts Version

**Constraints:**
- Length: 1,500–3,000 Chinese characters recommended for readability
- Language: Chinese (translate from English source if needed; preserve original meaning, do not transliterate)
- Rich formatting supported: headers, bold, blockquotes, section dividers

**Structure:**
1. **Title**: 15–30 Chinese characters. Must spark curiosity or promise value. Avoid clickbait that doesn't deliver.
2. **Opening paragraph**: 2–3 sentences establishing why the reader should care. Use a relatable scenario, surprising data point, or question.
3. **Body**: Organize into 3–5 sections with clear subheadings (use **bold** or ### headings). Each section covers one key point. Weave in data, examples, and mini-stories from the source.
4. **Quotable line**: Include 1–2 standalone sentences formatted as blockquotes — these are what readers screenshot and share.
5. **Closing**: Summarize the core message in 1–2 sentences, then add a CTA (follow/like/share).

**WeChat-specific rules:**
- Write in natural, flowing Chinese — not stiff translation
- Cultural adaptation: replace Western-only references with universally relatable ones, or add brief context for Western examples
- Paragraph length: 3–5 sentences max — long paragraphs lose mobile readers
- Use corner brackets (「」) for emphasis quotes in Chinese text rather than standard quotation marks
- No external hyperlinks in body text (WeChat restricts them) — reference sources by name instead
- Avoid politically sensitive content per platform norms

### Step 6: Produce Zhihu Version

**Constraints:**
- Length: 1,000–4,000 Chinese characters
- Language: Chinese
- Zhihu readers expect depth, evidence, and structured reasoning

**Structure:**
1. **Opening**: Frame the content as answering an implicit question. Start with a concise thesis statement or a "conclusion first" pattern.
2. **Argument body**: Use numbered sections or clear headers. Each section should follow a claim → evidence → implication pattern. Include all relevant data points from the source.
3. **Practical advice**: If the content is how-to or educational, provide a clear numbered list of actionable steps.
4. **Summary**: 2–3 sentences wrapping up the core insight.
5. **Engagement hook**: End with a question to the reader (e.g., "What's your take?" or "What's been your experience?") or a CTA (upvote/bookmark/follow).

**Zhihu-specific rules:**
- Credibility matters — cite sources, mention research by name, be specific with numbers
- Avoid vague claims — "research shows" is weak; "A 2024 Stanford study found..." is strong
- Use the "conclusion first" pattern if the content supports it — Zhihu readers appreciate direct answers
- Logical structure with headers is expected — walls of text perform poorly
- Tone: knowledgeable but not arrogant; helpful, not preachy
- No fabricated data or unverifiable claims

### Step 7: Produce Slack Version

**Constraints:**
- Length: 300–800 characters ideal for a single message; up to 4,000 max
- Language: Match the team's working language (English by default)
- Internal audience — assumes shared context

**Structure:**
1. **TL;DR line** (bold): One sentence summarizing the key takeaway, prefixed with a relevant emoji.
2. **Key points** (3–5 bullets): Short, scannable bullets — each one actionable or informative. Use bold for emphasis on key terms.
3. **Link or reference** (optional): "Full article: [title]" or "More details in #channel"
4. **Discussion prompt** (optional): One question to spark a thread conversation.

**Slack-specific rules:**
- Use Slack formatting: `*bold*`, `_italic_`, `>` for quotes, `•` for bullets
- One emoji per key section header max — don't overdo it
- Assume readers will skim in 10 seconds — front-load the value
- Remove all marketing language — this is internal, peer-to-peer communication
- If the source content has action items, call them out explicitly with owner/deadline placeholders
- No "Dear team" or formal openings — get straight to the content

### Step 8: Cross-Platform Consistency Check

Before presenting the output, verify:

- [ ] **Core message preserved**: All five versions communicate the same central idea
- [ ] **Facts are consistent**: Statistics, names, and claims match across all versions — nothing fabricated
- [ ] **Platform constraints met**: Character limits respected, formatting matches platform norms
- [ ] **Language is correct**: Chinese platforms (WeChat/Zhihu) use natural Chinese; English platforms use clean English
- [ ] **Tone matches platform**: LinkedIn is professional, Twitter is punchy, WeChat is narrative, Zhihu is analytical, Slack is concise
- [ ] **CTAs are platform-appropriate**: Each CTA matches what users actually do on that platform
- [ ] **No hardcoded links or paths**: All references are relative or user-provided
- [ ] **No sensitive information exposed**: If the source is internal, the Slack version should be marked as such and external versions should be sanitized

## Output Format

Present each platform version under a clear header. Include a metadata block at the top summarizing the adaptation:

```
## Content Adaptation Summary

- **Source**: [brief description of source content]
- **Core message**: [one sentence]
- **Platforms generated**: LinkedIn, Twitter/X, WeChat Official Accounts, Zhihu, Slack

---

## LinkedIn

[LinkedIn version]

**Character count**: #### characters

---

## Twitter/X Thread

Thread (X tweets)

[1] <hook tweet>
(### chars)

[2] <body tweet>
(### chars)

...

---

## WeChat Official Accounts

**Title**: [title]

[WeChat version]

**Word count**: #### characters

---

## Zhihu

[Zhihu version]

**Word count**: #### characters

---

## Slack

[Slack version]

**Character count**: #### characters
```

After all versions, include:

- **Adaptation notes**: Brief explanation of key choices made during adaptation (e.g., "Replaced the NFL analogy with a soccer reference for Chinese platforms")
- **Suggestions**: Optional improvements the user could make per platform

## Important Notes

- **Preserve the author's voice.** Each platform version should sound like the same person adapted their message, not like five different ghostwriters.
- **Privacy and sensitivity.** If the source contains internal data, company names, or sensitive information, flag this before generating external-facing versions (LinkedIn, Twitter, WeChat, Zhihu). The Slack version can retain internal context.
- **Cultural adaptation ≠ mistranslation.** When adapting between English and Chinese, convey meaning and spirit, not word-for-word translation. Adapt examples and metaphors for the target audience.
- **No paid API dependencies.** This skill operates entirely through prompt-based generation — no external API calls required.
