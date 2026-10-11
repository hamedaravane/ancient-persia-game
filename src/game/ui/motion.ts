/** Shared live preference; interruption removes decoration, never changes match state. */
export class Motion {
    private query = window.matchMedia('(prefers-reduced-motion: reduce)');
    private listeners = new Set<() => void>();
    get reduced(): boolean { return this.query.matches; }
    get visible(): boolean { return !document.hidden; }
    constructor() {
        this.query.addEventListener('change', this.changed);
        document.addEventListener('visibilitychange', this.changed);
    }
    subscribe(listener: () => void): () => void { this.listeners.add(listener); return () => this.listeners.delete(listener); }
    private changed = (): void => { this.listeners.forEach((listener) => listener()); };
    destroy(): void {
        this.changed();
        this.query.removeEventListener('change', this.changed);
        document.removeEventListener('visibilitychange', this.changed);
        this.listeners.clear();
    }
}

/** Each surface owns a group so canceling gameplay cannot cancel a new modal entrance. */
export class AnimationGroup {
    private animations = new Map<Animation, () => void>();
    private unsubscribe: () => void;
    constructor(private motion: Motion) { this.unsubscribe = motion.subscribe(() => this.clear()); }

    play(element: HTMLElement, frames: Keyframe[], options: KeyframeAnimationOptions, cleanup?: () => void, reducedFrames?: Keyframe[]): void {
        const chosen = this.motion.reduced ? reducedFrames : frames;
        if (!chosen || !this.motion.visible || typeof element.animate !== 'function') { cleanup?.(); return; }
        const animation = element.animate(chosen, { ...options, delay: this.motion.reduced ? 0 : options.delay });
        const finish = () => {
            if (!this.animations.delete(animation)) return;
            cleanup?.();
        };
        this.animations.set(animation, finish);
        void animation.finished.then(finish, finish);
    }
    clear(): void {
        for (const [animation, finish] of this.animations) { animation.cancel(); finish(); }
    }
    destroy(): void { this.clear(); this.unsubscribe(); }
}

export const MOTION = {
    fast: 160, sheet: 220, dice: 360, board: 400, flight: 620,
    ease: 'cubic-bezier(0.2, 0.75, 0.3, 1)',
} as const;
