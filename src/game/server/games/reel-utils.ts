import { ReelMatrix } from '../game-definition';

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

export const isMiddleRowWin = (matrix: ReelMatrix): boolean => {
	const middleRow = getMiddleRow(matrix);
	return middleRow.every((symbol) => symbol === middleRow[0]);
};

const rotateStripToMiddle = (strip: readonly string[], middleSymbol: string): string[] => {
	const symbolIndex = strip.indexOf(middleSymbol);

	if (symbolIndex === -1) {
		throw new Error(`Symbol "${middleSymbol}" is not present in reel strip [${strip.join(', ')}]`);
	}

	const rotation = (symbolIndex - 1 + strip.length) % strip.length;
	return [...strip.slice(rotation), ...strip.slice(0, rotation)];
};
