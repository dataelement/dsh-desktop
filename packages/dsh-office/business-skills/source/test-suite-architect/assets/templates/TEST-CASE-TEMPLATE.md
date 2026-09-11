# Test Case Template

Use this template for writing standardized, reproducible test cases.

---

## Template Structure

```markdown
### TC-[CATEGORY]-[NUMBER]: [Descriptive Title]

**Priority**: P0/P1/P2/P3/P4
**Type**: Unit/Integration/E2E/Security/Performance
**Estimated Time**: [X] minutes

**Prerequisites**:
- Prerequisite 1 (specific and verifiable)
- Prerequisite 2

**Test Steps**:
1. Step 1 (exact command or action)
2. Step 2 (specific input data)
3. Step 3 (verification action)

**Expected Result**:
✅ Specific outcome with example output
✅ Measurable verification criteria

**Pass/Fail Criteria**:
- ✅ PASS: All verification steps succeed
- ❌ FAIL: Any error, missing data, or deviation

**Potential Bugs to Watch For**:
- Known edge case or vulnerability
- Related security concern
```

---

## Example: CLI Install Test

```markdown
### TC-CLI-001: Install Skill from GitHub Repository

**Priority**: P0
**Type**: Integration
**Estimated Time**: 5 minutes

**Prerequisites**:
- CLI installed globally (`which ccpm` returns path)
- Internet connection active
- `~/.claude/skills/` directory exists or can be created
- No existing installation of `cli-demo-generator`

**Test Steps**:
1. Open terminal
2. Run: `ccpm install cli-demo-generator`
3. Observe success message
4. Run: `ls ~/.claude/skills/`
5. Verify directory exists
6. Run: `cat ~/.claude/skills/cli-demo-generator/package.json`
7. Verify valid JSON with name field

**Expected Result**:
✅ Terminal shows: "Successfully installed cli-demo-generator"
✅ Directory created: `~/.claude/skills/cli-demo-generator/`
✅ package.json exists with valid content
✅ No errors in terminal output

**Pass/Fail Criteria**:
- ✅ PASS: All 4 verification criteria met, exit code 0
- ❌ FAIL: Any error message, missing directory, or malformed package.json

**Potential Bugs to Watch For**:
- Path traversal vulnerability (test with `../../../etc/passwd`)
- Network timeout with no retry logic
- Incorrect permissions on `~/.claude` directory
- Race condition if multiple installs concurrent
```

---

## Example: Security Test

```markdown
### TC-SEC-001: SQL Injection Protection - Login Form

**Priority**: P0
**Type**: Security
**Estimated Time**: 3 minutes

**Prerequisites**:
- Application running on http://localhost:8080
- Test user account exists: `test@example.com` / `password123`
- Database seeded with sample data

**Test Steps**:
1. Navigate to login page
2. Enter username: `admin' OR '1'='1`
3. Enter password: `anything`
4. Click "Login" button
5. Observe response

**Expected Result**:
✅ Login FAILS with error: "Invalid credentials"
✅ SQL injection attempt logged in security_events table
✅ No database data exposed in error message
✅ User NOT authenticated

**Pass/Fail Criteria**:
- ✅ PASS: Login fails, injection logged, no data leak
- ❌ FAIL: Login succeeds, no logging, or SQL error exposed

**Potential Bugs to Watch For**:
- Verbose error messages exposing schema
- Second-order SQL injection in profile fields
- NoSQL injection if using MongoDB
- Timing-based blind SQL injection
```

---

## Guidelines

### Writing Clear Prerequisites
❌ **Bad**: "System running"
✅ **Good**: "Docker containers healthy (`docker ps` shows 5 running), port 8080 accessible"

### Writing Specific Steps
❌ **Bad**: "Test the login"
✅ **Good**: "Enter 'test@example.com' in email field, enter 'Password123!' in password field, click 'Login' button"

### Writing Measurable Results
❌ **Bad**: "It works"
✅ **Good**: "HTTP 200 response, redirects to /dashboard, session cookie set with 30min expiry"

### Estimating Time
- Simple validation: 1-2 min
- API call test: 2-3 min
- E2E workflow: 5-10 min
- Security audit: 3-5 min per test

---

## Category Codes

- **CLI**: Command-line interface tests
- **WEB**: Web UI tests
- **API**: Backend API tests
- **DB**: Database tests
- **SEC**: Security tests
- **PERF**: Performance tests
- **INT**: Integration tests
- **E2E**: End-to-end tests

---

## Priority Assignment Rules

Assign P0 if:
- Prevents core functionality
- Security vulnerability (OWASP Top 10)
- Data loss or corruption
- System crash

Assign P1 if:
- Major feature broken (with workaround)
- Significant UX degradation
- Performance regression >50%

Assign P2 if:
- Minor feature issue
- Edge case failure
- Non-critical bug

Assign P3/P4 for cosmetic or documentation issues.

---

**Usage**: Copy this template when writing new test cases. Replace all bracketed placeholders with actual values.
