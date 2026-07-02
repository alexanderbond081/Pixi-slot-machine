import { ISpinResponse } from './slot-game-interface';
import { SlotMachineClient } from './slot-machine-client';

const LEGACY_GAME_ID = 'slot_reels_3x3';
const LEGACY_BET = 1;

export class SlotMachineModel {
	private readonly client: SlotMachineClient;
	private initialized = false;

	/** @deprecated Use symbol keys from init response — kept for index.ts compatibility */
	public readonly keys: number[] = [1, 2, 3];

	constructor(client?: SlotMachineClient) {
		this.client = client ?? new SlotMachineClient();
	}

	/** @deprecated Use SlotMachineClient.fetchSpin — kept for index.ts compatibility */
	public async fetchSpinResult(): Promise<ISpinResponse> {
		if (!this.initialized) {
			await this.client.fetchInit({ token: 'mock', game_id: LEGACY_GAME_ID });
			this.initialized = true;
		}

		return this.client.fetchSpin({ bet: LEGACY_BET });
	}
}
