const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const BUILD_META_PATH = path.join(ROOT_DIR, 'build', 'build-info.json');
const DIST_BUILD_PATH = path.join(ROOT_DIR, 'dist', 'BUILD.txt');

if (!fs.existsSync(BUILD_META_PATH)) {
	console.error('Missing build/build-info.json. Run generate-build-info first.');
	process.exit(1);
}

const buildInfo = JSON.parse(fs.readFileSync(BUILD_META_PATH, 'utf8'));
const dirtySuffix = buildInfo.gitDirty ? ' (uncommitted changes)' : '';

const buildText = [
	'Pixi Slot Machine build',
	'=======================',
	`Version:  ${buildInfo.version}`,
	`Channel:  ${buildInfo.channel}`,
	`Mode:     ${buildInfo.mode}`,
	`Git:      ${buildInfo.gitSha}${dirtySuffix}`,
	`Build ID: ${buildInfo.buildId}`,
	`Built at: ${buildInfo.builtAt}`,
	'',
	'Upload the whole dist/ folder to itch.io.',
].join('\n');

fs.writeFileSync(DIST_BUILD_PATH, `${buildText}\n`);
console.log(`Wrote ${path.relative(ROOT_DIR, DIST_BUILD_PATH)}`);
