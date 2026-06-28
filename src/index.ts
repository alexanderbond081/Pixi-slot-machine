
import { Application, Container, Graphics, Assets } from 'pixi.js';
import * as PIXI from 'pixi.js';

import { gsap } from 'gsap';
import { PixiPlugin } from 'gsap/PixiPlugin';

import { Scene } from './scenes/scene';
import { LoadingScene } from './scenes/loading-scene';
import { MainGameScene } from './scenes/main-game-scene';
import { PreloadScene } from './scenes/preload-scene';
import { SlotMachineModel } from './game/slot-machine-model';

gsap.registerPlugin(PixiPlugin);
PixiPlugin.registerPIXI(PIXI);

const app = new Application();
const slotMachine = new SlotMachineModel();

const gameLayer = new Container();
const hudLayer = new Container(); // !! top level UI to be implemented
const uiOverlay = new Container();
const fadeRect = new Graphics();
uiOverlay.addChild(fadeRect);

let gameWidth = 800;
let gameHeight = 600;

let currentScene: Scene | null = null;

let isPaused = true;
let inUse = false;

async function initGame(): Promise<void> {
	await app.init({
		background: '0x222222',
		width: gameWidth,
		height: gameHeight,
		antialias: true,
		autoDensity: true,
		resolution: window.devicePixelRatio || 1,
	});
	document.body.appendChild(app.canvas);

	app.stage.addChild(gameLayer);
	app.stage.addChild(hudLayer);
	app.stage.addChild(uiOverlay);
	initFadeEffect();

	await Assets.init({ manifest: 'assets/manifest.json' });

	app.ticker.add((ticker) => {
		if (isPaused) return;

		if (currentScene) {
			currentScene.update(ticker.deltaTime);
		}
	});

	isPaused = true;

	// show logo
	await Assets.loadBundle('preload');
	await changeScene(new PreloadScene());
	await new Promise(resolve => setTimeout(resolve, 500));

	// load assets
	const loadingScene = new LoadingScene();
	await changeScene(loadingScene);
	await Assets.loadBundle('common', (bundleProgress: number) => {
		loadingScene.onProgress(bundleProgress * 0.5);
	});

	// !! should be loaded/unloaded dynamically some day in the future
	await Assets.loadBundle('main-scene', (bundleProgress: number) => {
		loadingScene.onProgress(bundleProgress * 0.5 + 0.5);
	});

	// show main scene
	const mainScene = new MainGameScene(slotMachine.keys);
	mainScene.on('leverTriggered', onLeverTriggered);
	await changeScene(mainScene);

	// setup keys event
	app.canvas.setAttribute('tabindex', '0');
	app.canvas.focus();
	window.addEventListener('keydown', onKeyDown);

	isPaused = false;
}

async function changeScene(newScene: Scene): Promise<void> {
	if (currentScene) {
		if (currentScene instanceof MainGameScene) {
			currentScene.off('leverTriggered');
		}

		const fadeIsOn = fadeEffect(500, true);
		await newScene.init();
		await fadeIsOn;

		gameLayer.removeChild(currentScene);
		gameLayer.addChild(newScene);

		const fadeIsOff = fadeEffect(500, false);
		currentScene.destroy({ children: true });
		currentScene = newScene;
		await fadeIsOff;

	} else {
		await newScene.init();
		gameLayer.addChild(newScene);
		currentScene = newScene;
		await fadeEffect(100, false, 0x00);
	}
}

function initFadeEffect(): void {
	fadeRect.rect(0, 0, gameWidth, gameHeight).fill(0xffffff);
	fadeRect.tint = 0x000000;
	fadeRect.alpha = 1;
	fadeRect.interactive = true;
}

async function fadeEffect(durationMs: number, fadeOut: boolean, color: number = 0x222222): Promise<void> {
	gsap.killTweensOf(fadeRect);
	fadeRect.tint = color;
	fadeRect.visible = true;

	await gsap.to(fadeRect, {
		pixi: { alpha: fadeOut ? 1 : 0 },
		duration: durationMs / 1000,
	});

	if (!fadeOut) {
		fadeRect.visible = false;
	}
}

async function onLeverTriggered(): Promise<void> {

	// !! under construction

	if (currentScene instanceof MainGameScene) {
		// check status
		if (inUse) {
			//console.log('Already in use');
			return;
		}

		try {
			inUse = true;
			//console.log('start  use');

			await currentScene.startSpinning();
			const result = await slotMachine.fetchSpinResult();
			await currentScene.stopSpinning(result.symbols);
			//console.log('Spin result:', result);
			if (result.isWin) {
				await currentScene.playWin();
			} else {
				await currentScene.playLost();
			}

			await new Promise(resolve => setTimeout(resolve, 100));

		} finally {
			inUse = false;
			//console.log('end use');
		}
	}
}

function onKeyDown(event: KeyboardEvent): void {
	if (isPaused || inUse) return;
	if (event.code === 'Space' || event.code === 'Enter') {
		event.preventDefault();
		if (event.repeat) return;
		void onLeverTriggered();
	}
}

initGame().catch((err) => console.error("Game crash:", err));
