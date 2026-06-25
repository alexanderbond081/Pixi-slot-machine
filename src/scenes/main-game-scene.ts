import { Sprite, Texture, Container, Assets, Spritesheet, AnimatedSprite, Graphics, ParticleContainer } from 'pixi.js';

import { Scene } from './scene';
import { AnotherFly } from '../components/particle-fly';
import { Coin, CoinThrowOptions } from '../components/coin';
import { Reel, ReelState } from '../components/reel';
import { Spine } from '@esotericsoftware/spine-pixi-v8';
import { SoundManager } from '../managers/sound-manager';
import { SpineDisplay } from '../components/spine-display';

export class MainGameScene extends Scene {
	private bgSprite!: Sprite;
	private logoSprite!: Sprite;
	private leverSheet!: Spritesheet;
	private theMachine: Container = new Container();
	private leverAnimated!: AnimatedSprite;
	private leverButton!: Graphics;

	private soundButtonSheet!: Spritesheet;
	private soundButtonAnimated!: AnimatedSprite;

	private flies: AnotherFly[] = [];
	private fliesContainer!: ParticleContainer;

	private reels: Reel[] = [];
	private symbolKeys: any[] = [1, 2, 3];
	private coins: Coin[] = [];

	private owl!: SpineDisplay;
	private owlStress: number = 0;

	constructor(symbolKeys: any[] = [1, 2, 3]) {
		super();
		this.symbolKeys = [...symbolKeys];
	}

	// public initializers

	public async init(): Promise<void> {
		//console.log("MainGameScene: initialization");
		await this.addBackground();
		await this.addLogo();
		await this.addSpineAnimation();
		await this.addFlyes();
		await this.addReels();
		await this.addLever();
		await this.addFrame();
		await this.addLeverButton();
		await this.addCoins();
		await this.addSoundButton();

		SoundManager.playMusic('bg-music-fantasy');
		SoundManager.playAmbience('ambience');
	}

	// public methods

	public async startSpinning(): Promise<void> {
		let speed: number = 1;
		for (let reel of this.reels) {
			reel.startSpin();
			SoundManager.playSound('reel-spin', this.reels.length, { speed: speed -= 0.1 });
		}
		this.leverPlayAnimation('pull', 0.3);
		SoundManager.playSound('lever-sfx');
		this.owl.playAnimation('down', 0.1, true);
		await new Promise(resolve => setTimeout(resolve, 500));
	}

	public async stopSpinning(reelSymbols: any[]): Promise<void> {
		if (reelSymbols.length !== this.reels.length) {
			console.warn('reelSymbols length mismatch', reelSymbols.length, this.reels.length);
		}

		const allStopped = this.reels.map((reel) =>
			new Promise<void>((resolve) => {
				if (reel.state === ReelState.STOPPED) {
					resolve();
					return;
				}
				reel.once('reelStopped', () => {
					SoundManager.stopSound('reel-spin');
					SoundManager.playSound('slot-in');
					resolve();
				});
			}),
		);

		for (let i = 0; i < this.reels.length; i++) {
			const symbol = reelSymbols[i] ?? reelSymbols[0];

			if (i > 0) {
				await new Promise(resolve => setTimeout(resolve, 700));
			}

			this.reels[i].stopSpin(symbol);
		}

		this.owl.playAnimation('blink', 0.3, false);

		await Promise.all(allStopped);
	}

	public async playBlocked(): Promise<void> {
		this.leverPlayAnimation('blocked', 0.3);
		// !! await leverPlayAnimation to be implemented
		await new Promise(resolve => setTimeout(resolve, 500));
	}

	public async playWin(): Promise<void> {
		SoundManager.playSound('win-sfx');
		SoundManager.playSound('coin-spray-sfx');
		this.owl.playAnimation('left', 0.2, true);
		this.owlStress = 0;
		await this.playCoinsSpread();
		this.owl.playAnimation('blink', 2, false);
	}

	public async playLost(): Promise<void> {
		this.owlAddStress();
	}

	public isSpinning(): boolean {
		for (let reel of this.reels) {
			if (reel.state !== ReelState.STOPPED) {
				return true;
			}
		}
		return false;
	}

	public update(deltaTime: number): void {
		for (let fly of this.flies) {
			fly.move(deltaTime);
		}

		for (let reel of this.reels) {
			reel.update(deltaTime);
		}

		for (let coin of this.coins) {
			if (coin.visible) {
				coin.move(deltaTime);
			}
		}
	}

	// private methods

	private async addBackground(): Promise<void> {
		const bgTexture = await Assets.load('background');
		this.bgSprite = new Sprite(bgTexture);
		this.adjustBackground();
		this.addChild(this.bgSprite);
	}

	private adjustBackground(): void {
		const maxScale = Math.max(
			Scene.viewportWidth / this.bgSprite.width,
			Scene.viewportHeight / this.bgSprite.height,
		);
		this.bgSprite.scale.set(maxScale);
		this.bgSprite.x = (Scene.viewportWidth - this.bgSprite.width) * 0.5;
		this.bgSprite.y = (Scene.viewportHeight - this.bgSprite.height) * 0.5;
	}

	private async addLogo(): Promise<void> {
		const logoImage = await Assets.load('logo');
		this.logoSprite = new Sprite(logoImage);
		this.adjustLogo();
		this.addChild(this.logoSprite);
	}

	private adjustLogo(): void {
		this.logoSprite.scale = 0.4 * this.calcScale();
		this.logoSprite.x = Scene.viewportWidth - this.logoSprite.width - 3 * this.calcScale();
		this.logoSprite.y = Scene.viewportHeight - this.logoSprite.height;
	}

	private async addFlyes(): Promise<void> {
		const flyTexture = await Assets.load('firefly');
		this.fliesContainer = new ParticleContainer({
			dynamicProperties: {
				position: true,
				rotation: true,
				vertex: false,
				color: false,
			},
		});

		for (let i: number = 0; i < 10; i++) {
			const aFly: AnotherFly = new AnotherFly(
				flyTexture,
				Math.random() * Scene.viewportWidth,
				Math.random() * Scene.viewportHeight
			);
			this.flies.push(aFly);
			this.fliesContainer.addParticle(aFly);
		}
		this.adjustFlyes();
		this.addChild(this.fliesContainer);
	}

	private adjustFlyes(): void {
		this.fliesContainer.scale = this.calcScale();
		// !! test if we need to update each fly trajectory
		this.fliesContainer.update();
	}

	private async addReels(): Promise<void> {
		const symbolsSheet = await Assets.load<Spritesheet>('symbols');
		const textures: Texture[] = Object.values(symbolsSheet.textures);
		const orders: number[][] = [[0, 1, 2], [1, 0, 2], [2, 1, 0]];

		let posX: number = 140;
		let speed: number = 20;
		const minSpeed: number = 8;
		for (let order of orders) {
			const reorderedMap = new Map<number, Texture>();
			for (let i of order) {
				reorderedMap.set(this.symbolKeys[i], textures[i]);
			};

			let reel = new Reel(90, 150, speed, minSpeed, reorderedMap);
			speed += 3;
			reel.x = posX;
			reel.y = 77;
			posX += 95;
			this.reels.push(reel);
			this.theMachine.addChild(reel);
		};
	}


	private async addFrame(): Promise<void> {
		const frameTexture = await Assets.load(`reels-frame`);
		const frameSprite = new Sprite(frameTexture);
		this.theMachine.addChild(frameSprite);
		this.addChild(this.theMachine);
		this.adjustTheMachine();
	}

	private adjustTheMachine(): void {
		const scale = this.calcScale();
		this.theMachine.scale = scale;
		this.theMachine.x = (Scene.viewportWidth - this.theMachine.width) * 0.5;
		// the slot machine frame has a shadow on it's bottom - no need to shift it from the edge
		this.theMachine.y = (Scene.viewportHeight - this.theMachine.height);
	}

	private leverPlayAnimation(name: string = 'idle', speed: number = 0.2): void {
		this.leverAnimated.textures = this.leverSheet.animations[name];
		this.leverAnimated.loop = false;
		this.leverAnimated.animationSpeed = speed;
		this.leverAnimated.gotoAndPlay(0);
	}

	private randomiseCoinThrowTrajectory(): Partial<CoinThrowOptions> {
		const scale = this.calcScale();
		const speedX = (Math.random() * 20 - 10) * scale;
		const speedY = (-Math.random() * 20 - 15) * scale;
		const x = Scene.viewportWidth * 0.5 - this.theMachine.width * 0.05 + speedX * 8;
		const y = Scene.viewportHeight - this.theMachine.height * 0.3;
		const speedScale = (Math.random() * 0.005 + 0.0005) * scale;
		const spinSpeed = Math.random() * 20 - 10;
		return {
			x,
			y,
			scale: 0.1 * scale,
			speedX,
			speedY,
			speedScale,
			spinSpeed,
			floor: Scene.viewportHeight,
			gravity: 0.98 * scale
		};
	}

	private async playCoinsSpread(): Promise<void> {
		for (const coin of this.coins) {
			coin.throw(this.randomiseCoinThrowTrajectory());
			await new Promise(resolve => setTimeout(resolve, 100));
		}
		await new Promise(resolve => setTimeout(resolve, 300));
	}

	private async addLever(): Promise<void> {
		this.leverSheet = await Assets.load<Spritesheet>('lever-pack');

		this.leverAnimated = new AnimatedSprite(this.leverSheet.animations['idle']);
		this.leverAnimated.loop = false;
		this.leverAnimated.onComplete = () => {
			this.leverAnimated.textures = this.leverSheet.animations['idle'];
			this.leverAnimated.gotoAndStop(0);
		};

		this.leverAnimated.x = 512;
		this.leverAnimated.y = 70;

		this.theMachine.addChild(this.leverAnimated);
	}

	private async addLeverButton(): Promise<void> {
		this.leverButton = new Graphics();
		this.leverButton.eventMode = 'static';
		this.leverButton.cursor = 'pointer';
		this.leverButton.on('pointerdown', () => {
			if (!this.isSpinning()) {
				this.emit('leverTriggered');
			}
		});
		this.leverButton
			.clear()
			.rect(0, 0, this.leverAnimated.width * 0.6, this.leverAnimated.height * 0.6)
			.fill({ color: 0xffffff, alpha: 0.001 });
		this.leverButton.x = this.leverAnimated.x;
		this.leverButton.y = this.leverAnimated.y;
		this.theMachine.addChild(this.leverButton);
	}

	private async addSpineAnimation(): Promise<void> {
		const spineAnimation = Spine.from({
			skeleton: 'owl-data',
			atlas: 'owl-atlas',
		});

		this.owl = new SpineDisplay(spineAnimation, 'idle');
		this.adjustSpineAnimation();

		this.owl.eventMode = 'static';
		this.owl.cursor = 'pointer';
		this.owl.on('pointerdown', () => {
			this.owlAddStress(0.5);
		});

		this.addChild(this.owl);
	}

	private adjustSpineAnimation(): void {
		const scale = this.calcScale();
		this.owl.scale.set(-0.12 * scale, 0.12 * scale);
		this.owl.x = Scene.viewportWidth - this.owl.width * 0.75;
		this.owl.y = this.owl.height * 0.95;
		this.owl.rotation = 0.15;
	}

	private owlAddStress(amount: number = 1): void {
		if ((Math.random() * 0.4 + this.owlStress * 0.2) > 0.99) {
			this.owl.playAnimation('up', 0.1, false);
			SoundManager.playSound('owl-voice');
			this.owlStress = 0;
		} else {

			this.owl.playAnimation('blink', (amount < 1) ? 2.5 : 0.5, false);
			this.owlStress += amount;
		}
	}

	private async addSoundButton(): Promise<void> {
		this.soundButtonSheet = await Assets.load<Spritesheet>('sound-button-brown');

		this.soundButtonAnimated = new AnimatedSprite(this.soundButtonSheet.animations['on']);
		this.soundButtonAnimated.loop = false;
		this.adjustSoundButton();

		this.soundButtonAnimated.eventMode = 'static';
		this.soundButtonAnimated.cursor = 'pointer';
		this.soundButtonAnimated.on('pointerdown', () => {
			if (SoundManager.toggleGlobal()) {
				this.soundButtonAnimated.textures = this.soundButtonSheet.animations['off'];
			} else {
				this.soundButtonAnimated.textures = this.soundButtonSheet.animations['on'];
			}
		});

		this.addChild(this.soundButtonAnimated);
	}

	private adjustSoundButton(): void {
		const scale = this.calcScale();
		const size = 42 * scale;
		this.soundButtonAnimated.width = size;
		this.soundButtonAnimated.height = size;
		this.soundButtonAnimated.x = 24 * scale;
		this.soundButtonAnimated.y = 20 * scale;
	}

	private async addCoins(): Promise<void> {
		for (let i: number = 0; i < 20; i++) {
			const spineAnimation = Spine.from({
				skeleton: 'coin-data',
				atlas: 'coin-atlas',
			});
			const coin = new Coin(spineAnimation);
			coin.setVisible(false);
			this.addChild(coin);
			this.coins.push(coin);
		}
	}

	protected onResize(): void {
		this.adjustBackground();
		this.adjustLogo();
		this.adjustSpineAnimation();
		this.adjustFlyes();
		this.adjustTheMachine();
		this.adjustSoundButton();
	}
}
