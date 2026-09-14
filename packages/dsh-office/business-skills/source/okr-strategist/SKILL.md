---
name: okr-strategist
description: "OKR drafting, breakdown, and retrospective coach that helps users craft high-quality objectives and key results, decompose goals into actionable layers, and conduct periodic reviews. Use when the user mentions OKR, goal management, key results, drafting, breakdown, retrospective, review, alignment, quarterly goals, or asks for help writing, reviewing, or breaking down an OKR."
license: MIT
---

# OKR Strategist

**End-to-end OKR drafting, breakdown, and retrospective coach**: Helps users craft high-quality OKRs, decompose objectives into actionable key results layer by layer, conduct periodic retrospectives, and verify whether OKRs follow best practices — with specific improvement suggestions.

## Quick Start

Users can submit an OKR draft for review, or start from scratch.

```
User: Help me write a Q3 OKR. I'm responsible for user growth.
Agent: [Guided drafting + formatted OKR output + self-check report]

User: Can you review this OKR? O: Improve product experience KR1: Optimize page load speed
Agent: [Item-by-item review + scoring + improvement suggestions]
```

---

## Part 1: OKR Fundamentals

### OKR Structure

| Element | Description | Requirements |
|---------|-------------|--------------|
| **Objective** | A directional goal to pursue | Qualitative, inspiring, challenging, achievable within one cycle |
| **Key Result** | Quantifiable metrics that measure whether the Objective is met | Quantitative, measurable, with clear numbers or milestones; 2–5 KRs per Objective |

### Writing Good Objectives

**A well-written Objective must meet these criteria**:

1. **Clear direction**: Pinpoints the area where progress is expected
2. **Inspiring**: Communicates why this matters to the team
3. **Qualitative**: Contains no specific numbers (numbers belong in KRs)
4. **Time-bounded**: Falls within a defined OKR cycle (typically a quarter)
5. **Controllable**: The team can directly influence the outcome rather than relying on external factors

**Common anti-patterns**:

| Issue | Bad Example | Improved Version |
|-------|-------------|------------------|
| Too vague | Do better | Build an industry-leading user search experience |
| Contains numbers | Grow DAU to 1 million | Dramatically increase user engagement (numbers go in KRs) |
| KPI, not an objective | Hit Q3 sales targets | Build a scalable enterprise customer acquisition engine |
| Uncontrollable | Become the #1 in the industry | Establish a significant competitive advantage in core categories |
| Too broad | Change the world | Reduce IT operations burden for SMBs in our target market |

### Writing Good Key Results

**A good KR must follow the SMART+ framework**:

| Principle | Description | Validation Check |
|-----------|-------------|------------------|
| **Specific** | Clearly defines what is measured | Can you explain what's being measured in one sentence? |
| **Measurable** | Has a clear numeric value or state | Can you determine completion with data? |
| **Ambitious** | Requires real effort (target 60–70% expected attainment) | Could you achieve this without trying? |
| **Relevant** | Directly supports the corresponding Objective | Does completing this KR advance the Objective? |
| **Time-bound** | Can be evaluated within the OKR cycle | Can you score it at the end of the cycle? |

**Three types of KRs**:

1. **Metric-based**: Move [metric] from [baseline] to [target]
   - Example: Increase 7-day retention for new users from 25% to 40%
2. **Milestone-based**: Complete [specific deliverable] by [date]
   - Example: Complete A/B testing and launch recommendation engine v2 by September 30
3. **Binary**: Done / Not done for a critical item
   - Example: Pass SOC2 Type II certification audit (use sparingly — hard to track progress)

**Common KR anti-patterns**:

| Issue | Bad Example | Improved Version |
|-------|-------------|------------------|
| Not measurable | Improve user experience | Increase NPS from 30 to 50 |
| Task, not result | Launch the recommendation system | Increase click-through rate from 3% to 8% via the recommendation system |
| No baseline | Raise retention to 50% | Increase 7-day retention from the current 32% to 50% |
| Too easy | Maintain current growth rate | Increase monthly growth rate from 5% to 12% |
| Uncontrollable | Get featured on the App Store | Increase organic search downloads by 30% |

---

## Part 2: OKR Drafting SOP

### Phase 1: Establish Context

**Steps**:

1. **Confirm basic information**:
   - OKR cycle (Q1/Q2/Q3/Q4 or custom)
   - Owner / team role
   - Parent OKR or company strategic direction (if available)
   - Previous cycle's OKR results (if available)

2. **Ask key questions** (up to 5):
   - What are the 1–2 most important things this cycle?
   - What is the biggest bottleneck or challenge right now?
   - Are there any hard targets that must be hit?
   - What are the team's current key data baselines?
   - Are there any cross-team dependencies or collaboration needs?

3. **If the user asks to skip questions**, proceed with reasonable assumptions and flag them in the output

**Output**: Context summary (no more than 150 words)

---

### Phase 2: Draft Objectives

**Steps**:

1. **Identify goal directions**:
   - Extract 2–4 potential goal directions from the context
   - Describe the strategic significance of each in one sentence

2. **Write Objectives**:
   - Each OKR set should contain 1–3 Objectives (recommend no more than 3)
   - Validate each against the Objective writing guidelines
   - Ensure Objectives are non-overlapping and mutually independent

3. **Alignment check**:
   - If a parent OKR exists, verify alignment
   - Confirm each Objective answers "Why does this matter?"

---

### Phase 3: Draft Key Results

**Steps**:

1. **Write KRs for each Objective**:
   - 2–5 KRs per Objective
   - Prefer metric-based KRs, then milestone-based; minimize pure binary KRs
   - Include baseline (current state) and target value

2. **KR quality self-check**: Validate each KR against the SMART+ framework

3. **KR portfolio check**:
   - Do all KRs together fully represent achievement of the Objective? (Sufficiency)
   - Is there measurement overlap between KRs? (Independence)
   - Are both leading and lagging indicators covered? (Balance)

---

### Phase 4: Output and Validation

**Output format**:

```markdown
## [Cycle] OKR — [Team / Individual Name]

### O1: [Objective description]
- KR1.1: [Key result description] (Baseline: [X] → Target: [Y])
- KR1.2: [Key result description] (Baseline: [X] → Target: [Y])
- KR1.3: [Key result description] (Milestone: [specific deliverable and date])

### O2: [Objective description]
- KR2.1: ...
- KR2.2: ...
```

**Global validation checklist**:

- [ ] Number of Objectives ≤ 3
- [ ] Each Objective has 2–5 KRs
- [ ] All KRs are quantifiable or have clear milestones
- [ ] No overlap between Objectives
- [ ] KRs include baseline values
- [ ] Overall challenge level is appropriate (expected attainment 60–70%)
- [ ] No KRs dependent on uncontrollable external factors

---

## Part 3: OKR Breakdown SOP

### Vertical Breakdown (Goal Hierarchy Alignment)

**When to use**: Breaking company/department-level OKRs down into team/individual-level OKRs.

**Steps**:

1. **Map parent KRs to child Objectives**:
   - A parent's KR may correspond to a child team's Objective
   - The child's Objective should directly contribute to the parent's KR

2. **Breakdown principles**:
   - **MECE**: Sub-goals are mutually exclusive and collectively exhaustive
   - **Attributable**: Each sub-goal has a clear owner
   - **Aggregable**: Achieving child KRs logically implies achieving the parent KR

3. **Alignment checklist**:

   | Check Item | Description |
   |------------|-------------|
   | Parent KR → Child O | Every parent KR has at least one child team owning it |
   | Coverage | Do all child Objectives together cover 100% of the parent KR? |
   | No orphans | Are there any child Objectives not linked to a parent KR? |
   | No conflicts | Are there contradictions between different teams' O/KRs? |

### Horizontal Breakdown (Cross-Team Collaboration)

**When to use**: A goal requires multiple teams to collaborate.

**Steps**:

1. **Identify collaboration points**: Which KRs require cross-team collaboration?
2. **Allocate contribution shares**: How is each team's contribution to shared KRs measured?
3. **Define interfaces**: Deliverables and deadlines between teams

---

## Part 4: OKR Review and Improvement SOP

### OKR Standards Review (Item-by-Item Diagnosis)

When a user submits an OKR draft, evaluate each item on the following dimensions and score accordingly:

**Objective checklist**:

| Dimension | Scoring Criteria (1–5) | Score 1 | Score 5 |
|-----------|------------------------|---------|---------|
| Direction clarity | Does the O clearly point to a direction? | Completely vague | Instantly clear |
| Inspirational quality | Does the reader understand why it matters? | No reaction | Makes people want to rally behind it |
| Qualitative expression | Does it avoid numbers? | Contains specific numbers | Purely qualitative |
| Controllability | Can the team directly influence the outcome? | Fully dependent on externals | Fully controllable |
| Appropriate granularity | Neither too broad nor too narrow? | Overly grand or trivial | Significant progress achievable in one quarter |

**Key Result checklist**:

| Dimension | Scoring Criteria (1–5) | Score 1 | Score 5 |
|-----------|------------------------|---------|---------|
| Measurability | Can it be determined with data? | Subjective description | Clear numeric value or milestone |
| Has baseline | Is the current value stated? | No baseline | Baseline + target both present |
| Challenge level | Does it require effort? | Effortless / completely impossible | Stretch but achievable |
| Outcome-oriented | Is it a result or a task? | Pure task description | Pure outcome description |
| Relevance to O | Does completing the KR advance the O? | Unrelated | Directly advances it |
| Independence | Does it overlap with other KRs? | Highly overlapping | Completely independent |

**Output format**:

```markdown
## OKR Review Report

### Overall Score: [X] / 5.0

### Item-by-Item Diagnosis

#### O1: [Original text]
- Direction clarity: [X]/5 — [One-line comment]
- Inspirational quality: [X]/5 — [One-line comment]
- ...
- **Overall score**: [X]/5
- **Improvement suggestions**: [Specific suggestions]
- **Rewrite reference**: [Improved version of the O]

#### KR1.1: [Original text]
- Measurability: [X]/5 — [One-line comment]
- ...
- **Overall score**: [X]/5
- **Improvement suggestions**: [Specific suggestions]
- **Rewrite reference**: [Improved version of the KR]

### Overall Recommendations
- [Structural suggestions, such as KR count, O-to-KR alignment, etc.]
```

---

## Part 5: OKR Retrospective SOP

### Phase R1: Scoring

**Standard OKR Scoring System (Google-style)**:

| Score | Meaning | Description |
|-------|---------|-------------|
| 1.0 | Fully achieved | Goal 100% realized |
| 0.7 | Mostly achieved | Reached a challenging target |
| 0.3 | Partially achieved | Some progress but far from the target |
| 0.0 | Not achieved | Little to no progress |

**Steps**:

1. **Score each KR individually**:
   - Metric-based: (Actual − Baseline) / (Target − Baseline)
   - Milestone-based: Convert to percentage of completion
   - Binary: Done = 1.0, Not done = 0.0

2. **Objective score**: Average of all its KR scores

3. **Health assessment**:

   | O Score | Health Status | Interpretation |
   |---------|---------------|----------------|
   | 0.7–1.0 | Green | Goals may not have been challenging enough (if this is a pattern) |
   | 0.4–0.6 | Yellow | Ideal zone — goals are challenging and progress is being made |
   | 0.0–0.3 | Red | Root-cause analysis needed: unrealistic goals / insufficient execution / external changes |

### Phase R2: Root-Cause Analysis

**Steps**:

For each KR, analyze why it was under- or over-achieved:

1. **Execution factors**:
   - Were enough resources and time invested?
   - Was the execution strategy correct?
   - Were there critical decision delays?

2. **Goal-setting factors**:
   - Was the KR set appropriately? (Too hard / too easy / wrong metric)
   - Was the Objective's direction correct?

3. **External factors**:
   - Did the market or competitive landscape change?
   - Were there uncontrollable unexpected events?
   - Did cross-team dependencies deliver on time?

### Phase R3: Lessons Learned

**Retrospective report template**:

```markdown
## [Cycle] OKR Retrospective Report — [Team / Individual Name]

### 1. Score Summary

| OKR Item | Score | Health |
|----------|-------|--------|
| O1: [Description] | [X] | [Status] |
| └ KR1.1 | [X] | — |
| └ KR1.2 | [X] | — |
| O2: [Description] | [X] | [Status] |
| └ KR2.1 | [X] | — |

### 2. Item-by-Item Analysis

#### O1: [Description] (Score: [X])

**KR1.1: [Description]**
- Score: [X] (Baseline: [A] → Target: [B] → Actual: [C])
- Reason for achievement / shortfall: [Analysis]
- Lessons learned: [Key takeaway]

### 3. Key Takeaways

**What went well (keep doing)**:
1. [Takeaway 1]
2. [Takeaway 2]

**What needs improvement (action items for next cycle)**:
1. [Improvement 1] → Suggested action: [Specific action]
2. [Improvement 2] → Suggested action: [Specific action]

### 4. Recommendations for Next Cycle's OKR
- [Drafting recommendations based on retrospective findings]
```

---

## Interaction Control Rules

### Interaction Mode Selection

| User Input | Mode | Behavior |
|------------|------|----------|
| "Help me write an OKR" (no details) | **Guided mode** | Run Phase 1 questions, guide step by step |
| Provides role and direction but lacks details | **Semi-automatic mode** | Ask 2–3 key questions while beginning to draft |
| Provides full context | **Fully automatic mode** | Output OKR draft + self-check report directly |
| Submits an OKR draft for review | **Review mode** | Execute Part 4 review SOP, output diagnosis report |
| Provides OKR with actual data for retrospective | **Retrospective mode** | Execute Part 5 retrospective SOP, output retrospective report |

### Core Principles

1. **Never make decisions for the user**: Provide options and suggestions; let the user confirm
2. **Data-driven**: Always request baseline data from the user; mark "TBD" when data is unavailable
3. **Challenging yet practical**: Encourage ambitious goals without losing touch with reality
4. **Focus on alignment**: Always check vertical alignment and cross-team consistency
5. **Continuous improvement**: Lessons from each retrospective should feed into the next cycle's planning

</output>
