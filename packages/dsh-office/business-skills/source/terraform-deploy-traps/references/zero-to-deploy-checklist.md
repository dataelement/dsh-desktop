# 从零部署检查清单

一个全新实例加上空数据盘，会暴露生产环境默默依赖的所有隐式条件。本清单涵盖了服务启动前必须显式创建的所有内容。

## 起飞前准备：cloud-init 需要处理的事项

这些在操作系统启动时执行，先于 Terraform provisioner：

- [ ] **挂载数据盘**：新盘先格式化（`blkid` 检查），挂载到 `/data`，写入 fstab
- [ ] **创建服务目录**：`mkdir -p /data/{service1,service2,...}` — file provisioner 在目标目录不存在时会失败
- [ ] **安装 Docker + Compose**：curl 安装脚本，启用 systemd 服务
- [ ] **配置 swap**：在数据盘上 `fallocate`（不要用系统盘）
- [ ] **SSH 加固**：仅允许密钥认证，禁止 root 密码登录
- [ ] **防火墙**：UFW + DOCKER-USER iptables 链
- [ ] **Debconf 预设**：针对有交互提示的包（iptables-persistent 等）
- [ ] **标记就绪**：将时间戳写入 `/data/cloud-init.log`

## Provisioner 执行顺序

Terraform provisioner 在单个资源内按声明顺序执行，但资源之间是并行执行的，除非设置了 `depends_on`。

```
lobehub_deploy ──────────────────→ channel_sync (depends_on lobehub)
                                 → casdoor_sync (depends_on lobehub)
                                 → minio_sync (depends_on lobehub)

claude4dev_deploy (depends_on lobehub_deploy)
  ├─ 等待 cloud-init 完成
  ├─ 上传源码（tarball 通过 file provisioner）
  ├─ 上传 .env（预发变体）
  ├─ 启动有状态服务（postgres, redis）--no-recreate
  ├─ 运行数据库迁移
  ├─ 构建无状态服务镜像
  ├─ 修复卷权限
  ├─ 启动无状态服务（relay, api, frontend, gateway）
  └─ 验证健康状态
```

## 数据库初始化

### PostgreSQL 数据库

PostgreSQL 的 `docker-entrypoint-initdb.d` 脚本仅在数据目录为空时执行（首次启动）。后续启动时——即使某个数据库不存在——初始化脚本也会被跳过。

**修复方案**：在 provisioner 中显式创建数据库：
```bash
# 等待 postgres 健康
sleep 10
# 数据库不存在则创建（幂等）
docker exec my-postgres psql -U postgres -tc \
  "SELECT 1 FROM pg_database WHERE datname='mydb'" | grep -q 1 \
  || docker exec my-postgres psql -U postgres -c "CREATE DATABASE mydb;"
```

### Schema 迁移

迁移必须是幂等的。跟踪已应用的版本：
```bash
PSQL='docker compose exec -T postgres psql -v ON_ERROR_STOP=1 -U myuser -d mydb'

# 创建跟踪表
$PSQL -tAc "CREATE TABLE IF NOT EXISTS schema_migrations (
  version TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ DEFAULT now()
)"

# 按顺序应用每个迁移文件
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

## 远程 Docker 构建

### 代理模式

Docker Compose 通过 `${VAR:-default}` 从 `.env` 读取 build args。命令行环境变量不会覆盖 `.env` 中用于 compose 插值的值。

```bash
# 错误写法：compose 仍然从 .env 读取 DOCKER_WITH_PROXY_MODE
DOCKER_WITH_PROXY_MODE=disabled docker compose build myapp

# 正确写法：修改 .env 让 compose 读到正确的值
grep -q DOCKER_WITH_PROXY_MODE .env || echo 'DOCKER_WITH_PROXY_MODE=disabled' >> .env
docker compose build myapp
```

### 内存管理

在 10+ 个容器运行的同时构建 Docker 镜像，在小实例（8GB）上可能 OOM。应对策略：

```bash
# 停掉非关键容器释放内存
cd /data/other-project && docker compose stop search-engine analytics-db || true

# 构建（内存密集型操作）
cd /data/myproject && docker compose build myapp

# 重启之前停掉的容器
cd /data/other-project && docker compose up -d search-engine analytics-db || true
```

## 卷权限

以非 root 用户运行的容器需要可写的挂载目录：

```bash
# 在 docker compose up 之前执行：
mkdir -p data-dir logs-dir
chown -R 1001:1001 data-dir logs-dir  # 匹配容器内的 UID
```

从 Dockerfile 中查找 UID：
```dockerfile
RUN adduser -S myuser -u 1001 -G mygroup
USER myuser  # 以 uid 1001 运行
```

## 环境专属 .env 文件

生产环境的 `.env` 包含生产 URL。预发环境需要自己的 `.env`，内容如下：

| 变量 | 生产环境 | 预发环境 |
|---|---|---|
| `FRONTEND_URL` | `https://myapp.com` | `https://staging.myapp.com` |
| `CORS_ORIGIN` | `https://myapp.com` | `https://staging.myapp.com` |
| `NEW_API_URL` | `http://api-container:3000` | 相同（Docker 内部网络） |
| `DOCKER_WITH_PROXY_MODE` | `required`（如果在代理后面） | `disabled`（直连互联网） |

**推荐模式**：在 `.env` 旁边创建 `.env.staging`。在 Terraform 中：
```hcl
locals {
  env_src = "${local.repo}/.env.staging"  # 预发环境专用
}

provisioner "file" {
  source      = local.env_src
  destination = "${local.deploy_dir}/.env"
}
```

Rsync 必须排除 `.env` 文件（否则生产环境的 .env 会覆盖预发环境的 .env）：
```
--exclude=.env --exclude='.env.*'
```

## 验证模板

所有服务启动后，在 provisioner 中验证（不要靠临时 SSH）：

```bash
sleep 20
echo '=== Service logs ==='
docker logs my-critical-service --tail 20 2>&1 || true
echo '=== All containers ==='
docker ps --format 'table {{.Names}}\t{{.Status}}' 2>&1 || true
# 最终关卡（唯一允许失败的行）
docker ps --filter name=my-critical-service --format '{{.Status}}' | grep -q healthy \
  || { echo 'FATAL: service unhealthy'; exit 1; }
```
