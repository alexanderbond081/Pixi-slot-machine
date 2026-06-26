# Another HTML5 Slot Machine Game Demo

A browser-based slot machine demo built with **Pixi.js v8**, **TypeScript**, and **Spine** skeletal animations. The project showcases reel spinning mechanics, win/lose feedback, ambient audio, and a scene-based loading flow.

## Features

- **Three independent reels** with acceleration, deceleration, and a micro-bounce stop animation
- **Mock server spin results** — symbol outcomes and win detection are simulated asynchronously (no client-side cheat logic on the final design path)
- **Spine animations** — owl character reactions and coin burst particles on win
- **Layered audio** — separate music, ambience, and SFX buses via `@pixi/sound`; per-reel spin sounds with staggered stop clicks
- **Scene flow** — preload splash → loading screen with progress bar → main game
- **Input** — pull the lever (click) or press **Space** / **Enter**

## Tech Stack

| | |
|---|---|
| Engine | [Pixi.js](https://pixijs.com/) v8 |
| Language | TypeScript (strict) |
| Animation | Spine (`@esotericsoftware/spine-pixi-v8`) |
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

Output is written to `dist/` (HTML, `bundle.js`, and copied assets).

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
├── index.ts                 # App bootstrap, scene switching, game loop
├── assets/                  # Images, sounds, Spine data, asset manifest
├── components/              # Reel, Coin, SpineDisplay, particle effects
├── game/
│   └── slot-machine-model.ts  # Mock spin API
├── managers/
│   └── sound-manager.ts     # Audio buses and playback
└── scenes/                  # Preload, Loading, MainGame scenes
```

## How to Play

1. Wait for assets to load.
2. Click the lever or press **Space** / **Enter** to spin.
3. Reels stop one by one; a win triggers a coin spray and owl celebration.

## Development Notes

- Assets are loaded through Pixi `Assets` bundles defined in `src/assets/manifest.json`.
- Webpack aliases `pixi.js` to a single ESM entry point so Spine and the app share one Pixi instance.
- Reel symbol keys originate from `SlotMachineModel` and are passed through the scene unchanged.
- `npm run build` produces an optimized static bundle in `dist/` for deployment or Docker.

## Roadmap (planned)

- Responsive layout (`resize` wiring)
- `src/config.ts` for shared constants
- HUD layer
- Balance / bet system
- GSAP for UI and fade animations


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

## License

### Project Code
The source code of this project is licensed under the **ISC License**. You are free to use, copy, modify, and distribute this software for any purpose with or without fee, provided that the copyright notice and permission notice appear in all copies.

See the `LICENSE` file in the root directory for the full text.

### Assets License
The ISC license applies **only to the source code** created for this project. It does not cover the third-party assets (animations, images, and audio tracks) listed in the Credits section above. These assets remain the property of their respective owners and are subject to their own licensing terms.
