import { Scene } from '../scenes/scene';
import { MainGameScene } from '../scenes/main-game-scene';

export type GameSceneCreateArgs = Record<string, unknown>;

export interface GameSceneCatalogEntry {
	id: string;
	title: string;
	assetBundle: string;
	createScene: (args?: GameSceneCreateArgs) => Scene;
	reinitScene: (scene: Scene, args?: GameSceneCreateArgs) => void;
	gameId?: string;
}

const createForestScene = (args?: GameSceneCreateArgs): Scene => {
	const symbolKeys = args?.symbolKeys;
	const symbolMatrix = args?.symbolMatrix;
	const hasKeys = Array.isArray(symbolKeys);
	const hasMatrix = Array.isArray(symbolMatrix);
	if (hasKeys && hasMatrix) {
		return new MainGameScene(symbolKeys, symbolMatrix);
	}
	if (hasKeys) {
		return new MainGameScene(symbolKeys);
	}
	if (hasMatrix) {
		// Cannot extract symbol keys from the matrix to sequence the textures correctly.
	}
	return new MainGameScene();
};

const reinitForestScene = (scene: Scene, args?: GameSceneCreateArgs): void => {
	const symbolKeys = args?.symbolKeys;
	const symbolMatrix = args?.symbolMatrix;
	const hasKeys = Array.isArray(symbolKeys);
	const hasMatrix = Array.isArray(symbolMatrix);
	if (hasKeys && hasMatrix) {
		(scene as MainGameScene).reInitReels(symbolKeys, symbolMatrix);
	} else {
		console.warn(`Can't reinit Forest scene reels - wrong arguments.`);
	}
};

export const gameSceneCatalog: GameSceneCatalogEntry[] = [
	{
		id: 'main-scene',
		title: 'Forest',
		assetBundle: 'main-scene',
		gameId: 'slot_reels_3x3',
		createScene: createForestScene,
		reinitScene: reinitForestScene,
	},
];
