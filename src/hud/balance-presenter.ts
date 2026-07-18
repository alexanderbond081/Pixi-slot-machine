import { IWallet } from '../game/slot-game-interface';
import { GameHUD } from './game-hud';

type BalancePhase = 'idle' | 'spin_active' | 'reveal';

const BET_DEBIT_DURATION_MS = 350;
const DEFAULT_CATCHUP_DURATION_MS = 900;
const EXTERNAL_CREDIT_DURATION_MS = 250;
const LOSS_REVEAL_DURATION_MS = 350;

export class BalancePresenter {
	private authoritativeWallet: IWallet = {
		balance: 0,
		currency: 'coins',
		decimals: 0,
		lastTransactionIndex: 0,
	};

	private lastAppliedTransactionIndex = -1;
	private phase: BalancePhase = 'idle';
	private pendingRevealWallet: IWallet | null = null;

	constructor(private readonly hud: GameHUD) { }

	public getWallet(): IWallet {
		return { ...this.authoritativeWallet };
	}

	public applySnapshot(wallet: IWallet, options?: { instant?: boolean; durationMs?: number }): void {
		if (!this.storeSnapshotIfNewer(wallet)) {
			return;
		}

		if (this.phase === 'spin_active') {
			this.pendingRevealWallet = { ...this.authoritativeWallet };
			return;
		}

		this.renderAuthoritativeBalance(options);
	}

	public onSpinStarted(bet: number): void {
		this.phase = 'spin_active';
		this.pendingRevealWallet = null;
		this.hud.animateBalanceTo(this.hud.getDisplayedBalance() - bet, BET_DEBIT_DURATION_MS);
	}

	public onSpinResponse(wallet: IWallet): void {
		if (!this.storeSnapshotIfNewer(wallet)) {
			return;
		}

		this.pendingRevealWallet = { ...this.authoritativeWallet };
	}

	public onExternalCredit(wallet: IWallet, creditAmount?: number): void {
		if (!this.storeSnapshotIfNewer(wallet)) {
			return;
		}

		if (this.phase === 'spin_active') {
			this.pendingRevealWallet = { ...this.authoritativeWallet };

			if (creditAmount != null && creditAmount > 0) {
				this.hud.animateBalanceTo(
					this.hud.getDisplayedBalance() + creditAmount,
					EXTERNAL_CREDIT_DURATION_MS,
				);
			}

			return;
		}

		this.hud.animateBalanceTo(this.authoritativeWallet.balance, EXTERNAL_CREDIT_DURATION_MS);
	}

	public onReelsStopped(options?: { durationMs?: number }): void {
		this.phase = 'reveal';

		const targetWallet = this.pendingRevealWallet ?? this.authoritativeWallet;
		const durationMs = options?.durationMs ?? DEFAULT_CATCHUP_DURATION_MS;

		this.hud.animateBalanceTo(targetWallet.balance, durationMs);
		this.pendingRevealWallet = null;
	}

	public onSpinFlowFinished(): void {
		this.phase = 'idle';
		this.pendingRevealWallet = null;
		this.hud.setDisplayedBalance(this.authoritativeWallet.balance);
	}

	/** Restore displayed balance after a failed spin (bet was only optimistic). */
	public onSpinFailed(): void {
		this.phase = 'idle';
		this.pendingRevealWallet = null;
		this.hud.animateBalanceTo(this.authoritativeWallet.balance, BET_DEBIT_DURATION_MS);
	}

	private storeSnapshotIfNewer(wallet: IWallet): boolean {
		if (wallet.lastTransactionIndex < this.lastAppliedTransactionIndex) {
			return false;
		}

		this.authoritativeWallet = { ...wallet };
		this.lastAppliedTransactionIndex = wallet.lastTransactionIndex;

		return true;
	}

	private renderAuthoritativeBalance(options?: { instant?: boolean; durationMs?: number }): void {
		if (options?.instant) {
			this.hud.setDisplayedBalance(this.authoritativeWallet.balance);
			return;
		}

		const durationMs = options?.durationMs ?? DEFAULT_CATCHUP_DURATION_MS;
		this.hud.animateBalanceTo(this.authoritativeWallet.balance, durationMs);
	}
}

export { LOSS_REVEAL_DURATION_MS };
