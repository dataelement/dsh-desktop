---
name: terraform-deploy-pitfalls
description: Operational traps for Terraform provisioners, multi-environment isolation, and zero-to-deployment reliability. Covers provisioner timing races, SSH connection conflicts, DNS record duplication, volume permissions, database bootstrap gaps, snapshot cross-contamination, Cloudflare credential format errors, hardcoded domains in Caddyfiles/compose, and init-data-only-on-first-boot pitfalls. Activate when writing null_resource provisioners, creating multi-environment Terraform setups, debugging containers that are Restarting/unhealthy after terraform apply, setting up fresh instances with cloud-init, or any IaC code that SSHs into remote hosts. Also activate when the user mentions terraform plan/apply errors, provisioner failures, infrastructure drift, TLS certificate errors, or Caddy/gateway configuration.
---

# Terraform Operational Traps

Failure patterns from real deployments. Every item caused an incident. Organized as: **exact error → root cause → copy-paste fix**.

## Provisioner traps (symptom → fix)

### `docker: not found` in remote-exec

cloud-init still installing Docker when provisioner SSHs in.

```hcl
provisioner "remote-exec" {
  inline = [
    "cloud-init status --wait || true",
    "which docker || { echo 'FATAL: Docker not ready'; exit 1; }",
  ]
}
```

### `rsync: connection unexpectedly closed` in local-exec

Terraform holds its SSH connection open; local-exec rsync opens a second one that gets rejected. Never use local-exec for file transfer to remote. Use tarball + file provisioner:

```hcl
provisioner "local-exec" {
  command = "tar czf /tmp/src.tar.gz --exclude=node_modules --exclude=.git -C ${path.module}/../../.. myproject"
}
provisioner "file" {
  source      = "/tmp/src.tar.gz"
  destination = "/tmp/src.tar.gz"
}
provisioner "remote-exec" {
  inline = ["tar xzf /tmp/src.tar.gz -C /data/ && rm -f /tmp/src.tar.gz"]
}
```

macOS BSD tar: `--exclude` must come BEFORE the source argument.

### `cloud-init status` shows "running" forever

`apt-get -y` does not suppress debconf dialogs. Packages like `iptables-persistent` block on TTY prompts.

```yaml
- |
    echo iptables-persistent iptables-persistent/autosave_v4 boolean true | debconf-set-selections
    echo iptables-persistent iptables-persistent/autosave_v6 boolean true | debconf-set-selections
    DEBIAN_FRONTEND=noninteractive apt-get install -y iptables-persistent
```

Known offenders: `iptables-persistent`, `postfix`, `mysql-server`, `wireshark-common`.

### `EACCES: permission denied` in container logs, container Restarting

Host volume dirs are root-owned; container runs as non-root (uid 1001). Fix before `docker compose up`:

```bash
mkdir -p /data/myapp/data /data/myapp/logs
chown -R 1001:1001 /data/myapp/data /data/myapp/logs
```

Find UID: grep `adduser.*-u` or `USER` in Dockerfile.

### Provisioner fails but no diagnostic output

`set -e` exits on first error, hiding subsequent `docker logs` output. Use `set -u` without `-e`, put one verification gate at the end:

```hcl
provisioner "remote-exec" {
  inline = [
    "set -u",
    "docker compose up -d",
    "sleep 15",
    "docker logs myapp --tail 20 2>&1 || true",
    "docker ps --format 'table {{.Names}}\\t{{.Status}}' || true",
    "docker ps --filter name=myapp --format '{{.Status}}' | grep -q healthy || exit 1",
  ]
}
```

### Container `Restarting` — database tables missing

DB migrations not in provisioner. PostgreSQL `docker-entrypoint-initdb.d` only runs on empty data dir. Explicitly create DB + run migrations:

```bash
# After postgres healthy:
docker exec pg psql -U postgres -tc "SELECT 1 FROM pg_database WHERE datname='mydb'" | grep -q 1 \
  || docker exec pg psql -U postgres -c "CREATE DATABASE mydb;"

# Idempotent migrations:
for f in migrations/*.sql; do
  VER=$(basename $f)
  APPLIED=$($PSQL -tAc "SELECT 1 FROM schema_migrations WHERE version='$VER'" | tr -d ' ')
  [ "$APPLIED" = "1" ] && continue
  { echo 'BEGIN;'; cat $f; echo 'COMMIT;'; } | $PSQL
  $PSQL -tAc "INSERT INTO schema_migrations(version) VALUES ('$VER') ON CONFLICT DO NOTHING"
done
```

### `docker compose build` ignores env var override

Compose reads build args from `.env` file, not shell env. `VAR=x docker compose build` does NOT work.

```bash
# WRONG
DOCKER_WITH_PROXY_MODE=disabled docker compose build

# RIGHT
grep -q DOCKER_WITH_PROXY_MODE .env || echo 'DOCKER_WITH_PROXY_MODE=disabled' >> .env
docker compose build
```

### TLS handshake fails: `Invalid format for Authorization header`

Caddy DNS-01 ACME needs a Cloudflare **API Token** (`cfut_` prefix, 40+ chars, Bearer auth). A **Global API Key** (37 hex chars, X-Auth-Key auth) causes `HTTP 400 Code:6003`. Production may appear to work because it has cached certificates; fresh environments fail on first cert request.

```bash
# Verify token format before deploy:
TOKEN=$(grep CLOUDFLARE_API_TOKEN .env | cut -d= -f2)
echo "$TOKEN" | grep -q "^cfut_" || echo "FATAL: needs API Token, not Global Key"
```

Create scoped token via API:
```bash
curl -s "https://api.cloudflare.com/client/v4/user/tokens" -X POST \
  -H "X-Auth-Email: $CF_EMAIL" -H "X-Auth-Key: $CF_GLOBAL_KEY" \
  -d '{"name":"caddy-dns-acme","policies":[{"effect":"allow",
    "resources":{"com.cloudflare.api.account.zone.<ZONE_ID>":"*"},
    "permission_groups":[
      {"id":"4755a26eedb94da69e1066d98aa820be","name":"DNS Write"},
      {"id":"c8fed203ed3043cba015a93ad1616f1f","name":"Zone Read"}]}]}'
```

### TLS fails on staging but works on production — hardcoded domains

Caddyfile or compose has literal domain names. Staging Caddy loads production config, tries to get certs for domains it doesn't own → ACME fails.

**Caddyfile**: Use `{$VAR}` — Caddy evaluates env vars at startup.
```caddy
# WRONG
gpt-6.pro { tls { dns cloudflare {env.CLOUDFLARE_API_TOKEN} } }

# RIGHT
{$LOBEHUB_DOMAIN} { tls { dns cloudflare {env.CLOUDFLARE_API_TOKEN} } }
```

**Compose**: Use `${VAR:?required}` — fail-fast if unset.
```yaml
# WRONG
- APP_URL=https://gpt-6.pro

# RIGHT
- APP_URL=${APP_URL:?APP_URL is required}
```

Pass the env var to the gateway container so Caddy can read it:
```yaml
environment:
  - LOBEHUB_DOMAIN=${LOBEHUB_DOMAIN:?LOBEHUB_DOMAIN is required}
  - CLOUDFLARE_API_TOKEN=${CLOUDFLARE_API_TOKEN:?required for DNS-01 TLS}
```

### OAuth login fails: `Social sign in failed`

Casdoor `init_data.json` contains hardcoded redirect URIs. `--createDatabase=true` only applies init_data on first-ever DB creation — not on restarts. Fix via SQL in provisioner:

```bash
# Replace production domain with staging in existing Casdoor DB
$PSQL -c "UPDATE application SET redirect_uris = REPLACE(redirect_uris,
  'gpt-6.pro', 'staging.gpt-6.pro')
  WHERE name='lobechat'
  AND redirect_uris LIKE '%gpt-6.pro%'
  AND redirect_uris NOT LIKE '%staging.gpt-6.pro%';"
```

Also check `AUTH_CASDOOR_ISSUER` — it must match the Casdoor subdomain (`auth.staging.example.com`), not the app root domain.

## Multi-environment isolation

Before creating a second environment, grep `.tf` files for hardcoded names. See [references/multi-env-isolation.md](references/multi-env-isolation.md) for the complete matrix.

**Will fail on apply** (globally unique):

| Resource | Scope | Fix |
|---|---|---|
| SSH key pair | Region | `"${env}-deploy"` |
| SLS log project | Account | `"${env}-logs"` |
| CloudMonitor contact | Account | `"${env}-ops"` |

**DNS duplication trap**: Two environments creating A records for the same name in the same Cloudflare zone → two independent record IDs → DNS round-robin → ~50% traffic to wrong instance. Fix: use subdomain isolation (`staging.example.com`) or separate zones. Remember to create DNS records for ALL subdomains Caddy serves (e.g., `auth.staging`, `minio.staging`).

**Snapshot cross-contamination**: Unfiltered `data "alicloud_ecs_snapshots"` returns ALL account snapshots. New env inherits old 100GB snapshot, fails creating 40GB disk. Gate with variable:

```hcl
locals {
  latest_snapshot_id = var.enable_snapshot_recovery && length(local.available_snapshots) > 0
    ? local.available_snapshots[0].snapshot_id : null
}
```

Do NOT add `count` to the data source — changes its state address, causes drift.

## Pre-deploy validation

Run a validation script **before** `terraform apply` to catch configuration errors locally. This eliminates the deploy→discover→fix→redeploy cycle.

Key checks (see [references/pre-deploy-validation.md](references/pre-deploy-validation.md)):
1. `terraform validate` — syntax
2. No hardcoded domains in Caddyfiles or compose files
3. Required env vars present (`LOBEHUB_DOMAIN`, `CLAUDE4DEV_DOMAIN`, `CLOUDFLARE_API_TOKEN`, `APP_URL`, etc.)
4. Cloudflare API Token format (not Global API Key)
5. DNS records exist for all Caddy-served domains
6. Casdoor issuer URL matches `auth.*` subdomain
7. SSH private key exists

Integrate into Makefile: `make pre-deploy ENV=staging` before `make apply`.

## Zero-to-deployment

Fresh disks expose every implicit dependency. See [references/zero-to-deploy-checklist.md](references/zero-to-deploy-checklist.md).

Key items that break provisioners on fresh instances:
1. **Directories**: `mkdir -p /data/{svc1,svc2}` in cloud-init — `file` provisioner fails if target dir missing
2. **Databases**: Explicit `CREATE DATABASE` — PG init scripts only run on empty data dir
3. **Migrations**: Tracked in `schema_migrations` table, applied idempotently
4. **Provisioner ordering**: `depends_on` between resources sharing Docker networks
5. **Memory**: Stop non-critical containers during Docker build on small instances (≤8GB)
6. **Domain parameterization**: Every domain in Caddyfile/compose must be `{$VAR}` / `${VAR:?required}`
7. **Credential format**: Caddy needs API Token (`cfut_`), not Global API Key
