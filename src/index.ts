import { Application, Container, Graphics, Assets, Filter, Spritesheet, Text, TextStyle } from 'pixi.js';
import * as PIXI from 'pixi.js';

import { gsap } from 'gsap';
import { PixiPlugin } from 'gsap/PixiPlugin';

import { Scene } from './scenes/scene';
import { LoadingScene } from './scenes/loading-scene';
import { MainGameScene } from './scenes/main-game-scene';
import { PreloadScene } from './scenes/preload-scene';
import { SlotMachineClient } from './game/slot-machine-client';
import { IInitResponse, ISpinResponse, IWallet } from './game/slot-game-interface';
import { GameSceneCatalogEntry, gameSceneCatalog } from './managers/scenes-catalog';
import { SoundManager } from './managers/sound-manager';
import { UIButton } from './components/ui-button';
import { HighlightDecoration } from './components/highlight-decoration';
import { createVersionLabel, logBuildInfo } from './version';

import './global-delay';

Filter.defaultOptions.resolution = 'inherit';
gsap.registerPlugin(PixiPlugin);
PixiPlugin.registerPIXI(PIXI);

const MOCK_TOKEN = 'mock';

const app = new Application();
const gameClient = new SlotMachineClient();

const gameLayer = new Container();
const hudLayer = new Container(); // !! top level UI to be implemented
const uiOverlay = new Container();
const fadeRect = new Graphics();
uiOverlay.addChild(fadeRect);

let gameWidth = 800;
let gameHeight = 600;

let currentScene: Scene | null = null;
let gameSceneAccets: string = '';
let isServerConnected = false;

let isPaused = true;
let inUse = false;

type PlayerState = {
	wallet: IWallet;
};

let playerState: PlayerState = { wallet: { balance: 0, currency: 'coins', decimals: 0 } };

let isHudSoundClickBlocked = false;
let walletHudLabel: Text | null = null;

async function initGame(): Promise<void> {
	logBuildInfo();

	window.addEventListener('resize', () => {
		const dpr = window.devicePixelRatio || 1;
		app.renderer.resolution = dpr;
		// under construction
		//app.renderer.resize(gameWidth, gameHeight);
		//currentScene?.resize(gameWidth, gameHeight);
		//console.log('resized', window.devicePixelRatio);
	});

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
	const loadCommonPromise = Assets.loadBundle('common');
	await Promise.all([loadCommonPromise, delay(500)]);
	// no progress bar durin loading 'common', because there is no main menu and login screen yet

	// load main game scene
	await loadGameScene('main-scene');

	// setup keys and window focus
	app.canvas.setAttribute('tabindex', '0');
	app.canvas.focus();
	window.addEventListener('keydown', onKeyDown);

	isPaused = false;
}

async function loadGameScene(sceneId: string): Promise<void> {
	const entry = gameSceneCatalog.find((catalogEntry) => catalogEntry.id === sceneId);

	if (!entry) {
		console.error(`loadGameScene: unknown scene id "${sceneId}"`);
		return;
	}

	const loadingScene = new LoadingScene();
	await changeScene(loadingScene);
	if (gameSceneAccets) {
		await Assets.unloadBundle(gameSceneAccets);
		gameSceneAccets = '';
	}

	// ?? the only way?
	const serverInitPromise = entry.gameId
		? connectToGameServer(entry.gameId)
		: Promise.resolve({ connected: false, response: null as IInitResponse | null });
	const assetsPromise = Assets.loadBundle(entry.assetBundle, p => loadingScene.onProgress(p * 0.9 + 0.1));
	const [serverInit] = await Promise.all([serverInitPromise, assetsPromise]);

	gameSceneAccets = entry.assetBundle;

	isServerConnected = serverInit.connected;

	if (serverInit.connected && serverInit.response) {
		updateWallet(serverInit.response.wallet);
	}

	await initHUD();

	const gameScene = createGameScene(entry, serverInit.response);

	await changeScene(gameScene);

	adjustSceneUi(entry, isServerConnected); // !! to be implemented
}

async function connectToGameServer(gameId: string): Promise<{ connected: boolean; response: IInitResponse | null }> {
	try {
		const response = await gameClient.fetchInit({ token: MOCK_TOKEN, game_id: gameId });
		const connected = response.error === undefined;

		if (!connected) {
			console.warn('loadGameScene: server init failed', response.error);
		}

		return { connected, response };
	} catch (error) {
		console.error('loadGameScene: server init error', error);
		return { connected: false, response: null };
	}
}

function createGameScene(entry: GameSceneCatalogEntry, initResponse: IInitResponse | null): Scene {
	// !! in progress
	const gameScene = entry.createScene(); //new MainGameScene(extractReelStopKeys(initResponse.symbols));

	if (entry.gameId && initResponse && initResponse.error === undefined) {
		setupReels(gameScene, initResponse);
		connectLever(gameScene, isServerConnected);
		connectCheat(gameScene, isServerConnected);
	}

	return gameScene;
}

/** STUB: future — scene.applyReelMatrix(initResponse.symbols) to sync visible reels with server state */
function setupReels(scene: Scene, initResponse: IInitResponse | null): void {
	if (!(scene instanceof MainGameScene)) {
		return;
	}

	const connected = initResponse !== null && initResponse.error === undefined;

	if (connected) {
		return;
	}

	console.warn('setupReels: server unavailable, scene uses default reel configuration');
}

/** STUB: replace with IGameSceneCapabilities interface (hasLever / bindLever / setReelStops) */
function connectLever(scene: Scene, serverConnected: boolean): void {
	if (!(scene instanceof MainGameScene)) {
		return;
	}

	scene.off('leverTriggered');

	if (serverConnected) {
		scene.on('leverTriggered', onLeverTriggered);
		return;
	}

	scene.on('leverTriggered', async () => {
		await scene.playBlocked();
	});
}

/** STUB: replace with IGameSceneCapabilities interface (hasLever / bindLever / setReelStops) */
function connectCheat(scene: Scene, serverConnected: boolean): void {
	if (!(scene instanceof MainGameScene)) {
		return;
	}

	scene.off('cheatACoin');

	if (serverConnected) {
		scene.on('cheatACoin', onCheatTriggered);
		return;
	}
}

/** STUB: drive hudLayer widgets (title, balance, scene-specific controls) */
function adjustSceneUi(entry: GameSceneCatalogEntry, serverConnected: boolean): void {
	console.info(`adjustSceneUi: "${entry.title}" loaded, server=${serverConnected}`);
}

function extractReelStopKeys(symbols: string[][]): number[] {
	return symbols.map((reel) => Number(reel[1]));
}

function refreshWalletHud(): void {
	// ??? AI generated
	if (!walletHudLabel) {
		return;
	}

	walletHudLabel.text = `${playerState.wallet.currency}: ${playerState.wallet.balance}`;
}

function updateWallet(wallet: IWallet): void {
	playerState = { wallet: { ...wallet } };
	refreshWalletHud();
}

function changeWalletBalance(amount: number): void {
	playerState.wallet.balance += amount;
	refreshWalletHud();
}

async function changeScene(newScene: Scene): Promise<void> {
	if (currentScene) {
		if (currentScene instanceof MainGameScene) {
			currentScene.off('leverTriggered');
		}

		const promiseFadeIsOn = fadeEffect(500, true);
		const promiseSceneInit = newScene.init();
		await Promise.all([promiseFadeIsOn, promiseSceneInit]);

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

function createWalletBadge(width: number, height: number): Container {
	// ??? AI generated
	const badge = new Container();
	const background = new Graphics();

	background.roundRect(0, 0, width, height, 4);
	background.fill({ color: '#333333', alpha: 0.8 });

	walletHudLabel = new Text({
		text: '--',
		style: new TextStyle({
			fontFamily: 'Arial, sans-serif',
			fontSize: 22,
			fill: 0xffffff,
		}),
	});

	walletHudLabel.anchor.set(0.5);
	walletHudLabel.x = width / 2;
	walletHudLabel.y = height / 2;

	badge.addChild(background);
	badge.addChild(walletHudLabel);

	return badge;
}

async function initHUD(): Promise<void> {
	// !! AI generated

	const versionLabel = createVersionLabel();
	versionLabel.x = 8;
	versionLabel.y = gameHeight - versionLabel.height - 8;
	hudLayer.addChild(versionLabel);

	const scale = 1;
	const soundButtonSheet = await Assets.load<Spritesheet>('sound-button-brown');
	const decorator = new HighlightDecoration(0.8);
	const size = 42;
	const soundButton = new UIButton(soundButtonSheet, 'sound-on', size, size, decorator);
	soundButton.x = (24 + size / 2) * scale;
	soundButton.y = (20 + size / 2) * scale;
	soundButton.adjustScale(scale, scale);
	hudLayer.addChild(soundButton);

	soundButton.on('pointertap', () => {
		if (isHudSoundClickBlocked) {
			return;
		}

		if (SoundManager.toggleGlobal()) {
			soundButton.setTexture('sound-off');
		} else {
			soundButton.setTexture('sound-on');
		}

		isHudSoundClickBlocked = true;
		gsap.delayedCall(0.15, () => {
			isHudSoundClickBlocked = false;
		});
	});

	const walletBadge = createWalletBadge(160, 42);
	walletBadge.x = (90) * scale;
	walletBadge.y = (20) * scale;
	walletBadge.scale.set(scale);
	hudLayer.addChild(walletBadge);

	refreshWalletHud();
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
	if (!(currentScene instanceof MainGameScene) || !isServerConnected) {
		return;
	}

	if (inUse) {
		return;
	}

	try {
		inUse = true;

		if (playerState?.wallet.balance) {
			changeWalletBalance(-1);
			await currentScene.startSpinning();
			const result = await gameClient.fetchSpin({ bet: 1 });
			const reelStops = extractReelStopKeys(result.symbols);
			await currentScene.stopSpinning(reelStops);

			updateWallet(result.wallet);

			if (result.isWin) {
				await currentScene.playWin();
			} else {
				await currentScene.playLost();
			}

			await delay(100);

		} else {
			await currentScene.playBlocked();
		}

	} finally {
		inUse = false;
	}
}

async function onCheatTriggered(): Promise<void> {
	if (!(currentScene instanceof MainGameScene) || !isServerConnected) {
		return;
	}
	gameClient.cheatCoins(1);
	changeWalletBalance(1);
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
