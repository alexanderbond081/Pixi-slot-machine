import { IInitQuery, IInitResponse, ISpinQuery, ISpinResponse, } from './slot-game-interface';
import { InitResponseScheme, SpinResponseScheme, } from './slot-game-interface';
import { MockSlotServer } from './server/mock-slot-server';

export class SlotMachineClient {
	private readonly server: MockSlotServer;

	constructor(server?: MockSlotServer) {
		this.server = server ?? new MockSlotServer();
	}

	public async fetchInit(query: IInitQuery): Promise<IInitResponse> {
		const response = await this.server.handleInit(query);
		return InitResponseScheme.parse(response);
	}

	public async fetchSpin(query: ISpinQuery): Promise<ISpinResponse> {
		const response = await this.server.handleSpin(query);
		return SpinResponseScheme.parse(response);
	}
}
