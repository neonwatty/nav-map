# Nav Map CLI And Browser UX Audit

## Original Request

The user asked for a GoalBuddy prep board so three independent agents can audit the current CLI UX, especially for agent use, and also independently audit the browser UX with Codex Chrome and codebase review for screenshot, mockup, and app workflows.

## Interpreted Outcome

Create a structured audit-and-follow-up board that produces independent CLI/browser UX findings, synthesizes them into concrete simplification opportunities, and then executes only the highest-confidence improvements with durable manual-QA proof.

## Input Shape

Audit with likely follow-up implementation.

## Audience

Agents and humans using nav-map for manual QA across screenshot, mockup, and app datasets.

## Goal Oracle

The tranche is complete only when a final Judge/PM audit can point to:

- Three independent audit receipts covering CLI agent UX, browser workflow UX, and simplification/reorganization opportunities.
- A synthesis that ranks actionable changes by impact, confidence, risk, and verification strength.
- Implemented fixes for approved highest-confidence local improvements, or explicit blocked receipts for changes that require product decisions.
- Fresh verification receipts including CLI commands, local demo browser walkthroughs with Codex Chrome, and dataset coverage for screenshot, mockup, and app workflows.

## Non-Negotiable Constraints

- Do not inspect or print secrets, cookies, tokens, environment values, OAuth secrets, private keys, service-role keys, or Playwright/browser auth storage.
- Treat `.nav-map/auth/*.storage.json` and similar auth-state files as sensitive. Reference auth states only by id if needed.
- Keep app-specific workflow data in manifests, fixtures, screenshots, or docs. Do not hard-code PRcard, Deckchecker, Bleep, or other app behavior into nav-map core.
- Preserve existing route behavior unless a task explicitly proves and scopes a safe route-behavior change.
- Use Codex Chrome for the browser UX proof before claiming browser workflows work.
- Record receipts: commands run, routes/datasets tested, warnings, failures, screenshots or screen states observed, and known limitations.

## Likely Misfire

The goal could fail by producing generic UX opinions or implementation churn without proving that agents and humans can actually run the CLI/browser QA loop across screenshot, mockup, and app modes.

## Enough For This Tranche

Enough means the board has driven independent evidence gathering, produced a ranked decision, completed the highest-confidence cleanup slice that fits local constraints, and verified it with CLI checks plus a fresh Codex Chrome walkthrough.

## Starter Command

```text
/goal Follow docs/goals/nav-map-cli-browser-ux-audit/goal.md.
```
