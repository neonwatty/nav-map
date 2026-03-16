# Development Tooling Setup Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add ESLint, Prettier, Knip, commitlint, Husky, semantic-release, and CI/CD to the nav-map monorepo, matching the bleep app's best practices.

**Architecture:** Root-level configs for shared tooling (prettier, commitlint, husky). Per-package ESLint configs (core uses React rules, scanner uses Node rules). Knip configured with monorepo entry points. GitHub Actions CI runs all checks in parallel. Semantic-release publishes both npm packages on main push.

**Tech Stack:** ESLint 9, Prettier, Knip, commitlint, Husky, semantic-release, GitHub Actions

**Reference:** Bleep app tooling at `/Users/jeremywatt/Desktop/bleep-that-shit/`

---

## File Structure

| File | Responsibility | Action |
|------|---------------|--------|
| `.prettierrc` | Formatting rules (shared) | Create |
| `.prettierignore` | Files to skip formatting | Create |
| `.eslintrc.json` | Root ESLint config | Create |
| `packages/core/.eslintrc.json` | Core package ESLint (React) | Create |
| `packages/scanner/.eslintrc.json` | Scanner package ESLint (Node) | Create |
| `knip.json` | Unused code detection config | Create |
| `commitlint.config.cjs` | Conventional commit rules | Create |
| `.husky/pre-commit` | Pre-commit hook (lint + typecheck) | Create |
| `.husky/commit-msg` | Commit message validation | Create |
| `.releaserc.json` | Semantic release config (npm publish) | Create |
| `.github/workflows/ci.yml` | CI pipeline | Create |
| `package.json` | Root scripts (validate, lint, format, typecheck, knip) | Modify |
| `packages/core/package.json` | Add lint/format scripts | Modify |
| `packages/scanner/package.json` | Add lint/format scripts | Modify |

---

## Task 1: Prettier

**Files:**
- Create: `.prettierrc`, `.prettierignore`
- Modify: `package.json` (root)

- [ ] **Step 1: Install prettier**

Run: `cd /Users/jeremywatt/Desktop/nav-map && pnpm add -Dw prettier`

- [ ] **Step 2: Create `.prettierrc`**

```json
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "useTabs": false,
  "trailingComma": "es5",
  "printWidth": 100,
  "arrowParens": "avoid",
  "endOfLine": "lf"
}
```

- [ ] **Step 3: Create `.prettierignore`**

```
node_modules/
dist/
.next/
pnpm-lock.yaml
*.md
```

- [ ] **Step 4: Add root scripts**

In root `package.json`, add to scripts:
```json
"format": "prettier --write \"**/*.{js,jsx,ts,tsx,json,css}\"",
"format:check": "prettier --check \"**/*.{js,jsx,ts,tsx,json,css}\""
```

- [ ] **Step 5: Run formatter to establish baseline**

Run: `pnpm format`
This will reformat existing files to match the config. Commit as a formatting-only commit.

- [ ] **Step 6: Commit**

```bash
git add .prettierrc .prettierignore package.json
git commit -m "chore: add prettier config and format scripts"
git add -A
git commit -m "style: format codebase with prettier"
```

---

## Task 2: ESLint

**Files:**
- Create: `.eslintrc.json`, `packages/core/.eslintrc.json`, `packages/scanner/.eslintrc.json`
- Modify: `package.json` (root), `packages/core/package.json`, `packages/scanner/package.json`

- [ ] **Step 1: Install ESLint + plugins**

Run:
```bash
cd /Users/jeremywatt/Desktop/nav-map && pnpm add -Dw \
  eslint \
  @typescript-eslint/eslint-plugin \
  @typescript-eslint/parser \
  eslint-config-prettier \
  eslint-plugin-prettier \
  eslint-plugin-react \
  eslint-plugin-react-hooks
```

- [ ] **Step 2: Create root `.eslintrc.json`**

```json
{
  "root": true,
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:prettier/recommended"
  ],
  "parser": "@typescript-eslint/parser",
  "parserOptions": {
    "ecmaVersion": 2020,
    "sourceType": "module"
  },
  "plugins": ["@typescript-eslint", "prettier"],
  "rules": {
    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/no-unused-vars": ["warn", { "argsIgnorePattern": "^_", "varsIgnorePattern": "^_" }],
    "no-console": "warn",
    "prettier/prettier": "error"
  },
  "ignorePatterns": ["node_modules/", "dist/", ".next/", "*.config.js", "*.config.ts", "*.config.cjs"]
}
```

- [ ] **Step 3: Create `packages/core/.eslintrc.json`** (React-specific)

```json
{
  "extends": ["../../.eslintrc.json", "plugin:react/recommended", "plugin:react-hooks/recommended"],
  "plugins": ["react", "react-hooks"],
  "settings": {
    "react": { "version": "detect" }
  },
  "rules": {
    "react/react-in-jsx-scope": "off",
    "react/prop-types": "off"
  }
}
```

- [ ] **Step 4: Create `packages/scanner/.eslintrc.json`** (Node-specific)

```json
{
  "extends": ["../../.eslintrc.json"],
  "env": { "node": true },
  "rules": {
    "no-console": "off"
  }
}
```

- [ ] **Step 5: Add lint scripts**

Root `package.json`:
```json
"lint": "ESLINT_USE_FLAT_CONFIG=false eslint packages/*/src/ --ext .ts,.tsx",
"lint:fix": "ESLINT_USE_FLAT_CONFIG=false eslint packages/*/src/ --ext .ts,.tsx --fix"
```

`packages/core/package.json` — update existing lint script:
```json
"lint": "ESLINT_USE_FLAT_CONFIG=false eslint src/ --ext .ts,.tsx"
```

`packages/scanner/package.json` — add lint script:
```json
"lint": "ESLINT_USE_FLAT_CONFIG=false eslint src/ --ext .ts,.tsx"
```

- [ ] **Step 6: Run lint and fix auto-fixable issues**

Run: `pnpm lint:fix`
Fix any remaining issues manually.

- [ ] **Step 7: Commit**

```bash
git add .eslintrc.json packages/core/.eslintrc.json packages/scanner/.eslintrc.json package.json packages/core/package.json packages/scanner/package.json
git commit -m "chore: add eslint config with typescript and prettier integration"
```

---

## Task 3: Knip

**Files:**
- Create: `knip.json`

- [ ] **Step 1: Install knip**

Run: `cd /Users/jeremywatt/Desktop/nav-map && pnpm add -Dw knip`

- [ ] **Step 2: Create `knip.json`**

```json
{
  "$schema": "https://unpkg.com/knip@5/schema.json",
  "workspaces": {
    "packages/core": {
      "entry": ["src/index.ts"],
      "project": ["src/**/*.{ts,tsx}"],
      "ignoreDependencies": ["@xyflow/react", "elkjs", "d3-hierarchy", "d3-shape", "html2canvas"]
    },
    "packages/scanner": {
      "entry": ["src/index.ts", "src/cli.ts", "src/reporter.ts"],
      "project": ["src/**/*.ts"],
      "ignoreDependencies": ["playwright", "sharp", "ts-morph", "adm-zip"]
    },
    "packages/demo": {
      "entry": ["app/**/{layout,page}.tsx"],
      "project": ["app/**/*.{ts,tsx}"],
      "ignoreDependencies": ["@neonwatty/nav-map"]
    }
  },
  "ignoreExportsUsedInFile": { "interface": true, "type": true }
}
```

- [ ] **Step 3: Add knip scripts to root package.json**

```json
"knip": "knip",
"knip:production": "knip --production"
```

- [ ] **Step 4: Run knip and fix any real issues**

Run: `pnpm knip`
Review output. Fix genuine unused exports/deps. Add false positives to `ignoreDependencies`.

- [ ] **Step 5: Commit**

```bash
git add knip.json package.json
git commit -m "chore: add knip config for unused code detection"
```

---

## Task 4: Commitlint + Husky

**Files:**
- Create: `commitlint.config.cjs`, `.husky/pre-commit`, `.husky/commit-msg`

- [ ] **Step 1: Install commitlint + husky**

Run:
```bash
cd /Users/jeremywatt/Desktop/nav-map && pnpm add -Dw \
  @commitlint/cli \
  @commitlint/config-conventional \
  husky
```

- [ ] **Step 2: Create `commitlint.config.cjs`**

```javascript
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      ['feat', 'fix', 'perf', 'security', 'docs', 'test', 'chore', 'refactor', 'ci', 'style']
    ]
  }
};
```

- [ ] **Step 3: Initialize husky**

Run: `cd /Users/jeremywatt/Desktop/nav-map && npx husky init`

- [ ] **Step 4: Create `.husky/pre-commit`**

```bash
pnpm lint && pnpm typecheck
```

- [ ] **Step 5: Create `.husky/commit-msg`**

```bash
npx --no -- commitlint --edit $1
```

- [ ] **Step 6: Add prepare script to root package.json**

```json
"prepare": "husky"
```

- [ ] **Step 7: Commit**

```bash
git add commitlint.config.cjs .husky/ package.json
git commit -m "chore: add commitlint and husky pre-commit hooks"
```

---

## Task 5: Semantic Release

**Files:**
- Create: `.releaserc.json`

- [ ] **Step 1: Install semantic-release**

Run:
```bash
cd /Users/jeremywatt/Desktop/nav-map && pnpm add -Dw \
  semantic-release \
  @semantic-release/commit-analyzer \
  @semantic-release/release-notes-generator \
  @semantic-release/github \
  @semantic-release/npm
```

- [ ] **Step 2: Create `.releaserc.json`**

```json
{
  "branches": ["main"],
  "plugins": [
    "@semantic-release/commit-analyzer",
    "@semantic-release/release-notes-generator",
    "@semantic-release/npm",
    "@semantic-release/github"
  ]
}
```

Note: npm publish will require `NPM_TOKEN` in GitHub Actions secrets. For now just configure the release pipeline — actual publishing can be enabled later.

- [ ] **Step 3: Commit**

```bash
git add .releaserc.json package.json
git commit -m "chore: add semantic-release config for automated versioning"
```

---

## Task 6: CI/CD Pipeline

**Files:**
- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: Create `.github/workflows/ci.yml`**

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  quality-checks:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 10
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - name: Lint
        run: pnpm lint
      - name: Format check
        run: pnpm format:check
      - name: Typecheck
        run: pnpm typecheck
      - name: Knip
        run: pnpm knip:production

  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 10
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - name: Build core
        run: pnpm --filter @neonwatty/nav-map build
      - name: Build scanner
        run: pnpm --filter @neonwatty/nav-map-scanner build
      - name: Build demo
        run: pnpm --filter demo build

  release:
    needs: [quality-checks, build]
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    runs-on: ubuntu-latest
    permissions:
      contents: write
      issues: write
      pull-requests: write
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: pnpm/action-setup@v4
        with:
          version: 10
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm --filter @neonwatty/nav-map build
      - name: Release
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: npx semantic-release
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: add GitHub Actions pipeline with lint, typecheck, knip, build, release"
```

---

## Task 7: Root validate script + final wiring

**Files:**
- Modify: `package.json` (root)

- [ ] **Step 1: Add validate and typecheck scripts**

In root `package.json`, add/update scripts:
```json
"typecheck": "pnpm -r typecheck",
"validate": "pnpm lint && pnpm format:check && pnpm typecheck && pnpm knip:production && pnpm build"
```

The `packages/scanner/package.json` needs a typecheck script too:
```json
"typecheck": "tsc --noEmit"
```

- [ ] **Step 2: Run full validate**

Run: `pnpm validate`
Fix any issues that surface.

- [ ] **Step 3: Commit and push**

```bash
git add package.json packages/scanner/package.json
git commit -m "chore: add validate script and wire up typecheck across workspace"
git push origin feat/auth-e2e-recording
```
