---
name: pipeline-blueprint
description: "Provide CI/CD best practices and pipeline templates for GitHub Actions and GitLab CI, recommending configurations based on project type (frontend, backend, fullstack, library, monorepo, mobile). Trigger when users ask about setting up CI/CD, automating builds, improving pipelines, or mention keywords like GitHub Actions, GitLab CI, pipeline templates, or deployment automation."
license: MIT
---

# CI/CD Configuration Best Practices

This skill provides CI/CD pipeline templates and best practices for **GitHub Actions** and **GitLab CI**. It recommends configurations based on project type, helping teams quickly set up reliable, secure, and efficient pipelines.

## How to Use

When a user describes their project (language, framework, deployment target), recommend the most appropriate pipeline template below. Adapt stages, caching strategies, and deployment steps to match their stack.

---

## General Best Practices

### Pipeline Design Principles

1. **Fail fast**: Run linting and unit tests before expensive integration or E2E tests.
2. **Cache aggressively**: Cache dependency directories (`node_modules`, `.pip_cache`, `.m2`, `.gradle`) to speed up builds.
3. **Pin versions**: Pin CI runner images, tool versions, and action versions to SHA or exact tags — never use `latest`.
4. **Least privilege**: Use minimal permissions for tokens and credentials. Prefer OIDC over long-lived secrets where supported.
5. **Parallelize**: Split test suites across parallel jobs. Use matrix builds for multi-version testing.
6. **Immutable artifacts**: Build once, promote the same artifact through staging → production.
7. **Branch protection**: Require CI to pass before merging. Use status checks on the default branch.

### Security Checklist

- Never hardcode secrets in pipeline files; use the platform's secret management (GitHub Secrets / GitLab CI Variables).
- Audit third-party actions/images before use. Prefer official or verified sources.
- Enable dependency scanning (Dependabot, GitLab Dependency Scanning) and SAST where possible.
- Restrict who can trigger production deployments.
- Rotate secrets on a regular cadence.

---

## Project Type Templates

### 1. Frontend (React / Vue / Angular / Static Sites)

**Key stages**: Install → Lint → Test → Build → Deploy

#### GitHub Actions

```yaml
name: Frontend CI/CD

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

permissions:
  contents: read

jobs:
  ci:
    runs-on: ubuntu-22.04
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - run: npm ci

      - run: npm run lint

      - run: npm test -- --coverage

      - run: npm run build

      - uses: actions/upload-artifact@v4
        with:
          name: dist
          path: dist/

  deploy:
    needs: ci
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    runs-on: ubuntu-22.04
    environment: production
    steps:
      - uses: actions/download-artifact@v4
        with:
          name: dist
          path: dist/

      # Replace with your deployment step (e.g., S3 sync, Cloudflare Pages, Vercel)
      - name: Deploy
        run: echo "Add your deployment command here"
```

#### GitLab CI

```yaml
stages:
  - install
  - lint
  - test
  - build
  - deploy

default:
  image: node:20-slim
  cache:
    key: ${CI_COMMIT_REF_SLUG}
    paths:
      - node_modules/

install:
  stage: install
  script:
    - npm ci

lint:
  stage: lint
  script:
    - npm run lint

test:
  stage: test
  script:
    - npm test -- --coverage
  artifacts:
    reports:
      coverage_report:
        coverage_format: cobertura
        path: coverage/cobertura-coverage.xml

build:
  stage: build
  script:
    - npm run build
  artifacts:
    paths:
      - dist/

deploy:
  stage: deploy
  script:
    - echo "Add your deployment command here"
  environment:
    name: production
  rules:
    - if: $CI_COMMIT_BRANCH == "main"
      when: on_success
```

---

### 2. Backend (Node.js / Python / Go / Java)

**Key stages**: Install → Lint → Test → Build → Docker Build → Deploy

#### GitHub Actions (Python example)

```yaml
name: Backend CI/CD

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

permissions:
  contents: read
  packages: write

jobs:
  ci:
    runs-on: ubuntu-22.04
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: testdb
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"
          cache: pip

      - run: pip install -r requirements.txt

      - run: ruff check .

      - run: pytest --cov --cov-report=xml
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/testdb

  docker:
    needs: ci
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    runs-on: ubuntu-22.04
    steps:
      - uses: actions/checkout@v4

      - uses: docker/setup-buildx-action@v3

      - uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: ghcr.io/${{ github.repository }}:${{ github.sha }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
```

#### GitLab CI (Python example)

```yaml
stages:
  - test
  - build
  - deploy

variables:
  PIP_CACHE_DIR: "$CI_PROJECT_DIR/.pip_cache"

default:
  image: python:3.12-slim

test:
  stage: test
  services:
    - postgres:16
  variables:
    POSTGRES_USER: test
    POSTGRES_PASSWORD: test
    POSTGRES_DB: testdb
    DATABASE_URL: postgresql://test:test@postgres:5432/testdb
  cache:
    key: pip
    paths:
      - .pip_cache/
  script:
    - pip install -r requirements.txt
    - ruff check .
    - pytest --cov --cov-report=xml
  artifacts:
    reports:
      coverage_report:
        coverage_format: cobertura
        path: coverage.xml

build-image:
  stage: build
  image: docker:24
  services:
    - docker:24-dind
  variables:
    DOCKER_TLS_CERTDIR: "/certs"
  script:
    - docker login -u $CI_REGISTRY_USER -p $CI_REGISTRY_PASSWORD $CI_REGISTRY
    - docker build -t $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA .
    - docker push $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA
  rules:
    - if: $CI_COMMIT_BRANCH == "main"

deploy:
  stage: deploy
  script:
    - echo "Add your deployment command here"
  environment:
    name: production
  rules:
    - if: $CI_COMMIT_BRANCH == "main"
      when: manual
```

---

### 3. Library / Package (npm / PyPI / Maven)

**Key stages**: Lint → Test (matrix) → Build → Publish

#### GitHub Actions (npm library example)

```yaml
name: Library CI/CD

on:
  push:
    branches: [main]
    tags: ["v*"]
  pull_request:
    branches: [main]

permissions:
  contents: read
  id-token: write

jobs:
  test:
    runs-on: ubuntu-22.04
    strategy:
      matrix:
        node-version: [18, 20, 22]
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: npm

      - run: npm ci
      - run: npm run lint
      - run: npm test

  publish:
    needs: test
    if: startsWith(github.ref, 'refs/tags/v')
    runs-on: ubuntu-22.04
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          registry-url: https://registry.npmjs.org
          cache: npm

      - run: npm ci
      - run: npm run build
      - run: npm publish --provenance --access public
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

#### GitLab CI (PyPI library example)

```yaml
stages:
  - test
  - publish

test:
  stage: test
  image: python:${PYTHON_VERSION}-slim
  parallel:
    matrix:
      - PYTHON_VERSION: ["3.10", "3.11", "3.12"]
  script:
    - pip install -e ".[dev]"
    - ruff check .
    - pytest

publish:
  stage: publish
  image: python:3.12-slim
  script:
    - pip install build twine
    - python -m build
    - twine upload dist/*
  variables:
    TWINE_USERNAME: __token__
    TWINE_PASSWORD: $PYPI_TOKEN
  rules:
    - if: $CI_COMMIT_TAG =~ /^v/
```

---

### 4. Fullstack (Frontend + Backend monorepo)

**Key stages**: Detect changes → Run affected pipelines → Integration test → Deploy

#### GitHub Actions

```yaml
name: Fullstack CI/CD

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

permissions:
  contents: read

jobs:
  changes:
    runs-on: ubuntu-22.04
    outputs:
      frontend: ${{ steps.filter.outputs.frontend }}
      backend: ${{ steps.filter.outputs.backend }}
    steps:
      - uses: actions/checkout@v4
      - uses: dorny/paths-filter@v3
        id: filter
        with:
          filters: |
            frontend:
              - 'frontend/**'
            backend:
              - 'backend/**'

  frontend:
    needs: changes
    if: needs.changes.outputs.frontend == 'true'
    runs-on: ubuntu-22.04
    defaults:
      run:
        working-directory: frontend
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
          cache-dependency-path: frontend/package-lock.json
      - run: npm ci
      - run: npm run lint
      - run: npm test
      - run: npm run build

  backend:
    needs: changes
    if: needs.changes.outputs.backend == 'true'
    runs-on: ubuntu-22.04
    defaults:
      run:
        working-directory: backend
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"
          cache: pip
          cache-dependency-path: backend/requirements.txt
      - run: pip install -r requirements.txt
      - run: ruff check .
      - run: pytest

  e2e:
    needs: [frontend, backend]
    if: always() && !cancelled() && !contains(needs.*.result, 'failure')
    runs-on: ubuntu-22.04
    steps:
      - uses: actions/checkout@v4
      - name: Run E2E tests
        run: echo "Add E2E test command (e.g., Playwright, Cypress)"
```

---

### 5. Monorepo (Turborepo / Nx / Lerna)

#### GitHub Actions (Turborepo example)

```yaml
name: Monorepo CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

permissions:
  contents: read

jobs:
  ci:
    runs-on: ubuntu-22.04
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 2

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - run: npm ci

      - run: npx turbo run lint test build --filter='...[HEAD^]'
        env:
          TURBO_TOKEN: ${{ secrets.TURBO_TOKEN }}
          TURBO_TEAM: ${{ vars.TURBO_TEAM }}
```

---

### 6. Mobile (React Native / Flutter)

#### GitHub Actions (React Native / Android example)

```yaml
name: Mobile CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

permissions:
  contents: read

jobs:
  test:
    runs-on: ubuntu-22.04
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - run: npm ci
      - run: npm run lint
      - run: npm test

  android-build:
    needs: test
    runs-on: ubuntu-22.04
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-java@v4
        with:
          distribution: temurin
          java-version: 17
          cache: gradle

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - run: npm ci

      - name: Build Android
        working-directory: android
        run: ./gradlew assembleRelease

      - uses: actions/upload-artifact@v4
        with:
          name: android-apk
          path: android/app/build/outputs/apk/release/*.apk
```

---

## Advanced Patterns

### Reusable Workflows (GitHub Actions)

Extract common CI logic into reusable workflows to reduce duplication across repositories:

```yaml
# .github/workflows/reusable-node-ci.yml
name: Reusable Node CI

on:
  workflow_call:
    inputs:
      node-version:
        type: string
        default: "20"
      working-directory:
        type: string
        default: "."

jobs:
  ci:
    runs-on: ubuntu-22.04
    defaults:
      run:
        working-directory: ${{ inputs.working-directory }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ inputs.node-version }}
          cache: npm
      - run: npm ci
      - run: npm run lint
      - run: npm test
      - run: npm run build
```

### GitLab CI Include Templates

```yaml
# Use shared templates to standardize pipelines across projects
include:
  - template: Security/SAST.gitlab-ci.yml
  - template: Security/Dependency-Scanning.gitlab-ci.yml
  - project: 'my-org/ci-templates'
    ref: main
    file: '/templates/node-ci.yml'
```

### Environment Protection Rules

- **GitHub**: Use environment protection rules with required reviewers for production deployments.
- **GitLab**: Use `when: manual` with `allow_failure: false` for gated deployments.

### Caching Strategy Summary

| Ecosystem  | Cache Key              | Cache Path                  |
|------------|------------------------|-----------------------------|
| Node (npm) | `package-lock.json`    | `~/.npm` or `node_modules/` |
| Python     | `requirements.txt`     | `~/.cache/pip`              |
| Go         | `go.sum`               | `~/go/pkg/mod`              |
| Java       | `build.gradle` / `pom.xml` | `~/.gradle/caches` / `~/.m2` |
| Rust       | `Cargo.lock`           | `~/.cargo` and `target/`    |

---

## Decision Guide: Which Template to Use

| Your project looks like…                        | Recommended template |
|-------------------------------------------------|----------------------|
| Single-page app, static site, or SSR frontend   | Frontend             |
| REST API, microservice, or server app            | Backend              |
| npm/PyPI/Maven package for others to install     | Library              |
| Frontend + backend in one repo                   | Fullstack            |
| Multiple packages managed by Turborepo/Nx/Lerna  | Monorepo             |
| React Native or Flutter app                      | Mobile               |
