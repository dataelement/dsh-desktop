---
name: skill-creator-swarm
description: Guide for creating effective skills. Use when users want to create a new skill or update an existing skill that extends an agent's capabilities with specialized knowledge, workflows, tool usage, or reusable resources. Also use when users want to refine a skill through swarm-style evaluation using subagents, baseline comparisons, grading, and analysis inside an agent swarm framework.
license: Complete terms in LICENSE.txt
---

# Skill Creator

This skill provides guidance for creating effective skills.

It is designed for an agent swarm environment where a main agent can coordinate multiple subagents via tools such as `create_subagent` and `task`.

## About Skills

Skills are modular, self-contained packages that extend an agent's capabilities by providing specialized knowledge, workflows, and tools. Think of them as onboarding guides for specific domains or tasks. A good skill turns a general-purpose agent into a specialized one without bloating every prompt.

### What Skills Provide

1. Specialized workflows - Multi-step procedures for specific domains
2. Tool integrations - Instructions for working with specific file formats or APIs
3. Domain expertise - Company-specific knowledge, schemas, business logic
4. Bundled resources - Scripts, references, and assets for repetitive or fragile work

## Core Principles

### Concise Is Key

The context window is a public good. Skills share it with the system prompt, conversation history, other skills, and the actual user request.

Default assumption: the agent is already smart. Only add information the agent would not reliably infer on its own. Prefer concise examples over long explanations.

### Set Appropriate Degrees Of Freedom

Match specificity to the task's fragility:

- High freedom: text instructions and heuristics when multiple good approaches exist
- Medium freedom: pseudocode or scripts with parameters when a preferred pattern exists
- Low freedom: highly specific scripts or step ordering when the task is fragile and error-prone

### Progressive Disclosure

Every skill has three levels:

1. Metadata in YAML frontmatter
2. Core workflow in `SKILL.md`
3. Bundled resources loaded only when needed

Keep `SKILL.md` focused. Push detailed schemas, long examples, and variant-specific material into `references/`.

## Anatomy Of A Skill

Every skill consists of a required `SKILL.md` file and optional bundled resources:

```text
skill-name/
├── SKILL.md
├── scripts/
├── references/
└── assets/
```

### `SKILL.md`

Every `SKILL.md` should contain:

- YAML frontmatter with `name` and `description`
- Markdown instructions for using the skill

The `description` is the main trigger surface. Put all "when to use this skill" guidance there, not in the body.

### Bundled Resources

#### `scripts/`

Use for deterministic or repetitive operations.

- Include when the same code would otherwise be rewritten repeatedly
- Prefer for fragile transforms or verification logic
- Test added scripts by actually running them

#### `references/`

Use for documentation the agent may need to read while working.

- Move large schemas, workflow branches, and domain details here
- Link these files clearly from `SKILL.md`
- If a file is long, include a short table of contents

#### `assets/`

Use for files that should be consumed or copied into outputs, not loaded as instructions.

## Skill Creation Process

Skill creation usually follows these steps:

1. Understand the skill with concrete examples
2. Plan reusable skill contents
3. Initialize the skill
4. Edit the skill
5. Evaluate the skill in an agent swarm
6. Package the skill
7. Iterate based on real usage

Follow these in order unless there is a clear reason not to.

### Step 1: Understand The Skill With Concrete Examples

Skip only when the skill's usage patterns are already clear.

Useful questions:

- What should this skill enable the agent to do?
- What would a user actually say that should cause the skill to be used?
- What output should the agent produce?
- What failure modes matter?

Conclude this step only when there is a concrete sense of:

- trigger situations
- expected output
- success criteria
- edge cases

### Step 2: Plan Reusable Skill Contents

Analyze each example:

1. How would the task be executed from scratch?
2. What parts would be useful to reuse across many runs?

Common outputs of this analysis:

- scripts for deterministic transforms
- references for schemas and detailed guidance
- assets for templates or starter files

### Step 3: Initialize The Skill

When creating a new skill from scratch, run:

```bash
scripts/init_skill.py <skill-name> --path /mnt/agents/output
```

IMPORTANT: Always use `/mnt/agents/output` as the output directory. This path is shared across all sandboxes (main agent and subagents). Other paths like `/app/.user/skills/` are NOT shared and subagents cannot read files there.

The script creates:

- a skill directory
- a template `SKILL.md`
- example `scripts/`, `references/`, and `assets/` directories

Do not use shell brace expansion when creating additional directories.

### Step 4: Edit The Skill

When editing the skill, remember that it is being created for another agent instance to use later. Include procedural knowledge, domain-specific constraints, and reusable resources that would materially improve another run.

#### Learn Proven Design Patterns

Consult these references when useful:

- Multi-step processes: `references/workflows.md`
- Output formats and quality standards: `references/output-patterns.md`

#### Start With Reusable Contents

Implement reusable resources first:

- scripts
- references
- assets

Delete example files you do not need.

#### Update `SKILL.md`

Write instructions in imperative form.

##### Frontmatter

Use:

- `name`
- `description`

The `description` should include:

- what the skill does
- when to use it
- concrete trigger contexts

Do not put "when to use" only in the body.

##### Body

The body should explain:

- how to approach the task
- what resources to load and when
- what output format or quality bar to hit

### Step 5: Swarm-Style Evaluation In An Agent Swarm (MANDATORY)

DO NOT skip this step. You MUST run at least one evaluation round using subagents before packaging. Without this step, the skill is untested — do not proceed to Step 6 until you have compared with_skill vs without_skill outputs.

This section adapts the newer swarm evaluation mindset to an agent swarm environment without relying on heavy orchestration scripts. The main agent should run this process directly through prompts and subagents.

### Principle

Do not build a large eval harness first. Instead, coordinate a lightweight inline loop: draft realistic prompts, run paired `with_skill` and baseline executions, evaluate the outputs with dedicated subagents, analyze the results, and revise the skill.

This keeps the process lightweight and aligned with the actual swarm runtime.

### Default Evaluation Pattern

For each eval prompt, the main agent should launch two executions in the same turn:

- one subagent run with the candidate skill loaded
- one baseline run without the skill, or with the previous version of the skill

Do not run all `with_skill` cases first and come back for baseline later. Pair them in the same evaluation round so comparisons are cleaner.

### Workspace Convention

You may still organize outputs in a sibling workspace, but do it manually and simply. A good pattern is:

```text
<skill-name>-workspace/
└── iteration-1/
    ├── eval-1/
    │   ├── with_skill/
    │   ├── without_skill/
    │   └── notes.md
    └── eval-2/
```

The point is consistency, not strict tooling.

### Test Prompt Design

Draft 2-5 realistic prompts.

Good prompts:

- resemble real user requests
- include actual constraints, file paths, edge cases, or output expectations
- are hard enough that the skill should matter

Weak prompts:

- trivial one-step requests
- prompts that can be solved equally well without any skill guidance

### Baseline Choice

Choose baseline based on context:

- New skill: baseline is no skill
- Updating existing skill: baseline is the previous skill version

State the baseline explicitly in your notes and prompts.

### Subagent Roles

When evals matter, the main agent should create specialized evaluator subagents instead of doing everything itself.

Recommended roles:

- `skill_executor`: runs the prompt with or without the skill
- `skill_grader`: checks expectations against outputs
- `skill_comparator`: compares two outputs blindly and picks a winner
- `skill_analyzer`: reads the results and explains what to improve

These do not need dedicated scripts. In an agent swarm environment, they can be created via `create_subagent` with explicit `system_prompt`s and used through `task`.

### Executor Prompt Pattern

For each run, give the executor subagent:

- whether it should use the skill
- the exact skill path, if applicable
- the user prompt
- any input files
- where to save outputs
- exactly what to return in its final message

#### Passing the skill path to executor subagents

The skill you created in Step 4 is at `/mnt/agents/output/<skill-name>/SKILL.md`. Pass this exact path to the `with_skill` executor so it can read the skill. The `without_skill` executor gets no skill path.

#### Executor task prompt template

```text
Execute this eval case.

Mode: with_skill | baseline
Skill path: /path/to/skill/SKILL.md or none
Task: <user prompt>
Input files: <list or none>
Output directory: <path>

Requirements:
- If a skill path is provided, read it before solving the task
- Save deliverables into the output directory
- Return a concise summary of what you produced
- Return the output file paths
- If something is uncertain, say so explicitly
```

### Grader Prompt Pattern

Use a dedicated grader subagent when expectations are objective.

The grader should:

1. read the prompt
2. inspect outputs
3. check each expectation
4. produce structured pass/fail judgments with evidence
5. point out weak expectations if they are non-discriminating

A good grader task prompt has this shape:

```text
Grade this eval run.

Prompt: <original eval prompt>
Outputs path: <path>
Expectations:
- ...
- ...

Return:
- pass/fail for each expectation
- evidence for each judgment
- overall verdict
- any weaknesses in the expectations themselves
```

### Comparator Prompt Pattern

Use a comparator subagent when quality is partly subjective or holistic.

The comparator should:

1. review output A and output B without knowing which is which
2. infer the evaluation rubric from the prompt
3. choose a winner or tie
4. explain why

A good comparator task prompt has this shape:

```text
Compare two outputs blindly.

Original prompt: <prompt>
Output A path: <path>
Output B path: <path>

Do not infer which one used the skill.
Judge only on task completion quality, correctness, completeness, and usability.
Return:
- winner: A, B, or TIE
- concise reasoning
- strengths and weaknesses of each
```

### Analyzer Prompt Pattern

After grading or comparison, use an analyzer subagent to improve the skill itself.

The analyzer should:

1. read the skill
2. read the comparison or grading notes
3. identify which instructions helped or hurt
4. propose concrete revisions

A good analyzer task prompt has this shape:

```text
Analyze these eval results and propose skill improvements.

Skill path: <path>
Result materials:
- grading notes
- comparison notes
- output summaries

Focus on:
- ambiguous instructions
- missing guidance
- repeated wasted work
- missing reusable scripts/references/assets

Return:
- top issues
- why they matter
- concrete edits to make
```

### Assertions And Scoring

When the task is objectively verifiable, write expectations. Good expectations are:

- specific
- verifiable from outputs
- hard to satisfy accidentally

Examples of weak expectations:

- "a file exists"
- "the output looks good"

Examples of stronger expectations:

- "the final CSV includes columns X, Y, and Z"
- "the generated markdown contains sections A, B, and C"
- "the output workbook includes a pivot table on sheet Summary"

When the task is subjective, rely more on blind comparison and human review than rigid assertions.

### Timing And Effort

If timing and token usage are easy to observe from the runtime, record them. If not, do not overbuild instrumentation. The main goal is to learn whether the skill improves behavior.

### Feedback Loop

After the eval round:

1. identify what the skill improved
2. identify what still failed
3. generalize from the failures
4. revise the skill
5. rerun the same evals or an expanded set

Do not overfit the skill to one example. Improve patterns, not one-off wording hacks.

### Important Constraint For Agent Swarm Environments

In this environment, avoid building complex external orchestration scripts just to run evals. Prefer:

- direct main-agent coordination
- explicit subagent roles
- simple filesystem organization
- short structured notes

The swarm evaluation mindset is valuable. The implementation should stay lightweight.

### Step 6: Packaging A Skill (MANDATORY)

Once development is complete, you MUST package the skill:

```bash
scripts/package_skill.py <path/to/skill-folder>
```

Optional output directory:

```bash
scripts/package_skill.py <path/to/skill-folder> ./dist
```

The packaging script:

1. validates the skill
2. creates a `.skill` archive if validation passes

After packaging, your final response to the user MUST include a reference to the `.skill` file. Do not skip this. It is required for the user interface to display and deliver the packaged skill.

### Step 7: Iterate

After the skill starts being used on real tasks, keep iterating based on actual behavior.

Use real runs to notice:

- repeated failure modes
- wasted work
- ambiguous instructions
- missing scripts, references, or assets

Then fold those observations back into the same loop:

- revise the skill
- run a small swarm-style eval round
- compare against baseline
- analyze the delta
- repeat
