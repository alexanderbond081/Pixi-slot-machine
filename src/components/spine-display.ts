import { Container } from 'pixi.js';
import { Spine, TrackEntry } from '@esotericsoftware/spine-pixi-v8';

export class SpineDisplay extends Container {
	readonly animations: string[] = [];

	constructor(
		protected spineAnim: Spine,
		protected idleAnimName: string = 'idle',
		protected idleTimeScale: number = 1,
		protected skinName: string = '',
	) {
		super();

		this.animations.push(...this.spineAnim.skeleton.data.animations.map((anim) => anim.name),);
		if (!this.animations.includes(this.idleAnimName)) {
			const animation = this.animations.at(0);
			if (animation) {
				this.idleAnimName = animation;
			} else {
				console.warn("Spine has no animations");
			}
		};

		if (this.skinName.length > 0) {
			this.spineAnim.skeleton.setSkinByName(this.skinName);
		}

		this.spineAnim.skeleton.setSlotsToSetupPose();
		this.addChild(this.spineAnim);

		this.setAnimationTimeScale(
			this.spineAnim.state.setAnimation(0, this.idleAnimName, true),
			this.idleTimeScale
		);
	}

	public playAnimation(animationName: string, timeScale: number = 1, loop: boolean = false, durationSec?: number): void {
		if (!this.animations.includes(animationName)) {
			console.warn(`Unknown animation: ${animationName}`);
			return;
		}

		const newAnima = this.spineAnim.state.setAnimation(0, animationName, loop);
		this.setAnimationTimeScale(newAnima, timeScale);

		const duration = Math.max(0, (durationSec ?? 0) * Math.abs(timeScale));

		if (duration > 0) {
			newAnima.trackEnd = duration;
		}

		if (!loop || duration > 0) {
			const nextAnim = this.spineAnim.state.addAnimation(0, this.idleAnimName, true, duration);
			this.setAnimationTimeScale(nextAnim, this.idleTimeScale);
		}

		this.spineAnim.update(0);
	}

	protected restartAnimation(): void {
		const current = this.spineAnim.state.getCurrent(0);
		if (!current) {
			return;
		}
		current.trackTime = 0;
		current.setAnimationLast(-1);
		this.spineAnim.update(0);
	}

	protected setAnimationTimeScale(trackEntry: TrackEntry, timeScale: number): void {
		if (trackEntry) {
			trackEntry.reverse = timeScale < 0;
			trackEntry.timeScale = Math.abs(timeScale);
		}
	}

	public setVisible(visible: boolean = true): void {
		this.visible = visible;
		this.spineAnim.autoUpdate = visible;
	}

	public isVisible(): boolean {
		return this.visible && this.spineAnim.autoUpdate;
	}
}
