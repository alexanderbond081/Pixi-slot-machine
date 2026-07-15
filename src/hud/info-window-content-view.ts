import { Container, Text, TextStyle } from 'pixi.js';
import { InfoWindowLink, INFO_WINDOW_INTRO, INFO_WINDOW_LINKS, INFO_WINDOW_OUTRO } from '../content/info-window-content';

const BODY_FONT_SIZE = 16;
const BODY_LINE_HEIGHT = 22;
const LINK_FONT_SIZE = 15;
const LINK_GROUP_GAP = 6;
const BLOCK_GAP = 10;
const LINK_COLOR = '#5B9BD5';
const LINK_HOVER_COLOR = '#8FC4FF';
const BODY_COLOR = '#E8D5A8';

export class InfoWindowContentView extends Container {
	private readonly bodyStyle: TextStyle;

	public constructor() {
		super();
		this.bodyStyle = this.createBodyStyle();
		this.buildBlocks();
	}

	public reflow(contentWidth: number): void {
		let y = 0;

		for (const child of this.children) {
			if (child instanceof Text) {
				child.style.wordWrapWidth = contentWidth;
				child.x = 0;
				child.y = y;
				y += child.text === '' ? BODY_LINE_HEIGHT / 2 : child.height;
				continue;
			}

			if (child.label === 'spacer') {
				y += BLOCK_GAP;
				continue;
			}

			if (child.label === 'link-group') {
				const group = child as Container;
				const prefix = group.children[0] as Text;
				const linkText = group.children[1] as Text;
				prefix.style.wordWrapWidth = contentWidth;
				linkText.style.wordWrapWidth = contentWidth;
				group.x = 0;
				group.y = y;
				prefix.x = 0;
				prefix.y = 0;
				linkText.x = 0;
				linkText.y = prefix.height + LINK_GROUP_GAP;
				y += prefix.height + LINK_GROUP_GAP + linkText.height;
			}
		}

		this.pivot.y = y / 2;
	}

	private buildBlocks(): void {
		for (const line of INFO_WINDOW_INTRO) {
			this.addChild(this.createBodyText(line));
		}

		this.addChild(this.createSpacer());

		for (const link of INFO_WINDOW_LINKS) {
			this.addChild(this.createLinkGroup(link));
		}

		this.addChild(this.createSpacer());

		for (const line of INFO_WINDOW_OUTRO) {
			this.addChild(this.createBodyText(line));
		}
	}

	private createBodyText(text: string): Text {
		const label = new Text({
			text,
			style: this.bodyStyle,
		});
		label.anchor.set(0.5, 0);
		return label;
	}

	private createSpacer(): Container {
		const spacer = new Container();
		spacer.label = 'spacer';
		return spacer;
	}

	private createLinkGroup(link: InfoWindowLink): Container {
		const group = new Container();
		group.label = 'link-group';

		const prefix = new Text({
			text: link.prefix,
			style: this.bodyStyle,
		});
		prefix.anchor.set(0.5, 0);

		const linkText = new Text({
			text: link.displayText,
			style: this.createLinkStyle(),
		});
		linkText.anchor.set(0.5, 0);
		linkText.eventMode = 'static';
		linkText.cursor = 'pointer';
		linkText.on('pointertap', () => {
			window.open(link.url, '_blank', 'noopener,noreferrer');
		});
		linkText.on('pointerover', () => {
			linkText.style.fill = LINK_HOVER_COLOR;
		});
		linkText.on('pointerout', () => {
			linkText.style.fill = LINK_COLOR;
		});

		group.addChild(prefix);
		group.addChild(linkText);
		return group;
	}

	private createBodyStyle(): TextStyle {
		return new TextStyle({
			fontFamily: 'Arial, sans-serif',
			fontSize: BODY_FONT_SIZE,
			fill: BODY_COLOR,
			align: 'center',
			wordWrap: true,
			lineHeight: BODY_LINE_HEIGHT,
		});
	}

	private createLinkStyle(): TextStyle {
		return new TextStyle({
			fontFamily: 'Arial, sans-serif',
			fontSize: LINK_FONT_SIZE,
			fill: LINK_COLOR,
			align: 'center',
			wordWrap: true,
			lineHeight: BODY_LINE_HEIGHT,
		});
	}
}
