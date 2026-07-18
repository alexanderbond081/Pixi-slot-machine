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
import { GameState } from './game/game-state';
import { GameSceneCatalogEntry, gameSceneCatalog } from './managers/scenes-catalog';
import { logBuildInfo } from './version';

import './global-delay';
import { BalancePresenter, LOSS_REVEAL_DURATION_MS } from './hud/balance-presenter';
import { GameHUD } from './hud/game-hud';
import { SoundManager } from './managers/sound-manager';
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
const gameState = new GameState();

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

/** Global scene pause (ticker + input) during bootstrap/load — not part of spin FSM. */
let isPaused = true;

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

const applyDevFailureFlags = (): void => {
	const params = new URLSearchParams(window.location.search);

	if (params.get('failInit') === '1') {
		gameClient.armNextInitFailure();
	}

	if (params.get('failSpin') === '1') {
		gameClient.armNextSpinFailure();
	}
};

async function initGame(): Promise<void> {
	logBuildInfo();
	applyDevFailureFlags();

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

	if (!isServerConnected && entry.gameId) {
		await recoverInitConnection(entry, gameScene, serverInit.response?.error);
	}
}

async function recoverInitConnection(
	entry: GameSceneCatalogEntry,
	gameScene: Scene,
	initialError?: string,
): Promise<void> {
	const gameId = entry.gameId;
	if (!gameId) {
		return;
	}

	const MAX_RETRY_HINT_ATTEMPT = 3;
	let attempt = 0;
	let message = initialError
		?? 'Failed to connect to the game server. Spinning is unavailable.';

	while (!isServerConnected) {
		attempt += 1;
		const footer = attempt >= MAX_RETRY_HINT_ATTEMPT
			? 'Try refreshing the page or try again later.'
			: 'Press OK to retry.';
		await gameHUD.showError(`${message}\n\n${footer}`);

		const serverInit = await connectToGameServer(gameId);
		if (!serverInit.connected || !serverInit.response) {
			message = serverInit.response?.error
				?? 'Failed to connect to the game server. Spinning is unavailable.';
			continue;
		}
		isServerConnected = true;
		balancePresenter.applySnapshot(serverInit.response.wallet, { instant: true });
		setupBetControls(serverInit.response);
		reInitScene(entry, gameScene, serverInit.response);
	}
}

async function connectToGameServer(gameId: string): Promise<{ connected: boolean; response: IInitResponse | null }> {
	try {
		const response = await gameClient.fetchInit({ token: MOCK_TOKEN, gameId });
		const connected = response.error === undefined;

		return { connected, response };
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Unknown init error';
		return {
			connected: false,
			response: {
				player: { id: '', userName: '' },
				wallet: { balance: 0, currency: 'coins', decimals: 0, lastTransactionIndex: 0 },
				gameId,
				maxBet: 0,
				symbolIds: [],
				symbols: [],
				error: message,
			},
		};
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
	connectLever(gameScene, isServerConnected);
	connectCheat(gameScene, isServerConnected);
	return gameScene;
}

function reInitScene(entry: GameSceneCatalogEntry, gameScene: Scene, initResponse: IInitResponse | null): void {
	if (!gameScene) {
		return;
	}

	const sceneArgs = initResponse !== null && initResponse.error === undefined
		? {
			symbolKeys: initResponse.symbolIds,
			symbolMatrix: initResponse.symbols,
		}
		: undefined;

	entry.reinitScene(gameScene, sceneArgs);
	connectLever(gameScene, isServerConnected);
	connectCheat(gameScene, isServerConnected);
}

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

function connectCheat(scene: Scene, serverConnected: boolean): void {
	if (!(scene instanceof MainGameScene)) {
		return;
	}

	scene.off('cheatACoin');

	if (serverConnected) {
		scene.on('cheatACoin', onCheatTriggered);
	}
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

	if (!gameState.canAcceptSpinInput()) {
		return;
	}

	if (balancePresenter.getWallet().balance < currentBet) {
		await currentScene.playBlocked();
		return;
	}

	gameState.transitionTo('SPINNING');

	let spinSettled = false;

	try {
		balancePresenter.onSpinStarted(currentBet);
		await currentScene.startSpinning();

		const result = await gameClient.fetchSpin({ bet: currentBet });

		if (result.error) {
			await handleSpinFailure(currentScene, result.error);
			return;
		}

		balancePresenter.onSpinResponse(result.wallet);
		gameState.transitionTo('SETTLING');

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
		balancePresenter.onSpinFlowFinished();
		spinSettled = true;
		gameState.transitionTo('IDLE');

	} catch (error) {
		const message = error instanceof Error ? error.message : 'Spin failed';
		await handleSpinFailure(currentScene, message);
	} finally {
		// Success / handleSpinFailure own normal cleanup. Recover only if still mid-spin.
		if (!spinSettled && (gameState.getPhase() === 'SPINNING' || gameState.getPhase() === 'SETTLING')) {
			balancePresenter.onSpinFailed();
			gameState.transitionTo('ERROR');
			gameState.transitionTo('IDLE');
		} else if (!spinSettled && gameState.getPhase() === 'ERROR') {
			gameState.transitionTo('IDLE');
		}
	}
}

/**
 * ERROR is active while the dialog is open; IDLE resumes only after dismiss.
 * Wallet rollback happens here once — do not also call onSpinFlowFinished on this path.
 */
async function handleSpinFailure(scene: MainGameScene, message: string): Promise<void> {
	if (gameState.getPhase() !== 'ERROR') {
		gameState.transitionTo('ERROR');
	}

	if (scene.isSpinning()) {
		await scene.emergencyStop();
	}

	balancePresenter.onSpinFailed();
	await gameHUD.showError(`${message}\n\nPress OK, then pull the lever to retry.`);
	gameState.transitionTo('IDLE');
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

	// Dev/QA: arm next spin to fail (also available via ?failSpin=1).
	if (event.code === 'KeyX' && !event.repeat) {
		gameClient.armNextSpinFailure();
		console.info('Mock: next spin will fail');
		return;
	}

	if (isPaused || !gameState.canAcceptSpinInput() || gameHUD.isModalOpen()) return;

	if (event.code === 'Space' || event.code === 'Enter') {
		event.preventDefault();
		if (event.repeat) return;
		void onLeverTriggered();
	}
}

initGame().catch((err) => console.error("Game crash:", err));
