# Screenshot Evidence Guide

When API exports are not available, screenshots are acceptable evidence — but they must meet specific requirements to be accepted by auditors.

## When to Use Screenshots

Screenshots are the evidence of LAST RESORT. Use them only when:

1. The system has no API or CLI export capability
2. You need to show a UI-specific configuration (e.g., portal settings page)
3. The API export doesn't capture what the auditor needs to see
4. You're documenting a process (step-by-step walkthrough)

**Always prefer API exports** — they're timestamped, machine-readable, and harder to forge.

## Requirements for Audit-Ready Screenshots

### Mandatory
- **System clock visible** — the macOS menu bar (top-right) or Windows taskbar (bottom-right) must show the current date and time
- **Full context** — show the complete page/panel, not a cropped section. Auditors need to verify WHAT system the screenshot is from
- **URL bar visible** — for web applications, the browser URL bar must be visible to confirm the system
- **User identity visible** — the logged-in user should be visible (top-right corner in most portals)

### Recommended
- **High resolution** — at least 1920x1080 to ensure text is readable
- **No annotations on the evidence copy** — annotated versions can be provided separately for reference
- **Dark mode off** — light backgrounds print more clearly for auditors who print evidence

## macOS Screenshot Commands

```bash
# Full screen capture (includes menu bar with clock)
screencapture -x ~/evidence/{filename}.png

# Specific window capture (add -w flag, then click the window)
screencapture -xw ~/evidence/{filename}.png

# Timed capture (10 second delay — useful for capturing dropdown menus)
screencapture -xT 10 ~/evidence/{filename}.png

# Capture specific screen region (drag to select)
screencapture -xs ~/evidence/{filename}.png
```

**Tip**: The `-x` flag prevents the screenshot sound, which is less disruptive.

## Naming Convention

```
{control_id}_{system}_{description}_{YYYY-MM-DD}.png
```

Examples:
- `A.5.17_google-workspace_mfa-enforcement_2026-02-28.png`
- `A.8.9_aws-console_security-group-config_2026-02-28.png`
- `A.8.32_github_branch-protection-settings_2026-02-28.png`

## Common Screenshot Evidence

| Control | What to Screenshot | System |
|---------|-------------------|--------|
| A.5.17 | MFA enforcement settings | Google Workspace Admin / Azure AD |
| A.8.5 | Password policy configuration | IdP settings page |
| A.8.9 | Security group / firewall rules | Cloud console (when CLI unavailable) |
| A.8.15 | Log retention settings | CloudWatch / Stackdriver / Azure Monitor |
| A.8.24 | Encryption at rest configuration | Database / storage settings |
| A.8.32 | Branch protection rules | GitHub repository settings |

## Rejection Reasons

Auditors commonly reject screenshots for:

1. **No timestamp** — "When was this taken?" → Include system clock
2. **Cropped too tightly** — "What system is this from?" → Show URL bar and surrounding context
3. **Edited or annotated** — "Is this authentic?" → Provide clean + annotated versions separately
4. **Wrong environment** — "Is this production?" → URL should show production hostname
5. **Stale** — "This is from 6 months ago" → Re-capture within the audit window
