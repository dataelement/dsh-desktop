---
name: work-recap-writer
description: "Turn scattered work notes and git logs into structured weekly or monthly reports in data-driven, narrative, or OKR-aligned styles. Triggered when the user mentions a weekly report, monthly report, work summary, sprint summary, status update, OKR progress, or needs to organize scattered records into a formal recap."
license: MIT
---

# work-recap-writer

Generate structured weekly or monthly reports from scattered work notes and git commit history. Supports three styles — data-driven, narrative, and OKR-aligned — to fit different reporting scenarios.

## Workflow

When the user asks to generate a weekly or monthly report, follow these steps:

### Step 1: Gather Information

Collect two types of information:

**1. Work Records (provided by the user)**

Ask the user for the following (skip any items they don't have):

- Key tasks completed this period
- In-progress items not yet finished
- Issues or blockers encountered
- Plans for the next period
- Key metrics or data points (if any)

The user can provide information in any form: scattered notes, chat log excerpts, to-do list screenshots, verbal descriptions — all acceptable.

**2. Git Commit History (auto-collected)**

If the user's working directory is a git repository, automatically run the following commands to retrieve commit history:

```bash
# Get the current git username
GIT_USER=$(git config user.name)

# Weekly report: commits from the last 7 days by the current user
git log --since="7 days ago" --author="$GIT_USER" --pretty=format:"%h %s (%ai)" --no-merges

# Monthly report: commits from the last 30 days by the current user
git log --since="30 days ago" --author="$GIT_USER" --pretty=format:"%h %s (%ai)" --no-merges
```

If the user specifies a custom date range or author, substitute accordingly. If the current directory is not a git repo or the user explicitly says git history isn't needed, skip this step.

### Step 2: Confirm Report Parameters

Confirm the following parameters with the user (skip if already specified in the initial request):

| Parameter | Options | Default |
|---|---|---|
| Report type | Weekly / Monthly | Weekly |
| Report style | Data-driven / Narrative / OKR-aligned | Data-driven |
| Time range | Custom dates | Last 7 days (weekly) or 30 days (monthly) |
| Output language | English / Chinese | English |
| Audience | Direct manager / Team / Cross-functional | Direct manager |

### Step 3: Organize and Categorize

Classify all collected information into the following dimensions:

1. **Completed** — Work delivered during this period
2. **In Progress** — Started but not yet finished, with estimated completion percentage
3. **Issues & Risks** — Blockers, delays, or dependencies encountered
4. **Next Period Plans** — Key priorities for the upcoming period
5. **Key Metrics** — Relevant quantitative indicators (if any)

For git commits, group by feature area or work theme rather than listing individually. Merge related commits into a single work item description.

### Step 4: Generate Report by Style

Generate the report using the template that matches the user's chosen style.

---

## Style Templates

### Style 1: Data-Driven

Best for scenarios requiring quantitative presentation of work output. Emphasizes numbers, completion rates, and comparisons.

```markdown
# [Weekly/Monthly Report] YYYY-MM-DD ~ YYYY-MM-DD

## Period Overview

- Completed: X items | In progress: Y items | Delayed: Z items
- Commits: N | Modules involved: Module A, Module B
- Key metric change: [Metric] improved from A to B (+C%)

## Completed

| # | Item | Category | Output |
|---|---|---|---|
| 1 | Item description | Dev / Design / Coordination | Specific deliverable |
| 2 | ... | ... | ... |

## In Progress

| # | Item | Progress | ETA | Blocker |
|---|---|---|---|---|
| 1 | Item description | 70% | MM-DD | None / Describe blocker |

## Issues & Risks

- **[Issue 1]**: Description → Impact → Current mitigation
- **[Issue 2]**: ...

## Next Period Plans

| # | Item | Priority | Est. Effort |
|---|---|---|---|
| 1 | Plan description | P0/P1/P2 | X days |
```

### Style 2: Narrative

Best for reporting to non-technical leadership, or when context and business value need to be conveyed.

```markdown
# [Weekly/Monthly Report] YYYY-MM-DD ~ YYYY-MM-DD

## Highlights

Summarize the most important achievements and progress of this period in 2-3 sentences, emphasizing business value and impact.

## Work Progress

### [Topic 1]

**Context**: Why this work was undertaken.
**Progress**: What was done and what results were achieved.
**Next Steps**: Upcoming plans.

### [Topic 2]

(Same structure)

## Issues Requiring Attention

Describe problems encountered in plain language, their impact on the project, and any support needed.

## Next Period Focus

List 3-5 priority items for the next period, ordered by importance.
```

### Style 3: OKR-Aligned

Best for OKR-driven teams, mapping work output to objectives and key results.

```markdown
# [Weekly/Monthly Report] YYYY-MM-DD ~ YYYY-MM-DD

## OKR Progress Overview

| Objective | This Period | Overall Completion |
|---|---|---|
| O1: Objective description | Brief progress | X% |
| O2: Objective description | Brief progress | Y% |

## Detailed Progress

### O1: [Objective Description]

**KR1: [Key Result Description]** — Current progress: X%
- Completed this period: Specific work items
- Next period plans: What's coming next

**KR2: [Key Result Description]** — Current progress: Y%
- Completed this period: ...
- Issues encountered: ...

### O2: [Objective Description]

(Same structure)

## Work Not Aligned to OKRs

Work handled this period that doesn't directly map to OKRs (e.g., ad-hoc requests, support tasks).

- Item 1: Description
- Item 2: Description

## Risks & Dependencies

- **[Risk 1]**: Affected OKR → Mitigation plan
- **[Dependency 1]**: Dependent party → Current status

## Next Period OKR Focus

List the KRs to prioritize next period and their expected targets.
```

---

## Writing Guidelines

Regardless of style, all generated reports should follow these guidelines:

1. **Defragment**: Merge multiple related small items into a single work theme — avoid checklist-style laundry lists
2. **Quantify first**: Use numbers wherever possible (completion counts, progress percentages, metric changes)
3. **Distinguish fact from plan**: Use past tense for completed items, mark in-progress items with progress, and note expected dates for planned items
4. **Highlight value**: Connect each work item to business value or project goals — don't just describe actions
5. **Surface risks early**: Mention blockers or risks prominently — don't bury them in details
6. **Keep it concise**: Limit each item description to 1-2 sentences — avoid redundancy

## Output Requirements

- Output format is Markdown
- Report is output directly in the conversation for the user to copy
- If the user requests saving to a file, write to their specified path
- Time range is clearly noted in the report title
