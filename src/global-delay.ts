declare global {
	function delay(ms: number): Promise<void>;
}

if (typeof (globalThis as any).delay !== 'function') {
	(globalThis as any).delay = (ms: number) => new Promise((res) => setTimeout(res, ms));
}

export { };