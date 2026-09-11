---
name: investor-pitch-planner
description: "Generate a structured fundraising pitch deck outline covering Problem, Solution, Market, Business Model, Team, and The Ask, with data visualization suggestions. Trigger when users mention pitch decks, fundraising, investor presentations, or ask for help writing a deck or preparing to raise funds."
license: MIT
---

# Investor Pitch Planner

**One-line request → Complete fundraising pitch deck outline**: Through a structured SOP workflow, transform startup project information into a fundraising pitch deck outline covering six core modules — Problem → Solution → Market → Business Model → Team → The Ask — with data visualization recommendations for each module.

## Quick Start

Simply provide a basic project description, and the Agent will automatically generate a fundraising pitch deck outline following this workflow:

```
User: We built a smart financial SaaS for SMBs and want to raise a Pre-A round
Agent: [Outputs a complete pitch deck outline following the SOP workflow]
```

## SOP Workflow

### Phase 1: Project Information Gathering

**Objective**: Extract core information needed to build the pitch deck outline from the user's description.

**Steps**:

1. **Parse the project description**: Identify the industry, target audience, product form, and development stage
2. **Ask clarifying questions** (up to 5 key questions):
   - What core pain point does the project solve? How do target users currently cope with this problem?
   - What stage is the product at? (Concept / MVP ready / Paying customers)
   - What key business metrics can you share? (User count, revenue, growth rate, retention rate, etc.)
   - What are the core team members' backgrounds? (Especially industry-relevant experience)
   - What is the target fundraising amount and intended use of funds?
3. **If the user asks to skip clarification**, proceed with reasonable assumptions and flag them in the "Information To Be Provided" section of the outline

**Output**: Project information summary (under 200 words)

---

### Phase 2: Problem Definition (Problem)

**Objective**: Clearly define the pain point faced by target users, helping investors feel the problem's reality and urgency.

**Steps**:

1. **Pain point description**:
   - Summarize the core pain point in one sentence
   - Describe how target users currently solve the problem and the shortcomings of existing approaches
   - Quantify the pain point's impact (time cost, financial loss, efficiency loss, etc.)

2. **Suggested outline content**:
   - Core pain point statement (1 sentence)
   - Current state description (how users cope today)
   - Scale and impact of the pain point

3. **Data visualization recommendations**:

   | Data Type | Presentation Format | Notes |
   |-----------|-------------------|-------|
   | Scale of affected users | Large-font number + brief annotation | e.g., "32 million SMBs face this problem" |
   | Shortcomings of existing solutions | Comparison table (Current vs. Ideal) | Highlight the gap |
   | Losses caused by the pain point | Single key figure | e.g., "Each company wastes $XX per year on average" |

**Output**: Problem module outline + data visualization recommendations

---

### Phase 3: Solution (Solution)

**Objective**: Show how the product solves the problem defined in Phase 2, highlighting differentiated value.

**Steps**:

1. **Solution description**:
   - Explain what the product is and what it does in one sentence
   - List 3 core features/value propositions (no more than 3 — stay focused)
   - Explain differentiation from existing solutions

2. **Suggested outline content**:
   - One-line product positioning
   - Core value propositions (3 points)
   - Product demo/screenshot talking points
   - Before-and-after user comparison

3. **Data visualization recommendations**:

   | Data Type | Presentation Format | Notes |
   |-----------|-------------------|-------|
   | Product impact comparison | Before / After comparison | e.g., "Processing time reduced from 3 days to 2 hours" |
   | Core feature highlights | Icon + keyword + one-line description | 3 features displayed side by side |
   | User feedback/case studies | Quote cards (avatar + quote + role) | 1–2 real user testimonials |

**Output**: Solution module outline + data visualization recommendations

---

### Phase 4: Market Analysis (Market)

**Objective**: Demonstrate that the market is large enough and growing fast enough to warrant investor attention.

**Steps**:

1. **Market size estimation**:
   - TAM (Total Addressable Market): How large is the entire market
   - SAM (Serviceable Available Market): The market you can reach
   - SOM (Serviceable Obtainable Market): The market you can capture in the near term
   - Cite data sources (industry reports, public data; if self-estimated, state the assumptions)

2. **Market trends**:
   - 2–3 key trends driving market growth
   - Opportunity windows created by policy, technology, or behavioral shifts

3. **Competitive landscape**:
   - Key competitors (2–4) and their positioning
   - Your differentiated positioning

4. **Suggested outline content**:
   - TAM/SAM/SOM figures
   - Market growth trends
   - Competitive positioning

5. **Data visualization recommendations**:

   | Data Type | Presentation Format | Notes |
   |-----------|-------------------|-------|
   | TAM/SAM/SOM | Concentric circles or funnel chart | Large to small, each layer labeled with amount and calculation basis |
   | Market growth rate | Line chart or CAGR figure | e.g., "25% CAGR" |
   | Competitive landscape | 2×2 matrix | Choose two key dimensions to position yourself against competitors |
   | Market trends | Icon-labeled trend list | 2–3 trends, each with a one-liner |

**Output**: Market module outline + data visualization recommendations

---

### Phase 5: Business Model (Business Model)

**Objective**: Explain how the business makes money and grows, giving investors confidence in the commercial viability.

**Steps**:

1. **Revenue model**:
   - Primary revenue streams (subscriptions / transaction fees / advertising / value-added services, etc.)
   - Pricing strategy and average revenue per user/contract
   - If multiple revenue streams exist, state priorities

2. **Key metrics** (select based on project stage):
   - Early stage: User growth rate, retention rate, customer acquisition cost (CAC)
   - Growth stage: Monthly Recurring Revenue (MRR), Customer Lifetime Value (LTV), LTV/CAC ratio
   - Mature stage: Gross margin, net margin, unit economics

3. **Growth flywheel**:
   - Describe the core growth engine (product-led / sales-led / channel-led)
   - Potential for network effects or economies of scale

4. **Suggested outline content**:
   - Revenue model overview
   - Key business metrics
   - Growth strategy

5. **Data visualization recommendations**:

   | Data Type | Presentation Format | Notes |
   |-----------|-------------------|-------|
   | Revenue model | Flowchart or revenue structure diagram | Clearly show where the money comes from |
   | Key metrics | KPI dashboard style | 3–5 core numbers in large font |
   | Growth trends | Bar chart (monthly/quarterly) | Show revenue or user growth curves |
   | Unit economics | Simplified formula diagram | e.g., "LTV $X > CAC $Y, payback period Z months" |

**Output**: Business model module outline + data visualization recommendations

---

### Phase 6: Team (Team)

**Objective**: Show that the team has the capability to execute the plan, boosting investor confidence.

**Steps**:

1. **Core team**:
   - List 3–5 core members
   - For each: Name/title, role, key background (one sentence)
   - Highlight experience relevant to the project (industry expertise, technical skills, past successes)

2. **Team strengths**:
   - Complementary skills (technical + business + industry connections)
   - Unique advantages (why this team is the right one to build this)

3. **Advisors/investor endorsements** (if applicable):
   - Notable advisors or early investors

4. **Suggested outline content**:
   - Core team profiles
   - Team highlights
   - Advisor/endorsement information

5. **Data visualization recommendations**:

   | Data Type | Presentation Format | Notes |
   |-----------|-------------------|-------|
   | Core team | Avatar + name + role + one-line background | 3–5 people displayed in a row |
   | Team experience | Key number badges | e.g., "50+ combined years of industry experience", "3 successful exits" |
   | Advisors/endorsements | Logo wall or quote cards | Well-known institutions or individuals |

**Output**: Team module outline + data visualization recommendations

---

### Phase 7: Fundraising Ask (The Ask)

**Objective**: Clearly tell investors how much money you need, what it will be used for, and what milestones it will achieve.

**Steps**:

1. **Fundraising details**:
   - Amount being raised this round
   - Round designation (Angel / Pre-A / A / B, etc.)
   - Equity offered (if applicable)

2. **Use of funds**:
   - Allocation by percentage (e.g., Product R&D 40%, Marketing 30%, Team expansion 20%, Operating reserve 10%)
   - Explain the specific purpose of each allocation

3. **Milestone roadmap**:
   - 3–5 key milestones for the 12–18 months following the raise
   - Each milestone includes: timeline, objective, measurable metric

4. **Suggested outline content**:
   - Fundraising amount and round
   - Fund allocation breakdown
   - 12–18 month milestones

5. **Data visualization recommendations**:

   | Data Type | Presentation Format | Notes |
   |-----------|-------------------|-------|
   | Use of funds | Pie chart or donut chart | Clearly show each allocation's percentage and amount |
   | Milestone roadmap | Timeline graphic | Horizontal timeline with key milestones and targets |
   | Target metrics | Current → Target comparison | e.g., "Users: 5,000 → 50,000" |

**Output**: Fundraising ask module outline + data visualization recommendations

---

### Phase 8: Outline Assembly & Output

**Objective**: Assemble outputs from the previous seven phases into a complete pitch deck outline document.

**Pitch Deck Outline Template**:

```markdown
# [Project Name] - Fundraising Pitch Deck Outline

> Round: [Fundraising Round] | Date: [Current Date]
> Status: Draft Outline

---

## 1. Problem

### Key Points
- Core pain point: [one sentence]
- Current state: [how users cope today]
- Pain point scale: [quantified impact]

### Data Visualization Recommendations
[Phase 2 data visualization table]

### Presentation Tips
- Suggested slides: 1–2
- Key visual elements: [specific recommendations]

---

## 2. Solution

### Key Points
- Product positioning: [one sentence]
- Core value propositions:
  1. [Value point 1]
  2. [Value point 2]
  3. [Value point 3]
- Differentiation: [how it differs from competitors]

### Data Visualization Recommendations
[Phase 3 data visualization table]

### Presentation Tips
- Suggested slides: 2–3 (including product screenshots/demo)
- Key visual elements: [specific recommendations]

---

## 3. Market

### Key Points
- TAM: [amount + calculation basis]
- SAM: [amount + calculation basis]
- SOM: [amount + calculation basis]
- Growth trends: [2–3 key trends]
- Competitive landscape: [key competitors + your positioning]

### Data Visualization Recommendations
[Phase 4 data visualization table]

### Presentation Tips
- Suggested slides: 2
- Key visual elements: [specific recommendations]

---

## 4. Business Model

### Key Points
- Revenue model: [how it makes money]
- Key metrics: [3–5 core KPIs]
- Growth strategy: [core growth engine]

### Data Visualization Recommendations
[Phase 5 data visualization table]

### Presentation Tips
- Suggested slides: 1–2
- Key visual elements: [specific recommendations]

---

## 5. Team

### Key Points
- Core members: [3–5 bios]
- Team highlights: [why this team]
- Advisors/endorsements: [if applicable]

### Data Visualization Recommendations
[Phase 6 data visualization table]

### Presentation Tips
- Suggested slides: 1
- Key visual elements: [specific recommendations]

---

## 6. The Ask

### Key Points
- Fundraising amount: [amount + round]
- Use of funds: [percentage allocation]
- Key milestones: [3–5 milestones]

### Data Visualization Recommendations
[Phase 7 data visualization table]

### Presentation Tips
- Suggested slides: 1–2
- Key visual elements: [specific recommendations]

---

## Appendix

### Information To Be Provided
- [ ] [Data or information the user still needs to supply]

### Overall Deck Recommendations
- Suggested total slides: 10–15
- Suggested presentation length: 10–15 minutes
- Style recommendation: [based on industry and round]
```

**Document output requirements**:
- All data visualization recommendations use Markdown tables
- Each module includes three sections: Key Points + Data Visualization Recommendations + Presentation Tips
- Use the actual current date
- Data sources must be cited (public data / industry report / internal company data / estimate)

---

## Workflow Control Rules

### Interaction Mode Selection

Choose a mode based on how detailed the user's input is:

| User Input | Mode | Behavior |
|------------|------|----------|
| Just one sentence (< 50 words) | **Guided mode** | Run Phase 1 questions, wait for answers before proceeding |
| Some detail (50–200 words) | **Semi-automatic mode** | Ask 2–3 key questions while starting to build the framework |
| Detailed project description (> 200 words) | **Fully automatic mode** | Start directly from Phase 2, skip information gathering |
| User says "just write it / don't ask" | **Express mode** | Output a complete outline based on reasonable assumptions |

### Quality Checklist

Before outputting the final pitch deck outline, verify each item:

- [ ] All six modules are complete (Problem, Solution, Market, Business Model, Team, The Ask)
- [ ] Every module includes data visualization recommendations
- [ ] Market size includes TAM/SAM/SOM breakdown
- [ ] Use of funds includes percentage allocation
- [ ] Milestones include measurable metrics
- [ ] Data sources are cited or flagged for the user to provide
- [ ] Total slides stay within the 10–15 slide recommendation
- [ ] Suggested slide counts per module are reasonable
- [ ] Information To Be Provided list is non-empty (there is always data the user needs to supply)
- [ ] No hardcoded data — all placeholders are marked with [brackets]

### Adjustments by Fundraising Round

| Round | Focus Modules | Data Requirements | Style |
|-------|--------------|-------------------|-------|
| Angel | Problem + Solution + Team | More assumptions acceptable; emphasize vision | Concise and punchy, under 10 slides |
| Pre-A / Series A | Market + Business Model + Metrics | Early business data for validation required | Data-driven, 12–15 slides |
| Series B+ | Business Model + Financials + Growth | Complete financial data required | Professional and rigorous, 15–20 slides |

### Iterative Refinement

If the user provides feedback on the outline:
1. Identify which module the feedback applies to
2. Re-execute from the corresponding Phase
3. Cascade updates to all downstream content
4. Keep data visualization recommendations consistent with the content

## Reference Methodologies

This SOP incorporates the following fundraising presentation methodologies:

- **Guy Kawasaki 10/20/30 Rule**: 10 slides, 20-minute presentation, 30-point font
- **Sequoia Capital Pitch Deck Template**: The classic Problem → Solution → Market → Business Model structure
- **Y Combinator Application Framework**: Emphasis on problem definition and traction data
- **TAM/SAM/SOM Framework**: Three-tier market sizing methodology
- **Unit Economics**: Core metrics including LTV, CAC, and payback period
