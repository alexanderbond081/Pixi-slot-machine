import { Scene } from '../scenes/scene';
import { IWallet } from '../game/slot-game-interface';

export abstract class HUD extends Scene {

	public abstract init(): Promise<void>;
	public abstract update(deltaTime: number): void;
	protected abstract onResize(): void;

	public abstract updateWallet(wallet: IWallet): void;

	public abstract updateSomethisElse(): void;

}
