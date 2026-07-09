import { IWallet } from '../slot-game-interface';
import { MockWalletLedger } from './mock-persistence';

export class MockPayService {
	private static readonly MIN_CREDIT_DELAY_MS = 150;
	private static readonly MAX_CREDIT_DELAY_MS = 400;

	private readonly walletLedger: MockWalletLedger;

	constructor(walletLedger: MockWalletLedger) {
		this.walletLedger = walletLedger;
	}

	public async creditAccount(amount: number): Promise<IWallet> {
		await this.simulateNetworkDelay();
		return this.walletLedger.creditWallet(amount);
	}

	private simulateNetworkDelay(): Promise<void> {
		const { MIN_CREDIT_DELAY_MS, MAX_CREDIT_DELAY_MS } = MockPayService;
		const delayMs = MIN_CREDIT_DELAY_MS + Math.floor(Math.random() * (MAX_CREDIT_DELAY_MS - MIN_CREDIT_DELAY_MS + 1));
		return delay(delayMs);
	}
}
