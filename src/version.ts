import { Text, TextStyle } from 'pixi.js';

import { BUILD_INFO } from './build-info.generated';

export { BUILD_INFO };

export const formatBuildLabel = (): string => {
	const dirtyMark = BUILD_INFO.gitDirty ? '*' : '';

	if (BUILD_INFO.mode === 'development') {
		return `v${BUILD_INFO.version} · dev · ${BUILD_INFO.gitSha}${dirtyMark}`;
	}

	const head = `v${BUILD_INFO.version} · ${BUILD_INFO.channel} · ${BUILD_INFO.gitSha}${dirtyMark}`;
	return `${head}\n${BUILD_INFO.buildId}`;
};

export const logBuildInfo = (): void => {
	console.info(`[Slot Game] ${formatBuildLabel()} (built ${BUILD_INFO.builtAt})`);
};

const VERSION_TEXT_FILL = '#D9B978';
const VERSION_TEXT_SHADOW = '#4A3520';

export const createVersionLabel = (): Text => {
	const label = new Text({
		text: formatBuildLabel(),
		style: new TextStyle({
			fontFamily: 'monospace',
			fontSize: 12,
			fill: VERSION_TEXT_FILL,
			align: 'center',
			dropShadow: {
				alpha: 0.95,
				angle: -Math.PI / 2,
				blur: 0,
				color: VERSION_TEXT_SHADOW,
				distance: 1,
			},
		}),
	});

	label.anchor.set(0.5);
	label.eventMode = 'none';

	return label;
};
