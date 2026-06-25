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

## Third-Party Assets

Game visuals and audio were assembled from several sources:

- **[Pixabay](https://pixabay.com/)** — some materials used in asset creation (images and sounds). Pixabay content is subject to the [Pixabay License](https://pixabay.com/service/license/); check individual files before commercial use or redistribution.
- **AI-generated images** — some graphics in this demo were created or refined with AI image generation tools.
- **Spine sample assets** (`src/assets/spine/`) — include their own `license.txt` files. Review those licenses before any commercial use.

All assets are included for demo purposes only. Verify attribution, licensing, and usage rights before redistribution or production deployment.

## License

Project code: ISC (see `package.json`).

Third-party assets may have separate licenses — see asset folders and `license.txt` files where present.
