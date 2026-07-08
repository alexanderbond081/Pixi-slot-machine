import { Assets, Container, NineSliceSprite, Sprite, Spritesheet, Text, TextStyle } from 'pixi.js';
import { gsap } from 'gsap';
import { HighlightDecoration } from '../components/highlight-decoration';
import { UIButton } from '../components/ui-button';
import { IWallet } from '../game/slot-game-interface';
import { SoundManager } from '../managers/sound-manager';
import { Scene } from '../scenes/scene';
import { createVersionLabel } from '../version';
import { HUD, WalletUpdateOptions } from './hud';

const PANEL_MARGIN = 8;

const SOUND_BUTTON_LEFT = 42;
const INFO_BUTTON_LEFT = 106

const INFO_LABEL_LEFT = 180;
const INFO_PANEL_HEIGHT = 60;
const INFO_PANEL_WIDTH = 220;

const BALANCE_RIGHT = 68;
const BET_RIGHT = 224;

const HUD_BUTTON_SIZE = 48;
const BET_BUTTON_SIZE = 38;

const BALANCE_HEIGHT = 60;
const BALANCE_WIDTH = 130;
const BALANCE_TEXT_TOP = 9;

const BET_PANEL_HEIGHT = 56;
const BET_PANEL_WIDTH = 62;
const BET_TEXT_TOP = 7;

const BALANCE_FONTSIZE = 24;
const BALANCE_FONTCOLOR = '#FFB000';
const BALANCE_FONT_GLOW = '#FF8C00';

const DEFAULT_MIN_BET = 1;
const BET_STEP = 1;
const BET_BALANCE_DURATION_MS = 350;

const clampBet = (value: number, minBet: number, maxBet: number): number => {
	return Math.min(maxBet, Math.max(minBet, value));
};

export class GameHUD extends HUD {
	private panelSprite!: Sprite;
	private soundButton!: UIButton;
	private infoButton!: UIButton;
	private infoPanel!: NineSliceSprite;
	private versionLabel!: Text;
	private coinsButton!: UIButton;
	private betControls!: Container;
	private betMinusButton!: UIButton;
	private betPlusButton!: UIButton;
	private betPanel!: Sprite;
	private betLabel!: Text;
	private balanceBadge!: Container;
	private balancePanel!: Sprite;
	private balanceLabel!: Text;
	private wallet: IWallet = { balance: 0, currency: 'coins', decimals: 0 };
	private displayedBalance = 0;
	private readonly balanceTicker = { value: 0 };
	private minBet = DEFAULT_MIN_BET;
	private maxBet = DEFAULT_MIN_BET;
	private bet = DEFAULT_MIN_BET;

	public async init(): Promise<void> {
		await this.addPanel();
		await this.addSoundButton();
		await this.addInfoButton();
		await this.addInfoPanel();
		await this.addBetControls();
		await this.addBalanceBadge();
		await this.addCoinsButton();
	}

	public update(deltaTime: number): void {

	}

	public updateWallet(wallet: IWallet, options?: WalletUpdateOptions): void {
		this.wallet = { ...wallet };

		if (options?.instant || wallet.balance === this.displayedBalance) {
			this.setDisplayedBalance(wallet.balance);
			return;
		}

		this.animateDisplayedBalance(wallet.balance, options?.durationMs ?? BET_BALANCE_DURATION_MS);
	}

	public setBetLimits(minBet: number, maxBet: number): void {
		this.minBet = minBet;
		this.maxBet = Math.max(minBet, maxBet);
		this.applyBet(clampBet(this.bet, this.minBet, this.maxBet), false);
	}

	public setBet(bet: number): void {
		this.applyBet(clampBet(bet, this.minBet, this.maxBet), false);
	}

	protected onResize(): void {
		this.adjustPanel();
		this.adjustSoundButton();
		this.adjustInfoButton();
		this.adjustInfoPanel();
		this.adjustBetControls();
		this.adjustBalanceBadge();
		this.adjustCoinsButton();
	}

	private async addPanel(): Promise<void> {
		const texture = await Assets.load('ui-panel');
		this.panelSprite = new Sprite(texture);
		this.adjustPanel();
		this.addChildAt(this.panelSprite, 0);
	}

	private async addSoundButton(): Promise<void> {
		const soundButtonSheet = await Assets.load<Spritesheet>('button-sound');
		const decorator = new HighlightDecoration(0.85);
		this.soundButton = UIButton.fromSpritesheet(
			soundButtonSheet,
			'sound-on',
			HUD_BUTTON_SIZE,
			HUD_BUTTON_SIZE,
			decorator,
		);
		this.adjustSoundButton();
		this.addChild(this.soundButton);

		let isClickBlocked = false;

		this.soundButton.on('pointertap', () => {
			if (isClickBlocked) {
				return;
			}

			SoundManager.playSound('button-pressed');

			if (SoundManager.toggleGlobal()) {
				this.soundButton.setFrame('sound-off');
			} else {
				this.soundButton.setFrame('sound-on');
			}

			isClickBlocked = true;
			gsap.delayedCall(0.15, () => {
				isClickBlocked = false;
			});
		});
	}

	private async addInfoButton(): Promise<void> {
		this.infoButton = await this.createIconButton('button-info', HUD_BUTTON_SIZE);
		this.adjustInfoButton();
		this.addChild(this.infoButton);
		this.bindButtonSignal(this.infoButton, 'show-info');
	}

	private async addInfoPanel(): Promise<void> {
		const texture = await Assets.load('panel-info');
		this.infoPanel = new NineSliceSprite({
			texture,
			leftWidth: 15,
			rightWidth: 15,
			topHeight: 13,
			bottomHeight: 15,
			width: INFO_PANEL_WIDTH,
			height: INFO_PANEL_HEIGHT,
		});
		this.infoPanel.anchor.set(0.5);
		this.versionLabel = createVersionLabel();
		this.versionLabel.anchor.set(0.5);
		this.adjustInfoPanel();
		this.addChild(this.infoPanel);
		this.addChild(this.versionLabel);
	}

	private async addCoinsButton(): Promise<void> {
		this.coinsButton = await this.createIconButton('button-coins', HUD_BUTTON_SIZE);
		this.adjustCoinsButton();
		this.addChild(this.coinsButton);
		this.bindButtonSignal(this.coinsButton, 'show-wallet');
	}

	private async addBetControls(): Promise<void> {
		this.betControls = new Container();
		this.betMinusButton = await this.createIconButton('button-minus', BET_BUTTON_SIZE);
		this.betPlusButton = await this.createIconButton('button-plus', BET_BUTTON_SIZE);
		this.betPanel = new Sprite(await Assets.load('panel-bet'));
		this.betPanel.height = BET_PANEL_HEIGHT;
		this.betPanel.width = BET_PANEL_WIDTH;
		this.betLabel = new Text({
			text: '--',
			style: this.createPanelValueStyle(),
		});
		this.betLabel.y = BET_TEXT_TOP;
		this.betPanel.anchor.set(0.5);
		this.betLabel.anchor.set(0.5);

		this.betMinusButton.x = - this.betPanel.width / 2 - BET_BUTTON_SIZE / 2;
		this.betMinusButton.y = BET_TEXT_TOP;
		this.betPlusButton.x = this.betPanel.width / 2 + BET_BUTTON_SIZE / 2;
		this.betPlusButton.y = BET_TEXT_TOP;

		this.betControls.addChild(this.betMinusButton);
		this.betControls.addChild(this.betPanel);
		this.betControls.addChild(this.betLabel);
		this.betControls.addChild(this.betPlusButton);
		this.refreshBetLabel();
		this.addChild(this.betControls);
		this.adjustBetControls();
		this.bindBetButton(this.betMinusButton, -BET_STEP);
		this.bindBetButton(this.betPlusButton, BET_STEP);
	}

	private async addBalanceBadge(): Promise<void> {
		const texture = await Assets.load('panel-balance');
		this.balanceBadge = new Container();
		this.balancePanel = new Sprite(texture);
		this.balancePanel.height = BALANCE_HEIGHT;
		this.balancePanel.width = BALANCE_WIDTH;
		this.balanceLabel = new Text({
			text: '--',
			style: this.createPanelValueStyle(),
		});
		this.balanceLabel.y = BALANCE_TEXT_TOP;
		this.balancePanel.anchor.set(0.5);
		this.balanceLabel.anchor.set(0.5);
		this.balanceBadge.addChild(this.balancePanel);
		this.balanceBadge.addChild(this.balanceLabel);
		this.refreshBalanceLabel();
		this.adjustBalanceBadge();
		this.addChild(this.balanceBadge);
	}

	private async createIconButton(alias: string, size: number): Promise<UIButton> {
		const texture = await Assets.load(alias);
		const decorator = new HighlightDecoration(0.85);
		return UIButton.fromTexture(texture, size, size, decorator);
	}

	private createPanelValueStyle(): TextStyle {
		return new TextStyle({
			fontFamily: 'Arial, sans-serif',
			fontSize: BALANCE_FONTSIZE,
			fill: BALANCE_FONTCOLOR,
			letterSpacing: 1,
			dropShadow: {
				alpha: 0.85,
				blur: 6,
				color: BALANCE_FONT_GLOW,
				distance: 0,
			},
		});
	}

	private applyBet(bet: number, emitChange: boolean): void {
		const hasChanged = this.bet !== bet;

		this.bet = bet;
		this.refreshBetLabel();

		if (emitChange && hasChanged) {
			this.emit('bet-changed', this.bet);
		}
	}

	private adjustBet(delta: number): void {
		const nextBet = clampBet(this.bet + delta, this.minBet, this.maxBet);

		if (nextBet === this.bet) {
			return;
		}

		this.applyBet(nextBet, true);
	}

	private bindBetButton(button: UIButton, delta: number): void {
		let isClickBlocked = false;

		button.on('pointertap', () => {
			if (isClickBlocked) {
				return;
			}

			SoundManager.playSound('button-pressed', 1, { speed: 1.3 + this.bet * 0.06 });
			this.adjustBet(delta);
			isClickBlocked = true;
			gsap.delayedCall(0.15, () => {
				isClickBlocked = false;
			});
		});
	}

	private bindButtonSignal(button: UIButton, eventName: string): void {
		let isClickBlocked = false;

		button.on('pointertap', () => {
			if (isClickBlocked) {
				return;
			}

			SoundManager.playSound('button-pressed');
			this.emit(eventName);
			isClickBlocked = true;
			gsap.delayedCall(0.15, () => {
				isClickBlocked = false;
			});
		});
	}

	private adjustPanel(): void {
		const targetWidth = Scene.viewportWidth - PANEL_MARGIN * 2;
		this.panelSprite.scale.set(targetWidth / this.panelSprite.texture.width);
		this.panelSprite.x = PANEL_MARGIN;
		this.panelSprite.y = Scene.viewportHeight - PANEL_MARGIN - this.panelSprite.height;
	}

	private adjustSoundButton(): void {
		this.soundButton.x = SOUND_BUTTON_LEFT + HUD_BUTTON_SIZE / 2;
		this.soundButton.y = this.panelSprite.y + this.panelSprite.height / 2;
	}

	private adjustInfoButton(): void {
		this.infoButton.x = INFO_BUTTON_LEFT + HUD_BUTTON_SIZE / 2;
		this.infoButton.y = this.panelSprite.y + this.panelSprite.height / 2;
	}

	private adjustInfoPanel(): void {
		this.infoPanel.x = INFO_LABEL_LEFT + INFO_PANEL_WIDTH / 2;
		this.infoPanel.y = this.panelSprite.y + this.panelSprite.height / 2;
		this.versionLabel.x = this.infoPanel.x;
		this.versionLabel.y = this.infoPanel.y;
	}

	private adjustBetControls(): void {
		this.betControls.x = Scene.viewportWidth / 2 + BET_RIGHT + this.betControls.width / 2;
		this.betControls.y = this.panelSprite.y + this.panelSprite.height / 2;
	}

	private adjustBalanceBadge(): void {
		this.balanceBadge.x = Scene.viewportWidth / 2 + BALANCE_RIGHT + this.balanceBadge.width / 2;
		this.balanceBadge.y = this.panelSprite.y + this.panelSprite.height / 2;
	}

	private adjustCoinsButton(): void {
		this.coinsButton.x = this.balanceBadge.x - this.balancePanel.width / 2 - HUD_BUTTON_SIZE / 2;
		this.coinsButton.y = this.panelSprite.y + this.panelSprite.height / 2;
	}

	private refreshBalanceLabel(): void {
		if (!this.balanceLabel) {
			return;
		}

		this.balanceLabel.text = this.displayedBalance.toString();
	}

	private setDisplayedBalance(balance: number): void {
		gsap.killTweensOf(this.balanceTicker);
		this.displayedBalance = balance;
		this.balanceTicker.value = balance;
		this.refreshBalanceLabel();
	}

	private animateDisplayedBalance(targetBalance: number, durationMs: number): void {
		gsap.killTweensOf(this.balanceTicker);
		this.balanceTicker.value = this.displayedBalance;

		gsap.to(this.balanceTicker, {
			value: targetBalance,
			duration: durationMs / 1000,
			ease: 'power1.out',
			onUpdate: () => {
				this.displayedBalance = Math.round(this.balanceTicker.value);
				this.refreshBalanceLabel();
			},
			onComplete: () => {
				this.setDisplayedBalance(targetBalance);
			},
		});
	}

	private refreshBetLabel(): void {
		if (!this.betLabel) {
			return;
		}

		this.betLabel.text = this.bet.toString();
	}

}
