import { Assets, Container, DestroyOptions, NineSliceSprite, Sprite, Spritesheet, Text, TextStyle } from 'pixi.js';
import { gsap } from 'gsap';
import { bindDebouncedTap } from '../components/debounced-tap';
import { HighlightDecoration } from '../components/highlight-decoration';
import { UIButton } from '../components/ui-button';
import { DebugHudPanel } from '../debug/debug-hud-panel';
import { ErrorModalContent } from './error-modal-content';
import { HudModal } from './hud-modal';
import { InfoWindowContentView } from './info-window-content-view';
import { SoundManager } from '../managers/sound-manager';
import { Scene } from '../scenes/scene';
import { createVersionLabel } from '../version';
import { HUD } from './hud';

const PANEL_MARGIN = 8;

// position
const FULLSCREEN_BUTTON_LEFT = 34;
const SOUND_BUTTON_LEFT = 92;
const INFO_BUTTON_LEFT = 150;
const INFO_LABEL_LEFT = 210;

const BALANCE_RIGHT = 86;
const BET_RIGHT = 228;

// size
const HUD_BUTTON_SIZE = 48;
const BET_BUTTON_SIZE = 38;

const INFO_PANEL_HEIGHT = 60;
const INFO_PANEL_WIDTH = 220;

const BALANCE_HEIGHT = 60;
const BALANCE_WIDTH = 130;
const BALANCE_TEXT_TOP = 9;

const BET_PANEL_HEIGHT = 56;
const BET_PANEL_WIDTH = 62;
const BET_TEXT_TOP = 7;

const INFO_WINDOW_WIDTH = 560;
const INFO_WINDOW_HEIGHT = 420;

const ERROR_WINDOW_WIDTH = 420;
const ERROR_WINDOW_HEIGHT = 220;

const BALANCE_WINDOW_WIDTH = 320;
const BALANCE_WINDOW_HEIGHT = 120;
const BALANCE_WINDOW_PADDING = 20;
const BALANCE_WINDOW_FONT_SIZE = 18;
const BALANCE_WINDOW_TEXT = 'Just try to play with the Owl.';
const WINDOW_MARGIN_ABOVE_PANEL = 12;

const BALANCE_FONTSIZE = 24;
const BALANCE_FONTCOLOR = '#FFB000';
const BALANCE_FONT_GLOW = '#FF8C00';

const DEFAULT_MIN_BET = 1;
const BET_STEP = 1;
const clampBet = (value: number, minBet: number, maxBet: number): number => {
	return Math.min(maxBet, Math.max(minBet, value));
};

export class GameHUD extends HUD {
	private panelSprite!: Sprite;
	private fullscreenButton!: UIButton;
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
	private modalLayer!: Container;
	private infoModal!: HudModal;
	private errorModal!: HudModal;
	private errorModalContent!: ErrorModalContent;
	private errorCloseResolver: (() => void) | null = null;
	private balanceWindow!: Container;
	private balanceWindowPanel!: NineSliceSprite;
	private balanceWindowText!: Text;
	private debugPanel!: DebugHudPanel;
	private isBalanceWindowVisible = false;
	private displayedBalance = 0;
	private readonly balanceTicker = { value: 0 };
	private minBet = DEFAULT_MIN_BET;
	private maxBet = DEFAULT_MIN_BET;
	private bet = DEFAULT_MIN_BET;

	public async init(): Promise<void> {
		await this.addPanel();
		await this.addFullscreenButton();
		await this.addSoundButton();
		await this.addInfoButton();
		await this.addInfoPanel();
		await this.addBetControls();
		await this.addBalanceBadge();
		await this.addCoinsButton();
		await this.addBalanceWindow();
		this.debugPanel = new DebugHudPanel();
		this.addChild(this.debugPanel);
		this.modalLayer = new Container();
		await this.addInfoModal();
		await this.addErrorModal();
		this.addChild(this.modalLayer);
	}

	public override destroy(options?: DestroyOptions): void {
		super.destroy(options);
	}

	public update(deltaTime: number): void {

	}

	public animateBalanceTo(targetBalance: number, durationMs: number): void {
		if (targetBalance === this.displayedBalance) {
			return;
		}

		this.displayedBalance = targetBalance;
		this.animateDisplayedBalance(targetBalance, durationMs);
	}

	public getDisplayedBalance(): number {
		return this.displayedBalance;
	}

	public setDisplayedBalance(balance: number): void {
		gsap.killTweensOf(this.balanceTicker);
		this.displayedBalance = balance;
		this.balanceTicker.value = balance;
		this.refreshBalanceLabel();
	}

	public setBetLimits(minBet: number, maxBet: number): void {
		this.minBet = minBet;
		this.maxBet = Math.max(minBet, maxBet);
		this.applyBet(clampBet(this.bet, this.minBet, this.maxBet), false);
	}

	public setBet(bet: number): void {
		this.applyBet(clampBet(bet, this.minBet, this.maxBet), false);
	}

	public isModalOpen(): boolean {
		return this.infoModal.isOpen || this.errorModal.isOpen;
	}

	public closeTopModal(): boolean {
		if (this.errorModal.isOpen) {
			this.errorModal.close();
			return true;
		}

		if (!this.infoModal.isOpen) {
			return false;
		}

		this.infoModal.close();
		return true;
	}

	/** Show a blocking error dialog; resolves when the user dismisses it (OK / backdrop / Esc). */
	public showError(message: string): Promise<void> {
		if (this.infoModal.isOpen) {
			this.infoModal.close();
		}

		this.errorModalContent.setMessage(message);
		this.adjustErrorModal();

		return new Promise((resolve) => {
			this.errorCloseResolver = resolve;
			this.errorModal.open();
		});
	}

	protected onResize(): void {
		this.adjustPanel();
		this.adjustFullscreenButton();
		this.adjustSoundButton();
		this.adjustInfoButton();
		this.adjustInfoPanel();
		this.adjustInfoModal();
		this.adjustErrorModal();
		this.debugPanel.adjustLayout();
		this.adjustBetControls();
		this.adjustBalanceBadge();
		this.adjustCoinsButton();
		this.adjustBalanceWindow();
	}

	private async addPanel(): Promise<void> {
		const texture = await Assets.load('ui-panel');
		this.panelSprite = new Sprite(texture);
		this.adjustPanel();
		this.addChildAt(this.panelSprite, 0);
	}

	private async addFullscreenButton(): Promise<void> {
		this.fullscreenButton = await this.createIconButton('button-fullscreen', HUD_BUTTON_SIZE);
		this.adjustFullscreenButton();
		this.addChild(this.fullscreenButton);
		this.bindButtonSignal(this.fullscreenButton, 'toggle-fullscreen');
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

		bindDebouncedTap(this.soundButton, () => {
			SoundManager.playSound('button-pressed');

			if (SoundManager.toggleGlobal()) {
				this.soundButton.setFrame('sound-off');
			} else {
				this.soundButton.setFrame('sound-on');
			}
		});
	}

	private async addInfoButton(): Promise<void> {
		this.infoButton = await this.createIconButton('button-info', HUD_BUTTON_SIZE);
		this.adjustInfoButton();
		this.addChild(this.infoButton);
		this.bindInfoButton();
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
		this.bindCoinsButton(); //this.bindButtonSignal(this.coinsButton, 'show-wallet');
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

	private async addInfoModal(): Promise<void> {
		this.infoModal = await HudModal.create({
			width: INFO_WINDOW_WIDTH,
			height: INFO_WINDOW_HEIGHT,
		});
		this.infoModal.setContent(new InfoWindowContentView());
		this.modalLayer.addChild(this.infoModal);
		this.adjustInfoModal();
	}

	private async addErrorModal(): Promise<void> {
		this.errorModal = await HudModal.create({
			width: ERROR_WINDOW_WIDTH,
			height: ERROR_WINDOW_HEIGHT,
		});
		this.errorModalContent = new ErrorModalContent();
		this.errorModal.setContent(this.errorModalContent);
		this.errorModal.on('closed', () => {
			const resolver = this.errorCloseResolver;
			this.errorCloseResolver = null;
			resolver?.();
		});
		this.modalLayer.addChild(this.errorModal);
		this.adjustErrorModal();
	}

	private async addBalanceWindow(): Promise<void> {
		const popup = await this.createPopupWindow(
			BALANCE_WINDOW_WIDTH,
			BALANCE_WINDOW_HEIGHT,
			BALANCE_WINDOW_FONT_SIZE,
		);
		this.balanceWindow = popup.container;
		this.balanceWindowPanel = popup.panel;
		this.balanceWindowText = popup.label;
		this.balanceWindowText.text = BALANCE_WINDOW_TEXT;
		this.adjustBalanceWindow();
		this.addChild(this.balanceWindow);
	}

	private async createPopupWindow(
		width: number,
		height: number,
		fontSize: number,
	): Promise<{ container: Container; panel: NineSliceSprite; label: Text }> {
		const texture = await Assets.load('panel-window');
		const container = new Container();
		const panel = new NineSliceSprite({
			texture,
			leftWidth: 32,
			rightWidth: 32,
			topHeight: 32,
			bottomHeight: 32,
			width,
			height,
		});
		panel.anchor.set(0.5);
		const label = new Text({
			text: '',
			style: this.createWindowTextStyle(fontSize),
		});
		label.anchor.set(0.5);
		container.addChild(panel);
		container.addChild(label);
		container.visible = false;
		return { container, panel, label };
	}

	private createWindowTextStyle(fontSize: number): TextStyle {
		return new TextStyle({
			fontFamily: 'Arial, sans-serif',
			fontSize,
			fill: '#E8D5A8',
			align: 'center',
			wordWrap: true,
			lineHeight: fontSize * 1.35,
		});
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
		bindDebouncedTap(button, () => {
			SoundManager.playSound('button-pressed', 1, { speed: 1.3 + this.bet * 0.06 });
			this.adjustBet(delta);
		}, { debounceMs: 0.1 });
	}

	private bindInfoButton(): void {
		bindDebouncedTap(this.infoButton, () => {
			SoundManager.playSound('button-pressed');
			// this.debugPanel.toggle();
			this.infoModal.toggle();
		});
	}

	private bindCoinsButton(): void {
		bindDebouncedTap(this.coinsButton, () => {
			SoundManager.playSound('button-pressed');
			// this.emit('show-wallet');
			this.isBalanceWindowVisible = !this.isBalanceWindowVisible;
			this.balanceWindow.visible = this.isBalanceWindowVisible;
		});
	}

	private bindButtonSignal(button: UIButton, eventName: string): void {
		bindDebouncedTap(button, () => {
			SoundManager.playSound('button-pressed');
			this.emit(eventName);
		});
	}

	private adjustPanel(): void {
		const targetWidth = Scene.viewportWidth - PANEL_MARGIN * 2;
		this.panelSprite.scale.set(targetWidth / this.panelSprite.texture.width);
		this.panelSprite.x = PANEL_MARGIN;
		this.panelSprite.y = Scene.viewportHeight - PANEL_MARGIN - this.panelSprite.height;
	}

	private adjustFullscreenButton(): void {
		this.fullscreenButton.x = FULLSCREEN_BUTTON_LEFT + HUD_BUTTON_SIZE / 2;
		this.fullscreenButton.y = this.panelSprite.y + this.panelSprite.height / 2;
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

	private adjustInfoModal(): void {
		if (!this.infoModal || !this.panelSprite) {
			return;
		}

		const width = Math.min(INFO_WINDOW_WIDTH, Scene.viewportWidth - PANEL_MARGIN * 4);
		this.infoModal.adjustLayout(
			Scene.viewportWidth,
			Scene.viewportHeight,
			this.panelSprite.y / 2,
			width,
		);
	}

	private adjustErrorModal(): void {
		if (!this.errorModal || !this.panelSprite) {
			return;
		}

		const width = Math.min(ERROR_WINDOW_WIDTH, Scene.viewportWidth - PANEL_MARGIN * 4);
		this.errorModal.adjustLayout(
			Scene.viewportWidth,
			Scene.viewportHeight,
			this.panelSprite.y / 2,
			width,
		);
	}

	private adjustBalanceWindow(): void {
		if (!this.balanceWindow || !this.panelSprite) {
			return;
		}

		this.balanceWindowPanel.width = BALANCE_WINDOW_WIDTH;
		this.balanceWindowPanel.height = BALANCE_WINDOW_HEIGHT;
		this.balanceWindow.x = this.balanceBadge.x;
		this.balanceWindow.y = this.panelSprite.y - BALANCE_WINDOW_HEIGHT / 2 - WINDOW_MARGIN_ABOVE_PANEL;
		this.balanceWindowText.x = 0;
		this.balanceWindowText.y = 0;
		this.balanceWindowText.style.wordWrapWidth = BALANCE_WINDOW_WIDTH - BALANCE_WINDOW_PADDING * 2;
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

		this.balanceLabel.text = Math.round(this.balanceTicker.value).toString();
	}

	private animateDisplayedBalance(targetBalance: number, durationMs: number): void {
		gsap.killTweensOf(this.balanceTicker);

		gsap.to(this.balanceTicker, {
			value: targetBalance,
			duration: durationMs / 1000,
			ease: 'power1.out',
			onUpdate: () => {
				this.refreshBalanceLabel();
			},
			onComplete: () => {
				this.balanceTicker.value = targetBalance;
				this.refreshBalanceLabel();
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
