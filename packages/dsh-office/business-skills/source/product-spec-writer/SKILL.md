---
name: product-spec-writer
description: "Transform one-line product ideas into complete PRD documents with user stories, feature lists, MoSCoW prioritization, and acceptance criteria. Trigger when users ask to 'write a PRD', 'turn this idea into a spec', 'flesh out requirements', or mention product requirements, user stories, feature breakdowns, or acceptance criteria."
license: MIT
---

# Product Spec Writer

**One-line idea → complete PRD**: Transforms vague product ideas into professional Product Requirements Documents with user stories, feature lists, MoSCoW prioritization, and acceptance criteria through a structured SOP workflow.

## Quick Start

The user provides a one-line description of their need, and the Agent automatically produces a full PRD following the workflow below:

```
User: I want to build an internal knowledge base system for our team
Agent: [Outputs a complete PRD following the SOP workflow]
```

## SOP Workflow

### Phase 1: Requirement Elicitation

**Goal**: Extract enough information from the user's one-line request to build a PRD.

**Steps**:

1. **Parse the raw request**: Identify the core verbs, target objects, and implicit constraints in the user's requirement
2. **Ask clarifying questions** (up to 5 key questions):
   - Who are the target users? (Internal team / external customers / both)
   - What is the core pain point? (How is it done today, and what's wrong with it)
   - Are there any reference products or competitors?
   - Are there hard constraints? (Timeline, budget, tech stack, compliance requirements)
   - What does success look like? (Key metrics)
3. **If the user asks to skip clarification**, proceed based on reasonable assumptions and document them in the "Assumptions & Constraints" section of the PRD

**Output**: A requirement background summary (200 words or fewer)

---

### Phase 2: User Personas & Stories

**Goal**: Identify all key roles and write user stories for each.

**Steps**:

1. **Identify user personas**:
   - List 2–5 core personas
   - Describe each persona in one sentence covering their identity, goal, and pain point
   - Format:

     ```
     **Persona Name**: [One-line description]
     - Role: [Title / Role]
     - Core Goal: [What they want to achieve]
     - Primary Pain Point: [What problem they face today]
     ```

2. **Write user stories**:
   - At least 3 user stories per persona
   - Standard format: **As a** [persona], **I want to** [capability], **so that** [value/purpose]
   - Each user story must satisfy the INVEST principles:
     - **I**ndependent: Stories should be self-contained with no inherent dependencies
     - **N**egotiable: Stories should not prescribe implementation details
     - **V**aluable: Stories must deliver clear value to the user
     - **E**stimable: The team should be able to estimate the effort
     - **S**mall: Completable within a single iteration
     - **T**estable: Has a clear way to verify completion

3. **Story map layout**: Arrange stories along the user journey timeline to identify the critical path

**Output**: Persona table + User story list

---

### Phase 3: Feature Decomposition

**Goal**: Convert user stories into a concrete feature list, distinguishing functional and non-functional requirements.

**Steps**:

1. **Functional Requirements**:
   - Extract specific features from each user story
   - Each feature includes:
     - Feature ID (F-001, F-002...)
     - Feature name
     - Associated user story ID
     - Feature description (one sentence explaining what it does)
     - Input / Output / Interaction notes

2. **Non-Functional Requirements**:
   - Review each of the following dimensions and mark those that apply:

     | Dimension | Checklist |
     |-----------|-----------|
     | Performance | Response time, concurrency, throughput |
     | Security | Authentication, authorization, data encryption, compliance |
     | Availability | SLA, disaster recovery, backup & restore |
     | Scalability | User growth, data growth, feature extensibility |
     | Usability | Learning curve, accessibility, localization |
     | Compatibility | Browsers, devices, operating systems, API versions |

3. **Feature dependencies**: Map out the dependencies between features (which features must be built first)

**Output**: Functional requirements table + Non-functional requirements table + Dependency diagram

---

### Phase 4: MoSCoW Prioritization

**Goal**: Classify all features using the MoSCoW framework.

**MoSCoW Framework Definitions**:

| Priority | Meaning | Criteria | Suggested Proportion |
|----------|---------|----------|----------------------|
| **Must Have** | Essential | Without it the product cannot launch or the core user flow breaks | ~60% |
| **Should Have** | Important | Important but not fatal; a workaround can serve in the short term | ~20% |
| **Could Have** | Nice to have | Enhances the experience but the product works fine without it | ~15% |
| **Won't Have (this time)** | Out of scope | Explicitly excluded to prevent scope creep; deferred to a future release | ~5% |

**Steps**:

1. **Evaluate each feature** by answering three questions:
   - Can the product launch without this feature? (No → Must)
   - Will users be noticeably dissatisfied without it? (Yes → Should)
   - Is there a clear workaround for this feature? (Yes → Could / Won't)

2. **Priority validation**:
   - Must Have should not exceed 60% of total features (if it does, features need further decomposition)
   - Won't Have must include at least 1–2 items (proof that trade-offs were made)
   - Verify that the dependency chain among Must Have features is complete

3. **Output a priority matrix table**:

   ```
   | Feature ID | Feature Name | Priority | Rationale |
   |------------|--------------|----------|-----------|
   | F-001      | xxx          | Must     | xxx       |
   ```

**Output**: MoSCoW priority matrix

---

### Phase 5: Acceptance Criteria

**Goal**: Write testable acceptance criteria for every Must Have and Should Have feature.

**Steps**:

1. **Use Given-When-Then format**:
   ```
   Feature: F-001 User Login

   AC-F001-01: Successful login
   Given the user is registered and their account is active
   When the user enters a valid email and password and clicks Login
   Then the system navigates to the homepage and displays the user's nickname

   AC-F001-02: Incorrect password
   Given the user is registered
   When the user enters an incorrect password and clicks Login
   Then the system displays "Incorrect email or password" without revealing which is wrong
   ```

2. **Acceptance criteria checklist** (every AC must satisfy these):
   - [ ] Does it describe behavior only, without specifying implementation?
   - [ ] Can it be independently verified (no dependency on other ACs)?
   - [ ] Does it cover the happy path and at least one error path?
   - [ ] Are boundary conditions explicit (numeric ranges, character limits, null handling)?
   - [ ] Does it have a concrete expected result (not vague phrases like "works correctly")?

3. **Coverage requirements**:
   - Must Have features: at least 3 ACs each (happy path + error path + boundary)
   - Should Have features: at least 2 ACs each (happy path + error path)
   - Could Have features: at least 1 AC each (happy path)

**Output**: Acceptance criteria list, grouped by feature

---

### Phase 6: Document Assembly & Output

**Goal**: Assemble the outputs from the five preceding phases into a complete PRD document.

**PRD Document Template**:

```markdown
# [Product Name] — Product Requirements Document (PRD)

> Version: v1.0 | Author: [Fill in] | Date: [Current date]
> Status: Draft

## 1. Overview

### 1.1 Background & Motivation
[Phase 1 requirement background summary]

### 1.2 Objectives
- Business objective: [What business outcome to achieve]
- User objective: [What user problem to solve]
- Success metrics: [KPIs / North Star metric]

### 1.3 Scope
- In scope: [Overview of Must + Should features]
- Out of scope: [Won't Have list with reasons]

## 2. User Personas

[Phase 2 persona table]

## 3. User Stories

[Phase 2 user story list, grouped by persona]

## 4. Functional Requirements

### 4.1 Feature List
[Phase 3 functional requirements table]

### 4.2 Non-Functional Requirements
[Phase 3 non-functional requirements table]

### 4.3 Feature Dependencies
[Phase 3 dependency diagram]

## 5. Prioritization

### 5.1 MoSCoW Matrix
[Phase 4 priority matrix table]

### 5.2 Release Planning Recommendations
- MVP (v1.0): All Must Have items
- v1.1: All Should Have items
- v2.0: Evaluate Could Have items

## 6. Acceptance Criteria

[Phase 5 acceptance criteria list, grouped by feature]

## 7. Assumptions & Constraints

### 7.1 Assumptions
- [List all assumptions, especially those made in Phase 1 due to insufficient information]

### 7.2 Constraints
- Technical constraints: [If any]
- Business constraints: [If any]
- Timeline constraints: [If any]

### 7.3 Risks
| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| xxx  | High   | Medium     | xxx        |

## 8. Open Questions
- [ ] [Question to confirm 1]
- [ ] [Question to confirm 2]

## Appendix
- Glossary (if domain-specific terminology is used)
- Reference document links
```

**Document output requirements**:
- All tables must use Markdown format
- Feature IDs must be globally unique and sequential
- User story IDs and feature IDs must have a clear mapping
- Acceptance criteria ID format: AC-[Feature ID]-[Sequence] (e.g., AC-F001-01)
- Dates must use the actual current date

---

## Workflow Control Rules

### Interaction Mode Selection

Choose the mode based on the level of detail in the user's input:

| User Input | Mode | Behavior |
|------------|------|----------|
| Just one line (< 50 words) | **Guided mode** | Run Phase 1 questions, wait for answers, then continue |
| Some detail (50–200 words) | **Semi-auto mode** | Ask 2–3 key questions while starting Phase 2 in parallel |
| Detailed description (> 200 words) | **Full-auto mode** | Skip clarification, start directly from Phase 2 |
| User says "just write it / don't ask" | **Quick mode** | Output the full PRD based on reasonable assumptions |

### Quality Checklist

Before delivering the final PRD, verify each item:

- [ ] Every persona has at least 3 user stories
- [ ] Every user story maps to at least 1 feature
- [ ] Every feature has a MoSCoW priority
- [ ] Must Have features do not exceed 60% of the total
- [ ] Won't Have includes at least 1 item
- [ ] Every Must Have feature has at least 3 acceptance criteria
- [ ] Acceptance criteria use Given-When-Then format
- [ ] Assumptions & Constraints section is not empty
- [ ] Open Questions section is not empty (there are always unconfirmed items)
- [ ] All IDs are sequential with no gaps

### Iterative Refinement

When the user provides feedback on the PRD:
1. Identify which Phase the feedback relates to
2. Re-execute from that Phase
3. Cascade updates to all downstream content
4. Maintain consistency of the numbering system

## Reference Methodologies

This SOP draws on the following product management methodologies:

- **User Story Mapping** (Jeff Patton): Organizing stories along the user journey
- **MoSCoW Prioritization** (DSDM / Agile): Requirements prioritization framework
- **INVEST Principle**: User story quality standard
- **Behavior-Driven Development (BDD)**: Given-When-Then acceptance criteria format
- **Kano Model** (reference): Requirements classification thinking (Basic → Must, Performance → Should, Excitement → Could)
