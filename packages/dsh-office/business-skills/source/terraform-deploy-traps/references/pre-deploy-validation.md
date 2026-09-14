# 部署前验证模式

在 `terraform apply` 之前运行，在本地捕获配置错误。消除"部署→发现问题→修复→重新部署"这个浪费大量时间的循环。

## 为什么这很重要

每个硬编码的值在创建第二个环境时都会变成 bug。生产环境随时间积累了大量隐式状态（缓存的 TLS 证书、手动创建的数据库、手工修改的配置）。全新实例会把这些全部暴露为失败。部署前验证脚本能在问题到达远端之前就拦截住。

## 验证类别

### 1. Terraform 语法
```bash
terraform validate
```

### 2. 硬编码域名
```bash
# Caddyfile：应该用 {$VAR} 而不是固定域名
grep -v "^#" gateway/conf.d/*.caddy | grep -c "example\.com" # 应为 0

# Compose：应该用 ${VAR:?required} 而不是固定域名
grep -v "^#" docker-compose.production.yml | grep -c "example\.com" # 应为 0
```

### 3. 必需的环境变量
检查 compose 中每个 `${VAR:?required}` 在 `.env` 中都有对应条目：
```bash
for VAR in LOBEHUB_DOMAIN CLAUDE4DEV_DOMAIN CLOUDFLARE_API_TOKEN APP_URL AUTH_URL; do
  grep -q "^$VAR=" .env || echo "FAIL: $VAR missing"
done
```

### 4. Cloudflare 凭据格式
Caddy 的 Cloudflare 插件使用 Bearer 认证。Global API Key（37 个十六进制字符）会报 `Invalid format for Authorization header` 错误。
```bash
TOKEN=$(grep CLOUDFLARE_API_TOKEN .env | cut -d= -f2)
echo "$TOKEN" | grep -qE "^cfut_|^[A-Za-z0-9_-]{40,}$" || echo "FAIL: looks like Global API Key, not API Token"
```

### 5. DNS 与 Caddy 一致性
Caddy 服务的每个域名都需要有对应的 DNS 记录。检查实际解析情况：
```bash
for DOMAIN in staging.example.com auth.staging.example.com; do
  curl -sf "https://dns.google/resolve?name=$DOMAIN&type=A" | python3 -c \
    "import sys,json; d=json.load(sys.stdin); exit(0 if d.get('Answer') else 1)" \
    || echo "FAIL: $DOMAIN not resolving"
done
```

### 6. Casdoor issuer 一致性
`AUTH_CASDOOR_ISSUER` 必须指向 `auth.<domain>`，而不是应用的根域名：
```bash
ISSUER=$(grep AUTH_CASDOOR_ISSUER .env | cut -d= -f2)
DOMAIN=$(grep LOBEHUB_DOMAIN .env | cut -d= -f2)
[ "$ISSUER" = "https://auth.$DOMAIN" ] || echo "FAIL: issuer should be https://auth.$DOMAIN"
```

### 7. SSH 密钥存在
```bash
[ -f ~/.ssh/id_ed25519 ] || echo "FAIL: SSH key not found"
```

## Makefile 集成

```makefile
pre-deploy:
	@./scripts/validate-env.sh $(ENV)

# 强制约束：plan 之前必须通过 pre-deploy
plan: pre-deploy
	cd $(ENV_DIR) && terraform plan -out=tfplan
```

## 反模式：部署靠运气

部署前验证的反面就是"部署了再看哪里崩"的循环：
1. `terraform apply` → 失败
2. SSH 进去排查 → 发现错误
3. 本地修复 → 提交 → 重新 apply → 换个地方失败
4. 重复 5-10 次

每个循环耗时 3-5 分钟（plan + apply + provisioner）。部署前验证能在本地 5 秒内捕获 80% 的问题。
