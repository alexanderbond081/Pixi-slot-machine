import { Assets, Sprite, Container, Graphics, FillGradient } from 'pixi.js';
import { Scene } from './scene';

export class LoadingScene extends Scene {
	private logoSprite!: Sprite;
	private titleSprite!: Sprite;
	private barBg!: Graphics;
	private barFill!: Graphics;
	private progressContainer!: Container;

	public async init(): Promise<void> {
		await this.addLogo();
		await this.addTitle();
		await this.addProgressBar();
	}

	public onProgress(progress: number): void {
		// expect progress value from 0.0 to 1.0
		if (!this.barFill) return;
		this.barFill.scale.x = progress < 0 ? 0 : (progress > 1 ? 1 : progress);
	}

	public update(deltaTime: number): void {
		// no animation yet
	}

	protected onResize(): void {
		this.adjustLogo();
		this.adjustTitle();
		this.adjustProgressBar();
	}

	private async addLogo(): Promise<void> {
		const logoImage = await Assets.load('logo');
		this.logoSprite = new Sprite(logoImage);
		this.adjustLogo();
		this.addChild(this.logoSprite);
	}

	private adjustLogo(): void {
		this.logoSprite.scale = 0.5 * this.calcScale();
		this.logoSprite.x = Scene.viewportWidth - this.logoSprite.width * 1.5;
		this.logoSprite.y = this.logoSprite.height * 0.3;
	}

	private async addTitle(): Promise<void> {
		const titleImage = await Assets.load('title');
		this.titleSprite = new Sprite(titleImage);
		this.adjustTitle();
		this.addChild(this.titleSprite);
	}

	private adjustTitle(): void {
		this.titleSprite.scale = 0.5 * this.calcScale();
		this.titleSprite.x = (Scene.viewportWidth - this.titleSprite.width) * 0.5;
		this.titleSprite.y = (Scene.viewportHeight - this.titleSprite.height * 1.1) * 0.5;
	}

	private async addProgressBar(): Promise<void> {
		this.progressContainer = new Container();
		this.addChild(this.progressContainer);

		const barWidth = 400;
		const barHeight = 24;

		this.barBg = new Graphics()
			.roundRect(0, 0, barWidth, barHeight, 8)
			.fill({ color: 0x463c3a })
			.stroke({ width: 2, color: 0x201702, alpha: 1, join: 'round' });
		this.progressContainer.addChild(this.barBg);

		const fillMask = new Graphics()
			.roundRect(1, 1, barWidth - 2, barHeight - 2, 7)
			.fill({ color: 0x000000 });
		this.progressContainer.addChild(fillMask);

		const gradient = new FillGradient({
			type: 'linear',
			colorStops: [
				{ offset: 0, color: 0xffffb0 },
				{ offset: 1, color: 0xefbe00 },
			],
		});

		this.barFill = new Graphics()
			.rect(0, 0, barWidth, barHeight)
			.fill(gradient);
		this.barFill.scale.x = 0;
		this.barFill.mask = fillMask;

		this.adjustProgressBar();
		this.progressContainer.addChild(this.barFill);
	}

	private adjustProgressBar(): void {
		this.progressContainer.scale = this.calcScale();
		this.progressContainer.x = (Scene.viewportWidth - this.progressContainer.width) * 0.5;
		this.progressContainer.y = Scene.viewportHeight - this.progressContainer.height * 3;
	}

}
