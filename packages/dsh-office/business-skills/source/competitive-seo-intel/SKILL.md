---
name: competitive-seo-intel
version: "3.0.0"
description: "深入分析竞争对手的SEO与GEO策略，涵盖关键词排名、内容打法、外链画像、技术SEO评估及AI引用模式，识别超越对手的市场机会，并提供竞品分析模板、战斗卡片等参考。当用户询问“分析竞品SEO”、“竞争对手为什么排名更高”、“竞品关键词和外链分析”或“内容策略对比”时触发。如需专项分析，可使用content-gap-analysis进行内容差距分析，或使用backlink-analyzer进行外链深度分析。"
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

<!-- Localized from: competitor-analysis -->

# 竞品分析


> **[SEO & GEO 技能库](https://skills.sh/aaron-he-zhu/seo-geo-claude-skills)** · 20 个 SEO + GEO 技能 · 一键安装全部：`npx skills add aaron-he-zhu/seo-geo-claude-skills`

<details>
<summary>浏览全部 20 个技能</summary>

**调研** · [keyword-research](../keyword-research/) · **competitor-analysis** · [serp-analysis](../serp-analysis/) · [content-gap-analysis](../content-gap-analysis/)

**构建** · [seo-content-writer](../../build/seo-content-writer/) · [geo-content-optimizer](../../build/geo-content-optimizer/) · [meta-tags-optimizer](../../build/meta-tags-optimizer/) · [schema-markup-generator](../../build/schema-markup-generator/)

**优化** · [on-page-seo-auditor](../../optimize/on-page-seo-auditor/) · [technical-seo-checker](../../optimize/technical-seo-checker/) · [internal-linking-optimizer](../../optimize/internal-linking-optimizer/) · [content-refresher](../../optimize/content-refresher/)

**监控** · [rank-tracker](../../monitor/rank-tracker/) · [backlink-analyzer](../../monitor/backlink-analyzer/) · [performance-reporter](../../monitor/performance-reporter/) · [alert-manager](../../monitor/alert-manager/)

**综合** · [content-quality-auditor](../../cross-cutting/content-quality-auditor/) · [domain-authority-auditor](../../cross-cutting/domain-authority-auditor/) · [entity-optimizer](../../cross-cutting/entity-optimizer/) · [memory-management](../../cross-cutting/memory-management/)

</details>

本技能提供对竞争对手 SEO 和 GEO 策略的全面分析，揭示你所在市场中哪些打法有效，并识别出超越竞争对手的机会。

## 适用场景

- 进入新市场或新细分领域
- 根据竞品的成功经验制定内容策略
- 理解竞争对手为何排名更高
- 发现外链建设和合作机会
- 识别竞争对手忽略的内容空白
- 分析竞品的 AI 引用策略
- 对标自身 SEO 表现

## 功能说明

1. **关键词分析**：识别竞争对手排名的关键词
2. **内容审计**：分析竞品的内容策略和内容形式
3. **外链画像**：评估竞品的外链建设方式
4. **技术评估**：评估竞品网站的技术健康度
5. **GEO 分析**：识别竞品在 AI 回答中的出现方式
6. **差距识别**：发现竞品遗漏的机会
7. **策略提炼**：从竞品的成功中提取可执行的洞察

## 使用方法

### 基础竞品分析

```
Analyze SEO strategy for [competitor URL]
```

```
Compare my site [URL] against [competitor 1], [competitor 2], [competitor 3]
```

### 针对性分析

```
What content is driving the most traffic for [competitor]?
```

```
Analyze why [competitor] ranks #1 for [keyword]
```

### GEO 导向分析

```
How is [competitor] getting cited in AI responses? What can I learn?
```

## 数据来源

> 请参阅 [CONNECTORS.md](../../CONNECTORS.md) 了解工具类型的占位符说明。

**已接入 ~~SEO 工具 + ~~数据分析 + ~~AI 监测时：**
自动从 ~~SEO 工具中拉取竞品的关键词排名、外链画像、高流量内容、域名权威度指标。从 ~~数据分析平台和 ~~搜索控制台获取自身网站指标用于对比。通过 ~~AI 监测工具检查你和竞品在 AI 引用中的表现。

**仅使用手动数据时：**
请用户提供以下信息：
1. 待分析的竞品网址（建议 2-5 个）
2. 自身网站网址及已知指标（流量、排名等）
3. 所属行业或细分领域
4. 需要重点分析的方面（关键词、内容、外链等）
5. 已知的竞品优势或劣势

根据提供的数据执行完整分析。在输出中标注各指标的来源——是来自自动采集还是用户提供。

## 执行步骤

当用户发起竞品分析请求时：

1. **识别竞争对手**

   如未指定竞品，帮助用户识别：
   
   ```markdown
   ### 竞品识别框架
   
   **直接竞争对手**（相同产品/服务）
   - 搜索"[你的核心关键词]"，记录自然搜索结果前 5 名
   - 查看谁在为你的关键词投放广告
   - 问自己：客户通常拿你和谁做比较？
   
   **间接竞争对手**（不同方案，解决相同问题）
   - 搜索以问题为导向的关键词
   - 关注替代性解决方案
   
   **内容竞争对手**（争夺相同关键词）
   - 可能不售卖相同产品
   - 但在目标关键词上有排名
   - 包括媒体网站、博客、聚合平台
   ```

2. **收集竞品数据**

   为每个竞品收集：网址、域名年龄、预估流量、域名权威度、商业模式、目标受众及核心产品/服务。

3. **分析关键词排名**

   记录总排名关键词数、Top 10/Top 3 数量、排名最好的关键词（含排名位置、搜索量、预估流量、对应页面 URL）、按搜索意图分类的关键词分布，以及关键词差距。

4. **审计内容策略**

   分析各类型内容数量、高流量内容、内容规律（字数、发布频率、内容形式）、内容主题及成功要素。

5. **分析外链画像**

   评估外链总数、引荐域名数、链接质量分布、主要链接来源域名、链接获取模式及有吸引力的可链接资源。

6. **技术 SEO 评估**

   评估 Core Web Vitals、移动端适配、网站架构、内链质量、URL 结构，以及技术方面的优势和劣势。

7. **GEO/AI 引用分析**

   在 AI 系统中测试竞品内容：记录哪些查询引用了竞品、观察到的 GEO 策略（定义、数据统计、问答格式、权威信号），以及竞品缺失的 GEO 优化机会。

8. **综合竞争情报**

   产出最终报告，包含：执行摘要、竞争格局对比表、CITE 域名权威度对比、值得学习的优势、可利用的劣势、关键词机会、内容策略建议，以及行动计划（即时/短期/长期）。

   > **参考资料**：详见 [references/analysis-templates.md](./references/analysis-templates.md)，其中包含各步骤的详细模板。

## 验证检查点

### 输入验证
- [ ] 已确认竞品网址与你所在细分领域相关
- [ ] 已明确分析范围（全面分析还是聚焦特定领域）
- [ ] 已准备好自身网站指标用于对比
- [ ] 至少识别了 2-3 个竞品，以发现有意义的规律

### 输出验证
- [ ] 每条建议都引用了具体数据点（非泛泛之谈）
- [ ] 竞品优势有可量化的证据支撑（指标、排名）
- [ ] 机会基于可识别的差距，而非主观臆断
- [ ] 行动计划条目具体且可执行（非模糊的策略方向）
- [ ] 每个数据点的来源已明确标注（~~SEO 工具数据、~~数据分析数据、~~AI 监测数据、用户提供或预估）

## 示例

> **参考资料**：详见 [references/example-report.md](./references/example-report.md)，包含一个完整的 HubSpot 营销关键词优势分析示例。

## 进阶分析类型

### 内容差距分析

```
Show me content [competitor] has that I don't, sorted by traffic potential
```

### 链接交叉分析

```
Find sites linking to [competitor 1] AND [competitor 2] but not me
```

### SERP 功能分析

```
What SERP features do competitors win? (Featured snippets, PAA, etc.)
```

### 历史趋势追踪

```
How has [competitor]'s SEO strategy evolved over the past year?
```

## 成功秘诀

1. **分析 3-5 个竞品**以获得全面视角
2. **纳入间接竞品**——他们往往有创新的做法
3. **看排名更看内容**——同时分析内容质量和用户体验
4. **研究他们的失败**——避免重蹈覆辙
5. **定期监控**——竞品策略在不断演变
6. **聚焦可执行洞察**——你实际能落地哪些？


## 参考资料

- [分析模板](./references/analysis-templates.md) — 各分析步骤的详细模板（竞品档案、关键词、内容、外链、技术、GEO、综合报告）
- [战斗卡片模板](./references/battlecard-template.md) — 面向销售和营销团队的速查竞争情报卡片
- [市场定位框架](./references/positioning-frameworks.md) — 定位地图、信息矩阵、叙事分析与差异化框架
- [示例报告](./references/example-report.md) — HubSpot 营销关键词优势的完整分析案例

## 相关技能

- [domain-authority-auditor](../../cross-cutting/domain-authority-auditor/) — 跨竞品对比 CITE 域名权威度评分，用于域名级别的对标
- [keyword-research](../keyword-research/) — 调研竞品排名的关键词
- [content-gap-analysis](../content-gap-analysis/) — 发现内容机会
- [backlink-analyzer](../../monitor/backlink-analyzer/) — 深入分析外链
- [serp-analysis](../serp-analysis/) — 理解搜索结果页构成
- [memory-management](../../cross-cutting/memory-management/) — 将竞品数据存储到项目记忆中
- [entity-optimizer](../../cross-cutting/entity-optimizer/) — 与竞品对比实体存在度

</output>
