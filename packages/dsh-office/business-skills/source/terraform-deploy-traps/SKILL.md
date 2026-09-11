---
name: terraform-deploy-traps
description: "Terraform 部署实战踩坑指南，提供对常见运维陷阱（如 provisioner 时序竞争、SSH 连接冲突、DNS 记录重复、卷权限问题、数据库初始化遗漏、Caddyfile 硬编码域名等）的根因分析及可直接复制的修复方案。当用户编写 null_resource provisioner、搭建多环境配置、排查 terraform apply 后容器持续重启或不健康、使用 cloud-init 初始化实例，或遇到 terraform plan/apply 报错、provisioner 执行失败、基础设施漂移、TLS 证书错误以及 Caddy/网关配置问题时，此技能将被激活。"
---

# Terraform 运维陷阱

这些故障模式全部来自真实部署事故。每一条都曾导致过线上问题。组织方式：**具体报错 → 根因分析 → 可直接复制的修复方案**。

## Provisioner 陷阱（报错 → 修复）

### remote-exec 中报 `docker: not found`

cloud-init 还在安装 Docker，provisioner 就已经 SSH 进去执行命令了。

```hcl
provisioner "remote-exec" {
  inline = [
    "cloud-init status --wait || true",
    "which docker || { echo 'FATAL: Docker not ready'; exit 1; }",
  ]
}
```

### local-exec 中 `rsync: connection unexpectedly closed`

Terraform 会保持自己的 SSH 连接不释放；local-exec 的 rsync 再开第二个连接就会被拒绝。永远不要用 local-exec 往远程传文件。改用 tarball + file provisioner：

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

macOS 的 BSD tar：`--exclude` 必须写在源路径参数之前。

### `cloud-init status` 一直显示 "running"

`apt-get -y` 并不会抑制 debconf 的交互对话框。像 `iptables-persistent` 这类包会在 TTY 提示上阻塞。

```yaml
- |
    echo iptables-persistent iptables-persistent/autosave_v4 boolean true | debconf-set-selections
    echo iptables-persistent iptables-persistent/autosave_v6 boolean true | debconf-set-selections
    DEBIAN_FRONTEND=noninteractive apt-get install -y iptables-persistent
```

已知会阻塞的包：`iptables-persistent`、`postfix`、`mysql-server`、`wireshark-common`。

### 容器日志报 `EACCES: permission denied`，容器持续重启

宿主机挂载目录归 root 所有，但容器以非 root 用户（uid 1001）运行。在 `docker compose up` 之前修复：

```bash
mkdir -p /data/myapp/data /data/myapp/logs
chown -R 1001:1001 /data/myapp/data /data/myapp/logs
```

查找 UID：在 Dockerfile 中搜索 `adduser.*-u` 或 `USER` 指令。

### Provisioner 失败但看不到任何诊断输出

`set -e` 在第一个错误时就退出，导致后面的 `docker logs` 输出被隐藏。改用 `set -u`（不加 `-e`），在最后放一个统一的验证关卡：

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

### 容器 `Restarting` — 数据库表不存在

DB 迁移没有写在 provisioner 里。PostgreSQL 的 `docker-entrypoint-initdb.d` 只在数据目录为空时执行。需要显式创建数据库并运行迁移：

```bash
# 等 postgres 健康后执行：
docker exec pg psql -U postgres -tc "SELECT 1 FROM pg_database WHERE datname='mydb'" | grep -q 1 \
  || docker exec pg psql -U postgres -c "CREATE DATABASE mydb;"

# 幂等迁移：
for f in migrations/*.sql; do
  VER=$(basename $f)
  APPLIED=$($PSQL -tAc "SELECT 1 FROM schema_migrations WHERE version='$VER'" | tr -d ' ')
  [ "$APPLIED" = "1" ] && continue
  { echo 'BEGIN;'; cat $f; echo 'COMMIT;'; } | $PSQL
  $PSQL -tAc "INSERT INTO schema_migrations(version) VALUES ('$VER') ON CONFLICT DO NOTHING"
done
```

### `docker compose build` 忽略环境变量覆盖

Compose 从 `.env` 文件读取 build args，而不是从 shell 环境变量。`VAR=x docker compose build` 不生效。

```bash
# 错误写法
DOCKER_WITH_PROXY_MODE=disabled docker compose build

# 正确写法
grep -q DOCKER_WITH_PROXY_MODE .env || echo 'DOCKER_WITH_PROXY_MODE=disabled' >> .env
docker compose build
```

### TLS 握手失败：`Invalid format for Authorization header`

Caddy DNS-01 ACME 需要 Cloudflare 的 **API Token**（`cfut_` 前缀，40+ 字符，Bearer 认证）。使用 **Global API Key**（37 个十六进制字符，X-Auth-Key 认证）会导致 `HTTP 400 Code:6003`。生产环境可能因为有缓存证书而看起来正常；全新环境在首次申请证书时就会失败。

```bash
# 部署前验证 token 格式：
TOKEN=$(grep CLOUDFLARE_API_TOKEN .env | cut -d= -f2)
echo "$TOKEN" | grep -q "^cfut_" || echo "FATAL: needs API Token, not Global Key"
```

通过 API 创建范围受限的 token：
```bash
curl -s "https://api.cloudflare.com/client/v4/user/tokens" -X POST \
  -H "X-Auth-Email: $CF_EMAIL" -H "X-Auth-Key: $CF_GLOBAL_KEY" \
  -d '{"name":"caddy-dns-acme","policies":[{"effect":"allow",
    "resources":{"com.cloudflare.api.account.zone.<ZONE_ID>":"*"},
    "permission_groups":[
      {"id":"4755a26eedb94da69e1066d98aa820be","name":"DNS Write"},
      {"id":"c8fed203ed3043cba015a93ad1616f1f","name":"Zone Read"}]}]}'
```

### TLS 在预发环境失败但生产正常 — 域名硬编码

Caddyfile 或 compose 中写了固定域名。预发环境的 Caddy 加载了生产配置，尝试为不属于自己的域名申请证书 → ACME 失败。

**Caddyfile**：使用 `{$VAR}` — Caddy 在启动时解析环境变量。
```caddy
# 错误写法
gpt-6.pro { tls { dns cloudflare {env.CLOUDFLARE_API_TOKEN} } }

# 正确写法
{$LOBEHUB_DOMAIN} { tls { dns cloudflare {env.CLOUDFLARE_API_TOKEN} } }
```

**Compose**：使用 `${VAR:?required}` — 变量未设置时立即报错。
```yaml
# 错误写法
- APP_URL=https://gpt-6.pro

# 正确写法
- APP_URL=${APP_URL:?APP_URL is required}
```

将环境变量传入网关容器，让 Caddy 能读取到：
```yaml
environment:
  - LOBEHUB_DOMAIN=${LOBEHUB_DOMAIN:?LOBEHUB_DOMAIN is required}
  - CLOUDFLARE_API_TOKEN=${CLOUDFLARE_API_TOKEN:?required for DNS-01 TLS}
```

### OAuth 登录失败：`Social sign in failed`

Casdoor 的 `init_data.json` 中包含硬编码的回调地址。`--createDatabase=true` 仅在首次创建数据库时应用 init_data，重启后不再执行。通过 provisioner 中的 SQL 修复：

```bash
# 将生产域名替换为预发域名
$PSQL -c "UPDATE application SET redirect_uris = REPLACE(redirect_uris,
  'gpt-6.pro', 'staging.gpt-6.pro')
  WHERE name='lobechat'
  AND redirect_uris LIKE '%gpt-6.pro%'
  AND redirect_uris NOT LIKE '%staging.gpt-6.pro%';"
```

还要检查 `AUTH_CASDOOR_ISSUER` — 它必须匹配 Casdoor 子域名（`auth.staging.example.com`），而不是应用的根域名。

## 多环境隔离

在创建第二个环境之前，先 grep `.tf` 文件中的硬编码名称。完整检查矩阵见 [references/multi-env-isolation.md](references/multi-env-isolation.md)。

**apply 时会直接报错**（全局唯一资源）：

| 资源 | 唯一性范围 | 修复方式 |
|---|---|---|
| SSH 密钥对 | 地域级别 | `"${env}-deploy"` |
| SLS 日志项目 | 账号级别 | `"${env}-logs"` |
| 云监控联系人 | 账号级别 | `"${env}-ops"` |

**DNS 重复陷阱**：两个环境在同一个 Cloudflare zone 中为相同域名创建 A 记录 → 产生两个独立的记录 ID → DNS 轮询 → 约 50% 流量打到错误实例。修复：使用子域名隔离（`staging.example.com`）或单独的 zone。记得为 Caddy 服务的所有子域名创建 DNS 记录（如 `auth.staging`、`minio.staging`）。

**快照交叉污染**：未加过滤条件的 `data "alicloud_ecs_snapshots"` 会返回账号下所有快照。新环境继承旧的 100GB 快照，创建 40GB 磁盘时失败。用变量控制：

```hcl
locals {
  latest_snapshot_id = var.enable_snapshot_recovery && length(local.available_snapshots) > 0
    ? local.available_snapshots[0].snapshot_id : null
}
```

不要给 data source 加 `count` — 会改变其 state 地址，导致漂移。

## 部署前验证

在 `terraform apply` 之前运行验证脚本，在本地就捕获配置错误，避免"部署→发现→修复→重新部署"的循环。

关键检查项（详见 [references/pre-deploy-validation.md](references/pre-deploy-validation.md)）：
1. `terraform validate` — 语法检查
2. Caddyfile 和 compose 文件中无硬编码域名
3. 必需的环境变量已设置（`LOBEHUB_DOMAIN`、`CLAUDE4DEV_DOMAIN`、`CLOUDFLARE_API_TOKEN`、`APP_URL` 等）
4. Cloudflare API Token 格式正确（不是 Global API Key）
5. 所有 Caddy 服务的域名都有 DNS 记录
6. Casdoor issuer URL 匹配 `auth.*` 子域名
7. SSH 私钥文件存在

集成到 Makefile：在 `make apply` 之前运行 `make pre-deploy ENV=staging`。

## 从零部署

全新磁盘会暴露所有隐式依赖。详见 [references/zero-to-deploy-checklist.md](references/zero-to-deploy-checklist.md)。

全新实例上会导致 provisioner 失败的关键项：
1. **目录**：在 cloud-init 中 `mkdir -p /data/{svc1,svc2}` — `file` provisioner 在目标目录不存在时会失败
2. **数据库**：显式执行 `CREATE DATABASE` — PG 初始化脚本仅在数据目录为空时运行
3. **迁移**：通过 `schema_migrations` 表追踪，幂等执行
4. **Provisioner 执行顺序**：共享 Docker 网络的资源之间需要 `depends_on`
5. **内存**：小实例（≤8GB）在 Docker 构建时先停掉非关键容器
6. **域名参数化**：Caddyfile/compose 中的每个域名必须用 `{$VAR}` / `${VAR:?required}`
7. **凭据格式**：Caddy 需要 API Token（`cfut_`），不是 Global API Key
