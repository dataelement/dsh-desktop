---
name: podcast-episode-writer
description: "Creates complete, structured podcast scripts with timestamps for intros, segmented topics, transitions, prepared questions, and closing CTAs. Triggered by requests like 'help me write a podcast episode', 'plan my script', or keywords such as podcast script, outline, intro, CTA, or episode planning."
license: MIT
---

# Podcast Episode Writer — Podcast Script Generation SOP

Generate a complete, structured podcast script based on the user's topic, guest information, and show positioning. The script covers the intro, segmented topics, transitions, prepared questions, and closing CTA, with timestamp markers on every section.

## Quick Start

1. User provides basic information: podcast topic, guest details, target duration, etc.
2. Agent follows the SOP below to generate the script step by step
3. Output a complete podcast script with timestamps
4. Once confirmed, export as a Markdown file

---

## SOP Workflow

### Phase 1: Requirements Gathering

**Goal**: Establish the podcast's basic parameters and style positioning.

**Steps**:

1. **Collect basic information** — confirm the following fields with the user:

   | Field | Description | Example |
   |-------|-------------|---------|
   | Podcast Name | Show name | "The Startup Files" |
   | Episode Topic | Core topic for this episode | How AI is changing content creation |
   | Format | Solo / Interview / Roundtable | Interview (host + 1 guest) |
   | Guest Info | Name, title, relevance to topic | Jane Smith, CTO at an AI company |
   | Target Duration | Total show length (minutes) | 45 minutes |
   | Target Audience | Core listener profile | 25-35 year old tech professionals |
   | Tone & Style | Casual / Professional / Deep-dive / Humorous | Casual-professional, moderately witty |
   | Distribution Platform | Apple Podcasts / Spotify / YouTube etc. | Spotify + Apple Podcasts |

2. **If the user only provides a topic**, use the following defaults and inform them:
   - Format: Interview (host + guest)
   - Target duration: 30 minutes
   - Tone: Casual-professional
   - Remaining fields marked "TBD"

3. **Confirm sub-topics**: Based on the main topic, suggest 3–5 discussion sub-topics for the user to select or adjust.

---

### Phase 2: Script Structure Planning

**Goal**: Plan the time allocation across script sections based on duration and topics.

**Time allocation template** (percentages, adaptable to any duration):

| Section | Share | 30-min Example | 45-min Example |
|---------|-------|----------------|----------------|
| Intro | 8–10% | 2–3 min | 3–4 min |
| Topic 1 | 20–25% | 6–8 min | 9–11 min |
| Transition 1→2 | 2–3% | ~1 min | ~1 min |
| Topic 2 | 20–25% | 6–8 min | 9–11 min |
| Transition 2→3 | 2–3% | ~1 min | ~1 min |
| Topic 3 | 20–25% | 6–8 min | 9–11 min |
| Transition 3→Close | 2–3% | ~1 min | ~1 min |
| Closing + CTA | 8–10% | 2–3 min | 3–4 min |

**Rules**:
- Adjust topic count by duration: ≤20 min → 2 topics, 21–40 min → 3 topics, >40 min → 3–4 topics
- Each topic should have 2–4 prepared questions
- Show the time plan to the user for confirmation before proceeding

---

### Phase 3: Writing the Intro

**Goal**: Craft an attention-grabbing intro with a show introduction and episode preview.

**Intro structure**:

```markdown
## Intro
**[00:00 - {end timestamp}]**

### 1. Hook (first 15 seconds)
> [Open with a compelling question, statistic, or story that makes listeners want to keep listening]

### 2. Show Introduction (15–30 seconds)
> Welcome to "{Podcast Name}", I'm your host {Host Name}.
> [One sentence describing the show's positioning]

### 3. Episode Preview (30–60 seconds)
> Today we're talking about: {Topic}.
> [Briefly explain why this topic matters and build anticipation]

### 4. Guest Introduction (if applicable, 30–60 seconds)
> Today's guest is {Guest Name}, {one-line guest bio}.
> [A casual icebreaker question to help the guest ease in naturally]
```

**Writing rules**:
- The hook must create curiosity within the first 15 seconds. Common techniques: counterintuitive data, vivid scenarios, provocative viewpoints
- Tone should match the style established in Phase 1
- Guest introduction should highlight their relevance to this episode's topic, not a generic résumé
- All text should include timestamps in `[MM:SS]` format

---

### Phase 4: Writing Topic Segments & Prepared Questions

**Goal**: Create a detailed discussion framework and prepared questions for each topic segment.

**Structure for each topic segment**:

```markdown
## Topic N: {Topic Title}
**[{start timestamp} - {end timestamp}]**

### Topic Lead-in
> [1–2 sentences introducing the topic and why it's important or interesting]

### Prepared Questions

**Q1 (Icebreaker / Warm-up)**: [{A lighter, easy-to-answer question to get the guest talking}]
- Expected directions: [2–3 directions the guest might take]
- Follow-up options: [Follow-ups if the answer is too brief or goes off track]

**Q2 (Deep Dive)**: [{A question that pushes the discussion toward core insights}]
- Expected directions: [Core insights or experiences you hope the guest shares]
- Follow-up options: [Follow-ups to dig into details]

**Q3 (Practical / Case Study)**: [{A question asking for a specific case study or methodology}]
- Expected directions: [Types of cases you're looking for]
- Follow-up options: [Follow-ups to get the guest to elaborate]

**Q4 (Debate / Forward-looking, optional)**: [{A somewhat controversial or forward-looking question}]
- Expected directions: [Interesting discussions this might spark]

### Host Notes
- [Pacing checkpoints for this segment]
- [Backup plan if the guest gets carried away and runs long]
- [Core takeaway to make sure this segment lands on before wrapping up]
```

**Question design rules**:
- Questions progress from shallow to deep: Icebreaker → Deep Dive → Practical → Forward-looking
- Avoid yes/no questions ("Do you think AI is good?"). Use open-ended questions
- Each question includes "expected directions" and "follow-up options" to prevent dead air
- Questions should build on each other logically, not be randomly listed
- For solo episodes: replace "questions" with "talking points", noting the core argument and supporting material for each

---

### Phase 5: Writing Transitions

**Goal**: Write natural, smooth transitions between topics to avoid jarring switches.

**Transition template** (15–30 seconds each):

```markdown
## Transition: Topic N → Topic N+1
**[{timestamp}]**

> [Transition approach: select the most natural one from the 5 techniques below]
```

**5 transition techniques**:

| Technique | Best For | Example |
|-----------|----------|---------|
| Summarize & Bridge | The previous topic has a clear conclusion | "We just talked about X, and that actually raises a deeper question…" |
| Contrast Pivot | Two topics have a contrasting relationship | "We've covered the upside of A — but what about the flip side?" |
| Listener Perspective | Need to re-engage listener attention | "I think a lot of listeners are probably wondering…" |
| Guest Callback | The guest mentioned something relevant earlier | "You mentioned Y earlier, and that makes me think of…" |
| Tone Shift | The previous topic was heavy | "Alright, let's shift to a lighter angle…" |

**Rules**:
- Adjacent transitions must not use the same technique
- Each transition should both recap the previous topic's key point and preview the next topic
- Keep it conversational — avoid a written/formal tone

---

### Phase 6: Writing the Closing & CTA

**Goal**: Write a strong closing summary and clear calls to action.

**Closing structure**:

```markdown
## Closing + CTA
**[{start timestamp} - {end timestamp}]**

### 1. Recap (60–90 seconds)
> Today we covered three topics:
> - {Topic 1}: The key takeaway is…
> - {Topic 2}: The key takeaway is…
> - {Topic 3}: The key takeaway is…

### 2. Guest Quote / Sign-off (30 seconds, if guest is present)
> Finally, {Guest}, can you leave our listeners with one piece of advice?
> [Leave space for guest's response]

### 3. CTA — Calls to Action (30–60 seconds)
> **CTA 1 (Engagement)**: [Encourage listener participation — e.g., comment topic, poll]
> Example: "Do you think AI will replace content creators? Let us know in the comments."
>
> **CTA 2 (Subscribe / Follow)**: [Encourage subscription or follow]
> Example: "If this episode gave you something to think about, hit subscribe — we'll be back next week."
>
> **CTA 3 (Resource, optional)**: [Direct listeners to show notes, community, etc.]
> Example: "All the resources mentioned today are linked in the show notes."

### 4. Sign-off (15 seconds)
> [A consistent closing line to build brand recognition]
> Example: "Thanks for listening to '{Podcast Name}' — see you next time."
```

**CTA design rules**:
- Every episode must include at least 1 engagement CTA + 1 subscribe CTA
- CTAs should be specific and actionable — tell listeners "do this", not "I hope you'll…"
- Resource CTAs are included based on whether relevant materials exist
- CTA tone should feel natural — avoid sounding overly salesy

---

### Phase 7: Assembling the Full Script

**Goal**: Combine all sections into a complete script with timestamps.

**Output template**:

```markdown
# Podcast Script: {Episode Topic}

| Field | Content |
|-------|---------|
| Podcast Name | {Podcast Name} |
| Episode Topic | {Topic} |
| Format | {Solo / Interview / Roundtable} |
| Guest | {Guest info, if applicable} |
| Target Duration | {N} minutes |
| Target Audience | {Audience description} |
| Tone & Style | {Style} |

---

## Timeline Overview

| Timecode | Section | Summary |
|----------|---------|---------|
| [00:00-{T1}] | Intro | Hook + Show intro + Guest intro |
| [{T1}-{T2}] | Topic 1 | {Topic 1 title} |
| [{T2}-{T3}] | Transition | {Transition technique} |
| [{T3}-{T4}] | Topic 2 | {Topic 2 title} |
| [{T4}-{T5}] | Transition | {Transition technique} |
| [{T5}-{T6}] | Topic 3 | {Topic 3 title} |
| [{T6}-{T7}] | Transition | {Transition technique} |
| [{T7}-{END}] | Closing + CTA | Recap + Calls to action |

---

## Full Script

(Insert all content from Phases 3–6 sequentially, preserving timestamp markers)

---

## Appendix

### Show Notes Template
- Episode topic: {Topic}
- Guest: {Guest info}
- Timeline: (copy from Timeline Overview)
- Resources & links mentioned:
  - [Resource 1]
  - [Resource 2]
- Contact: {Social media / Email}

### Pre-Recording Checklist
- [ ] Guest has confirmed recording time
- [ ] Equipment / software tested
- [ ] Script shared with guest for preview (optional)
- [ ] Backup topics prepared in case of dead air
```

---

### Phase 8: Review & Delivery

**Automated checklist** (check each item and report):

- [ ] Timestamps are sequential with no overlaps; total equals target duration (±2 min tolerance)
- [ ] Each topic segment has ≥2 prepared questions
- [ ] Each prepared question has "expected directions" and "follow-up options"
- [ ] Number of transitions = number of topics (including the transition into the closing)
- [ ] Intro includes Hook + Show introduction + Episode preview
- [ ] Closing includes ≥1 engagement CTA + ≥1 subscribe CTA
- [ ] Timestamp format is consistent: `[MM:SS]` or `[MM:SS - MM:SS]`
- [ ] Tone and style match the Phase 1 settings

**Delivery workflow**:

1. Present the full script to the user for review, focusing on:
   - "Does the topic order and question flow make sense?"
   - "Does the tone match your expectations?"
   - "Do the CTAs need adjustment?"

2. Revise based on user feedback until confirmed.

3. Export options:
   - Save as a Markdown file
   - If another format is needed, suggest the appropriate skill for conversion

---

## Parameters

This skill requires no external parameters or API keys. The following are optional customization settings:

| Setting | Default | Description |
|---------|---------|-------------|
| Language | English | Script output language; can switch to other languages |
| Topic Depth | Standard | Standard (2–3 questions per topic) / Deep (3–4 questions per topic) |
| CTA Style | Gentle | Gentle / Direct / Humorous |
| Timestamp Precision | Minutes | Minutes `[MM:SS]` / Seconds `[MM:SS]` (down to 15-second increments) |

---

## Common Scenarios

### Scenario 1: Tech Interview Podcast
Host and guest discuss a technology trend. 45 minutes, 3 topics, casual-professional style.

### Scenario 2: Personal Growth Solo Podcast
Solo host shares methodologies and reflections. 20 minutes, 2 topics, thoughtful deep-dive style.

### Scenario 3: Business Roundtable Podcast
3 guests discuss industry trends. 60 minutes, 4 topics, professional and rigorous style.

### Scenario 4: Casual Conversational Podcast
Relaxed interview format. 30 minutes, 3 topics, casual & insightful style.
