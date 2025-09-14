AGENTS.md

This document is for automated agents and contributors working on this repository. It explains the repo layout, how to run the project, conventions to follow, and helpful notes for maintaining and extending the game.

**Repository Purpose**
- Hand‑poured coffee mini‑game built with HTML5 Canvas. Hold to pour water and try to land exactly on the target volume (default 250 ml). Works as a single‑page, fully static site with no backend.

**Tech Stack**
- HTML5 + Canvas API
- Vanilla JavaScript (no build step, no bundler)
- Plain CSS
- No runtime dependencies; optional local static server for development

**Project Structure**
- `index.html`: Page shell. Declares `<canvas id="game">`, links `styles.css`, and loads `main.js`. Includes viewport meta for responsive layout.
- `styles.css`: Base styles (full‑viewport canvas) and a `.sr-only` utility class.
- `main.js`: Game logic (state machine, input handling for mouse/touch/keyboard, animation loop via `requestAnimationFrame`, responsive canvas with device‑pixel‑ratio scaling, and all drawing).

Key areas in `main.js`:
- Game parameters: target volume and pour dynamics (e.g., `TARGET_ML`, `ACCEL`, `MAX_RATE`, `ROUND_TO`).
- Input: mouse (`mousedown`/`mouseup`), touch (`touchstart`/`touchend`), keyboard (`Space`).
- Rendering: `drawProgress`, `drawStage`, `drawHUD`, `drawStart`, `drawEnd`.
- Layout: `resize()` accounts for device pixel ratio (sharp rendering on HiDPI displays).

**Installation**
- Prerequisites: a modern browser (Chrome/Edge/Firefox/Safari). Node.js is optional if you want a local static server.
- No dependencies to install.

**Run Locally**
- Easiest: open `index.html` directly in your browser.
- Recommended (avoids any file:// quirks): serve the folder via a static server and open `http://localhost:5173`.
  - Node (npx): `npx serve -l 5173 .` or `npx http-server -p 5173 .`
  - Python 3: `python -m http.server 5173`

**Scripts**
- None configured in `package.json`. Use the commands above for a quick dev server if needed.

**Lint, Tests, and Formatting**
- Lint: not configured.
- Tests: none configured. If you add tests, place them under a new `tests/` directory and consider `vitest` or `jest`.
- Formatter: not configured. Prefer consistent 2‑space indentation, semicolons, and single quotes in JS to match existing code style.

**Environment Variables**
- None required.

**Workflow Guidance**
- Adjust gameplay:
  - Target volume and tuning: edit constants near the top of `main.js` (`TARGET_ML`, `ACCEL`, `MAX_RATE`, `ROUND_TO`).
  - Colors/theme: update the `COLORS` object in `main.js`.
  - Controls/help text: strings are drawn from `drawStart`/`drawHUD`/`drawEnd` in `main.js`.
- Rendering & performance:
  - Keep per‑frame allocations minimal inside the animation loop.
  - Heavy computations should run outside `draw()`/`update()` where possible.
- Responsiveness:
  - `resize()` recalculates canvas size and UI layout; call it if layout‑related code changes.
- Assets:
  - The game currently uses only programmatic drawing (no images). If you add images, prefer lightweight assets and avoid large binary files.

**Code Style**
- Modules: none; code runs as a single `<script>` file.
- Language level: modern DOM APIs, ES features without modules.
- JS: 2 spaces, single quotes, semicolons, small focused functions.
- CSS: keep selectors simple; colors live in JS `COLORS` for drawing.
- Comments: keep concise; update function comments when changing behavior.

**Commit & PR Guidelines**
- Commits: Conventional Commits are preferred.
  - Examples: `feat(game): add combo bonus`, `fix(draw): correct DPR scaling`, `chore: tweak colors`.
- PRs:
  - Title: clear and scoped (feat/fix/chore/docs/refactor).
  - Description: what changed and why; include before/after screenshots if visual.
  - Verification: how you tested locally (browser + steps to reproduce).
  - Risk/impact and rollback plan (if applicable).

**Security & Secrets**
- No secrets or keys are used by this project. Do not commit any private files or credentials.

**CI / Automation**
- None configured. If you add CI, basic jobs can: serve or build (if you later add a build step) and optionally run lint/tests if introduced.

**Language/Framework Notes**
- Canvas: uses device pixel ratio scaling to render sharply on HiDPI screens.
- Input: supports mouse, touch, and spacebar. Holding increases pour rate up to a cap.
- Game state: simple finite state machine (start → play → end) with restart.

**Do Not Modify**
- Do not introduce heavy dependencies or bundlers unless necessary for a specific feature.
- Do not commit large binary assets; keep the repo lightweight and static.

**Subprojects / Monorepo**
- Single‑package static site. No subprojects.

**Troubleshooting**
- Blank screen: open DevTools Console for errors; ensure the browser supports Canvas and modern JS.
- Garbled Chinese text: ensure files are saved as UTF‑8 and `<meta charset="utf-8">` is present (it is in `index.html`).
- Canvas looks blurry: verify DPR scaling in `resize()` and that CSS sets the canvas to full viewport size.
- Input not responding: confirm events are attached (mouse/touch on canvas, keyboard on window) and no overlays block the canvas.

