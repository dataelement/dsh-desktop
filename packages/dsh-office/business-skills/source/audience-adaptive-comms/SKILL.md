---
name: audience-adaptive-comms
description: "Adapt stakeholder communication to the target audience (CEO, VP, Tech Lead, or Operations), adjusting detail level, language, and focus. Output tailored emails, briefings, or slide outlines. Trigger when a user asks for an executive briefing, stakeholder update, project status report for leadership, cross-team sync, or mentions writing to a VP, CEO, or tech lead."
license: MIT
---

# audience-adaptive-comms

Automatically adjusts the granularity, language, and focus of communication content based on the target audience role. Supports four common audience types—CEO, VP, Tech Lead, and Operations—covering both upward reporting and cross-functional communication scenarios.

## Workflow

### Step 1: Gather Raw Information

Ask the user for the following:

- **Communication topic**: What they're reporting or syncing on (project progress, issue escalation, decision request, results showcase, etc.)
- **Raw material**: All details the user has (can be rough notes, technical docs, data reports, chat logs, or any other format)
- **Target audience**: Who will read this (CEO / VP / Tech Lead / Operations / Other role—if the audience doesn't fit the four types above, ask the user to describe the role's function and priorities, then adapt from the closest audience strategy)
- **Communication purpose**: Status update, resource request, decision request, risk alert, or results showcase
- **Output format**: Email, meeting talking points, Slack/Teams message, slide outline, or formal document

If the user has already specified some of this in their initial request, skip the corresponding confirmation.

### Step 2: Determine Audience Profile and Adaptation Strategy

Based on the target audience, automatically apply the following adaptation strategies:

---

## Audience Adaptation Strategies

### CEO / Founder

**Key concerns**: Strategic impact, business value, key decision points, risks and opportunities

**Granularity adjustment**:
- Highest level of abstraction—keep only conclusions and decision items
- Entire briefing should fit on 1 page or within 3 minutes of verbal delivery
- Remove all technical implementation details and process descriptions
- Keep only the 1–3 most critical metrics

**Language style**:
- Use business language, not technical jargon
- "We completed the microservices migration" → "System reliability improved 40%, supporting 3x traffic growth next quarter"
- "Database query optimization" → "User experience improved—page load time reduced by 2 seconds"
- Avoid abbreviations and industry jargon unless the CEO is known to be familiar with them

**Structure template**:

# [Topic] — One-Line Conclusion

## Key Takeaway
Summarize the most important information and recommended action in 1–2 sentences.

## Key Metrics
- Metric 1: Value + trend (↑/↓ X%)
- Metric 2: Value + gap to target

## Decisions Needed / For Your Awareness (as applicable)
- Decision 1: Option A vs Option B, recommend X, one-sentence rationale
- Decision 2: ...

## Risk Alerts (if any)
- Risk description → Impact scope → Mitigation plan

---

### VP / Department Head

**Key concerns**: Department goal attainment, resource allocation, cross-team dependencies, milestone progress, team health

**Granularity adjustment**:
- Mid-to-high level abstraction—retain key process milestones and decision context
- Can drill down to specific projects or workflows, but not to code/operational level
- Include trend data and comparisons (week-over-week, vs. targets)
- Be specific about resource and staffing information

**Language style**:
- Department-common professional terminology is fine
- Emphasize goal alignment and resource efficiency
- "API refactor is 70% done" → "Core API rework is 70% complete; remaining work needs 1 additional engineer-week from backend, expected delivery next Thursday"
- Problem descriptions should include impact assessment and resource requirements

**Structure template**:

# [Topic] Status Update

## Overall Status
One paragraph summarizing current state, whether on track, and key achievements.

## Milestone Progress

| Milestone | Status | Progress | ETA | Notes |
|---|---|---|---|---|
| Milestone 1 | In Progress | 70% | MM-DD | On track |
| Milestone 2 | Delayed | 40% | MM-DD | Brief reason |

## Key Results
- Result 1: Quantified description + business impact
- Result 2: ...

## Issues & Support Needed
- **Issue 1**: Description → Impact on goals → Resources/decisions needed
- **Issue 2**: ...

## Cross-Team Dependencies
- Dependency → Item → Current status → Expected timeline

## Next Phase Plan
List 3–5 priority items with expected outcomes, ordered by priority.

---

### Tech Lead / Architect

**Key concerns**: Technical approach, architectural impact, performance metrics, tech debt, implementation risks

**Granularity adjustment**:
- Mid-to-low level abstraction—can include technical approach comparisons and architecture decisions
- Provide specific technical metrics (QPS, latency, error rates, etc.)
- Implementation paths can be discussed, but line-by-line code-level detail is unnecessary
- Technical risks should have concrete assessments and mitigation plans

**Language style**:
- Technical terms and abbreviations are fine
- Lead with conclusions and recommendations, backed by data
- "Suggest using Redis for caching" → "Recommend adding Redis to cache hot queries; estimated P99 latency drop from 800ms to 200ms, requires 2 days dev + 1 day load testing"
- Approach comparisons should include explicit trade-off analysis

**Structure template**:

# [Topic] Technical Sync

## Summary
One sentence describing the purpose of the technical change and its current status.

## Technical Approach / Changes
Describe what was done and why. If an approach selection was involved, provide a comparison:

| Dimension | Option A | Option B |
|---|---|---|
| Performance | ... | ... |
| Complexity | ... | ... |
| Risk | ... | ... |

Recommended approach: X, rationale: ...

## Key Metrics
- Metric 1 (e.g., QPS): Before → After
- Metric 2 (e.g., P99 latency): Before → After

## Impact Scope
- Affected services/modules
- Data migration required?
- Any breaking changes?

## Risks & Mitigations
- Risk 1 → Mitigation
- Risk 2 → Mitigation

## Timeline & Dependencies
- Estimated effort: X person-days
- Prerequisites: ...
- Planned launch date: MM-DD

---

### Operations / Business Team

**Key concerns**: User impact, feature changes, launch timeline, workflow changes, data definition changes

**Granularity adjustment**:
- Mid-level abstraction—focus on user-perceivable changes and business process impact
- Remove all technical implementation details
- Timelines should be precise to the day
- If workflows change, provide before/after comparisons

**Language style**:
- Describe technical changes in business language
- "API migration" → "Data source for XX feature is switching over; no user-facing changes, but backend reports may have a 1-hour data delay"
- "Release rollback" → "XX feature is temporarily offline; expected to be restored within 2 hours"
- Avoid technical jargon; if unavoidable, add a parenthetical explanation

**Structure template**:

# [Topic] Business Sync

## One-Line Summary
Use business language to describe what happened and the impact on users/business.

## Specific Changes

### User Impact
- Change 1: What users will see or experience
- Change 2: ...
- Unaffected areas (if worth clarifying)

### Business Process Impact
- Workflow change 1: Before → After
- Workflow change 2: ...

### Data & Reporting Impact
- Data definition changes (if any)
- Report refresh timing changes (if any)

## Timeline
| Time | Event |
|---|---|
| MM-DD HH:mm | Begin XX |
| MM-DD HH:mm | Complete XX / Available to users |

## Action Items for Operations (if any)
- Action item 1: Specific task + deadline
- Action item 2: ...

## FAQ (if applicable)
- Q: If a user asks about XX, how should we respond?
- A: ...

---

## Step 3: Content Transformation and Generation

After receiving the user's raw material, apply the following transformation rules:

### Universal Transformation Rules

1. **Value translation**: Translate technical actions into the value dimensions each audience cares about
   - CEO: Business value, revenue, growth, risk
   - VP: Goal attainment, resource efficiency, team output
   - Tech: Performance, stability, maintainability, technical excellence
   - Operations: User experience, operational workflows, data accuracy

2. **Information trimming principle**:
   - If a piece of information won't affect the audience's decisions or actions, remove it
   - Better to say less and be precise than to overload with information
   - Trimmed details can go in an "Appendix" or "Contact XX for details"

3. **Data presentation**:
   - CEO: Conclusion numbers + trend direction only
   - VP: Trends + period-over-period comparisons + target comparisons
   - Tech: Specific metrics + monitoring dashboard links (if available)
   - Operations: User-perceivable changes + specific timestamps

4. **Action-oriented**: Every communication should clearly state at the end:
   - What you need from the recipient (decision, approval, action, acknowledgment)
   - When you need a response by
   - If no action is needed, explicitly state "For your information only—no response required"

### Cross-Functional Communication Add-on Rules

When communicating with someone from a different department, additionally:

1. **Provide context**: Don't assume they know your project background—include 1–2 sentences of context
2. **Translate jargon**: Your department's specialized terms may be unfamiliar to them—translate or explain
3. **Align interests**: Explain why this matters to them and what they stand to gain
4. **Minimize coordination cost**: Make any asks as specific and simple as possible—ideally actionable on the spot

## Step 4: Output and Iteration

- Generate content in the user's chosen output format
- After output, ask whether the user wants to adjust tone, add information, or generate a version for a different audience
- If the same content needs to be sent to multiple audiences, multiple versions can be generated at once

## Multi-Version Generation

The user may request multiple audience versions of the same information. In that case:

1. Start with the most detailed version (usually the technical version)
2. Progressively abstract upward to generate other versions
3. Ensure core facts remain consistent across versions—only granularity and language differ
4. Flag key information that was trimmed or simplified between versions

## Quality Checklist

After generating each piece of content, self-check the following:

- [ ] Does the information granularity match the audience's level of understanding?
- [ ] Are there any leftover technical/business details irrelevant to this audience?
- [ ] Does the core conclusion appear within the first 2 sentences?
- [ ] Is the expected action from the recipient clearly stated?
- [ ] Are factual details (data, dates, names) accurate and consistent with the source material?
- [ ] Is the language style appropriate for the audience (no out-of-place jargon)?
- [ ] Are facts consistent across multiple versions of the same event?
