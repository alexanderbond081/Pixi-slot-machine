import { IInitQuery, IInitResponse, ISpinQuery, ISpinResponse, } from '../slot-game-interface';
import { InitQueryScheme, SpinQueryScheme, } from '../slot-game-interface';
import { GameDefinition } from './game-definition';
import { gameRegistry } from './game-registry';
import { cloneReelMatrix, createEmptyPersistedState, loadPersistedState, MockPersistedState, savePersistedState, } from './mock-persistence';

export class MockSlotServer {
	private static readonly MIN_SPIN_DELAY_MS = 300;
	private static readonly MAX_SPIN_DELAY_MS = 900;

	private state: MockPersistedState;
	private activeGame: GameDefinition | null = null;

	constructor() {
		this.state = loadPersistedState() ?? createEmptyPersistedState();
		savePersistedState(this.state);
	}

	public listAvailableGameIds(): string[] {
		return gameRegistry.listGameIds();
	}

	public async handleInit(query: IInitQuery): Promise<IInitResponse> {
		const parsedQuery = InitQueryScheme.safeParse(query);

		if (!parsedQuery.success) {
			return this.buildInitError(parsedQuery.error.message);
		}

		const game = gameRegistry.resolve(parsedQuery.data.game_id);

		if (!game) {
			return this.buildInitError(`Unknown game_id: ${parsedQuery.data.game_id}`, parsedQuery.data.game_id);
		}

		this.activeGame = game;

		if (!this.state.reelStates[game.gameId]) {
			this.state.reelStates[game.gameId] = game.createInitialMatrix();
			savePersistedState(this.state);
		}

		return {
			player: { ...this.state.player },
			wallet: { ...this.state.wallet },
			game_id: game.gameId,
			symbols: cloneReelMatrix(this.state.reelStates[game.gameId]),
		};
	}

	public async handleSpin(query: ISpinQuery): Promise<ISpinResponse> {
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

		if (bet > this.state.wallet.balance) {
			return {
				isWin: false,
				wallet: { ...this.state.wallet },
				symbols: cloneReelMatrix(currentSymbols),
				error: 'Insufficient balance',
			};
		}

		this.state.wallet.balance -= bet;

		const symbols = game.rollMatrix();
		const isWin = game.isWin(symbols);

		if (isWin) {
			this.state.wallet.balance += game.getWinPayout();
		}

		this.state.reelStates[game.gameId] = symbols;
		savePersistedState(this.state);

		return {
			isWin,
			wallet: { ...this.state.wallet },
			symbols: cloneReelMatrix(symbols),
		};
	}

	private getReelState(game: GameDefinition): string[][] {
		return this.state.reelStates[game.gameId] ?? game.createInitialMatrix();
	}

	private simulateNetworkDelay(): Promise<void> {
		const { MIN_SPIN_DELAY_MS, MAX_SPIN_DELAY_MS } = MockSlotServer;
		const delayMs = MIN_SPIN_DELAY_MS + Math.floor(Math.random() * (MAX_SPIN_DELAY_MS - MIN_SPIN_DELAY_MS + 1));
		return new Promise((resolve) => setTimeout(resolve, delayMs));
	}

	private buildInitError(message: string, gameId?: string): IInitResponse {
		const resolvedGameId = gameId ?? this.activeGame?.gameId ?? 'unknown';
		const symbols = this.activeGame
			? cloneReelMatrix(this.getReelState(this.activeGame))
			: [];

		return {
			player: { ...this.state.player },
			wallet: { ...this.state.wallet },
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
			wallet: { ...this.state.wallet },
			symbols,
			error: message,
		};
	}
}
