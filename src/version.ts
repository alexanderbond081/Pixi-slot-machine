import { Text, TextStyle } from 'pixi.js';

import { BUILD_INFO } from './build-info.generated';

export { BUILD_INFO };

export const formatBuildLabel = (): string => {
	const dirtyMark = BUILD_INFO.gitDirty ? '*' : '';

	if (BUILD_INFO.mode === 'development') {
		return `v${BUILD_INFO.version} · dev · ${BUILD_INFO.gitSha}${dirtyMark}`;
	}

	return `v${BUILD_INFO.version} · ${BUILD_INFO.channel} · ${BUILD_INFO.gitSha}${dirtyMark} · ${BUILD_INFO.buildId}`;
};

export const logBuildInfo = (): void => {
	console.info(`[Slot Game] ${formatBuildLabel()} (built ${BUILD_INFO.builtAt})`);
};

export const createVersionLabel = (): Text => {
	const label = new Text({
		text: formatBuildLabel(),
		style: new TextStyle({
			fontFamily: 'monospace',
			fontSize: 11,
			fill: 0xffffff,
		}),
	});

	label.alpha = 0.45;
	label.eventMode = 'none';

	return label;
};
