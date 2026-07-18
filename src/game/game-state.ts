export type GamePhase = 'IDLE' | 'SPINNING' | 'SETTLING' | 'ERROR';

const ALLOWED_TRANSITIONS: Record<GamePhase, readonly GamePhase[]> = {
	IDLE: ['SPINNING', 'ERROR'],
	SPINNING: ['SETTLING', 'ERROR'],
	SETTLING: ['IDLE', 'ERROR'],
	ERROR: ['IDLE'],
};

/**
 * Explicit spin / interaction phase machine.
 * Replaces ad-hoc `inUse` flags so invalid transitions fail loudly.
 */
export class GameState {
	private phase: GamePhase = 'IDLE';

	public getPhase(): GamePhase {
		return this.phase;
	}

	public canAcceptSpinInput(): boolean {
		return this.phase === 'IDLE';
	}

	public transitionTo(next: GamePhase): void {
		const allowed = ALLOWED_TRANSITIONS[this.phase];

		if (!allowed.includes(next)) {
			throw new Error(`GameState: invalid transition ${this.phase} → ${next}`);
		}

		this.phase = next;
	}
}
