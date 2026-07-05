import { IInitQuery, IInitResponse, ISpinQuery, ISpinResponse, IPlayer, IWallet, } from '../slot-game-interface';
import { InitQueryScheme, SpinQueryScheme, } from '../slot-game-interface';
import { GameDefinition } from './game-definition';
import { gameRegistry } from './game-registry';
import { cloneReelMatrix, MockGameSessionStore, MockWalletLedger, } from './mock-persistence';
import { ReelMatrix } from './game-definition';

export class MockSlotServer {
	private static readonly MIN_SPIN_DELAY_MS = 300;
	private static readonly MAX_SPIN_DELAY_MS = 900;

	private readonly sessionStore: MockGameSessionStore;
	private readonly walletLedger: MockWalletLedger;

	private player: IPlayer;
	private wallet: IWallet;
	private reelStates: Record<string, ReelMatrix>;

	private activeGame: GameDefinition | null = null;

	constructor(sessionStore?: MockGameSessionStore, walletLedger?: MockWalletLedger) {
		this.sessionStore = sessionStore ?? new MockGameSessionStore();
		this.walletLedger = walletLedger ?? new MockWalletLedger();

		const session = this.sessionStore.loadSession() ?? this.sessionStore.createEmptySession();
		this.player = session.player;
		this.reelStates = session.reelStates;
		this.wallet = this.walletLedger.loadWallet();

		this.persistSession();
		this.walletLedger.saveWallet(this.wallet);
	}

	public listAvailableGameIds(): string[] {
		return gameRegistry.listGameIds();
	}

	public async handleInit(query: IInitQuery): Promise<IInitResponse> {
		this.syncWalletFromPlatform();

		const parsedQuery = InitQueryScheme.safeParse(query);

		if (!parsedQuery.success) {
			return this.buildInitError(parsedQuery.error.message);
		}

		const game = gameRegistry.resolve(parsedQuery.data.game_id);

		if (!game) {
			return this.buildInitError(`Unknown game_id: ${parsedQuery.data.game_id}`, parsedQuery.data.game_id);
		}

		this.activeGame = game;

		if (!this.reelStates[game.gameId]) {
			this.reelStates[game.gameId] = game.createInitialMatrix();
			this.persistSession();
		}

		return {
			player: { ...this.player },
			wallet: { ...this.wallet },
			game_id: game.gameId,
			symbols: cloneReelMatrix(this.reelStates[game.gameId]),
		};
	}

	public async handleSpin(query: ISpinQuery): Promise<ISpinResponse> {
		this.syncWalletFromPlatform();

		await this.simulateNetworkDelay();

		if (!this.activeGame) {
			return this.buildSpinError('Game not initialized. Call init first.');
		}

		const parsedQuery = SpinQueryScheme.safeParse(query);

		if (!parsedQuery.success) {
			return this.buildSpinError(parsedQuery.error.message);
		}

		const game = this.activeGame;
		const { bet } = parsedQuery.data;
		const currentSymbols = this.getReelState(game);

		if (bet > this.wallet.balance) {
			return {
				isWin: false,
				wallet: { ...this.wallet },
				symbols: cloneReelMatrix(currentSymbols),
				error: 'Insufficient balance',
			};
		}

		this.wallet.balance -= bet;

		const symbols = game.rollMatrix();
		const isWin = game.isWin(symbols);

		if (isWin) {
			this.wallet.balance += game.getWinPayout();
		}

		this.reelStates[game.gameId] = symbols;
		this.walletLedger.saveWallet(this.wallet);
		this.persistSession();

		return {
			isWin,
			wallet: { ...this.wallet },
			symbols: cloneReelMatrix(symbols),
		};
	}

	private getReelState(game: GameDefinition): string[][] {
		return this.reelStates[game.gameId] ?? game.createInitialMatrix();
	}

	private persistSession(): void {
		this.sessionStore.saveSession({
			player: this.player,
			reelStates: this.reelStates,
		});
	}

	private syncWalletFromPlatform(): void {
		this.wallet = this.walletLedger.loadWallet();
	}

	private simulateNetworkDelay(): Promise<void> {
		const { MIN_SPIN_DELAY_MS, MAX_SPIN_DELAY_MS } = MockSlotServer;
		const delayMs = MIN_SPIN_DELAY_MS + Math.floor(Math.random() * (MAX_SPIN_DELAY_MS - MIN_SPIN_DELAY_MS + 1));
		return delay(delayMs);
	}

	private buildInitError(message: string, gameId?: string): IInitResponse {
		const resolvedGameId = gameId ?? this.activeGame?.gameId ?? 'unknown';
		const symbols = this.activeGame
			? cloneReelMatrix(this.getReelState(this.activeGame))
			: [];

		return {
			player: { ...this.player },
			wallet: { ...this.wallet },
			game_id: resolvedGameId,
			symbols,
			error: message,
		};
	}

	private buildSpinError(message: string): ISpinResponse {
		const symbols = this.activeGame
			? cloneReelMatrix(this.getReelState(this.activeGame))
			: [];

		return {
			isWin: false,
			wallet: { ...this.wallet },
			symbols,
			error: message,
		};
	}
}
