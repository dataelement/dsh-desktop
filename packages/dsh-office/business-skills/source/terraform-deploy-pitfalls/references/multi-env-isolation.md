# Multi-Environment Isolation Checklist

When creating a second Terraform environment (`staging`, `lab`, etc.) in the same cloud account alongside production, every item below must be verified. Skip one and you get silent name collisions or cross-contamination.

## Terraform state isolation

Two environments MUST use different state paths. Same OSS/S3 bucket is fine — different prefix isolates completely:

```hcl
# production
backend "oss" {
  bucket = "myproject-terraform-state"
  prefix = "environments/production"
}

# staging
backend "oss" {
  bucket = "myproject-terraform-state"  # same bucket OK
  prefix = "environments/staging"       # different prefix = isolated state
}
```

**Verification**: `terraform state list` in one environment must show ZERO resources from the other.

## Resource naming collision matrix

Grep every `.tf` file for hardcoded names. Every globally-unique resource will collide.

### Must rename (apply will fail)

| Resource | Uniqueness scope | Fix pattern |
|---|---|---|
| SSH key pair (`key_pair_name`) | Region | `"${env}-deploy"` |
| SLS log project (`project_name`) | Account | `"${env}-logs"` |
| CloudMonitor contact (`alarm_contact_name`) | Account | `"${env}-ops"` |
| CloudMonitor contact group | Account | `"${env}-ops"` |

### Should rename (won't fail but causes confusion)

| Resource | Issue if same name |
|---|---|
| Security group name | Two SGs with same name in same VPC, can't tell apart in console |
| ECS instance name/hostname | Two instances named `myapp-spot` in console |
| Data disk name | Same in disk list |
| Auto snapshot policy name | Same in policy list |
| SLS machine group name | Logs from both instances land in same group |

### Pattern: Use a module name variable

```hcl
# production main.tf
module "app" {
  source = "../../modules/spot-with-data-disk"
  name   = "production-spot"  # flows to instance_name, disk_name, snapshot_policy_name
}

# staging main.tf
module "app" {
  source = "../../modules/spot-with-data-disk"
  name   = "staging-spot"     # all child resource names auto-isolated
}
```

## DNS record isolation

### The duplication trap

Two Terraform environments creating A records for `@` (root) in the same Cloudflare zone:
- Each gets its own Cloudflare record ID (independent)
- Cloudflare now has TWO A records for the same domain
- DNS round-robins between the two IPs
- ~50% of traffic goes to the wrong instance

### Correct patterns

**Pattern A: Subdomain isolation** (recommended for staging/lab):
```hcl
# Production: root domain records
resource "cloudflare_dns_record" "prod" {
  name = "@"  # gpt-6.pro
}

# Staging: subdomain records only
resource "cloudflare_dns_record" "staging" {
  name = "staging"  # staging.gpt-6.pro
}
```

**Pattern B: Separate zones** (for fully independent deployments):
Each environment gets its own domain/zone. No shared Cloudflare zone IDs.

**Pattern C: One environment owns DNS** (production):
Only production has DNS resources. Other environments access via IP only.

### Destroy safety

When one environment is destroyed:
- Its DNS records are deleted (by their specific Cloudflare record IDs)
- Other environments' DNS records are NOT affected
- **Verify before destroy**: Compare DNS record IDs between environments:
  ```bash
  terraform state show 'cloudflare_dns_record.app["root"]' | grep "^id"
  ```
  IDs must be different.

## Shared resources (safe to share)

These are referenced but NOT managed by the second environment:

| Resource | Why safe |
|---|---|
| VPC / VSwitch | Referenced by ID, not created |
| Cloudflare zone ID | Referenced, records are independent |
| OSS state bucket | Different prefix = different state |
| SSH public key content | Same key, different key pair resource |
| Cloud provider credentials | Same account, different resources |

## Makefile pattern for multi-environment

```makefile
ENV ?= production
ENV_DIR := environments/$(ENV)

init: ; cd $(ENV_DIR) && terraform init
plan: ; cd $(ENV_DIR) && terraform plan -out=tfplan
apply: ; cd $(ENV_DIR) && terraform apply tfplan
drift: ; cd $(ENV_DIR) && terraform plan -detailed-exitcode
```

Usage: `make plan ENV=staging`
