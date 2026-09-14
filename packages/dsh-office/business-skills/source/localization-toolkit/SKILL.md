---
name: localization-toolkit
description: This skill should be used when setting up, auditing, or enforcing internationalization/localization in UI codebases (React/TS, i18next or similar, JSON locales), including installing/configuring the i18n framework, replacing hard-coded strings, ensuring en-US/zh-CN coverage, mapping error codes to localized messages, and validating key parity, pluralization, and formatting.
---

# I18n Expert

## Overview

Deliver a complete i18n setup + audit pass: configure the i18n framework, replace user-facing strings with keys, ensure locale parity, and validate pluralization/formatting for en-US and zh-CN.

## Core Capabilities

- Library selection and setup (React, Next.js, Vue).
- Key architecture and locale file organization.
- Translation generation and quality strategy (AI, professional, manual).
- Routing and language detection/switching.
- SEO and metadata localization (when applicable).
- RTL support (only if RTL locales are in scope).

## Scope Inputs (ask if unclear)

- Framework and routing style.
- Existing i18n state (none, partial, legacy).
- Target locales (default: en-US + zh-CN).
- Translation quality needs (AI vs professional vs manual).
- Locale formats in use (JSON, YAML, PO, XLIFF).
- Formality/cultural requirements (if any).

## Workflow (Audit -> Fix -> Validate)

1) Confirm scope and locale targets
- Identify the i18n framework and locale locations.
- Confirm locales; default to en-US + zh-CN when specified.

2) Setup i18n baseline (if missing)
- Choose a framework-appropriate library (e.g., React: react-i18next; Next.js: next-intl; Vue: vue-i18n).
- Install packages and create the i18n entry/config file.
- Wire the provider at the app root and load locale resources.
- Add a language switcher and persistence (route/param/localStorage) as appropriate.
- Establish locale file layout and key namespaces.
- If routing is locale-aware, define the locale segment strategy early (subpath, subdomain, query param).
 - If metadata is user-facing, include translation for titles/descriptions.

3) Audit key usage and locale parity
- Run:
  ```bash
  python scripts/i18n_audit.py --src <src-root> --locale <path/to/en-US.json> --locale <path/to/zh-CN.json>
  ```
- Treat missing keys/parity gaps as blockers.
- Manually verify dynamic keys (`t(var)`).

4) Find raw user-facing strings
- Search:
  ```bash
  rg -n --glob '<src>/**/*.{ts,tsx,js,jsx}' "<[^>]+>[^<{]*[A-Za-z][^<{]*<"
  rg -n --glob '<src>/**/*.{ts,tsx,js,jsx}' "aria-label=\"[^\"]+\"|title=\"[^\"]+\"|placeholder=\"[^\"]+\""
  ```
- Localize accessibility labels.

5) Replace strings with keys
- Use `t('namespace.key')` for UI text.
- For plurals use `t('key', { count })` + `_one/_other` keys.
- Use Intl/app formatters for time/date/number.

6) Localize error handling (critical)
- Map error codes to localized keys; show localized UI only.
- Log raw error details only.
- Provide localized fallback for unknown codes.

7) Update locale files
- Add missing keys in both locales.
- Keep placeholders consistent; avoid renames unless requested.
- Generate translations using the agreed method; preserve placeholders and plural rules.

8) Validate
- Re-run the audit until missing/parity issues are zero.
- Validate JSON (e.g., `python -m json.tool <file>`).
- Update tests asserting visible text.

## Guardrails

- Never expose raw `error.message` to UI; show localized strings only.
- Do not add extra locales unless explicitly requested.
- Prefer structured namespaces (e.g., `errors.*`, `buttons.*`, `workspace.*`).
- Keep translations concise and consistent.
- Some technical/brand terms should remain untranslated (e.g., product name, API, MCP, Bash).

## Deliverables (expected outputs)

- i18n config/provider wiring.
- Locale files for each target language.
- Replaced UI strings with stable keys.
- Language switcher and persistence (if applicable).
- Updated tests for visible text.

## Architecture Guidance (keep concise)

- Key structure: prefer nested namespaces by area (e.g., `common.buttons.save`, `pricing.tier.pro`).
- File layout: one file per locale or per-locale namespaces; keep keys in sync across locales.
- Placeholders: preserve `{name}`/`{{name}}` exactly; validate plurals by locale rules.
- Formatting: use Intl/app helpers for date, time, number, and list formatting.
- SEO/metadata: localize titles and descriptions if the app exposes them.
- RTL: only needed for RTL locales; use logical CSS properties and test layout.
- Non-web surfaces (Electron main-process dialogs, CLI prompts, native menus) need localization too.

## Performance Notes (short)

- Lazy-load locale bundles when the app supports it.
- Split large locale files by namespace.

## Failure Modes (watchlist)

- Missing translations: fall back to default locale and log warnings.
- RTL layout issues: verify logical CSS and test pages.
- SEO missing: ensure alternates and metadata are localized when applicable.

## Validation Checklist (short)

- No missing keys and no raw UI strings.
- Locale switching works and persists.
- Plurals and formatting verified in both locales.
 - Fallback locale configured.

## Resources

### scripts/
- `scripts/i18n_audit.py`: Extracts `t('key')` usage and compares against locale JSON files.
