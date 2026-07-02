import { z } from 'zod';
import { PlayerScheme, WalletScheme } from '../slot-game-interface';
import { accountConfig } from './account-config';
import { ReelMatrix } from './game-definition';

const nonEmptyString = z.string().min(1);

const ReelMatrixScheme = z.array(z.array(nonEmptyString).min(1)).min(1);

export const MockPersistedStateScheme = z.object({
	player: PlayerScheme,
	wallet: WalletScheme,
	reelStates: z.record(nonEmptyString, ReelMatrixScheme),
});

export type MockPersistedState = z.infer<typeof MockPersistedStateScheme>;

export const createEmptyPersistedState = (): MockPersistedState => {
	return {
		player: {
			id: accountConfig.playerId,
			userName: accountConfig.playerName,
		},
		wallet: {
			balance: accountConfig.initialBalance,
			currency: accountConfig.currency,
			decimals: accountConfig.decimals,
		},
		reelStates: {},
	};
};

export const loadPersistedState = (): MockPersistedState | null => {
	const raw = localStorage.getItem(accountConfig.storageKey);

	if (!raw) {
		return null;
	}

	try {
		return MockPersistedStateScheme.parse(JSON.parse(raw));
	} catch (error) {
		console.warn('Mock persistence: invalid stored state, resetting', error);
		return null;
	}
};

export const savePersistedState = (state: MockPersistedState): void => {
	const validated = MockPersistedStateScheme.parse(state);
	localStorage.setItem(accountConfig.storageKey, JSON.stringify(validated));
};

export const cloneReelMatrix = (matrix: ReelMatrix): ReelMatrix => {
	return matrix.map((reel) => [...reel]);
};
