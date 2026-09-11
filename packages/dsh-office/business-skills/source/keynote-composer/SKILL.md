---
name: keynote-composer
description: "Generates professional speech drafts for product launches, galas, TED-style talks, and more using the Rhetorical Triangle framework, with auto-annotated pause/tone/pace cues and delivery time estimates. Trigger when users mention writing a speech, keynote, opening remarks, or phrases like \"help me write a speech\" or \"give a talk at the gala\"."
license: MIT
---

# Keynote Composer

**One-line brief → professional speech draft**: Built on Aristotle's Rhetorical Triangle (Ethos · Pathos · Logos), generates speech drafts tailored to product launches, galas, TED-style talks, and more—with a built-in pause/tone/pace annotation system and automatic delivery time estimation.

## Quick Start

Simply describe the occasion and topic, and the Agent follows the SOP to produce a fully annotated speech draft:

```
User: Write a CEO address for our annual gala—reviewing last year's achievements and looking ahead
Agent: [Outputs a speech draft with pause/tone annotations + estimated duration per the SOP]
```

## Annotation System

Speech drafts use `【】` markers to cue the speaker on rhythm and emotion:

| Category | Example | Purpose |
|----------|---------|---------|
| Pause | `【Pause 2s】` | Seconds of silence—builds suspense or lets the audience absorb a point |
| Tone | `【Tone: passionate】` `【Tone: composed】` `【Tone: warm】` | Shifts the emotional register |
| Pace | `【Pace: slower】` `【Pace: faster】` `【Pace: resume normal】` | Adjusts speaking speed |
| Action | `【Scan the room】` `【Face the left section】` `【Walk to center stage】` | Body language and stage movement cues |
| Emphasis | `【Emphasis】` | Stress the next sentence or word |
| Interaction | `【Wait for applause】` `【Raise hand to invite audience participation】` | Audience engagement moments |

## Duration Estimation Rules

- Chinese speech pace varies by occasion (see Phase 5 parameters): product launch 230 chars/min, gala 220, TED-style 240, ceremonial 200
- English speech pace: **130 words/min** (TED-style approx. 140–160 words/min)
- Pause durations are summed separately
- Interaction segments (applause, Q&A) are estimated per annotation
- Final output format: `Estimated duration: XX min XX sec (body XX words + pauses XX sec + interaction XX sec)`

---

## SOP Workflow

### Phase 1: Context & Requirements Clarification

**Goal**: Establish the occasion, audience, purpose, and constraints.

**Steps**:

1. **Identify the speech type** and confirm which category it falls into:

   | Type | Typical Occasions | Style Characteristics |
   |------|-------------------|----------------------|
   | Product Launch | Product release, strategy announcement, brand reveal | Confident, forward-looking, tight pacing; heavy on Logos + Ethos |
   | Gala / Celebration | Annual gala address, anniversary, awards ceremony | Warm, reflective, inspiring; heavy on Pathos + Ethos |
   | TED-style | Thought leadership, industry insight, personal story | Story-driven, thought-provoking; heavy on Pathos + Logos |
   | Ceremonial | Opening/closing remarks, graduation, inaugural address | Dignified, concise, ritualistic; heavy on Ethos |

2. **Ask clarifying questions** (up to 5 key questions):
   - What is the occasion and event name?
   - What is the speaker's role/title? (Determines Ethos strategy)
   - Who is the target audience? (Employees / clients / investors / general public)
   - What is the core purpose of the speech? (Inspire / inform / persuade / celebrate)
   - What is the target duration? (If unspecified, recommend based on occasion)

3. **If the user asks to skip clarification**, proceed with sensible defaults for the occasion type and note assumptions at the top of the draft

**Output**: Speech Context Summary Card

```
📋 Speech Context Summary
- Type: [Product Launch / Gala / TED-style / Ceremonial]
- Occasion: [Event name]
- Speaker: [Role / Title]
- Audience: [Target audience]
- Core purpose: [Inspire / Inform / Persuade / Celebrate]
- Target duration: [X minutes]
- Language: [English / Chinese]
```

---

### Phase 2: Rhetorical Triangle Analysis

**Goal**: Design a persuasion strategy based on Aristotle's Rhetorical Triangle.

**The Rhetorical Triangle**:

```
         Ethos (Credibility)
        /                    \
       /   Speech Effectiveness \
      /                          \
  Pathos (Emotion) ——— Logos (Logic)
```

**Steps**:

1. **Ethos Analysis (Building Credibility)**:
   - What is the speaker's source of authority? (Title, experience, achievements, expertise)
   - How should the opening establish trust? (Introduction strategy, shared identity, humble opener)
   - Where in the speech should credibility be reinforced? (Citing data sources, referencing personal experience)
   - Output an Ethos strategy list (3–5 specific tactics)

2. **Pathos Analysis (Emotional Resonance)**:
   - What is the target emotional arc? (Starting emotion → transformation → landing emotion)
   - What are the core emotional triggers? (Stories, imagery, contrast, suspense)
   - What are the audience's emotional pain points or resonance points?
   - Output an emotional arc design: `[Opening emotion] → [Turning point] → [Climax] → [Closing emotion]`

3. **Logos Analysis (Logical Argumentation)**:
   - What is the central thesis? (One sentence capturing the speech's core message)
   - What evidence supports it? (Data, case studies, analogies, causal reasoning)
   - Choose an argument structure:
     - Timeline (Past → Present → Future)
     - Problem–Solution (Pain point → Solution → Results)
     - Tricolon (Three parallel arguments)
   - Output an argumentation framework outline

**Output**: Rhetorical Triangle Strategy Table

```
| Dimension | Core Strategy | Specific Tactics | Placement in Draft |
|-----------|---------------|------------------|--------------------|
| Ethos     | [Strategy]    | [Tactic 1, 2…]  | [Opening / Body / Close] |
| Pathos    | [Strategy]    | [Tactic 1, 2…]  | [Opening / Body / Close] |
| Logos     | [Strategy]    | [Tactic 1, 2…]  | [Opening / Body / Close] |
```

---

### Phase 3: Structure Design & Time Allocation

**Goal**: Design the overall speech structure and allocate time to each section.

**Steps**:

1. **Select a structural model** (based on occasion and rhetorical strategy):

   | Structure | Best For | Section Breakdown |
   |-----------|----------|-------------------|
   | **Classic Three-Part** | General use, gala addresses | Opening 15% · Body 70% · Close 15% |
   | **Hero's Journey** | TED-style, personal narratives | Ordinary → Challenge → Crisis → Turning Point → Transformation → Insight |
   | **Problem–Solution–Vision** | Product launches, strategy speeches | Pain point 20% · Solution 50% · Vision 30% |
   | **Monroe's Motivated Sequence** | Persuasive speeches | Attention → Need → Satisfaction → Visualization → Action |
   | **Timeline** | Retrospectives, summaries | Past 25% · Present 35% · Future 40% |

2. **Draft a section outline**:
   - For each section, note: topic sentence + rhetorical focus (E/P/L) + estimated duration
   - Map the emotional arc to corresponding sections
   - Mark positions for key pauses and interaction points

3. **Time allocation table**:

   ```
   | Section | Content Summary | Rhetorical Focus | Est. Word Count | Est. Duration |
   |---------|-----------------|-------------------|-----------------|---------------|
   | Opening | [Summary]       | E/P               | XXX words       | X min X sec   |
   | ...     | ...             | ...               | ...             | ...           |
   | Total   |                 |                   | XXX words       | X min X sec   |
   ```

**Output**: Section outline + time allocation table

---

### Phase 4: Speech Drafting (with Annotations)

**Goal**: Write the complete speech draft with embedded pause, tone, pace, and action annotations.

**Steps**:

1. **Write the opening** (Critical: the first 30 seconds determine audience attention):
   - Choose an opening strategy (by occasion):
     - Product launch: Suspense ("Today, we're about to redefine XXX")
     - Gala: Gratitude ("Standing here, looking at each of your faces…")
     - TED-style: Story ("Three years ago, late one night, I received an email…")
     - Ceremonial: Quotation ("As XXX once said…")
   - Opening annotation requirement: must include at least 1 `【Pause】` and 1 `【Tone】` marker

2. **Write the body**:
   - Draft section by section per the Phase 3 outline
   - Insert a transition sentence + `【Pause 2–3s】` between sections
   - Before key data or arguments, add `【Pace: slower】` + `【Emphasis】`
   - At emotional peaks, add `【Tone】` shift markers
   - In narrative passages, use vivid imagery and mark `【Pace: slower】`

3. **Write the closing** (Critical: the final sentence will be remembered longest):
   - Choose a closing strategy:
     - Callback (echo the opening)
     - Quotable closer (leave the audience with one shareable line)
     - Call to action (CTA)
     - Vision painting (depict a compelling future)
   - Closing annotation requirement: the last sentence must be preceded by `【Pause 3s】` + `【Tone】`

4. **Annotation density control**:
   - Average 1 annotation per 100–150 words (English) or characters (Chinese)
   - Avoid stretches longer than 300 words/characters without an annotation (the audience loses rhythm)
   - Higher annotation density in the opening and closing than in the body

**Writing Style Guidelines**:

| Occasion | Sentence Style | Preferred Rhetoric | Avoid |
|----------|----------------|-------------------|-------|
| Product Launch | Short sentences, strong rhythm | Parallelism, contrast, rhetorical questions | Long preambles, excessive modesty |
| Gala | Mix of long and short, warmth | Reminiscence, metaphor, parallelism | Empty slogans, monotonous recounting |
| TED-style | Conversational, storytelling feel | Suspense, imagery, plot twists | Reading-from-script tone, jargon overload |
| Ceremonial | Stately, well-cadenced | Quotations, balanced phrasing, parallelism | Overly colloquial, off-topic tangents |

**Output**: Fully annotated speech draft

---

### Phase 5: Duration Estimation & Final Review

**Goal**: Accurately estimate delivery time and conduct a final quality check.

**Steps**:

1. **Duration calculation**:
   - Count total words in the body text (excluding annotations)
   - Select a pace baseline by speech type:
     - Product launch: 230 chars/min (tight pacing) — for Chinese
     - Gala address: 220 chars/min (unhurried, composed) — for Chinese
     - TED-style: 240 chars/min (natural, conversational) — for Chinese
     - Ceremonial: 200 chars/min (dignified, slower) — for Chinese
     - English speeches: 130 words/min (TED-style: 140–160 words/min)
   - Sum all annotated pause durations
   - Sum estimated interaction time (applause ≈ 5–8s, Q&A ≈ 15–30s)
   - Compute total duration

2. **Duration adjustment** (if deviation from target exceeds 10%):
   - Over time: mark sections that can be cut (tag as `[Optional section]`), suggest trimming
   - Under time: mark positions for expansion, suggest adding stories/examples/interaction

3. **Rhetorical Triangle check**:
   - Ethos: Is credibility established within the first minute?
   - Pathos: Is the emotional arc complete? Is the climax around the two-thirds mark?
   - Logos: Is the central thesis clear? Is the evidence sufficient?

4. **Annotation quality check**:
   - Does the opening have tone + pause annotations?
   - Are there pause annotations at section transitions?
   - Are there tone shift annotations at emotional turning points?
   - Are there emphasis/pace annotations before key data or quotable lines?
   - Does the closing have pause + tone annotations?

**Output**:

```
📊 Duration Estimate Report
- Body word count: XXX words
- Pace baseline: XXX words/min
- Body reading time: X min X sec
- Total pauses: X sec (X instances)
- Interaction allowance: X sec (X instances)
- Estimated total duration: X min X sec
- Target duration: X minutes
- Deviation: [±X%, within range / needs adjustment]

✅ Rhetorical Triangle Check
- Ethos (Credibility): [Pass / Needs work] — [Brief note]
- Pathos (Emotion): [Pass / Needs work] — [Brief note]
- Logos (Logic): [Pass / Needs work] — [Brief note]

✅ Annotation Completeness Check
- Total annotations: X
- Annotation density: ~1 per XXX words
- Opening annotations: [Complete / Missing]
- Transition annotations: [Complete / Missing]
- Closing annotations: [Complete / Missing]
```

---

## Flow Control Rules

### Interaction Mode Selection

| User Input | Mode | Behavior |
|------------|------|----------|
| Occasion + topic only (< 50 words) | **Guided mode** | Run Phase 1 questions, wait for answers, then proceed |
| Some detail (occasion + audience + purpose) | **Semi-auto mode** | Ask 2–3 key questions while beginning rhetorical analysis |
| Detailed brief (> 200 words) | **Full-auto mode** | Skip clarification, go straight to Phase 2 |
| User says "just write it / skip the questions" | **Quick mode** | Draft the full speech based on reasonable assumptions |

### Iterative Refinement

When the user provides feedback on the draft:

1. **Content change**: Return to Phase 4 to revise the relevant section; cascade-update the duration estimate
2. **Structure change**: Return to Phase 3 to restructure; rewrite affected sections
3. **Strategy change**: Return to Phase 2 to adjust the Rhetorical Triangle strategy; redo Phases 3–5
4. **Occasion change**: Return to Phase 1 to re-clarify; restart the full workflow

After every change, re-run Phase 5 duration estimation and quality checks.

## Reference Methodologies

- **Aristotle's Rhetorical Triangle**: Ethos (credibility), Pathos (emotion), Logos (logic)—the three-dimensional persuasion framework
- **Monroe's Motivated Sequence**: Attention → Need → Satisfaction → Visualization → Action
- **Hero's Journey**: Joseph Campbell's narrative arc, ideal for TED-style speeches
- **Rule of Three**: Three parallel points are the most memorable in a speech
- **Peak-End Rule**: Audiences primarily remember the emotional peak and the ending—guides annotation density placement
