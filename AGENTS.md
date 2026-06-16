# Agent Instructions

## Local Web Service Verification

When the user asks to start, restart, spin up, or otherwise create a local web service, verify that it is operational before reporting the URL.

- Whenever handing the user a localhost, 127.0.0.1, LAN, preview, or other local web-service URL to review, verify it is active immediately before the handoff. Do not rely on a previous successful check or an earlier server session still being alive.
- Before showing the user any local server URL, use the Codex Chrome Extension or available browser automation to load the exact URL and personally confirm the page renders correctly.
- Use simple HTTP checks such as `curl` to confirm the expected local URL returns a successful response.
- Also open the local URL in a browser and confirm the page renders without framework/runtime errors.
- If the app shows a Next.js, Vite, framework, bundler, or runtime error, resolve that error before telling the user the service is ready or asking them to review it.
- When running production builds or smoke tests for a Next.js app, do not leave `next dev` running against the same `.next` directory. Stop the dev server first, run the verification, then restart dev cleanly if the user needs the local app open.

## Nav Map Workflow Atlas Work

- Keep app-specific workflow data in manifests, fixtures, screenshots, or docs. Do not hard-code PRcard, Deckchecker, or other app behavior into nav-map core.
- Treat `.nav-map/auth/*.storage.json` and similar Playwright auth-state files as sensitive. Do not inspect, print, commit, or summarize cookie, token, localStorage, or session contents.
- Do not print secrets, cookies, tokens, passwords, OAuth values, webhook secrets, private keys, Supabase service-role keys, or raw environment values.
- Prefer reusable primitives for workflow maps: personas, auth states, route variables, route expectations, health checks, screenshot receipts, and agent-readable context outputs.
- When changing scanner or manifest behavior, add or update focused tests and run the relevant package test command before reporting completion.
- Record receipts for workflow verification: commands run, routes tested, screenshots captured, auth state used by id only, failures, warnings, and known limitations.
