# Landing Page Deployment

The `landing-page` branch is the package-site branch for NavMap. It must keep:

- `/` as the package/product landing page.
- `/demo` as the interactive workflow atlas demo.
- Root dataset URLs such as `/?dataset=prcard` redirecting to `/demo?dataset=prcard`.

## Current Vercel State

As of June 25, 2026:

- GitHub CI protects `landing-page` with `quality-checks`, `build`, `scanner-browser-crawl`, `landing-page-deployed-smoke`, and `Vercel`.
- Vercel Production branch tracking is set to `landing-page`.
- The public production URL `https://nav-map.vercel.app/` is the package-site smoke target.
- GitHub repository variable `LANDING_PAGE_URL` is configured to `https://nav-map.vercel.app/`.
- The conventional branch alias `https://nav-map-git-landing-page-jermwatts-projects.vercel.app/` is still a protected Preview deployment and should not be used as the default deployed-smoke target.
- GitHub repository secret `VERCEL_AUTOMATION_BYPASS_SECRET` is only needed when a protected Preview URL is used for deployed smoke.

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

## Maintenance Flow

Use this flow for landing page changes:

1. Start from the remote package-site branch:

   ```bash
   git fetch origin landing-page
   git switch -c codex/landing-page-change origin/landing-page
   ```

2. Edit landing assets in `landing/` and demo/package-site behavior in `packages/demo/`.
3. Run focused local checks before opening a PR:

   ```bash
   pnpm format:check
   pnpm lint
   pnpm typecheck
   pnpm --filter demo build
   ```

4. Open the PR against `landing-page`, not `main`.
5. Wait for the required PR checks:
   - `quality-checks`
   - `build`
   - `scanner-browser-crawl`
   - `Vercel`
6. Merge only after the PR checks are green.
7. Watch the post-merge `landing-page` push run and confirm `landing-page-deployed-smoke` passes.

The production page is healthy when the `landing-page` branch has a green CI run with:

- `quality-checks`
- `build`
- `scanner-browser-crawl`
- `landing-page-deployed-smoke`
- `Vercel`

Also verify the public page returns `200`:

```bash
curl -fsSI https://nav-map.vercel.app/
```

## Troubleshooting

- If `landing-page-deployed-smoke` is skipped on a push to `landing-page`, confirm `LANDING_PAGE_URL` is set.
- If deployed smoke redirects too many times, confirm the smoke target is the public production URL or that the Vercel bypass secret matches the currently deployed protected Preview URL.
- If browser jobs fail before tests run, keep them on the official Playwright container that matches the package Playwright version.
- If local `landing-page` diverges from `origin/landing-page`, preserve any local-only commit on an archive branch before aligning the local branch to the remote.

## Manual Verification

Run the deployed smoke manually with:

```bash
LANDING_SMOKE_URL=https://your-landing-url.example pnpm smoke:landing
```

For protected Vercel deployments:

```bash
VERCEL_AUTOMATION_BYPASS_SECRET=... LANDING_SMOKE_URL=https://your-landing-url.example pnpm smoke:landing
```
