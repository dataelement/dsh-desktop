---
name: regulatory-audit-generator
description: "Builds compliance checklists for business scenarios involving GDPR, PIPL, or advertising/data laws. Outputs a structured checklist with check items, legal basis, risk levels, and actionable recommendations. Triggered by requests like \"run a compliance check,\" \"GDPR/PIPL compliance,\" \"pre-launch review,\" \"privacy impact assessment (PIA/DPIA),\" or asking if a feature is compliant."
license: MIT
---

# Regulatory Audit Generator — Business Scenario Compliance Checklist Builder

Identifies applicable laws and regulations based on the user's business scenario description, and outputs a structured compliance checklist covering major regulations such as GDPR, PIPL (Personal Information Protection Law), Advertising Law, Cybersecurity Law, and Data Security Law.

## Quick Start

Users simply describe their business scenario, and the Agent will:

1. **Identify applicable regulations**: Determine which laws and regulations apply based on the business scenario
2. **Generate a checklist**: Output a structured list of check items
3. **Label risk levels**: Prioritize by severity, marking high/medium/low risk
4. **Provide remediation recommendations**: Offer actionable remediation guidance for each compliance risk

Users just need to say:
> "We're launching a user profiling feature — help me create a compliance checklist."

The Agent will guide the user to provide necessary information, then output a complete compliance checklist.

---

## 1. Supported Regulatory Frameworks

### Core Regulations

| Regulation | Abbreviation | Scope | Key Focus Areas |
|------------|-------------|-------|-----------------|
| Personal Information Protection Law | PIPL | Processing personal information within China | Informed consent, data minimization, cross-border data transfer |
| General Data Protection Regulation | GDPR | Involving EU user data | Lawful basis, data subject rights, DPO, DPIA |
| Data Security Law | DSL | Data processing activities within China | Data classification & grading, security assessment, important data export |
| Cybersecurity Law | CSL | Network operators | Multi-Level Protection Scheme (MLPS), log retention, security incident reporting |
| Advertising Law | — | Advertising publishing and operations | Prohibited superlative claims, false advertising, medical advertising |
| E-Commerce Law | — | E-commerce operators | Information disclosure, user reviews, bundled sales |
| Anti-Unfair Competition Law | — | Market business activities | Commercial bribery, false advertising, trade secret infringement |
| Consumer Protection Law | — | Consumer rights related | Right to know, fair trade rights, personal information |

### Industry-Specific Regulations

| Industry | Relevant Regulations / Standards |
|----------|--------------------------------|
| Finance | Technical Specification for Personal Financial Information Protection (JR/T 0171), Data Security Management Measures for Banking and Insurance Institutions |
| Healthcare | Population Health Information Management Measures, Medical Big Data Standards |
| Education | Online Protection Chapter of the Minors Protection Law, Provisions on Protection of Children's Personal Information Online |
| Automotive | Several Provisions on Automobile Data Security Management |
| Mobile Apps | Methods for Identifying Illegal Collection and Use of Personal Information by Apps, Provisions on the Scope of Necessary Personal Information for Common Types of Mobile Applications |

---

## 2. Compliance Check Procedure (SOP)

### Step 1: Gather Business Scenario Information

Confirm the following key information with the user:

| Dimension | Information to Confirm | Example |
|-----------|----------------------|---------|
| Business Description | Specific content of the feature/service | "User profiling feature that recommends products based on behavioral data" |
| User Group | Geographic region and demographics of target audience | "Mainland China users, including minors" |
| Data Types | What data is collected/processed | "Name, phone number, browsing history, location data" |
| Data Flow | Data storage, transmission, and sharing details | "Stored on Alibaba Cloud East China nodes, shared with third-party ad platforms" |
| Business Stage | New launch / existing system needing remediation / M&A due diligence | "New feature, planned for launch next month" |
| Existing Measures | Current compliance measures already in place | "Has a privacy policy, but no DPIA completed" |

**If the user has not provided certain information, the Agent should proactively ask follow-up questions rather than assume or skip.**

### Step 2: Identify Applicable Regulations

Based on collected information, determine applicable regulations using the following rules:

```
IF processing personal information → PIPL
IF involving EU users → GDPR
IF involving data storage/transmission → Data Security Law + Cybersecurity Law
IF involving advertising/marketing content → Advertising Law
IF involving e-commerce transactions → E-Commerce Law
IF involving minors → Minors Protection Law + Provisions on Protection of Children's Personal Information Online
IF cross-border data transfer (overseas storage/transmission/access) → PIPL Chapter 3 + Measures for Security Assessment of Data Export
IF involving sensitive personal information → PIPL Chapter 2 Section 2 (separate consent + PIIA)
IF involving automated decision-making → PIPL Article 24 (transparency + right to refuse)
IF involving financial data → JR/T 0171
```

### Step 3: Generate the Compliance Checklist

Output the checklist in the following structure:

#### Checklist Output Format

```markdown
# [Business Scenario Name] Compliance Checklist

**Assessment Date**: YYYY-MM-DD
**Business Description**: [Brief description]
**Applicable Regulations**: [List of regulations]

## Checklist

| No. | Check Item | Legal Basis | Risk Level | Current Status | Remediation Advice |
|-----|-----------|-------------|------------|----------------|-------------------|
| 1 | [Check item description] | [Regulation name + article number] | High/Medium/Low | Compliant/Non-compliant/To be confirmed | [Specific advice] |

## Risk Summary

- High-risk items: X items
- Medium-risk items: X items
- Low-risk items: X items

## Priority Remediation Recommendations

1. [Highest priority remediation item and rationale]
2. [Second highest priority item and rationale]
```

### Step 4: Output Remediation Priorities

Prioritize remediation actions according to the following rules:

| Priority | Criteria | Description |
|----------|----------|-------------|
| P0 — Immediate Action | High risk + currently non-compliant | May face administrative penalties, service shutdown |
| P1 — Complete This Week | High risk + to be confirmed, or medium risk + non-compliant | Significant compliance exposure |
| P2 — Complete This Month | Medium risk + to be confirmed | Requires further assessment and improvement |
| P3 — Ongoing Optimization | Low risk | Recommended improvement but not urgent |

---

## 3. Common Business Scenario Check Points

### Scenario 1: User Registration and Login

| Check Item | Legal Basis | Description |
|-----------|-------------|-------------|
| Is there a privacy policy / user agreement? | PIPL Art. 17 | Must be displayed and consent obtained before registration |
| Is only necessary personal information collected? | PIPL Art. 6 | Registration stage should only require phone number/email; should not mandate ID numbers, etc. |
| Does third-party login disclose data sharing? | PIPL Art. 23 | Login via WeChat/Alipay must disclose what information is shared |
| Are passwords stored encrypted? | CSL Art. 21 | Plaintext password storage is prohibited |
| Is account deletion supported? | PIPL Art. 47 | A convenient account deletion channel must be provided |

### Scenario 2: Marketing and Advertising

| Check Item | Legal Basis | Description |
|-----------|-------------|-------------|
| Is consent obtained for marketing SMS/emails? | PIPL Art. 13, Advertising Law Art. 43 | Explicit user consent is required |
| Is an unsubscribe mechanism provided? | Advertising Law Art. 43 | Each marketing message must include an opt-out method |
| Does ad copy contain prohibited superlative terms? | Advertising Law Art. 9 | Absolute terms like "best," "number one," "national-level" are prohibited |
| Can profiling-based recommendations be disabled? | PIPL Art. 24 | An option for non-personalized content must be provided |
| Are advertisements clearly labeled as "Ad"? | Advertising Law Art. 14 | Mass media channels must clearly mark advertisements |

### Scenario 3: Cross-Border Data Transfer

| Check Item | Legal Basis | Description |
|-----------|-------------|-------------|
| Does it meet the security assessment filing threshold? | Measures for Security Assessment of Data Export Art. 4 | Processing personal information of 1M+ individuals, or cumulative export of 100K individuals / 10K sensitive records |
| Has the standard contract been signed? | Standard Contract Measures for Personal Information Export | Can sign the standard contract if below the filing threshold |
| Has a Personal Information Protection Impact Assessment been completed? | PIPL Art. 55 | PIIA must be completed before data export |
| Has the user been informed and separate consent obtained? | PIPL Art. 39 | Must disclose overseas recipient information |
| Overseas recipient's data protection capability | PIPL Art. 38 | Must assess the recipient's data protection standards |

### Scenario 4: User Profiling and Personalized Recommendations

| Check Item | Legal Basis | Description |
|-----------|-------------|-------------|
| Is the automated decision-making logic disclosed? | PIPL Art. 24 | Must be transparent to users |
| Is an option to disable personalized recommendations provided? | PIPL Art. 24 | Users have the right to refuse |
| Has a PIIA been conducted for user profiling? | PIPL Art. 55 | Assessment is required when using personal information for automated decision-making |
| Do profiling tags involve sensitive information? | PIPL Art. 28 | Tags related to religion, health, finance, etc. are classified as sensitive information |
| Is the use scope of profiling results restricted? | PIPL Art. 24 | Must not impose unreasonable differential treatment in areas such as transaction pricing |

### Scenario 5: GDPR Compliance (for EU Users)

| Check Item | Legal Basis | Description |
|-----------|-------------|-------------|
| Has a lawful basis for processing been established? | GDPR Art. 6 | One of six bases: consent, contract, legal obligation, legitimate interest, etc. |
| Has a DPO been appointed? | GDPR Art. 37 | Required for large-scale processing or processing of special category data |
| Has a DPIA been completed? | GDPR Art. 35 | Required for high-risk processing activities |
| Is the right to data portability supported? | GDPR Art. 20 | Data must be provided in a structured, machine-readable format |
| Can data breaches be reported within 72 hours? | GDPR Art. 33 | Supervisory authority must be notified within 72 hours of discovering a breach |
| Is the cookie banner compliant? | GDPR + ePrivacy | Active consent required; pre-checked boxes are not permitted |
| Are records of processing activities maintained? | GDPR Art. 30 | Required for organizations with 250+ employees or non-occasional processing |

---

## 4. Risk Level Criteria

| Risk Level | Criteria | Potential Consequences |
|-----------|----------|----------------------|
| High | Violation of mandatory legal provisions; unlawful processing of sensitive personal information; lack of lawful basis; data export without assessment | Administrative penalties (fines), service shutdown, criminal liability |
| Medium | Compliance measures incomplete but foundational; insufficient notice; flawed consent mechanism; partial security measure gaps | Regulatory interview, ordered remediation within deadline, user complaints |
| Low | Best practices not met but not unlawful; incomplete documentation; processes can be optimized | Audit findings, internal improvements |

---

## 5. Deliverables

The Agent should ultimately deliver the following to the user:

1. **Compliance Checklist Table**: All check items with legal basis, risk levels, current status, and remediation advice
2. **Risk Summary**: Count of high/medium/low risk items
3. **Priority Remediation Roadmap**: Remediation action list ordered by P0–P3
4. **Supplementary Notes**: Plain-language explanations of key compliance requirements to help non-legal staff understand

---

## 6. Disclaimers

1. **Regulatory Currency**: Laws and regulations are continuously updated. Regulation references in the checklist should be verified against the latest versions. The Agent should remind users to check for the most recent regulatory developments.
2. **Not Legal Advice**: This checklist is for reference only and does not constitute legal advice. For significant compliance decisions, consultation with a qualified attorney is recommended.
3. **Industry Variations**: Different industries have specific regulatory requirements. The checklist should be adapted to account for industry-specific considerations.
4. **Ongoing Compliance**: Compliance is not a one-time effort. Regular reassessment (at least every six months) is recommended.

---

## References

- Personal Information Protection Law of the People's Republic of China (PIPL, 2021)
- Data Security Law of the People's Republic of China (DSL, 2021)
- Cybersecurity Law of the People's Republic of China (CSL, 2017)
- Advertising Law of the People's Republic of China (2018 Amendment)
- EU General Data Protection Regulation (GDPR, 2018)
- Measures for Standard Contracts for Personal Information Export (2023)
- Measures for Security Assessment of Data Export (2022)
- GB/T 35273-2020 Information Security Technology — Personal Information Security Specification
