import { Spine } from '@esotericsoftware/spine-pixi-v8';
import { SpineDisplay } from './spine-display';

export interface CoinThrowOptions {
	x: number;
	y: number;
	scale: number;
	speedX: number;
	speedY: number;
	speedScale: number;
	spinSpeed: number;
	floor: number;
	gravity: number;
}

const COIN_THROW_DEFAULTS: CoinThrowOptions = {
	x: 400,
	y: 400,
	scale: 0.1,
	speedX: 10,
	speedY: -10,
	speedScale: 0.005,
	spinSpeed: 1,
	floor: 1000,
	gravity: 0.98,
};

export class Coin extends SpineDisplay {
	private speedX: number = 0;
	private speedY: number = 0;
	private speedScale: number = 0;
	private gravity: number = 0;
	private floor: number = 0;

	constructor(
		spineAnim: Spine,
		idleAnimName: string = '',
		idleTimeScale: number = 1,
		skinName: string = '',
	) {
		super(spineAnim, idleAnimName, idleTimeScale, skinName);
	}

	public throw(options: Partial<CoinThrowOptions> = {}): void {
		const p = { ...COIN_THROW_DEFAULTS, ...options };
		this.x = p.x;
		this.y = p.y;
		this.scale.set(p.scale);
		this.speedX = p.speedX;
		this.speedY = p.speedY;
		this.speedScale = p.speedScale;
		this.gravity = p.gravity;
		this.floor = p.floor;
		this.playAnimation(this.idleAnimName, p.spinSpeed, true);
		this.setVisible(true);
	}

	public move(deltaTime: number): void {
		if (this.y > this.floor) {
			this.setVisible(false);
			return;
		}
		this.speedY += this.gravity * deltaTime;
		this.x += this.speedX * deltaTime;
		this.y += this.speedY * deltaTime;
		this.scale.x += this.speedScale * deltaTime;
		this.scale.y += this.speedScale * deltaTime;
	}
}
