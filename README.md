# Another HTML5 Slot Machine Game Demo

A browser-based slot machine demo built with **Pixi.js v8**, **TypeScript**, **GSAP**, and **Spine** skeletal animations. The project showcases reel spinning mechanics, server-driven outcomes, an explicit spin phase machine, wallet persistence, HUD controls, win/lose feedback, ambient audio, and a scene-based loading flow.

## Features

- **Three independent reels** — per-reel `maxSpeed`, acceleration, adaptive braking (~40 normalized frames to the payline), micro-bounce settle (CLICKED → FINALADJUST), and exact symbol alignment via `adjustSymbolsPos`
- **Mock game server** — init/spin API with Zod-validated contracts; symbol outcomes, paytable evaluation, and wallet settlement run server-side (no client-side cheat logic on the final design path)
- **Spin identity (`spinId`)** — client issues a round id per spin; mock echoes it; mismatched responses are discarded (stale-response / idempotency pattern)
- **Game phase machine** — explicit `IDLE` → `SPINNING` → `SETTLING` → `IDLE` (and `ERROR`) instead of ad-hoc busy flags; lever input only in `IDLE`
- **Error recovery UX** — init/spin failures show a blocking HUD modal; spin failure emergency-stops reels and rolls back optimistic bet debit; init can be retried, then reels re-bind via catalog `reinitScene`
- **Wallet persistence** — balance stored in `localStorage` with `lastTransactionIndex` for stale snapshot rejection
- **Balance presenter** — phased HUD updates: debit on spin start, hold server result during reel animation, reveal after all reels stop
- **HUD** — balance display with animated debit/credit, bet controls (+/−), fullscreen / sound / info / coins buttons, build version label; modal info window (portfolio text, GitHub & LinkedIn links); error modal; balance hint popup on coins button
- **Scene catalog** — entries map scene id → asset bundle → optional `gameId`; `createScene` / `reinitScene` pass server `symbolIds` (atlas order) and `symbols` (3×3 window)
- **Spine animations** — owl character reactions and coin burst particles on win
- **Layered audio** — separate music, ambience, and SFX buses via `@pixi/sound`; per-reel spin sounds with staggered stop clicks
- **Scene flow** — preload splash → loading screen with progress bar → main game, with GSAP fade transitions
- **UI button feedback** — `UIButton` with pluggable decorations (`HighlightDecoration`: hover highlight, press tint, elastic tap)
- **Input** — pull the lever (click) or press **Space** / **Enter**; **Esc** closes the top modal (info or error); lever hotkeys are blocked while a modal is open
- **Viewport scaling** — fixed 800×600 design scaled via `app.stage` (letterbox, aspect ratio preserved); DPR sync; `resize` / `orientationchange` / `visualViewport` / `fullscreenchange` listeners
- **Fullscreen** — HUD button or **F** key (`requestFullscreen` where supported; itch.io embed uses the same scaling inside its iframe)

## Tech Stack

| | |
|---|---|
| Engine | [Pixi.js](https://pixijs.com/) v8 |
| Language | TypeScript (strict) |
| Animation | Spine (`@esotericsoftware/spine-pixi-v8`), [GSAP](https://gsap.com/) v3 + PixiPlugin |
| Audio | `@pixi/sound` |
| Validation | [Zod](https://zod.dev/) (API contracts) |
| Bundler | Webpack 5 |

## Requirements

- **Node.js** 18+ (22 recommended)
- **npm** 9+

## Quick Start

```bash
# Install dependencies
npm install

# Start the development server
npm start
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

Webpack dev server runs with hot reload on port **3000** (`host: 0.0.0.0`). After `npm start`, the terminal prints a **Network** URL (e.g. `http://192.168.x.x:3000/`) for testing on a phone over the same Wi‑Fi.

### Production Build

```bash
npm run build
```

Output is written to `dist/` (HTML, `bundle.js`, copied assets, and `BUILD.txt` with version metadata).

For itch.io uploads, use the dedicated build command (see [Versioning & Releases](#versioning--releases)).

### Docker

```bash
# Build the image
docker build -t slot-game-demo .

# Run the container (game available at http://localhost:8080)
docker run --rm -p 8080:80 slot-game-demo
```

## Project Structure

```
src/
├── index.ts                      # App bootstrap, scene loading, spin flow orchestration
├── version.ts                      # Build label formatting for HUD and console
├── assets/                         # Images, sounds, Spine data, asset manifest
├── components/
│   ├── reel.ts, coin.ts            # Reel stop physics and coin particles
│   ├── ui-button.ts                # Interactive UI button (Decoratable)
│   ├── debounced-tap.ts            # Shared pointertap debounce helper
│   ├── highlight-decoration.ts     # Hover / press / tap GSAP effects
│   └── spine-display.ts            # Spine animation wrapper
├── content/
│   └── info-window-content.ts      # Info modal copy and external links
├── debug/
│   └── debug-hud-panel.ts          # On-screen debug log panel (dev)
├── game/
│   ├── game-state.ts               # Spin / interaction phase machine (IDLE / SPINNING / …)
│   ├── slot-game-interface.ts      # IInitResponse, ISpinResponse, Zod schemas
│   ├── slot-machine-client.ts      # Client wrapper around mock server (+ spinId guard)
│   ├── pay-client.ts               # External wallet credit (mock pay service)
│   └── server/
│       ├── mock-slot-server.ts     # Init / spin handlers
│       ├── mock-persistence.ts     # Wallet ledger + session store (localStorage)
│       ├── game-definition.ts      # GameDefinition interface
│       └── games/                  # Per-game rules (slot_reels_3x3, slot_bar, …)
├── hud/
│   ├── game-hud.ts                 # HUD layout, bet/balance controls, popups
│   ├── hud-modal.ts                # Reusable modal (backdrop, 9-slice panel, OK)
│   ├── error-modal-content.ts      # Error dialog copy layout
│   ├── info-window-content-view.ts # Info modal text layout and link hit areas
│   └── balance-presenter.ts        # Wallet display logic (debit / reveal / credit / fail)
├── managers/
│   ├── debug.ts                    # Dev-only log buffer (feeds debug HUD panel)
│   ├── scenes-catalog.ts           # Scene entries, createScene / reinitScene
│   └── sound-manager.ts            # Audio buses and playback
└── scenes/                         # Preload, Loading, MainGame scenes
```

## How to Play

1. Wait for assets to load (and for server init; on failure, dismiss the error modal to retry).
2. Adjust bet with **+** / **−** (within server `maxBet`).
3. Click the lever or press **Space** / **Enter** to spin.
4. Reels stop one by one; a win triggers a coin spray and owl celebration.
5. Use the sound button to toggle audio; the leftmost HUD button (or **F**) toggles fullscreen.
6. **Info** button — opens a modal about the demo (tech stack, GitHub & LinkedIn links); click outside, **OK**, or **Esc** to close.
7. **Coins** button — toggles a short balance hint popup above the HUD.
8. Balance persists across page reloads (mock wallet in `localStorage`).

**Dev / QA failure hooks:** `?failInit=1` or `?failSpin=1` in the URL arms a one-shot mock failure; in-game press **X** to arm the next spin failure.

## Development Notes

- Assets are loaded through Pixi `Assets` bundles defined in `src/assets/manifest.json`.
- Webpack aliases `pixi.js` to a single ESM entry point so Spine and the app share one Pixi instance.
- **Scene creation:** `loadGameScene` loads assets and server init in parallel, then `createGameScene` passes `symbolKeys` / `symbolMatrix` to the catalog factory. If init failed, the main scene still opens; `recoverInitConnection` shows an error modal with retry, then `reinitScene` updates reel symbols and re-binds the lever.
- **Spin flow:** `GameState` must be `IDLE` → balance check → `SPINNING` → debit (`BalancePresenter.onSpinStarted`) → `fetchSpin` (with `spinId`) → on success `SETTLING` and stop reels on payline symbol `result.symbols[reelIndex][1]` → reveal (`onReelsStopped`) → `IDLE`. On failure: `ERROR`, `emergencyStop`, wallet rollback (`onSpinFailed`), error modal, then `IDLE` for retry.
- **Reel stop (`src/components/reel.ts`):** `stopSpin()` fixes the remaining path `wayToStop` to the target symbol. During `STOPPING`, speed follows an adaptive curve: `idealSpeed = wayToStop / framesLeft`, smoothed with lerp and **never increased** (deceleration only). Braking budget uses `stopFramesCount += deltaTime` (~40 frames at `dt = 1`). On overshoot, `adjustSymbolsPos` snaps the strip so the stop symbol lands on the payline; `CLICKED` / `FINALADJUST` run a short micro-bounce. `deltaTime` is capped at `2` per frame to limit visible jumps on mobile lag spikes. Hot-path `update()` iterates a cached `values[]` sprite array (no per-frame allocations). `forceStop()` / scene `emergencyStop()` snap reels when a spin fails mid-flight.
- **HUD modals (`src/hud/`):** the **info** button opens `HudModal` — dimmed backdrop, 9-slice `panel-window`, portfolio copy from `content/info-window-content.ts`, clickable GitHub/LinkedIn links, and an **OK** button (`button-ok` texture). Init/spin errors use the same modal shell with `error-modal-content.ts`. **Esc** and backdrop click close the top modal; **Space** / **Enter** do not trigger a spin while a modal is open. The **coins** button toggles a lightweight balance hint popup (no modal backdrop). A `DebugHudPanel` lives in `src/debug/` and can be re-wired to the info button during development; `managers/debug.ts` feeds its log buffer.
- **Mobile testing:** use the Network URL from `npm start` to open the game on a phone over the same Wi‑Fi.
- **Viewport / fullscreen (`index.ts`, `src/index.html`):** renderer fills the window (or itch.io iframe); `applyStageScale()` scales and centers `app.stage` without changing scene/HUD layout coordinates. Per-scene responsive relayout is stubbed in `applyResponsiveLayout()` for a future pass.
- **API field names** use camelCase (`gameId`, `maxBet`, `symbolIds`) in TypeScript contracts and mock server responses.
- GSAP `PixiPlugin` is registered in `index.ts` for scene fade effects and UI decorations.
- `Filter.defaultOptions.resolution = 'inherit'` keeps ColorMatrix filters sharp on high-DPI and zoomed pages.
- `npm run build` produces an optimized static bundle in `dist/` for deployment or Docker.

## Versioning & Releases

The game version lives in `package.json` (`version` field). Each `npm start` / `npm run build` run generates `src/build-info.generated.ts` with:

| Field | Meaning |
|---|---|
| `version` | SemVer from `package.json` (e.g. `1.2.2`) |
| `gitSha` | Short commit hash — identifies what is on GitHub |
| `gitDirty` | `*` suffix if there are uncommitted local changes |
| `mode` | `development` (local) or `production` (build) |
| `channel` | `local`, `release`, or `itch` |
| `buildId` | UTC timestamp of the build (e.g. `20250701-143022`) |

**Where to look:**

- **Local dev** (`npm start`) — HUD info panel (bottom bar): `v1.2.2 dev 2026-07-18*` (date from build time; `*` = uncommitted changes). Console logs the full line: `v1.2.2 · dev · abc1234* · …`.
- **GitHub** — check `package.json` version + `git log -1 --oneline`. Tag releases as `v1.2.2` to match the version field.
- **itch.io build** — run `npm run build:itch`, then open `dist/BUILD.txt` or the in-game label: `v1.2.2 itch 2026-07-18` (sha, buildId, and channel in console / `BUILD.txt`).

`src/build-info.generated.ts` and `build/build-info.json` are **generated** on each start/build (listed in `.gitignore`). Do not commit them after an itch build — ship `package.json` version + clean git, then build so `gitSha` matches GitHub.

### Before a git commit

1. Make sure the game runs: `npm start`.
2. Bump version **only** when preparing a release or a public itch.io upload:
   ```bash
   npm run version:patch   # 1.2.2 → 1.2.3 (bugfix)
   npm run version:minor   # 1.2.2 → 1.3.0 (new feature)
   npm run version:major   # 1.2.2 → 2.0.0 (breaking change)
   ```
3. Commit code **and** the updated `package.json` / `package-lock.json` together.
4. For a release, add a git tag after the commit:
   ```bash
   git tag v1.2.2
   ```

Regular WIP commits do **not** require a version bump.

### Before pushing to GitHub

1. Commit (or stash) all changes — a dirty working tree shows `*` in the dev label and is harder to trace.
2. Push your feature branch and open a PR into `main`:
   ```bash
   git push -u origin HEAD
   ```
3. If this push is a **release**, ensure the version was bumped and the tag exists:
   ```bash
   git tag v1.2.2        # if not created yet
   git push origin main
   git push origin v1.2.2
   ```
4. For everyday WIP pushes, step 2 is enough — no version bump needed.

### Before uploading to itch.io

1. **Commit and push** the code you are shipping (so `gitSha` in the build matches GitHub), including any version bump.
2. **Bump version** if this upload is a new public release (`npm run version:patch` or `minor`), then commit and push that bump **before** building.
3. Build the itch bundle:
   ```bash
   npm run build:itch
   ```
4. Verify `dist/BUILD.txt` — version, git hash, and build ID should look correct (no `*` = clean git).
5. Open `dist/index.html` locally (`npx serve dist`) and smoke-test: spin, balance, reload persistence, version label, info modal links, error retry (`?failSpin=1`).
6. Upload the **entire** `dist/` folder to itch.io (HTML project).
7. Restore generated build-info files if git shows them modified (`git restore src/build-info.generated.ts build/build-info.json`).
8. Tag the release on GitHub if you bumped the version:
   ```bash
   git tag v1.2.2
   git push origin v1.2.2
   ```

## Roadmap (planned)

- Per-scene responsive layout (`applyResponsiveLayout` — relayout scenes/HUD to window size instead of stage-only scaling)
- `IGameSceneCapabilities` — further decouple `index.ts` from `MainGameScene` (`instanceof` stubs remain in places)
- HUD wallet button — wire `show-wallet` signal from `GameHUD`
- Additional catalog entries (1×3 thimbles, other reel layouts)
- Real backend integration (replace mock server / pay client)

## Third-Party Assets & Credits

This demo uses third-party assets for demonstration purposes. Before any commercial use or redistribution, verify individual licensing terms:

- **Spine Sample Assets** (`coin` and `owl` animations):
  Copyright (c) 2018, Esoteric Software LLC. All rights reserved. Spine and the Spine logo are trademarks or registered trademarks of Esoteric Software LLC in the United States and/or other countries.
- **Pixabay** (images and sounds):
  Some materials used in asset creation are sourced from Pixabay and are subject to the [Pixabay License](https://pixabay.com).
- **Sound Effects**:
  Additional sound effects sourced from [GfxSounds](https://gfxsounds.com).
- **AI-Generated Content**:
  Some graphics in this demo were created or refined using AI image generation tools.

## Branding & Trademarks

The **Fairy Blob Games** name, logo (`src/assets/preload/logo.png`), domain [fairyblobgames.com](https://fairyblobgames.com), and related branding are © Aliaksandr Bandarenka. All rights reserved.

They are **not** licensed under the ISC License and may not be copied, modified, or used in other projects, products, or services without prior written permission.

## License

### Project Code
The source code of this project is licensed under the **ISC License**. You are free to use, copy, modify, and distribute this software for any purpose with or without fee, provided that the copyright notice and permission notice appear in all copies.

See the `LICENSE` file in the root directory for the full text.

### Assets License
The ISC license applies **only to the source code** created for this project. It does not cover the third-party assets (animations, images, and audio tracks) listed in the Credits section above, nor the **Fairy Blob Games** branding listed in the Branding & Trademarks section. These materials remain the property of their respective owners and are subject to their own licensing terms.
