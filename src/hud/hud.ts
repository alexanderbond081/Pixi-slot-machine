import { Scene } from '../scenes/scene';

export abstract class HUD extends Scene {

	public abstract init(): Promise<void>;

	public abstract update(deltaTime: number): void;

	public abstract setDisplayedBalance(balance: number): void;

	public abstract animateBalanceTo(balance: number, durationMs: number): void;

	public abstract getDisplayedBalance(): number;

	public abstract setBetLimits(minBet: number, maxBet: number): void;

	public abstract setBet(bet: number): void;

	protected abstract onResize(): void;

}
