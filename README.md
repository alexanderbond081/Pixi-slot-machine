# Another HTML5 Slot Machine Game Demo

A browser-based slot machine demo built with **Pixi.js v8**, **TypeScript**, **GSAP**, and **Spine** skeletal animations. The project showcases reel spinning mechanics, win/lose feedback, ambient audio, and a scene-based loading flow.

## Features

- **Three independent reels** with acceleration, deceleration, and a micro-bounce stop animation
- **Mock server spin results** — symbol outcomes and win detection are simulated asynchronously (no client-side cheat logic on the final design path)
- **Spine animations** — owl character reactions and coin burst particles on win
- **Layered audio** — separate music, ambience, and SFX buses via `@pixi/sound`; per-reel spin sounds with staggered stop clicks
- **Scene flow** — preload splash → loading screen with progress bar → main game, with GSAP fade transitions
- **UI button feedback** — `UIButton` with pluggable `MouseActionDecoration` (sound toggle uses `HighlightDecoration`: hover highlight, press tint, elastic tap)
- **Input** — pull the lever (click) or press **Space** / **Enter**

## Tech Stack

| | |
|---|---|
| Engine | [Pixi.js](https://pixijs.com/) v8 |
| Language | TypeScript (strict) |
| Animation | Spine (`@esotericsoftware/spine-pixi-v8`), [GSAP](https://gsap.com/) v3 + PixiPlugin |
| Audio | `@pixi/sound` |
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

Webpack dev server runs with hot reload on port **3000**.

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
├── index.ts                      # App bootstrap, GSAP/PixiPlugin setup, scene switching
├── assets/                       # Images, sounds, Spine data, asset manifest
├── components/
│   ├── ui-button.ts              # Interactive UI button (Decoratable)
│   ├── highlight-decoration.ts   # Hover / press / tap GSAP effects
│   ├── mouse-action-decoration.ts
│   ├── decoratable.ts
│   ├── reel.ts, coin.ts, spine-display.ts, particle-fly.ts
├── game/
│   └── slot-machine-model.ts     # Mock spin API
├── managers/
│   └── sound-manager.ts          # Audio buses and playback
└── scenes/                       # Preload, Loading, MainGame scenes
```

## How to Play

1. Wait for assets to load.
2. Click the lever or press **Space** / **Enter** to spin.
3. Reels stop one by one; a win triggers a coin spray and owl celebration.
4. Use the sound button (top-left) to toggle audio.

## Development Notes

- Assets are loaded through Pixi `Assets` bundles defined in `src/assets/manifest.json`.
- Webpack aliases `pixi.js` to a single ESM entry point so Spine and the app share one Pixi instance.
- Reel symbol keys originate from `SlotMachineModel` and are passed through the scene unchanged.
- GSAP `PixiPlugin` is registered in `index.ts` for scene fade effects and UI decorations.
- `Filter.defaultOptions.resolution = 'inherit'` keeps ColorMatrix filters (contrast/brightness) sharp on high-DPI and zoomed pages.
- `npm run build` produces an optimized static bundle in `dist/` for deployment or Docker.

## Versioning & Releases

The game version lives in `package.json` (`version` field). Each `npm start` / `npm run build` run generates `src/build-info.generated.ts` with:

| Field | Meaning |
|---|---|
| `version` | SemVer from `package.json` (e.g. `1.0.0`) |
| `gitSha` | Short commit hash — identifies what is on GitHub |
| `gitDirty` | `*` suffix if there are uncommitted local changes |
| `mode` | `development` (local) or `production` (build) |
| `channel` | `local`, `release`, or `itch` |
| `buildId` | UTC timestamp of the build (e.g. `20250701-143022`) |

**Where to look:**

- **Local dev** (`npm start`) — bottom-left overlay: `v1.0.0 · dev · abc1234*` and the same string in the browser console. `*` means uncommitted changes.
- **GitHub** — check `package.json` version + `git log -1 --oneline`. Tag releases as `v1.0.0` to match the version field.
- **itch.io build** — run `npm run build:itch`, then open `dist/BUILD.txt` or the in-game label: `v1.0.0 · itch · abc1234 · 20250701-143022`.

### Before a git commit

1. Make sure the game runs: `npm start`.
2. Bump version **only** when preparing a release or a public itch.io upload:
   ```bash
   npm run version:patch   # 1.0.0 → 1.0.1 (bugfix)
   npm run version:minor   # 1.0.0 → 1.1.0 (new feature)
   npm run version:major   # 1.0.0 → 2.0.0 (breaking change)
   ```
3. Commit code **and** the updated `package.json` / `package-lock.json` together.
4. For a release, add a git tag after the commit:
   ```bash
   git tag v1.0.1
   ```

Regular WIP commits do **not** require a version bump.

### Before pushing to GitHub

1. Commit (or stash) all changes — a dirty working tree shows `*` in the dev label and is harder to trace.
2. If this push is a **release**, ensure the version was bumped and the tag exists:
   ```bash
   git tag v1.0.1        # if not created yet
   git push origin main
   git push origin v1.0.1
   ```
3. For everyday pushes, just `git push` — no version bump needed.

### Before uploading to itch.io

1. **Commit and push** the code you are shipping (so `gitSha` in the build matches GitHub).
2. **Bump version** if this upload is a new public release (`npm run version:patch` or `minor`).
3. Build the itch bundle:
   ```bash
   npm run build:itch
   ```
4. Verify `dist/BUILD.txt` — version, git hash, and build ID should look correct.
5. Open `dist/index.html` locally (or use `npx serve dist`) and check the version label in the bottom-left corner.
6. Upload the **entire** `dist/` folder to itch.io (HTML project).
7. Tag the release on GitHub if you bumped the version:
   ```bash
   git tag v1.0.1
   git push origin v1.0.1
   ```

## Roadmap (planned)

- Responsive layout (`resize` wiring, browser zoom / DPR sync)
- `src/config.ts` for shared constants
- HUD layer
- Balance / bet system


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
