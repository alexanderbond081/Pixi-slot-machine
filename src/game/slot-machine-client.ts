import { IInitQuery, IInitResponse, ISpinQuery, ISpinResponse, } from './slot-game-interface';
import { InitResponseScheme, SpinResponseScheme, } from './slot-game-interface';
import { MockWalletLedger } from './server/mock-persistence';
import { MockSlotServer } from './server/mock-slot-server';

export class SlotMachineClient {
	private readonly server: MockSlotServer;

	constructor(server?: MockSlotServer, walletLedger?: MockWalletLedger) {
		const ledger = walletLedger ?? new MockWalletLedger();
		this.server = server ?? new MockSlotServer(undefined, ledger);
	}

	public async fetchInit(query: IInitQuery): Promise<IInitResponse> {
		const response = await this.server.handleInit(query);
		//console.log(response); // !! debug
		return InitResponseScheme.parse(response);
	}

	public async fetchSpin(query: ISpinQuery): Promise<ISpinResponse> {
		const response = await this.server.handleSpin(query);
		return SpinResponseScheme.parse(response);
	}
}
