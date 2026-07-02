import { GameDefinition } from '../game-definition';
import { buildMatrixFromStrips, isMiddleRowWin, rollStopKeys } from './reel-utils';

const config = {
	gameId: 'slot_foo',
	reelStrips: [
		['A', 'B', 'C'],
		['B', 'A', 'C'],
		['C', 'B', 'A'],
	],
	initialStopKeys: ['A', 'B', 'C'],
	winPayout: 5,
} as const;

export const slotFoo: GameDefinition = {
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
