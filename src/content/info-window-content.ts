export type InfoWindowLink = {
	prefix: string;
	displayText: string;
	url: string;
};

export const INFO_WINDOW_INTRO = [
	'This is an HTML5 slot game technical demo',
	'made by Aliaksandr Bandarenka',
	'using Pixi.js v8 and a few other libraries.',
];

export const INFO_WINDOW_LINKS: InfoWindowLink[] = [
	{
		prefix: 'See the source at:',
		displayText: 'github.com/alexanderbond081/Pixi-slot-machine',
		url: 'https://github.com/alexanderbond081/Pixi-slot-machine',
	},
	{
		prefix: 'See me at:',
		displayText: 'linkedin.com/in/aliaksandr-bandarenka-815b4726a',
		url: 'https://www.linkedin.com/in/aliaksandr-bandarenka-815b4726a',
	},
];

export const INFO_WINDOW_OUTRO = [
	'It is not a commercial game and does not use real money,',
	'but it is playable and stores your balance between sessions.',
	'',
	"You can't directly raise your balance,",
	'but the Owl will help you avoid going bankrupt ;)',
	'',
	'Have fun!',
];
