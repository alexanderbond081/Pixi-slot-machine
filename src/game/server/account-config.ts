/** Mock account defaults — server-only, not exposed to the client */
export const accountConfig = {
	playerId: 'lucky_guy',
	playerName: 'Lucky guy',
	initialBalance: 10,
	currency: 'coins',
	decimals: 0,
	storageKey: 'slot-game:mock:lucky_guy',
} as const;
