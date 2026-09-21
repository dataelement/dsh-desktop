# Evidence Types by Control Domain

Map of what evidence is expected for each control domain, with format requirements.

## Access Control Domain (A.5.15-A.5.18, A.8.2-A.8.5)

| Evidence | Format | Refresh | Controls |
|----------|--------|---------|----------|
| User access list (all systems) | JSON/CSV export from IdP | Quarterly | A.5.15, A.5.18 |
| Privileged user list | JSON export from IAM | Quarterly | A.8.2 |
| Access review records | Spreadsheet with reviewer decisions | Quarterly | A.5.15, A.5.18 |
| MFA enrollment report | CSV from IdP | Quarterly | A.5.17, A.8.5 |
| Terminated user access revocation | Cross-reference: HR list vs. active accounts | On termination | A.5.18 |
| Service account inventory | JSON from cloud IAM | Quarterly | A.5.16 |
| Access control policy | PDF/markdown (versioned) | Annual review | A.5.15 |

## Incident Response Domain (A.5.24-A.5.29, A.6.8)

| Evidence | Format | Refresh | Controls |
|----------|--------|---------|----------|
| Incident response plan | PDF/markdown (versioned) | Annual review | A.5.24 |
| Tabletop exercise records | Meeting notes with date, scenario, participants | Annual | A.5.24 |
| Incident log/register | Ticketing system export | Continuous | A.5.25, A.5.26 |
| Post-incident review reports | Document per incident | Per incident | A.5.27 |
| Incident communication records | Email/chat exports | Per incident | A.5.26 |
| Event reporting channel config | Screenshot of Slack channel / email alias | Annual | A.6.8 |

## Cryptographic Controls (A.8.24, A.8.10-A.8.12)

| Evidence | Format | Refresh | Controls |
|----------|--------|---------|----------|
| Encryption at rest configuration | JSON from cloud API | Quarterly | A.8.24 |
| TLS configuration scan | `openssl` output or SSL Labs report | Quarterly | A.8.24 |
| Key management policy | PDF/markdown | Annual | A.8.24 |
| Certificate inventory | Export from cert manager | Quarterly | A.8.24 |
| Data classification policy | PDF/markdown | Annual | A.8.10, A.8.12 |
| DLP tool configuration | Screenshot or config export | Annual | A.8.12 |

## Logging and Monitoring (A.8.15-A.8.17)

| Evidence | Format | Refresh | Controls |
|----------|--------|---------|----------|
| Audit log configuration | JSON from cloud API | Quarterly | A.8.15 |
| Log centralization (sink config) | JSON from cloud API | Quarterly | A.8.15 |
| Log retention settings | Screenshot or config export | Annual | A.8.15 |
| Alert configuration | JSON from monitoring tool | Quarterly | A.8.16 |
| Sample alert + response | Ticketing system export | Quarterly | A.8.16 |
| NTP sync evidence | CLI output from servers | Annual | A.8.17 |

## Change Management (A.8.25-A.8.34, A.8.9)

| Evidence | Format | Refresh | Controls |
|----------|--------|---------|----------|
| Change management policy | PDF/markdown | Annual | A.8.32 |
| Branch protection config | JSON from GitHub API | Quarterly | A.8.32 |
| Recent merged PRs with reviews | JSON from GitHub API | Quarterly | A.8.32 |
| CI/CD pipeline configuration | YAML file export | Quarterly | A.8.25 |
| Dependency scan results | JSON from Dependabot/Snyk | Monthly | A.8.8 |
| Code scanning results | JSON from CodeQL/SAST | Monthly | A.8.28 |
| Deployment history | JSON from deployment tool | Quarterly | A.8.32 |
| Configuration baseline | IaC files (Terraform, etc.) | On change | A.8.9 |

## Business Continuity (A.5.30, A.8.13-A.8.14)

| Evidence | Format | Refresh | Controls |
|----------|--------|---------|----------|
| Business continuity plan | PDF/markdown | Annual | A.5.30 |
| Business impact analysis | Spreadsheet with RTO/RPO | Annual | A.5.30 |
| DR test records | Document with date, results | Annual | A.5.30 |
| Backup configuration | JSON from cloud API | Quarterly | A.8.13 |
| Backup test/restore records | Document with restore time | Annual | A.8.13 |
| Redundancy architecture | Diagram + cloud resource export | Annual | A.8.14 |

## People Controls (A.6.1-A.6.8)

| Evidence | Format | Refresh | Controls |
|----------|--------|---------|----------|
| Background check records | HR system export (redacted) | Per hire | A.6.1 |
| Employment agreements | Signed documents (sample) | Per hire | A.6.2 |
| Training completion records | LMS export or spreadsheet | Annual | A.6.3 |
| Disciplinary policy | PDF/markdown (in handbook) | Annual | A.6.4 |
| Offboarding checklist records | HR system export | Per termination | A.6.5 |
| NDA/confidentiality agreements | Signed documents (sample) | Per hire/engagement | A.6.6 |
| Remote work policy | PDF/markdown | Annual | A.6.7 |

## Supplier Management (A.5.19-A.5.23)

| Evidence | Format | Refresh | Controls |
|----------|--------|---------|----------|
| Vendor inventory/register | Spreadsheet | Quarterly | A.5.19 |
| Vendor security assessments | Per-vendor questionnaire | Annual per vendor | A.5.22 |
| Vendor SOC 2 / ISO reports | PDF from vendor | Annual | A.5.22 |
| Vendor contracts (security clauses) | Signed agreements (sample) | Per engagement | A.5.20 |
| Vendor DPAs | Signed agreements | Per vendor handling PII | A.5.20 |

## ISMS Management (Clauses 4-10)

| Evidence | Format | Refresh | Controls |
|----------|--------|---------|----------|
| ISMS scope document | PDF/markdown | Annual | C.4.3 |
| Information security policy | Signed PDF | Annual | C.5.2 |
| Risk assessment | Spreadsheet/register | Annual | C.6.1.2, C.8.2 |
| Statement of Applicability | Spreadsheet | Annual | C.6.1.3 |
| Risk treatment plan | Document with status | Ongoing | C.6.1.3, C.8.3 |
| Management review minutes | Meeting notes | Annual minimum | C.9.3 |
| Internal audit report | Document with findings | Annual | C.9.2 |
| Corrective action log | Spreadsheet/tracker | Ongoing | C.10.2 |
