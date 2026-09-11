# Pre-Deploy Validation Pattern

Run before `terraform apply` to catch configuration errors locally. Eliminates the deploy→discover→fix→redeploy cycle that wastes hours.

## Why this matters

Every hardcoded value becomes a bug when creating a second environment. Production accumulates implicit state over time (cached TLS certs, manually created databases, hand-edited configs). Fresh instances expose all of these as failures. A pre-deploy script catches them before they reach the remote.

## Validation categories

### 1. Terraform syntax
```bash
terraform validate
```

### 2. Hardcoded domains
```bash
# Caddyfiles: should use {$VAR} not literal domains
grep -v "^#" gateway/conf.d/*.caddy | grep -c "example\.com" # should be 0

# Compose: should use ${VAR:?required} not literal domains
grep -v "^#" docker-compose.production.yml | grep -c "example\.com" # should be 0
```

### 3. Required env vars
Check that every `${VAR:?required}` in compose has a matching entry in `.env`:
```bash
for VAR in LOBEHUB_DOMAIN CLAUDE4DEV_DOMAIN CLOUDFLARE_API_TOKEN APP_URL AUTH_URL; do
  grep -q "^$VAR=" .env || echo "FAIL: $VAR missing"
done
```

### 4. Cloudflare credential format
Caddy's Cloudflare plugin uses Bearer auth. Global API Keys (37 hex chars) fail with `Invalid format for Authorization header`.
```bash
TOKEN=$(grep CLOUDFLARE_API_TOKEN .env | cut -d= -f2)
echo "$TOKEN" | grep -qE "^cfut_|^[A-Za-z0-9_-]{40,}$" || echo "FAIL: looks like Global API Key, not API Token"
```

### 5. DNS ↔ Caddy consistency
Every domain Caddy serves needs a DNS record. Check live resolution:
```bash
for DOMAIN in staging.example.com auth.staging.example.com; do
  curl -sf "https://dns.google/resolve?name=$DOMAIN&type=A" | python3 -c \
    "import sys,json; d=json.load(sys.stdin); exit(0 if d.get('Answer') else 1)" \
    || echo "FAIL: $DOMAIN not resolving"
done
```

### 6. Casdoor issuer consistency
`AUTH_CASDOOR_ISSUER` must point to `auth.<domain>`, not the app's root domain:
```bash
ISSUER=$(grep AUTH_CASDOOR_ISSUER .env | cut -d= -f2)
DOMAIN=$(grep LOBEHUB_DOMAIN .env | cut -d= -f2)
[ "$ISSUER" = "https://auth.$DOMAIN" ] || echo "FAIL: issuer should be https://auth.$DOMAIN"
```

### 7. SSH key exists
```bash
[ -f ~/.ssh/id_ed25519 ] || echo "FAIL: SSH key not found"
```

## Makefile integration

```makefile
pre-deploy:
	@./scripts/validate-env.sh $(ENV)

# Enforce: plan requires pre-deploy to pass
plan: pre-deploy
	cd $(ENV_DIR) && terraform plan -out=tfplan
```

## Anti-pattern: deploy-and-pray

The opposite of pre-deploy validation is the "deploy and see what breaks" cycle:
1. `terraform apply` → fails
2. SSH in to debug → discover error
3. Fix locally → commit → re-apply → fails differently
4. Repeat 5-10 times

Each cycle takes 3-5 minutes (plan + apply + provisioner). Pre-deploy catches 80% of issues in <5 seconds locally.
