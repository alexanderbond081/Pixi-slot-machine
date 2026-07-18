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
	private reelStates: Record<string, ReelMatrix>;

	private activeGame: GameDefinition | null = null;
	private spinSequence = 0;

	/** Dev/QA: next init returns an error payload. */
	private failNextInit = false;
	/** Dev/QA: next spin returns an error payload (wallet unchanged). */
	private failNextSpin = false;

	constructor(sessionStore?: MockGameSessionStore, walletLedger?: MockWalletLedger) {
		this.sessionStore = sessionStore ?? new MockGameSessionStore();
		this.walletLedger = walletLedger ?? new MockWalletLedger();

		const session = this.sessionStore.loadSession() ?? this.sessionStore.createEmptySession();
		this.player = session.player;
		this.reelStates = session.reelStates;

		this.persistSession();
	}

	public listAvailableGameIds(): string[] {
		return gameRegistry.listGameIds();
	}

	/** Arm a one-shot init failure for manual QA (`?failInit=1` or client helper). */
	public armNextInitFailure(): void {
		this.failNextInit = true;
	}

	/** Arm a one-shot spin failure for manual QA (press X in-game, or client helper). */
	public armNextSpinFailure(): void {
		this.failNextSpin = true;
	}

	public async handleInit(query: IInitQuery): Promise<IInitResponse> {
		const parsedQuery = InitQueryScheme.safeParse(query);

		if (!parsedQuery.success) {
			return this.buildInitError(parsedQuery.error.message);
		}

		if (this.failNextInit) {
			this.failNextInit = false;
			return this.buildInitError('Simulated init failure', parsedQuery.data.gameId);
		}

		const game = gameRegistry.resolve(parsedQuery.data.gameId);

		if (!game) {
			return this.buildInitError(`Unknown gameId: ${parsedQuery.data.gameId}`, parsedQuery.data.gameId);
		}

		this.activeGame = game;

		if (!this.reelStates[game.gameId]) {
			this.reelStates[game.gameId] = game.createInitialMatrix();
			this.persistSession();
		}

		return {
			player: { ...this.player },
			wallet: this.readWallet(),
			gameId: game.gameId,
			maxBet: game.maxBet,
			symbolIds: [...game.symbolIds],
			symbols: cloneReelMatrix(this.reelStates[game.gameId]),
		};
	}

	public async handleSpin(query: ISpinQuery): Promise<ISpinResponse> {
		await this.simulateNetworkDelay();

		const spinId = this.resolveSpinId(query);

		if (!this.activeGame) {
			return this.buildSpinError(spinId, 'Game not initialized. Call init first.');
		}

		const parsedQuery = SpinQueryScheme.safeParse(query);

		if (!parsedQuery.success) {
			return this.buildSpinError(spinId, parsedQuery.error.message);
		}

		if (this.failNextSpin) {
			this.failNextSpin = false;
			return this.buildSpinError(spinId, 'Simulated spin failure');
		}

		const game = this.activeGame;
		const { bet } = parsedQuery.data;
		const currentSymbols = this.getReelState(game);

		if (bet > game.maxBet) {
			return {
				spinId,
				isWin: false,
				winAmount: 0,
				wallet: this.readWallet(),
				symbols: cloneReelMatrix(currentSymbols),
				error: `Bet exceeds maximum allowed (${game.maxBet})`,
			};
		}

		const symbols = game.rollMatrix();
		const outcome = game.evaluatePayline(symbols);
		const winAmount = bet * outcome.winMultiplier;

		try {
			const wallet = this.walletLedger.settleSpin(bet, winAmount);

			this.reelStates[game.gameId] = symbols;
			this.persistSession();

			return {
				spinId,
				isWin: outcome.isWin,
				winAmount,
				wallet,
				symbols: cloneReelMatrix(symbols),
			};
		} catch (error) {
			if (error instanceof Error && error.message.startsWith('settleSpin: insufficient balance')) {
				return {
					spinId,
					isWin: false,
					winAmount: 0,
					wallet: this.readWallet(),
					symbols: cloneReelMatrix(currentSymbols),
					error: 'Insufficient balance',
				};
			}

			throw error;
		}
	}

	private resolveSpinId(query: ISpinQuery): string {
		if (typeof query.spinId === 'string' && query.spinId.length > 0) {
			return query.spinId;
		}

		this.spinSequence += 1;
		return `mock-spin-${this.spinSequence}`;
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

	private readWallet(): IWallet {
		return { ...this.walletLedger.loadWallet() };
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
			wallet: this.readWallet(),
			gameId: resolvedGameId,
			maxBet: this.activeGame?.maxBet ?? 0,
			symbolIds: this.activeGame ? [...this.activeGame.symbolIds] : [],
			symbols,
			error: message,
		};
	}

	private buildSpinError(spinId: string, message: string): ISpinResponse {
		const symbols = this.activeGame
			? cloneReelMatrix(this.getReelState(this.activeGame))
			: [];

		return {
			spinId,
			isWin: false,
			winAmount: 0,
			wallet: this.readWallet(),
			symbols,
			error: message,
		};
	}
}
