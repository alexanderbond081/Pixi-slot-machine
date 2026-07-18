import { IInitQuery, IInitResponse, ISpinQuery, ISpinResponse, } from './slot-game-interface';
import { InitResponseScheme, SpinResponseScheme, } from './slot-game-interface';
import { MockWalletLedger } from './server/mock-persistence';
import { MockSlotServer } from './server/mock-slot-server';

export class SlotMachineClient {
	private readonly server: MockSlotServer;
	private pendingSpinId: string | null = null;
	private spinCounter = 0;

	constructor(server?: MockSlotServer, walletLedger?: MockWalletLedger) {
		const ledger = walletLedger ?? new MockWalletLedger();
		this.server = server ?? new MockSlotServer(undefined, ledger);
	}

	public armNextInitFailure(): void {
		this.server.armNextInitFailure();
	}

	public armNextSpinFailure(): void {
		this.server.armNextSpinFailure();
	}

	public async fetchInit(query: IInitQuery): Promise<IInitResponse> {
		const response = await this.server.handleInit(query);
		return InitResponseScheme.parse(response);
	}

	public async fetchSpin(query: Omit<ISpinQuery, 'spinId'> & { spinId?: string }): Promise<ISpinResponse> {
		const spinId = query.spinId ?? this.createSpinId();
		this.pendingSpinId = spinId;

		const response = await this.server.handleSpin({ bet: query.bet, spinId });
		const parsed = SpinResponseScheme.parse(response);

		// Stale-response guard: ignore payloads that do not match the in-flight spin.
		// Mock latency is short and the FSM blocks concurrent spins, so a mismatch is
		// unlikely here — the check documents the iGaming idempotency pattern.
		if (this.pendingSpinId !== null && parsed.spinId !== this.pendingSpinId) {
			const expected = this.pendingSpinId;
			this.pendingSpinId = null;
			// Safe no-op path: never apply a mismatched payload to wallet / reels.
			throw new Error(`Stale spin response discarded (got ${parsed.spinId}, expected ${expected})`);
		}

		this.pendingSpinId = null;
		return parsed;
	}

	private createSpinId(): string {
		this.spinCounter += 1;
		return `spin-${Date.now()}-${this.spinCounter}`;
	}
}
