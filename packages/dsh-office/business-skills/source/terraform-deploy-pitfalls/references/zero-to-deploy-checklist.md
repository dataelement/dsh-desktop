# Zero-to-Deployment Checklist

A fresh instance with an empty data disk exposes every implicit dependency that production silently relies on. This checklist covers everything that must be explicitly created before services will start.

## Pre-flight: cloud-init must handle

These run at OS boot, before Terraform provisioners:

- [ ] **Mount data disk**: Format if new (`blkid` check), mount to `/data`, add to fstab
- [ ] **Create service directories**: `mkdir -p /data/{service1,service2,...}` — file provisioners fail if target dir doesn't exist
- [ ] **Install Docker + Compose**: Curl installer, enable systemd service
- [ ] **Configure swap**: `fallocate` on data disk (NOT system disk)
- [ ] **SSH hardening**: key-only auth, no password root login
- [ ] **Firewall**: UFW + DOCKER-USER iptables chain
- [ ] **Debconf preseed**: For any package with interactive prompts (iptables-persistent, etc.)
- [ ] **Signal readiness**: Write timestamp to `/data/cloud-init.log`

## Provisioner ordering

Terraform provisioners execute in declaration order within a resource, but resources execute in parallel unless `depends_on` is set.

```
lobehub_deploy ──────────────────→ channel_sync (depends_on lobehub)
                                 → casdoor_sync (depends_on lobehub)
                                 → minio_sync (depends_on lobehub)

claude4dev_deploy (depends_on lobehub_deploy)
  ├─ wait for cloud-init
  ├─ upload source (tarball via file provisioner)
  ├─ upload .env (staging variant)
  ├─ start stateful (postgres, redis) --no-recreate
  ├─ run DB migrations
  ├─ build stateless images
  ├─ fix volume permissions
  ├─ start stateless (relay, api, frontend, gateway)
  └─ verify health
```

## Database bootstrap

### PostgreSQL databases

PostgreSQL `docker-entrypoint-initdb.d` scripts only run when the data directory is empty (first-ever start). On subsequent starts — even if a database doesn't exist — init scripts are skipped.

**Fix**: Explicitly create databases in provisioner:
```bash
# Wait for postgres healthy
sleep 10
# Create database if missing (idempotent)
docker exec my-postgres psql -U postgres -tc \
  "SELECT 1 FROM pg_database WHERE datname='mydb'" | grep -q 1 \
  || docker exec my-postgres psql -U postgres -c "CREATE DATABASE mydb;"
```

### Schema migrations

Migrations must be idempotent. Track applied versions:
```bash
PSQL='docker compose exec -T postgres psql -v ON_ERROR_STOP=1 -U myuser -d mydb'

# Create tracking table
$PSQL -tAc "CREATE TABLE IF NOT EXISTS schema_migrations (
  version TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ DEFAULT now()
)"

# Apply each migration file in order
for f in migrations/*.sql; do
  VER=$(basename $f)
  APPLIED=$($PSQL -tAc "SELECT 1 FROM schema_migrations WHERE version='$VER'" | tr -d ' ')
  if [ "$APPLIED" = "1" ]; then
    echo "Skip: $VER"
  else
    echo "Apply: $VER"
    { echo 'BEGIN;'; cat $f; echo 'COMMIT;'; } | $PSQL
    $PSQL -tAc "INSERT INTO schema_migrations(version) VALUES ('$VER') ON CONFLICT DO NOTHING"
  fi
done
```

## Docker build on remote

### Proxy mode

Docker Compose reads build args from `.env` via `${VAR:-default}`. Command-line env vars do NOT override `.env` values for compose interpolation.

```bash
# WRONG: compose still reads DOCKER_WITH_PROXY_MODE from .env
DOCKER_WITH_PROXY_MODE=disabled docker compose build myapp

# RIGHT: modify .env so compose reads the correct value
grep -q DOCKER_WITH_PROXY_MODE .env || echo 'DOCKER_WITH_PROXY_MODE=disabled' >> .env
docker compose build myapp
```

### Memory management

Building Docker images while 10+ containers run can OOM on small instances (8GB). Strategy:

```bash
# Stop non-critical containers to free RAM
cd /data/other-project && docker compose stop search-engine analytics-db || true

# Build (memory-intensive)
cd /data/myproject && docker compose build myapp

# Restart stopped containers
cd /data/other-project && docker compose up -d search-engine analytics-db || true
```

## Volume permissions

Containers running as non-root need writable volume directories:

```bash
# Before docker compose up:
mkdir -p data-dir logs-dir
chown -R 1001:1001 data-dir logs-dir  # match container UID
```

Find the UID from the Dockerfile:
```dockerfile
RUN adduser -S myuser -u 1001 -G mygroup
USER myuser  # runs as uid 1001
```

## Environment-specific .env files

Production `.env` contains production URLs. Staging needs its own `.env` with:

| Variable | Production | Staging |
|---|---|---|
| `FRONTEND_URL` | `https://myapp.com` | `https://staging.myapp.com` |
| `CORS_ORIGIN` | `https://myapp.com` | `https://staging.myapp.com` |
| `NEW_API_URL` | `http://api-container:3000` | Same (internal Docker network) |
| `DOCKER_WITH_PROXY_MODE` | `required` (if behind proxy) | `disabled` (direct internet) |

**Pattern**: Create `.env.staging` alongside `.env`. In Terraform:
```hcl
locals {
  env_src = "${local.repo}/.env.staging"  # staging-specific
}

provisioner "file" {
  source      = local.env_src
  destination = "${local.deploy_dir}/.env"
}
```

Rsync must exclude `.env` files (otherwise production .env overwrites staging .env):
```
--exclude=.env --exclude='.env.*'
```

## Verification template

After all services start, verify in the provisioner (not ad-hoc SSH):

```bash
sleep 20
echo '=== Service logs ==='
docker logs my-critical-service --tail 20 2>&1 || true
echo '=== All containers ==='
docker ps --format 'table {{.Names}}\t{{.Status}}' 2>&1 || true
# Final gate (only line that can fail)
docker ps --filter name=my-critical-service --format '{{.Status}}' | grep -q healthy \
  || { echo 'FATAL: service unhealthy'; exit 1; }
```
