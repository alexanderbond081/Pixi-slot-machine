const path = require('path'); // Required to resolve absolute system paths
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = (_env, argv) => ({
	entry: './src/index.ts', // Entry point (main source file)
	mode: argv.mode ?? 'development',
	devtool: argv.mode === 'production' ? false : 'inline-source-map',
	module: {
		rules: [
			{
				test: /\.ts$/,
				use: 'ts-loader',
				exclude: /node_modules/,
			},
			{
				test: /\.m?js$/,
				resolve: {
					fullySpecified: false,
				},
			},
		],
	},
	resolve: {
		alias: {
			// Spine ESM imports index.mjs; app code resolves index.js — two Pixi instances break Assets parsers.
			'pixi.js': path.resolve(__dirname, 'node_modules/pixi.js/lib/index.mjs'),
		},
		extensions: ['.ts', '.js'],
		fullySpecified: false,
	},
	output: {
		filename: 'bundle.js',
		path: path.resolve(__dirname, 'dist'),
		clean: true, // Cleans the dist folder before each build
	},
	plugins: [
		new HtmlWebpackPlugin({
			template: 'src/index.html',
			title: 'Slot Game',
			favicon: 'src/favicon.ico',
		}),
		new CopyPlugin({ // Copies static asset files to the build directory
			patterns: [
				{
					from: path.resolve(__dirname, 'src/assets'),
					to: path.resolve(__dirname, 'dist/assets'),
					noErrorOnMissing: true, // Prevents crashes if the assets folder is empty
				},
			],
		}),
	],
	devServer: {
		static: [
			{
				directory: path.resolve(__dirname, 'dist'), // Serves files from the virtual dist folder
			},
		],
		hot: true, // Enables Hot Module Replacement (HMR) on code changes
		host: '0.0.0.0',
		port: 3000,
		allowedHosts: 'all',
	},
});
