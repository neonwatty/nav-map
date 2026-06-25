# Landing Page Deployment

The `landing-page` branch is the package-site branch for NavMap. It must keep:

- `/` as the package/product landing page.
- `/demo` as the interactive workflow atlas demo.
- Root dataset URLs such as `/?dataset=prcard` redirecting to `/demo?dataset=prcard`.

## Current Vercel State

As of June 25, 2026:

- GitHub CI protects `landing-page` with `quality-checks`, `build`, and `scanner-browser-crawl`.
- The Vercel GitHub status reports successful deployments, but the status target is a Vercel dashboard URL rather than the public app URL.
- The conventional branch alias `https://nav-map-git-landing-page-jermwatts-projects.vercel.app/` exists but returns Vercel Authentication (`401`) without an automation bypass.
- The public production URL `https://nav-map.vercel.app/` still serves the old root demo, so production is not yet pointed at `landing-page`.
- GitHub repository variable `LANDING_PAGE_URL` is configured to the protected branch alias.
- GitHub repository secret `VERCEL_AUTOMATION_BYPASS_SECRET` is configured so deployed smoke can bypass Vercel protection.

## Required Vercel Setup

In the Vercel dashboard, configure one of these supported targets:

1. Make `landing-page` the production branch for the package site domain.
2. Keep it as a protected branch deployment and set a stable branch URL for CI smoke.

Then configure GitHub:

- Repository variable `LANDING_PAGE_URL`: the deployed URL that should serve the landing page.
- Repository secret `VERCEL_AUTOMATION_BYPASS_SECRET`: required only when the configured URL is protected by Vercel Authentication or other Deployment Protection.

The `landing-page-deployed-smoke` CI job uses `pnpm smoke:landing` against `LANDING_PAGE_URL` after `quality-checks`, `build`, and `scanner-browser-crawl` pass on a push to `landing-page`. When a bypass secret is present, the smoke script sends Vercel's `x-vercel-protection-bypass` header and `x-vercel-set-bypass-cookie: true` for browser checks.

If `LANDING_PAGE_URL` is not configured, the deployed smoke job is skipped. This keeps branch protection usable until the Vercel production branch or branch URL is intentionally configured.

When the Vercel automation bypass secret is regenerated, redeploy `landing-page` before rerunning the deployed smoke job so the protected branch deployment recognizes the current bypass token.

## Manual Verification

Run the deployed smoke manually with:

```bash
LANDING_SMOKE_URL=https://your-landing-url.example pnpm smoke:landing
```

For protected Vercel deployments:

```bash
VERCEL_AUTOMATION_BYPASS_SECRET=... LANDING_SMOKE_URL=https://your-landing-url.example pnpm smoke:landing
```
