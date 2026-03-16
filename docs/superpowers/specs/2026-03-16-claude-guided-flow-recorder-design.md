# Claude-Guided Flow Recorder Design

## Status: Draft — to be fleshed out later

## Problem

Creating named user flows for the nav-map currently requires either hand-crafting JSON or running pre-written E2E tests. Neither approach supports exploratory, conversational flow discovery — where a user describes a journey in natural language and walks through it interactively.

## Idea

A Claude Code plugin (slash command or skill) that uses browser automation to drive through a production app, recording each page visited as a flow step. The user describes the journey they want to trace, and Claude navigates the app step by step — clicking CTAs, filling forms, handling auth — while capturing screenshots and recording the path.

### Example Usage

```
/nav-map record-flow "New User Signup"
```

Claude would:
1. Open the production app in Chrome
2. Start at the landing page
3. Navigate through the signup journey, asking the user for guidance when needed
4. Output a named flow: `{ "name": "New User Signup", "steps": ["home", "bleep", "signup", "studio"] }`
5. Save screenshots at each step

### Key Capabilities

**Browser automation options:**
- **Claude in Chrome MCP** — for interacting with the user's actual Chrome browser (can reuse existing auth sessions)
- **Playwright MCP** — for headless automation (better for CI or when Chrome isn't available)

Either tool can be used. Claude in Chrome has the advantage of working with the user's existing logged-in session. Playwright MCP has the advantage of clean isolation and reproducibility.

**Conversational loop:**
- Claude navigates and reports what it sees: "I'm on the Home page. I see a 'Start Bleeping' CTA and a 'Sign Up' link. Which path should I take?"
- User directs: "Click Start Bleeping"
- Claude clicks, captures screenshot, records the transition, reports the new page
- If Claude gets stuck (CAPTCHA, unexpected state), it asks for help
- User can say "go back" or "try the other path" to explore alternatives

**Codebase awareness (optional):**
- If the user has the repo locally, Claude can read the route structure to know what pages exist
- This helps Claude make smarter navigation choices ("I know /premium exists from the codebase, but I don't see a link to it on this page — should I navigate directly?")
- Without codebase access, Claude discovers pages purely by exploring the live app

**Auth handling:**
- Claude in Chrome: can use the user's existing authenticated browser session
- Playwright MCP: would need the `auth.json` storageState from the `nav-map auth` command
- Claude can also log in interactively if needed ("I see a login form. Should I use test credentials?")

### Output

The recorded flow is appended to the existing `nav-map.json`:

```json
{
  "flows": [
    {
      "name": "New User Signup",
      "steps": ["home", "bleep", "signup", "studio"],
      "recordedBy": "claude-guided",
      "recordedAt": "2026-03-16T12:00:00Z"
    }
  ]
}
```

Screenshots are saved to the screenshot directory, one per step.

### Implementation Shape

This would likely be a Claude Code plugin with:
- A slash command (`/nav-map record-flow <name>`)
- A skill that orchestrates the browser automation loop
- Integration with both Claude in Chrome and Playwright MCP tools
- Logic to match observed URLs against known route patterns (from static scan) for dedup

### Open Questions

- Should the recorder also generate edges with labels (e.g., "clicked 'Start Bleeping' button") or just page-to-page transitions?
- How to handle SPAs where URL doesn't change but the view does (modal dialogs, tab switches)?
- Should multiple flows be recordable in a single session, or one at a time?
- How to handle branching — user says "now show me what happens if I click Cancel instead"?

## Next Steps

Flesh out this spec after the current visualization work is complete. Key decisions to make:
1. Plugin structure (slash command vs. skill vs. both)
2. Primary browser tool (Claude in Chrome vs. Playwright MCP vs. user's choice)
3. Codebase integration depth (required vs. optional)
