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

export const cloneReelMatrix = (matrix: ReelMatrix): ReelMatrix => {
	return matrix.map((reel) => [...reel]);
};

/** External casino platform wallet — credits, balance reads, spin settlement writes */
export class MockWalletLedger {
	public loadWallet(): IWallet {
		return { ...this.ensureWalletLoaded() };
	}

	public creditWallet(amount: number): IWallet {
		if (!Number.isInteger(amount) || amount <= 0) {
			throw new Error(`creditWallet: amount must be a positive integer, received ${amount}`);
		}

		return this.mutateWallet((wallet) => {
			wallet.balance += amount;
		});
	}

	/** Atomic spin settlement — debit bet and credit win in a single read-modify-write */
	public settleSpin(bet: number, winAmount: number): IWallet {
		if (!Number.isInteger(bet) || bet < 0) {
			throw new Error(`settleSpin: bet must be a non-negative integer, received ${bet}`);
		}

		if (!Number.isInteger(winAmount) || winAmount < 0) {
			throw new Error(`settleSpin: winAmount must be a non-negative integer, received ${winAmount}`);
		}

		return this.mutateWallet((wallet) => {
			if (wallet.balance < bet) {
				throw new Error(`settleSpin: insufficient balance (have ${wallet.balance}, need ${bet})`);
			}

			wallet.balance = wallet.balance - bet + winAmount;
		});
	}

	public createDefaultWallet(): IWallet {
		return {
			balance: accountConfig.initialBalance,
			currency: accountConfig.currency,
			decimals: accountConfig.decimals,
		};
	}

	private readStoredWallet(): IWallet | null {
		const raw = localStorage.getItem(accountConfig.walletStorageKey);

		if (!raw) {
			return null;
		}

		try {
			return WalletScheme.parse(JSON.parse(raw));
		} catch (error) {
			console.warn('MockWalletLedger: invalid wallet data, resetting', error);
			return null;
		}
	}

	private saveWallet(wallet: IWallet): void {
		const validated = WalletScheme.parse(wallet);
		localStorage.setItem(accountConfig.walletStorageKey, JSON.stringify(validated));
	}

	/** Create default wallet only when storage is missing or corrupt — never load-then-save an existing record */
	private ensureWalletLoaded(): IWallet {
		const stored = this.readStoredWallet();

		if (stored) {
			return stored;
		}

		const wallet = this.createDefaultWallet();
		this.saveWallet(wallet);

		return wallet;
	}

	/** Single entry point for balance mutations — read, apply, write without yielding */
	private mutateWallet(apply: (wallet: IWallet) => void): IWallet {
		const wallet = this.ensureWalletLoaded();
		apply(wallet);
		this.saveWallet(wallet);

		return { ...wallet };
	}
}

/** Game server session store — player profile and per-game reel snapshots */
export class MockGameSessionStore {
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
