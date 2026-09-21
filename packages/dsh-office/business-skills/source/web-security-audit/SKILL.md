---
name: web-security-audit
description: "基于 OWASP Top 10 (2021) 标准提供代码安全审查，逐项检查 SQL 注入、XSS、SSRF、访问控制、加密失败等常见漏洞，并给出具体的漏洞代码示例与修复方案。当用户需要代码安全审查、安全加固、渗透测试辅助，或提及 OWASP、安全检查、SQL 注入、XSS、代码审计、安全清单等关键词时触发此技能。"
license: MIT
---

# OWASP Top 10 代码安全检查清单

基于 OWASP Top 10 (2021) 标准，对代码进行逐项安全审查。每一项包含：漏洞说明、典型漏洞代码、检查要点、修复示例。适用于 Web 应用的安全 Code Review 场景。

## 使用方式

将待审查的代码文件或代码片段提供给 Claude，指定需要检查的 OWASP 项目（或全部检查），即可获得逐项审查报告。

**示例提问：**
- "帮我检查这段代码有没有 SQL 注入风险"
- "对这个项目做一次 OWASP Top 10 安全审查"
- "这个 API 接口有没有 SSRF 漏洞？"

---

## 快速参考

| 编号 | 类别 | 一句话检查重点 |
|------|------|---------------|
| A01 | 失效的访问控制 | 每个端点是否校验当前用户身份？能否通过改 ID 越权？ |
| A02 | 加密失败 | 密码是否用 bcrypt/argon2？密钥是否硬编码？ |
| A03 | 注入 | SQL 拼接？`shell=True`？模板未转义？ |
| A04 | 不安全的设计 | 有无频率限制？关键操作能否被跳步？ |
| A05 | 安全配置错误 | DEBUG 开着？错误页泄露堆栈？默认密码？ |
| A06 | 过时的组件 | `pip audit` / `npm audit` 有 CVE 吗？ |
| A07 | 认证失败 | JWT 验签名了吗？Token 能失效吗？有 MFA 吗？ |
| A08 | 完整性失败 | 有 `pickle.loads` 反序列化不可信数据吗？ |
| A09 | 日志监控失败 | 日志里有明文密码吗？登录失败有记录吗？ |
| A10 | SSRF | 用户可控 URL 的请求过滤了内网 IP 吗？ |

---

## 审查流程 SOP

**关键原则：宁可多报 false positive，不可漏报 true positive。**

1. **确认审查范围** — 明确要检查的文件、模块或代码片段
2. **逐项全覆盖检查** — 按 A01–A10 逐项扫描，**每一项都必须在报告中体现**（即使未发现问题也标注 ✅）。Claude 的默认行为是只报告发现的问题——这里要求完整覆盖，确保无遗漏
3. **风险分级** — 按以下标准标注：
   - 🔴 高危：可被直接利用（RCE、SQL 注入、SSRF 可达内网、明文密码存储）
   - 🟡 中危：需特定条件才可利用（缺失频率限制、弱密码策略、静态 Token）
   - 🟢 低危：防御纵深不足但无直接利用路径（缺安全头、日志不够详细）
4. **每个发现必须附带可直接使用的修复代码**（不是描述，是代码）。引用具体 `文件:行号`
5. **输出审查报告** — 按下方模板输出，发现按风险等级降序排列，末尾给出修复优先级排序

---

## A01:2021 — 失效的访问控制 (Broken Access Control)

**风险说明：** 用户能够越权访问其他用户的数据或执行未授权的操作。

**检查要点：**
- [ ] 每个 API 端点是否有权限校验
- [ ] 是否存在 IDOR（不安全的直接对象引用）：用户能否通过修改 ID 参数访问他人数据
- [ ] 管理接口是否有角色验证
- [ ] 是否依赖前端隐藏来控制访问（而非服务端校验）
- [ ] CORS 策略是否过于宽松

### 漏洞代码示例

```python
# ❌ 漏洞：无权限校验，任何用户可通过修改 user_id 查看他人订单
@app.route("/api/orders/<user_id>")
def get_orders(user_id):
    orders = db.query(f"SELECT * FROM orders WHERE user_id = {user_id}")
    return jsonify(orders)
```

### 修复示例

```python
# ✅ 修复：验证当前登录用户只能访问自己的数据
@app.route("/api/orders")
@login_required
def get_orders():
    current_user_id = get_current_user().id
    orders = db.query("SELECT * FROM orders WHERE user_id = %s", (current_user_id,))
    return jsonify(orders)
```

---

## A02:2021 — 加密失败 (Cryptographic Failures)

**风险说明：** 敏感数据（密码、信用卡号、个人信息）未加密或使用弱加密算法。

**检查要点：**
- [ ] 密码是否使用 bcrypt/scrypt/argon2 等安全哈希存储（而非 MD5/SHA1）
- [ ] 敏感数据传输是否强制 HTTPS
- [ ] 加密密钥是否硬编码在代码中
- [ ] 是否使用了已废弃的加密算法（DES、RC4、MD5）
- [ ] 数据库中敏感字段是否加密存储

### 漏洞代码示例

```python
# ❌ 漏洞：使用 MD5 存储密码，且密钥硬编码
import hashlib

SECRET_KEY = "my-secret-key-123"

def save_password(password):
    hashed = hashlib.md5(password.encode()).hexdigest()
    db.save(hashed)
```

### 修复示例

```python
# ✅ 修复：使用 bcrypt 进行密码哈希，密钥从环境变量读取
import bcrypt
import os

SECRET_KEY = os.environ["SECRET_KEY"]

def save_password(password):
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode(), salt)
    db.save(hashed)
```

---

## A03:2021 — 注入 (Injection)

**风险说明：** 用户输入未经过滤直接拼接到 SQL、命令、LDAP 等查询中，导致攻击者可执行任意查询或命令。

**检查要点：**
- [ ] SQL 查询是否使用参数化查询 / ORM（而非字符串拼接）
- [ ] 是否有 `os.system()`、`subprocess.call(shell=True)` 等直接拼接用户输入的命令执行
- [ ] 模板渲染是否正确转义用户输入（防 XSS）
- [ ] LDAP / XPath / NoSQL 查询是否过滤了特殊字符
- [ ] 日志中是否直接记录未过滤的用户输入（日志注入）

### SQL 注入 — 漏洞代码

```python
# ❌ 漏洞：字符串拼接 SQL，攻击者可输入 ' OR 1=1 --
@app.route("/api/user")
def get_user():
    username = request.args.get("username")
    query = f"SELECT * FROM users WHERE username = '{username}'"
    result = db.execute(query)
    return jsonify(result)
```

### SQL 注入 — 修复示例

```python
# ✅ 修复：使用参数化查询
@app.route("/api/user")
def get_user():
    username = request.args.get("username")
    result = db.execute(
        "SELECT * FROM users WHERE username = %s",
        (username,)
    )
    return jsonify(result)
```

### 命令注入 — 漏洞代码

```python
# ❌ 漏洞：用户输入直接拼接到 shell 命令
import os

def ping_host(host):
    os.system(f"ping -c 4 {host}")
```

### 命令注入 — 修复示例

```python
# ✅ 修复：使用 subprocess 列表参数，禁用 shell
import subprocess
import re

def ping_host(host):
    if not re.match(r'^[a-zA-Z0-9.\-]+$', host):
        raise ValueError("Invalid hostname")
    subprocess.run(["ping", "-c", "4", host], check=True)
```

---

## A04:2021 — 不安全的设计 (Insecure Design)

**风险说明：** 业务逻辑层面的设计缺陷，无法通过完美的实现来修复。

**检查要点：**
- [ ] 关键业务操作是否有频率限制（Rate Limiting）
- [ ] 密码重置流程是否可被滥用（枚举用户名、暴力破解验证码）
- [ ] 支付/转账等敏感操作是否有二次确认机制
- [ ] 是否存在批量操作无上限的接口
- [ ] 业务流程是否可被跳步执行（如跳过支付直接完成订单）

### 漏洞代码示例

```python
# ❌ 漏洞：验证码无尝试次数限制，可暴力破解
@app.route("/api/verify-code", methods=["POST"])
def verify_code():
    code = request.json["code"]
    stored_code = session.get("verification_code")
    if code == stored_code:
        return jsonify({"status": "verified"})
    return jsonify({"status": "invalid"}), 400
```

### 修复示例

```python
# ✅ 修复：添加尝试次数限制和过期时间
@app.route("/api/verify-code", methods=["POST"])
def verify_code():
    attempts = session.get("verify_attempts", 0)
    if attempts >= 5:
        return jsonify({"error": "尝试次数过多，请重新获取验证码"}), 429

    code = request.json["code"]
    stored = session.get("verification_code")
    expire_at = session.get("code_expire_at", 0)

    if time.time() > expire_at:
        return jsonify({"error": "验证码已过期"}), 400

    session["verify_attempts"] = attempts + 1

    if code == stored:
        session.pop("verify_attempts", None)
        return jsonify({"status": "verified"})
    return jsonify({"status": "invalid"}), 400
```

---

## A05:2021 — 安全配置错误 (Security Misconfiguration)

**风险说明：** 应用或服务器使用默认配置、开启了不必要的功能、错误消息暴露敏感信息。

**检查要点：**
- [ ] 是否关闭了 DEBUG 模式（生产环境）
- [ ] 错误页面是否泄露堆栈信息、数据库版本等
- [ ] 是否存在默认账号密码未修改
- [ ] HTTP 响应头是否包含安全头（X-Frame-Options、Content-Security-Policy 等）
- [ ] 不必要的 HTTP 方法（PUT、DELETE、TRACE）是否已禁用
- [ ] 目录列表是否已关闭

### 漏洞代码示例

```python
# ❌ 漏洞：生产环境开启 DEBUG，泄露敏感信息
app = Flask(__name__)
app.config["DEBUG"] = True
app.config["SECRET_KEY"] = "default-secret"

@app.errorhandler(500)
def error_handler(e):
    return jsonify({"error": str(e), "traceback": traceback.format_exc()}), 500
```

### 修复示例

```python
# ✅ 修复：从环境变量读取配置，生产环境关闭 DEBUG
import os

app = Flask(__name__)
app.config["DEBUG"] = os.environ.get("FLASK_DEBUG", "false").lower() == "true"
app.config["SECRET_KEY"] = os.environ["FLASK_SECRET_KEY"]

@app.errorhandler(500)
def error_handler(e):
    app.logger.error(f"Internal error: {e}")
    return jsonify({"error": "服务器内部错误，请稍后重试"}), 500
```

---

## A06:2021 — 易受攻击和过时的组件 (Vulnerable and Outdated Components)

**风险说明：** 使用了存在已知漏洞的第三方库或框架版本。

**检查要点：**
- [ ] 依赖包版本是否有已知 CVE 漏洞（通过 `pip audit`、`npm audit`、`snyk` 等扫描）
- [ ] 是否有长期未更新的依赖
- [ ] 是否使用了已停止维护的库
- [ ] 依赖锁文件（package-lock.json / requirements.txt）是否纳入版本控制
- [ ] 是否有自动化依赖更新机制（Dependabot 等）

### 检查命令

```bash
# Python 项目
pip audit

# Node.js 项目
npm audit

# 通用扫描
# 使用开源工具 trivy 或 grype 扫描容器/项目依赖
```

### 修复建议

```bash
# 更新有漏洞的包
pip install --upgrade package_name

# 自动修复 npm 漏洞
npm audit fix

# 锁定依赖版本，避免隐式升级引入风险
pip freeze > requirements.txt
```

---

## A07:2021 — 身份识别和认证失败 (Identification and Authentication Failures)

**风险说明：** 认证机制存在缺陷，允许暴力破解、凭据填充、会话劫持等攻击。

**检查要点：**
- [ ] 是否有登录失败次数限制（账户锁定 / 延迟）
- [ ] 密码策略是否合理（最小长度、复杂度要求）
- [ ] 会话 Token 是否在登出后失效
- [ ] 会话 ID 是否足够随机且不可预测
- [ ] 是否支持多因素认证（MFA）用于敏感操作
- [ ] JWT Token 是否验证签名和过期时间

### 漏洞代码示例

```python
# ❌ 漏洞：JWT 未验证签名，接受 alg=none
import jwt

def verify_token(token):
    payload = jwt.decode(token, options={"verify_signature": False})
    return payload
```

### 修复示例

```python
# ✅ 修复：强制验证签名和过期时间，指定算法
import jwt
import os

JWT_SECRET = os.environ["JWT_SECRET"]

def verify_token(token):
    try:
        payload = jwt.decode(
            token,
            JWT_SECRET,
            algorithms=["HS256"],
            options={"require": ["exp", "iat", "sub"]}
        )
        return payload
    except jwt.ExpiredSignatureError:
        raise AuthError("Token 已过期")
    except jwt.InvalidTokenError:
        raise AuthError("无效的 Token")
```

---

## A08:2021 — 软件和数据完整性失败 (Software and Data Integrity Failures)

**风险说明：** 未验证软件更新、关键数据、CI/CD 流水线的完整性，导致供应链攻击或数据篡改。

**检查要点：**
- [ ] 反序列化是否使用了不安全的方法（如 Python 的 `pickle.loads` 处理不可信数据）
- [ ] CI/CD 流水线是否有完整性验证
- [ ] 第三方 CDN 资源是否使用了 SRI（Subresource Integrity）
- [ ] 关键配置文件修改是否有审计日志
- [ ] 自动更新机制是否验证签名

### 漏洞代码示例

```python
# ❌ 漏洞：反序列化不可信数据，可导致远程代码执行
import pickle

@app.route("/api/import", methods=["POST"])
def import_data():
    data = pickle.loads(request.data)
    process(data)
    return "OK"
```

### 修复示例

```python
# ✅ 修复：使用安全的数据格式（JSON），拒绝反序列化任意对象
import json

@app.route("/api/import", methods=["POST"])
def import_data():
    try:
        data = json.loads(request.data)
    except json.JSONDecodeError:
        return jsonify({"error": "无效的 JSON 格式"}), 400
    process(data)
    return "OK"
```

---

## A09:2021 — 安全日志和监控失败 (Security Logging and Monitoring Failures)

**风险说明：** 缺乏安全事件的日志记录和监控，导致攻击无法被及时发现和响应。

**检查要点：**
- [ ] 登录成功/失败是否有日志记录
- [ ] 敏感操作（权限变更、数据删除）是否有审计日志
- [ ] 日志中是否不小心记录了密码、Token 等敏感数据
- [ ] 日志是否有防篡改机制（集中化存储、只追加写入）
- [ ] 是否配置了异常行为告警（如短时间大量失败登录）

### 漏洞代码示例

```python
# ❌ 漏洞：登录失败无日志，且日志中记录了明文密码
def login(username, password):
    user = db.get_user(username)
    if not user or not check_password(password, user.password_hash):
        print(f"Login failed for {username} with password {password}")
        return None
    return create_session(user)
```

### 修复示例

```python
# ✅ 修复：记录安全事件但不记录敏感数据
import logging

security_logger = logging.getLogger("security")

def login(username, password):
    user = db.get_user(username)
    if not user or not check_password(password, user.password_hash):
        security_logger.warning(
            "登录失败",
            extra={"username": username, "ip": request.remote_addr}
        )
        return None
    security_logger.info(
        "登录成功",
        extra={"username": username, "ip": request.remote_addr}
    )
    return create_session(user)
```

---

## A10:2021 — 服务端请求伪造 SSRF (Server-Side Request Forgery)

**风险说明：** 应用接受用户提供的 URL 并在服务端发起请求，攻击者可利用此访问内网资源或云元数据。

**检查要点：**
- [ ] 是否存在接受用户 URL 并在服务端请求的功能（如图片抓取、URL 预览、Webhook 回调）
- [ ] 是否限制了目标 URL 的协议（仅允许 http/https）
- [ ] 是否过滤了内网 IP 地址段（127.0.0.0/8、10.0.0.0/8、172.16.0.0/12、192.168.0.0/16）
- [ ] 是否阻止了云元数据地址（169.254.169.254）
- [ ] DNS 重绑定攻击是否有防护

### 漏洞代码示例

```python
# ❌ 漏洞：直接请求用户提供的 URL，可访问内网和云元数据
import requests

@app.route("/api/fetch-url")
def fetch_url():
    url = request.args.get("url")
    response = requests.get(url)
    return response.text
```

### 修复示例

```python
# ✅ 修复：校验 URL 协议和目标地址，阻止内网访问
import requests
import ipaddress
from urllib.parse import urlparse
import socket

BLOCKED_NETWORKS = [
    ipaddress.ip_network("127.0.0.0/8"),
    ipaddress.ip_network("10.0.0.0/8"),
    ipaddress.ip_network("172.16.0.0/12"),
    ipaddress.ip_network("192.168.0.0/16"),
    ipaddress.ip_network("169.254.0.0/16"),
]

def is_safe_url(url):
    parsed = urlparse(url)
    if parsed.scheme not in ("http", "https"):
        return False
    try:
        ip = ipaddress.ip_address(socket.gethostbyname(parsed.hostname))
        for network in BLOCKED_NETWORKS:
            if ip in network:
                return False
    except (socket.gaierror, ValueError):
        return False
    return True

@app.route("/api/fetch-url")
def fetch_url():
    url = request.args.get("url")
    if not is_safe_url(url):
        return jsonify({"error": "不允许访问该地址"}), 403
    response = requests.get(url, timeout=10, allow_redirects=False)
    return response.text
```

---

## 审查报告模板

完成检查后，输出如下格式的报告。**所有 10 项都必须出现**，无发现的标 ✅：

```
# OWASP Top 10 安全审查报告

## 审查概览
- 审查范围：[文件/模块列表]
- 审查时间：[日期]
- 风险统计：🔴 高危 X 个 | 🟡 中危 X 个 | 🟢 低危 X 个 | ✅ 无发现 X 项

## 发现详情（按风险等级降序）

### [风险等级] [OWASP 编号] — [问题标题]
- **位置：** [文件:行号]
- **描述：** [问题描述]
- **影响：** [可能造成的危害]
- **修复代码：**（直接可用的代码，非描述）

### ✅ A0X — [类别名] — 未发现问题

## 修复优先级
1. [最紧急修复项 — 理由]
2. [次优先项 — 理由]
3. ...
```

---

## 常用自动化检查工具（开源免费）

| 工具 | 语言 | 用途 |
|------|------|------|
| `bandit` | Python | Python 代码安全扫描 |
| `semgrep` | 多语言 | 基于规则的代码扫描 |
| `eslint-plugin-security` | JavaScript | JS 安全规则 |
| `npm audit` / `pip audit` | JS / Python | 依赖漏洞扫描 |
| `trivy` | 多语言 | 容器和依赖扫描 |
| `sqlmap` | — | SQL 注入检测 |
| `OWASP ZAP` | — | Web 应用动态扫描 |

> **注意：** 本清单为辅助审查工具，不能替代专业渗透测试。对于高安全要求的系统，建议结合自动化扫描 + 人工审计 + 渗透测试。
