import { z } from 'zod';
import { IPlayer, IWallet, PlayerScheme, WalletScheme } from '../slot-game-interface';
import { accountConfig } from './account-config';
import { ReelMatrix } from './game-definition';

const nonEmptyString = z.string().min(1);

const ReelMatrixScheme = z.array(z.array(nonEmptyString).min(1)).min(1);

const MockGameSessionScheme = z.object({
	player: PlayerScheme,
	reelStates: z.record(nonEmptyString, ReelMatrixScheme),
});

export type MockGameSession = z.infer<typeof MockGameSessionScheme>;

/** @deprecated Legacy single-key snapshot — used only for one-time migration */
const MockLegacyPersistedStateScheme = MockGameSessionScheme.extend({
	wallet: WalletScheme,
});

const migrateLegacyStorageIfNeeded = (): void => {
	const legacyRaw = localStorage.getItem(accountConfig.legacyStorageKey);

	if (!legacyRaw) {
		return;
	}

	const walletExists = localStorage.getItem(accountConfig.walletStorageKey) !== null;
	const sessionExists = localStorage.getItem(accountConfig.sessionStorageKey) !== null;

	if (walletExists || sessionExists) {
		localStorage.removeItem(accountConfig.legacyStorageKey);
		return;
	}

	try {
		const legacy = MockLegacyPersistedStateScheme.parse(JSON.parse(legacyRaw));
		localStorage.setItem(accountConfig.walletStorageKey, JSON.stringify(legacy.wallet));
		localStorage.setItem(
			accountConfig.sessionStorageKey,
			JSON.stringify({ player: legacy.player, reelStates: legacy.reelStates }),
		);
	} catch (error) {
		console.warn('Mock persistence: legacy storage migration failed', error);
	}

	localStorage.removeItem(accountConfig.legacyStorageKey);
};

export const cloneReelMatrix = (matrix: ReelMatrix): ReelMatrix => {
	return matrix.map((reel) => [...reel]);
};

/** External casino platform wallet — credits, balance reads, spin settlement writes */
export class MockWalletLedger {
	constructor() {
		migrateLegacyStorageIfNeeded();
	}

	public loadWallet(): IWallet {
		const raw = localStorage.getItem(accountConfig.walletStorageKey);

		if (!raw) {
			return this.createDefaultWallet();
		}

		try {
			return WalletScheme.parse(JSON.parse(raw));
		} catch (error) {
			console.warn('MockWalletLedger: invalid wallet data, resetting', error);
			return this.createDefaultWallet();
		}
	}

	public saveWallet(wallet: IWallet): void {
		const validated = WalletScheme.parse(wallet);
		localStorage.setItem(accountConfig.walletStorageKey, JSON.stringify(validated));
	}

	public creditWallet(amount: number): IWallet {
		if (!Number.isInteger(amount) || amount <= 0) {
			throw new Error(`creditWallet: amount must be a positive integer, received ${amount}`);
		}

		const wallet = this.loadWallet();
		wallet.balance += amount;
		this.saveWallet(wallet);

		return { ...wallet };
	}

	public createDefaultWallet(): IWallet {
		return {
			balance: accountConfig.initialBalance,
			currency: accountConfig.currency,
			decimals: accountConfig.decimals,
		};
	}
}

/** Game server session store — player profile and per-game reel snapshots */
export class MockGameSessionStore {
	constructor() {
		migrateLegacyStorageIfNeeded();
	}

	public loadSession(): MockGameSession | null {
		const raw = localStorage.getItem(accountConfig.sessionStorageKey);

		if (!raw) {
			return null;
		}

		try {
			return MockGameSessionScheme.parse(JSON.parse(raw));
		} catch (error) {
			console.warn('MockGameSessionStore: invalid session data, resetting', error);
			return null;
		}
	}

	public saveSession(session: MockGameSession): void {
		const validated = MockGameSessionScheme.parse(session);
		localStorage.setItem(accountConfig.sessionStorageKey, JSON.stringify(validated));
	}

	public createEmptySession(): MockGameSession {
		return {
			player: {
				id: accountConfig.playerId,
				userName: accountConfig.playerName,
			},
			reelStates: {},
		};
	}
}
