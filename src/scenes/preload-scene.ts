import { Assets, Sprite } from 'pixi.js';
import { Scene } from './scene';

export class PreloadScene extends Scene {
	private logoSprite!: Sprite;

	public async init(): Promise<void> {
		const logoImage = await Assets.load('logo');
		this.logoSprite = new Sprite(logoImage);
		this.onResize();

		this.addChild(this.logoSprite);
	}

	protected onResize(): void {
		this.logoSprite.scale = this.calcScale();
		this.logoSprite.x = (Scene.viewportWidth - this.logoSprite.width) * 0.5;
		this.logoSprite.y = (Scene.viewportHeight - this.logoSprite.height) * 0.5;
	}

	public update(deltaTime: number): void {
		// no animation yet
	}
}
