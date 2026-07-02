import { GameDefinition } from './game-definition';
import { slotBar } from './games/slot-bar';
import { slotFoo } from './games/slot-foo';
import { slotReels3x3 } from './games/slot-reels-3x3';

const games: GameDefinition[] = [slotReels3x3, slotFoo, slotBar];

const gamesById = new Map<string, GameDefinition>(
	games.map((game) => [game.gameId, game]),
);

export const gameRegistry = {
	resolve(gameId: string): GameDefinition | undefined {
		return gamesById.get(gameId);
	},

	listGameIds(): string[] {
		return games.map((game) => game.gameId);
	},
};
