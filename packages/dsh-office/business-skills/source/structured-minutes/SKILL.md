---
name: structured-minutes
description: "Transforms raw meeting materials (transcripts, notes, chat logs) into structured minutes by automatically extracting agenda topics, discussion highlights, decisions, and action items with owners and deadlines. Use when a user provides a transcript, notes, or chat log and asks to create meeting minutes, summarize a meeting, extract action items, recap a discussion, or clean up a transcript."
license: MIT
---

# Structured Minutes — Raw Notes to Structured Minutes SOP

Transforms raw meeting materials (transcripts, notes, chat logs) into professional, structured meeting minutes with automatic extraction of topics, decisions, and action items.

## Quick Start

1. User provides raw meeting material (transcript / notes / pasted text)
2. Agent processes step by step following the SOP below
3. Outputs structured minutes; optionally runs `scripts/validate_minutes.py` to verify completeness
4. After user confirmation, exports as a Markdown file

---

## SOP Workflow

### Phase 1: Input Collection & Preprocessing

**Goal**: Identify the type of source material and fill in any missing metadata.

**Steps**:

1. **Identify the material type** and confirm with the user:
   - Speech-to-text transcript (ASR transcript)
   - Handwritten notes
   - IM chat log (Slack / Teams / Discord / etc.)
   - Mixed materials

2. **Extract or ask for metadata** (all fields are required):

   | Field | Description | Example |
   |-------|-------------|---------|
   | Meeting Title | Topic of the meeting | Q2 Product Review |
   | Date | YYYY-MM-DD format | 2026-04-14 |
   | Time | HH:MM-HH:MM | 14:00-15:30 |
   | Location / Format | Physical room or online tool | Zoom Meeting |
   | Facilitator | Meeting organizer | Alice Chen |
   | Recorder | Person writing the minutes | AI-assisted |
   | Attendees | List of all participants | Alice, Bob, Carol |

3. **If any of the above fields are missing from the material**, proactively ask the user to fill them in. Do not guess attendees or dates.

---

### Phase 2: Topic Identification & Segmentation

**Goal**: Split the continuous meeting content into distinct agenda topics.

**Method**:

1. **Read through the entire text** and identify topic transition points. Common signals:
   - Explicit topic introductions ("Next topic", "Moving on to", "Regarding XX")
   - Speaker change + subject change
   - Timestamp jumps (if available)

2. **Number and name each topic** using this format:
   ```
   Topic 1: [Concise title, ≤ 10 words]
   Topic 2: [Concise title, ≤ 10 words]
   ...
   ```

3. **Special handling rules**:
   - If a topic was interrupted and revisited later, merge into a single topic
   - Brief small talk or off-topic chat should not become a standalone topic — ignore or group under "Other"
   - Even if the entire meeting covers only one subject, explicitly label it as "Topic 1"

4. **Present the topic list to the user for confirmation** before proceeding.

---

### Phase 3: Deep Extraction per Topic

**Goal**: Extract structured information for each topic.

**For each topic, extract using the following template**:

```markdown
### Topic N: [Title]

**Background**: (1-2 sentences — why this was discussed)

**Discussion Highlights**:
- [Point 1]: [Key opinion / data / proposal] (Speaker: XX)
- [Point 2]: [Key opinion / data / proposal] (Speaker: XX)
- ...

**Disagreements**: (if any)
- [Issue]: Side A argues… / Side B argues…

**Decisions**:
- ✅ [Clear decision, stated as a declarative sentence]
- ✅ [List each decision separately if there are multiple]

**Action Items**:
| # | Task Description | Owner | Deadline | Priority |
|---|------------------|-------|----------|----------|
| 1 | [Specific, actionable task] | [Name] | YYYY-MM-DD | High/Med/Low |
```

**Extraction rules**:

- **Discussion Highlights**: Retain key information; remove repetitive or overly colloquial content. Each point ≤ 50 words.
- **Decisions**: Must be an agreed-upon outcome, not "to be continued." If no clear decision was reached, note "**Pending**: needs [condition] before revisiting."
- **Action item criteria** (all of the following must be met):
  - Has a clear "what to do" (verb + object)
  - Has a clear or inferable owner
  - Is a specific, executable task — not a directional statement
- **Deadline handling**:
  - Explicitly mentioned in the transcript → use directly
  - Vague expressions like "next week" / "end of month" → convert to a specific date and mark `(estimated)`
  - Not mentioned at all → mark "TBD" and flag it for the user in notes
- **Priority assessment**:
  - High: Blocks other work / has a clearly urgent deadline / was emphasized repeatedly
  - Medium: Has a deadline but not urgent / routine follow-up
  - Low: Nice-to-have / exploratory task

---

### Phase 4: Cross-Topic Global Extraction

**Goal**: Extract information that spans across topics.

1. **Open Issues** (items with no conclusion that need further discussion):
   ```markdown
   ## Open Issues
   | # | Description | Related Topic | Next Steps |
   |---|-------------|---------------|------------|
   | 1 | [Issue] | Topic N | [Discuss next meeting / Waiting on XX for more info] |
   ```

2. **Risk Alerts** (potential risks identified during the summarization process):
   ```markdown
   ## ⚠️ Risk Alerts
   - [Risk 1]: [Description] (Source: Topic N)
   - [Risk 2]: [Description]
   ```
   Common risk signals: deadline conflicts, insufficient resources, unclear dependencies, action items with no owner.

3. **Key Metrics** (specific numbers mentioned during the meeting):
   ```markdown
   ## Key Metrics
   - [Metric name]: [Value] (Source: Topic N)
   ```

---

### Phase 5: Assembly & Output

**Goal**: Assemble all extracted results into complete minutes.

**Output template**:

```markdown
# Meeting Minutes: [Meeting Title]

| Field | Details |
|-------|---------|
| Date | YYYY-MM-DD |
| Time | HH:MM - HH:MM |
| Location | [Location / online tool] |
| Facilitator | [Name] |
| Recorder | [Name] |
| Attendees | [List of names] |

---

## Topic Overview

| Topic | Decision Status | Action Items |
|-------|----------------|--------------|
| Topic 1: [Title] | ✅ Decided / ⏳ Pending | N |
| Topic 2: [Title] | ✅ Decided / ⏳ Pending | N |

---

## Detailed Record

### Topic 1: [Title]
(Full content extracted in Phase 3)

### Topic 2: [Title]
(Full content extracted in Phase 3)

---

## Action Items Summary

| # | Task Description | Owner | Deadline | Priority | Source Topic |
|---|------------------|-------|----------|----------|--------------|
| 1 | [Task] | [Name] | YYYY-MM-DD | High/Med/Low | Topic N |
| ... | | | | | |

## Open Issues
(Phase 4 content)

## ⚠️ Risk Alerts
(Phase 4 content — omit this section if none)

## Key Metrics
(Phase 4 content — omit this section if none)
```

---

### Phase 6: Quality Check

**Goal**: Ensure the minutes are complete, accurate, and actionable.

**Automated checklist** (check each item and report):

- [ ] All metadata fields are filled (no "unknown" or blank values)
- [ ] Every topic has a decision (even if marked "Pending")
- [ ] Every action item has an owner (no "TBD" owners)
- [ ] Every action item has a deadline (may be "TBD" but must be noted)
- [ ] Action items summary count = sum of per-topic action items
- [ ] No names appear that were not mentioned in the source material (guard against hallucination)
- [ ] Date format is consistently YYYY-MM-DD
- [ ] Data cited in the minutes matches the source

**Validation script**: After completing the minutes, you can run `scripts/validate_minutes.py` to perform structural validation on the output Markdown file.

```bash
python3 scripts/validate_minutes.py <minutes_file.md>
```

The script checks:
- Whether required sections are present
- Whether the action item table format is complete
- Whether deadline formats are valid
- Whether owner fields are empty
- Whether topic overview and detailed record counts match

---

### Phase 7: Delivery & Follow-up

1. **Present the minutes to the user for review**, focusing on:
   - "Are the action items accurate? Anything missing?"
   - "Do the decisions reflect what was actually discussed?"
   - "Is there anything that needs to be added or changed?"

2. **Revise based on user feedback** until the user is satisfied.

3. **Export options**:
   - Save as a Markdown file
   - If the user needs another format (Google Docs, Word, etc.), suggest using the corresponding skill for conversion

---

## Configuration

This skill requires no external parameters. The following are optional customizations:

| Setting | Default | Description |
|---------|---------|-------------|
| Language | English | Output language for the minutes; follows the source material language |
| Action Item Priority | Enabled | Whether to label priorities (High / Med / Low) |
| Risk Alerts | Enabled | Whether to generate the risk alerts section |
| Key Metrics | Enabled | Whether to extract numbers/metrics mentioned in the meeting |

---

## Common Scenarios

### Scenario 1: Transcript Cleanup
User pastes a transcript exported from Otter.ai, Fireflies, or a similar tool. Agent follows the SOP to produce structured minutes.

### Scenario 2: Chat Log Organization
User pastes a Slack thread or Teams chat. Agent identifies topics and extracts action items.

### Scenario 3: Handwritten Notes
User pastes bullet points jotted down during the meeting. Agent adds structure and confirms any gaps.

### Scenario 4: Cross-Timezone Multilingual Meeting
User provides a transcript in any language. Agent processes it with the same workflow and outputs minutes in the user's preferred language.
