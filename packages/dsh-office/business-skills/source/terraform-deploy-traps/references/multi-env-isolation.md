# 多环境隔离检查清单

在同一个云账号中为生产环境创建第二个 Terraform 环境（`staging`、`lab` 等）时，以下每一项都必须逐一验证。漏掉任何一项都可能导致静默的名称冲突或交叉污染。

## Terraform 状态隔离

两个环境必须使用不同的 state 路径。可以共用同一个 OSS/S3 bucket — 不同的 prefix 就能完全隔离：

```hcl
# 生产环境
backend "oss" {
  bucket = "myproject-terraform-state"
  prefix = "environments/production"
}

# 预发环境
backend "oss" {
  bucket = "myproject-terraform-state"  # 同一个 bucket 没问题
  prefix = "environments/staging"       # 不同 prefix = 隔离的 state
}
```

**验证方法**：在一个环境中执行 `terraform state list`，结果中不应出现另一个环境的任何资源。

## 资源命名冲突矩阵

对每个 `.tf` 文件 grep 硬编码名称。所有全局唯一的资源都会冲突。

### 必须重命名（apply 会直接报错）

| 资源 | 唯一性范围 | 修复模式 |
|---|---|---|
| SSH 密钥对（`key_pair_name`） | 地域级别 | `"${env}-deploy"` |
| SLS 日志项目（`project_name`） | 账号级别 | `"${env}-logs"` |
| 云监控联系人（`alarm_contact_name`） | 账号级别 | `"${env}-ops"` |
| 云监控联系人组 | 账号级别 | `"${env}-ops"` |

### 建议重命名（不会报错但容易混淆）

| 资源 | 同名时的问题 |
|---|---|
| 安全组名称 | 同一 VPC 中两个同名安全组，控制台无法区分 |
| ECS 实例名称/主机名 | 控制台中出现两个叫 `myapp-spot` 的实例 |
| 数据盘名称 | 磁盘列表中同名 |
| 自动快照策略名称 | 策略列表中同名 |
| SLS 机器组名称 | 两个实例的日志混入同一个机器组 |

### 推荐模式：使用模块名称变量

```hcl
# 生产环境 main.tf
module "app" {
  source = "../../modules/spot-with-data-disk"
  name   = "production-spot"  # 传递到 instance_name、disk_name、snapshot_policy_name
}

# 预发环境 main.tf
module "app" {
  source = "../../modules/spot-with-data-disk"
  name   = "staging-spot"     # 所有子资源名称自动隔离
}
```

## DNS 记录隔离

### 重复陷阱

两个 Terraform 环境在同一个 Cloudflare zone 中为 `@`（根域名）创建 A 记录：
- 各自获得独立的 Cloudflare 记录 ID
- Cloudflare 现在有同一域名的两条 A 记录
- DNS 在两个 IP 之间轮询
- 约 50% 的流量打到错误实例

### 正确方案

**方案 A：子域名隔离**（推荐用于 staging/lab）：
```hcl
# 生产环境：根域名记录
resource "cloudflare_dns_record" "prod" {
  name = "@"  # gpt-6.pro
}

# 预发环境：仅子域名记录
resource "cloudflare_dns_record" "staging" {
  name = "staging"  # staging.gpt-6.pro
}
```

**方案 B：独立 zone**（完全独立的部署）：
每个环境使用自己的域名/zone。不共享 Cloudflare zone ID。

**方案 C：仅生产环境管理 DNS**：
只有生产环境拥有 DNS 资源。其他环境仅通过 IP 访问。

### 销毁安全性

当一个环境被销毁时：
- 其 DNS 记录会被删除（通过各自的 Cloudflare 记录 ID）
- 其他环境的 DNS 记录不受影响
- **销毁前验证**：对比各环境之间的 DNS 记录 ID：
  ```bash
  terraform state show 'cloudflare_dns_record.app["root"]' | grep "^id"
  ```
  ID 必须不同。

## 共享资源（可以安全共用）

这些资源被第二个环境引用，但不由其管理：

| 资源 | 为什么安全 |
|---|---|
| VPC / VSwitch | 通过 ID 引用，不是新建 |
| Cloudflare zone ID | 引用关系，记录各自独立 |
| OSS state bucket | 不同 prefix = 不同 state |
| SSH 公钥内容 | 同一把密钥，不同的密钥对资源 |
| 云服务商凭据 | 同一账号，不同资源 |

## 多环境 Makefile 模式

```makefile
ENV ?= production
ENV_DIR := environments/$(ENV)

init: ; cd $(ENV_DIR) && terraform init
plan: ; cd $(ENV_DIR) && terraform plan -out=tfplan
apply: ; cd $(ENV_DIR) && terraform apply tfplan
drift: ; cd $(ENV_DIR) && terraform plan -detailed-exitcode
```

使用方式：`make plan ENV=staging`
