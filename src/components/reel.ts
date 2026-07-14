import { Container, Sprite, Texture, Graphics } from 'pixi.js';
import { debug } from '../managers/debug';

export enum ReelState { STOPPED, STARTING, SPINNING, STOPPING, CLICKED, FINALADJUST };

export class Reel extends Container {
	private symbols: Map<any, Sprite> = new Map();
	private stopKey: any;
	private currentSpeed: number = 0;
	private _state: ReelState = ReelState.STOPPED;

	private totalHeight: number = 0;
	private stopPosition: number = 0;
	private microBounce: number = 0;

	private wayToStop: number = 0;
	private framesToStop: number = 40;
	private stopFramesCount: number = 0;
	private stopDecelerationCoeff: number = 30;

	private deltaTimeDebug: number = 0;

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

		for (const sprite of this.symbols.values()) {
			sprite.y += this.currentSpeed * deltaTime;
			if (sprite.y >= this.visibleHeight) {
				sprite.y -= this.totalHeight;
			}
		}

		switch (this._state) {
			case ReelState.STOPPING:
			case ReelState.CLICKED:
			case ReelState.FINALADJUST:
				const symbol = this.symbols.get(this.stopKey);
				if (symbol) {
					reelPosition = symbol.y;
				} else {
					this._state = ReelState.STOPPED;
					this.emit('reelStopped');
					return;
				}
		}

		const reelInPosition = (finish: number, gap: number = this.currentSpeed): boolean => {
			return reelPosition >= finish && reelPosition <= finish + gap * deltaTime;
		};

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
				this.deltaTimeDebug = Math.max(this.deltaTimeDebug, deltaTime);

				if (this.currentSpeed > this.minSpeed) {
					// !! in progress

					// linear breaking - stop animation frames (and time) vary from 29 to 55
					//this.currentSpeed -= (this.currentSpeed / this.stopDecelerationCoeff) * deltaTime;

					// adaptive breaking - exactly 40 frames animation, but pinning speed can be not perfectly smooth
					const framesLeft = Math.max(this.framesToStop - this.stopFramesCount, 1);
					const idealSpeed = this.wayToStop / framesLeft;
					const targetSpeed = Math.max(this.minSpeed, idealSpeed);
					const stopSmoothing = 0.10;
					this.currentSpeed += Math.min(0, (targetSpeed - this.currentSpeed) * stopSmoothing);

				} else {
					this.currentSpeed = this.minSpeed;
				}

				if (this.wayToStop <= 0) { //if (reelInPosition(this.stopPosition + this.microBounce)) {
					//debug.log(`wayToStop:${this.wayToStop.toFixed(1)}, realPos:${reelPosition.toFixed(1)}, stopPos:${this.stopPosition.toFixed(1)}`);
					const realWay = reelPosition - this.stopPosition - this.microBounce;
					debug.log(`wayToStop:${this.wayToStop.toFixed(1)}, realWay:${realWay.toFixed(1)}`);
					debug.log(`deltaTime:${deltaTime.toFixed(1)}, maxDeltaTime:${this.deltaTimeDebug.toFixed(1)}`);
					// set exact microbounce position
					this.adjustSymbolsPos(this.stopKey, this.stopPosition + this.microBounce);

					// roll back for final adjustment
					this.currentSpeed = -this.microBounce / 2;
					this._state = ReelState.CLICKED;
				}
				break;

			case ReelState.CLICKED:
				if (reelPosition > (this.stopPosition - this.microBounce)) {
					// in case of unstable or huge fps roll back little bit further
				} else {
					this.currentSpeed = this.microBounce / 2;
					this._state = ReelState.FINALADJUST;
					this.emit('reelClicked');
					// !! debug
					//console.log('reel', this.stopKey, 'stopped after', Math.round(this.stopWayPassed), ', frames', this.stopFramesCount);  // !! debug
					//debug.log(`${deltaTime.toFixed(1)}`);
				}
				break;

			case ReelState.FINALADJUST:
				if (reelInPosition(this.stopPosition)) {
					this.currentSpeed = 0;
					// set perfect stop position
					this.adjustSymbolsPos(this.stopKey, this.stopPosition);
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
		this._state = ReelState.STOPPING;
		this.wayToStop = this.totalHeight * 2 + this.stopPosition + this.microBounce - symbol.y;
		this.framesToStop = 40;
		this.stopFramesCount = 0;

		// !! for linear breaking - full stop animation frames vary from 29 to 55
		const speedDelta = Math.max(this.currentSpeed - this.minSpeed, 0.5);
		this.stopDecelerationCoeff = this.wayToStop / speedDelta;

		//debug
		this.deltaTimeDebug = 0;
	}

	private adjustSymbolsPos(key: any, pos: number) {
		// !! to be optimized
		let index = [...this.symbols.keys()].indexOf(key);
		let posY = pos - index * this.symbolSize;
		if (posY < 0) posY += this.totalHeight;
		for (const sprite of this.symbols.values()) {
			sprite.y = posY;
			if (sprite.y >= this.visibleHeight) {
				sprite.y -= this.totalHeight;
			}
			posY += this.symbolSize;
		}
	}
}
