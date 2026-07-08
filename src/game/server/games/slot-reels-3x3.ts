import { GameDefinition } from '../game-definition';
import { buildMatrixFromStrips, createMiddleRowPaylineEvaluator, rollStopKeys } from './reel-utils';

/** Matches main-game-scene reel orders [[0,1,2],[1,0,2],[2,1,0]] with symbol keys 1,2,3 */
const config = {
	gameId: 'slot_reels_3x3',
	reelStrips: [
		['1', '2', '3'],
		['2', '1', '3'],
		['3', '2', '1'],
	],
	initialStopKeys: ['1', '2', '3'],
	maxBet: 10,
	// Triple-only paytable — RTP ≈ (4+8+12)/27 ≈ 89% (win chance 1/9 per spin)
	paytable: {
		tripleMultipliers: {
			'1': 4, // cherry
			'2': 8, // bell
			'3': 12, // seven
		},
	},
} as const;

const evaluateMiddleRowPayline = createMiddleRowPaylineEvaluator(config.paytable);

export const slotReels3x3: GameDefinition = {
	gameId: config.gameId,
	maxBet: config.maxBet,
	paytable: config.paytable,

	createInitialMatrix(): string[][] {
		return buildMatrixFromStrips(config.reelStrips, config.initialStopKeys);
	},

	rollMatrix(): string[][] {
		const stopKeys = rollStopKeys(config.reelStrips);
		return buildMatrixFromStrips(config.reelStrips, stopKeys);
	},

	evaluatePayline(matrix: string[][]): { isWin: boolean; winMultiplier: number } {
		return evaluateMiddleRowPayline(matrix);
	},
};
