import { GameDefinition } from '../game-definition';
import { buildMatrixFromStrips, isMiddleRowWin, rollStopKeys } from './reel-utils';

/** Matches main-game-scene reel orders [[0,1,2],[1,0,2],[2,1,0]] with symbol keys 1,2,3 */
const config = {
	gameId: 'slot_reels_3x3',
	reelStrips: [
		['1', '2', '3'],
		['2', '1', '3'],
		['3', '2', '1'],
	],
	initialStopKeys: ['1', '2', '3'],
	winPayout: 10,
} as const;

export const slotReels3x3: GameDefinition = {
	gameId: config.gameId,

	createInitialMatrix(): string[][] {
		return buildMatrixFromStrips(config.reelStrips, config.initialStopKeys);
	},

	rollMatrix(): string[][] {
		const stopKeys = rollStopKeys(config.reelStrips);
		return buildMatrixFromStrips(config.reelStrips, stopKeys);
	},

	isWin(matrix: string[][]): boolean {
		return isMiddleRowWin(matrix);
	},

	getWinPayout(): number {
		return config.winPayout;
	},
};
