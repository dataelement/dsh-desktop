---
name: sprint-plan-builder
description: "Agile Sprint planning assistant that builds actionable plans by selecting scope based on team capacity and historical velocity, breaking down stories into estimated tasks, analyzing dependencies, and balancing workloads. Triggers when a user asks for Sprint Planning, iteration scoping, story/task assignment, workload balancing, dependency analysis, or team capacity calculation."
license: MIT
---

# Sprint Plan Builder — Agile Sprint Planning

Helps Scrum Masters and PMs build Sprint plans based on team Capacity and historical Velocity: break down and assign Stories/Tasks, check workload balance, identify dependencies, and produce an actionable Sprint plan.

---

## SOP Overview

```
Step 1: Gather Inputs → Step 2: Calculate Team Capacity → Step 3: Define Sprint Goal & Scope
    → Step 4: Task Breakdown & Estimation → Step 5: Dependency Analysis → Step 6: Task Assignment & Workload Balancing
    → Step 7: Output Sprint Plan → Step 8: Risk Review & Commitment Check
```

---

## Step 1: Gather Input Information

Collect the following from the user (proactively ask for any missing items):

| Input | Description | Example |
|-------|-------------|---------|
| Sprint Duration | Iteration length in working days | 2 weeks (10 working days) |
| Team Roster | Name + Role | Alice (Frontend), Bob (Backend), Carol (QA) |
| Availability per Member | Account for PTO, meetings, other project commitments | Alice 8 days, Bob 10 days, Carol 9 days |
| Historical Velocity | Completed story points from the last 3–5 Sprints | [32, 28, 35, 30, 33] |
| Product Backlog | Stories to be planned (with priority and estimates) | See Backlog table |
| Known Dependencies | Predecessor/successor relationships between Stories | Story-3 depends on Story-1 |

### Defaults When Information Is Missing

- Sprint Duration not specified → default to 2 weeks (10 working days)
- Availability not specified → default to Sprint Duration × 0.8 (accounting for meetings and overhead)
- Historical Velocity unknown → use 70% of the current total estimate as a conservative target
- Role not specified → treat as a general developer

---

## Step 2: Calculate Team Capacity

### 2.1 Individual Capacity

```
Individual Capacity = Available Days × Effective Hours per Day × Focus Factor
```

| Parameter | Default | Description |
|-----------|---------|-------------|
| Effective Hours per Day | 6 hours | 8-hour workday minus meetings, breaks, etc. |
| Focus Factor | 0.8 | Accounts for context switching, communication overhead |

### 2.2 Total Team Capacity

```
Total Team Capacity (person-hours) = Σ(Individual Capacity of each member)
Total Team Capacity (story points) = Derived from Velocity reference
```

### 2.3 Capacity Calculation Example

| Member | Available Days | Effective Hrs/Day | Focus Factor | Individual Capacity (hrs) |
|--------|---------------|-------------------|-------------|--------------------------|
| Alice | 8 | 6 | 0.8 | 38.4 |
| Bob | 10 | 6 | 0.8 | 48.0 |
| Carol | 9 | 6 | 0.8 | 43.2 |
| **Total** | | | | **129.6** |

---

## Step 3: Define Sprint Goal & Scope

### 3.1 Velocity Reference Calculation

```
Reference Velocity = Average Velocity over the last N Sprints
Recommended N = 3–5, excluding clear outliers
```

| Method | Use Case | Description |
|--------|----------|-------------|
| Simple Average | Stable team | mean(last 3–5 Sprints) |
| Weighted Average | Recent team changes | Higher weight for recent Sprints |
| Minimum | Conservative commitment | min(last 3 Sprints) |

### 3.2 Scope Selection Rules

1. Sort the Backlog by priority from highest to lowest
2. Accumulate story points until approaching but not exceeding the reference Velocity
3. If adding the last Story would exceed 110% of Velocity, exclude it
4. Reserve 10–15% buffer for contingencies and technical debt

---

## Step 4: Task Breakdown & Estimation

### 4.1 Story Breakdown Check

Each Story should satisfy the INVEST criteria:

| Criterion | Meaning | Checkpoint |
|-----------|---------|------------|
| **I**ndependent | Self-contained | Can it be delivered on its own? |
| **N**egotiable | Flexible | Is the implementation approach flexible? |
| **V**aluable | Valuable | Does it deliver clear value to users? |
| **E**stimable | Estimable | Can the team provide a point estimate? |
| **S**mall | Small | Can it be completed within one Sprint? |
| **T**estable | Testable | Are acceptance criteria clearly defined? |

### 4.2 Estimation Reference

If the user has not provided estimates, use the following reference table:

| Story Points | Complexity | Typical Effort |
|-------------|------------|----------------|
| 1 | Trivial | A few hours, no discussion needed |
| 2 | Simple | Half a day to one day, clear approach |
| 3 | Low-Medium | 1–2 days, minor uncertainty |
| 5 | Medium | 2–3 days, requires design and discussion |
| 8 | Complex | 3–5 days, spans multiple components |
| 13 | Very Complex | About one week, consider splitting |
| 21+ | Too Large | Must be split before planning |

---

## Step 5: Dependency Analysis

### 5.1 Dependency Types

| Type | Description | Example |
|------|-------------|---------|
| Finish-to-Start (FS) | B cannot start until A finishes | Frontend integration starts after API development |
| Start-to-Start (SS) | B can start after A starts | Backend development can begin once DB design starts |
| External Dependency | Depends on delivery outside the team | Waiting for a third-party API spec |
| Technical Dependency | Depends on a technical component or environment | Core framework must be set up first |

### 5.2 Dependency Review Process

1. **List all prerequisites for each Story**
2. **Build a dependency graph** (represented as a list or matrix)
3. **Identify the critical path**: find the longest dependency chain
4. **Flag risky dependencies**:
   - External dependencies (uncontrollable) → mark as High Risk
   - Cross-member dependency chains > 3 → mark as Medium Risk
   - Circular dependencies → must be resolved

### 5.3 Dependency Matrix Output Format

```
| Story    | Depends On  | Depended On By | Type     | Risk |
|----------|-------------|----------------|----------|------|
| Story-1  | None        | Story-3        | -        | Low  |
| Story-2  | None        | None           | -        | Low  |
| Story-3  | Story-1     | Story-5        | FS       | Med  |
| Story-4  | External API| Story-5        | External | High |
| Story-5  | Story-3, 4  | None           | FS       | High |
```

---

## Step 6: Task Assignment & Workload Balancing

### 6.1 Assignment Principles

1. **Skill Match First**: Match members' skills to Story technical requirements
2. **Dependency Order**: Assign depended-upon Stories first to avoid blocking downstream work
3. **Workload Balance**: Keep each member's load within ±20% of the team average
4. **Avoid Single Points of Failure**: Critical Stories should not be assigned to only one person

### 6.2 Workload Balance Calculation

```
Member Load % = Assigned Story Points / Individual Capacity (SP equivalent) × 100%
Team Average Load % = Total Assigned SP / Total Team Capacity (SP equivalent) × 100%
Load Deviation = |Member Load % - Team Average Load %|
```

### 6.3 Workload Balance Checks

| Check | Threshold | Action |
|-------|-----------|--------|
| Member Load > 100% | Overloaded | Must reassign tasks to other members |
| Member Load > 90% | High | Warning — no buffer |
| Member Load < 50% | Low | Check if they can take on more work |
| Load Deviation > 20% | Imbalanced | Rebalance assignments |
| One person > 40% of total SP | Over-concentrated | Spread the risk |

### 6.4 Rebalancing Strategies

When workload is imbalanced, adjust in this priority order:

1. Move lower-priority Stories from overloaded members to underloaded ones
2. Reassign Stories with flexible skill requirements
3. Split large Stories so multiple people can work in parallel
4. Reduce Sprint scope (remove the lowest-priority Stories)

---

## Step 7: Output the Sprint Plan

After completing the steps above, produce output using the following template:

```
## Sprint Plan: Sprint [Number] ([Start–End Dates])

### Sprint Goal
[One sentence describing the core objective of this Sprint]

### Team Capacity

| Member | Role | Available Days | Capacity (hrs) |
|--------|------|---------------|----------------|

- Total Team Capacity: X person-hours
- Reference Velocity: X story points
- This Sprint: X story points (X% of Velocity)

### Story Assignments

| # | Story | Priority | Points | Owner | Dependencies | Status |
|---|-------|----------|--------|-------|--------------|--------|

### Workload Distribution

| Member | Assigned SP | Load % | Status |
|--------|-------------|--------|--------|

### Dependencies

[Dependency matrix or dependency chain description]

### Critical Path
[List the longest dependency chain and expected completion order]

### Risks & Notes
- [Risk item 1]
- [Risk item 2]
- [Buffer and contingency plans]
```

---

## Step 8: Risk Review & Commitment Check

### Final Checklist

After producing the plan, confirm each item:

- [ ] Are total story points within 80–100% of Velocity?
- [ ] Is each member's load between 60–90%?
- [ ] Is load deviation ≤ 20%?
- [ ] Are there any circular dependencies? (Not allowed)
- [ ] Are external dependencies flagged with a risk level?
- [ ] Is someone assigned to every Story on the critical path?
- [ ] Is a 10–15% buffer reserved?
- [ ] Are any Story estimates above 13 points? (Should be split)
- [ ] Does any single member carry more than 40% of total story points?

### Common Issues & Recommendations

| Issue | Recommendation |
|-------|---------------|
| Insufficient Velocity data | Use a conservative estimate (80% of the lowest known value) |
| Team member changes | Count new members at 50% capacity for their first Sprint |
| Unclear requirements | Add a Spike (technical investigation) for unclear Stories; do not count toward Velocity |
| Accumulated technical debt | Reserve 15–20% capacity per Sprint for tech debt |
| Cross-team dependencies | Flag as external dependency; align with the other team in advance |

---

## Common Pitfalls (Must Check During Planning)

| Pitfall | Consequence | Correct Approach |
|---------|-------------|------------------|
| Treating Velocity as a hard ceiling and filling 100% | No buffer; any surprise derails the Sprint | Reserve 10–15% buffer; commit to 85–90% |
| Using full working days for capacity, ignoring meetings and PTO | Inflated capacity; actual delivery falls short | Always use Available Days × 6h × 0.8 |
| Skipping dependency analysis and jumping to assignment | Blockers discovered mid-Sprint, forcing rework | Build the dependency matrix before assigning |
| Including large Stories (>13 SP) without splitting | Inaccurate estimates, untrackable progress | Stories above 13 points must be split first |
| Placing the entire critical path on one person | Single point of failure; one sick day breaks the chain | Spread critical-path tasks across 2+ people |
| Assigning full capacity to new team members | Newcomers ramp up slowly, actual output falls short | Count new members at 50% capacity for Sprint 1 |

---

## References

- Mike Cohn, *Agile Estimating and Planning*
- Scrum Guide 2020 (scrumguides.org)
- SAFe (Scaled Agile Framework) — PI Planning and Sprint Planning methodology
- PMI-ACP (Agile Certified Practitioner) body of knowledge
