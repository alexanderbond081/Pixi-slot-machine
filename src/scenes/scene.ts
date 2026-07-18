import { Container, DestroyOptions } from 'pixi.js';

export abstract class Scene extends Container {
	protected static viewportWidth = 800;
	protected static viewportHeight = 600;

	protected readonly designWidth = 800;
	protected readonly designHeight = 600;

	public abstract init(): Promise<void>;

	public abstract update(deltaTime: number): void;

	public resize(width: number, height: number): void {
		Scene.viewportWidth = width;
		Scene.viewportHeight = height;

		this.onResize();
	}

	public override destroy(options?: DestroyOptions): void {
		//console.log(`Scene destroy: ${this.constructor.name}`);
		super.destroy({ children: true });
	}

	protected abstract onResize(): void;

	protected get isPortrait(): boolean {
		return Scene.viewportHeight > Scene.viewportWidth;
	}

	protected get isLandscape(): boolean {
		return Scene.viewportWidth >= Scene.viewportHeight;
	}

	protected calcScale(): number {
		const scale = Math.min(Scene.viewportWidth / this.designWidth, Scene.viewportHeight / this.designHeight);
		return scale;
	}

}
