import { Application, Container, Graphics, Assets, Filter } from 'pixi.js';
import * as PIXI from 'pixi.js';

import { gsap } from 'gsap';
import { PixiPlugin } from 'gsap/PixiPlugin';

import { Scene } from './scenes/scene';
import { LoadingScene } from './scenes/loading-scene';
import { MainGameScene } from './scenes/main-game-scene';
import { PreloadScene } from './scenes/preload-scene';
import { SlotMachineClient } from './game/slot-machine-client';
import { PayClient } from './game/pay-client';
import { MockWalletLedger } from './game/server/mock-persistence';
import { IInitResponse } from './game/slot-game-interface';
import { GameSceneCatalogEntry, gameSceneCatalog } from './managers/scenes-catalog';
import { logBuildInfo } from './version';

import './global-delay';
import { BalancePresenter, LOSS_REVEAL_DURATION_MS } from './hud/balance-presenter';
import { GameHUD } from './hud/game-hud';
import { SoundManager } from './managers/sound-manager';
import { debug } from './managers/debug';
import { bindGameDelayTicker } from './global-delay';

Filter.defaultOptions.resolution = 'inherit';
gsap.registerPlugin(PixiPlugin);
PixiPlugin.registerPIXI(PIXI);

const MOCK_TOKEN = 'mock';
const DEFAULT_MIN_BET = 1;
const DEFAULT_MAX_BET = 10;

const app = new Application();
const walletLedger = new MockWalletLedger();
const gameClient = new SlotMachineClient(undefined, walletLedger);
const payClient = new PayClient(walletLedger);
const gameHUD = new GameHUD();
const balancePresenter = new BalancePresenter(gameHUD);

const gameLayer = new Container();
const hudLayer = new Container();
const uiOverlay = new Container();
const fadeRect = new Graphics();
uiOverlay.addChild(fadeRect);

let gameWidth = 800;
let gameHeight = 600;

let currentScene: Scene | null = null;
let gameSceneAssets: string = '';
let isServerConnected = false;

let isPaused = true;
let inUse = false;

let currentBet = DEFAULT_MIN_BET;

const getClientSize = (): { width: number; height: number } => {
	const visualViewport = window.visualViewport;
	return {
		width: visualViewport?.width ?? document.documentElement.clientWidth,
		height: visualViewport?.height ?? document.documentElement.clientHeight,
	};
};

const applyStageScale = (): void => {
	const dpr = window.devicePixelRatio || 1;
	const { width: clientWidth, height: clientHeight } = getClientSize();

	app.renderer.resolution = dpr;
	app.renderer.resize(clientWidth, clientHeight);

	const scale = Math.min(
		clientWidth / gameWidth,
		clientHeight / gameHeight,
	);

	app.stage.scale.set(scale);
	app.stage.x = (clientWidth - gameWidth * scale) * 0.5;
	app.stage.y = (clientHeight - gameHeight * scale) * 0.5;
};

const applyResponsiveLayout = (): void => {
	// !! to be implemented
	//app.renderer.resize(gameWidth, gameHeight);
	//currentScene?.resize(gameWidth, gameHeight);
	//gameHUD.resize(gameWidth, gameHeight);
};

const isFullscreen = (): boolean => {
	return document.fullscreenElement !== null;
};

const toggleFullscreen = async (): Promise<void> => {
	try {
		if (!isFullscreen()) {
			await document.documentElement.requestFullscreen();
		} else {
			await document.exitFullscreen();
		}
	} catch (error) {
		console.warn('toggleFullscreen: not available', error);
	} finally {
		applyStageScale();
	}
};

const bindViewportListeners = (): void => {
	const onViewportChange = (): void => {
		applyStageScale();
	};

	window.addEventListener('resize', onViewportChange);
	window.addEventListener('orientationchange', () => {
		requestAnimationFrame(onViewportChange);
		setTimeout(onViewportChange, 100);
		setTimeout(onViewportChange, 300);
	});
	window.visualViewport?.addEventListener('resize', onViewportChange);
	window.visualViewport?.addEventListener('scroll', onViewportChange);
	document.addEventListener('fullscreenchange', onViewportChange);
};

async function initGame(): Promise<void> {
	logBuildInfo();

	SoundManager.init();
	bindViewportListeners();

	await app.init({
		background: '0x222222',
		width: gameWidth,
		height: gameHeight,
		antialias: false,
		autoDensity: true,
		resolution: window.devicePixelRatio || 1,
	});
	bindGameDelayTicker(app.ticker);
	document.body.appendChild(app.canvas);
	applyStageScale();

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
	await Promise.all([loadCommonPromise, delay(1000)]);
	// no progress bar durin loading 'common', because there is no main menu and login screen yet

	// load main game scene
	await loadGameScene('main-scene');

	// setup keys and window focus - the app works fine without it
	//app.canvas.setAttribute('tabindex', '0');
	//app.canvas.focus();

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
	if (gameSceneAssets) {
		await Assets.unloadBundle(gameSceneAssets);
		gameSceneAssets = '';
	}

	const serverInitPromise = entry.gameId
		? connectToGameServer(entry.gameId)
		: Promise.resolve({ connected: false, response: null as IInitResponse | null });
	const assetsPromise = Assets.loadBundle(entry.assetBundle, p => loadingScene.onProgress(p * 0.9 + 0.1));
	const [serverInit] = await Promise.all([serverInitPromise, assetsPromise]);

	gameSceneAssets = entry.assetBundle;

	isServerConnected = serverInit.connected;

	if (serverInit.connected && serverInit.response) {
		balancePresenter.applySnapshot(serverInit.response.wallet, { instant: true });
	}

	await initHUD();
	setupBetControls(serverInit.response);

	const gameScene = createGameScene(entry, serverInit.response);

	await changeScene(gameScene, true);

	adjustSceneUi(entry, isServerConnected); // !! to be implemented
}

async function connectToGameServer(gameId: string): Promise<{ connected: boolean; response: IInitResponse | null }> {
	try {
		const response = await gameClient.fetchInit({ token: MOCK_TOKEN, gameId });
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
	const sceneArgs = initResponse !== null && initResponse.error === undefined
		? {
			symbolKeys: initResponse.symbolIds,
			symbolMatrix: initResponse.symbols,
		}
		: undefined;

	const gameScene = entry.createScene(sceneArgs);

	if (entry.gameId && initResponse?.error === undefined) {
		connectLever(gameScene, isServerConnected);
		connectCheat(gameScene, isServerConnected);
	}

	return gameScene;
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
	}
}

/** STUB: drive hudLayer widgets (title, balance, scene-specific controls) */
function adjustSceneUi(entry: GameSceneCatalogEntry, serverConnected: boolean): void {
	console.info(`adjustSceneUi: "${entry.title}" loaded, server=${serverConnected}`);
}

async function changeScene(newScene: Scene, showHud: boolean = false): Promise<void> {
	if (currentScene) {
		if (currentScene instanceof MainGameScene) {
			currentScene.off('leverTriggered');
			currentScene.off('cheatACoin');
		}

		const promiseFadeIsOn = fadeEffect(500, true);
		const promiseSceneInit = newScene.init();
		await Promise.all([promiseFadeIsOn, promiseSceneInit]);
		hudLayer.visible = showHud;

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

async function initHUD(): Promise<void> {
	await gameHUD.init();

	if (!hudLayer.children.includes(gameHUD)) {
		hudLayer.addChild(gameHUD);
	}

	connectBetControls();
	connectFullscreenControl();
}

function connectFullscreenControl(): void {
	gameHUD.off('toggle-fullscreen');
	gameHUD.on('toggle-fullscreen', () => {
		void toggleFullscreen();
	});
}

function setupBetControls(initResponse: IInitResponse | null): void {
	const maxBet = initResponse?.maxBet ?? DEFAULT_MAX_BET;

	gameHUD.setBetLimits(DEFAULT_MIN_BET, maxBet);
	gameHUD.setBet(currentBet);
	currentBet = Math.min(currentBet, maxBet);
}

function connectBetControls(): void {
	gameHUD.off('bet-changed');
	gameHUD.on('bet-changed', (bet: number) => {
		currentBet = bet;
	});
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

	let spinFlowActive = false;

	try {
		inUse = true;

		if (balancePresenter.getWallet().balance >= currentBet) {
			spinFlowActive = true;
			balancePresenter.onSpinStarted(currentBet);
			await currentScene.startSpinning();
			const result = await gameClient.fetchSpin({ bet: currentBet });
			balancePresenter.onSpinResponse(result.wallet);
			const reelStops = result.symbols;
			await currentScene.stopSpinning(reelStops);

			if (result.isWin) {
				balancePresenter.onReelsStopped({
					durationMs: result.winAmount * 100,
				});
				await currentScene.playWin(result.winAmount);
			} else {
				balancePresenter.onReelsStopped({ durationMs: LOSS_REVEAL_DURATION_MS });
				await currentScene.playLost();
			}

			await delay(100);

		} else {
			await currentScene.playBlocked();
		}

	} finally {
		if (spinFlowActive) {
			balancePresenter.onSpinFlowFinished();
		}
		inUse = false;
	}
}

async function onCheatTriggered(): Promise<void> {
	if (!(currentScene instanceof MainGameScene) || !isServerConnected) {
		return;
	}
	const wallet = await payClient.addCoins(1);
	balancePresenter.onExternalCredit(wallet, 1);
}

function onKeyDown(event: KeyboardEvent): void {
	if (event.code === 'Escape') {
		if (gameHUD.closeTopModal()) {
			event.preventDefault();
			return;
		}
	}

	if (event.code === 'KeyF') {
		event.preventDefault();
		if (event.repeat) return;
		void toggleFullscreen();
		return;
	}

	if (isPaused || inUse || gameHUD.isModalOpen()) return;

	if (event.code === 'Space' || event.code === 'Enter') {
		event.preventDefault();
		if (event.repeat) return;
		void onLeverTriggered();
	}
}

initGame().catch((err) => console.error("Game crash:", err));
