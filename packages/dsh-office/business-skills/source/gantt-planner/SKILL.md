---
name: gantt-planner
description: "Generate interactive HTML Gantt charts with Critical Path Method (CPM) analysis from task lists and dependencies, highlighting the critical path and calculating float times. Use when the user asks to create a Gantt chart, schedule project tasks, analyze the critical path, visualize dependencies, or mentions project timelines, milestones, or task scheduling."
license: MIT
---

# gantt-planner -- Interactive Gantt Chart & Critical Path Analysis

Automatically performs Critical Path Method (CPM) analysis on task lists and their dependencies, generating interactive HTML Gantt charts. Supports zooming, critical path filtering, hover details, and dependency arrow visualization.

## Quick Start

Simplest usage — pass JSON directly:

```bash
python3 scripts/gantt_generator.py --json '{
  "project": "New Product Launch",
  "tasks": [
    {"id": "T1", "name": "Requirements Analysis", "duration": 5, "dependencies": []},
    {"id": "T2", "name": "UI Design", "duration": 4, "dependencies": ["T1"]},
    {"id": "T3", "name": "Backend Development", "duration": 8, "dependencies": ["T1"]},
    {"id": "T4", "name": "Frontend Development", "duration": 6, "dependencies": ["T2"]},
    {"id": "T5", "name": "Integration Testing", "duration": 3, "dependencies": ["T3", "T4"]},
    {"id": "T6", "name": "Deployment", "duration": 2, "dependencies": ["T5"]}
  ]
}' --output gantt.html
```

Read from a file with a specified start date:

```bash
python3 scripts/gantt_generator.py --file tasks.json --start-date 2026-05-01 --output gantt.html
```

## Methodology: Critical Path Method (CPM)

### Core Concepts

| Term | Abbreviation | Meaning |
|------|-------------|---------|
| Earliest Start | ES | The earliest point at which a task can begin |
| Earliest Finish | EF | The earliest point at which a task can be completed (ES + Duration) |
| Latest Start | LS | The latest a task can start without delaying the project |
| Latest Finish | LF | The latest a task can finish without delaying the project |
| Total Float | TF | LS − ES; the number of days a task can be delayed |
| Critical Path | — | The sequence of tasks with zero float, determining the project's minimum duration |

### Calculation Steps

1. **Topological Sort**: Order tasks by dependencies, detecting any circular references
2. **Forward Pass**: Starting from the initial tasks, compute ES and EF for each task
   - `ES = max(EF of all predecessors)`
   - `EF = ES + Duration`
3. **Backward Pass**: Working back from the final tasks, compute LS and LF
   - `LF = min(LS of all successors)`
   - `LS = LF - Duration`
4. **Identify the Critical Path**: Tasks where float (LS − ES) equals 0 form the critical path

## Input Format

A JSON object with the following fields:

```json
{
  "project": "Project Name",
  "start_date": "2026-05-01",
  "tasks": [
    {
      "id": "T1",
      "name": "Task Name",
      "duration": 5,
      "dependencies": ["T0"]
    }
  ]
}
```

| Field | Required | Type | Description |
|-------|----------|------|-------------|
| project | No | string | Project title; defaults to "Project Gantt Chart" |
| start_date | No | string | YYYY-MM-DD format; can be overridden by the CLI `--start-date` flag |
| tasks | Yes | array | List of tasks |
| tasks[].id | Yes | string | Unique task identifier |
| tasks[].name | Yes | string | Task name |
| tasks[].duration | Yes | number | Duration in days; must be > 0 |
| tasks[].dependencies | No | array | List of predecessor task IDs; defaults to [] |

## Output Features

The generated HTML file is fully self-contained (no external dependencies) and includes the following interactive features:

- **Gantt Chart Visualization**: Bar chart with time on the horizontal axis and tasks on the vertical axis
- **Critical Path Highlighting**: Critical tasks in red, non-critical tasks in blue
- **Dependency Arrows**: SVG-drawn dependency lines; critical dependencies are bold red
- **Float Time Display**: Semi-transparent orange areas showing how much a task can be delayed
- **Hover Details**: Hover over a task to see full CPM analysis data
- **Task Highlighting**: Click a task to highlight its direct predecessors and successors
- **Zoom Control**: Slider to adjust timeline granularity
- **Critical Path Filter**: Toggle to show only critical path tasks
- **Today Marker**: Green vertical line indicating the current date
- **JSON Export**: Export the complete dataset with CPM annotations

## Script Arguments

```
python3 scripts/gantt_generator.py [options]

Required (one of):
  --json TEXT          Task data as a JSON string
  --file PATH          Path to a JSON file containing task data

Optional:
  --start-date DATE    Project start date (YYYY-MM-DD); defaults to today
  --output, -o PATH    Output HTML file path; defaults to stdout
  --title TEXT         Override the project title
```

## Full Example

### Scenario: Software Development Project Schedule

```json
{
  "project": "CRM System v2.0 Development",
  "start_date": "2026-05-05",
  "tasks": [
    {"id": "A", "name": "Requirements Research", "duration": 5, "dependencies": []},
    {"id": "B", "name": "Architecture Design", "duration": 3, "dependencies": ["A"]},
    {"id": "C", "name": "UI/UX Design", "duration": 4, "dependencies": ["A"]},
    {"id": "D", "name": "Database Design", "duration": 2, "dependencies": ["B"]},
    {"id": "E", "name": "Backend API Development", "duration": 10, "dependencies": ["D"]},
    {"id": "F", "name": "Frontend Development", "duration": 8, "dependencies": ["C", "D"]},
    {"id": "G", "name": "Unit Testing", "duration": 3, "dependencies": ["E"]},
    {"id": "H", "name": "Integration Testing", "duration": 4, "dependencies": ["F", "G"]},
    {"id": "I", "name": "User Acceptance Testing", "duration": 3, "dependencies": ["H"]},
    {"id": "J", "name": "Deployment", "duration": 2, "dependencies": ["I"]}
  ]
}
```

Analysis results:
- Total duration: 32 days
- Critical path: A → B → D → E → G → H → I → J
- UI/UX Design (C) has float time and can be delayed without affecting the total duration

## Notes

- Circular dependencies (A depends on B, B depends on A) are not allowed; the script detects and reports them
- Duration is measured in calendar days; weekdays and holidays are not distinguished
- All task IDs must be unique
- The generated HTML can be opened offline — no internet connection required
