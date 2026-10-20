import type { ExperiencePreferences } from './experiencePreferences';
import type { MatchTransition } from './transitions';
import type { Motion } from './motion';

/** Opt-in, locally synthesized, bounded feedback. No media download or autoplay requirement. */
export class GameAudio {
    private context: AudioContext | null = null;
    private noise: AudioBuffer | null = null;
    private unsubscribe: () => void;
    private visibility = () => {
        if (document.hidden && this.context?.state === 'running')
            void this.context.suspend().catch(() => {});
    };
    constructor(
        private parent: HTMLElement,
        private preferences: ExperiencePreferences,
        private motion: Motion,
    ) {
        this.unsubscribe = preferences.subscribe(() => {
            if (!preferences.snapshot.sound && this.context?.state === 'running')
                void this.context.suspend().catch(() => {});
        });
        document.addEventListener('visibilitychange', this.visibility);
        parent.addEventListener('pointerdown', this.unlock);
        parent.addEventListener('keydown', this.unlock);
    }
    private unlock = (): void => {
        if (!this.preferences.snapshot.sound) return;
        try {
            const Audio =
                window.AudioContext ??
                (window as Window & { webkitAudioContext?: typeof AudioContext })
                    .webkitAudioContext;
            if (!Audio) return;
            this.context ??= new Audio();
            void this.context.resume().catch(() => {});
        } catch {
            /* All results are also communicated visually and semantically. */
        }
    };
    play(transition: MatchTransition, humanId: string): void {
        if (!this.motion.visible) return;
        const own = transition.before.players[transition.before.activePlayerIndex].id === humanId;
        const humanGain = transition.production.some((g) => g.playerId === humanId);
        const victory =
            transition.after.winnerId === humanId && transition.before.winnerId !== humanId;
        if (!own && !humanGain && !victory) return;
        const action = transition.action.kind;
        const seven =
            action === 'roll' &&
            transition.after.lastRoll![0] + transition.after.lastRoll![1] === 7;
        if (!victory && (seven || ['discard', 'end-turn'].includes(action))) return;
        if (
            this.preferences.snapshot.haptics &&
            typeof navigator.vibrate === 'function' &&
            own &&
            ['roll', 'setup-roll', 'build', 'buy-development'].includes(action)
        ) {
            try {
                navigator.vibrate(action === 'build' ? 14 : 8);
            } catch {
                /* Optional on unsupported hosts. */
            }
        }
        const ctx = this.context;
        if (!ctx || ctx.state !== 'running' || !this.preferences.snapshot.sound) return;
        const frequency = victory
            ? 660
            : action === 'build'
              ? 230
              : action === 'roll' || action === 'setup-roll'
                ? 320
                : action === 'buy-development'
                  ? 480
                  : 390;
        const oscillator = ctx.createOscillator(),
            envelope = ctx.createGain();
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(frequency * 0.55, ctx.currentTime + 0.1);
        envelope.gain.setValueAtTime(0.0001, ctx.currentTime);
        envelope.gain.exponentialRampToValueAtTime(0.045, ctx.currentTime + 0.006);
        envelope.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.13);
        oscillator.connect(envelope).connect(ctx.destination);
        oscillator.onended = () => {
            oscillator.disconnect();
            envelope.disconnect();
        };
        oscillator.start();
        oscillator.stop(ctx.currentTime + 0.14);
        if (!this.noise) {
            this.noise = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * 0.035), ctx.sampleRate);
            const data = this.noise.getChannelData(0);
            let seed = 4173;
            for (let i = 0; i < data.length; i++) {
                seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
                data[i] = (seed / 2 ** 32 - 0.5) * (1 - i / data.length);
            }
        }
        const contact = ctx.createBufferSource(),
            gain = ctx.createGain(),
            filter = ctx.createBiquadFilter();
        contact.buffer = this.noise;
        filter.type = 'lowpass';
        filter.frequency.value = action === 'build' ? 900 : 1700;
        gain.gain.value = 0.035;
        contact.onended = () => {
            contact.disconnect();
            filter.disconnect();
            gain.disconnect();
        };
        contact.connect(filter).connect(gain).connect(ctx.destination);
        contact.start();
    }
    destroy(): void {
        this.unsubscribe();
        document.removeEventListener('visibilitychange', this.visibility);
        this.parent.removeEventListener('pointerdown', this.unlock);
        this.parent.removeEventListener('keydown', this.unlock);
        if (this.context) void this.context.close().catch(() => {});
        this.context = null;
        this.noise = null;
    }
}
