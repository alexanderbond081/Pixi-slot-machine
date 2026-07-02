/** symbols[reelIndex][rowIndex] — top (0), middle payline (1), bottom (2) */
export type ReelMatrix = string[][];

export interface GameDefinition {
	readonly gameId: string;
	createInitialMatrix(): ReelMatrix;
	rollMatrix(): ReelMatrix;
	isWin(matrix: ReelMatrix): boolean;
	getWinPayout(): number;
}
