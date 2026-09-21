---
name: seo-copywriting-guide
version: "3.0.0"
description: "通过 12 步结构化工作流生成搜索引擎优化内容，产出一篇包含完整草稿、备选标题、Meta描述、FAQ结构化内容及CORE-EEAT自评清单的SEO文章。当用户提出“写一篇SEO文章”、“帮我写博客”、“创建针对某关键词的内容”、“撰写产品描述”、“写落地页文案”或“SEO文案写作”等请求时触发。"
license: Apache-2.0
compatibility: "Claude Code ≥1.0, skills.sh marketplace, ClawHub marketplace, Vercel Labs skills ecosystem. No system packages required. Optional: MCP network access for SEO tool integrations."
metadata:
  author: aaron-he-zhu
  version: "3.0.0"
  geo-relevance: "medium"
  tags:
    - seo
    - content-writing
    - blog-writing
    - seo-copywriting
    - content-creation
    - featured-snippet-optimization
    - how-to-guide
  triggers:
    - "write SEO content"
    - "create blog post"
    - "write an article"
    - "content writing"
    - "draft optimized content"
    - "write for SEO"
    - "blog writing"
    - "write me an article"
    - "create a blog post about"
    - "help me write SEO content"
    - "draft content for"
---

<!-- Localized from: seo-content-writer -->

# SEO 内容写作指南

> **[SEO & GEO 技能库](https://skills.sh/aaron-he-zhu/seo-geo-claude-skills)** · 20 个 SEO + GEO 技能 · 一键安装：`npx skills add aaron-he-zhu/seo-geo-claude-skills`

<details>
<summary>浏览全部 20 个技能</summary>

**调研** · [keyword-research](../../research/keyword-research/) · [competitor-analysis](../../research/competitor-analysis/) · [serp-analysis](../../research/serp-analysis/) · [content-gap-analysis](../../research/content-gap-analysis/)

**构建** · **seo-content-writer** · [geo-content-optimizer](../geo-content-optimizer/) · [meta-tags-optimizer](../meta-tags-optimizer/) · [schema-markup-generator](../schema-markup-generator/)

**优化** · [on-page-seo-auditor](../../optimize/on-page-seo-auditor/) · [technical-seo-checker](../../optimize/technical-seo-checker/) · [internal-linking-optimizer](../../optimize/internal-linking-optimizer/) · [content-refresher](../../optimize/content-refresher/)

**监控** · [rank-tracker](../../monitor/rank-tracker/) · [backlink-analyzer](../../monitor/backlink-analyzer/) · [performance-reporter](../../monitor/performance-reporter/) · [alert-manager](../../monitor/alert-manager/)

**综合** · [content-quality-auditor](../../cross-cutting/content-quality-auditor/) · [domain-authority-auditor](../../cross-cutting/domain-authority-auditor/) · [entity-optimizer](../../cross-cutting/entity-optimizer/) · [memory-management](../../cross-cutting/memory-management/)

</details>

本技能用于创建既能获得良好搜索排名、又能为读者提供真实价值的 SEO 优化内容。它运用经过验证的 SEO 文案技巧、合理的关键词整合策略以及最佳内容结构。

## 适用场景

- 撰写针对特定关键词的博客文章
- 创建针对搜索优化的落地页
- 开发主题集群的支柱内容
- 撰写电商产品描述
- 创建本地 SEO 服务页面
- 制作操作指南和教程
- 撰写对比评测文章

## 功能说明

1. **关键词整合**：自然融入目标关键词和相关关键词
2. **结构优化**：创建易于浏览、组织良好的内容
3. **标题与 Meta 描述创建**：撰写引人注目、高点击率的标题
4. **标题层级优化**：构建合理的 H1-H6 标题层级
5. **内链建设**：建议相关的内部链接机会
6. **可读性提升**：确保内容易于理解且富有吸引力
7. **精选摘要优化**：针对搜索结果特色片段进行格式优化

## 使用方法

### 基础内容创建

```
Write an SEO-optimized article about [topic] targeting the keyword [keyword]
```

```
Create a blog post for [topic] with these keywords: [keyword list]
```

### 带特定要求

```
Write a 2,000-word guide about [topic] targeting [keyword],
include FAQ section for featured snippets
```

### 内容简报

```
Here's my content brief: [brief]. Write SEO-optimized content following this outline.
```

## 数据来源

> 参阅 [CONNECTORS.md](../../CONNECTORS.md) 了解工具类别占位符。

**已连接 SEO 工具 + Search Console 时：**
自动拉取关键词指标（搜索量、难度、CPC）、竞争对手内容分析（排名靠前的页面、内容长度、常见主题）、SERP 特性（精选摘要、相关问题）以及关键词机会（相关关键词、问题型查询）。

**仅有手动数据时：**
请用户提供：
1. 目标主关键词和 3-5 个次要关键词
2. 目标受众和搜索意图（信息型/商业型/交易型）
3. 目标字数和期望语调
4. 任何竞争对手 URL 或参考内容示例

使用用户提供的数据执行完整工作流。在输出中注明哪些指标来自自动化采集、哪些为用户提供的数据。

## 操作指南

当用户请求 SEO 内容时：

1. **收集需求**

   确认或询问以下信息：
   
   ```markdown
   ### Content Requirements
   
   **Primary Keyword**: [main keyword]
   **Secondary Keywords**: [2-5 related keywords]
   **Target Word Count**: [length]
   **Content Type**: [blog/guide/landing page/etc.]
   **Target Audience**: [who is this for]
   **Search Intent**: [informational/commercial/transactional]
   **Tone**: [professional/casual/technical/friendly]
   **CTA Goal**: [what action should readers take]
   **Competitor URLs**: [top ranking content to beat]
   ```

2. **加载 CORE-EEAT 质量约束**

   写作前，从 [CORE-EEAT 基准](#)加载内容质量标准：

   ```markdown
   ### CORE-EEAT Pre-Write Checklist

   **Content Type**: [identified from requirements above]
   **Loaded Constraints** (high-weight items for this content type):

   Apply these standards while writing:

   | ID | Standard | How to Apply |
   |----|----------|-------------|
   | C01 | Intent Alignment | Title promise must match content delivery |
   | C02 | Direct Answer | Core answer in first 150 words |
   | C06 | Audience Targeting | State "this article is for..." |
   | C10 | Semantic Closure | Conclusion answers opening question + next steps |
   | O01 | Heading Hierarchy | H1→H2→H3, no level skipping |
   | O02 | Summary Box | Include TL;DR or Key Takeaways |
   | O06 | Section Chunking | Each section single topic; paragraphs 3–5 sentences |
   | O09 | Information Density | No filler; consistent terminology |
   | R01 | Data Precision | ≥5 precise numbers with units |
   | R02 | Citation Density | ≥1 external citation per 500 words |
   | R04 | Evidence-Claim Mapping | Every claim backed by evidence |
   | R07 | Entity Precision | Full names for people/orgs/products |
   | C03 | Query Coverage | Cover ≥3 query variants (synonyms, long-tail) |
   | O08 | Anchor Navigation | Table of contents with jump links |
   | O10 | Multimedia Structure | Images/videos have captions and carry information |
   | E07 | Practical Tools | Include downloadable templates, checklists, or calculators |

   _These 16 items apply across all content types. For content-type-specific dimension weights, see the Content-Type Weight Table in [core-eeat-benchmark.md](#)._
   _Full 80-item benchmark: [references/core-eeat-benchmark.md](#)_
   _For complete content quality audit: use [content-quality-auditor](../../cross-cutting/content-quality-auditor/)_
   ```

3. **调研与规划**

   写作前：
   
   ```markdown
   ### Content Research
   
   **SERP Analysis**:
   - Top results format: [what's ranking]
   - Average word count: [X] words
   - Common sections: [list]
   - SERP features: [snippets, PAA, etc.]
   
   **Keyword Map**:
   - Primary: [keyword] - use in title, H1, intro, conclusion
   - Secondary: [keywords] - use in H2s, body paragraphs
   - LSI/Related: [terms] - sprinkle naturally throughout
   - Questions: [PAA questions] - use as H2/H3s or FAQ
   
   **Content Angle**:
   [What unique perspective or value will this content provide?]
   ```

4. **创建优化标题**

   ```markdown
   ### Title Optimization
   
   **Requirements**:
   - Include primary keyword (preferably at start)
   - Under 60 characters for full SERP display
   - Compelling and click-worthy
   - Match search intent
   
   **Title Options**:
   
   1. [Title option 1] ([X] chars)
      - Keyword position: [front/middle]
      - Power words: [list]
   
   2. [Title option 2] ([X] chars)
      - Keyword position: [front/middle]
      - Power words: [list]
   
   **Recommended**: [Best option with reasoning]
   ```

5. **撰写 Meta 描述**

   ```markdown
   ### Meta Description
   
   **Requirements**:
   - 150-160 characters
   - Include primary keyword naturally
   - Include call-to-action
   - Compelling and specific
   
   **Meta Description**:
   "[Description text]" ([X] characters)
   
   **Elements included**:
   - ✅ Primary keyword
   - ✅ Value proposition
   - ✅ CTA or curiosity hook
   ```

6. **构建内容结构并撰写**

   结构：H1（主关键词，每页仅一个）> 引言（100-150 字，钩子 + 承诺 + 前 100 字内包含关键词）> H2 章节（次要关键词/问题）> H3 子话题 > FAQ 部分 > 结论（总结 + 关键词 + CTA）。

7. **应用页面 SEO 最佳实践**

   遵循页面 SEO 检查清单（关键词布局、内容质量、可读性、技术元素）和内容写作模板（含关键词的 H1、钩子、H2/H3 章节、FAQ、含 CTA 的结论）。

   > **参考资料**：完整的页面 SEO 检查清单、内容写作模板和精选摘要优化模式，请参阅 [references/seo-writing-checklist.md](./references/seo-writing-checklist.md)。

   写作时的关键要求：
   - 主关键词出现在标题、H1、前 100 字、至少一个 H2 和结论中
   - 段落 3-5 句；句子长度多样化；使用项目符号和加粗关键短语
   - 内链（2-5 个）和外部权威链接（2-3 个）
   - FAQ 部分，答案控制在 40-60 字，以获取精选摘要机会
   - 在适用情况下针对定义型、列表型、表格型和操作指南型摘要进行优化

8. **添加内外部链接**

   ```markdown
   ### Link Recommendations
   
   **Internal Links** (include 2-5):
   1. "[anchor text]" → [/your-page-url] (relevant because: [reason])
   2. "[anchor text]" → [/your-page-url] (relevant because: [reason])
   
   **External Links** (include 2-3 authoritative sources):
   1. "[anchor text]" → [authoritative-source.com] (supports: [claim])
   2. "[anchor text]" → [authoritative-source.com] (supports: [claim])
   ```

9. **最终 SEO 审查与 CORE-EEAT 自检**

    根据 10 项 SEO 因素（标题、Meta 描述、H1、关键词布局、H2、内链、外链、FAQ、可读性、字数）对内容进行评分，得出满分 10 分的综合 SEO 得分。

    然后验证 16 项 CORE-EEAT 预写约束（C01、C02、C06、C10、O01、O02、O06、O09、R01、R02、R04、R07、C03、O08、O10、E07），标注通过/警告/未通过状态。列出需要关注的项目。

    _如需完整的 80 项审计，请使用 [content-quality-auditor](../../cross-cutting/content-quality-auditor/)_

## 验证检查点

### 输入验证
- [ ] 已确认主关键词且匹配搜索意图
- [ ] 已指定目标字数（实质性内容最少 800 字）
- [ ] 已明确定义内容类型和目标受众
- [ ] 已审查竞争对手 URL 或已确定目标 SERP 特性

### 输出验证
- [ ] 主关键词密度在 1-2% 范围内（注意：关键词密度是参考指标，非硬性规则。现代搜索引擎更重视语义相关性和自然语言，而非精确的密度目标。应专注于使用语义变体全面覆盖主题，而不是追求特定百分比。）
- [ ] 大纲中所有章节均已完整覆盖
- [ ] 已包含内链（2-5 个相关链接）
- [ ] FAQ 部分已包含至少 3 个问题
- [ ] 可读性评分适合目标受众
- [ ] 每个数据点的来源已明确标注（SEO 工具数据、用户提供或估算）

## 示例

**用户**："写一篇关于'邮件营销最佳实践'的 SEO 优化文章，面向小型企业"

> **参考资料**：完整的示例输出（包含 Meta 描述、H1/H2/H3 层级、带引用的统计数据、对比表格、FAQ 部分和含 CTA 的结论），请参阅 [references/seo-writing-checklist.md](./references/seo-writing-checklist.md)。

示例输出展示了：H1 和前 100 字中包含关键词、带来源的统计数据（DMA、Emarsys）、对比表格、项目符号列表、专业提示、40-60 字答案的 FAQ 部分，以及结论中的明确 CTA。

## 内容类型模板

### 操作指南

```
Write a how-to guide for [task] targeting [keyword]
```

### 对比文章

```
Write a comparison article: [Option A] vs [Option B] for [keyword]
```

### 清单文章

```
Write a list post: "X Best [Items] for [Audience/Purpose]" targeting [keyword]
```

### 终极指南

```
Write an ultimate guide about [topic] (3,000+ words) targeting [keyword]
```

## 成功要诀

1. **匹配搜索意图** - 信息型查询需要指南，而非销售页面
2. **前置核心价值** - 将关键信息放在前面，方便读者阅读和搜索摘要抓取
3. **善用数据和案例** - 具体的内容永远胜过笼统的描述
4. **以人为本** - SEO 优化应当自然融入，不影响阅读体验
5. **加入视觉元素** - 用图片、表格、列表打破文本的单调感
6. **定期更新** - 新鲜的内容能向搜索引擎传递积极信号

## 参考资料

- [标题公式](./references/title-formulas.md) - 经过验证的标题公式、强力词汇、点击率优化模式
- [内容结构模板](./references/content-structure-templates.md) - 博客文章、对比文章、清单文章、操作指南、支柱页面的模板

## 相关技能

- [keyword-research](../../research/keyword-research/) — 寻找目标关键词
- [geo-content-optimizer](../geo-content-optimizer/) — 针对 AI 引用进行优化
- [meta-tags-optimizer](../meta-tags-optimizer/) — 创建引人注目的 Meta 标签
- [on-page-seo-auditor](../../optimize/on-page-seo-auditor/) — 审计页面 SEO 元素
- [content-quality-auditor](../../cross-cutting/content-quality-auditor/) — 完整的 80 项 CORE-EEAT 审计

</output>
