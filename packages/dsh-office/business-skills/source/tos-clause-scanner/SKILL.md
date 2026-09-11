---
name: tos-clause-scanner
description: "Audit Terms of Service, user agreements, and privacy policies for consumer risks, producing a structured report that flags unfair clauses, data traps, and liability issues. Trigger when a user asks to review, audit, or analyze a ToS, privacy policy, or user agreement, or mentions specific concerns like auto-renewal or data authorization."
license: MIT
---

# Terms of Service Auditor (Consumer Perspective)

Systematically audit the Terms of Service, User Agreements, and Privacy Policies of apps, SaaS products, and platforms from an ordinary consumer's standpoint. Identify clauses that may harm consumer rights and produce an actionable audit report.

## Quick Start

Paste the terms text directly to the Agent or provide a file path. The Agent will automatically complete the audit and output a structured report.

**Example prompts:**
- "Review this user agreement for any unfair or one-sided clauses"
- "Analyze this app's privacy policy and flag any covert data authorizations"
- "Does this ToS have auto-renewal traps?"

---

## 1. Audit Framework

### 1.1 Risk Category Definitions

The audit covers seven major risk categories, each with common problem patterns:

| ID | Risk Category | Severity | Description |
|----|---------------|----------|-------------|
| R1 | Unfair Clauses | 🔴 High | Clauses that exclude or restrict consumers' statutory rights |
| R2 | Covert Data Authorization | 🔴 High | Data collection, sharing, or sale beyond what the service requires |
| R3 | Auto-Renewal Traps | 🟠 Medium-High | Opaque auto-renewal mechanisms and cancellation barriers |
| R4 | Unilateral Amendment Rights | 🟠 Medium-High | Platform reserves the right to modify terms without notice |
| R5 | Excessive Liability Disclaimers | 🟠 Medium-High | Overbroad disclaimers and low liability caps |
| R6 | Dispute Resolution Restrictions | 🟡 Medium | Mandatory arbitration, class-action waivers, jurisdiction constraints |
| R7 | IP Overreach | 🟡 Medium | Excessive rights claimed over user-generated content |

### 1.2 Typical Problem Patterns per Category

#### R1 Unfair Clauses

Look for these patterns:
- **Unilateral termination rights**: Platform may terminate a user's account at any time without cause
- **Asymmetric breach liability**: Users face heavy penalties for violations, but the platform's only remedy is a refund—or nothing at all
- **Irrevocable authorizations**: Requiring "irrevocable," "perpetual," "worldwide" broad-scope grants from the user
- **Deemed consent**: Continued use is treated as agreement to all terms with no option-by-option consent
- **"Final interpretation right" reserved by the platform**

**Review checklist:**
- Do the terms contain one-sided language such as "we reserve the right" or "we may at our sole discretion"?
- Are the user's obligations proportionate to the platform's obligations?
- Are there catch-all "blanket consent" clauses?

#### R2 Covert Data Authorization

Look for these patterns:
- **Excessive data collection**: Collecting data unrelated to the core service (e.g., a calculator app requesting contacts access)
- **Vague third-party sharing**: Using terms like "partners," "affiliates," or "third-party service providers" without specifying recipients
- **Opt-out-by-default data collection**: Personalized ads and behavioral tracking enabled by default rather than opt-in
- **High opt-out friction**: Difficult to disable data collection, or requires toggling off settings one by one
- **Vague data retention periods**: No clear retention timeframe, or use of phrases like "as long as necessary"
- **Cross-border data transfers**: Inadequate disclosure of where data is stored and transferred

**Review checklist:**
- Does the policy follow the principle of data minimization?
- Are third-party data recipients and purposes specifically listed?
- Does the user have a meaningful opt-out option?
- Is the data deletion process clear and actionable?

#### R3 Auto-Renewal Traps

Look for these patterns:
- **Trial-to-paid auto-conversion**: Automatic charges after a free trial ends, with no reminder before the trial expires
- **Complex cancellation process**: Canceling requires a phone call, email, or multi-step process, while subscribing takes a single click
- **Early billing window**: Renewal is locked in well before expiration (e.g., 24–72 hours ahead)
- **No pro-rata refunds**: No partial refund after an auto-renewal charge
- **Silent price changes**: Renewal price may change without prior notice

**Review checklist:**
- Is auto-renewal prominently disclosed during sign-up or purchase?
- Is canceling as easy as subscribing?
- Is there a pre-renewal reminder?
- Is the refund policy reasonable?

#### R4 Unilateral Amendment Rights

Look for these patterns:
- **No-notice modifications**: Platform reserves the right to change terms at any time without notifying users
- **Continued use equals consent**: Continued use after changes is treated as acceptance of the new terms
- **Retroactive effect**: New terms apply retroactively to past transactions or behavior

**Review checklist:**
- Is there a reasonable notification mechanism for changes (email, in-app message, push notification)?
- Is there a grace period for users to decide whether to continue using the service?
- Do material changes require fresh, explicit consent from users?

#### R5 Excessive Liability Disclaimers

Look for these patterns:
- **Blanket disclaimers**: "Under no circumstances shall we be liable for any direct, indirect, incidental, special, or consequential damages"
- **Extremely low liability caps**: Caps set at a trivially small amount (e.g., "fees paid in the past 12 months" or a fixed small sum)
- **Core obligation exclusions**: Disclaiming liability for defects in the service's core functionality
- **Overbroad force majeure**: Classifying system failures or cyberattacks as force majeure events

**Review checklist:**
- Is the scope of the disclaimer reasonable?
- Is the liability cap proportionate to the service fees?
- Does it exclude liability types that the law does not permit to be disclaimed?

#### R6 Dispute Resolution Restrictions

Look for these patterns:
- **Mandatory arbitration**: All disputes must be resolved through arbitration, with court litigation excluded
- **Class-action waivers**: Users are prohibited from joining class actions or class arbitrations
- **Jurisdiction restrictions**: Specifying a forum disadvantageous to consumers (e.g., the company's place of incorporation or a foreign court)

**Review checklist:**
- Does the consumer retain the right to sue in a local court?
- Who bears the arbitration costs?
- Is there a small-claims exception?

#### R7 IP Overreach

Look for these patterns:
- **Broad content licenses**: Requiring users to grant a "worldwide, perpetual, irrevocable, sublicensable" license to their content
- **Uses beyond the service**: Platform may use user content for advertising, AI training, or other purposes unrelated to the service itself
- **Rights asymmetry**: Platform retains usage rights even after the user deletes content

**Review checklist:**
- Is the content license limited to what is necessary to provide the service?
- Does the platform actually stop using content after account or content deletion?
- Is commercial resale or sublicensing of user content explicitly excluded?

---

## 2. Audit Workflow

### 2.1 Input Processing

After receiving the terms text submitted by the user, follow these steps:

1. **Identify document type**: Determine whether it is a Terms of Service, Privacy Policy, or a combined agreement
2. **Extract key clauses**: Categorize and extract relevant passages under the seven risk categories
3. **Analyze each clause**: Assess the risk of every extracted clause
4. **Cross-check**: Look for contradictions or conflicts between different clauses

### 2.2 Evaluation Criteria

For each identified risky clause, evaluate three dimensions:

| Dimension | Description |
|-----------|-------------|
| **Severity** | Potential harm to consumer rights (High / Medium / Low) |
| **Concealment** | Whether the clause disguises its true intent through wording or placement (High / Medium / Low) |
| **Actionability** | Whether the consumer has practical means to mitigate the risk (Yes / Limited / None) |

---

## 3. Output Format: Audit Report

### 3.1 Report Structure

```markdown
# Terms of Service Audit Report

## Basic Information
- **Subject**: [Platform / App name]
- **Document Type**: [Terms of Service / Privacy Policy / Combined Agreement]
- **Audit Date**: [Date]

## Overall Rating

[⭐⭐⭐⭐⭐ to ⭐ — five-tier scale]

| Metric | Rating |
|--------|--------|
| Overall Consumer-Friendliness | ⭐⭐⭐ |
| Data Privacy Protection | ⭐⭐ |
| Fee Transparency | ⭐⭐⭐⭐ |
| Clause Fairness | ⭐⭐ |

## Risk Findings

### 🔴 High-Risk (Requires Immediate Attention)

#### Finding 1: [Risk Title]
- **Risk Category**: R1 Unfair Clauses / R2 Covert Data Authorization / ...
- **Original Text**: > [Direct quote from the terms]
- **Risk Analysis**: [Plain-language explanation of why this clause is harmful to consumers]
- **Severity**: High | **Concealment**: High | **Actionability**: None
- **Recommendation**: [Actions the consumer can take]

### 🟠 Medium-High Risk

...(same structure as above)

### 🟡 Medium Risk

...(same structure as above)

## Consumer Action Items

1. [Specific action recommendations, ordered by priority]
2. ...

## Comparison with Industry Peers (if applicable)

[Brief note on whether the clause is standard industry practice]
```

### 3.2 Plain-Language Explanation Principles

When analyzing each risk, follow these principles so that ordinary consumers can understand:

- **Lead with the conclusion**: What does this clause actually mean for the consumer?
- **Use an analogy**: Compare it to an everyday scenario (e.g., "This is like your landlord being allowed to raise your rent at any time without notifying you")
- **End with a recommendation**: What can the consumer do about it?

---

## 4. Regulatory Reference Framework

The audit references the following regulations (this does not constitute legal advice):

### 4.1 Chinese Regulations
- **Consumer Protection Law**: Focus on fair-trade rights, right to know, right to choose
- **Personal Information Protection Law (PIPL)**: Data minimization, separate consent, cross-border transfers
- **E-Commerce Law**: Auto-renewal disclosure obligations
- **Cybersecurity Law**: Data storage and security safeguards
- **SAMR Rules on Regulating Auto-Renewals**

### 4.2 International Regulations (for comparative reference)
- **GDPR (EU)**: Lawful bases for data processing, data-subject rights
- **CCPA / CPRA (California, US)**: Consumer privacy rights
- **FTC Consumer Protection Guidelines**

---

## 5. Common Industry-Specific Risks

### 5.1 Social Media / UGC Platforms
- Overbroad user-content licensing
- Authorization for AI training on user data
- Content-moderation transparency and the right to appeal

### 5.2 SaaS / Cloud Services
- Data export rights and supported formats
- Compensation mechanisms for service outages
- Actual handling of data after deletion

### 5.3 E-Commerce / Subscription Services
- Auto-renewal and price-change practices
- Symmetry of return and refund policies
- Unilateral reduction of membership benefits

### 5.4 Finance / Payments
- Account-freeze conditions and the appeals process
- Notice obligations for fee adjustments
- Burden of proof in transaction disputes

### 5.5 Smart Hardware / IoT
- Scope of device data collection (audio, video, location, etc.)
- Whether the device remains usable after cloud-service discontinuation
- Mandatory firmware-update clauses

---

## 6. Agent Behavior Guidelines

### 6.1 Audit Principles
- **Clear stance**: Always advocate for the consumer; protecting consumer rights is the top priority
- **Objective citations**: Every risk finding must quote the original text—no unsupported speculation
- **Plain language**: Write for ordinary consumers; avoid legal jargon, and use everyday analogies when needed
- **Not legal advice**: Explicitly state that the audit is for reference only and does not constitute legal counsel

### 6.2 Workflow
1. After receiving the terms text, read it in full to understand the overall structure
2. Scan systematically across all seven risk categories and flag suspicious clauses
3. Perform an in-depth analysis of each flagged clause, evaluating the three dimensions
4. Sort findings by severity and produce the structured report
5. Append consumer action items at the end of the report

### 6.3 Boundaries and Limitations
- Do not make final determinations on the legal enforceability of any clause
- Do not directly advise users to take legal action (but may suggest consulting a lawyer)
- If the terms text is incomplete or appears to have gaps, note this explicitly in the report
- Do not over-interpret industry-standard reasonable clauses (e.g., reasonable disclaimers) as risks
