import { Container, Sprite, Texture, Graphics } from 'pixi.js';

export enum ReelState { STOPPED, STARTING, SPINNING, STOPPING, CLICKED, FINALADJUST };

export class Reel extends Container {
	private symbols: Map<any, Sprite> = new Map();
	private totalHeight: number;
	private stopKey: any;
	private currentSpeed: number = 0;
	private _state: ReelState = ReelState.STOPPED;

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

		if (symbols.size === 0) throw new Error('Reel symbols count can not be = 0');

		this.totalHeight = symbols.size * symbolSize;
		let posY: number = (visibleHeight - symbolSize) / 2;
		for (const [key, texture] of symbols) {
			const sprite = new Sprite(texture);
			sprite.setSize(symbolSize, symbolSize);
			sprite.y = posY;
			posY += symbolSize;
			if (posY > visibleHeight) posY -= this.totalHeight;
			this.symbols.set(key, sprite);
			this.addChild(sprite);
		}

		const mask = new Graphics().rect(0, 0, symbolSize, visibleHeight).fill({ color: 0x000000 });
		this.addChild(mask);
		this.setMask({ mask });

		this.stopKey = this.symbols.keys().next().value;
	}

	public startSpin(): void {
		if (this._state === ReelState.STOPPED) {
			this.currentSpeed = 0;
			this._state = ReelState.STARTING;
		}
	}

	public update(deltaTime: number): void {
		if (this.state === ReelState.STOPPED) {
			return;
		}

		const totalHeight = this.symbols.size * this.symbolSize;
		const stopPosition = this.symbolSize / 4;
		const microBounce = this.symbolSize / 50;
		let reelPosition: number = 0;

		for (const sprite of this.symbols.values()) {
			sprite.y += this.currentSpeed * deltaTime;
			if (sprite.y >= this.visibleHeight) {
				sprite.y -= totalHeight;
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
					console.warn(`No reel symbol corresponds the key: ${this.stopKey}`);
					this._state = ReelState.STOPPED;
					this.emit('reelStopped', { timestamp: Date.now() });
					return;
				}
		}

		const increaseCurrentSpeed = (acceleration: number): void => {
			this.currentSpeed += acceleration * deltaTime;
		};

		const decreaseCurrentSpeed = (acceleration: number): void => {
			this.currentSpeed -= acceleration * deltaTime;
		};

		const reelInPosition = (finish: number, gap: number = this.currentSpeed): boolean => {
			return reelPosition >= finish && reelPosition <= finish + gap * deltaTime;
		};

		switch (this._state) {
			case ReelState.STARTING:
				increaseCurrentSpeed(this.maxSpeed / 5);
				if (this.currentSpeed >= this.maxSpeed) {
					this.currentSpeed = this.maxSpeed;
					this._state = ReelState.SPINNING;
				}
				break;

			case ReelState.SPINNING:
				break;

			case ReelState.STOPPING:
				if (this.currentSpeed > this.minSpeed) {
					decreaseCurrentSpeed(this.currentSpeed / 30);

				} else if (reelInPosition(stopPosition + microBounce)) {
					// roll back for final adjustment
					this.currentSpeed = -this.minSpeed;
					this._state = ReelState.CLICKED;
				}
				break;

			case ReelState.CLICKED:
				if (reelPosition > (stopPosition - microBounce)) {
					// in case of unstable or huge fps roll back little bit further
				} else {
					this.currentSpeed = microBounce;
					this._state = ReelState.FINALADJUST;
					this.emit('reelClicked');
				}
				break;

			case ReelState.FINALADJUST:
				if (reelInPosition(stopPosition)) {
					this.currentSpeed = 0;
					this._state = ReelState.STOPPED;
					this.emit('reelStopped');
				}
				break;

			default:
				console.warn('Reel unknown state', this._state)
				this._state = ReelState.STOPPED;
		}
	}

	public stopSpin(key: any): void {
		if (this._state !== ReelState.SPINNING) {
			return;
		}
		this.stopKey = key;
		this._state = ReelState.STOPPING;
	}
}
