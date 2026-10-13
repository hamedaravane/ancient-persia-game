/** Shared live preference; interruption removes decoration, never changes match state. */
export class Motion {
    private query = window.matchMedia('(prefers-reduced-motion: reduce)');
    private listeners = new Set<() => void>();
    get reduced(): boolean {
        return this.query.matches;
    }
    get visible(): boolean {
        return !document.hidden;
    }
    constructor() {
        this.query.addEventListener('change', this.changed);
        document.addEventListener('visibilitychange', this.changed);
    }
    subscribe(listener: () => void): () => void {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }
    private changed = (): void => {
        this.listeners.forEach((listener) => listener());
    };
    destroy(): void {
        this.changed();
        this.query.removeEventListener('change', this.changed);
        document.removeEventListener('visibilitychange', this.changed);
        this.listeners.clear();
    }
}

export const MOTION = {
    fast: 160,
    sheet: 220,
    dice: 360,
    board: 400,
    flight: 620,
    ease: 'cubic-bezier(0.2, 0.75, 0.3, 1)',
} as const;
