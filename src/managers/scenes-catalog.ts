import { Scene } from '../scenes/scene';
import { MainGameScene } from '../scenes/main-game-scene';

export interface GameSceneCatalogEntry {
	id: string;
	title: string;
	assetBundle: string;
	createScene: () => Scene;
	gameId?: string;
}

export const gameSceneCatalog: GameSceneCatalogEntry[] = [
	{
		id: 'main-scene',
		title: 'Forest',
		assetBundle: 'main-scene',
		gameId: 'slot_reels_3x3',
		createScene: () => new MainGameScene(),
	},
];
