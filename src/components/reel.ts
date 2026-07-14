import { Container, Sprite, Texture, Graphics } from 'pixi.js';

export enum ReelState { STOPPED, STARTING, SPINNING, STOPPING, CLICKED, FINALADJUST };

export class Reel extends Container {
	private symbols: Map<any, Sprite> = new Map();
	private values: Sprite[] = [];
	private stopKey: any;
	private stopSymbol: Sprite | null = null;
	private currentSpeed: number = 0;
	private _state: ReelState = ReelState.STOPPED;

	private totalHeight: number = 0;
	private stopPosition: number = 0;
	private microBounce: number = 0;

	private wayToStop: number = 0;
	private framesToStop: number = 40;
	private stopFramesCount: number = 0;
	private stopDecelerationCoeff: number = 30;

	public get state(): ReelState {
		return this._state;
	}

	constructor(
		private symbolSize: number,
		private visibleHeight: number,
		private maxSpeed: number,
		private minSpeed: number,
		symbols: Map<any, Texture>
	) {
		super();

		if (symbols.size < 3) throw new Error('Reel symbols count can not be < 3');

		let i = 0;
		this.totalHeight = symbols.size * symbolSize;
		this.stopPosition = visibleHeight / 2 - symbolSize / 2; // symbols.size / 4;
		this.microBounce = minSpeed / 2;

		let posY: number = visibleHeight / 2 - symbolSize * 1.5;
		for (const [key, texture] of symbols) {
			const sprite = new Sprite(texture);
			sprite.setSize(symbolSize, symbolSize);
			sprite.y = posY;
			posY += symbolSize;
			if (posY > visibleHeight) posY -= this.totalHeight;
			this.symbols.set(key, sprite);
			this.values.push(sprite);
			this.addChild(sprite);
			if (i++ === 1) this.stopKey = key;
		}


		const mask = new Graphics().rect(0, 0, symbolSize, visibleHeight).fill({ color: 0x000000 });
		this.addChild(mask);
		this.setMask({ mask });
	}

	public startSpin(): void {
		if (this._state === ReelState.STOPPED) {
			this.currentSpeed = 0;
			this._state = ReelState.STARTING;
		}
	}

	// update view
	public update(deltaTime: number): void {
		if (this.state === ReelState.STOPPED) {
			return;
		}

		// deltaTime on mobile could be up to 10, so limit it to avoid skipping animation at the cost of freezing animation
		deltaTime = Math.min(deltaTime, 2);
		let reelPosition: number = 0;

		for (const sprite of this.values) {
			sprite.y += this.currentSpeed * deltaTime;
			if (sprite.y >= this.visibleHeight) {
				sprite.y -= this.totalHeight;
			}
		}

		switch (this._state) {
			case ReelState.STOPPING:
			case ReelState.CLICKED:
			case ReelState.FINALADJUST:
				if (this.stopSymbol) {
					reelPosition = this.stopSymbol.y;
				} else {
					this._state = ReelState.STOPPED;
					this.emit('reelStopped');
					return;
				}
		}

		switch (this._state) {
			case ReelState.STARTING:
				this.currentSpeed += (this.maxSpeed / 5) * deltaTime;
				if (this.currentSpeed >= this.maxSpeed) {
					this.currentSpeed = this.maxSpeed;
					this._state = ReelState.SPINNING;
				}
				break;

			case ReelState.SPINNING:
				break;

			case ReelState.STOPPING:
				this.stopFramesCount += deltaTime;
				this.wayToStop -= this.currentSpeed * deltaTime;

				if (this.currentSpeed > this.minSpeed) {
					// option 1: linear breaking - stop animation frames (and time) vary from 29 to 55
					//this.currentSpeed -= (this.currentSpeed / this.stopDecelerationCoeff) * deltaTime;

					// option 2: adaptive breaking - exactly 40 frames animation, but pinning speed can be not perfectly smooth
					const framesLeft = Math.max(this.framesToStop - this.stopFramesCount, 1);
					const idealSpeed = this.wayToStop / framesLeft;
					const targetSpeed = Math.max(this.minSpeed, idealSpeed);
					const stopSmoothing = 0.10;
					this.currentSpeed += Math.min(0, (targetSpeed - this.currentSpeed) * stopSmoothing);

				} else {
					this.currentSpeed = this.minSpeed;
				}

				if (this.wayToStop <= 0) {
					// set exact microbounce position
					this.adjustSymbolsPos(this.stopSymbol!, this.stopPosition + this.microBounce);
					// roll back for final adjustment
					this.currentSpeed = -this.microBounce / 2;
					this._state = ReelState.CLICKED;
				}
				break;

			case ReelState.CLICKED:
				if (reelPosition > (this.stopPosition - this.microBounce)) {
					// keep rolling back
				} else {
					this.currentSpeed = this.microBounce / 2;
					this._state = ReelState.FINALADJUST;
					this.emit('reelClicked');
				}
				break;

			case ReelState.FINALADJUST:
				if (reelPosition >= this.stopPosition) {
					this.currentSpeed = 0;
					// set perfect stop position
					this.adjustSymbolsPos(this.stopSymbol!, this.stopPosition);
					this._state = ReelState.STOPPED;
					this.emit('reelStopped');
				}
				break;

			default:
				console.warn('Reel unknown state', this._state);
				this._state = ReelState.STOPPED;
		}
	}

	public stopSpin(key: any): void {
		if (this._state !== ReelState.SPINNING) {
			return;
		}
		const symbol = this.symbols.get(key);
		if (!symbol) {
			console.warn(`No reel symbol corresponds the key: ${key}`);
			this._state = ReelState.STOPPED;
			this.emit('reelStopped');
			return;
		}

		this.stopKey = key;
		this.stopSymbol = symbol;
		this._state = ReelState.STOPPING;
		this.wayToStop = this.totalHeight * 2 + this.stopPosition + this.microBounce - symbol.y;

		// for options 1: linear breaking - full stop animation frames vary from 29 to 55
		const speedDelta = Math.max(this.currentSpeed - this.minSpeed, 0.5);
		this.stopDecelerationCoeff = this.wayToStop / speedDelta;

		// for option 2: adaptive breaking - exactly 40 frames to stop
		this.framesToStop = 40;
		this.stopFramesCount = 0;
	}

	private adjustSymbolsPos(symbol: Sprite, pos: number): void {
		if (!symbol) return;
		let startIndex = this.values.indexOf(symbol);
		if (startIndex === -1) return;

		let posY = pos;
		const count = this.symbols.size;
		for (let i = 0; i < count; i++) {
			this.values[(startIndex + i) % count].y = posY;
			posY += this.symbolSize;
			if (posY > this.visibleHeight) posY -= this.totalHeight;
		};
	}
}
