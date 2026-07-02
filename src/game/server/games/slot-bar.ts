import { GameDefinition } from '../game-definition';
import { buildMatrixFromStrips, isMiddleRowWin, rollStopKeys } from './reel-utils';

const config = {
	gameId: 'slot_bar',
	reelStrips: [
		['X', 'Y', 'Z'],
		['Y', 'X', 'Z'],
		['Z', 'Y', 'X'],
	],
	initialStopKeys: ['X', 'Y', 'Z'],
	winPayout: 15,
} as const;

export const slotBar: GameDefinition = {
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
