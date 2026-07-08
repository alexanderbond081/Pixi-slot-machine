import { Scene } from '../scenes/scene';
import { IWallet } from '../game/slot-game-interface';

export type WalletUpdateOptions = {
	instant?: boolean;
	durationMs?: number;
};

export abstract class HUD extends Scene {

	public abstract init(): Promise<void>;

	public abstract update(deltaTime: number): void;

	public abstract updateWallet(wallet: IWallet, options?: WalletUpdateOptions): void;

	public abstract setBetLimits(minBet: number, maxBet: number): void;

	public abstract setBet(bet: number): void;

	protected abstract onResize(): void;

}
