export interface ISpinResponse {
	isWin: boolean;
	symbols: any[];
}

export class SlotMachineModel {
	// Simulates a game server
	// !! under construction	

	readonly keys: any[] = [1, 2, 3];
	private readonly totalSymbols = 3;
	private readonly totalReels = 3;

	public async fetchSpinResult(): Promise<ISpinResponse> {
		await new Promise(resolve => setTimeout(resolve, 1000));

		const symbols: any[] = [];

		for (let i = 0; i < this.totalReels; i++) {
			const index: number = Math.floor(Math.random() * this.totalSymbols);
			symbols.push(this.keys[index]);
		}

		const isWin = symbols.every(val => val === symbols[0]);

		return { isWin, symbols };
	}
}
