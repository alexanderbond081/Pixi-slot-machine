import { z } from 'zod';

const nonNegativeInt = z.number().int().nonnegative();
const nonEmptyString = z.string().min(1);

// player object
export interface IPlayer {
	id: string;
	userName: string;
}

export const PlayerScheme = z.object({
	id: nonEmptyString,
	userName: nonEmptyString,
});

// wallet object
export interface IWallet {
	balance: number;
	currency: string; // normally it should be ISO 4217, but in current game implementation it's just coins
	decimals: number;
	lastTransactionIndex: number;
}

export const WalletScheme = z.object({
	balance: nonNegativeInt,
	currency: nonEmptyString,
	decimals: nonNegativeInt,
	lastTransactionIndex: nonNegativeInt,
});

// init query objects
export interface IInitQuery {
	token: string;
	game_id: string;
}

export const InitQueryScheme = z.object({
	token: nonEmptyString,
	game_id: nonEmptyString,
});

export interface IInitResponse {
	player: IPlayer;
	wallet: IWallet;
	game_id: string;
	max_bet: number;
	symbols: string[][];
	error?: string;
}

export const InitResponseScheme = z.object({
	player: PlayerScheme,
	wallet: WalletScheme,
	game_id: nonEmptyString,
	max_bet: nonNegativeInt,
	symbols: z.array(z.array(nonEmptyString)),
	error: z.string().optional(),
});

// spin query objects
export interface ISpinQuery {
	bet: number;
}

export const SpinQueryScheme = z.object({
	bet: nonNegativeInt,
});

export interface ISpinResponse {
	isWin: boolean;
	winAmount: number;
	wallet: IWallet;
	symbols: string[][];
	error?: string;
}

export const SpinResponseScheme = z.object({
	isWin: z.boolean(),
	winAmount: nonNegativeInt,
	wallet: WalletScheme,
	symbols: z.array(z.array(nonEmptyString)),
	error: z.string().optional(),
});

