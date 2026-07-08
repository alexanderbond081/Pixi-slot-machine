import { MiddleRowPaytable, ReelMatrix, SpinOutcome } from '../game-definition';

export const buildMatrixFromStrips = (
	reelStrips: readonly (readonly string[])[],
	stopKeys: readonly string[],
): ReelMatrix => {
	return reelStrips.map((strip, reelIndex) => rotateStripToMiddle(strip, stopKeys[reelIndex]));
};

export const rollStopKeys = (reelStrips: readonly (readonly string[])[]): string[] => {
	return reelStrips.map((strip) => {
		const index = Math.floor(Math.random() * strip.length);
		return strip[index];
	});
};

export const getMiddleRow = (matrix: ReelMatrix): string[] => {
	return matrix.map((reel) => reel[1]);
};

export const evaluateMiddleRowPaytable = (matrix: ReelMatrix, paytable: MiddleRowPaytable): number => {
	const [left, middle, right] = getMiddleRow(matrix);

	if (left === middle && middle === right) {
		return paytable.tripleMultipliers[left] ?? 0;
	}

	return 0;
};

export const createMiddleRowPaylineEvaluator = (paytable: MiddleRowPaytable): ((matrix: ReelMatrix) => SpinOutcome) => {
	return (matrix: ReelMatrix): SpinOutcome => {
		const winMultiplier = evaluateMiddleRowPaytable(matrix, paytable);

		return {
			isWin: winMultiplier > 0,
			winMultiplier,
		};
	};
};

const rotateStripToMiddle = (strip: readonly string[], middleSymbol: string): string[] => {
	const symbolIndex = strip.indexOf(middleSymbol);

	if (symbolIndex === -1) {
		throw new Error(`Symbol "${middleSymbol}" is not present in reel strip [${strip.join(', ')}]`);
	}

	const rotation = (symbolIndex - 1 + strip.length) % strip.length;
	return [...strip.slice(rotation), ...strip.slice(0, rotation)];
};
