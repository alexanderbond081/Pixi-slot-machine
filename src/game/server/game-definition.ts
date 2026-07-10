/** symbols[reelIndex][rowIndex] — top (0), middle payline (1), bottom (2) */
export type ReelMatrix = string[][];

export interface MiddleRowPaytable {
	readonly tripleMultipliers: Readonly<Record<string, number>>;
}

export interface SpinOutcome {
	isWin: boolean;
	winMultiplier: number;
}

export interface GameDefinition {
	readonly gameId: string;
	readonly maxBet: number;
	readonly paytable: MiddleRowPaytable;
	/** Symbol ids in client atlas order — includes non-paying symbols */
	readonly symbolIds: readonly string[];
	createInitialMatrix(): ReelMatrix;
	rollMatrix(): ReelMatrix;
	evaluatePayline(matrix: ReelMatrix): SpinOutcome;
}
