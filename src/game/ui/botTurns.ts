import type { GameSession } from './session';

/** Turn pacing is independent of Phaser and animation completion. */
export class BotTurnRunner {
    private timer: ReturnType<typeof setTimeout> | null = null;
    private disposed = false;
    private unsubscribe: () => void;

    constructor(
        private session: GameSession,
        private available: () => boolean = () => true,
        private delay = 650,
    ) {
        this.unsubscribe = session.subscribe(this.refresh);
        this.refresh();
    }

    refresh = (): void => {
        if (this.timer !== null) clearTimeout(this.timer);
        this.timer = null;
        if (this.disposed || !this.available() || !this.session.botReady) return;
        const state = this.session.state!;
        this.timer = setTimeout(
            () => {
                this.timer = null;
                if (!this.disposed && this.available()) this.session.advanceBot(state);
                this.refresh();
            },
            this.delay * (this.session.preferences.snapshot.quick ? 0.55 : 1),
        );
    };

    destroy(): void {
        this.disposed = true;
        this.unsubscribe();
        if (this.timer !== null) clearTimeout(this.timer);
        this.timer = null;
    }
}
