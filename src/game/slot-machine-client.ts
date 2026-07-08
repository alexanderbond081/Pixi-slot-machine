import { IInitQuery, IInitResponse, ISpinQuery, ISpinResponse, IWallet, } from './slot-game-interface';
import { InitResponseScheme, SpinResponseScheme, } from './slot-game-interface';
import { MockWalletLedger } from './server/mock-persistence';
import { MockSlotServer } from './server/mock-slot-server';

export class SlotMachineClient {
	private readonly server: MockSlotServer;
	private readonly walletLedger: MockWalletLedger;

	constructor(server?: MockSlotServer, walletLedger?: MockWalletLedger) {
		this.walletLedger = walletLedger ?? new MockWalletLedger();
		this.server = server ?? new MockSlotServer(undefined, this.walletLedger);
	}

	public async fetchInit(query: IInitQuery): Promise<IInitResponse> {
		const response = await this.server.handleInit(query);
		return InitResponseScheme.parse(response);
	}

	public async fetchSpin(query: ISpinQuery): Promise<ISpinResponse> {
		const response = await this.server.handleSpin(query);
		return SpinResponseScheme.parse(response);
	}

	/** Credits wallet via platform ledger — bypasses game server (quest reward / easter egg) */
	public cheatCoins(amount: number = 1): IWallet {
		return this.walletLedger.creditWallet(amount);
	}
}
