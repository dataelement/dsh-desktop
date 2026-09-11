---
name: weighted-scorer
description: "Builds weighted scoring decision matrices for technology selection, vendor evaluation, and multi-criteria option comparisons. Guides you through defining criteria, assigning weights, scoring options, and validating results with sensitivity analysis. Trigger when users ask about decision matrices, weighted scoring, comparing options, vendor selection, or build vs. buy choices."
license: MIT
---

# Weighted Scorer — Weighted Scoring Decision Framework

A systematic multi-criteria decision methodology. Suitable for technology selection, vendor evaluation, Build vs Buy decisions, tool comparison, hiring assessments, and any scenario requiring comparison of multiple options across multiple dimensions.

## Quick Start

Guide the user through 5 steps:

1. **List candidate options** (2–7)
2. **Define evaluation criteria** (4–8)
3. **Assign weights** (must total 100%)
4. **Score each option per criterion** (1–5 scale)
5. **Calculate weighted totals + sensitivity analysis**

The user just needs to say:
> "Help me do a technology selection comparing PostgreSQL, MySQL, and MongoDB for our e-commerce order system"

The agent will guide the user step by step through the entire decision process.

---

## I. Full Process Guide

### Step 1: Clarify Decision Context

Before scoring, clarify the following (use questions to guide the user):

| Question | Purpose |
|----------|---------|
| What problem is this decision trying to solve? | Focus on real needs; avoid comparing for comparison's sake |
| What are the candidate options? | Identify what's being compared (recommend 2–7 options) |
| Who are the key stakeholders? | Different roles care about different criteria |
| When does the decision need to be made? | Affects depth of information gathering |
| Are there any dealbreakers? | Identify hard constraints to filter out infeasible options first |

**Hard constraint filtering**: If any option fails a dealbreaker criterion (e.g., budget cap, compliance requirement, technical compatibility), eliminate it immediately — it does not enter the scoring stage.

### Step 2: Define Evaluation Criteria

#### Criteria Selection Principles

- **MECE principle**: Criteria should be mutually exclusive and collectively exhaustive
- **Scorability**: Each criterion must allow differentiated scoring across options
- **Keep it manageable**: 4–8 criteria is optimal. Fewer than 4 makes the decision too coarse; more than 8 dilutes signal with noise

#### Common Criteria Templates

**Technology Selection**:
| Criterion | Description | How to Evaluate |
|-----------|-------------|----------------|
| Feature fit | How well it meets core requirements | List requirements and compare item by item |
| Performance | Latency, throughput, concurrency | Benchmark data or official documentation |
| Scalability | Horizontal/vertical scaling capability | Architecture design analysis |
| Community & ecosystem | Documentation, community activity, third-party integrations | GitHub stars/issues, Stack Overflow activity |
| Learning curve | Difficulty for the team to adopt | Match against team's existing skill set |
| Ops complexity | Difficulty of deployment, monitoring, troubleshooting | Operational experience or documentation review |
| Cost | Licensing, infrastructure, personnel costs | TCO (Total Cost of Ownership) estimate |
| Long-term risk | Vendor lock-in, technology obsolescence risk | Open source vs. proprietary, market trends |

**Vendor Evaluation**:
| Criterion | Description |
|-----------|-------------|
| Product capability | Feature coverage, usability, customizability |
| Pricing & terms | Total cost, payment terms, discount conditions |
| Technical support | SLA, response time, support channels |
| Security & compliance | Data security, certifications, regulatory compliance |
| Integration capability | APIs, SDKs, compatibility with existing systems |
| Company strength | Financial stability, market share, customer references |

**Build vs Buy**:
| Criterion | Description |
|-----------|-------------|
| Requirements fit | Degree to which customization needs are met |
| Time to launch | Time from decision to production readiness |
| Total cost (3 years) | Development/purchase + maintenance + opportunity cost |
| Team capability match | Whether the team can realistically build it in-house |
| Strategic value | Whether it builds core competitive advantage |
| Maintenance burden | Long-term maintenance effort and complexity |

### Step 3: Assign Weights

Weights reflect the relative importance of each criterion. They must total 100%.

#### Method A: Direct Assignment (Quick)

Best when there are few criteria (≤5) or the decision-maker has a clear sense of priorities.

How: Ask the user to assign a percentage to each criterion, totaling 100%.

Prompt to guide the user:
> "Distribute 100 points across these criteria. Give more points to the most important ones. Don't worry about precision — go with your gut, and we can adjust later."

#### Method B: Rank-Order Allocation (Recommended)

Best when the user doesn't have a strong intuition for numeric weights.

Steps:
1. Ask the user to **rank** the criteria by importance (most important first)
2. Automatically calculate weights using the ROC (Rank Order Centroid) formula:

```
Weight for rank k = (1/k + 1/(k+1) + ... + 1/n) / n

where n = total number of criteria, k = rank position (1 = most important)
```

| Rank | 4 criteria | 6 criteria | 8 criteria |
|------|-----------|-----------|-----------|
| 1 | 52.1% | 40.8% | 34.0% |
| 2 | 27.1% | 24.2% | 21.5% |
| 3 | 14.6% | 15.8% | 15.2% |
| 4 | 6.3% | 10.3% | 11.1% |
| 5 | — | 6.1% | 7.9% |
| 6 | — | 2.8% | 5.4% |
| 7 | — | — | 3.3% |
| 8 | — | — | 1.6% |

> No manual calculation needed — use `scripts/decision_matrix.py` to generate automatically.

#### Method C: Pairwise Comparison (Precise)

Best for team decisions, many criteria (>5), or when you need to reduce subjective bias.

Steps:
1. Create all pairwise combinations of criteria
2. For each pair, judge which is more important (win = 1, loss = 0, tie = 0.5)
3. Each criterion's score = number of wins / total number of comparisons

Example (4 criteria: A, B, C, D):

| Comparison | Result |
|------------|--------|
| A vs B | A wins |
| A vs C | C wins |
| A vs D | A wins |
| B vs C | C wins |
| B vs D | Tie |
| C vs D | C wins |

Result: A=2/6=33%, B=0.5/6=8%, C=3/6=50%, D=0.5/6=8%. Normalize to 100%.

#### Weight Quality Checks

After assigning weights, run these sanity checks:

- [ ] **Extremes test**: Is the highest-weighted criterion really that much more important than the lowest?
- [ ] **Discriminating power test**: Is any criterion weighted below 5%? If so, consider merging or removing it
- [ ] **Concentration test**: Do the top two criteria account for more than 70% combined? If so, are the remaining criteria truly unimportant?
- [ ] **Stakeholder test**: Would a different stakeholder assign significantly different weights?

### Step 4: Score Each Option

#### Scoring Scale (1–5)

**You must define what each score means before scoring begins** — otherwise, different scorers apply inconsistent standards:

| Score | General Meaning | Example (for "Performance" criterion) |
|-------|----------------|---------------------------------------|
| 5 | Outstanding; significantly exceeds requirements | Latency <10ms, easily handles 10x expected traffic |
| 4 | Good; meets requirements with headroom | Latency <50ms, handles 3x expected traffic |
| 3 | Adequate; barely meets current requirements | Latency <100ms, handles current traffic |
| 2 | Insufficient; requires additional effort to meet requirements | Latency 100–500ms, needs optimization |
| 1 | Severely lacking; essentially unusable | Latency >500ms, cannot meet basic requirements |

#### Scoring Guidelines

- **Set anchors first**: For each criterion, quickly identify the best (5) and worst (1–2) option, then score the rest
- **Score by criterion**: Score column by column (not row by row) — this makes cross-option comparison fairer
- **Provide rationale**: Attach a one-sentence justification to each score to prevent forgetting the basis later
- **Check for discrimination**: If all options score the same on a criterion, that criterion adds no value — consider removing it

### Step 5: Calculate & Analyze

#### Weighted Total Calculation

```
Total score for Option X = Σ(weight of criterion i × Option X's score on criterion i)
```

#### Output Format

Present results in a standard table:

```markdown
| Criterion | Weight | Option A | Option B | Option C |
|-----------|--------|----------|----------|----------|
| Feature fit | 30% | 4 (1.20) | 5 (1.50) | 3 (0.90) |
| Performance | 25% | 5 (1.25) | 3 (0.75) | 4 (1.00) |
| Cost | 25% | 3 (0.75) | 4 (1.00) | 5 (1.25) |
| Learning curve | 20% | 4 (0.80) | 2 (0.40) | 3 (0.60) |
| **Weighted Total** | **100%** | **4.00** | **3.65** | **3.75** |
| **Rank** | | **1** | **3** | **2** |
```

Values in parentheses are the weighted score for that cell (weight × score).

---

## II. Sensitivity Analysis (Critical — Do Not Skip)

Weighted scoring results depend on assumptions about weights and scores. **If the gap between 1st and 2nd place is less than 0.3 points (on a 5-point scale), sensitivity analysis is mandatory.**

### Analysis Methods

#### 1. Weight Perturbation Test

For each key criterion, shift its weight by ±10% (adjust other weights proportionally) and check if the ranking changes:

```
Original weights: Feature 30%, Performance 25%, Cost 25%, Learning 20%
Test 1: Feature 40%, Performance 21.4%, Cost 21.4%, Learning 17.1%  → Ranking changed?
Test 2: Feature 20%, Performance 28.6%, Cost 28.6%, Learning 22.9%  → Ranking changed?
```

#### 2. Score Perturbation Test

For any score that was debatable, adjust it by ±1 point and check if the ranking changes.

#### 3. Reversal Point Analysis

Calculate: "How much would a specific weight or score need to change for the 2nd-place option to overtake 1st place?" If only a tiny change is needed, the two options are essentially too close to call.

### Conclusion Template

> **Conclusion**: Option A leads with 4.00 points vs. Option C at 3.75 (gap of 0.25). Sensitivity analysis shows that when the "Cost" criterion weight increases to 35% (+10%), Option C overtakes Option A. Recommend reviewing the appropriateness of the Cost weight, or gathering more cost data to improve scoring accuracy.

---

## III. Cognitive Bias Checklist

After completing scoring, check for these common biases:

| Bias | Manifestation | Countermeasure |
|------|--------------|----------------|
| Anchoring | The first option evaluated tends to score higher | After scoring all options, revisit the first one |
| Halo effect | Positive overall impression inflates all criterion scores | Score by criterion (column), not by option (row) |
| Status quo bias | Tendency to favor the option currently in use | Imagine choosing from scratch, ignoring migration costs |
| Confirmation bias | Starting with a conclusion, then finding evidence to support it | Have people with different perspectives score independently and compare |
| Sunk cost fallacy | Reluctance to switch because of prior investment | Clearly separate "past investment" from "future value" |
| Availability bias | Recent positive/negative news about an option skews judgment | Require objective evidence for every score |

---

## IV. Script Tool

The `scripts/decision_matrix.py` script automates calculations:

**Features**:
- Input criteria, weights, and scores; output a weighted scoring table (Markdown format)
- Automatic sensitivity analysis (weight ±10% perturbation test)
- ROC rank-order method for automatic weight calculation
- Detection of scoring consistency issues (e.g., zero discrimination on a criterion)

**Usage**:
```bash
# Full scoring calculation + sensitivity analysis
python3 scripts/decision_matrix.py --json '{
  "dimensions": ["Features", "Performance", "Cost", "Learning Curve"],
  "weights": [30, 25, 25, 20],
  "options": ["PostgreSQL", "MySQL", "MongoDB"],
  "scores": {
    "PostgreSQL": [4, 5, 3, 4],
    "MySQL":      [5, 3, 4, 2],
    "MongoDB":    [3, 4, 5, 3]
  }
}'

# ROC weight calculation: just provide criteria ranked from most to least important
python3 scripts/decision_matrix.py --roc '["Features", "Performance", "Cost", "Learning Curve"]'
```

---

## V. Full Example: Database Selection for an E-commerce System

### Background
- E-commerce order system, 100K orders per day
- Team of 5, primarily experienced with relational databases
- Limited budget, preference for open-source solutions

### Step 1: Candidate Options
PostgreSQL, MySQL, MongoDB (Hard constraint filter: Oracle eliminated due to licensing cost exceeding budget)

### Step 2: Criteria Definition
Feature fit, Performance, Scalability, Community & ecosystem, Learning curve, Ops complexity, Cost

### Step 3: Weights (Rank-Order Method)
User ranking: Features > Performance > Cost > Learning curve > Community > Ops > Scalability

ROC weights: Features 37.0%, Performance 22.8%, Cost 15.6%, Learning 10.9%, Community 7.3%, Ops 4.4%, Scalability 2.0%

### Step 4: Scoring

| Criterion | Weight | PostgreSQL | MySQL | MongoDB |
|-----------|--------|-----------|-------|---------|
| Feature fit | 37.0% | 5 | 4 | 3 |
| Performance | 22.8% | 4 | 4 | 5 |
| Cost | 15.6% | 5 | 5 | 4 |
| Learning curve | 10.9% | 3 | 4 | 2 |
| Community & ecosystem | 7.3% | 5 | 5 | 4 |
| Ops complexity | 4.4% | 3 | 4 | 2 |
| Scalability | 2.0% | 4 | 3 | 5 |

### Step 5: Results
- PostgreSQL: **4.45 points** → Rank 1
- MySQL: **4.21 points** → Rank 2
- MongoDB: **3.57 points** → Rank 3

**Sensitivity analysis**: The gap between PostgreSQL and MySQL is 0.24 points. Sensitivity analysis shows rankings remain unchanged after ±10% weight perturbation across all criteria. Although the margin is small, the conclusion is not sensitive to weight changes, indicating high confidence.

---

## VI. When to Use & Limitations

### Good Fit
- 2–7 candidate options, 4–8 evaluation criteria
- Decision involves multiple participants or requires documentation
- You need to explain "why this option" to stakeholders

### Not a Good Fit
- Only 2 options with obvious differences → a simple Pros/Cons list is more efficient
- Decision is dominated by a single factor → no need for a multi-criteria framework
- Information is extremely incomplete → scoring is meaningless; gather information first
- Highly emotional personal decisions → a rational framework may mask true preferences

### Common Pitfalls
1. **Too many criteria**: More than 8 criteria means each carries little weight, reducing discriminating power
2. **False precision**: 3.72 vs. 3.68 does not mean A is truly better than B — pay attention to sensitivity analysis
3. **Ignoring qualitative judgment**: The matrix is a decision aid, not a replacement for intuition
4. **Set it and forget it**: Re-evaluate when decision conditions change

---

## References

- Keeney, R. & Raiffa, H. — *Decisions with Multiple Objectives* (classic text on multi-objective decision-making)
- Belton, V. & Stewart, T. — *Multiple Criteria Decision Analysis* (practical MCDA guide)
- ROC weighting method — Barron & Barrett (1996), "Decision quality using ranked attribute weights"
