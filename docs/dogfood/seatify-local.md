# Seatify Local Dogfood

This receipt documents the bundled `seatify-local` demo dataset. It is intentionally signed-out and
read-only: do not inspect auth storage, cookies, tokens, environment values, or private user data.

## Dataset

- Demo key: `seatify-local`
- Graph: `packages/demo/public/seatify-local.nav-map.json`
- Screenshots: `packages/demo/public/screenshots/seatify-local/*.png`
- Seatify source app: `/Users/neonwatty/Desktop/seatify`
- Expected app base URL: `http://localhost:3002`

## Captured Routes

Screenshots were captured from a running Seatify dev server at `http://localhost:3002`:

- `/`
- `/how-it-works`
- `/pricing`
- `/free-rsvp`
- `/demo-lab`
- `/login`
- `/signup`

Additional route probes were run for redirect and legal context:

- `/demo` redirected to `/demo-lab`
- `/dashboard` redirected to `/login?redirect=%2Fdashboard`
- `/dashboard/new` redirected to `/login?redirect=%2Fdashboard%2Fnew`
- `/privacy`
- `/terms`

## Reproduce

Start Seatify:

```bash
cd /Users/neonwatty/Desktop/seatify
npm run dev -- -p 3002
```

Start the nav-map demo in a second terminal:

```bash
cd /Users/neonwatty/Desktop/nav-map-fresh
pnpm --filter demo dev --port 3001
```

Open:

```text
http://localhost:3001/?dataset=seatify-local
```

Run the browser smoke with the Seatify reachability assertion:

```bash
SEATIFY_LOCAL_EXPECT_REACHABLE=1 pnpm smoke:demo --url http://localhost:3001
```

## Known Limitation

Seatify sends `X-Frame-Options: SAMEORIGIN`. Because the nav-map demo and Seatify run on different
local ports, Target preflight can prove the route responds but may label it `Unverified External`
instead of rendering a verified live iframe. That is expected for this dogfood fixture and should be
visible in the node details UX.
