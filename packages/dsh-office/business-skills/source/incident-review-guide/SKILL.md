---
name: incident-review-guide
description: "Blameless postmortem and incident review writing tool based on SRE best practices. Produces structured incident reports with timelines, root cause analysis (5 Whys), action items, and lessons learned. Trigger when users need to write incident reviews, perform RCAs, analyze production outages, or use keywords like postmortem, incident report, root cause analysis, or 5 Whys."
license: MIT
---

# incident-review-guide

A **Blameless Postmortem** writing workflow based on Google SRE and industry best practices. This structured SOP walks you through the full incident review process — from gathering incident details, building a timeline, conducting 5 Whys root cause analysis, to defining remediation actions — and produces a professional postmortem document.

Core philosophy: **Blameless Culture** — focus on improving systems and processes, not assigning blame to individuals.

## Quick Start

**Interactive review** (recommended): Describe your incident and the Agent will guide you step by step through the SOP.

**One-click document generation**: If you already have complete incident details, use the script to quickly generate a formatted postmortem:

```bash
python3 scripts/generate_postmortem.py --interactive
```

Or provide JSON input to generate directly:

```bash
python3 scripts/generate_postmortem.py --input incident.json --output postmortem.md
```

---

## SOP: Six Steps to a Professional Postmortem

### Step 1: Incident Overview

Gather the following basic information to build the full picture:

| Field | Description | Example |
|---|---|---|
| Incident Title | Brief description of the failure | Payment service P99 latency spiked to 30s |
| Severity Level | P0–P3 (see grading criteria below) | P1 |
| Impact Start Time | When users were first affected | 2024-03-15 14:32 UTC+8 |
| Impact End Time | When the incident was fully resolved | 2024-03-15 16:45 UTC+8 |
| Duration | Auto-calculated or manually entered | 2h13m |
| Blast Radius | Affected users / services / regions | ~30% of users in East China region unable to complete payments |
| On-call / Response Team | Key personnel involved | SRE on-call: Alice, Payments team: Bob |

**Severity Grading Criteria:**

| Level | Definition | Typical Scenarios |
|---|---|---|
| **P0** | Full site or core business unavailable, widespread user impact | Main site down, database cluster failure, payment system completely offline |
| **P1** | Severe degradation of core features, significant portion of users affected | Search unavailable, order success rate dropped 50%, API error rate > 10% |
| **P2** | Non-core features impaired, or minor degradation of core features | Recommendation engine latency increase, regional service anomaly, admin panel unavailable |
| **P3** | Minor issue, users largely unaffected | Log collection delay, internal monitoring dashboard anomaly, non-critical cron job failure |

### Step 2: Timeline Construction

Record the full incident chronologically, precise to the minute. Tag each event with a category:

| Category Tag | Description |
|---|---|
| TRIGGER | The event that caused the failure |
| DETECT | Discovery / alerting event |
| ACTION | Response action taken |
| RESOLVE | Recovery / fix event |
| INFO | Other informational event |

**Timeline Example:**

```
14:25  ACTION   Deploy payment-service v2.3.1 to production
14:32  TRIGGER  Payment success rate begins dropping from 99.8%
14:35  DETECT   Monitoring alert: payment success rate < 95%
14:38  DETECT   Customer support receives user reports of failed payments
14:42  ACTION   On-call SRE begins investigation, isolates payment-service
14:55  ACTION   Attempt to restart payment-service pods (ineffective)
15:10  ACTION   Log analysis reveals database connection pool exhaustion
15:25  ACTION   Roll back payment-service to v2.3.0
15:30  RESOLVE  Payment success rate recovers to 99.5%
16:45  RESOLVE  All backlogged orders processed, full recovery confirmed
```

**Key Metrics (record alongside the timeline):**

- **TTD (Time to Detect)**: Time from incident onset to discovery
- **TTR (Time to Resolve)**: Time from discovery to resolution
- **TTN (Time to Notify)**: Time from discovery to stakeholder notification
- Affected user count / affected request count / estimated financial impact

### Step 3: 5 Whys Root Cause Analysis

The 5 Whys method repeatedly asks "why" to penetrate surface-level causes and uncover the root cause.

**Rules of execution:**

1. Start from the immediate cause and ask "Why did this happen?" each time
2. Ask at least 5 levels deep, until you reach an actionable system or process improvement
3. Each answer must be grounded in facts and evidence, not speculation
4. If a "why" has multiple causes, branch out and analyze each separately
5. The final root cause should point to a **system or process deficiency**, not an individual's mistake

**Analysis Example:**

```
Symptom: Payment service P99 latency spiked to 30s

Why 1: Why did latency spike?
  Database connection pool was exhausted; requests queued waiting for connections

Why 2: Why was the connection pool exhausted?
  The new release introduced a bug that failed to close database connections

Why 3: Why wasn't this bug caught before deployment?
  Unit tests didn't cover database connection release scenarios

Why 4: Why were there no such tests?
  No testing standards or checklist for resource leak scenarios

Why 5: Why was there no such standard?
  The team lacked a code review checklist and automated detection for resource management

Root cause: Missing automated detection mechanisms and code review standards for resource leaks (connection pools, file handles, etc.)
```

**Common Root Cause Categories:**

| Category | Description | Examples |
|---|---|---|
| **Change-induced** | Caused by code / config / infrastructure changes | Deployed buggy code, misconfigured settings |
| **Capacity** | Resources exhausted / scaling too slow | Disk full, connection pool exhausted, traffic exceeded projections |
| **Monitoring gap** | Missing alerts or unreasonable thresholds | No monitoring for that metric, alert threshold too high to trigger |
| **Dependency failure** | Upstream/downstream or third-party outage | CDN failure, DNS resolution issue, cloud provider outage |
| **Process gap** | Missing or unenforced release / approval / emergency procedures | No canary deployment, no rollback plan, on-call didn't respond |
| **Design flaw** | Architectural or design weakness | Single point of failure, no graceful degradation, cache stampede |

### Step 4: Defining Action Items

Every action item must satisfy the **SMART criteria**:

| Element | Requirement | Bad → Good Example |
|---|---|---|
| **Specific** | Clearly defined | "Improve monitoring" → "Add connection pool utilization monitoring for payment-service" |
| **Measurable** | Quantifiable | "Improve availability" → "Raise payment success rate SLO from 99.5% to 99.9%" |
| **Assignable** | Has a clear owner | "Everyone should be careful" → "Alice owns this, due by 3/25" |
| **Realistic** | Achievable | "Rewrite the entire payment system" → "Add a connection leak detection middleware" |
| **Time-bound** | Has a deadline | "ASAP" → "Ship by 2024-03-25" |

**Action Item Categories:**

| Type | Description | Priority |
|---|---|---|
| **Mitigate** | Prevent the same issue from recurring | Highest — must complete in the next sprint |
| **Detect** | Detect the same issue faster | High — complete within 2 weeks |
| **Prevent** | Eliminate the underlying risk entirely | Medium — prioritize into the backlog |
| **Process** | Improve workflows / standards / documentation | Varies — typically within 1 week |

### Step 5: Lessons Learned

Summarize from three perspectives:

**1. What Went Well (Keep Doing)**
- Which parts of the response were effective? Why did they work?
- Is there anything worth codifying as a standard procedure?

**2. What Needs Improvement (Stop Doing / Improve)**
- Which steps slowed down recovery?
- Were there unnecessary actions that wasted time?

**3. Luck Factors (Lucky / Unlucky)**
- What coincidences helped avoid a larger impact?
- What coincidences amplified the impact?
- What latent risks do these luck factors reveal?

### Step 6: Generate the Postmortem Document

Use the script to produce a formatted Markdown document:

```bash
python3 scripts/generate_postmortem.py --interactive
```

Or compile the information gathered in the previous steps into JSON and generate directly:

```bash
python3 scripts/generate_postmortem.py --input incident.json --output postmortem.md
```

---

## Blameless Culture Principles

Strictly follow these principles throughout the review:

1. **Focus on systems, not individuals** — "Alice deployed buggy code" should become "The deployment pipeline lacks automated regression testing"
2. **Human error is expected** — If one person's mistake can cause a major outage, the system lacks adequate safeguards
3. **Encourage transparency** — The more candidly mistakes are shared, the better the improvement opportunities discovered
4. **Let data speak** — Timelines and root cause analysis must be backed by logs, monitoring data, configuration records, and other objective evidence
5. **Look forward, not backward** — The purpose of a postmortem is "how do we do better next time," not "who messed up this time"

**Wording Checklist for Documents:**

| Avoid | Use Instead |
|---|---|
| "Alice's mistake caused..." | "The change process lacked step X, which led to..." |
| "Should have checked but didn't" | "The current process does not include a check for X" |
| "Carelessness/negligence caused..." | "The absence of automated safeguards left risk X from manual operations uncaught" |
| "Irresponsible action" | "The operations SOP did not cover scenario X" |

---

## Script Parameters

### generate_postmortem.py

| Parameter | Description | Default |
|---|---|---|
| `--interactive` | Interactive mode — guided step-by-step input | - |
| `--input <file>` | Read incident data from a JSON file | - |
| `--output <file>` | Output file path | stdout |
| `--format` | Output format: `markdown` or `json` | `markdown` |
| `--template` | Template style: `standard` (full) or `brief` (concise) | `standard` |
| `--lang` | Document language: `zh` (Chinese) or `en` (English) | `zh` |

### JSON Input Format

```json
{
  "title": "Payment service P99 latency spiked to 30s",
  "severity": "P1",
  "start_time": "2024-03-15T14:32:00+08:00",
  "end_time": "2024-03-15T16:45:00+08:00",
  "impact": "~30% of users in East China region unable to pay, affecting ~5,000 transactions",
  "responders": ["Alice (SRE on-call)", "Bob (Payments team)"],
  "timeline": [
    {"time": "14:25", "type": "ACTION", "desc": "Deploy payment-service v2.3.1"},
    {"time": "14:32", "type": "TRIGGER", "desc": "Payment success rate begins dropping"},
    {"time": "14:35", "type": "DETECT", "desc": "Monitoring alert triggered"},
    {"time": "15:25", "type": "ACTION", "desc": "Roll back to v2.3.0"},
    {"time": "15:30", "type": "RESOLVE", "desc": "Service recovered"}
  ],
  "five_whys": [
    {"level": 1, "question": "Why did latency spike?", "answer": "Database connection pool exhausted"},
    {"level": 2, "question": "Why was the pool exhausted?", "answer": "New release failed to close connections properly"},
    {"level": 3, "question": "Why wasn't it caught before deployment?", "answer": "Tests didn't cover connection release"},
    {"level": 4, "question": "Why were there no such tests?", "answer": "No resource leak testing standards"},
    {"level": 5, "question": "Why was there no standard?", "answer": "Lacked a resource management checklist"}
  ],
  "root_cause": "Missing automated resource leak detection and code review standards",
  "root_cause_category": "process gap",
  "action_items": [
    {
      "type": "mitigate",
      "desc": "Add leak detection and auto-reclaim to the connection pool",
      "owner": "Bob",
      "due": "2024-03-25",
      "priority": "P0"
    },
    {
      "type": "detect",
      "desc": "Add connection pool utilization monitoring and alerts",
      "owner": "Alice",
      "due": "2024-03-22",
      "priority": "P0"
    }
  ],
  "lessons": {
    "keep_doing": ["SRE responded within 3 minutes of alert", "Decisive rollback call"],
    "improve": ["Need automated smoke tests after each deployment", "Alert escalation policy needs refinement"],
    "lucky": ["Incident occurred during afternoon off-peak hours — impact would have been much worse during peak"]
  }
}
```

---

## References

- Google SRE Book - Postmortem Culture
- Etsy: Blameless PostMortems and a Just Culture
- PagerDuty Postmortem Guide
- The Infinite Hows (replacing 5 Whys)
