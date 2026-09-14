---
name: project-sizing-guide
description: "Software project effort estimation assistant. Outputs three-point estimates (optimistic/most-likely/pessimistic values with confidence intervals), T-shirt sizes, or Function Point Analysis (FPA) counts. Triggered when users ask 'how long will this feature take,' need to assess project workload, perform PERT estimation, T-shirt sizing, FPA, sprint planning, or quote-based effort breakdowns."
license: MIT
---

# Project Sizing Guide — Software Project Effort Estimation

Helps teams produce scientifically grounded effort estimates for software projects, based on three major methodologies: Three-Point Estimation (PERT), T-shirt Sizing, and Function Point Analysis (FPA). Outputs optimistic, most-likely, and pessimistic values along with risk intervals.

## Quick Start

1. **User provides a requirements description** → Agent identifies functional modules and breaks them into a Work Breakdown Structure (WBS)
2. **Select an estimation method** → Choose the best-fit approach based on project stage and available information
3. **Estimate each item** → Assign O/M/P (Optimistic / Most Likely / Pessimistic) values to every work package
4. **Aggregate and report** → Generate an estimation report with risk analysis and confidence intervals

A calculation helper is available:
```bash
python3 scripts/estimate_calculator.py --method pert --tasks '[{"name":"User Login","O":2,"M":3,"P":8}]'
```

---

## Method Selection Guide

| Scenario | Recommended Method | Rationale |
|----------|-------------------|-----------|
| Early feasibility study, rough budgeting | T-shirt Sizing | Little information available; quickly align on order of magnitude |
| Sprint planning, iteration estimation | Three-Point Estimation (PERT) | Good granularity with confidence intervals |
| Contract bidding, large-project RFPs | Function Point Analysis (FPA) | Most rigorous; industry-comparable |
| Team has historical data | PERT + historical calibration | Combines empirical correction with data |

---

## Method 1: Three-Point Estimation (PERT)

### Core Formulas

| Metric | Formula | Meaning |
|--------|---------|---------|
| Expected Value E | (O + 4M + P) / 6 | Weighted average effort |
| Standard Deviation σ | (P − O) / 6 | Estimation uncertainty |
| Variance V | σ² | Used to aggregate across tasks |
| Project Total Expected | ΣE | Sum of individual expected values |
| Project Total Std Dev | √(ΣV) | Square root of summed variances |

Where:
- **O** (Optimistic): Shortest duration assuming everything goes smoothly
- **M** (Most Likely): Duration under normal circumstances
- **P** (Pessimistic): Longest duration when significant difficulties arise

### Confidence Intervals

| Confidence Level | Interval | Use Case |
|-----------------|----------|----------|
| 68.3% | E ± 1σ | Internal rough estimates |
| 90% | E ± 1.645σ | Project planning |
| 95% | E ± 2σ | External quotes |
| 99.7% | E ± 3σ | Contractual commitments |

### Steps

1. **Build the WBS**: Decompose requirements into the smallest independently estimable units (recommended ≤ 5 person-days each)
2. **Three-point estimation**: For each work package, provide O / M / P values (use consistent units: person-hours or person-days)
3. **Calculate per-task expected value and standard deviation**
4. **Aggregate project-level metrics**: Total Expected = ΣE, Total Std Dev = √(Σσ²)
5. **Output confidence intervals**: Choose a confidence level based on risk appetite

### O/M/P Estimation Rules of Thumb

- O should not be less than 30% of M (overly optimistic suggests essential steps were overlooked)
- P should not exceed 5× M (overly pessimistic suggests unclear requirements that need clarification first)
- If O ≈ M ≈ P, the task is either extremely well-understood or the estimator hasn't seriously considered risks
- The P/O ratio (spread ratio) reflects uncertainty: < 2 = low risk, 2–4 = medium risk, > 4 = high risk

---

## Method 2: T-shirt Sizing

### Size Reference Table

| Size | Typical Range (person-days) | Typical Story Points | Suitable For |
|------|----------------------------|---------------------|--------------|
| XS | 0.25 – 0.5 | 1 | Config changes, copy edits, simple bug fixes |
| S | 0.5 – 2 | 2 – 3 | Single-component development, simple API, minor UI tweaks |
| M | 2 – 5 | 5 – 8 | Complete feature module, moderately complex API |
| L | 5 – 15 | 13 – 21 | Cross-module features requiring integration |
| XL | 15 – 40 | 34 – 55 | Subsystem-level development requiring architecture design |
| XXL | 40+ | 89+ | Should be split across multiple iterations; not recommended as a single estimation unit |

### Converting T-shirt Sizes to Three-Point Estimates

When more precise numbers are needed, T-shirt sizes can be converted to three-point estimates:

| Size | O (person-days) | M (person-days) | P (person-days) |
|------|-----------------|-----------------|-----------------|
| XS | 0.25 | 0.5 | 1 |
| S | 0.5 | 1 | 2.5 |
| M | 2 | 3.5 | 7 |
| L | 5 | 10 | 20 |
| XL | 15 | 25 | 50 |
| XXL | 40 | 70 | 150 |

### Steps

1. **Team alignment**: Confirm what each size means (the table above is a reference; teams may customize)
2. **Independent assessment**: Each person assigns a size independently to avoid anchoring bias
3. **Discuss discrepancies**: When estimates differ by more than 2 sizes, a discussion is mandatory
4. **Reach consensus**: Adopt the team consensus value
5. **Convert to numbers** (optional): Use the table above to derive O/M/P values

---

## Method 3: Function Point Analysis (FPA)

### Five Function Component Types

| Component Type | Abbreviation | Definition | Example |
|---------------|-------------|-----------|---------|
| Internal Logical File | ILF | Logical data group maintained by the application | Users table, Orders table |
| External Interface File | EIF | Data group referenced but not maintained by the application | Third-party exchange rate data |
| External Input | EI | Data processing entering the system from outside | Form submission, API POST |
| External Output | EO | Data generated and sent outside the system | Report generation, exports |
| External Inquiry | EQ | Simple data retrieval + display | List queries, detail pages |

### Complexity Weight Matrix

| Component Type | Low | Medium | High |
|---------------|-----|--------|------|
| ILF | 7 | 10 | 15 |
| EIF | 5 | 7 | 10 |
| EI | 3 | 4 | 6 |
| EO | 4 | 5 | 7 |
| EQ | 3 | 4 | 6 |

### Complexity Assessment Rules

**ILF / EIF Complexity** (based on DET – Data Element Types and RET – Record Element Types):

| | DET 1-19 | DET 20-50 | DET 51+ |
|---|---------|-----------|---------|
| RET 1 | Low | Low | Medium |
| RET 2-5 | Low | Medium | High |
| RET 6+ | Medium | High | High |

**EI Complexity** (based on DET and FTR – File Types Referenced):

| | DET 1-4 | DET 5-15 | DET 16+ |
|---|---------|----------|---------|
| FTR 0-1 | Low | Low | Medium |
| FTR 2 | Low | Medium | High |
| FTR 3+ | Medium | High | High |

**EO / EQ Complexity** (based on DET and FTR):

| | DET 1-5 | DET 6-19 | DET 20+ |
|---|---------|----------|---------|
| FTR 0-1 | Low | Low | Medium |
| FTR 2-3 | Low | Medium | High |
| FTR 4+ | Medium | High | High |

### Converting Function Points to Effort

After calculating Unadjusted Function Points (UFP):

1. **Calculate the Value Adjustment Factor (VAF)** (optional; deprecated since IFPUG 4.3+ but still used by some teams)
   - 14 General System Characteristics (GSC), each scored 0–5
   - VAF = 0.65 + 0.01 × Σ(GSC)
   - Adjusted Function Points AFP = UFP × VAF

2. **Function points to person-hours**
   - Industry benchmark: 8–15 person-hours per function point (varies by language and team maturity)

   | Technology Stack | Person-hours / FP | Notes |
   |-----------------|-------------------|-------|
   | Low-code / Mature Frameworks | 4 – 8 | Many reusable components available |
   | Python / JS / Modern Web | 8 – 12 | Mainstream development productivity |
   | Java / C# Enterprise | 10 – 15 | Includes architecture and standards overhead |
   | Embedded / C / C++ | 15 – 25 | High debugging and testing cost |
   | Legacy System Maintenance | 20 – 30 | Comprehension and regression cost |

### Steps

1. **Identify function components**: List all ILFs, EIFs, EIs, EOs, and EQs
2. **Assess complexity**: Rate each component as Low / Medium / High
3. **Calculate UFP**: Sum (count × weight) for all components
4. **Select conversion factor**: Choose person-hours per FP based on technology stack
5. **Compute total effort**: UFP × conversion factor
6. **Add buffer**: A 15–30% management and risk buffer is recommended

---

## Estimation Adjustment Factor Checklist

After completing the estimation, verify that the following factors have been accounted for:

### Technical Factors
- [ ] Technology stack familiarity (Is the team experienced? If unfamiliar, add 30–50%)
- [ ] Technical debt (Poor legacy code quality? Add 20–40%)
- [ ] Third-party dependencies (Unstable APIs? Missing documentation? Add 10–30%)
- [ ] Performance / security requirements (Special non-functional requirements? Add 15–25%)

### Team Factors
- [ ] Team size (Communication overhead increases significantly above 5 people; add ~5% per person)
- [ ] Personnel turnover risk (Key members may leave? Add 15–25%)
- [ ] Parallel projects (Team context-switching across multiple projects? Add 20–30%)
- [ ] Onboarding new members (New hires? Expect ~50% reduced efficiency for the first 2 weeks)

### Process Factors
- [ ] Requirements stability (Requirements likely to change? Add 20–50%)
- [ ] Approval processes (Multiple layers of approval needed? Add 10–20%)
- [ ] Deployment complexity (Multi-environment, multi-region deployments? Add 10–15%)
- [ ] Compliance requirements (Audit or compliance processes? Add 15–30%)

### Commonly Underestimated Work
- [ ] Code review: +10–15%
- [ ] Unit test authoring: +15–25%
- [ ] Integration / E2E testing: +10–20%
- [ ] Documentation: +5–15%
- [ ] Bug fixing and regression: +10–20%
- [ ] Environment setup and DevOps: +5–10%
- [ ] Meetings and communication: +10–15%

---

## Estimation Output Template

After the Agent completes the estimation, it should produce output in the following format:

```
## Estimation Report: [Project / Feature Name]

### Estimation Method: [PERT / T-shirt / FPA]

### Work Package Breakdown

| # | Work Package | O (person-days) | M (person-days) | P (person-days) | E (person-days) | σ |
|---|-------------|-----------------|-----------------|-----------------|-----------------|---|
| 1 | xxx         | x               | x               | x               | x.x             | x.x |
| 2 | xxx         | x               | x               | x               | x.x             | x.x |

### Summary

- Total expected effort: X person-days
- Total standard deviation: X person-days
- 68% confidence interval: X – X person-days
- 90% confidence interval: X – X person-days
- 95% confidence interval: X – X person-days

### Adjustment Factors
- [Factors considered and adjustments applied]

### Final Recommendation
- For internal planning: X person-days (90% confidence)
- For external quotes: X person-days (95% confidence)

### Risk Alerts
- [Key risk items and mitigation suggestions]
```

---

## Calculation Tool

The `scripts/estimate_calculator.py` script supports numerical calculations for all three estimation methods:

```bash
# Three-Point Estimation (PERT)
python3 scripts/estimate_calculator.py --method pert \
  --tasks '[{"name":"Login Module","O":2,"M":3,"P":8},{"name":"Payment Module","O":5,"M":10,"P":20}]'

# T-shirt Size Conversion
python3 scripts/estimate_calculator.py --method tshirt \
  --tasks '[{"name":"Login Module","size":"M"},{"name":"Payment Module","size":"L"}]'

# Function Point Analysis
python3 scripts/estimate_calculator.py --method fpa \
  --components '[{"type":"ILF","complexity":"medium","count":3},{"type":"EI","complexity":"low","count":5}]' \
  --hours-per-fp 10
```

---

## References

- IFPUG (International Function Point Users Group) CPM 4.3.1
- PMI PMBOK Guide — 6th Edition, Section 6.4: Estimate Activity Durations
- Steve McConnell, *Software Estimation: Demystifying the Black Art*
- Mike Cohn, *Agile Estimating and Planning*
