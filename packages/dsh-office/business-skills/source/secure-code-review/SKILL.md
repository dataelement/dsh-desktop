---
name: secure-code-review
description: "Systematically reviews code for SQL injection, XSS, SSRF, broken access control, cryptographic failures, and other common OWASP Top 10 vulnerabilities, providing vulnerable code examples and ready-to-use remediation guidance. Trigger this skill when users ask for a security review, vulnerability scan, or penetration testing assistance, or mention keywords like OWASP, SQL injection, XSS, code audit, or security checklist."
license: MIT
---

# OWASP Top 10 Code Security Review Checklist

A systematic security review based on the OWASP Top 10 (2021) standard. Each item includes: vulnerability description, typical vulnerable code, inspection checkpoints, and remediation examples. Designed for security-focused code review of web applications.

## Usage

Provide the code files or code snippets to review, and specify which OWASP categories to check (or request a full review) to receive an item-by-item audit report.

**Example prompts:**
- "Check this code for SQL injection risks"
- "Run a full OWASP Top 10 security review on this project"
- "Does this API endpoint have any SSRF vulnerabilities?"

---

## Quick Reference

| ID | Category | Key Check |
|----|----------|-----------|
| A01 | Broken Access Control | Does every endpoint verify the current user's identity? Can users access others' data by changing IDs? |
| A02 | Cryptographic Failures | Are passwords hashed with bcrypt/argon2? Are secrets hardcoded? |
| A03 | Injection | String-concatenated SQL? `shell=True`? Unescaped template output? |
| A04 | Insecure Design | Is rate limiting in place? Can critical workflows be bypassed? |
| A05 | Security Misconfiguration | DEBUG enabled? Stack traces in error pages? Default credentials? |
| A06 | Vulnerable Components | Any CVEs from `pip audit` / `npm audit`? |
| A07 | Authentication Failures | Is JWT signature verified? Can tokens be revoked? Is MFA available? |
| A08 | Integrity Failures | Any `pickle.loads` deserializing untrusted data? |
| A09 | Logging & Monitoring Failures | Are plaintext passwords in logs? Are failed logins recorded? |
| A10 | SSRF | Are user-supplied URLs filtered against internal IPs? |

---

## Review Process SOP

**Core principle: prefer false positives over missed true positives.**

1. **Define scope** — Identify the files, modules, or code snippets to review
2. **Full coverage check** — Scan through A01-A10 sequentially. **Every item must appear in the report** (mark items with no findings as pass). The default behavior is to only report issues found — this process requires full coverage to ensure nothing is missed
3. **Risk classification** — Label each finding:
   - RED High: Directly exploitable (RCE, SQL injection, SSRF reaching internal networks, plaintext password storage)
   - YELLOW Medium: Exploitable under specific conditions (missing rate limiting, weak password policy, static tokens)
   - GREEN Low: Defense-in-depth gap with no direct exploitation path (missing security headers, insufficient logging)
4. **Every finding must include ready-to-use fix code** (actual code, not just a description). Reference specific `file:line_number`
5. **Output the review report** — Use the template below, findings sorted by severity descending, with a prioritized remediation list at the end

---

## A01:2021 — Broken Access Control

**Risk:** Users can access other users' data or perform unauthorized operations.

**Checkpoints:**
- [ ] Does every API endpoint enforce authorization?
- [ ] Are there IDOR vulnerabilities (Insecure Direct Object References) — can users access others' data by modifying ID parameters?
- [ ] Do admin interfaces verify roles?
- [ ] Is access control enforced server-side (not just by hiding UI elements)?
- [ ] Is the CORS policy overly permissive?

### Vulnerable Code Example

```python
# ❌ Vulnerable: No authorization check — any user can view others' orders by changing user_id
@app.route("/api/orders/<user_id>")
def get_orders(user_id):
    orders = db.query(f"SELECT * FROM orders WHERE user_id = {user_id}")
    return jsonify(orders)
```

### Remediation Example

```python
# ✅ Fixed: Verify the authenticated user can only access their own data
@app.route("/api/orders")
@login_required
def get_orders():
    current_user_id = get_current_user().id
    orders = db.query("SELECT * FROM orders WHERE user_id = %s", (current_user_id,))
    return jsonify(orders)
```

---

## A02:2021 — Cryptographic Failures

**Risk:** Sensitive data (passwords, credit card numbers, personal information) is unencrypted or uses weak cryptographic algorithms.

**Checkpoints:**
- [ ] Are passwords stored using secure hashing (bcrypt/scrypt/argon2) rather than MD5/SHA1?
- [ ] Is HTTPS enforced for sensitive data in transit?
- [ ] Are encryption keys hardcoded in the source code?
- [ ] Are deprecated cryptographic algorithms in use (DES, RC4, MD5)?
- [ ] Are sensitive database fields encrypted at rest?

### Vulnerable Code Example

```python
# ❌ Vulnerable: MD5 for password storage, hardcoded secret key
import hashlib

SECRET_KEY = "my-secret-key-123"

def save_password(password):
    hashed = hashlib.md5(password.encode()).hexdigest()
    db.save(hashed)
```

### Remediation Example

```python
# ✅ Fixed: bcrypt for password hashing, secret key from environment variable
import bcrypt
import os

SECRET_KEY = os.environ["SECRET_KEY"]

def save_password(password):
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode(), salt)
    db.save(hashed)
```

---

## A03:2021 — Injection

**Risk:** User input is concatenated directly into SQL, OS commands, LDAP queries, etc., allowing attackers to execute arbitrary queries or commands.

**Checkpoints:**
- [ ] Do SQL queries use parameterized queries / ORM (not string concatenation)?
- [ ] Are there `os.system()` or `subprocess.call(shell=True)` calls that concatenate user input?
- [ ] Does template rendering properly escape user input (preventing XSS)?
- [ ] Are special characters filtered in LDAP / XPath / NoSQL queries?
- [ ] Are unfiltered user inputs logged directly (log injection)?

### SQL Injection — Vulnerable Code

```python
# ❌ Vulnerable: String-concatenated SQL — attacker can input ' OR 1=1 --
@app.route("/api/user")
def get_user():
    username = request.args.get("username")
    query = f"SELECT * FROM users WHERE username = '{username}'"
    result = db.execute(query)
    return jsonify(result)
```

### SQL Injection — Remediation

```python
# ✅ Fixed: Parameterized query
@app.route("/api/user")
def get_user():
    username = request.args.get("username")
    result = db.execute(
        "SELECT * FROM users WHERE username = %s",
        (username,)
    )
    return jsonify(result)
```

### Command Injection — Vulnerable Code

```python
# ❌ Vulnerable: User input concatenated directly into shell command
import os

def ping_host(host):
    os.system(f"ping -c 4 {host}")
```

### Command Injection — Remediation

```python
# ✅ Fixed: Use subprocess with list arguments, shell disabled
import subprocess
import re

def ping_host(host):
    if not re.match(r'^[a-zA-Z0-9.\-]+$', host):
        raise ValueError("Invalid hostname")
    subprocess.run(["ping", "-c", "4", host], check=True)
```

---

## A04:2021 — Insecure Design

**Risk:** Business logic design flaws that cannot be fixed by a perfect implementation.

**Checkpoints:**
- [ ] Do critical operations have rate limiting?
- [ ] Can the password reset flow be abused (username enumeration, verification code brute-force)?
- [ ] Do sensitive operations (payments, transfers) require secondary confirmation?
- [ ] Are there batch operation endpoints with no upper limit?
- [ ] Can business workflows be executed out of order (e.g., skipping payment to complete an order)?

### Vulnerable Code Example

```python
# ❌ Vulnerable: No attempt limit on verification code — can be brute-forced
@app.route("/api/verify-code", methods=["POST"])
def verify_code():
    code = request.json["code"]
    stored_code = session.get("verification_code")
    if code == stored_code:
        return jsonify({"status": "verified"})
    return jsonify({"status": "invalid"}), 400
```

### Remediation Example

```python
# ✅ Fixed: Added attempt limit and expiration
@app.route("/api/verify-code", methods=["POST"])
def verify_code():
    attempts = session.get("verify_attempts", 0)
    if attempts >= 5:
        return jsonify({"error": "Too many attempts, please request a new code"}), 429

    code = request.json["code"]
    stored = session.get("verification_code")
    expire_at = session.get("code_expire_at", 0)

    if time.time() > expire_at:
        return jsonify({"error": "Verification code has expired"}), 400

    session["verify_attempts"] = attempts + 1

    if code == stored:
        session.pop("verify_attempts", None)
        return jsonify({"status": "verified"})
    return jsonify({"status": "invalid"}), 400
```

---

## A05:2021 — Security Misconfiguration

**Risk:** Applications or servers use default configurations, enable unnecessary features, or expose sensitive information in error messages.

**Checkpoints:**
- [ ] Is DEBUG mode disabled in production?
- [ ] Do error pages leak stack traces, database versions, etc.?
- [ ] Are default credentials still in use?
- [ ] Do HTTP responses include security headers (X-Frame-Options, Content-Security-Policy, etc.)?
- [ ] Are unnecessary HTTP methods (PUT, DELETE, TRACE) disabled?
- [ ] Is directory listing disabled?

### Vulnerable Code Example

```python
# ❌ Vulnerable: DEBUG enabled in production, leaking sensitive information
app = Flask(__name__)
app.config["DEBUG"] = True
app.config["SECRET_KEY"] = "default-secret"

@app.errorhandler(500)
def error_handler(e):
    return jsonify({"error": str(e), "traceback": traceback.format_exc()}), 500
```

### Remediation Example

```python
# ✅ Fixed: Configuration from environment variables, DEBUG off in production
import os

app = Flask(__name__)
app.config["DEBUG"] = os.environ.get("FLASK_DEBUG", "false").lower() == "true"
app.config["SECRET_KEY"] = os.environ["FLASK_SECRET_KEY"]

@app.errorhandler(500)
def error_handler(e):
    app.logger.error(f"Internal error: {e}")
    return jsonify({"error": "Internal server error, please try again later"}), 500
```

---

## A06:2021 — Vulnerable and Outdated Components

**Risk:** Using third-party libraries or framework versions with known vulnerabilities.

**Checkpoints:**
- [ ] Do dependencies have known CVEs (scan with `pip audit`, `npm audit`, `snyk`, etc.)?
- [ ] Are there dependencies that haven't been updated in a long time?
- [ ] Are any unmaintained libraries in use?
- [ ] Are lock files (package-lock.json / requirements.txt) under version control?
- [ ] Is there an automated dependency update mechanism (Dependabot, etc.)?

### Scan Commands

```bash
# Python projects
pip audit

# Node.js projects
npm audit

# General scanning
# Use open-source tools like trivy or grype to scan container/project dependencies
```

### Remediation Guidance

```bash
# Update vulnerable packages
pip install --upgrade package_name

# Auto-fix npm vulnerabilities
npm audit fix

# Pin dependency versions to prevent implicit upgrades
pip freeze > requirements.txt
```

---

## A07:2021 — Identification and Authentication Failures

**Risk:** Authentication mechanisms have flaws that allow brute-force attacks, credential stuffing, or session hijacking.

**Checkpoints:**
- [ ] Is there a login failure rate limit (account lockout / delay)?
- [ ] Is the password policy reasonable (minimum length, complexity requirements)?
- [ ] Are session tokens invalidated on logout?
- [ ] Are session IDs sufficiently random and unpredictable?
- [ ] Is MFA supported for sensitive operations?
- [ ] Are JWT tokens validated for signature and expiration?

### Vulnerable Code Example

```python
# ❌ Vulnerable: JWT signature not verified, accepts alg=none
import jwt

def verify_token(token):
    payload = jwt.decode(token, options={"verify_signature": False})
    return payload
```

### Remediation Example

```python
# ✅ Fixed: Enforce signature and expiration verification, specify algorithm
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
        raise AuthError("Token has expired")
    except jwt.InvalidTokenError:
        raise AuthError("Invalid token")
```

---

## A08:2021 — Software and Data Integrity Failures

**Risk:** Failure to verify the integrity of software updates, critical data, or CI/CD pipelines, enabling supply chain attacks or data tampering.

**Checkpoints:**
- [ ] Does deserialization use unsafe methods (e.g., Python's `pickle.loads` on untrusted data)?
- [ ] Does the CI/CD pipeline have integrity verification?
- [ ] Do third-party CDN resources use SRI (Subresource Integrity)?
- [ ] Are modifications to critical configuration files audit-logged?
- [ ] Does the auto-update mechanism verify signatures?

### Vulnerable Code Example

```python
# ❌ Vulnerable: Deserializing untrusted data — can lead to remote code execution
import pickle

@app.route("/api/import", methods=["POST"])
def import_data():
    data = pickle.loads(request.data)
    process(data)
    return "OK"
```

### Remediation Example

```python
# ✅ Fixed: Use a safe data format (JSON), refuse to deserialize arbitrary objects
import json

@app.route("/api/import", methods=["POST"])
def import_data():
    try:
        data = json.loads(request.data)
    except json.JSONDecodeError:
        return jsonify({"error": "Invalid JSON format"}), 400
    process(data)
    return "OK"
```

---

## A09:2021 — Security Logging and Monitoring Failures

**Risk:** Lack of security event logging and monitoring, preventing timely detection and response to attacks.

**Checkpoints:**
- [ ] Are login successes and failures logged?
- [ ] Are sensitive operations (permission changes, data deletion) audit-logged?
- [ ] Are passwords, tokens, or other sensitive data accidentally included in logs?
- [ ] Are logs tamper-resistant (centralized storage, append-only writes)?
- [ ] Are alerts configured for anomalous behavior (e.g., burst of failed logins)?

### Vulnerable Code Example

```python
# ❌ Vulnerable: No logging on login failure, and plaintext password in logs
def login(username, password):
    user = db.get_user(username)
    if not user or not check_password(password, user.password_hash):
        print(f"Login failed for {username} with password {password}")
        return None
    return create_session(user)
```

### Remediation Example

```python
# ✅ Fixed: Log security events without logging sensitive data
import logging

security_logger = logging.getLogger("security")

def login(username, password):
    user = db.get_user(username)
    if not user or not check_password(password, user.password_hash):
        security_logger.warning(
            "Login failed",
            extra={"username": username, "ip": request.remote_addr}
        )
        return None
    security_logger.info(
        "Login successful",
        extra={"username": username, "ip": request.remote_addr}
    )
    return create_session(user)
```

---

## A10:2021 — Server-Side Request Forgery (SSRF)

**Risk:** The application accepts user-provided URLs and makes server-side requests, allowing attackers to access internal network resources or cloud metadata.

**Checkpoints:**
- [ ] Are there features that accept user-supplied URLs and make server-side requests (image fetching, URL previews, webhook callbacks)?
- [ ] Is the URL protocol restricted (allow only http/https)?
- [ ] Are internal IP ranges filtered (127.0.0.0/8, 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16)?
- [ ] Is the cloud metadata address blocked (169.254.169.254)?
- [ ] Is there protection against DNS rebinding attacks?

### Vulnerable Code Example

```python
# ❌ Vulnerable: Directly requesting user-supplied URL — can access internal network and cloud metadata
import requests

@app.route("/api/fetch-url")
def fetch_url():
    url = request.args.get("url")
    response = requests.get(url)
    return response.text
```

### Remediation Example

```python
# ✅ Fixed: Validate URL protocol and target address, block internal network access
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
        return jsonify({"error": "Access to this address is not allowed"}), 403
    response = requests.get(url, timeout=10, allow_redirects=False)
    return response.text
```

---

## Review Report Template

After completing the review, output a report in the following format. **All 10 items must appear** — mark items with no findings as pass:

```
# OWASP Top 10 Security Review Report

## Review Summary
- Scope: [list of files/modules]
- Date: [date]
- Risk summary: RED High x | YELLOW Medium x | GREEN Low x | PASS No findings x

## Findings (sorted by severity, descending)

### [Severity] [OWASP ID] — [Issue Title]
- **Location:** [file:line_number]
- **Description:** [issue description]
- **Impact:** [potential consequences]
- **Fix:** (ready-to-use code, not just a description)

### PASS A0X — [Category] — No issues found

## Remediation Priority
1. [Most urgent fix — rationale]
2. [Next priority — rationale]
3. ...
```

---

## Recommended Open-Source Security Tools

| Tool | Language | Purpose |
|------|----------|---------|
| `bandit` | Python | Python code security scanning |
| `semgrep` | Multi-language | Rule-based code scanning |
| `eslint-plugin-security` | JavaScript | JS security rules |
| `npm audit` / `pip audit` | JS / Python | Dependency vulnerability scanning |
| `trivy` | Multi-language | Container and dependency scanning |
| `sqlmap` | — | SQL injection detection |
| `OWASP ZAP` | — | Web application dynamic scanning |

> **Note:** This checklist is a supplementary review tool and does not replace professional penetration testing. For high-security systems, combine automated scanning + manual code audit + penetration testing.
