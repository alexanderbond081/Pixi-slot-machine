import { Container, DestroyOptions, Sprite, Spritesheet, Texture } from 'pixi.js';
import { Decoratable } from './decoratable';
import { MouseActionDecoration } from './mouse-action-decoration';

export class UIButton extends Container implements Decoratable {
	private view: Sprite;

	public get interactiveTarget(): Container { return this; }
	public get animationTarget(): Container { return this; }

	protected _actualScaleX: number = 1;
	protected _actualScaleY: number = 1;

	public get actualScaleX(): number { return this._actualScaleX; }
	public get actualScaleY(): number { return this._actualScaleY; }

	constructor(
		readonly spritesheet: Spritesheet,
		initialTextureName: string,
		readonly baseWidth: number,
		readonly baseHeight: number,
		readonly decorator?: MouseActionDecoration
	) {
		super();

		this.view = new Sprite(spritesheet.textures[initialTextureName]);
		this.view.width = baseWidth;
		this.view.height = baseHeight;
		this.view.anchor.set(0.5);
		this.addChild(this.view);

		this.eventMode = 'static';
		this.cursor = 'pointer';

		if (decorator) {
			decorator.attach(this);
		}
	}

	override destroy(options?: DestroyOptions): void {
		if (this.decorator) {
			this.decorator.detach();
		}
		super.destroy(options);
	}

	public setTexture(textureName: string): void {
		this.view.texture = this.spritesheet.textures[textureName];
		this.view.width = this.baseWidth;
		this.view.height = this.baseHeight;
	}

	public adjustScale(scaleX: number, scaleY: number): void {
		this._actualScaleX = scaleX;
		this._actualScaleY = scaleY;

		if (this.decorator) {
			this.decorator.updateAnimations();
		}

		this.scale.set(scaleX, scaleY);
	}
}
