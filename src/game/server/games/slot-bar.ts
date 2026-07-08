import { GameDefinition } from '../game-definition';
import { buildMatrixFromStrips, createMiddleRowPaylineEvaluator, rollStopKeys } from './reel-utils';

const config = {
	gameId: 'slot_bar',
	reelStrips: [
		['X', 'Y', 'Z'],
		['Y', 'X', 'Z'],
		['Z', 'Y', 'X'],
	],
	initialStopKeys: ['X', 'Y', 'Z'],
	maxBet: 10,
	paytable: {
		tripleMultipliers: {
			X: 4,
			Y: 8,
			Z: 12,
		},
	},
} as const;

const evaluateMiddleRowPayline = createMiddleRowPaylineEvaluator(config.paytable);

export const slotBar: GameDefinition = {
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
