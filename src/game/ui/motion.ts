/** Shared live preference; interruption removes decoration, never changes match state. */
import { ExperiencePreferences } from './experiencePreferences';
export class Motion {
    private query = window.matchMedia('(prefers-reduced-motion: reduce)');
    private listeners = new Set<() => void>();
    get reduced(): boolean {
        return this.query.matches || this.preferences.snapshot.reduced;
    }
    duration(milliseconds: number): number {
        return this.reduced ? 0 : milliseconds * (this.preferences.snapshot.quick ? 0.55 : 1);
    }
    private unsubscribePreferences: () => void;
    get visible(): boolean {
        return !document.hidden;
    }
    constructor(private preferences = new ExperiencePreferences()) {
        this.unsubscribePreferences = preferences.subscribe(this.changed);
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
        this.unsubscribePreferences();
        this.changed();
        this.query.removeEventListener('change', this.changed);
        document.removeEventListener('visibilitychange', this.changed);
        this.listeners.clear();
    }
}

export const MOTION = {
    fast: 160,
    sheet: 180,
    dice: 360,
    board: 320,
    flight: 460,
    ease: 'cubic-bezier(0.2, 0.75, 0.3, 1)',
} as const;
