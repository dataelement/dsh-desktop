---
name: dev-guide-generator
description: "Generates complete technical tutorials from prerequisites and environment setup to core steps, troubleshooting, and a final cheatsheet. Trigger on requests to write a tutorial, create a setup guide, organize steps for beginners, or keywords like step-by-step, quickstart, or how-to guide."
license: MIT
---

# Dev Guide Generator

**One topic → complete technical tutorial**: Through a structured SOP workflow, transform a technical topic into a comprehensive tutorial covering prerequisites, environment setup, core steps, common error troubleshooting, and advanced topics — all accompanied by a cheatsheet.

## Quick Start

The user simply provides a technical topic or operational goal, and the Agent automatically generates a complete tutorial following this workflow:

```
User: Help me write a Docker beginner's tutorial
Agent: [Outputs complete technical tutorial + Cheatsheet following the SOP workflow]
```

## SOP Workflow

### Phase 1: Topic Scoping & Audience Analysis

**Goal**: Define the tutorial's technical subject, target audience, and scope boundaries.

**Steps**:

1. **Parse the topic**: Identify the core technology, operational goals, and expected deliverables from the user's input
2. **Ask clarifying questions** (up to 4 key questions):
   - What is the target audience's technical level? (Complete beginner / Some experience / Experienced developer)
   - What operating system will the reader be using? (macOS / Windows / Linux / Any)
   - What should the reader be able to do after completing the tutorial? (Specific deliverable)
   - Are there any version or tech stack constraints?
3. **If the user asks to skip clarification**, proceed with these default assumptions:
   - Audience: Has basic programming experience but is unfamiliar with the topic technology
   - Environment: Cover both macOS and Linux (note Windows differences where necessary)
   - Goal: Be able to independently complete a minimal working example

**Output**: Tutorial metadata summary (topic, audience, objective, scope — no more than 150 words)

---

### Phase 2: Prerequisites

**Goal**: List all knowledge and tools the reader needs before starting this tutorial, ensuring there are no knowledge gaps.

**Steps**:

1. **Dependency analysis**:
   - List all technical concepts involved in this tutorial
   - For each concept, determine whether it should be "explained within the tutorial" or "assumed as prior knowledge"
   - Decision rule: If explaining it would digress more than 200 words from the main topic, classify it as a prerequisite

2. **Prerequisites checklist**:
   - Categorize into "Must know" and "Nice to know" tiers
   - Attach a one-line explanation for each: "why you need it"
   - Format:

     ```
     **Must know**:
     - [Concept]: [Why you need it] (Recommended resource)

     **Nice to know**:
     - [Concept]: [What aspects of the tutorial it relates to]
     ```

3. **Self-check rules**:
   - If prerequisites exceed 5 items, consider narrowing the tutorial scope or splitting into a series
   - Every prerequisite must have a publicly available learning resource

**Output**: Tiered prerequisites checklist

---

### Phase 3: Environment Setup

**Goal**: Provide a reproducible environment configuration path so the reader is fully set up before starting the core steps.

**Steps**:

1. **Environment inventory**: List all tools to install/configure with recommended versions
   - Format: `Tool name  Version requirement (e.g., >= x.y) | Purpose`
   - Clearly distinguish "required" from "optional" installations

2. **Installation steps**: Provide commands for each operating system
   - Precede each command with a one-line explanation of what it does
   - Use only officially recommended methods or mainstream package managers
   - Format:

     ```
     **macOS**:
     # Install xxx (via Homebrew)
     brew install xxx

     **Linux (Ubuntu/Debian)**:
     # Install xxx (via apt)
     sudo apt update && sudo apt install -y xxx
     ```

3. **Environment verification**: Provide a verification command and expected output after each tool installation
   - Format:

     ```
     # Verify installation
     xxx --version
     # Expected output: xxx x.y.z
     ```

4. **Self-check rules**:
   - All installation commands must come from official documentation or mainstream package managers — no third-party scripts
   - Never include real API keys, passwords, tokens, or other sensitive values
   - When configuration files are involved, use placeholders (e.g., `YOUR_API_KEY`) and explain how to obtain the real value

**Output**: OS-specific installation and configuration guide + verification commands

---

### Phase 4: Core Steps

**Goal**: Walk the reader through the core operations in a progressive structure, where each step can be independently verified.

**Steps**:

1. **Step planning**:
   - Break the entire operation into 5–10 steps (each focused on one sub-goal)
   - Order steps strictly by dependency
   - Each step includes: step number, title, and objective statement

2. **Step writing format**:

   ```
   #### Step N: [Step Title]

   **Objective**: [What state is achieved after this step]

   **Actions**:
   [Code block or operational instructions]

   **Explanation**:
   - [Line-by-line or section-by-section explanation of key parts]

   **Verification**:
   [What command to run / what result to check to confirm success]
   Expected output: [Specific expected result]
   ```

3. **Writing guidelines**:
   - Code blocks must specify the language (e.g., ```bash, ```python)
   - Placeholders use ALL_CAPS_WITH_UNDERSCORES format (e.g., `YOUR_PROJECT_NAME`) and are explained on first occurrence
   - Each code block should not exceed 30 lines; split and explain in sections if longer
   - Use relative file paths; state the project root directory at the beginning
   - Every step must end with a verification section

4. **Progressive complexity**:
   - Steps 1–3: Minimal runnable example (Hello World level)
   - Middle steps: Gradually introduce real-world features
   - Final 1–2 steps: Combine everything into a complete example

**Output**: Numbered step list, each containing actions + explanation + verification

---

### Phase 5: Troubleshooting

**Goal**: Anticipate problems the reader may encounter and provide a direct path from error message to solution.

**Steps**:

1. **Error collection**: Based on the technical topic, list the 5–8 most common error scenarios
   - Sources: Environment misconfiguration, version incompatibilities, permission issues, typos, network problems, etc.

2. **Error entry format**:

   ```
   **Error N: [Error message summary]**

   Full error message:
   [Actual error output]

   Cause: [One-sentence explanation of why this error occurs]

   Solution:
   [Specific fix commands or steps]

   Verify the fix:
   [What to run to confirm the issue is resolved]
   ```

3. **Writing guidelines**:
   - Error messages must be real (do not fabricate error messages)
   - Solutions must be actionable — avoid vague advice like "check your configuration"
   - If an error has multiple possible causes, list them from most to least likely
   - For permission-related issues, explain why the permission is needed rather than jumping to `sudo` or `chmod 777`

4. **Self-check rules**:
   - Solutions must not include operations that could create security risks (e.g., `chmod 777`, disabling firewalls)
   - Never advise the reader to disable security features to "fix" a problem

**Output**: Structured troubleshooting table

---

### Phase 6: Advanced Topics

**Goal**: Point readers who have completed the basics toward next steps, providing a learning path from beginner to advanced.

**Steps**:

1. **Advanced topic recommendations** (3–5 directions):
   - For each direction, write a short paragraph: what it is, why it's worth learning, and what scenarios it applies to
   - Tag the difficulty level: Intermediate / Advanced
   - Format:

     ```
     **Direction N: [Topic Name]** | Difficulty: [Intermediate/Advanced]

     [Short paragraph]

     Recommended resources:
     - [Resource name] ([Type: documentation/book/course])
     ```

2. **Hands-on project suggestions**:
   - Provide 2–3 small projects the reader can independently complete using what they learned
   - Each project includes: project name, one-sentence description, and relevant concepts

3. **Best practice tips** (3–5 items):
   - Key differences between production and tutorial environments
   - Security considerations
   - Performance optimization directions

**Output**: Advanced learning roadmap + hands-on project suggestions + best practices

---

### Phase 7: Cheatsheet

**Goal**: Distill the tutorial's essentials into a one-page quick reference for everyday use.

**Steps**:

1. **Cheatsheet structure**:

   ```
   # [Technology Name] Cheatsheet

   ## Environment Info
   | Item | Command/Path |
   |------|--------------|
   | Install | `command` |
   | Version check | `command` |
   | Config file location | `path` |

   ## Common Commands
   | Action | Command | Description |
   |--------|---------|-------------|
   | xxx    | `xxx`   | xxx         |

   ## Common Code Snippets
   [Up to 5 frequently used code snippets, each no more than 10 lines]

   ## Quick Troubleshooting
   | Symptom | Possible Cause | Quick Fix |
   |---------|---------------|-----------|
   | xxx     | xxx           | `xxx`     |
   ```

2. **Writing guidelines**:
   - Total cheatsheet length should fit on 2 printed A4 pages
   - Commands must be complete and ready to copy-paste
   - No explanatory prose — only "what to do → how to do it" mappings
   - Order items by frequency of use, from most to least common

**Output**: One-page cheatsheet

---

### Phase 8: Document Assembly & Output

**Goal**: Assemble the outputs from the previous seven phases into a complete tutorial document.

**Tutorial document template**:

```markdown
# [Technical Topic] Complete Tutorial

> Last updated: [Current date] | Applicable version: [Version number]
> Difficulty: [Beginner/Intermediate/Advanced] | Estimated time: [N hours/minutes]

## Tutorial Overview

[Phase 1 metadata summary — what the reader will be able to do after completion]

## 1. Prerequisites

[Phase 2 prerequisites checklist]

## 2. Environment Setup

[Phase 3 installation and configuration guide]

## 3. Core Steps

[Phase 4 numbered step list]

## 4. Troubleshooting

[Phase 5 troubleshooting table]

## 5. Advanced Topics

[Phase 6 advanced roadmap and hands-on projects]

## 6. Cheatsheet

[Phase 7 cheatsheet]

## Appendix

- Glossary (if domain-specific terminology is used, list in a table: Term | Definition)
- Reference links (official documentation, community resources, etc.)
```

**Document output requirements**:
- All code blocks must specify the language
- All commands must be directly copy-pasteable (no line numbers, prompts, or other noise)
- All placeholders use the `YOUR_XXX` format and are explained on first occurrence
- Configuration files must not contain real keys or tokens
- Dates must use the actual current date

---

## Flow Control Rules

### Interaction Mode Selection

Choose the mode based on the level of detail in the user's input:

| User Input | Mode | Behavior |
|------------|------|----------|
| Just a technology name (e.g., "Docker tutorial") | **Guided mode** | Execute Phase 1 questions, wait for answers before continuing |
| Specific goal (e.g., "Deploy a Node.js app with Docker") | **Semi-auto mode** | Ask 1–2 key questions while simultaneously planning the steps |
| Detailed description (includes audience, environment, goal) | **Full-auto mode** | Start output directly from Phase 2 |
| User says "just write it / don't ask" | **Quick mode** | Output the complete tutorial based on default assumptions |

### Quality Checklist

Before outputting the final tutorial, check each item:

- [ ] Prerequisites checklist is complete with no knowledge gaps
- [ ] Every environment setup command has a verification step
- [ ] Every core step includes "actions + explanation + verification"
- [ ] Step dependencies are correct (no step uses a tool that hasn't been installed yet)
- [ ] At least 5 common errors with specific, actionable solutions
- [ ] At least 3 advanced directions with resource recommendations
- [ ] Cheatsheet is self-contained with common commands and troubleshooting info
- [ ] All code blocks specify the language
- [ ] No hardcoded keys, tokens, or personal paths
- [ ] No suggestions that could create security vulnerabilities (e.g., `chmod 777`)
- [ ] No dependency on paid APIs or subscription-only tools (unless the tool itself is the tutorial subject)

### Iterative Refinement

If the user provides feedback on the tutorial:
1. Identify which Phase the feedback relates to
2. Re-execute from that Phase
3. Cascade updates to all downstream content (e.g., an environment change must propagate to subsequent steps and the Cheatsheet)
4. Maintain step numbering continuity

## Use Cases

This tutorial generator is suitable for the following types of technical tutorials:

- **Tool usage**: Tutorials for tools like Git, Docker, Kubernetes, Vim, etc.
- **Environment setup**: Development environments, CI/CD pipelines, server configuration, etc.
- **Programming introductions**: Language primers, framework quickstarts, library usage, etc.
- **Operations manuals**: Deployment, monitoring, logging, backup and recovery, etc.
- **Data processing**: Database operations, ETL workflows, data analysis tool usage, etc.
