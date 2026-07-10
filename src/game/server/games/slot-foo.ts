import { GameDefinition } from '../game-definition';
import { buildMatrixFromStrips, createMiddleRowPaylineEvaluator, rollStopKeys } from './reel-utils';

const config = {
	gameId: 'slot_foo',
	symbolIds: ['A', 'B', 'C'],
	reelStrips: [
		['A', 'B', 'C'],
		['B', 'A', 'C'],
		['C', 'B', 'A'],
	],
	initialStopKeys: ['A', 'B', 'C'],
	maxBet: 10,
	paytable: {
		tripleMultipliers: {
			A: 4,
			B: 8,
			C: 12,
		},
	},
} as const;

const evaluateMiddleRowPayline = createMiddleRowPaylineEvaluator(config.paytable);

export const slotFoo: GameDefinition = {
	gameId: config.gameId,
	maxBet: config.maxBet,
	paytable: config.paytable,
	symbolIds: config.symbolIds,

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
