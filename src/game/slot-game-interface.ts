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
	gameId: string;
}

export const InitQueryScheme = z.object({
	token: nonEmptyString,
	gameId: nonEmptyString,
});

export interface IInitResponse {
	player: IPlayer;
	wallet: IWallet;
	gameId: string;
	maxBet: number;
	/** Symbol ids in atlas / texture order — not derived from paytable or visible matrix */
	symbolIds: string[];
	symbols: string[][];
	error?: string;
}

export const InitResponseScheme = z.object({
	player: PlayerScheme,
	wallet: WalletScheme,
	gameId: nonEmptyString,
	maxBet: nonNegativeInt,
	symbolIds: z.array(nonEmptyString),
	symbols: z.array(z.array(nonEmptyString)),
	error: z.string().optional(),
});

// spin query objects
export interface ISpinQuery {
	bet: number;
	/** Client-issued round id; server echoes it so stale responses can be rejected. */
	spinId: string;
}

export const SpinQueryScheme = z.object({
	bet: nonNegativeInt,
	spinId: nonEmptyString,
});

export interface ISpinResponse {
	/** Echo of the request spinId (or server-assigned id when request omitted it). */
	spinId: string;
	isWin: boolean;
	winAmount: number;
	wallet: IWallet;
	symbols: string[][];
	error?: string;
}

export const SpinResponseScheme = z.object({
	spinId: nonEmptyString,
	isWin: z.boolean(),
	winAmount: nonNegativeInt,
	wallet: WalletScheme,
	symbols: z.array(z.array(nonEmptyString)),
	error: z.string().optional(),
});

