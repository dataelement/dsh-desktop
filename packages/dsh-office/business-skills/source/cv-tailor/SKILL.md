---
name: cv-tailor
description: "Optimize resumes by matching keywords to the job description, rewriting experience with the quantified STAR method, and checking ATS compatibility. Triggered when users ask for resume help, review, or polishing, mention JD matching, STAR method, ATS, or want to tailor their resume for a specific role."
license: MIT
---

# CV Tailor

**Three pillars of resume optimization**: Analyze keyword alignment against the target JD, rewrite experience bullets using the STAR method with quantified results, and run an ATS compatibility check — producing a highly targeted, high-pass-rate optimized resume.

## Quick Start

The user provides their resume (content or file) and the target JD. The agent then automatically completes the optimization following the workflow below:

```
User: Help me optimize my resume — I'm applying for this role [attaches JD + resume]
Agent: [Follows the SOP workflow and outputs optimization recommendations plus a rewritten resume]
```

## SOP Workflow

### Phase 1: Input Collection & Initial Analysis

**Goal**: Gather the user's resume and target JD; establish an optimization baseline.

**Steps**:

1. **Collect materials**:
   - Obtain the user's resume content (pasted text or file path)
   - Obtain the target JD (pasted text or role description)
   - If no JD is provided, ask about the target role direction (industry + position + level)

2. **Resume baseline parsing**:
   - Identify resume sections (education, work experience, projects, skills, etc.)
   - Count resume length, number of experience entries, and time span
   - Note the current resume format type (reverse-chronological / functional / hybrid)

3. **JD core element extraction**:
   - Job title and level
   - Core responsibilities (Top 5)
   - Hard requirements (must-haves)
   - Nice-to-haves
   - Key skill terms and industry jargon

**Output**: Resume status summary + JD element checklist

---

### Phase 2: JD Keyword Match Analysis

**Goal**: Systematically compare keyword coverage between the resume and JD to identify match gaps.

**Steps**:

1. **Categorized keyword extraction**:
   Extract three categories of keywords from the JD:

   | Category | Description | Examples |
   |----------|-------------|----------|
   | **Hard skill keywords** | Tech stack, tools, methodologies | Python, SQL, A/B testing, Scrum |
   | **Soft skill keywords** | Competency requirements | Cross-team collaboration, data-driven, project management |
   | **Industry/domain keywords** | Domain-specific terminology | DAU, conversion rate, user growth, SaaS |

2. **Match analysis**:
   Search each keyword in the resume and generate a match matrix:

   ```
   | Keyword | JD Priority | In Resume? | Location | Recommendation |
   |---------|-------------|------------|----------|----------------|
   | Python  | Required    | ✅ Yes     | Skills + Project 1 | Keep; add specific use-case context |
   | SQL     | Required    | ❌ No      | -        | Add; weave into project experience |
   ```

3. **Coverage scoring**:
   - Required keyword coverage = matched required keywords / total required keywords × 100%
   - Nice-to-have coverage = matched nice-to-have keywords / total nice-to-have keywords × 100%
   - **Benchmark**: Required keyword coverage ≥ 80% is passing, ≥ 90% is excellent

4. **Gap-fill recommendations**:
   - For each unmatched required keyword, recommend which section and entry to add it to
   - Provide specific integration approaches (add to skills section / embed in experience bullet / highlight in project outcomes)

**Output**: Keyword match matrix + coverage scores + gap-fill plan

---

### Phase 3: STAR Quantified Rewriting

**Goal**: Rewrite each experience entry using the STAR method, ensuring quantified data support.

**STAR Method Definition**:

| Element | Meaning | Checkpoint |
|---------|---------|------------|
| **S** - Situation | Context & background | When, what scenario, what scale |
| **T** - Task | Objective & responsibility | What was your role, what problem to solve |
| **A** - Action | Specific actions taken | What you did, what methods/tools you used |
| **R** - Result | Quantified outcomes | Data changes, efficiency gains, cost savings |

**Steps**:

1. **Diagnose existing entries**:
   Evaluate STAR completeness for each experience bullet:

   ```
   Original: "Responsible for user growth initiatives"

   Diagnosis:
   - S (Situation): ❌ Missing — no product or stage context
   - T (Task): ⚠️ Vague — "initiatives" is too generic
   - A (Action): ❌ Missing — no specific actions described
   - R (Result): ❌ Missing — no data whatsoever
   Score: 1/4 (severely lacking)
   ```

2. **Quantified rewriting**:
   After gathering additional details from the user, rewrite using the STAR structure:

   ```
   Rewritten: "During a user growth plateau for [Product Name] (DAU 500K+),
   led the design of a new-user activation funnel analysis framework (S+T),
   optimized 3 critical registration flow touchpoints + designed a 7-day retention incentive strategy (A),
   increasing new-user D1 retention from 32% to 45% and monthly active users by 18% within 3 months (R)"
   ```

3. **Quantification guidance**:
   If the user is unsure about specific numbers, provide prompting questions:

   | Dimension | Guiding Questions |
   |-----------|-------------------|
   | Scale metrics | How many people did you manage / product DAU / project budget |
   | Efficiency gains | How long did it take before vs. after optimization |
   | Growth metrics | Revenue / users / conversion rate change |
   | Cost savings | Money / headcount / time saved |
   | Impact scope | Users served / clients covered / teams affected |

   **Data integrity principles**:
   - All data must be based on the user's real experience — fabrication is strictly prohibited
   - If the user cannot provide exact figures, use reasonable ranges (e.g., "improved by approximately 20%–30%")
   - Encourage relative values over absolutes (e.g., "2× efficiency improvement" is safer than "saved 3.7 hours per day")

4. **Rewrite quality checklist**:
   Each rewritten entry must satisfy:
   - [ ] Contains at least 1 quantified data point
   - [ ] Covers at least 3 of the 4 STAR elements
   - [ ] Begins with an action verb (led, built, optimized, drove, designed…)
   - [ ] No longer than 3 lines (ATS readability)
   - [ ] Incorporates missing keywords identified in Phase 2

**Output**: Before/after comparison table for each entry + STAR score changes

---

### Phase 4: ATS Compatibility Check

**Goal**: Ensure the resume can pass ATS (Applicant Tracking System) automated screening.

**ATS Basics**:
ATS is the software companies use to automatically screen resumes. It parses resume text, matches keywords, and assigns scores to determine whether a resume reaches human review. Common systems include Workday, Greenhouse, Lever, Taleo, and iCIMS.

**Steps**:

1. **Format compatibility check**:

   | Check Item | Passing Standard | Common Issues |
   |------------|------------------|---------------|
   | File format | PDF or DOCX (PDF preferred) | Image-based resumes cannot be parsed |
   | Layout | Single-column, standard heading hierarchy | Multi-column layouts may parse incorrectly |
   | Fonts | Standard fonts (Arial, Calibri, Times New Roman, Helvetica) | Decorative fonts may render incorrectly |
   | Tables | Avoid complex table-based layouts | Text inside tables may be skipped |
   | Headers/footers | Keep critical info out of headers/footers | Some ATS skip header/footer regions |
   | Images/icons | Don't use images to convey key information | ATS cannot read text in images |
   | Special characters | Avoid special Unicode bullet characters | Use standard bullets (•) or hyphens (-) |

2. **Content structure check**:

   | Check Item | Passing Standard |
   |------------|------------------|
   | Section titles | Use standard headings ("Work Experience", "Education", "Projects", "Skills") |
   | Date format | Consistent format (e.g., "Jan 2023 – Jun 2024" or "2023/01 – 2024/06") |
   | Company/school names | Use full names, not abbreviations (e.g., "Amazon Web Services" not "AWS") |
   | Contact information | Include name, phone, email — placed prominently at the top |
   | File naming | Recommended format: "FirstName_LastName_TargetRole_Resume" (e.g., "John_Smith_Product_Manager_Resume.pdf") |

3. **Keyword density check**:
   - Core keywords should appear at least 2–3 times (distributed across different sections)
   - Avoid keyword stuffing (repeating the same keyword within one paragraph)
   - Use the exact phrasing from the JD (if the JD says "data analysis," don't write "data mining")

4. **ATS score output**:

   ```
   ATS Compatibility Scorecard
   ===========================
   Format Compatibility:     ██████████ 90/100
   Section Standards:        ████████░░ 80/100
   Keyword Match Rate:       ███████░░░ 70/100 (see Phase 2)
   Content Structure:        █████████░ 85/100
   ──────────────────────────
   Overall Score:            81/100 (Good)

   ⚠️ Major deductions:
   1. Uses a two-column layout (−10 pts)
   2. Missing a standalone "Skills" section (−5 pts)
   3. "Data analysis" keyword appears only once (−5 pts)
   ```

**Output**: ATS compatibility scorecard + item-by-item results + fix recommendations

---

### Phase 5: Final Optimized Output

**Goal**: Consolidate findings from all four phases into a final optimization deliverable.

**Steps**:

1. **Optimization summary**:
   ```
   Resume Optimization Summary
   ===========================
   JD Keyword Coverage:      62% → 92% (+30%)
   STAR Completeness:        Avg 1.5/4 → 3.5/4
   ATS Compatibility Score:  55/100 → 88/100
   Entries Rewritten:        6/8
   Keywords Added:           7
   ```

2. **Output the fully rewritten resume**:
   - Present the optimized resume text section by section
   - **Bold** all changed portions for easy comparison
   - Keep all factual information unchanged (schools, companies, dates, etc.)

3. **Additional recommendations** (if applicable):
   - Resume length guidance (new grads: 1 page; 3–5 years experience: 1–2 pages; 10+ years: up to 2 pages)
   - Section ordering suggestions (adjust education vs. experience placement based on career stage)
   - Channel-specific tweaks (different emphasis for recruiter / company portal / referral submissions)

**Output**: Optimization summary + fully rewritten resume + additional recommendations

---

## Workflow Control Rules

### Interaction Modes

| User Input | Mode | Behavior |
|------------|------|----------|
| Resume only, no JD | **Guided mode** | Ask about the target role and JD first, then begin analysis |
| Resume + JD | **Standard mode** | Execute Phases 1–5 in full |
| Requests a specific phase only | **Single-phase mode** | Execute only the requested Phase (e.g., ATS check only) |
| Says "just give it a quick look" | **Diagnostic mode** | Output three scores + Top 3 improvement suggestions — no full rewrite |

### Quality Checklist

Before delivering the final output, verify each item:

- [ ] Keyword match matrix is complete (covers all required JD items)
- [ ] Every rewritten entry includes at least 1 quantified data point
- [ ] STAR rewrites preserve the authenticity of the user's real experience
- [ ] No data or experience has been fabricated
- [ ] ATS check covers all format items
- [ ] Rewritten resume length is appropriate
- [ ] Keywords are woven in naturally — not force-fitted
- [ ] Contact details and sensitive information have not been leaked or altered

### Iterative Refinement

If the user provides feedback on the optimization:
1. Identify which Phase the feedback relates to
2. Re-execute from that Phase
3. Cascade updates to all downstream content
4. Maintain overall consistency (keywords, STAR rewrites, and ATS checks update in lockstep)

## Core Principles

1. **Authenticity first**: All optimizations must be based on the user's real experience — fabricating data or experience is strictly prohibited
2. **Targeted optimization**: Every change should serve JD alignment — no aimless embellishment
3. **Actionable advice**: Recommendations must be directly usable — don't say "add metrics" without guiding the user on how
4. **Privacy protection**: Remind users to redact sensitive information (phone numbers, home addresses, etc.) when sharing their resume
