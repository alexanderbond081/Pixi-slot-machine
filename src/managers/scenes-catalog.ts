import { Scene } from '../scenes/scene';
import { MainGameScene } from '../scenes/main-game-scene';

/**
 * Describes a navigable game scene for the lobby / scene manager.
 * Non-game screens (loading, cutscenes, quest rooms) use the same shape but omit gameId.
 */
export interface SceneCatalogEntry {
	/** Stable key for navigation and lookup (independent from gameId) */
	id: string;
	/** Human-readable label for lobby widget tooltip and transition title */
	title: string;
	/** Pixi Assets bundle name from manifest.json */
	assetBundle: string;
	/** Factory creates a fresh scene instance; init() is called by the scene manager after assets are loaded */
	createScene: () => Scene;
	/** Server game_id for fetchInit(); omitted for non-slot / intermediate screens */
	gameId?: string;
}

/**
 * Ordered list of scenes as they appear in the lobby / navigation UI.
 * Use this when rendering selectable scene widgets.
 */
export const sceneCatalog: SceneCatalogEntry[] = [
	{
		id: 'main-game',
		title: 'Forest Slot',
		assetBundle: 'main-scene',
		gameId: 'slot_reels_3x3',
		createScene: () => new MainGameScene(),
	},
];

/**
 * Lookup map built from sceneCatalog for O(1) access by id during navigation.
 */
export const sceneCatalogById: Readonly<Record<string, SceneCatalogEntry>> = Object.fromEntries(
	sceneCatalog.map((entry) => [entry.id, entry]),
);

/**
 * Lookup by server game_id; only entries that participate in the game API are indexed.
 */
export const sceneCatalogByGameId: Readonly<Record<string, SceneCatalogEntry>> = Object.fromEntries(
	sceneCatalog
		.filter((entry): entry is SceneCatalogEntry & { gameId: string } => entry.gameId !== undefined)
		.map((entry) => [entry.gameId, entry]),
);
