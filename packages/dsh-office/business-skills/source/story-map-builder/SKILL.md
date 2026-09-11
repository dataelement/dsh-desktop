---
name: story-map-builder
description: "Generates an interactive HTML user story map visualizing product requirements in an Epic → Feature → Story structure, with MoSCoW priority tagging and Release swimlane grouping. Trigger when the user mentions story mapping, backlog visualization, MoSCoW priority, release planning, or asks to organize requirements into a story map."
license: MIT
---

# User Story Map Builder — Interactive HTML Story Map Generator

Visualizes product requirements as an interactive HTML page using the **Epic → Feature → Story** three-tier structure, with MoSCoW priority color coding and Release version swimlanes.

---

## Quick Start

The user only needs to provide product requirements — the Agent handles the rest:

1. Guides the user through organizing Epics / Features / Stories
2. Confirms MoSCoW priorities and Release assignments
3. Builds the JSON data and invokes the script to generate HTML
4. Outputs a self-contained HTML file that opens directly in any browser

The user simply says:
> "Build me a story map — I have 3 Epics: user registration, product browsing, and checkout"

The Agent will walk the user through the entire story map construction step by step.

---

## 1. Core Concepts

### Three-Tier Structure

| Tier | Meaning | Example |
|------|---------|---------|
| **Epic** | Major value theme / user activity | User Registration & Login |
| **Feature** | Functional module under an Epic | Phone signup, Email signup, SSO login |
| **Story** | Smallest deliverable user story | As a user, I can register with my phone number and a verification code |

### MoSCoW Priorities

| Level | Meaning | Color |
|-------|---------|-------|
| **Must** | Essential — product is unusable without it | 🔴 Red |
| **Should** | Important — significantly increases value | 🟠 Orange |
| **Could** | Nice to have — adds polish | 🔵 Blue |
| **Wont** | Not this time — recorded for future reference | ⚪ Gray |

### Release Swimlanes

Horizontal divider lines group story cards by version:
- Above the Release 1 (MVP) line = must ship in the first version
- Above the Release 2 line = planned for the second version
- And so on

---

## 2. Workflow

### Step 1: Gather Requirements

Collect the following from the user:

| Item | Required | Notes |
|------|----------|-------|
| Project name | ✅ | Displayed in the map title |
| Epic list | ✅ | 2–8 Epics |
| Features per Epic | ✅ | 1–6 Features per Epic |
| Stories per Feature | ✅ | 1–10 Stories per Feature |
| Priority per Story | ✅ | must / should / could / wont |
| Release per Story | ✅ | Which version it belongs to |
| Release list | ✅ | Version names and descriptions |
| Story Points (optional) | ❌ | Effort estimate |
| Story description (optional) | ❌ | Additional details |

### Step 2: Build the JSON Data

Organize the data in the following format:

```json
{
  "project": "E-Commerce Platform MVP",
  "releases": [
    {"name": "Release 1", "description": "MVP core features"},
    {"name": "Release 2", "description": "UX improvements"},
    {"name": "Release 3", "description": "Growth features"}
  ],
  "epics": [
    {
      "name": "User System",
      "features": [
        {
          "name": "Registration & Login",
          "stories": [
            {
              "name": "Phone number signup",
              "priority": "must",
              "release": "Release 1",
              "points": 3,
              "description": "User can register with phone number and verification code"
            },
            {
              "name": "WeChat login",
              "priority": "should",
              "release": "Release 2",
              "points": 5
            }
          ]
        }
      ]
    }
  ]
}
```

#### Field Reference

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `project` | string | ✅ | Project name |
| `releases` | array | ✅ | Release list (in order) |
| `releases[].name` | string | ✅ | Version name — must match the `release` field in Stories |
| `releases[].description` | string | ❌ | Version description |
| `epics` | array | ✅ | Epic list |
| `epics[].name` | string | ✅ | Epic name |
| `epics[].features` | array | ✅ | Feature list |
| `epics[].features[].name` | string | ✅ | Feature name |
| `epics[].features[].stories` | array | ✅ | Story list |
| `stories[].name` | string | ✅ | Story name |
| `stories[].priority` | string | ✅ | must / should / could / wont |
| `stories[].release` | string | ✅ | Assigned version name |
| `stories[].points` | number | ❌ | Story Points |
| `stories[].description` | string | ❌ | Additional description |

### Step 3: Generate the HTML

```bash
# Generate from a JSON file
python3 scripts/generate_story_map.py --input data.json --output story_map.html

# Read JSON from stdin
echo '{"project":"demo",...}' | python3 scripts/generate_story_map.py --output story_map.html
```

#### Command Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| `--input` | ❌ | Input JSON file path (reads from stdin if omitted) |
| `--output` | ✅ | Output HTML file path |

### Step 4: Deliver the HTML

The script produces a **self-contained HTML file** (no external dependencies) with these features:

- 📊 Three-tier card layout: Epic → Feature → Story
- 🎨 MoSCoW priority color coding
- 📏 Release version swimlane grouping
- 📱 Responsive design with horizontal scrolling
- 🖨️ Print-friendly (auto-fits A3 landscape)
- 💡 Hover tooltips showing Story details
- 📈 Stats panel (Story counts and Points totals by priority and release)

---

## 3. Conversation Guide

### Opening

> I'll help you build a user story map. First, let me know:
> 1. What's the project name?
> 2. What are the major functional areas (Epics)?
> 3. How many releases are you planning?

### Step-by-Step Walkthrough

> Great, let's flesh out the "{Epic name}" Epic:
> - What specific features does it include?
> - What user stories fall under each feature?

### Confirming Priorities

> Here are the stories under "{Feature name}" — please confirm each one's priority:
> | Story | Suggested Priority | Your Call |
> |-------|-------------------|-----------|
> | ... | Must | |

### Confirming Release Assignments

> Please confirm which Release each Story belongs to:
> - Release 1 (MVP): Core essentials
> - Release 2: UX improvements
> - Release 3: Growth features

---

## 4. Notes

1. **Data validation**: The script automatically checks that each Story's Release reference exists in the `releases` list
2. **Priority validation**: `priority` only accepts `must` / `should` / `could` / `wont`
3. **Empty data handling**: If a Feature has no Stories, the column shows an empty placeholder
4. **Multilingual support**: Project names, Epic names, etc. support mixed CJK and Latin characters
5. **Large map advisory**: If total Stories exceed 50, consider splitting into multiple sub-maps
