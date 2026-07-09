import { IWallet } from './slot-game-interface';
import { WalletScheme } from './slot-game-interface';
import { MockWalletLedger } from './server/mock-persistence';
import { MockPayService } from './server/mock-pay-service';

export class PayClient {
	private readonly payService: MockPayService;

	constructor(walletLedger?: MockWalletLedger, payService?: MockPayService) {
		const ledger = walletLedger ?? new MockWalletLedger();
		this.payService = payService ?? new MockPayService(ledger);
	}

	public async addCoins(amount: number = 1): Promise<IWallet> {
		const wallet = await this.payService.creditAccount(amount);
		return WalletScheme.parse(wallet);
	}
}
