# API Export Commands by Platform

Quick reference for evidence collection CLI commands. All commands output JSON or CSV for audit-ready evidence.

## GitHub

```bash
# Org settings
gh api orgs/{org} | jq '{name, two_factor_requirement_enabled, default_repository_permission, members_can_create_public_repositories}'

# Members with roles
gh api orgs/{org}/members --paginate | jq '.[] | {login, type, site_admin}'

# Org admins
gh api orgs/{org}/members?role=admin --paginate | jq '.[].login'

# Branch protection
gh api repos/{owner}/{repo}/branches/{branch}/protection

# Recent merged PRs
gh pr list --state merged --limit 50 --json number,title,author,reviewDecision,mergedAt,mergedBy

# Dependabot alerts (open)
gh api repos/{owner}/{repo}/dependabot/alerts?state=open

# Code scanning alerts
gh api repos/{owner}/{repo}/code-scanning/alerts --paginate

# Secret scanning alerts
gh api orgs/{org}/secret-scanning/alerts --paginate

# Audit log (enterprise/org)
gh api orgs/{org}/audit-log?per_page=100

# Repository list with visibility
gh repo list {org} --json name,visibility,isArchived --limit 100

# Team membership
gh api orgs/{org}/teams --paginate | jq '.[].slug'
```

## GCP (Google Cloud)

```bash
# IAM policy (who has access)
gcloud projects get-iam-policy {project} --format=json

# Service accounts
gcloud iam service-accounts list --format=json

# Service account keys (key rotation evidence)
gcloud iam service-accounts keys list --iam-account={sa_email} --format=json

# Compute instances (asset inventory)
gcloud compute instances list --format=json

# Firewall rules
gcloud compute firewall-rules list --format=json

# Cloud SQL instances
gcloud sql instances list --format=json

# Cloud SQL backups
gcloud sql backups list --instance={instance} --format=json

# Log sinks (centralization)
gcloud logging sinks list --format=json

# Audit config
gcloud projects get-iam-policy {project} --format=json | jq '.auditConfigs'

# Alerting policies
gcloud monitoring policies list --format=json

# Cloud KMS keys
gcloud kms keys list --location=global --keyring={keyring} --format=json

# VPC networks
gcloud compute networks list --format=json

# Cloud Storage buckets
gcloud storage ls --json
```

## Azure

```bash
# Role assignments
az role assignment list --all --output json

# Users (Azure AD)
az ad user list --output json | jq '.[] | {displayName, userPrincipalName, accountEnabled}'

# Global admins (via MS Graph)
az rest --method GET \
  --url "https://graph.microsoft.com/v1.0/directoryRoles/$(az rest --method GET --url 'https://graph.microsoft.com/v1.0/directoryRoles' --query "value[?displayName=='Global Administrator'].id" -o tsv)/members" \
  --query "value[].{displayName:displayName,upn:userPrincipalName}" -o json

# Activity log
az monitor activity-log list --max-events 100 --output json

# Network security groups
az network nsg list --output json

# Storage account encryption
az storage account list --query "[].{name:name, encryption:encryption}" --output json

# Backup jobs
az backup job list --resource-group {rg} --vault-name {vault} --output json

# Key Vault access policies
az keyvault show --name {vault} --query "properties.accessPolicies" --output json

# Alert rules
az monitor alert list --output json

# Subscriptions (environment separation)
az account list --output json
```

## Google Workspace (GAM)

```bash
# Users with MFA status
gam print users fields primaryEmail,name,isEnrolledIn2Sv,isEnforcedIn2Sv,lastLoginTime,creationTime,suspended

# Admin roles
gam print admins

# Mobile devices
gam print mobile fields email,deviceId,type,status,os

# Groups and membership
gam print groups fields email,name,directMembersCount

# OAuth tokens (third-party app access)
gam all users print tokens

# Login activity
gam report login user all start {date} end {date}

# Admin activity
gam report admin start {date} end {date}
```

## macOS Endpoint

```bash
# FileVault status
fdesetup status

# Hardware/software info
system_profiler SPHardwareDataType SPSoftwareDataType

# Configuration profiles (MDM policies)
profiles show -type configuration

# Firewall status
/usr/libexec/ApplicationFirewall/socketfilterfw --getglobalstate

# SIP (System Integrity Protection) status
csrutil status

# Gatekeeper status
spctl --status

# Software updates available
softwareupdate --list 2>&1

# Installed applications
system_profiler SPApplicationsDataType -json
```

## General / Cross-Platform

```bash
# TLS configuration check
openssl s_client -connect {host}:443 -tls1_2 < /dev/null 2>&1 | grep -E "Protocol|Cipher"

# DNS records (for domain ownership)
dig +short {domain} ANY

# SSL certificate details
echo | openssl s_client -connect {host}:443 2>/dev/null | openssl x509 -noout -dates -subject

# NTP sync status (Linux)
timedatectl status | grep -E "NTP|synchronized"

# NTP sync status (macOS)
sntp -d time.apple.com 2>&1 | head -5
```
