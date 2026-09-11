---
name: competitor-analysis
version: "3.0.0"
description: "Analyzes competitor SEO and GEO strategies—their ranking keywords, content, backlinks, and AI citations—to reveal opportunities to outperform them. Triggered by requests like \"analyze competitors,\" \"competitive SEO,\" \"who ranks for,\" \"what are my competitors doing,\" or \"why do they rank higher."
license: Apache-2.0
compatibility: "Claude Code ≥1.0, skills.sh marketplace, ClawHub marketplace, Vercel Labs skills ecosystem. No system packages required. Optional: MCP network access for SEO tool integrations."
metadata:
  openclaw:
    requires:
      env: []
      bins: []
    primaryEnv: AHREFS_API_KEY
  author: aaron-he-zhu
  version: "3.0.0"
  geo-relevance: "medium"
  tags:
    - seo
    - geo
    - competitor analysis
    - competitive intelligence
    - benchmarking
    - market analysis
    - ranking analysis
    - competitive-seo
    - competitor-keywords
    - competitor-backlinks
    - market-analysis
    - battlecard
    - serp-competition
    - domain-comparison
    - content-benchmarking
    - gap-analysis
  triggers:
    - "analyze competitors"
    - "competitor SEO"
    - "who ranks for"
    - "competitive analysis"
    - "what are my competitors doing"
    - "competitor keywords"
    - "competitor backlinks"
    - "what are they doing differently"
    - "why do they rank higher"
    - "spy on competitor SEO"
---

# Competitor Analysis


> **[SEO & GEO Skills Library](https://skills.sh/aaron-he-zhu/seo-geo-claude-skills)** · 20 skills for SEO + GEO · Install all: `npx skills add aaron-he-zhu/seo-geo-claude-skills`

<details>
<summary>Browse all 20 skills</summary>

**Research** · [keyword-research](../keyword-research/) · **competitor-analysis** · [serp-analysis](../serp-analysis/) · [content-gap-analysis](../content-gap-analysis/)

**Build** · [seo-content-writer](../../build/seo-content-writer/) · [geo-content-optimizer](../../build/geo-content-optimizer/) · [meta-tags-optimizer](../../build/meta-tags-optimizer/) · [schema-markup-generator](../../build/schema-markup-generator/)

**Optimize** · [on-page-seo-auditor](../../optimize/on-page-seo-auditor/) · [technical-seo-checker](../../optimize/technical-seo-checker/) · [internal-linking-optimizer](../../optimize/internal-linking-optimizer/) · [content-refresher](../../optimize/content-refresher/)

**Monitor** · [rank-tracker](../../monitor/rank-tracker/) · [backlink-analyzer](../../monitor/backlink-analyzer/) · [performance-reporter](../../monitor/performance-reporter/) · [alert-manager](../../monitor/alert-manager/)

**Cross-cutting** · [content-quality-auditor](../../cross-cutting/content-quality-auditor/) · [domain-authority-auditor](../../cross-cutting/domain-authority-auditor/) · [entity-optimizer](../../cross-cutting/entity-optimizer/) · [memory-management](../../cross-cutting/memory-management/)

</details>

This skill provides comprehensive analysis of competitor SEO and GEO strategies, revealing what's working in your market and identifying opportunities to outperform the competition.

## When to Use This Skill

- Entering a new market or niche
- Planning content strategy based on competitor success
- Understanding why competitors rank higher
- Finding backlink and partnership opportunities
- Identifying content gaps competitors are missing
- Analyzing competitor AI citation strategies
- Benchmarking your SEO performance

## What This Skill Does

1. **Keyword Analysis**: Identifies keywords competitors rank for
2. **Content Audit**: Analyzes competitor content strategies and formats
3. **Backlink Profiling**: Reviews competitor link-building approaches
4. **Technical Assessment**: Evaluates competitor site health
5. **GEO Analysis**: Identifies how competitors appear in AI responses
6. **Gap Identification**: Finds opportunities competitors miss
7. **Strategy Extraction**: Reveals actionable insights from competitor success

## How to Use

### Basic Competitor Analysis

```
Analyze SEO strategy for [competitor URL]
```

```
Compare my site [URL] against [competitor 1], [competitor 2], [competitor 3]
```

### Specific Analysis

```
What content is driving the most traffic for [competitor]?
```

```
Analyze why [competitor] ranks #1 for [keyword]
```

### GEO-Focused Analysis

```
How is [competitor] getting cited in AI responses? What can I learn?
```

## Data Sources

> See [CONNECTORS.md](../../CONNECTORS.md) for tool category placeholders.

**With ~~SEO tool + ~~analytics + ~~AI monitor connected:**
Automatically pull competitor keyword rankings, backlink profiles, top performing content, domain authority metrics from ~~SEO tool. Compare against your site's metrics from ~~analytics and ~~search console. Check AI citation patterns for both your site and competitors using ~~AI monitor.

**With manual data only:**
Ask the user to provide:
1. Competitor URLs to analyze (2-5 recommended)
2. Your own site URL and current metrics (traffic, rankings if known)
3. Industry or niche context
4. Specific aspects to focus on (keywords, content, backlinks, etc.)
5. Any known competitor strengths or weaknesses

Proceed with the full analysis using provided data. Note in the output which metrics are from automated collection vs. user-provided data.

## Instructions

When a user requests competitor analysis:

1. **Identify Competitors**

   If not specified, help identify competitors:
   
   ```markdown
   ### Competitor Identification Framework
   
   **Direct Competitors** (same product/service)
   - Search "[your main keyword]" and note top 5 organic results
   - Check who's advertising for your keywords
   - Ask: Who do customers compare you to?
   
   **Indirect Competitors** (different solution, same problem)
   - Search problem-focused keywords
   - Look at alternative solutions
   
   **Content Competitors** (compete for same keywords)
   - May not sell same product
   - Rank for your target keywords
   - Include media sites, blogs, aggregators
   ```

2. **Gather Competitor Data**

   Collect for each competitor: URL, domain age, estimated traffic, domain authority, business model, target audience, and key offerings.

3. **Analyze Keyword Rankings**

   Document total keywords ranking, top 10/top 3 counts, top performing keywords (with position, volume, traffic, page URL), keyword distribution by intent, and keyword gaps.

4. **Audit Content Strategy**

   Analyze content volume by type, top performing content, content patterns (word count, frequency, formats), content themes, and success factors.

5. **Analyze Backlink Profile**

   Review total backlinks, referring domains, link quality distribution, top linking domains, link acquisition patterns, and linkable assets.

6. **Technical SEO Assessment**

   Evaluate Core Web Vitals, mobile-friendliness, site architecture, internal linking quality, URL structure, and technical strengths/weaknesses.

7. **GEO/AI Citation Analysis**

   Test competitor content in AI systems: document which queries cite them, GEO strategies observed (definitions, statistics, Q&A, authority signals), and GEO opportunities they are missing.

8. **Synthesize Competitive Intelligence**

   Produce a final report with: Executive Summary, Competitive Landscape comparison table, CITE domain authority comparison, Strengths to Learn From, Weaknesses to Exploit, Keyword Opportunities, Content Strategy Recommendations, and Action Plan (Immediate / Short-term / Long-term).

   > **Reference**: See [references/analysis-templates.md](./references/analysis-templates.md) for detailed templates for each step.

## Validation Checkpoints

### Input Validation
- [ ] Competitor URLs verified as relevant to your niche
- [ ] Analysis scope defined (comprehensive or specific focus area)
- [ ] Your own site metrics available for comparison
- [ ] Minimum 2-3 competitors identified for meaningful patterns

### Output Validation
- [ ] Every recommendation cites specific data points (not generic advice)
- [ ] Competitor strengths backed by measurable evidence (metrics, rankings)
- [ ] Opportunities based on identifiable gaps, not assumptions
- [ ] Action plan items are specific and actionable (not vague strategies)
- [ ] Source of each data point clearly stated (~~SEO tool data, ~~analytics data, ~~AI monitor data, user-provided, or estimated)

## Example

> **Reference**: See [references/example-report.md](./references/example-report.md) for a complete example analyzing HubSpot's marketing keyword dominance.

## Advanced Analysis Types

### Content Gap Analysis

```
Show me content [competitor] has that I don't, sorted by traffic potential
```

### Link Intersection

```
Find sites linking to [competitor 1] AND [competitor 2] but not me
```

### SERP Feature Analysis

```
What SERP features do competitors win? (Featured snippets, PAA, etc.)
```

### Historical Tracking

```
How has [competitor]'s SEO strategy evolved over the past year?
```

## Tips for Success

1. **Analyze 3-5 competitors** for comprehensive view
2. **Include indirect competitors** - they often have innovative approaches
3. **Look beyond rankings** - analyze content quality, user experience
4. **Study their failures** - avoid their mistakes
5. **Monitor regularly** - competitor strategies evolve
6. **Focus on actionable insights** - what can you actually implement?


## Reference Materials

- [Analysis Templates](./references/analysis-templates.md) — Detailed templates for each analysis step (profile, keywords, content, backlinks, technical, GEO, synthesis)
- [Battlecard Template](./references/battlecard-template.md) — Quick-reference competitive battlecard for sales and marketing teams
- [Positioning Frameworks](./references/positioning-frameworks.md) — Positioning maps, messaging matrices, narrative analysis, and differentiation frameworks
- [Example Report](./references/example-report.md) — Complete example analyzing HubSpot's marketing keyword dominance

## Related Skills

- [domain-authority-auditor](../../cross-cutting/domain-authority-auditor/) — Compare CITE domain authority scores across competitors for domain-level benchmarking
- [keyword-research](../keyword-research/) — Research keywords competitors rank for
- [content-gap-analysis](../content-gap-analysis/) — Find content opportunities
- [backlink-analyzer](../../monitor/backlink-analyzer/) — Deep-dive into backlinks
- [serp-analysis](../serp-analysis/) — Understand search result composition
- [memory-management](../../cross-cutting/memory-management/) — Store competitor data in project memory
- [entity-optimizer](../../cross-cutting/entity-optimizer/) — Compare entity presence against competitors

